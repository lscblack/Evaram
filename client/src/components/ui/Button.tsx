import { Link } from 'react-router-dom'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'gold' | 'outline' | 'ghost' | 'light' | 'outline-light'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  /* `ink` inverts with the theme, so primary stays high-contrast in both. */
  primary: 'bg-ink text-canvas shadow-soft hover:bg-gold-500 hover:text-white hover:shadow-lift',
  gold: 'bg-gold-500 text-white hover:bg-gold-600 shadow-gold active:bg-gold-700',
  outline:
    'border border-line-strong bg-transparent text-ink hover:border-ink-muted hover:bg-canvas-alt',
  ghost: 'text-ink hover:bg-accent-soft',
  light: 'bg-surface text-ink hover:bg-canvas-alt shadow-soft',
  'outline-light':
    'border border-white/30 text-white hover:border-white/70 hover:bg-white/10 backdrop-blur-sm',
}

const SIZES: Record<Size, string> = {
  sm: 'h-10 px-4 text-sm gap-1.5',
  md: 'h-12 px-6 text-[0.9375rem] gap-2',
  lg: 'h-14 px-8 text-base gap-2.5',
}

const BASE =
  'group/btn relative inline-flex shrink-0 items-center justify-center rounded-full font-semibold ' +
  'transition-[background-color,border-color,box-shadow,transform,color] duration-300 ease-brand ' +
  'hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50 ' +
  'whitespace-nowrap'

interface CommonProps {
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
  /** Rendered after the label — usually an arrow icon. */
  trailing?: ReactNode
  leading?: ReactNode
}

type AnchorProps = CommonProps &
  Omit<ComponentPropsWithoutRef<'a'>, keyof CommonProps> & { href: string; to?: never }

type RouterProps = CommonProps & { to: string; href?: never }

type NativeButtonProps = CommonProps &
  Omit<ComponentPropsWithoutRef<'button'>, keyof CommonProps> & { to?: never; href?: never }

export type ButtonProps = AnchorProps | RouterProps | NativeButtonProps

export function Button(props: ButtonProps) {
  const {
    variant = 'primary',
    size = 'md',
    className,
    children,
    trailing,
    leading,
    ...rest
  } = props as CommonProps & Record<string, unknown>

  const classes = cn(BASE, VARIANTS[variant], SIZES[size], className)
  const content = (
    <>
      {leading}
      <span>{children}</span>
      {trailing}
    </>
  )

  if ('to' in props && props.to) {
    return (
      <Link to={props.to} className={classes}>
        {content}
      </Link>
    )
  }

  if ('href' in props && props.href) {
    const { href, ...anchorRest } = rest as ComponentPropsWithoutRef<'a'> & { href: string }
    const external = href.startsWith('http') || href.startsWith('tel:') || href.startsWith('mailto:')
    return (
      <a
        href={href}
        className={classes}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...anchorRest}
      >
        {content}
      </a>
    )
  }

  return (
    <button className={classes} {...(rest as ComponentPropsWithoutRef<'button'>)}>
      {content}
    </button>
  )
}
