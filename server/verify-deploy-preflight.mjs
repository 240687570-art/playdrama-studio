import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import './load-env.mjs'
import { evaluateProductionReadiness } from './readiness.mjs'

const API_BASE = process.env.PLAYDRAMA_API_BASE || ''
const FRONTEND_API_BASE =
  process.env.VITE_PLAYDRAMA_API_BASE ||
  process.env.VITE_PLAYDRAMA_API_BASES ||
  ''
const APP_BASE_URL = process.env.APP_BASE_URL || ''
const DEPLOY_TARGET = (process.env.PLAYDRAMA_DEPLOY_TARGET || '').toLowerCase()

function isHttpsPublicUrl(value = '') {
  return (
    value.startsWith('https://') &&
    !value.includes('127.0.0.1') &&
    !value.includes('localhost')
  )
}

function isLocalApiBase(value = '') {
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(?:\/|$)/i.test(value)
}

const frontendApiBases = FRONTEND_API_BASE.split(',')
  .map((item) => item.trim())
  .filter(Boolean)
const effectiveFrontendApiBases = frontendApiBases.filter((item) => !isLocalApiBase(item))
const SAME_ORIGIN_API = effectiveFrontendApiBases.length === 0 && isHttpsPublicUrl(APP_BASE_URL)
const FRONTEND_API_DETAIL = SAME_ORIGIN_API
  ? FRONTEND_API_BASE
    ? 'same-origin /api/* (local development API base ignored for production)'
    : 'same-origin /api/*'
  : effectiveFrontendApiBases.join(', ') || FRONTEND_API_BASE || 'VITE_PLAYDRAMA_API_BASE'

function check(label, ok, detail = '') {
  return { label, ok: Boolean(ok), detail }
}

async function fetchReadiness() {
  if (!API_BASE) return null
  const response = await fetch(`${API_BASE}/api/readiness`)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    return { error: `HTTP ${response.status}`, body }
  }
  return body
}

function distAssetCount() {
  const assetsDir = join(process.cwd(), 'dist', 'assets')
  if (!existsSync(assetsDir)) return 0
  return readdirSync(assetsDir).filter((item) => item.endsWith('.js') || item.endsWith('.css')).length
}

function deploymentConfigCheck() {
  if (DEPLOY_TARGET === 'aliyun' || DEPLOY_TARGET === 'cloud-server') {
    return check(
      'Cloud-server deploy config exists',
      existsSync(join(process.cwd(), 'deploy', 'aliyun', 'ops.sh')) &&
        existsSync(join(process.cwd(), 'deploy', 'cloud-server.env.example')),
      DEPLOY_TARGET,
    )
  }

  return check('Netlify static config exists', existsSync(join(process.cwd(), 'netlify.toml')))
}

function printReport(results, readiness) {
  const passed = results.filter((item) => item.ok).length
  const failed = results.length - passed
  console.log('Deployment preflight')
  console.log(`APP_BASE_URL: ${APP_BASE_URL || 'not configured'}`)
  console.log(`VITE_PLAYDRAMA_API_BASE: ${FRONTEND_API_BASE || 'not configured'}`)
  console.log(`Frontend API mode: ${SAME_ORIGIN_API ? 'same-origin /api/*' : 'configured base URL'}`)
  console.log(`PLAYDRAMA_API_BASE: ${API_BASE || 'not configured'}`)
  console.log(`PLAYDRAMA_DEPLOY_TARGET: ${DEPLOY_TARGET || 'netlify'}`)
  console.log(`Readiness: ${readiness?.status || 'n/a'} (${readiness?.passed ?? 'n/a'}/${readiness?.total ?? 'n/a'})`)
  console.log(`Decision: ${failed === 0 ? 'GO' : 'NO-GO'}`)
  console.log(`Result: ${failed === 0 ? 'PASS' : 'FAIL'} (${passed}/${results.length})`)
  console.log('')
  for (const item of results) {
    console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` - ${item.detail}` : ''}`)
  }
}

const localReadiness = evaluateProductionReadiness(process.env)
const apiReadiness = await fetchReadiness()
const readiness = apiReadiness && !apiReadiness.error ? apiReadiness : localReadiness
const results = [
  check('Production frontend URL is HTTPS', isHttpsPublicUrl(APP_BASE_URL), APP_BASE_URL || 'APP_BASE_URL'),
  check(
    'Frontend API base is HTTPS or same-origin',
    SAME_ORIGIN_API ||
      (effectiveFrontendApiBases.length > 0 && effectiveFrontendApiBases.every(isHttpsPublicUrl)),
    FRONTEND_API_DETAIL,
  ),
  check('Running API base is configured', isHttpsPublicUrl(API_BASE), API_BASE || 'PLAYDRAMA_API_BASE'),
  check('dist/index.html exists', existsSync(join(process.cwd(), 'dist', 'index.html'))),
  check('dist assets exist', distAssetCount() > 0, `${distAssetCount()} assets`),
  deploymentConfigCheck(),
  check('API readiness endpoint is reachable', Boolean(apiReadiness && !apiReadiness.error), apiReadiness?.error || ''),
  check('Commercial launch gate is passing', readiness.status === 'pass', `${readiness.passed}/${readiness.total}`),
]

printReport(results, readiness)

if (results.some((item) => !item.ok)) {
  process.exitCode = 1
}
