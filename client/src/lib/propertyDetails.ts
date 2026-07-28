import { FORM_CONFIG, type FormField } from '@/data/formConfig'
import { getCategoryById, getSubCategoryById } from '@/data/properties'
import type { Property } from '@/types/property'

export interface DetailGroup {
  title: string
  items: { label: string; value: string }[]
}

const formatValue = (value: unknown, fieldName = ''): string => {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'number') {
    // Years are identifiers, not quantities — never thousand-separate them.
    if (/year/i.test(fieldName)) return String(value)
    return value.toLocaleString('en-RW')
  }
  return String(value)
}

/**
 * Turns a property's free-form `details` JSONB into labelled, grouped rows by
 * looking the keys up in the same FORM_CONFIG that produced them. Section
 * headers in the config become group boundaries; anything the config does not
 * know about is still shown under "Additional details" rather than dropped.
 */
export function buildDetailGroups(property: Property): DetailGroup[] {
  const details = property.details
  if (!details || Object.keys(details).length === 0) return []

  const categoryName = getCategoryById(property.category_id)?.name
  const subCategoryName = getSubCategoryById(property.subcategory_id)?.name

  const fields: FormField[] =
    FORM_CONFIG.find((c) => c.id === categoryName)?.subCategories.find(
      (s) => s.id === subCategoryName,
    )?.fields ?? []

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

    current.items.push({ label: field.label, value: formatValue(raw, field.name) })
  }

  if (current.items.length) groups.push(current)

  // Anything present on the record but absent from the form definition.
  const extras = Object.entries(details)
    .filter(([key]) => !consumed.has(key))
    .map(([key, value]) => ({
      label: key
        .replace(/_/g, ' ')
        .replace(/^\w/, (c) => c.toUpperCase()),
      value: formatValue(value),
    }))

  if (extras.length) groups.push({ title: 'Additional details', items: extras })

  return groups
}

/** Best-effort YouTube thumbnail + embed URL from a watch/short link. */
export function parseVideoLink(link?: string): { embed: string; thumb: string } | null {
  if (!link) return null
  const match = link.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/)
  if (!match) return null
  const id = match[1]
  return {
    embed: `https://www.youtube-nocookie.com/embed/${id}`,
    thumb: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
  }
}
