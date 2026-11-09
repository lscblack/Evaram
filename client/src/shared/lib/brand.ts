import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import type { PublicSettings } from '@/shared/api/types'

/**
 * Logo derivatives in /public/brand, cropped from the supplied originals:
 *  - horizontal / mark: navy + gold on transparent, for light surfaces
 *  - *Reversed: navy ink turned white (gold kept), for navy/dark surfaces
 */
export const LOGO = {
  horizontal: '/brand/logo-horizontal-tight.webp',
  horizontalReversed: '/brand/logo-horizontal-reversed.webp',
  mark: '/brand/logo-mark-tight.webp',
  markReversed: '/brand/logo-mark-reversed.webp',
}

/** Public company settings (name, contact details) managed in System Settings. */
export function usePublicSettings() {
  return useQuery({
    queryKey: ['public', 'settings'],
    queryFn: () => api.publicGet<PublicSettings>('/public/settings'),
    staleTime: 5 * 60_000,
  })
}

export function settingText(s: PublicSettings | undefined, key: string, fallback = ''): string {
  const v = s?.[key]
  return v === undefined || v === null ? fallback : String(v)
}
