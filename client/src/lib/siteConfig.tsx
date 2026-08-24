/**
 * Site configuration, served from the database.
 *
 * Settings, UI strings and navigation all arrive in one `/public/bootstrap`
 * call. Until it lands the app renders from the compiled defaults, so there is
 * no blank first paint and the site still works if the API is unreachable.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { SITE as FALLBACK_SITE, NAV_ITEMS as FALLBACK_NAV, type NavItem } from '@/data/site'
import type { ApiNavItem, Bootstrap } from '@/types/api'

interface SiteConfig {
  ready: boolean
  settings: Record<string, string | null>
  strings: Record<string, { en: string; rw: string; fr: string }>
  navigation: ApiNavItem[]
  districts: string[]
  /** Reads a setting with a compiled-in fallback. */
  setting: (key: string, fallback?: string) => string
  /** Re-reads bootstrap — used after an admin saves settings. */
  reload: () => Promise<void>
}

const EMPTY: Bootstrap = {
  settings: {},
  setting_types: {},
  strings: {},
  navigation: [],
  districts: [],
}

const SiteConfigContext = createContext<SiteConfig | null>(null)

/** Compiled defaults, used until bootstrap resolves. */
const DEFAULTS: Record<string, string> = {
  'brand.name': FALLBACK_SITE.name,
  'brand.short_name': FALLBACK_SITE.shortName,
  'brand.tagline': FALLBACK_SITE.tagline,
  'brand.logo_mark': '/brand/logo-mark.png',
  'brand.logo_mark_light': '/brand/logo-mark-light.png',
  'contact.email': FALLBACK_SITE.email,
  'contact.phone': FALLBACK_SITE.phone,
  'contact.momo_code': '70702',
  'contact.whatsapp': '250788000000',
  'contact.address': FALLBACK_SITE.address,
  'contact.hours': FALLBACK_SITE.hours,
  'contact.hours_saturday': FALLBACK_SITE.saturdayHours,
  'company.rdb': FALLBACK_SITE.rdb,
  'company.description': FALLBACK_SITE.description,
  'seo.site_url': FALLBACK_SITE.url,
  'social.instagram': 'https://instagram.com/evaramugroup',
  'social.facebook': 'https://facebook.com/evaramugroup',
  'social.linkedin': 'https://linkedin.com/company/evaramugroup',
  'social.youtube': 'https://youtube.com/@evaramugroup',
  'social.handle': FALLBACK_SITE.handle,
}

/**
 * The canonical site URL for module-level helpers that cannot call a hook
 * (JSON-LD builders). Kept in sync by the provider on every bootstrap.
 */
let runtimeSiteUrl: string = FALLBACK_SITE.url

export function siteUrl(): string {
  return runtimeSiteUrl
}

export function SiteConfigProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Bootstrap>(EMPTY)
  const [ready, setReady] = useState(false)

  const load = useCallback(async () => {
    try {
      const payload = await api.get<Bootstrap>('/public/bootstrap')
      setData(payload)
      applyTheme(payload.settings)
      const url = payload.settings['seo.site_url']
      if (url) runtimeSiteUrl = url.replace(/\/$/, '')
    } catch {
      // Offline or API down — the compiled defaults carry the site.
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const value = useMemo<SiteConfig>(() => {
    const nav = data.navigation.length ? data.navigation : fallbackNav()
    return {
      ready,
      settings: data.settings,
      strings: data.strings,
      navigation: nav,
      districts: data.districts,
      setting: (key, fallback) => data.settings[key] ?? DEFAULTS[key] ?? fallback ?? '',
      reload: load,
    }
  }, [data, ready, load])

  return <SiteConfigContext.Provider value={value}>{children}</SiteConfigContext.Provider>
}

/**
 * The lightness curve of each shipped ramp, as HSL lightness percentages.
 *
 * Re-hueing to an admin's colour keeps these values and swaps hue/saturation,
 * so a custom brand colour lands with the same rhythm the palette was designed
 * with instead of a flat tint.
 */
const RAMPS: Record<string, { steps: number[]; lightness: number[]; base: number }> = {
  navy: {
    steps: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950],
    lightness: [96, 89, 78, 65, 50, 39, 29, 22, 18, 17, 9],
    base: 900,
  },
  gold: {
    steps: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900],
    lightness: [96, 90, 80, 67, 56, 45, 38, 30, 23, 15],
    base: 500,
  },
  sand: {
    steps: [50, 100, 200, 300, 400, 500],
    lightness: [98, 95, 89, 81, 65, 48],
    base: 50,
  },
}

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return null
  const int = parseInt(match[1], 16)
  const r = ((int >> 16) & 255) / 255
  const g = ((int >> 8) & 255) / 255
  const b = (int & 255) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: l * 100 }

  const d = max - min
  const sat = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6

  return { h: h * 360, s: sat * 100, l: l * 100 }
}

