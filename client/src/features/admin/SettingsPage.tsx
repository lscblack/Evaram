import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Database, Globe, Plus, Save, Trash2 } from 'lucide-react'
import { api } from '@/shared/api/client'
import type { PaymentMethodOut, SettingOut } from '@/shared/api/types'
import { useApiMutation } from '@/shared/lib/useApiMutation'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardHeader } from '@/shared/ui/Card'
import { Dialog } from '@/shared/ui/Dialog'
import { ErrorState } from '@/shared/ui/EmptyState'
import { Checkbox, Field, FormError, FormGrid, Input, Textarea } from '@/shared/ui/Form'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SkeletonRows } from '@/shared/ui/Spinner'

const GROUPS: { key: string; title: string; description: string }[] = [
  { key: 'company', title: 'Company', description: 'Shown on the public website.' },
  { key: 'contact', title: 'Contact details', description: 'How prospective tenants reach you. Shown publicly.' },
  { key: 'social', title: 'Social media', description: 'Links shown in the website footer.' },
  { key: 'billing', title: 'Billing', description: 'Invoicing behaviour and alerts. Internal only.' },
  { key: 'landlord', title: 'Agreement documents', description: 'Landlord and bank details filled into new agreement documents. Internal only.' },
]

type Value = string | number | boolean

export default function SettingsPage() {
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api.get<SettingOut[]>('/settings') })
  const [draft, setDraft] = useState<Record<string, Value>>({})

  useEffect(() => {
    if (settings.data) setDraft(Object.fromEntries(settings.data.map((s) => [s.key, s.value as Value])))
  }, [settings.data])

  const changed = useMemo(() => {
    if (!settings.data) return {}
    return Object.fromEntries(
      settings.data.filter((s) => draft[s.key] !== undefined && String(draft[s.key]) !== String(s.value)).map((s) => [s.key, draft[s.key]]),
    )
  }, [draft, settings.data])
  const count = Object.keys(changed).length

  const save = useApiMutation(() => api.patch<SettingOut[]>('/settings', { values: changed }), {
    success: 'Settings saved',
    invalidate: [['settings'], ['public', 'settings']],
  })

  const grouped = useMemo(() => {
    const out: Record<string, SettingOut[]> = {}
    settings.data?.forEach((s) => (out[s.group] ??= []).push(s))
    return out
  }, [settings.data])
  const known = new Set(GROUPS.map((g) => g.key))
  const groups = [...GROUPS, ...Object.keys(grouped).filter((g) => !known.has(g)).map((g) => ({ key: g, title: g, description: '' }))]

  return (
    <>
      <PageHeader
        title="System settings"
        description="Company information, contact details and billing behaviour."
        actions={
          <Button icon={Save} disabled={!count} loading={save.isPending} onClick={() => save.mutate(undefined)}>
            Save{count ? ` (${count})` : ''}
          </Button>
        }
      />
      {settings.error ? (
        <Card><ErrorState error={settings.error} onRetry={settings.refetch} /></Card>
      ) : !settings.data ? (
        <Card padded={false}><SkeletonRows /></Card>
      ) : (
        <div className="space-y-4">
          <FormError message={save.errorText} />
          {groups.map((g) =>
            grouped[g.key]?.length ? (
              <Card key={g.key}>
                <CardHeader
                  title={g.title}
                  description={g.description}
                  action={grouped[g.key].some((s) => s.is_public) ? <Badge tone="info"><Globe className="size-3" /> Public</Badge> : undefined}
                />
                <FormGrid>
                  {grouped[g.key].map((s) => (
                    <SettingInput key={s.key} setting={s} value={draft[s.key]} onChange={(v) => setDraft((d) => ({ ...d, [s.key]: v }))} />
                  ))}
                </FormGrid>
              </Card>
            ) : null,
          )}
          <PaymentMethods />
          <DemoData />
        </div>
      )}
    </>
  )
}

