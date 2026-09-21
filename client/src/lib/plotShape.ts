/**
 * A parcel's outline, drawn as a picture.
 *
 * A listing uploaded before its photographs still has the one thing a buyer
 * of land most wants to see — the surveyed shape. This renders that shape as
 * an SVG data URL so it can go wherever a photograph would: every `<img>` on
 * the site takes it as-is, and the card's hover frame, the gallery, the
 * lightbox and the map popups keep working without knowing the difference.
 *
 * Two views. `plan` is north-up, as on the title deed, with each side's
 * length written along it. `oblique` is the same shape tilted and given
 * depth — what the card shows on hover and what the 3D map draws.
 */

import type { ApiMedia, ApiPropertyCard, ApiPropertyDetail } from '@/types/api'
import { zoneColor } from '@/data/masterPlan'

const W = 800
const H = 600

const NAVY_950 = '#03172c'
const NAVY_900 = '#062b4f'
const GOLD = '#c98a2b'
const GOLD_SOFT = '#e8b96f'
const FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"

/** How much of the frame the shape may fill. Conservative on purpose: the
 *  picture is cropped to whatever box it lands in — a 4:5 hero, a square
 *  thumbnail — and the outline has to survive every one of them. */
const FIT_W = W * 0.56
const FIT_H = H * 0.58

export type PlotView = 'plan' | 'oblique'

export interface PlotShapeOptions {
  view?: PlotView
  /** The stored Master Plan zone; decides the fill colour, as on the map. */
  zone?: string | null
  /** Surveyed area, when the server has computed it; otherwise it is
   *  measured here from the outline itself. */
  areaSqm?: number | null
}

type XY = [number, number]

/** GeoJSON rings are `[lng, lat]`; the stored outline is `[lat, lng]`. */
export function ringToPoints(ring: number[][] | null | undefined): number[][] {
  if (!ring) return []
  return ring.map(([lng, lat]) => [lat, lng])
}

/** Whether there is enough of an outline to draw. */
export function hasShape(points: number[][] | null | undefined): points is number[][] {
  return Array.isArray(points) && points.length >= 3
}

/** Stored rings are open; GeoJSON rings repeat the first point at the end.
 *  The drawing wants them open — a closing point would double a corner. */
function openRing(points: number[][]): number[][] {
  const [a, b] = [points[0], points[points.length - 1]]
  return points.length > 1 && a[0] === b[0] && a[1] === b[1] ? points.slice(0, -1) : points
}

/* ------------------------------------------------------------ geometry */

/** Local metres, north up: enough for a parcel, which is never big enough
 *  for the Earth's curve to matter. */
function project(points: number[][]): XY[] {
  const lat0 = points.reduce((s, p) => s + p[0], 0) / points.length
  const lng0 = points.reduce((s, p) => s + p[1], 0) / points.length
  const k = Math.cos((lat0 * Math.PI) / 180)
  return points.map(([lat, lng]) => [(lng - lng0) * k * 111_320, -(lat - lat0) * 110_574])
}

function shoelace(pts: XY[]): number {
  let a = 0
  for (let i = 0; i < pts.length; i += 1) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % pts.length]
    a += x1 * y2 - x2 * y1
  }
  return Math.abs(a) / 2
}

function centroid(pts: XY[]): XY {
  return [
    pts.reduce((s, p) => s + p[0], 0) / pts.length,
    pts.reduce((s, p) => s + p[1], 0) / pts.length,
  ]
}