/**
 * Pushes admin-configured brand colours into the CSS custom properties the
 * whole design system reads. Only overrides what is actually set.
 */
function applyTheme(settings: Record<string, string | null>): void {
  const root = document.documentElement

  for (const [name, key] of [
    ['navy', 'theme.navy'],
    ['gold', 'theme.gold'],
    ['sand', 'theme.sand'],
  ] as const) {
    const value = settings[key]
    if (!value) continue
    const hsl = hexToHsl(value)
    if (!hsl) continue

    const ramp = RAMPS[name]
    const baseIndex = ramp.steps.indexOf(ramp.base)
    const baseLightness = ramp.lightness[baseIndex]

    ramp.steps.forEach((step, i) => {
      // The chosen colour is placed exactly on its own step; the rest of the
      // ramp keeps the designed lightness and follows the new hue.
      const lightness = step === ramp.base ? hsl.l : ramp.lightness[i]
      // Pale steps need less saturation or they read as neon.
      const saturation =
        step === ramp.base ? hsl.s : hsl.s * (lightness > baseLightness ? 0.82 : 0.92)
      root.style.setProperty(
        `--brand-${name}-${step}`,
        `hsl(${hsl.h.toFixed(1)} ${Math.min(100, saturation).toFixed(1)}% ${lightness.toFixed(1)}%)`,
      )
    })
  }

  // Typefaces are chosen from a dropdown in Settings; like the colours, they
  // only mean anything if they reach the tokens the design system reads.
  const fonts: [string, string][] = [
    ['theme.font_sans', '--font-sans'],
    ['theme.font_display', '--font-display'],
  ]
  for (const [key, cssVar] of fonts) {
    const family = settings[key]
    if (!family) continue
    const fallback =
      cssVar === '--font-display'
        ? 'ui-serif, Georgia, serif'
        : 'ui-sans-serif, system-ui, -apple-system, sans-serif'
    root.style.setProperty(cssVar, `"${family}", ${fallback}`)
  }

  const favicon = settings['brand.favicon']
  if (favicon) {
    document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.setAttribute('href', favicon)
  }
}

function fallbackNav(): ApiNavItem[] {
  return FALLBACK_NAV.map((item, index) => ({
    id: `fallback-${index}`,
    menu: 'header',
    label: item.label,
    translation_key: item.tKey,
    href: item.to,
    icon: null,
    description: null,
    children: (item.children ?? []).map((child, childIndex) => ({
      id: `fallback-${index}-${childIndex}`,
      label: child.label,
      translation_key: null,
      href: child.to,
      icon: child.icon,
      description: child.description,
    })),
  }))
}

export function useSiteConfig(): SiteConfig {
  const context = useContext(SiteConfigContext)
  if (!context) throw new Error('useSiteConfig must be used inside <SiteConfigProvider>')
  return context
}

/* ------------------------------------------------------------------ derived */

