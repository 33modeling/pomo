import { Volume2, VolumeX } from 'lucide-react'
import { audio } from '../audio/audioEngine'
import { NOISES } from '../audio/catalog'
import { Sheet } from '../components/Sheet'
import { Slider } from '../components/Slider'
import { Switch } from '../components/Switch'
import { cn } from '../lib/cn'
import { useSettingsStore } from '../store/settingsStore'
import { useTimerStore } from '../store/timerStore'

interface Props {
  open: boolean
  onClose: () => void
}

export function SoundsSheet({ open, onClose }: Props) {
  const whiteNoise = useSettingsStore((s) => s.whiteNoise)
  const whiteNoiseVolume = useSettingsStore((s) => s.whiteNoiseVolume)
  const tickingEnabled = useSettingsStore((s) => s.tickingEnabled)
  const tickingVolume = useSettingsStore((s) => s.tickingVolume)
  const update = useSettingsStore((s) => s.update)

  const selectNoise = (id: typeof whiteNoise) => {
    update({ whiteNoise: id })
    audio.unlock()
    if (id === 'none') audio.stopNoise()
    else audio.setNoise(id, whiteNoiseVolume)
  }

  const changeNoiseVolume = (v: number) => {
    update({ whiteNoiseVolume: v })
    audio.setNoiseVolume(v)
  }

  const toggleTicking = (on: boolean) => {
    update({ tickingEnabled: on })
    if (on) {
      audio.unlock()
      audio.startTicking(tickingVolume)
    } else {
      audio.stopTicking()
    }
  }

  const changeTickingVolume = (v: number) => {
    update({ tickingVolume: v })
    audio.setTickingVolume(v)
  }

  const handleClose = () => {
    const t = useTimerStore.getState()
    if (!(t.status === 'running' && t.mode === 'focus')) {
      audio.stopNoise()
      audio.stopTicking()
    }
    onClose()
  }

  return (
    <Sheet open={open} onClose={handleClose} title="사운드">
      <div className="flex flex-col gap-7 pb-2">
        {/* Ambient noise */}
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-muted">집중 사운드</h3>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {NOISES.map((n) => {
              const selected = whiteNoise === n.id
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => selectNoise(n.id)}
                  aria-pressed={selected}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-2xl border px-3 py-4 text-center transition-colors',
                    selected
                      ? 'border-accent bg-accent/10'
                      : 'border-line bg-surface-2 hover:bg-surface',
                  )}
                >
                  <span className="text-3xl leading-none">{n.emoji}</span>
                  <span
                    className={cn(
                      'mt-1 text-sm font-semibold',
                      selected ? 'text-accent' : 'text-ink',
                    )}
                  >
                    {n.label}
                  </span>
                  <span className="text-[11px] leading-tight text-faint">
                    {n.desc}
                  </span>
                </button>
              )
            })}
          </div>

          {whiteNoise !== 'none' && (
            <div className="mt-1 flex items-center gap-3 px-1 animate-fade-in">
              <VolumeX size={18} className="shrink-0 text-faint" />
              <Slider
                value={whiteNoiseVolume}
                onChange={changeNoiseVolume}
                min={0}
                max={1}
              />
              <Volume2 size={18} className="shrink-0 text-faint" />
            </div>
          )}
        </section>

        {/* Ticking */}
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-muted">초침 소리</h3>
          <div className="flex flex-col gap-4 rounded-3xl bg-surface-2 px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-semibold text-ink">초침 소리</span>
                <span className="text-xs text-faint">
                  째깍이는 시계 소리로 리듬을 유지하세요
                </span>
              </div>
              <Switch checked={tickingEnabled} onChange={toggleTicking} />
            </div>

            {tickingEnabled && (
              <div className="flex items-center gap-3 animate-fade-in">
                <VolumeX size={18} className="shrink-0 text-faint" />
                <Slider
                  value={tickingVolume}
                  onChange={changeTickingVolume}
                  min={0}
                  max={1}
                />
                <Volume2 size={18} className="shrink-0 text-faint" />
              </div>
            )}
          </div>
        </section>
      </div>
    </Sheet>
  )
}
