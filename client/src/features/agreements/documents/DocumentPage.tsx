import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import {
  Ban,
  CheckCircle2,
  Circle,
  FilePenLine,
  PenLine,
  Printer,
  RefreshCw,
  Save,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react'
import { api } from '@/shared/api/client'
import type { AgreementDocumentOut, PlaceholderOut } from '@/shared/api/types'
import { useAuth } from '@/shared/auth/AuthProvider'
import { formatDateTime } from '@/shared/lib/format'
import { useApiMutation } from '@/shared/lib/useApiMutation'
import { StatusBadge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardHeader } from '@/shared/ui/Card'
import { Dialog } from '@/shared/ui/Dialog'
import { ErrorState } from '@/shared/ui/EmptyState'
import { Checkbox, Field, FormError, Input, Textarea } from '@/shared/ui/Form'
import { PageHeader } from '@/shared/ui/PageHeader'
import { FullPageSpinner } from '@/shared/ui/Spinner'
import { cn } from '@/shared/ui/cn'
import { DocumentSheet, groupCode } from './DocumentSheet'
import { SignaturePad, type SignaturePadHandle } from './SignaturePad'

type Party = 'tenant' | 'landlord'

export function usePlaceholders() {
  return useQuery({
    queryKey: ['agreement-placeholders'],
    queryFn: () => api.get<PlaceholderOut[]>('/agreement-templates/placeholders'),
    staleTime: Infinity,
  })
}

export function openPrint(docId: number) {
  window.open(`/print/documents/${docId}`, '_blank', 'noopener')
}

export default function DocumentPage() {
  const { id, docId } = useParams()
  const { can } = useAuth()
  const key = ['agreement-document', docId]
  const q = useQuery({ queryKey: key, queryFn: () => api.get<AgreementDocumentOut>(`/agreement-documents/${docId}`) })
  const placeholders = usePlaceholders()
  const [signing, setSigning] = useState<Party | null>(null)
  const [voiding, setVoiding] = useState(false)

  if (q.isLoading) return <FullPageSpinner />
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={q.refetch} />
  const doc = q.data
  const manage = can('agreements.manage')
  const labels = Object.fromEntries((placeholders.data ?? []).map((p) => [p.key, p.label]))
  const editable = manage && doc.status === 'draft'
  const canSign = manage && (doc.status === 'draft' || doc.status === 'signing')

  return (
    <>
      <PageHeader
        back={{ to: `/admin/agreements/${id}`, label: doc.agreement_number }}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {doc.document_number} <StatusBadge status={doc.status} />
          </span>
        }
        description={`${doc.tenant_name} · ${doc.unit_code}${doc.template_name ? ` · ${doc.template_name}` : ''}`}
        actions={
          <>
            <Button variant="outline" icon={Printer} onClick={() => openPrint(doc.id)}>
              Print
            </Button>
            {manage && doc.status !== 'void' ? (
              <Button variant="ghost" icon={Ban} onClick={() => setVoiding(true)}>
                Void
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="order-2 min-w-0 lg:order-1 lg:col-span-8">
          <DocumentSheet doc={doc} className="animate-stat-in" />
        </div>

        <aside className="order-1 min-w-0 space-y-4 lg:order-2 lg:col-span-4">
          <Progress doc={doc} labels={labels} canSign={canSign} onSign={setSigning} />
          {editable ? <FieldsCard doc={doc} placeholders={placeholders.data ?? []} queryKey={key} /> : null}
          {editable ? <WordingCard doc={doc} queryKey={key} /> : null}
          {doc.status !== 'draft' ? <VerificationCard doc={doc} /> : null}
        </aside>
      </div>

      <SignDialog doc={doc} party={signing} onClose={() => setSigning(null)} queryKey={key} />
      <VoidDialog doc={doc} open={voiding} onClose={() => setVoiding(false)} queryKey={key} />
    </>
  )
}

function Progress({
  doc,
  labels,
  canSign,
  onSign,
}: {
  doc: AgreementDocumentOut
  labels: Record<string, string>
  canSign: boolean
  onSign: (p: Party) => void
}) {
  const filled = doc.status !== 'draft' || doc.missing.length === 0
  const steps = [
    { done: filled, title: 'Fill in every blank', detail: filled ? 'All details complete' : `${doc.missing.length} still empty` },
    {
      done: !!doc.tenant_signature,
      title: 'Tenant signs',
      detail: doc.tenant_signature ? `${doc.tenant_signature.name} · ${formatDateTime(doc.tenant_signature.signed_at)}` : 'In person, on this device',
      party: 'tenant' as Party,
    },
    {
      done: !!doc.landlord_signature,
      title: 'Landlord signs',
      detail: doc.landlord_signature ? `${doc.landlord_signature.name} · ${formatDateTime(doc.landlord_signature.signed_at)}` : 'Authorised staff signs for the landlord',
      party: 'landlord' as Party,
    },
  ]
  return (
    <Card>
      <CardHeader title="Signing progress" description="The text is locked at the first signature." className="mb-3" />
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-3">
            {s.done ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            ) : (
              <Circle className="mt-0.5 size-5 shrink-0 text-slate-300" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">{s.title}</p>
              <p className="truncate text-xs text-slate-500">{s.detail}</p>
            </div>
            {s.party && !s.done && canSign ? (
              <Button size="sm" variant={filled ? 'primary' : 'outline'} icon={PenLine} disabled={!filled} onClick={() => onSign(s.party!)}>
                Sign
              </Button>
            ) : null}
          </li>
        ))}
      </ol>
      {doc.status === 'draft' && doc.missing.length ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Missing: {doc.missing.map((m) => labels[m] || m).join(', ')}
        </p>
      ) : null}
      {doc.agreement_currency !== 'RWF' && doc.status === 'draft' ? (
        <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
          This agreement is billed in {doc.agreement_currency}. The document states amounts in Frw — type the Frw figures below.
        </p>
      ) : null}
    </Card>
  )
}

