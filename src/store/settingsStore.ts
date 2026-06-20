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
      version: 2,
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
