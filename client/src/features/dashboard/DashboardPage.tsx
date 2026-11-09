import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  CircleDollarSign,
  ClipboardList,
  DoorOpen,
  FileSpreadsheet,
  Home,
  KeyRound,
  Percent,
  Plus,
  TrendingUp,
  UserPlus,
  UsersRound,
  Wallet,
} from 'lucide-react'
import { api } from '@/shared/api/client'
import type { CurrencyAmount, DashboardData } from '@/shared/api/types'
import { useAuth } from '@/shared/auth/AuthProvider'
import { formatDate, formatMoney, formatMoneyCompact, formatMonth, relativeTime } from '@/shared/lib/format'
import { StatusBadge } from '@/shared/ui/Badge'
import { ButtonLink } from '@/shared/ui/Button'
import { Card, CardHeader, CountUp, StatCard } from '@/shared/ui/Card'
import { EmptyState, ErrorState } from '@/shared/ui/EmptyState'
import { Tabs } from '@/shared/ui/Misc'
import { Skeleton } from '@/shared/ui/Spinner'
import { cn } from '@/shared/ui/cn'

const STATUS_COLORS: Record<string, string> = {
  available: '#059669',
  occupied: '#032a4e',
  reserved: '#0284c7',
  turnover: '#d97706',
  maintenance: '#bc7a26',
  off_market: '#94a3b8',
}
const STATUS_LABEL: Record<string, string> = {
  available: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
  turnover: 'Turnover',
  maintenance: 'Maintenance',
  off_market: 'Off market',
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

/** One currency per line; each line counts up once on mount. */
function Amounts({ items }: { items?: CurrencyAmount[] }) {
  const list = (items ?? []).filter((i) => Number(i.amount) !== 0)
  if (!list.length) return <span className="text-slate-400">0</span>
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      {list.map((i) => (
        <CountUp key={i.currency} value={formatMoney(i.amount, i.currency)} className="tabular leading-snug" />
      ))}
    </span>
  )
}

