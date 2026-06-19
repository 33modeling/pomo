import { type ButtonHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
}

export function IconButton({ label, className, children, ...rest }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 active:bg-line disabled:opacity-40',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
