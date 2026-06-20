import { create } from 'zustand'
import { messages } from './messages'

export type Lang = 'ko' | 'en'
export type LangPref = 'ko' | 'en' | 'system'

const KEY = 'pomo-lang'

function read(): LangPref {
  if (typeof localStorage === 'undefined') return 'system'
  return (localStorage.getItem(KEY) as LangPref | null) ?? 'system'
}

function systemLang(): Lang {
  if (
    typeof navigator !== 'undefined' &&
    navigator.language?.toLowerCase().startsWith('ko')
  ) {
    return 'ko'
  }
  return 'en'
}

function resolve(pref: LangPref): Lang {
  return pref === 'system' ? systemLang() : pref
}

interface I18nState {
  pref: LangPref
  lang: Lang
  setPref: (pref: LangPref) => void
}

export const useI18nStore = create<I18nState>((set) => ({
  pref: read(),
  lang: resolve(read()),
  setPref: (pref) => {
    localStorage.setItem(KEY, pref)
    const lang = resolve(pref)
    document.documentElement.lang = lang
    set({ pref, lang })
  },
}))

export function getLang(): Lang {
  return useI18nStore.getState().lang
}

type Params = Record<string, string | number>

/** Translate a key with optional {placeholder} interpolation. */
export function t(key: string, params?: Params): string {
  const lang = getLang()
  let msg = messages[lang][key] ?? messages.en[key] ?? key
  if (params) {
    for (const k of Object.keys(params)) {
      msg = msg.split(`{${k}}`).join(String(params[k]))
    }
  }
  return msg
}

/** Hook form: subscribes to the language so the component re-renders on switch. */
export function useT(): typeof t {
  useI18nStore((s) => s.lang)
  return t
}

export function initLang(): void {
  document.documentElement.lang = getLang()
}
