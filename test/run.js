/**
 * Runs the whole flow (scan → plan → apply → find → trash) against a fake Drive, in English and Arabic,
 * with a clock that forces every long step to stop and continue in a new run.
 *
 *   node test/run.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { makeGlobals } = require('./fake-gas');

const ME = 'owner@example.com';
const FOLDER = 'application/vnd.google-apps.folder';
const DOC = 'application/vnd.google-apps.document';
const owner = { type: 'user', role: 'owner', emailAddress: ME };
const ally = (inh) => ({ type: 'user', role: 'writer', emailAddress: 'ally@example.com', inherited: inh });
const ex = (inh) => ({ type: 'user', role: 'reader', emailAddress: 'ex.staff@old.example', inherited: inh });
const client = (inh) => ({ type: 'user', role: 'reader', emailAddress: 'client@client.example', inherited: inh });

function fixture() {
  return [
    { id: 'FOLDER_CLIENTS', name: 'Clients', mimeType: FOLDER, parents: ['ROOT'], owner: ME, perms: [owner, ally(), ex()] },
    { id: 'FOLDER_CLIENT_A', name: 'Client A', mimeType: FOLDER, parents: ['FOLDER_CLIENTS'], owner: ME,
      perms: [owner, ally('FOLDER_CLIENTS'), ex('FOLDER_CLIENTS'), client()] },
    { id: 'DOC_PROPOSAL', name: 'Proposal', mimeType: DOC, parents: ['FOLDER_CLIENT_A'], owner: ME,
      perms: [owner, ally('FOLDER_CLIENTS'), ex('FOLDER_CLIENTS'), client('FOLDER_CLIENT_A'), { type: 'anyone', role: 'writer' }] },
    { id: 'FOLDER_DATE', name: '2022/10/1', mimeType: FOLDER, parents: ['ROOT'], owner: ME, perms: [owner] },
    { id: 'FILE_VIDEO_1', name: 'video.mp4', mimeType: 'video/mp4', parents: ['FOLDER_DATE'], owner: ME, size: 5, md5: 'aaa',
      created: '2024-01-01T00:00:00Z', perms: [owner, client()] },
    { id: 'FOLDER_MISC', name: 'Misc', mimeType: FOLDER, parents: ['ROOT'], owner: ME, perms: [owner] },
    { id: 'FILE_VIDEO_2', name: '=video copy.mp4', mimeType: 'video/mp4', parents: ['FOLDER_MISC'], owner: ME, size: 5, md5: 'aaa',
      created: '2024-03-01T00:00:00Z', perms: [owner] },
    { id: 'FOLDER_EMPTY', name: 'Old', mimeType: FOLDER, parents: ['ROOT'], owner: ME, perms: [owner] },
    { id: 'DOC_UNTITLED', name: 'Untitled document', mimeType: DOC, parents: ['ROOT'], owner: ME, perms: [owner], content: { text: '  ' } },
    { id: 'DOC_NOTES', name: 'Notes', mimeType: DOC, parents: ['ROOT'], owner: ME, perms: [owner],
      created: '2024-02-01T00:00:00Z', modified: '2024-02-01T00:01:00Z', content: { text: 'hello' } },
    { id: 'FILE_BLANK', name: 'blank.txt', mimeType: 'text/plain', parents: ['ROOT'], owner: ME, size: 0, perms: [owner] },
    { id: 'FILE_RAW', name: 'raw.mov', mimeType: 'video/quicktime', parents: ['FOLDER_MISC'], owner: ME, size: 300 * 1048576, md5: 'bbb', perms: [owner] },
    { id: 'FILE_THEIRS', name: 'their file', mimeType: 'application/pdf', parents: ['FOLDER_CLIENTS'], owner: 'other@example.com', size: 9, md5: 'ccc' },
    { id: 'FILE_SHARED_WITH_ME', name: 'not in my drive', mimeType: 'application/pdf', parents: ['SOMEONE_ELSES_FOLDER'], owner: 'other@example.com' }
  ];
}

function load(lang) {
  const env = makeGlobals(ME, fixture(), { pageSize: 2 });
  // A clock that moves 40 seconds on every Date.now(), so long steps hit the 4.5-minute limit and continue.
  let now = 0;
  class FakeDate extends Date {
    static now() { now += 40 * 1000; return now; }
  }
  const ctx = vm.createContext(Object.assign({ Date: FakeDate, JSON, Math, Object, Array, String, Number, RegExp, Error }, env.g));
  const src = path.join(__dirname, '..', 'src');
  fs.readdirSync(src).filter((f) => f.endsWith('.gs')).sort()
    .forEach((f) => vm.runInContext(fs.readFileSync(path.join(src, f), 'utf8'), ctx, { filename: f }));
  const run = (code) => vm.runInContext(code, ctx);

  // Settings: language, keep Ally everywhere, keep the client only inside "Client A"
  run('ensureSettings_();');
  const settings = env.ss.getSheetByName('Settings · الإعدادات');
  settings.getRange('B2').setValue(lang);
  settings.getRange(8, 1, 2, 2).setValues([
    ['Ally@Example.com', ''],
    ['client@client.example', 'https://drive.google.com/drive/folders/FOLDER_CLIENT_A?usp=sharing']
  ]);
  run('SETTINGS_CACHE = null;');
  return { env, run };
}

/** Runs a step, then fires the scheduled continuation until no trigger is left. */
function runToEnd(t, first, cont) {
  t.run(first + '()');
  let guard = 0;
  while (t.env.triggers.some((x) => x.getHandlerFunction() === cont)) {
    assert(++guard < 50, cont + ' never finished');
    t.run('SETTINGS_CACHE = null; ' + cont + '()');
  }
  return guard;
}

