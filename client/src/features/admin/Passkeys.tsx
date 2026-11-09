import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { browserSupportsWebAuthn, startRegistration, type PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser'
import { Cloud, Fingerprint, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api, errorMessage } from '@/shared/api/client'
import type { PasskeyOptionsOut, PasskeyOut } from '@/shared/api/types'
import { formatDateTime } from '@/shared/lib/format'
import { useApiMutation } from '@/shared/lib/useApiMutation'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardHeader } from '@/shared/ui/Card'
import { ConfirmDialog } from '@/shared/ui/Dialog'
import { Field, FormError, Input } from '@/shared/ui/Form'
import { SkeletonRows } from '@/shared/ui/Spinner'

/** Passkeys: sign in with the fingerprint, face or PIN of a device instead of a password. */
export function PasskeysCard() {
  const supported = browserSupportsWebAuthn()
  const list = useQuery({ queryKey: ['passkeys'], queryFn: () => api.get<PasskeyOut[]>('/auth/passkeys') })
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<PasskeyOut | null>(null)
  const remove = useApiMutation((id: number) => api.del(`/auth/passkeys/${id}`), {
    success: 'Passkey removed',
    invalidate: [['passkeys']],
    onSuccess: () => setRemoving(null),
  })

  async function add() {
    setError(null)
    setBusy(true)
    try {
      const o = await api.post<PasskeyOptionsOut>('/auth/passkeys/register/options')
      const credential = await startRegistration({ optionsJSON: o.options as unknown as PublicKeyCredentialCreationOptionsJSON })
      await api.post('/auth/passkeys/register', { challenge_id: o.challenge_id, credential, name: name.trim() })
      setName('')
      await list.refetch()
      toast.success('Passkey added. Next time choose “Sign in with a passkey”.')
    } catch (e) {
      const n = (e as { name?: string })?.name
      setError(
        n === 'NotAllowedError' || n === 'AbortError'
          ? 'Adding the passkey was cancelled or timed out.'
          : n === 'InvalidStateError'
            ? 'This device already has a passkey for your account.'
            : errorMessage(e),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader
        title="Passkeys"
        description="Sign in with your phone or laptop’s fingerprint, face or PIN — no password to type or leak."
      />
      {!supported ? (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">This browser does not support passkeys. Try a recent Chrome, Safari or Edge.</p>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Name (optional)" htmlFor="pk-name" className="sm:w-72">
            <Input id="pk-name" value={name} maxLength={80} placeholder="e.g. My phone" onChange={(e) => setName(e.target.value)} />
          </Field>
          <Button icon={Plus} loading={busy} onClick={add}>
            Add a passkey
          </Button>
        </div>
      )}
      <div className="mt-3">
        <FormError message={error} />
      </div>
      <div className="mt-4">
        {list.isLoading ? (
          <SkeletonRows rows={2} />
        ) : list.data?.length ? (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {list.data.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Fingerprint className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
                    <span className="truncate">{p.name}</span>
                    {p.backed_up ? (
                      <Badge tone="info">
                        <Cloud className="size-3" /> Synced
                      </Badge>
                    ) : null}
                  </p>
                  <p className="text-xs text-slate-500">
                    Added {formatDateTime(p.created_at)} · {p.last_used_at ? `last used ${formatDateTime(p.last_used_at)}` : 'not used yet'}
                  </p>
                </div>
                <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setRemoving(p)} className="text-red-700 hover:bg-red-50" aria-label={`Remove ${p.name}`}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No passkeys yet.</p>
        )}
      </div>
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing.id)}
        loading={remove.isPending}
        title={`Remove “${removing?.name ?? ''}”?`}
        description="You will no longer be able to sign in with it. Your password keeps working."
        confirmLabel="Remove passkey"
        tone="danger"
      />
    </Card>
  )
}
