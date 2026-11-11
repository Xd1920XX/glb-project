import { onRequestPost } from '../functions/api/submit.js'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/api/submit') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
      return onRequestPost({ request, env })
    }
    return env.ASSETS.fetch(request)
  },
}
