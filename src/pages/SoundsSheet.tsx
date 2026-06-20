import { Volume2, VolumeX, X } from 'lucide-react'
import { useState } from 'react'
import { audio } from '../audio/audioEngine'
import { NOISES } from '../audio/catalog'
import { Button } from '../components/Button'
import { SegmentedControl } from '../components/SegmentedControl'
import { Sheet } from '../components/Sheet'
import { Slider } from '../components/Slider'
import { Switch } from '../components/Switch'
import { useT } from '../i18n'
import { cn } from '../lib/cn'
import { useSettingsStore } from '../store/settingsStore'
import { useTimerStore } from '../store/timerStore'
import type { NoiseId } from '../types'

interface Props {
  open: boolean
  onClose: () => void
}

export function SoundsSheet({ open, onClose }: Props) {
  const t = useT()

  const AUTO_STOP_OPTIONS = [
    { value: '0', label: t('common.off') },
    { value: '15', label: t('sounds.autoStop.15') },
    { value: '30', label: t('sounds.autoStop.30') },
    { value: '60', label: t('sounds.autoStop.60') },
  ]

  const soundMix = useSettingsStore((s) => s.soundMix)
  const tickingEnabled = useSettingsStore((s) => s.tickingEnabled)
  const tickingVolume = useSettingsStore((s) => s.tickingVolume)
  const soundAutoStopMin = useSettingsStore((s) => s.soundAutoStopMin)
  const soundPresets = useSettingsStore((s) => s.soundPresets)
  const update = useSettingsStore((s) => s.update)

  const [presetName, setPresetName] = useState('')

  const sounds = NOISES.filter((n) => n.id !== 'none')
  const activeCount = Object.keys(soundMix).length

  const apply = (mix: Partial<Record<NoiseId, number>>) => {
    update({ soundMix: mix })
    audio.unlock()
    audio.setMix(mix)
  }

  const savePreset = () => {
    const name = presetName.trim()
    if (!name || Object.keys(soundMix).length === 0) return
    update({ soundPresets: [...soundPresets, { name, mix: { ...soundMix } }] })
    setPresetName('')
  }

  const deletePreset = (idx: number) => {
    update({ soundPresets: soundPresets.filter((_, i) => i !== idx) })
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
    <Sheet open={open} onClose={handleClose} title={t('sounds.title')}>
      <div className="flex flex-col gap-7 pb-2">
        {/* Ambient mix */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted">
              {t('sounds.mix.heading')}
            </h3>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={() => apply({})}
                className="text-xs font-semibold text-muted hover:text-ink"
              >
                {t('sounds.mix.clearAll')}
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
                    {t(`sound.${n.id}`)}
                  </span>
                  <span className="text-[11px] leading-tight text-faint">
                    {t(`sound.${n.id}.desc`)}
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
                  {n.emoji} {t(`sound.${n.id}`)}
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

        {/* Saved sound presets */}
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-muted">
            {t('sounds.presets.heading')}
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder={t('sounds.presets.namePlaceholder')}
              className="h-11 min-w-0 flex-1 rounded-2xl border border-line bg-surface-2 px-4 text-[15px] text-ink placeholder:text-faint focus:border-accent focus:outline-none"
            />
            <Button
              type="button"
              onClick={savePreset}
              disabled={!presetName.trim() || activeCount === 0}
            >
              {t('common.save')}
            </Button>
          </div>
          {soundPresets.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {soundPresets.map((preset, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 rounded-full border border-line bg-surface-2 py-1 pl-3 pr-1.5 text-sm font-semibold text-ink"
                >
                  <button
                    type="button"
                    onClick={() => apply(preset.mix)}
                    className="hover:text-accent"
                  >
                    {preset.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePreset(idx)}
                    aria-label={t('sounds.presets.deleteAria', {
                      name: preset.name,
                    })}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-faint hover:bg-line hover:text-ink"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sound timer (auto fade-out) */}
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted">
            {t('sounds.timer.heading')}
          </h3>
          <SegmentedControl
            options={AUTO_STOP_OPTIONS}
            value={String(soundAutoStopMin)}
            onChange={(v) => update({ soundAutoStopMin: Number(v) })}
          />
          <p className="text-xs text-faint">{t('sounds.timer.hint')}</p>
        </section>

        {/* Ticking */}
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-muted">
            {t('sounds.ticking.heading')}
          </h3>
          <div className="flex flex-col gap-4 rounded-3xl bg-surface-2 px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-semibold text-ink">
                  {t('sounds.ticking.label')}
                </span>
                <span className="text-xs text-faint">
                  {t('sounds.ticking.desc')}
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
