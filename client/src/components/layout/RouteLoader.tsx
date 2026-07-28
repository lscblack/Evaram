import { motion } from 'framer-motion'

/** Shown while a lazily-loaded route chunk is in flight. */
export function RouteLoader() {
  return (
    <div className="grid min-h-[70vh] place-items-center bg-canvas">
      <div className="flex flex-col items-center gap-6">
        <div className="relative size-16">
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border-2 border-line"
          />
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold-500"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
          />
          <img
            src="/brand/logo-mark.png"
            alt=""
            aria-hidden
            className="absolute inset-0 m-auto size-8 object-contain"
          />
        </div>
        <p className="text-[0.8125rem] font-semibold tracking-[0.22em] text-ink-muted uppercase">
          Loading
        </p>
      </div>
    </div>
  )
}
