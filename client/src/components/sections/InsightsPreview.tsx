import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Clock } from 'lucide-react'
import { useBlock, useQuery } from '@/lib/queries'
import type { ApiInsightCard, Page } from '@/types/api'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { fadeUp, revealProps, stagger } from '@/lib/motion'
import { formatDate } from '@/lib/utils'

export function InsightsPreview() {
  const block = useBlock('home', 'insights', {
    eyebrow: "Insights",
    title: "We publish what we",
    accent: "actually see.",
    body: "Monthly market reports, wealth education and construction cost breakdowns. Almost no agent in Rwanda publishes anything useful — we treat that as an opportunity.",
  })
  const { data } = useQuery<Page<ApiInsightCard>>('/public/insights?per_page=8')
  const posts = data?.items ?? []
  // Editors flag what leads; if nothing is flagged the newest three still fill it.
  const featured = posts.filter((p) => p.is_featured)
  const [lead, ...rest] = (featured.length >= 3 ? featured : posts).slice(0, 3)

  if (!lead) return null

  return (
    <section className="bg-canvas py-16 lg:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow={block.eyebrow}
          title={block.title}
          accent={block.accent}
          description="Monthly market reports, wealth education and construction cost breakdowns. Almost no agent in Rwanda publishes anything useful — we treat that as an opportunity."
          action={
            <Button
              to="/insights"
              variant="outline"
              trailing={
                <ArrowRight
                  className="size-[1.05rem] transition-transform duration-300 group-hover/btn:translate-x-1"
                  strokeWidth={2.3}
                />
              }
            >
              All insights
            </Button>
          }
        />

        <motion.div
          {...revealProps}
          variants={stagger(0.1)}
          className="mt-14 grid gap-6 lg:grid-cols-2"
        >
          {/* ---- lead article ---- */}
          <motion.article
            variants={fadeUp}
            className="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-soft transition-all duration-500 ease-brand hover:-translate-y-1.5 hover:shadow-lift"
          >
            <div className="relative h-64 overflow-hidden sm:h-80">
              <img
                src={lead.cover_url ?? undefined}
                alt={lead.title}
                loading="lazy"
                className="size-full object-cover transition-transform duration-900 ease-brand group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 to-transparent" />
              <span className="absolute top-5 left-5 rounded-full bg-gold-500 px-3.5 py-1.5 text-[0.6875rem] font-bold tracking-wide text-white uppercase">
                {lead.category}
              </span>
            </div>

            <div className="flex flex-1 flex-col p-7">
              <div className="flex items-center gap-4 text-[0.8125rem] text-ink-muted">
                <time dateTime={lead.published_at ?? ''}>{formatDate(lead.published_at ?? '')}</time>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5" strokeWidth={2.2} />
                  {lead.read_time} min read
                </span>
              </div>

              <h3 className="mt-4 font-display text-2xl leading-snug font-bold text-ink transition-colors duration-300 group-hover:text-gold-600 sm:text-[1.75rem]">
                <Link to={`/insights/${lead.slug}`} className="before:absolute before:inset-0">
                  {lead.title}
                </Link>
              </h3>

              <p className="mt-3 line-clamp-3 text-[0.9375rem] leading-relaxed text-ink-soft">
                {lead.excerpt}
              </p>

              <div className="mt-auto flex items-center justify-between gap-4 pt-6">
                <p className="text-[0.875rem] text-ink-muted">
                  <span className="font-semibold text-ink">{lead.author_name}</span>
                  <span className="block text-[0.8125rem] text-ink-muted">{lead.author_role}</span>
                </p>
                <span className="grid size-11 place-items-center rounded-full bg-accent-soft text-ink-soft transition-colors duration-300 group-hover:bg-gold-500 group-hover:text-white">
                  <ArrowUpRight className="size-5" strokeWidth={2.2} />
                </span>
              </div>
            </div>
          </motion.article>

          {/* ---- secondary articles ---- */}
          <div className="flex flex-col gap-6">
            {rest.map((post) => (
              <motion.article
                key={post.slug}
                variants={fadeUp}
                className="group relative flex flex-1 gap-5 overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-soft transition-all duration-500 ease-brand hover:-translate-y-1.5 hover:shadow-lift sm:gap-6 sm:p-6"
              >
                <div className="hidden h-full w-40 shrink-0 overflow-hidden rounded-2xl sm:block lg:w-44">
                  <img
                    src={post.cover_url ?? undefined}
                    alt={post.title}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-900 ease-brand group-hover:scale-110"
                  />
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="text-[0.6875rem] font-bold tracking-[0.16em] text-gold-600 uppercase">
                    {post.category}
                  </p>

                  <h3 className="mt-2.5 font-display text-xl leading-snug font-bold text-ink transition-colors duration-300 group-hover:text-gold-600">
                    <Link to={`/insights/${post.slug}`} className="before:absolute before:inset-0">
                      {post.title}
                    </Link>
                  </h3>

                  <p className="mt-2.5 line-clamp-2 text-[0.9375rem] leading-relaxed text-ink-soft">
                    {post.excerpt}
                  </p>

                  <div className="mt-auto flex items-center gap-4 pt-4 text-[0.8125rem] text-ink-muted">
                    <time dateTime={post.published_at ?? ''}>{formatDate(post.published_at ?? '')}</time>
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3.5" strokeWidth={2.2} />
                      {post.read_time} min
                    </span>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
