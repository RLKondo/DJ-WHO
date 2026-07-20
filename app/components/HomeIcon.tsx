'use client'

import Link from 'next/link'

// Persistent DJ Who? badge shown on every page, top-left, linking back to
// the landing page so players can bail out and switch between DJ Who? and
// Playlist mode (or start an entirely new room) from anywhere in the app.
export default function HomeIcon() {
  return (
    <Link
      href="/"
      aria-label="DJ Who? home"
      className="fixed top-4 left-4 z-50 flex items-center justify-center w-10 h-10 rounded-full border border-[#F4A340]/40 shadow-md active:opacity-70"
      style={{ backgroundColor: '#3D4466' }}
    >
      <svg viewBox="0 0 24 24" fill="#F4A340" className="w-5 h-5">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z"
        />
      </svg>
    </Link>
  )
}
