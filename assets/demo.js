// منجز: النسخة التجريبية. تشغّل خادم نظام العملاء (Code.gs نفسه) داخل المتصفح، فوق تخزين المتصفح بدلاً من Google Sheets،
// ببيانات تجريبية. تعمل فقط عندما لا يكون رابط الخادم (API) مضبوطاً في config.js، وبعد اختيار «جرّب النسخة التجريبية» (?demo=1).
// كل ما يُدخل هنا يبقى في هذا المتصفح فقط ولا يصل إلى منجز. ملف مولّد: لا تعدّله يدوياً، بل أعد توليده من Code.gs.
(function(){

var CFG=window.MUNJIZ_CONFIG=window.MUNJIZ_CONFIG||{};
if(CFG.API)return;
var FLAG='munjiz_demo',KEY='munjiz_demo_db',MAILK='munjiz_demo_mail';
var q=new URLSearchParams(location.search);
try{if(q.get('demo')==='1')localStorage.setItem(FLAG,'1');if(q.get('demo')==='0')localStorage.removeItem(FLAG)}catch(e){}
var on=false;try{on=localStorage.getItem(FLAG)==='1'}catch(e){}
window.MUNJIZ_DEMO={on:on,start:function(){try{localStorage.setItem(FLAG,'1')}catch(e){}location.reload()},
  stop:function(){try{localStorage.removeItem(FLAG)}catch(e){}location.href=location.pathname},
  reset:function(){try{localStorage.removeItem(KEY);localStorage.removeItem(MAILK);localStorage.removeItem('munjiz_portal');localStorage.removeItem('munjiz_crm_token')}catch(e){}location.reload()}};
if(!on)return;
CFG.API='demo://munjiz';CFG.DEMO=true;

// ---------- storage ----------
var DB;try{DB=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){DB=null}
var fresh=!DB;DB=DB||{sheets:{},props:{},files:{},folders:{},seq:0};
function persist(){try{localStorage.setItem(KEY,JSON.stringify(DB))}catch(e){throw new Error('demo_storage_full')}}

// ---------- bytes, SHA-256, HMAC, base64 ----------
var enc=new TextEncoder(),dec=new TextDecoder();
var signed=function(u){return Array.prototype.map.call(u,function(b){return b>127?b-256:b})};
var unsigned=function(a){return Uint8Array.from(a,function(b){return (b+256)%256})};
var K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
function sha256(m){
  var l=m.length,bl=((l+9+63)>>6)<<6,b=new Uint8Array(bl);b.set(m);b[l]=0x80;var bits=l*8;
  for(var i=0;i<8;i++)b[bl-1-i]=(i<4?(bits>>>(8*i)):Math.floor(bits/4294967296)>>>(8*(i-4)))&255;
  var h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],w=new Array(64);
  for(var o=0;o<bl;o+=64){
    for(i=0;i<16;i++)w[i]=(b[o+4*i]<<24)|(b[o+4*i+1]<<16)|(b[o+4*i+2]<<8)|b[o+4*i+3];
    for(i=16;i<64;i++){var x=w[i-15],y=w[i-2];w[i]=(((x>>>7|x<<25)^(x>>>18|x<<14)^(x>>>3))+w[i-7]+((y>>>17|y<<15)^(y>>>19|y<<13)^(y>>>10))+w[i-16])|0}
    var a=h[0],c=h[1],d=h[2],e=h[3],f=h[4],g=h[5],k=h[6],n=h[7];
    for(i=0;i<64;i++){var t1=(n+((f>>>6|f<<26)^(f>>>11|f<<21)^(f>>>25|f<<7))+((f&g)^(~f&k))+K[i]+w[i])|0,t2=(((a>>>2|a<<30)^(a>>>13|a<<19)^(a>>>22|a<<10))+((a&c)^(a&d)^(c&d)))|0;
      n=k;k=g;g=f;f=(e+t1)|0;e=d;d=c;c=a;a=(t1+t2)|0}
    h[0]=(h[0]+a)|0;h[1]=(h[1]+c)|0;h[2]=(h[2]+d)|0;h[3]=(h[3]+e)|0;h[4]=(h[4]+f)|0;h[5]=(h[5]+g)|0;h[6]=(h[6]+k)|0;h[7]=(h[7]+n)|0}
  var out=new Uint8Array(32);for(i=0;i<8;i++){out[4*i]=h[i]>>>24;out[4*i+1]=h[i]>>>16&255;out[4*i+2]=h[i]>>>8&255;out[4*i+3]=h[i]&255}return out}
function hmac(msg,key){key=enc.encode(key);if(key.length>64)key=sha256(key);var k=new Uint8Array(64);k.set(key);
  var ip=new Uint8Array(64),op=new Uint8Array(64);for(var i=0;i<64;i++){ip[i]=k[i]^0x36;op[i]=k[i]^0x5c}
  var m=enc.encode(msg),inner=new Uint8Array(64+m.length);inner.set(ip);inner.set(m,64);var ih=sha256(inner),outer=new Uint8Array(96);outer.set(op);outer.set(ih,64);return sha256(outer)}
function toBytes(v){return typeof v==='string'?enc.encode(v):unsigned(v)}
function b64(u){var s='';for(var i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)}
function unb64(s){s=String(s).replace(/-/g,'+').replace(/_/g,'/');var bin=atob(s),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u}
var pad=function(n){return ('0'+n).slice(-2)};

// ---------- Apps Script services ----------
var Utilities={DigestAlgorithm:{SHA_256:'SHA_256'},Charset:{UTF_8:'UTF_8'},
  getUuid:function(){return crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16)})},
  computeDigest:function(alg,s){return signed(sha256(enc.encode(String(s))))},
  computeHmacSha256Signature:function(v,k){return signed(hmac(String(v),String(k)))},
  base64Encode:function(v){return b64(toBytes(v))},
  base64EncodeWebSafe:function(v){return b64(toBytes(v)).replace(/\+/g,'-').replace(/\//g,'_')},
  base64Decode:function(s){return signed(unb64(s))},
  newBlob:function(data,mime,name){var u=toBytes(data==null?'':data);return {getBytes:function(){return signed(u)},getDataAsString:function(){return dec.decode(u)},getName:function(){return name||''},getContentType:function(){return mime||'text/plain'},_u:u}},
  formatDate:function(d,tz,f){return f.replace('yyyy',d.getFullYear()).replace('MM',pad(d.getMonth()+1)).replace('dd',pad(d.getDate())).replace('HH',pad(d.getHours())).replace('mm',pad(d.getMinutes())).replace('ss',pad(d.getSeconds()))},
  sleep:function(){}};
var Session={getScriptTimeZone:function(){return 'Asia/Qatar'}};
var Logger={log:function(){}};
var LockService={getScriptLock:function(){return {waitLock:function(){},releaseLock:function(){}}}};
var CACHE={};var CacheService={getScriptCache:function(){return {get:function(k){var c=CACHE[k];return c&&c.e>Date.now()?c.v:null},put:function(k,v,s){CACHE[k]={v:String(v),e:Date.now()+(s||600)*1000}}}}};
var PropertiesService={getScriptProperties:function(){return {getProperty:function(k){return DB.props[k]==null?null:DB.props[k]},setProperty:function(k,v){DB.props[k]=String(v);persist()}}}};
var MailApp={getRemainingDailyQuota:function(){return 100},sendEmail:function(o){var l=[];try{l=JSON.parse(localStorage.getItem(MAILK)||'[]')}catch(e){}
  l.unshift({at:new Date().toISOString(),to:o.to,subject:o.subject});try{localStorage.setItem(MAILK,JSON.stringify(l.slice(0,50)))}catch(e){}}};
var ScriptApp={getProjectTriggers:function(){return []},deleteTrigger:function(){},newTrigger:function(){var t={timeBased:function(){return t},everyDays:function(){return t},atHour:function(){return t},create:function(){return t}};return t}};
var ContentService={MimeType:{JSON:'json'},createTextOutput:function(s){return {s:s,setMimeType:function(){return this},getContent:function(){return this.s}}}};
function Range(sh,r,c,nr,nc){this.sh=sh;this.r=r;this.c=c;this.nr=nr||1;this.nc=nc||1}
Range.prototype.getValues=function(){var o=[];for(var i=0;i<this.nr;i++){var row=this.sh.rows[this.r-1+i]||[],x=[];for(var j=0;j<this.nc;j++)x.push(row[this.c-1+j]==null?'':row[this.c-1+j]);o.push(x)}return o};
Range.prototype.setValues=function(v){for(var i=0;i<v.length;i++){var row=this.sh.rows[this.r-1+i]||(this.sh.rows[this.r-1+i]=[]);for(var j=0;j<v[i].length;j++)row[this.c-1+j]=v[i][j]}persist();return this};
Range.prototype.setFontWeight=Range.prototype.setNumberFormat=function(){return this};
function Sheet(name){this.name=name;this.rows=DB.sheets[name]}
Sheet.prototype.getLastRow=function(){return this.rows.length};
Sheet.prototype.getRange=function(r,c,nr,nc){return new Range(this,r,c,nr,nc)};
Sheet.prototype.deleteRow=function(i){this.rows.splice(i-1,1);persist()};
Sheet.prototype.setFrozenRows=function(){};
var SpreadsheetApp={getActive:function(){return {getSheetByName:function(n){return DB.sheets[n]?new Sheet(n):null},insertSheet:function(n){DB.sheets[n]=[];persist();return new Sheet(n)}}}};
function folder(id){var f=DB.folders[id];return f&&{getId:function(){return id},
  getFoldersByName:function(n){var l=Object.keys(DB.folders).filter(function(k){return DB.folders[k].parent===id&&DB.folders[k].name===n}),i=0;return {hasNext:function(){return i<l.length},next:function(){return folder(l[i++])}}},
  createFolder:function(n){return newFolder(n,id)},
  createFile:function(blob){var fid='demo'+(++DB.seq);DB.files[fid]={name:blob.getName(),mime:blob.getContentType(),b64:b64(blob._u||toBytes(blob.getBytes())),folder:id};persist();return file(fid)}}}
function newFolder(n,parent){var id='fd'+(++DB.seq);DB.folders[id]={name:n,parent:parent||''};persist();return folder(id)}
function file(id){var f=DB.files[id];if(!f)throw new Error('not_found');return {getId:function(){return id},getUrl:function(){return '#demo-file-'+id},getName:function(){return f.name},
  getBlob:function(){return Utilities.newBlob(unb64(f.b64),f.mime,f.name)},setTrashed:function(){delete DB.files[id];persist()}}}
var DriveApp={createFolder:function(n){return newFolder(n)},getFolderById:function(id){var f=folder(id);if(!f)throw new Error('not_found');return f},getFileById:file};

// ---------- Code.gs (unchanged) ----------
/**
 * منجز لخدمات الأعمال: خادم نظام العملاء والطلبات (Google Apps Script + Google Sheets)
 *
 * ما يفعله:
 *  - يستقبل طلبات الموقع ويحفظها في ورقة «الطلبات»، وينشئ العميل أو يربطه برقم جواله.
 *  - يرسل للعميل رداً تلقائياً بالبريد برقم الطلب، ويرسل إشعاراً لبريد المكتب.
 *  - يخدم صفحة «نظام العملاء» (crm.html): العملاء، المعاملات، الطلبات، السجل، إرسال البريد.
 *  - يرسل كل صباح تذكيراً للمكتب بالتجديدات القريبة والمعاملات المتأخرة.
 *  - يخدم صفحة «حسابي» (portal.html): حساب لكل عميل باسم مستخدم وكلمة مرور، يطلب منه الخدمات
 *    ويتابع طلباته ومعاملاته وينزّل ملفاته وتراخيصه. الملفات تُحفظ خاصة في Google Drive للمكتب
 *    ولا يصل إليها العميل إلا عبر حسابه.
 *
 * التشغيل لأول مرة: راجع ملف «اقرأني - تشغيل نظام العملاء.txt».
 */

var SHEETS = {
  Clients: ['id','created','name','type','phone','email','qid','cr','estCard','taxNo','plan','planEnd','address','source','requirements','notes','updated'],
  Transactions: ['id','created','clientId','code','service','status','fee','govFee','paid','govRef','startDate','dueDate','expiryDate','assignee','docs','notes','closed','updated'],
  Requests: ['id','created','name','phone','email','type','plan','services','codes','lang','status','clientId','mailed','notes','updated'],
  Log: ['id','created','clientId','txnId','kind','subject','body','by'],
  Accounts: ['id','created','clientId','username','salt','hash','status','lastLogin','updated'],
  Files: ['id','created','clientId','txnId','title','url','fileId','by'],
  Consents: ['id','created','clientId','name','phone','docs','version','lang','source'],
  Credentials: ['id','created','clientId','portal','username','secret','note','by','updated'],
  Messages: ['id','created','clientId','from','by','body','read'],
  Staff: ['id','created','username','name','role','salt','hash','status','mustChange','lastLogin','updated',
          'jobTitle','phone','email','qid','hireDate','shiftStart','shiftEnd','workDays','perms','notes'],
  Sessions: ['id','created','staffId','username','login','lastSeen','logout','minutes','closedBy'],
  Activity: ['id','created','staffId','username','action','sheet','recordId','clientId','summary']
};
var PREFIX = {Clients:'C', Transactions:'T', Requests:'R', Log:'L', Accounts:'A', Files:'F', Consents:'K', Credentials:'P', Messages:'M', Staff:'S', Sessions:'W', Activity:'X'};
// permissions an admin grants to each employee; an admin has all of them plus staff management and reports
var PERMS = ['requests','clients_view','clients_edit','transactions','finance','messages','files','accounts','credentials','email','delete','log'];
var SESSION = null;   // the attendance session id of the current staff request
// first admin login; the system forces a change of both on first sign-in
var FIRST_ADMIN_USER = '123', FIRST_ADMIN_PASSWORD = '123';
var STAFF = null;   // the signed-in staff member for the current request
// legal documents the client accepts (legal.html). Bump LEGAL_VERSION when the text changes.
var LEGAL_VERSION = '1.0';
var LEGAL_DOCS = 'اتفاقية الخدمة، حدود المسؤولية، التفويض، البيانات والسرية';
var TOKEN_HOURS = 12;          // staff session
var CLIENT_TOKEN_HOURS = 24;   // client session
var PW_ROUNDS = 500;
var MAX_UPLOAD_MB = 10;
var ACC_ACTIVE = 'مفعّل', ACC_PENDING = 'بانتظار التفعيل', ACC_OFF = 'موقوف';
// what a client may see of their own records (internal notes and staff fields stay hidden)
var CLIENT_FIELDS = ['id','name','type','phone','email','qid','cr','estCard','taxNo','plan','planEnd','address'];
var CLIENT_EDITABLE = ['name','type','email','qid','cr','estCard','taxNo','address'];
var TXN_FIELDS = ['id','created','code','service','status','fee','govFee','paid','govRef','startDate','dueDate','expiryDate','docs','closed','updated'];
var REQ_FIELDS = ['id','created','services','plan','status','updated'];

// ---------- setup (run once from the editor) ----------
function setup() {
  var ss = SpreadsheetApp.getActive();
  Object.keys(SHEETS).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    sh.getRange(1, 1, 1, SHEETS[name].length).setValues([SHEETS[name]]).setFontWeight('bold');
    sh.setFrozenRows(1);
  });
  var p = PropertiesService.getScriptProperties();
  if (!p.getProperty('SECRET')) p.setProperty('SECRET', Utilities.getUuid() + Utilities.getUuid());
  if (!p.getProperty('OFFICE_EMAIL')) p.setProperty('OFFICE_EMAIL', 'munijizqa@gmail.com');
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'dailyReminders') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('dailyReminders').timeBased().everyDays(1).atHour(7).create();
  ensureAdmin();
  Logger.log('تم الإعداد. الدخول الأول للإدارة: اسم المستخدم 123 وكلمة المرور 123، وسيطلب النظام تغييرهما فوراً. بريد المكتب: ' + p.getProperty('OFFICE_EMAIL'));
}

