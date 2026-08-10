import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Mail, MessageCircle, Phone, X } from 'lucide-react'
import { Badge, ErrorNote, FIELD } from '@/components/admin/ui'
import { api, ApiError } from '@/lib/api'
import { EASE, SPRING_SOFT } from '@/lib/motion'
import { useSiteConfig } from '@/lib/siteConfig'
import { cn, formatCompactCurrency, formatDate } from '@/lib/utils'

/** The union of everything the inbox lists — see InboxAdminPage. */
export interface InboxRecord {
  id: string
  reference?: string
  name?: string
  full_name?: string
  email?: string | null
  phone?: string | null
  message?: string | null
  status?: string
  created_at: string

  // enquiries / messages
  topic?: string | null
  budget?: string | null
  based_in?: string | null

  // applications
  role_applied?: string | null
  area_covered?: string | null
  years_experience?: number | null
  pitch?: string | null
  portfolio_url?: string | null

  // bookings
  scheduled_date?: string | null
  scheduled_time?: string | null
  mode?: string | null
  notes?: string | null

  // seller submissions
  upi?: string
  district?: string | null
  sector?: string | null
  location?: string | null
  property_type?: string | null
  asking_price?: number | null
  size?: number | null
  review_note?: string | null
  owners?: {
    id: string
    full_name: string
    phone: string
    email?: string | null
    national_id?: string | null
    is_primary?: boolean
  }[]
  files?: { id: string; kind: string; url: string; original_name?: string | null }[]

  // buyer requests
  intent?: string
  preferred_areas?: string | null
  budget_min?: number | null
  budget_max?: number | null
  bedrooms_min?: number | null
  size_min?: number | null
  timeline?: string | null
}

export type InboxKind = 'enquiries' | 'sell' | 'wanted' | 'bookings' | 'applications'

/** Status choices per tab, and the endpoint that applies them. */
const ACTIONS: Record<InboxKind, { statuses: string[]; endpoint: (id: string) => string; method: 'POST' | 'PATCH' }> = {
  enquiries: {
    statuses: ['new', 'reading', 'handled', 'closed'],
    endpoint: (id) => `/admin/enquiries/${id}/status`,
    method: 'POST',
  },
  applications: {
    statuses: ['new', 'reading', 'shortlisted', 'rejected'],
    endpoint: (id) => `/admin/applications/${id}/status`,
    method: 'POST',
  },
  bookings: {
    statuses: ['pending', 'confirmed', 'completed', 'cancelled'],
    endpoint: (id) => `/admin/bookings/${id}/status`,
    method: 'POST',
  },
  sell: {
    statuses: ['new', 'reviewing', 'accepted', 'rejected'],
    endpoint: (id) => `/admin/seller-submissions/${id}`,
    method: 'PATCH',
  },
  wanted: {
    statuses: ['open', 'matched', 'fulfilled', 'closed'],
    endpoint: (id) => `/admin/property-requests/${id}/review`,
    method: 'POST',
  },
}

/** Digits only — `wa.me` rejects spaces, plus signs and dashes. */
function waNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  // Local 07… numbers need the country code to reach WhatsApp at all.
  if (digits.startsWith('0')) return `250${digits.slice(1)}`
  return digits
}

