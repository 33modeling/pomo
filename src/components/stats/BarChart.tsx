import { useMemo } from 'react'
import { cn } from '../../lib/cn'
import { useT } from '../../i18n'

export interface Bar {
  /** Numeric value for the bar (e.g. focus minutes). */
  value: number
  /** Label shown under the bar; empty string hides it. */
  label: string
  /** Whether to emphasise this bar (e.g. today / current bucket). */
  active?: boolean
}

interface Props {
  bars: Bar[]
  /** Unit appended in the tooltip-ish max readout, e.g. "min". */
  unit?: string
  className?: string
}

/**
 * Lightweight flexbox bar chart. Accent bars with rounded tops, a flat
 * baseline when everything is zero, and sparse x-axis labels.
 */
export function BarChart({ bars, unit, className }: Props) {
  const t = useT()
  const unitLabel = unit ?? t('stats.unit.min')
  const max = useMemo(
    () => bars.reduce((m, b) => Math.max(m, b.value), 0),
    [bars],
  )
  const empty = max <= 0

  return (
    <div className={cn('w-full', className)}>
      <div className="flex h-36 items-end gap-1">
        {bars.map((b, i) => {
          const pct = empty ? 0 : b.value / max
          // Keep a faint stub for zero buckets so the chart reads as a grid.
          const heightPct = b.value > 0 ? Math.max(pct * 100, 6) : 0
          return (
            <div
              key={i}
              className="flex h-full flex-1 flex-col justify-end"
              title={b.value > 0 ? `${Math.round(b.value)}${unitLabel}` : '0'}
            >
              <div className="relative h-full w-full">
                <div className="absolute inset-x-0 bottom-0 rounded-t-md bg-line/40" style={{ height: '2px' }} />
                <div
                  className={cn(
                    'absolute inset-x-0 bottom-0 rounded-t-md transition-all',
                    b.active ? 'bg-accent' : 'bg-accent/55',
                  )}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex gap-1">
        {bars.map((b, i) => (
          <div
            key={i}
            className={cn(
              'flex-1 text-center text-[10px] leading-none',
              b.active ? 'font-semibold text-ink' : 'text-faint',
            )}
          >
            {b.label}
          </div>
        ))}
      </div>
    </div>
  )
}
