const aiProviderKeys = {
  deepseek: ['DEEPSEEK_API_KEY'],
  qwen: ['QWEN_API_KEY'],
  doubao: ['DOUBAO_API_KEY'],
  zhipu: ['ZHIPU_API_KEY'],
}

const paymentProviderKeys = {
  sandbox: ['PAYMENT_SANDBOX_READY', 'PAYMENT_SANDBOX_VERIFIED'],
  wechat: [
    'WECHAT_PAY_MCH_ID',
    'WECHAT_PAY_APP_ID',
    'WECHAT_PAY_API_V3_KEY',
    'WECHAT_PAY_SERIAL_NO',
    'WECHAT_PAY_NOTIFY_URL',
    'WECHAT_PAY_PRIVATE_KEY_PATH',
    'WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH',
  ],
  alipay: ['ALIPAY_APP_ID', 'ALIPAY_PRIVATE_KEY', 'ALIPAY_PUBLIC_KEY', 'ALIPAY_NOTIFY_URL'],
  stripe: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
}

const authProviderKeys = {
  'email-code': ['AUTH_EMAIL_CODE_READY'],
  'sms-code': ['AUTH_SMS_CODE_READY'],
  'netlify-identity': ['NETLIFY_IDENTITY_READY'],
  'trusted-identity': ['AUTH_TRUSTED_IDENTITY_READY', 'AUTH_TRUSTED_IDENTITY_SECRET'],
  supabase: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  authjs: ['AUTH_SECRET'],
  wechat: ['WECHAT_LOGIN_APP_ID', 'WECHAT_LOGIN_APP_SECRET'],
  github: ['AUTH_GITHUB_ID', 'AUTH_GITHUB_SECRET'],
}

function has(env, name) {
  return Boolean(env[name] && String(env[name]).trim())
}

function missing(env, names) {
  return names.filter((name) => !has(env, name))
}

function requiredFor(map, provider) {
  return map[String(provider || '').toLowerCase()] || []
}