function rotate(pts: XY[], degrees: number): XY[] {
  const r = (degrees * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  return pts.map(([x, y]) => [x * c - y * s, x * s + y * c])
}

/** Scale and centre into the frame, returning the points and the scale so
 *  that lengths can still be read back in metres. */
function fit(pts: XY[]): { pts: XY[]; scale: number } {
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const scale = Math.min(FIT_W / Math.max(maxX - minX, 1e-6), FIT_H / Math.max(maxY - minY, 1e-6))
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  return {
    scale,
    pts: pts.map(([x, y]) => [W / 2 + (x - cx) * scale, H / 2 + (y - cy) * scale]),
  }
}

/* -------------------------------------------------------------- colours */

function shade(hex: string, factor: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const channel = (shift: number) =>
    Math.max(0, Math.min(255, Math.round(((n >> shift) & 255) * factor)))
  return `#${[16, 8, 0].map((s) => channel(s).toString(16).padStart(2, '0')).join('')}`
}

function formatArea(sqm: number): string {
  if (sqm >= 10_000) return `${(sqm / 10_000).toFixed(2)} ha`
  return `${Math.round(sqm).toLocaleString('en-RW')} m²`
}

const fmt = (n: number) => n.toFixed(1)
const path = (pts: XY[]) => pts.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(' ')

/* ---------------------------------------------------------------- parts */

function backdrop(): string {
  return `<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${NAVY_900}"/><stop offset="1" stop-color="${NAVY_950}"/>
</linearGradient>
<radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
<stop offset="0" stop-color="${GOLD}" stop-opacity="0.22"/><stop offset="1" stop-color="${GOLD}" stop-opacity="0"/>
</radialGradient>
<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
<path d="M40 0H0V40" fill="none" stroke="#ffffff" stroke-opacity="0.06" stroke-width="1"/>
</pattern>
<filter id="blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect width="${W}" height="${H}" fill="url(#grid)"/>
<ellipse cx="${W / 2}" cy="${H / 2}" rx="${W * 0.42}" ry="${H * 0.42}" fill="url(#glow)"/>`
}

function northArrow(bearing: number): string {
  // Kept inside the middle 5/6 of the frame so a 16:10 crop of the 4:3
  // picture — the gallery's main frame — does not cut the "N" off.
  const x = W - 62
  const y = H - 94
  return `<g transform="translate(${x} ${y}) rotate(${fmt(bearing)})" fill="#ffffff" fill-opacity="0.85">
<path d="M0 -22 L9 8 L0 2 L-9 8 Z"/>
<text y="30" text-anchor="middle" font-family="${FONT}" font-size="15" font-weight="700" letter-spacing="1">N</text>
</g>`
}

function areaLabel(at: XY, area: number, caption: string): string {
  return `<g text-anchor="middle" font-family="${FONT}" paint-order="stroke" stroke="${NAVY_950}" stroke-opacity="0.55" stroke-width="5" stroke-linejoin="round">
<text x="${fmt(at[0])}" y="${fmt(at[1] + 8)}" font-size="42" font-weight="600" fill="#ffffff">${formatArea(area)}</text>
<text x="${fmt(at[0])}" y="${fmt(at[1] + 36)}" font-size="13" font-weight="600" letter-spacing="2.5" fill="${GOLD_SOFT}">${caption}</text>
</g>`
}

function corners(pts: XY[]): string {
  return pts
    .map(([x, y]) => `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="6" fill="${NAVY_950}" stroke="${GOLD}" stroke-width="2.5"/>`)
    .join('')
}

/** Each side's length, written along it on the outside — the way a survey
 *  sheet does. Skipped for sides too short to carry a label. */
function sideLengths(pts: XY[], scale: number): string {
  if (pts.length > 10) return ''
  const c = centroid(pts)
  let out = ''
  for (let i = 0; i < pts.length; i += 1) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % pts.length]
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.hypot(dx, dy)
    if (len < 90) continue

    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2
    // Outward normal: whichever side of the edge the centroid is not on.
    let nx = -dy / len
    let ny = dx / len
    if ((mx - c[0]) * nx + (my - c[1]) * ny < 0) {
      nx = -nx
      ny = -ny
    }
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI
    if (angle > 90 || angle < -90) angle += 180

    const metres = len / scale
    out += `<text x="${fmt(mx + nx * 16)}" y="${fmt(my + ny * 16 + 5)}" transform="rotate(${fmt(angle)} ${fmt(mx + nx * 16)} ${fmt(my + ny * 16)})" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="600" fill="#ffffff" fill-opacity="0.9" paint-order="stroke" stroke="${NAVY_950}" stroke-width="4" stroke-linejoin="round">${metres < 100 ? metres.toFixed(1) : Math.round(metres)} m</text>`
  }
  return out
}

/* ---------------------------------------------------------------- views */

function planView(points: number[][], zone: string | null | undefined, areaSqm?: number | null): string {
  const local = project(points)
  const area = areaSqm ?? shoelace(local)
  const { pts, scale } = fit(local)
  const colour = zoneColor(zone)

  return `${backdrop()}
<polygon points="${path(pts)}" fill="${colour}" fill-opacity="0.32" stroke="${GOLD}" stroke-width="3.5" stroke-linejoin="round"/>
${sideLengths(pts, scale)}
${corners(pts)}
${areaLabel(centroid(pts), area, 'SURVEYED PLOT')}
${northArrow(0)}`
}

const BEARING = -28
const SQUASH = 0.52
const DEPTH = 34

