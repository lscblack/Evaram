import type { StyleSpecification } from 'maplibre-gl'

/**
 * Basemaps the parcel map can switch between.
 *
 * All raster, and all from providers that serve tiles without a key, so the map
 * works the moment it is deployed. Each entry can be pointed at a paid provider
 * later by changing one URL — the layer code never names a provider.
 */
export interface BaseMap {
  id: string
  label: string
  /** Shown in the switcher so it is obvious what a viewer is about to get. */
  hint: string
  build: () => StyleSpecification
}

const OSM_ATTRIB = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
const ESRI_ATTRIB = 'Imagery © <a href="https://www.esri.com">Esri</a>, Maxar, Earthstar Geographics'

/**
 * A raster basemap.
 *
 * `maxzoom` is the deepest level the provider actually has tiles for — not the
 * deepest the map may zoom to. Past it MapLibre upscales the last real tile,
 * which is blurry but correct; without it the provider returns its own
 * "map data not yet available" placeholder and the parcel appears to be
 * floating on nothing.
 */
function raster(tiles: string[], attribution: string, maxzoom = 19): StyleSpecification {
  return {
    version: 8,
    // A blank glyph endpoint would break every symbol layer, so labels get a
    // real font source even on the imagery basemaps.
    glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
    sources: {
      base: { type: 'raster', tiles, tileSize: 256, attribution, maxzoom },
    },
    layers: [{ id: 'base', type: 'raster', source: 'base' }],
  }
}

function rasterWithLabels(
  tiles: string[],
  labelTiles: string[],
  attribution: string,
  maxzoom = 19,
): StyleSpecification {
  const style = raster(tiles, attribution, maxzoom)
  style.sources.labels = { type: 'raster', tiles: labelTiles, tileSize: 256, maxzoom }
  style.layers.push({ id: 'labels', type: 'raster', source: 'labels' })
  return style
}

export const BASEMAPS: BaseMap[] = [
  {
    id: 'streets',
    label: 'Streets',
    hint: 'Roads, names and plot context',
    build: () => raster(['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], OSM_ATTRIB),
  },
  {
    id: 'satellite',
    label: 'Satellite',
    hint: 'See what is actually on the ground',
    build: () =>
      raster(
        [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        ESRI_ATTRIB,
        18,
      ),
  },
  {
    id: 'hybrid',
    label: 'Hybrid',
    hint: 'Imagery with street names over it',
    build: () =>
      rasterWithLabels(
        [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        [
          'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        ],
        ESRI_ATTRIB,
        18,
      ),
  },
  {
    id: 'terrain',
    label: 'Terrain',
    hint: 'Slope and contours — how steep the plot is',
    build: () =>
      raster(
        ['https://a.tile.opentopomap.org/{z}/{x}/{y}.png'],
        `${OSM_ATTRIB}, <a href="https://opentopomap.org">OpenTopoMap</a>`,
        17,
      ),
  },
]

/**
 * Satellite by default.
 *
 * A street map tells a buyer where a plot is; imagery tells them what is on it
 * — whether it is cleared, terraced, already built on, or under water half the
 * year. For land that is the more important question, so it is the one the map
 * answers first.
 */
export const DEFAULT_BASEMAP = BASEMAPS.find((b) => b.id === 'hybrid') ?? BASEMAPS[0]

/** Kigali, for when there is nothing to fit the view to. */
export const RWANDA_CENTRE: [number, number] = [30.0619, -1.9441]
export const RWANDA_BOUNDS: [[number, number], [number, number]] = [
  [28.85, -2.85],
  [30.9, -1.05],
]

/**
 * Street-level imagery for a point.
 *
 * A link rather than an embed. Google Street View needs a billed key to embed
 * but not to link to, and a link is the honest option when the alternative is
 * an empty grey panel where imagery does not exist.
 */
export function streetViewUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`
}
