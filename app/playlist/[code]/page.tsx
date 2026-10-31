'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, SavedPlaylist, SavedPlaylistSong } from '@/lib/supabase'
import { generateRoomCode, generatePlateCode, pickColor } from '@/lib/plates'
import { rememberSaved } from '@/lib/clean'

export default function SavedPlaylistPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const upperCode = decodeURIComponent(code).toUpperCase()
  const router = useRouter()

  const [playlist, setPlaylist] = useState<SavedPlaylist | null>(null)
  const [songs, setSongs] = useState<SavedPlaylistSong[]>([])
  const [loaded, setLoaded] = useState(false)
  const [name, setName] = useState('')
  const [shuffle, setShuffle] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: pl } = await supabase.from('saved_playlists').select('*').eq('code', upperCode).single()
      if (pl) {
        const { data: rows } = await supabase
          .from('saved_playlist_songs').select('*').eq('playlist_id', pl.id).order('position')
        setPlaylist(pl)
        setSongs(rows ?? [])
        rememberSaved({ code: pl.code, name: pl.name })
      }
      setLoaded(true)
    }
    load()
  }, [upperCode])

  // Creates a private solo room holding this playlist's songs, then jumps into it.
  async function launch(startPhase: 'playlist_playing' | 'playlist_submit') {
    if (!playlist || !name.trim() || songs.length === 0) return
    setBusy(true); setError('')
    const roomCode = generateRoomCode()

    const { data: player } = await supabase.from('players').insert({
      room_id: null, name: name.trim(), plate_code: generatePlateCode(),
      color: pickColor(0), is_main_leader: true, is_car_leader: true, ready: false,
    }).select().single()
    if (!player) { setError('Something went wrong. Try again.'); setBusy(false); return }

    const { data: room } = await supabase.from('rooms').insert({
      code: roomCode, main_leader_id: player.id, phase: startPhase,
      mode: 'playlist', playlist_songs_per_player: 50, playlist_order: 'shuffle',
      playlist_clean: false, playlist_theme: playlist.theme, playlist_solo: true,
    }).select().single()
    if (!room) { setError('Something went wrong. Try again.'); setBusy(false); return }

    const { data: car } = await supabase.from('cars')
      .insert({ room_id: room.id, name: 'Car 1', car_leader_id: player.id }).select().single()
    await supabase.from('players').update({ room_id: room.id, car_id: car?.id ?? null }).eq('id', player.id)

    const { data: inserted } = await supabase.from('songs').insert(
      songs.map((s) => ({
        room_id: room.id, player_id: player.id, youtube_id: s.youtube_id,
        title: s.title, thumbnail_url: s.thumbnail_url, approved: true,
      }))
    ).select()
    if (!inserted || inserted.length === 0) { setError('Could not load the songs. Try again.'); setBusy(false); return }

    if (startPhase === 'playlist_playing') {
      const ordered = [...inserted]
      if (shuffle) {
        for (let i = ordered.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [ordered[i], ordered[j]] = [ordered[j], ordered[i]]
        }
      }
      await supabase.from('playlist_queue').insert(
        ordered.map((s, i) => ({ room_id: room.id, song_id: s.id, position: i, played: false }))
      )
    }

    localStorage.setItem(`djwho:${roomCode}:myPlayerIds`, JSON.stringify([player.id]))
    router.push(`/room/${roomCode}`)
  }

  if (!loaded) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-[#F4F1EA] opacity-50">Loading…</p></div>
  }

  if (!playlist) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-[#E8503A] text-lg mb-4">No saved playlist with the code {upperCode}.</p>
          <a href="/" className="text-[#F4A340] underline">Back to home</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-10 max-w-md mx-auto w-full">
      <a href="/" className="text-[#F4F1EA] opacity-50 text-sm mb-4">← Home</a>
      <div className="text-center mb-6">
        <h1 className="font-display text-3xl text-[#F4A340] mb-1" style={{ fontFamily: 'var(--font-oswald)' }}>
          {playlist.name}
        </h1>
        <p className="font-display text-[#F4F1EA] tracking-widest" style={{ fontFamily: 'var(--font-oswald)' }}>{playlist.code}</p>
        {playlist.theme && <p className="text-[#4FC3A1] text-sm mt-1">Theme: {playlist.theme}</p>}
        <p className="text-[#F4F1EA] opacity-60 text-sm mt-1">{songs.length} song{songs.length === 1 ? '' : 's'}</p>
      </div>

      <div className="space-y-2 mb-6">
        {songs.map((s, i) => (
          <div key={s.id} className="flex items-center gap-3 rounded-xl px-4 py-3 bg-[#3D4466]">
            <span className="text-[#F4F1EA] opacity-40 text-sm w-6">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[#F4F1EA] text-sm font-medium truncate">{s.title}</p>
              {s.contributor_name && <p className="text-[#F4F1EA] opacity-50 text-xs truncate">{s.contributor_name}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl px-4 py-4 bg-[#3D4466] text-[#F4F1EA] placeholder-[#F4F1EA]/40 outline-none text-base" />
        <label className="flex items-center gap-3 text-[#F4F1EA] text-sm cursor-pointer">
          <input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} className="w-5 h-5 accent-[#F4A340]" />
          Shuffle the order
        </label>
        {error && <p className="text-[#E8503A] text-sm">{error}</p>}
        <button onClick={() => launch('playlist_playing')} disabled={busy || !name.trim() || songs.length === 0}
          className="w-full py-4 rounded-2xl bg-[#F4A340] text-[#1A2238] font-display text-xl disabled:opacity-40 active:opacity-80"
          style={{ fontFamily: 'var(--font-oswald)' }}>
          {busy ? 'Loading…' : '▶ Play Now'}
        </button>
        <button onClick={() => launch('playlist_submit')} disabled={busy || !name.trim() || songs.length === 0}
          className="w-full py-3 rounded-2xl bg-[#3D4466] text-[#F4F1EA] font-display text-lg disabled:opacity-40 active:opacity-70"
          style={{ fontFamily: 'var(--font-oswald)' }}>
          ＋ Add more songs first
        </button>
      </div>
    </div>
  )
}
