// «عبدو نيوز»: لوحة «التوقعات: استقراء المستقبل» في الإدارة. ملف مستقل يلتف على KAX (extra.js) فيضيف لوحته ويجمع حقوله،
// حتى يُضاف إلى أي نسخة من لوحة الإدارة (GitHub أو Cloudflare) بسطر واحد بعد extra.js دون تعديله.
(function(){
if(!window.KAX)return;
const $=s=>document.querySelector(s);
const el=(t,c,txt)=>{const e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e};
const getJSON=u=>fetch(u,{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error(u);return r.json()});
const panel=(title,intro)=>{const s=el('section','panel');s.append(el('h2',null,title));if(intro){const p=el('p','mute',intro);p.style.fontSize='.9rem';s.append(p)}return s};
const kpis=list=>{const k=el('div','kpis');list.forEach(([v,l])=>{const d=el('div');d.append(el('b',null,String(v)),el('small',null,l));k.append(d)});return k};
let H=null,FCST=null;
const init0=KAX.init,collect0=KAX.collect;
KAX.init=async ctx=>{
  await init0(ctx);H=ctx;
  FCST=await getJSON('../data/forecast.json').catch(()=>null);
  const anchor=[...document.querySelectorAll('.panel h2')].find(h=>h.textContent.includes('كلمة المرور'));const before=anchor?anchor.parentElement:null;const host=before?before.parentElement:$('#app');
  const p=forecastPanel();if(before)host.insertBefore(p,before);else host.append(p);
  H.preview();
};
KAX.collect=out=>{collect0(out);
  if(document.querySelector('[data-fc]'))out.forecast_hidden=[...document.querySelectorAll('[data-fc]')].filter(c=>!c.checked).map(c=>c.dataset.fc);
  const fd=document.querySelector('#fc-default');if(fd){if(fd.value)out.forecast_default=fd.value;else delete out.forecast_default}
  const fn=document.querySelector('#fc-note-ar');if(fn){const ar=fn.value.trim(),en=(document.querySelector('#fc-note-en')||{}).value||'';if(ar)out.forecast_note={ar,en:en.trim()};else delete out.forecast_note}
};
function forecastPanel(){
  const A=H.admin();const s=panel('التوقعات: استقراء المستقبل','تقديرات احتمالية لـ24 دولة في ستة جوانب، يحسبها المحرك آلياً كل 3 ساعات من مؤشرات صندوق النقد والبنك الدولي وأحداث موثّقة بجهتين، بنموذج معلن في الصفحة. لا يحتاج القسم أي تدخل؛ من هنا تخفي دولة، أو تختار الدولة الافتراضية، أو تضيف ملاحظة تحريرية تظهر فوق كل توقع.');
  if(!FCST){s.append(el('p','mute','لم يُحسب القسم بعد؛ يظهر بعد أول تشغيل للمحرك الآلي.'));return s}
  const C=FCST.countries,age=(Date.now()-new Date(FCST.updated))/3600e3,OL={improve:'تحسّن مرجّح',stable:'استقرار مرجّح',watch:'تحت المراقبة',deteriorate:'تدهور مرجّح'};
  const cnt=k=>Object.values(C).filter(c=>c.outlook===k).length,r=FCST.record||{};
  s.append(kpis([[Object.keys(C).length,'دولة'],[FCST.events_count,'حدثاً موثّقاً في الحساب'],[cnt('deteriorate'),'تدهور مرجّح'],[cnt('watch'),'تحت المراقبة'],[r.resolved?String(r.by?.['7']?.brier??'—'):'—','مؤشر براير (أسبوع)'],[age.toFixed(1),'ساعة منذ آخر حساب']]));
  const tb=el('table');tb.style.cssText='width:100%;border-collapse:collapse;font-size:.88rem';const hr=el('tr');['الدولة','التوقع (شهر)','احتمال التدهور','نطاق الثقة','النمو (صندوق النقد)','التوثيق'].forEach(h=>{const th=el('th',null,h);th.style.cssText='text-align:start;padding:6px;border-bottom:1px solid var(--line,#ddd)';hr.append(th)});tb.append(hr);
  const pc=x=>Math.round(x*100)+'٪';
  Object.entries(C).sort((a,b)=>b[1].p_worse-a[1].p_worse).forEach(([id,c])=>{const tr=el('tr');const g=c.inputs.growth;[c.ar,OL[c.outlook]||c.outlook,pc(c.p_worse),pc(c.ci[0])+'–'+pc(c.ci[1]),g?`${g.v}٪ (${g.year})`:'—',g?(g.grade==='A'?'أ: مؤسستان متطابقتان':g.grade==='A-'?`أ−: فارق ${g.check?.diff}`:'ب'):'—'].forEach((v,i)=>{const td=el('td',null,v);td.style.cssText='padding:6px;border-bottom:1px solid var(--line,#eee)'+(i===1?';color:'+c.color+';font-weight:700':'');tr.append(td)});tb.append(tr)});
  const wrap=el('div');wrap.style.overflowX='auto';wrap.append(tb);s.append(wrap);
  const hid=new Set(A.forecast_hidden||[]);const g=el('div','desk-toggles');
  Object.entries(C).forEach(([id,c])=>{const l=el('label','switch');const x=el('input');x.type='checkbox';x.dataset.fc=id;x.checked=!hid.has(id);x.onchange=()=>H.preview();l.append(x,c.ar);g.append(l)});
  s.append(el('b',null,'الدول الظاهرة للقرّاء:'),g);
  const row=el('div');row.style.cssText='display:grid;gap:6px;margin-top:8px';
  const lb=el('label',null,'الدولة الافتراضية عند فتح القسم:');lb.htmlFor='fc-default';const sel=el('select');sel.id='fc-default';sel.append(el('option',null,'قطر (الافتراضي)'));sel.options[0].value='';
  Object.entries(C).forEach(([id,c])=>{const o=el('option',null,c.ar);o.value=id;sel.append(o)});sel.value=A.forecast_default||'';sel.onchange=()=>H.preview();
  const l2=el('label',null,'ملاحظة تحريرية فوق كل توقع (اختياري، بالعربية ثم بالإنجليزية):');l2.htmlFor='fc-note-ar';
  const ta=el('textarea');ta.id='fc-note-ar';ta.rows=2;ta.value=A.forecast_note?.ar||'';ta.oninput=()=>H.preview();
  const te=el('textarea');te.id='fc-note-en';te.rows=2;te.value=A.forecast_note?.en||'';te.setAttribute('aria-label','English note');te.oninput=()=>H.preview();
  [sel,ta,te].forEach(x=>x.style.cssText='font:inherit;padding:8px;border:1px solid var(--line,#ccc);border-radius:8px;width:100%');
  row.append(lb,sel,l2,ta,te);s.append(row);
  const ck=el('p','mute',`بوابة التحقق: كل حدث من جهتين مستقلتين، وكل رقم بمصدره. سجل الدقة يبدأ من ${r.since?new Date(r.since+'T12:00:00Z').toLocaleDateString('ar-QA',{numberingSystem:'latn',day:'numeric',month:'long',year:'numeric'}):'—'} (${r.pending||0} توقعاً قيد الحسم).`);ck.style.fontSize='.85rem';s.append(ck);
  const a=el('a',null,'افتح القسم كما يراه القرّاء');a.href='../forecast/';a.target='_blank';a.rel='noopener';s.append(a);return s;
}
})();
