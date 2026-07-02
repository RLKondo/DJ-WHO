import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Room = {
  id: string
  code: string
  main_leader_id: string
  phase: 'lobby' | 'submit' | 'cars_playing' | 'results'
  created_at: string
}

export type Car = {
  id: string
  room_id: string
  name: string
  car_leader_id: string | null
  phase: 'waiting' | 'play' | 'guess' | 'done'
  current_song_index: number
  song_order: string[]
  created_at: string
}

export type Player = {
  id: string
  room_id: string
  car_id: string | null
  name: string
  plate_code: string
  color: string
  is_main_leader: boolean
  is_car_leader: boolean
  ready: boolean
  device_owner_id: string | null
  created_at: string
}

export type Song = {
  id: string
  room_id: string
  player_id: string  // hidden from clients until results phase
  youtube_id: string
  title: string
  thumbnail_url: string | null
  created_at: string
}

export type Guess = {
  id: string
  room_id: string
  guesser_id: string
  song_id: string
  guessed_player_id: string
  created_at: string
}

export type Playlist = {
  id: string
  code: string
  host_id: string
  songs_per_person: number
  auto_play: boolean
  phase: 'lobby' | 'adding' | 'playing' | 'paused' | 'done'
  current_index: number
  play_order: string[]
  created_at: string
}

export type PlaylistMember = {
  id: string
  playlist_id: string
  name: string
  plate_code: string
  color: string
  done_adding: boolean
  created_at: string
}

export type PlaylistSong = {
  id: string
  playlist_id: string
  member_id: string
  youtube_id: string
  title: string
  thumbnail_url: string | null
  member_song_index: number
  created_at: string
}
