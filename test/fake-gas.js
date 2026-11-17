/**
 * A small in-memory stand-in for the Apps Script services this project uses,
 * so the whole flow can run in Node without touching a real Drive.
 */
'use strict';

function makeSheet(name) {
  const cells = [];
  const sh = {
    name, hidden: false, rtl: false, hiddenCols: [], checkboxes: [],
    cells,
    getName: () => name,
    setRightToLeft(v) { sh.rtl = v; return sh; },
    setFrozenRows() { return sh; },
    setColumnWidth() { return sh; },
    hideSheet() { sh.hidden = true; return sh; },
    hideColumns(c, n) { sh.hiddenCols.push([c, n || 1]); return sh; },
    getLastRow() {
      for (let r = cells.length - 1; r >= 0; r--) if ((cells[r] || []).some((v) => v !== '' && v !== undefined)) return r + 1;
      return 0;
    },
    getLastColumn() {
      let m = 0;
      cells.forEach((row) => { (row || []).forEach((v, c) => { if (v !== '' && v !== undefined) m = Math.max(m, c + 1); }); });
      return m;
    },
    getRange(a, b, c, d) {
      if (typeof a === 'string') {
        const m = a.match(/^([A-Z])(\d+)(?::([A-Z])(\d+))?$/);
        const col = (L) => L.charCodeAt(0) - 64;
        const r1 = +m[2], c1 = col(m[1]);
        const r2 = m[4] ? +m[4] : r1, c2 = m[3] ? col(m[3]) : c1;
        return makeRange(sh, r1, c1, r2 - r1 + 1, c2 - c1 + 1);
      }
      return makeRange(sh, a, b, c || 1, d || 1);
    }
  };
  return sh;
}

/**
 * Sheets reads typed text the way a person would: "2022/10/1" becomes a date and "2024" a number.
 * A leading apostrophe keeps the text as it is (and is not stored).
 */
