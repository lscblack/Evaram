import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react'
import { Seo } from '@/components/Seo'
import { Logo } from '@/components/ui/Logo'
import { Captcha, EMPTY_CAPTCHA, type CaptchaValue } from '@/components/ui/Captcha'
import { OtpInput } from '@/components/ui/OtpInput'
import { useAuth } from '@/lib/auth'
import { useSiteConfig } from '@/lib/siteConfig'
import { EASE } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { LoginChallenge } from '@/types/api'

/** Overridable from Settings → brand, so the console can be re-skinned. */
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=80'

const FIELD =
  'h-13 w-full rounded-xl border border-line bg-canvas-alt pr-4 pl-11 text-[0.9375rem] text-ink ' +
  'transition-all duration-200 outline-none placeholder:text-ink-faint ' +
  'focus:border-gold-500 focus:bg-surface focus:ring-2 focus:ring-gold-500/25'

const ASSURANCES = [
  'Every request encrypted end to end',
  'A one-time code on every sign-in',
  'Every change written to the audit log',
]

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const { user, login, verifyOtp, resendOtp } = useAuth()
  const { setting } = useSiteConfig()

  const image = setting('brand.login_image', FALLBACK_IMAGE)

  const [stage, setStage] = useState<'credentials' | 'otp'>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captcha, setCaptcha] = useState<CaptchaValue>(EMPTY_CAPTCHA)
  const [challenge, setChallenge] = useState<LoginChallenge | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) navigate('/admin', { replace: true })
  }, [user, navigate])

  const submitCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const next = await login(email, password, {
        token: captcha.captcha_token,
        answer: captcha.captcha_answer,
      })
      setChallenge(next)
      setStage('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Those details were not accepted.')
    } finally {
      setBusy(false)
    }
  }

  /** Shared by the button and by the code completing itself. */
  const confirmOtp = async (value: string) => {
    if (!challenge || busy) return
    setBusy(true)
    setError(null)
    try {
      await verifyOtp(challenge.pre_auth_token, value)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code was not accepted.')
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    if (!challenge) return
    setBusy(true)
    setError(null)
    try {
      setChallenge(await resendOtp(challenge.pre_auth_token))
      setCode('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not send another code.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Seo title="Sign in — Evaramu" description="Staff sign-in." path="/admin/login" noIndex />

      <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[1.05fr_1fr] xl:grid-cols-[1.2fr_1fr]">
        {/* ================= brand panel ================= */}
        <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-14">
          <img
            src={image}
            alt=""
            aria-hidden
            className="absolute inset-0 size-full object-cover"
          />
          {/* Two layers: a wash for brand colour, a gradient so text stays legible
              over whatever photograph an admin sets. */}
          <div aria-hidden className="absolute inset-0 bg-navy-950/75" />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/45 to-navy-950/70"
          />

          <div className="relative">
            <Logo tone="light" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
            className="relative max-w-lg"
          >
            <h1 className="font-display text-[2.5rem] leading-[1.08] font-semibold text-white xl:text-[3rem]">
              The console behind
              <span className="mt-1 block text-gold-400">every listing.</span>
            </h1>
            <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-white/65">
              Listings, verification, categories, page copy and settings. Everything the public site
              reads is edited here.
            </p>
          </motion.div>

          <ul className="relative space-y-3.5">
            {ASSURANCES.map((line) => (
              <li key={line} className="flex items-center gap-3 text-[0.875rem] text-white/70">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/10 backdrop-blur-sm">
                  <ShieldCheck className="size-3.5 text-gold-400" strokeWidth={2.4} />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </aside>

        {/* ================= form panel ================= */}
        <main className="relative flex min-w-0 flex-col bg-canvas">
          {/* On small screens the photograph becomes a banner rather than
              disappearing — the page would otherwise open on a bare form. */}
          <div className="relative h-36 shrink-0 overflow-hidden sm:h-44 lg:hidden">
            <img src={image} alt="" aria-hidden className="size-full object-cover" />
            <div aria-hidden className="absolute inset-0 bg-navy-950/70" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
              <Logo tone="light" />
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10 sm:py-14">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: EASE }}
              className="w-full max-w-[26rem]"
            >
              {/* ---- step marker ---- */}
              <div className="mb-7 flex items-center gap-2.5">
                {(['credentials', 'otp'] as const).map((s, i) => (
                  <span key={s} className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        'grid size-6 place-items-center rounded-full text-[0.6875rem] font-bold transition-colors',
                        stage === s || (s === 'credentials' && stage === 'otp')
                          ? 'bg-gold-500 text-white'
                          : 'bg-canvas-alt text-ink-faint',
                      )}
                    >
                      {i + 1}
                    </span>
                    {i === 0 && <span className="h-px w-8 bg-line" />}
                  </span>
                ))}
                <span className="ml-1 text-[0.8125rem] font-medium text-ink-muted">
                  {stage === 'credentials' ? 'Your details' : 'Confirm it is you'}
                </span>
              </div>

              <h2 className="font-display text-[1.875rem] leading-tight font-semibold text-ink">
                {stage === 'credentials' ? 'Sign in' : 'Check your email'}
              </h2>
              <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-muted">
                {stage === 'credentials' ? (
                  'Staff access only. We will send a one-time code to confirm it is you.'
                ) : (
                  <>
                    We sent a six-character code to{' '}
                    <span className="font-semibold text-ink">{challenge?.sent_to}</span>.
                  </>
                )}
              </p>

              {/* ---- step one ---- */}
              {stage === 'credentials' ? (
                <form onSubmit={submitCredentials} className="mt-8 space-y-4">
                  <div className="relative">
                    <label htmlFor="admin-email" className="sr-only">
                      Email address
                    </label>
                    <Mail
                      className="pointer-events-none absolute top-1/2 left-4 size-[1.05rem] -translate-y-1/2 text-ink-faint"
                      strokeWidth={2}
                    />
                    <input
                      id="admin-email"
                      type="email"
                      required
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@evaramu.rw"
                      className={FIELD}
                    />
                  </div>

                  <div className="relative">
                    <label htmlFor="admin-password" className="sr-only">
                      Password
                    </label>
                    <Lock
                      className="pointer-events-none absolute top-1/2 left-4 size-[1.05rem] -translate-y-1/2 text-ink-faint"
                      strokeWidth={2}
                    />
                    <input
                      id="admin-password"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your password"
                      className={FIELD}
                    />
                  </div>

                  <Captcha value={captcha} onChange={setCaptcha} scope="login" compact />

                  {error && <ErrorNote message={error} />}

                  <SubmitButton busy={busy} label="Continue" busyLabel="Checking…" />
                </form>
              ) : (
                /* ---- step two ---- */
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    void confirmOtp(code)
                  }}
                  className="mt-8 space-y-5"
                >
                  <OtpInput
                    value={code}
                    onChange={setCode}
                    autoFocus
                    disabled={busy}
                    invalid={Boolean(error)}
                    onComplete={(value) => void confirmOtp(value)}
                    label="One-time code"
                  />

                  <p className="text-center text-[0.8125rem] text-ink-faint">
                    Letters and numbers · not case sensitive
                  </p>

                  {error && <ErrorNote message={error} />}

                  <SubmitButton
                    busy={busy}
                    disabled={code.length < 6}
                    label="Sign in"
                    busyLabel="Verifying…"
                  />

                  <div className="flex items-center justify-between gap-4 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setStage('credentials')
                        setCode('')
                        setError(null)
                      }}
                      className="inline-flex items-center gap-1.5 text-[0.875rem] font-medium text-ink-muted transition-colors hover:text-ink"
                    >
                      <ArrowLeft className="size-3.5" strokeWidth={2.2} />
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => void resend()}
                      disabled={busy}
                      className="text-[0.875rem] font-semibold text-gold-600 transition-colors hover:text-gold-700 disabled:opacity-50"
                    >
                      Send another code
                    </button>
                  </div>
                </form>
              )}

              <p className="mt-9 border-t border-line pt-6 text-center text-[0.8125rem] text-ink-faint">
                Not staff?{' '}
                <Link to="/" className="font-semibold text-ink-soft transition-colors hover:text-ink">
                  Back to the website
                </Link>
              </p>
            </motion.div>
          </div>
        </main>
      </div>
    </>
  )
}

function ErrorNote({ message }: { message: string }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[0.875rem] text-red-700"
    >
      {message}
    </motion.p>
  )
}

function SubmitButton({
  busy,
  disabled,
  label,
  busyLabel,
}: {
  busy: boolean
  disabled?: boolean
  label: string
  busyLabel: string
}) {
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      className={cn(
        'group inline-flex h-13 w-full items-center justify-center gap-2 rounded-xl',
        'bg-gold-500 text-[0.9375rem] font-semibold text-white',
        'transition-all duration-200 hover:bg-gold-600 hover:shadow-lift',
        'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-gold-500 disabled:hover:shadow-none',
      )}
    >
      {busy ? (
        <>
          <Loader2 className="size-4 animate-spin" strokeWidth={2.4} />
          {busyLabel}
        </>
      ) : (
        <>
          {label}
          <ArrowRight
            className="size-[1.05rem] transition-transform duration-200 group-hover:translate-x-0.5"
            strokeWidth={2.3}
          />
        </>
      )}
    </button>
  )
}
