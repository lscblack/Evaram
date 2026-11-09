import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { CalendarDays, MessageSquareText, Phone } from 'lucide-react'
import { api } from '@/shared/api/client'
import type { InquiryOut, Page } from '@/shared/api/types'
import { formatDate, relativeTime } from '@/shared/lib/format'
import { useApiMutation } from '@/shared/lib/useApiMutation'
import { useUrlState } from '@/shared/lib/useUrlState'
import { StatusBadge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { DataView, Pagination, type Column } from '@/shared/ui/DataView'
import { Dialog } from '@/shared/ui/Dialog'
import { EmptyState } from '@/shared/ui/EmptyState'
import { Field, FormError, Select, Textarea } from '@/shared/ui/Form'
import { FilterBar, SearchInput, Tabs } from '@/shared/ui/Misc'
import { PageHeader } from '@/shared/ui/PageHeader'

const PAGE_SIZE = 25
const STATUSES = ['new', 'contacted', 'scheduled', 'closed'] as const

export default function InquiriesPage() {
  const [state, set] = useUrlState({ status: 'new', search: '' })
  const [selected, setSelected] = useState<InquiryOut | null>(null)
  const query = useQuery({
    queryKey: ['inquiries', state],
    queryFn: () =>
      api.get<Page<InquiryOut>>('/inquiries', {
        status: state.status === 'all' ? undefined : state.status,
        search: state.search,
        page: state.page,
        page_size: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  const columns: Column<InquiryOut>[] = [
    {
      key: 'who',
      header: 'Prospective tenant',
      cell: (r) => (
        <div>
          <p className="font-medium text-slate-900">{r.full_name}</p>
          <p className="text-slate-500">{r.phone}{r.email ? ` · ${r.email}` : ''}</p>
        </div>
      ),
    },
    {
      key: 'unit',
      header: 'Property',
      cell: (r) => (r.unit_code ? `${r.unit_code} · ${r.unit_name}` : <span className="text-slate-400">General enquiry</span>),
    },
    { key: 'date', header: 'Preferred viewing', cell: (r) => formatDate(r.preferred_date) },
    { key: 'received', header: 'Received', cell: (r) => relativeTime(r.created_at) },
    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
  ]

  return (
    <>
      <PageHeader
        title="Viewing requests"
        description="Requests and questions sent from the public website. Contact the person, then update the status."
      />
      <Card padded={false}>
        <div className="px-3 sm:px-4">
          <Tabs
            value={state.status}
            onChange={(v) => set({ status: v })}
            tabs={[...STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) })), { value: 'all', label: 'All' }]}
          />
        </div>
        <FilterBar>
          <SearchInput value={state.search} onChange={(v) => set({ search: v })} placeholder="Search by name or phone" className="sm:w-80" />
        </FilterBar>
        <DataView
          rows={query.data?.items}
          columns={columns}
          rowKey={(r) => r.id}
          onRowClick={setSelected}
          loading={query.isFetching}
          error={query.error}
          onRetry={query.refetch}
          empty={<EmptyState icon={MessageSquareText} title="No viewing requests" description="New requests from the website will appear here." />}
          mobile={(r) => (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{r.full_name}</p>
                  <p className="text-sm text-slate-500">{r.unit_code ? `${r.unit_code} · ${r.unit_name}` : 'General enquiry'}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <p className="mt-1 text-xs text-slate-400">{relativeTime(r.created_at)}</p>
            </div>
          )}
          footer={
            <Pagination page={Number(state.page)} pageSize={PAGE_SIZE} total={query.data?.total ?? 0} onPage={(p) => set({ page: String(p) })} />
          }
        />
      </Card>
      <InquiryDialog inquiry={selected} onClose={() => setSelected(null)} />
    </>
  )
}

function InquiryDialog({ inquiry, onClose }: { inquiry: InquiryOut | null; onClose: () => void }) {
  const [status, setStatus] = useState('new')
  const [notes, setNotes] = useState('')
  useEffect(() => {
    if (inquiry) {
      setStatus(inquiry.status)
      setNotes(inquiry.staff_notes)
    }
  }, [inquiry])
  const save = useApiMutation((body: { status: string; staff_notes: string }) => api.patch(`/inquiries/${inquiry!.id}`, body), {
    success: 'Request updated',
    invalidate: [['inquiries'], ['badge', 'inquiries']],
    onSuccess: onClose,
  })
  if (!inquiry) return null
  return (
    <Dialog
      open
      onClose={onClose}
      title={inquiry.full_name}
      description={`Received ${relativeTime(inquiry.created_at)}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} block className="sm:w-auto">
            Close
          </Button>
          <Button loading={save.isPending} onClick={() => save.mutate({ status, staff_notes: notes })} block className="sm:w-auto">
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <a href={`tel:${inquiry.phone.replace(/\s/g, '')}`} className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium hover:bg-slate-50">
            <Phone className="size-4 text-brand-700" /> {inquiry.phone}
          </a>
          {inquiry.preferred_date ? (
            <div className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm">
              <CalendarDays className="size-4 text-brand-700" /> {formatDate(inquiry.preferred_date)}
            </div>
          ) : null}
        </div>
        {inquiry.unit_id ? (
          <p className="text-sm">
            Unit:{' '}
            <Link to={`/admin/units/${inquiry.unit_id}`} className="font-medium text-brand-700 hover:underline">
              {inquiry.unit_code} · {inquiry.unit_name}
            </Link>
          </p>
        ) : null}
        {inquiry.message ? <p className="whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{inquiry.message}</p> : null}
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Staff notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Call outcome, viewing time…" />
        </Field>
        <FormError message={save.errorText} />
      </div>
    </Dialog>
  )
}
