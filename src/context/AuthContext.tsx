import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { UserProfile } from '../types'
import { tryRestoreSession, logout as authLogout } from '../services/auth'

interface AuthContextType {
  profile: UserProfile | null
  loading: boolean
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  profile: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    const p = await tryRestoreSession()
    setProfile(p)
    setLoading(false)
  }

  async function logout() {
    await authLogout()
    setProfile(null)
  }

  useEffect(() => { refresh() }, [])

  return (
    <AuthContext.Provider value={{ profile, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
