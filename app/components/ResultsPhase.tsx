'use client'

import { supabase, Room, Player, Song, Guess, Car } from '@/lib/supabase'
import PlateAvatar from './PlateAvatar'

type Props = {
  room: Room
  players: Player[]
  songs: Song[]         // now safe to show player_id — we're in results phase
  guesses: Guess[]
  cars: Car[]
  myPlayerIds: string[]
  isMainLeader: boolean
}

export default function ResultsPhase({
  room,
  players,
  songs,
  guesses,
  isMainLeader,
  myPlayerIds,
}: Props) {
  // Score: count correct guesses per guesser
  const scores: Record<string, number> = {}
  for (const player of players) scores[player.id] = 0

  for (const guess of guesses) {
    const song = songs.find((s) => s.id === guess.song_id)
    if (song && guess.guessed_player_id === song.player_id) {
      scores[guess.guesser_id] = (scores[guess.guesser_id] ?? 0) + 1
    }
  }

  const sorted = [...players].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0))
  const maxScore = sorted[0] ? (scores[sorted[0].id] ?? 0) : 0

  async function handlePlayAgain() {
    // Reset songs, guesses, car phases, player ready flags, room phase
    await supabase.from('songs').delete().eq('room_id', room.id)
    await supabase.from('guesses').delete().eq('room_id', room.id)
    await supabase
      .from('cars')
      .update({ phase: 'waiting', current_song_index: 0, song_order: [] })
      .eq('room_id', room.id)
    await supabase.from('players').update({ ready: false }).eq('room_id', room.id)
    await supabase.from('rooms').update({ phase: 'lobby' }).eq('id', room.id)
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-10">
      <h1 className="font-display text-3xl text-[#F4A340] text-center mb-1" style={{ fontFamily: 'var(--font-oswald)' }}>
        Results
      </h1>
      <p className="text-[#F4F1EA] opacity-60 text-center text-sm mb-8">Who knew their crew?</p>

      {/* Leaderboard */}
      <div className="space-y-3 mb-10">
        {sorted.map((player, i) => {
          const score = scores[player.id] ?? 0
          const isWinner = score === maxScore && maxScore > 0
          return (
            <div
              key={player.id}
              className={`flex items-center gap-4 rounded-xl px-4 py-3 ${isWinner ? 'bg-[#F4A340]/20 border border-[#F4A340]' : 'bg-[#3D4466]'}`}
            >
              <span className="text-[#F4F1EA] opacity-50 w-6 text-sm">{i + 1}</span>
              <PlateAvatar plateCode={player.plate_code} color={player.color} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-[#F4F1EA] font-medium truncate">
                  {player.name} {isWinner ? '🏆' : ''}
                </p>
              </div>
              <p className="text-[#F4A340] font-display text-xl" style={{ fontFamily: 'var(--font-oswald)' }}>
                {score} / {songs.length}
              </p>
            </div>
          )
        })}
      </div>

      {/* Song reveal */}
      <h2 className="font-display text-xl text-[#F4F1EA] mb-4" style={{ fontFamily: 'var(--font-oswald)' }}>
        The Songs
      </h2>
      <div className="space-y-4 mb-10">
        {songs.map((song) => {
          const submitter = players.find((p) => p.id === song.player_id)
          // Show each player's guess for this song (for the current device's players)
          const myGuessesForSong = guesses.filter(
            (g) => myPlayerIds.includes(g.guesser_id) && g.song_id === song.id
          )

          return (
            <div key={song.id} className="rounded-xl bg-[#3D4466] overflow-hidden">
              <div className="flex items-center gap-3 p-3">
                {song.thumbnail_url && (
                  <img src={song.thumbnail_url} alt="" className="w-16 h-10 object-cover rounded-lg flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[#F4F1EA] text-xs font-medium leading-tight line-clamp-1">{song.title}</p>
                  {submitter && (
                    <div className="flex items-center gap-2 mt-1">
                      <PlateAvatar plateCode={submitter.plate_code} color={submitter.color} size="sm" />
                      <span className="text-[#F4A340] text-xs">{submitter.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {myGuessesForSong.length > 0 && (
                <div className="border-t border-[#1A2238]/40 px-3 py-2 space-y-1">
                  {myGuessesForSong.map((g) => {
                    const guesser = players.find((p) => p.id === g.guesser_id)
                    const guessedPlayer = players.find((p) => p.id === g.guessed_player_id)
                    const correct = g.guessed_player_id === song.player_id
                    return (
                      <div key={g.id} className="flex items-center gap-2 text-xs">
                        <span className="text-[#F4F1EA] opacity-60">{guesser?.name}:</span>
                        <span className={correct ? 'text-[#4FC3A1]' : 'text-[#E8503A]'}>
                          {correct ? '✅' : '❌'} {guessedPlayer?.name}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {isMainLeader && (
        <button
          onClick={handlePlayAgain}
          className="w-full py-4 rounded-2xl bg-[#F4A340] text-[#1A2238] font-display text-xl active:opacity-80"
          style={{ fontFamily: 'var(--font-oswald)' }}
        >
          Play Again
        </button>
      )}
    </div>
  )
}
