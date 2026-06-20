import { db } from '../db/db'
import { useSettingsStore } from '../store/settingsStore'
import { useThemeStore } from '../store/themeStore'
import type {
  Project,
  Session,
  Settings,
  Subtask,
  Task,
  Theme,
} from '../types'

interface BackupFile {
  app: 'pomo'
  version: number
  exportedAt: number
  data: {
    projects: Project[]
    tasks: Task[]
    subtasks: Subtask[]
    sessions: Session[]
  }
  settings: Partial<Settings>
  theme: Theme
}

export async function buildBackup(): Promise<BackupFile> {
  const [projects, tasks, subtasks, sessions] = await Promise.all([
    db.projects.toArray(),
    db.tasks.toArray(),
    db.subtasks.toArray(),
    db.sessions.toArray(),
  ])
  // Strip the action functions from the settings store state.
  const { update: _u, reset: _r, ...settings } = useSettingsStore.getState()
  return {
    app: 'pomo',
    version: 1,
    exportedAt: Date.now(),
    data: { projects, tasks, subtasks, sessions },
    settings,
    theme: useThemeStore.getState().theme,
  }
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Export all data to a downloaded JSON file. */
export async function exportToFile(): Promise<void> {
  const backup = await buildBackup()
  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const d = new Date(backup.exportedAt)
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
  const a = document.createElement('a')
  a.href = url
  a.download = `pomo-backup-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function normalizeTask(t: Task): Task {
  // Be tolerant of older backups that predate newer fields.
  return {
    ...t,
    note: t.note ?? '',
    repeat: t.repeat ?? 'none',
    estimatedPomos: t.estimatedPomos ?? 1,
    completedPomos: t.completedPomos ?? 0,
  }
}

export interface ImportResult {
  projects: number
  tasks: number
  sessions: number
}

/** Replace all local data with the contents of a backup file. */
export async function importFromFile(file: File): Promise<ImportResult> {
  let parsed: BackupFile
  try {
    parsed = JSON.parse(await file.text()) as BackupFile
  } catch {
    throw new Error('파일을 읽을 수 없습니다 (JSON 형식 오류).')
  }
  if (parsed.app !== 'pomo' || !parsed.data) {
    throw new Error('올바른 Pomo 백업 파일이 아닙니다.')
  }
  const {
    projects = [],
    tasks = [],
    subtasks = [],
    sessions = [],
  } = parsed.data

  await db.transaction(
    'rw',
    db.projects,
    db.tasks,
    db.subtasks,
    db.sessions,
    async () => {
      await Promise.all([
        db.projects.clear(),
        db.tasks.clear(),
        db.subtasks.clear(),
        db.sessions.clear(),
      ])
      await db.projects.bulkAdd(projects)
      await db.tasks.bulkAdd(tasks.map(normalizeTask))
      await db.subtasks.bulkAdd(subtasks)
      await db.sessions.bulkAdd(sessions)
    },
  )

  if (parsed.settings) useSettingsStore.getState().update(parsed.settings)
  if (parsed.theme) useThemeStore.getState().setTheme(parsed.theme)

  return {
    projects: projects.length,
    tasks: tasks.length,
    sessions: sessions.length,
  }
}
