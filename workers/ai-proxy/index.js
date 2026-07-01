const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function cors(res) {
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    res.headers.set(k, v)
  }
  return res
}

function json(data, status = 200) {
  return cors(new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }))
}

function error(msg, status = 400) {
  return json({ error: msg }, status)
}

// ── Base64url helpers ────────────────────────────────────
function base64urlToBytes(s) {
  const binary = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  const buf = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i)
  return buf
}

function bytesToBase64url(buf) {
  let binary = ''
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomBytes(n) {
  const buf = new Uint8Array(n)
  crypto.getRandomValues(buf)
  return buf
}

function generateChallenge() {
  return bytesToBase64url(randomBytes(32))
}

// ── Minimal CBOR decoder ─────────────────────────────────
function decodeCBOR(data) {
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength)
  let offset = 0

  function readByte() { return data[offset++] }
  function readBytes(n) { const slice = data.slice(offset, offset + n); offset += n; return slice }

  function decodeItem() {
    const first = readByte()
    const major = first >> 5
    let info = first & 0x1f
    let value = info

    if (info === 24) { value = readByte() }
    else if (info === 25) { value = dv.getUint16(offset); offset += 2 }
    else if (info === 26) { value = dv.getUint32(offset); offset += 4 }
    else if (info === 27) {
      const hi = dv.getUint32(offset); offset += 4
      const lo = dv.getUint32(offset); offset += 4
      value = hi * 0x100000000 + lo
    }

    switch (major) {
      case 0: return value
      case 1: return -1 - value
      case 2: return readBytes(value)
      case 3: {
        const bytes = readBytes(value)
        return new TextDecoder().decode(bytes)
      }
      case 4: { const arr = []; for (let i = 0; i < value; i++) arr.push(decodeItem()); return arr }
      case 5: { const map = {}; for (let i = 0; i < value; i++) { const k = decodeItem(); map[k] = decodeItem() }; return map }
      case 7: {
        if (info === 20) return false
        if (info === 21) return true
        if (info === 22) return null
        if (info === 23) return undefined
        if (info === 25) { const half = dv.getUint16(offset - 2); return half }
        if (info === 26) return dv.getFloat32(offset - 4)
        if (info === 27) return dv.getFloat64(offset - 8)
        return value
      }
      default: throw new Error(`Unsupported CBOR major type ${major}`)
    }
  }

  return decodeItem()
}

// ── COSE key parser (ES256 / P-256) ──────────────────────
function parseCOSEKey(cborMap) {
  const kty = cborMap[1]
  const alg = cborMap[3]
  const crv = cborMap[-1]
  const x = cborMap[-2]
  const y = cborMap[-3]

  if (kty !== 2 || alg !== -7 || crv !== 1) {
    throw new Error('Only ES256 (EC2 P-256) keys are supported')
  }

  const uncompressed = new Uint8Array(1 + x.length + y.length)
  uncompressed[0] = 0x04
  uncompressed.set(x, 1)
  uncompressed.set(y, 1 + x.length)
  return uncompressed
}

// ── Extract COSE key from attestation object ─────────────
function extractPublicKey(attestationObject) {
  const decoded = decodeCBOR(attestationObject)
  const authData = decoded.authData

  // Flags byte is at offset 32 (after 32-byte RP ID hash)
  const flags = authData[32]
  const hasAttestedData = (flags & 0x40) !== 0

  if (!hasAttestedData) throw new Error('No attested credential data')

  // Skip RP ID hash (32) + flags (1) + sign count (4) = 37 bytes
  let offset = 37

  // Skip AAGUID (16 bytes)
  offset += 16

  // Read credential ID length (2 bytes, big-endian)
  const credIdLen = (authData[offset] << 8) | authData[offset + 1]
  offset += 2

  // Skip credential ID
  offset += credIdLen

  // Remaining is COSE key
  const coseBytes = authData.slice(offset)
  const coseMap = decodeCBOR(coseBytes)

  return { publicKey: parseCOSEKey(coseMap), credentialIdLength: credIdLen }
}

