import { createHmac, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import pg from 'pg'
import './load-env.mjs'

const API_BASE = (process.env.PLAYDRAMA_API_BASE || process.env.APP_BASE_URL || '').replace(/\/+$/, '')
const DATABASE_URL = process.env.PLAYDRAMA_DATABASE_URL || process.env.DATABASE_URL || ''
const AUTH_SESSION_SECRET = process.env.AUTH_SESSION_SECRET || ''
const SEED_SESSION = process.env.ONLINE_SMOKE_SEED_SESSION === 'true'
const RESTART_SERVICE = process.env.ONLINE_SMOKE_RESTART_SERVICE !== 'false'
const SERVICE_NAME = process.env.ONLINE_SMOKE_SERVICE_NAME || 'playdrama'

const SMOKE_USER_ID = 'usr_smoke_online'
const SMOKE_WORKSPACE_ID = 'wks_smoke_online'
const SMOKE_EMAIL = 'online-smoke@playdrama.local'
const SMOKE_PHONE = '+8610000000000'
const OWNER_PERMISSIONS = [
  'project:read',
  'project:write',
  'project:publish',
  'analytics:read',
  'member:manage',
]

if (!API_BASE) {
  console.error('PLAYDRAMA_API_BASE or APP_BASE_URL is required.')
  process.exit(1)
}

function authHmac(value) {
  return createHmac('sha256', AUTH_SESSION_SECRET || 'playdrama-dev-auth-secret')
    .update(String(value))
    .digest('hex')
}

function check(label, ok, detail = '') {
  return { label, ok: Boolean(ok), detail }
}

async function request(path, { token = '', auth = true, ...options } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(auth && token ? { authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  const text = await response.text()
  let body = {}
  try {
    body = text ? JSON.parse(text) : {}
  } catch {
    body = { raw: text.slice(0, 200) }
  }
  return { response, body }
}

async function seedSmokeSession() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required when ONLINE_SMOKE_SEED_SESSION=true.')
  }

  const token = `tok_smoke_${randomUUID()}_${randomUUID()}`
  const tokenHash = authHmac(token)
  const pool = new pg.Pool({ connectionString: DATABASE_URL })

  try {
    await pool.query('begin')
    await pool.query(
      `insert into app_users (id, display_name, email, phone, role, avatar_initials, created_at)
       values ($1, $2, $3, $4, 'owner', 'SM', now())
       on conflict (id) do update set display_name = excluded.display_name, role = excluded.role`,
      [SMOKE_USER_ID, 'Online Smoke Tester', SMOKE_EMAIL, SMOKE_PHONE],
    )
    await pool.query(
      `insert into workspaces (id, name, plan, owner_user_id, created_at)
       values ($1, $2, 'creator', $3, now())
       on conflict (id) do update set name = excluded.name, owner_user_id = excluded.owner_user_id`,
      [SMOKE_WORKSPACE_ID, 'Online Smoke Workspace', SMOKE_USER_ID],
    )
    await pool.query(
      `insert into workspace_memberships (id, user_id, workspace_id, role, permissions, status, joined_at)
       values ($1, $2, $3, 'owner', $4::jsonb, 'active', now())
       on conflict (user_id, workspace_id) do update set
         role = excluded.role,
         permissions = excluded.permissions,
         status = 'active'`,
      [`mem_${SMOKE_WORKSPACE_ID}`, SMOKE_USER_ID, SMOKE_WORKSPACE_ID, JSON.stringify(OWNER_PERMISSIONS)],
    )
    await pool.query(
      `insert into auth_sessions (token_hash, user_id, provider, expires_at, revoked_at, created_at, last_seen_at)
       values ($1, $2, 'sms-code', now() + interval '2 hours', null, now(), now())`,
      [tokenHash, SMOKE_USER_ID],
    )
    await pool.query('commit')
  } catch (error) {
    await pool.query('rollback')
    throw error
  } finally {
    await pool.end()
  }

  if (RESTART_SERVICE) {
    execFileSync('systemctl', ['restart', SERVICE_NAME], { stdio: 'ignore' })
    await new Promise((resolve) => setTimeout(resolve, 2500))
  }

  return token
}

async function main() {
  const results = []
  const token = SEED_SESSION ? await seedSmokeSession() : ''

  const home = await request('/', { auth: false })
  results.push(check('Homepage HTML loads over HTTPS', home.response.ok, `HTTP ${home.response.status}`))

  const health = await request('/api/health', { auth: false })
  results.push(check('API health responds', health.response.ok && health.body.ok, `HTTP ${health.response.status}`))
  results.push(check('Commercial readiness passes', health.body.commercialReadiness?.status === 'pass', health.body.commercialReadiness?.status || 'missing'))

  if (SEED_SESSION) {
    const me = await request(`/api/me?workspaceId=${SMOKE_WORKSPACE_ID}`, { token })
    results.push(check('Bearer session resolves smoke user', me.response.ok && me.body.user?.id === SMOKE_USER_ID, me.body.user?.id || `HTTP ${me.response.status}`))
    results.push(check('Smoke workspace selected', me.body.workspace?.id === SMOKE_WORKSPACE_ID, me.body.workspace?.id || 'missing'))

    const projectId = `prj_smoke_${Date.now()}`
    const runtimeSessionId = `smoke-session-${Date.now()}`
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const project = {
      id: projectId,
      title: `线上验收 Smoke ${stamp}`,
      template: 'Online smoke test',
      publish: {
        status: 'Draft',
        visibility: 'Unlisted',
        category: '互动短剧验收',
        audience: '内部测试',
        monetization: 'Free',
        price: '0',
      },
      modelRouting: {
        market: 'China Mainland',
        defaultProvider: 'qwen',
        openaiPolicy: 'Disabled for China public launch',
        contentSafety: 'Required',
        fallbackProvider: 'local-rules',
      },
      characters: [{ name: '测试主角', role: '创作者', trait: '谨慎验证每一步', color: '#0ea5e9' }],
      variables: [{ id: 'trust', label: '信任', type: 'number', defaultValue: '0' }],
      nodes: [
        {
          id: 'S01',
          title: '上线前的最后检查',
          kind: 'Choice',
          summary: '主角打开刚上线的互动剧后台，决定先检查发布链路还是埋点链路。',
          metric: '上线信心',
          choices: [
            { id: 'C01', label: '检查发布链路', targetNodeId: 'S02', effect: '+1 信任' },
            { id: 'C02', label: '检查埋点链路', targetNodeId: 'S03', effect: '+1 信任' },
          ],
        },
        {
          id: 'S02',
          title: '发布成功',
          kind: 'Ending',
          summary: '构建通过内容安全检查，发布页可以正常打开。',
          metric: 'Ready',
          choices: [],
        },
        {
          id: 'S03',
          title: '数据回传',
          kind: 'Ending',
          summary: '试玩事件写入数据库，分析面板可以读取。',
          metric: 'Tracked',
          choices: [],
        },
      ],
    }

    const created = await request(`/api/workspaces/${SMOKE_WORKSPACE_ID}/projects`, {
      token,
      method: 'POST',
      body: JSON.stringify(project),
    })
    results.push(check('Project create succeeds', created.response.status === 201 && created.body.project?.id === projectId, `HTTP ${created.response.status}`))

    const ai = await request('/api/ai/story-quality-check', {
      token,
      method: 'POST',
      body: JSON.stringify({ input: { workspaceId: SMOKE_WORKSPACE_ID, project } }),
    })
    results.push(check('Qwen AI request succeeds', ai.response.ok && ai.body.status === 'succeeded', ai.body.providerId ? `${ai.body.providerId}/${ai.body.model}` : `HTTP ${ai.response.status}`))
    results.push(check('AI usage event attached', Boolean(ai.body.usageEvent?.id), ai.body.usageEvent?.id || 'missing'))

    const safety = await request(`/api/projects/${projectId}/content-safety/scan`, {
      token,
      method: 'POST',
    })
    results.push(check('Content safety scan passes', safety.response.status === 201 && ['passed', 'needs_review'].includes(safety.body.review?.status), safety.body.review?.status || `HTTP ${safety.response.status}`))

    const build = await request(`/api/projects/${projectId}/builds`, { token, method: 'POST' })
    const buildId = build.body.build?.id || ''
    results.push(check('Publish build succeeds', build.response.status === 201 && Boolean(buildId), buildId || `HTTP ${build.response.status}`))

    const play = await request(`/api/play/${buildId}`, { auth: false })
    results.push(check('Published play endpoint loads', play.response.ok && play.body.build?.id === buildId && play.body.project?.id === projectId, `HTTP ${play.response.status}`))

    const runtimeEvent = await request(`/api/play/${buildId}/events`, {
      auth: false,
      method: 'POST',
      body: JSON.stringify({
        sessionId: runtimeSessionId,
        eventName: 'node_view',
        nodeId: 'S01',
        metadata: { source: 'online-smoke', domain: new URL(API_BASE).hostname },
      }),
    })
    results.push(check('Runtime analytics event writes', runtimeEvent.response.status === 201 && runtimeEvent.body.event?.buildId === buildId, runtimeEvent.body.event?.id || `HTTP ${runtimeEvent.response.status}`))

    const analytics = await request('/api/analytics/events', { token })
    const hasEvent = Array.isArray(analytics.body.events) && analytics.body.events.some((event) => event.buildId === buildId && event.sessionId === runtimeSessionId)
    results.push(check('Analytics read includes runtime event', analytics.response.ok && hasEvent, `HTTP ${analytics.response.status}`))

    const usage = await request(`/api/ai/usage?workspaceId=${SMOKE_WORKSPACE_ID}&projectId=${projectId}`, { token })
    const hasUsage = Array.isArray(usage.body.events) && usage.body.events.some((event) => event.projectId === projectId && event.task === 'story-quality-check')
    results.push(check('AI usage read includes smoke generation', usage.response.ok && hasUsage, `HTTP ${usage.response.status}`))

    const logout = await request('/api/auth/logout', { token, method: 'POST' })
    results.push(check('Smoke session logout succeeds', logout.response.ok, `HTTP ${logout.response.status}`))
  }

  const passed = results.filter((item) => item.ok).length
  const failed = results.length - passed
  console.log('Online smoke test')
  console.log(`URL: ${API_BASE}`)
  console.log(`Mode: ${SEED_SESSION ? 'end-to-end' : 'public'}`)
  console.log(`Result: ${failed === 0 ? 'PASS' : 'FAIL'} (${passed}/${results.length})`)
  for (const item of results) {
    console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` - ${item.detail}` : ''}`)
  }

  if (failed > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error('Online smoke failed')
  console.error(error.message)
  process.exitCode = 1
})
