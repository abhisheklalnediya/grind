-- GRIND M1 foundation. First migration in GRIND's standalone stream.
begin;

create schema grind;
create schema grind_private;
revoke all on schema grind from public, anon, authenticated;
revoke all on schema grind_private from public, anon, authenticated;
grant usage on schema grind to authenticated;
alter default privileges in schema grind revoke execute on functions from public;
alter default privileges in schema grind_private revoke all on tables from public, anon, authenticated;
alter default privileges in schema grind_private revoke execute on functions from public, anon, authenticated;

create table grind.app_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  setup_completed_at timestamptz
);
create table grind.user_settings (
  user_id uuid primary key references grind.app_accounts(user_id) on delete cascade,
  preferred_unit text not null default 'kg' check (preferred_unit in ('kg', 'lb')),
  default_rest_seconds integer not null default 120 check (default_rest_seconds between 15 and 3600),
  updated_at timestamptz not null default now()
);
create table grind.exercises (
  id uuid primary key default gen_random_uuid(),
  origin text not null check (origin in ('grind', 'custom', 'provider')),
  owner_id uuid references grind.app_accounts(user_id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  primary_muscle text not null check (char_length(btrim(primary_muscle)) between 1 and 40),
  equipment text not null check (char_length(btrim(equipment)) between 1 and 40),
  category text not null check (char_length(btrim(category)) between 1 and 40),
  load_convention text not null check (char_length(btrim(load_convention)) between 1 and 80),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  check ((origin = 'custom') = (owner_id is not null))
);
create index grind_exercises_owner_idx on grind.exercises(owner_id);
create index grind_exercises_name_idx on grind.exercises(lower(name), id);

alter table grind.app_accounts enable row level security;
alter table grind.user_settings enable row level security;
alter table grind.exercises enable row level security;
revoke all on all tables in schema grind from public, anon, authenticated;
grant select on grind.app_accounts, grind.user_settings, grind.exercises to authenticated;
create policy grind_accounts_read on grind.app_accounts for select to authenticated
  using (user_id = (select auth.uid()));
create policy grind_settings_read on grind.user_settings for select to authenticated
  using (user_id = (select auth.uid()) and exists (
    select 1 from grind.app_accounts a where a.user_id = (select auth.uid())
  ));
create policy grind_exercises_read on grind.exercises for select to authenticated
  using (exists (select 1 from grind.app_accounts a where a.user_id = (select auth.uid()))
    and (owner_id is null or owner_id = (select auth.uid())));

create function grind.join_grind() returns grind.app_accounts
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  account grind.app_accounts;
begin
  if caller is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  insert into grind.app_accounts(user_id) values(caller) on conflict(user_id) do nothing;
  insert into grind.user_settings(user_id) values(caller) on conflict(user_id) do nothing;
  select * into strict account from grind.app_accounts where user_id = caller;
  return account;
end;
$$;

create function grind.complete_grind_setup(p_preferred_unit text, p_default_rest_seconds integer)
returns grind.user_settings language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  saved grind.user_settings;
begin
  if caller is null or not exists(select 1 from grind.app_accounts where user_id = caller) then
    raise exception 'Grind membership required' using errcode = '42501';
  end if;
  if p_preferred_unit is null or p_preferred_unit not in ('kg', 'lb') or
     p_default_rest_seconds is null or p_default_rest_seconds not between 15 and 3600 then
    raise exception 'Invalid Grind settings' using errcode = '23514';
  end if;
  update grind.user_settings set preferred_unit = p_preferred_unit,
    default_rest_seconds = p_default_rest_seconds, updated_at = now()
    where user_id = caller returning * into strict saved;
  update grind.app_accounts set setup_completed_at = coalesce(setup_completed_at, now()) where user_id = caller;
  return saved;
end;
$$;

create function grind.save_grind_settings(p_preferred_unit text, p_default_rest_seconds integer)
returns grind.user_settings language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists(select 1 from grind.app_accounts
    where user_id = auth.uid() and setup_completed_at is not null) then
    raise exception 'Grind setup required' using errcode = '42501';
  end if;
  return grind.complete_grind_setup(p_preferred_unit, p_default_rest_seconds);
end;
$$;
revoke all on function grind.join_grind() from public, anon, authenticated;
revoke all on function grind.complete_grind_setup(text, integer) from public, anon, authenticated;
revoke all on function grind.save_grind_settings(text, integer) from public, anon, authenticated;
grant execute on function grind.join_grind(), grind.complete_grind_setup(text, integer),
  grind.save_grind_settings(text, integer) to authenticated;

-- Independently authored minimal catalog: no copied provider descriptions or media.
insert into grind.exercises(id, origin, name, primary_muscle, equipment, category, load_convention) values
 ('10000000-0000-4000-8000-000000000001','grind','Barbell bench press','Chest','Barbell','Strength','Total barbell weight'),
 ('10000000-0000-4000-8000-000000000002','grind','Barbell row','Back','Barbell','Strength','Total barbell weight'),
 ('10000000-0000-4000-8000-000000000003','grind','Barbell squat','Legs','Barbell','Strength','Total barbell weight'),
 ('10000000-0000-4000-8000-000000000004','grind','Cable lateral raise','Shoulders','Cable','Strength','Stack display weight'),
 ('10000000-0000-4000-8000-000000000005','grind','Hammer curl','Arms','Dumbbell','Strength','Weight per dumbbell'),
 ('10000000-0000-4000-8000-000000000006','grind','Incline dumbbell press','Chest','Dumbbell','Strength','Weight per dumbbell'),
 ('10000000-0000-4000-8000-000000000007','grind','Pull-up','Back','Bodyweight','Strength','Bodyweight / reps only');

commit;
