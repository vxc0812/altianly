import AsyncStorage from '@react-native-async-storage/async-storage'
import { getSyncUrl } from './cloudSync'
import { getUserProfile, saveUserProfile, deleteUserProfile, updateLastActivity } from './storage'
import { UserProfile } from '../types'

let sessionToken: string | null = null

export function getSessionToken(): string | null {
  return sessionToken
}

export function setSessionToken(token: string | null): void {
  sessionToken = token
  if (token) {
    try {
      document.cookie = `altianly_session=${token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
    } catch {}
  } else {
    try {
      document.cookie = 'altianly_session=; path=/; max-age=0'
    } catch {}
  }
}

function getSessionFromCookie(): string | null {
  try {
    const match = document.cookie.match(/(?:^|;\s*)altianly_session=([^;]*)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

export async function tryRestoreSession(): Promise<UserProfile | null> {
  const local = await getUserProfile()
  if (local) {
    const cookieToken = getSessionFromCookie()
    if (cookieToken) setSessionToken(cookieToken)
    return local
  }

  const cookieToken = getSessionFromCookie()
  if (!cookieToken) return null

  try {
    const base = await getSyncUrl()
    const res = await fetch(`${base}/auth/session/${cookieToken}`)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.valid) return null

    setSessionToken(cookieToken)
    const profile: UserProfile = {
      name: data.user.name,
      email: data.user.email,
      createdAt: data.user.createdAt,
      lastLoginAt: Date.now(),
    }
    await saveUserProfile(profile)
    return profile
  } catch {
    return null
  }
}

export async function registerWithPassword(
  name: string,
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters' }

  try {
    const base = await getSyncUrl()
    const res = await fetch(`${base}/auth/password/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), name: name.trim(), password }),
    })
    if (res.ok) {
      const data = await res.json()
      setSessionToken(data.token)
      const profile: UserProfile = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        createdAt: data.createdAt || Date.now(),
        lastLoginAt: Date.now(),
      }
      await saveUserProfile(profile)
      await updateLastActivity()
      return { ok: true }
    }
    const err = await res.json().catch(() => ({ error: 'Registration failed' }))
    return { ok: false, error: err.error || `Server error (${res.status})` }
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection and try again, or continue without an account.' }
  }
}

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const base = await getSyncUrl()
    const res = await fetch(`${base}/auth/password/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    })
    if (res.ok) {
      const data = await res.json()
      setSessionToken(data.token)
      const profile: UserProfile = {
        name: data.name,
        email: email.trim().toLowerCase(),
        createdAt: data.createdAt || Date.now(),
        lastLoginAt: Date.now(),
      }
      await saveUserProfile(profile)
      await updateLastActivity()
      return { ok: true }
    }
    const err = await res.json().catch(() => ({ error: 'Login failed' }))
    return { ok: false, error: err.error || `Server error (${res.status})` }
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection and try again, or continue without an account.' }
  }
}

export async function requestPasswordReset(email: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const base = await getSyncUrl()
    const res = await fetch(`${base}/auth/password/reset/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    })
    if (res.ok) return { ok: true }
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    return { ok: false, error: err.error || `Server error (${res.status})` }
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection and try again.' }
  }
}

export async function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string,
): Promise<{ ok: boolean; error?: string }> {
  if (newPassword.length < 6) return { ok: false, error: 'Password must be at least 6 characters' }

  try {
    const base = await getSyncUrl()
    const res = await fetch(`${base}/auth/password/reset/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim(), newPassword }),
    })
    if (res.ok) {
      const data = await res.json()
      setSessionToken(data.token)
      const profile: UserProfile = {
        name: data.name || email.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        createdAt: data.createdAt || Date.now(),
        lastLoginAt: Date.now(),
      }
      await saveUserProfile(profile)
      await updateLastActivity()
      return { ok: true }
    }
    const err = await res.json().catch(() => ({ error: 'Reset failed' }))
    return { ok: false, error: err.error || `Server error (${res.status})` }
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection and try again.' }
  }
}

export async function logout(): Promise<void> {
  const token = getSessionToken()
  if (token) {
    try {
      const base = await getSyncUrl()
      await fetch(`${base}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
    } catch {}
  }
  setSessionToken(null)
  await deleteUserProfile()
}

export async function deleteAccount(): Promise<{ ok: boolean; error?: string }> {
  const token = getSessionToken()
  if (token) {
    try {
      const base = await getSyncUrl()
      const res = await fetch(`${base}/auth/account/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!res.ok && res.status !== 401) {
        const err = await res.json().catch(() => ({ error: 'Server error' }))
        return { ok: false, error: err.error || `Server error (${res.status})` }
      }
    } catch {
      // Worker unreachable — still wipe local data below
    }
  }

  setSessionToken(null)
  await deleteUserProfile()
  try {
    const keys = await AsyncStorage.getAllKeys()
    await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith('altianly_')))
  } catch {}
  return { ok: true }
}
