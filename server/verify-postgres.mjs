import './load-env.mjs'
import pg from 'pg'

const REQUIRED_TABLES = [
  'app_users',
  'workspaces',
  'workspace_memberships',
  'projects',
  'publish_builds',
  'analytics_events',
  'ai_usage_events',
  'ai_generation_jobs',
  'content_safety_reviews',
  'payment_orders',
  'distribution_jobs',
  'video_generation_jobs',
  'final_video_renders',
  'canvas_assets',
  'canvas_node_runs',
  'canvas_workflow_runs',
  'audit_log',
  'invite_email_deliveries',
  'auth_email_codes',
  'auth_sms_codes',
  'auth_sessions',
  'marketing_leads',
]

const REQUIRED_INDEXES = [
  'idx_projects_workspace_status',
  'idx_builds_project',
  'idx_events_project_created',
  'idx_ai_usage_project_created',
  'idx_ai_usage_workspace_created',
  'idx_ai_generation_jobs_workspace_created',
  'idx_ai_generation_jobs_status_updated',
  'idx_ai_generation_jobs_retry_of',
  'idx_content_safety_project_created',
  'idx_content_safety_workspace_created',
  'idx_payment_orders_build_session',
  'idx_payment_orders_workspace_created',
  'idx_distribution_jobs_project_created',
  'idx_distribution_jobs_build_channel',
  'idx_video_generation_jobs_project_created',
  'idx_video_generation_jobs_status',
  'idx_final_video_renders_project_created',
  'idx_final_video_renders_status_updated',
  'idx_canvas_assets_project_created',
  'idx_canvas_assets_node_created',
  'idx_canvas_node_runs_project_updated',
  'idx_canvas_node_runs_node_updated',
  'idx_canvas_workflow_runs_project_updated',
  'idx_audit_workspace_created',
  'idx_audit_target',
  'idx_invite_email_deliveries_workspace',
  'idx_app_users_phone',
  'idx_auth_email_codes_email_created',
  'idx_auth_sms_codes_phone_created',
  'idx_auth_sessions_user_expires',
  'idx_marketing_leads_created',
  'idx_marketing_leads_status',
]

async function getPostgresConnectionString() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }

  if (process.env.NETLIFY_DATABASE_READY === 'true') {
    const { getConnectionString } = await import('@netlify/database')
    return getConnectionString()
  }

  console.error('DATABASE_URL or NETLIFY_DATABASE_READY=true is required for db:verify.')
  console.error('Example: set DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/playdrama')
  process.exit(1)
}

function check(label, ok, detail = '') {
  return { label, ok: Boolean(ok), detail }
}

function printReport(results, counts) {
  const passed = results.filter((item) => item.ok).length
  const failed = results.length - passed
  console.log('PostgreSQL verification')
  console.log(`Result: ${failed === 0 ? 'PASS' : 'FAIL'} (${passed}/${results.length})`)
  console.log('')
  for (const item of results) {
    console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` - ${item.detail}` : ''}`)
  }
  if (counts.length > 0) {
    console.log('')
    console.log('Row counts')
    for (const row of counts) {
      console.log(`${row.table}: ${row.count}`)
    }
  }
}

async function main() {
  const pool = new pg.Pool({ connectionString: await getPostgresConnectionString() })
  const client = await pool.connect()
  const results = []
  const counts = []

  try {
    const ping = await client.query('select current_database() as database, current_user as user')
    results.push(
      check(
        'Database connection succeeds',
        Boolean(ping.rows[0]?.database),
        `${ping.rows[0]?.database} as ${ping.rows[0]?.user}`,
      ),
    )

    const tablesResult = await client.query(
      `select table_name
       from information_schema.tables
       where table_schema = 'public'
         and table_name = any($1::text[])`,
      [REQUIRED_TABLES],
    )
    const tables = new Set(tablesResult.rows.map((row) => row.table_name))
    for (const table of REQUIRED_TABLES) {
      results.push(check(`Table exists: ${table}`, tables.has(table)))
    }

    const indexesResult = await client.query(
      `select indexname
       from pg_indexes
       where schemaname = 'public'
         and indexname = any($1::text[])`,
      [REQUIRED_INDEXES],
    )
    const indexes = new Set(indexesResult.rows.map((row) => row.indexname))
    for (const index of REQUIRED_INDEXES) {
      results.push(check(`Index exists: ${index}`, indexes.has(index)))
    }

    if (REQUIRED_TABLES.every((table) => tables.has(table))) {
      for (const table of REQUIRED_TABLES) {
        const countResult = await client.query(`select count(*)::int as count from ${table}`)
        counts.push({ table, count: countResult.rows[0].count })
      }
      const userCount = counts.find((row) => row.table === 'app_users')?.count || 0
      const workspaceCount = counts.find((row) => row.table === 'workspaces')?.count || 0
      results.push(check('Imported users are present', userCount > 0, `${userCount}`))
      results.push(check('Imported workspaces are present', workspaceCount > 0, `${workspaceCount}`))
    }
  } finally {
    client.release()
    await pool.end()
  }

  printReport(results, counts)
  if (results.some((item) => !item.ok)) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('PostgreSQL verification failed')
  console.error(error.message)
  process.exitCode = 1
})
