'use client'

import { useState } from 'react'
import { Player } from '@/lib/supabase'
import PlateAvatar from './PlateAvatar'

type Props = {
  players: Player[]           // the local device's players, in order
  completedIds: string[]      // player ids that have already finished this step
  onAllDone: () => void       // called when every local player is done
  children: (currentPlayer: Player, onDone: () => void) => React.ReactNode
}

export default function TurnQueue({ players, completedIds, onAllDone, children }: Props) {
  const remaining = players.filter((p) => !completedIds.includes(p.id))
  const [handoffPending, setHandoffPending] = useState(false)

  if (remaining.length === 0) {
    return null // parent controls "all done" display
  }

  const current = remaining[0]
  const next = remaining[1]

  function handleDone() {
    if (remaining.length === 1) {
      onAllDone()
    } else {
      setHandoffPending(true)
    }
  }

  if (handoffPending && next) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1A2238] px-6 text-center">
        <p className="text-[#F4F1EA] text-lg mb-6 opacity-70">Pass the phone to</p>
        <PlateAvatar name={next.name} color={next.color} size="lg" />
        <p className="mt-4 text-2xl font-display text-[#F4F1EA]" style={{ fontFamily: 'var(--font-oswald)' }}>
          {next.name}
        </p>
        <button
          className="mt-10 w-full max-w-xs rounded-xl py-4 text-lg font-display bg-[#F4A340] text-[#1A2238] active:opacity-80"
          style={{ fontFamily: 'var(--font-oswald)' }}
          onClick={() => setHandoffPending(false)}
        >
          Ready — I'm {next.name}
        </button>
      </div>
    )
  }

  return <>{children(current, handleDone)}</>
}
