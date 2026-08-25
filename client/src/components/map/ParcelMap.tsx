import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  FullscreenControl,
  GeolocateControl,
  LngLatBounds,
  MapLibreMap,
  NavigationControl,
  ScaleControl,
  type GeoJSONSource,
  type LngLatBoundsLike,
  type MapGeoJSONFeature,
  type MapMouseEvent,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Feature, FeatureCollection } from 'geojson'
import type { ParcelProperties } from '@/types/api'
import { BASEMAPS, DEFAULT_BASEMAP, RWANDA_CENTRE } from '@/lib/mapStyles'
import { usePriceMarkers } from './PriceMarkers'
import { Map } from 'lucide-react'
import { formatDistance, pathLength } from '@/lib/geoMeasure'
import { cn } from '@/lib/utils'

/** One parcel as the map draws it — the shape the API's GeoJSON returns. */
export interface ParcelFeature {
  type: 'Feature'
  geometry: { type: 'Polygon' | 'Point'; coordinates: number[][][] | number[] }
  properties: ParcelProperties
}

export interface ParcelMapHandle {
  /** Frame these parcels, or everything if no ids are given. */
  fitTo: (ids?: string[]) => void
  flyTo: (lng: number, lat: number, zoom?: number) => void
  getBboxString: () => string | null
}

interface Props {
  parcels: ParcelFeature[]
  facilities?: FeatureCollection | null
  /** Highlighted parcel — drawn in the accent colour and brought forward. */
  activeId?: string | null
  /** Parcels in the comparison tray, outlined so they stand out from the rest. */
  selectedIds?: string[]
  onSelect?: (parcel: ParcelFeature | null) => void
  onMapClick?: (lng: number, lat: number) => void
  onViewportChange?: (bbox: string) => void
  /** Comparable sales nearby — what the ground actually fetched. */
  sold?: FeatureCollection | null
  /** Sector-level market activity, drawn as a heat layer. */
  activity?: FeatureCollection | null
  /** Turn-by-turn line, when a listing allows directions. */
  route?: Feature | null
  measuring?: boolean
  className?: string
}

const PARCELS = 'parcels'
const FACILITIES = 'facilities'
const MEASURE = 'measure'
const ROUTE = 'route'
const SOLD = 'sold'
const ACTIVITY = 'activity'

/** Price shown on the polygon itself, short enough to fit. */
function priceLabel(price: number | null, currency: string): string {
  if (price == null) return ''
  if (price >= 1_000_000_000) return `${currency} ${(price / 1_000_000_000).toFixed(1)}B`
  if (price >= 1_000_000) return `${currency} ${Math.round(price / 1_000_000)}M`
  if (price >= 1_000) return `${currency} ${Math.round(price / 1_000)}K`
  return `${currency} ${price}`
}

/**
 * The parcel map.
 *
 * Outlines rather than pins: a plot's shape and size are most of what a buyer
 * is judging, and a pin hides both. Points are only used for listings that have
 * no surveyed boundary, and they are drawn differently so the difference is
 * visible rather than implied.
 */
