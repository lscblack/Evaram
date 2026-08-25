import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, Bus, Church, Compass, Factory, Fuel, GraduationCap, Hospital,
  Landmark, Loader2, MapPin, Navigation, Route as RouteIcon, ShoppingBasket,
  Trees, Waves, Zap,
} from 'lucide-react'
import { ParcelMap, type ParcelMapHandle } from './ParcelMap'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { bearing, compassPoint, formatDistance } from '@/lib/geoMeasure'
import { currentPosition, formatDuration, routeBetween, type Route } from '@/lib/routing'
import { streetViewUrl } from '@/lib/mapStyles'
import type { NearbyFacility, ParcelContext as Context } from '@/types/api'
import type { FeatureCollection } from 'geojson'

const ICONS: Record<string, typeof MapPin> = {
  school: GraduationCap, university: GraduationCap,
  hospital: Hospital, clinic: Hospital, pharmacy: Hospital,
  market: ShoppingBasket, shop: ShoppingBasket, bank: Landmark,
  bus_station: Bus, taxi_stand: Bus, fuel: Fuel,
  place_of_worship: Church, forest: Trees, park: Trees,
  wetland: Waves, river: Waves, lake: Waves,
  industrial: Factory, quarry: Factory, landfill: Factory,
  power_line: Zap,
}

const LABELS: Record<string, string> = {
  place_of_worship: 'Place of worship', bus_station: 'Public transport',
  fuel: 'Filling station', power_line: 'Power line', taxi_stand: 'Taxi stand',
  post_office: 'Post office', fire_station: 'Fire station',
}

const label = (kind: string) =>
  LABELS[kind] ?? kind.charAt(0).toUpperCase() + kind.slice(1).replace(/_/g, ' ')

/**
 * Where a parcel is, what is around it, and what is odd about its boundary.
 *
 * The three questions a buyer asks standing on a plot, answered with measured
 * distances rather than an agent's description. Distances come from
 * OpenStreetMap and are computed from the parcel boundary, not from a pin.
 */
