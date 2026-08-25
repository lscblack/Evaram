import { Suspense, lazy, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

// MapLibre is the better part of a megabyte; a visitor who never scrolls to the
// map should not download it with the page.
const ParcelContext = lazy(() =>
  import('@/components/map/ParcelContext').then((m) => ({ default: m.ParcelContext })),
)
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Bath,
  BedDouble,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileCheck2,
  Hash,
  Heart,
  Landmark,
  Mail,
  MapPin,
  Maximize,
  MessageCircle,
  Phone,
  Play,
  Ruler,
  Share2,
  ShieldCheck,
  Star,
  TrendingUp,
  X,
} from 'lucide-react'
import { Seo, breadcrumbJsonLd } from '@/components/Seo'
import { Button } from '@/components/ui/Button'
import { BiddingPanel } from '@/components/ui/BiddingPanel'
import { Captcha, EMPTY_CAPTCHA, type CaptchaValue } from '@/components/ui/Captcha'
import { ImmersiveViewer } from '@/components/ui/ImmersiveViewer'
import { PropertyCard } from '@/components/ui/PropertyCard'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SpecificationPanel } from '@/components/ui/SpecificationPanel'
import type { ApiCategory, ApiPropertyCard, ApiPropertyDetail } from '@/types/api'
import { api, mediaUrl } from '@/lib/api'
import { useBlock, useQuery } from '@/lib/queries'
import { buildDetailGroups, parseVideoLink } from '@/lib/propertyDetails'
import { EASE, fadeUp, revealProps, stagger } from '@/lib/motion'
import { useSite } from '@/lib/siteConfig'
import { cn, formatArea, formatCurrency, formatDate } from '@/lib/utils'
import NotFoundPage from '@/pages/NotFoundPage'

const STATUS_LABELS: Record<string, string> = {
  available: 'Available',
  reserved: 'Reserved',
  under_offer: 'Under offer',
  sold: 'Sold',
  rented: 'Rented',
  draft: 'Draft',
  pending_review: 'In review',
}

