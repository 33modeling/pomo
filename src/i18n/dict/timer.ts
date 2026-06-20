import type { Dict } from '../messages'

// Filled by the i18n migration. Keys are flat dot-paths (e.g. 'timer.title').
export const timer: Dict = {
  ko: {
    'timer.clock': '탁상시계',
    'timer.sounds': '사운드',
    'timer.rounds': '라운드 표시',
    'timer.selectTask': '작업 선택',
    'timer.clearTask': '작업 해제',
    'timer.reset': '초기화',
    'timer.pause': '일시정지',
    'timer.start': '시작',
    'timer.skip': '건너뛰기',
    'timer.today': '오늘',
    'timer.pomoUnit': '뽀모도로',
    'timer.empty.title': '할 일이 없어요',
    'timer.empty.hint': '할 일 탭에서 작업을 추가해 보세요.',
  },
  en: {
    'timer.clock': 'Desk clock',
    'timer.sounds': 'Sounds',
    'timer.rounds': 'Round indicator',
    'timer.selectTask': 'Select task',
    'timer.clearTask': 'Clear task',
    'timer.reset': 'Reset',
    'timer.pause': 'Pause',
    'timer.start': 'Start',
    'timer.skip': 'Skip',
    'timer.today': 'Today',
    'timer.pomoUnit': 'pomodoros',
    'timer.empty.title': 'No tasks yet',
    'timer.empty.hint': 'Add tasks from the Tasks tab.',
  },
}
