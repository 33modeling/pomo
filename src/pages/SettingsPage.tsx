import { type ReactNode, useEffect, useRef, useState } from 'react'
import {
  Bell,
  ChevronRight,
  Database,
  Download,
  Info,
  Palette,
  Play,
  Target,
  Timer,
  Upload,
  Volume2,
  X,
  Zap,
} from 'lucide-react'
import { Header } from '../components/Header'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { IconButton } from '../components/IconButton'
import { Switch } from '../components/Switch'
import { Slider } from '../components/Slider'
import { Stepper } from '../components/Stepper'
import { SegmentedControl } from '../components/SegmentedControl'
import { DEFAULT_SETTINGS, useSettingsStore } from '../store/settingsStore'
import { useThemeStore } from '../store/themeStore'
import { useTimerStore } from '../store/timerStore'
import { audio } from '../audio/audioEngine'
import { ALARMS } from '../audio/catalog'
import { ensureNotificationPermission } from '../lib/notifications'
import { exportSessionsCsv, exportToFile, importFromFile } from '../lib/backup'
import type { AlarmSoundId, Theme } from '../types'
import { cn } from '../lib/cn'
import { SoundsSheet } from './SoundsSheet'
import { useT, useI18nStore, type LangPref } from '../i18n'

/** Built-in timer presets are not deletable. */
const DEFAULT_PRESET_COUNT = DEFAULT_SETTINGS.timerPresets.length

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
        {icon}
        <span>{title}</span>
      </div>
      <Card className="divide-y divide-line px-4">{children}</Card>
    </section>
  )
}

function Row({
  label,
  hint,
  control,
}: {
  label: string
  hint?: string
  control: ReactNode
}) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-ink">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  )
}

function SliderRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-2 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-medium text-ink">{label}</p>
        <span className="nums text-sm font-semibold text-muted">
          {Math.round(value * 100)}%
        </span>
      </div>
      <Slider value={value} onChange={onChange} />
    </div>
  )
}

