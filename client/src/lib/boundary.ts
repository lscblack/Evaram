/**
 * Reading a parcel boundary out of whatever the surveyor's software produced.
 *
 * Mirrors `geometry_service.parse_boundary` on the server so the console can
 * show a live preview before anything is saved. The server re-parses whatever
 * it is sent and remains the authority — this exists to tell an agent that
 * their paste was understood, not to decide what gets stored.
 *
 * Coordinate order is decided by format, not guessed: WKT and GeoJSON are
 * longitude-first by specification, the pasted-corner format is latitude-first.
 * The same four numbers mean different places depending on which one it is.
 */

/** Rwanda's envelope — used only to catch transposed free-text coordinates. */
const RW_LAT: [number, number] = [-3.0, -0.9]
const RW_LNG: [number, number] = [28.8, 31.0]

const WKT = /^\s*(MULTI)?POLYGON\s*(Z|M|ZM)?\s*\(/i
const NUMBER = String.raw`[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?`
const PAIR = new RegExp(`(${NUMBER})\\s+(${NUMBER})`, 'g')

export interface ParsedBoundary {
  /** `[[lat, lng], …]`, open — the closing point is implied. */
  points: [number, number][]
  /** Which format it was read as, so the agent can see it was understood. */
  format: 'wkt' | 'geojson' | 'coordinates' | null
  /** Set when the coordinate order was corrected. */
  transposed: boolean
  error: string | null
}

const EMPTY: ParsedBoundary = { points: [], format: null, transposed: false, error: null }

function inRwanda(lat: number, lng: number): boolean {
  return lat >= RW_LAT[0] && lat <= RW_LAT[1] && lng >= RW_LNG[0] && lng <= RW_LNG[1]
}

function close(ring: [number, number][]): [number, number][] {
  if (
    ring.length > 1 &&
    Math.abs(ring[0][0] - ring[ring.length - 1][0]) < 1e-9 &&
    Math.abs(ring[0][1] - ring[ring.length - 1][1]) < 1e-9
  ) {
    return ring.slice(0, -1)
  }
  return ring
}

function ringFromGeoJson(data: unknown): [number, number][] {
  let node = data as Record<string, unknown>
  if (node?.type === 'FeatureCollection') {
    const features = node.features as unknown[] | undefined
    if (!features?.length) throw new Error('That FeatureCollection has no features')
    node = features[0] as Record<string, unknown>
  }
  if (node?.type === 'Feature') node = node.geometry as Record<string, unknown>
  if (!node || !('coordinates' in node)) throw new Error('That GeoJSON has no geometry')

  const coords = node.coordinates as number[][][] | number[][][][]
  let ring: number[][]
  if (node.type === 'Polygon') ring = coords[0] as number[][]
  else if (node.type === 'MultiPolygon') ring = (coords as number[][][][])[0][0]
  else throw new Error(`A boundary must be a polygon, not ${String(node.type)}`)

  return ring.map((p) => [Number(p[1]), Number(p[0])] as [number, number])
}

export function parseBoundary(raw: string): ParsedBoundary {
  const text = raw.trim()
  if (!text) return EMPTY

  try {
    if (WKT.test(text)) {
      const pairs = [...text.matchAll(PAIR)]
      if (!pairs.length) throw new Error('No coordinates found in that WKT polygon')
      const points = close(
        pairs.map((m) => [Number(m[2]), Number(m[1])] as [number, number]),
      )
      return { points, format: 'wkt', transposed: false, error: null }
    }

    if (text.startsWith('{') || text.startsWith('[')) {
      return {
        points: close(ringFromGeoJson(JSON.parse(text))),
        format: 'geojson',
        transposed: false,
        error: null,
      }
    }

    const pairs: [number, number][] = []
    for (const line of text.split('\n')) {
      const bits = line.trim().replace(/,$/, '').split(/[,\s]+/).filter(Boolean)
      if (bits.length < 2) continue
      const a = Number(bits[0])
      const b = Number(bits[1])
      if (Number.isFinite(a) && Number.isFinite(b)) pairs.push([a, b])
    }
    if (!pairs.length) throw new Error('No coordinate pairs could be read from that text')

    // Documented as `lat, lng`; only overridden when the numbers say otherwise.
    const swapped = pairs.map(([a, b]) => [b, a] as [number, number])
    const needsSwap =
      pairs.some(([a]) => Math.abs(a) > 90) ||
      swapped.filter(([lat, lng]) => inRwanda(lat, lng)).length >
        pairs.filter(([lat, lng]) => inRwanda(lat, lng)).length

    return {
      points: close(needsSwap ? swapped : pairs),
      format: 'coordinates',
      transposed: needsSwap,
      error: null,
    }
  } catch (err) {
    return {
      ...EMPTY,
      error: err instanceof Error ? err.message : 'That boundary could not be read',
    }
  }
}

/** Human name for a detected format, for the confirmation line under the box. */
export const FORMAT_NAMES: Record<string, string> = {
  wkt: 'WKT polygon',
  geojson: 'GeoJSON',
  coordinates: 'corner coordinates',
}
