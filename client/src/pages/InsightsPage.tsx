import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight, Clock, Search, Send } from 'lucide-react'
import { Seo, breadcrumbJsonLd } from '@/components/Seo'
import { PageHero } from '@/components/layout/PageHero'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { api } from '@/lib/api'
import { useI18n, useT } from '@/lib/i18n'
import { useBlock, useQuery } from '@/lib/queries'
import type { ApiInsightCard, Page } from '@/types/api'
import { EASE, fadeUp, revealProps, stagger } from '@/lib/motion'
import { useSite } from '@/lib/siteConfig'
import { cn, formatDate } from '@/lib/utils'

export default function InsightsPage() {
  const t = useT()
  const seo = useBlock('insights', 'seo', {
    title: "Insights & Market Reports — Rwanda Property",
    body: "Kigali land price reports, rental yield analysis, construction cost breakdowns and practical guides for diaspora buyers. Published monthly by Evaramu Group Ltd.",
  })
  const seoKeywords = (seo.items as { text: string }[]).map((k) => k.text)
  const block = useBlock('insights', 'hero', {
    eyebrow: "Insights",
    title: "Almost no agent in Rwanda",
    accent: "publishes anything useful.",
    body: "We treat that as an opportunity. Monthly market reports, wealth education, construction costs and honest guides for buying from abroad — written by the people actually doing the deals.",
  })
  const site = useSite()
  const [category, setCategory] = useState<string>('All')
  const [query, setQuery] = useState('')
  const { locale } = useI18n()
  const [subscribed, setSubscribed] = useState(false)
  const [newsletterEmail, setNewsletterEmail] = useState('')

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/public/newsletter', {
        email: newsletterEmail,
        locale,
        source: 'insights',
      })
    } catch {
      // A duplicate address is not worth an error state — the intent is the same.
    }
    setSubscribed(true)
  }

  // The archive is small enough to hold in one page, so filtering stays instant
  // and the category pills can be derived from what is actually published.
  const { data } = useQuery<Page<ApiInsightCard>>('/public/insights?per_page=48')
  const posts = useMemo(() => data?.items ?? [], [data])

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(posts.map((p) => p.category)))],
    [posts],
  )

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return posts
      .filter((post) => {
        if (category !== 'All' && post.category !== category) return false
        if (!needle) return true
        return [post.title, post.excerpt ?? '', post.author_name ?? '', ...(post.tags ?? [])]
          .join(' ')
          .toLowerCase()
          .includes(needle)
      })
      .sort((a, b) => +new Date(b.published_at ?? 0) - +new Date(a.published_at ?? 0))
  }, [category, query, posts])

  const [lead, ...rest] = results

  const blogJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `${site.name} — Insights`,
    url: `${site.url}/insights`,
    blogPost: posts.map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      datePublished: post.published_at,
      author: { '@type': 'Person', name: post.author_name },
      url: `${site.url}/insights/${post.slug}`,
      image: post.cover_url,
    })),
  }

  return (
    <>
      <Seo
        title={seo.title}
        description={seo.body ?? ''}
        path="/insights"
        keywords={seoKeywords}
        jsonLd={[
          blogJsonLd,
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Insights', path: '/insights' },
          ]),
        ]}
      />

      <PageHero
        eyebrow={block.eyebrow}
        title={block.title}
        accent={block.accent}
        description="We treat that as an opportunity. Monthly market reports, wealth education, construction costs and honest guides for buying from abroad — written by the people actually doing the deals."
        crumbs={[{ label: t('nav.insights') }]}
        image="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=80"
        compact
      />

      <section className="bg-canvas py-14 lg:py-20">
        <div className="container-page">
          {/* ---- filters ---- */}
          <motion.div
            {...revealProps}
            variants={fadeUp}
            className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0 [&::-webkit-scrollbar]:hidden">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    'relative shrink-0 rounded-full px-5 py-2.5 text-[0.9375rem] font-semibold transition-colors duration-300',
                    category === c ? 'text-white' : 'text-ink-soft hover:text-ink',
                  )}
                >
                  {category === c && (
                    <motion.span
                      layoutId="insight-pill"
                      className="absolute inset-0 rounded-full bg-ink shadow-soft"
                      transition={{ duration: 0.4, ease: EASE }}
                    />
                  )}
                  <span className="relative">{c}</span>
                </button>
              ))}
            </div>

            <div className="relative lg:w-80">
              <label htmlFor="insight-q" className="sr-only">
                Search insights
              </label>
              <Search
                className="pointer-events-none absolute top-1/2 left-4 size-[1.05rem] -translate-y-1/2 text-ink-faint"
                strokeWidth={2}
              />
              <input
                id="insight-q"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('insights.searchPlaceholder')}
                className="h-12 w-full rounded-full border border-line bg-surface pr-4 pl-11 text-[0.9375rem] text-ink transition-colors placeholder:text-ink-faint focus:border-gold-500 focus:outline-none"
              />
            </div>
          </motion.div>

          {results.length === 0 ? (
            <div className="mt-14 rounded-3xl border border-dashed border-line-strong bg-surface px-6 py-20 text-center">
              <h2 className="font-display text-xl font-semibold text-ink">
                Nothing matches that
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed text-ink-soft">
                Try a different category, or tell us what you would like us to write about — we
                take requests seriously.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button
                  onClick={() => {
                    setCategory('All')
                    setQuery('')
                  }}
                  variant="outline"
                >
                  Clear filters
                </Button>
                <Button to="/contact" variant="gold">
                  Suggest a topic
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* ---- lead article ---- */}
              <motion.article
                key={lead.slug}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE }}
                className="group relative mt-12 grid overflow-hidden rounded-4xl border border-line bg-surface shadow-soft transition-all duration-500 ease-brand hover:-translate-y-1.5 hover:shadow-lift lg:grid-cols-2"
              >
                <div className="relative h-64 overflow-hidden sm:h-80 lg:h-auto">
                  <img
                    src={lead.cover_url ?? undefined}
                    alt={lead.title}
                    className="size-full object-cover transition-transform duration-900 ease-brand group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-950/50 to-transparent lg:bg-gradient-to-r" />
                  <span className="absolute top-5 left-5 rounded-full bg-gold-500 px-3.5 py-1.5 text-[0.6875rem] font-bold tracking-wide text-white uppercase">
                    Latest
                  </span>
                </div>

                <div className="flex flex-col justify-center p-7 sm:p-10">
                  <p className="text-[0.6875rem] font-bold tracking-[0.16em] text-gold-600 uppercase">
                    {lead.category}
                  </p>

                  <h2 className="mt-3 font-display text-[1.75rem] leading-snug font-bold text-ink transition-colors duration-300 group-hover:text-gold-600 sm:text-[2.25rem]">
                    <Link to={`/insights/${lead.slug}`} className="before:absolute before:inset-0">
                      {lead.title}
                    </Link>
                  </h2>

                  <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-soft">
                    {lead.excerpt}
                  </p>

                  <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.875rem] text-ink-muted">
                    <span className="font-semibold text-ink">{lead.author_name}</span>
                    <span>{lead.author_role}</span>
                    <time dateTime={lead.published_at ?? ''}>{formatDate(lead.published_at ?? '')}</time>
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3.5" strokeWidth={2.2} />
                      {lead.read_time} min read
                    </span>
                  </div>

                  <span className="mt-7 inline-flex w-fit items-center gap-2 text-[0.9375rem] font-bold text-ink transition-colors group-hover:text-gold-600">
                    Read the report
                    <ArrowUpRight
                      className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      strokeWidth={2.4}
                    />
                  </span>
                </div>
              </motion.article>

              {/* ---- grid ---- */}
              {rest.length > 0 && (
                <motion.div
                  key={`${category}-${query}`}
                  initial="hidden"
                  animate="show"
                  variants={stagger(0.07)}
                  className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {rest.map((post) => (
                    <motion.article
                      key={post.slug}
                      variants={fadeUp}
                      className="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-soft transition-all duration-500 ease-brand hover:-translate-y-1.5 hover:shadow-lift"
                    >
                      <div className="relative h-52 overflow-hidden">
                        <img
                          src={post.cover_url ?? undefined}
                          alt={post.title}
                          loading="lazy"
                          className="size-full object-cover transition-transform duration-900 ease-brand group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/60 to-transparent" />
                        <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1 text-[0.6875rem] font-bold tracking-wide text-ink uppercase backdrop-blur-sm">
                          {post.category}
                        </span>
                      </div>

                      <div className="flex flex-1 flex-col p-6">
                        <h3 className="font-display text-xl leading-snug font-bold text-ink transition-colors duration-300 group-hover:text-gold-600">
                          <Link
                            to={`/insights/${post.slug}`}
                            className="before:absolute before:inset-0"
                          >
                            {post.title}
                          </Link>
                        </h3>

                        <p className="mt-3 line-clamp-3 text-[0.9375rem] leading-relaxed text-ink-soft">
                          {post.excerpt}
                        </p>

                        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-4 text-[0.8125rem] text-ink-muted">
                          <span className="font-semibold text-ink-soft">{post.author_name}</span>
                          <time dateTime={post.published_at ?? ''}>{formatDate(post.published_at ?? '')}</time>
                          <span className="flex items-center gap-1.5">
                            <Clock className="size-3.5" strokeWidth={2.2} />
                            {post.read_time} min
                          </span>
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </motion.div>
              )}

              <p className="mt-10 text-center text-[0.875rem] text-ink-muted">
                Showing {results.length} of {posts.length} articles
              </p>
            </>
          )}
        </div>
      </section>

      {/* ---------------- newsletter ---------------- */}
      <section className="bg-surface py-16 lg:py-20">
        <div className="container-page">
          <motion.div
            {...revealProps}
            variants={fadeUp}
            className="relative overflow-hidden rounded-4xl bg-navy-950 px-8 py-14 text-white sm:px-14 lg:py-16"
          >
            <div className="pointer-events-none absolute inset-0 bg-blueprint opacity-60" />
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 -right-24 size-[26rem] rounded-full bg-gold-500/12 blur-[110px]"
            />

            <div className="relative grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-14">
              <div className="lg:col-span-7">
                <Eyebrow tone="light">{t('footer.newsletter')}</Eyebrow>
                <h2 className="mt-5 text-[1.75rem] leading-[1.15] font-semibold sm:text-[2.125rem]">
                  One email a month.
                  <span className="text-gradient-gold"> No listings spam.</span>
                </h2>
                <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-white/60">
                  Land price movements by sector, new development zones, rental yield data and what
                  we are actually seeing on the ground. Written for people making decisions, not
                  browsing.
                </p>
              </div>

              <div className="lg:col-span-5">
                <form
                  onSubmit={subscribe}
                >
                  <label htmlFor="report-email" className="sr-only">
                    Email address
                  </label>
                  <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 p-1.5 transition-colors focus-within:border-gold-500/60">
                    <input
                      id="report-email"
                      type="email"
                      required
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-[0.9375rem] text-white placeholder:text-white/35 focus:outline-none"
                    />
                    <button
                      type="submit"
                      aria-label={t('footer.subscribe')}
                      className="grid size-11 shrink-0 place-items-center rounded-full bg-gold-500 text-white transition-colors hover:bg-gold-600"
                    >
                      <Send className="size-[1.05rem]" strokeWidth={2.2} />
                    </button>
                  </div>
                  {subscribed && (
                    <motion.p
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 text-[0.875rem] text-gold-300"
                    >
                      You're on the list. The next report goes out at the start of the month.
                    </motion.p>
                  )}
                  <p className="mt-4 text-[0.8125rem] text-white/40">
                    Unsubscribe in one click. We never share your address.
                  </p>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  )
}
