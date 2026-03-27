import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import db from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Public — load embed config
router.get('/public/:id', (req, res) => {
  const cfg = db.prepare('SELECT * FROM configurators WHERE id = ?').get(req.params.id)
  if (!cfg) return res.status(404).json({ error: 'Not found' })
  res.json(cfg)
})

// Protected — list own configurators
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM configurators WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id)
  res.json(rows)
})

// Protected — create configurator
router.post('/', requireAuth, (req, res) => {
  const { name, default_frame, default_lid, default_panels, accent_color } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  const id = uuid()
  db.prepare(`
    INSERT INTO configurators (id, user_id, name, default_frame, default_lid, default_panels, accent_color)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    req.user.id,
    name,
    default_frame || 'B3',
    default_lid || 'Bio',
    default_panels !== undefined ? (default_panels ? 1 : 0) : 1,
    accent_color || '#1a1a1a',
  )
  const cfg = db.prepare('SELECT * FROM configurators WHERE id = ?').get(id)
  res.status(201).json(cfg)
})

// Protected — update configurator
router.put('/:id', requireAuth, (req, res) => {
  const cfg = db.prepare('SELECT * FROM configurators WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!cfg) return res.status(404).json({ error: 'Not found' })
  const { name, default_frame, default_lid, default_panels, accent_color } = req.body
  db.prepare(`
    UPDATE configurators
    SET name = ?, default_frame = ?, default_lid = ?, default_panels = ?, accent_color = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name ?? cfg.name,
    default_frame ?? cfg.default_frame,
    default_lid ?? cfg.default_lid,
    default_panels !== undefined ? (default_panels ? 1 : 0) : cfg.default_panels,
    accent_color ?? cfg.accent_color,
    cfg.id,
  )
  res.json(db.prepare('SELECT * FROM configurators WHERE id = ?').get(cfg.id))
})

// Protected — delete configurator
router.delete('/:id', requireAuth, (req, res) => {
  const result = db.prepare('DELETE FROM configurators WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' })
  res.json({ ok: true })
})

export default router
