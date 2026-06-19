import { Minus, Plus } from 'lucide-react'

interface Props {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 999,
  step = 1,
  suffix,
}: Props) {
  const clamp = (v: number) => onChange(Math.min(max, Math.max(min, v)))
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="감소"
        onClick={() => clamp(value - step)}
        disabled={value <= min}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-ink transition active:bg-line disabled:opacity-40"
      >
        <Minus size={18} />
      </button>
      <span className="nums min-w-[3.75rem] text-center text-base font-bold text-ink">
        {value}
        {suffix}
      </span>
      <button
        type="button"
        aria-label="증가"
        onClick={() => clamp(value + step)}
        disabled={value >= max}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-ink transition active:bg-line disabled:opacity-40"
      >
        <Plus size={18} />
      </button>
    </div>
  )
}
