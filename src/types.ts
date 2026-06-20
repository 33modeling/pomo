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
  | 'birds'
  | 'stream'
  | 'cafe'

/** Recurrence rule for repeating tasks / habits. */
export type RepeatRule = 'none' | 'daily' | 'weekdays' | 'weekly'

/** A saved timer configuration the user can switch between. */
export interface TimerPreset {
  name: string
  focusMin: number
  shortMin: number
  longMin: number
  longBreakInterval: number
}

/** A saved, named ambient sound mix. */
export interface SoundPreset {
  name: string
  mix: Partial<Record<NoiseId, number>>
}

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
  /** Absolute epoch ms for a reminder notification, or null. */
  remindAt: number | null
  /** Recurrence; when completed, the next occurrence is spawned. */
  repeat: RepeatRule
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
  /** Active ambient sounds mixed together: sound id -> volume (0..1). */
  soundMix: Partial<Record<NoiseId, number>>
  /** Auto-stop ambient sound after N minutes (0 = off). */
  soundAutoStopMin: number

  // device
  vibrationEnabled: boolean
  notificationsEnabled: boolean
  keepAwake: boolean

  // display
  clockOnStart: boolean // enter the full-screen desk-clock view when starting

  // presets
  timerPresets: TimerPreset[]
  soundPresets: SoundPreset[]
}
