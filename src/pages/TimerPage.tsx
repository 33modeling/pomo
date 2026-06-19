import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Check,
  ListTodo,
  Music2,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  X,
} from 'lucide-react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { Header } from '../components/Header'
import { IconButton } from '../components/IconButton'
import { ProgressRing } from '../components/ProgressRing'
import { SegmentedControl } from '../components/SegmentedControl'
import { Sheet } from '../components/Sheet'
import { db } from '../db/db'
import { focusCountToday } from '../db/repo'
import { mmss } from '../lib/format'
import { cn } from '../lib/cn'
import { MODE_LABEL, useTimerStore } from '../store/timerStore'
import { useSettingsStore } from '../store/settingsStore'
import type { TimerMode } from '../types'
import { SoundsSheet } from './SoundsSheet'

const MODE_OPTIONS: { value: TimerMode; label: string }[] = [
  { value: 'focus', label: '집중' },
  { value: 'short', label: '짧은 휴식' },
  { value: 'long', label: '긴 휴식' },
]

export function TimerPage() {
  const [soundsOpen, setSoundsOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const mode = useTimerStore((s) => s.mode)
  const status = useTimerStore((s) => s.status)
  const totalSec = useTimerStore((s) => s.totalSec)
  const remainingSec = useTimerStore((s) => s.remainingSec)
  const activeTaskId = useTimerStore((s) => s.activeTaskId)
  const completedFocusInCycle = useTimerStore((s) => s.completedFocusInCycle)

  const setMode = useTimerStore((s) => s.setMode)
  const toggle = useTimerStore((s) => s.toggle)
  const reset = useTimerStore((s) => s.reset)
  const skip = useTimerStore((s) => s.skip)
  const selectTask = useTimerStore((s) => s.selectTask)

  const longBreakInterval = useSettingsStore((s) => s.longBreakInterval)
  const dailyGoal = useSettingsStore((s) => s.dailyGoal)

  const running = status === 'running'

  const activeTask = useLiveQuery(
    () => (activeTaskId ? db.tasks.get(activeTaskId) : undefined),
    [activeTaskId],
  )

  const incompleteTasks =
    useLiveQuery(async () => {
      const all = await db.tasks.toArray()
      return all
        .filter((t) => !t.completed)
        .sort((a, b) => a.order - b.order)
    }, []) ?? []

  const todayCount = useLiveQuery(() => focusCountToday(), []) ?? 0

  const progress = totalSec > 0 ? (totalSec - remainingSec) / totalSec : 0
  const goalRatio = dailyGoal > 0 ? Math.min(1, todayCount / dailyGoal) : 0

  function handleMode(next: TimerMode) {
    if (running) return
    setMode(next)
  }

  function handlePick(id: string) {
    selectTask(id)
    setPickerOpen(false)
  }

  return (
    <div className="flex flex-col pb-8">
      <Header
        title="Pomo"
        right={
          <IconButton label="사운드" onClick={() => setSoundsOpen(true)}>
            <Music2 size={20} strokeWidth={2} />
          </IconButton>
        }
      />

      <div className="px-5">
        <SegmentedControl
          options={MODE_OPTIONS}
          value={mode}
          onChange={handleMode}
          className={cn('mt-1', running && 'pointer-events-none opacity-50')}
        />
      </div>

      {/* Timer ring */}
      <ProgressRing
        progress={progress}
        stroke={5}
        className="mx-auto mt-8 w-72"
      >
        <div className="flex flex-col items-center">
          <span className="nums text-6xl font-bold leading-none text-ink">
            {mmss(remainingSec)}
          </span>
          <span className="mt-3 text-sm font-medium text-muted">
            {MODE_LABEL[mode]}
          </span>
          <div className="mt-4 flex items-center gap-1.5" aria-label="라운드 표시">
            {Array.from({ length: Math.max(1, longBreakInterval) }).map(
              (_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1.5 w-1.5 rounded-full transition-colors',
                    i < completedFocusInCycle ? 'bg-accent' : 'bg-line',
                  )}
                />
              ),
            )}
          </div>
        </div>
      </ProgressRing>

      {/* Current task */}
      <div className="mt-8 px-5">
        {activeTask ? (
          <Card className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-ink">
                {activeTask.title}
              </p>
              <p className="nums mt-0.5 text-sm text-muted">
                🍅 {activeTask.completedPomos}/{activeTask.estimatedPomos}
              </p>
            </div>
            <IconButton
              label="작업 해제"
              onClick={() => selectTask(null)}
              className="shrink-0"
            >
              <X size={18} strokeWidth={2.25} />
            </IconButton>
          </Card>
        ) : (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="mx-auto flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2 text-sm font-medium text-muted transition hover:text-ink active:bg-line"
          >
            <ListTodo size={16} strokeWidth={2} />
            작업 선택
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="mt-8 flex items-center justify-center gap-5">
        {status !== 'idle' && (
          <IconButton
            label="초기화"
            onClick={reset}
            className="h-12 w-12 bg-surface-2 text-muted hover:text-ink"
          >
            <RotateCcw size={20} strokeWidth={2} />
          </IconButton>
        )}

        <Button
          variant="primary"
          size="lg"
          onClick={toggle}
          className="min-w-[160px]"
        >
          {running ? (
            <>
              <Pause size={20} strokeWidth={2.25} />
              일시정지
            </>
          ) : (
            <>
              <Play size={20} strokeWidth={2.25} />
              시작
            </>
          )}
        </Button>

        {status !== 'idle' && (
          <IconButton
            label="건너뛰기"
            onClick={skip}
            className="h-12 w-12 bg-surface-2 text-muted hover:text-ink"
          >
            <SkipForward size={20} strokeWidth={2} />
          </IconButton>
        )}
      </div>

      {/* Today's progress */}
      <div className="mt-10 px-5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-muted">오늘</span>
          <span className="nums text-sm text-muted">
            <span className="font-semibold text-ink">{todayCount}</span> /{' '}
            {dailyGoal} 뽀모도로
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
            style={{ width: `${goalRatio * 100}%` }}
          />
        </div>
      </div>

      {/* Task picker */}
      <Sheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="작업 선택"
      >
        {incompleteTasks.length === 0 ? (
          <EmptyState
            icon={<ListTodo size={32} strokeWidth={1.75} />}
            title="할 일이 없어요"
            hint="할 일 탭에서 작업을 추가해 보세요."
          />
        ) : (
          <ul className="flex flex-col gap-1">
            {incompleteTasks.map((task) => {
              const selected = task.id === activeTaskId
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => handlePick(task.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition',
                      selected ? 'bg-accent/10' : 'hover:bg-surface-2',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'truncate text-[15px] font-medium',
                          selected ? 'text-accent' : 'text-ink',
                        )}
                      >
                        {task.title}
                      </p>
                      <p className="nums mt-0.5 text-xs text-muted">
                        🍅 {task.completedPomos}/{task.estimatedPomos}
                      </p>
                    </div>
                    {selected && (
                      <Check
                        size={18}
                        strokeWidth={2.5}
                        className="shrink-0 text-accent"
                      />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Sheet>

      <SoundsSheet open={soundsOpen} onClose={() => setSoundsOpen(false)} />
    </div>
  )
}
