import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2, Home, Store, Users, Wand2, type LucideIcon } from 'lucide-react'
import { api } from '@/shared/api/client'
import type { PropertyDetail } from '@/shared/api/types'
import { cn } from '@/shared/ui/cn'
import { useApiMutation } from '@/shared/lib/useApiMutation'
import { Button } from '@/shared/ui/Button'
import { Card, CardHeader } from '@/shared/ui/Card'
import { ErrorState } from '@/shared/ui/EmptyState'
import { Checkbox, Field, FormError, FormGrid, Input, Select, Textarea } from '@/shared/ui/Form'
import { PageHeader } from '@/shared/ui/PageHeader'
import { FullPageSpinner } from '@/shared/ui/Spinner'
import { PROPERTY_TYPES, PROPERTY_USAGES, rentError, suggestCode, TagInput, TOILET_OPTIONS, unitTypesFor } from './shared'

const CODE_RE = /^[A-Z][A-Z0-9-]{1,31}$/
const codeField = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .refine((v) => CODE_RE.test(v), 'Use a letter followed by letters, digits or "-" (e.g. B01, H101)')

const schema = z
  .object({
    code: z.string(),
    name: z.string().trim().min(2, 'Enter the property name').max(160),
    property_type: z.enum(['building', 'house']),
    usage: z.enum(['residential', 'commercial', 'mixed']),
    description: z.string().max(10000),
    city: z.string().max(80),
    district: z.string().max(80),
    sector: z.string().max(80),
    cell: z.string().max(80),
    village: z.string().max(80),
    address: z.string().max(255),
    standalone: z.boolean(),
    unit_code: z.string(),
    unit_type: z.enum(['house', 'apartment', 'room', 'studio', 'commercial']),
    bedrooms: z.string(),
    bathrooms: z.string(),
    toilet: z.enum(['private', 'shared']),
    monthly_rent: z.string(),
    currency: z.enum(['RWF', 'USD']),
  })
  .superRefine((v, ctx) => {
    if (!v.standalone) return
    if (!CODE_RE.test(v.unit_code.trim().toUpperCase()))
      ctx.addIssue({ code: 'custom', path: ['unit_code'], message: 'Enter a valid unit code' })
    const err = rentError(v.monthly_rent, v.currency)
    if (err) ctx.addIssue({ code: 'custom', path: ['monthly_rent'], message: err })
    if (v.unit_type === 'commercial') return // shop rooms: no bedrooms or bathrooms
    for (const k of ['bedrooms', 'bathrooms'] as const) {
      if (!/^\d+$/.test(v[k].trim())) ctx.addIssue({ code: 'custom', path: [k], message: 'Whole number' })
    }
  })

type Values = z.infer<typeof schema>

