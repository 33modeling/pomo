import type { Session, Task } from '../types'
import { startOfDayMs } from './dates'
import { t } from '../i18n'

const DAY_MS = 24 * 60 * 60 * 1000

export interface Badge {
  id: string
  name: string
  desc: string
  emoji: string
  earned: boolean
  /** e.g. "7/10" toward the goal. */
  progress: string
}

function countBadge(
  id: string,
  name: string,
  desc: string,
  emoji: string,
  value: number,
  target: number,
): Badge {
  return {
    id,
    name,
    desc,
    emoji,
    earned: value >= target,
    progress: `${Math.min(value, target)}/${target}`,
  }
}

/** Compute the full badge list (earned + in-progress) from the user's data. */
export function computeBadges(sessions: Session[], tasks: Task[]): Badge[] {
  const focus = sessions.filter((s) => s.mode === 'focus' && s.completed)
  const pomos = focus.length
  const hours = Math.floor(
    focus.reduce((a, s) => a + s.durationSec, 0) / 3600,
  )
  const doneTasks = tasks.filter((t) => t.completed).length

  const days = new Set<number>()
  for (const s of focus) days.add(startOfDayMs(s.startedAt))
  let streak = 0
  if (days.size > 0) {
    let cur = startOfDayMs(Date.now())
    while (days.has(cur)) {
      streak++
      cur -= DAY_MS
    }
  }

  return [
    countBadge('first', '첫 집중', '첫 뽀모도로 완료', '🌱', pomos, 1),
    countBadge('p10', '뽀모 10', '뽀모도로 10회', '🍅', pomos, 10),
    countBadge('p50', '뽀모 50', '뽀모도로 50회', '🔥', pomos, 50),
    countBadge('p100', '뽀모 100', '뽀모도로 100회', '💯', pomos, 100),
    countBadge('streak3', '3일 연속', '3일 연속 집중', '📅', streak, 3),
    countBadge('streak7', '일주일', '7일 연속 집중', '🗓️', streak, 7),
    countBadge('streak30', '한 달', '30일 연속 집중', '🏆', streak, 30),
    countBadge('h10', '10시간', '누적 10시간 집중', '⏳', hours, 10),
    countBadge('h50', '50시간', '누적 50시간 집중', '⌛', hours, 50),
    countBadge('task25', '완료 25', '할 일 25개 완료', '✅', doneTasks, 25),
  ]
}

export interface FocusInsight {
  bestWeekday: string
  bestWeekdayMin: number
  bestHourLabel: string
  bestHourMin: number
}

/** Best weekday + best hour-of-day by focus minutes (null when no data). */
export function focusInsight(sessions: Session[]): FocusInsight | null {
  const focus = sessions.filter((s) => s.mode === 'focus')
  if (focus.length === 0) return null

  const byWeekday = new Array(7).fill(0)
  const byHour = new Array(24).fill(0)
  for (const s of focus) {
    const d = new Date(s.startedAt)
    const wd = (d.getDay() + 6) % 7 // Monday = 0
    byWeekday[wd] += s.durationSec / 60
    byHour[d.getHours()] += s.durationSec / 60
  }

  let bw = 0
  for (let i = 1; i < 7; i++) if (byWeekday[i] > byWeekday[bw]) bw = i
  let bh = 0
  for (let i = 1; i < 24; i++) if (byHour[i] > byHour[bh]) bh = i

  return {
    bestWeekday: t(`insight.wd.${bw}`),
    bestWeekdayMin: Math.round(byWeekday[bw]),
    bestHourLabel: t('insight.hour', { h: bh, h2: (bh + 1) % 24 }),
    bestHourMin: Math.round(byHour[bh]),
  }
}
