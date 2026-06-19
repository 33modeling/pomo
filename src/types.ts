// ----------------------------------------------------------------------------
// Shared domain types for the whole app. Keep this the single source of truth.
// ----------------------------------------------------------------------------

export type ID = string

/** The three timer segment kinds. */
export type TimerMode = 'focus' | 'short' | 'long'

/** Task priority levels (low → high). */
export type Priority = 'none' | 'low' | 'medium' | 'high'

/** Generated alarm sounds (synthesised in the Web Audio engine, no assets). */
export type AlarmSoundId = 'bell' | 'chime' | 'digital' | 'ping' | 'none'

/** Ambient focus sounds (synthesised noise, no assets). */
export type NoiseId =
  | 'none'
  | 'white'
  | 'pink'
  | 'brown'
  | 'rain'
  | 'ocean'
  | 'fire'

/** Light / dark / follow-system theme preference. */
export type Theme = 'light' | 'dark' | 'system'

// ----------------------------------------------------------------------------
// Persisted entities (Dexie / IndexedDB)
// ----------------------------------------------------------------------------

export interface Project {
  id: ID
  name: string
  /** Hex color string, e.g. "#eb5447". */
  color: string
  order: number
  archived: boolean
  createdAt: number
}

export interface Task {
  id: ID
  /** null => belongs to the default "Inbox". */
  projectId: ID | null
  title: string
  note: string
  /** Planned number of pomodoros. */
  estimatedPomos: number
  /** Pomodoros actually focused on this task. */
  completedPomos: number
  priority: Priority
  /** Epoch ms at start-of-day, or null when no due date. */
  dueDate: number | null
  completed: boolean
  completedAt: number | null
  order: number
  createdAt: number
}

export interface Subtask {
  id: ID
  taskId: ID
  title: string
  completed: boolean
  order: number
}

export interface Session {
  id: ID
  mode: TimerMode
  taskId: ID | null
  projectId: ID | null
  /** Epoch ms. */
  startedAt: number
  /** Epoch ms. */
  endedAt: number
  /** Seconds actually focused/rested in this segment. */
  durationSec: number
  /** Planned length of the segment in seconds. */
  plannedSec: number
  /** true when the segment ran to completion (not aborted early). */
  completed: boolean
}

// ----------------------------------------------------------------------------
// Settings (persisted to localStorage via the settings store)
// ----------------------------------------------------------------------------

export interface Settings {
  // durations (minutes)
  focusMin: number
  shortMin: number
  longMin: number
  longBreakInterval: number // long break after every N focus sessions

  // automation
  autoStartBreaks: boolean
  autoStartFocus: boolean

  // goals
  dailyGoal: number // target pomodoros per day

  // alarm
  soundEnabled: boolean
  alarmSound: AlarmSoundId
  alarmVolume: number // 0..1

  // ambience
  tickingEnabled: boolean
  tickingVolume: number // 0..1
  whiteNoise: NoiseId
  whiteNoiseVolume: number // 0..1

  // device
  vibrationEnabled: boolean
  notificationsEnabled: boolean
  keepAwake: boolean
}
