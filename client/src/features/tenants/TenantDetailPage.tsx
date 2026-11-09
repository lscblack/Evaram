import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Archive, FilePlus2, Mail, Pencil, Phone, Wallet } from 'lucide-react'
import { api } from '@/shared/api/client'
import type { InvoiceOut, Page, PaymentOut, TenantDetail } from '@/shared/api/types'
import { Can, useAuth } from '@/shared/auth/AuthProvider'
import { formatDate, formatMoney, humanize } from '@/shared/lib/format'
import { useApiMutation } from '@/shared/lib/useApiMutation'
import { Badge, StatusBadge } from '@/shared/ui/Badge'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { Card, CardHeader, DescriptionList } from '@/shared/ui/Card'
import { DataView, type Column } from '@/shared/ui/DataView'
import { ConfirmDialog } from '@/shared/ui/Dialog'
import { EmptyState, ErrorState } from '@/shared/ui/EmptyState'
import { Avatar, CurrencyAmounts, Tabs } from '@/shared/ui/Misc'
import { PageHeader } from '@/shared/ui/PageHeader'
import { FullPageSpinner } from '@/shared/ui/Spinner'
import { TenantFormDialog } from './TenantFormDialog'
import { DeleteRecordButton } from '@/shared/ui/DeleteRecord'

type Tab = 'agreements' | 'invoices' | 'payments'

export default function TenantDetailPage() {
  const { id } = useParams()
  const { can } = useAuth()
  const [tab, setTab] = useState<Tab>('agreements')
  const [editing, setEditing] = useState(false)
  const [archiving, setArchiving] = useState(false)

  const query = useQuery({
    queryKey: ['tenant', id],
    queryFn: () => api.get<TenantDetail>(`/tenants/${id}`),
  })
  const archive = useApiMutation(() => api.post<TenantDetail>(`/tenants/${id}/archive`), {
    success: 'Tenant archived',
    invalidate: [['tenant', id], ['tenants']],
    onSuccess: () => setArchiving(false),
  })

  if (query.isLoading) return <FullPageSpinner />
  if (query.error || !query.data) return <ErrorState error={query.error} onRetry={query.refetch} />
  const t = query.data
  const active = t.current_tenancies[0]

  return (
    <>
      <PageHeader
        back={{ to: '/admin/tenants', label: 'Tenants' }}
        title={
          <span className="flex items-center gap-3">
            <Avatar name={t.full_name} className="size-11 text-base" />
            <span className="min-w-0 break-words">{t.full_name}</span>
          </span>
        }
        meta={
          <>
            {t.current_tenancies.length ? <Badge tone="success" dot>Current tenant</Badge> : <Badge>No current tenancy</Badge>}
            {t.is_archived ? <Badge tone="warning">Archived</Badge> : null}
            <span className="text-sm text-slate-500">Registered {formatDate(t.registered_on)}</span>
          </>
        }
        actions={
          !t.is_archived ? (
            <>
              <Can perm="agreements.manage">
                <ButtonLink to={`/admin/agreements/new?tenant=${t.id}`} variant="outline" icon={FilePlus2}>
                  New agreement
                </ButtonLink>
              </Can>
              {active ? (
                <Can perm="payments.record">
                  <ButtonLink to={`/admin/finance/payments?record=1&agreement=${active.agreement_id}`} icon={Wallet}>
                    Record payment
                  </ButtonLink>
                </Can>
              ) : null}
              <Can perm="tenants.manage">
                <Button variant="outline" icon={Pencil} onClick={() => setEditing(true)}>
                  Edit
                </Button>
                <Button variant="ghost" icon={Archive} onClick={() => setArchiving(true)}>
                  Archive
                </Button>
              </Can>
              <DeleteRecordButton kind="tenant" id={t.id} name={t.full_name} redirectTo="/admin/tenants" />
            </>
          ) : (
            <DeleteRecordButton kind="tenant" id={t.id} name={t.full_name} redirectTo="/admin/tenants" />
          )
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryTile label="Outstanding balance" tone="danger">
          <CurrencyAmounts items={t.outstanding} empty="Nothing owed" />
        </SummaryTile>
        <SummaryTile label="Credit (unapplied payments)">
          <CurrencyAmounts items={t.credit} empty="None" />
        </SummaryTile>
        <SummaryTile label="Total paid (approved)">
          <CurrencyAmounts items={t.total_paid} empty="No payments yet" />
        </SummaryTile>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-1">
          <Card>
            <CardHeader title="Contact" />
            <div className="space-y-2">
              <a href={`tel:${t.phone.replace(/\s/g, '')}`} className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium hover:bg-slate-50">
                <Phone className="size-4 text-brand-700" /> {t.phone}
              </a>
              {t.email ? (
                <a href={`mailto:${t.email}`} className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium hover:bg-slate-50">
                  <Mail className="size-4 shrink-0 text-brand-700" /> <span className="truncate">{t.email}</span>
                </a>
              ) : null}
            </div>
            <div className="mt-4">
              <DescriptionList
                cols={1}
                items={[
                  { label: 'Nationality', value: t.nationality || '—' },
                  { label: 'Occupation', value: t.occupation || '—' },
                ]}
              />
            </div>
          </Card>
          <Card>
            <CardHeader title="Emergency contact" />
            <DescriptionList
              cols={1}
              items={[
                { label: 'Name', value: t.emergency_contact_name || '—' },
                {
                  label: 'Phone',
                  value: t.emergency_contact_phone ? (
                    <a className="text-brand-700 hover:underline" href={`tel:${t.emergency_contact_phone.replace(/\s/g, '')}`}>
                      {t.emergency_contact_phone}
                    </a>
                  ) : (
                    '—'
                  ),
                },
                { label: 'Relationship', value: t.emergency_contact_relationship || '—' },
              ]}
            />
          </Card>
          <Card>
            <CardHeader title="Identification" description={t.id_number_masked ? 'Masked — requires the sensitive-data permission.' : undefined} />
            <DescriptionList
              cols={1}
              items={[
                { label: 'Document', value: humanize(t.id_type) },
                { label: 'Number', value: <span className="tabular">{t.id_number || '—'}</span> },
              ]}
            />
          </Card>
          {t.notes ? (
            <Card>
              <CardHeader title="Notes" />
              <p className="whitespace-pre-line text-sm text-slate-700">{t.notes}</p>
            </Card>
          ) : null}
        </div>

        <Card padded={false} className="lg:col-span-2">
          <div className="px-3 sm:px-4">
            <Tabs<Tab>
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'agreements', label: 'Rental history', count: t.agreements.length },
                ...(can('invoices.view') ? [{ value: 'invoices' as Tab, label: 'Invoices' }] : []),
                ...(can('payments.view') ? [{ value: 'payments' as Tab, label: 'Payments' }] : []),
              ]}
            />
          </div>
          {tab === 'agreements' ? <AgreementHistory t={t} /> : null}
          {tab === 'invoices' ? <TenantInvoices tenantId={t.id} /> : null}
          {tab === 'payments' ? <TenantPayments tenantId={t.id} /> : null}
        </Card>
      </div>

      <TenantFormDialog open={editing} onClose={() => setEditing(false)} tenant={t} />
      <ConfirmDialog
        open={archiving}
        onClose={() => setArchiving(false)}
        onConfirm={() => archive.mutate(undefined)}
        title="Archive this tenant?"
        description="Archived tenants are hidden from lists and cannot get new agreements. Their history and financial records are kept. Tenants with an active agreement or an unpaid balance cannot be archived."
        confirmLabel="Archive tenant"
        tone="danger"
        loading={archive.isPending}
        error={archive.errorText}
      />
    </>
  )
}

