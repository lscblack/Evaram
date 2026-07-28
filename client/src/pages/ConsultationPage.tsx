import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  Check,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  Video,
} from 'lucide-react'
import { Seo, breadcrumbJsonLd, faqJsonLd } from '@/components/Seo'
import { PageHero } from '@/components/layout/PageHero'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Calendar, type DayState } from '@/components/ui/Calendar'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { FaqSection } from '@/components/sections/FaqSection'
import {
  CLOSED_DATES,
  CONSULTATION_TYPES,
  FULLY_BOOKED_DATES,
  getConsultationType,
} from '@/data/services'
import { getPropertyById } from '@/data/properties'
import { SITE } from '@/data/site'
import { EASE, fadeUp, revealProps, stagger } from '@/lib/motion'
import { cn, seededRandom, toDateKey } from '@/lib/utils'

const BOOKING_FAQS = [
  {
    question: 'Is the first consultation really free?',
    answer:
      'The discovery call, property viewings, Wealth Cycle planning sessions, diaspora briefings and seller valuations are all free. The only paid slot is a construction consultation at RWF 25,000, and that is credited against your build if you go ahead.',
  },
  {
    question: 'What happens after I book?',
    answer:
      'You get a confirmation on WhatsApp and email within minutes, then a reminder the day before. If it is a site visit, your consultant confirms the meeting point. If it is a video call, the link comes with the confirmation.',
  },
  {
    question: 'I am in a different time zone — can you accommodate that?',
    answer:
      'Yes. Diaspora briefings are deliberately scheduled early morning and evening Kigali time so they land in working hours across Europe and North America. All times shown here are Central Africa Time (CAT, UTC+2).',
  },
  {
    question: 'Can I reschedule?',
    answer:
      'Any time, at no cost. Reply to the confirmation message or call us. We would much rather move an appointment than have you sit through one you are not ready for.',
  },
  {
    question: 'Do I need to bring anything?',
    answer:
      'For a seller valuation, your title or UPI if you have it. For a construction consultation, any drawings or photos of the site. For everything else, just come with your questions and a rough idea of your budget.',
  },
]

const MODE_ICONS: Record<string, typeof Phone> = {
  Phone,
  'WhatsApp video': MessageCircle,
  'Google Meet': Video,
  Zoom: Video,
  'On site': MapPin,
  'Live video walkthrough': Video,
  Office: MapPin,
}

