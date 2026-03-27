const BASE = 'http://localhost:3001/api'

function getToken() {
  return localStorage.getItem('token')
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  // Configurators
  getConfigurators: () => request('/configurators'),
  getPublicConfigurator: (id) => request(`/configurators/public/${id}`),
  createConfigurator: (body) => request('/configurators', { method: 'POST', body: JSON.stringify(body) }),
  updateConfigurator: (id, body) => request(`/configurators/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteConfigurator: (id) => request(`/configurators/${id}`, { method: 'DELETE' }),

  // Orders
  submitOrder: (configId, body) => request(`/configurators/${configId}/orders`, { method: 'POST', body: JSON.stringify(body) }),
  getOrders: () => request('/orders'),
  updateOrderStatus: (id, status) => request(`/orders/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
}