// ── Password hashing (PBKDF2) ────────────────────────────
const PBKDF2_ITERATIONS = 100000

async function hashPassword(password, salt) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(password),
    { name: 'PBKDF2' }, false, ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key, 256,
  )
  return new Uint8Array(bits)
}

function generateSalt() {
  return randomBytes(16)
}

function bytesToHex(buf) {
  return Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  return bytes
}

// ── KV helpers ──────────────────────────────────────────
function userKey(userId) { return `history:${userId}` }
function challengeKey(c) { return `challenge:${c}` }
function credentialKey(id) { return `credential:${id}` }
function sessionKey(token) { return `session:${token}` }
function userDataKey(email) { return `user:${email}` }
function passwordKey(email) { return `password:${email}` }

async function getHistory(env, userId) {
  const raw = await env.ALTIANLY_DATA.get(userKey(userId))
  return raw ? JSON.parse(raw) : []
}

async function saveHistory(env, userId, entries) {
  await env.ALTIANLY_DATA.put(userKey(userId), JSON.stringify(entries))
}

// ── Auth: register/begin ─────────────────────────────────
async function handleRegisterBegin(env, body) {
  const { email, name, userId } = body
  if (!email || !name) return error('Missing email or name')

  const existing = await env.ALTIANLY_DATA.get(userDataKey(email))
  if (existing) return error('An account with this email already exists', 409)

  const challenge = generateChallenge()
  const userEncodedId = bytesToBase64url(new TextEncoder().encode(email))

  await env.ALTIANLY_DATA.put(challengeKey(challenge), JSON.stringify({ email, userId, type: 'register' }), { expirationTtl: 300 })

  const rpId = new URL(env.RP_ORIGIN || 'http://localhost:8081').hostname

  return json({
    challenge,
    rp: { name: 'Altianly', id: rpId },
    user: { id: userEncodedId, name: email, displayName: name },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  })
}

// ── Auth: register/complete ──────────────────────────────
async function handleRegisterComplete(env, body) {
  const { email, name, userId, credential } = body
  if (!email || !name || !credential) return error('Missing required fields')

  const existing = await env.ALTIANLY_DATA.get(userDataKey(email))
  if (existing) return error('An account with this email already exists', 409)

  try {
    const attBytes = base64urlToBytes(credential.response.attestationObject)
    const clientDataJSON = base64urlToBytes(credential.response.clientDataJSON)

    const clientData = JSON.parse(new TextDecoder().decode(clientDataJSON))
    const storedChallenge = await env.ALTIANLY_DATA.get(challengeKey(clientData.challenge))
    if (!storedChallenge) return error('Challenge not found or expired', 400)

    await env.ALTIANLY_DATA.delete(challengeKey(clientData.challenge))

    const { publicKey } = extractPublicKey(attBytes)

    await env.ALTIANLY_DATA.put(credentialKey(credential.id), JSON.stringify({
      email,
      publicKey: bytesToBase64url(publicKey),
      createdAt: Date.now(),
    }))

    await env.ALTIANLY_DATA.put(userDataKey(email), JSON.stringify({
      name, email, userId, createdAt: Date.now(),
    }))

    const token = crypto.randomUUID()
    await env.ALTIANLY_DATA.put(sessionKey(token), JSON.stringify({ email }), { expirationTtl: 2592000 })

    return json({ ok: true, token, createdAt: Date.now() })
  } catch (err) {
    return error(`Registration failed: ${err.message}`, 500)
  }
}

// ── Auth: login/begin ────────────────────────────────────
async function handleLoginBegin(env) {
  const challenge = generateChallenge()
  await env.ALTIANLY_DATA.put(challengeKey(challenge), JSON.stringify({ type: 'login' }), { expirationTtl: 300 })

  return json({
    challenge,
    userVerification: 'preferred',
  })
}

