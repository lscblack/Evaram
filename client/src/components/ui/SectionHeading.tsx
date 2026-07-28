import { motion } from 'framer-motion'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { cn } from '@/lib/utils'
import { fadeUp, revealProps, stagger } from '@/lib/motion'

export function SectionHeading({
  eyebrow,
  title,
  accent,
  description,
  align = 'left',
  tone = 'dark',
  className,
  action,
}: {
  eyebrow?: string
  title: React.ReactNode
  /** Appended to the title in gold — usually the emphasised phrase. */
  accent?: string
  description?: React.ReactNode
  align?: 'left' | 'center'
  tone?: 'dark' | 'light'
  className?: string
  action?: React.ReactNode
}) {
  return (
    <motion.div
      {...revealProps}
      variants={stagger(0.09)}
      className={cn(
        'flex flex-col gap-6',
        align === 'center' && 'items-center text-center',
        Boolean(action) && 'lg:flex-row lg:items-end lg:justify-between lg:gap-12',
        className,
      )}
    >
      <div className={cn('max-w-3xl', align === 'center' && 'mx-auto')}>
        {eyebrow && (
          <motion.div variants={fadeUp}>
            <Eyebrow tone={tone} align={align}>
              {eyebrow}
            </Eyebrow>
          </motion.div>
        )}

        <motion.h2
          variants={fadeUp}
          className={cn(
            'mt-5 text-[1.75rem] leading-[1.15] font-semibold sm:text-[2.125rem] lg:text-[2.5rem]',
            tone === 'dark' ? 'text-ink' : 'text-white',
          )}
        >
          {title}
          {accent && (
            <>
              {' '}
              <span className="text-gradient-gold">{accent}</span>
            </>
          )}
        </motion.h2>

        {description && (
          <motion.p
            variants={fadeUp}
            className={cn(
              'mt-5 text-[0.9375rem] leading-relaxed',
              tone === 'dark' ? 'text-ink-soft' : 'text-white/60',
            )}
          >
            {description}
          </motion.p>
        )}
      </div>

      {action && (
        <motion.div variants={fadeUp} className="shrink-0">
          {action}
        </motion.div>
      )}
    </motion.div>
  )
}
