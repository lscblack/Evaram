import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { ThemeProvider } from '@/lib/theme'
import { I18nProvider } from '@/lib/i18n'
import './index.css'

/**
 * React 19 hoists each page's <title>/<meta> into <head> but does not remove
 * the ones already in index.html — leaving two of each, with the static pair
 * winning for anything that reads the first match. Drop them before mounting.
 */
document.querySelectorAll('head [data-boot-fallback]').forEach((node) => node.remove())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>,
)
