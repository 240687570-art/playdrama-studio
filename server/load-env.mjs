import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function parseEnvLine(line) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return null

  const normalized = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed
  const equalsIndex = normalized.indexOf('=')
  if (equalsIndex === -1) return null

  const key = normalized.slice(0, equalsIndex).trim()
  let value = normalized.slice(equalsIndex + 1).trim()
  if (!key) return null

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }

  return [key, value]
}

export function loadEnvFile(filePath, { override = false } = {}) {
  if (!existsSync(filePath)) return false

  const raw = readFileSync(filePath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const parsed = parseEnvLine(line)
    if (!parsed) continue
    const [key, value] = parsed
    if (!override && process.env[key] !== undefined) continue
    process.env[key] = value
  }

  return true
}

export function loadLocalEnv({ cwd = process.cwd(), override = false } = {}) {
  loadEnvFile(join(cwd, '.env'), { override })
  loadEnvFile(join(cwd, '.env.local'), { override })
}

loadLocalEnv()
