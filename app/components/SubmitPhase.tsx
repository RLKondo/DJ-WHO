'use client'

import { useState } from 'react'
import { supabase, Player, Room } from '@/lib/supabase'
import { VideoInfo } from '@/lib/youtube'
import TurnQueue from './TurnQueue'
import YouTubePicker from './YouTubePicker'
import PlateAvatar from './PlateAvatar'

type Props = {
  room: Room
  allPlayers: Player[]
  myPlayerIds: string[]
}

export default function SubmitPhase({ room, allPlayers, myPlayerIds }: Props) {
  const [submittedIds, setSubmittedIds] = useState<string[]>([])
  const [allLocalDone, setAllLocalDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const myPlayers = myPlayerIds
    .map((id) => allPlayers.find((p) => p.id === id))
    .filter(Boolean) as Player[]

  const readyCount = allPlayers.filter((p) => p.ready).length
  const totalCount = allPlayers.length

  async function handleSongSelected(player: Player, info: VideoInfo, onDone: () => void) {
    setSubmitting(true)
    await supabase.from('songs').insert({
      room_id: room.id,
      player_id: player.id,
      youtube_id: info.youtubeId,
      title: info.title,
      thumbnail_url: info.thumbnailUrl,
    })
    setSubmittedIds((prev) => [...prev, player.id])
    setSubmitting(false)
    onDone()
  }

  async function handleAllLocalDone() {
    setAllLocalDone(true)
    // Mark all local players as ready
    await supabase
      .from('players')
      .update({ ready: true })
      .in('id', myPlayerIds)

    // Check if everyone in the room is now ready — if so, trigger transition
    const { data: freshPlayers } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', room.id)

    if (freshPlayers && freshPlayers.every((p: Player) => p.ready)) {
      await triggerPlayPhase(room.id)
    }
  }

  if (allLocalDone) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="text-5xl mb-4">🎵</div>
        <h2 className="font-display text-2xl text-[#F4A340] mb-2" style={{ fontFamily: 'var(--font-oswald)' }}>
          Songs locked in!
        </h2>
        <p className="text-[#F4F1EA] opacity-70 mb-8">Waiting for everyone to submit…</p>
        <div className="text-4xl font-display text-[#F4F1EA]" style={{ fontFamily: 'var(--font-oswald)' }}>
          {readyCount} / {totalCount}
        </div>
        <p className="text-[#F4F1EA] opacity-50 text-sm mt-1">players ready</p>
      </div>
    )
  }

  return (
    <TurnQueue
      players={myPlayers}
      completedIds={submittedIds}
      onAllDone={handleAllLocalDone}
    >
      {(currentPlayer, onDone) => (
        <SubmitTurn
          player={currentPlayer}
          onSubmit={(info) => handleSongSelected(currentPlayer, info, onDone)}
          submitting={submitting}
        />
      )}
    </TurnQueue>
  )
}

function SubmitTurn({
  player,
  onSubmit,
  submitting,
}: {
  player: Player
  onSubmit: (info: VideoInfo) => void
  submitting: boolean
}) {
  return (
    <div className="min-h-screen flex flex-col px-6 py-10">
      <div className="flex flex-col items-center mb-8">
        <PlateAvatar name={player.name} color={player.color} size="lg" />
        <h2 className="mt-4 font-display text-2xl text-[#F4F1EA]" style={{ fontFamily: 'var(--font-oswald)' }}>
          {player.name}
        </h2>
        <p className="text-[#F4A340] text-sm mt-1">Pick your secret song</p>
        <p className="text-[#F4F1EA] text-xs opacity-50 mt-1">Others, look away!</p>
      </div>

      {submitting ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#F4F1EA] opacity-70">Submitting…</p>
        </div>
      ) : (
        <YouTubePicker onSelect={onSubmit} />
      )}
    </div>
  )
}

async function triggerPlayPhase(roomId: string) {
  // Fetch all songs for this room to build the shared pool
  const { data: songs } = await supabase
    .from('songs')
    .select('id')
    .eq('room_id', roomId)

  if (!songs) return

  // Shuffle song ids
  const ids = songs.map((s: { id: string }) => s.id)
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]]
  }

  // Write song_order to every car and set phase = 'play'
  const { data: cars } = await supabase
    .from('cars')
    .select('id')
    .eq('room_id', roomId)

  if (!cars) return

  for (const car of cars) {
    await supabase
      .from('cars')
      .update({ song_order: ids, phase: 'play', current_song_index: 0 })
      .eq('id', car.id)
  }

  // Reset all players' ready flag and advance room phase
  await supabase.from('players').update({ ready: false }).eq('room_id', roomId)
  await supabase.from('rooms').update({ phase: 'cars_playing' }).eq('id', roomId)
}
