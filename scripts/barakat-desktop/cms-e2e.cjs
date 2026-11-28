// اختبار شاشة «إدارة محتوى الموقع» في بركات بكل الأدوار (مدير، زائر، عميل) على الكمبيوتر والجوال.
// BASE=http://127.0.0.1:8099/barakat/ node cms-e2e.cjs <مجلد الصور> [مجلد الموقع لكتابة content.json المنشور تجريبياً]
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');const os=require('os');
const APP=(process.env.BASE||'http://127.0.0.1:8099/barakat/').replace(/\/?$/,'/');
const SHOTS=path.resolve(process.argv[2]||'shots-cms');fs.mkdirSync(SHOTS,{recursive:true});
const SITE_DIR=process.argv[3]?path.resolve(process.argv[3]):null;
let ok=0;const T=(c,m)=>{if(!c)throw new Error('FAIL: '+m);ok++;console.log('✓',m)};
const ADMIN=['admin@barakat.qa','Barakat@Admin2026'],CLIENT=['client@barakat.qa','Client@2026'];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function newCtx(vp,extra){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'barakat-cms-'));return chromium.launchPersistentContext(dir,{viewport:vp||{width:1280,height:860},acceptDownloads:true,...(extra||{})})}
const login=async(p,id,pw)=>{await p.goto(APP+'#/login');await wait(300);if(await p.$('[data-act=logout]')){await p.click('[data-act=logout]');await wait(300);await p.goto(APP+'#/login')}
  await p.fill('form[data-form=login] [name=id]',id);await p.fill('form[data-form=login] [name=pw]',pw);await p.click('form[data-form=login] button');await wait(500)};
