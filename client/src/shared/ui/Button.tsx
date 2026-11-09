import { forwardRef, type ButtonHTMLAttributes, type ComponentType, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import { Loader2 } from 'lucide-react'
import { cn } from './cn'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'gold'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-brand-900 text-white hover:bg-brand-800 active:bg-brand-950 disabled:bg-brand-900/50',
  secondary: 'bg-brand-50 text-brand-900 hover:bg-brand-100 disabled:opacity-50',
  outline: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-50',
  ghost: 'text-slate-700 hover:bg-slate-100 disabled:opacity-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/50',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-600/50',
  gold: 'bg-gold-500 text-white hover:bg-gold-600 disabled:bg-gold-500/50',
}

// Mobile-first: every size keeps at least a 40px tap target; "md" and up are 44px.
const sizes: Record<Size, string> = {
  sm: 'h-10 sm:h-9 px-3 text-sm gap-1.5',
  md: 'h-11 sm:h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
}

const base =
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed select-none'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ComponentType<{ className?: string }>
  block?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon: Icon, block, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], block && 'w-full', className)}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : Icon ? <Icon className="size-4 shrink-0" /> : null}
      {children}
    </button>
  )
})

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  block,
  className,
  children,
  ...rest
}: LinkProps & { variant?: Variant; size?: Size; icon?: ComponentType<{ className?: string }>; block?: boolean; children?: ReactNode }) {
  return (
    <Link className={cn(base, variants[variant], sizes[size], block && 'w-full', className)} {...rest}>
      {Icon ? <Icon className="size-4 shrink-0" /> : null}
      {children}
    </Link>
  )
}

export function IconButton({
  label,
  icon: Icon,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: ComponentType<{ className?: string }> }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-brand-500',
        className,
      )}
      {...rest}
    >
      <Icon className="size-5" />
    </button>
  )
}