export function InboxDetail({
  record,
  kind,
  onClose,
  onSaved,
}: {
  record: InboxRecord | null
  kind: InboxKind
  onClose: () => void
  onSaved: () => void
}) {
  const { setting } = useSiteConfig()
  const [status, setStatus] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const open = Boolean(record)
  const phone = record?.phone ?? record?.owners?.[0]?.phone ?? null
  const email = record?.email ?? record?.owners?.[0]?.email ?? null
  const who = record?.full_name ?? record?.name ?? record?.owners?.[0]?.full_name ?? '—'

  const config = ACTIONS[kind]

  const apply = async () => {
    if (!record || !status) return
    setBusy(true)
    setError(null)
    try {
      // The three endpoints disagree on the note's field name, so send what
      // each one expects rather than a lowest common denominator.
      const body: Record<string, unknown> = { status }
      if (note.trim()) {
        if (kind === 'sell' || kind === 'wanted') body.review_note = note.trim()
        else if (kind === 'bookings') body.reason = note.trim()
        else body.note = note.trim()
      }
      if (config.method === 'PATCH') await api.patch(config.endpoint(record.id), body)
      else await api.post(config.endpoint(record.id), body)
      setStatus('')
      setNote('')
      onSaved()
      onClose()
    } catch (err) {
      setError((err as ApiError).message)
    } finally {
      setBusy(false)
    }
  }

  const waTemplate = encodeURIComponent(
    `Hello ${who}, this is ${setting('brand.name', 'Evaramu')} about your ${
      record?.reference ? `request ${record.reference}` : 'enquiry'
    }.`,
  )

  return (
    <AnimatePresence>
      {open && record && (
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
            aria-label="Record detail"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={SPRING_SOFT}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-line bg-canvas shadow-lift"
          >
            <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold text-ink">{who}</h2>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[0.8125rem] text-ink-muted">
                  {record.reference && <span className="font-mono">{record.reference}</span>}
                  <span>{formatDate(record.created_at)}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={record.status === 'new' || record.status === 'open' ? 'warn' : 'good'}>
                  {record.status ?? 'new'}
                </Badge>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="grid size-9 place-items-center rounded-full border border-line text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
                >
                  <X className="size-4" strokeWidth={2.4} />
                </button>
              </div>
            </header>

            {/* reach them — the whole point of opening this panel */}
            <div className="grid grid-cols-3 gap-2 border-b border-line px-6 py-4">
              <ContactAction
                href={phone ? `https://wa.me/${waNumber(phone)}?text=${waTemplate}` : null}
                icon={<MessageCircle className="size-4" strokeWidth={2.2} />}
                label="WhatsApp"
                external
              />
              <ContactAction
                href={phone ? `tel:${phone.replace(/\s/g, '')}` : null}
                icon={<Phone className="size-4" strokeWidth={2.2} />}
                label="Call"
              />
              <ContactAction
                href={email ? `mailto:${email}` : null}
                icon={<Mail className="size-4" strokeWidth={2.2} />}
                label="Email"
              />
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
              <Facts kind={kind} record={record} phone={phone} email={email} />

              {record.review_note && (
                <div className="rounded-2xl border border-line bg-surface p-4">
                  <p className="text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">
                    Last note
                  </p>
                  <p className="mt-1.5 text-[0.875rem] text-ink-soft">{record.review_note}</p>
                </div>
              )}

              {/* act on it */}
              <div className="rounded-2xl border border-line bg-surface p-4">
                <p className="text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">
                  Update status
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {config.statuses.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStatus(value)}
                      className={cn(
                        'rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-semibold capitalize transition-colors',
                        status === value
                          ? 'border-ink bg-ink text-canvas'
                          : 'border-line text-ink-soft hover:border-line-strong hover:text-ink',
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Note for the record (optional)"
                  className={cn(FIELD, 'mt-3 h-auto py-2.5')}
                />
                {error && <div className="mt-3"><ErrorNote message={error} /></div>}
                <button
                  type="button"
                  onClick={apply}
                  disabled={!status || busy}
                  className="mt-3 h-11 w-full rounded-xl bg-ink text-[0.875rem] font-semibold text-canvas transition-opacity disabled:opacity-40"
                >
                  {busy ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function ContactAction({
  href,
  icon,
  label,
  external,
}: {
  href: string | null
  icon: React.ReactNode
  label: string
  external?: boolean
}) {
  const base =
    'flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-3 text-[0.75rem] font-semibold transition-colors'
  if (!href) {
    return (
      <span className={cn(base, 'cursor-not-allowed border-line text-ink-faint')} aria-disabled>
        {icon}
        {label}
      </span>
    )
  }
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={cn(base, 'border-line text-ink-soft hover:border-gold-500 hover:text-ink')}
    >
      {icon}
      {label}
    </a>
  )
}

/** The fields worth reading, chosen per record type. */
function Facts({
  kind,
  record,
  phone,
  email,
}: {
  kind: InboxKind
  record: InboxRecord
  phone: string | null
  email: string | null
}) {
  const rows: [string, React.ReactNode][] = [
    ['Phone', phone ?? '—'],
    ['Email', email ?? '—'],
  ]

  if (kind === 'enquiries') {
    rows.push(['Topic', record.topic ?? '—'], ['Budget', record.budget ?? '—'], ['Based in', record.based_in ?? '—'])
  }
  if (kind === 'applications') {
    rows.push(
      ['Role', record.role_applied ?? '—'],
      ['Area', record.area_covered ?? '—'],
      ['Experience', record.years_experience != null ? `${record.years_experience} years` : '—'],
      [
        'Portfolio',
        record.portfolio_url ? (
          <a href={record.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-gold-600 underline">
            {record.portfolio_url}
          </a>
        ) : (
          '—'
        ),
      ],
    )
  }
  if (kind === 'bookings') {
    rows.push(
      ['When', `${record.scheduled_date ?? '—'} ${record.scheduled_time ?? ''}`.trim()],
      ['Mode', record.mode ?? '—'],
    )
  }
  if (kind === 'sell') {
    rows.push(
      ['UPI', record.upi ?? '—'],
      ['Type', record.property_type ?? '—'],
      ['Where', [record.location, record.sector, record.district].filter(Boolean).join(', ') || '—'],
      ['Asking', record.asking_price != null ? formatCompactCurrency(record.asking_price) : '—'],
      ['Size', record.size != null ? `${record.size} sqm` : '—'],
      ['Owners', String(record.owners?.length ?? 0)],
      ['Documents', String(record.files?.length ?? 0)],
    )
  }
  if (kind === 'wanted') {
    rows.push(
      ['Looking to', record.intent === 'rent' ? 'Rent' : 'Buy'],
      ['Areas', record.preferred_areas ?? record.district ?? '—'],
      [
        'Budget',
        record.budget_min || record.budget_max
          ? `${record.budget_min ? formatCompactCurrency(record.budget_min) : '—'} – ${
              record.budget_max ? formatCompactCurrency(record.budget_max) : '—'
            }`
          : '—',
      ],
      ['Bedrooms', record.bedrooms_min != null ? `${record.bedrooms_min}+` : '—'],
      ['Min size', record.size_min != null ? `${record.size_min} sqm` : '—'],
      ['Timeline', record.timeline ?? '—'],
    )
  }

  const longText = record.message ?? record.pitch ?? record.notes ?? null

  return (
    <div>
      <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-3 text-[0.875rem]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-ink-muted">{label}</dt>
            <dd className="break-words text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      {longText && (
        <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
          <p className="text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">Message</p>
          <p className="mt-1.5 text-[0.875rem] leading-relaxed whitespace-pre-wrap text-ink-soft">
            {longText}
          </p>
        </div>
      )}

      {kind === 'sell' && record.owners && record.owners.length > 0 && (
        <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
          <p className="text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">
            Registered owners
          </p>
          <ul className="mt-2.5 space-y-2.5">
            {record.owners.map((owner) => (
              <li key={owner.id} className="text-[0.875rem]">
                <span className="font-semibold text-ink">{owner.full_name}</span>
                {owner.is_primary && <span className="ml-2 text-[0.75rem] text-gold-600">primary</span>}
                <span className="block text-ink-muted">
                  {[owner.phone, owner.email, owner.national_id].filter(Boolean).join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {kind === 'sell' && record.files && record.files.length > 0 && (
        <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
          <p className="text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">
            Documents
          </p>
          <ul className="mt-2.5 space-y-2">
            {record.files.map((file) => (
              <li key={file.id}>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[0.875rem] text-gold-600 underline"
                >
                  {file.original_name ?? file.kind}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
