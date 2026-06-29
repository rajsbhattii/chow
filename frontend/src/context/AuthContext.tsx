import { createContext, useContext, useEffect, useState } from 'react'
import api from '../lib/api'

export interface AuthUser {
  id: string
  name: string
  email: string
  status: 'onboarding' | 'active'
  adventure_level: string | null
  budget_range: string | null
  max_distance: number | null
  cuisine_preferences: string[]
  transport_modes: string[]
  dietary_needs: string[]
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  login: (token: string, refreshToken: string, user: AuthUser) => void
  updateUser: (user: AuthUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('chow_token'))
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem('chow_user')
    return raw ? JSON.parse(raw) : null
  })

  // On mount, validate the stored token by hitting /me
  useEffect(() => {
    if (!token) return
    api.get('/api/auth/me').then(res => {
      setUser(res.data)
      localStorage.setItem('chow_user', JSON.stringify(res.data))
    }).catch(() => {
      // token is invalid/expired — clear everything
      logout()
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function login(accessToken: string, refreshToken: string, userData: AuthUser) {
    localStorage.setItem('chow_token', accessToken)
    localStorage.setItem('chow_refresh_token', refreshToken)
    localStorage.setItem('chow_user', JSON.stringify(userData))
    setToken(accessToken)
    setUser(userData)
  }

  function updateUser(userData: AuthUser) {
    localStorage.setItem('chow_user', JSON.stringify(userData))
    setUser(userData)
  }

  function logout() {
    localStorage.removeItem('chow_token')
    localStorage.removeItem('chow_refresh_token')
    localStorage.removeItem('chow_user')
    localStorage.removeItem('chow_onboarding_draft')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
