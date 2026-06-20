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
  TimerMode,
} from '../types'

const MODE_KO: Record<TimerMode, string> = {
  focus: '집중',
  short: '짧은 휴식',
  long: '긴 휴식',
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

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

/** Export the session history to a CSV file (Excel-friendly, UTF-8 BOM). */
export async function exportSessionsCsv(): Promise<void> {
  const [sessions, tasks, projects] = await Promise.all([
    db.sessions.toArray(),
    db.tasks.toArray(),
    db.projects.toArray(),
  ])
  const taskName = new Map(tasks.map((t) => [t.id, t.title]))
  const projName = new Map(projects.map((p) => [p.id, p.name]))
  sessions.sort((a, b) => a.startedAt - b.startedAt)

  const header = ['날짜', '시작시각', '종류', '집중(분)', '완료', '작업', '프로젝트']
  const lines = [header.join(',')]
  for (const s of sessions) {
    const d = new Date(s.startedAt)
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`
    const row = [
      date,
      time,
      MODE_KO[s.mode],
      (s.durationSec / 60).toFixed(1),
      s.completed ? 'O' : '',
      s.taskId ? (taskName.get(s.taskId) ?? '') : '',
      s.projectId ? (projName.get(s.projectId) ?? '') : '',
    ]
    lines.push(row.map((c) => csvCell(String(c))).join(','))
  }

  const csv = '﻿' + lines.join('\n')
  const d = new Date()
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  downloadBlob(
    new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    `pomo-sessions-${stamp}.csv`,
  )
}
