import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  api,
  refreshSession,
  setAccessToken,
  setRefreshListener,
  setSessionLostHandler,
} from '@/shared/api/client'
import type { Me, TokenOut } from '@/shared/api/types'

interface AuthState {
  user: Me | null
  status: 'loading' | 'authenticated' | 'anonymous'
  login: (email: string, password: string) => Promise<void>
  /** Finish any sign-in (email code, passkey) that returned a token. */
  acceptSession: (r: TokenOut) => void
  logout: () => Promise<void>
  can: (...permissions: string[]) => boolean
  setUser: (u: Me) => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null)
  const [status, setStatus] = useState<AuthState['status']>('loading')
  const qc = useQueryClient()

  useEffect(() => {
    setRefreshListener((r) => setUser(r.user as Me))
    setSessionLostHandler(() => {
      setUser(null)
      setStatus('anonymous')
      qc.clear()
    })
    // Restore the session from the httpOnly refresh cookie, if any.
    refreshSession()
      .then((r) => {
        if (r) {
          setUser(r.user as Me)
          setStatus('authenticated')
        } else setStatus('anonymous')
      })
      .catch(() => setStatus('anonymous'))
    return () => {
      setRefreshListener(null)
      setSessionLostHandler(null)
    }
  }, [qc])

  const acceptSession = useCallback((r: TokenOut) => {
    setAccessToken(r.access_token)
    setUser(r.user)
    setStatus('authenticated')
  }, [])

  const login = useCallback(
    async (email: string, password: string) => acceptSession(await api.publicPost<TokenOut>('/auth/login', { email, password })),
    [acceptSession],
  )

  const logout = useCallback(async () => {
    try {
      await api.publicPost('/auth/logout')
    } finally {
      setAccessToken(null)
      setUser(null)
      setStatus('anonymous')
      qc.clear()
    }
  }, [qc])

  const can = useCallback(
    (...permissions: string[]) => !!user && permissions.every((p) => user.permissions.includes(p)),
    [user],
  )

  const value = useMemo(
    () => ({ user, status, login, acceptSession, logout, can, setUser }),
    [user, status, login, acceptSession, logout, can],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

/** Render children only when the user holds every listed permission. */
export function Can({ perm, children, fallback = null }: { perm: string | string[]; children: ReactNode; fallback?: ReactNode }) {
  const { can } = useAuth()
  const perms = Array.isArray(perm) ? perm : [perm]
  return <>{can(...perms) ? children : fallback}</>
}
