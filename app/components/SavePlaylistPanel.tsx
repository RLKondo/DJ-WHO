'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { generatePlaylistCode, rememberSaved } from '@/lib/clean'

export type SaveEntry = {
  youtube_id: string
  title: string
  thumbnail_url: string | null
  contributor_name: string | null
}

type Props = {
  entries: SaveEntry[]
  theme: string | null
  note?: string
  onSaved?: () => void
}

export default function SavePlaylistPanel({ entries, theme, note, onSaved }: Props) {
  const [name, setName] = useState(theme ?? '')
  const [saving, setSaving] = useState(false)
  const [savedCode, setSavedCode] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  async function handleSave() {
    if (!name.trim() || entries.length === 0) return
    setSaving(true); setError('')

    // Codes are short and human-friendly, so retry on the rare collision.
    let playlist: { id: string; code: string } | null = null
    for (let attempt = 0; attempt < 6 && !playlist; attempt++) {
      const { data } = await supabase
        .from('saved_playlists')
        .insert({ code: generatePlaylistCode(), name: name.trim(), theme })
        .select('id, code')
        .single()
      if (data) playlist = data
    }
    if (!playlist) { setError('Could not save. Check your connection and try again.'); setSaving(false); return }

    const { error: songsError } = await supabase.from('saved_playlist_songs').insert(
      entries.map((e, i) => ({
        playlist_id: playlist!.id,
        position: i,
        youtube_id: e.youtube_id,
        title: e.title,
        thumbnail_url: e.thumbnail_url,
        contributor_name: e.contributor_name,
      }))
    )
    if (songsError) { setError('Could not save the songs. Try again.'); setSaving(false); return }

    rememberSaved({ code: playlist.code, name: name.trim() })
    setSavedCode(playlist.code)
    setSaving(false)
    onSaved?.()
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/playlist/${savedCode}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }

  return (
    <div className="rounded-2xl p-4 bg-[#3D4466] space-y-3 w-full">
      {savedCode ? (
        <>
          <p className="text-[#4FC3A1] text-sm text-center">✅ Playlist saved!</p>
          <div className="text-center font-display text-4xl text-[#F4F1EA] tracking-widest" style={{ fontFamily: 'var(--font-oswald)' }}>
            {savedCode}
          </div>
          <p className="text-[#F4F1EA] opacity-50 text-xs text-center">
            Anyone with this code can open it from the Saved tab on the home screen.
          </p>
          <button onClick={copyLink}
            className="w-full py-3 rounded-xl bg-[#1A2238] text-[#F4A340] font-display text-base active:opacity-70"
            style={{ fontFamily: 'var(--font-oswald)' }}>
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </>
      ) : (
        <>
          <p className="text-[#F4F1EA] text-sm">
            Save this playlist to use again ({entries.length} song{entries.length === 1 ? '' : 's'})
            {note ? ` ${note}` : ''}
          </p>
          <input
            type="text"
            placeholder="Playlist name — e.g. Period 3 Friday"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg px-3 py-2.5 bg-[#1A2238] text-[#F4F1EA] placeholder-[#F4F1EA]/40 outline-none text-sm"
          />
          {error && <p className="text-[#E8503A] text-xs">{error}</p>}
          <button onClick={handleSave} disabled={saving || !name.trim() || entries.length === 0}
            className="w-full py-3 rounded-xl bg-[#F4A340] text-[#1A2238] font-display text-lg disabled:opacity-40 active:opacity-80"
            style={{ fontFamily: 'var(--font-oswald)' }}>
            {saving ? 'Saving…' : 'Save Playlist'}
          </button>
        </>
      )}
    </div>
  )
}
