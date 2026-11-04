const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
// اختبار «شاطر حسن على الكمبيوتر» بكل الأدوار: node e2e.cjs <مجلد ShatirHassan المفكوك> <مجلد الصور>
const PKG=path.resolve(process.argv[2]), SHOTS=path.resolve(process.argv[3]);fs.mkdirSync(SHOTS,{recursive:true});
const BIN=process.env.BIN||path.join(PKG,process.platform==='win32'?'ShatirHassan-Windows.exe':process.platform==='darwin'?(process.arch==='arm64'?'bin/shatirhassan-mac-arm64':'bin/shatirhassan-mac-intel'):'ShatirHassan-Linux');
const APP='http://127.0.0.1:47820/app/';const {spawn}=require('child_process');let srv;
const start=async()=>{srv=spawn(BIN,[],{env:{...process.env,SHATIRHASSAN_NO_BROWSER:'1'},cwd:'/'});for(let i=0;i<40;i++){try{const r=await fetch('http://127.0.0.1:47820/api/ping');if(r.ok)break}catch(e){}await new Promise(r=>setTimeout(r,250))}};
const stop=async()=>{srv.kill();await new Promise(r=>setTimeout(r,1200))};
let PROFILE=path.join(PKG,'data/browser');
const net=[];let ok=0;const T=(c,m)=>{if(!c)throw new Error('FAIL: '+m);ok++;console.log('✓',m)};
async function ctx(vp){const c=await chromium.launchPersistentContext(PROFILE,{viewport:vp||{width:1280,height:860},acceptDownloads:true});
  await c.route('**/*',r=>{const u=r.request().url();if(u.startsWith('file:')||u.startsWith('http://127.0.0.1:47820/')||u.startsWith('data:')||u.startsWith('blob:'))return r.continue();net.push(u);return r.abort()});return c}
