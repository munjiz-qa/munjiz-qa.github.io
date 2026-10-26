// يشفّر سجل المنصات لـ«قُطب» بكلمة مرور المدير ويكتب qutb/vault.json
// الاستخدام: QUTB_PASS='...' node qutb/tools/seal.mjs registry.json
// السجل الصريح لا يُرفع إلى المستودع أبداً، وكلمة المرور لا تُكتب في أي ملف.
import {readFileSync, writeFileSync} from 'node:fs';
import {webcrypto as crypto} from 'node:crypto';

const ITER = 310000;
const pass = process.env.QUTB_PASS, src = process.argv[2];
if (!pass || pass.length < 12 || !src) { console.error('QUTB_PASS (12+ chars) and a registry path are required'); process.exit(1); }

const reg = JSON.parse(readFileSync(src, 'utf8'));
const b64 = u => Buffer.from(u).toString('base64');
const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER}, base, {name: 'AES-GCM', length: 256}, false, ['encrypt']);
const ct = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, new TextEncoder().encode(JSON.stringify(reg)));
const out = new URL('../vault.json', import.meta.url);
writeFileSync(out, JSON.stringify({v: 1, kdf: 'PBKDF2-SHA256', iter: ITER, salt: b64(salt), iv: b64(iv), ct: b64(new Uint8Array(ct))}) + '\n');
console.log('sealed', reg.platforms.length, 'platforms ->', out.pathname);
