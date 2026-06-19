/** Seconds -> "MM:SS" (zero padded, tabular friendly). */
export function mmss(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

/** Seconds -> human focus duration in Korean, e.g. "1시간 25분", "25분", "40초". */
export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec))
  if (s < 60) return `${s}초`
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return m > 0 ? `${h}시간 ${m}분` : `${h}시간`
  return `${m}분`
}

/** Minutes -> "1시간 30분" style (used for stats totals). */
export function formatMinutes(totalMin: number): string {
  return formatDuration(Math.round(totalMin) * 60)
}

/** Compact hours string for charts, e.g. "1.5h". */
export function hoursLabel(totalSec: number): string {
  const h = totalSec / 3600
  if (h === 0) return '0'
  if (h < 1) return `${Math.round(totalSec / 60)}m`
  return `${h.toFixed(h < 10 ? 1 : 0)}h`
}