function paymentProviderList(provider) {
  const providers = String(provider || '')
    .split(/[,\s;|]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .map((item) => (item === 'wxpay' || item === 'wechat-pay' ? 'wechat' : item))
    .filter((item) => paymentProviderKeys[item])
  return providers.length > 0 ? [...new Set(providers)] : []
}

function emailProviderConfig(env, provider) {
  if (provider === 'tencent-ses') {
    return {
      label: '腾讯云 SES 凭证和模板',
      ok: true,
      missingFields: missing(env, [
        'TENCENTCLOUD_SECRET_ID',
        'TENCENTCLOUD_SECRET_KEY',
        'TENCENT_SES_FROM_EMAIL',
        'TENCENT_SES_TEMPLATE_ID',
        'EMAIL_CALLBACK_SECRET',
      ]),
      action: '完成腾讯云 SES 发信地址、模板审核、回调签名配置。',
      dryRunField: 'TENCENT_SES_DRY_RUN',
    }
  }

  if (provider === 'aliyun-directmail') {
    return {
      label: '阿里云邮件推送凭证和发信地址',
      ok: true,
      missingFields: missing(env, [
        'ALIYUN_ACCESS_KEY_ID',
        'ALIYUN_ACCESS_KEY_SECRET',
        'ALIYUN_DM_ACCOUNT_NAME',
        'EMAIL_CALLBACK_SECRET',
      ]),
      action: '完成阿里云邮件推送发信域名或发信地址验证，配置 AccessKey、发信地址和回调密钥。',
      dryRunField: 'ALIYUN_DM_DRY_RUN',
    }
  }

  return {
    label: '邮件服务凭证和发信地址',
    ok: false,
    missingFields: ['EMAIL_PROVIDER'],
    action: '国内商用优先 EMAIL_PROVIDER=aliyun-directmail 或 tencent-ses。',
    dryRunField: '',
  }
}

function isLocalUrl(value = '') {
  return (
    value.includes('127.0.0.1') ||
    value.includes('localhost') ||
    value.startsWith('http://')
  )
}

function readinessItem({ id, area, label, ok, action, missingFields = [] }) {
  return {
    id,
    area,
    label,
    ok: Boolean(ok) && missingFields.length === 0,
    action,
    missingFields,
  }
}

export function evaluateProductionReadiness(env = process.env) {
  const storageDriver = env.PLAYDRAMA_STORAGE_DRIVER || 'json'
  const databaseConfigured =
    has(env, 'PLAYDRAMA_DATABASE_URL') ||
    has(env, 'DATABASE_URL') ||
    env.NETLIFY_DATABASE_READY === 'true'
  const authProvider = env.AUTH_PROVIDER || 'local-demo'
  const emailProvider = env.EMAIL_PROVIDER || 'log'
  const emailConfig = emailProviderConfig(env, emailProvider)
  const aiProvider = env.AI_PROVIDER || 'stub'
  const paymentProvider = env.PAYMENT_PROVIDER || 'disabled'
  const safetyProvider = env.CONTENT_SAFETY_PROVIDER || 'manual'
  const appBaseUrl = env.APP_BASE_URL || 'http://127.0.0.1:5177'
  const authFields = requiredFor(authProviderKeys, authProvider)
  const authSessionManaged =
    (authProvider === 'netlify-identity' && env.NETLIFY_IDENTITY_READY === 'true') ||
    (authProvider === 'trusted-identity' && env.AUTH_TRUSTED_IDENTITY_READY === 'true')
  const aiFields = requiredFor(aiProviderKeys, aiProvider)
  const paymentProviders = paymentProviderList(paymentProvider)
  const paymentFields = paymentProviders.flatMap((provider) =>
    requiredFor(paymentProviderKeys, provider),
  )
  const localSafetyReady =
    safetyProvider === 'local-rules' && env.CONTENT_SAFETY_POLICY_READY === 'true'
  const externalSafetyReady =
    safetyProvider !== 'manual' &&
    safetyProvider !== 'local-rules' &&
    has(env, 'CONTENT_SAFETY_API_KEY')

  const items = [
    readinessItem({
      id: 'database',
      area: '数据库 Database',
      label: 'PostgreSQL / Supabase',
      ok: storageDriver === 'postgres' && databaseConfigured,
      action: '设置 PLAYDRAMA_STORAGE_DRIVER=postgres，配置 DATABASE_URL 或启用 Netlify Database，并运行迁移和 db:verify。',
      missingFields: [
        ...(storageDriver === 'postgres' ? [] : ['PLAYDRAMA_STORAGE_DRIVER']),
        ...(databaseConfigured ? [] : ['PLAYDRAMA_DATABASE_URL or DATABASE_URL or NETLIFY_DATABASE_READY']),
      ],
    }),
    readinessItem({
      id: 'auth-provider',
      area: '登录 Auth',
      label: '真实账号供应商',
      ok: authProvider !== 'local-demo',
      action: '接入 trusted-identity、Supabase Auth、Auth.js、微信登录或手机号登录。',
      missingFields: authProvider === 'local-demo' ? ['AUTH_PROVIDER'] : [],
    }),
    readinessItem({
      id: 'auth-provider-config',
      area: '登录 Auth',
      label: '账号供应商配置',
      ok: authFields.length > 0 && missing(env, authFields).length === 0,
      action: '根据 AUTH_PROVIDER 配置对应 URL、Client Key、Server Secret、OAuth 凭证或 trusted identity 共享密钥。',
      missingFields:
        authFields.length > 0 ? missing(env, authFields) : ['AUTH_PROVIDER'],
    }),
    readinessItem({
      id: 'auth-secret',
      area: '登录 Auth',
      label: '生产会话密钥',
      ok:
        authSessionManaged ||
        (has(env, 'AUTH_SESSION_SECRET') &&
          env.AUTH_SESSION_SECRET !== 'change-me-before-production'),
      action: '配置高强度 AUTH_SESSION_SECRET，或使用 Netlify Identity / trusted identity 上游托管会话。',
      missingFields:
        authSessionManaged ||
        (has(env, 'AUTH_SESSION_SECRET') &&
          env.AUTH_SESSION_SECRET !== 'change-me-before-production')
          ? []
          : ['AUTH_SESSION_SECRET or NETLIFY_IDENTITY_READY'],
    }),
    readinessItem({
      id: 'auth-adapter-verified',
      area: '登录 Auth',
      label: '真实登录适配器验收',
      ok: env.AUTH_PROVIDER_ADAPTER_READY === 'true',
      action: '完成真实登录、退出、会话恢复、邀请接受、审计归属验收后设置 AUTH_PROVIDER_ADAPTER_READY=true。',
      missingFields:
        env.AUTH_PROVIDER_ADAPTER_READY === 'true' ? [] : ['AUTH_PROVIDER_ADAPTER_READY'],
    }),
    readinessItem({
      id: 'email-provider',
      area: '邮件 Email',
      label: '真实邮件服务',
      ok: emailProvider !== 'log',
      action: '国内商用优先 EMAIL_PROVIDER=aliyun-directmail 或 tencent-ses；海外测试可接 webhook。',
      missingFields: emailProvider === 'log' ? ['EMAIL_PROVIDER'] : [],
    }),
    readinessItem({
      id: 'email-provider-config',
      area: '邮件 Email',
      label: emailConfig.label,
      ok: emailConfig.ok,
      action: emailConfig.action,
      missingFields: [
        ...(emailConfig.ok ? [] : ['EMAIL_PROVIDER']),
        ...emailConfig.missingFields,
      ],
    }),
    readinessItem({
      id: 'email-live-mode',
      area: '邮件 Email',
      label: '真实发信模式',
      ok: !emailConfig.dryRunField || env[emailConfig.dryRunField] !== 'true',
      action: '真实 staging 前关闭邮件服务 dry-run 模式。',
      missingFields:
        emailConfig.dryRunField && env[emailConfig.dryRunField] === 'true'
          ? [emailConfig.dryRunField]
          : [],
    }),
    readinessItem({
      id: 'ai-provider',
      area: 'AI 模型 AI',
      label: '国内商用模型供应商',
      ok: aiProvider !== 'stub',
      action: '国内公开商用优先选择 deepseek、qwen、doubao 或 zhipu。',
      missingFields: aiProvider === 'stub' ? ['AI_PROVIDER'] : [],
    }),
    readinessItem({
      id: 'ai-key',
      area: 'AI 模型 AI',
      label: '模型 API Key',
      ok: aiFields.length > 0 && missing(env, aiFields).length === 0,
      action: '根据 AI_PROVIDER 配置对应 API Key。',
      missingFields: aiFields.length > 0 ? missing(env, aiFields) : ['AI_PROVIDER'],
    }),
    readinessItem({
      id: 'ai-model-name',
      area: 'AI 模型 AI',
      label: '默认模型名称',
      ok: has(env, 'AI_MODEL_NAME'),
      action: '配置当前供应商的默认商用模型名，例如 deepseek-chat、qwen-plus、doubao-pro 或 glm-4。',
      missingFields: missing(env, ['AI_MODEL_NAME']),
    }),
    readinessItem({
      id: 'ai-adapter-verified',
      area: 'AI 模型 AI',
      label: '真实模型适配器验收',
      ok: env.AI_PROVIDER_ADAPTER_READY === 'true',
      action: '完成真实剧情生成、分支生成、角色设定、质量检查调用后设置 AI_PROVIDER_ADAPTER_READY=true。',
      missingFields:
        env.AI_PROVIDER_ADAPTER_READY === 'true' ? [] : ['AI_PROVIDER_ADAPTER_READY'],
    }),
    readinessItem({
      id: 'ai-cost-tracking',
      area: 'AI 模型 AI',
      label: '模型成本统计',
      ok: env.AI_COST_TRACKING_READY === 'true',
      action: '记录每次模型调用的 provider、model、token、成本估算、workspaceId 和 projectId。',
      missingFields: env.AI_COST_TRACKING_READY === 'true' ? [] : ['AI_COST_TRACKING_READY'],
    }),
    readinessItem({
      id: 'payment-provider',
      area: '支付 Payment',
      label: '支付供应商',
      ok: paymentProvider !== 'disabled' && paymentProviders.length > 0,
      action: '内测先配置 PAYMENT_PROVIDER=sandbox；正式收款接入支付宝、微信支付或 Stripe。',
      missingFields:
        paymentProvider === 'disabled' || paymentProviders.length === 0
          ? ['PAYMENT_PROVIDER']
          : [],
    }),
    readinessItem({
      id: 'payment-secret',
      area: '支付 Payment',
      label: '支付密钥',
      ok: paymentFields.length > 0 && missing(env, paymentFields).length === 0,
      action: '沙盒支付需完成 PAYMENT_SANDBOX_VERIFIED；真实支付需配置对应商户号、密钥和回调密钥。',
      missingFields:
        paymentFields.length > 0 ? missing(env, paymentFields) : ['PAYMENT_PROVIDER'],
    }),
    readinessItem({
      id: 'content-safety',
      area: '合规 Safety',
      label: '内容安全策略',
      ok: localSafetyReady || externalSafetyReady,
      action: '启用 CONTENT_SAFETY_PROVIDER=local-rules 并完成本地策略验收，或接入内容审核服务并配置 CONTENT_SAFETY_API_KEY。',
      missingFields: [
        ...(localSafetyReady || externalSafetyReady ? [] : ['CONTENT_SAFETY_PROVIDER']),
        ...(safetyProvider === 'local-rules' && env.CONTENT_SAFETY_POLICY_READY !== 'true'
          ? ['CONTENT_SAFETY_POLICY_READY']
          : []),
        ...(safetyProvider !== 'manual' && safetyProvider !== 'local-rules'
          ? missing(env, ['CONTENT_SAFETY_API_KEY'])
          : []),
      ],
    }),
    readinessItem({
      id: 'deployment-url',
      area: '部署 Deploy',
      label: '公网 HTTPS 应用地址',
      ok: has(env, 'APP_BASE_URL') && !isLocalUrl(appBaseUrl),
      action: '部署后把 APP_BASE_URL 设置为 HTTPS 公网域名。',
      missingFields: has(env, 'APP_BASE_URL') && !isLocalUrl(appBaseUrl) ? [] : ['APP_BASE_URL'],
    }),
  ]

  return {
    status: items.every((item) => item.ok) ? 'pass' : 'blocked',
    passed: items.filter((item) => item.ok).length,
    total: items.length,
    items,
    missing: items.filter((item) => !item.ok),
  }
}

export function formatProductionReadinessReport(readiness) {
  const grouped = readiness.items.reduce((result, item) => {
    if (!result[item.area]) result[item.area] = []
    result[item.area].push(item)
    return result
  }, {})
  const lines = [
    'PlayDrama 商用环境体检 / Production readiness',
    `Result: ${readiness.status === 'pass' ? 'PASS' : 'BLOCKED'} (${readiness.passed}/${readiness.total})`,
    '',
  ]

  for (const [area, items] of Object.entries(grouped)) {
    lines.push(`[${area}]`)
    for (const item of items) {
      const mark = item.ok ? 'PASS' : 'TODO'
      const fields =
        item.missingFields.length > 0 ? ` Missing: ${item.missingFields.join(', ')}` : ''
      const action = item.ok ? '' : ` Action: ${item.action}`
      lines.push(`${mark} ${item.label}.${fields}${action}`)
    }
    lines.push('')
  }

  lines.push(
    readiness.status === 'pass'
      ? 'Summary: 核心商用环境变量已经齐备。仍需完成真实业务冒烟测试和小流量灰度。'
      : 'Summary: 当前环境还不能标记为正式商用。按 TODO 补齐后重新运行 npm run prod:verify。',
  )

  return lines.join('\n')
}
