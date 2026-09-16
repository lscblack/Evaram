import { motion } from 'framer-motion'
import { useBlock, useBlockItems } from '@/lib/queries'
import { Icon } from '@/components/ui/Icon'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { fadeUp, revealProps, stagger } from '@/lib/motion'

export function WhyEvaramu() {
  const block = useBlock('home', 'why', {
    eyebrow: "How we work",
    title: "Four things we hold to",
    accent: "on every engagement.",
    body: "Land in Rwanda changes hands on trust more than on paper. These are the commitments that replace trust with paperwork.",
  })
  const points = useBlockItems<{ title: string; description: string; icon: string }>('home', 'trust_points')

  return (
    <section className="bg-surface py-16 lg:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow={block.eyebrow}
          title={block.title}
          accent={block.accent}
          description={block.body}
        />

        {/* ---- trust points ---- */}
        <motion.div
          {...revealProps}
          variants={stagger(0.09)}
          className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {points.map((point) => (
            <motion.div
              key={point.title}
              variants={fadeUp}
              className="group rounded-3xl border border-line bg-canvas p-7 transition-all duration-500 ease-brand hover:-translate-y-1.5 hover:bg-navy-900"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-gold-500 text-white">
                <Icon name={point.icon} className="size-[1.35rem]" strokeWidth={2} />
              </span>
              <h3 className="mt-5 font-display text-xl leading-snug font-bold text-ink transition-colors duration-500 group-hover:text-white">
                {point.title}
              </h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft transition-colors duration-500 group-hover:text-white/65">
                {point.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
