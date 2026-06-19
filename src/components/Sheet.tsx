import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Sheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 animate-fade-in bg-black/40"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-app animate-slide-up rounded-t-4xl bg-surface pb-safe shadow-pop">
        <div className="flex items-center justify-center pt-3">
          <span className="h-1.5 w-10 rounded-full bg-line" />
        </div>
        {title && (
          <div className="px-5 pb-1 pt-3">
            <h2 className="text-lg font-bold text-ink">{title}</h2>
          </div>
        )}
        <div className="no-scrollbar max-h-[80vh] overflow-y-auto px-5 pb-6 pt-2">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
