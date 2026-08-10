import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Captcha, EMPTY_CAPTCHA, type CaptchaValue } from '@/components/ui/Captcha'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useSiteConfig } from '@/lib/siteConfig'
import { useT } from '@/lib/i18n'
import { fadeUp, enterProps } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { PropertyRequestReceipt } from '@/types/api'

const INPUT =
  'h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[0.9375rem] text-ink ' +
  'transition-colors placeholder:text-ink-faint focus:border-gold-500 focus:bg-surface focus:outline-none'

/**
 * "Tell us what you are looking for."
 *
 * Most of our stock never reaches the public catalogue, so a buyer who finds
 * nothing here is not out of options — they just need to be on a consultant's
 * list. Deliberately open to visitors who are not signed in; requiring an
 * account at this exact moment loses the enquiry.
 */
export function PropertyRequestForm({ className }: { className?: string }) {
  const t = useT()
  const { user } = useAuth()
  const { districts } = useSiteConfig()

  const [form, setForm] = useState({
    full_name: user?.full_name ?? '',
    phone: user?.phone ?? '',
    email: user?.email ?? '',
    intent: 'sale' as 'sale' | 'rent',
    district: '',
    preferred_areas: '',
    budget_min: '',
    budget_max: '',
    bedrooms_min: '',
    timeline: '',
    notes: '',
  })
  const [captcha, setCaptcha] = useState<CaptchaValue>(EMPTY_CAPTCHA)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [receipt, setReceipt] = useState<PropertyRequestReceipt | null>(null)

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  /** Empty strings must go as null, not 0 — a blank budget is not a zero budget. */
  const num = (value: string): number | null => {
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = Number(trimmed.replace(/[^\d.]/g, ''))
    return Number.isFinite(parsed) ? parsed : null
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setFields({})
    try {
      const result = await api.post<PropertyRequestReceipt>('/public/property-requests', {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        intent: form.intent,
        district: form.district || null,
        preferred_areas: form.preferred_areas.trim() || null,
        budget_min: num(form.budget_min),
        budget_max: num(form.budget_max),
        bedrooms_min: num(form.bedrooms_min),
        timeline: form.timeline.trim() || null,
        notes: form.notes.trim() || null,
        ...captcha,
      })
      setReceipt(result)
    } catch (err) {
      const failure = err as ApiError
      setError(failure.message)
      if (failure.fields) setFields(failure.fields)
      // A consumed challenge cannot be replayed, so force a fresh one.
      setCaptcha(EMPTY_CAPTCHA)
    } finally {
      setBusy(false)
    }
  }

  if (receipt) {
    return (
      <motion.div
        variants={fadeUp}
        {...enterProps}
        className={cn(
          'rounded-3xl border border-line bg-surface p-7 text-center sm:p-9',
          className,
        )}
      >
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-700">
          <Check className="size-6" strokeWidth={2.4} />
        </span>
        <h3 className="mt-5 font-display text-xl font-semibold text-ink">
          {t('request.thanksTitle')}
        </h3>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">{receipt.detail}</p>
        <p className="mt-5 font-mono text-[0.8125rem] text-ink-muted">{receipt.reference}</p>
      </motion.div>
    )
  }

  return (
    <motion.form
      variants={fadeUp}
      {...enterProps}
      onSubmit={submit}
      className={cn('rounded-3xl border border-line bg-surface p-7 sm:p-9', className)}
    >
      <h3 className="font-display text-xl font-semibold text-ink">{t('request.title')}</h3>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">{t('request.body')}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label={t('request.name')} error={fields.full_name}>
          <input
            required
            value={form.full_name}
            onChange={(e) => set('full_name')(e.target.value)}
            className={INPUT}
            placeholder={t('account.namePlaceholder')}
          />
        </Field>
        <Field label={t('request.phone')} error={fields.phone}>
          <input
            required
            value={form.phone}
            onChange={(e) => set('phone')(e.target.value)}
            className={INPUT}
            placeholder={t('account.phonePlaceholder')}
          />
        </Field>
        <Field label={t('request.email')} error={fields.email}>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set('email')(e.target.value)}
            className={INPUT}
            placeholder={t('footer.emailPlaceholder')}
          />
        </Field>
        <Field label={t('request.lookingTo')}>
          <div className="flex h-12 gap-2 rounded-2xl border border-line p-1">
            {(['sale', 'rent'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => set('intent')(value)}
                className={cn(
                  'flex-1 rounded-xl text-[0.875rem] font-semibold transition-colors',
                  form.intent === value ? 'bg-ink text-canvas' : 'text-ink-soft hover:text-ink',
                )}
              >
                {value === 'sale' ? t('prop.buy') : t('prop.rent')}
              </button>
            ))}
          </div>
        </Field>

        <Field label={t('market.district')}>
          <select
            value={form.district}
            onChange={(e) => set('district')(e.target.value)}
            className={INPUT}
          >
            <option value="">{t('market.allDistricts')}</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('request.areas')} hint={t('request.areasHint')}>
          <input
            value={form.preferred_areas}
            onChange={(e) => set('preferred_areas')(e.target.value)}
            className={INPUT}
            placeholder={t('request.areasPlaceholder')}
          />
        </Field>

        <Field label={t('request.budgetMin')} error={fields.budget_min}>
          <input
            inputMode="numeric"
            value={form.budget_min}
            onChange={(e) => set('budget_min')(e.target.value)}
            className={INPUT}
            placeholder="0"
          />
        </Field>
        <Field label={t('request.budgetMax')} error={fields.budget_max}>
          <input
            inputMode="numeric"
            value={form.budget_max}
            onChange={(e) => set('budget_max')(e.target.value)}
            className={INPUT}
            placeholder="0"
          />
        </Field>

        <Field label={t('request.bedrooms')}>
          <input
            inputMode="numeric"
            value={form.bedrooms_min}
            onChange={(e) => set('bedrooms_min')(e.target.value)}
            className={INPUT}
            placeholder="0"
          />
        </Field>
        <Field label={t('request.timeline')}>
          <input
            value={form.timeline}
            onChange={(e) => set('timeline')(e.target.value)}
            className={INPUT}
            placeholder={t('request.timelinePlaceholder')}
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label={t('request.notes')} error={fields.notes}>
          <textarea
            rows={4}
            value={form.notes}
            onChange={(e) => set('notes')(e.target.value)}
            className={cn(INPUT, 'h-auto py-3')}
            placeholder={t('request.notesPlaceholder')}
          />
        </Field>
      </div>

      <div className="mt-5">
        <Captcha value={captcha} onChange={setCaptcha} scope="enquiry" compact />
      </div>

      {error && (
        <p role="alert" className="mt-4 text-[0.875rem] text-red-600">
          {error}
        </p>
      )}

      <Button type="submit" disabled={busy} className="mt-6 w-full">
        {busy ? t('common.loading') : t('request.submit')}
        <Send className="size-4" strokeWidth={2.2} />
      </Button>
    </motion.form>
  )
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">
        {label}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-[0.75rem] text-red-600">{error}</span>
      ) : (
        hint && <span className="mt-1.5 block text-[0.75rem] text-ink-faint">{hint}</span>
      )}
    </label>
  )
}
