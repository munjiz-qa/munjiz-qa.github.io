-- قاعدة بيانات محتوى غرسة على Supabase. شغّل هذا الملف مرة واحدة في SQL Editor،
-- ثم أنشئ مستخدم المدير من Authentication وأضف بريده إلى gharsa_admins.
create table if not exists public.gharsa_content (id text primary key, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists public.gharsa_admins (email text primary key);
alter table public.gharsa_content enable row level security;
alter table public.gharsa_admins enable row level security;
create or replace function public.gharsa_is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.gharsa_admins a where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email','')));
$$;
grant execute on function public.gharsa_is_admin() to anon, authenticated;
drop policy if exists gharsa_content_read on public.gharsa_content;
create policy gharsa_content_read on public.gharsa_content for select using (true);
drop policy if exists gharsa_content_write on public.gharsa_content;
create policy gharsa_content_write on public.gharsa_content for all to authenticated using (public.gharsa_is_admin()) with check (public.gharsa_is_admin());
