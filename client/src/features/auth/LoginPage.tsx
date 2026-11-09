import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { browserSupportsWebAuthn, startAuthentication, type PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
  FileSignature,
  Fingerprint,
  Lock,
  Mail,
  ReceiptText,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { API_ORIGIN, ApiError, api, errorMessage } from '@/shared/api/client'
import type { PasskeyOptionsOut, SignInMethods, TokenOut } from '@/shared/api/types'
import { useAuth } from '@/shared/auth/AuthProvider'
import { LOGO } from '@/shared/lib/brand'
import { Button } from '@/shared/ui/Button'
import { Field, FormError, Input } from '@/shared/ui/Form'
import { FullPageSpinner } from '@/shared/ui/Spinner'
import { cn } from '@/shared/ui/cn'

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
})
type Values = z.infer<typeof schema>
type Mode = 'password' | 'code-request' | 'code-verify'

export default function LoginPage() {
  const { status, acceptSession } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/admin'
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const methods = useQuery({
    queryKey: ['auth', 'methods'],
    queryFn: () => api.publicGet<SignInMethods>('/auth/methods'),
    staleTime: 5 * 60_000,
    retry: false,
  })
  // The new sign-in options exist only on the current API; a 404 means the server is still on an older version.
  const outdated = methods.error instanceof ApiError && methods.error.status === 404
  const emailCode = !!methods.data?.email_code
  const passkey = (methods.data?.passkey ?? false) && browserSupportsWebAuthn()

  if (status === 'loading') return <FullPageSpinner />
  if (status === 'authenticated') return <Navigate to={from} replace />

  const done = (r: TokenOut) => {
    acceptSession(r)
    navigate(from, { replace: true })
  }

  return (
    <div className="flex min-h-dvh bg-white">
      <Showcase />
      <div className="relative flex min-w-0 flex-1 flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-brand-800">
            <ArrowLeft className="size-4" /> Back to the website
          </Link>
          <img src={LOGO.horizontal} alt="Evaramu Group Ltd" className="h-9 w-auto lg:hidden" />
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div key={mode} className="w-full max-w-sm animate-fade-slide">
            {outdated ? (
              <div role="status" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-semibold">The server is not fully updated</p>
                <p className="mt-0.5 text-amber-800">
                  This page is talking to an older version of the API at {API_ORIGIN.replace(/^https?:\/\//, '')}, so passkeys and email
                  codes are unavailable and sign-in may fail. Ask your administrator to finish the update.
                </p>
              </div>
            ) : null}
            {mode === 'password' ? (
              <PasswordSignIn
                email={email}
                onEmail={setEmail}
                emailCode={emailCode}
                passkey={passkey}
                onDone={done}
                onCode={() => setMode('code-request')}
              />
            ) : mode === 'code-request' ? (
              <CodeRequest email={email} onEmail={setEmail} onSent={() => setMode('code-verify')} onBack={() => setMode('password')} />
            ) : (
              <CodeVerify email={email} onDone={done} onBack={() => setMode('code-request')} />
            )}
          </div>
        </div>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
          <ShieldCheck className="size-3.5" /> Staff access only · every sign-in is recorded
        </p>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- forms -- */

function Heading({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">{children}</p>
    </>
  )
}

function PasswordSignIn({
  email,
  onEmail,
  emailCode,
  passkey,
  onDone,
  onCode,
}: {
  email: string
  onEmail: (v: string) => void
  emailCode: boolean
  passkey: boolean
  onDone: (r: TokenOut) => void
  onCode: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [show, setShow] = useState(false)
  const [forgot, setForgot] = useState(false)
  const [passkeyBusy, setPasskeyBusy] = useState(false)
  const { register, handleSubmit, formState, getValues } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email, password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    try {
      onDone(await api.publicPost<TokenOut>('/auth/login', { email: values.email, password: values.password }))
    } catch (e) {
      setError(errorMessage(e))
    }
  })

  async function withPasskey() {
    setError(null)
    setPasskeyBusy(true)
    try {
      const o = await api.publicPost<PasskeyOptionsOut>('/auth/passkeys/login/options')
      const credential = await startAuthentication({ optionsJSON: o.options as unknown as PublicKeyCredentialRequestOptionsJSON })
      onDone(await api.publicPost<TokenOut>('/auth/passkeys/login', { challenge_id: o.challenge_id, credential }))
    } catch (e) {
      const name = (e as { name?: string })?.name
      setError(name === 'NotAllowedError' || name === 'AbortError' ? 'Passkey sign-in was cancelled or timed out.' : errorMessage(e))
    } finally {
      setPasskeyBusy(false)
    }
  }

  const toCode = () => {
    onEmail(getValues('email') || email)
    onCode()
  }

  return (
    <>
      <Heading title="Welcome back">Sign in to manage Evaramu properties, tenants and rent.</Heading>
      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
        <FormError message={error} />
        <Field label="Email" htmlFor="email" error={formState.errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="username webauthn"
            inputMode="email"
            {...register('email', { onChange: (e) => onEmail(e.target.value) })}
            aria-invalid={!!formState.errors.email}
            className="h-12 sm:h-12"
          />
        </Field>
        <Field label="Password" htmlFor="password" error={formState.errors.password?.message}>
          <div className="relative">
            <Input
              id="password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              {...register('password')}
              aria-invalid={!!formState.errors.password}
              className="h-12 pr-12 sm:h-12"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 transition-colors hover:text-brand-800"
            >
              {show ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
            </button>
          </div>
        </Field>
        <div className="-mt-1 flex justify-end">
          <button type="button" onClick={() => (emailCode ? toCode() : setForgot((v) => !v))} className="text-sm font-medium text-brand-700 hover:text-brand-900">
            Forgot password?
          </button>
        </div>
        {forgot && !emailCode ? (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">Ask your administrator to reset it from Users & Roles.</p>
        ) : null}
        <Button type="submit" block size="lg" loading={formState.isSubmitting} icon={Lock} className="h-12">
          Sign in
        </Button>
      </form>

      {emailCode || passkey ? (
        <>
          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-400">
            <span className="h-px flex-1 bg-slate-200" /> or <span className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="space-y-3">
            {emailCode ? (
              <Button variant="outline" block size="lg" icon={Mail} onClick={toCode} className="h-12">
                Email me a sign-in code
              </Button>
            ) : null}
            {passkey ? (
              <Button variant="outline" block size="lg" icon={Fingerprint} loading={passkeyBusy} onClick={withPasskey} className="h-12">
                Sign in with a passkey
              </Button>
            ) : null}
          </div>
        </>
      ) : null}
    </>
  )
}

function CodeRequest({ email, onEmail, onSent, onBack }: { email: string; onEmail: (v: string) => void; onSent: () => void; onBack: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [value, setValue] = useState(email)
  const valid = z.string().trim().email().safeParse(value).success

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return setError('Enter a valid email address')
    setError(null)
    setBusy(true)
    try {
      await api.publicPost('/auth/email-code', { email: value.trim() })
      onEmail(value.trim())
      onSent()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <span className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
        <Mail className="size-6" />
      </span>
      <Heading title="Sign in with a code">We&rsquo;ll email you a 6-digit code. It works once and expires in 10 minutes.</Heading>
      <form onSubmit={send} className="mt-8 space-y-4" noValidate>
        <FormError message={error} />
        <Field label="Email" htmlFor="code-email">
          <Input id="code-email" type="email" autoComplete="username" inputMode="email" value={value} onChange={(e) => setValue(e.target.value)} className="h-12 sm:h-12" />
        </Field>
        <Button type="submit" block size="lg" loading={busy} icon={ArrowRight} className="h-12">
          Email me a code
        </Button>
      </form>
      <BackLink onClick={onBack}>Sign in with a password instead</BackLink>
    </>
  )
}

function CodeVerify({ email, onDone, onBack }: { email: string; onDone: (r: TokenOut) => void; onBack: () => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(30)
  const input = useRef<HTMLInputElement>(null)
  const submitted = useRef('')

  useEffect(() => {
    input.current?.focus()
  }, [])
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function verify(value = code) {
    if (value.length !== 6 || busy) return
    submitted.current = value
    setError(null)
    setBusy(true)
    try {
      onDone(await api.publicPost<TokenOut>('/auth/email-code/verify', { email, code: value }))
    } catch (e) {
      setError(errorMessage(e))
      setCode('')
      input.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    setError(null)
    try {
      await api.publicPost('/auth/email-code', { email })
      setCooldown(30)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <>
      <span className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-gold-50 text-gold-700 ring-1 ring-gold-100">
        <ShieldCheck className="size-6" />
      </span>
      <Heading title="Check your email">
        If <span className="font-medium text-slate-700">{email}</span> has an account, a 6-digit code is on its way.
      </Heading>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void verify()
        }}
        className="mt-8 space-y-4"
        noValidate
      >
        <FormError message={error} />
        <Field label="Sign-in code" htmlFor="code">
          <Input
            ref={input}
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 6)
              setCode(v)
              if (v.length === 6 && v !== submitted.current) void verify(v)
            }}
            placeholder="••••••"
            className="h-14 text-center font-mono text-2xl tracking-[0.6em] sm:h-14"
          />
        </Field>
        <Button type="submit" block size="lg" loading={busy} disabled={code.length !== 6} icon={Lock} className="h-12">
          Sign in
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500">
        Didn&rsquo;t get it?{' '}
        {cooldown > 0 ? (
          <span className="tabular">Send again in {cooldown}s</span>
        ) : (
          <button type="button" onClick={resend} className="font-medium text-brand-700 hover:text-brand-900">
            Send a new code
          </button>
        )}
      </p>
      <BackLink onClick={onBack}>Use a different email</BackLink>
    </>
  )
}

function BackLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <p className="mt-6 text-center">
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-800">
        <ArrowLeft className="size-4" /> {children}
      </button>
    </p>
  )
}

/* ------------------------------------------------------------- showcase -- */

type Slide = { icon: LucideIcon; title: string; text: string; metric: string; metricLabel: string; chip: string; art: ReactNode }

const SLIDES: Slide[] = [
  {
    icon: ReceiptText,
    title: 'Rent in, receipts out',
    text: 'Record a payment and the invoice, balance and tenant statement update on their own.',
    metric: '1 step',
    metricLabel: 'from payment recorded to approved',
    chip: 'Invoice → payment → approved',
    art: <PaymentArt />,
  },
  {
    icon: Building2,
    title: 'Every unit at a glance',
    text: 'Rooms, houses and shop rooms across every building — taken, free or reserved.',
    metric: 'Live',
    metricLabel: 'occupancy across the portfolio',
    chip: 'Unit → tenant → agreement',
    art: <UnitsArt />,
  },
  {
    icon: FileSignature,
    title: 'Agreements signed on screen',
    text: 'Draw up the contract, sign with a finger and verify any printed copy by its code.',
    metric: 'SHA-256',
    metricLabel: 'tamper-evident documents',
    chip: 'Draft → signed → verified',
    art: <AgreementArt />,
  },
]

function Showcase() {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setI((n) => (n + 1) % SLIDES.length), 6500)
    return () => clearInterval(t)
  }, [paused])
  const s = SLIDES[i]!

  return (
    <aside
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative hidden w-[52%] max-w-[920px] flex-col overflow-hidden bg-brand-950 p-10 text-white lg:flex xl:p-14"
    >
      <div className="bg-grid absolute inset-0" />
      <div className="pointer-events-none absolute -left-32 -top-32 size-[30rem] animate-glow rounded-full bg-brand-600/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-0 size-[26rem] animate-glow rounded-full bg-gold-500/20 blur-3xl [animation-delay:-3s]" />

      <div className="relative flex items-start justify-between gap-4">
        <img src={LOGO.horizontalReversed} alt="Evaramu Group Ltd" className="h-11 w-auto" />
        <span key={s.chip} className="inline-flex animate-fade-slide items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs text-white/70 ring-1 ring-white/15 backdrop-blur">
          <span className="size-1.5 rounded-full bg-gold-400" /> {s.chip}
        </span>
      </div>

      <div key={i} className="relative flex flex-1 animate-fade-slide items-center justify-center py-8" aria-hidden>
        {s.art}
      </div>

      <div className="relative">
        <span className="flex size-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
          <s.icon className="size-5 text-gold-300" />
        </span>
        <div key={`t${i}`} className="animate-fade-slide">
          <h2 className="mt-5 text-3xl font-bold tracking-tight">{s.title}</h2>
          <p className="mt-2 max-w-md text-brand-100/75">{s.text}</p>
          <p className="mt-6 text-3xl font-bold text-gold-300">{s.metric}</p>
          <p className="text-sm text-brand-100/60">{s.metricLabel}</p>
        </div>
        <div className="mt-8 flex items-center justify-between gap-4">
          <p className="text-xs text-brand-100/45">© {new Date().getFullYear()} Evaramu Group Ltd · Kigali, Rwanda</p>
          <div className="flex gap-1.5" role="tablist" aria-label="Highlights">
            {SLIDES.map((sl, n) => (
              <button
                key={sl.title}
                type="button"
                role="tab"
                aria-selected={n === i}
                aria-label={sl.title}
                onClick={() => setI(n)}
                className={cn('h-1.5 rounded-full transition-all', n === i ? 'w-7 bg-gold-400' : 'w-1.5 bg-white/30 hover:bg-white/60')}
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}

const card = 'rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/15 backdrop-blur-md shadow-[0_20px_50px_-20px_rgb(0_0_0/0.6)]'

function PaymentArt() {
  return (
    <div className="relative h-72 w-full max-w-md">
      <div className={cn(card, 'absolute left-0 top-6 w-52 animate-float')}>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Invoice</p>
        <p className="mt-1 font-mono text-xs text-white/70">INV-202611-0007</p>
        <p className="mt-3 text-xl font-bold">650,000 RWF</p>
        <p className="text-xs text-white/50">Due 5 Nov · Apartment A1</p>
        <span className="absolute -right-2 -top-2 rounded-full bg-gold-500 px-2 py-0.5 text-[10px] font-bold text-white animate-pop [--pop-delay:900ms]">
          DUE
        </span>
      </div>
      <svg className="absolute inset-0 size-full" viewBox="0 0 400 290" fill="none">
        <path d="M200 70 C 300 70, 300 150, 240 190" stroke="rgb(255 255 255 / 0.35)" strokeWidth="1.6" className="animate-dash" />
      </svg>
      <div className={cn(card, 'absolute bottom-2 right-0 w-56 animate-float [--float-delay:-3s]')}>
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-white/10"><ReceiptText className="size-4 text-white/70" /></span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-2 w-24 rounded-full bg-white/30" />
            <div className="h-2 w-16 rounded-full bg-white/15" />
          </div>
        </div>
        <p className="mt-3 text-sm text-white/70">Bank transfer · 650,000 RWF</p>
        <span className="absolute -right-3 -top-3 flex size-8 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-brand-950 animate-pop [--pop-delay:600ms]">
          <Check className="size-4" />
        </span>
      </div>
      <span className="absolute bottom-24 left-6 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/30 animate-pop [--pop-delay:1200ms]">
        Approved · balance 0 RWF
      </span>
    </div>
  )
}

function UnitsArt() {
  const tiles = ['t', 't', 'f', 't', 'r', 't', 'f', 't', 't', 't', 'f', 't']
  const color = { t: 'bg-emerald-400/80', f: 'bg-white/15', r: 'bg-gold-400/80' } as const
  return (
    <div className="flex w-full max-w-md items-center gap-8">
      <div className={cn(card, 'grid flex-1 grid-cols-4 gap-2 animate-float')}>
        {tiles.map((t, n) => (
          <span
            key={n}
            style={{ '--tile-delay': `${n * 0.23}s` } as React.CSSProperties}
            className={cn('aspect-square rounded-lg', color[t as keyof typeof color], t === 'f' && 'animate-blink-tile')}
          />
        ))}
      </div>
      <div className="relative size-36 shrink-0 animate-float [--float-delay:-2s]">
        <svg viewBox="0 0 120 120" className="size-full -rotate-90">
          <circle cx="60" cy="60" r="50" stroke="rgb(255 255 255 / 0.12)" strokeWidth="12" fill="none" />
          <circle cx="60" cy="60" r="50" stroke="#34d399" strokeWidth="12" fill="none" strokeLinecap="round" strokeDasharray="314" strokeDashoffset="78" className="animate-draw [--len:314]" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">75%</span>
          <span className="text-[10px] uppercase tracking-widest text-white/50">taken</span>
        </div>
      </div>
    </div>
  )
}

function AgreementArt() {
  return (
    <div className="relative h-72 w-full max-w-sm">
      <div className={cn(card, 'absolute inset-x-6 top-0 bottom-6 bg-white/[0.09] p-6 animate-float')}>
        <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-white/60">Amasezerano y&rsquo;ubukode</p>
        <div className="mt-4 space-y-2">
          {[100, 92, 96, 70, 88, 60].map((w, n) => (
            <div key={n} className="h-1.5 rounded-full bg-white/15" style={{ width: `${w}%` }} />
          ))}
        </div>
        <svg viewBox="0 0 220 60" className="mt-6 h-14 w-48" fill="none">
          <path
            d="M6 40 C 30 6, 44 54, 64 30 S 96 8, 110 36 S 150 52, 168 24 S 200 30, 214 18"
            stroke="#e9b86c"
            strokeWidth="2.6"
            strokeLinecap="round"
            className="animate-draw [--len:320]"
          />
        </svg>
        <div className="mt-1 h-px w-48 bg-white/25" />
        <p className="mt-1 text-[10px] text-white/50">Umukono · signed digitally</p>
      </div>
      <span className="absolute bottom-0 right-0 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-mono text-[11px] font-semibold text-brand-900 shadow-lg animate-pop [--pop-delay:1400ms]">
        <ShieldCheck className="size-3.5 text-emerald-600" /> 7KQ2 9XMA PT4D
      </span>
    </div>
  )
}
