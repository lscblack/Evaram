import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { api } from '@/shared/api/client'
import type { DeletePreview } from '@/shared/api/types'
import { Can } from '@/shared/auth/AuthProvider'
import { formatMoney } from '@/shared/lib/format'
import { useApiMutation } from '@/shared/lib/useApiMutation'
import { Button } from './Button'
import { ConfirmDialog } from './Dialog'

export type DeleteKind = 'payment' | 'invoice' | 'agreement' | 'tenant' | 'unit' | 'property'

const NOUNS: Record<string, [string, string]> = {
  properties: ['property', 'properties'],
  units: ['unit', 'units'],
  photos: ['photo', 'photos'],
  tenants: ['tenant', 'tenants'],
  agreements: ['agreement', 'agreements'],
  documents: ['contract document', 'contract documents'],
  deposits: ['deposit record', 'deposit records'],
  invoices: ['invoice', 'invoices'],
  payments: ['payment', 'payments'],
}

function plural(key: string, n: number) {
  const [one, many] = NOUNS[key] ?? [key, key]
  return `${n} ${n === 1 ? one : many}`
}

/** "Delete permanently" for admins: shows exactly what goes with the record, then deletes it. */
export function DeleteRecordButton({
  kind,
  id,
  name,
  redirectTo,
  invalidate = [],
}: {
  kind: DeleteKind
  id: number
  name: string
  redirectTo: string
  invalidate?: string[][]
}) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const preview = useQuery({
    queryKey: ['delete-preview', kind, id],
    queryFn: () => api.get<DeletePreview>(`/records/${kind}/${id}/delete-preview`),
    enabled: open,
    staleTime: 0,
  })
  const del = useApiMutation(() => api.del<DeletePreview>(`/records/${kind}/${id}`), {
    success: `Deleted ${name}`,
    invalidate: [
      ...invalidate,
      ['payments'], ['invoices'], ['agreements'], ['tenants'], ['units'], ['properties'],
      ['dashboard'], ['reports'], ['badge', 'approvals'], ['availability'],
    ],
    onSuccess: () => {
      setOpen(false)
      navigate(redirectTo, { replace: true })
    },
  })
  const p = preview.data
  const removes = p ? Object.entries(p.removes) : []

  return (
    <Can perm="records.delete">
      <Button variant="ghost" icon={Trash2} onClick={() => setOpen(true)} className="text-red-700 hover:bg-red-50">
        Delete
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => del.mutate(undefined)}
        title={`Delete ${name} permanently?`}
        description="This cannot be undone. The deletion is recorded in the audit log."
        confirmLabel="Delete permanently"
        tone="danger"
        loading={del.isPending || preview.isLoading}
        error={del.errorText ?? (preview.error ? 'Could not check what would be deleted.' : null)}
      >
        {preview.isLoading ? (
          <p className="text-sm text-slate-500">Checking what is linked to it…</p>
        ) : p ? (
          <div className="space-y-3 text-sm">
            {removes.length > 1 || (removes.length === 1 && removes[0][1] > 1) ? (
              <div>
                <p className="font-medium text-slate-800">This also deletes:</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-600">
                  {removes.map(([k, n]) => (
                    <li key={k}>{plural(k, n)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {p.approved_money_removed.length ? (
              <p className="text-slate-700">
                Approved money removed from the books:{' '}
                <span className="font-semibold">
                  {p.approved_money_removed.map((m) => formatMoney(m.amount, m.currency)).join(' + ')}
                </span>
              </p>
            ) : null}
            {p.warnings.length ? (
              <ul className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                {p.warnings.map((w) => (
                  <li key={w} className="flex gap-2">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </ConfirmDialog>
    </Can>
  )
}
