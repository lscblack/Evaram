/**
 * Reading the parcel export an agent pastes into the upload form.
 *
 * The land-registry lookup tool exports one parcel, or a list of them, as
 * JSON: the UPI, the address down to the village, the centre point, the area,
 * current and planned land use, the tenure, any encumbrances, and the surveyed
 * boundary. This turns that into what the form needs, so an agent pastes once
 * instead of retyping twenty fields — and the boundary arrives without anyone
 * ever having to touch a coordinate, which is where transposed corners come
 * from.
 *
 * Everything here is a suggestion the agent can overwrite. The export says
 * what the registry holds; the listing says what is for sale.
 */

import { zoneFor, zoneValue } from '@/data/masterPlan'

export interface PlannedZone {
  code: string
  name: string
  areaSqm: number | null
}

export interface ParcelImport {
  upi: string
  province: string | null
  district: string | null
  sector: string | null
  cell: string | null
  village: string | null
  fullAddress: string | null
  latitude: number | null
  longitude: number | null
  areaSqm: number | null
  /** Matched to the form's land-use list where possible. */
  landUse: string | null
  planned: PlannedZone[]
  /** The dominant planned zone, as the form stores it. */
  masterPlanZone: string | null
  /** Every planned zone with its share, as the form stores them. */
  zones: { zone: string; area_sqm: number | null }[]
  /** Matched to the form's type-of-right list where possible. */
  rightType: string | null
  leaseYearsRemaining: number | null
  /** Pasted straight into the boundary box, which already reads WKT. */
  boundaryWkt: string | null
  boundaryCorners: number
  /** A draft title and summary, for the agent to improve on. */
  title: string
  summary: string
  /** Things to look at before listing — a mortgage, a caveat, a missing outline. */
  warnings: string[]
}

export interface ParcelImportResult {
  parcels: ParcelImport[]
  error: string | null
}

/* ------------------------------------------------------------- matching */

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

/** The form's land-use list, keyed by what the registry tends to call it. */
const LAND_USE_HINTS: [RegExp, string][] = [
  [/agri|farm|crop/i, 'Agricultural'],
  [/resid|housing|settle/i, 'Residential'],
  [/commerc|trade|shop|market/i, 'Commercial'],
  [/mixed/i, 'Mixed use'],
  [/indust|factory|quarry|mining/i, 'Industrial'],
  [/livestock|pastur|grazing|cattle/i, 'Livestock'],
  [/forest|wood|tree/i, 'Forestry'],
  [/instit|public|school|health|admin|church|religio/i, 'Institutional / public'],
  [/recreat|sport|leisure|tourism/i, 'Recreational'],
  [/wetland|protect|buffer|water|conserv/i, 'Wetland / protected'],
]

const RIGHT_HINTS: [RegExp, string][] = [
  [/freehold|full\s*owner/i, 'Freehold'],
  [/emphyteutic|long[-\s]*term/i, 'Emphyteutic lease (long-term)'],
  [/lease/i, 'Leasehold'],
  [/occupan/i, 'Right of occupancy'],
  [/customary|unregist/i, 'Customary (not yet registered)'],
]

function matchHint(value: string | null | undefined, hints: [RegExp, string][], exact: string[] = []): string | null {
  if (!value) return null
  const found = exact.find((option) => option.toLowerCase() === value.trim().toLowerCase())
  if (found) return found
  const hint = hints.find(([pattern]) => pattern.test(value))
  return hint ? hint[1] : null
}

