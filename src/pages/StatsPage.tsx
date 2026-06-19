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
import { rangeFor, daysInRange, type StatPeriod } from '../lib/dates'
import { formatDuration } from '../lib/format'
import { INBOX_NAME, INBOX_COLOR } from '../lib/constants'
import type { ID, Session } from '../types'

import { Header } from '../components/Header'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { SegmentedControl } from '../components/SegmentedControl'
import { BarChart, type Bar } from '../components/stats/BarChart'

const PERIOD_OPTIONS: { value: StatPeriod; label: string }[] = [
  { value: 'day', label: '오늘' },
  { value: 'week', label: '이번 주' },
  { value: 'month', label: '이번 달' },
  { value: 'year', label: '올해' },
]

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] // Monday-first
const MONTH_LABELS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
]

const DAY_MS = 24 * 60 * 60 * 1000

/** Index 0..6 with Monday = 0 (date-fns getDay returns Sunday = 0). */
function mondayIndex(ms: number): number {
  const d = new Date(ms).getDay() // 0 = Sun .. 6 = Sat
  return (d + 6) % 7
}

export function StatsPage() {
  const [period, setPeriod] = useState<StatPeriod>('day')
  // Stable "now" reference so range + buckets don't drift across renders.
  const [refNow] = useState(() => Date.now())

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
    [period, range, focusSessions, refNow],
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
        return { key, name: INBOX_NAME, color: INBOX_COLOR, sec }
      }
      const meta = projectName.get(key)
      return {
        key,
        name: meta?.name ?? '삭제된 프로젝트',
        color: meta?.color ?? INBOX_COLOR,
        sec,
      }
    })
    return rows.sort((a, b) => b.sec - a.sec)
  }, [focusSessions, projectName])

  const distMax = distribution[0]?.sec ?? 0
  const hasAnySession = sessions.length > 0

  return (
    <div className="flex flex-col gap-5 px-5 pb-8">
      <Header title="통계" />

      <SegmentedControl
        options={PERIOD_OPTIONS}
        value={period}
        onChange={setPeriod}
        className="animate-fade-in"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard
          icon={<Clock size={18} strokeWidth={2.2} />}
          label="집중 시간"
          value={focusSec > 0 ? formatDuration(focusSec) : '0분'}
        />
        <SummaryCard
          icon={<Flame size={18} strokeWidth={2.2} />}
          label="완료 뽀모도로"
          value={`${completedPomos}회`}
        />
        <SummaryCard
          icon={<CheckCircle2 size={18} strokeWidth={2.2} />}
          label="완료한 일"
          value={`${completedTasks}개`}
        />
        <SummaryCard
          icon={<Target size={18} strokeWidth={2.2} />}
          label="연속"
          value={`${streak}일`}
        />
      </div>

      {!hasAnySession ? (
        <Card className="animate-fade-in">
          <EmptyState
            icon={<BarChart3 size={40} strokeWidth={1.5} />}
            title="아직 기록이 없어요"
            hint="이 기간에 완료한 집중 세션이 없습니다. 타이머를 시작해 첫 기록을 남겨보세요."
          />
        </Card>
      ) : (
        <>
          {/* Bar chart */}
          <Card className="flex flex-col gap-4 p-5 animate-fade-in">
            <SectionTitle>집중 추이</SectionTitle>
            <BarChart bars={bars} unit="분" />
          </Card>

          {/* Project distribution */}
          <Card className="flex flex-col gap-4 p-5 animate-fade-in">
            <SectionTitle>프로젝트별 집중</SectionTitle>
            {distribution.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">
                집중 기록이 없어요.
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
        label: h % 6 === 0 ? `${h}시` : '',
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
        return {
          value,
          label: WEEKDAY_LABELS[mondayIndex(dayStart)] ?? '',
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
        label: m % 2 === 0 ? MONTH_LABELS[m] : '',
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
