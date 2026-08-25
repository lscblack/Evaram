import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Lock, Mail, Phone, User } from 'lucide-react'
import { Seo } from '@/components/Seo'
import { PageHero } from '@/components/layout/PageHero'
import { Button } from '@/components/ui/Button'
import { Captcha, EMPTY_CAPTCHA, type CaptchaValue } from '@/components/ui/Captcha'
import { OtpInput } from '@/components/ui/OtpInput'
import { AccountDashboard } from '@/components/account/AccountDashboard'
import { ProfilePanel } from '@/components/account/ProfilePanel'
import { useAuth } from '@/lib/auth'
import { useBlock } from '@/lib/queries'
import { EASE } from '@/lib/motion'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { LoginChallenge } from '@/types/api'

const INPUT =
  'h-12 w-full rounded-2xl border border-line bg-canvas pr-4 pl-11 text-[0.9375rem] text-ink ' +
  'transition-colors placeholder:text-ink-faint focus:border-gold-500 focus:bg-surface focus:outline-none'

type Mode = 'signin' | 'register'

/**
 * Buyer accounts. An offer has to carry a verified identity, so placing a bid
 * means signing in first — this is where that happens.
 */
export default function AccountPage() {
  const t = useT()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user, login, register, verifyOtp, resendOtp } = useAuth()

  const block = useBlock('account', 'hero', {
    eyebrow: 'Your account',
    title: 'Offers carry',
    accent: 'a name.',
    body: 'Create an account to place an offer on a property, follow what you have bid on, and hear back from the consultant handling it.',
  })

  const [mode, setMode] = useState<Mode>(params.get('mode') === 'register' ? 'register' : 'signin')
  const [stage, setStage] = useState<'form' | 'otp'>('form')
  const [pane, setPane] = useState<'overview' | 'profile'>('overview')
  const [form, setForm] = useState({ email: '', password: '', full_name: '', phone: '' })
  const [captcha, setCaptcha] = useState<CaptchaValue>(EMPTY_CAPTCHA)
  const [challenge, setChallenge] = useState<LoginChallenge | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Where to land after signing in — set when the visitor was sent here
   *  mid-flow, e.g. from a property they wanted to bid on. Absent means they
   *  came to /account deliberately, so they get their dashboard instead of
   *  being bounced somewhere they did not ask for. */
  const next = params.get('next')

  useEffect(() => {
    if (user && next) navigate(next, { replace: true })
  }, [user, navigate, next])

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const challengeResult =
        mode === 'signin'
          ? await login(form.email, form.password, {
              token: captcha.captcha_token,
              answer: captcha.captcha_answer,
            })
          : await register({
              email: form.email,
              full_name: form.full_name,
              password: form.password,
              phone: form.phone,
              captcha: { token: captcha.captcha_token, answer: captcha.captcha_answer },
            })
      setChallenge(challengeResult)
      setStage('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work. Please try again.')
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
      // No `next` means they came here on purpose — stay and show the dashboard.
      navigate(next ?? '/account', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code was not accepted.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Seo
        title={mode === 'register' ? 'Create an account' : 'Sign in'}
        description="Sign in to place an offer on a property with Evaramu."
        path="/account"
        noIndex
      />

      <PageHero
        eyebrow={block.eyebrow}
        title={block.title}
        accent={block.accent}
        description={block.body}
        crumbs={[{ label: t('nav.account') }]}
        compact
      />

      <section className="bg-canvas py-16 lg:py-20">
        <div className="container-page">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className={cn(
              'mx-auto',
              // A signed-in account has more to show than a sign-in form, and
              // the card chrome belongs to the form — the dashboard and profile
              // bring their own panels.
              user
                ? 'max-w-3xl'
                : 'max-w-md rounded-3xl border border-line bg-surface p-7 shadow-soft sm:p-9',
            )}
          >
            {user ? (
              <>
                <div className="mb-6 flex gap-1 rounded-full border border-line bg-surface p-1">
                  {(
                    [
                      { id: 'overview', label: 'Overview' },
                      { id: 'profile', label: 'Profile & security' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setPane(t.id)}
                      aria-pressed={pane === t.id}
                      className={cn(
                        'flex-1 rounded-full px-4 py-2.5 text-[0.875rem] font-semibold transition-colors',
                        pane === t.id
                          ? 'bg-ink text-canvas'
                          : 'text-ink-soft hover:bg-canvas-alt hover:text-ink',
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {pane === 'overview' ? (
                  <div className="rounded-3xl border border-line bg-surface p-7 shadow-soft sm:p-9">
                    <AccountDashboard />
                  </div>
                ) : (
                  <ProfilePanel />
                )}
              </>
            ) : stage === 'form' ? (
              <>
                <div className="mb-7 flex gap-2 rounded-full border border-line p-1">
                  {(['signin', 'register'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setMode(m)
                        setError(null)
                      }}
                      className={cn(
                        'flex-1 rounded-full px-4 py-2 text-[0.875rem] font-semibold transition-colors',
                        mode === m ? 'bg-ink text-canvas' : 'text-ink-soft hover:text-ink',
                      )}
                    >
                      {m === 'signin' ? 'Sign in' : 'Create account'}
                    </button>
                  ))}
                </div>

                <form onSubmit={submit} className="space-y-4">
                  {mode === 'register' && (
                    <>
                      <IconField
                        id="acc-name"
                        icon={User}
                        label="Full name"
                        required
                        value={form.full_name}
                        onChange={set('full_name')}
                        placeholder={t('account.namePlaceholder')}
                      />
                      <IconField
                        id="acc-phone"
                        icon={Phone}
                        label="Phone"
                        type="tel"
                        value={form.phone}
                        onChange={set('phone')}
                        placeholder={t('account.phonePlaceholder')}
                      />
                    </>
                  )}

                  <IconField
                    id="acc-email"
                    icon={Mail}
                    label="Email"
                    type="email"
                    required
                    autoComplete="username"
                    value={form.email}
                    onChange={set('email')}
                    placeholder="you@example.com"
                  />
                  <IconField
                    id="acc-password"
                    icon={Lock}
                    label="Password"
                    type="password"
                    required
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    value={form.password}
                    onChange={set('password')}
                    placeholder={mode === 'signin' ? 'Your password' : 'At least 8 characters'}
                  />

                  <Captcha
                    value={captcha}
                    onChange={setCaptcha}
                    scope={mode === 'signin' ? 'login' : 'register'}
                    compact
                  />

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
                    {busy ? 'Please wait…' : mode === 'signin' ? 'Continue' : 'Create account'}
                  </Button>
                </form>
              </>
            ) : (
              <form onSubmit={submitOtp} className="space-y-4">
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink">Enter your code</h2>
                  <p className="mt-1.5 text-[0.875rem] text-ink-muted">
                    We sent a one-time code to {challenge?.sent_to}.
                  </p>
                </div>

                <OtpInput
                  value={code}
                  onChange={setCode}
                  autoFocus
                  disabled={busy}
                  invalid={Boolean(error)}
                  label="One-time code"
                />

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
                  {busy ? 'Verifying…' : 'Confirm'}
                </Button>

                <div className="flex items-center justify-between gap-4 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setStage('form')
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
                    disabled={busy}
                    onClick={async () => {
                      if (!challenge) return
                      setBusy(true)
                      try {
                        setChallenge(await resendOtp(challenge.pre_auth_token))
                      } finally {
                        setBusy(false)
                      }
                    }}
                    className="text-[0.875rem] font-semibold text-gold-600 transition-colors hover:text-gold-700 disabled:opacity-50"
                  >
                    Send another code
                  </button>
                </div>
              </form>
            )}

            <p className="mt-7 text-center text-[0.8125rem] text-ink-muted">
              Staff sign in at{' '}
              <Link to="/admin/login" className="font-semibold text-ink-soft hover:text-ink">
                the console
              </Link>
              .
            </p>
          </motion.div>
        </div>
      </section>
    </>
  )
}

function IconField({
  id,
  icon: Cmp,
  label,
  className,
  onChange,
  ...rest
}: {
  id: string
  icon: typeof Mail
  label: string
  className?: string
  onChange: (value: string) => void
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'id' | 'className'>) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Cmp
        className="pointer-events-none absolute top-1/2 left-4 size-[1.05rem] -translate-y-1/2 text-ink-faint"
        strokeWidth={2}
      />
      <input id={id} onChange={(e) => onChange(e.target.value)} className={cn(INPUT, className)} {...rest} />
    </div>
  )
}
