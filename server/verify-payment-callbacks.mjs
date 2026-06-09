import { spawn } from 'node:child_process'
import { createSign, generateKeyPairSync, randomUUID } from 'node:crypto'
import { mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))
const port = Number(process.env.PAYMENT_CALLBACK_VERIFY_PORT || 8917)
const apiBase = `http://127.0.0.1:${port}`
const appId = `alipay-callback-${Date.now()}`
const sessionId = `payment-callback-${Date.now()}`
const projectId = `prj_payment_callback_${Date.now()}`
const dbPath = join(rootDir, 'output', `payment-callback-verify-${Date.now()}.json`)

function check(label, ok, detail = '') {
  return { label, ok: Boolean(ok), detail }
}

function alipaySignContent(params) {
  return Object.keys(params)
    .filter((key) => key !== 'sign' && key !== 'sign_type' && params[key] !== undefined && params[key] !== null)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')
}

function signedAlipayBody(privateKey, params, tamper = {}) {
  const base = {
    app_id: appId,
    charset: 'utf-8',
    notify_id: `notify_${randomUUID()}`,
    sign_type: 'RSA2',
    trade_no: `trade_${randomUUID()}`,
    trade_status: 'TRADE_SUCCESS',
    total_amount: '9.90',
    receipt_amount: '9.90',
    ...params,
  }
  const signature = createSign('RSA-SHA256')
    .update(alipaySignContent(base), 'utf8')
    .sign(privateKey, 'base64')
  return new URLSearchParams({ ...base, sign: signature, ...tamper }).toString()
}

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      ...(options.body && !options.headers?.['content-type'] ? { 'content-type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  })
  const text = await response.text()
  let body = {}
  try {
    body = text ? JSON.parse(text) : {}
  } catch {
    body = { text }
  }
  return { response, body, text }
}

async function waitForServer(child) {
  const startedAt = Date.now()
  let lastError = ''
  while (Date.now() - startedAt < 20_000) {
    if (child.exitCode !== null) {
      throw new Error(`server exited early with code ${child.exitCode}`)
    }
    try {
      const health = await request('/api/health')
      if (health.response.ok) return
      lastError = `HTTP ${health.response.status}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`server did not become ready: ${lastError}`)
}

function sampleProject() {
  return {
    id: projectId,
    title: 'Payment Callback Smoke',
    template: 'callback-smoke',
    publish: {
      status: 'Ready',
      visibility: 'Unlisted',
      category: 'Suspense',
      audience: 'QA',
      monetization: 'Paid Ending',
      price: '9.90',
    },
    modelRouting: {
      market: 'China Mainland',
      defaultProvider: 'qwen',
      fallbackProvider: 'local',
      openaiPolicy: 'Disabled for China public launch',
    },
    nodes: [
      {
        id: 'S01',
        title: 'Start',
        kind: 'Hook',
        summary: 'Safe callback smoke start.',
        metric: 'test',
        choices: [{ id: 'C01', label: 'Unlock', targetNodeId: 'S02', condition: '' }],
      },
      {
        id: 'S02',
        title: 'Paid Ending',
        kind: 'Ending',
        summary: 'Paid callback ending.',
        metric: 'paid',
        choices: [],
      },
    ],
    variables: [],
    characters: [
      { name: 'QA', role: 'tester', trait: 'verifies callbacks', color: '#0f766e' },
    ],
  }
}

mkdirSync(dirname(dbPath), { recursive: true })
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
})

const child = spawn(process.execPath, ['server/index.mjs'], {
  cwd: rootDir,
  env: {
    ...process.env,
    HOST: '127.0.0.1',
    PORT: String(port),
    PLAYDRAMA_DB_PATH: dbPath,
    PLAYDRAMA_STORAGE_DRIVER: 'json',
    AUTH_PROVIDER: 'local-demo',
    PAYMENT_PROVIDER: 'alipay',
    PAYMENT_CURRENCY: 'CNY',
    APP_BASE_URL: apiBase,
    ALIPAY_APP_ID: appId,
    ALIPAY_PRIVATE_KEY: privateKey,
    ALIPAY_PUBLIC_KEY: publicKey,
    ALIPAY_NOTIFY_URL: `${apiBase}/api/payment/callbacks/alipay`,
    ALIPAY_RETURN_URL: apiBase,
    CONTENT_SAFETY_PROVIDER: 'local-rules',
    CONTENT_SAFETY_POLICY_READY: 'true',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})

const serverOutput = []
child.stdout.on('data', (chunk) => serverOutput.push(String(chunk)))
child.stderr.on('data', (chunk) => serverOutput.push(String(chunk)))

const results = []
let orderId = ''
let mismatchOrderId = ''

try {
  await waitForServer(child)
  results.push(check('Temporary API starts', true, apiBase))

  const createdProject = await request('/api/workspaces/wks_001/projects', {
    method: 'POST',
    body: JSON.stringify(sampleProject()),
  })
  results.push(check('Smoke project is created', createdProject.response.status === 201, `HTTP ${createdProject.response.status}`))

  const createdBuild = await request(`/api/projects/${encodeURIComponent(projectId)}/builds`, {
    method: 'POST',
  })
  const buildId = createdBuild.body.build?.id || ''
  results.push(check('Smoke build is published', createdBuild.response.status === 201 && Boolean(buildId), buildId || `HTTP ${createdBuild.response.status}`))

  const createdOrder = await request(`/api/play/${encodeURIComponent(buildId)}/orders`, {
    method: 'POST',
    body: JSON.stringify({
      sessionId,
      itemType: 'ending',
      itemId: 'S02',
      unlockNodeIds: ['S02'],
      provider: 'alipay',
    }),
  })
  const order = createdOrder.body.order || {}
  orderId = order.id || ''
  results.push(check('Provider order remains pending', createdOrder.response.status === 201 && order.status === 'pending', order.status || `HTTP ${createdOrder.response.status}`))
  results.push(check('Unpaid callback order does not unlock', (createdOrder.body.unlock?.nodeIds || []).length === 0))

  const invalidSignature = await request('/api/payment/callbacks/alipay', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: signedAlipayBody(privateKey, { out_trade_no: orderId }, { sign: 'invalid-signature' }),
  })
  results.push(check('Invalid Alipay signature is rejected', invalidSignature.response.status === 401, `HTTP ${invalidSignature.response.status}`))

  const mismatchOrder = await request(`/api/play/${encodeURIComponent(buildId)}/orders`, {
    method: 'POST',
    body: JSON.stringify({
      sessionId: `${sessionId}-mismatch`,
      itemType: 'ending',
      itemId: 'S02',
      unlockNodeIds: ['S02'],
      provider: 'alipay',
    }),
  })
  mismatchOrderId = mismatchOrder.body.order?.id || ''
  const mismatch = await request('/api/payment/callbacks/alipay', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: signedAlipayBody(privateKey, {
      out_trade_no: mismatchOrderId,
      total_amount: '0.01',
      receipt_amount: '0.01',
    }),
  })
  results.push(check('Signed callback with wrong amount is rejected', mismatch.response.status === 409, `HTTP ${mismatch.response.status}`))

  const success = await request('/api/payment/callbacks/alipay', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: signedAlipayBody(privateKey, { out_trade_no: orderId }),
  })
  results.push(check('Valid Alipay callback is accepted', success.response.status === 200 && success.text === 'success', `HTTP ${success.response.status}`))

  const orders = await request(`/api/play/${encodeURIComponent(buildId)}/orders?sessionId=${encodeURIComponent(sessionId)}`)
  const paidOrder = (orders.body.orders || []).find((item) => item.id === orderId)
  results.push(check('Paid order is marked paid after callback', paidOrder?.status === 'paid', paidOrder?.status || 'missing'))
  results.push(check('Paid callback unlocks ending', (orders.body.unlock?.nodeIds || []).includes('S02')))
} catch (error) {
  results.push(check('Payment callback verifier completed', false, error instanceof Error ? error.message : String(error)))
} finally {
  child.kill()
  try {
    rmSync(dbPath, { force: true })
  } catch {
    // Ignore cleanup failures in verifier output.
  }
}

console.log('Payment callback verification')
console.log(`API: ${apiBase}`)
for (const result of results) {
  console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.label}${result.detail ? ` - ${result.detail}` : ''}`)
}

const failed = results.filter((result) => !result.ok)
console.log(`Result: ${failed.length === 0 ? 'PASS' : 'FAIL'} (${results.length - failed.length}/${results.length})`)
if (failed.length > 0) {
  console.log('')
  console.log('Server output')
  console.log(serverOutput.join('').slice(-4000))
  process.exitCode = 1
}
