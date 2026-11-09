import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import type { AgreementDetail, TenantOut, UnitOut } from '@/shared/api/types'
import { todayISO } from '@/shared/lib/format'
import { useApiMutation } from '@/shared/lib/useApiMutation'
import { Button } from '@/shared/ui/Button'
import { Card, CardHeader } from '@/shared/ui/Card'
import { Field, FormError, FormGrid, Input, Select, Textarea } from '@/shared/ui/Form'
import { PageHeader } from '@/shared/ui/PageHeader'
import { lettable, moneyError, moneyInput, TenantPicker, UnitPicker } from './shared'

type Errors = Partial<Record<'tenant' | 'unit' | 'start' | 'end' | 'rent' | 'deposit' | 'due', string>>

export default function AgreementFormPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [tenant, setTenant] = useState<TenantOut | null>(null)
  const [unit, setUnit] = useState<UnitOut | null>(null)
  const [start, setStart] = useState(todayISO())
  const [end, setEnd] = useState('')
  const [rent, setRent] = useState('')
  const [currency, setCurrency] = useState<'RWF' | 'USD'>('RWF')
  const [dueDay, setDueDay] = useState('5')
  const [deposit, setDeposit] = useState('0')
  const [conditions, setConditions] = useState('')
  const [errors, setErrors] = useState<Errors>({})

  const tenantId = params.get('tenant')
  const unitId = params.get('unit')
  const pre = useQuery({
    queryKey: ['agreement-prefill', tenantId, unitId],
    queryFn: async () => ({
      tenant: tenantId ? await api.get<TenantOut>(`/tenants/${tenantId}`) : null,
      unit: unitId ? await api.get<UnitOut>(`/units/${unitId}`) : null,
    }),
    enabled: !!(tenantId || unitId),
    staleTime: Infinity,
  })
  useEffect(() => {
    if (pre.data?.tenant) setTenant(pre.data.tenant)
    if (pre.data?.unit) pickUnit(pre.data.unit)
  }, [pre.data])

  function pickUnit(u: UnitOut | null) {
    setUnit(u)
    if (u) {
      setCurrency(u.currency as 'RWF' | 'USD')
      setRent(moneyInput(u.monthly_rent, u.currency))
    }
  }

  const create = useApiMutation(
    (activate: boolean) =>
      api.post<AgreementDetail>('/agreements', {
        tenant_id: tenant!.id,
        unit_id: unit!.id,
        start_date: start,
        end_date: end || null,
        monthly_rent: rent.trim(),
        currency,
        due_day: Number(dueDay),
        deposit_required: deposit.trim() || '0',
        special_conditions: conditions.trim(),
        activate,
      }),
    {
      success: (a) => (a.status === 'active' ? `Agreement ${a.agreement_number} is active` : `Draft ${a.agreement_number} saved`),
      invalidate: [['agreements'], ['units'], ['tenants'], ['tenant']],
      onSuccess: (a) => navigate(`/admin/agreements/${a.id}`, { replace: true }),
    },
  )

  function submit(activate: boolean) {
    const e: Errors = {}
    if (!tenant) e.tenant = 'Choose a tenant'
    if (!unit) e.unit = 'Choose a rental unit'
    if (!start) e.start = 'Choose a start date'
    if (end && start && end < start) e.end = 'The end date must be on or after the start date'
    const r = moneyError(rent, currency)
    if (r) e.rent = r
    const d = moneyError(deposit || '0', currency, { allowZero: true })
    if (d) e.deposit = d
    const dd = Number(dueDay)
    if (!Number.isInteger(dd) || dd < 1 || dd > 28) e.due = 'Choose a day between 1 and 28'
    setErrors(e)
    if (Object.keys(e).length === 0) create.mutate(activate)
  }

  const unitOk = unit ? lettable(unit).ok : true

  return (
    <>
      <PageHeader
        back={{ to: '/admin/agreements', label: 'Rental agreements' }}
        title="New rental agreement"
        description="Save as a draft to prepare it, or create and activate it now — activation marks the unit occupied and removes it from the website."
      />
      <div className="mx-auto max-w-3xl space-y-5">
        <Card>
          <CardHeader title="Who and where" />
          <div className="space-y-4">
            <div>
              <TenantPicker value={tenant} onChange={setTenant} />
              {errors.tenant ? <p className="mt-1.5 text-sm text-red-600">{errors.tenant}</p> : null}
            </div>
            <div>
              <UnitPicker value={unit} onChange={pickUnit} />
              {errors.unit ? <p className="mt-1.5 text-sm text-red-600">{errors.unit}</p> : null}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Terms" />
          <FormGrid>
            <Field label="Start date" required error={errors.start}>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} aria-invalid={!!errors.start} />
            </Field>
            <Field label="End date" hint="Leave empty for an open-ended tenancy." error={errors.end}>
              <Input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} aria-invalid={!!errors.end} />
            </Field>
            <Field label="Monthly rent" required error={errors.rent} hint={currency === 'RWF' ? 'Whole francs' : 'Up to 2 decimals'}>
              <div className="flex gap-2">
                <Input
                  inputMode="decimal"
                  value={rent}
                  onChange={(e) => setRent(e.target.value)}
                  aria-invalid={!!errors.rent}
                  className="flex-1"
                />
                <div className="w-24 shrink-0">
                  <Select id="agreement-currency" value={currency} onChange={(e) => setCurrency(e.target.value as 'RWF' | 'USD')} aria-label="Currency">
                    <option value="RWF">RWF</option>
                    <option value="USD">USD</option>
                  </Select>
                </div>
              </div>
            </Field>
            <Field label="Rent due on day" required error={errors.due} hint="Day of each month (1–28).">
              <Select value={dueDay} onChange={(e) => setDueDay(e.target.value)}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={`Security deposit required (${currency})`} error={errors.deposit} hint="Record the amount actually received on the agreement page.">
              <Input inputMode="decimal" value={deposit} onChange={(e) => setDeposit(e.target.value)} aria-invalid={!!errors.deposit} />
            </Field>
          </FormGrid>
          <Field label="Special conditions" className="mt-4">
            <Textarea value={conditions} onChange={(e) => setConditions(e.target.value)} rows={4} placeholder="Utilities, pets, notice period…" />
          </Field>
        </Card>

        <FormError message={create.errorText} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => submit(false)} loading={create.isPending && create.variables === false} disabled={create.isPending}>
            Save as draft
          </Button>
          <Button
            onClick={() => submit(true)}
            loading={create.isPending && create.variables === true}
            disabled={create.isPending || !unitOk}
            title={!unitOk ? 'The selected unit cannot be let right now' : undefined}
          >
            Create and activate
          </Button>
        </div>
      </div>
    </>
  )
}
