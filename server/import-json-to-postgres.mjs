import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import './load-env.mjs'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.PLAYDRAMA_DB_PATH || join(__dirname, 'data', 'playdrama-db.json')

async function getPostgresConnectionString() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }

  if (process.env.NETLIFY_DATABASE_READY === 'true') {
    const { getConnectionString } = await import('@netlify/database')
    return getConnectionString()
  }

  console.error('DATABASE_URL or NETLIFY_DATABASE_READY=true is required.')
  process.exit(1)
}

const rolePresets = {
  owner: [
    'project:read',
    'project:write',
    'project:publish',
    'analytics:read',
    'member:manage',
  ],
  editor: ['project:read', 'project:write', 'project:publish'],
  analyst: ['project:read', 'analytics:read'],
  viewer: ['project:read'],
}

function now() {
  return new Date().toISOString()
}

function readJsonDatabase() {
  const raw = readFileSync(DB_PATH, 'utf8')
  const data = JSON.parse(raw)
  return {
    users: Array.isArray(data.users) ? data.users : [],
    workspaces: Array.isArray(data.workspaces) ? data.workspaces : [],
    memberships: Array.isArray(data.memberships) ? data.memberships : [],
    projects: Array.isArray(data.projects) ? data.projects : [],
    builds: Array.isArray(data.builds) ? data.builds : [],
    events: Array.isArray(data.events) ? data.events : [],
    aiUsageEvents: Array.isArray(data.aiUsageEvents) ? data.aiUsageEvents : [],
    aiGenerationJobs: Array.isArray(data.aiGenerationJobs) ? data.aiGenerationJobs : [],
    contentSafetyReviews: Array.isArray(data.contentSafetyReviews)
      ? data.contentSafetyReviews
      : [],
    paymentOrders: Array.isArray(data.paymentOrders) ? data.paymentOrders : [],
    distributionJobs: Array.isArray(data.distributionJobs) ? data.distributionJobs : [],
    videoGenerationJobs: Array.isArray(data.videoGenerationJobs) ? data.videoGenerationJobs : [],
    finalVideoRenders: Array.isArray(data.finalVideoRenders) ? data.finalVideoRenders : [],
    canvasAssets: Array.isArray(data.canvasAssets) ? data.canvasAssets : [],
    canvasNodeRuns: Array.isArray(data.canvasNodeRuns) ? data.canvasNodeRuns : [],
    canvasWorkflowRuns: Array.isArray(data.canvasWorkflowRuns) ? data.canvasWorkflowRuns : [],
    auditLog: Array.isArray(data.auditLog) ? data.auditLog : [],
    inviteEmailDeliveries: Array.isArray(data.inviteEmailDeliveries)
      ? data.inviteEmailDeliveries
      : [],
    authEmailCodes: Array.isArray(data.authEmailCodes) ? data.authEmailCodes : [],
    authSmsCodes: Array.isArray(data.authSmsCodes) ? data.authSmsCodes : [],
    authSessions: Array.isArray(data.authSessions) ? data.authSessions : [],
  }
}