export default function ConsultationPage() {
  const [params] = useSearchParams()
  const propertyId = params.get('property')
  const linkedProperty = propertyId ? getPropertyById(Number(propertyId)) : undefined

  const [typeId, setTypeId] = useState(
    () => getConsultationType(params.get('type') ?? '')?.id ?? CONSULTATION_TYPES[0].id,
  )
  const [date, setDate] = useState<Date | null>(null)
  const [slot, setSlot] = useState<string | null>(null)
  const [mode, setMode] = useState<string>('')
  const [confirmed, setConfirmed] = useState(false)

  const type = getConsultationType(typeId) ?? CONSULTATION_TYPES[0]

  // Changing the consultation type invalidates any date/slot already picked.
  useEffect(() => {
    setDate(null)
    setSlot(null)
    setMode(type.mode[0])
  }, [typeId, type.mode])

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const getDayState = (day: Date): DayState => {
    const key = toDateKey(day)
    if (day < today) return 'past'
    if (CLOSED_DATES.includes(key)) return 'closed'
    if (!type.availableDays.includes(day.getDay())) return 'unavailable'
    if (FULLY_BOOKED_DATES.includes(key)) return 'full'
    return 'available'
  }

  /**
   * Static availability: a deterministic subset of each type's slots is marked
   * taken per date, so the calendar behaves realistically without a backend.
   */
  const slotsForDate = useMemo(() => {
    if (!date) return []
    const key = toDateKey(date)
    return type.slots.map((time) => ({
      time,
      taken: seededRandom(`${type.id}-${key}-${time}`) < 0.3,
    }))
  }, [date, type])

  const canConfirm = Boolean(date && slot && mode)

  const formattedDate = date
    ? date.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  const reservationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Property consultation',
    provider: { '@type': 'Organization', name: SITE.name },
    areaServed: { '@type': 'Country', name: 'Rwanda' },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Consultation types',
      itemListElement: CONSULTATION_TYPES.map((c) => ({
        '@type': 'Offer',
        name: c.title,
        description: c.description,
      })),
    },
  }

  return (
    <>
      <Seo
        title="Book a Consultation — Evaramu Group Ltd"
        description="Book a free consultation with Evaramu in Kigali: a discovery call, property viewing, Wealth Cycle planning session, construction consultation or diaspora investment briefing. Pick a date and time that works for you."
        path="/consultation"
        keywords={[
          'book property consultation Kigali',
          'free property valuation Rwanda',
          'property viewing Kigali',
          'diaspora investment briefing Rwanda',
        ]}
        jsonLd={[
          reservationJsonLd,
          faqJsonLd(BOOKING_FAQS),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Book a consultation', path: '/consultation' },
          ]),
        ]}
      />

      <PageHero
        eyebrow="Book a consultation"
        title="Thirty minutes, and an"
        accent="honest answer."
        description="Tell us your budget and what you are trying to achieve. We will tell you plainly whether we can help, what it would realistically cost, and how long it would take. No pressure, no obligation."
        crumbs={[{ label: 'Book a consultation' }]}
        image="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=2000&q=80"
        compact
      />

      <section className="bg-canvas py-16 lg:py-24">
        <div className="container-page">
          {confirmed ? (
            /* ---------------- confirmation ---------------- */
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="mx-auto max-w-2xl"
            >
              <div className="overflow-hidden rounded-4xl border border-line bg-surface shadow-lift">
                <div className="relative overflow-hidden bg-navy-950 px-8 py-12 text-center text-white">
                  <div className="pointer-events-none absolute inset-0 bg-blueprint opacity-60" />
                  <div className="relative">
                    <span className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-500 text-white">
                      <Check className="size-10" strokeWidth={2.6} />
                    </span>
                    <h2 className="mt-7 font-display text-2xl font-semibold">Booking confirmed</h2>
                    <p className="mt-3 text-[0.9375rem] text-white/60">
                      A confirmation is on its way to your WhatsApp and email.
                    </p>
                  </div>
                </div>

                <dl className="divide-y divide-line">
                  {[
                    { label: 'Consultation', value: type.title },
                    { label: 'Date', value: formattedDate ?? '—' },
                    { label: 'Time', value: `${slot} CAT · ${type.duration} minutes` },
                    { label: 'Format', value: mode },
                    { label: 'Fee', value: type.price },
                    linkedProperty
                      ? { label: 'Property', value: linkedProperty.title }
                      : null,
                  ]
                    .filter(Boolean)
                    .map((row) => {
                      const r = row as { label: string; value: string }
                      return (
                        <div
                          key={r.label}
                          className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-8 py-4"
                        >
                          <dt className="text-[0.9375rem] text-ink-muted">{r.label}</dt>
                          <dd className="text-[0.9375rem] font-semibold text-ink">
                            {r.value}
                          </dd>
                        </div>
                      )
                    })}
                </dl>

                <div className="flex flex-wrap gap-3 border-t border-line bg-canvas px-8 py-6">
                  <Button to="/properties" variant="gold">
                    Browse properties meanwhile
                  </Button>
                  <Button
                    onClick={() => {
                      setConfirmed(false)
                      setDate(null)
                      setSlot(null)
                    }}
                    variant="outline"
                  >
                    Book another
                  </Button>
                </div>
              </div>

              <p className="mt-6 text-center text-[0.875rem] text-ink-muted">
                Need to change it? Reply to the confirmation or call{' '}
                <a
                  href={SITE.phoneHref}
                  className="font-semibold text-gold-600 underline-offset-4 hover:underline"
                >
                  {SITE.phone}
                </a>
                . Rescheduling is always free.
              </p>
            </motion.div>
          ) : (
            /* ---------------- booking flow ---------------- */
            <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
              {/* ---- 1. type ---- */}
              <div className="lg:col-span-7 xl:col-span-8">
                <motion.div {...revealProps} variants={stagger(0.07)}>
                  <motion.div variants={fadeUp} className="flex items-center gap-3">
                    <span className="grid size-8 place-items-center rounded-full bg-ink text-[0.8125rem] font-bold text-canvas">
                      1
                    </span>
                    <h2 className="font-display text-xl font-semibold text-ink">
                      What would you like to talk about?
                    </h2>
                  </motion.div>

                  <motion.div
                    variants={stagger(0.06)}
                    className="mt-6 grid gap-3 sm:grid-cols-2"
                  >
                    {CONSULTATION_TYPES.map((option) => {
                      const active = option.id === typeId
                      return (
                        <motion.button
                          key={option.id}
                          variants={fadeUp}
                          type="button"
                          onClick={() => setTypeId(option.id)}
                          aria-pressed={active}
                          className={cn(
                            'flex flex-col rounded-3xl border p-5 text-left transition-all duration-400 ease-brand',
                            active
                              ? 'border-ink bg-ink text-canvas shadow-lift'
                              : 'border-line bg-surface hover:-translate-y-1 hover:border-ink-faint hover:shadow-soft',
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span
                              className={cn(
                                'grid size-11 shrink-0 place-items-center rounded-2xl transition-colors',
                                active ? 'bg-gold-500 text-white' : 'bg-canvas-alt text-ink-soft',
                              )}
                            >
                              <Icon name={option.icon} className="size-5" strokeWidth={2} />
                            </span>
                            <span
                              className={cn(
                                'rounded-full px-2.5 py-1 text-[0.6875rem] font-bold tracking-wide uppercase',
                                active ? 'bg-white/12 text-gold-300' : 'bg-gold-50 text-gold-700',
                              )}
                            >
                              {option.price}
                            </span>
                          </div>

                          <h3
                            className={cn(
                              'mt-4 font-display text-lg leading-snug font-bold',
                              active ? 'text-white' : 'text-ink',
                            )}
                          >
                            {option.title}
                          </h3>
                          <p
                            className={cn(
                              'mt-2 text-[0.875rem] leading-relaxed',
                              active ? 'text-white/60' : 'text-ink-soft',
                            )}
                          >
                            {option.description}
                          </p>

                          <p
                            className={cn(
                              'mt-4 flex items-center gap-1.5 text-[0.8125rem]',
                              active ? 'text-white/50' : 'text-ink-muted',
                            )}
                          >
                            <Clock className="size-3.5" strokeWidth={2.2} />
                            {option.duration} minutes · {option.mode.join(' / ')}
                          </p>
                        </motion.button>
                      )
                    })}
                  </motion.div>
                </motion.div>

                {/* ---- 2. date ---- */}
                <motion.div {...revealProps} variants={stagger(0.07)} className="mt-14">
                  <motion.div variants={fadeUp} className="flex items-center gap-3">
                    <span
                      className={cn(
                        'grid size-8 place-items-center rounded-full text-[0.8125rem] font-bold transition-colors',
                        date ? 'bg-gold-500 text-white' : 'bg-ink text-canvas',
                      )}
                    >
                      {date ? <Check className="size-4" strokeWidth={3} /> : '2'}
                    </span>
                    <h2 className="font-display text-xl font-semibold text-ink">Pick a date</h2>
                  </motion.div>

                  <motion.div variants={fadeUp} className="mt-6 grid gap-6 md:grid-cols-2">
                    <div className="rounded-3xl border border-line bg-surface p-6">
                      <Calendar
                        value={date}
                        onChange={(d) => {
                          setDate(d)
                          setSlot(null)
                        }}
                        getDayState={getDayState}
                      />
                    </div>

                    {/* ---- 3. time ---- */}
                    <div className="rounded-3xl border border-line bg-surface p-6">
                      <div className="flex items-center gap-2.5">
                        <Clock className="size-[1.15rem] text-gold-600" strokeWidth={2.2} />
                        <h3 className="font-display text-lg font-semibold text-ink">
                          Available times
                        </h3>
                      </div>

                      <AnimatePresence mode="wait">
                        {date ? (
                          <motion.div
                            key={toDateKey(date)}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.25, ease: EASE }}
                          >
                            <p className="mt-2 text-[0.875rem] text-ink-muted">
                              {formattedDate} · all times CAT (UTC+2)
                            </p>

                            <div className="mt-6 grid grid-cols-2 gap-2.5">
                              {slotsForDate.map(({ time, taken }) => (
                                <button
                                  key={time}
                                  type="button"
                                  disabled={taken}
                                  onClick={() => setSlot(time)}
                                  className={cn(
                                    'rounded-2xl border py-3 text-[0.9375rem] font-semibold transition-all duration-200',
                                    slot === time
                                      ? 'border-ink bg-ink text-canvas shadow-soft'
                                      : taken
                                        ? 'cursor-not-allowed border-line bg-canvas-alt text-ink-faint line-through'
                                        : 'border-line text-ink hover:-translate-y-0.5 hover:border-gold-500 hover:text-gold-700',
                                  )}
                                >
                                  {time}
                                </button>
                              ))}
                            </div>

                            {slotsForDate.every((s) => s.taken) && (
                              <p className="mt-5 rounded-2xl bg-canvas-alt p-4 text-[0.875rem] leading-relaxed text-ink-soft">
                                Every slot on this date is taken. Try the next available day, or
                                call us — we often fit people in.
                              </p>
                            )}

                            {/* format */}
                            <fieldset className="mt-7 border-t border-line pt-6">
                              <legend className="mb-3 text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">
                                Format
                              </legend>
                              <div className="flex flex-wrap gap-2">
                                {type.mode.map((m) => {
                                  const Cmp = MODE_ICONS[m] ?? Video
                                  return (
                                    <button
                                      key={m}
                                      type="button"
                                      onClick={() => setMode(m)}
                                      className={cn(
                                        'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[0.875rem] font-medium transition-colors',
                                        mode === m
                                          ? 'border-gold-500 bg-gold-500 text-white'
                                          : 'border-line text-ink-soft hover:border-ink-faint',
                                      )}
                                    >
                                      <Cmp className="size-4" strokeWidth={2.2} />
                                      {m}
                                    </button>
                                  )
                                })}
                              </div>
                            </fieldset>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-16 text-center"
                          >
                            <span className="grid size-14 place-items-center rounded-full bg-canvas-alt text-ink-faint">
                              <CalendarDays className="size-6" strokeWidth={1.8} />
                            </span>
                            <p className="mt-5 max-w-xs text-[0.9375rem] leading-relaxed text-ink-muted">
                              Choose a date on the calendar to see the times still open for a{' '}
                              <span className="font-semibold text-ink lowercase">
                                {type.title}
                              </span>
                              .
                            </p>
                            <p className="mt-4 text-[0.8125rem] text-ink-muted">
                              Offered on{' '}
                              {type.availableDays
                                .map(
                                  (d) =>
                                    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d],
                                )
                                .join(', ')}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                </motion.div>
              </div>

              {/* ---- summary / details ---- */}
              <aside className="lg:col-span-5 xl:col-span-4">
                <div className="sticky top-24">
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
                    className="rounded-3xl border border-line bg-surface p-6 shadow-lift sm:p-7"
                  >
                    <div className="flex items-center gap-2.5">
                      <CalendarCheck className="size-5 text-gold-600" strokeWidth={2.2} />
                      <h2 className="font-display text-lg font-semibold text-ink">
                        Your booking
                      </h2>
                    </div>

                    <dl className="mt-6 space-y-4 border-y border-line py-6">
                      {[
                        { label: 'Consultation', value: type.title },
                        { label: 'Duration', value: `${type.duration} minutes` },
                        { label: 'Fee', value: type.price },
                        { label: 'Date', value: formattedDate ?? 'Not chosen yet' },
                        { label: 'Time', value: slot ? `${slot} CAT` : 'Not chosen yet' },
                        { label: 'Format', value: mode || 'Not chosen yet' },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5"
                        >
                          <dt className="text-[0.875rem] text-ink-muted">{row.label}</dt>
                          <dd
                            className={cn(
                              'text-[0.9375rem] font-semibold',
                              row.value.startsWith('Not chosen')
                                ? 'text-ink-faint'
                                : 'text-ink',
                            )}
                          >
                            {row.value}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    {linkedProperty && (
                      <div className="mt-6 flex items-center gap-3 rounded-2xl bg-canvas-alt p-3">
                        <img
                          src={linkedProperty.images[0]?.url}
                          alt=""
                          aria-hidden
                          loading="lazy"
                          className="size-14 shrink-0 rounded-xl object-cover"
                        />
                        <div className="min-w-0">
                          <p className="text-[0.6875rem] font-bold tracking-wide text-ink-muted uppercase">
                            Regarding
                          </p>
                          <p className="truncate text-[0.875rem] font-semibold text-ink">
                            {linkedProperty.title}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* contact fields */}
                    <form
                      className="mt-6 space-y-3"
                      onSubmit={(e) => {
                        e.preventDefault()
                        if (canConfirm) setConfirmed(true)
                      }}
                    >
                      <div>
                        <label htmlFor="c-name" className="sr-only">
                          Your name
                        </label>
                        <input
                          id="c-name"
                          required
                          placeholder="Your full name"
                          className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[0.9375rem] transition-colors placeholder:text-ink-faint focus:border-gold-500 focus:bg-surface focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="c-phone" className="sr-only">
                          Phone or WhatsApp
                        </label>
                        <input
                          id="c-phone"
                          required
                          type="tel"
                          placeholder="Phone or WhatsApp number"
                          className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[0.9375rem] transition-colors placeholder:text-ink-faint focus:border-gold-500 focus:bg-surface focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="c-email" className="sr-only">
                          Email
                        </label>
                        <input
                          id="c-email"
                          type="email"
                          placeholder="Email (optional)"
                          className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[0.9375rem] transition-colors placeholder:text-ink-faint focus:border-gold-500 focus:bg-surface focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="c-notes" className="sr-only">
                          Anything we should know
                        </label>
                        <textarea
                          id="c-notes"
                          rows={3}
                          placeholder="Anything we should know beforehand?"
                          className="w-full resize-y rounded-2xl border border-line bg-canvas px-4 py-3 text-[0.9375rem] transition-colors placeholder:text-ink-faint focus:border-gold-500 focus:bg-surface focus:outline-none"
                        />
                      </div>

                      <Button
                        type="submit"
                        variant="gold"
                        size="lg"
                        className="w-full"
                        disabled={!canConfirm}
                        trailing={
                          <ArrowRight
                            className="size-[1.05rem] transition-transform duration-300 group-hover/btn:translate-x-1"
                            strokeWidth={2.3}
                          />
                        }
                      >
                        {canConfirm ? 'Confirm booking' : 'Pick a date and time'}
                      </Button>
                    </form>

                    <p className="mt-4 text-center text-[0.8125rem] text-ink-muted">
                      Free to reschedule or cancel at any time.
                    </p>
                  </motion.div>

                  <div className="mt-5 rounded-3xl border border-line bg-canvas-alt p-6">
                    <p className="text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">
                      Prefer to just call?
                    </p>
                    <a
                      href={SITE.phoneHref}
                      className="mt-2 flex items-center gap-2.5 font-display text-lg font-semibold text-ink transition-colors hover:text-gold-600"
                    >
                      <Phone className="size-5 text-gold-600" strokeWidth={2.2} />
                      {SITE.phone}
                    </a>
                    <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-soft">
                      {SITE.hours}
                      <br />
                      {SITE.saturdayHours}
                    </p>
                    <Button
                      href={SITE.whatsappHref}
                      variant="outline"
                      className="mt-5 w-full"
                      leading={<MessageCircle className="size-[1.05rem]" strokeWidth={2.2} />}
                    >
                      Message on WhatsApp
                    </Button>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>

      {/* ---------------- what to expect ---------------- */}
      <section className="bg-surface py-16 lg:py-20">
        <div className="container-page">
          <SectionHeading
            eyebrow="What to expect"
            title="No sales pitch."
            accent="Just an assessment."
            description="We would rather tell you honestly that now is not the right time than take you through a process that wastes your money and our reputation."
          />

          <motion.ol
            {...revealProps}
            variants={stagger(0.08)}
            className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {[
              {
                step: '01',
                title: 'We listen first',
                body: 'Your budget, your timeline and what you actually want the property to do for you.',
              },
              {
                step: '02',
                title: 'We give you the numbers',
                body: 'Real comparable prices, realistic yields and what a build would genuinely cost.',
              },
              {
                step: '03',
                title: 'We tell you the risks',
                body: 'Title issues, void periods, cost overruns — everything that could go wrong, said out loud.',
              },
              {
                step: '04',
                title: 'You decide',
                body: 'You leave with a written summary. No deposit, no commitment, no follow-up pressure.',
              },
            ].map((item) => (
              <motion.li
                key={item.step}
                variants={fadeUp}
                className="rounded-3xl border border-line bg-canvas p-7"
              >
                <span className="font-display text-2xl font-semibold text-gold-500">{item.step}</span>
                <h3 className="mt-4 font-display text-lg font-semibold text-ink">{item.title}</h3>
                <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-soft">{item.body}</p>
              </motion.li>
            ))}
          </motion.ol>

          <motion.div
            {...revealProps}
            variants={fadeUp}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Button
              to="/properties"
              variant="outline"
              leading={<ArrowLeft className="size-[1.05rem]" strokeWidth={2.2} />}
            >
              Browse properties first
            </Button>
            <Button to="/wealth-cycle" variant="primary">
              Read about the Wealth Cycle
            </Button>
          </motion.div>
        </div>
      </section>

      <FaqSection
        faqs={BOOKING_FAQS}
        eyebrow="Booking questions"
        title="Before you book,"
        accent="the practicalities."
        description="Fees, formats, time zones and what happens if your plans change."
      />
    </>
  )
}
