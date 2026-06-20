import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import type { TimerMode } from '../types'
import { mmss } from './format'

// Native (Capacitor) alarm + controls. On a real device:
//  - the timer schedules an OS alarm at the segment end (fires in background), and
//  - shows an ongoing notification with 일시정지/시작/종료 action buttons so the
//    user can control the timer without opening the app.
// On the web these are all no-ops (the app uses the Web Notification fallback).

const END_ID = 1
const CONTROL_ID = 2

const MODE_KO: Record<TimerMode, string> = {
  focus: '집중',
  short: '짧은 휴식',
  long: '긴 휴식',
}

export function isNativeRuntime(): boolean {
  return Capacitor.isNativePlatform()
}

export async function requestNativeNotifPermission(): Promise<boolean> {
  try {
    const res = await LocalNotifications.requestPermissions()
    return res.display === 'granted'
  } catch {
    return false
  }
}

function endMessage(mode: TimerMode): { title: string; body: string } {
  if (mode === 'focus') {
    return { title: '집중 완료! 🎉', body: '휴식 시간이에요. 잠시 쉬어가세요.' }
  }
  return { title: '휴식 끝!', body: '다시 집중할 시간이에요.' }
}

/** Schedule the end-of-segment alarm at `atMs` (epoch). Replaces any pending one. */
export async function scheduleTimerEnd(
  atMs: number,
  mode: TimerMode,
): Promise<void> {
  if (!isNativeRuntime()) return
  const { title, body } = endMessage(mode)
  try {
    await LocalNotifications.cancel({ notifications: [{ id: END_ID }] })
    await LocalNotifications.schedule({
      notifications: [
        {
          id: END_ID,
          title,
          body,
          schedule: { at: new Date(atMs), allowWhileIdle: true },
        },
      ],
    })
  } catch {
    /* permission denied or unsupported */
  }
}

/** Cancel the pending end-of-segment alarm (on pause / reset / skip / complete). */
export async function cancelTimerEnd(): Promise<void> {
  if (!isNativeRuntime()) return
  try {
    await LocalNotifications.cancel({ notifications: [{ id: END_ID }] })
  } catch {
    /* nothing scheduled */
  }
}

// ---------------------------------------------------------------------------
// Ongoing control notification with action buttons
// ---------------------------------------------------------------------------

export interface NotifActionHandlers {
  pause: () => void
  resume: () => void
  stop: () => void
}

let actionsReady = false

/** Registers action types + the action listener once (call from timer init). */
export async function initNativeNotificationActions(
  handlers: NotifActionHandlers,
): Promise<void> {
  if (!isNativeRuntime() || actionsReady) return
  actionsReady = true
  try {
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: 'POMO_RUN',
          actions: [
            { id: 'pause', title: '일시정지' },
            { id: 'stop', title: '종료' },
          ],
        },
        {
          id: 'POMO_PAUSED',
          actions: [
            { id: 'resume', title: '시작' },
            { id: 'stop', title: '종료' },
          ],
        },
      ],
    })
    await LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (event) => {
        switch (event.actionId) {
          case 'pause':
            handlers.pause()
            break
          case 'resume':
            handlers.resume()
            break
          case 'stop':
            handlers.stop()
            break
        }
      },
    )
  } catch {
    /* ignore */
  }
}

async function showControl(
  mode: TimerMode,
  remainingSec: number,
  paused: boolean,
): Promise<void> {
  if (!isNativeRuntime()) return
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: CONTROL_ID,
          title: paused
            ? `${MODE_KO[mode]} · 일시정지됨`
            : `${MODE_KO[mode]} 진행 중`,
          body: `${mmss(remainingSec)} 남음`,
          actionTypeId: paused ? 'POMO_PAUSED' : 'POMO_RUN',
          ongoing: !paused,
          autoCancel: false,
        },
      ],
    })
  } catch {
    /* permission denied or unsupported */
  }
}

export function showRunningNotification(
  mode: TimerMode,
  remainingSec: number,
): Promise<void> {
  return showControl(mode, remainingSec, false)
}

export function showPausedNotification(
  mode: TimerMode,
  remainingSec: number,
): Promise<void> {
  return showControl(mode, remainingSec, true)
}

export async function clearRunningNotification(): Promise<void> {
  if (!isNativeRuntime()) return
  try {
    await LocalNotifications.cancel({ notifications: [{ id: CONTROL_ID }] })
  } catch {
    /* nothing to clear */
  }
}
