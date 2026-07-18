'use client'

import { PlaylistQueueItem, Song, Player } from '@/lib/supabase'
import PlateAvatar from './PlateAvatar'

type Props = {
  queue: PlaylistQueueItem[]
  songs: Song[]
  players: Player[]
  currentItemId: string | null
}

export default function PlaylistQueue({ queue, songs, players, currentItemId }: Props) {
  const sorted = [...queue].sort((a, b) => a.position - b.position)

  return (
    <div className="space-y-2 max-h-72 overflow-y-auto">
      {sorted.map((item) => {
        const song = songs.find((s) => s.id === item.song_id)
        const contributor = players.find((p) => p.id === song?.player_id)
        const isCurrent = item.id === currentItemId

        return (
          <div
            key={item.id}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-opacity ${
              isCurrent ? 'bg-[#F4A340]/20 border border-[#F4A340]' : 'bg-[#3D4466]'
            } ${item.played && !isCurrent ? 'opacity-40' : ''}`}
          >
            {contributor && <PlateAvatar name={contributor.name} color={contributor.color} size="sm" />}
            <div className="min-w-0 flex-1">
              <p className="text-[#F4F1EA] text-xs font-medium truncate">{song?.title ?? 'Song'}</p>
              <p className="text-[#F4F1EA] opacity-50 text-xs truncate">{contributor?.name ?? 'Unknown'}</p>
            </div>
            {isCurrent && <span className="text-[#F4A340] text-xs flex-shrink-0 font-medium">▶ Now</span>}
            {item.played && !isCurrent && <span className="text-[#F4F1EA] opacity-40 text-xs flex-shrink-0">✓</span>}
          </div>
        )
      })}
    </div>
  )
}
