import { useEffect, useState } from 'react'
import { Check, Copy, Download, ExternalLink, FileText, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { API_ORIGIN, api, downloadFile, errorMessage, request } from '@/shared/api/client'
import type { InvoiceShareOut } from '@/shared/api/types'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'
import { Field, FormError, Textarea } from '@/shared/ui/Form'
import { Spinner } from '@/shared/ui/Spinner'

/** Where an invoice PDF comes from: one invoice, everything one payment paid, or invoices picked from the list. */
export type InvoiceSource = { kind: 'invoice' | 'payment'; id: number } | { kind: 'combined'; ids: number[] }

function fetchPdf(s: InvoiceSource): Promise<Blob> {
  if (s.kind === 'combined') return request<Blob>('/invoices/combined-pdf', { query: { ids: s.ids.join(',') } })
  return request<Blob>(s.kind === 'invoice' ? `/invoices/${s.id}/pdf` : `/payments/${s.id}/invoice-pdf`)
}

function createShare(s: InvoiceSource): Promise<InvoiceShareOut> {
  if (s.kind === 'combined') return api.post<InvoiceShareOut>('/invoices/combined-share', { invoice_ids: s.ids })
  return api.post<InvoiceShareOut>(s.kind === 'invoice' ? `/invoices/${s.id}/share` : `/payments/${s.id}/share`)
}

const sourceKey = (s: InvoiceSource) => (s.kind === 'combined' ? `c:${s.ids.join(',')}` : `${s.kind}:${s.id}`)

/** Download the invoice as a branded PDF. */
export function InvoicePdfButton({ id, number, size, variant = 'outline', label = 'Download PDF', source, disabled }: {
  disabled?: boolean
  id: number
  number: string
  size?: 'sm' | 'md'
  variant?: 'outline' | 'ghost' | 'primary'
  label?: string
  source?: InvoiceSource
}) {
  const src = source ?? { kind: 'invoice', id }
  const [busy, setBusy] = useState(false)
  return (
    <Button
      variant={variant}
      size={size}
      icon={Download}
      loading={busy}
      disabled={disabled}
      onClick={async () => {
        setBusy(true)
        try {
          if (src.kind === 'combined') await downloadFile('/invoices/combined-pdf', { ids: src.ids.join(',') }, `invoice-${number}.pdf`)
          else await downloadFile(src.kind === 'invoice' ? `/invoices/${src.id}/pdf` : `/payments/${src.id}/invoice-pdf`, undefined, `invoice-${number}.pdf`)
        } catch (e) {
          toast.error(errorMessage(e))
        } finally {
          setBusy(false)
        }
      }}
    >
      {label}
    </Button>
  )
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.4 5 5.2-1.4A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.1.82.83-3-.2-.31a8.2 8.2 0 1 1 6.97 3.82Zm4.5-6.14c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.55.12-.17.25-.64.8-.78.97-.14.16-.29.18-.53.06a6.7 6.7 0 0 1-3.32-2.9c-.25-.43.25-.4.72-1.33.08-.16.04-.3-.02-.42l-.75-1.8c-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.3 2.7 2.7 0 0 0-.85 2.02 4.7 4.7 0 0 0 1 2.5 10.8 10.8 0 0 0 4.13 3.65c1.54.66 2.14.72 2.91.6.47-.07 1.46-.6 1.66-1.17.2-.58.2-1.07.14-1.17-.06-.1-.22-.16-.47-.28Z" />
    </svg>
  )
}

/**
 * "Send on WhatsApp": a message with a 30-day link to the PDF, opened in
 * WhatsApp for the tenant's number. On phones that can share files, the PDF
 * itself can be shared instead.
 */
export function WhatsAppInvoiceButton({ id, size, label = 'Send on WhatsApp', source, disabled }: {
  id: number
  disabled?: boolean
  size?: 'sm' | 'md'
  label?: string
  source?: InvoiceSource
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        variant="outline"
        size={size}
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
      >
        <WhatsAppIcon className="size-4" /> {label}
      </Button>
      {open ? <WhatsAppDialog source={source ?? { kind: 'invoice', id }} onClose={() => setOpen(false)} /> : null}
    </>
  )
}

function WhatsAppDialog({ source, onClose }: { source: InvoiceSource; onClose: () => void }) {
  const [share, setShare] = useState<InvoiceShareOut | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [copied, setCopied] = useState(false)
  const link = share ? `${API_ORIGIN}${share.path}` : ''

  useEffect(() => {
    let alive = true
    createShare(source)
      .then(async (s) => {
        if (!alive) return
        setShare(s)
        setText(`${s.message}\n\nDownload the invoice (PDF): ${API_ORIGIN}${s.path}`)
        // Phones that can share files get the PDF itself, prepared now so the tap is instant.
        if (typeof navigator.canShare === 'function') {
          const blob = await fetchPdf(source)
          const f = new File([blob], s.filename, { type: 'application/pdf' })
          if (alive && navigator.canShare({ files: [f] })) setFile(f)
        }
      })
      .catch((e) => alive && setError(errorMessage(e)))
    return () => {
      alive = false
    }
  }, [sourceKey(source)]) // eslint-disable-line react-hooks/exhaustive-deps

  const waUrl = share ? `https://wa.me/${share.whatsapp_number}?text=${encodeURIComponent(text)}` : '#'

  return (
    <Dialog
      open
      onClose={onClose}
      title="Send invoice on WhatsApp"
      description={share ? `To ${share.whatsapp_number ? `+${share.whatsapp_number}` : 'the tenant'} · the link works for 30 days, no sign-in needed.` : 'Preparing the invoice…'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {file ? (
            <Button
              variant="outline"
              icon={Share2}
              onClick={() => navigator.share({ files: [file], text: share?.message }).catch(() => undefined)}
            >
              Share the PDF file
            </Button>
          ) : null}
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer noopener"
            aria-disabled={!share}
            onClick={(e) => (!share ? e.preventDefault() : undefined)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 aria-disabled:opacity-50"
          >
            <WhatsAppIcon className="size-4" /> Open WhatsApp <ExternalLink className="size-3.5 opacity-70" />
          </a>
        </>
      }
    >
      <FormError message={error} />
      {!share && !error ? (
        <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
          <Spinner /> Preparing the invoice link…
        </div>
      ) : null}
      {share ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-red-600 ring-1 ring-slate-200">
              <FileText className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{share.filename}</p>
              <p className="truncate text-xs text-slate-500">{link}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              icon={copied ? Check : Copy}
              onClick={() => navigator.clipboard?.writeText(link).then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              })}
            >
              {copied ? 'Copied' : 'Copy link'}
            </Button>
          </div>
          <Field label="Message" hint="You can edit it before sending.">
            <Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
        </div>
      ) : null}
    </Dialog>
  )
}
