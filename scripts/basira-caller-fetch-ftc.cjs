// يجلب بلاغات «لا تتصل» اليومية التي تنشرها لجنة التجارة الفيدرالية الأمريكية (FTC) كبيانات حكومية مفتوحة،
// ويجمعها حسب الرقم، ويحتفظ فقط بالأرقام التي تكررت شكواها (5 بلاغات فأكثر من ولايتين مختلفتين على الأقل)
// لتقليل أثر الأرقام المنتحَلة. الناتج: basira-caller/data/reported-ftc.json
// التشغيل: node scripts/basira-caller-fetch-ftc.cjs [أيام=30]
const fs = require('fs'), path = require('path');
const DAYS = +process.argv[2] || 30, MIN = 5, MIN_STATES = 2;
const SUBJ = [
  [/pretending to be|impostor|imposter/i, 'انتحال صفة جهة أو شخص'],
  [/debt|credit card|loan/i, 'عروض ديون وقروض'],
  [/warrant|protection plan/i, 'ضمانات وخطط حماية'],
  [/medical|prescription|health/i, 'عروض طبية وتأمين صحي'],
  [/energy|solar|utilit/i, 'عروض طاقة وخدمات'],
  [/computer|technical support/i, 'دعم فني وهمي'],
  [/vacation|timeshare|travel/i, 'عروض سفر ومنتجعات'],
  [/lotter|prize|sweepstake/i, 'جوائز ويانصيب'],
  [/home security|alarm/i, 'أنظمة أمن منزلية'],
  [/home improvement|cleaning/i, 'تحسينات منزلية'],
  [/dropped call|no message/i, 'مكالمة صامتة أو مقطوعة'],
];
const subj = s => (SUBJ.find(([r]) => r.test(s)) || [null, 'أخرى'])[1];

function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

(async () => {
  const agg = new Map(); let files = 0, complaints = 0, from = null, to = null;
  for (let d = 1; d <= DAYS; d++) {
    const day = new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
    const url = 'https://www.ftc.gov/sites/default/files/DNC_Complaint_Numbers_' + day + '.csv';
    let res; try { res = await fetch(url, { headers: { 'User-Agent': 'basira-caller-data/1.0' } }); } catch (e) { continue; }
    if (!res.ok) continue;
    const rows = parseCSV(await res.text()); const h = rows.shift() || [];
    const ix = n => h.indexOf(n);
    const P = ix('Company_Phone_Number'), S = ix('Subject'), R = ix('Recorded_Message_Or_Robocall'), ST = ix('Consumer_State'), C = ix('Created_Date');
    if (P < 0) continue;
    files++; from = day; to = to || day;
    for (const r of rows) {
      const digits = String(r[P] || '').replace(/\D/g, '');
      if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) continue; // رقم أمريكي/كندي صالح من 10 خانات
      const e = '+1' + digits; complaints++;
      const a = agg.get(e) || { n: 0, robo: 0, states: new Set(), subj: {}, last: '' };
      a.n++; if (r[R] === 'Y') a.robo++; if (r[ST]) a.states.add(r[ST]);
      const s = subj(r[S] || ''); a.subj[s] = (a.subj[s] || 0) + 1;
      const c = String(r[C] || '').slice(0, 10); if (c > a.last) a.last = c;
      agg.set(e, a);
    }
  }
  if (!files) { console.error('لم يُجلب أي ملف من FTC'); process.exit(1); }
  const entries = [...agg].filter(([, a]) => a.n >= MIN && a.states.size >= MIN_STATES)
    .map(([e, a]) => [e, a.n, Math.round(100 * a.robo / a.n), Object.entries(a.subj).sort((x, y) => y[1] - x[1])[0][0], a.last])
    .sort((x, y) => y[1] - x[1]);
  const out = {
    source: { title: 'لجنة التجارة الفيدرالية الأمريكية (FTC): بلاغات «لا تتصل» المفتوحة', url: 'https://www.ftc.gov/policy-notices/open-government/data-sets/do-not-call-data' },
    window: { from, to, files }, min_complaints: MIN, min_states: MIN_STATES, complaints, entries
  };
  fs.writeFileSync(path.join(__dirname, '..', 'basira-caller', 'data', 'reported-ftc.json'), JSON.stringify(out));
  console.log(JSON.stringify({ files, complaints, numbers: agg.size, kept: entries.length }));
})();
