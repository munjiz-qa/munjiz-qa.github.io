-- بصيرة كولر من منجز: قاعدة البيانات والواجهة الخلفية (Supabase / PostgreSQL)
-- كل الجداول مغلقة بسياسات RLS، والوصول يتم فقط عبر دوال RPC محددة الصلاحيات.
-- الخصوصية: لا يُرفع أي دفتر عناوين. كل اسم أو بلاغ يضيفه مستخدم مسجّل بنفسه وبموافقته.

create extension if not exists pgcrypto with schema extensions;

-- ======================== الجداول ========================
create table if not exists public.bc_users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 80),
  email text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text,
  pass_hash text not null,
  role text not null default 'user' check (role in ('user','admin')),
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now(),
  last_login timestamptz
);

create table if not exists public.bc_sessions (
  token text primary key,
  user_id uuid not null references public.bc_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);

create table if not exists public.bc_numbers (
  e164 text primary key check (e164 ~ '^\+[1-9][0-9]{6,14}$'),
  display_name text,
  name_source text default 'community' check (name_source in ('community','verified','owner')),
  category text default 'personal' check (category in ('personal','business','government','spam','fraud','telemarketing','robocall')),
  verified boolean not null default false,
  hidden boolean not null default false,
  lookups integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bc_names (
  id bigint generated always as identity primary key,
  e164 text not null references public.bc_numbers(e164) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  user_id uuid references public.bc_users(id) on delete set null,
  status text not null default 'approved' check (status in ('approved','rejected')),
  created_at timestamptz not null default now(),
  unique (e164, user_id)
);

create table if not exists public.bc_reports (
  id bigint generated always as identity primary key,
  e164 text not null references public.bc_numbers(e164) on delete cascade,
  kind text not null check (kind in ('spam','fraud','telemarketing','robocall','harassment','other')),
  comment text check (comment is null or char_length(comment) <= 280),
  user_id uuid references public.bc_users(id) on delete set null,
  status text not null default 'open' check (status in ('open','confirmed','dismissed')),
  created_at timestamptz not null default now()
);
create unique index if not exists bc_reports_one_open_per_user on public.bc_reports(e164, user_id) where status <> 'dismissed';

create table if not exists public.bc_ratings (
  e164 text not null references public.bc_numbers(e164) on delete cascade,
  user_id uuid not null references public.bc_users(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (e164, user_id)
);

create table if not exists public.bc_requests (
  id bigint generated always as identity primary key,
  e164 text not null,
  kind text not null check (kind in ('remove','correct')),
  contact text not null,
  details text,
  status text not null default 'open' check (status in ('open','done','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.bc_audit (
  id bigint generated always as identity primary key,
  actor uuid references public.bc_users(id) on delete set null,
  action text not null,
  target text,
  created_at timestamptz not null default now()
);

alter table public.bc_users enable row level security;
alter table public.bc_sessions enable row level security;
alter table public.bc_numbers enable row level security;
alter table public.bc_names enable row level security;
alter table public.bc_reports enable row level security;
alter table public.bc_ratings enable row level security;
alter table public.bc_requests enable row level security;
alter table public.bc_audit enable row level security;
-- لا سياسات = لا وصول مباشر من المتصفح. كل شيء عبر الدوال أدناه.

-- ======================== أدوات داخلية ========================
create or replace function public.bc_norm(p text) returns text
language plpgsql immutable set search_path = public as $$
declare d text;
begin
  if p is null then return null; end if;
  d := regexp_replace(translate(p, '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'), '[^0-9+]', '', 'g');
  if d like '00%' then d := '+' || substr(d, 3); end if;
  if d like '+%' then d := '+' || replace(substr(d, 2), '+', '');
  else
    d := replace(d, '+', '');
    if char_length(d) = 8 then d := '+974' || d;          -- رقم قطري محلي
    elsif d like '974%' and char_length(d) = 11 then d := '+' || d;
    else d := '+' || d; end if;
  end if;
  if d !~ '^\+[1-9][0-9]{6,14}$' then return null; end if;
  return d;
end $$;

create or replace function public.bc_me(p_token text) returns public.bc_users
language sql stable security definer set search_path = public as $$
  select u.* from bc_sessions s join bc_users u on u.id = s.user_id
  where s.token = p_token and s.expires_at > now() and u.status = 'active' limit 1
$$;

create or replace function public.bc_require(p_token text, p_admin boolean default false) returns public.bc_users
language plpgsql stable security definer set search_path = public as $$
declare u bc_users;
begin
  u := bc_me(p_token);
  if u.id is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if p_admin and u.role <> 'admin' then raise exception 'ADMIN_ONLY' using errcode = 'P0001'; end if;
  return u;
end $$;

create or replace function public.bc_touch(p_e164 text) returns void
language plpgsql security definer set search_path = public as $$
declare top_name text; spam int; total int;
begin
  select name into top_name from bc_names where e164 = p_e164 and status = 'approved'
    group by name order by count(*) desc, max(created_at) desc limit 1;
  select count(*) filter (where kind in ('spam','fraud','telemarketing','robocall','harassment')), count(*)
    into spam, total from bc_reports where e164 = p_e164 and status <> 'dismissed';
  update bc_numbers set
    display_name = case when verified then display_name else coalesce(top_name, display_name) end,
    category = case
      when verified then category
      when spam >= 3 then (select kind from bc_reports where e164 = p_e164 and status <> 'dismissed' and kind <> 'other' group by kind order by count(*) desc limit 1)
      else category end,
    updated_at = now()
  where e164 = p_e164;
end $$;

create or replace function public.bc_score(p_e164 text) returns int
language sql stable security definer set search_path = public as $$
  -- مؤشر الإزعاج 0–100: البلاغات المؤكدة تزن أكثر، والتقييمات الإيجابية تخفّضه
  select greatest(0, least(100,
      coalesce((select sum(case when status = 'confirmed' then 30 else 18 end) from bc_reports where e164 = p_e164 and status <> 'dismissed' and kind <> 'other'), 0)
    + coalesce((select sum(case when value = -1 then 12 else -15 end) from bc_ratings where e164 = p_e164), 0)
  ))::int
$$;

create or replace function public.bc_card(p_e164 text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'e164', n.e164, 'name', n.display_name, 'category', n.category, 'verified', n.verified,
    'lookups', n.lookups, 'spam_score', bc_score(n.e164), 'updated_at', n.updated_at,
    'reports', (select count(*) from bc_reports r where r.e164 = n.e164 and r.status <> 'dismissed'),
    'safe_votes', (select count(*) from bc_ratings t where t.e164 = n.e164 and t.value = 1),
    'spam_votes', (select count(*) from bc_ratings t where t.e164 = n.e164 and t.value = -1),
    'kinds', coalesce((select jsonb_object_agg(kind, c) from (select kind, count(*) c from bc_reports r where r.e164 = n.e164 and r.status <> 'dismissed' group by kind) k), '{}'::jsonb),
    'comments', coalesce((select jsonb_agg(jsonb_build_object('kind', kind, 'comment', comment, 'at', created_at) order by created_at desc)
        from (select kind, comment, created_at from bc_reports r where r.e164 = n.e164 and r.status <> 'dismissed' and comment is not null order by created_at desc limit 5) c), '[]'::jsonb),
    'alt_names', coalesce((select jsonb_agg(name) from (select name from bc_names a where a.e164 = n.e164 and a.status = 'approved' group by name order by count(*) desc limit 4) x), '[]'::jsonb)
  ) from bc_numbers n where n.e164 = p_e164 and not n.hidden
$$;

-- ======================== الحسابات ========================
create or replace function public.bc_register(p_name text, p_email text, p_password text, p_phone text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare u bc_users; t text;
begin
  if char_length(coalesce(p_password, '')) < 8 then raise exception 'WEAK_PASSWORD' using errcode = 'P0001'; end if;
  if exists (select 1 from bc_users where lower(email) = lower(trim(p_email))) then raise exception 'EMAIL_TAKEN' using errcode = 'P0001'; end if;
  insert into bc_users(full_name, email, phone, pass_hash)
    values (trim(p_name), lower(trim(p_email)), bc_norm(p_phone), crypt(p_password, gen_salt('bf', 10)))
    returning * into u;
  t := encode(gen_random_bytes(32), 'hex');
  insert into bc_sessions(token, user_id) values (t, u.id);
  update bc_users set last_login = now() where id = u.id;
  return jsonb_build_object('token', t, 'user', jsonb_build_object('id', u.id, 'name', u.full_name, 'email', u.email, 'phone', u.phone, 'role', u.role, 'created_at', u.created_at));
end $$;

create or replace function public.bc_login(p_email text, p_password text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare u bc_users; t text;
begin
  select * into u from bc_users where lower(email) = lower(trim(p_email));
  if u.id is null or u.pass_hash <> crypt(p_password, u.pass_hash) then raise exception 'BAD_LOGIN' using errcode = 'P0001'; end if;
  if u.status <> 'active' then raise exception 'SUSPENDED' using errcode = 'P0001'; end if;
  delete from bc_sessions where user_id = u.id and expires_at < now();
  t := encode(gen_random_bytes(32), 'hex');
  insert into bc_sessions(token, user_id) values (t, u.id);
  update bc_users set last_login = now() where id = u.id;
  return jsonb_build_object('token', t, 'user', jsonb_build_object('id', u.id, 'name', u.full_name, 'email', u.email, 'phone', u.phone, 'role', u.role, 'created_at', u.created_at));
end $$;

create or replace function public.bc_logout(p_token text) returns void
language sql security definer set search_path = public as $$ delete from bc_sessions where token = p_token $$;

create or replace function public.bc_session(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare u bc_users;
begin
  u := bc_me(p_token);
  if u.id is null then return null; end if;
  return jsonb_build_object('id', u.id, 'name', u.full_name, 'email', u.email, 'phone', u.phone, 'role', u.role, 'created_at', u.created_at);
end $$;

-- ======================== البحث والمساهمة ========================
create or replace function public.bc_lookup(p_number text, p_count boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare e text; card jsonb;
begin
  e := bc_norm(p_number);
  if e is null then raise exception 'BAD_NUMBER' using errcode = 'P0001'; end if;
  if p_count then update bc_numbers set lookups = lookups + 1 where e164 = e and not hidden; end if;
  card := bc_card(e);
  return coalesce(card, jsonb_build_object('e164', e, 'name', null, 'unknown', true, 'spam_score', 0, 'reports', 0));
end $$;

create or replace function public.bc_ensure(e text) returns void
language sql security definer set search_path = public as $$
  insert into bc_numbers(e164) values (e) on conflict do nothing
$$;

create or replace function public.bc_suggest_name(p_token text, p_number text, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u bc_users; e text; nm text;
begin
  u := bc_require(p_token);
  e := bc_norm(p_number); if e is null then raise exception 'BAD_NUMBER' using errcode = 'P0001'; end if;
  nm := regexp_replace(trim(p_name), '\s+', ' ', 'g');
  if char_length(nm) < 2 or char_length(nm) > 60 then raise exception 'BAD_NAME' using errcode = 'P0001'; end if;
  if exists (select 1 from bc_numbers where e164 = e and hidden) then raise exception 'NUMBER_PROTECTED' using errcode = 'P0001'; end if;
  perform bc_ensure(e);
  insert into bc_names(e164, name, user_id) values (e, nm, u.id)
    on conflict (e164, user_id) do update set name = excluded.name, created_at = now(), status = 'approved';
  perform bc_touch(e);
  return bc_card(e);
end $$;

create or replace function public.bc_report(p_token text, p_number text, p_kind text, p_comment text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u bc_users; e text;
begin
  u := bc_require(p_token);
  e := bc_norm(p_number); if e is null then raise exception 'BAD_NUMBER' using errcode = 'P0001'; end if;
  if exists (select 1 from bc_numbers where e164 = e and hidden) then raise exception 'NUMBER_PROTECTED' using errcode = 'P0001'; end if;
  perform bc_ensure(e);
  if exists (select 1 from bc_reports where e164 = e and user_id = u.id and status <> 'dismissed') then
    update bc_reports set kind = p_kind, comment = nullif(trim(p_comment), ''), created_at = now()
      where e164 = e and user_id = u.id and status <> 'dismissed';
  else
    insert into bc_reports(e164, kind, comment, user_id) values (e, p_kind, nullif(trim(p_comment), ''), u.id);
  end if;
  perform bc_touch(e);
  return bc_card(e);
end $$;

create or replace function public.bc_rate(p_token text, p_number text, p_value int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u bc_users; e text;
begin
  u := bc_require(p_token);
  e := bc_norm(p_number); if e is null then raise exception 'BAD_NUMBER' using errcode = 'P0001'; end if;
  perform bc_ensure(e);
  if p_value = 0 then delete from bc_ratings where e164 = e and user_id = u.id;
  else insert into bc_ratings(e164, user_id, value) values (e, u.id, sign(p_value)::smallint)
    on conflict (e164, user_id) do update set value = excluded.value, created_at = now(); end if;
  return bc_card(e);
end $$;

create or replace function public.bc_my_activity(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare u bc_users;
begin
  u := bc_require(p_token);
  return jsonb_build_object(
    'names', coalesce((select jsonb_agg(jsonb_build_object('e164', e164, 'name', name, 'at', created_at) order by created_at desc) from bc_names where user_id = u.id), '[]'),
    'reports', coalesce((select jsonb_agg(jsonb_build_object('e164', e164, 'kind', kind, 'comment', comment, 'status', status, 'at', created_at) order by created_at desc) from bc_reports where user_id = u.id), '[]'),
    'ratings', coalesce((select jsonb_agg(jsonb_build_object('e164', e164, 'value', value, 'at', created_at) order by created_at desc) from bc_ratings where user_id = u.id), '[]'));
end $$;

create or replace function public.bc_request(p_number text, p_kind text, p_contact text, p_details text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare e text; rid bigint;
begin
  e := bc_norm(p_number); if e is null then raise exception 'BAD_NUMBER' using errcode = 'P0001'; end if;
  if char_length(coalesce(trim(p_contact), '')) < 5 then raise exception 'BAD_CONTACT' using errcode = 'P0001'; end if;
  insert into bc_requests(e164, kind, contact, details) values (e, p_kind, trim(p_contact), nullif(trim(p_details), '')) returning id into rid;
  return jsonb_build_object('id', rid, 'e164', e);
end $$;

-- قائمة الأرقام المزعجة لتطبيق الجوال (تُخزَّن على الهاتف للعمل دون إنترنت)
create or replace function public.bc_spam_list(p_min int default 40)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('e164', e164, 'name', display_name, 'category', category, 'score', s)), '[]')
  from (select e164, display_name, category, bc_score(e164) s from bc_numbers where not hidden) x where s >= p_min
$$;

create or replace function public.bc_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'numbers', (select count(*) from bc_numbers where not hidden),
    'reports', (select count(*) from bc_reports where status <> 'dismissed'),
    'users', (select count(*) from bc_users),
    'lookups', (select coalesce(sum(lookups), 0) from bc_numbers))
$$;

-- ======================== الإدارة ========================
create or replace function public.bc_admin_overview(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform bc_require(p_token, true);
  return jsonb_build_object(
    'stats', bc_stats() || jsonb_build_object(
       'open_reports', (select count(*) from bc_reports where status = 'open'),
       'open_requests', (select count(*) from bc_requests where status = 'open'),
       'spam_numbers', (select count(*) from bc_numbers where bc_score(e164) >= 40),
       'new_users_7d', (select count(*) from bc_users where created_at > now() - interval '7 days')),
    'top', coalesce((select jsonb_agg(x) from (select e164, display_name name, category, lookups, bc_score(e164) score from bc_numbers order by bc_score(e164) desc, lookups desc limit 10) x), '[]'));
end $$;

create or replace function public.bc_admin_list(p_token text, p_what text, p_q text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare q text := nullif(trim(coalesce(p_q, '')), '');
begin
  perform bc_require(p_token, true);
  if p_what = 'numbers' then
    return coalesce((select jsonb_agg(x) from (select e164, display_name name, category, verified, hidden, lookups, bc_score(e164) score,
      (select count(*) from bc_reports r where r.e164 = n.e164 and r.status <> 'dismissed') reports, updated_at
      from bc_numbers n where q is null or e164 like '%' || regexp_replace(q, '[^0-9]', '', 'g') || '%' or display_name ilike '%' || q || '%'
      order by updated_at desc limit 300) x), '[]');
  elsif p_what = 'reports' then
    return coalesce((select jsonb_agg(x) from (select r.id, r.e164, r.kind, r.comment, r.status, r.created_at, u.full_name reporter
      from bc_reports r left join bc_users u on u.id = r.user_id
      where q is null or r.e164 like '%' || regexp_replace(q, '[^0-9]', '', 'g') || '%'
      order by (r.status = 'open') desc, r.created_at desc limit 300) x), '[]');
  elsif p_what = 'users' then
    return coalesce((select jsonb_agg(x) from (select id, full_name name, email, phone, role, status, created_at, last_login,
      (select count(*) from bc_reports r where r.user_id = u.id) reports, (select count(*) from bc_names a where a.user_id = u.id) names
      from bc_users u where q is null or full_name ilike '%' || q || '%' or email ilike '%' || q || '%'
      order by created_at desc limit 300) x), '[]');
  elsif p_what = 'requests' then
    return coalesce((select jsonb_agg(x) from (select * from bc_requests order by (status = 'open') desc, created_at desc limit 300) x), '[]');
  elsif p_what = 'audit' then
    return coalesce((select jsonb_agg(x) from (select a.action, a.target, a.created_at, u.full_name actor from bc_audit a left join bc_users u on u.id = a.actor order by a.created_at desc limit 200) x), '[]');
  end if;
  raise exception 'BAD_LIST' using errcode = 'P0001';
end $$;

create or replace function public.bc_admin_number(p_token text, p_number text, p_name text, p_category text, p_verified boolean, p_hidden boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u bc_users; e text;
begin
  u := bc_require(p_token, true);
  e := bc_norm(p_number); if e is null then raise exception 'BAD_NUMBER' using errcode = 'P0001'; end if;
  perform bc_ensure(e);
  update bc_numbers set display_name = nullif(trim(p_name), ''), category = coalesce(p_category, category),
    verified = coalesce(p_verified, verified), hidden = coalesce(p_hidden, hidden),
    name_source = case when coalesce(p_verified, verified) then 'verified' else 'community' end, updated_at = now()
  where e164 = e;
  insert into bc_audit(actor, action, target) values (u.id, 'تعديل رقم', e);
  return jsonb_build_object('ok', true, 'e164', e);
end $$;

create or replace function public.bc_admin_delete_number(p_token text, p_number text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u bc_users;
begin
  u := bc_require(p_token, true);
  delete from bc_numbers where e164 = bc_norm(p_number);
  insert into bc_audit(actor, action, target) values (u.id, 'حذف رقم', bc_norm(p_number));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.bc_admin_report(p_token text, p_id bigint, p_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u bc_users; e text;
begin
  u := bc_require(p_token, true);
  update bc_reports set status = p_status where id = p_id returning e164 into e;
  perform bc_touch(e);
  insert into bc_audit(actor, action, target) values (u.id, case p_status when 'confirmed' then 'تأكيد بلاغ' when 'dismissed' then 'رفض بلاغ' else 'إعادة فتح بلاغ' end, e);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.bc_admin_user(p_token text, p_id uuid, p_role text, p_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u bc_users;
begin
  u := bc_require(p_token, true);
  if p_id = u.id and (p_role = 'user' or p_status = 'suspended') then raise exception 'SELF_LOCK' using errcode = 'P0001'; end if;
  update bc_users set role = coalesce(p_role, role), status = coalesce(p_status, status) where id = p_id;
  if p_status = 'suspended' then delete from bc_sessions where user_id = p_id; end if;
  insert into bc_audit(actor, action, target) values (u.id, 'تعديل مستخدم', p_id::text);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.bc_admin_request(p_token text, p_id bigint, p_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u bc_users; r bc_requests;
begin
  u := bc_require(p_token, true);
  update bc_requests set status = p_status where id = p_id returning * into r;
  if p_status = 'done' and r.kind = 'remove' then
    perform bc_ensure(r.e164);
    update bc_numbers set hidden = true, display_name = null where e164 = r.e164;
  end if;
  insert into bc_audit(actor, action, target) values (u.id, 'معالجة طلب', r.e164);
  return jsonb_build_object('ok', true);
end $$;

-- ======================== الصلاحيات ========================
revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.bc_register(text,text,text,text), public.bc_login(text,text), public.bc_logout(text),
  public.bc_session(text), public.bc_lookup(text,boolean), public.bc_suggest_name(text,text,text), public.bc_report(text,text,text,text),
  public.bc_rate(text,text,int), public.bc_my_activity(text), public.bc_request(text,text,text,text), public.bc_spam_list(int), public.bc_stats(),
  public.bc_admin_overview(text), public.bc_admin_list(text,text,text), public.bc_admin_number(text,text,text,text,boolean,boolean),
  public.bc_admin_delete_number(text,text), public.bc_admin_report(text,bigint,text), public.bc_admin_user(text,uuid,text,text),
  public.bc_admin_request(text,bigint,text)
  to anon, authenticated;