export function SettingsPage() {
  const t = useT()
  const s = useSettingsStore()
  const update = useSettingsStore((st) => st.update)
  const reset = useSettingsStore((st) => st.reset)
  const theme = useThemeStore((st) => st.theme)
  const setTheme = useThemeStore((st) => st.setTheme)
  const langPref = useI18nStore((st) => st.pref)
  const setLangPref = useI18nStore((st) => st.setPref)

  // Stop any sound previewed here when leaving, unless a focus session is live.
  useEffect(() => {
    return () => {
      const timer = useTimerStore.getState()
      if (!(timer.status === 'running' && timer.mode === 'focus')) {
        audio.stopNoise()
        audio.stopTicking()
      }
    }
  }, [])

  const selectAlarm = (id: AlarmSoundId) => {
    update({ alarmSound: id })
    if (id !== 'none') audio.previewAlarm(id, s.alarmVolume)
  }

  const soundCount = Object.keys(s.soundMix).length
  const [soundsOpen, setSoundsOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!confirm(t('settings.import.confirm'))) return
    try {
      const r = await importFromFile(file)
      alert(t('settings.import.success', { tasks: r.tasks, sessions: r.sessions }))
    } catch (err) {
      alert(err instanceof Error ? err.message : t('settings.import.error'))
    }
  }

  const saveCurrentPreset = () => {
    const name = prompt(t('settings.preset.namePrompt'))?.trim()
    if (!name) return
    update({
      timerPresets: [
        ...s.timerPresets,
        {
          name,
          focusMin: s.focusMin,
          shortMin: s.shortMin,
          longMin: s.longMin,
          longBreakInterval: s.longBreakInterval,
        },
      ],
    })
  }

  const toggleNotifications = async (next: boolean) => {
    if (!next) {
      update({ notificationsEnabled: false })
      return
    }
    const granted = await ensureNotificationPermission()
    update({ notificationsEnabled: granted })
  }

  const themeOptions: { value: Theme; label: string }[] = [
    { value: 'light', label: t('theme.light') },
    { value: 'dark', label: t('theme.dark') },
    { value: 'system', label: t('theme.system') },
  ]

  const langOptions: { value: LangPref; label: string }[] = [
    { value: 'system', label: t('lang.system') },
    { value: 'ko', label: t('lang.ko') },
    { value: 'en', label: t('lang.en') },
  ]

  return (
    <div className="animate-fade-in">
      <Header title={t('settings.title')} />
      <div className="space-y-7 px-5 pb-8 pt-2">
        {/* 타이머 */}
        <Section icon={<Timer size={14} />} title={t('settings.section.timer')}>
          <Row
            label={t('settings.focusTime')}
            control={
              <Stepper
                value={s.focusMin}
                onChange={(v) => update({ focusMin: v })}
                min={1}
                max={180}
                suffix={t('settings.suffix.min')}
              />
            }
          />
          <Row
            label={t('settings.shortBreak')}
            control={
              <Stepper
                value={s.shortMin}
                onChange={(v) => update({ shortMin: v })}
                min={1}
                max={180}
                suffix={t('settings.suffix.min')}
              />
            }
          />
          <Row
            label={t('settings.longBreak')}
            control={
              <Stepper
                value={s.longMin}
                onChange={(v) => update({ longMin: v })}
                min={1}
                max={180}
                suffix={t('settings.suffix.min')}
              />
            }
          />
          <Row
            label={t('settings.longBreakInterval')}
            hint={t('settings.longBreakInterval.hint')}
            control={
              <Stepper
                value={s.longBreakInterval}
                onChange={(v) => update({ longBreakInterval: v })}
                min={2}
                max={12}
                suffix={t('settings.suffix.count')}
              />
            }
          />
          <div className="space-y-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[15px] font-medium text-ink">
                {t('settings.preset')}
              </p>
              <Button size="sm" variant="ghost" onClick={saveCurrentPreset}>
                {t('settings.preset.save')}
              </Button>
            </div>
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
              {s.timerPresets.map((p, i) => {
                const active =
                  s.focusMin === p.focusMin &&
                  s.shortMin === p.shortMin &&
                  s.longMin === p.longMin &&
                  s.longBreakInterval === p.longBreakInterval
                const deletable = i >= DEFAULT_PRESET_COUNT
                return (
                  <div
                    key={`${p.name}-${i}`}
                    className={cn(
                      'flex shrink-0 items-center gap-1.5 rounded-full py-2 pl-4 text-sm font-semibold transition',
                      deletable ? 'pr-2' : 'pr-4',
                      active
                        ? 'bg-accent text-on-accent'
                        : 'bg-surface-2 text-muted',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        update({
                          focusMin: p.focusMin,
                          shortMin: p.shortMin,
                          longMin: p.longMin,
                          longBreakInterval: p.longBreakInterval,
                        })
                      }
                      className={cn(!active && 'hover:text-ink')}
                    >
                      {t(p.name)}
                    </button>
                    {deletable && (
                      <button
                        type="button"
                        aria-label={t('settings.preset.delete', { name: t(p.name) })}
                        onClick={() =>
                          update({
                            timerPresets: s.timerPresets.filter(
                              (_, j) => j !== i,
                            ),
                          })
                        }
                        className="opacity-70 transition hover:opacity-100"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </Section>

        {/* 자동화 */}
        <Section
          icon={<Zap size={14} />}
          title={t('settings.section.automation')}
        >
          <Row
            label={t('settings.autoStartBreaks')}
            control={
              <Switch
                checked={s.autoStartBreaks}
                onChange={(v) => update({ autoStartBreaks: v })}
              />
            }
          />
          <Row
            label={t('settings.autoStartFocus')}
            control={
              <Switch
                checked={s.autoStartFocus}
                onChange={(v) => update({ autoStartFocus: v })}
              />
            }
          />
        </Section>

        {/* 목표 */}
        <Section icon={<Target size={14} />} title={t('settings.section.goal')}>
          <Row
            label={t('settings.dailyGoal')}
            hint={t('settings.dailyGoal.hint')}
            control={
              <Stepper
                value={s.dailyGoal}
                onChange={(v) => update({ dailyGoal: v })}
                min={1}
                max={30}
                suffix={t('settings.suffix.times')}
              />
            }
          />
        </Section>

        {/* 사운드 */}
        <Section icon={<Volume2 size={14} />} title={t('settings.section.sound')}>
          <div className="space-y-3 py-3">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-medium text-ink">
                {t('settings.alarmSound')}
              </p>
              <IconButton
                label={t('settings.preview')}
                onClick={() => audio.previewAlarm(s.alarmSound, s.alarmVolume)}
              >
                <Play size={18} />
              </IconButton>
            </div>
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
              {ALARMS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => selectAlarm(a.id)}
                  className={cn(
                    'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition',
                    s.alarmSound === a.id
                      ? 'bg-accent text-on-accent'
                      : 'bg-surface-2 text-muted hover:text-ink',
                  )}
                >
                  {t(`alarm.${a.id}`)}
                </button>
              ))}
            </div>
          </div>

          <SliderRow
            label={t('settings.alarmVolume')}
            value={s.alarmVolume}
            onChange={(v) => update({ alarmVolume: v })}
          />

          <Row
            label={t('settings.ticking')}
            control={
              <Switch
                checked={s.tickingEnabled}
                onChange={(v) => update({ tickingEnabled: v })}
              />
            }
          />
          {s.tickingEnabled && (
            <SliderRow
              label={t('settings.tickingVolume')}
              value={s.tickingVolume}
              onChange={(v) => {
                update({ tickingVolume: v })
                audio.setTickingVolume(v)
              }}
            />
          )}

          <button
            type="button"
            onClick={() => setSoundsOpen(true)}
            className="flex w-full items-center justify-between py-3 text-left"
          >
            <div>
              <p className="text-[15px] font-medium text-ink">
                {t('settings.focusSound')}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {soundCount > 0
                  ? t('settings.focusSound.mixing', { count: soundCount })
                  : t('settings.focusSound.hint')}
              </p>
            </div>
            <ChevronRight size={20} className="shrink-0 text-faint" />
          </button>
        </Section>

        {/* 알림 & 기기 */}
        <Section
          icon={<Bell size={14} />}
          title={t('settings.section.notifications')}
        >
          <Row
            label={t('settings.notifications')}
            hint={t('settings.notifications.hint')}
            control={
              <Switch
                checked={s.notificationsEnabled}
                onChange={(v) => void toggleNotifications(v)}
              />
            }
          />
          <div className="space-y-2 py-3">
            <p className="text-[15px] font-medium text-ink">
              {t('settings.alertMode')}
            </p>
            <SegmentedControl
              value={
                s.soundEnabled
                  ? s.vibrationEnabled
                    ? 'both'
                    : 'sound'
                  : 'vibration'
              }
              onChange={(m) =>
                update({
                  soundEnabled: m !== 'vibration',
                  vibrationEnabled: m !== 'sound',
                })
              }
              options={[
                { value: 'both', label: t('settings.alertMode.both') },
                { value: 'sound', label: t('settings.alertMode.sound') },
                { value: 'vibration', label: t('settings.alertMode.vibration') },
              ]}
            />
          </div>
          <Row
            label={t('settings.keepAwake')}
            hint={t('settings.keepAwake.hint')}
            control={
              <Switch
                checked={s.keepAwake}
                onChange={(v) => update({ keepAwake: v })}
              />
            }
          />
        </Section>

        {/* 화면 */}
        <Section
          icon={<Palette size={14} />}
          title={t('settings.section.display')}
        >
          <div className="space-y-3 py-3">
            <p className="text-[15px] font-medium text-ink">
              {t('settings.theme')}
            </p>
            <SegmentedControl
              options={themeOptions}
              value={theme}
              onChange={setTheme}
            />
          </div>
          <div className="space-y-3 py-3">
            <p className="text-[15px] font-medium text-ink">
              {t('settings.language')}
            </p>
            <SegmentedControl
              options={langOptions}
              value={langPref}
              onChange={setLangPref}
            />
          </div>
          <Row
            label={t('settings.clockOnStart')}
            hint={t('settings.clockOnStart.hint')}
            control={
              <Switch
                checked={s.clockOnStart}
                onChange={(v) => update({ clockOnStart: v })}
              />
            }
          />
        </Section>

        {/* 데이터 */}
        <Section icon={<Database size={14} />} title={t('settings.section.data')}>
          <Row
            label={t('settings.export')}
            hint={t('settings.export.hint')}
            control={
              <Button size="sm" onClick={() => void exportToFile()}>
                <Download size={16} />
                {t('settings.export')}
              </Button>
            }
          />
          <Row
            label={t('settings.import')}
            hint={t('settings.import.hint')}
            control={
              <Button size="sm" onClick={() => fileRef.current?.click()}>
                <Upload size={16} />
                {t('settings.import')}
              </Button>
            }
          />
          <Row
            label={t('settings.exportCsv')}
            hint={t('settings.exportCsv.hint')}
            control={
              <Button size="sm" onClick={() => void exportSessionsCsv()}>
                <Download size={16} />
                CSV
              </Button>
            }
          />
        </Section>

        {/* 정보 */}
        <Section icon={<Info size={14} />} title={t('settings.section.info')}>
          <Row
            label={t('settings.app')}
            control={<span className="text-sm text-muted">Pomo</span>}
          />
          <Row
            label={t('settings.version')}
            control={<span className="nums text-sm text-muted">1.0.0</span>}
          />
          <div className="py-3">
            <p className="text-xs leading-relaxed text-faint">
              {t('settings.info.note')}
            </p>
          </div>
        </Section>

        <Button
          variant="danger"
          full
          onClick={() => {
            if (confirm(t('settings.reset.confirm'))) reset()
          }}
        >
          {t('settings.reset')}
        </Button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={onImportFile}
      />
      <SoundsSheet open={soundsOpen} onClose={() => setSoundsOpen(false)} />
    </div>
  )
}
