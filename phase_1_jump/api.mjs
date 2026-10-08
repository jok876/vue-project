import express from 'express'
import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const db = new Database(path.join(__dirname, 'db.sqlite'))
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    pk             INTEGER PRIMARY KEY AUTOINCREMENT,
    nationality    TEXT    NOT NULL,
    name           TEXT    NOT NULL,
    firstAttempt   REAL    NOT NULL,
    secondAttempt  REAL    NOT NULL,
    thirdAttempt   REAL    NOT NULL
  )
`)

const stmtAll    = db.prepare('SELECT * FROM records ORDER BY pk')
const stmtOne    = db.prepare('SELECT * FROM records WHERE pk = ?')
const stmtInsert = db.prepare(`
  INSERT INTO records (nationality, name, firstAttempt, secondAttempt, thirdAttempt)
  VALUES (@nationality, @name, @firstAttempt, @secondAttempt, @thirdAttempt)
`)
const stmtUpdate = db.prepare(`
  UPDATE records SET
    nationality   = @nationality,
    name          = @name,
    firstAttempt  = @firstAttempt,
    secondAttempt = @secondAttempt,
    thirdAttempt  = @thirdAttempt
  WHERE pk = @pk
`)
const stmtDelete = db.prepare('DELETE FROM records WHERE pk = ?')

function validateRecord(body) {
  const errors = []
  const out = {}

  const checkString = (key, max) => {
    if (typeof body[key] !== 'string' || body[key].trim() === '') {
      errors.push(key + ' must be a non-empty string')
      return
    }
    const v = body[key].trim()
    if (v.length > max) {
      errors.push(key + ' must be at most ' + max + ' characters')
      return
    }
    out[key] = v
  }

  const checkNumber = (key) => {
    const n = Number(body[key])
    if (!Number.isFinite(n)) {
      errors.push(key + ' must be a number')
      return
    }
    if (n < 0 || n > 20) {
      errors.push(key + ' must be between 0 and 20')
      return
    }
    out[key] = n
  }

  checkString('nationality', 3)
  checkString('name', 60)
  checkNumber('firstAttempt')
  checkNumber('secondAttempt')
  checkNumber('thirdAttempt')

  return { errors, value: out }
}

const router = express.Router()

router.get('/', (_req, res, next) => {
  try {
    res.status(200).json(stmtAll.all())
  } catch (err) { next(err) }
})

router.get('/:pk', (req, res, next) => {
  const pk = Number(req.params.pk)
  if (!Number.isInteger(pk) || pk <= 0) {
    return res.status(400).json({ error: 'Invalid id' })
  }
  try {
    const row = stmtOne.get(pk)
    if (!row) return res.status(404).json({ error: 'Record not found' })
    res.status(200).json(row)
  } catch (err) { next(err) }
})

router.post('/', (req, res, next) => {
  const { errors, value } = validateRecord(req.body)
  if (errors.length) return res.status(400).json({ error: errors.join('; ') })
  try {
    const info = stmtInsert.run(value)
    const created = stmtOne.get(info.lastInsertRowid)
    res.status(201).location('/api/records/' + created.pk).json(created)
  } catch (err) { next(err) }
})

router.put('/:pk', (req, res, next) => {
  const pk = Number(req.params.pk)
  if (!Number.isInteger(pk) || pk <= 0) {
    return res.status(400).json({ error: 'Invalid id' })
  }
  if (!stmtOne.get(pk)) return res.status(404).json({ error: 'Record not found' })
  const { errors, value } = validateRecord(req.body)
  if (errors.length) return res.status(400).json({ error: errors.join('; ') })
  try {
    stmtUpdate.run({ pk, ...value })
    res.status(200).json(stmtOne.get(pk))
  } catch (err) { next(err) }
})

router.delete('/:pk', (req, res, next) => {
  const pk = Number(req.params.pk)
  if (!Number.isInteger(pk) || pk <= 0) {
    return res.status(400).json({ error: 'Invalid id' })
  }
  try {
    const info = stmtDelete.run(pk)
    if (info.changes === 0) return res.status(404).json({ error: 'Record not found' })
    res.status(204).end()
  } catch (err) { next(err) }
})

export default router