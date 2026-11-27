-- =====================================================================
-- Reformacijska čitaonica — oznake (bookmarks) i nastavak čitanja
-- 27. 11. 2026.
--
-- KAKO POKRENUTI:
--   Supabase Dashboard → projekt → SQL Editor → New query →
--   zalijepi CIJELU ovu datoteku → Run.
--   Skripta se smije pokrenuti više puta (ništa se ne udvostručuje).
--
-- Dok se ovo ne pokrene, stranica i dalje radi: oznake i nastavak
-- čitanja spremaju se samo u pregledniku (localStorage).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. TABLICA bookmarks (oznake na odlomcima)
-- ---------------------------------------------------------------------
create table if not exists public.bookmarks (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  book_key text not null,
  book_title text not null default '',
  chapter_title text not null default '',
  url text not null,
  para_id text not null,
  label text not null default '',
  updated_at timestamptz not null default now()
);

create unique index if not exists bookmarks_user_spot
  on public.bookmarks (user_id, book_key, url, para_id);

create index if not exists bookmarks_user_updated
  on public.bookmarks (user_id, updated_at desc);

alter table public.bookmarks enable row level security;

drop policy if exists "bookmarks_select_own" on public.bookmarks;
create policy "bookmarks_select_own" on public.bookmarks
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "bookmarks_insert_own" on public.bookmarks;
create policy "bookmarks_insert_own" on public.bookmarks
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "bookmarks_update_own" on public.bookmarks;
create policy "bookmarks_update_own" on public.bookmarks
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "bookmarks_delete_own" on public.bookmarks;
create policy "bookmarks_delete_own" on public.bookmarks
  for delete to authenticated
  using (user_id = auth.uid());

revoke all on public.bookmarks from public, anon;
grant select, insert, update, delete on public.bookmarks to authenticated;


-- ---------------------------------------------------------------------
-- 2. TABLICA reading_progress (zadnje mjesto u svakoj knjizi)
-- ---------------------------------------------------------------------
create table if not exists public.reading_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  book_key text not null,
  book_title text not null default '',
  chapter_title text not null default '',
  url text not null,
  para_id text not null default '',
  label text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, book_key)
);

create index if not exists reading_progress_user_updated
  on public.reading_progress (user_id, updated_at desc);

alter table public.reading_progress enable row level security;

drop policy if exists "reading_progress_select_own" on public.reading_progress;
create policy "reading_progress_select_own" on public.reading_progress
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "reading_progress_insert_own" on public.reading_progress;
create policy "reading_progress_insert_own" on public.reading_progress
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "reading_progress_update_own" on public.reading_progress;
create policy "reading_progress_update_own" on public.reading_progress
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "reading_progress_delete_own" on public.reading_progress;
create policy "reading_progress_delete_own" on public.reading_progress
  for delete to authenticated
  using (user_id = auth.uid());

revoke all on public.reading_progress from public, anon;
grant select, insert, update, delete on public.reading_progress to authenticated;


-- ---------------------------------------------------------------------
-- 3. BRISANJE RAČUNA I NEAKTIVNIH RAČUNA
--    (dopuna postojećih funkcija: brišu i nove tablice)
-- ---------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Nisi prijavljen.' using errcode = '28000';
  end if;
  delete from public.highlights where user_id = uid;
  delete from public.bookmarks where user_id = uid;
  delete from public.reading_progress where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
revoke all on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;

create or replace function public.delete_inactive_accounts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from public.highlights h
   using auth.users u
   where h.user_id = u.id
     and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '1 year';
  delete from public.bookmarks b
   using auth.users u
   where b.user_id = u.id
     and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '1 year';
  delete from public.reading_progress p
   using auth.users u
   where p.user_id = u.id
     and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '1 year';
  delete from auth.users
   where coalesce(last_sign_in_at, created_at) < now() - interval '1 year';
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.delete_inactive_accounts() from public;
revoke all on function public.delete_inactive_accounts() from anon, authenticated;
