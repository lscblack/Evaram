import { forwardRef, useLayoutEffect, useRef, useState } from 'react'
import { amountInWords, caretAfterDigits, groupAmount, sanitiseAmount } from '@/lib/money'
import { cn } from '@/lib/utils'

type NativeProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'inputMode'
>

export interface MoneyInputProps extends NativeProps {
  /** The unformatted amount. Digits only — this is what the API receives. */
  value: string | number | null | undefined
  /** Called with the unformatted amount, never the grouped display text. */
  onChange: (value: string) => void
  /** Shown as a suffix inside the field, e.g. `RWF`. */
  currency?: string
  /** Allow a fractional part. Off by default — RWF is quoted whole. */
  decimal?: boolean
  /** Show the `1.5 million` readout under the field. On by default. */
  readout?: boolean
  className?: string
  /** Wrapper class, for grid spans and the like. */
  wrapClassName?: string
}

/**
 * A money field that groups thousands while you type.
 *
 * Deliberately `type="text"`: a number input rejects the separators outright,
 * so grouping and `type="number"` cannot coexist. Keyboard behaviour is kept
 * with `inputMode="numeric"`, and non-numeric keystrokes are dropped on the
 * way in rather than being silently accepted and failing at submit.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  {
    value,
    onChange,
    currency,
    decimal = false,
    readout = true,
    className,
    wrapClassName,
    readOnly,
    disabled,
    ...rest
  },
  forwardedRef,
) {
  const innerRef = useRef<HTMLInputElement | null>(null)
  const [caret, setCaret] = useState<number | null>(null)

  const raw = value === null || value === undefined ? '' : String(value)
  const display = groupAmount(sanitiseAmount(raw, decimal))

  // Restoring the caret has to happen after React has written the reformatted
  // value to the DOM, or the browser puts it back at the end of the field.
  useLayoutEffect(() => {
    if (caret === null) return
    innerRef.current?.setSelectionRange(caret, caret)
    setCaret(null)
  }, [caret, display])

  const handle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const el = event.target
    const typed = el.value
    const cursor = el.selectionStart ?? typed.length
    const digitsBefore = sanitiseAmount(typed.slice(0, cursor), decimal).length

    const next = sanitiseAmount(typed, decimal)
    onChange(next)
    setCaret(caretAfterDigits(groupAmount(next), digitsBefore))
  }

  const numeric = Number(raw)
  const words = readout && raw && Number.isFinite(numeric) ? amountInWords(numeric) : ''

  return (
    <div className={wrapClassName}>
      <div className="relative">
        <input
          {...rest}
          ref={(node) => {
            innerRef.current = node
            if (typeof forwardedRef === 'function') forwardedRef(node)
            else if (forwardedRef) forwardedRef.current = node
          }}
          type="text"
          inputMode={decimal ? 'decimal' : 'numeric'}
          autoComplete="off"
          value={display}
          readOnly={readOnly}
          disabled={disabled}
          onChange={handle}
          className={cn('tabular-nums', currency && 'pr-14', className)}
        />
        {currency && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[0.75rem] font-bold tracking-wide text-ink-faint uppercase"
          >
            {currency}
          </span>
        )}
      </div>
      {words && (
        <p className="mt-1.5 text-[0.75rem] text-ink-muted">
          {words}
          {currency ? ` ${currency}` : ''}
        </p>
      )}
    </div>
  )
})
