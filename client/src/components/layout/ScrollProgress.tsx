import { motion } from 'framer-motion'
import { useScrollProgress, useReducedMotionSafe } from '@/lib/scroll'

/**
 * Reading-progress bar pinned under the header.
 *
 * `scaleX` rather than `width` so it animates on the compositor and never
 * triggers layout. Hidden entirely under reduced-motion — a bar that tracks
 * scroll is scroll-linked movement by definition.
 */
export function ScrollProgress() {
  const progress = useScrollProgress()
  const reduced = useReducedMotionSafe()

  if (reduced) return null

  return (
    <motion.div
      aria-hidden
      style={{ scaleX: progress }}
      className="fixed inset-x-0 top-0 z-60 h-0.5 origin-left bg-gold-500"
    />
  )
}
