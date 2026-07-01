'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { generateRoomCode, generatePlateCode, pickColor } from '@/lib/plates'

export default function Home() {
  const router = useRouter()
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    setError('')

    const code = generateRoomCode()
    const plateCode = generatePlateCode()
    const color = pickColor(0)

    // Create player first (room_id nullable) so we have a real id for the room's FK
    const { data: player } = await supabase
      .from('players')
      .insert({
        room_id: null,
        name: name.trim(),
        plate_code: plateCode,
        color,
        is_main_leader: true,
        is_car_leader: true,
        ready: false,
      })
      .select()
      .single()

    if (!player) { setError('Failed to create player. Try again.'); setLoading(false); return }

    // Now create the room with the real player id — satisfies the FK constraint
    const { data: room } = await supabase
      .from('rooms')
      .insert({ code, main_leader_id: player.id, phase: 'lobby' })
      .select()
      .single()

    if (!room) { setError('Failed to create room. Try again.'); setLoading(false); return }

    // Create Car 1, then link player to both room and car
    const { data: car } = await supabase
      .from('cars')
      .insert({ room_id: room.id, name: 'Car 1', car_leader_id: player.id })
      .select()
      .single()

    await supabase
      .from('players')
      .update({ room_id: room.id, car_id: car?.id ?? null })
      .eq('id', player.id)

    const storageKey = `djwho:${code}:myPlayerIds`
    localStorage.setItem(storageKey, JSON.stringify([player.id]))

    router.push(`/room/${code}`)
  }

  async function handleJoin() {
    if (!joinCode.trim()) return
    setLoading(true)
    setError('')

    const upper = joinCode.trim().toUpperCase()
    const { data: room } = await supabase.from('rooms').select('*').eq('code', upper).single()
    if (!room) { setError('Room not found. Check the code.'); setLoading(false); return }
    if (room.phase !== 'lobby') { setError('This game has already started.'); setLoading(false); return }

    router.push(`/room/${upper}`)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      {/* Wordmark */}
      <div className="text-center mb-10">
        <h1
          className="text-6xl text-[#F4A340] mb-2"
          style={{ fontFamily: 'var(--font-oswald)', letterSpacing: '0.04em' }}
        >
          DJ Who?
        </h1>
        <p className="text-[#F4F1EA] opacity-60 text-base">
          Someone picked it. Can you guess who?
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-xl overflow-hidden border border-[#3D4466] mb-6 w-full max-w-sm">
        {(['create', 'join'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError('') }}
            className={`flex-1 py-3 text-base font-display capitalize transition-colors ${tab === t ? 'bg-[#3D4466] text-[#F4A340]' : 'text-[#F4F1EA] opacity-60'}`}
            style={{ fontFamily: 'var(--font-oswald)' }}
          >
            {t === 'create' ? 'New Game' : 'Join Game'}
          </button>
        ))}
      </div>

      <div className="w-full max-w-sm space-y-4">
        {tab === 'create' && (
          <>
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="w-full rounded-xl px-4 py-4 bg-[#3D4466] text-[#F4F1EA] placeholder-[#F4F1EA]/40 outline-none text-base"
            />
            {error && <p className="text-[#E8503A] text-sm">{error}</p>}
            <button
              onClick={handleCreate}
              disabled={loading || !name.trim()}
              className="w-full py-4 rounded-2xl bg-[#F4A340] text-[#1A2238] font-display text-xl disabled:opacity-40 active:opacity-80"
              style={{ fontFamily: 'var(--font-oswald)' }}
            >
              {loading ? 'Creating…' : 'Create Room'}
            </button>
          </>
        )}

        {tab === 'join' && (
          <>
            <input
              type="text"
              placeholder="Room code (e.g. RDTR)"
              value={joinCode}
              maxLength={4}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              className="w-full rounded-xl px-4 py-4 bg-[#3D4466] text-[#F4F1EA] placeholder-[#F4F1EA]/40 outline-none text-base text-center font-display text-2xl tracking-widest"
              style={{ fontFamily: 'var(--font-oswald)' }}
            />
            {error && <p className="text-[#E8503A] text-sm text-center">{error}</p>}
            <button
              onClick={handleJoin}
              disabled={loading || joinCode.length < 4}
              className="w-full py-4 rounded-2xl bg-[#F4A340] text-[#1A2238] font-display text-xl disabled:opacity-40 active:opacity-80"
              style={{ fontFamily: 'var(--font-oswald)' }}
            >
              {loading ? 'Looking up…' : 'Join Room'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
