import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import './load-env.mjs'
import pg from 'pg'

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const schemaPath = join(projectRoot, 'docs', 'database-schema.sql')

async function getPostgresConnectionString() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }

  if (process.env.NETLIFY_DATABASE_READY === 'true') {
    const { getConnectionString } = await import('@netlify/database')
    return getConnectionString()
  }

  console.error('DATABASE_URL or NETLIFY_DATABASE_READY=true is required for db:schema.')
  console.error('Example: set DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/playdrama')
  process.exit(1)
}

const schema = readFileSync(schemaPath, 'utf8')
const pool = new pg.Pool({ connectionString: await getPostgresConnectionString() })

try {
  await pool.query(schema)
  console.log('PostgreSQL schema applied')
  console.log(`Schema: ${schemaPath}`)
} finally {
  await pool.end()
}
