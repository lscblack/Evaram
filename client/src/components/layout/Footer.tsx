import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight, Clock, Mail, MapPin, Phone, Send, ShieldCheck } from 'lucide-react'
import { SITE, SOCIALS } from '@/data/site'
import { Logo } from '@/components/ui/Logo'
import { SocialIcon } from '@/components/ui/SocialIcon'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { fadeUp, revealProps, stagger } from '@/lib/motion'
import { useState } from 'react'

const COLUMNS = [
  {
    title: 'Properties',
    links: [
      { label: 'All listings', to: '/properties' },
      { label: 'Land & plots', to: '/properties?category=residential' },
      { label: 'Houses & apartments', to: '/properties?category=commercial' },
      { label: 'Commercial & industrial', to: '/properties?category=industrial' },
      { label: 'Sell your property', to: '/sell' },
    ],
  },
  {
    title: 'Services',
    links: [
      { label: 'The Wealth Cycle', to: '/wealth-cycle' },
      { label: 'Construction & renovation', to: '/construction' },
      { label: 'Property management', to: '/services#management' },
      { label: 'Diaspora services', to: '/services#diaspora' },
      { label: 'Book a consultation', to: '/consultation' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Evaramu', to: '/about' },
      { label: 'Join our agency', to: '/join' },
      { label: 'Insights & market reports', to: '/insights' },
      { label: 'Contact us', to: '/contact' },
    ],
  },
]

export function Footer() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const onSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubscribed(true)
    setEmail('')
  }

  return (
    <footer className="relative overflow-hidden bg-navy-950 text-white/70">
      <div className="pointer-events-none absolute inset-0 bg-blueprint opacity-70" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 size-[34rem] rounded-full bg-gold-500/10 blur-[120px]"
      />

      {/* ---------- CTA band ---------- */}
      <div className="relative border-b border-white/10">
        <motion.div
          {...revealProps}
          variants={stagger(0.1)}
          className="container-page flex flex-col items-start gap-10 py-16 lg:flex-row lg:items-center lg:justify-between lg:py-20"
        >
          <motion.div variants={fadeUp} className="max-w-2xl">
            <Eyebrow tone="light">Start the cycle</Eyebrow>
            <h2 className="mt-5 font-display text-[1.875rem] leading-[1.12] font-semibold text-white sm:text-[2.375rem]">
              One property is a purchase.
              <br />
              <span className="text-gradient-gold">Five is a portfolio.</span>
            </h2>
            <p className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-white/60">
              Book a free 30-minute consultation. Tell us your budget and your goal — we will
              tell you honestly what is achievable and how long it will take.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              to="/consultation"
              className="group inline-flex h-14 items-center justify-center gap-3 rounded-full bg-gold-500 px-8 font-semibold text-white shadow-gold transition-all duration-300 hover:-translate-y-0.5 hover:bg-gold-600"
            >
              Book a free consultation
              <ArrowUpRight
                className="size-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                strokeWidth={2.2}
              />
            </Link>
            <a
              href={SITE.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-14 items-center justify-center gap-3 rounded-full border border-white/25 px-8 font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/5"
            >
              Chat on WhatsApp
            </a>
          </motion.div>
        </motion.div>
      </div>

      {/* ---------- main footer ---------- */}
      <div className="relative container-page py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          {/* brand column */}
          <div className="lg:col-span-4">
            <Logo tone="light" />
            <p className="mt-6 max-w-sm text-[0.9375rem] leading-relaxed text-white/60">
              {SITE.description}
            </p>

            <div className="mt-7 inline-flex items-center gap-2.5 rounded-full border border-gold-500/25 bg-gold-500/10 px-4 py-2">
              <ShieldCheck className="size-4 text-gold-400" strokeWidth={2.2} />
              <span className="text-[0.8125rem] font-medium text-gold-200">{SITE.rdb}</span>
            </div>

            <ul className="mt-8 space-y-4 text-[0.9375rem]">
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-[1.05rem] shrink-0 text-gold-400" strokeWidth={2} />
                <span className="text-white/60">{SITE.address}</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 size-[1.05rem] shrink-0 text-gold-400" strokeWidth={2} />
                <a href={SITE.phoneHref} className="transition-colors hover:text-gold-300">
                  {SITE.phone}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 size-[1.05rem] shrink-0 text-gold-400" strokeWidth={2} />
                <a href={`mailto:${SITE.email}`} className="transition-colors hover:text-gold-300">
                  {SITE.email}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="mt-0.5 size-[1.05rem] shrink-0 text-gold-400" strokeWidth={2} />
                <span className="text-white/60">
                  {SITE.hours}
                  <br />
                  {SITE.saturdayHours}
                </span>
              </li>
            </ul>
          </div>

          {/* link columns */}
          <div className="grid gap-10 sm:grid-cols-3 lg:col-span-5 lg:gap-8">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="font-sans text-[0.6875rem] font-bold tracking-[0.22em] text-gold-400 uppercase">
                  {col.title}
                </h3>
                <ul className="mt-5 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="group inline-flex items-center gap-1.5 text-[0.9375rem] text-white/60 transition-colors hover:text-white"
                      >
                        <span className="h-px w-0 bg-gold-400 transition-all duration-300 group-hover:w-3" />
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* newsletter */}
          <div className="lg:col-span-3">
            <h3 className="font-sans text-[0.6875rem] font-bold tracking-[0.22em] text-gold-400 uppercase">
              Kigali Market Report
            </h3>
            <p className="mt-5 text-[0.9375rem] leading-relaxed text-white/60">
              One email a month: land price movements, new development zones and what we are
              seeing on the ground. No listings spam.
            </p>

            <form onSubmit={onSubscribe} className="mt-6">
              <label htmlFor="footer-email" className="sr-only">
                Email address
              </label>
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 p-1.5 transition-colors focus-within:border-gold-500/60">
                <input
                  id="footer-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="min-w-0 flex-1 bg-transparent px-4 py-2 text-[0.9375rem] text-white placeholder:text-white/35 focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label="Subscribe"
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-500 text-white transition-colors hover:bg-gold-600"
                >
                  <Send className="size-4" strokeWidth={2.2} />
                </button>
              </div>
              {subscribed && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 text-[0.8125rem] text-gold-300"
                >
                  You're on the list — the next report lands at the start of the month.
                </motion.p>
              )}
            </form>

            <div className="mt-8 flex items-center gap-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                  className="grid size-11 place-items-center rounded-full border border-white/15 text-white/60 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-500 hover:bg-gold-500 hover:text-white"
                >
                  <SocialIcon name={s.icon} className="size-[1.05rem]" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- legal bar ---------- */}
      <div className="relative border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-4 py-6 text-[0.8125rem] text-white/45 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
          <p className="font-display text-[0.9375rem] text-white/70 italic">"{SITE.tagline}"</p>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="transition-colors hover:text-white">
              Privacy
            </Link>
            <Link to="/terms" className="transition-colors hover:text-white">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
