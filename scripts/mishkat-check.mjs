// فحص «مشكاة» المنشور: يعمل مستقلاً دون أي اتصال بـ Claude، وصفحات الأدوار تعمل.
import pw from 'playwright';
const { chromium } = pw;
const B = process.env.MISHKAT_URL || 'https://munjiz-qa.github.io/mishkat/';
let fail = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };
const b = await chromium.launch(); const p = await b.newPage(); await p.addInitScript(() => { try { localStorage.setItem('mishkat:welcomeSnooze', String(Date.now() + 864e5)); } catch (e) {} }); const bad = [], errs = [];
p.on('request', r => { if (/claude|anthropic/i.test(new URL(r.url()).host)) bad.push(r.url()); });
p.on('pageerror', e => errs.push(e.message));
for (const f of ['', 'app.js', 'app.css', 'sw.js', 'manifest.webmanifest', 'config.json', 'data/quran.txt', 'data/t/muyassar/0.txt', ...['bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah'].map(k => `data/hadith/${k}.txt`), 'data/tr/index.json', 'data/tr/en.txt', 'data/tr/fr.txt', 'data/i18n/en.json', 'data/i18n/fr.json', 'data/i18n/ur.json']) {
  const r = await p.request.get(B + f); ok(r.ok(), `${f || 'index.html'} → ${r.status()}`);
}
const cfg = await (await p.request.get(B + 'config.json')).json();
ok(['client', 'admin'].every(u => cfg.users?.some(x => x.u === u && !x.off)), 'الحسابان الافتراضيان (client و admin) موجودان ومفعّلان');
ok(cfg.users.every(x => /^pbkdf2\$\d{6,}\$/.test(x.h || '')), 'كلمات المرور محفوظة بتجزئة PBKDF2 مملّحة، لا نص صريح ولا تجزئة سريعة');
await p.goto(B + '#home'); await p.waitForSelector('.daily', { timeout: 30000 });
ok(!!(await p.$('meta[http-equiv="Content-Security-Policy"]')) && await p.evaluate(async () => (await fetch('https://example.com/').then(() => 'open', () => 'blocked')) === 'blocked'), 'سياسة أمان المحتوى (CSP) مفعّلة وتمنع الاتصال بمواقع غريبة');
{ const r = await p.evaluate(() => { const g = s => document.querySelector(s)?.getBoundingClientRect(); return { m: g('.mphome'), a: g('.toprow .adhbar'), q: g('.toprow .prbar') }; });
  ok(r.m && r.a && r.q && r.m.top < 260 && r.a.right <= r.m.left + 1 && r.q.top > r.a.top && Math.abs(r.a.top - r.m.top) < 4, 'الكمبيوتر: المصحف أعلى الرئيسية وبجواره الأذكار ومواقيت الصلاة'); }
{ const d = await p.evaluate(() => { const r = x => { const o = dailyPick(new Date(x)); return Q.ayat[o.i][0] + ':' + Q.ayat[o.i][1] + ' ' + o.tag; };
    return { why: document.querySelector('.daily .dl-why')?.textContent || '', arafa: r('2026-05-26T12:00'), ashura: r('2026-06-25T12:00'), fitr: r('2026-03-20T12:00') }; });
  ok(d.why.startsWith('سبب الاختيار') && d.arafa === '5:3 يوم عرفة' && d.ashura === '26:65 يوم عاشوراء' && d.fitr === '2:185 عيد الفطر', `آية اليوم بسبب اختيارها وتتبع المناسبات الهجرية (${d.arafa} · ${d.ashura} · ${d.fitr})`); }