// ---------- HTTP ----------
function doGet() { return json({ok: true, service: 'munjiz-crm'}); }

function doPost(e) {
  var req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json({ok: false, error: 'bad_json'}); }
  try {
    if (req.action === 'request') return json(publicRequest(req));
    if (req.action === 'register') return json(publicRegister(req));
    if (req.action === 'login') return json(login(req.username, req.password));
    if (req.action === 'signup') return json(clientSignup(req));
    if (req.action === 'clogin') return json(clientLogin(req));
    if (['cme', 'cprofile', 'crequest', 'cpass', 'cfile', 'ccred', 'ccreddel', 'cmsg'].indexOf(req.action) >= 0) {
      var acc = checkClientToken(req.token);
      if (!acc) return json({ok: false, error: 'auth'});
      switch (req.action) {
        case 'cme': return json(clientMe(acc));
        case 'cprofile': return json(withLock(function () { return clientProfile(acc, req.profile || {}); }));
        case 'crequest': return json(clientRequest(acc, req));
        case 'cpass': return json(withLock(function () { return clientPassword(acc, req.old, req.password); }));
        case 'cfile': return json(clientFile(acc, req.id));
        case 'cmsg': return json(withLock(function () { return clientMessage(acc, req.body); }));
        case 'ccred': return json(withLock(function () { return clientCredential(acc, req); }));
        case 'ccreddel': return json(withLock(function () { return clientCredentialDelete(acc, req.id); }));
        default: return json({ok: false, error: 'unknown_action'});
      }
    }
    STAFF = checkToken(req.token);
    if (!STAFF) return json({ok: false, error: 'auth'});
    if (req.action === 'staffMe') return json({ok: true, me: publicStaff(STAFF)});
    if (req.action === 'staffPass') return json(withLock(function () { return staffChangeOwn(req); }));
    if (req.action === 'staffLogout') return json(withLock(function () { return staffLogout(); }));
    if (STAFF.mustChange) return json({ok: false, error: 'must_change'});
    var need = permFor(req);
    if (need && !can(need)) return json({ok: false, error: need === 'admin' ? 'admin_only' : 'no_permission'});
    touchSession();
    switch (req.action) {
      case 'list': return json({ok: true, data: listAll(), me: publicStaff(STAFF)});
      case 'staffUsers': return json({ok: true, rows: rows('Staff').map(publicStaff), perms: PERMS});
      case 'staffSave': return json(withLock(function () { return staffSave(req); }));
      case 'report': return json(staffReport(req.from, req.to));
      case 'reportEmail': return json(emailReport(req.from, req.to));
      case 'reply': return json(withLock(function () { return staffReply(req); }));
      case 'save':
        if (req.sheet === 'Accounts') return json({ok: false, error: 'use_clientAccount'});
        if (['Credentials', 'Consents', 'Staff', 'Messages', 'Sessions', 'Activity'].indexOf(req.sheet) >= 0) return json({ok: false, error: 'read_only'});
        if (req.sheet === 'Log' && req.row) req.row.by = STAFF.username;
        return json(withLock(function () { return {ok: true, row: staffSaveRow(req.sheet, req.row || {})}; }));
      case 'delete': return json(withLock(function () {
        if (['Staff', 'Consents', 'Sessions', 'Activity'].indexOf(req.sheet) >= 0) return {ok: false, error: 'read_only'};
        if (req.sheet === 'Files') trashDriveFile(req.id);
        var gone = rows(req.sheet).filter(function (x) { return x.id === req.id; })[0] || {};
        var done = deleteRow(req.sheet, req.id);
        if (done) audit('delete', req.sheet, req.id, gone.clientId || (req.sheet === 'Clients' ? req.id : ''), 'حذف ' + (gone.service || gone.name || gone.title || req.id));
        return {ok: done};
      }));
      case 'sendEmail': return json(withLock(function () { var r = sendClientEmail(req); if (r.ok) audit('email', 'Log', '', req.clientId, 'بريد للعميل: ' + clean(req.subject, 120)); return r; }));
      case 'clientAccount': return json(withLock(function () { var r = staffAccount(req); if (r.ok) audit('account', 'Accounts', r.row.id, req.clientId, 'حساب العميل: ' + r.row.status + (req.password ? ' · كلمة مرور جديدة' : '')); return r; }));
      case 'upload': return json(withLock(function () { var r = staffUpload(req); if (r.ok) audit('file', 'Files', r.row.id, req.clientId, 'رفع ملف: ' + r.row.title); return r; }));
      case 'reveal': return json(withLock(function () { return staffReveal(req.id); }));
      default: return json({ok: false, error: 'unknown_action'});
    }
  } catch (err) { return json({ok: false, error: String(err && err.message || err)}); }
}

function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function withLock(fn) { var l = LockService.getScriptLock(); l.waitLock(20000); try { return fn(); } finally { l.releaseLock(); } }
function prop(k) { return PropertiesService.getScriptProperties().getProperty(k) || ''; }

