import { useEffect, useState } from 'react'
import { Button } from '../Button'
import { SegmentedControl } from '../SegmentedControl'
import { Sheet } from '../Sheet'
import { Stepper } from '../Stepper'
import { Switch } from '../Switch'
import { cn } from '../../lib/cn'
import { INBOX_COLOR, INBOX_NAME } from '../../lib/constants'
import { startOfDayMs, addDays } from '../../lib/dates'
import { createTask } from '../../db/repo'
import type { ID, Priority, Project, RepeatRule } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  projects: Project[]
  /** Pre-selected project for the new task (null = inbox). */
  defaultProjectId: ID | null
}

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'none', label: '없음' },
  { value: 'low', label: '낮음' },
  { value: 'medium', label: '보통' },
  { value: 'high', label: '높음' },
]

const REPEAT_OPTIONS: { value: RepeatRule; label: string }[] = [
  { value: 'none', label: '없음' },
  { value: 'daily', label: '매일' },
  { value: 'weekdays', label: '평일' },
  { value: 'weekly', label: '매주' },
]

function toInputDate(ms: number): string {
  const d = new Date(ms)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function AddTaskSheet({ open, onClose, projects, defaultProjectId }: Props) {
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState<ID | null>(defaultProjectId)
  const [estimate, setEstimate] = useState(1)
  const [priority, setPriority] = useState<Priority>('none')
  const [due, setDue] = useState<number | null>(null)
  const [remindOn, setRemindOn] = useState(false)
  const [remindTime, setRemindTime] = useState('09:00')
  const [repeat, setRepeat] = useState<RepeatRule>('none')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (open) {
      setTitle('')
      setProjectId(defaultProjectId)
      setEstimate(1)
      setPriority('none')
      setDue(null)
      setRemindOn(false)
      setRemindTime('09:00')
      setRepeat('none')
      setNote('')
    }
  }, [open, defaultProjectId])

  const today = startOfDayMs(Date.now())
  const tomorrow = addDays(new Date(today), 1).getTime()

  const computeRemindAt = (): number | null => {
    if (!remindOn) return null
    const [h, m] = remindTime.split(':').map(Number)
    const base = due ?? startOfDayMs(Date.now())
    return startOfDayMs(base) + h * 3600000 + m * 60000
  }

  const save = async () => {
    if (!title.trim()) return
    await createTask({
      title,
      projectId,
      estimatedPomos: estimate,
      priority,
      dueDate: due,
      remindAt: computeRemindAt(),
      repeat,
      note: note.trim(),
    })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="할 일 추가">
      <div className="flex flex-col gap-6 pb-2">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void save()
          }}
          placeholder="무엇을 할까요?"
          className="h-12 rounded-2xl bg-surface-2 px-4 text-[15px] text-ink outline-none placeholder:text-faint focus:ring-2 focus:ring-accent"
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
          <Stepper value={estimate} onChange={setEstimate} min={1} max={20} suffix=" 🍅" />
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

        <Field label="알림">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">알림</span>
            <Switch checked={remindOn} onChange={setRemindOn} />
          </div>
          {remindOn && (
            <div className="flex flex-col gap-1.5">
              <input
                type="time"
                value={remindTime}
                onChange={(e) => setRemindTime(e.target.value || '09:00')}
                className="h-9 rounded-xl bg-surface-2 px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-accent"
              />
              <span className="text-xs text-faint">기기 앱(APK)에서 알림이 울립니다</span>
            </div>
          )}
        </Field>

        <Field label="반복">
          <SegmentedControl options={REPEAT_OPTIONS} value={repeat} onChange={setRepeat} />
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

        <Button variant="primary" size="lg" full disabled={!title.trim()} onClick={() => void save()}>
          추가
        </Button>
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

export function ProjectChip({
  name,
  color,
  selected,
  onClick,
}: {
  name: string
  color: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition',
        selected ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted hover:bg-surface-2',
      )}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </button>
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
