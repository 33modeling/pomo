import { db } from './db'
import { genId } from '../lib/id'
import { addDays, startOfDayMs } from '../lib/dates'
import type {
  ID,
  Priority,
  Project,
  RepeatRule,
  Session,
  Subtask,
  Task,
} from '../types'

// ----------------------------------------------------------------------------
// Projects
// ----------------------------------------------------------------------------

export async function listProjects(): Promise<Project[]> {
  const all = await db.projects.toArray()
  return all
    .filter((p) => !p.archived)
    .sort((a, b) => a.order - b.order)
}

export async function createProject(
  name: string,
  color: string,
): Promise<ID> {
  const count = await db.projects.count()
  const project: Project = {
    id: genId(),
    name: name.trim() || '새 프로젝트',
    color,
    order: count,
    archived: false,
    createdAt: Date.now(),
  }
  await db.projects.add(project)
  return project.id
}

export async function updateProject(
  id: ID,
  patch: Partial<Omit<Project, 'id'>>,
): Promise<void> {
  await db.projects.update(id, patch)
}

/** Deletes a project and moves its tasks to the Inbox (projectId = null). */
export async function deleteProject(id: ID): Promise<void> {
  await db.transaction('rw', db.projects, db.tasks, async () => {
    const tasks = await db.tasks.where('projectId').equals(id).toArray()
    await Promise.all(
      tasks.map((t) => db.tasks.update(t.id, { projectId: null })),
    )
    await db.projects.delete(id)
  })
}

export async function reorderProjects(orderedIds: ID[]): Promise<void> {
  await db.transaction('rw', db.projects, async () => {
    await Promise.all(
      orderedIds.map((id, i) => db.projects.update(id, { order: i })),
    )
  })
}

// ----------------------------------------------------------------------------
// Tasks
// ----------------------------------------------------------------------------

export interface NewTaskInput {
  title: string
  projectId?: ID | null
  note?: string
  estimatedPomos?: number
  priority?: Priority
  dueDate?: number | null
  repeat?: RepeatRule
}

export async function listTasks(): Promise<Task[]> {
  return db.tasks.toArray()
}

export async function getTask(id: ID): Promise<Task | undefined> {
  return db.tasks.get(id)
}

export async function createTask(input: NewTaskInput): Promise<ID> {
  const count = await db.tasks.count()
  const task: Task = {
    id: genId(),
    projectId: input.projectId ?? null,
    title: input.title.trim(),
    note: input.note ?? '',
    estimatedPomos: input.estimatedPomos ?? 1,
    completedPomos: 0,
    priority: input.priority ?? 'none',
    dueDate: input.dueDate ?? null,
    repeat: input.repeat ?? 'none',
    completed: false,
    completedAt: null,
    order: count,
    createdAt: Date.now(),
  }
  await db.tasks.add(task)
  return task.id
}

/** Next due date for a repeating task, from a base epoch-ms. */
function nextDueDate(base: number, repeat: RepeatRule): number {
  const start = startOfDayMs(base)
  if (repeat === 'daily') return addDays(new Date(start), 1).getTime()
  if (repeat === 'weekly') return addDays(new Date(start), 7).getTime()
  if (repeat === 'weekdays') {
    let d = addDays(new Date(start), 1)
    while (d.getDay() === 0 || d.getDay() === 6) d = addDays(d, 1)
    return d.getTime()
  }
  return start
}

export async function updateTask(
  id: ID,
  patch: Partial<Omit<Task, 'id'>>,
): Promise<void> {
  await db.tasks.update(id, patch)
}

export async function toggleTaskComplete(id: ID): Promise<void> {
  const task = await db.tasks.get(id)
  if (!task) return
  const completed = !task.completed
  await db.tasks.update(id, {
    completed,
    completedAt: completed ? Date.now() : null,
  })
  // When completing a repeating task, spawn the next occurrence.
  if (completed && task.repeat && task.repeat !== 'none') {
    const due = nextDueDate(task.dueDate ?? Date.now(), task.repeat)
    await createTask({
      title: task.title,
      projectId: task.projectId,
      note: task.note,
      estimatedPomos: task.estimatedPomos,
      priority: task.priority,
      dueDate: due,
      repeat: task.repeat,
    })
  }
}

/** Adds one to the completed-pomodoro counter for a task. */
export async function incrementTaskPomos(id: ID): Promise<void> {
  const task = await db.tasks.get(id)
  if (!task) return
  await db.tasks.update(id, { completedPomos: task.completedPomos + 1 })
}

export async function deleteTask(id: ID): Promise<void> {
  await db.transaction('rw', db.tasks, db.subtasks, async () => {
    await db.subtasks.where('taskId').equals(id).delete()
    await db.tasks.delete(id)
  })
}

export async function reorderTasks(orderedIds: ID[]): Promise<void> {
  await db.transaction('rw', db.tasks, async () => {
    await Promise.all(
      orderedIds.map((id, i) => db.tasks.update(id, { order: i })),
    )
  })
}

// ----------------------------------------------------------------------------
// Subtasks
// ----------------------------------------------------------------------------

export async function listSubtasks(taskId: ID): Promise<Subtask[]> {
  const items = await db.subtasks.where('taskId').equals(taskId).toArray()
  return items.sort((a, b) => a.order - b.order)
}

export async function addSubtask(taskId: ID, title: string): Promise<ID> {
  const count = await db.subtasks.where('taskId').equals(taskId).count()
  const sub: Subtask = {
    id: genId(),
    taskId,
    title: title.trim(),
    completed: false,
    order: count,
  }
  await db.subtasks.add(sub)
  return sub.id
}

export async function toggleSubtask(id: ID): Promise<void> {
  const sub = await db.subtasks.get(id)
  if (!sub) return
  await db.subtasks.update(id, { completed: !sub.completed })
}

export async function updateSubtask(
  id: ID,
  patch: Partial<Omit<Subtask, 'id' | 'taskId'>>,
): Promise<void> {
  await db.subtasks.update(id, patch)
}

export async function deleteSubtask(id: ID): Promise<void> {
  await db.subtasks.delete(id)
}

// ----------------------------------------------------------------------------
// Sessions (focus / break history that powers statistics)
// ----------------------------------------------------------------------------

export async function addSession(
  session: Omit<Session, 'id'>,
): Promise<ID> {
  const full: Session = { ...session, id: genId() }
  await db.sessions.add(full)
  return full.id
}

export async function listSessions(): Promise<Session[]> {
  return db.sessions.toArray()
}

export async function sessionsBetween(
  fromMs: number,
  toMs: number,
): Promise<Session[]> {
  return db.sessions
    .where('startedAt')
    .between(fromMs, toMs, true, true)
    .toArray()
}

/** Number of completed focus pomodoros logged today. */
export async function focusCountToday(): Promise<number> {
  const start = startOfDayMs(Date.now())
  const end = start + 24 * 60 * 60 * 1000
  const list = await sessionsBetween(start, end)
  return list.filter((s) => s.mode === 'focus' && s.completed).length
}
