-- Profiles table (extends auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  city text default '',
  rating int default 1200,
  wins int default 0,
  losses int default 0,
  draws int default 0,
  is_pro boolean default false,
  created_at timestamptz default now()
);

-- Games table
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  white_id uuid references profiles(id),
  black_id uuid references profiles(id),
  winner text check (winner in ('white', 'black', 'draw')),
  moves text[] default '{}',
  pgn text default '',
  mode text check (mode in ('pvp', 'ai', 'multiplayer')) default 'pvp',
  created_at timestamptz default now()
);

-- Enable RLS
alter table profiles enable row level security;
alter table games enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile" on profiles for update using (auth.uid() = id);

-- Games policies
create policy "Games are viewable by everyone" on games for select using (true);
create policy "Authenticated users can insert games" on games for insert with check (auth.uid() is not null);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