function parseLikeSheets(v) {
  if (typeof v !== 'string') return v;
  if (v.startsWith("'")) return v.slice(1);
  if (/^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(v)) return new Date(v.replace(/\//g, '-') + 'T00:00:00Z');
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

function makeRange(sh, row, col, nr, nc) {
  const rg = {
    setValues(vals) {
      if (vals.length !== nr || vals.some((r) => r.length !== nc)) throw new Error(`setValues size mismatch on ${sh.name}: range ${nr}x${nc}, data ${vals.length}x${vals[0] && vals[0].length}`);
      vals.forEach((r, i) => r.forEach((v, j) => {
        sh.cells[row - 1 + i] = sh.cells[row - 1 + i] || [];
        sh.cells[row - 1 + i][col - 1 + j] = parseLikeSheets(v);
      }));
      return rg;
    },
    setValue(v) { return rg.setValues([[v]]); },
    getValues() {
      const out = [];
      for (let i = 0; i < nr; i++) {
        const r = [];
        for (let j = 0; j < nc; j++) {
          const v = (sh.cells[row - 1 + i] || [])[col - 1 + j];
          r.push(v === undefined ? '' : v);
        }
        out.push(r);
      }
      return out;
    },
    insertCheckboxes() {
      sh.checkboxes.push([row, col, nr, nc]);
      for (let i = 0; i < nr; i++) {
        sh.cells[row - 1 + i] = sh.cells[row - 1 + i] || [];
        const v = sh.cells[row - 1 + i][col - 1];
        sh.cells[row - 1 + i][col - 1] = v === true;
      }
      return rg;
    },
    setFontWeight() { return rg; },
    setDataValidation() { return rg; },
    setWrap() { return rg; },
    setVerticalAlignment() { return rg; },
    setVerticalAlignment() { return rg; }
  };
  return rg;
}

function makeSpreadsheet(id) {
  const sheets = [makeSheet('Sheet1')];
  const ss = {
    sheets, toasts: [], active: null,
    getId: () => id,
    getSheets: () => sheets,
    getSheetByName: (n) => sheets.find((s) => s.name === n) || null,
    insertSheet(n, idx) {
      if (ss.getSheetByName(n)) throw new Error('duplicate tab ' + n);
      const s = makeSheet(n);
      if (idx === undefined) sheets.push(s); else sheets.splice(idx, 0, s);
      return s;
    },
    deleteSheet(s) { sheets.splice(sheets.indexOf(s), 1); },
    setActiveSheet(s) { ss.active = s; },
    toast(msg) { ss.toasts.push(msg); }
  };
  return ss;
}

/**
 * Fake Drive. `items` is a list of {id, name, mimeType, parents, owner, size, md5, created, modified, perms, trashed, content}.
 */
function makeDrive(me, items, opts) {
  opts = opts || {};
  const byId = Object.fromEntries(items.map((f) => [f.id, f]));
  const pageSize = opts.pageSize || 2;
  const calls = [];
  let permSeq = 0;
  items.forEach((f) => { (f.perms || []).forEach((p) => { p.id = p.id || 'p' + (++permSeq); }); });

  function matches(f, q) {
    if (/trashed = false/.test(q) && f.trashed) return false;
    if (/trashed = true/.test(q) && !f.trashed) return false;
    let m;
    if ((m = q.match(/^'([^']+)' in parents/))) return (f.parents || []).includes(m[1]);
    if (/mimeType = 'application\/vnd\.google-apps\.folder'/.test(q) && f.mimeType !== 'application/vnd.google-apps.folder') return false;
    if (/^not 'me' in owners/.test(q)) return f.owner !== me;
    if (/^'me' in owners/.test(q)) return f.owner === me;
    return true;
  }

  function view(f) {
    return {
      id: f.id, name: f.name, mimeType: f.mimeType, parents: f.parents,
      size: f.size === undefined ? undefined : String(f.size),
      md5Checksum: f.md5, createdTime: f.created || '2024-01-01T00:00:00Z', modifiedTime: f.modified || '2024-02-01T00:00:00Z',
      ownedByMe: f.owner === me, trashed: !!f.trashed,
      owners: [{ emailAddress: f.owner }],
      permissions: (f.perms || []).map((p) => Object.assign({}, p))
    };
  }

  const Drive = {
    calls,
    Files: {
      list(args) {
        calls.push(['list', args.q]);
        const all = items.filter((f) => f.id !== 'root' && matches(f, args.q));
        const start = args.pageToken ? Number(args.pageToken) : 0;
        const size = Math.min(args.pageSize || 100, pageSize);
        const page = all.slice(start, start + size).map(view);
        return { files: page, nextPageToken: start + size < all.length ? String(start + size) : undefined };
      },
      get(id) {
        if (id === 'root') return { id: 'ROOT' };
        const f = byId[id];
        if (!f) throw new Error('File not found: ' + id);
        return view(f);
      },
      update(res, id) {
        calls.push(['update', id, res]);
        if (res.trashed) byId[id].trashed = true;
        return view(byId[id]);
      }
    },
    Permissions: {
      list(id) { return { permissions: (byId[id].perms || []).map((p) => Object.assign({}, p)) }; },
      remove(id, pid) {
        calls.push(['remove', id, pid]);
        const f = byId[id];
        const p = f.perms.find((x) => x.id === pid);
        if (p && p.inherited) throw new Error('Cannot delete an inherited permission');
        f.perms = f.perms.filter((x) => x.id !== pid);
        // Drive drops the inherited copies on everything below this folder
        if (p) items.forEach((x) => { x.perms = (x.perms || []).filter((q) => !(q.inherited === id && q.emailAddress === p.emailAddress)); });
      },
      update(res, id, pid) {
        calls.push(['permUpdate', id, pid, res]);
        byId[id].perms.find((x) => x.id === pid).role = res.role;
      }
    },
    About: { get: () => ({ storageQuota: { usage: '1000', limit: '2000', usageInDrive: '900', usageInDriveTrash: '1048576' } }) }
  };
  return { Drive, byId };
}

function makeGlobals(me, items, opts) {
  const ss = makeSpreadsheet('BOOK');
  const { Drive, byId } = makeDrive(me, items, opts);
  const props = {};
  const triggers = [];
  const log = [];
  const content = (id) => byId[id].content || {};
  const g = {
    Logger: { log: (m) => log.push(m) },
    console,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (k in props ? props[k] : null),
        setProperty: (k, v) => { props[k] = String(v); },
        deleteProperty: (k) => { delete props[k]; }
      })
    },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss,
      openById: (id) => {
        if (id === 'BOOK') return ss;
        const c = content(id);
        return { getSheets: () => (c.sheets || [0]).map((rows) => ({ getLastRow: () => rows, getCharts: () => [], getImages: () => [] })) };
      },
      getUi: () => { throw new Error('no UI in tests'); },
      newDataValidation: () => ({ requireValueInList() { return this; }, build: () => ({}) })
    },
    DocumentApp: { openById: (id) => ({ getBody: () => ({ getText: () => content(id).text || '', getImages: () => [] }) }) },
    SlidesApp: {
      PageElementType: { SHAPE: 'SHAPE' },
      openById: () => ({ getSlides: () => [] })
    },
    ScriptApp: {
      getProjectTriggers: () => triggers.slice(),
      deleteTrigger: (t) => triggers.splice(triggers.indexOf(t), 1),
      newTrigger: (fn) => ({ timeBased: () => ({ after: () => ({ create: () => { triggers.push({ getHandlerFunction: () => fn }); } }) }) })
    },
    Session: { getEffectiveUser: () => ({ getEmail: () => me }), getScriptTimeZone: () => 'UTC' },
    Utilities: { formatDate: () => '2026-01-01 00:00', sleep: () => {} },
    Drive
  };
  return { g, ss, Drive, byId, props, triggers, log };
}

module.exports = { makeGlobals };
