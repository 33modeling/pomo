import type { Dict } from '../messages'

// Keys are flat dot-paths (e.g. 'settings.title').
export const settings: Dict = {
  ko: {
    'settings.title': '설정',

    // Section titles
    'settings.section.timer': '타이머',
    'settings.section.automation': '자동화',
    'settings.section.goal': '목표',
    'settings.section.sound': '사운드',
    'settings.section.notifications': '알림 & 기기',
    'settings.section.display': '화면',
    'settings.section.data': '데이터',
    'settings.section.info': '정보',

    // Timer
    'settings.focusTime': '집중 시간',
    'settings.shortBreak': '짧은 휴식',
    'settings.longBreak': '긴 휴식',
    'settings.longBreakInterval': '긴 휴식 간격',
    'settings.longBreakInterval.hint': '집중 N회마다 긴 휴식',
    'settings.suffix.min': '분',
    'settings.suffix.count': '회',
    'settings.suffix.times': '개',
    'settings.preset': '프리셋',
    'settings.preset.save': '현재 설정 저장',
    'settings.preset.delete': '{name} 삭제',
    'settings.preset.namePrompt': '프리셋 이름',

    // Automation
    'settings.autoStartBreaks': '휴식 자동 시작',
    'settings.autoStartFocus': '다음 집중 자동 시작',

    // Goal
    'settings.dailyGoal': '하루 목표',
    'settings.dailyGoal.hint': '하루에 완료할 집중 횟수',

    // Sound
    'settings.alarmSound': '알림음',
    'settings.preview': '미리듣기',
    'settings.alarmVolume': '알림음 볼륨',
    'settings.ticking': '초침 소리',
    'settings.tickingVolume': '초침 볼륨',
    'settings.focusSound': '집중 사운드',
    'settings.focusSound.mixing': '{count}개 믹스 중',
    'settings.focusSound.hint': '자연의 소리·노이즈 믹스, 사운드 타이머',

    // Notifications & device
    'settings.notifications': '알림',
    'settings.notifications.hint': '세션 종료 시 알림 표시',
    'settings.vibration': '진동',
    'settings.alertMode': '알림 방식',
    'settings.alertMode.both': '소리+진동',
    'settings.alertMode.sound': '소리만',
    'settings.alertMode.vibration': '진동만',
    'settings.keepAwake': '화면 켜짐 유지',
    'settings.keepAwake.hint': '타이머 진행 중 화면 끄지 않기',

    // Display
    'settings.theme': '테마',
    'settings.language': '언어',
    'settings.clockOnStart': '시작 시 탁상시계 모드',
    'settings.clockOnStart.hint': '타이머를 시작하면 큰 시계 화면으로 전환',

    // Data
    'settings.export': '내보내기',
    'settings.export.hint': '모든 데이터를 JSON 파일로 저장',
    'settings.import': '가져오기',
    'settings.import.hint': '백업 파일에서 복원 (기존 데이터 대체)',
    'settings.exportCsv': '세션 CSV 내보내기',
    'settings.exportCsv.hint': '집중 기록을 표로 저장',
    'settings.import.confirm': '현재 데이터를 백업 파일로 덮어쓸까요? 되돌릴 수 없습니다.',
    'settings.import.success': '가져오기 완료 — 할 일 {tasks}개, 기록 {sessions}개',
    'settings.import.error': '가져오기에 실패했습니다.',

    // Info
    'settings.app': '앱',
    'settings.version': '버전',
    'settings.info.note': '모든 데이터는 이 기기에만 저장됩니다 · 로그인 불필요',
    'settings.reset': '설정 초기화',
    'settings.reset.confirm': '설정을 초기화할까요?',
  },
  en: {
    'settings.title': 'Settings',

    // Section titles
    'settings.section.timer': 'Timer',
    'settings.section.automation': 'Automation',
    'settings.section.goal': 'Goal',
    'settings.section.sound': 'Sound',
    'settings.section.notifications': 'Notifications & Device',
    'settings.section.display': 'Display',
    'settings.section.data': 'Data',
    'settings.section.info': 'About',

    // Timer
    'settings.focusTime': 'Focus time',
    'settings.shortBreak': 'Short break',
    'settings.longBreak': 'Long break',
    'settings.longBreakInterval': 'Long break interval',
    'settings.longBreakInterval.hint': 'Long break every N focus sessions',
    'settings.suffix.min': 'min',
    'settings.suffix.count': 'x',
    'settings.suffix.times': '',
    'settings.preset': 'Preset',
    'settings.preset.save': 'Save current',
    'settings.preset.delete': 'Delete {name}',
    'settings.preset.namePrompt': 'Preset name',

    // Automation
    'settings.autoStartBreaks': 'Auto-start breaks',
    'settings.autoStartFocus': 'Auto-start next focus',

    // Goal
    'settings.dailyGoal': 'Daily goal',
    'settings.dailyGoal.hint': 'Focus sessions to complete each day',

    // Sound
    'settings.alarmSound': 'Alarm sound',
    'settings.preview': 'Preview',
    'settings.alarmVolume': 'Alarm volume',
    'settings.ticking': 'Ticking sound',
    'settings.tickingVolume': 'Ticking volume',
    'settings.focusSound': 'Focus sounds',
    'settings.focusSound.mixing': '{count} mixed',
    'settings.focusSound.hint': 'Nature & noise mixes, sound timer',

    // Notifications & device
    'settings.notifications': 'Notifications',
    'settings.notifications.hint': 'Show a notification when a session ends',
    'settings.vibration': 'Vibration',
    'settings.alertMode': 'Alert style',
    'settings.alertMode.both': 'Both',
    'settings.alertMode.sound': 'Sound',
    'settings.alertMode.vibration': 'Vibrate',
    'settings.keepAwake': 'Keep screen on',
    'settings.keepAwake.hint': "Don't turn off the screen while the timer runs",

    // Display
    'settings.theme': 'Theme',
    'settings.language': 'Language',
    'settings.clockOnStart': 'Clock mode on start',
    'settings.clockOnStart.hint': 'Switch to a large clock view when the timer starts',

    // Data
    'settings.export': 'Export',
    'settings.export.hint': 'Save all data to a JSON file',
    'settings.import': 'Import',
    'settings.import.hint': 'Restore from a backup file (replaces existing data)',
    'settings.exportCsv': 'Export sessions CSV',
    'settings.exportCsv.hint': 'Save focus history as a table',
    'settings.import.confirm':
      'Overwrite current data with the backup file? This cannot be undone.',
    'settings.import.success': 'Import complete — {tasks} tasks, {sessions} sessions',
    'settings.import.error': 'Import failed.',

    // Info
    'settings.app': 'App',
    'settings.version': 'Version',
    'settings.info.note': 'All data is stored on this device only · No sign-in required',
    'settings.reset': 'Reset settings',
    'settings.reset.confirm': 'Reset all settings?',
  },
}
