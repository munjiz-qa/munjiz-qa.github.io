// بصيرة كولر — صفحة البحث والنتيجة والمساهمة
(function () {
  const { rpc, normalize, fmt, country, date, dateTime, num, KIND, CAT, level, esc, cleanName, toast, auth } = BC;
  BC.chrome('home');
  const $ = s => document.querySelector(s);
  const cc = $('#cc'), q = $('#q'), out = $('#result'), dlg = $('#dlg'), body = $('#dlgBody');
  let current = null;

  cc.innerHTML = BC.CC.map(c => '<option value="' + c[0] + '"' + (c[0] === '974' ? ' selected' : '') + '>' + c[2] + ' +' + c[0] + '</option>').join('');

  Promise.all([rpc('bc_stats'), BC.directory.ready]).then(([s]) => { $('#f-n').textContent = num(Math.max(s.numbers, BC.directory.count())); $('#f-r').textContent = num(s.reports); $('#f-l').textContent = num(s.lookups); }).catch(() => {});

  async function lookup(raw, count) {
    const e = normalize(raw, cc.value);
    if (!e) { toast('صيغة الرقم غير صحيحة. مثال: 5555 1234 أو ‎+974 5555 1234', true); return; }
    out.hidden = false; out.innerHTML = '<div class="rcard"><div class="empty">جارٍ البحث عن <span class="ltr">' + esc(fmt(e)) + '</span>…</div></div>';
    try {
      const r = await Promise.all([rpc('bc_lookup', { p_number: e, p_count: count !== false }), BC.directory.ready]);
      current = r[0];
      render(current);
      history.replaceState(null, '', '?n=' + encodeURIComponent(e) + '#search');
    } catch (err) { out.innerHTML = '<div class="rcard"><div class="empty">' + esc(err.message) + '</div></div>'; }
  }

  function render(c) {
    c = current = BC.directory.merge(c);
    const lv = level(c.spam_score || 0), co = country(c.e164);
    const unknown = !c.name;
    const title = c.name ? esc(c.name) : (c.official_reports >= 5 ? 'رقم مُبلَّغ عنه رسمياً' : c.spam_score >= 30 ? 'رقم مُبلَّغ عنه' : 'رقم غير معروف');
    const initial = c.name ? esc(c.name.trim().charAt(0)) : (c.spam_score >= 30 ? '!' : '؟');
    const kinds = Object.entries(c.kinds || {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => '<span class="badge warn">' + KIND[k] + ' · ' + v + '</span>').join(' ');
    const comments = (c.comments || []).map(m => '<li>' + esc(m.comment) + '<small>' + KIND[m.kind] + ' · <span class="ltr">' + date(m.at) + '</span></small></li>').join('');
    out.innerHTML = '<div class="rcard">' +
      '<div class="rhead ' + lv.cls + '"><div class="avatar">' + initial + '</div><div style="flex:1;min-width:0">' +
        '<h2>' + title + (c.verified ? ' <span class="badge sun" title="' + (c.source ? 'رقم منشور رسمياً من مصدر معلن' : 'رقم موثّق من الإدارة') + '">✓ موثّق</span>' : '') + '</h2>' +
        '<div class="n"><span class="ltr">' + esc(fmt(c.e164)) + '</span>' + (co ? ' · ' + co.flag + ' ' + co.name : '') + '</div></div>' +
        '<span class="badge ' + lv.cls + '">' + lv.label + '</span></div>' +
      '<div class="rbody"><div>' +
        '<div class="kv"><span>مؤشر الإزعاج</span><b class="ltr">' + (c.spam_score || 0) + ' / 100</b></div>' +
        '<div class="meter" aria-hidden="true"><i style="width:' + Math.max(4, c.spam_score || 0) + '%"></i></div>' +
        '<div class="kv"><span>التصنيف</span><b>' + (unknown && !c.reports && !c.official_reports ? 'غير مصنّف' : (CAT[c.category] || 'شخصي')) + '</b></div>' +
        '<div class="kv"><span>بلاغات المجتمع</span><b>' + num(c.reports) + '</b></div>' +
        '<div class="kv"><span>تقييمات: آمن / مزعج</span><b>' + num(c.safe_votes) + ' / ' + num(c.spam_votes) + '</b></div>' +
        '<div class="kv"><span>عمليات البحث</span><b>' + num(c.lookups) + '</b></div>' +
        (c.updated_at ? '<div class="kv"><span>آخر تحديث</span><b class="ltr">' + dateTime(c.updated_at) + '</b></div>' : '') +
        (c.official_reports >= 5 ? '<div class="kv"><span>بلاغات رسمية</span><b>' + num(c.official_reports) + ' شكوى' + (c.official_subject ? ' · ' + esc(c.official_subject) : '') + '</b></div>' +
          (c.official_last ? '<div class="kv"><span>آخر شكوى رسمية</span><b class="ltr">' + date(c.official_last) + '</b></div>' : '') : '') +
        (c.source && c.source.url ? '<p class="hint src">المصدر: <a href="' + esc(c.source.url) + '" target="_blank" rel="noopener">' + esc(c.source.name) + '</a></p>' : '') +
        (kinds ? '<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px">' + kinds + '</div>' : '') +
      '</div><div>' +
        '<h3>ماذا قال المجتمع</h3>' + (comments ? '<ul class="comments">' + comments + '</ul>' : '<p class="hint">لا توجد تعليقات بعد. كن أول من يساهم بمعلومة مفيدة عن هذا الرقم.</p>') +
        ((c.alt_names || []).length > 1 ? '<p class="hint">أسماء أخرى مقترحة: ' + c.alt_names.slice(1).map(esc).join('، ') + '</p>' : '') +
      '</div></div>' +
      '<div class="ractions">' +
        '<button class="btn btn-main" data-a="name">' + (unknown ? 'أضف اسماً لهذا الرقم' : 'اقترح اسماً أدق') + '</button>' +
        '<button class="btn btn-risk" data-a="report">أبلغ عن الرقم</button>' +
        '<button class="btn btn-line" data-a="safe">👍 رقم آمن</button>' +
        '<button class="btn btn-line" data-a="spam">👎 رقم مزعج</button>' +
        '<button class="btn btn-line" data-a="share">مشاركة</button>' +
      '</div></div>';
    out.querySelectorAll('[data-a]').forEach(b => b.onclick = () => act(b.dataset.a));
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function needLogin() {
    if (auth.token()) return false;
    open('<h3>سجّل الدخول للمساهمة <button class="x" data-close aria-label="إغلاق">✕</button></h3>' +
      '<p>المساهمات مرتبطة بحسابات حقيقية لضمان المصداقية ومنع التلاعب. إنشاء الحساب مجاني ويستغرق أقل من دقيقة.</p>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-main" href="account.html?next=' + encodeURIComponent(location.pathname + location.search) + '">تسجيل الدخول</a>' +
      '<a class="btn btn-line" href="account.html?mode=register&next=' + encodeURIComponent(location.pathname + location.search) + '">إنشاء حساب</a></div>');
    return true;
  }

  function open(html) {
    body.innerHTML = html;
    body.querySelectorAll('[data-close]').forEach(b => b.onclick = () => dlg.close());
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }

  async function act(a) {
    if (!current) return;
    const e = current.e164;
    if (a === 'share') {
      const url = location.origin + location.pathname + '?n=' + encodeURIComponent(e);
      const text = 'نتيجة بصيرة كولر للرقم ' + fmt(e) + ': ' + (current.name || 'غير معروف') + ' · مؤشر الإزعاج ' + (current.spam_score || 0);
      if (navigator.share) { try { await navigator.share({ title: 'بصيرة كولر', text, url }); } catch (x) {} }
      else { try { await navigator.clipboard.writeText(text + '\n' + url); toast('نُسخ الرابط، يمكنك لصقه في أي محادثة.'); } catch (x) { toast(url); } }
      return;
    }
    if (needLogin()) return;
    if (a === 'safe' || a === 'spam') {
      try { current = await rpc('bc_rate', { p_token: auth.token(), p_number: e, p_value: a === 'safe' ? 1 : -1 }); render(current); toast('شكراً، سُجّل تقييمك.'); }
      catch (err) { toast(err.message, true); }
      return;
    }
    if (a === 'name') {
      open('<h3>اسم الرقم <span class="ltr">' + esc(fmt(e)) + '</span> <button class="x" data-close aria-label="إغلاق">✕</button></h3>' +
        '<form id="fn"><div class="field"><label for="nm">الاسم كما تعرفه</label><input id="nm" maxlength="60" required placeholder="مثال: صيدلية النور - الدوحة"></div>' +
        '<p class="hint">أضف اسماً تعرفه يقيناً، مثل اسم منشأة أو جهة. لا تضف بيانات حساسة عن الأفراد.</p>' +
        '<button class="btn btn-main" type="submit" style="width:100%">حفظ الاسم</button></form>');
      body.querySelector('#fn').onsubmit = async ev => {
        ev.preventDefault();
        const btn = ev.target.querySelector('button'); btn.disabled = true;
        try { current = await rpc('bc_suggest_name', { p_token: auth.token(), p_number: e, p_name: cleanName(body.querySelector('#nm').value) }); dlg.close(); render(current); toast('شكراً لمساهمتك، أُضيف الاسم.'); }
        catch (err) { toast(err.message, true); btn.disabled = false; }
      };
      return;
    }
    if (a === 'report') {
      const opts = Object.entries(KIND).map(([k, v], i) => '<input type="radio" name="k" id="k' + i + '" value="' + k + '"' + (i === 0 ? ' checked' : '') + '><label for="k' + i + '">' + v + '</label>').join('');
      open('<h3>الإبلاغ عن <span class="ltr">' + esc(fmt(e)) + '</span> <button class="x" data-close aria-label="إغلاق">✕</button></h3>' +
        '<form id="fr"><label>نوع البلاغ</label><div class="chips">' + opts + '</div>' +
        '<div class="field"><label for="cm">ملاحظة تفيد غيرك (اختياري)</label><textarea id="cm" maxlength="280" placeholder="مثال: يدّعي أنه من البنك ويطلب رمز التحقق"></textarea></div>' +
        '<button class="btn btn-risk" type="submit" style="width:100%">إرسال البلاغ</button></form>');
      body.querySelector('#fr').onsubmit = async ev => {
        ev.preventDefault();
        const btn = ev.target.querySelector('button'); btn.disabled = true;
        const k = body.querySelector('input[name=k]:checked').value;
        try { current = await rpc('bc_report', { p_token: auth.token(), p_number: e, p_kind: k, p_comment: body.querySelector('#cm').value.trim() || null }); dlg.close(); render(current); toast('وصل بلاغك، وسيظهر لكل من يبحث عن هذا الرقم.'); }
        catch (err) { toast(err.message, true); btn.disabled = false; }
      };
    }
  }

  $('#sform').onsubmit = ev => { ev.preventDefault(); lookup(q.value); };
  const p = new URLSearchParams(location.search).get('n');
  if (p) { const e = normalize(p, '974'); if (e) { q.value = fmt(e).replace(/^\+\d+\s/, ''); const c = BC.country(e); if (c) cc.value = c.code.slice(1); lookup(e); } }
  auth.refresh().then(() => BC.chrome('home'));
})();
