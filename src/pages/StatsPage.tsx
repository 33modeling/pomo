import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  getHours,
  getMonth,
  getDate,
  getDaysInMonth,
  startOfDay,
} from 'date-fns'
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Flame,
  Target,
} from 'lucide-react'

import { db } from '../db/db'
import { listProjects, listSessions, sessionsBetween } from '../db/repo'
import { rangeFor, daysInRange, startOfDayMs, type StatPeriod } from '../lib/dates'
import { formatDuration } from '../lib/format'
import { focusInsight } from '../lib/motivation'
import { cn } from '../lib/cn'
import { INBOX_COLOR } from '../lib/constants'
import { useT, t as translate } from '../i18n'
import type { ID, Session, Task } from '../types'

import { Header } from '../components/Header'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { SegmentedControl } from '../components/SegmentedControl'
import { BarChart, type Bar } from '../components/stats/BarChart'
import { Heatmap } from '../components/stats/Heatmap'
import { Badges } from '../components/stats/Badges'

const PERIOD_VALUES: StatPeriod[] = ['day', 'week', 'month', 'year']

const WEEKDAY_KEYS = [
  'stats.wd.mon',
  'stats.wd.tue',
  'stats.wd.wed',
  'stats.wd.thu',
  'stats.wd.fri',
  'stats.wd.sat',
  'stats.wd.sun',
] // Monday-first

const DAY_MS = 24 * 60 * 60 * 1000

/** Index 0..6 with Monday = 0 (date-fns getDay returns Sunday = 0). */
function mondayIndex(ms: number): number {
  const d = new Date(ms).getDay() // 0 = Sun .. 6 = Sat
  return (d + 6) % 7
}

