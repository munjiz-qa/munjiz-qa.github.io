// براق · طبقة تجربة المستخدم (مستقلة تماماً، بلا أي اعتماد خارجي)
(()=>{
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const GROUPS=[
 ["ابدأ هنا",[["#convert","مخطط تحويل سيارتك","1,404 موديلات"],["#how","كيف نعمل","4 خطوات"],["#flex","الطقم المرن"],["#report","قائمة السيارات"],["#madad","مدد مصر","بالجنيه"],["#model","النموذج التفاعلي","3D"]]],
 ["المنظومة",[["#modules","الوحدات"],["#solar","الشحن الشمسي","جديد"],["#range","المدى"],["#bom","التكلفة"],["#iface","الواجهات"],["#hv","الدوائر"],["#install","التركيب"],["#safety","السلامة"]]],
 ["التوريد والملفات",[["#suppliers","الموردون وعروض الأسعار"],["#workshop","معدات الورشة"],["#files","ملفات التصميم"],["#sources","المصادر"]]],
 ["الخدمة",[["#faq","الأسئلة الشائعة"],["#contact","تواصل معنا"]]]
];
const top=$("header.top .wrap"); if(!top) return;

// progress bar + skip link
document.body.insertAdjacentHTML("afterbegin",'<a class="skip" href="#top">تخطَّ إلى المحتوى</a><div id="progressBar" aria-hidden="true"><i></i></div>');

// mobile menu
const btn=document.createElement("button");
btn.type="button";btn.className="menu-btn";btn.setAttribute("aria-expanded","false");btn.setAttribute("aria-controls","bqDrawer");
btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>الأقسام';
top.appendChild(btn);
const dr=document.createElement("div");
dr.className="drawer";dr.id="bqDrawer";dr.setAttribute("role","dialog");dr.setAttribute("aria-modal","true");dr.setAttribute("aria-label","أقسام الموقع");
dr.innerHTML='<div class="scrim"></div><div class="panel-d"><div class="dh"><b>أقسام براق</b><button type="button" class="x" aria-label="إغلاق القائمة">×</button></div>'+
 GROUPS.map(([g,ls])=>`<h4>${g}</h4>`+ls.filter(([h])=>document.querySelector(h)).map(([h,t,s])=>`<a href="${h}">${t}${s?`<small>${s}</small>`:""}</a>`).join("")).join("")+
 '<div class="d-acts"><a href="account.html">حسابي</a><a class="pri" href="#convert">ابدأ الآن</a></div></div>';
document.body.appendChild(dr);
let lastFocus=null;
const open=()=>{lastFocus=document.activeElement;dr.classList.add("open");document.body.classList.add("no-scroll");btn.setAttribute("aria-expanded","true");dr.querySelector(".x").focus()};
const close=(back=true)=>{dr.classList.remove("open");document.body.classList.remove("no-scroll");btn.setAttribute("aria-expanded","false");if(back&&lastFocus)lastFocus.focus()};
btn.addEventListener("click",open);
dr.querySelector(".scrim").addEventListener("click",()=>close());
dr.querySelector(".x").addEventListener("click",()=>close());
dr.addEventListener("click",e=>{if(e.target.closest("a"))close(false)});
document.addEventListener("keydown",e=>{
  if(!dr.classList.contains("open"))return;
  if(e.key==="Escape")close();
  if(e.key==="Tab"){const f=[...dr.querySelectorAll("a,button")];const a=f[0],z=f[f.length-1];
    if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}
});

// add the new sections to the desktop nav
const nav=$("header.top .nav");
if(nav){const c=nav.querySelector('a[href="#contact"]');
  [["#how","كيف نعمل"],["#faq","الأسئلة الشائعة"]].forEach(([h,t])=>{if(document.querySelector(h)&&!nav.querySelector(`a[href="${h}"]`)){const a=document.createElement("a");a.href=h;a.textContent=t;nav.insertBefore(a,c)}});}

// scrollspy
const links=[...$$("header.top .nav a[href^='#']"),...dr.querySelectorAll("a[href^='#']")];
const secs=[...new Set(links.map(a=>a.getAttribute("href")))].map(h=>document.querySelector(h)).filter(Boolean);
let cur=null;
const setCur=id=>{if(id===cur)return;cur=id;links.forEach(a=>{const on=a.getAttribute("href")==="#"+id;on?a.setAttribute("aria-current","true"):a.removeAttribute("aria-current")});
  const na=nav&&nav.querySelector(`a[href="#${id}"]`);if(na&&nav.scrollWidth>nav.clientWidth){const r=na.getBoundingClientRect(),n=nav.getBoundingClientRect();if(r.left<n.left||r.right>n.right)nav.scrollBy({left:(r.left+r.width/2)-(n.left+n.width/2),behavior:"smooth"})}};

// progress + back to top + spy, one rAF-throttled scroll handler
const bar=$("#progressBar i");
document.body.insertAdjacentHTML("beforeend",'<button type="button" id="toTop" aria-label="العودة إلى أعلى الصفحة"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>');
const tt=$("#toTop");tt.addEventListener("click",()=>scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"}));
let tick=false;
const onScroll=()=>{tick=false;const y=scrollY,h=document.documentElement.scrollHeight-innerHeight;
  bar.style.transform=`scaleX(${h>0?Math.min(1,y/h):0})`;tt.classList.toggle("show",y>innerHeight*1.2);
  const line=innerHeight*0.3;let id=null;for(const s of secs){const r=s.getBoundingClientRect();if(r.top<=line&&r.bottom>line){id=s.id}}setCur(id)};
addEventListener("scroll",()=>{if(!tick){tick=true;requestAnimationFrame(onScroll)}},{passive:true});
addEventListener("resize",onScroll);onScroll();
})();
