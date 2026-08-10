import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, IdCard, ImagePlus, Loader2, Plus, ShieldCheck, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Captcha, EMPTY_CAPTCHA, type CaptchaValue } from '@/components/ui/Captcha'
import { api } from '@/lib/api'
import { useSiteConfig } from '@/lib/siteConfig'
import { cn } from '@/lib/utils'
import { useFormErrors } from '@/lib/formErrors'
import { useT } from '@/lib/i18n'

const INPUT =
  'h-12 w-full rounded-2xl border border-line bg-surface px-4 text-[0.9375rem] text-ink ' +
  'transition-colors placeholder:text-ink-faint focus:border-gold-500 focus:outline-none'

const LABEL = 'mb-2 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase'

interface Owner {
  key: string
  full_name: string
  phone: string
  email: string
  national_id: string
  idFile: File | null
}

const blankOwner = (): Owner => ({
  key: Math.random().toString(36).slice(2),
  full_name: '',
  phone: '',
  email: '',
  national_id: '',
  idFile: null,
})

interface Receipt {
  id: string
  reference: string
  upload_token: string
  owners: { id: string; full_name: string }[]
  detail: string
}

/**
 * What a seller gives us before anything can be listed: the parcel identifier,
 * every registered owner with a way to reach them and an identity document,
 * and photographs of the property.
 *
 * Nothing here creates a listing. A consultant verifies the parcel at the
 * National Land Authority first — which is exactly why the public cannot
 * publish listings themselves.
 */
