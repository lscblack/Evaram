import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from './cn'
import { Button } from './Button'
import { Field, FormError, Textarea } from './Form'

/**
 * Accessible modal. On phones it is a bottom sheet that fits the screen
 * (scrolls internally, actions stay reachable); on larger screens a centred dialog.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => {
      const first = panel.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])')
      ;(first ?? panel.current)?.focus()
    }, 20)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      prev?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null
  const width = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }[size]
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-xl outline-none sm:max-h-[88vh] sm:rounded-xl',
          width,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-slate-900">
              {title}
            </h2>
            {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
          </div>
          <button
            type="button"
            data-close
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer ? (
          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

/** Confirmation with an optional required reason (rejections, reversals, voids). */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  tone = 'primary',
  reason,
  loading,
  error,
  children,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  title: ReactNode
  description?: ReactNode
  confirmLabel?: string
  tone?: 'primary' | 'danger' | 'success'
  reason?: { label: string; placeholder?: string; required?: boolean }
  loading?: boolean
  error?: string | null
  children?: ReactNode
}) {
  const [text, setText] = useState('')
  useEffect(() => {
    if (open) setText('')
  }, [open])
  const missing = !!reason?.required && text.trim().length < 3
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} block className="sm:w-auto">
            Cancel
          </Button>
          <Button
            variant={tone}
            loading={loading}
            disabled={missing}
            onClick={() => onConfirm(text.trim())}
            block
            className="sm:w-auto"
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {description ? <p className="text-sm text-slate-600">{description}</p> : null}
        {children}
        {reason ? (
          <Field label={reason.label} required={reason.required} hint={reason.required ? 'At least 3 characters.' : undefined}>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={reason.placeholder} rows={3} />
          </Field>
        ) : null}
        <FormError message={error} />
      </div>
    </Dialog>
  )
}