export default function DashboardPage() {
  const { user, can } = useAuth()
  const q = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardData>('/dashboard'),
    refetchInterval: 120_000,
  })

  const header = (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm text-slate-500">{formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          {greeting()}, {user?.full_name.split(' ')[0]}
        </h1>
      </div>
      <QuickActions />
    </div>
  )

  if (q.error) return <>{header}<Card><ErrorState error={q.error} onRetry={q.refetch} /></Card></>
  if (!q.data) {
    return (
      <>
        {header}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </>
    )
  }

  const d = q.data
  const p = d.portfolio
  const f = d.finance

  if (p.properties === 0) {
    return (
      <>
        {header}
        <Card>
          <EmptyState
            icon={Building2}
            title="Welcome to your property workspace"
            description="Start by adding your first property and its rental units. Published, available units appear on the public website automatically."
            action={can('properties.manage') ? <ButtonLink to="/admin/properties/new" icon={Plus}>Add your first property</ButtonLink> : undefined}
          />
        </Card>
      </>
    )
  }

  return (
    <>
      {header}

      {p.awaiting_move_out > 0 && can('agreements.view') ? (
        <Link
          to="/admin/agreements?tab=moveout"
          className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:bg-amber-100"
        >
          <KeyRound className="size-5 shrink-0 text-amber-600" />
          <span>
            <strong>{p.awaiting_move_out}</strong> ended {p.awaiting_move_out === 1 ? 'tenancy is' : 'tenancies are'} awaiting a recorded move-out.
            Those units stay off the market until the move-out is recorded and the unit is marked ready.
          </span>
        </Link>
      ) : null}

      {/* Portfolio KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 [&>*]:min-w-0">
        <StatCard index={0} label="Properties" value={p.properties} icon={Building2} to="/admin/properties" sub={`${p.publicly_listed} unit${p.publicly_listed === 1 ? '' : 's'} listed publicly`} />
        <StatCard index={1} label="Rental units" value={p.units} icon={DoorOpen} to="/admin/units" />
        <StatCard index={2} label="Available units" value={p.available_units} icon={Home} tone="success" to="/admin/availability" />
        <StatCard index={3} label="Occupied units" value={p.occupied_units} icon={KeyRound} to="/admin/units?status=occupied" />
        <StatCard index={4} label="Occupancy rate" value={`${p.occupancy_rate}%`} icon={Percent} tone="gold" to="/admin/availability" sub="Occupied of all active units" />
        <StatCard index={5} label="Active tenants" value={p.active_tenants} icon={UsersRound} to="/admin/tenants?status=active" />
        {f ? (
          <>
            <StatCard index={6} size="compact" label="Expected monthly rent" value={<Amounts items={f.expected_monthly_rent} />} icon={TrendingUp} to="/admin/agreements?tab=active" />
            <StatCard index={7} size="compact" label="Collected this month" value={<Amounts items={f.collected_this_month} />} icon={CircleDollarSign} tone="success" to="/admin/finance/payments?status=approved" sub="Approved payments only" />
          </>
        ) : null}
      </div>

      {f ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            index={8}
            label="Pending approvals"
            value={f.pending_approvals.count}
            sub={<Amounts items={f.pending_approvals.amounts} />}
            icon={BadgeCheck}
            tone="warning"
            to={can('payments.approve') ? '/admin/finance/approvals' : '/admin/finance/payments?status=pending'}
          />
          <StatCard index={9} size="compact" label="Outstanding rent" value={<Amounts items={f.outstanding} />} icon={Wallet} tone="gold" to="/admin/finance/outstanding" />
          <StatCard
            index={10}
            label="Overdue invoices"
            value={f.overdue.count}
            sub={<Amounts items={f.overdue.amounts} />}
            icon={AlertTriangle}
            tone="danger"
            to="/admin/finance/invoices?tab=overdue"
          />
        </div>
      ) : null}

      {/* Charts */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        {d.revenue_series ? (
          <Card className="lg:col-span-3">
            <RevenueChart series={d.revenue_series} />
          </Card>
        ) : null}
        <Card className={d.revenue_series ? 'lg:col-span-2' : 'lg:col-span-5'}>
          <OccupancyDonut status={p.unit_status} total={p.units} />
        </Card>
      </div>

      {d.occupancy_by_property.length > 0 ? (
        <Card className="mt-4">
          <CardHeader title="Occupancy by property" description="Occupied units against all active units" />
          <PropertyOccupancy rows={d.occupancy_by_property} />
        </Card>
      ) : null}

      {/* Lists */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {d.pending_payments ? (
          <Card padded={false}>
            <div className="p-4 pb-0 sm:p-5 sm:pb-0">
              <CardHeader
                title="Pending payment approvals"
                description="Check the evidence before approving"
                action={can('payments.approve') ? <Link to="/admin/finance/approvals" className="text-sm font-semibold text-brand-700 hover:underline">Review all</Link> : undefined}
              />
            </div>
            {d.pending_payments.length ? (
              <ul className="divide-y divide-slate-100">
                {d.pending_payments.map((pm) => (
                  <li key={pm.id}>
                    <Link to={`/admin/finance/payments/${pm.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 sm:px-5">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{pm.tenant_name}</p>
                        <p className="truncate text-sm text-slate-500">{pm.unit_code} · {pm.method_label} · {formatDate(pm.payment_date)}</p>
                        {pm.possible_duplicate_of.length ? <p className="text-xs font-medium text-red-600">Possible duplicate</p> : null}
                      </div>
                      <span className="shrink-0 font-semibold tabular text-slate-900">{formatMoney(pm.amount, pm.currency)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 pb-6 text-sm text-slate-500">No payments are waiting for approval.</p>
            )}
          </Card>
        ) : null}

        {d.recent_payments ? (
          <Card padded={false}>
            <div className="p-4 pb-0 sm:p-5 sm:pb-0">
              <CardHeader title="Recent transactions" action={<Link to="/admin/finance/payments" className="text-sm font-semibold text-brand-700 hover:underline">All payments</Link>} />
            </div>
            {d.recent_payments.length ? (
              <ul className="divide-y divide-slate-100">
                {d.recent_payments.map((pm) => (
                  <li key={pm.id}>
                    <Link to={`/admin/finance/payments/${pm.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 sm:px-5">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{pm.tenant_name}</p>
                        <p className="truncate text-sm text-slate-500">{pm.payment_number} · {pm.method_label}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold tabular text-slate-900">{formatMoney(pm.amount, pm.currency)}</p>
                        <StatusBadge status={pm.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 pb-6 text-sm text-slate-500">No payments recorded yet.</p>
            )}
          </Card>
        ) : null}

        {d.overdue_invoices ? (
          <Card padded={false}>
            <div className="p-4 pb-0 sm:p-5 sm:pb-0">
              <CardHeader title="Overdue rent" action={<Link to="/admin/finance/invoices?tab=overdue" className="text-sm font-semibold text-brand-700 hover:underline">All overdue</Link>} />
            </div>
            {d.overdue_invoices.length ? (
              <ul className="divide-y divide-slate-100">
                {d.overdue_invoices.map((inv) => (
                  <li key={inv.id}>
                    <Link to={`/admin/finance/invoices/${inv.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 sm:px-5">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{inv.tenant_name}</p>
                        <p className="truncate text-sm text-slate-500">{inv.unit_code} · {inv.invoice_number}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold tabular text-red-700">{formatMoney(inv.balance_due, inv.currency)}</p>
                        <p className="text-xs text-slate-500">{inv.days_overdue} day{inv.days_overdue === 1 ? '' : 's'} overdue</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 pb-6 text-sm text-slate-500">No overdue invoices. 🎉</p>
            )}
          </Card>
        ) : null}

        {d.upcoming_expirations ? (
          <Card padded={false}>
            <div className="p-4 pb-0 sm:p-5 sm:pb-0">
              <CardHeader title="Upcoming rental expirations" description="Agreements ending within 60 days" />
            </div>
            {d.upcoming_expirations.length ? (
              <ul className="divide-y divide-slate-100">
                {d.upcoming_expirations.map((a) => (
                  <li key={a.id}>
                    <Link to={`/admin/agreements/${a.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 sm:px-5">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{a.tenant_name}</p>
                        <p className="truncate text-sm text-slate-500">{a.unit_code} · ends {formatDate(a.end_date)}</p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          (a.days_to_expiry ?? 99) <= 14 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800',
                        )}
                      >
                        {(a.days_to_expiry ?? 0) < 0 ? 'Ended' : `${a.days_to_expiry} days`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 pb-6 text-sm text-slate-500">No agreements end in the next 60 days.</p>
            )}
          </Card>
        ) : null}
      </div>

      <Card className="mt-4">
        <CardHeader title="Recent activity" />
        {d.recent_activity.length ? (
          <ol className="space-y-3">
            {d.recent_activity.map((a, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-gold-500" />
                <div className="min-w-0">
                  <p className="text-sm text-slate-800">{a.summary}</p>
                  <p className="text-xs text-slate-500">{a.actor} · {relativeTime(a.at)}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-slate-500">No activity yet.</p>
        )}
      </Card>
    </>
  )
}

function QuickActions() {
  const { can } = useAuth()
  const actions = [
    { to: '/admin/finance/payments?record=1', label: 'Record payment', icon: ClipboardList, perm: 'payments.record' },
    { to: '/admin/properties/new', label: 'Add property', icon: Plus, perm: 'properties.manage' },
    { to: '/admin/tenants', label: 'Register tenant', icon: UserPlus, perm: 'tenants.manage' },
    { to: '/admin/finance/invoices', label: 'Generate invoices', icon: FileSpreadsheet, perm: 'invoices.manage' },
  ].filter((a) => can(a.perm))
  if (!actions.length) return null
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      {actions.map((a, i) => (
        <ButtonLink key={a.to} to={a.to} icon={a.icon} variant={i === 0 ? 'primary' : 'outline'} size="sm" className="justify-start sm:justify-center">
          {a.label}
        </ButtonLink>
      ))}
    </div>
  )
}

function RevenueChart({ series }: { series: NonNullable<DashboardData['revenue_series']> }) {
  const currencies = useMemo(() => {
    const set = new Set<string>()
    series.forEach((m) => [...Object.keys(m.collected), ...Object.keys(m.billed)].forEach((c) => set.add(c)))
    const list = [...set].sort()
    return list.length ? list : ['RWF']
  }, [series])
  const [cur, setCur] = useState<string>(currencies.includes('RWF') ? 'RWF' : currencies[0])
  const active = currencies.includes(cur) ? cur : currencies[0]
  const data = series.map((m) => ({
    month: formatMonth(m.month),
    Collected: Number(m.collected[active] ?? 0),
    Billed: Number(m.billed[active] ?? 0),
  }))
  return (
    <>
      <CardHeader
        title="Monthly revenue"
        description={`Billed vs collected (approved) in ${active} · last 12 months`}
        action={
          currencies.length > 1 ? (
            <Tabs value={active} onChange={setCur} tabs={currencies.map((c) => ({ value: c, label: c }))} className="border-b-0" />
          ) : undefined
        }
      />
      <div className="h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} interval="preserveStartEnd" />
            <YAxis tickLine={false} axisLine={false} fontSize={11} width={52} tickFormatter={(v) => formatMoneyCompact(Number(v), active)} />
            <Tooltip formatter={(v) => formatMoney(Number(v), active)} cursor={{ fill: '#f1f5f9' }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Billed" fill="#c3d4e6" radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Bar dataKey="Collected" fill="#032a4e" radius={[3, 3, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}

function OccupancyDonut({ status, total }: { status: DashboardData['portfolio']['unit_status']; total: number }) {
  const data = Object.entries(status)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => ({ name: STATUS_LABEL[k] ?? k, key: k, value: n }))
  return (
    <>
      <CardHeader title="Unit status" description={`${total} active unit${total === 1 ? '' : 's'}`} />
      {data.length ? (
        <div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col xl:flex-row">
          <div className="h-48 w-48 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="95%" paddingAngle={2} stroke="none">
                  {data.map((e) => (
                    <Cell key={e.key} fill={STATUS_COLORS[e.key] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="w-full space-y-2">
            {data.map((e) => (
              <li key={e.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: STATUS_COLORS[e.key] }} />
                  {e.name}
                </span>
                <span className="font-semibold tabular">{e.value}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No units yet.</p>
      )}
    </>
  )
}

function PropertyOccupancy({ rows }: { rows: DashboardData['occupancy_by_property'] }) {
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.property_id}>
          <Link to={`/admin/properties/${r.property_id}`} className="block rounded-lg p-1 hover:bg-slate-50">
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium text-slate-800">
                {r.code} · {r.name}
              </span>
              <span className="shrink-0 text-slate-500 tabular">
                {r.occupied}/{r.units} · {r.occupancy_rate}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand-900" style={{ width: `${r.occupancy_rate}%` }} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

