# Evaramu Group Ltd — Front End

React 19 + TypeScript + Vite + Tailwind v4 front end for Evaramu Group Ltd's real
estate, construction and property-wealth platform.

No backend yet — every page reads from the static data layer in `src/data`,
which is deliberately shaped like the eventual API so swapping it out is a
drop-in change.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # regenerates the sitemap, typechecks, then builds
npm run preview    # serve the production build
npm run lint
npm run sitemap    # regenerate public/sitemap.xml only
```

## Stack

| Concern   | Choice                                                |
| --------- | ----------------------------------------------------- |
| Framework | React 19 (plain SPA — no Next.js)                     |
| Build     | Vite 8                                                |
| Language  | TypeScript, strict                                    |
| Styling   | Tailwind CSS v4 (CSS-first config in `src/index.css`) |
| Routing   | react-router-dom 7, one route per page, lazy-loaded   |
| Animation | framer-motion                                         |
| Icons     | lucide-react (+ inline SVGs for social brands)        |
| Metadata  | React 19 native document metadata — no helmet         |
| Theming   | Class-based dark mode over semantic CSS variables      |
| i18n      | Hand-rolled context + string table (en / rw / fr)      |

## Brand & theming

The raw palette is sampled from the corporate logo — navy `#062b4f`, gold
`#be7c28` — and lives in `@theme` in `src/index.css`.

**Components should not use those raw scales for surfaces or text.** Use the
semantic tokens instead; they are declared with `@theme inline` so they resolve
to `var(--surface)` at runtime and flip when `.dark` is on `<html>`:

| Token                            | Light            | Dark             |
| -------------------------------- | ---------------- | ---------------- |
| `canvas` / `canvas-alt`          | page backgrounds | page backgrounds |
| `surface` / `surface-alt`        | cards, panels    | cards, panels    |
| `ink` / `ink-soft` / `ink-muted` / `ink-faint` | text ramp | text ramp |
| `line` / `line-strong`           | borders          | borders          |
| `accent-soft`                    | tinted fills     | tinted fills     |

`ink` and `canvas` invert with the theme, so `bg-ink text-canvas` is the correct
way to build a high-contrast solid button or an active pill. `bg-navy-900
text-white` will look wrong in dark mode.

Deliberately *not* themed: the deep `bg-navy-950` feature sections and their
`text-white` content. Those read as intentional inverted bands in both modes.

Type is **Fraunces** for display and **Plus Jakarta Sans** for body. Headings sit
at `font-semibold`, not bold — Fraunces is already high-contrast.

Use `ease-brand` and the `shadow-soft` / `shadow-lift` / `shadow-gold` tokens
rather than ad-hoc values. The shadows are theme-aware.

Utilities worth knowing: `container-page`, `text-gradient-gold`, `bg-blueprint`,
`bg-blueprint-light`, `glass-card`, `mask-fade-x`, `rule`.

### Page width

`container-page` is full-bleed with a 1.25rem gutter below `md`, then **11/12 of
the viewport** from `md` up, capped at 1720px.

### Dark mode

`src/lib/theme.tsx` exposes `useTheme()` with `choice` (`light | dark | system`),
`resolved`, `setChoice` and `toggle`. The choice persists to `localStorage`, and
an inline script in `index.html` applies the class before first paint so there is
no flash. `ThemeToggle` is wired into the navbar on every breakpoint.

### Languages

`src/lib/i18n.tsx` exposes `useT()` / `useI18n()`; strings live in
`src/data/translations.ts` keyed as `section.name` with `en`/`rw`/`fr` for each.
`t('key', { vars })` interpolates `{var}` placeholders and falls back to English,
then to the key.

Covered: navigation, chrome, buttons, form labels, marketplace and the home
page. **Not covered:** long-form editorial (insight articles, legal pages, FAQ
answers) — that is a copywriting job rather than a string-table one.

> The Kinyarwanda strings were written without a native reviewer and should be
> checked by one before launch.

