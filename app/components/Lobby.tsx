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
}

export default function Lobby({ room, players, cars, myPlayerIds, isMainLeader }: Props) {
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
    await supabase.from('cars').insert({
      room_id: room.id,
      name: newCarName.trim(),
    })
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
      // Add to localStorage
      const storageKey = `djwho:${room.code}:myPlayerIds`
      const existing = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
      localStorage.setItem(storageKey, JSON.stringify([...existing, data.id]))
    }

    setGuestName('')
    setGuestForPlayerId(null)
    setAddingGuest(false)
  }

  async function handleStartGame() {
    setStartError('')
    // Validate: every car must have a claimed leader
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
    await supabase.from('rooms').update({ phase: 'submit' }).eq('id', room.id)
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-display text-4xl text-[#F4A340]" style={{ fontFamily: 'var(--font-oswald)' }}>
          DJ Who?
        </h1>
        <div
          className="mt-3 inline-block font-display text-5xl tracking-widest text-[#F4F1EA] rounded-2xl px-6 py-3"
          style={{ backgroundColor: '#3D4466', fontFamily: 'var(--font-oswald)' }}
        >
          {room.code}
        </div>
        <p className="text-[#F4F1EA] opacity-50 text-xs mt-2">Share this code to invite others</p>
      </div>

      {/* Cars */}
      <div className="space-y-4 mb-6">
        {cars.map((car) => {
          const leader = players.find((p) => p.id === car.car_leader_id)
          const riders = players.filter((p) => p.car_id === car.id)
          const isMyCar = myPlayerIds.some((id) => riders.find((r) => r.id === id))
          const iAmLeader = myPlayerIds.includes(car.car_leader_id ?? '')

          return (
            <div key={car.id} className="rounded-2xl p-4" style={{ backgroundColor: '#3D4466' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-display text-lg text-[#F4F1EA]" style={{ fontFamily: 'var(--font-oswald)' }}>
                  {car.name}
                </span>
                {leader ? (
                  <span className="text-[#F4A340] text-xs">
                    🚗 {leader.name}
                  </span>
                ) : (
                  !iAmLeader && (
                    <button
                      onClick={() => handleClaimCar(car.id)}
                      className="text-xs rounded-lg px-3 py-1.5 bg-[#F4A340] text-[#1A2238] active:opacity-70"
                    >
                      Claim as driver
                    </button>
                  )
                )}
              </div>

              {/* Riders */}
              <div className="flex flex-wrap gap-2 mb-3">
                {riders.map((r) => (
                  <PlateAvatar key={r.id} plateCode={r.plate_code} color={r.color} size="sm" name={r.name} />
                ))}
              </div>

              {/* Join car button for local players not yet in this car */}
              {myPlayerIds.map((pid) => {
                const p = players.find((pl) => pl.id === pid)
                if (!p || p.car_id) return null
                return (
                  <button
                    key={pid}
                    onClick={() => handleJoinCar(car.id, pid)}
                    className="text-xs rounded-lg px-3 py-1.5 bg-[#1A2238] text-[#F4F1EA] active:opacity-70 mr-2"
                  >
                    {p.name}: Ride in this car
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Add car */}
      {addingCar ? (
        <div className="flex gap-2 mb-4">
          <input
            autoFocus
            type="text"
            placeholder="e.g. Mom's car"
            value={newCarName}
            onChange={(e) => setNewCarName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCar()}
            className="flex-1 rounded-xl px-4 py-3 bg-[#3D4466] text-[#F4F1EA] placeholder-[#F4F1EA]/40 outline-none text-sm"
          />
          <button onClick={handleAddCar} className="px-4 rounded-xl bg-[#F4A340] text-[#1A2238] font-display active:opacity-80" style={{ fontFamily: 'var(--font-oswald)' }}>
            Add
          </button>
          <button onClick={() => setAddingCar(false)} className="px-3 rounded-xl bg-[#3D4466] text-[#F4F1EA] active:opacity-70">
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAddingCar(true)}
          className="w-full py-3 mb-4 rounded-xl border border-dashed border-[#3D4466] text-[#F4F1EA] opacity-60 text-sm active:opacity-40"
        >
          + Add a car
        </button>
      )}

      {/* Add friend without phone */}
      {addingGuest ? (
        <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: '#3D4466' }}>
          <p className="text-[#F4F1EA] text-sm mb-3">Friend's name:</p>
          <input
            autoFocus
            type="text"
            placeholder="Name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="w-full rounded-xl px-4 py-3 bg-[#1A2238] text-[#F4F1EA] placeholder-[#F4F1EA]/40 outline-none text-sm mb-3"
          />
          <p className="text-[#F4F1EA] text-sm mb-2">Whose device?</p>
          <div className="space-y-2 mb-3">
            {myPlayerIds.map((pid) => {
              const p = players.find((pl) => pl.id === pid)
              if (!p) return null
              return (
                <button
                  key={pid}
                  onClick={() => setGuestForPlayerId(pid)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm ${guestForPlayerId === pid ? 'bg-[#F4A340] text-[#1A2238]' : 'bg-[#1A2238] text-[#F4F1EA]'}`}
                >
                  {p.name}
                </button>
              )
            })}
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddGuest} disabled={!guestName.trim() || !guestForPlayerId} className="flex-1 py-2 rounded-xl bg-[#F4A340] text-[#1A2238] font-display disabled:opacity-40 active:opacity-80" style={{ fontFamily: 'var(--font-oswald)' }}>
              Add
            </button>
            <button onClick={() => setAddingGuest(false)} className="px-3 rounded-xl bg-[#1A2238] text-[#F4F1EA] active:opacity-70">
              ✕
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingGuest(true)}
          className="w-full py-3 mb-6 rounded-xl border border-dashed border-[#3D4466] text-[#F4F1EA] opacity-60 text-sm active:opacity-40"
        >
          + Add a friend without a phone
        </button>
      )}

      {/* Players list */}
      <div className="mb-6">
        <p className="text-[#F4F1EA] opacity-50 text-xs mb-3">{players.length} player{players.length !== 1 ? 's' : ''} joined</p>
        <div className="flex flex-wrap gap-3">
          {players.map((p) => (
            <PlateAvatar key={p.id} plateCode={p.plate_code} color={p.color} size="sm" name={p.name} />
          ))}
        </div>
      </div>

      {/* Start game (main leader only) */}
      {isMainLeader && (
        <div className="mt-auto">
          {startError && <p className="text-[#E8503A] text-sm mb-3 text-center">{startError}</p>}
          <button
            onClick={handleStartGame}
            disabled={starting}
            className="w-full py-4 rounded-2xl bg-[#F4A340] text-[#1A2238] font-display text-xl disabled:opacity-40 active:opacity-80"
            style={{ fontFamily: 'var(--font-oswald)' }}
          >
            {starting ? 'Starting…' : 'Start Game'}
          </button>
        </div>
      )}

      {!isMainLeader && (
        <p className="text-center text-[#F4F1EA] opacity-40 text-sm mt-auto">
          Waiting for the host to start the game…
        </p>
      )}
    </div>
  )
}
