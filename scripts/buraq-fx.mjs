// براق · تحديث أسعار الصرف الاحتياطية يومياً (دولار ← ريال قطري وجنيه مصري) في buraq/data/fx.json.
// يستعمله الموقع كسعر احتياطي أحدث حين يتعذر على متصفح الزائر الاتصال بمصدر الصرف. لا يغيّر الملف إن فشل المصدر أو جاءت أرقام غير منطقية.
import { readFileSync, writeFileSync } from "node:fs";
const FILE = "buraq/data/fx.json";
const p2 = (n) => String(n).padStart(2, "0");
const dmy = (d) => `${p2(d.getUTCDate())}/${p2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
try {
  const r = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(20000) });
  const d = await r.json();
  const q = +d.rates?.QAR, e = +d.rates?.EGP;
  if (d.result !== "success" || !(q > 3 && q < 4.5 && e > 10 && e < 500)) throw new Error("أرقام غير منطقية: " + JSON.stringify([q, e]));
  const next = { QAR: +q.toFixed(4), EGP: +e.toFixed(4), date: dmy(d.time_last_update_unix ? new Date(d.time_last_update_unix * 1000) : new Date()), src: "ExchangeRate-API" };
  let prev = {}; try { prev = JSON.parse(readFileSync(FILE, "utf8")); } catch {}
  if (prev.QAR === next.QAR && prev.EGP === next.EGP) { console.log("لا تغيير:", JSON.stringify(next)); process.exit(0); }
  writeFileSync(FILE, JSON.stringify(next) + "\n"); console.log("حُدّث:", JSON.stringify(next));
} catch (err) { console.log("::warning::تعذّر تحديث أسعار الصرف، بقي الملف كما هو: " + err.message); }
