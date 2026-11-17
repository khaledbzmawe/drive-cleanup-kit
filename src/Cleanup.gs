/**
 * Step 4 · Find clean-up candidates (read-only) and Step 5 · Move ticked items to trash.
 *
 * Candidates: exact duplicates (same MD5 and size, the oldest copy is kept), empty folders,
 * empty files (0-byte uploads, and untitled or untouched Google Docs/Sheets/Slides with no content)
 * and large files. Only files you own are listed. Trash is restorable from Drive for 30 days.
 */

// Columns of the "Clean-up candidates" tab (0-based). The last four are hidden machine columns.
const CD = { trash: 0, kind: 1, name: 2, size: 3, path: 4, modified: 5, open: 6, status: 7, id: 8, group: 9, code: 10, state: 11 };
const CAND_COLS = 12;
const MAX_CONTENT_CHECKS = 300;

function findCleanupCandidates() {
  const t0 = Date.now();
  const cfg = settings_();
  const selfId = book_().getId();

  // Everything visible, so a folder that holds someone else's file is not called empty.
  const all = [];
  let token = null;
  do {
    const r = drivePage_('trashed = false',
      'nextPageToken,files(id,name,mimeType,size,md5Checksum,parents,modifiedTime,createdTime,ownedByMe)', token);
    (r.files || []).forEach(function (f) { all.push(f); });
    token = r.nextPageToken;
  } while (token);

  const byId = {};
  const hasChild = {};
  all.forEach(function (f) {
    byId[f.id] = f;
    (f.parents || []).forEach(function (p) { hasChild[p] = true; });
  });
  const mine = all.filter(function (f) { return f.ownedByMe && f.id !== selfId; });
  const pathOf = function (f) {
    const parts = [];
    let p = (f.parents || [])[0];
    for (let g = 0; p && g < 8; g++) {
      const x = byId[p];
      if (!x) break;
      parts.unshift(x.name);
      p = (x.parents || [])[0];
    }
    return parts.join(' / ');
  };
  const row = function (f, code, tick, group) {
    return [tick, t_('k_' + code), safe_(f.name), mb_(f.size), safe_(pathOf(f)),
      String(f.modifiedTime).slice(0, 10), fileLink_(f.id), '', f.id, group || '', code, ''];
  };
  const rows = [];

  // 1) Exact duplicates
  const groups = {};
  mine.forEach(function (f) {
    if (!f.md5Checksum || !(Number(f.size) > 0)) return;
    const k = f.md5Checksum + '|' + f.size;
    (groups[k] = groups[k] || []).push(f);
  });
  let dupCount = 0, dupBytes = 0, groupNo = 0;
  Object.keys(groups).forEach(function (k) {
    const g = groups[k];
    if (g.length < 2) return;
    groupNo++;
    g.sort(function (a, b) { return a.createdTime < b.createdTime ? -1 : 1; });
    g.forEach(function (f, i) {
      if (i > 0) { dupCount++; dupBytes += Number(f.size); }
      rows.push(row(f, i === 0 ? 'dup_keep' : 'dup_extra', i > 0, '#' + groupNo));
    });
  });

  // 2) Empty folders
  let emptyFolders = 0;
  mine.forEach(function (f) {
    if (f.mimeType !== FOLDER_MIME || hasChild[f.id]) return;
    emptyFolders++;
    rows.push(row(f, 'empty_folder', true));
  });

  // 3) Empty files
  let emptyFiles = 0, checked = 0, skipped = 0;
  mine.forEach(function (f) {
    if (f.mimeType === FOLDER_MIME) return;
    const native = String(f.mimeType).indexOf('application/vnd.google-apps.') === 0;
    if (!native) {
      if (f.size !== undefined && Number(f.size) === 0) { emptyFiles++; rows.push(row(f, 'empty_file', true)); }
      return;
    }
    if ([DOC_MIME, SHEET_MIME, SLIDES_MIME].indexOf(f.mimeType) < 0) return;
    const untitled = /^(Untitled|Copy of Untitled|مستند بلا عنوان|جدول بيانات بلا عنوان|عرض تقديمي بلا عنوان)/i.test(f.name);
    const untouched = new Date(f.modifiedTime) - new Date(f.createdTime) < 3 * 60 * 1000;
    if (!untitled && !untouched) return;
    if (checked >= MAX_CONTENT_CHECKS || Date.now() - t0 > RUN_LIMIT_MS - 30 * 1000) { skipped++; return; }
    checked++;
    if (isEmptyGoogleFile_(f)) { emptyFiles++; rows.push(row(f, 'empty_file', true)); }
  });

  // 4) Large files (never ticked for you)
  const big = mine.filter(function (f) { return Number(f.size) > cfg.largeMb * 1048576; })
    .sort(function (a, b) { return Number(b.size) - Number(a.size); })
    .slice(0, 100);
  big.forEach(function (f) { rows.push(row(f, 'large', false)); });

  const sh = freshTab_(t_('tab_cand'), t_('h_cand'));
  appendRows_(sh, rows);
  if (rows.length) sh.getRange(2, 1, rows.length, 1).insertCheckboxes();
  sh.hideColumns(CD.id + 1, 4);
  book_().setActiveSheet(sh);

  const quota = Drive.About.get({ fields: 'storageQuota' }).storageQuota;
  notify_(t_('cand_done', dupCount, mb_(dupBytes), emptyFolders, emptyFiles, big.length, mb_(quota.usageInDriveTrash)) +
    (skipped ? ' ' + t_('cand_partial', skipped) : ''));
}

