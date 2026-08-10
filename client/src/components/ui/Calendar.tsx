import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, toDateKey } from '@/lib/utils'
import { EASE } from '@/lib/motion'
import { useT } from '@/lib/i18n'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export type DayState = 'available' | 'full' | 'closed' | 'past' | 'unavailable'

export interface CalendarProps {
  /** Currently selected date, or null. */
  value: Date | null
  onChange: (date: Date) => void
  /** Classifies each date. Anything other than `available` is not selectable. */
  getDayState: (date: Date) => DayState
  /** How many months ahead the user may browse. */
  monthsAhead?: number
}

/**
 * Month-grid date picker, Monday-first, with per-day availability states.
 * Deliberately dependency-free so the booking flow stays light.
 */
export function Calendar({ value, onChange, getDayState, monthsAhead = 3 }: CalendarProps) {
  const t = useT()
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [direction, setDirection] = useState(1)

  const minMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const maxMonth = new Date(today.getFullYear(), today.getMonth() + monthsAhead, 1)

  const canGoBack = cursor > minMonth
  const canGoForward = cursor < maxMonth

  const shiftMonth = (delta: number) => {
    setDirection(delta)
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1))
  }

  /** Days of the visible month, padded so the grid starts on a Monday. */
  const cells = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const firstOfMonth = new Date(year, month, 1)
    // JS: 0 = Sunday. Shift so Monday = 0.
    const leadingBlanks = (firstOfMonth.getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const out: (Date | null)[] = Array.from({ length: leadingBlanks }, () => null)
    for (let day = 1; day <= daysInMonth; day++) out.push(new Date(year, month, day))
    return out
  }, [cursor])

  return (
    <div>
      {/* header */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          disabled={!canGoBack}
          aria-label={t('ui.previousMonth')}
          className="grid size-10 place-items-center rounded-full border border-line text-ink-soft transition-colors hover:border-ink-muted disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="size-[1.15rem]" strokeWidth={2.4} />
        </button>

        <div className="overflow-hidden text-center">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.p
              key={`${cursor.getFullYear()}-${cursor.getMonth()}`}
              custom={direction}
              initial={{ opacity: 0, y: direction * 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: direction * -12 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="font-display text-lg font-semibold text-ink"
            >
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </motion.p>
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={() => shiftMonth(1)}
          disabled={!canGoForward}
          aria-label={t('ui.nextMonth')}
          className="grid size-10 place-items-center rounded-full border border-line text-ink-soft transition-colors hover:border-ink-muted disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="size-[1.15rem]" strokeWidth={2.4} />
        </button>
      </div>

      {/* weekday row */}
      <div className="mt-7 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="pb-2 text-center text-[0.6875rem] font-bold tracking-wide text-ink-muted uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      {/* day grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} aria-hidden />

          const state = getDayState(date)
          const selectable = state === 'available'
          const isSelected = Boolean(value && toDateKey(value) === toDateKey(date))
          const isToday = toDateKey(date) === toDateKey(today)

          return (
            <button
              key={toDateKey(date)}
              type="button"
              disabled={!selectable}
              onClick={() => onChange(date)}
              aria-label={date.toDateString()}
              aria-pressed={isSelected}
              title={
                state === 'full'
                  ? 'Fully booked'
                  : state === 'closed'
                    ? 'Office closed'
                    : state === 'unavailable'
                      ? 'Not offered on this day'
                      : undefined
              }
              className={cn(
                'relative grid aspect-square place-items-center rounded-xl text-[0.9375rem] font-medium transition-all duration-200',
                isSelected && 'bg-ink font-bold text-canvas shadow-soft',
                !isSelected && selectable && 'text-ink hover:bg-gold-100 hover:text-gold-800',
                state === 'full' && 'text-ink-faint line-through',
                state === 'closed' && 'text-red-300',
                (state === 'past' || state === 'unavailable') && 'text-ink-faint',
                !selectable && 'cursor-not-allowed',
              )}
            >
              {date.getDate()}
              {/* One dot only — "today" takes precedence over "available". */}
              {!isSelected && (isToday || selectable) && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute bottom-1.5 size-1 rounded-full',
                    isToday ? 'bg-gold-500' : 'bg-emerald-400',
                  )}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* legend */}
      <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-5 text-[0.75rem] text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-gold-500" />
          Today
        </span>
        <span className="flex items-center gap-1.5 line-through decoration-navy-300">
          Fully booked
        </span>
        <span className="flex items-center gap-1.5 text-red-300">Office closed</span>
      </div>
    </div>
  )
}
