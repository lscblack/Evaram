import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Check,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from 'lucide-react'
import { Seo, breadcrumbJsonLd, faqJsonLd } from '@/components/Seo'
import { PageHero } from '@/components/layout/PageHero'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { SocialIcon } from '@/components/ui/SocialIcon'
import { FaqSection } from '@/components/sections/FaqSection'
import { SITE, SOCIALS } from '@/data/site'
import { fadeUp, revealProps, stagger } from '@/lib/motion'

const OFFICE_LAT = -1.9441
const OFFICE_LNG = 30.0619

const CHANNELS = [
  {
    icon: MessageCircle,
    title: 'WhatsApp',
    detail: SITE.whatsapp,
    body: 'Fastest way to reach us. Usually answered within minutes during office hours.',
    href: SITE.whatsappHref,
    action: 'Start a chat',
  },
  {
    icon: Phone,
    title: 'Phone',
    detail: SITE.phone,
    body: 'Speak to a consultant directly. If we miss you, we call back the same working day.',
    href: SITE.phoneHref,
    action: 'Call now',
  },
  {
    icon: Mail,
    title: 'Email',
    detail: SITE.email,
    body: 'Best for documents, drawings and anything that needs a written record.',
    href: `mailto:${SITE.email}`,
    action: 'Send an email',
  },
  {
    icon: MapPin,
    title: 'Our office',
    detail: 'KG 11 Ave, Kimihurura',
    body: `${SITE.address}. Walk in during office hours or book a slot.`,
    href: `https://www.google.com/maps/search/?api=1&query=${OFFICE_LAT},${OFFICE_LNG}`,
    action: 'Get directions',
  },
]

const CONTACT_FAQS = [
  {
    question: 'How quickly will you actually reply?',
    answer:
      'Within two working hours. That is not marketing language — it is a culture rule inside the company and we measure it. Competitors take days, and that gap is one of our few genuine advantages.',
  },
  {
    question: 'Can I just walk into the office?',
    answer:
      'Yes, during office hours. But you will get more out of it if you book, because then the right consultant is there and has already looked at whatever you want to discuss.',
  },
  {
    question: 'I am abroad — what is the best way to reach you?',
    answer:
      'WhatsApp for anything quick, email for anything that needs a paper trail. For a proper conversation, book a diaspora briefing — those slots are scheduled early morning and evening Kigali time to suit European and North American hours.',
  },
  {
    question: 'Do you charge for an initial conversation?',
    answer:
      'No. Discovery calls, viewings, Wealth Cycle planning sessions, diaspora briefings and seller valuations are all free. The only paid slot is a construction consultation, and that is credited against your build.',
  },
]

