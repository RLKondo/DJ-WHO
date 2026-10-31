'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Room, Song, Player, PlaylistQueueItem } from '@/lib/supabase'
import { generatePlaylistCode, rememberSaved } from '@/lib/clean'
import PlateAvatar from './PlateAvatar'

type Props = {
  room: Room
  queue: PlaylistQueueItem[]
  songs: Song[]
  players: Player[]
  isMainLeader: boolean
}

export default function PlaylistDonePhase({ room, queue, songs, players, isMainLeader }: Props) {
  const router = useRouter()
  const sorted = [...queue].sort((a, b) => a.position - b.position)

  const [removed, setRemoved] = useState<string[]>([])
  const [playlistName, setPlaylistName] = useState(room.playlist_theme ?? '')
  const [saving, setSaving] = useState(false)
  const [savedCode, setSavedCode] = useState('')
  const [saveError, setSaveError] = useState('')
  const [copied, setCopied] = useState(false)

  const toSave = sorted.filter((item) => !removed.includes(item.id))

  async function handlePlayAgain() {
    await supabase.from('playlist_queue').delete().eq('room_id', room.id)
    await supabase.from('songs').delete().eq('room_id', room.id)
    await supabase.from('players').update({ ready: false }).eq('room_id', room.id)
    await supabase.from('rooms').update({ phase: room.playlist_solo ? 'playlist_submit' : 'lobby' }).eq('id', room.id)
  }

  async function handleSave() {
    if (!playlistName.trim() || toSave.length === 0) return
    setSaving(true); setSaveError('')

    // Codes are short and human-friendly, so retry on the rare collision.
    let playlist: { id: string; code: string } | null = null
    for (let attempt = 0; attempt < 6 && !playlist; attempt++) {
      const code = generatePlaylistCode()
      const { data } = await supabase
        .from('saved_playlists')
        .insert({ code, name: playlistName.trim(), theme: room.playlist_theme })
        .select('id, code')
        .single()
      if (data) playlist = data
    }
    if (!playlist) { setSaveError('Could not save. Check your connection and try again.'); setSaving(false); return }

    const rows = toSave.map((item, i) => {
      const song = songs.find((s) => s.id === item.song_id)
      const contributor = players.find((p) => p.id === song?.player_id)
      return {
        playlist_id: playlist!.id,
        position: i,
        youtube_id: song?.youtube_id ?? '',
        title: song?.title ?? 'Song',
        thumbnail_url: song?.thumbnail_url ?? null,
        contributor_name: contributor?.name ?? null,
      }
    }).filter((r) => r.youtube_id)

    const { error } = await supabase.from('saved_playlist_songs').insert(rows)
    if (error) {
      setSaveError('Could not save the songs. Try again.')
      setSaving(false)
      return
    }

    rememberSaved({ code: playlist.code, name: playlistName.trim() })
    setSavedCode(playlist.code)
    setSaving(false)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/playlist/${savedCode}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-10">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🎵</div>
        <h1 className="font-display text-3xl text-[#F4A340] mb-1" style={{ fontFamily: 'var(--font-oswald)' }}>
          That's a wrap!
        </h1>
        <p className="text-[#F4F1EA] opacity-60 text-sm">{sorted.length} song{sorted.length === 1 ? '' : 's'} played</p>
      </div>

      <h2 className="font-display text-xl text-[#F4F1EA] mb-4" style={{ fontFamily: 'var(--font-oswald)' }}>
        The Playlist
      </h2>
      <div className="space-y-3 mb-8">
        {sorted.map((item, i) => {
          const song = songs.find((s) => s.id === item.song_id)
          const contributor = players.find((p) => p.id === song?.player_id)
          const isRemoved = removed.includes(item.id)
          return (
            <div key={item.id} className={`flex items-center gap-3 rounded-xl px-4 py-3 bg-[#3D4466] ${isRemoved ? 'opacity-40' : ''}`}>
              <span className="text-[#F4F1EA] opacity-40 text-sm w-6">{i + 1}</span>
              {contributor && !room.playlist_solo && <PlateAvatar name={contributor.name} color={contributor.color} size="sm" />}
              <div className="min-w-0 flex-1">
                <p className={`text-[#F4F1EA] text-sm font-medium truncate ${isRemoved ? 'line-through' : ''}`}>{song?.title ?? 'Song'}</p>
                {!room.playlist_solo && (
                  <p className="text-[#F4F1EA] opacity-50 text-xs truncate">{contributor?.name ?? 'Unknown'}</p>
                )}
              </div>
              {isMainLeader && !savedCode && (
                <button
                  onClick={() => setRemoved((r) => isRemoved ? r.filter((id) => id !== item.id) : [...r, item.id])}
                  className="text-[#F4F1EA] opacity-60 text-xs px-2 py-1 rounded-lg bg-[#1A2238] active:opacity-70 flex-shrink-0"
                  aria-label={isRemoved ? 'Keep song when saving' : 'Remove song from saved playlist'}
                >
                  {isRemoved ? 'Keep' : 'Remove'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {isMainLeader && (
        <div className="rounded-2xl p-4 bg-[#3D4466] mb-6 space-y-3">
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
                Save this playlist to use again
                {removed.length > 0 ? ` (${toSave.length} song${toSave.length === 1 ? '' : 's'}, ${removed.length} removed)` : ''}
              </p>
              <input
                type="text"
                placeholder="Playlist name — e.g. Period 3 Friday"
                value={playlistName}
                maxLength={60}
                onChange={(e) => setPlaylistName(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 bg-[#1A2238] text-[#F4F1EA] placeholder-[#F4F1EA]/40 outline-none text-sm"
              />
              {saveError && <p className="text-[#E8503A] text-xs">{saveError}</p>}
              <button onClick={handleSave} disabled={saving || !playlistName.trim() || toSave.length === 0}
                className="w-full py-3 rounded-xl bg-[#F4A340] text-[#1A2238] font-display text-lg disabled:opacity-40 active:opacity-80"
                style={{ fontFamily: 'var(--font-oswald)' }}>
                {saving ? 'Saving…' : 'Save Playlist'}
              </button>
            </>
          )}
        </div>
      )}

      {isMainLeader && (
        <button
          onClick={handlePlayAgain}
          className="w-full py-4 rounded-2xl bg-[#F4A340] text-[#1A2238] font-display text-xl active:opacity-80 mb-3"
          style={{ fontFamily: 'var(--font-oswald)' }}
        >
          Play Again
        </button>
      )}
      <button
        onClick={() => router.push('/')}
        className="w-full py-4 rounded-2xl bg-[#3D4466] text-[#F4F1EA] font-display text-lg active:opacity-70"
        style={{ fontFamily: 'var(--font-oswald)' }}
      >
        Back to home
      </button>
    </div>
  )
}
