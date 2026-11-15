/* مشكاة: أدوات المسلم (التقويم الهجري، حاسبة الزكاة، حاسبة المواريث، عدّاد ألفاظ القرآن، الورد اليومي والختمة).
   تُحمَّل عند أول فتح من app.js، وتعمل كلها دون اتصال. الأرقام والتواريخ بصيغة واحدة: يوم/شهر/سنة. */
(function () {
  'use strict';
  const A = LANG === 'ar', X = (a, e) => (A ? a : e);
  const DAY = 864e5, MS = Math.floor;
  const NF2 = new Intl.NumberFormat(A ? 'ar-EG' : 'en-US', { maximumFractionDigits: 2 });
  const num = x => NF2.format(x);
  const YF = new Intl.NumberFormat(A ? 'ar-EG' : 'en-US', { useGrouping: false }), ny = v => YF.format(v);
  const pn = s => { const v = parseFloat(String(s == null ? '' : s).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٫،,]/g, m => (m === '٫' ? '.' : '')).replace(/\s/g, '')); return isFinite(v) && v > 0 ? v : 0; };
  const p2 = v => String(v).padStart(2, '0');
  const dstr = ms => { const d = new Date(ms); return `${n(d.getUTCDate())}/${n(d.getUTCMonth() + 1)}/${ny(d.getUTCFullYear())}`; };
  const ymd = (d = new Date()) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  const todayMs = () => { const d = new Date(); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12); };
  const css = document.createElement('style');
  css.textContent = `
.tl-grid>*,#tl-root>*{min-width:0}#tl-root .chip{white-space:normal;max-width:100%;text-align:start}
.tl-note{border-inline-start:4px solid var(--saffron);background:var(--saffron-soft);border-radius:10px;padding:10px 14px;font-size:.92rem;line-height:1.8}
.tl-warn{border-inline-start:4px solid #b3392f;background:color-mix(in srgb,#b3392f 10%,var(--sheet));border-radius:10px;padding:10px 14px;font-size:.92rem;line-height:1.8}
.tl-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.tl-f{display:flex;flex-direction:column;gap:4px;min-width:0}.tl-f label{font-size:.86rem;color:var(--muted)}.tl-f .field{width:100%}
.tl-res{background:var(--accent-soft);border-radius:var(--r);padding:14px 16px;line-height:1.9}
.tl-res b.big{font-size:1.5rem;color:var(--accent);font-variant-numeric:tabular-nums}
.tl-src{font-size:.82rem;color:var(--muted)}
.tl-tbl{width:100%;border-collapse:collapse;font-size:.93rem}.tl-tbl th,.tl-tbl td{padding:8px 6px;border-bottom:1px solid var(--line);text-align:start;vertical-align:top}.tl-tbl th{color:var(--muted);font-weight:500;font-size:.84rem}
.tl-scroll{overflow-x:auto}
.hc-head{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;text-align:center;font-size:.8rem;color:var(--muted)}
.hc-cal{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
.hc-day{position:relative;border:1px solid var(--line);background:var(--sheet);border-radius:10px;padding:6px 2px 4px;min-height:58px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:1px;color:inherit;font:inherit;min-width:0}
.hc-day b{font-size:1.12rem;font-weight:600;line-height:1.2}.hc-day small{font-size:.68rem;color:var(--muted)}
.hc-day.blank{visibility:hidden}.hc-day.today{outline:2px solid var(--accent)}.hc-day[aria-pressed="true"]{background:var(--accent-soft);border-color:var(--accent)}
.hc-dots{display:flex;gap:3px;height:6px}.hc-dots i{width:6px;height:6px;border-radius:50%;display:block}
.hc-dots .o{background:var(--saffron)}.hc-dots .f{background:var(--ok,#1f7a4d)}.hc-dots .x{background:#b3392f}
.hc-leg{display:flex;flex-wrap:wrap;gap:12px;font-size:.82rem;color:var(--muted)}.hc-leg i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-inline-end:5px;vertical-align:baseline}
.wd-bar{display:flex;align-items:flex-end;gap:4px;height:70px}.wd-bar div{flex:1;background:var(--accent);border-radius:4px 4px 0 0;min-height:2px;opacity:.85}
.wd-heat{display:grid;grid-template-columns:repeat(10,1fr);gap:4px}.wd-heat i{aspect-ratio:1;border-radius:4px;background:var(--line);display:block}
.wd-badge{display:flex;gap:10px;align-items:center;border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--sheet)}.wd-badge.off{opacity:.5;filter:grayscale(1)}
.wd-badge .ic{font-size:1.6rem;line-height:1}
.lz-bars{display:flex;align-items:flex-end;gap:1px;height:110px;direction:ltr}.lz-bars i{flex:1;background:var(--accent);min-width:1px;opacity:.85;display:block;cursor:pointer}.lz-bars i.md{background:var(--saffron)}
.lz-lg{display:flex;justify-content:space-between;font-size:.76rem;color:var(--muted);direction:ltr}
.tl-check{display:flex;align-items:center;gap:10px;padding:9px 4px;border-bottom:1px solid var(--line)}.tl-check input{width:20px;height:20px;accent-color:var(--accent)}.tl-check .x{margin-inline-start:auto;border:0;background:transparent;cursor:pointer;color:var(--muted);font-size:1.1rem}
`;
  document.head.appendChild(css);
  const head = (eb, h, lead) => `<div><div class="eyebrow">${eb}</div><h1>${h}</h1><p class="lead">${lead}</p></div>`;
  const quran = (s, a) => { const i = idxOf(s, a); return i < 0 ? '' : `<div class="panel" style="padding:10px 14px">${ayahHTML(i, null, false)}<div class="tl-src">${refLink(i)}</div></div>`; };
  const field = (id, label, val = '', ph = '', mode = 'decimal') => `<div class="tl-f"><label for="${id}">${label}</label><input class="field" id="${id}" type="text" inputmode="${mode}" autocomplete="off" value="${esc(val)}" placeholder="${esc(ph)}"></div>`;

  /* ============================================================ التقويم الهجري */
  const HM_AR = ['محرّم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوّال', 'ذو القعدة', 'ذو الحجة'];
  const HM_EN = ['Muharram', 'Safar', 'Rabi‘ al-awwal', 'Rabi‘ al-thani', 'Jumada al-ula', 'Jumada al-akhirah', 'Rajab', 'Sha‘ban', 'Ramadan', 'Shawwal', 'Dhu al-Qa‘dah', 'Dhu al-Hijjah'];
  const hmName = m => (A ? HM_AR : HM_EN)[m - 1];
  const WD_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'], WD_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const wdName = w => (A ? WD_AR : WD_EN)[w];
  const hfmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC' });
  let adj = 0; try { adj = Math.max(-2, Math.min(2, parseInt(localStorage.getItem('mishkat:hadj'), 10) || 0)); } catch (e) {}
  const hp = ms => { const o = {}; hfmt.formatToParts(ms + adj * DAY).forEach(x => { o[x.type] = parseInt(x.value, 10); }); return { d: o.day, m: o.month, y: o.year }; };
  const hstr = h => `${n(h.d)} ${hmName(h.m)} ${ny(h.y)}${A ? ' هـ' : ' AH'}`;
  let starts = new Map(); // إزاحة الشهر عن الشهر الحالي → بداية الشهر (UTC ms)
  const monthLen = s => (hp(s + 29 * DAY).d === 1 ? 29 : 30);
  function startOf(off) {
    if (!starts.size) { const t = todayMs(); starts.set(0, t - (hp(t).d - 1) * DAY); }
    if (starts.has(off)) return starts.get(off);
    if (off > 0) { let k = Math.max(...[...starts.keys()].filter(x => x >= 0)); while (k < off) { starts.set(k + 1, starts.get(k) + monthLen(starts.get(k)) * DAY); k++; } }
    else { let k = Math.min(...[...starts.keys()].filter(x => x <= 0)); while (k > off) { const e = starts.get(k) - DAY, len = hp(e).d; starts.set(k - 1, e - (len - 1) * DAY); k--; } }
    return starts.get(off);
  }
  const hmOffset = (y, m) => { const c = hp(todayMs()); return (y - c.y) * 12 + (m - c.m); };
  /* المناسبات: m الشهر، d من، e إلى، t العنوان، x الشرح، s المصدر، f حكم الصيام */
  const OCC = [
    { m: 1, d: 1, t: ['رأس السنة الهجرية', 'Hijri new year'], x: ['أول أيام العام الهجري؛ اعتمد الصحابة التأريخ بالهجرة النبوية في خلافة عمر بن الخطاب رضي الله عنه. ولا يُعرف لليوم عبادة مخصوصة، وهو وقت حسن لمحاسبة النفس وتجديد العزم.', 'The first day of the Hijri year. The Companions adopted dating from the Prophet’s migration in the caliphate of ‘Umar. No special act of worship is established for it; it is a good time to take stock of oneself.'], s: ['خبر تاريخي (فتح الباري، كتاب مناقب الأنصار: التأريخ)', 'Historical report (Fath al-Bari)'] },
    { m: 1, d: 9, t: ['تاسوعاء', 'Tasu‘a (9th of Muharram)'], f: 'rec', x: ['يُستحب صيامه مع عاشوراء. قال النبي ﷺ: «لئن بقيتُ إلى قابلٍ لأصومنّ التاسع».', 'Fasting it with ‘Ashura is recommended. The Prophet ﷺ said: “If I live to next year I will surely fast the ninth.”'], s: ['صحيح مسلم، كتاب الصيام', 'Sahih Muslim, Book of Fasting'] },
    { m: 1, d: 10, t: ['يوم عاشوراء', '‘Ashura'], f: 'rec', x: ['صيامه يكفّر السنة الماضية، قال النبي ﷺ: «أحتسبُ على الله أن يكفّر السنة التي قبله». وصامه موسى عليه السلام شكراً لله على نجاته من فرعون، وصامه النبي ﷺ وأمر بصيامه.', 'Fasting it expiates the previous year’s minor sins. The Prophet ﷺ said: “I hope from Allah that it expiates the year before it.” Musa fasted it in gratitude for the deliverance from Pharaoh, and the Prophet ﷺ fasted it and urged fasting it.'], s: ['صحيح مسلم، كتاب الصيام (حديث أبي قتادة)', 'Sahih Muslim, Book of Fasting (hadith of Abu Qatadah)'] },
    { m: 9, d: 1, t: ['أول رمضان', 'First of Ramadan'], f: 'wajib', x: ['بداية شهر الصيام. قال النبي ﷺ: «إذا دخل رمضان فُتّحت أبواب الجنة وغُلّقت أبواب النار وصُفّدت الشياطين».', 'The start of the month of fasting. The Prophet ﷺ said: “When Ramadan begins, the gates of Paradise are opened, the gates of Hell are closed, and the devils are chained.”'], s: ['متفق عليه', 'Agreed upon (Bukhari and Muslim)'], q: [2, 185] },
    { m: 9, d: 21, e: 30, t: ['العشر الأواخر من رمضان', 'Last ten days of Ramadan'], f: 'wajib', x: ['كان النبي ﷺ إذا دخل العشر أحيا ليله وأيقظ أهله وشدّ المئزر، أي اجتهد في العبادة. وفيها ليلة القدر، «اطلبوها في الوتر من العشر الأواخر»، أي ليالي ٢١ و٢٣ و٢٥ و٢٧ و٢٩. وليلة كل يوم تبدأ عند غروب شمس اليوم الذي قبله. ويُسنّ الاعتكاف.', 'When the last ten began, the Prophet ﷺ revived his nights, woke his family and tightened his waist-wrapper, meaning he exerted himself in worship. Laylat al-Qadr is among them: “Seek it in the odd nights of the last ten”, i.e. nights 21, 23, 25, 27 and 29. Each night begins at sunset of the previous day. I‘tikaf is sunnah.'], s: ['متفق عليه', 'Agreed upon (Bukhari and Muslim)'], q: [97, 3] },
    { m: 10, d: 1, t: ['عيد الفطر', 'Eid al-Fitr'], f: 'forb', x: ['يوم عيد، ويحرم صيامه. تُخرج زكاة الفطر قبل صلاة العيد. ويُكبَّر من غروب شمس ليلة العيد حتى صلاته: ﴿وَلِتُكْمِلُوا الْعِدَّةَ وَلِتُكَبِّرُوا اللَّهَ عَلَىٰ مَا هَدَاكُمْ﴾.', 'A day of Eid; fasting it is forbidden. Zakat al-Fitr is paid before the Eid prayer. Takbir is said from sunset of the eve until the prayer.'], s: ['متفق عليه (النهي عن صيام يومي الفطر والنحر)', 'Agreed upon (prohibition of fasting the two Eids)'], q: [2, 185] },
    { m: 10, d: 2, e: 30, t: ['ست من شوّال', 'Six days of Shawwal'], f: 'rec', x: ['قال النبي ﷺ: «من صام رمضان ثم أتبعه ستاً من شوّال كان كصيام الدهر». ويجوز صيامها متفرقة أو متتابعة، والأفضل المبادرة بها.', 'The Prophet ﷺ said: “Whoever fasts Ramadan then follows it with six days of Shawwal, it is as if he fasted the whole year.” They may be consecutive or separate; it is better to hasten to them.'], s: ['صحيح مسلم، كتاب الصيام', 'Sahih Muslim, Book of Fasting'] },
    { m: 12, d: 1, e: 9, t: ['عشر ذي الحجة', 'First ten days of Dhu al-Hijjah'], f: 'rec', x: ['قال النبي ﷺ: «ما العمل في أيامٍ أفضلُ منها في هذه»، قالوا: ولا الجهاد؟ قال: «ولا الجهاد، إلا رجلٌ خرج بنفسه وماله فلم يرجع بشيء». وفيها التكبير والتهليل والتحميد، ويُستحب الصيام والصدقة وكثرة العمل الصالح. وأقسم الله بها في قوله ﴿وَلَيَالٍ عَشْرٍ﴾ على قول كثير من المفسرين.', 'The Prophet ﷺ said: “There are no days in which good deeds are more beloved to Allah than these ten days.” They asked: Not even jihad? He said: “Not even jihad, except a man who goes out with his self and wealth and returns with nothing.” Takbir, tahlil and tahmid, fasting, charity and all good deeds are recommended.'], s: ['صحيح البخاري، كتاب العيدين: فضل العمل في أيام التشريق', 'Sahih al-Bukhari, Book of the Two Eids'], q: [89, 2] },
    { m: 12, d: 9, t: ['يوم عرفة', 'Day of ‘Arafah'], f: 'rec', x: ['يُستحب صيامه لغير الحاج؛ قال النبي ﷺ: «صيام يوم عرفة أحتسب على الله أن يكفّر السنة التي قبله والسنة التي بعده». أما الحاج بعرفة فالأفضل له الفطر ليتقوّى على الدعاء. وهو يوم إكمال الدين: ﴿الْيَوْمَ أَكْمَلْتُ لَكُمْ دِينَكُمْ﴾.', 'Fasting it is recommended for non-pilgrims: “Fasting the Day of ‘Arafah, I hope from Allah, expiates the year before and the year after.” The pilgrim at ‘Arafah does better not to fast, to be strong for supplication.'], s: ['صحيح مسلم، كتاب الصيام', 'Sahih Muslim, Book of Fasting'], q: [5, 3] },
    { m: 12, d: 10, t: ['عيد الأضحى', 'Eid al-Adha'], f: 'forb', x: ['يوم النحر، ويحرم صيامه. تُصلّى صلاة العيد ثم تُذبح الأضحية، ووقتها إلى آخر أيام التشريق.', 'The Day of Sacrifice; fasting it is forbidden. Eid prayer, then the sacrifice, whose time lasts until the end of the Tashriq days.'], s: ['متفق عليه', 'Agreed upon (Bukhari and Muslim)'], q: [108, 2] },
    { m: 12, d: 11, e: 13, t: ['أيام التشريق', 'Days of Tashriq'], f: 'forb', x: ['قال النبي ﷺ: «أيام التشريق أيام أكلٍ وشربٍ وذكرٍ لله». ويحرم صيامها إلا للحاج الذي لم يجد الهدي في التمتع والقِران.', 'The Prophet ﷺ said: “The days of Tashriq are days of eating, drinking and remembrance of Allah.” Fasting them is forbidden except for the pilgrim who could not find a sacrificial animal.'], s: ['صحيح مسلم، كتاب الصيام', 'Sahih Muslim, Book of Fasting'], q: [2, 203] },
  ];
  const MONTH_NOTE = {
    1: ['من الأشهر الحرم. وأفضل الصيام بعد رمضان صيام شهر الله المحرّم (صحيح مسلم).', 'One of the sacred months. The best fasting after Ramadan is in Allah’s month of Muharram (Sahih Muslim).'],
    7: ['من الأشهر الحرم ﴿مِنْهَا أَرْبَعَةٌ حُرُمٌ﴾. ولا يصح حديث بتخصيص صيام أو صلاة في ليلة معيّنة منه.', 'A sacred month (9:36). No sound hadith singles out a particular fast or night prayer in it.'],
    8: ['كان النبي ﷺ يصوم من شعبان أكثر من غيره من الشهور (متفق عليه).', 'The Prophet ﷺ fasted more in Sha‘ban than in other months (agreed upon).'],
    9: ['شهر الصيام والقرآن: ﴿شَهْرُ رَمَضَانَ الَّذِي أُنزِلَ فِيهِ الْقُرْآنُ﴾.', 'The month of fasting and the Quran (2:185).'],
    11: ['من الأشهر الحرم.', 'A sacred month.'],
    12: ['من الأشهر الحرم، وفيه الحج.', 'A sacred month, the month of Hajj.'],
  };
  const OTHER_NOTE = [['الأيام البيض: ١٣ و١٤ و١٥ من كل شهر هجري، يُستحب صيامها (رواه الترمذي والنسائي وحسّنه الترمذي).', 'The White Days, the 13th, 14th and 15th of each Hijri month: fasting them is recommended (Tirmidhi and Nasa’i; Tirmidhi graded it hasan).'], ['الاثنين والخميس: تُعرض الأعمال فيهما، فيُستحب صيامهما (رواه الترمذي وحسّنه، وأصله في صحيح مسلم).', 'Monday and Thursday: deeds are presented on them, so fasting them is recommended (Tirmidhi, hasan; its basis is in Sahih Muslim).']];
  function dayInfo(h, wd) { // wd: 0 = الأحد
    const occ = OCC.filter(o => o.m === h.m && h.d >= o.d && h.d <= (o.e || o.d));
    let fast = '', why = [];
    if (h.m === 9) { fast = 'wajib'; why.push(X('رمضان: الصيام فرض', 'Ramadan: fasting is obligatory')); }
    const forb = occ.some(o => o.f === 'forb');
    if (forb) { fast = 'forb'; why.push(X('يحرم صيام هذا اليوم', 'Fasting this day is forbidden')); }
    else if (fast !== 'wajib') {
      const rec = [];
      occ.forEach(o => { if (o.f === 'rec') rec.push(o.t[A ? 0 : 1]); });
      if ([13, 14, 15].includes(h.d)) rec.push(X('من الأيام البيض', 'a White Day'));
      if (wd === 1 || wd === 4) rec.push(wd === 1 ? X('يوم الاثنين', 'Monday') : X('يوم الخميس', 'Thursday'));
      if (h.m === 8 && !rec.length) rec.push(X('شعبان (كان النبي ﷺ يكثر الصيام فيه)', 'Sha‘ban (the Prophet ﷺ fasted much of it)'));
      if (h.m === 1 && !rec.length) rec.push(X('المحرّم (أفضل الصيام بعد رمضان)', 'Muharram (the best fasting after Ramadan)'));
      if (rec.length) { fast = 'rec'; why.push(X('يُستحب صيامه: ', 'Recommended: ') + rec.join(X('، ', ', '))); }
    }
    if (wd === 5 && fast !== 'wajib' && fast !== 'forb') why.push(X('الجمعة: يُكره إفرادها بالصيام إلا أن يوافق عادةً أو يصوم قبلها أو بعدها (متفق عليه).', 'Friday: singling it out for fasting is disliked unless it coincides with a habit or is joined to the day before or after (agreed upon).'));
    return { occ, fast, why };
  }
  const fastChip = f => f === 'wajib' ? `<span class="chip ok">${X('صيام واجب', 'Obligatory fast')}</span>` : f === 'rec' ? `<span class="chip ok">${X('يُستحب صيامه', 'Fast recommended')}</span>` : f === 'forb' ? `<span class="chip" style="color:#b3392f;border-color:#b3392f">${X('لا يُصام', 'Do not fast')}</span>` : '';
  function dayCard(ms) {
    const h = hp(ms), wd = new Date(ms).getUTCDay(), inf = dayInfo(h, wd);
    return `<section class="panel stack tight" id="hc-card"><div class="pill-row"><span class="chip acc">${esc(wdName(wd))}</span><span class="chip">${esc(hstr(h))}</span><span class="chip">${dstr(ms)}</span>${fastChip(inf.fast)}</div>
      ${inf.why.map(w => `<p style="margin:0;font-size:.93rem">${esc(w)}</p>`).join('')}
      ${inf.occ.map(o => `<div class="stack tight"><h3 style="margin:6px 0 0">${esc(o.t[A ? 0 : 1])}</h3><p style="margin:0;line-height:1.9">${esc(o.x[A ? 0 : 1])}</p><div class="tl-src">${esc(o.s[A ? 0 : 1])}</div>${o.q ? quran(o.q[0], o.q[1]) : ''}</div>`).join('')}
      ${MONTH_NOTE[h.m] ? `<p class="tl-src" style="margin:0">${esc(MONTH_NOTE[h.m][A ? 0 : 1])}</p>` : ''}
      ${!inf.occ.length && !inf.why.length ? `<p class="muted" style="margin:0">${X('يوم عادي لا مناسبة فيه.', 'An ordinary day with no particular occasion.')}</p>` : ''}</section>`;
  }
  /* ملخص الصيام ليوم: يُستعمل في التذكير أيضاً */
  function fastOf(ms) { const h = hp(ms), wd = new Date(ms).getUTCDay(), inf = dayInfo(h, wd); return { h, wd, f: inf.fast, why: inf.why, occ: inf.occ }; }
  function hijriView() {
    let off = 0, sel = todayMs();
    const draw = () => {
      starts = starts.size ? starts : new Map();
      const s = startOf(off), h0 = hp(s), len = monthLen(s), wd0 = new Date(s).getUTCDay(), lead = (wd0 + 1) % 7; // السبت أول الأسبوع
      const order = [6, 0, 1, 2, 3, 4, 5];
      const g1 = new Date(s), g2 = new Date(s + (len - 1) * DAY), gm = d => A ? new Intl.DateTimeFormat('ar-EG', { month: 'long', timeZone: 'UTC' }).format(d) : new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' }).format(d);
      const t = todayMs();
      let cells = ''; for (let i = 0; i < lead; i++) cells += '<span class="hc-day blank"></span>';
      for (let d = 1; d <= len; d++) {
        const ms = s + (d - 1) * DAY, h = { d, m: h0.m, y: h0.y }, wdk = new Date(ms).getUTCDay(), inf = dayInfo(h, wdk), dots = (inf.occ.length ? '<i class="o"></i>' : '') + (inf.fast === 'rec' ? '<i class="f"></i>' : '') + (inf.fast === 'forb' ? '<i class="x"></i>' : '');
        cells += `<button type="button" class="hc-day${ms === t ? ' today' : ''}" data-ms="${ms}" aria-pressed="${ms === sel}" aria-label="${esc(wdName(wdk) + ' ' + hstr(h))}"><b>${n(d)}</b><small>${n(new Date(ms).getUTCDate())}</small><span class="hc-dots">${dots}</span></button>`;
      }
      $('#hc-cal').innerHTML = cells;
      $('#hc-title').innerHTML = `<b>${esc(hmName(h0.m))} ${ny(h0.y)}${A ? ' هـ' : ' AH'}</b><span class="muted" style="font-size:.85rem"> · ${esc(gm(g1))}${gm(g1) !== gm(g2) ? ' / ' + esc(gm(g2)) : ''} ${ny(new Date(s).getUTCFullYear())}</span>`;
      $('#hc-card').outerHTML = dayCard(sel);
      const mn = MONTH_NOTE[h0.m]; $('#hc-mnote').innerHTML = mn ? esc(mn[A ? 0 : 1]) : '';
    };
    const c = hp(todayMs()), tf = fastOf(todayMs() + DAY), td = fastOf(todayMs());
    const remOn = !!(() => { try { return localStorage.getItem('mishkat:fastremind'); } catch (e) { return ''; } })();
    const list = OCC.map(o => `<tr><td><b>${n(o.d)}${o.e ? '–' + n(o.e) : ''} ${esc(hmName(o.m))}</b></td><td>${esc(o.t[A ? 0 : 1])}</td><td>${fastChip(o.f)}</td></tr>`).join('');
    V(`<div class="stack" id="tl-root">
      ${head(X('التقويم الهجري', 'Hijri calendar'), X('الأيام الفاضلة والمناسبات وتذكير الصيام', 'Blessed days, occasions and fasting reminders'), X('تقويم أم القرى محسوباً على جهازك، تُعرف منه الأيام الفاضلة والأيام البيض والاثنان والخميس وأيام لا يجوز صيامها، مع الدليل لكل مناسبة. يعمل دون إنترنت.', 'The Umm al-Qura calendar computed on your device, showing blessed days, White Days, Mondays and Thursdays and days on which fasting is forbidden, with the evidence for each. Works offline.'))}
      <section class="panel stack tight"><div class="pill-row"><span class="chip acc">${X('اليوم', 'Today')}: ${esc(wdName(td.wd))} ${esc(hstr(td.h))} · ${dstr(todayMs())}</span>${fastChip(td.f)}</div>
        <div class="tl-note" style="${tf.f === 'rec' || tf.f === 'wajib' ? '' : 'border-color:var(--line);background:var(--bg)'}"><b>${X('غداً', 'Tomorrow')}</b> (${esc(wdName(tf.wd))} ${esc(hstr(tf.h))}): ${tf.f === 'wajib' ? X('من رمضان، فاستعدّ للصيام.', 'in Ramadan; prepare to fast.') : tf.f === 'rec' ? esc(tf.why[0] || '') : tf.f === 'forb' ? X('لا يُصام غداً.', 'do not fast tomorrow.') : X('لا صيام مسنون غداً.', 'no recommended fast tomorrow.')}</div>
        <div class="toolbar"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="hc-rem" ${remOn ? 'checked' : ''}> ${X('ذكّرني بصيام الغد عند فتح مشكاة', 'Remind me of tomorrow’s fast when I open Mishkat')}</label></div>
        <p class="tl-src" style="margin:0">${X('يظهر التذكير في أعلى الشاشة عند فتح التطبيق، ولا يحتاج إلى إذن إشعارات.', 'The reminder appears at the top of the screen when the app opens; no notification permission is needed.')}</p></section>
      <section class="panel stack"><div class="toolbar" style="justify-content:space-between"><button class="btn" id="hc-prev" type="button" aria-label="${X('الشهر السابق', 'Previous month')}">${A ? '›' : '‹'}</button><div id="hc-title" style="text-align:center"></div><button class="btn" id="hc-next" type="button" aria-label="${X('الشهر التالي', 'Next month')}">${A ? '‹' : '›'}</button></div>
        <div class="toolbar"><button class="btn" id="hc-today" type="button">${X('هذا الشهر', 'This month')}</button><button class="btn" id="hc-py" type="button">${X('السنة السابقة', 'Prev. year')}</button><button class="btn" id="hc-ny" type="button">${X('السنة التالية', 'Next year')}</button></div>
        <div class="hc-head">${[6, 0, 1, 2, 3, 4, 5].map(w => `<span>${esc(wdName(w).slice(0, A ? 4 : 3))}</span>`).join('')}</div><div class="hc-cal" id="hc-cal"></div>
        <div class="hc-leg"><span><i style="background:var(--saffron)"></i>${X('مناسبة', 'Occasion')}</span><span><i style="background:var(--ok,#1f7a4d)"></i>${X('يُستحب صيامه', 'Fast recommended')}</span><span><i style="background:#b3392f"></i>${X('لا يُصام', 'No fasting')}</span></div>
        <p class="tl-src" id="hc-mnote" style="margin:0"></p></section>
      <section class="panel stack tight" id="hc-card"></section>
      <div class="cols">
        <section class="panel stack"><h2>${X('تحويل التاريخ', 'Date converter')}</h2>
          <div class="tl-grid"><div class="tl-f"><label for="cv-g">${X('ميلادي', 'Gregorian')}</label><input class="field" id="cv-g" type="date" value="${new Date().getFullYear()}-${p2(new Date().getMonth() + 1)}-${p2(new Date().getDate())}"></div><div class="tl-f" style="justify-content:flex-end"><span class="chip gold" id="cv-gh" style="align-self:flex-start"></span></div></div>
          <div class="tl-grid">${field('cv-hd', X('اليوم', 'Day'), String(c.d), '', 'numeric')}${field('cv-hm', X('الشهر (١–١٢)', 'Month (1–12)'), String(c.m), '', 'numeric')}${field('cv-hy', X('السنة الهجرية', 'Hijri year'), String(c.y), '', 'numeric')}</div>
          <div><span class="chip gold" id="cv-hg"></span></div>
          <div class="tl-f"><label for="hc-adj">${X('ضبط التاريخ برؤية بلدك (±٢ يوم)', 'Adjust to your local moon sighting (±2 days)')}</label><select class="field" id="hc-adj">${[-2, -1, 0, 1, 2].map(v => `<option value="${v}" ${v === adj ? 'selected' : ''}>${v === 0 ? X('تقويم أم القرى كما هو', 'Umm al-Qura as is') : (v > 0 ? '+' : '−') + n(Math.abs(v)) + X(' يوم', ' day(s)')}</option>`).join('')}</select></div>
          <p class="tl-src" style="margin:0">${X('تقويم أم القرى حسابي، وقد يختلف بيوم عن إعلان بلدك لدخول الشهر؛ فاضبطه من هنا إن اختلف.', 'The Umm al-Qura calendar is calculated and may differ by a day from your country’s announcement; adjust it here if it does.')}</p></section>
        <section class="panel stack"><h2>${X('مناسبات السنة', 'Occasions of the year')}</h2><div class="tl-scroll"><table class="tl-tbl"><tbody>${list}</tbody></table></div>
          ${OTHER_NOTE.map(x => `<p class="tl-src" style="margin:0">${esc(x[A ? 0 : 1])}</p>`).join('')}
          <p class="tl-src" style="margin:0">${X('لم نُدرج ليلة الإسراء ولا ليلة النصف من شعبان ولا المولد النبوي بين الأيام الفاضلة لعدم ثبوت دليل صحيح يخصّها بعبادة، وفيها خلاف بين أهل العلم. ومن أراد الخروج منه فليراجع أهل العلم في بلده.', 'We have not listed the Night Journey, the middle of Sha‘ban or the Prophet’s birthday among the blessed days because no sound evidence assigns them a specific act of worship, and scholars differ about them. Consult a scholar in your country.')}</p></section>
      </div>
      <p class="tl-src">${X('الأحكام هنا إرشادية، ولا تغني عن سؤال أهل العلم.', 'The rulings here are guidance and do not replace asking a scholar.')}</p></div>`);
    draw();
    const upd = () => draw();
    $('#hc-prev').onclick = () => { off--; upd(); }; $('#hc-next').onclick = () => { off++; upd(); };
    $('#hc-py').onclick = () => { off -= 12; upd(); }; $('#hc-ny').onclick = () => { off += 12; upd(); };
    $('#hc-today').onclick = () => { off = 0; sel = todayMs(); upd(); };
    $('#hc-cal').onclick = e => { const b = e.target.closest('.hc-day[data-ms]'); if (!b) return; sel = +b.dataset.ms; $$('.hc-day').forEach(x => x.setAttribute('aria-pressed', x === b)); $('#hc-card').outerHTML = dayCard(sel); };
    $('#hc-rem').onchange = e => { try { e.target.checked ? localStorage.setItem('mishkat:fastremind', '1') : localStorage.removeItem('mishkat:fastremind'); } catch (er) {} toast(e.target.checked ? X('سيظهر تذكير الصيام عند فتح التطبيق', 'The fasting reminder is on') : X('أُوقف تذكير الصيام', 'The fasting reminder is off')); };
    $('#hc-adj').onchange = e => { adj = +e.target.value; try { localStorage.setItem('mishkat:hadj', String(adj)); } catch (er) {} starts = new Map(); hijriView(); };
    const cvG = () => { const v = $('#cv-g').value.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!v) { $('#cv-gh').textContent = ''; return; } const ms = Date.UTC(+v[1], +v[2] - 1, +v[3], 12); $('#cv-gh').textContent = `${dstr(ms)} = ${hstr(hp(ms))}`; };
    const cvH = () => { const d = MS(pn($('#cv-hd').value)), m = MS(pn($('#cv-hm').value)), y = MS(pn($('#cv-hy').value)); if (!(d >= 1 && d <= 30 && m >= 1 && m <= 12 && y >= 1300 && y <= 1600)) { $('#cv-hg').textContent = X('أدخل يوماً وشهراً وسنة هجرية صحيحة (١٣٠٠–١٦٠٠).', 'Enter a valid Hijri day, month and year (1300–1600).'); return; } const o = hmOffset(y, m), s = startOf(o); if (d > monthLen(s)) { $('#cv-hg').textContent = X('هذا الشهر ٢٩ يوماً.', 'This month has 29 days.'); return; } const ms = s + (d - 1) * DAY; $('#cv-hg').textContent = `${n(d)} ${hmName(m)} ${ny(y)} = ${dstr(ms)} (${wdName(new Date(ms).getUTCDay())})`; };
    $('#cv-g').oninput = cvG; ['#cv-hd', '#cv-hm', '#cv-hy'].forEach(s => { $(s).oninput = cvH; }); cvG(); cvH();
  }
  /* تذكير الصيام عند فتح التطبيق، مرة في اليوم */
  function remind() {
    try {
      if (!localStorage.getItem('mishkat:fastremind')) return;
      const k = ymd(); if (localStorage.getItem('mishkat:fastremind-last') === k) return;
      localStorage.setItem('mishkat:fastremind-last', k);
      const t = fastOf(todayMs() + DAY); if (t.f !== 'rec') return;
      toast(X('تذكير: ', 'Reminder: ') + X('غداً ', 'tomorrow ') + wdName(t.wd) + ' — ' + (t.why[0] || ''));
    } catch (e) {}
  }

  /* ============================================================ حاسبة الزكاة */
  const SAA_KG = 2.04; // الصاع النبوي بالوزن (قمح) تقريباً
  const camelDue = c => {
    if (c < 5) return { t: X('لا زكاة', 'None'), z: true };
    if (c <= 24) { const g = Math.floor(c / 5); return { t: X(`${n(g)} من الغنم (شاة عن كل خمس)`, `${g} sheep (one per five camels)`) }; }
    if (c <= 35) return { t: X('بنت مخاض (لها سنة)', 'one bint makhad (1 yr)') };
    if (c <= 45) return { t: X('بنت لبون (لها سنتان)', 'one bint labun (2 yrs)') };
    if (c <= 60) return { t: X('حِقّة (لها ثلاث سنين)', 'one hiqqah (3 yrs)') };
    if (c <= 75) return { t: X('جذعة (لها أربع سنين)', 'one jadha‘ah (4 yrs)') };
    if (c <= 90) return { t: X('بنتا لبون', 'two bint labun') };
    if (c <= 120) return { t: X('حِقّتان', 'two hiqqah') };
    let best = null; for (let a = 0; a * 50 <= c; a++) { const r = c - a * 50; if (r >= 0 && r % 40 === 0) { const b = r / 40; if (!best || a + b < best.a + best.b) best = { a, b }; } }
    if (!best) for (let a = 0; a * 50 <= c; a++) { const r = c - a * 50; if (r >= 0 && r % 40 < 10) { best = { a, b: MS(r / 40) }; break; } }
    best = best || { a: 0, b: MS(c / 40) };
    return { t: X(`${n(best.b)} بنت لبون و${n(best.a)} حِقّة (في كل أربعين بنت لبون وفي كل خمسين حِقّة)`, `${best.b} bint labun and ${best.a} hiqqah (a bint labun per forty, a hiqqah per fifty)`) };
  };
  const cattleDue = c => {
    if (c < 30) return { t: X('لا زكاة', 'None'), z: true };
    let best = null; for (let a = 0; a * 30 <= c; a++) { const r = c - a * 30; if (r % 40 === 0) { const b = r / 40; if (!best || a + b < best.a + best.b) best = { a, b }; } }
    if (!best) best = { a: MS(c / 30), b: 0 };
    const p = []; if (best.a) p.push(X(`${n(best.a)} تبيع (له سنة)`, `${best.a} tabi‘ (1 yr)`)); if (best.b) p.push(X(`${n(best.b)} مسنّة (لها سنتان)`, `${best.b} musinnah (2 yrs)`));
    return { t: p.join(X(' و', ' and ')) };
  };
  const sheepDue = c => (c < 40 ? { t: X('لا زكاة', 'None'), z: true } : c <= 120 ? { t: X('شاة واحدة', '1 sheep') } : c <= 200 ? { t: X('شاتان', '2 sheep') } : c <= 399 ? { t: X('ثلاث شياه', '3 sheep') } : { t: X(`${n(MS(c / 100))} شياه (شاة عن كل مئة)`, `${MS(c / 100)} sheep (one per hundred)`) });
  function zakatView() {
    let tab = 'mal';
    const sel = (id, opts, cur) => `<select class="field" id="${id}">${opts.map(([v, l]) => `<option value="${v}" ${String(v) === String(cur) ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    const panels = {
      mal: () => `<div class="stack"><div class="tl-grid">
          ${field('z-cur', X('العملة', 'Currency'), '', X('مثال: ر.ق أو $', 'e.g. QAR or $'), 'text')}
          ${field('z-gp', X('سعر غرام الذهب عيار ٢٤', 'Price of 1 g gold (24k)'), '', X('من سوق بلدك اليوم', 'today’s local price'))}
          ${field('z-sp', X('سعر غرام الفضة', 'Price of 1 g silver'), '', X('اختياري', 'optional'))}
          <div class="tl-f"><label for="z-nis">${X('النصاب بحسب', 'Nisab by')}</label>${sel('z-nis', [['gold', X('الذهب ٨٥ غراماً', 'Gold – 85 g')], ['silver', X('الفضة ٥٩٥ غراماً', 'Silver – 595 g')]], 'gold')}</div></div>
        <div class="tl-grid">${field('z-cash', X('النقد والأرصدة البنكية', 'Cash and bank balances'))}${field('z-gold', X('وزن الذهب (غرام)', 'Gold weight (g)'))}
          <div class="tl-f"><label for="z-k">${X('عيار الذهب', 'Gold karat')}</label>${sel('z-k', [[24, '24'], [22, '22'], [21, '21'], [18, '18'], [14, '14']], 21)}</div>
          <div class="tl-f"><label for="z-jw">${X('حُليّ الاستعمال', 'Jewellery worn')}</label>${sel('z-jw', [['in', X('أحسبها (الحنفية)', 'Include (Hanafi)')], ['out', X('لا أحسبها (الجمهور)', 'Exclude (majority)')]], 'in')}</div>
          ${field('z-silver', X('وزن الفضة (غرام)', 'Silver weight (g)'))}${field('z-trade', X('قيمة عروض التجارة والبضاعة', 'Value of trade goods'))}${field('z-inv', X('أسهم وصناديق بنيّة المتاجرة', 'Shares held for trading'))}${field('z-rec', X('ديون مرجوّة السداد لك', 'Debts owed to you (reliable)'))}${field('z-oth', X('أموال أخرى', 'Other wealth'))}${field('z-debt', X('ديون حالّة عليك (تُخصم)', 'Debts due from you (deducted)'))}</div>
        <div class="tl-res" id="z-out" aria-live="polite"></div></div>`,
      an: () => `<div class="stack"><div class="tl-grid">${field('a-c', X('عدد الإبل', 'Camels'), '', '', 'numeric')}${field('a-b', X('عدد البقر والجاموس', 'Cattle / buffalo'), '', '', 'numeric')}${field('a-s', X('عدد الغنم والماعز', 'Sheep and goats'), '', '', 'numeric')}</div>
        <p class="tl-src" style="margin:0">${X('شرط زكاة الأنعام: أن تكون سائمة (ترعى أكثر العام) وأن يحول عليها الحول. وإن كانت معلوفة فهي عروض تجارة إن كانت للتجارة.', 'Livestock is zakatable when grazing freely (most of the year) and a lunar year has passed. Fed livestock is only zakatable as trade goods.')}</p><div class="tl-res" id="a-out" aria-live="polite"></div></div>`,
      zr: () => `<div class="stack"><div class="tl-grid">${field('r-kg', X('وزن المحصول (كغم)', 'Harvest weight (kg)'))}<div class="tl-f"><label for="r-t">${X('طريقة السقي', 'Irrigation')}</label>${sel('r-t', [['10', X('مطر أو عيون بلا كلفة (١٠٪)', 'Rain or free water (10%)')], ['5', X('آلة أو كلفة (٥٪)', 'Costly irrigation (5%)')], ['7.5', X('نصفين (٧٫٥٪)', 'Both (7.5%)')]], '10')}</div>${field('r-n', X('النصاب (كغم)', 'Nisab (kg)'), '653')}</div>
        <p class="tl-src" style="margin:0">${X('النصاب خمسة أوسق، أي ثلاثمئة صاع نبوي، وقدّره كثير من العلماء المعاصرين بنحو ٦٥٣ كغم من القمح، ويختلف بنوع الحبّ، فعدّله إن أفتاك أهل بلدك بغيره. ولا تُخرج زكاة الزرع إلا عند الحصاد: ﴿وَآتُوا حَقَّهُ يَوْمَ حَصَادِهِ﴾.', 'The nisab is five awsuq (300 Prophetic sa‘), which many contemporary scholars estimate at about 653 kg of wheat; it varies by grain, so adjust it if your local scholars give another figure. Zakat on crops is due at harvest (6:141).')}</p><div class="tl-res" id="r-out" aria-live="polite"></div></div>`,
      fi: () => `<div class="stack"><div class="tl-grid">${field('f-p', X('عدد من تُخرج عنهم', 'Number of people'), '1', '', 'numeric')}${field('f-kg', X('وزن الصاع (كغم)', 'Weight of a sa‘ (kg)'), '2.5')}${field('f-pr', X('سعر الكيلو من غالب قوت بلدك', 'Price per kg of your staple food'))}${field('z-cur2', X('العملة', 'Currency'), '', '', 'text')}</div>
        <p class="tl-src" style="margin:0">${X('زكاة الفطر صاع من طعام عن كل مسلم، صغيراً أو كبيراً، ذكراً أو أنثى، تُخرج قبل صلاة العيد. والصاع يُقدَّر بين ٢٫٠٤ و٣ كغم بحسب نوع الطعام، ومن أهل العلم من يجيز إخراج قيمته.', 'Zakat al-Fitr is one sa‘ of food per Muslim, young or old, paid before the Eid prayer. A sa‘ is about 2.04–3 kg depending on the food; some scholars allow paying its value.')}</p><div class="tl-res" id="f-out" aria-live="polite"></div></div>`,
    };
    const cur = () => $('#z-cur').value || $('#z-cur2')?.value || '';
    const calc = {
      mal: () => {
        const gp = pn($('#z-gp').value), sp = pn($('#z-sp').value), nis = $('#z-nis').value, k = +$('#z-k').value;
        const goldG = pn($('#z-gold').value) * k / 24, goldIn = $('#z-jw').value === 'in', silG = pn($('#z-silver').value);
        const goldV = goldIn ? goldG * gp : 0, silV = silG * sp;
        const parts = [['z-cash', X('النقد', 'Cash')], ['z-trade', X('عروض التجارة', 'Trade goods')], ['z-inv', X('الأسهم', 'Shares')], ['z-rec', X('ديون مرجوّة', 'Receivables')], ['z-oth', X('أخرى', 'Other')]].map(([i, l]) => [l, pn($('#' + i).value)]);
        const total = parts.reduce((s, p) => s + p[1], 0) + goldV + silV, debt = pn($('#z-debt').value), net = Math.max(0, total - debt);
        const nisV = nis === 'gold' ? 85 * gp : 595 * sp, c = cur();
        let h;
        if (!gp && nis === 'gold') h = X('أدخل سعر غرام الذهب اليوم لتُحسب قيمة النصاب.', 'Enter today’s price of a gram of gold so the nisab value can be computed.');
        else if (!sp && nis === 'silver') h = X('أدخل سعر غرام الفضة اليوم لتُحسب قيمة النصاب.', 'Enter today’s price of a gram of silver so the nisab value can be computed.');
        else {
          const due = net >= nisV && net > 0;
          h = `<div>${X('قيمة النصاب', 'Nisab value')}: <b>${num(nisV)} ${esc(c)}</b> (${nis === 'gold' ? X('٨٥ غراماً ذهباً', '85 g gold') : X('٥٩٥ غراماً فضة', '595 g silver')})</div>
          <div>${X('إجمالي الأموال', 'Total wealth')}: <b>${num(total)} ${esc(c)}</b>${goldIn && goldG ? ` (${X('منها ذهب', 'incl. gold')} ${num(goldV)})` : ''} · ${X('بعد خصم الديون الحالّة', 'after due debts')}: <b>${num(net)} ${esc(c)}</b></div>
          ${due ? `<div>${X('بلغ المال النصاب، فإن حال عليه الحول الهجري فالزكاة الواجبة (٢٫٥٪):', 'Your wealth reaches the nisab; if a lunar year has passed, the zakat due (2.5%) is:')} <b class="big">${num(net * 0.025)} ${esc(c)}</b></div>` : `<div>${X('لم يبلغ المال النصاب، فلا زكاة عليك الآن.', 'Your wealth is below the nisab, so no zakat is due now.')}</div>`}`;
          if (due) h += `<div class="tl-src">${X('إن كانت سنتك الزكوية شمسية فالنسبة ٢٫٥٧٧٥٪ لتعويض فرق السنتين.', 'If you calculate by the solar year, use 2.5775% to compensate for the shorter lunar year.')}</div>`;
        }
        if (nis === 'silver') h += `<div class="tl-src">${X('نصاب الفضة أقل، فيدخل فيه أكثر الناس، وفيه حظٌّ للفقراء.', 'The silver nisab is lower, so more people fall within it, which favours the poor.')}</div>`;
        $('#z-out').innerHTML = h;
      },
      an: () => {
        const c = MS(pn($('#a-c').value)), b = MS(pn($('#a-b').value)), s = MS(pn($('#a-s').value)); const rows = [];
        if (c) rows.push([X('الإبل', 'Camels'), n(c), camelDue(c)]); if (b) rows.push([X('البقر', 'Cattle'), n(b), cattleDue(b)]); if (s) rows.push([X('الغنم', 'Sheep'), n(s), sheepDue(s)]);
        $('#a-out').innerHTML = rows.length ? `<table class="tl-tbl"><tbody>${rows.map(r => `<tr><td><b>${r[0]}</b> (${r[1]})</td><td>${r[2].z ? X('لا زكاة، لم يبلغ النصاب', 'None, below nisab') : r[2].t}</td></tr>`).join('')}</tbody></table>` : X('أدخل عدد ما تملكه من الأنعام.', 'Enter the number of animals you own.');
      },
      zr: () => {
        const kg = pn($('#r-kg').value), nis = pn($('#r-n').value) || 653, rate = +$('#r-t').value;
        $('#r-out').innerHTML = !kg ? X('أدخل وزن المحصول.', 'Enter the harvest weight.') : kg < nis ? X(`لم يبلغ المحصول النصاب (${num(nis)} كغم)، فلا زكاة فيه.`, `The harvest is below the nisab (${num(nis)} kg), so no zakat is due.`) : `${X('الواجب', 'Due')}: <b class="big">${num(kg * rate / 100)} ${X('كغم', 'kg')}</b> (${num(rate)}%)`;
      },
      fi: () => {
        const p = MS(pn($('#f-p').value)), kg = pn($('#f-kg').value), pr = pn($('#f-pr').value), c = $('#z-cur2').value;
        $('#f-out').innerHTML = !p ? X('أدخل عدد الأشخاص.', 'Enter the number of people.') : `${X('الواجب', 'Due')}: <b class="big">${num(p * kg)} ${X('كغم من الطعام', 'kg of food')}</b>${pr ? ` ${X('أو قيمته', 'or its value')} <b>${num(p * kg * pr)} ${esc(c)}</b>` : ''}`;
      },
    };
    const tabs = [['mal', X('المال والذهب والعروض', 'Money, gold and trade')], ['an', X('الأنعام', 'Livestock')], ['zr', X('الزروع والثمار', 'Crops and fruit')], ['fi', X('زكاة الفطر', 'Zakat al-Fitr')]];
    const draw = () => {
      $('#z-body').innerHTML = panels[tab](); $$('#z-seg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.t === tab));
      $('#z-body').querySelectorAll('input,select').forEach(el => { el.oninput = el.onchange = calc[tab]; }); calc[tab]();
    };
    V(`<div class="stack" id="tl-root">
      ${head(X('حاسبة الزكاة', 'Zakat calculator'), X('احسب زكاتك بمقاديرها الشرعية', 'Calculate your zakat by its legal measures'), X('نصاب الذهب والفضة وعروض التجارة والأنعام والزروع وزكاة الفطر، ومعها مصارف الزكاة الثمانية. الحساب على جهازك، ولا يُرسل أي رقم إلى أحد.', 'The nisab of gold, silver, trade goods, livestock and crops, plus zakat al-Fitr and the eight recipients. Everything is computed on your device; no number is sent anywhere.'))}
      <div class="seg" id="z-seg">${tabs.map(([k, l]) => `<button type="button" data-t="${k}" aria-pressed="${k === tab}">${l}</button>`).join('')}</div>
      <section class="panel stack" id="z-body"></section>
      <div class="cols"><section class="panel stack tight"><h2>${X('شروط وجوب الزكاة في المال', 'Conditions for zakat on wealth')}</h2>
        <ul style="margin:0;padding-inline-start:20px;line-height:2"><li>${X('الإسلام والحرية وملك النصاب ملكاً تاماً.', 'Islam, freedom, and full ownership of the nisab.')}</li><li>${X('مرور حول هجري كامل على النصاب، إلا الزروع فعند الحصاد.', 'A full lunar year over the nisab, except crops which are due at harvest.')}</li><li>${X('فضلٌ عن الحاجات الأصلية والديون الحالّة (ما يلزمك سداده الآن).', 'Surplus over basic needs and debts due now.')}</li><li>${X('الواجب في الذهب والفضة والنقد والعروض ربع العشر: ٢٫٥٪. قال النبي ﷺ: «ليس فيما دون خمس أواقٍ صدقة» (متفق عليه).', 'The rate on gold, silver, cash and trade goods is one-fortieth: 2.5%. The Prophet ﷺ said: “There is no zakat on less than five awqiyah of silver” (agreed upon).')}</li></ul>
        <p class="tl-src" style="margin:0">${X('٨٥ غراماً من الذهب الخالص = عشرون مثقالاً، و٥٩٥ غراماً من الفضة = مئتا درهم.', '85 g pure gold = twenty mithqal; 595 g silver = two hundred dirham.')}</p></section>
        <section class="panel stack tight"><h2>${X('مصارف الزكاة الثمانية', 'The eight recipients')}</h2>${quran(9, 60)}<p class="tl-src" style="margin:0">${X('الفقراء، والمساكين، والعاملون عليها، والمؤلفة قلوبهم، وفي الرقاب، والغارمون، وفي سبيل الله، وابن السبيل.', 'The poor, the needy, those who collect it, those whose hearts are to be reconciled, freeing slaves, those in debt, in the cause of Allah, and the wayfarer.')}</p></section></div>
      <div class="tl-note">${X('هذه الحاسبة عون على الحساب لا فتوى. تختلف المذاهب في مسائل منها حُليّ الاستعمال والدَّين وزكاة الأسهم، فإن كان في مالك مسألة مشكلة فاسأل أهل العلم الثقات في بلدك. ولا تدخل في الحساب ممتلكاتك الشخصية كالبيت الذي تسكنه والسيارة التي تركبها.', 'This calculator helps with the arithmetic and is not a fatwa. The schools differ on matters such as worn jewellery, debts and shares. If you have a difficult case, ask trusted scholars in your country. Your home and car for personal use are not included.')}</div>
      ${quran(2, 43)}${quran(9, 103)}</div>`);
    $('#z-seg').onclick = e => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.t; draw(); };
    draw();
  }

  /* ============================================================ حاسبة المواريث */
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  const fr = (a, b = 1) => { const g = gcd(a, b) || 1; return [a / g, b / g]; };
  const fadd = (x, y) => fr(x[0] * y[1] + y[0] * x[1], x[1] * y[1]);
  const fsub = (x, y) => fr(x[0] * y[1] - y[0] * x[1], x[1] * y[1]);
  const fmul = (x, y) => fr(x[0] * y[0], x[1] * y[1]);
  const fdiv = (x, y) => fr(x[0] * y[1], x[1] * y[0]);
  const fgt = (x, y) => x[0] * y[1] > y[0] * x[1];
  const fval = x => x[0] / x[1];
  const ZERO = [0, 1], ONE = [1, 1];
  const HEIRS = [ // key, عربي، English، مفرد/جمع، أقصى عدد
    ['husband', 'الزوج', 'Husband', 1], ['wife', 'الزوجة', 'Wife / wives', 4],
    ['father', 'الأب', 'Father', 1], ['mother', 'الأم', 'Mother', 1], ['gf', 'الجد لأب', 'Paternal grandfather', 1], ['gmm', 'الجدة لأم', 'Maternal grandmother', 1], ['gmp', 'الجدة لأب', 'Paternal grandmother', 1],
    ['son', 'الابن', 'Son(s)', 30], ['dau', 'البنت', 'Daughter(s)', 30], ['sson', 'ابن الابن', 'Son’s son(s)', 30], ['sdau', 'بنت الابن', 'Son’s daughter(s)', 30],
    ['fb', 'الأخ الشقيق', 'Full brother(s)', 30], ['fs', 'الأخت الشقيقة', 'Full sister(s)', 30], ['pb', 'الأخ لأب', 'Paternal half-brother(s)', 30], ['ps', 'الأخت لأب', 'Paternal half-sister(s)', 30], ['mb', 'الأخ لأم', 'Maternal half-brother(s)', 30], ['ms', 'الأخت لأم', 'Maternal half-sister(s)', 30],
    ['fbs', 'ابن الأخ الشقيق', 'Full brother’s son(s)', 30], ['pbs', 'ابن الأخ لأب', 'Paternal brother’s son(s)', 30], ['fu', 'العم الشقيق', 'Full paternal uncle(s)', 30], ['pu', 'العم لأب', 'Paternal half-uncle(s)', 30], ['fuc', 'ابن العم الشقيق', 'Full uncle’s son(s)', 30], ['puc', 'ابن العم لأب', 'Paternal uncle’s son(s)', 30],
  ];
  /* يحسب الأنصبة (مذهب الجمهور مع قول الحنفية في حجب الجد للإخوة). h: عدد كل وارث. */
  function solveInheritance(h0) {
    const h = {}; HEIRS.forEach(([k, , , mx]) => { h[k] = Math.max(0, Math.min(mx, MS(+h0[k] || 0))); });
    const warn = [], res = {}; // key → { fixed:[n,d], asaba:[n,d], blocked:'' }
    HEIRS.forEach(([k]) => { res[k] = { fixed: ZERO, asaba: ZERO, why: '', how: [] }; });
    if (h.husband && h.wife) { h.wife = 0; warn.push(X('لا يجتمع زوج وزوجة؛ حُسب الزوج فقط.', 'A husband and a wife cannot both be heirs; only the husband was counted.')); }
    const blk = (k, why) => { if (h[k]) res[k].why = why; h[k] = 0; };
    const hasMaleDesc = h.son + h.sson > 0, hasDesc = h.son + h.dau + h.sson + h.sdau > 0, hasFemaleDesc = h.dau + h.sdau > 0;
    if (h.father && h.gf) blk('gf', X('محجوب بالأب', 'Blocked by the father'));
    const asc = h.father + h.gf > 0;
    if (h.mother && (h.gmm || h.gmp)) { blk('gmm', X('محجوبة بالأم', 'Blocked by the mother')); blk('gmp', X('محجوبة بالأم', 'Blocked by the mother')); }
    if (h.father && h.gmp) blk('gmp', X('محجوبة بالأب', 'Blocked by the father'));
    const sibTotal = h.fb + h.fs + h.pb + h.ps + h.mb + h.ms; // يحجبون الأم حجب نقصان ولو كانوا محجوبين
    if (h.son) ['sson', 'sdau'].forEach(k => blk(k, X('محجوب بالابن', 'Blocked by the son')));
    // الأخوة والأخوات
    const sibBlockMale = hasMaleDesc || asc;
    if (sibBlockMale) ['fb', 'fs', 'pb', 'ps'].forEach(k => blk(k, hasMaleDesc ? X('محجوب بالفرع الوارث المذكر', 'Blocked by a male descendant') : (h.father ? X('محجوب بالأب', 'Blocked by the father') : X('محجوب بالجد (قول الحنفية)', 'Blocked by the grandfather (Hanafi view)'))));
    if (hasDesc || asc) ['mb', 'ms'].forEach(k => blk(k, hasDesc ? X('محجوب بالفرع الوارث', 'Blocked by a descendant') : X('محجوب بالأصل المذكر', 'Blocked by a male ascendant')));
    if (h.gf && !h.father && (h.fb + h.fs + h.pb + h.ps > 0 || sibTotal > 0)) warn.push(X('الجد مع الإخوة: عند الحنفية يحجب الجد الإخوة كالأب (وهو ما أُخذ به هنا)، وعند الجمهور (المالكية والشافعية والحنابلة) يقاسمهم أو يأخذ الثلث بحسب الأحظّ له. فراجع المفتي في بلدك.', 'Grandfather with siblings: the Hanafis hold that the grandfather blocks the siblings like a father (applied here); the majority (Maliki, Shafi‘i, Hanbali) let him share with them or take a third, whichever is better for him. Ask your local mufti.'));
    // الفروض
    const fixed = {};
    const setF = (k, f) => { fixed[k] = f; };
    if (h.husband) setF('husband', hasDesc ? [1, 4] : [1, 2]);
    if (h.wife) setF('wife', hasDesc ? [1, 8] : [1, 4]);
    // البنات
    let dauAsaba = false;
    if (h.dau && h.son) dauAsaba = true; else if (h.dau) setF('dau', h.dau === 1 ? [1, 2] : [2, 3]);
    // بنات الابن
    let sdauAsaba = false;
    if (h.sdau) {
      if (h.sson) sdauAsaba = true;
      else if (h.dau === 0) setF('sdau', h.sdau === 1 ? [1, 2] : [2, 3]);
      else if (h.dau === 1) setF('sdau', [1, 6]);
      else blk('sdau', X('محجوبة ببنتين فأكثر', 'Blocked by two or more daughters'));
    }
    // الأب والجد
    const fatherLike = h.father ? 'father' : h.gf ? 'gf' : '';
    if (fatherLike && hasDesc) setF(fatherLike, [1, 6]);
    // الأم والجدات
    const spouse = h.husband + h.wife > 0;
    let umariyya = false;
    if (h.mother) { if (hasDesc || sibTotal >= 2) setF('mother', [1, 6]); else if (spouse && h.father) { umariyya = true; } else setF('mother', [1, 3]); }
    const grandmothers = ['gmm', 'gmp'].filter(k => h[k]);
    if (grandmothers.length) { grandmothers.forEach(k => setF(k, fr(1, 6 * grandmothers.length))); }
    // الإخوة لأم
    const mCount = h.mb + h.ms; if (mCount) setF('mb_ms', mCount === 1 ? [1, 6] : [1, 3]);
    // الأخوات الشقيقات وللأب
    let fsAsaba = false, psAsaba = false;
    const sisAsabaMaGhayr = hasFemaleDesc && !hasMaleDesc && !asc;
    if (h.fb || h.fs) {
      if (h.fb) fsAsaba = !!h.fs; // أخوات مع إخوة تعصيب بالغير
      else if (sisAsabaMaGhayr) fsAsaba = true; else if (h.fs) setF('fs', h.fs === 1 ? [1, 2] : [2, 3]);
    }
    if (h.pb || h.ps) {
      if (h.fb) { blk('pb', X('محجوب بالأخ الشقيق', 'Blocked by a full brother')); blk('ps', X('محجوبة بالأخ الشقيق', 'Blocked by a full brother')); }
      else if (h.fs && sisAsabaMaGhayr) { blk('pb', X('محجوب بالأخت الشقيقة العاصبة', 'Blocked by the full sister acting as ‘asabah')); blk('ps', X('محجوبة بالأخت الشقيقة العاصبة', 'Blocked by the full sister acting as ‘asabah')); }
      else if (h.pb) psAsaba = !!h.ps;
      else if (h.fs >= 2) blk('ps', X('محجوبة بشقيقتين فأكثر', 'Blocked by two or more full sisters'));
      else if (h.fs === 1) setF('ps', [1, 6]);
      else if (sisAsabaMaGhayr) psAsaba = true;
      else setF('ps', h.ps === 1 ? [1, 2] : [2, 3]);
    }
    // مجموع الفروض (قبل العمرية)
    let S = ZERO; Object.values(fixed).forEach(f => { S = fadd(S, f); });
    if (umariyya) { const rest = fsub(ONE, S); setF('mother', fmul(rest, [1, 3])); S = fadd(S, fixed.mother); }
    // العصبة بالترتيب
    const order = [];
    if (h.son) order.push({ keys: ['son', 'dau'], w: { son: 2, dau: 1 } });
    else if (h.sson) order.push({ keys: ['sson', 'sdau'], w: { sson: 2, sdau: 1 } });
    if (!order.length && fatherLike) order.push({ keys: [fatherLike], w: { [fatherLike]: 1 }, noMaleDesc: true });
    else if (fatherLike && !hasMaleDesc) order.push({ keys: [fatherLike], w: { [fatherLike]: 1 } });
    if (!h.son && !h.sson && !fatherLike) {
      if (h.fb) order.push({ keys: ['fb', 'fs'], w: { fb: 2, fs: 1 } });
      else if (fsAsaba) order.push({ keys: ['fs'], w: { fs: 1 } });
      else if (h.pb) order.push({ keys: ['pb', 'ps'], w: { pb: 2, ps: 1 } });
      else if (psAsaba) order.push({ keys: ['ps'], w: { ps: 1 } });
      ['fbs', 'pbs', 'fu', 'pu', 'fuc', 'puc'].forEach(k => { if (h[k]) order.push({ keys: [k], w: { [k]: 1 } }); });
    }
    // توزيع الباقي على أول عصبة موجودة
    let asabaGroup = null;
    for (const g of order) { if (g.keys.some(k => h[k] > 0 && (g.w[k] || 0) > 0)) { asabaGroup = g; break; } }
    // العصبة الأعلى تحجب من دونها: نُسجّل المحجوبين
    const chain = ['fbs', 'pbs', 'fu', 'pu', 'fuc', 'puc'];
    if (asabaGroup) { const ai = asabaGroup.keys.find(k => chain.includes(k)); if (ai) chain.slice(chain.indexOf(ai) + 1).forEach(k => blk(k, X('محجوب بعاصب أقرب', 'Blocked by a nearer ‘asabah'))); }
    if (!asabaGroup) chain.forEach(k => { /* لا عاصب، لا حجب */ });
    // نتيجة الفروض أولاً
    let total = ZERO, radd = false, awl = false, leftover = ZERO;
    Object.values(fixed).forEach(f => { total = fadd(total, f); });
    const rows = [];
    const resid = fgt(ONE, total) ? fsub(ONE, total) : ZERO;
    let scale = ONE;
    if (fgt(total, ONE)) { awl = true; scale = fdiv(ONE, total); }
    let asabaShare = ZERO;
    if (asabaGroup && !awl) asabaShare = resid;
    let raddBase = ZERO;
    if (!asabaGroup && !awl && fgt(resid, ZERO)) {
      const non = Object.entries(fixed).filter(([k]) => k !== 'husband' && k !== 'wife');
      if (non.length) { radd = true; const nonSum = non.reduce((s, [, f]) => fadd(s, f), ZERO); const sp = (fixed.husband || ZERO), sw = (fixed.wife || ZERO); const avail = fsub(ONE, fadd(sp, sw)); raddBase = fdiv(avail, nonSum); }
      else leftover = resid;
    }
    const out = {};
    Object.entries(fixed).forEach(([k, f]) => { let v = f; if (awl) v = fmul(f, scale); else if (radd && k !== 'husband' && k !== 'wife') v = fmul(f, raddBase); out[k] = v; });
    const shares = {}; // key → { total:[n,d], basis }
    const give = (k, v, basis) => { shares[k] = { total: shares[k] ? fadd(shares[k].total, v) : v, basis: shares[k] ? shares[k].basis + ' + ' + basis : basis }; };
    const fxLabel = f => X('فرضاً ', 'fixed share ') + f[0] + '/' + f[1];
    Object.entries(out).forEach(([k, v]) => { if (k === 'mb_ms') { const mc = h.mb + h.ms; ['mb', 'ms'].forEach(kk => { if (h[kk]) give(kk, fmul(v, [h[kk], mc]), fxLabel(fixed.mb_ms) + X(' للجميع بالتساوي', ' for all, equally')); }); } else give(k, v, fxLabel(fixed[k]) + (awl ? X(' (بعد العَول)', ' (after ‘awl)') : radd && k !== 'husband' && k !== 'wife' ? X(' (بعد الردّ)', ' (after radd)') : '')); });
    if (asabaGroup && fgt(asabaShare, ZERO)) {
      const units = asabaGroup.keys.reduce((s, k) => s + (h[k] || 0) * (asabaGroup.w[k] || 0), 0);
      asabaGroup.keys.forEach(k => { if (h[k] && asabaGroup.w[k]) give(k, fmul(asabaShare, fr(h[k] * asabaGroup.w[k], units)), X('تعصيباً', '‘asabah (residue)')); });
    }
    if (!awl && !radd && !asabaGroup && fgt(resid, ZERO) && !fgt(ZERO, resid)) leftover = resid;
    if (awl) warn.push(X('تزاحمت الفروض فزادت على الأصل، فدخل النقص على كل أصحاب الفروض بنسبة سهامهم، ويسمى هذا العَول.', 'The fixed shares exceed the whole estate, so every sharer is reduced in proportion (‘awl).'));
    if (radd) warn.push(X('فاض شيء من التركة عن الفروض ولا عاصب، فرُدّ على أصحاب الفروض غير الزوجين بنسبة سهامهم (الردّ).', 'A remainder is left after the fixed shares with no ‘asabah, so it is returned to the sharers other than the spouse in proportion (radd).'));
    if (fgt(leftover, ZERO)) warn.push(X('بقي من التركة جزء لا عاصب له ولا صاحب فرض يُردّ عليه؛ يُصرف في بيت المال عند الجمهور، ويرى الحنفية والحنابلة توريث ذوي الأرحام (الأقارب غير أصحاب الفروض والعصبات)، فراجع المحكمة أو المفتي.', 'A part of the estate remains with no ‘asabah and no sharer to receive radd. The majority put it in the public treasury, while Hanafis and Hanbalis give it to distant relatives (dhawu al-arham). Consult the court or a mufti.'));
    if (umariyya) warn.push(X('مسألة العُمريّتين: زوج أو زوجة مع الأب والأم؛ تأخذ الأم ثلث الباقي بعد فرض الزوجين (قضاء عمر رضي الله عنه).', 'The two ‘Umariyyah cases: a spouse with both parents; the mother takes a third of what remains after the spouse’s share (the ruling of ‘Umar).'));
    if (h.husband && h.mother && mCount >= 2 && h.fb && !h.son) warn.push(X('المسألة المشتركة (الحمارية): الشقيق لا يرث هنا عند الحنفية والحنابلة لاستغراق الفروض، ويشارك الإخوة لأم في ثلثهم عند المالكية والشافعية.', 'The “Mushtarakah” case: the full brother gets nothing here in the Hanafi and Hanbali view because the fixed shares exhaust the estate; the Malikis and Shafi‘is let him share the maternal siblings’ third.'));
    HEIRS.forEach(([k, ar, en]) => { const cnt = +h0[k] > 0 ? Math.min(+h0[k], HEIRS.find(x => x[0] === k)[3]) : 0; if (!cnt && !h[k]) return; const sh = shares[k]; rows.push({ key: k, label: A ? ar : en, count: cnt || h[k], total: sh ? sh.total : ZERO, basis: sh ? sh.basis : '', why: sh ? '' : (res[k].why || X('لا يرث هنا', 'Does not inherit here')) }); });
    // وارث لم يُدخَل لكنه محجوب أُسقط من الأعداد: أظهره
    let check = ZERO; rows.forEach(r => { check = fadd(check, r.total); });
    return { rows, warn, awl, radd, leftover, sum: check, asl: rows.reduce((d, r) => { const l = (a, b) => a * b / gcd(a, b); return r.total[0] ? l(d, r.total[1]) : d; }, 1) };
  }
  function mawarithView() {
    const cnt = {}; let sp = 'none';
    const ZK = ['spouse'];
    const cont = (k, ar, en, mx) => `<div class="tl-f"><label for="m-${k}">${X(ar, en)}</label><input class="field" id="m-${k}" type="text" inputmode="numeric" autocomplete="off" data-k="${k}" placeholder="0"></div>`;
    const grp = [[X('الزوجان', 'Spouse'), []], [X('الأصول', 'Parents and grandparents'), ['father', 'mother', 'gf', 'gmm', 'gmp']], [X('الفروع', 'Children and grandchildren'), ['son', 'dau', 'sson', 'sdau']], [X('الإخوة والأخوات', 'Siblings'), ['fb', 'fs', 'pb', 'ps', 'mb', 'ms']], [X('الأقارب الأبعد من العصبات', 'More distant male relatives'), ['fbs', 'pbs', 'fu', 'pu', 'fuc', 'puc']]];
    const lab = k => { const x = HEIRS.find(y => y[0] === k); return A ? x[1] : x[2]; };
    V(`<div class="stack" id="tl-root">
      ${head(X('حاسبة المواريث', 'Inheritance calculator'), X('قسمة التركة بأنصبتها الشرعية', 'Dividing an estate by its legal shares'), X('أدخل الورثة وقيمة التركة، فتظهر أنصبة كل وارث بالكسور والمبلغ، مع بيان الحجب والعَول والردّ. أنصبة الورثة محددة في سورة النساء، والحساب على جهازك.', 'Enter the heirs and the estate and see every heir’s share as a fraction and an amount, with blocking, ‘awl and radd explained. The shares are fixed in Surat an-Nisa; the calculation runs on your device.'))}
      <div class="tl-warn">${X('هذه الحاسبة تقريبية للمسائل الشائعة (على مذهب الجمهور، مع أخذ الحنفية في مسألة الجد والإخوة)، وتعتمد على ما تدخله من بيانات. لا تُغني عن القسمة بمعرفة محكمة أو مفتٍ ثقة، خاصة مع الوصية الواجبة أو الحمل أو المفقود أو المرتدّ أو القاتل أو اختلاف الدين، فهذه كلها لا تحسبها.', 'This calculator covers common cases (the majority view, with the Hanafi view on the grandfather and siblings) and depends on what you enter. It does not replace a court or a trusted mufti, especially for obligatory bequests, a pregnancy, a missing person, an apostate, a killer or a difference of religion, none of which it handles.')}</div>
      <section class="panel stack"><h2>${X('التركة', 'The estate')}</h2><div class="tl-grid">${field('m-est', X('صافي ما تركه الميت', 'Total estate'), '', '', 'decimal')}${field('m-fun', X('تجهيز الميت ودفنه', 'Funeral costs'), '', '', 'decimal')}${field('m-debt', X('ديون الميت', 'Debts'), '', '', 'decimal')}${field('m-will', X('وصية (لا تزيد عن ثلث الباقي)', 'Bequest (max one third of the rest)'), '', '', 'decimal')}${field('m-cur', X('العملة', 'Currency'), '', '', 'text')}</div>
        <p class="tl-src" style="margin:0">${X('الترتيب الشرعي: تجهيز الميت، ثم سداد ديونه، ثم تنفيذ وصيته في حدود الثلث لغير وارث، ثم القسمة بين الورثة.', 'The order: funeral costs, then debts, then the bequest (up to one third, to a non-heir), then division among heirs.')}</p></section>
      <section class="panel stack"><h2>${X('الورثة', 'The heirs')}</h2>
        <div class="tl-f"><label for="m-sp">${grp[0][0]}</label><select class="field" id="m-sp"><option value="none">${X('لا زوج ولا زوجة', 'No spouse')}</option><option value="husband">${lab('husband')}</option><option value="wife">${X('زوجة أو أكثر', 'Wife / wives')}</option></select></div>
        <div class="tl-f" id="m-wn" hidden><label for="m-wife">${X('عدد الزوجات', 'Number of wives')}</label><input class="field" id="m-wife" type="text" inputmode="numeric" data-k="wife" value="1"></div>
        ${grp.slice(1).map(([t, ks]) => `<h3 style="margin:8px 0 0">${t}</h3><div class="tl-grid">${ks.map(k => { const x = HEIRS.find(y => y[0] === k); return cont(k, x[1], x[2]); }).join('')}</div>`).join('')}
        <p class="tl-src" style="margin:0">${X('الأب والجد والأم والجدات: اكتب ١ لمن هو حيّ، أو اتركه فارغاً. ويُراعى الحجب تلقائياً: كالجد مع الأب، والإخوة مع الابن، وبنات الابن مع بنتين.', 'For father, grandfather, mother and grandmothers enter 1 if living, or leave empty. Blocking is applied automatically (e.g. grandfather by the father, siblings by a son).')}</p></section>
      <section class="panel stack" id="m-out" aria-live="polite"></section>
      <section class="panel stack tight"><h2>${X('الأصل في الميراث', 'The Quranic basis')}</h2>${quran(4, 11)}${quran(4, 12)}${quran(4, 176)}<p class="tl-src" style="margin:0">${X('وقال النبي ﷺ: «ألحقوا الفرائض بأهلها، فما بقي فلأولى رجلٍ ذكر» (متفق عليه). وأوصى سعدَ بنَ أبي وقاص أن لا يوصي بأكثر من الثلث: «والثلث كثير» (متفق عليه).', 'The Prophet ﷺ said: “Give the fixed shares to their people, and what remains goes to the nearest male relative” (agreed upon). He told Sa‘d ibn Abi Waqqas not to bequeath more than a third: “and a third is a lot” (agreed upon).')}</p></section></div>`);
    const out = $('#m-out');
    const draw = () => {
      const h = {}; $$('#tl-root input[data-k]').forEach(i => { h[i.dataset.k] = MS(pn(i.value)); });
      const spv = $('#m-sp').value; if (spv === 'husband') { h.husband = 1; h.wife = 0; } else if (spv === 'wife') { h.husband = 0; h.wife = Math.max(1, h.wife || 1); } else { h.husband = 0; h.wife = 0; }
      $('#m-wn').hidden = spv !== 'wife';
      const est = pn($('#m-est').value), fun = pn($('#m-fun').value), debt = pn($('#m-debt').value), will0 = pn($('#m-will').value), cur = $('#m-cur').value;
      if (!HEIRS.some(([k]) => h[k] > 0)) { out.innerHTML = `<p class="muted" style="margin:0">${X('أدخل الورثة لتظهر الأنصبة.', 'Enter the heirs to see the shares.')}</p>`; return; }
      let s; try { s = solveInheritance(h); } catch (e) { out.innerHTML = `<p>${X('تعذّر الحساب لهذه المدخلات.', 'Could not compute for these inputs.')}</p>`; return; }
      const afterDebt = Math.max(0, est - fun - debt), will = Math.min(will0, afterDebt / 3), net = afterDebt - will;
      const rows = s.rows.map(r => { const has = r.total[0] > 0, per = has && r.count ? fr(r.total[0], r.total[1] * r.count) : ZERO; return `<tr><td><b>${esc(r.label)}</b>${r.count > 1 ? ` (${n(r.count)})` : ''}</td><td>${has ? `<b>${r.total[0]}/${r.total[1]}</b> <span class="muted">${num(fval(r.total) * 100)}٪</span>` : `<span class="muted">${esc(r.why)}</span>`}</td><td>${has ? esc(r.basis) : ''}</td>${est ? `<td>${has ? `<b>${num(fval(r.total) * net)}</b>${r.count > 1 ? `<div class="tl-src">${X('للواحد', 'each')}: ${num(fval(per) * net)}</div>` : ''}` : ''}</td>` : ''}</tr>`; }).join('');
      out.innerHTML = `<h2>${X('النتيجة', 'Result')}</h2>${est ? `<div class="tl-res">${X('صافي التركة للقسمة', 'Net estate to divide')}: <b class="big">${num(net)} ${esc(cur)}</b>${will ? ` · ${X('الوصية المنفَّذة', 'Bequest honoured')}: ${num(will)}${will < will0 ? X(' (خُفّضت إلى ثلث الباقي)', ' (reduced to one third)') : ''}` : ''}${est - fun - debt < 0 ? `<div class="tl-warn">${X('الديون والتجهيز تستغرق التركة، فلا ميراث.', 'Funeral costs and debts exhaust the estate; nothing is left to inherit.')}</div>` : ''}</div>` : ''}
        <div class="tl-scroll"><table class="tl-tbl"><thead><tr><th>${X('الوارث', 'Heir')}</th><th>${X('نصيبه من التركة', 'Share')}</th><th>${X('سببه', 'Basis')}</th>${est ? `<th>${X('المبلغ', 'Amount')}</th>` : ''}</tr></thead><tbody>${rows}</tbody></table></div>
        <p class="tl-src" style="margin:0">${X('أصل المسألة (المقام المشترك)', 'Common denominator')}: ${n(s.asl)}</p>${s.warn.map(w => `<div class="tl-note">${esc(w)}</div>`).join('')}`;
    };
    $('#tl-root').addEventListener('input', draw); $('#tl-root').addEventListener('change', draw); draw();
  }

  /* ============================================================ عدّاد ألفاظ القرآن */
  let formIx = null;
  const getFormIx = () => { if (formIx) return formIx; formIx = new Map(); W.w.forEach((w, i) => { const k = norm(w[0]); (formIx.get(k) || formIx.set(k, []).get(k)).push(i); }); return formIx; };
  const surahCounts = ws => { const c = new Array(114).fill(0); ws.forEach(i => { c[surahOf[i] - 1]++; }); return c; };
  function lafzView() {
    const q0 = decodeURIComponent((location.hash.match(/^#lafz\/(.+)$/) || [])[1] || '');
    const bars = (c, color) => { const mx = Math.max(...c, 1); return `<div class="lz-bars" role="img" aria-label="${X('توزيع الورود على السور', 'Distribution across surahs')}">${c.map((v, i) => `<i data-s="${i + 1}" class="${Q.surahs[i].type === 'مدنية' ? 'md' : ''}" style="height:${Math.max(v ? 4 : 0, v / mx * 100)}%" title="${esc(Q.surahs[i].name)}: ${n(v)}"></i>`).join('')}</div><div class="lz-lg"><span>1</span><span>${X('السور', 'Surahs')}</span><span>114</span></div>`; };
    const analyse = word => {
      const nq = norm(word).replace(/\s/g, ''); if (!nq) return null;
      const form = getFormIx().get(nq) || [], res = { nq, form, lem: [], root: null };
      W.lemmas.forEach((l, i) => { if (norm(l[0]) === nq) res.lem.push(i); });
      const ri = rootByKey.get(nq); if (ri != null) res.root = ri;
      return res;
    };
    const card = (title, sub, ws, link) => { const c = surahCounts(ws), mk = ws.filter(i => Q.surahs[surahOf[i] - 1].type === 'مكية').length, ay = new Set(ws.map(i => W.a[i])).size; return `<section class="panel stack tight"><div class="pill-row"><span class="chip acc">${title}</span></div><div class="tl-grid"><div class="tile"><b>${n(ws.length)}</b><span>${X('مرة', 'occurrences')}</span></div><div class="tile"><b>${n(ay)}</b><span>${X('آية', 'verses')}</span></div><div class="tile"><b>${n(c.filter(Boolean).length)}</b><span>${X('سورة', 'surahs')}</span></div><div class="tile"><b>${n(mk)} / ${n(ws.length - mk)}</b><span>${X('مكي / مدني', 'Makki / Madani')}</span></div></div>${bars(c)}<div class="pill-row">${c.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, 5).filter(x => x[0]).map(([v, i]) => `<a class="chip" href="#s${i + 1}">${esc(Q.surahs[i].name)} · ${n(v)}</a>`).join('')}</div><p class="tl-src" style="margin:0">${sub}</p>${link ? `<div class="toolbar"><a class="btn" href="${link}">${X('كل المواضع والآيات', 'All occurrences and verses')}</a></div>` : ''}</section>`; };
    const show = word => {
      const r = analyse(word), box = $('#lz-out'); if (!r) { box.innerHTML = ''; return; }
      let h = '';
      if (r.root != null) { const ws = wordsByRoot.get(r.root); h += card(`${X('الجذر', 'Root')}: ${rootFmt(W.roots[r.root][0])}`, X('كل ما اشتُق من هذا الجذر: أسماء وأفعالاً.', 'Every noun and verb derived from this root.'), ws, `#root${r.root}`); }
      r.lem.slice(0, 4).forEach(li => { const l = W.lemmas[li]; h += card(`${X('اللفظ', 'Lemma')}: ${esc(l[0])}`, X('الصيغ المنسوبة إلى هذا اللفظ في المدونة الصرفية.', 'Forms assigned to this lemma in the morphology corpus.'), wordsByLemma.get(li), `#lem${li}`); });
      if (r.form.length) h += card(`${X('الصيغة', 'Form')}: ${esc(strip(W.w[r.form[0]][0]))}`, X('اللفظ كما رُسم في المصحف بهذه الصورة تماماً.', 'The word exactly as written in the mushaf.'), r.form, '');
      if (!h) {
        const near = [...getFormIx().keys()].filter(k => k.includes(r.nq)).slice(0, 12);
        h = `<p class="muted">${X('لم أجد هذا اللفظ بهذه الصورة. جرّب الجذر (مثل: رحم) أو الصيغة المجرّدة.', 'No exact match. Try the root (e.g. رحم) or the bare form.')}</p>${near.length ? `<div class="pill-row">${near.map(k => `<a class="chip" href="#lafz/${encodeURIComponent(k)}">${esc(k)}</a>`).join('')}</div>` : ''}`;
      }
      box.innerHTML = h;
    };
    const famous = [['حيي', 'موت'], ['رحم', 'عذب'], ['هدي', 'ضلل'], ['نفع', 'ضرر'], ['خير', 'شرر'], ['صلو', 'زكو']];
    const pairRows = famous.map(([a, b]) => { const ia = rootByKey.get(a), ib = rootByKey.get(b); if (ia == null || ib == null) return ''; return `<tr><td>${rootFmt(W.roots[ia][0])} <a href="#lafz/${encodeURIComponent(a)}">${n(W.roots[ia][1])}</a></td><td>${rootFmt(W.roots[ib][0])} <a href="#lafz/${encodeURIComponent(b)}">${n(W.roots[ib][1])}</a></td></tr>`; }).join('');
    V(`<div class="stack" id="tl-root">
      ${head(X('عدّاد الألفاظ', 'Word counter'), X('كم مرة ورد اللفظ في القرآن، وأين؟', 'How many times does a word occur in the Quran, and where?'), X('اكتب جذراً أو لفظاً أو صيغة، فيظهر عدد وروده وعدد الآيات والسور وتوزيعه على السور مكيّها ومدنيّها، من المدونة الصرفية للقرآن. والأعداد صرفية أي بحسب الجذر أو اللفظ أو الرسم، ولا يُستدل بتساويها على شيء.', 'Type a root, lemma or form and see how often it occurs, in how many verses and surahs, and its spread across Makki and Madani surahs, from the Quranic morphology corpus. Counts are morphological (by root, lemma or spelling); equal counts prove nothing by themselves.'))}
      <div class="toolbar"><input id="lz-q" type="search" class="field" style="flex:1;min-width:200px" placeholder="${X('مثال: رحم، الصلاة، ٱلْكِتَٰبُ', 'e.g. رحم، الصلاة')}" value="${esc(q0)}" autocomplete="off"><button class="btn pri" id="lz-go" type="button">${X('عُدّ', 'Count')}</button></div>
      <div class="pill-row">${['رحم', 'صبر', 'علم', 'نور', 'جنة', 'نار', 'صلاة', 'قرآن'].map(w => `<a class="chip" href="#lafz/${encodeURIComponent(w)}">${w}</a>`).join('')}</div>
      <div class="stack" id="lz-out"></div>
      <section class="panel stack tight"><h2>${X('قارن جذرين', 'Compare two roots')}</h2><div class="tl-grid">${field('lz-a', X('الجذر الأول', 'First root'), '', 'حيي', 'text')}${field('lz-b', X('الجذر الثاني', 'Second root'), '', 'موت', 'text')}</div><div class="tl-res" id="lz-cmp">${X('اكتب جذرين للمقارنة.', 'Type two roots to compare.')}</div>
        <div class="tl-scroll"><table class="tl-tbl"><thead><tr><th>${X('جذر', 'Root')}</th><th>${X('جذر', 'Root')}</th></tr></thead><tbody>${pairRows}</tbody></table></div></section>
      <div class="tl-note">${X('الأصل في هذه الأرقام أنها معلومات للباحث. والعدّ يختلف باختلاف الأساس: الجذر يجمع كل مشتقاته، واللفظ يجمع صيغه، والصيغة هي الرسم المحدد؛ فاذكر الأساس عند النقل. وللإحصاءات العامة للسور والحروف انظر <a href="#stats">الإحصاء العام</a>.', 'These numbers are research information. A count depends on its basis: a root gathers all derivatives, a lemma its forms, a form one exact spelling, so always state the basis when quoting. For general surah and letter statistics see <a href="#stats">General statistics</a>.')}</div></div>`);
    const go = () => { const v = $('#lz-q').value.trim(); show(v); };
    $('#lz-go').onclick = go; $('#lz-q').onkeydown = e => { if (e.key === 'Enter') go(); };
    const cmp = () => { const a = norm($('#lz-a').value).replace(/\s/g, ''), b = norm($('#lz-b').value).replace(/\s/g, ''), ia = rootByKey.get(a), ib = rootByKey.get(b); $('#lz-cmp').innerHTML = !a || !b ? X('اكتب جذرين للمقارنة.', 'Type two roots to compare.') : ia == null || ib == null ? X('لم يوجد أحد الجذرين. اكتب الجذر ثلاثياً مجرداً مثل: رحم.', 'One of the roots was not found. Type the bare root, e.g. رحم.') : `${rootFmt(W.roots[ia][0])}: <b>${n(W.roots[ia][1])}</b> · ${rootFmt(W.roots[ib][0])}: <b>${n(W.roots[ib][1])}</b>`; };
    $('#lz-a').oninput = $('#lz-b').oninput = cmp;
    if (q0) show(q0);
  }

  /* ============================================================ خطة الختمة والأوسمة (مبنية على سجل القراءة في المصحف ST.log) */
  const PAGES = 604;
  const W_ITEMS = [['am', X('أذكار الصباح', 'Morning adhkar')], ['pm', X('أذكار المساء', 'Evening adhkar')], ['dh', X('ركعتا الضحى', 'Duha prayer')], ['qy', X('قيام الليل', 'Night prayer')], ['sd', X('صدقة', 'Charity')], ['sy', X('صيام', 'Fasting')], ['mk', X('مراجعة المحفوظ', 'Revise memorisation')]];
  const kp = () => { ST.kplan = cleanKplan(ST.kplan); return ST.kplan; };
  const dayDiff = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / DAY);
  const seenSet = () => { const from = ST.khatma || '0000-00-00', s = new Set(); Object.entries(ST.log || {}).forEach(([d, a]) => { if (d >= from) a.forEach(p => s.add(p)); }); return s; };
  const allPages = () => Object.values(ST.log || {}).reduce((t, a) => t + a.length, 0);
  const goalMet = d => (ST.log[d] || []).length > 0;
  function streakOf() { let s = 0, t = Date.now(); if (!goalMet(dayKey(t))) t -= DAY; while (goalMet(dayKey(t))) { s++; t -= DAY; } return s; }
  function bestStreak() { const ks = Object.keys(ST.log || {}).filter(goalMet).sort(); let b = 0, c = 0, prev = ''; ks.forEach(k => { c = prev && dayDiff(prev, k) === 1 ? c + 1 : 1; prev = k; if (c > b) b = c; }); return b; }
  function badges(w) {
    const tot = allPages(), best = bestStreak(), kh = w.count, hif = Object.keys(ST.hifz || {}).length, st = streakOf();
    return [
      ['🌱', X('البداية', 'The start'), X('سجّلت أول قراءة', 'Logged your first reading'), tot > 0],
      ['🔥', X('ثلاثة أيام', 'Three days'), X('٣ أيام متتالية', '3 days in a row'), best >= 3],
      ['🌙', X('أسبوع كامل', 'A full week'), X('٧ أيام متتالية', '7 days in a row'), best >= 7],
      ['⭐', X('أربعة عشر يوماً', 'Fourteen days'), X('١٤ يوماً متتالية', '14 days in a row'), best >= 14],
      ['🏅', X('شهر من الثبات', 'A month of steadiness'), X('٣٠ يوماً متتالية', '30 days in a row'), best >= 30],
      ['📖', X('مئة صفحة', 'A hundred pages'), X('قرأت ١٠٠ صفحة', 'Read 100 pages'), tot >= 100],
      ['🌟', X('ربع القرآن', 'A quarter'), X('قرأت ١٥١ صفحة', 'Read 151 pages'), tot >= 151],
      ['🕌', X('الختمة الأولى', 'First khatmah'), X('أتممت ختمة كاملة', 'Completed a full khatmah'), kh >= 1],
      ['👑', X('ثلاث ختمات', 'Three khatmahs'), X('أتممت ٣ ختمات', 'Completed 3 khatmahs'), kh >= 3],
      ['🧠', X('بداية الحفظ', 'Memorisation begun'), X('سجّلت مقطعاً في الحفظ', 'Logged a passage in Hifz'), hif >= 1],
      ['🔥', X('السلسلة الحالية', 'Current streak'), `${n(st)} ${X('يوم', 'day(s)')}`, st > 0],
    ].map(b => ({ i: b[0], t: b[1], d: b[2], on: b[3] }));
  }
  function khatmaView() {
    const w = kp(), today = dayKey(), draw = () => khatmaView(), seen = seenSet(), done = seen.size;
    const tdy = (ST.log[today] || []).length;
    const portion = () => { if (!w.goal) return 0; const left = Math.max(0, PAGES - done), passed = Math.max(0, dayDiff(w.goal.start, today)), dl = Math.max(1, w.goal.days - passed); return Math.max(1, Math.ceil(left / dl)); };
    const port = portion(), st = streakOf(), pct = Math.min(100, Math.round(done / PAGES * 100));
    let next = 1; while (next <= PAGES && seen.has(next)) next++;
    const days = []; for (let i = 29; i >= 0; i--) days.push(dayKey(Date.now() - i * DAY));
    const cnt = k => (ST.log[k] || []).length, mxd = Math.max(1, ...days.map(cnt)), bd = badges(w);
    const goalForm = `<section class="panel stack"><h2>${X('ابدأ خطة ختمتك', 'Start your khatmah plan')}</h2><p class="muted" style="margin:0">${X('اختر المدة، فتُقسَّم صفحات المصحف الستمئة والأربع على الأيام ويظهر ورد كل يوم. وتُحسب قراءتك تلقائياً من صفحات المصحف التي تفتحها.', 'Choose the duration; the 604 pages are split across the days and each day’s portion is shown. Your progress is counted automatically from the mushaf pages you open.')}</p><div class="pill-row" id="w-pre">${[[7, X('أسبوع', '1 week')], [15, X('١٥ يوماً', '15 days')], [30, X('شهر (رمضان)', '30 days (Ramadan)')], [60, X('شهران', '2 months')], [90, X('٣ أشهر', '3 months')], [180, X('٦ أشهر', '6 months')], [365, X('سنة', '1 year')]].map(([d, l]) => `<button class="btn" data-d="${d}" type="button">${l}</button>`).join('')}</div>
      <div class="tl-grid">${field('w-days', X('أو عدد أيام آخر', 'Or another number of days'), '', '', 'numeric')}</div><button class="btn pri" id="w-start" type="button">${X('ابدأ', 'Start')}</button></section>`;
    V(`<div class="stack" id="tl-root">
      ${head(X('خطة الختمة', 'Khatmah plan'), X('ختمتك وأوسمتك وأعمالك اليومية', 'Your khatmah, badges and daily checklist'), X('حدّد مدة ختمتك فيُقسَّم المصحف على الأيام، وتابع أوسمتك، وضع لنفسك أعمالاً يومية. القراءة تُسجَّل تلقائياً من المصحف وتظهر أيضاً في «وردي وتقدّمي». تُحفظ على جهازك وتنتقل مع بياناتك، وتعمل دون إنترنت.', 'Choose how long your khatmah should take and the mushaf is split across the days; follow your badges and keep a daily checklist. Reading is logged automatically from the mushaf and also appears in “My wird and progress”. Saved on your device and with your data; works offline.'))}
      ${w.goal ? `<section class="panel stack"><div class="tl-grid"><div class="tile"><b>${n(Math.min(done, PAGES))} / ${n(PAGES)}</b><span>${X('صفحة من الختمة الحالية', 'pages of the current khatmah')}</span></div><div class="tile"><b>${n(tdy)} / ${n(port)}</b><span>${X('قرأت اليوم من ورد اليوم', 'read today of today’s portion')}</span></div><div class="tile"><b>${n(st)}</b><span>${X('يوم متتالٍ', 'day streak')}</span></div><div class="tile"><b>${n(w.count)}</b><span>${X('ختمة مكتملة', 'khatmahs completed')}</span></div></div>
        <div style="height:12px;border-radius:99px;background:var(--line);overflow:hidden"><div style="height:100%;width:${pct}%;background:var(--accent)"></div></div>
        <div class="muted" style="font-size:.9rem">${n(pct)}٪ ${tdy >= port ? '✓ ' + X('أتممت ورد اليوم', 'today’s portion done') : ''} · ${X('بدأت الخطة', 'Plan started')} ${dstr(Date.parse(w.goal.start + 'T12:00:00Z'))} · ${X('المدة', 'Goal')}: ${n(w.goal.days)} ${X('يوماً', 'days')}</div>
        <div class="toolbar">${done >= PAGES ? `<button class="btn pri" id="w-fin" type="button">${X('أتممت الختمة، ابدأ ختمة جديدة', 'Khatmah complete, start a new one')}</button>` : `<a class="btn pri" href="#p${Math.min(PAGES, next)}">${X('اقرأ من الصفحة', 'Read from page')} ${n(Math.min(PAGES, next))}</a>`}<a class="btn" href="#wird">${X('وردي وتقدّمي', 'My wird and progress')}</a><button class="btn ghost" id="w-new" type="button">${X('تغيير المدة', 'Change duration')}</button></div></section>` : goalForm}
      <div class="cols"><section class="panel stack tight"><h2>${X('آخر ٣٠ يوماً', 'Last 30 days')}</h2><div class="wd-heat">${days.map(k => { const v = cnt(k); return `<i title="${k.slice(8)}/${k.slice(5, 7)}: ${n(v)}" style="${v ? `background:var(--accent);opacity:${(0.3 + 0.7 * v / mxd).toFixed(2)}` : ''}"></i>`; }).join('')}</div>
        <div class="muted" style="font-size:.84rem">${X('إجمالي ما قرأت', 'Total read')}: ${n(allPages())} ${X('صفحة', 'pages')} · ${X('أطول سلسلة', 'Best streak')}: ${n(bestStreak())}</div></section>
        <section class="panel stack tight"><h2>${X('أعمال اليوم', 'Today’s checklist')}</h2><div id="w-items">${w.items.map(it => `<label class="tl-check"><input type="checkbox" data-id="${esc(it.id)}" ${(w.done[today] || []).includes(it.id) ? 'checked' : ''}><span>${esc(it.t)}</span><button class="x" type="button" data-del="${esc(it.id)}" aria-label="${X('حذف', 'Remove')}">×</button></label>`).join('') || `<p class="muted" style="margin:0">${X('أضف الأعمال التي تلتزم بها يومياً.', 'Add the acts you commit to daily.')}</p>`}</div>
          <div class="pill-row">${W_ITEMS.filter(([id]) => !w.items.some(x => x.id === id)).map(([id, t]) => `<button class="chip" type="button" data-add="${id}">+ ${t}</button>`).join('')}</div>
          <div class="toolbar"><input class="field" id="w-new-t" maxlength="40" placeholder="${X('عمل آخر…', 'Another item…')}" style="flex:1;min-width:140px"><button class="btn" id="w-new-b" type="button">${X('إضافة', 'Add')}</button></div>
          <p class="tl-src" style="margin:0">${X('أذكار الصباح والمساء في', 'Morning and evening adhkar are in')} <a href="#adhkar">${X('قسمها', 'their section')}</a>.</p></section></div>
      <section class="panel stack tight"><h2>${X('الأوسمة', 'Achievements')}</h2><div class="tl-grid" style="grid-template-columns:repeat(auto-fit,minmax(210px,1fr))">${bd.map(b => `<div class="wd-badge${b.on ? '' : ' off'}"><span class="ic">${b.i}</span><div><b>${b.t}</b><div class="tl-src">${b.d}</div></div></div>`).join('')}</div></section>
      <div class="tl-note">${X('قال النبي ﷺ: «أحبُّ الأعمال إلى الله أدومها وإن قلّ» (متفق عليه). فاجعل وردك قدراً تستطيع الدوام عليه، ثم زِد بالتدريج.', 'The Prophet ﷺ said: “The most beloved deeds to Allah are the most consistent, even if small” (agreed upon). Choose a portion you can keep up, then increase gradually.')}</div>${quran(73, 4)}</div>`);
    const root = $('#tl-root');
    const start = d => { w.goal = { start: today, days: d }; save(); draw(); };
    root.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.d) return start(+b.dataset.d);
      if (b.id === 'w-start') { const d = MS(pn($('#w-days').value)); return d >= 1 && d <= 1000 ? start(d) : toast(X('اختر مدة بين ١ و١٠٠٠ يوم', 'Choose between 1 and 1000 days')); }
      if (b.id === 'w-new') { w.goal = null; save(); draw(); }
      else if (b.id === 'w-fin') { w.count++; ST.khatma = today; if (w.goal) w.goal.start = today; save(); toast(X('بارك الله فيك، تقبّل الله ختمتك!', 'May Allah accept your khatmah!')); draw(); }
      else if (b.dataset.add) { const it = W_ITEMS.find(x => x[0] === b.dataset.add); if (it && w.items.length < 12) { w.items.push({ id: it[0], t: it[1] }); save(); draw(); } }
      else if (b.id === 'w-new-b') { const t = $('#w-new-t').value.trim().slice(0, 40); if (t && w.items.length < 12) { w.items.push({ id: 'c' + Date.now().toString(36), t }); save(); draw(); } }
      else if (b.dataset.del) { w.items = w.items.filter(x => x.id !== b.dataset.del); save(); draw(); }
    };
    root.onchange = e => { const c = e.target.closest('input[data-id]'); if (!c) return; const a = new Set(w.done[today] || []); c.checked ? a.add(c.dataset.id) : a.delete(c.dataset.id); w.done[today] = [...a]; const o = {}; Object.keys(w.done).sort().slice(-120).forEach(k => { o[k] = w.done[k]; }); w.done = o; save(); };
  }

  window.MTOOLS = { hijri: hijriView, zakat: zakatView, mawarith: mawarithView, lafz: lafzView, khatma: khatmaView, remind, solve: solveInheritance, hijriOf: ms => hp(ms), camelDue, cattleDue, sheepDue, fastOf };
})();
