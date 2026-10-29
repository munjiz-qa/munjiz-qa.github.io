/* منطق الخادم المشترك: يعمل في خادم البيانات وفي الوضع المحلي على الجهاز بالقواعد نفسها */
var NB_SHA256 = (function () {
  var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  function utf8(s) { var o = [], i, c; for (i = 0; i < s.length; i++) { c = s.charCodeAt(i); if (c >= 0xd800 && c < 0xdc00 && i + 1 < s.length) { c = 0x10000 + ((c - 0xd800) << 10) + (s.charCodeAt(++i) - 0xdc00); } if (c < 128) o.push(c); else if (c < 2048) o.push(192 | c >> 6, 128 | c & 63); else if (c < 65536) o.push(224 | c >> 12, 128 | c >> 6 & 63, 128 | c & 63); else o.push(240 | c >> 18, 128 | c >> 12 & 63, 128 | c >> 6 & 63, 128 | c & 63); } return o; }
  return function (str) {
    var b = utf8(str), l = b.length * 8, H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], w = new Array(64), i, j, t;
    b.push(128); while (b.length % 64 !== 56) b.push(0);
    for (i = 7; i >= 0; i--) b.push(i > 3 ? 0 : (l >>> (i * 8)) & 255);
    for (i = 0; i < b.length; i += 64) {
      for (j = 0; j < 16; j++) w[j] = (b[i + j * 4] << 24) | (b[i + j * 4 + 1] << 16) | (b[i + j * 4 + 2] << 8) | b[i + j * 4 + 3];
      for (j = 16; j < 64; j++) { var x = w[j - 15], y = w[j - 2]; w[j] = (((x >>> 7 | x << 25) ^ (x >>> 18 | x << 14) ^ (x >>> 3)) + w[j - 16] + ((y >>> 17 | y << 15) ^ (y >>> 19 | y << 13) ^ (y >>> 10)) + w[j - 7]) | 0; }
      var a = H[0], bb = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (j = 0; j < 64; j++) {
        var t1 = (h + ((e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7)) + ((e & f) ^ (~e & g)) + K[j] + w[j]) | 0;
        var t2 = (((a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + bb) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    for (t = "", i = 0; i < 8; i++) t += ("00000000" + (H[i] >>> 0).toString(16)).slice(-8);
    return t;
  };
})();
function nbHash(pw, salt) { var h = NB_SHA256(salt + ":" + pw); for (var i = 0; i < 500; i++) h = NB_SHA256(h + salt); return h; }

/* env: { kv: {get,set,del,list(prefix)}, now(), rand(n), seed: {user,name,salt,hash} } */
function nbHandle(req, env) {
  var KINDS = { requests: 1, visits: 1, inputs: 1 }, MAXLEN = { requests: 60, visits: 300, inputs: 80 };
  var kv = env.kv, P = function (k) { var v = kv.get(k); return v == null ? null : JSON.parse(v); }, W = function (k, v) { kv.set(k, JSON.stringify(v)); };
  function users() {
    var u = P("sys/users"), sv = String(env.seed.v || "1");
    if (!u || !u.length) { u = [{ id: "u1", user: env.seed.user, name: env.seed.name || "مدير التطبيق", role: "admin", salt: env.seed.salt, hash: env.seed.hash, mustChange: true, at: env.now() }]; W("sys/users", u); kv.set("sys/seedv", sv); }
    else if ((kv.get("sys/seedv") || "1") !== sv) {
      /* إعادة تعيين كلمة مرور المدير الأول عند تحديث بصمتها في الإعدادات */
      var a0 = u.filter(function (y) { return y.user.toLowerCase() === String(env.seed.user).toLowerCase(); })[0];
      if (!a0) { a0 = { id: "u" + (u.length + 1), user: env.seed.user, name: env.seed.name || "مدير التطبيق", at: env.now() }; u.push(a0); }
      a0.role = "admin"; a0.salt = env.seed.salt; a0.hash = env.seed.hash; a0.mustChange = true;
      W("sys/users", u); kv.del("sys/fails"); kv.set("sys/seedv", sv);
    }
    /* حساب العميل الافتراضي: يُنشأ أو تُعاد كلمة مروره عند تغيير إصداره في الإعدادات */
    var cv = String(env.seed.cV || "");
    if (env.seed.cUser && cv && (kv.get("sys/seedc") || "") !== cv) {
      var c0 = u.filter(function (y) { return y.user.toLowerCase() === String(env.seed.cUser).toLowerCase(); })[0];
      if (!c0) { var cn = 1; u.forEach(function (y) { var k = +String(y.id).slice(1); if (k >= cn) cn = k + 1; }); c0 = { id: "u" + cn, user: env.seed.cUser, at: env.now() }; u.push(c0); }
      c0.name = env.seed.cName || "حساب العميل"; c0.role = "staff"; c0.salt = env.seed.cSalt; c0.hash = env.seed.cHash; c0.mustChange = false;
      W("sys/users", u); kv.set("sys/seedc", cv);
    }
    return u;
  }
  function pub(u) { return { id: u.id, user: u.user, name: u.name, role: u.role, mustChange: !!u.mustChange, at: u.at }; }
  function err(code, msg) { return { ok: false, code: code, error: msg }; }
  function me() {
    if (!req.token) return null;
    var t = P("sys/tokens") || {}, s = t[req.token];
    if (!s || s.exp < Date.now()) return null;
    var u = users().filter(function (x) { return x.id === s.uid; })[0];
    return u || null;
  }
  function issue(u) {
    var t = P("sys/tokens") || {}, now = Date.now(), tok = env.rand(40);
    Object.keys(t).forEach(function (k) { if (t[k].exp < now) delete t[k]; });
    t[tok] = { uid: u.id, exp: now + 14 * 864e5 }; W("sys/tokens", t); return tok;
  }
  var a = req.action, u = me(), admin = !!(u && u.role === "admin" && !u.mustChange), staff = !!(u && !u.mustChange);
  var clean = function (s, n) { return String(s == null ? "" : s).trim().slice(0, n || 80); };
  var pwOk = function (p) { return typeof p === "string" && p.length >= 8 && /[A-Za-z؀-ۿ]/.test(p) && /\d/.test(p); };
  if (a === "login") {
    var name = clean(req.user).toLowerCase(), list = users(), x = list.filter(function (y) { return y.user.toLowerCase() === name; })[0];
    var fails = P("sys/fails") || {}, f = fails[name] || { n: 0, until: 0 };
    if (f.until > Date.now()) return err("locked", "تجاوزت عدد المحاولات المسموح. أعد المحاولة بعد 5 دقائق.");
    if (!x || nbHash(String(req.pw || "").trim(), x.salt) !== x.hash) { f.n++; if (f.n >= 10) { f.until = Date.now() + 5 * 6e4; f.n = 0; } fails[name] = f; W("sys/fails", fails); return err("auth", "اسم المستخدم أو كلمة المرور غير صحيحة."); }
    delete fails[name]; W("sys/fails", fails);
    return { ok: true, token: issue(x), user: pub(x) };
  }
  if (a === "dataset") return { ok: true, data: P("config/dataset") };
  if (a === "editions") return { ok: true, list: kv.list("editions/").map(function (k) { var v = P(k); v.key = k.slice(9); return v; }) };
  if (!u) return err("auth", "انتهت الجلسة. سجّل الدخول من جديد.");
  if (a === "me") return { ok: true, user: pub(u) };
  if (a === "logout") { var tt = P("sys/tokens") || {}; delete tt[req.token]; W("sys/tokens", tt); return { ok: true }; }
  if (a === "changePw") {
    if (nbHash(String(req.old || "").trim(), u.salt) !== u.hash) return err("auth", "كلمة المرور الحالية غير صحيحة.");
    if (!pwOk(req.pw)) return err("weak", "كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف وأن تجمع بين الحروف والأرقام.");
    if (req.pw === req.old) return err("weak", "اختر كلمة مرور مختلفة عن الحالية.");
    var L = users(); L.forEach(function (y) { if (y.id === u.id) { y.salt = env.rand(16); y.hash = nbHash(req.pw, y.salt); y.mustChange = false; } }); W("sys/users", L);
    var me2 = L.filter(function (y) { return y.id === u.id; })[0];
    return { ok: true, user: pub(me2) };
  }
  if (!staff) return err("change", "يلزم تغيير كلمة المرور المؤقتة أولاً.");
  var kind = req.kind;
  if (a === "list") {
    if (!KINDS[kind] || (kind === "requests" && !admin)) return err("perm", "لا تملك صلاحية الاطلاع.");
    return { ok: true, groups: kv.list(kind + "/").map(function (k) { return { owner: k.slice(kind.length + 1), items: (P(k) || {}).items || [] }; }) };
  }
  if (a === "getMine" || a === "getFor") {
    var ow = a === "getMine" ? u.id : clean(req.owner, 20);
    if (!KINDS[kind] || (ow !== u.id && !admin && kind === "requests")) return err("perm", "لا تملك صلاحية الاطلاع.");
    return { ok: true, items: (P(kind + "/" + ow) || {}).items || [] };
  }
  if (a === "setMine" || a === "setFor") {
    var ow2 = a === "setMine" ? u.id : clean(req.owner, 20);
    if (!KINDS[kind] || !Array.isArray(req.items) || (ow2 !== u.id && !admin)) return err("perm", "لا تملك صلاحية التعديل.");
    var body = JSON.stringify({ items: req.items.slice(0, MAXLEN[kind]), by: ow2 });
    if (body.length > 400000) return err("size", "حجم البيانات أكبر من المسموح.");
    kv.set(kind + "/" + ow2, body); return { ok: true };
  }
  if (a === "names") { var m = {}; users().forEach(function (y) { m[y.id] = { name: y.name }; }); return { ok: true, names: m }; }
  if (!admin) return err("perm", "هذا الإجراء متاح لمديري التطبيق فقط.");
  if (a === "saveEdition") {
    var e = req.edition || {}, key = clean(e.key, 60).replace(/[^A-Za-z0-9-]/g, "");
    if (!key || typeof e.json !== "string" || e.json.length > 400000) return err("size", "بيانات الإصدار غير صالحة أو أكبر من المسموح.");
    try { var d = JSON.parse(e.json); if (!d.kpis || !d.asOf) throw 0; } catch (x2) { return err("bad", "بيانات الإصدار غير صالحة."); }
    W("editions/" + key, { json: e.json, edition: clean(e.edition, 60), asOf: clean(e.asOf, 10), savedAt: env.now(), by: u.id });
    W("config/dataset", { json: e.json, key: key, updatedAt: env.now(), by: u.id });
    return { ok: true };
  }
  if (a === "users") return { ok: true, users: users().map(pub) };
  if (a === "addUser" || a === "resetUser") {
    var L2 = users(), tmp = String(req.pw || ""), x3;
    if (!pwOk(tmp)) return err("weak", "كلمة المرور المؤقتة يجب ألا تقل عن 8 أحرف وأن تجمع بين الحروف والأرقام.");
    if (a === "addUser") {
      var un = clean(req.user, 30).toLowerCase();
      if (!/^[a-z0-9._-]{3,30}$/.test(un)) return err("bad", "اسم المستخدم من 3 إلى 30 حرفاً لاتينياً أو رقماً.");
      if (L2.some(function (y) { return y.user.toLowerCase() === un; })) return err("dup", "اسم المستخدم مستخدم من قبل.");
      var n = 1; L2.forEach(function (y) { n = Math.max(n, +y.id.slice(1) + 1); });
      x3 = { id: "u" + n, user: un, name: clean(req.name, 60) || un, role: req.role === "admin" ? "admin" : "staff", at: env.now() }; L2.push(x3);
    } else { x3 = L2.filter(function (y) { return y.id === req.id; })[0]; if (!x3) return err("bad", "المستخدم غير موجود."); }
    x3.salt = env.rand(16); x3.hash = nbHash(tmp, x3.salt); x3.mustChange = true;
    W("sys/users", L2); return { ok: true, users: L2.map(pub) };
  }
  if (a === "setRole" || a === "delUser") {
    var L3 = users(), y3 = L3.filter(function (y) { return y.id === req.id; })[0];
    if (!y3) return err("bad", "المستخدم غير موجود.");
    if (y3.id === u.id) return err("self", "لا يمكن تعديل حسابك من هذه القائمة.");
    if (y3.id === "u1") return err("main", "حساب المدير الرئيسي محمي من الحذف وتغيير الصلاحية.");
    if (a === "setRole") y3.role = req.role === "admin" ? "admin" : "staff"; else L3 = L3.filter(function (y) { return y.id !== req.id; });
    W("sys/users", L3);
    if (a === "delUser") { var t3 = P("sys/tokens") || {}; Object.keys(t3).forEach(function (k) { if (t3[k].uid === req.id) delete t3[k]; }); W("sys/tokens", t3); }
    return { ok: true, users: L3.map(pub) };
  }
  return err("bad", "طلب غير معروف.");
}

/* ================= خادم بيانات نبراس على Google Apps Script =================
   الإعداد: الصق هذا الملف كاملاً في محرر Apps Script لجدول Google جديد،
   ثم انشره تطبيق ويب (Execute as: Me، Who has access: Anyone)،
   وضع رابط /exec في الحقل API داخل assets/config.js.                        */
const SEED = {"user":"admin","name":"مدير التطبيق","v":"3","salt":"FaGabcwhhatD6R2c","hash":"1c3a3bf7f31ef810fbff3176bd87ab89860bd55810bf03f7b175f37837abc5e6","cUser":"client","cName":"حساب العميل","cV":"1","cSalt":"7bknNtzgK3TUh8aZ","cHash":"72f699041c13a49f88f7f1632c4751086184c7eac5680862bf511747a389b153"};
const SHEET = "Store", CHUNK = 45000, PARTS = 10;

function sheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) { sh = ss.insertSheet(SHEET); sh.getRange(1, 1, 1, 3).setValues([["key", "updated", "data"]]); sh.setFrozenRows(1); }
  return sh;
}
function kv_() {
  const sh = sheet_();
  const keys = () => { const n = sh.getLastRow(); return n < 2 ? [] : sh.getRange(2, 1, n - 1, 1).getValues().map(r => String(r[0])); };
  const rowOf = k => { const i = keys().indexOf(k); return i < 0 ? -1 : i + 2; };
  return {
    get(k) { const r = rowOf(k); if (r < 0) return null; return sh.getRange(r, 3, 1, PARTS).getValues()[0].join("") || null; },
    set(k, v) {
      const parts = []; for (let i = 0; i < PARTS; i++) parts.push(v.slice(i * CHUNK, (i + 1) * CHUNK));
      if (v.length > CHUNK * PARTS) throw new Error("size");
      let r = rowOf(k); if (r < 0) r = sh.getLastRow() + 1;
      sh.getRange(r, 1, 1, PARTS + 2).setValues([[k, new Date().toISOString(), ...parts]]);
    },
    del(k) { const r = rowOf(k); if (r > 0) sh.deleteRow(r); },
    list(p) { return keys().filter(k => k.indexOf(p) === 0).sort(); }
  };
}
function rand_(n) { let s = ""; while (s.length < n) s += Utilities.getUuid().replace(/-/g, ""); return s.slice(0, n); }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function doPost(e) {
  let req = {};
  try { req = JSON.parse((e && e.postData && e.postData.contents) || "{}"); } catch (x) { return out_({ ok: false, code: "bad", error: "طلب غير صالح." }); }
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    return out_(nbHandle(req, { kv: kv_(), now: () => new Date().toISOString(), rand: rand_, seed: SEED }));
  } catch (x) {
    return out_({ ok: false, code: "server", error: "تعذّر تنفيذ الطلب على الخادم. أعد المحاولة بعد قليل." });
  } finally { try { lock.releaseLock(); } catch (y) { } }
}
function doGet() { return out_({ ok: true, app: "nibras", time: new Date().toISOString() }); }