// ---------- auth ----------
function sign(s) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(s, prop('SECRET'))); }
// staff (admin and employees) sign in with a username and password stored as salted hashes in the Staff sheet
function ensureAdmin() {
  if (rows('Staff').length) return;
  var salt = Utilities.getUuid();
  saveRow('Staff', {username: FIRST_ADMIN_USER, name: 'المدير', role: 'admin', salt: salt, hash: hashPw(salt, FIRST_ADMIN_PASSWORD), status: ACC_ACTIVE, mustChange: 'نعم', lastLogin: ''});
}
function permsOf(x) { return x.role === 'admin' ? PERMS.slice() : String(x.perms || '').split(',').filter(function (p) { return PERMS.indexOf(p) >= 0; }); }
function can(p) { return STAFF.role === 'admin' || (p !== 'admin' && permsOf(STAFF).indexOf(p) >= 0); }
// which permission each staff action needs (the browser hides what an employee cannot do; this is the real check)
function permFor(r) {
  var a = r.action, sh = r.sheet;
  if (['staffUsers', 'staffSave', 'report', 'reportEmail'].indexOf(a) >= 0) return 'admin';
  if (a === 'reply') return 'messages';
  if (a === 'sendEmail') return 'email';
  if (a === 'clientAccount') return 'accounts';
  if (a === 'upload') return 'files';
  if (a === 'reveal') return 'credentials';
  if (a === 'delete') return sh === 'Clients' || sh === 'Accounts' || sh === 'Log' ? 'admin' : 'delete';
  if (a === 'save') return {Clients: 'clients_edit', Transactions: 'transactions', Requests: 'requests', Files: 'files'}[sh] || '';
  return '';
}
function publicStaff(x) {
  return {id: x.id, created: x.created, username: x.username, name: x.name, role: x.role, status: x.status, mustChange: x.mustChange ? 'نعم' : '', lastLogin: x.lastLogin,
    jobTitle: x.jobTitle, phone: x.phone, email: x.email, qid: x.qid, hireDate: x.hireDate, shiftStart: x.shiftStart, shiftEnd: x.shiftEnd, workDays: x.workDays, notes: x.notes, perms: permsOf(x)};
}
function login(user, pw) {
  user = clean(user, 40).toLowerCase(); pw = String(pw || '');
  if (!user || !pw) return {ok: false, error: 'wrong_password'};
  if (!bump('sl_' + user, 10)) return {ok: false, error: 'rate_limited'};
  Utilities.sleep(300);
  withLock(ensureAdmin);
  var st = rows('Staff').filter(function (x) { return String(x.username).toLowerCase() === user; })[0];
  if (!st || st.status !== ACC_ACTIVE || hashPw(st.salt, pw) !== st.hash) return {ok: false, error: 'wrong_password'};
  var sess = withLock(function () {
    st.lastLogin = now(); saveRow('Staff', st);
    // attendance: close any session left open (token expired or browser closed), then open a new one
    rows('Sessions').filter(function (x) { return x.staffId === st.id && !x.logout; }).forEach(function (x) { closeSession(x, 'انتهت دون خروج'); });
    return saveRow('Sessions', {staffId: st.id, username: st.username, login: now(), lastSeen: now(), logout: '', minutes: '', closedBy: ''});
  });
  var exp = String(Date.now() + TOKEN_HOURS * 3600 * 1000), body = st.id + '.' + sess.id + '.' + exp;
  return {ok: true, token: 's.' + body + '.' + sign('s|' + body), me: publicStaff(st)};
}
function checkToken(t) {
  var p = String(t || '').split('.');
  if (p.length !== 5 || p[0] !== 's' || p[4] !== sign('s|' + p[1] + '.' + p[2] + '.' + p[3]) || Number(p[3]) < Date.now()) return null;
  var st = rows('Staff').filter(function (x) { return x.id === p[1]; })[0];
  if (!st || st.status !== ACC_ACTIVE) return null;
  SESSION = p[2];
  return st;
}
function mins(a, b) { var x = parseDate(a), y = parseDate(b); return x && y ? Math.max(0, Math.round((y - x) / 60000)) : 0; }
function parseDate(s) { if (!s) return null; var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?/); return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) : null; }
function closeSession(x, why) { x.logout = x.lastSeen || x.login; x.minutes = mins(x.login, x.logout); x.closedBy = why; saveRow('Sessions', x); }
// last activity is written at most every 5 minutes so an idle-closed session still shows its real working time
function touchSession() {
  if (!SESSION) return;
  var c = CacheService.getScriptCache(), k = 'ss_' + SESSION;
  if (c.get(k)) return;
  c.put(k, '1', 300);
  withLock(function () { var x = rows('Sessions').filter(function (y) { return y.id === SESSION; })[0]; if (x && !x.logout) { x.lastSeen = now(); saveRow('Sessions', x); } });
}
function staffLogout() {
  var x = rows('Sessions').filter(function (y) { return y.id === SESSION; })[0];
  if (x && !x.logout) { x.lastSeen = now(); x.logout = now(); x.minutes = mins(x.login, x.logout); x.closedBy = 'خروج'; saveRow('Sessions', x); }
  return {ok: true};
}
// every change a staff member makes is recorded for the admin's reports
function audit(action, sheetName, recordId, clientId, summary) {
  saveRow('Activity', {staffId: STAFF ? STAFF.id : '', username: STAFF ? STAFF.username : 'system', action: action, sheet: sheetName, recordId: recordId || '', clientId: clientId || '', summary: String(summary || '').slice(0, 300)});
}
function staffSaveRow(name, row) {
  var before = row.id ? rows(name).filter(function (x) { return x.id === row.id; })[0] : null;
  if (name === 'Transactions' && !can('finance')) {   // employees without the finance permission cannot see or change fees
    ['fee', 'govFee', 'paid'].forEach(function (k) { row[k] = before ? before[k] : ''; });
  }
  var r = saveRow(name, row);
  if (name === 'Log') return r;
  var what = {Clients: 'عميل', Transactions: 'معاملة', Requests: 'طلب', Files: 'ملف'}[name] || name;
  var label = r.service || r.name || r.title || r.id, summary;
  if (!before) summary = 'إضافة ' + what + ': ' + label + (r.status ? ' · ' + r.status : '');
  else if (before.status !== r.status && r.status) summary = what + ' ' + r.id + ' (' + label + '): ' + (before.status || '') + ' ← ' + r.status;
  else summary = 'تعديل ' + what + ' ' + r.id + ' (' + label + ')';
  audit(!before ? 'create' : (before.status !== r.status ? 'status' : 'edit'), name, r.id, name === 'Clients' ? r.id : r.clientId, summary);
  return r;
}

function staffChangeOwn(r) {
  var st = STAFF;
  if (hashPw(st.salt, String(r.old || '')) !== st.hash) return {ok: false, error: 'wrong_password'};
  if (r.username != null) {
    var u = clean(r.username, 40).toLowerCase();
    if (!/^[^\s]{3,40}$/.test(u)) return {ok: false, error: 'bad_username'};
    if (rows('Staff').some(function (x) { return String(x.username).toLowerCase() === u && x.id !== st.id; })) return {ok: false, error: 'username_taken'};
    st.username = u;
  }
  if (r.password) {
    if (!validPw(r.password)) return {ok: false, error: 'weak_password'};
    st.salt = Utilities.getUuid(); st.hash = hashPw(st.salt, r.password);
  }
  if (st.mustChange && (!r.password || st.username === FIRST_ADMIN_USER)) return {ok: false, error: 'must_change_both'};
  st.mustChange = '';
  saveRow('Staff', st);
  saveRow('Log', {kind: 'account', subject: 'الموظف ' + st.username + ' حدّث بيانات دخوله', body: '', by: st.username});
  return {ok: true, me: publicStaff(st)};
}
function staffSave(r) {
  var all = rows('Staff'), st = r.id ? all.filter(function (x) { return x.id === r.id; })[0] : null;
  if (r.id && !st) return {ok: false, error: 'not_found'};
  var isNew = !st;
  st = st || {status: ACC_ACTIVE, lastLogin: ''};
  var u = clean(r.username != null ? r.username : st.username, 40).toLowerCase();
  if (!/^[^\s]{3,40}$/.test(u)) return {ok: false, error: 'bad_username'};
  if (all.some(function (x) { return String(x.username).toLowerCase() === u && x.id !== st.id; })) return {ok: false, error: 'username_taken'};
  st.username = u;
  ['name', 'jobTitle', 'phone', 'email', 'qid', 'hireDate', 'shiftStart', 'shiftEnd', 'workDays', 'notes'].forEach(function (k) { if (r[k] != null) st[k] = clean(r[k], k === 'notes' ? 500 : 80); });
  if (r.role === 'admin' || r.role === 'staff') st.role = r.role;
  if (!st.role) st.role = 'staff';
  if (r.perms) st.perms = (Array.isArray(r.perms) ? r.perms : String(r.perms).split(',')).filter(function (p) { return PERMS.indexOf(p) >= 0; }).join(',');
  if ([ACC_ACTIVE, ACC_OFF].indexOf(r.status) >= 0) st.status = r.status;
  if (r.password) { if (!validPw(r.password)) return {ok: false, error: 'weak_password'}; st.salt = Utilities.getUuid(); st.hash = hashPw(st.salt, r.password); st.mustChange = 'نعم'; }
  if (!st.hash) return {ok: false, error: 'weak_password'};
  var admins = all.filter(function (x) { return x.role === 'admin' && x.status === ACC_ACTIVE && x.id !== st.id; });
  if (!admins.length && (st.role !== 'admin' || st.status !== ACC_ACTIVE)) return {ok: false, error: 'last_admin'};
  st = saveRow('Staff', st);
  if (st.status !== ACC_ACTIVE) rows('Sessions').filter(function (x) { return x.staffId === st.id && !x.logout; }).forEach(function (x) { closeSession(x, 'أوقفه المدير'); });
  audit(isNew ? 'staff_create' : 'staff_edit', 'Staff', st.id, '', (isNew ? 'إضافة موظف: ' : 'تعديل موظف: ') + st.username + ' · ' + (st.role === 'admin' ? 'مدير' : 'موظف') + ' · ' + st.status + (r.password ? ' · كلمة مرور مؤقتة' : ''));
  return {ok: true, row: publicStaff(st)};
}

