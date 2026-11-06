/* Teacher local backend: the same actions as the Apps Script server, kept in this browser.
   Used whenever config.js has no API, so accounts and the admin panel work with no external server. */
(function(){
const KEY = "teacher-db-v1";
const SESSION_DAYS = 30, MAX_FAILS = 5, LOCK_MIN = 15;
const SEED = [
  {id:"u-admin",   username:"admin",   name:"مدير المنصة",     role:"admin",   mustChange:true, salt:"3e2fdd130428b233abb86699050be713", hash:"42df48581c466756cdfa1a02933b691b82bf70aad336477c2c264302b6be4726"},
  {id:"u-student", username:"student", name:"متعلّم تجريبي", role:"learner", mustChange:true, salt:"80bbbbdd955e3965ec614a2279cf87a8", hash:"291970a7914407f3a8c801a2137f455b4a93ccbdfe2d3d44d33208805e2fc3af"}
];
const now = () => new Date().toISOString();
const rnd = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => b.toString(16).padStart(2,"0")).join("");
const fail = code => { const e = new Error(code); e.code = code; throw e; };
const norm = s => String(s||"").trim().toLowerCase();
const clean = (s,n) => String(s||"").replace(/[<>]/g,"").trim().slice(0,n);
const USER_RE = /^[a-z0-9][a-z0-9._@-]{2,59}$/;

async function hashPw(pw, salt = rnd(16)){
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(pw)), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({name:"PBKDF2", hash:"SHA-256", salt:new TextEncoder().encode(salt), iterations:120000}, k, 256);
  return {salt, hash:Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2,"0")).join("")};
}

function fresh(){
  return {v:1, users:SEED.map(u => Object.assign({active:true, created:now(), lastLogin:""}, u)),
    progress:{}, sessions:{}, fails:{}, settings:{sequential:true, allowSignup:true}, log:[{time:now(), actor:"system", action:"setup", detail:""}]};
}
function load(){
  let d = null;
  try{ d = JSON.parse(localStorage.getItem(KEY) || "null"); }catch(e){}
  if(!d || !Array.isArray(d.users)) d = fresh();
  if(!d.users.some(u => u.role==="admin" && u.active)){ const a = d.users.find(u => u.id==="u-admin"); if(a){ a.active = true; a.role = "admin"; } else d.users.unshift(Object.assign({active:true, created:now(), lastLogin:""}, SEED[0])); }
  // Accounts still on a default (seeded) password must set a new one before anything else.
  for(const u of d.users){ const s = SEED.find(x => x.id===u.id); if(s && u.mustChange===undefined && u.hash===s.hash) u.mustChange = true; }
  return d;
}
function save(d){ try{ localStorage.setItem(KEY, JSON.stringify(d)); }catch(e){ fail("storage"); } }
function log(d, actor, action, detail){ d.log.push({time:now(), actor, action, detail:detail||""}); if(d.log.length>500) d.log = d.log.slice(-500); }
const pub = u => ({id:u.id, username:u.username, name:u.name, role:u.role, active:!!u.active, mustChange:!!u.mustChange});
const settings = d => ({sequential:d.settings.sequential!==false, allowSignup:d.settings.allowSignup!==false});
function session(d, userId){ const t = rnd(24); d.sessions[t] = {userId, expires:Date.now()+SESSION_DAYS*864e5}; return t; }
const admins = d => d.users.filter(u => u.role==="admin" && u.active).length;