function SummaryTile({ label, children, tone }: { label: string; children: ReactNode; tone?: 'danger' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className={tone === 'danger' ? 'mt-1 text-lg font-bold text-red-700' : 'mt-1 text-lg font-bold text-slate-900'}>{children}</div>
    </div>
  )
}

function AgreementHistory({ t }: { t: TenantDetail }) {
  type Row = TenantDetail['agreements'][number]
  const columns: Column<Row>[] = [
    { key: 'num', header: 'Agreement', cell: (a) => <span className="font-medium text-slate-900">{a.agreement_number}</span> },
    { key: 'unit', header: 'Unit', cell: (a) => `${a.unit_code} · ${a.property_name}` },
    { key: 'period', header: 'Period', cell: (a) => `${formatDate(a.start_date)} – ${a.end_date ? formatDate(a.end_date) : 'open'}` },
    { key: 'rent', header: 'Rent', align: 'right', cell: (a) => formatMoney(a.monthly_rent, a.currency) },
    { key: 'status', header: 'Status', cell: (a) => <StatusBadge status={a.status} /> },
  ]
  return (
    <DataView
      rows={t.agreements}
      columns={columns}
      rowKey={(a) => a.id}
      rowHref={(a) => `/admin/agreements/${a.id}`}
      empty={<EmptyState title="No rental agreements yet" description="Create an agreement to let a unit to this tenant." />}
      mobile={(a) => (
        <div>
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-slate-900">{a.unit_code} · {a.property_name}</p>
            <StatusBadge status={a.status} />
          </div>
          <p className="text-sm text-slate-500">
            {a.agreement_number} · {formatDate(a.start_date)} – {a.end_date ? formatDate(a.end_date) : 'open'}
          </p>
          <p className="text-sm tabular text-slate-700">{formatMoney(a.monthly_rent, a.currency)} / month</p>
        </div>
      )}
    />
  )
}

