import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, History, ImagePlus, Plus, Save, SkipForward, Sparkles, Trash2, Wand2 } from 'lucide-react'
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
import { MoneyInput } from '@/components/ui/MoneyInput'
import { FORMAT_NAMES, parseBoundary } from '@/lib/boundary'
import { parseParcelExport, type ParcelImport, type ParcelImportResult } from '@/lib/parcelImport'
import { ZONE_GROUPS, zoneColor, zoneFor, zoneValue } from '@/data/masterPlan'
import { ZoneSplit } from '@/components/ui/ZoneSplit'
import { ringArea } from '@/lib/geoMeasure'
import { api, mediaUrl } from '@/lib/api'
import { invalidate, useQuery } from '@/lib/queries'
import { useCells, useLocalities, useSectors, useVillages } from '@/components/ui/LocationPicker'
import { useAuth } from '@/lib/auth'
import { useSiteConfig } from '@/lib/siteConfig'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import type {
  AgentOption,
  ApiAdminPropertyDetail,
  ApiCategory,
  ApiFormField,
  ApiSaleRecord,
  ApiSaleRecordDetail,
  ClientOption,
} from '@/types/api'

/**
 * Land use as the register records it, and tenure as the certificate grants it.
 *
 * Rwandan land is held under a certificate of land registration or an
 * emphyteutic (long) lease rather than a "title deed", so the wording here
 * follows the document a seller actually produces.
 */
// MapLibre is the better part of a megabyte; an agent filling in the text
// fields should not wait for it until there is a boundary to draw.
const BoundaryPreviewMap = lazy(() =>
  import('@/components/map/BoundaryPreviewMap').then((m) => ({
    default: m.BoundaryPreviewMap,
  })),
)

const LAND_USES = [
  'Residential',
  'Commercial',
  'Mixed use',
  'Industrial',
  'Agricultural',
  'Livestock',
  'Forestry',
  'Institutional / public',
  'Recreational',
  'Wetland / protected',
]

const RIGHT_TYPES = [
  'Freehold',
  'Emphyteutic lease (long-term)',
  'Leasehold',
  'Right of occupancy',
  'Customary (not yet registered)',
]


/**
 * The property upload form — staff only.
 *
 * This is deliberately not on the public site: reference numbers and UPIs are
 * what make a listing trustworthy, so an agent enters them, not a stranger.
 * Sellers ask for a valuation instead and a consultant files the listing.
 */
