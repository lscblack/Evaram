import { useEffect, useRef, useState, type ComponentType } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BadgeCheck,
  Bell,
  Building,
  Building2,
  CalendarCheck,
  ChartColumn,
  ClipboardList,
  DoorOpen,
  ExternalLink,
  FileText,
  Home,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  ReceiptText,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
  Wallet,
  WalletCards,
  X,
  FileSignature,
} from 'lucide-react'
import { api } from '@/shared/api/client'
import type { NotificationOut, Page } from '@/shared/api/types'
import { useAuth } from '@/shared/auth/AuthProvider'
import { LOGO } from '@/shared/lib/brand'
import { relativeTime } from '@/shared/lib/format'
import { Avatar } from '@/shared/ui/Misc'
import { cn } from '@/shared/ui/cn'

interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  perm?: string
  end?: boolean
  badge?: 'approvals' | 'inquiries'
}

const NAV: { group: string; items: NavItem[] }[] = [
  { group: 'Overview', items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, perm: 'dashboard.view', end: true }] },
  {
    group: 'Property Management',
    items: [
      { to: '/admin/properties', label: 'Properties', icon: Building2, perm: 'properties.view' },
      { to: '/admin/buildings', label: 'Buildings', icon: Building, perm: 'properties.view' },
      { to: '/admin/units', label: 'Rental Units', icon: DoorOpen, perm: 'properties.view' },
      { to: '/admin/availability', label: 'Availability', icon: CalendarCheck, perm: 'properties.view' },
    ],
  },
  {
    group: 'People',
    items: [
      { to: '/admin/tenants', label: 'Tenants', icon: UsersRound, perm: 'tenants.view' },
      { to: '/admin/agreements', label: 'Rental Agreements', icon: FileText, perm: 'agreements.view' },
      { to: '/admin/agreement-templates', label: 'Agreement Templates', icon: FileSignature, perm: 'agreements.manage' },
      { to: '/admin/inquiries', label: 'Viewing Requests', icon: MessageSquareText, perm: 'inquiries.manage', badge: 'inquiries' },
    ],
  },
  {
    group: 'Financial Management',
    items: [
      { to: '/admin/finance/invoices', label: 'Invoices', icon: ReceiptText, perm: 'invoices.view' },
      { to: '/admin/finance/payments', label: 'Payments', icon: Wallet, perm: 'payments.view' },
      { to: '/admin/finance/approvals', label: 'Pending Approvals', icon: BadgeCheck, perm: 'payments.approve', badge: 'approvals' },
      { to: '/admin/finance/outstanding', label: 'Outstanding Balances', icon: WalletCards, perm: 'invoices.view' },
      { to: '/admin/finance/reports', label: 'Financial Reports', icon: ChartColumn, perm: 'reports.view' },
    ],
  },
  {
    group: 'Administration',
    items: [
      { to: '/admin/users', label: 'Staff and Users', icon: Users, perm: 'users.manage' },
      { to: '/admin/roles', label: 'Roles and Permissions', icon: ShieldCheck, perm: 'roles.manage' },
      { to: '/admin/settings', label: 'System Settings', icon: Settings, perm: 'settings.manage' },
      { to: '/admin/audit', label: 'Audit Logs', icon: ScrollText, perm: 'audit.view' },
    ],
  },
]

function useBadgeCounts() {
  const { can } = useAuth()
  const approvals = useQuery({
    queryKey: ['badge', 'approvals'],
    queryFn: () => api.get<Page<unknown>>('/payments', { status: 'pending', page_size: 1 }),
    enabled: can('payments.approve'),
    refetchInterval: 60_000,
  })
  const inquiries = useQuery({
    queryKey: ['badge', 'inquiries'],
    queryFn: () => api.get<Page<unknown>>('/inquiries', { status: 'new', page_size: 1 }),
    enabled: can('inquiries.manage'),
    refetchInterval: 120_000,
  })
  return { approvals: approvals.data?.total ?? 0, inquiries: inquiries.data?.total ?? 0 }
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { can } = useAuth()
  const counts = useBadgeCounts()
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Main">
      {NAV.map((section) => {
        const items = section.items.filter((i) => !i.perm || can(i.perm))
        if (!items.length) return null
        return (
          <div key={section.group}>
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-200/70">{section.group}</p>
            <ul className="space-y-0.5">
              {items.map((item) => {
                const count = item.badge ? counts[item.badge] : 0
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                          isActive ? 'bg-white/10 text-white' : 'text-brand-100/80 hover:bg-white/5 hover:text-white',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon className={cn('size-[18px] shrink-0', isActive ? 'text-gold-300' : 'text-brand-200/70')} />
                          <span className="flex-1 truncate">{item.label}</span>
                          {count > 0 ? (
                            <span className="rounded-full bg-gold-500 px-1.5 py-px text-xs font-bold text-white tabular">{count}</span>
                          ) : null}
                        </>
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}

function SidebarBrand() {
  return (
    <Link to="/admin" className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5">
      <img src={LOGO.horizontalReversed} alt="Evaramu Group Ltd" className="h-9 w-auto" />
    </Link>
  )
}

function NotificationsMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const count = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get<{ count: number }>('/notifications/unread-count'),
    refetchInterval: 60_000,
  })
  const list = useQuery({
    queryKey: ['notifications', 'menu'],
    queryFn: () => api.get<Page<NotificationOut>>('/notifications', { page_size: 6 }),
    enabled: open,
  })
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  const unread = count.data?.count ?? 0

  async function openItem(n: NotificationOut) {
    setOpen(false)
    if (!n.read_at) {
      await api.post(`/notifications/${n.id}/read`)
      qc.invalidateQueries({ queryKey: ['notifications'] })
    }
    if (n.link) navigate(n.link)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
        className="relative inline-flex size-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
      >
        <Bell className="size-5" />
        {unread > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-4 text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="fixed inset-x-2 top-16 z-40 rounded-xl border border-slate-200 bg-white shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 ? (
              <button
                type="button"
                className="text-sm font-medium text-brand-700 hover:text-brand-900"
                onClick={async () => {
                  await api.post('/notifications/read-all')
                  qc.invalidateQueries({ queryKey: ['notifications'] })
                }}
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
            {list.data?.items.length ? (
              list.data.items.map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => openItem(n)} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50">
                    <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read_at ? 'bg-transparent' : 'bg-gold-500')} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-900">{n.title}</span>
                      {n.body ? <span className="block truncate text-sm text-slate-500">{n.body}</span> : null}
                      <span className="mt-0.5 block text-xs text-slate-400">{relativeTime(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              ))
            ) : (
              <li className="px-4 py-8 text-center text-sm text-slate-500">{list.isLoading ? 'Loading…' : 'You are all caught up.'}</li>
            )}
          </ul>
          <Link
            to="/admin/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-medium text-brand-700 hover:bg-slate-50"
          >
            View all notifications
          </Link>
        </div>
      ) : null}
    </div>
  )
}

function ProfileMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  if (!user) return null
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-100 sm:pr-3"
        aria-label="Account menu"
      >
        <Avatar name={user.full_name} />
        <span className="hidden text-left sm:block">
          <span className="block max-w-40 truncate text-sm font-semibold text-slate-900">{user.full_name}</span>
          <span className="block text-xs text-slate-500">{user.role.name}</span>
        </span>
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-40 w-64 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-semibold">{user.full_name}</p>
            <p className="truncate text-sm text-slate-500">{user.email}</p>
          </div>
          <Link to="/admin/account" onClick={() => setOpen(false)} className="flex h-11 items-center gap-3 px-4 text-sm hover:bg-slate-50">
            <KeyRound className="size-4 text-slate-500" /> Account and password
          </Link>
          <a href="/" target="_blank" rel="noreferrer" className="flex h-11 items-center gap-3 px-4 text-sm hover:bg-slate-50">
            <ExternalLink className="size-4 text-slate-500" /> View public website
          </a>
          <button
            type="button"
            onClick={async () => {
              await logout()
              navigate('/login', { replace: true })
            }}
            className="flex h-11 w-full items-center gap-3 px-4 text-sm text-red-700 hover:bg-red-50"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      ) : null}
    </div>
  )
}

function MobileTabBar({ onMenu }: { onMenu: () => void }) {
  const { can } = useAuth()
  const counts = useBadgeCounts()
  const tabs = [
    { to: '/admin', label: 'Home', icon: Home, perm: 'dashboard.view', end: true },
    { to: '/admin/units', label: 'Units', icon: DoorOpen, perm: 'properties.view' },
    { to: '/admin/tenants', label: 'Tenants', icon: UsersRound, perm: 'tenants.view' },
    can('payments.approve')
      ? { to: '/admin/finance/approvals', label: 'Approvals', icon: BadgeCheck, perm: 'payments.approve', badge: counts.approvals }
      : { to: '/admin/finance/payments', label: 'Payments', icon: Wallet, perm: 'payments.view' },
  ].filter((t) => can(t.perm))
  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg">
        {tabs.map((t) => (
          <li key={t.to} className="flex-1">
            <NavLink
              to={t.to}
              end={'end' in t ? t.end : false}
              className={({ isActive }) =>
                cn('relative flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold', isActive ? 'text-brand-900' : 'text-slate-500')
              }
            >
              <t.icon className="size-5" />
              {t.label}
              {'badge' in t && t.badge ? (
                <span className="absolute right-[calc(50%-1.25rem)] top-1.5 rounded-full bg-gold-500 px-1.5 text-[10px] font-bold leading-4 text-white">
                  {t.badge}
                </span>
              ) : null}
            </NavLink>
          </li>
        ))}
        <li className="flex-1">
          <button type="button" onClick={onMenu} className="flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-slate-500">
            <Menu className="size-5" />
            Menu
          </button>
        </li>
      </ul>
    </nav>
  )
}

export function AdminLayout() {
  const [drawer, setDrawer] = useState(false)
  const location = useLocation()
  useEffect(() => setDrawer(false), [location.pathname])
  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawer])

  return (
    <div className="min-h-dvh bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-brand-900 lg:flex">
        <SidebarBrand />
        <SidebarNav />
      </aside>

      {/* Mobile drawer */}
      {drawer ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[min(20rem,86vw)] flex-col bg-brand-900 shadow-xl">
            <div className="flex items-center justify-between pr-2">
              <SidebarBrand />
              <button
                type="button"
                onClick={() => setDrawer(false)}
                aria-label="Close menu"
                className="inline-flex size-10 items-center justify-center rounded-lg text-brand-100 hover:bg-white/10"
              >
                <X className="size-5" />
              </button>
            </div>
            <SidebarNav onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
            className="inline-flex size-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <Link to="/admin" className="lg:hidden">
            <img src={LOGO.horizontal} alt="Evaramu Group Ltd" className="h-8 w-auto" />
          </Link>
          <div className="flex-1" />
          <Link
            to="/admin/finance/payments?record=1"
            className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 md:inline-flex"
          >
            <ClipboardList className="size-4" /> Record payment
          </Link>
          <NotificationsMenu />
          <ProfileMenu />
        </header>
        <main className="mx-auto w-11/12 py-5 pb-24 sm:py-6 lg:pb-10">
          <Outlet />
        </main>
      </div>
      <MobileTabBar onMenu={() => setDrawer(true)} />
    </div>
  )
}

