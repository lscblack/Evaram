import { Suspense, lazy } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ScrollToTop } from '@/components/layout/ScrollToTop'
import { FloatingActions } from '@/components/layout/FloatingActions'
import { RouteLoader } from '@/components/layout/RouteLoader'
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
const LegalPage = lazy(() => import('@/pages/LegalPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

export default function App() {
  const location = useLocation()

  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollToTop />
      <Navbar />

      {/* Offset equals the fixed header: 72px bar on mobile; 40px utility bar
          + 80px main bar on large screens. */}
      <main id="main" className="flex-1 pt-18 lg:pt-30">
        <Suspense fallback={<RouteLoader />}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
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
    </div>
  )
}
