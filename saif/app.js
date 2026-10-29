/* واجهة سَيْف: طبقة الاتصال، المتابعة الحية، الصفحات حسب الدور */
(function () {
"use strict";
const C = window.SAIF_CORE, CFG = window.SAIF_CONFIG || {};
const API = String(CFG.API || "").trim(), LOCAL = !API;
const CONTACT = { phone: "+974 5160 0498", wa: "97451600498", email: "munijizqa@gmail.com", site: "https://munjiz-qa.github.io/" };
const HEALTH_BADGE = "https://github.com/munjiz-qa/munjiz-qa.github.io/actions/workflows/saif-health.yml/badge.svg";
const HEALTH_URL = "https://github.com/munjiz-qa/munjiz-qa.github.io/actions/workflows/saif-health.yml";

/* ---------- التخزين وطبقة الاتصال ---------- */
const ls = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { } }
};
const PFX = "saif:", mem = {};
function rand(n) { const al = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789", a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a, x => al[x % al.length]).join(""); }
const env = {
  kv: {
    get(k) { const v = ls.get(PFX + k); return v == null ? (k in mem ? mem[k] : null) : v; },
    set(k, v) { if (ls.set(PFX + k, v)) delete mem[k]; else mem[k] = v; },
    del(k) { ls.del(PFX + k); delete mem[k]; },
    list(p) { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf(PFX + p) === 0) out.push(k.slice(PFX.length)); } } catch (e) { } Object.keys(mem).forEach(k => { if (k.indexOf(p) === 0 && out.indexOf(k) < 0) out.push(k); }); return out; }
  },
  now: () => new Date().toISOString(), rand, seed: CFG.SEED || [], server: false
};
let bc = null; try { bc = new BroadcastChannel("saif"); } catch (e) { }
const MUTATE = ["login", "logout", "profile", "scan", "saveUser", "delUser", "settings", "restore"];
async function call(action, body) {
  const req = Object.assign({ action, token: ls.get("saif-token") || "" }, body || {});
  let r;
  if (LOCAL) r = C.handle(JSON.parse(JSON.stringify(req)), env);
  else {
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 20000);
    try { const res = await fetch(API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(req), redirect: "follow", signal: ctl.signal }); r = await res.json(); }
    catch (e) { r = { ok: false, code: "net", error: "تعذّر الوصول إلى خادم البيانات. تحقق من الاتصال ثم أعد المحاولة." }; }
    finally { clearTimeout(to); }
  }
  if (r && r.ok && MUTATE.indexOf(action) >= 0 && bc) try { bc.postMessage({ rev: Date.now() }); } catch (e) { }
  if (!r || !r.ok) {
    const e = new Error((r && r.error) || "تعذّر تنفيذ الطلب."); e.code = r && r.code;
    if (e.code === "auth" && action !== "login") { const had = !!S.user; ls.del("saif-token"); S.user = null; if (had && action !== "logout" && action !== "me") setTimeout(route, 0); }
    throw e;
  }
  return r;
}

/* ---------- أدوات عامة ---------- */
const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const p2 = n => String(n).padStart(2, "0");
function fmt(iso, sec) { if (!iso) return "—"; const d = new Date(iso); if (isNaN(d)) return "—"; return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()) + " " + p2(d.getHours()) + ":" + p2(d.getMinutes()) + (sec ? ":" + p2(d.getSeconds()) : ""); }
function size(b) { if (b == null) return "—"; if (b < 1024) return b + " بايت"; if (b < 1048576) return (b / 1024).toFixed(1) + " ك.ب"; if (b < 1073741824) return (b / 1048576).toFixed(1) + " م.ب"; return (b / 1073741824).toFixed(2) + " ج.ب"; }
const STATE = { ok: "سليم", warn: "يحتاج انتباهاً", alert: "تنبيه", na: "غير متاح" };
const pill = (st, t) => `<span class="pill ${st}">${esc(t || STATE[st])}</span>`;
const FST = { new: "جديد", same: "بلا تغيير", changed: "تغيّر" };
let toastT;
function toast(m) { let t = $(".toast"); if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); } t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3500); }
function scoreColor(s, st) { return st ? `var(--${st === "na" ? "mute" : st})` : s >= 90 ? "var(--ok)" : s >= 60 ? "var(--warn)" : "var(--alert)"; }
function ring(score, st) {
  const r = 52, c = 2 * Math.PI * r, v = score == null ? 0 : score;
  return `<svg class="ring" viewBox="0 0 120 120" role="img" aria-label="مؤشر السرية ${v}"><circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--line)" stroke-width="11"/><circle cx="60" cy="60" r="${r}" fill="none" stroke="${scoreColor(v, st)}" stroke-width="11" stroke-linecap="round" stroke-dasharray="${c * v / 100} ${c}" transform="rotate(-90 60 60)"/><text x="60" y="58" text-anchor="middle" font-size="30" font-weight="700" fill="var(--ink)">${score == null ? "—" : v}</text><text x="60" y="80" text-anchor="middle" font-size="12" fill="var(--mute)">من 100</text></svg>`;
}
const LOGO = (s = 38) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 3l17 7v12c0 11-7.3 19.6-17 23-9.7-3.4-17-12-17-23V10z" fill="none" stroke="var(--brand)" stroke-width="2.6"/><path d="M24 10l11 4.6v7.6c0 7.2-4.6 12.9-11 15.3-6.4-2.4-11-8.1-11-15.3v-7.6z" fill="var(--brand)" opacity=".14"/><circle cx="24" cy="21" r="4.2" fill="none" stroke="var(--gold)" stroke-width="2.6"/><path d="M24 25.2v7" stroke="var(--gold)" stroke-width="2.6" stroke-linecap="round"/></svg>`;
function modal(html) { const m = document.createElement("div"); m.className = "modal"; m.innerHTML = `<div class="card" role="dialog" aria-modal="true">${html}</div>`; m.addEventListener("click", e => { if (e.target === m || e.target.closest("[data-close]")) m.remove(); }); document.body.appendChild(m); const f = m.querySelector("input,select,button"); if (f) f.focus(); return m; }
function busy(btn, on) { if (!btn) return; btn.disabled = on; if (on) { btn.dataset.t = btn.textContent; btn.textContent = "جارٍ التنفيذ…"; } else if (btn.dataset.t) btn.textContent = btn.dataset.t; }
function download(name, text, type) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: type || "application/json" })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
function theme(t) { if (t) { ls.set("saif-theme", t); } t = ls.get("saif-theme"); if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }
theme();

/* ---------- الحالة والتنقل ---------- */
const S = { user: null, rev: null, page: null, lastSync: null, online: navigator.onLine, timers: [], settings: null, permNames: C.PERM_NAMES };
const can = p => C.can(S.user, p);
const NAV = [
  ["home", "اللوحة", null], ["scan", "فحص الملفات", "scan"], ["reports", "التقارير والأختام", "ownReports"], ["device", "جهازي مباشر", "device"],
  ["users", "الحسابات والصلاحيات", "users"], ["health", "صحة المنصة", "health"], ["audit", "سجل التدقيق", "audit"], ["settings", "الإعدادات والنسخ", "settings"], ["account", "حسابي", "profile"]
];
function clearTimers() { S.timers.forEach(t => clearInterval(t)); S.timers = []; }
function every(ms, fn) { S.timers.push(setInterval(fn, ms)); }

