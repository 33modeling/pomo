import { BarChart3, ListChecks, Settings, Timer } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '../lib/cn'
import { useT } from '../i18n'

const ITEMS = [
  { to: '/', labelKey: 'nav.timer', icon: Timer, end: true },
  { to: '/tasks', labelKey: 'nav.tasks', icon: ListChecks, end: false },
  { to: '/stats', labelKey: 'nav.stats', icon: BarChart3, end: false },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings, end: false },
] as const

export function BottomNav() {
  const t = useT()
  return (
    <nav className="z-30 border-t border-line bg-surface/90 pb-safe backdrop-blur-lg">
      <div className="flex">
        {ITEMS.map(({ to, labelKey, icon: Icon, end }) => (
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
                  {t(labelKey)}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