// ---------- staff reports: attendance and work done in a period ----------
function staffReport(from, to) {
  from = /^\d{4}-\d{2}-\d{2}$/.test(from || '') ? from : now().slice(0, 10);
  to = /^\d{4}-\d{2}-\d{2}$/.test(to || '') ? to : from;
  var inRange = function (d) { d = String(d || '').slice(0, 10); return d >= from && d <= to; };
  var sessions = rows('Sessions').filter(function (x) { return inRange(x.login); });
  var acts = rows('Activity').filter(function (x) { return inRange(x.created); });
  var msgs = rows('Messages').filter(function (m) { return m.from === 'office' && inRange(m.created); });
  var staff = rows('Staff').map(function (st) {
    var ss = sessions.filter(function (x) { return x.staffId === st.id; }), aa = acts.filter(function (x) { return x.staffId === st.id; });
    var days = {};
    ss.forEach(function (x) {
      var d = String(x.login).slice(0, 10), m = x.logout ? Number(x.minutes) || 0 : mins(x.login, x.lastSeen || x.login);
      var o = days[d] = days[d] || {date: d, first: x.login.slice(11), last: '', minutes: 0, sessions: 0, open: false};
      if (x.login.slice(11) < o.first) o.first = x.login.slice(11);
      var end = String(x.logout || x.lastSeen || '').slice(11); if (end > o.last) o.last = end;
      o.minutes += m; o.sessions++; if (!x.logout) o.open = true;
    });
    var dayList = Object.keys(days).sort().map(function (d) { var o = days[d]; o.late = !!(st.shiftStart && o.first > addMin(st.shiftStart, 15)); o.early = !!(st.shiftEnd && o.last && !o.open && o.last < st.shiftEnd); return o; });
    var count = function (f) { return aa.filter(f).length; };
    return {id: st.id, username: st.username, name: st.name, jobTitle: st.jobTitle, role: st.role, shiftStart: st.shiftStart, shiftEnd: st.shiftEnd,
      days: dayList, minutes: dayList.reduce(function (a, o) { return a + o.minutes; }, 0), late: dayList.filter(function (o) { return o.late; }).length,
      actions: aa.length, txCreated: count(function (x) { return x.sheet === 'Transactions' && x.action === 'create'; }),
      txDone: count(function (x) { return x.sheet === 'Transactions' && x.action === 'status' && /← منجزة$/.test(x.summary); }),
      statusChanges: count(function (x) { return x.action === 'status'; }), replies: msgs.filter(function (m) { return m.by === st.username; }).length,
      files: count(function (x) { return x.action === 'file'; }), emails: count(function (x) { return x.action === 'email'; }),
      clientsAdded: count(function (x) { return x.sheet === 'Clients' && x.action === 'create'; }),
      log: aa.slice(-200).reverse().map(function (x) { return {created: x.created, action: x.action, summary: x.summary, clientId: x.clientId}; })};
  });
  return {ok: true, from: from, to: to, staff: staff};
}
function addMin(hhmm, n) { var m = String(hhmm).match(/^(\d{1,2}):(\d{2})/); if (!m) return '99:99'; var t = +m[1] * 60 + +m[2] + n; return ('0' + Math.floor(t / 60)).slice(-2) + ':' + ('0' + t % 60).slice(-2); }
function hm(m) { m = Number(m) || 0; return Math.floor(m / 60) + ':' + ('0' + m % 60).slice(-2); }
function reportHtml(rep) {
  var rowsHtml = rep.staff.map(function (s) {
    return '<tr><td>' + escHtml(s.name || s.username) + '</td><td>' + s.days.length + '</td><td>' + hm(s.minutes) + '</td><td>' + s.late + '</td><td>' + s.actions + '</td><td>' + s.txCreated + '</td><td>' + s.txDone + '</td><td>' + s.replies + '</td><td>' + s.files + '</td></tr>';
  }).join('');
  return '<p>تقرير الموظفين من ' + rep.from + ' إلى ' + rep.to + '</p><table border="1" cellpadding="6" style="border-collapse:collapse;font-size:14px"><tr><th>الموظف</th><th>أيام الحضور</th><th>ساعات العمل</th><th>تأخير</th><th>الإجراءات</th><th>معاملات أُضيفت</th><th>معاملات أُنجزت</th><th>ردود على العملاء</th><th>ملفات رُفعت</th></tr>' + rowsHtml + '</table>';
}
function emailReport(from, to) {
  var rep = staffReport(from, to), dest = prop('OFFICE_EMAIL');
  if (!dest) return {ok: false, error: 'invalid'};
  MailApp.sendEmail({to: dest, name: 'نظام منجز', subject: 'تقرير الموظفين ' + rep.from + (rep.to !== rep.from ? ' إلى ' + rep.to : ''), htmlBody: shell(reportHtml(rep))});
  return {ok: true, to: dest};
}

// ---------- sheet helpers ----------
function sheet(name) {
  if (!SHEETS[name]) throw new Error('bad_sheet');
  var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(name);
  if (!sh) {   // sheets added in a later version are created on first use
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, SHEETS[name].length).setValues([SHEETS[name]]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}
function rows(name) {
  var sh = sheet(name), cols = SHEETS[name], n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, cols.length).getValues().map(function (r) {
    var o = {}; cols.forEach(function (c, i) { var v = r[i]; o[c] = v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd') : v; }); return o;
  }).filter(function (o) { return o.id; });
}
function listAll() {
  var o = {}; Object.keys(SHEETS).forEach(function (k) { o[k] = rows(k); });
  o.Accounts = o.Accounts.map(publicAccount);   // never send password hashes to the browser
  o.Credentials = o.Credentials.map(publicCredential);
  delete o.Staff; delete o.Sessions; delete o.Activity;
  // employees get only what their permissions allow
  if (!can('credentials')) o.Credentials = [];
  if (!can('messages')) o.Messages = [];
  if (!can('accounts')) o.Accounts = o.Accounts.map(function (a) { return {id: a.id, clientId: a.clientId, status: a.status}; });
  if (!can('requests')) o.Requests = [];
  if (!can('log')) o.Log = o.Log.filter(function (l) { return l.by === STAFF.username; });
  if (!can('finance')) o.Transactions = o.Transactions.map(function (t) { var c = {}; Object.keys(t).forEach(function (k) { if (['fee', 'govFee', 'paid'].indexOf(k) < 0) c[k] = t[k]; }); return c; });   // portal passwords only through 'reveal', which is logged
  return o;
}
function nextId(name) {
  var p = PREFIX[name], max = 0;
  rows(name).forEach(function (r) { var m = String(r.id).match(/(\d+)$/); if (m) max = Math.max(max, Number(m[1])); });
  return p + '-' + ('0000' + (max + 1)).slice(-4);
}
function now() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'); }
function saveRow(name, row) {
  var sh = sheet(name), cols = SHEETS[name];
  row = row || {};
  if (!row.id) { row.id = nextId(name); row.created = now(); }
  if (cols.indexOf('updated') >= 0) row.updated = now();
  var values = cols.map(function (c) { var v = row[c]; return v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : v); });
  var ids = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
  var i = ids.indexOf(String(row.id));
  // keep text columns as text so phone numbers and IDs keep leading digits
  if (i >= 0) sh.getRange(i + 2, 1, 1, cols.length).setNumberFormat('@').setValues([values]);
  else sh.getRange(sh.getLastRow() + 1, 1, 1, cols.length).setNumberFormat('@').setValues([values]);
  return row;
}
function deleteRow(name, id) {
  var sh = sheet(name), n = sh.getLastRow() - 1; if (n < 1) return false;
  var ids = sh.getRange(2, 1, n, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) { sh.deleteRow(i + 2); return true; }
  return false;
}
function log(clientId, txnId, kind, subject, body) {
  saveRow('Log', {clientId: clientId || '', txnId: txnId || '', kind: kind, subject: subject || '', body: body || '', by: 'system'});
}

// ---------- visitor sign-up from the website (name, mobile, optional email and company) ----------
function publicRegister(r) {
  if (r.hp) return {ok: true};
  var name = clean(r.name, 120), phone = clean(r.phone, 20).replace(/\s/g, ''), email = clean(r.email, 120), company = clean(r.company, 120);
  if (!name || !/^(\+?974)?[3567]\d{7}$/.test(phone) || !r.accept) return {ok: false, error: 'invalid'};
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) email = '';
  var cache = CacheService.getScriptCache(), key = 'rg_' + phone;
  if (Number(cache.get(key) || 0) >= 5) return {ok: false, error: 'rate_limited'};
  cache.put(key, String(Number(cache.get(key) || 0) + 1), 3600);
  var phone8 = phone.slice(-8);
  return withLock(function () {
    var c = rows('Clients').filter(function (x) { return String(x.phone).slice(-8) === phone8; })[0];
    var note = (company ? 'الشركة: ' + company + ' · ' : '') + 'المسؤول: ' + name;
    if (!c) {
      c = saveRow('Clients', {name: company || name, type: company ? 'منشأة' : 'فرد', phone: phone8, email: email, source: 'تسجيل الموقع', notes: note});
      log(c.id, '', 'register', 'تسجيل زائر من الموقع', note);
    } else if (email && !c.email) { c.email = email; saveRow('Clients', c); }
    consent(c.id, name, phone8, LEGAL_DOCS, r.lang, 'التسجيل الأولي');
    return {ok: true, id: c.id};
  });
}

// ---------- client accounts («حسابي») ----------
function hex(bytes) { return bytes.map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join(''); }
function hashPw(salt, pw) {
  var h = salt + '|' + pw;
  for (var i = 0; i < PW_ROUNDS; i++) h = hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + salt, Utilities.Charset.UTF_8));
  return h;
}
function publicAccount(a) { return {id: a.id, created: a.created, clientId: a.clientId, username: a.username, status: a.status, lastLogin: a.lastLogin, updated: a.updated}; }
function pick(o, keys) { var r = {}; keys.forEach(function (k) { r[k] = o[k] == null ? '' : o[k]; }); return r; }
function validUser(u) { return /^[a-z0-9_.]{4,30}$/.test(u); }
function validPw(p) { return typeof p === 'string' && p.length >= 8 && p.length <= 100; }
function findAccount(f) { return rows('Accounts').filter(f)[0]; }
function clientToken(acc) {
  var exp = String(Date.now() + CLIENT_TOKEN_HOURS * 3600 * 1000), body = acc.id + '.' + exp;
  return 'c.' + body + '.' + sign('c|' + body);
}
function checkClientToken(t) {
  var p = String(t || '').split('.');
  if (p.length !== 4 || p[0] !== 'c' || p[3] !== sign('c|' + p[1] + '.' + p[2]) || Number(p[2]) < Date.now()) return null;
  var acc = findAccount(function (a) { return a.id === p[1]; });
  return acc && acc.status === ACC_ACTIVE ? acc : null;
}
function bump(key, max) {   // simple per-key counter for an hour; returns false once over the limit
  var c = CacheService.getScriptCache(), n = Number(c.get(key) || 0);
  if (n >= max) return false;
  c.put(key, String(n + 1), 3600); return true;
}

