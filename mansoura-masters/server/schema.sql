-- منجز · سجل طلاب ماجستير جامعة المنصورة، الدفعة الثانية 2026
-- المخطط الخاص munjiz_students غير مكشوف للواجهة، والوصول كله عبر دوال public.mjs_* المعرّفة بصلاحية المالك.
-- ملاحظة: النسخة الحية في Supabase (مشروع qxfadkkzkduiubswffkx) أحدث من هذا الملف: حذف ناعم بعمود students.deleted_at، وعدد المجموعات في settings.group_count، والبريد اختياري.

create schema if not exists munjiz_students;
revoke all on schema munjiz_students from public, anon, authenticated;

create table if not exists munjiz_students.settings (
  id int primary key default 1 check (id = 1),
  cohort text not null default 'جامعة المنصورة · ماجستير الدفعة الثانية 2026',
  registration_open boolean not null default true,
  editing_open boolean not null default true,
  show_roster boolean not null default true,
  default_capacity int,
  export_token text not null default encode(extensions.gen_random_bytes(18), 'hex'),
  sheet_url text,
  updated_at timestamptz not null default now()
);
insert into munjiz_students.settings (id) values (1) on conflict do nothing;

create table if not exists munjiz_students.groups (
  num int primary key check (num between 1 and 200),
  title text,
  capacity int check (capacity is null or capacity between 1 and 1000)
);
insert into munjiz_students.groups (num) select g from generate_series(1, 10) g on conflict do nothing;

create sequence if not exists munjiz_students.code_seq;

