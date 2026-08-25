import type { Feature } from 'geojson'

/**
 * Driving directions between two points.
 *
 * OSRM's public demo server: no key, no account, and it answers in the shape
 * MapLibre wants. It is rate-limited and offers no uptime promise, so a failure
 * here is treated as "no route available" rather than as an error worth
 * interrupting the page for. Point `VITE_ROUTING_URL` at a self-hosted OSRM to
 * make it dependable.
 */
const ROUTER =
  (import.meta.env.VITE_ROUTING_URL as string | undefined) ??
  'https://router.project-osrm.org/route/v1'

export interface Route {
  geometry: Feature
  distance_m: number
  duration_s: number
  steps: { text: string; distance_m: number }[]
}

export async function routeBetween(
  from: [number, number],
  to: [number, number],
  profile: 'driving' | 'walking' = 'driving',
): Promise<Route | null> {
  const url =
    `${ROUTER}/${profile}/${from[0]},${from[1]};${to[0]},${to[1]}` +
    `?overview=full&geometries=geojson&steps=true`

  const response = await fetch(url)
  if (!response.ok) return null

  const data = await response.json()
  const route = data.routes?.[0]
  if (!route) return null

  const legs: OsrmStep[] = route.legs?.[0]?.steps ?? []
  return {
    geometry: { type: 'Feature', geometry: route.geometry, properties: {} },
    distance_m: route.distance,
    duration_s: route.duration,
    steps: legs
      .map((step) => ({ text: describeStep(step), distance_m: step.distance ?? 0 }))
      // OSRM emits a zero-length "arrive" step; it says nothing a person needs.
      .filter((s, i, all) => s.distance_m > 0 || i === all.length - 1),
  }
}

interface OsrmStep {
  distance?: number
  name?: string
  maneuver?: { type?: string; modifier?: string }
}

/** OSRM gives structured manoeuvres, not sentences. This makes one. */
function describeStep(step: OsrmStep): string {
  const name = step.name?.trim()
  const type = step.maneuver?.type ?? 'continue'
  const modifier = step.maneuver?.modifier

  if (type === 'depart') return name ? `Head out along ${name}` : 'Set off'
  if (type === 'arrive') return 'Arrive at the plot'
  if (type === 'roundabout' || type === 'rotary') {
    return name ? `At the roundabout, take ${name}` : 'Go round the roundabout'
  }

  const turn = modifier ? `Turn ${modifier.replace('slight ', 'slightly ')}` : 'Continue'
  return name ? `${turn} onto ${name}` : turn
}

/** `1847` → `31 min`. */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  return `${hours} h ${minutes % 60} min`
}

/** The browser's location, or null if the visitor declines. */
export function currentPosition(): Promise<[number, number] | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  })
}
