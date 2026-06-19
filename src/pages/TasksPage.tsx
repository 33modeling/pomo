import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, FolderPlus, Inbox, ListTodo, Plus } from 'lucide-react'
import { Header } from '../components/Header'
import { IconButton } from '../components/IconButton'
import { EmptyState } from '../components/EmptyState'
import { AddProjectSheet } from '../components/tasks/AddProjectSheet'
import { AddTaskSheet } from '../components/tasks/AddTaskSheet'
import { TaskDetailSheet } from '../components/tasks/TaskDetailSheet'
import { TaskItem } from '../components/tasks/TaskItem'
import { cn } from '../lib/cn'
import { INBOX_COLOR, INBOX_NAME, PRIORITY_META } from '../lib/constants'
import { endOfDayMs } from '../lib/dates'
import { listProjects } from '../db/repo'
import { db } from '../db/db'
import type { ID, Project, Task } from '../types'

type Filter = 'all' | 'inbox' | ID

/** Incomplete-first ordering: priority desc, then due date asc, then created. */
function sortTasks(a: Task, b: Task): number {
  const pr = PRIORITY_META[b.priority].rank - PRIORITY_META[a.priority].rank
  if (pr !== 0) return pr
  const ad = a.dueDate ?? Number.POSITIVE_INFINITY
  const bd = b.dueDate ?? Number.POSITIVE_INFINITY
  if (ad !== bd) return ad - bd
  return a.createdAt - b.createdAt
}

export function TasksPage() {
  const projects = useLiveQuery(() => listProjects()) ?? []
  const tasks = useLiveQuery(() => db.tasks.toArray()) ?? []

  const [filter, setFilter] = useState<Filter>('all')
  const [addProjectOpen, setAddProjectOpen] = useState(false)
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [showDone, setShowDone] = useState(false)

  const projectMap = useMemo(() => {
    const m = new Map<ID, Project>()
    for (const p of projects) m.set(p.id, p)
    return m
  }, [projects])

  // Apply the active filter.
  const filtered = useMemo(() => {
    if (filter === 'all') return tasks
    if (filter === 'inbox') return tasks.filter((t) => t.projectId === null)
    return tasks.filter((t) => t.projectId === filter)
  }, [tasks, filter])

  const incomplete = filtered.filter((t) => !t.completed)
  const completed = filtered
    .filter((t) => t.completed)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))

  // Grouping for the "전체" view.
  const todayEnd = endOfDayMs(Date.now())
  const groups = useMemo(() => {
    const today: Task[] = []
    const upcoming: Task[] = []
    const someday: Task[] = []
    for (const t of incomplete) {
      if (t.dueDate == null) someday.push(t)
      else if (t.dueDate <= todayEnd) today.push(t)
      else upcoming.push(t)
    }
    today.sort(sortTasks)
    upcoming.sort((a, b) => (a.dueDate ?? 0) - (b.dueDate ?? 0))
    someday.sort(sortTasks)
    return { today, upcoming, someday }
  }, [incomplete, todayEnd])

  const sortedIncomplete = useMemo(() => [...incomplete].sort(sortTasks), [incomplete])

  const isEmpty = filtered.length === 0

  const renderRow = (t: Task) => (
    <TaskItem
      key={t.id}
      task={t}
      showProject={filter === 'all'}
      project={t.projectId != null ? projectMap.get(t.projectId) : undefined}
      onOpen={setDetailTask}
    />
  )

  return (
    <div className="pb-8">
      <Header
        title="할 일"
        right={
          <IconButton label="프로젝트 추가" onClick={() => setAddProjectOpen(true)}>
            <FolderPlus size={20} />
          </IconButton>
        }
      />

      {/* Project filter chips */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-1 pt-1">
        <FilterChip label="전체" active={filter === 'all'} onClick={() => setFilter('all')} />
        <FilterChip
          label={INBOX_NAME}
          color={INBOX_COLOR}
          active={filter === 'inbox'}
          onClick={() => setFilter('inbox')}
        />
        {projects.map((p) => (
          <FilterChip
            key={p.id}
            label={p.name}
            color={p.color}
            active={filter === p.id}
            onClick={() => setFilter(p.id)}
          />
        ))}
      </div>

      {/* Task list */}
      <div className="mt-3 flex flex-col gap-6 px-5">
        {isEmpty ? (
          <EmptyState
            icon={<ListTodo size={40} strokeWidth={1.5} />}
            title="할 일이 없어요"
            hint="아래 버튼을 눌러 첫 할 일을 추가해 보세요."
          />
        ) : filter === 'all' ? (
          <>
            <Section title="오늘" tasks={groups.today} render={renderRow} />
            <Section title="예정" tasks={groups.upcoming} render={renderRow} />
            <Section title="언젠가" tasks={groups.someday} render={renderRow} />
          </>
        ) : (
          <div className="flex flex-col gap-2">
            {sortedIncomplete.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-faint">
                남은 할 일이 없어요.
              </p>
            ) : (
              sortedIncomplete.map(renderRow)
            )}
          </div>
        )}

        {/* Completed (collapsible) */}
        {completed.length > 0 && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setShowDone((v) => !v)}
              className="flex items-center gap-1.5 px-1 text-sm font-semibold text-muted"
            >
              <ChevronDown
                size={16}
                className={cn('transition-transform', showDone ? 'rotate-0' : '-rotate-90')}
              />
              완료됨 {completed.length}
            </button>
            {showDone && (
              <div className="flex flex-col gap-2 animate-fade-in">
                {completed.map(renderRow)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating add button */}
      <button
        type="button"
        aria-label="할 일 추가"
        onClick={() => setAddTaskOpen(true)}
        className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-on-accent shadow-pop transition active:scale-95"
      >
        <Plus size={26} />
      </button>

      {/* Sheets */}
      <AddProjectSheet open={addProjectOpen} onClose={() => setAddProjectOpen(false)} />
      <AddTaskSheet
        open={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        projects={projects}
        defaultProjectId={
          filter === 'all' || filter === 'inbox' ? null : filter
        }
      />
      <TaskDetailSheet
        task={detailTask}
        onClose={() => setDetailTask(null)}
        projects={projects}
      />
    </div>
  )
}

function Section({
  title,
  tasks,
  render,
}: {
  title: string
  tasks: Task[]
  render: (t: Task) => React.ReactNode
}) {
  if (tasks.length === 0) return null
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-sm font-semibold text-muted">{title}</h2>
      <div className="flex flex-col gap-2">{tasks.map(render)}</div>
    </section>
  )
}

function FilterChip({
  label,
  color,
  active,
  onClick,
}: {
  label: string
  color?: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition',
        active
          ? 'bg-accent/10 text-accent ring-1 ring-accent'
          : 'bg-surface-2 text-muted hover:text-ink',
      )}
    >
      {color ? (
        label === INBOX_NAME ? (
          <Inbox size={14} className="shrink-0" />
        ) : (
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        )
      ) : null}
      {label}
    </button>
  )
}
