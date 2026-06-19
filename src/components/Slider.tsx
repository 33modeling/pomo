import { cn } from '../lib/cn'

interface Props {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  className?: string
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  disabled,
  className,
}: Props) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className={cn(
        'h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-2 disabled:opacity-40',
        className,
      )}
      style={{ accentColor: 'rgb(var(--accent))' }}
    />
  )
}
