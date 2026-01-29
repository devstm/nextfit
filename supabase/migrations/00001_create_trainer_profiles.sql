-- Enable PostGIS for geospatial queries (15km radius search)
create extension if not exists postgis with schema extensions;

-- Trainer profiles table
create table public.trainer_profiles (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references auth.users(id) on delete cascade,

  -- Personal info
  display_name      text not null,
  bio               text,
  avatar_url        text,
  phone             text,

  -- Professional info
  specializations   text[] not null default '{}',
  certifications    jsonb not null default '[]',
  experience_years  integer not null default 0 check (experience_years >= 0),

  -- Location (geography for accurate meter-based distance queries)
  location          extensions.geography(Point, 4326),
  city              text,
  country           text,

  -- Pricing
  hourly_rate       numeric(10,2) check (hourly_rate >= 0),
  currency          text not null default 'USD' check (char_length(currency) = 3),

  -- Status
  is_available      boolean not null default true,
  is_verified       boolean not null default false,

  -- Timestamps
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Indexes
create index idx_trainer_profiles_user_id on public.trainer_profiles(user_id);
create index idx_trainer_profiles_location on public.trainer_profiles using gist(location);
create index idx_trainer_profiles_specializations on public.trainer_profiles using gin(specializations);
create index idx_trainer_profiles_available on public.trainer_profiles(is_available) where is_available = true;

-- Auto-update updated_at on row modification
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on public.trainer_profiles
  for each row
  execute function public.handle_updated_at();

-- Row Level Security
alter table public.trainer_profiles enable row level security;

-- Any authenticated user can view trainer profiles (for search/discovery)
create policy "Authenticated users can view all trainer profiles"
  on public.trainer_profiles for select
  to authenticated
  using (true);

-- Users can only create their own trainer profile
create policy "Users can create their own trainer profile"
  on public.trainer_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can only update their own profile; cannot change is_verified
create policy "Users can update their own trainer profile"
  on public.trainer_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and is_verified is not distinct from (
      select tp.is_verified from public.trainer_profiles tp where tp.id = trainer_profiles.id
    )
  );

-- Users can only delete their own profile
create policy "Users can delete their own trainer profile"
  on public.trainer_profiles for delete
  to authenticated
  using (auth.uid() = user_id);
