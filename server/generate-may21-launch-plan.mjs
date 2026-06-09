import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import './load-env.mjs'
import { evaluateProductionReadiness } from './readiness.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = dirname(__dirname)
const docsDir = join(projectRoot, 'docs')
const markdownPath = join(docsDir, 'may21-launch-plan.md')
const jsonPath = join(docsDir, 'may21-launch-plan.json')
const targetDate = '2026-05-21'

const userOwned = new Set([
  'database',
  'auth-provider',
  'auth-provider-config',
  'auth-secret',
  'auth-adapter-verified',
  'email-provider',
  'email-provider-config',
  'email-live-mode',
  'ai-key',
  'ai-model-name',
  'payment-provider',
  'payment-secret',
  'content-safety',
  'deployment-url',
])

const codexCanContinue = new Set([
  'ai-provider',
  'ai-adapter-verified',
  'ai-cost-tracking',
])

const evidence = {
  database: 'Aliyun RDS PostgreSQL is connected, schema is applied, JSON data is imported, and db:verify passed.',
  'auth-provider': 'AUTH_PROVIDER=trusted-identity is configured.',
  'auth-provider-config': 'AUTH_TRUSTED_IDENTITY_READY=true and AUTH_TRUSTED_IDENTITY_SECRET are configured.',
  'auth-secret': 'Trusted identity gateway manages the production session.',
  'deployment-url': 'https://playdrama-studio-preview.netlify.app responds over HTTPS.',
}

const tomorrowActions = {
  database:
    '准备阿里云 RDS PostgreSQL 或其他生产 PostgreSQL，提供 DATABASE_URL；我来跑 db:schema、db:import-json 和 db:verify。',
  'auth-provider':
    '确定生产登录方案。若先走阿里云体系，建议使用 AUTH_PROVIDER=trusted-identity，前置手机号/微信/企业账号登录网关；不要再用 local-demo。',
  'auth-provider-config':
    '提供 AUTH_TRUSTED_IDENTITY_SECRET，并确认上游登录网关会透传 x-playdrama-identity-* 请求头。',
  'auth-secret':
    '如果使用 trusted-identity，由上游登录网关托管会话，并设置 AUTH_TRUSTED_IDENTITY_READY=true；否则提供生产 AUTH_SESSION_SECRET。',
  'auth-adapter-verified':
    '在真实登录网关中创建或确认一个账号，完成登录/刷新会话/退出/邀请接受/审计归属验收；全部通过后设置 AUTH_PROVIDER_ADAPTER_READY=true。',
  'email-provider':
    '确认使用 EMAIL_PROVIDER=aliyun-directmail，准备阿里云账号、已验证发信域名或发信地址。',
  'email-provider-config':
    '在阿里云邮件推送中完成发信地址或发信域名验证，提供 AccessKey ID、AccessKey Secret、AccountName、CallbackSecret。',
  'email-live-mode':
    '阿里云邮件推送 dry-run 演练通过后，设置 ALIYUN_DM_DRY_RUN=false，并提供一个内部测试收件箱做真实 staging 投递。',
  'ai-provider':
    '选择首发国内模型供应商，建议先选 deepseek 或 qwen。',
  'ai-key':
    '提供对应模型 API Key，只写入 Netlify 环境变量，不写进代码。',
  'ai-model-name':
    '确认默认模型名，例如 deepseek-chat 或 qwen-plus。',
  'ai-adapter-verified':
    '用真实 Key 跑 story_outline、expand_branch、character_bible、story_quality_check 四类任务，全部成功后设置 AI_PROVIDER_ADAPTER_READY=true。',
  'ai-cost-tracking':
    '确认模型调用日志能记录 provider、model、token、成本估算、workspaceId、projectId 后设置 AI_COST_TRACKING_READY=true。',
  'payment-provider':
    '先使用 PAYMENT_PROVIDER=sandbox 完成付费结局沙盒验收；正式收款再接支付宝或微信支付。',
  'payment-secret':
    '设置 PAYMENT_SANDBOX_READY=true 和 PAYMENT_SANDBOX_VERIFIED=true；正式支付阶段再提供支付宝/微信商户密钥并完成回调验签。',
  'content-safety':
    '确定内容审核供应商并提供 API Key，完成正常内容通过、敏感内容拦截的验收。',
  'deployment-url':
    '准备正式或预发 HTTPS 域名，配置 APP_BASE_URL，并确认前端和 API 的公网访问地址。',
}

