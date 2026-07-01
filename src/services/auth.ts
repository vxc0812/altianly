import { isWebAuthnAvailable, createCredential, getAssertion } from './webauthn'
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

export async function registerWithPasskey(
  name: string,
  email: string,
): Promise<{ ok: boolean; error?: string }> {
  // Try passkey registration via worker; fall back to local-only account if worker unreachable
  if (isWebAuthnAvailable()) {
    try {
      const base = await getSyncUrl()
      const userId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`

      const beginRes = await fetch(`${base}/auth/register/begin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), name: name.trim(), userId }),
      })
      if (beginRes.ok) {
        const options = await beginRes.json()
        const credential = await createCredential(options)
        if (credential) {
          const completeRes = await fetch(`${base}/auth/register/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email.trim().toLowerCase(),
              name: name.trim(),
              userId,
              credential,
            }),
          })
          if (completeRes.ok) {
            const data = await completeRes.json()
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
        }
      }
    } catch {
      // Worker unreachable — fall through to local registration
    }
  }

  // Local-only fallback: save profile without passkey
  const profile: UserProfile = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
  }
  await saveUserProfile(profile)
  await updateLastActivity()
  return { ok: true }
}

export async function loginWithPasskey(): Promise<{ ok: boolean; error?: string }> {
  // Try passkey login via worker; fall back to local profile if worker unreachable
  if (isWebAuthnAvailable()) {
    try {
      const base = await getSyncUrl()

      const beginRes = await fetch(`${base}/auth/login/begin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (beginRes.ok) {
        const options = await beginRes.json()
        const assertion = await getAssertion(options)
        if (assertion) {
          const completeRes = await fetch(`${base}/auth/login/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assertion }),
          })
          if (completeRes.ok) {
            const data = await completeRes.json()
            setSessionToken(data.token)
            const profile: UserProfile = {
              name: data.user.name,
              email: data.user.email,
              createdAt: data.user.createdAt,
              lastLoginAt: Date.now(),
            }
            await saveUserProfile(profile)
            await updateLastActivity()
            return { ok: true }
          }
        }
      }
    } catch {
      // Worker unreachable — fall through to local login
    }
  }

  // Local-only fallback: use saved profile if it exists
  const local = await getUserProfile()
  if (!local) {
    return { ok: false, error: 'No local profile found. Register first.' }
  }
  local.lastLoginAt = Date.now()
  await saveUserProfile(local)
  await updateLastActivity()
  return { ok: true }
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
    // Worker unreachable — fall back to local-only registration
    const profile: UserProfile = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    }
    await saveUserProfile(profile)
    await updateLastActivity()
    return { ok: true }
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
    // Worker unreachable — try local profile
    const local = await getUserProfile()
    if (local && local.email === email.trim().toLowerCase()) {
      local.lastLoginAt = Date.now()
      await saveUserProfile(local)
      await updateLastActivity()
      return { ok: true }
    }
    return { ok: false, error: 'Cannot reach server and no local profile found.' }
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
