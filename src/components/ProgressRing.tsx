import { type ReactNode } from 'react'
import { cn } from '../lib/cn'

interface Props {
  /** 0..1 */
  progress: number
  stroke?: number
  className?: string
  trackClassName?: string
  children?: ReactNode
}

export function ProgressRing({
  progress,
  stroke = 5,
  className,
  trackClassName,
  children,
}: Props) {
  const size = 100
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.min(1, Math.max(0, progress))
  const offset = c * (1 - clamped)

  return (
    <div className={cn('relative aspect-square', className)}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className={cn('stroke-line', trackClassName)}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="rgb(var(--accent))"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  )
}
