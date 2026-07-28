import { motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/**
 * Light/dark switch. The knob slides; only the incoming glyph is rendered so
 * the two never cross-fade into a smudge.
 */
export function ThemeToggle({ className, tone = 'dark' }: { className?: string; tone?: 'dark' | 'light' }) {
  const { resolved, toggle } = useTheme()
  const t = useT()
  const isDark = resolved === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? t('common.lightMode') : t('common.darkMode')}
      title={isDark ? t('common.lightMode') : t('common.darkMode')}
      className={cn(
        'relative inline-flex h-9 w-16 shrink-0 items-center rounded-full border p-1 transition-colors duration-300',
        tone === 'dark'
          ? 'border-line bg-canvas-alt hover:border-line-strong'
          : 'border-white/20 bg-white/10 hover:border-white/40',
        className,
      )}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 34 }}
        className={cn(
          'grid size-7 place-items-center rounded-full shadow-sm',
          isDark ? 'ml-auto bg-navy-800 text-gold-300' : 'mr-auto bg-white text-gold-600',
        )}
      >
        {isDark ? (
          <Moon className="size-4" strokeWidth={2.2} />
        ) : (
          <Sun className="size-4" strokeWidth={2.2} />
        )}
      </motion.span>
    </button>
  )
}
