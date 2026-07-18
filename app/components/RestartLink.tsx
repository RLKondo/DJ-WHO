'use client'

import { useRouter } from 'next/navigation'

// Shown on every pre-game screen (lobby, submit) so players can bail back to
// the landing page if they want to switch between DJ Who? and Playlist mode
// instead of continuing the current room.
export default function RestartLink() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.push('/')}
      className="fixed top-4 left-4 z-40 text-[#F4F1EA] opacity-40 text-xs underline active:opacity-70"
    >
      ← Restart
    </button>
  )
}
