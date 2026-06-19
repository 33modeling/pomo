import { type ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  left?: ReactNode
  right?: ReactNode
}

export function Header({ title, subtitle, left, right }: Props) {
  return (
    <header className="sticky top-0 z-20 bg-bg/80 pt-safe backdrop-blur-lg">
      <div className="flex min-h-[56px] items-center justify-between gap-2 px-5 py-3">
        <div className="flex items-center gap-2">
          {left}
          <div>
            <h1 className="text-xl font-bold leading-tight text-ink">{title}</h1>
            {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">{right}</div>
      </div>
    </header>
  )
}
