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

  const soundCount = Object.keys(s.soundMix).length
  const [soundsOpen, setSoundsOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!confirm('현재 데이터를 백업 파일로 덮어쓸까요? 되돌릴 수 없습니다.')) return
    try {
      const r = await importFromFile(file)
      alert(`가져오기 완료 — 할 일 ${r.tasks}개, 기록 ${r.sessions}개`)
    } catch (err) {
      alert(err instanceof Error ? err.message : '가져오기에 실패했습니다.')
    }
  }

  const saveCurrentPreset = () => {
    const name = prompt('프리셋 이름')?.trim()
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
          <div className="space-y-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[15px] font-medium text-ink">프리셋</p>
              <Button size="sm" variant="ghost" onClick={saveCurrentPreset}>
                현재 설정 저장
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
                      {p.name}
                    </button>
                    {deletable && (
                      <button
                        type="button"
                        aria-label={`${p.name} 삭제`}
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

          <button
            type="button"
            onClick={() => setSoundsOpen(true)}
            className="flex w-full items-center justify-between py-3 text-left"
          >
            <div>
              <p className="text-[15px] font-medium text-ink">집중 사운드</p>
              <p className="mt-0.5 text-xs text-muted">
                {soundCount > 0
                  ? `${soundCount}개 믹스 중`
                  : '자연의 소리·노이즈 믹스, 사운드 타이머'}
              </p>
            </div>
            <ChevronRight size={20} className="shrink-0 text-faint" />
          </button>
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

        {/* 데이터 */}
        <Section icon={<Database size={14} />} title="데이터">
          <Row
            label="내보내기"
            hint="모든 데이터를 JSON 파일로 저장"
            control={
              <Button size="sm" onClick={() => void exportToFile()}>
                <Download size={16} />
                내보내기
              </Button>
            }
          />
          <Row
            label="가져오기"
            hint="백업 파일에서 복원 (기존 데이터 대체)"
            control={
              <Button size="sm" onClick={() => fileRef.current?.click()}>
                <Upload size={16} />
                가져오기
              </Button>
            }
          />
          <Row
            label="세션 CSV 내보내기"
            hint="집중 기록을 표로 저장"
            control={
              <Button size="sm" onClick={() => void exportSessionsCsv()}>
                <Download size={16} />
                CSV
              </Button>
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
