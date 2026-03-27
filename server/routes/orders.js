import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import db from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Public — submit order for a configurator
router.post('/configurators/:configId/orders', (req, res) => {
  const cfg = db.prepare('SELECT id FROM configurators WHERE id = ?').get(req.params.configId)
  if (!cfg) return res.status(404).json({ error: 'Configurator not found' })

  const { frame_id, lid_id, show_panels, price, customer_name, customer_email, customer_phone, customer_address, notes } = req.body
  if (!frame_id || !lid_id || !customer_name || !customer_email) {
    return res.status(400).json({ error: 'frame_id, lid_id, customer_name and customer_email are required' })
  }
  const id = uuid()
  db.prepare(`
    INSERT INTO orders (id, configurator_id, frame_id, lid_id, show_panels, price, customer_name, customer_email, customer_phone, customer_address, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, cfg.id, frame_id, lid_id, show_panels ? 1 : 0, price || 0, customer_name, customer_email, customer_phone || null, customer_address || null, notes || null)
  res.status(201).json({ id, message: 'Order placed successfully' })
})

// Protected — list orders for own configurators
router.get('/orders', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT o.*, c.name as configurator_name
    FROM orders o
    JOIN configurators c ON c.id = o.configurator_id
    WHERE c.user_id = ?
    ORDER BY o.created_at DESC
  `).all(req.user.id)
  res.json(rows)
})

// Protected — update order status
router.put('/orders/:id', requireAuth, (req, res) => {
  const order = db.prepare(`
    SELECT o.* FROM orders o
    JOIN configurators c ON c.id = o.configurator_id
    WHERE o.id = ? AND c.user_id = ?
  `).get(req.params.id, req.user.id)
  if (!order) return res.status(404).json({ error: 'Not found' })
  const { status } = req.body
  if (!['new', 'processing', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, order.id)
  res.json({ ok: true })
})

export default router