function tab(t, key) {
  const name = t.run(`t_('${key}')`);
  const sh = t.env.ss.getSheetByName(name);
  assert(sh, 'missing tab ' + name);
  return sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), sh.getLastColumn() || 1).getValues().filter((r) => r.some((v) => v !== ''));
}

for (const lang of ['en', 'ar']) {
  const t = load(lang);
  const { env } = t;

  // 1 · scan
  const scanRuns = runToEnd(t, 'scanSharing', 'continueScan');
  assert(scanRuns > 0, 'the scan should have needed more than one run');
  const shared = tab(t, 'tab_shared');
  assert.deepStrictEqual(shared.map((r) => r[8]).sort(),
    ['DOC_PROPOSAL', 'FILE_VIDEO_1', 'FOLDER_CLIENTS', 'FOLDER_CLIENT_A'], 'shared items');
  const notMine = tab(t, 'tab_notmine');
  assert.strictEqual(notMine.length, 1, 'only the foreign file inside My Drive');
  assert.strictEqual(notMine[0][3], 'Clients');
  const people = tab(t, 'tab_people');
  assert.strictEqual(people.length, 3);
  assert(env.ss.getSheetByName(t.run("t_('tab_summary')")).getLastRow() > 5, 'summary written');
  assert(!env.props.SCAN_STATE, 'scan state cleared');

  // 2 · plan
  t.run('SETTINGS_CACHE = null; buildSharingPlan()');
  const plan = tab(t, 'tab_plan');
  const byId = Object.fromEntries(plan.map((r) => [r[7], r]));
  assert.deepStrictEqual(Object.keys(byId).sort(), ['DOC_PROPOSAL', 'FILE_VIDEO_1', 'FOLDER_CLIENTS', 'FOLDER_CLIENT_A']);
  assert.strictEqual(plan[0][7], 'FOLDER_CLIENTS', 'top folders first');
  assert.strictEqual(byId.FOLDER_CLIENTS[4], 'ex.staff@old.example', 'ally is kept everywhere');
  assert.strictEqual(byId.DOC_PROPOSAL[4], 'ex.staff@old.example', 'client is kept inside Client A');
  assert.strictEqual(byId.DOC_PROPOSAL[8], 'view', 'public edit link becomes view-only');
  assert.strictEqual(byId.FILE_VIDEO_1[4], 'client@client.example', 'client is removed outside Client A');
  assert.strictEqual(byId.FILE_VIDEO_1[3], '2022/10/1', 'a folder named like a date keeps its name');
  assert(plan.every((r) => r[0] === true), 'every row ticked by default');

  // untick one row: it must stay untouched
  const planSheet = env.ss.getSheetByName(t.run("t_('tab_plan')"));
  const videoRow = plan.findIndex((r) => r[7] === 'FILE_VIDEO_1') + 2;
  planSheet.getRange(videoRow, 1).setValue(false);

  // 3 · apply
  runToEnd(t, 'applySharingPlan', 'continueApply');
  const doc = env.byId.DOC_PROPOSAL;
  assert(!doc.perms.some((p) => p.emailAddress === 'ex.staff@old.example'), 'ex-staff gone from the doc');
  assert(doc.perms.some((p) => p.emailAddress === 'client@client.example'), 'client kept on the doc');
  assert.strictEqual(doc.perms.find((p) => p.type === 'anyone').role, 'reader', 'link is view-only');
  assert(env.byId.FILE_VIDEO_1.perms.some((p) => p.emailAddress === 'client@client.example'), 'unticked row untouched');
  const after = tab(t, 'tab_plan');
  assert(after.filter((r) => r[0] === true).every((r) => r[6] && !/Failed|لم يتم/.test(r[6])), 'every ticked row has a clean status');
  assert(!after.find((r) => r[7] === 'FILE_VIDEO_1')[6], 'unticked row has no status');

  // 4 · find
  t.run('SETTINGS_CACHE = null; findCleanupCandidates()');
  const cand = tab(t, 'tab_cand');
  const code = Object.fromEntries(cand.map((r) => [r[8], r[10]]));
  assert.deepStrictEqual(code, {
    FILE_VIDEO_1: 'dup_keep', FILE_VIDEO_2: 'dup_extra', FOLDER_EMPTY: 'empty_folder',
    DOC_UNTITLED: 'empty_file', FILE_BLANK: 'empty_file', FILE_RAW: 'large'
  });
  assert(!('FILE_THEIRS' in code), 'files you do not own are never listed');
  assert.strictEqual(cand.find((r) => r[8] === 'FILE_VIDEO_2')[2], '=video copy.mp4', 'formula-looking names stay text');
  assert.strictEqual(cand.find((r) => r[8] === 'FILE_VIDEO_1')[4], '2022/10/1', 'date-looking folder names stay text');

  // tick every row, including the original duplicate: the last copy must survive
  const candSheet = env.ss.getSheetByName(t.run("t_('tab_cand')"));
  candSheet.getRange(2, 1, cand.length, 1).setValues(cand.map(() => [true]));
  // someone drops a file into the empty folder after the review
  env.byId.FILE_LATE = { id: 'FILE_LATE', name: 'late', mimeType: 'text/plain', parents: ['FOLDER_EMPTY'], owner: ME, size: 1 };
  fixtureLate(env);

  // 5 · trash
  runToEnd(t, 'trashTickedItems', 'continueTrash');
  const trashed = (id) => !!env.byId[id].trashed;
  assert(trashed('FILE_VIDEO_1') !== trashed('FILE_VIDEO_2'), 'exactly one copy of the duplicate survives');
  assert(!trashed('FOLDER_EMPTY'), 'a folder that is no longer empty is skipped');
  assert(trashed('DOC_UNTITLED') && trashed('FILE_BLANK') && trashed('FILE_RAW'), 'ticked items trashed');
  assert(!trashed('DOC_NOTES') && !trashed('FILE_THEIRS'), 'untouched');

  // stop and reset leaves nothing scheduled
  t.run('stopAndReset()');
  assert.strictEqual(env.triggers.length, 0);

  console.log(`${lang}: all checks passed (scan took ${scanRuns + 1} runs)`);
}

/** The fake Drive keeps its own list; add the late file to it so "in parents" queries see it. */
function fixtureLate(env) {
  const list = env.g.Drive.Files.list;
  env.g.Drive.Files.list = function (args) {
    const m = String(args.q).match(/^'([^']+)' in parents/);
    if (m && m[1] === 'FOLDER_EMPTY') return { files: [{ id: 'FILE_LATE' }] };
    return list(args);
  };
}
