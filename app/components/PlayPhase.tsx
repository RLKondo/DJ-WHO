'use client'

import { supabase, Car, Player, Song } from '@/lib/supabase'

type Props = {
  car: Car
  songs: Song[]           // full song list — player_id must NOT be shown
  myPlayerIds: string[]
}

export default function PlayPhase({ car, songs, myPlayerIds }: Props) {
  const isCarLeader = myPlayerIds.some(
    (id) => id === car.car_leader_id
  )

  const currentSongId = car.song_order[car.current_song_index]
  // Do NOT expose song.player_id — only use youtube_id, title, thumbnail_url
  const currentSong = songs.find((s) => s.id === currentSongId)

  async function handleNext() {
    const nextIndex = car.current_song_index + 1
    if (nextIndex >= car.song_order.length) {
      // All songs played — move to guess phase
      await supabase
        .from('cars')
        .update({ phase: 'guess', current_song_index: 0 })
        .eq('id', car.id)
    } else {
      await supabase
        .from('cars')
        .update({ current_song_index: nextIndex })
        .eq('id', car.id)
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-10">
      <div className="text-center mb-6">
        <p className="text-[#F4A340] text-sm font-display mb-1" style={{ fontFamily: 'var(--font-oswald)' }}>
          Now Playing
        </p>
        <h2 className="font-display text-3xl text-[#F4F1EA]" style={{ fontFamily: 'var(--font-oswald)' }}>
          Song {car.current_song_index + 1} of {car.song_order.length}
        </h2>
      </div>

      {currentSong ? (
        <div className="flex-1 flex flex-col items-center gap-6">
          {/* Simple iframe embed — tap to play on mobile */}
          {/* Full YouTube IFrame API can be added for tighter control if needed */}
          <div className="w-full rounded-2xl overflow-hidden bg-[#3D4466] aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${currentSong.youtube_id}?autoplay=0&rel=0`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={`Song ${car.current_song_index + 1}`}
            />
          </div>

          {isCarLeader ? (
            <button
              onClick={handleNext}
              className="w-full py-4 rounded-2xl bg-[#F4A340] text-[#1A2238] font-display text-xl active:opacity-80"
              style={{ fontFamily: 'var(--font-oswald)' }}
            >
              {car.current_song_index + 1 < car.song_order.length
                ? 'Next Song →'
                : 'Start Guessing →'}
            </button>
          ) : (
            <p className="text-[#F4F1EA] opacity-50 text-sm text-center">
              The car leader controls playback
            </p>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#F4F1EA] opacity-50">Loading song…</p>
        </div>
      )}
    </div>
  )
}