export default function ContactPage() {
  const [sent, setSent] = useState(false)

  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${OFFICE_LNG - 0.012}%2C${OFFICE_LAT - 0.008}%2C${OFFICE_LNG + 0.012}%2C${OFFICE_LAT + 0.008}&layer=mapnik&marker=${OFFICE_LAT}%2C${OFFICE_LNG}`

  const contactJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: `Contact ${SITE.name}`,
    url: `${SITE.url}/contact`,
    mainEntity: {
      '@type': 'Organization',
      name: SITE.name,
      telephone: SITE.phone,
      email: SITE.email,
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'KG 11 Ave, Kimihurura',
        addressLocality: 'Kigali',
        addressRegion: 'Gasabo District',
        addressCountry: 'RW',
      },
    },
  }

  return (
    <>
      <Seo
        title="Contact Evaramu Group Ltd — Kigali, Rwanda"
        description="Talk to Evaramu Group Ltd about buying, selling, building or managing property in Rwanda. WhatsApp, phone, email or visit our Kimihurura office. Every enquiry answered within two working hours."
        path="/contact"
        keywords={[
          'contact real estate agency Kigali',
          'Evaramu contact',
          'property agent Rwanda phone',
          'Kimihurura estate agent',
        ]}
        jsonLd={[
          contactJsonLd,
          faqJsonLd(CONTACT_FAQS),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Contact', path: '/contact' },
          ]),
        ]}
      />

      <PageHero
        eyebrow="Contact us"
        title="Every enquiry answered"
        accent="within two hours."
        description="Not a promise on a poster — a rule we measure. Whether you are buying your first plot, selling a family property or building from abroad, tell us what you need and someone who can actually help will get back to you today."
        crumbs={[{ label: 'Contact' }]}
        image="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=2000&q=80"
        compact
      />

      {/* ---------------- channels ---------------- */}
      <section className="bg-canvas py-16 lg:py-20">
        <div className="container-page">
          <motion.div
            {...revealProps}
            variants={stagger(0.08)}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {CHANNELS.map((channel) => {
              const Cmp = channel.icon
              const external = channel.href.startsWith('http')
              return (
                <motion.a
                  key={channel.title}
                  variants={fadeUp}
                  href={channel.href}
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="group flex flex-col rounded-3xl border border-line bg-surface p-7 transition-all duration-500 ease-brand hover:-translate-y-1.5 hover:shadow-lift"
                >
                  <span className="grid size-12 place-items-center rounded-2xl bg-navy-900 text-gold-400 transition-colors duration-500 group-hover:bg-gold-500 group-hover:text-white">
                    <Cmp className="size-[1.35rem]" strokeWidth={2} />
                  </span>

                  <h2 className="mt-5 font-display text-lg font-semibold text-ink">
                    {channel.title}
                  </h2>
                  <p className="mt-1.5 text-[0.9375rem] font-semibold text-gold-600">
                    {channel.detail}
                  </p>
                  <p className="mt-3 flex-1 text-[0.875rem] leading-relaxed text-ink-soft">
                    {channel.body}
                  </p>

                  <span className="mt-5 inline-flex items-center gap-1.5 text-[0.875rem] font-bold text-ink transition-colors group-hover:text-gold-600">
                    {channel.action}
                    <ExternalLink
                      className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      strokeWidth={2.4}
                    />
                  </span>
                </motion.a>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ---------------- form + map ---------------- */}
      <section className="bg-surface py-16 lg:py-24">
        <div className="container-page">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            {/* form */}
            <motion.div {...revealProps} variants={fadeUp} className="lg:col-span-7">
              <SectionHeading
                eyebrow="Send a message"
                title="Tell us what you"
                accent="are trying to do."
                description="The more specific you are, the more useful our first reply will be. Budget and timeline help us most."
              />

              <div className="mt-10 rounded-3xl border border-line bg-canvas p-7 sm:p-9">
                {sent ? (
                  <div className="flex flex-col items-center py-16 text-center">
                    <span className="grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                      <Check className="size-8" strokeWidth={2.6} />
                    </span>
                    <h3 className="mt-6 font-display text-xl font-semibold text-ink">
                      Message sent
                    </h3>
                    <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-ink-soft">
                      Thank you. A consultant will come back to you within two working hours. If it
                      is urgent, WhatsApp is faster.
                    </p>
                    <div className="mt-7 flex flex-wrap justify-center gap-3">
                      <Button href={SITE.whatsappHref} variant="gold">
                        WhatsApp us instead
                      </Button>
                      <Button onClick={() => setSent(false)} variant="outline">
                        Send another
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form
                    className="space-y-5"
                    onSubmit={(e) => {
                      e.preventDefault()
                      setSent(true)
                    }}
                  >
                    <div className="grid gap-5 sm:grid-cols-2">
                      <ContactField id="k-name" label="Full name" required />
                      <ContactField id="k-phone" label="Phone or WhatsApp" type="tel" required />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <ContactField id="k-email" label="Email" type="email" required />
                      <div>
                        <label
                          htmlFor="k-topic"
                          className="mb-2 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase"
                        >
                          What is this about?
                        </label>
                        <select
                          id="k-topic"
                          className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-[0.9375rem] text-ink transition-colors focus:border-gold-500 focus:outline-none"
                        >
                          <option>Buying a property</option>
                          <option>Selling or listing a property</option>
                          <option>Construction or renovation</option>
                          <option>Property management</option>
                          <option>Investing from abroad</option>
                          <option>Joining the agency</option>
                          <option>Something else</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="k-budget"
                          className="mb-2 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase"
                        >
                          Approximate budget
                        </label>
                        <select
                          id="k-budget"
                          className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-[0.9375rem] text-ink transition-colors focus:border-gold-500 focus:outline-none"
                        >
                          <option>Not sure yet</option>
                          <option>Under RWF 10M</option>
                          <option>RWF 10–40M</option>
                          <option>RWF 40–80M</option>
                          <option>RWF 80–150M</option>
                          <option>Above RWF 150M</option>
                        </select>
                      </div>
                      <ContactField id="k-where" label="Where are you based?" />
                    </div>

                    <div>
                      <label
                        htmlFor="k-message"
                        className="mb-2 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase"
                      >
                        Your message <span className="text-gold-600">*</span>
                      </label>
                      <textarea
                        id="k-message"
                        rows={5}
                        required
                        placeholder="What are you trying to achieve, and by when?"
                        className="w-full resize-y rounded-2xl border border-line bg-surface px-4 py-3.5 text-[0.9375rem] transition-colors placeholder:text-ink-faint focus:border-gold-500 focus:outline-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="gold"
                      size="lg"
                      className="w-full"
                      trailing={<Send className="size-[1.05rem]" strokeWidth={2.2} />}
                    >
                      Send message
                    </Button>

                    <p className="text-center text-[0.8125rem] text-ink-muted">
                      We never share your details. Expect a reply within two working hours.
                    </p>
                  </form>
                )}
              </div>
            </motion.div>

            {/* map + details */}
            <motion.div {...revealProps} variants={fadeUp} className="lg:col-span-5">
              <div className="overflow-hidden rounded-3xl border border-line bg-surface">
                <iframe
                  title="Evaramu Group Ltd office location"
                  src={mapSrc}
                  loading="lazy"
                  className="h-72 w-full border-0"
                />
                <div className="p-7">
                  <h3 className="font-display text-lg font-semibold text-ink">
                    Evaramu Group Ltd
                  </h3>
                  <ul className="mt-5 space-y-4 text-[0.9375rem]">
                    <li className="flex items-start gap-3">
                      <MapPin
                        className="mt-0.5 size-[1.05rem] shrink-0 text-gold-600"
                        strokeWidth={2.2}
                      />
                      <span className="text-ink-soft">{SITE.address}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Clock
                        className="mt-0.5 size-[1.05rem] shrink-0 text-gold-600"
                        strokeWidth={2.2}
                      />
                      <span className="text-ink-soft">
                        {SITE.hours}
                        <br />
                        {SITE.saturdayHours}
                        <br />
                        <span className="text-ink-muted">Sunday — closed</span>
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Phone
                        className="mt-0.5 size-[1.05rem] shrink-0 text-gold-600"
                        strokeWidth={2.2}
                      />
                      <a
                        href={SITE.phoneHref}
                        className="text-ink-soft transition-colors hover:text-gold-600"
                      >
                        {SITE.phone}
                      </a>
                    </li>
                    <li className="flex items-start gap-3">
                      <Mail
                        className="mt-0.5 size-[1.05rem] shrink-0 text-gold-600"
                        strokeWidth={2.2}
                      />
                      <a
                        href={`mailto:${SITE.email}`}
                        className="text-ink-soft transition-colors hover:text-gold-600"
                      >
                        {SITE.email}
                      </a>
                    </li>
                  </ul>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${OFFICE_LAT},${OFFICE_LNG}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex items-center gap-1.5 text-[0.875rem] font-bold text-gold-600 transition-colors hover:text-gold-700"
                  >
                    Open in Google Maps
                    <ExternalLink className="size-3.5" strokeWidth={2.4} />
                  </a>
                </div>
              </div>

              {/* socials */}
              <div className="mt-5 rounded-3xl border border-line bg-canvas-alt p-7">
                <h3 className="font-display text-lg font-semibold text-ink">Follow the work</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
                  Land tours, renovation reveals, market data and client stories — posted weekly.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {SOCIALS.map((social) => (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.name}
                      className="grid size-12 place-items-center rounded-full border border-line-strong bg-surface text-ink-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-500 hover:bg-gold-500 hover:text-white"
                    >
                      <SocialIcon name={social.icon} className="size-5" />
                    </a>
                  ))}
                </div>
                <p className="mt-5 text-[0.875rem] text-ink-muted">
                  {SITE.handle} on every platform
                </p>
              </div>

              {/* booking nudge */}
              <div className="relative mt-5 overflow-hidden rounded-3xl bg-navy-950 p-7 text-white">
                <div className="pointer-events-none absolute inset-0 bg-blueprint opacity-60" />
                <div className="relative">
                  <h3 className="font-display text-lg font-semibold">Rather book a proper slot?</h3>
                  <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-white/60">
                    Pick a date and time and the right consultant will be ready for you — with your
                    questions already looked at.
                  </p>
                  <Button to="/consultation" variant="gold" className="mt-5 w-full">
                    Book a consultation
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <FaqSection
        faqs={CONTACT_FAQS}
        eyebrow="Getting in touch"
        title="Response times"
        accent="and office hours."
        description="How fast we reply, whether you can walk in, and the best channel if you are outside Rwanda."
      />
    </>
  )
}

function ContactField({
  id,
  label,
  type = 'text',
  required = false,
}: {
  id: string
  label: string
  type?: string
  required?: boolean
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase"
      >
        {label}
        {required && <span className="ml-1 text-gold-600">*</span>}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-[0.9375rem] text-ink transition-colors focus:border-gold-500 focus:outline-none"
      />
    </div>
  )
}