/**
 * The same shape the compiled `SITE` constant has, but resolved from the
 * database. Components that used to read `SITE.x` now read `site.x` and pick
 * up whatever the super admin saved, with the compiled value as the fallback.
 */
export function useSite() {
  const { setting } = useSiteConfig()

  return useMemo(() => {
    const phone = setting('contact.phone', FALLBACK_SITE.phone)
    const whatsapp = setting('contact.whatsapp', '250788000000')
    const url = setting('seo.site_url', FALLBACK_SITE.url).replace(/\/$/, '')

    return {
      name: setting('brand.name', FALLBACK_SITE.name),
      shortName: setting('brand.short_name', FALLBACK_SITE.shortName),
      tagline: setting('brand.tagline', FALLBACK_SITE.tagline),
      founded: setting('company.founded', FALLBACK_SITE.founded),
      city: FALLBACK_SITE.city,
      country: FALLBACK_SITE.country,
      url,
      domain: url.replace(/^https?:\/\//, ''),
      email: setting('contact.email', FALLBACK_SITE.email),
      salesEmail: setting('contact.sales_email', FALLBACK_SITE.salesEmail),
      phone,
      // Strip spacing so the tel: link dials correctly.
      phoneHref: `tel:${phone.replace(/[^\d+]/g, '')}`,
      whatsapp,
      whatsappHref: `https://wa.me/${whatsapp.replace(/\D/g, '')}`,
      // Empty string means "not configured" — callers hide the row rather than
      // printing a MoMo code that does not exist.
      momoCode: setting('contact.momo_code', ''),
      address: setting('contact.address', FALLBACK_SITE.address),
      hours: setting('contact.hours', FALLBACK_SITE.hours),
      saturdayHours: setting('contact.hours_saturday', FALLBACK_SITE.saturdayHours),
      handle: setting('social.handle', FALLBACK_SITE.handle),
      rdb: setting('company.rdb', FALLBACK_SITE.rdb),
      description: setting('company.description', FALLBACK_SITE.description),
      logoMark: setting('brand.logo_mark', '/brand/logo-mark.png'),
      logoMarkLight: setting('brand.logo_mark_light', '/brand/logo-mark-light.png'),
      ogImage: setting('seo.og_image', '/brand/logo-horizontal.png'),
      defaultTitle: setting('seo.default_title', FALLBACK_SITE.name),
      defaultDescription: setting('seo.default_description', FALLBACK_SITE.description),
    }
  }, [setting])
}

/** Social links, in the order the footer and navbar render them. */
export function useSocials() {
  const { setting } = useSiteConfig()

  return useMemo(
    () =>
      (
        [
          { name: 'Instagram', key: 'social.instagram', icon: 'Instagram' },
          { name: 'Facebook', key: 'social.facebook', icon: 'Facebook' },
          { name: 'LinkedIn', key: 'social.linkedin', icon: 'Linkedin' },
          { name: 'YouTube', key: 'social.youtube', icon: 'Youtube' },
        ] as const
      )
        .map((s) => ({ name: s.name, icon: s.icon, href: setting(s.key) }))
        // An admin clearing a URL removes the icon rather than linking nowhere.
        .filter((s) => Boolean(s.href)),
    [setting],
  )
}

/**
 * The header menu, shaped exactly like the compiled `NAV_ITEMS` the navbar was
 * written against — so the markup is unchanged and an admin reordering the
 * menu in the database reorders the real header.
 */
export function useNavItems(menu = 'header'): NavItem[] {
  const { navigation } = useSiteConfig()

  return useMemo(
    () =>
      navigation
        .filter((item) => item.menu === menu)
        .map((item) => ({
          label: item.label,
          to: item.href,
          tKey: (item.translation_key ?? item.label) as NavItem['tKey'],
          children: item.children.length
            ? item.children.map((child) => ({
                label: child.label,
                to: child.href,
                description: child.description ?? '',
                icon: child.icon ?? 'ArrowRight',
              }))
            : undefined,
        })),
    [navigation, menu],
  )
}
