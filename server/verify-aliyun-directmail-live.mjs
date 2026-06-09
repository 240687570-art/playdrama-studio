import './load-env.mjs'
const API_BASE = process.env.PLAYDRAMA_API_BASE || 'http://127.0.0.1:8787'
const LIVE_TEST_EMAIL = process.env.ALIYUN_DM_LIVE_TEST_EMAIL || ''
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
  console.log('Aliyun DirectMail live verification')
  console.log(`API: ${API_BASE}`)
  console.log(`Workspace: ${context.workspaceId || 'n/a'}`)
  console.log(`Invite: ${context.inviteEmail || LIVE_TEST_EMAIL || 'n/a'}`)
  console.log(`Result: ${failed === 0 ? 'PASS' : 'FAIL'} (${passed}/${results.length})`)
  console.log('')
  for (const item of results) {
    console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` - ${item.detail}` : ''}`)
  }
}

function providerReadyForLive(provider) {
  return (
    provider.provider === 'aliyun-directmail' &&
    provider.aliyunDirectMail?.dryRun === false &&
    provider.aliyunDirectMail?.accessKeyIdConfigured === true &&
    provider.aliyunDirectMail?.accessKeySecretConfigured === true &&
    provider.aliyunDirectMail?.accountNameConfigured === true &&
    provider.callbackSecretConfigured === true &&
    provider.callbackSignatureMode === 'hmac-sha256'
  )
}

async function main() {
  const results = []
  const context = {}

  const health = await request('/api/health')
  results.push(check('API health is ok', health.ok === true, health.service))

  const provider = await request('/api/email/provider')
  results.push(check('Email provider is Aliyun DirectMail', provider.provider === 'aliyun-directmail', provider.provider))
  results.push(check('Aliyun DirectMail dry run is disabled', provider.aliyunDirectMail?.dryRun === false, `dryRun=${provider.aliyunDirectMail?.dryRun}`))
  results.push(check('Aliyun AccessKey ID is configured', provider.aliyunDirectMail?.accessKeyIdConfigured === true))
  results.push(check('Aliyun AccessKey Secret is configured', provider.aliyunDirectMail?.accessKeySecretConfigured === true))
  results.push(check('Aliyun sender account is configured', provider.aliyunDirectMail?.accountNameConfigured === true))
  results.push(check('Email callback secret is configured', provider.callbackSecretConfigured === true))
  results.push(check('Email callback uses HMAC', provider.callbackSignatureMode === 'hmac-sha256', provider.callbackSignatureMode))
  results.push(check('Live test recipient is explicit', Boolean(LIVE_TEST_EMAIL), 'ALIYUN_DM_LIVE_TEST_EMAIL'))

  if (!providerReadyForLive(provider) || !LIVE_TEST_EMAIL) {
    printReport(results, context)
    process.exitCode = 1
    return
  }

  const session = await request('/api/auth/login', {
    method: 'POST',
    body: {
      email: `aliyun-live-owner-${runId}@example.com`,
      displayName: 'Aliyun Live Check Owner',
    },
  })
  const token = session.authToken
  context.workspaceId = session.session?.workspace?.id
  results.push(check('Local live-check owner login succeeds', Boolean(token), context.workspaceId))

  context.inviteEmail = LIVE_TEST_EMAIL
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
  results.push(check('Live delivery is queued or sent', ['queued', 'sent'].includes(delivery?.status), delivery?.status))
  results.push(
    check(
      'Live provider message is not dry-run',
      Boolean(delivery?.providerMessageId) &&
        !String(delivery.providerMessageId).startsWith('dryrun_'),
      delivery?.providerMessageId,
    ),
  )
  results.push(check('Live delivery has no provider error', !delivery?.errorMessage, delivery?.errorMessage))

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
  console.error('Aliyun DirectMail live verification failed')
  console.error(error.message)
  if (error.body) {
    console.error(JSON.stringify(error.body, null, 2))
  }
  process.exitCode = 1
})
