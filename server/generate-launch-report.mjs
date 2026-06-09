import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import './load-env.mjs'
import { evaluateProductionReadiness } from './readiness.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = dirname(__dirname)
const docsDir = join(projectRoot, 'docs')
const markdownPath = join(docsDir, 'launch-readiness-report.md')
const jsonPath = join(docsDir, 'launch-readiness-report.json')

const owners = {
  database: '开发/云数据库负责人',
  'auth-provider': '开发/账号体系负责人',
  'auth-provider-config': '开发/账号体系负责人',
  'auth-secret': '开发/运维负责人',
  'auth-adapter-verified': '开发/账号体系负责人',
  'email-provider': '运营/邮件服务负责人',
  'email-provider-config': '运营/阿里云邮件负责人',
  'email-live-mode': '运营/阿里云邮件负责人',
  'ai-provider': 'AI产品/模型负责人',
  'ai-key': 'AI产品/模型负责人',
  'ai-model-name': 'AI产品/模型负责人',
  'ai-adapter-verified': 'AI工程/模型负责人',
  'ai-cost-tracking': 'AI工程/财务负责人',
  'payment-provider': '商业化/支付负责人',
  'payment-secret': '商业化/支付负责人',
  'content-safety': '合规/内容安全负责人',
  'deployment-url': '开发/运维负责人',
}

const acceptance = {
  database: '执行 docs/database-schema.sql，运行 npm run db:import-json 和 npm run db:verify。',
  'auth-provider': '用真实账号登录，刷新后会话仍有效，/api/me 返回对应用户。',
  'auth-provider-config': '运行 npm run prod:verify，确认账号供应商配置项通过。',
  'auth-secret': '重启 API 后确认正式 Auth session/JWT 校验正常。',
  'auth-adapter-verified': '完成登录、退出、会话恢复、邀请接受、审计归属验收后再设置 AUTH_PROVIDER_ADAPTER_READY=true。',
  'email-provider': '使用 EMAIL_PROVIDER=aliyun-directmail 发送真实邀请邮件，收件箱收到邮件。',
  'email-provider-config': '阿里云邮件推送发信地址验证通过，真实 invite delivery 返回 providerMessageId。',
  'email-live-mode': 'ALIYUN_DM_DRY_RUN=false 后发送一封 staging 邀请。',
  'ai-provider': '用主模型生成一次剧情、分支和变量建议。',
  'ai-key': '记录一次模型调用成本和失败重试日志。',
  'ai-model-name': '确认 /api/ai/providers 显示当前默认模型名，并完成一次真实生成。',
  'ai-adapter-verified': 'story_outline、expand_branch、character_bible、story_quality_check 四类任务至少各成功一次。',
  'ai-cost-tracking': '模型调用日志包含 provider、model、token、成本估算、workspaceId、projectId。',
  'payment-provider': '完成 PAYMENT_PROVIDER=sandbox 沙盒下单、订单落库和付费结局解锁。',
  'payment-secret': 'npm run payment:sandbox:verify 通过；真实支付接入后再验签回调和伪造回调拒绝。',
  'content-safety': '对测试敏感内容返回拦截，对正常剧情返回通过。',
  'deployment-url': '公网 HTTPS 域名访问前端和 API，npm run readiness:api 指向预发域名通过。',
}

function sectionFor(item) {
  const status = item.ok ? 'PASS' : 'TODO'
  const fields = item.missingFields.length > 0 ? item.missingFields.join(', ') : '无'
  return [
    `### ${status} ${item.area} / ${item.label}`,
    '',
    `- 负责人：${owners[item.id] || '待指定'}`,
    `- 缺少字段：${fields}`,
    `- 处理动作：${item.action}`,
    `- 验收方式：${acceptance[item.id] || '运行 npm run launch:gate。'}`,
    '',
  ].join('\n')
}

function markdownReport(readiness) {
  return [
    '# PlayDrama Studio 上线商用准备报告',
    '',
    `生成时间：${new Date().toISOString()}`,
    '',
    `决策：${readiness.status === 'pass' ? 'GO' : 'NO-GO'}`,
    '',
    `进度：${readiness.passed}/${readiness.total}`,
    '',
    '## 使用方式',
    '',
    '1. 按下面 TODO 项逐个找负责人开通服务和填写环境变量。',
    '2. 真实密钥只写入部署环境或本机 `.env`，不要写进代码仓库。',
    '3. 每完成一项后运行 `npm run prod:verify`。',
    '4. 上线前运行 `npm run readiness:api` 和 `npm run launch:gate`。',
    '',
    '## 阻塞项',
    '',
    ...(readiness.missing.length > 0
      ? readiness.missing.map(sectionFor)
      : ['当前没有阻塞项。', '']),
    '## 全量清单',
    '',
    ...readiness.items.map(sectionFor),
  ].join('\n')
}

function jsonReport(readiness) {
  return {
    generatedAt: new Date().toISOString(),
    decision: readiness.status === 'pass' ? 'GO' : 'NO-GO',
    readiness,
    ownership: Object.fromEntries(
      readiness.items.map((item) => [
        item.id,
        {
          owner: owners[item.id] || '待指定',
          acceptance: acceptance[item.id] || '运行 npm run launch:gate。',
        },
      ]),
    ),
  }
}

const readiness = evaluateProductionReadiness(process.env)
const report = jsonReport(readiness)

mkdirSync(docsDir, { recursive: true })
writeFileSync(markdownPath, markdownReport(readiness), 'utf8')
writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8')

console.log('Launch readiness report generated')
console.log(`Decision: ${report.decision}`)
console.log(`Markdown: ${markdownPath}`)
console.log(`JSON: ${jsonPath}`)

if (readiness.status !== 'pass') {
  process.exitCode = 1
}