export default function PropertyUploadPage() {
  const navigate = useNavigate()
  // Present only on `/admin/properties/:id/edit`; the same form serves both, so
  // a field added for new listings is never missing from editing.
  const { id: editingId } = useParams<{ id: string }>()
  const { data: existing, loading: loadingExisting } = useQuery<ApiAdminPropertyDetail>(
    editingId ? `/admin/properties/${editingId}` : null,
    { ttl: 0 },
  )
  const { data: taxonomy, loading } = useQuery<ApiCategory[]>('/public/taxonomy')
  const categories = useMemo(() => taxonomy ?? [], [taxonomy])
  const { can } = useAuth()
  const { setting } = useSiteConfig()
  const { data: agents } = useQuery<AgentOption[]>(can('admin') ? '/admin/agents/options' : null)
  const { districts: allDistricts } = useLocalities()

  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [values, setValues] = useState<FormValues>({})
  const [emptyLand, setEmptyLand] = useState(false)
  const [core, setCore] = useState({
    reference_number: '',
    upi: '',
    title: '',
    summary: '',
    district: '',
    sector: '',
    cell: '',
    village: '',
    location: '',
    intent: 'sale',
    price: '',
    size: '',
    owner_name: '',
    owner_contact: '',
  })
  const sectorOptions = useSectors(core.district)
  const cellOptions = useCells(core.sector, core.district)
  const villageOptions = useVillages(core.cell, core.district)

  /** Thirty districts read far better grouped by province than as one list. */
  const districtGroups = useMemo(() => {
    const grouped = new Map<string, string[]>()
    for (const d of allDistricts) {
      const key = d.province ?? 'Other'
      grouped.set(key, [...(grouped.get(key) ?? []), d.name])
    }
    return [...grouped.entries()]
  }, [allDistricts])

  /** Seller as a client record, plus the commission that builds the price. */
  const [deal, setDeal] = useState({
    seller_client_id: '',
    owner_price: '',
    commission_basis: 'percent',
    commission_rate: '',
    commission_amount: '',
    commission_in_price: true,
  })
  const [flags, setFlags] = useState({
    show_on_public: true,
    show_owner_info: false,
    allow_bidding: false,
    is_featured: false,
    show_on_map: true,
    allow_directions: false,
  })
  const { data: clients } = useQuery<ClientOption[]>('/admin/clients/options')

  /**
   * The same sum the server performs, shown before saving.
   *
   * Mirrors `apply_commission` server-side; the server remains authoritative,
   * this only removes the surprise.
   */
  /**
   * When the fee is added on top of the seller's figure the public price is
   * derived, so asking for it again is a second source of truth that the server
   * would silently overwrite. Shown read-only instead.
   */
  const derivedPrice = (() => {
    const owner = Number(deal.owner_price || 0)
    if (!deal.commission_in_price || !owner) return null
    const fee =
      deal.commission_basis === 'percent'
        ? (owner * Number(deal.commission_rate || 0)) / 100
        : Number(deal.commission_amount || 0)
    return Math.round(owner + fee)
  })()

  const commissionPreview = (() => {
    const owner = Number(deal.owner_price || 0)
    if (!owner) return null
    const fee =
      deal.commission_basis === 'percent'
        ? (owner * Number(deal.commission_rate || 0)) / 100
        : Number(deal.commission_amount || 0)
    if (!fee) return null
    const money = (n: number) => n.toLocaleString('en-RW', { maximumFractionDigits: 0 })
    return deal.commission_in_price
      ? `Seller gets ${money(owner)} + ${money(fee)} commission = listed at ${money(owner + fee)} RWF`
      : `Listed at ${money(owner)} RWF, of which ${money(fee)} is our commission`
  })()

  const [minBid, setMinBid] = useState('')
  const [photos, setPhotos] = useState<StagedFile[]>([])
  const [geo, setGeo] = useState({ latitude: '', longitude: '', boundary: '' })
  /** Tenure and zoning — what the parcel is now, and what it may become. */
  const [parcel, setParcel] = useState({
    land_use: '',
    right_type: '',
    master_plan_zone: '',
    master_plan_note: '',
  })
  /**
   * How the plan divides the parcel, when it straddles zones. Each row is a
   * zone and its share in sqm; the main zone above is kept to the largest
   * buildable share unless the agent picks another of them.
   */
  const [zoneRows, setZoneRows] = useState<{ zone: string; area: string }[]>([])
  const zoneShares = useMemo(
    () =>
      zoneRows
        .filter((r) => r.zone)
        .map((r) => ({ zone: r.zone, area_sqm: r.area ? Number(r.area) : null })),
    [zoneRows],
  )
  const zoneSum = zoneShares.reduce((sum, z) => sum + (z.area_sqm ?? 0), 0)

  const setZoneRowsAndMain = (rows: { zone: string; area: string }[]) => {
    setZoneRows(rows)
    const filled = rows.filter((r) => r.zone)
    if (!filled.length) return
    const largest = [...filled].sort((a, b) => Number(b.area || 0) - Number(a.area || 0))
    const main = largest.find((r) => !(zoneFor(r.zone)?.code ?? '').startsWith('T')) ?? largest[0]
    setParcel((s) =>
      filled.some((r) => r.zone === s.master_plan_zone) ? s : { ...s, master_plan_zone: main.zone },
    )
  }
  /** Optional master-plan extract. Staged until the listing has an id. */
  const [agentId, setAgentId] = useState('')
  /** Viewing terms. The fee is pre-filled from settings so it is one figure to
   *  change across the site rather than a number retyped on every listing. */
  const [visit, setVisit] = useState({
    viewing_allowed: true,
    visiting_fee: '',
    visiting_fee_negotiable: false,
  })
  const [proof, setProof] = useState<File | null>(null)
  const [proofUrl, setProofUrl] = useState<string | null>(null)

  const [virtual, setVirtual] = useState({
    vr_tour_url: '',
    video_360_url: '',
    video_link: '',
    drone_footage_url: '',
    vr_tour_provider: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Whether the surveyed outline stands in for the cover photo while there is none. */
  const [outlineAsCover, setOutlineAsCover] = useState(true)

  /* ---- auto-fill from a parcel export ---- */
  const [importText, setImportText] = useState('')
  const [imported, setImported] = useState<ParcelImportResult | null>(null)
  /** Several parcels pasted at once: filled and saved one at a time, in order. */
  const [batch, setBatch] = useState<ParcelImport[]>([])
  const [batchIndex, setBatchIndex] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  /**
   * Locality names from an export, waiting for the option lists.
   *
   * The registry writes `NGERUKA`; the dropdowns hold `Ngeruka`, and cells and
   * villages are only fetched once their parent is chosen. So the names are
   * held here and matched, level by level, as each list arrives.
   */
  const [wanted, setWanted] = useState<Partial<
    Record<'district' | 'sector' | 'cell' | 'village', string>
  > | null>(null)
  /** Localities the export named that never turned up in the lists. */
  const [unmatched, setUnmatched] = useState<string[]>([])

  // A level that is still unresolved after the lists have had time to load
  // is a genuine miss — the name is not in the register the dropdowns use.
  // Said out loud, so the agent picks it by hand rather than assuming it
  // was filled.
  const coreRef = useRef(core)
  coreRef.current = core
  useEffect(() => {
    if (!wanted) return
    const id = window.setTimeout(() => {
      setWanted((current) => {
        if (!current) return null
        const missing = (['district', 'sector', 'cell', 'village'] as const)
          .filter((level) => current[level] && !coreRef.current[level])
          .map((level) => `${level} “${current[level]}”`)
        if (missing.length) {
          setUnmatched(missing)
          setNotice(
            allDistricts.length
              ? `Filled from the export, but the ${missing.join(', ')} could not be found in the locality list — choose ${missing.length > 1 ? 'them' : 'it'} by hand.`
              : 'Filled from the export, but the district list has not loaded — is the API running? Choose the location by hand or reload the page.',
          )
        }
        return null
      })
    }, 6000)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted])

  useEffect(() => {
    if (!wanted) return
    const find = (list: string[], name?: string) =>
      name ? list.find((n) => n.toLowerCase() === name.toLowerCase()) : undefined
    const levels: ['district' | 'sector' | 'cell' | 'village', string[]][] = [
      ['district', allDistricts.map((d) => d.name)],
      ['sector', sectorOptions],
      ['cell', cellOptions],
      ['village', villageOptions],
    ]
    for (const [level, options] of levels) {
      if (!wanted[level] || core[level]) continue
      // A miss is not final: the list in hand may still be the previous
      // parent's, since a query keeps its old answer until the new one lands.
      // So a miss waits for the next list; a genuine miss simply leaves the
      // level for the agent, and any hand-picked locality ends the search.
      const match = find(options, wanted[level])
      if (match) setCore((c) => ({ ...c, [level]: match }))
      return
    }
    setWanted(null)
  }, [wanted, allDistricts, sectorOptions, cellOptions, villageOptions, core])

  /** Put one exported parcel into the form. Typed values win over the export. */
  const fillFrom = (parcel: ParcelImport) => {
    setCore((c) => ({
      ...c,
      upi: parcel.upi || c.upi,
      title: c.title || parcel.title,
      summary: c.summary || parcel.summary,
      location: parcel.fullAddress ?? c.location,
      size: parcel.areaSqm != null ? String(parcel.areaSqm) : c.size,
      district: '',
      sector: '',
      cell: '',
      village: '',
    }))
    setUnmatched([])
    setWanted({
      district: parcel.district ?? undefined,
      sector: parcel.sector ?? undefined,
      cell: parcel.cell ?? undefined,
      village: parcel.village ?? undefined,
    })
    setGeo({
      latitude: parcel.latitude != null ? String(parcel.latitude) : '',
      longitude: parcel.longitude != null ? String(parcel.longitude) : '',
      boundary: parcel.boundaryWkt ?? '',
    })
    setParcel((s) => ({
      ...s,
      land_use: parcel.landUse ?? s.land_use,
      right_type: parcel.rightType ?? s.right_type,
      master_plan_zone: parcel.masterPlanZone ?? s.master_plan_zone,
    }))
    setZoneRows(
      parcel.zones.map((z) => ({ zone: z.zone, area: z.area_sqm != null ? String(z.area_sqm) : '' })),
    )
  }

  /** Clear what belongs to one parcel, keeping what a batch shares — the
   *  category, the seller, the commission rate, the consultant, the
   *  visibility. Prices are per parcel and go too. */
  const clearParcelFields = () => {
    setCore((c) => ({
      ...c,
      reference_number: '',
      upi: '',
      title: '',
      summary: '',
      district: '',
      sector: '',
      cell: '',
      village: '',
      location: '',
      size: '',
      price: '',
    }))
    setDeal((d) => ({ ...d, owner_price: '', commission_amount: '' }))
    setMinBid('')
    setGeo({ latitude: '', longitude: '', boundary: '' })
    setParcel({ land_use: '', right_type: '', master_plan_zone: '', master_plan_note: '' })
    setZoneRows([])
    setPhotos([])
    setProof(null)
    setProofUrl(null)
  }

  const checkImport = () => setImported(parseParcelExport(importText))

  const startImport = () => {
    const parcels = imported?.parcels ?? []
    if (!parcels.length) return
    if (parcels.length > 1) {
      setBatch(parcels)
      setBatchIndex(0)
    }
    fillFrom(parcels[0])
    setNotice(
      parcels.length > 1
        ? `Filled parcel 1 of ${parcels.length}. Add the reference number and price, save, and the next one loads.`
        : 'Filled from the export. Check the district, sector and zone, then add the reference number and price.',
    )
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /** Move a batch on, with or without having saved the current parcel. */
  const advanceBatch = (savedRef: string | null, savedId: string | null) => {
    const next = batchIndex + 1
    if (next < batch.length) {
      setBatchIndex(next)
      clearParcelFields()
      fillFrom(batch[next])
      setNotice(
        `${savedRef ? `Saved ${savedRef}. ` : 'Skipped. '}Now parcel ${next + 1} of ${batch.length}` +
          ` — ${batch[next].upi || 'no UPI'}${batch[next].fullAddress ? `, ${batch[next].fullAddress}` : ''}.`,
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setBatch([])
    setBatchIndex(0)
    if (savedId) navigate(`/admin/properties?highlight=${savedId}`)
    else {
      clearParcelFields()
      setNotice('That was the last parcel in the list.')
    }
  }

  /**
   * Fill the form from the listing being edited.
   *
   * Keyed on the record's `updated_at` rather than on the object, so a refetch
   * that returns the same version does not discard what is being typed.
   */
  useEffect(() => {
    if (!existing) return
    const p = existing
    setCategoryId(p.category_id)
    setSubcategoryId(p.subcategory_id)
    setValues((p.details as FormValues) ?? {})
    setEmptyLand(Boolean((p.details as Record<string, unknown> | null)?.empty_land))
    setCore({
      reference_number: p.reference_number,
      upi: p.upi ?? '',
      title: p.title,
      summary: p.summary ?? '',
      district: p.district ?? '',
      sector: p.sector ?? '',
      cell: p.cell ?? '',
      village: p.village ?? '',
      location: p.location ?? '',
      intent: p.intent,
      price: p.price != null ? String(Math.round(p.price)) : '',
      size: p.size != null ? String(p.size) : '',
      owner_name: p.owner_name ?? '',
      owner_contact: p.owner_contact ?? '',
    })
    setDeal({
      seller_client_id: p.seller_client_id ?? '',
      owner_price: p.owner_price != null ? String(Math.round(p.owner_price)) : '',
      commission_basis: p.commission_basis ?? 'percent',
      commission_rate: p.commission_rate != null ? String(p.commission_rate) : '',
      commission_amount: p.commission_amount != null ? String(Math.round(p.commission_amount)) : '',
      commission_in_price: p.commission_in_price,
    })
    setFlags({
      show_on_public: p.show_on_public,
      show_owner_info: p.show_owner_info,
      allow_bidding: p.allow_bidding,
      is_featured: p.is_featured,
      show_on_map: p.show_on_map,
      allow_directions: p.allow_directions ?? false,
    })
    setParcel({
      land_use: p.land_use ?? '',
      right_type: p.right_type ?? '',
      master_plan_zone: p.master_plan_zone ?? '',
      master_plan_note: p.master_plan_note ?? '',
    })
    setZoneRows(
      (p.master_plan_zones ?? []).map((z) => ({
        zone: z.zone,
        area: z.area_sqm != null ? String(z.area_sqm) : '',
      })),
    )
    setProofUrl(p.master_plan_doc_url)
    setOutlineAsCover(p.outline_as_cover ?? true)
    setAgentId(p.agent?.id ?? '')
    setVisit({
      viewing_allowed: p.viewing_allowed ?? true,
      visiting_fee: p.visiting_fee != null ? String(Math.round(p.visiting_fee)) : '',
      visiting_fee_negotiable: p.visiting_fee_negotiable ?? false,
    })
    setMinBid(p.min_bid != null ? String(Math.round(p.min_bid)) : '')
    setGeo({
      latitude: p.latitude != null ? String(p.latitude) : '',
      longitude: p.longitude != null ? String(p.longitude) : '',
      boundary: (p.boundary_points ?? []).map(([lat, lng]) => `${lat}, ${lng}`).join('\n'),
    })
    setVirtual({
      vr_tour_url: p.vr_tour_url ?? '',
      video_360_url: p.video_360_url ?? '',
      video_link: p.video_link ?? '',
      drone_footage_url: p.drone_footage_url ?? '',
      vr_tour_provider: p.vr_tour_provider ?? '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id, existing?.updated_at])

  // Pre-fill the fee from the site setting for a new listing only — on an
  // edit the stored figure is the truth, even where it differs from the default.
  const feeDefault = setting('marketplace.visiting_fee', '20000')
  useEffect(() => {
    if (editingId) return
    setVisit((s) => (s.visiting_fee ? s : { ...s, visiting_fee: feeDefault }))
  }, [feeDefault, editingId])

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
   * Whatever the surveyor's software produced — WKT, GeoJSON, or corners pasted
   * one per line. Parsing all three here means an agent never has to convert
   * anything by hand, which is where transposed coordinates come from.
   */
  const parsedBoundary = useMemo(() => parseBoundary(geo.boundary), [geo.boundary])
  const boundaryPoints = parsedBoundary.points

  /** What the outline actually measures — the same sum the server will run. */
  const boundaryArea = useMemo(
    () => (boundaryPoints.length >= 3 ? ringArea(boundaryPoints.map(([lat, lng]) => [lng, lat])) : null),
    [boundaryPoints],
  )

  /**
   * How far the drawn outline is from the typed plot size.
   *
   * Flagged here rather than after saving: a transposed corner or a misplaced
   * decimal is obvious the moment the two numbers are put side by side, and
   * nowhere near as obvious once the listing is live.
   */
  const sizeDrift = useMemo(() => {
    const declared = Number(core.size)
    if (!boundaryArea || !declared) return null
    const drift = Math.abs(boundaryArea - declared) / declared
    return drift > 0.1 ? drift : null
  }, [boundaryArea, core.size])

  const setValue = (name: string, value: FieldValue) =>
    setValues((prev) => ({ ...prev, [name]: value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!category || !subcategory) return
    setBusy(true)
    setError(null)
    try {
      const body = {
        reference_number: core.reference_number,
        upi: core.upi || null,
        title: core.title,
        summary: core.summary || null,
        category_id: category.id,
        subcategory_id: subcategory.id,
        district: core.district || null,
        sector: core.sector || null,
        cell: core.cell || null,
        village: core.village || null,
        location: core.location || null,
        intent: core.intent,
        price: derivedPrice ?? (core.price ? Number(core.price) : null),
        size: core.size ? Number(core.size) : null,
        owner_name: core.owner_name || null,
        owner_contact: core.owner_contact || null,
        seller_client_id: deal.seller_client_id || null,
        owner_price: deal.owner_price ? Number(deal.owner_price) : null,
        commission_basis: deal.commission_rate || deal.commission_amount ? deal.commission_basis : null,
        commission_rate: deal.commission_rate ? Number(deal.commission_rate) : null,
        commission_amount: deal.commission_amount ? Number(deal.commission_amount) : null,
        commission_in_price: deal.commission_in_price,
        details: emptyLand ? { empty_land: true } : values,
        min_bid: flags.allow_bidding && minBid ? Number(minBid) : null,
        latitude: geo.latitude ? Number(geo.latitude) : null,
        longitude: geo.longitude ? Number(geo.longitude) : null,
        boundary_points: boundaryPoints.length >= 3 ? boundaryPoints : null,
        vr_tour_url: virtual.vr_tour_url || null,
        video_360_url: virtual.video_360_url || null,
        video_link: virtual.video_link || null,
        drone_footage_url: virtual.drone_footage_url || null,
        vr_tour_provider: virtual.vr_tour_provider || null,
        land_use: parcel.land_use || null,
        right_type: parcel.right_type || null,
        master_plan_zone: parcel.master_plan_zone || null,
        master_plan_zones: zoneShares.length ? zoneShares : null,
        master_plan_note: parcel.master_plan_note || null,
        master_plan_doc_url: proofUrl,
        outline_as_cover: outlineAsCover,
        agent_id: agentId || null,
        viewing_allowed: visit.viewing_allowed,
        visiting_fee:
          visit.viewing_allowed && visit.visiting_fee ? Number(visit.visiting_fee) : null,
        visiting_fee_negotiable: visit.visiting_fee_negotiable,
        ...flags,
      }

      const saved = editingId
        ? await api.patch<{ id: string }>(`/admin/properties/${editingId}`, body)
        : await api.post<{ id: string }>('/admin/properties', body)

      // The listing has to exist before its images have somewhere to attach.
      if (photos.length) {
        await api.upload(
          `/admin/properties/${saved.id}/media/upload`,
          photos.map((p) => p.file),
          { kind: 'image' },
        )
      }

      // The extract is uploaded through the media pipeline, then pointed at by
      // the listing — a second PATCH because its URL does not exist until then.
      if (proof) {
        const [uploaded] = await api.upload<{ url: string }[]>(
          `/admin/properties/${saved.id}/media/upload`,
          [proof],
          { kind: 'document' },
        )
        if (uploaded?.url) {
          await api.patch(`/admin/properties/${saved.id}`, {
            master_plan_doc_url: uploaded.url,
          })
        }
      }

      invalidate('/admin/properties')
      invalidate('/public/properties')
      // A batch carries on to the next parcel; the list is only shown once
      // the last one is saved.
      if (batch.length) advanceBatch(core.reference_number, saved.id)
      else navigate(`/admin/properties?highlight=${saved.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That listing was not saved.')
    } finally {
      setBusy(false)
    }
  }

  if (loading && categories.length === 0) return <Loading label="Reading the taxonomy…" />
  if (editingId && loadingExisting && !existing) return <Loading label="Opening the listing…" />

  const current = batch[batchIndex]
  const saveLabel = busy
    ? 'Saving…'
    : editingId
      ? 'Save changes'
      : batch.length
        ? batchIndex + 1 < batch.length
          ? `Save & next (${batchIndex + 1} of ${batch.length})`
          : `Save last parcel (${batch.length} of ${batch.length})`
        : 'Save listing'

  // The same button top and bottom: the form is long, and having to scroll
  // back up to save it is the kind of thing that gets a listing abandoned.
  const saveButton = (
    <button
      type="submit"
      disabled={busy || !subcategory || !core.reference_number || !core.title}
      className="inline-flex items-center gap-1.5 rounded-lg bg-gold-500 px-3.5 py-2 text-[0.8125rem] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
    >
      <Save className="size-3.5" strokeWidth={2.2} />
      {saveLabel}
    </button>
  )

  return (
    <form onSubmit={submit}>
      <PageHeader
        title={editingId ? 'Edit listing' : 'New property'}
        description={
          editingId
            ? 'Changes are audited. An agent editing a live listing sends it back for review.'
            : 'Staff-entered so the reference number and UPI can be trusted.'
        }
        action={saveButton}
      />

      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}
      {notice && !error && (
        <p className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[0.875rem] text-emerald-800">
          {notice}
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          {/* ---- auto-fill from the registry export ---- */}
          {!editingId && (
            <Panel
              title="Auto-fill from a parcel export"
              action={
                batch.length ? (
                  <Badge tone="warn">
                    Parcel {batchIndex + 1} of {batch.length}
                  </Badge>
                ) : undefined
              }
            >
              {current ? (
                <div className="p-5">
                  <ol className="flex flex-wrap items-center gap-2">
                    {batch.map((item, i) => (
                      <li
                        key={`${item.upi}-${i}`}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[0.75rem]',
                          i < batchIndex
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : i === batchIndex
                              ? 'border-gold-500 bg-gold-50 font-semibold text-gold-800'
                              : 'border-line text-ink-muted',
                        )}
                      >
                        {i < batchIndex && <Check className="size-3" strokeWidth={2.6} />}
                        {item.upi || `Parcel ${i + 1}`}
                      </li>
                    ))}
                  </ol>
                  <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-soft">
                    Now filling <strong className="font-mono text-ink">{current.upi || `parcel ${batchIndex + 1}`}</strong>
                    {current.fullAddress ? ` — ${current.fullAddress}` : ''}. Add the reference number,
                    price and anything the export does not carry, then save; the next parcel loads on
                    its own.
                  </p>
                  {current.warnings.map((w) => (
                    <p key={w} className="mt-1.5 text-[0.75rem] text-amber-700">
                      {w}
                    </p>
                  ))}
                  <div className="mt-3.5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        clearParcelFields()
                        fillFrom(current)
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[0.8125rem] font-semibold text-ink-soft hover:text-ink"
                    >
                      <Wand2 className="size-3.5" strokeWidth={2.2} />
                      Fill again
                    </button>
                    <button
                      type="button"
                      onClick={() => advanceBatch(null, null)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[0.8125rem] font-semibold text-ink-soft hover:text-ink"
                    >
                      <SkipForward className="size-3.5" strokeWidth={2.2} />
                      Skip this parcel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 p-5">
                  <p className="text-[0.8125rem] leading-relaxed text-ink-muted">
                    Paste the JSON the parcel lookup exported — one parcel, or a list of them. Check
                    it, then fill the form. A list is filled and saved one parcel at a time; what a
                    batch shares — category, seller, commission, consultant — is typed once.
                  </p>
                  <textarea
                    rows={6}
                    className={cn(FIELD, 'h-auto py-2.5 font-mono text-[0.8125rem]')}
                    value={importText}
                    onChange={(e) => {
                      setImportText(e.target.value)
                      setImported(null)
                    }}
                    placeholder={'{ "upi": "5/07/08/01/3633", "location": { … }, "boundary": { "wkt": "POLYGON ((…))" } }'}
                    spellCheck={false}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={checkImport}
                      disabled={!importText.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[0.8125rem] font-semibold text-ink-soft transition-colors hover:text-ink disabled:opacity-40"
                    >
                      <Check className="size-3.5" strokeWidth={2.4} />
                      Check
                    </button>
                    {imported?.parcels.length ? (
                      <button
                        type="button"
                        onClick={startImport}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-gold-500 px-3.5 py-2 text-[0.8125rem] font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        <Wand2 className="size-3.5" strokeWidth={2.2} />
                        {imported.parcels.length > 1
                          ? `Auto-fill parcel 1 of ${imported.parcels.length}`
                          : 'Auto-fill the form'}
                      </button>
                    ) : null}
                    {importText && (
                      <button
                        type="button"
                        onClick={() => {
                          setImportText('')
                          setImported(null)
                        }}
                        className="text-[0.8125rem] font-medium text-ink-muted hover:text-ink"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {imported?.error && <ErrorNote message={imported.error} />}

                  {imported?.parcels.length ? (
                    <ul className="space-y-2">
                      {imported.parcels.map((item, i) => (
                        <li
                          key={`${item.upi}-${i}`}
                          className="rounded-xl border border-line bg-canvas-alt px-3.5 py-2.5 text-[0.8125rem]"
                        >
                          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-mono font-semibold text-ink">
                              {item.upi || 'No UPI'}
                            </span>
                            {item.fullAddress && <span className="text-ink-soft">{item.fullAddress}</span>}
                            {item.areaSqm != null && (
                              <span className="text-ink-muted">
                                · {Math.round(item.areaSqm).toLocaleString('en-RW')} sqm
                              </span>
                            )}
                          </p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.75rem] text-ink-muted">
                            {item.masterPlanZone && (
                              <span className="inline-flex items-center gap-1.5">
                                <span
                                  aria-hidden
                                  className="size-3 rounded-sm border border-line"
                                  style={{ background: zoneColor(item.masterPlanZone) }}
                                />
                                {item.masterPlanZone}
                              </span>
                            )}
                            <span>
                              {item.boundaryCorners
                                ? `${item.boundaryCorners}-corner boundary`
                                : 'no boundary'}
                            </span>
                            {item.rightType && <span>· {item.rightType}</span>}
                            {item.landUse && <span>· {item.landUse.toLowerCase()} today</span>}
                          </p>
                          {item.warnings.map((w) => (
                            <p key={w} className="mt-1 text-[0.75rem] text-amber-700">
                              {w}
                            </p>
                          ))}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )}
            </Panel>
          )}

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

              {!editingId && history.length > 0 && (
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

              {unmatched.length > 0 && (
                <p className="text-[0.75rem] text-amber-700 sm:col-span-2">
                  Not found in the locality list: {unmatched.join(', ')}. Pick {unmatched.length > 1 ? 'them' : 'it'} below.
                </p>
              )}
              <Field label="District">
                <select
                  className={FIELD}
                  value={core.district}
                  onChange={(e) => {
                    setWanted(null)
                    // A sector belongs to exactly one district, so changing the
                    // district has to clear it — otherwise the listing is filed
                    // in a sector that does not exist there.
                    setCore((c) => ({ ...c, district: e.target.value, sector: '' }))
                  }}
                >
                  <option value="">Choose…</option>
                  {districtGroups.map(([province, names]) => (
                    <optgroup key={province} label={province}>
                      {names.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </Field>
              <Field label="Sector">
                <select
                  className={cn(FIELD, !core.district && 'cursor-not-allowed opacity-55')}
                  disabled={!core.district}
                  value={core.sector}
                  onChange={(e) => {
                    setWanted(null)
                    setCore((c) => ({ ...c, sector: e.target.value, cell: '', village: '' }))
                  }}
                >
                  <option value="">
                    {core.district ? 'Choose…' : 'Choose a district first'}
                  </option>
                  {sectorOptions.map((sectorName) => (
                    <option key={sectorName} value={sectorName}>
                      {sectorName}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Cell">
                <select
                  className={cn(FIELD, !core.sector && 'cursor-not-allowed opacity-55')}
                  disabled={!core.sector}
                  value={core.cell}
                  onChange={(e) => {
                    setWanted(null)
                    setCore((c) => ({ ...c, cell: e.target.value, village: '' }))
                  }}
                >
                  <option value="">{core.sector ? 'Choose…' : 'Choose a sector first'}</option>
                  {cellOptions.map((cellName) => (
                    <option key={cellName} value={cellName}>
                      {cellName}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Village">
                <select
                  className={cn(FIELD, !core.cell && 'cursor-not-allowed opacity-55')}
                  disabled={!core.cell}
                  value={core.village}
                  onChange={(e) => {
                    setWanted(null)
                    setCore((c) => ({ ...c, village: e.target.value }))
                  }}
                >
                  <option value="">{core.cell ? 'Choose…' : 'Choose a cell first'}</option>
                  {villageOptions.map((villageName) => (
                    <option key={villageName} value={villageName}>
                      {villageName}
                    </option>
                  ))}
                </select>
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
                  hint="Paste a WKT polygon, a GeoJSON feature, or one corner per line as `latitude, longitude`."
                >
                  <textarea
                    rows={6}
                    className={cn(FIELD, 'h-auto py-2.5 font-mono text-[0.8125rem]')}
                    value={geo.boundary}
                    onChange={(e) => setGeo((g) => ({ ...g, boundary: e.target.value }))}
                    placeholder={
                      'POLYGON ((30.1396 -2.3077, 30.1396 -2.3079, 30.1394 -2.3079, 30.1396 -2.3077))\n\n…or one corner per line:\n-1.9701, 30.1388\n-1.9701, 30.1400'
                    }
                  />
                </Field>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <p
                    className={cn(
                      'text-[0.75rem]',
                      parsedBoundary.error
                        ? 'text-red-600'
                        : boundaryPoints.length >= 3
                          ? 'text-emerald-700'
                          : geo.boundary
                            ? 'text-amber-700'
                            : 'text-ink-muted',
                    )}
                  >
                    {parsedBoundary.error
                      ? parsedBoundary.error
                      : boundaryPoints.length >= 3
                        ? `Read as ${FORMAT_NAMES[parsedBoundary.format ?? ''] ?? 'coordinates'} — ` +
                          `${boundaryPoints.length} corners` +
                          (boundaryArea ? `, ${Math.round(boundaryArea).toLocaleString('en-RW')} sqm` : '')
                        : geo.boundary
                          ? `${boundaryPoints.length} valid corner(s) — at least 3 are needed`
                          : 'Leave blank if the parcel has not been surveyed yet'}
                  </p>
                  {parsedBoundary.transposed && (
                    <p className="text-[0.75rem] text-amber-700">
                      The pairs were longitude first, so they have been swapped to match.
                    </p>
                  )}
                  {sizeDrift !== null && (
                    <p className="text-[0.75rem] text-amber-700">
                      That outline measures {Math.round(boundaryArea!).toLocaleString('en-RW')} sqm
                      but the plot size says {Number(core.size).toLocaleString('en-RW')} —
                      a {Math.round(sizeDrift * 100)}% difference.
                    </p>
                  )}
                  {boundaryPoints.length >= 3 && (
                    <BoundaryPreview points={boundaryPoints} />
                  )}
                </div>

                {/* The outline on real ground. A coordinate list and an
                    abstract shape both look right until the parcel turns out
                    to be in the wrong sector — this is the check that catches
                    a transposed pair before a listing goes out. */}
                <Suspense
                  fallback={
                    <div className="mt-3 grid h-64 place-items-center rounded-2xl border border-line bg-canvas-alt text-[0.8125rem] text-ink-muted">
                      Loading the map…
                    </div>
                  }
                >
                  <BoundaryPreviewMap
                    className="mt-3"
                    points={boundaryPoints}
                    latitude={geo.latitude ? Number(geo.latitude) : null}
                    longitude={geo.longitude ? Number(geo.longitude) : null}
                    areaSqm={boundaryArea}
                    zone={parcel.master_plan_zone}
                  />
                </Suspense>
              </div>

              <div className="space-y-3 sm:col-span-2">
                <Toggle
                  label="Show the exact location on the public map"
                  hint="Off still names the district and sector, but withholds the pin and the parcel outline."
                  checked={flags.show_on_map}
                  onChange={(v) =>
                    setFlags((f) => ({
                      ...f,
                      show_on_map: v,
                      // Directions to a plot we are not placing on the map would
                      // give away the position the seller just withheld.
                      allow_directions: v ? f.allow_directions : false,
                    }))
                  }
                />
                {flags.show_on_map && (
                  <Toggle
                    label="Let buyers route themselves to the plot"
                    hint="Only with the owner's agreement. Turn-by-turn directions send strangers to vacant land unaccompanied."
                    checked={flags.allow_directions}
                    onChange={(v) => setFlags((f) => ({ ...f, allow_directions: v }))}
                  />
                )}
                <Toggle
                  label="Use the parcel outline as the listing picture until photographs are added"
                  hint="The shape above is drawn where the cover photo would go, on cards and on the listing page. Off leaves an empty frame instead."
                  checked={outlineAsCover}
                  onChange={setOutlineAsCover}
                />
              </div>
            </div>
          </Panel>

          {/* ---- tenure & zoning ---- */}
          <Panel title="Land use & master plan">
            <div className="grid gap-3.5 p-5 sm:grid-cols-2">
              <Field label="Current land use" hint="How the parcel is used today.">
                <select
                  className={FIELD}
                  value={parcel.land_use}
                  onChange={(e) => setParcel((p) => ({ ...p, land_use: e.target.value }))}
                >
                  <option value="">Not stated</option>
                  {LAND_USES.map((use) => (
                    <option key={use} value={use}>
                      {use}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Type of right"
                hint="What the certificate of land registration grants."
              >
                <select
                  className={FIELD}
                  value={parcel.right_type}
                  onChange={(e) => setParcel((p) => ({ ...p, right_type: e.target.value }))}
                >
                  <option value="">Not stated</option>
                  {RIGHT_TYPES.map((right) => (
                    <option key={right} value={right}>
                      {right}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Master plan zone"
                hint="The zoning the district Master Plan gives this parcel. The outline takes the zone's colour on every map."
              >
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className="size-6 shrink-0 rounded-md border border-line"
                    style={{ background: zoneColor(parcel.master_plan_zone) }}
                  />
                  <select
                    className={FIELD}
                    value={parcel.master_plan_zone}
                    onChange={(e) => setParcel((p) => ({ ...p, master_plan_zone: e.target.value }))}
                  >
                    <option value="">Not on the plan yet</option>
                    {ZONE_GROUPS.map(([group, zones]) => (
                      <optgroup key={group} label={group}>
                        {zones.map((z) => (
                          <option key={z.code} value={zoneValue(z)}>
                            {z.code} — {z.name}
                            {z.buildable === 'no' ? ' · no building' : z.buildable === 'restricted' ? ' · restricted' : ''}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </Field>

              <Field label="What the zone allows" hint="Density, storeys, permitted use.">
                <input
                  className={FIELD}
                  value={parcel.master_plan_note}
                  onChange={(e) => setParcel((p) => ({ ...p, master_plan_note: e.target.value }))}
                  placeholder="Up to G+3, residential"
                />
              </Field>

              {/* A parcel that straddles zones is listed by its largest share
                  but sold as the whole — so every share is recorded, with its
                  size, and the buyer sees the split rather than one name. */}
              <div className="sm:col-span-2">
                <Field
                  label="How the plan divides the parcel"
                  hint="One row per zone the plan puts the parcel in, with that zone's share in sqm. Filled from a parcel export automatically; the main zone above follows the largest buildable share."
                >
                  <div className="space-y-2">
                    {zoneRows.map((row, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="size-6 shrink-0 rounded-md border border-line"
                          style={{ background: zoneColor(row.zone) }}
                        />
                        <select
                          className={cn(FIELD, 'min-w-0 flex-1')}
                          value={row.zone}
                          onChange={(e) =>
                            setZoneRowsAndMain(
                              zoneRows.map((r, j) => (j === i ? { ...r, zone: e.target.value } : r)),
                            )
                          }
                        >
                          <option value="">Choose a zone…</option>
                          {ZONE_GROUPS.map(([group, zones]) => (
                            <optgroup key={group} label={group}>
                              {zones.map((z) => (
                                <option key={z.code} value={zoneValue(z)}>
                                  {z.code} — {z.name}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <div className="relative w-32 shrink-0">
                          <input
                            type="number"
                            min={0}
                            inputMode="decimal"
                            className={cn(FIELD, 'pr-11 tabular-nums')}
                            value={row.area}
                            placeholder="0"
                            aria-label="Share in square metres"
                            onChange={(e) =>
                              setZoneRowsAndMain(
                                zoneRows.map((r, j) => (j === i ? { ...r, area: e.target.value } : r)),
                              )
                            }
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-[0.75rem] text-ink-muted">
                            sqm
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setZoneRowsAndMain(zoneRows.filter((_, j) => j !== i))}
                          aria-label="Remove this zone"
                          className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-canvas-alt hover:text-red-600"
                        >
                          <Trash2 className="size-4" strokeWidth={2} />
                        </button>
                      </div>
                    ))}

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setZoneRows([...zoneRows, { zone: '', area: '' }])}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[0.8125rem] font-semibold text-ink-soft transition-colors hover:text-ink"
                      >
                        <Plus className="size-3.5" strokeWidth={2.4} />
                        {zoneRows.length ? 'Add another zone' : 'Split the parcel across zones'}
                      </button>
                      {zoneShares.length > 0 && zoneSum > 0 && (
                        <p
                          className={cn(
                            'text-[0.75rem] tabular-nums',
                            core.size && Math.abs(zoneSum - Number(core.size)) / Number(core.size) > 0.05
                              ? 'text-amber-700'
                              : 'text-ink-muted',
                          )}
                        >
                          Shares total {Math.round(zoneSum).toLocaleString('en-RW')} sqm
                          {core.size ? ` of a ${Number(core.size).toLocaleString('en-RW')} sqm plot` : ''}
                        </p>
                      )}
                    </div>

                    {zoneShares.length > 0 && (
                      <div className="rounded-xl border border-line bg-canvas-alt px-3.5 py-3">
                        <ZoneSplit zones={zoneShares} totalSqm={core.size ? Number(core.size) : null} compact />
                      </div>
                    )}
                  </div>
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Field
                  label="Master plan extract"
                  hint="Optional. A screenshot or scan of the zoning extract — buyers weigh the claim differently when the document is attached."
                >
                  <ProofUpload
                    file={proof}
                    url={mediaUrl(proofUrl) ?? null}
                    onPick={setProof}
                    onClear={() => {
                      setProof(null)
                      setProofUrl(null)
                    }}
                  />
                </Field>
              </div>

              <p className="text-[0.75rem] leading-relaxed text-ink-muted sm:col-span-2">
                The zone is what a district approves a building permit against, so it is worth
                confirming at the One Stop Centre rather than taking it from the seller.
              </p>
            </div>
          </Panel>

          {/* ---- photographs ---- */}
          <Panel title="Photographs">
            <div className="p-5">
              {editingId ? (
                <MediaUploader propertyId={editingId} existing={existing?.media} />
              ) : (
                <MediaUploader staged={photos} onStagedChange={setPhotos} />
              )}
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
              <div className="border-b border-line px-5 py-4">
                {/* A bare plot has nothing to specify. Asking about fences,
                    sewage and fittings for land with nothing on it produces a
                    page of "No" answers that tell a buyer less than one line. */}
                <Toggle
                  label="Empty land — nothing built on it"
                  hint="Skips the specification. The listing says 'bare land' instead of a list of features it does not have."
                  checked={emptyLand}
                  onChange={(v) => {
                    setEmptyLand(v)
                    if (v) setValues({})
                  }}
                />
              </div>
              {!emptyLand && (
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
              )}
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
              <Field
                label="Asking price"
                hint={
                  derivedPrice
                    ? "Worked out from the seller's price plus commission — edit those below."
                    : undefined
                }
              >
                <MoneyInput
                  currency="RWF"
                  className={cn(FIELD, Boolean(derivedPrice) && 'bg-canvas-alt text-ink-muted')}
                  value={derivedPrice ? String(derivedPrice) : core.price}
                  readOnly={Boolean(derivedPrice)}
                  onChange={(v) => setCore((c) => ({ ...c, price: v }))}
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

          <Panel title="Seller & commission">
            <div className="space-y-3.5 p-5">
              <Field
                label="Seller"
                hint="Pick a client so this parcel joins their history. Manage the list under Clients & deals."
              >
                <select
                  className={FIELD}
                  value={deal.seller_client_id}
                  onChange={(e) => setDeal((d) => ({ ...d, seller_client_id: e.target.value }))}
                >
                  <option value="">Not linked to a client</option>
                  {(clients ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.display_name}
                      {c.phone ? ` — ${c.phone}` : ''}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Owner name" hint="Used when the seller is not a saved client.">
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

              <div className="border-t border-line pt-3.5">
                <Field label="What the seller wants" hint="Their net figure, before our fee.">
                  <MoneyInput
                    currency="RWF"
                    className={FIELD}
                    value={deal.owner_price}
                    onChange={(v) => setDeal((d) => ({ ...d, owner_price: v }))}
                  />
                </Field>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Commission basis">
                  <select
                    className={FIELD}
                    value={deal.commission_basis}
                    onChange={(e) => setDeal((d) => ({ ...d, commission_basis: e.target.value }))}
                  >
                    <option value="percent">Percent</option>
                    <option value="fixed">Fixed amount</option>
                  </select>
                </Field>
                {deal.commission_basis === 'percent' ? (
                  <Field label="Rate (%)">
                    <input
                      className={FIELD}
                      inputMode="decimal"
                      value={deal.commission_rate}
                      onChange={(e) => setDeal((d) => ({ ...d, commission_rate: e.target.value }))}
                    />
                  </Field>
                ) : (
                  <Field label="Commission amount">
                    <MoneyInput
                      currency="RWF"
                      className={FIELD}
                      value={deal.commission_amount}
                      onChange={(v) => setDeal((d) => ({ ...d, commission_amount: v }))}
                    />
                  </Field>
                )}
              </div>

              <Toggle
                label="Add the commission on top of the seller's price"
                hint="Off means our fee comes out of the agreed price instead."
                checked={deal.commission_in_price}
                onChange={(v) => setDeal((d) => ({ ...d, commission_in_price: v }))}
              />

              {/* Shows the arithmetic before saving, so nobody has to trust it. */}
              {commissionPreview && (
                <p className="rounded-xl border border-line bg-canvas-alt px-3.5 py-2.5 text-[0.8125rem] text-ink-soft">
                  {commissionPreview}
                </p>
              )}
            </div>
          </Panel>

          <Panel title="Consultant">
            <div className="space-y-3.5 p-5">
              {can('admin') ? (
                <Field
                  label="Who handles this listing"
                  hint="Their name and photo appear on the public page as the buyer's consultant."
                >
                  <select
                    className={FIELD}
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                  >
                    <option value="">
                      {editingId ? 'Unassigned' : 'Assign on approval'}
                    </option>
                    {(agents ?? []).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.full_name}
                        {a.job_title ? ` — ${a.job_title}` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <p className="text-[0.8125rem] leading-relaxed text-ink-muted">
                  You will be named as the consultant on this listing once an admin approves it.
                  Until then it is not public, so there is nobody to name it to.
                </p>
              )}
            </div>
          </Panel>

          <Panel title="Viewings">
            <div className="space-y-3.5 p-5">
              <Toggle
                label="Buyers can book a viewing"
                hint="Off means viewings are arranged by hand, for qualified buyers only."
                checked={visit.viewing_allowed}
                onChange={(v) => setVisit((s) => ({ ...s, viewing_allowed: v }))}
              />

              {visit.viewing_allowed && (
                <>
                  <Field
                    label="Viewing fee"
                    hint="Covers the consultant's time and keeps sightseers away."
                  >
                    <MoneyInput
                      currency="RWF"
                      className={FIELD}
                      value={visit.visiting_fee}
                      onChange={(v) => setVisit((s) => ({ ...s, visiting_fee: v }))}
                    />
                  </Field>
                  <Toggle
                    label="The fee is negotiable"
                    hint="Shown to buyers as a starting figure rather than a fixed one."
                    checked={visit.visiting_fee_negotiable}
                    onChange={(v) => setVisit((s) => ({ ...s, visiting_fee_negotiable: v }))}
                  />
                  <p className="rounded-xl border border-line bg-canvas-alt px-3.5 py-2.5 text-[0.75rem] leading-relaxed text-ink-muted">
                    Buyers are told the fee comes off the purchase price — so it costs them nothing
                    if they go ahead, and we keep it only if they do not.
                  </p>
                </>
              )}
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
                <Field label="Minimum offer">
                  <MoneyInput
                    currency="RWF"
                    className={FIELD}
                    value={minBid}
                    onChange={setMinBid}
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

      <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-5">
        {(!subcategory || !core.reference_number || !core.title) && (
          <p className="text-[0.75rem] text-ink-muted">
            Needs a category, a reference number and a title before it can be saved.
          </p>
        )}
        {saveButton}
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

/**
 * A single optional image, staged in the browser.
 *
 * Not the gallery uploader: this is one document standing behind one claim, so
 * adding a second would only raise the question of which one is the proof.
 */
function ProofUpload({
  file,
  url,
  onPick,
  onClear,
}: {
  file: File | null
  url: string | null
  onPick: (file: File) => void
  onClear: () => void
}) {
  const [preview, setPreview] = useState<string | null>(null)

  // An object URL outlives its image unless it is revoked by hand.
  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const made = URL.createObjectURL(file)
    setPreview(made)
    return () => URL.revokeObjectURL(made)
  }, [file])

  const shown = preview ?? url

  if (shown) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-canvas p-3">
        <img
          src={shown}
          alt="Master plan extract"
          className="size-16 shrink-0 rounded-xl object-cover"
        />
        <p className="min-w-0 flex-1 truncate text-[0.8125rem] text-ink-soft">
          {file ? file.name : 'Attached'}
        </p>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-[0.75rem] font-semibold text-ink-soft transition-colors hover:border-red-300 hover:text-red-600"
        >
          Remove
        </button>
      </div>
    )
  }

  return (
    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-canvas px-4 py-6 text-[0.8125rem] font-semibold text-ink-soft transition-colors hover:border-gold-500 hover:text-ink">
      <ImagePlus className="size-4" strokeWidth={2.2} />
      Attach an extract
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        onChange={(e) => {
          const picked = e.target.files?.[0]
          if (picked) onPick(picked)
          e.target.value = ''
        }}
      />
    </label>
  )
}
