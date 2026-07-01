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

function randomBytes(n) {
  const buf = new Uint8Array(n)
  crypto.getRandomValues(buf)
  return buf
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

// ── Router ──────────────────────────────────────────────
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return cors(new Response(null))

    const url = new URL(request.url)
    const path = url.pathname
    const userId = url.searchParams.get('userId') || ''

    // ── Auth: password register ───────────────────────────
    if (path === '/auth/password/register' && request.method === 'POST') {
      const body = await request.json().catch(() => null)
      if (!body) return error('Invalid JSON')
      return handlePasswordRegister(env, body)
    }

    // ── Auth: password login ─────────────────────────────
    if (path === '/auth/password/login' && request.method === 'POST') {
      const body = await request.json().catch(() => null)
      if (!body) return error('Invalid JSON')
      return handlePasswordLogin(env, body)
    }

    // ── Auth: session ────────────────────────────────────
    if (path.startsWith('/auth/session/') && request.method === 'GET') {
      const token = path.split('/').slice(3).join('/')
      return handleSessionValidate(env, token)
    }

    // ── Auth: logout ─────────────────────────────────────
    if (path === '/auth/logout' && request.method === 'POST') {
      const body = await request.json().catch(() => null)
      return handleLogout(env, body || {})
    }

    // ── Food search ──────────────────────────────────────
    if (path === '/food/search' && request.method === 'POST') {
      const body = await request.json().catch(() => null)
      if (!body) return error('Invalid JSON')
      const { query, pageSize } = body
      if (!query) return error('Missing query')

      try {
        const usdaRes = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${env.USDA_API_KEY || 'DEMO_KEY'}`, {
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

    // ── Food parse (natural language) ─────────────────────
    if (path === '/food/parse' && request.method === 'POST') {
      const body = await request.json().catch(() => null)
      if (!body) return error('Invalid JSON')
      const { text } = body
      if (!text) return error('Missing text')

      try {
        const extractRes = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
          messages: [
            {
              role: 'system',
              content: `Extract food items from a meal description. Return ONLY a valid JSON array.
Each item: { "name": "standardized food name for USDA lookup", "servings": number }

Rules:
- Standardize names (e.g. "coffee with milk" → "latte", "fries" → "french fries")
- Default servings to 1 if not specified
- If serving count is specified (e.g. "2 eggs"), use that number
- Output ONLY the JSON array, no other text`,
            },
            { role: 'user', content: text },
          ],
          max_tokens: 1024,
          temperature: 0.1,
        })
        const rawResponse = extractRes?.response || extractRes
        const responseText = typeof rawResponse === 'string' ? rawResponse : JSON.stringify(rawResponse)

        let items
        try {
          const cleaned = responseText.replace(/```(?:json)?\s*/gi, '').trim()
          items = JSON.parse(cleaned)
        } catch {
          return json({ error: 'Failed to parse food items from text' }, 500)
        }
        if (!Array.isArray(items)) {
          return json({ error: 'Invalid response format' }, 500)
        }

        const results = []
        for (const item of items) {
          const name = (item.name || '').trim()
          const servings = typeof item.servings === 'number' ? item.servings : 1
          if (!name) continue

          // Look up in USDA
          const usdaRes = await fetch('https://api.nal.usda.gov/fdc/v1/foods/search?api_key=' + (env.USDA_API_KEY || 'DEMO_KEY'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: name,
              pageSize: 3,
              dataType: ['Foundation', 'SR Legacy', 'Branded'],
              sortBy: 'dataType.keyword',
              sortOrder: 'asc',
            }),
          })

          let tier = 3
          let food = null
          let estimatedNutrients = null

          if (usdaRes.ok) {
            const usdaData = await usdaRes.json()
            const foods = usdaData.foods || []
            if (foods.length > 0) {
              const best = foods[0]
              const nut = (n) => Math.round((best.foodNutrients?.find((x) => x.nutrientId === n)?.value || 0) * 10) / 10
              const nameMatch = best.description.toLowerCase().includes(name) || name.includes(best.description.toLowerCase().split(' ').slice(0, 2).join(' '))
              tier = nameMatch ? 1 : 2
              food = {
                id: String(best.fdcId),
                name: best.description,
                brandName: best.brandName || best.brandOwner || null,
                servingSize: best.servingSize || null,
                servingUnit: best.servingSizeUnit || null,
                nutrients: {
                  calories: nut(1008), protein: nut(1003), carbs: nut(1005), fat: nut(1004),
                  fiber: nut(1079), sugar: nut(2000), sodium: nut(1093),
                },
              }
            }
          }

          // Fallback: LLM estimate for Tier 3
          if (!food) {
            const estRes = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
              messages: [
                {
                  role: 'system',
                  content: `Estimate nutrition for a food item. Return ONLY a JSON object:
{ "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "sugar": number, "sodium": number }
All values per 100g/serving. Be reasonable based on common food knowledge. Output ONLY the JSON.`,
                },
                { role: 'user', content: name },
              ],
              max_tokens: 512,
              temperature: 0.1,
            })
            const estRaw = estRes?.response || estRes
            const estText = typeof estRaw === 'string' ? estRaw : JSON.stringify(estRaw)
            try {
              const cleaned = estText.replace(/```(?:json)?\s*/gi, '').trim()
              estimatedNutrients = JSON.parse(cleaned)
            } catch {
              estimatedNutrients = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }
            }
          }

          results.push({ name, servings, tier, food, estimatedNutrients })
        }

        return json({ items: results })
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
