'use client'

type Props = {
  plateCode: string
  color: string
  size?: 'sm' | 'md' | 'lg'
  name?: string
}

const sizeMap = {
  sm: { outer: 'w-14 h-9 rounded', text: 'text-sm font-bold tracking-widest', name: 'text-xs mt-1' },
  md: { outer: 'w-20 h-12 rounded-lg', text: 'text-base font-bold tracking-widest', name: 'text-xs mt-1' },
  lg: { outer: 'w-32 h-20 rounded-xl', text: 'text-2xl font-bold tracking-widest', name: 'text-sm mt-2' },
}

export default function PlateAvatar({ plateCode, color, size = 'md', name }: Props) {
  const s = sizeMap[size]
  // Determine contrasting text color (dark background → light text and vice versa)
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  const textColor = luminance > 0.5 ? '#1A2238' : '#F4F1EA'

  return (
    <div className="flex flex-col items-center">
      <div
        className={`${s.outer} flex items-center justify-center border-2 shadow-md`}
        style={{ backgroundColor: color, borderColor: textColor + '44' }}
      >
        <span
          className={`${s.text} font-display`}
          style={{ color: textColor, fontFamily: 'var(--font-oswald)' }}
        >
          {plateCode}
        </span>
      </div>
      {name && (
        <span className={`${s.name} text-[#F4F1EA] opacity-80 truncate max-w-[8rem] text-center`}>
          {name}
        </span>
      )}
    </div>
  )
}
