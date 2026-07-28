import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Handshake,
  Info,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Seo, breadcrumbJsonLd, faqJsonLd } from '@/components/Seo'
import { PageHero } from '@/components/layout/PageHero'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { DynamicField, type FormValues, type FieldValue } from '@/components/ui/DynamicField'
import { FaqSection } from '@/components/sections/FaqSection'
import { FORM_CONFIG, TOTAL_FORMS, isFieldVisible } from '@/data/formConfig'
import { DISTRICTS } from '@/data/properties'
import { EASE, fadeUp, revealProps, stagger } from '@/lib/motion'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 'type', title: 'Property type', description: 'What are you listing?' },
  { id: 'parcel', title: 'Parcel details', description: 'UPI and location' },
  { id: 'spec', title: 'Specification', description: 'The specifics of this property' },
  { id: 'price', title: 'Price & media', description: 'What you want for it' },
  { id: 'contact', title: 'Your details', description: 'How we reach you' },
]

const SELL_FAQS = [
  {
    question: 'What does it cost to list with you?',
    answer:
      'Nothing up front. The valuation visit, the pricing strategy, the professional photography and the drone video are all included. Commission is agreed in writing before we start and is only earned on completion.',
  },
  {
    question: 'How long does it take to sell?',
    answer:
      'It depends entirely on the price and the property, and anyone who gives you a number without seeing it is guessing. What we can promise is that we will qualify every buyer before they visit, so you are not showing your property to people who cannot afford it.',
  },
  {
    question: 'Do I need my title in hand before listing?',
    answer:
      'You need to be the registered owner or hold a written mandate from them. We will run the RLA search ourselves as part of onboarding — if there is a problem with the title, far better that we find it now than three weeks into a sale.',
  },
  {
    question: 'Can I list a property I have not finished building?',
    answer:
      'Yes, and it is worth talking to our construction division first. Finishing a shell to a lettable standard usually adds considerably more value than it costs, which changes what the property is worth on the open market.',
  },
  {
    question: 'What if I change my mind?',
    answer:
      'You can withdraw at any time before you accept an offer. We do not tie sellers into exclusivity periods that trap them — if we are not performing, you should be free to leave.',
  },
]

const WHY_LIST = [
  {
    icon: 'Camera',
    title: 'Marketed properly',
    body: 'Drone video, professional photography and a mapped online listing — instead of phone snapshots in a WhatsApp group.',
  },
  {
    icon: 'ShieldCheck',
    title: 'Buyers qualified first',
    body: 'We check that a buyer can actually fund the purchase before they set foot on your property. Fewer viewings, better ones.',
  },
  {
    icon: 'FileCheck2',
    title: 'Documented throughout',
    body: 'Digital contracts, receipts for every payment and a written record of every offer. No verbal deals, no disputes.',
  },
  {
    icon: 'Handshake',
    title: 'Commission in writing',
    body: 'Agreed before any work begins and only earned when the sale completes. You are never billed for marketing that did not sell.',
  },
]