async function route() {
  clearTimers();
  const pg = (location.hash.replace(/^#\/?/, "").split("?")[0]) || "home";
  if (!S.user && ls.get("saif-token")) { try { const r = await call("me"); S.user = r.user; S.rev = r.rev; S.settings = r.settings; } catch (e) { S.user = null; } }
  if (!S.user) return pg === "login" ? renderLogin() : renderPublic();
  const item = NAV.find(n => n[0] === pg);
  S.page = item && (!item[2] || can(item[2])) ? pg : "home";
  shell();
  const v = $("#view");
  try { await PAGES[S.page](v); } catch (e) { if (e.code !== "auth") v.innerHTML = `<div class="banner alert">${esc(e.message)}</div>`; }
}
window.addEventListener("hashchange", route);

function shell() {
  const u = S.user;
  $("#app").innerHTML = `<header class="top"><div class="top-in">
      <a class="brand" href="#home">${LOGO()}<span><b>سَيْف</b><small>حارس سرية البيانات · منجز لخدمات الأعمال</small></span></a>
      <span class="live" id="live" title="حالة الاتصال والمزامنة"><i></i><span id="liveT">مباشر</span></span>
      <span class="who"><span class="nm">${esc(u.name)}</span><span class="pill ${u.role === "admin" ? "warn" : "ok"} rl">${esc(u.roleName)}</span></span>
      <button class="sm ghost" id="thm" type="button" aria-label="تبديل المظهر">◐</button>
      <button class="sm" id="out" type="button">خروج</button>
    </div>
    <nav class="tabs" aria-label="أقسام المنصة">${NAV.filter(n => !n[2] || can(n[2])).map(n => `<a href="#${n[0]}" class="${n[0] === S.page ? "on" : ""}">${n[1]}</a>`).join("")}</nav>
  </header><main class="wrap" id="view"><div class="boot">جارٍ التحميل…</div></main>${footer()}`;
  $("#thm").onclick = () => theme(document.documentElement.dataset.theme === "dark" ? "light" : (document.documentElement.dataset.theme === "light" ? "dark" : (matchMedia("(prefers-color-scheme: dark)").matches ? "light" : "dark")));
  $("#out").onclick = logout;
  const on = $("nav.tabs a.on"); if (on && on.scrollIntoView) on.scrollIntoView({ block: "nearest", inline: "center" });
  liveTick();
}
function footer() {
  return `<footer class="wrap" style="padding-top:0"><div>سَيْف من <a href="${CONTACT.site}" target="_blank" rel="noopener">منجز لخدمات الأعمال</a> · ${LOCAL ? "تعمل بالكامل على جهازك دون أي خدمة خارجية" : "متصلة بخادم البيانات المشترك"}</div>
  <div class="contact"><a href="https://wa.me/${CONTACT.wa}" target="_blank" rel="noopener">واتساب <span class="num">${CONTACT.phone}</span></a><a href="tel:${CONTACT.phone.replace(/\s/g, "")}">اتصال</a><a href="mailto:${CONTACT.email}">${CONTACT.email}</a></div></footer>`;
}
async function logout() { try { await call("logout"); } catch (e) { } ls.del("saif-token"); S.user = null; location.hash = "#"; route(); toast("تم تسجيل الخروج من هذا الجهاز."); }

/* ---------- المتابعة الحية: مزامنة البيانات وحالة الاتصال ---------- */
async function liveTick() {
  const el = $("#live"); let ok = true;
  try { const r = await call("alive"); S.lastSync = new Date(); if (S.rev != null && r.rev !== S.rev) { S.rev = r.rev; onRemoteChange(); } S.rev = r.rev; }
  catch (e) { ok = false; }
  if (S.user && Date.now() - (S.meAt || 0) > 15000) { S.meAt = Date.now(); try { const m = await call("me"); S.user = m.user; S.settings = m.settings; } catch (e) { } }
  if (!el) return;
  const net = navigator.onLine; ok = ok && (LOCAL || net);
  el.classList.toggle("off", !ok);
  $("#liveT").textContent = ok ? (LOCAL ? "مباشر" : "متصل") + " · " + fmt(S.lastSync, true).slice(11) : (net ? "تعذّرت المزامنة" : "دون اتصال");
}
setInterval(() => { if (S.user && document.visibilityState === "visible") liveTick(); }, LOCAL ? 3000 : 8000);
function onRemoteChange() { const f = REFRESH[S.page]; if (f && !document.querySelector(".modal")) f(); }
if (bc) bc.onmessage = () => { if (S.user) liveTick(); };
window.addEventListener("storage", e => { if (e.key === "saif-token" && !e.newValue && S.user) { S.user = null; route(); } else if (e.key && e.key.indexOf(PFX) === 0 && S.user) liveTick(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && S.user) liveTick(); });

/* ---------- الزائر ---------- */
function renderPublic() {
  $("#app").innerHTML = `<header class="top"><div class="top-in"><a class="brand" href="#">${LOGO()}<span><b>سَيْف</b><small>حارس سرية البيانات · منجز لخدمات الأعمال</small></span></a>
    <span class="live" id="pubLive"><i></i><span>المنصة تعمل الآن</span></span><a class="btn pri sm" href="#login">تسجيل الدخول</a></div></header>
  <main class="wrap">
    <section class="hero"><div><h1>بياناتك السرية تبقى سرية، وأنت ترى ذلك لحظة بلحظة</h1>
      <p>سَيْف يفحص ملفاتك على جهازك نفسه، فيكشف أرقام الهواتف والهويات والحسابات البنكية وكلمات المرور والمفاتيح المكشوفة، ويختم كل تقرير ببصمة لا تقبل التعديل، ويتابع حالة جهازك واتصاله مباشرة.</p>
      <div class="row"><a class="btn pri" href="#login">الدخول إلى حسابك</a><a class="btn" href="https://wa.me/${CONTACT.wa}" target="_blank" rel="noopener">اطلب حساباً عبر واتساب</a></div></div>
      <div class="card"><div class="verdict">${ring(100, "ok")}<div><b style="font-size:18px">ملفاتك لا تغادر جهازك</b><p class="mute small" style="margin:6px 0 0">يُحفظ من كل ملف اسمه وحجمه وبصمته ونتيجة الفحص مقنّعة فقط، أما المحتوى فيُقرأ داخل المتصفح ثم يُترك.</p></div></div></div>
    </section>
    <section class="grid feat">
      <div class="card"><h3>فحص محلي للمحتوى</h3><p>نصوص وجداول وملفات Word وExcel وPowerPoint، مع إخفاء أي بيانات حساسة عند عرضها.</p></div>
      <div class="card"><h3>أختام متسلسلة</h3><p>كل تقرير مختوم ببصمة SHA-256 مرتبطة بالتقرير السابق، فأي تعديل لاحق يُكشف فوراً.</p></div>
      <div class="card"><h3>متابعة الجهاز مباشرة</h3><p>الاتصال، وسرعة الشبكة، والتخزين، والبطارية، واستجابة الجهاز، وأمان المتصفح، تُحدَّث كل ثانية.</p></div>
      <div class="card"><h3>صلاحيات واضحة</h3><p>العميل يرى ملفاته وتقاريره فقط، والمدير الشامل يدير الحسابات ويطلع على كل الفحوص والسجل.</p></div>
    </section></main>${footer()}`;
}
function renderLogin() {
  $("#app").innerHTML = `<header class="top"><div class="top-in"><a class="brand" href="#">${LOGO()}<span><b>سَيْف</b><small>حارس سرية البيانات · منجز لخدمات الأعمال</small></span></a><a class="btn sm" href="#">الصفحة الرئيسية</a></div></header>
  <main class="wrap"><section class="card login" style="margin-top:28px"><h2>تسجيل الدخول</h2>
    <form id="lf" novalidate><label>اسم المستخدم<input id="lu" autocomplete="username" dir="ltr" autocapitalize="none" spellcheck="false" required></label>
    <label>كلمة المرور<span class="pwrap"><input id="lp" type="password" autocomplete="current-password" dir="ltr" required><button type="button" class="sm" id="pt">إظهار</button></span></label>
    <span class="err" id="le" role="alert"></span><button class="pri" style="width:100%" id="lb">دخول</button></form>
    <p class="note">الحسابات تصدرها إدارة المنصة. لطلب حساب أو استعادة كلمة المرور تواصل مع منجز عبر واتساب <span class="num">${CONTACT.phone}</span>.</p></section></main>${footer()}`;
  $("#pt").onclick = () => { const i = $("#lp"); i.type = i.type === "password" ? "text" : "password"; $("#pt").textContent = i.type === "password" ? "إظهار" : "إخفاء"; };
  $("#lu").focus();
  $("#lf").onsubmit = async e => {
    e.preventDefault(); const b = $("#lb"); $("#le").textContent = "";
    if (!$("#lu").value.trim() || !$("#lp").value) { $("#le").textContent = "اكتب اسم المستخدم وكلمة المرور."; return; }
    busy(b, true);
    try { const r = await call("login", { user: $("#lu").value.trim(), pw: $("#lp").value }); ls.set("saif-token", r.token); S.user = r.user; S.rev = null; location.hash = "#home"; await route(); toast("مرحباً " + r.user.name + "."); }
    catch (err) { $("#le").textContent = err.message; busy(b, false); }
  };
}

/* ---------- مراقبة الجهاز لحظة بلحظة ---------- */
const DV = { lag: [], lat: [], fps: 0, events: [], bat: null, storage: null, ping: null, clock: null, started: Date.now(), swOk: false };
function dvEvent(t, st) { DV.events.unshift({ at: new Date().toISOString(), t, st: st || "ok" }); DV.events = DV.events.slice(0, 40); }
(function monitor() {
  let last = performance.now();
  setInterval(() => { const now = performance.now(), lag = Math.max(0, now - last - 500); last = now; DV.lag.push(lag); if (DV.lag.length > 60) DV.lag.shift(); }, 500);
  let frames = 0, t0 = performance.now();
  (function raf(t) { frames++; if (t - t0 >= 1000) { DV.fps = Math.round(frames * 1000 / (t - t0)); frames = 0; t0 = t; } requestAnimationFrame(raf); })(t0);
  addEventListener("online", () => { S.online = true; dvEvent("عاد الاتصال بالإنترنت"); });
  addEventListener("offline", () => { S.online = false; dvEvent("انقطع الاتصال بالإنترنت", "alert"); });
  document.addEventListener("visibilitychange", () => dvEvent(document.visibilityState === "visible" ? "عادت الصفحة إلى الواجهة" : "انتقلت الصفحة إلى الخلفية", "na"));
  const cn = navigator.connection; if (cn && cn.addEventListener) cn.addEventListener("change", () => dvEvent("تغيّرت الشبكة إلى " + (cn.effectiveType || "—").toUpperCase(), "warn"));
  if (navigator.getBattery) navigator.getBattery().then(b => { DV.bat = b; ["levelchange", "chargingchange"].forEach(ev => b.addEventListener(ev, () => dvEvent("البطارية " + Math.round(b.level * 100) + "%" + (b.charging ? " وتشحن" : ""), b.level < .2 && !b.charging ? "warn" : "ok"))); }).catch(() => { });
  async function slow() {
    if (navigator.storage && navigator.storage.estimate) try { DV.storage = await navigator.storage.estimate(); DV.storage.persisted = navigator.storage.persisted ? await navigator.storage.persisted() : null; } catch (e) { }
    const t = performance.now();
    try { const r = await fetch("config.js?ping=" + Date.now(), { method: "HEAD", cache: "no-store" }); const ms = Math.round(performance.now() - t); DV.ping = { ok: r.ok, ms, at: Date.now() }; DV.lat.push(ms); if (DV.lat.length > 30) DV.lat.shift(); const d = r.headers.get("date"); if (d) DV.clock = Math.round((Date.now() - ms / 2 - new Date(d).getTime()) / 1000); }
    catch (e) { const was = DV.ping && DV.ping.ok; DV.ping = { ok: false, ms: null, at: Date.now() }; if (was) dvEvent("تعذّر الوصول إلى خادم الموقع", "alert"); }
    DV.swOk = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
  }
  slow(); setInterval(() => { if (document.visibilityState === "visible") slow(); }, 10000);
  dvEvent("بدأت المراقبة على هذا الجهاز");
})();
function uaInfo() {
  const ua = navigator.userAgent, d = navigator.userAgentData;
  const os = /iPhone|iPad|iPod/.test(ua) ? "iOS / iPadOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : (d && d.platform) || "غير معروف";
  const br = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Firefox\//.test(ua) ? "Firefox" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "متصفح آخر";
  const mob = d ? d.mobile : /Mobi|Android|iPhone/.test(ua);
  return { os, br, type: mob ? "جوال" : "كمبيوتر أو جهاز لوحي" };
}
function deviceChecks() {
  const out = [], add = (k, t, st, v, d) => out.push({ key: k, title: t, status: st, value: v, detail: d });
  const net = navigator.onLine, cn = navigator.connection;
  add("net", "الاتصال بالإنترنت", net ? "ok" : "alert", net ? "متصل" : "غير متصل", net ? "المتصفح يرى اتصالاً نشطاً" : "المنصة تواصل العمل على الجهاز وتزامن عند عودة الاتصال");
  if (cn) { const et = (cn.effectiveType || "").toUpperCase(); add("conn", "جودة الشبكة", /^(4G)$/.test(et) ? "ok" : et ? "warn" : "na", et || "—", (cn.downlink != null ? "السرعة التقديرية " + cn.downlink + " م.ب/ث" : "") + (cn.rtt != null ? " · زمن الذهاب والعودة " + cn.rtt + " م.ث" : "") + (cn.saveData ? " · وضع توفير البيانات مفعّل" : "")); }
  else add("conn", "جودة الشبكة", "na", "—", "هذا المتصفح لا يتيح قراءة نوع الشبكة");
  const p = DV.ping; add("ping", "الوصول إلى خادم الموقع", !p ? "na" : !p.ok ? "alert" : p.ms < 800 ? "ok" : "warn", p && p.ok ? p.ms + " م.ث" : p ? "متعذّر" : "جارٍ القياس", p ? "آخر قياس " + fmt(new Date(p.at).toISOString(), true).slice(11) + " · يُعاد كل 10 ثوانٍ" : "");
  if (DV.bat) { const b = DV.bat, lv = Math.round(b.level * 100); add("bat", "البطارية", lv < 15 && !b.charging ? "alert" : lv < 30 && !b.charging ? "warn" : "ok", lv + "%", b.charging ? "تشحن الآن" + (isFinite(b.chargingTime) && b.chargingTime ? " · تكتمل خلال " + Math.round(b.chargingTime / 60) + " دقيقة" : "") : "تعمل على البطارية" + (isFinite(b.dischargingTime) ? " · تكفي نحو " + Math.round(b.dischargingTime / 60) + " دقيقة" : "")); }
  else add("bat", "البطارية", "na", "—", "هذا المتصفح لا يتيح قراءة البطارية (مثل Safari وFirefox)");
  const st = DV.storage; if (st && st.quota) { const pc = st.usage / st.quota * 100; add("store", "مساحة التخزين المتاحة للمنصة", pc > 90 ? "alert" : pc > 70 ? "warn" : "ok", size(st.quota - st.usage) + " متاحة", "المستخدم " + size(st.usage) + " من " + size(st.quota) + (st.persisted ? " · التخزين محمي من المسح التلقائي" : "")); }
  else add("store", "مساحة التخزين المتاحة للمنصة", "na", "—", "هذا المتصفح لا يتيح تقدير المساحة");
  let lsOk = false; try { localStorage.setItem("saif-probe", "1"); lsOk = localStorage.getItem("saif-probe") === "1"; localStorage.removeItem("saif-probe"); } catch (e) { }
  add("ls", "حفظ البيانات على الجهاز", lsOk ? "ok" : "alert", lsOk ? "يعمل" : "معطّل", lsOk ? "التخزين المحلي للمتصفح يقرأ ويكتب بنجاح" : "قد يكون التصفح خاصاً أو التخزين محظوراً، فلن تبقى البيانات بعد الإغلاق");
  const lag = DV.lag.length ? Math.round(DV.lag.reduce((a, b) => a + b, 0) / DV.lag.length) : null, mx = DV.lag.length ? Math.round(Math.max.apply(null, DV.lag)) : 0;
  add("cpu", "استجابة الجهاز", lag == null ? "na" : lag < 50 ? "ok" : lag < 200 ? "warn" : "alert", lag == null ? "—" : "تأخير " + lag + " م.ث", (navigator.hardwareConcurrency ? navigator.hardwareConcurrency + " أنوية معالجة · " : "") + "أعلى تأخير في آخر 30 ثانية " + mx + " م.ث");
  add("fps", "سلاسة العرض", document.visibilityState !== "visible" ? "na" : DV.fps >= 45 ? "ok" : DV.fps >= 25 ? "warn" : "alert", document.visibilityState === "visible" ? DV.fps + " إطار/ث" : "في الخلفية", "عدد الإطارات المرسومة في الثانية");
  const pm = performance.memory; add("mem", "الذاكرة", pm ? (pm.usedJSHeapSize / pm.jsHeapSizeLimit > .8 ? "warn" : "ok") : navigator.deviceMemory ? "ok" : "na", navigator.deviceMemory ? "≈ " + navigator.deviceMemory + " ج.ب" : pm ? size(pm.usedJSHeapSize) : "—", pm ? "تستخدم الصفحة " + size(pm.usedJSHeapSize) + " من " + size(pm.jsHeapSizeLimit) : "ذاكرة الجهاز التقديرية");
  const sec = window.isSecureContext && !!(crypto && crypto.subtle);
  add("sec", "أمان المتصفح", sec ? "ok" : "alert", sec ? "اتصال مشفّر" : "غير آمن", sec ? "HTTPS ومحرك التشفير متاحان، وسياسة أمان المحتوى تمنع أي اتصال غير معتمد" : "افتح المنصة عبر https لتعمل البصمات");
  add("sw", "العمل دون اتصال", DV.swOk ? "ok" : "warn", DV.swOk ? "مفعّل" : "غير مفعّل بعد", DV.swOk ? "نسخة من المنصة محفوظة على الجهاز وتفتح حتى دون إنترنت" : "يتفعّل تلقائياً بعد أول زيارة كاملة");
  const ck = DV.clock; add("clock", "دقة ساعة الجهاز", ck == null ? "na" : Math.abs(ck) <= 60 ? "ok" : Math.abs(ck) <= 300 ? "warn" : "alert", ck == null ? "—" : (ck === 0 ? "مطابقة" : (ck > 0 ? "متقدمة " : "متأخرة ") + Math.abs(ck) + " ث"), "مقارنة بساعة خادم الموقع · " + Intl.DateTimeFormat().resolvedOptions().timeZone);
  const u = uaInfo(); add("ua", "الجهاز والمتصفح", "ok", u.type, u.os + " · " + u.br + " · الشاشة " + screen.width + "×" + screen.height + " · كثافة " + (window.devicePixelRatio || 1) + "x · اللغة " + navigator.language);
  const up = Math.round((Date.now() - DV.started) / 1000); add("up", "مدة الجلسة على هذه الصفحة", "ok", (up >= 3600 ? Math.floor(up / 3600) + " س " : "") + Math.floor(up % 3600 / 60) + " د " + (up % 60) + " ث", "الساعة الآن " + fmt(new Date().toISOString(), true).slice(11));
  return out;
}
const chkHtml = c => `<div class="chk"><span class="dot d-${c.status}"></span><div><b>${esc(c.title)}</b>${c.value != null ? `<span class="v">${esc(c.value)}</span>` : ""}<span>${esc(c.detail || "")}</span></div></div>`;
const spark = (arr, mx) => { const m = mx || Math.max(1, ...arr); return `<div class="spark">${arr.map(v => `<i style="height:${Math.max(4, v / m * 100)}%"></i>`).join("")}</div>`; };
function deviceBlock(el) {
  function draw() {
    const cs = deviceChecks(), bad = cs.filter(c => c.status === "alert").length, warn = cs.filter(c => c.status === "warn").length;
    el.innerHTML = `<div class="banner ${bad ? "alert" : warn ? "warn" : "ok"}">${bad ? bad + " بند يحتاج تدخلاً الآن" : warn ? "الجهاز يعمل، مع " + warn + " ملاحظة" : "كل أنظمة الجهاز تعمل بشكل سليم"} · تحديث كل ثانية</div>
      <div class="checks">${cs.map(chkHtml).join("")}</div>
      <div class="grid g2" style="margin-top:14px"><div class="card"><h2>استجابة الجهاز <small>آخر 30 ثانية</small></h2>${spark(DV.lag.slice(-60), 200)}</div>
      <div class="card"><h2>زمن الوصول للموقع <small>آخر ${DV.lat.length} قياس</small></h2>${spark(DV.lat)}</div></div>
      <div class="card" style="margin-top:14px"><h2>سجل أحداث الجهاز المباشر</h2><div class="log">${DV.events.map(e => `<div><span class="dot d-${e.st}" style="margin-top:7px"></span><span class="num mute">${fmt(e.at, true).slice(11)}</span><span>${esc(e.t)}</span></div>`).join("")}</div></div>`;
  }
  draw(); every(1000, () => { if (document.visibilityState === "visible" && !document.querySelector(".modal")) draw(); });
}

/* ---------- تحليل الملفات على الجهاز ---------- */
const TEXT_EXT = /\.(txt|csv|tsv|json|md|html?|xml|js|ts|py|env|ini|cfg|conf|log|sql|ya?ml|rtf|vcf|ics|srt|css|php|java|c|cpp|h|cs|go|rb|sh|ps1|properties|toml|eml)$/i;
const OOXML = /\.(docx|xlsx|pptx)$/i;
function luhn(d) { let s = 0, alt = false; for (let i = d.length - 1; i >= 0; i--) { let n = +d[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } s += n; alt = !alt; } return s % 10 === 0; }
const mask = s => { s = String(s).replace(/\s+/g, " ").trim(); return s.length <= 4 ? "••••" : "•".repeat(Math.min(8, s.length - 2)) + s.slice(-2); };
const RULES = [
  { type: "مفتاح تشفير خاص", sev: "high", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { type: "مفتاح وصول لخدمة سحابية", sev: "high", re: /\b(?:sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36}|AIza[0-9A-Za-z_-]{35}|xox[abprs]-[A-Za-z0-9-]{10,})\b/g },
  { type: "كلمة مرور مكتوبة", sev: "high", re: /(?:password|passwd|pwd|كلمة\s*(?:ال)?مرور|كلمة\s*السر|الرقم\s*السري)\s*[:=：]\s*\S+/gi },
  { type: "رقم بطاقة بنكية", sev: "high", re: /\b(?:\d[ -]?){13,19}\b/g, test: m => { const d = m.replace(/\D/g, ""); return d.length >= 13 && d.length <= 19 && luhn(d) && !/^(\d)\1+$/.test(d); } },
  { type: "رقم حساب بنكي دولي IBAN", sev: "mid", re: /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){3,7}(?: ?[A-Z0-9]{1,4})?\b/g, test: m => m.replace(/\s/g, "").length >= 15 },
  { type: "رقم بطاقة شخصية قطرية", sev: "mid", re: /\b[23]\d{10}\b/g },
  { type: "رقم جواز سفر", sev: "mid", re: /(?:passport|جواز(?:\s*السفر)?)\s*(?:no\.?|رقم)?\s*[:#]?\s*[A-Z0-9]{6,9}\b/gi },
  { type: "رقم هاتف", sev: "low", re: /(?:\+|00)\d{1,3}[\s-]?\d{3,4}[\s-]?\d{3,4}(?:[\s-]?\d{2,4})?\b|\b[3-7]\d{3}[\s-]?\d{4}\b/g },
  { type: "بريد إلكتروني", sev: "low", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g }
];
function scanText(txt) {
  const res = [];
  RULES.forEach(r => { const m = (txt.match(r.re) || []).filter(x => !r.test || r.test(x)); if (m.length) res.push({ type: r.type, sev: r.sev, count: m.length, sample: mask(m[0]) }); });
  return res;
}
async function inflate(u8) { const ds = new DecompressionStream("deflate-raw"); const s = new Blob([u8]).stream().pipeThrough(ds); return new Uint8Array(await new Response(s).arrayBuffer()); }
async function ooxmlText(buf) {
  if (typeof DecompressionStream === "undefined") return null;
  const v = new DataView(buf), u8 = new Uint8Array(buf); let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) return null;
  let p = v.getUint32(eocd + 16, true); const n = v.getUint16(eocd + 10, true), dec = new TextDecoder(); let out = "";
  for (let i = 0; i < n && p + 46 <= buf.byteLength; i++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const meth = v.getUint16(p + 10, true), csz = v.getUint32(p + 20, true), nl = v.getUint16(p + 28, true), el = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), off = v.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nl)); p += 46 + nl + el + cl;
    if (!/^(word\/(document|header\d*|footer\d*|footnotes|comments)|xl\/(sharedStrings|worksheets\/sheet\d+)|ppt\/(slides\/slide\d+|notesSlides\/notesSlide\d+))\.xml$/.test(name)) continue;
    const ds = off + 30 + v.getUint16(off + 26, true) + v.getUint16(off + 28, true), raw = u8.subarray(ds, ds + csz);
    try { const x = meth === 8 ? await inflate(raw) : meth === 0 ? raw : null; if (x) out += " " + dec.decode(x).replace(/<\/(w:p|a:p|row|si)>/g, "\n").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"'); } catch (e) { }
  }
  return out;
}
async function analyze(file) {
  const buf = await file.arrayBuffer();
  const sha = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", buf)), b => b.toString(16).padStart(2, "0")).join("");
  let txt = null;
  if (file.size <= 20 * 1048576) {
    if (OOXML.test(file.name)) txt = await ooxmlText(buf);
    else if (TEXT_EXT.test(file.name) || /^text\//.test(file.type) || file.type === "application/json") txt = new TextDecoder().decode(buf);
  }
  return { name: file.name, size: file.size, sha, kind: txt != null ? "text" : "binary", findings: txt != null ? scanText(txt) : [] };
}
function sampleFile() {
  const t = `عقد خدمات تجريبي (بيانات وهمية لاختبار سَيْف)
اسم العميل: شركة الاختبار
الهاتف: +974 5500 0012
البريد: test.client@example.com
رقم البطاقة الشخصية: 28763400012
IBAN: QA58 DOHB 0000 1234 5678 90AB CDEF G
password = Test-Only-123
`;
  return new File([t], "عقد-اختبار-وهمي.txt", { type: "text/plain" });
}

/* ---------- عرض التقارير ---------- */
const sevPill = s => pill(s === "high" ? "alert" : s === "mid" ? "warn" : "na", C.SEV[s]);
function repDetail(r) {
  return `<div class="scroll"><table><thead><tr><th>الملف</th><th>الحجم</th><th>الحالة</th><th>نتيجة الفحص</th></tr></thead><tbody>${r.files.map(f => `<tr><td>${esc(f.name)}<div class="mono mute">${f.sha.slice(0, 16)}…</div></td><td class="num">${size(f.size)}</td><td>${pill(f.status === "changed" ? "warn" : f.status === "new" ? "na" : "ok", FST[f.status])}</td><td>${f.kind === "binary" ? '<span class="mute small">بصمة فقط (المحتوى غير نصي)</span>' : f.findings.length ? f.findings.map(g => `<div>${sevPill(g.sev)} ${esc(g.type)} × <span class="num">${g.count}</span> <span class="mono mute">${esc(g.sample)}</span></div>`).join("") : pill("ok", "لا بيانات حساسة")}</td></tr>`).join("")}</tbody></table></div>
  <div class="note">الختم: <span class="mono">${r.seal}</span><br>الختم السابق: <span class="mono">${r.prev || "— (أول تقرير)"}</span></div>
  <div class="row noprint" style="margin-top:8px"><button class="sm" data-print="${r.n}" type="button">طباعة أو حفظ PDF</button></div>`;
}
function repRow(r, open) {
  const nf = r.files.reduce((a, f) => a + f.findings.length, 0);
  return `<details class="rep" ${open ? "open" : ""} data-n="${r.n}"><summary><span class="dot d-${r.state}"></span><b class="num">#${r.n}</b><span class="num mute small">${fmt(r.at)}</span><span class="small">${r.files.length} ملف · ${nf ? nf + " نوع بيانات حساسة" : "بلا بيانات حساسة"}</span><span class="sp"></span>${pill(r.state, "المؤشر " + r.score)}</summary><div class="in">${repDetail(r)}</div></details>`;
}
function printReport(r, owner) {
  const p = document.createElement("div"); p.className = "printarea";
  p.innerHTML = `<div class="card"><div class="row">${LOGO(44)}<div><h1 class="pg" style="margin:0">تقرير سرية رقم <span class="num">#${r.n}</span></h1><div class="mute small">${esc(owner || S.user.name)} · <span class="num">${fmt(r.at)}</span> · ${pill(r.state, "المؤشر " + r.score)}</div></div></div><div style="margin-top:12px">${repDetail(r)}</div><p class="note">صادر من منصة سَيْف · منجز لخدمات الأعمال · <span class="num">${CONTACT.phone}</span> · ${CONTACT.email}</p></div>`;
  document.body.appendChild(p); document.body.classList.add("printing");
  const done = () => { document.body.classList.remove("printing"); p.remove(); removeEventListener("afterprint", done); };
  addEventListener("afterprint", done); setTimeout(() => { print(); setTimeout(done, 1000); }, 50);
}
function bindReports(root, scans, owner) { root.querySelectorAll("[data-print]").forEach(b => b.onclick = () => printReport(scans.find(s => s.n === +b.dataset.print), owner)); }

/* ---------- الصفحات ---------- */
const REFRESH = {};
const PAGES = {
  async home(v) {
    const r = await call("home"), m = r.mine, last = m.last;
    let h = `<h1 class="pg">أهلاً ${esc(S.user.name)} <small>${esc(S.user.roleName)} · ${LOCAL ? "البيانات محفوظة على هذا الجهاز" : "البيانات على الخادم المشترك"}</small></h1>`;
    if (r.all) {
      const t = r.all.totals;
      h += `<section class="grid stats">${[["الحسابات", t.users], ["العملاء", t.clients], ["المديرون", t.admins], ["الحسابات النشطة", t.active], ["كل الفحوص", t.scans], ["عملاء في حالة تنبيه", t.alerts], ["سلاسل مكسورة", t.broken]].map(x => `<div class="card stat"><b class="num">${x[1]}</b><span>${x[0]}</span></div>`).join("")}</section>
      <section class="grid g2" style="margin-top:14px"><div class="card"><h2>الحسابات وحالتها <small>تُحدَّث مباشرة</small></h2><div class="scroll"><table><thead><tr><th>الحساب</th><th>الدور</th><th>آخر فحص</th><th>السلسلة</th></tr></thead><tbody>${r.all.rows.map(x => `<tr><td><b>${esc(x.name)}</b><div class="mono mute">${esc(x.user)}</div>${x.active ? "" : pill("alert", "موقوف")}</td><td>${esc(x.roleName)}</td><td>${x.sum.last ? pill(x.sum.last.state, x.sum.last.score) + ` <span class="num mute small">${fmt(x.sum.last.at)}</span>` : '<span class="mute small">لا فحوص</span>'}</td><td>${x.sum.scans ? pill(x.sum.chain.ok ? "ok" : "alert", x.sum.chain.ok ? "سليمة" : "مكسورة") : "—"}${x.sum.scans ? ` <a class="small" href="#reports?uid=${x.id}">التقارير</a>` : ""}</td></tr>`).join("")}</tbody></table></div></div>
      <div class="card"><h2>آخر النشاط <small><a href="#audit">السجل الكامل</a></small></h2><div class="log">${r.all.recent.map(a => `<div><span class="num mute">${fmt(a.at).slice(5)}</span><span><b>${esc(a.user)}</b> · ${esc(a.act)} <span class="mute">${esc(a.detail)}</span></span></div>`).join("") || '<div class="empty">لا نشاط بعد</div>'}</div></div></section>`;
    }
    h += `<section class="grid g2" style="margin-top:14px"><div class="card"><h2>حكم آخر فحص لملفاتك</h2><div class="verdict">${ring(last ? last.score : null, last ? last.state : "na")}<div><p style="margin:0;font-size:18px;font-weight:700">${last ? STATE[last.state] : "لم تفحص أي ملف بعد"}</p><p class="mute small" style="margin:4px 0 10px">${last ? "تقرير #" + last.n + " · " + fmt(last.at) : "ابدأ بفحص ملفاتك، فلن يغادر محتواها جهازك."}</p><a class="btn pri sm" href="#scan">فحص ملفات الآن</a></div></div></div>
      <div class="card"><h2>ملخص حسابك</h2><div class="grid g3"><div class="stat"><b class="num">${m.scans}</b><span>تقرير مختوم</span></div><div class="stat"><b class="num">${m.files}</b><span>ملف مراقَب</span></div><div class="stat"><b>${m.scans ? pill(m.chain.ok ? "ok" : "alert", m.chain.ok ? "سليمة" : "مكسورة") : "—"}</b><span>سلسلة الأختام</span></div></div>
      <div id="mini" style="margin-top:12px"></div></div></section>`;
    v.innerHTML = h;
    const mini = () => { const cs = deviceChecks().filter(c => ["net", "ping", "sec", "store"].indexOf(c.key) >= 0); const el = $("#mini"); if (el) el.innerHTML = `<div class="checks" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">${cs.map(chkHtml).join("")}</div><p class="note"><a href="#device">متابعة كل أنظمة الجهاز مباشرة</a></p>`; };
    mini(); every(2000, mini);
  },

  async scan(v) {
    v.innerHTML = `<h1 class="pg">فحص الملفات <small>المحتوى يُقرأ داخل متصفحك فقط ولا يُرسل إلى أي مكان</small></h1>
      <div class="card"><div class="drop" id="drop"><p style="margin:0 0 10px;font-size:16px"><b>اسحب الملفات هنا</b> أو اخترها من جهازك</p>
        <div class="row" style="justify-content:center"><label class="btn pri" style="margin:0">اختيار ملفات<input type="file" id="fi" multiple></label><button type="button" id="demo">تجربة بملف اختبار وهمي</button></div>
        <p class="note">يُفحص محتوى النصوص والجداول وملفات Word وExcel وPowerPoint حتى 20 م.ب للملف، وتُحسب بصمة كل الملفات أياً كان نوعها.</p></div>
        <div id="prog" class="small mute" style="margin-top:10px" aria-live="polite"></div></div><div id="res" style="margin-top:14px"></div>`;
    const go = async files => {
      files = Array.from(files).slice(0, 200); if (!files.length) return;
      const out = [], pr = $("#prog");
      for (let i = 0; i < files.length; i++) { pr.textContent = `جارٍ تحليل ${i + 1} من ${files.length}: ${files[i].name}`; try { out.push(await analyze(files[i])); } catch (e) { toast("تعذّرت قراءة " + files[i].name); } }
      if (!out.length) { pr.textContent = ""; return; }
      pr.textContent = "جارٍ ختم التقرير…";
      try { const r = await call("scan", { files: out }); pr.textContent = ""; S._reps = [r.report]; $("#res").innerHTML = `<div class="card"><h2>نتيجة الفحص <small><a href="#reports">كل التقارير</a></small></h2><div class="verdict" style="margin-bottom:12px">${ring(r.report.score, r.report.state)}<div><p style="margin:0;font-size:18px;font-weight:700">${STATE[r.report.state]}</p><p class="mute small" style="margin:0">تقرير #${r.report.n} مختوم · ${fmt(r.report.at)}</p></div></div>${repDetail(r.report)}</div>`; bindReports($("#res"), [r.report]); toast("تم الفحص وختم التقرير."); }
      catch (e) { pr.textContent = e.message; }
      $("#fi").value = "";
    };
    $("#fi").onchange = e => go(e.target.files);
    $("#demo").onclick = () => go([sampleFile()]);
    const d = $("#drop");
    ["dragenter", "dragover"].forEach(ev => d.addEventListener(ev, e => { e.preventDefault(); d.classList.add("on"); }));
    ["dragleave", "drop"].forEach(ev => d.addEventListener(ev, e => { e.preventDefault(); d.classList.remove("on"); }));
    d.addEventListener("drop", e => go(e.dataTransfer.files));
  },

  async reports(v) {
    const q = new URLSearchParams(location.hash.split("?")[1] || ""), uid = can("allReports") ? q.get("uid") || S.user.id : S.user.id;
    let pick = "";
    if (can("allReports")) { const us = (await call("users")).users; pick = `<select id="who" style="width:auto;max-width:100%">${us.map(u => `<option value="${u.id}" ${u.id === uid ? "selected" : ""}>${esc(u.name)} (${esc(u.user)})</option>`).join("")}</select>`; }
    const r = await call("reports", { uid }); S._reps = r.scans;
    const files = Object.keys(r.files).map(k => Object.assign({ name: k }, r.files[k])).sort((a, b) => a.at < b.at ? 1 : -1);
    v.innerHTML = `<h1 class="pg">التقارير والأختام <small>${r.owner && r.owner.id !== S.user.id ? "حساب " + esc(r.owner.name) : "تقاريرك"}</small><span class="sp"></span>${pick}</h1>
      <div class="banner ${r.chain.ok ? "ok" : "alert"}">${r.chain.ok ? `سلسلة الأختام سليمة: ${r.chain.count} تقرير، ولم يُعدَّل أي منها بعد ختمه.` : `السلسلة مكسورة عند التقارير: ${r.chain.broken.join("، ")}. هذا يعني أن سجلاً محفوظاً عُدِّل بعد ختمه.`}</div>
      ${r.scans.length ? `<div class="card"><h2>مؤشر السرية عبر الوقت <small>آخر ${Math.min(40, r.scans.length)} تقرير</small></h2><div class="bars">${r.scans.slice(0, 40).reverse().map(s => `<i title="#${s.n} · ${s.score}" style="height:${Math.max(4, s.score)}%;background:${scoreColor(s.score, s.state)}"></i>`).join("")}</div></div>` : ""}
      <div class="card" style="margin-top:14px"><h2>التقارير <small>${r.scans.length}</small></h2>${r.scans.map((s, i) => repRow(s, i === 0)).join("") || '<div class="empty">لا توجد تقارير بعد. <a href="#scan">ابدأ أول فحص</a></div>'}</div>
      <div class="card" style="margin-top:14px"><h2>جرد الملفات وبصماتها <small>${files.length}</small></h2><div class="scroll"><table><thead><tr><th>الملف</th><th>الحجم</th><th>آخر فحص</th><th class="hide-m">البصمة</th></tr></thead><tbody>${files.map(f => `<tr><td>${esc(f.name)}</td><td class="num">${size(f.size)}</td><td class="num">${fmt(f.at)}</td><td class="mono mute hide-m">${f.sha.slice(0, 24)}…</td></tr>`).join("") || '<tr><td colspan="4" class="empty">لا ملفات بعد</td></tr>'}</tbody></table></div></div>`;
    bindReports(v, r.scans, r.owner && r.owner.name);
    const w = $("#who"); if (w) w.onchange = () => { location.hash = "#reports?uid=" + w.value; };
  },

  async device(v) {
    v.innerHTML = `<h1 class="pg">جهازي مباشر <small>كل أنظمة الجهاز التي يتيحها المتصفح، تُقاس كل ثانية</small></h1><div id="dv"></div>
      <p class="note">تُقرأ هذه القياسات داخل متصفحك ولا تُرسل إلى أي جهة. بعض المتصفحات (مثل Safari على iPhone) لا تتيح البطارية أو نوع الشبكة، فتظهر «غير متاح».</p>`;
    deviceBlock($("#dv"));
  },

  async users(v) {
    const r = await call("users"), roles = Object.keys(r.roles);
    v.innerHTML = `<h1 class="pg">الحسابات والصلاحيات <small>${r.users.length} حساب</small><span class="sp"></span><button class="pri" id="nu" type="button">حساب جديد</button></h1>
      <div class="card"><div class="scroll"><table><thead><tr><th>الاسم</th><th>اسم المستخدم</th><th>الدور</th><th class="hide-m">التواصل</th><th>آخر دخول</th><th>الحالة</th><th></th></tr></thead><tbody>
      ${r.users.map(u => `<tr><td><b>${esc(u.name)}</b>${u.org ? `<div class="mute small">${esc(u.org)}</div>` : ""}</td><td class="mono">${esc(u.user)}</td><td>${pill(u.role === "admin" ? "warn" : "ok", u.roleName)}</td><td class="hide-m small">${u.phone ? `<div class="num">${esc(u.phone)}</div>` : ""}${esc(u.email)}</td><td class="num small">${fmt(u.last)}</td><td>${pill(u.active ? "ok" : "alert", u.active ? "نشط" : "موقوف")}</td><td><div class="row"><button class="sm" data-ed="${u.id}" type="button">تعديل</button>${u.id !== S.user.id ? `<button class="sm" data-tg="${u.id}" type="button">${u.active ? "إيقاف" : "تفعيل"}</button><button class="sm dan" data-del="${u.id}" type="button">حذف</button>` : ""}</div></td></tr>`).join("")}
      </tbody></table></div></div>
      <div class="card" style="margin-top:14px"><h2>مصفوفة الصلاحيات <small>تُطبَّق في نواة المنصة على كل طلب، لا في الواجهة فقط</small></h2><div class="scroll"><table><thead><tr><th>الصلاحية</th>${roles.map(k => `<th>${esc(r.roles[k])}</th>`).join("")}</tr></thead><tbody>${Object.keys(r.permNames).map(p => `<tr><td>${esc(r.permNames[p])}</td>${roles.map(k => `<td>${r.perms[k].indexOf(p) >= 0 ? pill("ok", "✓") : pill("na", "—")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      <p class="note">الزائر غير المسجل يرى صفحة التعريف وزر الدخول فقط، ولا يصل إلى أي بيانات.</p></div>`;
    const find = id => r.users.find(u => u.id === id);
    $("#nu").onclick = () => userForm(null, roles, r.roles);
    v.querySelectorAll("[data-ed]").forEach(b => b.onclick = () => userForm(find(b.dataset.ed), roles, r.roles));
    v.querySelectorAll("[data-tg]").forEach(b => b.onclick = async () => { const u = find(b.dataset.tg); busy(b, true); try { await call("saveUser", Object.assign({}, u, { active: !u.active })); toast(u.active ? "أُوقف الحساب وأُنهيت جلساته." : "فُعّل الحساب."); route(); } catch (e) { toast(e.message); busy(b, false); } });
    v.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
      const u = find(b.dataset.del);
      const m = modal(`<h2>حذف حساب ${esc(u.name)}</h2><p>سيُحذف الحساب <span class="mono">${esc(u.user)}</span> وكل تقاريره وأختامه نهائياً، ولا يمكن التراجع إلا من نسخة احتياطية.</p><div class="row"><button class="pri dan" id="yd" type="button">حذف نهائي</button><button data-close type="button">إلغاء</button></div>`);
      m.querySelector("#yd").onclick = async e => { busy(e.target, true); try { await call("delUser", { id: u.id }); m.remove(); toast("حُذف الحساب."); route(); } catch (er) { toast(er.message); busy(e.target, false); } };
    });
  },

  async health(v) {
    v.innerHTML = `<h1 class="pg">صحة المنصة <small>فحص ذاتي تلقائي كل 30 ثانية، ومراقبة الجهاز كل ثانية</small><span class="sp"></span><button id="rt" type="button">افحص الآن</button></h1>
      <div class="card"><h2>الفحص الذاتي للمنصة <small id="stAt"></small></h2><div id="st" class="checks"></div></div>
      <div class="card" style="margin-top:14px"><h2>المراقبة الآلية المستقلة على GitHub</h2>
        <p class="small" style="margin-top:0">كل ساعة، ومع كل تحديث للموقع، يشغّل GitHub اختبار المنصة كاملاً (الدخول، والصلاحيات، والفحص، والأختام، والنسخ الاحتياطي) ثم يفتح الموقع المنشور ويتحقق من كل ملفاته. يعمل ذلك دون أي تدخل بشري أو خدمة أخرى، وعند أي خلل يصل تنبيه بالبريد لمالك المستودع.</p>
        <a href="${HEALTH_URL}" target="_blank" rel="noopener"><img src="${HEALTH_BADGE}" alt="حالة المراقبة الآلية" height="20"></a></div>
      <h2 style="font-size:16px;margin:18px 0 10px">أنظمة هذا الجهاز مباشرة</h2><div id="dv"></div>`;
    const files = ["index.html", "core.js", "app.js", "config.js", "sw.js", "manifest.webmanifest"];
    async function run() {
      const out = [];
      try { const r = await call("selftest"); r.checks.forEach(c => out.push(c)); out.push({ title: "زمن تنفيذ الفحص", status: r.ms < 1500 ? "ok" : "warn", detail: r.ms + " م.ث" }); }
      catch (e) { out.push({ title: "نواة المنصة", status: "alert", detail: e.message }); }
      const res = await Promise.all(files.map(f => fetch(f + "?check=" + Date.now(), { method: "HEAD", cache: "no-store" }).then(r => r.ok).catch(() => false)));
      const miss = files.filter((f, i) => !res[i]);
      out.push({ title: "ملفات المنصة على الموقع المنشور", status: miss.length ? (navigator.onLine ? "alert" : "warn") : "ok", detail: miss.length ? "تعذّر الوصول إلى: " + miss.join("، ") + (navigator.onLine ? "" : " (الجهاز دون اتصال، والنسخة المحفوظة تعمل)") : "كل الملفات الستة متاحة" });
      out.push({ title: "وضع التشغيل", status: "ok", detail: LOCAL ? "مستقل بالكامل: المنطق والبيانات داخل المتصفح، دون أي خادم أو خدمة خارجية" : "متصل بخادم البيانات المشترك" });
      const el = $("#st"); if (!el) return;
      el.innerHTML = out.map(chkHtml).join(""); $("#stAt").textContent = "آخر فحص " + fmt(new Date().toISOString(), true).slice(11);
    }
    $("#rt").onclick = run; run(); every(30000, run);
    deviceBlock($("#dv"));
  },

  async audit(v) {
    const r = await call("audit");
    v.innerHTML = `<h1 class="pg">سجل التدقيق <small>${r.items.length} عملية · يحفظ آخر 1500</small><span class="sp"></span><button id="ex" type="button">تنزيل CSV</button></h1>
      <div class="card"><input id="flt" placeholder="بحث في السجل باسم المستخدم أو العملية" style="margin-bottom:10px"><div class="scroll"><table><thead><tr><th>الوقت</th><th>المستخدم</th><th>العملية</th><th>التفاصيل</th></tr></thead><tbody id="ab"></tbody></table></div></div>`;
    const draw = () => { const q = $("#flt").value.trim().toLowerCase(); $("#ab").innerHTML = r.items.filter(a => !q || (a.user + a.act + a.detail).toLowerCase().indexOf(q) >= 0).slice(0, 400).map(a => `<tr><td class="num">${fmt(a.at, true)}</td><td class="mono">${esc(a.user)}</td><td>${esc(a.act)}</td><td class="mute">${esc(a.detail)}</td></tr>`).join("") || '<tr><td colspan="4" class="empty">لا نتائج</td></tr>'; };
    $("#flt").oninput = draw; draw();
    $("#ex").onclick = () => download("saif-audit-" + fmt(new Date().toISOString()).slice(0, 10) + ".csv", "﻿الوقت,المستخدم,العملية,التفاصيل\n" + r.items.map(a => [fmt(a.at, true), a.user, a.act, a.detail].map(x => '"' + String(x).replace(/"/g, '""') + '"').join(",")).join("\n"), "text/csv");
  },

  async settings(v) {
    const s = (await call("settings")).settings;
    v.innerHTML = `<h1 class="pg">الإعدادات والنسخ الاحتياطي</h1><div class="grid g2">
      <div class="card"><h2>إعدادات المنصة</h2><form id="sf">
        <label>مدة الجلسة قبل طلب الدخول من جديد (ساعة)<input name="sessionHours" type="number" min="1" max="720" value="${s.sessionHours}"></label>
        <label>يظهر تحذير إذا قل المؤشر عن<input name="warnBelow" type="number" min="1" max="100" value="${s.warnBelow}"></label>
        <label>يظهر تنبيه إذا قل المؤشر عن<input name="alertBelow" type="number" min="1" max="100" value="${s.alertBelow}"></label>
        <label>عدد محاولات الدخول الخاطئة قبل الإيقاف المؤقت<input name="maxAttempts" type="number" min="1" max="50" value="${s.maxAttempts}"></label>
        <label>مدة الإيقاف المؤقت (دقيقة)<input name="lockMinutes" type="number" min="1" max="1440" value="${s.lockMinutes}"></label>
        <button class="pri" id="sb">حفظ الإعدادات</button></form></div>
      <div class="card"><h2>النسخ الاحتياطي والاستعادة</h2><p class="small mute" style="margin-top:0">النسخة ملف JSON يضم الحسابات (ببصمات كلمات المرور فقط) والتقارير والسجل والإعدادات. احفظها في مكان آمن.</p>
        <div class="row"><button id="bk" class="pri" type="button">تنزيل نسخة احتياطية</button><label class="btn" style="margin:0">استعادة من ملف<input type="file" id="rs" accept=".json,application/json" hidden></label></div>
        <h2 style="margin-top:22px">وضع التشغيل</h2>
        <p class="small" style="margin-top:0">${LOCAL ? "المنصة الآن <b>مستقلة بالكامل</b>: كل المنطق والحسابات والبيانات تعمل داخل المتصفح على كل جهاز، دون خادم ودون أي خدمة خارجية، وتفتح حتى دون إنترنت بعد أول زيارة. الحسابات الافتراضية موجودة على كل جهاز، أما الحسابات والتقارير الجديدة فتبقى على الجهاز الذي أُنشئت عليه." : "المنصة متصلة بخادم البيانات المشترك، فتظهر الحسابات والتقارير على كل الأجهزة."}</p>
        ${LOCAL ? `<p class="small">لمشاركة الحسابات والتقارير بين كل الأجهزة، يُفعَّل خادم البيانات المشترك على حساب Google الخاص بمنجز مرة واحدة، والخطوات في <a href="https://github.com/munjiz-qa/munjiz-qa.github.io/blob/main/saif/README.md" target="_blank" rel="noopener">دليل التشغيل</a>.</p>` : ""}</div></div>`;
    $("#sf").onsubmit = async e => { e.preventDefault(); const b = $("#sb"), o = {}; new FormData(e.target).forEach((val, k) => o[k] = val); busy(b, true); try { await call("settings", { save: o }); toast("حُفظت الإعدادات."); } catch (er) { toast(er.message); } busy(b, false); };
    $("#bk").onclick = async () => { try { const r = await call("backup"); download("saif-backup-" + fmt(r.backup.at).replace(/[: ]/g, "-") + ".json", JSON.stringify(r.backup, null, 1)); toast("نُزّلت النسخة الاحتياطية."); } catch (e) { toast(e.message); } };
    $("#rs").onchange = async e => {
      const f = e.target.files[0]; if (!f) return; let b; try { b = JSON.parse(await f.text()); } catch (er) { toast("الملف ليس JSON صالحاً."); return; }
      const m = modal(`<h2>استعادة نسخة احتياطية</h2><p>ستحل بيانات النسخة (${esc(fmt(b.at))}) محل كل البيانات الحالية. يُنصح بتنزيل نسخة من الوضع الحالي أولاً.</p><div class="row"><button class="pri" id="yr" type="button">استعادة</button><button data-close type="button">إلغاء</button></div>`);
      m.querySelector("#yr").onclick = async ev => { busy(ev.target, true); try { await call("restore", { backup: b }); m.remove(); toast("تمت الاستعادة."); S.user = null; route(); } catch (er) { toast(er.message); busy(ev.target, false); } };
      e.target.value = "";
    };
  },

  async account(v) {
    const u = S.user;
    v.innerHTML = `<h1 class="pg">حسابي</h1><div class="grid g2">
      <div class="card"><h2>بياناتي</h2><form id="pf"><label>الاسم<input name="name" value="${esc(u.name)}" required></label><label>الجهة أو الشركة<input name="org" value="${esc(u.org)}"></label>
        <label>الهاتف<input name="phone" dir="ltr" inputmode="tel" value="${esc(u.phone)}" placeholder="+974 5000 0000"></label><label>البريد الإلكتروني<input name="email" type="email" dir="ltr" value="${esc(u.email)}"></label><button class="pri" id="pb">حفظ البيانات</button></form></div>
      <div class="card"><h2>تغيير كلمة المرور</h2><form id="cf"><label>كلمة المرور الحالية<input name="old" type="password" dir="ltr" autocomplete="current-password" required></label><label>كلمة المرور الجديدة (8 أحرف على الأقل)<input name="pw" type="password" dir="ltr" autocomplete="new-password" minlength="8" required></label><label>أعد كتابة كلمة المرور الجديدة<input name="pw2" type="password" dir="ltr" autocomplete="new-password" required></label><span class="err" id="ce"></span><button class="pri" id="cb">تغيير كلمة المرور</button></form>
        <h2 style="margin-top:20px">صلاحياتي <small>${esc(u.roleName)}</small></h2><div class="perm">${u.perms.map(p => `<span class="dot d-ok" style="margin-top:7px"></span><span>${esc(C.PERM_NAMES[p])}</span>`).join("")}</div>
        <p class="note">اسم المستخدم: <span class="mono">${esc(u.user)}</span> · آخر دخول: <span class="num">${fmt(u.last)}</span></p></div></div>`;
    $("#pf").onsubmit = async e => { e.preventDefault(); const o = {}; new FormData(e.target).forEach((val, k) => o[k] = val); busy($("#pb"), true); try { const r = await call("profile", o); S.user = r.user; toast("حُفظت بياناتك."); route(); } catch (er) { toast(er.message); busy($("#pb"), false); } };
    $("#cf").onsubmit = async e => {
      e.preventDefault(); const f = e.target; $("#ce").textContent = "";
      if (f.pw.value !== f.pw2.value) { $("#ce").textContent = "كلمتا المرور الجديدتان غير متطابقتين."; return; }
      busy($("#cb"), true); try { await call("profile", { old: f.old.value, pw: f.pw.value }); f.reset(); toast("تغيّرت كلمة المرور."); } catch (er) { $("#ce").textContent = er.message; } busy($("#cb"), false);
    };
  }
};
REFRESH.home = () => route(); REFRESH.reports = () => route(); REFRESH.users = () => route(); REFRESH.audit = () => route();

function userForm(u, roles, names) {
  const m = modal(`<h2>${u ? "تعديل حساب " + esc(u.name) : "حساب جديد"}</h2><form id="uf">
    <div class="grid g2"><label>الاسم<input name="name" value="${esc(u ? u.name : "")}" required></label><label>اسم المستخدم (بالإنجليزية)<input name="user" dir="ltr" autocapitalize="none" value="${esc(u ? u.user : "")}" required></label></div>
    <div class="grid g2"><label>الدور<select name="role">${roles.map(k => `<option value="${k}" ${(u ? u.role : "client") === k ? "selected" : ""}>${esc(names[k])}</option>`).join("")}</select></label><label>الجهة أو الشركة<input name="org" value="${esc(u ? u.org : "")}"></label></div>
    <div class="grid g2"><label>الهاتف<input name="phone" dir="ltr" inputmode="tel" value="${esc(u ? u.phone : "")}" placeholder="+974 5000 0000"></label><label>البريد<input name="email" type="email" dir="ltr" value="${esc(u ? u.email : "")}"></label></div>
    <label>${u ? "كلمة مرور جديدة (اتركها فارغة للإبقاء على الحالية)" : "كلمة المرور الأولى (8 أحرف على الأقل)"}<span class="pwrap"><input name="pw" dir="ltr" autocomplete="new-password" ${u ? "" : "required"}><button type="button" class="sm" id="gp">توليد</button></span></label>
    <label class="chkl"><input type="checkbox" name="active" ${!u || u.active ? "checked" : ""}> الحساب نشط</label>
    <span class="err" id="ue"></span><div class="row"><button class="pri" id="us">${u ? "حفظ التعديل" : "إنشاء الحساب"}</button><button type="button" data-close>إلغاء</button></div></form>`);
  m.querySelector("#gp").onclick = () => { m.querySelector("[name=pw]").value = "Saif-" + rand(4) + "-" + rand(4) + "-" + rand(4); };
  m.querySelector("#uf").onsubmit = async e => {
    e.preventDefault(); const f = e.target, b = m.querySelector("#us");
    const o = { id: u ? u.id : undefined, name: f.name.value, user: f.user.value, role: f.role.value, org: f.org.value, phone: f.phone.value, email: f.email.value, pw: f.pw.value || undefined, active: f.active.checked };
    busy(b, true);
    try { await call("saveUser", o); m.remove(); toast(u ? "حُفظ التعديل." : "أُنشئ الحساب" + (o.pw ? "، سلّم كلمة المرور لصاحبه بشكل منفصل." : ".")); route(); }
    catch (er) { m.querySelector("#ue").textContent = er.message; busy(b, false); }
  };
}

/* ---------- التشغيل دون اتصال ---------- */
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => { });
route();
})();
