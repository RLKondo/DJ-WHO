'use client'

type Order = 'shuffle' | 'by_player'

type Props = {
  isPaused: boolean
  onTogglePause: () => void
  onSkip: () => void
  order: Order
  onChangeOrder: (order: Order) => void
  rebuilding: boolean
}

export default function HostPlaybackControls({ isPaused, onTogglePause, onSkip, order, onChangeOrder, rebuilding }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <button
          onClick={onTogglePause}
          className="flex-1 py-4 rounded-2xl bg-[#3D4466] text-[#F4F1EA] font-display text-lg active:opacity-70"
          style={{ fontFamily: 'var(--font-oswald)' }}
        >
          {isPaused ? '▶️ Play' : '⏸️ Pause'}
        </button>
        <button
          onClick={onSkip}
          className="flex-1 py-4 rounded-2xl bg-[#F4A340] text-[#1A2238] font-display text-lg active:opacity-80"
          style={{ fontFamily: 'var(--font-oswald)' }}
        >
          ⏭️ Skip
        </button>
      </div>

      <div className="flex rounded-xl overflow-hidden border border-[#3D4466]">
        <button
          disabled={rebuilding}
          onClick={() => onChangeOrder('shuffle')}
          className={`flex-1 py-2.5 text-sm font-display transition-colors disabled:opacity-50 ${order === 'shuffle' ? 'bg-[#3D4466] text-[#F4A340]' : 'text-[#F4F1EA] opacity-50'}`}
          style={{ fontFamily: 'var(--font-oswald)' }}
        >
          Shuffle
        </button>
        <button
          disabled={rebuilding}
          onClick={() => onChangeOrder('by_player')}
          className={`flex-1 py-2.5 text-sm font-display transition-colors disabled:opacity-50 ${order === 'by_player' ? 'bg-[#3D4466] text-[#F4A340]' : 'text-[#F4F1EA] opacity-50'}`}
          style={{ fontFamily: 'var(--font-oswald)' }}
        >
          By Player
        </button>
      </div>
    </div>
  )
}
