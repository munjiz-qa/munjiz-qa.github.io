'use strict';
/* مشكاة — أدوات الدراسة: الاختبار القصير للحفظ، والبحث في الآيات والتفاسير معاً.
   تُحمَّل عند أول استعمال (من app.js) ولا تتصل بأي خدمة خارجية: كل شيء يعمل من ملفات التطبيق نفسه. */
(() => {
  const rnd = k => Math.floor(Math.random() * k);
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const wordsOf = i => { const a = Q.ayat[i], o = []; for (let k = 0; k < a[3]; k++) o.push(W.w[a[2] + k][0]); return o; };
  const wkey = w => norm(w).replace(/[^ء-ي]/g, '');
  const head = (i, k) => { const w = wordsOf(i); return w.slice(0, k).join(' ') + (w.length > k ? ' …' : ''); };
  const tail = (i, k) => { const w = wordsOf(i); return (w.length > k ? '… ' : '') + w.slice(-k).join(' '); };

  /* ---------- الاختبار القصير: أكمل الكلمة، وما الآية التالية ---------- */
  function makeQuiz(ids) {
    const qs = [], want = Math.min(8, Math.max(4, ids.length * 2));
    const sur = Q.surahs[Q.ayat[ids[0]][0] - 1];
    const pool = []; for (let i = sur.first; i < sur.first + sur.ayas; i++) wordsOf(i).forEach(w => { if (wkey(w).length >= 3) pool.push(w); });
    const used = new Set();
    const cloze = i => {
      const w = wordsOf(i), cand = w.map((x, k) => k).filter(k => wkey(w[k]).length >= 3 && !used.has(i + ':' + k));
      if (!cand.length) return null;
      const k = cand[rnd(cand.length)], ans = w[k], ak = wkey(ans); used.add(i + ':' + k);
      const seen = new Set([ak]), opts = [ans];
      const near = shuffle(pool).sort((x, y) => Math.abs(wkey(x).length - ak.length) - Math.abs(wkey(y).length - ak.length));
      for (const p of near) { const pk = wkey(p); if (!seen.has(pk)) { seen.add(pk); opts.push(p); if (opts.length === 4) break; } }
      if (opts.length < 2) return null;
      const shown = w.map((x, j) => j === k ? '＿＿＿＿' : x).join(' ');
      return { t: 'c', i, prompt: 'أكمل الكلمة الناقصة في الآية', text: shown, opts: shuffle(opts), ok: ans };
    };
    const nextQ = i => {
      const su = Q.surahs[Q.ayat[i][0] - 1]; if (i + 1 >= su.first + su.ayas) return null;
      const ok = head(i + 1, 7), cand = []; for (let j = su.first; j < su.first + su.ayas; j++) if (j !== i + 1 && j !== i) cand.push(j);
      const seen = new Set([ok]), opts = [ok];
      for (const j of shuffle(cand)) { const h = head(j, 7); if (!seen.has(h)) { seen.add(h); opts.push(h); if (opts.length === 4) break; } }
      if (opts.length < 2) return null;
      return { t: 'n', i, prompt: 'ما الآية التي تلي هذه الآية؟', text: tail(i, 12), opts: shuffle(opts), ok, ans: i + 1 };
    };
    let guard = 0, turn = 0;
    const order = shuffle(ids);
    while (qs.length < want && guard++ < 60) {
      const i = order[turn % order.length]; turn++;
      const q = (turn % 2 ? nextQ(i) : null) || cloze(i) || nextQ(i);
      if (q) qs.push(q);
    }
    return qs;
  }

  window.hifzQuiz = function (box, ids, key, onGrade) {
    let qs = makeQuiz(ids), at = 0, score = 0; const wrong = [];
    const ayLabel = i => ref(i);
    const draw = () => {
      if (!qs.length) { box.innerHTML = '<p class="muted">المقطع قصير جداً للاختبار، جرّب «إخفاء كامل» أو اختر آيات أكثر.</p>'; return; }
      if (at >= qs.length) return done();
      const q = qs[at];
      box.innerHTML = `<div class="quiz stack tight"><div class="pill-row"><span class="chip">السؤال ${n(at + 1)} من ${n(qs.length)}</span><span class="chip ok">صحيح ${n(score)}</span></div>
        <b>${q.prompt}</b><div class="ayah quiz-ay">${esc(q.text)}</div>
        <div class="quiz-opts" role="group" aria-label="الاختيارات">${q.opts.map((o, k) => `<button type="button" class="quiz-opt ayah" data-k="${k}">${esc(o)}</button>`).join('')}</div>
        <div class="quiz-fb" id="qzFb" aria-live="polite"></div></div>`;
      box.querySelector('.quiz-opts').onclick = e => {
        const b = e.target.closest('.quiz-opt'); if (!b || box.dataset.lock === String(at)) return; box.dataset.lock = String(at);
        const pick = q.opts[+b.dataset.k], good = pick === q.ok; if (good) score++; else wrong.push(q);
        box.querySelectorAll('.quiz-opt').forEach(x => { const v = q.opts[+x.dataset.k]; x.disabled = true; if (v === q.ok) x.classList.add('ok'); else if (x === b) x.classList.add('bad'); });
        $('#qzFb').innerHTML = `<div class="${good ? 'okmsg' : 'badmsg'}">${good ? 'أحسنت، إجابة صحيحة.' : 'الصواب: ' + esc(q.ok)} <span class="muted small">· ${esc(ayLabel(q.t === 'n' ? q.ans : q.i))}</span></div><button type="button" class="btn pri" id="qzNext">${at + 1 < qs.length ? 'السؤال التالي' : 'عرض النتيجة'}</button>`;
        $('#qzNext').onclick = () => { at++; draw(); }; $('#qzNext').focus();
      };
    };
    const done = () => {
      const pct = Math.round(score / qs.length * 100), g = pct >= 85 ? 5 : pct >= 60 ? 3 : 1;
      const lbl = { 5: 'سهل، أتقنته', 3: 'متوسط', 1: 'صعب، أعده غداً' }[g];
      const refs = [...new Set(wrong.map(q => q.t === 'n' ? q.ans : q.i))];
      box.innerHTML = `<div class="quiz stack tight"><div class="quiz-score"><b>${n(score)} من ${n(qs.length)}</b><span class="muted">${n(pct)}٪</span></div>
        <p style="margin:0">${pct >= 85 ? 'ما شاء الله، حفظك متقن. يُقترح تأجيل المراجعة.' : pct >= 60 ? 'حفظ جيد، وتحتاج مراجعة أقرب في مواضع قليلة.' : 'ما زال المقطع يحتاج تثبيتاً، فأعد مراجعته غداً بإذن الله.'}</p>
        ${refs.length ? `<div class="pill-row"><span class="muted small">راجع:</span>${refs.map(i => `<a class="chip" data-ayah="${i}">${esc(ayLabel(i))}</a>`).join('')}</div>` : ''}
        <div class="toolbar"><button type="button" class="btn pri" id="qzSave">سجّل التقييم المقترح: ${lbl}</button><button type="button" class="btn" id="qzAgain">اختبار جديد</button></div></div>`;
      $('#qzSave').onclick = () => onGrade(g);
      $('#qzAgain').onclick = () => { qs = makeQuiz(ids); at = 0; score = 0; wrong.length = 0; delete box.dataset.lock; draw(); };
    };
    draw();
  };

  /* ---------- البحث في الآيات والتفاسير معاً ---------- */
  const TSNORM = {}; // مفتاح التفسير → قائمة {i: فهرس الآية الأولى، s: النص الأصلي، x: النص المطبَّع}
  async function tsLoad(key, prog) {
    if (TSNORM[key]) return TSNORM[key];
    const rows = []; let last = -1;
    for (let s = 1; s <= 114; s++) {
      const o = await tafsir(key, s); if (prog) prog(s);
      for (const [a, t] of Object.entries(o)) { const i = idxOf(s, +a); if (i < 0 || !t) continue; rows.push({ i, s: t, x: ' ' + norm(t).replace(/[^ء-ي]+/g, ' ') + ' ' }); }
      if (s % 6 === 0) await new Promise(r => setTimeout(r, 0));
    }
    return (TSNORM[key] = rows);
  }
  const hiMark = (text, terms) => { // يظلّل الكلمات المطابقة في النص الأصلي بعد توسيع الجذور
    const t = new Set(terms);
    return text.split(/(\s+)/).map(p => (p.trim() && stems(p).some(x => t.has(x))) ? `<mark>${esc(p)}</mark>` : esc(p)).join('');
  };
  function cut(text, terms, len = 260) { // مقطع حول أول موضع مطابق
    const parts = text.split(/(\s+)/), t = new Set(terms); let at = -1;
    for (let k = 0; k < parts.length; k++) if (parts[k].trim() && stems(parts[k]).some(x => t.has(x))) { at = k; break; }
    if (at < 0) return hiMark(text.slice(0, len), terms) + (text.length > len ? ' …' : '');
    let a = at, b = at, size = 0;
    while (a > 0 && size < len * .35) { a--; size += parts[a].length; }
    size = 0; while (b < parts.length - 1 && size < len * .65) { b++; size += parts[b].length; }
    const out = parts.slice(a, b + 1).join('');
    return (a > 0 ? '… ' : '') + hiMark(out.trim(), terms) + (b < parts.length - 1 ? ' …' : '');
  }
  const TS_ALL = () => TF.map(b => b.key);
  window.tafsirSearch = async function (raw, box) {
    const sel = new Set(JSON.parse(sessionStorage.getItem('mishkat:tsSel') || 'null') || ['muyassar', 'saadi', 'jalalayn']);
    const heavy = { ibnkathir: 'نحو ١٣ ميغابايت', tabari: 'نحو ١٢ ميغابايت', qurtubi: 'نحو ١٥ ميغابايت', baghawi: 'نحو ٥ ميغابايت' };
    const keys = TS_ALL().filter(k => sel.has(k));
    box.innerHTML = `<div class="stack"><section class="panel stack tight"><b>التفاسير المشمولة بالبحث</b>
      <div class="pill-row" id="tsChips">${TF.map(b => `<label class="chip tschip${sel.has(b.key) ? ' on' : ''}"><input type="checkbox" value="${b.key}"${sel.has(b.key) ? ' checked' : ''}> ${esc(b.title)}${heavy[b.key] ? ` <small class="muted">(${heavy[b.key]})</small>` : ''}</label>`).join('')}</div>
      <p class="muted small" style="margin:0">الأصل: الآيات مع الميسر والجلالين والسعدي. وعند إضافة تفسير كبير يُنزَّل مرة واحدة ويبقى في جهازك. البحث يوسّع كلماتك بالجذور والمترادفات، ويظلّل ما طابق.</p><div id="tsProg" class="muted small" aria-live="polite"></div></section><div id="tsOut"></div></div>`;
    $('#tsChips').onchange = e => { const c = e.target; if (c.checked) sel.add(c.value); else sel.delete(c.value); try { sessionStorage.setItem('mishkat:tsSel', JSON.stringify([...sel])); } catch (x) {} window.tafsirSearch(raw, box); };
    if (!keys.length) { $('#tsOut').innerHTML = '<p class="muted">اختر تفسيراً واحداً على الأقل.</p>'; return; }
    const r = await smartSearch(raw, 80);
    const terms = r.terms, tset = new Set(terms);
    const per = new Map(); // آية → { score, hits:[{key, html}] }
    const addHit = (i, sc, key, text) => { const o = per.get(i) || per.set(i, { score: 0, hits: [] }).get(i); o.score += sc; o.hits.push({ key, text, sc }); };
    // الآيات نفسها بوزن أعلى
    r.ids.forEach(i => addHit(i, r.score[i] * 1.4, null, null));
    const N = Q.ayat.length;
    for (const key of keys) {
      const title = TF.find(b => b.key === key).title;
      let rows; try { rows = await tsLoad(key, s => { $('#tsProg').textContent = `جارٍ تجهيز «${title}»… ${n(Math.round(s / 114 * 100))}٪`; }); }
      catch (e) { $('#tsProg').textContent = 'تعذّر تحميل «' + title + '». تحقق من الاتصال ثم أعد المحاولة.'; continue; }
      $('#tsProg').textContent = '';
      const hits = [];
      for (const row of rows) {
        let sc = 0, hitTerms = 0;
        for (const t of terms) { const k = row.x.split(' ' + t).length - 1; if (k) { hitTerms++; sc += Math.log(1 + k); } }
        if (!hitTerms) continue;
        const cov = hitTerms / Math.max(1, terms.length);
        hits.push([row, sc * (0.4 + cov)]);
      }
      hits.sort((a, b) => b[1] - a[1]);
      hits.slice(0, 120).forEach(([row, sc]) => addHit(row.i, sc * 1.1, key, row.s));
    }
    const ids = [...per.keys()].sort((a, b) => per.get(b).score - per.get(a).score).slice(0, 60);
    const top = per.get(ids[0])?.score || 1;
    if (!ids.length) { $('#tsOut').innerHTML = '<p class="muted">لم أجد نتائج قريبة. جرّب كلمة أخرى أو أضف تفاسير من القائمة أعلاه.</p>'; return; }
    const tn = Object.fromEntries(TF.map(b => [b.key, b.title]));
    $('#tsOut').innerHTML = `<section class="panel stack tight"><div class="pill-row"><span class="chip acc">${n(ids.length)} موضعاً مرتّباً بالأقرب</span><span class="chip">في ${n(keys.length)} ${plural(keys.length, 'تفسير', 'تفاسير', 'تفسيراً')} والآيات</span>${r.concepts.map(c => `<span class="chip gold">مفهوم: ${esc(c)}</span>`).join('')}</div>
      <p class="muted small" style="margin:0">الكلمات المطابقة مظلَّلة في الآية وفي نص كل تفسير. اضغط رقم الآية لفتح تفسيرها كاملاً.</p></section><section class="panel"><div id="tsHits"></div></section>`;
    const hlWords = i => { const a = Q.ayat[i], s = new Set(); for (let k = 0; k < a[3]; k++) { if (stems(W.w[a[2] + k][0]).some(x => tset.has(x))) s.add(a[2] + k); } return s; };
    renderOcc($('#tsHits'), ids, null, 15, i => { const o = per.get(i);
      return `<div class="why"><span class="chip">درجة القرب ${n(Math.max(1, Math.round(o.score / top * 100)))}٪</span></div>` +
        o.hits.filter(h => h.key).sort((a, b) => b.sc - a.sc).slice(0, 4).map(h => `<div class="tshit"><b class="tsname">${esc(tn[h.key])}</b><p class="snip">${cut(h.text, terms)}</p></div>`).join(''); });
    // تظليل كلمات الآية: renderOcc لا يمرّر المجموعة لكل آية، لذا نظلّل بعد الرسم
    const mark = () => $$('#tsHits .occ').forEach(el => { if (el.dataset.hl) return; el.dataset.hl = 1; const num = el.querySelector('[data-ayah]'); if (!num) return; const i = +num.dataset.ayah; const hw = hlWords(i); if (!hw.size) return; el.querySelectorAll('.ayah .w').forEach(w => { if (hw.has(+w.dataset.word)) { const m = document.createElement('mark'); w.replaceWith(m); m.className = 'w'; m.dataset.word = w.dataset.word; m.textContent = w.textContent; } }); });
    mark(); $('#tsHits').addEventListener('click', e => { if (e.target.closest('.more')) setTimeout(mark, 0); });
  };
})();
