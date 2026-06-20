import { Volume2, VolumeX } from 'lucide-react'
import { audio } from '../audio/audioEngine'
import { NOISES } from '../audio/catalog'
import { SegmentedControl } from '../components/SegmentedControl'
import { Sheet } from '../components/Sheet'
import { Slider } from '../components/Slider'
import { Switch } from '../components/Switch'
import { cn } from '../lib/cn'
import { useSettingsStore } from '../store/settingsStore'
import { useTimerStore } from '../store/timerStore'
import type { NoiseId } from '../types'

interface Props {
  open: boolean
  onClose: () => void
}

const AUTO_STOP_OPTIONS = [
  { value: '0', label: '끄기' },
  { value: '15', label: '15분' },
  { value: '30', label: '30분' },
  { value: '60', label: '60분' },
]

export function SoundsSheet({ open, onClose }: Props) {
  const soundMix = useSettingsStore((s) => s.soundMix)
  const tickingEnabled = useSettingsStore((s) => s.tickingEnabled)
  const tickingVolume = useSettingsStore((s) => s.tickingVolume)
  const soundAutoStopMin = useSettingsStore((s) => s.soundAutoStopMin)
  const update = useSettingsStore((s) => s.update)

  const sounds = NOISES.filter((n) => n.id !== 'none')
  const activeCount = Object.keys(soundMix).length

  const apply = (mix: Partial<Record<NoiseId, number>>) => {
    update({ soundMix: mix })
    audio.unlock()
    audio.setMix(mix)
  }

  const toggle = (id: NoiseId) => {
    const next = { ...soundMix }
    if (next[id] != null) delete next[id]
    else next[id] = 0.5
    apply(next)
  }

  const setVol = (id: NoiseId, v: number) => {
    update({ soundMix: { ...soundMix, [id]: v } })
    audio.setLayerVolume(id, v)
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
        {/* Ambient mix */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted">
              집중 사운드 · 여러 개 믹스
            </h3>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={() => apply({})}
                className="text-xs font-semibold text-muted hover:text-ink"
              >
                모두 끄기
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {sounds.map((n) => {
              const active = soundMix[n.id] != null
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => toggle(n.id)}
                  aria-pressed={active}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-2xl border px-3 py-4 text-center transition-colors',
                    active
                      ? 'border-accent bg-accent/10'
                      : 'border-line bg-surface-2 hover:bg-surface',
                  )}
                >
                  <span className="text-3xl leading-none">{n.emoji}</span>
                  <span
                    className={cn(
                      'mt-1 text-sm font-semibold',
                      active ? 'text-accent' : 'text-ink',
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

          {/* Per-sound volume for each active layer */}
          {sounds
            .filter((n) => soundMix[n.id] != null)
            .map((n) => (
              <div key={n.id} className="flex items-center gap-3 px-1">
                <span className="w-20 shrink-0 truncate text-xs font-medium text-muted">
                  {n.emoji} {n.label}
                </span>
                <Slider
                  value={soundMix[n.id] ?? 0.5}
                  onChange={(v) => setVol(n.id, v)}
                  min={0}
                  max={1}
                />
              </div>
            ))}
        </section>

        {/* Sound timer (auto fade-out) */}
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted">사운드 타이머</h3>
          <SegmentedControl
            options={AUTO_STOP_OPTIONS}
            value={String(soundAutoStopMin)}
            onChange={(v) => update({ soundAutoStopMin: Number(v) })}
          />
          <p className="text-xs text-faint">
            설정한 시간이 지나면 사운드가 서서히 꺼집니다 (집중 세션 중).
          </p>
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
