'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { supabase, Room, Car, Player, Song, Guess, PlaylistQueueItem } from '@/lib/supabase'
import { generatePlateCode, pickColor } from '@/lib/plates'
import Lobby from '@/app/components/Lobby'
import SubmitPhase from '@/app/components/SubmitPhase'
import PlayPhase from '@/app/components/PlayPhase'
import GuessPhase from '@/app/components/GuessPhase'
import ResultsPhase from '@/app/components/ResultsPhase'
import CarStatusList from '@/app/components/CarStatusList'
import PlaylistSubmitPhase from '@/app/components/PlaylistSubmitPhase'
import PlaylistPlayer from '@/app/components/PlaylistPlayer'
import PlaylistDonePhase from '@/app/components/PlaylistDonePhase'

type GameState = {
  room: Room
  cars: Car[]
  players: Player[]
  songs: Song[]
  guesses: Guess[]
  playlistQueue: PlaylistQueueItem[]
}

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const upperCode = code.toUpperCase()

  const [state, setState] = useState<GameState | null>(null)
  const [myPlayerIds, setMyPlayerIds] = useState<string[]>([])
  const [error, setError] = useState('')

  const storageKey = `djwho:${upperCode}:myPlayerIds`

  const loadState = useCallback(async () => {
    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', upperCode)
      .single()

    if (!room) { setError('Room not found. Check the code and try again.'); return }

    const [{ data: cars }, { data: players }, { data: songs }, { data: guesses }, { data: playlistQueue }] = await Promise.all([
      supabase.from('cars').select('*').eq('room_id', room.id).order('created_at'),
      supabase.from('players').select('*').eq('room_id', room.id).order('created_at'),
      supabase.from('songs').select('*').eq('room_id', room.id),
      supabase.from('guesses').select('*').eq('room_id', room.id),
      supabase.from('playlist_queue').select('*').eq('room_id', room.id),
    ])

    setState({
      room,
      cars: cars ?? [],
      players: players ?? [],
      songs: songs ?? [],
      guesses: guesses ?? [],
      playlistQueue: playlistQueue ?? [],
    })
  }, [upperCode])

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
    if (saved.length) setMyPlayerIds(saved)
    loadState()
  }, [loadState, storageKey])

  // Realtime subscriptions — re-fetch full state on any change
  useEffect(() => {
    if (!state?.room?.id) return
    const roomId = state.room.id

    const sub = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, loadState)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cars', filter: `room_id=eq.${roomId}` }, loadState)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` }, loadState)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'songs', filter: `room_id=eq.${roomId}` }, loadState)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guesses', filter: `room_id=eq.${roomId}` }, loadState)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playlist_queue', filter: `room_id=eq.${roomId}` }, loadState)
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [state?.room?.id, loadState])

  // ── Not-yet-joined flow ──────────────────────────────────────────────────────
  const [joinName, setJoinName] = useState('')
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)

  async function handleJoin() {
    if (!joinName.trim() || !state) return
    setJoining(true)

    const plateCode = generatePlateCode()
    const color = pickColor(state.players.length)

    // Auto-select car if only one exists
    const carId = selectedCarId ?? (state.cars.length === 1 ? state.cars[0].id : null)

    const isFirst = state.players.length === 0
    const { data: player } = await supabase
      .from('players')
      .insert({
        room_id: state.room.id,
        car_id: carId,
        name: joinName.trim(),
        plate_code: plateCode,
        color,
        is_main_leader: isFirst,
        is_car_leader: isFirst,
        ready: false,
      })
      .select()
      .single()

    if (player) {
      // If this is the very first player, create Car 1 and link them as car leader
      if (isFirst) {
        const { data: car } = await supabase
          .from('cars')
          .insert({ room_id: state.room.id, name: 'Car 1', car_leader_id: player.id })
          .select()
          .single()
        if (car) {
          await supabase.from('players').update({ car_id: car.id }).eq('id', player.id)
        }
      }

      const newIds = [player.id]
      setMyPlayerIds(newIds)
      localStorage.setItem(storageKey, JSON.stringify(newIds))
    }

    setJoining(false)
  }

  // ── Loading / Error ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-[#E8503A] text-lg mb-4">{error}</p>
          <a href="/" className="text-[#F4A340] underline">Back to home</a>
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

  const { room, cars, players, songs, guesses, playlistQueue } = state

  // Validate myPlayerIds against actual players in this room
  const validMyIds = myPlayerIds.filter((id) => players.some((p) => p.id === id))

  // ── Join screen (player not yet registered) ──────────────────────────────────
  if (validMyIds.length === 0) {
    // Block joining after lobby
    if (room.phase !== 'lobby') {
      return (
        <div className="min-h-screen flex items-center justify-center px-6 text-center">
          <p className="text-[#F4F1EA] opacity-60">The game is already in progress. You can watch from here when results are revealed.</p>
        </div>
      )
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <h1 className="font-display text-4xl text-[#F4A340] mb-2" style={{ fontFamily: 'var(--font-oswald)' }}>
          DJ Who?
        </h1>
        <div className="font-display text-3xl text-[#F4F1EA] mb-8 tracking-widest" style={{ fontFamily: 'var(--font-oswald)' }}>
          {upperCode}
        </div>
        <div className="w-full max-w-sm space-y-4">
          <input
            type="text"
            placeholder="Your name"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            className="w-full rounded-xl px-4 py-4 bg-[#3D4466] text-[#F4F1EA] placeholder-[#F4F1EA]/40 outline-none text-base"
          />
          {cars.length > 1 && (
            <div className="space-y-2">
              <p className="text-[#F4F1EA] opacity-60 text-sm">Which car are you in?</p>
              {cars.map((car) => (
                <button
                  key={car.id}
                  onClick={() => setSelectedCarId(car.id)}
                  className={`w-full py-3 rounded-xl text-sm font-display transition-colors ${selectedCarId === car.id ? 'bg-[#F4A340] text-[#1A2238]' : 'bg-[#3D4466] text-[#F4F1EA]'}`}
                  style={{ fontFamily: 'var(--font-oswald)' }}
                >
                  {car.name}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={handleJoin}
            disabled={joining || !joinName.trim() || (cars.length > 1 && !selectedCarId)}
            className="w-full py-4 rounded-2xl bg-[#F4A340] text-[#1A2238] font-display text-xl disabled:opacity-40 active:opacity-80"
            style={{ fontFamily: 'var(--font-oswald)' }}
          >
            {joining ? 'Joining…' : 'Join Game'}
          </button>
        </div>
      </div>
    )
  }

  const primaryPlayer = players.find((p) => p.id === validMyIds[0])
  const isMainLeader = primaryPlayer?.is_main_leader ?? false
  const myCar = cars.find((c) => c.id === primaryPlayer?.car_id)

  // ── Room-wide phase routing ──────────────────────────────────────────────────
  function handleGuestAdded(guestId: string) {
    const updated = [...myPlayerIds, guestId]
    setMyPlayerIds(updated)
    localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  if (room.phase === 'lobby') {
    return (
      <Lobby
        room={room}
        players={players}
        cars={cars}
        myPlayerIds={validMyIds}
        isMainLeader={isMainLeader}
        onGuestAdded={handleGuestAdded}
      />
    )
  }

  if (room.phase === 'submit') {
    return (
      <SubmitPhase
        room={room}
        allPlayers={players}
        myPlayerIds={validMyIds}
      />
    )
  }

  if (room.phase === 'results') {
    return (
      <ResultsPhase
        room={room}
        players={players}
        songs={songs}
        guesses={guesses}
        cars={cars}
        myPlayerIds={validMyIds}
        isMainLeader={isMainLeader}
      />
    )
  }

  // ── Playlist mode routing (diverges from the guessing game after lobby) ──────
  if (room.phase === 'playlist_submit') {
    return (
      <PlaylistSubmitPhase
        room={room}
        allPlayers={players}
        allSongs={songs}
        myPlayerIds={validMyIds}
      />
    )
  }

  if (room.phase === 'playlist_playing') {
    return (
      <PlaylistPlayer
        room={room}
        queue={playlistQueue}
        songs={songs}
        players={players}
        myPlayerIds={validMyIds}
      />
    )
  }

  if (room.phase === 'playlist_done') {
    return (
      <PlaylistDonePhase
        room={room}
        queue={playlistQueue}
        songs={songs}
        players={players}
        isMainLeader={isMainLeader}
      />
    )
  }

  // ── Per-car phase routing (cars_playing) ─────────────────────────────────────
  if (!myCar) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-[#F4F1EA] opacity-60">Waiting for your car assignment…</p>
      </div>
    )
  }

  if (myCar.phase === 'waiting') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-[#F4F1EA] opacity-60">Get ready to listen! Starting soon…</p>
      </div>
    )
  }

  if (myCar.phase === 'play') {
    return (
      <PlayPhase
        car={myCar}
        songs={songs}
        myPlayerIds={validMyIds}
      />
    )
  }

  if (myCar.phase === 'guess') {
    return (
      <GuessPhase
        room={room}
        car={myCar}
        songs={songs}
        allPlayers={players}
        myPlayerIds={validMyIds}
        allCars={cars}
      />
    )
  }

  if (myCar.phase === 'done') {
    const allDone = cars.every((c) => c.phase === 'done')

    async function handleReveal() {
      await supabase.from('rooms').update({ phase: 'results' }).eq('id', room.id)
      // Force a local reload in case the realtime event is delayed
      await loadState()
    }

    return (
      <div className="min-h-screen flex flex-col px-6 py-10">
        <h2 className="font-display text-2xl text-[#F4A340] text-center mb-2" style={{ fontFamily: 'var(--font-oswald)' }}>
          {myCar.name} is done! 🎉
        </h2>
        <p className="text-[#F4F1EA] opacity-60 text-center text-sm mb-8">
          {allDone
            ? isMainLeader
              ? "Everyone's done! Time to reveal."
              : 'Waiting for the host to reveal results…'
            : 'Waiting for other cars to finish…'}
        </p>
        <CarStatusList cars={cars} players={players} />
        {isMainLeader && allDone && (
          <button
            className="mt-8 w-full py-4 rounded-2xl bg-[#F4A340] text-[#1A2238] font-display text-xl active:opacity-80"
            style={{ fontFamily: 'var(--font-oswald)' }}
            onClick={handleReveal}
          >
            Reveal Results →
          </button>
        )}
      </div>
    )
  }

  return null
}
