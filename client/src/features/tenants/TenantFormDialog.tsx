import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api, ApiError } from '@/shared/api/client'
import type { TenantDetail } from '@/shared/api/types'
import { useAuth } from '@/shared/auth/AuthProvider'
import { useApiMutation } from '@/shared/lib/useApiMutation'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'
import { Field, FormError, FormGrid, Input, Select, Textarea } from '@/shared/ui/Form'

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number, e.g. +250 788 123 456')

const schema = z.object({
  full_name: z.string().trim().min(2, 'Enter the full name').max(160),
  phone,
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email address')]),
  id_type: z.string(),
  id_number: z.string().trim().max(64),
  nationality: z.string().trim().max(80),
  occupation: z.string().trim().max(120),
  emergency_contact_name: z.string().trim().max(160),
  emergency_contact_phone: z.union([z.literal(''), phone]),
  emergency_contact_relationship: z.string().trim().max(64),
  notes: z.string().max(5000),
})
type Values = z.infer<typeof schema>

const ID_TYPES = [
  { value: 'national_id', label: 'National ID' },
  { value: 'passport', label: 'Passport' },
  { value: 'refugee_id', label: 'Refugee ID' },
  { value: 'other', label: 'Other' },
]

function defaults(t?: TenantDetail | null): Values {
  return {
    full_name: t?.full_name ?? '',
    phone: t?.phone ?? '',
    email: t?.email ?? '',
    id_type: t?.id_type ?? '',
    id_number: t && !t.id_number_masked ? t.id_number ?? '' : '',
    nationality: t?.nationality ?? '',
    occupation: t?.occupation ?? '',
    emergency_contact_name: t?.emergency_contact_name ?? '',
    emergency_contact_phone: t?.emergency_contact_phone ?? '',
    emergency_contact_relationship: t?.emergency_contact_relationship ?? '',
    notes: t?.notes ?? '',
  }
}

/** Register a new tenant (tenant = undefined) or edit an existing one. */
export function TenantFormDialog({
  open,
  onClose,
  tenant,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  tenant?: TenantDetail | null
  onSaved?: (t: TenantDetail) => void
}) {
  const { can } = useAuth()
  const sensitive = can('tenants.view_sensitive')
  const editing = !!tenant
  const [duplicateId, setDuplicateId] = useState<number | null>(null)
  const { register, handleSubmit, reset, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults(tenant),
  })
  useEffect(() => {
    if (open) {
      reset(defaults(tenant))
      setDuplicateId(null)
    }
  }, [open, tenant, reset])

  const save = useApiMutation(
    (v: Values) => {
      const body: Record<string, unknown> = {
        full_name: v.full_name,
        phone: v.phone,
        email: v.email || null,
        nationality: v.nationality,
        occupation: v.occupation,
        emergency_contact_name: v.emergency_contact_name,
        emergency_contact_phone: v.emergency_contact_phone,
        emergency_contact_relationship: v.emergency_contact_relationship,
        notes: v.notes,
      }
      if (sensitive) {
        body.id_type = v.id_type || null
        body.id_number = v.id_number || null
      }
      return editing
        ? api.patch<TenantDetail>(`/tenants/${tenant!.id}`, body)
        : api.post<TenantDetail>('/tenants', body)
    },
    {
      success: editing ? 'Tenant updated' : 'Tenant registered',
      invalidate: [['tenants'], ['tenant']],
      onSuccess: (t) => {
        onSaved?.(t)
        onClose()
      },
    },
  )

  const onSubmit = handleSubmit((v) =>
    save.mutate(v, {
      onError: (err) => {
        if (err instanceof ApiError && err.code === 'duplicate_tenant') {
          setDuplicateId(Number(err.details?.tenant_id) || null)
        }
      },
    }),
  )
  const e = formState.errors

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? `Edit ${tenant!.full_name}` : 'Register tenant'}
      description={editing ? undefined : 'Personal details are only visible to authorised staff.'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} block className="sm:w-auto">
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={save.isPending} block className="sm:w-auto">
            {editing ? 'Save changes' : 'Register tenant'}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        {save.errorText ? (
          <div className="space-y-2">
            <FormError message={save.errorText} />
            {duplicateId ? (
              <Link to={`/admin/tenants/${duplicateId}`} onClick={onClose} className="text-sm font-medium text-brand-700 hover:underline">
                Open the existing tenant record →
              </Link>
            ) : null}
          </div>
        ) : null}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Contact</h3>
          <FormGrid>
            <Field label="Full name" required error={e.full_name?.message} className="sm:col-span-2">
              <Input {...register('full_name')} autoComplete="off" aria-invalid={!!e.full_name} />
            </Field>
            <Field label="Phone" required error={e.phone?.message}>
              <Input {...register('phone')} type="tel" inputMode="tel" placeholder="+250 7…" aria-invalid={!!e.phone} />
            </Field>
            <Field label="Email" error={e.email?.message}>
              <Input {...register('email')} type="email" inputMode="email" aria-invalid={!!e.email} />
            </Field>
            <Field label="Nationality">
              <Input {...register('nationality')} />
            </Field>
            <Field label="Occupation">
              <Input {...register('occupation')} />
            </Field>
          </FormGrid>
        </section>
        {sensitive ? (
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Identification</h3>
            <FormGrid>
              <Field label="ID type">
                <Select {...register('id_type')}>
                  <option value="">Not recorded</option>
                  {ID_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="ID number" error={e.id_number?.message}>
                <Input {...register('id_number')} autoComplete="off" />
              </Field>
            </FormGrid>
          </section>
        ) : null}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Emergency contact</h3>
          <FormGrid cols={3}>
            <Field label="Name">
              <Input {...register('emergency_contact_name')} />
            </Field>
            <Field label="Phone" error={e.emergency_contact_phone?.message}>
              <Input {...register('emergency_contact_phone')} type="tel" inputMode="tel" aria-invalid={!!e.emergency_contact_phone} />
            </Field>
            <Field label="Relationship">
              <Input {...register('emergency_contact_relationship')} placeholder="e.g. Sister" />
            </Field>
          </FormGrid>
        </section>
        <Field label="Notes">
          <Textarea {...register('notes')} rows={3} />
        </Field>
      </form>
    </Dialog>
  )
}
