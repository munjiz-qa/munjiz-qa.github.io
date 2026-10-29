/* نواة سَيْف: منطق الحسابات والصلاحيات والفحوص والأختام.
   الملف نفسه يعمل في المتصفح (الوضع المحلي) وفي خادم Google Apps Script (الوضع المشترك) وفي اختبار GitHub الآلي،
   فالصلاحيات تُفحص هنا دائماً وليس في الواجهة فقط. */
var SAIF_CORE = (function () {
  "use strict";

  /* ---------- SHA-256 متزامن (بلا مكتبات) ---------- */
  var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  function utf8(s) {
    var out = [], i, c;
    for (i = 0; i < s.length; i++) {
      c = s.charCodeAt(i);
      if (c >= 0xd800 && c < 0xdc00 && i + 1 < s.length) { c = 0x10000 + ((c - 0xd800) << 10) + (s.charCodeAt(++i) - 0xdc00); }
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | c >> 6, 0x80 | c & 63);
      else if (c < 0x10000) out.push(0xe0 | c >> 12, 0x80 | c >> 6 & 63, 0x80 | c & 63);
      else out.push(0xf0 | c >> 18, 0x80 | c >> 12 & 63, 0x80 | c >> 6 & 63, 0x80 | c & 63);
    }
    return out;
  }
  function sha256(str) {
    var b = utf8(String(str)), l = b.length * 8, H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], w = new Array(64), i, j;
    b.push(0x80); while (b.length % 64 !== 56) b.push(0);
    for (i = 7; i >= 0; i--) b.push(i > 3 ? 0 : (l >>> (i * 8)) & 255);
    for (i = 0; i < b.length; i += 64) {
      for (j = 0; j < 16; j++) w[j] = (b[i + j * 4] << 24) | (b[i + j * 4 + 1] << 16) | (b[i + j * 4 + 2] << 8) | b[i + j * 4 + 3];
      for (j = 16; j < 64; j++) {
        var x = w[j - 15], y = w[j - 2];
        var s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3), s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }
      var a = H[0], bb = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (j = 0; j < 64; j++) {
        var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7)), ch = (e & f) ^ (~e & g), t1 = (h + S1 + ch + K[j] + w[j]) | 0;
        var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10)), mj = (a & bb) ^ (a & c) ^ (bb & c), t2 = (S0 + mj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + bb) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map(function (v) { return ("0000000" + (v >>> 0).toString(16)).slice(-8); }).join("");
  }
  var ROUNDS = 2000;
  function pwHash(salt, pw) { var h = sha256(salt + "|" + pw); for (var i = 1; i < ROUNDS; i++) h = sha256(h + salt); return h; }

  /* ---------- الأدوار والصلاحيات ---------- */
  var ROLES = { admin: "مدير شامل", client: "عميل" };
  var PERMS = {
    admin: ["scan", "ownReports", "device", "profile", "users", "allReports", "audit", "settings", "backup", "health"],
    client: ["scan", "ownReports", "device", "profile"]
  };
  var PERM_NAMES = {
    scan: "فحص الملفات وختم التقارير", ownReports: "تقاريره وسلسلة أختامه", device: "مراقبة جهازه لحظة بلحظة", profile: "تعديل بياناته وكلمة مروره",
    users: "إدارة الحسابات والأدوار", allReports: "الاطلاع على فحوص جميع العملاء", audit: "سجل التدقيق الكامل", settings: "إعدادات المنصة", backup: "النسخ الاحتياطي والاستعادة", health: "صحة المنصة والفحص الذاتي"
  };
  function can(u, p) { return !!(u && u.active !== false && PERMS[u.role] && PERMS[u.role].indexOf(p) >= 0); }

  var SEV = { high: "عالٍ", mid: "متوسط", low: "منخفض" };
  var DEF_SETTINGS = { sessionHours: 12, warnBelow: 90, alertBelow: 60, maxAttempts: 5, lockMinutes: 10 };

  /* ---------- أدوات ---------- */
  function err(code, msg) { return { ok: false, code: code, error: msg }; }
  function clean(s, n) { return String(s == null ? "" : s).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n || 120); }
  function pub(u) { return { id: u.id, user: u.user, name: u.name, role: u.role, roleName: ROLES[u.role], email: u.email || "", phone: u.phone || "", org: u.org || "", active: u.active !== false, created: u.created, last: u.last || "", perms: (PERMS[u.role] || []).slice() }; }
  function normPhone(p) {
    var d = String(p || "").replace(/[^\d+]/g, ""); if (!d) return "";
    if (d.indexOf("00") === 0) d = "+" + d.slice(2);
    if (/^\d{8}$/.test(d)) d = "+974" + d;
    if (d[0] !== "+") d = "+" + d;
    var m = /^\+974(\d{4})(\d{4})$/.exec(d);
    return m ? "+974 " + m[1] + " " + m[2] : d;
  }
  function scoreOf(files) {
    var s = 100;
    files.forEach(function (f) { (f.findings || []).forEach(function (x) { s -= (x.sev === "high" ? 25 : x.sev === "mid" ? 10 : 3) * Math.min(3, x.count || 1); }); });
    return Math.max(0, s);
  }

  /* ---------- المعالج: نقطة الدخول الوحيدة لكل الطلبات ---------- */
  function handle(req, env) {
    var kv = env.kv;
    function R(k, d) { var v = kv.get(k); if (v == null) return d; try { return JSON.parse(v); } catch (e) { return d; } }
    function W(k, v) { kv.set(k, JSON.stringify(v)); }
    function bump() { W("sys/rev", (R("sys/rev", 0) || 0) + 1); }
    function settings() { var s = R("sys/settings", {}) || {}; var o = {}; Object.keys(DEF_SETTINGS).forEach(function (k) { o[k] = s[k] != null ? s[k] : DEF_SETTINGS[k]; }); return o; }
    function users() {
      var L = R("sys/users", null);
      if (!L) {
        L = (env.seed || []).map(function (s, i) { return { id: "u" + (i + 1), user: s.user, name: s.name, role: s.role, salt: s.salt, hash: s.hash, email: s.email || "", phone: s.phone || "", org: s.org || "", active: true, created: env.now(), last: "" }; });
        W("sys/users", L); W("sys/seq", L.length);
      }
      return L;
    }
    function audit(u, act, detail) {
      var A = R("sys/audit", []) || []; A.unshift({ at: env.now(), uid: u ? u.id : "", user: u ? u.user : "—", act: act, detail: clean(detail, 200) });
      W("sys/audit", A.slice(0, 1500));
    }
    function ws(uid) { return R("ws/" + uid, null) || { scans: [], files: {} }; }
    function session() {
      var T = R("sys/tokens", {}) || {}, t = T[req.token];
      if (!t || t.exp < Date.now()) return null;
      var u = users().filter(function (x) { return x.id === t.uid; })[0];
      return u && u.active !== false ? u : null;
    }
    function verify(scans) {
      var prev = "", bad = [];
      scans.slice().sort(function (a, b) { return a.n - b.n; }).forEach(function (s) {
        var body = JSON.stringify({ n: s.n, at: s.at, uid: s.uid, files: s.files, score: s.score });
        if (s.prev !== prev || s.seal !== sha256(prev + body)) bad.push(s.n);
        prev = s.seal;
      });
      return { ok: bad.length === 0, count: scans.length, broken: bad };
    }
    function summary(uid) {
      var W0 = ws(uid), last = W0.scans[0] || null;
      return { scans: W0.scans.length, files: Object.keys(W0.files).length, last: last ? { n: last.n, at: last.at, score: last.score, state: last.state } : null, chain: verify(W0.scans) };
    }

    var a = req.action, S = settings();
    if (a === "alive") return { ok: true, rev: R("sys/rev", 0), at: env.now(), server: !!env.server };

    if (a === "login") {
      var name = clean(req.user, 60).toLowerCase(), L = users(), u = L.filter(function (x) { return x.user.toLowerCase() === name; })[0];
      var F = R("sys/fails", {}) || {}, f = F[name] || { n: 0, until: 0 };
      if (f.until > Date.now()) return err("locked", "تم إيقاف الدخول مؤقتاً بعد محاولات خاطئة متكررة. حاول بعد " + Math.ceil((f.until - Date.now()) / 60000) + " دقيقة.");
      if (!u || u.hash !== pwHash(u.salt, String(req.pw || ""))) {
        f.n++; if (f.n >= S.maxAttempts) { f.until = Date.now() + S.lockMinutes * 60000; f.n = 0; }
        F[name] = f; W("sys/fails", F); audit(u || null, "محاولة دخول خاطئة", name);
        return err("auth", "اسم المستخدم أو كلمة المرور غير صحيحة.");
      }
      if (u.active === false) return err("off", "هذا الحساب موقوف. تواصل مع إدارة المنصة.");
      delete F[name]; W("sys/fails", F);
      var tok = env.rand(40), T = R("sys/tokens", {}) || {};
      Object.keys(T).forEach(function (k) { if (T[k].exp < Date.now()) delete T[k]; });
      T[tok] = { uid: u.id, exp: Date.now() + S.sessionHours * 3600000 }; W("sys/tokens", T);
      u.last = env.now(); W("sys/users", L); audit(u, "تسجيل دخول", ""); bump();
      return { ok: true, token: tok, user: pub(u) };
    }

    var me = session();
    if (!me) return err("auth", "انتهت الجلسة. سجّل الدخول من جديد.");
    function need(p) { return can(me, p) ? null : err("perm", "لا تملك صلاحية لهذا الإجراء."); }
    var x;

    if (a === "logout") { var T2 = R("sys/tokens", {}) || {}; delete T2[req.token]; W("sys/tokens", T2); audit(me, "تسجيل خروج", ""); return { ok: true }; }
    if (a === "me") return { ok: true, user: pub(me), rev: R("sys/rev", 0), settings: S, permNames: PERM_NAMES };

    if (a === "profile") {
      if ((x = need("profile"))) return x;
      var L1 = users(), m1 = L1.filter(function (y) { return y.id === me.id; })[0];
      if (req.pw) {
        if (m1.hash !== pwHash(m1.salt, String(req.old || ""))) return err("bad", "كلمة المرور الحالية غير صحيحة.");
        if (String(req.pw).length < 8) return err("bad", "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.");
        m1.salt = env.rand(16); m1.hash = pwHash(m1.salt, String(req.pw));
      }
      if (req.name != null) m1.name = clean(req.name, 80) || m1.name;
      if (req.email != null) m1.email = clean(req.email, 120);
      if (req.phone != null) m1.phone = normPhone(req.phone);
      if (req.org != null) m1.org = clean(req.org, 120);
      W("sys/users", L1); audit(me, req.pw ? "تغيير كلمة المرور والبيانات" : "تعديل البيانات الشخصية", ""); bump();
      return { ok: true, user: pub(m1) };
    }

    if (a === "home") {
      var out = { ok: true, mine: summary(me.id), rev: R("sys/rev", 0) };
      if (can(me, "allReports")) {
        var UL = users(), tot = { users: UL.length, clients: 0, admins: 0, active: 0, scans: 0, alerts: 0, broken: 0 }, rows = [];
        UL.forEach(function (u2) {
          if (u2.role === "client") tot.clients++; else tot.admins++;
          if (u2.active !== false) tot.active++;
          var s2 = summary(u2.id); tot.scans += s2.scans; if (s2.last && s2.last.state === "alert") tot.alerts++; if (!s2.chain.ok) tot.broken++;
          rows.push({ id: u2.id, user: u2.user, name: u2.name, role: u2.role, roleName: ROLES[u2.role], active: u2.active !== false, last: u2.last || "", sum: s2 });
        });
        out.all = { totals: tot, rows: rows, recent: (R("sys/audit", []) || []).slice(0, 8) };
      }
      return out;
    }

    if (a === "scan") {
      if ((x = need("scan"))) return x;
      var files = (req.files || []).slice(0, 200).map(function (f) {
        return {
          name: clean(f.name, 180), size: Math.max(0, +f.size || 0), sha: /^[0-9a-f]{64}$/.test(f.sha) ? f.sha : "", kind: f.kind === "text" ? "text" : "binary",
          findings: (f.findings || []).slice(0, 30).map(function (g) { return { type: clean(g.type, 60), sev: SEV[g.sev] ? g.sev : "low", count: Math.max(1, Math.min(9999, +g.count || 1)), sample: clean(g.sample, 60) }; })
        };
      }).filter(function (f) { return f.name && f.sha; });
      if (!files.length) return err("bad", "لم تُرسل ملفات صالحة للفحص.");
      var W1 = ws(me.id);
      files.forEach(function (f) { var o = W1.files[f.name]; f.status = !o ? "new" : o.sha === f.sha ? "same" : "changed"; W1.files[f.name] = { sha: f.sha, size: f.size, at: env.now() }; });
      var prev = W1.scans[0] ? W1.scans[0].seal : "", n = W1.scans.length ? W1.scans[0].n + 1 : 1, sc = scoreOf(files);
      var rep = { n: n, at: env.now(), uid: me.id, files: files, score: sc };
      rep.seal = sha256(prev + JSON.stringify(rep)); rep.prev = prev;
      rep.state = files.some(function (f) { return f.findings.some(function (g) { return g.sev === "high"; }); }) || sc < S.alertBelow ? "alert" : sc < S.warnBelow ? "warn" : "ok";
      W1.scans.unshift(rep); W1.scans = W1.scans.slice(0, 500); W("ws/" + me.id, W1);
      audit(me, "فحص وختم تقرير", "رقم " + n + " · " + files.length + " ملف · المؤشر " + sc); bump();
      return { ok: true, report: rep };
    }

    if (a === "reports") {
      var uid = req.uid && req.uid !== me.id ? req.uid : me.id;
      if (uid !== me.id && (x = need("allReports"))) return x;
      if (uid === me.id && (x = need("ownReports"))) return x;
      var W2 = ws(uid), owner = users().filter(function (y) { return y.id === uid; })[0];
      return { ok: true, uid: uid, owner: owner ? pub(owner) : null, scans: W2.scans, files: W2.files, chain: verify(W2.scans) };
    }

    if (a === "users") { if ((x = need("users"))) return x; return { ok: true, users: users().map(pub), roles: ROLES, perms: PERMS, permNames: PERM_NAMES }; }

    if (a === "saveUser") {
      if ((x = need("users"))) return x;
      var L2 = users(), id = req.id, un = clean(req.user, 40).toLowerCase(), role = ROLES[req.role] ? req.role : "client", t;
      if (!/^[a-z0-9._-]{3,40}$/.test(un)) return err("bad", "اسم المستخدم من 3 إلى 40 حرفاً إنجليزياً أو أرقاماً أو . _ -");
      if (L2.some(function (y) { return y.user.toLowerCase() === un && y.id !== id; })) return err("bad", "اسم المستخدم مستخدم من قبل.");
      if (id) {
        t = L2.filter(function (y) { return y.id === id; })[0]; if (!t) return err("bad", "الحساب غير موجود.");
        if (t.id === me.id && (role !== "admin" || req.active === false)) return err("main", "لا يمكنك سحب صلاحياتك أو إيقاف حسابك بنفسك.");
      } else {
        if (!req.pw || String(req.pw).length < 8) return err("bad", "كلمة المرور الأولى يجب أن تكون 8 أحرف على الأقل.");
        var seq = (R("sys/seq", L2.length) || 0) + 1; W("sys/seq", seq);
        t = { id: "u" + seq, created: env.now(), last: "" }; L2.push(t);
      }
      t.user = un; t.name = clean(req.name, 80) || un; t.role = role; t.email = clean(req.email, 120); t.phone = normPhone(req.phone); t.org = clean(req.org, 120); t.active = req.active !== false;
      if (req.pw) { if (String(req.pw).length < 8) return err("bad", "كلمة المرور يجب أن تكون 8 أحرف على الأقل."); t.salt = env.rand(16); t.hash = pwHash(t.salt, String(req.pw)); }
      if (!L2.some(function (y) { return y.role === "admin" && y.active !== false; })) return err("main", "يجب أن يبقى مدير شامل واحد نشط على الأقل.");
      W("sys/users", L2);
      if (t.active === false) { var T3 = R("sys/tokens", {}) || {}; Object.keys(T3).forEach(function (k) { if (T3[k].uid === t.id) delete T3[k]; }); W("sys/tokens", T3); }
      audit(me, id ? "تعديل حساب" : "إنشاء حساب", t.user + " (" + ROLES[t.role] + ")" + (req.pw && id ? " مع تعيين كلمة مرور" : "")); bump();
      return { ok: true, users: L2.map(pub) };
    }

    if (a === "delUser") {
      if ((x = need("users"))) return x;
      var L3 = users(), d = L3.filter(function (y) { return y.id === req.id; })[0];
      if (!d) return err("bad", "الحساب غير موجود.");
      if (d.id === me.id) return err("main", "لا يمكنك حذف حسابك وأنت داخل به.");
      var rest = L3.filter(function (y) { return y.id !== d.id; });
      if (!rest.some(function (y) { return y.role === "admin" && y.active !== false; })) return err("main", "يجب أن يبقى مدير شامل واحد نشط على الأقل.");
      W("sys/users", rest); kv.del("ws/" + d.id);
      var T4 = R("sys/tokens", {}) || {}; Object.keys(T4).forEach(function (k) { if (T4[k].uid === d.id) delete T4[k]; }); W("sys/tokens", T4);
      audit(me, "حذف حساب", d.user); bump();
      return { ok: true, users: rest.map(pub) };
    }

    if (a === "audit") { if ((x = need("audit"))) return x; return { ok: true, items: R("sys/audit", []) || [] }; }

    if (a === "settings") {
      if ((x = need("settings"))) return x;
      if (req.save) {
        var s = {}; Object.keys(DEF_SETTINGS).forEach(function (k) { var v = +req.save[k]; s[k] = isFinite(v) && v > 0 ? Math.min(v, k === "sessionHours" ? 720 : 100000) : DEF_SETTINGS[k]; });
        if (s.alertBelow >= s.warnBelow) return err("bad", "حد التنبيه يجب أن يكون أقل من حد التحذير.");
        W("sys/settings", s); audit(me, "تعديل الإعدادات", JSON.stringify(s)); bump(); return { ok: true, settings: s };
      }
      return { ok: true, settings: S };
    }

    if (a === "backup") {
      if ((x = need("backup"))) return x;
      var data = {}; kv.list("").forEach(function (k) { if (k !== "sys/tokens" && k !== "sys/fails") data[k] = R(k, null); });
      audit(me, "تنزيل نسخة احتياطية", Object.keys(data).length + " مفتاح");
      return { ok: true, backup: { app: "saif", v: 1, at: env.now(), data: data } };
    }

    if (a === "restore") {
      if ((x = need("backup"))) return x;
      var B = req.backup;
      if (!B || B.app !== "saif" || !B.data || !Array.isArray(B.data["sys/users"])) return err("bad", "الملف ليس نسخة احتياطية صالحة من سَيْف.");
      if (!B.data["sys/users"].some(function (y) { return y.role === "admin" && y.active !== false && y.hash && y.salt; })) return err("bad", "النسخة لا تحتوي على مدير شامل نشط.");
      kv.list("").forEach(function (k) { if (k !== "sys/tokens") kv.del(k); });
      Object.keys(B.data).forEach(function (k) { if (/^(sys|ws)\//.test(k) && k !== "sys/tokens") W(k, B.data[k]); });
      audit(me, "استعادة نسخة احتياطية", B.at || ""); bump();
      return { ok: true };
    }

    if (a === "selftest") {
      if ((x = need("health"))) return x;
      var c = [], t0 = Date.now();
      function chk(key, title, okv, detail) { c.push({ key: key, title: title, status: okv === true ? "ok" : okv === "warn" ? "warn" : "alert", detail: detail }); }
      chk("hash", "محرك البصمات SHA-256", sha256("abc") === "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", "مطابق لقيمة الاختبار القياسية");
      var probe = "sys/probe"; W(probe, { at: env.now() }); var rb = R(probe, null); kv.del(probe);
      chk("store", env.server ? "قاعدة البيانات المشتركة" : "التخزين على هذا الجهاز", !!rb, rb ? "قراءة وكتابة وحذف ناجحة" : "تعذّرت الكتابة في التخزين");
      var UL2 = users(), act = UL2.filter(function (u3) { return u3.active !== false; });
      chk("admins", "وجود مدير شامل نشط", act.some(function (u3) { return u3.role === "admin"; }), act.filter(function (u3) { return u3.role === "admin"; }).length + " مدير نشط");
      chk("clients", "حسابات العملاء", UL2.some(function (u3) { return u3.role === "client"; }) ? true : "warn", UL2.filter(function (u3) { return u3.role === "client"; }).length + " حساب عميل");
      var brk = UL2.filter(function (u3) { return !verify(ws(u3.id).scans).ok; });
      chk("chains", "سلامة سلاسل الأختام", brk.length === 0, brk.length ? "سلسلة مكسورة لدى: " + brk.map(function (u3) { return u3.user; }).join("، ") : "كل السلاسل سليمة (" + UL2.length + " حساب)");
      var F2 = R("sys/fails", {}) || {}, locked = Object.keys(F2).filter(function (k) { return F2[k].until > Date.now(); });
      chk("locks", "محاولات الدخول المرفوضة", locked.length ? "warn" : true, locked.length ? "حسابات موقوفة مؤقتاً: " + locked.join("، ") : "لا توجد حسابات موقوفة مؤقتاً");
      var T5 = R("sys/tokens", {}) || {}, live = Object.keys(T5).filter(function (k) { return T5[k].exp > Date.now(); }).length;
      chk("sessions", "الجلسات النشطة", true, live + " جلسة");
      chk("perms", "مصفوفة الصلاحيات", !can({ role: "client" }, "users") && can({ role: "admin" }, "users") && !can({ role: "admin", active: false }, "scan"), "العميل محجوب عن الإدارة، والمدير يملك كل الصلاحيات");
      return { ok: true, checks: c, ms: Date.now() - t0, at: env.now(), server: !!env.server };
    }

    return err("bad", "طلب غير معروف.");
  }

  return { handle: handle, sha256: sha256, pwHash: pwHash, ROLES: ROLES, PERMS: PERMS, PERM_NAMES: PERM_NAMES, SEV: SEV, can: can, normPhone: normPhone };
})();
if (typeof module !== "undefined") module.exports = SAIF_CORE;