function clientSignup(r) {
  if (r.hp) return {ok: false, error: 'invalid'};
  var name = clean(r.name, 120), phone = clean(r.phone, 20).replace(/\s/g, ''), email = clean(r.email, 120);
  var username = clean(r.username, 30).toLowerCase(), pw = String(r.password || '');
  if (!name || !/^(\+?974)?[3567]\d{7}$/.test(phone)) return {ok: false, error: 'invalid'};
  if (!validUser(username)) return {ok: false, error: 'bad_username'};
  if (!validPw(pw)) return {ok: false, error: 'weak_password'};
  if (!r.accept) return {ok: false, error: 'must_accept'};
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) email = '';
  if (!bump('su_' + phone.slice(-8), 5)) return {ok: false, error: 'rate_limited'};
  var phone8 = phone.slice(-8), company = clean(r.company, 120);
  var res = withLock(function () {
    if (findAccount(function (a) { return a.username === username; })) return {ok: false, error: 'username_taken'};
    var c = rows('Clients').filter(function (x) { return String(x.phone).slice(-8) === phone8; })[0];
    if (c && findAccount(function (a) { return a.clientId === c.id; })) return {ok: false, error: 'phone_has_account'};
    // An existing client with transactions or files gets a pending account: the office confirms the number by phone
    // before the account can see that history (nobody can claim someone else's file by typing their number).
    var history = c && (rows('Transactions').some(function (t) { return t.clientId === c.id; }) ||
      rows('Files').some(function (f) { return f.clientId === c.id; }));
    var data = {type: company ? 'منشأة' : 'فرد', cr: clean(r.cr, 40), estCard: clean(r.estCard, 40), taxNo: clean(r.taxNo, 40), qid: clean(r.qid, 20), address: clean(r.address, 200)};
    if (!c) {
      c = {name: company || name, phone: phone8, email: email, source: 'حساب الموقع', notes: (company ? 'الشركة: ' + company + ' · ' : '') + 'المسؤول: ' + name};
      Object.keys(data).forEach(function (k) { c[k] = data[k]; });
      c = saveRow('Clients', c);
    } else if (!history) {
      if (company) c.name = company;
      Object.keys(data).forEach(function (k) { if (data[k]) c[k] = data[k]; });
      if (email) c.email = email;
      c.notes = (c.notes ? c.notes + ' · ' : '') + 'المسؤول: ' + name;
      saveRow('Clients', c);
    }
    var salt = Utilities.getUuid();
    var acc = saveRow('Accounts', {clientId: c.id, username: username, salt: salt, hash: hashPw(salt, pw), status: history ? ACC_PENDING : ACC_ACTIVE, lastLogin: ''});
    consent(c.id, clean(r.signName, 120) || name, phone8, LEGAL_DOCS, r.lang, 'إنشاء الحساب' + (company ? ' عن ' + company : ''));
    log(c.id, '', 'account', 'إنشاء حساب على الموقع: ' + username + (history ? ' (بانتظار التفعيل)' : ''), company ? 'الشركة: ' + company : '');
    return {ok: true, acc: acc, client: c, pending: !!history};
  });
  if (!res.ok) return res;
  try {
    var to = prop('OFFICE_EMAIL');
    if (to) MailApp.sendEmail({to: to, name: 'موقع منجز', subject: (res.pending ? 'حساب بانتظار التفعيل: ' : 'حساب جديد: ') + res.client.name,
      htmlBody: shell('<p>أنشأ عميل حساباً على الموقع.</p><p>الاسم: ' + escHtml(name) + '<br>الشركة: ' + escHtml(company || '—') + '<br>الجوال: ' + phone8 + '<br>اسم المستخدم: ' + escHtml(username) + '<br>رقم العميل: ' + res.client.id + '</p>' +
        (res.pending ? '<p><b>هذا الرقم مسجل لعميل لديه معاملات أو ملفات سابقة.</b> اتصل بالرقم للتأكد، ثم فعّل الحساب من نظام العملاء (ملف العميل ← الحساب).</p>' : ''))});
    if (email) MailApp.sendEmail({to: email, name: r.lang === 'en' ? 'Munjiz Business Services' : 'منجز لخدمات الأعمال', replyTo: to || undefined,
      subject: r.lang === 'en' ? 'Your Munjiz account' : 'تم إنشاء حسابك في منجز لخدمات الأعمال',
      htmlBody: shell(r.lang === 'en'
        ? '<p>Hello ' + escHtml(name) + ',</p><p>Your account has been created. Username: <b>' + escHtml(username) + '</b>.</p>' + (res.pending ? '<p>Because this mobile number already has a file with us, we will call you to confirm it and then activate your account.</p>' : '<p>Sign in from the “My account” page to request services and follow your work.</p>')
        : '<p>السلام عليكم ' + escHtml(name) + '،</p><p>تم إنشاء حسابك. اسم المستخدم: <b>' + escHtml(username) + '</b>.</p>' + (res.pending ? '<p>لأن رقم جوالك مسجل لدينا مسبقاً، سنتصل بك للتأكد منه ثم نفعّل حسابك.</p>' : '<p>ادخل من صفحة «حسابي» لطلب الخدمات ومتابعة طلباتك ومعاملاتك وتنزيل ملفاتك.</p>'), r.lang === 'en')});
  } catch (err) { log(res.client.id, '', 'error', 'signup mail failed', String(err)); }
  if (res.pending) return {ok: true, pending: true};
  return {ok: true, token: clientToken(res.acc)};
}

function clientLogin(r) {
  var id = clean(r.username, 30).toLowerCase().replace(/\s/g, ''), pw = String(r.password || '');
  if (!id || !pw) return {ok: false, error: 'wrong_login'};
  if (!bump('cl_' + id, 10)) return {ok: false, error: 'rate_limited'};
  Utilities.sleep(300);
  var acc = findAccount(function (a) { return a.username === id; });
  if (!acc && /^\+?\d{8,12}$/.test(id)) {   // allow signing in with the mobile number too
    var c = rows('Clients').filter(function (x) { return String(x.phone).slice(-8) === id.slice(-8); })[0];
    if (c) acc = findAccount(function (a) { return a.clientId === c.id; });
  }
  if (!acc || hashPw(acc.salt, pw) !== acc.hash) return {ok: false, error: 'wrong_login'};
  if (acc.status === ACC_PENDING) return {ok: false, error: 'pending'};
  if (acc.status !== ACC_ACTIVE) return {ok: false, error: 'disabled'};
  withLock(function () { acc.lastLogin = now(); saveRow('Accounts', acc); });
  return {ok: true, token: clientToken(acc)};
}

function clientMe(acc) {
  var c = rows('Clients').filter(function (x) { return x.id === acc.clientId; })[0];
  if (!c) return {ok: false, error: 'auth'};
  var mine = function (name, fields) { return rows(name).filter(function (x) { return x.clientId === c.id; }).map(function (x) { return pick(x, fields); }).reverse(); };
  var files = rows('Files').filter(function (f) { return f.clientId === c.id; }).map(function (f) {
    return {id: f.id, created: f.created, txnId: f.txnId, title: f.title, link: f.fileId ? '' : f.url};   // Drive files are fetched through cfile
  }).reverse();
  var creds = rows('Credentials').filter(function (x) { return x.clientId === c.id; }).map(function (x) { return {id: x.id, created: x.created, portal: x.portal, username: x.username}; });
  var msgs = rows('Messages').filter(function (m) { return m.clientId === c.id; });
  var unread = msgs.filter(function (m) { return m.from === 'office' && !m.read; });
  if (unread.length) withLock(function () { unread.forEach(function (m) { m.read = 'نعم'; saveRow('Messages', m); }); });
  var signed = rows('Consents').filter(function (x) { return x.clientId === c.id; }).pop();
  return {ok: true, username: acc.username, client: pick(c, CLIENT_FIELDS), requests: mine('Requests', REQ_FIELDS), transactions: mine('Transactions', TXN_FIELDS), files: files,
    credentials: creds, messages: msgs.map(function (m) { return {id: m.id, created: m.created, from: m.from, body: m.body}; }), consent: signed ? {created: signed.created, version: signed.version, name: signed.name} : null, legalVersion: LEGAL_VERSION};
}

function clientProfile(acc, p) {
  var c = rows('Clients').filter(function (x) { return x.id === acc.clientId; })[0];
  if (!c) return {ok: false, error: 'auth'};
  var changed = [];
  CLIENT_EDITABLE.forEach(function (k) {
    if (p[k] == null) return;
    var v = clean(p[k], k === 'address' ? 200 : 120);
    if (k === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return;
    if (k === 'name' && !v) return;
    if (String(c[k]) !== v) { changed.push(k + ': ' + v); c[k] = v; }
  });
  if (changed.length) { saveRow('Clients', c); log(c.id, '', 'profile', 'العميل حدّث بياناته من حسابه', changed.join('\n')); }
  return {ok: true, client: pick(c, CLIENT_FIELDS)};
}

function clientRequest(acc, r) {
  var svc = clean(r.services, 3000), note = clean(r.notes, 1000);
  if (!svc) return {ok: false, error: 'invalid'};
  if (!bump('cr_' + acc.id, 10)) return {ok: false, error: 'rate_limited'};
  return withLock(function () {
    var c = rows('Clients').filter(function (x) { return x.id === acc.clientId; })[0];
    var rq = saveRow('Requests', {name: c.name, phone: c.phone, email: c.email, type: c.type, plan: clean(r.plan, 30), services: svc,
      codes: (r.codes || []).slice(0, 60).join(' '), lang: r.lang === 'en' ? 'en' : 'ar', status: 'جديد', clientId: c.id, mailed: '',
      notes: 'من حساب العميل (' + acc.username + ')' + (note ? '\n' + note : '')});
    var mailed = false;
    if (c.email) { try { sendAutoReply(rq); mailed = true; } catch (err) {} }
    rq.mailed = mailed ? 'نعم' : 'لا'; saveRow('Requests', rq);
    try { notifyOffice(rq); } catch (err) {}
    log(c.id, '', 'request', 'طلب جديد من حساب العميل ' + rq.id, svc + (note ? '\n' + note : ''));
    return {ok: true, id: rq.id, mailed: mailed};
  });
}

function clientPassword(acc, old, pw) {
  if (hashPw(acc.salt, String(old || '')) !== acc.hash) return {ok: false, error: 'wrong_login'};
  if (!validPw(pw)) return {ok: false, error: 'weak_password'};
  acc.salt = Utilities.getUuid(); acc.hash = hashPw(acc.salt, pw); saveRow('Accounts', acc);
  log(acc.clientId, '', 'account', 'العميل غيّر كلمة المرور', '');
  return {ok: true};
}

function clientFile(acc, id) {
  var f = rows('Files').filter(function (x) { return x.id === id && x.clientId === acc.clientId; })[0];
  if (!f) return {ok: false, error: 'not_found'};
  if (!f.fileId) return {ok: true, link: f.url};
  var blob = DriveApp.getFileById(f.fileId).getBlob();
  return {ok: true, name: blob.getName(), mime: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes())};
}