export default function SellPage() {
  const [step, setStep] = useState(0)
  const [categoryId, setCategoryId] = useState<string>('')
  const [subCategoryId, setSubCategoryId] = useState<string>('')
  const [values, setValues] = useState<FormValues>({})
  const [submitted, setSubmitted] = useState(false)

  const category = FORM_CONFIG.find((c) => c.id === categoryId)
  const subCategory = category?.subCategories.find((s) => s.id === subCategoryId)

  const setValue = (name: string, value: FieldValue) =>
    setValues((prev) => ({ ...prev, [name]: value }))

  /** Only the fields whose `conditional` currently passes. */
  const visibleFields = useMemo(
    () => (subCategory ? subCategory.fields.filter((f) => isFieldVisible(f, values)) : []),
    [subCategory, values],
  )

  const canAdvance = () => {
    if (step === 0) return Boolean(categoryId && subCategoryId)
    if (step === 1) return Boolean(values.upi && values.district)
    if (step === 3) return Boolean(values.estimated_amount)
    if (step === 4) return Boolean(values.owner_name && values.contact)
    return true
  }

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const back = () => setStep((s) => Math.max(s - 1, 0))

  const filledCount = Object.values(values).filter(
    (v) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0),
  ).length

  return (
    <>
      <Seo
        title="Sell or List Your Property in Rwanda"
        description="List your land, house or commercial property with Evaramu. Free valuation, drone video and professional photography included, buyers qualified before viewing, and commission agreed in writing before we start."
        path="/sell"
        keywords={[
          'sell my land Rwanda',
          'sell house Kigali',
          'list property Rwanda',
          'property valuation Kigali',
          'estate agent Rwanda commission',
        ]}
        jsonLd={[
          faqJsonLd(SELL_FAQS),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Sell a property', path: '/sell' },
          ]),
        ]}
      />

      <PageHero
        eyebrow="Sell with Evaramu"
        title="Your property deserves better than"
        accent="a blurry photo in a group chat."
        description="Tell us about it below and we will come back within two working hours with a valuation appointment. No listing fee, no exclusivity trap, and commission agreed in writing before anything begins."
        crumbs={[{ label: 'Sell a property' }]}
        image="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=2000&q=80"
        stats={[
          { value: 'Free', label: 'Valuation and marketing' },
          { value: `${TOTAL_FORMS}`, label: 'Property types we handle' },
          { value: '2h', label: 'Response to every submission' },
          { value: '0', label: 'Upfront cost to you' },
        ]}
      />

      {/* ---------------- why list with us ---------------- */}
      <section className="bg-canvas py-16 lg:py-20">
        <div className="container-page">
          <SectionHeading
            eyebrow="Why list with us"
            title="Professionalism is the"
            accent="entire differentiator."
            description="There are more than 200 informal brokers in Rwanda. What almost none of them offer is documentation, marketing that works and a buyer who has actually been qualified."
          />

          <motion.div
            {...revealProps}
            variants={stagger(0.08)}
            className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {WHY_LIST.map((item) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                className="group rounded-3xl border border-line bg-surface p-7 transition-all duration-500 ease-brand hover:-translate-y-1.5 hover:shadow-lift"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-navy-900 text-gold-400 transition-colors duration-500 group-hover:bg-gold-500 group-hover:text-white">
                  <Icon name={item.icon} className="size-[1.35rem]" strokeWidth={2} />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold text-ink">{item.title}</h3>
                <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-soft">{item.body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ---------------- listing wizard ---------------- */}
      <section id="list" className="bg-surface py-16 lg:py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow="List your property"
            title="Five steps."
            accent="Roughly four minutes."
            description="The form adapts to what you are listing — a forest plot asks about crop coverage, an apartment block asks about units and rents. You only ever see the questions that apply to you."
          />

          <div className="mt-14 grid gap-8 lg:grid-cols-12 lg:gap-10">
            {/* ---- stepper ---- */}
            <aside className="lg:col-span-3">
              <div className="sticky top-24">
                <ol className="relative space-y-1">
                  <span
                    aria-hidden
                    className="absolute top-6 bottom-6 left-5.5 w-px bg-navy-100"
                  />
                  {STEPS.map((s, i) => {
                    const state = i === step ? 'current' : i < step ? 'done' : 'todo'
                    return (
                      <li key={s.id} className="relative">
                        <button
                          type="button"
                          onClick={() => i < step && setStep(i)}
                          disabled={i > step}
                          className={cn(
                            'flex w-full items-start gap-4 rounded-2xl p-3 text-left transition-colors',
                            state === 'current' && 'bg-canvas-alt',
                            i < step && 'cursor-pointer hover:bg-canvas',
                            i > step && 'cursor-default',
                          )}
                        >
                          <span
                            className={cn(
                              'relative z-10 grid size-9 shrink-0 place-items-center rounded-full text-[0.8125rem] font-bold transition-colors',
                              state === 'done' && 'bg-gold-500 text-white',
                              state === 'current' && 'bg-ink text-canvas',
                              state === 'todo' && 'border border-line bg-surface text-ink-faint',
                            )}
                          >
                            {state === 'done' ? (
                              <Check className="size-4" strokeWidth={3} />
                            ) : (
                              i + 1
                            )}
                          </span>
                          <span className="min-w-0 pt-1">
                            <span
                              className={cn(
                                'block text-[0.9375rem] font-semibold',
                                state === 'todo' ? 'text-ink-muted' : 'text-ink',
                              )}
                            >
                              {s.title}
                            </span>
                            <span className="mt-0.5 block text-[0.8125rem] leading-snug text-ink-muted">
                              {s.description}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ol>

                <div className="mt-6 rounded-2xl border border-line bg-canvas p-5">
                  <p className="text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">
                    Progress
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-navy-100">
                    <motion.div
                      className="h-full rounded-full bg-gold-500"
                      animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                      transition={{ duration: 0.5, ease: EASE }}
                    />
                  </div>
                  <p className="mt-3 text-[0.8125rem] text-ink-muted">
                    Step {step + 1} of {STEPS.length} · {filledCount} fields completed
                  </p>
                </div>
              </div>
            </aside>

            {/* ---- form panel ---- */}
            <div className="lg:col-span-9">
              <div className="rounded-3xl border border-line bg-canvas p-6 sm:p-9">
                {submitted ? (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center py-16 text-center"
                  >
                    <span className="grid size-20 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                      <Check className="size-10" strokeWidth={2.4} />
                    </span>
                    <h3 className="mt-7 font-display text-2xl font-semibold text-ink">
                      Listing submitted
                    </h3>
                    <p className="mt-4 max-w-lg text-[0.9375rem] leading-relaxed text-ink-soft">
                      Thank you. A consultant will call you within two working hours to arrange the
                      valuation visit. We will run the RLA title search before that appointment so
                      we can talk about a real asking price.
                    </p>
                    <div className="mt-9 flex flex-wrap justify-center gap-3">
                      <Button to="/properties" variant="gold">
                        See what else is listed
                      </Button>
                      <Button
                        onClick={() => {
                          setSubmitted(false)
                          setStep(0)
                          setValues({})
                          setCategoryId('')
                          setSubCategoryId('')
                        }}
                        variant="outline"
                      >
                        List another property
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (step < STEPS.length - 1) next()
                      else setSubmitted(true)
                    }}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -24 }}
                        transition={{ duration: 0.3, ease: EASE }}
                      >
                        <div className="mb-8">
                          <p className="text-[0.75rem] font-bold tracking-[0.16em] text-gold-600 uppercase">
                            Step {step + 1} of {STEPS.length}
                          </p>
                          <h3 className="mt-2 font-display text-xl font-semibold text-ink sm:text-3xl">
                            {STEPS[step].title}
                          </h3>
                        </div>

                        {/* ---------- STEP 0 — type ---------- */}
                        {step === 0 && (
                          <div className="space-y-8">
                            <fieldset>
                              <legend className="mb-3 text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">
                                Category
                              </legend>
                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {FORM_CONFIG.map((c) => {
                                  const active = c.id === categoryId
                                  return (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => {
                                        setCategoryId(c.id)
                                        setSubCategoryId('')
                                        setValues({})
                                      }}
                                      className={cn(
                                        'flex items-center gap-3.5 rounded-2xl border p-4 text-left transition-all duration-300',
                                        active
                                          ? 'border-ink bg-ink text-canvas shadow-soft'
                                          : 'border-line bg-surface text-ink hover:-translate-y-0.5 hover:border-ink-faint',
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          'grid size-11 shrink-0 place-items-center rounded-xl transition-colors',
                                          active ? 'bg-gold-500 text-white' : 'bg-canvas-alt text-ink-soft',
                                        )}
                                      >
                                        <Icon name={c.icon} className="size-5" strokeWidth={2} />
                                      </span>
                                      <span className="min-w-0">
                                        <span className="block font-semibold">{c.label}</span>
                                        <span
                                          className={cn(
                                            'block text-[0.8125rem]',
                                            active ? 'text-white/55' : 'text-ink-muted',
                                          )}
                                        >
                                          {c.subCategories.length}{' '}
                                          {c.subCategories.length === 1 ? 'type' : 'types'}
                                        </span>
                                      </span>
                                    </button>
                                  )
                                })}
                              </div>
                            </fieldset>

                            <AnimatePresence initial={false}>
                              {category && (
                                <motion.fieldset
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3, ease: EASE }}
                                  className="overflow-hidden"
                                >
                                  <legend className="mb-3 text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">
                                    Property type
                                  </legend>
                                  <div className="grid gap-2.5 sm:grid-cols-2">
                                    {category.subCategories.map((s) => {
                                      const active = s.id === subCategoryId
                                      return (
                                        <button
                                          key={s.id}
                                          type="button"
                                          onClick={() => {
                                            setSubCategoryId(s.id)
                                            setValues({})
                                          }}
                                          className={cn(
                                            'flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left text-[0.9375rem] font-medium transition-colors',
                                            active
                                              ? 'border-gold-500 bg-gold-50 text-ink'
                                              : 'border-line bg-surface text-ink-soft hover:border-ink-faint',
                                          )}
                                        >
                                          <span className="capitalize">{s.label.toLowerCase()}</span>
                                          {active && (
                                            <Check
                                              className="size-4 shrink-0 text-gold-600"
                                              strokeWidth={3}
                                            />
                                          )}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </motion.fieldset>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        {/* ---------- STEP 1 — parcel ---------- */}
                        {step === 1 && (
                          <div className="grid grid-cols-1 gap-5 sm:grid-cols-6">
                            <div className="sm:col-span-3">
                              <label
                                htmlFor="upi"
                                className="mb-2 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase"
                              >
                                UPI <span className="text-gold-600">*</span>
                              </label>
                              <input
                                id="upi"
                                required
                                placeholder="1/03/06/02/1847"
                                value={(values.upi as string) ?? ''}
                                onChange={(e) => setValue('upi', e.target.value)}
                                className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 font-mono text-[0.9375rem] transition-colors placeholder:text-ink-faint focus:border-gold-500 focus:bg-surface focus:outline-none"
                              />
                              <p className="mt-2 flex items-start gap-1.5 text-[0.8125rem] text-ink-muted">
                                <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.2} />
                                On your land title. We verify it at RLA before listing.
                              </p>
                            </div>

                            <div className="sm:col-span-3">
                              <label
                                htmlFor="parcel_size"
                                className="mb-2 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase"
                              >
                                Parcel size (sqm)
                              </label>
                              <input
                                id="parcel_size"
                                type="number"
                                value={(values.parcel_size as number) ?? ''}
                                onChange={(e) =>
                                  setValue(
                                    'parcel_size',
                                    e.target.value === '' ? undefined : Number(e.target.value),
                                  )
                                }
                                className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[0.9375rem] transition-colors focus:border-gold-500 focus:bg-surface focus:outline-none"
                              />
                            </div>

                            <div className="sm:col-span-3">
                              <label
                                htmlFor="district"
                                className="mb-2 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase"
                              >
                                District <span className="text-gold-600">*</span>
                              </label>
                              <select
                                id="district"
                                required
                                value={(values.district as string) ?? ''}
                                onChange={(e) => setValue('district', e.target.value)}
                                className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[0.9375rem] transition-colors focus:border-gold-500 focus:bg-surface focus:outline-none"
                              >
                                <option value="">Select a district…</option>
                                {DISTRICTS.map((d) => (
                                  <option key={d} value={d}>
                                    {d}
                                  </option>
                                ))}
                                <option value="other">Elsewhere in Rwanda</option>
                              </select>
                            </div>

                            {(
                              [
                                ['sector', 'Sector'],
                                ['cell', 'Cell'],
                                ['village', 'Village'],
                                ['location', 'Nearest landmark'],
                              ] as const
                            ).map(([name, label]) => (
                              <div key={name} className="sm:col-span-3">
                                <label
                                  htmlFor={name}
                                  className="mb-2 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase"
                                >
                                  {label}
                                </label>
                                <input
                                  id={name}
                                  value={(values[name] as string) ?? ''}
                                  onChange={(e) => setValue(name, e.target.value)}
                                  className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[0.9375rem] transition-colors focus:border-gold-500 focus:bg-surface focus:outline-none"
                                />
                              </div>
                            ))}

                            <div className="sm:col-span-6">
                              <label
                                htmlFor="right_type"
                                className="mb-2 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase"
                              >
                                Tenure
                              </label>
                              <select
                                id="right_type"
                                value={(values.right_type as string) ?? ''}
                                onChange={(e) => setValue('right_type', e.target.value)}
                                className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[0.9375rem] transition-colors focus:border-gold-500 focus:bg-surface focus:outline-none"
                              >
                                <option value="">Select…</option>
                                <option>Freehold</option>
                                <option>Leasehold — 99 years</option>
                                <option>Leasehold — 50 years</option>
                                <option>Condominium title</option>
                                <option>Not sure</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {/* ---------- STEP 2 — dynamic spec ---------- */}
                        {step === 2 && (
                          <>
                            {subCategory ? (
                              <>
                                <div className="mb-7 flex items-start gap-3 rounded-2xl border border-line bg-surface p-4">
                                  <Sparkles
                                    className="mt-0.5 size-4 shrink-0 text-gold-600"
                                    strokeWidth={2.2}
                                  />
                                  <p className="text-[0.875rem] leading-relaxed text-ink-soft">
                                    These questions are specific to{' '}
                                    <span className="font-semibold text-ink lowercase">
                                      {subCategory.label}
                                    </span>
                                    . Leave anything you are unsure about blank — we will confirm it
                                    during the valuation visit.
                                  </p>
                                </div>

                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-6">
                                  {visibleFields.map((field) => (
                                    <DynamicField
                                      key={field.name}
                                      field={field}
                                      value={values[field.name]}
                                      onChange={setValue}
                                    />
                                  ))}
                                </div>
                              </>
                            ) : (
                              <p className="py-10 text-center text-ink-muted">
                                Go back and choose a property type first.
                              </p>
                            )}
                          </>
                        )}

                        {/* ---------- STEP 3 — price & media ---------- */}
                        {step === 3 && (
                          <div className="grid grid-cols-1 gap-5 sm:grid-cols-6">
                            <div className="sm:col-span-3">
                              <label
                                htmlFor="estimated_amount"
                                className="mb-2 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase"
                              >
                                Asking price (RWF) <span className="text-gold-600">*</span>
                              </label>
                              <input
                                id="estimated_amount"
                                type="number"
                                required
                                placeholder="42000000"
                                value={(values.estimated_amount as number) ?? ''}
                                onChange={(e) =>
                                  setValue(
                                    'estimated_amount',
                                    e.target.value === '' ? undefined : Number(e.target.value),
                                  )
                                }
                                className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[0.9375rem] transition-colors placeholder:text-ink-faint focus:border-gold-500 focus:bg-surface focus:outline-none"
                              />
                              <p className="mt-2 text-[0.8125rem] text-ink-muted">
                                A starting figure is fine. We will advise on a realistic price after
                                the visit.
                              </p>
                            </div>

                            <div className="sm:col-span-3">
                              <label
                                htmlFor="intent"
                                className="mb-2 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase"
                              >
                                Listing type
                              </label>
                              <select
                                id="intent"
                                value={(values.intent as string) ?? 'sale'}
                                onChange={(e) => setValue('intent', e.target.value)}
                                className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[0.9375rem] transition-colors focus:border-gold-500 focus:bg-surface focus:outline-none"
                              >
                                <option value="sale">For sale</option>
                                <option value="rent">For rent</option>
                                <option value="both">Either — advise me</option>
                              </select>
                            </div>

                            <div className="sm:col-span-6">
                              <label
                                htmlFor="video_link"
                                className="mb-2 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase"
                              >
                                Video link (optional)
                              </label>
                              <input
                                id="video_link"
                                type="url"
                                placeholder="https://youtube.com/…"
                                value={(values.video_link as string) ?? ''}
                                onChange={(e) => setValue('video_link', e.target.value)}
                                className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[0.9375rem] transition-colors placeholder:text-ink-faint focus:border-gold-500 focus:bg-surface focus:outline-none"
                              />
                            </div>

                            <div className="sm:col-span-6">
                              <label
                                htmlFor="summary"
                                className="mb-2 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase"
                              >
                                Anything else we should know?
                              </label>
                              <textarea
                                id="summary"
                                rows={4}
                                placeholder="Access, services, why you are selling, any timing pressure…"
                                value={(values.summary as string) ?? ''}
                                onChange={(e) => setValue('summary', e.target.value)}
                                className="w-full resize-y rounded-2xl border border-line bg-canvas px-4 py-3.5 text-[0.9375rem] transition-colors placeholder:text-ink-faint focus:border-gold-500 focus:bg-surface focus:outline-none"
                              />
                            </div>

                            <div className="sm:col-span-6">
                              <div className="flex items-start gap-4 rounded-2xl border border-dashed border-line-strong bg-surface p-6">
                                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-canvas-alt text-ink-soft">
                                  <Camera className="size-5" strokeWidth={2} />
                                </span>
                                <div>
                                  <p className="font-semibold text-ink">
                                    Photography is on us
                                  </p>
                                  <p className="mt-1 text-[0.875rem] leading-relaxed text-ink-soft">
                                    Do not worry about supplying images. Once we have verified the
                                    title, our photographer shoots the property properly — drone
                                    footage included — at no cost to you.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ---------- STEP 4 — contact & review ---------- */}
                        {step === 4 && (
                          <div className="space-y-8">
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-6">
                              <div className="sm:col-span-3">
                                <label
                                  htmlFor="owner_name"
                                  className="mb-2 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase"
                                >
                                  Your full name <span className="text-gold-600">*</span>
                                </label>
                                <input
                                  id="owner_name"
                                  required
                                  value={(values.owner_name as string) ?? ''}
                                  onChange={(e) => setValue('owner_name', e.target.value)}
                                  className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[0.9375rem] transition-colors focus:border-gold-500 focus:bg-surface focus:outline-none"
                                />
                              </div>

                              <div className="sm:col-span-3">
                                <label
                                  htmlFor="contact"
                                  className="mb-2 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase"
                                >
                                  Phone or WhatsApp <span className="text-gold-600">*</span>
                                </label>
                                <input
                                  id="contact"
                                  required
                                  type="tel"
                                  placeholder="+250 …"
                                  value={(values.contact as string) ?? ''}
                                  onChange={(e) => setValue('contact', e.target.value)}
                                  className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[0.9375rem] transition-colors placeholder:text-ink-faint focus:border-gold-500 focus:bg-surface focus:outline-none"
                                />
                              </div>

                              <div className="sm:col-span-3">
                                <label
                                  htmlFor="email"
                                  className="mb-2 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase"
                                >
                                  Email
                                </label>
                                <input
                                  id="email"
                                  type="email"
                                  value={(values.email as string) ?? ''}
                                  onChange={(e) => setValue('email', e.target.value)}
                                  className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[0.9375rem] transition-colors focus:border-gold-500 focus:bg-surface focus:outline-none"
                                />
                              </div>

                              <div className="sm:col-span-3">
                                <label
                                  htmlFor="uploader_type"
                                  className="mb-2 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase"
                                >
                                  You are the…
                                </label>
                                <select
                                  id="uploader_type"
                                  value={(values.uploader_type as string) ?? 'seller'}
                                  onChange={(e) => setValue('uploader_type', e.target.value)}
                                  className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[0.9375rem] transition-colors focus:border-gold-500 focus:bg-surface focus:outline-none"
                                >
                                  <option value="seller">Owner</option>
                                  <option value="broker">Broker acting on a mandate</option>
                                  <option value="agency">Agency</option>
                                </select>
                              </div>
                            </div>

                            {/* review summary */}
                            <div className="overflow-hidden rounded-2xl border border-line bg-surface">
                              <h4 className="border-b border-line bg-canvas-alt px-5 py-3 text-[0.75rem] font-bold tracking-[0.16em] text-ink-soft uppercase">
                                Review
                              </h4>
                              <dl className="divide-y divide-line/70">
                                {[
                                  { label: 'Category', value: category?.label },
                                  { label: 'Property type', value: subCategory?.label },
                                  { label: 'UPI', value: values.upi as string },
                                  { label: 'District', value: values.district as string },
                                  {
                                    label: 'Asking price',
                                    value: values.estimated_amount
                                      ? `RWF ${Number(values.estimated_amount).toLocaleString('en-RW')}`
                                      : undefined,
                                  },
                                  { label: 'Specification fields completed', value: `${filledCount}` },
                                ]
                                  .filter((row) => row.value)
                                  .map((row) => (
                                    <div
                                      key={row.label}
                                      className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 py-3"
                                    >
                                      <dt className="text-[0.9375rem] text-ink-muted">
                                        {row.label}
                                      </dt>
                                      <dd className="text-[0.9375rem] font-semibold text-ink">
                                        {row.value}
                                      </dd>
                                    </div>
                                  ))}
                              </dl>
                            </div>

                            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface p-4">
                              <input
                                type="checkbox"
                                required
                                className="mt-0.5 size-4 shrink-0 accent-gold-500"
                              />
                              <span className="text-[0.875rem] leading-relaxed text-ink-soft">
                                I confirm I am the registered owner of this property or hold a
                                written mandate from them, and I agree to Evaramu verifying the
                                title at the Rwanda Land Authority.
                              </span>
                            </label>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>

                    {/* ---- nav ---- */}
                    <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-7">
                      <Button
                        type="button"
                        onClick={back}
                        variant="ghost"
                        disabled={step === 0}
                        leading={<ArrowLeft className="size-[1.05rem]" strokeWidth={2.2} />}
                      >
                        Back
                      </Button>

                      {step < STEPS.length - 1 ? (
                        <Button
                          type="button"
                          onClick={next}
                          variant="primary"
                          size="lg"
                          disabled={!canAdvance()}
                          trailing={
                            <ArrowRight
                              className="size-[1.05rem] transition-transform duration-300 group-hover/btn:translate-x-1"
                              strokeWidth={2.3}
                            />
                          }
                        >
                          Continue
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          variant="gold"
                          size="lg"
                          disabled={!canAdvance()}
                          trailing={<Send className="size-[1.05rem]" strokeWidth={2.2} />}
                        >
                          Submit listing
                        </Button>
                      )}
                    </div>
                  </form>
                )}
              </div>

              <p className="mt-5 flex items-start gap-2.5 text-[0.8125rem] leading-relaxed text-ink-muted">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" strokeWidth={2.2} />
                Nothing is published until you have seen and approved the listing. We verify the
                title at RLA first, and if there is an issue we tell you before anyone else sees it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- what happens next ---------------- */}
      <section className="relative overflow-hidden bg-navy-950 py-20 text-white lg:py-24">
        <div className="pointer-events-none absolute inset-0 bg-blueprint opacity-60" />
        <div className="container-page relative">
          <SectionHeading
            tone="light"
            eyebrow="After you submit"
            title="What actually happens"
            accent="next."
          />

          <motion.ol
            {...revealProps}
            variants={stagger(0.08)}
            className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {[
              {
                step: '01',
                title: 'We call within 2 hours',
                body: 'A consultant confirms the details and books the valuation visit.',
              },
              {
                step: '02',
                title: 'Title search at RLA',
                body: 'We verify the UPI and the registered owner before anything is published.',
              },
              {
                step: '03',
                title: 'Valuation & photography',
                body: 'We price it against real comparable sales, then shoot it properly.',
              },
              {
                step: '04',
                title: 'Listed and marketed',
                body: 'Live on the platform, pushed across our channels, buyers qualified before viewing.',
              },
            ].map((item) => (
              <motion.li
                key={item.step}
                variants={fadeUp}
                className="rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm"
              >
                <span className="font-display text-2xl font-semibold text-gold-400">{item.step}</span>
                <h3 className="mt-4 font-display text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-white/60">{item.body}</p>
              </motion.li>
            ))}
          </motion.ol>

          <motion.div {...revealProps} variants={fadeUp} className="mt-12">
            <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-gold-500/25 bg-gold-500/10 p-8 lg:flex-row lg:items-center">
              <div className="flex items-start gap-4">
                <Handshake className="mt-0.5 size-6 shrink-0 text-gold-400" strokeWidth={2} />
                <div className="max-w-2xl">
                  <h3 className="font-display text-lg font-semibold text-white">
                    Selling to reinvest, not to cash out?
                  </h3>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-white/65">
                    Tell your consultant. Selling at the right moment and redirecting the proceeds
                    into two or three properties is step five of the Wealth Cycle — and it is
                    where most of our clients' growth actually comes from.
                  </p>
                </div>
              </div>
              <Button to="/wealth-cycle" variant="gold" className="shrink-0">
                See the cycle
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <FaqSection
        faqs={SELL_FAQS}
        eyebrow="Seller questions"
        title="What sellers ask"
        accent="before they list."
        description="Fees, timelines, titles and what happens if you change your mind."
      />
    </>
  )
}