ok((await p.$$('.path')).length >= 4 && (await p.$$('.path .scard')).length >= 23 && !!(await p.$('.path .scard[href="#jannah"]')) && !!(await p.$('.path .scard[href="#tawhid"]')), 'الرئيسية: أربعة مسارات وبطاقات الأقسام كلها، ومنها التوحيد في القرآن الكريم');
{ // نسخة الجوال المبسطة: فهرس كل الأقسام في أول الشاشة، وركن الأطفال بقصصه وأسئلته
  const m = await b.newPage({ viewport: { width: 390, height: 844 } }); await m.goto(B + '#home'); await m.waitForSelector('.mindex .mi-tile', { timeout: 30000 }).catch(() => {});
  const mi = await m.evaluate(() => { const t = [...document.querySelectorAll('.mindex .mi-tile')], y = s => document.querySelector(s)?.getBoundingClientRect().top ?? 9e9;
    return { n: t.length, mp: y('.mphome'), ad: y('.toprow .adhbar'), pr: y('.toprow .prbar'), mx: t.length ? t[0].getBoundingClientRect().top : 9e9, paths: getComputedStyle(document.querySelector('.home2 .paths')).display }; });
  ok(mi.n >= 23 && mi.paths === 'none', 'الجوال: فهرس الأقسام كلها بدل البطاقات الطويلة');
  ok(mi.mp < 200 && mi.mp < mi.ad && mi.ad < mi.pr && mi.pr < mi.mx, 'الجوال: المصحف أول الصفحة ثم الأذكار ثم مواقيت الصلاة ثم فهرس الأقسام');
  await m.evaluate(() => location.hash = 'kids'); await m.waitForTimeout(800);
  ok(await m.evaluate(() => document.querySelectorAll('.k-card .ksv').length >= 11), 'ركن الأطفال: ١١ قصة مصوّرة');
  await m.evaluate(() => location.hash = 'k-nuh'); await m.waitForTimeout(800);
  const k = await m.evaluate(() => ({ s: document.querySelectorAll('.k-scene .ksv').length, a: document.querySelectorAll('.k-scene .k-ay .ayah').length, q: document.querySelectorAll('.k-q').length }));
  await m.evaluate(() => document.querySelectorAll('.k-q').forEach(f => f.querySelectorAll('.k-op').forEach(x => { if (x.dataset.k === '0') x.click(); })));
  const st = await m.evaluate(() => JSON.parse(localStorage.getItem('mishkat:kids') || '{}').nuh);
  ok(k.s === 5 && k.a >= 5 && k.q === 3 && st === 3, 'قصة سفينة نوح: ٥ مشاهد مصوّرة بآياتها، و٣ أسئلة تمنح النجوم');
  await m.evaluate(() => location.hash = 'ulum'); await m.waitForSelector('#u-nuzul .u-q blockquote', { timeout: 60000 }).catch(() => {});
  const u = await m.evaluate(() => ({ ch: document.querySelectorAll('.u-ch').length, ix: document.querySelectorAll('.u-index li').length, q: document.querySelectorAll('#u-nuzul .u-q').length, a: document.querySelectorAll('#u-nuzul .u-ev .ayah').length }));
  ok(u.ch >= 20 && u.ix === u.ch && u.q >= 3 && u.a >= 5, 'علوم القرآن: أبواب مسلسلة بفهرسها، وشواهد الباب الأول بآياتها ونقول المفسرين');
  for (const [v, min, nm] of [['duaa', 30, 'أدعية القرآن'], ['nisaa', 40, 'ركن المرأة في القرآن'], ['rijal', 40, 'ركن الرجل في القرآن'], ['shifa', 30, 'الأمراض والعلاج في القرآن'], ['usra', 35, 'ركن الأسرة في القرآن']]) {
    await m.evaluate(h => location.hash = h, v); await m.waitForSelector('.th-item', { timeout: 30000 }).catch(() => {});
    await m.evaluate(() => { const d = document.querySelector('.th-item'); if (d) d.open = true; }); await m.waitForSelector('.th-item .u-tf blockquote', { timeout: 60000 }).catch(() => {});
    const t = await m.evaluate(() => ({ n: document.querySelectorAll('.th-item').length, ix: document.querySelectorAll('.th-index li').length, a: document.querySelectorAll('.th-item .ayah').length, q: document.querySelectorAll('.th-item .u-tf blockquote').length }));
    ok(t.n >= min && t.ix === t.n && t.a >= t.n && t.q >= 1, `${nm}: ${t.n.toLocaleString("ar-EG")} مدخلاً مفهرساً بآياتها، ونقل التفسير يظهر عند الفتح`);
  }
  { // التوحيد في القرآن الكريم: أقسامه الثلاثة، وأبوابه بآياتها بنص مجمع الملك فهد، وأحاديثها بتخريجها، ونقول المفسرين
    await m.evaluate(() => location.hash = 'tawhid'); await m.waitForSelector('.tw-ch', { timeout: 30000 }).catch(() => {});
    await m.evaluate(() => document.querySelectorAll('.tw-ch').forEach(d => d.open = true));
    const t = await m.evaluate(() => ({ k: document.querySelectorAll('.tw-k').length, ch: document.querySelectorAll('.tw-ch').length, ix: document.querySelectorAll('.u-index li').length,
      a: document.querySelectorAll('.tw-q').length, h: document.querySelectorAll('.tw-h .tw-matn').length, q: document.querySelectorAll('.tw-qt blockquote').length,
      kursi: (document.querySelector('.tw-q .tw-n[data-ayah="261"]')?.parentElement.textContent || '').includes('\u0671\u0644\u06e1\u062d\u064e\u064a\u0651\u064f\u0020\u0671\u0644\u06e1\u0642\u064e\u064a\u0651\u064f\u0648\u0645\u064f'), wide: document.documentElement.scrollWidth <= innerWidth + 1 }));
    ok(t.k === 3 && t.ch >= 8 && t.ix === t.ch && t.a >= 80 && t.h >= 14 && t.q >= 9 && t.kursi && t.wide, `التوحيد في القرآن الكريم: ${t.ch.toLocaleString("ar-EG")} أبواب، ${t.a.toLocaleString("ar-EG")} آية بنص مجمع الملك فهد، ${t.h.toLocaleString("ar-EG")} حديثاً، ${t.q.toLocaleString("ar-EG")} نقول، دون تمدد أفقي على الجوال`);
  }
  { // وصف الجنة وأنواعها في القرآن الكريم: أسماؤها بآياتها، ومراتبها، وأبوابها بآيات مجمع الملك فهد، وأحاديثها بتخريجها، ونقول المفسرين
    await m.evaluate(() => location.hash = 'jannah'); await m.waitForSelector('.jn-ch', { timeout: 30000 }).catch(() => {});
    await m.evaluate(() => document.querySelectorAll('.jn-ch').forEach(d => d.open = true));
    const t = await m.evaluate(() => ({ k: document.querySelectorAll('.jn-k').length, tr: document.querySelectorAll('.jn-tr').length, ch: document.querySelectorAll('.jn-ch').length, ix: document.querySelectorAll('.jn .u-index li').length,
      a: document.querySelectorAll('.jn-ay .jn-q').length, h: document.querySelectorAll('.jn-h .jn-matn').length, q: document.querySelectorAll('.jn-qt blockquote').length,
      firdaws: (document.querySelector('#jnk-firdaws .jn-t')?.textContent || '').includes('ٱلۡفِرۡدَوۡسِ'), wide: document.documentElement.scrollWidth <= innerWidth + 1 }));
    ok(t.k >= 11 && t.tr === 4 && t.ch >= 9 && t.ix === t.ch && t.a >= 100 && t.h >= 20 && t.q >= 18 && t.firdaws && t.wide, `وصف الجنة في القرآن: ${t.k} اسماً، ${t.ch} أبواب، ${t.a} آية بنص مجمع الملك فهد، ${t.h} حديثاً، ${t.q} نقلاً، دون تمدد أفقي على الجوال`);
  }
  await m.evaluate(() => location.hash = 'ruqya'); await m.waitForSelector('.ruq-h', { timeout: 30000 }).catch(() => {});
  const rq = await m.evaluate(() => ({ ch: document.querySelectorAll('.ruq-ch').length, ix: document.querySelectorAll('.ruq .u-index li').length, h: document.querySelectorAll('.ruq-h .ruq-matn').length, tx: document.querySelectorAll('.ruq-h .ruq-tx .num').length, a: document.querySelectorAll('.ruq-ay .ayah').length, q: document.querySelectorAll('.ruq-q blockquote').length, al: document.querySelectorAll('.ruq-alert').length }));
  ok(rq.ch >= 8 && rq.ix === rq.ch && rq.h >= 18 && rq.tx >= rq.h && rq.a >= 30 && rq.q >= 5 && rq.al >= 1, `التداوي بالقرآن: ${rq.h.toLocaleString("ar-EG")} حديثاً بتخريجها، و${rq.q.toLocaleString("ar-EG")} نقول للعلماء، وآيات الرقية، وتنبيه طبي`);
  await m.close();
}
ok(await p.evaluate(() => typeof window.claude === 'undefined'), 'لا يوجد أي مكوّن من Claude في الصفحة');
for (const v of ['account', 'admin', 'search', 'hifz', 'map', 'awwalin', 'ijaz', 'research', 'kids', 'ulum', 'duaa', 'nisaa', 'rijal', 'shifa', 'usra', 'tawhid', 'jannah', 'ruqya']) {
  await p.evaluate(v => location.hash = v, v); await p.waitForTimeout(700);
  const t = await p.evaluate(() => document.body.innerText); ok(!/claude|anthropic/i.test(t) && t.length > 200, `صفحة ${v} تعمل ولا تذكر Claude`);
}
await p.evaluate(() => location.hash = 'research'); await p.waitForTimeout(700);
await p.fill('#rq', 'الصبر'); await p.click('#rgo');
await p.waitForSelector('#rdoc #rprint', { timeout: 600000 }).catch(() => {});
const doc = await p.evaluate(() => document.querySelector('#rdoc')?.innerText || '');
ok(/الآيات القرآنية/.test(doc) && /أقوال المفسرين/.test(doc) && /السنة النبوية/.test(doc) && /صحيح (البخاري|مسلم)/.test(doc) && /المراجع/.test(doc), 'مختبر الأبحاث يُعدّ بحثاً مؤصّلاً بالقرآن والتفسير والسنة والمراجع');
{ // القصص القرآني الموسّع: ملخص مجمّع بآياته، ونقول من ابن كثير والطبري والقرطبي، والعبر، ورابط الفيديو
  await p.evaluate(() => location.hash = 't-qasas'); await p.waitForSelector('#tpanel details', { timeout: 30000 }).catch(() => {});
  await p.evaluate(() => { const d = [...document.querySelectorAll('#tpanel details')].find(x => x.querySelector('.t')?.textContent === 'يوسف وإخوته'); d?.querySelector('summary').click(); });
  await p.waitForSelector('#tpanel .qstory .qs-quote', { timeout: 30000 }).catch(() => {});
  const qs = await p.evaluate(() => { const x = document.querySelector('#tpanel .qstory'); return x ? { s: x.querySelectorAll('.qs-steps li a[data-ayah]').length, q: [...x.querySelectorAll('.qs-quote figcaption b')].map(b => b.textContent).join(), l: x.querySelectorAll('.qs-lesson').length, v: !!x.querySelector('a.qs-video[href*="youtube.com/results"]') } : null; });
  ok(qs && qs.s >= 5 && qs.q === 'تفسير ابن كثير,تفسير الطبري,تفسير القرطبي' && qs.l >= 3 && qs.v, 'القصص القرآني: قصة يوسف مجمّعة بآياتها، مع نقول ابن كثير والطبري والقرطبي والعبر ورابط الفيديو');
}
{ // أذكار الصباح والمساء: الورد المناسب لوقت مدينة المستخدم، بنصوص حصن المسلم وتخريجها، وعدّاد لكل ذكر
  await p.evaluate(() => location.hash = 'adhkar'); await p.waitForTimeout(1200);
  const ad = await p.evaluate(() => { const A = adhNow(prCfg()), x = document.querySelector('.adh'); return x ? { k: A.kind, shown: x.classList.contains(A.kind), n: document.querySelectorAll('.adh-card').length, src: document.querySelectorAll('.adh-src').length, home: typeof adhHomeCard() === 'string' && /adhbar/.test(adhHomeCard()) } : null; });
  ok(ad && ad.shown && ad.n === (ad.k === 'm' ? 23 : 21) && ad.src === ad.n && ad.home, `أذكار الصباح والمساء: يظهر ورد ${ad?.k === 'm' ? 'الصباح' : 'المساء'} في وقته (${ad?.n} ذكراً بتخريجها) مع بطاقة الرئيسية`);
  await p.click('.adh-card [data-adhc]'); ok(await p.evaluate(() => /[١1]/.test(document.querySelector('.adh-card .adh-count b').textContent)), 'عدّاد الأذكار يعمل');
}
{ // الفاكهة والطعام في القرآن الكريم: الأصناف المسمّاة بآياتها، والأبواب بنص مجمع الملك فهد، والأحاديث بتخريجها، ونقول المفسرين، والتنبيه الطبي
  await p.evaluate(() => location.hash = 'taam'); await p.waitForSelector('.tm-ch', { timeout: 30000 }).catch(() => {});
  await p.evaluate(() => document.querySelectorAll('.tm-ch').forEach(d => d.open = true));
  const t = await p.evaluate(() => ({ f: document.querySelectorAll('.tm-f').length, ch: document.querySelectorAll('.tm-ch').length, ix: document.querySelectorAll('.u-index li').length,
    a: document.querySelectorAll('.tm-q').length, h: document.querySelectorAll('.tm-h .tm-matn').length, q: document.querySelectorAll('.tm-qt blockquote').length, warn: !!document.querySelector('.tm-warn'),
    tin: (document.querySelector('.tm-q .tm-n[data-ayah="' + idxOf(95, 1) + '"]')?.parentElement.textContent || '').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').includes('لتين وٱلزيتون') }));
  ok(t.f >= 16 && t.ch >= 10 && t.ix === t.ch && t.a >= 100 && t.h >= 20 && t.q >= 10 && t.warn && t.tin, `الفاكهة والطعام في القرآن الكريم: ${t.f} صنفاً، ${t.ch} أبواب، ${t.a} آية بنص مجمع الملك فهد، ${t.h} حديثاً بتخريجه، ${t.q} نقلاً، مع التنبيه الطبي`);
  const tt = await p.evaluate(() => document.body.innerText); ok(!/claude|anthropic/i.test(tt), 'صفحة taam تعمل ولا تذكر Claude');
}
{ // أدعية المناسبات وفقه العبادات: يُحمَّل fiqh.js عند أول فتح، والأحاديث بتخريجها، والخلاف المعتبر، والبحث
  for (const [k, exp] of [['adiya', { ch: 13, h: 47 }], ['ibadat', { ch: 6, h: 30, kh: 12 }]]) {
    await p.evaluate(h => location.hash = h, k); await p.waitForSelector('.tm-ch', { timeout: 30000 }).catch(() => {});
    const t = await p.evaluate(() => ({ ch: document.querySelectorAll('.tm-ch').length, h: document.querySelectorAll('.tm-h .tm-matn').length, kh: document.querySelectorAll('.fq-kh').length, ix: document.querySelectorAll('#fqx li').length, ay: document.querySelectorAll('.tm-q .tm-t').length, txt: document.body.innerText }));
    ok(t.ch === exp.ch && t.ix === t.ch && t.h === exp.h && (!exp.kh || t.kh === exp.kh) && t.ay >= 15, `قسم ${k}: ${t.ch} أبواب، ${t.h} حديثاً بتخريجها، ${t.kh} مسألة خلاف، ${t.ay} آية بنص مجمع الملك فهد`);
    ok(!/claude|anthropic/i.test(t.txt), `صفحة ${k} تعمل ولا تذكر Claude`);
  }
}
{ // الحج والعمرة: آيات بنص مجمع الملك فهد، وأحاديث بتخريجها ودرجتها، ونقول المفسرين، ورسوم متحركة تعمل
  await p.evaluate(() => location.hash = 'hajj'); await p.waitForSelector('.hj-ch', { timeout: 30000 }).catch(() => {});
  await p.evaluate(() => document.querySelectorAll('.hj-ch').forEach(d => d.open = true)); await p.waitForTimeout(3500);
  const h = await p.evaluate(() => ({ ch: document.querySelectorAll('.hj-ch').length, ix: document.querySelectorAll('.u-index li').length, a: document.querySelectorAll('.tm-ay .tm-q').length, h: document.querySelectorAll('.hj-h .tm-matn').length,
    q: document.querySelectorAll('.hj-hero ~ * .tm-qt blockquote, .tm-qt blockquote').length, svg: document.querySelectorAll('.hj-svg').length, daif: document.querySelectorAll('.hj-h.hj-tg-daif').length, warn: !!document.querySelector('.tm-warn'),
    lap: document.getElementById('hjLap')?.textContent || '', over: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }));
  ok(h.ch >= 12 && h.ix >= 12 && h.a >= 40 && h.h >= 60 && h.q >= 30 && h.svg >= 6 && h.daif >= 1 && h.warn && /[1-7١-٧]/.test(h.lap), `الحج والعمرة: ${h.ch} أبواب، ${h.a} آية بنص مجمع الملك فهد، ${h.h} حديثاً بتخريجه، ${h.q} نقلاً، ${h.svg} رسوم، والضعيف موسوم`);
  ok(!h.over, 'الحج والعمرة: لا تمرير أفقي للصفحة');
  await p.evaluate(() => document.querySelector('.hj-day:nth-child(2)')?.click()); await p.waitForTimeout(300);
  ok(await p.evaluate(() => /عرفة/.test(document.getElementById('hjDd')?.textContent || '')), 'الحج والعمرة: اختيار يوم عرفة يعرض تفاصيله وأدلته');
  const tt = await p.evaluate(() => document.body.innerText); ok(!/claude|anthropic/i.test(tt), 'صفحة hajj تعمل ولا تذكر Claude');
}
{ // التلاوة المتصلة، والقبلة وتقويم الشهر، واختبار الحفظ: الصفحات تعمل وبياناتها صحيحة
  await p.evaluate(() => location.hash = 'recite'); await p.waitForSelector('#rcGo', { timeout: 30000 }).catch(() => {});
  const r = await p.evaluate(() => ({ go: !!document.querySelector('#rcGo'), rs: document.querySelectorAll('#rcR option').length }));
  ok(r.go && r.rs >= 10, `التلاوة المتصلة: ${r.rs} قارئاً`);
  await p.evaluate(() => location.hash = 'prayer'); await p.waitForSelector('#prMon table', { timeout: 30000 }).catch(() => {});
  const m = await p.evaluate(() => { const d = new Date(); return { rows: document.querySelectorAll('#prMon tbody tr').length, days: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(), q: typeof qibla === 'function' ? Math.round(qibla(30.0444, 31.2357)) : 0, dial: !!document.querySelector('#qDial') }; });
  ok(m.rows === m.days && m.dial && Math.abs(m.q - 136) <= 2, `مواقيت الشهر كاملاً (${m.rows} يوماً) وبوصلة القبلة (القاهرة ${m.q}°)`);
  await p.evaluate(() => location.hash = 'hifz'); await p.waitForSelector('#hzMode', { timeout: 30000 }).catch(() => {});
  ok(await p.evaluate(() => !!document.querySelector('#hzMode [data-m="quiz"]')), 'وضع «اختبار قصير» في الحفظ');
}
await p.evaluate(() => location.hash = 'account'); await p.waitForTimeout(700);
ok(!!(await p.$('#uform')) && !!(await p.$('#rform')), 'صفحة الدخول للعميل والمدير وإنشاء الحساب تعمل');
{ // اللغات ومواقيت الصلاة: الإنجليزية مضمّنة، ومعاني الآيات بالترجمة المعتمدة، والمواقيت تُحسب على الجهاز
  const c2 = await b.newContext(); await c2.route(/translate\.(google|googleapis)/, r => r.abort()); const q = await c2.newPage(); const e2 = []; q.on('pageerror', e => e2.push(e.message));
  await q.addInitScript(() => { if (!sessionStorage.getItem('t')) { sessionStorage.setItem('t', '1'); localStorage.setItem('quran-lang', 'en'); } }); await q.goto(B + '#s1'); await q.waitForTimeout(6000);
  ok(await q.evaluate(() => document.documentElement.dir === 'ltr' && document.querySelectorAll('.mean').length === 7 && /praise/i.test([...document.querySelectorAll('.mean')].map(x => x.textContent).join(' '))), 'English: left-to-right, Al-Fatiha with its meanings (Saheeh International)');
  await q.evaluate(() => location.hash = 'prayer'); await q.waitForTimeout(1200);
  ok((await q.$$('.prcell')).length === 6 && /Next prayer/.test(await q.textContent('#view')), 'English: prayer times page');
  await q.evaluate(() => localStorage.setItem('quran-lang', 'fr')); await q.reload(); await q.waitForTimeout(5000);
  ok(await q.evaluate(() => document.documentElement.lang === 'fr' && /Paramètres/.test(document.querySelector('#nav').textContent)), 'Français : interface traduite intégrée');
  await q.evaluate(() => setLang('ar')); await q.waitForTimeout(5000); await q.evaluate(() => location.hash = 'prayer'); await q.waitForTimeout(1200);
  ok(await q.evaluate(() => document.documentElement.dir === 'rtl') && /الصلاة القادمة/.test(await q.textContent('#view')), 'العودة إلى العربية، ومواقيت الصلاة تعمل');
  ok(!e2.length, 'لا أخطاء برمجية في اللغات والمواقيت ' + e2.join(' | ')); await c2.close(); }
ok(!bad.length, 'لا طلبات إلى Claude أو Anthropic ' + bad.join(' '));
ok(!errs.length, 'لا أخطاء برمجية ' + errs.join(' | '));
await b.close(); process.exit(fail ? 1 : 0);