function ownerFor(item) {
  if (userOwned.has(item.id)) return '需要你明天配合'
  if (codexCanContinue.has(item.id)) return '我可以继续推进代码和验收脚本'
  return item.ok ? '已完成' : '待确认'
}

function planItem(item) {
  return {
    id: item.id,
    area: item.area,
    label: item.label,
    status: item.ok ? 'done' : 'blocked',
    owner: ownerFor(item),
    missingFields: item.missingFields,
    action: item.ok ? evidence[item.id] || '已通过商用门禁。' : item.action,
    tomorrowAction: item.ok ? '' : tomorrowActions[item.id] || item.action,
  }
}

function markdown(plan) {
  const done = plan.items.filter((item) => item.status === 'done')
  const blocked = plan.items.filter((item) => item.status !== 'done')
  const userTasks = blocked.filter((item) => item.owner === '需要你明天配合')
  const codexTasks = blocked.filter((item) => item.owner === '我可以继续推进代码和验收脚本')

  return [
    '# PlayDrama Studio 5月21日商用上线作战清单',
    '',
    `生成时间：${plan.generatedAt}`,
    `目标日期：${targetDate}`,
    `当前决策：${plan.decision}`,
    `当前进度：${plan.readiness.passed}/${plan.readiness.total}`,
    '',
    '## 当前已完成',
    '',
    ...done.map((item) => `- ${item.area} / ${item.label}：${item.action}`),
    '',
    '## 明天需要你配合完成',
    '',
    ...userTasks.map((item) => [
      `### ${item.area} / ${item.label}`,
      '',
      `- 缺少字段：${item.missingFields.join(', ') || '无'}`,
      `- 明天动作：${item.tomorrowAction}`,
      '',
    ].join('\n')),
    '## 我可以继续推进的代码/验收项',
    '',
    ...codexTasks.map((item) => `- ${item.area} / ${item.label}：${item.tomorrowAction}`),
    '',
    '## 明天验收命令',
    '',
    '```powershell',
    'cd D:\\代码\\playdrama-studio',
    "$env:APP_BASE_URL='https://playdrama-studio-preview.netlify.app'",
    "$env:PLAYDRAMA_API_BASE='https://playdrama-studio-preview.netlify.app'",
    'npm run commercial:smoke',
    'npm run launch:gate',
    '```',
    '',
    '## 上线口径',
    '',
    '- `commercial:smoke` 和 `launch:gate` 都必须最终输出 GO。',
    '- 真实密钥只填 Netlify 环境变量或本机 `.env`，不要写入代码。',
    '- 没有完成真实发信、真实模型调用、内容安全、支付沙箱前，不进入公开商用。',
    '',
  ].join('\n')
}

const readiness = evaluateProductionReadiness(process.env)
const plan = {
  generatedAt: new Date().toISOString(),
  targetDate,
  decision: readiness.status === 'pass' ? 'GO' : 'NO-GO',
  readiness,
  items: readiness.items.map(planItem),
}

mkdirSync(docsDir, { recursive: true })
writeFileSync(markdownPath, markdown(plan), 'utf8')
writeFileSync(jsonPath, JSON.stringify(plan, null, 2), 'utf8')

console.log('May 21 launch plan generated')
console.log(`Decision: ${plan.decision}`)
console.log(`Markdown: ${markdownPath}`)
console.log(`JSON: ${jsonPath}`)

if (plan.decision !== 'GO') {
  process.exitCode = 1
}
