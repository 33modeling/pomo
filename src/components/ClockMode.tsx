import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Pause, Play, RotateCcw, SkipForward, X } from 'lucide-react'
import { cn } from '../lib/cn'
import { mmss } from '../lib/format'
import { releaseWakeLock, requestWakeLock } from '../lib/wakeLock'
import { db } from '../db/db'
import { MODE_LABEL, useTimerStore } from '../store/timerStore'
import { useUiStore } from '../store/uiStore'

/**
 * Full-screen "desk clock" mode: a large, glanceable countdown for when you
 * set the phone down on your desk. The wall-clock time stays small in the
 * corner; the focus countdown is the dominant element. Controls auto-hide.
 */
export function ClockMode() {
  const open = useUiStore((s) => s.clockOpen)
  const close = useUiStore((s) => s.closeClock)

  const mode = useTimerStore((s) => s.mode)
  const status = useTimerStore((s) => s.status)
  const remainingSec = useTimerStore((s) => s.remainingSec)
  const totalSec = useTimerStore((s) => s.totalSec)
  const activeTaskId = useTimerStore((s) => s.activeTaskId)
  const toggle = useTimerStore((s) => s.toggle)
  const reset = useTimerStore((s) => s.reset)
  const skip = useTimerStore((s) => s.skip)

  const [now, setNow] = useState(() => new Date())
  const [controls, setControls] = useState(true)
  const hideTimer = useRef<number | null>(null)

  const activeTask = useLiveQuery(
    () => (activeTaskId ? db.tasks.get(activeTaskId) : undefined),
    [activeTaskId],
  )

  const reveal = () => {
    setControls(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setControls(false), 4000)
  }

  // Wall-clock tick (once per second) while open.
  useEffect(() => {
    if (!open) return
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [open])

  // Keep the screen lit + go full-screen for a true desk-clock feel.
  useEffect(() => {
    if (!open) return
    void requestWakeLock()
    try {
      void document.documentElement.requestFullscreen?.()
    } catch {
      /* unsupported */
    }
    reveal()
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
      if (useTimerStore.getState().status !== 'running') void releaseWakeLock()
      if (document.fullscreenElement) {
        try {
          void document.exitFullscreen?.()
        } catch {
          /* ignore */
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const running = status === 'running'
  const progress = totalSec > 0 ? (totalSec - remainingSec) / totalSec : 0
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')

  return (
    <div
      className="fixed inset-0 z-[70] flex animate-fade-in select-none flex-col items-center justify-center bg-bg"
      onClick={reveal}
    >
      {/* Top bar: small wall-clock time + exit */}
      <div
        className={cn(
          'absolute inset-x-0 top-0 flex items-center justify-between p-5 pt-safe transition-opacity duration-300',
          controls ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <button
          type="button"
          aria-label="닫기"
          onClick={(e) => {
            e.stopPropagation()
            close()
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-surface/70 text-muted backdrop-blur"
        >
          <X size={22} />
        </button>
        <span className="nums text-base font-semibold text-faint">
          {hh}:{mm}
        </span>
      </div>

      {/* Center: dominant countdown */}
      <div className="flex flex-col items-center px-6">
        <span className="text-xs font-bold uppercase tracking-[0.35em] text-accent sm:text-sm">
          {MODE_LABEL[mode]}
        </span>
        <div
          className="nums mt-3 font-bold leading-none tracking-tight text-ink"
          style={{ fontSize: 'min(33vw, 52vh)' }}
        >
          {mmss(remainingSec)}
        </div>
        {activeTask && (
          <p className="mt-5 max-w-[80vw] truncate text-center text-sm text-muted sm:text-base">
            {activeTask.title}
          </p>
        )}
      </div>

      {/* Bottom controls (auto-hide) */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 flex items-center justify-center gap-6 p-8 pb-safe transition-opacity duration-300',
          controls ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {status !== 'idle' && (
          <button
            type="button"
            aria-label="초기화"
            onClick={reset}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-muted shadow-card transition active:scale-95"
          >
            <RotateCcw size={22} />
          </button>
        )}
        <button
          type="button"
          aria-label={running ? '일시정지' : '시작'}
          onClick={() => {
            toggle()
            reveal()
          }}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-on-accent shadow-pop transition active:scale-95"
        >
          {running ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
        </button>
        {status !== 'idle' && (
          <button
            type="button"
            aria-label="건너뛰기"
            onClick={skip}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-muted shadow-card transition active:scale-95"
          >
            <SkipForward size={22} />
          </button>
        )}
      </div>

      {/* Thin ambient progress line along the very bottom */}
      <div className="absolute inset-x-0 bottom-0 h-1 bg-surface-2">
        <div
          className="h-full bg-accent transition-[width] duration-500 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  )
}
