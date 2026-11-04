/* براق · عملة العرض التلقائية
   - كل الأسعار في الموقع محسوبة بالدولار (أو بالجنيه في دراسة مدد)، وتُعرض بعملة الزائر:
     قطر → ريال قطري، مصر → جنيه مصري، أي دولة أخرى → ريال قطري (الافتراضي).
   - الدولة: من عنوان IP عبر خدمة مجانية بلا مفتاح، وقبلها تخمين فوري من المنطقة الزمنية ولغة المتصفح.
   - سعر الصرف: open.er-api.com ثم currency-api (jsDelivr)، ويُحفظ 6 ساعات، واحتياطي ثابت إن تعذّر الاتصال.
   - مفتاح يدوي في الرأس لتغيير العملة، ويُحفظ اختيار الزائر.
   - لا يعتمد على أي خدمة خاصة: يعمل بالكامل على المتصفح. */
(function () {
  "use strict";
  if (window.BQCUR) return;

  // احتياطي ثابت (دولار = …): الريال مربوط رسمياً 3.64، والجنيه وفق آخر سعر موثّق
  var FALLBACK = { USD: 1, QAR: 3.64, EGP: 55.8 }, FALLBACK_DATE = "29/10/2026";
  var CUR = {
    QAR: { sym: "ر.ق", name: "ريال قطري", flag: "QA" },
    EGP: { sym: "ج.م", name: "جنيه مصري", flag: "EG" },
    USD: { sym: "$", name: "دولار أمريكي", flag: "US" }
  };
  var RATE_TTL = 6 * 3600e3, CC_TTL = 24 * 3600e3;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function jget(k) { try { return JSON.parse(lsGet(k) || "null"); } catch (e) { return null; } }
  function p2(n) { return (n < 10 ? "0" : "") + n; }
  function dmy(d) { return p2(d.getDate()) + "/" + p2(d.getMonth() + 1) + "/" + d.getFullYear(); }

  var rates = { USD: 1, QAR: FALLBACK.QAR, EGP: FALLBACK.EGP };
  var fx = { src: "احتياطي ثابت", date: FALLBACK_DATE, live: false };
  var cached = jget("bq.fx");
  if (cached && cached.r && cached.r.QAR && cached.r.EGP) {
    rates = { USD: 1, QAR: +cached.r.QAR, EGP: +cached.r.EGP };
    fx = { src: cached.src, date: cached.date, live: true };
  }

  // ---------- الدولة والعملة ----------
  function ccToCur(cc) { cc = String(cc || "").toUpperCase(); return cc === "EG" ? "EGP" : "QAR"; }
  function guessCountry() {
    var tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
    if (tz === "Africa/Cairo") return "EG";
    if (tz === "Asia/Qatar") return "QA";
    var langs = (navigator.languages || [navigator.language || ""]).join(",");
    if (/-EG\b/i.test(langs)) return "EG";
    return "QA";
  }
  var manual = lsGet("bq.cur");
  if (manual && !CUR[manual]) manual = null;
  var ccCache = jget("bq.cc");
  var country = ccCache && Date.now() - ccCache.t < CC_TTL ? ccCache.cc : guessCountry();
  var cur = manual || ccToCur(country);

  // ---------- التنسيق الموحد ----------
  function numStr(v) {
    var small = Math.abs(v) < 100 && Math.round(v) !== v;
    return v.toLocaleString("en-US", small ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 0 });
  }
  function conv(usd, c) { return usd * rates[c || cur]; }
  function format(usd, usd2, c) {
    c = c || cur;
    var a = numStr(conv(usd, c)), b = usd2 != null ? numStr(conv(usd2, c)) : null;
    var n = b ? "\u2066" + a + "–" + b + "\u2069" : a; // عزل النطاق ليُقرأ من الأصغر للأكبر
    return c === "USD" ? "$" + (b ? a + "–$" + b : a) : n + " " + CUR[c].sym;
  }
  function toUSD(amount, c) { return amount / (rates[c] || 1); }

  // ---------- تحويل نصوص الصفحة ----------
  var N = "(\\d[\\d,]*(?:\\.\\d+)?)";
  var RX = [
    // $1,500 · ≈ $800–1,800 · $24.90
    { re: new RegExp("\\$\\s?" + N + "(?:\\s?[–-]\\s?\\$?" + N + ")?", "g"), c: "USD", a: 1, b: 2 },
    // 11,000 جنيه · 1,389 ج · 5,000 ج.م · 1,200–3,000 ج
    { re: new RegExp(N + "(?:\\s?[–-]\\s?" + N + ")?\\s?(?:ج\\.م|جنيه|ج)(?![\\u0621-\\u064A])", "g"), c: "EGP", a: 1, b: 2 },
    // 5,000 QAR / EGP / USD / ر.ق (من بيانات الطلبات)
    { re: new RegExp(N + "\\s?(QAR|EGP|USD|ر\\.ق)(?![A-Za-z])", "g"), c: null, a: 1, cg: 2 }
  ];
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, NOSCRIPT: 1, CODE: 1, PRE: 1 };
  var PRE = /[$جQEUر]/;
  var num = function (s) { return parseFloat(String(s).replace(/,/g, "")); };

  function skipNode(t) {
    var p = t.parentNode;
    if (!p || p.nodeType !== 1) return true;
    if (SKIP[p.nodeName] || p.closest(".bqm,[data-nocur],#bqCurWrap,svg")) return true;
    return false;
  }
  function processText(t) {
    var s = t.nodeValue;
    if (!s || !PRE.test(s) || skipNode(t)) return;
    var hits = [];
    RX.forEach(function (r) {
      r.re.lastIndex = 0; var m;
      while ((m = r.re.exec(s))) {
        var c = r.c || (m[r.cg] === "ر.ق" ? "QAR" : m[r.cg]);
        var a = num(m[r.a]); if (!isFinite(a)) continue;
        var b = r.b && m[r.b] ? num(m[r.b]) : null;
        hits.push({ i: m.index, j: m.index + m[0].length, u: toUSD(a, c), u2: b != null ? toUSD(b, c) : null });
      }
    });
    if (!hits.length) return;
    hits.sort(function (x, y) { return x.i - y.i; });
    var frag = document.createDocumentFragment(), pos = 0;
    hits.forEach(function (h) {
      if (h.i < pos) return;
      if (h.i > pos) frag.appendChild(document.createTextNode(s.slice(pos, h.i)));
      var sp = document.createElement("span");
      sp.className = "bqm"; sp.dataset.u = h.u; if (h.u2 != null) sp.dataset.u2 = h.u2;
      sp.title = "السعر الأصلي: " + s.slice(h.i, h.j).trim();
      render(sp); frag.appendChild(sp); pos = h.j;
    });
    if (pos < s.length) frag.appendChild(document.createTextNode(s.slice(pos)));
    t.parentNode.replaceChild(frag, t);
  }
  function render(sp) {
    var u = +sp.dataset.u, u2 = sp.dataset.u2 != null ? +sp.dataset.u2 : null;
    var txt = format(u, u2);
    if (sp.textContent !== txt) sp.textContent = txt;
    sp.dir = cur === "USD" ? "ltr" : "rtl";
  }
  function scan(root) {
    if (!root) return;
    if (root.nodeType === 3) return processText(root);
    if (root.nodeType !== 1 || SKIP[root.nodeName]) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = [], n;
    while ((n = w.nextNode())) if (PRE.test(n.nodeValue)) list.push(n);
    list.forEach(processText);
  }
  function renderAll() {
    document.querySelectorAll(".bqm").forEach(render);
    document.querySelectorAll("[data-cur-name]").forEach(function (e) { e.textContent = CUR[cur].name; });
    document.querySelectorAll("[data-cur-sym]").forEach(function (e) { e.textContent = CUR[cur].sym; });
    document.querySelectorAll("[data-usd-hint]").forEach(hint);
    updateUI();
    try { document.dispatchEvent(new CustomEvent("bq:currency", { detail: { cur: cur, rates: rates } })); } catch (e) {}
  }
  // تلميح أسفل حقول الإدخال بالدولار: ≈ 5,460 ر.ق · 83,700 ج.م
  function hint(el) {
    var inp = document.getElementById(el.dataset.usdHint); if (!inp) return;
    var v = parseFloat(inp.value);
    var t = isFinite(v) && v > 0 ? "≈ " + format(v, null, "QAR") + " · " + format(v, null, "EGP") : "";
    if (el.textContent !== t) el.textContent = t; // الكتابة عند التغيّر فقط: تمنع حلقة لا نهائية مع MutationObserver (كانت تجمّد لوحة الإدارة عند كتابة السعر)
    if (!inp._bqh) { inp._bqh = 1; inp.addEventListener("input", function () { hint(el); }); }
  }

  // ---------- مفتاح العملة ----------
  var css = "#bqCurWrap{position:relative;order:3;flex-shrink:0;font-family:inherit;margin-inline-end:-10px}" +
    "#bqCurBtn{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:.86rem;font-weight:600;color:var(--ink,#1b1f24);background:transparent;border:1.5px solid var(--line,#cfd5dc);border-radius:999px;padding:5px 12px;cursor:pointer;white-space:nowrap;line-height:1.4}" +
    "#bqCurBtn:hover,#bqCurBtn[aria-expanded=true]{border-color:var(--copper,#b8642e);color:var(--copper,#b8642e)}" +
    "#bqCurBtn svg{width:10px;height:10px}" +
    "#bqCurMenu{position:absolute;top:calc(100% + 8px);inset-inline-end:0;z-index:60;width:min(300px,calc(100vw - 32px));background:var(--surface,#fff);color:var(--ink,#1b1f24);border:1px solid var(--line,#d8dde3);border-radius:14px;box-shadow:0 14px 36px rgba(0,0,0,.18);padding:8px;text-align:right}" +
    "#bqCurMenu[hidden]{display:none}" +
    "#bqCurMenu button{display:flex;width:100%;align-items:center;justify-content:space-between;gap:10px;font:inherit;font-size:.92rem;background:none;border:0;border-radius:10px;padding:10px 12px;cursor:pointer;color:inherit;text-align:right}" +
    "#bqCurMenu button:hover{background:var(--bg,#f3f4f6)}" +
    "#bqCurMenu button[aria-checked=true]{background:var(--copper-soft,#f6e8de);color:var(--copper,#b8642e);font-weight:700}" +
    "#bqCurMenu button b{font-size:.82rem;opacity:.75;direction:ltr}" +
    "#bqCurMenu .bqc-note{font-size:.76rem;line-height:1.7;color:var(--muted,#5f6b77);border-top:1px solid var(--line,#e3e6ea);margin-top:6px;padding:8px 6px 2px}" +
    "#bqCurMenu .bqc-note bdi{unicode-bidi:isolate;white-space:nowrap}" +
    ".bqm{unicode-bidi:isolate;white-space:nowrap}" +
    "@media (max-width:420px){#bqCurBtn{padding:4px 10px;font-size:.8rem}}" +
    "#bqCurWrap.bqc-float{position:fixed;inset-inline-end:16px;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:40}" +
    "#bqCurWrap.bqc-float #bqCurBtn{background:var(--surface,#fff);box-shadow:0 6px 18px rgba(0,0,0,.18)}" +
    "#bqCurWrap.bqc-float #bqCurMenu{top:auto;bottom:calc(100% + 8px)}";
  var btn, menu;
  function buildUI() {
    if (document.getElementById("bqCurWrap")) return;
    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    var wrap = document.createElement("div"); wrap.id = "bqCurWrap";
    wrap.innerHTML = '<button type="button" id="bqCurBtn" aria-haspopup="true" aria-expanded="false" aria-label="عملة عرض الأسعار"><span id="bqCurLbl"></span><svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>' +
      '<div id="bqCurMenu" role="menu" hidden>' +
      ["QAR", "EGP", "USD"].map(function (c) { return '<button type="button" role="menuitemradio" data-c="' + c + '" aria-checked="false"><span>' + CUR[c].name + '</span><b>' + (c === "USD" ? "USD $" : c + " · " + CUR[c].sym) + "</b></button>"; }).join("") +
      '<div class="bqc-note" id="bqCurNote"></div></div>';
    var host = document.querySelector("header.top .wrap");
    var anchor = host && (document.getElementById("navAcct") || host.querySelector(".acct-pill,.nm,#logout"));
    if (host && anchor && anchor.parentNode === host) host.insertBefore(wrap, anchor);
    else if (host) host.appendChild(wrap);
    else { wrap.className = "bqc-float"; document.body.appendChild(wrap); }
    btn = wrap.querySelector("#bqCurBtn"); menu = wrap.querySelector("#bqCurMenu");
    btn.addEventListener("click", function (e) { e.stopPropagation(); toggle(menu.hidden); });
    menu.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-c]"); if (!b) return;
      setCurrency(b.dataset.c, true); toggle(false); btn.focus();
    });
    document.addEventListener("click", function (e) { if (!wrap.contains(e.target)) toggle(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") toggle(false); });
    updateUI();
  }
  function toggle(open) { if (!menu) return; menu.hidden = !open; btn.setAttribute("aria-expanded", open ? "true" : "false"); }
  function updateUI() {
    if (!btn) return;
    document.getElementById("bqCurLbl").textContent = CUR[cur].sym === "$" ? "USD $" : CUR[cur].sym;
    btn.title = "الأسعار معروضة بال" + CUR[cur].name + " · اضغط للتغيير";
    menu.querySelectorAll("button[data-c]").forEach(function (b) { b.setAttribute("aria-checked", b.dataset.c === cur ? "true" : "false"); });
    var auto = manual ? "اختيارك اليدوي" : "تلقائياً حسب دولتك" + (country === "EG" ? " (مصر)" : country === "QA" ? " (قطر)" : "");
    document.getElementById("bqCurNote").innerHTML =
      "العملة: " + auto + "<br>" +
      "الدولار الأمريكي = <bdi>" + rates.QAR.toFixed(2) + " ر.ق</bdi> · <bdi>" + rates.EGP.toFixed(2) + " ج.م</bdi><br>" +
      (fx.live ? "محدَّث تلقائياً في " + fx.date + " · " + fx.src : "سعر احتياطي (" + fx.date + ") لتعذّر الاتصال بمصدر الصرف") +
      (manual ? '<br><a href="#" id="bqCurAuto" style="color:var(--copper,#b8642e)">العودة إلى الاختيار التلقائي</a>' : "");
    var a = document.getElementById("bqCurAuto");
    if (a) a.onclick = function (e) { e.preventDefault(); manual = null; try { localStorage.removeItem("bq.cur"); } catch (x) {} setCurrency(ccToCur(country), false); toggle(false); };
  }
  function setCurrency(c, isManual) {
    if (!CUR[c]) return;
    if (isManual) { manual = c; lsSet("bq.cur", c); }
    cur = c; renderAll();
  }

  // ---------- مصادر البيانات (مجانية بلا مفتاح) ----------
  function getJSON(url, ms) {
    var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, ms || 6000);
    return fetch(url, { signal: ctl ? ctl.signal : undefined, cache: "no-store" })
      .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function okRate(q, e) { return q > 3 && q < 4.5 && e > 10 && e < 500; }
  function loadRates() {
    if (cached && Date.now() - cached.t < RATE_TTL) return;
    var today = dmy(new Date());
    getJSON("https://open.er-api.com/v6/latest/USD").then(function (d) {
      if (d.result !== "success" || !okRate(d.rates.QAR, d.rates.EGP)) throw 0;
      return { QAR: d.rates.QAR, EGP: d.rates.EGP, src: "ExchangeRate-API", date: d.time_last_update_unix ? dmy(new Date(d.time_last_update_unix * 1000)) : today };
    }).catch(function () {
      return getJSON("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json").then(function (d) {
        if (!okRate(d.usd.qar, d.usd.egp)) throw 0;
        return { QAR: d.usd.qar, EGP: d.usd.egp, src: "Currency-API", date: d.date ? d.date.split("-").reverse().join("/") : today };
      });
    }).then(function (r) {
      rates = { USD: 1, QAR: +r.QAR, EGP: +r.EGP }; fx = { src: r.src, date: r.date, live: true };
      lsSet("bq.fx", JSON.stringify({ r: { QAR: r.QAR, EGP: r.EGP }, src: r.src, date: r.date, t: Date.now() }));
      renderAll();
    }).catch(function () { /* يبقى السعر الاحتياطي أو آخر سعر محفوظ */ });
  }
  function loadCountry() {
    if (ccCache && Date.now() - ccCache.t < CC_TTL) return;
    getJSON("https://api.country.is/", 5000).then(function (d) { return d.country; })
      .catch(function () { return getJSON("https://ipapi.co/json/", 5000).then(function (d) { return d.country_code || d.country; }); })
      .then(function (cc) {
        if (!/^[A-Z]{2}$/i.test(cc || "")) return;
        country = cc.toUpperCase(); lsSet("bq.cc", JSON.stringify({ cc: country, t: Date.now() }));
        if (!manual && ccToCur(country) !== cur) setCurrency(ccToCur(country), false); else updateUI();
      }).catch(function () {});
  }

  // ---------- التشغيل ----------
  var busy = false;
  function start() {
    buildUI();
    busy = true; scan(document.body); busy = false;
    renderAll();
    new MutationObserver(function (muts) {
      if (busy) return; busy = true;
      muts.forEach(function (m) {
        if (m.type === "characterData") { processText(m.target); return; }
        m.addedNodes.forEach(function (n) { if (n.isConnected) scan(n); });
      });
      document.querySelectorAll("[data-usd-hint]").forEach(hint);
      busy = false;
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
    loadRates(); loadCountry();
  }

  window.BQCUR = {
    get cur() { return cur; }, get rates() { return rates; }, get country() { return country; },
    format: format, toUSD: toUSD, set: function (c) { setCurrency(c, true); }, scan: scan
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