export function SellerIntakeForm() {
  const t = useT()
  const { districts } = useSiteConfig()

  const [parcel, setParcel] = useState({
    upi: '',
    district: '',
    sector: '',
    location: '',
    property_type: '',
    asking_price: '',
    size: '',
    notes: '',
  })
  const [owners, setOwners] = useState<Owner[]>([blankOwner()])
  const [photos, setPhotos] = useState<File[]>([])
  const [captcha, setCaptcha] = useState<CaptchaValue>(EMPTY_CAPTCHA)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState('')
  const errors = useFormErrors(['upi', 'district', 'sector', 'location', 'property_type', 'asking_price', 'size', 'notes', 'owners', 'captcha_answer'])
  const [done, setDone] = useState<Receipt | null>(null)

  const setParcelField = (key: keyof typeof parcel) => (value: string) =>
    setParcel((prev) => ({ ...prev, [key]: value }))

  const patchOwner = (key: string, patch: Partial<Owner>) =>
    setOwners((prev) => prev.map((o) => (o.key === key ? { ...o, ...patch } : o)))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    errors.clear()
    try {
      setStep('Recording the parcel…')
      const receipt = await api.post<Receipt>('/public/seller-submissions', {
        upi: parcel.upi,
        district: parcel.district || null,
        sector: parcel.sector || null,
        location: parcel.location || null,
        property_type: parcel.property_type || null,
        asking_price: parcel.asking_price ? Number(parcel.asking_price) : null,
        size: parcel.size ? Number(parcel.size) : null,
        notes: parcel.notes || null,
        owners: owners.map((o, i) => ({
          full_name: o.full_name,
          phone: o.phone,
          email: o.email || null,
          national_id: o.national_id || null,
          is_primary: i === 0,
        })),
        ...captcha,
      })

      // Each ID belongs to a specific owner, so it uploads against their row.
      for (const [index, owner] of owners.entries()) {
        if (!owner.idFile) continue
        setStep(`Uploading ID for ${owner.full_name || `owner ${index + 1}`}…`)
        await api.upload(`/public/seller-submissions/${receipt.id}/files`, [owner.idFile], {
          token: receipt.upload_token,
          kind: 'id_document',
          owner_id: receipt.owners[index]?.id ?? '',
        })
      }

      if (photos.length) {
        setStep(`Uploading ${photos.length} photograph${photos.length === 1 ? '' : 's'}…`)
        await api.upload(`/public/seller-submissions/${receipt.id}/files`, photos, {
          token: receipt.upload_token,
          kind: 'property_photo',
        })
      }

      setDone(receipt)
    } catch (err) {
      errors.capture(err)
    } finally {
      setBusy(false)
      setStep('')
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center rounded-4xl border border-line bg-canvas px-6 py-14 text-center"
      >
        <span className="grid size-20 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <Check className="size-10" strokeWidth={2.4} />
        </span>
        <h3 className="mt-7 font-display text-2xl font-semibold text-ink">Submission received</h3>
        <p className="mt-2 font-mono text-[0.9375rem] font-semibold text-gold-700">
          {done.reference}
        </p>
        <p className="mt-4 max-w-lg text-[0.9375rem] leading-relaxed text-ink-soft">{done.detail}</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button to="/properties" variant="gold">
            See what else is listed
          </Button>
          <Button onClick={() => window.location.reload()} variant="outline">
            Submit another property
          </Button>
        </div>
      </motion.div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* ---------- the parcel ---------- */}
      <fieldset className="rounded-3xl border border-line bg-canvas p-6 sm:p-8">
        <legend className="px-2 font-display text-[1.0625rem] font-semibold text-ink">
          The parcel
        </legend>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="s-upi" className={LABEL}>
              UPI <span className="text-gold-600">*</span>
            </label>
            <input
              id="s-upi"
              required
              value={parcel.upi}
              onChange={(e) => setParcelField('upi')(e.target.value)}
              placeholder="1/03/06/02/1847"
              className={cn(INPUT, 'font-mono')}
            />
            <p className="mt-1.5 text-[0.75rem] text-ink-muted">
              The Unique Parcel Identifier on your title. We verify it at the National Land
              Authority before anything is listed, and it is never shown publicly.
            </p>
          </div>

          <div>
            <label htmlFor="s-district" className={LABEL}>
              District
            </label>
            <select
              id="s-district"
              value={parcel.district}
              onChange={(e) => setParcelField('district')(e.target.value)}
              className={INPUT}
            >
              <option value="">{t('ui.choose')}</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="s-sector" className={LABEL}>
              Sector
            </label>
            <input
              id="s-sector"
              value={parcel.sector}
              onChange={(e) => setParcelField('sector')(e.target.value)}
              className={INPUT}
            />
          </div>

          <div>
            <label htmlFor="s-type" className={LABEL}>
              What is it?
            </label>
            <input
              id="s-type"
              value={parcel.property_type}
              onChange={(e) => setParcelField('property_type')(e.target.value)}
              placeholder={t('sell.typePlaceholder')}
              className={INPUT}
            />
          </div>
          <div>
            <label htmlFor="s-size" className={LABEL}>
              Size (sqm)
            </label>
            <input
              id="s-size"
              type="number"
              value={parcel.size}
              onChange={(e) => setParcelField('size')(e.target.value)}
              className={INPUT}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="s-price" className={LABEL}>
              What do you hope to get for it? (RWF)
            </label>
            <input
              id="s-price"
              type="number"
              value={parcel.asking_price}
              onChange={(e) => setParcelField('asking_price')(e.target.value)}
              className={INPUT}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="s-notes" className={LABEL}>
              Anything we should know
            </label>
            <textarea
              id="s-notes"
              rows={3}
              value={parcel.notes}
              onChange={(e) => setParcelField('notes')(e.target.value)}
              placeholder={t('sell.notesPlaceholder')}
              className="w-full resize-y rounded-2xl border border-line bg-surface px-4 py-3.5 text-[0.9375rem] text-ink transition-colors placeholder:text-ink-faint focus:border-gold-500 focus:outline-none"
            />
          </div>
        </div>
      </fieldset>

      {/* ---------- the owners ---------- */}
      <fieldset className="rounded-3xl border border-line bg-canvas p-6 sm:p-8">
        <legend className="flex items-center gap-2 px-2 font-display text-[1.0625rem] font-semibold text-ink">
          <Users className="size-4 text-gold-600" strokeWidth={2.2} />
          Registered owners
        </legend>

        <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-muted">
          Every person named on the title, each with a contact and a photo of their ID. A parcel in
          joint names cannot be sold on one signature — collecting this up front is what stops a
          sale collapsing weeks later.
        </p>

        <div className="mt-5 space-y-4">
          {owners.map((owner, index) => (
            <div key={owner.key} className="rounded-2xl border border-line bg-surface p-5">
              <div className="mb-3.5 flex items-center justify-between gap-3">
                <p className="text-[0.8125rem] font-bold tracking-wide text-ink-muted uppercase">
                  Owner {index + 1}
                  {index === 0 && <span className="ml-2 text-gold-600">· main contact</span>}
                </p>
                {owners.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setOwners((prev) => prev.filter((o) => o.key !== owner.key))}
                    aria-label={`Remove owner ${index + 1}`}
                    className="grid size-8 place-items-center rounded-full border border-line text-ink-soft transition-colors hover:border-red-300 hover:text-red-600"
                  >
                    <Trash2 className="size-3.5" strokeWidth={2.2} />
                  </button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor={`o-name-${owner.key}`} className={LABEL}>
                    Full name <span className="text-gold-600">*</span>
                  </label>
                  <input
                    id={`o-name-${owner.key}`}
                    required
                    value={owner.full_name}
                    onChange={(e) => patchOwner(owner.key, { full_name: e.target.value })}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label htmlFor={`o-phone-${owner.key}`} className={LABEL}>
                    Phone <span className="text-gold-600">*</span>
                  </label>
                  <input
                    id={`o-phone-${owner.key}`}
                    required
                    type="tel"
                    value={owner.phone}
                    onChange={(e) => patchOwner(owner.key, { phone: e.target.value })}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label htmlFor={`o-email-${owner.key}`} className={LABEL}>
                    Email
                  </label>
                  <input
                    id={`o-email-${owner.key}`}
                    type="email"
                    value={owner.email}
                    onChange={(e) => patchOwner(owner.key, { email: e.target.value })}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label htmlFor={`o-id-${owner.key}`} className={LABEL}>
                    National ID number
                  </label>
                  <input
                    id={`o-id-${owner.key}`}
                    value={owner.national_id}
                    onChange={(e) => patchOwner(owner.key, { national_id: e.target.value })}
                    className={cn(INPUT, 'font-mono')}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor={`o-file-${owner.key}`} className={LABEL}>
                    Photo of their ID
                  </label>
                  <label
                    htmlFor={`o-file-${owner.key}`}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-3.5 transition-colors',
                      owner.idFile
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-line hover:border-line-strong',
                    )}
                  >
                    {owner.idFile ? (
                      <Check className="size-4 shrink-0 text-emerald-600" strokeWidth={2.6} />
                    ) : (
                      <IdCard className="size-4 shrink-0 text-ink-faint" strokeWidth={2} />
                    )}
                    <span className="min-w-0 flex-1 truncate text-[0.875rem] text-ink-soft">
                      {owner.idFile ? owner.idFile.name : 'Choose a photo or PDF of the ID'}
                    </span>
                    <input
                      id={`o-file-${owner.key}`}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      hidden
                      onChange={(e) =>
                        patchOwner(owner.key, { idFile: e.target.files?.[0] ?? null })
                      }
                    />
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setOwners((prev) => [...prev, blankOwner()])}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-[0.875rem] font-semibold text-ink-soft transition-colors hover:border-gold-500 hover:text-gold-600"
        >
          <Plus className="size-4" strokeWidth={2.4} />
          Add another owner
        </button>
      </fieldset>

      {/* ---------- photographs ---------- */}
      <fieldset className="rounded-3xl border border-line bg-canvas p-6 sm:p-8">
        <legend className="flex items-center gap-2 px-2 font-display text-[1.0625rem] font-semibold text-ink">
          <ImagePlus className="size-4 text-gold-600" strokeWidth={2.2} />
          Photographs
        </legend>

        <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-muted">
          Whatever you have — the boundary, the access road, any buildings. Our photographer
          reshoots before the listing goes live; these are so the consultant knows what they are
          coming to see.
        </p>

        <label
          htmlFor="s-photos"
          className="mt-4 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-line px-5 py-8 text-center transition-colors hover:border-line-strong hover:bg-surface"
        >
          <ImagePlus className="size-6 text-ink-faint" strokeWidth={2} />
          <span className="mt-2.5 text-[0.875rem] font-semibold text-ink">
            {photos.length ? `${photos.length} selected` : 'Choose photographs'}
          </span>
          <span className="mt-1 text-[0.75rem] text-ink-muted">JPEG, PNG or WebP</span>
          <input
            id="s-photos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
          />
        </label>

        {photos.length > 0 && (
          <ul className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-5">
            {photos.map((file) => (
              <li key={file.name + file.size} className="overflow-hidden rounded-xl border border-line">
                <img
                  src={URL.createObjectURL(file)}
                  alt=""
                  aria-hidden
                  className="aspect-4/3 w-full object-cover"
                />
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <Captcha value={captcha} onChange={setCaptcha} scope="listing" compact />

      {errors.general && (
        <p
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[0.875rem] text-red-700"
        >
          {errors.general}
        </p>
      )}

      <Button type="submit" variant="gold" size="lg" className="w-full" disabled={busy}>
        {busy ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" strokeWidth={2.2} />
            {step || 'Sending…'}
          </span>
        ) : (
          'Submit for verification'
        )}
      </Button>

      <p className="flex items-start gap-2.5 text-[0.8125rem] leading-relaxed text-ink-muted">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" strokeWidth={2.2} />
        Identity documents are stored for verification only and are never shown on the public site.
        Nothing is listed until you have seen and approved it.
      </p>
    </form>
  )
}