// ---------- staff side: accounts and files ----------
function staffAccount(r) {
  var c = rows('Clients').filter(function (x) { return x.id === r.clientId; })[0];
  if (!c) return {ok: false, error: 'not_found'};
  var acc = findAccount(function (a) { return a.clientId === c.id; }) || {clientId: c.id, status: ACC_ACTIVE, lastLogin: ''};
  if (r.username != null) {
    var u = clean(r.username, 30).toLowerCase();
    if (!validUser(u)) return {ok: false, error: 'bad_username'};
    if (findAccount(function (a) { return a.username === u && a.id !== acc.id; })) return {ok: false, error: 'username_taken'};
    acc.username = u;
  }
  if (!acc.username) return {ok: false, error: 'bad_username'};
  if (r.password) {
    if (!validPw(r.password)) return {ok: false, error: 'weak_password'};
    acc.salt = Utilities.getUuid(); acc.hash = hashPw(acc.salt, r.password);
  }
  if (!acc.hash) return {ok: false, error: 'weak_password'};
  if ([ACC_ACTIVE, ACC_PENDING, ACC_OFF].indexOf(r.status) >= 0) acc.status = r.status;
  acc = saveRow('Accounts', acc);
  saveRow('Log', {clientId: c.id, kind: 'account', subject: 'تحديث حساب العميل: ' + acc.username + ' · ' + acc.status + (r.password ? ' · كلمة مرور جديدة' : ''), body: '', by: STAFF.username});
  return {ok: true, row: publicAccount(acc)};
}

function clientFolder(clientId) {
  var p = PropertiesService.getScriptProperties(), rootId = p.getProperty('FILES_FOLDER'), root;
  try { root = rootId && DriveApp.getFolderById(rootId); } catch (err) { root = null; }
  if (!root) { root = DriveApp.createFolder('منجز - ملفات العملاء'); p.setProperty('FILES_FOLDER', root.getId()); }
  var it = root.getFoldersByName(clientId);
  return it.hasNext() ? it.next() : root.createFolder(clientId);
}
function staffUpload(r) {
  var c = rows('Clients').filter(function (x) { return x.id === r.clientId; })[0];
  if (!c) return {ok: false, error: 'not_found'};
  var data = String(r.data || '');
  if (!data || data.length > MAX_UPLOAD_MB * 1024 * 1024 * 4 / 3) return {ok: false, error: 'too_large'};
  var name = clean(r.name, 150) || 'file';
  var blob = Utilities.newBlob(Utilities.base64Decode(data), clean(r.mime, 100) || 'application/octet-stream', name);
  var file = clientFolder(c.id).createFile(blob);   // stays private to the office's Google account
  var row = saveRow('Files', {clientId: c.id, txnId: clean(r.txnId, 20), title: clean(r.title, 150) || name, url: file.getUrl(), fileId: file.getId(), by: STAFF.username});
  saveRow('Log', {clientId: c.id, txnId: row.txnId, kind: 'file', subject: 'رفع ملف للعميل: ' + row.title, body: '', by: STAFF.username});
  return {ok: true, row: row};
}
// ---------- consents and government-portal logins ----------
function consent(clientId, name, phone, docs, lang, source) {
  saveRow('Consents', {clientId: clientId, name: name, phone: phone, docs: docs, version: LEGAL_VERSION, lang: lang === 'en' ? 'en' : 'ar', source: source});
}
// Apps Script has no built-in AES, so portal passwords are encrypted with an HMAC-SHA256 keystream
// (random nonce per value) and authenticated with a separate HMAC. The key lives only in Script Properties,
// so the sheet alone (or a copy of it) does not reveal any password.
function credKey() {
  var p = PropertiesService.getScriptProperties(), k = p.getProperty('CRED_KEY');
  if (!k) { k = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('CRED_KEY', k); }
  return k;
}
function bytesOf(s) { return Utilities.newBlob(String(s)).getBytes(); }
function keystream(nonce, n) {
  var out = [], k = credKey();
  for (var i = 0; out.length < n; i++) out = out.concat(Utilities.computeHmacSha256Signature(nonce + '|' + i, k));
  return out.slice(0, n);
}
function encrypt(plain) {
  var nonce = Utilities.getUuid(), b = bytesOf(plain), ks = keystream(nonce, b.length);
  var ct = Utilities.base64Encode(b.map(function (x, i) { return ((x ^ ks[i]) << 24) >> 24; }));
  return nonce + ':' + ct + ':' + Utilities.base64Encode(Utilities.computeHmacSha256Signature('m|' + nonce + ':' + ct, credKey()));
}
function decrypt(enc) {
  var p = String(enc).split(':');
  if (p.length !== 3 || Utilities.base64Encode(Utilities.computeHmacSha256Signature('m|' + p[0] + ':' + p[1], credKey())) !== p[2]) throw new Error('bad_cipher');
  var b = Utilities.base64Decode(p[1]), ks = keystream(p[0], b.length);
  return Utilities.newBlob(b.map(function (x, i) { return ((x ^ ks[i]) << 24) >> 24; })).getDataAsString('UTF-8');
}
function publicCredential(x) { return {id: x.id, created: x.created, clientId: x.clientId, portal: x.portal, username: x.username, note: x.note, by: x.by, updated: x.updated}; }
function clientCredential(acc, r) {
  var portal = clean(r.portal, 80), user = clean(r.username, 120), pw = String(r.password || '').slice(0, 200), note = clean(r.note, 300);
  if (!portal || !user || !pw) return {ok: false, error: 'invalid'};
  if (!r.consent) return {ok: false, error: 'must_accept'};
  if (rows('Credentials').filter(function (x) { return x.clientId === acc.clientId; }).length >= 20) return {ok: false, error: 'too_many'};
  var c = rows('Clients').filter(function (x) { return x.id === acc.clientId; })[0];
  var row = saveRow('Credentials', {clientId: acc.clientId, portal: portal, username: user, secret: encrypt(pw), note: note, by: 'العميل (' + acc.username + ')'});
  consent(acc.clientId, clean(r.signName, 120) || c.name, c.phone, 'بيانات الدخول إلى البوابات الحكومية: ' + portal, r.lang, 'حسابي');
  log(acc.clientId, '', 'credential', 'العميل أضاف بيانات دخول بوابة: ' + portal, 'اسم المستخدم: ' + user);
  try { var to = prop('OFFICE_EMAIL'); if (to) MailApp.sendEmail({to: to, name: 'موقع منجز', subject: 'بيانات دخول بوابة من العميل ' + c.name, htmlBody: shell('<p>أضاف العميل ' + escHtml(c.name) + ' (' + c.id + ') بيانات الدخول إلى: <b>' + escHtml(portal) + '</b>.</p><p>كلمة المرور محفوظة مشفرة، وتظهر من نظام العملاء ← ملف العميل ← بيانات البوابات.</p>')}); } catch (err) {}
  return {ok: true, row: {id: row.id, created: row.created, portal: portal, username: user}};
}
function clientCredentialDelete(acc, id) {
  var x = rows('Credentials').filter(function (y) { return y.id === id && y.clientId === acc.clientId; })[0];
  if (!x) return {ok: false, error: 'not_found'};
  deleteRow('Credentials', id);
  log(acc.clientId, '', 'credential', 'العميل حذف بيانات دخول بوابة: ' + x.portal, '');
  return {ok: true};
}
function staffReveal(id) {
  var x = rows('Credentials').filter(function (y) { return y.id === id; })[0];
  if (!x) return {ok: false, error: 'not_found'};
  audit('reveal', 'Credentials', x.id, x.clientId, 'إظهار كلمة مرور بوابة: ' + x.portal);
  saveRow('Log', {clientId: x.clientId, kind: 'credential', subject: 'اطلاع على كلمة مرور بوابة: ' + x.portal, body: '', by: STAFF.username});
  return {ok: true, password: decrypt(x.secret)};
}

// ---------- messages between the client and the office ----------
function clientMessage(acc, body) {
  body = clean(body, 3000); if (!body) return {ok: false, error: 'invalid'};
  if (!bump('cm_' + acc.id, 30)) return {ok: false, error: 'rate_limited'};
  var c = rows('Clients').filter(function (x) { return x.id === acc.clientId; })[0];
  var m = saveRow('Messages', {clientId: c.id, from: 'client', by: acc.username, body: body, read: ''});
  try { var to = prop('OFFICE_EMAIL'); if (to) MailApp.sendEmail({to: to, name: 'موقع منجز', subject: 'رسالة من العميل ' + c.name + ' (' + c.id + ')', htmlBody: shell('<p><b>' + escHtml(c.name) + '</b> كتب من حسابه:</p><p>' + escHtml(body).replace(/\n/g, '<br>') + '</p><p>رد عليه من نظام العملاء ← ملف العميل ← المراسلات.</p>')}); } catch (err) {}
  return {ok: true, row: {id: m.id, created: m.created, from: 'client', body: body}};
}
function staffReply(r) {
  var c = rows('Clients').filter(function (x) { return x.id === r.clientId; })[0];
  var body = String(r.body || '').replace(/[<>]/g, '').trim().slice(0, 5000);
  if (!c || !body) return {ok: false, error: 'invalid'};
  rows('Messages').filter(function (m) { return m.clientId === c.id && m.from === 'client' && !m.read; }).forEach(function (m) { m.read = 'نعم'; saveRow('Messages', m); });
  var m = saveRow('Messages', {clientId: c.id, from: 'office', by: STAFF.username, body: body, read: ''});
  var mailed = false;
  if (r.email !== false && c.email) {
    try { MailApp.sendEmail({to: c.email, name: 'منجز لخدمات الأعمال', replyTo: prop('OFFICE_EMAIL') || undefined, subject: 'رسالة جديدة في حسابك | منجز لخدمات الأعمال',
      htmlBody: shell('<p>السلام عليكم ' + escHtml(c.name) + '،</p><p>' + escHtml(body).replace(/\n/g, '<br>') + '</p><p style="color:#5b6580">يمكنك الرد من صفحة «حسابي» على الموقع ← المراسلات.</p>')}); mailed = true; } catch (err) {}
  }
  audit('reply', 'Messages', m.id, c.id, 'رد على العميل: ' + body.slice(0, 120));
  saveRow('Log', {clientId: c.id, kind: 'message', subject: 'رد على العميل من المراسلات' + (mailed ? ' (أُرسل بالبريد أيضاً)' : ''), body: body, by: STAFF.username});
  return {ok: true, row: m, mailed: mailed};
}