/** Opens a Google Doc, Sheet or Slides file and checks that it has no content at all. */
function isEmptyGoogleFile_(f) {
  try {
    if (f.mimeType === DOC_MIME) {
      const body = DocumentApp.openById(f.id).getBody();
      return body.getText().trim() === '' && body.getImages().length === 0;
    }
    if (f.mimeType === SHEET_MIME) {
      return SpreadsheetApp.openById(f.id).getSheets().every(function (s) {
        return s.getLastRow() === 0 && s.getCharts().length === 0 && s.getImages().length === 0;
      });
    }
    return SlidesApp.openById(f.id).getSlides().every(function (s) {
      return s.getPageElements().every(function (el) {
        return el.getPageElementType() === SlidesApp.PageElementType.SHAPE &&
          el.asShape().getText().asString().trim() === '';
      });
    });
  } catch (e) {
    return false; // could not open it: never call it empty
  }
}

function trashTickedItems() {
  const rows = readRows_(t_('tab_cand'));
  if (!rows.length) { notify_(t_('need_find')); return; }
  const todo = rows.filter(function (r) { return r[CD.trash] === true && (!r[CD.state] || r[CD.state] === 'error'); }).length;
  if (!todo) { notify_(t_('nothing_ticked')); return; }
  if (!confirm_(t_('confirm_trash', todo))) return;
  cancelContinue_('continueTrash');
  runTrash_();
}

/** Called by the time-driven trigger. */
function continueTrash() {
  runTrash_();
}

function runTrash_() {
  const deadline = Date.now() + RUN_LIMIT_MS;
  const sh = book_().getSheetByName(t_('tab_cand'));
  const n = sh.getLastRow() - 1;
  const data = sh.getRange(2, 1, n, CAND_COLS).getValues();
  const out = data.map(function (r) { return [r[CD.status], r[CD.state]]; });
  const save = function () {
    sh.getRange(2, CD.status + 1, n, 1).setValues(out.map(function (o) { return [o[0]]; }));
    sh.getRange(2, CD.state + 1, n, 1).setValues(out.map(function (o) { return [o[1]]; }));
  };

  // Never trash every copy of a duplicate: if all copies are ticked, keep the oldest.
  const keepRow = {};
  const groups = {};
  data.forEach(function (r, i) { if (r[CD.group]) (groups[r[CD.group]] = groups[r[CD.group]] || []).push(i); });
  Object.keys(groups).forEach(function (g) {
    const idx = groups[g];
    const survivor = idx.some(function (i) { return data[i][CD.trash] !== true && out[i][1] !== 'trashed'; });
    if (!survivor) {
      const first = idx.filter(function (i) { return out[i][1] !== 'trashed'; })[0];
      if (first !== undefined) keepRow[first] = true;
    }
  });

  let done = 0, moved = 0, left = 0;
  for (let i = 0; i < n; i++) {
    const r = data[i];
    if (r[CD.trash] !== true || (out[i][1] && out[i][1] !== 'error')) continue;
    if (keepRow[i]) { out[i] = [t_('st_last_copy'), 'kept']; continue; }
    if (Date.now() > deadline) { left++; continue; }
    out[i] = trashOne_(String(r[CD.id]));
    if (out[i][1] === 'trashed') moved++;
    if (++done % 50 === 0) save();
  }
  save();

  if (left) {
    scheduleContinue_('continueTrash');
    notify_(t_('trash_progress', moved, left));
  } else {
    cancelContinue_('continueTrash');
    notify_(t_('trash_done', moved));
  }
}

/** Re-checks the item right before trashing it. Returns [status text, state code]. */
function trashOne_(id) {
  let f;
  try {
    f = Drive.Files.get(id, { fields: 'id,mimeType,trashed,ownedByMe' });
  } catch (e) {
    return [t_('st_not_found'), 'skipped'];
  }
  if (f.trashed) return [t_('st_already'), 'trashed'];
  if (!f.ownedByMe) return [t_('st_not_owner'), 'skipped'];
  if (f.mimeType === FOLDER_MIME) {
    const kids = drivePage_("'" + id + "' in parents and trashed = false", 'files(id)').files || [];
    if (kids.length) return [t_('st_not_empty'), 'skipped'];
  }
  try {
    Drive.Files.update({ trashed: true }, id);
    return [t_('st_trashed'), 'trashed'];
  } catch (e) {
    return [t_('st_failed', shortErr_(e)), 'error'];
  }
}
