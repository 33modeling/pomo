import type { Priority } from '../types'

/** Curated palette for projects — refined, works in both themes. */
export const PROJECT_COLORS = [
  '#eb5447', // tomato
  '#f59e0b', // amber
  '#10b981', // emerald
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#64748b', // slate
  '#a3a3a3', // gray
] as const

export const PRIORITY_META: Record<
  Priority,
  { label: string; color: string; rank: number }
> = {
  high: { label: '높음', color: '#ef4444', rank: 3 },
  medium: { label: '보통', color: '#f59e0b', rank: 2 },
  low: { label: '낮음', color: '#3b82f6', rank: 1 },
  none: { label: '없음', color: '#94a3b8', rank: 0 },
}

export const INBOX_PROJECT_ID = 'inbox'
export const INBOX_NAME = '받은 함'
export const INBOX_COLOR = '#64748b'
