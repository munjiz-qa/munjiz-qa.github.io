-- بركات · قاعدة البيانات السحابية (Supabase)
-- كل الكتابة تمر عبر خادم بركات (دالة barakat-api) بمفتاح الخدمة، وتُطبَّق ذرّياً بدالة barakat_commit.
-- العميل المسجَّل يقرأ صفوفه وحده (RLS)، ولا يملك أي صلاحية كتابة مباشرة.

create table if not exists system_state(
  id int primary key default 1 check (id=1),
  version bigint not null default 0,
  seq bigint not null default 1000,
  funds jsonb not null default '{}',
  settings jsonb not null default '{}',
  last_backup timestamptz,
  seeded boolean not null default false,
  updated_at timestamptz not null default now());
insert into system_state(id) values(1) on conflict do nothing;

create table if not exists profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  acct text unique not null, name text not null, email text unique not null, phone text, nid text,
  role text not null default 'customer' check (role in ('customer','admin')),
  status text not null default 'pending' check (status in ('active','pending','frozen')),
  created_at timestamptz not null default now(), data jsonb not null default '{}');

create table if not exists accounts(
  id text primary key, user_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('current','invest')), balance numeric(16,2) not null default 0,
  data jsonb not null default '{}', unique(user_id,kind));

create table if not exists transactions(
  id text primary key, user_id uuid not null references profiles(id) on delete cascade,
  account text not null, amount numeric(16,2) not null, type text not null, note text,
  at timestamptz not null default now(), balance_after numeric(16,2), data jsonb not null default '{}');
create index if not exists transactions_user_at on transactions(user_id,at);

create table if not exists finance_requests(
  id text primary key, user_id uuid not null references profiles(id) on delete cascade,
  product text not null, status text not null, amount numeric(16,2) not null, term int,
  created_at timestamptz not null default now(), data jsonb not null default '{}');

create table if not exists cash_requests(
  id text primary key, user_id uuid not null references profiles(id) on delete cascade,
  kind text not null, amount numeric(16,2) not null, method text, ref text, status text not null,
  at timestamptz not null default now(), data jsonb not null default '{}');

create table if not exists profit_distributions(
  id text primary key, at timestamptz not null default now(), period text, gross numeric(16,2),
  mudarib_share numeric(16,2), net numeric(16,2), pool numeric(16,2), approved_by text, data jsonb not null default '{}');

create table if not exists takaful_policies(
  id text primary key, user_id uuid not null references profiles(id) on delete cascade,
  plan text not null, status text not null, start_at timestamptz, paid_through timestamptz, data jsonb not null default '{}');

create table if not exists takaful_claims(
  id text primary key, user_id uuid not null references profiles(id) on delete cascade,
  policy_id text, amount numeric(16,2) not null, status text not null,
  at timestamptz not null default now(), data jsonb not null default '{}');

create table if not exists messages(
  id text primary key, user_id uuid references profiles(id) on delete set null,
  name text, email text, phone text, subject text, body text, status text not null,
  at timestamptz not null default now(), data jsonb not null default '{}');

create table if not exists fund_disbursements(
  id text primary key, at timestamptz not null default now(), fund text, recipient text, note text,
  amount numeric(16,2), data jsonb not null default '{}');

create table if not exists notifications(
  id text primary key, user_id uuid not null references profiles(id) on delete cascade,
  text text not null, link text, at timestamptz not null default now(), seen boolean not null default false,
  data jsonb not null default '{}');
create index if not exists notifications_user on notifications(user_id);

create table if not exists audit_log(
  id text primary key, at timestamptz not null default now(), what text not null, who text,
  data jsonb not null default '{}');
create index if not exists audit_log_at on audit_log(at desc);

-- كشف الحساب: عرض مرتب لحركات كل حساب
create or replace view statements with (security_invoker=on) as
  select t.user_id, p.acct, p.name, t.account, t.at, t.note, t.type, t.amount, t.balance_after
  from transactions t join profiles p on p.id=t.user_id;

-- الأمان: RLS على كل الجداول، والقراءة الذاتية فقط للعميل المسجَّل
do $$ declare t text; begin
  foreach t in array array['system_state','profiles','accounts','transactions','finance_requests','cash_requests','profit_distributions','takaful_policies','takaful_claims','messages','fund_disbursements','notifications','audit_log'] loop
    execute format('alter table %I enable row level security',t);
    execute format('revoke all on %I from anon, authenticated',t);
  end loop;
end $$;
grant select on profiles, accounts, transactions, finance_requests, cash_requests, takaful_policies, takaful_claims, notifications to authenticated;
grant select on statements to authenticated;
drop policy if exists own_profile on profiles;            create policy own_profile on profiles for select to authenticated using (id=(select auth.uid()));
drop policy if exists own_accounts on accounts;           create policy own_accounts on accounts for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists own_tx on transactions;             create policy own_tx on transactions for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists own_fin on finance_requests;        create policy own_fin on finance_requests for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists own_cash on cash_requests;          create policy own_cash on cash_requests for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists own_pol on takaful_policies;        create policy own_pol on takaful_policies for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists own_claims on takaful_claims;       create policy own_claims on takaful_claims for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists own_notes on notifications;         create policy own_notes on notifications for select to authenticated using (user_id=(select auth.uid()));

-- تطبيق التغييرات ذرّياً مع فحص الإصدار (يمنع تعارض عمليتين متزامنتين)
create or replace function barakat_commit(p_version bigint, p jsonb) returns bigint
language plpgsql security definer set search_path=public as $$
declare v bigint; t text; ids text[]; sets text;
  ord text[]:=array['profiles','accounts','transactions','finance_requests','cash_requests','profit_distributions','takaful_policies','takaful_claims','messages','fund_disbursements','notifications','audit_log'];
begin
  select version into v from system_state where id=1 for update;
  if v is distinct from p_version then raise exception 'barakat_conflict' using errcode='40001'; end if;
  -- الحذف أولاً بترتيب عكسي
  for i in reverse array_length(ord,1)..1 loop t:=ord[i];
    if p->'del' ? t then
      select array_agg(x) into ids from jsonb_array_elements_text(p->'del'->t) x;
      if ids is not null then execute format('delete from %I where id::text = any($1)',t) using ids; end if;
    end if;
  end loop;
  foreach t in array ord loop
    if p->'up' ? t and jsonb_array_length(p->'up'->t)>0 then
      select string_agg(format('%I=excluded.%I',column_name,column_name),',') into sets
        from information_schema.columns where table_schema='public' and table_name=t and column_name<>'id';
      execute format('insert into %I select * from jsonb_populate_recordset(null::%I,$1) on conflict (id) do update set %s',t,t,sets) using p->'up'->t;
    end if;
  end loop;
  update system_state set version=v+1,
    seq=coalesce((p->'state'->>'seq')::bigint,seq),
    funds=coalesce(p->'state'->'funds',funds),
    settings=coalesce(p->'state'->'settings',settings),
    last_backup=case when p->'state' ? 'lastBackup' then (p->'state'->>'lastBackup')::timestamptz else last_backup end,
    seeded=coalesce((p->'state'->>'seeded')::boolean,seeded),
    updated_at=now() where id=1;
  return v+1;
end $$;
revoke all on function barakat_commit(bigint,jsonb) from public, anon, authenticated;
grant execute on function barakat_commit(bigint,jsonb) to service_role;
