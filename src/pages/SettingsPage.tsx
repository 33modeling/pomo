import { type ReactNode, useEffect } from 'react'
import {
  Bell,
  Info,
  Palette,
  Play,
  Target,
  Timer,
  Volume2,
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
import { useSettingsStore } from '../store/settingsStore'
import { useThemeStore } from '../store/themeStore'
import { useTimerStore } from '../store/timerStore'
import { audio } from '../audio/audioEngine'
import { ALARMS, NOISES } from '../audio/catalog'
import { ensureNotificationPermission } from '../lib/notifications'
import type { AlarmSoundId, NoiseId, Theme } from '../types'
import { cn } from '../lib/cn'

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
  const s = useSettingsStore()
  const update = useSettingsStore((st) => st.update)
  const reset = useSettingsStore((st) => st.reset)
  const theme = useThemeStore((st) => st.theme)
  const setTheme = useThemeStore((st) => st.setTheme)

  // Stop any sound previewed here when leaving, unless a focus session is live.
  useEffect(() => {
    return () => {
      const t = useTimerStore.getState()
      if (!(t.status === 'running' && t.mode === 'focus')) {
        audio.stopNoise()
        audio.stopTicking()
      }
    }
  }, [])

  const selectAlarm = (id: AlarmSoundId) => {
    update({ alarmSound: id })
    if (id !== 'none') audio.previewAlarm(id, s.alarmVolume)
  }

  const selectNoise = (id: NoiseId) => {
    update({ whiteNoise: id })
    audio.unlock()
    if (id === 'none') audio.stopNoise()
    else audio.setNoise(id, s.whiteNoiseVolume)
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
    { value: 'light', label: '라이트' },
    { value: 'dark', label: '다크' },
    { value: 'system', label: '시스템' },
  ]

  return (
    <div className="animate-fade-in">
      <Header title="설정" />
      <div className="space-y-7 px-5 pb-8 pt-2">
        {/* 타이머 */}
        <Section icon={<Timer size={14} />} title="타이머">
          <Row
            label="집중 시간"
            control={
              <Stepper
                value={s.focusMin}
                onChange={(v) => update({ focusMin: v })}
                min={1}
                max={180}
                suffix="분"
              />
            }
          />
          <Row
            label="짧은 휴식"
            control={
              <Stepper
                value={s.shortMin}
                onChange={(v) => update({ shortMin: v })}
                min={1}
                max={180}
                suffix="분"
              />
            }
          />
          <Row
            label="긴 휴식"
            control={
              <Stepper
                value={s.longMin}
                onChange={(v) => update({ longMin: v })}
                min={1}
                max={180}
                suffix="분"
              />
            }
          />
          <Row
            label="긴 휴식 간격"
            hint="집중 N회마다 긴 휴식"
            control={
              <Stepper
                value={s.longBreakInterval}
                onChange={(v) => update({ longBreakInterval: v })}
                min={2}
                max={12}
                suffix="회"
              />
            }
          />
        </Section>

        {/* 자동화 */}
        <Section icon={<Zap size={14} />} title="자동화">
          <Row
            label="휴식 자동 시작"
            control={
              <Switch
                checked={s.autoStartBreaks}
                onChange={(v) => update({ autoStartBreaks: v })}
              />
            }
          />
          <Row
            label="다음 집중 자동 시작"
            control={
              <Switch
                checked={s.autoStartFocus}
                onChange={(v) => update({ autoStartFocus: v })}
              />
            }
          />
        </Section>

        {/* 목표 */}
        <Section icon={<Target size={14} />} title="목표">
          <Row
            label="하루 목표"
            hint="하루에 완료할 집중 횟수"
            control={
              <Stepper
                value={s.dailyGoal}
                onChange={(v) => update({ dailyGoal: v })}
                min={1}
                max={30}
                suffix="개"
              />
            }
          />
        </Section>

        {/* 사운드 */}
        <Section icon={<Volume2 size={14} />} title="사운드">
          <div className="space-y-3 py-3">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-medium text-ink">알림음</p>
              <IconButton
                label="미리듣기"
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
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <SliderRow
            label="알림음 볼륨"
            value={s.alarmVolume}
            onChange={(v) => update({ alarmVolume: v })}
          />

          <Row
            label="초침 소리"
            control={
              <Switch
                checked={s.tickingEnabled}
                onChange={(v) => update({ tickingEnabled: v })}
              />
            }
          />
          {s.tickingEnabled && (
            <SliderRow
              label="초침 볼륨"
              value={s.tickingVolume}
              onChange={(v) => {
                update({ tickingVolume: v })
                audio.setTickingVolume(v)
              }}
            />
          )}

          <div className="space-y-3 py-3">
            <p className="text-[15px] font-medium text-ink">백색소음</p>
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
              {NOISES.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => selectNoise(n.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition',
                    s.whiteNoise === n.id
                      ? 'bg-accent text-on-accent'
                      : 'bg-surface-2 text-muted hover:text-ink',
                  )}
                >
                  <span>{n.emoji}</span>
                  <span>{n.label}</span>
                </button>
              ))}
            </div>
          </div>
          <SliderRow
            label="백색소음 볼륨"
            value={s.whiteNoiseVolume}
            onChange={(v) => {
              update({ whiteNoiseVolume: v })
              audio.setNoiseVolume(v)
            }}
          />
        </Section>

        {/* 알림 & 기기 */}
        <Section icon={<Bell size={14} />} title="알림 & 기기">
          <Row
            label="알림"
            hint="세션 종료 시 알림 표시"
            control={
              <Switch
                checked={s.notificationsEnabled}
                onChange={(v) => void toggleNotifications(v)}
              />
            }
          />
          <Row
            label="진동"
            control={
              <Switch
                checked={s.vibrationEnabled}
                onChange={(v) => update({ vibrationEnabled: v })}
              />
            }
          />
          <Row
            label="화면 켜짐 유지"
            hint="타이머 진행 중 화면 끄지 않기"
            control={
              <Switch
                checked={s.keepAwake}
                onChange={(v) => update({ keepAwake: v })}
              />
            }
          />
        </Section>

        {/* 화면 */}
        <Section icon={<Palette size={14} />} title="화면">
          <div className="space-y-3 py-3">
            <p className="text-[15px] font-medium text-ink">테마</p>
            <SegmentedControl
              options={themeOptions}
              value={theme}
              onChange={setTheme}
            />
          </div>
          <Row
            label="시작 시 탁상시계 모드"
            hint="타이머를 시작하면 큰 시계 화면으로 전환"
            control={
              <Switch
                checked={s.clockOnStart}
                onChange={(v) => update({ clockOnStart: v })}
              />
            }
          />
        </Section>

        {/* 정보 */}
        <Section icon={<Info size={14} />} title="정보">
          <Row
            label="앱"
            control={<span className="text-sm text-muted">Pomo</span>}
          />
          <Row
            label="버전"
            control={<span className="nums text-sm text-muted">1.0.0</span>}
          />
          <div className="py-3">
            <p className="text-xs leading-relaxed text-faint">
              모든 데이터는 이 기기에만 저장됩니다 · 로그인 불필요
            </p>
          </div>
        </Section>

        <Button
          variant="danger"
          full
          onClick={() => {
            if (confirm('설정을 초기화할까요?')) reset()
          }}
        >
          설정 초기화
        </Button>
      </div>
    </div>
  )
}
