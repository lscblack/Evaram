/**
 * Scroll-driven motion.
 *
 * Everything here is built on Framer's `useScroll`, which reads from rAF rather
 * than a scroll listener, so none of it costs a layout on the scroll thread.
 *
 * All of it is inert under `prefers-reduced-motion`: parallax returns a static
 * value and the progress bar stops animating. Scroll-linked movement is the
 * single worst offender for vestibular disorders, so this is not optional.
 */

import { useEffect, useState, type RefObject } from 'react'
import {
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion'

/**
 * `useReducedMotion` with SSR-safe defaults.
 *
 * Framer returns `null` before it has read the media query; treating that as
 * "reduce" for one frame would flash static content at everyone, so it resolves
 * to false and the hook re-renders once the real value arrives.
 */
export function useReducedMotionSafe(): boolean {
  return useReducedMotion() ?? false
}

/**
 * Document scroll as 0→1, smoothed.
 *
 * The spring matters: raw scroll progress on a trackpad is jittery enough to be
 * visible in a 3px bar.
 */
export function useScrollProgress(): MotionValue<number> {
  const { scrollYProgress } = useScroll()
  return useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 })
}

/**
 * Parallax for one element, driven by its own position in the viewport.
 *
 * `distance` is the total travel in pixels across the element's full pass —
 * positive drifts down, negative drifts up. Keep it under ~80px: past that the
 * element visibly detaches from the text it belongs to.
 */
export function useParallax(ref: RefObject<HTMLElement | null>, distance = 60): MotionValue<number> {
  const reduced = useReducedMotionSafe()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  return useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [-distance / 2, distance / 2])
}

/**
 * Scale/fade a hero as it leaves — the "the page is moving under you" effect.
 * Returns values to spread onto a `motion.div` style.
 */
export function useHeroScroll(ref: RefObject<HTMLElement | null>) {
  const reduced = useReducedMotionSafe()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [0, 120])
  const opacity = useTransform(scrollYProgress, [0, 0.8], reduced ? [1, 1] : [1, 0])
  const scale = useTransform(scrollYProgress, [0, 1], reduced ? [1, 1] : [1, 1.08])
  return { y, opacity, scale }
}

/**
 * True once the page has scrolled past `offset`.
 *
 * Used for the sticky-header state and the back-to-top affordance. A plain
 * listener rather than a MotionValue because consumers need a boolean to switch
 * classes on, and re-rendering on every pixel would be worse.
 */
export function useScrolledPast(offset = 24): boolean {
  const [past, setPast] = useState(false)

  useEffect(() => {
    let frame = 0
    const read = () => {
      frame = 0
      setPast(window.scrollY > offset)
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(read)
    }
    read()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [offset])

  return past
}
