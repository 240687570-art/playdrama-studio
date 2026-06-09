import './load-env.mjs'
import { evaluateProductionReadiness } from './readiness.mjs'

const API_BASE = process.env.PLAYDRAMA_API_BASE || 'http://127.0.0.1:8787'
const EXPECTED_ITEM_COUNT = evaluateProductionReadiness({}).total
const REQUIRED_ITEM_FIELDS = ['id', 'area', 'label', 'ok', 'action', 'missingFields']

async function request(path) {
  const response = await fetch(`${API_BASE}${path}`)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(`GET ${path} returned ${response.status}`)
    error.body = body
    throw error
  }
  return body
}

function check(label, ok, detail = '') {
  return { label, ok: Boolean(ok), detail }
}

function validReadinessItem(item) {
  return REQUIRED_ITEM_FIELDS.every((field) => Object.hasOwn(item, field)) &&
    Array.isArray(item.missingFields)
}

function printReport(results, readiness) {
  const passed = results.filter((item) => item.ok).length
  const failed = results.length - passed
  console.log('API readiness verification')
  console.log(`API: ${API_BASE}`)
  console.log(`Readiness: ${readiness?.status || 'n/a'} (${readiness?.passed ?? 'n/a'}/${readiness?.total ?? 'n/a'})`)
  console.log(`Result: ${failed === 0 ? 'PASS' : 'FAIL'} (${passed}/${results.length})`)
  console.log('')
  for (const item of results) {
    console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` - ${item.detail}` : ''}`)
  }
}

async function main() {
  const results = []

  const health = await request('/api/health')
  results.push(check('Health endpoint is ok', health.ok === true, health.service))
  results.push(
    check(
      'Health includes commercialReadiness',
      Boolean(health.commercialReadiness),
      health.commercialReadiness?.status,
    ),
  )

  const readiness = await request('/api/readiness')
  results.push(check('Readiness status is known', ['pass', 'blocked'].includes(readiness.status), readiness.status))
  results.push(check('Readiness total is stable', readiness.total === EXPECTED_ITEM_COUNT, `${readiness.total}`))
  results.push(check('Readiness item list is complete', readiness.items?.length === EXPECTED_ITEM_COUNT, `${readiness.items?.length || 0}`))
  results.push(check('Readiness missing list is present', Array.isArray(readiness.missing), `${readiness.missing?.length || 0}`))
  results.push(
    check(
      'Readiness passed count matches items',
      readiness.passed === readiness.items?.filter((item) => item.ok).length,
      `${readiness.passed}`,
    ),
  )
  results.push(
    check(
      'Readiness missing count matches items',
      readiness.missing?.length === readiness.items?.filter((item) => !item.ok).length,
      `${readiness.missing?.length || 0}`,
    ),
  )
  results.push(
    check(
      'All readiness items expose operator fields',
      Array.isArray(readiness.items) && readiness.items.every(validReadinessItem),
    ),
  )
  results.push(
    check(
      'Health and readiness endpoint agree',
      health.commercialReadiness?.status === readiness.status &&
        health.commercialReadiness?.passed === readiness.passed &&
        health.commercialReadiness?.total === readiness.total,
      `${health.commercialReadiness?.status}/${readiness.status}`,
    ),
  )

  printReport(results, readiness)

  if (results.some((item) => !item.ok)) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('API readiness verification failed')
  console.error(error.message)
  if (error.body) {
    console.error(JSON.stringify(error.body, null, 2))
  }
  process.exitCode = 1
})
