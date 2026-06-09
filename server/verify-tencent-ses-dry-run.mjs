import './load-env.mjs'

const API_BASE = process.env.PLAYDRAMA_API_BASE || 'http://127.0.0.1:8787'
const runId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET',
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
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
  console.log(`Tencent SES dry-run verification`)
  console.log(`API: ${API_BASE}`)
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

  const health = await request('/api/health')
  results.push(check('API health is ok', health.ok === true, health.service))

  const provider = await request('/api/email/provider')
  results.push(check('Email provider is Tencent SES', provider.provider === 'tencent-ses', provider.provider))
  results.push(
    check(
      'Tencent SES dry run is enabled',
      provider.tencentSes?.dryRun === true,
      `dryRun=${provider.tencentSes?.dryRun}`,
    ),
  )

  const session = await request('/api/auth/login', {
    method: 'POST',
    body: {
      email: `dryrun-check-owner-${runId}@example.com`,
      displayName: 'Dryrun Check Owner',
    },
  })
  const token = session.authToken
  context.workspaceId = session.session?.workspace?.id
  results.push(check('Local dry-run owner login succeeds', Boolean(token), context.workspaceId))

  context.inviteEmail = `dryrun-check-editor-${runId}@example.com`
  const invite = await request(`/api/workspaces/${context.workspaceId}/members`, {
    method: 'POST',
    token,
    body: {
      email: context.inviteEmail,
      role: 'editor',
    },
  })
  const delivery = invite.member?.emailDelivery
  results.push(check('Invite creates email delivery record', Boolean(delivery?.id), delivery?.id))
  results.push(check('Dry-run delivery is queued', delivery?.status === 'queued', delivery?.status))
  results.push(
    check(
      'Dry-run provider message is marked',
      String(delivery?.providerMessageId || '').startsWith('dryrun_'),
      delivery?.providerMessageId,
    ),
  )
  results.push(
    check(
      'Dry-run does not send external email',
      String(delivery?.errorMessage || '').includes('no external email was sent'),
      delivery?.errorMessage,
    ),
  )

  const deliveries = await request(`/api/workspaces/${context.workspaceId}/invite-deliveries`, {
    token,
  })
  const latest = deliveries.deliveries?.[0]
  results.push(check('Delivery history contains latest invite', latest?.id === delivery?.id, latest?.id))

  printReport(results, context)

  if (results.some((item) => !item.ok)) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('Tencent SES dry-run verification failed')
  console.error(error.message)
  if (error.body) {
    console.error(JSON.stringify(error.body, null, 2))
  }
  process.exitCode = 1
})
