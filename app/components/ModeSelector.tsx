'use client'

export type Mode = 'guess' | 'playlist'
export type PlaylistType = 'solo' | 'group'

type Props = {
  mode: Mode
  onModeChange: (mode: Mode) => void
  playlistType: PlaylistType
  onPlaylistTypeChange: (t: PlaylistType) => void
  clean: boolean
  onCleanChange: (v: boolean) => void
  theme: string
  onThemeChange: (v: string) => void
  songsPerPlayer: number
  onSongsPerPlayerChange: (n: number) => void
}

export default function ModeSelector({
  mode, onModeChange, playlistType, onPlaylistTypeChange,
  clean, onCleanChange, theme, onThemeChange,
  songsPerPlayer, onSongsPerPlayerChange,
}: Props) {
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
          icon={<span className="text-3xl">🎶</span>}
          title="Playlists"
          tagline="Build a playlist, solo or with a group"
          selected={mode === 'playlist'}
          onSelect={() => onModeChange('playlist')}
        />
      </div>

      {mode === 'playlist' && (
        <div className="rounded-xl p-4 bg-[#3D4466] space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <TypeButton
              label="My Playlist"
              hint="Just you"
              selected={playlistType === 'solo'}
              onClick={() => onPlaylistTypeChange('solo')}
            />
            <TypeButton
              label="Group Playlist"
              hint="Everyone adds songs"
              selected={playlistType === 'group'}
              onClick={() => onPlaylistTypeChange('group')}
            />
          </div>

          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="min-w-0">
              <span className="block text-[#F4F1EA] text-sm">Clean</span>
              <span className="block text-[#F4F1EA] opacity-50 text-xs">
                Safe search, flagged titles blocked
                {playlistType === 'group' ? ', host approves every song' : ''}
              </span>
            </span>
            <input
              type="checkbox"
              checked={clean}
              onChange={(e) => onCleanChange(e.target.checked)}
              className="w-5 h-5 accent-[#F4A340] flex-shrink-0"
            />
          </label>

          <input
            type="text"
            placeholder="Theme (optional) — e.g. songs from the 80s"
            value={theme}
            maxLength={80}
            onChange={(e) => onThemeChange(e.target.value)}
            className="w-full rounded-lg px-3 py-2.5 bg-[#1A2238] text-[#F4F1EA] placeholder-[#F4F1EA]/40 outline-none text-sm"
          />

          {playlistType === 'group' && (
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
          )}
        </div>
      )}
    </div>
  )
}

function TypeButton({ label, hint, selected, onClick }: { label: string; hint: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-3 py-3 text-left border-2 transition-colors ${selected ? 'bg-[#F4A340]/15 border-[#F4A340]' : 'bg-[#1A2238] border-transparent'}`}
    >
      <p className="font-display text-base text-[#F4F1EA] leading-tight" style={{ fontFamily: 'var(--font-oswald)' }}>{label}</p>
      <p className="text-[#F4F1EA] opacity-50 text-xs mt-0.5">{hint}</p>
    </button>
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
