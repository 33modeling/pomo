import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import type { TimerMode } from '../types'

// Native (Capacitor) alarm support. On a real device the timer schedules an OS
// local notification for the segment's end time, so the alarm fires even when
// the app is backgrounded or the screen is off. On the web these are no-ops and
// the app falls back to the Web Notification path in lib/notifications.ts.

const END_ID = 1

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
