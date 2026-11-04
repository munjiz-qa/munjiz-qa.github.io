// براق · مؤشرات الأداء في لوحة الإدارة: مسار التحويل، زمن الرد، قيمة العروض، الاتجاه، والطلبات التي تحتاج متابعة.
// تُحسب كلها من الطلبات التي يقرؤها المدير أصلاً، دون أي قراءة إضافية من Firebase.
import { esc, money, TYPES, fmtDate } from "./ui.js";

const toD = (v) => (v ? (v.toDate ? v.toDate() : new Date(v)) : null);
const H = 36e5, DAY = 864e5;
const WON = ["approved", "in_progress", "done"];
const reached = (r, s) => r.status === s || (r.history || []).some((h) => h.s === s);
const quotedEver = (r) => r.price != null || ["quoted", ...WON].some((s) => reached(r, s));
const wonEver = (r) => WON.some((s) => reached(r, s));
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const dur = (ms) => (ms == null ? "—" : ms < H ? `${Math.max(1, Math.round(ms / 6e4))} دقيقة` : ms < 2 * DAY ? `${(ms / H).toFixed(ms < 10 * H ? 1 : 0)} ساعة` : `${(ms / DAY).toFixed(1)} يوم`);

// أول استجابة من فريق براق: أول تغيير للحالة لم يقم به العميل
function firstResponse(r) {
  const c = toD(r.createdAt); if (!c) return null;
  const h = (r.history || []).find((x) => x.s !== "new" && x.by !== "customer");
  const t = h && toD(h.at); return t ? Math.max(0, t - c) : null;
}

export function followUps(REQS, now = Date.now()) {
  const out = [];
  for (const r of REQS) {
    const c = toD(r.createdAt), u = toD(r.updatedAt) || c; if (!c) continue;
    if (r.status === "new" && now - c > DAY) out.push({ r, why: `جديد منذ ${dur(now - c)} دون رد`, lvl: 2, age: now - c });
    else if (r.status === "quoted" && now - u > 3 * DAY) out.push({ r, why: `عرض السعر بانتظار العميل منذ ${dur(now - u)}`, lvl: 1, age: now - u });
    else if (r.status === "reviewing" && now - u > 2 * DAY) out.push({ r, why: `قيد المراجعة منذ ${dur(now - u)}`, lvl: 1, age: now - u });
  }
  return out.sort((a, b) => b.lvl - a.lvl || b.age - a.age);
}

function bars(rows, total) {
  if (!rows.length) return `<div class="mute sm">لا بيانات بعد.</div>`;
  const max = Math.max(...rows.map((x) => x[1]), 1);
  return `<ul class="ins-bars">${rows.map(([k, v]) => `<li><span class="l">${esc(k)}</span><span class="b"><i style="inline-size:${Math.max(4, (v / max) * 100)}%"></i></span><span class="v">${v}<small> · ${pct(v, total)}%</small></span></li>`).join("")}</ul>`;
}

function trend(REQS, now) {
  const days = 30, start = new Date(now); start.setHours(0, 0, 0, 0); const t0 = start.getTime() - (days - 1) * DAY;
  const n = Array(days).fill(0);
  REQS.forEach((r) => { const c = toD(r.createdAt); if (c && c >= t0) { const i = Math.floor((c - t0) / DAY); if (i >= 0 && i < days) n[i]++; } });
  const max = Math.max(...n, 1), W = 300, Hh = 64, bw = W / days;
  const last7 = n.slice(-7).reduce((a, b) => a + b, 0), prev7 = n.slice(-14, -7).reduce((a, b) => a + b, 0);
  const svg = `<svg class="ins-trend" viewBox="0 0 ${W} ${Hh + 14}" role="img" aria-label="الطلبات اليومية خلال آخر 30 يوماً، المجموع ${n.reduce((a, b) => a + b, 0)}">${n.map((v, i) => { const h = v ? Math.max(3, (v / max) * Hh) : 1.5; return `<rect x="${(days - 1 - i) * bw + 1}" y="${Hh - h}" width="${bw - 2}" height="${h}" rx="1.5" class="${v ? "on" : ""}"><title>${fmtDate(new Date(t0 + i * DAY))}: ${v}</title></rect>`; }).join("")}<text x="${W}" y="${Hh + 12}" text-anchor="end">قبل 30 يوماً</text><text x="0" y="${Hh + 12}" text-anchor="start">اليوم</text></svg>`;
  return { svg, last7, prev7 };
}

