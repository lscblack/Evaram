import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion, useScroll, useSpring } from 'framer-motion'
import { ArrowLeft, ArrowUpRight, Check, Clock, Quote, Share2 } from 'lucide-react'
import { Seo, breadcrumbJsonLd } from '@/components/Seo'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { useQuery } from '@/lib/queries'
import { useSite } from '@/lib/siteConfig'
import type { ApiInsightCard, ApiInsightDetail, ApiTeamMember, Page } from '@/types/api'
import { EASE, fadeUp, revealProps, stagger } from '@/lib/motion'
import { formatDate } from '@/lib/utils'
import NotFoundPage from '@/pages/NotFoundPage'

export default function InsightDetailPage() {
  const site = useSite()
  const { slug } = useParams()
  const [copied, setCopied] = useState(false)

  const {
    data: post,
    loading,
    error,
  } = useQuery<ApiInsightDetail>(slug ? `/public/insights/${encodeURIComponent(slug)}` : null)
  const { data: archive } = useQuery<Page<ApiInsightCard>>('/public/insights?per_page=48')
  const { data: team } = useQuery<ApiTeamMember[]>('/public/team')

  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 })

  const related = useMemo(() => {
    if (!post) return []
    return (archive?.items ?? [])
      .filter((p) => p.slug !== post.slug && (p.category === post.category || p.is_featured))
      .slice(0, 3)
  }, [post, archive])

  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(id)
  }, [copied])

  if (loading && !post) {
    return (
      <div className="container-page grid min-h-[60dvh] place-items-center">
        <div className="size-8 animate-spin rounded-full border-2 border-line border-t-gold-500" />
      </div>
    )
  }
  if (error || !post) return <NotFoundPage />

  const author = (team ?? []).find((a) => a.full_name === post.author_name)
  const body = post.body ?? []
  const url = `${site.url}/insights/${post.slug}`

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, url })
        return
      } catch {
        // dismissed
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      /* no-op */
    }
  }

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.cover_url,
    datePublished: post.published_at,
    dateModified: post.published_at,
    author: { '@type': 'Person', name: post.author_name, jobTitle: post.author_role },
    publisher: {
      '@type': 'Organization',
      name: site.name,
      logo: { '@type': 'ImageObject', url: `${site.url}/brand/logo-horizontal.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    keywords: (post.tags ?? []).join(', '),
    wordCount: body.reduce(
      (n, block) => n + (block.text?.split(/\s+/).length ?? 0),
      0,
    ),
  }

  return (
    <>
      <Seo
        title={post.title}
        description={post.excerpt ?? ''}
        path={`/insights/${post.slug}`}
        image={post.cover_url ?? undefined}
        type="article"
        keywords={post.tags ?? []}
        publishedTime={post.published_at ?? undefined}
        author={post.author_name ?? undefined}
        jsonLd={[
          articleJsonLd,
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Insights', path: '/insights' },
            { name: post.title, path: `/insights/${post.slug}` },
          ]),
        ]}
      />

      {/* reading progress */}
      <motion.div
        aria-hidden
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-45 h-1 origin-left bg-gold-500"
      />

      {/* ---------------- header ---------------- */}
      <section className="relative isolate overflow-hidden bg-navy-950 text-white">
        <div className="absolute inset-0 -z-10">
          <img src={post.cover_url ?? undefined} alt="" aria-hidden className="size-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-b from-navy-950/85 via-navy-950/92 to-navy-950" />
        </div>
        <div className="pointer-events-none absolute inset-0 -z-10 bg-blueprint opacity-50" />

        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger(0.08)}
          className="container-page relative py-14 lg:py-20"
        >
          <motion.div variants={fadeUp}>
            <Link
              to="/insights"
              className="group inline-flex items-center gap-2 text-[0.875rem] font-medium text-white/50 transition-colors hover:text-gold-300"
            >
              <ArrowLeft
                className="size-4 transition-transform duration-300 group-hover:-translate-x-1"
                strokeWidth={2.2}
              />
              All insights
            </Link>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-8">
            <Eyebrow tone="light">{post.category}</Eyebrow>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="mt-5 max-w-4xl text-[1.875rem] leading-[1.15] font-semibold sm:text-[2.375rem] lg:text-[2.75rem]"
          >
            {post.title}
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-6 max-w-2xl text-[0.9375rem] leading-relaxed text-white/65 sm:text-lg"
          >
            {post.excerpt}
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-white/10 pt-8"
          >
            <div className="flex items-center gap-3.5">
              {author && (
                <img
                  src={author.photo_url ?? undefined}
                  alt=""
                  aria-hidden
                  className="size-12 rounded-full object-cover ring-2 ring-gold-500/40"
                />
              )}
              <div>
                <p className="font-semibold text-white">{post.author_name}</p>
                <p className="text-[0.8125rem] text-white/45">{post.author_role}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.875rem] text-white/50">
              <time dateTime={post.published_at ?? ''}>{formatDate(post.published_at ?? '')}</time>
              <span className="flex items-center gap-1.5">
                <Clock className="size-4" strokeWidth={2.2} />
                {post.read_time} min read
              </span>
            </div>

            <button
              type="button"
              onClick={share}
              className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-[0.875rem] font-semibold text-white transition-colors hover:border-gold-500 hover:bg-gold-500"
            >
              {copied ? (
                <>
                  <Check className="size-4" strokeWidth={2.6} />
                  Link copied
                </>
              ) : (
                <>
                  <Share2 className="size-4" strokeWidth={2.2} />
                  Share
                </>
              )}
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* ---------------- body ---------------- */}
      <section className="bg-canvas py-16 lg:py-24">
        <div className="container-page">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <article className="lg:col-span-8">
              <motion.figure
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE }}
                className="overflow-hidden rounded-4xl"
              >
                <img
                  src={post.cover_url ?? undefined}
                  alt={post.title}
                  className="aspect-16/9 w-full object-cover"
                />
              </motion.figure>

              <motion.div {...revealProps} variants={stagger(0.05)} className="mt-12">
                {body.map((block, i) => {
                  if (block.type === 'h2') {
                    return (
                      <motion.h2
                        key={i}
                        variants={fadeUp}
                        className="mt-12 font-display text-[1.75rem] leading-snug font-bold text-ink first:mt-0 sm:text-[2rem]"
                      >
                        {block.text}
                      </motion.h2>
                    )
                  }

                  if (block.type === 'quote') {
                    return (
                      <motion.blockquote
                        key={i}
                        variants={fadeUp}
                        className="my-10 rounded-3xl border-l-4 border-gold-500 bg-surface p-8"
                      >
                        <Quote className="size-7 text-gold-500/40" strokeWidth={1.8} />
                        <p className="mt-3 font-display text-xl leading-relaxed font-medium text-ink italic sm:text-2xl">
                          {block.text}
                        </p>
                      </motion.blockquote>
                    )
                  }

                  if (block.type === 'list') {
                    return (
                      <motion.ul key={i} variants={fadeUp} className="my-7 space-y-3.5">
                        {block.items?.map((item) => (
                          <li key={item} className="flex items-start gap-3.5">
                            <span className="mt-1.5 grid size-5 shrink-0 place-items-center rounded-full bg-gold-500">
                              <Check className="size-3 text-white" strokeWidth={3.5} />
                            </span>
                            <span className="text-[0.9375rem] leading-relaxed text-ink-soft">
                              {item}
                            </span>
                          </li>
                        ))}
                      </motion.ul>
                    )
                  }

                  return (
                    <motion.p
                      key={i}
                      variants={fadeUp}
                      className="mt-5 text-[1rem] leading-[1.75] text-ink-soft first:mt-0"
                    >
                      {block.text}
                    </motion.p>
                  )
                })}
              </motion.div>

              {/* tags */}
              <motion.div
                {...revealProps}
                variants={fadeUp}
                className="mt-12 flex flex-wrap items-center gap-2 border-t border-line-strong pt-8"
              >
                <span className="mr-2 text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">
                  Tagged
                </span>
                {(post.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-line-strong bg-surface px-3.5 py-1.5 text-[0.8125rem] font-medium text-ink-soft"
                  >
                    {tag}
                  </span>
                ))}
              </motion.div>

              {/* author box */}
              {author && (
                <motion.div
                  {...revealProps}
                  variants={fadeUp}
                  className="mt-10 flex flex-col gap-5 rounded-3xl border border-line bg-surface p-7 sm:flex-row sm:items-center"
                >
                  <img
                    src={author.photo_url ?? undefined}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    className="size-20 shrink-0 rounded-2xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">
                      Written by
                    </p>
                    <p className="mt-1 font-display text-lg font-semibold text-ink">
                      {author.full_name}
                    </p>
                    <p className="text-[0.875rem] text-gold-600">{author.job_title}</p>
                    <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-soft">
                      {author.deals_closed} deals closed · {(author.specialties ?? []).join(', ')}
                    </p>
                  </div>
                  <Button
                    to="/consultation?type=discovery"
                    variant="outline"
                    className="shrink-0 sm:self-center"
                  >
                    Talk to {author.full_name.split(' ')[0]}
                  </Button>
                </motion.div>
              )}
            </article>

            {/* ---- sidebar ---- */}
            <aside className="lg:col-span-4">
              <div className="sticky top-24 space-y-5">
                <div className="rounded-3xl border border-line bg-surface p-7">
                  <h2 className="font-display text-lg font-semibold text-ink">In this report</h2>
                  <ol className="mt-5 space-y-3">
                    {body
                      .filter((b) => b.type === 'h2')
                      .map((b, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="mt-0.5 font-display text-[0.875rem] font-bold text-gold-500 tabular-nums">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span className="text-[0.9375rem] leading-snug text-ink-soft">
                            {b.text}
                          </span>
                        </li>
                      ))}
                  </ol>
                </div>

                <div className="relative overflow-hidden rounded-3xl bg-navy-950 p-7 text-white">
                  <div className="pointer-events-none absolute inset-0 bg-blueprint opacity-60" />
                  <div className="relative">
                    <Eyebrow tone="light">Act on it</Eyebrow>
                    <h2 className="mt-4 font-display text-xl font-semibold">
                      Reading is the easy part.
                    </h2>
                    <p className="mt-3 text-[0.9375rem] leading-relaxed text-white/60">
                      Book a free 30-minute call and we will apply this to your actual budget and
                      your actual timeline.
                    </p>
                    <Button to="/consultation" variant="gold" className="mt-6 w-full">
                      Book a free call
                    </Button>
                    <Button to="/properties" variant="outline-light" className="mt-3 w-full">
                      See live listings
                    </Button>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          {/* ---- related ---- */}
          {related.length > 0 && (
            <div className="mt-20 lg:mt-24">
              <motion.div
                {...revealProps}
                variants={fadeUp}
                className="flex flex-wrap items-end justify-between gap-6"
              >
                <div>
                  <Eyebrow>Keep reading</Eyebrow>
                  <h2 className="mt-4 font-display text-2xl font-semibold text-ink">
                    Related insights
                  </h2>
                </div>
                <Button to="/insights" variant="outline">
                  All insights
                </Button>
              </motion.div>

              <motion.div
                {...revealProps}
                variants={stagger(0.08)}
                className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              >
                {related.map((item) => (
                  <motion.article
                    key={item.slug}
                    variants={fadeUp}
                    className="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-soft transition-all duration-500 ease-brand hover:-translate-y-1.5 hover:shadow-lift"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={item.cover_url ?? undefined}
                        alt={item.title}
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-900 ease-brand group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/60 to-transparent" />
                      <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1 text-[0.6875rem] font-bold tracking-wide text-ink uppercase backdrop-blur-sm">
                        {item.category}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="font-display text-lg leading-snug font-bold text-ink transition-colors duration-300 group-hover:text-gold-600">
                        <Link
                          to={`/insights/${item.slug}`}
                          className="before:absolute before:inset-0"
                        >
                          {item.title}
                        </Link>
                      </h3>

                      <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-[0.8125rem] text-ink-muted">
                        <span className="flex items-center gap-1.5">
                          <Clock className="size-3.5" strokeWidth={2.2} />
                          {item.read_time} min
                        </span>
                        <ArrowUpRight
                          className="size-4 text-ink-muted transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-gold-600"
                          strokeWidth={2.4}
                        />
                      </div>
                    </div>
                  </motion.article>
                ))}
              </motion.div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