/** `NGERUKA` → `Ngeruka`; the registry shouts, the form does not. */
export function titleCase(value: string | null | undefined): string | null {
  if (!value) return null
  const text = value.trim()
  if (!text) return null
  if (text !== text.toUpperCase()) return text
  return text
    .toLowerCase()
    .replace(/(^|[\s\-'/])(\p{L})/gu, (_, before: string, letter: string) => before + letter.toUpperCase())
}

/* -------------------------------------------------------------- reading */

type Raw = Record<string, unknown>

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}
const obj = (v: unknown): Raw => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : {})

/** `A1-Agriculture zone` → the code and the name, split on the first dash. */
function readPlanned(entry: unknown): PlannedZone | null {
  const row = obj(entry)
  const label = str(row.landUseName ?? row.land_use ?? row.name ?? row.zone)
  if (!label) return null
  const match = label.match(/^\s*([A-Za-z]{1,2}\d?[A-Ba-b]?)\s*[-–—:]\s*(.+)$/)
  const code = (match?.[1] ?? label.split(/\s/)[0]).toUpperCase()
  const name = (match?.[2] ?? label).trim()
  return { code, name, areaSqm: num(row.area_sqm ?? row.area) }
}

function readOne(raw: unknown): ParcelImport {
  const row = obj(raw)
  const location = obj(row.location)
  const coords = obj(row.coordinates)
  const landUse = obj(row.land_use)
  const tenure = obj(row.tenure)
  const status = obj(row.status)
  const boundary = obj(row.boundary)

  const upi = str(row.upi) ?? ''
  const district = titleCase(str(location.district))
  const sector = titleCase(str(location.sector))
  const cell = titleCase(str(location.cell))
  const village = titleCase(str(location.village))
  const province = titleCase(str(location.province))
  // The address mixes cases part by part, so each part is judged on its own.
  const fullAddress =
    (str(location.full_address) ?? '')
      .split(',')
      .map((part) => titleCase(part))
      .filter(Boolean)
      .join(', ') ||
    [village, cell, sector, district].filter(Boolean).join(', ') ||
    null

  const areaSqm = num(row.area_sqm ?? row.area)
  const planned = (Array.isArray(landUse.planned) ? landUse.planned : [])
    .map(readPlanned)
    .filter(Boolean) as PlannedZone[]
  planned.sort((a, b) => (b.areaSqm ?? 0) - (a.areaSqm ?? 0))

  // The zone the listing is filed under is the one most of the plot sits in.
  // A road reserve is only chosen when it is all there is: it says what the
  // council will take, not what a buyer may build.
  const dominant =
    planned.find((z) => !z.code.startsWith('T') && zoneFor(z.code)) ??
    planned.find((z) => zoneFor(z.code)) ??
    null
  const zone = dominant ? zoneFor(dominant.code) : null
  const masterPlanZone = zone ? zoneValue(zone) : null
  const zones = planned.flatMap((z) => {
    const known = zoneFor(z.code)
    return known ? [{ zone: zoneValue(known), area_sqm: z.areaSqm }] : []
  })

  const currentUse = str(landUse.current)
  const rightRaw = str(tenure.type)
  const leaseYears = num(tenure.remaining_lease_term_years)

  // WKT is what the boundary box reads most reliably; fall back to the
  // GeoJSON when an export carries only that.
  let boundaryWkt = str(boundary.wkt)
  const geojson = boundary.geojson
  if (!boundaryWkt && geojson && typeof geojson === 'object') boundaryWkt = JSON.stringify(geojson)
  const boundaryCorners =
    num(boundary.vertex_count) ??
    (boundaryWkt ? (boundaryWkt.match(/[-+]?\d*\.?\d+\s+[-+]?\d*\.?\d+/g) ?? []).length : 0)

  const warnings: string[] = []
  if (!upi) warnings.push('No UPI in the export — the parcel cannot be checked against the registry')
  if (status.under_mortgage === true) warnings.push('The registry records a mortgage on this parcel')
  if (status.has_caveat === true) warnings.push('A caveat is registered against this parcel')
  if (status.in_transaction === true) warnings.push('A transaction is already in progress on this parcel')
  if (!boundaryWkt) warnings.push('No boundary in the export — the outline will have to be pasted by hand')
  if (leaseYears != null && leaseYears < 20) warnings.push(`Only ${leaseYears} years remain on the lease`)
  if (planned.length && !zone) warnings.push('The planned land use did not match a Master Plan zone code')

  const place = [village ?? cell ?? sector, district].filter(Boolean).join(', ')
  const title = areaSqm
    ? `${Math.round(areaSqm).toLocaleString('en-RW')} sqm plot${place ? ` at ${place}` : ''}`
    : `Plot${upi ? ` ${upi}` : ''}${place ? ` at ${place}` : ''}`

  const summaryBits = [
    upi ? `Registered parcel ${upi}` : 'Registered parcel',
    fullAddress ? `in ${fullAddress}` : '',
  ]
  const summaryTail = [
    areaSqm ? `${Math.round(areaSqm).toLocaleString('en-RW')} sqm` : '',
    currentUse ? `currently ${currentUse.toLowerCase()}` : '',
    rightRaw
      ? `${rightRaw}${leaseYears != null ? ` with ${leaseYears} years remaining` : ''}`
      : '',
    zone ? `zoned ${zone.code} (${zone.name.toLowerCase()})` : '',
  ].filter(Boolean)
  const summary = `${summaryBits.filter(Boolean).join(' ')}. ${summaryTail.join(', ')}.`.replace(/\s+\./g, '.')

  return {
    upi,
    province,
    district,
    sector,
    cell,
    village,
    fullAddress,
    latitude: num(coords.latitude ?? coords.lat),
    longitude: num(coords.longitude ?? coords.lng ?? coords.lon),
    areaSqm,
    landUse: matchHint(currentUse, LAND_USE_HINTS, LAND_USES),
    planned,
    masterPlanZone,
    zones,
    rightType: matchHint(rightRaw, RIGHT_HINTS),
    leaseYearsRemaining: leaseYears,
    boundaryWkt,
    boundaryCorners,
    title,
    summary,
    warnings,
  }
}

/**
 * One parcel or many, from whatever was pasted.
 *
 * Accepts a bare object, an array, or an object wrapping an array under
 * `parcels` / `items` / `data`, since export tools disagree about the outer
 * shape and an agent should not have to care.
 */
export function parseParcelExport(text: string): ParcelImportResult {
  const trimmed = text.trim()
  if (!trimmed) return { parcels: [], error: null }

  let data: unknown
  try {
    data = JSON.parse(trimmed)
  } catch {
    return { parcels: [], error: 'That is not valid JSON — paste the export exactly as the tool produced it.' }
  }

  let rows: unknown[]
  if (Array.isArray(data)) rows = data
  else {
    const wrapper = obj(data)
    const inner = [wrapper.parcels, wrapper.items, wrapper.data].find(Array.isArray) as unknown[] | undefined
    rows = inner ?? [data]
  }

  const parcels = rows.filter((r) => r && typeof r === 'object').map(readOne)
  if (!parcels.length) return { parcels: [], error: 'No parcels were found in that export.' }
  if (parcels.every((p) => !p.upi && !p.boundaryWkt && p.latitude == null)) {
    return { parcels: [], error: 'That JSON does not look like a parcel export — no UPI, boundary or coordinates in it.' }
  }
  return { parcels, error: null }
}
