import { Bell, Check, Flag, Play, Repeat, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconButton } from '../IconButton'
import { cn } from '../../lib/cn'
import { PRIORITY_META } from '../../lib/constants'
import { isToday, isTomorrow } from '../../lib/dates'
import { deleteTask, toggleTaskComplete } from '../../db/repo'
import { useTimerStore } from '../../store/timerStore'
import type { Project, RepeatRule, Task } from '../../types'

const REPEAT_LABEL: Record<Exclude<RepeatRule, 'none'>, string> = {
  daily: '매일',
  weekdays: '평일',
  weekly: '매주',
}

interface Props {
  task: Task
  /** Provide to show the project dot + name in the meta line ('all' view). */
  project?: Project
  showProject?: boolean
  onOpen: (task: Task) => void
}

function dueLabel(due: number): string {
  if (isToday(due)) return '오늘'
  if (isTomorrow(due)) return '내일'
  const d = new Date(due)
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

export function TaskItem({ task, project, showProject, onOpen }: Props) {
  const navigate = useNavigate()
  const prio = PRIORITY_META[task.priority]
  const overdue =
    task.dueDate != null && !task.completed && !isToday(task.dueDate) &&
    task.dueDate < Date.now()

  const startFocus = (e: React.MouseEvent) => {
    e.stopPropagation()
    useTimerStore.getState().selectTask(task.id)
    navigate('/')
  }

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    void toggleTaskComplete(task.id)
  }

  // --- Swipe-to-act (pointer-based, additive) ---------------------------------
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef<number | null>(null)
  const swiped = useRef(false)

  const clamp = (n: number) => Math.max(-120, Math.min(120, n))

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX
    swiped.current = false
    setDragging(false)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current == null) return
    const delta = e.clientX - startX.current
    if (!swiped.current && Math.abs(delta) > 10) {
      swiped.current = true
      setDragging(true)
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    if (swiped.current) setDx(clamp(delta))
  }

  const onPointerUp = () => {
    if (startX.current == null) return
    const delta = dx
    startX.current = null
    setDragging(false)
    setDx(0)
    if (delta > 80) void toggleTaskComplete(task.id)
    else if (delta < -80) void deleteTask(task.id)
  }

  const onRowClick = () => {
    if (swiped.current) {
      swiped.current = false
      return
    }
    onOpen(task)
  }

  const hasMeta =
    (showProject && project) ||
    task.priority !== 'none' ||
    task.estimatedPomos > 0 ||
    task.dueDate != null ||
    task.repeat !== 'none' ||
    (task.remindAt != null && !task.completed && task.remindAt > Date.now())

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div
        aria-hidden
        className={cn(
          'absolute inset-0 flex items-center justify-between rounded-2xl px-5 text-white',
          dx > 0
            ? 'bg-emerald-500/90'
            : dx < 0
              ? 'bg-red-500/90'
              : 'opacity-0',
        )}
      >
        <Check size={20} strokeWidth={3} className={dx > 0 ? '' : 'opacity-0'} />
        <Trash2 size={20} className={dx < 0 ? '' : 'opacity-0'} />
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={onRowClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpen(task)
          }
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ transform: `translateX(${dx}px)` }}
        className={cn(
          'group relative flex w-full items-start gap-3 rounded-2xl bg-surface px-4 py-3 text-left shadow-card active:scale-[0.99]',
          dragging ? 'touch-pan-y' : 'transition-transform',
        )}
      >
      <button
        type="button"
        onClick={toggle}
        aria-label={task.completed ? '완료 취소' : '완료'}
        className={cn(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition',
          task.completed
            ? 'border-accent bg-accent text-on-accent'
            : 'border-line text-transparent hover:border-accent',
        )}
      >
        <Check size={14} strokeWidth={3} />
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-[15px] font-semibold leading-snug',
            task.completed ? 'text-faint line-through' : 'text-ink',
          )}
        >
          {task.title}
        </p>

        {hasMeta && (
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted">
            {showProject && project && (
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                <span className="max-w-[8rem] truncate">{project.name}</span>
              </span>
            )}

            {task.priority !== 'none' && (
              <span className="flex items-center gap-1" style={{ color: prio.color }}>
                <Flag size={12} fill={prio.color} strokeWidth={0} />
                {prio.label}
              </span>
            )}

            {task.estimatedPomos > 0 && (
              <span className="nums flex items-center gap-1">
                <span aria-hidden>◍</span>
                {task.completedPomos}/{task.estimatedPomos}
              </span>
            )}

            {task.dueDate != null && (
              <span
                className={cn(
                  'rounded-md px-1.5 py-0.5 text-[11px] font-medium',
                  overdue
                    ? 'bg-red-500/10 text-red-500'
                    : isToday(task.dueDate)
                      ? 'bg-accent/10 text-accent'
                      : 'bg-surface-2 text-muted',
                )}
              >
                {dueLabel(task.dueDate)}
              </span>
            )}

            {task.repeat !== 'none' && (
              <span className="flex items-center gap-1 text-muted">
                <Repeat size={12} />
                {REPEAT_LABEL[task.repeat]}
              </span>
            )}

            {task.remindAt != null &&
              !task.completed &&
              task.remindAt > Date.now() && (
                <span className="flex items-center gap-1 text-muted">
                  <Bell size={12} />
                  알림
                </span>
              )}
          </div>
        )}
      </div>

      {!task.completed && (
        <IconButton
          label="집중 시작"
          onClick={startFocus}
          className="-mr-1.5 mt-0.5 shrink-0 text-faint hover:bg-accent/10 hover:text-accent"
        >
          <Play size={18} fill="currentColor" strokeWidth={0} />
        </IconButton>
      )}
      </div>
    </div>
  )
}
