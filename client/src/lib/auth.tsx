import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, tokens } from '@/lib/api'
import type { AuthUser, LoginChallenge, TokenPair, UserRole } from '@/types/api'

const RANK: Record<UserRole, number> = { user: 0, agent: 1, admin: 2, super_admin: 3 }

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  /** Step one — returns the OTP challenge. */
  login: (email: string, password: string, captcha?: { token: string; answer: string }) => Promise<LoginChallenge>
  /** Step two — exchanges the code for a session. */
  verifyOtp: (preAuthToken: string, code: string) => Promise<AuthUser>
  /** Public sign-up. Returns the same OTP challenge as a login. */
  register: (input: {
    email: string
    full_name: string
    password: string
    phone?: string
    captcha?: { token: string; answer: string }
  }) => Promise<LoginChallenge>
  resendOtp: (preAuthToken: string) => Promise<LoginChallenge>
  logout: () => Promise<void>
  /** True when the signed-in user is at or above the given role. */
  can: (minimum: UserRole) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore the session on boot if a token survived the reload.
  useEffect(() => {
    let cancelled = false
    if (!tokens.access) {
      setLoading(false)
      return
    }
    api
      .get<AuthUser>('/auth/me')
      .then((me) => !cancelled && setUser(me))
      .catch(() => {
        tokens.clear()
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(
    async (email: string, password: string, captcha?: { token: string; answer: string }) =>
      api.post<LoginChallenge>('/auth/login', {
        email,
        password,
        captcha_token: captcha?.token,
        captcha_answer: captcha?.answer,
      }),
    [],
  )

  const verifyOtp = useCallback(async (preAuthToken: string, code: string) => {
    const pair = await api.post<TokenPair>('/auth/verify-otp', {
      pre_auth_token: preAuthToken,
      code,
    })
    tokens.set(pair.access_token, pair.refresh_token)
    setUser(pair.user)
    return pair.user
  }, [])

  const register = useCallback(
    async (input: {
      email: string
      full_name: string
      password: string
      phone?: string
      captcha?: { token: string; answer: string }
    }) =>
      api.post<LoginChallenge>('/auth/register', {
        email: input.email,
        full_name: input.full_name,
        password: input.password,
        phone: input.phone || null,
        captcha_token: input.captcha?.token,
        captcha_answer: input.captcha?.answer,
      }),
    [],
  )

  const resendOtp = useCallback(
    (preAuthToken: string) =>
      api.post<LoginChallenge>('/auth/resend-otp', { pre_auth_token: preAuthToken }),
    [],
  )

  const logout = useCallback(async () => {
    const refresh = tokens.refresh
    if (refresh) {
      // Best effort — a failed revoke must not trap the user in the session.
      await api.post('/auth/logout', { refresh_token: refresh }).catch(() => undefined)
    }
    tokens.clear()
    setUser(null)
  }, [])

  const can = useCallback(
    (minimum: UserRole) => Boolean(user && RANK[user.role] >= RANK[minimum]),
    [user],
  )

  const value = useMemo(
    () => ({ user, loading, login, register, verifyOtp, resendOtp, logout, can }),
    [user, loading, login, register, verifyOtp, resendOtp, logout, can],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