function obliqueView(points: number[][], zone: string | null | undefined, areaSqm?: number | null): string {
  const local = project(points)
  const area = areaSqm ?? shoelace(local)
  const turned = rotate(local, BEARING).map(([x, y]) => [x, y * SQUASH] as XY)
  const { pts: top } = fit(turned)
  // Fitting centred the slab's top face; the side walls hang below it, so the
  // whole thing is nudged up to sit in the middle of the frame.
  const lift = DEPTH / 2
  const topFace = top.map(([x, y]) => [x, y - lift] as XY)
  const bottom = topFace.map(([x, y]) => [x, y + DEPTH] as XY)

  const colour = zoneColor(zone)
  const sideColour = shade(colour, 0.62)
  const baseColour = shade(colour, 0.42)

  // Painter's order: far sides first, near sides last, the top face over all
  // of them — so the walls that would be hidden are hidden.
  const sides = topFace
    .map((_, i) => {
      const j = (i + 1) % topFace.length
      const quad: XY[] = [topFace[i], topFace[j], bottom[j], bottom[i]]
      return { depth: (topFace[i][1] + topFace[j][1]) / 2, quad }
    })
    .sort((a, b) => a.depth - b.depth)
    .map(
      ({ quad }) =>
        `<polygon points="${path(quad)}" fill="${sideColour}" fill-opacity="0.92" stroke="${GOLD}" stroke-opacity="0.55" stroke-width="1.5" stroke-linejoin="round"/>`,
    )
    .join('')

  const c = centroid(topFace)
  const shadow = `<ellipse cx="${fmt(c[0] + 10)}" cy="${fmt(c[1] + DEPTH + 26)}" rx="${fmt(FIT_W * 0.5)}" ry="${fmt(FIT_H * SQUASH * 0.42)}" fill="#000000" fill-opacity="0.45" filter="url(#blur)"/>`

  return `${backdrop()}
${shadow}
<polygon points="${path(bottom)}" fill="${baseColour}" stroke="${GOLD}" stroke-opacity="0.4" stroke-width="1.5" stroke-linejoin="round"/>
${sides}
<polygon points="${path(topFace)}" fill="${colour}" fill-opacity="0.55" stroke="${GOLD}" stroke-width="3.5" stroke-linejoin="round"/>
${corners(topFace)}
${areaLabel([c[0], c[1] - 6], area, 'SURVEYED PLOT · 3D')}
${northArrow(BEARING)}`
}

/* -------------------------------------------------------------- exports */

const cache = new Map<string, string>()

/**
 * The outline as an image URL, ready for `<img src>`.
 *
 * Cached by input: a results page draws the same few shapes on every render,
 * and re-serialising them each time is wasted work.
 */
export function plotShapeUrl(points: number[][], options: PlotShapeOptions = {}): string {
  const { view = 'plan', zone = null, areaSqm = null } = options
  const key = `${view}|${zone ?? ''}|${areaSqm ?? ''}|${JSON.stringify(points)}`
  const hit = cache.get(key)
  if (hit) return hit

  const ring = openRing(points)
  const body = view === 'oblique' ? obliqueView(ring, zone, areaSqm) : planView(ring, zone, areaSqm)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  cache.set(key, url)
  return url
}

type CardLike = Pick<ApiPropertyCard, 'cover_url' | 'boundary_points'> & {
  master_plan_zone?: string | null
  outline_as_cover?: boolean
}

/** The agent can switch the outline-as-picture off per listing. */
const outlineAllowed = (card: { outline_as_cover?: boolean }) => card.outline_as_cover !== false

/** What a listing card shows where its photograph would go. */
export function coverOf(card: CardLike): string | undefined {
  if (card.cover_url) return card.cover_url
  if (outlineAllowed(card) && hasShape(card.boundary_points)) {
    return plotShapeUrl(card.boundary_points, { view: 'plan', zone: card.master_plan_zone })
  }
  return undefined
}

/** The card's hover frame: the second photograph, or the shape in 3D. */
export function secondOf(card: CardLike & Pick<ApiPropertyCard, 'second_image_url'>): string | undefined {
  if (card.second_image_url) return card.second_image_url
  if (card.cover_url) return card.cover_url
  if (outlineAllowed(card) && hasShape(card.boundary_points)) {
    return plotShapeUrl(card.boundary_points, { view: 'oblique', zone: card.master_plan_zone })
  }
  return undefined
}

/**
 * A map feature's cover: its photograph, or its outline drawn from the
 * geometry the map already has. The map never loads the media relationship,
 * so listings without a photograph would otherwise show a blank tile in the
 * results list and the popup.
 */
export function parcelCover(feature: {
  geometry: { type: string; coordinates: unknown }
  properties: { cover_url: string | null; master_plan_zone: string | null; outline_as_cover?: boolean }
}): string | null {
  if (feature.properties.cover_url) return feature.properties.cover_url
  if (!outlineAllowed(feature.properties) || feature.geometry?.type !== 'Polygon') return null
  const points = openRing(ringToPoints((feature.geometry.coordinates as number[][][])[0]))
  if (!hasShape(points)) return null
  return plotShapeUrl(points, { view: 'plan', zone: feature.properties.master_plan_zone })
}

/**
 * Gallery entries for a listing with no photographs: the outline flat, then
 * in 3D. Shaped like media rows so the gallery, its thumbnails and the
 * lightbox need no special case.
 */
export function outlineMedia(
  property: Pick<ApiPropertyDetail, 'boundary_points' | 'master_plan_zone' | 'boundary_area_sqm' | 'outline_as_cover'>,
): ApiMedia[] {
  if (!outlineAllowed(property) || !hasShape(property.boundary_points)) return []
  const base = { zone: property.master_plan_zone, areaSqm: property.boundary_area_sqm }
  const entry = (view: PlotView, caption: string, order: number): ApiMedia => ({
    id: `outline-${view}`,
    kind: 'image',
    url: plotShapeUrl(property.boundary_points as number[][], { ...base, view }),
    thumbnail_url: null,
    caption,
    alt_text: caption,
    is_cover: order === 0,
    display_order: order,
    meta: { outline: view },
  })
  return [entry('plan', 'Surveyed plot outline', 0), entry('oblique', 'Surveyed plot in 3D', 1)]
}
