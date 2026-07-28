import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { SITE } from '@/data/site'

/**
 * The Evaramu lockup. `mark` renders the crest alone; `full` renders the
 * crest with the wordmark set in the brand typography (sharper than scaling
 * the raster wordmark down to navbar height).
 */
export function Logo({
  variant = 'full',
  tone = 'dark',
  className,
  linkTo = '/',
}: {
  variant?: 'full' | 'mark'
  tone?: 'dark' | 'light'
  className?: string
  linkTo?: string | null
}) {
  const inner = (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {/* Two crests: the navy original for light surfaces, a lifted variant so
          the dark strokes still read against a dark canvas. */}
      <span className="relative block h-9 w-auto shrink-0 sm:h-10">
        <img
          src="/brand/logo-mark.png"
          alt=""
          aria-hidden
          className={cn('h-full w-auto', tone === 'light' ? 'hidden' : 'block dark:hidden')}
          width={160}
          height={156}
        />
        <img
          src="/brand/logo-mark-light.png"
          alt=""
          aria-hidden
          className={cn('h-full w-auto', tone === 'light' ? 'block' : 'hidden dark:block')}
          width={160}
          height={156}
        />
      </span>
      {variant === 'full' && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              'font-display text-[1.35rem] leading-none font-bold tracking-tight sm:text-2xl',
              tone === 'dark' ? 'text-ink' : 'text-white',
            )}
          >
            Evaramu
          </span>
          <span
            className={cn(
              'mt-1 text-[0.5625rem] font-bold tracking-[0.28em] uppercase',
              tone === 'dark' ? 'text-gold-600' : 'text-gold-300',
            )}
          >
            Group Ltd
          </span>
        </span>
      )}
    </span>
  )

  if (!linkTo) return inner

  return (
    <Link to={linkTo} aria-label={`${SITE.name} — home`} className="shrink-0">
      {inner}
    </Link>
  )
}