async function importDatabase(snapshot) {
  const pool = new pg.Pool({ connectionString: await getPostgresConnectionString() })
  const client = await pool.connect()

  try {
    await client.query('begin')
    await client.query('delete from auth_sessions')
    await client.query('delete from auth_sms_codes')
    await client.query('delete from auth_email_codes')
    await client.query('delete from canvas_workflow_runs')
    await client.query('delete from canvas_node_runs')
    await client.query('delete from canvas_assets')
    await client.query('delete from final_video_renders')
    await client.query('delete from video_generation_jobs')
    await client.query('delete from distribution_jobs')
    await client.query('delete from payment_orders')
    await client.query('delete from ai_generation_jobs')
    await client.query('delete from ai_usage_events')
    await client.query('delete from content_safety_reviews')
    await client.query('delete from analytics_events')
    await client.query('delete from invite_email_deliveries')
    await client.query('delete from audit_log')
    await client.query('delete from publish_builds')
    await client.query('delete from projects')
    await client.query('delete from workspace_memberships')
    await client.query('delete from workspaces')
    await client.query('delete from app_users')

    for (const item of snapshot.users) {
      await client.query(
        `insert into app_users
          (id, display_name, email, phone, role, avatar_initials, created_at)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          item.id,
          item.displayName,
          item.email,
          item.phone || null,
          item.role || 'creator',
          item.avatarInitials || null,
          item.createdAt || now(),
        ],
      )
    }

    for (const item of snapshot.workspaces) {
      await client.query(
        `insert into workspaces
          (id, name, plan, owner_user_id, created_at)
         values ($1, $2, $3, $4, $5)`,
        [
          item.id,
          item.name,
          item.plan || 'creator',
          item.ownerUserId,
          item.createdAt || now(),
        ],
      )
    }

    for (const item of snapshot.memberships) {
      await client.query(
        `insert into workspace_memberships
          (id, user_id, workspace_id, role, permissions, status, joined_at, invited_at, invite_token, invite_expires_at, accepted_at)
         values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11)`,
        [
          item.id,
          item.userId,
          item.workspaceId,
          item.role,
          JSON.stringify(item.permissions || rolePresets[item.role] || []),
          item.status || 'active',
          item.joinedAt || now(),
          item.invitedAt || null,
          item.inviteToken || null,
          item.inviteExpiresAt || null,
          item.acceptedAt || null,
        ],
      )
    }

    for (const item of snapshot.projects) {
      await client.query(
        `insert into projects
          (id, workspace_id, title, template, publish, model_routing, nodes, variables, characters, lifecycle_status, archived_at, created_at, updated_at)
         values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11, $12, $13)`,
        [
          item.id,
          item.workspaceId,
          item.title,
          item.template,
          JSON.stringify(item.publish || {}),
          JSON.stringify(item.modelRouting || {}),
          JSON.stringify(item.nodes || []),
          JSON.stringify(item.variables || []),
          JSON.stringify(item.characters || []),
          item.lifecycleStatus || 'active',
          item.archivedAt || null,
          item.createdAt || now(),
          item.updatedAt || now(),
        ],
      )
    }

    for (const item of snapshot.builds) {
      await client.query(
        `insert into publish_builds
          (id, project_id, workspace_id, version, status, visibility, runtime_url, snapshot, content_safety, created_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10)`,
        [
          item.id,
          item.projectId,
          item.workspaceId,
          item.version,
          item.status,
          item.visibility,
          item.runtimeUrl,
          JSON.stringify(item.snapshot || {}),
          JSON.stringify(item.contentSafety || {}),
          item.createdAt || now(),
        ],
      )
    }

    for (const item of snapshot.events) {
      await client.query(
        `insert into analytics_events
          (id, workspace_id, project_id, build_id, session_id, event_name, node_id, choice_id, metadata, created_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)`,
        [
          item.id,
          item.workspaceId,
          item.projectId,
          item.buildId || null,
          item.sessionId,
          item.eventName,
          item.nodeId || null,
          item.choiceId || null,
          JSON.stringify(item.metadata || {}),
          item.createdAt || now(),
        ],
      )
    }

    for (const item of snapshot.aiUsageEvents) {
      await client.query(
        `insert into ai_usage_events
          (id, workspace_id, project_id, task, provider_id, model, status, input_tokens, output_tokens, total_tokens, estimated_cost, currency, latency_ms, output_summary, created_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15)`,
        [
          item.id,
          item.workspaceId,
          item.projectId || null,
          item.task,
          item.providerId,
          item.model,
          item.status,
          item.inputTokens || 0,
          item.outputTokens || 0,
          item.totalTokens || 0,
          item.estimatedCost || '0',
          item.currency || 'USD',
          item.latencyMs || 0,
          JSON.stringify(item.outputSummary || {}),
          item.createdAt || now(),
        ],
      )
    }

    for (const item of snapshot.aiGenerationJobs) {
      await client.query(
        `insert into ai_generation_jobs
          (id, actor_user_id, workspace_id, project_id, task, input, input_summary, retry_of, status, stage, progress, message, error_code, error_message, raw_error_message, output_summary, result, usage_event_id, created_at, started_at, updated_at, completed_at)
         values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb, $17::jsonb, $18, $19, $20, $21, $22)`,
        [
          item.id,
          item.actorUserId,
          item.workspaceId,
          item.projectId || null,
          item.task,
          JSON.stringify(item.input || {}),
          JSON.stringify(item.inputSummary || {}),
          item.retryOf || null,
          item.status || 'queued',
          item.stage || 'queued',
          Number(item.progress || 0),
          item.message || '',
          item.errorCode || '',
          item.errorMessage || '',
          item.rawErrorMessage || '',
          JSON.stringify(item.outputSummary || null),
          JSON.stringify(item.result || null),
          item.usageEventId || item.result?.usageEvent?.id || null,
          item.createdAt || now(),
          item.startedAt || null,
          item.updatedAt || item.createdAt || now(),
          item.completedAt || null,
        ],
      )
    }

    for (const item of snapshot.contentSafetyReviews) {
      await client.query(
        `insert into content_safety_reviews
          (id, workspace_id, project_id, provider, policy_version, status, passed, flag_count, blocking_count, review_count, notice_count, flags, summary, created_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14)`,
        [
          item.id,
          item.workspaceId,
          item.projectId,
          item.provider || 'local-rules',
          item.policyVersion || 'local-rules-v1',
          item.status || 'passed',
          Boolean(item.passed),
          item.flagCount || 0,
          item.blockingCount || 0,
          item.reviewCount || 0,
          item.noticeCount || 0,
          JSON.stringify(item.flags || []),
          JSON.stringify(item.summary || {}),
          item.createdAt || now(),
        ],
      )
    }

    for (const item of snapshot.paymentOrders) {
      await client.query(
        `insert into payment_orders
          (id, workspace_id, project_id, build_id, user_id, session_id, provider, status, amount, currency, monetization, item_type, item_id, unlock_node_ids, metadata, paid_at, created_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb, $16, $17)`,
        [
          item.id,
          item.workspaceId,
          item.projectId,
          item.buildId,
          item.userId || null,
          item.sessionId,
          item.provider,
          item.status,
          item.amount || 0,
          item.currency || 'CNY',
          item.monetization || 'Free',
          item.itemType || 'ending',
          item.itemId || null,
          JSON.stringify(item.unlockNodeIds || []),
          JSON.stringify(item.metadata || {}),
          item.paidAt || null,
          item.createdAt || now(),
        ],
      )
    }

    for (const item of snapshot.distributionJobs) {
      await client.query(
        `insert into distribution_jobs
          (id, workspace_id, project_id, build_id, channel, provider, status, title, caption, target_url, mini_program_path, external_id, request, response, error_message, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15, $16, $17)`,
        [
          item.id,
          item.workspaceId,
          item.projectId,
          item.buildId || null,
          item.channel,
          item.provider,
          item.status,
          item.title || '',
          item.caption || '',
          item.targetUrl || '',
          item.miniProgramPath || '',
          item.externalId || null,
          JSON.stringify(item.request || {}),
          JSON.stringify(item.response || {}),
          item.errorMessage || null,
          item.createdAt || now(),
          item.updatedAt || item.createdAt || now(),
        ],
      )
    }

    for (const item of snapshot.videoGenerationJobs) {
      await client.query(
        `insert into video_generation_jobs
          (id, workspace_id, project_id, shot_id, node_id, provider, model, status, prompt, duration, aspect_ratio, external_id, output_url, thumbnail_url, request, response, error_message, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $16::jsonb, $17, $18, $19)`,
        [
          item.id,
          item.workspaceId,
          item.projectId,
          item.shotId,
          item.nodeId || '',
          item.provider,
          item.model || '',
          item.status,
          item.prompt || '',
          item.duration || '',
          item.aspectRatio || '9:16',
          item.externalId || null,
          item.outputUrl || '',
          item.thumbnailUrl || '',
          JSON.stringify(item.request || {}),
          JSON.stringify(item.response || {}),
          item.errorMessage || null,
          item.createdAt || now(),
          item.updatedAt || item.createdAt || now(),
        ],
      )
    }

    for (const item of snapshot.finalVideoRenders) {
      await client.query(
        `insert into final_video_renders
          (id, workspace_id, project_id, status, title, aspect_ratio, clip_count, output_url, manifest_url, request, response, error_message, created_at, started_at, updated_at, completed_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12, $13, $14, $15, $16)`,
        [
          item.id,
          item.workspaceId,
          item.projectId,
          item.status,
          item.title || '',
          item.aspectRatio || '9:16',
          Number(item.clipCount || 0),
          item.outputUrl || '',
          item.manifestUrl || '',
          JSON.stringify(item.request || {}),
          JSON.stringify(item.response || {}),
          item.errorMessage || null,
          item.createdAt || now(),
          item.startedAt || null,
          item.updatedAt || item.createdAt || now(),
          item.completedAt || null,
        ],
      )
    }

    for (const item of snapshot.canvasAssets) {
      await client.query(
        `insert into canvas_assets
          (id, workspace_id, project_id, node_id, type, name, meta, source, status, file_name, mime_type, size, url, created_by, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          item.id,
          item.workspaceId,
          item.projectId,
          item.nodeId || null,
          item.type || 'script',
          item.name || '',
          item.meta || '',
          item.source || '',
          item.status || 'ready',
          item.fileName || '',
          item.mimeType || '',
          Number(item.size || 0),
          item.url || '',
          item.createdBy || null,
          item.createdAt || now(),
          item.updatedAt || item.createdAt || now(),
        ],
      )
    }

    for (const item of snapshot.canvasNodeRuns) {
      await client.query(
        `insert into canvas_node_runs
          (id, workspace_id, project_id, node_id, node_title, node_type, asset_id, status, progress, message, output_title, output_preview, model, prompt, credits, created_by, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          item.id,
          item.workspaceId,
          item.projectId,
          item.nodeId,
          item.nodeTitle || '',
          item.nodeType || 'text',
          item.assetId || null,
          item.status || 'succeeded',
          Number(item.progress || 100),
          item.message || '',
          item.outputTitle || '',
          item.outputPreview || '',
          item.model || '',
          item.prompt || '',
          Number(item.credits || 0),
          item.createdBy || null,
          item.createdAt || now(),
          item.updatedAt || item.createdAt || now(),
        ],
      )
    }

    for (const item of snapshot.canvasWorkflowRuns) {
      await client.query(
        `insert into canvas_workflow_runs
          (id, workspace_id, project_id, status, scope, start_node_id, node_ids, run_ids, credits, message, created_by, created_at, updated_at, completed_at)
         values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12, $13, $14)`,
        [
          item.id,
          item.workspaceId,
          item.projectId,
          item.status || 'succeeded',
          item.scope || 'all',
          item.startNodeId || '',
          JSON.stringify(item.nodeIds || []),
          JSON.stringify(item.runIds || []),
          Number(item.credits || 0),
          item.message || '',
          item.createdBy || null,
          item.createdAt || now(),
          item.updatedAt || item.createdAt || now(),
          item.completedAt || null,
        ],
      )
    }

    for (const item of snapshot.auditLog) {
      await client.query(
        `insert into audit_log
          (id, user_id, workspace_id, action, target_type, target_id, metadata, created_at)
         values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
        [
          item.id,
          item.userId,
          item.workspaceId,
          item.action,
          item.targetType,
          item.targetId,
          JSON.stringify(item.metadata || {}),
          item.createdAt || now(),
        ],
      )
    }

    for (const item of snapshot.inviteEmailDeliveries) {
      await client.query(
        `insert into invite_email_deliveries
          (id, workspace_id, member_id, provider, to_email, subject, invite_url, role, status, provider_message_id, error_message, expires_at, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          item.id,
          item.workspaceId,
          item.memberId,
          item.provider,
          item.to,
          item.subject,
          item.inviteUrl,
          item.role,
          item.status,
          item.providerMessageId || null,
          item.errorMessage || null,
          item.expiresAt || null,
          item.createdAt || now(),
          item.updatedAt || item.createdAt || now(),
        ],
      )
    }

    for (const item of snapshot.authEmailCodes) {
      await client.query(
        `insert into auth_email_codes
          (id, email, code_hash, purpose, status, attempts, expires_at, consumed_at, metadata, created_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)`,
        [
          item.id,
          item.email,
          item.codeHash,
          item.purpose || 'login',
          item.status || 'pending',
          item.attempts || 0,
          item.expiresAt,
          item.consumedAt || null,
          JSON.stringify(item.metadata || {}),
          item.createdAt || now(),
        ],
      )
    }

    for (const item of snapshot.authSmsCodes) {
      await client.query(
        `insert into auth_sms_codes
          (id, phone, code_hash, purpose, status, attempts, expires_at, consumed_at, metadata, created_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)`,
        [
          item.id,
          item.phone,
          item.codeHash,
          item.purpose || 'login',
          item.status || 'pending',
          item.attempts || 0,
          item.expiresAt,
          item.consumedAt || null,
          JSON.stringify(item.metadata || {}),
          item.createdAt || now(),
        ],
      )
    }

    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

const snapshot = readJsonDatabase()
await importDatabase(snapshot)

console.log(
  JSON.stringify(
    {
      importedFrom: DB_PATH,
      users: snapshot.users.length,
      workspaces: snapshot.workspaces.length,
      memberships: snapshot.memberships.length,
      projects: snapshot.projects.length,
      builds: snapshot.builds.length,
      events: snapshot.events.length,
      aiUsageEvents: snapshot.aiUsageEvents.length,
      aiGenerationJobs: snapshot.aiGenerationJobs.length,
      contentSafetyReviews: snapshot.contentSafetyReviews.length,
      paymentOrders: snapshot.paymentOrders.length,
      distributionJobs: snapshot.distributionJobs.length,
      videoGenerationJobs: snapshot.videoGenerationJobs.length,
      finalVideoRenders: snapshot.finalVideoRenders.length,
      canvasAssets: snapshot.canvasAssets.length,
      canvasNodeRuns: snapshot.canvasNodeRuns.length,
      canvasWorkflowRuns: snapshot.canvasWorkflowRuns.length,
      auditLog: snapshot.auditLog.length,
      inviteEmailDeliveries: snapshot.inviteEmailDeliveries.length,
    },
    null,
    2,
  ),
)
