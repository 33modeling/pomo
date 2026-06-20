import { useEffect } from 'react'

const COLORS = [
  '#eb5447',
  '#f4a236',
  '#f6d743',
  '#5bbd6f',
  '#4aa3df',
  '#9b6dde',
  '#ef6fa3',
]

const PIECES = Array.from({ length: 40 }, (_, i) => {
  const left = (i * 37) % 100
  const color = COLORS[i % COLORS.length]
  const delay = (i % 10) * 90
  const duration = 1500 + (i % 7) * 130
  const size = 6 + (i % 4) * 2
  const rotate = (i * 53) % 360
  return { left, color, delay, duration, size, rotate }
})

/**
 * A lightweight, dependency-free confetti burst. Renders ~40 colored squares
 * that fall from the top and fade out. Calls `onDone` after the animation so
 * the parent can flip `show` back to false.
 */
export function Confetti({
  show,
  onDone,
}: {
  show: boolean
  onDone: () => void
}) {
  useEffect(() => {
    if (!show) return
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [show, onDone])

  if (!show) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      <style>{`
        @keyframes pomo-confetti-fall {
          0% { transform: translateY(-10%) rotate(var(--r)); opacity: 1; }
          100% { transform: translateY(105vh) rotate(calc(var(--r) + 360deg)); opacity: 0; }
        }
      `}</style>
      {PIECES.map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            top: 0,
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: 2,
            // @ts-expect-error CSS custom property
            '--r': `${p.rotate}deg`,
            animation: `pomo-confetti-fall ${p.duration}ms ${p.delay}ms ease-in forwards`,
          }}
        />
      ))}
    </div>
  )
}
