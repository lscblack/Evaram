import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, Save, Sparkles } from 'lucide-react'
import {
  Badge,
  ErrorNote,
  FIELD,
  Field,
  Loading,
  PageHeader,
  Panel,
} from '@/components/admin/ui'
import { MediaUploader, type StagedFile } from '@/components/admin/MediaUploader'
import { DynamicField, type FieldValue, type FormValues } from '@/components/ui/DynamicField'
import { api } from '@/lib/api'
import { invalidate, useQuery } from '@/lib/queries'
import { useSiteConfig } from '@/lib/siteConfig'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import type { ApiCategory, ApiFormField, ApiSaleRecord, ApiSaleRecordDetail } from '@/types/api'

/**
 * The property upload form — staff only.
 *
 * This is deliberately not on the public site: reference numbers and UPIs are
 * what make a listing trustworthy, so an agent enters them, not a stranger.
 * Sellers ask for a valuation instead and a consultant files the listing.
 */
export default function PropertyUploadPage() {
  const navigate = useNavigate()
  const { data: taxonomy, loading } = useQuery<ApiCategory[]>('/public/taxonomy')
  const categories = useMemo(() => taxonomy ?? [], [taxonomy])
  const { districts } = useSiteConfig()

  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [values, setValues] = useState<FormValues>({})
  const [core, setCore] = useState({
    reference_number: '',
    upi: '',
    title: '',
    summary: '',
    district: '',
    sector: '',
    location: '',
    intent: 'sale',
    price: '',
    size: '',
    owner_name: '',
    owner_contact: '',
  })
  const [flags, setFlags] = useState({
    show_on_public: true,
    show_owner_info: false,
    allow_bidding: false,
    is_featured: false,
    show_on_map: true,
  })
  const [minBid, setMinBid] = useState('')
  const [photos, setPhotos] = useState<StagedFile[]>([])
  const [geo, setGeo] = useState({ latitude: '', longitude: '', boundary: '' })
  const [virtual, setVirtual] = useState({
    vr_tour_url: '',
    video_360_url: '',
    video_link: '',
    drone_footage_url: '',
    vr_tour_provider: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const category = categories.find((c) => c.id === categoryId)
  const subcategory = category?.subcategories.find((s) => s.id === subcategoryId)

  const isVisible = (field: ApiFormField) =>
    !field.conditional || values[field.conditional.field] === field.conditional.value

  const visibleFields = useMemo(
    () => (subcategory ? subcategory.fields.filter(isVisible) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subcategory, values],
  )

  /* ---- has this parcel been through us before? ---- */
  const [history, setHistory] = useState<ApiSaleRecord[]>([])
  useEffect(() => {
    const upi = core.upi.trim()
    if (upi.length < 6) {
      setHistory([])
      return
    }
    const id = window.setTimeout(() => {
      api
        .get<ApiSaleRecord[]>(`/admin/properties/history/lookup?upi=${encodeURIComponent(upi)}`)
        .then(setHistory)
        .catch(() => setHistory([]))
    }, 400)
    return () => window.clearTimeout(id)
  }, [core.upi])

  /** Rebuild the form from a past sale so a repeat listing is one click. */
  const prefillFrom = async (record: ApiSaleRecord) => {
    const full = await api.get<ApiSaleRecordDetail>(
      `/admin/properties/history/records/${record.id}`,
    )
    const snap = (full.snapshot ?? {}) as Record<string, unknown>
    setCore((prev) => ({
      ...prev,
      reference_number: String(snap.reference_number ?? prev.reference_number),
      upi: String(snap.upi ?? prev.upi),
      title: String(snap.title ?? ''),
      summary: String(snap.summary ?? ''),
      district: String(snap.district ?? ''),
      sector: String(snap.sector ?? ''),
      location: String(snap.location ?? ''),
      size: snap.size ? String(snap.size) : '',
      owner_name: String(snap.owner_name ?? ''),
      owner_contact: String(snap.owner_contact ?? ''),
      // Deliberately not the old price — the market has moved.
      price: '',
    }))
    if (snap.category_id) setCategoryId(String(snap.category_id))
    if (snap.subcategory_id) setSubcategoryId(String(snap.subcategory_id))
    setValues((snap.details as FormValues) ?? {})
  }

  /**
   * Boundary points are pasted as `lat, lng` per line — the format a surveyor's
   * report already uses, so nobody has to hand-write GeoJSON.
   */
  const boundaryPoints = useMemo(() => {
    const rows = geo.boundary
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    const parsed: number[][] = []
    for (const row of rows) {
      const [lat, lng] = row.split(/[,\s]+/).map(Number)
      if (Number.isFinite(lat) && Number.isFinite(lng)) parsed.push([lat, lng])
    }
    return parsed
  }, [geo.boundary])

  const setValue = (name: string, value: FieldValue) =>
    setValues((prev) => ({ ...prev, [name]: value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!category || !subcategory) return
    setBusy(true)
    setError(null)
    try {
      const created = await api.post<{ id: string }>('/admin/properties', {
        reference_number: core.reference_number,
        upi: core.upi || null,
        title: core.title,
        summary: core.summary || null,
        category_id: category.id,
        subcategory_id: subcategory.id,
        district: core.district || null,
        sector: core.sector || null,
        location: core.location || null,
        intent: core.intent,
        price: core.price ? Number(core.price) : null,
        size: core.size ? Number(core.size) : null,
        owner_name: core.owner_name || null,
        owner_contact: core.owner_contact || null,
        details: values,
        min_bid: flags.allow_bidding && minBid ? Number(minBid) : null,
        latitude: geo.latitude ? Number(geo.latitude) : null,
        longitude: geo.longitude ? Number(geo.longitude) : null,
        boundary_points: boundaryPoints.length >= 3 ? boundaryPoints : null,
        vr_tour_url: virtual.vr_tour_url || null,
        video_360_url: virtual.video_360_url || null,
        video_link: virtual.video_link || null,
        drone_footage_url: virtual.drone_footage_url || null,
        vr_tour_provider: virtual.vr_tour_provider || null,
        ...flags,
      })

      // The listing has to exist before its images have somewhere to attach.
      if (photos.length) {
        await api.upload(
          `/admin/properties/${created.id}/media/upload`,
          photos.map((p) => p.file),
          { kind: 'image' },
        )
      }

      invalidate('/admin/properties')
      invalidate('/public/properties')
      navigate(`/admin/properties?highlight=${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That listing was not saved.')
    } finally {
      setBusy(false)
    }
  }

  if (loading && categories.length === 0) return <Loading label="Reading the taxonomy…" />

  return (
    <form onSubmit={submit}>
      <PageHeader
        title="New property"
        description="Staff-entered so the reference number and UPI can be trusted."
        action={
          <button
            type="submit"
            disabled={busy || !subcategory || !core.reference_number || !core.title}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gold-500 px-3.5 py-2 text-[0.8125rem] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Save className="size-3.5" strokeWidth={2.2} />
            {busy ? 'Saving…' : 'Save listing'}
          </button>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          {/* ---- what is it ---- */}
          <Panel title="Category">
            <div className="grid gap-3.5 p-5 sm:grid-cols-2">
              <Field label="Category">
                <select
                  className={FIELD}
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value)
                    setSubcategoryId('')
                    setValues({})
                  }}
                >
                  <option value="">Choose…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Property type">
                <select
                  className={FIELD}
                  value={subcategoryId}
                  disabled={!category}
                  onChange={(e) => {
                    setSubcategoryId(e.target.value)
                    setValues({})
                  }}
                >
                  <option value="">Choose…</option>
                  {(category?.subcategories ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Panel>

          {/* ---- identity ---- */}
          <Panel title="Identity & location">
            <div className="grid gap-3.5 p-5 sm:grid-cols-2">
              <Field label="Reference number" hint="Entered by hand — this is what marks it as on the market">
                <input
                  required
                  className={FIELD}
                  value={core.reference_number}
                  onChange={(e) => setCore((c) => ({ ...c, reference_number: e.target.value }))}
                />
              </Field>
              <Field label="UPI">
                <input
                  className={FIELD}
                  value={core.upi}
                  onChange={(e) => setCore((c) => ({ ...c, upi: e.target.value }))}
                  placeholder="1/03/06/02/1847"
                />
              </Field>

              {history.length > 0 && (
                <div className="sm:col-span-2">
                  <div className="rounded-2xl border border-gold-300 bg-gold-50 p-4">
                    <p className="flex items-center gap-2 text-[0.8125rem] font-semibold text-gold-800">
                      <History className="size-3.5" strokeWidth={2.4} />
                      We have sold this parcel before
                    </p>
                    <ul className="mt-2.5 space-y-2">
                      {history.map((record) => (
                        <li
                          key={record.id}
                          className="flex flex-wrap items-center justify-between gap-2 text-[0.8125rem] text-gold-900"
                        >
                          <span>
                            {record.title} · sold{' '}
                            {record.sold_price
                              ? formatCurrency(record.sold_price, record.currency)
                              : '—'}{' '}
                            on {formatDate(record.sold_at)}
                            {record.owner_name ? ` · ${record.owner_name}` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => void prefillFrom(record)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-gold-600 px-2.5 py-1.5 text-[0.75rem] font-semibold text-white hover:opacity-90"
                          >
                            <Sparkles className="size-3" strokeWidth={2.4} />
                            Prefill from this sale
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="sm:col-span-2">
                <Field label="Title">
                  <input
                    required
                    className={FIELD}
                    value={core.title}
                    onChange={(e) => setCore((c) => ({ ...c, title: e.target.value }))}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Summary">
                  <textarea
                    rows={3}
                    className={cn(FIELD, 'h-auto py-2.5')}
                    value={core.summary}
                    onChange={(e) => setCore((c) => ({ ...c, summary: e.target.value }))}
                  />
                </Field>
              </div>

              <Field label="District">
                <select
                  className={FIELD}
                  value={core.district}
                  onChange={(e) => setCore((c) => ({ ...c, district: e.target.value }))}
                >
                  <option value="">Choose…</option>
                  {districts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Sector">
                <input
                  className={FIELD}
                  value={core.sector}
                  onChange={(e) => setCore((c) => ({ ...c, sector: e.target.value }))}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Location">
                  <input
                    className={FIELD}
                    value={core.location}
                    onChange={(e) => setCore((c) => ({ ...c, location: e.target.value }))}
                    placeholder="Cell, village or landmark"
                  />
                </Field>
              </div>
            </div>
          </Panel>

          {/* ---- where it is ---- */}
          <Panel title="Location & parcel shape">
            <div className="grid gap-3.5 p-5 sm:grid-cols-2">
              <Field label="Latitude" hint="Decimal degrees, e.g. -1.9706">
                <input
                  className={FIELD}
                  value={geo.latitude}
                  onChange={(e) => setGeo((g) => ({ ...g, latitude: e.target.value }))}
                  placeholder="-1.9706"
                  inputMode="decimal"
                />
              </Field>
              <Field label="Longitude" hint="Decimal degrees, e.g. 30.1394">
                <input
                  className={FIELD}
                  value={geo.longitude}
                  onChange={(e) => setGeo((g) => ({ ...g, longitude: e.target.value }))}
                  placeholder="30.1394"
                  inputMode="decimal"
                />
              </Field>

              <div className="sm:col-span-2">
                <Field
                  label="Parcel boundary"
                  hint="One corner per line as `latitude, longitude` — straight off the surveyor's report."
                >
                  <textarea
                    rows={6}
                    className={cn(FIELD, 'h-auto py-2.5 font-mono text-[0.8125rem]')}
                    value={geo.boundary}
                    onChange={(e) => setGeo((g) => ({ ...g, boundary: e.target.value }))}
                    placeholder={'-1.9701, 30.1388\n-1.9701, 30.1400\n-1.9711, 30.1400\n-1.9711, 30.1388'}
                  />
                </Field>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <p
                    className={cn(
                      'text-[0.75rem]',
                      boundaryPoints.length >= 3
                        ? 'text-emerald-700'
                        : geo.boundary
                          ? 'text-amber-700'
                          : 'text-ink-muted',
                    )}
                  >
                    {boundaryPoints.length >= 3
                      ? `${boundaryPoints.length} corners — the outline and its 3D view will render`
                      : geo.boundary
                        ? `${boundaryPoints.length} valid corner(s) — at least 3 are needed`
                        : 'Leave blank if the parcel has not been surveyed yet'}
                  </p>
                  {boundaryPoints.length >= 3 && (
                    <BoundaryPreview points={boundaryPoints} />
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <Toggle
                  label="Show the exact location on the public map"
                  hint="Off still names the district and sector, but withholds the pin and the parcel outline."
                  checked={flags.show_on_map}
                  onChange={(v) => setFlags((f) => ({ ...f, show_on_map: v }))}
                />
              </div>
            </div>
          </Panel>

          {/* ---- photographs ---- */}
          <Panel title="Photographs">
            <div className="p-5">
              <MediaUploader staged={photos} onStagedChange={setPhotos} />
            </div>
          </Panel>

          {/* ---- virtual viewing ---- */}
          <Panel title="Virtual viewing">
            <div className="grid gap-3.5 p-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <p className="mb-1 text-[0.8125rem] leading-relaxed text-ink-muted">
                  Anything filled in here appears in the immersive viewer on the listing — a
                  diaspora buyer can walk the plot without flying in.
                </p>
              </div>
              <Field label="VR tour link" hint="Kuula, Matterport or any embeddable tour">
                <input
                  className={FIELD}
                  value={virtual.vr_tour_url}
                  onChange={(e) => setVirtual((v) => ({ ...v, vr_tour_url: e.target.value }))}
                  placeholder="https://kuula.co/share/..."
                />
              </Field>
              <Field label="Tour provider">
                <input
                  className={FIELD}
                  value={virtual.vr_tour_provider}
                  onChange={(e) => setVirtual((v) => ({ ...v, vr_tour_provider: e.target.value }))}
                  placeholder="Kuula"
                />
              </Field>
              <Field label="360° video URL">
                <input
                  className={FIELD}
                  value={virtual.video_360_url}
                  onChange={(e) => setVirtual((v) => ({ ...v, video_360_url: e.target.value }))}
                />
              </Field>
              <Field label="Walkthrough video" hint="YouTube or Vimeo link">
                <input
                  className={FIELD}
                  value={virtual.video_link}
                  onChange={(e) => setVirtual((v) => ({ ...v, video_link: e.target.value }))}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Drone footage URL">
                  <input
                    className={FIELD}
                    value={virtual.drone_footage_url}
                    onChange={(e) =>
                      setVirtual((v) => ({ ...v, drone_footage_url: e.target.value }))
                    }
                  />
                </Field>
              </div>
            </div>
          </Panel>

          {/* ---- the type-specific form ---- */}
          {subcategory && (
            <Panel title={`Specification · ${subcategory.label}`}>
              <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-6">
                {visibleFields.map((field) => (
                  <DynamicField
                    key={field.id}
                    field={field}
                    value={values[field.name]}
                    onChange={setValue}
                  />
                ))}
              </div>
            </Panel>
          )}
        </div>

        {/* ---- commercial + visibility ---- */}
        <div className="space-y-5">
          <Panel title="Commercial">
            <div className="space-y-3.5 p-5">
              <Field label="Intent">
                <select
                  className={FIELD}
                  value={core.intent}
                  onChange={(e) => setCore((c) => ({ ...c, intent: e.target.value }))}
                >
                  <option value="sale">For sale</option>
                  <option value="rent">To rent</option>
                  <option value="both">Either</option>
                </select>
              </Field>
              <Field label="Asking price (RWF)">
                <input
                  type="number"
                  className={FIELD}
                  value={core.price}
                  onChange={(e) => setCore((c) => ({ ...c, price: e.target.value }))}
                />
              </Field>
              <Field label="Plot size (sqm)">
                <input
                  type="number"
                  className={FIELD}
                  value={core.size}
                  onChange={(e) => setCore((c) => ({ ...c, size: e.target.value }))}
                />
              </Field>
            </div>
          </Panel>

          <Panel title="Owner">
            <div className="space-y-3.5 p-5">
              <Field label="Owner name">
                <input
                  className={FIELD}
                  value={core.owner_name}
                  onChange={(e) => setCore((c) => ({ ...c, owner_name: e.target.value }))}
                />
              </Field>
              <Field label="Owner contact">
                <input
                  className={FIELD}
                  value={core.owner_contact}
                  onChange={(e) => setCore((c) => ({ ...c, owner_contact: e.target.value }))}
                />
              </Field>
            </div>
          </Panel>

          <Panel title="Visibility & offers">
            <div className="space-y-3 p-5">
              <Toggle
                label="Show on the public marketplace"
                hint="Off keeps it off-market — visible in the console only."
                checked={flags.show_on_public}
                onChange={(v) => setFlags((f) => ({ ...f, show_on_public: v }))}
              />
              <Toggle
                label="Show owner details publicly"
                hint="Only with the owner's consent."
                checked={flags.show_owner_info}
                onChange={(v) => setFlags((f) => ({ ...f, show_owner_info: v }))}
              />
              <Toggle
                label="Accept offers"
                hint="Signed-in buyers can bid. The public sees the leading figure only."
                checked={flags.allow_bidding}
                onChange={(v) => setFlags((f) => ({ ...f, allow_bidding: v }))}
              />
              {flags.allow_bidding && (
                <Field label="Minimum offer (RWF)">
                  <input
                    type="number"
                    className={FIELD}
                    value={minBid}
                    onChange={(e) => setMinBid(e.target.value)}
                  />
                </Field>
              )}
              <Toggle
                label="Feature on the homepage"
                checked={flags.is_featured}
                onChange={(v) => setFlags((f) => ({ ...f, is_featured: v }))}
              />
            </div>
          </Panel>

          <Panel title="What happens next">
            <div className="p-5 text-[0.8125rem] leading-relaxed text-ink-muted">
              <p>
                The listing is saved as <Badge tone="warn">pending review</Badge> and appears on the
                marketplace once an admin verifies it.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </form>
  )
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 accent-gold-500"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0">
        <span className="block text-[0.875rem] font-medium text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-[0.75rem] text-ink-muted">{hint}</span>}
      </span>
    </label>
  )
}


/** A thumbnail of the ring, so a mistyped corner is obvious immediately. */
function BoundaryPreview({ points }: { points: number[][] }) {
  const lats = points.map((p) => p[0])
  const lngs = points.map((p) => p[1])
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const spanLat = maxLat - minLat || 1e-6
  const spanLng = maxLng - minLng || 1e-6

  const d =
    points
      .map(([lat, lng], i) => {
        const x = 3 + ((lng - minLng) / spanLng) * 54
        const y = 3 + ((maxLat - lat) / spanLat) * 34
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join(' ') + ' Z'

  return (
    <svg
      viewBox="0 0 60 40"
      className="h-10 w-15 shrink-0 rounded-md border border-line bg-canvas-alt"
      role="img"
      aria-label="Parcel outline preview"
    >
      <path
        d={d}
        fill="var(--color-gold-500)"
        fillOpacity="0.2"
        stroke="var(--color-gold-600)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}
