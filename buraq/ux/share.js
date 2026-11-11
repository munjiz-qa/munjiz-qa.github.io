// براق · مشاركة خطة التحويل برابط: الرابط يحمل السيارة والسنة وكل الخيارات، ويفتح الخطة نفسها عند أي شخص.
// مستقل تماماً: يقرأ عناصر المخطط من الصفحة ويعيد ضبطها، دون أي خادم.
(()=>{
const $=id=>document.getElementById(id);
const OPTS=["oChem","oP","oSplit","oMot","oCoup","oChg","oClim","oAc","oHeat","oDc","oCurb","oLab"];
const BASE=new URL("./",location.href).href.split("#")[0];
const enc=o=>btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const dec=s=>JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g,"+").replace(/_/g,"/")))));
const optText=sel=>sel&&sel.selectedOptions[0]?sel.selectedOptions[0].textContent:"";

function state(){
  const B=optText($("cvBrand")),M=optText($("cvModel")).split(" · ")[0];
  const s={v:1,b:B,m:M,y:$("cvYear")&&$("cvYear").value,o:{}};
  OPTS.forEach(id=>{const el=$(id);if(el)s.o[id]=el.type==="checkbox"?(el.checked?1:0):el.value;});
  return s;
}
const link=()=>BASE+"#plan="+enc(state());

function summary(){
  const h=$("cvHead")&&$("cvHead").querySelector("h3");
  const k=[...document.querySelectorAll("#cvKpi > div")].slice(0,2).map(d=>d.querySelector("b,strong")?.textContent.trim()||d.textContent.trim().split("\n")[0]).filter(Boolean);
  return `خطة تحويل ${h?h.textContent.trim():"سيارتي"} إلى كهربائية مع براق${k.length?" ("+k.join(" · ")+")":""}`;
}

function apply(s){
  const sb=$("cvBrand"),sm=$("cvModel"),sy=$("cvYear");if(!sb||!sm)return false;
  const bo=[...sb.options].find(o=>o.textContent===s.b);if(!bo)return false;
  sb.value=bo.value;sb.dispatchEvent(new Event("change"));
  const mo=[...sm.options].find(o=>o.textContent.split(" · ")[0]===s.m);if(!mo)return false;
  sm.value=mo.value;sm.dispatchEvent(new Event("change"));
  if(sy&&s.y&&[...sy.options].some(o=>o.value===String(s.y))){sy.value=s.y;sy.dispatchEvent(new Event("change"));}
  for(const id of OPTS){const el=$(id),v=s.o&&s.o[id];if(!el||v==null)continue;
    if(el.type==="checkbox"){if(el.checked!==!!+v){el.checked=!!+v;el.dispatchEvent(new Event("change"));}}
    else if(el.tagName==="SELECT"){if([...el.options].some(o=>o.value===String(v))&&el.value!==String(v)){el.value=v;el.dispatchEvent(new Event("change"));}}
    else if(el.value!==String(v)){el.value=v;el.dispatchEvent(new Event("input"));}}
  return true;
}

let tt;function toast(t){let n=$("bqShareToast");if(!n){n=document.createElement("div");n.id="bqShareToast";n.setAttribute("role","status");n.setAttribute("aria-live","polite");document.body.appendChild(n);}
  n.textContent=t;n.classList.add("show");clearTimeout(tt);tt=setTimeout(()=>n.classList.remove("show"),3200);}
async function copy(t){try{await navigator.clipboard.writeText(t);return true;}catch(e){const a=document.createElement("textarea");a.value=t;a.setAttribute("readonly","");a.style.cssText="position:fixed;opacity:0";document.body.appendChild(a);a.select();let ok=false;try{ok=document.execCommand("copy");}catch(_){}a.remove();return ok;}}

