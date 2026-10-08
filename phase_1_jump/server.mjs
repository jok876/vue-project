import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import apiRouter from './api.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3000

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/records', apiRouter)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

const distDir = path.join(__dirname, 'dist')
app.use(express.static(distDir))
app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'), (err) => {
    if (err) res.status(404).send('Not found. Run npm run build first.')
  })
})

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found' })
})

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => {
  console.log('Server running at http://localhost:' + PORT)
})