## Layout

```
src/
  components/
    layout/     Navbar, Footer, PageHero, ScrollToTop, FloatingActions, RouteLoader
    sections/   Reusable page sections (Hero, WealthCycleSection, FaqSection, …)
    ui/         Primitives (Button, PropertyCard, Calendar, DynamicField, …)
    Seo.tsx     Per-page metadata + JSON-LD builders
  data/         Static, API-shaped content
  lib/          utils, motion variants, property-detail formatting
  pages/        One component per route
  types/        Domain types mirroring the backend models
```

### The data layer

- **`data/formConfig.ts`** — the 20-form property specification config, verbatim
  from the product spec. Drives both the listing wizard on `/sell` and the
  "Full specification" table on a property detail page.
- **`data/properties.ts`** — categories, sub-categories, agents and 12 listings.
  Field names match the `properties` SQLAlchemy model (`upi`, `parcel_information`,
  `details`, `uploader_type`, …) so the API can be dropped in behind them.
- **`data/services.ts`** — construction packages, the Wealth Cycle model,
  consultation types and static availability.
- **`data/content.ts`** — testimonials, insight articles, FAQs.
- **`data/site.ts`** — company facts, navigation and market statistics.

### Adding a data-driven icon

`components/ui/Icon.tsx` resolves Lucide icons by _name string_ against an
explicit registry. A namespace import would pull the entire icon set into the
bundle, so new icons referenced from `data/` must be added to that registry
deliberately.

## SEO

Every page renders a `<Seo>` component. React 19 hoists its `<title>`, `<meta>`
and `<link>` into `<head>` natively.

The fallback `<title>` / `<meta name="description">` in `index.html` are tagged
`data-boot-fallback` and removed by `main.tsx` before React mounts — otherwise
crawlers would read the static pair and every page would share the homepage
description.

Also included: canonical URLs, Open Graph, Twitter cards, geo tags, and JSON-LD
(`RealEstateAgent` on every page, plus `Product`, `BlogPosting`, `FAQPage`,
`BreadcrumbList` and `ItemList` where relevant). `public/robots.txt` and a
generated `public/sitemap.xml` complete the setup.

## Routes

| Route                | Page                                                         |
| -------------------- | ------------------------------------------------------------ |
| `/`                  | Home                                                         |
| `/properties`        | Listings — filters, sort and view mode sync to the URL        |
| `/properties/:id`    | Detail — gallery, parcel data, dynamic spec, map, projection  |
| `/wealth-cycle`      | The six-step model + interactive portfolio projector          |
| `/construction`      | Packages, build estimator, process, project brief             |
| `/services`          | All service lines, property management, diaspora              |
| `/sell`              | Five-step listing wizard driven by `FORM_CONFIG`              |
| `/consultation`      | Booking — calendar, availability, slots, confirmation         |
| `/join`              | Agents, brokers, contractors + commission calculator          |
| `/about`             | Story, divisions, governance, roadmap                         |
| `/team`              | Full roster, filterable by division                           |
| `/insights`          | Article index with category filter and search                 |
| `/insights/:slug`    | Article with reading progress and related posts               |
| `/contact`           | Channels, form, map, socials                                  |
| `/privacy`, `/terms` | Legal (one component, content switched on pathname)           |
| `*`                  | 404                                                          |

## Deploying

It's a SPA, so the host must rewrite all unmatched paths to `index.html` or
direct links to `/properties/2` will 404. On Vercel add:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

Netlify: `/*  /index.html  200` in `public/_redirects`.

## Not done yet

- No backend. Every form validates and shows a success state but posts nowhere.
- Property images are Unsplash URLs; swap for real photography before launch.
- Calendar availability is deterministic static data, not real bookings.
- Company phone, email and address in `data/site.ts` are placeholders.
- Kinyarwanda translations need a native-speaker review.
- Long-form article/legal copy is English-only.
