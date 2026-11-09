import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { Clock, Mail, MapPin, Menu, Phone, X } from 'lucide-react'
import { LOGO, settingText, usePublicSettings } from '@/shared/lib/brand'
import { CurrencySwitch, useExchangeRate } from '@/shared/lib/displayCurrency'
import { cn } from '@/shared/ui/cn'

const LINKS = [
  { hash: 'properties', label: 'Properties' },
  { hash: 'about', label: 'About' },
  { hash: 'contact', label: 'Contact' },
]

export default function PublicLayout() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const { data: s } = usePublicSettings()
  const company = settingText(s, 'company.name', 'Evaramu Group Ltd')

  useEffect(() => setOpen(false), [location.pathname, location.hash])

  const phone = settingText(s, 'contact.phone')
  const email = settingText(s, 'contact.email')
  const address = settingText(s, 'contact.address')
  const hours = settingText(s, 'contact.hours')
  const socials = [
    ['Instagram', settingText(s, 'social.instagram')],
    ['Facebook', settingText(s, 'social.facebook')],
    ['LinkedIn', settingText(s, 'social.linkedin')],
  ].filter(([, url]) => url)

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-lg">
        <div className="mx-auto flex h-16 w-11/12 items-center gap-4">
          <Link to="/" className="shrink-0" aria-label={`${company} home`}>
            <img src={LOGO.horizontal} alt={company} className="h-9 w-auto sm:h-10" />
          </Link>
          <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Main">
            <CurrencySwitch className="mr-2" />
            {LINKS.map((l) => (
              <Link key={l.hash} to={{ pathname: '/', hash: l.hash }} className="rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900">
                {l.label}
              </Link>
            ))}
            <Link
              to={{ pathname: '/', hash: 'contact' }}
              className="ml-2 inline-flex h-10 items-center rounded-full bg-brand-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
            >
              Request a viewing
            </Link>
          </nav>
          <CurrencySwitch className="ml-auto md:hidden" />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="inline-flex size-11 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 md:hidden"
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
        <div className={cn('border-t border-slate-100 bg-white md:hidden', open ? 'block' : 'hidden')}>
          <nav className="mx-auto flex w-11/12 flex-col py-2" aria-label="Mobile">
            {LINKS.map((l) => (
              <Link key={l.hash} to={{ pathname: '/', hash: l.hash }} className="flex h-12 items-center rounded-lg px-2 text-base font-medium text-slate-800 hover:bg-slate-50">
                {l.label}
              </Link>
            ))}
            <Link
              to={{ pathname: '/', hash: 'contact' }}
              className="my-2 inline-flex h-12 items-center justify-center rounded-full bg-brand-900 text-base font-semibold text-white"
            >
              Request a viewing
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-brand-950 text-brand-100">
        <div className="mx-auto grid w-11/12 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <img src={LOGO.horizontalReversed} alt={company} className="h-11 w-auto" />
            <p className="mt-4 max-w-xs text-sm text-brand-100/70">{settingText(s, 'company.tagline')}</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gold-300">Contact</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {phone ? (
                <li className="flex gap-2"><Phone className="mt-0.5 size-4 shrink-0 text-brand-300" /><a href={`tel:${phone.replace(/\s/g, '')}`} className="hover:text-white">{phone}</a></li>
              ) : null}
              {email ? (
                <li className="flex gap-2"><Mail className="mt-0.5 size-4 shrink-0 text-brand-300" /><a href={`mailto:${email}`} className="break-all hover:text-white">{email}</a></li>
              ) : null}
              {address ? <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-brand-300" />{address}</li> : null}
              {hours ? <li className="flex gap-2"><Clock className="mt-0.5 size-4 shrink-0 text-brand-300" />{hours}</li> : null}
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gold-300">Explore</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {LINKS.map((l) => (
                <li key={l.hash}><Link to={{ pathname: '/', hash: l.hash }} className="hover:text-white">{l.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gold-300">Tenants</h2>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link to={{ pathname: '/', hash: 'contact' }} className="hover:text-white">Request a viewing</Link></li>
              <li><Link to="/verify" className="hover:text-white">Verify an agreement</Link></li>
            </ul>
            {socials.length ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {socials.map(([label, url]) => (
                  <a key={label} href={url} target="_blank" rel="noreferrer noopener" className="inline-flex h-10 items-center rounded-lg border border-white/15 px-3 text-sm hover:bg-white/10">
                    {label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex w-11/12 flex-col gap-2 py-5 text-sm text-brand-100/60 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} {company}. All rights reserved.</p>
            <RateNote />
            <Link to="/login" className="hover:text-white">Staff sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

/** Where converted prices come from; rent itself is paid in each home's listed currency. */
function RateNote() {
  const fx = useExchangeRate().data
  if (!fx?.rate) return null
  const rate = Math.round(Number(fx.rate)).toLocaleString('en-US')
  const when = fx.updated_at && !fx.is_override ? ` · updated ${new Date(fx.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''
  return (
    <p className="text-xs text-brand-100/50" title={fx.source ? `Rate source: ${fx.source}` : undefined}>
      1 USD ≈ {rate} RWF{when}. Converted prices are estimates; rent is paid in the listed currency.
    </p>
  )
}
