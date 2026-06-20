import type { Dict } from '../messages'

// Filled by the i18n migration. Keys are flat dot-paths (e.g. 'tasks.title').
export const tasks: Dict = {
  ko: {
    'tasks.title': '할 일',
    'tasks.addProject': '프로젝트 추가',
    'tasks.filter.all': '전체',

    'tasks.group.today': '오늘',
    'tasks.group.upcoming': '예정',
    'tasks.group.someday': '언젠가',
    'tasks.group.done': '완료됨 {count}',

    'tasks.empty.title': '할 일이 없어요',
    'tasks.empty.hint': '아래 버튼을 눌러 첫 할 일을 추가해 보세요.',
    'tasks.empty.filtered': '남은 할 일이 없어요.',

    'tasks.add': '할 일 추가',
    'tasks.titlePlaceholder': '무엇을 할까요?',
    'tasks.field.project': '프로젝트',
    'tasks.field.estimate': '예상 뽀모도로',
    'tasks.field.priority': '우선순위',
    'tasks.field.due': '마감일',
    'tasks.field.remind': '알림',
    'tasks.field.repeat': '반복',
    'tasks.field.subtasks': '하위 항목',
    'tasks.field.note': '메모',

    'tasks.due.none': '없음',
    'tasks.due.today': '오늘',
    'tasks.due.tomorrow': '내일',
    'tasks.dueLabel': '{m}월 {d}일',

    'tasks.remind.hint': '기기 앱(APK)에서 알림이 울립니다',
    'tasks.remind.badge': '알림',

    'tasks.subtask.add': '하위 항목 추가',
    'tasks.subtask.placeholder': '하위 항목 추가',

    'tasks.notePlaceholder': '메모 (선택)',
    'tasks.detail.titlePlaceholder': '제목',
    'tasks.detail.completedCount': '완료 {count}회',

    'tasks.action.startFocus': '집중 시작',
    'tasks.action.complete': '완료',
    'tasks.action.uncomplete': '완료 취소',
    'tasks.action.delete': '삭제',
    'tasks.action.confirmDelete': '삭제 확인',

    'tasks.project.name': '이름',
    'tasks.project.namePlaceholder': '프로젝트 이름',
    'tasks.project.color': '색상',
    'tasks.project.colorLabel': '색상 {color}',
  },
  en: {
    'tasks.title': 'Tasks',
    'tasks.addProject': 'Add project',
    'tasks.filter.all': 'All',

    'tasks.group.today': 'Today',
    'tasks.group.upcoming': 'Upcoming',
    'tasks.group.someday': 'Someday',
    'tasks.group.done': 'Completed {count}',

    'tasks.empty.title': 'No tasks yet',
    'tasks.empty.hint': 'Tap the button below to add your first task.',
    'tasks.empty.filtered': 'No tasks left.',

    'tasks.add': 'Add task',
    'tasks.titlePlaceholder': 'What needs doing?',
    'tasks.field.project': 'Project',
    'tasks.field.estimate': 'Estimated pomodoros',
    'tasks.field.priority': 'Priority',
    'tasks.field.due': 'Due date',
    'tasks.field.remind': 'Reminder',
    'tasks.field.repeat': 'Repeat',
    'tasks.field.subtasks': 'Subtasks',
    'tasks.field.note': 'Note',

    'tasks.due.none': 'None',
    'tasks.due.today': 'Today',
    'tasks.due.tomorrow': 'Tomorrow',
    'tasks.dueLabel': '{m}/{d}',

    'tasks.remind.hint': 'Reminders ring in the device app (APK)',
    'tasks.remind.badge': 'Reminder',

    'tasks.subtask.add': 'Add subtask',
    'tasks.subtask.placeholder': 'Add a subtask',

    'tasks.notePlaceholder': 'Note (optional)',
    'tasks.detail.titlePlaceholder': 'Title',
    'tasks.detail.completedCount': '{count} done',

    'tasks.action.startFocus': 'Start focus',
    'tasks.action.complete': 'Complete',
    'tasks.action.uncomplete': 'Mark incomplete',
    'tasks.action.delete': 'Delete',
    'tasks.action.confirmDelete': 'Confirm delete',

    'tasks.project.name': 'Name',
    'tasks.project.namePlaceholder': 'Project name',
    'tasks.project.color': 'Color',
    'tasks.project.colorLabel': 'Color {color}',
  },
}
