/**
 * خادم بلاغات «مشوار» من منجز — Google Apps Script + Google Sheets
 * النشر: script.google.com ← مشروع جديد ← الصق هذا الملف ← Deploy ← New deployment ← Web app
 *   Execute as: Me   ·   Who has access: Anyone
 * ثم ضع رابط /exec في mishwar/config.js داخل API.
 * يحفظ البلاغات في جدول «Mishwar Reports» ويعيد بلاغات آخر 3 ساعات فقط.
 */
const SHEET = 'Mishwar Reports';
const TYPES = ['crash', 'jam', 'closed', 'works', 'flood', 'stalled', 'hazard', 'police', 'camera'];
const LIFE_MS = 3 * 3600 * 1000;

function sheet_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('SHEET_ID'), ss;
  if (id) ss = SpreadsheetApp.openById(id);
  else { ss = SpreadsheetApp.create(SHEET); props.setProperty('SHEET_ID', ss.getId()); }
  const sh = ss.getSheets()[0];
  if (sh.getLastRow() === 0) sh.appendRow(['id', 'type', 'lat', 'lon', 'street', 't', 'up', 'down', 'created']);
  return sh;
}
const out_ = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
const inQatar_ = (la, lo) => la > 24.4 && la < 26.3 && lo > 50.6 && lo < 52;

function doGet() { return out_({ ok: true, service: 'mishwar' }); }

function doPost(e) {
  let b; try { b = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, error: 'bad_json' }); }
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sh = sheet_(), now = Date.now();
    const rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 9).getValues() : [];
    if (b.action === 'mishwarList') {
      const list = rows.filter(r => now - Number(r[5]) < LIFE_MS && Number(r[7]) < Number(r[6]) + 2)
        .map(r => ({ id: String(r[0]), type: r[1], lat: Number(r[2]), lon: Number(r[3]), street: String(r[4] || ''), t: Number(r[5]), up: Number(r[6]), down: Number(r[7]) }));
      return out_({ ok: true, reports: list });
    }
    if (b.action === 'mishwarAdd') {
      const la = Number(b.lat), lo = Number(b.lon);
      if (TYPES.indexOf(b.type) < 0 || !inQatar_(la, lo) || !/^r[a-z0-9]{6,20}$/.test(String(b.id))) return out_({ ok: false, error: 'invalid' });
      // rate limit: at most 20 reports per minute overall
      if (rows.filter(r => now - Number(r[8]) < 60000).length > 20) return out_({ ok: false, error: 'busy' });
      sh.appendRow([b.id, b.type, la, lo, String(b.street || '').slice(0, 80), now, 1, 0, now]);
      return out_({ ok: true, id: b.id });
    }
    if (b.action === 'mishwarVote') {
      const i = rows.findIndex(r => String(r[0]) === String(b.id)); if (i < 0) return out_({ ok: false, error: 'not_found' });
      const row = i + 2, v = Number(b.v);
      if (v === -9) { sh.getRange(row, 8).setValue(Number(rows[i][7]) + 99); return out_({ ok: true }); }   // reporter withdrew
      if (v > 0) { sh.getRange(row, 7).setValue(Number(rows[i][6]) + 1); sh.getRange(row, 6).setValue(now); }
      else sh.getRange(row, 8).setValue(Number(rows[i][7]) + 1);
      return out_({ ok: true });
    }
    // housekeeping: drop rows older than a day
    return out_({ ok: false, error: 'unknown_action' });
  } finally { lock.releaseLock(); }
}

/** شغّلها مرة يومياً من Triggers لحذف البلاغات الأقدم من يوم. */
function cleanup() {
  const sh = sheet_(), n = sh.getLastRow(); if (n < 2) return;
  const rows = sh.getRange(2, 1, n - 1, 9).getValues(), now = Date.now();
  for (let i = rows.length - 1; i >= 0; i--) if (now - Number(rows[i][5]) > 24 * 3600 * 1000) sh.deleteRow(i + 2);
}