async function call(action, b){
  b = b || {};
  const d = load();
  for(const [t,s] of Object.entries(d.sessions)) if(s.expires < Date.now()) delete d.sessions[t];

  if(action==="publicSettings") return {ok:true, settings:settings(d)};
  if(action==="login"){
    const un = norm(b.username), f = d.fails[un];
    if(f && f.n >= MAX_FAILS && Date.now()-f.t < LOCK_MIN*6e4) fail("locked");
    const u = d.users.find(x => x.username===un);
    if(!u || (await hashPw(b.password, u.salt)).hash !== u.hash){
      d.fails[un] = {n:(f && Date.now()-f.t < LOCK_MIN*6e4 ? f.n : 0)+1, t:Date.now()}; save(d); fail("invalid");
    }
    if(!u.active) fail("disabled");
    delete d.fails[un]; u.lastLogin = now(); log(d, u.username, "login");
    const token = session(d, u.id); save(d);
    return {ok:true, token, user:pub(u), settings:settings(d)};
  }
  if(action==="register"){
    if(!settings(d).allowSignup) fail("signup_closed");
    const un = norm(b.username), name = clean(b.name,60);
    if(!USER_RE.test(un)) fail("bad_username");
    if(!name) fail("bad_name");
    if(String(b.password||"").length < 8) fail("weak_password");
    if(d.users.some(x => x.username===un)) fail("taken");
    const u = Object.assign({id:"u-"+rnd(8), username:un, name, role:"learner", active:true, created:now(), lastLogin:now()}, await hashPw(b.password));
    d.users.push(u); log(d, un, "register");
    const token = session(d, u.id); save(d);
    return {ok:true, token, user:pub(u), settings:settings(d)};
  }

  const s = d.sessions[b.token];
  const me = s && d.users.find(u => u.id===s.userId && u.active);
  if(!me) fail("auth");
  if(action==="me") return {ok:true, user:pub(me), settings:settings(d)};
  if(action==="logout"){ delete d.sessions[b.token]; save(d); return {ok:true}; }
  if(action==="getProgress"){ const p = d.progress[me.id]; return {ok:true, state:p ? p.state : null}; }
  if(action==="saveProgress"){ const m = b.summary||{}; d.progress[me.id] = {state:b.state||{}, done:m.done||[], xp:+m.xp||0, streak:+m.streak||0, quizAvg:+m.quizAvg||0, updated:now()}; save(d); return {ok:true}; }
  if(action==="updateProfile"){ me.name = clean(b.name,60) || me.name; save(d); return {ok:true, user:pub(me)}; }
  if(action==="changePassword"){
    if((await hashPw(b.current, me.salt)).hash !== me.hash) fail("invalid");
    if(String(b.password||"").length < 8) fail("weak_password");
    if(String(b.password)===String(b.current)) fail("same_password");
    Object.assign(me, await hashPw(b.password)); me.mustChange = false; log(d, me.username, "changePassword"); save(d); return {ok:true, user:pub(me)};
  }

  if(me.mustChange) fail("must_change");
  if(me.role !== "admin") fail("forbidden");
  const target = () => d.users.find(u => u.id===b.id) || fail("not_found");
  if(action==="listUsers") return {ok:true, users:d.users.map(u => { const p = d.progress[u.id]||{}; return Object.assign(pub(u), {created:u.created, lastLogin:u.lastLogin, done:p.done||[], xp:p.xp||0, streak:p.streak||0, quizAvg:p.quizAvg||0, last:p.updated||""}); })};
  if(action==="getLog") return {ok:true, log:d.log.slice(-200).reverse()};
  if(action==="getUserProgress"){ const p = d.progress[b.id]; return {ok:true, state:p ? p.state : null}; }
  if(action==="createUser"){
    const un = norm(b.username), name = clean(b.name,60), role = b.role==="admin" ? "admin" : "learner";
    if(!USER_RE.test(un)) fail("bad_username");
    if(!name) fail("bad_name");
    if(String(b.password||"").length < 8) fail("weak_password");
    if(d.users.some(x => x.username===un)) fail("taken");
    const u = Object.assign({id:"u-"+rnd(8), username:un, name, role, active:true, created:now(), lastLogin:""}, await hashPw(b.password));
    d.users.push(u); log(d, me.username, "createUser", un+" ("+role+")"); save(d); return {ok:true, user:pub(u)};
  }
  if(action==="updateUser"){
    const u = target(), patch = {};
    if(b.name !== undefined) patch.name = clean(b.name,60) || u.name;
    if(b.role !== undefined) patch.role = b.role==="admin" ? "admin" : "learner";
    if(b.active !== undefined) patch.active = !!b.active;
    if(u.id===me.id && (patch.role==="learner" || patch.active===false)) fail("self");
    if((patch.role==="learner" || patch.active===false) && u.role==="admin" && admins(d) <= 1) fail("last_admin");
    Object.assign(u, patch);
    if(patch.active===false) for(const [t,x] of Object.entries(d.sessions)) if(x.userId===u.id) delete d.sessions[t];
    log(d, me.username, "updateUser", u.username+" "+JSON.stringify(patch)); save(d); return {ok:true};
  }
  if(action==="resetPassword"){
    const u = target();
    if(String(b.password||"").length < 8) fail("weak_password");
    Object.assign(u, await hashPw(b.password)); if(u.id!==me.id) u.mustChange = true;
    for(const [t,x] of Object.entries(d.sessions)) if(x.userId===u.id && t!==b.token) delete d.sessions[t];
    log(d, me.username, "resetPassword", u.username); save(d); return {ok:true};
  }
  if(action==="deleteUser"){
    const u = target();
    if(u.id===me.id) fail("self");
    if(u.role==="admin" && admins(d) <= 1) fail("last_admin");
    d.users = d.users.filter(x => x.id!==u.id); delete d.progress[u.id];
    for(const [t,x] of Object.entries(d.sessions)) if(x.userId===u.id) delete d.sessions[t];
    log(d, me.username, "deleteUser", u.username); save(d); return {ok:true};
  }
  if(action==="resetProgress"){ const u = target(); delete d.progress[u.id]; log(d, me.username, "resetProgress", u.username); save(d); return {ok:true}; }
  if(action==="setSettings"){
    if(b.sequential !== undefined) d.settings.sequential = !!b.sequential;
    if(b.allowSignup !== undefined) d.settings.allowSignup = !!b.allowSignup;
    log(d, me.username, "setSettings", JSON.stringify({sequential:b.sequential, allowSignup:b.allowSignup})); save(d);
    return {ok:true, settings:settings(d)};
  }
  if(action==="exportData"){ log(d, me.username, "exportData"); save(d); const c = JSON.parse(JSON.stringify(d)); c.sessions = {}; c.fails = {}; return {ok:true, data:c}; }
  if(action==="importData"){
    const x = b.data;
    if(!x || !Array.isArray(x.users) || !x.users.some(u => u.role==="admin" && u.active)) fail("bad_file");
    x.sessions = {}; x.fails = {}; x.progress = x.progress||{}; x.settings = x.settings||{}; x.log = x.log||[];
    const keep = d.users.find(u => u.id===me.id);
    if(keep && !x.users.some(u => u.id===keep.id)) x.users.push(keep);
    x.sessions[b.token] = d.sessions[b.token];
    log(x, me.username, "importData", x.users.length+" users"); save(x); return {ok:true};
  }
  fail("unknown_action");
}
window.TeacherLocal = {call: (action, body) => call(action, body).catch(e => { if(!e.code) e.code = "error"; throw e; })};
})();
