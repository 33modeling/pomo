import { cn } from '../lib/cn'

interface Props {
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}

export function Switch({ checked, onChange, disabled }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        // appearance-none/border-0/p-0/outline-none kill the native button chrome
        // and default padding that breaks the pill on older Android WebViews.
        // inline-flex + items-center positions the knob without absolute layout.
        'relative inline-flex h-7 w-12 shrink-0 cursor-pointer appearance-none items-center rounded-full border-0 p-0 outline-none transition-colors disabled:opacity-40',
        checked ? 'bg-accent' : 'bg-line',
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-6 w-6 rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-[22px]' : 'translate-x-[2px]',
        )}
      />
    </button>
  )
}
