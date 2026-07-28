import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Globe } from 'lucide-react'
import { LOCALES, useI18n } from '@/lib/i18n'
import { EASE } from '@/lib/motion'
import { cn } from '@/lib/utils'

export function LanguageSwitcher({
  className,
  tone = 'dark',
}: {
  className?: string
  tone?: 'dark' | 'light'
}) {
  const { locale, setLocale, t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const active = LOCALES.find((l) => l.code === locale) ?? LOCALES[0]

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('common.language')}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-full border pr-2 pl-3 text-[0.8125rem] font-semibold transition-colors duration-300',
          tone === 'dark'
            ? 'border-line text-ink-soft hover:border-line-strong hover:text-ink'
            : 'border-white/20 text-white/80 hover:border-white/40 hover:text-white',
        )}
      >
        <Globe className="size-4" strokeWidth={2.1} />
        {active.short}
        <ChevronDown
          className={cn('size-3.5 transition-transform duration-300', open && 'rotate-180')}
          strokeWidth={2.4}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label={t('common.language')}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-lift"
          >
            {LOCALES.map((option) => {
              const selected = option.code === locale
              return (
                <li key={option.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      setLocale(option.code)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[0.875rem] transition-colors',
                      selected
                        ? 'bg-accent-soft font-semibold text-ink'
                        : 'text-ink-soft hover:bg-canvas-alt',
                    )}
                  >
                    <span aria-hidden className="text-base leading-none">
                      {option.flag}
                    </span>
                    {option.label}
                    {selected && (
                      <Check className="ml-auto size-3.5 text-gold-600" strokeWidth={3} />
                    )}
                  </button>
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
