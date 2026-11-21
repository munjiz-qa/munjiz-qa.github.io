// خادم محلي يحاكي واجهات Supabase التي يستخدمها خادم بركات (REST وAuth وFunctions) فوق Postgres حقيقي،
// ويشغّل دالة barakat-api نفسها (function/index.ts) داخل Node. للاختبار فقط، ولا يُنشر.
// PGURL=postgres://postgres@localhost/barakat?host=/var/tmp&port=55432 PORT=54321 node --experimental-strip-types mock-supabase.mjs
import http from 'node:http';import fs from 'node:fs';import crypto from 'node:crypto';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';import {createRequire} from 'node:module';
const require=createRequire(process.env.PG_MODULE_DIR?path.join(process.env.PG_MODULE_DIR,'x.js'):import.meta.url);
const {Pool}=require('pg');
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../../..');
const PORT=+process.env.PORT||54321, BASE=`http://127.0.0.1:${PORT}`;
const ANON='local-anon-key', SRK='local-service-role-key';
const pool=new Pool({connectionString:process.env.PGURL});
const q=(s,p)=>pool.query(s,p);
const tokens=new Map(), refresh=new Map();
const hashPw=(pw,id)=>crypto.createHash('sha256').update(id+'|'+pw).digest('hex');
const session=uid=>{const a=crypto.randomBytes(24).toString('hex'),r=crypto.randomBytes(24).toString('hex');const exp=Math.floor(Date.now()/1000)+3600;tokens.set(a,{uid,exp});refresh.set(r,uid);return {access_token:a,refresh_token:r,expires_in:3600,expires_at:exp,token_type:'bearer'}};
const send=(res,code,obj,h={})=>{res.writeHead(code,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS',...h});res.end(obj===undefined?'':JSON.stringify(obj))};
const raw=req=>new Promise(r=>{let b='';req.on('data',c=>b+=c);req.on('end',()=>r(b))});
const body=async req=>{const b=await raw(req);try{return b?JSON.parse(b):{}}catch(e){return {}}};
const keyOf=req=>(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
const ID=/^[a-z_]+$/;
// ---- the edge function itself, loaded with a minimal Deno shim
let fn=null;
globalThis.Deno={env:{get:k=>({SUPABASE_URL:BASE,SUPABASE_SERVICE_ROLE_KEY:SRK,SUPABASE_ANON_KEY:ANON})[k]},serve:h=>{fn=h}};
await import(pathToFileURL(path.join(HERE,'../function/index.ts')).href);
export const stats={calls:0};
const srv=http.createServer(async(req,res)=>{
  try{
    if(req.method==='OPTIONS'&&!req.url.startsWith('/functions/'))return send(res,200);
    const u=new URL(req.url,BASE);const p=u.pathname;
    if(p==='/functions/v1/barakat-api'){stats.calls++;
      const b=req.method==='POST'?await raw(req):undefined;
      const r=await fn(new Request(BASE+p,{method:req.method,headers:Object.entries(req.headers).filter(([,v])=>typeof v==='string'),body:b}));
      const h={};r.headers.forEach((v,k)=>h[k]=v);res.writeHead(r.status,h);return res.end(await r.text());
    }
    if(p.startsWith('/rest/v1/')){
      if(keyOf(req)!==SRK)return send(res,401,{message:'service role required in this mock'});
      if(p.startsWith('/rest/v1/rpc/')){if(p.slice(13)!=='barakat_commit')return send(res,404,{message:'no rpc'});
        const b=await body(req);try{const r=await q('select barakat_commit($1,$2) v',[b.p_version,JSON.stringify(b.p)]);return send(res,200,r.rows[0].v)}
        catch(e){return send(res,e.code==='40001'?409:400,{code:e.code,message:e.message,details:e.detail||null})}}
      const t=p.slice(9);if(!ID.test(t))return send(res,400,{message:'bad table'});
      const where=[],args=[];for(const [k,v] of u.searchParams){if(['select','order','limit','offset'].includes(k))continue;if(!ID.test(k)||!v.startsWith('eq.'))return send(res,400,{message:'filter'});args.push(v.slice(3));where.push(`${k}::text=$${args.length}`)}
      const order=(u.searchParams.get('order')||'').split(',').filter(Boolean).map(o=>{const [c,d]=o.split('.');if(!ID.test(c))throw new Error('order');return `${c} ${d==='desc'?'desc':'asc'}`}).join(',');
      const lim=Math.min(+u.searchParams.get('limit')||1000,1000),off=+u.searchParams.get('offset')||0;
      const r=await q(`select coalesce(json_agg(x),'[]') j from (select * from ${t}${where.length?' where '+where.join(' and '):''}${order?' order by '+order:''} limit ${lim} offset ${off}) x`,args);
      return send(res,200,r.rows[0].j);
    }
    if(p.startsWith('/auth/v1/admin/users')){
      if(keyOf(req)!==SRK)return send(res,401,{msg:'forbidden'});
      const id=p.split('/')[5];
      if(req.method==='POST'){const b=await body(req);const email=String(b.email||'').toLowerCase();
        if((await q('select 1 from auth.users where email=$1',[email])).rowCount)return send(res,422,{msg:'A user with this email address has already been registered'});
        if(String(b.password||'').length<6)return send(res,422,{msg:'Password should be at least 6 characters'});
        const nid=crypto.randomUUID();await q('insert into auth.users(id,email,encrypted_password) values($1,$2,$3)',[nid,email,hashPw(b.password,nid)]);return send(res,200,{id:nid,email})}
      if(req.method==='PUT'){const b=await body(req);if(b.password)await q('update auth.users set encrypted_password=$2 where id=$1',[id,hashPw(b.password,id)]);return send(res,200,{id})}
      if(req.method==='DELETE'){await q('delete from auth.users where id=$1',[id]);return send(res,200,{})}
      const pg=+u.searchParams.get('page')||1,pp=+u.searchParams.get('per_page')||50;
      const r=await q('select id,email from auth.users order by created_at limit $1 offset $2',[pp,(pg-1)*pp]);return send(res,200,{users:r.rows});
    }
    if(p==='/auth/v1/token'){if(req.headers.apikey!==ANON)return send(res,401,{msg:'apikey'});const b=await body(req);
      if(u.searchParams.get('grant_type')==='password'){const r=await q('select id,encrypted_password from auth.users where email=$1',[String(b.email||'').toLowerCase()]);
        const x=r.rows[0];if(!x||x.encrypted_password!==hashPw(String(b.password||''),x.id))return send(res,400,{error:'invalid_grant',error_description:'Invalid login credentials'});return send(res,200,session(x.id))}
      if(u.searchParams.get('grant_type')==='refresh_token'){const uid=refresh.get(b.refresh_token);if(!uid)return send(res,400,{error:'invalid_grant'});refresh.delete(b.refresh_token);return send(res,200,session(uid))}
      return send(res,400,{error:'unsupported_grant_type'})}
    if(p==='/auth/v1/user'){const t=tokens.get(keyOf(req));if(!t||t.exp*1000<Date.now())return send(res,401,{msg:'invalid JWT'});const r=await q('select id,email from auth.users where id=$1',[t.uid]);return r.rowCount?send(res,200,r.rows[0]):send(res,401,{msg:'gone'})}
    // ملفات الموقع نفسه من المستودع (المصدر نفسه يتجنب قيود المتصفح على الطلبات بين منفذين محليين)
    if(req.method==='GET'&&p.startsWith('/barakat/')){let f=path.normalize(path.join(ROOT,decodeURIComponent(p)));if(!f.startsWith(ROOT))return send(res,403,{});
      try{if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');const t={html:'text/html; charset=utf-8',js:'text/javascript',json:'application/json',webmanifest:'application/manifest+json',png:'image/png',svg:'image/svg+xml',css:'text/css'}[f.split('.').pop()]||'application/octet-stream';
        res.writeHead(200,{'Content-Type':t,'Cache-Control':'no-store'});return res.end(fs.readFileSync(f))}catch(e){return send(res,404,{message:'not found'})}}
    return send(res,404,{message:'not found'});
  }catch(e){console.error(e);send(res,500,{message:String(e.message)})}
});
srv.listen(PORT,'127.0.0.1',()=>console.log('mock supabase on',BASE));
