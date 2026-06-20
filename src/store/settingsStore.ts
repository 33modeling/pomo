import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Settings, TimerMode } from '../types'

export const DEFAULT_SETTINGS: Settings = {
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  longBreakInterval: 4,

  autoStartBreaks: false,
  autoStartFocus: false,

  dailyGoal: 8,

  soundEnabled: true,
  alarmSound: 'bell',
  alarmVolume: 0.7,

  tickingEnabled: false,
  tickingVolume: 0.4,
  soundMix: {},
  soundAutoStopMin: 0,

  vibrationEnabled: true,
  notificationsEnabled: true,
  keepAwake: true,

  clockOnStart: false,

  // Built-in preset names are i18n keys (resolved with t(); custom names pass through).
  timerPresets: [
    { name: 'preset.classic', focusMin: 25, shortMin: 5, longMin: 15, longBreakInterval: 4 },
    { name: 'preset.longFocus', focusMin: 50, shortMin: 10, longMin: 20, longBreakInterval: 3 },
    { name: 'preset.deepWork', focusMin: 90, shortMin: 20, longMin: 30, longBreakInterval: 2 },
  ],
  soundPresets: [],
}

interface SettingsState extends Settings {
  update: (patch: Partial<Settings>) => void
  reset: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
      reset: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: 'pomo-settings',
      version: 3,
      migrate: (persisted, version) => {
        const s = persisted as Record<string, unknown>
        if (version < 2) {
          // Old single-noise model -> new sound mix.
          const mix: Record<string, number> = {}
          const old = s.whiteNoise as string | undefined
          if (old && old !== 'none') {
            mix[old] = (s.whiteNoiseVolume as number | undefined) ?? 0.5
          }
          s.soundMix = mix
          s.soundAutoStopMin = 0
          delete s.whiteNoise
          delete s.whiteNoiseVolume
        }
        if (version < 3) {
          // Built-in preset names became i18n keys.
          const map: Record<string, string> = {
            클래식: 'preset.classic',
            '길게 집중': 'preset.longFocus',
            '딥 워크': 'preset.deepWork',
          }
          if (Array.isArray(s.timerPresets)) {
            s.timerPresets = (s.timerPresets as { name: string }[]).map((p) => ({
              ...p,
              name: map[p.name] ?? p.name,
            }))
          }
        }
        return s as unknown as SettingsState
      },
    },
  ),
)

/** Planned segment length in seconds for a given mode. */
export function durationSecFor(s: Settings, mode: TimerMode): number {
  const min =
    mode === 'focus' ? s.focusMin : mode === 'short' ? s.shortMin : s.longMin
  return Math.max(1, Math.round(min * 60))
}
