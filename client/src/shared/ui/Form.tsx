import {
  createContext,
  forwardRef,
  useContext,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from './cn'

/**
 * Field → control wiring: the nearest Field provides an id (and description
 * id) that the shared Input/Select/Textarea adopt when they have no id of
 * their own — wherever they sit inside the field (e.g. next to a button).
 */
const FieldContext = createContext<{ id: string; describedBy?: string; required?: boolean } | null>(null)

function useFieldProps(id?: string, describedBy?: string) {
  const ctx = useContext(FieldContext)
  return {
    id: id ?? ctx?.id,
    'aria-describedby': describedBy ?? ctx?.describedBy,
    ...(ctx?.required ? { 'aria-required': true } : {}),
  }
}

// 16px text on mobile prevents iOS from zooming into focused inputs.
const control =
  'block w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/15 disabled:bg-slate-50 disabled:text-slate-500 aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:ring-red-500/15'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, id, ...rest },
  ref,
) {
  const f = useFieldProps(id, rest['aria-describedby'])
  return <input ref={ref} className={cn(control, 'h-11 sm:h-10', className)} {...rest} {...f} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, rows = 3, id, ...rest },
  ref,
) {
  const f = useFieldProps(id, rest['aria-describedby'])
  return <textarea ref={ref} rows={rows} className={cn(control, 'py-2.5', className)} {...rest} {...f} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, id, ...rest },
  ref,
) {
  const f = useFieldProps(id, rest['aria-describedby'])
  return (
    <div className="relative">
      <select ref={ref} className={cn(control, 'h-11 sm:h-10 appearance-none pr-9', className)} {...rest} {...f}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
    </div>
  )
})

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; hint?: ReactNode }>(
  function Checkbox({ label, hint, className, id, ...rest }, ref) {
    const auto = useId()
    const cid = id ?? auto
    return (
      <label htmlFor={cid} className={cn('flex cursor-pointer items-start gap-3 py-1', className)}>
        <input
          ref={ref}
          id={cid}
          type="checkbox"
          className="mt-0.5 size-5 shrink-0 rounded border-slate-300 text-brand-900 accent-brand-900"
          {...rest}
        />
        <span className="text-sm">
          <span className="font-medium text-slate-800">{label}</span>
          {hint ? <span className="block text-slate-500">{hint}</span> : null}
        </span>
      </label>
    )
  },
)

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
  htmlFor,
}: {
  label: ReactNode
  hint?: ReactNode
  error?: string
  required?: boolean
  children: ReactNode
  className?: string
  htmlFor?: string
}) {
  const auto = useId()
  const target = htmlFor ?? auto
  const messageId = `${target}-msg`
  const ctx = { id: target, describedBy: error || hint ? messageId : undefined, required }
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={target} className="block text-sm font-medium text-slate-700">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-red-600">
            *
          </span>
        ) : null}
      </label>
      <FieldContext.Provider value={ctx}>{children}</FieldContext.Provider>
      {error ? (
        <p id={messageId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-sm text-slate-500">{hint}</p>
      ) : null}
    </div>
  )
}

export function FormGrid({ children, cols = 2, className }: { children: ReactNode; cols?: 1 | 2 | 3; className?: string }) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4',
        cols === 2 && 'sm:grid-cols-2',
        cols === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
      {message}
    </div>
  )
}
