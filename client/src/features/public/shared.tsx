import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowUpRight, BedDouble, Bath, Building2, CalendarCheck, CheckCircle2, DoorOpen, Home, ImageOff, MapPin, Ruler, Sofa, Store, Toilet, type LucideIcon } from 'lucide-react'
import { api, errorMessage } from '@/shared/api/client'
import type { PublicListing } from '@/shared/api/types'
import { LOGO } from '@/shared/lib/brand'
import { formatMoney, todayISO, UNIT_TYPE_LABEL } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Field, FormError, FormGrid, Input, Textarea } from '@/shared/ui/Form'
import { cn } from '@/shared/ui/cn'

export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (title) document.title = title
  }, [title])
}

const TYPE_ICON: Record<string, LucideIcon> = {
  house: Home,
  apartment: Building2,
  studio: DoorOpen,
  room: DoorOpen,
  commercial: Store,
}

/**
 * Photo box. Many homes have no photographs yet (or a file fails to load), so
 * the fallback is a designed placeholder: brand gradient, an icon for the type
 * of home and a quiet "photos coming soon" line, never an empty frame.
 */
export function ListingPhoto({ src, alt, className, unitType }: { src?: string | null; alt: string; className?: string; unitType?: string }) {
  const [failed, setFailed] = useState(false)
  const Icon = (unitType && TYPE_ICON[unitType]) || Home
  return (
    <div className={cn('relative overflow-hidden bg-brand-900', className)}>
      {src && !failed ? (
        <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 size-full object-cover" />
      ) : (
        <div role="img" aria-label={`${alt}: no photos yet`} className="absolute inset-0 bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950">
          <div className="absolute -right-10 -top-10 size-40 rounded-full border-[24px] border-gold-400/10" />
          <img src={LOGO.mark} alt="" className="absolute -bottom-5 -left-4 h-28 w-auto opacity-[0.08] brightness-0 invert" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pb-6 text-white">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
              <Icon className="size-7 text-gold-200" strokeWidth={1.6} />
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-white/60">
              <ImageOff className="size-3.5" /> Photos coming soon
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export function ListingCard({
  listing,
  onRequest,
  index = 0,
}: {
  listing: PublicListing
  onRequest?: (l: PublicListing) => void
  /** Position in its grid; staggers the entrance animation. */
  index?: number
}) {
  const href = `/listings/${encodeURIComponent(listing.code)}`
  const size = listing.size_sqm ? Number(listing.size_sqm) : null
  const shop = listing.unit_type === 'commercial'
  return (
    <article
      style={{ '--stat-i': index } as React.CSSProperties}
      className="group flex animate-stat-in flex-col rounded-2xl border border-slate-200/80 bg-white p-2 shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition duration-300 hover:-translate-y-1 hover:border-slate-200 hover:shadow-[0_18px_40px_-18px_rgb(3_42_78/0.35)]"
    >
      <Link to={href} className="block" aria-label={`${listing.name} details`}>
        <div className="relative overflow-hidden rounded-xl">
          <ListingPhoto
            src={listing.cover_url}
            alt={listing.name}
            unitType={listing.unit_type}
            className="aspect-[4/3] [&_img]:transition-transform [&_img]:duration-700 group-hover:[&_img]:scale-105"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent" />
          <div className="absolute left-2.5 top-2.5 flex gap-1.5">
            <Badge tone="success" dot className="bg-white/95 backdrop-blur">Available</Badge>
            {listing.is_featured ? <Badge tone="gold" className="bg-white/95 backdrop-blur">Featured</Badge> : null}
          </div>
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white ring-1 ring-white/30 backdrop-blur-md">
            {UNIT_TYPE_LABEL[listing.unit_type] ?? listing.unit_type}
          </span>
        </div>
      </Link>
      <div className="flex flex-1 flex-col px-2 pb-2 pt-3">
        <h3 className="truncate text-[15px] font-semibold text-slate-900">
          <Link to={href} className="hover:text-brand-700">{listing.name}</Link>
        </h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">{listing.location || listing.property_name}</span>
        </p>
        <div className="mb-3.5 mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-600">
          {shop ? null : (
            <>
              <span className="flex items-center gap-1.5"><BedDouble className="size-4 text-slate-400" />{listing.bedrooms} bed{listing.bedrooms === 1 ? '' : 's'}</span>
              <span className="flex items-center gap-1.5"><Bath className="size-4 text-slate-400" />{listing.bathrooms} bath{listing.bathrooms === 1 ? '' : 's'}</span>
            </>
          )}
          {shop || listing.toilet === 'shared' ? (
            <span className="flex items-center gap-1.5"><Toilet className="size-4 text-slate-400" />{listing.toilet === 'shared' ? 'Shared toilet' : 'Own toilet'}</span>
          ) : null}
          {size ? <span className="flex items-center gap-1.5"><Ruler className="size-4 text-slate-400" />{size} m²</span> : null}
          {listing.furnished ? <span className="flex items-center gap-1.5"><Sofa className="size-4 text-slate-400" />Furnished</span> : null}
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 border-t border-slate-100 pt-3">
          <p className="min-w-0 tabular leading-tight">
            <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-400">Monthly rent</span>
            <span className="text-base font-bold text-brand-900">{formatMoney(listing.monthly_rent, listing.currency)}</span>
          </p>
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={() => onRequest?.(listing)}
              aria-label={`Request a viewing of ${listing.name}`}
              title="Request a viewing"
              className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
            >
              <CalendarCheck className="size-4" />
            </button>
            <Link
              to={href}
              className="inline-flex h-10 items-center gap-1 rounded-full bg-brand-900 pl-4 pr-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
            >
              View <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

const inquirySchema = z.object({
  full_name: z.string().trim().min(2, 'Enter your full name').max(160),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number, e.g. +250 788 123 456'),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email')]),
  preferred_date: z.string().refine((v) => !v || v >= todayISO(), 'Choose a date from today onwards'),
  message: z.string().max(2000),
  website: z.string().max(200),
})
type InquiryValues = z.infer<typeof inquirySchema>

/** Viewing request / general enquiry → POST /public/inquiries. */
export function InquiryForm({ unitCode, compact, submitLabel = 'Send request' }: { unitCode?: string; compact?: boolean; submitLabel?: string }) {
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState, reset } = useForm<InquiryValues>({
    resolver: zodResolver(inquirySchema),
    defaultValues: { full_name: '', phone: '', email: '', preferred_date: '', message: '', website: '' },
  })
  const onSubmit = handleSubmit(async (v) => {
    setError(null)
    try {
      const r = await api.publicPost<{ detail: string }>('/public/inquiries', {
        full_name: v.full_name,
        phone: v.phone,
        email: v.email || null,
        preferred_date: v.preferred_date || null,
        message: v.message,
        unit_code: unitCode ?? null,
        website: v.website,
      })
      setDone(r.detail)
      reset()
    } catch (e) {
      setError(errorMessage(e))
    }
  })
  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center" role="status">
        <CheckCircle2 className="mx-auto size-8 text-emerald-600" />
        <p className="mt-2 font-semibold text-emerald-900">Request received</p>
        <p className="mt-1 text-sm text-emerald-800">{done}</p>
        <Button variant="outline" className="mt-4" onClick={() => setDone(null)}>Send another request</Button>
      </div>
    )
  }
  const e = formState.errors
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormError message={error} />
      {/* Honeypot: hidden from people, filled by bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>Website<input tabIndex={-1} autoComplete="off" {...register('website')} /></label>
      </div>
      <FormGrid cols={compact ? 1 : 2}>
        <Field label="Full name" required error={e.full_name?.message}>
          <Input autoComplete="name" {...register('full_name')} aria-invalid={!!e.full_name} />
        </Field>
        <Field label="Phone number" required error={e.phone?.message}>
          <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="+250 7…" {...register('phone')} aria-invalid={!!e.phone} />
        </Field>
        <Field label="Email (optional)" error={e.email?.message}>
          <Input type="email" inputMode="email" autoComplete="email" {...register('email')} aria-invalid={!!e.email} />
        </Field>
        <Field label="Preferred viewing date" error={e.preferred_date?.message}>
          <Input type="date" min={todayISO()} {...register('preferred_date')} aria-invalid={!!e.preferred_date} />
        </Field>
      </FormGrid>
      <Field label="Message" error={e.message?.message}>
        <Textarea rows={compact ? 3 : 4} placeholder={unitCode ? 'Any questions about this property?' : 'Tell us what you are looking for'} {...register('message')} />
      </Field>
      <Button type="submit" block size="lg" loading={formState.isSubmitting}>{submitLabel}</Button>
    </form>
  )
}
