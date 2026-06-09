import './load-env.mjs'
const API_BASE = process.env.PLAYDRAMA_API_BASE || 'http://127.0.0.1:8787'
const TEST_PROVIDER = process.env.AUTH_TEST_PROVIDER || 'netlify-identity'
const TEST_ID =
  process.env.AUTH_TEST_ID || `auth-smoke-${Date.now()}-${Math.random().toString(36).slice(2)}`
const TEST_EMAIL =
  process.env.AUTH_TEST_EMAIL || `${TEST_ID.replace(/[^a-z0-9-]/gi, '-')}@example.com`
const TEST_PHONE = process.env.AUTH_TEST_PHONE || '+8613800138000'
const TEST_NAME = process.env.AUTH_TEST_NAME || 'Auth Smoke'
const TEST_IDENTITY_SECRET =
  process.env.AUTH_TEST_IDENTITY_SECRET || process.env.AUTH_TRUSTED_IDENTITY_SECRET || ''
const REQUIRE_DEBUG_CODE =
  process.env.AUTH_VERIFY_REQUIRE_DEBUG_CODE === 'true' ||
  API_BASE.includes('127.0.0.1') ||
  API_BASE.includes('localhost')

const identityHeaders = {
  'x-playdrama-identity-provider': TEST_PROVIDER,
  'x-playdrama-identity-id': TEST_ID,
  'x-playdrama-identity-email': TEST_EMAIL,
  'x-playdrama-identity-name': TEST_NAME,
  ...(TEST_IDENTITY_SECRET ? { 'x-playdrama-identity-secret': TEST_IDENTITY_SECRET } : {}),
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

function check(label, ok, detail = '') {
  return { label, ok: Boolean(ok), detail }
}

function printReport(results, provider) {
  const passed = results.filter((item) => item.ok).length
  const failed = results.length - passed
  console.log('Auth provider verification')
  console.log(`API: ${API_BASE}`)
  console.log(`Provider: ${provider?.provider || 'unknown'}`)
  console.log(`Result: ${failed === 0 ? 'PASS' : 'FAIL'} (${passed}/${results.length})`)
  console.log('')
  for (const item of results) {
    console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` - ${item.detail}` : ''}`)
  }
  console.log('')
  console.log('Manual signoff still required before AUTH_PROVIDER_ADAPTER_READY=true:')
  console.log('- Real user can register or be created in the provider')
  console.log('- Email/SMS confirmation or provider approval is complete')
  console.log('- Browser login, refresh session, logout, and invitation acceptance pass')
}

function canSkipCodeReveal(debugCode, provider) {
  return !debugCode && !REQUIRE_DEBUG_CODE && provider?.productionReady === true
}

async function main() {
  const results = []
  const providerResult = await request('/api/auth/providers')
  const provider = providerResult.body
  results.push(
    check(
      'Auth provider endpoint is reachable',
      providerResult.response.ok,
      `HTTP ${providerResult.response.status}`,
    ),
  )
  results.push(
    check(
      'Auth provider is not local-demo',
      provider.provider && provider.provider !== 'local-demo',
      provider.provider || 'unknown',
    ),
  )

  const loginResult = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: TEST_EMAIL, displayName: TEST_NAME }),
  })
  results.push(
    check(
      'Local API login is disabled for external provider',
      provider.provider === 'local-demo' || [401, 409].includes(loginResult.response.status),
      `HTTP ${loginResult.response.status}`,
    ),
  )

  if (provider.provider === 'email-code') {
    const codeRequest = await request('/api/auth/email-code/request', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL, displayName: TEST_NAME }),
    })
    const debugCode = codeRequest.body.debugCode || ''
    results.push(
      check(
        'Email code request succeeds',
        codeRequest.response.ok && codeRequest.body.email === TEST_EMAIL,
        codeRequest.body.delivery?.status || `HTTP ${codeRequest.response.status}`,
      ),
    )
    results.push(
      check(
        'Verifier can read a local test code',
        /^\d{6}$/.test(debugCode) || canSkipCodeReveal(debugCode, provider),
        debugCode
          ? 'debug code provided'
          : canSkipCodeReveal(debugCode, provider)
            ? 'production API correctly keeps email codes hidden'
            : 'set AUTH_EMAIL_CODE_DEV_REVEAL=true on the API process',
      ),
    )

    if (!debugCode && canSkipCodeReveal(debugCode, provider)) {
      results.push(check('Email live code verification is manual-safe', true, 'request path verified; inbox code is not exposed by production'))
      printReport(results, provider)
      if (results.some((item) => !item.ok)) {
        process.exitCode = 1
      }
      return
    }

    const verifyResult = await request('/api/auth/email-code/verify', {
      method: 'POST',
      body: JSON.stringify({
        email: TEST_EMAIL,
        code: debugCode,
        displayName: TEST_NAME,
      }),
    })
    const authToken = verifyResult.body.authToken || ''
    const authHeaders = authToken ? { authorization: `Bearer ${authToken}` } : {}
    results.push(
      check(
        'Email code verifies and returns a session token',
        verifyResult.response.ok && Boolean(authToken),
        verifyResult.body.session?.user?.email || `HTTP ${verifyResult.response.status}`,
      ),
    )

    const firstSession = await request('/api/me', { headers: authHeaders })
    const secondSession = await request('/api/me', { headers: authHeaders })
    results.push(
      check(
        'Bearer session can recover the user',
        firstSession.response.ok && firstSession.body.user?.email === TEST_EMAIL,
        firstSession.body.user?.email || `HTTP ${firstSession.response.status}`,
      ),
    )
    results.push(
      check(
        'Session recovery is stable',
        firstSession.response.ok &&
          secondSession.response.ok &&
          firstSession.body.user?.id === secondSession.body.user?.id &&
          firstSession.body.workspace?.id === secondSession.body.workspace?.id,
        `${firstSession.body.user?.id || 'n/a'} / ${secondSession.body.user?.id || 'n/a'}`,
      ),
    )

    const workspaceResult = await request('/api/workspaces', { headers: authHeaders })
    results.push(
      check(
        'Email-code session can read workspaces',
        workspaceResult.response.ok && Array.isArray(workspaceResult.body.workspaces),
        `HTTP ${workspaceResult.response.status}`,
      ),
    )

    const auditResult = await request('/api/audit', { headers: authHeaders })
    const hasEmailCodeAudit = Array.isArray(auditResult.body.auditLog)
      ? auditResult.body.auditLog.some(
          (item) =>
            ['auth.email_code_login', 'auth.email_code_signup'].includes(item.action) &&
            item.metadata?.email === TEST_EMAIL,
        )
      : false
    results.push(
      check(
        'Email-code audit is attributed to the verified user',
        auditResult.response.ok && hasEmailCodeAudit,
        `HTTP ${auditResult.response.status}`,
      ),
    )

    const logoutResult = await request('/api/auth/logout', {
      method: 'POST',
      headers: authHeaders,
    })
    const loggedOutSession = await request('/api/me', { headers: authHeaders })
    results.push(check('Logout succeeds', logoutResult.response.ok, `HTTP ${logoutResult.response.status}`))
    results.push(
      check(
        'Revoked token is rejected',
        loggedOutSession.response.status === 401,
        `HTTP ${loggedOutSession.response.status}`,
      ),
    )

    printReport(results, provider)
    if (results.some((item) => !item.ok)) {
      process.exitCode = 1
    }
    return
  }

  if (provider.provider === 'sms-code') {
    const codeRequest = await request('/api/auth/sms-code/request', {
      method: 'POST',
      body: JSON.stringify({ phone: TEST_PHONE, displayName: TEST_NAME }),
    })
    const debugCode = codeRequest.body.debugCode || ''
    results.push(
      check(
        'SMS code request succeeds',
        codeRequest.response.ok && codeRequest.body.phone === TEST_PHONE,
        codeRequest.body.delivery?.status || `HTTP ${codeRequest.response.status}`,
      ),
    )
    results.push(
      check(
        'Verifier can read a local test SMS code',
        /^\d{6}$/.test(debugCode) || canSkipCodeReveal(debugCode, provider),
        debugCode
          ? 'debug code provided'
          : canSkipCodeReveal(debugCode, provider)
            ? 'production API correctly keeps SMS codes hidden'
            : 'set AUTH_SMS_CODE_DEV_REVEAL=true on the API process',
      ),
    )

    if (!debugCode && canSkipCodeReveal(debugCode, provider)) {
      results.push(check('SMS live code verification is manual-safe', true, 'request path verified; phone code is not exposed by production'))
      printReport(results, provider)
      if (results.some((item) => !item.ok)) {
        process.exitCode = 1
      }
      return
    }

    const verifyResult = await request('/api/auth/sms-code/verify', {
      method: 'POST',
      body: JSON.stringify({
        phone: TEST_PHONE,
        code: debugCode,
        displayName: TEST_NAME,
      }),
    })
    const authToken = verifyResult.body.authToken || ''
    const authHeaders = authToken ? { authorization: `Bearer ${authToken}` } : {}
    results.push(
      check(
        'SMS code verifies and returns a session token',
        verifyResult.response.ok && Boolean(authToken),
        verifyResult.body.session?.user?.phone || `HTTP ${verifyResult.response.status}`,
      ),
    )

    const firstSession = await request('/api/me', { headers: authHeaders })
    const secondSession = await request('/api/me', { headers: authHeaders })
    results.push(
      check(
        'Bearer session can recover the phone user',
        firstSession.response.ok && firstSession.body.user?.phone === TEST_PHONE,
        firstSession.body.user?.phone || `HTTP ${firstSession.response.status}`,
      ),
    )
    results.push(
      check(
        'Session recovery is stable',
        firstSession.response.ok &&
          secondSession.response.ok &&
          firstSession.body.user?.id === secondSession.body.user?.id &&
          firstSession.body.workspace?.id === secondSession.body.workspace?.id,
        `${firstSession.body.user?.id || 'n/a'} / ${secondSession.body.user?.id || 'n/a'}`,
      ),
    )

    const workspaceResult = await request('/api/workspaces', { headers: authHeaders })
    results.push(
      check(
        'SMS-code session can read workspaces',
        workspaceResult.response.ok && Array.isArray(workspaceResult.body.workspaces),
        `HTTP ${workspaceResult.response.status}`,
      ),
    )

    const auditResult = await request('/api/audit', { headers: authHeaders })
    const hasSmsCodeAudit = Array.isArray(auditResult.body.auditLog)
      ? auditResult.body.auditLog.some(
          (item) =>
            ['auth.sms_code_login', 'auth.sms_code_signup'].includes(item.action) &&
            item.metadata?.phone === TEST_PHONE,
        )
      : false
    results.push(
      check(
        'SMS-code audit is attributed to the verified phone',
        auditResult.response.ok && hasSmsCodeAudit,
        `HTTP ${auditResult.response.status}`,
      ),
    )

    const logoutResult = await request('/api/auth/logout', {
      method: 'POST',
      headers: authHeaders,
    })
    const loggedOutSession = await request('/api/me', { headers: authHeaders })
    results.push(check('Logout succeeds', logoutResult.response.ok, `HTTP ${logoutResult.response.status}`))
    results.push(
      check(
        'Revoked token is rejected',
        loggedOutSession.response.status === 401,
        `HTTP ${loggedOutSession.response.status}`,
      ),
    )

    printReport(results, provider)
    if (results.some((item) => !item.ok)) {
      process.exitCode = 1
    }
    return
  }

  const firstSession = await request('/api/me', { headers: identityHeaders })
  const secondSession = await request('/api/me', { headers: identityHeaders })
  results.push(
    check(
      'Identity headers create or recover a session',
      firstSession.response.ok && firstSession.body.user?.email === TEST_EMAIL,
      firstSession.body.user?.email || `HTTP ${firstSession.response.status}`,
    ),
  )
  results.push(
    check(
      'Session recovery is stable',
      firstSession.response.ok &&
        secondSession.response.ok &&
        firstSession.body.user?.id === secondSession.body.user?.id &&
        firstSession.body.workspace?.id === secondSession.body.workspace?.id,
      `${firstSession.body.user?.id || 'n/a'} / ${secondSession.body.user?.id || 'n/a'}`,
    ),
  )

  const workspaceResult = await request('/api/workspaces', { headers: identityHeaders })
  results.push(
    check(
      'Identity session can read workspaces',
      workspaceResult.response.ok && Array.isArray(workspaceResult.body.workspaces),
      `HTTP ${workspaceResult.response.status}`,
    ),
  )

  const auditResult = await request('/api/audit', { headers: identityHeaders })
  const hasProviderSignup = Array.isArray(auditResult.body.auditLog)
    ? auditResult.body.auditLog.some(
        (item) =>
          item.action === 'auth.provider_signup' &&
          item.metadata?.email === TEST_EMAIL &&
          item.metadata?.provider === TEST_PROVIDER,
      )
    : false
  results.push(
    check(
      'Provider signup audit is attributed to the identity',
      auditResult.response.ok && hasProviderSignup,
      `HTTP ${auditResult.response.status}`,
    ),
  )

  printReport(results, provider)
  if (results.some((item) => !item.ok)) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('Auth provider verification failed')
  console.error(error.message)
  process.exitCode = 1
})
