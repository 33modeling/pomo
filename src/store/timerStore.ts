import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ID, TimerMode } from '../types'
import { audio } from '../audio/audioEngine'
import { durationSecFor, useSettingsStore } from './settingsStore'
import { applyAccentForMode } from './themeStore'
import { useUiStore } from './uiStore'
import {
  addSession,
  getTask,
  incrementTaskPomos,
} from '../db/repo'
import {
  ensureNotificationPermission,
  notify,
} from '../lib/notifications'
import {
  cancelTimerEnd,
  clearRunningNotification,
  initNativeNotificationActions,
  isNativeRuntime,
  scheduleTimerEnd,
  showPausedNotification,
  showRunningNotification,
} from '../lib/nativeNotify'
import {
  initWakeLockResume,
  releaseWakeLock,
  requestWakeLock,
} from '../lib/wakeLock'

export type TimerStatus = 'idle' | 'running' | 'paused'

interface TimerState {
  mode: TimerMode
  status: TimerStatus
  totalSec: number
  remainingSec: number
  endsAt: number | null
  startedAt: number | null
  accumulatedSec: number
  segmentStartMs: number | null
  completedFocusInCycle: number
  activeTaskId: ID | null

  // actions
  start: () => void
  pause: () => void
  toggle: () => void
  reset: () => void
  skip: () => void
  setMode: (mode: TimerMode) => void
  selectTask: (id: ID | null) => void
  syncDurations: () => void
  onVisible: () => void
  init: () => void
}

export const MODE_LABEL: Record<TimerMode, string> = {
  focus: '집중',
  short: '짧은 휴식',
  long: '긴 휴식',
}

let loop: number | null = null

function stopLoop() {
  if (loop !== null) {
    clearInterval(loop)
    loop = null
  }
}

function elapsedSec(now: number, startMs: number | null, acc: number): number {
  return acc + (startMs ? (now - startMs) / 1000 : 0)
}

