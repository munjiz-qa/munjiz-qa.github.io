// اختبار «بركات» بكل الأدوار (زائر، عميل جديد، مدير، عميل) على الكمبيوتر والجوال.
// نسخة الكمبيوتر: node e2e.cjs <مجلد Barakat المفكوك> <مجلد الصور>
// الموقع:         BASE=https://.../barakat/ node e2e.cjs - <مجلد الصور>
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');const {spawn}=require('child_process');
const WEB=!!process.env.BASE;
const PKG=WEB?null:path.resolve(process.argv[2]);const SHOTS=path.resolve(process.argv[3]||'shots');fs.mkdirSync(SHOTS,{recursive:true});
const PORT=47840,ORIGIN=`http://127.0.0.1:${PORT}/`;
const APP=WEB?process.env.BASE.replace(/\/?$/,'/'):ORIGIN;
const BIN=WEB?null:(process.env.BIN||path.join(PKG,process.platform==='win32'?'Barakat-Windows.exe':process.platform==='darwin'?(process.arch==='arm64'?'bin/barakat-mac-arm64':'bin/barakat-mac-intel'):'Barakat-Linux'));
let srv;
const start=async()=>{if(WEB)return;srv=spawn(BIN,[],{env:{...process.env,BARAKAT_NO_BROWSER:'1'},cwd:'/'});for(let i=0;i<40;i++){try{const r=await fetch(ORIGIN+'api/ping');if(r.ok)break}catch(e){}await new Promise(r=>setTimeout(r,250))}};
const stop=async()=>{if(WEB||!srv)return;srv.kill();await new Promise(r=>setTimeout(r,1200))};
const TMP=WEB?fs.mkdtempSync(path.join(require('os').tmpdir(),'barakat-e2e-')):null;
let PROFILE=WEB?path.join(TMP,'p1'):path.join(PKG,'data/browser');
const net=[];let ok=0;const T=(c,m)=>{if(!c)throw new Error('FAIL: '+m);ok++;console.log('✓',m)};
const allowed=u=>u.startsWith('data:')||u.startsWith('blob:')||u.startsWith('file:')||(WEB?true:u.startsWith(ORIGIN));
async function ctx(vp){const c=await chromium.launchPersistentContext(PROFILE,{viewport:vp||{width:1280,height:860},acceptDownloads:true});
  await c.route('**/*',r=>{const u=r.request().url();if(allowed(u))return r.continue();net.push(u);return r.abort()});return c}
const login=async(p,id,pw)=>{await p.goto(APP+'#/login');await p.waitForTimeout(300);if(await p.$('[data-act=logout]')){await p.click('[data-act=logout]');await p.waitForTimeout(300);await p.goto(APP+'#/login')}
  await p.fill('form[data-form=login] [name=id]',id);await p.fill('form[data-form=login] [name=pw]',pw);await p.click('form[data-form=login] button');await p.waitForTimeout(500)};
