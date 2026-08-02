import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, CalendarCheck, MessageCircle, Plus, X } from 'lucide-react'
import { EASE } from '@/lib/motion'
import { useSite } from '@/lib/siteConfig'

const actionsFor = (site: { whatsappHref: string }) => [
  {
    label: 'Chat on WhatsApp',
    href: site.whatsappHref,
    icon: MessageCircle,
    className: 'bg-[#25D366] hover:bg-[#1da851]',
  },
  {
    label: 'Book a consultation',
    to: '/consultation',
    icon: CalendarCheck,
    className: 'bg-gold-500 hover:bg-gold-600',
  },
]

/** Persistent WhatsApp / booking / back-to-top cluster. */
export function FloatingActions() {
  const site = useSite()
  const actions = actionsFor(site)
  const [open, setOpen] = useState(false)
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 700)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      <AnimatePresence>
        {showTop && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.25, ease: EASE }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Back to top"
            className="grid size-11 place-items-center rounded-full border border-line bg-surface text-ink shadow-soft transition-colors hover:bg-accent-soft"
          >
            <ArrowUp className="size-[1.05rem]" strokeWidth={2.4} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={{
              hidden: { transition: { staggerChildren: 0.05, staggerDirection: -1 } },
              show: { transition: { staggerChildren: 0.07 } },
            }}
            className="flex flex-col items-end gap-3"
          >
            {actions.map((action) => {
              const Cmp = action.icon
              const inner = (
                <>
                  <span className="rounded-lg bg-navy-950 px-3 py-1.5 text-[0.8125rem] font-medium whitespace-nowrap text-white shadow-lift">
                    {action.label}
                  </span>
                  <span
                    className={`grid size-13 place-items-center rounded-full text-white shadow-lift transition-colors ${action.className}`}
                  >
                    <Cmp className="size-[1.35rem]" strokeWidth={2.1} />
                  </span>
                </>
              )
              return (
                <motion.div
                  key={action.label}
                  variants={{
                    hidden: { opacity: 0, y: 12, scale: 0.8 },
                    show: { opacity: 1, y: 0, scale: 1 },
                  }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  {action.to ? (
                    <Link to={action.to} className="flex items-center gap-3">
                      {inner}
                    </Link>
                  ) : (
                    <a
                      href={action.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3"
                    >
                      {inner}
                    </a>
                  )}
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close quick actions' : 'Open quick actions'}
        aria-expanded={open}
        className="relative grid size-14 place-items-center rounded-full bg-ink text-canvas shadow-lift transition-all duration-300 hover:-translate-y-0.5 hover:bg-gold-500 hover:text-white"
      >
        <span
          aria-hidden
          className="absolute inset-0 animate-ping rounded-full bg-ink/30"
          style={{ animationDuration: '3s' }}
        />
        <motion.span
          animate={{ rotate: open ? 135 : 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="relative"
        >
          {open ? <X className="size-6" strokeWidth={2.2} /> : <Plus className="size-6" strokeWidth={2.2} />}
        </motion.span>
      </button>
    </div>
  )
}
