import './load-env.mjs'
import pg from 'pg'

const API_BASE = (process.env.PLAYDRAMA_API_BASE || process.env.APP_BASE_URL || '').replace(/\/+$/, '')
const DATABASE_URL = process.env.PLAYDRAMA_DATABASE_URL || process.env.DATABASE_URL || ''
const TEST_SESSION_ID =
  process.env.PAYMENT_PROVIDER_TEST_SESSION_ID ||
  `payment-provider-${Date.now()}-${Math.random().toString(36).slice(2)}`

function check(label, ok, detail = '') {
  return { label, ok: Boolean(ok), detail }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  })
  const body = await response.json().catch(() => ({}))
  return { response, body }
}

function priceCents(project) {
  const price = Number(String(project?.publish?.price || '0').replace(/[^\d.]/g, ''))
  if (!Number.isFinite(price) || price <= 0) return 0
  return Math.round(price * 100)
}

function nodePaywallMode(project, node, endingIndex = 0) {
  if (project?.publish?.monetization !== 'Paid Ending' || node?.kind !== 'Ending') return 'free'
  if (node.paywall === 'free' || node.paywall === 'paid') return node.paywall
  const marker = `${node.title || ''} ${node.summary || ''} ${node.metric || ''}`.toLowerCase()
  if (/免费|普通|基础|free/.test(marker)) return 'free'
  if (/付费|隐藏|解锁|彩蛋|vip|premium/.test(marker)) return 'paid'
  return endingIndex === 0 ? 'free' : 'paid'
}

function paidEndingNodeIds(project) {
  if (project?.publish?.monetization !== 'Paid Ending') return []
  return (project.nodes || [])
    .filter((node) => node.kind === 'Ending')
    .filter((node, index) => nodePaywallMode(project, node, index) === 'paid')
    .map((node) => node.id)
}

async function findLatestPaidBuild(client) {
  const result = await client.query(`
    select id, snapshot
    from publish_builds
    order by created_at desc
    limit 50
  `)
  for (const row of result.rows) {
    const project = row.snapshot || {}
    if (priceCents(project) >= 1) {
      return {
        id: row.id,
        priceCents: priceCents(project),
        unlockNodeIds: paidEndingNodeIds(project),
      }
    }
  }
  return { id: '', priceCents: 0, unlockNodeIds: [] }
}

async function cleanupOrder(client, orderId) {
  if (!orderId) return
  await client.query('delete from payment_orders where id = $1 or session_id = $2', [
    orderId,
    TEST_SESSION_ID,
  ])
  await client.query('delete from audit_log where target_id = $1', [orderId])
}

if (!API_BASE) {
  console.error('PLAYDRAMA_API_BASE or APP_BASE_URL is required.')
  process.exit(1)
}

if (!DATABASE_URL) {
  console.error('DATABASE_URL or PLAYDRAMA_DATABASE_URL is required for cleanup.')
  process.exit(1)
}

const results = []
let client
let orderId = ''

try {
  client = new pg.Client({ connectionString: DATABASE_URL })
  await client.connect()

  const provider = await request('/api/payment/provider')
  const activeProvider = provider.body.activeProvider || provider.body.providers?.[0] || ''
  results.push(check('Payment provider endpoint is reachable', provider.response.ok, `HTTP ${provider.response.status}`))
  results.push(check('Payment provider is not sandbox', activeProvider && activeProvider !== 'sandbox', activeProvider || 'n/a'))

  const paidBuild = await findLatestPaidBuild(client)
  const buildId = paidBuild.id
  results.push(
    check(
      'Published paid build exists for checkout smoke',
      Boolean(buildId),
      buildId ? `${buildId} / ${paidBuild.priceCents} cents` : 'none',
    ),
  )

  if (buildId && activeProvider) {
    const unlockNodeIds =
      paidBuild.unlockNodeIds.length > 0 ? paidBuild.unlockNodeIds : ['payment-provider-smoke']
    const created = await request(`/api/play/${encodeURIComponent(buildId)}/orders`, {
      method: 'POST',
      body: JSON.stringify({
        sessionId: TEST_SESSION_ID,
        itemType: 'ending',
        itemId: unlockNodeIds[0],
        unlockNodeIds,
        provider: activeProvider,
      }),
    })
    const order = created.body.order || {}
    orderId = order.id || ''
    const checkoutUrl =
      typeof order.metadata?.checkoutUrl === 'string' ? order.metadata.checkoutUrl : ''
    results.push(check('Provider order creation succeeds', created.response.status === 201, `HTTP ${created.response.status}`))
    results.push(check('Order uses active provider', order.provider === activeProvider, order.provider || 'n/a'))
    results.push(check('Order waits for payment callback', order.status === 'pending', order.status || 'n/a'))
    results.push(check('Checkout URL/code is present', Boolean(checkoutUrl || order.metadata?.codeUrl)))
    results.push(check('Unpaid order does not unlock ending', (created.body.unlock?.nodeIds || []).length === 0))
  }
} finally {
  if (client) {
    await cleanupOrder(client, orderId)
    await client.end()
  }
}

console.log('Payment provider verification')
console.log(`API: ${API_BASE}`)
console.log(`Session: ${TEST_SESSION_ID}`)
for (const result of results) {
  console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.label}${result.detail ? ` - ${result.detail}` : ''}`)
}

const failed = results.filter((result) => !result.ok)
console.log(`Result: ${failed.length === 0 ? 'PASS' : 'FAIL'} (${results.length - failed.length}/${results.length})`)
if (failed.length > 0) process.exit(1)
