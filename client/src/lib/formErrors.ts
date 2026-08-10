/**
 * Turning an API failure into something a form can render field by field.
 *
 * The backend already does the hard half: its validation handler flattens
 * pydantic errors into `{detail, fields: {name: message}}`. Most forms here
 * threw that away and showed only the detail — so "Some fields need attention"
 * appeared above a form with no indication of *which* field, which is close to
 * useless when the rule is something invisible like a minimum length.
 *
 * Rules this encodes:
 *  - A message about a field belongs on that field, never in the banner.
 *  - The banner is for failures with no field to blame: network errors, rate
 *    limits, a rejected captcha, a 500.
 *  - A field error the form does not render must still be shown somewhere, or
 *    the submit button appears to do nothing. Those fall back to the banner.
 */

import { useCallback, useMemo, useState } from 'react'
import { ApiError } from '@/lib/api'

export interface FormErrorState {
  /** Show above the form. Null when every problem sits on a field. */
  general: string | null
  /** Message for one field, or undefined. */
  for: (name: string) => string | undefined
  /** True when anything at all went wrong. */
  any: boolean
  capture: (err: unknown) => void
  clear: () => void
}

/**
 * @param rendered Field names this form actually shows an error slot for.
 *                 Anything the server blames that is not in here is promoted
 *                 to the banner rather than silently swallowed.
 */
export function useFormErrors(rendered: readonly string[] = []): FormErrorState {
  const [detail, setDetail] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})

  const capture = useCallback((err: unknown) => {
    if (err instanceof ApiError) {
      const found = err.fields ?? {}
      setFields(found)
      // Suppress the generic wrapper when the specifics are already on show.
      setDetail(Object.keys(found).length ? null : err.message)
      return
    }
    setFields({})
    setDetail(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
  }, [])

  const clear = useCallback(() => {
    setDetail(null)
    setFields({})
  }, [])

  // Keys the caller cannot display — surface them rather than lose them.
  const orphaned = useMemo(() => {
    const known = new Set(rendered)
    return Object.entries(fields)
      .filter(([name]) => !known.has(name))
      .map(([name, message]) =>
        // `_` is what the backend uses when an error has no field path at all.
        name === '_' ? message : `${humanise(name)}: ${message}`,
      )
    // `rendered` is an inline literal at every call site; comparing by identity
    // would rebuild this on every render for no benefit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields])

  const general = detail ?? (orphaned.length ? orphaned.join(' ') : null)

  const forField = useCallback(
    (name: string) => fields[name],
    [fields],
  )

  return {
    general,
    for: forField,
    any: Boolean(general) || Object.keys(fields).length > 0,
    capture,
    clear,
  }
}

/** `full_name` → `Full name`, for the rare error we have to print raw. */
function humanise(name: string): string {
  const spaced = name.replace(/[._]/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
