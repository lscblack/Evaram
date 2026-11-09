import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ChevronLeft, ChevronRight, HardHat, MapPin, X } from 'lucide-react'
import { Seo, breadcrumbJsonLd } from '@/components/Seo'
import { PageHero } from '@/components/layout/PageHero'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { useQuery } from '@/lib/queries'
import { fadeUp, revealProps, stagger } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { PROJECT_KINDS, kindLabel } from '@/data/construction'
import type { ProjectKind, ShowcaseProject } from '@/types/api'

/**
 * The construction portfolio — what we have actually built, surveyed and drawn.
 *
 * Fed by the construction manager marking finished jobs as showcased. Only what
 * a prospective client should see: the work, where it was, when, and the
 * photographs. Never who paid for it or what it cost.
 */
export default function ConstructionProjectsPage() {
  const { data, loading } = useQuery<ShowcaseProject[]>('/public/construction/projects')
  const projects = useMemo(() => data ?? [], [data])
  const [kind, setKind] = useState<ProjectKind | ''>('')
  const [openRef, setOpenRef] = useState<string | null>(null)

  const kinds = useMemo(
    () => PROJECT_KINDS.filter((k) => projects.some((p) => p.kind === k.id)),
    [projects],
  )
  const shown = kind ? projects.filter((p) => p.kind === kind) : projects
  const open = projects.find((p) => p.reference === openRef) ?? null

  return (
    <>
      <Seo
        title="Projects we have built"
        description="Surveys, drawings, permits and builds completed by Evaramu's construction division across Rwanda."
        path="/construction/projects"
        jsonLd={[
          breadcrumbJsonLd([
            { name: 'Construction', path: '/construction' },
            { name: 'Projects', path: '/construction/projects' },
          ]),
        ]}
      />

      <PageHero
        eyebrow="Construction"
        title="Projects we have"
        accent="built."
        description="Every job here was surveyed, drawn, permitted or built by our own division and signed off by the client. The pictures are ours, taken on site."
        crumbs={[{ label: 'Construction', to: '/construction' }, { label: 'Projects' }]}
        image="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=2000&q=80"
        compact
      />

      <section className="bg-canvas py-16 lg:py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow="Portfolio"
            title="Finished work,"
            accent="not renderings."
            description="Filter by the kind of work you need done — a land survey before you buy, drawings and a permit for a plot you own, or a full build."
          />

          {kinds.length > 1 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {[{ id: '' as const, label: 'Everything' }, ...kinds].map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setKind(k.id)}
                  className={cn(
                    'rounded-full border px-4 py-2 text-[0.8125rem] font-semibold transition-colors',
                    kind === k.id
                      ? 'border-ink bg-ink text-canvas'
                      : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink',
                  )}
                >
                  {k.label}
                </button>
              ))}
            </div>
          )}

          {loading && projects.length === 0 ? (
            <div className="grid min-h-64 place-items-center">
              <div className="size-8 animate-spin rounded-full border-2 border-line border-t-gold-500" />
            </div>
          ) : shown.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-line bg-surface p-10 text-center">
              <HardHat className="mx-auto size-8 text-ink-faint" strokeWidth={1.6} />
              <p className="mt-4 font-display text-lg font-semibold text-ink">
                Our first projects are being photographed.
              </p>
              <p className="mx-auto mt-2 max-w-md text-[0.9375rem] text-ink-muted">
                Ask us for references in the meantime — we will put you in touch with a client whose
                build is finished.
              </p>
              <Button to="/construction#brief" variant="gold" className="mt-6">
                Request a quotation
              </Button>
            </div>
          ) : (
            <motion.ul
              {...revealProps}
              variants={stagger(0.06)}
              className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {shown.map((project) => (
                <motion.li key={project.reference} variants={fadeUp}>
                  <button
                    type="button"
                    onClick={() => setOpenRef(project.reference)}
                    className="group block w-full overflow-hidden rounded-3xl border border-line bg-surface text-left transition-[transform,box-shadow,border-color] duration-500 ease-brand hover:-translate-y-1 hover:border-line-strong hover:shadow-lift"
                  >
                    <div className="relative aspect-4/3 overflow-hidden bg-navy-950">
                      {project.photos[0] ? (
                        <img
                          src={project.photos[0].url}
                          alt={project.title}
                          loading="lazy"
                          className="size-full object-cover transition-transform duration-700 ease-brand group-hover:scale-105"
                        />
                      ) : (
                        <div className="grid size-full place-items-center text-white/30">
                          <HardHat className="size-10" strokeWidth={1.4} />
                        </div>
                      )}
                      <span className="absolute top-4 left-4 rounded-full bg-white/90 px-2.5 py-1 text-[0.6875rem] font-semibold text-navy-900 backdrop-blur-md">
                        {kindLabel(project.kind)}
                      </span>
                      {project.photos.length > 1 && (
                        <span className="absolute right-4 bottom-4 rounded-full bg-navy-950/70 px-2.5 py-1 text-[0.6875rem] font-semibold text-white backdrop-blur-md">
                          {project.photos.length} photos
                        </span>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-display text-[1.0625rem] leading-snug font-semibold text-ink transition-colors group-hover:text-gold-600">
                        {project.title}
                      </h3>
                      <p className="mt-1.5 flex items-center gap-1.5 text-[0.8125rem] text-ink-muted">
                        <MapPin className="size-3.5 shrink-0" strokeWidth={2} />
                        {[project.sector, project.district].filter(Boolean).join(', ') || 'Rwanda'}
                        {project.completed_on && ` · ${new Date(project.completed_on).getFullYear()}`}
                      </p>
                      {project.summary && (
                        <p className="mt-3 line-clamp-3 text-[0.875rem] leading-relaxed text-ink-soft">
                          {project.summary}
                        </p>
                      )}
                    </div>
                  </button>
                </motion.li>
              ))}
            </motion.ul>
          )}

          <div className="mt-14 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-navy-950 px-6 py-8 sm:px-10">
            <div>
              <p className="font-display text-xl font-semibold text-white">Have a plot and a plan?</p>
              <p className="mt-1 text-[0.9375rem] text-white/60">
                Send us the brief — a priced bill of quantities, not a guess, comes back.
              </p>
            </div>
            <Button to="/construction#brief" variant="gold" size="lg">
              Request a quotation
              <ArrowRight className="size-4" strokeWidth={2.3} />
            </Button>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {open && <ProjectLightbox project={open} onClose={() => setOpenRef(null)} />}
      </AnimatePresence>
    </>
  )
}

