import { BarChart3, ListChecks, Settings, Timer } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '../lib/cn'

const ITEMS = [
  { to: '/', label: '타이머', icon: Timer, end: true },
  { to: '/tasks', label: '할 일', icon: ListChecks, end: false },
  { to: '/stats', label: '통계', icon: BarChart3, end: false },
  { to: '/settings', label: '설정', icon: Settings, end: false },
] as const

export function BottomNav() {
  return (
    <nav className="z-30 border-t border-line bg-surface/90 pb-safe backdrop-blur-lg">
      <div className="flex">
        {ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="flex flex-1 flex-col items-center gap-1 py-2.5"
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.4 : 2}
                  className={isActive ? 'text-accent' : 'text-faint'}
                />
                <span
                  className={cn(
                    'text-[11px] font-semibold',
                    isActive ? 'text-accent' : 'text-faint',
                  )}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
