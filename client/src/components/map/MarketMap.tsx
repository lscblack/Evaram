import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  History, Layers, List, Loader2, Ruler, Search, SlidersHorizontal, TrendingUp, X,
} from 'lucide-react'
import { ParcelMap, type ParcelMapHandle, priceLabel } from './ParcelMap'
import { ParcelCard } from './ParcelCard'
import { ParcelPopup } from './ParcelPopup'
import { CompareTray } from './CompareTray'
import { SurroundingsSearch, buildCriteria } from './SurroundingsSearch'
import { api, qs } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { ParcelCollection, ParcelProperties, ProximityCriterion } from '@/types/api'
import type { FeatureCollection } from 'geojson'

/** Facility kinds worth drawing without being asked. Roads are on the basemap. */
const SHOWN_FACILITIES = [
  'school', 'hospital', 'clinic', 'market', 'bus_station', 'fuel', 'bank',
  'pharmacy', 'place_of_worship', 'wetland', 'river', 'industrial', 'power_line',
].join(',')

interface Filters {
  intent?: string
  district?: string
  category_id?: string
  max_price?: number
  min_size?: number
}

/**
 * The map view of the marketplace.
 *
 * Owns the viewport rather than sitting in a box: filters collapse into a
 * button, the page below is hidden, and the only thing that scrolls is the
 * results rail. A map you have to scroll a page to see is a picture of a map.
 */
