'use client'

import { useRouter } from 'next/navigation'
import { supabase, Room, Player, Song, Guess, Car } from '@/lib/supabase'

type Props = {
  room: Room
  players: Player[]
  songs: Song[]
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
  const router = useRouter()
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

  const myPlayers = myPlayerIds
    .map((id) => players.find((p) => p.id === id))
    .filter(Boolean) as Player[]

  async function handlePlayAgain() {
    await supabase.from('songs').delete().eq('room_id', room.id)
    await supabase.from('guesses').delete().eq('room_id', room.id)
    await supabase.from('cars').update({ phase: 'waiting', current_song_index: 0, song_order: [] }).eq('room_id', room.id)
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
              <div className="flex-1 min-w-0">
                <p className="text-[#F4F1EA] font-medium truncate">
                  {player.name} {isWinner ? '🏆' : ''}
                </p>
              </div>
              <p className="text-[#F4A340] font-display text-xl" style={{ fontFamily: 'var(--font-oswald)' }}>
                {score} {score === 1 ? 'point' : 'points'}
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
          const myGuessesForSong = guesses.filter(
            (g) => myPlayerIds.includes(g.guesser_id) && g.song_id === song.id
          )

          // Color-code: green if all local guesses correct, red if any wrong
          let bgClass = 'bg-[#3D4466]'
          let borderClass = ''
          if (myGuessesForSong.length > 0) {
            const allCorrect = myGuessesForSong.every((g) => g.guessed_player_id === song.player_id)
            if (allCorrect) {
              bgClass = 'bg-[#1A3D2E]'
              borderClass = 'border border-[#4FC3A1]'
            } else {
              bgClass = 'bg-[#3D1A1A]'
              borderClass = 'border border-[#E8503A]'
            }
          }

          return (
            <div key={song.id} className={`rounded-xl overflow-hidden ${bgClass} ${borderClass}`}>
              <div className="flex items-center gap-3 p-3">
                {song.thumbnail_url && (
                  <img src={song.thumbnail_url} alt="" className="w-16 h-10 object-cover rounded-lg flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[#F4F1EA] text-xs font-medium leading-tight line-clamp-1">{song.title}</p>
                  {submitter && (
                    <p className="text-[#F4A340] text-lg font-bold mt-1 truncate">{submitter.name}</p>
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

      {/* Per-player guess summary */}
      {myPlayers.length > 0 && (
        <div className="mb-10">
          <h2 className="font-display text-xl text-[#F4F1EA] mb-4" style={{ fontFamily: 'var(--font-oswald)' }}>
            Your Guesses
          </h2>
          <div className="space-y-5">
            {myPlayers.map((player) => {
              const playerGuesses = guesses.filter((g) => g.guesser_id === player.id)
              const correct = playerGuesses.filter((g) => {
                const song = songs.find((s) => s.id === g.song_id)
                return song && g.guessed_player_id === song.player_id
              })
              const missed = playerGuesses.filter((g) => {
                const song = songs.find((s) => s.id === g.song_id)
                return song && g.guessed_player_id !== song.player_id
              })

              return (
                <div key={player.id} className="rounded-xl bg-[#3D4466] p-4">
                  <p className="text-[#F4A340] font-display text-base mb-3" style={{ fontFamily: 'var(--font-oswald)' }}>
                    {player.name}
                  </p>

                  {correct.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[#4FC3A1] text-xs font-semibold uppercase tracking-wide mb-2">
                        Got right ({correct.length})
                      </p>
                      <div className="space-y-1">
                        {correct.map((g) => {
                          const song = songs.find((s) => s.id === g.song_id)
                          const submitter = players.find((p) => p.id === song?.player_id)
                          return (
                            <div key={g.id} className="flex items-center gap-2 text-sm">
                              <span className="text-[#4FC3A1] flex-shrink-0">✓</span>
                              <span className="text-[#F4F1EA] opacity-80 truncate">{song?.title?.slice(0, 40) ?? 'Song'}</span>
                              <span className="text-[#F4F1EA] opacity-40 text-xs flex-shrink-0">— {submitter?.name}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {missed.length > 0 && (
                    <div>
                      <p className="text-[#E8503A] text-xs font-semibold uppercase tracking-wide mb-2">
                        Missed ({missed.length})
                      </p>
                      <div className="space-y-2">
                        {missed.map((g) => {
                          const song = songs.find((s) => s.id === g.song_id)
                          const submitter = players.find((p) => p.id === song?.player_id)
                          const guessedPlayer = players.find((p) => p.id === g.guessed_player_id)
                          return (
                            <div key={g.id} className="flex items-start gap-2 text-sm">
                              <span className="text-[#E8503A] flex-shrink-0">✗</span>
                              <div className="min-w-0">
                                <p className="text-[#F4F1EA] opacity-80 truncate">{song?.title?.slice(0, 40) ?? 'Song'}</p>
                                <p className="text-[#F4F1EA] opacity-40 text-xs mt-0.5">
                                  Guessed {guessedPlayer?.name}, was {submitter?.name}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {playerGuesses.length === 0 && (
                    <p className="text-[#F4F1EA] opacity-40 text-sm">No guesses recorded</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {isMainLeader && (
        <>
          <button
            onClick={handlePlayAgain}
            className="w-full py-4 rounded-2xl bg-[#F4A340] text-[#1A2238] font-display text-xl active:opacity-80 mb-3"
            style={{ fontFamily: 'var(--font-oswald)' }}
          >
            Play Again
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full py-4 rounded-2xl bg-[#3D4466] text-[#F4F1EA] font-display text-lg active:opacity-70"
            style={{ fontFamily: 'var(--font-oswald)' }}
          >
            Start a Road Trip Playlist instead
          </button>
        </>
      )}
    </div>
  )
}
