import { t } from '../i18n'

/** Seconds -> "MM:SS" (zero padded, tabular friendly). */
export function mmss(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

/** Seconds -> localized human focus duration, e.g. "1h 25m" / "1시간 25분". */
export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec))
  if (s < 60) return t('dur.sec', { s })
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return m > 0 ? t('dur.hourMin', { h, m }) : t('dur.hour', { h })
  return t('dur.min', { m })
}

/** Minutes -> localized duration (used for stats totals). */
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
