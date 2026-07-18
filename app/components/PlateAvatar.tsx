'use client'

type Props = {
  name: string
  color: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: { outer: 'w-20 h-9 rounded px-1.5', text: 'text-[10px]' },
  md: { outer: 'w-28 h-12 rounded-lg px-2', text: 'text-xs' },
  lg: { outer: 'w-44 h-20 rounded-xl px-3', text: 'text-lg' },
}

export default function PlateAvatar({ name, color, size = 'md' }: Props) {
  const s = sizeMap[size]
  // Determine contrasting text color (dark background → light text and vice versa)
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  const textColor = luminance > 0.5 ? '#1A2238' : '#F4F1EA'

  return (
    <div
      className={`${s.outer} flex items-center justify-center border-2 shadow-md`}
      style={{ backgroundColor: color, borderColor: textColor + '44' }}
    >
      <span
        className={`${s.text} font-display font-bold uppercase tracking-wide truncate max-w-full`}
        style={{ color: textColor, fontFamily: 'var(--font-oswald)' }}
      >
        {name}
      </span>
    </div>
  )
}
