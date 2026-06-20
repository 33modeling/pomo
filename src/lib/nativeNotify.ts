import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import type { Task, TimerMode } from '../types'
import { mmss } from './format'
import { t } from '../i18n'

// Native (Capacitor) alarm + controls. On a real device:
//  - the timer schedules an OS alarm at the segment end (fires in background), and
//  - shows an ongoing notification with 일시정지/시작/종료 action buttons so the
//    user can control the timer without opening the app.
// On the web these are all no-ops (the app uses the Web Notification fallback).

const END_ID = 1
const CONTROL_ID = 2

// Stable positive 32-bit notification id for a task (kept away from the
// timer's reserved ids 1 and 2).
function taskNotifId(taskId: string): number {
  let h = 5381
  for (let i = 0; i < taskId.length; i++) h = (h * 33) ^ taskId.charCodeAt(i)
  return (Math.abs(h) % 2_000_000_000) + 1000
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
    return {
      title: t('notif.focusDone.title'),
      body: t('notif.focusDone.body', { mode: t('mode.short') }),
    }
  }
  return { title: t('notif.breakDone.title'), body: t('notif.breakDone.body') }
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
            { id: 'pause', title: t('notif.action.pause') },
            { id: 'stop', title: t('notif.action.stop') },
          ],
        },
        {
          id: 'POMO_PAUSED',
          actions: [
            { id: 'resume', title: t('notif.action.resume') },
            { id: 'stop', title: t('notif.action.stop') },
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
          title: t(paused ? 'notif.paused' : 'notif.running', {
            mode: t(`mode.${mode}`),
          }),
          body: t('notif.remaining', { time: mmss(remainingSec) }),
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

// ---------------------------------------------------------------------------
// Task due reminders
// ---------------------------------------------------------------------------

/** Schedule (or cancel) a task's reminder based on its remindAt / completed. */
export async function scheduleTaskReminder(task: Task): Promise<void> {
  if (!isNativeRuntime()) return
  const id = taskNotifId(task.id)
  try {
    await LocalNotifications.cancel({ notifications: [{ id }] })
    if (!task.completed && task.remindAt != null && task.remindAt > Date.now()) {
      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title: t('notif.task.title', { title: task.title }),
            body: t('notif.task.body'),
            schedule: { at: new Date(task.remindAt), allowWhileIdle: true },
          },
        ],
      })
    }
  } catch {
    /* permission denied or unsupported */
  }
}

export async function cancelTaskReminder(taskId: string): Promise<void> {
  if (!isNativeRuntime()) return
  try {
    await LocalNotifications.cancel({ notifications: [{ id: taskNotifId(taskId) }] })
  } catch {
    /* nothing scheduled */
  }
}

/** Re-arm all future task reminders (call once on startup). */
export async function syncAllTaskReminders(tasks: Task[]): Promise<void> {
  if (!isNativeRuntime()) return
  for (const t of tasks) {
    if (!t.completed && t.remindAt != null && t.remindAt > Date.now()) {
      await scheduleTaskReminder(t)
    }
  }
}
