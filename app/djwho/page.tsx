'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { generateRoomCode, generatePlateCode, pickColor } from '@/lib/plates'

type Mode = 'game' | 'playlist'
type GameTab = 'create' | 'join'
type PlaylistTab = 'create' | 'join'

export default function DJWhoHome() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('game')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <button
        onClick={() => router.push('/')}
        className="self-start mb-6 text-[#F4F1EA] opacity-50 text-sm active:opacity-100"
      >
        ← RoadGamez
      </button>

      <div className="text-center mb-8">
        <h1 className="text-6xl text-[#F4A340] mb-2" style={{ fontFamily: 'var(--font-oswald)', letterSpacing: '0.04em' }}>
          DJ Who?
        </h1>
        <p className="text-[#F4F1EA] opacity-60 text-sm">
          Someone picked it. Can you guess who?
        </p>
      </div>

      {/* Mode selector */}
      <div className="flex rounded-xl overflow-hidden border border-[#3D4466] mb-8 w-full max-w-sm">
        <button
          onClick={() => setMode('game')}
          className={`flex-1 py-3 text-sm font-display transition-colors ${mode === 'game' ? 'bg-[#3D4466] text-[#F4A340]' : 'text-[#F4F1EA] opacity-50'}`}
          style={{ fontFamily: 'var(--font-oswald)' }}
        >
          🎲 DJ Who? Game
        </button>
        <button
          onClick={() => setMode('playlist')}
          className={`flex-1 py-3 text-sm font-display transition-colors ${mode === 'playlist' ? 'bg-[#3D4466] text-[#F4A340]' : 'text-[#F4F1EA] opacity-50'}`}
          style={{ fontFamily: 'var(--font-oswald)' }}
        >
          🎵 Road Trip Playlist
        </button>
      </div>

      {mode === 'game' && <GameSection router={router} />}
      {mode === 'playlist' && <PlaylistSection router={router} />}
    </div>
  )
}

// ── Game section ─────────────────────────────────────────────────────────────

function GameSection({ router }: { router: ReturnType<typeof useRouter> }) {
  const [tab, setTab] = useState<GameTab>('create')
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true); setError('')
    const code = generateRoomCode()
    const { data: player } = await supabase.from('players').insert({
      room_id: null, name: name.trim(), plate_code: generatePlateCode(),
      color: pickColor(0), is_main_leader: true, is_car_leader: true, ready: false,
    }).select().single()
    if (!player) { setError('Failed to create. Try again.'); setLoading(false); return }
    const { data: room } = await supabase.from('rooms').insert({ code, main_leader_id: player.id, phase: 'lobby' }).select().single()
    if (!room) { setError('Failed to create room. Try again.'); setLoading(false); return }
    const { data: car } = await supabase.from('cars').insert({ room_id: room.id, name: 'Car 1', car_leader_id: player.id }).select().single()
    await supabase.from('players').update({ room_id: room.id, car_id: car?.id ?? null }).eq('id', player.id)
    localStorage.setItem(`djwho:${code}:myPlayerIds`, JSON.stringify([player.id]))
    router.push(`/room/${code}`)
  }

  async function handleJoin() {
    if (joinCode.length < 4) return
    setLoading(true); setError('')
    const upper = joinCode.trim().toUpperCase()
    const { data: room } = await supabase.from('rooms').select('*').eq('code', upper).single()
    if (!room) { setError('Room not found. Check the code.'); setLoading(false); return }
    if (room.phase !== 'lobby') { setError('This game has already started.'); setLoading(false); return }
    router.push(`/room/${upper}`)
  }

  return (
    <div className="w-full max-w-sm space-y-4">
      <div className="flex rounded-xl overflow-hidden border border-[#3D4466]">
        {(['create', 'join'] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setError('') }}
            className={`flex-1 py-2.5 text-sm font-display transition-colors ${tab === t ? 'bg-[#3D4466] text-[#F4A340]' : 'text-[#F4F1EA] opacity-50'}`}
            style={{ fontFamily: 'var(--font-oswald)' }}>
            {t === 'create' ? 'New Game' : 'Join Game'}
          </button>
        ))}
      </div>

      {tab === 'create' && (
        <>
          <input type="text" placeholder="Your name" value={name}
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="w-full rounded-xl px-4 py-4 bg-[#3D4466] text-[#F4F1EA] placeholder-[#F4F1EA]/40 outline-none text-base" />
          {error && <p className="text-[#E8503A] text-sm">{error}</p>}
          <button onClick={handleCreate} disabled={loading || !name.trim()}
            className="w-full py-4 rounded-2xl bg-[#F4A340] text-[#1A2238] font-display text-xl disabled:opacity-40 active:opacity-80"
            style={{ fontFamily: 'var(--font-oswald)' }}>
            {loading ? 'Creating…' : 'Create Room'}
          </button>
        </>
      )}

      {tab === 'join' && (
        <>
          <input type="text" placeholder="Room code (e.g. RDTR)" value={joinCode} maxLength={4}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            className="w-full rounded-xl px-4 py-4 bg-[#3D4466] text-[#F4F1EA] placeholder-[#F4F1EA]/40 outline-none text-base text-center font-display text-2xl tracking-widest"
            style={{ fontFamily: 'var(--font-oswald)' }} />
          {error && <p className="text-[#E8503A] text-sm text-center">{error}</p>}
          <button onClick={handleJoin} disabled={loading || joinCode.length < 4}
            className="w-full py-4 rounded-2xl bg-[#F4A340] text-[#1A2238] font-display text-xl disabled:opacity-40 active:opacity-80"
            style={{ fontFamily: 'var(--font-oswald)' }}>
            {loading ? 'Looking up…' : 'Join Room'}
          </button>
        </>
      )}
    </div>
  )
}

