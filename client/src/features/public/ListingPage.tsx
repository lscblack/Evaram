import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Bath, BedDouble, Check, ChevronLeft, ChevronRight, Home, MapPin, Ruler, Sofa, Toilet, X } from 'lucide-react'
import { ApiError, api } from '@/shared/api/client'
import type { PublicListingDetail } from '@/shared/api/types'
import { settingText, usePublicSettings } from '@/shared/lib/brand'
import { PROPERTY_TYPE_LABEL, UNIT_TYPE_LABEL } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { ButtonLink } from '@/shared/ui/Button'
import { EmptyState, ErrorState } from '@/shared/ui/EmptyState'
import { Skeleton } from '@/shared/ui/Spinner'
import { cn } from '@/shared/ui/cn'
import { InquiryForm, ListingPhoto, useDocumentTitle } from './shared'
import { Price, useMoney } from '@/shared/lib/displayCurrency'

export default function ListingPage() {
  const { code = '' } = useParams()
  const { data: s } = usePublicSettings()
  const company = settingText(s, 'company.name', 'Evaramu Group Ltd')
  const q = useQuery({
    queryKey: ['public', 'listing', code],
    queryFn: () => api.publicGet<PublicListingDetail>(`/public/listings/${encodeURIComponent(code)}`),
    retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 2,
  })
  const l = q.data
  useDocumentTitle(l ? `${l.name} (${l.code}) — ${company}` : `Property ${code.toUpperCase()} — ${company}`)

  if (q.error instanceof ApiError && q.error.status === 404) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={Home}
          title="This property is no longer available"
          description="It may have just been let. Have a look at the other homes and rooms we have available."
          action={<ButtonLink to={{ pathname: '/', hash: 'properties' }}>See available properties</ButtonLink>}
        />
      </div>
    )
  }
  if (q.error) return <div className="mx-auto max-w-3xl px-4 py-16"><ErrorState error={q.error} onRetry={q.refetch} /></div>
  if (!l) {
    return (
      <div className="mx-auto w-11/12 space-y-4 py-8">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="aspect-[16/9] w-full rounded-xl" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  const shop = l.unit_type === 'commercial'
  const facts = [
    { icon: Home, label: 'Type', value: UNIT_TYPE_LABEL[l.unit_type] ?? l.unit_type },
    ...(shop
      ? []
      : [
          { icon: BedDouble, label: 'Bedrooms', value: String(l.bedrooms) },
          { icon: Bath, label: 'Bathrooms', value: String(l.bathrooms) },
        ]),
    { icon: Toilet, label: 'Toilet', value: l.toilet === 'shared' ? 'Shared' : 'Own toilet' },
    ...(l.size_sqm ? [{ icon: Ruler, label: 'Size', value: `${Number(l.size_sqm).toLocaleString()} m²` }] : []),
    ...(shop ? [] : [{ icon: Sofa, label: 'Furnishing', value: l.furnished ? 'Furnished' : 'Unfurnished' }]),
  ]

  return (
    <div className="bg-slate-50">
      <div className="mx-auto w-11/12 py-6 sm:py-8">
        <Link to={{ pathname: '/', hash: 'properties' }} className="inline-flex h-10 items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ChevronLeft className="size-4" /> All properties
        </Link>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="success" dot>Available</Badge>
              <span className="text-xs font-semibold uppercase tracking-wide text-gold-600">Code {l.code}</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{l.name}</h1>
            <p className="mt-1 flex items-center gap-1 text-slate-600">
              <MapPin className="size-4 shrink-0" />
              {l.property_name}{l.address_area ? ` · ${l.address_area}` : ''}
            </p>
          </div>
          <ListingPrice amount={l.monthly_rent} currency={l.currency} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Gallery images={l.images} name={l.name} unitType={l.unit_type} />

            <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
              <h2 className="text-base font-semibold text-slate-900">Key details</h2>
              <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {facts.map((f) => (
                  <div key={f.label} className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-800"><f.icon className="size-5" /></div>
                    <div className="min-w-0">
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{f.label}</dt>
                      <dd className="text-sm font-semibold text-slate-900">{f.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </section>

            {l.description || l.property_description ? (
              <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
                <h2 className="text-base font-semibold text-slate-900">About this property</h2>
                {l.description ? <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">{l.description}</p> : null}
                {l.property_description ? (
                  <>
                    <h3 className="mt-5 text-sm font-semibold text-slate-900">
                      {l.property_name} · {PROPERTY_TYPE_LABEL[l.property_type] ?? l.property_type}
                    </h3>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{l.property_description}</p>
                  </>
                ) : null}
              </section>
            ) : null}

            {l.amenities.length ? (
              <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
                <h2 className="text-base font-semibold text-slate-900">Amenities</h2>
                <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {l.amenities.map((a) => (
                    <li key={a} className="flex items-center gap-2 text-sm text-slate-700"><Check className="size-4 shrink-0 text-emerald-600" />{a}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="lg:col-span-1">
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 lg:sticky lg:top-24">
              <h2 className="text-base font-semibold text-slate-900">Request a viewing</h2>
              <p className="mb-5 mt-1 text-sm text-slate-500">Leave your details and our team will call you to arrange a visit.</p>
              <InquiryForm unitCode={l.code} compact />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function Gallery({ images: all, name, unitType }: { images: PublicListingDetail['images']; name: string; unitType: string }) {
  const [index, setIndex] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [broken, setBroken] = useState<ReadonlySet<string>>(new Set())
  const strip = useRef<HTMLDivElement>(null)
  // A photo whose file fails to load is dropped; with none left the placeholder shows.
  const images = all.filter((img) => !broken.has(img.url))
  const count = images.length
  const drop = (url: string) => {
    setBroken((b) => new Set(b).add(url))
    setIndex(0)
  }

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false)
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % count)
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + count) % count)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [lightbox, count])

  if (!count) return <ListingPhoto alt={name} unitType={unitType} className="aspect-[16/10] rounded-xl border border-slate-200" />

  // Phones: native horizontal scroll-snap (swipe). Larger screens: main image + thumbnails.
  const current = images[Math.min(index, count - 1)]!
  const go = (d: number) => setIndex((i) => (i + d + count) % count)
  return (
    <div>
      <div ref={strip} className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 sm:hidden">
        {images.map((img, i) => (
          <button
            key={img.url}
            type="button"
            onClick={() => { setIndex(i); setLightbox(true) }}
            className="relative aspect-[4/3] w-[88%] shrink-0 snap-center overflow-hidden rounded-xl bg-brand-50"
          >
            <img src={img.url} alt={img.caption || `${name} photo ${i + 1}`} loading={i ? 'lazy' : 'eager'} onError={() => drop(img.url)} className="absolute inset-0 size-full object-cover" />
            <span className="absolute bottom-2 right-2 rounded-full bg-slate-900/70 px-2 py-0.5 text-xs font-medium text-white">{i + 1}/{count}</span>
          </button>
        ))}
      </div>

      <div className="hidden sm:block">
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-brand-50">
          <button type="button" onClick={() => setLightbox(true)} className="absolute inset-0" aria-label="Open photo full screen">
            <img src={current.url} alt={current.caption || name} onError={() => drop(current.url)} className="size-full object-cover" />
          </button>
          {count > 1 ? (
            <>
              <GalleryArrow side="left" onClick={() => go(-1)} />
              <GalleryArrow side="right" onClick={() => go(1)} />
              <span className="absolute bottom-3 right-3 rounded-full bg-slate-900/70 px-2.5 py-1 text-xs font-medium text-white">{index + 1} / {count}</span>
            </>
          ) : null}
        </div>
        {count > 1 ? (
          <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto">
            {images.map((img, i) => (
              <button
                key={img.thumb_url}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                className={cn('relative h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-2 ring-offset-1', i === index ? 'ring-brand-700' : 'ring-transparent opacity-80 hover:opacity-100')}
              >
                <img src={img.thumb_url} alt="" loading="lazy" onError={() => drop(img.url)} className="absolute inset-0 size-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {lightbox ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95" role="dialog" aria-modal="true" aria-label="Photos">
          <div className="flex items-center justify-between p-3 text-white">
            <span className="text-sm tabular">{index + 1} / {count}</span>
            <button type="button" onClick={() => setLightbox(false)} aria-label="Close" className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-white/10">
              <X className="size-6" />
            </button>
          </div>
          <div className="relative flex flex-1 items-center justify-center px-2 pb-6">
            <img src={current.url} alt={current.caption || name} className="max-h-full max-w-full object-contain" />
            {count > 1 ? (
              <>
                <GalleryArrow side="left" onClick={() => go(-1)} />
                <GalleryArrow side="right" onClick={() => go(1)} />
              </>
            ) : null}
          </div>
          {current.caption ? <p className="pb-6 text-center text-sm text-slate-300">{current.caption}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

function GalleryArrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous photo' : 'Next photo'}
      className={cn(
        'absolute top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow hover:bg-white',
        side === 'left' ? 'left-3' : 'right-3',
      )}
    >
      <Icon className="size-5" />
    </button>
  )
}

function ListingPrice({ amount, currency }: { amount: string; currency: string }) {
  const { show } = useMoney()
  const p = show(amount, currency)
  return (
    <div className="tabular sm:text-right">
      <p>
        <Price amount={amount} currency={currency} className="text-2xl font-bold text-brand-900 sm:text-3xl" />
        <span className="text-slate-500"> / month</span>
      </p>
      {p.converted ? (
        <p className="mt-0.5 text-sm text-slate-500">
          Listed at <span className="font-semibold text-slate-700">{p.listed}</span> / month — rent is paid in {currency}
        </p>
      ) : null}
    </div>
  )
}
