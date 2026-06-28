import { Platform } from 'react-native'

export function isWebAuthnAvailable(): boolean {
  if (Platform.OS !== 'web') return false
  return typeof navigator !== 'undefined' && typeof navigator.credentials !== 'undefined'
}

export interface WebAuthnRegistrationOptions {
  challenge: string
  rp: { name: string; id: string }
  user: { id: string; name: string; displayName: string }
  pubKeyCredParams: { type: 'public-key'; alg: number }[]
  authenticatorSelection?: {
    residentKey?: 'discouraged' | 'preferred' | 'required'
    userVerification?: 'discouraged' | 'preferred' | 'required'
  }
}

export interface WebAuthnRegistrationResponse {
  id: string
  rawId: string
  response: {
    attestationObject: string
    clientDataJSON: string
  }
}

export interface WebAuthnLoginOptions {
  challenge: string
  allowCredentials?: { type: 'public-key'; id: string; transports?: string[] }[]
  userVerification?: 'discouraged' | 'preferred' | 'required'
}

export interface WebAuthnLoginResponse {
  id: string
  rawId: string
  response: {
    authenticatorData: string
    clientDataJSON: string
    signature: string
    userHandle?: string
  }
}

function base64urlToBase64(s: string): string {
  return s.replace(/-/g, '+').replace(/_/g, '/')
}

function base64ToBase64url(s: string): string {
  return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function bufferToBase64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return base64ToBase64url(btoa(binary))
}

function base64urlToBuffer(s: string): ArrayBuffer {
  const binary = atob(base64urlToBase64(s))
  const buf = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    buf[i] = binary.charCodeAt(i)
  }
  return buf.buffer
}

export async function createCredential(
  options: WebAuthnRegistrationOptions,
): Promise<WebAuthnRegistrationResponse | null> {
  if (!isWebAuthnAvailable()) return null

  const pubKey: PublicKeyCredentialCreationOptions = {
    challenge: base64urlToBuffer(options.challenge),
    rp: options.rp,
    user: {
      id: base64urlToBuffer(options.user.id),
      name: options.user.name,
      displayName: options.user.displayName,
    },
    pubKeyCredParams: options.pubKeyCredParams,
    authenticatorSelection: options.authenticatorSelection || {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  }

  try {
    const credential = (await navigator.credentials.create({ publicKey: pubKey })) as PublicKeyCredential
    const response = credential.response as AuthenticatorAttestationResponse

    return {
      id: credential.id,
      rawId: bufferToBase64url(credential.rawId),
      response: {
        attestationObject: bufferToBase64url(response.attestationObject),
        clientDataJSON: bufferToBase64url(response.clientDataJSON),
      },
    }
  } catch (err: any) {
    if (err.name === 'NotAllowedError' || err.name === 'AbortError') return null
    throw err
  }
}

export async function getAssertion(
  options: WebAuthnLoginOptions,
): Promise<WebAuthnLoginResponse | null> {
  if (!isWebAuthnAvailable()) return null

  const pubKey: PublicKeyCredentialRequestOptions = {
    challenge: base64urlToBuffer(options.challenge),
    userVerification: options.userVerification || 'preferred',
  }

  if (options.allowCredentials && options.allowCredentials.length > 0) {
    pubKey.allowCredentials = options.allowCredentials.map((c) => ({
      id: base64urlToBuffer(c.id),
      type: c.type,
      transports: c.transports as AuthenticatorTransport[],
    }))
  }

  try {
    const credential = (await navigator.credentials.get({ publicKey: pubKey })) as PublicKeyCredential
    const response = credential.response as AuthenticatorAssertionResponse

    return {
      id: credential.id,
      rawId: bufferToBase64url(credential.rawId),
      response: {
        authenticatorData: bufferToBase64url(response.authenticatorData),
        clientDataJSON: bufferToBase64url(response.clientDataJSON),
        signature: bufferToBase64url(response.signature),
        userHandle: response.userHandle ? bufferToBase64url(response.userHandle) : undefined,
      },
    }
  } catch (err: any) {
    if (err.name === 'NotAllowedError' || err.name === 'AbortError') return null
    throw err
  }
}
