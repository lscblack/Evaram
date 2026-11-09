import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react'
import { api, errorMessage } from '@/shared/api/client'
import type { PublicVerifyOut } from '@/shared/api/types'
import { formatDateTime } from '@/shared/lib/format'
import { statusLabel } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Field, FormError, Input } from '@/shared/ui/Form'

/** Anyone holding a printed agreement can check it is genuine and unaltered. */
export default function VerifyDocumentPage() {
  const [params] = useSearchParams()
  const [number, setNumber] = useState(params.get('number') ?? '')
  const [code, setCode] = useState(params.get('code') ?? '')
  const [result, setResult] = useState<PublicVerifyOut | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const check = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      setResult(await api.publicGet<PublicVerifyOut>('/public/documents/verify', { number, code }))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto w-11/12 max-w-xl py-12 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-700">Document check</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Verify a rental agreement</h1>
      <p className="mt-2 text-slate-600">
        Enter the document number and the verification code printed at the bottom of the agreement.
      </p>
      <form onSubmit={check} className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <Field label="Document number" required>
          <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="DOC-202611-0001" autoComplete="off" />
        </Field>
        <Field label="Verification code" required>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="1A2B 3C4D 5E6F 7A8B" autoComplete="off" className="font-mono" />
        </Field>
        <FormError message={error} />
        <Button type="submit" block loading={loading} disabled={number.trim().length < 4 || code.trim().length < 8}>
          Verify
        </Button>
      </form>

      {result ? (
        <div className="mt-6 animate-stat-in">
          {!result.found ? (
            <Outcome icon={ShieldQuestion} tone="slate" title="No matching document" text="Check the number and code. Both must match exactly." />
          ) : result.valid ? (
            <Outcome icon={ShieldCheck} tone="emerald" title="Genuine and unaltered" text={`${result.document_number} · unit ${result.unit_code} · ${statusLabel(result.status ?? '')}`}>
              <ul className="mt-2 space-y-0.5 text-sm text-emerald-900/80">
                {result.tenant_signed_at ? <li>Tenant signed {formatDateTime(result.tenant_signed_at)}</li> : null}
                {result.landlord_signed_at ? <li>Landlord signed {formatDateTime(result.landlord_signed_at)}</li> : null}
              </ul>
            </Outcome>
          ) : (
            <Outcome
              icon={ShieldAlert}
              tone="red"
              title={result.status === 'void' ? 'This document was voided' : 'Do not rely on this document'}
              text={result.status === 'void' ? 'It has been withdrawn by the landlord.' : 'The record no longer matches what was signed.'}
            />
          )}
        </div>
      ) : null}
    </section>
  )
}

function Outcome({
  icon: Icon,
  tone,
  title,
  text,
  children,
}: {
  icon: typeof ShieldCheck
  tone: 'emerald' | 'red' | 'slate'
  title: string
  text: string
  children?: React.ReactNode
}) {
  const cls = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    red: 'border-red-200 bg-red-50 text-red-900',
    slate: 'border-slate-200 bg-slate-50 text-slate-800',
  }[tone]
  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-5 ${cls}`} role="status">
      <Icon className="mt-0.5 size-6 shrink-0" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm opacity-80">{text}</p>
        {children}
      </div>
    </div>
  )
}