create table if not exists munjiz_students.students (
  id bigserial primary key,
  code text not null unique,
  full_name text not null,
  phone text not null unique,
  email text,
  group_num int references munjiz_students.groups(num) on update cascade,
  notes text,
  pin_hash text not null,
  source text not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists students_email_uq on munjiz_students.students (email) where email is not null;

create table if not exists munjiz_students.admins (
  id serial primary key,
  username text not null unique,
  pass_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists munjiz_students.sessions (
  token_hash text primary key,
  kind text not null check (kind in ('admin', 'student')),
  ref bigint not null,
  expires_at timestamptz not null
);

create table if not exists munjiz_students.attempts (
  id bigserial primary key,
  k text not null,
  at timestamptz not null default now()
);
create index if not exists attempts_k on munjiz_students.attempts (k, at);

create table if not exists munjiz_students.audit (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor text not null,
  action text not null,
  detail jsonb
);

alter table munjiz_students.settings enable row level security;
alter table munjiz_students.groups enable row level security;
alter table munjiz_students.students enable row level security;
alter table munjiz_students.admins enable row level security;
alter table munjiz_students.sessions enable row level security;
alter table munjiz_students.attempts enable row level security;
alter table munjiz_students.audit enable row level security;

-- ===== أدوات التوحيد =====
create or replace function munjiz_students.digits(t text) returns text language sql immutable as $$
  select translate(coalesce(t, ''), '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789')
$$;

create or replace function munjiz_students.norm_name(t text) returns text language plpgsql immutable as $$
declare s text;
begin
  s := replace(coalesce(t, ''), 'ـ', '');
  s := regexp_replace(s, '[\s ​-‏]+', ' ', 'g');
  s := btrim(s);
  if s = '' then raise exception 'اكتب الاسم الكامل' using errcode = 'P0001'; end if;
  if s ~ '[0-9٠-٩<>{}@#$%^*=_|\\/]' then raise exception 'الاسم يجب أن يحتوي على حروف فقط' using errcode = 'P0001'; end if;
  if array_length(regexp_split_to_array(s, ' '), 1) < 3 then raise exception 'اكتب الاسم ثلاثياً على الأقل' using errcode = 'P0001'; end if;
  if length(s) > 120 then raise exception 'الاسم أطول من المسموح' using errcode = 'P0001'; end if;
  return s;
end $$;

-- يعيد الرقم بصيغة دولية موحدة +20XXXXXXXXXX
create or replace function munjiz_students.norm_phone(t text) returns text language plpgsql immutable as $$
declare s text; plus boolean;
begin
  s := btrim(munjiz_students.digits(t));
  plus := left(s, 1) = '+';
  s := regexp_replace(s, '[^0-9]', '', 'g');
  if left(s, 2) = '00' then s := substr(s, 3); plus := true; end if;
  if length(s) = 11 and s ~ '^01[0125][0-9]{8}$' then return '+2' || s; end if;
  if length(s) = 10 and s ~ '^1[0125][0-9]{8}$' then return '+20' || s; end if;
  if length(s) = 12 and s ~ '^201[0125][0-9]{8}$' then return '+' || s; end if;
  if plus and left(s, 2) <> '20' and length(s) between 8 and 15 then return '+' || s; end if;
  raise exception 'رقم الهاتف غير صحيح، اكتبه بالشكل 01012345678' using errcode = 'P0001';
end $$;

create or replace function munjiz_students.fmt_phone(p text) returns text language sql immutable as $$
  select case when p ~ '^\+201[0-9]{9}$' then '0' || substr(p, 4) else p end
$$;

create or replace function munjiz_students.norm_email(t text) returns text language plpgsql immutable as $$
declare s text;
begin
  s := lower(btrim(coalesce(t, '')));
  if s = '' then return null; end if;
  if s !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' then raise exception 'البريد الإلكتروني غير صحيح' using errcode = 'P0001'; end if;
  return s;
end $$;

create or replace function munjiz_students.clean_notes(t text) returns text language sql immutable as $$
  select nullif(left(btrim(regexp_replace(coalesce(t, ''), '[ \t]+', ' ', 'g')), 500), '')
$$;

create or replace function munjiz_students.fmt_date(ts timestamptz) returns text language sql stable as $$
  select to_char(ts at time zone 'Africa/Cairo', 'DD/MM/YYYY')
$$;
create or replace function munjiz_students.fmt_dt(ts timestamptz) returns text language sql stable as $$
  select to_char(ts at time zone 'Africa/Cairo', 'DD/MM/YYYY HH24:MI')
$$;

create or replace function munjiz_students.check_pin(p text) returns text language plpgsql immutable as $$
declare s text;
begin
  s := munjiz_students.digits(btrim(coalesce(p, '')));
  if s !~ '^[0-9]{4,8}$' then raise exception 'الرمز السري من 4 إلى 8 أرقام' using errcode = 'P0001'; end if;
  return s;
end $$;

create or replace function munjiz_students.limit_hit(k text, max_n int, mins int) returns void language plpgsql as $$
begin
  delete from munjiz_students.attempts where at < now() - interval '1 day';
  if (select count(*) from munjiz_students.attempts a where a.k = limit_hit.k and a.at > now() - make_interval(mins => mins)) >= max_n then
    raise exception 'محاولات كثيرة، حاول بعد % دقيقة', mins using errcode = 'P0001';
  end if;
end $$;

create or replace function munjiz_students.new_session(kind text, ref bigint, hours int) returns text language plpgsql as $$
declare tok text;
begin
  delete from munjiz_students.sessions where expires_at < now();
  tok := encode(extensions.gen_random_bytes(24), 'hex');
  insert into munjiz_students.sessions values (encode(extensions.digest(tok, 'sha256'), 'hex'), kind, ref, now() + make_interval(hours => hours));
  return tok;
end $$;

create or replace function munjiz_students.session_ref(tok text, k text) returns bigint language plpgsql as $$
declare r bigint;
begin
  select s.ref into r from munjiz_students.sessions s
   where s.token_hash = encode(extensions.digest(coalesce(tok, ''), 'sha256'), 'hex') and s.kind = k and s.expires_at > now();
  if r is null then raise exception 'انتهت الجلسة، سجّل الدخول من جديد' using errcode = '28000'; end if;
  return r;
end $$;

create or replace function munjiz_students.student_json(s munjiz_students.students) returns jsonb language sql stable as $$
  select jsonb_build_object('id', s.id, 'code', s.code, 'full_name', s.full_name, 'phone', munjiz_students.fmt_phone(s.phone),
    'email', s.email, 'group_num', s.group_num, 'notes', s.notes, 'source', s.source,
    'created', munjiz_students.fmt_dt(s.created_at), 'created_date', munjiz_students.fmt_date(s.created_at),
    'updated', munjiz_students.fmt_dt(s.updated_at))
$$;

create or replace function munjiz_students.check_group(g int, exclude_id bigint) returns void language plpgsql as $$
declare cap int; n int;
begin
  if g is null then raise exception 'اختر رقم المجموعة' using errcode = 'P0001'; end if;
  select coalesce(gr.capacity, st.default_capacity) into cap from munjiz_students.groups gr, munjiz_students.settings st where gr.num = g;
  if not found then raise exception 'المجموعة غير موجودة' using errcode = 'P0001'; end if;
  if cap is not null then
    select count(*) into n from munjiz_students.students where group_num = g and id is distinct from exclude_id;
    if n >= cap then raise exception 'المجموعة % مكتملة، اختر مجموعة أخرى', g using errcode = 'P0001'; end if;
  end if;
end $$;

create or replace function munjiz_students.groups_json(with_names boolean) returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'num', g.num, 'title', g.title, 'capacity', coalesce(g.capacity, st.default_capacity),
    'own_capacity', g.capacity,
    'count', (select count(*) from munjiz_students.students s where s.group_num = g.num),
    'members', case when with_names then (select coalesce(jsonb_agg(s.full_name order by s.full_name), '[]'::jsonb) from munjiz_students.students s where s.group_num = g.num) end
  ) order by g.num), '[]'::jsonb)
  from munjiz_students.groups g, munjiz_students.settings st
