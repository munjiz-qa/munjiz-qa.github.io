// يبني بيانات بصيرة كولر من المصادر النظامية:
//  1) basira-caller/data/directory-sources.tsv  ← دليل الجهات والمنشآت المنشورة علناً (مع المصدر لكل رقم)
//  2) basira-caller/data/reported-ftc.json       ← بلاغات الإزعاج الرسمية المفتوحة (يولّدها basira-caller-fetch-ftc.cjs)
// والمخرجات: data/directory.json (يقرؤه الموقع) و server/seed-data.sql (يُطبَّق على Supabase بعد schema.sql وseed-schema.sql).
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', 'basira-caller');
const CC = { QA: '974', AE: '971', SA: '966', KW: '965', BH: '973', OM: '968' };

function e164(raw, country) {
  let d = String(raw).trim().replace(/[\s\-()]/g, '');
  if (d.startsWith('00')) d = '+' + d.slice(2);
  if (!d.startsWith('+')) d = '+' + CC[country] + d.replace(/^0+/, '');
  if (!/^\+[1-9]\d{6,14}$/.test(d)) throw new Error('رقم غير صالح: ' + raw);
  return d;
}

const sources = {}, entries = [], seen = new Map();
const lines = fs.readFileSync(path.join(ROOT, 'data', 'directory-sources.tsv'), 'utf8').split('\n');
lines.forEach((ln, i) => {
  if (!ln.trim() || ln.startsWith('#')) return;
  const f = ln.split('\t');
  if (f[0] === '@source') { sources[f[1]] = { title: f[2], url: f[3] }; return; }
  const [num, country, name, cat, src] = f;
  if (!CC[country]) throw new Error('دولة غير معروفة في السطر ' + (i + 1));
  if (!['government', 'business'].includes(cat)) throw new Error('تصنيف غير معروف في السطر ' + (i + 1));
  if (!sources[src]) throw new Error('مصدر غير معرّف في السطر ' + (i + 1) + ': ' + src);
  const e = e164(num, country);
  if (seen.has(e)) throw new Error('رقم مكرر ' + e + ' في السطرين ' + seen.get(e) + ' و' + (i + 1));
  seen.set(e, i + 1);
  entries.push([e, name.replace(/\s+/g, ' ').trim(), cat, src]);
});

let reported = { entries: [], source: null };
const rp = path.join(ROOT, 'data', 'reported-ftc.json');
if (fs.existsSync(rp)) reported = JSON.parse(fs.readFileSync(rp, 'utf8'));
// لا يُعرض رقم من الدليل الرسمي كرقم مزعج حتى لو ورد في البلاغات
const rep = reported.entries.filter(r => !seen.has(r[0]));

const out = {
  generated: new Date().toISOString(),
  note: 'أرقام جهات ومنشآت منشورة علناً لأغراض التواصل، وبلاغات إزعاج رسمية مفتوحة. لا تتضمن أرقام أفراد.',
  sources,
  directory: entries,
  reported: { source: reported.source, window: reported.window, min_complaints: reported.min_complaints, entries: rep }
};
fs.writeFileSync(path.join(ROOT, 'data', 'directory.json'), JSON.stringify(out));

const q = s => s == null ? 'null' : "'" + String(s).replace(/'/g, "''") + "'";
let sql = '-- مولَّد تلقائياً بواسطة scripts/basira-caller-build-data.cjs — لا تعدّله يدوياً.\n-- يُطبَّق بعد schema.sql ثم seed-schema.sql. آمن لإعادة التشغيل.\nbegin;\n';
sql += 'insert into public.bc_numbers (e164, display_name, category, verified, name_source, source_name, source_url, updated_at) values\n' +
  entries.map(([e, n, c, s]) => '(' + [q(e), q(n), q(c), 'true', "'verified'", q(sources[s].title), q(sources[s].url), 'now()'].join(',') + ')').join(',\n') +
  '\non conflict (e164) do update set display_name = excluded.display_name, category = excluded.category, verified = true, name_source = \'verified\',\n' +
  '  source_name = excluded.source_name, source_url = excluded.source_url, updated_at = now() where not public.bc_numbers.hidden;\n';
if (rep.length) {
  sql += 'update public.bc_numbers set official_reports = 0, official_subject = null where official_reports > 0;\n';
  for (let i = 0; i < rep.length; i += 1000) {
    sql += 'insert into public.bc_numbers (e164, category, official_reports, official_subject, official_last, source_name, source_url) values\n' +
      rep.slice(i, i + 1000).map(([e, n, robo, subj, last]) => '(' + [q(e), q(robo >= 50 ? 'robocall' : 'telemarketing'), n, q(subj), q(last), q(reported.source.title), q(reported.source.url)].join(',') + ')').join(',\n') +
      '\non conflict (e164) do update set official_reports = excluded.official_reports, official_subject = excluded.official_subject, official_last = excluded.official_last,\n' +
      '  category = case when public.bc_numbers.verified then public.bc_numbers.category else excluded.category end,\n' +
      '  source_name = coalesce(public.bc_numbers.source_name, excluded.source_name), source_url = coalesce(public.bc_numbers.source_url, excluded.source_url);\n';
  }
}
sql += 'commit;\n';
fs.writeFileSync(path.join(ROOT, 'server', 'seed-data.sql'), sql);
console.log(JSON.stringify({ directory: entries.length, reported: rep.length, byCountry: entries.reduce((m, x) => { const k = Object.keys(CC).find(c => x[0].startsWith('+' + CC[c])); m[k] = (m[k] || 0) + 1; return m; }, {}) }));