export function MarketMap({
  filters,
  filterPanel,
  activeFilterCount = 0,
}: {
  filters?: Filters
  filterPanel?: React.ReactNode
  activeFilterCount?: number
}) {
  const mapRef = useRef<ParcelMapHandle>(null)
  const [collection, setCollection] = useState<ParcelCollection | null>(null)
  const [facilities, setFacilities] = useState<FeatureCollection | null>(null)
  const [sold, setSold] = useState<FeatureCollection | null>(null)
  const [activity, setActivity] = useState<FeatureCollection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [bbox, setBbox] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [popup, setPopup] = useState<ParcelProperties | null>(null)
  const [selected, setSelected] = useState<ParcelProperties[]>([])
  const [criteria, setCriteria] = useState<Record<string, number>>({})
  const [relaxed, setRelaxed] = useState<ProximityCriterion[] | undefined>()

  const [measuring, setMeasuring] = useState(false)
  const [showFacilities, setShowFacilities] = useState(false)
  const [showSold, setShowSold] = useState(false)
  const [showActivity, setShowActivity] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const searching = Object.keys(criteria).length > 0
  const criteriaKey = buildCriteria(criteria)
  const filterKey = JSON.stringify(filters ?? {})

  /* ------------------------------------------------------------- parcels */
  useEffect(() => {
    let cancelled = false
    if (!searching && !bbox) return

    setLoading(true)
    const path = searching
      ? `/public/map/search${qs({ near: criteriaKey, ...(filters ?? {}) })}`
      : `/public/map/properties${qs({ bbox, ...(filters ?? {}) })}`

    api
      .get<ParcelCollection>(path)
      .then((data) => {
        if (cancelled) return
        for (const feature of data.features) {
          feature.properties.price_label = priceLabel(
            feature.properties.intent === 'rent'
              ? feature.properties.rent_amount
              : feature.properties.price,
            feature.properties.currency,
          )
        }
        setCollection(data)
        setRelaxed(data.relaxed?.length ? data.relaxed : undefined)
        setError(null)
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'Map failed to load'))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [bbox, criteriaKey, searching, filterKey])

  /* ------------------------------------------------- optional map layers */
  useEffect(() => {
    if (!showFacilities || !bbox) return setFacilities(null)
    let cancelled = false
    api
      .get<FeatureCollection>(`/public/map/facilities${qs({ bbox, kinds: SHOWN_FACILITIES })}`)
      .then((d) => !cancelled && setFacilities(d))
      .catch(() => !cancelled && setFacilities(null))
    return () => {
      cancelled = true
    }
  }, [bbox, showFacilities])

  useEffect(() => {
    if (!showSold || !bbox) return setSold(null)
    let cancelled = false
    api
      .get<FeatureCollection>(`/public/map/sold${qs({ bbox })}`)
      .then((d) => {
        if (cancelled) return
        for (const f of d.features) {
          const props = f.properties as { sold_price: number; currency: string } | null
          if (props) {
            ;(f.properties as Record<string, unknown>).sold_label = priceLabel(
              props.sold_price,
              props.currency,
            )
          }
        }
        setSold(d)
      })
      .catch(() => !cancelled && setSold(null))
    return () => {
      cancelled = true
    }
  }, [bbox, showSold])

  useEffect(() => {
    if (!showActivity) return setActivity(null)
    let cancelled = false
    api
      .get<FeatureCollection>('/public/map/activity')
      .then((d) => !cancelled && setActivity(d))
      .catch(() => !cancelled && setActivity(null))
    return () => {
      cancelled = true
    }
  }, [showActivity])

  /* --------------------------------------------------------------- frame */
  const framed = useRef(false)
  useEffect(() => {
    if (framed.current || !collection?.features.length) return
    framed.current = true
    mapRef.current?.fitTo()
  }, [collection])

  useEffect(() => {
    if (searching && collection?.features.length) mapRef.current?.fitTo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criteriaKey])

  const parcels = useMemo(() => collection?.features ?? [], [collection])
  const list = useMemo(() => parcels.map((f) => f.properties), [parcels])

  const toggleCompare = useCallback((parcel: ParcelProperties) => {
    setSelected((prev) => {
      if (prev.some((p) => p.id === parcel.id)) return prev.filter((p) => p.id !== parcel.id)
      // Five columns is the most a comparison can carry and stay readable.
      return prev.length >= 5 ? prev : [...prev, parcel]
    })
  }, [])

  /** Select a parcel: frame it, and open its card. */
  const pick = useCallback((parcel: ParcelProperties | null) => {
    setActiveId(parcel?.id ?? null)
    setPopup(parcel)
    if (parcel) mapRef.current?.fitTo([parcel.id])
  }, [])

  const clickedEmptyMap = useCallback(async (lng: number, lat: number) => {
    try {
      const found = await api.get<ParcelCollection>(
        `/public/map/nearby${qs({ lat, lng, radius_m: 3000, limit: 12 })}`,
      )
      if (!found.features.length) return
      for (const feature of found.features) {
        feature.properties.price_label = priceLabel(
          feature.properties.price,
          feature.properties.currency,
        )
      }
      setCollection(found)
      setListOpen(true)
    } catch {
      /* a failed lookup should not disturb the map */
    }
  }, [])

  /**
   * Exactly the viewport below whatever header is above us.
   *
   * Measured rather than assumed: the header stacks a top bar, a nav and a
   * sticky filter row whose combined height changes with the viewport, and a
   * guessed offset leaves the map either scrolling under the page or cut off
   * at the bottom with its controls out of reach.
   */
  const shell = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<string>('70dvh')

  /**
   * While the map is open, the page does not scroll.
   *
   * Everything below it — the footer, the sections the list view uses — would
   * otherwise drag the map up past the header the moment anyone touched a
   * trackpad, taking its controls off screen with it. The map is the page here.
   */
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    const fit = () => {
      const top = shell.current?.getBoundingClientRect().top ?? 0
      setHeight(`${Math.max(320, window.innerHeight - top)}px`)
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  const selectedIds = selected.map((p) => p.id)

  return (
    <div
      ref={shell}
      style={{ height }}
      className="relative w-full overflow-hidden bg-canvas-alt"
    >
      <ParcelMap
        ref={mapRef}
        parcels={parcels as never}
        facilities={showFacilities ? facilities : null}
        sold={showSold ? sold : null}
        activity={showActivity ? activity : null}
        activeId={activeId}
        selectedIds={selectedIds}
        onSelect={(f) => pick(f ? (f.properties as ParcelProperties) : null)}
        onMapClick={clickedEmptyMap}
        onViewportChange={setBbox}
        measuring={measuring}
        className="evr-market-map h-full"
      />

      {/* ------------------------------------------------------ left rail */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex items-start gap-2 px-3">
        <div className="pointer-events-auto flex flex-wrap gap-2">
          <Pill
            icon={SlidersHorizontal}
            label="Filters"
            badge={activeFilterCount}
            onClick={() => setFiltersOpen(true)}
          />
          <Pill
            icon={Search}
            label="Nearby"
            active={searchOpen || searching}
            onClick={() => setSearchOpen((v) => !v)}
          />
          <Pill icon={Ruler} label="Measure" active={measuring} onClick={() => setMeasuring((v) => !v)} />
          <Pill
            icon={Layers}
            label="Places"
            active={showFacilities}
            onClick={() => setShowFacilities((v) => !v)}
          />
          <Pill icon={History} label="Sold" active={showSold} onClick={() => setShowSold((v) => !v)} />
          <Pill
            icon={TrendingUp}
            label="Activity"
            active={showActivity}
            onClick={() => setShowActivity((v) => !v)}
          />
        </div>

        {loading && (
          <span className="pointer-events-none ml-auto inline-flex items-center gap-2 rounded-full border border-line bg-surface/95 px-3 py-1.5 text-[0.75rem] font-semibold text-ink-soft shadow-soft backdrop-blur">
            <Loader2 className="size-3.5 animate-spin" strokeWidth={2.4} />
            Loading
          </span>
        )}
      </div>

      {/* ---------------------------------------------- surroundings panel */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-16 left-3 z-30 max-h-[calc(100%-6rem)] w-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl border border-line bg-surface/97 p-4 shadow-lift backdrop-blur sm:w-[24rem]"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[0.875rem] font-bold text-ink">Find plots by what is around them</p>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
                className="grid size-7 place-items-center rounded-full text-ink-muted hover:bg-canvas-alt hover:text-ink"
              >
                <X className="size-4" strokeWidth={2.2} />
              </button>
            </div>
            <SurroundingsSearch active={criteria} onChange={setCriteria} relaxed={relaxed} />
            {searching && (
              <button
                type="button"
                onClick={() => {
                  setCriteria({})
                  setRelaxed(undefined)
                }}
                className="mt-3 text-[0.75rem] font-semibold text-ink-muted hover:text-ink"
              >
                Clear all conditions
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* --------------------------------------------------------- results */}
      <div
        className={cn(
          'absolute inset-y-0 right-0 z-30 flex w-full max-w-sm flex-col border-l border-line bg-canvas-alt transition-transform duration-300 sm:w-[23rem]',
          listOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <p className="text-[0.8125rem] font-bold text-ink">
            {loading ? 'Searching…' : `${list.length} parcel${list.length === 1 ? '' : 's'}`}
            {searching && !loading && (
              <span className="ml-1.5 font-normal text-ink-muted">matching</span>
            )}
          </p>
          <button
            type="button"
            onClick={() => setListOpen(false)}
            aria-label="Close the list"
            className="grid size-8 place-items-center rounded-full text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
          >
            <X className="size-4" strokeWidth={2.2} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {error && <p className="p-4 text-center text-[0.875rem] text-red-600">{error}</p>}
          {!error && !loading && list.length === 0 && (
            <p className="p-6 text-center text-[0.875rem] leading-relaxed text-ink-muted">
              Nothing here yet. Pan or zoom out, or search by what should be nearby.
            </p>
          )}
          {list.map((parcel) => (
            <ParcelCard
              key={parcel.id}
              parcel={parcel}
              active={activeId === parcel.id}
              selected={selectedIds.includes(parcel.id)}
              onHover={setActiveId}
              onSelect={pick}
              onCompare={toggleCompare}
              compact
            />
          ))}
        </div>
      </div>

      {/* A handle on the edge the rail slides from, rather than another button
          in a corner — every corner is already carrying something. */}
      {!listOpen && (
        <button
          type="button"
          onClick={() => setListOpen(true)}
          aria-label={`Show ${list.length} parcels`}
          className="absolute top-1/2 right-0 z-20 flex -translate-y-1/2 items-center gap-2 rounded-l-2xl border border-r-0 border-line bg-surface/95 py-3 pr-2 pl-3 text-[0.8125rem] font-bold text-ink shadow-lift backdrop-blur transition-colors hover:border-line-strong"
        >
          <List className="size-4" strokeWidth={2.2} />
          <span className="[writing-mode:vertical-rl] tabular-nums">
            {loading ? '…' : `${list.length} ${list.length === 1 ? 'parcel' : 'parcels'}`}
          </span>
        </button>
      )}

      {/* ----------------------------------------------------- parcel card */}
      <AnimatePresence>
        {popup && (
          <ParcelPopup
            parcel={popup}
            selected={selectedIds.includes(popup.id)}
            onClose={() => {
              setPopup(null)
              setActiveId(null)
            }}
            onCompare={toggleCompare}
          />
        )}
      </AnimatePresence>

      {/* --------------------------------------------------- filter drawer */}
      <AnimatePresence>
        {filtersOpen && filterPanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFiltersOpen(false)}
              className="absolute inset-0 z-40 bg-navy-950/45 backdrop-blur-[2px]"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.28 }}
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
              className="absolute inset-y-0 left-0 z-50 flex w-full max-w-xs flex-col border-r border-line bg-canvas"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
                <h2 className="font-display text-lg font-semibold text-ink">Filters</h2>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  aria-label="Close filters"
                  className="grid size-9 place-items-center rounded-full border border-line text-ink"
                >
                  <X className="size-4" strokeWidth={2.2} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{filterPanel}</div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <CompareTray
        parcels={selected}
        onRemove={(id) => setSelected((prev) => prev.filter((p) => p.id !== id))}
        onClear={() => setSelected([])}
      />
    </div>
  )
}

function Pill({
  icon: Icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: typeof Ruler
  label: string
  active?: boolean
  badge?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[0.75rem] font-semibold shadow-soft backdrop-blur transition-colors',
        active
          ? 'border-gold-500 bg-gold-500 text-white'
          : 'border-line bg-surface/95 text-ink-soft hover:border-line-strong hover:text-ink',
      )}
    >
      <Icon className="size-3.5" strokeWidth={2.2} />
      <span className="hidden sm:inline">{label}</span>
      {Boolean(badge) && (
        <span className="grid size-4 place-items-center rounded-full bg-gold-500 text-[0.625rem] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  )
}
