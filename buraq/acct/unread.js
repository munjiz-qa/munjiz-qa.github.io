// براق · الرسائل غير المقروءة: يتابع آخر رسالة في كل طلب، ويُعلِم العميل برد فريق براق، والمدير برسالة العميل.
// حالة «قُرئت» تُحفظ في المتصفح لكل حساب، ولا يتطلب أي تعديل في قواعد Firebase.
const ms = (v) => (v ? (v.toMillis ? v.toMillis() : v.seconds ? v.seconds * 1000 : +new Date(v)) : Date.now());

export function createUnread({ db, F, uid, side, max = 80, onChange }) {
  const KEY = `bq.seen.${side}.${uid}`;
  let seen = {}; try { seen = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}
  const last = {}, subs = {}; let openId = null;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(seen)); } catch (e) {} };
  const fromOther = (m) => (side === "admin" ? m.fromAdmin !== true : m.fromAdmin === true);
  // المدير: الطلب «بانتظار ردك» ما دامت آخر رسالة من العميل. العميل: رد جديد من براق لم يفتحه بعد.
  const isUnread = (id) => { const m = last[id]; if (!m || !fromOther(m)) return false; return side === "admin" ? true : ms(m.at) > (seen[id] || 0) && id !== openId; };
  let initial = true;
  const emit = () => onChange && onChange(api);
  const api = {
    isUnread,
    count: () => Object.keys(last).filter(isUnread).length,
    ids: () => Object.keys(last).filter(isUnread),
    lastOf: (id) => last[id] || null,
    markSeen(id) { const m = last[id]; seen[id] = Math.max(Date.now(), m ? ms(m.at) : 0); save(); emit(); },
    setOpen(id) { openId = id; if (id) api.markSeen(id); else emit(); },
    sync(reqs) {
      const want = new Set(reqs.slice(0, max).map((r) => r.id));
      for (const id of Object.keys(subs)) if (!want.has(id)) { subs[id](); delete subs[id]; delete last[id]; }
      for (const id of want) if (!subs[id]) {
        // أول تشغيل على هذا الجهاز: لا نُغرق المستخدم بإشعارات قديمة، فنعدّ ما سبق مقروءاً
        const fresh = initial && !(id in seen);
        subs[id] = F.onSnapshot(F.query(F.collection(db, "requests", id, "msgs"), F.orderBy("at", "desc"), F.limit(1)), (s) => {
          const m = s.empty ? null : s.docs[0].data();
          if (m) last[id] = m; else delete last[id];
          if (fresh && !(id in seen)) { seen[id] = m ? ms(m.at) : Date.now(); save(); }
          if (id === openId && m) { seen[id] = Math.max(Date.now(), ms(m.at)); save(); }
          emit();
        }, () => {});
      }
      initial = false; emit();
    },
    stop() { Object.values(subs).forEach((u) => u()); for (const k in subs) delete subs[k]; },
  };
  return api;
}

// شارة العنوان: (2) براق · …
export function titleBadge(n) {
  const t = document.title.replace(/^\(\d+\)\s*/, "");
  document.title = n ? `(${n}) ${t}` : t;
}
