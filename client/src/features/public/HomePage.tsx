import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  Building2,
  CalendarCheck,
  Clock,
  FileSignature,
  Home,
  KeyRound,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  SearchX,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react'
import { api } from '@/shared/api/client'
import type { Page, PublicArea, PublicFilters, PublicListing } from '@/shared/api/types'
import { settingText, usePublicSettings } from '@/shared/lib/brand'
import { formatMoney, UNIT_TYPE_LABEL } from '@/shared/lib/format'
import { useUrlState } from '@/shared/lib/useUrlState'
import { Button } from '@/shared/ui/Button'
import { Pagination } from '@/shared/ui/DataView'
import { Dialog } from '@/shared/ui/Dialog'
import { EmptyState, ErrorState } from '@/shared/ui/EmptyState'
import { Skeleton } from '@/shared/ui/Spinner'
import { cn } from '@/shared/ui/cn'
import { InquiryForm, ListingCard, useDocumentTitle } from './shared'

const PAGE_SIZE = 12
const DEFAULTS = { location: '', unit_type: '', currency: '', min_rent: '', max_rent: '', bedrooms: '', sort: 'newest' }
type Filters = typeof DEFAULTS

/** The page's one grid: 1 → 2 → 3 → 4 columns. */
const GRID = 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'

const scrollToProperties = () =>
  requestAnimationFrame(() => document.getElementById('properties')?.scrollIntoView({ behavior: 'smooth' }))

