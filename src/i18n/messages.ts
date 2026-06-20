import { core } from './dict/core'
import { nav } from './dict/nav'
import { timer } from './dict/timer'
import { tasks } from './dict/tasks'
import { stats } from './dict/stats'
import { settings } from './dict/settings'
import { sounds } from './dict/sounds'

export interface Dict {
  ko: Record<string, string>
  en: Record<string, string>
}

const all: Dict[] = [core, nav, timer, tasks, stats, settings, sounds]

export const messages = {
  ko: Object.assign({}, ...all.map((d) => d.ko)) as Record<string, string>,
  en: Object.assign({}, ...all.map((d) => d.en)) as Record<string, string>,
}
