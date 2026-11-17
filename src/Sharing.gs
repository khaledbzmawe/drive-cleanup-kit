/**
 * Step 2 · Build sharing plan (read-only) and Step 3 · Apply ticked sharing changes.
 *
 * The plan removes everyone who is not on your keep list and changes public links
 * according to the Settings tab. Nothing changes until you run step 3, and only ticked rows run.
 * Parent folders come first, so most children are already clean when their turn comes.
 */

// Columns of the "Sharing plan" tab (0-based). The last three are hidden machine columns.
const PL = { apply: 0, name: 1, type: 2, path: 3, remove: 4, link: 5, status: 6, id: 7, action: 8, depth: 9 };
const PLAN_COLS = 10;

function buildSharingPlan() {
  const shared = readRows_(t_('tab_shared'));
  if (!shared.length) { notify_(t_('need_scan')); return; }

  const cfg = settings_();
  const me = Session.getEffectiveUser().getEmail().toLowerCase();
  const folders = loadFolders_();
  const plan = [];
  const perPerson = {};
  let linkChanges = 0;

  shared.forEach(function (r) {
    const id = String(r[SH.id]);
    const ancestors = ancestorIds_(id, String(r[SH.parent]), folders);
    const emails = splitEmails_([r[SH.editors], r[SH.commenters], r[SH.viewers]].join(','));
    const remove = emails.filter(function (e) { return e !== me && !isKept_(e, ancestors); });

    const anyoneRole = String(r[SH.anyone]);
    let action = '';
    if (anyoneRole && cfg.policy === 'remove') action = 'remove';
    else if (anyoneRole === 'writer' && cfg.policy === 'view') action = 'view';

    if (!remove.length && !action) return;
    remove.forEach(function (e) { perPerson[e] = (perPerson[e] || 0) + 1; });
    if (action) linkChanges++;
    const path = String(r[SH.path]);
    const depth = path === t_('root') ? 0 : path.split(' / ').length;
    plan.push([true, safe_(r[SH.name]), r[SH.type], safe_(path), remove.join(', '),
      action ? t_('link_act_' + action) : '', '', id, action, depth]);
  });

  plan.sort(function (a, b) { return a[PL.depth] - b[PL.depth]; });

  const sh = freshTab_(t_('tab_plan'), t_('h_plan'));
  appendRows_(sh, plan);
  if (plan.length) sh.getRange(2, 1, plan.length, 1).insertCheckboxes();
  sh.hideColumns(PL.id + 1, 3);

  const people = freshTab_(t_('tab_plan_people'), t_('h_plan_people'));
  appendRows_(people, Object.keys(perPerson)
    .sort(function (a, b) { return perPerson[b] - perPerson[a]; })
    .map(function (e) { return [e, perPerson[e]]; }));

  book_().setActiveSheet(sh);
  const warnings = [];
  if (!cfg.keep.length) warnings.push(t_('keep_empty_warn'));
  cfg.badFolders.forEach(function (e) { warnings.push(t_('bad_folder_warn', e)); });
  notify_((plan.length ? t_('plan_done', plan.length, Object.keys(perPerson).length, linkChanges)
    : t_('plan_empty')) + (warnings.length ? ' ' + warnings.join(' ') : ''));
}

function applySharingPlan() {
  const rows = readRows_(t_('tab_plan'));
  if (!rows.length) { notify_(t_('need_plan')); return; }
  const todo = rows.filter(function (r) { return r[PL.apply] === true && !r[PL.status]; }).length;
  if (!todo) { notify_(t_('nothing_ticked')); return; }
  if (!confirm_(t_('confirm_apply', todo))) return;
  cancelContinue_('continueApply');
  runApply_();
}

/** Called by the time-driven trigger. */
function continueApply() {
  runApply_();
}

function runApply_() {
  const deadline = Date.now() + RUN_LIMIT_MS;
  const sh = book_().getSheetByName(t_('tab_plan'));
  const n = sh.getLastRow() - 1;
  const data = sh.getRange(2, 1, n, PLAN_COLS).getValues();
  const status = data.map(function (r) { return [r[PL.status]]; });
  const save = function () { sh.getRange(2, PL.status + 1, n, 1).setValues(status); };

  let done = 0, left = 0;
  for (let i = 0; i < n; i++) {
    const r = data[i];
    if (r[PL.apply] !== true || r[PL.status]) continue;
    if (Date.now() > deadline) { left++; continue; }
    status[i][0] = applyOne_(String(r[PL.id]), splitEmails_(r[PL.remove]), String(r[PL.action]));
    if (++done % 50 === 0) save();
  }
  save();

  if (left) {
    scheduleContinue_('continueApply');
    notify_(t_('apply_progress', done, left));
  } else {
    cancelContinue_('continueApply');
    notify_(t_('apply_done'));
  }
}

/** Removes the listed people and changes the public link on one item. Returns a status line. */
function applyOne_(id, remove, action) {
  let perms;
  try {
    perms = Drive.Permissions.list(id, { fields: 'permissions(id,type,role,emailAddress)', pageSize: 100 }).permissions || [];
  } catch (e) {
    return t_('st_read_error', shortErr_(e));
  }

  const done = [], failed = [];
  const fail = function (what, e) {
    const msg = shortErr_(e);
    failed.push(what + ': ' + msg + (/inherit/i.test(msg) ? t_('hint_inherited') : ''));
  };

  perms.forEach(function (p) {
    const email = (p.emailAddress || '').toLowerCase();
    if ((p.type === 'user' || p.type === 'group') && p.role !== 'owner' && remove.indexOf(email) >= 0) {
      try { Drive.Permissions.remove(id, p.id); done.push(t_('st_removed', email)); }
      catch (e) { fail(email, e); }
    }
    if (p.type === 'anyone' && action === 'remove') {
      try { Drive.Permissions.remove(id, p.id); done.push(t_('st_link_removed')); }
      catch (e) { fail('link', e); }
    }
    if (p.type === 'anyone' && action === 'view' && p.role === 'writer') {
      try { Drive.Permissions.update({ role: 'reader' }, id, p.id); done.push(t_('st_link_view')); }
      catch (e) { fail('link', e); }
    }
  });

  let s = done.length ? done.join('; ') : t_('st_nothing');
  if (failed.length) s += ' | ' + t_('st_failed', failed.join('; '));
  return s;
}
