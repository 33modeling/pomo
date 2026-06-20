import { computeBadges } from '../../lib/motivation'
import { cn } from '../../lib/cn'
import { useT } from '../../i18n'
import type { Session, Task } from '../../types'

/** Achievement tiles: earned badges full-color, locked ones grayed out. */
export function Badges({
  sessions,
  tasks,
}: {
  sessions: Session[]
  tasks: Task[]
}) {
  const t = useT()
  const badges = computeBadges(sessions, tasks)

  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
      {badges.map((badge) => (
        <div
          key={badge.id}
          title={`${t(`badge.${badge.id}.desc`)} · ${badge.progress}`}
          className={cn(
            'flex flex-col items-center gap-1 rounded-2xl px-1.5 py-3 text-center',
            badge.earned
              ? 'bg-accent/10 text-ink'
              : 'bg-surface-2 text-faint opacity-50 grayscale',
          )}
        >
          <span className="text-2xl leading-none">{badge.emoji}</span>
          <span className="truncate text-[10px] font-semibold leading-tight">
            {t(`badge.${badge.id}`)}
          </span>
          <span className="nums text-[9px] leading-none text-muted">
            {badge.progress}
          </span>
        </div>
      ))}
    </div>
  )
}