export const ParcelMap = forwardRef<ParcelMapHandle, Props>(function ParcelMap(
  {
    parcels,
    facilities,
    sold,
    activity,
    activeId,
    selectedIds = [],
    onSelect,
    onMapClick,
    onViewportChange,
    route,
    measuring = false,
    className,
  },
  ref,
) {
  const holder = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  // A counter, not a boolean: swapping the basemap has to re-apply every
  // source, and `setReady(false)` followed by `setReady(true)` in the same tick
  // batches into no change at all — the effects would never re-run and the
  // parcels would quietly disappear behind the new imagery.
  const [ready, setReady] = useState(0)
  // MapLibre applies its own initial camera some time after `load`, so a fit
  // requested before then is silently overwritten. `idle` is the first moment
  // the camera is genuinely settled, and is what queued fits wait for.
  const settled = useRef(false)
  const pending = useRef<(() => void) | null>(null)
  const [basemap, setBasemap] = useState(DEFAULT_BASEMAP.id)
  const [measurePath, setMeasurePath] = useState<[number, number][]>([])
  const [layersOpen, setLayersOpen] = useState(false)

  // Callbacks live in a ref so re-rendering the parent does not tear down and
  // rebuild every map handler — MapLibre listeners are not cheap to churn.
  const handlers = useRef({ onSelect, onMapClick, onViewportChange })
  handlers.current = { onSelect, onMapClick, onViewportChange }
  const measuringRef = useRef(measuring)
  measuringRef.current = measuring

  /* ------------------------------------------------------------ create */
  useEffect(() => {
    if (!holder.current || map.current) return

    const instance = new MapLibreMap({
      container: holder.current,
      style: DEFAULT_BASEMAP.build(),
      center: RWANDA_CENTRE,
      zoom: 11,
      attributionControl: { compact: true },
    })
    map.current = instance

    // Zoom, locate and fullscreen live bottom-right. The top edge belongs to
    // the app's own controls, and stacking both there buried one under the
    // other at every viewport width.
    instance.addControl(new NavigationControl({ visualizePitch: true }), 'bottom-right')
    instance.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left')
    instance.addControl(
      new GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserLocation: true,
      }),
      'bottom-right',
    )
    instance.addControl(new FullscreenControl(), 'bottom-right')

    const publishViewport = () => {
      const b = instance.getBounds()
      handlers.current.onViewportChange?.(
        `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`,
      )
    }

    instance.on('load', () => {
      addLayers(instance)
      setReady((n) => n + 1)
      // The first viewport has to be announced explicitly: `moveend` only fires
      // once something moves, so a map nobody pans would never ask for parcels.
      publishViewport()
    })

    instance.once('idle', () => {
      settled.current = true
      const queued = pending.current
      pending.current = null
      queued?.()
    })

    instance.on('moveend', publishViewport)

    return () => {
      instance.remove()
      map.current = null
      // `pending` deliberately survives: it is a request from the parent, not
      // a resource of this instance, and the next map to settle will honour it.
      settled.current = false
    }
  }, [])

  /* ------------------------------------------------------- basemap swap */
  const changeBasemap = useCallback((id: string) => {
    const instance = map.current
    const chosen = BASEMAPS.find((b) => b.id === id)
    if (!instance || !chosen) return
    setBasemap(id)
    // Swapping the style drops every layer we added, so they are rebuilt on the
    // next `styledata` — the data itself is re-applied by the effects below.
    instance.setStyle(chosen.build())
    instance.once('styledata', () => {
      addLayers(instance)
      setReady((n) => n + 1)
    })
  }, [])

  /* --------------------------------------------------------- parcel data */
  useEffect(() => {
    const instance = map.current
    if (!instance || !ready) return
    const source = instance.getSource(PARCELS) as GeoJSONSource | undefined
    source?.setData({ type: 'FeatureCollection', features: parcels as never })
  }, [parcels, ready])

  useEffect(() => {
    const instance = map.current
    if (!instance || !ready) return
    const source = instance.getSource(FACILITIES) as GeoJSONSource | undefined
    source?.setData(facilities ?? { type: 'FeatureCollection', features: [] })
  }, [facilities, ready])

  useEffect(() => {
    const instance = map.current
    if (!instance || !ready) return
    const source = instance.getSource(SOLD) as GeoJSONSource | undefined
    source?.setData(sold ?? { type: 'FeatureCollection', features: [] })
  }, [sold, ready])

  useEffect(() => {
    const instance = map.current
    if (!instance || !ready) return
    const source = instance.getSource(ACTIVITY) as GeoJSONSource | undefined
    source?.setData(activity ?? { type: 'FeatureCollection', features: [] })
  }, [activity, ready])

  useEffect(() => {
    const instance = map.current
    if (!instance || !ready) return
    const source = instance.getSource(ROUTE) as GeoJSONSource | undefined
    source?.setData(
      route ? { type: 'FeatureCollection', features: [route] } : { type: 'FeatureCollection', features: [] },
    )
  }, [route, ready])

  /* -------------------------------------------------- active / selected */
  useEffect(() => {
    const instance = map.current
    if (!instance || !ready) return
    // Feature state would need per-feature ids maintained across every update;
    // a filter expression is cheaper and survives source replacement.
    instance.setFilter('parcel-active', ['==', ['get', 'id'], activeId ?? '__none__'])
    instance.setFilter('parcel-selected', [
      'in',
      ['get', 'id'],
      ['literal', selectedIds.length ? selectedIds : ['__none__']],
    ])
  }, [activeId, selectedIds, ready])

  /* ---------------------------------------------------------- measuring */
  useEffect(() => {
    const instance = map.current
    if (!instance || !ready) return
    const source = instance.getSource(MEASURE) as GeoJSONSource | undefined
    const features: Feature[] = measurePath.map((point, index) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: point },
      properties: { index: index + 1 },
    }))
    if (measurePath.length > 1) {
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: measurePath },
        properties: {},
      })
    }
    source?.setData({ type: 'FeatureCollection', features })
  }, [measurePath, ready])

  useEffect(() => {
    if (!measuring) setMeasurePath([])
  }, [measuring])

  /* -------------------------------------------------------- interaction */
  useEffect(() => {
    const instance = map.current
    if (!instance || !ready) return

    const click = (event: MapMouseEvent) => {
      const point: [number, number] = [event.lngLat.lng, event.lngLat.lat]

      if (measuringRef.current) {
        setMeasurePath((prev) => [...prev, point])
        return
      }

      const hits = instance.queryRenderedFeatures(event.point, {
        layers: ['parcel-fill', 'parcel-point'],
      }) as MapGeoJSONFeature[]

      if (hits.length) {
        const id = hits[0].properties?.id
        const found = parcels.find((p) => p.properties.id === id)
        handlers.current.onSelect?.(found ?? null)
        return
      }

      handlers.current.onSelect?.(null)
      handlers.current.onMapClick?.(point[0], point[1])
    }

    const enter = () => { instance.getCanvas().style.cursor = 'pointer' }
    const leave = () => { instance.getCanvas().style.cursor = measuringRef.current ? 'crosshair' : '' }

    instance.on('click', click)
    instance.on('mouseenter', 'parcel-fill', enter)
    instance.on('mouseleave', 'parcel-fill', leave)
    instance.on('mouseenter', 'parcel-point', enter)
    instance.on('mouseleave', 'parcel-point', leave)

    return () => {
      instance.off('click', click)
      instance.off('mouseenter', 'parcel-fill', enter)
      instance.off('mouseleave', 'parcel-fill', leave)
      instance.off('mouseenter', 'parcel-point', enter)
      instance.off('mouseleave', 'parcel-point', leave)
    }
  }, [parcels, ready])

  useEffect(() => {
    const instance = map.current
    if (!instance) return
    instance.getCanvas().style.cursor = measuring ? 'crosshair' : ''
  }, [measuring])

  /* -------------------------------------------------------------- handle */
  useImperativeHandle(ref, () => ({
    fitTo(ids) {
      const wanted = ids?.length
        ? parcels.filter((p) => ids.includes(p.properties.id))
        : parcels
      if (!wanted.length) return

      // Resolves the map when it runs, not when it is queued: in development
      // React mounts, unmounts and remounts, so a fit captured against the
      // first instance would be applied to a map that no longer exists.
      const run = () => {
        const instance = map.current
        if (!instance) return
        const bounds = new LngLatBounds()
        for (const parcel of wanted) {
          // Fit the whole outline where there is one — framing a parcel by its
          // centre point alone tells you nothing about how big it is.
          const ring = (parcel.geometry as unknown as { type: string; coordinates: number[][][] })
          if (ring?.type === 'Polygon') {
            for (const [lng, lat] of ring.coordinates[0]) bounds.extend([lng, lat])
          } else {
            bounds.extend([parcel.properties.longitude, parcel.properties.latitude])
          }
        }
        instance.fitBounds(bounds as LngLatBoundsLike, {
          padding: { top: 70, bottom: 70, left: 70, right: 70 },
          // A single point has no extent to fit, so cap the zoom or the map
          // slams to street level and loses all context.
          maxZoom: wanted.length === 1 ? 17 : 15,
          duration: 700,
        })
      }

      // Queued until the map is settled. A fit requested any earlier is
      // discarded when MapLibre applies its own initial camera, with nothing to
      // show for it — the map simply stays where it started.
      if (settled.current) run()
      else pending.current = run
    },
    flyTo(lng, lat, zoom = 16) {
      map.current?.flyTo({ center: [lng, lat], zoom, duration: 800 })
    },
    getBboxString() {
      const instance = map.current
      if (!instance) return null
      const b = instance.getBounds()
      return `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`
    },
  }))

  // Price pills are DOM markers rather than a text layer: on satellite imagery
  // haloed text is unreadable, and a pill needs a hit area bigger than its
  // glyphs to be tappable on a phone.
  usePriceMarkers({
    map: map.current,
    ready,
    parcels,
    activeId,
    selectedIds,
    onSelect: (p) => handlers.current.onSelect?.(parcels.find((f) => f.properties.id === p.id) ?? null),
    visible: !measuring,
  })

  const measured = measurePath.length > 1 ? pathLength(measurePath) : 0

  return (
    <div className={cn('relative isolate h-full w-full overflow-hidden', className)}>
      <div ref={holder} className="h-full w-full" />

      {/* basemap switcher */}
      {/* Collapsed to a single button. Four always-visible options need a
          corner of their own, and every corner is already spoken for — by the
          toolbar, the results rail, the parcel card and MapLibre's own zoom. */}
      <div className="absolute top-3 right-3 z-20">
        <button
          type="button"
          onClick={() => setLayersOpen((v) => !v)}
          aria-expanded={layersOpen}
          aria-label="Change the base map"
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/95 px-3 py-2 text-[0.75rem] font-semibold text-ink-soft shadow-soft backdrop-blur transition-colors hover:text-ink"
        >
          <Map className="size-3.5" strokeWidth={2.2} />
          {BASEMAPS.find((b) => b.id === basemap)?.label ?? 'Map'}
        </button>

        {layersOpen && (
          <div className="absolute right-0 mt-1.5 w-44 overflow-hidden rounded-2xl border border-line bg-surface shadow-lift">
            {BASEMAPS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  changeBasemap(option.id)
                  setLayersOpen(false)
                }}
                aria-pressed={basemap === option.id}
                className={cn(
                  'block w-full px-3 py-2 text-left transition-colors',
                  basemap === option.id ? 'bg-canvas-alt' : 'hover:bg-canvas-alt',
                )}
              >
                <span className="block text-[0.8125rem] font-semibold text-ink">
                  {option.label}
                </span>
                <span className="block text-[0.6875rem] leading-tight text-ink-muted">
                  {option.hint}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {measuring && (
        <div className="absolute bottom-16 left-1/2 z-10 -translate-x-1/2 rounded-2xl border border-line bg-surface/95 px-4 py-2.5 text-center shadow-lift backdrop-blur">
          <p className="text-[0.8125rem] font-semibold text-ink">
            {measurePath.length < 2
              ? 'Click along the ground to measure'
              : formatDistance(measured)}
          </p>
          <p className="mt-0.5 text-[0.6875rem] text-ink-muted">
            {measurePath.length} point{measurePath.length === 1 ? '' : 's'} · click to add
            {measurePath.length > 0 && (
              <>
                {' · '}
                <button
                  type="button"
                  onClick={() => setMeasurePath([])}
                  className="font-semibold text-gold-600 underline underline-offset-2"
                >
                  clear
                </button>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  )
})

/**
 * Every layer the map draws, in paint order.
 *
 * Kept in one function because a style swap wipes them all and they have to be
 * rebuilt identically — two places to edit would drift.
 */
function addLayers(instance: MapLibreMap) {
  const empty: FeatureCollection = { type: 'FeatureCollection', features: [] }

  for (const id of [PARCELS, FACILITIES, MEASURE, ROUTE, SOLD, ACTIVITY]) {
    if (!instance.getSource(id)) instance.addSource(id, { type: 'geojson', data: empty })
  }

  if (instance.getLayer('parcel-fill')) return

  // --- the route, under everything so parcels stay clickable
  instance.addLayer({
    id: 'route-line',
    type: 'line',
    source: ROUTE,
    paint: {
      'line-color': '#2563eb',
      'line-width': ['interpolate', ['linear'], ['zoom'], 10, 3, 16, 7],
      'line-opacity': 0.85,
    },
    layout: { 'line-cap': 'round', 'line-join': 'round' },
  })

  // --- parcels
  instance.addLayer({
    id: 'parcel-fill',
    type: 'fill',
    source: PARCELS,
    filter: ['==', ['geometry-type'], 'Polygon'],
    paint: {
      // A parcel with boundary problems is tinted amber rather than hidden —
      // the buyer should see it and the warning together.
      'fill-color': [
        'case',
        ['>', ['get', 'issue_count'], 0], '#f59e0b',
        '#c98a2b',
      ],
      'fill-opacity': 0.28,
    },
  })

  instance.addLayer({
    id: 'parcel-line',
    type: 'line',
    source: PARCELS,
    filter: ['==', ['geometry-type'], 'Polygon'],
    paint: {
      'line-color': ['case', ['>', ['get', 'issue_count'], 0], '#b45309', '#8a5a12'],
      'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1, 18, 2.5],
    },
  })

  instance.addLayer({
    id: 'parcel-selected',
    type: 'line',
    source: PARCELS,
    filter: ['in', ['get', 'id'], ['literal', ['__none__']]],
    paint: { 'line-color': '#0f172a', 'line-width': 3, 'line-dasharray': [2, 1.5] },
  })

  instance.addLayer({
    id: 'parcel-active',
    type: 'line',
    source: PARCELS,
    filter: ['==', ['get', 'id'], '__none__'],
    paint: { 'line-color': '#c98a2b', 'line-width': 4 },
  })

  // --- listings with no surveyed outline, drawn as points so the difference
  //     between "here is the parcel" and "somewhere about here" is visible
  instance.addLayer({
    id: 'parcel-point',
    type: 'circle',
    source: PARCELS,
    filter: ['==', ['geometry-type'], 'Point'],
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 5, 16, 9],
      'circle-color': '#c98a2b',
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
      'circle-opacity': 0.9,
    },
  })

  // --- sector activity, a heat layer under everything: where the market is
  //     actually moving, rather than where one parcel happens to be
  instance.addLayer({
    id: 'activity-heat',
    type: 'circle',
    source: ACTIVITY,
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        8, ['interpolate', ['linear'], ['get', 'listings'], 1, 14, 20, 40],
        14, ['interpolate', ['linear'], ['get', 'listings'], 1, 40, 20, 110],
      ],
      'circle-color': '#c98a2b',
      'circle-opacity': 0.16,
      'circle-blur': 0.7,
    },
  }, 'parcel-fill')

  // --- comparable sales
  instance.addLayer({
    id: 'sold-dot',
    type: 'circle',
    source: SOLD,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 4, 17, 8],
      'circle-color': '#7c3aed',
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1.5,
    },
  })

  instance.addLayer({
    id: 'sold-price',
    type: 'symbol',
    source: SOLD,
    minzoom: 12,
    layout: {
      'text-field': ['get', 'sold_label'],
      'text-font': ['Noto Sans Bold'],
      'text-size': 11,
      'text-offset': [0, 1.1],
      'text-anchor': 'top',
      'text-optional': true,
    },
    paint: {
      'text-color': '#5b21b6',
      'text-halo-color': '#ffffff',
      'text-halo-width': 1.8,
    },
  })

  // --- infrastructure
  instance.addLayer({
    id: 'facility-dot',
    type: 'circle',
    source: FACILITIES,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 3, 17, 6],
      // Constraints read as a warning, conveniences as a positive.
      'circle-color': ['case', ['get', 'is_constraint'], '#dc2626', '#0f766e'],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1.2,
      'circle-opacity': 0.85,
    },
  })

  instance.addLayer({
    id: 'facility-label',
    type: 'symbol',
    source: FACILITIES,
    minzoom: 15,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Noto Sans Regular'],
      'text-size': 10,
      'text-offset': [0, 1],
      'text-anchor': 'top',
      'text-optional': true,
    },
    paint: {
      'text-color': '#334155',
      'text-halo-color': '#ffffff',
      'text-halo-width': 1.4,
    },
  })

  // --- measuring, on top of everything
  instance.addLayer({
    id: 'measure-line',
    type: 'line',
    source: MEASURE,
    filter: ['==', ['geometry-type'], 'LineString'],
    paint: { 'line-color': '#0f172a', 'line-width': 2, 'line-dasharray': [2, 1] },
  })
  instance.addLayer({
    id: 'measure-point',
    type: 'circle',
    source: MEASURE,
    filter: ['==', ['geometry-type'], 'Point'],
    paint: {
      'circle-radius': 5,
      'circle-color': '#0f172a',
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    },
  })
}

export { priceLabel }
