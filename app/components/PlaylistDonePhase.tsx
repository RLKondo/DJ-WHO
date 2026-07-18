'use client'

import { useRouter } from 'next/navigation'
import { supabase, Room, Song, Player, PlaylistQueueItem } from '@/lib/supabase'
import PlateAvatar from './PlateAvatar'

type Props = {
  room: Room
  queue: PlaylistQueueItem[]
  songs: Song[]
  players: Player[]
  isMainLeader: boolean
}

export default function PlaylistDonePhase({ room, queue, songs, players, isMainLeader }: Props) {
  const router = useRouter()
  const sorted = [...queue].sort((a, b) => a.position - b.position)

  async function handlePlayAgain() {
    await supabase.from('playlist_queue').delete().eq('room_id', room.id)
    await supabase.from('songs').delete().eq('room_id', room.id)
    await supabase.from('players').update({ ready: false }).eq('room_id', room.id)
    await supabase.from('rooms').update({ phase: 'lobby' }).eq('id', room.id)
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-10">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🎵</div>
        <h1 className="font-display text-3xl text-[#F4A340] mb-1" style={{ fontFamily: 'var(--font-oswald)' }}>
          That's a wrap!
        </h1>
        <p className="text-[#F4F1EA] opacity-60 text-sm">{sorted.length} song{sorted.length === 1 ? '' : 's'} played</p>
      </div>

      <h2 className="font-display text-xl text-[#F4F1EA] mb-4" style={{ fontFamily: 'var(--font-oswald)' }}>
        The Playlist
      </h2>
      <div className="space-y-3 mb-10">
        {sorted.map((item, i) => {
          const song = songs.find((s) => s.id === item.song_id)
          const contributor = players.find((p) => p.id === song?.player_id)
          return (
            <div key={item.id} className="flex items-center gap-3 rounded-xl px-4 py-3 bg-[#3D4466]">
              <span className="text-[#F4F1EA] opacity-40 text-sm w-6">{i + 1}</span>
              {contributor && <PlateAvatar name={contributor.name} color={contributor.color} size="sm" />}
              <div className="min-w-0 flex-1">
                <p className="text-[#F4F1EA] text-sm font-medium truncate">{song?.title ?? 'Song'}</p>
                <p className="text-[#F4F1EA] opacity-50 text-xs truncate">{contributor?.name ?? 'Unknown'}</p>
              </div>
            </div>
          )
        })}
      </div>

      {isMainLeader && (
        <button
          onClick={handlePlayAgain}
          className="w-full py-4 rounded-2xl bg-[#F4A340] text-[#1A2238] font-display text-xl active:opacity-80 mb-3"
          style={{ fontFamily: 'var(--font-oswald)' }}
        >
          Play Again
        </button>
      )}
      <button
        onClick={() => router.push('/')}
        className="w-full py-4 rounded-2xl bg-[#3D4466] text-[#F4F1EA] font-display text-lg active:opacity-70"
        style={{ fontFamily: 'var(--font-oswald)' }}
      >
        Switch to DJ Who? mode
      </button>
    </div>
  )
}
