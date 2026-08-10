/**
 * Locale overlay for admin-authored content.
 *
 * Rows from the API carry a `translations` blob keyed by locale, holding only
 * the fields an admin actually translated:
 *
 *     { rw: { title: 'Uruziga rw’Ubukungu' }, fr: { title: 'Cycle de Richesse' } }
 *
 * `localize` merges the active locale's fields over the row, so a component
 * keeps reading `service.title` and gets the right language without knowing
 * translation exists. Anything untranslated falls through to the English column.
 *
 * This is deliberately not `t()`. Static UI labels live in the string table;
 * this is for rows an admin edits.
 */

import { useCallback } from 'react'
import { useI18n } from '@/lib/i18n'

export interface Translatable {
  translations?: Record<string, Record<string, unknown>> | null
}

/** Merges one row. Exported for the rare caller that already knows the locale. */
export function applyLocale<T extends Translatable>(row: T, locale: string): T {
  if (locale === 'en' || !row?.translations) return row
  const override = row.translations[locale]
  if (!override) return row
  // Blank values mean "not translated yet" and must not blank out the English.
  const filled = Object.fromEntries(
    Object.entries(override).filter(([, value]) => value !== null && value !== '' && value !== undefined),
  )
  return { ...row, ...filled }
}

/** `const localize = useLocalize()` then `localize(service).title`. */
export function useLocalize() {
  const { locale } = useI18n()
  return useCallback(<T extends Translatable>(row: T) => applyLocale(row, locale), [locale])
}

/** List form, for the common `rows.map(...)` case. */
export function useLocalizeAll() {
  const { locale } = useI18n()
  return useCallback(
    <T extends Translatable>(rows: T[] | undefined | null): T[] =>
      (rows ?? []).map((row) => applyLocale(row, locale)),
    [locale],
  )
}
