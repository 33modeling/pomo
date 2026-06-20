import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../Button'
import { Sheet } from '../Sheet'
import { cn } from '../../lib/cn'
import { useT } from '../../i18n'
import { PROJECT_COLORS } from '../../lib/constants'
import { createProject } from '../../db/repo'

interface Props {
  open: boolean
  onClose: () => void
}

export function AddProjectSheet({ open, onClose }: Props) {
  const t = useT()
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(PROJECT_COLORS[0])

  useEffect(() => {
    if (open) {
      setName('')
      setColor(PROJECT_COLORS[0])
    }
  }, [open])

  const save = async () => {
    if (!name.trim()) return
    await createProject(name, color)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('tasks.addProject')}>
      <div className="flex flex-col gap-6 pb-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-muted">{t('tasks.project.name')}</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void save()
            }}
            placeholder={t('tasks.project.namePlaceholder')}
            className="h-12 rounded-2xl bg-surface-2 px-4 text-[15px] text-ink outline-none placeholder:text-faint focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-muted">{t('tasks.project.color')}</label>
          <div className="flex flex-wrap gap-3">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={t('tasks.project.colorLabel', { color: c })}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-surface transition',
                  color === c && 'ring-2',
                )}
                style={{ backgroundColor: c, ...(color === c ? { '--tw-ring-color': c } as React.CSSProperties : {}) }}
              >
                {color === c && <Check size={16} strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>

        <Button variant="primary" size="lg" full disabled={!name.trim()} onClick={() => void save()}>
          {t('common.add')}
        </Button>
      </div>
    </Sheet>
  )
}
