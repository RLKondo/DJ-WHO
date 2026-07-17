'use client'

import { useState } from 'react'
import { supabase, Room, Player, Car } from '@/lib/supabase'
import { generatePlateCode, pickColor } from '@/lib/plates'
import PlateAvatar from './PlateAvatar'

type Props = {
  room: Room
  players: Player[]
  cars: Car[]
  myPlayerIds: string[]
  isMainLeader: boolean
  onGuestAdded: (guestId: string) => void
}

export default function Lobby({ room, players, cars, myPlayerIds, isMainLeader, onGuestAdded }: Props) {
  const [addingCar, setAddingCar] = useState(false)
  const [newCarName, setNewCarName] = useState('')
  const [addingGuest, setAddingGuest] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestForPlayerId, setGuestForPlayerId] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState('')

  const myPrimaryId = myPlayerIds[0]

  async function handleAddCar() {
    if (!newCarName.trim()) return
    await supabase.from('cars').insert({ room_id: room.id, name: newCarName.trim() })
    setNewCarName('')
    setAddingCar(false)
  }

  async function handleClaimCar(carId: string) {
    await supabase.from('cars').update({ car_leader_id: myPrimaryId }).eq('id', carId)
    await supabase.from('players').update({ is_car_leader: true, car_id: carId }).eq('id', myPrimaryId)
  }

  async function handleJoinCar(carId: string, playerId: string) {
    await supabase.from('players').update({ car_id: carId }).eq('id', playerId)
  }

  async function handleAddGuest() {
    if (!guestName.trim() || !guestForPlayerId) return
    const owner = players.find((p) => p.id === guestForPlayerId)
    if (!owner) return
    const plateCode = generatePlateCode()
    const color = pickColor(players.length)

    const { data } = await supabase
      .from('players')
      .insert({
        room_id: room.id,
        car_id: owner.car_id,
        name: guestName.trim(),
        plate_code: plateCode,
        color,
        device_owner_id: guestForPlayerId,
        is_main_leader: false,
        is_car_leader: false,
        ready: false,
      })
      .select()
      .single()

    if (data) {
      // Notify parent so it updates myPlayerIds state (localStorage alone won't trigger re-render)
      onGuestAdded(data.id)
    }

    setGuestName('')
    setGuestForPlayerId(null)
    setAddingGuest(false)
  }

  async function handleStartGame() {
    setStartError('')
    const unclaimedCar = cars.find((c) => !c.car_leader_id)
    if (unclaimedCar) {
      setStartError(`"${unclaimedCar.name}" needs a driver to claim it before starting.`)
      return
    }
    if (players.length < 2) {
      setStartError('At least 2 players must join before starting.')
      return
    }
    setStarting(true)
    const nextPhase = room.mode === 'playlist' ? 'playlist_submit' : 'submit'
    await supabase.from('rooms').update({ phase: nextPhase }).eq('id', room.id)
  }

  if (isMainLeader) {
    return <HostLobby
      room={room}
      players={players}
      cars={cars}
      myPlayerIds={myPlayerIds}
      addingCar={addingCar}
      newCarName={newCarName}
      addingGuest={addingGuest}
      guestName={guestName}
      guestForPlayerId={guestForPlayerId}
      starting={starting}
      startError={startError}
      onAddCar={handleAddCar}
      onStartAddCar={() => setAddingCar(true)}
      onCancelAddCar={() => setAddingCar(false)}
      onNewCarNameChange={setNewCarName}
      onClaimCar={handleClaimCar}
      onJoinCar={handleJoinCar}
      onAddGuest={handleAddGuest}
      onStartAddGuest={() => setAddingGuest(true)}
      onCancelAddGuest={() => { setAddingGuest(false); setGuestName(''); setGuestForPlayerId(null) }}
      onGuestNameChange={setGuestName}
      onGuestForPlayerChange={setGuestForPlayerId}
      onStartGame={handleStartGame}
    />
  }

  return <GuestLobby room={room} players={players} cars={cars} myPlayerIds={myPlayerIds} />
}

// ── Host view ────────────────────────────────────────────────────────────────

type HostLobbyProps = {
  room: Room
  players: Player[]
  cars: Car[]
  myPlayerIds: string[]
  addingCar: boolean
  newCarName: string
  addingGuest: boolean
  guestName: string
  guestForPlayerId: string | null
  starting: boolean
  startError: string
  onAddCar: () => void
  onStartAddCar: () => void
  onCancelAddCar: () => void
  onNewCarNameChange: (v: string) => void
  onClaimCar: (carId: string) => void
  onJoinCar: (carId: string, playerId: string) => void
  onAddGuest: () => void
  onStartAddGuest: () => void
  onCancelAddGuest: () => void
  onGuestNameChange: (v: string) => void
  onGuestForPlayerChange: (v: string) => void
  onStartGame: () => void
}

