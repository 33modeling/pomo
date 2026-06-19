import { type ReactNode } from 'react'

interface Props {
  icon?: ReactNode
  title: string
  hint?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, hint, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-8 py-16 text-center">
      {icon && <div className="text-faint">{icon}</div>}
      <p className="text-base font-semibold text-ink">{title}</p>
      {hint && <p className="max-w-xs text-sm text-muted">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
