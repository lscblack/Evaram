import { Suspense, lazy } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ScrollToTop } from '@/components/layout/ScrollToTop'
import { FloatingActions } from '@/components/layout/FloatingActions'
import { RouteLoader } from '@/components/layout/RouteLoader'
import { FallbackBadge } from '@/components/layout/FallbackBadge'
import { ScrollProgress } from '@/components/layout/ScrollProgress'
import { routeTransition } from '@/lib/motion'
import HomePage from '@/pages/HomePage'

const PropertiesPage = lazy(() => import('@/pages/PropertiesPage'))
const PropertyDetailPage = lazy(() => import('@/pages/PropertyDetailPage'))
const WealthCyclePage = lazy(() => import('@/pages/WealthCyclePage'))
const ConstructionPage = lazy(() => import('@/pages/ConstructionPage'))
const ServicesPage = lazy(() => import('@/pages/ServicesPage'))
const SellPage = lazy(() => import('@/pages/SellPage'))
const JoinPage = lazy(() => import('@/pages/JoinPage'))
const ConsultationPage = lazy(() => import('@/pages/ConsultationPage'))
const AboutPage = lazy(() => import('@/pages/AboutPage'))
const TeamPage = lazy(() => import('@/pages/TeamPage'))
const InsightsPage = lazy(() => import('@/pages/InsightsPage'))
const InsightDetailPage = lazy(() => import('@/pages/InsightDetailPage'))
const ContactPage = lazy(() => import('@/pages/ContactPage'))
const AccountPage = lazy(() => import('@/pages/AccountPage'))
const LegalPage = lazy(() => import('@/pages/LegalPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

/* ---- console: its own shell, no public navbar or footer ---- */
const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'))
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'))
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'))
const PropertiesAdminPage = lazy(() => import('@/pages/admin/PropertiesAdminPage'))
const PropertyUploadPage = lazy(() => import('@/pages/admin/PropertyUploadPage'))
const OffersAdminPage = lazy(() => import('@/pages/admin/OffersAdminPage'))
const TaxonomyAdminPage = lazy(() => import('@/pages/admin/TaxonomyAdminPage'))
const ContentAdminPage = lazy(() => import('@/pages/admin/ContentAdminPage'))
const InsightsAdminPage = lazy(() => import('@/pages/admin/InsightsAdminPage'))
const VoicesAdminPage = lazy(() => import('@/pages/admin/VoicesAdminPage'))
const InboxAdminPage = lazy(() => import('@/pages/admin/InboxAdminPage'))
const UsersAdminPage = lazy(() => import('@/pages/admin/UsersAdminPage'))
const AuditAdminPage = lazy(() => import('@/pages/admin/AuditAdminPage'))
const SettingsAdminPage = lazy(() => import('@/pages/admin/SettingsAdminPage'))

export default function App() {
  const location = useLocation()

  // The console is a separate application surface — it must not inherit the
  // marketing chrome, the page transition, or the fixed-header offset.
  if (location.pathname.startsWith('/admin')) {
    return (
      <Suspense fallback={<RouteLoader />}>
        <Routes location={location}>
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="properties" element={<PropertiesAdminPage />} />
            <Route path="properties/new" element={<PropertyUploadPage />} />
            <Route path="offers" element={<OffersAdminPage />} />
            <Route path="taxonomy" element={<TaxonomyAdminPage />} />
            <Route path="content" element={<ContentAdminPage />} />
            <Route path="insights" element={<InsightsAdminPage />} />
            <Route path="testimonials" element={<VoicesAdminPage />} />
            <Route path="inbox" element={<InboxAdminPage />} />
            <Route path="users" element={<UsersAdminPage />} />
            <Route path="audit" element={<AuditAdminPage />} />
            <Route path="settings" element={<SettingsAdminPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
        <FallbackBadge />
      </Suspense>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollToTop />
      <ScrollProgress />
      <Navbar />

      {/* Offset equals the fixed header: 72px bar on mobile; 40px utility bar
          + 80px main bar on large screens. */}
      <main id="main" className="flex-1 pt-18 lg:pt-30">
        <Suspense fallback={<RouteLoader />}>
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} {...routeTransition}>
              <Routes location={location}>
                <Route path="/" element={<HomePage />} />
                <Route path="/properties" element={<PropertiesPage />} />
                <Route path="/properties/:id" element={<PropertyDetailPage />} />
                <Route path="/wealth-cycle" element={<WealthCyclePage />} />
                <Route path="/construction" element={<ConstructionPage />} />
                <Route path="/services" element={<ServicesPage />} />
                <Route path="/sell" element={<SellPage />} />
                <Route path="/join" element={<JoinPage />} />
                <Route path="/consultation" element={<ConsultationPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/team" element={<TeamPage />} />
                <Route path="/insights" element={<InsightsPage />} />
                <Route path="/insights/:slug" element={<InsightDetailPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/privacy" element={<LegalPage />} />
                <Route path="/terms" element={<LegalPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>

      <Footer />
      <FloatingActions />
      <FallbackBadge />
    </div>
  )
}