function HostLobby({
  room, players, cars, myPlayerIds,
  addingCar, newCarName, addingGuest, guestName, guestForPlayerId,
  starting, startError,
  onAddCar, onStartAddCar, onCancelAddCar, onNewCarNameChange,
  onClaimCar, onJoinCar,
  onAddGuest, onStartAddGuest, onCancelAddGuest, onGuestNameChange, onGuestForPlayerChange,
  onStartGame,
}: HostLobbyProps) {
  const canStart = players.length >= 2 && cars.every((c) => c.car_leader_id)

  return (
    <div className="min-h-screen flex flex-col px-5 py-8">
      {/* Host header */}
      <div className="rounded-2xl p-5 mb-6" style={{ backgroundColor: '#3D4466' }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[#F4A340] text-xs font-display uppercase tracking-widest" style={{ fontFamily: 'var(--font-oswald)' }}>
            You're the host
          </span>
          <span className="text-[#F4F1EA] opacity-40 text-xs">{players.length} joined</span>
        </div>
        <h1 className="font-display text-5xl text-[#F4F1EA] tracking-widest mb-1" style={{ fontFamily: 'var(--font-oswald)' }}>
          {room.code}
        </h1>
        <p className="text-[#F4F1EA] opacity-50 text-xs">Share this code — others join at dj-who.vercel.app</p>
        {room.mode === 'playlist' && (
          <p className="text-[#4FC3A1] text-xs mt-2">
            🚗 Road Trip Playlist — each player adds up to {room.playlist_songs_per_player} song{room.playlist_songs_per_player === 1 ? '' : 's'}
          </p>
        )}
      </div>

      {/* Cars */}
      <p className="text-[#F4F1EA] opacity-40 text-xs uppercase tracking-wider mb-2">Cars</p>
      <div className="space-y-3 mb-3">
        {cars.map((car) => {
          const leader = players.find((p) => p.id === car.car_leader_id)
          const riders = players.filter((p) => p.car_id === car.id)
          const iAmLeader = myPlayerIds.includes(car.car_leader_id ?? '')

          return (
            <div key={car.id} className="rounded-xl p-4" style={{ backgroundColor: '#1A2238' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-display text-base text-[#F4F1EA]" style={{ fontFamily: 'var(--font-oswald)' }}>
                  {car.name}
                </span>
                {leader
                  ? <span className="text-[#F4A340] text-xs">🚗 {leader.name}</span>
                  : !iAmLeader && (
                    <button onClick={() => onClaimCar(car.id)} className="text-xs rounded-lg px-3 py-1.5 bg-[#F4A340] text-[#1A2238] active:opacity-70">
                      Claim as driver
                    </button>
                  )
                }
              </div>
              <div className="flex flex-wrap gap-2">
                {riders.map((r) => (
                  <PlateAvatar key={r.id} plateCode={r.plate_code} color={r.color} size="sm" name={r.name} />
                ))}
                {riders.length === 0 && <p className="text-[#F4F1EA] opacity-30 text-xs">No riders yet</p>}
              </div>
              {myPlayerIds.map((pid) => {
                const p = players.find((pl) => pl.id === pid)
                if (!p || p.car_id) return null
                return (
                  <button key={pid} onClick={() => onJoinCar(car.id, pid)}
                    className="mt-2 text-xs rounded-lg px-3 py-1.5 bg-[#3D4466] text-[#F4F1EA] active:opacity-70 mr-2">
                    {p.name}: Ride here
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Add car */}
      {addingCar ? (
        <div className="flex gap-2 mb-3">
          <input autoFocus type="text" placeholder="e.g. Mom's car" value={newCarName}
            onChange={(e) => onNewCarNameChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onAddCar()}
            className="flex-1 rounded-xl px-4 py-3 bg-[#1A2238] text-[#F4F1EA] placeholder-[#F4F1EA]/40 outline-none text-sm" />
          <button onClick={onAddCar} className="px-4 rounded-xl bg-[#F4A340] text-[#1A2238] font-display active:opacity-80" style={{ fontFamily: 'var(--font-oswald)' }}>Add</button>
          <button onClick={onCancelAddCar} className="px-3 rounded-xl bg-[#1A2238] text-[#F4F1EA] active:opacity-70">✕</button>
        </div>
      ) : (
        <button onClick={onStartAddCar}
          className="w-full py-2.5 mb-3 rounded-xl border border-dashed border-[#3D4466] text-[#F4F1EA] opacity-50 text-sm active:opacity-30">
          + Add a car
        </button>
      )}

      {/* Add phoneless friend */}
      {addingGuest ? (
        <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#1A2238' }}>
          <p className="text-[#F4F1EA] text-sm mb-3">Friend's name:</p>
          <input autoFocus type="text" placeholder="Name" value={guestName}
            onChange={(e) => onGuestNameChange(e.target.value)}
            className="w-full rounded-xl px-4 py-3 bg-[#3D4466] text-[#F4F1EA] placeholder-[#F4F1EA]/40 outline-none text-sm mb-3" />
          <p className="text-[#F4F1EA] text-sm mb-2">Sharing whose device?</p>
          <div className="space-y-2 mb-3">
            {myPlayerIds.map((pid) => {
              const p = players.find((pl) => pl.id === pid)
              if (!p) return null
              return (
                <button key={pid} onClick={() => onGuestForPlayerChange(pid)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm ${guestForPlayerId === pid ? 'bg-[#F4A340] text-[#1A2238]' : 'bg-[#3D4466] text-[#F4F1EA]'}`}>
                  {p.name}
                </button>
              )
            })}
          </div>
          <div className="flex gap-2">
            <button onClick={onAddGuest} disabled={!guestName.trim() || !guestForPlayerId}
              className="flex-1 py-2 rounded-xl bg-[#F4A340] text-[#1A2238] font-display disabled:opacity-40 active:opacity-80" style={{ fontFamily: 'var(--font-oswald)' }}>
              Add
            </button>
            <button onClick={onCancelAddGuest} className="px-3 rounded-xl bg-[#3D4466] text-[#F4F1EA] active:opacity-70">✕</button>
          </div>
        </div>
      ) : (
        <button onClick={onStartAddGuest}
          className="w-full py-2.5 mb-6 rounded-xl border border-dashed border-[#3D4466] text-[#F4F1EA] opacity-50 text-sm active:opacity-30">
          + Add a friend without a phone
        </button>
      )}

      {/* Start game */}
      <div className="mt-auto">
        {startError && <p className="text-[#E8503A] text-sm mb-3 text-center">{startError}</p>}
        {!canStart && (
          <p className="text-[#F4F1EA] opacity-40 text-xs text-center mb-3">
            {players.length < 2 ? 'Need at least 2 players to start' : 'All cars need a driver before starting'}
          </p>
        )}
        <button onClick={onStartGame} disabled={starting || !canStart}
          className="w-full py-4 rounded-2xl font-display text-xl disabled:opacity-30 active:opacity-80 transition-opacity"
          style={{
            fontFamily: 'var(--font-oswald)',
            backgroundColor: canStart ? '#F4A340' : '#3D4466',
            color: canStart ? '#1A2238' : '#F4F1EA',
          }}>
          {starting ? 'Starting…' : 'Start Game'}
        </button>
      </div>
    </div>
  )
}

// ── Guest / waiting room view ─────────────────────────────────────────────────

function GuestLobby({ room, players, cars, myPlayerIds }: {
  room: Room
  players: Player[]
  cars: Car[]
  myPlayerIds: string[]
}) {
  const myPlayers = myPlayerIds.map((id) => players.find((p) => p.id === id)).filter(Boolean) as Player[]

  return (
    <div className="min-h-screen flex flex-col items-center justify-between px-6 py-12">
      {/* Top: you're in */}
      <div className="w-full text-center">
        <p className="text-[#F4F1EA] opacity-50 text-sm mb-1">You're in the game!</p>
        <div className="font-display text-6xl text-[#F4A340] tracking-widest mb-1" style={{ fontFamily: 'var(--font-oswald)' }}>
          {room.code}
        </div>
        <p className="text-[#F4F1EA] opacity-30 text-xs">Room code</p>
      </div>

      {/* Middle: your plate(s) */}
      <div className="flex flex-col items-center gap-4">
        <p className="text-[#F4F1EA] opacity-40 text-xs uppercase tracking-wider">Your plate{myPlayers.length > 1 ? 's' : ''}</p>
        <div className="flex gap-4 flex-wrap justify-center">
          {myPlayers.map((p) => (
            <PlateAvatar key={p.id} plateCode={p.plate_code} color={p.color} size="lg" name={p.name} />
          ))}
        </div>
      </div>

      {/* Bottom: who else is here */}
      <div className="w-full">
        <p className="text-[#F4F1EA] opacity-40 text-xs uppercase tracking-wider text-center mb-4">
          {players.length} player{players.length !== 1 ? 's' : ''} joined
        </p>
        <div className="flex flex-wrap gap-3 justify-center mb-6">
          {players.map((p) => (
            <PlateAvatar key={p.id} plateCode={p.plate_code} color={p.color} size="sm" name={p.name} />
          ))}
        </div>
        <div className="text-center py-4 rounded-2xl" style={{ backgroundColor: '#3D4466' }}>
          <p className="text-[#F4F1EA] opacity-60 text-sm">Waiting for the host to start…</p>
        </div>
      </div>
    </div>
  )
}