export default function HomePage() {
  const { data: s } = usePublicSettings()
  const company = settingText(s, 'company.name', 'Evaramu Group Ltd')
  useDocumentTitle(`${company} — Homes, apartments and rooms for rent in Kigali`)
  const location = useLocation()
  const [state, set] = useUrlState(DEFAULTS)
  const [requestFor, setRequestFor] = useState<PublicListing | null>(null)

  // Scroll to #section when arriving from another page or the nav.
  useEffect(() => {
    if (!location.hash) return
    const t = setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 60)
    return () => clearTimeout(t)
  }, [location.hash])

  const filters = useQuery({
    queryKey: ['public', 'filters'],
    queryFn: () => api.publicGet<PublicFilters>('/public/filters'),
    staleTime: 60_000,
  })
  const featured = useQuery({
    queryKey: ['public', 'featured', 4],
    queryFn: () => api.publicGet<Page<PublicListing>>('/public/listings', { featured: true, page_size: 4 }),
    staleTime: 60_000,
  })
  const listings = useQuery({
    queryKey: ['public', 'listings', state],
    queryFn: () =>
      api.publicGet<Page<PublicListing>>('/public/listings', {
        location: state.location,
        unit_type: state.unit_type,
        currency: state.currency,
        min_rent: state.currency ? state.min_rent : undefined,
        max_rent: state.currency ? state.max_rent : undefined,
        bedrooms: state.bedrooms,
        sort: state.sort,
        page: state.page,
        page_size: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  const seen = useMemo(() => [...(featured.data?.items ?? []), ...(listings.data?.items ?? [])], [featured.data, listings.data])
  const heroPhoto = seen.find((l) => l.cover_url)?.cover_url ?? null
  const filtered = Object.entries(DEFAULTS).some(([k, v]) => k !== 'sort' && state[k as keyof Filters] !== v)
  const apply = (f: Partial<Filters>) => {
    set({ ...f })
    scrollToProperties()
  }

  return (
    <>
      <Hero company={company} tagline={settingText(s, 'company.tagline', 'Houses, apartments and rooms managed by a landlord you can rely on.')} photo={heroPhoto} filters={filters.data}>
        <HeroSearch state={state} filters={filters.data} onApply={apply} />
      </Hero>

      <Promises />

      {/* Featured */}
      {!filtered && featured.data?.items.length ? (
        <section className="mx-auto w-11/12 py-14 sm:py-20">
          <SectionHead
            eyebrow="Featured"
            title="Handpicked homes,"
            accent="ready to move in"
            description="A few of our best units available right now."
            action={
              <a href="#properties" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand-800 hover:text-brand-900">
                See all homes <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            }
          />
          <div className={cn(GRID, 'mt-8')}>
            {featured.data.items.map((l, i) => (
              <ListingCard key={l.code} listing={l} index={i} onRequest={setRequestFor} />
            ))}
            {featured.data.items.length < 4 ? <BrowseAllTile total={filters.data?.total_available} index={featured.data.items.length} /> : null}
          </div>
        </section>
      ) : null}

      <Neighbourhoods onPick={(loc) => apply({ ...DEFAULTS, sort: state.sort, location: loc })} />

      {/* All listings */}
      <section id="properties" className="scroll-mt-20 bg-slate-50/70">
        <div className="mx-auto w-11/12 py-14 sm:py-20">
          <SectionHead
            eyebrow="Available now"
            title={filtered ? 'Homes matching' : 'Explore every home'}
            accent={filtered ? 'your search' : 'we have to let'}
            description={
              listings.data ? `${listings.data.total} ${listings.data.total === 1 ? 'home' : 'homes'} ${filtered ? 'found' : 'available to rent'}` : undefined
            }
            action={
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <span className="shrink-0">Sort by</span>
                <select
                  value={state.sort}
                  onChange={(e) => set({ sort: e.target.value })}
                  className="h-10 rounded-full border border-slate-200 bg-white px-4 pr-8 text-sm font-medium text-slate-800 shadow-sm focus:border-brand-400"
                >
                  <option value="newest">Newest</option>
                  <option value="price_asc">Rent: low to high</option>
                  <option value="price_desc">Rent: high to low</option>
                </select>
              </label>
            }
          />

          <TypePills
            types={filters.data?.unit_types ?? []}
            value={state.unit_type}
            onChange={(t) => set({ unit_type: t })}
          />
          <ActiveFilters state={state} onClear={(k) => set(k === 'all' ? { ...DEFAULTS, sort: state.sort } : k === 'budget' ? { currency: '', min_rent: '', max_rent: '' } : { [k]: '' })} />

          <div className="mt-6">
            {listings.error ? (
              <ErrorState error={listings.error} onRetry={listings.refetch} />
            ) : !listings.data ? (
              <div className={GRID}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-[23rem] rounded-2xl" />
                ))}
              </div>
            ) : listings.data.items.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white">
                <EmptyState
                  icon={SearchX}
                  title={filtered ? 'No homes match your search' : 'No homes are available right now'}
                  description={
                    filtered
                      ? 'Try widening the budget or choosing another neighbourhood.'
                      : 'All our homes are currently let. Leave your details and we will contact you when something becomes available.'
                  }
                  action={
                    filtered ? (
                      <Button variant="outline" onClick={() => set({ ...DEFAULTS })}>Clear filters</Button>
                    ) : (
                      <a href="#contact" className="inline-flex h-11 items-center rounded-full bg-brand-900 px-5 text-sm font-semibold text-white">Contact us</a>
                    )
                  }
                />
              </div>
            ) : (
              <div className={cn(GRID, 'transition-opacity', listings.isFetching && 'opacity-60')}>
                {listings.data.items.map((l, i) => (
                  <ListingCard key={l.code} listing={l} index={i} onRequest={setRequestFor} />
                ))}
              </div>
            )}
            {listings.data && listings.data.total > PAGE_SIZE ? (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-white">
                <Pagination
                  page={Number(state.page)}
                  pageSize={PAGE_SIZE}
                  total={listings.data.total}
                  onPage={(p) => {
                    set({ page: String(p) })
                    scrollToProperties()
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <HowItWorks />
      <AboutSection filters={filters.data} />
      <CallToAction />
      <ContactSection />

      <Dialog
        open={!!requestFor}
        onClose={() => setRequestFor(null)}
        title="Request a viewing"
        description={requestFor ? `${requestFor.name} · ${requestFor.code}` : undefined}
      >
        {requestFor ? <InquiryForm unitCode={requestFor.code} compact /> : null}
      </Dialog>
    </>
  )
}

/* ------------------------------------------------------------------------- */

function Accent({ children, className }: { children: ReactNode; className?: string }) {
  return <em className={cn('font-display text-[1.12em] font-normal italic tracking-normal', className)}>{children}</em>
}

function SectionHead({
  eyebrow,
  title,
  accent,
  description,
  action,
  tone = 'light',
}: {
  eyebrow: string
  title: string
  accent?: string
  description?: string
  action?: ReactNode
  tone?: 'light' | 'dark'
}) {
  const dark = tone === 'dark'
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <p className={cn('inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]', dark ? 'text-gold-300' : 'text-gold-600')}>
          <span className={cn('h-px w-6', dark ? 'bg-gold-300' : 'bg-gold-500')} />
          {eyebrow}
        </p>
        <h2 className={cn('mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl', dark ? 'text-white' : 'text-slate-900')}>
          {title} {accent ? <Accent className={dark ? 'text-gold-300' : 'text-brand-700'}>{accent}</Accent> : null}
        </h2>
        {description ? <p className={cn('mt-2 text-base tabular', dark ? 'text-brand-100/75' : 'text-slate-500')}>{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

function Hero({
  company,
  tagline,
  photo,
  filters,
  children,
}: {
  company: string
  tagline: string
  photo: string | null
  filters?: PublicFilters
  children: ReactNode
}) {
  const stats = filters
    ? [
        { value: filters.total_available, label: filters.total_available === 1 ? 'Home available now' : 'Homes available now' },
        { value: filters.locations.length, label: filters.locations.length === 1 ? 'Neighbourhood' : 'Neighbourhoods' },
        { value: filters.unit_types.length, label: filters.unit_types.length === 1 ? 'Type of home' : 'Types of home' },
      ]
    : []
  return (
    <section className="pt-3 sm:pt-5">
      <div className="relative mx-auto w-11/12 overflow-hidden rounded-[28px] bg-brand-950 text-white">
        {photo ? <img src={photo} alt="" onError={hideBroken} className="absolute inset-0 size-full animate-drift object-cover" /> : null}
        <div className="absolute inset-0 bg-gradient-to-r from-brand-950 via-brand-950/85 to-brand-950/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950/80 via-transparent to-transparent" />
        <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full border-[40px] border-gold-400/10" />

        <div className="relative grid gap-10 px-6 pb-32 pt-14 sm:px-10 sm:pt-20 lg:grid-cols-12 lg:px-14 lg:pb-36 lg:pt-24">
          <div className="lg:col-span-7">
            <p className="inline-flex animate-rise items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-gold-200 ring-1 ring-white/15 backdrop-blur">
              <MapPin className="size-3.5" /> {company} · Kigali
            </p>
            <h1 style={{ '--rise-i': 1 } as React.CSSProperties} className="mt-5 animate-rise text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl xl:text-7xl">
              Find a home you&rsquo;ll <Accent className="text-gold-300">love</Accent> to rent in Kigali
            </h1>
            <p style={{ '--rise-i': 2 } as React.CSSProperties} className="mt-5 max-w-xl animate-rise text-base text-brand-100/85 sm:text-lg">
              {tagline}
            </p>
            <div style={{ '--rise-i': 3 } as React.CSSProperties} className="mt-8 flex animate-rise flex-col gap-3 sm:flex-row">
              <a href="#properties" className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gold-500 px-6 font-semibold text-white shadow-lg shadow-gold-900/20 transition-colors hover:bg-gold-600">
                Browse available homes <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a href="#contact" className="inline-flex h-12 items-center justify-center rounded-full border border-white/30 px-6 font-semibold text-white backdrop-blur transition-colors hover:bg-white/10">
                Request a viewing
              </a>
            </div>
          </div>

          {stats.length ? (
            <div className="flex items-end lg:col-span-5 lg:justify-end">
              <dl
                style={{ '--rise-i': 4 } as React.CSSProperties}
                className="grid w-full animate-rise grid-cols-3 divide-x divide-white/15 rounded-2xl bg-white/10 py-4 ring-1 ring-white/15 backdrop-blur-md lg:max-w-md"
              >
                {stats.map((st) => (
                  <div key={st.label} className="px-3 text-center sm:px-5">
                    <dt className="sr-only">{st.label}</dt>
                    <dd className="text-2xl font-bold tabular sm:text-3xl">{st.value}</dd>
                    <dd className="mt-0.5 text-[11px] leading-tight text-brand-100/75 sm:text-xs">{st.label}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </div>
      </div>
      <div className="relative z-10 mx-auto -mt-20 w-11/12 px-3 sm:px-6 lg:-mt-16 lg:px-10">{children}</div>
    </section>
  )
}

const fieldLabel = 'flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500'
const bare =
  'mt-1 h-8 w-full min-w-0 cursor-pointer appearance-none truncate border-0 bg-transparent p-0 text-[15px] font-semibold text-slate-900 outline-none focus:ring-0'

function HeroSearch({ state, filters, onApply }: { state: Filters; filters?: PublicFilters; onApply: (f: Partial<Filters>) => void }) {
  const [draft, setDraft] = useState<Filters>(state)
  useEffect(() => setDraft(state), [state])
  const currencies = filters?.currencies.map((c) => c.currency) ?? []
  const maxBeds = Math.max(filters?.max_bedrooms ?? 0, 1)
  const up = (k: keyof Filters) => (e: { target: { value: string } }) => setDraft((d) => ({ ...d, [k]: e.target.value }))

  function submit(e: FormEvent) {
    e.preventDefault()
    const next = { ...draft, sort: state.sort }
    // The API filters rent within one currency only.
    if (!next.currency && (next.min_rent || next.max_rent)) next.currency = currencies[0] ?? 'RWF'
    onApply(next)
  }

  const cell = 'min-w-0 rounded-xl px-4 py-2.5 transition-colors hover:bg-slate-50 focus-within:bg-slate-50'
  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label="Search homes"
      className="grid animate-rise grid-cols-1 gap-1 rounded-2xl bg-white p-2 shadow-[0_24px_60px_-20px_rgb(3_42_78/0.35)] ring-1 ring-slate-200/70 [--rise-i:5] sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_0.8fr_1.4fr_auto] lg:divide-x lg:divide-slate-100"
    >
      <label className={cell}>
        <span className={fieldLabel}><MapPin className="size-3.5 text-gold-600" /> Location</span>
        <select value={draft.location} onChange={up('location')} className={bare} aria-label="Location">
          <option value="">Anywhere in Kigali</option>
          {filters?.locations.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </label>
      <label className={cell}>
        <span className={fieldLabel}><Home className="size-3.5 text-gold-600" /> Home type</span>
        <select value={draft.unit_type} onChange={up('unit_type')} className={bare} aria-label="Property type">
          <option value="">Any type</option>
          {(filters?.unit_types.length ? filters.unit_types : Object.keys(UNIT_TYPE_LABEL)).map((t) => (
            <option key={t} value={t}>{UNIT_TYPE_LABEL[t] ?? t}</option>
          ))}
        </select>
      </label>
      <label className={cell}>
        <span className={fieldLabel}><BedDouble className="size-3.5 text-gold-600" /> Bedrooms</span>
        <select value={draft.bedrooms} onChange={up('bedrooms')} className={bare} aria-label="Bedrooms">
          <option value="">Any</option>
          {Array.from({ length: maxBeds }, (_, i) => i + 1).map((n) => (
            <option key={n} value={String(n)}>{n}+</option>
          ))}
        </select>
      </label>
      <div className={cell}>
        <span className={fieldLabel}><Wallet className="size-3.5 text-gold-600" /> Max budget / month</span>
        <div className="flex items-center gap-2">
          <select value={draft.currency} onChange={up('currency')} className={cn(bare, 'w-auto shrink-0 text-slate-600')} aria-label="Currency">
            <option value="">RWF / USD</option>
            {(currencies.length ? currencies : ['RWF', 'USD']).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={draft.max_rent}
            onChange={up('max_rent')}
            placeholder="No limit"
            aria-label="Max rent"
            className={cn(bare, 'cursor-text tabular placeholder:font-medium placeholder:text-slate-400')}
          />
        </div>
      </div>
      <div className="flex items-center p-1 sm:col-span-2 lg:col-span-1 lg:pl-2">
        <button
          type="submit"
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand-900 px-7 font-semibold text-white transition-colors hover:bg-brand-800"
        >
          <Search className="size-5" /> Search
        </button>
      </div>
    </form>
  )
}

/** Fills the featured row when fewer than four homes are featured. */
function BrowseAllTile({ total, index }: { total?: number; index: number }) {
  return (
    <a
      href="#properties"
      style={{ '--stat-i': index } as React.CSSProperties}
      className="group relative hidden animate-stat-in flex-col justify-between overflow-hidden rounded-2xl bg-brand-950 p-6 text-white xl:flex"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full border-[32px] border-gold-400/15" />
      <span className="relative flex size-11 items-center justify-center rounded-xl bg-gold-500"><Building2 className="size-5" /></span>
      <span className="relative">
        {typeof total === 'number' ? <span className="block text-5xl font-bold tabular">{total}</span> : null}
        <span className="mt-1 block text-2xl font-semibold leading-tight">
          homes <Accent className="text-gold-300">available</Accent> right now
        </span>
        <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-brand-900 transition-colors group-hover:bg-gold-50">
          Browse them all <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>
    </a>
  )
}

function Promises() {
  const items: [typeof KeyRound, string, string][] = [
    [KeyRound, 'Genuinely available', 'A listing comes down the moment a home is let.'],
    [Wallet, 'Rent shown upfront', 'Monthly rent in RWF or USD — no hidden fees.'],
    [FileSignature, 'Signed agreements', 'Digitally signed, printable and verifiable.'],
    [ShieldCheck, 'Managed properly', 'Receipts for every payment and quick repairs.'],
  ]
  return (
    <section className="mx-auto w-11/12 pt-12 sm:pt-16">
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(([Icon, t, d], i) => (
          <li key={t} style={{ '--stat-i': i } as React.CSSProperties} className="flex animate-stat-in items-start gap-3.5 rounded-2xl p-2">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gold-50 text-gold-700 ring-1 ring-gold-100">
              <Icon className="size-5" />
            </span>
            <span>
              <span className="block font-semibold text-slate-900">{t}</span>
              <span className="mt-0.5 block text-sm text-slate-500">{d}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Neighbourhoods({ onPick }: { onPick: (loc: string) => void }) {
  const areas = useQuery({ queryKey: ['public', 'areas'], queryFn: () => api.publicGet<PublicArea[]>('/public/areas') })
  const list = areas.data ?? []
  if (list.length < 2) return null
  return (
    <section className="bg-white">
      <div className="mx-auto w-11/12 pb-14 sm:pb-20">
        <SectionHead eyebrow="Neighbourhoods" title="Live where" accent="life happens" description="Pick an area to see the homes we have there." />
        {/* Columns follow the number of areas so a short row never leaves a gap. */}
        <div
          className={cn(
            'mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2',
            list.length === 3 ? 'lg:grid-cols-3' : list.length % 3 === 0 && list.length % 4 !== 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-3 xl:grid-cols-4',
            list.length === 2 && 'lg:grid-cols-2 xl:grid-cols-2',
          )}
        >
          {list.slice(0, 8).map((a, i) => (
            <AreaCard key={a.name} area={a} index={i} onPick={onPick} />
          ))}
        </div>
      </div>
    </section>
  )
}

function AreaCard({ area, index, onPick }: { area: PublicArea; index: number; onPick: (loc: string) => void }) {
  const total = area.available + area.taken
  const letShare = total ? Math.round((area.taken / total) * 100) : 0
  const full = area.available === 0
  return (
    <button
      type="button"
      onClick={() => onPick(area.name)}
      disabled={full}
      style={{ '--stat-i': index } as React.CSSProperties}
      aria-label={`${area.name}: ${area.available} available, ${area.taken} taken`}
      className="group flex animate-stat-in flex-col rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition duration-300 enabled:hover:-translate-y-1 enabled:hover:shadow-[0_18px_40px_-18px_rgb(3_42_78/0.35)] disabled:cursor-default"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <MapPin className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-lg font-semibold text-slate-900">{area.name}</span>
            <span className="block truncate text-sm text-slate-500">{area.city || 'Kigali'}</span>
          </span>
        </span>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors group-enabled:group-hover:border-brand-800 group-enabled:group-hover:bg-brand-800 group-enabled:group-hover:text-white">
          <ArrowUpRight className="size-4" />
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-emerald-50 px-3 py-2.5">
          <dt className="text-xs font-medium text-emerald-700">Available</dt>
          <dd className="text-2xl font-bold tabular text-emerald-800">{area.available}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
          <dt className="text-xs font-medium text-slate-500">Taken</dt>
          <dd className="text-2xl font-bold tabular text-slate-700">{area.taken}</dd>
        </div>
      </dl>

      <div className="mt-4" aria-hidden>
        <div className="h-1.5 overflow-hidden rounded-full bg-emerald-100">
          <div className="h-full rounded-full bg-slate-400" style={{ width: `${letShare}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-slate-500">{total ? `${letShare}% let` : 'No homes yet'}</p>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Monthly rent</p>
        {area.prices.length ? (
          area.prices.map((p) => (
            <p key={p.currency} className="mt-0.5 text-sm font-semibold text-slate-900 tabular">
              {priceRange(p.min, p.max, p.currency)}
            </p>
          ))
        ) : (
          <p className="mt-0.5 text-sm font-medium text-slate-500">Fully let — ask about upcoming homes</p>
        )}
      </div>
    </button>
  )
}

function TypePills({ types, value, onChange }: { types: string[]; value: string; onChange: (t: string) => void }) {
  if (!types.length) return null
  const pill = (active: boolean) =>
    cn(
      'inline-flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition-colors',
      active ? 'bg-brand-900 text-white shadow-sm' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-brand-300',
    )
  return (
    <div className="-mx-1 mt-6 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter by home type">
      <button type="button" className={pill(!value)} aria-pressed={!value} onClick={() => onChange('')}>
        All homes
      </button>
      {types.map((t) => (
        <button key={t} type="button" className={pill(value === t)} aria-pressed={value === t} onClick={() => onChange(value === t ? '' : t)}>
          {UNIT_TYPE_LABEL[t] ?? t}
        </button>
      ))}
    </div>
  )
}

function ActiveFilters({ state, onClear }: { state: Filters; onClear: (k: keyof Filters | 'budget' | 'all') => void }) {
  const chips: [keyof Filters | 'budget', string][] = []
  if (state.location) chips.push(['location', state.location])
  if (state.bedrooms) chips.push(['bedrooms', `${state.bedrooms}+ bedrooms`])
  if (state.currency && (state.min_rent || state.max_rent)) {
    const n = (v: string) => Number(v).toLocaleString()
    const range = state.min_rent && state.max_rent ? `${n(state.min_rent)}–${n(state.max_rent)}` : state.max_rent ? `up to ${n(state.max_rent)}` : `from ${n(state.min_rent)}`
    chips.push(['budget', `${range} ${state.currency}`])
  } else if (state.currency) chips.push(['currency', `Rent in ${state.currency}`])
  if (!chips.length) return null
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      {chips.map(([k, label]) => (
        <button
          key={k}
          type="button"
          onClick={() => onClear(k)}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-brand-50 pl-3 pr-2 font-medium text-brand-800 ring-1 ring-brand-100 hover:bg-brand-100"
          aria-label={`Remove filter: ${label}`}
        >
          {label} <X className="size-3.5" />
        </button>
      ))}
      <button type="button" onClick={() => onClear('all')} className="h-8 px-2 font-semibold text-slate-500 hover:text-slate-800">
        Clear all
      </button>
    </div>
  )
}

function HowItWorks() {
  const steps: [typeof Search, string, string][] = [
    [Search, 'Find your home', 'Browse homes that are genuinely free today, with rent shown upfront.'],
    [CalendarCheck, 'Book a viewing', 'Pick a date that suits you — our team confirms within one working day.'],
    [FileSignature, 'Sign your agreement', 'A clear written agreement, signed digitally and printable as PDF.'],
    [KeyRound, 'Move in', 'Collect your keys, pay rent each month and get a receipt every time.'],
  ]
  return (
    <section className="py-14 sm:py-20">
      <div className="relative mx-auto w-11/12 overflow-hidden rounded-[28px] bg-brand-950 px-6 py-12 sm:px-10 sm:py-16 lg:px-14">
        <div className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full border-[48px] border-white/5" />
        <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full border-[36px] border-gold-400/10" />
        <div className="relative">
          <SectionHead tone="dark" eyebrow="How it works" title="From first look to" accent="moving in" description="Four simple steps, with a real person to help at each one." />
          <ol className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(([Icon, t, d], i) => (
              <li key={t} className="relative rounded-2xl bg-white/[0.06] p-6 ring-1 ring-white/10 transition-colors hover:bg-white/[0.09]">
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-gold-500 text-white">
                    <Icon className="size-5" />
                  </span>
                  <span className="font-display text-5xl italic leading-none text-white/15">0{i + 1}</span>
                </div>
                <p className="mt-6 text-lg font-semibold text-white">{t}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-brand-100/70">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

function AboutSection({ filters }: { filters?: PublicFilters }) {
  const { data: s } = usePublicSettings()
  const about = settingText(s, 'company.about')
  const company = settingText(s, 'company.name', 'Evaramu Group Ltd')
  const values: [typeof KeyRound, string, string][] = [
    [KeyRound, 'Genuinely available', 'Listings disappear the moment a unit is let, so what you see is what you can rent.'],
    [Wallet, 'Transparent rent', 'Monthly rent and currency are shown on every listing — no hidden fees.'],
    [ShieldCheck, 'Written agreements', 'Every tenancy has a clear agreement, receipts and an account you can trust.'],
    [Building2, 'Well maintained', 'Units are inspected and prepared before each new tenant moves in.'],
  ]
  return (
    <section id="about" className="scroll-mt-20 bg-white">
      <div className="mx-auto grid w-11/12 gap-10 pb-14 sm:pb-20 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-5">
          <SectionHead eyebrow="About us" title={company} />
          {about ? <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-slate-600">{about}</p> : null}
          {filters ? (
            <dl className="mt-8 grid grid-cols-2 gap-4">
              {[
                [filters.total_available, 'Homes available now'],
                [filters.locations.length, 'Neighbourhoods in Kigali'],
              ].map(([v, l]) => (
                <div key={l} className="flex flex-col-reverse rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-100">
                  <dt className="mt-1 text-sm text-slate-500">{l}</dt>
                  <dd className="text-3xl font-bold text-brand-900 tabular">{v}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
          {values.map(([Icon, t, d]) => (
            <li key={t} className="group rounded-2xl border border-slate-200 p-6 transition duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[0_18px_40px_-24px_rgb(3_42_78/0.4)]">
              <div className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-800 transition-colors group-hover:bg-brand-900 group-hover:text-white">
                <Icon className="size-5" />
              </div>
              <p className="mt-4 font-semibold text-slate-900">{t}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{d}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function CallToAction() {
  const { data: s } = usePublicSettings()
  const whatsapp = settingText(s, 'contact.whatsapp').replace(/\D/g, '')
  return (
    <section className="bg-white pb-14 sm:pb-20">
      <div className="relative mx-auto flex w-11/12 flex-col items-start gap-6 overflow-hidden rounded-[28px] bg-gradient-to-br from-gold-500 to-gold-700 px-6 py-10 text-white sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-14 lg:py-12">
        <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full border-[40px] border-white/10" />
        <div className="relative max-w-2xl">
          <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Can&rsquo;t find the <Accent>right place</Accent> yet?
          </h2>
          <p className="mt-2 text-white/85">Tell us your budget, area and move-in date. We will call you as soon as a matching home comes up.</p>
        </div>
        <div className="relative flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <a href="#contact" className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 font-semibold text-gold-800 transition-colors hover:bg-gold-50">
            Tell us what you need
          </a>
          {whatsapp ? (
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/40 px-6 font-semibold text-white transition-colors hover:bg-white/10"
            >
              <MessageCircle className="size-4" /> WhatsApp us
            </a>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function ContactSection() {
  const { data: s } = usePublicSettings()
  const phone = settingText(s, 'contact.phone')
  const whatsapp = settingText(s, 'contact.whatsapp').replace(/\D/g, '')
  const email = settingText(s, 'contact.email')
  const address = settingText(s, 'contact.address')
  const hours = settingText(s, 'contact.hours')
  const item = 'flex min-h-12 items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm transition-colors'
  const icon = 'flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-800'
  return (
    <section id="contact" className="scroll-mt-20 bg-slate-50/70">
      <div className="mx-auto grid w-11/12 gap-10 py-14 sm:py-20 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionHead eyebrow="Contact" title="Talk to" accent="our team" description="Ask about a home or arrange a viewing. We usually reply within one working day." />
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {phone ? (
              <li><a href={`tel:${phone.replace(/\s/g, '')}`} className={cn(item, 'hover:border-brand-300')}><span className={icon}><Phone className="size-4" /></span><span><span className="block font-semibold text-slate-900">Call us</span>{phone}</span></a></li>
            ) : null}
            {whatsapp ? (
              <li><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer noopener" className={cn(item, 'hover:border-brand-300')}><span className={cn(icon, 'bg-emerald-50 text-emerald-700')}><MessageCircle className="size-4" /></span><span><span className="block font-semibold text-slate-900">WhatsApp</span>+{whatsapp}</span></a></li>
            ) : null}
            {email ? (
              <li><a href={`mailto:${email}`} className={cn(item, 'hover:border-brand-300')}><span className={icon}><Mail className="size-4" /></span><span className="min-w-0"><span className="block font-semibold text-slate-900">Email</span><span className="break-all">{email}</span></span></a></li>
            ) : null}
            {address ? <li className={item}><span className={icon}><MapPin className="size-4" /></span><span><span className="block font-semibold text-slate-900">Office</span>{address}</span></li> : null}
            {hours ? <li className={item}><span className={icon}><Clock className="size-4" /></span><span><span className="block font-semibold text-slate-900">Hours</span>{hours}</span></li> : null}
          </ul>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-32px_rgb(3_42_78/0.35)] sm:p-8 lg:col-span-7">
          <h3 className="text-lg font-semibold text-slate-900">Send us a message</h3>
          <p className="mb-6 mt-1 text-sm text-slate-500">Tell us what you are looking for — location, budget and move-in date.</p>
          <InquiryForm submitLabel="Send message" />
        </div>
      </div>
    </section>
  )
}

/** A photo file that fails to load is hidden, so the gradient behind it shows instead of a broken image. */
function hideBroken(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = 'none'
}

/** "120,000 – 150,000 RWF" / "$950 – $2,400": the currency is written once for RWF. */
function priceRange(min: string, max: string, currency: string) {
  if (Number(min) === Number(max)) return formatMoney(min, currency)
  if (currency === 'USD') return `${formatMoney(min, currency)} – ${formatMoney(max, currency)}`
  return `${formatMoney(min, currency).replace(` ${currency}`, '')} – ${formatMoney(max, currency)}`
}
