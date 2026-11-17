/**
 * Step 1 · Scan sharing (read-only).
 * Reads the whole Drive in pages and writes: Summary, Shared items, People, Not owned by me.
 * Big drives take more than one run; the scan schedules its own next run and picks up where it stopped.
 */

const SCAN_KEY = 'SCAN_STATE';

// Columns of the "Shared items" tab (0-based). The last three are hidden machine columns.
const SH = { name: 0, type: 1, path: 2, link: 3, editors: 4, commenters: 5, viewers: 6, open: 7, id: 8, parent: 9, anyone: 10 };

function scanSharing() {
  cancelContinue_('continueScan');
  props_().deleteProperty(SCAN_KEY);
  runScan_();
}

/** Called by the time-driven trigger. */
function continueScan() {
  runScan_();
}

function runScan_() {
  const deadline = Date.now() + RUN_LIMIT_MS;
  let st = JSON.parse(props_().getProperty(SCAN_KEY) || 'null');

  if (!st) {
    ensureSettings_();
    st = {
      phase: 'folders', token: null, owned: 0,
      me: Session.getEffectiveUser().getEmail().toLowerCase(),
      rootId: Drive.Files.get('root', { fields: 'id' }).id,
      stamp: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm')
    };
    freshTab_(t_('tab_summary'), t_('h_summary'));
    freshTab_(t_('tab_shared'), t_('h_shared')).hideColumns(SH.id + 1, 3);
    freshTab_(t_('tab_people'), t_('h_people'));
    freshTab_(t_('tab_notmine'), t_('h_notmine'));
    freshTab_(FOLDERS_TAB, ['id', 'name', 'parent']).hideSheet();
    props_().setProperty(SCAN_KEY, JSON.stringify(st));
  }

  const ss = book_();
  let folders = null;

  while (st.phase !== 'done' && Date.now() < deadline) {
    if (st.phase === 'folders') {
      const res = drivePage_("mimeType = '" + FOLDER_MIME + "' and trashed = false",
        'nextPageToken,files(id,name,parents)', st.token);
      appendRows_(ss.getSheetByName(FOLDERS_TAB), (res.files || []).map(function (f) {
        return [f.id, safe_(f.name), (f.parents || [])[0] || ''];
      }));
      st.token = res.nextPageToken || null;
      if (!st.token) st.phase = 'owned';

    } else if (st.phase === 'owned') {
      folders = folders || loadFolders_();
      const res = drivePage_("'me' in owners and trashed = false",
        'nextPageToken,files(id,name,mimeType,parents,permissions(type,role,emailAddress,domain,allowFileDiscovery))',
        st.token);
      const rows = [];
      (res.files || []).forEach(function (it) {
        st.owned++;
        const row = sharedRow_(it, st, folders);
        if (row) rows.push(row);
      });
      appendRows_(ss.getSheetByName(t_('tab_shared')), rows);
      st.token = res.nextPageToken || null;
      if (!st.token) st.phase = 'notmine';

    } else if (st.phase === 'notmine') {
      folders = folders || loadFolders_();
      const res = drivePage_("not 'me' in owners and trashed = false",
        'nextPageToken,files(id,name,mimeType,parents,owners(emailAddress))', st.token);
      const rows = [];
      (res.files || []).forEach(function (it) {
        const loc = pathOf_((it.parents || [])[0], folders, st.rootId);
        if (!loc.inMyDrive) return; // "shared with me" items that were never added to My Drive
        const owner = ((it.owners || [])[0] || {}).emailAddress || '';
        rows.push([safe_(it.name), typeName_(it.mimeType), owner, safe_(loc.path), fileLink_(it.id)]);
      });
      appendRows_(ss.getSheetByName(t_('tab_notmine')), rows);
      st.token = res.nextPageToken || null;
      if (!st.token) st.phase = 'summary';

    } else if (st.phase === 'summary') {
      finishScan_(st);
      st.phase = 'done';
    }
    props_().setProperty(SCAN_KEY, JSON.stringify(st));
  }

  if (st.phase === 'done') {
    props_().deleteProperty(SCAN_KEY);
    cancelContinue_('continueScan');
    const shared = readRows_(t_('tab_shared'));
    const links = shared.filter(function (r) { return r[SH.anyone]; }).length;
    notify_(t_('scan_done', shared.length, links));
  } else {
    scheduleContinue_('continueScan');
    notify_(t_('scan_progress', t_('phase_' + st.phase), st.owned));
  }
}

