/** Returns true when notifications are usable (permission granted). */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try {
    const res = await Notification.requestPermission()
    return res === 'granted'
  } catch {
    return false
  }
}

export function notificationsGranted(): boolean {
  return (
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  )
}

/** Shows a notification, preferring the service-worker registration. */
export function notify(title: string, body: string): void {
  if (!notificationsGranted()) return
  const options: NotificationOptions = {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'pomo-timer',
    silent: false,
  }
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => reg.showNotification(title, options))
        .catch(() => {
          new Notification(title, options)
        })
      return
    }
    new Notification(title, options)
  } catch {
    /* notifications unavailable */
  }
}