export default function PropertyFormPage() {
  const { id } = useParams()
  const editing = !!id
  const navigate = useNavigate()
  const [amenities, setAmenities] = useState<string[]>([])
  const [codeError, setCodeError] = useState<string | null>(null)

  const existing = useQuery({
    queryKey: ['properties', 'detail', Number(id)],
    queryFn: () => api.get<PropertyDetail>(`/properties/${id}`),
    enabled: editing,
  })

  const { register, handleSubmit, reset, watch, setValue, getValues, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: '', name: '', property_type: 'building', usage: 'residential', description: '', city: 'Kigali', district: '', sector: '', cell: '', village: '',
      address: '', standalone: false, unit_code: '', unit_type: 'house', bedrooms: '3', bathrooms: '2', toilet: 'private',
      monthly_rent: '', currency: 'RWF',
    },
  })

  useEffect(() => {
    const p = existing.data
    if (!p) return
    reset({
      ...getValues(),
      code: p.code, name: p.name, property_type: (p.property_type === 'house' ? 'house' : 'building') as Values['property_type'],
      usage: (p.usage ?? 'residential') as Values['usage'],
      description: p.description, city: p.city, district: p.district, sector: p.sector, cell: p.cell ?? '', village: p.village ?? '', address: p.address,
    })
    setAmenities(p.amenities ?? [])
  }, [existing.data, reset, getValues])

  // New properties start at the landlord's usual location (Settings → Agreement documents).
  const defaults = useQuery({
    queryKey: ['properties', 'location-defaults'],
    queryFn: () => api.get<{ city: string; district: string; sector: string; cell: string; village: string }>('/properties/location-defaults'),
    enabled: !editing,
    staleTime: 300_000,
  })
  useEffect(() => {
    const d = defaults.data
    if (!d) return
    for (const k of ['city', 'district', 'sector', 'cell', 'village'] as const) {
      if (!getValues(k) && d[k]) setValue(k, d[k])
    }
  }, [defaults.data, getValues, setValue])

  const save = useApiMutation(
    (v: Values) => {
      const base = {
        name: v.name.trim(), property_type: v.property_type, usage: v.usage, description: v.description, city: v.city.trim(),
        district: v.district.trim(), sector: v.sector.trim(), cell: v.cell.trim(), village: v.village.trim(), address: v.address.trim(), amenities,
      }
      if (editing) return api.patch<PropertyDetail>(`/properties/${id}`, base)
      return api.post<PropertyDetail>('/properties', {
        ...base,
        code: v.code.trim().toUpperCase(),
        standalone_unit: v.standalone
          ? {
              code: v.unit_code.trim().toUpperCase(), name: v.name.trim(), unit_type: v.unit_type,
              bedrooms: v.unit_type === 'commercial' ? 0 : Number(v.bedrooms),
              bathrooms: v.unit_type === 'commercial' ? 0 : Number(v.bathrooms), toilet: v.toilet, monthly_rent: v.monthly_rent.trim(),
              currency: v.currency, description: v.description, amenities,
            }
          : null,
      })
    },
    {
      success: editing ? 'Property updated' : 'Property created',
      invalidate: [['properties'], ['units'], ['availability']],
      onSuccess: (p) => navigate(`/admin/properties/${p.id}`, { replace: true }),
    },
  )

  const onSubmit = handleSubmit((v) => {
    if (!editing) {
      const r = codeField.safeParse(v.code)
      if (!r.success) {
        setCodeError(r.error.issues[0]?.message ?? 'Invalid code')
        return
      }
    }
    setCodeError(null)
    save.mutate(v)
  })

  const standalone = watch('standalone')
  const currency = watch('currency')
  const propertyType = watch('property_type')
  const usage = watch('usage')
  const unitType = watch('unit_type')
  const code = watch('code')
  const allowedTypes = unitTypesFor(usage)

  // Keep the standalone unit's type valid for the property's use.
  useEffect(() => {
    const allowed = unitTypesFor(usage)
    if (!allowed.some((t) => t.value === getValues('unit_type'))) {
      setValue('unit_type', allowed[0]!.value)
      if (allowed[0]!.value === 'commercial') setValue('toilet', 'shared')
    }
  }, [usage, getValues, setValue])

  // Keep the standalone unit code in step with the property code until edited.
  const [unitCodeTouched, setUnitCodeTouched] = useState(false)
  useEffect(() => {
    if (!unitCodeTouched) setValue('unit_code', (code || '').toUpperCase())
  }, [code, unitCodeTouched, setValue])

  async function suggest() {
    const prefix = { building: 'B', house: 'H' }[getValues('property_type')]
    try {
      setValue('code', await suggestCode('property', prefix))
      setCodeError(null)
    } catch {
      setCodeError('Could not suggest a code')
    }
  }

  if (editing && existing.isLoading) return <FullPageSpinner />
  if (editing && existing.error) return <ErrorState error={existing.error} onRetry={existing.refetch} />
  if (editing && existing.data?.is_archived) return <ErrorState error={new Error('Archived properties cannot be edited.')} />

  const e = formState.errors
  return (
    <>
      <PageHeader
        title={editing ? `Edit ${existing.data?.name ?? 'property'}` : 'Add property'}
        back={editing ? { to: `/admin/properties/${id}`, label: 'Back to property' } : { to: '/admin/properties', label: 'Properties' }}
      />
      <form onSubmit={onSubmit} noValidate className="mx-auto max-w-3xl space-y-5">
        <FormError message={save.errorText} />
        <Card>
          <CardHeader title="Property details" />
          <FormGrid>
            <fieldset className="sm:col-span-2">
              <legend className="mb-1.5 text-sm font-medium text-slate-700">Is it a house or a building? <span className="text-red-600">*</span></legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {PROPERTY_TYPES.map((t) => (
                  <ChoiceCard key={t.value} icon={t.value === 'house' ? Home : Building2} label={t.label} hint={t.hint}
                    checked={propertyType === t.value} input={<input type="radio" value={t.value} {...register('property_type')} className="sr-only" />} />
                ))}
              </div>
            </fieldset>
            <fieldset className="sm:col-span-2">
              <legend className="mb-1.5 text-sm font-medium text-slate-700">What is it let for? <span className="text-red-600">*</span></legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {PROPERTY_USAGES.map((t) => (
                  <ChoiceCard key={t.value} icon={t.value === 'commercial' ? Store : t.value === 'mixed' ? Users : Home} label={t.label} hint={t.hint}
                    checked={usage === t.value} input={<input type="radio" value={t.value} {...register('usage')} className="sr-only" />} />
                ))}
              </div>
            </fieldset>
            <Field
              label="Property code"
              required
              error={codeError ?? undefined}
              hint={editing ? 'Codes are permanent and cannot be changed.' : 'Permanent; never reused after archival.'}
            >
              <div className="flex gap-2">
                <Input {...register('code')} disabled={editing} className="uppercase" placeholder="B01" autoCapitalize="characters" />
                {!editing ? (
                  <Button variant="outline" icon={Wand2} onClick={suggest} aria-label="Suggest code">
                    <span className="hidden sm:inline">Suggest</span>
                  </Button>
                ) : null}
              </div>
            </Field>
            <Field label="Name" required error={e.name?.message} className="sm:col-span-2">
              <Input {...register('name')} placeholder={usage === 'commercial' ? 'Bisambu Commercial House' : 'Kimihurura Residences'} />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Textarea {...register('description')} rows={4} placeholder="What makes this property a good home…" />
            </Field>
          </FormGrid>
        </Card>

        <Card>
          <CardHeader title="Location" />
          <FormGrid>
            <Field label="City">
              <Input {...register('city')} />
            </Field>
            <Field label="District">
              <Input {...register('district')} placeholder="Gasabo" />
            </Field>
            <Field label="Sector (Umurenge)">
              <Input {...register('sector')} placeholder="Kimihurura" />
            </Field>
            <Field label="Cell (Akagari)" hint="Used on agreement documents.">
              <Input {...register('cell')} placeholder="Nyarurama" />
            </Field>
            <Field label="Village (Umudugudu)" hint="Used on agreement documents.">
              <Input {...register('village')} placeholder="Bisambu" />
            </Field>
            <Field label="Street address" hint="Not shown on the public website.">
              <Input {...register('address')} placeholder="KG 11 Ave" />
            </Field>
          </FormGrid>
        </Card>

        <Card>
          <CardHeader title="Amenities" description="Shared features shown on every unit's listing." />
          <TagInput value={amenities} onChange={setAmenities} placeholder="e.g. Parking, Security guard — press Enter" />
        </Card>

        {!editing ? (
          <Card>
            <Checkbox
              label={usage === 'commercial' ? 'Rent this property as one shop room' : 'Rent this property as one unit (standalone house)'}
              hint={
                propertyType === 'building'
                  ? 'Usually left off for buildings — add their units after creating the property.'
                  : 'Creates the rentable unit now. You can still add rooms later.'
              }
              {...register('standalone')}
            />
            {standalone ? (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <FormGrid>
                  <Field label="Unit code" required error={e.unit_code?.message} hint="Defaults to the property code.">
                    <Input
                      {...register('unit_code', { onChange: () => setUnitCodeTouched(true) })}
                      className="uppercase"
                      autoCapitalize="characters"
                    />
                  </Field>
                  <Field label="Unit type">
                    <Select {...register('unit_type')}>
                      {allowedTypes.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  {unitType !== 'commercial' ? (
                    <>
                      <Field label="Bedrooms" error={e.bedrooms?.message}>
                        <Input inputMode="numeric" {...register('bedrooms')} />
                      </Field>
                      <Field label="Bathrooms" error={e.bathrooms?.message}>
                        <Input inputMode="numeric" {...register('bathrooms')} />
                      </Field>
                    </>
                  ) : null}
                  <Field label="Toilet" hint={unitType === 'commercial' ? 'Shop rooms have no bathroom.' : undefined}>
                    <Select {...register('toilet')}>
                      {TOILET_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Monthly rent" required error={e.monthly_rent?.message}>
                    <Input inputMode="decimal" {...register('monthly_rent')} placeholder={currency === 'USD' ? '1200.00' : '450000'} />
                  </Field>
                  <Field label="Currency">
                    <Select {...register('currency')}>
                      <option value="RWF">RWF — Rwandan franc</option>
                      <option value="USD">USD — US dollar</option>
                    </Select>
                  </Field>
                </FormGrid>
                <p className="mt-3 text-sm text-slate-500">
                  The unit starts off-market and unpublished. Set it to available and publish it from its page when it is ready.
                </p>
              </div>
            ) : null}
          </Card>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => navigate(-1)} block className="sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending} block className="sm:w-auto">
            {editing ? 'Save changes' : 'Create property'}
          </Button>
        </div>
      </form>
    </>
  )
}

function ChoiceCard({ icon: Icon, label, hint, checked, input }: { icon: LucideIcon; label: string; hint: string; checked: boolean; input: React.ReactNode }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-500',
        checked ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500' : 'border-slate-200 hover:border-slate-300',
      )}
    >
      {input}
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', checked ? 'bg-brand-900 text-white' : 'bg-slate-100 text-slate-600')}>
        <Icon className="size-4.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">{label}</span>
        <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>
      </span>
    </label>
  )
}