/** One project, full screen: its pictures one at a time, and the story. */
function ProjectLightbox({ project, onClose }: { project: ShowcaseProject; onClose: () => void }) {
  const [index, setIndex] = useState(0)
  const photos = project.photos
  const step = (delta: number) => setIndex((i) => (i + delta + photos.length) % photos.length)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-60 flex items-center justify-center bg-navy-950/95 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={project.title}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-5 right-5 grid size-12 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <X className="size-6" strokeWidth={2.2} />
      </button>

      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-12" onClick={(e) => e.stopPropagation()}>
        <div className="relative lg:col-span-8">
          {photos[index] ? (
            <motion.img
              key={photos[index].url}
              src={photos[index].url}
              alt={photos[index].caption ?? project.title}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-h-[75dvh] w-full rounded-2xl object-contain"
            />
          ) : (
            <div className="grid aspect-4/3 place-items-center rounded-2xl bg-white/5 text-white/30">
              <HardHat className="size-12" strokeWidth={1.4} />
            </div>
          )}
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous photo"
                className="absolute top-1/2 left-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-navy-950/60 text-white backdrop-blur-md transition-colors hover:bg-gold-500"
              >
                <ChevronLeft className="size-5" strokeWidth={2.4} />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next photo"
                className="absolute top-1/2 right-3 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-navy-950/60 text-white backdrop-blur-md transition-colors hover:bg-gold-500"
              >
                <ChevronRight className="size-5" strokeWidth={2.4} />
              </button>
              <span className="absolute bottom-3 left-3 rounded-full bg-navy-950/70 px-3 py-1 text-[0.75rem] font-medium text-white">
                {index + 1} / {photos.length}
                {photos[index]?.caption ? ` · ${photos[index].caption}` : ''}
              </span>
            </>
          )}
        </div>
        <div className="text-white lg:col-span-4">
          <p className="text-[0.6875rem] font-semibold tracking-[0.16em] text-gold-300 uppercase">
            {kindLabel(project.kind)}
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold">{project.title}</h2>
          <p className="mt-2 flex items-center gap-1.5 text-[0.875rem] text-white/60">
            <MapPin className="size-4 shrink-0" strokeWidth={2} />
            {[project.sector, project.district].filter(Boolean).join(', ') || 'Rwanda'}
            {project.completed_on && ` · completed ${new Date(project.completed_on).getFullYear()}`}
          </p>
          {project.summary && (
            <p className="mt-5 text-[0.9375rem] leading-relaxed whitespace-pre-line text-white/80">
              {project.summary}
            </p>
          )}
          <p className="mt-6 font-mono text-[0.6875rem] text-white/30">{project.reference}</p>
        </div>
      </div>
    </motion.div>
  )
}