$$;

-- ===== الواجهة العامة =====
create or replace function public.mjs_public() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('cohort', st.cohort, 'registration_open', st.registration_open, 'editing_open', st.editing_open,
    'show_roster', st.show_roster, 'total', (select count(*) from munjiz_students.students),
    'groups', munjiz_students.groups_json(st.show_roster))
  from munjiz_students.settings st
$$;

create or replace function public.mjs_register(p_name text, p_phone text, p_email text, p_group int, p_notes text, p_pin text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare st munjiz_students.settings; s munjiz_students.students; n text; ph text; em text; pin text;
begin
  select * into st from munjiz_students.settings;
  if not st.registration_open then raise exception 'التسجيل مغلق حالياً، تواصل مع إدارة الدفعة' using errcode = 'P0001'; end if;
  perform munjiz_students.limit_hit('reg', 60, 10);
  n := munjiz_students.norm_name(p_name);
  ph := munjiz_students.norm_phone(p_phone);
  em := munjiz_students.norm_email(p_email);
  if em is null then raise exception 'اكتب البريد الإلكتروني' using errcode = 'P0001'; end if;
  pin := munjiz_students.check_pin(p_pin);
  if exists (select 1 from munjiz_students.students where phone = ph) then
    raise exception 'هذا الرقم مسجل من قبل، استخدم «تعديل بياناتي»' using errcode = 'P0001'; end if;
  if exists (select 1 from munjiz_students.students where email = em) then
    raise exception 'هذا البريد مسجل من قبل، استخدم «تعديل بياناتي»' using errcode = 'P0001'; end if;
  perform pg_advisory_xact_lock(4207, coalesce(p_group, 0));
  perform munjiz_students.check_group(p_group, null);
  insert into munjiz_students.attempts (k) values ('reg');
  insert into munjiz_students.students (code, full_name, phone, email, group_num, notes, pin_hash, source)
  values ('MNS26-' || lpad(nextval('munjiz_students.code_seq')::text, 3, '0'), n, ph, em, p_group,
          munjiz_students.clean_notes(p_notes), extensions.crypt(pin, extensions.gen_salt('bf', 8)), 'student')
  returning * into s;
  insert into munjiz_students.audit (actor, action, detail) values ('طالب', 'تسجيل جديد', jsonb_build_object('code', s.code, 'name', s.full_name, 'group', s.group_num));
  return jsonb_build_object('token', munjiz_students.new_session('student', s.id, 12), 'student', munjiz_students.student_json(s));
end $$;

create or replace function public.mjs_student_login(p_phone text, p_pin text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s munjiz_students.students; ph text; v_k text;
begin
  ph := munjiz_students.norm_phone(p_phone);
  v_k := 'stu:' || ph;
  perform munjiz_students.limit_hit(v_k, 6, 15);
  select * into s from munjiz_students.students where phone = ph;
  if s.id is null or s.pin_hash <> extensions.crypt(munjiz_students.digits(btrim(coalesce(p_pin, ''))), s.pin_hash) then
    insert into munjiz_students.attempts (k) values (v_k);
    return jsonb_build_object('error', 'رقم الهاتف أو الرمز السري غير صحيح');
  end if;
  delete from munjiz_students.attempts where attempts.k = v_k;
  return jsonb_build_object('token', munjiz_students.new_session('student', s.id, 12), 'student', munjiz_students.student_json(s));
end $$;

create or replace function public.mjs_student_me(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s munjiz_students.students;
begin
  select * into s from munjiz_students.students where id = munjiz_students.session_ref(p_token, 'student');
  if s.id is null then raise exception 'لم يعد هذا التسجيل موجوداً' using errcode = '28000'; end if;
  return munjiz_students.student_json(s);
end $$;

create or replace function public.mjs_student_update(p_token text, p_name text, p_phone text, p_email text, p_group int, p_notes text, p_new_pin text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare sid bigint; s munjiz_students.students; ph text; em text;
begin
  sid := munjiz_students.session_ref(p_token, 'student');
  if not (select editing_open from munjiz_students.settings) then raise exception 'التعديل مغلق حالياً، تواصل مع إدارة الدفعة' using errcode = 'P0001'; end if;
  select * into s from munjiz_students.students where id = sid;
  ph := munjiz_students.norm_phone(p_phone);
  em := munjiz_students.norm_email(p_email);
  if em is null then raise exception 'اكتب البريد الإلكتروني' using errcode = 'P0001'; end if;
  if exists (select 1 from munjiz_students.students where phone = ph and id <> sid) then raise exception 'رقم الهاتف مستخدم لطالب آخر' using errcode = 'P0001'; end if;
  if exists (select 1 from munjiz_students.students where email = em and id <> sid) then raise exception 'البريد مستخدم لطالب آخر' using errcode = 'P0001'; end if;
  if p_group is distinct from s.group_num then
    perform pg_advisory_xact_lock(4207, coalesce(p_group, 0));
    perform munjiz_students.check_group(p_group, sid);
  end if;
  update munjiz_students.students set full_name = munjiz_students.norm_name(p_name), phone = ph, email = em, group_num = p_group,
    notes = munjiz_students.clean_notes(p_notes), updated_at = now(),
    pin_hash = case when coalesce(btrim(p_new_pin), '') = '' then pin_hash else extensions.crypt(munjiz_students.check_pin(p_new_pin), extensions.gen_salt('bf', 8)) end
  where id = sid returning * into s;
  insert into munjiz_students.audit (actor, action, detail) values ('طالب', 'تعديل بيانات', jsonb_build_object('code', s.code, 'name', s.full_name, 'group', s.group_num));
  return munjiz_students.student_json(s);
end $$;

create or replace function public.mjs_logout(p_token text) returns void
language sql security definer set search_path = '' as $$
  delete from munjiz_students.sessions where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
$$;

-- ===== الإدارة =====
create or replace function public.mjs_admin_login(p_user text, p_pass text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a munjiz_students.admins; v_k text;
begin
  v_k := 'adm:' || lower(btrim(coalesce(p_user, '')));
  perform munjiz_students.limit_hit(v_k, 6, 15);
  select * into a from munjiz_students.admins where username = lower(btrim(coalesce(p_user, '')));
  if a.id is null or a.pass_hash <> extensions.crypt(coalesce(p_pass, ''), a.pass_hash) then
    insert into munjiz_students.attempts (k) values (v_k);
    return jsonb_build_object('error', 'اسم المستخدم أو كلمة المرور غير صحيحة');
  end if;
  delete from munjiz_students.attempts where attempts.k = v_k;
  insert into munjiz_students.audit (actor, action) values (a.username, 'دخول الإدارة');
  return jsonb_build_object('token', munjiz_students.new_session('admin', a.id, 12), 'user', a.username);
end $$;

create or replace function public.mjs_admin(p_token text, p_action text, p_data jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare aid bigint; who text; s munjiz_students.students; d jsonb := coalesce(p_data, '{}'::jsonb);
  sid bigint; ph text; em text; pin text; n int; g jsonb; st munjiz_students.settings;
begin
  aid := munjiz_students.session_ref(p_token, 'admin');
  select username into who from munjiz_students.admins where id = aid;

  if p_action = 'dashboard' then
    select * into st from munjiz_students.settings;
    return jsonb_build_object(
      'user', who,
      'settings', jsonb_build_object('cohort', st.cohort, 'registration_open', st.registration_open, 'editing_open', st.editing_open,
         'show_roster', st.show_roster, 'default_capacity', st.default_capacity, 'export_token', st.export_token, 'sheet_url', st.sheet_url),
      'groups', munjiz_students.groups_json(false),
      'students', (select coalesce(jsonb_agg(munjiz_students.student_json(x) order by x.id), '[]'::jsonb) from munjiz_students.students x),
      'audit', (select coalesce(jsonb_agg(jsonb_build_object('at', munjiz_students.fmt_dt(a.at), 'actor', a.actor, 'action', a.action, 'detail', a.detail) order by a.id desc), '[]'::jsonb)
                from (select * from munjiz_students.audit order by id desc limit 60) a));

  elsif p_action = 'save_student' then
    sid := nullif(d->>'id', '')::bigint;
    ph := munjiz_students.norm_phone(d->>'phone');
    em := munjiz_students.norm_email(d->>'email');
    if exists (select 1 from munjiz_students.students where phone = ph and id is distinct from sid) then raise exception 'رقم الهاتف مسجل لطالب آخر' using errcode = 'P0001'; end if;
    if em is not null and exists (select 1 from munjiz_students.students where email = em and id is distinct from sid) then raise exception 'البريد مسجل لطالب آخر' using errcode = 'P0001'; end if;
    if coalesce((d->>'force')::boolean, false) is false then
      if sid is null or (select group_num from munjiz_students.students where id = sid) is distinct from (d->>'group_num')::int then
        perform munjiz_students.check_group((d->>'group_num')::int, sid);
      end if;
    elsif (d->>'group_num') is null then raise exception 'اختر رقم المجموعة' using errcode = 'P0001';
    end if;
    pin := nullif(btrim(coalesce(d->>'pin', '')), '');
    if sid is null then
      pin := case when pin is null then lpad((floor(random() * 1000000))::int::text, 6, '0') else munjiz_students.check_pin(pin) end;
      insert into munjiz_students.students (code, full_name, phone, email, group_num, notes, pin_hash, source)
      values ('MNS26-' || lpad(nextval('munjiz_students.code_seq')::text, 3, '0'), munjiz_students.norm_name(d->>'full_name'), ph, em,
              (d->>'group_num')::int, munjiz_students.clean_notes(d->>'notes'), extensions.crypt(pin, extensions.gen_salt('bf', 8)), 'admin')
      returning * into s;
      insert into munjiz_students.audit (actor, action, detail) values (who, 'إضافة طالب', jsonb_build_object('code', s.code, 'name', s.full_name, 'group', s.group_num));
      return jsonb_build_object('student', munjiz_students.student_json(s), 'pin', pin);
    else
      update munjiz_students.students set full_name = munjiz_students.norm_name(d->>'full_name'), phone = ph, email = em,
        group_num = (d->>'group_num')::int, notes = munjiz_students.clean_notes(d->>'notes'), updated_at = now(),
        pin_hash = case when pin is null then pin_hash else extensions.crypt(munjiz_students.check_pin(pin), extensions.gen_salt('bf', 8)) end
      where id = sid returning * into s;
      if s.id is null then raise exception 'الطالب غير موجود' using errcode = 'P0001'; end if;
      insert into munjiz_students.audit (actor, action, detail) values (who, 'تعديل طالب', jsonb_build_object('code', s.code, 'name', s.full_name, 'group', s.group_num));
      return jsonb_build_object('student', munjiz_students.student_json(s), 'pin', pin);
    end if;

  elsif p_action = 'delete_student' then
    delete from munjiz_students.students where id = (d->>'id')::bigint returning * into s;
    if s.id is null then raise exception 'الطالب غير موجود' using errcode = 'P0001'; end if;
    delete from munjiz_students.sessions where kind = 'student' and ref = s.id;
    insert into munjiz_students.audit (actor, action, detail) values (who, 'حذف طالب', jsonb_build_object('code', s.code, 'name', s.full_name));
    return jsonb_build_object('ok', true);

  elsif p_action = 'reset_pin' then
    pin := lpad((floor(random() * 1000000))::int::text, 6, '0');
    update munjiz_students.students set pin_hash = extensions.crypt(pin, extensions.gen_salt('bf', 8)), updated_at = now() where id = (d->>'id')::bigint returning * into s;
    if s.id is null then raise exception 'الطالب غير موجود' using errcode = 'P0001'; end if;
    insert into munjiz_students.audit (actor, action, detail) values (who, 'إعادة تعيين الرمز السري', jsonb_build_object('code', s.code, 'name', s.full_name));
    return jsonb_build_object('pin', pin, 'student', munjiz_students.student_json(s));

  elsif p_action = 'save_groups' then
    n := (d->>'count')::int;
    if n is null or n < 1 or n > 200 then raise exception 'عدد المجموعات من 1 إلى 200' using errcode = 'P0001'; end if;
    if exists (select 1 from munjiz_students.students where group_num > n) then
      raise exception 'توجد طلاب في مجموعات أعلى من %، انقلهم أولاً', n using errcode = 'P0001'; end if;
    delete from munjiz_students.groups where num > n;
    insert into munjiz_students.groups (num) select x from generate_series(1, n) x on conflict do nothing;
    for g in select * from jsonb_array_elements(coalesce(d->'groups', '[]'::jsonb)) loop
      update munjiz_students.groups set title = nullif(left(btrim(coalesce(g->>'title', '')), 60), ''),
        capacity = nullif(g->>'capacity', '')::int where num = (g->>'num')::int;
    end loop;
    update munjiz_students.settings set default_capacity = nullif(d->>'default_capacity', '')::int, updated_at = now();
    insert into munjiz_students.audit (actor, action, detail) values (who, 'تعديل المجموعات', jsonb_build_object('count', n));
    return munjiz_students.groups_json(false);

  elsif p_action = 'save_settings' then
    update munjiz_students.settings set
      cohort = coalesce(nullif(btrim(d->>'cohort'), ''), cohort),
      registration_open = coalesce((d->>'registration_open')::boolean, registration_open),
      editing_open = coalesce((d->>'editing_open')::boolean, editing_open),
      show_roster = coalesce((d->>'show_roster')::boolean, show_roster),
      sheet_url = coalesce(nullif(btrim(d->>'sheet_url'), ''), sheet_url),
      updated_at = now();
    insert into munjiz_students.audit (actor, action, detail) values (who, 'تعديل الإعدادات', d - 'sheet_url');
    return jsonb_build_object('ok', true);

  elsif p_action = 'rotate_export' then
    update munjiz_students.settings set export_token = encode(extensions.gen_random_bytes(18), 'hex');
    insert into munjiz_students.audit (actor, action) values (who, 'تجديد رابط المزامنة');
    return jsonb_build_object('export_token', (select export_token from munjiz_students.settings));

  elsif p_action = 'change_password' then
    if length(coalesce(d->>'new', '')) < 10 then raise exception 'كلمة المرور الجديدة 10 أحرف على الأقل' using errcode = 'P0001'; end if;
    if not exists (select 1 from munjiz_students.admins where id = aid and pass_hash = extensions.crypt(coalesce(d->>'old', ''), pass_hash)) then
      raise exception 'كلمة المرور الحالية غير صحيحة' using errcode = 'P0001'; end if;
    update munjiz_students.admins set pass_hash = extensions.crypt(d->>'new', extensions.gen_salt('bf', 10)) where id = aid;
    insert into munjiz_students.audit (actor, action) values (who, 'تغيير كلمة مرور الإدارة');
    return jsonb_build_object('ok', true);
  end if;
  raise exception 'إجراء غير معروف' using errcode = 'P0001';
end $$;

-- تصدير CSV لمزامنة Google Sheets (يُستدعى من دالة الحافة mjs-sheet)
create or replace function munjiz_students.csvq(t text) returns text language sql immutable as $$
  select '"' || replace(replace(coalesce(t, ''), '"', '""'), E'\n', ' ') || '"'
$$;

create or replace function public.mjs_export_csv(p_token text) returns text
language plpgsql security definer set search_path = '' as $$
declare out text;
begin
  if p_token is null or p_token <> (select export_token from munjiz_students.settings) then
    raise exception 'رابط غير صالح' using errcode = '28000'; end if;
  select 'الرقم,كود الطالب,الاسم الكامل,الهاتف,البريد الإلكتروني,رقم المجموعة,تاريخ التسجيل,ملاحظات,آخر تعديل' || E'\n' ||
    coalesce(string_agg(concat_ws(',', t.rn::text, munjiz_students.csvq(t.code), munjiz_students.csvq(t.full_name),
      munjiz_students.csvq(munjiz_students.fmt_phone(t.phone)), munjiz_students.csvq(t.email), coalesce(t.group_num::text, ''),
      munjiz_students.csvq(munjiz_students.fmt_date(t.created_at)), munjiz_students.csvq(t.notes),
      munjiz_students.csvq(munjiz_students.fmt_dt(t.updated_at))), E'\n' order by t.id), '')
  into out
  from (select x.*, row_number() over (order by x.id) as rn from munjiz_students.students x) t;
  return out;
end $$;

-- الصلاحيات: الدوال الداخلية مغلقة، والعامة متاحة للمفتاح العام فقط
revoke all on all functions in schema munjiz_students from public, anon, authenticated;
do $$ declare f text; begin
  for f in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'mjs\_%' loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
