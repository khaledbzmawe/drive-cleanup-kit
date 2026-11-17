/**
 * The Settings tab. It is bilingual because the language is not known until it is read.
 *
 *   B2  language                 en | ar
 *   B3  public edit links        keep | view | remove
 *   B4  large file threshold     MB
 *   B5  status                   written by the script
 *   row 7 onward: people to keep (email, optional folder link)
 */

const SETTINGS_TAB = 'Settings · الإعدادات';
const KEEP_FIRST_ROW = 8;

function ensureSettings_() {
  const ss = book_();
  props_().setProperty('BOOK_ID', ss.getId());
  let sh = ss.getSheetByName(SETTINGS_TAB);
  if (sh) return sh;

  sh = ss.insertSheet(SETTINGS_TAB, 0);
  const rows = [
    ['Setting\nالإعداد', 'Value\nالقيمة', 'Help\nشرح'],
    ['Language\nاللغة', 'en',
      'en or ar. Choose before the first scan.\nاختر قبل أول فحص.'],
    ['Public edit links\nروابط التعديل العامة', 'view',
      'What to do with "anyone with the link": keep = leave, view = make edit links view-only, remove = remove every public link.\nkeep = اتركها، view = حوّل روابط التعديل إلى عرض، remove = احذف كل رابط عام.'],
    ['Large file (MB)\nملف كبير', 200,
      'Files bigger than this are listed for your review. Never ticked for you.\nالملفات الأكبر تُعرض لتقرر بنفسك.'],
    ['Status\nالحالة', '', ''],
    ['', '', ''],
    ['People to keep: email\nمن يبقى: البريد', 'Only inside this folder (optional link)\nداخل هذا المجلد فقط (اختياري)', 'Note\nملاحظة']
  ];
  sh.getRange(1, 1, rows.length, 3).setValues(rows);
  sh.getRange('A1:C1').setFontWeight('bold');
  sh.getRange('A7:C7').setFontWeight('bold');
  sh.getRange('B2').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['en', 'ar']).build());
  sh.getRange('B3').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['keep', 'view', 'remove']).build());
  sh.getRange('A1:C7').setWrap(true).setVerticalAlignment('top');
  sh.setColumnWidth(1, 260);
  sh.setColumnWidth(2, 320);
  sh.setColumnWidth(3, 420);
  sh.setFrozenRows(1);
  return sh;
}

let SETTINGS_CACHE = null;

function settings_() {
  if (SETTINGS_CACHE) return SETTINGS_CACHE;
  const sh = ensureSettings_();
  const v = sh.getRange(2, 2, 3, 1).getValues().map(function (r) { return String(r[0]).trim().toLowerCase(); });
  const keep = [];
  const badFolders = [];
  const last = sh.getLastRow();
  if (last >= KEEP_FIRST_ROW) {
    sh.getRange(KEEP_FIRST_ROW, 1, last - KEEP_FIRST_ROW + 1, 2).getValues().forEach(function (r) {
      const email = String(r[0]).trim().toLowerCase();
      if (email.indexOf('@') < 0) return;
      const raw = String(r[1]).trim();
      const folderId = folderIdFrom_(raw);
      if (raw && !folderId) badFolders.push(email); // unreadable folder: keep everywhere, to be safe
      keep.push({ email: email, folderId: folderId });
    });
  }
  SETTINGS_CACHE = {
    lang: v[0] === 'ar' ? 'ar' : 'en',
    policy: ['keep', 'view', 'remove'].indexOf(v[1]) >= 0 ? v[1] : 'view',
    largeMb: Number(v[2]) > 0 ? Number(v[2]) : 200,
    keep: keep,
    badFolders: badFolders
  };
  return SETTINGS_CACHE;
}

/** Accepts a folder link (…/folders/<id>, ?id=<id>) or a bare id. */
function folderIdFrom_(s) {
  if (!s) return '';
  const m = s.match(/folders\/([\w-]{10,})/) || s.match(/[?&]id=([\w-]{10,})/) || s.match(/^([\w-]{10,})$/);
  return m ? m[1] : '';
}

/** How a person is treated by the keep list: 'everywhere', 'scoped' or 'no'. */
function keepStatus_(email) {
  const rules = settings_().keep.filter(function (k) { return k.email === email; });
  if (!rules.length) return 'no';
  return rules.some(function (k) { return !k.folderId; }) ? 'everywhere' : 'scoped';
}

/** Should this person keep access to an item whose ancestors (including itself) are `ancestors`? */
function isKept_(email, ancestors) {
  return settings_().keep.some(function (k) {
    return k.email === email && (!k.folderId || ancestors[k.folderId]);
  });
}

function setStatus_(msg) {
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  ensureSettings_().getRange('B5').setValue(stamp + ' · ' + msg);
}
