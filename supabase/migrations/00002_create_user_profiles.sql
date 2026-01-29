-- User profiles table (extends auth.users with fitness-related data)
create table public.user_profiles (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null unique references auth.users(id) on delete cascade,

  -- Personal info
  display_name              text not null,
  avatar_url                text,
  phone                     text,
  date_of_birth             date,
  gender                    text,
  bio                       text,

  -- Body metrics
  height_cm                 numeric(5,1) check (height_cm > 0),
  weight_kg                 numeric(5,1) check (weight_kg > 0),

  -- Fitness profile (used by Deep Search for matching)
  fitness_level             text check (fitness_level in ('beginner', 'intermediate', 'advanced')),
  fitness_goals             text[] not null default '{}',
  health_conditions         text[] not null default '{}',
  preferred_training_style  text[] not null default '{}',

  -- Location (geography for radius-based trainer matching)
  location                  extensions.geography(Point, 4326),
  city                      text,
  country                   text,

  -- Timestamps
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- Indexes
create index idx_user_profiles_user_id on public.user_profiles(user_id);
create index idx_user_profiles_location on public.user_profiles using gist(location);
create index idx_user_profiles_fitness_goals on public.user_profiles using gin(fitness_goals);

-- Reuse the updated_at trigger function from migration 00001
create trigger set_updated_at
  before update on public.user_profiles
  for each row
  execute function public.handle_updated_at();

-- Row Level Security
alter table public.user_profiles enable row level security;

-- Any authenticated user can view user profiles (trainers need to see seeker info)
create policy "Authenticated users can view all user profiles"
  on public.user_profiles for select
  to authenticated
  using (true);

-- Users can only create their own profile
create policy "Users can create their own user profile"
  on public.user_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can only update their own profile
create policy "Users can update their own user profile"
  on public.user_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can only delete their own profile
create policy "Users can delete their own user profile"
  on public.user_profiles for delete
  to authenticated
  using (auth.uid() = user_id);
