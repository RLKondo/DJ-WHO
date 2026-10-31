// Best-effort filter for Clean playlists. Real protection is host approval;
// this just catches obvious cases before a song reaches the host's queue.
const FLAGGED = [
  'explicit', 'uncensored', 'nsfw', 'unedited', 'dirty version',
  'fuck', 'shit', 'bitch', 'cunt', 'nigg', 'porn', 'xxx',
]

export function looksExplicit(title: string): boolean {
  const t = title.toLowerCase()
  return FLAGGED.some((w) => t.includes(w))
}

// Saved-playlist codes: easy to read aloud, e.g. JAZZ-4821
const WORDS = ['JAZZ', 'ROCK', 'FUNK', 'BEAT', 'TUNE', 'BASS', 'DISCO', 'SOUL', 'FOLK', 'POP', 'SWING', 'BLUES', 'GROOVE', 'RHYME', 'CHORD', 'DRUM']

export function generatePlaylistCode(): string {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)]
  const num = Math.floor(1000 + Math.random() * 9000)
  return `${word}-${num}`
}

const SAVED_KEY = 'djwho:savedPlaylists'
export type SavedRef = { code: string; name: string }

export function getSavedRefs(): SavedRef[] {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]') } catch { return [] }
}

export function rememberSaved(ref: SavedRef) {
  try {
    const next = [ref, ...getSavedRefs().filter((r) => r.code !== ref.code)]
    localStorage.setItem(SAVED_KEY, JSON.stringify(next))
  } catch { /* storage unavailable */ }
}
