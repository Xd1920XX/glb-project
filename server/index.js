import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import configuratorRoutes from './routes/configurators.js'
import orderRoutes from './routes/orders.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/configurators', configuratorRoutes)
app.use('/api', orderRoutes)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`))
