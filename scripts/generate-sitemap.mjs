/**
 * Regenerates client/public/sitemap.xml from the static data layer.
 * Run with:  node scripts/generate-sitemap.mjs
 *
 * Kept as a plain script (no TS/build step) so it can run in CI before `vite build`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const SITE_URL = 'https://evaramu.rw'
const OUT = path.join(ROOT, 'client/public/sitemap.xml')

const STATIC_ROUTES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/properties', changefreq: 'daily', priority: '0.9' },
  { path: '/wealth-cycle', changefreq: 'monthly', priority: '0.9' },
  { path: '/construction', changefreq: 'monthly', priority: '0.9' },
  { path: '/services', changefreq: 'monthly', priority: '0.8' },
  { path: '/sell', changefreq: 'monthly', priority: '0.8' },
  { path: '/consultation', changefreq: 'monthly', priority: '0.8' },
  { path: '/join', changefreq: 'monthly', priority: '0.7' },
  { path: '/about', changefreq: 'monthly', priority: '0.7' },
  { path: '/team', changefreq: 'monthly', priority: '0.7' },
  { path: '/insights', changefreq: 'weekly', priority: '0.7' },
  { path: '/contact', changefreq: 'yearly', priority: '0.6' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
]

/** Pull ids/slugs out of the data files without needing a TS runtime. */
const read = (rel) => fs.readFileSync(path.join(ROOT, 'client/src/data', rel), 'utf8')

const propertyIds = [...read('properties.ts').matchAll(/^\s{4}id:\s*(\d+),$/gm)].map((m) => m[1])
const insightSlugs = [...read('content.ts').matchAll(/^\s{4}slug:\s*'([^']+)',$/gm)].map((m) => m[1])

const today = new Date().toISOString().slice(0, 10)

const entries = [
  ...STATIC_ROUTES.map((r) => ({ loc: r.path, changefreq: r.changefreq, priority: r.priority })),
  ...propertyIds.map((id) => ({
    loc: `/properties/${id}`,
    changefreq: 'weekly',
    priority: '0.8',
  })),
  ...insightSlugs.map((slug) => ({
    loc: `/insights/${slug}`,
    changefreq: 'monthly',
    priority: '0.6',
  })),
]

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) => `  <url>
    <loc>${SITE_URL}${e.loc === '/' ? '' : e.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`

fs.writeFileSync(OUT, xml)
console.log(
  `sitemap.xml written — ${entries.length} URLs (${propertyIds.length} properties, ${insightSlugs.length} insights)`,
)
