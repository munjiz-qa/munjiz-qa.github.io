/* خادم البيانات المشترك لسَيْف على Google Apps Script.
   الملفان المطلوبان في مشروع Apps Script: core.gs (محتوى saif/core.js كما هو) وهذا الملف.
   البيانات تُحفظ في ورقة «saif_kv» داخل جدول Google المرتبط بالمشروع. */
var SAIF_SEED = [{"user":"admin","name":"المدير الشامل","role":"admin","salt":"XasHXpuBLXDT4V6H","hash":"023eed9ca137fb791b8bdd1c33ac651cb976b814774cb0d4002a0c91e0fdb182"},{"user":"client","name":"العميل الافتراضي","role":"client","salt":"wtpvdKGsrzc8DRAG","hash":"3242a190073f7bafcdf784579e63ec327ad8c537e8aad832959668854f13f597"}];

function doGet() { return out_({ ok: true, app: "saif", at: new Date().toISOString() }); }
function doPost(e) {
  var req;
  try { req = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, code: "bad", error: "طلب غير صالح." }); }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return out_({ ok: false, code: "busy", error: "الخادم مشغول، أعد المحاولة بعد لحظات." });
  try { var env = env_(), r = SAIF_CORE.handle(req, env); env.flush(); return out_(r); }
  catch (x) { return out_({ ok: false, code: "server", error: "خطأ في الخادم: " + x.message }); }
  finally { lock.releaseLock(); }
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName("saif_kv");
  if (!sh) { sh = ss.insertSheet("saif_kv"); sh.getRange("A:Z").setNumberFormat("@"); }
  return sh;
}
function env_() {
  var sh = sheet_(), vals = sh.getDataRange().getValues(), map = {}, row = {}, dirty = {}, next = vals.length + 1, CH = 45000;
  vals.forEach(function (r, i) { if (r[0]) { map[r[0]] = r.slice(1).join(""); row[r[0]] = i + 1; } });
  return {
    kv: {
      get: function (k) { return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null; },
      set: function (k, v) { map[k] = String(v); dirty[k] = 1; },
      del: function (k) { delete map[k]; dirty[k] = 1; },
      list: function (p) { return Object.keys(map).filter(function (k) { return k.indexOf(p) === 0; }); }
    },
    flush: function () {
      var w = Math.max(2, sh.getLastColumn());
      Object.keys(dirty).forEach(function (k) {
        var r = row[k];
        if (Object.prototype.hasOwnProperty.call(map, k)) {
          var v = map[k], parts = [];
          for (var i = 0; i < v.length; i += CH) parts.push(v.slice(i, i + CH));
          if (!parts.length) parts.push("");
          if (!r) { r = row[k] = next++; }
          var line = [k].concat(parts); w = Math.max(w, line.length);
          while (line.length < w) line.push("");
          sh.getRange(r, 1, 1, w).setValues([line]);
        } else if (r) { sh.getRange(r, 1, 1, w).clearContent(); delete row[k]; }
      });
    },
    now: function () { return new Date().toISOString(); },
    rand: function (n) { var s = ""; while (s.length < n) s += Utilities.getUuid().replace(/-/g, ""); return s.slice(0, n); },
    seed: SAIF_SEED, server: true
  };
}
