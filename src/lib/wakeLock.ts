// Keeps the screen awake during a running timer (best-effort; ignored where
// the Screen Wake Lock API is unavailable).

type Sentinel = {
  release: () => Promise<void>
  addEventListener?: (type: string, cb: () => void) => void
}

let sentinel: Sentinel | null = null
let wanted = false

interface WakeLockNavigator {
  wakeLock?: { request: (type: 'screen') => Promise<Sentinel> }
}

export async function requestWakeLock(): Promise<void> {
  wanted = true
  const nav = navigator as Navigator & WakeLockNavigator
  if (!nav.wakeLock) return
  try {
    sentinel = await nav.wakeLock.request('screen')
    sentinel.addEventListener?.('release', () => {
      sentinel = null
    })
  } catch {
    sentinel = null
  }
}

export async function releaseWakeLock(): Promise<void> {
  wanted = false
  try {
    await sentinel?.release()
  } catch {
    /* noop */
  } finally {
    sentinel = null
  }
}

/** Re-acquire the lock when the page becomes visible again (it auto-releases). */
export function initWakeLockResume(): void {
  document.addEventListener('visibilitychange', () => {
    if (wanted && !sentinel && document.visibilityState === 'visible') {
      void requestWakeLock()
    }
  })
}
