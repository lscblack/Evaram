import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Building2, Save, User, X } from 'lucide-react'
import { ErrorNote, FIELD, Field } from '@/components/admin/ui'
import { api } from '@/lib/api'
import { useQuery } from '@/lib/queries'
import { EASE, SPRING_SOFT } from '@/lib/motion'
import { cn, formatCompactCurrency, formatDate } from '@/lib/utils'
import type { ApiClient, ApiClientDetail, ClientKind } from '@/types/api'

const EMPTY = {
  kind: 'individual' as ClientKind,
  full_name: '',
  national_id: '',
  company_name: '',
  tin: '',
  registration_number: '',
  contact_person: '',
  email: '',
  phone: '',
  whatsapp: '',
  address: '',
  district: '',
  country: '',
  notes: '',
  is_active: true,
}

/**
 * Add or edit a client, and — once saved — see everything we have done with
 * them.
 *
 * The history panel is the reason this exists: before picking up the phone an
 * agent wants to know how many parcels we have moved for this person and what
 * we made on them, without assembling it from three other screens.
 */
export function ClientDrawer({
  client,
  open,
  onClose,
  onSaved,
}: {
  client: ApiClient | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [draft, setDraft] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})

  // Only fetched for an existing client; a new one has no history yet.
  const { data: detail } = useQuery<ApiClientDetail>(
    client && open ? `/admin/clients/${client.id}` : null,
    { ttl: 0 },
  )

  useEffect(() => {
    if (!open) return
    setError(null)
    setFields({})
    setDraft(
      client
        ? {
            kind: client.kind,
            full_name: client.full_name ?? '',
            national_id: client.national_id ?? '',
            company_name: client.company_name ?? '',
            tin: client.tin ?? '',
            registration_number: client.registration_number ?? '',
            contact_person: client.contact_person ?? '',
            email: client.email ?? '',
            phone: client.phone ?? '',
            whatsapp: client.whatsapp ?? '',
            address: client.address ?? '',
            district: client.district ?? '',
            country: client.country ?? '',
            notes: client.notes ?? '',
            is_active: client.is_active,
          }
        : EMPTY,
    )
  }, [client, open])

  const set = (key: keyof typeof draft) => (value: string | boolean) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const isCompany = draft.kind === 'company'

  const save = async () => {
    setBusy(true)
    setError(null)
    setFields({})
    try {
      // Empty strings would fail email validation and store blanks; send null.
      const body = {
        ...draft,
        full_name: draft.full_name || null,
        national_id: draft.national_id || null,
        company_name: draft.company_name || null,
        tin: draft.tin || null,
        registration_number: draft.registration_number || null,
        contact_person: draft.contact_person || null,
        email: draft.email || null,
        phone: draft.phone || null,
        whatsapp: draft.whatsapp || null,
        address: draft.address || null,
        district: draft.district || null,
        country: draft.country || null,
        notes: draft.notes || null,
      }
      if (client) await api.patch(`/admin/clients/${client.id}`, body)
      else await api.post('/admin/clients', body)
      onSaved()
      onClose()
    } catch (err) {
      const failure = err as { message?: string; fields?: Record<string, string> }
      setError(failure.message ?? 'That client was not saved.')
      if (failure.fields) setFields(failure.fields)
    } finally {
      setBusy(false)
    }
  }

  const summary = detail?.summary

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px]"
          />
          <motion.aside
            role="dialog"
            aria-label={client ? `Edit ${client.display_name}` : 'New client'}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={SPRING_SOFT}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-line bg-canvas shadow-lift"
          >
            <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold text-ink">
                  {client ? client.display_name : 'New client'}
                </h2>
                <p className="mt-1 text-[0.8125rem] text-ink-muted">
                  {client ? `Added ${formatDate(client.created_at)}` : 'A person or a company'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-ink-soft hover:border-line-strong hover:text-ink"
              >
                <X className="size-4" strokeWidth={2.4} />
              </button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
              {/* history first: it is why the drawer gets opened */}
              {summary && (
                <div className="rounded-2xl border border-line bg-surface p-4">
                  <p className="text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">
                    What we have done together
                  </p>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-[0.875rem] sm:grid-cols-3">
                    <Stat label="Listings" value={`${summary.listings_total}`} note={`${summary.listings_live} live`} />
                    <Stat
                      label="Sold for them"
                      value={`${summary.sold_count}`}
                      note={summary.sold_value ? formatCompactCurrency(summary.sold_value) : undefined}
                    />
                    <Stat
                      label="Bought by them"
                      value={`${summary.bought_count}`}
                      note={summary.bought_value ? formatCompactCurrency(summary.bought_value) : undefined}
                    />
                    <Stat label="Commission" value={formatCompactCurrency(summary.commission_total)} />
                    <Stat label="Received" value={formatCompactCurrency(summary.commission_received)} />
                    <Stat
                      label="Pending"
                      value={formatCompactCurrency(summary.commission_pending)}
                      tone={summary.commission_pending > 0 ? 'warn' : undefined}
                    />
                  </dl>
                  {summary.first_deal_on && (
                    <p className="mt-3 border-t border-line pt-3 text-[0.75rem] text-ink-faint">
                      First deal {summary.first_deal_on} · latest {summary.last_deal_on}
                      {summary.invested_total > 0 &&
                        ` · we have put in ${formatCompactCurrency(summary.invested_total)}`}
                    </p>
                  )}
                </div>
              )}

              {/* individual or company decides which fields matter */}
              <div className="flex gap-2">
                {(['individual', 'company'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => set('kind')(k)}
                    className={cn(
                      'inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[0.875rem] font-semibold capitalize transition-colors',
                      draft.kind === k
                        ? 'border-ink bg-ink text-canvas'
                        : 'border-line text-ink-soft hover:border-line-strong hover:text-ink',
                    )}
                  >
                    {k === 'company' ? <Building2 className="size-4" /> : <User className="size-4" />}
                    {k}
                  </button>
                ))}
              </div>

              {isCompany ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field label="Company name" hint={fields.company_name}>
                      <input className={FIELD} value={draft.company_name} onChange={(e) => set('company_name')(e.target.value)} />
                    </Field>
                  </div>
                  <Field label="TIN">
                    <input className={FIELD} value={draft.tin} onChange={(e) => set('tin')(e.target.value)} />
                  </Field>
                  <Field label="Registration number">
                    <input className={FIELD} value={draft.registration_number} onChange={(e) => set('registration_number')(e.target.value)} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Contact person" hint="Who signs on the company's behalf.">
                      <input className={FIELD} value={draft.contact_person} onChange={(e) => set('contact_person')(e.target.value)} />
                    </Field>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" hint={fields.full_name}>
                    <input className={FIELD} value={draft.full_name} onChange={(e) => set('full_name')(e.target.value)} />
                  </Field>
                  <Field label="National ID">
                    <input className={FIELD} value={draft.national_id} onChange={(e) => set('national_id')(e.target.value)} />
                  </Field>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone">
                  <input className={FIELD} value={draft.phone} onChange={(e) => set('phone')(e.target.value)} />
                </Field>
                <Field label="WhatsApp">
                  <input className={FIELD} value={draft.whatsapp} onChange={(e) => set('whatsapp')(e.target.value)} />
                </Field>
                <Field label="Email" hint={fields.email}>
                  <input className={FIELD} value={draft.email} onChange={(e) => set('email')(e.target.value)} />
                </Field>
                <Field label="District">
                  <input className={FIELD} value={draft.district} onChange={(e) => set('district')(e.target.value)} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Address">
                    <input className={FIELD} value={draft.address} onChange={(e) => set('address')(e.target.value)} />
                  </Field>
                </div>
              </div>

              <Field label="Notes">
                <textarea
                  rows={3}
                  className={cn(FIELD, 'h-auto py-2.5')}
                  value={draft.notes}
                  onChange={(e) => set('notes')(e.target.value)}
                />
              </Field>

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={draft.is_active}
                  onChange={(e) => set('is_active')(e.target.checked)}
                  className="size-4 accent-gold-500"
                />
                <span className="text-[0.875rem] text-ink-soft">
                  Active — inactive clients stay in the history but leave the dropdowns
                </span>
              </label>

              {error && <ErrorNote message={error} />}
            </div>

            <footer className="border-t border-line px-6 py-4">
              <button
                type="button"
                onClick={() => void save()}
                disabled={busy}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink text-[0.875rem] font-semibold text-canvas disabled:opacity-50"
              >
                <Save className="size-4" strokeWidth={2.4} />
                {busy ? 'Saving…' : client ? 'Save client' : 'Create client'}
              </button>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function Stat({
  label,
  value,
  note,
  tone,
}: {
  label: string
  value: string
  note?: string
  tone?: 'warn'
}) {
  return (
    <div>
      <dt className="text-[0.6875rem] font-bold tracking-wide text-ink-faint uppercase">{label}</dt>
      <dd className={cn('mt-0.5 font-semibold', tone === 'warn' ? 'text-gold-600' : 'text-ink')}>
        {value}
      </dd>
      {note && <dd className="text-[0.75rem] text-ink-muted">{note}</dd>}
    </div>
  )
}
