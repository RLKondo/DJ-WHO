-- Playlists upgrade: clean mode, themes, solo playlists, saved playlists.
-- Run once in the Supabase SQL editor.

alter table rooms
  add column if not exists playlist_clean boolean default false,
  add column if not exists playlist_theme text,
  add column if not exists playlist_solo boolean default false;

-- Clean mode holds songs for host approval before they reach the playlist.
alter table songs
  add column if not exists approved boolean default true;

-- Host approves/rejects songs, so songs need update + delete policies.
drop policy if exists "public update songs" on songs;
create policy "public update songs" on songs for update using (true);
drop policy if exists "public delete songs" on songs;
create policy "public delete songs" on songs for delete using (true);

-- Saved playlists: no accounts, the code is the key.
create table if not exists saved_playlists (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  theme text,
  created_at timestamptz default now()
);

create table if not exists saved_playlist_songs (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid references saved_playlists(id) on delete cascade,
  position int not null,
  youtube_id text not null,
  title text not null,
  thumbnail_url text,
  contributor_name text
);

alter table saved_playlists enable row level security;
alter table saved_playlist_songs enable row level security;

create policy "public read saved_playlists" on saved_playlists for select using (true);
create policy "public insert saved_playlists" on saved_playlists for insert with check (true);
create policy "public read saved_playlist_songs" on saved_playlist_songs for select using (true);
create policy "public insert saved_playlist_songs" on saved_playlist_songs for insert with check (true);
