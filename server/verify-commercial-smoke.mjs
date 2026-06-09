import './load-env.mjs'
const API_BASE = process.env.PLAYDRAMA_API_BASE || ''
const APP_BASE_URL = process.env.APP_BASE_URL || API_BASE

if (!API_BASE) {
  console.error('PLAYDRAMA_API_BASE is required.')
  console.error('Example: set PLAYDRAMA_API_BASE=https://playdrama-studio-preview.netlify.app')
  process.exit(1)
}

function url(path) {
  return `${API_BASE}${path}`
}

function check(label, ok, detail = '') {
  return { label, ok: Boolean(ok), detail }
}

async function getJson(path, options = {}) {
  const response = await fetch(url(path), options)
  const body = await response.json().catch(() => ({}))
  return { response, body }
}

async function getText(targetUrl) {
  const response = await fetch(targetUrl)
  const body = await response.text().catch(() => '')
  return { response, body }
}

function printReport(results, readiness) {
  const passed = results.filter((item) => item.ok).length
  const failed = results.length - passed

  console.log('PlayDrama commercial smoke test')
  console.log(`APP_BASE_URL: ${APP_BASE_URL || 'not configured'}`)
  console.log(`PLAYDRAMA_API_BASE: ${API_BASE}`)
  console.log(`Readiness: ${readiness?.status || 'n/a'} (${readiness?.passed ?? 'n/a'}/${readiness?.total ?? 'n/a'})`)
  console.log(`Decision: ${failed === 0 && readiness?.status === 'pass' ? 'GO' : 'NO-GO'}`)
  console.log(`Result: ${failed === 0 ? 'PASS' : 'FAIL'} (${passed}/${results.length})`)
  console.log('')

  for (const item of results) {
    console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` - ${item.detail}` : ''}`)
  }

  if (readiness?.missing?.length) {
    console.log('')
    console.log('Remaining commercial blockers')
    for (const item of readiness.missing) {
      const fields = item.missingFields.length > 0 ? ` (${item.missingFields.join(', ')})` : ''
      console.log(`- ${item.area} / ${item.label}${fields}: ${item.action}`)
    }
  }
}

const results = []

const home = await getText(APP_BASE_URL || API_BASE)
results.push(check('Homepage responds', home.response.ok, `HTTP ${home.response.status}`))

const health = await getJson('/api/health')
results.push(check('API health responds', health.response.ok && health.body.ok, `HTTP ${health.response.status}`))
results.push(check('API uses Postgres storage', health.body.storage?.driver === 'postgres', health.body.storage?.driver || 'unknown'))
results.push(check('API storage is production ready', health.body.storage?.productionReady === true))

const readinessResult = await getJson('/api/readiness')
const readiness = readinessResult.body
results.push(check('Readiness endpoint responds', readinessResult.response.ok, `HTTP ${readinessResult.response.status}`))
results.push(check('Readiness shape is complete', Array.isArray(readiness.items) && readiness.items.length === 17, `${readiness.items?.length || 0}/17`))

const auth = await getJson('/api/auth/providers')
results.push(check('Auth provider endpoint responds', auth.response.ok, `HTTP ${auth.response.status}`))
results.push(check('Auth provider is not local demo', auth.body.provider !== 'local-demo', auth.body.provider || 'unknown'))
results.push(check('Auth is request scoped', auth.body.requestScoped === true))

const unauthMe = await getJson('/api/me')
if (auth.body.provider === 'local-demo') {
  results.push(check('Local demo /api/me remains reachable', unauthMe.response.ok, `HTTP ${unauthMe.response.status}`))
} else {
  results.push(check('Unauthenticated /api/me is rejected', unauthMe.response.status === 401, `HTTP ${unauthMe.response.status}`))
}

const ai = await getJson('/api/ai/providers')
results.push(check('AI provider endpoint responds', ai.response.ok, `HTTP ${ai.response.status}`))
results.push(check('AI public launch disables OpenAI by default', ai.body.openaiPolicy === 'Disabled for China public launch', ai.body.openaiPolicy || 'unknown'))

const email = await getJson('/api/email/provider')
results.push(check('Email provider endpoint responds', email.response.ok, `HTTP ${email.response.status}`))

printReport(results, readiness)

if (results.some((item) => !item.ok) || readiness.status !== 'pass') {
  process.exitCode = 1
}
