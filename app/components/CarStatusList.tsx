'use client'

import { Car, Player } from '@/lib/supabase'

type Props = {
  cars: Car[]
  players: Player[]
}

const phaseLabel: Record<Car['phase'], string> = {
  waiting: 'Waiting…',
  play: '🎵 Listening',
  guess: '🤔 Guessing',
  done: '✅ Done',
}

export default function CarStatusList({ cars, players }: Props) {
  return (
    <div className="space-y-2">
      {cars.map((car) => {
        const leader = players.find((p) => p.id === car.car_leader_id)
        const riders = players.filter((p) => p.car_id === car.id)
        return (
          <div
            key={car.id}
            className="flex items-center justify-between rounded-lg px-4 py-3"
            style={{ backgroundColor: '#3D4466' }}
          >
            <div>
              <div className="font-display text-base text-[#F4F1EA]" style={{ fontFamily: 'var(--font-oswald)' }}>
                {car.name}
              </div>
              <div className="text-xs text-[#F4F1EA] opacity-60 mt-0.5">
                {riders.map((r) => r.name).join(', ') || 'No riders yet'}
              </div>
            </div>
            <div className="text-sm font-medium text-[#F4A340]">
              {phaseLabel[car.phase]}
            </div>
          </div>
        )
      })}
    </div>
  )
}
