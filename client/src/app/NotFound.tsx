import { isRouteErrorResponse, useRouteError } from 'react-router'
import { Compass, RefreshCw } from 'lucide-react'
import { ButtonLink, Button } from '@/shared/ui/Button'
import { EmptyState } from '@/shared/ui/EmptyState'

export function NotFoundPage({ inAdmin }: { inAdmin?: boolean }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The page you are looking for does not exist or has moved."
        action={<ButtonLink to={inAdmin ? '/admin' : '/'}>{inAdmin ? 'Back to dashboard' : 'Back to home'}</ButtonLink>}
      />
    </div>
  )
}

export function RouteError() {
  const error = useRouteError()
  // A new deployment replaces hashed chunks; reload once to pick them up.
  const chunk = error instanceof Error && /dynamically imported module|Importing a module script failed/i.test(error.message)
  const message = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : chunk
    ? 'A new version of the application is available.'
    : 'An unexpected error occurred.'
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <EmptyState
        icon={RefreshCw}
        title={chunk ? 'Update available' : 'Something went wrong'}
        description={message}
        action={<Button onClick={() => window.location.reload()}>Reload</Button>}
      />
    </div>
  )
}