function SettingInput({ setting, value, onChange }: { setting: SettingOut; value: Value | undefined; onChange: (v: Value) => void }) {
  const original = setting.value
  if (typeof original === 'boolean') {
    return (
      <div className="sm:col-span-2">
        <Checkbox label={setting.label} checked={!!value} onChange={(e) => onChange(e.target.checked)} />
      </div>
    )
  }
  if (typeof original === 'number') {
    return (
      <Field label={setting.label} hint={setting.key === 'billing.default_due_day' ? 'Between 1 and 28.' : undefined}>
        <Input
          type="number"
          inputMode="numeric"
          value={value === undefined ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      </Field>
    )
  }
  const long = setting.key === 'company.about' || String(original ?? '').length > 90
  return (
    <Field label={setting.label} className={long ? 'sm:col-span-2' : undefined}>
      {long ? (
        <Textarea value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} rows={4} />
      ) : (
        <Input
          type={setting.key.startsWith('social.') ? 'url' : setting.key === 'contact.email' ? 'email' : 'text'}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  )
}

function PaymentMethods() {
  const methods = useQuery({
    queryKey: ['payment-methods', 'all'],
    queryFn: () => api.get<PaymentMethodOut[]>('/payment-methods', { include_inactive: true }),
  })
  const [editing, setEditing] = useState<PaymentMethodOut | 'new' | null>(null)
  return (
    <Card padded={false}>
      <div className="p-4 pb-0 sm:p-5 sm:pb-0">
        <CardHeader
          title="Payment methods"
          description="Methods staff can choose when recording a payment. Deactivate instead of deleting — past payments keep their method."
          action={<Button size="sm" variant="outline" icon={Plus} onClick={() => setEditing('new')}>Add method</Button>}
        />
      </div>
      {methods.error ? (
        <ErrorState error={methods.error} onRetry={methods.refetch} />
      ) : !methods.data ? (
        <SkeletonRows rows={3} />
      ) : (
        <ul className="divide-y divide-slate-100 border-t border-slate-100">
          {methods.data.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => setEditing(m)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 sm:px-5">
                <span className="min-w-0">
                  <span className="block font-medium text-slate-900">{m.label}</span>
                  <span className="block font-mono text-xs text-slate-400">{m.code} · order {m.sort_order}</span>
                </span>
                {m.is_active ? <Badge tone="success" dot>Active</Badge> : <Badge dot>Inactive</Badge>}
              </button>
            </li>
          ))}
        </ul>
      )}
      <MethodDialog method={editing} onClose={() => setEditing(null)} />
    </Card>
  )
}

function MethodDialog({ method, onClose }: { method: PaymentMethodOut | 'new' | null; onClose: () => void }) {
  const isNew = method === 'new'
  const [v, setV] = useState({ code: '', label: '', sort_order: '10', is_active: true })
  useEffect(() => {
    if (method === 'new') setV({ code: '', label: '', sort_order: '10', is_active: true })
    else if (method) setV({ code: method.code, label: method.label, sort_order: String(method.sort_order), is_active: method.is_active })
  }, [method])
  const save = useApiMutation(
    () =>
      isNew
        ? api.post('/payment-methods', { code: v.code, label: v.label, sort_order: Number(v.sort_order), is_active: v.is_active })
        : api.patch(`/payment-methods/${(method as PaymentMethodOut).id}`, { label: v.label, sort_order: Number(v.sort_order), is_active: v.is_active }),
    { success: 'Payment method saved', invalidate: [['payment-methods']], onSuccess: onClose },
  )
  if (!method) return null
  const codeOk = /^[a-z][a-z0-9_]{1,31}$/.test(v.code)
  return (
    <Dialog
      open
      onClose={onClose}
      title={isNew ? 'Add payment method' : `Edit ${(method as PaymentMethodOut).label}`}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} block className="sm:w-auto">Cancel</Button>
          <Button
            disabled={v.label.trim().length < 2 || (isNew && !codeOk)}
            loading={save.isPending}
            onClick={() => save.mutate(undefined)}
            block
            className="sm:w-auto"
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Label" required>
          <Input value={v.label} onChange={(e) => setV({ ...v, label: e.target.value })} placeholder="e.g. Equity Bank" />
        </Field>
        <Field
          label="Code"
          required={isNew}
          hint={isNew ? 'Lowercase letters, digits and underscores; cannot be changed later.' : 'Codes are permanent.'}
          error={isNew && v.code && !codeOk ? 'Use lowercase letters, digits and _ (start with a letter)' : undefined}
        >
          <Input value={v.code} disabled={!isNew} onChange={(e) => setV({ ...v, code: e.target.value.toLowerCase() })} placeholder="equity_bank" />
        </Field>
        <Field label="Display order">
          <Input type="number" inputMode="numeric" value={v.sort_order} onChange={(e) => setV({ ...v, sort_order: e.target.value })} />
        </Field>
        <Checkbox label="Active" hint="Inactive methods cannot be chosen for new payments." checked={v.is_active} onChange={(e) => setV({ ...v, is_active: e.target.checked })} />
        <FormError message={save.errorText} />
      </div>
    </Dialog>
  )
}

