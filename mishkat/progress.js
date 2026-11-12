/* مشكاة: وردي وتقدّمي (علامة «توقفت هنا» وهدف القراءة وسلسلتها وملاحظاتي)، والنسخ الاحتياطي، والمزامنة بين الأجهزة، وما الجديد.
   تعمل كلها في المتصفح دون خادم ودون أي اتصال بجهة خارجية، ولا يخرج منها شيء إلا بيدك: ملف تحفظه أو رمز مشفّر تنسخه. */
(() => {
const VERSION = window.MK_VERSION || '٤';
const RELEASES = [
  { v: '٤', d: '١٢ نوفمبر ٢٠٢٦', t: 'اتساع الموسوعة: أقسام جديدة، وتثبيت عند أول فتح، ومظهر أوضح', items: [
    'مظهر أوضح: ورق دافئ، وعمود تنقل ليلي بنقش نجمي، ولوحة ترحيب عميقة، وكتل ملوّنة للفئات الست.',
    'بطاقة ترحيب عند أول فتح تثبّت مشكاة بنقرة واحدة، ودليل آيفون، وتعود بعد ١٤ يوماً إن أُجّلت.',
    'ركن التفاسير وأسباب النزول (ثمانية تفاسير) وفهرس كتب التفسير الشامل (١١١ كتاباً)، والتفسير الموضوعي.',
    'الأنبياء والمرسلون في القرآن، والسيرة والغزوات، والناسخ والمنسوخ ومتشابه الآيات، والأحاديث الأربعون النووية.',
    'أسماء الله الحسنى، وأمثال القرآن، وأدعية القرآن والسنة بالمناسبة، وفقه الصيام والزكاة، والحج والعمرة.',
    'التقويم الهجري، وحاسبتا الزكاة والمواريث، وعدّاد الألفاظ، وخطة الختمة والأوسمة.',
    'ركن الأسرة في القرآن، وتوسعة ركني المرأة والرجل، وثماني قصص مصوّرة جديدة للأطفال مع تحدّي الأسئلة.',
    'خط زمني تفاعلي لقصص القرآن والحضارات، وأطلس القرآن، وقائمة أذان من ملف على جهازك.',
    'رقم الإصدار يُقرأ من مصدر واحد في كل الصفحات.' ] },
  { v: '٣٫٠', d: '١٢ نوفمبر ٢٠٢٦', t: 'ست فئات للأقسام وهوية بصرية جديدة', items: [
    'أقسام مشكاة في ست فئات: القرآن الكريم، التفسير والعلوم، موضوعات في القرآن، العبادات والأذكار، الأسرة والأطفال، الأدوات والاستكشاف.',
    'القائمة والرئيسية تُبنيان من سجل واحد، فكل قسم جديد يظهر فيهما تلقائياً.',
    'صف «أحدث ما زرته»، وأهداف لمس لا تقل عن ٤٨ بكسل، وحركات خفيفة تتوقف مع «تقليل الحركة».',
    'الإصدار ٢٫١ محفوظ في فرع الأرشيف archive/mishkat-v2، وبياناتك كما هي.' ] },
  { v: '٢٫١', d: '١١ نوفمبر ٢٠٢٦', t: 'وردي وتقدّمي، والنسخ الاحتياطي، والمزامنة', items: [
    'علامة «توقفت هنا»: تضعها على أي آية من نافذتها فتجدها في الرئيسية وتكمل منها بضغطة.',
    'هدف القراءة اليومي بالصفحات مع سلسلة الأيام المتتابعة وسجل آخر أسبوعين، وخطة ختمة تحسب لك أيامها.',
    'ملاحظاتك على الآيات: اكتب فائدة أو تدبراً تحت أي آية، وتجمعها صفحة «وردي وتقدّمي».',
    'نسخ احتياطي بملف واحد فيه إعداداتك وعلاماتك وملاحظاتك وسجل قراءتك وجدول حفظك وأبحاثك، واستعادته على أي جهاز.',
    'مزامنة بين جوالك وحاسوبك برمز مشفّر بكلمة سر تختارها، دون حساب ودون خادم، وتدمج ولا تمحو ما عند الجهاز الآخر.',
    'صفحة «ما الجديد» هذه، تُعرف بها كل إضافة في كل إصدار.' ] },
  { v: '٢٫٠', d: 'نوفمبر ٢٠٢٦', t: 'أقسام جديدة، وتثبيت بضغطة، وعمل دون إنترنت', items: [
    'التثبيت على الهاتف بضغطة واحدة، والعمل كاملاً دون إنترنت بعد التثبيت، وصفحة تنزيل لكل الأجهزة.',
    'المصحف المتصل بصفحات مصحف المدينة بخط مجمع الملك فهد.',
    'أقسام: التداوي بالقرآن، ووظيفة الإنسان، والتوحيد، ووصف الجنة، وأقسام الناس، والصور الجمالية، والفاكهة والطعام، وأركان الأسرة والمرأة والرجل.',
    'أذكار الصباح والمساء بنصوص حصن المسلم وتخريجها، ومواقيت الصلاة حسب بلدك ومذهبك.',
    'واجهة بمسارات أربعة، وقائمة لغات بمعاني القرآن بأكثر من سبعين لغة.',
    'حماية الحسابات بتجزئة PBKDF2 مع قفل مؤقت بعد المحاولات الخاطئة.' ] },
  { v: '١٫٠', d: 'أكتوبر ٢٠٢٦', t: 'الإطلاق', items: [
    'نص المصحف وثمانية تفاسير، وإحصاء كل لفظ وجذر، والموسوعة الموضوعية، والبحث بالمعنى، والحفظ والتسميع، ومختبر الأبحاث.' ] },
];
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64 = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); s += '='.repeat((4 - s.length % 4) % 4); return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
async function pipe(u8, S) { const st = new Blob([u8]).stream().pipeThrough(new S('deflate-raw')); return new Uint8Array(await new Response(st).arrayBuffer()); }
const zip = u8 => typeof CompressionStream === 'function' ? pipe(u8, CompressionStream) : Promise.resolve(null);
const unzip = u8 => pipe(u8, DecompressionStream);
async function aesKey(pass, salt) { const m = await crypto.subtle.importKey('raw', enc.encode(pass.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' }, m, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); }
/* رمز المزامنة: MSK1. ثم (علم الضغط، الملح، المتجه، النص المشفّر) بترميز base64 آمن للروابط */
async function seal(obj, pass) {
  let raw = enc.encode(JSON.stringify(obj)), flag = 0; const z = await zip(raw); if (z && z.length < raw.length) { raw = z; flag = 1; }
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(pass, salt), raw));
  const out = new Uint8Array(1 + 16 + 12 + ct.length); out[0] = flag; out.set(salt, 1); out.set(iv, 17); out.set(ct, 29);
  return 'MSK1.' + b64(out);
}
async function unseal(code, pass) {
  const u = unb64(code.trim().replace(/^MSK1\./, '').replace(/\s+/g, '')); if (u.length < 45) throw new Error('short');
  let raw; try { raw = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(17, 29) }, await aesKey(pass, u.slice(1, 17)), u.slice(29))); } catch (e) { throw new Error('pass'); }
  if (u[0] === 1) raw = await unzip(raw);
  return JSON.parse(dec.decode(raw));
}
/* ما يُنقل: كل حالة المستخدم. في رمز المزامنة تُستثنى الأبحاث المحفوظة لأنها كبيرة، وتبقى في الملف الاحتياطي */
function snapshot(light) { const o = JSON.parse(JSON.stringify(ST)); if (light) delete o.research; return { app: 'mishkat', v: 2, at: Date.now(), st: o }; }
function mergeInto(inc) {
  const d = cleanState({ ...inc }), r = { bm: 0, notes: 0, pages: 0, hifz: 0, research: 0 };
  const had = new Set(ST.bookmarks); for (const i of d.bookmarks) if (!had.has(i)) { ST.bookmarks.push(i); r.bm++; }
  for (const [k, v] of Object.entries(d.notes)) if (!ST.notes[k] || v.at > ST.notes[k].at) { if (!ST.notes[k]) r.notes++; ST.notes[k] = v; }
  for (const [day, pg] of Object.entries(d.log)) { const a = ST.log[day] || (ST.log[day] = []); for (const p of pg) if (!a.includes(p)) { a.push(p); r.pages++; } }
  for (const [k, v] of Object.entries(d.hifz)) if (!ST.hifz[k] || (v.last || 0) > (ST.hifz[k].last || 0)) { if (!ST.hifz[k]) r.hifz++; ST.hifz[k] = v; }
  if (d.mark && (!ST.mark || d.mark.at > ST.mark.at)) ST.mark = d.mark;
  if (d.goal && (!ST.goal || d.goal.at > ST.goal.at)) ST.goal = d.goal;
  if (d.khatma && (!ST.khatma || d.khatma > ST.khatma)) ST.khatma = d.khatma;
  const newer = (d.updated || 0) > (ST.updated || 0);
  if (newer) { ST.prefs = { ...ST.prefs, ...d.prefs }; if (d.last != null) ST.last = d.last; } else if (ST.last == null && d.last != null) ST.last = d.last;
  const rs = new Map((ST.research || []).map(x => [x.q, x])); for (const x of d.research) { const o = rs.get(x.q); if (!o) r.research++; if (!o || (x.at || 0) > (o.at || 0)) rs.set(x.q, x); }
  ST.research = [...rs.values()].sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 200);
  cleanState(ST); save(); applyPrefs(); return r;
}
function replaceWith(inc) { const d = cleanState({ ...inc }); for (const k of Object.keys(ST)) delete ST[k]; Object.assign(ST, d); cleanState(ST); save(); applyPrefs(); }
/* يقبل ملفاً احتياطياً أو رمز مزامنة أو الرمز القديم؛ ويُرجع الحالة الواردة */
async function readAny(text, pass) {
  text = (text || '').trim(); if (!text) throw new Error('empty');
  if (text.startsWith('MSK1.')) { if (!pass) throw new Error('needpass'); const o = await unseal(text, pass); if (o.app !== 'mishkat' || !o.st) throw new Error('bad'); return o.st; }
  if (text[0] === '{') { const o = JSON.parse(text); if (o.app !== 'mishkat' || !o.st || typeof o.st !== 'object') throw new Error('bad'); return o.st; }
  const o = JSON.parse(decodeURIComponent(escape(atob(text)))); if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error('bad'); return o;
}
const say = (el, m, ok) => { el.textContent = m; el.className = 'small ' + (ok ? 'okmsg' : 'errmsg'); };
const MSG = { empty: 'الصق الرمز أو اختر الملف أولاً.', needpass: 'اكتب كلمة سر المزامنة أولاً.', pass: 'كلمة السر غير صحيحة، أو أن الرمز ناقص. انسخه كاملاً ثم أعد المحاولة.', bad: 'هذا ليس ملف مشكاة ولا رمزها.' };
const errMsg = e => MSG[e.message] || 'تعذّر قراءة الملف أو الرمز. تأكد أنه كامل وغير معدَّل.';
const sumTxt = r => { const p = []; if (r.bm) p.push(`${n(r.bm)} علامة`); if (r.notes) p.push(`${n(r.notes)} ملاحظة`); if (r.pages) p.push(`${n(r.pages)} صفحة في سجل القراءة`); if (r.hifz) p.push(`${n(r.hifz)} مقطع حفظ`); if (r.research) p.push(`${n(r.research)} بحثاً`); return p.length ? 'أُضيف إلى جهازك: ' + p.join('، ') + '.' : 'لا جديد في هذا المصدر؛ كل ما فيه عندك من قبل.'; };

