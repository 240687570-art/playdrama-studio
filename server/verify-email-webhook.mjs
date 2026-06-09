import './load-env.mjs'
const API_BASE = process.env.PLAYDRAMA_API_BASE || 'http://127.0.0.1:8787'
const WEBHOOK_BASE = process.env.EMAIL_DEV_WEBHOOK_BASE || ''
const CALLBACK_SECRET = process.env.EMAIL_CALLBACK_SECRET || ''
const runId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)

async function request(base, path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    method: options.method || 'GET',
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(`${options.method || 'GET'} ${path} returned ${response.status}`)
    error.body = body
    throw error
  }
  return body
}

function check(label, ok, detail = '') {
  return { label, ok: Boolean(ok), detail }
}

function printReport(results, context) {
  const passed = results.filter((item) => item.ok).length
  const failed = results.length - passed
  console.log('Webhook email verification')
  console.log(`API: ${API_BASE}`)
  console.log(`Webhook: ${WEBHOOK_BASE || 'not checked'}`)
  console.log(`Workspace: ${context.workspaceId || 'n/a'}`)
  console.log(`Invite: ${context.inviteEmail || 'n/a'}`)
  console.log(`Result: ${failed === 0 ? 'PASS' : 'FAIL'} (${passed}/${results.length})`)
  console.log('')
  for (const item of results) {
    console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` - ${item.detail}` : ''}`)
  }
}

async function main() {
  const results = []
  const context = {}

  const health = await request(API_BASE, '/api/health')
  results.push(check('API health is ok', health.ok === true, health.service))

  const provider = await request(API_BASE, '/api/email/provider')
  results.push(check('Email provider is webhook', provider.provider === 'webhook', provider.provider))
  results.push(check('Webhook URL is configured', provider.webhookConfigured === true))

  if (WEBHOOK_BASE) {
    const webhookHealth = await request(WEBHOOK_BASE, '/health')
    results.push(
      check(
        'Dev webhook is reachable',
        webhookHealth.ok === true && webhookHealth.service === 'playdrama-email-webhook-dev',
        webhookHealth.service,
      ),
    )
  }

  const session = await request(API_BASE, '/api/auth/login', {
    method: 'POST',
    body: {
      email: `webhook-check-owner-${runId}@example.com`,
      displayName: 'Webhook Check Owner',
    },
  })
  const token = session.authToken
  context.workspaceId = session.session?.workspace?.id
  results.push(check('Local webhook-check owner login succeeds', Boolean(token), context.workspaceId))

  context.inviteEmail = `webhook-check-editor-${runId}@example.com`
  const invite = await request(API_BASE, `/api/workspaces/${context.workspaceId}/members`, {
    method: 'POST',
    token,
    body: {
      email: context.inviteEmail,
      role: 'editor',
    },
  })
  const delivery = invite.member?.emailDelivery
  context.deliveryId = delivery?.id
  context.providerMessageId = delivery?.providerMessageId
  results.push(check('Invite creates email delivery record', Boolean(delivery?.id), delivery?.id))
  results.push(check('Webhook delivery is queued', delivery?.status === 'queued', delivery?.status))
  results.push(
    check(
      'Webhook provider message is recorded',
      String(delivery?.providerMessageId || '').startsWith('dev_') ||
        Boolean(delivery?.providerMessageId),
      delivery?.providerMessageId,
    ),
  )

  if (WEBHOOK_BASE) {
    const webhookDeliveries = await request(WEBHOOK_BASE, '/deliveries')
    const received = webhookDeliveries.deliveries?.find(
      (item) => item.id === delivery?.id || item.to === context.inviteEmail,
    )
    results.push(
      check(
        'Dev webhook received the invite payload',
        Boolean(received),
        received?.providerMessageId || 'not found',
      ),
    )
  }

  const callbackHeaders = CALLBACK_SECRET ? { authorization: `Bearer ${CALLBACK_SECRET}` } : {}
  const callback = await request(API_BASE, '/api/email/callbacks/webhook', {
    method: 'POST',
    headers: callbackHeaders,
    body: {
      providerMessageId: context.providerMessageId,
      deliveryId: context.deliveryId,
      workspaceId: context.workspaceId,
      status: 'delivered',
    },
  })
  results.push(check('Provider callback updates delivery', callback.delivery?.status === 'sent', callback.delivery?.status))

  const deliveries = await request(API_BASE, `/api/workspaces/${context.workspaceId}/invite-deliveries`, {
    token,
  })
  const latest = deliveries.deliveries?.find((item) => item.id === context.deliveryId)
  results.push(check('Delivery history shows sent status', latest?.status === 'sent', latest?.status))

  printReport(results, context)

  if (results.some((item) => !item.ok)) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('Webhook email verification failed')
  console.error(error.message)
  if (error.body) {
    console.error(JSON.stringify(error.body, null, 2))
  }
  process.exitCode = 1
})
