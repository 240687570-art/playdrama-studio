import './load-env.mjs'

const API_BASE = process.env.PLAYDRAMA_API_BASE || 'http://127.0.0.1:8787'

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

function printReport(results) {
  const passed = results.filter((item) => item.ok).length
  const failed = results.length - passed
  console.log('Tencent SMS dry-run verification')
  console.log(`API: ${API_BASE}`)
  console.log(`Result: ${failed === 0 ? 'PASS' : 'FAIL'} (${passed}/${results.length})`)
  console.log('')
  for (const item of results) {
    console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` - ${item.detail}` : ''}`)
  }
}

const results = []
const provider = await request('/api/sms/provider')
results.push(check('SMS provider endpoint responds', provider.response.ok, `HTTP ${provider.response.status}`))
results.push(
  check(
    'SMS provider is Tencent SMS',
    provider.body.provider === 'tencent-sms',
    provider.body.provider || 'unknown',
  ),
)
results.push(
  check(
    'Tencent SMS dry-run is enabled',
    provider.body.tencentSms?.dryRun === true,
    provider.body.tencentSms?.dryRun === true ? 'dry-run' : 'not dry-run',
  ),
)
results.push(
  check(
    'Tencent SMS signing credentials are optional in dry-run',
    provider.body.tencentSms?.dryRun === true ||
      (provider.body.tencentSms?.secretIdConfigured && provider.body.tencentSms?.secretKeyConfigured),
    `secretId=${Boolean(provider.body.tencentSms?.secretIdConfigured)} secretKey=${Boolean(provider.body.tencentSms?.secretKeyConfigured)}`,
  ),
)
results.push(
  check(
    'Tencent SMS app/sign/template config is accepted in dry-run',
    provider.body.tencentSms?.dryRun === true ||
      (Array.isArray(provider.body.tencentSms?.missing) &&
        provider.body.tencentSms.missing.every((item) =>
          ['sdk-app-id', 'sign-name', 'template-id'].includes(item.id),
        )),
    `${provider.body.tencentSms?.missing?.map((item) => item.id).join(', ') || 'none'}`,
  ),
)

printReport(results)
if (results.some((item) => !item.ok)) process.exitCode = 1
