export default {
  async fetch(request, env) {
    // CORS preflight — must be before method check
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      })
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const { prompt, model } = body
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Missing prompt' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const modelName = model || '@cf/meta/llama-3.2-3b-instruct'

    try {
	const result = await env.AI.run(modelName, {
		messages: [{ role: 'user', content: prompt }],
		max_tokens: 2048,
		temperature: 0.7,
	})

	const raw = result?.response || result
	const responseText = typeof raw === 'string' ? raw : JSON.stringify(raw)
	return new Response(JSON.stringify({ response: responseText }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }
  },
}