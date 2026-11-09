import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { Printer, X } from 'lucide-react'
import { api } from '@/shared/api/client'
import type { AgreementDocumentOut } from '@/shared/api/types'
import { Button } from '@/shared/ui/Button'
import { ErrorState } from '@/shared/ui/EmptyState'
import { FullPageSpinner } from '@/shared/ui/Spinner'
import { DocumentSheet } from './DocumentSheet'

/** Bare A4 page for printing or "Save as PDF". Opens the print dialog once loaded. */
export default function PrintDocumentPage() {
  const { docId } = useParams()
  const q = useQuery({ queryKey: ['agreement-document', docId], queryFn: () => api.get<AgreementDocumentOut>(`/agreement-documents/${docId}`) })
  const printed = useRef(false)

  useEffect(() => {
    if (!q.data) return
    document.title = `${q.data.document_number} — ${q.data.title}`
    if (printed.current) return
    printed.current = true
    // Let images (signatures) decode before the print dialog snapshots the page.
    const t = setTimeout(() => window.print(), 600)
    return () => clearTimeout(t)
  }, [q.data])

  if (q.isLoading) return <FullPageSpinner />
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={q.refetch} />

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
      <div className="print-hide mx-auto mb-4 flex w-11/12 max-w-[210mm] items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {q.data.status === 'draft' ? 'Draft — not yet signed.' : 'Use “Save as PDF” in the print dialog to keep a copy.'}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" icon={X} onClick={() => window.close()}>
            Close
          </Button>
          <Button icon={Printer} onClick={() => window.print()}>
            Print
          </Button>
        </div>
      </div>
      {/* Running title and "Page 1 of 2" on every printed page, as on the paper agreement. */}
      <style>{`@media print { @page {
        @top-left { content: ${JSON.stringify(q.data.title.toUpperCase())}; font: 7pt sans-serif; color: #94a3b8; letter-spacing: .08em; }
        @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 7pt sans-serif; color: #94a3b8; }
      } }`}</style>
      <div className="mx-auto w-11/12 max-w-[210mm] print:w-auto">
        <DocumentSheet doc={q.data} />
      </div>
    </div>
  )
}
