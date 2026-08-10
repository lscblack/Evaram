import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export type ThemeChoice = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'evaramu-theme'

interface ThemeContextValue {
  /** What the user picked, including "follow the system". */
  choice: ThemeChoice
  /** What is actually applied right now. */
  resolved: ResolvedTheme
  setChoice: (choice: ThemeChoice) => void
  /** Flips between light and dark, leaving "system" behind. */
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const systemTheme = (): ResolvedTheme =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'

/**
 * Light unless the visitor says otherwise.
 *
 * "system" remains a choice they can make, but it is no longer the default —
 * an unset preference is not a preference, and the site is designed light
 * first. Must stay in step with the pre-paint script in index.html, or the
 * first frame flashes the wrong theme.
 */
const readStored = (): ThemeChoice => {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(readStored)
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    readStored() === 'system' ? systemTheme() : (readStored() as ResolvedTheme),
  )

  // Apply the class the CSS `dark` variant keys off.
  useEffect(() => {
    const next = choice === 'system' ? systemTheme() : choice
    setResolved(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', next === 'dark' ? '#071523' : '#062B4F')
  }, [choice])

  // Follow the OS while the user is on "system".
  useEffect(() => {
    if (choice !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const next = systemTheme()
      setResolved(next)
      document.documentElement.classList.toggle('dark', next === 'dark')
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [choice])

  const setChoice = useCallback((next: ThemeChoice) => {
    setChoiceState(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }, [])

  const toggle = useCallback(() => {
    setChoiceState((current) => {
      const currentResolved = current === 'system' ? systemTheme() : current
      const next: ThemeChoice = currentResolved === 'dark' ? 'light' : 'dark'
      window.localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ choice, resolved, setChoice, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>')
  return context
}