// ── Auth: login/complete ─────────────────────────────────
async function handleLoginComplete(env, body) {
  const { assertion } = body
  if (!assertion) return error('Missing assertion')

  try {
    const clientDataJSON = base64urlToBytes(assertion.response.clientDataJSON)
    const clientData = JSON.parse(new TextDecoder().decode(clientDataJSON))

    const storedChallenge = await env.ALTIANLY_DATA.get(challengeKey(clientData.challenge))
    if (!storedChallenge) return error('Challenge not found or expired', 400)
    await env.ALTIANLY_DATA.delete(challengeKey(clientData.challenge))

    const credData = await env.ALTIANLY_DATA.get(credentialKey(assertion.id))
    if (!credData) return error('Credential not found', 404)

    const { email, publicKey: pubKeyB64 } = JSON.parse(credData)
    const userData = await env.ALTIANLY_DATA.get(userDataKey(email))
    if (!userData) return error('User not found', 404)

    const user = JSON.parse(userData)

    const publicKeyRaw = base64urlToBytes(pubKeyB64)
    const authenticatorData = base64urlToBytes(assertion.response.authenticatorData)
    const signature = base64urlToBytes(assertion.response.signature)

    const clientDataHash = await crypto.subtle.digest('SHA-256', clientDataJSON)
    const signedData = new Uint8Array(authenticatorData.length + new Uint8Array(clientDataHash).length)
    signedData.set(new Uint8Array(authenticatorData), 0)
    signedData.set(new Uint8Array(clientDataHash), authenticatorData.length)

    const publicKey = await crypto.subtle.importKey(
      'raw', publicKeyRaw,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false, ['verify'],
    )

    const isValid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey, signature, signedData,
    )

    if (!isValid) return error('Invalid signature', 401)

    const token = crypto.randomUUID()
    await env.ALTIANLY_DATA.put(sessionKey(token), JSON.stringify({ email }), { expirationTtl: 2592000 })

    return json({ ok: true, token, user: { name: user.name, email: user.email, createdAt: user.createdAt } })
  } catch (err) {
    return error(`Login failed: ${err.message}`, 500)
  }
}

// ── Auth: session validate ───────────────────────────────
async function handleSessionValidate(env, token) {
  if (!token) return json({ valid: false })
  const data = await env.ALTIANLY_DATA.get(sessionKey(token))
  if (!data) return json({ valid: false })
  const { email } = JSON.parse(data)
  const userData = await env.ALTIANLY_DATA.get(userDataKey(email))
  if (!userData) return json({ valid: false })
  const user = JSON.parse(userData)
  return json({ valid: true, user })
}

// ── Auth: logout ─────────────────────────────────────────
async function handleLogout(env, body) {
  const { token } = body
  if (token) await env.ALTIANLY_DATA.delete(sessionKey(token))
  return json({ ok: true })
}

// ── Auth: password register ──────────────────────────────
async function handlePasswordRegister(env, body) {
  const { email, name, password } = body
  if (!email || !name || !password) return error('Missing required fields')
  if (password.length < 6) return error('Password must be at least 6 characters')

  const existing = await env.ALTIANLY_DATA.get(userDataKey(email))
  if (existing) return error('An account with this email already exists', 409)

  const salt = generateSalt()
  const hash = await hashPassword(password, salt)

  await env.ALTIANLY_DATA.put(passwordKey(email), JSON.stringify({
    salt: bytesToHex(salt),
    hash: bytesToHex(hash),
  }))

  await env.ALTIANLY_DATA.put(userDataKey(email), JSON.stringify({
    name, email, createdAt: Date.now(),
  }))

  const token = crypto.randomUUID()
  await env.ALTIANLY_DATA.put(sessionKey(token), JSON.stringify({ email }), { expirationTtl: 2592000 })

  return json({ ok: true, token, createdAt: Date.now(), name })
}

