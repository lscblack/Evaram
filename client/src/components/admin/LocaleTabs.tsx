import { useCallback, useState } from 'react'
import { cn } from '@/lib/utils'

export type Locale = 'en' | 'rw' | 'fr'
export const LOCALES: Locale[] = ['en', 'rw', 'fr']

/** The `translations` blob shape every content model shares. */
export type Translations = Record<string, Record<string, unknown>> | null | undefined

/**
 * Shared EN / RW / FR editing for anything with a `translations` column.
 *
 * Extracted because the drift problem is identical everywhere: editing the
 * English alone leaves the other languages showing an older sentence, and the
 * only reliable fix is editing all three in one save. Blocks, FAQs, services
 * and testimonials all now use this rather than three near-copies.
 */
export function useLocaleDraft<T extends Record<string, string>>(
  english: T,
  translations: Translations,
  fields: readonly (keyof T & string)[],
) {
  const read = useCallback(
    (locale: Locale): T => {
      if (locale === 'en') return english
      const found = (translations?.[locale] ?? {}) as Record<string, unknown>
      const out = {} as T
      for (const field of fields) {
        out[field] = (typeof found[field] === 'string' ? found[field] : '') as T[typeof field]
      }
      return out
    },
    // Built once per mount from the row that was loaded; re-reading on every
    // render would discard whatever the editor has typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const [locale, setLocale] = useState<Locale>('en')
  const [draft, setDraft] = useState(() => ({
    en: { ...english },
    rw: read('rw'),
    fr: read('fr'),
  }))

  const set = (field: keyof T & string, value: string) =>
    setDraft((d) => ({ ...d, [locale]: { ...d[locale], [field]: value } }))

  /** Non-empty fields only: blank means "not translated", not "empty string". */
  const pack = (): Record<string, Record<string, string>> | null => {
    const out: Record<string, Record<string, string>> = {}
    for (const l of ['rw', 'fr'] as const) {
      const entries = fields
        .map((f) => [f, (draft[l][f] ?? '').trim()] as const)
        .filter(([, v]) => v)
      if (entries.length) out[l] = Object.fromEntries(entries)
    }
    return Object.keys(out).length ? out : null
  }

  const hasContent = (l: Locale) => fields.some((f) => (draft[l][f] ?? '').trim())

  return { locale, setLocale, draft, current: draft[locale], set, pack, hasContent }
}

/** The EN / RW / FR switch itself. */
export function LocaleTabs({
  locale,
  onChange,
  hasContent,
  className,
}: {
  locale: Locale
  onChange: (locale: Locale) => void
  hasContent: (locale: Locale) => boolean
  className?: string
}) {
  return (
    <div className={cn('flex gap-1 rounded-lg border border-line p-0.5', className)}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={cn(
            'rounded-md px-2.5 py-1 text-[0.75rem] font-bold uppercase transition-colors',
            locale === l ? 'bg-ink text-canvas' : 'text-ink-soft hover:text-ink',
          )}
        >
          {l}
          {l !== 'en' && hasContent(l) && (
            <span className="ml-1 inline-block size-1.5 rounded-full bg-gold-500 align-middle" />
          )}
        </button>
      ))}
    </div>
  )
}

/** Shown above the fields on a non-English tab. */
export function LocaleHint({ locale }: { locale: Locale }) {
  if (locale === 'en') return null
  return (
    <p className="rounded-xl border border-line bg-canvas-alt px-3.5 py-2.5 text-[0.8125rem] text-ink-muted">
      Anything left blank falls back to the English. Saving writes every language at once, so update
      this tab whenever you change the English.
    </p>
  )
}
