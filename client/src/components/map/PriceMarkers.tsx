import { useEffect, useRef } from 'react'
import { Marker, type MapLibreMap } from 'maplibre-gl'
import type { ParcelProperties } from '@/types/api'

/**
 * Price pills on the map.
 *
 * Rendered as real DOM markers rather than a symbol layer. A pill needs a
 * background, a border, a shadow and a hit area larger than its glyphs, and a
 * text layer can give it none of those — on satellite imagery, halo-on-text is
 * unreadable at exactly the moment the map is most useful.
 */
export function usePriceMarkers({
  map,
  ready,
  parcels,
  activeId,
  selectedIds,
  onSelect,
  visible,
}: {
  map: MapLibreMap | null
  ready: number
  parcels: { properties: ParcelProperties }[]
  activeId: string | null | undefined
  selectedIds: string[]
  onSelect: (parcel: ParcelProperties) => void
  visible: boolean
}) {
  const markers = useRef<Map<string, Marker>>(new Map())
  const handler = useRef(onSelect)
  handler.current = onSelect

  useEffect(() => {
    if (!map || !ready) return

    const live = new Set<string>()

    if (visible) {
      for (const parcel of parcels) {
        const p = parcel.properties
        live.add(p.id)

        let marker = markers.current.get(p.id)
        if (!marker) {
          const el = document.createElement('button')
          el.type = 'button'
          el.className = 'evr-pill'
          el.addEventListener('click', (event) => {
            event.stopPropagation()
            handler.current(p)
          })
          marker = new Marker({ element: el, anchor: 'center' })
            .setLngLat([p.longitude, p.latitude])
            .addTo(map)
          markers.current.set(p.id, marker)
        }

        const el = marker.getElement()
        el.textContent = p.price_label || '—'
        el.setAttribute('aria-label', `${p.title} — ${p.price_label ?? 'price on request'}`)
        el.dataset.state =
          p.id === activeId ? 'active' : selectedIds.includes(p.id) ? 'selected' : 'idle'
        el.dataset.flag = p.issue_count > 0 ? 'warn' : ''
        // The selected pill has to sit above its neighbours, which MapLibre
        // orders by latitude rather than by importance.
        marker.getElement().parentElement?.style.setProperty(
          'z-index',
          p.id === activeId ? '5' : '1',
        )
        marker.setLngLat([p.longitude, p.latitude])
      }
    }

    for (const [id, marker] of markers.current) {
      if (!live.has(id)) {
        marker.remove()
        markers.current.delete(id)
      }
    }
  }, [map, ready, parcels, activeId, selectedIds, visible])

  // A style swap tears the map down; markers must go with it or they leak.
  useEffect(() => {
    const held = markers.current
    return () => {
      for (const marker of held.values()) marker.remove()
      held.clear()
    }
  }, [])
}
