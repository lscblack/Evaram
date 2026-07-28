import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { TRANSLATIONS, type TranslationKey } from '@/data/translations'

export type Locale = 'en' | 'rw' | 'fr'

export const LOCALES: { code: Locale; label: string; short: string; flag: string }[] = [
  { code: 'en', label: 'English', short: 'EN', flag: '🇬🇧' },
  { code: 'rw', label: 'Kinyarwanda', short: 'RW', flag: '🇷🇼' },
  { code: 'fr', label: 'Français', short: 'FR', flag: '🇫🇷' },
]

const STORAGE_KEY = 'evaramu-locale'

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  /** Translate a key. Falls back to English, then to the key itself. */
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

const readStored = (): Locale => {
  if (typeof window === 'undefined') return 'en'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'en' || stored === 'rw' || stored === 'fr') return stored
  // Fall back to the browser language when we support it.
  const nav = window.navigator.language?.slice(0, 2)
  if (nav === 'rw' || nav === 'fr') return nav
  return 'en'
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStored)

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    window.localStorage.setItem(STORAGE_KEY, next)
    document.documentElement.lang = next
  }, [])

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      const entry = TRANSLATIONS[key]
      let value = entry?.[locale] ?? entry?.en ?? key
      if (vars) {
        for (const [name, replacement] of Object.entries(vars)) {
          value = value.replace(new RegExp(`\\{${name}\\}`, 'g'), String(replacement))
        }
      }
      return value
    },
    [locale],
  )

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside <I18nProvider>')
  return context
}

/** Shorthand for components that only need the translate function. */
export function useT() {
  return useI18n().t
}
