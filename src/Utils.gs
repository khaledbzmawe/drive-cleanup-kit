/**
 * Shared helpers: the spreadsheet, tabs, Drive paging, background continuation, messages.
 */

const APP_NAME = 'Drive Cleanup Kit';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const DOC_MIME = 'application/vnd.google-apps.document';
const SHEET_MIME = 'application/vnd.google-apps.spreadsheet';
const SLIDES_MIME = 'application/vnd.google-apps.presentation';

// Apps Script stops any run at 6 minutes. We stop at 4.5 and continue in a new run.
const RUN_LIMIT_MS = 4.5 * 60 * 1000;

function props_() {
  return PropertiesService.getScriptProperties();
}

/** The spreadsheet this script is bound to (also works from a time-driven trigger). */
function book_() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  return SpreadsheetApp.openById(props_().getProperty('BOOK_ID'));
}

/** Deletes the tab if it exists and creates it again with a bold, frozen header. */
function freshTab_(name, header) {
  const ss = book_();
  const old = ss.getSheetByName(name);
  if (old) ss.deleteSheet(old);
  const sh = ss.insertSheet(name);
  if (lang_() === 'ar') sh.setRightToLeft(true);
  sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  sh.setFrozenRows(1);
  return sh;
}

function appendRows_(sh, rows) {
  if (!rows.length) return;
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

/** All data rows of a tab (without the header), or [] if the tab is missing or empty. */
function readRows_(name) {
  const sh = book_().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
}

/** One page of Drive.Files.list with retries and exponential back-off. */
function drivePage_(q, fields, pageToken) {
  const args = { q: q, fields: fields, pageSize: 1000, spaces: 'drive' };
  if (pageToken) args.pageToken = pageToken;
  for (let i = 0; ; i++) {
    try {
      return Drive.Files.list(args);
    } catch (e) {
      if (i >= 4) throw e;
      Utilities.sleep(1000 * Math.pow(2, i));
    }
  }
}

/** Runs `handler` again in about a minute, in a fresh 6-minute window. */
function scheduleContinue_(handler) {
  cancelContinue_(handler);
  ScriptApp.newTrigger(handler).timeBased().after(60 * 1000).create();
}

function cancelContinue_(handler) {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === handler) ScriptApp.deleteTrigger(t);
  });
}

/** Shows a message as a toast, in the Status cell of the Settings tab, and in the log. */
function notify_(msg) {
  Logger.log(msg);
  try { setStatus_(msg); } catch (e) { /* settings tab missing */ }
  try { book_().toast(msg, APP_NAME, 15); } catch (e) { /* no UI in triggers */ }
}

/** Yes/No dialog. When there is no UI (run from the editor or a trigger) it returns true. */
function confirm_(msg) {
  let ui;
  try { ui = SpreadsheetApp.getUi(); } catch (e) { return true; }
  return ui.alert(APP_NAME, msg, ui.ButtonSet.YES_NO) === ui.Button.YES;
}

/**
 * Keeps a name exactly as it is. Without the leading apostrophe Sheets reads "=x" as a formula,
 * "2022/10/1" as a date and "2024" as a number.
 */
function safe_(s) {
  s = String(s == null ? '' : s);
  return /^[=+\-@]/.test(s) || /^[\d\s/.,:-]+$/.test(s) ? "'" + s : s;
}

function fileLink_(id) {
  return 'https://drive.google.com/open?id=' + id;
}

function mb_(bytes) {
  return Math.round(Number(bytes || 0) / 1048576 * 100) / 100;
}

function shortErr_(e) {
  return String((e && e.message) || e).slice(0, 160);
}

function splitEmails_(s) {
  return String(s || '').split(',')
    .map(function (x) { return x.trim().toLowerCase(); })
    .filter(String);
}

function typeName_(mime) {
  const key = {
    'application/vnd.google-apps.folder': 'type_folder',
    'application/vnd.google-apps.document': 'type_doc',
    'application/vnd.google-apps.spreadsheet': 'type_sheet',
    'application/vnd.google-apps.presentation': 'type_slides',
    'application/vnd.google-apps.form': 'type_form',
    'application/vnd.google-apps.shortcut': 'type_shortcut',
    'application/pdf': 'type_pdf'
  }[mime];
  if (key) return t_(key);
  if (/^image\//.test(mime)) return t_('type_image');
  if (/^video\//.test(mime)) return t_('type_video');
  if (/^audio\//.test(mime)) return t_('type_audio');
  return t_('type_file');
}

/* ---------- folder map: id -> [name, parentId], kept in a hidden tab during a scan ---------- */

const FOLDERS_TAB = '_folders';

function loadFolders_() {
  const map = {};
  readRows_(FOLDERS_TAB).forEach(function (r) { map[r[0]] = [String(r[1]), String(r[2])]; });
  return map;
}

/** Folder path of an item and whether it sits inside My Drive. */
function pathOf_(parentId, folders, rootId) {
  const parts = [];
  let p = parentId;
  let inMyDrive = false;
  for (let guard = 0; p && guard < 50; guard++) {
    if (p === rootId) { inMyDrive = true; break; }
    const f = folders[p];
    if (!f) break;
    parts.unshift(f[0]);
    p = f[1];
  }
  return {
    path: parts.length ? parts.join(' / ') : (inMyDrive ? t_('root') : '—'),
    depth: parts.length,
    inMyDrive: inMyDrive
  };
}

/** The item itself plus every folder above it. */
function ancestorIds_(id, parentId, folders) {
  const ids = {};
  ids[id] = true;
  let p = parentId;
  for (let guard = 0; p && guard < 50; guard++) {
    ids[p] = true;
    p = folders[p] ? folders[p][1] : '';
  }
  return ids;
}
