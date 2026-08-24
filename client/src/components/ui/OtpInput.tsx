import { useEffect, useMemo, useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * Segmented one-time-code entry.
 *
 * Codes here are alphanumeric, not digits, so this deliberately does not use
 * `inputMode="numeric"` — that would give phone users a keypad they cannot type
 * a letter on. `one-time-code` still lets iOS and Android offer the SMS/email
 * autofill, and pasting the whole code into any box fills the row.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  autoFocus = false,
  invalid = false,
  onComplete,
  label = 'One-time code',
}: {
  value: string
  onChange: (next: string) => void
  length?: number
  disabled?: boolean
  autoFocus?: boolean
  invalid?: boolean
  onComplete?: (code: string) => void
  label?: string
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const chars = useMemo(
    () => Array.from({ length }, (_, i) => value[i] ?? ''),
    [value, length],
  )

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus()
  }, [autoFocus])

  /** Codes are stored uppercase; the server normalises the same way. */
  const clean = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, '')

  const commit = (next: string) => {
    const trimmed = next.slice(0, length)
    onChange(trimmed)
    if (trimmed.length === length) onComplete?.(trimmed)
  }

  const setAt = (index: number, char: string) => {
    const next = chars.slice()
    next[index] = char
    commit(next.join('').replace(/\s/g, ''))
  }

  const focusAt = (index: number) => {
    const target = refs.current[Math.max(0, Math.min(length - 1, index))]
    target?.focus()
    target?.select()
  }

  const handleChange = (index: number, raw: string) => {
    const typed = clean(raw)
    if (!typed) {
      setAt(index, '')
      return
    }
    // More than one character means a paste or a fast autofill — spread it.
    if (typed.length > 1) {
      const merged = (value.slice(0, index) + typed).slice(0, length)
      commit(merged)
      focusAt(merged.length)
      return
    }
    setAt(index, typed)
    if (index < length - 1) focusAt(index + 1)
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (chars[index]) {
        setAt(index, '')
      } else if (index > 0) {
        // Empty box: clear the one before and step back, which is what people
        // expect when correcting a code.
        setAt(index - 1, '')
        focusAt(index - 1)
      }
      return
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      focusAt(index - 1)
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      focusAt(index + 1)
    }
  }

  return (
    <div>
      <span className="sr-only" id="otp-label">
        {label}
      </span>
      <div
        role="group"
        aria-labelledby="otp-label"
        className="flex justify-between gap-2 sm:gap-2.5"
      >
        {chars.map((char, index) => (
          <input
            key={index}
            ref={(el) => {
              refs.current[index] = el
            }}
            value={char}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onFocus={(e) => e.currentTarget.select()}
            disabled={disabled}
            inputMode="text"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            maxLength={length}
            aria-label={`${label}, character ${index + 1} of ${length}`}
            className={cn(
              'h-13 min-w-0 flex-1 rounded-xl border text-center font-mono text-[1.25rem] font-semibold uppercase',
              'text-ink transition-all duration-200 outline-none',
              'focus:border-gold-500 focus:ring-2 focus:ring-gold-500/25',
              'disabled:opacity-50',
              invalid
                ? 'border-red-300 bg-red-50'
                : char
                  ? 'border-line-strong bg-surface'
                  : 'border-line bg-canvas-alt',
            )}
          />
        ))}
      </div>
    </div>
  )
}
