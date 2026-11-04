import base64, os, shutil, re, sys
# بناء «شاطر حسن على الكمبيوتر»: python3 build.py <مجلد عمل فيه font/package من @fontsource/ibm-plex-sans-arabic>
# الناتج: dist/ShatirHassan-Desktop.zip في جذر المستودع
HERE=os.path.dirname(os.path.abspath(__file__))
REPO=os.path.abspath(os.path.join(HERE,'..','..'))
SP=os.path.abspath(sys.argv[1])
SRC=REPO+'/shatirhassan'
OUT=SP+'/pkg/ShatirHassan'
FD=SP+'/font/package/files'
shutil.rmtree(SP+'/pkg',ignore_errors=True); os.makedirs(OUT+'/app')
ar='U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC,U+102E0-102FB,U+10E60-10E7E,U+10EC2-10EC4,U+10EFC-10EFF,U+1EE00-1EEF1'
la='U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
css=[]
for sub,rng in (('arabic',ar),('latin',la)):
  for w in (400,500,600,700):
    b=base64.b64encode(open(f'{FD}/ibm-plex-sans-arabic-{sub}-{w}-normal.woff2','rb').read()).decode()
    css.append(f"@font-face{{font-family:'IBM Plex Sans Arabic';font-style:normal;font-display:swap;font-weight:{w};src:url(data:font/woff2;base64,{b}) format('woff2');unicode-range:{rng}}}")
FONT='<style>/* IBM Plex Sans Arabic · SIL Open Font License 1.1 · مضمّن للعمل دون إنترنت */\n'+'\n'.join(css)+'</style>'
GF=re.compile(r'<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2[^"]*">')
def rep(s,a,b,n=None):
  c=s.count(a)
  assert c and (n is None or c==n),(a,c)
  return s.replace(a,b)

# ---- doc page
d=open(SRC+'/index.html',encoding='utf-8').read()
d,k=GF.subn(FONT,d); assert k==1
d=re.sub(r'\s*<a href="desktop/">[^<]*</a>','',d)
d=rep(d,'href="app/"','href="app/index.html"',1)
d=rep(d,'href="app/#/','href="app/index.html#/',2)
open(OUT+'/index.html','w',encoding='utf-8').write(d)

# ---- app
a=open(SRC+'/app/index.html',encoding='utf-8').read()
a,k=GF.subn(FONT,a); assert k==1
a=re.sub(r'<a class="btn ghost" href="\.\./desktop/">[^<]*</a>','',a)
a=rep(a,'href="../"','href="../index.html"',2)
a=rep(a,'نموذج عامل للتجربة، والبيانات محفوظة في هذا المتصفح فقط','نسخة الكمبيوتر المستقلة · تعمل دون إنترنت، والبيانات محفوظة على هذا الجهاز',1)
# backup / restore card in admin settings
old='<div class="card"><h3>بيانات التجربة</h3><p class="sub" style="margin-bottom:10px">تعيد النظام إلى بياناته الأولى في هذا المتصفح.</p>'
new=('<div class="card"><h3>النسخ الاحتياطي والاستعادة</h3><p class="sub" style="margin-bottom:10px">احفظ نسخة كاملة من بيانات النظام في ملف على جهازك، واستعدها متى شئت أو انقلها إلى كمبيوتر آخر. يُنصح بحفظ نسخة في نهاية كل يوم عمل.</p>'
     '<div class="row"><button class="btn" data-act="backup">حفظ نسخة احتياطية</button><button class="btn ghost" data-act="restore">استعادة من نسخة</button></div>'
     '<input type="file" id="restoreFile" accept=".json,application/json" hidden>'
     '<p class="sub" style="margin-top:10px">${db.lastBackup?`آخر نسخة محفوظة: ${fdt(db.lastBackup)}`:\'لم تُحفظ أي نسخة بعد.\'}</p></div>\n  '
     '<div class="card"><h3>بيانات التجربة</h3><p class="sub" style="margin-bottom:10px">تعيد النظام إلى بياناته الأولى على هذا الجهاز.</p>')
