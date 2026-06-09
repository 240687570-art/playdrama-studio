import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import './load-env.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = dirname(__dirname)
const docsDir = join(projectRoot, 'docs')
const jsonDbPath = resolve(projectRoot, process.env.PLAYDRAMA_DB_PATH || 'server/data/playdrama-db.json')
const markdownPath = join(docsDir, 'database-migration-report.md')
const jsonPath = join(docsDir, 'database-migration-report.json')

const mappings = [
  ['users', 'app_users'],
  ['workspaces', 'workspaces'],
  ['memberships', 'workspace_memberships'],
  ['projects', 'projects'],
  ['builds', 'publish_builds'],
  ['events', 'analytics_events'],
  ['aiUsageEvents', 'ai_usage_events'],
  ['contentSafetyReviews', 'content_safety_reviews'],
  ['paymentOrders', 'payment_orders'],
  ['auditLog', 'audit_log'],
  ['inviteEmailDeliveries', 'invite_email_deliveries'],
]

function readDatabase() {
  if (!existsSync(jsonDbPath)) {
    return { found: false, data: {} }
  }
  return {
    found: true,
    data: JSON.parse(readFileSync(jsonDbPath, 'utf8')),
  }
}

function countRows(data) {
  return Object.fromEntries(
    mappings.map(([source, target]) => [
      source,
      {
        source,
        target,
        count: Array.isArray(data[source]) ? data[source].length : 0,
      },
    ]),
  )
}

function envStatus() {
  return {
    storageDriver: process.env.PLAYDRAMA_STORAGE_DRIVER || 'json',
    databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
    dbPath: jsonDbPath,
  }
}

function migrationDecision(status) {
  if (status.storageDriver === 'postgres' && status.databaseUrlConfigured) {
    return 'READY_TO_VERIFY'
  }
  if (status.databaseUrlConfigured) {
    return 'READY_TO_IMPORT'
  }
  return 'WAITING_FOR_DATABASE_URL'
}

function markdown(report) {
  const countLines = Object.values(report.counts).map(
    (item) => `| ${item.source} | ${item.target} | ${item.count} |`,
  )
  return [
    '# PlayDrama Studio 数据库迁移报告',
    '',
    `生成时间：${report.generatedAt}`,
    '',
    `决策：${report.decision}`,
    '',
    '## 当前状态',
    '',
    `- 本地 JSON 数据库：${report.source.found ? '已找到' : '未找到'}`,
    `- 本地数据路径：${report.source.path}`,
    `- 目标存储驱动：${report.environment.storageDriver}`,
    `- DATABASE_URL：${report.environment.databaseUrlConfigured ? '已配置' : '未配置'}`,
    '',
    '## 数据规模',
    '',
    '| JSON 字段 | PostgreSQL 表 | 记录数 |',
    '| --- | --- | ---: |',
    ...countLines,
    '',
    '## 执行顺序',
    '',
    '1. 新建 PostgreSQL / Supabase 数据库。',
    '2. 在目标库执行 `docs/database-schema.sql`，或设置 `DATABASE_URL` 后运行 `npm run db:schema`。',
    '3. 设置 `DATABASE_URL`。',
    '4. 运行 `npm run db:schema`。',
    '5. 运行 `npm run db:import-json`。',
    '6. 运行 `npm run db:verify`，确认 `Result: PASS`。',
    '7. 设置 `PLAYDRAMA_STORAGE_DRIVER=postgres` 后重启 API。',
    '8. 运行 `npm run readiness:api` 和 `npm run launch:gate`。',
    '',
    '## PowerShell 模板',
    '',
    '```powershell',
    'cd D:\\代码\\playdrama-studio',
    '$env:DATABASE_URL = "postgresql://USER:PASSWORD@HOST:5432/playdrama"',
    'npm run db:schema',
    'npm run db:import-json',
    'npm run db:verify',
    '$env:PLAYDRAMA_STORAGE_DRIVER = "postgres"',
    'npm run api',
    '```',
    '',
    '## 注意',
    '',
    '- 不要把真实 `DATABASE_URL` 写进代码仓库。',
    '- 导入前先备份本地 JSON 数据和目标云数据库。',
    '- 当前 PostgreSQL 驱动适合内测迁移验证，正式大规模商用前还要继续做增量写入优化。',
    '',
  ].join('\n')
}

const source = readDatabase()
const environment = envStatus()
const report = {
  generatedAt: new Date().toISOString(),
  decision: migrationDecision(environment),
  source: {
    found: source.found,
    path: jsonDbPath,
  },
  environment,
  counts: countRows(source.data),
}

mkdirSync(docsDir, { recursive: true })
writeFileSync(markdownPath, markdown(report), 'utf8')
writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8')

console.log('Database migration report generated')
console.log(`Decision: ${report.decision}`)
console.log(`Markdown: ${markdownPath}`)
console.log(`JSON: ${jsonPath}`)

if (!report.environment.databaseUrlConfigured) {
  process.exitCode = 1
}
