// فحوص الأمان وسلامة الدفتر لخادم بركات (تعمل بعد e2e على قاعدة الاختبار نفسها).
// DB=<اسم القاعدة> PORT=54321 node security.mjs
import {execFileSync} from 'node:child_process';
const F=`http://127.0.0.1:${process.env.PORT||54321}/functions/v1/barakat-api`;
const sql=(s,role)=>execFileSync('psql',['-d',process.env.DB,'-Atq','-v','ON_ERROR_STOP=1','-c',s],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const sqlErr=s=>{try{sql(s);return null}catch(e){return String(e.stderr||e.message)}};
let ok=0;const T=(c,m)=>{if(!c)throw new Error('FAIL: '+m);ok++;console.log('✓',m)};
const call=async(tok,op,name,data)=>{const r=await fetch(F,{method:'POST',headers:{'Content-Type':'application/json',apikey:'local-anon-key',...(tok?{Authorization:'Bearer '+tok}:{})},body:JSON.stringify({op,name,data})});return {status:r.status,...await r.json()}};
const login=async(id,pw)=>{const j=await call(null,'sys','login',{id,pw});return j.session&&j.session.access_token};

const vis=await call(null,'sys','state');
T(vis.state.db.users.length===0&&vis.state.db.tx.length===0&&vis.state.me===null,'الزائر: لا يرى أي عميل أو حركة');
T(!(await login('client@barakat.qa','كلمة-خاطئة')),'كلمة مرور خاطئة تُرفض');
const tc=await login('client@barakat.qa','Client@2026');T(tc,'العميل: الدخول عبر الخادم يعطي جلسة');
const st=await call(tc,'sys','state');const me=st.state.db.users[0];
T(st.state.db.users.length===1&&!JSON.stringify(st.state.db).includes('maryam@barakat.qa')&&st.state.db.log.length===0,'العميل: يرى بياناته وحده (لا بيانات عملاء آخرين ولا سجل الإدارة)');
T(st.state.db.tx.every(t=>t.uid===me.id),'العميل: كل الحركات المرسلة له حركاته هو');
let j=await call(tc,'act','cashok',{id:'x'});T(j.status===400&&j.error.includes('للإدارة فقط'),'العميل: عمليات الإدارة مرفوضة من الخادم');
j=await call(tc,'act','ustat',{id:me.id,v:'active'});T(j.status===400,'العميل: لا يستطيع تفعيل حسابه أو تغيير حالته');
j=await call(tc,'act','doTransfer',{id:me.id,v:'10'});T(j.status===400,'العميل: التحويل إلى نفسه مرفوض');
j=await call(tc,'form','transfer',{to:'66234567',amt:'10',note:''});const mid=(j.fx.find(f=>f[0]==='dialog')||[])[1].match(/data-id="([^"]+)"/)[1];
j=await call(tc,'act','doTransfer',{id:mid,v:'-500'});T(j.status===400,'العميل: مبلغ سالب مرفوض');
j=await call(tc,'act','doTransfer',{id:mid,v:'99999999'});T(j.status===400&&j.error.includes('الرصيد'),'العميل: مبلغ يتجاوز الرصيد مرفوض');
j=await call('forged.token.value','act','doTransfer',{id:mid,v:'10'});T(j.status===400&&j.error.includes('سجّل الدخول'),'رمز دخول مزوّر يُعامل كزائر');
j=await call(tc,'form','fin',{product:'__proto__',amount:'1000',term:'12',asset:'xxxx'});T(j.status===400,'صيغة تمويل غير معروفة مرفوضة');
j=await call(tc,'form','give',{kind:'qard',amt:'10'});T(j.status===400,'التبرع إلى صندوق غير مسموح مرفوض');
// concurrency: 6 parallel transfers
const b0=me.bal.current;
const rs=await Promise.all([1,2,3,4,5,6].map(()=>call(tc,'act','doTransfer',{id:mid,v:'10',n:'اختبار تزامن'})));
T(rs.every(r=>r.status===200),'ست تحويلات متزامنة نُفّذت كلها');
const after=(await call(tc,'sys','state')).state.db.users[0].bal.current;
T(Math.abs(after-(b0-60))<0.001,`الرصيد بعد التزامن صحيح (${b0} − 60 = ${after})`);
// ledger integrity in the database
const bad=sql(`select count(*) from accounts a where a.balance <> coalesce((select sum(amount) from transactions t where t.user_id=a.user_id and t.account=a.kind),0)`);
T(bad==='0','سلامة الدفتر: رصيد كل حساب في الجدول = مجموع حركاته');
const last=sql(`select count(*) from accounts a where exists(select 1 from transactions t where t.user_id=a.user_id and t.account=a.kind) and a.balance <> (select balance_after from transactions t where t.user_id=a.user_id and t.account=a.kind order by at desc, id desc limit 1)`);
T(last==='0','سلامة الدفتر: آخر «رصيد بعدها» في كشف الحساب = الرصيد الحالي');
// row level security
const asUser=s=>sql(`begin; set local role authenticated; set local request.jwt.claim.sub='${me.id}'; ${s}; commit;`);
T(asUser('select count(*) from profiles').endsWith('1'),'قاعدة البيانات (RLS): العميل يقرأ ملفه وحده');
T(asUser(`select count(*) from transactions where user_id<>'${me.id}'`).endsWith('0'),'قاعدة البيانات (RLS): لا يقرأ حركات غيره');
T(asUser('select count(*) from statements')===asUser(`select count(*) from transactions where user_id='${me.id}'`),'كشف الحساب (statements) يعرض حركاته وحده');
T(/permission denied/.test(sqlErr(`begin; set local role authenticated; insert into transactions(id,user_id,account,amount,type) values('hack','${me.id}','current',1000000,'deposit'); commit;`)||''),'قاعدة البيانات: العميل لا يستطيع إضافة حركة مباشرة');
T(/permission denied/.test(sqlErr(`begin; set local role authenticated; update accounts set balance=1e9; commit;`)||''),'قاعدة البيانات: العميل لا يستطيع تعديل رصيده');
T(/permission denied/.test(sqlErr(`begin; set local role authenticated; select barakat_commit(0,'{}'); commit;`)||''),'قاعدة البيانات: دالة الحفظ محصورة في خادم بركات');
T(/permission denied/.test(sqlErr(`begin; set local role anon; select * from profiles; commit;`)||''),'قاعدة البيانات: الزائر المجهول لا يقرأ أي جدول');
T(/barakat_conflict/.test(sqlErr(`select barakat_commit(-1,'{}')`)||''),'الحفظ بإصدار قديم يُرفض (حماية من التعارض)');
// passwords
j=await call(tc,'sys','pw',{old:'خطأ',pw:'NewPass@2026'});T(j.status===400,'تغيير كلمة المرور يتطلب الحالية الصحيحة');
const ta=await login('admin@barakat.qa','Barakat@Admin2026');T(ta,'المدير: الدخول عبر الخادم');
const ys=(await call(ta,'sys','state')).state.db.users.find(u=>u.email==='yousef@barakat.qa');
j=await call(ta,'sys','resetpw',{id:ys.id});const tmp=j.fx[0][1].match(/>(BR\d{6}@)</)[1];
T(await login('yousef@barakat.qa',tmp)&&!(await login('yousef@barakat.qa','Client@2026')),'المدير: كلمة المرور المؤقتة تعمل والقديمة لم تعد تعمل');
const adm=(await call(ta,'sys','state')).state.db;T(adm.users.length>=5&&adm.log.length>10,`المدير: يرى كل العملاء (${adm.users.length}) وسجل العمليات (${adm.log.length})`);
T(sql(`select count(*) from audit_log where what like 'تحويل%'`)>='6','سجل التدقيق محفوظ في قاعدة البيانات');
console.log(`SECURITY PASSED ${ok}`);
