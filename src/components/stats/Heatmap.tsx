import { useMemo } from 'react'

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] // Monday-first

const MONTH_NAMES = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
]

interface DayDatum {
  /** Start-of-day epoch ms. */
  day: number
  minutes: number
}

interface Cell {
  day: number
  minutes: number
}

/** Index 0..6 with Monday = 0 (Date.getDay returns Sunday = 0). */
function mondayIndex(ms: number): number {
  return (new Date(ms).getDay() + 6) % 7
}

/** Bucket focus minutes into an accent opacity (0 = empty surface). */
function opacityFor(minutes: number): number {
  if (minutes <= 0) return 0
  if (minutes < 15) return 0.25
  if (minutes < 30) return 0.5
  if (minutes < 60) return 0.75
  return 1
}

/**
 * GitHub-style focus heatmap: 7 rows (월~일, Monday top) × week columns.
 * Cells are coloured by daily focus minutes; leading blanks pad the first
 * column to the correct weekday. Horizontally scrollable.
 */
export function Heatmap({ days }: { days: DayDatum[] }) {
  const columns = useMemo<(Cell | null)[][]>(() => {
    if (days.length === 0) return []
    // Pad leading blanks so the first real day sits on its weekday row.
    const lead = mondayIndex(days[0].day)
    const cells: (Cell | null)[] = []
    for (let i = 0; i < lead; i++) cells.push(null)
    for (const d of days) cells.push({ day: d.day, minutes: d.minutes })
    // Pad the tail so the grid forms complete week columns.
    while (cells.length % 7 !== 0) cells.push(null)

    const cols: (Cell | null)[][] = []
    for (let i = 0; i < cells.length; i += 7) {
      cols.push(cells.slice(i, i + 7))
    }
    return cols
  }, [days])

  if (columns.length === 0) {
    return <p className="py-4 text-center text-sm text-muted">기록이 없어요.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="no-scrollbar overflow-x-auto">
        <div className="flex gap-[3px]">
          {/* Weekday labels (월~일) */}
          <div className="mr-1 flex flex-col gap-[3px]">
            {WEEKDAY_LABELS.map((label, i) => (
              <div
                key={label}
                className="flex h-3 items-center text-[9px] leading-none text-faint"
              >
                {i % 2 === 0 ? label : ''}
              </div>
            ))}
          </div>
          {columns.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {col.map((cell, ri) => {
                if (!cell) {
                  return <div key={ri} className="h-3 w-3" />
                }
                const opacity = opacityFor(cell.minutes)
                const d = new Date(cell.day)
                const title = `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}일 · ${Math.round(
                  cell.minutes,
                )}분`
                return (
                  <div
                    key={ri}
                    title={title}
                    className="h-3 w-3 rounded-[3px] bg-surface-2"
                  >
                    {opacity > 0 && (
                      <div
                        className="h-full w-full rounded-[3px] bg-accent"
                        style={{ opacity }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend: 적음 → 많음 */}
      <div className="flex items-center justify-end gap-1.5 text-[10px] text-faint">
        <span>적음</span>
        <div className="h-3 w-3 rounded-[3px] bg-surface-2" />
        {[0.25, 0.5, 0.75, 1].map((o) => (
          <div
            key={o}
            className="h-3 w-3 rounded-[3px] bg-accent"
            style={{ opacity: o }}
          />
        ))}
        <span>많음</span>
      </div>
    </div>
  )
}
