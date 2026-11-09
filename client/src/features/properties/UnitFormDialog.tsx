import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Wand2 } from 'lucide-react'
import { api } from '@/shared/api/client'
import type { UnitDetail, UnitOut } from '@/shared/api/types'
import { useApiMutation } from '@/shared/lib/useApiMutation'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'
import { Checkbox, Field, FormError, FormGrid, Input, Select, Textarea } from '@/shared/ui/Form'
import { rentError, suggestCode, TagInput, TOILET_OPTIONS, unitPrefix, unitTypesFor } from './shared'

const schema = z
  .object({
    code: z.string(),
    name: z.string().trim().min(1, 'Enter a name').max(160),
    unit_type: z.enum(['house', 'apartment', 'room', 'studio', 'commercial']),
    parent_unit_id: z.string(),
    bedrooms: z.string().regex(/^\d{1,2}$/, 'Whole number (0–50)'),
    bathrooms: z.string().regex(/^\d{1,2}$/, 'Whole number (0–50)'),
    toilet: z.enum(['private', 'shared']),
    size_sqm: z.string(),
    floor: z.string().max(32),
    furnished: z.boolean(),
    is_featured: z.boolean(),
    monthly_rent: z.string(),
    currency: z.enum(['RWF', 'USD']),
    description: z.string().max(5000),
  })
  .superRefine((v, ctx) => {
    const err = rentError(v.monthly_rent, v.currency)
    if (err) ctx.addIssue({ code: 'custom', path: ['monthly_rent'], message: err })
    if (v.size_sqm && !(Number(v.size_sqm) >= 0)) ctx.addIssue({ code: 'custom', path: ['size_sqm'], message: 'Enter a valid size' })
  })

type Values = z.infer<typeof schema>

/**
 * Create a unit in a property, or edit an existing one.
 * `parents` are the property's top-level units a room can be nested under.
 */