export function insightsHtml(REQS, now = Date.now()) {
  const live = REQS.filter((r) => r.status !== "cancelled");
  const q = REQS.filter(quotedEver), w = REQS.filter(wonEver), done = REQS.filter((r) => r.status === "done");
  const resp = REQS.map(firstResponse).filter((x) => x != null).sort((a, b) => a - b);
  const median = resp.length ? resp[Math.floor((resp.length - 1) / 2)] : null;
  const pipe = REQS.filter((r) => r.status === "quoted" && r.price != null).reduce((a, r) => a + Number(r.price), 0);
  const won = w.filter((r) => r.price != null).reduce((a, r) => a + Number(r.price), 0);
  const avgWon = w.filter((r) => r.price != null).length ? won / w.filter((r) => r.price != null).length : null;
  const cnt = (f) => { const m = {}; live.forEach((r) => { const k = f(r) || "غير محدد"; m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5); };
  const tr = trend(REQS, now);
  const delta = tr.prev7 ? Math.round(((tr.last7 - tr.prev7) / tr.prev7) * 100) : null;
  const fu = followUps(REQS, now);
  const step = (v, l, s) => `<div class="ins-step"><b>${v}</b><span>${l}</span>${s ? `<small>${s}</small>` : ""}</div>`;
  return `<section class="ins" aria-labelledby="insT">
  <h2 id="insT">مؤشرات الأداء</h2>
  <div class="ins-funnel">
   ${step(REQS.length, "طلب وارد", "")}<span class="arr" aria-hidden="true">←</span>
   ${step(q.length, "أُرسل له عرض", `${pct(q.length, REQS.length)}% من الطلبات`)}<span class="arr" aria-hidden="true">←</span>
   ${step(w.length, "اعتُمد", `${pct(w.length, q.length)}% من العروض`)}<span class="arr" aria-hidden="true">←</span>
   ${step(done.length, "اكتمل التنفيذ", `${pct(done.length, w.length)}% من المعتمد`)}
  </div>
  <div class="ins-grid">
   <div class="card ins-c"><h3>سرعة الرد</h3><p class="big">${dur(median)}</p><p class="mute sm">الوسيط من وصول الطلب إلى أول إجراء من الفريق${resp.length ? ` · ${resp.length} طلب` : ""}</p></div>
   <div class="card ins-c"><h3>العروض المعلّقة</h3><p class="big">${money(pipe)}</p><p class="mute sm">قيمة العروض المرسلة بانتظار قرار العميل</p></div>
   <div class="card ins-c"><h3>متوسط قيمة الطلب المعتمد</h3><p class="big">${avgWon == null ? "—" : money(Math.round(avgWon))}</p><p class="mute sm">من ${w.length} طلب معتمد بإجمالي ${money(won)}</p></div>
   <div class="card ins-c"><h3>الطلبات خلال 30 يوماً</h3>${tr.svg}<p class="mute sm">آخر 7 أيام: <b>${tr.last7}</b>${delta == null ? "" : ` · ${delta >= 0 ? "+" : ""}${delta}% عن الأسبوع السابق`}</p></div>
   <div class="card ins-c"><h3>حسب نوع الطلب</h3>${bars(cnt((r) => TYPES[r.type] || r.type), live.length)}</div>
   <div class="card ins-c"><h3>حسب المدينة</h3>${bars(cnt((r) => (r.city || "").trim()), live.length)}</div>
  </div>
  <h3 class="ins-fu-t">يحتاج متابعة <span class="n">${fu.length}</span></h3>
  <div class="list" id="insFu">${fu.length ? fu.slice(0, 8).map(({ r, why, lvl }) => {
    const wa = (r.phone || "").replace(/[^\d]/g, "");
    const txt = encodeURIComponent(`مرحباً ${r.name || ""}، معك فريق براق بخصوص طلبك ${r.no}. ${r.status === "quoted" ? "هل اطّلعت على عرض السعر؟ يسعدنا الإجابة عن أي استفسار." : "استلمنا طلبك ونعمل عليه، ونودّ تأكيد بعض التفاصيل."}`);
    return `<article class="item fu l${lvl}"><div><h3>${esc(r.name)} · <bdi dir="ltr">${esc(r.no)}</bdi></h3><div class="meta"><span>${esc(why)}</span><span>${esc(r.car || "—")}</span></div></div><div class="acts">${wa ? `<a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/${wa}?text=${txt}">واتساب</a>` : ""}<button class="btn sm pri" data-open="${r.id}">إدارة</button></div></article>`;
  }).join("") : `<div class="empty">لا طلبات متأخرة. كل الطلبات ضمن زمن الرد المستهدف.</div>`}</div>
 </section>`;
}

export const INS_CSS = `.ins{margin:8px 0 26px}.ins h2{margin:0 0 12px}
.ins-funnel{display:flex;align-items:stretch;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.ins-step{flex:1 1 120px;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:2px}
.ins-step b{font-size:1.6rem;line-height:1.1}.ins-step span{font-weight:600}.ins-step small{color:var(--muted);font-size:.8rem}
.ins-funnel .arr{align-self:center;color:var(--muted);font-size:1.1rem}
.ins-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px}
.ins-c{padding:16px}.ins-c h3{margin:0 0 6px;font-size:.95rem;color:var(--muted)}.ins-c .big{font-size:1.5rem;font-weight:700;margin:0 0 2px}
.ins-trend{width:100%;height:auto;display:block;margin:4px 0}.ins-trend rect{fill:var(--line)}.ins-trend rect.on{fill:var(--copper)}.ins-trend text{direction:ltr;font-size:11px;fill:var(--muted);font-family:inherit}
.ins-bars{list-style:none;margin:4px 0 0;padding:0;display:grid;gap:8px}.ins-bars li{display:grid;grid-template-columns:minmax(90px,38%) 1fr auto;gap:8px;align-items:center;font-size:.86rem}
.ins-bars .l{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ins-bars .b{background:var(--copper-soft);border-radius:6px;height:10px;overflow:hidden}.ins-bars .b i{display:block;height:100%;background:var(--copper);border-radius:6px}
.ins-bars .v{font-weight:600}.ins-bars small{color:var(--muted);font-weight:400}
.ins-fu-t{margin:22px 0 10px}.ins-fu-t .n{display:inline-block;min-width:24px;padding:0 7px;border-radius:12px;background:var(--copper-soft);color:var(--ink);font-size:.8rem;text-align:center}
#insFu .item.fu{border-inline-start:4px solid var(--warn)}#insFu .item.fu.l2{border-inline-start-color:var(--bad)}
@media (max-width:640px){.ins-funnel .arr{display:none}.ins-step{flex-basis:calc(50% - 4px)}}`;