export function StatsPage() {
  const t = useT()
  const [period, setPeriod] = useState<StatPeriod>('day')
  // Stable "now" reference so range + buckets don't drift across renders.
  const [refNow] = useState(() => Date.now())

  const periodOptions = useMemo(
    () =>
      PERIOD_VALUES.map((value) => ({
        value,
        label: t(`stats.period.${value}`),
      })),
    [t],
  )

  const range = useMemo(() => rangeFor(period, refNow), [period, refNow])

  const sessions =
    useLiveQuery(() => sessionsBetween(range.from, range.to), [
      range.from,
      range.to,
    ]) ?? []
  const allSessions = useLiveQuery(() => listSessions()) ?? []
  const allTasks = useLiveQuery(() => db.tasks.toArray()) ?? []
  const projects = useLiveQuery(() => listProjects()) ?? []

  const focusSessions = useMemo(
    () => sessions.filter((s) => s.mode === 'focus'),
    [sessions],
  )

  // --- Summary metrics --------------------------------------------------------
  const focusSec = useMemo(
    () => focusSessions.reduce((sum, s) => sum + s.durationSec, 0),
    [focusSessions],
  )

  const completedPomos = useMemo(
    () => focusSessions.filter((s) => s.completed).length,
    [focusSessions],
  )

  const completedTasks = useMemo(
    () =>
      allTasks.filter(
        (t) =>
          t.completed &&
          t.completedAt != null &&
          t.completedAt >= range.from &&
          t.completedAt <= range.to,
      ).length,
    [allTasks, range.from, range.to],
  )

  const streak = useMemo(() => computeStreak(allSessions, refNow), [
    allSessions,
    refNow,
  ])

  // --- Bar chart buckets ------------------------------------------------------
  const bars = useMemo<Bar[]>(
    () => buildBars(period, range, focusSessions, refNow),
    // `t` is a dep so chart labels relocalize on language switch.
    [period, range, focusSessions, refNow, t],
  )

  // --- Project distribution ---------------------------------------------------
  const projectName = useMemo(() => {
    const map = new Map<ID, { name: string; color: string }>()
    for (const p of projects) map.set(p.id, { name: p.name, color: p.color })
    return map
  }, [projects])

  const distribution = useMemo(() => {
    const byProject = new Map<string, number>()
    for (const s of focusSessions) {
      const key = s.projectId ?? '__inbox__'
      byProject.set(key, (byProject.get(key) ?? 0) + s.durationSec)
    }
    const rows = Array.from(byProject.entries()).map(([key, sec]) => {
      if (key === '__inbox__') {
        return { key, name: t('inbox.name'), color: INBOX_COLOR, sec }
      }
      const meta = projectName.get(key)
      return {
        key,
        name: meta?.name ?? t('stats.deletedProject'),
        color: meta?.color ?? INBOX_COLOR,
        sec,
      }
    })
    return rows.sort((a, b) => b.sec - a.sec)
  }, [focusSessions, projectName, t])

  const distMax = distribution[0]?.sec ?? 0
  const hasAnySession = sessions.length > 0

  // --- Weekly insight (all-time focus sessions) -------------------------------
  const insight = useMemo(() => focusInsight(allSessions), [allSessions])

  // --- Cumulative total (all focus sessions, all time) ------------------------
  const totalFocusSec = useMemo(
    () =>
      allSessions.reduce(
        (sum, s) => (s.mode === 'focus' ? sum + s.durationSec : sum),
        0,
      ),
    [allSessions],
  )

  // --- Heatmap: last 119 days (17 weeks) ending today -------------------------
  const heatmapDays = useMemo(() => {
    const todayStart = startOfDayMs(refNow)
    const firstDay = todayStart - 118 * DAY_MS
    const minutesByDay = new Map<number, number>()
    for (const s of allSessions) {
      if (s.mode !== 'focus') continue
      const day = startOfDayMs(s.startedAt)
      if (day < firstDay || day > todayStart) continue
      minutesByDay.set(day, (minutesByDay.get(day) ?? 0) + s.durationSec / 60)
    }
    const days: { day: number; minutes: number }[] = []
    for (let day = firstDay; day <= todayStart; day += DAY_MS) {
      days.push({ day, minutes: minutesByDay.get(day) ?? 0 })
    }
    return days
  }, [allSessions, refNow])

  // --- History: period's focus sessions, newest first, capped -----------------
  const taskById = useMemo(() => {
    const map = new Map<ID, Task>()
    for (const t of allTasks) map.set(t.id, t)
    return map
  }, [allTasks])

  const historyRows = useMemo(() => {
    return [...focusSessions]
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, 40)
      .map((s) => {
        const d = new Date(s.startedAt)
        const when = `${d.getMonth() + 1}/${d.getDate()} ${String(
          d.getHours(),
        ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        const task = s.taskId != null ? taskById.get(s.taskId) : undefined
        const title = task?.title ?? t('stats.historyFallback')
        const projectId = task?.projectId ?? s.projectId
        const color =
          projectId != null
            ? projectName.get(projectId)?.color ?? INBOX_COLOR
            : INBOX_COLOR
        return { id: s.id, when, title, color, durationSec: s.durationSec }
      })
  }, [focusSessions, taskById, projectName, t])

  return (
    <div className="flex flex-col gap-5 px-5 pb-8">
      <Header title={t('nav.stats')} />

      <SegmentedControl
        options={periodOptions}
        value={period}
        onChange={setPeriod}
        className="animate-fade-in"
      />

      {/* Cumulative total (all time) */}
      <Card className="flex items-center gap-4 p-5 animate-fade-in">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Clock size={22} strokeWidth={2.2} />
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted">{t('stats.totalFocus')}</span>
          <span className="nums text-2xl font-bold leading-none text-ink">
            {totalFocusSec > 0 ? formatDuration(totalFocusSec) : t('stats.zeroMin')}
          </span>
        </div>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard
          icon={<Clock size={18} strokeWidth={2.2} />}
          label={t('stats.focusTime')}
          value={focusSec > 0 ? formatDuration(focusSec) : t('stats.zeroMin')}
        />
        <SummaryCard
          icon={<Flame size={18} strokeWidth={2.2} />}
          label={t('stats.completedPomos')}
          value={t('stats.count', { n: completedPomos })}
        />
        <SummaryCard
          icon={<CheckCircle2 size={18} strokeWidth={2.2} />}
          label={t('stats.completedTasks')}
          value={t('stats.tasksCount', { n: completedTasks })}
        />
        <SummaryCard
          icon={<Target size={18} strokeWidth={2.2} />}
          label={t('stats.streak')}
          value={t('stats.days', { n: streak })}
        />
      </div>

      {/* Achievements */}
      <Card className="flex flex-col gap-4 p-5 animate-fade-in">
        <SectionTitle>{t('stats.achievements')}</SectionTitle>
        <Badges sessions={allSessions} tasks={allTasks} />
      </Card>

      {/* Weekly insight */}
      {insight && (
        <Card className="flex flex-col gap-3 p-5 animate-fade-in">
          <SectionTitle>{t('stats.insight')}</SectionTitle>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-ink">
              {t('stats.bestWeekday')}{' '}
              <span className="font-semibold">{insight.bestWeekday}</span>{' '}
              <span className="nums text-muted">
                ({t('stats.minutes', { n: insight.bestWeekdayMin })})
              </span>
            </p>
            <p className="text-sm font-medium text-ink">
              {t('stats.bestHour')}{' '}
              <span className="font-semibold">{insight.bestHourLabel}</span>{' '}
              <span className="nums text-muted">
                ({t('stats.minutes', { n: insight.bestHourMin })})
              </span>
            </p>
          </div>
        </Card>
      )}

      {/* Focus heatmap — all-time, last 17 weeks */}
      <Card className="flex flex-col gap-4 p-5 animate-fade-in">
        <SectionTitle>{t('stats.heatmap')}</SectionTitle>
        <Heatmap days={heatmapDays} />
      </Card>

      {!hasAnySession ? (
        <Card className="animate-fade-in">
          <EmptyState
            icon={<BarChart3 size={40} strokeWidth={1.5} />}
            title={t('stats.empty.title')}
            hint={t('stats.empty.hint')}
          />
        </Card>
      ) : (
        <>
          {/* Bar chart */}
          <Card className="flex flex-col gap-4 p-5 animate-fade-in">
            <SectionTitle>{t('stats.trend')}</SectionTitle>
            <BarChart bars={bars} unit={t('stats.unit.min')} />
          </Card>

          {/* Project distribution */}
          <Card className="flex flex-col gap-4 p-5 animate-fade-in">
            <SectionTitle>{t('stats.byProject')}</SectionTitle>
            {distribution.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">
                {t('stats.noFocus')}
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {distribution.map((row) => (
                  <div key={row.key} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: row.color }}
                      />
                      <span className="flex-1 truncate text-sm font-medium text-ink">
                        {row.name}
                      </span>
                      <span className="nums text-sm font-semibold text-muted">
                        {formatDuration(row.sec)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${distMax > 0 ? (row.sec / distMax) * 100 : 0}%`,
                          backgroundColor: row.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* History */}
          <Card className="flex flex-col gap-4 p-5 animate-fade-in">
            <SectionTitle>{t('stats.history')}</SectionTitle>
            {historyRows.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">
                {t('stats.noHistory')}
              </p>
            ) : (
              <div className="flex flex-col">
                {historyRows.map((row, i) => (
                  <div
                    key={row.id}
                    className={cn(
                      'flex items-center gap-3 py-2.5',
                      i > 0 && 'border-t border-line',
                    )}
                  >
                    <span className="nums w-[72px] shrink-0 text-xs font-medium text-muted">
                      {row.when}
                    </span>
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: row.color }}
                    />
                    <span className="flex-1 truncate text-sm font-medium text-ink">
                      {row.title}
                    </span>
                    <span className="nums shrink-0 text-sm font-semibold text-muted">
                      {formatDuration(row.durationSec)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
// Helpers / sub-components
// ----------------------------------------------------------------------------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-faint">
      {children}
    </p>
  )
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <Card className="flex flex-col gap-2 p-4 animate-scale-in">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 text-accent">
        {icon}
      </span>
      <span className="nums text-2xl font-bold leading-none text-ink">
        {value}
      </span>
      <span className="text-xs font-medium text-muted">{label}</span>
    </Card>
  )
}

/** Sum focus minutes for a half-open [from, to) ms window. */
function focusMinutesInWindow(
  sessions: Session[],
  from: number,
  to: number,
): number {
  let sec = 0
  for (const s of sessions) {
    if (s.startedAt >= from && s.startedAt < to) sec += s.durationSec
  }
  return sec / 60
}

function buildBars(
  period: StatPeriod,
  range: { from: number; to: number },
  focusSessions: Session[],
  refNow: number,
): Bar[] {
  switch (period) {
    case 'day': {
      // 24 hourly buckets, label every 6h.
      const currentHour = getHours(refNow)
      const isToday =
        startOfDay(refNow).getTime() === startOfDay(range.from).getTime()
      const buckets = new Array(24).fill(0)
      for (const s of focusSessions) {
        const h = getHours(s.startedAt)
        buckets[h] += s.durationSec / 60
      }
      return buckets.map((value, h) => ({
        value,
        label: h % 6 === 0 ? translate('stats.hourLabel', { h }) : '',
        active: isToday && h === currentHour,
      }))
    }
    case 'week': {
      // 7 daily buckets, Monday-first, labelled by weekday.
      const days = daysInRange(range)
      const todayStart = startOfDay(refNow).getTime()
      return days.map((dayStart) => {
        const value = focusMinutesInWindow(
          focusSessions,
          dayStart,
          dayStart + DAY_MS,
        )
        const wdKey = WEEKDAY_KEYS[mondayIndex(dayStart)]
        return {
          value,
          label: wdKey ? translate(wdKey) : '',
          active: dayStart === todayStart,
        }
      })
    }
    case 'month': {
      // One bucket per day; label roughly every 5 days + last.
      const days = daysInRange(range)
      const totalDays = getDaysInMonth(range.from)
      const todayStart = startOfDay(refNow).getTime()
      return days.map((dayStart) => {
        const value = focusMinutesInWindow(
          focusSessions,
          dayStart,
          dayStart + DAY_MS,
        )
        const dayOfMonth = getDate(dayStart)
        const showLabel =
          dayOfMonth === 1 ||
          dayOfMonth % 5 === 0 ||
          dayOfMonth === totalDays
        return {
          value,
          label: showLabel ? String(dayOfMonth) : '',
          active: dayStart === todayStart,
        }
      })
    }
    case 'year': {
      // 12 monthly buckets.
      const buckets = new Array(12).fill(0)
      for (const s of focusSessions) {
        const m = getMonth(s.startedAt)
        buckets[m] += s.durationSec / 60
      }
      const currentMonth = getMonth(refNow)
      return buckets.map((value, m) => ({
        value,
        label: m % 2 === 0 ? translate(`stats.mo.${m + 1}`) : '',
        active: m === currentMonth,
      }))
    }
  }
}

/**
 * Number of consecutive days (ending today) that have at least one completed
 * focus session. If today has none, the streak is broken (0).
 */
function computeStreak(allSessions: Session[], refNow: number): number {
  const days = new Set<number>()
  for (const s of allSessions) {
    if (s.mode === 'focus' && s.completed) {
      days.add(startOfDay(s.startedAt).getTime())
    }
  }
  if (days.size === 0) return 0

  let streak = 0
  let cursor = startOfDay(refNow).getTime()
  while (days.has(cursor)) {
    streak += 1
    cursor = startOfDay(cursor - DAY_MS).getTime()
  }
  return streak
}
