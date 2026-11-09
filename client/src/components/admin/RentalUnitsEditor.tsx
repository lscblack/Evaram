import { Plus, Trash2 } from 'lucide-react'
import { FIELD } from '@/components/admin/ui'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { cn } from '@/lib/utils'
import type { RentalUnitKind } from '@/types/api'

/** The units as the form holds them — strings, so inputs can be half-typed. */
export interface UnitDraft {
  label: string
  kind: RentalUnitKind
  bedrooms: string
  bathrooms: string
  size_sqm: string
  rent: string
  furnished: boolean
  available_from: string
  is_available: boolean
  notes: string
}

export const UNIT_KINDS: { id: RentalUnitKind; label: string }[] = [
  { id: 'apartment', label: 'Apartment' },
  { id: 'house', label: 'House' },
  { id: 'studio', label: 'Studio' },
  { id: 'room', label: 'Room' },
  { id: 'office', label: 'Office' },
  { id: 'shop', label: 'Shop' },
  { id: 'other', label: 'Other' },
]

export const EMPTY_UNIT: UnitDraft = {
  label: '',
  kind: 'apartment',
  bedrooms: '',
  bathrooms: '',
  size_sqm: '',
  rent: '',
  furnished: false,
  available_from: '',
  is_available: true,
  notes: '',
}

/**
 * The flats, rooms or shops let inside one rental listing.
 *
 * A block of six apartments is one listing with six units, each with its own
 * size, rent and availability — not six listings. Rows are compact on
 * purpose: a manager adding a whole block should not have to scroll a page
 * per flat.
 */
export function RentalUnitsEditor({
  units,
  onChange,
  currency = 'RWF',
}: {
  units: UnitDraft[]
  onChange: (next: UnitDraft[]) => void
  currency?: string
}) {
  const update = (index: number, patch: Partial<UnitDraft>) =>
    onChange(units.map((u, i) => (i === index ? { ...u, ...patch } : u)))

  const add = () =>
    onChange([
      ...units,
      {
        ...EMPTY_UNIT,
        // The next row usually looks like the last: same kind, same rent.
        kind: units[units.length - 1]?.kind ?? 'apartment',
        rent: units[units.length - 1]?.rent ?? '',
        bedrooms: units[units.length - 1]?.bedrooms ?? '',
        bathrooms: units[units.length - 1]?.bathrooms ?? '',
      },
    ])

  const open = units.filter((u) => u.is_available).length

  return (
    <div className="space-y-3">
      {units.map((unit, i) => (
        <div
          key={i}
          className={cn(
            'rounded-2xl border p-3.5',
            unit.is_available ? 'border-line bg-surface' : 'border-line bg-canvas-alt opacity-80',
          )}
        >
          <div className="grid gap-3 sm:grid-cols-12">
            <label className="sm:col-span-4">
              <span className="mb-1 block text-[0.6875rem] font-bold tracking-wide text-ink-muted uppercase">
                Unit / room
              </span>
              <input
                className={cn(FIELD, 'h-10')}
                value={unit.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder="Flat 2B · Room 3 · Ground-floor shop"
              />
            </label>
            <label className="sm:col-span-3">
              <span className="mb-1 block text-[0.6875rem] font-bold tracking-wide text-ink-muted uppercase">
                Type
              </span>
              <select
                className={cn(FIELD, 'h-10')}
                value={unit.kind}
                onChange={(e) => update(i, { kind: e.target.value as RentalUnitKind })}
              >
                {UNIT_KINDS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-5">
              <span className="mb-1 block text-[0.6875rem] font-bold tracking-wide text-ink-muted uppercase">
                Rent per month
              </span>
              <MoneyInput
                currency={currency}
                className={cn(FIELD, 'h-10')}
                value={unit.rent}
                onChange={(v) => update(i, { rent: v })}
              />
            </label>

            <label className="sm:col-span-2">
              <span className="mb-1 block text-[0.6875rem] font-bold tracking-wide text-ink-muted uppercase">
                Beds
              </span>
              <input
                type="number"
                min={0}
                className={cn(FIELD, 'h-10')}
                value={unit.bedrooms}
                onChange={(e) => update(i, { bedrooms: e.target.value })}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1 block text-[0.6875rem] font-bold tracking-wide text-ink-muted uppercase">
                Baths
              </span>
              <input
                type="number"
                min={0}
                className={cn(FIELD, 'h-10')}
                value={unit.bathrooms}
                onChange={(e) => update(i, { bathrooms: e.target.value })}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1 block text-[0.6875rem] font-bold tracking-wide text-ink-muted uppercase">
                Size (sqm)
              </span>
              <input
                type="number"
                min={0}
                className={cn(FIELD, 'h-10')}
                value={unit.size_sqm}
                onChange={(e) => update(i, { size_sqm: e.target.value })}
              />
            </label>
            <label className="sm:col-span-3">
              <span className="mb-1 block text-[0.6875rem] font-bold tracking-wide text-ink-muted uppercase">
                Available from
              </span>
              <input
                type="date"
                className={cn(FIELD, 'h-10')}
                value={unit.available_from}
                onChange={(e) => update(i, { available_from: e.target.value })}
              />
            </label>
            <div className="flex items-end gap-3 sm:col-span-3">
              <label className="flex h-10 cursor-pointer items-center gap-2 text-[0.8125rem] text-ink">
                <input
                  type="checkbox"
                  className="size-4 accent-gold-500"
                  checked={unit.furnished}
                  onChange={(e) => update(i, { furnished: e.target.checked })}
                />
                Furnished
              </label>
              <label className="flex h-10 cursor-pointer items-center gap-2 text-[0.8125rem] text-ink">
                <input
                  type="checkbox"
                  className="size-4 accent-gold-500"
                  checked={unit.is_available}
                  onChange={(e) => update(i, { is_available: e.target.checked })}
                />
                Available
              </label>
            </div>

            <label className="sm:col-span-11">
              <input
                className={cn(FIELD, 'h-10')}
                value={unit.notes}
                onChange={(e) => update(i, { notes: e.target.value })}
                placeholder="Notes — balcony, own meter, parking, top floor…"
              />
            </label>
            <div className="flex items-center justify-end sm:col-span-1">
              <button
                type="button"
                onClick={() => onChange(units.filter((_, j) => j !== i))}
                aria-label="Remove this unit"
                className="grid size-10 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-canvas-alt hover:text-red-600"
              >
                <Trash2 className="size-4" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[0.8125rem] font-semibold text-ink-soft transition-colors hover:text-ink"
        >
          <Plus className="size-3.5" strokeWidth={2.4} />
          {units.length ? 'Add another unit or room' : 'Add a unit or room'}
        </button>
        {units.length > 0 && (
          <p className="text-[0.75rem] text-ink-muted">
            {open} of {units.length} available
          </p>
        )}
      </div>
    </div>
  )
}
