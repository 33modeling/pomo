import type { AlarmSoundId, NoiseId } from '../types'

export interface NoiseOption {
  id: NoiseId
  label: string
  emoji: string
  desc: string
}

export const NOISES: NoiseOption[] = [
  { id: 'none', label: '없음', emoji: '🔇', desc: '소리 없이 집중' },
  { id: 'white', label: '백색소음', emoji: '🌫️', desc: '균일한 쉬익 소리' },
  { id: 'pink', label: '핑크 노이즈', emoji: '🪷', desc: '부드럽고 균형 잡힌' },
  { id: 'brown', label: '브라운 노이즈', emoji: '🟤', desc: '깊고 낮은 울림' },
  { id: 'rain', label: '빗소리', emoji: '🌧️', desc: '차분한 빗방울' },
  { id: 'ocean', label: '파도소리', emoji: '🌊', desc: '밀려오는 파도' },
  { id: 'fire', label: '모닥불', emoji: '🔥', desc: '타닥이는 장작' },
]

export interface AlarmOption {
  id: AlarmSoundId
  label: string
}

export const ALARMS: AlarmOption[] = [
  { id: 'bell', label: '벨' },
  { id: 'chime', label: '차임' },
  { id: 'digital', label: '디지털' },
  { id: 'ping', label: '핑' },
  { id: 'none', label: '무음' },
]
