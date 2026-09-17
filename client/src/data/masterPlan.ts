/**
 * Rwanda's Master Plan zoning categories, with the colours the plans use.
 *
 * One table, read by the upload form's dropdown, by every map that shades a
 * parcel, and by the listing page's zone chip — so a zone is named, coloured
 * and explained the same way everywhere.
 *
 * Codes and names follow the district Master Plan legend. Colours are taken
 * from that legend by eye, so they match it closely rather than exactly; if
 * an official palette file is ever published, this is the one place to update.
 */

export interface MasterPlanZone {
  code: string
  name: string
  group: string
  /** The legend colour, as hex. */
  color: string
  /** Whether the zone permits building at all — the first thing a buyer asks. */
  buildable: 'yes' | 'restricted' | 'no'
}

const zone = (
  code: string,
  name: string,
  group: string,
  color: string,
  buildable: MasterPlanZone['buildable'] = 'yes',
): MasterPlanZone => ({ code, name, group, color, buildable })

export const MASTER_PLAN_ZONES: MasterPlanZone[] = [
  // ---- residential
  zone('R1', 'Low density residential zone', 'Residential', '#FFFF99'),
  zone('R1A', 'Low density residential densification zone', 'Residential', '#FFFF00'),
  zone('R1B', 'Rural residential zone', 'Residential', '#FFEEBB'),
  zone('R2', 'Medium density residential – Improvement zone', 'Residential', '#FFB000'),
  zone('R3', 'Medium density residential – Expansion zone', 'Residential', '#FF7F00'),
  zone('R4', 'High density residential zone', 'Residential', '#FF3D00'),
  zone('RS', 'Rural settlement site', 'Residential', '#FF2D8A'),

  // ---- commercial
  zone('C1', 'Mixed use commercial zone', 'Commercial', '#E6007E'),
  zone('C2', 'Neighbourhood commercial zone (O-C2)', 'Commercial', '#FF0000'),
  zone('C3', 'City commercial zone', 'Commercial', '#A50000'),
  zone('C4', 'Regional commercial zone (O-C4)', 'Commercial', '#6E0000'),

  // ---- industrial
  zone('I1', 'Light industrial zone', 'Industrial', '#E68CC8'),
  zone('I2', 'General industrial zone', 'Industrial', '#B889B8'),
  zone('I3', 'Mining, extraction, quarry', 'Industrial', '#A6008C', 'restricted'),

  // ---- public
  zone('PA', 'Public administration zone', 'Public', '#00FFFF', 'restricted'),
  zone('PF1', 'Education and research facilities', 'Public facilities', '#4400FF', 'restricted'),
  zone('PF2', 'Health facilities', 'Public facilities', '#4400FF', 'restricted'),
  zone('PF3', 'Religious facilities', 'Public facilities', '#4400FF', 'restricted'),
  zone('PF4', 'Cultural, heritage, memorial sites', 'Public facilities', '#4400FF', 'restricted'),
  zone('PF5', 'Sport, leisure facilities', 'Public facilities', '#4400FF', 'restricted'),
  zone('PF6', 'Cemetery, crematoria', 'Public facilities', '#4400FF', 'no'),

  // ---- agriculture and land
  zone('A1', 'Agriculture zone', 'Agriculture', '#7B8B2A', 'restricted'),
  zone('A2', 'Livestock zone', 'Agriculture', '#7B8B2A', 'restricted'),
  zone('ET', 'Eco-tourism and open space zone', 'Open space', '#B6E600', 'restricted'),
  zone('UE', 'Urban area extension zone', 'Urban extension', '#E0AE94'),
  zone('U', 'Utility zone', 'Utility', '#8B5A2B', 'restricted'),

  // ---- forest
  zone('F1', 'Forest plantation zone', 'Forest', '#0F5F32', 'no'),
  zone('F2', 'National parks zone', 'Forest', '#0F5F32', 'no'),
  zone('F3', 'National park expansion zone', 'Forest', '#0F5F32', 'no'),
  zone('F4', 'Natural forest zone', 'Forest', '#0F5F32', 'no'),
  zone('F5', 'Afforestation zone', 'Forest', '#0F5F32', 'no'),

  // ---- buffers, wetlands and water — the zones a buyer most needs warning of
  zone('B1', 'Wetland buffer zone', 'Buffer', '#00E640', 'no'),
  zone('B2', 'Water body buffer zone', 'Buffer', '#00E640', 'no'),
  zone('B3', 'National park buffer zone', 'Buffer', '#00E640', 'no'),
  zone('B4', 'Other buffer zone', 'Buffer', '#00E640', 'no'),
  zone('W1A', 'Wetland – Protected zone', 'Wetland', '#A8E6A8', 'no'),
  zone('W1B', 'Wetland – Unprotected zone', 'Wetland', '#A8E6A8', 'no'),
  zone('W2', 'Wetland – Rehabilitation zone', 'Wetland', '#A8E6A8', 'no'),
  zone('W3', 'Wetland – Sustainable exploitation zone', 'Wetland', '#A8E6A8', 'no'),
  zone('W4', 'Wetland – Conservation zone', 'Wetland', '#A8E6A8', 'no'),
  zone('W5', 'Wetland – Recreational zone', 'Wetland', '#A8E6A8', 'no'),
  zone('WB', 'Waterbody zone', 'Water', '#1F70E6', 'no'),

  // ---- transport
  zone('T1', 'Road reserve', 'Transport', '#A6A6A6', 'no'),
  zone('T2', 'Bus terminals and stations', 'Transport', '#A6A6A6', 'no'),
  zone('T3', 'Airports, ports and connected facilities', 'Transport', '#A6A6A6', 'no'),
  zone('T4', 'Railway and stations', 'Transport', '#A6A6A6', 'no'),
]