export function ParcelContext({ slug, title }: { slug: string; title: string }) {
  const mapRef = useRef<ParcelMapHandle>(null)
  const [context, setContext] = useState<Context | null>(null)
  const [loading, setLoading] = useState(true)
  const [route, setRoute] = useState<Route | null>(null)
  const [routing, setRouting] = useState(false)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [measuring, setMeasuring] = useState(false)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get<Context>(`/public/map/context/${slug}`)
      .then((data) => !cancelled && setContext(data))
      .catch(() => !cancelled && setContext(null))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [slug])

  const parcels = useMemo(() => {
    if (!context || context.location_withheld || context.latitude == null) return []
    return [
      {
        type: 'Feature' as const,
        geometry:
          context.boundary.geometry ??
          { type: 'Point', coordinates: [context.longitude, context.latitude] },
        properties: {
          id: slug, slug, reference_number: '', title,
          district: null, price: null, currency: 'RWF', size: null,
          cover_url: null, has_outline: Boolean(context.boundary.geometry),
          issue_count: context.boundary.issues.length,
          is_verified: true, allow_directions: Boolean(context.allow_directions),
          latitude: context.latitude, longitude: context.longitude!,
        },
      },
    ]
  }, [context, slug, title])

  const facilityLayer = useMemo<FeatureCollection | null>(() => {
    if (!context?.facilities.length) return null
    return {
      type: 'FeatureCollection',
      features: context.facilities.map((f) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [f.longitude, f.latitude] },
        properties: { name: f.name, kind: f.kind, is_constraint: f.is_constraint },
      })),
    }
  }, [context])

  useEffect(() => {
    if (parcels.length) mapRef.current?.fitTo()
  }, [parcels])

  const getDirections = async () => {
    if (!context?.latitude || !context.longitude) return
    setRouting(true)
    setRouteError(null)
    try {
      const from = await currentPosition()
      if (!from) {
        setRouteError('We could not read your location. Allow location access and try again.')
        return
      }
      const found = await routeBetween(from, [context.longitude, context.latitude])
      if (!found) {
        setRouteError('No driving route could be worked out to this plot.')
        return
      }
      setRoute(found)
    } catch {
      setRouteError('The routing service did not answer. Try again shortly.')
    } finally {
      setRouting(false)
    }
  }

  if (loading) {
    return (
      <div className="grid h-64 place-items-center rounded-3xl border border-line bg-surface">
        <Loader2 className="size-5 animate-spin text-ink-faint" strokeWidth={2.2} />
      </div>
    )
  }

  if (!context) return null

  if (context.location_withheld) {
    return (
      <div className="rounded-3xl border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Location</h2>
        <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-muted">
          The owner has asked us not to publish this parcel's exact position. We will walk you
          through it on a viewing — ask your consultant to arrange one.
        </p>
      </div>
    )
  }

  const errors = context.boundary.issues.filter((i) => i.severity === 'error')
  const warnings = context.boundary.issues.filter((i) => i.severity !== 'error')
  const shown = showAll ? context.facilities : context.facilities.slice(0, 10)
  const origin: [number, number] = [context.longitude!, context.latitude!]

  return (
    <section className="overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-navy-950 px-6 py-5 text-white sm:px-8">
        <div className="flex items-center gap-3">
          <Compass className="size-5 text-gold-400" strokeWidth={2.2} />
          <h2 className="font-display text-lg font-semibold">The plot and what surrounds it</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMeasuring((v) => !v)}
            aria-pressed={measuring}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[0.75rem] font-semibold transition-colors',
              measuring
                ? 'border-gold-400 bg-gold-400 text-navy-950'
                : 'border-white/25 text-white/85 hover:border-white/50',
            )}
          >
            {measuring ? 'Measuring' : 'Measure'}
          </button>
          <a
            href={streetViewUrl(context.latitude!, context.longitude!)}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/25 px-3 py-1.5 text-[0.75rem] font-semibold text-white/85 transition-colors hover:border-white/50"
          >
            Street view
          </a>
        </div>
      </div>

      {/* ---------------------------------------------------------- map */}
      <div className="h-[22rem] w-full sm:h-[26rem]">
        <ParcelMap
          ref={mapRef}
          parcels={parcels as never}
          facilities={facilityLayer}
          activeId={slug}
          route={route?.geometry ?? null}
          measuring={measuring}
        />
      </div>

      {/* ------------------------------------------------------ warnings */}
      {(errors.length > 0 || warnings.length > 0 || context.overlaps.length > 0) && (
        <div className="space-y-2 border-b border-line px-6 py-5 sm:px-8">
          <h3 className="text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">
            About this boundary
          </h3>
          {context.overlaps.map((other) => (
            <p
              key={other.id}
              className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/8 px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-red-800"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" strokeWidth={2.4} />
              <span>
                This outline overlaps {other.reference_number} by{' '}
                {other.overlap_sqm.toLocaleString('en-RW')} sqm. We are checking both against the
                register — ask us before committing to either.
              </span>
            </p>
          ))}
          {[...errors, ...warnings].map((issue) => (
            <p
              key={issue.code}
              className={cn(
                'flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-[0.8125rem] leading-relaxed',
                issue.severity === 'error'
                  ? 'border-red-500/30 bg-red-500/8 text-red-800'
                  : 'border-amber-500/30 bg-amber-500/8 text-amber-800',
              )}
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" strokeWidth={2.4} />
              <span>{issue.message}</span>
            </p>
          ))}
          {context.boundary.area_sqm && (
            <p className="pt-1 text-[0.75rem] text-ink-muted">
              The outline above measures{' '}
              <strong className="font-semibold text-ink">
                {Math.round(context.boundary.area_sqm).toLocaleString('en-RW')} sqm
              </strong>
              , measured from the corner coordinates on the survey.
            </p>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- facilities */}
      <div className="px-6 py-6 sm:px-8">
        <h3 className="text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">
          Measured distances
        </h3>
        {shown.length === 0 ? (
          <p className="mt-3 text-[0.875rem] text-ink-muted">
            We have not mapped the infrastructure around this plot yet.
          </p>
        ) : (
          <>
            <ul className="mt-3 grid gap-x-8 gap-y-1 sm:grid-cols-2">
              {shown.map((facility) => (
                <FacilityRow key={facility.id} facility={facility} origin={origin} />
              ))}
            </ul>
            {context.facilities.length > 10 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="mt-3 text-[0.8125rem] font-semibold text-gold-600 hover:underline"
              >
                {showAll ? 'Show less' : `Show all ${context.facilities.length}`}
              </button>
            )}
          </>
        )}

        {/* ------------------------------------------------------ route */}
        <div className="mt-6 border-t border-line pt-5">
          {context.allow_directions ? (
            <>
              <button
                type="button"
                onClick={getDirections}
                disabled={routing}
                className="inline-flex items-center gap-2 rounded-full bg-gold-500 px-4 py-2.5 text-[0.8125rem] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {routing ? (
                  <Loader2 className="size-4 animate-spin" strokeWidth={2.4} />
                ) : (
                  <Navigation className="size-4" strokeWidth={2.2} />
                )}
                {route ? 'Recalculate the route' : 'Show me the way from where I am'}
              </button>
              {routeError && <p className="mt-2 text-[0.8125rem] text-red-600">{routeError}</p>}

              {route && (
                <div className="mt-4">
                  <p className="flex flex-wrap items-center gap-x-3 text-[0.875rem] font-semibold text-ink">
                    <RouteIcon className="size-4 text-gold-600" strokeWidth={2.2} />
                    {formatDistance(route.distance_m)} · about {formatDuration(route.duration_s)} by
                    car
                  </p>
                  <ol className="mt-3 space-y-1.5">
                    {route.steps.map((step, index) => (
                      <li
                        key={`${index}-${step.text}`}
                        className="flex gap-3 text-[0.8125rem] text-ink-soft"
                      >
                        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-canvas-alt text-[0.625rem] font-bold text-ink-muted">
                          {index + 1}
                        </span>
                        <span className="flex-1">{step.text}</span>
                        <span className="shrink-0 tabular-nums text-ink-faint">
                          {formatDistance(step.distance_m)}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-3 text-[0.6875rem] leading-relaxed text-ink-muted">
                    Routing is indicative and follows mapped roads. The last stretch to a rural plot
                    is often a track that no map records — your consultant will meet you.
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-[0.8125rem] leading-relaxed text-ink-muted">
              Directions to this plot are not published. Vacant land is not somewhere we send
              strangers unaccompanied, and the owner has not opted in — book a viewing and we will
              take you there.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function FacilityRow({
  facility,
  origin,
}: {
  facility: NearbyFacility
  origin: [number, number]
}) {
  const Icon = ICONS[facility.kind] ?? MapPin
  const way = compassPoint(bearing(origin, [facility.longitude, facility.latitude]))

  return (
    <li className="flex items-center gap-3 border-b border-line/60 py-2 last:border-0">
      <Icon
        className={cn('size-4 shrink-0', facility.is_constraint ? 'text-red-600' : 'text-emerald-700')}
        strokeWidth={2.1}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.875rem] font-medium text-ink">
          {facility.name || label(facility.kind)}
        </span>
        <span className="block text-[0.6875rem] text-ink-muted">
          {label(facility.kind)} · {way}
          {facility.is_constraint && ' · check before building'}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-[0.8125rem] font-semibold text-ink tabular-nums">
          {formatDistance(facility.distance_m)}
        </span>
        {facility.walk_minutes && (
          <span className="block text-[0.6875rem] text-ink-faint">
            {facility.walk_minutes} min walk
          </span>
        )}
      </span>
    </li>
  )
}
