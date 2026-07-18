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
          icon={
            <svg viewBox="0 0 24 24" fill="#F4A340" className="w-8 h-8">
              <path fillRule="evenodd" clipRule="evenodd" d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" />
            </svg>
          }
          title="DJ Who?"
          tagline="Guess who picked which song"
          selected={mode === 'guess'}
          onSelect={() => onModeChange('guess')}
        />
        <ModeCard
          icon={<span className="text-3xl">🚗</span>}
          title="Road Trip Playlist"
          tagline="Build a group soundtrack together"
          selected={mode === 'playlist'}
          onSelect={() => onModeChange('playlist')}
        />
      </div>

      {mode === 'playlist' && (
        <div className="rounded-xl p-4 bg-[#3D4466] space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[#F4F1EA] text-sm min-w-0">How many songs can each player add?</span>
            <div className="flex items-center gap-3 flex-shrink-0">
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
  icon, title, tagline, selected, onSelect,
}: {
  icon: React.ReactNode
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
      <div className="mb-2">{icon}</div>
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
