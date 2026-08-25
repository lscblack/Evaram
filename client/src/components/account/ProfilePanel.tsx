import { useEffect, useRef, useState } from 'react'
import { Camera, Check, KeyRound, Loader2, Trash2, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { api, mediaUrl } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useFormErrors } from '@/lib/formErrors'
import { cn } from '@/lib/utils'
import type { AuthUser } from '@/types/api'

const FIELD =
  'h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[0.9375rem] text-ink ' +
  'transition-colors placeholder:text-ink-faint focus:border-gold-500 focus:bg-surface focus:outline-none'

const LABEL = 'mb-1.5 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase'

/**
 * The signed-in person's own account.
 *
 * Three things that are genuinely separate — who you are, your picture, and
 * your password — kept as three saves rather than one. A password change signs
 * out every other device, which is not something to do as a side effect of
 * correcting a phone number.
 */
export function ProfilePanel() {
  const { user, refreshUser } = useAuth()
  if (!user) return null
  return (
    <div className="space-y-5">
      <PhotoCard user={user} onSaved={refreshUser} />
      <DetailsCard user={user} onSaved={refreshUser} />
      <PasswordCard />
    </div>
  )
}

function Card({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-3xl border border-line bg-surface">
      <div className="border-b border-line px-6 py-4">
        <h2 className="font-display text-[1.0625rem] font-semibold text-ink">{title}</h2>
        {description && (
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-muted">{description}</p>
        )}
      </div>
      <div className="p-6">{children}</div>
    </section>
  )
}

/** A short-lived "saved" tick, so a silent save does not look like a no-op. */
function useSavedFlag() {
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    if (!saved) return
    const id = window.setTimeout(() => setSaved(false), 2600)
    return () => window.clearTimeout(id)
  }, [saved])
  return [saved, setSaved] as const
}

