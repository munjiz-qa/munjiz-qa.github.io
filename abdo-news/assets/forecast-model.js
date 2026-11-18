// «التوقعات: استقراء المستقبل»: النموذج الحسابي المعلن، وحدة واحدة يستعملها المحرك الآلي (scripts/forecast.mjs) وصفحة الزائر (assets/forecast.js)،
// فيرى الزائر الحساب نفسه الذي تنشره الصفحة دون أي فرق. كل ثابت هنا معلن في صفحة «المنهجية».
// المخرج تقدير احتمالي مبني على مؤشرات مؤسسية وأحداث موثّقة بجهتين، وليس خبراً ولا يقيناً.

export const VERSION = '1.0';
export const ASPECTS = [
  {id: 'politics', ar: 'سياسي', en: 'Political'},
  {id: 'military', ar: 'عسكري', en: 'Military'},
  {id: 'security', ar: 'أمني', en: 'Security'},
  {id: 'economy', ar: 'اقتصادي', en: 'Economic'},
  {id: 'protests', ar: 'احتجاجات', en: 'Protests'},
  {id: 'foreign', ar: 'علاقات خارجية', en: 'Foreign relations'}
];
export const HORIZONS = [
  {d: 7, ar: 'أسبوع', en: '1 week'}, {d: 30, ar: 'شهر', en: '1 month'}, {d: 90, ar: '3 أشهر', en: '3 months'},
  {d: 180, ar: '6 أشهر', en: '6 months'}, {d: 365, ar: 'سنة', en: '1 year'}
];
// السيناريوهات: إزاحة معلنة على لوغاريتم الأرجحية لكل جانب (logit)، وأثر معلن على النمو بالنقاط المئوية.
export const SCENARIOS = [
  {id: 'base', ar: 'الأساسي (استمرار الاتجاه)', en: 'Baseline (trend continues)', note_ar: 'لا افتراض إضافي: المؤشرات والأحداث كما هي.', note_en: 'No added assumption: indicators and events as they are.'},
  {id: 'optimistic', ar: 'متفائل', en: 'Optimistic', note_ar: 'كل الجوانب −0.6 على مقياس الأرجحية، والنمو +0.3 نقطة.', note_en: 'All aspects −0.6 on the log-odds scale; growth +0.3 pt.'},
  {id: 'pessimistic', ar: 'متشائم', en: 'Pessimistic', note_ar: 'كل الجوانب +0.6 على مقياس الأرجحية، والنمو −0.5 نقطة.', note_en: 'All aspects +0.6 on the log-odds scale; growth −0.5 pt.'},
  {id: 'escalation', ar: 'تصعيد إقليمي', en: 'Regional escalation', note_ar: 'دول الشرق الأوسط والدول الأطراف في حرب: العسكري والأمني والخارجي +0.9، والاقتصادي +0.4، والنفط +20٪.', note_en: 'Middle East and war parties: military, security, foreign +0.9; economy +0.4; oil +20%.'},
  {id: 'deescalation', ar: 'تهدئة وتسوية', en: 'De-escalation and settlement', note_ar: 'الدول الأطراف في حرب: العسكري والأمني والخارجي −0.8، والسياسي −0.3.', note_en: 'War parties: military, security, foreign −0.8; political −0.3.'},
  {id: 'oil_down', ar: 'هبوط النفط 30٪', en: 'Oil falls 30%', note_ar: 'أثر النمو = −(ريع النفط من الناتج × 0.30 × 0.35) للمصدّرين، و+0.15 نقطة للمستوردين.', note_en: 'Growth effect = −(oil rents share × 0.30 × 0.35) for exporters, +0.15 pt for importers.'},
  {id: 'oil_up', ar: 'ارتفاع النفط 30٪', en: 'Oil rises 30%', note_ar: 'عكس السيناريو السابق: مكسب للمصدّرين وضغط على المستوردين (−0.2 نقطة).', note_en: 'Mirror of the above: a gain for exporters, −0.2 pt for importers.'}
];
// مستويات الحروب في data/wars.json → درجة 0..1
const WAR_LV = {escalation: 1, tense: 0.6, calm: 0.25};
// الدول المرتبطة بكل حرب ووزن ارتباطها (1 طرف مباشر، أقل من 1 دولة متأثرة أو داعمة)
export const WAR_LINKS = {
  iran: {IRN: 1, ISR: 1, USA: 0.6, QAT: 0.5, ARE: 0.5, BHR: 0.5, KWT: 0.5, SAU: 0.5, IRQ: 0.5, OMN: 0.3},
  yemen: {YEM: 1, SAU: 0.5, ARE: 0.3},
  ukraine: {UKR: 1, RUS: 1, GBR: 0.3, FRA: 0.3, USA: 0.2},
  sudan: {SDN: 1, EGY: 0.2},
  levant: {ISR: 1, LBN: 1, PSE: 1, SYR: 0.5, JOR: 0.3, EGY: 0.3}
};
export const OUTLOOK = {
  improve: {ar: 'تحسّن مرجّح', en: 'Likely improvement', color: '#1D7A70'},
  stable: {ar: 'استقرار مرجّح', en: 'Likely stable', color: '#3A5FB0'},
  watch: {ar: 'تحت المراقبة', en: 'Watch', color: '#D9A21A'},
  deteriorate: {ar: 'تدهور مرجّح', en: 'Likely deterioration', color: '#C4392F'}
};

