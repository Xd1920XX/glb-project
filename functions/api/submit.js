const RECIPIENT = 'Info@minisaun.ee'
const SENDER_EMAIL = 'noreply@minisaun.ee'
const SENDER_NAME = 'Minisaun Configurator'

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export async function onRequestPost({ request, env }) {
  if (!env.BREVO_API_KEY) return json({ error: 'Email not configured' }, 500)

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  if (body.botField) return json({ ok: true })

  const { name, email, phone, address, message, color, heater } = body
  if (!name || !email) return json({ error: 'Missing required fields' }, 400)

  const fields = [
    ['Name', name],
    ['Email', email],
    ['Phone', phone],
    ['Address', address],
    ['Color', color],
    ['Heater', heater],
    ['Message', message],
  ].filter(([, v]) => v)

  const rows = fields
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;font-weight:600">${escapeHtml(k)}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`)
    .join('')
  const html = `<h2>New sauna order</h2><table>${rows}</table>`
  const text = `New sauna order\n\n` + fields.map(([k, v]) => `${k}: ${v}`).join('\n')

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: SENDER_EMAIL, name: SENDER_NAME },
      to: [{ email: RECIPIENT }],
      replyTo: { email, name },
      subject: `New sauna order from ${name}`,
      htmlContent: html,
      textContent: text,
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    console.error('Brevo error', res.status, detail)
    return json({ error: 'Email send failed' }, 502)
  }

  return json({ ok: true })
}

export function onRequest() {
  return json({ error: 'Method not allowed' }, 405)
}