function trashDriveFile(id) {
  var f = rows('Files').filter(function (x) { return x.id === id; })[0];
  if (f && f.fileId) { try { DriveApp.getFileById(f.fileId).setTrashed(true); } catch (err) {} }
}

// ---------- public request from the website ----------
function publicRequest(r) {
  if (r.hp) return {ok: true, id: 'R-0000', mailed: false};           // honeypot: silently drop bots
  var name = clean(r.name, 120), phone = clean(r.phone, 20).replace(/\s/g, ''), email = clean(r.email, 120), svc = clean(r.services, 3000);
  if (!name || !/^(\+?974)?[3567]\d{7}$/.test(phone) || !svc) return {ok: false, error: 'invalid'};
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) email = '';
  var cache = CacheService.getScriptCache(), key = 'rl_' + phone;
  if (Number(cache.get(key) || 0) >= 5) return {ok: false, error: 'rate_limited'};
  cache.put(key, String(Number(cache.get(key) || 0) + 1), 3600);
  var phone8 = phone.slice(-8);
  return withLock(function () {
    var client = rows('Clients').filter(function (c) { return String(c.phone).slice(-8) === phone8; })[0];
    if (!client) client = saveRow('Clients', {name: name, type: clean(r.type, 20), phone: phone8, email: email, plan: clean(r.plan, 30), source: 'الموقع', requirements: svc});
    else if (email && !client.email) { client.email = email; saveRow('Clients', client); }
    var rq = saveRow('Requests', {name: name, phone: phone8, email: email, type: clean(r.type, 20), plan: clean(r.plan, 30), services: svc,
      codes: (r.codes || []).join(' '), lang: r.lang === 'en' ? 'en' : 'ar', status: 'جديد', clientId: client.id, mailed: '', notes: r.contact ? 'وسيلة التواصل المفضلة: ' + clean(r.contact, 30) : ''});
    var mailed = false;
    if (email) { try { sendAutoReply(rq); mailed = true; } catch (err) { log(client.id, '', 'error', 'auto-reply failed', String(err)); } }
    rq.mailed = mailed ? 'نعم' : 'لا'; saveRow('Requests', rq);
    try { notifyOffice(rq); } catch (err) {}
    log(client.id, '', 'request', 'طلب جديد من الموقع ' + rq.id, svc);
    return {ok: true, id: rq.id, mailed: mailed};
  });
}
function clean(s, n) { return String(s == null ? '' : s).replace(/[<>]/g, '').trim().slice(0, n); }
function escHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function shell(html, en) {
  return '<div dir="' + (en ? 'ltr' : 'rtl') + '" style="font-family:Tahoma,Arial,sans-serif;font-size:15px;line-height:1.8;color:#1e2229;max-width:600px">' +
    '<div style="background:#7a1e3a;color:#fff;padding:14px 18px;border-radius:10px 10px 0 0;font-size:18px"><b>' + (en ? 'Munjiz Business Services' : 'منجز لخدمات الأعمال') + '</b></div>' +
    '<div style="border:1px solid #dde2ec;border-top:0;padding:18px;border-radius:0 0 10px 10px">' + html +
    '<p style="color:#5b6580;font-size:13px;margin-top:22px">' + (en ? 'Munjiz Business Services · Doha, Qatar · WhatsApp +974 51600498 · munijizqa@gmail.com' : 'منجز لخدمات الأعمال · الدوحة، قطر · واتساب ‎+974 51600498 · munijizqa@gmail.com') + '</p></div></div>';
}
function sendAutoReply(rq) {
  var en = rq.lang === 'en';
  var subject = en ? 'We received your request ' + rq.id + ' | Munjiz' : 'استلمنا طلبك رقم ' + rq.id + ' | منجز لخدمات الأعمال';
  var body = en
    ? '<p>Hello ' + escHtml(rq.name) + ',</p><p>Thank you. Your request <b>' + rq.id + '</b> has reached us. We will review it and contact you within two working hours with the document list, our fixed fee and the estimated government fees.</p><p><b>Requested services:</b><br>' + escHtml(rq.services).replace(/\n/g, '<br>') + '</p><p>Please do not send any documents until we ask for them; we will tell you exactly what is needed.</p>'
    : '<p>السلام عليكم ' + escHtml(rq.name) + '،</p><p>شكراً لتواصلك مع منجز لخدمات الأعمال. وصلنا طلبك برقم <b>' + rq.id + '</b>، وسنراجعه ونتواصل معك خلال ساعتين عمل بقائمة المستندات المطلوبة وأتعابنا الثابتة وتقدير الرسوم الحكومية.</p><p><b>الخدمات المطلوبة:</b><br>' + escHtml(rq.services).replace(/\n/g, '<br>') + '</p><p>لا ترسل أي مستندات قبل أن نطلبها، وسنخبرك بالمطلوب تحديداً.</p>';
  MailApp.sendEmail({to: rq.email, subject: subject, htmlBody: shell(body, en), name: en ? 'Munjiz Business Services' : 'منجز لخدمات الأعمال', replyTo: prop('OFFICE_EMAIL') || undefined});
}
function notifyOffice(rq) {
  var to = prop('OFFICE_EMAIL'); if (!to) return;
  MailApp.sendEmail({to: to, subject: 'طلب جديد ' + rq.id + ' من ' + rq.name, name: 'موقع منجز',
    htmlBody: shell('<p><b>طلب جديد من الموقع</b></p><p>الاسم: ' + escHtml(rq.name) + '<br>الجوال: ' + rq.phone + '<br>البريد: ' + escHtml(rq.email || 'غير مذكور') + '<br>النوع: ' + escHtml(rq.type) + '<br>الباقة: ' + escHtml(rq.plan || 'بدون') + (rq.notes ? '<br>' + escHtml(rq.notes) : '') + '<br>رقم العميل: ' + rq.clientId + '</p><p>' + escHtml(rq.services).replace(/\n/g, '<br>') + '</p><p>افتح نظام العملاء لمتابعته.</p>')});
}

// ---------- email from the CRM ----------
function sendClientEmail(r) {
  var to = clean(r.to, 200), subject = clean(r.subject, 200), body = String(r.body || '').slice(0, 10000);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || !subject || !body) return {ok: false, error: 'invalid'};
  MailApp.sendEmail({to: to, subject: subject, htmlBody: shell(escHtml(body).replace(/\n/g, '<br>'), r.lang === 'en'), name: 'منجز لخدمات الأعمال', replyTo: prop('OFFICE_EMAIL') || undefined});
  saveRow('Log', {clientId: r.clientId || '', txnId: r.txnId || '', kind: 'email', subject: subject, body: body, by: STAFF ? STAFF.username : 'CRM'});
  return {ok: true, quota: MailApp.getRemainingDailyQuota()};
}

