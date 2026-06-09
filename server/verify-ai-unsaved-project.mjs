import { spawn } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const port = Number(process.env.AI_UNSAVED_PROJECT_TEST_PORT || 19000 + Math.floor(Math.random() * 1000))
const apiBase = `http://127.0.0.1:${port}`
const tempDir = join(tmpdir(), `playdrama-ai-unsaved-${Date.now()}-${Math.random().toString(36).slice(2)}`)
const dbPath = join(tempDir, 'playdrama-db.json')
const serverLogs = []

mkdirSync(tempDir, { recursive: true })

function check(label, ok, detail = '') {
  return { label, ok: Boolean(ok), detail }
}

async function request(path, { token = '', ...options } = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  const text = await response.text()
  let body = {}
  try {
    body = text ? JSON.parse(text) : {}
  } catch {
    body = { raw: text.slice(0, 300) }
  }
  return { response, body }
}

function startServer() {
  const child = spawn(process.execPath, ['server/index.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      PLAYDRAMA_DB_PATH: dbPath,
      PLAYDRAMA_STORAGE_DRIVER: 'json',
      AUTH_PROVIDER: 'local-demo',
      AUTH_SESSION_SECRET: 'playdrama-ai-unsaved-test-secret',
      AI_PROVIDER: 'stub',
      AI_MODEL_NAME: 'local-structured-draft',
      FRONTEND_DIST_DIR: join(process.cwd(), 'dist'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  child.stdout.on('data', (chunk) => serverLogs.push(String(chunk).trim()))
  child.stderr.on('data', (chunk) => serverLogs.push(String(chunk).trim()))
  return child
}

async function waitForServer(child) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < 12_000) {
    if (child.exitCode !== null) {
      throw new Error(`API process exited early with code ${child.exitCode}. ${serverLogs.join('\n')}`)
    }
    try {
      const health = await request('/api/health')
      if (health.response.ok && health.body.ok) return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }
  throw new Error(`Timed out waiting for ${apiBase}. ${serverLogs.join('\n')}`)
}

async function stopServer(child) {
  if (child.exitCode !== null) return
  child.kill()
  await new Promise((resolve) => child.once('exit', resolve))
}

async function main() {
  const results = []
  const child = startServer()

  try {
    await waitForServer(child)

    const login = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'ai-unsaved-smoke@example.com',
        displayName: 'AI Unsaved Smoke',
      }),
    })
    const token = login.body.authToken || ''
    const workspaceId = login.body.session?.workspace?.id || ''
    results.push(check('Local login returns a session', login.response.ok && Boolean(token), `HTTP ${login.response.status}`))
    results.push(check('Login includes a workspace', Boolean(workspaceId), workspaceId || 'missing'))

    const unsavedProjectId = `draft_unsaved_${Date.now()}`
    const ai = await request('/api/ai/expand-branch', {
      token,
      method: 'POST',
      body: JSON.stringify({
        input: {
          workspaceId,
          project: {
            id: unsavedProjectId,
            title: 'Unsaved AI smoke draft',
            nodes: [
              {
                id: 'S01',
                title: 'Opening conflict',
                kind: 'Choice',
                summary: 'A creator tests generation before saving the project.',
                metric: 'confidence',
                choices: [],
              },
            ],
            variables: [],
            characters: [],
          },
          selectedNodeId: 'S01',
          instruction: 'Extend the selected scene with one branch.',
        },
      }),
    })

    results.push(check('AI generation succeeds for an unsaved project', ai.response.ok, `HTTP ${ai.response.status}`))
    results.push(
      check(
        'Usage event is workspace-scoped when project is unsaved',
        ai.body.usageEvent?.workspaceId === workspaceId && ai.body.usageEvent?.projectId === null,
        `projectId=${Object.hasOwn(ai.body.usageEvent || {}, 'projectId') ? String(ai.body.usageEvent.projectId) : 'missing'}`,
      ),
    )

    const usage = await request(`/api/ai/usage?workspaceId=${encodeURIComponent(workspaceId)}`, { token })
    const hasUnsavedUsage = Array.isArray(usage.body.events)
      ? usage.body.events.some((event) => event.id === ai.body.usageEvent?.id && event.projectId === null)
      : false
    results.push(check('Usage endpoint can read the unsaved generation event', usage.response.ok && hasUnsavedUsage, `HTTP ${usage.response.status}`))
  } finally {
    await stopServer(child)
    rmSync(tempDir, { recursive: true, force: true })
  }

  const passed = results.filter((item) => item.ok).length
  const failed = results.length - passed
  console.log('AI unsaved project verification')
  console.log(`API: ${apiBase}`)
  console.log(`Result: ${failed === 0 ? 'PASS' : 'FAIL'} (${passed}/${results.length})`)
  for (const item of results) {
    console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` - ${item.detail}` : ''}`)
  }
  if (failed > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error('AI unsaved project verification failed')
  console.error(error.message)
  process.exitCode = 1
})
