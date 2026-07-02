'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase, Playlist, PlaylistMember, PlaylistSong } from '@/lib/supabase'
import PlateAvatar from '../PlateAvatar'

declare global {
  interface Window {
    YT: {
      Player: new (el: HTMLElement, opts: object) => YTPlayer
      PlayerState: { ENDED: number; PLAYING: number; PAUSED: number }
    }
    onYouTubeIframeAPIReady: () => void
  }
}
type YTPlayer = { destroy: () => void; playVideo: () => void; pauseVideo: () => void }

type Props = {
  playlist: Playlist
  members: PlaylistMember[]
  songs: PlaylistSong[]
  myMemberId: string
}

export default function PlaylistPlayer({ playlist, members, songs, myMemberId }: Props) {
  const isHost = playlist.host_id === myMemberId
  const playerRef = useRef<YTPlayer | null>(null)
  const playerDivRef = useRef<HTMLDivElement>(null)
  const [ytReady, setYtReady] = useState(false)

  const currentSongId = playlist.play_order[playlist.current_index]
  const currentSong = songs.find((s) => s.id === currentSongId)
  const currentMember = currentSong ? members.find((m) => m.id === currentSong.member_id) : null
  const isPlaying = playlist.phase === 'playing'
  const isDone = playlist.phase === 'done'

  async function goToIndex(index: number) {
    if (index >= playlist.play_order.length) {
      await supabase.from('playlists').update({ phase: 'done' }).eq('id', playlist.id)
    } else {
      await supabase.from('playlists').update({ current_index: index, phase: 'playing' }).eq('id', playlist.id)
    }
  }

  async function handlePause() {
    await supabase.from('playlists').update({ phase: 'paused' }).eq('id', playlist.id)
  }

  async function handleResume() {
    await supabase.from('playlists').update({ phase: 'playing' }).eq('id', playlist.id)
  }

  // Load YouTube IFrame API once
  useEffect(() => {
    if (window.YT) { setYtReady(true); return }
    window.onYouTubeIframeAPIReady = () => setYtReady(true)
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  }, [])

  // Create/replace player when song changes (host only for auto-advance)
  useEffect(() => {
    if (!ytReady || !currentSong || !playerDivRef.current || !isHost) return

    playerRef.current?.destroy()
    playerRef.current = new window.YT.Player(playerDivRef.current, {
      videoId: currentSong.youtube_id,
      playerVars: { autoplay: isPlaying ? 1 : 0, rel: 0, modestbranding: 1 },
      events: {
        onStateChange: (e: { data: number }) => {
          if (playlist.auto_play && e.data === window.YT.PlayerState.ENDED) {
            goToIndex(playlist.current_index + 1)
          }
        },
      },
    })
    return () => { playerRef.current?.destroy(); playerRef.current = null }
  }, [ytReady, currentSong?.youtube_id, isHost])

  // Sync play/pause state with Supabase phase (host only)
  useEffect(() => {
    if (!playerRef.current || !isHost) return
    if (isPlaying) playerRef.current.playVideo()
    else playerRef.current.pauseVideo()
  }, [isPlaying, isHost])

  if (isDone) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">🏁</div>
        <h2 className="font-display text-3xl text-[#F4A340] mb-2" style={{ fontFamily: 'var(--font-oswald)' }}>
          Playlist done!
        </h2>
        <p className="text-[#F4F1EA] opacity-60 text-sm mb-6">
          {playlist.play_order.length} songs played across {members.length} people
        </p>
        {isHost && (
          <button
            onClick={() => supabase.from('playlists').update({ phase: 'lobby', current_index: 0, play_order: [] }).eq('id', playlist.id)
              .then(() => supabase.from('playlist_members').update({ done_adding: false }).eq('playlist_id', playlist.id))
              .then(() => supabase.from('playlist_songs').delete().eq('playlist_id', playlist.id))}
            className="w-full max-w-xs py-4 rounded-2xl bg-[#F4A340] text-[#1A2238] font-display text-xl active:opacity-80"
            style={{ fontFamily: 'var(--font-oswald)' }}>
            Play Again
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col px-5 py-8">
      {/* Now playing header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[#F4A340] text-xs font-display uppercase tracking-widest" style={{ fontFamily: 'var(--font-oswald)' }}>
            {isPlaying ? 'Now Playing' : 'Paused'}
          </p>
          <p className="text-[#F4F1EA] opacity-50 text-xs">
            {playlist.current_index + 1} of {playlist.play_order.length}
          </p>
        </div>
        {currentMember && (
          <PlateAvatar plateCode={currentMember.plate_code} color={currentMember.color} size="sm" name={currentMember.name} />
        )}
      </div>

      {/* Player — host gets IFrame API div, guests get a plain iframe */}
      <div className="w-full rounded-2xl overflow-hidden bg-[#3D4466] aspect-video mb-5">
        {isHost ? (
          <div ref={playerDivRef} className="w-full h-full" />
        ) : currentSong ? (
          <iframe
            src={`https://www.youtube.com/embed/${currentSong.youtube_id}?autoplay=0&rel=0`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={currentSong.title}
          />
        ) : null}
      </div>

      {currentSong && (
        <p className="text-[#F4F1EA] text-sm font-medium mb-5 line-clamp-2">{currentSong.title}</p>
      )}

      {/* Host controls */}
      {isHost && (
        <div className="space-y-3 mb-6">
          <div className="flex gap-3">
            {isPlaying ? (
              <button onClick={handlePause}
                className="flex-1 py-3 rounded-xl bg-[#3D4466] text-[#F4F1EA] font-display text-base active:opacity-70"
                style={{ fontFamily: 'var(--font-oswald)' }}>
                ⏸ Pause
              </button>
            ) : (
              <button onClick={handleResume}
                className="flex-1 py-3 rounded-xl bg-[#F4A340] text-[#1A2238] font-display text-base active:opacity-80"
                style={{ fontFamily: 'var(--font-oswald)' }}>
                ▶ Resume
              </button>
            )}
            {!playlist.auto_play && (
              <button onClick={() => goToIndex(playlist.current_index + 1)}
                className="flex-1 py-3 rounded-xl bg-[#3D4466] text-[#F4F1EA] font-display text-base active:opacity-70"
                style={{ fontFamily: 'var(--font-oswald)' }}>
                Next →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Queue — always visible for host; guests see a condensed now-playing strip */}
      {isHost && !playlist.auto_play ? (
        <QueueView playlist={playlist} songs={songs} members={members} onSelect={(i) => goToIndex(i)} />
      ) : (
        <MiniQueue playlist={playlist} songs={songs} members={members} />
      )}
    </div>
  )
}

// ── Full queue for DJ mode ────────────────────────────────────────────────────

function QueueView({ playlist, songs, members, onSelect }: {
  playlist: Playlist
  songs: PlaylistSong[]
  members: PlaylistMember[]
  onSelect: (index: number) => void
}) {
  return (
    <div>
      <p className="text-[#F4F1EA] opacity-40 text-xs uppercase tracking-wider mb-3">Queue — tap to play</p>
      <div className="space-y-2 overflow-y-auto max-h-72">
        {playlist.play_order.map((songId, i) => {
          const song = songs.find((s) => s.id === songId)
          const member = song ? members.find((m) => m.id === song.member_id) : null
          const isCurrent = i === playlist.current_index
          const isPast = i < playlist.current_index
          return (
            <button key={songId} onClick={() => onSelect(i)}
              className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition-colors active:opacity-70 ${isCurrent ? 'border border-[#F4A340]' : ''} ${isPast ? 'opacity-40' : ''}`}
              style={{ backgroundColor: isCurrent ? '#F4A340' + '22' : '#3D4466' }}>
              <span className={`text-xs font-display w-5 flex-shrink-0 ${isCurrent ? 'text-[#F4A340]' : 'text-[#F4F1EA] opacity-40'}`}
                style={{ fontFamily: 'var(--font-oswald)' }}>{i + 1}</span>
              {song?.thumbnail_url && (
                <img src={song.thumbnail_url} alt="" className="w-10 h-7 object-cover rounded flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[#F4F1EA] text-xs leading-tight line-clamp-1">{song?.title}</p>
                {member && <p className="text-[#F4F1EA] opacity-50 text-xs mt-0.5">{member.name}</p>}
              </div>
              {member && <PlateAvatar plateCode={member.plate_code} color={member.color} size="sm" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Mini up-next strip for auto-play / guest view ─────────────────────────────

function MiniQueue({ playlist, songs, members }: {
  playlist: Playlist
  songs: PlaylistSong[]
  members: PlaylistMember[]
}) {
  const upNext = playlist.play_order.slice(playlist.current_index + 1, playlist.current_index + 4)
  if (upNext.length === 0) return null
  return (
    <div>
      <p className="text-[#F4F1EA] opacity-40 text-xs uppercase tracking-wider mb-2">Up next</p>
      <div className="space-y-2">
        {upNext.map((songId, i) => {
          const song = songs.find((s) => s.id === songId)
          const member = song ? members.find((m) => m.id === song.member_id) : null
          return (
            <div key={songId} className="flex items-center gap-3 rounded-xl p-3 opacity-70" style={{ backgroundColor: '#3D4466' }}>
              <span className="text-[#F4F1EA] opacity-40 text-xs font-display w-4" style={{ fontFamily: 'var(--font-oswald)' }}>
                {playlist.current_index + i + 2}
              </span>
              {song?.thumbnail_url && <img src={song.thumbnail_url} alt="" className="w-10 h-7 object-cover rounded flex-shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className="text-[#F4F1EA] text-xs line-clamp-1">{song?.title}</p>
                {member && <p className="text-[#F4F1EA] opacity-40 text-xs">{member.name}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
