import { Badge, Empty, Loading, PageHeader, Panel, Table, Td, Th } from '@/components/admin/ui'
import { useLiveQuery } from '@/lib/queries'
import type { AuditEntry, Page } from '@/types/api'

const ACTION_TONE = (action: string): 'good' | 'bad' | 'warn' | 'neutral' => {
  if (/delete|reject|suspend/i.test(action)) return 'bad'
  if (/create|approve|verify|publish/i.test(action)) return 'good'
  if (/update|patch|change/i.test(action)) return 'warn'
  return 'neutral'
}

/** Who changed what, and when. Written by the API on every mutating call. */
export default function AuditAdminPage() {
  const { data, loading } = useLiveQuery<Page<AuditEntry>>('/admin/audit?per_page=48', 30_000)
  const rows = data?.items ?? []

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every change made through the console, in the order it happened."
      />

      <Panel>
        {loading && rows.length === 0 ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty title="Nothing logged yet" detail="Changes you make will appear here." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Who</Th>
                <Th>Action</Th>
                <Th>Target</Th>
                <Th className="text-right">When</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-canvas-alt">
                  <Td>
                    <p className="font-medium text-ink">{row.actor_email ?? 'system'}</p>
                    {row.ip_address && (
                      <p className="font-mono text-[0.6875rem] text-ink-faint">{row.ip_address}</p>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={ACTION_TONE(row.action)}>{row.action}</Badge>
                  </Td>
                  <Td className="max-w-sm">
                    <p className="truncate text-ink-soft">
                      {row.entity_type}
                      {row.entity_id ? ` · ${row.entity_id.slice(0, 8)}` : ''}
                    </p>
                  </Td>
                  <Td className="text-right text-[0.8125rem] whitespace-nowrap text-ink-muted">
                    {new Date(row.created_at).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  )
}
