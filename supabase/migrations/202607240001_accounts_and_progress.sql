create extension if not exists citext with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email extensions.citext not null,
  username extensions.citext not null unique,
  created_at timestamptz not null default now(),
  constraint profiles_username_format
    check (username::text ~ '^[a-z0-9._-]{3,24}$')
);

create table if not exists public.learning_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  progress jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.learning_progress enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "progress_select_own"
  on public.learning_progress
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "progress_insert_own"
  on public.learning_progress
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "progress_update_own"
  on public.learning_progress
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.handle_new_up_training_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, username)
  values (
    new.id,
    lower(new.email),
    lower(new.raw_user_meta_data ->> 'username')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_up_training on auth.users;

create trigger on_auth_user_created_up_training
  after insert on auth.users
  for each row execute procedure public.handle_new_up_training_user();