// ── Playlist section ──────────────────────────────────────────────────────────

function PlaylistSection({ router }: { router: ReturnType<typeof useRouter> }) {
  const [tab, setTab] = useState<PlaylistTab>('create')
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [songsPerPerson, setSongsPerPerson] = useState(2)
  const [autoPlay, setAutoPlay] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true); setError('')
    const code = generateRoomCode()
    const { data: member } = await supabase.from('playlist_members').insert({
      playlist_id: null, name: name.trim(),
      plate_code: generatePlateCode(), color: pickColor(0), done_adding: false,
    }).select().single()
    if (!member) { setError('Failed to create. Try again.'); setLoading(false); return }
    const { data: playlist } = await supabase.from('playlists').insert({
      code, host_id: member.id, songs_per_person: songsPerPerson, auto_play: autoPlay, phase: 'lobby',
    }).select().single()
    if (!playlist) { setError('Failed to create playlist. Try again.'); setLoading(false); return }
    await supabase.from('playlist_members').update({ playlist_id: playlist.id }).eq('id', member.id)
    localStorage.setItem(`djwho:playlist:${code}:myMemberId`, member.id)
    router.push(`/playlist/${code}`)
  }

  async function handleJoin() {
    if (joinCode.length < 4) return
    setLoading(true); setError('')
    const upper = joinCode.trim().toUpperCase()
    const { data: playlist } = await supabase.from('playlists').select('*').eq('code', upper).single()
    if (!playlist) { setError('Playlist not found. Check the code.'); setLoading(false); return }
    if (playlist.phase !== 'lobby') { setError('This playlist has already started.'); setLoading(false); return }
    router.push(`/playlist/${upper}`)
  }

  return (
    <div className="w-full max-w-sm space-y-4">
      <div className="flex rounded-xl overflow-hidden border border-[#3D4466]">
        {(['create', 'join'] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setError('') }}
            className={`flex-1 py-2.5 text-sm font-display transition-colors ${tab === t ? 'bg-[#3D4466] text-[#F4A340]' : 'text-[#F4F1EA] opacity-50'}`}
            style={{ fontFamily: 'var(--font-oswald)' }}>
            {t === 'create' ? 'New Playlist' : 'Join Playlist'}
          </button>
        ))}
      </div>

      {tab === 'create' && (
        <>
          <input type="text" placeholder="Your name" value={name}
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="w-full rounded-xl px-4 py-4 bg-[#3D4466] text-[#F4F1EA] placeholder-[#F4F1EA]/40 outline-none text-base" />

          <div className="rounded-xl p-4 bg-[#3D4466] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[#F4F1EA] text-sm">Songs per person</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setSongsPerPerson(Math.max(1, songsPerPerson - 1))}
                  className="w-8 h-8 rounded-lg bg-[#1A2238] text-[#F4F1EA] text-lg active:opacity-70">−</button>
                <span className="text-[#F4A340] font-display text-xl w-6 text-center" style={{ fontFamily: 'var(--font-oswald)' }}>{songsPerPerson}</span>
                <button onClick={() => setSongsPerPerson(Math.min(10, songsPerPerson + 1))}
                  className="w-8 h-8 rounded-lg bg-[#1A2238] text-[#F4F1EA] text-lg active:opacity-70">+</button>
              </div>
            </div>
          </div>

          <div className="rounded-xl p-4 bg-[#3D4466] space-y-3">
            <span className="text-[#F4F1EA] text-sm">Playback mode</span>
            <div className="space-y-2">
              <button onClick={() => setAutoPlay(true)}
                className={`w-full text-left rounded-lg px-4 py-3 text-sm transition-colors ${autoPlay ? 'bg-[#F4A340] text-[#1A2238]' : 'bg-[#1A2238] text-[#F4F1EA]'}`}>
                <div className="font-medium">Auto-play</div>
                <div className="text-xs opacity-70 mt-0.5">Songs advance automatically when one ends</div>
              </button>
              <button onClick={() => setAutoPlay(false)}
                className={`w-full text-left rounded-lg px-4 py-3 text-sm transition-colors ${!autoPlay ? 'bg-[#F4A340] text-[#1A2238]' : 'bg-[#1A2238] text-[#F4F1EA]'}`}>
                <div className="font-medium">DJ Mode</div>
                <div className="text-xs opacity-70 mt-0.5">You choose which song plays next from the full queue</div>
              </button>
            </div>
          </div>

          {error && <p className="text-[#E8503A] text-sm">{error}</p>}
          <button onClick={handleCreate} disabled={loading || !name.trim()}
            className="w-full py-4 rounded-2xl bg-[#F4A340] text-[#1A2238] font-display text-xl disabled:opacity-40 active:opacity-80"
            style={{ fontFamily: 'var(--font-oswald)' }}>
            {loading ? 'Creating…' : 'Create Playlist'}
          </button>
        </>
      )}

      {tab === 'join' && (
        <>
          <input type="text" placeholder="Playlist code" value={joinCode} maxLength={4}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            className="w-full rounded-xl px-4 py-4 bg-[#3D4466] text-[#F4F1EA] placeholder-[#F4F1EA]/40 outline-none text-base text-center font-display text-2xl tracking-widest"
            style={{ fontFamily: 'var(--font-oswald)' }} />
          {error && <p className="text-[#E8503A] text-sm text-center">{error}</p>}
          <button onClick={handleJoin} disabled={loading || joinCode.length < 4}
            className="w-full py-4 rounded-2xl bg-[#F4A340] text-[#1A2238] font-display text-xl disabled:opacity-40 active:opacity-80"
            style={{ fontFamily: 'var(--font-oswald)' }}>
            {loading ? 'Looking up…' : 'Join Playlist'}
          </button>
        </>
      )}
    </div>
  )
}
