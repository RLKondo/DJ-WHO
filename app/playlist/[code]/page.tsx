'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Playlist, PlaylistMember, PlaylistSong } from '@/lib/supabase'
import { generatePlateCode, pickColor } from '@/lib/plates'
import PlaylistLobby from '@/app/components/playlist/PlaylistLobby'
import PlaylistAdding from '@/app/components/playlist/PlaylistAdding'
import PlaylistPlayer from '@/app/components/playlist/PlaylistPlayer'

type State = {
  playlist: Playlist
  members: PlaylistMember[]
  songs: PlaylistSong[]
}

export default function PlaylistPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const upperCode = code.toUpperCase()
  const router = useRouter()

  const [state, setState] = useState<State | null>(null)
  const [myMemberId, setMyMemberId] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Join form state
  const [joinName, setJoinName] = useState('')
  const [joining, setJoining] = useState(false)

  const storageKey = `djwho:playlist:${upperCode}:myMemberId`

  const loadState = useCallback(async () => {
    const { data: playlist } = await supabase
      .from('playlists').select('*').eq('code', upperCode).single()
    if (!playlist) { setError('Playlist not found.'); return }

    const [{ data: members }, { data: songs }] = await Promise.all([
      supabase.from('playlist_members').select('*').eq('playlist_id', playlist.id).order('created_at'),
      supabase.from('playlist_songs').select('*').eq('playlist_id', playlist.id),
    ])

    setState({ playlist, members: members ?? [], songs: songs ?? [] })
  }, [upperCode])

  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) setMyMemberId(saved)
    loadState()
  }, [loadState, storageKey])

  // Realtime
  useEffect(() => {
    if (!state?.playlist?.id) return
    const id = state.playlist.id
    const sub = supabase.channel(`playlist:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playlists', filter: `id=eq.${id}` }, loadState)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playlist_members', filter: `playlist_id=eq.${id}` }, loadState)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playlist_songs', filter: `playlist_id=eq.${id}` }, loadState)
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [state?.playlist?.id, loadState])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-[#E8503A] text-lg mb-4">{error}</p>
          <button onClick={() => router.push('/')} className="text-[#F4A340] underline">Back to home</button>
        </div>
      </div>
    )
  }

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[#F4F1EA] opacity-50">Loading…</p>
      </div>
    )
  }

  const { playlist, members, songs } = state

  // Validate saved member id
  const validMemberId = myMemberId && members.some((m) => m.id === myMemberId) ? myMemberId : null

  // ── Join screen ──────────────────────────────────────────────────────────────
  if (!validMemberId) {
    if (playlist.phase !== 'lobby') {
      return (
        <div className="min-h-screen flex items-center justify-center px-6 text-center">
          <p className="text-[#F4F1EA] opacity-60">This playlist has already started. Ask the host to share the code next time!</p>
        </div>
      )
    }

    async function handleJoin() {
      if (!joinName.trim()) return
      setJoining(true)
      const plateCode = generatePlateCode()
      const color = pickColor(members.length)
      const { data: member } = await supabase.from('playlist_members').insert({
        playlist_id: playlist.id,
        name: joinName.trim(),
        plate_code: plateCode,
        color,
        done_adding: false,
      }).select().single()
      if (member) {
        setMyMemberId(member.id)
        localStorage.setItem(storageKey, member.id)
      }
      setJoining(false)
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <h1 className="font-display text-4xl text-[#F4A340] mb-1" style={{ fontFamily: 'var(--font-oswald)' }}>
          Road Trip Playlist
        </h1>
        <div className="font-display text-3xl text-[#F4F1EA] mb-8 tracking-widest" style={{ fontFamily: 'var(--font-oswald)' }}>
          {upperCode}
        </div>
        <div className="w-full max-w-sm space-y-4">
          <input type="text" placeholder="Your name" value={joinName}
            onChange={(e) => setJoinName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            className="w-full rounded-xl px-4 py-4 bg-[#3D4466] text-[#F4F1EA] placeholder-[#F4F1EA]/40 outline-none text-base" />
          <button onClick={handleJoin} disabled={joining || !joinName.trim()}
            className="w-full py-4 rounded-2xl bg-[#F4A340] text-[#1A2238] font-display text-xl disabled:opacity-40 active:opacity-80"
            style={{ fontFamily: 'var(--font-oswald)' }}>
            {joining ? 'Joining…' : 'Join Playlist'}
          </button>
        </div>
      </div>
    )
  }

  // ── Phase routing ────────────────────────────────────────────────────────────
  if (playlist.phase === 'lobby') {
    return <PlaylistLobby playlist={playlist} members={members} myMemberId={validMemberId} />
  }

  if (playlist.phase === 'adding') {
    return <PlaylistAdding playlist={playlist} members={members} songs={songs} myMemberId={validMemberId} />
  }

  if (playlist.phase === 'playing' || playlist.phase === 'paused' || playlist.phase === 'done') {
    return <PlaylistPlayer playlist={playlist} members={members} songs={songs} myMemberId={validMemberId} />
  }

  return null
}
