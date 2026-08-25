import { useEffect, useMemo, useRef, useState } from 'react'
import { FullscreenControl, LngLatBounds, MapLibreMap, NavigationControl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Map as MapIcon, MapPinOff } from 'lucide-react'
import { BASEMAPS, DEFAULT_BASEMAP } from '@/lib/mapStyles'
import { formatAreaShort } from '@/lib/geoMeasure'
import { cn } from '@/lib/utils'

const SOURCE = 'draft-parcel'

/**
 * The parcel being entered, drawn on real ground.
 *
 * A list of coordinates and an abstract outline both look correct right up
 * until the parcel turns out to be in the wrong sector — or on a runway. This
 * is the only check that catches a transposed pair or a mistyped digit, so it
 * defaults to imagery: what is actually there is the point.
 */
export function BoundaryPreviewMap({
  points,
  latitude,
  longitude,
  areaSqm,
  className,
}: {
  /** `[[lat, lng], …]`, as the rest of the console stores them. */
  points: number[][]
  /** The typed pin, drawn alongside so a mismatch with the outline is visible. */
  latitude?: number | null
  longitude?: number | null
  areaSqm?: number | null
  className?: string
}) {
  const holder = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const settled = useRef(false)
  const pending = useRef<(() => void) | null>(null)
  const [basemap, setBasemap] = useState(DEFAULT_BASEMAP.id)
  const [ready, setReady] = useState(0)

  const data = useMemo(() => {
    const features: GeoJSON.Feature[] = []
    if (points.length >= 3) {
      const ring = points.map(([lat, lng]) => [lng, lat])
      ring.push(ring[0])
      features.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [ring] },
        properties: { kind: 'parcel' },
      })
      // Corners are emitted as their own points. A circle layer over a polygon
      // draws a single dot at its centre, not one per vertex — which is the
      // opposite of what is useful when hunting a mistyped coordinate.
      points.forEach(([lat, lng], index) => {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: { kind: 'corner', index: index + 1 },
        })
      })
    }
    if (latitude != null && longitude != null) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [longitude, latitude] },
        properties: { kind: 'pin' },
      })
    }
    return { type: 'FeatureCollection' as const, features }
  }, [points, latitude, longitude])

  /* ---------------------------------------------------------------- create */
  useEffect(() => {
    if (!holder.current || map.current) return

    const instance = new MapLibreMap({
      container: holder.current,
      style: DEFAULT_BASEMAP.build(),
      center: [30.0619, -1.9441],
      zoom: 6,
      attributionControl: { compact: true },
    })
    map.current = instance
    instance.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    instance.addControl(new FullscreenControl(), 'top-right')

    instance.on('load', () => {
      addLayers(instance)
      setReady((n) => n + 1)
    })

    // The camera is not settled until the first idle; a fit before then is
    // discarded when MapLibre applies its own initial view.
    instance.once('idle', () => {
      settled.current = true
      const queued = pending.current
      pending.current = null
      queued?.()
    })

    return () => {
      instance.remove()
      map.current = null
      settled.current = false
    }
  }, [])

  /* ------------------------------------------------------------ data + fit */
  useEffect(() => {
    const instance = map.current
    if (!instance || !ready) return

    const source = instance.getSource(SOURCE)
    if (source && 'setData' in source) {
      ;(source as { setData: (d: unknown) => void }).setData(data)
    }

    if (!data.features.length) return

    const frame = () => {
      const live = map.current
      if (!live) return
      const bounds = new LngLatBounds()
      for (const feature of data.features) {
        if (feature.geometry.type === 'Polygon') {
          for (const c of feature.geometry.coordinates[0]) bounds.extend(c as [number, number])
        } else if (feature.geometry.type === 'Point') {
          bounds.extend(feature.geometry.coordinates as [number, number])
        }
      }
      live.fitBounds(bounds, { padding: 48, maxZoom: 18, duration: 500 })
    }

    if (settled.current) frame()
    else pending.current = frame
  }, [data, ready])

  const changeBasemap = (id: string) => {
    const instance = map.current
    const chosen = BASEMAPS.find((b) => b.id === id)
    if (!instance || !chosen) return
    setBasemap(id)
    instance.setStyle(chosen.build())
    // A style swap drops every layer, so they are rebuilt and the data
    // re-applied — the counter is what makes the effect above run again.
    instance.once('styledata', () => {
      addLayers(instance)
      setReady((n) => n + 1)
    })
  }

  const empty = data.features.length === 0

  return (
    <div className={cn('overflow-hidden rounded-2xl border border-line', className)}>
      <div className="relative h-64 w-full sm:h-72">
        <div ref={holder} className="h-full w-full" />

        {empty && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-canvas-alt/92 px-6 text-center">
            <p className="flex flex-col items-center gap-2 text-[0.8125rem] text-ink-muted">
              <MapPinOff className="size-5 text-ink-faint" strokeWidth={1.8} />
              Paste a boundary or type a pin, and it will appear here on the ground.
            </p>
          </div>
        )}

        {!empty && (
          <div className="absolute top-2 left-2 z-10 flex gap-1 rounded-xl border border-line bg-surface/95 p-0.5 shadow-soft backdrop-blur">
            {BASEMAPS.map((option) => (
              <button
                key={option.id}
                type="button"
                title={option.hint}
                onClick={() => changeBasemap(option.id)}
                aria-pressed={basemap === option.id}
                className={cn(
                  'rounded-lg px-2 py-1 text-[0.6875rem] font-semibold transition-colors',
                  basemap === option.id
                    ? 'bg-ink text-canvas'
                    : 'text-ink-soft hover:bg-canvas-alt hover:text-ink',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!empty && (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line bg-canvas px-3 py-2 text-[0.75rem] text-ink-muted">
          <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
            <MapIcon className="size-3.5 text-gold-600" strokeWidth={2.2} />
            {points.length >= 3 ? `${points.length} corners` : 'Pin only'}
          </span>
          {areaSqm ? <span>{formatAreaShort(areaSqm)}</span> : null}
          <span className="text-ink-faint">
            Check it sits where you expect before saving.
          </span>
        </p>
      )}
    </div>
  )
}

function addLayers(instance: MapLibreMap) {
  if (!instance.getSource(SOURCE)) {
    instance.addSource(SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
  }
  if (instance.getLayer('draft-fill')) return

  instance.addLayer({
    id: 'draft-fill',
    type: 'fill',
    source: SOURCE,
    filter: ['==', ['geometry-type'], 'Polygon'],
    paint: { 'fill-color': '#c98a2b', 'fill-opacity': 0.3 },
  })
  instance.addLayer({
    id: 'draft-line',
    type: 'line',
    source: SOURCE,
    filter: ['==', ['geometry-type'], 'Polygon'],
    paint: { 'line-color': '#c98a2b', 'line-width': 2.5 },
  })
  // Corner dots: a stray point is far easier to spot as a vertex than as a
  // number in a textarea.
  instance.addLayer({
    id: 'draft-corners',
    type: 'circle',
    source: SOURCE,
    filter: ['==', ['get', 'kind'], 'corner'],
    paint: {
      'circle-radius': 3.5,
      'circle-color': '#ffffff',
      'circle-stroke-color': '#8a5a12',
      'circle-stroke-width': 1.5,
    },
  })
  instance.addLayer({
    id: 'draft-pin',
    type: 'circle',
    source: SOURCE,
    filter: ['==', ['get', 'kind'], 'pin'],
    paint: {
      'circle-radius': 6,
      'circle-color': '#2563eb',
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    },
  })
}
