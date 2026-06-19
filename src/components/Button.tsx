import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  full?: boolean
}

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-on-accent shadow-card hover:brightness-105 active:brightness-95',
  secondary: 'bg-surface-2 text-ink hover:bg-line/70 active:bg-line',
  ghost: 'bg-transparent text-muted hover:bg-surface-2 active:bg-line',
  danger: 'bg-red-500 text-white shadow-card hover:brightness-105',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-xl gap-1.5',
  md: 'h-11 px-4 text-[15px] rounded-2xl gap-2',
  lg: 'h-14 px-6 text-base rounded-3xl gap-2',
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'secondary', size = 'md', full, className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex select-none items-center justify-center font-semibold transition disabled:pointer-events-none disabled:opacity-40',
        variants[variant],
        sizes[size],
        full && 'w-full',
        className,
      )}
      {...rest}
    />
  )
})