// ---------- daily reminder to the office ----------
function dailyReminders() {
  var to = prop('OFFICE_EMAIL'); if (!to) return;
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var days = function (d) { if (!d) return null; var x = new Date(d); return isNaN(x) ? null : Math.round((x - today) / 86400000); };
  var clients = {}; rows('Clients').forEach(function (c) { clients[c.id] = c; });
  var open = rows('Transactions').filter(function (t) { return ['منجزة', 'ملغاة'].indexOf(t.status) < 0; });
  var late = open.filter(function (t) { var d = days(t.dueDate); return d !== null && d < 0; });
  var renew = rows('Transactions').filter(function (t) { var d = days(t.expiryDate); return d !== null && d >= 0 && d <= 30; });
  var plans = rows('Clients').filter(function (c) { var d = days(c.planEnd); return d !== null && d >= 0 && d <= 30; });
  var newReq = rows('Requests').filter(function (r) { return r.status === 'جديد'; });
  var y = new Date(today.getTime() - 86400000), yd = Utilities.formatDate(y, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var staffRep = staffReport(yd, yd), worked = staffRep.staff.filter(function (s) { return s.days.length || s.actions; });
  if (!late.length && !renew.length && !plans.length && !newReq.length && !worked.length) return;
  var li = function (arr, f) { return arr.length ? '<ul>' + arr.map(function (x) { return '<li>' + f(x) + '</li>'; }).join('') + '</ul>' : '<p>لا يوجد.</p>'; };
  var cn = function (id) { return escHtml((clients[id] || {}).name || id); };
  MailApp.sendEmail({to: to, subject: 'متابعة اليوم: ' + newReq.length + ' طلب جديد، ' + late.length + ' متأخرة، ' + renew.length + ' تجديد قريب', name: 'نظام منجز',
    htmlBody: shell('<h3>طلبات جديدة لم تُعالج</h3>' + li(newReq, function (r) { return r.id + ' · ' + escHtml(r.name) + ' · ' + r.phone; }) +
      '<h3>معاملات تجاوزت الموعد المتوقع</h3>' + li(late, function (t) { return t.id + ' · ' + cn(t.clientId) + ' · ' + escHtml(t.service) + ' · ' + t.dueDate; }) +
      '<h3>مستندات تنتهي خلال 30 يوماً</h3>' + li(renew, function (t) { return t.id + ' · ' + cn(t.clientId) + ' · ' + escHtml(t.service) + ' · ينتهي ' + t.expiryDate; }) +
      '<h3>اشتراكات باقات تنتهي خلال 30 يوماً</h3>' + li(plans, function (c) { return c.id + ' · ' + escHtml(c.name) + ' · ' + escHtml(c.plan) + ' · ' + c.planEnd; }) +
      '<h3>عمل الموظفين أمس</h3>' + (worked.length ? reportHtml(staffRep) : '<p>لم يسجّل أي موظف دخولاً أمس.</p>'))});
}

// ---------- sample data (first visit only) ----------
var DEMO_PW='Demo1234';
function at(days,h,m){var d=new Date();d.setDate(d.getDate()+days);d.setHours(h||0,m||0,0,0);return Utilities.formatDate(d,'','yyyy-MM-dd HH:mm')}
function day(days){return at(days).slice(0,10)}
function put(name,o,created){o.id=nextId(name);o.created=created||now();return saveRow(name,o)}
function seed(){
  setup();
  var st=function(u,n,job,perms,phone){var s=Utilities.getUuid();return put('Staff',{username:u,name:n,role:'staff',salt:s,hash:hashPw(s,DEMO_PW),status:ACC_ACTIVE,mustChange:'',lastLogin:at(0,8,5),
    jobTitle:job,phone:phone,email:'',qid:'',hireDate:day(-60),shiftStart:'08:00',shiftEnd:'16:00',workDays:'الأحد إلى الخميس',perms:perms,notes:'حساب تجريبي'},at(-60,9))};
  var sara=st('sara','سارة أحمد','منسقة معاملات','requests,clients_view,clients_edit,transactions,messages,files,email','55000001');
  var ali=st('ali','علي حسن','مندوب تقديم إلكتروني','requests,clients_view,transactions','55000002');
  var cl=function(o,days){return put('Clients',Object.assign({qid:'',cr:'',estCard:'',taxNo:'',planEnd:'',address:'الدوحة',source:'تجريبي',requirements:'',notes:'عميل تجريبي'},o),at(days,10))};
  var c1=cl({name:'مطعم السعادة',type:'منشأة',phone:'55123456',email:'demo@example.com',cr:'123456',estCard:'98-765',plan:'منجز بداية',planEnd:day(200)},-40);
  var c2=cl({name:'شركة النخبة للتجارة',type:'منشأة',phone:'66123456',email:'',cr:'654321',plan:'منجز متابعة',planEnd:day(300)},-25);
  var c3=cl({name:'محمد علي',type:'فرد',phone:'33123456',email:'',plan:''},-3);
  var s=Utilities.getUuid();put('Accounts',{clientId:c1.id,username:'demo',salt:s,hash:hashPw(s,DEMO_PW),status:ACC_ACTIVE,lastLogin:at(-1,19,30)},at(-40,10,5));
  consent(c1.id,'خالد يوسف',c1.phone,LEGAL_DOCS,'ar','إنشاء الحساب عن مطعم السعادة');consent(c2.id,'نورة سالم',c2.phone,LEGAL_DOCS,'ar','التسجيل الأولي');
  var tx=function(c,code,svc,stt,fee,start,due,extra){return put('Transactions',Object.assign({clientId:c.id,code:code,service:svc,status:stt,fee:fee,govFee:'',paid:'',govRef:'',startDate:start,dueDate:due,expiryDate:'',assignee:'sara',docs:'[]',notes:'',closed:''},extra||{}),start+' 09:00')};
  tx(c1,'MC-03','تجديد الرخصة التجارية إلكترونياً','منجزة',200,day(-30),day(-25),{paid:200,govRef:'LIC-2026-5521',expiryDate:day(25),closed:day(-26)});
  tx(c1,'MI-01','تقديم تجديد إقامة إلكترونياً','قيد المتابعة لدى الجهة',150,day(-4),day(-1),{govRef:'MOI-778812'});
  tx(c1,'TR-01','تجديد استمارة مركبة','بانتظار المستندات',100,day(-1),day(3),{docs:JSON.stringify([{t:'الاستمارة الحالية',ok:true},{t:'الفحص الفني والتأمين الساريان',ok:false}])});
  tx(c2,'ML-01','توثيق عقد عمل إلكترونياً','قيد التقديم',100,day(-2),day(0),{assignee:'ali'});
  tx(c2,'MB-01','توثيق عقد إيجار سكني أو تجاري','منجزة',150,day(-12),day(-9),{paid:150,expiryDate:day(350),closed:day(-10)});
  var rq=function(c,svc,codes,plan,stt,days){return put('Requests',{name:c.name,phone:c.phone,email:c.email,type:c.type,plan:plan,services:svc,codes:codes,lang:'ar',status:stt,clientId:c.id,mailed:'',notes:''},at(days,11,20))};
  rq(c1,'تجديد استمارة مركبة (TR-01) × 1','TR-01','منجز بداية','تحوّل إلى معاملة',-1);
  rq(c3,'حجز موعد الفحص الطبي للإقامة (MH-01) × 1\nتجديد رخصة قيادة (TR-02) × 1','MH-01 TR-02','','جديد',0);
  rq(c2,'تسجيل أو تحديث أسعار السلع (MC-05) × 1','MC-05','منجز متابعة','تم التواصل',-2);
  put('Messages',{clientId:c1.id,from:'client',by:'demo',body:'السلام عليكم، متى تصل الإقامة المجددة؟',read:'نعم'},at(-1,18,40));
  put('Messages',{clientId:c1.id,from:'office',by:'sara',body:'وعليكم السلام، الطلب مقدم ومتوقع الإنجاز خلال يومي عمل، وسنرسل لك الإيصال هنا.',read:''},at(0,9,10));
  put('Messages',{clientId:c1.id,from:'client',by:'demo',body:'أرسلت صورة الفحص الفني على الواتساب.',read:''},at(0,10,2));
  var f=DriveApp.createFolder('منجز - ملفات العملاء');DB.props.FILES_FOLDER=f.getId();var cf=f.createFolder(c1.id);
  var file=cf.createFile(Utilities.newBlob('منجز لخدمات الأعمال\nملف تجريبي: إيصال تجديد الرخصة التجارية\nرقم المرجع LIC-2026-5521\n','text/plain','إيصال تجديد الرخصة (تجريبي).txt'));
  put('Files',{clientId:c1.id,txnId:'T-0001',title:'إيصال تجديد الرخصة التجارية',url:file.getUrl(),fileId:file.getId(),by:'sara'},at(-26,12));
  // attendance and work of the last five days
  [[sara,-4,'07:58','16:05'],[sara,-3,'08:22','16:00'],[sara,-2,'07:55','15:40'],[sara,-1,'08:01','16:10'],[ali,-4,'08:40','16:00'],[ali,-3,'08:05','16:02'],[ali,-1,'08:00','14:30'],[sara,0,'07:58',''],[ali,0,'08:24','']].forEach(function(x){
    var d=day(x[1]),li=d+' '+x[2],lo=x[3]?d+' '+x[3]:'';put('Sessions',{staffId:x[0].id,username:x[0].username,login:li,lastSeen:lo||d+' 12:30',logout:lo,minutes:lo?mins(li,lo):'',closedBy:lo?'خروج':''},li)});
  [[sara,-4,'create','Transactions','T-0002','إضافة معاملة: تقديم تجديد إقامة إلكترونياً · بانتظار المستندات',c1],[sara,-3,'status','Transactions','T-0002','معاملة T-0002 (تقديم تجديد إقامة إلكترونياً): بانتظار المستندات ← قيد المتابعة لدى الجهة',c1],
   [sara,-2,'file','Files','F-0001','رفع ملف للعميل: إيصال تجديد الرخصة التجارية',c1],[ali,-3,'create','Transactions','T-0004','إضافة معاملة: توثيق عقد عمل إلكترونياً · قيد التقديم',c2],
   [ali,-1,'status','Requests','R-0003','طلب R-0003 (شركة النخبة للتجارة): جديد ← تم التواصل',c2],[sara,-1,'create','Transactions','T-0003','إضافة معاملة: تجديد استمارة مركبة · بانتظار المستندات',c1],[ali,0,'status','Transactions','T-0004','معاملة T-0004 (توثيق عقد عمل إلكترونياً): بانتظار المستندات ← قيد التقديم',c2]].forEach(function(x){
    put('Activity',{staffId:x[0].id,username:x[0].username,action:x[2],sheet:x[3],recordId:x[4],clientId:x[6].id,summary:x[5]},day(x[1])+' 11:15')});
  persist();
}
if(fresh||!DB.sheets.Staff)seed();

// ---------- the site talks to this in-browser server instead of the network ----------
var realFetch=window.fetch.bind(window);
window.fetch=function(url,opts){
  if(url!==CFG.API)return realFetch(url,opts);
  var out;try{out=doPost({postData:{contents:(opts&&opts.body)||'{}'}}).getContent()}catch(e){out=JSON.stringify({ok:false,error:String(e&&e.message||e)})}
  return new Promise(function(res){setTimeout(function(){res(new Response(out,{status:200,headers:{'Content-Type':'application/json'}}))},120)})};

// ---------- banner ----------
document.addEventListener('DOMContentLoaded',function(){
  var en=document.documentElement.lang==='en',crm=/crm\.html/.test(location.pathname),b=document.createElement('div');b.className='demobar';b.setAttribute('role','note');
  b.innerHTML=en
    ?'<b>Demo version.</b> Sample data, saved in this browser only; nothing reaches Munjiz. Client login: <code>demo</code> / <code>Demo1234</code> · Employee: <code>sara</code> / <code>Demo1234</code> · Management: <code>123</code> / <code>123</code> (change required). <button type="button" data-d="reset">Reset sample data</button> <button type="button" data-d="stop">Exit demo</button>'
    :'<b>نسخة تجريبية.</b> بيانات تجريبية محفوظة في هذا المتصفح فقط ولا تصل إلى منجز. دخول العميل: <code>demo</code> / <code>Demo1234</code> · الموظف: <code>sara</code> / <code>Demo1234</code> · الإدارة: <code>123</code> / <code>123</code> (يُطلب تغييرها). <button type="button" data-d="reset">إعادة البيانات التجريبية</button> <button type="button" data-d="stop">إنهاء التجربة</button>';
  b.onclick=function(e){var x=e.target.closest('[data-d]');if(x)window.MUNJIZ_DEMO[x.dataset.d]()};
  if(crm)return;   // the dashboard shows its own demo bar
  var main=document.querySelector('main .wrap')||document.querySelector('main')||document.body;main.insertBefore(b,main.firstChild);
});
})();
