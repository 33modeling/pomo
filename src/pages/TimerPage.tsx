import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Check,
  ListTodo,
  Maximize2,
  Music2,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  X,
} from 'lucide-react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Confetti } from '../components/Confetti'
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
import { useTimerStore } from '../store/timerStore'
import { useSettingsStore } from '../store/settingsStore'
import { useUiStore } from '../store/uiStore'
import type { TimerMode } from '../types'
import { useT } from '../i18n'
import { SoundsSheet } from './SoundsSheet'

const MODE_VALUES: TimerMode[] = ['focus', 'short', 'long']

export function TimerPage() {
  const t = useT()
  const modeOptions = MODE_VALUES.map((value) => ({
    value,
    label: t(`mode.${value}`),
  }))

  const [soundsOpen, setSoundsOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [celebrate, setCelebrate] = useState(false)

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

  const focusMin = useSettingsStore((s) => s.focusMin)
  const shortMin = useSettingsStore((s) => s.shortMin)
  const longMin = useSettingsStore((s) => s.longMin)
  const longBreakInterval = useSettingsStore((s) => s.longBreakInterval)
  const dailyGoal = useSettingsStore((s) => s.dailyGoal)
  const timerPresets = useSettingsStore((s) => s.timerPresets)
  const update = useSettingsStore((s) => s.update)
  const openClock = useUiStore((s) => s.openClock)

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

  // Celebrate once when the daily goal is first reached today.
  useEffect(() => {
    if (dailyGoal <= 0 || todayCount < dailyGoal) return
    const today = new Date().toDateString()
    if (localStorage.getItem('pomo-goal-day') === today) return
    localStorage.setItem('pomo-goal-day', today)
    setCelebrate(true)
  }, [todayCount, dailyGoal])

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
          <>
            <IconButton label={t('timer.clock')} onClick={openClock}>
              <Maximize2 size={20} strokeWidth={2} />
            </IconButton>
            <IconButton label={t('timer.sounds')} onClick={() => setSoundsOpen(true)}>
              <Music2 size={20} strokeWidth={2} />
            </IconButton>
          </>
        }
      />

      <div className="px-5">
        <SegmentedControl
          options={modeOptions}
          value={mode}
          onChange={handleMode}
          className={cn('mt-1', running && 'pointer-events-none opacity-50')}
        />

        {status === 'idle' && timerPresets.length > 0 && (
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            {timerPresets.map((preset) => {
              const active =
                preset.focusMin === focusMin &&
                preset.shortMin === shortMin &&
                preset.longMin === longMin &&
                preset.longBreakInterval === longBreakInterval
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() =>
                    update({
                      focusMin: preset.focusMin,
                      shortMin: preset.shortMin,
                      longMin: preset.longMin,
                      longBreakInterval: preset.longBreakInterval,
                    })
                  }
                  className={cn(
                    'shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition',
                    active
                      ? 'bg-accent text-on-accent'
                      : 'bg-surface-2 text-muted hover:text-ink',
                  )}
                >
                  {t(preset.name)}
                </button>
              )
            })}
          </div>
        )}
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
            {t(`mode.${mode}`)}
          </span>
          <div className="mt-4 flex items-center gap-1.5" aria-label={t('timer.rounds')}>
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
              label={t('timer.clearTask')}
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
            {t('timer.selectTask')}
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="mt-8 flex items-center justify-center gap-5">
        {status !== 'idle' && (
          <IconButton
            label={t('timer.reset')}
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
              {t('timer.pause')}
            </>
          ) : (
            <>
              <Play size={20} strokeWidth={2.25} />
              {t('timer.start')}
            </>
          )}
        </Button>

        {status !== 'idle' && (
          <IconButton
            label={t('timer.skip')}
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
          <span className="text-sm font-medium text-muted">{t('timer.today')}</span>
          <span className="nums text-sm text-muted">
            <span className="font-semibold text-ink">{todayCount}</span> /{' '}
            {dailyGoal} {t('timer.pomoUnit')}
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
        title={t('timer.selectTask')}
      >
        {incompleteTasks.length === 0 ? (
          <EmptyState
            icon={<ListTodo size={32} strokeWidth={1.75} />}
            title={t('timer.empty.title')}
            hint={t('timer.empty.hint')}
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

      <Confetti show={celebrate} onDone={() => setCelebrate(false)} />
    </div>
  )
}
