// بصيرة كولر من منجز — الأدوات المشتركة: الاتصال بالخادم، وتوحيد الأرقام والتواريخ، والجلسة.
(function () {
  const CFG = window.BC_CONFIG || {};
  const TKEY = 'bc.token', UKEY = 'bc.user';

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }
  };

  const ERR = {
    AUTH_REQUIRED: 'يلزم تسجيل الدخول لإتمام هذه الخطوة.',
    ADMIN_ONLY: 'هذه الصفحة مخصصة لمدير المنصة.',
    BAD_LOGIN: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    EMAIL_TAKEN: 'هذا البريد مسجّل مسبقاً. سجّل الدخول بدلاً من إنشاء حساب جديد.',
    WEAK_PASSWORD: 'كلمة المرور يجب ألا تقل عن 8 أحرف.',
    BAD_NUMBER: 'صيغة الرقم غير صحيحة. اكتب الرقم مع رمز الدولة، مثل +974 5555 1234.',
    BAD_NAME: 'الاسم يجب أن يكون بين حرفين و60 حرفاً.',
    BAD_CONTACT: 'أدخل وسيلة تواصل صحيحة (بريد أو هاتف).',
    NUMBER_PROTECTED: 'صاحب هذا الرقم طلب حماية بياناته، لذا لا يمكن إضافة معلومات عنه.',
    SUSPENDED: 'هذا الحساب موقوف. تواصل مع إدارة المنصة.',
    SELF_LOCK: 'لا يمكنك سحب صلاحية الإدارة من حسابك أو إيقافه.',
    NETWORK: 'تعذّر الاتصال بالخادم. تحقق من الإنترنت ثم أعد المحاولة.'
  };

  async function rpc(fn, args) {
    if (!CFG.url) {
      try { return await window.BC_LOCAL(fn, args); }
      catch (e) { const err = new Error(ERR[e.code] || 'حدث خطأ غير متوقع، أعد المحاولة.'); err.code = e.code; if (e.code === 'AUTH_REQUIRED') { store.set(TKEY, null); store.set(UKEY, null); } throw err; }
    }
    let res;
    try {
      res = await fetch(CFG.url.replace(/\/$/, '') + '/rest/v1/rpc/' + fn, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: CFG.key, Authorization: 'Bearer ' + CFG.key },
        body: JSON.stringify(args || {})
      });
    } catch (e) { throw new Error(ERR.NETWORK); }
    const txt = await res.text();
    let data = null; try { data = txt ? JSON.parse(txt) : null; } catch (e) {}
    if (!res.ok) {
      const code = data && data.message ? String(data.message).trim() : '';
      const err = new Error(ERR[code] || 'حدث خطأ غير متوقع، أعد المحاولة.');
      err.code = code;
      if (code === 'AUTH_REQUIRED') { store.set(TKEY, null); store.set(UKEY, null); }
      throw err;
    }
    return data;
  }

  // ---------- توحيد الأرقام ----------
  const CC = [
    ['974', 'قطر', '🇶🇦', [4, 4]], ['966', 'السعودية', '🇸🇦', [2, 3, 4]], ['971', 'الإمارات', '🇦🇪', [2, 3, 4]],
    ['965', 'الكويت', '🇰🇼', [4, 4]], ['973', 'البحرين', '🇧🇭', [4, 4]], ['968', 'عُمان', '🇴🇲', [4, 4]],
    ['20', 'مصر', '🇪🇬', [3, 3, 4]], ['962', 'الأردن', '🇯🇴', [1, 4, 4]], ['961', 'لبنان', '🇱🇧', [2, 3, 3]],
    ['963', 'سوريا', '🇸🇾', [3, 3, 3]], ['964', 'العراق', '🇮🇶', [3, 3, 4]], ['970', 'فلسطين', '🇵🇸', [3, 3, 3]],
    ['967', 'اليمن', '🇾🇪', [3, 3, 3]], ['249', 'السودان', '🇸🇩', [2, 3, 4]], ['212', 'المغرب', '🇲🇦', [3, 2, 2, 2]],
    ['213', 'الجزائر', '🇩🇿', [3, 2, 2, 2]], ['216', 'تونس', '🇹🇳', [2, 3, 3]], ['218', 'ليبيا', '🇱🇾', [2, 3, 4]],
    ['90', 'تركيا', '🇹🇷', [3, 3, 4]], ['91', 'الهند', '🇮🇳', [5, 5]], ['92', 'باكستان', '🇵🇰', [3, 3, 4]],
    ['880', 'بنغلاديش', '🇧🇩', [4, 6]], ['977', 'نيبال', '🇳🇵', [3, 3, 4]], ['94', 'سريلانكا', '🇱🇰', [2, 3, 4]],
    ['63', 'الفلبين', '🇵🇭', [3, 3, 4]], ['44', 'المملكة المتحدة', '🇬🇧', [4, 6]], ['1', 'أمريكا وكندا', '🇺🇸', [3, 3, 4]]
  ];
  function splitCC(e164) {
    const d = String(e164 || '').replace(/^\+/, '');
    for (const c of CC.slice().sort((a, b) => b[0].length - a[0].length)) if (d.startsWith(c[0])) return { cc: c, rest: d.slice(c[0].length) };
    return { cc: null, rest: d };
  }
  function digits(s) {
    return String(s || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
  }
  // يحوّل أي صيغة إلى +974XXXXXXXX (القيمة المخزّنة) — نفس منطق الخادم
  function normalize(raw, cc) {
    let d = digits(raw).replace(/[^0-9+]/g, '');
    if (d.startsWith('00')) d = '+' + d.slice(2);
    if (d.startsWith('+')) d = '+' + d.slice(1).replace(/\+/g, '');
    else {
      d = d.replace(/\+/g, '').replace(/^0+(?=\d{8})/, '');
      const code = (cc || '974');
      if (d.startsWith(code) && d.length > code.length + 6) d = '+' + d;
      else d = '+' + code + d;
    }
    return /^\+[1-9]\d{6,14}$/.test(d) ? d : null;
  }
  // العرض الموحّد: +974 5555 1234
  function fmt(e164) {
    if (!e164) return '';
    const { cc, rest } = splitCC(e164);
    if (!cc) return '+' + rest.replace(/(\d{3})(?=\d{3,})/g, '$1 ');
    const out = []; let i = 0;
    const groups = cc[3].slice();
    const need = groups.reduce((a, b) => a + b, 0);
    if (rest.length !== need) { return '+' + cc[0] + ' ' + rest.replace(/(\d{4})(?=\d{3,})/g, '$1 '); }
    for (const g of groups) { out.push(rest.slice(i, i + g)); i += g; }
    return '+' + cc[0] + ' ' + out.join(' ');
  }
  function country(e164) { const c = splitCC(e164).cc; return c ? { name: c[1], flag: c[2], code: '+' + c[0] } : null; }

  // ---------- التواريخ: 18/11/2026 · 15:42 بتوقيت الدوحة ----------
  const TZ = 'Asia/Qatar';
  function date(v) {
    if (!v) return '—';
    const d = new Date(v);
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
    return p;
  }
  function dateTime(v) {
    if (!v) return '—';
    const d = new Date(v);
    const t = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
    return date(v) + ' · ' + t;
  }
  function num(n) { return new Intl.NumberFormat('en-US').format(n || 0); }

  // ---------- نصوص التصنيفات ----------
  const KIND = { spam: 'إزعاج وعروض', fraud: 'احتيال', telemarketing: 'تسويق هاتفي', robocall: 'اتصال آلي', harassment: 'مضايقة', other: 'أخرى' };
  const CAT = { personal: 'شخصي', business: 'منشأة تجارية', government: 'جهة حكومية', spam: 'مزعج', fraud: 'احتيال محتمل', telemarketing: 'تسويق هاتفي', robocall: 'اتصال آلي' };
  function level(score) {
    if (score >= 60) return { cls: 'risk', label: 'خطر مرتفع', short: 'مزعج' };
    if (score >= 30) return { cls: 'warn', label: 'يُنصح بالحذر', short: 'مشبوه' };
    return { cls: 'safe', label: 'لا توجد مؤشرات خطر', short: 'آمن' };
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  // توحيد الأسماء: مسافة واحدة، وأول حرف لاتيني كبير
  function cleanName(s) { return String(s || '').replace(/\s+/g, ' ').trim().replace(/\b([a-z])/g, m => m.toUpperCase()); }

  let toastT;
  function toast(msg, err) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.className = 'on' + (err ? ' err' : '');
    clearTimeout(toastT); toastT = setTimeout(() => { t.className = ''; }, 3600);
  }

  const auth = {
    token() { return store.get(TKEY); },
    user() { try { return JSON.parse(store.get(UKEY) || 'null'); } catch (e) { return null; } },
    save(r) { store.set(TKEY, r.token); store.set(UKEY, JSON.stringify(r.user)); },
    async refresh() {
      const t = store.get(TKEY); if (!t) return null;
      try { const u = await rpc('bc_session', { p_token: t }); if (!u) { auth.clear(); return null; } store.set(UKEY, JSON.stringify(u)); return u; }
      catch (e) { return auth.user(); }
    },
    clear() { store.set(TKEY, null); store.set(UKEY, null); },
    async logout() { const t = store.get(TKEY); auth.clear(); if (t) { try { await rpc('bc_logout', { p_token: t }); } catch (e) {} } }
  };

  // ---------- الشريط العلوي والتذييل ----------
  function chrome(active) {
    const u = auth.user();
    const head = document.querySelector('header.bar');
    if (head) {
      head.innerHTML = '<div class="wrap">' +
        '<a class="brand" href="./" aria-label="بصيرة كولر من منجز"><img src="assets/mark.svg" alt="" width="38" height="38"><span><b>بصيرة كولر</b><small>من منجز</small></span></a>' +
        '<button class="menu-btn" aria-label="القائمة" aria-expanded="false">☰</button>' +
        '<nav class="nav" aria-label="التنقل">' +
        '<a href="./#search"' + (active === 'home' ? ' class="on"' : '') + '>البحث عن رقم</a>' +
        '<a href="./#features">المزايا</a>' +
        '<a href="./#android">تطبيق الجوال</a>' +
        '<a href="privacy.html"' + (active === 'privacy' ? ' class="on"' : '') + '>الخصوصية</a>' +
        (u && u.role === 'admin' ? '<a href="admin.html"' + (active === 'admin' ? ' class="on"' : '') + '>لوحة الإدارة</a>' : '') +
        '<a class="acct" href="account.html">' + (u ? 'حسابي' : 'تسجيل الدخول') + '</a>' +
        '</nav></div>';
      const b = head.querySelector('.menu-btn'), n = head.querySelector('.nav');
      b.onclick = () => { n.classList.toggle('open'); b.setAttribute('aria-expanded', n.classList.contains('open')); };
    }
    const foot = document.querySelector('footer.foot');
    if (foot) {
      foot.innerHTML = '<div class="wrap">' +
        '<div><a class="brand" href="./"><img src="assets/mark.svg" alt="" width="34" height="34"><span><b style="color:#fff">بصيرة كولر</b><small style="color:#9C8FD0">من منجز لخدمات الأعمال</small></span></a>' +
        '<p style="margin-top:12px;max-width:360px">اعرف من يتصل بك قبل أن ترد، واحمِ نفسك من الاحتيال والإزعاج بمعرفة يشاركها المجتمع.</p></div>' +
        '<div class="links"><a href="./#search">البحث عن رقم</a><a href="account.html">حسابي</a><a href="privacy.html">الخصوصية والشروط</a><a href="privacy.html#remove">إزالة رقمي</a><a href="../">منجز</a></div>' +
        '<div class="copy">© ' + new Date().getFullYear() + ' منجز لخدمات الأعمال ذ.م.م — جميع الحقوق محفوظة. بصيرة كولر لا يرفع دفتر عناوينك أبداً.</div></div>';
    }
  }

  window.BC = { cfg: CFG, rpc, normalize, fmt, country, date, dateTime, num, KIND, CAT, level, esc, cleanName, toast, auth, chrome, CC };
})();
