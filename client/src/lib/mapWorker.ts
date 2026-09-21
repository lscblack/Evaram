/**
 * Where MapLibre's worker lives.
 *
 * MapLibre tiles GeoJSON — every parcel outline — in a web worker that it
 * locates as `./maplibre-gl-worker.mjs` next to its own script. In development
 * that resolves into `node_modules`, which Vite serves, so everything works.
 * In a production build it resolves to `/assets/maplibre-gl-worker.mjs`, which
 * the build never emits; the server answers with `index.html`, the worker
 * fails to parse, and every polygon silently disappears while the raster
 * imagery underneath keeps drawing. The map even stops reaching `idle`, so
 * the framing never happens either and the view sits on Kigali.
 *
 * Importing the worker through Vite bundles it (with the shared chunk it
 * depends on) and returns a URL that exists in both dev and the build.
 * Imported for its side effect by every component that creates a map.
 */
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

setWorkerUrl(workerUrl)