export function UnitFormDialog({
  open,
  onClose,
  propertyId,
  propertyUsage,
  parents,
  unit,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  propertyId: number
  /** residential | commercial | mixed — decides which unit types are offered. */
  propertyUsage?: string
  parents: UnitOut[]
  unit?: UnitDetail | UnitOut
  onSaved?: (u: UnitDetail) => void
}) {
  const editing = !!unit
  const [amenities, setAmenities] = useState<string[]>([])
  const [codeError, setCodeError] = useState<string | null>(null)
  const { register, handleSubmit, reset, watch, setValue, getValues, formState } = useForm<Values>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!open) return
    setCodeError(null)
    setAmenities(unit?.amenities ?? [])
    const firstType = unitTypesFor(propertyUsage)[0]!.value
    const type = (unit?.unit_type as Values['unit_type']) ?? firstType
    reset({
      code: unit?.code ?? '',
      name: unit?.name ?? '',
      unit_type: type,
      parent_unit_id: unit?.parent_unit_id ? String(unit.parent_unit_id) : '',
      bedrooms: String(unit?.bedrooms ?? 1),
      bathrooms: String(unit?.bathrooms ?? 1),
      toilet: (unit?.toilet as Values['toilet']) ?? (type === 'commercial' ? 'shared' : 'private'),
      size_sqm: unit?.size_sqm != null ? String(unit.size_sqm) : '',
      floor: unit?.floor ?? '',
      furnished: unit?.furnished ?? false,
      is_featured: unit?.is_featured ?? false,
      monthly_rent: unit ? String(unit.currency === 'RWF' ? Number(unit.monthly_rent) : unit.monthly_rent) : '',
      currency: (unit?.currency as 'RWF' | 'USD') ?? 'RWF',
      description: unit?.description ?? '',
    })
  }, [open, unit, reset, propertyUsage])

  const save = useApiMutation(
    (v: Values) => {
      const common = {
        name: v.name.trim(),
        unit_type: v.unit_type,
        bedrooms: v.unit_type === 'commercial' ? 0 : Number(v.bedrooms),
        bathrooms: v.unit_type === 'commercial' ? 0 : Number(v.bathrooms),
        toilet: v.toilet,
        size_sqm: v.size_sqm ? v.size_sqm : null,
        floor: v.floor,
        furnished: v.furnished,
        monthly_rent: v.monthly_rent.trim(),
        currency: v.currency,
        description: v.description,
        amenities,
        is_featured: v.is_featured,
        parent_unit_id: v.parent_unit_id ? Number(v.parent_unit_id) : null,
      }
      return editing
        ? api.patch<UnitDetail>(`/units/${unit!.id}`, common)
        : api.post<UnitDetail>('/units', { ...common, property_id: propertyId, code: v.code.trim().toUpperCase() })
    },
    {
      success: editing ? 'Unit updated' : 'Unit created',
      invalidate: [['properties'], ['units'], ['availability']],
      onSuccess: (u) => {
        onSaved?.(u)
        onClose()
      },
    },
  )

  const onSubmit = handleSubmit((v) => {
    if (!editing && !/^[A-Z][A-Z0-9-]{1,31}$/.test(v.code.trim().toUpperCase())) {
      setCodeError('Use a letter followed by letters, digits or "-" (e.g. R101)')
      return
    }
    setCodeError(null)
    save.mutate(v)
  })

  const unitType = watch('unit_type')
  const currency = watch('currency')
  const shop = unitType === 'commercial'
  const types = unitTypesFor(propertyUsage)
  // An existing unit keeps its current type in the list even if it no longer fits.
  const typeOptions = unit && !types.some((t) => t.value === unit.unit_type) ? unitTypesFor('mixed') : types
  const parentOptions = shop
    ? []
    : parents.filter((p) => p.id !== unit?.id && !p.parent_unit_id && p.unit_type !== 'room' && p.unit_type !== 'commercial')

  async function suggest() {
    try {
      setValue('code', await suggestCode('unit', unitPrefix(getValues('unit_type'))))
      setCodeError(null)
    } catch {
      setCodeError('Could not suggest a code')
    }
  }

  const e = formState.errors
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? `Edit unit ${unit!.code}` : 'Add rental unit'}
      description={editing ? 'The unit code is permanent and cannot be changed.' : 'Each unit gets a permanent code that is never reused.'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} block className="sm:w-auto">
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={save.isPending} block className="sm:w-auto">
            {editing ? 'Save changes' : 'Create unit'}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={save.errorText} />
        <FormGrid>
          <Field label="Unit type" required>
            <Select {...register('unit_type')}>
              {typeOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Code" required error={codeError ?? undefined} hint={editing ? undefined : `Suggested prefix: ${unitPrefix(unitType ?? 'room')}`}>
            <div className="flex gap-2">
              <Input {...register('code')} disabled={editing} className="uppercase" placeholder={shop ? "C101" : "R101"} autoCapitalize="characters" />
              {!editing ? (
                <Button variant="outline" icon={Wand2} onClick={suggest} aria-label="Suggest code">
                  <span className="hidden sm:inline">Suggest</span>
                </Button>
              ) : null}
            </div>
          </Field>
          <Field label="Name" required error={e.name?.message} className="sm:col-span-2">
            <Input {...register('name')} placeholder={shop ? 'Shop room 101' : 'Room 101'} />
          </Field>
          {parentOptions.length ? (
            <Field label="Inside unit (optional)" hint="For rooms let separately inside an apartment or house." className="sm:col-span-2">
              <Select {...register('parent_unit_id')}>
                <option value="">— Not inside another unit —</option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} · {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field label="Monthly rent" required error={e.monthly_rent?.message}>
            <Input {...register('monthly_rent')} inputMode="decimal" placeholder={currency === 'USD' ? '650.00' : '150000'} />
          </Field>
          <Field label="Currency" required>
            <Select {...register('currency')}>
              <option value="RWF">RWF — Rwandan franc</option>
              <option value="USD">USD — US dollar</option>
            </Select>
          </Field>
          {!shop ? (
            <>
              <Field label="Bedrooms" error={e.bedrooms?.message}>
                <Input type="number" min={0} inputMode="numeric" {...register('bedrooms')} />
              </Field>
              <Field label="Bathrooms" error={e.bathrooms?.message}>
                <Input type="number" min={0} inputMode="numeric" {...register('bathrooms')} />
              </Field>
            </>
          ) : null}
          <Field label="Toilet" hint={shop ? 'Shop rooms have no bathroom. Is the toilet shared or for this room only?' : 'Shared with other units, or for this unit only.'}>
            <Select {...register('toilet')}>
              {TOILET_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Size (m²)" error={e.size_sqm?.message}>
            <Input inputMode="decimal" {...register('size_sqm')} />
          </Field>
          <Field label="Floor">
            <Input {...register('floor')} placeholder="Ground, 1st…" />
          </Field>
        </FormGrid>
        <Field label="Amenities">
          <TagInput value={amenities} onChange={setAmenities} placeholder="e.g. Parking, Water tank — press Enter" />
        </Field>
        <Field label="Description">
          <Textarea {...register('description')} rows={3} />
        </Field>
        <div className="grid gap-1 sm:grid-cols-2">
          {!shop ? <Checkbox label="Furnished" {...register('furnished')} /> : null}
          <Checkbox label="Featured on website" hint="Shown first when available." {...register('is_featured')} />
        </div>
      </form>
    </Dialog>
  )
}
