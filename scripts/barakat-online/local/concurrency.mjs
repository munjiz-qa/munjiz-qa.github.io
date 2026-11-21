// تزامن حقيقي: 16 تحويلاً في وقت واحد عبر نسختين مستقلتين من الخادم على القاعدة نفسها، دون فقد أي عملية.
// PORT=54321 PORT2=54322 node concurrency.mjs
const A=+(process.env.PORT||54321),B=+(process.env.PORT2||54322);
const call=async(port,tok,op,name,data)=>{const r=await fetch(`http://127.0.0.1:${port}/functions/v1/barakat-api`,{method:'POST',headers:{'Content-Type':'application/json',...(tok?{Authorization:'Bearer '+tok}:{})},body:JSON.stringify({op,name,data})});return {status:r.status,...await r.json()}};
const tok=async p=>(await call(p,null,'sys','login',{id:'maryam@barakat.qa',pw:'Client@2026'})).session.access_token;
const t1=await tok(A),t2=await tok(B);
const b0=(await call(A,t1,'sys','state')).state.db.users[0].bal.current;
const j=await call(A,t1,'form','transfer',{to:'55123456',amt:'1'});const id=j.fx.find(f=>f[0]==='dialog')[1].match(/data-id="([^"]+)"/)[1];
const rs=await Promise.all(Array.from({length:16},(_,i)=>call(i%2?A:B,i%2?t1:t2,'act','doTransfer',{id,v:'1',n:'تزامن بين خادمين'})));
const b1=(await call(A,t1,'sys','state')).state.db.users[0].bal.current;
const n=rs.filter(r=>r.status===200).length;
if(n!==16||Math.abs(b1-(b0-16))>0.001){console.error('FAIL: concurrency',rs.map(r=>r.status),b0,b1);process.exit(1)}
console.log(`✓ تزامن بين خادمين: 16 تحويلاً متزامناً نُفّذت كلها والرصيد ${b0} − 16 = ${b1}`);
