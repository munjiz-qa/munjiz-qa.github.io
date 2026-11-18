// بصيرة كولر — خادم محلي احتياطي يعمل داخل المتصفح عندما لا يكون الخادم المركزي مضبوطاً في config.js.
// يطابق دوال الخادم نفسها (bc_*)، والبيانات تُحفظ في متصفح كل جهاز فقط.
(function () {
  const K = 'bc.local.db';
  const now = () => new Date().toISOString();
  const load = () => { try { return JSON.parse(localStorage.getItem(K)) || null; } catch (e) { return null; } };
  let db = load() || { users: [], sessions: {}, numbers: {}, names: [], reports: [], ratings: [], requests: [], audit: [], seq: 1 };
  const save = () => { try { localStorage.setItem(K, JSON.stringify(db)); } catch (e) {} };
  const fail = c => { const e = new Error(c); e.code = c; throw e; };
  async function hash(p) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('bc:' + p)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); }
  const tok = () => Array.from(crypto.getRandomValues(new Uint8Array(24))).map(x => x.toString(16).padStart(2, '0')).join('');
  const norm = p => BC.normalize(p, '974');
  const me = t => { const id = db.sessions[t]; const u = db.users.find(x => x.id === id); return u && u.status === 'active' ? u : null; };
  const need = (t, admin) => { const u = me(t); if (!u) fail('AUTH_REQUIRED'); if (admin && u.role !== 'admin') fail('ADMIN_ONLY'); return u; };
  const pub = u => ({ id: u.id, name: u.full_name, email: u.email, phone: u.phone, role: u.role, created_at: u.created_at });
  const ensure = e => db.numbers[e] || (db.numbers[e] = { e164: e, display_name: null, category: 'personal', verified: false, hidden: false, lookups: 0, created_at: now(), updated_at: now() });
  const live = r => r.status !== 'dismissed';
  const score = e => Math.max(0, Math.min(100,
    db.reports.filter(r => r.e164 === e && live(r) && r.kind !== 'other').reduce((a, r) => a + (r.status === 'confirmed' ? 30 : 18), 0) +
    db.ratings.filter(r => r.e164 === e).reduce((a, r) => a + (r.value === -1 ? 12 : -15), 0)));
  const count = (arr, f) => { const m = {}; arr.forEach(x => { const k = f(x); m[k] = (m[k] || 0) + 1; }); return m; };
  // أسماء جهات الاتصال المشتركة لا تظهر إلا إذا اتفق عليها مستخدمان مستقلان؛ الأسماء اليدوية تظهر دائماً
  function publicNames(e) {
    const rows = db.names.filter(x => x.e164 === e), out = {};
    rows.forEach(x => { const k = x.name; if (rows.some(y => y.name === k && y.origin !== 'contacts') || new Set(rows.filter(y => y.name === k && y.origin === 'contacts').map(y => y.user_id)).size >= 2) out[k] = (out[k] || 0) + 1; });
    return out;
  }
  function touch(e) {
    const n = db.numbers[e]; if (!n) return;
    const names = publicNames(e);
    const top = Object.entries(names).sort((a, b) => b[1] - a[1])[0];
    if (!n.verified && top) n.display_name = top[0];
    const rs = db.reports.filter(r => r.e164 === e && live(r) && r.kind !== 'other');
    if (!n.verified && rs.length >= 3) n.category = Object.entries(count(rs, r => r.kind)).sort((a, b) => b[1] - a[1])[0][0];
    n.updated_at = now();
  }
  function card(e) {
    const n = db.numbers[e]; if (!n || n.hidden) return null;
    const rs = db.reports.filter(r => r.e164 === e && live(r));
    return { e164: e, name: n.display_name, category: n.category, verified: n.verified, lookups: n.lookups, spam_score: score(e), updated_at: n.updated_at,
      reports: rs.length, safe_votes: db.ratings.filter(r => r.e164 === e && r.value === 1).length, spam_votes: db.ratings.filter(r => r.e164 === e && r.value === -1).length,
      kinds: count(rs, r => r.kind), comments: rs.filter(r => r.comment).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5).map(r => ({ kind: r.kind, comment: r.comment, at: r.created_at })),
      alt_names: Object.entries(publicNames(e)).sort((a, b) => b[1] - a[1]).slice(0, 4).map(x => x[0]) };
  }
  const protectedNum = e => db.numbers[e] && db.numbers[e].hidden;
  const stats = () => ({ numbers: Object.values(db.numbers).filter(n => !n.hidden).length, reports: db.reports.filter(live).length, users: db.users.length, lookups: Object.values(db.numbers).reduce((a, n) => a + n.lookups, 0) });
  const like = (s, q) => String(s || '').toLowerCase().includes(String(q).toLowerCase());
  const digitsOf = q => String(q).replace(/[^0-9]/g, '');

  const F = {
    async bc_register(a) {
      if ((a.p_password || '').length < 8) fail('WEAK_PASSWORD');
      const em = String(a.p_email).trim().toLowerCase();
      if (db.users.some(u => u.email === em)) fail('EMAIL_TAKEN');
      const u = { id: tok().slice(0, 32), full_name: a.p_name.trim(), email: em, phone: a.p_phone ? norm(a.p_phone) : null, pass: await hash(a.p_password), role: 'user', status: 'active', created_at: now(), last_login: now() };
      db.users.push(u); const t = tok(); db.sessions[t] = u.id; save(); return { token: t, user: pub(u) };
    },
    async bc_login(a) {
      const u = db.users.find(x => x.email === String(a.p_email).trim().toLowerCase());
      if (!u || u.pass !== await hash(a.p_password)) fail('BAD_LOGIN'); if (u.status !== 'active') fail('SUSPENDED');
      const t = tok(); db.sessions[t] = u.id; u.last_login = now(); save(); return { token: t, user: pub(u) };
    },
    bc_logout(a) { delete db.sessions[a.p_token]; save(); return null; },
    bc_session(a) { const u = me(a.p_token); return u ? pub(u) : null; },
    bc_lookup(a) { const e = norm(a.p_number); if (!e) fail('BAD_NUMBER'); const n = db.numbers[e]; if (n && !n.hidden && a.p_count !== false) { n.lookups++; save(); } return card(e) || { e164: e, name: null, unknown: true, spam_score: 0, reports: 0 }; },
    bc_suggest_name(a) {
      const u = need(a.p_token); const e = norm(a.p_number); if (!e) fail('BAD_NUMBER'); const nm = String(a.p_name || '').replace(/\s+/g, ' ').trim();
      if (nm.length < 2 || nm.length > 60) fail('BAD_NAME'); if (protectedNum(e)) fail('NUMBER_PROTECTED');
      ensure(e); db.names = db.names.filter(x => !(x.e164 === e && x.user_id === u.id)); db.names.push({ e164: e, name: nm, user_id: u.id, created_at: now() }); touch(e); save(); return card(e);
    },
    bc_report(a) {
      const u = need(a.p_token); const e = norm(a.p_number); if (!e) fail('BAD_NUMBER'); if (protectedNum(e)) fail('NUMBER_PROTECTED'); ensure(e);
      const ex = db.reports.find(r => r.e164 === e && r.user_id === u.id && live(r));
      if (ex) Object.assign(ex, { kind: a.p_kind, comment: a.p_comment || null, created_at: now() });
      else db.reports.push({ id: db.seq++, e164: e, kind: a.p_kind, comment: a.p_comment || null, user_id: u.id, status: 'open', created_at: now() });
      touch(e); save(); return card(e);
    },
    bc_rate(a) {
      const u = need(a.p_token); const e = norm(a.p_number); if (!e) fail('BAD_NUMBER'); ensure(e);
      db.ratings = db.ratings.filter(r => !(r.e164 === e && r.user_id === u.id)); if (a.p_value) db.ratings.push({ e164: e, user_id: u.id, value: Math.sign(a.p_value), created_at: now() }); save(); return card(e);
    },
    bc_my_activity(a) {
      const u = need(a.p_token); const by = (x, y) => y.created_at.localeCompare(x.created_at);
      return { names: db.names.filter(x => x.user_id === u.id).sort(by).map(x => ({ e164: x.e164, name: x.name, at: x.created_at })),
        reports: db.reports.filter(x => x.user_id === u.id).sort(by).map(x => ({ e164: x.e164, kind: x.kind, comment: x.comment, status: x.status, at: x.created_at })),
        ratings: db.ratings.filter(x => x.user_id === u.id).sort(by).map(x => ({ e164: x.e164, value: x.value, at: x.created_at })) };
    },
    bc_request(a) { const e = norm(a.p_number); if (!e) fail('BAD_NUMBER'); if (String(a.p_contact || '').trim().length < 5) fail('BAD_CONTACT'); const r = { id: db.seq++, e164: e, kind: a.p_kind, contact: a.p_contact.trim(), details: a.p_details || null, status: 'open', created_at: now() }; db.requests.push(r); save(); return { id: r.id, e164: e }; },
    bc_stats: stats,
    bc_share_contacts(a) {
      const u = need(a.p_token); if (a.p_consent !== true) fail('CONSENT_REQUIRED');
      const items = Array.isArray(a.p_items) ? a.p_items : []; if (items.length > 500) fail('TOO_MANY');
      let added = 0, skipped = 0; u.contacts_consent_at = u.contacts_consent_at || now();
      items.forEach(it => {
        const e = norm(it.phone); const nm = String(it.name || '').replace(/\s+/g, ' ').trim(); const n = e && db.numbers[e];
        if (!e || nm.length < 2 || nm.length > 60 || e === u.phone || (n && (n.hidden || n.verified)) || (BC.directory && BC.directory.listed(e)) || db.names.some(x => x.e164 === e && x.user_id === u.id)) { skipped++; return; }
        ensure(e); db.names.push({ e164: e, name: nm, user_id: u.id, origin: 'contacts', created_at: now() }); touch(e); added++;
      });
      db.audit.push({ action: 'مشاركة جهات اتصال', target: String(added), actor: u.full_name, created_at: now() }); save();
      return { added, skipped, total: db.names.filter(x => x.user_id === u.id && x.origin === 'contacts').length };
    },
    bc_withdraw_contacts(a) {
      const u = need(a.p_token); const mine = db.names.filter(x => x.user_id === u.id && x.origin === 'contacts');
      db.names = db.names.filter(x => !(x.user_id === u.id && x.origin === 'contacts'));
      new Set(mine.map(x => x.e164)).forEach(e => { const n = db.numbers[e]; if (n && !n.verified) { n.display_name = null; touch(e); } });
      u.contacts_consent_at = null; db.audit.push({ action: 'سحب موافقة جهات الاتصال', target: String(mine.length), actor: u.full_name, created_at: now() }); save();
      return { removed: mine.length };
    },
    bc_contacts_status(a) { const u = need(a.p_token); return { consent_at: u.contacts_consent_at || null, shared: db.names.filter(x => x.user_id === u.id && x.origin === 'contacts').length }; },
    bc_admin_overview(a) {
      need(a.p_token, true); const nums = Object.values(db.numbers);
      return { stats: Object.assign(stats(), { open_reports: db.reports.filter(r => r.status === 'open').length, open_requests: db.requests.filter(r => r.status === 'open').length, spam_numbers: nums.filter(n => score(n.e164) >= 40).length, new_users_7d: db.users.filter(u => Date.now() - new Date(u.created_at) < 7 * 864e5).length }),
        top: nums.map(n => ({ e164: n.e164, name: n.display_name, category: n.category, lookups: n.lookups, score: score(n.e164) })).sort((x, y) => y.score - x.score || y.lookups - x.lookups).slice(0, 10) };
    },
    bc_admin_list(a) {
      need(a.p_token, true); const q = (a.p_q || '').trim(); const by = (x, y) => (y.updated_at || y.created_at).localeCompare(x.updated_at || x.created_at);
      if (a.p_what === 'numbers') return Object.values(db.numbers).filter(n => !q || (digitsOf(q) && n.e164.includes(digitsOf(q))) || like(n.display_name, q)).sort(by).map(n => ({ e164: n.e164, name: n.display_name, category: n.category, verified: n.verified, hidden: n.hidden, lookups: n.lookups, score: score(n.e164), reports: db.reports.filter(r => r.e164 === n.e164 && live(r)).length, updated_at: n.updated_at }));
      if (a.p_what === 'reports') return db.reports.filter(r => !q || r.e164.includes(digitsOf(q))).sort((x, y) => (y.status === 'open') - (x.status === 'open') || y.created_at.localeCompare(x.created_at)).map(r => Object.assign({}, r, { reporter: (db.users.find(u => u.id === r.user_id) || {}).full_name }));
      if (a.p_what === 'users') return db.users.filter(u => !q || like(u.full_name, q) || like(u.email, q)).map(u => ({ id: u.id, name: u.full_name, email: u.email, phone: u.phone, role: u.role, status: u.status, created_at: u.created_at, last_login: u.last_login, reports: db.reports.filter(r => r.user_id === u.id).length, names: db.names.filter(r => r.user_id === u.id).length })).reverse();
      if (a.p_what === 'requests') return db.requests.slice().sort((x, y) => (y.status === 'open') - (x.status === 'open') || y.created_at.localeCompare(x.created_at));
      if (a.p_what === 'audit') return db.audit.slice().reverse();
      fail('BAD_LIST');
    },
    bc_admin_number(a) {
      const u = need(a.p_token, true); const e = norm(a.p_number); if (!e) fail('BAD_NUMBER'); const n = ensure(e);
      Object.assign(n, { display_name: a.p_name || null, category: a.p_category || n.category, verified: !!a.p_verified, hidden: !!a.p_hidden, updated_at: now() });
      db.audit.push({ action: 'تعديل رقم', target: e, actor: u.full_name, created_at: now() }); save(); return { ok: true, e164: e };
    },
    bc_admin_delete_number(a) {
      const u = need(a.p_token, true); const e = norm(a.p_number); delete db.numbers[e];
      ['names', 'reports', 'ratings'].forEach(k => db[k] = db[k].filter(x => x.e164 !== e));
      db.audit.push({ action: 'حذف رقم', target: e, actor: u.full_name, created_at: now() }); save(); return { ok: true };
    },
    bc_admin_report(a) {
      const u = need(a.p_token, true); const r = db.reports.find(x => x.id === a.p_id); if (r) { r.status = a.p_status; touch(r.e164); }
      db.audit.push({ action: a.p_status === 'confirmed' ? 'تأكيد بلاغ' : a.p_status === 'dismissed' ? 'رفض بلاغ' : 'إعادة فتح بلاغ', target: r && r.e164, actor: u.full_name, created_at: now() }); save(); return { ok: true };
    },
    bc_admin_user(a) {
      const u = need(a.p_token, true); if (a.p_id === u.id && (a.p_role === 'user' || a.p_status === 'suspended')) fail('SELF_LOCK');
      const t = db.users.find(x => x.id === a.p_id); if (t) { if (a.p_role) t.role = a.p_role; if (a.p_status) t.status = a.p_status; }
      db.audit.push({ action: 'تعديل مستخدم', target: t && t.email, actor: u.full_name, created_at: now() }); save(); return { ok: true };
    },
    bc_admin_request(a) {
      const u = need(a.p_token, true); const r = db.requests.find(x => x.id === a.p_id); if (!r) return { ok: false };
      r.status = a.p_status; if (a.p_status === 'done' && r.kind === 'remove') { const n = ensure(r.e164); n.hidden = true; n.display_name = null; }
      db.audit.push({ action: 'معالجة طلب', target: r.e164, actor: u.full_name, created_at: now() }); save(); return { ok: true };
    }
  };

  window.BC_LOCAL = async function (fn, args) {
    if (!F[fn]) fail('BAD_LIST');
    await new Promise(r => setTimeout(r, 120));
    db = load() || db;
    if (!db.users.some(u => u.role === 'admin')) { db.users.push({ id: 'admin-local', full_name: 'مدير المنصة', email: 'admin@basira.local', phone: null, pass: await hash('Basira-2026'), role: 'admin', status: 'active', created_at: now(), last_login: null }); save(); }
    return JSON.parse(JSON.stringify(await F[fn](args || {}) ?? null));
  };
})();