const initialSettings = useSettingsStore.getState()
const initialTotal = durationSecFor(initialSettings, 'focus')

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => {
      function startLoop() {
        stopLoop()
        loop = window.setInterval(() => {
          const s = get()
          if (s.status !== 'running' || s.endsAt == null) return
          const now = Date.now()
          const remaining = Math.max(0, Math.round((s.endsAt - now) / 1000))
          if (remaining !== s.remainingSec) set({ remainingSec: remaining })
          if (now >= s.endsAt) void complete(false)
        }, 250)
      }

      function startAmbience() {
        const st = useSettingsStore.getState()
        const s = get()
        if (s.mode !== 'focus') return
        audio.unlock()
        if (st.whiteNoise !== 'none') {
          audio.setNoise(st.whiteNoise, st.whiteNoiseVolume)
        }
        if (st.tickingEnabled) {
          audio.startTicking(st.tickingVolume)
        }
      }

      function stopAmbience() {
        audio.stopNoise()
        audio.stopTicking()
      }

      function beginSegment(autoStarted: boolean) {
        const now = Date.now()
        const s = get()
        const endsAt = now + s.remainingSec * 1000
        set({
          status: 'running',
          endsAt,
          segmentStartMs: now,
          startedAt: s.startedAt ?? now,
        })
        startLoop()
        startAmbience()
        if (get().mode === 'focus' && useSettingsStore.getState().keepAwake) {
          void requestWakeLock()
        }
        void ensureNotificationPermission()
        // Native: schedule an OS alarm at the end time (fires in background)
        // and show an ongoing notification with control buttons. (No-op on web.)
        if (useSettingsStore.getState().notificationsEnabled) {
          void scheduleTimerEnd(endsAt, s.mode)
          void showRunningNotification(s.mode, s.remainingSec)
        }
        if (!autoStarted) audio.unlock()
      }

      function nextMode(mode: TimerMode, cycleAfter: number): TimerMode {
        if (mode !== 'focus') return 'focus'
        const interval = useSettingsStore.getState().longBreakInterval
        return cycleAfter % interval === 0 ? 'long' : 'short'
      }

      async function complete(silent: boolean) {
        const s = get()
        if (s.status === 'idle') return
        stopLoop()
        stopAmbience()
        void cancelTimerEnd()
        const now = Date.now()
        const focused = Math.round(
          s.mode === 'focus'
            ? s.totalSec
            : elapsedSec(now, s.segmentStartMs, s.accumulatedSec),
        )

        // Log the finished segment.
        let projectId: ID | null = null
        if (s.activeTaskId) {
          const task = await getTask(s.activeTaskId)
          projectId = task?.projectId ?? null
        }
        await addSession({
          mode: s.mode,
          taskId: s.mode === 'focus' ? s.activeTaskId : null,
          projectId: s.mode === 'focus' ? projectId : null,
          startedAt: s.startedAt ?? now - s.totalSec * 1000,
          endedAt: now,
          durationSec: s.mode === 'focus' ? s.totalSec : focused,
          plannedSec: s.totalSec,
          completed: true,
        })

        let cycle = s.completedFocusInCycle
        if (s.mode === 'focus') {
          cycle += 1
          if (s.activeTaskId) await incrementTaskPomos(s.activeTaskId)
        } else if (s.mode === 'long') {
          cycle = 0
        }

        const next = nextMode(s.mode, cycle)
        const st = useSettingsStore.getState()
        const nextTotal = durationSecFor(st, next)

        // Feedback
        if (!silent) {
          if (st.soundEnabled) audio.playAlarm(st.alarmSound, st.alarmVolume)
          if (st.vibrationEnabled && 'vibrate' in navigator) {
            navigator.vibrate(s.mode === 'focus' ? [300, 120, 300] : 200)
          }
        }
        // On native the scheduled OS alarm already fired; only the web path
        // needs an explicit notification here.
        if (st.notificationsEnabled && !isNativeRuntime()) {
          notify(
            s.mode === 'focus' ? '집중 완료! 🎉' : '휴식 끝!',
            s.mode === 'focus'
              ? `${MODE_LABEL[next]} 시간이에요. 잠시 쉬어가세요.`
              : '다시 집중할 시간이에요.',
          )
        }

        const shouldAuto =
          !silent &&
          (s.mode === 'focus' ? st.autoStartBreaks : st.autoStartFocus)

        applyAccentForMode(next)
        set({
          mode: next,
          completedFocusInCycle: cycle,
          totalSec: nextTotal,
          remainingSec: nextTotal,
          endsAt: null,
          startedAt: null,
          segmentStartMs: null,
          accumulatedSec: 0,
          status: 'idle',
        })

        // Clear the ongoing control notification; if auto-starting, the next
        // segment will post a fresh one.
        void clearRunningNotification()
        if (shouldAuto) beginSegment(true)
      }

      return {
        mode: 'focus',
        status: 'idle',
        totalSec: initialTotal,
        remainingSec: initialTotal,
        endsAt: null,
        startedAt: null,
        accumulatedSec: 0,
        segmentStartMs: null,
        completedFocusInCycle: 0,
        activeTaskId: null,

        start: () => {
          const s = get()
          if (s.status === 'running') return
          beginSegment(false)
          if (useSettingsStore.getState().clockOnStart) {
            useUiStore.getState().openClock()
          }
        },

        pause: () => {
          const s = get()
          if (s.status !== 'running') return
          stopLoop()
          stopAmbience()
          const now = Date.now()
          const remaining = s.endsAt
            ? Math.max(0, Math.round((s.endsAt - now) / 1000))
            : s.remainingSec
          set({
            status: 'paused',
            remainingSec: remaining,
            accumulatedSec: elapsedSec(now, s.segmentStartMs, s.accumulatedSec),
            segmentStartMs: null,
            endsAt: null,
          })
          void releaseWakeLock()
          void cancelTimerEnd()
          void showPausedNotification(s.mode, remaining)
        },

        toggle: () => {
          const s = get()
          if (s.status === 'running') get().pause()
          else get().start()
        },

        reset: () => {
          const s = get()
          stopLoop()
          stopAmbience()
          void releaseWakeLock()
          void cancelTimerEnd()
          void clearRunningNotification()
          // Log a meaningful partial focus session.
          if (s.mode === 'focus' && s.status !== 'idle') {
            const now = Date.now()
            const focused = Math.round(
              elapsedSec(now, s.segmentStartMs, s.accumulatedSec),
            )
            if (focused >= 60) {
              void (async () => {
                let projectId: ID | null = null
                if (s.activeTaskId) {
                  const task = await getTask(s.activeTaskId)
                  projectId = task?.projectId ?? null
                }
                await addSession({
                  mode: 'focus',
                  taskId: s.activeTaskId,
                  projectId,
                  startedAt: s.startedAt ?? now - focused * 1000,
                  endedAt: now,
                  durationSec: focused,
                  plannedSec: s.totalSec,
                  completed: false,
                })
              })()
            }
          }
          set({
            status: 'idle',
            remainingSec: s.totalSec,
            endsAt: null,
            startedAt: null,
            segmentStartMs: null,
            accumulatedSec: 0,
          })
        },

        skip: () => {
          // Advance to the next segment without counting the current one.
          const s = get()
          stopLoop()
          stopAmbience()
          void releaseWakeLock()
          void cancelTimerEnd()
          void clearRunningNotification()
          let cycle = s.completedFocusInCycle
          if (s.mode === 'long') cycle = 0
          // Skipping focus does not bump the cycle count.
          const next: TimerMode = s.mode === 'focus' ? 'short' : 'focus'
          const st = useSettingsStore.getState()
          const total = durationSecFor(st, next)
          applyAccentForMode(next)
          set({
            mode: next,
            completedFocusInCycle: cycle,
            totalSec: total,
            remainingSec: total,
            status: 'idle',
            endsAt: null,
            startedAt: null,
            segmentStartMs: null,
            accumulatedSec: 0,
          })
        },

        setMode: (mode) => {
          const s = get()
          if (s.status === 'running') return
          const total = durationSecFor(useSettingsStore.getState(), mode)
          applyAccentForMode(mode)
          set({
            mode,
            totalSec: total,
            remainingSec: total,
            status: 'idle',
            endsAt: null,
            startedAt: null,
            segmentStartMs: null,
            accumulatedSec: 0,
          })
        },

        selectTask: (id) => set({ activeTaskId: id }),

        syncDurations: () => {
          const s = get()
          if (s.status !== 'idle') return
          const total = durationSecFor(useSettingsStore.getState(), s.mode)
          set({ totalSec: total, remainingSec: total })
        },

        onVisible: () => {
          const s = get()
          if (s.status === 'running' && s.endsAt != null) {
            const now = Date.now()
            const remaining = Math.max(0, Math.round((s.endsAt - now) / 1000))
            set({ remainingSec: remaining })
            if (now >= s.endsAt) void complete(false)
          }
        },

        init: () => {
          applyAccentForMode(get().mode)
          initWakeLockResume()

          // Wire notification action buttons (시작/일시정지/종료) to the timer.
          void initNativeNotificationActions({
            pause: () => get().pause(),
            resume: () => get().start(),
            stop: () => get().reset(),
          })

          // Reconcile a timer that was running before a reload.
          const s = get()
          if (s.status === 'running') {
            const now = Date.now()
            if (s.endsAt != null && now >= s.endsAt) {
              void complete(true)
            } else if (s.endsAt != null) {
              const remaining = Math.max(0, Math.round((s.endsAt - now) / 1000))
              set({
                status: 'paused',
                remainingSec: remaining,
                accumulatedSec: Math.max(0, s.totalSec - remaining),
                segmentStartMs: null,
                endsAt: null,
              })
            }
          }

          // Keep idle durations in sync with settings changes.
          useSettingsStore.subscribe(() => get().syncDurations())

          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') get().onVisible()
          })
        },
      }
    },
    {
      name: 'pomo-timer',
      version: 1,
      partialize: (s) => ({
        mode: s.mode,
        status: s.status,
        totalSec: s.totalSec,
        remainingSec: s.remainingSec,
        endsAt: s.endsAt,
        startedAt: s.startedAt,
        accumulatedSec: s.accumulatedSec,
        segmentStartMs: s.segmentStartMs,
        completedFocusInCycle: s.completedFocusInCycle,
        activeTaskId: s.activeTaskId,
      }),
    },
  ),
)
