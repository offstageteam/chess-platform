-- Drop and recreate rooms table with proper structure
drop table if exists rooms;

create table rooms (
  id text primary key,
  white_player text,
  black_player text,
  status text default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  created_at timestamptz default now()
);

alter table rooms enable row level security;
create policy "Rooms are viewable by everyone" on rooms for select using (true);
create policy "Anyone can create a room" on rooms for insert with check (true);
create policy "Anyone can update a room" on rooms for update using (true);
