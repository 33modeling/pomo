import { create } from 'zustand'
import type { Theme, TimerMode } from '../types'

const STORAGE_KEY = 'pomo-theme'

interface ThemeState {
  theme: Theme
  isDark: boolean
  setTheme: (theme: Theme) => void
}

function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

function resolveDark(theme: Theme): boolean {
  return theme === 'dark' || (theme === 'system' && systemPrefersDark())
}

function setThemeColorMeta(isDark: boolean) {
  const color = isDark ? '#0a0a0e' : '#f7f7f9'
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute('content', color))
}

function applyDark(isDark: boolean) {
  document.documentElement.classList.toggle('dark', isDark)
  setThemeColorMeta(isDark)
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: (typeof localStorage !== 'undefined'
    ? (localStorage.getItem(STORAGE_KEY) as Theme | null)
    : null) ?? 'system',
  isDark: false,
  setTheme: (theme) => {
    localStorage.setItem(STORAGE_KEY, theme)
    const isDark = resolveDark(theme)
    applyDark(isDark)
    set({ theme, isDark })
  },
}))

/** Maps a timer mode to its accent CSS variable. */
export function applyAccentForMode(mode: TimerMode): void {
  const varName =
    mode === 'focus' ? '--focus' : mode === 'short' ? '--short' : '--long'
  document.documentElement.style.setProperty('--accent', `var(${varName})`)
}

/** Called once at startup (from main.tsx) before React renders. */
export function initTheme(): void {
  const theme = useThemeStore.getState().theme
  const isDark = resolveDark(theme)
  applyDark(isDark)
  useThemeStore.setState({ isDark })
  applyAccentForMode('focus')

  // React to system theme changes while in "system" mode.
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      const t = useThemeStore.getState().theme
      if (t === 'system') {
        const d = systemPrefersDark()
        applyDark(d)
        useThemeStore.setState({ isDark: d })
      }
    })
}