// ── Auth: password login ─────────────────────────────────
async function handlePasswordLogin(env, body) {
  const { email, password } = body
  if (!email || !password) return error('Missing email or password')

  const pwData = await env.ALTIANLY_DATA.get(passwordKey(email))
  if (!pwData) return error('Invalid email or password', 401)

  const { salt, hash: storedHash } = JSON.parse(pwData)
  const saltBytes = hexToBytes(salt)
  const hashBytes = hexToBytes(storedHash)
  const computedHash = await hashPassword(password, saltBytes)

  if (bytesToHex(computedHash) !== bytesToHex(hashBytes)) {
    return error('Invalid email or password', 401)
  }

  const userData = await env.ALTIANLY_DATA.get(userDataKey(email))
  if (!userData) return error('User not found', 404)

  const user = JSON.parse(userData)
  const token = crypto.randomUUID()
  await env.ALTIANLY_DATA.put(sessionKey(token), JSON.stringify({ email }), { expirationTtl: 2592000 })

  return json({ ok: true, token, name: user.name, createdAt: user.createdAt })
}

// ── Router ──────────────────────────────────────────────
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return cors(new Response(null))

    const url = new URL(request.url)
    const path = url.pathname
    const userId = url.searchParams.get('userId') || ''

    // ── Auth: register/begin ──────────────────────────────
    if (path === '/auth/register/begin' && request.method === 'POST') {
      const body = await request.json().catch(() => null)
      if (!body) return error('Invalid JSON')
      return handleRegisterBegin(env, body)
    }

    // ── Auth: register/complete ───────────────────────────
    if (path === '/auth/register/complete' && request.method === 'POST') {
      const body = await request.json().catch(() => null)
      if (!body) return error('Invalid JSON')
      return handleRegisterComplete(env, body)
    }

    // ── Auth: login/begin ─────────────────────────────────
    if (path === '/auth/login/begin' && request.method === 'POST') {
      return handleLoginBegin(env)
    }

    // ── Auth: login/complete ──────────────────────────────
    if (path === '/auth/login/complete' && request.method === 'POST') {
      const body = await request.json().catch(() => null)
      if (!body) return error('Invalid JSON')
      return handleLoginComplete(env, body)
    }

    // ── Auth: session ─────────────────────────────────────
    if (path.startsWith('/auth/session/') && request.method === 'GET') {
      const token = path.split('/').slice(3).join('/')
      return handleSessionValidate(env, token)
    }

    // ── Auth: logout ──────────────────────────────────────
    if (path === '/auth/logout' && request.method === 'POST') {
      const body = await request.json().catch(() => null)
      return handleLogout(env, body || {})
    }

    // ── Auth: password register ───────────────────────────
    if (path === '/auth/password/register' && request.method === 'POST') {
      const body = await request.json().catch(() => null)
      if (!body) return error('Invalid JSON')
      return handlePasswordRegister(env, body)
    }

    // ── Auth: password login ──────────────────────────────
    if (path === '/auth/password/login' && request.method === 'POST') {
      const body = await request.json().catch(() => null)
      if (!body) return error('Invalid JSON')
      return handlePasswordLogin(env, body)
    }

    // ── Food search ──────────────────────────────────────
    if (path === '/food/search' && request.method === 'POST') {
      const body = await request.json().catch(() => null)
      if (!body) return error('Invalid JSON')
      const { query, pageSize } = body
      if (!query) return error('Missing query')

      try {
        const usdaRes = await fetch('https://api.nal.usda.gov/fdc/v1/foods/search?api_key=DEMO_KEY', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            pageSize: pageSize || 25,
            dataType: ['Foundation', 'SR Legacy', 'Branded'],
            sortBy: 'dataType.keyword',
            sortOrder: 'asc',
          }),
        })
        if (!usdaRes.ok) {
          const errText = await usdaRes.text()
          return json({ error: `USDA error ${usdaRes.status}: ${errText}` }, 502)
        }
        const data = await usdaRes.json()

        const foods = (data.foods || []).map((f) => ({
          id: String(f.fdcId),
          name: f.description,
          brandName: f.brandName || f.brandOwner || null,
          servingSize: f.servingSize || null,
          servingUnit: f.servingSizeUnit || null,
          nutrients: {
            calories: Math.round((f.foodNutrients?.find((n) => n.nutrientId === 1008)?.value || 0) * 10) / 10,
            protein: Math.round((f.foodNutrients?.find((n) => n.nutrientId === 1003)?.value || 0) * 10) / 10,
            carbs: Math.round((f.foodNutrients?.find((n) => n.nutrientId === 1005)?.value || 0) * 10) / 10,
            fat: Math.round((f.foodNutrients?.find((n) => n.nutrientId === 1004)?.value || 0) * 10) / 10,
            fiber: Math.round((f.foodNutrients?.find((n) => n.nutrientId === 1079)?.value || 0) * 10) / 10,
            sugar: Math.round((f.foodNutrients?.find((n) => n.nutrientId === 2000)?.value || 0) * 10) / 10,
            sodium: Math.round((f.foodNutrients?.find((n) => n.nutrientId === 1093)?.value || 0) * 10) / 10,
          },
        }))

        return json({ foods })
      } catch (err) {
        return json({ error: err.message }, 500)
      }
    }

    // ── AI endpoint ──────────────────────────────────────
    if (path === '/ai' && request.method === 'POST') {
      const body = await request.json().catch(() => null)
      if (!body) return error('Invalid JSON')
      const { prompt, model } = body
      if (!prompt) return error('Missing prompt')

      try {
        const modelName = model || '@cf/meta/llama-3.2-3b-instruct'
        const result = await env.AI.run(modelName, {
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2048,
          temperature: 0.7,
        })
        const raw = result?.response || result
        const responseText = typeof raw === 'string' ? raw : JSON.stringify(raw)
        return json({ response: responseText })
      } catch (err) {
        return json({ error: err.message }, 500)
      }
    }

    // ── Data: POST /data ─────────────────────────────────
    if (path === '/data' && request.method === 'POST') {
      if (!userId) return error('Missing userId query param')
      const body = await request.json().catch(() => null)
      if (!body) return error('Invalid JSON')

      const entry = {
        bmi: body.bmi,
        weightLbs: body.weightLbs,
        evaluation: body.evaluation,
        timestamp: body.timestamp || Date.now(),
        age: body.age,
        gender: body.gender,
      }

      const entries = await getHistory(env, userId)
      entries.push(entry)
      await saveHistory(env, userId, entries)
      return json({ ok: true, count: entries.length })
    }

    // ── Data: GET /data ──────────────────────────────────
    if (path === '/data' && request.method === 'GET') {
      if (!userId) return error('Missing userId query param')
      const entries = await getHistory(env, userId)
      return json({ entries })
    }

    // ── Data: DELETE /data/:ts ────────────────────────────
    if (path.startsWith('/data/') && request.method === 'DELETE') {
      if (!userId) return error('Missing userId query param')
      const ts = parseInt(path.split('/')[2], 10)
      if (isNaN(ts)) return error('Invalid timestamp')

      let entries = await getHistory(env, userId)
      entries = entries.filter((e) => e.timestamp !== ts)
      await saveHistory(env, userId, entries)
      return json({ ok: true, count: entries.length })
    }

    // ── Data: DELETE /data ────────────────────────────────
    if (path === '/data' && request.method === 'DELETE') {
      if (!userId) return error('Missing userId query param')
      await env.ALTIANLY_DATA.delete(userKey(userId))
      return json({ ok: true, count: 0 })
    }

    return error('Not found', 404)
  },
}