function dataPanel(root) {
  if (!root) return;
  root.innerHTML = `<section class="panel stack tight"><h3>نسخة احتياطية بملف</h3>
    <p class="muted small" style="margin:0">ملف واحد فيه إعداداتك وعلاماتك وملاحظاتك ومكان توقفك وسجل قراءتك وجدول حفظك وأبحاثك المحفوظة. احتفظ به أو انقله إلى جهاز آخر ثم استعده هناك.</p>
    <div class="toolbar"><button class="btn pri" id="bkDl" type="button">تنزيل نسخة احتياطية</button><label class="btn" for="bkFile">استعادة من ملف</label><input type="file" id="bkFile" accept=".json,application/json,text/plain" hidden></div>
    <div class="toolbar"><span class="small">عند الاستعادة:</span><div class="seg" id="bkMode"><button type="button" aria-pressed="true" data-m="merge">دمج مع ما هنا</button><button type="button" aria-pressed="false" data-m="replace">استبدال ما هنا</button></div></div>
    <p class="small" id="bkMsg" role="status" aria-live="polite" style="margin:0"></p></section>
  <section class="panel stack tight"><h3>مزامنة بين جوالك وحاسوبك</h3>
    <p class="muted small" style="margin:0">تعمل دون حساب ودون خادم: على الجهاز الأول أنشئ رمزاً مشفّراً بكلمة سر تختارها، وأرسله إلى نفسك بأي وسيلة (رسالة أو بريد أو ملاحظات)، ثم الصقه على الجهاز الآخر مع كلمة السر نفسها. الدمج يضيف ولا يمحو، فتكرره في أي اتجاه متى شئت.</p>
    <label class="small" for="syPass">كلمة سر المزامنة (٦ أحرف فأكثر)</label><input class="field" id="syPass" type="password" autocomplete="new-password" minlength="6" maxlength="100" dir="ltr">
    <div class="toolbar"><button class="btn pri" id="syMake" type="button">إنشاء رمز المزامنة</button><button class="btn" id="syCopy" type="button" hidden>نسخ الرمز</button></div>
    <textarea class="field" id="syOut" rows="3" readonly hidden dir="ltr" aria-label="رمز المزامنة"></textarea>
    <label class="small" for="syIn">رمز من الجهاز الآخر</label><textarea class="field" id="syIn" rows="3" dir="ltr" placeholder="MSK1.…"></textarea>
    <div class="toolbar"><button class="btn pri" id="syGo" type="button">دمج الرمز</button></div>
    <p class="small" id="syMsg" role="status" aria-live="polite" style="margin:0"></p>
    <p class="muted small" style="margin:0">الرمز لا يحوي الأبحاث المحفوظة لكبر حجمها؛ انقلها بالملف الاحتياطي. وإن حذفت علامة على جهاز فقد تعود من الآخر عند الدمج؛ للتطابق التام استعد الملف بخيار «استبدال».</p></section>
  <section class="panel stack tight"><h3>مسح البيانات</h3><div class="toolbar"><button class="btn" id="clrBtn" type="button">مسح كل بياناتي</button></div><p class="small" id="clrMsg" role="status" style="margin:0"></p></section>`;
  const $r = s => root.querySelector(s); let mode = 'merge';
  $r('#bkMode').onclick = e => { const b = e.target.closest('button'); if (!b) return; mode = b.dataset.m; $r('#bkMode').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); };
  $r('#bkDl').onclick = () => {
    const blob = new Blob([JSON.stringify(snapshot(false), null, 1)], { type: 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `mishkat-backup-${dayKey()}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    say($r('#bkMsg'), 'نُزّلت النسخة الاحتياطية. احفظ الملف في مكان آمن.', true);
  };
  $r('#bkFile').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { if (f.size > 8e6) throw new Error('bad'); const t = await f.text(); const st = await readAny(t, null);
      if (mode === 'replace') { replaceWith(st); say($r('#bkMsg'), 'استُعيدت نسختك الاحتياطية كاملة بدل ما كان هنا.', true); } else say($r('#bkMsg'), sumTxt(mergeInto(st)), true);
    } catch (er) { say($r('#bkMsg'), errMsg(er), false); }
  };
  $r('#syMake').onclick = async () => {
    const p = $r('#syPass').value; if (p.length < 6) return say($r('#syMsg'), 'اختر كلمة سر من ٦ أحرف فأكثر.', false);
    try { const c = await seal(snapshot(true), p); const o = $r('#syOut'); o.value = c; o.hidden = false; $r('#syCopy').hidden = false; say($r('#syMsg'), `تم إنشاء الرمز (${n(c.length)} حرفاً). انسخه وأرسله إلى جهازك الآخر، ولا تنسَ كلمة السر.`, true); }
    catch (er) { say($r('#syMsg'), 'تعذّر إنشاء الرمز على هذا المتصفح.', false); }
  };
  $r('#syCopy').onclick = () => copyText($r('#syOut').value);
  $r('#syGo').onclick = async () => {
    try { const st = await readAny($r('#syIn').value, $r('#syPass').value); say($r('#syMsg'), sumTxt(mergeInto(st)), true); $r('#syIn').value = ''; }
    catch (er) { say($r('#syMsg'), errMsg(er), false); }
  };
  let armed = false; $r('#clrBtn').onclick = () => { if (!armed) { armed = true; $r('#clrBtn').textContent = 'اضغط مرة أخرى للتأكيد'; return; }
    Object.assign(ST, { bookmarks: [], last: null, mark: null, notes: {}, log: {}, goal: null, khatma: null, hifz: {}, research: [] }); save(); say($r('#clrMsg'), 'مُسحت بياناتك.', true); $r('#clrBtn').textContent = 'مسح كل بياناتي'; armed = false; };
}

function wird() {
  const g = goalPages(), tp = todayPages(), st = readStreak(), mk = ST.mark, from = ST.khatma || '0000-00-00';
  const seen = new Set(); for (const [d, a] of Object.entries(ST.log)) if (d >= from) a.forEach(p => seen.add(p));
  const kh = seen.size, days = []; for (let k = 13; k >= 0; k--) { const t = Date.now() - k * 864e5, a = ST.log[dayKey(t)] || []; days.push([t, a.length]); }
  const mx = Math.max(g, 1, ...days.map(x => x[1]));
  const notes = Object.entries(ST.notes).sort((a, b) => b[1].at - a[1].at), allPg = Object.values(ST.log).reduce((t, a) => t + a.length, 0);
  V(`<div class="stack" style="max-width:860px"><div><div class="eyebrow">وردي وتقدّمي</div><h1>ورد القراءة وموضع توقفك</h1><p class="lead">كل شيء هنا على جهازك. تنقله بين أجهزتك من النسخ الاحتياطي والمزامنة أسفل الصفحة.</p></div>
  <section class="panel stack tight"><h3>توقفت هنا</h3>${mk ? `<p style="margin:0"><b id="wMark">${esc(ref(mk.i))}</b></p><div class="verse">${ayahHTML(mk.i, null, false)}</div><div class="toolbar"><a class="btn pri" href="#pa${mk.i}"><svg><use href="#i-book"/></svg>أكمل القراءة من هنا</a><button class="btn" id="wMarkClr" type="button">إزالة العلامة</button></div>` : `<p class="muted" style="margin:0">لم تضع علامة بعد. افتح أي آية بالضغط على رقمها، ثم اضغط «توقفت هنا».</p><div class="toolbar"><a class="btn pri" href="#p1">افتح المصحف</a></div>`}</section>
  <section class="panel stack tight"><h3>هدفي اليومي</h3>
    <div class="toolbar"><span>عدد الصفحات كل يوم:</span><div class="seg" id="gSeg">${[[0, 'بلا هدف'], [1, '١'], [2, '٢'], [5, '٥'], [10, '١٠'], [20, '٢٠']].map(([k, l]) => `<button type="button" aria-pressed="${g === k}" data-g="${k}">${l}</button>`).join('')}</div></div>
    ${g ? `<p class="muted small" style="margin:0">بهذا الهدف تختم المصحف (٦٠٤ صفحة) في نحو ${n(Math.ceil(604 / g))} يوماً.</p>` : ''}
    <div class="tiles grid t4"><div class="tile"><b id="wToday">${n(g ? Math.min(tp.length, g) : tp.length)}${g ? ` / ${n(g)}` : ''}</b><span>صفحة اليوم</span></div><div class="tile"><b id="wStreak">${n(st)}</b><span>يوم متتابع</span></div><div class="tile"><b>${n(allPg)}</b><span>صفحة في سجلك</span></div><div class="tile"><b>${n(Object.keys(ST.log).length)}</b><span>يوم قرأت فيه</span></div></div>
    <div class="meter" aria-hidden="true"><i style="width:${g ? Math.min(100, tp.length / g * 100) : (tp.length ? 100 : 0)}%"></i></div>
    <p class="muted small" style="margin:0">تُحسب الصفحة قراءةً إذا بقيت مفتوحة أمامك نحو ثماني ثوانٍ في المصحف المتصل أو في السورة.</p>
    <div class="wbars" role="img" aria-label="الصفحات المقروءة في آخر أربعة عشر يوماً">${days.map(([t, c]) => `<div class="wbar${g && c >= g ? ' met' : ''}"><i style="height:${Math.round(c / mx * 100)}%"></i><b>${n(c)}</b><span>${n(new Date(t).getDate())}</span></div>`).join('')}</div></section>
  <section class="panel stack tight"><h3>ختمتي</h3><p style="margin:0">قرأت <b id="wKh">${n(Math.min(kh, 604))}</b> من ٦٠٤ صفحة${ST.khatma ? '' : ' من سجلك'}.</p><div class="meter" aria-hidden="true"><i style="width:${Math.min(100, kh / 604 * 100)}%"></i></div>
    ${kh >= 604 ? '<p class="okmsg" style="margin:0">ما شاء الله، أتممت ختمة. تقبّل الله منك.</p>' : ''}<div class="toolbar"><button class="btn" id="wNew" type="button">ابدأ ختمة جديدة من اليوم</button></div></section>
  <section class="panel stack tight"><h3>ملاحظاتي (${n(notes.length)})</h3>${notes.length ? notes.slice(0, 40).map(([i, o]) => `<div class="due"><span><a data-ayah="${i}"><b>${esc(ref(+i))}</b></a> <span class="wnote">${esc(o.t)}</span></span></div>`).join('') : '<p class="muted small" style="margin:0">لا ملاحظات بعد. افتح أي آية واكتب ملاحظتك تحت «ملاحظتي على الآية».</p>'}</section>
  <div id="dataMount"></div></div>`);
  $('#gSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; const k = +b.dataset.g; ST.goal = k ? { pages: k, at: Date.now() } : null; save(); wird(); };
  const mc = $('#wMarkClr'); if (mc) mc.onclick = () => { ST.mark = null; save(); wird(); };
  $('#wNew').onclick = () => { ST.khatma = dayKey(); save(); wird(); toast('بدأت ختمة جديدة'); };
  dataPanel($('#dataMount'));
}
function whatsnew() {
  try { localStorage.setItem('mishkat:seenVer', VERSION); } catch (e) {}
  V(`<div class="stack" style="max-width:860px"><div><div class="eyebrow">ما الجديد</div><h1>سجل الإصدارات</h1><p class="lead">كل ما أُضيف إلى مشكاة، الأحدث أولاً. أنت الآن على الإصدار ${VERSION}.</p></div>
  ${RELEASES.map(r => `<section class="panel stack tight wn-rel"><div class="toolbar"><span class="chip acc">الإصدار ${r.v}</span><span class="muted small">${r.d}</span></div><h3>${r.t}</h3><ul class="wn-list">${r.items.map(x => `<li>${x}</li>`).join('')}</ul></section>`).join('')}
  <section class="panel stack tight wn-keep"><h3>ما بقي من الإصدار الأول</h3><p style="margin:0">الأساس الذي بدأت منه مشكاة باقٍ كما هو في كل إصدار لاحق: نص مصحف المدينة النبوية المتحقَّق منه، وإحصاء الألفاظ والجذور واللمّات، والمعجم المفهرس، وثمانية كتب تفسير، والفهارس الموضوعية ومنها الأحكام الفقهية على أبواب الفقه، والبحث بالمعنى، والحفظ والتسميع، ومختبر الأبحاث. وما تغيّر عنه: صارت الأقسام ست فئات، وأُضيف المصحف المتصل والأذكار والمواقيت وعشرات الأقسام الموثّقة، ويعمل التطبيق كاملاً دون إنترنت بعد تثبيته.</p></section></div>`);
}
window.progressUI = { wird, whatsnew, dataPanel, snapshot, mergeInto, replaceWith, readAny, seal, unseal, VERSION };
})();