/** One row for an item you own that someone else can open, or null if it is private. */
function sharedRow_(it, st, folders) {
  const perms = it.permissions || [];
  const anyone = perms.filter(function (p) { return p.type === 'anyone'; })[0];
  const domain = perms.filter(function (p) { return p.type === 'domain'; })[0];
  const people = perms.filter(function (p) {
    return (p.type === 'user' || p.type === 'group') && (p.emailAddress || '').toLowerCase() !== st.me;
  });
  if (!anyone && !domain && !people.length) return null;

  const byRole = { writer: [], commenter: [], reader: [] };
  people.forEach(function (p) {
    const role = ['writer', 'fileOrganizer', 'organizer'].indexOf(p.role) >= 0 ? 'writer'
      : p.role === 'commenter' ? 'commenter' : 'reader';
    byRole[role].push((p.emailAddress || '').toLowerCase());
  });

  let link = t_('link_none');
  if (anyone) link = t_('link_anyone', roleName_(anyone.role)) + (anyone.allowFileDiscovery ? t_('link_public') : '');
  else if (domain) link = t_('link_domain', domain.domain, roleName_(domain.role));

  const parent = (it.parents || [])[0] || '';
  return [
    safe_(it.name), typeName_(it.mimeType), safe_(pathOf_(parent, folders, st.rootId).path), link,
    byRole.writer.join(', '), byRole.commenter.join(', '), byRole.reader.join(', '), fileLink_(it.id),
    it.id, parent, anyone ? anyone.role : ''
  ];
}

function roleName_(role) {
  return t_({ writer: 'role_writer', commenter: 'role_commenter', reader: 'role_reader' }[role] || 'role_reader');
}

function finishScan_(st) {
  const ss = book_();
  const shared = readRows_(t_('tab_shared'));

  // People: everyone who can open at least one of your items
  const people = {};
  shared.forEach(function (r) {
    [[SH.editors, 'writer'], [SH.commenters, 'commenter'], [SH.viewers, 'reader']].forEach(function (c) {
      splitEmails_(r[c[0]]).forEach(function (email) {
        const p = people[email] || (people[email] = { count: 0, writer: 0, commenter: 0, reader: 0, samples: [] });
        p.count++;
        p[c[1]]++;
        if (p.samples.length < 3) p.samples.push(r[SH.name]);
      });
    });
  });
  const peopleRows = Object.keys(people).map(function (e) {
    const p = people[e];
    return [e, t_('keep_' + keepStatus_(e)), p.count, p.writer, p.commenter, p.reader, safe_(p.samples.join(' | '))];
  }).sort(function (a, b) { return b[2] - a[2]; });
  appendRows_(ss.getSheetByName(t_('tab_people')), peopleRows);

  // Items you do not own, grouped by owner
  const notMine = readRows_(t_('tab_notmine'));
  const byOwner = {};
  notMine.forEach(function (r) { byOwner[r[2]] = (byOwner[r[2]] || 0) + 1; });

  const links = shared.filter(function (r) { return r[SH.anyone]; });
  const summary = [
    [t_('s_owned'), st.owned],
    [t_('s_shared'), shared.length],
    [t_('s_links'), links.length],
    [t_('s_links_edit'), links.filter(function (r) { return r[SH.anyone] === 'writer'; }).length],
    [t_('s_people'), peopleRows.length],
    [t_('s_outside'), peopleRows.filter(function (r) { return r[1] === t_('keep_no'); }).length],
    [t_('s_notmine'), notMine.length],
    ['', ''],
    [t_('s_by_owner'), '']
  ];
  Object.keys(byOwner).sort(function (a, b) { return byOwner[b] - byOwner[a]; })
    .forEach(function (o) { summary.push([o, byOwner[o]]); });
  summary.push(['', ''], [t_('s_date'), st.stamp], [t_('s_note'), t_('s_note_v')]);

  const sh = ss.getSheetByName(t_('tab_summary'));
  appendRows_(sh, summary);
  sh.setColumnWidth(1, 360);
  ss.setActiveSheet(sh);
}
