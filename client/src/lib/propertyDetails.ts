import type { ApiCategory, ApiFormField } from '@/types/api'

export interface DetailGroup {
  title: string
  items: { label: string; value: string }[]
}

const formatValue = (value: unknown, fieldName = ''): string => {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') {
    // Years are identifiers, not quantities — never thousand-separate them.
    if (/year/i.test(fieldName)) return String(value)
    return value.toLocaleString('en-RW')
  }
  return String(value)
}

/**
 * Turns a property's free-form `details` JSONB into labelled, grouped rows by
 * looking each key up in the same form definition that produced it — now served
 * from the API, so an admin adding a field sees it here without a deploy.
 *
 * Section headers become group boundaries; anything the form no longer knows
 * about is still shown under "Additional details" rather than silently dropped.
 */
export function buildDetailGroups(
  details: Record<string, unknown> | null | undefined,
  taxonomy: ApiCategory[] | undefined,
  subcategoryId: string,
): DetailGroup[] {
  if (!details || Object.keys(details).length === 0) return []

  const fields: ApiFormField[] =
    taxonomy
      ?.flatMap((c) => c.subcategories)
      .find((s) => s.id === subcategoryId)?.fields ?? []

  const groups: DetailGroup[] = []
  let current: DetailGroup = { title: 'Specification', items: [] }
  const consumed = new Set<string>()

  for (const field of fields) {
    if (field.type === 'section_header') {
      if (current.items.length) groups.push(current)
      current = { title: field.label, items: [] }
      consumed.add(field.name)
      continue
    }

    const raw = details[field.name]
    consumed.add(field.name)
    if (raw === undefined || raw === null || raw === '') continue
    if (Array.isArray(raw) && raw.length === 0) continue

    current.items.push({
      label: field.unit ? `${field.label}` : field.label,
      value: formatValue(raw, field.name),
    })
  }

  if (current.items.length) groups.push(current)

  const extras = Object.entries(details)
    .filter(([key]) => !consumed.has(key))
    .map(([key, value]) => ({
      label: key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()),
      value: formatValue(value, key),
    }))

  if (extras.length) groups.push({ title: 'Additional details', items: extras })

  return groups
}

/** Best-effort YouTube thumbnail + embed URL from a watch/short link. */
export function parseVideoLink(link?: string | null): { embed: string; thumb: string } | null {
  if (!link) return null
  const match = link.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/)
  if (!match) return null
  const id = match[1]
  return {
    embed: `https://www.youtube-nocookie.com/embed/${id}`,
    thumb: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
  }
}
