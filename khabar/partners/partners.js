'use strict';
// صفحة الشراكة: كود التضمين، ورمز QR، ورابط الدعوة، وخلاصات RSS، وقائمة «جاهز للتفعيل».
(function(){
const CFG=window.KHABAR_CONFIG||{};const $=s=>document.querySelector(s);
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
const toast=m=>{const n=$('#toast');n.textContent=m;n.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>n.hidden=true,2400)};
const base=new URL('../',location.href).href;
const copy=t=>navigator.clipboard.writeText(t).then(()=>toast('نُسخ.'),()=>{});
let META=[];
function code(){const l=$('#e-lang').value,d=$('#e-desk').value,n=$('#e-n').value;
  const c=`<iframe src="${base}embed/?lang=${l}&desk=${d}&n=${n}" title="خبر" loading="lazy" style="width:100%;max-width:520px;height:${120+n*74}px;border:0;border-radius:14px"></iframe>`;
  $('#e-code').textContent=c;$('#e-prev').innerHTML=c}
['#e-lang','#e-desk','#e-n'].forEach(s=>$(s).onchange=code);$('#e-copy').onclick=()=>copy($('#e-code').textContent);
let qr=null;
function ref(){const r=$('#ref').value.trim().replace(/[^\w-]/g,'').slice(0,20);const u=base+(r?'?ref='+encodeURIComponent(r):'');const a=$('#ref-link');a.href=u;a.textContent=u;
  $('#ref-wa').href='https://wa.me/?text='+encodeURIComponent('تابع «خبر»: خلاصة يومية موثّقة، كل خبر بمصدرين مستقلين على الأقل.\n'+u);
  const box=$('#qr');box.textContent='';if(window.QRCode){qr=new QRCode(box,{text:u,width:200,height:200,colorDark:'#14212E',colorLight:'#FFFFFF',correctLevel:QRCode.CorrectLevel.M})}else box.append(el('p','mute','تعذّر تحميل مولّد الرمز.'))}
$('#ref').oninput=ref;$('#ref-copy').onclick=()=>copy($('#ref-link').href);
$('#qr-dl').onclick=()=>{const c=$('#qr canvas'),i=$('#qr img');const src=c?c.toDataURL('image/png'):i&&i.src;if(!src)return;const a=document.createElement('a');a.href=src;a.download='khabar-qr.png';a.click()};
const ACT=[['النشرة بالبريد أو واتساب','مزوّد إرسال ومفتاحه'],['الاشتراك المدفوع','مزوّد دفع والأسعار'],['الإعلانات','حساب إعلانات وسياسة تمييز الإعلان'],['النشر الآلي على X وتلغرام وواتساب','حسابات «خبر» ومفاتيحها'],['المساعدات الصوتية','حسابا مطوّر Google وAmazon'],['متاجر التطبيقات وأدلتها','حسابا Google Play وApple Developer'],['حملة الإطلاق','ميزانية وحسابات إعلانية'],['عضوية IFCN','مراجعة ملف الطلب وتقديمه من المالك'],['نطاق خاص','شراء نطاق وربطه']];
Promise.all([fetch('../data/desks.json').then(r=>r.json()).catch(()=>null),fetch('../data/admin.json').then(r=>r.json()).catch(()=>({}))]).then(([d,a])=>{
  META=d?d.meta:[];META.forEach(m=>{const o=el('option',null,m.ar);o.value=m.id;$('#e-desk').append(o)});code();
  const ul=$('#rss');[['brief','الخلاصة الرئيسية'],...META.map(m=>[m.id,m.ar])].forEach(([id,n])=>{const li=el('li');const a=el('a',null,n);a.href=base+'feeds/'+id+'.xml';const b=el('a',null,'English');b.href=base+'feeds/'+id+'-en.xml';li.append(a,' · ',b);ul.append(li)});
  const act=$('#act');const on=(a&&a.activate)||{};ACT.forEach(([t,n],i)=>{const li=el('li','item');const k=['newsletter','payments','ads','social_x','voice','stores','campaign','ifcn','domain'][i];li.append(el('span','cat',on[k]?'مفعّل':'جاهز، ينتظر التفعيل'),el('p',null,t),el('p','basis','يلزم: '+n));act.append(li)});
});
ref();
})();
