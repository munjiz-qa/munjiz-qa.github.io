// يشفّر سجل المنصات لـ«قُطب» ويكتب qutb/vault.json (الصيغة 2: مفتاح بيانات عشوائي، وخانة لكل مستخدم تغلّفه بكلمة مروره).
// الاستخدام: QUTB_USERS='[{"u":"owner","p":"..."},{"u":"superadmin","p":"..."}]' node qutb/tools/seal.mjs registry.json
// السجل الصريح لا يُرفع إلى المستودع أبداً، وكلمات المرور لا تُكتب في أي ملف. الأدوار والأسماء في registry.json تحت users.
import {readFileSync, writeFileSync} from 'node:fs';
import {webcrypto as crypto, createHash} from 'node:crypto';

const ITER = 310000;
const users = JSON.parse(process.env.QUTB_USERS || '[]'), src = process.argv[2];
if (!src || !users.length || users.some(x => !x.u || !x.p || x.p.length < 12)) { console.error('QUTB_USERS (each password 12+ chars) and a registry path are required'); process.exit(1); }

const reg = JSON.parse(readFileSync(src, 'utf8'));
const b64 = u => Buffer.from(u).toString('base64');
const rnd = n => crypto.getRandomValues(new Uint8Array(n));
const kek = async (pass, salt) => crypto.subtle.deriveKey({name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER},
  await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']), {name: 'AES-GCM', length: 256}, false, ['encrypt']);
const dk = rnd(32), dkKey = await crypto.subtle.importKey('raw', dk, 'AES-GCM', false, ['encrypt']);
const slots = [];
for (const {u, p} of users) {
  const salt = rnd(16), iv = rnd(12);
  const wk = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, await kek(p, salt), dk);
  slots.push({id: createHash('sha256').update('qutb-user:' + u.trim().toLowerCase()).digest('hex'), iter: ITER, salt: b64(salt), iv: b64(iv), wk: b64(new Uint8Array(wk))});
}
const iv = rnd(12), ct = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, dkKey, new TextEncoder().encode(JSON.stringify(reg)));
const out = new URL('../vault.json', import.meta.url);
writeFileSync(out, JSON.stringify({v: 2, kdf: 'PBKDF2-SHA256', iter: ITER, cipher: 'AES-GCM', slots, iv: b64(iv), ct: b64(new Uint8Array(ct))}) + '\n');
console.log('sealed', reg.platforms.length, 'platforms for', slots.length, 'users ->', out.pathname);