export default function PropertyDetailPage() {
  const block = useBlock('property-detail', 'related', {
    eyebrow: "You may also like",
    title: "Similar properties",
    accent: "worth a look.",
  })
  const site = useSite()
  const { id } = useParams()

  const { data: property, loading, error } = useQuery<ApiPropertyDetail>(
    id ? `/public/properties/${encodeURIComponent(id)}` : null,
  )
  const { data: taxonomy } = useQuery<ApiCategory[]>('/public/taxonomy')
  const { data: related } = useQuery<ApiPropertyCard[]>(
    property ? `/public/properties/${property.id}/related` : null,
  )

  const [activeImage, setActiveImage] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showVideo, setShowVideo] = useState(false)
  const [enquirySent, setEnquirySent] = useState(false)
  const [enquirySending, setEnquirySending] = useState(false)
  const [enquiryError, setEnquiryError] = useState<string | null>(null)
  const [enquiryCaptcha, setEnquiryCaptcha] = useState<CaptchaValue>(EMPTY_CAPTCHA)
  const [enquiry, setEnquiry] = useState({ name: '', contact: '' })

  const detailGroups = useMemo(
    () => (property ? buildDetailGroups(property.details, taxonomy, property.subcategory_id) : []),
    [property, taxonomy],
  )

  if (loading && !property) {
    return (
      <div className="container-page grid min-h-[60dvh] place-items-center">
        <div className="size-8 animate-spin rounded-full border-2 border-line border-t-gold-500" />
      </div>
    )
  }
  if (error || !property) return <NotFoundPage />

  const agent = property.agent
  const video = parseVideoLink(property.video_link)
  const parcel = property.parcel_information
  const images = property.media.filter((m) => m.kind === 'image' || m.kind === 'drone')
  const hasTour = Boolean(property.vr_tour_url || property.video_360_url)

  const bedrooms = property.bedrooms ?? undefined
  const bathrooms = property.bathrooms ?? undefined
  const builtArea = property.built_area ?? undefined
  const constructionYear = property.details?.construction_year as number | undefined

  const price =
    property.intent === 'rent' && property.rent_amount
      ? property.rent_amount
      : (property.price ?? 0)

  const pricePerSqm = property.size ? Math.round(price / property.size) : null

  const copyUpi = async () => {
    try {
      await navigator.clipboard.writeText(property.reference_number)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be blocked — the reference is on screen either way.
    }
  }

  const share = async () => {
    const url = `${site.url}/properties/${property.slug}`
    if (navigator.share) {
      try {
        await navigator.share({ title: property.title, url })
        return
      } catch {
        // user dismissed the share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* no-op */
    }
  }

  const sendEnquiry = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnquirySending(true)
    setEnquiryError(null)
    // One field takes either an email or a phone; route it by the @.
    const isEmail = enquiry.contact.includes('@')
    try {
      await api.post('/public/enquiries', {
        property_id: property.id,
        name: enquiry.name,
        email: isEmail ? enquiry.contact : null,
        phone: isEmail ? null : enquiry.contact,
        message: `Enquiry about ${property.reference_number}`,
        ...enquiryCaptcha,
      })
      setEnquirySent(true)
    } catch (err) {
      setEnquiryError(
        err instanceof Error ? err.message : 'That did not send. Please try again.',
      )
    } finally {
      setEnquirySending(false)
    }
  }

  const step = (delta: number) =>
    setActiveImage((i) => (i + delta + images.length) % images.length)

  const listingJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: property.title,
    description: property.summary,
    image: images.map((i) => i.url),
    sku: property.reference_number,
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency: property.currency,
      availability:
        property.status === 'available'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/LimitedAvailability',
      url: `${site.url}/properties/${property.slug}`,
      seller: { '@type': 'Organization', name: site.name },
    },
  }

  const keyFigures = [
    { icon: Ruler, label: 'Parcel size', value: formatArea(property.size) },
    builtArea ? { icon: Maximize, label: 'Built area', value: `${builtArea} sqm` } : null,
    bedrooms ? { icon: BedDouble, label: 'Bedrooms', value: String(bedrooms) } : null,
    bathrooms ? { icon: Bath, label: 'Bathrooms', value: String(bathrooms) } : null,
    constructionYear ? { icon: Calendar, label: 'Built', value: String(constructionYear) } : null,
    { icon: Landmark, label: 'Land use', value: property.land_use ?? '—' },
  ].filter(Boolean) as { icon: typeof Ruler; label: string; value: string }[]

  return (
    <>
      <Seo
        title={property.title}
        description={property.summary ?? ''}
        path={`/properties/${property.slug}`}
        image={images[0]?.url}
        type="product"
        keywords={[
          property.district ?? '',
          property.sector ?? '',
          property.category_label ?? '',
          property.subcategory_label ?? '',
          `property for ${property.intent} Rwanda`,
        ]}
        jsonLd={[
          listingJsonLd,
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Properties', path: '/properties' },
            { name: property.title, path: `/properties/${property.slug}` },
          ]),
        ]}
      />

      {/* ---------------- gallery ---------------- */}
      <section className="bg-navy-950 pt-6 pb-10 lg:pt-8">
        <div className="container-page">
          <Link
            to="/properties"
            className="group inline-flex items-center gap-2 text-[0.875rem] font-medium text-white/50 transition-colors hover:text-gold-300"
          >
            <ArrowLeft
              className="size-4 transition-transform duration-300 group-hover:-translate-x-1"
              strokeWidth={2.2}
            />
            Back to all properties
          </Link>

          <div className="mt-5 grid gap-3 lg:grid-cols-12">
            {/* main image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: EASE }}
              className="relative overflow-hidden rounded-3xl lg:col-span-8"
            >
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeImage}
                  src={images[activeImage]?.url}
                  alt={`${property.title} — image ${activeImage + 1}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="aspect-16/10 w-full cursor-zoom-in object-cover"
                  onClick={() => setLightbox(true)}
                />
              </AnimatePresence>

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    aria-label="Previous image"
                    className="absolute top-1/2 left-4 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-navy-950/60 text-white backdrop-blur-md transition-colors hover:bg-gold-500"
                  >
                    <ChevronLeft className="size-5" strokeWidth={2.4} />
                  </button>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    aria-label="Next image"
                    className="absolute top-1/2 right-4 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-navy-950/60 text-white backdrop-blur-md transition-colors hover:bg-gold-500"
                  >
                    <ChevronRight className="size-5" strokeWidth={2.4} />
                  </button>
                </>
              )}

              <span className="absolute bottom-4 left-4 rounded-full bg-navy-950/70 px-3 py-1.5 text-[0.8125rem] font-medium text-white backdrop-blur-md">
                {activeImage + 1} / {images.length}
              </span>

              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSaved((v) => !v)}
                  aria-label={saved ? 'Remove from saved' : 'Save property'}
                  aria-pressed={saved}
                  className="grid size-11 place-items-center rounded-full bg-navy-950/60 text-white backdrop-blur-md transition-colors hover:bg-gold-500"
                >
                  <Heart
                    className={cn('size-[1.15rem]', saved && 'fill-gold-400 text-gold-400')}
                    strokeWidth={2.2}
                  />
                </button>
                <button
                  type="button"
                  onClick={share}
                  aria-label="Share property"
                  className="grid size-11 place-items-center rounded-full bg-navy-950/60 text-white backdrop-blur-md transition-colors hover:bg-gold-500"
                >
                  <Share2 className="size-[1.15rem]" strokeWidth={2.2} />
                </button>
              </div>
            </motion.div>

            {/* thumbnails + video */}
            <div className="grid grid-cols-3 gap-3 lg:col-span-4 lg:grid-cols-2">
              {images.slice(0, video || hasTour ? 3 : 4).map((image, i) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  aria-label={`View image ${i + 1}`}
                  className={cn(
                    'group relative overflow-hidden rounded-2xl transition-all duration-300',
                    i === activeImage
                      ? 'ring-2 ring-gold-500 ring-offset-2 ring-offset-navy-950'
                      : 'opacity-70 hover:opacity-100',
                  )}
                >
                  <img
                    src={image.url}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    className="aspect-4/3 w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </button>
              ))}

              {video && (
                <button
                  type="button"
                  onClick={() => setShowVideo(true)}
                  className="group relative overflow-hidden rounded-2xl"
                >
                  <img
                    src={video.thumb}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    className="aspect-4/3 w-full object-cover"
                  />
                  <span className="absolute inset-0 grid place-items-center bg-navy-950/55 transition-colors group-hover:bg-navy-950/35">
                    <span className="grid size-12 place-items-center rounded-full bg-gold-500 text-white transition-transform duration-300 group-hover:scale-110">
                      <Play className="size-5 fill-white" strokeWidth={0} />
                    </span>
                  </span>
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950 to-transparent p-3 text-left text-[0.75rem] font-semibold text-white">
                    Property tour video
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- body ---------------- */}
      <section className="bg-canvas pb-20 lg:pb-28">
        <div className="container-page">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
            {/* ---- main column ---- */}
            <div className="lg:col-span-8">
              <motion.div {...revealProps} variants={stagger(0.07)} className="pt-8">
                <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={cn(
                      'rounded-full px-3 py-1.5 text-[0.6875rem] font-bold tracking-wide uppercase',
                      property.status === 'available'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gold-500 text-white',
                    )}
                  >
                    {STATUS_LABELS[property.status] ?? property.status}
                  </span>
                  <span className="rounded-full bg-ink px-3 py-1.5 text-[0.6875rem] font-bold tracking-wide text-canvas uppercase">
                    For {property.intent}
                  </span>
                  <span className="rounded-full border border-line-strong px-3 py-1.5 text-[0.6875rem] font-bold tracking-wide text-ink-soft uppercase">
                    {property.category_label} · {property.subcategory_label}
                  </span>
                  {property.is_verified && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[0.6875rem] font-bold tracking-wide text-emerald-700 uppercase">
                      <ShieldCheck className="size-3.5" strokeWidth={2.6} />
                      NLA verified
                    </span>
                  )}
                </motion.div>

                <motion.h1
                  variants={fadeUp}
                  className="mt-5 text-[1.75rem] leading-[1.18] font-semibold text-ink sm:text-[2.125rem] lg:text-[2.5rem]"
                >
                  {property.title}
                </motion.h1>

                <motion.p
                  variants={fadeUp}
                  className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-soft"
                >
                  <MapPin className="size-[1.15rem] text-gold-500" strokeWidth={2.2} />
                  {[property.village, property.cell, property.sector, property.district]
                    .filter(Boolean)
                    .join(' · ')}
                </motion.p>

                <motion.dl
                  variants={fadeUp}
                  className="mt-8 grid grid-cols-2 gap-4 rounded-3xl border border-line bg-surface p-6 sm:grid-cols-4"
                >
                  {keyFigures.slice(0, 4).map((figure) => {
                    const Cmp = figure.icon
                    return (
                      <div key={figure.label}>
                        <dt className="flex items-center gap-1.5 text-[0.75rem] font-semibold tracking-wide text-ink-muted uppercase">
                          <Cmp className="size-3.5" strokeWidth={2.2} />
                          {figure.label}
                        </dt>
                        <dd className="mt-1.5 font-display text-lg font-semibold text-ink">
                          {figure.value}
                        </dd>
                      </div>
                    )
                  })}
                </motion.dl>
              </motion.div>

              {/* overview */}
              <motion.div {...revealProps} variants={fadeUp} className="mt-12">
                <h2 className="font-display text-xl font-semibold text-ink">
                  About this property
                </h2>
                <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-soft">
                  {property.summary}
                </p>

                {(property.tags?.length ?? 0) > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {(property.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-line-strong bg-surface px-3.5 py-1.5 text-[0.8125rem] font-medium text-ink-soft"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* virtual tour · 360 video · surveyed outline */}
              <motion.div {...revealProps} variants={fadeUp} className="mt-12">
                <ImmersiveViewer property={property} />
              </motion.div>

              {/* where it is, and what is around it */}
              {property.show_on_map && (
                <motion.div {...revealProps} variants={fadeUp} className="mt-12">
                  <Suspense
                    fallback={
                      <div className="grid h-64 place-items-center rounded-3xl border border-line bg-surface text-[0.875rem] text-ink-muted">
                        Loading the map…
                      </div>
                    }
                  >
                    <ParcelContext slug={property.slug} title={property.title} />
                  </Suspense>
                </motion.div>
              )}

              {/* parcel information */}
              {parcel && (
                <motion.div {...revealProps} variants={fadeUp} className="mt-12">
                  <div className="overflow-hidden rounded-3xl border border-line bg-surface">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-navy-950 px-6 py-5 text-white sm:px-8">
                      <div className="flex items-center gap-3">
                        <FileCheck2 className="size-5 text-gold-400" strokeWidth={2.2} />
                        <h2 className="font-display text-lg font-semibold">Parcel information</h2>
                      </div>
                      {parcel.verified_on && (
                        <span className="text-[0.8125rem] text-white/55">
                          Verified {formatDate(String(parcel.verified_on))} · {String(parcel.registrar)}
                        </span>
                      )}
                    </div>

                    <dl className="grid gap-x-8 gap-y-5 px-6 py-7 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
                      <div className="sm:col-span-2 lg:col-span-1">
                        <dt className="text-[0.75rem] font-semibold tracking-wide text-ink-muted uppercase">
                          Reference
                        </dt>
                        <dd className="mt-1.5 flex items-center gap-2">
                          <span className="font-mono text-[0.9375rem] font-semibold text-ink">
                            {property.reference_number}
                          </span>
                          <button
                            type="button"
                            onClick={copyUpi}
                            aria-label="Copy reference"
                            className="grid size-7 place-items-center rounded-lg bg-canvas-alt text-ink-soft transition-colors hover:bg-gold-500 hover:text-white"
                          >
                            {copied ? (
                              <Check className="size-3.5" strokeWidth={2.6} />
                            ) : (
                              <Copy className="size-3.5" strokeWidth={2.2} />
                            )}
                          </button>
                        </dd>
                      </div>

                      {[
                        { label: 'Province', value: parcel.province },
                        { label: 'District', value: parcel.district },
                        { label: 'Sector', value: parcel.sector },
                        { label: 'Cell', value: parcel.cell },
                        { label: 'Village', value: parcel.village },
                        { label: 'Land use', value: property.land_use ?? parcel.land_use },
                        { label: 'Master plan zone', value: property.master_plan_zone },
                        { label: 'Zone allows', value: property.master_plan_note },
                        {
                          label: 'Parcel size',
                          value: parcel.parcel_size
                            ? formatArea(Number(parcel.parcel_size))
                            : undefined,
                        },
                        { label: 'Tenure', value: property.right_type ?? parcel.tenure },
                        { label: 'Lease period', value: parcel.lease_period },
                        { label: 'Parcel ID', value: property.parcel_id },
                        { label: 'GIS coordinates', value: property.gis_coordinates },
                      ]
                        .filter((row) => row.value)
                        .map((row) => (
                          <div key={row.label}>
                            <dt className="text-[0.75rem] font-semibold tracking-wide text-ink-muted uppercase">
                              {row.label}
                            </dt>
                            <dd className="mt-1.5 text-[0.9375rem] font-medium text-ink">
                              {String(row.value)}
                            </dd>
                          </div>
                        ))}
                    </dl>

                    {property.master_plan_doc_url && (
                      <div className="border-t border-line px-6 py-5 sm:px-8">
                        <p className="text-[0.75rem] font-semibold tracking-wide text-ink-muted uppercase">
                          Master plan extract
                        </p>
                        <a
                          href={mediaUrl(property.master_plan_doc_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2.5 block overflow-hidden rounded-2xl border border-line"
                        >
                          <img
                            src={mediaUrl(property.master_plan_doc_url)}
                            alt="Master plan extract for this parcel"
                            loading="lazy"
                            // Extracts are wide and irregular — contained rather
                            // than cropped, and capped so one never takes over
                            // the page.
                            className="max-h-[26rem] w-full bg-canvas-alt object-contain"
                          />
                        </a>
                      </div>
                    )}

                    <p className="flex items-start gap-2.5 border-t border-line bg-canvas px-6 py-4 text-[0.8125rem] leading-relaxed text-ink-muted sm:px-8">
                      <ShieldCheck
                        className="mt-0.5 size-4 shrink-0 text-emerald-600"
                        strokeWidth={2.2}
                      />
                      This parcel was checked against its UPI at the National Land Authority before
                      listing. We re-run the search within 30 days of any transaction and share the
                      result with you in writing.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* dynamic specification */}
              {detailGroups.length > 0 && (
                <motion.div {...revealProps} variants={stagger(0.08)} className="mt-12">
                  <motion.h2
                    variants={fadeUp}
                    className="font-display text-xl font-semibold text-ink"
                  >
                    Full specification
                  </motion.h2>

                  <motion.div variants={fadeUp} className="mt-6">
                    <SpecificationPanel groups={detailGroups} />
                  </motion.div>
                </motion.div>
              )}

              {/* location — only where the interactive map is withheld, since it
                  answers the same question far better wherever it is shown */}
              {!property.show_on_map && (
                <motion.div {...revealProps} variants={fadeUp} className="mt-12">
                  <h2 className="font-display text-xl font-semibold text-ink">Location</h2>
                  <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
                    {property.location} — {property.district} District. The owner has asked us not
                    to publish the exact position; boundaries are walked with you at the viewing.
                  </p>
                </motion.div>
              )}

              {/* wealth cycle projection */}
              <motion.div {...revealProps} variants={fadeUp} className="mt-12">
                <div className="relative overflow-hidden rounded-3xl bg-navy-950 p-8 text-white sm:p-10">
                  <div className="pointer-events-none absolute inset-0 bg-blueprint opacity-60" />
                  <div className="relative">
                    <div className="flex items-center gap-2.5">
                      <TrendingUp className="size-5 text-gold-400" strokeWidth={2.2} />
                      <h2 className="font-display text-xl font-semibold">
                        What the Wealth Cycle could do with this
                      </h2>
                    </div>
                    <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-white/60">
                      An indicative projection using this corridor's appreciation rate and our
                      average post-build uplift. Not a guarantee — a starting point for a
                      conversation.
                    </p>

                    <dl className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        { label: 'Today', value: formatCurrency(price, property.currency) },
                        {
                          label: 'After a Premium build',
                          value: formatCurrency(Math.round(price * 1.35), property.currency),
                        },
                        {
                          label: 'Year 3 value',
                          value: formatCurrency(
                            Math.round(
                              price * 1.35 * (1 + (property.appreciation ?? 10) / 100) ** 3,
                            ),
                            property.currency,
                          ),
                        },
                        {
                          label: 'Indicative annual yield',
                          value: property.projected_yield
                            ? `${property.projected_yield}%`
                            : 'Land — no yield yet',
                        },
                      ].map((item) => (
                        <div key={item.label} className="border-t border-white/10 pt-5">
                          <dt className="text-[0.75rem] font-semibold tracking-wide text-white/45 uppercase">
                            {item.label}
                          </dt>
                          <dd className="mt-2 font-display text-xl leading-tight font-bold text-gold-400">
                            {item.value}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    <Button to="/wealth-cycle" variant="gold" className="mt-8">
                      How the Wealth Cycle works
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* ---- sticky sidebar ---- */}
            <aside className="lg:col-span-4">
              <div className="sticky top-24 space-y-5 pt-8">
                {/* offers — only rendered when the listing invites them */}
                <BiddingPanel property={property} />

                {/* the owner's details, shown only where they have opted in */}
                {property.show_owner_info && property.owner_name && (
                  <div className="rounded-3xl border border-line bg-surface p-6">
                    <p className="text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">
                      Listed by the owner
                    </p>
                    <p className="mt-2 font-display text-[1.0625rem] font-semibold text-ink">
                      {property.owner_name}
                    </p>
                    {property.owner_contact && (
                      <a
                        href={`tel:${property.owner_contact.replace(/\s/g, '')}`}
                        className="mt-1 inline-flex items-center gap-2 text-[0.875rem] text-ink-soft transition-colors hover:text-gold-600"
                      >
                        <Phone className="size-3.5" strokeWidth={2.2} />
                        {property.owner_contact}
                      </a>
                    )}
                    <p className="mt-3 text-[0.75rem] leading-relaxed text-ink-faint">
                      Shared with the owner's consent. We still handle the paperwork.
                    </p>
                  </div>
                )}

                {/* price card */}
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
                  className="rounded-3xl border border-line bg-surface p-6 shadow-lift sm:p-7"
                >
                  <p className="text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">
                    {property.intent === 'rent' ? 'Monthly rent' : 'Asking price'}
                  </p>
                  <p className="mt-1.5 font-display text-[1.75rem] leading-none font-semibold text-ink">
                    {formatCurrency(price, property.currency)}
                    {property.intent === 'rent' && (
                      <span className="ml-1.5 font-sans text-base font-medium text-ink-muted">
                        /mo
                      </span>
                    )}
                  </p>
                  {pricePerSqm ? (
                    <p className="mt-2 text-[0.875rem] text-ink-muted">
                      {formatCurrency(pricePerSqm, property.currency)} per sqm
                    </p>
                  ) : null}

                  <div className="mt-6 flex items-center gap-2 rounded-2xl bg-canvas-alt px-4 py-3">
                    <Hash className="size-4 shrink-0 text-gold-600" strokeWidth={2.4} />
                    <span className="font-mono text-[0.8125rem] font-medium text-ink-soft">
                      {property.reference_number}
                    </span>
                  </div>

                  <div className="mt-6 space-y-3">
                    <Button
                      to={`/consultation?type=viewing&property=${property.id}`}
                      variant="gold"
                      size="lg"
                      className="w-full"
                      leading={<Calendar className="size-[1.05rem]" strokeWidth={2.2} />}
                    >
                      Book a viewing
                    </Button>
                    <Button
                      href={`${site.whatsappHref}?text=${encodeURIComponent(
                        `Hello Evaramu, I'm interested in ${property.title} (ref ${property.reference_number}).`,
                      )}`}
                      variant="outline"
                      size="lg"
                      className="w-full"
                      leading={<MessageCircle className="size-[1.05rem]" strokeWidth={2.2} />}
                    >
                      Ask on WhatsApp
                    </Button>
                  </div>

                  <p className="mt-5 flex items-start gap-2 text-[0.8125rem] leading-snug text-ink-muted">
                    <ShieldCheck
                      className="mt-0.5 size-4 shrink-0 text-emerald-600"
                      strokeWidth={2.2}
                    />
                    Title verified before listing. Payments only to our registered company account,
                    receipted the same day.
                  </p>
                </motion.div>

                {/* agent card */}
                {agent && (
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: EASE, delay: 0.25 }}
                    className="rounded-3xl border border-line bg-surface p-6 sm:p-7"
                  >
                    <p className="text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">
                      Your consultant
                    </p>

                    <div className="mt-4 flex items-center gap-4">
                      <img
                        src={agent.photo_url ?? undefined}
                        alt=""
                        aria-hidden
                        loading="lazy"
                        className="size-16 shrink-0 rounded-2xl object-cover"
                      />
                      <div className="min-w-0">
                        <p className="font-display text-[1.0625rem] font-semibold text-ink">{agent.full_name}</p>
                        <p className="text-[0.875rem] text-ink-muted">{agent.job_title}</p>
                        <p className="mt-1 flex items-center gap-1 text-[0.8125rem] text-ink-soft">
                          <Star className="size-3.5 fill-gold-400 text-gold-400" strokeWidth={0} />
                          {agent.rating} · {agent.deals_closed} deals closed
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-[0.8125rem] text-ink-muted">
                      Speaks {(agent.languages ?? []).join(', ')}
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-2.5">
                      <a
                        href={`tel:${(agent.phone ?? '').replace(/\s/g, '')}`}
                        className="flex h-11 items-center justify-center gap-2 rounded-full border border-line text-[0.875rem] font-semibold text-ink transition-colors hover:border-ink-muted"
                      >
                        <Phone className="size-4" strokeWidth={2.2} />
                        Call
                      </a>
                      <a
                        href={`mailto:${agent.email}`}
                        className="flex h-11 items-center justify-center gap-2 rounded-full border border-line text-[0.875rem] font-semibold text-ink transition-colors hover:border-ink-muted"
                      >
                        <Mail className="size-4" strokeWidth={2.2} />
                        Email
                      </a>
                    </div>
                  </motion.div>
                )}

                {/* enquiry form */}
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: EASE, delay: 0.35 }}
                  className="rounded-3xl border border-line bg-canvas-alt p-6 sm:p-7"
                >
                  <h3 className="font-display text-lg font-semibold text-ink">
                    Request the full file
                  </h3>
                  <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-soft">
                    Title search, parcel map, photographs and our written assessment — sent within
                    two working hours.
                  </p>

                  {enquirySent ? (
                    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" strokeWidth={3} />
                      <p className="text-[0.875rem] leading-snug text-emerald-800">
                        Request received. {agent?.full_name ?? 'Your consultant'} will be in touch within
                        two working hours.
                      </p>
                    </div>
                  ) : (
                    <form
                      className="mt-5 space-y-3"
                      onSubmit={sendEnquiry}
                    >
                      <label htmlFor="enq-name" className="sr-only">
                        Your name
                      </label>
                      <input
                        id="enq-name"
                        required
                        value={enquiry.name}
                        onChange={(e) => setEnquiry((v) => ({ ...v, name: e.target.value }))}
                        placeholder="Your name"
                        className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-[0.9375rem] text-ink transition-colors placeholder:text-ink-faint focus:border-gold-500 focus:outline-none"
                      />
                      <label htmlFor="enq-contact" className="sr-only">
                        Email or phone
                      </label>
                      <input
                        id="enq-contact"
                        required
                        value={enquiry.contact}
                        onChange={(e) => setEnquiry((v) => ({ ...v, contact: e.target.value }))}
                        placeholder="Email or phone number"
                        className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-[0.9375rem] text-ink transition-colors placeholder:text-ink-faint focus:border-gold-500 focus:outline-none"
                      />
                      <Captcha value={enquiryCaptcha} onChange={setEnquiryCaptcha} scope="enquiry" compact />

                      {enquiryError && (
                        <p
                          role="alert"
                          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[0.8125rem] text-red-700"
                        >
                          {enquiryError}
                        </p>
                      )}

                      <Button
                        type="submit"
                        variant="primary"
                        className="w-full"
                        disabled={enquirySending}
                      >
                        {enquirySending ? 'Sending…' : 'Send request'}
                      </Button>
                    </form>
                  )}
                </motion.div>
              </div>
            </aside>
          </div>

          {/* related */}
          {(related?.length ?? 0) > 0 && (
            <div className="mt-20 lg:mt-28">
              <SectionHeading
                eyebrow={block.eyebrow}
                title={block.title}
                accent={block.accent}
                action={
                  <Button
                    to="/properties"
                    variant="outline"
                    trailing={<ArrowRight className="size-[1.05rem]" strokeWidth={2.3} />}
                  >
                    All properties
                  </Button>
                }
              />
              <motion.div
                {...revealProps}
                variants={stagger(0.08)}
                className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              >
                {(related ?? []).map((p, i) => (
                  <PropertyCard key={p.id} property={p} index={i} />
                ))}
              </motion.div>
            </div>
          )}
        </div>
      </section>

      {/* ---------------- lightbox ---------------- */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center bg-navy-950/95 p-4"
            onClick={() => setLightbox(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Image viewer"
          >
            <button
              type="button"
              onClick={() => setLightbox(false)}
              aria-label="Close viewer"
              className="absolute top-5 right-5 grid size-12 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="size-6" strokeWidth={2.2} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                step(-1)
              }}
              aria-label="Previous image"
              className="absolute left-4 grid size-12 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-8"
            >
              <ChevronLeft className="size-6" strokeWidth={2.2} />
            </button>

            <motion.img
              key={activeImage}
              src={images[activeImage]?.url}
              alt={`${property.title} — image ${activeImage + 1}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85dvh] max-w-full rounded-2xl object-contain"
            />

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                step(1)
              }}
              aria-label="Next image"
              className="absolute right-4 grid size-12 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-8"
            >
              <ChevronRight className="size-6" strokeWidth={2.2} />
            </button>

            <span className="absolute bottom-6 rounded-full bg-white/10 px-4 py-2 text-[0.875rem] text-white">
              {activeImage + 1} / {images.length}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- video modal ---------------- */}
      <AnimatePresence>
        {showVideo && video && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center bg-navy-950/95 p-4"
            onClick={() => setShowVideo(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Property video"
          >
            <button
              type="button"
              onClick={() => setShowVideo(false)}
              aria-label="Close video"
              className="absolute top-5 right-5 grid size-12 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="size-6" strokeWidth={2.2} />
            </button>
            <div
              className="aspect-video w-full max-w-5xl overflow-hidden rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                title={`${property.title} video tour`}
                src={video.embed}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="size-full border-0"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