const logout=async p=>{await p.click('[data-act=logout]');await p.waitForTimeout(300)};
const ADMIN=['admin@barakat.qa','Barakat@Admin2026'],CLIENT=['client@barakat.qa','Client@2026'];
(async()=>{
 if(!WEB){fs.rmSync(path.join(PKG,'data'),{recursive:true,force:true});fs.rmSync(path.join(PKG,'..','profile-new'),{recursive:true,force:true})}
 await start();let c=await ctx();let p=c.pages()[0]||await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 // ---------- visitor
 await p.goto(APP);await p.waitForSelector('.hero');
 T((await p.textContent('h1')).includes('بركات'),'الزائر: الصفحة الرئيسية تفتح باسم «بركات»');
 T(await p.isVisible('#mark')||await p.evaluate(()=>!!document.querySelector('symbol#mark')),'الشعار الجديد موجود');
 await p.evaluate(()=>document.fonts.ready);
 T(await p.evaluate(()=>[...document.fonts].some(f=>f.family.includes('IBM Plex Sans Arabic')&&f.status==='loaded')),'الخط العربي محمّل');
 if(!WEB){T((await p.textContent('footer')).includes('دون إنترنت'),'تذييل نسخة الكمبيوتر ظاهر');T(!(await p.textContent('#toast')).includes('وضع العرض'),'وضع الحفظ في الملف مفعّل')}
 await p.screenshot({path:SHOTS+'/1-home-desktop.png',fullPage:true});
 const PUB=[['accounts','الحسابات والاستثمار'],['finance','التمويل الإسلامي'],['takaful','التكافل'],['zakat','الزكاة والخير'],['sharia','الضوابط الشرعية'],['about','عن بركات'],['faq','الأسئلة الشائعة'],['contact','تواصل معنا'],['terms','الشروط والخصوصية']];
 for(const [k,t] of PUB){await p.goto(APP+'#/p/'+k);await p.waitForTimeout(150);T((await p.textContent('#view h2')).includes(t),`الزائر: صفحة «${t}» تعمل`)}
 // every public nav tab and footer link resolves to a real page
 await p.goto(APP);const hrefs=await p.$$eval('#tabsIn a, footer a',as=>as.map(a=>a.getAttribute('href')).filter(h=>h.startsWith('#/')));
 for(const h of [...new Set(hrefs)]){await p.goto(APP+h);await p.waitForTimeout(100);T((await p.textContent('#view')).trim().length>40,`رابط ${h} يفتح صفحة ممتلئة`)}
 await p.goto(APP+'#/p/finance');await p.fill('#finForm [name=amount]','40000');await p.fill('#finForm [name=term]','36');await p.waitForTimeout(200);
 T((await p.textContent('#finPrev')).includes('إجمالي ما تسدده'),'الزائر: حاسبة التمويل تعمل');
 await p.goto(APP+'#/p/zakat');await p.fill('#zk [name=cash]','100000');await p.waitForTimeout(200);
 T((await p.textContent('#zkOut')).includes('2,500.00'),'الزائر: حاسبة الزكاة تحسب 2.5% (2,500.00 ر.ق من 100,000)');
 await p.goto(APP+'#/p/faq');await p.click('details summary');T(await p.isVisible('details[open] p'),'الأسئلة الشائعة تُفتح');
 await p.goto(APP+'#/p/contact');const CF='form[data-form=contact] ';
 await p.fill(CF+'[name=name]','نورة سالم الهاجري');await p.fill(CF+'[name=phone]','55443322');await p.fill(CF+'[name=email]','noura@test.qa');await p.fill(CF+'[name=body]','أرغب في معرفة شروط تمويل المرابحة للسيارات.');
 await p.click(CF+'button');await p.waitForSelector('dialog[open]');T((await p.textContent('dialog')).includes('M-'),'الزائر: نموذج التواصل يرسل ويعطي رقم رسالة');await p.click('dialog [data-act=close]');
 await p.goto(APP+'#/p/about');await p.click('a[href="document/"]').catch(async()=>{await p.click('footer a[href="document/"]')});await p.waitForLoadState();
 T(p.url().includes('/document/')&&(await p.textContent('h1')).includes('بركات'),'الوثيقة التأسيسية تفتح باسم «بركات»');
 await p.click('header a[href="../"]');await p.waitForSelector('.hero');T(!p.url().includes('/document/'),'العودة من الوثيقة إلى الموقع تعمل');
 // ---------- new customer
 await p.goto(APP+'#/register');const R='form[data-form=register] ';
 await p.fill(R+'[name=name]','سارة علي المهندي');await p.fill(R+'[name=email]','sara@test.qa');await p.fill(R+'[name=phone]','55998877');await p.fill(R+'[name=nid]','28800000001');await p.fill(R+'[name=pw]','Sara@2026');await p.check(R+'[name=agree]');
 await p.click(R+'button');await p.waitForTimeout(500);T(p.url().includes('#/c/'),'العميل الجديد: فتح حساب ناجح');
 T(await p.evaluate(()=>me().acct.startsWith('BR-')),'رقم الحساب بالبادئة الجديدة BR-');
 await p.goto(APP+'#/c/help');await p.fill('form[data-form=contact] [name=body]','متى يُفعَّل حسابي حتى أبدأ الإيداع؟');await p.click('form[data-form=contact] button');await p.waitForTimeout(300);
 T((await p.textContent('#view')).includes('متى يُفعَّل حسابي'),'العميل الجديد: رسالة الدعم ظاهرة في صفحة المساعدة');
 await logout(p);
 // ---------- admin
 await login(p,...ADMIN);T(p.url().includes('#/a/home'),'المدير: الدخول ناجح');
 await p.screenshot({path:SHOTS+'/2-admin-desktop.png',fullPage:true});
 const sid=await p.evaluate(()=>db.users.find(u=>u.email==='sara@test.qa').id);
 await p.goto(APP+'#/a/users/'+sid);await p.click('[data-act=ustat][data-v=active]');await p.waitForTimeout(300);
 T(await p.evaluate(()=>db.users.find(u=>u.email==='sara@test.qa').status==='active'),'المدير: تفعيل حساب العميل الجديد');
 await p.goto(APP+'#/a/cash');await p.click('[data-act=cashok]');await p.waitForTimeout(300);
 T(await p.evaluate(()=>db.cash.every(c=>c.status!=='pending')),'المدير: تنفيذ طلب الإيداع');
 const qid=await p.evaluate(()=>db.reqs.find(r=>r.product==='qard'&&r.status==='pending').id);await p.goto(APP+'#/a/requests/'+qid);await p.waitForTimeout(200);
 await p.click('form[data-form=decide] button[value=approve]');await p.waitForTimeout(300);T(await p.evaluate(id=>db.reqs.find(r=>r.id===id).status==='offer',qid),'المدير: اعتماد طلب القرض الحسن وإصدار العرض');
 await p.goto(APP+'#/a/takaful');const fund0=await p.evaluate(()=>db.funds.takaful);await p.click('[data-act=claimok]');await p.waitForTimeout(300);
 T(await p.evaluate(f=>db.claims.every(c=>c.status!=='pending')&&db.funds.takaful===f-1200,fund0),'المدير: صرف تعويض تكافل 1,200.00 ر.ق من صندوق المشتركين');
 await p.goto(APP+'#/a/messages');const nMsg=await p.evaluate(()=>db.msgs.filter(m=>m.status==='new').length);T(nMsg>=3,`المدير: الرسائل الجديدة ظاهرة (${nMsg})`);
 const mid=await p.evaluate(()=>db.msgs.find(m=>m.email==='sara@test.qa').id);await p.goto(APP+'#/a/messages/'+mid);
 await p.fill('form[data-form=reply] [name=reply]','فُعّل حسابك، ويمكنك الإيداع الآن. أهلاً بك في بركات.');await p.click('form[data-form=reply] button.btn:not(.ghost)');await p.waitForTimeout(300);
 T(await p.evaluate(id=>db.msgs.find(m=>m.id===id).status==='replied',mid),'المدير: الرد على رسالة العميل');
 await p.goto(APP+'#/a/profit');await p.fill('form[data-form=dist] [name=period]','الربع الرابع 2026');await p.fill('form[data-form=dist] [name=gross]','3000');await p.click('form[data-form=dist] button');
 await p.click('[data-act=doDist]');await p.waitForTimeout(300);T(await p.evaluate(()=>db.dist.length===2),'المدير: توزيع أرباح المضاربة');
 await p.goto(APP+'#/a/settings');T(await p.isVisible('text=النسخ الاحتياطي والاستعادة'),'المدير: قسم النسخ الاحتياطي ظاهر');
 const [dl]=await Promise.all([p.waitForEvent('download'),p.click('[data-act=backup]')]);const bk=path.join(SHOTS,'..',dl.suggestedFilename());await dl.saveAs(bk);
 const bj=JSON.parse(fs.readFileSync(bk,'utf8'));T(bj.v===1&&bj.users.some(u=>u.email==='sara@test.qa')&&dl.suggestedFilename().startsWith('barakat-backup-'),'المدير: ملف النسخة الاحتياطية صحيح ('+dl.suggestedFilename()+')');
 if(!WEB)T(await p.isVisible('text=ملف البيانات على هذا الجهاز'),'مسار ملف البيانات ظاهر للمدير');
 await logout(p);
 // ---------- existing customer
 await login(p,...CLIENT);T(p.url().includes('#/c/home'),'العميل: الدخول ناجح');
 const b0=await p.evaluate(()=>me().bal.current);
 await p.goto(APP+'#/c/transfer');await p.fill('form[data-form=transfer] [name=to]','66234567');await p.fill('form[data-form=transfer] [name=amt]','750');await p.click('form[data-form=transfer] button');
 await p.waitForSelector('[data-act=doTransfer]');await p.click('[data-act=doTransfer]');await p.waitForTimeout(400);
 T(await p.evaluate(b=>Math.abs(me().bal.current-(b-750))<0.01,b0),'العميل: تحويل 750.00 ر.ق إلى مريم');
 const pay0=await p.evaluate(()=>db.reqs.find(r=>r.uid===me().id&&r.product==='murabaha'&&r.status==='active').schedule.filter(s=>s.paid).length);
 await p.goto(APP+'#/c/finance/'+await p.evaluate(()=>db.reqs.find(r=>r.uid===me().id&&r.product==='murabaha'&&r.status==='active').id));await p.click('[data-act=pay]');await p.waitForTimeout(300);
 T(await p.evaluate(n=>db.reqs.find(r=>r.uid===me().id&&r.product==='murabaha').schedule.filter(s=>s.paid).length===n+1,pay0),'العميل: سداد قسط المرابحة');
 await p.goto(APP+'#/c/takaful');await p.click('[data-act=tkjoin][data-id=home]');await p.waitForTimeout(300);
 T(await p.evaluate(()=>db.policies.some(x=>x.uid===me().id&&x.plan==='home'&&x.status==='active')),'العميل: الاشتراك في تكافل المنزل');
 await p.selectOption('form[data-form=claim] [name=pid]',{index:0});await p.fill('form[data-form=claim] [name=amt]','2500');await p.fill('form[data-form=claim] [name=desc]','تلف الواجهة الأمامية للمركبة في حادث بسيط');await p.click('form[data-form=claim] button');await p.waitForTimeout(300);
 T(await p.evaluate(()=>db.claims.some(c=>c.uid===me().id&&c.status==='pending')),'العميل: تقديم مطالبة تكافل');
 await p.goto(APP+'#/c/zakat');await p.waitForTimeout(200);const zk=await p.evaluate(()=>+$('#zk').dataset.due);
 if(zk>0){await p.click('#zkBtn');await p.waitForTimeout(300);T(await p.evaluate(()=>db.tx.filter(t=>t.uid===me().id&&t.type==='zakat').length>=2),'العميل: إخراج الزكاة')}
 await p.goto(APP+'#/c/invest');T((await p.textContent('#view')).includes('الربع الرابع 2026'),'العميل: يرى توزيع الربح الجديد');
 await logout(p);
 await login(p,'maryam@barakat.qa','Client@2026');const mb=await p.evaluate(()=>me().bal.current);await p.goto(APP+'#/c/finance/'+qid);await p.click('[data-act=accept]');await p.waitForTimeout(300);
 T(await p.evaluate(([id,b])=>db.reqs.find(r=>r.id===id).status==='active'&&Math.abs(me().bal.current-(b+6000))<0.01,[qid,mb]),'العميلة مريم: قبول القرض الحسن وصرف 6,000.00 ر.ق إلى حسابها');
 T(await p.evaluate(()=>me().bal.current>0&&db.tx.some(t=>t.uid===me().id&&t.note.startsWith('تعويض تكافل'))),'العميلة مريم: تعويض التكافل وصل إلى حسابها');await logout(p);
 await login(p,'sara@test.qa','Sara@2026');await p.goto(APP+'#/c/help');T((await p.textContent('#view')).includes('فُعّل حسابك'),'العميل الجديد: يرى رد الإدارة');await logout(p);
 T(errs.length===0,'لا أخطاء برمجية في الصفحة'+(errs.length?': '+errs.join(' | '):''));await c.close();
 // ---------- persistence
 if(!WEB){await stop();T(fs.existsSync(path.join(PKG,'data/db.json')),'ملف البيانات data/db.json موجود');
  T(fs.readdirSync(path.join(PKG,'data/backups')).some(f=>/^db-\d{4}-\d\d-\d\d\.json$/.test(f)),'النسخة اليومية التلقائية أُنشئت');
  await start();PROFILE=path.join(PKG,'..','profile-new')}else PROFILE=path.join(TMP,'p1');
 c=await ctx();p=c.pages()[0]||await c.newPage();await login(p,'sara@test.qa','Sara@2026');
 T(p.url().includes('#/c/'),WEB?'بعد إغلاق المتصفح وإعادة فتحه: البيانات محفوظة':'بعد إعادة تشغيل البرنامج وبمتصفح جديد: البيانات محفوظة في الملف');
 T(await p.evaluate(()=>db.tx.some(t=>t.amt===-750)),'التحويل محفوظ بعد إعادة التشغيل');await logout(p);
 // ---------- restore
 await login(p,...ADMIN);await p.goto(APP+'#/a/settings');
 await p.setInputFiles('#restoreFile',bk);await p.waitForSelector('[data-act=restoreOk]');await p.click('[data-act=restoreOk]');await p.waitForTimeout(400);
 T(await p.evaluate(()=>!db.tx.some(t=>t.amt===-750)&&db.users.some(u=>u.email==='sara@test.qa')),'المدير: الاستعادة أعادت البيانات إلى لحظة النسخة');
 if(!WEB){await p.waitForTimeout(400);T(!JSON.parse(fs.readFileSync(path.join(PKG,'data/db.json'),'utf8')).tx.some(t=>t.amt===-750),'الاستعادة كُتبت في ملف البيانات')}
 const bad=path.join(SHOTS,'..','bad.json');fs.writeFileSync(bad,'{"x":1}');await p.setInputFiles('#restoreFile',bad);await p.waitForTimeout(300);
 T((await p.textContent('#toast')).includes('ليس نسخة'),'رفض ملف استعادة غير صالح');
 await c.close();
 // ---------- mobile
 c=await ctx({width:390,height:844});p=c.pages()[0]||await c.newPage();
 for(const h of ['#/','#/p/finance','#/p/takaful','#/p/contact']){await p.goto(APP+h);await p.waitForTimeout(250);T(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`الجوال: ${h} بلا تمرير أفقي`)}
 await p.goto(APP);await p.waitForTimeout(300);await p.screenshot({path:SHOTS+'/3-home-mobile.png'});
 await login(p,...CLIENT);for(const h of ['home','takaful','finance','help']){await p.goto(APP+'#/c/'+h);await p.waitForTimeout(200);T(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`الجوال: صفحة العميل ${h} بلا تمرير أفقي`)}
 await p.goto(APP+'#/c/home');await p.waitForTimeout(200);await p.screenshot({path:SHOTS+'/4-customer-mobile.png'});
 await login(p,...ADMIN);await p.goto(APP+'#/a/takaful');await p.waitForTimeout(200);T(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'الجوال: لوحة الإدارة بلا تمرير أفقي');await p.screenshot({path:SHOTS+'/5-admin-mobile.png'});
 if(!WEB){await p.goto(require('url').pathToFileURL(path.join(PKG,'0-READ-ME-FIRST.html')).href);T((await p.textContent('h1')).includes('طريقة التشغيل'),'دليل التشغيل يفتح')}
 await c.close();await stop();
 if(!WEB)T(net.length===0,'صفر طلبات إنترنت طوال الاختبار ('+net.length+')');
 console.log('PASSED',ok,'| blocked:',JSON.stringify(net.slice(0,5)));
})().catch(e=>{console.error(e.message);console.log('blocked:',net.slice(0,5));if(srv)srv.kill();process.exit(1)});
