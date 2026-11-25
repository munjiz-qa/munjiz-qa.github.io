/* محرّر المحتوى: للمدير الشامل وحده. يعدّل «طبقة التعديلات» (content/overrides.json) فوق الأصل ولا يمسّ ملفات الأقسام نفسها.
   المسودة تُحفظ على هذا الجهاز، والمعاينة تعرض التعديلات بالواجهة الحقيقية، والنشر يكتب الملف في المستودع بتفويض GitHub. */
(function () {
  'use strict';
  const MODS = ["amal", "amthal", "arbain", "asma", "asma99", "asnaf", "bir", "duaq", "fiqhq", "firasa", "hadarat", "hadithq", "hajj", "hayawan", "hwj", "ijaz", "itam", "jamal", "jannah", "jud", "kfl", "krb", "maadin", "maal", "mawdui", "mumin", "nabat", "naskh", "nikah", "nsira", "qasasx", "qatlas", "qtl", "rsifat", "ruqya", "rusul", "sabr", "sira", "taam", "taamul", "taqwa", "tasbih", "tawhid", "tawsiyat", "tibb", "tifl", "ttw", "waqf", "wazifa", "zkq"];
  const MODMAP = { asma: ['asma', 'asma99'], ulum: ['naskh'], tasbih: ['tasbih'], map: ['qatlas'], timeline: ['qtl'], nm: ['nm'], nmhuda: ['nm'], nmstart: ['nm'] };
  const KEYS = { t: 'العنوان', d: 'الوصف', e: 'الملخص', x: 'النص', n: 'الشرح أو الملاحظة', en: 'الترجمة الإنجليزية', et: 'العنوان بالإنجليزية', ed: 'الوصف بالإنجليزية', id: 'المعرّف (لا يُغيَّر)', w: 'القائل أو المؤلف', bk: 'رمز الكتاب', b: 'رمز كتاب الحديث', s: 'رقم السورة', ay: 'الآيات', gr: 'درجة الحديث', k: 'الرقم أو القسم', ch: 'الباب', ph: 'المرحلة', r: 'مدى الآيات [سورة، من، إلى]', q: 'أقوال المفسرين', h: 'الأحاديث', tp: 'المحاور', c: 'العناصر', i: 'المداخل', dg: 'الدرجة', te: 'الترجمة', f: 'الفائدة', a: 'رقم الآية', m: 'ملاحظة', cat: 'التصنيف', tag: 'الوسم', intro: 'المقدمة', lead: 'التمهيد', note: 'تنبيه', src: 'المصادر', blocks: 'المحتوى', steps: 'الخطوات', p: 'الفقرات', wd: 'الترتيب' };
  const ROOT = { ch: 'الفصول والأبواب', tp: 'المحاور والمسائل', i: 'المداخل', ay: 'نصوص الآيات (مقفلة)', q: 'أقوال المفسرين (نصوص موثّقة)', h: 'الأحاديث (نصوص موثّقة)', k: 'الأقسام', nay: 'عدد الآيات (رقم يظهر أعلى القسم)', nq: 'عدد النقول (رقم يظهر أعلى القسم)', nh: 'عدد الأحاديث (رقم يظهر أعلى القسم)' };
  const ICONS = [['i-book', 'كتاب'], ['i-grid', 'شبكة'], ['i-info', 'معلومة'], ['i-spark', 'شرارة'], ['i-hands', 'دعاء'], ['i-time', 'وقت'], ['i-map', 'خريطة'], ['i-flower', 'زهرة'], ['i-family', 'أسرة'], ['i-heal', 'شفاء'], ['i-scroll', 'مخطوط'], ['i-atom', 'علم'], ['i-chart', 'إحصاء'], ['i-calc', 'حاسبة'], ['i-check', 'علامة'], ['i-search', 'بحث'], ['i-globe', 'عالم']];
  const BTYPES = [['p', 'فقرة'], ['h', 'عنوان فرعي'], ['ay', 'آية من القرآن'], ['q', 'نقل موثّق بمصدره'], ['list', 'قائمة نقطية'], ['note', 'تنبيه']];
  const VERB_ARR = new Set(['q', 'h', 'arraf', 'muslim', 'bukhari', 'tabari', 'saadi']);
  const S = { d: null, snap: '', hist: [], fut: [], tab: 'structure', mod: '', work: null, orig: null, stale: [], open: new Set(), lim: {}, edited: new Set(), page: '', q: '', hits: [], msg: '', sel: '' };
  const $r = () => document.getElementById('cmsRoot');
  const J = x => JSON.stringify(x);
  const nA = x => (typeof n === 'function' ? n(x) : String(x));
  const rid = () => Math.random().toString(36).slice(2, 7) + Date.now().toString(36).slice(-3);
  const baseCards = () => (CMS.base ? CMS.base.cards : {});
  const secTitle = id => (S.d.structure.cards[id] && S.d.structure.cards[id].t) || (CMS.custom[id] && CMS.custom[id].t) || (S.d.pages[id] && S.d.pages[id].t) || (baseCards()[id] && baseCards()[id][1]) || id;

  /* ---------- المسودة والتراجع ---------- */
  function loadDraft() { const d = LS.get(CMS.draftKey, null); return CMS.norm(d ? d : CMS.clone(CMS.pub)); }
  function persist() { S.d.updated = Date.now(); LS.set(CMS.draftKey, S.d); }
  function commit() { S.hist.push(S.snap); if (S.hist.length > 100) S.hist.shift(); S.snap = J(S.d); S.fut = []; persist(); }
  function undo() { if (!S.hist.length) return; S.fut.push(S.snap); S.snap = S.hist.pop(); S.d = JSON.parse(S.snap); persist(); afterRestore(); }
  function redo() { if (!S.fut.length) return; S.hist.push(S.snap); S.snap = S.fut.pop(); S.d = JSON.parse(S.snap); persist(); afterRestore(); }
  function afterRestore() { if (S.mod) rebuildWork(); render(); }
  const dirty = () => J({ ...S.d, updated: 0 }) !== J({ ...CMS.pub, updated: 0 });

  /* ---------- نوافذ حوار ---------- */
  function ask({ title, msg, input, ok = 'موافق', no = 'إلغاء', warn, ph }) {
    return new Promise(res => {
      const o = document.createElement('div'); o.className = 'cms-modal'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', title);
      o.innerHTML = `<div class="cms-box${warn ? ' warn' : ''}"><h3>${esc(title)}</h3><p>${esc(msg || '').replace(/\n/g, '<br>')}</p>${input ? `<textarea class="field" rows="3" placeholder="${esc(ph || '')}" aria-label="${esc(ph || title)}"></textarea>` : ''}<div class="toolbar"><button class="btn pri" data-ok type="button">${esc(ok)}</button>${no ? `<button class="btn" data-no type="button">${esc(no)}</button>` : ''}</div></div>`;
      document.body.appendChild(o); const ta = o.querySelector('textarea'), b = o.querySelector('[data-ok]');
      const done = v => { o.remove(); document.removeEventListener('keydown', key, true); res(v); };
      const key = e => { if (e.key === 'Escape') { e.stopPropagation(); done(null); } };
      document.addEventListener('keydown', key, true);
      if (ta) { b.disabled = true; ta.oninput = () => { b.disabled = ta.value.trim().length < 3; }; ta.focus(); } else b.focus();
      b.onclick = () => done(ta ? ta.value.trim() : true); const nb = o.querySelector('[data-no]'); if (nb) nb.onclick = () => done(null);
    });
  }
  const say = (t, bad) => { S.msg = t; const m = document.getElementById('cmsMsg'); if (m) { m.textContent = t; m.className = 'cms-msg' + (bad ? ' bad' : ''); } if (typeof toast === 'function') toast(t); };

  /* ---------- الهيكل ---------- */
  function effCats() {
    const st = S.d.structure; if (st.cats) return st.cats;
    const hid = new Set(st.hide), cats = CMS.base.cats.map(c => ({ id: c[0], t: c[1], d: c[2], ids: c[3].filter(i => !hid.has(i)) }));
    const placed = new Set(cats.flatMap(c => c.ids)), fb = cats.find(c => c.id === 'p8') || cats[cats.length - 1];
    allIds().forEach(i => { if (!placed.has(i) && !hid.has(i)) fb.ids.push(i); });
    return cats;
  }
  function allIds() { const s = new Set(Object.keys(baseCards())); Object.keys(S.d.pages).forEach(i => s.add(i)); return s; }
  function ensureCats() { const st = S.d.structure; if (!st.cats) st.cats = effCats(); return st.cats; }
  function structureHTML() {
    const view = effCats(), st = S.d.structure;
    const hiddenIds = st.hide.filter(i => allIds().has(i));
    return `<p class="muted small">الأقسام الرئيسية (الأبواب) وما تحتها من أقسام. الحذف هنا يُخفي القسم من الموقع كله (القائمة والرئيسية والبحث) ويمكن استرجاعه في أي وقت، لأن ملفات الأقسام الأصلية محفوظة في المستودع.</p>
    ${view.map((c, ci) => `<section class="panel cms-cat stack tight" data-ci="${ci}"><div class="cms-row"><span class="chip ${esc(c.id)}">الباب ${nA(ci + 1)}</span><div class="cms-grow"><input class="field" data-a="cat-t" value="${esc(c.t)}" aria-label="اسم الباب" placeholder="اسم الباب"><textarea class="field" rows="2" data-a="cat-d" aria-label="وصف الباب" placeholder="وصف الباب">${esc(c.d)}</textarea><input class="field" dir="ltr" data-a="cat-et" value="${esc(c.et || '')}" aria-label="اسم الباب بالإنجليزية" placeholder="Door name in English (optional)"></div>
      <div class="cms-act"><button class="btn" data-a="cat-up" ${ci === 0 ? 'disabled' : ''} aria-label="رفع الباب">▲</button><button class="btn" data-a="cat-dn" ${ci === view.length - 1 ? 'disabled' : ''} aria-label="خفض الباب">▼</button><button class="btn danger" data-a="cat-del" aria-label="حذف الباب">حذف</button></div></div>
      <div class="cms-secs">${c.ids.map((id, si) => secRow(id, si, c, ci, view)).join('') || '<p class="muted small">لا أقسام في هذا الباب.</p>'}</div></section>`).join('')}
    <div class="toolbar"><button class="btn" data-a="cat-add">+ إضافة باب</button><button class="btn pri" data-a="page-new-sec">+ إضافة قسم جديد (صفحة بفصول ونصوص)</button></div>
    ${hiddenIds.length ? `<section class="panel stack tight"><h3>أقسام محذوفة من الموقع</h3>${hiddenIds.map(id => `<div class="cms-row"><span class="cms-grow">${esc(secTitle(id))}</span><button class="btn" data-a="sec-show" data-id="${esc(id)}">استرجاع</button></div>`).join('')}</section>` : ''}`;
  }
  function secRow(id, si, c, ci, view) {
    const card = S.d.structure.cards[id] || {}, b = baseCards()[id] || [], custom = !!S.d.pages[id], t = card.t || (custom ? S.d.pages[id].t : b[1]) || id, d = card.d != null ? card.d : (custom ? S.d.pages[id].d : b[2]) || '';
    const mk = (MODMAP[id] || (MODS.includes(id) ? [id] : [])).filter(m => MODS.includes(m));
    return `<details class="cms-sec" data-id="${esc(id)}"><summary><b>${esc(t)}</b>${custom ? ' <span class="chip gold">مضاف</span>' : ''}${card.t || card.d != null ? ' <span class="chip acc">معدَّل</span>' : ''}</summary><div class="stack tight">
      <label class="small">عنوان القسم<input class="field" data-a="sec-t" value="${esc(t)}"></label>
      <label class="small">وصف القسم<textarea class="field" rows="2" data-a="sec-d">${esc(d)}</textarea></label>
      <div class="cms-two"><label class="small">العنوان بالإنجليزية<input class="field" dir="ltr" data-a="sec-et" value="${esc(card.et || '')}"></label><label class="small">الوصف بالإنجليزية<input class="field" dir="ltr" data-a="sec-ed" value="${esc(card.ed || '')}"></label></div>
      <div class="toolbar"><button class="btn" data-a="sec-up" ${si === 0 ? 'disabled' : ''} aria-label="رفع القسم">▲ رفع</button><button class="btn" data-a="sec-dn" ${si === c.ids.length - 1 ? 'disabled' : ''} aria-label="خفض القسم">▼ خفض</button>
        <label class="small">نقل إلى باب <select data-a="sec-mv"><option value="">—</option>${view.map((x, k) => k === ci ? '' : `<option value="${k}">${esc(x.t)}</option>`).join('')}</select></label></div>
      <div class="toolbar"><a class="btn" href="#${esc(id)}" target="_self">فتح القسم</a>${custom ? `<button class="btn" data-a="page-open" data-id="${esc(id)}">تحرير فصوله ونصوصه</button>` : ''}${mk.map(m => `<button class="btn" data-a="mod-open" data-m="${m}">تحرير محتوى «${esc((baseCards()[m] || [])[1] || m)}»</button>`).join('')}<button class="btn danger" data-a="sec-hide">${custom ? 'حذف القسم' : 'إخفاء القسم من الموقع'}</button></div></div></details>`;
  }
  function onStructure(a, el, e) {
    const st = S.d.structure, root = el.closest('.cms-cat'), ci = root ? +root.dataset.ci : -1, sec = el.closest('.cms-sec'), id = sec ? sec.dataset.id : el.dataset.id;
    const cats = () => ensureCats();
    const swap = (arr, i, j) => { if (j < 0 || j >= arr.length) return false; [arr[i], arr[j]] = [arr[j], arr[i]]; return true; };
    if (a === 'cat-t') { const c = cats()[ci]; c.t = el.value.trim() || c.t; return commit(), say('عُدّل اسم الباب. اضغط «معاينة» لرؤيته على الموقع.'); }
    if (a === 'cat-d') { cats()[ci].d = el.value.trim(); return commit(), say('عُدّل وصف الباب.'); }
    if (a === 'cat-et') { cats()[ci].et = el.value.trim(); return commit(); }
    if (a === 'cat-up' || a === 'cat-dn') { if (swap(cats(), ci, ci + (a === 'cat-up' ? -1 : 1))) { commit(); render(); } return; }
    if (a === 'cat-del') { const c = cats()[ci]; if (c.ids.length) return say('انقل أقسام هذا الباب إلى بابٍ آخر أولاً، ثم احذفه.', true); if (cats().length <= 1) return say('لا بد من باب واحد على الأقل.', true); return ask({ title: 'حذف الباب', msg: `سيُحذف الباب «${c.t}». يمكنك التراجع بزر «تراجع».`, ok: 'احذف', warn: true }).then(v => { if (v) { cats().splice(ci, 1); commit(); render(); } }); }
    if (a === 'cat-add') { const used = new Set(cats().map(c => c.id)), nid = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p0'].find(x => !used.has(x)); if (!nid) return say('بلغت الحد الأقصى: ٩ أبواب بحسب ألوان التصميم.', true); cats().push({ id: nid, t: 'باب جديد', d: 'وصف الباب', ids: [] }); commit(); return render(); }
    if (a === 'sec-t') { const v = el.value.trim(); if (!v) return render(); const base = (baseCards()[id] || [])[1]; const c = st.cards[id] = st.cards[id] || {}; if (S.d.pages[id]) { S.d.pages[id].t = v; delete c.t; } else if (v === base) delete c.t; else c.t = v; tidyCard(id); return commit(), say('عُدّل عنوان القسم.'); }
    if (a === 'sec-d') { const v = el.value.trim(), base = (baseCards()[id] || [])[2]; const c = st.cards[id] = st.cards[id] || {}; if (S.d.pages[id]) { S.d.pages[id].d = v; delete c.d; } else if (v === base) delete c.d; else c.d = v; tidyCard(id); return commit(), say('عُدّل وصف القسم.'); }
    if (a === 'sec-et' || a === 'sec-ed') { const c = st.cards[id] = st.cards[id] || {}; c[a === 'sec-et' ? 'et' : 'ed'] = el.value.trim(); if (S.d.pages[id]) { S.d.pages[id][a === 'sec-et' ? 'et' : 'ed'] = c[a === 'sec-et' ? 'et' : 'ed']; } tidyCard(id); return commit(); }
    if (a === 'sec-up' || a === 'sec-dn') { const ids = cats()[ci].ids, i = ids.indexOf(id); if (swap(ids, i, i + (a === 'sec-up' ? -1 : 1))) { commit(); S.sel = id; render(); } return; }
    if (a === 'sec-mv') { const to = el.value; if (to === '') return; const cs = cats(), from = cs[ci].ids; from.splice(from.indexOf(id), 1); cs[+to].ids.push(id); commit(); S.sel = id; render(); return say('نُقل القسم إلى باب «' + cs[+to].t + '».'); }
    if (a === 'sec-hide') { const custom = !!S.d.pages[id]; return ask({ title: custom ? 'حذف القسم المضاف' : 'إخفاء القسم', msg: custom ? `سيُحذف القسم «${secTitle(id)}» بفصوله ونصوصه من المسودة. يمكنك التراجع بزر «تراجع» ما لم تُغلق المحرّر.` : `سيُخفى القسم «${secTitle(id)}» من القائمة والرئيسية والبحث، وتبقى ملفاته في المستودع ويمكن استرجاعه.`, ok: custom ? 'احذف' : 'أخفِ', warn: true }).then(v => { if (!v) return; if (custom) { delete S.d.pages[id]; delete st.cards[id]; (st.cats || []).forEach(c => { c.ids = c.ids.filter(x => x !== id); }); } else { if (!st.hide.includes(id)) st.hide.push(id); cats().forEach(c => { c.ids = c.ids.filter(x => x !== id); }); } commit(); render(); }); }
    if (a === 'sec-show') { st.hide = st.hide.filter(x => x !== id); const cs = cats(), fb = cs.find(c => c.id === 'p8') || cs[cs.length - 1]; if (!cs.some(c => c.ids.includes(id))) fb.ids.push(id); commit(); render(); return say('استُرجع القسم.'); }
    if (a === 'mod-open') { S.tab = 'content'; S.mod = ''; render(); return openMod(el.dataset.m); }
    if (a === 'page-open') { S.tab = 'pages'; S.page = id; return render(); }
    if (a === 'page-new-sec') { S.tab = 'pages'; return newPage(); }
  }
  function tidyCard(id) { const c = S.d.structure.cards[id]; if (c && !c.t && c.d == null && !c.et && !c.ed) delete S.d.structure.cards[id]; }

  /* ---------- الصفحات المضافة ---------- */
  function newPage() {
    const id = 'cx-' + rid().slice(0, 6).replace(/[^a-z0-9]/g, 'a'); S.d.pages[id] = { t: 'قسم جديد', d: 'وصف مختصر للقسم', ic: 'i-book', ch: [{ id: 'c' + rid(), t: 'الفصل الأول', blocks: [{ k: 'p', x: 'اكتب النص هنا.' }] }] };
    const cs = ensureCats(), fb = cs.find(c => c.id === 'p8') || cs[cs.length - 1]; fb.ids.push(id); S.page = id; commit(); render(); say('أُنشئ قسم جديد. عدّل عنوانه وفصوله ثم عاينه.');
  }
  function pagesHTML() {
    const ids = Object.keys(S.d.pages), pg = S.d.pages[S.page];
    const list = `<div class="toolbar"><select id="cmsPgSel" aria-label="اختر القسم المضاف"><option value="">— اختر قسماً مضافاً —</option>${ids.map(i => `<option value="${esc(i)}"${i === S.page ? ' selected' : ''}>${esc(S.d.pages[i].t)}</option>`).join('')}</select><button class="btn pri" data-a="page-new">+ قسم جديد</button></div>`;
    if (!pg) return `<p class="muted small">الأقسام المضافة صفحات بفصول وكتل نصية (فقرة، عنوان، آية، نقل موثّق، قائمة، تنبيه) تظهر في الموقع كأي قسم، بالبحث والقائمة والرئيسية.</p>${list}${ids.length ? '' : '<p class="muted">لم تُضف أقسام بعد.</p>'}`;
    const cs = effCats(), where = cs.find(c => c.ids.includes(S.page));
    return `${list}<section class="panel stack tight"><h3>بيانات القسم</h3>
      <div class="cms-two"><label class="small">العنوان<input class="field" data-a="pg-t" value="${esc(pg.t)}"></label><label class="small">Title in English<input class="field" dir="ltr" data-a="pg-et" value="${esc(pg.et || '')}"></label></div>
      <div class="cms-two"><label class="small">الوصف<textarea class="field" rows="2" data-a="pg-d">${esc(pg.d || '')}</textarea></label><label class="small">Description in English<textarea class="field" dir="ltr" rows="2" data-a="pg-ed">${esc(pg.ed || '')}</textarea></label></div>
      <div class="toolbar"><label class="small">الأيقونة <select data-a="pg-ic">${ICONS.map(([v, l]) => `<option value="${v}"${v === pg.ic ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="small">الباب <select data-a="pg-cat">${cs.map(c => `<option value="${esc(c.id)}"${where && where.id === c.id ? ' selected' : ''}>${esc(c.t)}</option>`).join('')}</select></label>
      <button class="btn danger" data-a="page-del">حذف القسم</button></div></section>
    ${pg.ch.map((c, ci) => `<section class="panel stack tight cms-ch" data-ci="${ci}"><div class="cms-row"><b class="chip">فصل ${nA(ci + 1)}</b><input class="field cms-grow" data-a="ch-t" value="${esc(c.t)}" aria-label="عنوان الفصل"><input class="field cms-grow" dir="ltr" data-a="ch-et" value="${esc(c.et || '')}" placeholder="Chapter title in English" aria-label="عنوان الفصل بالإنجليزية">
      <div class="cms-act"><button class="btn" data-a="ch-up" ${ci === 0 ? 'disabled' : ''} aria-label="رفع الفصل">▲</button><button class="btn" data-a="ch-dn" ${ci === pg.ch.length - 1 ? 'disabled' : ''} aria-label="خفض الفصل">▼</button><button class="btn danger" data-a="ch-del" aria-label="حذف الفصل">✕</button></div></div>
      ${c.blocks.map((b, bi) => blockHTML(b, bi, c)).join('')}
      <div class="toolbar"><button class="btn" data-a="blk-add">+ إضافة كتلة نص</button></div></section>`).join('')}
    <div class="toolbar"><button class="btn" data-a="ch-add">+ إضافة فصل</button></div>
    <section class="panel"><h3>معاينة القسم</h3><div class="cms-pv" id="cmsPv">${CMS.pageHTML(pg)}</div></section>`;
  }
  function blockHTML(b, bi, c) {
    const lblX = { ay: 'مرجع الآية، مثل 2:255 أو 2:255-257', q: 'النص المنقول بلفظه', list: 'عناصر القائمة، كل عنصر في سطر', note: 'نص التنبيه', h: 'العنوان الفرعي', p: 'النص' }[b.k] || 'النص';
    const lblS = b.k === 'q' ? 'المصدر (الكتاب والجزء والصفحة أو رقم الحديث)' : b.k === 'note' ? 'عنوان التنبيه (اختياري)' : '';
    return `<div class="cms-blk" data-bi="${bi}"><div class="cms-row"><select data-a="blk-k" aria-label="نوع الكتلة">${BTYPES.map(([v, l]) => `<option value="${v}"${v === b.k ? ' selected' : ''}>${l}</option>`).join('')}</select><span class="cms-grow"></span>
      <div class="cms-act"><button class="btn" data-a="blk-up" ${bi === 0 ? 'disabled' : ''} aria-label="رفع">▲</button><button class="btn" data-a="blk-dn" ${bi === c.blocks.length - 1 ? 'disabled' : ''} aria-label="خفض">▼</button><button class="btn danger" data-a="blk-del" aria-label="حذف الكتلة">✕</button></div></div>
      <label class="small">${lblX}<textarea class="field" rows="${b.k === 'ay' || b.k === 'h' ? 1 : 4}" data-a="blk-x">${esc(b.x || '')}</textarea></label>
      ${lblS ? `<label class="small">${lblS}<input class="field" data-a="blk-s" value="${esc(b.s || '')}"></label>` : ''}
      ${b.k === 'ay' ? '' : `<label class="small">الترجمة الإنجليزية (اختياري)<textarea class="field" dir="ltr" rows="2" data-a="blk-en">${esc(b.en || '')}</textarea></label>`}
      ${b.k === 'q' ? '<p class="small muted" style="margin:0">اكتب النص حرفياً كما في مصدره، ولا تنقل بالمعنى.</p>' : ''}</div>`;
  }
  function onPage(a, el) {
    const pg = S.d.pages[S.page], ch = el.closest('.cms-ch'), ci = ch ? +ch.dataset.ci : -1, bl = el.closest('.cms-blk'), bi = bl ? +bl.dataset.bi : -1;
    const swap = (arr, i, j) => { if (j < 0 || j >= arr.length) return false; [arr[i], arr[j]] = [arr[j], arr[i]]; return true; };
    if (a === 'page-new') return newPage();
    if (!pg) return;
    const upd = () => { commit(); const pv = document.getElementById('cmsPv'); if (pv) pv.innerHTML = CMS.pageHTML(pg); };
    if (a === 'pg-t') { pg.t = el.value.trim() || pg.t; return upd(); }
    if (a === 'pg-et') { pg.et = el.value.trim(); return upd(); }
    if (a === 'pg-d') { pg.d = el.value.trim(); return upd(); }
    if (a === 'pg-ed') { pg.ed = el.value.trim(); return upd(); }
    if (a === 'pg-ic') { pg.ic = el.value; return upd(); }
    if (a === 'pg-cat') { const cs = ensureCats(); cs.forEach(c => { c.ids = c.ids.filter(x => x !== S.page); }); cs.find(c => c.id === el.value).ids.push(S.page); return upd(); }
    if (a === 'page-del') return ask({ title: 'حذف القسم', msg: `سيُحذف القسم «${pg.t}» بكل فصوله ونصوصه من المسودة.`, ok: 'احذف', warn: true }).then(v => { if (v) { const id = S.page; delete S.d.pages[id]; delete S.d.structure.cards[id]; (S.d.structure.cats || []).forEach(c => { c.ids = c.ids.filter(x => x !== id); }); S.page = ''; commit(); render(); } });
    if (a === 'ch-add') { pg.ch.push({ id: 'c' + rid(), t: 'فصل جديد', blocks: [{ k: 'p', x: '' }] }); commit(); return render(); }
    if (a === 'ch-t') { pg.ch[ci].t = el.value.trim() || pg.ch[ci].t; return upd(); }
    if (a === 'ch-et') { pg.ch[ci].et = el.value.trim(); return upd(); }
    if (a === 'ch-up' || a === 'ch-dn') { if (swap(pg.ch, ci, ci + (a === 'ch-up' ? -1 : 1))) { commit(); render(); } return; }
    if (a === 'ch-del') return ask({ title: 'حذف الفصل', msg: `سيُحذف الفصل «${pg.ch[ci].t}» بكل ما فيه.`, ok: 'احذف', warn: true }).then(v => { if (v) { pg.ch.splice(ci, 1); commit(); render(); } });
    if (a === 'blk-add') { pg.ch[ci].blocks.push({ k: 'p', x: '' }); commit(); return render(); }
    const b = bl && pg.ch[ci].blocks[bi];
    if (a === 'blk-k') { b.k = el.value; commit(); return render(); }
    if (a === 'blk-x') { const v = el.value.trim(); if (b.k === 'ay' && v && !/^\s*[0-9٠-٩]{1,3}\s*[:：]\s*[0-9٠-٩]{1,3}\s*([-–]\s*[0-9٠-٩]{1,3})?\s*$/.test(v)) say('صيغة مرجع الآية: رقم السورة ثم نقطتان ثم رقم الآية، مثل 2:255', true); b.x = v; return upd(); }
    if (a === 'blk-s') { b.s = el.value.trim(); return upd(); }
    if (a === 'blk-en') { b.en = el.value.trim(); return upd(); }
    if (a === 'blk-up' || a === 'blk-dn') { if (swap(pg.ch[ci].blocks, bi, bi + (a === 'blk-up' ? -1 : 1))) { commit(); render(); } return; }
    if (a === 'blk-del') { pg.ch[ci].blocks.splice(bi, 1); commit(); return render(); }
  }

  /* ---------- محتوى الأقسام الموجودة (شجرة) ---------- */
  function loadModScript(key) {
    return new Promise((ok, no) => {
      if (CMS.global(key)) return ok();
      let s = document.querySelector(`script[src="mods/${key}.js"]`);
      if (!s) { s = document.createElement('script'); s.src = 'mods/' + key + '.js'; document.head.appendChild(s); }
      s.addEventListener('load', () => ok(), { once: true }); s.addEventListener('error', () => no(new Error('mod')), { once: true });
    });
  }
  async function openMod(key) {
    S.mod = key; S.work = null; render();
    try { await loadModScript(key); } catch (e) { S.mod = ''; return say('تعذّر تحميل ملف هذا القسم.', true); }
    CMS.patchMod(key); rebuildWork(); S.open = new Set(); S.lim = {}; S.q = ''; S.hits = []; render();
  }
  function rebuildWork() {
    const g = CMS.global(S.mod); S.orig = CMS.orig[S.mod] || CMS.clone(window[g]); S.work = CMS.clone(S.orig); S.stale = []; CMS.apply(S.work, S.d.mods[S.mod] || [], S.stale);
  }
  function syncMod() { const ops = []; CMS.diff(S.orig, S.work, [], ops); if (ops.length) S.d.mods[S.mod] = ops; else delete S.d.mods[S.mod]; commit(); }
  const pk = p => J(p);
  const getP = p => CMS.walk(S.work, p);
  const label = (key, depth) => (depth === 1 && ROOT[key]) || KEYS[key] || (typeof key === 'string' ? key : '');
  const itemTitle = (v, i) => { if (v == null || typeof v !== 'object') return String(v).slice(0, 60); const t = v.t || v.n || v.e || v.title || v.x || v.w || v.id || ''; const bk = v.bk && typeof TF !== 'undefined' ? (TF.find(b => b.key === v.bk) || {}).title : ''; return (bk ? bk + ': ' : '') + String(t).replace(/\s+/g, ' ').slice(0, 70) || ('عنصر ' + nA(i + 1)); };
  const isLockedAy = (p) => p.length === 2 && p[0] === 'ay' && !Array.isArray(S.work.ay);
  function verbOwner(p, owner) { const k = p[p.length - 1]; return owner && typeof owner === 'object' && (k === 'x' || k === 'en') && ('bk' in owner || 'b' in owner); }
  function blank(t, key) {
    if (Array.isArray(t)) return []; if (typeof t === 'string') return key === 'id' ? 'n' + rid() : ''; if (typeof t === 'number') return 0; if (typeof t === 'boolean') return false; if (t === null) return null;
    if (t && typeof t === 'object') return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, blank(v, k)])); return '';
  }
  function choices(p, key) {
    if (p.length < 2) return null;
    if (key === 'ch' && CMS.idArr(S.work.ch)) return S.work.ch.map(c => [c.id, c.t]);
    if (key === 'ph' && CMS.idArr(S.work.ph)) return S.work.ph.map(c => [c.id, c.t]);
    if ((key === 'bk' || key === 'b') && typeof TF !== 'undefined' && key === 'bk') return TF.map(b => [b.key, b.title]);
    return null;
  }
  function enBox(p, v) {
    const en = S.d.tr.en; if (!/[؀-ۿ]/.test(v) || v.length < 4) return '';
    const key = pk(p); if (!(S.edited.has(key) || en[v])) return '';
    return `<label class="small cms-en">ترجمة إنجليزية لهذا النص (اختياري، تظهر عند اختيار الإنجليزية)<textarea class="field" dir="ltr" rows="2" data-a="t-en" data-p="${esc(key)}">${esc(en[v] || '')}</textarea></label>`;
  }
  function leaf(p, v, owner, key) {
    const depth = p.length, locked = isLockedAy(p), vb = verbOwner(p, owner), ro = key === 'id';
    const ch = choices(p, key), lab = esc(label(key, depth));
    if (typeof v === 'string') {
      if (ch) return `<label class="cms-f small">${lab}<select data-a="t-str" data-p="${esc(pk(p))}">${ch.map(([a, b]) => `<option value="${esc(a)}"${a === v ? ' selected' : ''}>${esc(b)}</option>`).join('')}${ch.some(c => c[0] === v) ? '' : `<option value="${esc(v)}" selected>${esc(v || '—')}</option>`}</select></label>`;
      const rows = Math.min(10, Math.max(1, Math.ceil(v.length / 70)));
      return `<div class="cms-f"><label class="small">${lab}${vb ? ' <span class="chip gold">نص موثّق</span>' : ''}${locked ? ' <span class="chip">مقفل: نص المصحف</span>' : ''}<textarea class="field" rows="${rows}" data-a="t-str" data-p="${esc(pk(p))}"${locked || ro ? ' readonly' : ''}${vb ? ' data-v="1"' : ''}>${esc(v)}</textarea></label>${locked || ro ? '' : enBox(p, v)}</div>`;
    }
    if (typeof v === 'number') return `<label class="cms-f small">${lab}<input class="field" type="number" data-a="t-num" data-p="${esc(pk(p))}" value="${v}" style="max-width:10em"></label>`;
    if (typeof v === 'boolean') return `<label class="cms-f small"><input type="checkbox" data-a="t-bool" data-p="${esc(pk(p))}"${v ? ' checked' : ''}> ${lab}</label>`;
    return `<div class="cms-f small muted">${lab}: —</div>`;
  }
  function node(p, v, key, owner) {
    const depth = p.length;
    if (v == null || typeof v !== 'object') return leaf(p, v, owner, key);
    const open = S.open.has(pk(p)) || depth === 0;
    if (Array.isArray(v)) {
      const objs = v.length && v.every(x => x && typeof x === 'object' && !Array.isArray(x));
      if (!objs) { const first = v[0]; const vb = typeof first === 'string' && VERB_ARR.has(first); return `<div class="cms-f"><label class="small">${esc(label(key, depth))} <span class="muted">(قائمة بصيغة JSON)</span>${vb ? ' <span class="chip gold">نص موثّق</span>' : ''}<textarea class="field" dir="ltr" rows="${Math.min(8, 1 + Math.floor(J(v).length / 80))}" data-a="t-json" data-p="${esc(pk(p))}"${vb ? ' data-v="1"' : ''}>${esc(J(v))}</textarea></label></div>`; }
      const ids = CMS.idArr(v), lim = S.lim[pk(p)] || 40, shown = v.slice(0, lim);
      return `<details class="cms-node" data-p="${esc(pk(p))}"${open ? ' open' : ''}><summary><b>${esc(label(key, depth))}</b> <span class="chip">${nA(v.length)}</span></summary>${open ? `<div class="cms-arr">${shown.map((it, i) => { const seg = ids ? '@' + it.id : i, ip = p.concat(seg), iopen = S.open.has(pk(ip)); return `<div class="cms-it" data-p="${esc(pk(ip))}"><div class="cms-it-h"><button class="btn cms-tg" data-a="t-tg" data-p="${esc(pk(ip))}" aria-expanded="${iopen}">${iopen ? '▾' : '▸'} <span class="cms-n">${nA(i + 1)}</span> ${esc(itemTitle(it, i))}</button><span class="cms-act"><button class="btn" data-a="t-up" data-p="${esc(pk(ip))}" ${i === 0 ? 'disabled' : ''} aria-label="رفع">▲</button><button class="btn" data-a="t-dn" data-p="${esc(pk(ip))}" ${i === v.length - 1 ? 'disabled' : ''} aria-label="خفض">▼</button><button class="btn" data-a="t-dup" data-p="${esc(pk(ip))}" aria-label="نسخ العنصر">⧉</button><button class="btn danger" data-a="t-del" data-p="${esc(pk(ip))}" aria-label="حذف العنصر">✕</button></span></div>${iopen ? `<div class="cms-body">${objHTML(ip, it)}</div>` : ''}</div>`; }).join('')}
        ${v.length > lim ? `<button class="btn" data-a="t-more" data-p="${esc(pk(p))}">عرض المزيد (${nA(v.length - lim)} متبقية)</button>` : ''}
        <button class="btn pri" data-a="t-add" data-p="${esc(pk(p))}">+ إضافة عنصر إلى «${esc(label(key, depth))}»</button></div>` : ''}</details>`;
    }
    if (depth === 0) return objHTML(p, v);
    if (key === 'ay' && depth === 1) return `<details class="cms-node" data-p="${esc(pk(p))}"${open ? ' open' : ''}><summary><b>${esc(label(key, depth))}</b> <span class="chip">${nA(Object.keys(v).length)}</span></summary>${open ? `<div class="cms-body">${objHTML(p, v)}</div>` : ''}</details>`;
    return `<details class="cms-node" data-p="${esc(pk(p))}"${open ? ' open' : ''}><summary><b>${esc(label(key, depth))}</b></summary>${open ? `<div class="cms-body">${objHTML(p, v)}</div>` : ''}</details>`;
  }
  function objHTML(p, v) { return Object.keys(v).map(k => node(p.concat(k), v[k], k, v)).join(''); }
  function searchRun(q) {
    const nq = normAr(q), hits = []; if (nq.length < 2) { S.hits = []; return; }
    (function go(v, p, trail) {
      if (hits.length >= 60) return;
      if (typeof v === 'string') { if (p[p.length - 1] !== 'id' && normAr(v).includes(nq)) hits.push({ p, trail, v }); return; }
      if (Array.isArray(v)) { const ids = CMS.idArr(v); v.forEach((x, i) => go(x, p.concat(ids ? '@' + x.id : i), x && typeof x === 'object' && !Array.isArray(x) ? trail.concat(itemTitle(x, i)) : trail)); return; }
      if (v && typeof v === 'object') Object.keys(v).forEach(k => go(v[k], p.concat(k), trail));
    })(S.work, [], []);
    S.hits = hits;
  }
  function contentHTML() {
    const sel = `<div class="toolbar"><select id="cmsModSel" aria-label="اختر القسم"><option value="">— اختر قسماً لتحرير محتواه —</option>${MODS.map(m => `<option value="${m}"${m === S.mod ? ' selected' : ''}>${esc(((baseCards()[m] || [])[1] || m) + (baseCards()[m] ? '' : ' (' + m + ')'))}</option>`).join('')}</select></div>`;
    if (!S.mod) return `<p class="muted small">يعرض هذا التبويب بيانات القسم المختار شجرةً تُحرَّر نصوصها وتُضاف عناصرها وتُحذف وتُرتَّب. أقوال المفسرين والأحاديث منقولة حرفياً من مصادرها وتحذّرك الشاشة قبل تعديلها وتطلب سبباً يُسجَّل، ونصوص الآيات من مصحف المدينة مقفلة.</p>${sel}`;
    if (!S.work) return `${sel}<p class="loading">جارٍ تحميل بيانات القسم…</p>`;
    const nOps = (S.d.mods[S.mod] || []).length;
    return `${sel}<div class="panel stack tight"><div class="cms-row"><b>${esc((baseCards()[S.mod] || [])[1] || S.mod)}</b><span class="chip ${nOps ? 'acc' : ''}">${nOps ? nA(nOps) + ' تعديلاً في المسودة' : 'بلا تعديلات'}</span><span class="cms-grow"></span><a class="btn" href="#${esc(S.mod)}">فتح القسم</a>${nOps ? '<button class="btn danger" data-a="mod-reset">إلغاء تعديلات هذا القسم</button>' : ''}</div>
      ${S.stale.length ? `<div class="rs-warn" role="alert"><b>تعديلات قديمة لم تُطبَّق</b><p>تغيّر الأصل بعد أن عدّلتَ ${nA(S.stale.length)} موضعاً، فلم تُطبَّق تعديلاتك عليه حمايةً لما صُحِّح في الأصل. راجعها أو احذفها.</p><button class="btn" data-a="stale-drop">حذف هذه التعديلات القديمة</button></div>` : ''}
      <div class="cms-find"><input class="field" type="search" id="cmsQ" value="${esc(S.q)}" placeholder="ابحث في نصوص القسم" aria-label="ابحث في نصوص القسم"></div>
      ${S.q && S.q.length >= 2 ? `<div class="cms-hits">${S.hits.length ? S.hits.map((h, i) => `<button class="btn cms-hit" data-a="t-go" data-i="${i}"><b>${esc(h.trail.slice(-1)[0] || '')}</b> ${esc(h.v.replace(/\s+/g, ' ').slice(0, 90))}</button>`).join('') : '<p class="muted small">لا نتائج.</p>'}</div>` : ''}
      <div class="cms-tree">${node([], S.work, '', null)}</div></div>`;
  }
  async function onTree(a, el) {
    const p = el.dataset.p ? JSON.parse(el.dataset.p) : null;
    const parentOf = pp => { const par = getP(pp.slice(0, -1)); return par; };
    const idxOf2 = (arr, seg) => typeof seg === 'string' && seg[0] === '@' ? arr.findIndex(x => x && x.id === seg.slice(1)) : +seg;
    if (a === 't-tg') { const k = pk(p); S.open.has(k) ? S.open.delete(k) : S.open.add(k); return render(true); }
    if (a === 't-more') { S.lim[pk(p)] = (S.lim[pk(p)] || 40) + 60; return render(true); }
    if (a === 't-go') { const h = S.hits[+el.dataset.i]; for (let i = 1; i <= h.p.length; i++) { const pp = h.p.slice(0, i), v = getP(pp); S.open.add(pk(pp)); if (Array.isArray(getP(pp.slice(0, -1)))) { const arr = getP(pp.slice(0, -1)), ix = idxOf2(arr, pp[pp.length - 1]), ak = pk(pp.slice(0, -1)); if (ix + 1 > (S.lim[ak] || 40)) S.lim[ak] = ix + 1; } } S.open.delete(pk(h.p)); S.q = ''; S.hits = []; S.focusP = pk(h.p); return render(true); }
    if (a === 't-str') {
      let v = el.value; if (/[<>]/.test(v)) { v = v.replace(/[<>]/g, ''); say('أُزيلت علامتا < و > فالموقع يعرض النصوص مجرّدة من الوسوم.', true); }
      const old = getP(p); if (v === old) return;
      if (el.dataset.v) { const r = await ask({ title: 'تعديل نص موثّق', msg: 'هذا النص منقول بلفظه من مصدره (تفسير أو حديث أو ترجمة له). لا يُعدَّل إلا لتصحيح خطأ نسخ أو مطابقته لمصدره، وليس لتغيير المعنى. اذكر سبب التعديل ليُدوَّن في سجل التعديلات.', input: true, ph: 'سبب التعديل (مطلوب)', ok: 'اعتمد التعديل', warn: true }); if (!r) { el.value = old; return; }
        S.d.log.push({ at: Date.now(), m: S.mod, p: p.join(' › '), w: r }); }
      const par = parentOf(p), last = p[p.length - 1]; par[last] = v; S.edited.add(pk(p));
      const en = S.d.tr.en; if (en[old] && !en[v]) { en[v] = en[old]; delete en[old]; }
      syncMod(); const hold = el.closest('.cms-f'); if (hold && !hold.querySelector('.cms-en')) hold.insertAdjacentHTML('beforeend', enBox(p, v)); return;
    }
    if (a === 't-en') { const base = getP(JSON.parse(el.dataset.p)); const v = el.value.replace(/[<>]/g, '').trim(); if (v) S.d.tr.en[base] = v; else delete S.d.tr.en[base]; return commit(); }
    if (a === 't-num') { const par = parentOf(p), v = Number(el.value); if (Number.isFinite(v)) { par[p[p.length - 1]] = v; syncMod(); } return; }
    if (a === 't-bool') { parentOf(p)[p[p.length - 1]] = el.checked; return syncMod(); }
    if (a === 't-json') {
      let v; try { v = JSON.parse(el.value); } catch (e) { return say('الصيغة غير صحيحة. اكتب قائمة JSON مثل [2,45,46].', true); }
      if (!Array.isArray(v)) return say('يجب أن تكون قائمة.', true); if (J(v) === J(getP(p))) return;
      if (el.dataset.v) { const r = await ask({ title: 'تعديل نص موثّق', msg: 'هذه الكتلة منقولة بلفظها من مصدرها. لا تُعدَّل إلا لتصحيح خطأ نسخ. اذكر السبب.', input: true, ph: 'سبب التعديل (مطلوب)', ok: 'اعتمد التعديل', warn: true }); if (!r) { el.value = J(getP(p)); return; } S.d.log.push({ at: Date.now(), m: S.mod, p: p.join(' › '), w: r }); }
      parentOf(p)[p[p.length - 1]] = CMS.clean(v); return syncMod();
    }
    if (a === 't-add') { const arr = getP(p); const tpl = arr[arr.length - 1] || arr[0]; const it = blank(tpl); if (it && it.id === '') it.id = 'n' + rid(); arr.push(it); const seg = CMS.idArr(arr) ? '@' + it.id : arr.length - 1; S.open.add(pk(p)); S.open.add(pk(p.concat(seg))); syncMod(); S.lim[pk(p)] = Math.max(S.lim[pk(p)] || 40, arr.length); return render(true); }
    const arr = parentOf(p), seg = p[p.length - 1]; if (!Array.isArray(arr)) return; const i = idxOf2(arr, seg);
    if (a === 't-up' || a === 't-dn') { const j = i + (a === 't-up' ? -1 : 1); if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; syncMod(); return render(true); }
    if (a === 't-dup') { const c = CMS.clone(arr[i]); if (c && typeof c.id === 'string') c.id = 'n' + rid(); arr.splice(i + 1, 0, c); syncMod(); return render(true); }
    if (a === 't-del') { const ok = await ask({ title: 'حذف العنصر', msg: `سيُحذف «${itemTitle(arr[i], i)}» من القسم. يمكنك التراجع بزر «تراجع».`, ok: 'احذف', warn: true }); if (!ok) return; arr.splice(i, 1); syncMod(); return render(true); }
  }

  /* ---------- النشر والمسودة ---------- */
  const cfgKey = 'cmsRepo';
  function repoGuess() {
    const h = location.hostname, m = h.match(/^([a-z0-9-]+)\.github\.io$/), dir = location.pathname.replace(/[^/]*$/, '').replace(/^\//, '');
    return { owner: m ? m[1] : '', repo: m ? h : '', path: dir + CMS.file, branch: '' };
  }
  const repoCfg = () => ({ ...repoGuess(), ...(LS.get(cfgKey, {}) || {}) });
  function summary() {
    const d = S.d, cats = d.structure.cats, rows = [];
    if (cats) rows.push(['الهيكل', `ترتيب الأبواب والأقسام وأسماؤها معدَّلة (${nA(cats.length)} أبواب)`]);
    const cd = Object.keys(d.structure.cards).length; if (cd) rows.push(['بطاقات الأقسام', `${nA(cd)} قسماً عُدّل عنوانه أو وصفه`]);
    if (d.structure.hide.length) rows.push(['أقسام محذوفة', d.structure.hide.map(secTitle).join('، ')]);
    Object.keys(d.pages).forEach(i => rows.push(['قسم مضاف', `${d.pages[i].t} (${nA(d.pages[i].ch.length)} فصول)`]));
    Object.keys(d.mods).forEach(m => rows.push(['محتوى ' + ((baseCards()[m] || [])[1] || m), `${nA(d.mods[m].length)} تعديلاً: ` + d.mods[m].slice(0, 6).map(o => ({ set: 'تغيير', del: 'حذف', arr: 'إضافة أو حذف أو ترتيب' }[o.t]) + ' ' + o.p.map(s => String(s).replace(/^@/, '')).join('›')).join(' | ') + (d.mods[m].length > 6 ? ' …' : '')]));
    const tr = Object.keys(d.tr.en).length; if (tr) rows.push(['ترجمات', `${nA(tr)} نصاً بالإنجليزية`]);
    return rows;
  }
  function publishHTML() {
    const rows = summary(), cf = repoCfg(), tok = (() => { try { return sessionStorage.getItem('cmsTok') || ''; } catch (e) { return ''; } })();
    return `<section class="panel stack tight"><h3>ما الذي تغيّر؟</h3>${rows.length ? `<ul class="cms-sum">${rows.map(r => `<li><b>${esc(r[0])}:</b> ${esc(r[1])}</li>`).join('')}</ul>` : '<p class="muted">المسودة مطابقة للمنشور حالياً.</p>'}
      ${S.d.log.length ? `<details><summary>سجل تعديلات النصوص الموثّقة (${nA(S.d.log.length)})</summary><ul class="cms-sum">${S.d.log.slice(-30).map(l => `<li><b>${esc(l.m)}:</b> ${esc(l.p)} — ${esc(l.w)}</li>`).join('')}</ul></details>` : ''}
      <div class="toolbar"><button class="btn pri" data-a="preview">معاينة التعديلات على الموقع</button><button class="btn" data-a="draft-clear">إلغاء المسودة والعودة للمنشور</button><button class="btn" data-a="export">تصدير ملف التعديلات</button><label class="btn">استيراد ملف<input type="file" accept="application/json,.json" data-a="import" hidden></label></div>
      <p class="small muted" style="margin:0">المعاينة تعيد فتح الموقع بتعديلاتك غير المنشورة وأنت وحدك ترى ذلك، وفيها شريط يعيدك إلى المحرّر.</p></section>
    <section class="panel stack tight"><h3>النشر لكل الزوار</h3>
      <p class="small muted" style="margin:0">الموقع ثابت على GitHub Pages، فالنشر يعني كتابة الملف <code dir="ltr">${esc(cf.path)}</code> في المستودع. يلزمك «رمز وصول» من GitHub (Fine-grained token) محصور في هذا المستودع وحده بصلاحية <b>Contents: Read and write</b>. يُحفظ الرمز في هذه التبويبة فقط ويُمحى بإغلاقها، ولا يُرسل إلى أي جهة سوى GitHub.</p>
      <div class="cms-two"><label class="small">المالك<input class="field" dir="ltr" data-a="cfg" data-f="owner" value="${esc(cf.owner)}"></label><label class="small">المستودع<input class="field" dir="ltr" data-a="cfg" data-f="repo" value="${esc(cf.repo)}"></label></div>
      <div class="cms-two"><label class="small">مسار الملف<input class="field" dir="ltr" data-a="cfg" data-f="path" value="${esc(cf.path)}"></label><label class="small">الفرع (فارغ = الفرع الافتراضي)<input class="field" dir="ltr" data-a="cfg" data-f="branch" value="${esc(cf.branch)}"></label></div>
      <label class="small">رمز الوصول<input class="field" dir="ltr" type="password" autocomplete="off" id="cmsTok" value="${esc(tok)}" placeholder="github_pat_…"></label>
      <div class="toolbar"><button class="btn pri" data-a="publish" ${rows.length ? '' : 'disabled'}>انشر الآن</button><button class="btn" data-a="verify">تحقق من ظهوره على الموقع</button><button class="btn" data-a="history">عرض الإصدارات المنشورة</button></div>
      <div id="cmsPub" class="small" role="status"></div></section>`;
  }
  const b64 = s => { const u = new TextEncoder().encode(s); let t = ''; for (let i = 0; i < u.length; i += 8192) t += String.fromCharCode(...u.subarray(i, i + 8192)); return btoa(t); };
  const unb64 = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));
  async function gh(path, tok, opt = {}) {
    const r = await fetch('https://api.github.com' + path, { ...opt, headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(tok ? { Authorization: 'Bearer ' + tok } : {}), ...(opt.headers || {}) } });
    const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(j.message || ('HTTP ' + r.status)); e.status = r.status; throw e; } return j;
  }
  const pubMsg = (t, bad) => { const m = document.getElementById('cmsPub'); if (m) { m.textContent = t; m.className = 'small' + (bad ? ' cms-bad' : ''); } };
  async function publish() {
    const cf = repoCfg(), tok = (document.getElementById('cmsTok') || {}).value || ''; if (!tok) return pubMsg('أدخل رمز الوصول أولاً.', true);
    try { sessionStorage.setItem('cmsTok', tok); } catch (e) {}
    if (!cf.owner || !cf.repo || !cf.path) return pubMsg('أكمل بيانات المستودع.', true);
    const ok = await ask({ title: 'نشر التعديلات', msg: 'ستُكتب التعديلات في مستودع الموقع ثم ينشرها GitHub Pages لكل الزوار خلال دقيقة أو دقيقتين. يمكنك لاحقاً استرجاع أي إصدار سابق من «عرض الإصدارات المنشورة».', ok: 'انشر' }); if (!ok) return;
    pubMsg('جارٍ النشر…');
    try {
      const base = `/repos/${encodeURIComponent(cf.owner)}/${encodeURIComponent(cf.repo)}`, repo = await gh(base, tok);
      if (repo.permissions && repo.permissions.push === false) throw new Error('هذا الرمز لا يملك صلاحية الكتابة في المستودع.');
      const br = cf.branch || repo.default_branch, fp = cf.path.split('/').map(encodeURIComponent).join('/');
      let sha; try { sha = (await gh(`${base}/contents/${fp}?ref=${encodeURIComponent(br)}`, tok)).sha; } catch (e) { if (e.status !== 404) throw e; }
      S.d.updated = Date.now(); const body = JSON.stringify(S.d, null, 1) + '\n';
      const res = await gh(`${base}/contents/${fp}`, tok, { method: 'PUT', body: JSON.stringify({ message: 'محتوى الموسوعة: تحديث من محرّر المحتوى', content: b64(body), branch: br, ...(sha ? { sha } : {}) }) });
      CMS.pub = CMS.norm(JSON.parse(body)); persist();
      const u = res.commit && res.commit.html_url; pubMsg('نُشر التعديل في المستودع' + (u ? ': ' + u : '') + '. يظهر للزوار خلال دقيقة إلى دقيقتين بعد أن ينشره GitHub Pages، ثم اضغط «تحقق من ظهوره».');
    } catch (e) { pubMsg(e.status === 401 || e.status === 403 ? 'رفض GitHub الرمز أو الصلاحية: ' + e.message : e.status === 409 || e.status === 422 ? 'تعارض: تغيّر الملف في المستودع أثناء النشر، أعد المحاولة. (' + e.message + ')' : 'تعذّر النشر: ' + e.message, true); }
  }
  async function verifyLive() {
    pubMsg('جارٍ التحقق…');
    try { const r = await fetch(CMS.file + '?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status); const j = CMS.norm(await r.json());
      pubMsg(j.updated === S.d.updated || J({ ...j, updated: 0 }) === J({ ...S.d, updated: 0 }) ? 'ظاهر على الموقع المنشور: النسخة المنشورة مطابقة لمسودتك.' : 'الموقع ما زال يعرض نسخة أقدم (آخر تحديث ' + (j.updated ? new Date(j.updated).toLocaleString('ar-EG') : 'لا شيء منشور') + '). انتظر دقيقة وأعد التحقق.', !(j.updated === S.d.updated)); } catch (e) { pubMsg('تعذّر الفحص: ' + e.message, true); }
  }
  async function history() {
    const cf = repoCfg(), tok = (document.getElementById('cmsTok') || {}).value || ''; pubMsg('جارٍ جلب الإصدارات…');
    try { const base = `/repos/${encodeURIComponent(cf.owner)}/${encodeURIComponent(cf.repo)}`, fp = encodeURIComponent(cf.path);
      const L = await gh(`${base}/commits?path=${fp}&per_page=15${cf.branch ? '&sha=' + encodeURIComponent(cf.branch) : ''}`, tok);
      const box = document.getElementById('cmsPub'); box.className = 'small';
      box.innerHTML = L.length ? `<b>آخر الإصدارات المنشورة</b><ul class="cms-sum">${L.map(c => `<li>${esc(new Date(c.commit.author.date).toLocaleString('ar-EG'))} — ${esc((c.commit.message || '').split('\n')[0])} <button class="btn" data-a="restore" data-sha="${esc(c.sha)}">استرجاع في المسودة</button></li>`).join('')}</ul>` : 'لا إصدارات منشورة بعد.';
    } catch (e) { pubMsg('تعذّر جلب الإصدارات: ' + e.message, true); }
  }
  async function restore(sha) {
    const cf = repoCfg(), tok = (document.getElementById('cmsTok') || {}).value || '';
    try { const base = `/repos/${encodeURIComponent(cf.owner)}/${encodeURIComponent(cf.repo)}`, fp = cf.path.split('/').map(encodeURIComponent).join('/');
      const j = await gh(`${base}/contents/${fp}?ref=${encodeURIComponent(sha)}`, tok); const d = CMS.norm(JSON.parse(unb64(j.content)));
      const ok = await ask({ title: 'استرجاع إصدار سابق', msg: 'ستحلّ نسخة ذلك الإصدار محل مسودتك الحالية (ويمكنك التراجع)، ولا يتغيّر الموقع المنشور حتى تضغط «انشر الآن».', ok: 'استرجع', warn: true }); if (!ok) return;
      S.d = d; commit(); S.mod = ''; render(); say('استُرجع الإصدار في المسودة. عاينه ثم انشره.');
    } catch (e) { pubMsg('تعذّر الاسترجاع: ' + e.message, true); }
  }

  /* ---------- الهيكل العام للشاشة ---------- */
  function siteHTML() {
    return `<section class="panel stack tight"><h3>الإعدادات والحسابات</h3><p class="small muted" style="margin:0">المدير الشامل يملك كل الصلاحيات: ما يتاح للزائر والعميل، وفوقه إدارة المحتوى (هنا) وإدارة الموقع والحسابات (في لوحة الإدارة).</p>
      <ul class="cms-sum"><li><b>الإعلان العام والآية المختارة للرئيسية:</b> في لوحة الإدارة.</li><li><b>الحسابات:</b> إضافة حساب، تعيين كلمة مرور، تبديل الدور (عميل/مدير شامل)، تعطيل، حذف، مع قفل المحاولات الفاشلة وPBKDF2.</li><li><b>الأقسام والفصول والنصوص والترتيب:</b> التبويبات الأخرى هنا.</li></ul>
      <div class="toolbar"><a class="btn pri" href="#admin">لوحة الإدارة: الإعلان والآية والحسابات</a><a class="btn" href="#settings">إعدادات التطبيق</a><a class="btn" href="#account">حسابي</a></div>
      <p class="small muted" style="margin:0">حدّ معلن: الأقسام التي بياناتها مدمجة في الشيفرة نفسها (لا في ملفات mods) يمكن إخفاؤها وتغيير عنوانها ووصفها وترتيبها هنا، أما تحرير نصوصها الداخلية فيتطلب نقل بياناتها إلى ملفات mods، وهو ما أعمل عليه تدريجياً.</p></section>`;
  }
  const TABS = [['structure', 'الهيكل والترتيب'], ['pages', 'الأقسام المضافة'], ['content', 'محتوى الأقسام'], ['site', 'الإعدادات والحسابات'], ['publish', 'المعاينة والنشر']];
  function render(keep, focusKey) {
    const root = $r(); if (!root) return;
    const sy = keep ? window.scrollY : 0;
    const body = S.tab === 'structure' ? structureHTML() : S.tab === 'pages' ? pagesHTML() : S.tab === 'content' ? contentHTML() : S.tab === 'site' ? siteHTML() : publishHTML();
    root.innerHTML = `<div class="cms-top"><div><div class="eyebrow">لوحة الإدارة · محرّر المحتوى</div><h1>تحرير موسوعة القرآن الكريم</h1></div>
      <div class="cms-bar" role="toolbar" aria-label="أدوات المسودة"><button class="btn" data-a="undo" ${S.hist.length ? '' : 'disabled'}>↶ تراجع</button><button class="btn" data-a="redo" ${S.fut.length ? '' : 'disabled'}>↷ إعادة</button><span class="chip ${dirty() ? 'gold' : 'ok'}">${dirty() ? 'مسودة غير منشورة' : 'مطابق للمنشور'}</span></div></div>
      <div class="cms-tabs" role="tablist">${TABS.map(([k, l]) => `<button class="btn${S.tab === k ? ' pri' : ''}" role="tab" aria-selected="${S.tab === k}" data-a="tab" data-t="${k}">${l}</button>`).join('')}</div>
      <p id="cmsMsg" class="cms-msg" role="status">${esc(S.msg || '')}</p>${body}
      <p class="small muted">الحماية: هذه الشاشة لا تظهر إلا لحساب المدير الشامل، لكن الذي يتحكم فعلاً في ما يُنشر هو رمز GitHub الذي يملكه المالك وحده؛ فلا يستطيع أحد تغيير محتوى الموقع المنشور بالدخول إلى هذه الشاشة من دون ذلك الرمز.</p>`;
    window.scrollTo(0, sy);
    if (focusKey || S.focusP) { const k = focusKey || S.focusP; S.focusP = null; const el = [...root.querySelectorAll('[data-p]')].find(x => x.dataset.p === k); if (el) el.scrollIntoView({ block: 'center' }); }
    if (S.sel) { const e = root.querySelector(`.cms-sec[data-id="${S.sel}"]`); if (e) { e.open = true; e.scrollIntoView({ block: 'center' }); } S.sel = ''; }
  }
  function onClick(e) {
    const sm = e.target.closest('.cms-node > summary'); if (sm) { e.preventDefault(); const k = sm.parentNode.dataset.p; S.open.has(k) ? S.open.delete(k) : S.open.add(k); return render(true); }
    const el = e.target.closest('[data-a]'); if (!el) return; const a = el.dataset.a;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return;
    if (a === 'tab') { S.tab = el.dataset.t; return render(); }
    if (a === 'undo') return undo(); if (a === 'redo') return redo();
    if (a === 'preview') { try { sessionStorage.setItem('cmsPreview', '1'); } catch (er) {} persist(); location.hash = '#home'; return location.reload(); }
    if (a === 'draft-clear') return ask({ title: 'إلغاء المسودة', msg: 'ستُمحى كل تعديلاتك غير المنشورة وتعود المسودة إلى النسخة المنشورة.', ok: 'ألغِ المسودة', warn: true }).then(v => { if (v) { S.d = CMS.clone(CMS.pub); S.mod = ''; commit(); render(); say('عادت المسودة إلى المنشور.'); } });
    if (a === 'export') { const b = new Blob([J(S.d, null, 1)], { type: 'application/json' }); const l = document.createElement('a'); l.href = URL.createObjectURL(b); l.download = 'overrides.json'; l.click(); return; }
    if (a === 'publish') return publish(); if (a === 'verify') return verifyLive(); if (a === 'history') return history(); if (a === 'restore') return restore(el.dataset.sha);
    if (a === 'mod-reset') return ask({ title: 'إلغاء تعديلات القسم', msg: 'ستُلغى كل تعديلات هذا القسم في المسودة.', ok: 'ألغِ', warn: true }).then(v => { if (v) { delete S.d.mods[S.mod]; commit(); rebuildWork(); render(); } });
    if (a === 'stale-drop') { const s = new Set(S.stale.map(J)); S.d.mods[S.mod] = (S.d.mods[S.mod] || []).filter(o => !s.has(J(o))); if (!S.d.mods[S.mod].length) delete S.d.mods[S.mod]; commit(); rebuildWork(); return render(); }
    if (/^t-/.test(a)) return onTree(a, el);
    if (a === 'page-open' || a === 'page-new-sec' || a === 'mod-open') return onStructure(a, el, e);
    if (/^(pg|ch|blk|page)-/.test(a)) return onPage(a, el);
    return onStructure(a, el, e);
  }
  function onChange(e) {
    const el = e.target; const a = el.dataset && el.dataset.a;
    if (el.id === 'cmsModSel') { S.mod = ''; return el.value ? openMod(el.value) : render(); }
    if (el.id === 'cmsPgSel') { S.page = el.value; return render(); }
    if (el.id === 'cmsTok') { try { sessionStorage.setItem('cmsTok', el.value); } catch (er) {} return; }
    if (!a) return;
    if (a === 'cfg') { const c = LS.get(cfgKey, {}) || {}; c[el.dataset.f] = el.value.trim(); LS.set(cfgKey, c); return; }
    if (a === 'import') { const f = el.files[0]; if (!f) return; f.text().then(t => { let j; try { j = JSON.parse(t); } catch (er) { return say('الملف ليس JSON صحيحاً.', true); } if (!j || j.v !== 1) return say('الملف ليس ملف تعديلات لهذا المحرّر.', true); ask({ title: 'استيراد ملف تعديلات', msg: 'ستحلّ محتويات الملف محل مسودتك الحالية، ويمكنك التراجع.', ok: 'استورد' }).then(v => { if (v) { S.d = CMS.norm(j); S.mod = ''; commit(); render(); say('استُورد الملف إلى المسودة.'); } }); }); return; }
    if (/^t-/.test(a)) return onTree(a, el);
    if (/^(pg|ch|blk)-/.test(a)) return onPage(a, el);
    if (el.tagName === 'BUTTON') return;
    return onStructure(a, el, e);
  }
  let qt = 0;
  function onInput(e) { const el = e.target; if (el.id === 'cmsQ') { S.q = el.value; clearTimeout(qt); qt = setTimeout(() => { searchRun(S.q); const pos = el.selectionStart; render(true); const q = document.getElementById('cmsQ'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (er) {} } }, 250); } }
  window.CMSUI = {
    open() {
      if (!isAdmin()) return;
      if (!S.d) { S.d = loadDraft(); S.snap = J(S.d); S.hist = []; S.fut = []; if (!CMS.base) CMS.snapshot(); }
      V(`<div class="stack cms" id="cmsRoot" style="max-width:980px"></div>`);
      const r = $r(); r.addEventListener('click', onClick); r.addEventListener('change', onChange); r.addEventListener('input', onInput);
      render();
    },
    _S: S,
  };
})();