const login=async(p,id,pw)=>{await p.goto(APP+'#/login');await p.waitForTimeout(300);if(await p.$('[data-act=logout]')){await p.click('[data-act=logout]');await p.waitForTimeout(300);await p.goto(APP+'#/login')}await p.fill('form[data-form=login] [name=id]',id);await p.fill('form[data-form=login] [name=pw]',pw);await p.click('form[data-form=login] button.btn, form[data-form=login] button');await p.waitForTimeout(400)};
const logout=async p=>{await p.click('[data-act=logout]');await p.waitForTimeout(300)};
(async()=>{
 fs.rmSync(path.join(PKG,'data'),{recursive:true,force:true});fs.rmSync(path.join(PKG,'..','profile-new'),{recursive:true,force:true});
 await start();let c=await ctx();let p=c.pages()[0]||await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 // visitor
 await p.goto(APP);await p.waitForSelector('.hero');
 T((await p.textContent('h1')).includes('شاطر حسن'),'الزائر: الصفحة الرئيسية تفتح دون إنترنت');
 await p.evaluate(()=>document.fonts.ready);
 T(await p.evaluate(()=>[...document.fonts].some(f=>f.family.includes('IBM Plex Sans Arabic')&&f.status==='loaded')),'الخط العربي الأصلي محمّل من داخل الملف');
 T((await p.textContent('footer')).includes('دون إنترنت'),'تذييل نسخة الكمبيوتر ظاهر');
 T(!(await p.textContent('#toast')).includes('وضع العرض'),'وضع الحفظ في الملف مفعّل');
 await p.screenshot({path:SHOTS+'/1-visitor-desktop.png'});
 await p.click('a:has-text("اقرأ الوثيقة التأسيسية")');await p.waitForLoadState();
 T(!p.url().includes('/app/'),'الزائر: رابط الوثيقة التأسيسية يعمل محلياً');
 await p.evaluate(()=>document.fonts.ready);
 T(await p.evaluate(()=>[...document.fonts].some(f=>f.family.includes('IBM Plex Sans Arabic')&&f.status==='loaded')),'الوثيقة التأسيسية بخطها الأصلي');
 await p.click('a[href="app/index.html"]');await p.waitForSelector('.hero');T(p.url().includes('/app/'),'العودة من الوثيقة إلى النظام تعمل');
 // register
 await p.goto(APP+'#/register');const R='form[data-form=register] ';
 await p.fill(R+'[name=name]','سارة علي المهندي');await p.fill(R+'[name=email]','sara@test.qa');await p.fill(R+'[name=phone]','55998877');await p.fill(R+'[name=nid]','28800000001');await p.fill(R+'[name=pw]','Sara@2026');await p.check(R+'[name=agree]');
 await p.click(R+'button');await p.waitForTimeout(500);T(p.url().includes('#/c/'),'العميل الجديد: فتح حساب ناجح');await logout(p);
 // admin
 await login(p,'admin@shatirhassan.qa','Hassan@Admin2026');T(p.url().includes('#/a/home'),'المدير: الدخول ناجح');
 await p.screenshot({path:SHOTS+'/2-admin-desktop.png'});
 const sid=await p.evaluate(()=>db.users.find(u=>u.email==='sara@test.qa').id);
 await p.goto(APP+'#/a/users/'+sid);await p.click('[data-act=ustat][data-v=active]');await p.waitForTimeout(300);
 T(await p.evaluate(()=>db.users.find(u=>u.email==='sara@test.qa').status==='active'),'المدير: تفعيل حساب العميل الجديد');
 await p.goto(APP+'#/a/cash');await p.click('[data-act=cashok]');await p.waitForTimeout(300);
 T(await p.evaluate(()=>db.cash.every(c=>c.status!=='pending')),'المدير: تنفيذ طلب الإيداع');
 await p.goto(APP+'#/a/settings');T(await p.isVisible('text=النسخ الاحتياطي والاستعادة'),'المدير: قسم النسخ الاحتياطي ظاهر');
 const [dl]=await Promise.all([p.waitForEvent('download'),p.click('[data-act=backup]')]);const bk=path.join(SHOTS,'..',dl.suggestedFilename());await dl.saveAs(bk);
 const bj=JSON.parse(fs.readFileSync(bk,'utf8'));T(bj.v===1&&bj.users.some(u=>u.email==='sara@test.qa'),'المدير: ملف النسخة الاحتياطية صحيح ('+dl.suggestedFilename()+')');
 await p.waitForTimeout(300);T(await p.isVisible('text=آخر نسخة محفوظة'),'تاريخ آخر نسخة ظاهر');
 T(await p.isVisible('text=ملف البيانات على هذا الجهاز'),'مسار ملف البيانات ظاهر للمدير');
 await p.screenshot({path:SHOTS+'/3-admin-backup.png',fullPage:true});
 await logout(p);
 // customer
 await login(p,'client@shatirhassan.qa','Client@2026');T(p.url().includes('#/c/home'),'العميل: الدخول ناجح');
 const b0=await p.evaluate(()=>me().bal.current);
 await p.goto(APP+'#/c/transfer');await p.fill('form[data-form=transfer] [name=to]','66234567');await p.fill('form[data-form=transfer] [name=amt]','750');await p.click('form[data-form=transfer] button');
 await p.waitForSelector('[data-act=doTransfer]');await p.click('[data-act=doTransfer]');await p.waitForTimeout(400);
 T(await p.evaluate(b=>Math.abs(me().bal.current-(b-750))<0.01,b0),'العميل: تحويل 750.00 ر.ق إلى مريم');
 await logout(p);
 T(errs.length===0,'لا أخطاء برمجية في الصفحة');await c.close();
 // persistence: stop program, restart, and use a brand-new browser profile
 await stop();T(fs.existsSync(path.join(PKG,'data/db.json')),'ملف البيانات data/db.json موجود');
 T(fs.readdirSync(path.join(PKG,'data/backups')).some(f=>/^db-\d{4}-\d\d-\d\d\.json$/.test(f)),'النسخة اليومية التلقائية أُنشئت');
 await start();PROFILE=path.join(PKG,'..','profile-new');c=await ctx();p=c.pages()[0]||await c.newPage();await login(p,'sara@test.qa','Sara@2026');
 T(p.url().includes('#/c/'),'بعد إغلاق البرنامج وإعادة تشغيله وبمتصفح جديد: البيانات محفوظة في الملف');
 T(await p.evaluate(()=>db.tx.some(t=>t.amt===-750)),'التحويل محفوظ بعد إعادة التشغيل');await logout(p);
 // restore
 await login(p,'admin@shatirhassan.qa','Hassan@Admin2026');await p.goto(APP+'#/a/settings');
 await p.setInputFiles('#restoreFile',bk);await p.waitForSelector('[data-act=restoreOk]');await p.screenshot({path:SHOTS+'/4-restore-confirm.png'});
 await p.click('[data-act=restoreOk]');await p.waitForTimeout(400);
 T(await p.evaluate(()=>!db.tx.some(t=>t.amt===-750)&&db.users.some(u=>u.email==='sara@test.qa')),'المدير: الاستعادة أعادت البيانات إلى لحظة النسخة');
 await p.waitForTimeout(400);T(!JSON.parse(fs.readFileSync(path.join(PKG,'data/db.json'),'utf8')).tx.some(t=>t.amt===-750),'الاستعادة كُتبت في ملف البيانات');
 const bad=path.join(SHOTS,'..','bad.json');fs.writeFileSync(bad,'{"x":1}');await p.setInputFiles('#restoreFile',bad);await p.waitForTimeout(300);
 T((await p.textContent('#toast')).includes('ليس نسخة'),'رفض ملف استعادة غير صالح');
 await c.close();
 // mobile
 c=await ctx({width:390,height:844});p=c.pages()[0]||await c.newPage();await p.goto(APP);await p.waitForSelector('.hero');
 T(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'الجوال: لا تمرير أفقي');await p.screenshot({path:SHOTS+'/5-visitor-mobile.png'});
 await login(p,'client@shatirhassan.qa','Client@2026');await p.screenshot({path:SHOTS+'/6-customer-mobile.png'});
 await p.goto(require('url').pathToFileURL(path.join(PKG,'0-READ-ME-FIRST.html')).href);T((await p.textContent('h1')).includes('طريقة التشغيل'),'دليل التشغيل يفتح');await p.screenshot({path:SHOTS+'/8-readme-mobile.png'});
 await c.close();
 c=await ctx();p=c.pages()[0];await p.goto(require('url').pathToFileURL(path.join(PKG,'0-READ-ME-FIRST.html')).href);await p.screenshot({path:SHOTS+'/7-readme.png',fullPage:true});await c.close();
 await stop();
 T(net.length===0,'صفر طلبات إنترنت طوال الاختبار ('+net.length+')');
 console.log('PASSED',ok,'| net:',JSON.stringify(net));
})().catch(e=>{console.error(e.message);console.log('net:',net);if(srv)srv.kill();process.exit(1)});
