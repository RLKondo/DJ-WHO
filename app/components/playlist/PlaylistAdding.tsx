'use client'

import { useState } from 'react'
import { supabase, Playlist, PlaylistMember, PlaylistSong } from '@/lib/supabase'
import { VideoInfo } from '@/lib/youtube'
import YouTubePicker from '../YouTubePicker'
import PlateAvatar from '../PlateAvatar'

type Props = {
  playlist: Playlist
  members: PlaylistMember[]
  songs: PlaylistSong[]
  myMemberId: string
}

export default function PlaylistAdding({ playlist, members, songs, myMemberId }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const me = members.find((m) => m.id === myMemberId)
  if (!me) return null

  const mySongs = songs.filter((s) => s.member_id === myMemberId)
  const nextIndex = mySongs.length  // 0-based index of the next song to add
  const allDone = me.done_adding
  const doneCount = members.filter((m) => m.done_adding).length

  async function handleSongSelected(info: VideoInfo) {
    setSubmitting(true)
    await supabase.from('playlist_songs').insert({
      playlist_id: playlist.id,
      member_id: myMemberId,
      youtube_id: info.youtubeId,
      title: info.title,
      thumbnail_url: info.thumbnailUrl,
      member_song_index: nextIndex,
    })

    // If this was the last song, mark done and check if everyone's done
    if (nextIndex + 1 >= playlist.songs_per_person) {
      await supabase.from('playlist_members').update({ done_adding: true }).eq('id', myMemberId)

      const { data: freshMembers } = await supabase
        .from('playlist_members')
        .select('id, done_adding')
        .eq('playlist_id', playlist.id)

      // If we made everyone done, build play order and start
      const allFinished = (freshMembers ?? []).every((m: { done_adding: boolean }) => m.done_adding)
      if (allFinished) {
        await buildPlayOrderAndStart(playlist, freshMembers as PlaylistMember[], songs)
      }
    }
    setSubmitting(false)
  }

  if (allDone) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">🎵</div>
        <h2 className="font-display text-2xl text-[#F4A340] mb-2" style={{ fontFamily: 'var(--font-oswald)' }}>
          Your songs are in!
        </h2>
        <p className="text-[#F4F1EA] opacity-60 mb-8 text-sm">Waiting for everyone to finish adding…</p>
        <div className="text-4xl font-display text-[#F4F1EA]" style={{ fontFamily: 'var(--font-oswald)' }}>
          {doneCount} / {members.length}
        </div>
        <p className="text-[#F4F1EA] opacity-40 text-sm mt-1">members done</p>

        {/* Show my songs */}
        <div className="w-full mt-8 space-y-2 text-left">
          <p className="text-[#F4F1EA] opacity-40 text-xs uppercase tracking-wider mb-3">Your songs</p>
          {mySongs.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-xl p-3" style={{ backgroundColor: '#3D4466' }}>
              {s.thumbnail_url && <img src={s.thumbnail_url} alt="" className="w-12 h-8 object-cover rounded-lg flex-shrink-0" />}
              <p className="text-[#F4F1EA] text-xs leading-tight line-clamp-2">{s.title}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-10">
      <div className="flex items-center gap-3 mb-6">
        {me && <PlateAvatar plateCode={me.plate_code} color={me.color} size="sm" />}
        <div>
          <h2 className="font-display text-xl text-[#F4F1EA]" style={{ fontFamily: 'var(--font-oswald)' }}>
            {me?.name}
          </h2>
          <p className="text-[#F4A340] text-xs">
            Add song {nextIndex + 1} of {playlist.songs_per_person}
          </p>
        </div>
      </div>

      {/* Already added */}
      {mySongs.length > 0 && (
        <div className="space-y-2 mb-6">
          {mySongs.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 rounded-xl p-3 opacity-60" style={{ backgroundColor: '#3D4466' }}>
              <span className="text-[#F4A340] text-xs font-display w-4" style={{ fontFamily: 'var(--font-oswald)' }}>{i + 1}</span>
              {s.thumbnail_url && <img src={s.thumbnail_url} alt="" className="w-10 h-7 object-cover rounded flex-shrink-0" />}
              <p className="text-[#F4F1EA] text-xs line-clamp-1">{s.title}</p>
            </div>
          ))}
        </div>
      )}

      {submitting ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#F4F1EA] opacity-60">Saving…</p>
        </div>
      ) : (
        <YouTubePicker onSelect={handleSongSelected} />
      )}
    </div>
  )
}

// Build round-robin play order and transition to 'playing'
async function buildPlayOrderAndStart(
  playlist: Playlist,
  members: PlaylistMember[],
  existingSongs: PlaylistSong[]
) {
  // Fetch the latest songs since some were just inserted
  const { data: allSongs } = await supabase
    .from('playlist_songs')
    .select('*')
    .eq('playlist_id', playlist.id)

  const songs = allSongs ?? existingSongs

  // Round-robin: slot 0 for all members, then slot 1, etc.
  const sorted = [...members].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  const order: string[] = []
  for (let i = 0; i < playlist.songs_per_person; i++) {
    for (const member of sorted) {
      const song = songs.find(
        (s: PlaylistSong) => s.member_id === member.id && s.member_song_index === i
      )
      if (song) order.push(song.id)
    }
  }

  await supabase
    .from('playlists')
    .update({ play_order: order, current_index: 0, phase: 'playing' })
    .eq('id', playlist.id)
}
