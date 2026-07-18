'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase, Room, Song, Player, PlaylistQueueItem } from '@/lib/supabase'
import PlateAvatar from './PlateAvatar'
import PlaylistQueueList from './PlaylistQueue'
import HostPlaybackControls from './HostPlaybackControls'

declare global {
  interface Window {
    YT?: any
    onYouTubeIframeAPIReady?: () => void
  }
}

type Props = {
  room: Room
  queue: PlaylistQueueItem[]
  songs: Song[]
  players: Player[]
  myPlayerIds: string[]
}

let apiLoadStarted = false

export default function PlaylistPlayer({ room, queue, songs, players, myPlayerIds }: Props) {
  const isHost = myPlayerIds.includes(room.main_leader_id)

  const sortedQueue = [...queue].sort((a, b) => a.position - b.position)
  const currentItem = sortedQueue.find((q) => !q.played) ?? null
  const currentIndex = currentItem ? sortedQueue.findIndex((q) => q.id === currentItem.id) : -1
  const currentSong = currentItem ? songs.find((s) => s.id === currentItem.song_id) ?? null : null
  const contributor = currentSong ? players.find((p) => p.id === currentSong.player_id) ?? null : null

  const playerElRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const loadedSongIdRef = useRef<string | null>(null)
  const [apiReady, setApiReady] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)
  const [isPaused, setIsPaused] = useState(true)
  const [muted, setMuted] = useState(true)
  const [rebuilding, setRebuilding] = useState(false)

  // Load the YouTube IFrame API once
  useEffect(() => {
    if (window.YT?.Player) { setApiReady(true); return }
    if (!apiLoadStarted) {
      apiLoadStarted = true
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.body.appendChild(tag)
    }
    const prevCallback = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prevCallback?.()
      setApiReady(true)
    }
  }, [])

  // Create the player once the API is ready and we have a video to show.
  // Every device gets its own real player instance so everyone sees the
  // video playing live; only the host's onStateChange drives advancing.
  useEffect(() => {
    if (!apiReady || !playerElRef.current || playerRef.current || !currentSong) return
    loadedSongIdRef.current = currentSong.id
    playerRef.current = new window.YT!.Player(playerElRef.current, {
      videoId: currentSong.youtube_id,
      playerVars: { autoplay: 1, mute: 1, rel: 0, playsinline: 1 },
      events: {
        onReady: () => setPlayerReady(true),
        onStateChange: (e: any) => {
          const YT = window.YT
          if (!YT) return
          if (e.data === YT.PlayerState.PLAYING) setIsPaused(false)
          if (e.data === YT.PlayerState.PAUSED) setIsPaused(true)
          if (isHost && e.data === YT.PlayerState.ENDED) handleAdvance()
        },
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiReady, currentSong?.id])

  // When the current song changes (skip / auto-advance), load the new
  // video into the existing player rather than recreating it.
  useEffect(() => {
    if (!playerRef.current || !playerReady || !currentSong) return
    if (loadedSongIdRef.current === currentSong.id) return
    loadedSongIdRef.current = currentSong.id
    playerRef.current.loadVideoById(currentSong.youtube_id)
  }, [currentSong?.id, playerReady])

  async function handleAdvance() {
    if (!currentItem) return
    await supabase.from('playlist_queue').update({ played: true }).eq('id', currentItem.id)
    const stillUnplayed = queue.filter((q) => !q.played && q.id !== currentItem.id)
    if (stillUnplayed.length === 0) {
      await supabase.from('rooms').update({ phase: 'playlist_done' }).eq('id', room.id)
    }
  }

  function handleTogglePause() {
    if (!playerRef.current) return
    if (isPaused) playerRef.current.playVideo()
    else playerRef.current.pauseVideo()
  }

  function handleToggleMute() {
    if (!playerRef.current) return
    if (muted) { playerRef.current.unMute(); playerRef.current.playVideo() }
    else playerRef.current.mute()
    setMuted((m) => !m)
  }

  async function handleChangeOrder(newOrder: 'shuffle' | 'by_player') {
    setRebuilding(true)
    await supabase.from('rooms').update({ playlist_order: newOrder }).eq('id', room.id)

    const unplayed = sortedQueue.filter((q) => !q.played)
    if (unplayed.length > 0) {
      const items = unplayed.map((q) => ({ queueId: q.id, song: songs.find((s) => s.id === q.song_id)! })).filter((i) => i.song)

      let orderedQueueIds: string[]
      if (newOrder === 'by_player') {
        const byPlayer: Record<string, typeof items> = {}
        for (const item of items) (byPlayer[item.song.player_id] ??= []).push(item)
        for (const pid in byPlayer) byPlayer[pid].sort((a, b) => a.song.created_at.localeCompare(b.song.created_at))
        const playerIds = Object.keys(byPlayer)
        for (let i = playerIds.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [playerIds[i], playerIds[j]] = [playerIds[j], playerIds[i]]
        }
        orderedQueueIds = playerIds.flatMap((pid) => byPlayer[pid]).map((i) => i.queueId)
      } else {
        const shuffled = [...items]
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        orderedQueueIds = shuffled.map((i) => i.queueId)
      }

      const maxPos = Math.max(0, ...queue.map((q) => q.position))
      for (let i = 0; i < orderedQueueIds.length; i++) {
        await supabase.from('playlist_queue').update({ position: maxPos + 1 + i }).eq('id', orderedQueueIds[i])
      }
    }
    setRebuilding(false)
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-8">
      <div className="text-center mb-4">
        <p className="text-[#F4A340] text-sm font-display mb-1" style={{ fontFamily: 'var(--font-oswald)' }}>
          Now Playing
        </p>
        <h2 className="font-display text-2xl text-[#F4F1EA]" style={{ fontFamily: 'var(--font-oswald)' }}>
          Song {currentIndex + 1} of {sortedQueue.length}
        </h2>
        {currentSong && (
          <p className="text-[#F4F1EA] opacity-70 text-sm mt-1 truncate">{currentSong.title}</p>
        )}
        {contributor && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <PlateAvatar name={contributor.name} color={contributor.color} size="sm" />
            <span className="text-[#F4F1EA] opacity-60 text-xs">added by {contributor.name}</span>
          </div>
        )}
      </div>

      {currentSong ? (
        <div className="w-full rounded-2xl overflow-hidden bg-[#3D4466] aspect-video mb-2 relative">
          <div ref={playerElRef} className="w-full h-full" />
        </div>
      ) : (
        <div className="w-full rounded-2xl bg-[#3D4466] aspect-video mb-2 flex items-center justify-center">
          <p className="text-[#F4F1EA] opacity-50">Loading…</p>
        </div>
      )}

      <button
        onClick={handleToggleMute}
        className="self-center mb-6 text-xs text-[#F4F1EA] opacity-60 underline active:opacity-100"
      >
        {muted ? '🔇 Muted — tap to unmute this device' : '🔊 Unmuted — tap to mute this device'}
      </button>

      {isHost && (
        <div className="mb-6">
          <HostPlaybackControls
            isPaused={isPaused}
            onTogglePause={handleTogglePause}
            onSkip={handleAdvance}
            order={room.playlist_order}
            onChangeOrder={handleChangeOrder}
            rebuilding={rebuilding}
          />
        </div>
      )}
      {!isHost && (
        <p className="text-[#F4F1EA] opacity-50 text-sm text-center mb-6">The host controls playback</p>
      )}

      <p className="text-[#F4F1EA] opacity-40 text-xs uppercase tracking-wider mb-2">Up Next</p>
      <PlaylistQueueList
        queue={queue}
        songs={songs}
        players={players}
        currentItemId={currentItem?.id ?? null}
      />

      <p className="text-[#F4F1EA] opacity-40 text-xs uppercase tracking-wider mt-6 mb-3 text-center">
        Listening now
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        {players.map((p) => (
          <PlateAvatar key={p.id} color={p.color} size="sm" name={p.name} />
        ))}
      </div>
    </div>
  )
}
