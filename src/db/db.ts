import Dexie, { type Table } from 'dexie'
import type { Project, Session, Subtask, Task } from '../types'

/**
 * Local-first IndexedDB database (no account / no cloud).
 * All app data lives here on the device.
 */
export class PomoDB extends Dexie {
  projects!: Table<Project, string>
  tasks!: Table<Task, string>
  subtasks!: Table<Subtask, string>
  sessions!: Table<Session, string>

  constructor() {
    super('pomo-db')
    this.version(1).stores({
      projects: 'id, order, archived, createdAt',
      tasks: 'id, projectId, completed, dueDate, order, createdAt, completedAt',
      subtasks: 'id, taskId, order',
      sessions: 'id, mode, taskId, projectId, startedAt, endedAt',
    })
  }
}

export const db = new PomoDB()
