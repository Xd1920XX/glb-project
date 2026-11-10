var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/worker.js
var RECIPIENT = "Info@minisaun.ee";
var SENDER_EMAIL = "noreply@minisaun.ee";
var SENDER_NAME = "Minisaun Configurator";
function escapeHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
__name(escapeHtml, "escapeHtml");
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" }
  });
}
__name(json, "json");
async function handleSubmit(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!env.BREVO_API_KEY) return json({ error: "Email not configured" }, 500);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (body.botField) return json({ ok: true });
  const { name, email, phone, address, message, model, color, room, heater } = body;
  if (!name || !email) return json({ error: "Missing required fields" }, 400);
  const fields = [
    ["Name", name],
    ["Email", email],
    ["Phone", phone],
    ["Address", address],
    ["Model", model],
    ["Color", color],
    ["Room", room],
    ["Heater", heater],
    ["Message", message]
  ].filter(([, v]) => v);
  const rows = fields.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;font-weight:600">${escapeHtml(k)}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`).join("");
  const html = `<h2>New sauna order</h2><table>${rows}</table>`;
  const text = `New sauna order

` + fields.map(([k, v]) => `${k}: ${v}`).join("\n");
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": env.BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify({
      sender: { email: SENDER_EMAIL, name: SENDER_NAME },
      to: [{ email: RECIPIENT }],
      replyTo: { email, name },
      subject: `New sauna order from ${name}`,
      htmlContent: html,
      textContent: text
    })
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error("Brevo error", res.status, detail);
    return json({ error: "Email send failed" }, 502);
  }
  return json({ ok: true });
}
__name(handleSubmit, "handleSubmit");
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/submit") return handleSubmit(request, env);
    return env.ASSETS.fetch(request);
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
