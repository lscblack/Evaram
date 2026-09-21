import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Save, UserRound, X } from 'lucide-react'
import { ErrorNote, FIELD, Field } from '@/components/admin/ui'
import { api, mediaUrl } from '@/lib/api'
import { EASE, SPRING_SOFT } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { AdminUser } from '@/types/api'

const DIVISIONS = ['Realty', 'Construction', 'Group']

/** Comma-separated in the form, an array on the wire. */
const toList = (value: string) =>
  value.split(',').map((v) => v.trim()).filter(Boolean)

/**
 * Everything the public team page shows about a person.
 *
 * The API has accepted these fields all along — `UserUpdate` covers every one —
 * but nothing in the console sent them, so the team page was effectively
 * seed-only: you could not change a photo, a bio, or who appears at all.
 */
export function TeamProfileDrawer({
  member,
  onClose,
  onSaved,
}: {
  member: AdminUser | null
  onClose: () => void
  onSaved: () => void
}) {
  const [draft, setDraft] = useState({
    full_name: '',
    job_title: '',
    division: 'Realty',
    phone: '',
    photo_url: '',
    bio: '',
    languages: '',
    specialties: '',
    covers: '',
    linkedin_url: '',
    joined_year: '',
    display_order: '',
    is_public: false,
  })
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!member) return
    setError(null)
    setDraft({
      full_name: member.full_name ?? '',
      job_title: member.job_title ?? '',
      division: member.division ?? 'Realty',
      phone: member.phone ?? '',
      photo_url: member.photo_url ?? '',
      bio: member.bio ?? '',
      languages: (member.languages ?? []).join(', '),
      specialties: (member.specialties ?? []).join(', '),
      covers: (member.covers ?? []).join(', '),
      linkedin_url: member.linkedin_url ?? '',
      joined_year: member.joined_year ?? '',
      display_order: String(member.display_order ?? 0),
      is_public: Boolean(member.is_public),
    })
  }, [member])

  const set = (key: keyof typeof draft) => (value: string | boolean) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const save = async () => {
    if (!member) return
    setBusy(true)
    setError(null)
    try {
      await api.patch(`/admin/users/${member.id}`, {
        full_name: draft.full_name,
        job_title: draft.job_title || null,
        division: draft.division || null,
        phone: draft.phone || null,
        photo_url: draft.photo_url || null,
        bio: draft.bio || null,
        languages: toList(draft.languages),
        specialties: toList(draft.specialties),
        covers: toList(draft.covers),
        linkedin_url: draft.linkedin_url || null,
        joined_year: draft.joined_year || null,
        display_order: draft.display_order ? Number(draft.display_order) : 0,
        is_public: draft.is_public,
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That profile was not saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {member && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px]"
          />
          <motion.aside
            role="dialog"
            aria-label={`Edit ${member.full_name}`}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={SPRING_SOFT}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-line bg-canvas shadow-lift"
          >
            <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold text-ink">{member.full_name}</h2>
                <p className="mt-1 text-[0.8125rem] text-ink-muted">{member.email}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-ink-soft hover:border-line-strong hover:text-ink"
              >
                <X className="size-4" strokeWidth={2.4} />
              </button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
              {/* The one switch that decides whether they appear publicly. */}
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface p-4">
                <input
                  type="checkbox"
                  checked={draft.is_public}
                  onChange={(e) => set('is_public')(e.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-gold-500"
                />
                <span>
                  <span className="block text-[0.875rem] font-semibold text-ink">
                    Show on the public team page
                  </span>
                  <span className="mt-0.5 block text-[0.8125rem] text-ink-muted">
                    Off keeps the account fully working — it just does not appear on the site.
                  </span>
                </span>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name">
                  <input
                    className={FIELD}
                    value={draft.full_name}
                    onChange={(e) => set('full_name')(e.target.value)}
                  />
                </Field>
                <Field label="Job title">
                  <input
                    className={FIELD}
                    value={draft.job_title}
                    onChange={(e) => set('job_title')(e.target.value)}
                  />
                </Field>
                <Field label="Division">
                  <select
                    className={FIELD}
                    value={draft.division}
                    onChange={(e) => set('division')(e.target.value)}
                  >
                    {DIVISIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Phone">
                  <input
                    className={FIELD}
                    value={draft.phone}
                    onChange={(e) => set('phone')(e.target.value)}
                  />
                </Field>
              </div>

              {/* A photo from their phone, or a link to one that already
                  exists — either lands in the same field. */}
              <div className="flex items-center gap-4">
                <span className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl border border-line bg-canvas-alt">
                  {draft.photo_url ? (
                    <img
                      src={mediaUrl(draft.photo_url)}
                      alt=""
                      className="size-full object-cover"
                      onError={(e) => {
                        // A broken URL should read as broken, not as a missing element.
                        e.currentTarget.style.opacity = '0.25'
                      }}
                    />
                  ) : (
                    <UserRound className="size-8 text-ink-faint" strokeWidth={1.5} />
                  )}
                </span>
                <div className="min-w-0">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-[0.8125rem] font-semibold text-ink-soft transition-colors hover:border-line-strong hover:text-ink">
                    <Camera className="size-3.5" strokeWidth={2.2} />
                    {photoBusy ? 'Uploading…' : draft.photo_url ? 'Change photo' : 'Upload a photo'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      className="sr-only"
                      disabled={photoBusy}
                      onChange={async (e) => {
                        const picked = e.target.files?.[0]
                        e.target.value = ''
                        if (!picked) return
                        setPhotoBusy(true)
                        setPhotoError(null)
                        try {
                          const stored = await api.upload<{ url: string }>(
                            '/admin/uploads',
                            [picked],
                            { kind: 'avatar' },
                          )
                          set('photo_url')(stored.url)
                        } catch (err) {
                          setPhotoError(err instanceof Error ? err.message : 'That photo was not uploaded.')
                        } finally {
                          setPhotoBusy(false)
                        }
                      }}
                    />
                  </label>
                  {draft.photo_url && (
                    <button
                      type="button"
                      onClick={() => set('photo_url')('')}
                      className="ml-2 text-[0.75rem] font-semibold text-ink-muted hover:text-red-600"
                    >
                      Remove
                    </button>
                  )}
                  <p className="mt-1 text-[0.6875rem] text-ink-faint">
                    JPEG, PNG, WebP or AVIF. Shown on the team card and the profile.
                  </p>
                  {photoError && <p className="mt-1 text-[0.75rem] text-red-600">{photoError}</p>}
                </div>
              </div>

              <Field label="Photo URL" hint="Or paste a link to a picture that is already online.">
                <input
                  className={FIELD}
                  value={draft.photo_url}
                  onChange={(e) => set('photo_url')(e.target.value)}
                  placeholder="https://…"
                />
              </Field>

              <Field label="Bio" hint="First person, a few sentences. It appears under their name.">
                <textarea
                  rows={4}
                  className={cn(FIELD, 'h-auto py-2.5')}
                  value={draft.bio}
                  onChange={(e) => set('bio')(e.target.value)}
                />
              </Field>

              <Field label="Languages" hint="Comma separated — Kinyarwanda, English, French">
                <input
                  className={FIELD}
                  value={draft.languages}
                  onChange={(e) => set('languages')(e.target.value)}
                />
              </Field>
              <Field label="Specialties" hint="Comma separated">
                <input
                  className={FIELD}
                  value={draft.specialties}
                  onChange={(e) => set('specialties')(e.target.value)}
                />
              </Field>
              <Field label="Areas covered" hint="Comma separated — Gasabo, Kicukiro">
                <input
                  className={FIELD}
                  value={draft.covers}
                  onChange={(e) => set('covers')(e.target.value)}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="LinkedIn URL">
                  <input
                    className={FIELD}
                    value={draft.linkedin_url}
                    onChange={(e) => set('linkedin_url')(e.target.value)}
                  />
                </Field>
                <Field label="Joined year">
                  <input
                    className={FIELD}
                    value={draft.joined_year}
                    onChange={(e) => set('joined_year')(e.target.value)}
                  />
                </Field>
                <Field label="Display order" hint="Lower numbers appear first.">
                  <input
                    className={FIELD}
                    inputMode="numeric"
                    value={draft.display_order}
                    onChange={(e) => set('display_order')(e.target.value)}
                  />
                </Field>
                <Field label="Deals closed" hint="Counted from recorded sales; not editable.">
                  <input className={cn(FIELD, 'opacity-60')} value={member.deals_closed} readOnly />
                </Field>
              </div>

              {error && <ErrorNote message={error} />}
            </div>

            <footer className="border-t border-line px-6 py-4">
              <button
                type="button"
                onClick={() => void save()}
                disabled={busy}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink text-[0.875rem] font-semibold text-canvas disabled:opacity-50"
              >
                <Save className="size-4" strokeWidth={2.4} />
                {busy ? 'Saving…' : 'Save profile'}
              </button>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
