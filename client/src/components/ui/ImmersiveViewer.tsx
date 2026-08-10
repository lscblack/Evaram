import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Compass, Maximize2, Orbit, Play, X } from 'lucide-react'
import { EASE } from '@/lib/motion'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { ApiPropertyDetail } from '@/types/api'

type Mode = 'tour' | 'video360' | 'plot'

/**
 * The immersive block on a property page: VR tour, 360° walkthrough and the
 * surveyed parcel outline, in one tabbed surface. Each is only offered when
 * the listing actually carries it, so the tabs never lie.
 */
export function ImmersiveViewer({ property }: { property: ApiPropertyDetail }) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  const [plotView, setPlotView] = useState<'flat' | 'solid'>('flat')

  const available: { id: Mode; label: string; icon: typeof Orbit }[] = [
    property.vr_tour_url && { id: 'tour' as const, label: t('prop.virtualTour'), icon: Orbit },
    property.video_360_url && { id: 'video360' as const, label: t('prop.video360'), icon: Play },
    property.boundary_points?.length && {
      id: 'plot' as const,
      label: t('prop.parcelOutline'),
      icon: Compass,
    },
  ].filter(Boolean) as { id: Mode; label: string; icon: typeof Orbit }[]

  const [mode, setMode] = useState<Mode>(available[0]?.id ?? 'plot')

  if (available.length === 0) return null

  const body = (
    <>
      {mode === 'tour' && property.vr_tour_url && (
        <iframe
          title={`${property.title} — virtual tour`}
          src={property.vr_tour_url}
          allow="xr-spatial-tracking; gyroscope; accelerometer; fullscreen"
          allowFullScreen
          loading="lazy"
          className="size-full border-0"
        />
      )}

      {mode === 'video360' && property.video_360_url && (
        <video
          key={property.video_360_url}
          src={property.video_360_url}
          controls
          playsInline
          poster={property.media.find((m) => m.kind === 'image')?.url}
          className="size-full bg-navy-950 object-contain"
        >
          Your browser cannot play this video.
        </video>
      )}

      {mode === 'plot' && property.boundary_points && (
        <ParcelPlot
          points={property.boundary_points}
          areaSqm={property.boundary_area_sqm}
          dimension={plotView}
          onDimensionChange={setPlotView}
        />
      )}
    </>
  )

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div className="flex flex-wrap gap-1.5">
          {available.map((item) => {
            const Cmp = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                aria-pressed={mode === item.id}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[0.8125rem] font-semibold transition-colors',
                  mode === item.id
                    ? 'bg-ink text-canvas'
                    : 'text-ink-soft hover:bg-canvas-alt hover:text-ink',
                )}
              >
                <Cmp className="size-3.5" strokeWidth={2.2} />
                {item.label}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label={t('ui.expand')}
          className="grid size-8 place-items-center rounded-lg border border-line text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
        >
          <Maximize2 className="size-3.5" strokeWidth={2.2} />
        </button>
      </div>

      <div className="aspect-16/10 w-full bg-canvas-alt">{body}</div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex flex-col bg-navy-950/95 p-4 sm:p-8"
            role="dialog"
            aria-modal="true"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-lg font-semibold text-white">{property.title}</p>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                aria-label={t('ui.close')}
                className="grid size-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <X className="size-5" strokeWidth={2.2} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl bg-canvas">{body}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * The surveyed boundary, flat or extruded.
 *
 * Coordinates are normalised into the viewbox so a 600 sqm plot and twelve
 * hectares fill the frame identically. The solid view is a true isometric
 * projection rather than a perspective one — it keeps every edge measurable,
 * which is what someone judging a shape actually wants.
 */
function ParcelPlot({
  points,
  areaSqm,
  dimension,
  onDimensionChange,
}: {
  points: number[][]
  areaSqm: number | null
  dimension: 'flat' | 'solid'
  onDimensionChange: (next: 'flat' | 'solid') => void
}) {
  if (points.length < 3) return null

  const lats = points.map((p) => p[0])
  const lngs = points.map((p) => p[1])
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  const spanLat = maxLat - minLat || 1e-6
  const spanLng = maxLng - minLng || 1e-6
  const pad = 14
  const width = 400
  const height = 260

  const flat = points.map(([lat, lng]) => {
    const x = pad + ((lng - minLng) / spanLng) * (width - pad * 2)
    // SVG y grows downward; latitude grows north, so invert.
    const y = pad + ((maxLat - lat) / spanLat) * (height - pad * 2)
    return [x, y] as const
  })

  // Isometric: squash vertically, shear horizontally by half the depth.
  const DEPTH = 26
  const iso = flat.map(([x, y]) => {
    const cx = x - width / 2
    const cy = y - height / 2
    return [
      width / 2 + (cx - cy) * 0.72,
      height / 2 + (cx + cy) * 0.38 + 18,
    ] as const
  })

  const source = dimension === 'solid' ? iso : flat
  const ring = (pts: readonly (readonly [number, number])[]) =>
    pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') + ' Z'

  const top = ring(source)
  const base = ring(source.map(([x, y]) => [x, y + DEPTH] as const))

  /** One quad per edge, so the extrusion reads as a solid body. */
  const walls = source.map((point, i) => {
    const next = source[(i + 1) % source.length]
    return {
      key: i,
      d:
        `M${point[0].toFixed(1)} ${point[1].toFixed(1)} ` +
        `L${next[0].toFixed(1)} ${next[1].toFixed(1)} ` +
        `L${next[0].toFixed(1)} ${(next[1] + DEPTH).toFixed(1)} ` +
        `L${point[0].toFixed(1)} ${(point[1] + DEPTH).toFixed(1)} Z`,
      // Edges facing away are darker, which is what makes the form legible.
      lit: next[0] >= point[0],
    }
  })

  return (
    <div className="relative size-full">
      <svg
        viewBox={`0 0 ${width} ${height + DEPTH + 10}`}
        className="size-full"
        role="img"
        aria-label={`Surveyed parcel outline, ${dimension === 'solid' ? '3D' : 'flat'} view`}
      >
        <defs>
          <pattern id="parcel-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path
              d="M20 0 L0 0 0 20"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.12"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width={width} height={height + DEPTH + 10} fill="url(#parcel-grid)" className="text-ink" />

        {dimension === 'solid' && (
          <>
            <path d={base} fill="var(--color-gold-700)" fillOpacity="0.28" />
            {walls.map((wall) => (
              <motion.path
                key={wall.key}
                d={wall.d}
                fill="var(--color-gold-600)"
                fillOpacity={wall.lit ? 0.42 : 0.24}
                stroke="var(--color-gold-700)"
                strokeOpacity="0.5"
                strokeWidth="0.75"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: wall.key * 0.03 }}
              />
            ))}
          </>
        )}

        <motion.path
          key={dimension}
          d={top}
          fill="var(--color-gold-500)"
          fillOpacity={dimension === 'solid' ? 0.55 : 0.14}
          stroke="var(--color-gold-500)"
          strokeWidth="2"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: EASE }}
        />

        {source.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3.5" fill="var(--color-gold-600)" />
        ))}
      </svg>

      {/* ---- view switch ---- */}
      <div className="absolute top-3 right-3 flex rounded-lg border border-line bg-surface/90 p-0.5 backdrop-blur-sm">
        {(
          [
            ['flat', '2D'],
            ['solid', '3D'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onDimensionChange(value)}
            aria-pressed={dimension === value}
            className={cn(
              'rounded-md px-2.5 py-1 text-[0.6875rem] font-bold transition-colors',
              dimension === value ? 'bg-ink text-canvas' : 'text-ink-soft hover:text-ink',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {areaSqm ? (
        <p className="absolute bottom-3 left-4 rounded-full bg-surface/90 px-3 py-1 text-[0.75rem] font-semibold text-ink backdrop-blur-sm">
          {areaSqm >= 10_000
            ? `${(areaSqm / 10_000).toFixed(2)} ha`
            : `${areaSqm.toLocaleString('en-RW')} sqm`}
        </p>
      ) : null}
      <p className="absolute right-4 bottom-3 text-[0.6875rem] text-ink-muted">
        Surveyed boundary · indicative
      </p>
    </div>
  )
}
