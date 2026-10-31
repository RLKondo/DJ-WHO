'use client'

import { useState } from 'react'
import { supabase, Player, Room, Song } from '@/lib/supabase'
import { VideoInfo } from '@/lib/youtube'
import TurnQueue from './TurnQueue'
import YouTubePicker from './YouTubePicker'
import PlateAvatar from './PlateAvatar'

type Props = {
  room: Room
  allPlayers: Player[]
  allSongs: Song[]
  myPlayerIds: string[]
}

export default function PlaylistSubmitPhase({ room, allPlayers, allSongs, myPlayerIds }: Props) {
  const [doneIds, setDoneIds] = useState<string[]>([])
  const [allLocalDone, setAllLocalDone] = useState(false)
  const [building, setBuilding] = useState(false)

  const myPlayers = myPlayerIds
    .map((id) => allPlayers.find((p) => p.id === id))
    .filter(Boolean) as Player[]

  const readyCount = allPlayers.filter((p) => p.ready).length
  const totalCount = allPlayers.length
  const approvedSongs = allSongs.filter((s) => s.approved !== false)
  const pendingSongs = allSongs.filter((s) => s.approved === false)
  const totalSongs = approvedSongs.length
  const isSolo = room.playlist_solo
  const isMainLeader = myPlayers.some((p) => p.is_main_leader)
  const limit = room.playlist_songs_per_player
  const everyoneReady = isSolo ? allLocalDone : totalCount > 0 && readyCount === totalCount
  const canBuild = everyoneReady && pendingSongs.length === 0 && totalSongs > 0

  async function handlePlayerFinished(playerId: string) {
    await supabase.from('players').update({ ready: true }).eq('id', playerId)
    setDoneIds((prev) => [...prev, playerId])
  }

  async function approveSong(id: string) {
    await supabase.from('songs').update({ approved: true }).eq('id', id)
  }
  async function rejectSong(id: string) {
    await supabase.from('songs').delete().eq('id', id)
  }
  async function approveAll() {
    await supabase.from('songs').update({ approved: true }).eq('room_id', room.id).eq('approved', false)
  }

  async function handleBuildPlaylist() {
    setBuilding(true)
    const { data: songs } = await supabase.from('songs').select('*').eq('room_id', room.id).neq('approved', false)
    if (!songs || songs.length === 0) { setBuilding(false); return }

    let ordered: Song[]
    if (room.playlist_order === 'by_player') {
      // Group each player's songs together, then randomize the player order
      const byPlayer: Record<string, Song[]> = {}
      for (const s of songs) {
        (byPlayer[s.player_id] ??= []).push(s)
      }
      for (const pid in byPlayer) {
        byPlayer[pid].sort((a, b) => a.created_at.localeCompare(b.created_at))
      }
      const playerIds = Object.keys(byPlayer)
      for (let i = playerIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playerIds[i], playerIds[j]] = [playerIds[j], playerIds[i]]
      }
      ordered = playerIds.flatMap((pid) => byPlayer[pid])
    } else {
      ordered = [...songs]
      for (let i = ordered.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ordered[i], ordered[j]] = [ordered[j], ordered[i]]
      }
    }

    const rows = ordered.map((s, i) => ({ room_id: room.id, song_id: s.id, position: i, played: false }))
    await supabase.from('playlist_queue').insert(rows)
    await supabase.from('rooms').update({ phase: 'playlist_playing' }).eq('id', room.id)
  }

  if (allLocalDone) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="text-5xl mb-4">🎵</div>
        <h2 className="font-display text-2xl text-[#F4A340] mb-2" style={{ fontFamily: 'var(--font-oswald)' }}>
          Songs locked in!
        </h2>
        <p className="text-[#F4F1EA] opacity-70 mb-8">
          {totalSongs} song{totalSongs === 1 ? '' : 's'} added so far
        </p>
        {!isSolo && (
          <>
            <div className="text-4xl font-display text-[#F4F1EA]" style={{ fontFamily: 'var(--font-oswald)' }}>
              {readyCount} / {totalCount}
            </div>
            <p className="text-[#F4F1EA] opacity-50 text-sm mt-1 mb-8">players ready</p>
          </>
        )}

        {room.playlist_clean && pendingSongs.length > 0 && (
          isMainLeader ? (
            <div className="w-full max-w-sm text-left mb-6">
              <p className="text-[#F4A340] text-xs font-display uppercase tracking-widest mb-2" style={{ fontFamily: 'var(--font-oswald)' }}>
                Approve songs ({pendingSongs.length})
              </p>
              <div className="space-y-2">
                {pendingSongs.map((s) => {
                  const who = allPlayers.find((p) => p.id === s.player_id)
                  return (
                    <div key={s.id} className="rounded-xl p-3 bg-[#3D4466]">
                      <p className="text-[#F4F1EA] text-sm leading-snug">{s.title}</p>
                      <p className="text-[#F4F1EA] opacity-50 text-xs mb-2">{who?.name ?? 'Unknown'}</p>
                      <div className="flex gap-2">
                        <button onClick={() => rejectSong(s.id)}
                          className="flex-1 py-2 rounded-lg bg-[#1A2238] text-[#E8503A] text-sm active:opacity-70">
                          Reject
                        </button>
                        <button onClick={() => approveSong(s.id)}
                          className="flex-1 py-2 rounded-lg bg-[#4FC3A1] text-[#1A2238] text-sm font-medium active:opacity-80">
                          Approve
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button onClick={approveAll} className="w-full mt-3 py-2 text-[#F4F1EA] opacity-60 text-sm underline">
                Approve all
              </button>
            </div>
          ) : (
            <p className="text-[#F4F1EA] opacity-50 text-xs mb-6">
              The host is reviewing {pendingSongs.length} song{pendingSongs.length === 1 ? '' : 's'}…
            </p>
          )
        )}

        {isMainLeader && canBuild && (
          <button
            onClick={handleBuildPlaylist}
            disabled={building}
            className="w-full max-w-xs py-4 rounded-2xl bg-[#F4A340] text-[#1A2238] font-display text-xl disabled:opacity-50 active:opacity-80"
            style={{ fontFamily: 'var(--font-oswald)' }}
          >
            {building ? 'Building…' : 'Build Playlist →'}
          </button>
        )}
        {isMainLeader && !canBuild && (
          <p className="text-[#F4F1EA] opacity-40 text-xs">
            {!everyoneReady
              ? 'Waiting for everyone before you can build the playlist…'
              : pendingSongs.length > 0
                ? 'Approve or reject the songs above to continue.'
                : 'Add at least one song to build the playlist.'}
          </p>
        )}
      </div>
    )
  }

  return (
    <TurnQueue
      players={myPlayers}
      completedIds={doneIds}
      onAllDone={() => setAllLocalDone(true)}
    >
      {(currentPlayer, onDone) => (
        <PlaylistSubmitTurn
          player={currentPlayer}
          limit={limit}
          clean={room.playlist_clean}
          theme={room.playlist_theme}
          solo={isSolo}
          initialCount={allSongs.filter((s) => s.player_id === currentPlayer.id).length}
          onSubmitOne={async (info: VideoInfo) => {
            await supabase.from('songs').insert({
              room_id: room.id,
              player_id: currentPlayer.id,
              youtube_id: info.youtubeId,
              title: info.title,
              approved: !room.playlist_clean || room.playlist_solo,
              thumbnail_url: info.thumbnailUrl,
            })
          }}
          onFinished={() => handlePlayerFinished(currentPlayer.id).then(onDone)}
        />
      )}
    </TurnQueue>
  )
}

function PlaylistSubmitTurn({
  player,
  limit,
  clean,
  theme,
  solo,
  initialCount,
  onSubmitOne,
  onFinished,
}: {
  player: Player
  limit: number
  clean: boolean
  theme: string | null
  solo: boolean
  initialCount: number
  onSubmitOne: (info: VideoInfo) => Promise<void>
  onFinished: () => void
}) {
  const [count, setCount] = useState(initialCount)
  const [picking, setPicking] = useState(initialCount === 0)
  const [submitting, setSubmitting] = useState(false)

  async function handleSelect(info: VideoInfo) {
    setSubmitting(true)
    await onSubmitOne(info)
    setSubmitting(false)
    setCount((c) => c + 1)
    setPicking(false)
  }

  const atLimit = count >= limit

  return (
    <div className="min-h-screen flex flex-col px-6 py-10">
      <div className="flex flex-col items-center mb-6">
        <PlateAvatar name={player.name} color={player.color} size="lg" />
        <h2 className="mt-4 font-display text-2xl text-[#F4F1EA]" style={{ fontFamily: 'var(--font-oswald)' }}>
          {player.name}
        </h2>
        {theme && <p className="text-[#4FC3A1] text-sm mt-1 text-center">Theme: {theme}</p>}
        <p className="text-[#F4A340] text-sm mt-1">{solo ? 'Add as many songs as you like' : `Add up to ${limit} song${limit === 1 ? '' : 's'}`}</p>
        {clean && <p className="text-[#F4F1EA] opacity-50 text-xs mt-1">Clean playlist{solo ? '' : ' — host approves each song'}</p>}
        <p className="text-[#F4F1EA] text-xs opacity-60 mt-1">{solo ? `${count} song${count === 1 ? '' : 's'} added` : `${count} / ${limit} songs added`}</p>
      </div>

      {submitting ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#F4F1EA] opacity-70">Adding…</p>
        </div>
      ) : picking ? (
        <YouTubePicker onSelect={handleSelect} clean={clean} />
      ) : atLimit ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
          <p className="text-[#4FC3A1] text-lg">✅ You've added all your songs!</p>
          <button
            onClick={onFinished}
            className="w-full py-4 rounded-2xl bg-[#F4A340] text-[#1A2238] font-display text-xl active:opacity-80"
            style={{ fontFamily: 'var(--font-oswald)' }}
          >
            Continue →
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-[#4FC3A1] text-lg">✅ Song added!</p>
          <button
            onClick={() => setPicking(true)}
            className="w-full py-4 rounded-2xl bg-[#F4A340] text-[#1A2238] font-display text-xl active:opacity-80"
            style={{ fontFamily: 'var(--font-oswald)' }}
          >
            + Add another song
          </button>
          <button
            onClick={onFinished}
            className="w-full py-3 rounded-2xl bg-[#3D4466] text-[#F4F1EA] text-base active:opacity-70"
          >
            Done adding songs
          </button>
        </div>
      )}
    </div>
  )
}
