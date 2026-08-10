import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight, FileSearch, Gavel, Home } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useQuery } from '@/lib/queries'
import { useT } from '@/lib/i18n'
import { enterProps, fadeUp, stagger } from '@/lib/motion'
import { cn, formatCompactCurrency, formatDate } from '@/lib/utils'
import type { ApiBid, ApiPropertyRequest, ApiSellerSubmission } from '@/types/api'
import type { TranslationKey } from '@/data/translations'

/** Status → badge tone. Anything still with us reads as "in progress". */
const TONES: Record<string, string> = {
  new: 'bg-gold-50 text-gold-700',
  open: 'bg-gold-50 text-gold-700',
  reviewing: 'bg-gold-50 text-gold-700',
  pending: 'bg-gold-50 text-gold-700',
  accepted: 'bg-emerald-50 text-emerald-700',
  matched: 'bg-emerald-50 text-emerald-700',
  fulfilled: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  closed: 'bg-canvas-alt text-ink-soft',
}

function StatusBadge({ status }: { status: string }) {
  const t = useT()
  const key = `status.${status}` as TranslationKey
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-bold tracking-wide uppercase',
        TONES[status] ?? 'bg-canvas-alt text-ink-soft',
      )}
    >
      {t(key)}
    </span>
  )
}

/**
 * What a signed-in buyer or seller sees.
 *
 * Before this existed, `/account` bounced straight to the listings the moment
 * you authenticated — so a submission you made had nowhere to appear, even
 * though the record was sitting in the database the whole time.
 */
export function AccountDashboard() {
  const t = useT()
  const { user, logout } = useAuth()

  const { data: wanted } = useQuery<ApiPropertyRequest[]>('/public/my/property-requests')
  const { data: selling } = useQuery<ApiSellerSubmission[]>('/public/my/seller-submissions')
  const { data: bids } = useQuery<ApiBid[]>('/public/my/bids')

  const budget = (row: ApiPropertyRequest) => {
    if (row.budget_min && row.budget_max)
      return `${formatCompactCurrency(row.budget_min)} – ${formatCompactCurrency(row.budget_max)}`
    if (row.budget_max) return `${t('common.from')} — ${formatCompactCurrency(row.budget_max)}`
    if (row.budget_min) return `${t('common.from')} ${formatCompactCurrency(row.budget_min)}`
    return null
  }

  return (
    <motion.div variants={stagger(0.08)} {...enterProps} className="space-y-8">
      {/* who you are */}
      <motion.div
        variants={fadeUp}
        className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-line bg-surface p-6"
      >
        <div>
          <p className="font-display text-xl font-semibold text-ink">{user?.full_name}</p>
          <p className="mt-1 text-[0.875rem] text-ink-muted">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="rounded-full border border-line px-4 py-2 text-[0.875rem] font-semibold text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
        >
          {t('account.signOut')}
        </button>
      </motion.div>

      {/* what I am looking for */}
      <Section
        variants={fadeUp}
        icon={<FileSearch className="size-5" strokeWidth={2} />}
        title={t('account.wanted')}
        empty={!wanted?.length ? t('account.noWanted') : null}
        action={
          <Link
            to="/properties"
            className="inline-flex items-center gap-1.5 text-[0.875rem] font-semibold text-ink transition-colors hover:text-gold-600"
          >
            {t('request.title')}
            <ArrowUpRight className="size-4" strokeWidth={2.4} />
          </Link>
        }
      >
        {wanted?.map((row) => (
          <Row
            key={row.id}
            reference={row.reference}
            status={row.status}
            title={[
              row.intent === 'rent' ? t('prop.forRent') : t('prop.forSale'),
              row.preferred_areas || row.district,
            ]
              .filter(Boolean)
              .join(' · ')}
            detail={[budget(row), row.bedrooms_min ? `${row.bedrooms_min}+ ${t('prop.bed')}` : null, row.timeline]
              .filter(Boolean)
              .join(' · ')}
            note={row.review_note}
            createdAt={row.created_at}
          />
        ))}
      </Section>

      {/* what I asked you to sell */}
      <Section
        variants={fadeUp}
        icon={<Home className="size-5" strokeWidth={2} />}
        title={t('account.selling')}
        empty={!selling?.length ? t('account.noSelling') : null}
        action={
          <Link
            to="/sell"
            className="inline-flex items-center gap-1.5 text-[0.875rem] font-semibold text-ink transition-colors hover:text-gold-600"
          >
            {t('footer.sellYours')}
            <ArrowUpRight className="size-4" strokeWidth={2.4} />
          </Link>
        }
      >
        {selling?.map((row) => (
          <Row
            key={row.id}
            reference={row.reference}
            status={row.status}
            title={[row.property_type, row.location || row.district].filter(Boolean).join(' · ')}
            detail={[
              `UPI ${row.upi}`,
              row.asking_price ? formatCompactCurrency(row.asking_price) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
            note={row.review_note}
            createdAt={row.created_at}
          />
        ))}
      </Section>

      {/* offers I have placed */}
      {bids && bids.length > 0 && (
        <Section
          variants={fadeUp}
          icon={<Gavel className="size-5" strokeWidth={2} />}
          title={t('account.myOffers')}
          empty={null}
        >
          {bids.map((bid) => (
            <Row
              key={bid.id}
              status={bid.status}
              title={formatCompactCurrency(bid.amount)}
              detail={bid.message ?? ''}
              createdAt={bid.created_at}
            />
          ))}
        </Section>
      )}
    </motion.div>
  )
}

function Section({
  icon,
  title,
  action,
  empty,
  children,
  variants,
}: {
  icon: React.ReactNode
  title: string
  action?: React.ReactNode
  empty: string | null
  children?: React.ReactNode
  variants?: typeof fadeUp
}) {
  return (
    <motion.section variants={variants} className="rounded-3xl border border-line bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
        <h2 className="flex items-center gap-2.5 font-display text-[1.0625rem] font-semibold text-ink">
          <span className="grid size-9 place-items-center rounded-xl bg-canvas-alt text-ink-soft">
            {icon}
          </span>
          {title}
        </h2>
        {action}
      </header>
      {empty ? (
        <p className="px-6 py-10 text-center text-[0.9375rem] text-ink-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-line">{children}</ul>
      )}
    </motion.section>
  )
}

function Row({
  reference,
  status,
  title,
  detail,
  note,
  createdAt,
}: {
  reference?: string
  status: string
  title: string
  detail?: string
  note?: string | null
  createdAt: string
}) {
  const t = useT()
  return (
    <li className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
      <div className="min-w-0">
        <p className="font-semibold text-ink">{title || '—'}</p>
        {detail && <p className="mt-1 text-[0.875rem] text-ink-soft">{detail}</p>}
        {note && <p className="mt-2 text-[0.8125rem] text-ink-muted italic">{note}</p>}
        <p className="mt-2 flex flex-wrap items-center gap-x-3 text-[0.75rem] text-ink-faint">
          {reference && <span className="font-mono">{reference}</span>}
          <span>
            {t('account.submitted')} {formatDate(createdAt)}
          </span>
        </p>
      </div>
      <StatusBadge status={status} />
    </li>
  )
}
