import base64, os, shutil, re, sys
# بناء «بركات على الكمبيوتر»: python3 build.py <مجلد عمل فيه font/package من @fontsource/ibm-plex-sans-arabic>
# الناتج: dist/Barakat-Desktop.zip في جذر المستودع
HERE=os.path.dirname(os.path.abspath(__file__))
REPO=os.path.abspath(os.path.join(HERE,'..','..'))
SP=os.path.abspath(sys.argv[1])
SRC=REPO+'/barakat'
OUT=SP+'/pkg/Barakat'
FD=SP+'/font/package/files'
shutil.rmtree(SP+'/pkg',ignore_errors=True); os.makedirs(OUT+'/web/document')
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

# ---- foundational document -> web/document/index.html
d=open(SRC+'/document/index.html',encoding='utf-8').read()
d,k=GF.subn(FONT,d); assert k==1
d=re.sub(r'\s*<a href="\.\./desktop/">[^<]*</a>','',d)
open(OUT+'/web/document/index.html','w',encoding='utf-8').write(d)

# ---- site + banking app -> web/index.html
a=open(SRC+'/index.html',encoding='utf-8').read()
a,k=GF.subn(FONT,a); assert k==1
a=rep(a,'<li><a href="desktop/">نسخة الكمبيوتر</a></li>','',1)
a=re.sub(r'\n<link rel="manifest"[^>]*>\n<link rel="apple-touch-icon"[^>]*>','',a)
a=rep(a,'© بركات · نموذج عامل للتجربة، والبيانات محفوظة في هذا المتصفح فقط','© بركات · نسخة الكمبيوتر المستقلة · تعمل دون إنترنت، والبيانات محفوظة على هذا الجهاز وحده',1)
a=rep(a,"const save=()=>store.set(KEY,JSON.stringify(db));",
"""const SRV=location.protocol==='http:'&&/^(127\\.0\\.0\\.1|localhost)$/.test(location.hostname);
let srvInfo=null,srvSeq=Date.now()*1000,srvWarned=0;
function push(s){fetch('/api/db',{method:'PUT',headers:{'Content-Type':'application/json','X-Seq':String(++srvSeq)},body:s,keepalive:s.length<60000})
  .then(r=>{if(!r.ok)throw 0}).catch(()=>{if(Date.now()-srvWarned>15000){srvWarned=Date.now();toast('تعذّر الحفظ في ملف البيانات. تأكد أن برنامج بركات يعمل ثم أعد المحاولة')}})}
const save=()=>{const s=JSON.stringify(db);store.set(KEY,s);if(SRV)push(s)};""",1)
a=rep(a,"""(async()=>{
  try{db=JSON.parse(store.get(KEY)||'null')}catch(e){db=null}
  if(!db||db.v!==1)await seed();""","""(async()=>{
  let loaded=false;
  if(SRV){try{const r=await fetch('/api/db',{cache:'no-store'});if(r.status===200){db=await r.json();loaded=true}
    srvInfo=await (await fetch('/api/info',{cache:'no-store'})).json();
    const ping=()=>fetch('/api/ping',{cache:'no-store'}).catch(()=>{});ping();setInterval(ping,20000)}catch(e){}}
  if(!loaded){try{db=JSON.parse(store.get(KEY)||'null')}catch(e){db=null}if(db&&db.v===1&&SRV){normDb();save()}}
  if(!db||db.v!==1)await seed();
  if(location.protocol==='file:')setTimeout(()=>toast('وضع العرض فقط: شغّل برنامج بركات ليُحفظ عملك في ملف البيانات'),600);""",1)
a=rep(a,"<!--SRVINFO-->","""${srvInfo?`<p class="sub" style="margin-top:10px">ملف البيانات على هذا الجهاز: <span dir="ltr" style="word-break:break-all">${esc(srvInfo.dbFile)}</span>، ويحفظ البرنامج تلقائياً نسخة يومية في مجلد <span dir="ltr" style="word-break:break-all">${esc(srvInfo.backups)}</span> ويحتفظ بآخر 60 يوماً.</p>`:''}""",1)
open(OUT+'/web/index.html','w',encoding='utf-8').write(a)
shutil.copy(SP+'/font/package/LICENSE',OUT+'/web/FONT-LICENSE.txt')

# ---- program binaries (the web folder is embedded in each)
import subprocess, zipfile
X=HERE+'/extra'
G=SP+'/go'; shutil.rmtree(G,ignore_errors=True); shutil.copytree(HERE+'/go',G); shutil.copytree(OUT+'/web',G+'/web')
os.makedirs(OUT+'/bin')
for goos,arch,dst,extra in (('windows','amd64','Barakat-Windows.exe',['-H','windowsgui']),('darwin','arm64','bin/barakat-mac-arm64',[]),('darwin','amd64','bin/barakat-mac-intel',[]),('linux','amd64','Barakat-Linux',[])):
  env=dict(os.environ,GOOS=goos,GOARCH=arch,CGO_ENABLED='0')
  ld='-s -w'+(' '+' '.join(extra) if extra else '')
  subprocess.run(['go','build','-trimpath','-ldflags',ld,'-o',OUT+'/'+dst,'.'],cwd=G,env=env,check=True)
  os.chmod(OUT+'/'+dst,0o755)
open(OUT+'/0-READ-ME-FIRST.html','w',encoding='utf-8').write(open(X+'/readme.html',encoding='utf-8').read().replace('%FONT%',FONT))
shutil.copy(X+'/mac.command',OUT+'/Barakat-Mac.command'); os.chmod(OUT+'/Barakat-Mac.command',0o755)
os.makedirs(REPO+'/dist',exist_ok=True); z=REPO+'/dist/Barakat-Desktop.zip'
with zipfile.ZipFile(z,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as zf:
  for root,_,files in os.walk(OUT):
    for f in sorted(files):
      p=os.path.join(root,f); arc=os.path.relpath(p,SP+'/pkg')
      zi=zipfile.ZipInfo.from_file(p,arc); zi.compress_type=zipfile.ZIP_DEFLATED
      zf.writestr(zi,open(p,'rb').read())
print('zip',os.path.getsize(z)//1024,'KB')
