// تهيئة Firebase من نسخة مكتبات Google الرسمية 10.14.1 المحفوظة داخل الموقع (vendor/) فلا يعتمد على أي خادم خارجي غير Firebase نفسه.
import { initializeApp, deleteApp } from "./vendor/firebase-app.js";
import * as A from "./vendor/firebase-auth.js";
import * as F from "./vendor/firebase-firestore.js";
import { FIREBASE, FOUNDER_EMAIL } from "./config.js";

const local = ["localhost", "127.0.0.1"].includes(location.hostname);
// وضع الاختبار المحلي فقط (محاكي Firebase)، ولا يعمل أبداً على الموقع المنشور
if (local && new URLSearchParams(location.search).has("emu")) try { sessionStorage.setItem("bq_emu", "1"); } catch (e) {}
export const EMU = local && (() => { try { return sessionStorage.getItem("bq_emu") === "1"; } catch (e) { return false; } })();
const cfg = EMU ? { apiKey: "demo-key", authDomain: "demo-buraq.firebaseapp.com", projectId: "demo-buraq" } : FIREBASE;
export const READY = !!(cfg && cfg.apiKey && cfg.projectId);

export let app = null, auth = null, db = null;
if (READY) {
  app = initializeApp(cfg);
  auth = A.getAuth(app);
  db = F.getFirestore(app);
  if (EMU) {
    A.connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    F.connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }
  auth.languageCode = "ar";
}
export { A, F, FOUNDER_EMAIL };

// إنشاء حساب من لوحة المدير دون تسجيل خروج المدير: نستخدم نسخة ثانية مؤقتة من التطبيق
export async function createUserAsAdmin(email, password) {
  const sec = initializeApp(cfg, "sec-" + Date.now());
  const sa = A.getAuth(sec);
  if (EMU) A.connectAuthEmulator(sa, "http://127.0.0.1:9099", { disableWarnings: true });
  try {
    const c = await A.createUserWithEmailAndPassword(sa, email, password);
    return c.user.uid;
  } finally {
    await A.signOut(sa).catch(() => {});
    await deleteApp(sec).catch(() => {});
  }
}

// ملف المستخدم في Firestore، ويُنشأ تلقائياً عند أول دخول إن لم يكن موجوداً
export async function loadProfile(user, extra = {}) {
  const ref = F.doc(db, "users", user.uid);
  let s = await F.getDoc(ref);
  if (!s.exists()) {
    const now = F.serverTimestamp();
    await F.setDoc(ref, {
      name: (extra.name || user.displayName || user.email.split("@")[0]).slice(0, 80),
      email: user.email, phone: extra.phone || "", company: extra.company || "", city: extra.city || "",
      role: user.email === FOUNDER_EMAIL ? "admin" : "customer", disabled: false, createdAt: now, updatedAt: now
    });
    s = await F.getDoc(ref);
  }
  return { id: user.uid, ...s.data() };
}
