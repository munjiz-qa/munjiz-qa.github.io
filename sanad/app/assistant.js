/* سند | Sanad — المساعد المدمج
   يجيب من بيانات النشاط والحجوزات مباشرة، دون أي اتصال بـ Claude أو بالإنترنت.
   يعمل في الخادم (Node) وفي المتصفح، ويُستخدم تلقائياً عند غياب مفتاح Claude أو تعذّر الوصول إليه. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SanadAssistant = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const AR = '٠١٢٣٤٥٦٧٨٩';
  const norm = s => String(s || '').replace(/[٠-٩]/g, c => AR.indexOf(c)).replace(/[إأآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();
  const has = (t, words) => words.some(w => t.includes(w));
  const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const STATUS = { pending: 'بانتظار التأكيد', confirmed: 'مؤكد', declined: 'معتذر عنه', cancelled: 'ملغى' };

  function lastUserText(messages) {
    for (let i = (messages || []).length - 1; i >= 0; i--) {
      const m = messages[i]; if (m.role !== 'user') continue;
      if (typeof m.content === 'string') return m.content;
      const t = (m.content || []).filter(b => b && b.type === 'text').map(b => b.text).join(' ').trim();
      if (t) return t;
    }
    return '';
  }
  function today(tz) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'Asia/Qatar', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(x => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}`;
  }
  const fmtDate = iso => { try { const [y, m, d] = iso.split('-').map(Number); return new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d, 12))); } catch { return iso; } };

  /* ctx: { role, name, site, portal (للعميل), admin: { pending, today: [...], clients } } */
  function reply(messages, ctx) {
    const raw = lastUserText(messages), t = norm(raw), s = ctx.site || {}, role = ctx.role || 'visitor';
    const biz = s.name || 'سند';
    const svc = (s.services || []).map(x => `• ${x.name}: ${x.duration} دقيقة${x.price ? ` · ${x.price}` : ''}`).join('\n');
    const hours = (s.days && s.days.length) ? `${s.days.map(d => DAYS[d]).join('، ')} من ${s.start || '09:00'} إلى ${s.end || '17:00'}` : '';
    const contact = [s.phone && `الجوال: ${s.phone}`, s.email && `البريد: ${s.email}`, s.city && `المدينة: ${s.city}`].filter(Boolean).join('\n');
    const howBook = role === 'client' ? 'افتح تبويب «احجز»، واختر الخدمة واليوم والوقت المتاح، ثم أرسل الطلب. يصلك التأكيد في تبويب «طلباتي».'
      : role === 'admin' ? 'أضف الموعد من تبويب «المواعيد»، وتجد طلبات العملاء الجديدة في «الموافقات» لتأكيدها أو الاعتذار عنها.'
      : 'سجّل الدخول أو أنشئ حساباً مجانياً من زر «حساب جديد»، ثم احجز من تبويب «احجز» في أقل من دقيقة.';
    const out = [];

    if (has(t, ['سلام', 'مرحب', 'اهلا', 'صباح', 'مساء', 'hello', 'hi '])) out.push(`أهلاً بك${ctx.name ? ' ' + ctx.name : ''}. ${biz.startsWith('سند') ? `أنا ${biz}، مساعدك الذكي` : `أنا سند، مساعد ${biz}`}. كيف أخدمك؟`);
    if (role === 'admin' && has(t, ['ملخص', 'اليوم', 'تقرير', 'وضع', 'summary', 'today'])) {
      const a = ctx.admin || {};
      out.push(`ملخص اليوم (${fmtDate(today())}):\n• مواعيد اليوم: ${(a.today || []).length}${(a.today || []).length ? '\n' + a.today.map(x => `  ${x.time} · ${x.title}${x.client ? ' · ' + x.client : ''}`).join('\n') : ''}\n• طلبات حجز بانتظار قرارك: ${a.pending || 0}\n• العملاء المسجلون: ${a.clients || 0}`);
    }
    if (role === 'client' && has(t, ['طلبي', 'طلباتي', 'حالة', 'حجزي', 'حجوزاتي', 'مواعيدي', 'تاكيد'])) {
      const list = ((ctx.portal && ctx.portal.bookings) || []).filter(b => b.status !== 'cancelled').slice(-5);
      out.push(list.length ? 'طلباتك الأخيرة:\n' + list.map(b => `• ${b.service} · ${fmtDate(b.date)} الساعة ${b.time} · ${STATUS[b.status] || b.status}`).join('\n') : 'لا توجد لديك طلبات حالياً. ' + howBook);
    }
    if (has(t, ['خدم', 'سعر', 'اسعار', 'تكلف', 'كم ', 'باقه', 'باقات', 'تقدم', 'service', 'price'])) out.push(svc ? `خدمات ${biz}:\n${svc}` : 'تُضاف قائمة الخدمات قريباً.');
    if (has(t, ['حجز', 'احجز', 'موعد', 'book'])) out.push(howBook);
    if (has(t, ['دوام', 'ساعات', 'مفتوح', 'متي', 'وقت', 'اوقات', 'تفتح', 'تغلق', 'ايام', 'hours'])) out.push(hours ? `أوقات العمل: ${hours}.` : 'أوقات العمل تظهر في صفحة الحجز.');
    if (has(t, ['تواصل', 'رقم', 'جوال', 'هاتف', 'اتصال', 'بريد', 'ايميل', 'واتس', 'عنوان', 'مكان', 'contact', 'phone', 'email'])) out.push(contact ? `بيانات التواصل:\n${contact}` : 'بيانات التواصل تظهر في الصفحة الرئيسية.');
    if (has(t, ['من انتم', 'من انت', 'عن ', 'نبذه', 'about'])) out.push(s.about || `${biz}${s.tagline ? ': ' + s.tagline : ''}.`);
    if (has(t, ['الغاء', 'الغي', 'cancel'])) out.push(role === 'client' ? 'تستطيع إلغاء أي طلب لم يُؤكَّد بعد من تبويب «طلباتي». للطلبات المؤكدة تواصل معنا مباشرة.' : 'الإلغاء متاح للعميل من تبويب «طلباتي» بعد تسجيل الدخول.');
    if (has(t, ['شكرا', 'شكر', 'thanks'])) out.push('في خدمتك دائماً.');

    if (!out.length) {
      out.push(`أستطيع مساعدتك في:\n• الخدمات والأسعار\n• أوقات العمل\n• طريقة الحجز${role === 'client' ? '\n• حالة طلباتك' : ''}${role === 'admin' ? '\n• ملخص اليوم' : ''}\n• بيانات التواصل\n\nاكتب سؤالك بإحدى هذه الكلمات.${contact ? '\n\n' + contact : ''}`);
    }
    if (role === 'admin' && ctx.note) out.push(ctx.note);
    return out.join('\n\n');
  }
  /* بصيغة رسالة Claude، فيعرضها التطبيق كما يعرض أي رد */
  const asMessage = text => ({ id: 'local-' + Date.now().toString(36), type: 'message', role: 'assistant', model: 'sanad-local', content: [{ type: 'text', text }], stop_reason: 'end_turn' });
  return { reply, asMessage, lastUserText, today };
});