function TenantInvoices({ tenantId }: { tenantId: number }) {
  const q = useQuery({
    queryKey: ['invoices', { tenant_id: tenantId }],
    queryFn: () => api.get<Page<InvoiceOut>>('/invoices', { tenant_id: tenantId, page_size: 50 }),
  })
  const columns: Column<InvoiceOut>[] = [
    { key: 'num', header: 'Invoice', cell: (i) => <span className="font-medium text-slate-900">{i.invoice_number}</span> },
    { key: 'unit', header: 'Unit', cell: (i) => i.unit_code },
    { key: 'due', header: 'Due', cell: (i) => formatDate(i.due_date) },
    { key: 'amount', header: 'Amount', align: 'right', cell: (i) => formatMoney(i.amount_charged, i.currency) },
    { key: 'balance', header: 'Balance', align: 'right', cell: (i) => formatMoney(i.balance_due, i.currency) },
    { key: 'status', header: 'Status', cell: (i) => <StatusBadge status={i.status} /> },
  ]
  return (
    <DataView
      rows={q.data?.items}
      columns={columns}
      rowKey={(i) => i.id}
      rowHref={(i) => `/admin/finance/invoices/${i.id}`}
      loading={q.isFetching}
      error={q.error}
      onRetry={q.refetch}
      empty={<EmptyState title="No invoices yet" />}
      mobile={(i) => (
        <div>
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-slate-900">{i.invoice_number}</p>
            <StatusBadge status={i.status} />
          </div>
          <p className="text-sm text-slate-500">{i.unit_code} · due {formatDate(i.due_date)}</p>
          <p className="text-sm tabular">
            {formatMoney(i.amount_charged, i.currency)}
            {Number(i.balance_due) > 0 ? <span className="text-red-700"> · {formatMoney(i.balance_due, i.currency)} due</span> : null}
          </p>
        </div>
      )}
      footer={
        q.data && q.data.total > q.data.items.length ? (
          <Link to={`/admin/finance/invoices?tenant_id=${tenantId}`} className="block border-t border-slate-100 px-4 py-3 text-sm font-medium text-brand-700">
            View all {q.data.total} invoices →
          </Link>
        ) : null
      }
    />
  )
}

function TenantPayments({ tenantId }: { tenantId: number }) {
  const q = useQuery({
    queryKey: ['payments', { tenant_id: tenantId }],
    queryFn: () => api.get<Page<PaymentOut>>('/payments', { tenant_id: tenantId, page_size: 50 }),
  })
  const columns: Column<PaymentOut>[] = [
    { key: 'num', header: 'Payment', cell: (p) => <span className="font-medium text-slate-900">{p.payment_number}</span> },
    { key: 'date', header: 'Date', cell: (p) => formatDate(p.payment_date) },
    { key: 'method', header: 'Method', cell: (p) => p.method_label },
    { key: 'amount', header: 'Amount', align: 'right', cell: (p) => formatMoney(p.amount, p.currency) },
    { key: 'status', header: 'Status', cell: (p) => <StatusBadge status={p.status} /> },
  ]
  return (
    <DataView
      rows={q.data?.items}
      columns={columns}
      rowKey={(p) => p.id}
      rowHref={(p) => `/admin/finance/payments/${p.id}`}
      loading={q.isFetching}
      error={q.error}
      onRetry={q.refetch}
      empty={<EmptyState title="No payments recorded" />}
      mobile={(p) => (
        <div>
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium tabular text-slate-900">{formatMoney(p.amount, p.currency)}</p>
            <StatusBadge status={p.status} />
          </div>
          <p className="text-sm text-slate-500">
            {p.payment_number} · {formatDate(p.payment_date)} · {p.method_label}
          </p>
        </div>
      )}
      footer={
        q.data && q.data.total > q.data.items.length ? (
          <Link to={`/admin/finance/payments?tenant_id=${tenantId}`} className="block border-t border-slate-100 px-4 py-3 text-sm font-medium text-brand-700">
            View all {q.data.total} payments →
          </Link>
        ) : null
      }
    />
  )
}