const sig = x => 1 / (1 + Math.exp(-x));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const avg = xs => { const v = xs.filter(x => x != null && !isNaN(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const latest = (series, maxYear) => { if (!series) return null; const ys = Object.keys(series).map(Number).filter(y => series[y] != null && (!maxYear || y <= maxYear)).sort((a, b) => b - a); return ys.length ? {y: ys[0], v: series[ys[0]]} : null; };
export {latest};

// درجة حرب البلد: أعلى (مستوى الحرب × وزن الارتباط) بين الحروب الدائرة
export function warExposure(iso, wars) {
  let best = 0, ids = [];
  for (const w of wars || []) {
    const wt = (WAR_LINKS[w.id] || {})[iso]; if (!wt) continue;
    const s = (WAR_LV[w.level] ?? 0.25) * wt; ids.push({id: w.id, level: w.level, weight: wt, s});
    if (s > best) best = s;
  }
  return {s: best, wars: ids.sort((a, b) => b.s - a.s)};
}

// الزخم: أحداث آخر 7 أيام مقابل المعدل الأسبوعي في الأسابيع الأربعة السابقة (مقياس قريب من z)
export function momentum(events, iso, aspect, now = Date.now()) {
  const D = 864e5; let n7 = 0, p7 = 0, nb = 0, pb = 0; const items = [];
  for (const e of events || []) {
    if (e.c !== iso || e.a !== aspect) continue;
    const age = (now - Date.parse(e.t)) / D; if (age < 0 || age > 35) continue;
    if (age <= 7) { if (e.pol < 0) n7++; else p7++; items.push(e); }
    else { if (e.pol < 0) nb++; else pb++; }
  }
  const bn = nb / 4, bp = pb / 4;
  const neg = clamp((n7 - bn) / Math.sqrt(bn + 1), -3, 3), pos = clamp((p7 - bp) / Math.sqrt(bp + 1), -3, 3);
  return {neg, pos, n7, p7, base_neg: +bn.toFixed(2), base_pos: +bp.toFixed(2), n: n7 + p7 + nb + pb, items};
}

// المخاطر البنيوية لكل جانب (0 = أدنى خطر، 1 = أعلاه) من المؤشرات المؤسسية، مع بيان كل مكوّن ووزنه
export function structural(c, wars) {
  const I = c.inputs || {};
  const pv = I.wgi_pv?.v != null ? clamp((2.5 - I.wgi_pv.v) / 5, 0, 1) : null; // الاستقرار السياسي وغياب العنف (البنك الدولي)
  const ge = I.wgi_ge?.v != null ? clamp((2.5 - I.wgi_ge.v) / 5, 0, 1) : null; // فاعلية الحكومة
  const g = I.growth?.v, pi = I.inflation?.v, u = I.unemployment?.v, debt = I.debt?.v, mil = I.milex?.v;
  const eparts = [g != null ? sig((1.5 - g) / 2) : null, pi != null ? sig((pi - 6) / 6) : null, u != null ? sig((u - 8) / 5) : null, debt != null ? sig((debt - 90) / 30) : null];
  const econ = avg(eparts);
  const social = avg([eparts[1], eparts[2]]);
  const war = warExposure(c.id, wars);
  const ci = c.ci_index; // مؤشر الاستقرار اليومي من قسم «الأوضاع في الدول» (0..100 الأعلى أكثر استقراراً)
  const cid = k => ci?.dims?.[k]?.score != null ? clamp(1 - ci.dims[k].score / 100, 0, 1) : (ci?.score != null ? clamp(1 - ci.score / 100, 0, 1) : null);
  const mix = parts => { let s = 0, w = 0; const used = []; for (const [k, v, wt] of parts) { if (v == null || isNaN(v)) continue; s += v * wt; w += wt; used.push({k, v: +v.toFixed(3), w: wt}); } return {s: w ? s / w : null, used}; };
  return {
    war,
    politics: mix([['wgi_pv', pv, 0.45], ['wgi_ge', ge, 0.15], ['ci_politics', cid('politics'), 0.4]]),
    military: mix([['war', war.s, 0.65], ['wgi_pv', pv, 0.2], ['milex', mil != null ? sig((mil - 3) / 1.5) : null, 0.15]]),
    security: mix([['wgi_pv', pv, 0.45], ['war', war.s, 0.3], ['ci_security', cid('security'), 0.25]]),
    economy: mix([['econ', econ, 0.8], ['ci_economy', cid('economy'), 0.2]]),
    protests: mix([['wgi_pv', pv, 0.5], ['social', social, 0.35], ['wgi_ge', ge, 0.15]]),
    foreign: mix([['war', war.s, 0.55], ['wgi_pv', pv, 0.45]])
  };
}

const ME = new Set(['QAT', 'SAU', 'ARE', 'KWT', 'BHR', 'OMN', 'EGY', 'LBY', 'ISR', 'PSE', 'SDN', 'YEM', 'SYR', 'LBN', 'IRN', 'IRQ', 'JOR', 'TUR']);
function scenShift(sc, iso, aspect, warS, oilRent) {
  const exporter = (oilRent || 0) >= 5;
  switch (sc) {
    case 'optimistic': return -0.6;
    case 'pessimistic': return 0.6;
    case 'escalation': if (!(ME.has(iso) || warS >= 0.3)) return 0; return ['military', 'security', 'foreign'].includes(aspect) ? 0.9 : aspect === 'economy' ? (exporter ? 0.1 : 0.4) : 0.3;
    case 'deescalation': if (warS < 0.15) return 0; return ['military', 'security', 'foreign'].includes(aspect) ? -0.8 : aspect === 'politics' ? -0.3 : 0;
    case 'oil_down': if (aspect === 'economy') return exporter ? clamp(oilRent / 20, 0.2, 1.2) : -0.15; if (aspect === 'protests' && oilRent >= 10) return 0.3; return 0;
    case 'oil_up': if (aspect === 'economy') return exporter ? -clamp(oilRent / 30, 0.1, 0.8) : 0.25; if (aspect === 'protests' && !exporter) return 0.15; return 0;
    default: return 0;
  }
}
// أثر السيناريو على النمو (نقطة مئوية)
export function growthShift(sc, oilRent) {
  const r = (oilRent || 0) / 100, exporter = (oilRent || 0) >= 5;
  switch (sc) {
    case 'optimistic': return 0.3;
    case 'pessimistic': return -0.5;
    case 'escalation': return exporter ? +(r * 100 * 0.2 * 0.35 * 0.5).toFixed(2) - 0.3 : -0.4;
    case 'deescalation': return 0.2;
    case 'oil_down': return exporter ? -(r * 100 * 0.30 * 0.35) : 0.15;
    case 'oil_up': return exporter ? (r * 100 * 0.30 * 0.35) : -0.2;
    default: return 0;
  }
}

// الحساب الكامل لدولة وجانب ومدى وسيناريو. weight: وزن الأحداث الأخيرة الذي يختاره الزائر (0..2، الافتراضي 1).
export function forecastAspect(c, aspect, {h = 30, sc = 'base', weight = 1, wars = [], events = [], now = Date.now(), S = null} = {}) {
  S = S || structural(c, wars);
  const st = S[aspect], m = momentum(events, c.id, aspect, now);
  const s = st.s == null ? 0.4 : st.s;
  const wh = Math.exp(-(h - 7) / 90); // أثر الأحداث الأخيرة يخبو مع طول المدى
  const shift = scenShift(sc, c.id, aspect, S.war.s, c.inputs?.oil_rents?.v);
  const zW = -0.9 + 2.4 * (s - 0.4) + 0.45 * weight * m.neg * wh - 0.15 * weight * m.pos * wh + shift;
  const zB = -1.4 + 0.35 * weight * m.pos * wh - 0.35 * weight * m.neg * wh + 0.6 * Math.max(0, s - 0.55) * (h / 365) - 0.5 * shift;
  const k = Math.sqrt(h / 30); // تراكم الاحتمال مع المدى (أبطأ من الخطّي)
  let pw = 1 - Math.pow(1 - sig(zW), k), pb = 1 - Math.pow(1 - sig(zB), k);
  if (pw + pb > 0.92) { const f = 0.92 / (pw + pb); pw *= f; pb *= f; }
  const ps = 1 - pw - pb;
  // نطاق الثقة: يتسع بنقص البيانات وطول المدى
  const cov = clamp((st.used.length / 3) * 0.6 + Math.min(m.n, 8) / 8 * 0.4, 0, 1);
  const hw = 0.06 + 0.12 * (1 - cov) + 0.05 * Math.log(h / 7) / Math.log(365 / 7);
  const ci = [clamp(pw - hw, 0.01, 0.99), clamp(pw + hw, 0.01, 0.99)];
  const outlook = pw >= 0.5 ? 'deteriorate' : pw >= 0.33 ? 'watch' : pb > pw && pb >= 0.3 ? 'improve' : 'stable';
  const r3 = x => Math.round(x * 1000) / 1000;
  return {aspect, h, sc, p_worse: r3(pw), p_better: r3(pb), p_stable: r3(ps), ci: ci.map(r3), outlook, color: OUTLOOK[outlook].color,
    structural: st.s == null ? null : r3(st.s), drivers: st.used, momentum: {neg: r3(m.neg), pos: r3(m.pos), n7: m.n7, p7: m.p7, base_neg: m.base_neg, base_pos: m.base_pos},
    evidence: m.items.map(e => e.id), shift, coverage: r3(cov)};
}

// التوقع الإجمالي للدولة: متوسط مرجّح للجوانب (الأمني والعسكري أثقل حين تكون الدولة طرفاً في حرب)
export function forecastCountry(c, opts = {}) {
  const S = structural(c, opts.wars || []);
  const aspects = {};
  for (const a of ASPECTS) aspects[a.id] = forecastAspect(c, a.id, {...opts, S});
  const wt = {politics: 1, military: 0.6 + S.war.s, security: 1 + 0.5 * S.war.s, economy: 1, protests: 0.7, foreign: 0.6};
  let W = 0, pw = 0, pb = 0, lo = 0, hi = 0;
  for (const a of ASPECTS) { const x = aspects[a.id], w = wt[a.id]; W += w; pw += x.p_worse * w; pb += x.p_better * w; lo += x.ci[0] * w; hi += x.ci[1] * w; }
  pw /= W; pb /= W; lo /= W; hi /= W;
  const outlook = pw >= 0.5 ? 'deteriorate' : pw >= 0.33 ? 'watch' : pb > pw && pb >= 0.3 ? 'improve' : 'stable';
  const r3 = x => Math.round(x * 1000) / 1000;
  return {p_worse: r3(pw), p_better: r3(pb), p_stable: r3(1 - pw - pb), ci: [r3(lo), r3(hi)], outlook, color: OUTLOOK[outlook].color, war: S.war, aspects};
}

// التقدير الاقتصادي الرقمي: إسقاط صندوق النقد الدولي + أثر السيناريو، ونطاق من التذبذب التاريخي للنمو (انحراف معياري لعشر سنوات)
export function economyOutlook(c, {sc = 'base', h = 365, year} = {}) {
  const I = c.inputs || {}, gs = c.series?.imf_growth || {};
  const Y = year || new Date().getUTCFullYear();
  const target = h >= 270 ? Y + 1 : Y;
  const proj = gs[target] ?? gs[Y] ?? null;
  const hist = Object.keys(gs).map(Number).filter(y => y < Y && y >= Y - 11 && y !== 2020).map(y => gs[y]).filter(v => v != null);
  const mean = avg(hist); const sd = hist.length > 3 ? Math.sqrt(avg(hist.map(v => (v - mean) ** 2))) : null;
  const shift = growthShift(sc, I.oil_rents?.v);
  if (proj == null) return null;
  const band = sd == null ? 1.5 : clamp(sd * (target > Y ? 0.75 : 0.45), 0.4, 6);
  const r1 = x => Math.round(x * 10) / 10;
  return {year: target, imf: proj, shift: r1(shift), point: r1(proj + shift), lo: r1(proj + shift - band), hi: r1(proj + shift + band), sd: sd == null ? null : r1(sd), n_hist: hist.length};
}