function FieldsCard({ doc, placeholders, queryKey }: { doc: AgreementDocumentOut; placeholders: PlaceholderOut[]; queryKey: unknown[] }) {
  const [values, setValues] = useState<Record<string, string>>(doc.fields)
  useEffect(() => setValues(doc.fields), [doc.fields])
  const used = useMemo(() => new Set(doc.used_placeholders), [doc.used_placeholders])
  const groups = useMemo(() => {
    const out: Record<string, PlaceholderOut[]> = {}
    for (const p of placeholders) if (used.has(p.key)) (out[p.group] ??= []).push(p)
    return out
  }, [placeholders, used])
  const changed = Object.keys(values).filter((k) => (values[k] ?? '') !== (doc.fields[k] ?? ''))
  const save = useApiMutation(
    () => api.patch<AgreementDocumentOut>(`/agreement-documents/${doc.id}`, { fields: Object.fromEntries(changed.map((k) => [k, values[k]])) }),
    { success: 'Details saved', invalidate: [queryKey] },
  )
  const refresh = useApiMutation(() => api.patch<AgreementDocumentOut>(`/agreement-documents/${doc.id}`, { refresh: true }), {
    success: 'Details re-read from the tenant, unit and landlord records',
    invalidate: [queryKey],
  })
  const missing = new Set(doc.missing)

  return (
    <Card>
      <CardHeader
        title="Fill-in details"
        description="Pre-filled from the agreement; edit anything before signing."
        className="mb-3"
        action={
          <Button size="sm" variant="ghost" icon={RefreshCw} loading={refresh.isPending} onClick={() => refresh.mutate(undefined)} aria-label="Refresh from records">
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        }
      />
      <div className="space-y-5">
        {Object.entries(groups).map(([group, items]) => (
          <fieldset key={group} className="space-y-3">
            <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{group}</legend>
            {items.map((p) => (
              <Field key={p.key} label={p.label} error={missing.has(p.key) && !values[p.key] ? 'Required before signing' : undefined}>
                <Input
                  value={values[p.key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [p.key]: e.target.value }))}
                  className={cn(missing.has(p.key) && !values[p.key] && 'border-amber-300 bg-amber-50/40')}
                />
              </Field>
            ))}
          </fieldset>
        ))}
      </div>
      <FormError message={save.errorText} />
      <div className="sticky bottom-16 -mx-4 mt-4 bg-gradient-to-t from-white from-70% to-white/0 px-4 pt-4 pb-1 sm:-mx-5 sm:px-5 lg:bottom-0">
        <Button icon={Save} block disabled={!changed.length} loading={save.isPending} onClick={() => save.mutate(undefined)}>
          Save details{changed.length ? ` (${changed.length})` : ''}
        </Button>
      </div>
    </Card>
  )
}

function WordingCard({ doc, queryKey }: { doc: AgreementDocumentOut; queryKey: unknown[] }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(doc.title)
  const [body, setBody] = useState(doc.body)
  useEffect(() => {
    setTitle(doc.title)
    setBody(doc.body)
  }, [doc.title, doc.body])
  const save = useApiMutation(() => api.patch<AgreementDocumentOut>(`/agreement-documents/${doc.id}`, { title, body }), {
    success: 'Wording updated for this document',
    invalidate: [queryKey],
    onSuccess: () => setOpen(false),
  })
  return (
    <Card>
      <CardHeader
        title="Wording"
        description="Change the text of this document only. To change it for every new document, edit the template."
        className="mb-3"
      />
      {open ? (
        <div className="space-y-3">
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Text" hint="Blank line = new paragraph · **bold** · - bullet · 1. numbered · {{placeholder}}">
            <Textarea rows={14} value={body} onChange={(e) => setBody(e.target.value)} className="font-mono text-xs leading-relaxed" />
          </Field>
          <FormError message={save.errorText} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button icon={Save} loading={save.isPending} onClick={() => save.mutate(undefined)} disabled={title === doc.title && body === doc.body}>
              Save wording
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" icon={FilePenLine} block onClick={() => setOpen(true)}>
          Edit wording
        </Button>
      )}
    </Card>
  )
}

