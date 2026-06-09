import './load-env.mjs'
const API_BASE = process.env.PLAYDRAMA_API_BASE || 'http://127.0.0.1:8787'
const TEST_SESSION_ID =
  process.env.PAYMENT_TEST_SESSION_ID ||
  `payment-sandbox-${Date.now()}-${Math.random().toString(36).slice(2)}`
const TEST_EMAIL = process.env.PAYMENT_TEST_EMAIL || ''

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

function check(label, ok, detail = '') {
  return { label, ok: Boolean(ok), detail }
}

function printReport(results, context) {
  const passed = results.filter((item) => item.ok).length
  const failed = results.length - passed
  console.log('Payment sandbox verification')
  console.log(`API: ${API_BASE}`)
  console.log(`Session: ${context.sessionId || TEST_SESSION_ID}`)
  if (context.buildId) console.log(`Build: ${context.buildId}`)
  if (context.orderId) console.log(`Order: ${context.orderId}`)
  console.log(`Result: ${failed === 0 ? 'PASS' : 'FAIL'} (${passed}/${results.length})`)
  console.log('')
  for (const item of results) {
    console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` - ${item.detail}` : ''}`)
  }
}

function endingNodeIds(project) {
  return (project?.nodes || [])
    .filter((node) => node.kind === 'Ending')
    .map((node) => node.id)
}

async function findPaidEndingProject(results, context) {
  let authHeaders = {}
  if (TEST_EMAIL) {
    const login = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL, displayName: 'Payment Sandbox Owner' }),
    })
    const authToken = login.body.authToken
    authHeaders = authToken ? { authorization: `Bearer ${authToken}` } : {}
    results.push(check('Local demo login succeeds', login.response.ok, `HTTP ${login.response.status}`))
  }

  const me = await request('/api/me', { headers: authHeaders })
  const workspaceId = me.body.workspace?.id
  results.push(check('Session returns a workspace', me.response.ok && Boolean(workspaceId), workspaceId || `HTTP ${me.response.status}`))

  const projects = await request(`/api/workspaces/${workspaceId}/projects`, { headers: authHeaders })
  const paidProject = (projects.body.projects || []).find(
    (project) =>
      project.publish?.monetization === 'Paid Ending' &&
      endingNodeIds(project).length > 0,
  )
  results.push(
    check(
      'Workspace has a paid-ending project',
      projects.response.ok && Boolean(paidProject),
      paidProject?.id || `HTTP ${projects.response.status}`,
    ),
  )

  context.authHeaders = authHeaders
  context.project = paidProject
  return paidProject
}

async function latestOrNewBuild(project, authHeaders, results, context) {
  const builds = await request(`/api/projects/${encodeURIComponent(project.id)}/builds`, {
    headers: authHeaders,
  })
  const existingBuild = (builds.body.builds || [])[0]

  if (existingBuild) {
    results.push(check('Published build is available', true, existingBuild.id))
    context.build = existingBuild
    return existingBuild
  }

  const created = await request(`/api/projects/${encodeURIComponent(project.id)}/builds`, {
    method: 'POST',
    headers: authHeaders,
  })
  results.push(
    check(
      'Published build can be created',
      created.response.ok && Boolean(created.body.build?.id),
      created.body.build?.id || `HTTP ${created.response.status}`,
    ),
  )
  context.build = created.body.build
  return created.body.build
}

async function main() {
  const results = []
  const context = { sessionId: TEST_SESSION_ID }

  const health = await request('/api/health')
  results.push(check('API health is ok', health.response.ok && health.body.ok, health.body.service || `HTTP ${health.response.status}`))

  const project = await findPaidEndingProject(results, context)
  if (!project) {
    printReport(results, context)
    process.exitCode = 1
    return
  }

  const build = await latestOrNewBuild(project, context.authHeaders, results, context)
  const buildProject = build?.snapshot || project
  const unlockNodeIds = endingNodeIds(buildProject)
  context.buildId = build?.id

  results.push(check('Build contains paid ending nodes', unlockNodeIds.length > 0, unlockNodeIds.join(', ')))

  if (!build?.id || unlockNodeIds.length === 0) {
    printReport(results, context)
    process.exitCode = 1
    return
  }

  const itemId = unlockNodeIds[0]
  const created = await request(`/api/play/${encodeURIComponent(build.id)}/orders`, {
    method: 'POST',
    body: JSON.stringify({
      sessionId: TEST_SESSION_ID,
      itemType: 'ending',
      itemId,
      unlockNodeIds,
    }),
  })
  const order = created.body.order
  context.orderId = order?.id

  results.push(check('Sandbox order is created', created.response.status === 201 && Boolean(order?.id), order?.id || `HTTP ${created.response.status}`))
  results.push(check('Order uses sandbox provider', order?.provider === 'sandbox', order?.provider || 'n/a'))
  results.push(check('Order is paid immediately', order?.status === 'paid', order?.status || 'n/a'))
  results.push(check('Order amount is captured', Number(order?.amount || 0) > 0, String(order?.amount || 0)))
  results.push(check('Order currency is CNY', order?.currency === 'CNY', order?.currency || 'n/a'))
  results.push(
    check(
      'Order unlocks paid endings',
      unlockNodeIds.every((nodeId) => (order?.unlockNodeIds || []).includes(nodeId)),
      (order?.unlockNodeIds || []).join(', '),
    ),
  )
  results.push(
    check(
      'Create response returns unlock payload',
      unlockNodeIds.every((nodeId) => (created.body.unlock?.nodeIds || []).includes(nodeId)),
      (created.body.unlock?.nodeIds || []).join(', '),
    ),
  )

  const orders = await request(
    `/api/play/${encodeURIComponent(build.id)}/orders?sessionId=${encodeURIComponent(TEST_SESSION_ID)}`,
  )
  const listedOrder = (orders.body.orders || []).find((item) => item.id === order?.id)
  results.push(check('Order history contains sandbox order', orders.response.ok && Boolean(listedOrder), listedOrder?.id || `HTTP ${orders.response.status}`))
  results.push(
    check(
      'Order history returns unlocked nodes',
      unlockNodeIds.every((nodeId) => (orders.body.unlock?.nodeIds || []).includes(nodeId)),
      (orders.body.unlock?.nodeIds || []).join(', '),
    ),
  )

  const audit = await request('/api/audit', { headers: context.authHeaders })
  const hasAudit = (audit.body.auditLog || []).some(
    (item) => item.action === 'payment.order_created' && item.targetId === order?.id,
  )
  results.push(check('Payment order audit is recorded', audit.response.ok && hasAudit, `HTTP ${audit.response.status}`))

  printReport(results, context)
  if (results.some((item) => !item.ok)) process.exitCode = 1
}

main().catch((error) => {
  console.error('Payment sandbox verification failed')
  console.error(error.message)
  process.exitCode = 1
})
