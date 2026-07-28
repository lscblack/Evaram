import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * React Router keeps scroll position across navigations. Reset to the top on
 * every path change, but honour in-page `#anchor` links.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      // Let the target render before scrolling to it.
      const id = hash.slice(1)
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
      return
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash])

  return null
}
