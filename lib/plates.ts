const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // no I or O (ambiguous)

export function generatePlateCode(): string {
  return Array.from({ length: 3 }, () =>
    LETTERS[Math.floor(Math.random() * LETTERS.length)]
  ).join('')
}

// Fixed palette — distinct, vibrant, readable on dark backgrounds
export const COLOR_PALETTE = [
  '#E8503A', // taillight red
  '#F4A340', // dashboard amber
  '#4FC3A1', // road sign teal
  '#7B68EE', // purple dusk
  '#5BC0EB', // sky blue
  '#F9DC5C', // headlight yellow
  '#E8805A', // sunset orange
  '#A8D8A8', // mile marker green
  '#C77DFF', // neon violet
  '#FF6B9D', // brake light pink
]

export function pickColor(index: number): string {
  return COLOR_PALETTE[index % COLOR_PALETTE.length]
}

// Generate a random 4-letter room code (uppercase, no ambiguous chars)
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
export function generateRoomCode(): string {
  return Array.from({ length: 4 }, () =>
    CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)]
  ).join('')
}
