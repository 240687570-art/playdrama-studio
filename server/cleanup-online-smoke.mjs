import pg from 'pg'
import './load-env.mjs'

const DATABASE_URL = process.env.PLAYDRAMA_DATABASE_URL || process.env.DATABASE_URL || ''
const SMOKE_USER_ID = 'usr_smoke_online'
const SMOKE_WORKSPACE_ID = 'wks_smoke_online'
const SMOKE_PHONE = '+8610000000000'

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required.')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: DATABASE_URL })
const statements = [
  ['auth_sessions', `delete from auth_sessions where user_id = $1`, [SMOKE_USER_ID]],
  ['auth_sms_codes', `delete from auth_sms_codes where phone = $1 or metadata->>'source' = 'online-smoke'`, [SMOKE_PHONE]],
  ['payment_orders', `delete from payment_orders where workspace_id = $1 or project_id like 'prj_smoke_%' or session_id like 'payment-provider-%' or metadata->>'source' = 'online-smoke'`, [SMOKE_WORKSPACE_ID]],
  ['final_video_renders', `delete from final_video_renders where workspace_id = $1 or project_id like 'prj_smoke_%' or request->>'source' = 'online-smoke'`, [SMOKE_WORKSPACE_ID]],
  ['ai_generation_jobs', `delete from ai_generation_jobs where workspace_id = $1 or project_id like 'prj_smoke_%'`, [SMOKE_WORKSPACE_ID]],
  ['ai_usage_events', `delete from ai_usage_events where workspace_id = $1 or project_id like 'prj_smoke_%'`, [SMOKE_WORKSPACE_ID]],
  ['content_safety_reviews', `delete from content_safety_reviews where workspace_id = $1 or project_id like 'prj_smoke_%'`, [SMOKE_WORKSPACE_ID]],
  ['analytics_events', `delete from analytics_events where workspace_id = $1 or project_id like 'prj_smoke_%' or session_id like 'smoke-session-%' or metadata->>'source' = 'online-smoke'`, [SMOKE_WORKSPACE_ID]],
  ['invite_email_deliveries', `delete from invite_email_deliveries where workspace_id = $1`, [SMOKE_WORKSPACE_ID]],
  ['audit_log', `delete from audit_log where workspace_id = $1 or user_id = $2 or target_id like 'prj_smoke_%' or metadata->>'source' = 'online-smoke'`, [SMOKE_WORKSPACE_ID, SMOKE_USER_ID]],
  ['publish_builds', `delete from publish_builds where workspace_id = $1 or project_id like 'prj_smoke_%'`, [SMOKE_WORKSPACE_ID]],
  ['projects', `delete from projects where workspace_id = $1 or id like 'prj_smoke_%'`, [SMOKE_WORKSPACE_ID]],
  ['workspace_memberships', `delete from workspace_memberships where workspace_id = $1 or user_id = $2`, [SMOKE_WORKSPACE_ID, SMOKE_USER_ID]],
  ['workspaces', `delete from workspaces where id = $1`, [SMOKE_WORKSPACE_ID]],
  ['app_users', `delete from app_users where id = $1`, [SMOKE_USER_ID]],
]

try {
  const client = await pool.connect()
  try {
    await client.query('begin')
    const counts = []
    for (const [label, sql, params] of statements) {
      const result = await client.query(sql, params)
      counts.push([label, result.rowCount])
    }
    await client.query('commit')
    console.log('Online smoke cleanup complete')
    for (const [label, count] of counts) {
      console.log(`${label}: ${count}`)
    }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
} catch (error) {
  console.error('Online smoke cleanup failed')
  console.error(error.message)
  process.exitCode = 1
} finally {
  await pool.end()
}