a=rep(a,old,new,1)
old='  async reset(){'
new=('''  backup(){const stamp=new Date();db.lastBackup=stamp.toISOString();logA('حفظ نسخة احتياطية');save();
    const name=`shatirhassan-backup-${stamp.getFullYear()}-${pad(stamp.getMonth()+1)}-${pad(stamp.getDate())}-${pad(stamp.getHours())}${pad(stamp.getMinutes())}.json`;
    const url=URL.createObjectURL(new Blob([JSON.stringify(db,null,1)],{type:'application/json'}));
    const l=document.createElement('a');l.href=url;l.download=name;document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
    toast('حُفظت النسخة في مجلد التنزيلات: '+name);render()},
  restore(){const i=$('#restoreFile');i.value='';i.click()},
  restoreOk(){const x=ACTS.restore.pending;if(!x)return closeDlg();ACTS.restore.pending=null;const cur=me();db=x;if(!cur||!db.users.some(u=>u.id===cur.id))store.del(SKEY);
    logA('استعادة البيانات من نسخة احتياطية','النظام');save();closeDlg();toast('استُعيدت البيانات بنجاح');go(me()?(me().role==='admin'?'#/a/settings':'#/c/home'):'#/login')},
''')+old
a=rep(a,old,new,1)
old="window.addEventListener('hashchange',render);"
new=('''document.addEventListener('change',e=>{if(e.target.id!=='restoreFile'||!e.target.files[0])return;const fr=new FileReader();
  fr.onload=()=>{let x;try{x=JSON.parse(fr.result)}catch(_){return toast('الملف المختار ليس نسخة احتياطية صالحة')}
    if(!x||x.v!==1||!Array.isArray(x.users)||!x.users.some(u=>u.role==='admin'))return toast('الملف المختار ليس نسخة احتياطية صالحة لشاطر حسن');
    ACTS.restore.pending=x;const n=x.users.filter(u=>u.role==='customer').length;
    dialog(`<h3>تأكيد الاستعادة</h3><p class="sub">ستُستبدل البيانات الحالية على هذا الجهاز ببيانات النسخة المختارة.</p><div class="split"><span>تاريخ النسخة</span><b>${x.lastBackup?fdt(x.lastBackup):'—'}</b></div><div class="split"><span>عدد العملاء</span><b>${n}</b></div><div class="split"><span>طلبات التمويل</span><b>${(x.reqs||[]).length}</b></div>
     <div class="row" style="margin-top:16px"><button class="btn" data-act="restoreOk">استعادة الآن</button><button class="btn ghost" data-act="close">إلغاء</button></div>`)};
  fr.readAsText(e.target.files[0])});
''')+old
a=rep(a,old,new,1)

# ---- server mode: data file through the local desktop program
a=rep(a,"const save=()=>store.set(KEY,JSON.stringify(db));",
"""const SRV=location.protocol==='http:'&&/^(127\\.0\\.0\\.1|localhost)$/.test(location.hostname);
let srvInfo=null,srvSeq=Date.now()*1000,srvWarned=0;
function push(s){fetch('/api/db',{method:'PUT',headers:{'Content-Type':'application/json','X-Seq':String(++srvSeq)},body:s,keepalive:s.length<60000})
  .then(r=>{if(!r.ok)throw 0}).catch(()=>{if(Date.now()-srvWarned>15000){srvWarned=Date.now();toast('تعذّر الحفظ في ملف البيانات. تأكد أن برنامج شاطر حسن يعمل ثم أعد المحاولة')}})}
const save=()=>{const s=JSON.stringify(db);store.set(KEY,s);if(SRV)push(s)};""",1)
a=rep(a,"""(async()=>{
  try{db=JSON.parse(store.get(KEY)||'null')}catch(e){db=null}
  if(!db||db.v!==1)await seed();""","""(async()=>{
  let loaded=false;
  if(SRV){try{const r=await fetch('/api/db',{cache:'no-store'});if(r.status===200){db=await r.json();loaded=true}
    srvInfo=await (await fetch('/api/info',{cache:'no-store'})).json();
    const ping=()=>fetch('/api/ping',{cache:'no-store'}).catch(()=>{});ping();setInterval(ping,20000)}catch(e){}}
  if(!loaded){try{db=JSON.parse(store.get(KEY)||'null')}catch(e){db=null}if(db&&db.v===1&&SRV)save()}
  if(!db||db.v!==1)await seed();
  if(location.protocol==='file:')setTimeout(()=>toast('وضع العرض فقط: شغّل برنامج شاطر حسن ليُحفظ عملك في ملف البيانات'),600);""",1)
