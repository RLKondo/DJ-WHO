'use client'

import { useRouter } from 'next/navigation'

type Game = {
  emoji: string
  name: string
  tagline: string
  href: string | null
  accent: string
}

const GAMES: Game[] = [
  {
    emoji: '🎵',
    name: 'DJ Who?',
    tagline: 'Guess who picked which song',
    href: '/djwho',
    accent: '#F4A340',
  },
  {
    emoji: '🤥',
    name: '2 Truths and a Lie',
    tagline: 'Spot the fib, fool your friends',
    href: null,
    accent: '#A78BFA',
  },
  {
    emoji: '⭐',
    name: 'Celebrity Chain',
    tagline: 'Name a star, pass the chain',
    href: null,
    accent: '#FFD700',
  },
  {
    emoji: '📸',
    name: 'ScavengerPic',
    tagline: 'AI-powered photo hunt',
    href: null,
    accent: '#34D399',
  },
  {
    emoji: '🖼️',
    name: 'GroupSnap',
    tagline: 'Shared trip photo album',
    href: null,
    accent: '#60A5FA',
  },
]

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col px-5 py-10">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1
          className="text-5xl text-[#F4A340] mb-2 leading-none"
          style={{ fontFamily: 'var(--font-oswald)', letterSpacing: '0.06em' }}
        >
          RoadGamez
        </h1>
        <p className="text-[#F4F1EA] opacity-60 text-sm">
          5 games for groups on the go
        </p>
      </div>

      {/* Game cards */}
      <div className="space-y-3 mb-12">
        {GAMES.map((game) => (
          <GameCard key={game.name} game={game} onClick={() => game.href && router.push(game.href)} />
        ))}
      </div>

      {/* How it works */}
      <div className="mt-auto">
        <p className="text-[#F4F1EA] opacity-30 text-xs uppercase tracking-widest text-center mb-4">
          How it works
        </p>
        <div className="flex justify-around">
          {[
            { step: '1', label: 'Pick a game' },
            { step: '2', label: 'Share the code' },
            { step: '3', label: 'Play together' },
          ].map(({ step, label }) => (
            <div key={step} className="flex flex-col items-center gap-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm text-[#1A2238] font-bold"
                style={{ backgroundColor: '#F4A340' }}
              >
                {step}
              </div>
              <span className="text-[#F4F1EA] opacity-50 text-xs text-center">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function GameCard({ game, onClick }: { game: Game; onClick: () => void }) {
  const isLive = game.href !== null

  return (
    <button
      onClick={onClick}
      disabled={!isLive}
      className={`w-full flex items-center gap-4 rounded-2xl px-4 py-4 text-left transition-opacity ${
        isLive ? 'bg-[#3D4466] active:opacity-70' : 'bg-[#3D4466]/50'
      }`}
    >
      {/* Emoji badge */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
        style={{ backgroundColor: isLive ? game.accent + '22' : '#3D4466' }}
      >
        {game.emoji}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className="text-lg leading-tight"
          style={{
            fontFamily: 'var(--font-oswald)',
            color: isLive ? game.accent : '#F4F1EA',
            opacity: isLive ? 1 : 0.4,
          }}
        >
          {game.name}
        </p>
        <p className={`text-xs mt-0.5 ${isLive ? 'text-[#F4F1EA] opacity-60' : 'text-[#F4F1EA] opacity-25'}`}>
          {game.tagline}
        </p>
      </div>

      {/* CTA */}
      {isLive ? (
        <span
          className="text-sm font-display flex-shrink-0"
          style={{ fontFamily: 'var(--font-oswald)', color: game.accent }}
        >
          Play →
        </span>
      ) : (
        <span className="text-xs text-[#F4F1EA] opacity-25 flex-shrink-0 font-display" style={{ fontFamily: 'var(--font-oswald)' }}>
          Soon
        </span>
      )}
    </button>
  )
}
