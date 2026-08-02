import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { ThemeProvider } from '@/lib/theme'
import { I18nProvider } from '@/lib/i18n'
import { SiteConfigProvider } from '@/lib/siteConfig'
import { AuthProvider } from '@/lib/auth'
import { prewarm } from '@/lib/api'
import './index.css'

/**
 * React 19 hoists each page's <title>/<meta> into <head> but does not remove
 * the ones already in index.html — leaving two of each, with the static pair
 * winning for anything that reads the first match. Drop them before mounting.
 */
document.querySelectorAll('head [data-boot-fallback]').forEach((node) => node.remove())

// Negotiate the encrypted transport while React is still mounting, so the
// first data call does not pay for the ECDH handshake.
prewarm()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <SiteConfigProvider>
        <I18nProvider>
          <AuthProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </AuthProvider>
        </I18nProvider>
      </SiteConfigProvider>
    </ThemeProvider>
  </StrictMode>,
)