a=rep(a,"<span>شاطر حسن · نسخة الكمبيوتر المستقلة · تعمل دون إنترنت، والبيانات محفوظة على هذا الجهاز</span>",
 "<span>شاطر حسن · نسخة الكمبيوتر المستقلة · تعمل دون إنترنت، والبيانات محفوظة على هذا الجهاز وحده</span>",1)
a=rep(a,"""<p class="sub" style="margin-top:10px">${db.lastBackup?""","""${srvInfo?`<p class="sub" style="margin-top:10px">ملف البيانات على هذا الجهاز: <span dir="ltr" style="word-break:break-all">${esc(srvInfo.dbFile)}</span>، ويحفظ البرنامج تلقائياً نسخة يومية في مجلد <span dir="ltr" style="word-break:break-all">${esc(srvInfo.backups)}</span> ويحتفظ بآخر 60 يوماً.</p>`:''}
  <p class="sub" style="margin-top:10px">${db.lastBackup?""",1)
open(OUT+'/app/index.html','w',encoding='utf-8').write(a)
print('ok', len(d)//1024, len(a)//1024)
X=HERE+'/extra'
import subprocess
open(OUT+'/app/index.html','w',encoding='utf-8').write(a)
# restructure: web files under web/, binaries at top
WEB=OUT+'/web'; os.makedirs(WEB+'/app')
shutil.move(OUT+'/index.html',WEB+'/index.html'); shutil.move(OUT+'/app/index.html',WEB+'/app/index.html'); os.rmdir(OUT+'/app')
G=SP+'/go'; shutil.rmtree(G,ignore_errors=True); shutil.copytree(HERE+'/go',G); shutil.copytree(WEB,G+'/web')
os.makedirs(OUT+'/bin')
for goos,arch,dst,extra in (('windows','amd64','ShatirHassan-Windows.exe',['-H','windowsgui']),('darwin','arm64','bin/shatirhassan-mac-arm64',[]),('darwin','amd64','bin/shatirhassan-mac-intel',[]),('linux','amd64','ShatirHassan-Linux',[])):
  env=dict(os.environ,GOOS=goos,GOARCH=arch,CGO_ENABLED='0')
  ld='-s -w'+(' '+' '.join(extra) if extra else '')
  subprocess.run(['go','build','-trimpath','-ldflags',ld,'-o',OUT+'/'+dst,'.'],cwd=G,env=env,check=True)
  os.chmod(OUT+'/'+dst,0o755)
open(OUT+'/0-READ-ME-FIRST.html','w',encoding='utf-8').write(open(X+'/readme.html',encoding='utf-8').read().replace('%FONT%',FONT).replace('../../../shatirhassan/index.html','web/index.html'))
shutil.copy(X+'/mac.command',OUT+'/ShatirHassan-Mac.command'); os.chmod(OUT+'/ShatirHassan-Mac.command',0o755)
shutil.copy(SP+'/font/package/LICENSE',OUT+'/web/FONT-LICENSE.txt')
import zipfile
os.makedirs(REPO+'/dist',exist_ok=True); z=REPO+'/dist/ShatirHassan-Desktop.zip'
with zipfile.ZipFile(z,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as zf:
  for root,_,files in os.walk(OUT):
    for f in sorted(files):
      p=os.path.join(root,f); arc=os.path.relpath(p,SP+'/pkg')
      zi=zipfile.ZipInfo.from_file(p,arc); zi.compress_type=zipfile.ZIP_DEFLATED
      zf.writestr(zi,open(p,'rb').read())
print('zip',os.path.getsize(z)//1024,'KB')
