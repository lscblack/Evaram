import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react'
import { Seo } from '@/components/Seo'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { Captcha, EMPTY_CAPTCHA, type CaptchaValue } from '@/components/ui/Captcha'
import { useAuth } from '@/lib/auth'
import { EASE } from '@/lib/motion'
import type { LoginChallenge } from '@/types/api'

const INPUT =
  'h-12 w-full rounded-2xl border border-line bg-canvas pr-4 pl-11 text-[0.9375rem] text-ink ' +
  'transition-colors placeholder:text-ink-faint focus:border-gold-500 focus:bg-surface focus:outline-none'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const { user, login, verifyOtp, resendOtp } = useAuth()

  const [stage, setStage] = useState<'credentials' | 'otp'>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captcha, setCaptcha] = useState<CaptchaValue>(EMPTY_CAPTCHA)
  const [challenge, setChallenge] = useState<LoginChallenge | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Already signed in? Straight through.
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
      setNotice(`Code sent to ${next.sent_to}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Those details were not accepted.')
    } finally {
      setBusy(false)
    }
  }

  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!challenge) return
    setBusy(true)
    setError(null)
    try {
      await verifyOtp(challenge.pre_auth_token, code)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code was not accepted.')
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    if (!challenge) return
    setBusy(true)
    setError(null)
    try {
      const next = await resendOtp(challenge.pre_auth_token)
      setChallenge(next)
      setNotice(`A new code is on its way to ${next.sent_to}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not send another code.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Seo title="Sign in — Evaramu" description="Staff sign-in." path="/admin/login" noIndex />

      <div className="grid min-h-dvh lg:grid-cols-2">
        {/* ---- brand panel ---- */}
        <div className="relative hidden overflow-hidden bg-navy-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute inset-0 bg-blueprint opacity-60" />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 -right-24 size-[34rem] rounded-full bg-gold-500/12 blur-[130px]"
          />

          <div className="relative">
            <Logo />
          </div>

          <div className="relative max-w-md">
            <h1 className="font-display text-[2.5rem] leading-[1.1] font-semibold">
              The console behind
              <span className="block text-gold-400">every listing.</span>
            </h1>
            <p className="mt-5 text-[0.9375rem] leading-relaxed text-white/55">
              Listings, verification, categories, page copy and settings. Everything the public site
              reads is edited here.
            </p>
          </div>

          <ul className="relative space-y-3 text-[0.875rem] text-white/50">
            {[
              'Every request encrypted end to end',
              'One-time code on every sign-in',
              'Every change written to the audit log',
            ].map((line) => (
              <li key={line} className="flex items-center gap-2.5">
                <ShieldCheck className="size-4 shrink-0 text-gold-400" strokeWidth={2.2} />
                {line}
              </li>
            ))}
          </ul>
        </div>

        {/* ---- form panel ---- */}
        <div className="flex items-center justify-center bg-canvas px-5 py-14 sm:px-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="w-full max-w-md"
          >
            <div className="lg:hidden">
              <Logo />
            </div>

            <h2 className="mt-8 font-display text-[1.75rem] leading-tight font-semibold text-ink lg:mt-0">
              {stage === 'credentials' ? 'Sign in' : 'Enter your code'}
            </h2>
            <p className="mt-2.5 text-[0.9375rem] text-ink-muted">
              {stage === 'credentials'
                ? 'Staff access only. You will be sent a one-time code.'
                : notice}
            </p>

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
                    className={INPUT}
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
                    className={INPUT}
                  />
                </div>

                <Captcha value={captcha} onChange={setCaptcha} scope="login" compact />

                {error && (
                  <p
                    role="alert"
                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[0.875rem] text-red-700"
                  >
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  variant="gold"
                  size="lg"
                  className="w-full"
                  disabled={busy}
                  trailing={<ArrowRight className="size-[1.05rem]" strokeWidth={2.3} />}
                >
                  {busy ? 'Checking…' : 'Continue'}
                </Button>
              </form>
            ) : (
              <form onSubmit={submitOtp} className="mt-8 space-y-4">
                <div className="relative">
                  <label htmlFor="admin-otp" className="sr-only">
                    One-time code
                  </label>
                  <KeyRound
                    className="pointer-events-none absolute top-1/2 left-4 size-[1.05rem] -translate-y-1/2 text-ink-faint"
                    strokeWidth={2}
                  />
                  <input
                    id="admin-otp"
                    required
                    autoComplete="one-time-code"
                    autoFocus
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="A1B2C3"
                    // Codes are alphanumeric, so no numeric keypad hint here.
                    className={`${INPUT} font-mono tracking-[0.35em] uppercase`}
                  />
                </div>

                {error && (
                  <p
                    role="alert"
                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[0.875rem] text-red-700"
                  >
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  variant="gold"
                  size="lg"
                  className="w-full"
                  disabled={busy}
                  trailing={<ArrowRight className="size-[1.05rem]" strokeWidth={2.3} />}
                >
                  {busy ? 'Verifying…' : 'Sign in'}
                </Button>

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
                    onClick={resend}
                    disabled={busy}
                    className="text-[0.875rem] font-semibold text-gold-600 transition-colors hover:text-gold-700 disabled:opacity-50"
                  >
                    Send another code
                  </button>
                </div>
              </form>
            )}

            <p className="mt-8 text-[0.8125rem] text-ink-faint">
              Not staff?{' '}
              <a href="/" className="font-semibold text-ink-soft hover:text-ink">
                Back to the website
              </a>
            </p>
          </motion.div>
        </div>
      </div>
    </>
  )
}
