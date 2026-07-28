import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Menu, Phone, Search, X } from 'lucide-react'
import { NAV_ITEMS, SITE, SOCIALS } from '@/data/site'
import type { TranslationKey } from '@/data/translations'
import { cn } from '@/lib/utils'
import { EASE } from '@/lib/motion'
import { useT } from '@/lib/i18n'
import { Logo } from '@/components/ui/Logo'
import { Icon } from '@/components/ui/Icon'
import { SocialIcon } from '@/components/ui/SocialIcon'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileSection, setMobileSection] = useState<string | null>(null)
  const closeTimer = useRef<number | undefined>(undefined)
  const { pathname } = useLocation()
  const t = useT()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setOpenMenu(null)
    setMobileSection(null)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpenMenu(null)
      setMobileOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  /** Small delay so the pointer can travel from trigger to panel. */
  const scheduleClose = () => {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setOpenMenu(null), 140)
  }
  const cancelClose = () => window.clearTimeout(closeTimer.current)

  const openItem = NAV_ITEMS.find((i) => i.label === openMenu && i.children)

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* ---------- utility bar ---------- */}
      <div
        className={cn(
          'hidden overflow-hidden bg-navy-950 text-white/60 transition-[max-height,opacity] duration-500 ease-brand lg:block',
          scrolled ? 'max-h-0 opacity-0' : 'max-h-10 opacity-100',
        )}
      >
        <div className="container-page flex h-10 items-center justify-between text-[0.75rem]">
          <div className="flex items-center gap-6">
            <a href={SITE.phoneHref} className="transition-colors hover:text-gold-300">
              {SITE.phone}
            </a>
            <a href={`mailto:${SITE.email}`} className="transition-colors hover:text-gold-300">
              {SITE.email}
            </a>
            <span className="text-white/40">{SITE.hours}</span>
          </div>
          <div className="flex items-center gap-4">
            {SOCIALS.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.name}
                className="transition-colors hover:text-gold-300"
              >
                <SocialIcon name={s.icon} className="size-3.5" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- main bar ---------- */}
      <div
        className={cn(
          'border-b transition-colors duration-300',
          scrolled
            ? 'border-line bg-surface/85 shadow-soft backdrop-blur-xl'
            : 'border-transparent bg-surface',
        )}
        onMouseLeave={scheduleClose}
      >
        <div
          className={cn(
            'container-page flex items-center justify-between gap-6 transition-[height] duration-400 ease-brand',
            scrolled ? 'h-16' : 'h-18 lg:h-20',
          )}
        >
          <Logo />

          {/* desktop nav */}
          <nav className="hidden items-center gap-0.5 xl:flex" aria-label={t('nav.primary')}>
            {NAV_ITEMS.map((item) => {
              const hasChildren = Boolean(item.children?.length)
              return (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => {
                    cancelClose()
                    setOpenMenu(hasChildren ? item.label : null)
                  }}
                >
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-1 px-3 py-2 text-[0.875rem] font-medium whitespace-nowrap transition-colors duration-200',
                        isActive || openMenu === item.label
                          ? 'text-gold-600'
                          : 'text-ink-soft hover:text-gold-600',
                      )
                    }
                    onFocus={() => setOpenMenu(hasChildren ? item.label : null)}
                    aria-expanded={hasChildren ? openMenu === item.label : undefined}
                    aria-haspopup={hasChildren || undefined}
                  >
                    {({ isActive }) => (
                      <>
                        {t(item.tKey as TranslationKey)}
                        {hasChildren && (
                          <ChevronDown
                            className={cn(
                              'size-3 transition-transform duration-300',
                              openMenu === item.label && 'rotate-180',
                            )}
                            strokeWidth={2.4}
                          />
                        )}
                        {isActive && (
                          <motion.span
                            layoutId="nav-underline"
                            className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-gold-500"
                            transition={{ duration: 0.4, ease: EASE }}
                          />
                        )}
                      </>
                    )}
                  </NavLink>
                </div>
              )
            })}
          </nav>

          {/* desktop actions */}
          <div className="hidden items-center gap-2 lg:flex">
            <LanguageSwitcher />
            <ThemeToggle />
            <Link
              to="/properties"
              aria-label={t('cta.search')}
              className="grid size-9 place-items-center rounded-full border border-line text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
            >
              <Search className="size-4" strokeWidth={2.1} />
            </Link>
            <Link
              to="/consultation"
              className="ml-1 inline-flex h-10 items-center rounded-full bg-gold-500 px-5 text-[0.875rem] font-semibold text-white transition-colors duration-300 hover:bg-gold-600"
            >
              {t('cta.bookConsultation')}
            </Link>
          </div>

          {/* mobile actions */}
          <div className="flex items-center gap-2 xl:hidden">
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label={t('nav.openMenu')}
              className="grid size-10 place-items-center rounded-full border border-line text-ink transition-colors hover:bg-canvas-alt"
            >
              <Menu className="size-5" strokeWidth={2.1} />
            </button>
          </div>
        </div>

        {/* ---------- desktop mega menu ---------- */}
        <AnimatePresence>
          {openItem && (
            <motion.div
              key={openItem.label}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: EASE }}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
              className="absolute inset-x-0 top-full hidden border-b border-line bg-surface shadow-lift xl:block"
            >
              <div className="container-page grid grid-cols-12 gap-10 py-9">
                <div className="col-span-3">
                  <p className="font-display text-xl font-semibold text-ink">
                    {openItem.label === 'Properties'
                      ? 'What are you looking for?'
                      : 'How we help you'}
                  </p>
                  <p className="mt-2.5 text-[0.875rem] leading-relaxed text-ink-muted">
                    {openItem.label === 'Properties'
                      ? 'Every listing is title-verified at the Rwanda Land Authority before it reaches this site.'
                      : 'One company that brokers, builds, manages and re-lists — the full value chain.'}
                  </p>
                  <Link
                    to={openItem.to}
                    className="group mt-5 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-gold-600 transition-colors hover:text-gold-700"
                  >
                    {t('nav.viewAll')}
                    <span className="transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </Link>
                </div>

                <div className="col-span-9 grid grid-cols-2 gap-x-6 gap-y-1 border-l border-line pl-10">
                  {openItem.children?.map((child, i) => (
                    <motion.div
                      key={child.to}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease: EASE, delay: 0.03 * i }}
                    >
                      <Link
                        to={child.to}
                        className="group flex items-start gap-3.5 rounded-xl p-3.5 transition-colors duration-300 hover:bg-canvas-alt"
                      >
                        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-ink-soft transition-colors duration-300 group-hover:bg-gold-500 group-hover:text-white">
                          <Icon name={child.icon} className="size-4" strokeWidth={2} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[0.9375rem] font-semibold text-ink transition-colors group-hover:text-gold-600">
                            {child.label}
                          </span>
                          <span className="mt-0.5 block text-[0.8125rem] leading-snug text-ink-muted">
                            {child.description}
                          </span>
                        </span>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ---------- mobile drawer ---------- */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-navy-950/60 backdrop-blur-sm xl:hidden"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.4, ease: EASE }}
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-surface shadow-lift xl:hidden"
              role="dialog"
              aria-modal="true"
              aria-label={t('nav.menu')}
            >
              <div className="flex h-18 shrink-0 items-center justify-between border-b border-line px-5">
                <Logo />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label={t('nav.closeMenu')}
                  className="grid size-10 place-items-center rounded-full border border-line text-ink transition-colors hover:bg-canvas-alt"
                >
                  <X className="size-5" strokeWidth={2.1} />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-4 py-5" aria-label="Mobile">
                <ul className="space-y-0.5">
                  {NAV_ITEMS.map((item) => (
                    <li key={item.label}>
                      {item.children?.length ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setMobileSection((s) => (s === item.label ? null : item.label))
                            }
                            aria-expanded={mobileSection === item.label}
                            className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-[1.0625rem] font-semibold text-ink transition-colors hover:bg-canvas-alt"
                          >
                            {t(item.tKey as TranslationKey)}
                            <ChevronDown
                              className={cn(
                                'size-4 text-ink-muted transition-transform duration-300',
                                mobileSection === item.label && 'rotate-180',
                              )}
                              strokeWidth={2.4}
                            />
                          </button>
                          <AnimatePresence initial={false}>
                            {mobileSection === item.label && (
                              <motion.ul
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: EASE }}
                                className="overflow-hidden"
                              >
                                {item.children.map((child) => (
                                  <li key={child.to}>
                                    <Link
                                      to={child.to}
                                      className="block rounded-xl py-2.5 pr-4 pl-8 text-[0.9375rem] text-ink-soft transition-colors hover:text-gold-600"
                                    >
                                      {child.label}
                                    </Link>
                                  </li>
                                ))}
                              </motion.ul>
                            )}
                          </AnimatePresence>
                        </>
                      ) : (
                        <NavLink
                          to={item.to}
                          end={item.to === '/'}
                          className={({ isActive }) =>
                            cn(
                              'block rounded-xl px-4 py-3 text-[1.0625rem] font-semibold transition-colors',
                              isActive
                                ? 'bg-accent-soft text-gold-600'
                                : 'text-ink hover:bg-canvas-alt',
                            )
                          }
                        >
                          {t(item.tKey as TranslationKey)}
                        </NavLink>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="shrink-0 space-y-3 border-t border-line bg-canvas px-5 py-5">
                <div className="flex items-center justify-between gap-3 pb-1">
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>
                <Link
                  to="/consultation"
                  className="flex h-12 w-full items-center justify-center rounded-full bg-gold-500 font-semibold text-white transition-colors hover:bg-gold-600"
                >
                  {t('cta.bookConsultation')}
                </Link>
                <a
                  href={SITE.phoneHref}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-line font-semibold text-ink transition-colors hover:border-line-strong"
                >
                  <Phone className="size-4" strokeWidth={2.1} />
                  {SITE.phone}
                </a>
                <div className="flex items-center justify-center gap-5 pt-1">
                  {SOCIALS.map((s) => (
                    <a
                      key={s.name}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.name}
                      className="text-ink-muted transition-colors hover:text-gold-600"
                    >
                      <SocialIcon name={s.icon} className="size-4" />
                    </a>
                  ))}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}