/** Colour of a parcel with no zone recorded — the brand's own, so it is
 *  never mistaken for a zone. */
export const UNZONED_COLOR = '#c98a2b'

const BY_CODE = new Map(MASTER_PLAN_ZONES.map((z) => [z.code, z]))

/** The value stored on a listing: `R2 — Medium density residential – Improvement zone`. */
export const zoneValue = (z: MasterPlanZone) => `${z.code} — ${z.name}`

/**
 * The zone code at the front of a stored value.
 *
 * Tolerant on purpose. Earlier listings stored free text like
 * `R2 — medium density residential`, and an admin may type just `R2`; both
 * still colour correctly as long as the code leads.
 */
export function zoneCode(value: string | null | undefined): string | null {
  if (!value) return null
  const match = value.trim().toUpperCase().match(/^([A-Z]{1,2}\d?[AB]?)\b/)
  if (!match) return null
  return BY_CODE.has(match[1]) ? match[1] : null
}

export const zoneFor = (value: string | null | undefined): MasterPlanZone | null => {
  const code = zoneCode(value)
  return code ? (BY_CODE.get(code) ?? null) : null
}

export const zoneColor = (value: string | null | undefined): string =>
  zoneFor(value)?.color ?? UNZONED_COLOR

/** Zones grouped for a dropdown, in legend order. */
export const ZONE_GROUPS: [string, MasterPlanZone[]][] = (() => {
  const groups = new Map<string, MasterPlanZone[]>()
  for (const z of MASTER_PLAN_ZONES) groups.set(z.group, [...(groups.get(z.group) ?? []), z])
  return [...groups.entries()]
})()

/**
 * A MapLibre `match` expression: zone code → legend colour.
 *
 * Built once from the table so a map layer and the dropdown can never
 * disagree about what colour a zone is.
 */
export const ZONE_COLOR_EXPRESSION: unknown[] = [
  'match',
  ['coalesce', ['get', 'zone_code'], ''],
  ...MASTER_PLAN_ZONES.flatMap((z) => [z.code, z.color]),
  UNZONED_COLOR,
]

/** Dark text on light zones, light on dark — for the chip and the legend. */
export function zoneInk(color: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255)
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luma > 0.55 ? '#111827' : '#ffffff'
}
