'use client'

import { useState } from 'react'
import { fetchVideoInfo, parseYouTubeId, searchYouTube, VideoInfo, SearchResult } from '@/lib/youtube'

type Props = {
  onSelect: (info: VideoInfo) => void
}

const hasSearchKey = Boolean(process.env.NEXT_PUBLIC_YOUTUBE_API_KEY)

export default function YouTubePicker({ onSelect }: Props) {
  const [tab, setTab] = useState<'paste' | 'search'>(hasSearchKey ? 'search' : 'paste')
  const [pasteInput, setPasteInput] = useState('')
  const [pasteError, setPasteError] = useState('')
  const [pasting, setPasting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [preview, setPreview] = useState<VideoInfo | null>(null)

  async function handlePaste() {
    setPasteError('')
    const id = parseYouTubeId(pasteInput.trim())
    if (!id) { setPasteError('Couldn\'t find a YouTube video ID in that URL.'); return }
    setPasting(true)
    const info = await fetchVideoInfo(id)
    setPasting(false)
    if (!info) { setPasteError('Couldn\'t load video info — is the URL correct?'); return }
    setPreview(info)
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    const results = await searchYouTube(searchQuery.trim())
    setSearchResults(results)
    setSearching(false)
  }

  async function handleSearchSelect(result: SearchResult) {
    const info = await fetchVideoInfo(result.youtubeId)
    if (info) setPreview(info)
  }

  if (preview) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl overflow-hidden bg-[#3D4466]">
          {preview.thumbnailUrl && (
            <img src={preview.thumbnailUrl} alt={preview.title} className="w-full object-cover" />
          )}
          <div className="p-3">
            <p className="text-[#F4F1EA] font-medium text-sm leading-snug">{preview.title}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            className="flex-1 py-3 rounded-xl bg-[#3D4466] text-[#F4F1EA] text-sm active:opacity-70"
            onClick={() => setPreview(null)}
          >
            Change
          </button>
          <button
            className="flex-1 py-3 rounded-xl bg-[#F4A340] text-[#1A2238] font-display text-base active:opacity-80"
            style={{ fontFamily: 'var(--font-oswald)' }}
            onClick={() => onSelect(preview)}
          >
            Confirm Song
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {hasSearchKey && (
        <div className="flex rounded-xl overflow-hidden border border-[#3D4466]">
          {(['search', 'paste'] as const).map((t) => (
            <button
              key={t}
              className={`flex-1 py-2.5 text-sm font-display capitalize transition-colors ${tab === t ? 'bg-[#3D4466] text-[#F4A340]' : 'text-[#F4F1EA] opacity-60'}`}
              style={{ fontFamily: 'var(--font-oswald)' }}
              onClick={() => setTab(t)}
            >
              {t === 'search' ? 'Search' : 'Paste URL'}
            </button>
          ))}
        </div>
      )}

      {tab === 'paste' && (
        <div className="space-y-3">
          <input
            type="url"
            placeholder="youtube.com/watch?v=… or youtu.be/…"
            value={pasteInput}
            onChange={(e) => setPasteInput(e.target.value)}
            className="w-full rounded-xl px-4 py-3 bg-[#3D4466] text-[#F4F1EA] placeholder-[#F4F1EA]/40 outline-none text-sm"
          />
          {pasteError && <p className="text-[#E8503A] text-xs">{pasteError}</p>}
          <button
            disabled={pasting || !pasteInput}
            onClick={handlePaste}
            className="w-full py-3 rounded-xl bg-[#F4A340] text-[#1A2238] font-display text-base disabled:opacity-40 active:opacity-80"
            style={{ fontFamily: 'var(--font-oswald)' }}
          >
            {pasting ? 'Loading…' : 'Look Up Song'}
          </button>
        </div>
      )}

      {tab === 'search' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="search"
              placeholder="Search YouTube…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 rounded-xl px-4 py-3 bg-[#3D4466] text-[#F4F1EA] placeholder-[#F4F1EA]/40 outline-none text-sm"
            />
            <button
              disabled={searching || !searchQuery.trim()}
              onClick={handleSearch}
              className="px-4 rounded-xl bg-[#F4A340] text-[#1A2238] font-display disabled:opacity-40 active:opacity-80"
              style={{ fontFamily: 'var(--font-oswald)' }}
            >
              {searching ? '…' : 'Go'}
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {searchResults.map((r) => (
              <button
                key={r.youtubeId}
                onClick={() => handleSearchSelect(r)}
                className="w-full flex items-center gap-3 rounded-xl p-2 bg-[#3D4466] active:opacity-70 text-left"
              >
                {r.thumbnailUrl && (
                  <img src={r.thumbnailUrl} alt="" className="w-16 h-10 object-cover rounded-lg flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-[#F4F1EA] text-xs font-medium leading-tight line-clamp-2">{r.title}</p>
                  <p className="text-[#F4F1EA]/50 text-xs mt-0.5">{r.channelTitle}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
