'use client'

import { useState } from 'react'
import { supabase, Car, Player, Song, Room } from '@/lib/supabase'
import TurnQueue from './TurnQueue'
import PlateAvatar from './PlateAvatar'
import CarStatusList from './CarStatusList'

type Props = {
  room: Room
  car: Car
  songs: Song[]         // player_id intentionally NOT shown in UI
  allPlayers: Player[]
  myPlayerIds: string[]
  allCars: Car[]
}

type GuessMap = Record<string, string> // songId → guessed_player_id

export default function GuessPhase({ room, car, songs, allPlayers, myPlayerIds, allCars }: Props) {
  // Track completed guesses: { [playerId]: Set<songId> }
  const [completedGuesses, setCompletedGuesses] = useState<Record<string, string[]>>({})
  const [allLocalDone, setAllLocalDone] = useState(false)

  const myPlayers = myPlayerIds
    .map((id) => allPlayers.find((p) => p.id === id))
    .filter(Boolean) as Player[]

  // A player is "done" for TurnQueue purposes once they've guessed all songs
  const completedPlayerIds = myPlayers
    .filter((p) => (completedGuesses[p.id]?.length ?? 0) >= songs.length)
    .map((p) => p.id)

  async function handlePlayerDone(player: Player, guesses: GuessMap) {
    // Insert all guesses for this player
    const rows = Object.entries(guesses).map(([song_id, guessed_player_id]) => ({
      room_id: room.id,
      guesser_id: player.id,
      song_id,
      guessed_player_id,
    }))
    await supabase.from('guesses').insert(rows)
    setCompletedGuesses((prev) => ({
      ...prev,
      [player.id]: Object.keys(guesses),
    }))
  }

  async function handleAllLocalDone() {
    setAllLocalDone(true)

    // Fetch BEFORE writing so we see the true current state (avoids read-after-write timing issues)
    const { data: carPlayers } = await supabase
      .from('players')
      .select('id, ready')
      .eq('car_id', car.id)

    await supabase.from('players').update({ ready: true }).in('id', myPlayerIds)

    // After our update, will everyone in this car be ready?
    const otherAlreadyReady = (carPlayers ?? []).filter(
      (p: { id: string; ready: boolean }) => p.ready && !myPlayerIds.includes(p.id)
    ).length
    const total = (carPlayers ?? []).length

    if (otherAlreadyReady + myPlayerIds.length >= total) {
      await supabase.from('cars').update({ phase: 'done' }).eq('id', car.id)
    }
  }

  if (allLocalDone) {
    return (
      <div className="min-h-screen flex flex-col px-6 py-10">
        <h2 className="font-display text-2xl text-[#F4A340] text-center mb-2" style={{ fontFamily: 'var(--font-oswald)' }}>
          Guesses locked in!
        </h2>
        <p className="text-[#F4F1EA] opacity-60 text-center text-sm mb-8">
          Waiting for other cars to finish…
        </p>
        <CarStatusList cars={allCars} players={allPlayers} />
      </div>
    )
  }

  return (
    <TurnQueue
      players={myPlayers}
      completedIds={completedPlayerIds}
      onAllDone={handleAllLocalDone}
    >
      {(currentPlayer, onDone) => (
        <GuessTurn
          player={currentPlayer}
          songs={songs}
          allPlayers={allPlayers}
          onSubmit={(guesses) => {
            handlePlayerDone(currentPlayer, guesses).then(onDone)
          }}
        />
      )}
    </TurnQueue>
  )
}

function GuessTurn({
  player,
  songs,
  allPlayers,
  onSubmit,
}: {
  player: Player
  songs: Song[]
  allPlayers: Player[]
  onSubmit: (guesses: GuessMap) => void
}) {
  const [songIndex, setSongIndex] = useState(0)
  const [guesses, setGuesses] = useState<GuessMap>({})
  const [submitting, setSubmitting] = useState(false)

  const currentSong = songs[songIndex]
  // All players EXCEPT the current guesser (you can't guess your own song)
  const options = allPlayers.filter((p) => p.id !== player.id)

  function handleGuess(guessedPlayerId: string) {
    const updated = { ...guesses, [currentSong.id]: guessedPlayerId }
    setGuesses(updated)

    if (songIndex + 1 < songs.length) {
      setSongIndex((i) => i + 1)
    } else {
      setSubmitting(true)
      onSubmit(updated)
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-10">
      <div className="flex items-center gap-3 mb-6">
        <PlateAvatar plateCode={player.plate_code} color={player.color} size="sm" />
        <div>
          <p className="text-[#F4A340] text-xs font-display" style={{ fontFamily: 'var(--font-oswald)' }}>
            {player.name} — who submitted this?
          </p>
          <p className="text-[#F4F1EA] opacity-60 text-xs">
            Song {songIndex + 1} of {songs.length}
          </p>
        </div>
      </div>

      {/* Song embed — can replay to help guess */}
      <div className="w-full rounded-2xl overflow-hidden bg-[#3D4466] aspect-video mb-6">
        <iframe
          src={`https://www.youtube.com/embed/${currentSong.youtube_id}?autoplay=0&rel=0`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={currentSong.title}
        />
      </div>

      {submitting ? (
        <p className="text-center text-[#F4F1EA] opacity-60">Saving…</p>
      ) : (
        <div className="space-y-3">
          <p className="text-[#F4F1EA] text-sm opacity-70 text-center mb-4">Who picked this song?</p>
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => handleGuess(option.id)}
              className="w-full flex items-center gap-4 rounded-xl px-4 py-3 bg-[#3D4466] active:bg-[#F4A340] active:text-[#1A2238] transition-colors"
            >
              <PlateAvatar plateCode={option.plate_code} color={option.color} size="sm" />
              <span className="text-[#F4F1EA] text-base">{option.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
