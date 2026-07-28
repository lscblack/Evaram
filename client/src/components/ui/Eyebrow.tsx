import { cn } from '@/lib/utils'

/**
 * The small gold rule + label that opens nearly every section on the site.
 */
export function Eyebrow({
  children,
  className,
  tone = 'dark',
  align = 'left',
}: {
  children: React.ReactNode
  className?: string
  tone?: 'dark' | 'light'
  align?: 'left' | 'center'
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3',
        align === 'center' && 'justify-center',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'h-px w-8 shrink-0',
          tone === 'dark' ? 'bg-gold-500' : 'bg-gold-400',
        )}
      />
      <span
        className={cn(
          'text-[0.6875rem] font-bold tracking-[0.22em] uppercase',
          tone === 'dark' ? 'text-gold-600' : 'text-gold-300',
        )}
      >
        {children}
      </span>
    </div>
  )
}
