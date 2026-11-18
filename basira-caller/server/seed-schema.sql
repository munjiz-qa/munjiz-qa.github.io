-- بصيرة كولر: إضافات قاعدة البيانات لدليل المصادر النظامية ومشاركة جهات الاتصال الاختيارية.
-- يُطبَّق بعد schema.sql، وقبل seed-data.sql. آمن لإعادة التشغيل.

-- ======================== مصدر كل رقم والبلاغات الرسمية ========================
alter table public.bc_numbers add column if not exists source_name text;
alter table public.bc_numbers add column if not exists source_url text;
alter table public.bc_numbers add column if not exists official_reports integer not null default 0;
alter table public.bc_numbers add column if not exists official_subject text;
alter table public.bc_numbers add column if not exists official_last date;

-- ======================== مشاركة جهات الاتصال الاختيارية ========================
alter table public.bc_names add column if not exists origin text not null default 'manual';
do $$ begin
  alter table public.bc_names add constraint bc_names_origin_chk check (origin in ('manual','contacts'));
exception when duplicate_object then null; end $$;
alter table public.bc_users add column if not exists contacts_consent_at timestamptz;

-- الأرقام القطرية القصيرة (7 خانات مثل 234 4444) تُعامل كأرقام قطرية أيضاً
create or replace function public.bc_norm(p text) returns text
language plpgsql immutable set search_path = public as $$
declare d text;
begin
  if p is null then return null; end if;
  d := regexp_replace(translate(p, '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'), '[^0-9+]', '', 'g');
  if d like '00%' then d := '+' || substr(d, 3); end if;
  if d like '+%' then d := '+' || replace(substr(d, 2), '+', '');
  else
    d := regexp_replace(replace(d, '+', ''), '^0+', '');
    if char_length(d) between 7 and 9 then d := '+974' || d;   -- رقم قطري محلي
    elsif d like '974%' and char_length(d) between 10 and 12 then d := '+' || d;
    else d := '+' || d; end if;
  end if;
  if d !~ '^\+[1-9][0-9]{6,14}$' then return null; end if;
  return d;
end $$;

-- الاسم المعروض: الأسماء اليدوية تُحتسب دائماً، وأسماء جهات الاتصال لا تُحتسب إلا إذا اتفق عليها مستخدمان مستقلان على الأقل
create or replace function public.bc_public_names(p_e164 text)
returns table(name text, votes bigint, last_at timestamptz)
language sql stable security definer set search_path = public as $$
  select name, count(*) votes, max(created_at) last_at from bc_names
  where e164 = p_e164 and status = 'approved'
  group by name
  having count(*) filter (where origin = 'manual') > 0 or count(distinct user_id) filter (where origin = 'contacts') >= 2
$$;

create or replace function public.bc_touch(p_e164 text) returns void
language plpgsql security definer set search_path = public as $$
declare top_name text; spam int; total int;
begin
  select name into top_name from bc_public_names(p_e164) order by votes desc, last_at desc limit 1;
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

-- مؤشر الإزعاج: بلاغات المجتمع والتقييمات، مع حد أدنى للأرقام التي تكررت شكواها في بلاغات رسمية
create or replace function public.bc_score(p_e164 text) returns int
language sql stable security definer set search_path = public as $$
  select greatest(0, least(100,
      coalesce((select sum(case when status = 'confirmed' then 30 else 18 end) from bc_reports where e164 = p_e164 and status <> 'dismissed' and kind <> 'other'), 0)
    + coalesce((select sum(case when value = -1 then 12 else -15 end) from bc_ratings where e164 = p_e164), 0)
    + coalesce((select case when verified or official_reports < 5 then 0 else least(90, 25 + official_reports * 7) end from bc_numbers where e164 = p_e164), 0)
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
    'alt_names', coalesce((select jsonb_agg(name) from (select name from bc_public_names(n.e164) order by votes desc limit 4) x), '[]'::jsonb),
    'source', case when n.source_name is null then null else jsonb_build_object('name', n.source_name, 'url', n.source_url) end,
    'official_reports', n.official_reports, 'official_subject', n.official_subject, 'official_last', n.official_last
  ) from bc_numbers n where n.e164 = p_e164 and not n.hidden
$$;

-- يشارك المستخدم جهات اتصال اختارها بنفسه بعد موافقة صريحة. p_items: [{"phone":"...","name":"..."}] بحد أقصى 500
create or replace function public.bc_share_contacts(p_token text, p_items jsonb, p_consent boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u bc_users; it jsonb; e text; nm text; added int := 0; skipped int := 0;
begin
  u := bc_require(p_token);
  if p_consent is not true then raise exception 'CONSENT_REQUIRED' using errcode = 'P0001'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 500 then raise exception 'TOO_MANY' using errcode = 'P0001'; end if;
  update bc_users set contacts_consent_at = coalesce(contacts_consent_at, now()) where id = u.id;
  for it in select * from jsonb_array_elements(p_items) loop
    e := bc_norm(it->>'phone');
    nm := regexp_replace(trim(coalesce(it->>'name', '')), '\s+', ' ', 'g');
    if e is null or char_length(nm) < 2 or char_length(nm) > 60 or e = u.phone
       or exists (select 1 from bc_numbers where e164 = e and (hidden or verified)) then skipped := skipped + 1; continue; end if;
    perform bc_ensure(e);
    insert into bc_names(e164, name, user_id, origin) values (e, nm, u.id, 'contacts') on conflict (e164, user_id) do nothing;
    if found then added := added + 1; perform bc_touch(e); else skipped := skipped + 1; end if;
  end loop;
  insert into bc_audit(actor, action, target) values (u.id, 'مشاركة جهات اتصال', added::text);
  return jsonb_build_object('added', added, 'skipped', skipped, 'total', (select count(*) from bc_names where user_id = u.id and origin = 'contacts'));
end $$;

-- سحب الموافقة: يحذف كل ما شاركه المستخدم من جهات اتصاله ويعيد احتساب الأسماء
create or replace function public.bc_withdraw_contacts(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u bc_users; n int; e text;
begin
  u := bc_require(p_token);
  create temp table if not exists _bc_wd(e164 text) on commit drop;
  with d as (delete from bc_names where user_id = u.id and origin = 'contacts' returning e164) insert into _bc_wd select e164 from d;
  get diagnostics n = row_count;
  for e in select distinct e164 from _bc_wd loop
    update bc_numbers set display_name = null where e164 = e and not verified;
    perform bc_touch(e);
  end loop;
  update bc_users set contacts_consent_at = null where id = u.id;
  insert into bc_audit(actor, action, target) values (u.id, 'سحب موافقة جهات الاتصال', n::text);
  return jsonb_build_object('removed', n);
end $$;

create or replace function public.bc_contacts_status(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare u bc_users;
begin
  u := bc_require(p_token);
  return jsonb_build_object('consent_at', u.contacts_consent_at, 'shared', (select count(*) from bc_names where user_id = u.id and origin = 'contacts'));
end $$;

-- الصلاحيات: كل دالة جديدة تحتاج منحاً صريحاً
revoke execute on function public.bc_public_names(text) from public, anon, authenticated;
grant execute on function public.bc_share_contacts(text,jsonb,boolean), public.bc_withdraw_contacts(text), public.bc_contacts_status(text) to anon, authenticated;