function mount(){
  const acts=$("cvActs");if(!acts||$("cvShare"))return;
  const css=document.createElement("style");css.textContent=`#cvShare{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px;padding-top:10px;border-top:1px dashed var(--line)}
#cvShare>span{font-size:.86rem;color:var(--muted);margin-inline-end:4px}
#cvShare button,#cvShare a{display:inline-flex;align-items:center;gap:6px;text-decoration:none;font:inherit;font-size:.88rem;font-weight:600;padding:8px 14px;min-height:40px;border-radius:9px;border:1.5px solid var(--line);color:var(--ink);background:var(--surface);cursor:pointer}
#cvShare button:hover,#cvShare a:hover{border-color:var(--copper);color:var(--copper)}
#cvShare svg{width:17px;height:17px;flex:none}
#bqShareToast{position:fixed;inset-inline:12px;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:92;max-width:420px;margin:auto;background:var(--ink);color:var(--bg);border-radius:12px;padding:11px 16px;font-size:.92rem;text-align:center;opacity:0;transform:translateY(8px);transition:.2s;pointer-events:none}
#bqShareToast.show{opacity:1;transform:none}
@media print{#cvShare{display:none!important}}`;
  document.head.appendChild(css);
  const d=document.createElement("div");d.id="cvShare";
  d.innerHTML=`<span>شارك هذه الخطة:</span>
<button type="button" data-s="share"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6"/></svg>مشاركة الخطة</button>
<button type="button" data-s="copy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>نسخ الرابط</button>
<a data-s="wa" target="_blank" rel="noopener" href="#"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/></svg>أرسلها عبر واتساب</a>`;
  d.addEventListener("click",async e=>{const b=e.target.closest("[data-s]");if(!b)return;const u=link(),t=summary();
    if(b.dataset.s==="wa"){b.href="https://wa.me/?text="+encodeURIComponent(t+"\n"+u);return;}
    e.preventDefault();
    if(b.dataset.s==="share"&&navigator.share){try{await navigator.share({title:"براق · خطة التحويل",text:t,url:u});return;}catch(err){if(err&&err.name==="AbortError")return;}}
    const ok=await copy(u);
    if(!ok)try{history.replaceState(null,"","#plan="+u.split("#plan=")[1]);}catch(_){}
    toast(ok?"نُسخ رابط الخطة. أرسله لمن تشاء ليفتح الخطة نفسها بكل خياراتها.":"تعذّر النسخ التلقائي. انسخ الرابط من شريط العنوان.");
  });
  // التحديث لحظياً لرابط واتساب قبل الضغط (للنقر الأوسط وفتحه في تبويب)
  d.addEventListener("pointerdown",e=>{const a=e.target.closest('[data-s="wa"]');if(a)a.href="https://wa.me/?text="+encodeURIComponent(summary()+"\n"+link());});
  const host=$("bqAcct")||acts;host.after(d);
}

function fromHash(){
  const m=/^#plan=([A-Za-z0-9_-]+)/.exec(location.hash);if(!m)return;
  let s;try{s=dec(m[1]);}catch(e){return;}
  let n=0;const go=()=>{if(apply(s)){const c=$("cvHead")||$("convert");if(c)setTimeout(()=>{const y=c.getBoundingClientRect().top+scrollY-((document.querySelector("header.top")||{}).offsetHeight||0)-12;scrollTo({top:Math.max(0,y)});},250);toast("فُتحت خطة التحويل المشتركة بكل خياراتها.");}else if(++n<40)setTimeout(go,150);};go();
}

const start=()=>{mount();fromHash();
  // يُعاد التركيب إن أعادت طبقة الحسابات ترتيب الأزرار
  let k=0;const iv=setInterval(()=>{const d=$("cvShare"),a=$("bqAcct");if(d&&a&&d.previousElementSibling!==a)a.after(d);if(++k>20)clearInterval(iv);},250);};
document.readyState==="loading"?addEventListener("DOMContentLoaded",start):start();
addEventListener("hashchange",fromHash);
window.BQSHARE={link,state,apply};
})();
