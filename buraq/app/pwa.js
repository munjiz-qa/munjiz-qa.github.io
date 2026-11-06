// براق · التطبيق: تسجيل عامل الخدمة، زر «ثبّت تطبيق براق»، وتنبيه انقطاع الاتصال. مستقل تماماً.
(()=>{
const sa=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
if("serviceWorker" in navigator&&(location.protocol==="https:"||location.hostname==="localhost"))
  addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));

const css=document.createElement("style");
css.textContent=`.bq-inst{display:inline-flex;align-items:center;gap:6px;font:inherit;font-weight:600;cursor:pointer;border-radius:10px}
.bq-inst svg{width:18px;height:18px;flex:none}
.foot-links .bq-inst{background:none;border:1.5px solid var(--copper,#A9572A);color:var(--copper,#A9572A);padding:6px 12px;font-size:.9rem;min-height:40px}
.drawer .d-acts .bq-inst{grid-column:1/-1;justify-content:center;background:var(--ink,#14202A);color:var(--bg,#fff);border:0;padding:12px;min-height:46px}
#bqNet{position:fixed;inset-inline:12px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:90;max-width:460px;margin:auto;background:#14202A;color:#F8FAFA;border-radius:12px;padding:12px 16px;font-size:.92rem;line-height:1.6;box-shadow:0 8px 28px rgba(0,0,0,.28);display:none}
#bqNet.show{display:block}#bqNet b{color:#F0A877}
#bqIos{position:fixed;inset:0;z-index:95;background:rgba(10,16,20,.55);display:none;align-items:flex-end;justify-content:center;padding:16px}
#bqIos.show{display:flex}#bqIos .card{background:var(--surface,#F8FAFA);color:var(--ink,#14202A);border-radius:16px;padding:20px;max-width:420px;width:100%;line-height:1.8}
#bqIos ol{margin:8px 0 14px;padding-inline-start:22px}#bqIos button{font:inherit;font-weight:600;width:100%;min-height:46px;border-radius:10px;border:0;background:var(--copper,#A9572A);color:#fff;cursor:pointer}`;
document.head.appendChild(css);

// تنبيه الاتصال
const net=document.createElement("div");net.id="bqNet";net.setAttribute("role","status");net.setAttribute("aria-live","polite");document.body.appendChild(net);
let nt;const say=(h,ms)=>{net.innerHTML=h;net.classList.add("show");clearTimeout(nt);if(ms)nt=setTimeout(()=>net.classList.remove("show"),ms)};
addEventListener("offline",()=>say("<b>أنت غير متصل الآن.</b> يمكنك تصفّح براق والمخطط كما هما، أما الحساب وحفظ الخطط وطلب العروض فتحتاج إلى الاتصال."));
addEventListener("online",()=>say("عاد الاتصال، وكل الخدمات متاحة الآن.",3500));

if(sa) return; // التطبيق مثبّت بالفعل
const ios=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
let deferred=null;
const ico='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 20h14"/></svg>';
const make=()=>{const b=document.createElement("button");b.type="button";b.className="bq-inst";b.innerHTML=ico+"ثبّت تطبيق براق";b.addEventListener("click",install);return b};
const mount=()=>{if(document.querySelector(".bq-inst"))return;
  const f=document.querySelector(".foot-links");if(f)f.appendChild(make());
  const d=document.querySelector(".drawer .d-acts");if(d)d.appendChild(make());};
async function install(){
  const dx=document.querySelector(".drawer.open .x");if(dx)dx.click();
  if(deferred){deferred.prompt();const r=await deferred.userChoice.catch(()=>null);deferred=null;
    if(r&&r.outcome==="accepted")document.querySelectorAll(".bq-inst").forEach(b=>b.remove());return;}
  if(ios)showIos();
}
function showIos(){let m=document.getElementById("bqIos");
  if(!m){m=document.createElement("div");m.id="bqIos";m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-label","تثبيت تطبيق براق");
    m.innerHTML='<div class="card"><b>ثبّت براق على الشاشة الرئيسية</b><ol><li>اضغط زر المشاركة في سفاري (المربع والسهم).</li><li>اختر «إضافة إلى الشاشة الرئيسية».</li><li>اضغط «إضافة»، وستجد أيقونة براق بين تطبيقاتك.</li></ol><button type="button">تم</button></div>';
    document.body.appendChild(m);m.addEventListener("click",e=>{if(e.target===m||e.target.tagName==="BUTTON")m.classList.remove("show")});}
  m.classList.add("show");m.querySelector("button").focus();}
addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;mount()});
addEventListener("appinstalled",()=>{document.querySelectorAll(".bq-inst").forEach(b=>b.remove());say("تم تثبيت تطبيق براق بنجاح.",3500)});
if(ios)(document.readyState==="loading"?addEventListener("DOMContentLoaded",mount):mount());
})();
