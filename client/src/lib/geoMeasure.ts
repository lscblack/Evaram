/**
 * Measuring on the map: distances a buyer can check for themselves.
 *
 * The map draws in degrees; people think in metres. Everything here converts
 * between the two using the same WGS84 series the server uses, so a distance
 * measured in the browser and a distance measured by PostGIS agree.
 */

const R = 6_371_008.8 // mean Earth radius, metres

/** Great-circle distance between two `[lng, lat]` points, in metres. */
export function haversine(a: [number, number], b: [number, number]): number {
  const [lng1, lat1] = a
  const [lng2, lat2] = b
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const dφ = ((lat2 - lat1) * Math.PI) / 180
  const dλ = ((lng2 - lng1) * Math.PI) / 180
  const h =
    Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Total length of a path of `[lng, lat]` points, in metres. */
export function pathLength(points: [number, number][]): number {
  let total = 0
  for (let i = 1; i < points.length; i += 1) total += haversine(points[i - 1], points[i])
  return total
}

/** `432` → `432 m`, `1840` → `1.84 km`. */
export function formatDistance(metres: number): string {
  if (metres < 1_000) return `${Math.round(metres)} m`
  return `${(metres / 1_000).toFixed(metres < 10_000 ? 2 : 1)} km`
}

/** `812` → `812 sqm`, `42000` → `4.2 ha`. Matches the rest of the site. */
export function formatAreaShort(sqm: number): string {
  if (sqm >= 10_000) return `${(sqm / 10_000).toFixed(2)} ha`
  return `${Math.round(sqm).toLocaleString('en-RW')} sqm`
}

/**
 * Area of a closed ring of `[lng, lat]` points, in square metres.
 *
 * The shoelace formula on a locally flat projection — the same approach the
 * server takes, and accurate well past the size of any single parcel.
 */
export function ringArea(points: [number, number][]): number {
  if (points.length < 3) return 0
  const lat0 = points.reduce((sum, p) => sum + p[1], 0) / points.length
  const phi = (lat0 * Math.PI) / 180
  const latM = 111_132.92 - 559.82 * Math.cos(2 * phi) + 1.175 * Math.cos(4 * phi)
  const lngM = 111_412.84 * Math.cos(phi) - 93.5 * Math.cos(3 * phi)

  const flat = points.map(([lng, lat]) => [lng * lngM, lat * latM] as const)
  let twice = 0
  for (let i = 0; i < flat.length; i += 1) {
    const [x1, y1] = flat[i]
    const [x2, y2] = flat[(i + 1) % flat.length]
    twice += x1 * y2 - x2 * y1
  }
  return Math.abs(twice / 2)
}

/** Bearing from one point to another, in degrees from north. */
export function bearing(a: [number, number], b: [number, number]): number {
  const φ1 = (a[1] * Math.PI) / 180
  const φ2 = (b[1] * Math.PI) / 180
  const dλ = ((b[0] - a[0]) * Math.PI) / 180
  const y = Math.sin(dλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ)
  return (Math.atan2(y, x) * 180) / Math.PI
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

/** `47` → `NE`. Which way a facility lies from the plot. */
export function compassPoint(degrees: number): string {
  const index = Math.round(((degrees % 360) + 360) % 360 / 45) % 8
  return COMPASS[index]
}
