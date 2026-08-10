/**
 * The house motion system.
 *
 * Three rules hold the whole thing together:
 *
 *  1. **One easing family.** Everything decelerates on `EASE`, which mirrors
 *     `--ease-brand` in index.css so CSS transitions and Framer animations feel
 *     like the same hand. Springs are reserved for things a pointer touches.
 *  2. **Distance scales with the element.** A card lifts 28px; a whole section
 *     lifts 48px; a word in a heading lifts 14px. Everything moving the same
 *     amount is what makes a page read as a template.
 *  3. **Reveal once, on the way in.** Sections animate as they enter and then
 *     stay put. Re-animating on every scroll pass is nausea, not polish.
 *
 * Every variant here degrades to a plain fade when the visitor asks for reduced
 * motion — see `useReducedMotionSafe` in lib/scroll.ts and the `reduced`
 * fallbacks below.
 */

import type { Variants, Transition } from 'framer-motion'

/* ------------------------------------------------------------------- easing */

/** The house easing — matches `--ease-brand` in index.css. */
export const EASE: Transition['ease'] = [0.22, 1, 0.36, 1]

/** Sharper stop, for small elements that should feel crisp rather than soft. */
export const EASE_SNAP: Transition['ease'] = [0.16, 1, 0.3, 1]

/** Symmetrical, for things that move both ways — drawers, accordions, tabs. */
export const EASE_INOUT: Transition['ease'] = [0.65, 0, 0.35, 1]

/** Anything a pointer drives. Springs read as responsive; curves read as canned. */
export const SPRING: Transition = { type: 'spring', stiffness: 320, damping: 30, mass: 0.8 }

/** Looser spring for larger travel — panels, sheets, the mobile menu. */
export const SPRING_SOFT: Transition = { type: 'spring', stiffness: 180, damping: 26, mass: 1 }

/** Durations, named so a review can argue about the number in one place. */
export const DUR = {
  fast: 0.28,
  base: 0.55,
  slow: 0.75,
  editorial: 1.1,
} as const

/* ----------------------------------------------------------------- variants */

/**
 * The workhorse. Card-scale travel — anything in a grid or a list.
 * Kept at the original 28px so existing pages are unchanged by this rewrite.
 */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.8, ease: EASE } },
}

export const fadeLeft: Variants = {
  hidden: { opacity: 0, x: -32 },
  show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } },
}

export const fadeRight: Variants = {
  hidden: { opacity: 0, x: 32 },
  show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: EASE } },
}

/* -- added by the rebuild ------------------------------------------------- */

/** Section-scale travel. Use on a whole band of content, not on a card. */
export const riseSection: Variants = {
  hidden: { opacity: 0, y: 48 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.slow, ease: EASE } },
}

/**
 * Focus-pull. The blur is what makes this read as expensive rather than busy —
 * use it sparingly, on the one element a section is actually about.
 */
export const blurUp: Variants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(12px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: DUR.editorial, ease: EASE },
  },
}

/** Heading words, revealed from behind their own baseline. Pair with `clipMask`. */
export const lineReveal: Variants = {
  hidden: { y: '110%' },
  show: { y: '0%', transition: { duration: DUR.slow, ease: EASE } },
}

/** The wrapper `lineReveal` needs: hides the word until it rises into place. */
export const clipMask = { overflow: 'hidden', display: 'block' } as const

/** Small, crisp arrival — badges, counters, pills, tags. */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { ...SPRING, delay: 0.05 } },
}

/** Depth without parallax cost — images and media cards settling into place. */
export const settleIn: Variants = {
  hidden: { opacity: 0, scale: 1.06, y: 16 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: DUR.editorial, ease: EASE } },
}

/** A rule or underline drawing itself. Needs `transform-origin: left`. */
export const drawLine: Variants = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: DUR.slow, ease: EASE } },
}

/** Panels and drawers, which must animate out as well as in. */
export const sheet: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.fast, ease: EASE_SNAP } },
  exit: { opacity: 0, y: 8, transition: { duration: 0.18, ease: EASE_INOUT } },
}

/** What every variant collapses to under `prefers-reduced-motion`. */
export const reduced: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
}

/* ----------------------------------------------------------------- staggers */

/** Parent wrapper that staggers its children. */
export const stagger = (staggerChildren = 0.09, delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren, delayChildren } },
})

/** Long lists — a 0.09s step across twenty rows is a four-second wait. */
export const staggerTight = (delayChildren = 0): Variants => stagger(0.04, delayChildren)

/** Two or three hero-level children that deserve the pause. */
export const staggerSlow = (delayChildren = 0): Variants => stagger(0.14, delayChildren)

/* ---------------------------------------------------------------- viewports */

/** Standard viewport config so every section reveals at the same point. */
export const viewportOnce = { once: true, amount: 0.2 } as const

/** For tall sections, where waiting for 20% visibility means waiting too long. */
export const viewportEarly = { once: true, amount: 0.05 } as const

/** Reveal props used by almost every section on the site. */
export const revealProps = {
  initial: 'hidden',
  whileInView: 'show',
  viewport: viewportOnce,
} as const

/** Same, but fires as soon as the element's top edge clears the fold. */
export const revealEarly = {
  initial: 'hidden',
  whileInView: 'show',
  viewport: viewportEarly,
} as const

/** For content that mounts already in view — modals, route bodies, admin panels. */
export const enterProps = { initial: 'hidden', animate: 'show' } as const

/* -------------------------------------------------------------- interaction */

/** Card hover. Subtle on purpose: the shadow does the work, not the travel. */
export const hoverLift = {
  whileHover: { y: -4, transition: SPRING },
  whileTap: { y: -1, transition: SPRING },
} as const

/** Buttons and icon targets. */
export const hoverPress = {
  whileHover: { scale: 1.03, transition: SPRING },
  whileTap: { scale: 0.97, transition: SPRING },
} as const

/* ------------------------------------------------------- route transitions */

/**
 * Page-level transition. Slightly more than a crossfade so a navigation reads
 * as a change of place, but short enough that it never delays reading.
 */
export const routeTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: EASE_INOUT } },
} as const
