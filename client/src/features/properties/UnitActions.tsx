import { useEffect, useState } from 'react'
import { api } from '@/shared/api/client'
import type { UnitDetail, UnitOut } from '@/shared/api/types'
import { useApiMutation } from '@/shared/lib/useApiMutation'
import { statusLabel } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'
import { Field, FormError, Select, Textarea } from '@/shared/ui/Form'
import { MANUAL_STATUSES } from './shared'

const INVALIDATE = [['units'], ['properties'], ['availability']]

/**
 * Change a unit's status. From "turnover" the only action offered is
 * "mark ready to let", which requires an inspection note (the backend
 * enforces it as well).
 */
export function StatusDialog({ unit, open, onClose }: { unit: UnitOut | UnitDetail; open: boolean; onClose: () => void }) {
  const turnover = unit.status === 'turnover'
  const [status, setStatus] = useState<string>('available')
  const [reason, setReason] = useState('')
  useEffect(() => {
    if (open) {
      setStatus(turnover ? 'available' : MANUAL_STATUSES.find((s) => s !== unit.status) ?? 'available')
      setReason('')
    }
  }, [open, turnover, unit.status])
  const save = useApiMutation(
    () => api.post<UnitDetail>(`/units/${unit.id}/status`, { status, reason: reason.trim() }),
    { success: turnover ? `${unit.code} is ready to let` : `${unit.code} is now ${statusLabel(status).toLowerCase()}`, invalidate: INVALIDATE, onSuccess: onClose },
  )
  const noteRequired = turnover && status === 'available'
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title={turnover ? `Mark ${unit.code} ready to let` : `Change status of ${unit.code}`}
      description={
        turnover
          ? 'Confirm the unit has been inspected, cleaned and repaired after the previous tenant left.'
          : 'Occupied and turnover are set automatically by rental agreements.'
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} block className="sm:w-auto">
            Cancel
          </Button>
          <Button
            onClick={() => save.mutate(undefined)}
            loading={save.isPending}
            disabled={noteRequired && reason.trim().length < 3}
            variant={turnover ? 'success' : 'primary'}
            block
            className="sm:w-auto"
          >
            {turnover ? 'Mark ready' : 'Update status'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!turnover ? (
          <Field label="New status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {MANUAL_STATUSES.filter((s) => s !== unit.status).map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <Field label={noteRequired ? 'Inspection note' : 'Reason (optional)'} required={noteRequired}>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={255}
            placeholder={noteRequired ? 'Inspected, cleaned, keys changed…' : 'e.g. Plumbing repairs'}
          />
        </Field>
        <FormError message={save.errorText} />
      </div>
    </Dialog>
  )
}

export function usePublishToggle(unit: UnitOut | UnitDetail) {
  return useApiMutation(
    () => api.post<UnitDetail>(`/units/${unit.id}/publish`, { is_published: !unit.is_published }),
    {
      success: unit.is_published ? `${unit.code} unpublished` : `${unit.code} published`,
      invalidate: INVALIDATE,
      toastError: true,
    },
  )
}
