import { Check, Play, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { Button } from '../Button'
import { IconButton } from '../IconButton'
import { SegmentedControl } from '../SegmentedControl'
import { Sheet } from '../Sheet'
import { Stepper } from '../Stepper'
import { ProjectChip } from './AddTaskSheet'
import { cn } from '../../lib/cn'
import { INBOX_COLOR, INBOX_NAME } from '../../lib/constants'
import { startOfDayMs, addDays } from '../../lib/dates'
import {
  addSubtask,
  deleteSubtask,
  deleteTask,
  listSubtasks,
  toggleSubtask,
  toggleTaskComplete,
  updateTask,
} from '../../db/repo'
import { useTimerStore } from '../../store/timerStore'
import type { ID, Priority, Project, Task } from '../../types'

interface Props {
  task: Task | null
  onClose: () => void
  projects: Project[]
}

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'none', label: '없음' },
  { value: 'low', label: '낮음' },
  { value: 'medium', label: '보통' },
  { value: 'high', label: '높음' },
]

function toInputDate(ms: number): string {
  const d = new Date(ms)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function TaskDetailSheet({ task, onClose, projects }: Props) {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [projectId, setProjectId] = useState<ID | null>(null)
  const [estimate, setEstimate] = useState(1)
  const [priority, setPriority] = useState<Priority>('none')
  const [due, setDue] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [newSub, setNewSub] = useState('')

  const subtasks = useLiveQuery(
    () => (task ? listSubtasks(task.id) : Promise.resolve([])),
    [task?.id],
  ) ?? []

  // Hydrate local state when a task opens.
  useEffect(() => {
    if (!task) return
    setTitle(task.title)
    setNote(task.note)
    setProjectId(task.projectId)
    setEstimate(task.estimatedPomos)
    setPriority(task.priority)
    setDue(task.dueDate)
    setConfirmDelete(false)
    setNewSub('')
  }, [task])

  if (!task) return null
  const taskId = task.id

  // Persist edits on close.
  const persist = () => {
    const t = title.trim()
    void updateTask(taskId, {
      title: t || task.title,
      note: note.trim(),
      projectId,
      estimatedPomos: estimate,
      priority,
      dueDate: due,
    })
  }

  const handleClose = () => {
    persist()
    onClose()
  }

  const today = startOfDayMs(Date.now())
  const tomorrow = addDays(new Date(today), 1).getTime()

  const startFocus = () => {
    persist()
    useTimerStore.getState().selectTask(taskId)
    onClose()
    navigate('/')
  }

  const addNewSub = async () => {
    if (!newSub.trim()) return
    await addSubtask(taskId, newSub)
    setNewSub('')
  }

  const remove = async () => {
    await deleteTask(taskId)
    onClose()
  }

  return (
    <Sheet open={task != null} onClose={handleClose} title="할 일">
      <div className="flex flex-col gap-6 pb-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목"
          className="h-12 rounded-2xl bg-surface-2 px-4 text-[15px] font-semibold text-ink outline-none placeholder:text-faint focus:ring-2 focus:ring-accent"
        />

        <Field label="프로젝트">
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-0.5">
            <ProjectChip
              name={INBOX_NAME}
              color={INBOX_COLOR}
              selected={projectId === null}
              onClick={() => setProjectId(null)}
            />
            {projects.map((p) => (
              <ProjectChip
                key={p.id}
                name={p.name}
                color={p.color}
                selected={projectId === p.id}
                onClick={() => setProjectId(p.id)}
              />
            ))}
          </div>
        </Field>

        <Field label="예상 뽀모도로">
          <div className="flex items-center justify-between">
            <Stepper value={estimate} onChange={setEstimate} min={1} max={20} suffix=" 🍅" />
            <span className="nums text-sm text-faint">
              완료 {task.completedPomos}회
            </span>
          </div>
        </Field>

        <Field label="우선순위">
          <SegmentedControl options={PRIORITY_OPTIONS} value={priority} onChange={setPriority} />
        </Field>

        <Field label="마감일">
          <div className="flex flex-wrap items-center gap-2">
            <DueChip label="없음" selected={due === null} onClick={() => setDue(null)} />
            <DueChip label="오늘" selected={due === today} onClick={() => setDue(today)} />
            <DueChip label="내일" selected={due === tomorrow} onClick={() => setDue(tomorrow)} />
            <input
              type="date"
              value={due != null ? toInputDate(due) : ''}
              onChange={(e) =>
                setDue(e.target.value ? startOfDayMs(new Date(e.target.value).getTime()) : null)
              }
              className="h-9 rounded-xl bg-surface-2 px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </Field>

        <Field label="하위 항목">
          <div className="flex flex-col gap-1.5">
            {subtasks.map((s) => (
              <div key={s.id} className="flex items-center gap-2.5 rounded-xl bg-surface-2 px-3 py-2">
                <button
                  type="button"
                  onClick={() => void toggleSubtask(s.id)}
                  aria-label={s.completed ? '완료 취소' : '완료'}
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition',
                    s.completed
                      ? 'border-accent bg-accent text-on-accent'
                      : 'border-line text-transparent',
                  )}
                >
                  <Check size={12} strokeWidth={3} />
                </button>
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-sm',
                    s.completed ? 'text-faint line-through' : 'text-ink',
                  )}
                >
                  {s.title}
                </span>
                <IconButton
                  label="삭제"
                  onClick={() => void deleteSubtask(s.id)}
                  className="h-7 w-7 text-faint hover:text-red-500"
                >
                  <X size={15} />
                </IconButton>
              </div>
            ))}

            <div className="flex items-center gap-2">
              <input
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void addNewSub()
                }}
                placeholder="하위 항목 추가"
                className="h-10 flex-1 rounded-xl bg-surface-2 px-3 text-sm text-ink outline-none placeholder:text-faint focus:ring-2 focus:ring-accent"
              />
              <IconButton
                label="하위 항목 추가"
                onClick={() => void addNewSub()}
                className="bg-surface-2 text-ink"
              >
                <Plus size={18} />
              </IconButton>
            </div>
          </div>
        </Field>

        <Field label="메모">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="메모 (선택)"
            rows={3}
            className="resize-none rounded-2xl bg-surface-2 px-4 py-3 text-[15px] text-ink outline-none placeholder:text-faint focus:ring-2 focus:ring-accent"
          />
        </Field>

        <div className="flex flex-col gap-2.5 pt-1">
          {!task.completed && (
            <Button variant="primary" size="lg" full onClick={startFocus}>
              <Play size={18} fill="currentColor" strokeWidth={0} />
              집중 시작
            </Button>
          )}
          <Button
            variant="secondary"
            size="lg"
            full
            onClick={() => {
              void toggleTaskComplete(taskId)
              onClose()
            }}
          >
            <Check size={18} />
            {task.completed ? '완료 취소' : '완료'}
          </Button>

          {confirmDelete ? (
            <div className="flex gap-2">
              <Button variant="ghost" size="lg" full onClick={() => setConfirmDelete(false)}>
                취소
              </Button>
              <Button variant="danger" size="lg" full onClick={() => void remove()}>
                삭제 확인
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="lg" full onClick={() => setConfirmDelete(true)}>
              <Trash2 size={18} />
              삭제
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-sm font-semibold text-muted">{label}</span>
      {children}
    </div>
  )
}

function DueChip({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'h-9 rounded-xl px-4 text-sm font-semibold transition',
        selected ? 'bg-accent/10 text-accent ring-1 ring-accent' : 'bg-surface-2 text-muted hover:text-ink',
      )}
    >
      {label}
    </button>
  )
}
