import {
  addDays,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  isSameDay,
  isToday,
  isTomorrow,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns'

export type StatPeriod = 'day' | 'week' | 'month' | 'year'

const WEEK_OPTS = { weekStartsOn: 1 } as const // Monday

export function startOfDayMs(ms: number): number {
  return startOfDay(ms).getTime()
}

export function endOfDayMs(ms: number): number {
  return endOfDay(ms).getTime()
}

export interface Range {
  from: number
  to: number
}

/** Inclusive [from, to] epoch-ms range for the given period around `refMs`. */
export function rangeFor(period: StatPeriod, refMs: number): Range {
  const d = new Date(refMs)
  switch (period) {
    case 'day':
      return { from: startOfDay(d).getTime(), to: endOfDay(d).getTime() }
    case 'week':
      return {
        from: startOfWeek(d, WEEK_OPTS).getTime(),
        to: endOfWeek(d, WEEK_OPTS).getTime(),
      }
    case 'month':
      return { from: startOfMonth(d).getTime(), to: endOfMonth(d).getTime() }
    case 'year':
      return { from: startOfYear(d).getTime(), to: endOfYear(d).getTime() }
  }
}

/** Each day (as start-of-day ms) within the range, for bucketed charts. */
export function daysInRange(range: Range): number[] {
  return eachDayOfInterval({ start: range.from, end: range.to }).map((d) =>
    startOfDay(d).getTime(),
  )
}

export { addDays, isSameDay, isToday, isTomorrow }