function VerificationCard({ doc }: { doc: AgreementDocumentOut }) {
  const v = doc.verification as { content_intact?: boolean | null; tenant_signature_valid?: boolean | null; landlord_signature_valid?: boolean | null }
  const ok = v.content_intact !== false && v.tenant_signature_valid !== false && v.landlord_signature_valid !== false
  const Icon = ok ? ShieldCheck : ShieldAlert
  return (
    <Card className={ok ? '' : 'border-red-300'}>
      <div className="flex items-start gap-3">
        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{ok ? 'Digitally sealed and intact' : 'Integrity check failed'}</p>
          <p className="text-xs text-slate-500">
            {ok
              ? 'The text and signatures match the fingerprint recorded when it was signed.'
              : 'The stored document no longer matches its recorded fingerprint. Do not rely on it.'}
          </p>
          {doc.verification_code ? (
            <p className="mt-2 text-xs text-slate-600">
              Verification code <span className="font-mono font-semibold">{groupCode(doc.verification_code)}</span>
            </p>
          ) : null}
          {doc.frozen_at ? <p className="text-xs text-slate-500">Locked {formatDateTime(doc.frozen_at)}</p> : null}
        </div>
      </div>
    </Card>
  )
}

function SignDialog({ doc, party, onClose, queryKey }: { doc: AgreementDocumentOut; party: Party | null; onClose: () => void; queryKey: unknown[] }) {
  const pad = useRef<SignaturePadHandle>(null)
  const [name, setName] = useState('')
  const [agree, setAgree] = useState(false)
  const [empty, setEmpty] = useState(true)
  useEffect(() => {
    if (party) {
      setName((party === 'tenant' ? doc.fields.tenant_name : doc.fields.landlord_name) || '')
      setAgree(false)
      setEmpty(true)
    }
  }, [party, doc.fields.tenant_name, doc.fields.landlord_name])
  const sign = useApiMutation(
    () => api.post<AgreementDocumentOut>(`/agreement-documents/${doc.id}/sign`, { party, name, signature: pad.current?.toDataURL() }),
    {
      success: (r) => (r.status === 'signed' ? 'Signed by both parties — the agreement is sealed' : 'Signature recorded'),
      invalidate: [queryKey, ['agreement-documents']],
      onSuccess: onClose,
    },
  )
  if (!party) return null
  const who = party === 'tenant' ? 'Tenant (ukodesha)' : "Landlord (nyir'inzu)"
  return (
    <Dialog
      open
      onClose={onClose}
      title={`${who} signature`}
      description={
        doc.status === 'draft'
          ? 'Signing locks the document: its text and details can no longer be changed.'
          : 'The document text is locked. This adds the second signature.'
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} block className="sm:w-auto">Cancel</Button>
          <Button icon={PenLine} disabled={empty || !agree || name.trim().length < 2} loading={sign.isPending} onClick={() => sign.mutate(undefined)} block className="sm:w-auto">
            Sign document
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Full name (Amazina)" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </Field>
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Signature (Umukono)</p>
          <SignaturePad ref={pad} onChange={setEmpty} label={`${who} signature pad`} />
        </div>
        <Checkbox
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          label={party === 'tenant' ? 'The tenant has read this agreement and accepts its terms.' : 'I am authorised to sign for the landlord and accept these terms.'}
        />
        <FormError message={sign.errorText} />
      </div>
    </Dialog>
  )
}

function VoidDialog({ doc, open, onClose, queryKey }: { doc: AgreementDocumentOut; open: boolean; onClose: () => void; queryKey: unknown[] }) {
  const [reason, setReason] = useState('')
  const voidDoc = useApiMutation(() => api.post<AgreementDocumentOut>(`/agreement-documents/${doc.id}/void`, { reason }), {
    success: 'Document voided — it stays on record',
    invalidate: [queryKey, ['agreement-documents']],
    onSuccess: onClose,
  })
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Void ${doc.document_number}?`}
      description="Voided documents are kept for the record and marked VOID when printed. Draw up a new document to replace it."
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} block className="sm:w-auto">Cancel</Button>
          <Button variant="danger" icon={Ban} disabled={reason.trim().length < 3} loading={voidDoc.isPending} onClick={() => voidDoc.mutate(undefined)} block className="sm:w-auto">
            Void document
          </Button>
        </>
      }
    >
      <Field label="Reason" required>
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <FormError message={voidDoc.errorText} />
    </Dialog>
  )
}
