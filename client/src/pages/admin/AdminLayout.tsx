import { Suspense, useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Briefcase,
  Building2,
  FileText,
  Gavel,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareQuote,
  Newspaper,
  ScrollText,
  Settings,
  Shapes,
  Users,
  X,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { RouteLoader } from '@/components/layout/RouteLoader'
import { useAuth } from '@/lib/auth'
import { EASE, routeTransition } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/api'

interface NavEntry {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
  /** Minimum role required to see the entry. */
  minimum?: UserRole
}

const NAV: { group: string; items: NavEntry[] }[] = [
  {
    group: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true, minimum: 'admin' },
    ],
  },
  {
    group: 'Catalogue',
    items: [
      { to: '/admin/properties', label: 'Properties', icon: Building2 },
      { to: '/admin/offers', label: 'Offers & sales', icon: Gavel },
      { to: '/admin/taxonomy', label: 'Categories & forms', icon: Shapes, minimum: 'admin' },
    ],
  },
  {
    group: 'Content',
    items: [
      { to: '/admin/content', label: 'Page copy', icon: FileText, minimum: 'admin' },
      { to: '/admin/services', label: 'Services', icon: Briefcase, minimum: 'admin' },
      { to: '/admin/insights', label: 'Insights', icon: Newspaper, minimum: 'admin' },
      {
        to: '/admin/testimonials',
        label: 'Testimonials & FAQs',
        icon: MessageSquareQuote,
        minimum: 'admin',
      },
    ],
  },
  {
    group: 'Operations',
    items: [
      { to: '/admin/inbox', label: 'Inbox', icon: Inbox, minimum: 'admin' },
      { to: '/admin/users', label: 'People', icon: Users, minimum: 'admin' },
      { to: '/admin/audit', label: 'Audit log', icon: ScrollText, minimum: 'admin' },
      { to: '/admin/settings', label: 'Settings', icon: Settings, minimum: 'super_admin' },
    ],
  },
]

/**
 * The console shell. Everything inside is admin-only; agents and signed-out
 * visitors are bounced before any admin request is ever made.
 */
export default function AdminLayout() {
  const { user, loading, logout, can } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  if (loading) return <RouteLoader />
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  // Agents upload and manage their own listings, so the console is open to
  // them; the nav below hides everything their role cannot reach.
  if (!can('agent')) return <Navigate to="/" replace />
  if (!can('admin') && location.pathname === '/admin') {
    return <Navigate to="/admin/properties" replace />
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-20 shrink-0 items-center justify-between px-6">
        <Logo />
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          className="grid size-9 place-items-center rounded-full text-ink-soft transition-colors hover:bg-canvas-alt lg:hidden"
        >
          <X className="size-5" strokeWidth={2.2} />
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {NAV.map((section) => {
          const items = section.items.filter((item) => !item.minimum || can(item.minimum))
          if (items.length === 0) return null
          return (
            <div key={section.group} className="mb-5">
              <p className="px-3 pb-2 text-[0.6875rem] font-bold tracking-[0.14em] text-ink-faint uppercase">
                {section.group}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const Cmp = item.icon
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9375rem] font-medium transition-colors',
                            isActive
                              ? 'bg-ink text-canvas'
                              : 'text-ink-soft hover:bg-canvas-alt hover:text-ink',
                          )
                        }
                      >
                        <Cmp className="size-[1.05rem] shrink-0" strokeWidth={2.1} />
                        {item.label}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      <div className="shrink-0 border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold-500 text-[0.8125rem] font-bold text-white">
            {user.full_name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.875rem] font-semibold text-ink">{user.full_name}</p>
            <p className="truncate text-[0.75rem] text-ink-muted capitalize">
              {user.role.replace('_', ' ')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            aria-label="Sign out"
            className="grid size-9 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-canvas-alt hover:text-ink"
          >
            <LogOut className="size-4" strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh bg-canvas-alt">
      {/* desktop rail */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-surface lg:block">
        {sidebar}
      </aside>

      {/* mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-navy-950/50 lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.3, ease: EASE }}
              className="fixed inset-y-0 left-0 z-50 w-72 border-r border-line bg-surface lg:hidden"
            >
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="grid size-10 place-items-center rounded-full text-ink-soft transition-colors hover:bg-canvas-alt lg:hidden"
          >
            <Menu className="size-5" strokeWidth={2.2} />
          </button>

          <span className="ml-auto flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-full border border-line px-3.5 py-2 text-[0.8125rem] font-semibold text-ink-soft transition-colors hover:border-line-strong hover:text-ink sm:block"
            >
              View site
            </a>
            <ThemeToggle />
          </span>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<RouteLoader />}>
            {/* Keyed on the path so each console screen transitions, while the
                sidebar and its open/closed state survive the navigation. */}
            <AnimatePresence mode="wait">
              <motion.div key={location.pathname} {...routeTransition}>
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </main>
      </div>
    </div>
  )
}