type DemoStatus = { loaded: boolean; properties: number; units: number; tenants: number }
type DemoCleared = { properties: number; units: number; agreements: number; invoices: number; payments: number; tenants: number }

/** Sample portfolio for trying the product; removable as a set without touching real records. */
function DemoData() {
  const status = useQuery({ queryKey: ['demo-data'], queryFn: () => api.get<DemoStatus>('/system/demo-data') })
  const [confirming, setConfirming] = useState(false)
  const load = useApiMutation(() => api.post<DemoStatus>('/system/demo-data'), {
    success: (r) => `Demo data loaded: ${r.properties} properties, ${r.units} units, ${r.tenants} tenants`,
    invalidate: [[]],
    toastError: true,
  })
  const clear = useApiMutation(() => api.del<DemoCleared>('/system/demo-data'), {
    success: (r) => `Demo data cleared: ${r.properties} properties, ${r.units} units, ${r.payments} payments removed`,
    invalidate: [[]],
    onSuccess: () => setConfirming(false),
  })
  const s = status.data
  return (
    <Card>
      <CardHeader
        title="Demo data"
        description="Load a sample portfolio — properties, photos, tenants, agreements, invoices and payments — to explore the platform. Clearing removes only the demo records."
        action={s?.loaded ? <Badge tone="warning" dot>Demo data loaded</Badge> : undefined}
      />
      {status.error ? (
        <ErrorState error={status.error} onRetry={status.refetch} />
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            {!s ? 'Checking…' : s.loaded
              ? `${s.properties} demo properties, ${s.units} units and ${s.tenants} tenants are in the system.`
              : 'No demo data is loaded.'}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" icon={Database} disabled={!s || s.loaded} loading={load.isPending} onClick={() => load.mutate(undefined)}>
              Load demo data
            </Button>
            <Button variant="danger" icon={Trash2} disabled={!s?.loaded} onClick={() => setConfirming(true)}>
              Clear all demo data
            </Button>
          </div>
        </div>
      )}
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Clear all demo data?"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirming(false)} block className="sm:w-auto">Cancel</Button>
            <Button variant="danger" icon={Trash2} loading={clear.isPending} onClick={() => clear.mutate(undefined)} block className="sm:w-auto">
              Clear demo data
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            This permanently removes the demo properties and their units and photos, plus every agreement, invoice and payment
            recorded on those units — including any you added while testing. Demo tenants are removed too.
          </p>
          <p>Your real properties, tenants and financial records are not affected. The audit log keeps a record of this action.</p>
          <FormError message={clear.errorText} />
        </div>
      </Dialog>
    </Card>
  )
}
