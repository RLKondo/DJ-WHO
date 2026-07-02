'use client'

import { supabase, Playlist, PlaylistMember } from '@/lib/supabase'
import PlateAvatar from '../PlateAvatar'

type Props = {
  playlist: Playlist
  members: PlaylistMember[]
  myMemberId: string
}

export default function PlaylistLobby({ playlist, members, myMemberId }: Props) {
  const isHost = playlist.host_id === myMemberId
  const me = members.find((m) => m.id === myMemberId)

  async function handleStart() {
    await supabase.from('playlists').update({ phase: 'adding' }).eq('id', playlist.id)
  }

  if (isHost) {
    return (
      <div className="min-h-screen flex flex-col px-5 py-8">
        <div className="rounded-2xl p-5 mb-6" style={{ backgroundColor: '#3D4466' }}>
          <span className="text-[#F4A340] text-xs font-display uppercase tracking-widest" style={{ fontFamily: 'var(--font-oswald)' }}>
            You're the host
          </span>
          <h1 className="font-display text-5xl text-[#F4F1EA] tracking-widest mt-1 mb-1" style={{ fontFamily: 'var(--font-oswald)' }}>
            {playlist.code}
          </h1>
          <p className="text-[#F4F1EA] opacity-50 text-xs">Share this code — others join at dj-who.vercel.app</p>
        </div>

        {/* Settings summary */}
        <div className="rounded-xl p-4 mb-6 space-y-2" style={{ backgroundColor: '#1A2238' }}>
          <div className="flex justify-between text-sm">
            <span className="text-[#F4F1EA] opacity-60">Songs per person</span>
            <span className="text-[#F4A340] font-display" style={{ fontFamily: 'var(--font-oswald)' }}>{playlist.songs_per_person}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#F4F1EA] opacity-60">Playback mode</span>
            <span className="text-[#F4A340]">{playlist.auto_play ? 'Auto-play' : 'DJ Mode'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#F4F1EA] opacity-60">Total songs</span>
            <span className="text-[#F4A340] font-display" style={{ fontFamily: 'var(--font-oswald)' }}>{members.length * playlist.songs_per_person}</span>
          </div>
        </div>

        {/* Members */}
        <p className="text-[#F4F1EA] opacity-40 text-xs uppercase tracking-wider mb-3">
          {members.length} member{members.length !== 1 ? 's' : ''} joined
        </p>
        <div className="flex flex-wrap gap-3 mb-8">
          {members.map((m) => (
            <PlateAvatar key={m.id} plateCode={m.plate_code} color={m.color} size="sm" name={m.name} />
          ))}
        </div>

        <div className="mt-auto">
          {members.length < 2 && (
            <p className="text-[#F4F1EA] opacity-40 text-xs text-center mb-3">Need at least 2 people to start</p>
          )}
          <button onClick={handleStart} disabled={members.length < 2}
            className="w-full py-4 rounded-2xl font-display text-xl disabled:opacity-30 active:opacity-80"
            style={{
              fontFamily: 'var(--font-oswald)',
              backgroundColor: members.length >= 2 ? '#F4A340' : '#3D4466',
              color: members.length >= 2 ? '#1A2238' : '#F4F1EA',
            }}>
            Everyone's here — Start Adding Songs
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-between px-6 py-12">
      <div className="w-full text-center">
        <p className="text-[#F4F1EA] opacity-50 text-sm mb-1">You're in the playlist!</p>
        <div className="font-display text-6xl text-[#F4A340] tracking-widest mb-1" style={{ fontFamily: 'var(--font-oswald)' }}>
          {playlist.code}
        </div>
        <p className="text-[#F4F1EA] opacity-30 text-xs">Playlist code</p>
      </div>

      {me && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-[#F4F1EA] opacity-40 text-xs uppercase tracking-wider">Your plate</p>
          <PlateAvatar plateCode={me.plate_code} color={me.color} size="lg" name={me.name} />
          <p className="text-[#F4F1EA] opacity-50 text-xs mt-1">
            You'll each add {playlist.songs_per_person} song{playlist.songs_per_person !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      <div className="w-full">
        <p className="text-[#F4F1EA] opacity-40 text-xs uppercase tracking-wider text-center mb-3">
          {members.length} joined
        </p>
        <div className="flex flex-wrap gap-3 justify-center mb-6">
          {members.map((m) => (
            <PlateAvatar key={m.id} plateCode={m.plate_code} color={m.color} size="sm" name={m.name} />
          ))}
        </div>
        <div className="text-center py-4 rounded-2xl" style={{ backgroundColor: '#3D4466' }}>
          <p className="text-[#F4F1EA] opacity-60 text-sm">Waiting for the host to start…</p>
        </div>
      </div>
    </div>
  )
}