function PhotoCard({ user, onSaved }: { user: AuthUser; onSaved: () => Promise<void> }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const change = async (file: File) => {
    setBusy(true)
    setError(null)
    try {
      await api.upload('/auth/me/photo', [file])
      await onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That picture was not saved.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await api.delete('/auth/me/photo')
      await onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not go through.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Your picture" description="Shown to the consultants you deal with.">
      <div className="flex flex-wrap items-center gap-5">
        <span className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-canvas-alt">
          {user.photo_url ? (
            <img src={mediaUrl(user.photo_url)} alt="" className="size-full object-cover" />
          ) : (
            <UserRound className="size-9 text-ink-faint" strokeWidth={1.6} />
          )}
          {busy && (
            <span className="absolute inset-0 grid place-items-center bg-surface/70">
              <Loader2 className="size-5 animate-spin text-ink-soft" strokeWidth={2.4} />
            </span>
          )}
        </span>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-[0.8125rem] font-semibold text-ink-soft transition-colors hover:border-line-strong hover:text-ink disabled:opacity-50"
          >
            <Camera className="size-4" strokeWidth={2.2} />
            {user.photo_url ? 'Change picture' : 'Add a picture'}
          </button>
          {user.photo_url && (
            <button
              type="button"
              disabled={busy}
              onClick={remove}
              className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-[0.8125rem] font-semibold text-ink-muted transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 className="size-4" strokeWidth={2.2} />
              Remove
            </button>
          )}
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            onChange={(e) => {
              const picked = e.target.files?.[0]
              if (picked) void change(picked)
              e.target.value = ''
            }}
          />
        </div>
      </div>
      {error && <p className="mt-3 text-[0.8125rem] text-red-600">{error}</p>}
    </Card>
  )
}

function DetailsCard({ user, onSaved }: { user: AuthUser; onSaved: () => Promise<void> }) {
  const [draft, setDraft] = useState({
    full_name: user.full_name,
    phone: user.phone ?? '',
    bio: user.bio ?? '',
    linkedin_url: user.linkedin_url ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useSavedFlag()
  const errors = useFormErrors(['full_name', 'phone', 'bio', 'linkedin_url'])

  const set = (key: keyof typeof draft) => (value: string) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    errors.clear()
    try {
      await api.patch('/auth/me', {
        full_name: draft.full_name.trim(),
        phone: draft.phone.trim() || null,
        bio: draft.bio.trim() || null,
        linkedin_url: draft.linkedin_url.trim() || null,
      })
      await onSaved()
      setSaved(true)
    } catch (err) {
      errors.capture(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card
      title="Your details"
      description="Your email is how you sign in and where codes are sent, so it is changed by contacting us."
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="p-name" className={LABEL}>
              Full name
            </label>
            <input
              id="p-name"
              required
              value={draft.full_name}
              onChange={(e) => set('full_name')(e.target.value)}
              className={FIELD}
            />
            {errors.for('full_name') && (
              <p className="mt-1.5 text-[0.75rem] text-red-600">{errors.for('full_name')}</p>
            )}
          </div>
          <div>
            <label htmlFor="p-phone" className={LABEL}>
              Phone
            </label>
            <input
              id="p-phone"
              inputMode="tel"
              value={draft.phone}
              onChange={(e) => set('phone')(e.target.value)}
              placeholder="07xx xxx xxx"
              className={FIELD}
            />
            {errors.for('phone') && (
              <p className="mt-1.5 text-[0.75rem] text-red-600">{errors.for('phone')}</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="p-email" className={LABEL}>
              Email
            </label>
            <input
              id="p-email"
              value={user.email}
              readOnly
              className={cn(FIELD, 'bg-canvas-alt text-ink-muted')}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="p-bio" className={LABEL}>
              About you
            </label>
            <textarea
              id="p-bio"
              rows={3}
              value={draft.bio}
              onChange={(e) => set('bio')(e.target.value)}
              className={cn(FIELD, 'h-auto py-3')}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="p-linkedin" className={LABEL}>
              LinkedIn
            </label>
            <input
              id="p-linkedin"
              value={draft.linkedin_url}
              onChange={(e) => set('linkedin_url')(e.target.value)}
              placeholder="https://linkedin.com/in/…"
              className={FIELD}
            />
          </div>
        </div>

        {errors.general && <p className="text-[0.8125rem] text-red-600">{errors.general}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save details'}
          </Button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-emerald-700">
              <Check className="size-4" strokeWidth={2.6} />
              Saved
            </span>
          )}
        </div>
      </form>
    </Card>
  )
}

function PasswordCard() {
  const [draft, setDraft] = useState({ current_password: '', new_password: '', confirm: '' })
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const errors = useFormErrors(['current_password', 'new_password'])

  const mismatch = Boolean(draft.confirm) && draft.new_password !== draft.confirm

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (mismatch) return
    setBusy(true)
    errors.clear()
    setDone(null)
    try {
      const res = await api.post<{ detail: string }>('/auth/change-password', {
        current_password: draft.current_password,
        new_password: draft.new_password,
      })
      setDone(res.detail)
      setDraft({ current_password: '', new_password: '', confirm: '' })
    } catch (err) {
      errors.capture(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card
      title="Password"
      description="Changing it signs you out everywhere else — which is the point if you think someone else has it."
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="p-current" className={LABEL}>
              Current password
            </label>
            <input
              id="p-current"
              type="password"
              required
              autoComplete="current-password"
              value={draft.current_password}
              onChange={(e) => setDraft((d) => ({ ...d, current_password: e.target.value }))}
              className={FIELD}
            />
            {errors.for('current_password') && (
              <p className="mt-1.5 text-[0.75rem] text-red-600">
                {errors.for('current_password')}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="p-new" className={LABEL}>
              New password
            </label>
            <input
              id="p-new"
              type="password"
              required
              autoComplete="new-password"
              value={draft.new_password}
              onChange={(e) => setDraft((d) => ({ ...d, new_password: e.target.value }))}
              className={FIELD}
            />
            {errors.for('new_password') && (
              <p className="mt-1.5 text-[0.75rem] text-red-600">{errors.for('new_password')}</p>
            )}
          </div>
          <div>
            <label htmlFor="p-confirm" className={LABEL}>
              Repeat it
            </label>
            <input
              id="p-confirm"
              type="password"
              required
              autoComplete="new-password"
              value={draft.confirm}
              onChange={(e) => setDraft((d) => ({ ...d, confirm: e.target.value }))}
              className={cn(FIELD, mismatch && 'border-red-400')}
            />
            {mismatch && (
              <p className="mt-1.5 text-[0.75rem] text-red-600">These do not match.</p>
            )}
          </div>
        </div>

        {errors.general && <p className="text-[0.8125rem] text-red-600">{errors.general}</p>}
        {done && <p className="text-[0.8125rem] text-emerald-700">{done}</p>}

        <Button type="submit" disabled={busy || mismatch}>
          <KeyRound className="size-4" strokeWidth={2.2} />
          {busy ? 'Updating…' : 'Change password'}
        </Button>
      </form>
    </Card>
  )
}