const save=async p=>{await p.click('dialog form[data-form=siteSave] button.btn:not(.ghost)');await wait(250)};
const view=p=>p.textContent('#view');
(async()=>{
 const PNG=path.join(os.tmpdir(),'barakat-cms-test.png');
 const pub={put:null};
 let c=await newCtx();let p=c.pages()[0]||await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 // محاكاة واجهة GitHub للنشر (يُستبدل بالنشر الحقيقي على الموقع المنشور)
 await c.route('https://api.github.com/**',async r=>{const q=r.request();
  const u=q.url();const J=(o,st)=>r.fulfill({status:st||200,contentType:'application/json',body:JSON.stringify(o)});
  if(/\/contents\/barakat\?/.test(u))return J([{name:'document',path:'barakat/document',type:'dir',size:0},{name:'index.html',path:'barakat/index.html',type:'file',size:170000},{name:'sw.js',path:'barakat/sw.js',type:'file',size:900}]);
  if(/\/contents\/barakat\/sw\.js/.test(u)){if(q.method()==='PUT'){pub.code=JSON.parse(q.postData());return J({content:{sha:'s2'}})}
   const ref=(u.match(/ref=([^&]+)/)||[])[1];const txt=ref==='old1'?'/* old version */\nself.addEventListener("fetch",()=>{});':fs.readFileSync(path.join(__dirname,'../../barakat/sw.js'),'utf8');return J({sha:'s1',encoding:'base64',content:Buffer.from(txt).toString('base64')})}
  if(/\/commits\?/.test(u))return J([{sha:'s1',commit:{message:'آخر تعديل',committer:{date:'2026-11-25T08:00:00Z'}}},{sha:'old1',commit:{message:'نسخة أقدم',committer:{date:'2026-11-20T08:00:00Z'}}}]);
  if(u.includes('/contents/')){if(q.method()==='GET')return r.fulfill({status:404,body:'{}',contentType:'application/json'});
   pub.put=JSON.parse(q.postData());pub.auth=q.headers()['authorization'];return r.fulfill({status:201,body:'{"content":{"sha":"x"}}',contentType:'application/json'})}
  return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({full_name:'munjiz-qa/munjiz-qa.github.io',permissions:{push:true}})})});
 await p.goto(APP);await p.waitForSelector('.hero');
 await p.screenshot({path:PNG,clip:{x:0,y:0,width:600,height:340}});
 // ---------- المدير
 await p.goto(APP+'#/a/site');await wait(300);T(p.url().includes('#/login'),'الزائر لا يصل إلى إدارة المحتوى ويُحوَّل إلى الدخول');
 await login(p,...CLIENT);await p.goto(APP+'#/a/site');await wait(300);T(!p.url().includes('#/a/site'),'العميل لا يصل إلى إدارة المحتوى');
 await login(p,...ADMIN);T(await p.isVisible('#tabsIn a[href="#/a/site"]'),'المدير: تبويب «محتوى الموقع» ظاهر في لوحة الإدارة');
 await p.click('#tabsIn a[href="#/a/site"]');await wait(300);T((await view(p)).includes('صفحات الموقع'),'المدير: شاشة إدارة المحتوى تفتح');
 T((await p.$$('.srow[data-l=pages]')).length===10,'المدير: الصفحات العشر الأصلية معروضة');
 await p.screenshot({path:SHOTS+'/cms-1-pages-desktop.png',fullPage:true});
 // تعديل عنوان الواجهة الرئيسية
 await p.click('a[href="#/a/site/pg-home"]');await wait(300);
 await p.click('[data-c^="block:home:"]');await p.fill('dialog [name=title]','بركات: مالك ينمو بأمان');await p.fill('dialog [name=hl]','وبركة');await save(p);
 T((await view(p)).includes('بركات: مالك ينمو بأمان'),'المدير: حُفظ تعديل عنوان الواجهة');
 await p.goto(APP+'#/');await wait(200);T((await p.textContent('h1')).includes('مالك ينمو بأمان')&&(await p.textContent('h1')).includes('وبركة'),'التعديل ظاهر في الصفحة الرئيسية');
 T(await p.isVisible('.cms-edit a'),'المدير يرى رابط «تحرير محتوى هذه الصفحة» داخل الموقع');
 // التراجع والإعادة
 await p.goto(APP+'#/a/site/pg-home');await wait(200);await p.click('[data-act=siteUndo]');await wait(200);
 await p.goto(APP+'#/');await wait(150);T((await p.textContent('h1')).includes('مالُك ينمو'),'التراجع يعيد النص السابق');
 await p.goto(APP+'#/a/site/pg-home');await wait(200);await p.click('[data-act=siteRedo]');await wait(200);
 await p.goto(APP+'#/');await wait(150);T((await p.textContent('h1')).includes('مالك ينمو بأمان'),'الإعادة تعيد التعديل');
 // إعادة ترتيب الأقسام بالأسهم
 await p.goto(APP+'#/a/site/pg-home');await wait(200);
 const firstTwo=async()=>p.$$eval('.srow[data-l="blocks:home"] > .hd .tag:first-child',a=>a.slice(0,2).map(x=>x.textContent));
 const b0=await firstTwo();await p.click('.srow[data-l="blocks:home"][data-i="1"] > .hd [data-act=siteMv][data-d="-1"]');await wait(200);const b1=await firstTwo();
 T(b1[0]===b0[1]&&b1[1]===b0[0],'إعادة ترتيب الأقسام بالأسهم');
 await p.goto(APP+'#/');await wait(150);T(await p.evaluate(()=>document.querySelector('#view .blk').querySelector('.kpi')!==null),'الترتيب الجديد ظاهر للزائر (المؤشرات قبل الواجهة)');
 // السحب والإفلات بالفأرة
 await p.goto(APP+'#/a/site/pg-home');await wait(200);
 const h0=await p.$('.srow[data-l="blocks:home"][data-i="0"] > .hd .dh'),r1=await p.$('.srow[data-l="blocks:home"][data-i="1"]');
 const a=await h0.boundingBox(),bb=await r1.boundingBox();
 await p.mouse.move(a.x+a.width/2,a.y+a.height/2);await p.mouse.down();await p.mouse.move(a.x+a.width/2,bb.y+bb.height*0.8,{steps:12});await p.mouse.up();await wait(300);
 const b2=await firstTwo();T(b2[0]===b0[0]&&b2[1]===b0[1],'إعادة ترتيب الأقسام بالسحب والإفلات');
 // إخفاء ونسخ وحذف قسم
 const nb=async()=>(await p.$$('.srow[data-l="blocks:home"]')).length;const n0=await nb();
 await p.click('.srow[data-l="blocks:home"][data-i="3"] > .hd [data-act=siteDup]');await wait(200);T(await nb()===n0+1,'نسخ قسم');
 await p.click('.srow[data-l="blocks:home"][data-i="4"] > .hd [data-act=siteDel]');await p.click('dialog [data-act=siteDelOk]');await wait(200);T(await nb()===n0,'حذف قسم مع التأكيد');
 await p.click('.srow[data-l="blocks:home"][data-i="3"] > .hd [data-act=siteHide]');await wait(200);
 await p.goto(APP+'#/');await wait(150);T(!(await view(p)).includes('ابدأ في ثلاث خطوات'),'إخفاء قسم يخفيه عن الزوار');
 await p.goto(APP+'#/a/site/pg-home');await wait(200);await p.click('.srow[data-l="blocks:home"][data-i="3"] > .hd [data-act=siteHide]');await wait(200);
 await p.goto(APP+'#/');await wait(150);T((await view(p)).includes('ابدأ في ثلاث خطوات'),'إظهار القسم مجدداً');
 // تعديل بطاقة وإضافة بطاقة بصورة مرفوعة
 await p.goto(APP+'#/a/site/pg-home');await wait(200);
 const cardsRow='.srow[data-l="blocks:home"]:has(.tag:text-is("بطاقات"))';
 await p.click(cardsRow+' [data-act=siteDlg][data-c^="newitem:"]');await p.fill('dialog [name=title]','الصكوك الإسلامية');await p.fill('dialog [name=text]','استثمار في صكوك مدعومة بأصول حقيقية.');await p.fill('dialog [name=href]','#/p/sukuk');
 await p.setInputFiles('dialog [data-imgfile=img]',PNG);await p.waitForSelector('dialog img.imgp:not([hidden])');await save(p);
 T((await view(p)).includes('الصكوك الإسلامية'),'إضافة بطاقة جديدة بصورة مرفوعة');
 // صفحة جديدة بأقسام متعددة
 await p.goto(APP+'#/a/site/pages');await wait(200);await p.click('[data-c=newpage]');
 await p.fill('dialog [name=title]','الصكوك الإسلامية');await p.fill('dialog [name=nav]','الصكوك');await p.fill('dialog [name=desc]','أوراق مالية متساوية القيمة تمثل حصصاً شائعة في ملكية أصول حقيقية.');await p.fill('dialog [name=slug]','sukuk');await save(p);await wait(300);
 T(p.url().includes('#/a/site/pg-'),'إنشاء صفحة جديدة والانتقال إلى محرّرها');
 const pid=p.url().split('pg-')[1];
 const addBlk=async(t,fill)=>{await p.click('[data-act=siteAddBlk]');await p.click(`dialog [data-act=siteNewBlk][data-t=${t}]`);await wait(150);if(await p.$('dialog form')){if(fill)await fill();await save(p)}await wait(150)};
 await addBlk('note',async()=>{await p.fill('dialog [name=text]','إصدار جديد من صكوك الإجارة متاح للاكتتاب.');await p.selectOption('dialog [name=tone]','warn')});
 await addBlk('faq',async()=>{await p.fill('dialog [name=title]','أسئلة عن الصكوك')});
 const faqRow=`.srow[data-l="blocks:${pid}"]:has(.tag:text-is("أسئلة شائعة"))`;
 await p.click(faqRow+' [data-act=siteDlg][data-c^="newitem:"]');await p.fill('dialog [name=q]','هل الصك سند بفائدة؟');await p.fill('dialog [name=a]','لا، الصك حصة في ملكية أصل، وعائده من ربحه الفعلي.');await save(p);
 await addBlk('image',async()=>{await p.setInputFiles('dialog [data-imgfile=src]',PNG);await p.waitForSelector('dialog img.imgp:not([hidden])');await p.fill('dialog [name=caption]','صورة توضيحية')});
 await addBlk('kpis',async()=>{await p.fill('dialog [name=title]','أرقام')});
 await addBlk('steps');await addBlk('cta',async()=>{await p.fill('dialog [name=title]','اكتتب الآن')});
 await addBlk('ayah',async()=>{await p.fill('dialog [name=text]','﴿وَأَحَلَّ اللَّهُ الْبَيْعَ وَحَرَّمَ الرِّبَا﴾');await p.fill('dialog [name=src]','سورة البقرة، الآية 275')});
 await addBlk('plans');await addBlk('products');await addBlk('zakat');await addBlk('fincalc');await addBlk('contact');await addBlk('hero',async()=>{await p.fill('dialog [name=title]','صكوك')});await addBlk('brandcard');
 await addBlk('cards',async()=>{await p.fill('dialog [name=title]','أنواع الصكوك')});
 T((await p.$$(`.srow[data-l="blocks:${pid}"]`)).length===16,'إضافة كل أنواع الأقسام (16 قسماً) إلى الصفحة الجديدة');
 await p.screenshot({path:SHOTS+'/cms-2-page-editor-desktop.png',fullPage:true});
 await p.goto(APP+'#/p/sukuk');await wait(400);const sv=await view(p);
 T(sv.includes('الصكوك الإسلامية')&&sv.includes('هل الصك سند بفائدة؟')&&sv.includes('وَأَحَلَّ اللَّهُ الْبَيْعَ')&&(await p.$('#view figure.fig img'))&&(await p.$('#zk'))&&(await p.$('#finForm'))&&(await p.$('form[data-form=contact]')),'الصفحة الجديدة تعرض كل أقسامها للزائر');
 T(await p.isVisible('#tabsIn a[href="#/p/sukuk"]'),'الصفحة الجديدة ظاهرة في القائمة العلوية');
 T(errs.length===0,'لا أخطاء برمجية في الصفحة: '+errs.join(' | '));
 // ترتيب الصفحات في القائمة
 await p.goto(APP+'#/a/site/pages');await wait(200);const last=(await p.$$('.srow[data-l=pages]')).length-1;
 await p.click(`.srow[data-l=pages][data-i="${last}"] [data-act=siteMv][data-d="-1"]`);await wait(150);await p.click(`.srow[data-l=pages][data-i="${last-1}"] [data-act=siteMv][data-d="-1"]`);await wait(150);
 await p.goto(APP+'#/');await wait(150);const tabs=await p.$$eval('#tabsIn a',a=>a.map(x=>x.getAttribute('href')));T(tabs.indexOf('#/p/sukuk')===tabs.indexOf('#/p/contact')-1,'تغيير ترتيب الصفحات ينعكس على القائمة العلوية');
 // إخفاء صفحة
 await p.goto(APP+'#/a/site/pages');await wait(200);await p.click('.srow[data-l=pages]:has(b:text-is("عن بركات")) [data-act=siteHide]');await wait(150);
 await p.goto(APP+'#/');await wait(150);T(!(await p.$('#tabsIn a[href="#/p/about"]')),'إخفاء صفحة يزيلها من القائمة');
 await p.goto(APP+'#/a/site/pages');await wait(200);await p.click('.srow[data-l=pages]:has(b:text-is("عن بركات")) [data-act=siteHide]');await wait(150);
 // الأسئلة الشائعة
 await p.goto(APP+'#/a/site/pg-faq');await wait(200);await p.click('[data-act=siteDlg][data-c^="newitem:faq:"]');await p.fill('dialog [name=q]','هل يمكن فتح حساب للقاصر؟');await p.fill('dialog [name=a]','نعم، بولاية الأب أو الوصي وبوثائق الهوية.');await save(p);
 await p.click('.srow[data-l^="items:faq:"][data-i="0"] [data-act=siteDel]');await p.click('dialog [data-act=siteDelOk]');await wait(200);
 await p.goto(APP+'#/p/faq');await wait(150);const fq=await view(p);T(fq.includes('هل يمكن فتح حساب للقاصر؟')&&!fq.includes('ما الفرق بين ربح بركات والفائدة'),'إضافة سؤال شائع وحذف آخر');
 // الهوية والتواصل وتوحيد الهاتف
 await p.goto(APP+'#/a/site/brand');await wait(200);await p.click('[data-c=brand]');await p.fill('dialog [name=phone]','0097451600498');await p.fill('dialog [name=hours]','الأحد إلى الخميس، 7:30 إلى 15:30');await save(p);
 await p.goto(APP+'#/p/contact');await wait(150);const ct=await view(p);T(ct.includes('+974 5160 0498')&&ct.includes('7:30 إلى 15:30'),'تعديل بيانات التواصل مع توحيد صيغة الهاتف');
 await p.goto(APP+'#/a/site/brand');await wait(200);await p.click('[data-c=announce]');await p.check('dialog [name=on]');await p.fill('dialog [name=text]','افتتاح فرع الخدمة الإلكترونية الجديد هذا الأسبوع.');await save(p);
 await p.goto(APP+'#/p/accounts');await wait(150);T(await p.isVisible('.annc'),'شريط الإعلان يظهر في صفحات الزوار');
 // التذييل
 await p.goto(APP+'#/a/site/footer');await wait(200);await p.click('[data-c="newlink:1"]');await p.fill('dialog [name=label]','الصكوك');await p.fill('dialog [name=href]','#/p/sukuk');await save(p);
 T(await p.isVisible('footer a[href="#/p/sukuk"]'),'إضافة رابط إلى التذييل');
 // صيغ التمويل
 await p.goto(APP+'#/a/site/catalog');await wait(200);await p.click('[data-c="cat:products:murabaha"]');await p.fill('dialog [name=desc]','تشتري بركات السلعة وتتملكها ثم تبيعها لك بثمن معلوم مقسّط.');await save(p);
 await p.goto(APP+'#/p/finance');await wait(150);T((await view(p)).includes('تتملكها ثم تبيعها لك بثمن معلوم مقسّط'),'تعديل وصف صيغة تمويل');
 // شاشة الجوال للمدير
 await p.setViewportSize({width:390,height:844});await p.goto(APP+'#/a/site/pg-home');await wait(300);
 T(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'الجوال: محرّر المحتوى بلا تمرير أفقي');
 await p.screenshot({path:SHOTS+'/cms-3-editor-mobile.png',fullPage:false});
 await p.goto(APP+'#/a/site/pages');await wait(200);T(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'الجوال: قائمة الصفحات بلا تمرير أفقي');
 await p.click('[data-c=newpage]');await wait(150);await p.screenshot({path:SHOTS+'/cms-4-dialog-mobile.png'});await p.click('dialog [data-act=close]');
 await p.goto(APP+'#/p/sukuk');await wait(300);T(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'الجوال: الصفحة الجديدة بلا تمرير أفقي');
 await p.setViewportSize({width:1280,height:860});

 // ---------- التحكم المتقدم (صلاحية كاملة)
 await p.goto(APP+'#/a/site/adv');await wait(250);T((await view(p)).includes('صلاحية كاملة'),'المدير: شاشة «التحكم المتقدم» تفتح');
 await p.click('[data-c=theme]');await p.fill('dialog [name=acc]','#7a2e5c');await save(p);
 T(await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--acc').trim())==='#7a2e5c','تغيير اللون الرئيسي يسري على الموقع كله');
 await p.click('[data-act=themeReset]');await wait(200);T(await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--acc').trim())==='#17594a','استعادة الألوان الأصلية');
 await p.click('[data-c=code]');await p.fill('dialog [name=js]','this is not valid js (');await save(p);T(await p.isVisible('dialog[open]')&&(await p.textContent('dialog .err')).includes('JavaScript'),'رفض JavaScript فيه خطأ قبل الحفظ');
 await p.fill('dialog [name=css]','.hero h1{letter-spacing:1px}');await p.fill('dialog [name=js]',"document.documentElement.dataset.cms='ok'");await p.fill('dialog [name=head]','<meta name="barakat-verify" content="cms-test">');await save(p);
 await p.goto(APP+'#/');await p.reload();await p.waitForSelector('.hero');await wait(300);
 T(await p.evaluate(()=>getComputedStyle(document.querySelector('.hero h1')).letterSpacing==='1px'),'CSS المخصص يسري');
 T(await p.evaluate(()=>document.documentElement.dataset.cms==='ok'&&!!document.querySelector('meta[name=barakat-verify]')),'JavaScript وكود الرأس المخصصان يعملان بعد إعادة التحميل');
 // قسم HTML مخصص
 await p.goto(APP+'#/a/site/pg-about');await wait(200);await p.click('[data-act=siteAddBlk]');await p.click('dialog [data-act=siteNewBlk][data-t=html]');await p.fill('dialog [name=html]','<div id="customHtml" class="card"><h3>قسم بكود HTML</h3><p>محتوى مخصص بالكامل.</p></div>');await save(p);
 await p.goto(APP+'#/p/about');await wait(200);T(await p.isVisible('#customHtml'),'قسم HTML مخصص يظهر في الصفحة');
 // برامج التكافل بقيمها المالية
 await p.goto(APP+'#/a/site/catalog');await wait(200);await p.click('[data-c=newplan]');await p.fill('dialog [name=key]','travel');await p.fill('dialog [name=k]','سفر');await p.fill('dialog [name=name]','تكافل السفر');await p.fill('dialog [name=desc]','تغطية نفقات العلاج والطوارئ أثناء السفر.');await p.fill('dialog [name=fee]','35');await p.fill('dialog [name=cap]','8000');await save(p);
 await p.click('[data-c="cat:plans:health"]');await p.fill('dialog [name=fee]','160');await save(p);
 await p.goto(APP+'#/p/takaful');await wait(200);const tk=await view(p);T(tk.includes('تكافل السفر')&&tk.includes('35.00 ر.ق')&&tk.includes('8,000.00 ر.ق')&&tk.includes('160.00 ر.ق'),'إضافة برنامج تكافل جديد وتعديل اشتراك برنامج قائم');
 // محرّر بيانات المحتوى
 await p.goto(APP+'#/a/site/adv');await wait(200);const sj=JSON.parse(await p.inputValue('form[data-form=advSite] textarea'));sj.brand.tagline='بركةٌ ونماء';
 await p.fill('form[data-form=advSite] textarea',JSON.stringify(sj));await p.click('form[data-form=advSite] button');await wait(250);T((await p.textContent('header .brand small'))==='بركةٌ ونماء','محرّر بيانات المحتوى (JSON) يطبّق التعديل');
 await p.fill('form[data-form=advSite] textarea','{"pages":');await p.click('form[data-form=advSite] button');await wait(150);T((await p.textContent('form[data-form=advSite] .err')).includes('JSON'),'محرّر المحتوى يرفض JSON غير صالح');
 // محرّر بيانات النظام
 await p.click('[data-act=advDbLoad]');const dj=JSON.parse(await p.inputValue('#advDbTa'));dj.settings.goldPrice=300;
 await p.fill('#advDbTa',JSON.stringify(dj));await p.click('form[data-form=advDb] button:not([type])');await wait(250);
 await p.goto(APP+'#/');await wait(200);T((await view(p)).includes('25,500.00'),'محرّر بيانات النظام يطبّق التعديل (سعر الذهب ونصاب الزكاة)');
 await p.goto(APP+'#/a/site/adv');await wait(200);await p.click('[data-act=advDbUndo]');await wait(200);T(await p.evaluate(()=>db.settings.goldPrice!==300),'التراجع عن تعديل بيانات النظام');
 await p.click('[data-act=advDbLoad]');const dj2=JSON.parse(await p.inputValue('#advDbTa'));dj2.users=dj2.users.filter(u=>u.role!=='admin');await p.fill('#advDbTa',JSON.stringify(dj2));await p.click('form[data-form=advDb] button:not([type])');await wait(150);
 T((await p.textContent('form[data-form=advDb] .err')).includes('حساب إدارة'),'محرّر النظام يمنع حذف آخر حساب إدارة');
 // تصدير واستيراد
 await p.goto(APP+'#/a/site/publish');await wait(200);const [dl]=await Promise.all([p.waitForEvent('download'),p.click('[data-act=siteExport]')]);
 const exp=path.join(os.tmpdir(),'barakat-content.json');await dl.saveAs(exp);const ej=JSON.parse(fs.readFileSync(exp,'utf8'));T(ej.pages.some(x=>x.slug==='sukuk'),'تنزيل ملف المحتوى');
 await p.click('[data-act=siteDefaults]');await p.click('dialog [data-act=siteDefaultsOk]');await wait(200);
 await p.goto(APP+'#/');await wait(150);T((await p.textContent('h1')).includes('مالُك ينمو')&&!(await p.$('#tabsIn a[href="#/p/sukuk"]')),'استعادة المحتوى الأصلي');
 await p.goto(APP+'#/a/site/publish');await wait(200);await p.setInputFiles('#siteFile',exp);await p.click('dialog [data-act=siteImportOk]');await wait(200);
 await p.goto(APP+'#/');await wait(150);T((await p.textContent('h1')).includes('مالك ينمو بأمان')&&await p.$('#tabsIn a[href="#/p/sukuk"]'),'استيراد ملف المحتوى');
 await p.goto(APP+'#/a/site/publish');await wait(200);T((await p.$$('[data-act=siteVer]')).length>=2,'سجل النسخ السابقة يحفظ النسخ تلقائياً');
 // النشر للزوار
 await p.click('[data-act=sitePublish]');await wait(200);T(await p.isVisible('dialog form[data-form=sitePubCfg]'),'النشر يطلب رمز النشر أولاً');
 await p.fill('dialog [name=token]','github_pat_TEST');await p.click('dialog form[data-form=sitePubCfg] button.btn:not(.ghost)');await wait(400);
 await p.click('[data-act=sitePublish]');await p.waitForSelector('dialog:has-text("تم النشر بنجاح")');
 T(pub.put&&pub.put.branch==='main'&&pub.auth==='Bearer github_pat_TEST','النشر يرسل ملف المحتوى إلى المستودع');
 const pj=JSON.parse(Buffer.from(pub.put.content,'base64').toString('utf8'));T(pj.pages.some(x=>x.slug==='sukuk')&&!JSON.stringify(pj).includes('github_pat'),'الملف المنشور يحوي المحتوى ولا يحوي رمز النشر');
 await p.click('dialog [data-act=close]');
 // ملفات البرمجة (مستودع GitHub)
 await p.goto(APP+'#/a/site/code');await wait(300);T((await view(p)).includes('index.html')&&(await view(p)).includes('sw.js'),'ملفات البرمجة: قائمة ملفات الموقع من المستودع');
 await p.click('[data-act=codeOpen][data-p="barakat/sw.js"]');await wait(300);T((await p.inputValue('textarea[data-adv=code]')).includes('barakat-v'),'فتح ملف برمجي في المحرّر');
 const orig=await p.inputValue('textarea[data-adv=code]');await p.fill('textarea[data-adv=code]',orig+'\nfunction broken({');await p.click('form[data-form=codeSave] button.btn:not(.ghost)');await wait(200);
 T((await p.textContent('form[data-form=codeSave] .err')).includes('JavaScript')&&!pub.code,'رفض حفظ كود فيه خطأ بناء');
 await p.fill('textarea[data-adv=code]',orig.replace("barakat-v","barakat-cms-v"));await p.fill('form[data-form=codeSave] [name=msg]','تحديث اسم ذاكرة التخزين');await p.click('form[data-form=codeSave] button.btn:not(.ghost)');await p.waitForSelector('dialog:has-text("حُفظ الملف ونُشر")');
 T(pub.code&&Buffer.from(pub.code.content,'base64').toString('utf8').includes('barakat-cms-v')&&pub.code.sha==='s1','حفظ الملف البرمجي ونشره في المستودع');await p.click('dialog [data-act=close]');
 await p.click('[data-act=codeHist]');await wait(300);await p.click('[data-act=codeRestore][data-sha=old1]');await wait(300);T((await p.inputValue('textarea[data-adv=code]')).includes('old version'),'استرجاع نسخة سابقة من سجل الملف');
 await p.screenshot({path:SHOTS+'/cms-9-code-editor-desktop.png',fullPage:false});
 await p.setViewportSize({width:390,height:844});await p.goto(APP+'#/a/site/adv');await wait(250);T(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'الجوال: التحكم المتقدم بلا تمرير أفقي');await p.setViewportSize({width:1280,height:860});
  await p.goto(APP+'#/a/site/publish');await wait(200);T((await view(p)).includes('المحتوى منشور للزوار'),'حالة المحتوى «منشور» بعد النشر');
 await p.screenshot({path:SHOTS+'/cms-5-publish-desktop.png',fullPage:true});
 await c.close();
 // ---------- زائر جديد وعميل على جهاز آخر يريان المحتوى المنشور
 if(SITE_DIR){fs.writeFileSync(path.join(SITE_DIR,'content.json'),JSON.stringify(pj));
  c=await newCtx();p=c.pages()[0]||await c.newPage();await p.goto(APP);await p.waitForSelector('.hero');await wait(300);
  T((await p.textContent('h1')).includes('مالك ينمو بأمان'),'زائر على جهاز آخر يرى المحتوى المنشور');
  T(await p.isVisible('#tabsIn a[href="#/p/sukuk"]')&&await p.isVisible('.annc'),'الزائر يرى الصفحة الجديدة وشريط الإعلان');
  T(await p.evaluate(()=>document.documentElement.dataset.cms==='ok'),'الزائر على جهاز آخر يعمل لديه JavaScript المنشور');
  await p.goto(APP+'#/p/takaful');await wait(200);T((await view(p)).includes('تكافل السفر'),'الزائر يرى برنامج التكافل الجديد');
  await p.screenshot({path:SHOTS+'/cms-6-visitor-desktop.png',fullPage:true});
  await p.goto(APP+'#/p/sukuk');await wait(300);await p.screenshot({path:SHOTS+'/cms-7-new-page-desktop.png',fullPage:true});
  await p.goto(APP+'#/a/site');await wait(300);T(p.url().includes('#/login'),'الزائر على الجهاز الآخر لا يصل إلى إدارة المحتوى');
  await login(p,...CLIENT);await p.goto(APP+'#/p/faq');await wait(200);T((await view(p)).includes('هل يمكن فتح حساب للقاصر؟'),'العميل يرى الأسئلة الشائعة المحدّثة');
  T(!(await p.$('.cms-edit')),'العميل لا يرى روابط التحرير');
  await p.goto(APP+'#/c/home');await wait(200);T((await view(p)).length>40,'خدمات العميل تعمل كما هي');
  await c.close();
  c=await newCtx({width:390,height:844},{isMobile:true,hasTouch:true});p=c.pages()[0]||await c.newPage();await p.goto(APP);await p.waitForSelector('.hero');await wait(300);
  T((await p.textContent('h1')).includes('مالك ينمو بأمان'),'الجوال: الزائر يرى المحتوى المنشور');await p.screenshot({path:SHOTS+'/cms-8-visitor-mobile.png',fullPage:false});
  await p.goto(APP+'#/p/sukuk');await wait(300);T(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'الجوال: الصفحة الجديدة للزائر بلا تمرير أفقي');
  await c.close();fs.rmSync(path.join(SITE_DIR,'content.json'))}
 console.log('PASSED',ok);process.exit(0);
})().catch(e=>{console.error(e.message||e);console.log('PASSED',ok);process.exit(1)});
