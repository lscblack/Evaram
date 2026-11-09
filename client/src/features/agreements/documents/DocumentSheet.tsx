import type { AgreementDocumentOut, DocumentSignature } from '@/shared/api/types'
import { cn } from '@/shared/ui/cn'
import { formatDateTime } from '@/shared/lib/format'

/**
 * The contract as printed: server-rendered HTML (escaped, minimal markup) plus
 * the signature block and the verification footer. Identical on screen and paper.
 */
export function DocumentSheet({ doc, className }: { doc: AgreementDocumentOut; className?: string }) {
  const final = doc.status !== 'draft'
  return (
    <article
      className={cn(
        'doc-page mx-auto w-full min-w-0 max-w-[210mm] rounded-xl border border-slate-200 bg-white px-5 py-7 shadow-sm sm:px-12 sm:py-12',
        className,
      )}
    >
      <p className="doc-running-title mb-6 text-[10px] uppercase tracking-[0.18em] text-slate-400">{doc.title}</p>
      {doc.status === 'void' ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          VOID — {doc.void_reason}
        </p>
      ) : null}
      {/* Server-rendered and escaped; see evaramu/modules/agreements/documents.py::render_html */}
      <div className={cn('doc-sheet', final && 'is-final')} dangerouslySetInnerHTML={{ __html: doc.html }} />

      {/* Same layout as the paper agreement: a header row, then names, then signatures. */}
      <table className="doc-signatures mt-8 w-full table-fixed border-collapse text-sm [overflow-wrap:anywhere]">
        <thead>
          <tr className="bg-stone-100 text-left text-xs uppercase tracking-wide text-slate-600">
            <th className="w-1/2 border border-stone-200 px-3 py-2 font-medium">Ukodesha</th>
            <th className="w-1/2 border border-stone-200 px-3 py-2 font-medium">Nyir&rsquo;inzu</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <NameCell sig={doc.tenant_signature} fallbackName={doc.fields.tenant_name} />
            <NameCell sig={doc.landlord_signature} fallbackName={doc.fields.landlord_name} />
          </tr>
          <tr>
            <SignatureCell sig={doc.tenant_signature} />
            <SignatureCell sig={doc.landlord_signature} />
          </tr>
        </tbody>
      </table>

      <footer className="mt-8 border-t border-slate-200 pt-3 text-[10px] leading-relaxed text-slate-500 [overflow-wrap:anywhere]">
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
          <span>
            {doc.document_number} · {doc.agreement_number} · {doc.unit_code}
          </span>
          {doc.verification_code ? (
            <span>
              Verification code <span className="font-mono font-semibold text-slate-700">{groupCode(doc.verification_code)}</span>
            </span>
          ) : (
            <span>Draft — not signed</span>
          )}
        </div>
        {doc.content_hash ? (
          <p className="mt-1 break-all font-mono">
            SHA-256 {doc.content_hash} · verify at {window.location.origin}/verify?number={doc.document_number}
          </p>
        ) : null}
      </footer>
    </article>
  )
}

const DOTS = '……………………………………'

function NameCell({ sig, fallbackName }: { sig: DocumentSignature | null | undefined; fallbackName?: string }) {
  return (
    <td className="border border-stone-200 px-3 py-2 align-top">
      Amazina: <span className="font-medium">{sig?.name || fallbackName || DOTS}</span>
    </td>
  )
}

function SignatureCell({ sig }: { sig: DocumentSignature | null | undefined }) {
  return (
    <td className="border border-stone-200 px-3 py-2 align-top">
      <div className="flex flex-wrap items-end gap-x-2">
        <span>Umukono:</span>
        {sig ? (
          <img src={sig.image} alt={`Signature of ${sig.name}`} className="h-14 max-w-[70%] object-contain" />
        ) : (
          <span className="text-slate-400">{DOTS}</span>
        )}
      </div>
      {sig ? <p className="mt-1 text-[10px] text-slate-500">Signed digitally {formatDateTime(sig.signed_at)}</p> : null}
    </td>
  )
}

export function groupCode(code: string) {
  return code.replace(/(.{4})/g, '$1 ').trim()
}
