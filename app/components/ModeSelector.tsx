'use client'

type Mode = 'guess' | 'playlist'

type Props = {
  mode: Mode
  onModeChange: (mode: Mode) => void
  songsPerPlayer: number
  onSongsPerPlayerChange: (n: number) => void
}

export default function ModeSelector({ mode, onModeChange, songsPerPlayer, onSongsPerPlayerChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <ModeCard
          emoji="🎵"
          title="DJ Who?"
          tagline="Guess who picked which song"
          selected={mode === 'guess'}
          onSelect={() => onModeChange('guess')}
        />
        <ModeCard
          emoji="🚗"
          title="Road Trip Playlist"
          tagline="Build a group soundtrack together"
          selected={mode === 'playlist'}
          onSelect={() => onModeChange('playlist')}
        />
      </div>

      {mode === 'playlist' && (
        <div className="rounded-xl p-4 bg-[#3D4466] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[#F4F1EA] text-sm">How many songs can each player add?</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onSongsPerPlayerChange(Math.max(1, songsPerPlayer - 1))}
                className="w-8 h-8 rounded-lg bg-[#1A2238] text-[#F4F1EA] text-lg active:opacity-70"
              >
                −
              </button>
              <span className="text-[#F4A340] font-display text-xl w-6 text-center" style={{ fontFamily: 'var(--font-oswald)' }}>
                {songsPerPlayer}
              </span>
              <button
                onClick={() => onSongsPerPlayerChange(Math.min(10, songsPerPlayer + 1))}
                className="w-8 h-8 rounded-lg bg-[#1A2238] text-[#F4F1EA] text-lg active:opacity-70"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ModeCard({
  emoji, title, tagline, selected, onSelect,
}: {
  emoji: string
  title: string
  tagline: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`rounded-2xl p-4 text-left transition-colors ${selected ? 'bg-[#F4A340]/15 border-2 border-[#F4A340]' : 'bg-[#3D4466] border-2 border-transparent'}`}
    >
      <div className="text-3xl mb-2">{emoji}</div>
      <p className="font-display text-base text-[#F4F1EA] leading-tight mb-1" style={{ fontFamily: 'var(--font-oswald)' }}>
        {title}
      </p>
      <p className="text-[#F4F1EA] opacity-60 text-xs leading-snug mb-3">{tagline}</p>
      <div
        className={`text-xs font-display text-center py-1.5 rounded-lg ${selected ? 'bg-[#F4A340] text-[#1A2238]' : 'bg-[#1A2238] text-[#F4F1EA] opacity-50'}`}
        style={{ fontFamily: 'var(--font-oswald)' }}
      >
        {selected ? 'Selected' : 'Select'}
      </div>
    </button>
  )
}
