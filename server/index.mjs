import http from 'node:http'
import { spawn, spawnSync } from 'node:child_process'
import {
  createDecipheriv,
  createHash,
  createHmac,
  createSign,
  createVerify,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import './load-env.mjs'
import { evaluateProductionReadiness } from './readiness.mjs'

const PORT = Number(process.env.PORT || 8787)
const HOST = process.env.HOST || '127.0.0.1'
const serverDir = dirname(fileURLToPath(import.meta.url))
const FRONTEND_DIST_DIR = process.env.FRONTEND_DIST_DIR || join(process.cwd(), 'dist')

function firstEnv(...names) {
  for (const name of names) {
    const value = process.env[name]
    if (value && String(value).trim()) {
      return String(value).trim()
    }
  }
  return ''
}

function defaultJsonDatabasePath() {
  const moduleRelativePath = join(serverDir, 'data', 'playdrama-db.json')
  const workspaceRelativePath = join(process.cwd(), 'server', 'data', 'playdrama-db.json')

  return existsSync(moduleRelativePath) ? moduleRelativePath : workspaceRelativePath
}

const DB_PATH = process.env.PLAYDRAMA_DB_PATH || defaultJsonDatabasePath()
const STORAGE_DRIVER = process.env.PLAYDRAMA_STORAGE_DRIVER || 'json'
const NETLIFY_DATABASE_CONFIGURED = process.env.NETLIFY_DATABASE_READY === 'true'
const DATABASE_URL_CONFIGURED = Boolean(
  process.env.PLAYDRAMA_DATABASE_URL || process.env.DATABASE_URL,
)
const POSTGRES_CONFIGURED = DATABASE_URL_CONFIGURED || NETLIFY_DATABASE_CONFIGURED
const AUTH_PROVIDER = process.env.AUTH_PROVIDER || 'local-demo'
const AUTH_SESSION_SECRET = process.env.AUTH_SESSION_SECRET || ''
const AUTH_TRUSTED_IDENTITY_SECRET = process.env.AUTH_TRUSTED_IDENTITY_SECRET || ''
const AUTH_EMAIL_CODE_READY = process.env.AUTH_EMAIL_CODE_READY === 'true'
const AUTH_EMAIL_CODE_TTL_MINUTES = Number(process.env.AUTH_EMAIL_CODE_TTL_MINUTES || 10)
const AUTH_EMAIL_CODE_DEV_REVEAL = process.env.AUTH_EMAIL_CODE_DEV_REVEAL === 'true'
const AUTH_SMS_CODE_READY = process.env.AUTH_SMS_CODE_READY === 'true'
const AUTH_SMS_CODE_TTL_MINUTES = Number(process.env.AUTH_SMS_CODE_TTL_MINUTES || 10)
const AUTH_SMS_CODE_DEV_REVEAL = process.env.AUTH_SMS_CODE_DEV_REVEAL === 'true'
const AUTH_SESSION_TTL_DAYS = Number(process.env.AUTH_SESSION_TTL_DAYS || 30)
const SUPPORTED_AUTH_PROVIDERS = [
  'local-demo',
  'email-code',
  'sms-code',
  'netlify-identity',
  'trusted-identity',
  'supabase',
  'authjs',
  'wechat',
  'github',
]
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://127.0.0.1:5177'
const AI_PROVIDER = process.env.AI_PROVIDER || 'stub'
const AI_MODEL_NAME = process.env.AI_MODEL_NAME || ''
const QWEN_API_KEY = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || ''
const QWEN_BASE_URL =
  (process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1')
    .replace(/\/+$/, '')
const AI_REQUEST_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS || 45_000)
const AI_PRICE_CURRENCY = process.env.AI_PRICE_CURRENCY || 'USD'
const AI_INPUT_PRICE_PER_MILLION = Number(
  process.env.AI_INPUT_PRICE_PER_MILLION ||
    (AI_PROVIDER === 'qwen' && (AI_MODEL_NAME || 'qwen-plus').startsWith('qwen-plus')
      ? 0.115
      : 0),
)
const AI_OUTPUT_PRICE_PER_MILLION = Number(
  process.env.AI_OUTPUT_PRICE_PER_MILLION ||
    (AI_PROVIDER === 'qwen' && (AI_MODEL_NAME || 'qwen-plus').startsWith('qwen-plus')
      ? 0.287
      : 0),
)
const VIDEO_PROVIDER = process.env.VIDEO_PROVIDER || 'stub'
const VIDEO_MODEL_NAME = process.env.VIDEO_MODEL_NAME || ''
const VIDEO_REQUEST_TIMEOUT_MS = Number(process.env.VIDEO_REQUEST_TIMEOUT_MS || 60_000)
const VIDEO_LIVE_SUBMIT_LIMIT = Math.max(1, Number(process.env.VIDEO_LIVE_SUBMIT_LIMIT || 1))
const VIDEO_PROMPT_BATCH_LIMIT = Math.max(1, Number(process.env.VIDEO_PROMPT_BATCH_LIMIT || 12))
const FINAL_VIDEO_RENDER_OUTPUT_DIR =
  process.env.FINAL_VIDEO_RENDER_OUTPUT_DIR ||
  join(process.env.PLAYDRAMA_DATA_DIR || dirname(DB_PATH), 'final-video-renders')
const FINAL_VIDEO_RENDER_TIMEOUT_MS = Number(process.env.FINAL_VIDEO_RENDER_TIMEOUT_MS || 10 * 60_000)
const FINAL_VIDEO_RENDER_MAX_CLIPS = Math.max(1, Number(process.env.FINAL_VIDEO_RENDER_MAX_CLIPS || 30))
const FFMPEG_BIN = process.env.FFMPEG_PATH || 'ffmpeg'
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || QWEN_API_KEY
const DASHSCOPE_BASE_URL =
  (process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com').replace(/\/+$/, '')
const DASHSCOPE_VIDEO_MODEL = process.env.DASHSCOPE_VIDEO_MODEL || 'wan2.7-t2v-2026-04-25'
const DASHSCOPE_VIDEO_RESOLUTION = process.env.DASHSCOPE_VIDEO_RESOLUTION || '720P'
const MINIMAX_API_KEY = firstEnv('MINIMAX_API_KEY', 'HAILUO_API_KEY')
const MINIMAX_BASE_URL =
  (process.env.MINIMAX_BASE_URL || 'https://api.minimax.io').replace(/\/+$/, '')
const MINIMAX_VIDEO_MODEL = process.env.MINIMAX_VIDEO_MODEL || 'video-01'
const VIDU_API_KEY = process.env.VIDU_API_KEY || ''
const VIDU_BASE_URL = (process.env.VIDU_BASE_URL || 'https://api.vidu.com').replace(/\/+$/, '')
const VIDU_VIDEO_MODEL = process.env.VIDU_VIDEO_MODEL || 'vidu2.0'
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY || ''
const RUNWAY_BASE_URL = (process.env.RUNWAY_BASE_URL || 'https://api.dev.runwayml.com').replace(/\/+$/, '')
const RUNWAY_VIDEO_MODEL = process.env.RUNWAY_VIDEO_MODEL || 'gen4.5'
const KLING_API_KEY = firstEnv('KLING_API_KEY', 'KWAI_KLING_API_KEY')
const KLING_BASE_URL = (process.env.KLING_BASE_URL || '').replace(/\/+$/, '')
const VEO_API_KEY = firstEnv('VEO_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY')
const PAYMENT_PROVIDER = process.env.PAYMENT_PROVIDER || 'disabled'
const PAYMENT_CURRENCY = process.env.PAYMENT_CURRENCY || 'CNY'
const PAYMENT_RETURN_URL = process.env.PAYMENT_RETURN_URL || APP_BASE_URL
const ALIPAY_GATEWAY =
  (process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do').replace(/\/+$/, '')
const ALIPAY_APP_ID = process.env.ALIPAY_APP_ID || ''
const ALIPAY_PRIVATE_KEY = process.env.ALIPAY_PRIVATE_KEY || ''
const ALIPAY_PUBLIC_KEY = process.env.ALIPAY_PUBLIC_KEY || ''
const ALIPAY_NOTIFY_URL =
  process.env.ALIPAY_NOTIFY_URL || `${APP_BASE_URL.replace(/\/+$/, '')}/api/payment/callbacks/alipay`
const ALIPAY_RETURN_URL = process.env.ALIPAY_RETURN_URL || PAYMENT_RETURN_URL
const ALIPAY_RECONCILE_SECRET = process.env.ALIPAY_RECONCILE_SECRET || ''
const ALIPAY_SELLER_ID = firstEnv('ALIPAY_SELLER_ID', 'ALIPAY_PID')
const WECHAT_PAY_MCH_ID = firstEnv('WECHAT_PAY_MCH_ID', 'WECHAT_MCH_ID')
const WECHAT_PAY_APP_ID = firstEnv('WECHAT_PAY_APP_ID', 'WECHAT_APP_ID')
const WECHAT_PAY_API_V3_KEY = firstEnv('WECHAT_PAY_API_V3_KEY', 'WECHAT_API_V3_KEY')
const WECHAT_PAY_SERIAL_NO = firstEnv('WECHAT_PAY_SERIAL_NO', 'WECHAT_MERCHANT_SERIAL_NO')
const WECHAT_PAY_NOTIFY_URL =
  firstEnv('WECHAT_PAY_NOTIFY_URL', 'WECHAT_NOTIFY_URL') ||
  `${APP_BASE_URL.replace(/\/+$/, '')}/api/payment/callbacks/wechat`
const WECHAT_PAY_PRIVATE_KEY =
  process.env.WECHAT_PAY_PRIVATE_KEY || process.env.WECHAT_MERCHANT_PRIVATE_KEY || ''
const WECHAT_PAY_PRIVATE_KEY_PATH =
  firstEnv('WECHAT_PAY_PRIVATE_KEY_PATH', 'WECHAT_PAY_MERCHANT_PRIVATE_KEY_PATH')
const WECHAT_PAY_PLATFORM_PUBLIC_KEY =
  firstEnv('WECHAT_PAY_PLATFORM_PUBLIC_KEY', 'WECHAT_PLATFORM_PUBLIC_KEY')
const WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH =
  firstEnv('WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH', 'WECHAT_PLATFORM_PUBLIC_KEY_PATH')
const WECHAT_PAY_PLATFORM_PUBLIC_KEY_ID =
  firstEnv('WECHAT_PAY_PLATFORM_PUBLIC_KEY_ID', 'WECHAT_PLATFORM_PUBLIC_KEY_ID')
const DOUYIN_OPEN_BASE_URL =
  (process.env.DOUYIN_OPEN_BASE_URL || 'https://open.douyin.com').replace(/\/+$/, '')
const DOUYIN_CLIENT_KEY = process.env.DOUYIN_CLIENT_KEY || process.env.DOUYIN_APP_ID || ''
const DOUYIN_CLIENT_SECRET = process.env.DOUYIN_CLIENT_SECRET || ''
const DOUYIN_ACCESS_TOKEN = process.env.DOUYIN_ACCESS_TOKEN || ''
const DOUYIN_OPEN_ID = process.env.DOUYIN_OPEN_ID || ''
const DOUYIN_MINI_APP_ID = process.env.DOUYIN_MINI_APP_ID || process.env.DOUYIN_MICRO_APP_ID || ''
const WECHAT_MINI_APP_ID = process.env.WECHAT_MINI_APP_ID || process.env.WECHAT_APP_ID || ''
const WECHAT_MINI_ORIGINAL_ID = process.env.WECHAT_MINI_ORIGINAL_ID || ''
const MINI_PROGRAM_WEBVIEW_DOMAIN_READY =
  process.env.MINI_PROGRAM_WEBVIEW_DOMAIN_READY === 'true' ||
  process.env.WECHAT_MINI_WEBVIEW_DOMAIN_READY === 'true' ||
  process.env.DOUYIN_MINI_WEBVIEW_DOMAIN_READY === 'true'
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'log'
const EMAIL_WEBHOOK_URL = process.env.EMAIL_WEBHOOK_URL || ''
const PLAYDRAMA_LEAD_NOTIFY_EMAIL =
  process.env.PLAYDRAMA_LEAD_NOTIFY_EMAIL || process.env.ALIYUN_DM_LIVE_TEST_EMAIL || ''
const EMAIL_API_KEY_CONFIGURED = Boolean(process.env.EMAIL_API_KEY)
const EMAIL_CALLBACK_SECRET = process.env.EMAIL_CALLBACK_SECRET || ''
const EMAIL_CALLBACK_SIGNATURE_MODE = process.env.EMAIL_CALLBACK_SIGNATURE_MODE || 'bearer'
const SMS_PROVIDER = process.env.SMS_PROVIDER || 'log'
const TENCENT_SMS_ENDPOINT = process.env.TENCENT_SMS_ENDPOINT || 'sms.tencentcloudapi.com'
const TENCENT_SMS_REGION = process.env.TENCENT_SMS_REGION || 'ap-guangzhou'
const TENCENT_SMS_VERSION = process.env.TENCENT_SMS_VERSION || '2021-01-11'
const TENCENT_SMS_SDK_APP_ID = process.env.TENCENT_SMS_SDK_APP_ID || ''
const TENCENT_SMS_SIGN_NAME = process.env.TENCENT_SMS_SIGN_NAME || ''
const TENCENT_SMS_TEMPLATE_ID = process.env.TENCENT_SMS_TEMPLATE_ID || ''
const TENCENT_SMS_TEMPLATE_PARAMS =
  (process.env.TENCENT_SMS_TEMPLATE_PARAMS || 'code,ttlMinutes')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
const TENCENT_SMS_EXTEND_CODE = process.env.TENCENT_SMS_EXTEND_CODE || ''
const TENCENT_SMS_SENDER_ID = process.env.TENCENT_SMS_SENDER_ID || ''
const TENCENT_SMS_DRY_RUN = process.env.TENCENT_SMS_DRY_RUN === 'true'
const TENCENT_SMS_REQUEST_TIMEOUT_MS = Number(process.env.TENCENT_SMS_REQUEST_TIMEOUT_MS || 8_000)
const TENCENT_SES_ENDPOINT = process.env.TENCENT_SES_ENDPOINT || 'ses.tencentcloudapi.com'
const TENCENT_SES_REGION = process.env.TENCENT_SES_REGION || 'ap-guangzhou'
const TENCENT_SES_VERSION = '2020-10-02'
const TENCENT_SES_FROM_EMAIL = process.env.TENCENT_SES_FROM_EMAIL || ''
const TENCENT_SES_REPLY_TO = process.env.TENCENT_SES_REPLY_TO || ''
const TENCENT_SES_TEMPLATE_ID = process.env.TENCENT_SES_TEMPLATE_ID || ''
const TENCENT_SES_DRY_RUN = process.env.TENCENT_SES_DRY_RUN === 'true'
const TENCENTCLOUD_SECRET_ID_CONFIGURED = Boolean(process.env.TENCENTCLOUD_SECRET_ID)
const TENCENTCLOUD_SECRET_KEY_CONFIGURED = Boolean(process.env.TENCENTCLOUD_SECRET_KEY)
const ALIYUN_DM_ENDPOINT =
  (process.env.ALIYUN_DM_ENDPOINT || 'https://dm.aliyuncs.com').replace(/\/+$/, '')
const ALIYUN_DM_REGION = process.env.ALIYUN_DM_REGION || 'cn-hangzhou'
const ALIYUN_DM_ACCOUNT_NAME = process.env.ALIYUN_DM_ACCOUNT_NAME || ''
const ALIYUN_DM_FROM_ALIAS = process.env.ALIYUN_DM_FROM_ALIAS || 'PlayDrama Studio'
const ALIYUN_DM_TAG_NAME = process.env.ALIYUN_DM_TAG_NAME || ''
const ALIYUN_DM_ADDRESS_TYPE = process.env.ALIYUN_DM_ADDRESS_TYPE || '1'
const ALIYUN_DM_REPLY_TO_ADDRESS = process.env.ALIYUN_DM_REPLY_TO_ADDRESS || 'true'
const ALIYUN_DM_DRY_RUN = process.env.ALIYUN_DM_DRY_RUN === 'true'
const ALIYUN_ACCESS_KEY_ID_CONFIGURED = Boolean(process.env.ALIYUN_ACCESS_KEY_ID)
const ALIYUN_ACCESS_KEY_SECRET_CONFIGURED = Boolean(process.env.ALIYUN_ACCESS_KEY_SECRET)
const INVITE_EXPIRES_DAYS = Number(process.env.INVITE_EXPIRES_DAYS || 7)
const EMAIL_DELIVERY_STATUSES = ['logged', 'queued', 'sent', 'failed', 'bounced']
const CONTENT_SAFETY_PROVIDER = process.env.CONTENT_SAFETY_PROVIDER || 'manual'
const CONTENT_SAFETY_POLICY_VERSION =
  process.env.CONTENT_SAFETY_POLICY_VERSION || 'local-rules-v1'
let pgPool = null

const now = () => new Date().toISOString()
const addDays = (date, days) => new Date(date.getTime() + days * 86_400_000).toISOString()

const STATIC_CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
}

const LEGAL_PAGES = {
  '/privacy': {
    title: '隐私政策',
    updatedAt: '2026-05-29',
    summary:
      '本政策说明 PlayDrama Studio 在账号登录、互动短剧创作、AI 生成、发布、支付和数据分析过程中如何收集、使用、保存和保护信息。',
    sections: [
      {
        heading: '我们收集的信息',
        items: [
          '账号信息：手机号、登录会话、工作区成员关系和操作审计记录。',
          '创作信息：项目标题、剧情节点、角色、变量、发布配置、AI 生成输入和生成结果。',
          '使用数据：播放、选择、付费入口、结局解锁、发布和分析事件。',
          '支付信息：订单号、金额、状态、支付供应商、回调结果和解锁范围；平台不保存银行卡号或支付密码。',
          '设备和网络信息：必要的请求时间、浏览器信息、IP 片段和安全日志，用于风控、排障和反滥用。',
        ],
      },
      {
        heading: '我们如何使用信息',
        items: [
          '提供登录、创作、AI 生成、发布、播放、付费解锁和数据分析功能。',
          '记录模型调用成本、生成任务状态、内容安全扫描结果和发布版本。',
          '处理订单、回调、退款核对、客服排障和安全审计。',
          '改进产品体验、稳定性和内容安全策略。',
        ],
      },
      {
        heading: '共享和委托处理',
        items: [
          '我们会在必要范围内调用短信、邮件、AI 模型、支付、云数据库和云服务器供应商。',
          '供应商仅用于完成对应服务，不应将数据用于与 PlayDrama Studio 无关的目的。',
          '除法律法规、监管要求、用户授权或服务必要场景外，不会出售个人信息。',
        ],
      },
      {
        heading: '保存、删除和权利',
        items: [
          '创作和订单数据会按业务、审计、合规和争议处理需要保存。',
          '用户可要求导出、修改或删除账号及项目数据；涉及订单、审计和法律留存的数据会按法规处理。',
          '投诉、侵权、隐私请求可通过侵权投诉页面提交，我们会在合理期限内处理。',
        ],
      },
    ],
  },
  '/terms': {
    title: '用户协议',
    updatedAt: '2026-05-29',
    summary:
      '本协议适用于使用 PlayDrama Studio 进行互动短剧创作、AI 生成、发布、播放、数据分析和商业化变现的用户。',
    sections: [
      {
        heading: '账号和使用资格',
        items: [
          '用户应使用真实、合法、可联系的手机号或其他认证方式注册和登录。',
          '用户应妥善保管账号和团队权限，对账号下的创作、发布和商业化行为负责。',
          '不得以攻击、爬取、绕过权限、刷量、恶意下单或干扰服务稳定性的方式使用平台。',
        ],
      },
      {
        heading: '创作内容和权利',
        items: [
          '用户应确保上传、输入、生成、编辑和发布的剧情、角色、素材、文案和音视频不侵犯他人权利。',
          'AI 生成内容需要由用户自行审核后再发布；平台提供辅助生成和安全扫描，不替代用户的最终责任。',
          '用户保留其合法拥有的内容权利，并授权平台为提供服务进行必要的存储、处理、展示和分发。',
        ],
      },
      {
        heading: '付费和订单',
        items: [
          '付费结局、隐藏分支、会员权益或其他商品应清晰展示价格、解锁范围和支付状态。',
          '支付成功以支付供应商回调和平台订单状态为准；异常订单会进入人工核对或退款处理。',
          '不得诱导未成年人非理性消费，不得设置欺诈性、误导性或无法交付的付费内容。',
        ],
      },
      {
        heading: '服务变更和责任限制',
        items: [
          '平台会持续改进 AI 生成、发布、支付和分发能力，可能调整功能、模型、价格或策略。',
          '因第三方供应商、网络、支付通道、监管要求或不可抗力导致的延迟和中断，平台会尽力恢复并降低影响。',
          '对于违法违规、侵权、欺诈、滥用或高风险内容，平台可限制生成、暂停发布、下架内容或冻结相关能力。',
        ],
      },
    ],
  },
  '/content-policy': {
    title: '内容规范与 AI 生成说明',
    updatedAt: '2026-05-29',
    summary:
      'PlayDrama Studio 面向互动短剧创作。用户发布前必须对 AI 生成内容、付费内容和分发素材进行人工审核。',
    sections: [
      {
        heading: '禁止内容',
        items: [
          '违法犯罪、诈骗、洗钱、赌博引流、毒品交易、暴力恐怖或规避监管的内容。',
          '未成年人色情、性剥削、露骨色情交易、性侵细节、自残自杀教程或极端血腥虐杀内容。',
          '侵犯著作权、肖像权、名誉权、隐私权、商标权或其他合法权益的内容。',
          '虚假宣传、诱导支付、刷量作弊、恶意收集个人信息或无法兑现的付费承诺。',
        ],
      },
      {
        heading: '需要谨慎处理的内容',
        items: [
          '悬疑、犯罪、医疗、校园、家庭伦理和情感冲突题材应避免具体违法教程和过度细节。',
          '真人原型、公众人物、品牌、机构和真实案件改编需要确认授权、事实依据和风险边界。',
          '付费结局和隐藏分支需要明确价格、权益和解锁范围，不得制造误导。',
        ],
      },
      {
        heading: 'AI 生成说明',
        items: [
          'AI 生成结果可能存在事实错误、重复、偏见、侵权风险或不适合发布的表达。',
          '平台会记录模型供应商、模型名称、token、成本估算、任务状态和生成摘要，用于成本核算和安全审计。',
          '用户应在发布前完成剧情、角色、台词、素材、付费点和分发文案的人工复核。',
        ],
      },
      {
        heading: '处理措施',
        items: [
          '平台可对疑似违规内容进行拦截、标记复核、限制发布、下架、暂停账号或配合监管处理。',
          '对侵权或合规投诉，平台会基于证据材料进行核查，并可能要求用户补充授权或删除内容。',
        ],
      },
    ],
  },
  '/complaint': {
    title: '侵权投诉与合规反馈',
    updatedAt: '2026-05-29',
    summary:
      '如果你认为平台上的内容侵犯了你的权利，或发现违法违规、未成年人保护、支付误导、隐私泄露等问题，可以提交投诉材料。',
    sections: [
      {
        heading: '投诉材料',
        items: [
          '权利人或代理人的姓名、联系方式、身份证明或授权证明。',
          '被投诉内容的链接、项目名称、截图、订单号或可定位线索。',
          '权利归属证明、侵权说明、违法违规说明或支付争议说明。',
          '投诉人保证材料真实、合法、有效，并愿意承担虚假投诉产生的责任。',
        ],
      },
      {
        heading: '处理流程',
        items: [
          '平台收到完整材料后会进行初步核查，必要时限制内容展示或要求创作者补充说明。',
          '被投诉方可提交不侵权声明、授权证明、修改说明或其他抗辩材料。',
          '平台会根据证据、法律法规、平台规则和风险程度采取保留、修改、限制、下架或账号处理等措施。',
        ],
      },
      {
        heading: '提交方式',
        items: [
          '当前内测阶段可通过平台合作/反馈入口提交投诉或合规反馈。',
          '请在材料中注明“侵权投诉”或“合规反馈”，并留下可联系的手机号或邮箱。',
          '涉及支付争议时，请提供支付时间、金额、订单号、解锁内容和问题描述。',
        ],
      },
      {
        heading: '紧急情形',
        items: [
          '涉及未成年人安全、人身危险、诈骗、违法犯罪或大规模隐私泄露的线索，请同时向相关监管或执法机构报告。',
          '平台会在能力范围内优先处理高风险投诉。',
        ],
      },
    ],
  },
}

function isPathInside(parent, child) {
  const childRelativePath = relative(parent, child)
  return childRelativePath && !childRelativePath.startsWith('..') && !isAbsolute(childRelativePath)
}

function frontendFileForPath(pathname) {
  if (!existsSync(FRONTEND_DIST_DIR)) return null

  let decodedPathname
  try {
    decodedPathname = decodeURIComponent(pathname)
  } catch {
    decodedPathname = '/'
  }

  const cleanPath = decodedPathname.split('/').filter(Boolean).join('/')
  const requestedPath = cleanPath ? resolve(FRONTEND_DIST_DIR, cleanPath) : null
  const indexPath = resolve(FRONTEND_DIST_DIR, 'index.html')

  if (requestedPath && isPathInside(FRONTEND_DIST_DIR, requestedPath)) {
    try {
      if (existsSync(requestedPath) && statSync(requestedPath).isFile()) {
        return requestedPath
      }
    } catch {
      return null
    }
  }

  return existsSync(indexPath) ? indexPath : null
}

function sendFrontendAsset(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return false

  const filePath = frontendFileForPath(url.pathname)
  if (!filePath) return false

  const relativeFilePath = relative(FRONTEND_DIST_DIR, filePath)
  const isImmutableAsset = relativeFilePath.split(sep)[0] === 'assets'
  const body = req.method === 'HEAD' ? null : readFileSync(filePath)

  res.writeHead(200, {
    'content-type': STATIC_CONTENT_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream',
    'cache-control': isImmutableAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
    'x-content-type-options': 'nosniff',
  })
  res.end(body || '')
  return true
}

const user = {
  id: 'usr_001',
  displayName: 'Creator',
  email: 'creator@example.com',
  role: 'owner',
  avatarInitials: 'CR',
  createdAt: now(),
}

let activeUserId = process.env.PLAYDRAMA_DEMO_USER_ID || user.id
const localSessions = new Map()

const workspace = {
  id: 'wks_001',
  name: 'Creator Studio',
  plan: 'creator',
  ownerUserId: user.id,
  createdAt: now(),
}

const defaultMembership = {
  id: 'mem_001',
  userId: user.id,
  workspaceId: workspace.id,
  role: 'owner',
  permissions: [
    'project:read',
    'project:write',
    'project:publish',
    'analytics:read',
    'member:manage',
  ],
  joinedAt: now(),
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

const domesticProviders = [
  {
    id: 'deepseek',
    displayName: 'DeepSeek',
    market: 'china',
    capabilities: ['text'],
  },
  {
    id: 'qwen',
    displayName: '通义千问',
    market: 'china',
    capabilities: ['text', 'image'],
  },
  {
    id: 'doubao',
    displayName: '豆包',
    market: 'china',
    capabilities: ['text', 'voice'],
  },
  {
    id: 'zhipu',
    displayName: '智谱 GLM',
    market: 'china',
    capabilities: ['text'],
  },
]

const videoProviderRecommendations = [
  {
    id: 'dashscope',
    displayName: '阿里云百炼 / 通义万相',
    market: 'china',
    priority: 1,
    configured: Boolean(DASHSCOPE_API_KEY),
    defaultModel: DASHSCOPE_VIDEO_MODEL,
    capabilities: ['text-to-video', 'multi-shot', 'audio', 'prompt-extend'],
    fit: '和通义千问共用百炼 API Key，适合国内互动短剧分镜到视频闭环。',
    requiredEnv: ['VIDEO_PROVIDER=dashscope', 'DASHSCOPE_API_KEY or QWEN_API_KEY'],
  },
  {
    id: 'minimax',
    displayName: 'MiniMax / Hailuo',
    market: 'china',
    priority: 2,
    configured: Boolean(MINIMAX_API_KEY),
    defaultModel: MINIMAX_VIDEO_MODEL,
    capabilities: ['text-to-video', 'image-to-video', 'subject-reference'],
    fit: '国内短剧逐镜头生产优先，适合 9:16 片段队列。',
    requiredEnv: ['VIDEO_PROVIDER=minimax', 'MINIMAX_API_KEY'],
  },
  {
    id: 'vidu',
    displayName: 'Vidu',
    market: 'china',
    priority: 3,
    configured: Boolean(VIDU_API_KEY),
    defaultModel: VIDU_VIDEO_MODEL,
    capabilities: ['text-to-video', 'image-to-video', 'reference-to-video', 'tts'],
    fit: '角色/场景参考和短剧镜头队列备选。',
    requiredEnv: ['VIDEO_PROVIDER=vidu', 'VIDU_API_KEY'],
  },
  {
    id: 'runway',
    displayName: 'Runway',
    market: 'global',
    priority: 4,
    configured: Boolean(RUNWAY_API_KEY),
    defaultModel: RUNWAY_VIDEO_MODEL,
    capabilities: ['text-to-video', 'image-to-video', 'reference-to-video', 'high-quality-shot'],
    fit: '海外高质量镜头和关键镜头重渲染。',
    requiredEnv: ['VIDEO_PROVIDER=runway', 'RUNWAY_API_KEY'],
  },
  {
    id: 'kling',
    displayName: 'Kling',
    market: 'china-global',
    priority: 5,
    configured: Boolean(KLING_API_KEY && KLING_BASE_URL),
    defaultModel: process.env.KLING_VIDEO_MODEL || 'kling-video',
    capabilities: ['text-to-video', 'image-to-video', 'motion-control'],
    fit: '可灵 API 权限开通后作为高质量视频供应商。',
    requiredEnv: ['VIDEO_PROVIDER=kling', 'KLING_API_KEY', 'KLING_BASE_URL'],
  },
  {
    id: 'veo',
    displayName: 'Google Veo',
    market: 'global',
    priority: 6,
    configured: Boolean(VEO_API_KEY),
    defaultModel: process.env.VEO_VIDEO_MODEL || 'veo',
    capabilities: ['text-to-video', 'audio-video'],
    fit: '海外高质量音画能力，受账号和地区可用性影响。',
    requiredEnv: ['VIDEO_PROVIDER=veo', 'VEO_API_KEY or GEMINI_API_KEY'],
  },
]

const emailProviderRecommendations = [
  {
    id: 'aliyun-directmail',
    displayName: 'Aliyun DirectMail',
    market: 'china',
    priority: 1,
    fit: 'Aliyun-first production email',
    requiredEnv: [
      'EMAIL_PROVIDER',
      'ALIYUN_ACCESS_KEY_ID',
      'ALIYUN_ACCESS_KEY_SECRET',
      'ALIYUN_DM_ACCOUNT_NAME',
      'EMAIL_CALLBACK_SECRET',
    ],
    callbackMode: 'hmac-sha256',
    notes: 'Primary provider for the current Aliyun stack.',
  },
  {
    id: 'tencent-ses',
    displayName: 'Tencent SES',
    market: 'china',
    priority: 2,
    fit: 'China production backup',
    requiredEnv: [
      'EMAIL_PROVIDER',
      'TENCENTCLOUD_SECRET_ID',
      'TENCENTCLOUD_SECRET_KEY',
      'TENCENT_SES_FROM_EMAIL',
      'EMAIL_CALLBACK_SECRET',
    ],
    callbackMode: 'hmac-sha256',
    notes: 'Backup provider when Tencent Cloud resources are available.',
  },
  {
    id: 'resend',
    displayName: 'Resend',
    market: 'global',
    priority: 3,
    fit: 'Global developer testing',
    requiredEnv: ['EMAIL_PROVIDER', 'EMAIL_WEBHOOK_URL', 'EMAIL_API_KEY', 'EMAIL_CALLBACK_SECRET'],
    callbackMode: 'hmac-sha256',
    notes: 'Useful for global delivery tests and simple API ergonomics.',
  },
  {
    id: 'sendgrid',
    displayName: 'SendGrid',
    market: 'global',
    priority: 4,
    fit: 'Global scaled email',
    requiredEnv: ['EMAIL_PROVIDER', 'EMAIL_WEBHOOK_URL', 'EMAIL_API_KEY', 'EMAIL_CALLBACK_SECRET'],
    callbackMode: 'hmac-sha256',
    notes: 'Useful when advanced analytics, templates, and marketing email are needed.',
  },
]

function normalizeDatabase(data) {
  return {
    users: Array.isArray(data.users) ? data.users : [user],
    workspaces: Array.isArray(data.workspaces) ? data.workspaces : [workspace],
    memberships: Array.isArray(data.memberships)
      ? data.memberships
      : [defaultMembership],
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
    videoGenerationJobs: Array.isArray(data.videoGenerationJobs)
      ? data.videoGenerationJobs
      : [],
    finalVideoRenders: Array.isArray(data.finalVideoRenders)
      ? data.finalVideoRenders
      : [],
    canvasAssets: Array.isArray(data.canvasAssets) ? data.canvasAssets : [],
    canvasNodeRuns: Array.isArray(data.canvasNodeRuns) ? data.canvasNodeRuns : [],
    canvasWorkflowRuns: Array.isArray(data.canvasWorkflowRuns) ? data.canvasWorkflowRuns : [],
    auditLog: Array.isArray(data.auditLog) ? data.auditLog : [],
    inviteEmailDeliveries: Array.isArray(data.inviteEmailDeliveries)
      ? data.inviteEmailDeliveries
      : [],
    marketingLeads: Array.isArray(data.marketingLeads) ? data.marketingLeads : [],
    authEmailCodes: Array.isArray(data.authEmailCodes) ? data.authEmailCodes : [],
    authSmsCodes: Array.isArray(data.authSmsCodes) ? data.authSmsCodes : [],
    authSessions: Array.isArray(data.authSessions) ? data.authSessions : [],
  }
}

function defaultDatabase() {
  return normalizeDatabase({})
}

async function getPostgresConnectionString() {
  if (process.env.PLAYDRAMA_DATABASE_URL) {
    return process.env.PLAYDRAMA_DATABASE_URL
  }

  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }

  if (NETLIFY_DATABASE_CONFIGURED) {
    const { getConnectionString } = await import('@netlify/database')
    return getConnectionString()
  }

  throw new Error(
    'DATABASE_URL or NETLIFY_DATABASE_READY=true is required when PLAYDRAMA_STORAGE_DRIVER=postgres',
  )
}

async function getPgPool() {
  if (pgPool) return pgPool

  const pg = await import('pg')
  const Pool = pg.Pool || pg.default.Pool
  pgPool = new Pool({
    connectionString: await getPostgresConnectionString(),
  })
  return pgPool
}

async function loadPostgresDatabase() {
  const pool = await getPgPool()
  await ensureAiGenerationJobsTable()
  await ensureFinalVideoRendersTable()
  await ensureCanvasRuntimeTables()
  const [
    usersResult,
    workspacesResult,
    membershipsResult,
    projectsResult,
    buildsResult,
    eventsResult,
    aiUsageResult,
    aiGenerationJobsResult,
    contentSafetyReviewsResult,
    paymentOrdersResult,
    distributionJobsResult,
    videoGenerationJobsResult,
    finalVideoRendersResult,
    canvasAssetsResult,
    canvasNodeRunsResult,
    canvasWorkflowRunsResult,
    auditResult,
    inviteEmailDeliveriesResult,
    authEmailCodesResult,
    authSmsCodesResult,
    authSessionsResult,
  ] = await Promise.all([
    pool.query(`
      select
        id,
        display_name as "displayName",
        email,
        phone,
        role,
        avatar_initials as "avatarInitials",
        created_at as "createdAt"
      from app_users
      order by created_at asc
    `),
    pool.query(`
      select
        id,
        name,
        plan,
        owner_user_id as "ownerUserId",
        created_at as "createdAt"
      from workspaces
      order by created_at asc
    `),
    pool.query(`
      select
        id,
        user_id as "userId",
        workspace_id as "workspaceId",
        role,
        permissions,
        status,
        joined_at as "joinedAt",
        invited_at as "invitedAt",
        invite_token as "inviteToken",
        invite_expires_at as "inviteExpiresAt",
        accepted_at as "acceptedAt"
      from workspace_memberships
      order by joined_at asc
    `),
    pool.query(`
      select
        id,
        workspace_id as "workspaceId",
        title,
        template,
        publish,
        model_routing as "modelRouting",
        nodes,
        variables,
        characters,
        lifecycle_status as "lifecycleStatus",
        archived_at as "archivedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from projects
      order by updated_at desc
    `),
    pool.query(`
      select
        id,
        project_id as "projectId",
        workspace_id as "workspaceId",
        version,
        status,
        visibility,
        runtime_url as "runtimeUrl",
        snapshot,
        content_safety as "contentSafety",
        created_at as "createdAt"
      from publish_builds
      order by created_at desc
    `),
    pool.query(`
      select
        id,
        workspace_id as "workspaceId",
        project_id as "projectId",
        build_id as "buildId",
        session_id as "sessionId",
        event_name as "eventName",
        node_id as "nodeId",
        choice_id as "choiceId",
        metadata,
        created_at as "createdAt"
      from analytics_events
      order by created_at asc
    `),
    pool.query(`
      select
        id,
        workspace_id as "workspaceId",
        project_id as "projectId",
        task,
        provider_id as "providerId",
        model,
        status,
        input_tokens as "inputTokens",
        output_tokens as "outputTokens",
        total_tokens as "totalTokens",
        estimated_cost as "estimatedCost",
        currency,
        latency_ms as "latencyMs",
        output_summary as "outputSummary",
        created_at as "createdAt"
      from ai_usage_events
      order by created_at asc
    `),
    pool.query(`
      select
        id,
        actor_user_id as "actorUserId",
        workspace_id as "workspaceId",
        project_id as "projectId",
        task,
        input,
        input_summary as "inputSummary",
        retry_of as "retryOf",
        status,
        stage,
        progress,
        message,
        error_code as "errorCode",
        error_message as "errorMessage",
        raw_error_message as "rawErrorMessage",
        output_summary as "outputSummary",
        result,
        usage_event_id as "usageEventId",
        created_at as "createdAt",
        started_at as "startedAt",
        updated_at as "updatedAt",
        completed_at as "completedAt"
      from ai_generation_jobs
      order by created_at asc
    `),
    pool.query(`
      select
        id,
        workspace_id as "workspaceId",
        project_id as "projectId",
        provider,
        policy_version as "policyVersion",
        status,
        passed,
        flag_count as "flagCount",
        blocking_count as "blockingCount",
        review_count as "reviewCount",
        notice_count as "noticeCount",
        flags,
        summary,
        created_at as "createdAt"
      from content_safety_reviews
      order by created_at asc
    `),
    pool.query(`
      select
        id,
        workspace_id as "workspaceId",
        project_id as "projectId",
        build_id as "buildId",
        user_id as "userId",
        session_id as "sessionId",
        provider,
        status,
        amount,
        currency,
        monetization,
        item_type as "itemType",
        item_id as "itemId",
        unlock_node_ids as "unlockNodeIds",
        metadata,
        paid_at as "paidAt",
        created_at as "createdAt"
      from payment_orders
      order by created_at asc
    `),
    pool.query(`
      select
        id,
        workspace_id as "workspaceId",
        project_id as "projectId",
        build_id as "buildId",
        channel,
        provider,
        status,
        title,
        caption,
        target_url as "targetUrl",
        mini_program_path as "miniProgramPath",
        external_id as "externalId",
        request,
        response,
        error_message as "errorMessage",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from distribution_jobs
      order by created_at asc
    `),
    pool.query(`
      select
        id,
        workspace_id as "workspaceId",
        project_id as "projectId",
        shot_id as "shotId",
        node_id as "nodeId",
        provider,
        model,
        status,
        prompt,
        duration,
        aspect_ratio as "aspectRatio",
        external_id as "externalId",
        output_url as "outputUrl",
        thumbnail_url as "thumbnailUrl",
        request,
        response,
        error_message as "errorMessage",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from video_generation_jobs
      order by created_at asc
    `),
    pool.query(`
      select
        id,
        workspace_id as "workspaceId",
        project_id as "projectId",
        status,
        title,
        aspect_ratio as "aspectRatio",
        clip_count as "clipCount",
        output_url as "outputUrl",
        manifest_url as "manifestUrl",
        request,
        response,
        error_message as "errorMessage",
        created_at as "createdAt",
        started_at as "startedAt",
        updated_at as "updatedAt",
        completed_at as "completedAt"
      from final_video_renders
      order by created_at asc
    `),
    pool.query(`
      select
        id,
        workspace_id as "workspaceId",
        project_id as "projectId",
        node_id as "nodeId",
        type,
        name,
        meta,
        source,
        status,
        file_name as "fileName",
        mime_type as "mimeType",
        size,
        url,
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from canvas_assets
      order by created_at asc
    `),
    pool.query(`
      select
        id,
        workspace_id as "workspaceId",
        project_id as "projectId",
        node_id as "nodeId",
        node_title as "nodeTitle",
        node_type as "nodeType",
        asset_id as "assetId",
        status,
        progress,
        message,
        output_title as "outputTitle",
        output_preview as "outputPreview",
        model,
        prompt,
        credits,
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from canvas_node_runs
      order by created_at asc
    `),
    pool.query(`
      select
        id,
        workspace_id as "workspaceId",
        project_id as "projectId",
        status,
        scope,
        start_node_id as "startNodeId",
        node_ids as "nodeIds",
        run_ids as "runIds",
        credits,
        message,
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt",
        completed_at as "completedAt"
      from canvas_workflow_runs
      order by created_at asc
    `),
    pool.query(`
      select
        id,
        user_id as "userId",
        workspace_id as "workspaceId",
        action,
        target_type as "targetType",
        target_id as "targetId",
        metadata,
        created_at as "createdAt"
      from audit_log
      order by created_at asc
    `),
    pool.query(`
      select
        id,
        workspace_id as "workspaceId",
        member_id as "memberId",
        provider,
        to_email as "to",
        subject,
        invite_url as "inviteUrl",
        role,
        status,
        provider_message_id as "providerMessageId",
        error_message as "errorMessage",
        expires_at as "expiresAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from invite_email_deliveries
      order by created_at asc
    `),
    pool.query(`
      select
        id,
        email,
        code_hash as "codeHash",
        purpose,
        status,
        attempts,
        expires_at as "expiresAt",
        consumed_at as "consumedAt",
        metadata,
        created_at as "createdAt"
      from auth_email_codes
      order by created_at asc
    `),
    pool.query(`
      select
        id,
        phone,
        code_hash as "codeHash",
        purpose,
        status,
        attempts,
        expires_at as "expiresAt",
        consumed_at as "consumedAt",
        metadata,
        created_at as "createdAt"
      from auth_sms_codes
      order by created_at asc
    `),
    pool.query(`
      select
        token_hash as "tokenHash",
        user_id as "userId",
        provider,
        expires_at as "expiresAt",
        revoked_at as "revokedAt",
        created_at as "createdAt",
        last_seen_at as "lastSeenAt"
      from auth_sessions
      order by created_at asc
    `),
  ])

  return normalizeDatabase({
    users: usersResult.rows,
    workspaces: workspacesResult.rows,
    memberships: membershipsResult.rows,
    projects: projectsResult.rows,
    builds: buildsResult.rows,
    events: eventsResult.rows,
    aiUsageEvents: aiUsageResult.rows,
    aiGenerationJobs: aiGenerationJobsResult.rows,
    contentSafetyReviews: contentSafetyReviewsResult.rows,
    paymentOrders: paymentOrdersResult.rows,
    distributionJobs: distributionJobsResult.rows,
    videoGenerationJobs: videoGenerationJobsResult.rows,
    finalVideoRenders: finalVideoRendersResult.rows,
    canvasAssets: canvasAssetsResult.rows,
    canvasNodeRuns: canvasNodeRunsResult.rows,
    canvasWorkflowRuns: canvasWorkflowRunsResult.rows,
    auditLog: auditResult.rows,
    inviteEmailDeliveries: inviteEmailDeliveriesResult.rows,
    authEmailCodes: authEmailCodesResult.rows,
    authSmsCodes: authSmsCodesResult.rows,
    authSessions: authSessionsResult.rows,
  })
}

function loadJsonDatabase() {
  try {
    const raw = readFileSync(DB_PATH, 'utf8')
    return normalizeDatabase(JSON.parse(raw))
  } catch {
    return defaultDatabase()
  }
}

async function loadDatabase() {
  if (STORAGE_DRIVER === 'postgres') {
    return loadPostgresDatabase()
  }
  return loadJsonDatabase()
}

const database = await loadDatabase()
const users = new Map(database.users.map((item) => [item.id, item]))
const workspaces = new Map(database.workspaces.map((item) => [item.id, item]))
const memberships = database.memberships
const projects = new Map(database.projects.map((project) => [project.id, project]))
const builds = new Map(database.builds.map((build) => [build.id, build]))
const events = database.events
const aiUsageEvents = database.aiUsageEvents
const aiGenerationJobs = database.aiGenerationJobs
const runningAiGenerationJobIds = new Set()
const contentSafetyReviews = database.contentSafetyReviews
const paymentOrders = database.paymentOrders
const distributionJobs = database.distributionJobs
const videoGenerationJobs = database.videoGenerationJobs
const finalVideoRenders = database.finalVideoRenders
const canvasAssets = database.canvasAssets
const canvasNodeRuns = database.canvasNodeRuns
const canvasWorkflowRuns = database.canvasWorkflowRuns
const auditLog = database.auditLog
const inviteEmailDeliveries = database.inviteEmailDeliveries
const marketingLeads = database.marketingLeads
const authEmailCodes = database.authEmailCodes
const authSmsCodes = database.authSmsCodes
const authSessions = database.authSessions

function databaseSnapshot() {
  return {
    version: 1,
    savedAt: now(),
    users: [...users.values()],
    workspaces: [...workspaces.values()],
    memberships,
    projects: [...projects.values()],
    builds: [...builds.values()],
    events,
    aiUsageEvents,
    aiGenerationJobs,
    contentSafetyReviews,
    paymentOrders,
    distributionJobs,
    videoGenerationJobs,
    finalVideoRenders,
    canvasAssets,
    canvasNodeRuns,
    canvasWorkflowRuns,
    auditLog,
    inviteEmailDeliveries,
    marketingLeads,
    authEmailCodes,
    authSmsCodes,
    authSessions,
  }
}

function saveJsonDatabase() {
  mkdirSync(dirname(DB_PATH), { recursive: true })
  writeFileSync(
    DB_PATH,
    JSON.stringify(databaseSnapshot(), null, 2),
    'utf8',
  )
}

async function savePostgresDatabase() {
  const pool = await getPgPool()
  const client = await pool.connect()
  const snapshot = databaseSnapshot()

  try {
    await client.query('begin')
    await client.query('delete from auth_sessions')
    await client.query('delete from auth_sms_codes')
    await client.query('delete from auth_email_codes')
    await client.query('delete from ai_generation_jobs')
    await client.query('delete from ai_usage_events')
    await client.query('delete from content_safety_reviews')
    await client.query('delete from canvas_workflow_runs')
    await client.query('delete from canvas_node_runs')
    await client.query('delete from canvas_assets')
    await client.query('delete from final_video_renders')
    await client.query('delete from video_generation_jobs')
    await client.query('delete from distribution_jobs')
    await client.query('delete from payment_orders')
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
          item.ownerUserId || user.id,
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
          JSON.stringify(item.permissions || []),
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
          item.currency || AI_PRICE_CURRENCY,
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
          item.actorUserId || user.id,
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
          item.provider || CONTENT_SAFETY_PROVIDER,
          item.policyVersion || CONTENT_SAFETY_POLICY_VERSION,
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
          item.currency || PAYMENT_CURRENCY,
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
          item.createdBy || user.id,
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
          item.createdBy || user.id,
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
          item.createdBy || user.id,
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

    for (const item of snapshot.authSessions) {
      await client.query(
        `insert into auth_sessions
          (token_hash, user_id, provider, expires_at, revoked_at, created_at, last_seen_at)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          item.tokenHash,
          item.userId,
          item.provider || AUTH_PROVIDER,
          item.expiresAt,
          item.revokedAt || null,
          item.createdAt || now(),
          item.lastSeenAt || item.createdAt || now(),
        ],
      )
    }

    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

async function saveDatabase() {
  if (STORAGE_DRIVER === 'postgres') {
    await savePostgresDatabase()
    return
  }
  saveJsonDatabase()
}

async function persistAuthSmsCode(authCode) {
  if (STORAGE_DRIVER !== 'postgres') {
    await saveDatabase()
    return
  }

  const pool = await getPgPool()
  await pool.query(
    `insert into auth_sms_codes
      (id, phone, code_hash, purpose, status, attempts, expires_at, consumed_at, metadata, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
     on conflict (id) do update set
      phone = excluded.phone,
      code_hash = excluded.code_hash,
      purpose = excluded.purpose,
      status = excluded.status,
      attempts = excluded.attempts,
      expires_at = excluded.expires_at,
      consumed_at = excluded.consumed_at,
      metadata = excluded.metadata,
      created_at = excluded.created_at`,
    [
      authCode.id,
      authCode.phone,
      authCode.codeHash,
      authCode.purpose || 'login',
      authCode.status || 'pending',
      authCode.attempts || 0,
      authCode.expiresAt,
      authCode.consumedAt || null,
      JSON.stringify(authCode.metadata || {}),
      authCode.createdAt || now(),
    ],
  )
}

async function supersedePendingSmsCodes(phone) {
  if (STORAGE_DRIVER !== 'postgres') {
    await saveDatabase()
    return
  }

  const pool = await getPgPool()
  await pool.query(
    `update auth_sms_codes
     set status = 'superseded'
     where phone = $1 and status = 'pending'`,
    [phone],
  )
}

async function persistSmsLoginSuccess({ user, authSession, auditEntry }) {
  if (STORAGE_DRIVER !== 'postgres') {
    await saveDatabase()
    return
  }

  const pool = await getPgPool()
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query(
      `insert into app_users
        (id, display_name, email, phone, role, avatar_initials, created_at)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (id) do update set
        display_name = excluded.display_name,
        email = excluded.email,
        phone = excluded.phone,
        role = excluded.role,
        avatar_initials = excluded.avatar_initials`,
      [
        user.id,
        user.displayName,
        user.email,
        user.phone || null,
        user.role || 'owner',
        user.avatarInitials || initialsFromEmail(user.email),
        user.createdAt || now(),
      ],
    )

    for (const workspace of [...workspaces.values()].filter(
      (item) => item.ownerUserId === user.id,
    )) {
      await client.query(
        `insert into workspaces
          (id, name, plan, owner_user_id, created_at)
         values ($1, $2, $3, $4, $5)
         on conflict (id) do update set
          name = excluded.name,
          plan = excluded.plan,
          owner_user_id = excluded.owner_user_id`,
        [
          workspace.id,
          workspace.name,
          workspace.plan || 'creator',
          workspace.ownerUserId,
          workspace.createdAt || now(),
        ],
      )
    }

    for (const membership of memberships.filter((item) => item.userId === user.id)) {
      await client.query(
        `insert into workspace_memberships
          (id, user_id, workspace_id, role, permissions, status, joined_at, invited_at, invite_token, invite_expires_at, accepted_at)
         values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11)
         on conflict (id) do update set
          role = excluded.role,
          permissions = excluded.permissions,
          status = excluded.status,
          joined_at = excluded.joined_at,
          invited_at = excluded.invited_at,
          invite_token = excluded.invite_token,
          invite_expires_at = excluded.invite_expires_at,
          accepted_at = excluded.accepted_at`,
        [
          membership.id,
          membership.userId,
          membership.workspaceId,
          membership.role,
          JSON.stringify(membership.permissions || rolePresets.viewer),
          membership.status || 'active',
          membership.joinedAt || now(),
          membership.invitedAt || null,
          membership.inviteToken || null,
          membership.inviteExpiresAt || null,
          membership.acceptedAt || null,
        ],
      )
    }

    await client.query(
      `insert into auth_sessions
        (token_hash, user_id, provider, expires_at, revoked_at, created_at, last_seen_at)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (token_hash) do update set
        user_id = excluded.user_id,
        provider = excluded.provider,
        expires_at = excluded.expires_at,
        revoked_at = excluded.revoked_at,
        last_seen_at = excluded.last_seen_at`,
      [
        authSession.tokenHash,
        authSession.userId,
        authSession.provider || 'sms-code',
        authSession.expiresAt,
        authSession.revokedAt || null,
        authSession.createdAt || now(),
        authSession.lastSeenAt || now(),
      ],
    )

    await client.query(
      `insert into audit_log
        (id, user_id, workspace_id, action, target_type, target_id, metadata, created_at)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
       on conflict (id) do nothing`,
      [
        auditEntry.id,
        auditEntry.userId,
        auditEntry.workspaceId,
        auditEntry.action,
        auditEntry.targetType,
        auditEntry.targetId,
        JSON.stringify(auditEntry.metadata || {}),
        auditEntry.createdAt || now(),
      ],
    )
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

function firstWorkspaceForUser(userId) {
  const membership = memberships.find(
    (item) => item.userId === userId && (item.status || 'active') === 'active',
  )
  return membership ? workspaces.get(membership.workspaceId) : null
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function isValidEmail(email) {
  return Boolean(email && email.includes('@') && email.includes('.'))
}

function normalizePhone(phone) {
  const raw = String(phone || '')
    .trim()
    .replace(/[\s\-().]/g, '')
  if (!raw) return ''
  if (raw.startsWith('+')) return `+${raw.slice(1).replace(/\D/g, '')}`
  const digits = raw.replace(/\D/g, '')
  if (/^1\d{10}$/.test(digits)) return `+86${digits}`
  if (/^86\d{11}$/.test(digits)) return `+${digits}`
  return digits ? `+${digits}` : ''
}

function isValidPhone(phone) {
  return /^\+[1-9]\d{7,14}$/.test(phone)
}

function phoneSyntheticEmail(phone) {
  const digits = normalizePhone(phone).replace(/\D/g, '')
  return `phone-${digits}@phone.playdrama.local`
}

function phoneDisplayName(phone) {
  const normalized = normalizePhone(phone)
  return normalized ? `鎵嬫満鐢ㄦ埛 ${normalized.slice(-4)}` : 'Mobile Creator'
}

function authHmac(value) {
  const secret = AUTH_SESSION_SECRET || 'playdrama-dev-auth-secret'
  return createHmac('sha256', secret).update(String(value)).digest('hex')
}

function hashEmailCode(email, code) {
  return authHmac(`${normalizeEmail(email)}:${String(code || '').trim()}`)
}

function hashSmsCode(phone, code) {
  return authHmac(`${normalizePhone(phone)}:${String(code || '').trim()}`)
}

function bearerToken(req) {
  const authorization = req.headers.authorization || ''
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
}

function issueAuthTokenWithSession(userId, provider = AUTH_PROVIDER) {
  const token = `tok_${randomUUID()}_${randomUUID()}`
  let session = null
  if (provider === 'email-code' || provider === 'sms-code') {
    session = {
      tokenHash: authHmac(token),
      userId,
      provider,
      expiresAt: addDays(new Date(), AUTH_SESSION_TTL_DAYS),
      revokedAt: null,
      createdAt: now(),
      lastSeenAt: now(),
    }
    authSessions.push(session)
  } else {
    localSessions.set(token, userId)
  }
  return { token, session }
}

function issueAuthToken(userId, provider = AUTH_PROVIDER) {
  const { token } = issueAuthTokenWithSession(userId, provider)
  return token
}

function userIdFromAuthSession(req) {
  const token = bearerToken(req)
  if (!token) return null
  const tokenHash = authHmac(token)
  const session = authSessions.find((item) => item.tokenHash === tokenHash)
  if (!session || session.revokedAt) return null
  if (new Date(session.expiresAt).getTime() < Date.now()) return null
  session.lastSeenAt = now()
  return users.has(session.userId) ? session.userId : null
}

function revokeAuthToken(req) {
  const token = bearerToken(req)
  if (!token) return
  const tokenHash = authHmac(token)
  const session = authSessions.find((item) => item.tokenHash === tokenHash)
  if (session && !session.revokedAt) {
    session.revokedAt = now()
    session.lastSeenAt = now()
  }
  localSessions.delete(token)
}

function pruneAuthArtifacts() {
  const currentTime = Date.now()
  for (let index = authEmailCodes.length - 1; index >= 0; index -= 1) {
    const item = authEmailCodes[index]
    const expiredForCleanup =
      new Date(item.expiresAt).getTime() < currentTime - 86_400_000 ||
      (item.consumedAt && new Date(item.consumedAt).getTime() < currentTime - 86_400_000)
    if (expiredForCleanup) authEmailCodes.splice(index, 1)
  }
  for (let index = authSmsCodes.length - 1; index >= 0; index -= 1) {
    const item = authSmsCodes[index]
    const expiredForCleanup =
      new Date(item.expiresAt).getTime() < currentTime - 86_400_000 ||
      (item.consumedAt && new Date(item.consumedAt).getTime() < currentTime - 86_400_000)
    if (expiredForCleanup) authSmsCodes.splice(index, 1)
  }
  for (let index = authSessions.length - 1; index >= 0; index -= 1) {
    const item = authSessions[index]
    const expired = new Date(item.expiresAt).getTime() < currentTime
    const revokedForCleanup =
      item.revokedAt && new Date(item.revokedAt).getTime() < currentTime - 86_400_000
    if (expired || revokedForCleanup) authSessions.splice(index, 1)
  }
}

function generateEmailCode() {
  return Array.from({ length: 6 }, () => String(randomInt(0, 10))).join('')
}

function generateSmsCode() {
  return generateEmailCode()
}

function ensureUserWorkspace(email, displayName) {
  const normalizedEmail = normalizeEmail(email)
  const name = String(displayName || '').trim() || normalizedEmail.split('@')[0] || 'Creator'
  const existingUser = [...users.values()].find(
    (item) => normalizeEmail(item.email) === normalizedEmail,
  )
  const nextUser =
    existingUser ||
    {
      id: `usr_${randomUUID()}`,
      displayName: name,
      email: normalizedEmail,
      role: 'owner',
      avatarInitials: initialsFromEmail(normalizedEmail),
      createdAt: now(),
    }

  if (existingUser && name && existingUser.displayName !== name) {
    existingUser.displayName = name
    existingUser.avatarInitials = initialsFromEmail(normalizedEmail)
  }

  users.set(nextUser.id, nextUser)

  const hasMembership = memberships.some((item) => item.userId === nextUser.id)
  if (!hasMembership) {
    const personalWorkspace = {
      id: `wks_${randomUUID()}`,
      name: `${name} 的创作工作区`,
      plan: 'creator',
      ownerUserId: nextUser.id,
      createdAt: now(),
    }
    workspaces.set(personalWorkspace.id, personalWorkspace)
    memberships.push({
      id: `mem_${randomUUID()}`,
      userId: nextUser.id,
      workspaceId: personalWorkspace.id,
      role: 'owner',
      permissions: rolePresets.owner,
      joinedAt: now(),
      status: 'active',
    })
  }

  return { user: nextUser, existing: Boolean(existingUser) }
}

function ensurePhoneUserWorkspace(phone, displayName) {
  const normalizedPhone = normalizePhone(phone)
  const syntheticEmail = phoneSyntheticEmail(normalizedPhone)
  const name = String(displayName || '').trim() || phoneDisplayName(normalizedPhone)
  const existingUser = [...users.values()].find(
    (item) => item.phone === normalizedPhone || normalizeEmail(item.email) === syntheticEmail,
  )
  const nextUser =
    existingUser ||
    {
      id: `usr_${randomUUID()}`,
      displayName: name,
      email: syntheticEmail,
      phone: normalizedPhone,
      role: 'owner',
      avatarInitials: initialsFromEmail(syntheticEmail),
      createdAt: now(),
    }

  nextUser.phone = normalizedPhone
  if (existingUser && name && existingUser.displayName !== name) {
    existingUser.displayName = name
    existingUser.avatarInitials = initialsFromEmail(syntheticEmail)
  }

  users.set(nextUser.id, nextUser)

  const hasMembership = memberships.some((item) => item.userId === nextUser.id)
  if (!hasMembership) {
    const personalWorkspace = {
      id: `wks_${randomUUID()}`,
      name: `${name} 的创作工作区`,
      plan: 'creator',
      ownerUserId: nextUser.id,
      createdAt: now(),
    }
    workspaces.set(personalWorkspace.id, personalWorkspace)
    memberships.push({
      id: `mem_${randomUUID()}`,
      userId: nextUser.id,
      workspaceId: personalWorkspace.id,
      role: 'owner',
      permissions: rolePresets.owner,
      joinedAt: now(),
      status: 'active',
    })
  }

  return { user: nextUser, existing: Boolean(existingUser) }
}

function userIdFromProvider(provider, providerUserId) {
  const digest = createHash('sha256')
    .update(`${provider}:${providerUserId}`)
    .digest('hex')
    .slice(0, 24)
  return `usr_${provider}_${digest}`
}

function identityHeader(req, name) {
  return String(req.headers[name.toLowerCase()] || '').trim()
}

function providerIdentityFromRequest(req) {
  const provider = identityHeader(req, 'x-playdrama-identity-provider')
  const providerUserId = identityHeader(req, 'x-playdrama-identity-id')
  const email = identityHeader(req, 'x-playdrama-identity-email').toLowerCase()
  const displayName = identityHeader(req, 'x-playdrama-identity-name')

  if (AUTH_PROVIDER === 'trusted-identity') {
    const headerSecret = identityHeader(req, 'x-playdrama-identity-secret')
    const authorization = req.headers.authorization || ''
    const bearerSecret = authorization.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : ''
    if (
      !AUTH_TRUSTED_IDENTITY_SECRET ||
      (!safeEqualText(headerSecret, AUTH_TRUSTED_IDENTITY_SECRET) &&
        !safeEqualText(bearerSecret, AUTH_TRUSTED_IDENTITY_SECRET))
    ) {
      return null
    }
  }

  if (!provider || !providerUserId || !email || !email.includes('@')) {
    return null
  }

  return {
    provider,
    providerUserId,
    email,
    displayName: displayName || email.split('@')[0],
  }
}

async function ensureProviderUser(identity) {
  const providerUserId = userIdFromProvider(identity.provider, identity.providerUserId)
  const existingUser =
    users.get(providerUserId) ||
    [...users.values()].find((item) => String(item.email).toLowerCase() === identity.email)

  const nextUser =
    existingUser ||
    {
      id: providerUserId,
      displayName: identity.displayName,
      email: identity.email,
      role: 'owner',
      avatarInitials: initialsFromEmail(identity.email),
      createdAt: now(),
    }

  let changed = false
  if (!users.has(nextUser.id)) {
    users.set(nextUser.id, nextUser)
    changed = true
  }

  if (identity.displayName && nextUser.displayName !== identity.displayName) {
    nextUser.displayName = identity.displayName
    nextUser.avatarInitials = initialsFromEmail(identity.email)
    changed = true
  }

  const hasMembership = memberships.some((item) => item.userId === nextUser.id)
  if (!hasMembership) {
    const personalWorkspace = {
      id: `wks_${randomUUID()}`,
      name: `${nextUser.displayName} 的创作工作区`,
      plan: 'creator',
      ownerUserId: nextUser.id,
      createdAt: now(),
    }
    workspaces.set(personalWorkspace.id, personalWorkspace)
    memberships.push({
      id: `mem_${randomUUID()}`,
      userId: nextUser.id,
      workspaceId: personalWorkspace.id,
      role: 'owner',
      permissions: rolePresets.owner,
      joinedAt: now(),
      status: 'active',
    })
    recordAudit(nextUser.id, 'auth.provider_signup', 'user', nextUser.id, {
      email: nextUser.email,
      provider: identity.provider,
    })
    changed = true
  }

  if (changed) {
    await saveDatabase()
  }

  return nextUser.id
}

async function requestUserId(req) {
  if (AUTH_PROVIDER === 'netlify-identity' || AUTH_PROVIDER === 'trusted-identity') {
    const identity = providerIdentityFromRequest(req)
    return identity ? ensureProviderUser(identity) : null
  }

  if (AUTH_PROVIDER === 'email-code' || AUTH_PROVIDER === 'sms-code') {
    return userIdFromAuthSession(req)
  }

  if (AUTH_PROVIDER !== 'local-demo') {
    return null
  }

  const token = bearerToken(req)
  return localSessions.get(token) || activeUserId
}

function requiresAuthenticatedUser(req, url, parts) {
  if (AUTH_PROVIDER === 'local-demo') return false
  if (req.method === 'OPTIONS') return false
  if (req.method === 'GET' && url.pathname === '/api/health') return false
  if (req.method === 'GET' && url.pathname === '/api/readiness') return false
  if (req.method === 'GET' && url.pathname === '/api/auth/providers') return false
  if (parts[0] === 'api' && parts[1] === 'auth') return false
  if (req.method === 'GET' && url.pathname === '/api/email/provider') return false
  if (req.method === 'GET' && url.pathname === '/api/sms/provider') return false
  if (req.method === 'GET' && url.pathname === '/api/payment/provider') return false
  if (req.method === 'GET' && url.pathname === '/api/distribution/providers') return false
  if (req.method === 'GET' && url.pathname === '/api/ai/providers') return false
  if (req.method === 'GET' && url.pathname === '/api/video/providers') return false
  if (parts[0] === 'api' && parts[1] === 'play') return false
  if (parts[0] === 'api' && parts[1] === 'builds' && req.method === 'GET') return false
  if (parts[0] === 'api' && parts[1] === 'invitations') return false
  if (parts[0] === 'api' && parts[1] === 'marketing' && parts[2] === 'leads' && req.method === 'POST') return false
  if (parts[0] === 'api' && parts[1] === 'email' && parts[2] === 'callbacks') return false
  if (parts[0] === 'api' && parts[1] === 'payment' && parts[2] === 'callbacks') return false
  return parts[0] === 'api'
}

function authProviderStatus() {
  const authReadiness = evaluateProductionReadiness(process.env).items.filter((item) =>
    item.id.startsWith('auth-'),
  )
  const missing = authReadiness.filter((item) => !item.ok)
  return {
    provider: AUTH_PROVIDER,
    supportedProviders: SUPPORTED_AUTH_PROVIDERS,
    mode:
      AUTH_PROVIDER === 'local-demo'
        ? 'local-demo'
        : AUTH_PROVIDER === 'email-code'
          ? 'email-code'
          : AUTH_PROVIDER === 'sms-code'
            ? 'sms-code'
          : 'external-provider',
    requestScoped:
      AUTH_PROVIDER === 'local-demo' ||
      AUTH_PROVIDER === 'email-code' ||
      AUTH_PROVIDER === 'sms-code' ||
      AUTH_PROVIDER === 'netlify-identity' ||
      AUTH_PROVIDER === 'trusted-identity',
    tokenPersistence:
      AUTH_PROVIDER === 'local-demo'
        ? 'memory'
        : AUTH_PROVIDER === 'email-code' || AUTH_PROVIDER === 'sms-code'
          ? 'postgres-bearer'
        : AUTH_PROVIDER === 'netlify-identity'
          ? 'netlify-identity'
          : AUTH_PROVIDER === 'trusted-identity'
            ? 'trusted-identity-header'
            : 'provider-managed',
    trustedIdentitySecretConfigured: Boolean(AUTH_TRUSTED_IDENTITY_SECRET),
    emailCodeReady: AUTH_EMAIL_CODE_READY,
    emailCodeTtlMinutes: AUTH_EMAIL_CODE_TTL_MINUTES,
    smsCodeReady: AUTH_SMS_CODE_READY,
    smsCodeTtlMinutes: AUTH_SMS_CODE_TTL_MINUTES,
    sessionTtlDays: AUTH_SESSION_TTL_DAYS,
    productionReady: missing.length === 0,
    readiness: authReadiness,
    missing,
  }
}

function storageReadiness() {
  const readiness = [
    {
      id: 'driver',
      label: 'Storage driver',
      ok: STORAGE_DRIVER === 'postgres',
      action: 'Set PLAYDRAMA_STORAGE_DRIVER=postgres before production beta.',
    },
    {
      id: 'database-url',
      label: 'Cloud database URL',
      ok: POSTGRES_CONFIGURED,
      action: 'Set DATABASE_URL, or enable Netlify Database with NETLIFY_DATABASE_READY=true.',
    },
    {
      id: 'schema',
      label: 'Database schema',
      ok: STORAGE_DRIVER === 'postgres' && POSTGRES_CONFIGURED,
      action: 'Apply docs/database-schema.sql to the cloud database.',
    },
    {
      id: 'import',
      label: 'Initial data import',
      ok: STORAGE_DRIVER === 'postgres' && POSTGRES_CONFIGURED,
      action: 'Run npm run db:import-json when migrating from JSON data.',
    },
    {
      id: 'verification',
      label: 'Database verification',
      ok: STORAGE_DRIVER === 'postgres' && POSTGRES_CONFIGURED,
      action: 'Run npm run db:verify and confirm Result: PASS.',
    },
  ]
  return {
    driver: STORAGE_DRIVER,
    path: STORAGE_DRIVER === 'json' ? DB_PATH : null,
    databaseUrlConfigured: DATABASE_URL_CONFIGURED,
    netlifyDatabaseConfigured: NETLIFY_DATABASE_CONFIGURED,
    productionReady: STORAGE_DRIVER === 'postgres' && POSTGRES_CONFIGURED,
    readiness,
    missing: readiness.filter((item) => !item.ok),
  }
}

function emailProviderStatus() {
  const tencentSesConfigured =
    TENCENTCLOUD_SECRET_ID_CONFIGURED &&
    TENCENTCLOUD_SECRET_KEY_CONFIGURED &&
    Boolean(TENCENT_SES_FROM_EMAIL)
  const aliyunDirectMailConfigured =
    ALIYUN_ACCESS_KEY_ID_CONFIGURED &&
    ALIYUN_ACCESS_KEY_SECRET_CONFIGURED &&
    Boolean(ALIYUN_DM_ACCOUNT_NAME)
  const tencentSesReadiness = [
    {
      id: 'secret-id',
      label: 'Tencent Cloud SecretId',
      ok: TENCENTCLOUD_SECRET_ID_CONFIGURED,
      action: 'Set TENCENTCLOUD_SECRET_ID in the deployment environment.',
    },
    {
      id: 'secret-key',
      label: 'Tencent Cloud SecretKey',
      ok: TENCENTCLOUD_SECRET_KEY_CONFIGURED,
      action: 'Set TENCENTCLOUD_SECRET_KEY in the deployment environment.',
    },
    {
      id: 'sender',
      label: 'Sender address',
      ok: TENCENT_SES_DRY_RUN || Boolean(TENCENT_SES_FROM_EMAIL),
      action: 'Verify a sender in Tencent SES and set TENCENT_SES_FROM_EMAIL.',
    },
    {
      id: 'template',
      label: 'Invite email template',
      ok: TENCENT_SES_DRY_RUN || Boolean(TENCENT_SES_TEMPLATE_ID),
      action: 'Create and approve an invite email template, then set TENCENT_SES_TEMPLATE_ID.',
    },
    {
      id: 'callback-secret',
      label: 'Callback signing secret',
      ok: Boolean(EMAIL_CALLBACK_SECRET),
      action: 'Set EMAIL_CALLBACK_SECRET and use it for provider callbacks.',
    },
    {
      id: 'callback-mode',
      label: 'HMAC callback mode',
      ok: EMAIL_CALLBACK_SIGNATURE_MODE === 'hmac-sha256',
      action: 'Set EMAIL_CALLBACK_SIGNATURE_MODE=hmac-sha256 in production.',
    },
  ]
  const aliyunDirectMailReadiness = [
    {
      id: 'access-key-id',
      label: 'Aliyun AccessKey ID',
      ok: ALIYUN_ACCESS_KEY_ID_CONFIGURED,
      action: 'Set ALIYUN_ACCESS_KEY_ID in the deployment environment.',
    },
    {
      id: 'access-key-secret',
      label: 'Aliyun AccessKey Secret',
      ok: ALIYUN_ACCESS_KEY_SECRET_CONFIGURED,
      action: 'Set ALIYUN_ACCESS_KEY_SECRET in the deployment environment.',
    },
    {
      id: 'account-name',
      label: 'DirectMail account name',
      ok: ALIYUN_DM_DRY_RUN || Boolean(ALIYUN_DM_ACCOUNT_NAME),
      action: 'Verify a sender in Aliyun DirectMail and set ALIYUN_DM_ACCOUNT_NAME.',
    },
    {
      id: 'callback-secret',
      label: 'Callback signing secret',
      ok: Boolean(EMAIL_CALLBACK_SECRET),
      action: 'Set EMAIL_CALLBACK_SECRET and use it for provider callbacks.',
    },
    {
      id: 'callback-mode',
      label: 'HMAC callback mode',
      ok: EMAIL_CALLBACK_SIGNATURE_MODE === 'hmac-sha256',
      action: 'Set EMAIL_CALLBACK_SIGNATURE_MODE=hmac-sha256 in production.',
    },
  ]
  return {
    provider: EMAIL_PROVIDER,
    supportedProviders: ['log', 'webhook', 'tencent-ses', 'aliyun-directmail'],
    webhookConfigured: Boolean(EMAIL_WEBHOOK_URL),
    apiKeyConfigured: EMAIL_API_KEY_CONFIGURED,
    callbackSecretConfigured: Boolean(EMAIL_CALLBACK_SECRET),
    callbackSignatureMode: EMAIL_CALLBACK_SIGNATURE_MODE,
    tencentSes: {
      configured: tencentSesConfigured,
      dryRun: TENCENT_SES_DRY_RUN,
      endpoint: TENCENT_SES_ENDPOINT,
      region: TENCENT_SES_REGION,
      fromEmailConfigured: Boolean(TENCENT_SES_FROM_EMAIL),
      secretIdConfigured: TENCENTCLOUD_SECRET_ID_CONFIGURED,
      secretKeyConfigured: TENCENTCLOUD_SECRET_KEY_CONFIGURED,
      templateConfigured: Boolean(TENCENT_SES_TEMPLATE_ID),
      readiness: tencentSesReadiness,
      missing: tencentSesReadiness.filter((item) => !item.ok),
    },
    aliyunDirectMail: {
      configured: aliyunDirectMailConfigured,
      dryRun: ALIYUN_DM_DRY_RUN,
      endpoint: ALIYUN_DM_ENDPOINT,
      region: ALIYUN_DM_REGION,
      accountNameConfigured: Boolean(ALIYUN_DM_ACCOUNT_NAME),
      accessKeyIdConfigured: ALIYUN_ACCESS_KEY_ID_CONFIGURED,
      accessKeySecretConfigured: ALIYUN_ACCESS_KEY_SECRET_CONFIGURED,
      readiness: aliyunDirectMailReadiness,
      missing: aliyunDirectMailReadiness.filter((item) => !item.ok),
    },
    recommendations: emailProviderRecommendations,
    productionReady:
      (EMAIL_PROVIDER === 'webhook' && Boolean(EMAIL_WEBHOOK_URL)) ||
      (EMAIL_PROVIDER === 'tencent-ses' && tencentSesConfigured) ||
      (EMAIL_PROVIDER === 'aliyun-directmail' && aliyunDirectMailConfigured),
  }
}

function smsProviderStatus() {
  const readiness = [
    {
      id: 'secret-id',
      label: 'Tencent Cloud SecretId',
      ok: TENCENTCLOUD_SECRET_ID_CONFIGURED,
      action: 'Set TENCENTCLOUD_SECRET_ID in the deployment environment.',
    },
    {
      id: 'secret-key',
      label: 'Tencent Cloud SecretKey',
      ok: TENCENTCLOUD_SECRET_KEY_CONFIGURED,
      action: 'Set TENCENTCLOUD_SECRET_KEY in the deployment environment.',
    },
    {
      id: 'sdk-app-id',
      label: 'Tencent SMS SDK App ID',
      ok: TENCENT_SMS_DRY_RUN || Boolean(TENCENT_SMS_SDK_APP_ID),
      action: 'Create an SMS app and set TENCENT_SMS_SDK_APP_ID.',
    },
    {
      id: 'sign-name',
      label: 'Tencent SMS sign name',
      ok: TENCENT_SMS_DRY_RUN || Boolean(TENCENT_SMS_SIGN_NAME),
      action: 'Create and approve an SMS sign, then set TENCENT_SMS_SIGN_NAME.',
    },
    {
      id: 'template-id',
      label: 'Tencent SMS template ID',
      ok: TENCENT_SMS_DRY_RUN || Boolean(TENCENT_SMS_TEMPLATE_ID),
      action: 'Create and approve an auth-code SMS template, then set TENCENT_SMS_TEMPLATE_ID.',
    },
  ]
  const tencentConfigured =
    TENCENTCLOUD_SECRET_ID_CONFIGURED &&
    TENCENTCLOUD_SECRET_KEY_CONFIGURED &&
    Boolean(TENCENT_SMS_SDK_APP_ID) &&
    Boolean(TENCENT_SMS_SIGN_NAME) &&
    Boolean(TENCENT_SMS_TEMPLATE_ID)
  return {
    provider: SMS_PROVIDER,
    supportedProviders: ['log', 'tencent-sms'],
    tencentSms: {
      configured: tencentConfigured,
      dryRun: TENCENT_SMS_DRY_RUN,
      endpoint: TENCENT_SMS_ENDPOINT,
      region: TENCENT_SMS_REGION,
      version: TENCENT_SMS_VERSION,
      sdkAppIdConfigured: Boolean(TENCENT_SMS_SDK_APP_ID),
      signNameConfigured: Boolean(TENCENT_SMS_SIGN_NAME),
      templateConfigured: Boolean(TENCENT_SMS_TEMPLATE_ID),
      templateParams: TENCENT_SMS_TEMPLATE_PARAMS,
      secretIdConfigured: TENCENTCLOUD_SECRET_ID_CONFIGURED,
      secretKeyConfigured: TENCENTCLOUD_SECRET_KEY_CONFIGURED,
      readiness,
      missing: readiness.filter((item) => !item.ok),
    },
    productionReady: SMS_PROVIDER === 'tencent-sms' && tencentConfigured && !TENCENT_SMS_DRY_RUN,
  }
}

function paymentProviderStatus() {
  const providers = configuredPaymentProviders()
  const alipayConfigured = Boolean(ALIPAY_APP_ID && ALIPAY_PRIVATE_KEY && ALIPAY_PUBLIC_KEY)
  const wechatConfigured = Boolean(
    WECHAT_PAY_MCH_ID &&
      WECHAT_PAY_APP_ID &&
      WECHAT_PAY_API_V3_KEY &&
      WECHAT_PAY_SERIAL_NO &&
      wechatPrivateKey() &&
      wechatPlatformPublicKey(),
  )
  return {
    provider: PAYMENT_PROVIDER,
    providers,
    activeProvider: providers[0] || 'sandbox',
    currency: PAYMENT_CURRENCY,
    alipay: {
      configured: alipayConfigured,
      notifyUrlConfigured: Boolean(ALIPAY_NOTIFY_URL),
      returnUrlConfigured: Boolean(ALIPAY_RETURN_URL),
      sellerIdConfigured: Boolean(ALIPAY_SELLER_ID),
    },
    wechat: {
      configured: wechatConfigured,
      appIdConfigured: Boolean(WECHAT_PAY_APP_ID),
      mchIdConfigured: Boolean(WECHAT_PAY_MCH_ID),
      apiV3KeyConfigured: Boolean(WECHAT_PAY_API_V3_KEY),
      merchantSerialConfigured: Boolean(WECHAT_PAY_SERIAL_NO),
      merchantPrivateKeyConfigured: Boolean(wechatPrivateKey()),
      platformPublicKeyConfigured: Boolean(wechatPlatformPublicKey()),
      notifyUrlConfigured: Boolean(WECHAT_PAY_NOTIFY_URL),
    },
    productionReady:
      (providers.includes('alipay') && alipayConfigured) ||
      (providers.includes('wechat') && wechatConfigured) ||
      providers.includes('sandbox'),
  }
}

function distributionProviderStatus() {
  const payment = paymentProviderStatus()
  const douyinOpenApiConfigured = Boolean(DOUYIN_CLIENT_KEY && DOUYIN_ACCESS_TOKEN && DOUYIN_OPEN_ID)
  const douyinMiniConfigured = Boolean(DOUYIN_MINI_APP_ID && MINI_PROGRAM_WEBVIEW_DOMAIN_READY)
  const wechatMiniConfigured = Boolean(WECHAT_MINI_APP_ID && MINI_PROGRAM_WEBVIEW_DOMAIN_READY)
  return {
    providers: ['douyin', 'douyin-mini', 'wechat-mini'],
    appBaseUrl: APP_BASE_URL,
    douyin: {
      openApiConfigured: douyinOpenApiConfigured,
      clientKeyConfigured: Boolean(DOUYIN_CLIENT_KEY),
      clientSecretConfigured: Boolean(DOUYIN_CLIENT_SECRET),
      accessTokenConfigured: Boolean(DOUYIN_ACCESS_TOKEN),
      openIdConfigured: Boolean(DOUYIN_OPEN_ID),
      miniAppIdConfigured: Boolean(DOUYIN_MINI_APP_ID),
      webviewDomainReady: MINI_PROGRAM_WEBVIEW_DOMAIN_READY,
      baseUrl: DOUYIN_OPEN_BASE_URL,
      missing: [
        !DOUYIN_CLIENT_KEY ? 'DOUYIN_CLIENT_KEY' : '',
        !DOUYIN_ACCESS_TOKEN ? 'DOUYIN_ACCESS_TOKEN' : '',
        !DOUYIN_OPEN_ID ? 'DOUYIN_OPEN_ID' : '',
      ].filter(Boolean),
    },
    douyinMini: {
      configured: douyinMiniConfigured,
      appIdConfigured: Boolean(DOUYIN_MINI_APP_ID),
      webviewDomainReady: MINI_PROGRAM_WEBVIEW_DOMAIN_READY,
      paymentReady: payment.providers.includes('wechat') || payment.providers.includes('alipay'),
      pathTemplate: '/pages/play/index?build={buildId}&channel=douyin-mini',
    },
    wechatMini: {
      configured: wechatMiniConfigured,
      appIdConfigured: Boolean(WECHAT_MINI_APP_ID),
      originalIdConfigured: Boolean(WECHAT_MINI_ORIGINAL_ID),
      webviewDomainReady: MINI_PROGRAM_WEBVIEW_DOMAIN_READY,
      paymentReady: payment.wechat.configured,
      pathTemplate: '/pages/play/index?build={buildId}&channel=wechat-mini',
    },
    productionReady: douyinOpenApiConfigured || douyinMiniConfigured || wechatMiniConfigured,
  }
}

function sha256Hex(value) {
  return createHash('sha256').update(value).digest('hex')
}

function hmacSha256(key, value) {
  return createHmac('sha256', key).update(value).digest()
}

function hmacSha256Hex(key, value) {
  return createHmac('sha256', key).update(value).digest('hex')
}

function hmacSha1Base64(key, value) {
  return createHmac('sha1', key).update(value).digest('base64')
}

function tencentDateParts(date = new Date()) {
  const iso = date.toISOString()
  return {
    timestamp: Math.floor(date.getTime() / 1000),
    date: iso.slice(0, 10),
  }
}

function signTencentApiRequest({
  action,
  payload,
  service = 'ses',
  endpoint = TENCENT_SES_ENDPOINT,
}) {
  const secretId = process.env.TENCENTCLOUD_SECRET_ID || ''
  const secretKey = process.env.TENCENTCLOUD_SECRET_KEY || ''
  if (!secretId || !secretKey) {
    throw new Error('TENCENTCLOUD_SECRET_ID or TENCENTCLOUD_SECRET_KEY is not configured')
  }

  const { timestamp, date } = tencentDateParts()
  const algorithm = 'TC3-HMAC-SHA256'
  const httpRequestMethod = 'POST'
  const canonicalUri = '/'
  const canonicalQueryString = ''
  const canonicalHeaders =
    `content-type:application/json; charset=utf-8\nhost:${endpoint}\nx-tc-action:${action.toLowerCase()}\n`
  const signedHeaders = 'content-type;host;x-tc-action'
  const hashedRequestPayload = sha256Hex(payload)
  const canonicalRequest = [
    httpRequestMethod,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedRequestPayload,
  ].join('\n')
  const credentialScope = `${date}/${service}/tc3_request`
  const stringToSign = [
    algorithm,
    timestamp,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n')
  const secretDate = hmacSha256(`TC3${secretKey}`, date)
  const secretService = hmacSha256(secretDate, service)
  const secretSigning = hmacSha256(secretService, 'tc3_request')
  const signature = hmacSha256Hex(secretSigning, stringToSign)
  const authorization =
    `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  return {
    authorization,
    timestamp,
  }
}

function tencentInviteEmailPayload(message) {
  const isAuthCode = message.kind === 'auth-code'
  const isMarketingLead = message.kind === 'marketing-lead'
  const templateData = isAuthCode
    ? {
        code: message.code,
        expiresAt: message.expiresAt,
      }
    : {
        workspaceName: message.workspaceName,
        role: message.role,
        inviteUrl: message.inviteUrl,
        expiresAt: message.expiresAt,
      }
  const payload = {
    FromEmailAddress: TENCENT_SES_FROM_EMAIL,
    Destination: [message.to],
    Subject: message.subject,
    ReplyToAddresses: TENCENT_SES_REPLY_TO || undefined,
    Unsubscribe: '0',
  }

  if (isAuthCode) {
    const content = [
      'PlayDrama Studio login code',
      `Code: ${message.code}`,
      `Expires at: ${message.expiresAt}`,
      'If you did not request this code, ignore this email.',
    ].join('\n')
    payload.Simple = {
      Text: Buffer.from(content, 'utf8').toString('base64'),
    }
    return JSON.parse(JSON.stringify(payload))
  }

  if (isMarketingLead) {
    const lead = message.lead || {}
    const content = [
      'New PlayDrama beta/cooperation lead',
      `Name: ${lead.name || ''}`,
      `Company: ${lead.company || ''}`,
      `Role: ${lead.role || ''}`,
      `Phone: ${lead.phone || ''}`,
      `Email: ${lead.email || ''}`,
      `Scenario: ${lead.scenario || ''}`,
      `Source: ${lead.source || ''}`,
      `Message: ${lead.message || ''}`,
      `Created at: ${lead.createdAt || ''}`,
    ].join('\n')
    payload.Simple = {
      Text: Buffer.from(content, 'utf8').toString('base64'),
    }
    return JSON.parse(JSON.stringify(payload))
  }

  if (TENCENT_SES_TEMPLATE_ID && !isAuthCode) {
    payload.Template = {
      TemplateID: Number(TENCENT_SES_TEMPLATE_ID),
      TemplateData: JSON.stringify(templateData),
    }
  } else {
    const content = [
      `You are invited to join ${message.workspaceName} on PlayDrama Studio.`,
      `Role: ${message.role}`,
      `Invite URL: ${message.inviteUrl}`,
      `Expires at: ${message.expiresAt}`,
    ].join('\n')
    payload.Simple = {
      Text: Buffer.from(content, 'utf8').toString('base64'),
    }
  }

  return JSON.parse(JSON.stringify(payload))
}

async function sendTencentSesEmail(message) {
  if (TENCENT_SES_DRY_RUN) {
    return {
      ...message,
      status: 'queued',
      providerMessageId: `dryrun_${randomUUID()}`,
      errorMessage: 'Tencent SES dry run: no external email was sent',
      updatedAt: now(),
    }
  }

  if (!TENCENT_SES_FROM_EMAIL) {
    return {
      ...message,
      status: 'failed',
      errorMessage: 'TENCENT_SES_FROM_EMAIL is not configured',
      updatedAt: now(),
    }
  }

  try {
    const action = 'SendEmail'
    const payload = JSON.stringify(tencentInviteEmailPayload(message))
    const signature = signTencentApiRequest({ action, payload })
    const headers = {
      authorization: signature.authorization,
      'content-type': 'application/json; charset=utf-8',
      host: TENCENT_SES_ENDPOINT,
      'x-tc-action': action,
      'x-tc-region': TENCENT_SES_REGION,
      'x-tc-timestamp': String(signature.timestamp),
      'x-tc-version': TENCENT_SES_VERSION,
      ...(process.env.TENCENTCLOUD_SESSION_TOKEN
        ? { 'x-tc-token': process.env.TENCENTCLOUD_SESSION_TOKEN }
        : {}),
    }
    const response = await fetch(`https://${TENCENT_SES_ENDPOINT}`, {
      method: 'POST',
      headers,
      body: payload,
    })
    const result = await response.json().catch(() => ({}))
    const responseData = result.Response || {}
    const error = responseData.Error
    return {
      ...message,
      status: response.ok && !error ? 'queued' : 'failed',
      providerMessageId:
        responseData.MessageId ||
        responseData.RequestId ||
        result.MessageId ||
        result.RequestId ||
        null,
      errorMessage: error
        ? `${error.Code}: ${error.Message}`
        : response.ok
          ? null
          : `HTTP ${response.status}`,
      updatedAt: now(),
    }
  } catch (error) {
    return {
      ...message,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : String(error),
      updatedAt: now(),
    }
  }
}

function tencentSmsTemplateParamSet(message) {
  const values = {
    code: message.code,
    ttlMinutes: String(AUTH_SMS_CODE_TTL_MINUTES),
    ttl: String(AUTH_SMS_CODE_TTL_MINUTES),
    expiresAt: message.expiresAt,
    appName: 'PlayDrama Studio',
  }
  return TENCENT_SMS_TEMPLATE_PARAMS.map((key) => String(values[key] ?? ''))
}

function tencentSmsPayload(message) {
  return JSON.parse(
    JSON.stringify({
      SmsSdkAppId: TENCENT_SMS_SDK_APP_ID,
      SignName: TENCENT_SMS_SIGN_NAME,
      TemplateId: TENCENT_SMS_TEMPLATE_ID,
      TemplateParamSet: tencentSmsTemplateParamSet(message),
      PhoneNumberSet: [message.to],
      SessionContext: message.id,
      ExtendCode: TENCENT_SMS_EXTEND_CODE || undefined,
      SenderId: TENCENT_SMS_SENDER_ID || undefined,
    }),
  )
}

async function sendTencentSms(message) {
  if (SMS_PROVIDER === 'log') {
    console.log(`PlayDrama sms logged: ${JSON.stringify(message)}`)
    return {
      ...message,
      status: 'logged',
      providerMessageId: null,
      errorMessage: null,
      updatedAt: now(),
    }
  }

  if (TENCENT_SMS_DRY_RUN) {
    return {
      ...message,
      status: 'queued',
      providerMessageId: `dryrun_tencent_sms_${randomUUID()}`,
      errorMessage: 'Tencent SMS dry run: no external SMS was sent',
      updatedAt: now(),
    }
  }

  if (!TENCENT_SMS_SDK_APP_ID || !TENCENT_SMS_SIGN_NAME || !TENCENT_SMS_TEMPLATE_ID) {
    return {
      ...message,
      status: 'failed',
      providerMessageId: null,
      errorMessage:
        'TENCENT_SMS_SDK_APP_ID, TENCENT_SMS_SIGN_NAME, or TENCENT_SMS_TEMPLATE_ID is not configured',
      updatedAt: now(),
    }
  }

  try {
    const action = 'SendSms'
    const payload = JSON.stringify(tencentSmsPayload(message))
    const signature = signTencentApiRequest({
      action,
      payload,
      service: 'sms',
      endpoint: TENCENT_SMS_ENDPOINT,
    })
    const headers = {
      authorization: signature.authorization,
      'content-type': 'application/json; charset=utf-8',
      host: TENCENT_SMS_ENDPOINT,
      'x-tc-action': action,
      'x-tc-region': TENCENT_SMS_REGION,
      'x-tc-timestamp': String(signature.timestamp),
      'x-tc-version': TENCENT_SMS_VERSION,
      ...(process.env.TENCENTCLOUD_SESSION_TOKEN
        ? { 'x-tc-token': process.env.TENCENTCLOUD_SESSION_TOKEN }
        : {}),
    }
    const controller = new AbortController()
    let timeout = setTimeout(() => controller.abort(), TENCENT_SMS_REQUEST_TIMEOUT_MS)
    const response = await fetch(`https://${TENCENT_SMS_ENDPOINT}`, {
      method: 'POST',
      headers,
      body: payload,
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timeout)
      timeout = null
    })
    const result = await response.json().catch(() => ({}))
    const responseData = result.Response || {}
    const error = responseData.Error
    const sendStatus = Array.isArray(responseData.SendStatusSet)
      ? responseData.SendStatusSet[0]
      : null
    const ok = response.ok && !error && (!sendStatus || sendStatus.Code === 'Ok')
    return {
      ...message,
      status: ok ? 'queued' : 'failed',
      providerMessageId:
        sendStatus?.SerialNo ||
        sendStatus?.IsoCode ||
        responseData.RequestId ||
        result.RequestId ||
        null,
      errorMessage: error
        ? `${error.Code}: ${error.Message}`
        : sendStatus && sendStatus.Code !== 'Ok'
          ? `${sendStatus.Code}: ${sendStatus.Message || 'Tencent SMS error'}`
          : response.ok
            ? null
            : `HTTP ${response.status}`,
      updatedAt: now(),
    }
  } catch (error) {
    return {
      ...message,
      status: 'failed',
      providerMessageId: null,
      errorMessage:
        error instanceof Error && error.name === 'AbortError'
          ? `Tencent SMS request timed out after ${TENCENT_SMS_REQUEST_TIMEOUT_MS}ms`
          : error instanceof Error
            ? error.message
            : String(error),
      updatedAt: now(),
    }
  }
}

function shouldKeepSmsCodeVerifiable(delivery) {
  if (delivery.status !== 'failed') return true

  const message = String(delivery.errorMessage || '').toLowerCase()
  return message.includes('timed out') || message.includes('timeout')
}

function aliyunPercentEncode(value) {
  return encodeURIComponent(String(value))
    .replace(/\+/g, '%20')
    .replace(/\*/g, '%2A')
    .replace(/%7E/g, '~')
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function aliyunInviteHtml(message) {
  return [
    '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;line-height:1.7;color:#1f2937">',
    `<h2>${escapeHtml(message.workspaceName)} 邀请你加入 PlayDrama Studio</h2>`,
    `<p>角色：${escapeHtml(message.role)}</p>`,
    `<p>过期时间：${escapeHtml(message.expiresAt)}</p>`,
    `<p><a href="${escapeHtml(message.inviteUrl)}">接受邀请</a></p>`,
    `<p style="color:#6b7280;font-size:12px">如果按钮无法打开，请复制链接：${escapeHtml(message.inviteUrl)}</p>`,
    '</div>',
  ].join('')
}

function aliyunAuthCodeHtml(message) {
  return [
    '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;line-height:1.7;color:#1f2937">',
    '<h2>PlayDrama Studio login code</h2>',
    `<p style="font-size:28px;font-weight:700;letter-spacing:4px">${escapeHtml(message.code)}</p>`,
    `<p>Expires at: ${escapeHtml(message.expiresAt)}</p>`,
    '<p style="color:#6b7280;font-size:12px">If you did not request this code, ignore this email.</p>',
    '</div>',
  ].join('')
}

function aliyunMarketingLeadHtml(message) {
  const lead = message.lead || {}
  return [
    '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;line-height:1.7;color:#102016">',
    '<h2>PlayDrama beta/cooperation lead</h2>',
    `<p><strong>Name:</strong> ${escapeHtml(lead.name)}</p>`,
    `<p><strong>Company:</strong> ${escapeHtml(lead.company)}</p>`,
    `<p><strong>Role:</strong> ${escapeHtml(lead.role)}</p>`,
    `<p><strong>Phone:</strong> ${escapeHtml(lead.phone)}</p>`,
    `<p><strong>Email:</strong> ${escapeHtml(lead.email)}</p>`,
    `<p><strong>Scenario:</strong> ${escapeHtml(lead.scenario)}</p>`,
    `<p><strong>Source:</strong> ${escapeHtml(lead.source)}</p>`,
    `<p><strong>Message:</strong><br>${escapeHtml(lead.message)}</p>`,
    `<p style="color:#6b7280;font-size:12px">Created at: ${escapeHtml(lead.createdAt)}</p>`,
    '</div>',
  ].join('')
}

function signAliyunDirectMailParams(message) {
  const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID || ''
  const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET || ''
  if (!accessKeyId || !accessKeySecret) {
    throw new Error('ALIYUN_ACCESS_KEY_ID or ALIYUN_ACCESS_KEY_SECRET is not configured')
  }

  const params = {
    Format: 'JSON',
    Version: '2015-11-23',
    AccessKeyId: accessKeyId,
    SignatureMethod: 'HMAC-SHA1',
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    SignatureVersion: '1.0',
    SignatureNonce: randomUUID(),
    RegionId: ALIYUN_DM_REGION,
    Action: 'SingleSendMail',
    AccountName: ALIYUN_DM_ACCOUNT_NAME,
    AddressType: ALIYUN_DM_ADDRESS_TYPE,
    ReplyToAddress: ALIYUN_DM_REPLY_TO_ADDRESS,
    ToAddress: message.to,
    Subject: message.subject,
    HtmlBody:
      message.kind === 'auth-code'
        ? aliyunAuthCodeHtml(message)
        : message.kind === 'marketing-lead'
          ? aliyunMarketingLeadHtml(message)
          : aliyunInviteHtml(message),
    ...(ALIYUN_DM_FROM_ALIAS ? { FromAlias: ALIYUN_DM_FROM_ALIAS } : {}),
    ...(ALIYUN_DM_TAG_NAME ? { TagName: ALIYUN_DM_TAG_NAME } : {}),
  }
  const canonicalized = Object.keys(params)
    .sort()
    .map((key) => `${aliyunPercentEncode(key)}=${aliyunPercentEncode(params[key])}`)
    .join('&')
  const stringToSign = `POST&%2F&${aliyunPercentEncode(canonicalized)}`
  const signature = hmacSha1Base64(`${accessKeySecret}&`, stringToSign)
  return {
    ...params,
    Signature: signature,
  }
}

async function sendAliyunDirectMailEmail(message) {
  if (ALIYUN_DM_DRY_RUN) {
    return {
      ...message,
      status: 'queued',
      providerMessageId: `dryrun_aliyun_${randomUUID()}`,
      errorMessage: 'Aliyun DirectMail dry run: no external email was sent',
      updatedAt: now(),
    }
  }

  if (!ALIYUN_DM_ACCOUNT_NAME) {
    return {
      ...message,
      status: 'failed',
      errorMessage: 'ALIYUN_DM_ACCOUNT_NAME is not configured',
      updatedAt: now(),
    }
  }

  try {
    const params = signAliyunDirectMailParams(message)
    const response = await fetch(ALIYUN_DM_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params).toString(),
    })
    const result = await response.json().catch(() => ({}))
    const errorCode = result.Code || result.code
    return {
      ...message,
      status: response.ok && !errorCode ? 'queued' : 'failed',
      providerMessageId: result.EnvId || result.RequestId || result.requestId || null,
      errorMessage: errorCode
        ? `${errorCode}: ${result.Message || result.message || 'Aliyun DirectMail error'}`
        : response.ok
          ? null
          : `HTTP ${response.status}`,
      updatedAt: now(),
    }
  } catch (error) {
    return {
      ...message,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : String(error),
      updatedAt: now(),
    }
  }
}

async function sendWebhookEmail(message) {
  if (!EMAIL_WEBHOOK_URL) {
    return {
      ...message,
      status: 'failed',
      errorMessage: 'EMAIL_WEBHOOK_URL is not configured',
      updatedAt: now(),
    }
  }

  try {
    const response = await fetch(EMAIL_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(process.env.EMAIL_API_KEY
          ? { authorization: `Bearer ${process.env.EMAIL_API_KEY}` }
          : {}),
      },
      body: JSON.stringify(message),
    })
    const providerResult = await response.json().catch(() => ({}))
    return {
      ...message,
      status: response.ok ? providerResult.status || 'queued' : 'failed',
      providerMessageId: providerResult.id || providerResult.messageId || null,
      errorMessage: response.ok
        ? providerResult.errorMessage || null
        : providerResult.errorMessage || `HTTP ${response.status}`,
      updatedAt: now(),
    }
  } catch (error) {
    return {
      ...message,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : String(error),
      updatedAt: now(),
    }
  }
}

async function deliverEmailMessage(message) {
  if (EMAIL_PROVIDER === 'log') {
    console.log(`PlayDrama email logged: ${JSON.stringify(message)}`)
    return message
  }
  if (EMAIL_PROVIDER === 'webhook') {
    return sendWebhookEmail(message)
  }
  if (EMAIL_PROVIDER === 'tencent-ses') {
    return sendTencentSesEmail(message)
  }
  if (EMAIL_PROVIDER === 'aliyun-directmail') {
    return sendAliyunDirectMailEmail(message)
  }
  return {
    ...message,
    status: 'failed',
    errorMessage: `Unsupported EMAIL_PROVIDER: ${EMAIL_PROVIDER}`,
    updatedAt: now(),
  }
}

async function sendInviteEmail({ workspaceId, memberId, email, inviteUrl, workspaceName, role, expiresAt }) {
  let message = {
    id: `mail_${randomUUID()}`,
    workspaceId,
    memberId,
    provider: EMAIL_PROVIDER,
    to: email,
    subject: `Join ${workspaceName} on PlayDrama Studio`,
    workspaceName,
    inviteUrl,
    role,
    expiresAt,
    status: EMAIL_PROVIDER === 'log' ? 'logged' : 'queued',
    createdAt: now(),
    updatedAt: now(),
  }

  message = await deliverEmailMessage(message)

  inviteEmailDeliveries.push(message)

  return message
}

async function sendAuthCodeEmail({ email, code, expiresAt }) {
  const workspaceId = firstWorkspaceForUser(user.id)?.id || workspace.id
  const message = {
    id: `mail_${randomUUID()}`,
    kind: 'auth-code',
    workspaceId,
    memberId: null,
    provider: EMAIL_PROVIDER,
    to: email,
    subject: 'PlayDrama Studio login code',
    inviteUrl: APP_BASE_URL,
    role: 'auth',
    code,
    expiresAt,
    status: EMAIL_PROVIDER === 'log' ? 'logged' : 'queued',
    createdAt: now(),
    updatedAt: now(),
  }
  return deliverEmailMessage(message)
}

async function sendAuthCodeSms({ phone, code, expiresAt }) {
  const workspaceId = firstWorkspaceForUser(user.id)?.id || workspace.id
  const message = {
    id: `sms_${randomUUID()}`,
    kind: 'auth-code',
    workspaceId,
    memberId: null,
    provider: SMS_PROVIDER,
    to: phone,
    code,
    expiresAt,
    status: SMS_PROVIDER === 'log' ? 'logged' : 'queued',
    createdAt: now(),
    updatedAt: now(),
  }

  if (SMS_PROVIDER === 'tencent-sms' || SMS_PROVIDER === 'log') {
    return sendTencentSms(message)
  }

  return {
    ...message,
    status: 'failed',
    providerMessageId: null,
    errorMessage: `Unsupported SMS_PROVIDER: ${SMS_PROVIDER}`,
    updatedAt: now(),
  }
}

async function updateInviteDelivery(actorUserId, workspaceId, deliveryId, input) {
  const delivery = inviteEmailDeliveries.find(
    (item) => item.id === deliveryId && item.workspaceId === workspaceId,
  )
  if (!delivery) {
    throw new Error('delivery_not_found')
  }

  const status = EMAIL_DELIVERY_STATUSES.includes(input.status)
    ? input.status
    : delivery.status
  delivery.status = status
  delivery.providerMessageId = input.providerMessageId || delivery.providerMessageId || null
  delivery.errorMessage = input.errorMessage || null
  delivery.updatedAt = now()

  recordAudit(actorUserId, 'invite_email.updated', 'invite_email', delivery.id, {
    status: delivery.status,
    provider: delivery.provider,
    to: delivery.to,
  })
  await saveDatabase()
  return delivery
}

function normalizeEmailDeliveryStatus(status) {
  const value = String(status || '').trim().toLowerCase()
  const statusMap = {
    delivered: 'sent',
    delivery: 'sent',
    accepted: 'queued',
    queued: 'queued',
    sent: 'sent',
    failed: 'failed',
    failure: 'failed',
    rejected: 'failed',
    bounce: 'bounced',
    bounced: 'bounced',
  }
  return statusMap[value] || null
}

function safeEqualText(left, right) {
  const leftBuffer = Buffer.from(String(left || ''))
  const rightBuffer = Buffer.from(String(right || ''))
  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }
  return timingSafeEqual(leftBuffer, rightBuffer)
}

function normalizeSignature(signature) {
  return String(signature || '').replace(/^sha256=/i, '').trim()
}

function expectedEmailCallbackSignature(rawBody) {
  return createHmac('sha256', EMAIL_CALLBACK_SECRET).update(rawBody).digest('hex')
}

function isValidEmailCallback(req, rawBody = '') {
  if (!EMAIL_CALLBACK_SECRET) {
    return true
  }

  if (EMAIL_CALLBACK_SIGNATURE_MODE === 'hmac-sha256') {
    const signature =
      req.headers['x-playdrama-signature'] ||
      req.headers['x-email-signature'] ||
      req.headers['x-signature'] ||
      ''
    return safeEqualText(
      normalizeSignature(signature),
      expectedEmailCallbackSignature(rawBody),
    )
  }

  const headerSecret =
    req.headers['x-email-callback-secret'] ||
    req.headers['x-playdrama-email-secret'] ||
    ''
  const authorization = req.headers.authorization || ''
  const bearerSecret = authorization.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : ''
  return safeEqualText(headerSecret, EMAIL_CALLBACK_SECRET) ||
    safeEqualText(bearerSecret, EMAIL_CALLBACK_SECRET)
}

async function updateInviteDeliveryFromCallback(provider, input) {
  const status = normalizeEmailDeliveryStatus(input.status || input.event || input.type)
  if (!status) {
    throw new Error('invalid_delivery_status')
  }

  const providerMessageId = input.providerMessageId || input.messageId || input.id || ''
  const deliveryId = input.deliveryId || input.delivery_id || ''
  const workspaceId = input.workspaceId || input.workspace_id || ''

  const delivery = inviteEmailDeliveries.find((item) => {
    const providerMatches = !provider || item.provider === provider
    const idMatches =
      (deliveryId && item.id === deliveryId) ||
      (providerMessageId && item.providerMessageId === providerMessageId)
    const workspaceMatches = !workspaceId || item.workspaceId === workspaceId
    return providerMatches && idMatches && workspaceMatches
  })

  if (!delivery) {
    throw new Error('delivery_not_found')
  }

  delivery.status = status
  delivery.errorMessage = input.errorMessage || input.reason || input.error || null
  delivery.updatedAt = now()

  recordAudit('system:email-callback', 'invite_email.callback', 'invite_email', delivery.id, {
    status: delivery.status,
    provider: delivery.provider,
    to: delivery.to,
    providerMessageId: delivery.providerMessageId,
  })
  await saveDatabase()
  return delivery
}

function currentSession(userId = activeUserId, workspaceId) {
  const currentUser = users.get(userId) || user
  const fallbackWorkspace = firstWorkspaceForUser(currentUser.id) || workspace
  const currentWorkspace = workspaces.get(workspaceId) || workspace
  const visibleWorkspace =
    memberships.some(
      (item) =>
        item.userId === currentUser.id &&
        item.workspaceId === currentWorkspace.id &&
        (item.status || 'active') === 'active',
    )
      ? currentWorkspace
      : fallbackWorkspace
  const membership =
    memberships.find(
      (item) => item.userId === currentUser.id && item.workspaceId === visibleWorkspace.id,
    ) || defaultMembership

  return {
    user: currentUser,
    workspace: visibleWorkspace,
    membership,
  }
}

function can(userId, workspaceId, permission) {
  return memberships.some(
    (item) =>
      item.userId === userId &&
      item.workspaceId === workspaceId &&
      (item.status || 'active') === 'active' &&
      item.permissions.includes(permission),
  )
}

function forbidden(res) {
  sendJson(res, 403, { error: 'forbidden' })
}

function unauthorized(res) {
  sendJson(res, 401, { error: 'unauthorized' })
}

function recordAudit(userId, action, targetType, targetId, metadata = {}) {
  const session = currentSession(userId)
  const entry = {
    id: `aud_${randomUUID()}`,
    userId: session.user.id,
    workspaceId: session.workspace.id,
    action,
    targetType,
    targetId,
    metadata,
    createdAt: now(),
  }
  auditLog.push(entry)
  if (auditLog.length > 500) auditLog.splice(0, auditLog.length - 500)
  return entry
}

async function requestEmailLoginCode(input) {
  if (AUTH_PROVIDER !== 'email-code') {
    const error = new Error('email_code_auth_not_enabled')
    error.statusCode = 409
    throw error
  }
  if (!AUTH_EMAIL_CODE_READY) {
    const error = new Error('email_code_auth_not_ready')
    error.statusCode = 503
    throw error
  }

  const email = normalizeEmail(input.email)
  if (!isValidEmail(email)) {
    const error = new Error('invalid_email')
    error.statusCode = 422
    throw error
  }

  pruneAuthArtifacts()
  const recentPendingCodes = authEmailCodes.filter(
    (item) =>
      item.email === email &&
      item.status === 'pending' &&
      new Date(item.createdAt).getTime() > Date.now() - 10 * 60_000,
  )
  if (recentPendingCodes.length >= 3) {
    const error = new Error('too_many_auth_codes')
    error.statusCode = 429
    throw error
  }

  for (const item of authEmailCodes) {
    if (item.email === email && item.status === 'pending') {
      item.status = 'superseded'
    }
  }

  const code = generateEmailCode()
  const expiresAt = new Date(Date.now() + AUTH_EMAIL_CODE_TTL_MINUTES * 60_000).toISOString()
  const authCode = {
    id: `acode_${randomUUID()}`,
    email,
    codeHash: hashEmailCode(email, code),
    purpose: 'login',
    status: 'pending',
    attempts: 0,
    expiresAt,
    consumedAt: null,
    metadata: {
      requestedFrom: 'api',
      displayName: String(input.displayName || '').trim() || null,
    },
    createdAt: now(),
  }
  authEmailCodes.push(authCode)
  const delivery = await sendAuthCodeEmail({ email, code, expiresAt })
  await saveDatabase()

  return {
    ok: true,
    provider: AUTH_PROVIDER,
    email,
    expiresAt,
    delivery: {
      provider: delivery.provider,
      status: delivery.status,
      providerMessageId: delivery.providerMessageId || null,
      errorMessage: delivery.errorMessage || null,
    },
    ...(AUTH_EMAIL_CODE_DEV_REVEAL ? { debugCode: code } : {}),
  }
}

async function verifyEmailLoginCode(input) {
  if (AUTH_PROVIDER !== 'email-code') {
    const error = new Error('email_code_auth_not_enabled')
    error.statusCode = 409
    throw error
  }

  const email = normalizeEmail(input.email)
  const code = String(input.code || '').trim()
  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    const error = new Error('invalid_email_code')
    error.statusCode = 422
    throw error
  }

  pruneAuthArtifacts()
  const authCode = authEmailCodes
    .filter((item) => item.email === email && item.status === 'pending')
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0]

  if (!authCode) {
    const error = new Error('email_code_not_found')
    error.statusCode = 401
    throw error
  }
  if (new Date(authCode.expiresAt).getTime() < Date.now()) {
    authCode.status = 'expired'
    await saveDatabase()
    const error = new Error('email_code_expired')
    error.statusCode = 401
    throw error
  }
  if (authCode.attempts >= 5) {
    authCode.status = 'locked'
    await saveDatabase()
    const error = new Error('email_code_locked')
    error.statusCode = 429
    throw error
  }
  if (!safeEqualText(authCode.codeHash, hashEmailCode(email, code))) {
    authCode.attempts += 1
    await saveDatabase()
    const error = new Error('email_code_mismatch')
    error.statusCode = 401
    throw error
  }

  authCode.status = 'consumed'
  authCode.consumedAt = now()
  const { user: nextUser, existing } = ensureUserWorkspace(email, input.displayName)
  const authToken = issueAuthToken(nextUser.id, 'email-code')
  recordAudit(nextUser.id, existing ? 'auth.email_code_login' : 'auth.email_code_signup', 'user', nextUser.id, {
    email: nextUser.email,
    provider: 'email-code',
  })
  await saveDatabase()

  return {
    session: currentSession(nextUser.id, input.workspaceId),
    authToken,
  }
}

async function requestSmsLoginCode(input) {
  if (AUTH_PROVIDER !== 'sms-code') {
    const error = new Error('sms_code_auth_not_enabled')
    error.statusCode = 409
    throw error
  }
  if (!AUTH_SMS_CODE_READY) {
    const error = new Error('sms_code_auth_not_ready')
    error.statusCode = 503
    throw error
  }

  const phone = normalizePhone(input.phone)
  if (!isValidPhone(phone)) {
    const error = new Error('invalid_phone')
    error.statusCode = 422
    throw error
  }

  pruneAuthArtifacts()
  const recentPendingCodes = authSmsCodes.filter(
    (item) =>
      item.phone === phone &&
      item.status === 'pending' &&
      new Date(item.createdAt).getTime() > Date.now() - 10 * 60_000,
  )
  if (recentPendingCodes.length >= 3) {
    const error = new Error('too_many_sms_auth_codes')
    error.statusCode = 429
    throw error
  }

  for (const item of authSmsCodes) {
    if (item.phone === phone && item.status === 'pending') {
      item.status = 'superseded'
    }
  }

  const code = generateSmsCode()
  const expiresAt = new Date(Date.now() + AUTH_SMS_CODE_TTL_MINUTES * 60_000).toISOString()
  const authCode = {
    id: `scode_${randomUUID()}`,
    phone,
    codeHash: hashSmsCode(phone, code),
    purpose: 'login',
    status: 'pending',
    attempts: 0,
    expiresAt,
    consumedAt: null,
    metadata: {
      requestedFrom: 'api',
      displayName: String(input.displayName || '').trim() || null,
    },
    createdAt: now(),
  }
  authSmsCodes.push(authCode)
  await persistAuthSmsCode(authCode)

  const delivery = await sendAuthCodeSms({ phone, code, expiresAt })
  authCode.metadata.delivery = {
    provider: delivery.provider,
    status: delivery.status,
    providerMessageId: delivery.providerMessageId || null,
    errorMessage: delivery.errorMessage || null,
  }
  if (!shouldKeepSmsCodeVerifiable(delivery)) {
    authCode.status = 'delivery_failed'
  }
  await persistAuthSmsCode(authCode)

  return {
    ok: true,
    provider: AUTH_PROVIDER,
    phone,
    expiresAt,
    delivery: authCode.metadata.delivery,
    canVerify: authCode.status === 'pending',
    ...(AUTH_SMS_CODE_DEV_REVEAL ? { debugCode: code } : {}),
  }
}

async function verifySmsLoginCode(input) {
  if (AUTH_PROVIDER !== 'sms-code') {
    const error = new Error('sms_code_auth_not_enabled')
    error.statusCode = 409
    throw error
  }

  const phone = normalizePhone(input.phone)
  const code = String(input.code || '').trim()
  if (!isValidPhone(phone) || !/^\d{6}$/.test(code)) {
    const error = new Error('invalid_sms_code')
    error.statusCode = 422
    throw error
  }

  pruneAuthArtifacts()
  const authCode = authSmsCodes
    .filter((item) => item.phone === phone && item.status === 'pending')
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0]

  if (!authCode) {
    const error = new Error('sms_code_not_found')
    error.statusCode = 401
    throw error
  }
  if (new Date(authCode.expiresAt).getTime() < Date.now()) {
    authCode.status = 'expired'
    await persistAuthSmsCode(authCode)
    const error = new Error('sms_code_expired')
    error.statusCode = 401
    throw error
  }
  if (authCode.attempts >= 5) {
    authCode.status = 'locked'
    await persistAuthSmsCode(authCode)
    const error = new Error('sms_code_locked')
    error.statusCode = 429
    throw error
  }
  if (!safeEqualText(authCode.codeHash, hashSmsCode(phone, code))) {
    authCode.attempts += 1
    await persistAuthSmsCode(authCode)
    const error = new Error('sms_code_mismatch')
    error.statusCode = 401
    throw error
  }

  authCode.status = 'consumed'
  authCode.consumedAt = now()
  const { user: nextUser, existing } = ensurePhoneUserWorkspace(phone, input.displayName)
  const { token: authToken, session: authSession } = issueAuthTokenWithSession(nextUser.id, 'sms-code')
  const auditEntry = recordAudit(nextUser.id, existing ? 'auth.sms_code_login' : 'auth.sms_code_signup', 'user', nextUser.id, {
    phone,
    provider: 'sms-code',
  })
  await persistAuthSmsCode(authCode)
  await persistSmsLoginSuccess({ user: nextUser, authSession, auditEntry })

  return {
    session: currentSession(nextUser.id, input.workspaceId),
    authToken,
  }
}

async function loginUser(input) {
  const email = String(input.email || '').trim().toLowerCase()
  if (!email || !email.includes('@')) {
    throw new Error('invalid_email')
  }

  const displayName =
    String(input.displayName || '').trim() || email.split('@')[0] || 'Creator'
  const existingUser = [...users.values()].find(
    (item) => String(item.email).toLowerCase() === email,
  )
  const nextUser =
    existingUser ||
    {
      id: `usr_${randomUUID()}`,
      displayName,
      email,
      role: 'owner',
      avatarInitials: initialsFromEmail(email),
      createdAt: now(),
    }

  if (existingUser && displayName && existingUser.displayName !== displayName) {
    existingUser.displayName = displayName
    existingUser.avatarInitials = initialsFromEmail(email)
  }

  users.set(nextUser.id, nextUser)

  const hasMembership = memberships.some((item) => item.userId === nextUser.id)
  if (!hasMembership) {
    const personalWorkspace = {
      id: `wks_${randomUUID()}`,
      name: `${displayName} 的创作工作区`,
      plan: 'creator',
      ownerUserId: nextUser.id,
      createdAt: now(),
    }
    workspaces.set(personalWorkspace.id, personalWorkspace)
    memberships.push({
      id: `mem_${randomUUID()}`,
      userId: nextUser.id,
      workspaceId: personalWorkspace.id,
      role: 'owner',
      permissions: rolePresets.owner,
      joinedAt: now(),
      status: 'active',
    })
  }

  const authToken = `tok_${randomUUID()}`
  localSessions.set(authToken, nextUser.id)
  recordAudit(nextUser.id, existingUser ? 'auth.login' : 'auth.signup', 'user', nextUser.id, {
    email: nextUser.email,
  })
  await saveDatabase()
  return {
    session: currentSession(nextUser.id, input.workspaceId),
    authToken,
  }
}

async function logoutUser(req) {
  const userId = await requestUserId(req)
  revokeAuthToken(req)
  if (userId) {
    recordAudit(userId, 'auth.logout', 'user', userId, {})
  }
  await saveDatabase()
  return currentSession(user.id)
}

function initialsFromEmail(email) {
  const name = String(email || 'ai-user').split('@')[0]
  return name
    .split(/[._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'AI'
}

async function inviteMember(actorUserId, workspaceId, input) {
  const email = String(input.email || '').trim().toLowerCase()
  const role = rolePresets[input.role] ? input.role : 'viewer'

  if (!email || !email.includes('@')) {
    throw new Error('invalid_email')
  }

  const existingUser = [...users.values()].find(
    (item) => String(item.email).toLowerCase() === email,
  )
  const invitedUser =
    existingUser ||
    {
      id: `usr_${randomUUID()}`,
      displayName: input.displayName || email.split('@')[0],
      email,
      role,
      avatarInitials: initialsFromEmail(email),
      createdAt: now(),
    }

  users.set(invitedUser.id, invitedUser)

  const existingMembership = memberships.find(
    (item) => item.workspaceId === workspaceId && item.userId === invitedUser.id,
  )
  const inviteToken = existingMembership?.inviteToken || `inv_${randomUUID()}`
  const invitedAt = existingMembership?.invitedAt || now()
  const inviteExpiresAt =
    existingMembership?.inviteExpiresAt || addDays(new Date(invitedAt), INVITE_EXPIRES_DAYS)
  const membership = {
    id: existingMembership?.id || `mem_${randomUUID()}`,
    userId: invitedUser.id,
    workspaceId,
    role,
    permissions: rolePresets[role],
    joinedAt: existingMembership?.joinedAt || now(),
    invitedAt,
    inviteToken,
    inviteExpiresAt,
    acceptedAt: existingMembership?.acceptedAt || null,
    status: existingMembership?.status === 'active' ? 'active' : 'invited',
  }

  if (existingMembership) {
    Object.assign(existingMembership, membership)
  } else {
    memberships.push(membership)
  }

  const inviteUrl = `${APP_BASE_URL}/?invite=${encodeURIComponent(inviteToken)}`
  const emailDelivery = await sendInviteEmail({
    workspaceId,
    memberId: membership.id,
    email,
    inviteUrl,
    workspaceName: workspaces.get(workspaceId)?.name || 'PlayDrama Studio',
    role,
    expiresAt: inviteExpiresAt,
  })

  recordAudit(actorUserId, existingMembership ? 'member.updated' : 'member.invited', 'member', membership.id, {
    email,
    role,
    inviteExpiresAt,
    emailProvider: EMAIL_PROVIDER,
  })
  await saveDatabase()

  return {
    ...membership,
    user: invitedUser,
    inviteUrl,
    emailDelivery,
  }
}

async function acceptInvitation(token) {
  const inviteToken = String(token || '').trim()
  const membership = memberships.find((item) => item.inviteToken === inviteToken)
  if (!membership) {
    throw new Error('invalid_invite')
  }
  if (membership.status !== 'invited') {
    throw new Error('invite_not_pending')
  }
  if (membership.inviteExpiresAt && new Date(membership.inviteExpiresAt).getTime() < Date.now()) {
    throw new Error('invite_expired')
  }

  membership.status = 'active'
  membership.acceptedAt = now()
  const invitedUser = users.get(membership.userId)
  const authToken = issueAuthToken(membership.userId)
  recordAudit(membership.userId, 'member.accepted', 'member', membership.id, {
    workspaceId: membership.workspaceId,
  })
  await saveDatabase()

  return {
    session: currentSession(membership.userId, membership.workspaceId),
    authToken,
    member: {
      ...membership,
      user: invitedUser,
    },
  }
}

async function resendInvitation(actorUserId, workspaceId, memberId) {
  const membership = memberships.find(
    (item) => item.id === memberId && item.workspaceId === workspaceId,
  )
  if (!membership) {
    throw new Error('member_not_found')
  }
  if (membership.status !== 'invited') {
    throw new Error('invite_not_pending')
  }

  const invitedUser = users.get(membership.userId)
  if (!invitedUser) {
    throw new Error('user_not_found')
  }

  membership.inviteToken = `inv_${randomUUID()}`
  membership.invitedAt = now()
  membership.inviteExpiresAt = addDays(new Date(), INVITE_EXPIRES_DAYS)
  const inviteUrl = `${APP_BASE_URL}/?invite=${encodeURIComponent(membership.inviteToken)}`
  const emailDelivery = await sendInviteEmail({
    workspaceId,
    memberId: membership.id,
    email: invitedUser.email,
    inviteUrl,
    workspaceName: workspaces.get(workspaceId)?.name || 'PlayDrama Studio',
    role: membership.role,
    expiresAt: membership.inviteExpiresAt,
  })

  recordAudit(actorUserId, 'member.invite_resent', 'member', membership.id, {
    email: invitedUser.email,
    role: membership.role,
    inviteExpiresAt: membership.inviteExpiresAt,
    emailProvider: EMAIL_PROVIDER,
  })
  await saveDatabase()

  return {
    ...membership,
    user: invitedUser,
    inviteUrl,
    emailDelivery,
  }
}

async function cancelInvitation(actorUserId, workspaceId, memberId) {
  const membership = memberships.find(
    (item) => item.id === memberId && item.workspaceId === workspaceId,
  )
  if (!membership) {
    throw new Error('member_not_found')
  }
  if (membership.status !== 'invited') {
    throw new Error('invite_not_pending')
  }

  const invitedUser = users.get(membership.userId)
  membership.status = 'cancelled'
  membership.inviteToken = null
  membership.inviteExpiresAt = null
  recordAudit(actorUserId, 'member.invite_cancelled', 'member', membership.id, {
    email: invitedUser?.email,
    role: membership.role,
  })
  await saveDatabase()

  return {
    ...membership,
    user: invitedUser,
  }
}

async function createWorkspace(actorUserId, input) {
  const owner = users.get(actorUserId) || user
  const nextWorkspace = {
    id: `wks_${randomUUID()}`,
    name: String(input.name || 'New creator workspace').trim() || 'New creator workspace',
    plan: input.plan || 'creator',
    ownerUserId: owner.id,
    createdAt: now(),
  }
  const membership = {
    id: `mem_${randomUUID()}`,
    userId: owner.id,
    workspaceId: nextWorkspace.id,
    role: 'owner',
    permissions: rolePresets.owner,
    joinedAt: now(),
    status: 'active',
  }

  workspaces.set(nextWorkspace.id, nextWorkspace)
  memberships.push(membership)
  recordAudit(owner.id, 'workspace.created', 'workspace', nextWorkspace.id, {
    name: nextWorkspace.name,
  })
  await saveDatabase()

  return { workspace: nextWorkspace, membership }
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers':
      'content-type,authorization,x-email-callback-secret,x-playdrama-email-secret,x-playdrama-signature,x-email-signature,x-signature,wechatpay-timestamp,wechatpay-nonce,wechatpay-signature,wechatpay-serial',
  })
  res.end(body)
}

function sendText(res, status, body) {
  res.writeHead(status, {
    'content-type': 'text/plain; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers':
      'content-type,authorization,x-email-callback-secret,x-playdrama-email-secret,x-playdrama-signature,x-email-signature,x-signature,wechatpay-timestamp,wechatpay-nonce,wechatpay-signature,wechatpay-serial',
  })
  res.end(body)
}

function legalPageHtml(page) {
  const nav = [
    ['/privacy', '隐私政策'],
    ['/terms', '用户协议'],
    ['/content-policy', '内容规范'],
    ['/complaint', '侵权投诉'],
    ['/studio', '进入工作台'],
  ]
  const sections = page.sections
    .map(
      (section) => `
        <section>
          <h2>${escapeHtml(section.heading)}</h2>
          <ul>
            ${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </section>`,
    )
    .join('')

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(page.title)} | PlayDrama Studio</title>
    <style>
      :root { color-scheme: light; font-family: Inter, "Microsoft YaHei", "PingFang SC", system-ui, sans-serif; color: #172033; background: #f5f7fb; }
      body { margin: 0; }
      header { background: #101827; color: #fff; }
      .wrap { width: min(960px, calc(100% - 32px)); margin: 0 auto; }
      .top { display: flex; align-items: center; justify-content: space-between; gap: 18px; min-height: 72px; }
      .brand { display: flex; flex-direction: column; gap: 4px; }
      .brand strong { font-size: 18px; }
      .brand span { color: #b6c3d6; font-size: 13px; }
      nav { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px; }
      nav a { color: #d8e4f5; text-decoration: none; font-size: 13px; padding: 8px 10px; border: 1px solid rgba(255,255,255,.16); border-radius: 6px; }
      main { padding: 42px 0 64px; }
      h1 { margin: 0 0 12px; font-size: clamp(28px, 5vw, 42px); line-height: 1.15; letter-spacing: 0; }
      .summary { margin: 0 0 12px; max-width: 760px; color: #42526b; font-size: 16px; line-height: 1.8; }
      .date { color: #6a768a; font-size: 13px; margin-bottom: 28px; }
      section { background: #fff; border: 1px solid #dfe5ee; border-radius: 8px; padding: 22px; margin-top: 16px; box-shadow: 0 12px 30px rgba(25, 35, 52, .06); }
      h2 { margin: 0 0 12px; font-size: 20px; letter-spacing: 0; }
      ul { margin: 0; padding-left: 22px; color: #2d3a50; line-height: 1.85; }
      li + li { margin-top: 8px; }
      footer { border-top: 1px solid #dfe5ee; padding: 22px 0 34px; color: #6a768a; font-size: 13px; }
      @media (max-width: 720px) {
        .top { align-items: flex-start; flex-direction: column; padding: 18px 0; }
        nav { justify-content: flex-start; }
        section { padding: 18px; }
      }
    </style>
  </head>
  <body>
    <header>
      <div class="wrap top">
        <div class="brand">
          <strong>PlayDrama Studio</strong>
          <span>互动短剧创作、发布和变现工作台</span>
        </div>
        <nav>
          ${nav.map(([href, label]) => `<a href="${href}">${escapeHtml(label)}</a>`).join('')}
        </nav>
      </div>
    </header>
    <main class="wrap">
      <h1>${escapeHtml(page.title)}</h1>
      <p class="summary">${escapeHtml(page.summary)}</p>
      <div class="date">更新日期：${escapeHtml(page.updatedAt)}</div>
      ${sections}
    </main>
    <footer>
      <div class="wrap">PlayDrama Studio 内测合规文本。正式商用主体、备案信息和专用联系方式将在正式域名启用后同步展示。</div>
    </footer>
  </body>
</html>`
}

function sendHtml(res, status, body) {
  res.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-cache',
    'x-content-type-options': 'nosniff',
  })
  res.end(body)
}

function sendLegalPage(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false
  const page = LEGAL_PAGES[url.pathname]
  if (!page) return false

  sendHtml(res, 200, req.method === 'HEAD' ? '' : legalPageHtml(page))
  return true
}

function notFound(res) {
  sendJson(res, 404, { error: 'not_found' })
}

const MAX_BODY_SIZE = 10 * 1024 * 1024 // 10MB

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    // Pre-check Content-Length header to reject oversized requests early
    const contentLength = parseInt(req.headers['content-length'] || '0', 10)
    if (contentLength > MAX_BODY_SIZE) {
      reject(new Error('request_too_large'))
      req.destroy()
      return
    }

    let raw = ''
    let sizeExceeded = false
    req.on('data', (chunk) => {
      if (sizeExceeded) return
      raw += chunk
      if (raw.length > MAX_BODY_SIZE) {
        sizeExceeded = true
        reject(new Error('request_too_large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      if (!sizeExceeded) resolve(raw)
    })
    req.on('error', (err) => {
      if (!sizeExceeded) reject(err)
    })
  })
}

function parseJsonBody(raw) {
  if (!raw) {
    return {}
  }
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error('invalid_json')
  }
}

async function readBody(req) {
  return parseJsonBody(await readRawBody(req))
}

function publicRequestMetadata(req) {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)[0]
  return {
    ip: forwardedFor || req.socket?.remoteAddress || '',
    userAgent: String(req.headers['user-agent'] || ''),
    referer: String(req.headers.referer || ''),
  }
}

function normalizeMarketingLead(input, req) {
  const name = String(input.name || '').trim()
  const company = String(input.company || '').trim()
  const role = String(input.role || '').trim()
  const phone = normalizePhone(input.phone || '')
  const email = normalizeEmail(input.email || '')
  const scenario = String(input.scenario || '').trim()
  const message = String(input.message || '').trim()
  const source = String(input.source || '').trim() || 'landing-page'

  if (name.length < 2) {
    const error = new Error('name_required')
    error.statusCode = 422
    throw error
  }

  if (!phone && !email) {
    const error = new Error('contact_required')
    error.statusCode = 422
    throw error
  }

  if (email && !isValidEmail(email)) {
    const error = new Error('invalid_email')
    error.statusCode = 422
    throw error
  }

  if (phone && !isValidPhone(phone)) {
    const error = new Error('invalid_phone')
    error.statusCode = 422
    throw error
  }

  return {
    id: `lead_${randomUUID()}`,
    name,
    company,
    role,
    phone,
    email,
    scenario,
    message: message.slice(0, 1200),
    source: source.slice(0, 120),
    status: 'new',
    notification: null,
    metadata: publicRequestMetadata(req),
    createdAt: now(),
    updatedAt: now(),
  }
}

async function ensureMarketingLeadsTable() {
  if (STORAGE_DRIVER !== 'postgres') return

  const pool = await getPgPool()
  await pool.query(`
    create table if not exists marketing_leads (
      id text primary key,
      name text not null,
      company text not null default '',
      role text not null default '',
      phone text not null default '',
      email text not null default '',
      scenario text not null default '',
      message text not null default '',
      source text not null default 'landing-page',
      status text not null default 'new',
      notification jsonb not null default '{}'::jsonb,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `)
  await pool.query(`
    create index if not exists idx_marketing_leads_created
      on marketing_leads (created_at desc)
  `)
  await pool.query(`
    create index if not exists idx_marketing_leads_status
      on marketing_leads (status, created_at desc)
  `)
}

async function persistMarketingLead(lead) {
  if (STORAGE_DRIVER !== 'postgres') {
    marketingLeads.push(lead)
    await saveDatabase()
    return lead
  }

  await ensureMarketingLeadsTable()
  const pool = await getPgPool()
  await pool.query(
    `insert into marketing_leads
      (id, name, company, role, phone, email, scenario, message, source, status, notification, metadata, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13, $14)`,
    [
      lead.id,
      lead.name,
      lead.company,
      lead.role,
      lead.phone,
      lead.email,
      lead.scenario,
      lead.message,
      lead.source,
      lead.status,
      JSON.stringify(lead.notification || {}),
      JSON.stringify(lead.metadata || {}),
      lead.createdAt,
      lead.updatedAt,
    ],
  )
  return lead
}

async function updateMarketingLeadNotification(lead) {
  lead.updatedAt = now()
  if (STORAGE_DRIVER !== 'postgres') {
    await saveDatabase()
    return
  }

  await ensureMarketingLeadsTable()
  const pool = await getPgPool()
  await pool.query(
    `update marketing_leads
     set notification = $2::jsonb, updated_at = $3
     where id = $1`,
    [lead.id, JSON.stringify(lead.notification || {}), lead.updatedAt],
  )
}

async function sendMarketingLeadNotification(lead) {
  if (!PLAYDRAMA_LEAD_NOTIFY_EMAIL) {
    return {
      provider: EMAIL_PROVIDER,
      status: 'skipped',
      providerMessageId: null,
      errorMessage: 'PLAYDRAMA_LEAD_NOTIFY_EMAIL is not configured',
    }
  }

  const message = {
    id: `mail_${randomUUID()}`,
    kind: 'marketing-lead',
    workspaceId: firstWorkspaceForUser(user.id)?.id || workspace.id,
    memberId: null,
    provider: EMAIL_PROVIDER,
    to: PLAYDRAMA_LEAD_NOTIFY_EMAIL,
    subject: `PlayDrama lead: ${lead.company || lead.name}`,
    inviteUrl: APP_BASE_URL,
    role: 'marketing',
    lead,
    status: EMAIL_PROVIDER === 'log' ? 'logged' : 'queued',
    createdAt: now(),
    updatedAt: now(),
  }

  const delivery = await deliverEmailMessage(message)
  return {
    provider: delivery.provider,
    status: delivery.status,
    providerMessageId: delivery.providerMessageId || null,
    errorMessage: delivery.errorMessage || null,
  }
}

async function createMarketingLead(input, req) {
  const lead = normalizeMarketingLead(input, req)
  await persistMarketingLead(lead)
  lead.notification = await sendMarketingLeadNotification(lead)
  await updateMarketingLeadNotification(lead)
  return lead
}

async function listMarketingLeads() {
  if (STORAGE_DRIVER !== 'postgres') {
    return marketingLeads.slice().reverse()
  }

  await ensureMarketingLeadsTable()
  const pool = await getPgPool()
  const result = await pool.query(`
    select
      id,
      name,
      company,
      role,
      phone,
      email,
      scenario,
      message,
      source,
      status,
      notification,
      metadata,
      created_at as "createdAt",
      updated_at as "updatedAt"
    from marketing_leads
    order by created_at desc
    limit 200
  `)
  return result.rows
}

async function createProject(actorUserId, workspaceId, input) {
  const existingProject = input.id ? projects.get(input.id) : null
  const project = {
    id: input.id || `prj_${randomUUID()}`,
    workspaceId,
    title: input.title || 'Untitled interactive drama',
    template: input.template || 'Suspense template v1',
    publish: input.publish || {
      status: 'Draft',
      visibility: 'Private',
      category: 'Suspense interactive drama',
      audience: 'Short-drama creators / suspense players',
      monetization: 'Free',
      price: '0',
    },
    modelRouting: input.modelRouting || {
      market: 'China Mainland',
      defaultProvider: 'DeepSeek / Qwen / Doubao / GLM',
      openaiPolicy: 'Enabled for development',
      contentSafety: 'Required',
      fallbackProvider: 'Kimi / MiniMax / Tencent Hunyuan',
    },
    nodes: input.nodes || [],
    variables: input.variables || [],
    characters: input.characters || [],
    lifecycleStatus: input.lifecycleStatus || existingProject?.lifecycleStatus || 'active',
    archivedAt: input.archivedAt || existingProject?.archivedAt || null,
    createdAt: existingProject?.createdAt || now(),
    updatedAt: now(),
  }
  projects.set(project.id, project)
  recordAudit(actorUserId, existingProject ? 'project.updated' : 'project.created', 'project', project.id, {
    title: project.title,
  })
  await saveDatabase()
  return project
}

const contentSafetyRules = [
  {
    category: 'minor-sexual-safety',
    severity: 'block',
    terms: ['儿童色情', '未成年性', '幼女性色情', '未成年人性行为', 'child sexual'],
    action: 'Remove sexual content involving minors.',
  },
  {
    category: 'sexual-violence',
    severity: 'block',
    terms: ['强奸', '强暴', '性侵细节', '迷奸'],
    action: 'Remove sexual violence details and keep only non-graphic background context.',
  },
  {
    category: 'self-harm-instruction',
    severity: 'block',
    terms: ['自杀教程', '自残教程', '如何自杀', '自杀方法'],
    action: 'Remove self-harm methods, steps, and encouragement.',
  },
  {
    category: 'illegal-instruction',
    severity: 'block',
    terms: ['制毒教程', '贩毒方法', '开锁教程', '盗号教程', '洗钱教程'],
    action: 'Remove illegal operation tutorials and executable steps.',
  },
  {
    category: 'graphic-violence',
    severity: 'review',
    terms: ['虐杀', '肢解', '血腥细节', '酷刑', '分尸'],
    action: 'Reduce graphic detail while retaining suspense atmosphere.',
  },
  {
    category: 'adult-sexual',
    severity: 'review',
    terms: ['色情', '露骨性爱', '裸露交易', '成人视频'],
    action: 'Rewrite as non-explicit and non-transactional expression.',
  },
  {
    category: 'regulated-risk',
    severity: 'review',
    terms: ['赌博引流', '诈骗话术', '高利贷引流', '代付套利'],
    action: 'Remove traffic diversion, inducement, and repeatable violation scripts.',
  },
  {
    category: 'fictional-suspense-context',
    severity: 'notice',
    terms: ['死亡结局', '失踪', '地下室', '旧医院', '病区'],
    action: 'Suspense context is allowed, but confirm it has no realistic harm instructions.',
  },
]

function addSafetySegment(segments, path, value) {
  const text = String(value || '').trim()
  if (text) segments.push({ path, text })
}

function collectProjectSafetySegments(project) {
  const segments = []
  addSafetySegment(segments, 'project.title', project.title)
  addSafetySegment(segments, 'project.template', project.template)
  addSafetySegment(segments, 'publish.category', project.publish?.category)
  addSafetySegment(segments, 'publish.audience', project.publish?.audience)

  for (const [nodeIndex, node] of (project.nodes || []).entries()) {
    const nodePath = `nodes.${nodeIndex}.${node.id || nodeIndex}`
    addSafetySegment(segments, `${nodePath}.title`, node.title)
    addSafetySegment(segments, `${nodePath}.kind`, node.kind)
    addSafetySegment(segments, `${nodePath}.summary`, node.summary)
    addSafetySegment(segments, `${nodePath}.metric`, node.metric)
    for (const [choiceIndex, choice] of (node.choices || []).entries()) {
      addSafetySegment(segments, `${nodePath}.choices.${choiceIndex}.label`, choice.label)
      addSafetySegment(segments, `${nodePath}.choices.${choiceIndex}.condition`, choice.condition)
    }
  }

  for (const [characterIndex, character] of (project.characters || []).entries()) {
    addSafetySegment(segments, `characters.${characterIndex}.name`, character.name)
    addSafetySegment(segments, `characters.${characterIndex}.role`, character.role)
    addSafetySegment(segments, `characters.${characterIndex}.trait`, character.trait)
  }

  for (const [variableIndex, variable] of (project.variables || []).entries()) {
    addSafetySegment(segments, `variables.${variableIndex}.label`, variable.label)
    addSafetySegment(segments, `variables.${variableIndex}.defaultValue`, variable.defaultValue)
  }

  return segments
}

function safetySnippet(text, term) {
  const index = text.toLowerCase().indexOf(term.toLowerCase())
  if (index === -1) return text.slice(0, 80)
  const start = Math.max(0, index - 24)
  const end = Math.min(text.length, index + term.length + 32)
  return text.slice(start, end)
}

function evaluateProjectContentSafety(project) {
  const segments = collectProjectSafetySegments(project)
  const flags = []
  const matched = new Set()

  for (const segment of segments) {
    const normalized = segment.text.toLowerCase()
    for (const rule of contentSafetyRules) {
      for (const term of rule.terms) {
        if (!normalized.includes(term.toLowerCase())) continue
        const key = `${rule.category}:${rule.severity}:${segment.path}:${term}`
        if (matched.has(key)) continue
        matched.add(key)
        flags.push({
          id: `flg_${createHash('sha1').update(key).digest('hex').slice(0, 12)}`,
          category: rule.category,
          severity: rule.severity,
          term,
          path: segment.path,
          snippet: safetySnippet(segment.text, term),
          action: rule.action,
        })
      }
    }
  }

  const blockingCount = flags.filter((item) => item.severity === 'block').length
  const reviewCount = flags.filter((item) => item.severity === 'review').length
  const noticeCount = flags.filter((item) => item.severity === 'notice').length
  const status =
    blockingCount > 0 ? 'blocked' : reviewCount > 0 ? 'needs_review' : 'passed'

  return {
    status,
    passed: blockingCount === 0,
    flagCount: flags.length,
    blockingCount,
    reviewCount,
    noticeCount,
    flags: flags.slice(0, 40),
    summary: {
      scannedFields: segments.length,
      nodeCount: Array.isArray(project.nodes) ? project.nodes.length : 0,
      characterCount: Array.isArray(project.characters) ? project.characters.length : 0,
      policy: CONTENT_SAFETY_POLICY_VERSION,
    },
  }
}

function recordContentSafetyReview(actorUserId, project) {
  const evaluation = evaluateProjectContentSafety(project)
  const review = {
    id: `csr_${randomUUID()}`,
    workspaceId: project.workspaceId || currentSession(actorUserId).workspace.id,
    projectId: project.id,
    provider: CONTENT_SAFETY_PROVIDER === 'manual' ? 'local-rules' : CONTENT_SAFETY_PROVIDER,
    policyVersion: CONTENT_SAFETY_POLICY_VERSION,
    ...evaluation,
    createdAt: now(),
  }

  contentSafetyReviews.push(review)
  if (contentSafetyReviews.length > 1000) {
    contentSafetyReviews.splice(0, contentSafetyReviews.length - 1000)
  }
  recordAudit(actorUserId, 'content_safety.scanned', 'content_safety', review.id, {
    workspaceId: review.workspaceId,
    projectId: review.projectId,
    provider: review.provider,
    status: review.status,
    flagCount: review.flagCount,
    blockingCount: review.blockingCount,
    reviewCount: review.reviewCount,
  })
  return review
}

async function createBuild(actorUserId, project) {
  const safetyReview = recordContentSafetyReview(actorUserId, project)
  if (safetyReview.status === 'blocked') {
    await saveDatabase()
    const error = new Error('content_safety_blocked')
    error.statusCode = 422
    error.details = { review: safetyReview }
    throw error
  }

  const version =
    [...builds.values()].filter((build) => build.projectId === project.id).length + 1
  const build = {
    id: `bld_${randomUUID()}`,
    projectId: project.id,
    workspaceId: project.workspaceId,
    version,
    status: safetyReview.status === 'needs_review' ? 'review' : 'ready',
    visibility: project.publish?.visibility || 'Unlisted',
    runtimeUrl: `/play/${project.id}/${version}`,
    snapshot: structuredClone(project),
    contentSafety: {
      reviewId: safetyReview.id,
      status: safetyReview.status,
      flagCount: safetyReview.flagCount,
      blockingCount: safetyReview.blockingCount,
      reviewCount: safetyReview.reviewCount,
      noticeCount: safetyReview.noticeCount,
    },
    createdAt: now(),
  }
  builds.set(build.id, build)
  recordAudit(actorUserId, 'build.created', 'build', build.id, {
    projectId: project.id,
    version: build.version,
    contentSafetyStatus: safetyReview.status,
    contentSafetyReviewId: safetyReview.id,
  })
  await saveDatabase()
  return build
}

function publishPriceCents(project) {
  const price = Number(String(project.publish?.price || '0').replace(/[^\d.]/g, ''))
  if (!Number.isFinite(price) || price <= 0) return 0
  return Math.round(price * 100)
}

function nodePaywallMode(project, node, endingIndex = 0) {
  if (project.publish?.monetization !== 'Paid Ending' || node?.kind !== 'Ending') return 'free'
  if (node.paywall === 'free' || node.paywall === 'paid') return node.paywall
  const marker = `${node.title || ''} ${node.summary || ''} ${node.metric || ''}`.toLowerCase()
  if (/免费|普通|基础|free/.test(marker)) return 'free'
  if (/付费|隐藏|解锁|彩蛋|vip|premium/.test(marker)) return 'paid'
  return endingIndex === 0 ? 'free' : 'paid'
}

function paidEndingNodeIds(project) {
  if (project.publish?.monetization !== 'Paid Ending') return []
  const endingNodes = (project.nodes || []).filter((node) => node.kind === 'Ending')
  return endingNodes
    .filter((node, index) => nodePaywallMode(project, node, index) === 'paid')
    .map((node) => node.id)
}

function configuredPaymentProviders() {
  const providers = String(PAYMENT_PROVIDER || '')
    .split(/[,\s;|]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .map((provider) => (provider === 'wxpay' || provider === 'wechat-pay' ? 'wechat' : provider))
    .filter((provider) => ['sandbox', 'alipay', 'wechat'].includes(provider))

  if (providers.length > 0) return [...new Set(providers)]
  return PAYMENT_PROVIDER === 'disabled' ? ['sandbox'] : ['sandbox']
}

function runtimePaymentProvider(requestedProvider = '') {
  const providers = configuredPaymentProviders()
  const requested = String(requestedProvider || '').trim().toLowerCase()
  if (requested && providers.includes(requested)) return requested
  return providers[0] || 'sandbox'
}

function normalizePemKey(value, type) {
  const raw = String(value || '').replace(/\\n/g, '\n').trim()
  if (!raw) return ''
  if (raw.includes('BEGIN ')) return raw
  const body = raw.replace(/\s+/g, '')
  const lines = body.match(/.{1,64}/g) || []
  return [`-----BEGIN ${type}-----`, ...lines, `-----END ${type}-----`].join('\n')
}

function readPemFromEnvOrPath(inlineValue, filePath, type) {
  if (inlineValue && String(inlineValue).trim()) {
    return normalizePemKey(inlineValue, type)
  }
  if (!filePath || !String(filePath).trim()) return ''
  const resolvedPath = isAbsolute(filePath) ? filePath : resolve(process.cwd(), filePath)
  if (!existsSync(resolvedPath)) return ''
  return normalizePemKey(readFileSync(resolvedPath, 'utf8'), type)
}

function paymentSubject(project) {
  const title = String(project?.title || 'PlayDrama 浠樿垂缁撳眬').trim()
  return title.slice(0, 96) || 'PlayDrama 浠樿垂缁撳眬'
}

function paymentTotalAmount(order) {
  return (Number(order.amount || 0) / 100).toFixed(2)
}

function createWechatOutTradeNo() {
  return `PD${Date.now().toString(36).toUpperCase()}${randomUUID()
    .replace(/-/g, '')
    .slice(0, 12)
    .toUpperCase()}`
}

function paymentOrderMatchesProviderId(order, provider, providerOrderId) {
  if (!order || order.provider !== provider) return false
  const metadata = order.metadata || {}
  return (
    order.id === providerOrderId ||
    metadata.providerOrderId === providerOrderId ||
    metadata.wechatOutTradeNo === providerOrderId ||
    metadata.checkout?.providerOrderId === providerOrderId ||
    metadata.checkout?.outTradeNo === providerOrderId
  )
}

function alipayTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function alipaySignContent(params, { excludeSignType = false } = {}) {
  return Object.keys(params)
    .filter(
      (key) =>
        key !== 'sign' &&
        (!excludeSignType || key !== 'sign_type') &&
        params[key] !== undefined &&
        params[key] !== null,
    )
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')
}

function signAlipayParams(params) {
  const privateKey = normalizePemKey(ALIPAY_PRIVATE_KEY, 'PRIVATE KEY')
  if (!ALIPAY_APP_ID || !privateKey) {
    const error = new Error('alipay_not_configured')
    error.statusCode = 409
    throw error
  }
  return createSign('RSA-SHA256')
    .update(alipaySignContent(params), 'utf8')
    .sign(privateKey, 'base64')
}

function createAlipayCheckout(order, project) {
  const params = {
    app_id: ALIPAY_APP_ID,
    method: 'alipay.trade.wap.pay',
    format: 'JSON',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: alipayTimestamp(),
    version: '1.0',
    notify_url: ALIPAY_NOTIFY_URL,
    return_url: ALIPAY_RETURN_URL,
    biz_content: JSON.stringify({
      out_trade_no: order.id,
      total_amount: paymentTotalAmount(order),
      subject: paymentSubject(project),
      product_code: 'QUICK_WAP_WAY',
    }),
  }
  const sign = signAlipayParams(params)
  const search = new URLSearchParams({ ...params, sign })
  return {
    provider: 'alipay',
    checkoutUrl: `${ALIPAY_GATEWAY}?${search.toString()}`,
    notifyUrl: ALIPAY_NOTIFY_URL,
    returnUrl: ALIPAY_RETURN_URL,
  }
}

function wechatPrivateKey() {
  return readPemFromEnvOrPath(
    WECHAT_PAY_PRIVATE_KEY,
    WECHAT_PAY_PRIVATE_KEY_PATH,
    'PRIVATE KEY',
  )
}

function wechatPlatformPublicKey() {
  return readPemFromEnvOrPath(
    WECHAT_PAY_PLATFORM_PUBLIC_KEY,
    WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH,
    'PUBLIC KEY',
  )
}

function assertWechatConfigured() {
  if (
    !WECHAT_PAY_MCH_ID ||
    !WECHAT_PAY_APP_ID ||
    !WECHAT_PAY_API_V3_KEY ||
    !WECHAT_PAY_SERIAL_NO ||
    !wechatPrivateKey()
  ) {
    const error = new Error('wechat_pay_not_configured')
    error.statusCode = 409
    throw error
  }
}

function signWechatRequest(method, urlPath, body) {
  const timestamp = String(Math.floor(Date.now() / 1000))
  const nonce = randomUUID().replace(/-/g, '')
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${body}\n`
  const signature = createSign('RSA-SHA256')
    .update(message, 'utf8')
    .sign(wechatPrivateKey(), 'base64')
  return `WECHATPAY2-SHA256-RSA2048 mchid="${WECHAT_PAY_MCH_ID}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${WECHAT_PAY_SERIAL_NO}",signature="${signature}"`
}

async function createWechatNativeCheckout(order, project) {
  assertWechatConfigured()
  const urlPath = '/v3/pay/transactions/native'
  const outTradeNo = order.metadata?.wechatOutTradeNo || createWechatOutTradeNo()
  order.metadata.wechatOutTradeNo = outTradeNo
  order.metadata.providerOrderId = outTradeNo
  const body = JSON.stringify({
    appid: WECHAT_PAY_APP_ID,
    mchid: WECHAT_PAY_MCH_ID,
    description: paymentSubject(project).slice(0, 127),
    out_trade_no: outTradeNo,
    notify_url: WECHAT_PAY_NOTIFY_URL,
    amount: {
      total: Number(order.amount || 0),
      currency: order.currency || PAYMENT_CURRENCY,
    },
  })
  const response = await fetch(`https://api.mch.weixin.qq.com${urlPath}`, {
    method: 'POST',
    headers: {
      authorization: signWechatRequest('POST', urlPath, body),
      accept: 'application/json',
      'content-type': 'application/json',
      'user-agent': 'PlayDramaStudio/1.0',
    },
    body,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.code_url) {
    const error = new Error(payload.message || payload.code || 'wechat_prepay_failed')
    error.statusCode = 502
    throw error
  }
  return {
    provider: 'wechat',
    providerOrderId: outTradeNo,
    outTradeNo,
    codeUrl: payload.code_url,
    checkoutUrl: payload.code_url,
    notifyUrl: WECHAT_PAY_NOTIFY_URL,
    platformPublicKeyId: WECHAT_PAY_PLATFORM_PUBLIC_KEY_ID || null,
  }
}

async function createProviderCheckout(provider, order, project) {
  if (provider === 'alipay') return createAlipayCheckout(order, project)
  if (provider === 'wechat') return createWechatNativeCheckout(order, project)
  return null
}

async function createPaymentOrder(actorUserId, build, input = {}) {
  const project = build.snapshot || projects.get(build.projectId) || {}
  const unlockNodeIds =
    Array.isArray(input.unlockNodeIds) && input.unlockNodeIds.length > 0
      ? input.unlockNodeIds
      : paidEndingNodeIds(project)
  const provider = runtimePaymentProvider(input.provider || input.paymentProvider)
  const isSandbox = provider === 'sandbox'
  const order = {
    id: `ord_${randomUUID()}`,
    workspaceId: build.workspaceId,
    projectId: build.projectId,
    buildId: build.id,
    userId: actorUserId || null,
    sessionId: input.sessionId || `ses_${randomUUID()}`,
    provider,
    status: isSandbox ? 'paid' : 'pending',
    amount: publishPriceCents(project),
    currency: process.env.PAYMENT_CURRENCY || PAYMENT_CURRENCY,
    monetization: project.publish?.monetization || 'Free',
    itemType: input.itemType || 'ending',
    itemId: input.itemId || unlockNodeIds[0] || null,
    unlockNodeIds,
    metadata: {
      sandbox: isSandbox,
      price: project.publish?.price || '0',
      title: project.title || '',
      checkoutMode: isSandbox ? 'instant-paid' : 'provider-pending',
      requestedProvider: input.provider || input.paymentProvider || null,
    },
    paidAt: isSandbox ? now() : null,
    createdAt: now(),
  }

  if (!isSandbox && Number(order.amount || 0) < 1) {
    const error = new Error('paid_checkout_requires_positive_price')
    error.statusCode = 400
    error.details = {
      amount: order.amount,
      currency: order.currency,
      monetization: order.monetization,
      price: order.metadata.price,
    }
    throw error
  }

  const checkout = isSandbox ? null : await createProviderCheckout(provider, order, project)
  if (checkout) {
    order.metadata.checkout = checkout
    order.metadata.providerOrderId = checkout.providerOrderId || checkout.outTradeNo || order.id
    order.metadata.checkoutUrl = checkout.checkoutUrl || ''
    order.metadata.codeUrl = checkout.codeUrl || ''
    order.metadata.notifyUrl = checkout.notifyUrl || ''
  }

  paymentOrders.push(order)
  if (paymentOrders.length > 1000) paymentOrders.splice(0, paymentOrders.length - 1000)
  recordAudit(actorUserId, 'payment.order_created', 'payment_order', order.id, {
    workspaceId: order.workspaceId,
    projectId: order.projectId,
    buildId: order.buildId,
    provider: order.provider,
    status: order.status,
    amount: order.amount,
    currency: order.currency,
    itemType: order.itemType,
    itemId: order.itemId,
  })
  return order
}

function paidOrdersForSession(buildId, sessionId) {
  return paymentOrders.filter(
    (order) =>
      order.buildId === buildId &&
      order.sessionId === sessionId &&
      order.status === 'paid',
  )
}

function parseFormBody(rawBody) {
  return Object.fromEntries(new URLSearchParams(rawBody))
}

function verifyAlipayCallback(params) {
  const publicKey = normalizePemKey(ALIPAY_PUBLIC_KEY, 'PUBLIC KEY')
  if (!ALIPAY_APP_ID || !publicKey || params.app_id !== ALIPAY_APP_ID || !params.sign) {
    return false
  }
  const verifier = createVerify('RSA-SHA256')
  verifier.update(alipaySignContent(params, { excludeSignType: true }), 'utf8')
  return verifier.verify(publicKey, params.sign, 'base64')
}

function parseCurrencyAmountCents(value) {
  if (value === undefined || value === null || value === '') return null
  const normalized = Number(String(value).replace(/[^\d.]/g, ''))
  if (!Number.isFinite(normalized)) return null
  return Math.round(normalized * 100)
}

function assertPaymentCallbackMatchesOrder(order, validation = {}) {
  if (!order) return

  if (
    Number(order.amount || 0) > 0 &&
    (validation.amountCents === null ||
      validation.amountCents === undefined ||
      !Number.isFinite(validation.amountCents))
  ) {
    const error = new Error('payment_amount_missing')
    error.statusCode = 409
    error.details = { expectedAmount: order.amount, orderId: order.id }
    throw error
  }

  if (
    Number.isFinite(validation.amountCents) &&
    Number(order.amount || 0) !== Number(validation.amountCents)
  ) {
    const error = new Error('payment_amount_mismatch')
    error.statusCode = 409
    error.details = {
      expectedAmount: order.amount,
      callbackAmount: validation.amountCents,
      orderId: order.id,
    }
    throw error
  }

  if (validation.currency && order.currency && validation.currency !== order.currency) {
    const error = new Error('payment_currency_mismatch')
    error.statusCode = 409
    error.details = {
      expectedCurrency: order.currency,
      callbackCurrency: validation.currency,
      orderId: order.id,
    }
    throw error
  }

  if (validation.appId && validation.expectedAppId && validation.appId !== validation.expectedAppId) {
    const error = new Error('payment_app_id_mismatch')
    error.statusCode = 401
    throw error
  }

  if (
    validation.merchantId &&
    validation.expectedMerchantId &&
    validation.merchantId !== validation.expectedMerchantId
  ) {
    const error = new Error('payment_merchant_mismatch')
    error.statusCode = 401
    throw error
  }
}

async function markPaymentOrderPaid(provider, orderId, metadata = {}, validation = {}) {
  const order = paymentOrders.find((item) =>
    paymentOrderMatchesProviderId(item, provider, orderId),
  )
  if (!order) {
    const error = new Error('payment_order_not_found')
    error.statusCode = 404
    throw error
  }

  assertPaymentCallbackMatchesOrder(order, validation)
  const alreadyPaid = order.status === 'paid'
  if (order.status !== 'paid') {
    order.status = 'paid'
    order.paidAt = now()
  }
  order.metadata = {
    ...(order.metadata || {}),
    ...metadata,
    paidByCallback: true,
    callbackVerifiedAt: now(),
  }

  recordAudit('system:payment-callback', alreadyPaid ? 'payment.callback_duplicate' : 'payment.order_paid', 'payment_order', order.id, {
    provider,
    workspaceId: order.workspaceId,
    projectId: order.projectId,
    buildId: order.buildId,
    amount: order.amount,
    currency: order.currency,
  })
  await saveDatabase()
  return order
}

function minutesSince(value) {
  const timestamp = new Date(value || 0).getTime()
  if (!Number.isFinite(timestamp) || timestamp <= 0) return Number.POSITIVE_INFINITY
  return Math.max(0, Math.round((Date.now() - timestamp) / 60_000))
}

function launchGuardStatus(rows) {
  if (rows.some((row) => row.status === 'blocked')) return 'blocked'
  if (rows.some((row) => row.status === 'warning')) return 'warning'
  return 'ready'
}

function summarizeLaunchGuard({ workspaceId = '', projectId = '', buildId = '' } = {}) {
  const scopedOrders = paymentOrders.filter((order) => {
    if (buildId && order.buildId !== buildId) return false
    if (projectId && order.projectId !== projectId) return false
    if (workspaceId && order.workspaceId !== workspaceId) return false
    return true
  })
  const scopedAiJobs = aiGenerationJobs.filter((job) => {
    if (projectId && job.projectId !== projectId) return false
    if (workspaceId && job.workspaceId !== workspaceId) return false
    return true
  })
  const recentOrders = scopedOrders.filter((order) => minutesSince(order.createdAt) <= 24 * 60)
  const pendingOrders = scopedOrders.filter((order) => order.status === 'pending')
  const stalePendingOrders = pendingOrders.filter((order) => minutesSince(order.createdAt) >= 15)
  const failedOrders = scopedOrders.filter((order) => order.status === 'failed')
  const refundedOrders = scopedOrders.filter((order) => order.status === 'refunded')
  const paidOrders = scopedOrders.filter((order) => order.status === 'paid')
  const callbackPaidOrders = paidOrders.filter((order) => order.metadata?.paidByCallback === true)
  const recentAiFailures = scopedAiJobs.filter(
    (job) => job.status === 'failed' && minutesSince(job.updatedAt || job.createdAt) <= 24 * 60,
  )
  const staleAiJobs = scopedAiJobs.filter(
    (job) =>
      ['queued', 'running'].includes(job.status) &&
      minutesSince(job.updatedAt || job.startedAt || job.createdAt) >= 20,
  )
  const readiness = evaluateProductionReadiness(process.env)
  const storage = storageReadiness()
  const payment = paymentProviderStatus()
  const ai = aiProviderStatus()

  const signals = [
    {
      id: 'service',
      label: '服务健康',
      status: storage.productionReady && readiness.status === 'pass' ? 'ready' : 'blocked',
      value: readiness.status === 'pass' ? 'GO' : readiness.status,
      detail: `数据库 ${storage.driver}，商用门禁 ${readiness.passed}/${readiness.total}`,
      action: readiness.status === 'pass' ? '保持监控' : '先修复商用门禁缺口',
    },
    {
      id: 'payment-callback',
      label: '支付回调',
      status:
        !payment.productionReady
          ? 'blocked'
          : callbackPaidOrders.length > 0
            ? 'ready'
            : paidOrders.length > 0
              ? 'warning'
              : 'warning',
      value:
        callbackPaidOrders.length > 0
          ? `${callbackPaidOrders.length} 笔已验签`
          : payment.productionReady
            ? '待首单'
            : '未就绪',
      detail:
        callbackPaidOrders.length > 0
          ? `最近 ${callbackPaidOrders[callbackPaidOrders.length - 1]?.provider || payment.activeProvider} 回调已入库`
          : '上线前建议再跑微信 0.01 元真实支付',
      action: callbackPaidOrders.length > 0 ? '可给客户试用' : '跑真实小额支付',
    },
    {
      id: 'pending-orders',
      label: '待支付滞留',
      status: stalePendingOrders.length > 0 ? 'warning' : 'ready',
      value: `${stalePendingOrders.length}`,
      detail:
        stalePendingOrders.length > 0
          ? `${pendingOrders.length} 笔待支付，其中 ${stalePendingOrders.length} 笔超过 15 分钟`
          : `${pendingOrders.length} 笔待支付，暂无超时`,
      action: stalePendingOrders.length > 0 ? '提醒继续支付或标记失败' : '无需处理',
    },
    {
      id: 'failed-orders',
      label: '异常订单',
      status: failedOrders.length > 0 || refundedOrders.length > 0 ? 'warning' : 'ready',
      value: `${failedOrders.length + refundedOrders.length}`,
      detail:
        failedOrders.length + refundedOrders.length > 0
          ? `${failedOrders.length} 失败，${refundedOrders.length} 退款撤权`
          : '暂无失败或撤权订单',
      action: failedOrders.length > 0 ? '复核商户号、签名、回调和金额' : '保留审计',
    },
    {
      id: 'ai-jobs',
      label: 'AI 生成守护',
      status: recentAiFailures.length > 0 || staleAiJobs.length > 0 ? 'warning' : ai.productionReady ? 'ready' : 'blocked',
      value:
        recentAiFailures.length > 0 || staleAiJobs.length > 0
          ? `${recentAiFailures.length + staleAiJobs.length} 个异常`
          : ai.productionReady
            ? '可用'
            : '未就绪',
      detail:
        recentAiFailures.length > 0 || staleAiJobs.length > 0
          ? `${recentAiFailures.length} 失败，${staleAiJobs.length} 长时间运行`
          : `${ai.provider || 'AI'} / ${ai.model || '未配置模型'}`,
      action: recentAiFailures.length > 0 ? '检查额度、超时和模型输出' : '持续记录成本',
    },
  ]
  const incidents = [
    ...stalePendingOrders.slice(0, 5).map((order) => ({
      id: order.id,
      severity: 'warning',
      label: '待支付超时',
      value: `${order.currency} ${(Number(order.amount || 0) / 100).toFixed(2)}`,
      detail: `${order.provider} · ${minutesSince(order.createdAt)} 分钟未支付 · ${order.itemId || '未绑定权益'}`,
      action: '运营提醒继续支付，或标记失败',
    })),
    ...failedOrders.slice(0, 5).map((order) => ({
      id: order.id,
      severity: 'blocked',
      label: '支付失败',
      value: `${order.currency} ${(Number(order.amount || 0) / 100).toFixed(2)}`,
      detail: `${order.provider} · ${order.metadata?.opsNote || order.metadata?.errorMessage || '需复核回调和商户配置'}`,
      action: '确认是否重试或关闭订单',
    })),
    ...recentAiFailures.slice(0, 5).map((job) => ({
      id: job.id,
      severity: 'warning',
      label: 'AI 生成失败',
      value: job.task,
      detail: job.errorMessage || job.message || '模型任务失败',
      action: '重试或切换模型',
    })),
  ].slice(0, 8)

  return {
    generatedAt: now(),
    status: launchGuardStatus(signals),
    scope: { workspaceId, projectId, buildId },
    summary: {
      orderCount: scopedOrders.length,
      recentOrderCount: recentOrders.length,
      paidOrderCount: paidOrders.length,
      paidByCallbackCount: callbackPaidOrders.length,
      pendingOrderCount: pendingOrders.length,
      stalePendingOrderCount: stalePendingOrders.length,
      failedOrderCount: failedOrders.length,
      refundedOrderCount: refundedOrders.length,
      aiFailureCount: recentAiFailures.length,
      staleAiJobCount: staleAiJobs.length,
    },
    signals,
    incidents,
  }
}

async function updatePaymentOrderOps(actorUserId, orderId, input = {}) {
  const order = paymentOrders.find((item) => item.id === orderId)
  if (!order) {
    const error = new Error('payment_order_not_found')
    error.statusCode = 404
    throw error
  }

  const nextStatus = String(input.status || '').trim()
  if (!['pending', 'failed', 'refunded'].includes(nextStatus)) {
    const error = new Error('unsupported_payment_order_ops_status')
    error.statusCode = 400
    error.details = { allowed: ['pending', 'failed', 'refunded'] }
    throw error
  }

  if (nextStatus === 'refunded' && order.status !== 'paid' && order.status !== 'refunded') {
    const error = new Error('refund_requires_paid_order')
    error.statusCode = 409
    throw error
  }

  if (nextStatus === 'pending' && order.status === 'paid') {
    const error = new Error('paid_order_cannot_return_to_pending')
    error.statusCode = 409
    throw error
  }

  const previousStatus = order.status
  const opsNote = String(input.note || '').trim().slice(0, 240)
  order.status = nextStatus
  if (nextStatus === 'pending') order.paidAt = null
  order.metadata = {
    ...(order.metadata || {}),
    opsPreviousStatus: previousStatus,
    opsStatus: nextStatus,
    opsNote,
    opsActorUserId: actorUserId || null,
    opsUpdatedAt: now(),
  }

  recordAudit(actorUserId, 'payment.order_ops_updated', 'payment_order', order.id, {
    workspaceId: order.workspaceId,
    projectId: order.projectId,
    buildId: order.buildId,
    previousStatus,
    status: nextStatus,
    note: opsNote,
  })
  await saveDatabase()
  return order
}

async function handleAlipayCallback(rawBody) {
  const params = parseFormBody(rawBody)
  if (!verifyAlipayCallback(params)) {
    const error = new Error('invalid_alipay_signature')
    error.statusCode = 401
    throw error
  }

  const success = ['TRADE_SUCCESS', 'TRADE_FINISHED'].includes(params.trade_status)
  if (!success) {
    return { ok: true, ignored: true, tradeStatus: params.trade_status || '' }
  }

  const amountCents = parseCurrencyAmountCents(params.total_amount || params.receipt_amount)
  const order = await markPaymentOrderPaid('alipay', params.out_trade_no, {
    alipayTradeNo: params.trade_no || null,
    buyerId: params.buyer_id || null,
    receiptAmount: params.receipt_amount || params.total_amount || null,
    tradeStatus: params.trade_status,
    callbackAmountCents: amountCents,
    sellerId: params.seller_id || null,
    notifyId: params.notify_id || null,
  }, {
    amountCents,
    currency: 'CNY',
    appId: params.app_id,
    expectedAppId: ALIPAY_APP_ID,
    merchantId: params.seller_id || '',
    expectedMerchantId: ALIPAY_SELLER_ID,
  })
  return { ok: true, order }
}

function verifyWechatCallback(req, rawBody) {
  const publicKey = wechatPlatformPublicKey()
  const timestamp = req.headers['wechatpay-timestamp'] || ''
  const nonce = req.headers['wechatpay-nonce'] || ''
  const signature = req.headers['wechatpay-signature'] || ''
  const serial = req.headers['wechatpay-serial'] || ''
  if (WECHAT_PAY_PLATFORM_PUBLIC_KEY_ID && serial && serial !== WECHAT_PAY_PLATFORM_PUBLIC_KEY_ID) {
    return false
  }
  if (!publicKey || !timestamp || !nonce || !signature) return false
  const verifier = createVerify('RSA-SHA256')
  verifier.update(`${timestamp}\n${nonce}\n${rawBody}\n`, 'utf8')
  return verifier.verify(publicKey, signature, 'base64')
}

function decryptWechatResource(resource = {}) {
  if (!WECHAT_PAY_API_V3_KEY || Buffer.byteLength(WECHAT_PAY_API_V3_KEY) !== 32) {
    throw new Error('wechat_api_v3_key_invalid')
  }
  const ciphertext = Buffer.from(resource.ciphertext || '', 'base64')
  const authTag = ciphertext.subarray(ciphertext.length - 16)
  const data = ciphertext.subarray(0, ciphertext.length - 16)
  const decipher = createDecipheriv(
    'aes-256-gcm',
    Buffer.from(WECHAT_PAY_API_V3_KEY, 'utf8'),
    Buffer.from(resource.nonce || '', 'utf8'),
  )
  if (resource.associated_data) {
    decipher.setAAD(Buffer.from(resource.associated_data, 'utf8'))
  }
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
  return JSON.parse(decrypted)
}

async function handleWechatCallback(req, rawBody) {
  if (!verifyWechatCallback(req, rawBody)) {
    const error = new Error('invalid_wechat_signature')
    error.statusCode = 401
    throw error
  }
  const payload = parseJsonBody(rawBody)
  const transaction = decryptWechatResource(payload.resource || {})
  if (transaction.trade_state !== 'SUCCESS') {
    return { ok: true, ignored: true, tradeState: transaction.trade_state || '' }
  }
  const amountCents = Number(transaction.amount?.total)
  const order = await markPaymentOrderPaid('wechat', transaction.out_trade_no, {
    wechatTransactionId: transaction.transaction_id || null,
    payerOpenId: transaction.payer?.openid || null,
    tradeState: transaction.trade_state,
    callbackAmountCents: Number.isFinite(amountCents) ? amountCents : null,
    mchid: transaction.mchid || null,
    appid: transaction.appid || null,
  }, {
    amountCents: Number.isFinite(amountCents) ? amountCents : null,
    currency: transaction.amount?.currency || PAYMENT_CURRENCY,
    appId: transaction.appid || '',
    expectedAppId: WECHAT_PAY_APP_ID,
    merchantId: transaction.mchid || '',
    expectedMerchantId: WECHAT_PAY_MCH_ID,
  })
  return { ok: true, order }
}

const DISTRIBUTION_CHANNELS = ['douyin', 'douyin-mini', 'wechat-mini', 'wechat-video', 'private']

function latestBuildForProject(projectId) {
  return [...builds.values()]
    .filter((build) => build.projectId === projectId)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0]
}

function publishedPlayUrl(build, channel) {
  const url = new URL(`${APP_BASE_URL.replace(/\/+$/, '')}/studio`)
  url.searchParams.set('preview', '1')
  url.searchParams.set('build', build.id)
  url.searchParams.set('channel', channel)
  url.searchParams.set('utm_source', channel)
  url.searchParams.set('utm_medium', channel.includes('mini') ? 'mini_program' : 'short_video')
  url.searchParams.set('utm_campaign', `${build.projectId}-${channel}`)
  return url.toString()
}

function miniProgramPath(build, channel) {
  return `/pages/play/index?build=${encodeURIComponent(build.id)}&channel=${encodeURIComponent(channel)}`
}

function defaultDistributionCaption(project, channel) {
  const firstChoice = project.nodes?.[0]?.choices?.[0]?.label || '你会怎么选'
  if (channel === 'wechat-mini' || channel === 'wechat-video') {
    return `互动短剧《${project.title}》内测版上线。每个选择都会改变线索和结局，3 分钟体验。`
  }
  return `她收到医院第七通电话，却发现来电人已经死了。${firstChoice}？互动短剧《${project.title}》，点开自己决定结局。`
}

async function publishDouyinVideo(job, input = {}) {
  if (!DOUYIN_ACCESS_TOKEN || !DOUYIN_OPEN_ID || !input.videoId) {
    return {
      status: 'ready',
      response: {
        mode: 'manual-handoff',
        reason: input.videoId ? 'douyin_credentials_missing' : 'douyin_video_id_required',
        targetUrl: job.targetUrl,
      },
    }
  }

  const endpoint = `${DOUYIN_OPEN_BASE_URL}/api/douyin/v1/video/create_video/?open_id=${encodeURIComponent(DOUYIN_OPEN_ID)}`
  const body = {
    video_id: input.videoId,
    text: job.caption,
    ...(input.microAppId || DOUYIN_MINI_APP_ID
      ? { micro_app_id: input.microAppId || DOUYIN_MINI_APP_ID }
      : {}),
  }
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'access-token': DOUYIN_ACCESS_TOKEN,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({}))
  const errorCode = payload?.data?.error_code ?? payload?.error_code
  const ok = response.ok && (errorCode === 0 || errorCode === undefined)
  return {
    status: ok ? 'published' : 'failed',
    externalId: payload?.data?.item_id || payload?.item_id || null,
    response: payload,
    errorMessage: ok
      ? null
      : payload?.data?.description || payload?.description || payload?.message || `HTTP ${response.status}`,
  }
}

async function createDistributionJob(actorUserId, project, input = {}) {
  const channel = String(input.channel || '').trim().toLowerCase()
  if (!DISTRIBUTION_CHANNELS.includes(channel)) {
    const error = new Error('unsupported_distribution_channel')
    error.statusCode = 422
    throw error
  }

  const build = input.buildId ? builds.get(input.buildId) : latestBuildForProject(project.id)
  if (!build || build.projectId !== project.id) {
    const error = new Error('distribution_build_not_found')
    error.statusCode = 404
    throw error
  }

  const targetUrl = publishedPlayUrl(build, channel)
  const isMiniProgram = channel === 'douyin-mini' || channel === 'wechat-mini'
  const job = {
    id: `dst_${randomUUID()}`,
    workspaceId: project.workspaceId,
    projectId: project.id,
    buildId: build.id,
    channel,
    provider: channel.startsWith('douyin') ? 'douyin' : channel.startsWith('wechat') ? 'wechat' : 'manual',
    status: 'ready',
    title: input.title || project.title,
    caption: String(input.caption || defaultDistributionCaption(project, channel)).slice(0, 2200),
    targetUrl,
    miniProgramPath: isMiniProgram ? miniProgramPath(build, channel) : '',
    externalId: null,
    request: {
      channel,
      videoId: input.videoId || null,
      microAppId: input.microAppId || null,
      buildId: build.id,
    },
    response: {},
    errorMessage: null,
    createdAt: now(),
    updatedAt: now(),
  }

  if (channel === 'douyin') {
    const result = await publishDouyinVideo(job, input)
    job.status = result.status
    job.externalId = result.externalId || null
    job.response = result.response || {}
    job.errorMessage = result.errorMessage || null
  } else if (channel === 'douyin-mini') {
    job.response = {
      mode: 'mini-program-handoff',
      appIdConfigured: Boolean(DOUYIN_MINI_APP_ID),
      webviewDomainReady: MINI_PROGRAM_WEBVIEW_DOMAIN_READY,
      path: job.miniProgramPath,
    }
  } else if (channel === 'wechat-mini') {
    job.response = {
      mode: 'mini-program-handoff',
      appIdConfigured: Boolean(WECHAT_MINI_APP_ID),
      webviewDomainReady: MINI_PROGRAM_WEBVIEW_DOMAIN_READY,
      path: job.miniProgramPath,
    }
  } else {
    job.response = {
      mode: 'manual-handoff',
      targetUrl,
    }
  }

  distributionJobs.push(job)
  if (distributionJobs.length > 1000) {
    distributionJobs.splice(0, distributionJobs.length - 1000)
  }
  recordAudit(actorUserId, 'distribution.job_created', 'distribution_job', job.id, {
    workspaceId: job.workspaceId,
    projectId: job.projectId,
    buildId: job.buildId,
    channel: job.channel,
    status: job.status,
  })
  await saveDatabase()
  return job
}

function listDistributionJobs(projectId, buildId = '') {
  return distributionJobs
    .filter((job) => job.projectId === projectId && (!buildId || job.buildId === buildId))
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
}

function videoProviderStatus() {
  const active = videoProviderRecommendations.find((item) => item.id === VIDEO_PROVIDER)
  const productionReady = Boolean(active?.configured)
  const renderCapability = finalVideoRenderCapability()
  return {
    provider: VIDEO_PROVIDER,
    model: VIDEO_MODEL_NAME || active?.defaultModel || null,
    providers: videoProviderRecommendations,
    productionReady,
    openApiMode: productionReady ? 'live' : 'prompt-ready',
    missing: active && !active.configured ? active.requiredEnv : [],
    commercial: {
      liveSubmitLimit: VIDEO_LIVE_SUBMIT_LIMIT,
      promptBatchLimit: VIDEO_PROMPT_BATCH_LIMIT,
      canSubmitLive: productionReady,
      canRetry: true,
      canExportDeliveryManifest: true,
      canRenderFinalMp4: renderCapability.ffmpegAvailable,
      renderMode: renderCapability.mode,
      readiness:
        productionReady
          ? renderCapability.ffmpegAvailable
            ? 'live-shot-rendering-and-final-mp4'
            : 'live-shot-rendering'
          : 'prompt-pack-handoff',
      nextStep:
        productionReady
          ? renderCapability.ffmpegAvailable
            ? 'Run live shots, refresh until succeeded, then render final MP4.'
            : 'Install FFmpeg for one-click MP4 assembly; delivery manifest is available now.'
          : `Configure ${(active?.requiredEnv || ['VIDEO_PROVIDER']).join(', ')} before paid client trials.`,
      render: renderCapability,
    },
    routingPolicy: 'PlayDrama keeps interaction, payment, publishing, and analytics; video providers only render shots.',
  }
}

const canvasNodeTypeLabels = {
  text: '文本',
  image: '图片',
  video: '视频',
  audio: '音频',
  composite: '视频合成',
  director: '导演台',
  script: '脚本',
}

const canvasNodeTypeModels = {
  text: 'Story Writer',
  image: 'Image Reference',
  video: 'Video Prompt',
  audio: 'Voice & BGM',
  composite: 'Final Composer',
  director: 'Director Board',
  script: 'Script Engine',
}

function normalizeCanvasNodeType(value = '', nodeKind = 'Choice') {
  const type = String(value || '').trim()
  if (canvasNodeTypeLabels[type]) return type
  if (nodeKind === 'Hook') return 'script'
  if (nodeKind === 'Puzzle') return 'director'
  if (nodeKind === 'Ending') return 'composite'
  return 'text'
}

function canvasNodeCreditCost(nodeType) {
  if (nodeType === 'video') return 4
  if (nodeType === 'composite') return 3
  if (nodeType === 'image') return 2
  return 1
}

function listCanvasAssets(projectId) {
  return canvasAssets
    .filter((asset) => asset.projectId === projectId)
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
}

function listCanvasNodeRuns(projectId) {
  return canvasNodeRuns
    .filter((run) => run.projectId === projectId)
    .slice()
    .sort((left, right) => new Date(right.updatedAt || right.createdAt).getTime() - new Date(left.updatedAt || left.createdAt).getTime())
}

function buildCanvasNodeOutput(project, node, input = {}) {
  const nodeType = normalizeCanvasNodeType(input.nodeType || node.nodeType, node.kind)
  const prompt = String(input.prompt || node.prompt || node.summary || project.title || '').trim()
  const label = canvasNodeTypeLabels[nodeType]
  const previewSeed = compactVideoPromptLine(prompt || node.summary || '画布输入', 160)
  if (nodeType === 'image') {
    return {
      title: `${node.title} · 图片资产`,
      preview: `生成角色图、海报或分镜参考：${previewSeed}`,
      assetType: 'image',
    }
  }
  if (nodeType === 'video') {
    return {
      title: `${node.title} · 视频镜头`,
      preview: `生成镜头运动、画面提示和视频队列：${previewSeed}`,
      assetType: 'video',
    }
  }
  if (nodeType === 'audio') {
    return {
      title: `${node.title} · 音频方案`,
      preview: `生成旁白、音效和 BGM 方向：${previewSeed}`,
      assetType: 'audio',
    }
  }
  if (nodeType === 'composite') {
    return {
      title: `${node.title} · 合成清单`,
      preview: `合成片段、字幕、音频和导出规格：${previewSeed}`,
      assetType: 'composite',
    }
  }
  return {
    title: `${node.title} · ${label}结果`,
    preview: `生成剧本正文、选择文案和可执行 Prompt：${previewSeed}`,
    assetType: 'script',
  }
}

async function createCanvasAsset(actorUserId, project, input = {}, options = {}) {
  const createdAt = now()
  const type = ['script', 'image', 'video', 'audio', 'composite'].includes(input.type)
    ? input.type
    : 'script'
  const asset = {
    id: input.id || `asset_${randomUUID()}`,
    projectId: project.id,
    workspaceId: project.workspaceId,
    nodeId: input.nodeId || null,
    type,
    name: String(input.name || `${project.title} 素材`).slice(0, 120),
    meta: String(input.meta || type).slice(0, 160),
    source: String(input.source || '').slice(0, 3000),
    status: ['ready', 'processing', 'failed'].includes(input.status) ? input.status : 'ready',
    fileName: input.fileName ? String(input.fileName).slice(0, 240) : '',
    mimeType: input.mimeType ? String(input.mimeType).slice(0, 120) : '',
    size: Number.isFinite(Number(input.size)) ? Number(input.size) : 0,
    url: input.url ? String(input.url).slice(0, 1000) : '',
    createdBy: actorUserId,
    createdAt,
    updatedAt: createdAt,
  }
  canvasAssets.unshift(asset)
  recordAudit(actorUserId, 'canvas.asset_created', 'project', project.id, {
    assetId: asset.id,
    type: asset.type,
    name: asset.name,
  })
  if (options.persist !== false) await saveDatabase()
  return asset
}

async function createCanvasNodeRun(actorUserId, project, nodeId, input = {}, options = {}) {
  const node = Array.isArray(project.nodes)
    ? project.nodes.find((item) => item.id === nodeId)
    : null
  if (!node) return null

  const nodeType = normalizeCanvasNodeType(input.nodeType || node.nodeType, node.kind)
  const output = buildCanvasNodeOutput(project, node, { ...input, nodeType })
  const credits = canvasNodeCreditCost(nodeType)
  const createdAt = now()
  const run = {
    id: `run_${randomUUID()}`,
    projectId: project.id,
    workspaceId: project.workspaceId,
    nodeId: node.id,
    nodeTitle: node.title,
    nodeType,
    status: 'succeeded',
    progress: 100,
    message: '后端执行完成，可复用输出',
    outputTitle: output.title,
    outputPreview: output.preview,
    model: String(input.model || node.model || canvasNodeTypeModels[nodeType] || '').slice(0, 120),
    prompt: String(input.prompt || node.prompt || node.summary || '').slice(0, 3000),
    credits,
    createdBy: actorUserId,
    createdAt,
    updatedAt: createdAt,
  }
  canvasNodeRuns.unshift(run)
  const asset = await createCanvasAsset(actorUserId, project, {
    type: output.assetType,
    name: output.title,
    meta: `${canvasNodeTypeLabels[nodeType]} · ${node.id}`,
    source: output.preview,
    nodeId: node.id,
  }, { persist: false })
  run.assetId = asset.id
  recordAudit(actorUserId, 'canvas.node_run_succeeded', 'project', project.id, {
    runId: run.id,
    nodeId: node.id,
    nodeType,
    credits,
  })
  if (options.persist !== false) await saveDatabase()
  return { run, asset }
}

function orderedCanvasNodes(project, startNodeId = '', scope = 'all') {
  const nodes = Array.isArray(project.nodes) ? project.nodes : []
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const downstream = new Set()
  if (scope === 'downstream' && startNodeId && byId.has(startNodeId)) {
    const queue = [startNodeId]
    while (queue.length) {
      const nodeId = queue.shift()
      if (!nodeId || downstream.has(nodeId)) continue
      downstream.add(nodeId)
      const node = byId.get(nodeId)
      for (const choice of node?.choices || []) {
        if (choice.targetNodeId && !downstream.has(choice.targetNodeId)) queue.push(choice.targetNodeId)
      }
    }
  }
  const included = nodes.filter((node) => scope === 'downstream' ? downstream.has(node.id) : true)
  const includedIds = new Set(included.map((node) => node.id))
  const indegree = new Map(included.map((node) => [node.id, 0]))
  for (const node of included) {
    for (const choice of node.choices || []) {
      if (includedIds.has(choice.targetNodeId)) {
        indegree.set(choice.targetNodeId, (indegree.get(choice.targetNodeId) || 0) + 1)
      }
    }
  }
  const queue = included.filter((node) => (indegree.get(node.id) || 0) === 0)
  const ordered = []
  while (queue.length) {
    const node = queue.shift()
    ordered.push(node)
    for (const choice of node.choices || []) {
      if (!includedIds.has(choice.targetNodeId)) continue
      indegree.set(choice.targetNodeId, (indegree.get(choice.targetNodeId) || 0) - 1)
      if ((indegree.get(choice.targetNodeId) || 0) === 0) {
        const target = byId.get(choice.targetNodeId)
        if (target) queue.push(target)
      }
    }
  }
  const orderedIds = new Set(ordered.map((node) => node.id))
  return [...ordered, ...included.filter((node) => !orderedIds.has(node.id))]
}

async function createCanvasWorkflowRun(actorUserId, project, input = {}) {
  const createdAt = now()
  const scope = input.scope === 'downstream' ? 'downstream' : 'all'
  const orderedNodes = orderedCanvasNodes(project, input.startNodeId || '', scope)
  const workflow = {
    id: `flow_${randomUUID()}`,
    projectId: project.id,
    workspaceId: project.workspaceId,
    status: 'running',
    scope,
    startNodeId: input.startNodeId || '',
    nodeIds: orderedNodes.map((node) => node.id),
    runIds: [],
    credits: 0,
    message: `正在运行 ${orderedNodes.length} 个节点`,
    createdBy: actorUserId,
    createdAt,
    updatedAt: createdAt,
    completedAt: null,
  }
  canvasWorkflowRuns.unshift(workflow)
  for (const node of orderedNodes) {
    const result = await createCanvasNodeRun(actorUserId, project, node.id, {
      nodeType: node.nodeType,
      prompt: node.prompt || node.summary || project.title,
      model: node.model,
    }, { persist: false })
    if (result?.run) {
      workflow.runIds.push(result.run.id)
      workflow.credits += result.run.credits || 0
    }
  }
  workflow.status = 'succeeded'
  workflow.message = `工作流已完成：${workflow.runIds.length}/${orderedNodes.length} 个节点`
  workflow.updatedAt = now()
  workflow.completedAt = workflow.updatedAt
  recordAudit(actorUserId, 'canvas.workflow_succeeded', 'project', project.id, {
    workflowId: workflow.id,
    nodeCount: orderedNodes.length,
    credits: workflow.credits,
  })
  await saveDatabase()
  return workflow
}

function normalizeVideoProvider(provider = '') {
  const requested = String(provider || VIDEO_PROVIDER || 'stub').trim().toLowerCase()
  return videoProviderRecommendations.some((item) => item.id === requested) ? requested : 'stub'
}

function videoProviderConfigured(provider) {
  return Boolean(videoProviderRecommendations.find((item) => item.id === provider)?.configured)
}

function videoProviderModel(provider, requestedModel = '') {
  if (requestedModel) return requestedModel
  if (VIDEO_MODEL_NAME) return VIDEO_MODEL_NAME
  return videoProviderRecommendations.find((item) => item.id === provider)?.defaultModel || 'prompt-pack'
}

function videoJobSort(left, right) {
  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
}

function listVideoGenerationJobs(projectId) {
  return videoGenerationJobs
    .filter((job) => job.projectId === projectId)
    .slice()
    .sort(videoJobSort)
}

function normalizeVideoAspectRatio(value = '9:16') {
  const ratio = String(value || '9:16').replace(/\s+/g, '').toLowerCase()
  if (ratio.includes('16:9') || ratio.includes('1920*1080') || ratio.includes('1080*720')) return '16:9'
  if (ratio.includes('1:1')) return '1:1'
  if (ratio.includes('4:3')) return '4:3'
  if (ratio.includes('3:4')) return '3:4'
  return '9:16'
}

function compactVideoPromptLine(value = '', maxLength = 180) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function buildVideoCharacterContinuity(input = {}) {
  const refs = Array.isArray(input.characterRefs) ? input.characterRefs : []
  return refs
    .slice(0, 4)
    .map((item) => {
      const name = compactVideoPromptLine(item?.name || item?.label || '', 24)
      const role = compactVideoPromptLine(item?.role || '', 36)
      const wardrobe = compactVideoPromptLine(item?.wardrobe || item?.visualPrompt || '', 72)
      return [name, role, wardrobe].filter(Boolean).join(' / ')
    })
    .filter(Boolean)
    .join('; ')
}

function buildVideoPrompt(input = {}) {
  const rawPrompt = String(
    input.prompt ||
      input.visualPrompt ||
      input.scene ||
      input.beat ||
      'vertical interactive short drama shot, cinematic lighting, consistent character reference',
  )
    .replace(/\s+/g, ' ')
    .trim()

  if (rawPrompt.includes('PlayDrama commercial video guardrails')) {
    return rawPrompt.slice(0, 3000)
  }

  const guardrails = [
    'Native vertical 9:16 Chinese short-drama shot, commercial mobile feed composition, no horizontal framing.',
    'Live-action cinematic realism, suspenseful three-second hook, clear subject, natural lighting, stable faces and hands.',
    'Do not render subtitles, captions, title cards, logos, QR codes, watermarks, readable phone text, app UI words, or random letters.',
    'If a phone or screen appears, keep its content abstract, blurred, or unreadable; PlayDrama will add burned-in Chinese subtitles later.',
    compactVideoPromptLine(input.scene) ? `Scene: ${compactVideoPromptLine(input.scene)}` : '',
    compactVideoPromptLine(input.beat) ? `Story beat: ${compactVideoPromptLine(input.beat)}` : '',
    compactVideoPromptLine(input.camera) ? `Camera: ${compactVideoPromptLine(input.camera, 90)}` : '',
    compactVideoPromptLine(input.motion) ? `Motion: ${compactVideoPromptLine(input.motion, 90)}` : '',
    buildVideoCharacterContinuity(input)
      ? `Character continuity: ${compactVideoPromptLine(buildVideoCharacterContinuity(input), 240)}`
      : '',
  ].filter(Boolean)

  return [rawPrompt, '', 'PlayDrama commercial video guardrails:', ...guardrails.map((item) => `- ${item}`)]
    .join('\n')
    .slice(0, 3000)
}

function buildVideoNegativePrompt(input = {}) {
  return [
    input.negativePrompt,
    'subtitles, captions, title cards, logos, watermarks, QR codes, readable text, random letters, garbled Chinese characters, phone UI words, distorted hands, extra fingers, deformed face, duplicated people, low resolution, heavy blur, cartoon, anime',
  ]
    .filter(Boolean)
    .map((item) => String(item).trim())
    .join(', ')
    .slice(0, 1000)
}

function buildDashScopeVideoParameters(job) {
  return {
    resolution: String(job.request?.resolution || DASHSCOPE_VIDEO_RESOLUTION),
    ratio: normalizeVideoAspectRatio(job.aspectRatio || job.request?.aspectRatio || '9:16'),
    duration: Math.min(Math.max(Math.round(parseDurationSeconds(job.duration, 5)), 2), 15),
    prompt_extend: true,
    watermark: false,
  }
}

async function submitVideoProviderTask(job) {
  const provider = job.provider
  const configured = videoProviderConfigured(provider)
  if (!configured) {
    return {
      status: 'prompt-ready',
      externalId: null,
      outputUrl: '',
      thumbnailUrl: '',
      response: {
        mode: 'adapter-ready',
        message: 'Provider API key is not configured; prompt is queued for handoff.',
        missing: videoProviderRecommendations.find((item) => item.id === provider)?.requiredEnv || [],
      },
      errorMessage: null,
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), VIDEO_REQUEST_TIMEOUT_MS)
  try {
    if (provider === 'dashscope') {
      const parameters = buildDashScopeVideoParameters(job)
      const response = await fetch(`${DASHSCOPE_BASE_URL}/api/v1/services/aigc/video-generation/video-synthesis`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          authorization: `Bearer ${DASHSCOPE_API_KEY}`,
          'content-type': 'application/json',
          'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify({
          model: job.model || DASHSCOPE_VIDEO_MODEL,
          input: {
            prompt: job.prompt,
            negative_prompt: buildVideoNegativePrompt(job.request || {}),
          },
          parameters,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(
          payload?.message ||
            payload?.code ||
            payload?.output?.message ||
            `DashScope HTTP ${response.status}`,
        )
      }
      return {
        status: 'running',
        externalId: payload?.output?.task_id || payload?.task_id || payload?.id || null,
        outputUrl: '',
        thumbnailUrl: '',
        response: { ...payload, requestParameters: parameters },
        errorMessage: null,
      }
    }

    if (provider === 'minimax') {
      const response = await fetch(`${MINIMAX_BASE_URL}/v1/video_generation`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          authorization: `Bearer ${MINIMAX_API_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: job.model || MINIMAX_VIDEO_MODEL,
          prompt: job.prompt,
          duration: Number.parseInt(job.duration, 10) || 6,
          resolution: job.request?.resolution || '768P',
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || `MiniMax HTTP ${response.status}`)
      }
      return {
        status: 'running',
        externalId: payload?.task_id || payload?.taskId || payload?.id || null,
        outputUrl: '',
        thumbnailUrl: '',
        response: payload,
        errorMessage: null,
      }
    }

    if (provider === 'vidu') {
      const response = await fetch(`${VIDU_BASE_URL}/ent/v2/text2video`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          authorization: `Token ${VIDU_API_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: job.model || VIDU_VIDEO_MODEL,
          prompt: job.prompt,
          duration: Number.parseInt(job.duration, 10) || 4,
          aspect_ratio: job.aspectRatio || '9:16',
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || `Vidu HTTP ${response.status}`)
      }
      return {
        status: 'running',
        externalId: payload?.task_id || payload?.taskId || payload?.id || null,
        outputUrl: '',
        thumbnailUrl: '',
        response: payload,
        errorMessage: null,
      }
    }

    if (provider === 'runway') {
      const runwayModel = job.model || RUNWAY_VIDEO_MODEL
      const runwayTextEndpoint = runwayModel.toLowerCase().includes('seedance')
        ? 'text_to_video'
        : 'image_to_video'
      const response = await fetch(`${RUNWAY_BASE_URL}/v1/${runwayTextEndpoint}`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          authorization: `Bearer ${RUNWAY_API_KEY}`,
          'content-type': 'application/json',
          'X-Runway-Version': '2024-11-06',
        },
        body: JSON.stringify({
          model: runwayModel,
          promptText: job.prompt,
          ratio: job.aspectRatio || '720:1280',
          duration: Number.parseInt(job.duration, 10) || 5,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || `Runway HTTP ${response.status}`)
      }
      return {
        status: 'running',
        externalId: payload?.id || payload?.task_id || null,
        outputUrl: '',
        thumbnailUrl: '',
        response: payload,
        errorMessage: null,
      }
    }

    return {
      status: 'prompt-ready',
      externalId: null,
      outputUrl: '',
      thumbnailUrl: '',
      response: {
        mode: 'manual-provider',
        provider,
        message: 'Provider adapter is registered; live submit is waiting for endpoint configuration.',
      },
      errorMessage: null,
    }
  } catch (error) {
    return {
      status: 'failed',
      externalId: null,
      outputUrl: '',
      thumbnailUrl: '',
      response: {},
      errorMessage: error instanceof Error ? error.message : 'video_provider_failed',
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function refreshVideoProviderTask(job) {
  if (!job.externalId || !videoProviderConfigured(job.provider)) return job
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), VIDEO_REQUEST_TIMEOUT_MS)
  try {
    let payload = {}
    if (job.provider === 'minimax') {
      const response = await fetch(
        `${MINIMAX_BASE_URL}/v1/query/video_generation?task_id=${encodeURIComponent(job.externalId)}`,
        {
          signal: controller.signal,
          headers: { authorization: `Bearer ${MINIMAX_API_KEY}` },
        },
      )
      payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.message || `MiniMax HTTP ${response.status}`)
      const fileId = payload?.file_id || payload?.fileId || payload?.file?.id
      if (fileId) {
        const fileResponse = await fetch(
          `${MINIMAX_BASE_URL}/v1/files/retrieve?file_id=${encodeURIComponent(fileId)}`,
          {
            signal: controller.signal,
            headers: { authorization: `Bearer ${MINIMAX_API_KEY}` },
          },
        )
        const filePayload = await fileResponse.json().catch(() => ({}))
        if (fileResponse.ok) {
          payload.file = filePayload
        }
      }
    } else if (job.provider === 'dashscope') {
      const response = await fetch(`${DASHSCOPE_BASE_URL}/api/v1/tasks/${encodeURIComponent(job.externalId)}`, {
        signal: controller.signal,
        headers: { authorization: `Bearer ${DASHSCOPE_API_KEY}` },
      })
      payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.message || payload?.code || `DashScope HTTP ${response.status}`)
      }
    } else if (job.provider === 'vidu') {
      const response = await fetch(`${VIDU_BASE_URL}/ent/v2/tasks/${encodeURIComponent(job.externalId)}`, {
        signal: controller.signal,
        headers: { authorization: `Token ${VIDU_API_KEY}` },
      })
      payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.message || payload?.error || `Vidu HTTP ${response.status}`)
    } else if (job.provider === 'runway') {
      const response = await fetch(`${RUNWAY_BASE_URL}/v1/tasks/${encodeURIComponent(job.externalId)}`, {
        signal: controller.signal,
        headers: {
          authorization: `Bearer ${RUNWAY_API_KEY}`,
          'X-Runway-Version': '2024-11-06',
        },
      })
      payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.message || `Runway HTTP ${response.status}`)
    } else {
      return job
    }

    const rawStatus = String(
      payload?.status || payload?.Status || payload?.state || payload?.output?.task_status || '',
    ).toLowerCase()
    const outputUrl =
      payload?.output?.[0] ||
      payload?.output_url ||
      payload?.file_url ||
      payload?.video_url ||
      payload?.output?.video_url ||
      payload?.output?.results?.[0]?.video_url ||
      payload?.output?.results?.[0]?.url ||
      payload?.video?.url ||
      payload?.creations?.[0]?.url ||
      payload?.file?.file?.download_url ||
      payload?.file?.file?.url ||
      payload?.file?.download_url ||
      payload?.file?.url ||
      ''
    const nextStatus =
      outputUrl ||
      rawStatus.includes('success') ||
      rawStatus.includes('succeed') ||
      rawStatus === 'done' ||
      rawStatus === 'succeeded'
        ? 'succeeded'
        : rawStatus.includes('fail') || rawStatus.includes('error')
          ? 'failed'
          : 'running'
    return {
      ...job,
      status: nextStatus,
      outputUrl: outputUrl || job.outputUrl || '',
      thumbnailUrl: payload?.thumbnail_url || payload?.creations?.[0]?.cover_url || job.thumbnailUrl || '',
      response: payload,
      errorMessage: nextStatus === 'failed' ? payload?.message || payload?.error || 'provider_failed' : null,
      updatedAt: now(),
    }
  } catch (error) {
    return {
      ...job,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'video_refresh_failed',
      updatedAt: now(),
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function createVideoGenerationJob(actorUserId, project, input = {}) {
  const provider = normalizeVideoProvider(input.provider)
  const job = {
    id: `vgj_${randomUUID()}`,
    workspaceId: project.workspaceId,
    projectId: project.id,
    shotId: String(input.shotId || `shot_${Date.now()}`),
    nodeId: String(input.nodeId || ''),
    provider,
    model: videoProviderModel(provider, input.model),
    status: 'queued',
    prompt: buildVideoPrompt(input),
    duration: String(input.duration || '5s'),
    aspectRatio: String(input.aspectRatio || '9:16'),
    externalId: null,
    outputUrl: '',
    thumbnailUrl: '',
    request: {
      shotId: input.shotId || null,
      beat: input.beat || '',
      scene: input.scene || '',
      camera: input.camera || '',
      motion: input.motion || '',
      caption: input.caption || input.subtitle || input.dialogue || input.beat || '',
      characterRefs: input.characterRefs || [],
      aspectRatio: input.aspectRatio || '9:16',
      resolution: input.resolution || '',
      negativePrompt: input.negativePrompt || '',
      source: input.source || 'playdrama-production-kit',
      batchId: input.batchId || null,
      sequenceIndex: Number.isFinite(Number(input.sequenceIndex)) ? Number(input.sequenceIndex) : null,
      retryOf: input.retryOf || null,
      deliveryUse: input.deliveryUse || 'final-cut',
      qualityGate: input.qualityGate || 'client-preview',
    },
    response: {},
    errorMessage: null,
    createdAt: now(),
    updatedAt: now(),
  }

  const providerResult = await submitVideoProviderTask(job)
  job.status = providerResult.status
  job.externalId = providerResult.externalId
  job.outputUrl = providerResult.outputUrl
  job.thumbnailUrl = providerResult.thumbnailUrl
  job.response = providerResult.response || {}
  job.errorMessage = providerResult.errorMessage || null
  job.updatedAt = now()

  videoGenerationJobs.push(job)
  if (videoGenerationJobs.length > 1000) {
    videoGenerationJobs.splice(0, videoGenerationJobs.length - 1000)
  }
  recordAudit(actorUserId, 'video.job_created', 'video_generation_job', job.id, {
    workspaceId: job.workspaceId,
    projectId: job.projectId,
    shotId: job.shotId,
    provider: job.provider,
    status: job.status,
  })
  await saveDatabase()
  return job
}

async function createVideoGenerationJobsBatch(actorUserId, project, input = {}) {
  const shots = Array.isArray(input.shots) ? input.shots : []
  if (shots.length === 0) return []

  const provider = normalizeVideoProvider(input.provider || VIDEO_PROVIDER)
  const isLive = videoProviderConfigured(provider)
  const limit = isLive ? VIDEO_LIVE_SUBMIT_LIMIT : VIDEO_PROMPT_BATCH_LIMIT
  const selectedShots = shots.slice(0, limit)
  const batchId = input.batchId || `vbatch_${randomUUID()}`
  const jobs = []

  for (const [index, shot] of selectedShots.entries()) {
    jobs.push(
      await createVideoGenerationJob(actorUserId, project, {
        ...shot,
        provider,
        model: input.model || shot.model,
        batchId,
        sequenceIndex: Number.isFinite(Number(shot.sequenceIndex))
          ? Number(shot.sequenceIndex)
          : index + 1,
        source: input.source || shot.source || 'playdrama-video-batch',
        qualityGate: input.qualityGate || shot.qualityGate || 'client-preview',
        deliveryUse: input.deliveryUse || shot.deliveryUse || 'final-cut',
      }),
    )
  }

  recordAudit(actorUserId, 'video.batch_created', 'video_generation_batch', batchId, {
    workspaceId: project.workspaceId,
    projectId: project.id,
    provider,
    requested: shots.length,
    created: jobs.length,
    live: isLive,
  })
  await saveDatabase()
  return jobs
}

async function retryVideoGenerationJob(actorUserId, previousJob) {
  const project = projects.get(previousJob.projectId)
  if (!project) throw new Error('project_not_found')
  const request = previousJob.request || {}
  return createVideoGenerationJob(actorUserId, project, {
    shotId: previousJob.shotId,
    nodeId: previousJob.nodeId,
    provider: previousJob.provider,
    model: previousJob.model,
    prompt: previousJob.prompt,
    duration: previousJob.duration,
    aspectRatio: previousJob.aspectRatio,
    beat: request.beat,
    scene: request.scene,
    camera: request.camera,
    motion: request.motion,
    caption: request.caption,
    characterRefs: request.characterRefs || [],
    negativePrompt: request.negativePrompt,
    resolution: request.resolution,
    source: 'playdrama-video-retry',
    retryOf: previousJob.id,
    batchId: request.batchId || null,
    sequenceIndex: request.sequenceIndex || null,
    deliveryUse: request.deliveryUse || 'final-cut',
    qualityGate: request.qualityGate || 'client-preview',
  })
}

async function refreshVideoGenerationJob(actorUserId, job) {
  const nextJob = await refreshVideoProviderTask(job)
  Object.assign(job, nextJob, { updatedAt: now() })
  recordAudit(actorUserId, 'video.job_refreshed', 'video_generation_job', job.id, {
    workspaceId: job.workspaceId,
    projectId: job.projectId,
    status: job.status,
  })
  await saveDatabase()
  return job
}

let ffmpegAvailableCache = null

function finalVideoRenderCapability() {
  if (ffmpegAvailableCache === null) {
    const result = spawnSync(FFMPEG_BIN, ['-version'], { stdio: 'ignore' })
    ffmpegAvailableCache = result.status === 0
  }

  return {
    mode: ffmpegAvailableCache ? 'ffmpeg' : 'handoff',
    ffmpegAvailable: ffmpegAvailableCache,
    ffmpegPath: FFMPEG_BIN,
    outputDir: FINAL_VIDEO_RENDER_OUTPUT_DIR,
    maxClips: FINAL_VIDEO_RENDER_MAX_CLIPS,
    timeoutMs: FINAL_VIDEO_RENDER_TIMEOUT_MS,
    videoProfile: '720x1280, 24fps, H.264 mp4, visual cut',
    audioPolicy: 'silent-bed-v1: normalize clips with a consistent AAC silent audio bed for downstream mixing.',
    subtitlePolicy: 'sidecar-srt-v1: generate downloadable SRT captions; burned-in subtitles remain optional.',
  }
}

function finalVideoRenderSort(left, right) {
  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
}

function listFinalVideoRenders(projectId) {
  return finalVideoRenders
    .filter((job) => job.projectId === projectId)
    .slice()
    .sort(finalVideoRenderSort)
}

function finalVideoRenderDir(renderId) {
  const root = resolve(FINAL_VIDEO_RENDER_OUTPUT_DIR)
  const dir = resolve(root, renderId)
  if (!isPathInside(root, dir)) {
    throw new Error('invalid_render_output_path')
  }
  return dir
}

function finalVideoRenderFile(renderId, kind = 'file') {
  const dir = finalVideoRenderDir(renderId)
  if (kind === 'manifest') return join(dir, 'manifest.md')
  if (kind === 'manifest-json') return join(dir, 'manifest.json')
  if (kind === 'captions') return join(dir, 'captions.srt')
  return join(dir, 'final.mp4')
}

function safeRenderTitle(value = 'playdrama-final-cut') {
  return String(value || 'playdrama-final-cut')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'playdrama-final-cut'
}

function normalizeRenderClip(input = {}, index = 0) {
  const outputUrl = String(input.outputUrl || input.url || input.sourceUrl || '').trim()
  return {
    id: String(input.id || input.jobId || input.shotId || `clip_${index + 1}`),
    jobId: input.jobId ? String(input.jobId) : null,
    shotId: String(input.shotId || input.id || `shot_${index + 1}`),
    nodeId: input.nodeId ? String(input.nodeId) : '',
    sequenceIndex: Number.isFinite(Number(input.sequenceIndex)) ? Number(input.sequenceIndex) : index + 1,
    label: String(input.label || input.beat || input.shotId || `Clip ${index + 1}`).slice(0, 120),
    caption: String(input.caption || input.subtitle || input.label || input.beat || input.shotId || `Clip ${index + 1}`)
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180),
    duration: String(input.duration || ''),
    outputUrl,
    provider: input.provider ? String(input.provider) : '',
    model: input.model ? String(input.model) : '',
  }
}

function parseDurationSeconds(value, fallback = 5) {
  const text = String(value || '')
  const match = text.match(/(\d+(?:\.\d+)?)/)
  const raw = match ? Number(match[1]) : fallback
  const seconds = /分钟|minute|min/i.test(text) ? raw * 60 : raw
  if (!Number.isFinite(seconds) || seconds <= 0) return fallback
  return Math.max(1.5, Math.min(seconds, 30))
}

function formatSrtTimestamp(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0)
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const wholeSeconds = Math.floor(safeSeconds % 60)
  const milliseconds = Math.round((safeSeconds - Math.floor(safeSeconds)) * 1000)
  const pad = (value, size = 2) => String(value).padStart(size, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(wholeSeconds)},${pad(milliseconds, 3)}`
}

function cleanCaptionText(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 240)
}

function normalizeRenderCaption(input = {}, index = 0, fallbackClip = {}) {
  const startSeconds = Number.isFinite(Number(input.startSeconds))
    ? Number(input.startSeconds)
    : Number.isFinite(Number(input.start))
      ? Number(input.start)
      : 0
  const endSeconds = Number.isFinite(Number(input.endSeconds))
    ? Number(input.endSeconds)
    : Number.isFinite(Number(input.end))
      ? Number(input.end)
      : startSeconds + parseDurationSeconds(input.duration || fallbackClip.duration, 5)
  return {
    index: index + 1,
    clipId: String(input.clipId || fallbackClip.id || `clip_${index + 1}`),
    shotId: String(input.shotId || fallbackClip.shotId || `shot_${index + 1}`),
    startSeconds: Math.max(0, startSeconds),
    endSeconds: Math.max(startSeconds + 0.5, endSeconds),
    text: cleanCaptionText(input.text || input.caption || fallbackClip.caption || fallbackClip.label || fallbackClip.shotId),
  }
}

function buildFinalVideoCaptions(clips, input = {}) {
  if (Array.isArray(input.captions) && input.captions.length > 0) {
    return input.captions
      .map((caption, index) => normalizeRenderCaption(caption, index, clips[index] || {}))
      .filter((caption) => caption.text)
  }

  let cursor = 0
  return clips
    .map((clip, index) => {
      const durationSeconds = parseDurationSeconds(clip.duration, 5)
      const caption = normalizeRenderCaption(
        {
          clipId: clip.id,
          shotId: clip.shotId,
          startSeconds: cursor,
          endSeconds: cursor + durationSeconds,
          text: clip.caption || clip.label || clip.shotId,
        },
        index,
        clip,
      )
      cursor += durationSeconds
      return caption
    })
    .filter((caption) => caption.text)
}

function renderCaptionsSrt(captions = []) {
  return captions
    .map((caption, index) =>
      [
        String(index + 1),
        `${formatSrtTimestamp(caption.startSeconds)} --> ${formatSrtTimestamp(caption.endSeconds)}`,
        caption.text,
      ].join('\n'),
    )
    .join('\n\n')
}

function finalVideoRenderVersion(projectId) {
  const existing = finalVideoRenders.filter((job) => job.projectId === projectId).length
  return {
    number: existing + 1,
    label: `v${existing + 1}`,
  }
}

function normalizeFinalRenderReviewChecklist(input = {}) {
  if (Array.isArray(input.reviewChecklist) && input.reviewChecklist.length > 0) {
    return input.reviewChecklist.map((item, index) => ({
      id: String(item.id || `check_${index + 1}`),
      label: String(item.label || item.title || `审片项 ${index + 1}`).slice(0, 80),
      status: String(item.status || 'needs-review'),
      owner: String(item.owner || '制作人').slice(0, 40),
      note: String(item.note || '').slice(0, 180),
    }))
  }

  return [
    {
      id: 'hook',
      label: '前三秒钩子',
      status: 'needs-review',
      owner: '导演',
      note: '确认开场是否能在前三秒建立冲突、人物目标或悬念。',
    },
    {
      id: 'continuity',
      label: '角色和场景连续性',
      status: 'needs-review',
      owner: '制片',
      note: '确认人物服装、场景空间、镜头顺序没有明显跳变。',
    },
    {
      id: 'captions',
      label: '字幕与口播',
      status: 'needs-review',
      owner: '剪辑',
      note: '当前已生成 SRT 侧挂字幕，精剪前需复核语义和断句。',
    },
    {
      id: 'rights',
      label: '素材版权和商用授权',
      status: 'needs-review',
      owner: '运营',
      note: '确认供应商素材、音乐、字体和人物肖像可用于客户演示。',
    },
  ]
}

function normalizeFinalRenderReviewNotes(input = {}) {
  const source = Array.isArray(input.reviewNotes) ? input.reviewNotes : []
  return source
    .map((item, index) => ({
      id: String(item.id || `note_${index + 1}`),
      author: String(item.author || '客户审片').slice(0, 40),
      frame: String(item.frame || '全片').slice(0, 40),
      severity: String(item.severity || 'needs-changes').slice(0, 32),
      text: String(item.text || '').replace(/\s+/g, ' ').trim().slice(0, 240),
      createdAt: item.createdAt ? String(item.createdAt) : now(),
    }))
    .filter((item) => item.text)
    .slice(0, 40)
}

function buildFinalVideoRenderClips(project, input = {}) {
  const directClips = Array.isArray(input.clips)
    ? input.clips.map((clip, index) => normalizeRenderClip(clip, index)).filter((clip) => clip.outputUrl)
    : []
  const requestedJobIds = new Set(
    (Array.isArray(input.jobIds) ? input.jobIds : Array.isArray(input.videoJobIds) ? input.videoJobIds : [])
      .map((item) => String(item))
      .filter(Boolean),
  )
  const includeDraftClips = input.includeDraftClips === true
  const jobClips = videoGenerationJobs
    .filter((job) => job.projectId === project.id)
    .filter((job) => !requestedJobIds.size || requestedJobIds.has(job.id))
    .filter((job) => job.outputUrl && (includeDraftClips || job.status === 'succeeded'))
    .map((job, index) =>
      normalizeRenderClip(
        {
          id: job.id,
          jobId: job.id,
          shotId: job.shotId,
          nodeId: job.nodeId,
          sequenceIndex: job.request?.sequenceIndex || index + 1,
          label: job.request?.beat || job.shotId,
          duration: job.duration,
          outputUrl: job.outputUrl,
          provider: job.provider,
          model: job.model,
        },
        index,
      ),
    )

  const clips = (directClips.length > 0 ? directClips : jobClips)
    .sort((left, right) => left.sequenceIndex - right.sequenceIndex)
    .slice(0, FINAL_VIDEO_RENDER_MAX_CLIPS)

  return clips
}

function finalVideoRenderManifest(job) {
  const clips = Array.isArray(job.request?.clips) ? job.request.clips : []
  const captions = Array.isArray(job.request?.captions) ? job.request.captions : []
  const reviewChecklist = Array.isArray(job.request?.reviewChecklist) ? job.request.reviewChecklist : []
  const reviewNotes = Array.isArray(job.request?.reviewNotes) ? job.request.reviewNotes : []
  const assets = job.response?.assets || {}
  return [
    `# ${job.title || 'PlayDrama 成片'} MP4 合成交付`,
    '',
    `任务：${job.id}`,
    `版本：${job.request?.version || 'v1'}`,
    `状态：${job.status}`,
    `画幅：${job.aspectRatio || '9:16'}`,
    `片段数：${clips.length}`,
    `字幕：${captions.length > 0 ? `${captions.length} 条 SRT` : '未生成'}`,
    `音轨：${job.request?.audioPolicy || 'silent-bed-v1'}`,
    `字幕策略：${job.request?.subtitlePolicy || 'sidecar-srt-v1'}`,
    `交付模式：${job.request?.deliveryProfile || 'commercial-final-cut-v1'}`,
    `归档策略：${job.request?.archivePolicy || 'workspace-retention-v1'}`,
    `审片结论：${job.request?.clientReview?.verdict || job.response?.reviewStatus || 'waiting-for-render'}`,
    `生成时间：${job.createdAt}`,
    job.outputUrl ? `MP4：${job.outputUrl}` : '',
    assets.captionsUrl ? `字幕文件：${assets.captionsUrl}` : '',
    assets.cdnUrl ? `CDN 地址：${assets.cdnUrl}` : '',
    assets.archiveUrl ? `归档地址：${assets.archiveUrl}` : '',
    job.errorMessage ? `阻断/错误：${job.errorMessage}` : '',
    job.response?.subtitleBurnInError ? `字幕烧录提示：${job.response.subtitleBurnInError}` : '',
    '',
    '## 合成片段',
    ...clips.map((clip, index) => [
      `${index + 1}. ${clip.shotId}｜${clip.label}`,
      `   - 素材：${clip.outputUrl}`,
      clip.caption ? `   - 字幕：${clip.caption}` : '',
      `   - 来源：${[clip.provider || 'manual', clip.model || ''].filter(Boolean).join(' ')}`,
      clip.duration ? `   - 时长：${clip.duration}` : '',
    ].filter(Boolean).join('\n')),
    '',
    '## 审片清单',
    ...reviewChecklist.map((item, index) => (
      `${index + 1}. ${item.label}｜${item.status}｜${item.owner}${item.note ? `\n   - ${item.note}` : ''}`
    )),
    reviewNotes.length > 0 ? '' : '',
    reviewNotes.length > 0 ? '## 审片批注' : '',
    ...reviewNotes.map((item, index) => (
      `${index + 1}. ${item.frame || '全片'}｜${item.severity || 'needs-changes'}｜${item.author || '客户审片'}\n   - ${item.text}`
    )),
    '',
    '## 交付说明',
    '- 当前合成策略：竖屏 720x1280，24fps，H.264 MP4。',
    '- 当前音频策略：统一写入 AAC 音轨床，便于后续混入配乐、口播和音效。',
    '- 当前字幕策略：默认产出 SRT 侧挂字幕；如开启 burned-in，会尽力烧录，失败时保留可下载 MP4 和 SRT。',
    '- 当前归档策略：站内短链可用于试片；接入对象存储和 CDN 后会回填长期播放地址。',
    '- 如果状态为 handoff-ready，说明素材已经整理完成，但服务器还缺 FFmpeg 或合成器配置。',
  ].filter((line) => line !== '').join('\n')
}

function writeFinalVideoRenderManifest(job) {
  const dir = finalVideoRenderDir(job.id)
  mkdirSync(dir, { recursive: true })
  const captions = Array.isArray(job.request?.captions) ? job.request.captions : []
  const assets = {
    ...(job.response?.assets || {}),
    manifestUrl: `/api/video/renders/${encodeURIComponent(job.id)}/manifest`,
    manifestJsonUrl: `/api/video/renders/${encodeURIComponent(job.id)}/manifest.json`,
  }
  if (job.outputUrl) assets.mp4Url = job.outputUrl
  if (captions.length > 0) {
    writeFileSync(finalVideoRenderFile(job.id, 'captions'), renderCaptionsSrt(captions), 'utf8')
    assets.captionsUrl = `/api/video/renders/${encodeURIComponent(job.id)}/captions.srt`
  }
  job.response = {
    ...(job.response || {}),
    assets,
    deliveryProfile: job.request?.deliveryProfile || 'commercial-final-cut-v1',
    reviewStatus: job.status === 'succeeded' ? 'needs-human-review' : 'waiting-for-render',
  }
  writeFileSync(finalVideoRenderFile(job.id, 'manifest-json'), JSON.stringify(job, null, 2), 'utf8')
  writeFileSync(finalVideoRenderFile(job.id, 'manifest'), finalVideoRenderManifest(job), 'utf8')
  job.manifestUrl = `/api/video/renders/${encodeURIComponent(job.id)}/manifest`
}

function ffmpegConcatPath(filePath) {
  return String(filePath).replace(/\\/g, '/').replace(/'/g, "'\\''")
}

function ffmpegSubtitleFilterPath(filePath) {
  return String(filePath)
    .replace(/\\/g, '/')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
}

function runFfmpeg(args, timeoutMs = FINAL_VIDEO_RENDER_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const child = spawn(FFMPEG_BIN, args, { windowsHide: true })
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error('ffmpeg_timeout'))
    }, timeoutMs)

    child.stderr.on('data', (chunk) => {
      stderr = `${stderr}${chunk.toString()}`
      if (stderr.length > 6000) stderr = stderr.slice(-6000)
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(stderr.trim() || `ffmpeg_exit_${code}`))
      }
    })
  })
}

async function renderFinalVideoWithFfmpeg(job) {
  const dir = finalVideoRenderDir(job.id)
  mkdirSync(dir, { recursive: true })
  const clips = Array.isArray(job.request?.clips) ? job.request.clips : []
  const segmentPaths = []
  const captions = Array.isArray(job.request?.captions) ? job.request.captions : []
  const wantsSubtitleBurnIn = String(job.request?.subtitlePolicy || '').includes('burn')
  const canAttemptSubtitleBurnIn = wantsSubtitleBurnIn && captions.length > 0

  for (const [index, clip] of clips.entries()) {
    const segmentPath = join(dir, `segment-${String(index + 1).padStart(3, '0')}.mp4`)
    await runFfmpeg([
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      clip.outputUrl,
      '-f',
      'lavfi',
      '-i',
      'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-filter_complex',
      '[0:v]split=2[bg][fg];[bg]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,gblur=sigma=24,eq=brightness=-0.08:saturation=0.9[bg];[fg]scale=720:1280:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1,fps=24,format=yuv420p[v]',
      '-map',
      '[v]',
      '-map',
      '1:a:0',
      '-shortest',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-c:a',
      'aac',
      '-b:a',
      '96k',
      '-movflags',
      '+faststart',
      segmentPath,
    ])
    segmentPaths.push(segmentPath)
  }

  const concatListPath = join(dir, 'concat.txt')
  writeFileSync(
    concatListPath,
    segmentPaths.map((segmentPath) => `file '${ffmpegConcatPath(segmentPath)}'`).join('\n'),
    'utf8',
  )

  const outputPath = finalVideoRenderFile(job.id, 'file')
  const baseOutputPath = canAttemptSubtitleBurnIn ? join(dir, 'final-base.mp4') : outputPath
  await runFfmpeg([
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    concatListPath,
    '-c',
    'copy',
    '-movflags',
    '+faststart',
    baseOutputPath,
  ])

  let subtitleTrack = captions.length > 0 ? 'srt-sidecar' : 'none'
  let subtitleBurnInError = ''
  if (canAttemptSubtitleBurnIn) {
    const captionsPath = finalVideoRenderFile(job.id, 'captions')
    try {
      await runFfmpeg([
        '-y',
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        baseOutputPath,
        '-vf',
        `subtitles='${ffmpegSubtitleFilterPath(captionsPath)}':force_style='Fontsize=28,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV=80'`,
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '23',
        '-c:a',
        'copy',
        '-movflags',
        '+faststart',
        outputPath,
      ])
      subtitleTrack = 'burned-in-and-srt-sidecar'
    } catch (error) {
      subtitleBurnInError = error instanceof Error ? error.message : 'subtitle_burn_in_failed'
      copyFileSync(baseOutputPath, outputPath)
    }
  }

  job.outputUrl = `/api/video/renders/${encodeURIComponent(job.id)}/file`
  job.response = {
    ...(job.response || {}),
    mode: 'ffmpeg',
    segmentCount: segmentPaths.length,
    outputPath,
    audioTrack: 'silent-aac-bed',
    subtitleTrack,
    ...(subtitleBurnInError ? { subtitleBurnInError } : {}),
    completedAt: now(),
  }
}

async function processFinalVideoRenderJob(renderId) {
  const job = finalVideoRenders.find((item) => item.id === renderId)
  if (!job || (job.status !== 'queued' && job.status !== 'running')) return

  job.status = 'running'
  job.startedAt = job.startedAt || now()
  job.updatedAt = now()
  await saveDatabase()

  const capability = finalVideoRenderCapability()
  if (!capability.ffmpegAvailable) {
    job.status = 'handoff-ready'
    job.errorMessage = 'ffmpeg_not_available'
    job.response = {
      ...(job.response || {}),
      mode: 'handoff',
      reason: 'ffmpeg_not_available',
      nextStep: `Install FFmpeg or set FFMPEG_PATH, then retry render ${job.id}.`,
      capability,
    }
    job.updatedAt = now()
    job.completedAt = now()
    writeFinalVideoRenderManifest(job)
    await saveDatabase()
    return
  }

  try {
    await renderFinalVideoWithFfmpeg(job)
    job.status = 'succeeded'
    job.errorMessage = null
    job.completedAt = now()
  } catch (error) {
    job.status = 'failed'
    job.errorMessage = error instanceof Error ? error.message : 'final_video_render_failed'
    job.response = {
      ...(job.response || {}),
      mode: 'ffmpeg',
      failedAt: now(),
    }
  } finally {
    job.updatedAt = now()
    writeFinalVideoRenderManifest(job)
    await saveDatabase()
  }
}

async function createFinalVideoRender(actorUserId, project, input = {}) {
  const clips = buildFinalVideoRenderClips(project, input)
  const version = input.version
    ? { label: safeRenderTitle(input.version), number: Number(input.versionNumber || 0) || undefined }
    : finalVideoRenderVersion(project.id)
  const captions = buildFinalVideoCaptions(clips, input)
  const reviewChecklist = normalizeFinalRenderReviewChecklist(input)
  const job = {
    id: `fvr_${randomUUID()}`,
    workspaceId: project.workspaceId,
    projectId: project.id,
    status: clips.length > 0 ? 'queued' : 'blocked',
    title: safeRenderTitle(input.title || project.title || 'PlayDrama final cut'),
    aspectRatio: String(input.aspectRatio || '9:16'),
    clipCount: clips.length,
    outputUrl: '',
    manifestUrl: '',
    request: {
      source: input.source || 'playdrama-final-render',
      version: version.label,
      versionNumber: version.number,
      deliveryProfile: String(input.deliveryProfile || 'commercial-final-cut-v1'),
      storagePolicy: String(input.storagePolicy || 'workspace-retention-v1'),
      archivePolicy: String(input.archivePolicy || 'manual-cdn-handoff-v1'),
      musicPolicy: String(input.musicPolicy || 'music-handoff-v1'),
      voiceoverPolicy: String(input.voiceoverPolicy || 'voiceover-handoff-v1'),
      qualityGate: String(input.qualityGate || 'client-review-v1'),
      clientReview: {
        requestedBy: String(input.clientReview?.requestedBy || '客户审片').slice(0, 60),
        verdict: String(input.clientReview?.verdict || 'waiting-for-review').slice(0, 40),
        dueAt: input.clientReview?.dueAt ? String(input.clientReview.dueAt).slice(0, 40) : '',
      },
      clips,
      captions,
      jobIds: Array.isArray(input.jobIds) ? input.jobIds : [],
      includeDraftClips: input.includeDraftClips === true,
      renderProfile: 'vertical-720p-h264',
      audioPolicy: String(input.audioPolicy || 'silent-bed-v1'),
      subtitlePolicy: String(input.subtitlePolicy || 'sidecar-srt-v1'),
      reviewChecklist,
      reviewNotes: normalizeFinalRenderReviewNotes(input),
    },
    response: {
      capability: finalVideoRenderCapability(),
      assets: {},
      archiveStatus: 'workspace-retained',
      reviewStatus: 'waiting-for-render',
    },
    errorMessage: clips.length > 0 ? null : 'no_renderable_clips',
    createdAt: now(),
    startedAt: null,
    updatedAt: now(),
    completedAt: null,
  }

  writeFinalVideoRenderManifest(job)
  finalVideoRenders.push(job)
  if (finalVideoRenders.length > 500) {
    finalVideoRenders.splice(0, finalVideoRenders.length - 500)
  }
  recordAudit(actorUserId, 'video.final_render_created', 'final_video_render', job.id, {
    workspaceId: job.workspaceId,
    projectId: job.projectId,
    status: job.status,
    clipCount: job.clipCount,
    source: job.request.source,
    version: job.request.version,
  })
  await saveDatabase()

  if (job.status === 'queued') {
    setTimeout(() => {
      void processFinalVideoRenderJob(job.id)
    }, 0)
  }

  return job
}

async function updateFinalVideoRenderReview(actorUserId, render, input = {}) {
  const currentNotes = Array.isArray(render.request?.reviewNotes) ? render.request.reviewNotes : []
  const nextNotes = [...currentNotes]
  if (input.note && typeof input.note === 'object') {
    const [note] = normalizeFinalRenderReviewNotes({ reviewNotes: [input.note] })
    if (note) {
      note.id = `note_${randomUUID()}`
      note.createdAt = now()
      nextNotes.push(note)
    }
  }

  const checklistUpdates = Array.isArray(input.checklistUpdates) ? input.checklistUpdates : []
  const updateById = new Map(
    checklistUpdates
      .filter((item) => item && item.id)
      .map((item) => [String(item.id), item]),
  )
  const currentChecklist = Array.isArray(render.request?.reviewChecklist)
    ? render.request.reviewChecklist
    : []
  const nextChecklist = currentChecklist.map((item) => {
    const update = updateById.get(String(item.id))
    if (!update) return item
    return {
      ...item,
      status: update.status ? String(update.status).slice(0, 40) : item.status,
      note: update.note ? String(update.note).slice(0, 180) : item.note,
    }
  })

  const verdict = String(input.verdict || render.request?.clientReview?.verdict || 'needs-changes')
    .slice(0, 40)
  render.request = {
    ...(render.request || {}),
    reviewNotes: nextNotes.slice(-40),
    reviewChecklist: nextChecklist,
    clientReview: {
      ...(render.request?.clientReview || {}),
      verdict,
      reviewedAt: now(),
      reviewedBy: String(input.note?.author || '客户审片').slice(0, 60),
    },
  }
  render.response = {
    ...(render.response || {}),
    reviewStatus: verdict,
  }
  render.updatedAt = now()
  writeFinalVideoRenderManifest(render)
  recordAudit(actorUserId, 'video.final_render_reviewed', 'final_video_render', render.id, {
    workspaceId: render.workspaceId,
    projectId: render.projectId,
    verdict,
    noteCount: render.request.reviewNotes.length,
  })
  await saveDatabase()
  return render
}

function startFinalVideoRenderWorker() {
  const resumableJobs = finalVideoRenders.filter((job) => job.status === 'queued' || job.status === 'running')
  for (const job of resumableJobs) {
    job.status = 'queued'
    job.updatedAt = now()
    setTimeout(() => {
      void processFinalVideoRenderJob(job.id)
    }, 0)
  }
}

function sendFinalVideoRenderAsset(req, res, parts) {
  if (req.method !== 'GET') return false
  if (parts[0] !== 'api' || parts[1] !== 'video' || parts[2] !== 'renders' || !parts[3]) return false
  const job = finalVideoRenders.find((item) => item.id === parts[3])
  if (!job) return false
  const kind = parts[4] || 'manifest'
  const filePath = kind === 'file'
    ? finalVideoRenderFile(job.id, 'file')
    : kind === 'manifest.json'
      ? finalVideoRenderFile(job.id, 'manifest-json')
      : kind === 'captions.srt' || kind === 'subtitles.srt'
        ? finalVideoRenderFile(job.id, 'captions')
        : finalVideoRenderFile(job.id, 'manifest')
  if (!existsSync(filePath) || !statSync(filePath).isFile()) return false
  const contentType =
    kind === 'file'
      ? 'video/mp4'
      : kind === 'manifest.json'
        ? 'application/json; charset=utf-8'
        : kind === 'captions.srt' || kind === 'subtitles.srt'
          ? 'text/plain; charset=utf-8'
          : 'text/markdown; charset=utf-8'
  res.writeHead(200, {
    'content-type': contentType,
    'cache-control': 'private, max-age=60',
    'x-content-type-options': 'nosniff',
  })
  res.end(readFileSync(filePath))
  return true
}

function aiChoice(id, label, targetNodeId, condition = '') {
  return { id, label, targetNodeId, condition }
}

function nextStoryNodeId(project, offset = 1) {
  const highest = (project?.nodes || []).reduce((max, node) => {
    const match = String(node.id || '').match(/^S(\d+)$/i)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  return `S${String(highest + offset).padStart(2, '0')}`
}

function nextGeneratedVariable(project, baseId = 'pressure') {
  const existing = new Set((project?.variables || []).map((item) => item.id))
  let index = 1
  while (existing.has(`${baseId}_${index}`)) index += 1
  return `${baseId}_${index}`
}

function expandBranchDraft(input = {}) {
  const project = input.project || {}
  const selectedNode =
    (project.nodes || []).find((node) => node.id === input.selectedNodeId) ||
    (project.nodes || [])[0] ||
    {}
  const firstId = nextStoryNodeId(project, 1)
  const secondId = nextStoryNodeId(project, 2)
  const variableId = nextGeneratedVariable(project)
  const variableLabel = 'pressure'
  const sourceTitle = selectedNode.title || project.title || 'new clue'
  const cast = (project.characters || []).map((item) => item.name).filter(Boolean)
  const focusCharacter = cast[0] || 'protagonist'
  const hiddenCharacter = cast[1] || 'witness'

  return {
    title: project.title || `Interactive drama: ${sourceTitle}`,
    nodes: [
      {
        id: firstId,
        title: `${sourceTitle} contradiction`,
        kind: 'Choice',
        summary: `${focusCharacter} finds that the previous scene does not fit. ${hiddenCharacter} gives an explanation that exposes a new timeline gap.`,
        metric: 'AI draft',
        choices: [
          aiChoice(`AI-${firstId}-1`, 'Trace the timeline gap', secondId),
          aiChoice(`AI-${firstId}-2`, 'Question the witness directly', secondId, `${variableLabel} >= 1`),
        ],
      },
      {
        id: secondId,
        title: 'Missing surveillance segment',
        kind: 'Puzzle',
        summary: 'A 47-second clip is missing. Players must align clues and testimony before opening the hidden branch.',
        metric: 'New clue',
        choices: [
          aiChoice(`AI-${secondId}-1`, 'Match the reflection clue', secondId, `${variableLabel} >= 2`),
          aiChoice(`AI-${secondId}-2`, 'Return to the safe route', selectedNode.id || firstId),
        ],
      },
    ],
    variables: [
      {
        id: variableId,
        label: variableLabel,
        type: 'number',
        defaultValue: '0',
      },
    ],
    characters:
      cast.length >= 3
        ? []
        : [
            {
              name: 'Anonymous cleaner',
              role: 'New witness / blind-spot observer',
              trait: 'Cautious, quiet, willing to trade evidence for safety.',
              color: '#0ea5e9',
            },
          ],
    qualityChecks: [
      'The branch includes one conditional choice and one puzzle node.',
      'The new variable can gate a later paid or hidden ending.',
      'The draft stays inside the current suspense template and China mainland launch policy.',
    ],
    note: 'Local deterministic generator. Swap this function for a real provider adapter when AI credentials are ready.',
  }
}

function storyOutlineDraft(input = {}) {
  const idea = input.idea || input.prompt || 'midnight calls inside an old hospital'
  const draft = expandBranchDraft({
    project: { title: `Interactive drama: ${idea}`, nodes: [], variables: [], characters: [] },
  })
  return {
    ...draft,
    title: `Interactive drama: ${idea}`,
    note: 'Local outline draft generated from the submitted idea.',
  }
}

function generateProjectDraft(input = {}) {
  const brief = input.brief && typeof input.brief === 'object' ? input.brief : input
  const idea = asString(brief.idea || brief.prompt, '午夜来电后的反转选择')
  const genre = asString(brief.genre, '悬疑反转')
  const audience = asString(brief.audience, '18-35 岁短剧用户')
  const platform = asString(brief.platform, '抖音 / 微信小程序')
  const duration = asString(brief.duration, '8-12 分钟')
  const interactionDensity = asString(brief.interactionDensity, '每 2-3 幕一个选择')
  const monetization = asString(brief.monetization, 'Paid Ending')
  const constraints = asString(brief.constraints, '避免血腥细节，付费线也保留完整免费结局')
  const market = asString(brief.market, 'China Mainland')
  const titleSeed = idea.replace(/[。.!！？?]+$/g, '').slice(0, 18)
  const title = titleSeed ? `${titleSeed}：最后一幕` : '互动短剧：最后一幕'
  const paidEnding = /paid ending|付费|结局/i.test(monetization)

  return {
    title,
    nodes: [
      {
        id: 'S01',
        title: '开场钩子',
        kind: 'Hook',
        summary: `主角在${platform}直播前收到一条与「${idea}」有关的异常线索，原本简单的${genre}事件被推到公众视野。`,
        metric: '3 秒钩子',
        choices: [
          aiChoice('C01A', '公开线索', 'S02'),
          aiChoice('C01B', '先联系当事人', 'S03'),
        ],
      },
      {
        id: 'S02',
        title: '热搜反噬',
        kind: 'Choice',
        summary: `线索公开后，评论区出现两种互相矛盾的证词。主角需要在流量和事实之间做第一次取舍。`,
        metric: '首轮分支',
        choices: [
          aiChoice('C02A', '追踪第一位证人', 'S04', 'trust >= 1'),
          aiChoice('C02B', '保留证据回放', 'S05'),
        ],
      },
      {
        id: 'S03',
        title: '当事人失联',
        kind: 'Puzzle',
        summary: `当事人的最后一条语音被剪掉了关键 9 秒。玩家需要比对时间、位置和语气，找出被隐藏的名字。`,
        metric: '线索拼图',
        choices: [
          aiChoice('C03A', '比对时间线', 'S05', 'clue >= 1'),
          aiChoice('C03B', '绕开当事人关系网', 'S04'),
        ],
      },
      {
        id: 'S04',
        title: '反派递来的合作',
        kind: 'Choice',
        summary: `看似敌对的人递来一份合作协议，承诺给出真相，但要求主角停止公开调查。`,
        metric: '信任测试',
        choices: [
          aiChoice('C04A', '接住协议继续套话', 'S06'),
          aiChoice('C04B', '拒绝合作保留公开线', 'S07'),
        ],
      },
      {
        id: 'S05',
        title: '缺失片段复原',
        kind: 'Puzzle',
        summary: `被剪掉的 9 秒复原后，主角发现真正的威胁来自团队内部，下一步会直接影响结局可信度。`,
        metric: interactionDensity,
        choices: [
          aiChoice('C05A', '带证据正面摊牌', 'S06'),
          aiChoice('C05B', '留证据钓出幕后人', 'S07', 'clue >= 1'),
        ],
      },
      {
        id: 'S06',
        title: '免费线结局',
        kind: 'Ending',
        summary: `主角保住核心证据，公开了足以止损的真相。${audience}能得到完整闭环，但仍会知道幕后仍有未曝光的一层。`,
        metric: '免费完整结局',
        choices: [],
      },
      {
        id: 'S07',
        title: paidEnding ? '付费隐藏结局' : '隐藏反转结局',
        kind: 'Ending',
        summary: paidEnding
          ? `主角用最后一份证据反向布局，揭开真正操盘者。结尾保留付费价值，但不破坏免费线闭环。`
          : `主角反向布局，揭开真正操盘者，并把前面的矛盾全部扣回开场钩子。`,
        metric: paidEnding ? '付费转化点' : '高满意反转',
        choices: [],
      },
    ],
    variables: [
      { id: 'clue', label: '线索', type: 'number', defaultValue: '1' },
      { id: 'trust', label: '信任', type: 'number', defaultValue: '1' },
      { id: 'heat', label: '热度', type: 'number', defaultValue: '0' },
      { id: 'premium_key', label: '隐藏线索', type: 'boolean', defaultValue: 'false' },
    ],
    characters: [
      {
        name: '林昭',
        role: '主角 / 调查者',
        trait: '行动快，容易被流量推着走，但会在关键节点选择保护证据。',
        color: '#2563eb',
      },
      {
        name: '纪眠',
        role: '当事人 / 失联线索源',
        trait: '谨慎，留下半真半假的线索，真实动机需要玩家拆解。',
        color: '#7c3aed',
      },
      {
        name: '唐聿',
        role: '对手 / 潜在盟友',
        trait: '话术稳定，掌握一半真相，用合作试探主角底线。',
        color: '#0f766e',
      },
      {
        name: '方梨',
        role: '内部同伴 / 隐藏变量',
        trait: '看似辅助，实际决定证据是否能进入隐藏结局。',
        color: '#d97706',
      },
    ],
    qualityChecks: [
      `时长目标：${duration}，互动密度：${interactionDensity}。`,
      `目标用户：${audience}，目标平台：${platform}。`,
      `${paidEnding ? '已包含免费线完整结局和付费隐藏结局。' : '已包含免费完整结局和隐藏反转结局。'}`,
      `内容边界：${constraints}`,
      `市场策略：${market}，默认适配中国大陆公开上线。`,
    ],
    note: 'Local full-project draft for short-drama generation.',
  }
}

function characterBibleDraft(input = {}) {
  const project = input.project || {}
  return {
    title: project.title || 'Character bible',
    nodes: [],
    variables: [],
    characters: [
      {
        name: 'New witness',
        role: 'Keeper of a key timeline clue',
        trait: 'Afraid of being implicated, evasive at first, later persuaded by evidence.',
        color: '#6366f1',
      },
    ],
    qualityChecks: ['The character has motive, secret, and a reversible relationship.'],
    note: 'Local character bible draft.',
  }
}

function qualityCheckDraft(input = {}) {
  const project = input.project || {}
  return {
    title: project.title || 'Quality check',
    nodes: [],
    variables: [],
    characters: [],
    qualityChecks: [
      `${(project.nodes || []).length} nodes are available for the current test.`,
      'Add a clear variable change every 2-3 nodes.',
      'Before a paid ending, provide a failure route and a free ordinary ending.',
    ],
    note: 'Local quality check draft.',
  }
}

function localAiDraft(task, input) {
  return (
    task === 'generate-project'
      ? generateProjectDraft(input)
      : task === 'story-outline'
        ? storyOutlineDraft(input)
        : task === 'character-bible'
          ? characterBibleDraft(input)
          : task === 'story-quality-check'
            ? qualityCheckDraft(input)
            : expandBranchDraft(input)
  )
}

function aiStub(task, input) {
  const output = localAiDraft(task, input)

  return {
    providerId: AI_PROVIDER === 'stub' ? 'local-draft' : AI_PROVIDER,
    model: AI_MODEL_NAME || 'local-structured-draft',
    task,
    status: AI_PROVIDER === 'stub' ? 'local-draft' : 'adapter-pending',
    output,
    usage: {
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: '0',
    },
    safety: {
      passed: true,
      flags: [],
    },
    policy: {
      openaiAllowed: false,
      market: 'China Mainland',
    },
  }
}

function parseJsonFromModel(content) {
  if (!content || typeof content !== 'string') {
    throw new Error('AI provider returned an empty response.')
  }
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : content
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI provider response did not contain a JSON object.')
  }
  return JSON.parse(candidate.slice(start, end + 1))
}

function asString(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizeAiOutput(rawOutput, fallbackOutput) {
  const source = rawOutput?.output && typeof rawOutput.output === 'object'
    ? rawOutput.output
    : rawOutput && typeof rawOutput === 'object'
      ? rawOutput
      : {}
  const fallbackNodes = Array.isArray(fallbackOutput.nodes) ? fallbackOutput.nodes : []
  const sourceNodes = Array.isArray(source.nodes) ? source.nodes : []
  const nodes = (sourceNodes.length > 0 ? sourceNodes : fallbackNodes).slice(0, 8).map((node, index) => {
    const fallback = fallbackNodes[index] || fallbackNodes[0] || {}
    const kind = ['Hook', 'Choice', 'Puzzle', 'Ending'].includes(node?.kind)
      ? node.kind
      : fallback.kind || 'Choice'
    const choices = Array.isArray(node?.choices) ? node.choices : fallback.choices || []
    return {
      id: asString(node?.id, fallback.id || `S${String(index + 1).padStart(2, '0')}`),
      title: asString(node?.title, fallback.title || `Story node ${index + 1}`),
      kind,
      summary: asString(node?.summary, fallback.summary || 'Continue the story conflict.'),
      metric: asString(node?.metric, fallback.metric || 'AI draft'),
      choices: choices.slice(0, 4).map((choiceItem, choiceIndex) => ({
        id: asString(choiceItem?.id, `C${index + 1}${choiceIndex + 1}`),
        label: asString(choiceItem?.label, `Choice ${choiceIndex + 1}`),
        targetNodeId: asString(choiceItem?.targetNodeId, node?.id || fallback.id || ''),
        condition: asString(choiceItem?.condition, ''),
      })),
    }
  })

  const sourceVariables = Array.isArray(source.variables) ? source.variables : []
  const fallbackVariables = Array.isArray(fallbackOutput.variables) ? fallbackOutput.variables : []
  const variables = (sourceVariables.length > 0 ? sourceVariables : fallbackVariables).slice(0, 6).map(
    (variable, index) => ({
      id: asString(variable?.id, `var_ai_${index + 1}`),
      label: asString(variable?.label, `Variable ${index + 1}`),
      type: ['number', 'boolean', 'text'].includes(variable?.type) ? variable.type : 'number',
      defaultValue: asString(variable?.defaultValue, variable?.type === 'boolean' ? 'false' : '0'),
    }),
  )

  const sourceCharacters = Array.isArray(source.characters) ? source.characters : []
  const fallbackCharacters = Array.isArray(fallbackOutput.characters) ? fallbackOutput.characters : []
  const characters = (sourceCharacters.length > 0 ? sourceCharacters : fallbackCharacters).slice(0, 5).map(
    (character, index) => ({
      name: asString(character?.name, `Character ${index + 1}`),
      role: asString(character?.role, 'Key story character'),
      trait: asString(character?.trait, 'Has a clear motive and secret.'),
      color: asString(character?.color, '#6366f1'),
    }),
  )

  const qualityChecks = Array.isArray(source.qualityChecks) && source.qualityChecks.length > 0
    ? source.qualityChecks.map((item) => String(item)).slice(0, 8)
    : fallbackOutput.qualityChecks || []

  return {
    title: asString(source.title, fallbackOutput.title || ''),
    nodes,
    variables,
    characters,
    qualityChecks,
    note: asString(source.note, 'Generated by Qwen provider adapter.'),
  }
}

function buildAiPrompt(task, input, fallbackOutput) {
  return [
    'You are PlayDrama Studio interactive short-drama AI director. Output strict JSON only.',
    'Use Simplified Chinese for generated story text. Keep it suitable for China mainland public launch.',
    `Task: ${task}`,
    'Output JSON schema:',
    JSON.stringify({
      title: 'string',
      nodes: [
        {
          id: 'S05',
          title: 'string',
          kind: 'Hook | Choice | Puzzle | Ending',
          summary: 'string',
          metric: 'string',
          choices: [
            {
              id: 'C05A',
              label: 'string',
              targetNodeId: 'S06',
              condition: '',
            },
          ],
        },
      ],
      variables: [{ id: 'var_ai_1', label: 'string', type: 'number | boolean | text', defaultValue: '0' }],
      characters: [{ name: 'string', role: 'string', trait: 'string', color: '#6366f1' }],
      qualityChecks: ['string'],
      note: 'string',
    }),
    'Constraints: node ids must be unique; kind must be Hook, Choice, Puzzle, or Ending; choices.targetNodeId must point to an existing or newly created node.',
    'For expand-branch, add 1-3 nodes that can connect from the selected node and include at least one choice branch.',
    'For generate-project, return a complete 6-8 node editable short-drama project draft with at least 3 characters, 3 variables, 2 endings, and a clear paid or hidden branch when monetization requires it.',
    'For story-outline, return a 4-7 node short-drama skeleton.',
    'For character-bible, focus on characters and optionally add qualityChecks.',
    'For story-quality-check, focus on qualityChecks.',
    `Current input: ${JSON.stringify(input || {})}`,
    `Local fallback draft: ${JSON.stringify(fallbackOutput)}`,
  ].join('\n')
}

async function callQwenChatCompletions(task, input) {
  if (!QWEN_API_KEY) {
    throw new Error('QWEN_API_KEY is required when AI_PROVIDER=qwen.')
  }

  const fallbackOutput = localAiDraft(task, input)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${QWEN_API_KEY}`,
        'content-type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: AI_MODEL_NAME || 'qwen-plus',
        messages: [
          {
            role: 'system',
            content: 'You are a structured JSON generator for interactive short-drama creation.',
          },
          {
            role: 'user',
            content: buildAiPrompt(task, input, fallbackOutput),
          },
        ],
        temperature: 0.7,
        top_p: 0.9,
      }),
    })
    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      const providerMessage = payload?.error?.message || payload?.message || response.statusText
      throw new Error(`Qwen request failed: HTTP ${response.status} ${providerMessage}`)
    }

    const content = payload?.choices?.[0]?.message?.content
    const parsed = parseJsonFromModel(content)
    const output = normalizeAiOutput(parsed, fallbackOutput)
    const usage = payload?.usage || {}

    return {
      providerId: 'qwen',
      model: payload?.model || AI_MODEL_NAME || 'qwen-plus',
      task,
      status: 'succeeded',
      output,
      usage: {
        inputTokens: usage.prompt_tokens || usage.input_tokens || 0,
        outputTokens: usage.completion_tokens || usage.output_tokens || 0,
        totalTokens: usage.total_tokens || 0,
        estimatedCost: 'pending-price-table',
      },
      safety: {
        passed: true,
        flags: [],
      },
      policy: {
        openaiAllowed: true,
        market: 'China Mainland',
      },
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function generateAiResult(task, input) {
  if (AI_PROVIDER === 'qwen') {
    return callQwenChatCompletions(task, input)
  }
  return aiStub(task, input)
}

function estimateAiCost(usage = {}) {
  const inputTokens = Number(usage.inputTokens || 0)
  const outputTokens = Number(usage.outputTokens || 0)
  const inputCost = (inputTokens / 1_000_000) * AI_INPUT_PRICE_PER_MILLION
  const outputCost = (outputTokens / 1_000_000) * AI_OUTPUT_PRICE_PER_MILLION
  return (inputCost + outputCost).toFixed(6)
}

function aiOutputSummary(output = {}) {
  return {
    title: output.title || '',
    nodeCount: Array.isArray(output.nodes) ? output.nodes.length : 0,
    variableCount: Array.isArray(output.variables) ? output.variables.length : 0,
    characterCount: Array.isArray(output.characters) ? output.characters.length : 0,
    qualityCheckCount: Array.isArray(output.qualityChecks) ? output.qualityChecks.length : 0,
  }
}

function aiRequestContext(actorUserId, input = {}) {
  const requestedProjectId = input.project?.id || input.projectId || null
  const project = requestedProjectId ? projects.get(requestedProjectId) : null
  const session = currentSession(actorUserId, input.workspaceId || project?.workspaceId)
  const canAttachProject =
    project &&
    project.workspaceId === session.workspace.id &&
    can(actorUserId, project.workspaceId, 'project:read')

  return {
    workspaceId: canAttachProject ? project.workspaceId : session.workspace.id,
    // The studio can send local draft IDs before first save; keep usage workspace-scoped
    // until the project exists so Postgres foreign keys never block generation.
    projectId: canAttachProject ? requestedProjectId : null,
  }
}

function recordAiUsage(actorUserId, task, input, result, latencyMs) {
  const context = aiRequestContext(actorUserId, input)
  const usage = result.usage || {}
  const event = {
    id: `aiu_${randomUUID()}`,
    workspaceId: context.workspaceId,
    projectId: context.projectId,
    task,
    providerId: result.providerId || AI_PROVIDER,
    model: result.model || AI_MODEL_NAME || '',
    status: result.status || 'unknown',
    inputTokens: Number(usage.inputTokens || 0),
    outputTokens: Number(usage.outputTokens || 0),
    totalTokens: Number(usage.totalTokens || usage.inputTokens + usage.outputTokens || 0),
    estimatedCost: estimateAiCost(usage),
    currency: AI_PRICE_CURRENCY,
    latencyMs,
    outputSummary: aiOutputSummary(result.output),
    createdAt: now(),
  }
  aiUsageEvents.push(event)
  if (aiUsageEvents.length > 1000) aiUsageEvents.splice(0, aiUsageEvents.length - 1000)
  recordAudit(actorUserId, 'ai.generated', 'ai_usage', event.id, {
    workspaceId: event.workspaceId,
    projectId: event.projectId,
    task: event.task,
    providerId: event.providerId,
    model: event.model,
    inputTokens: event.inputTokens,
    outputTokens: event.outputTokens,
    totalTokens: event.totalTokens,
    estimatedCost: event.estimatedCost,
    currency: event.currency,
    latencyMs: event.latencyMs,
  })
  return event
}

async function ensureAiGenerationJobsTable() {
  if (STORAGE_DRIVER !== 'postgres') return

  const pool = await getPgPool()
  await pool.query(`
    create table if not exists ai_generation_jobs (
      id text primary key,
      actor_user_id text not null references app_users(id),
      workspace_id text not null references workspaces(id),
      project_id text references projects(id),
      task text not null,
      input jsonb not null default '{}'::jsonb,
      input_summary jsonb not null default '{}'::jsonb,
      retry_of text,
      status text not null default 'queued',
      stage text not null default 'queued',
      progress integer not null default 0,
      message text not null default '',
      error_code text not null default '',
      error_message text not null default '',
      raw_error_message text not null default '',
      output_summary jsonb,
      result jsonb,
      usage_event_id text references ai_usage_events(id),
      created_at timestamptz not null default now(),
      started_at timestamptz,
      updated_at timestamptz not null default now(),
      completed_at timestamptz
    )
  `)
  await pool.query(`
    create index if not exists idx_ai_generation_jobs_workspace_created
      on ai_generation_jobs (workspace_id, created_at desc)
  `)
  await pool.query(`
    create index if not exists idx_ai_generation_jobs_status_updated
      on ai_generation_jobs (status, updated_at desc)
  `)
  await pool.query(`
    create index if not exists idx_ai_generation_jobs_retry_of
      on ai_generation_jobs (retry_of)
  `)
}

async function ensureFinalVideoRendersTable() {
  if (STORAGE_DRIVER !== 'postgres') return

  const pool = await getPgPool()
  await pool.query(`
    create table if not exists final_video_renders (
      id text primary key,
      workspace_id text not null references workspaces(id),
      project_id text not null references projects(id),
      status text not null,
      title text not null default '',
      aspect_ratio text not null default '9:16',
      clip_count integer not null default 0,
      output_url text not null default '',
      manifest_url text not null default '',
      request jsonb not null default '{}'::jsonb,
      response jsonb not null default '{}'::jsonb,
      error_message text,
      created_at timestamptz not null default now(),
      started_at timestamptz,
      updated_at timestamptz not null default now(),
      completed_at timestamptz
    )
  `)
  await pool.query(`
    create index if not exists idx_final_video_renders_project_created
      on final_video_renders (project_id, created_at desc)
  `)
  await pool.query(`
    create index if not exists idx_final_video_renders_status_updated
      on final_video_renders (status, updated_at desc)
  `)
}

async function ensureCanvasRuntimeTables() {
  if (STORAGE_DRIVER !== 'postgres') return

  const pool = await getPgPool()
  await pool.query(`
    create table if not exists canvas_assets (
      id text primary key,
      workspace_id text not null references workspaces(id),
      project_id text not null references projects(id),
      node_id text,
      type text not null default 'script',
      name text not null default '',
      meta text not null default '',
      source text not null default '',
      status text not null default 'ready',
      file_name text not null default '',
      mime_type text not null default '',
      size bigint not null default 0,
      url text not null default '',
      created_by text references app_users(id),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `)
  await pool.query(`
    create table if not exists canvas_node_runs (
      id text primary key,
      workspace_id text not null references workspaces(id),
      project_id text not null references projects(id),
      node_id text not null,
      node_title text not null default '',
      node_type text not null default 'text',
      asset_id text references canvas_assets(id),
      status text not null default 'succeeded',
      progress integer not null default 100,
      message text not null default '',
      output_title text not null default '',
      output_preview text not null default '',
      model text not null default '',
      prompt text not null default '',
      credits integer not null default 0,
      created_by text references app_users(id),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `)
  await pool.query(`
    create table if not exists canvas_workflow_runs (
      id text primary key,
      workspace_id text not null references workspaces(id),
      project_id text not null references projects(id),
      status text not null default 'running',
      scope text not null default 'all',
      start_node_id text not null default '',
      node_ids jsonb not null default '[]'::jsonb,
      run_ids jsonb not null default '[]'::jsonb,
      credits integer not null default 0,
      message text not null default '',
      created_by text references app_users(id),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      completed_at timestamptz
    )
  `)
  await pool.query(`
    create index if not exists idx_canvas_assets_project_created
      on canvas_assets (project_id, created_at desc)
  `)
  await pool.query(`
    create index if not exists idx_canvas_assets_node_created
      on canvas_assets (node_id, created_at desc)
  `)
  await pool.query(`
    create index if not exists idx_canvas_node_runs_project_updated
      on canvas_node_runs (project_id, updated_at desc)
  `)
  await pool.query(`
    create index if not exists idx_canvas_node_runs_node_updated
      on canvas_node_runs (node_id, updated_at desc)
  `)
  await pool.query(`
    create index if not exists idx_canvas_workflow_runs_project_updated
      on canvas_workflow_runs (project_id, updated_at desc)
  `)
}

async function persistAiGenerationJob(job) {
  if (STORAGE_DRIVER !== 'postgres') {
    await saveDatabase()
    return job
  }

  await ensureAiGenerationJobsTable()
  const pool = await getPgPool()
  await pool.query(
    `insert into ai_generation_jobs
      (id, actor_user_id, workspace_id, project_id, task, input, input_summary, retry_of, status, stage, progress, message, error_code, error_message, raw_error_message, output_summary, result, usage_event_id, created_at, started_at, updated_at, completed_at)
     values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb, $17::jsonb, $18, $19, $20, $21, $22)
     on conflict (id) do update set
      actor_user_id = excluded.actor_user_id,
      workspace_id = excluded.workspace_id,
      project_id = excluded.project_id,
      task = excluded.task,
      input = excluded.input,
      input_summary = excluded.input_summary,
      retry_of = excluded.retry_of,
      status = excluded.status,
      stage = excluded.stage,
      progress = excluded.progress,
      message = excluded.message,
      error_code = excluded.error_code,
      error_message = excluded.error_message,
      raw_error_message = excluded.raw_error_message,
      output_summary = excluded.output_summary,
      result = excluded.result,
      usage_event_id = excluded.usage_event_id,
      started_at = excluded.started_at,
      updated_at = excluded.updated_at,
      completed_at = excluded.completed_at`,
    [
      job.id,
      job.actorUserId,
      job.workspaceId,
      job.projectId || null,
      job.task,
      JSON.stringify(job.input || {}),
      JSON.stringify(job.inputSummary || {}),
      job.retryOf || null,
      job.status || 'queued',
      job.stage || 'queued',
      Number(job.progress || 0),
      job.message || '',
      job.errorCode || '',
      job.errorMessage || '',
      job.rawErrorMessage || '',
      JSON.stringify(job.outputSummary || null),
      JSON.stringify(job.result || null),
      job.usageEventId || job.result?.usageEvent?.id || null,
      job.createdAt || now(),
      job.startedAt || null,
      job.updatedAt || job.createdAt || now(),
      job.completedAt || null,
    ],
  )
  return job
}

function aiGenerationJobSummary(input = {}) {
  const brief = input.brief || {}
  const project = input.project || {}
  return {
    idea: String(brief.idea || input.idea || input.prompt || '').slice(0, 140),
    genre: String(brief.genre || '').slice(0, 40),
    monetization: String(brief.monetization || project.publish?.monetization || '').slice(0, 40),
    projectTitle: String(project.title || '').slice(0, 80),
  }
}

function aiGenerationJobError(error) {
  const rawMessage = error instanceof Error ? error.message : String(error || 'generation_failed')
  const message = rawMessage || 'generation_failed'
  if (/aborted|abort|timeout/i.test(message)) {
    return {
      code: 'provider_timeout',
      message: '模型生成超时。完整短剧生产包通常需要 50 秒左右，请稍后重试。',
      rawMessage: message,
    }
  }
  if (/401|403|api key|unauthorized|forbidden/i.test(message)) {
    return {
      code: 'provider_auth_failed',
      message: '模型供应商鉴权失败，请检查 API Key、模型权限和账户状态。',
      rawMessage: message,
    }
  }
  if (/quota|balance|credit|insufficient|余额|额度|欠费/i.test(message)) {
    return {
      code: 'provider_quota_limited',
      message: '模型供应商额度不足或账户余额不可用，请充值或切换供应商后重试。',
      rawMessage: message,
    }
  }
  if (/json|parse/i.test(message)) {
    return {
      code: 'provider_output_invalid',
      message: '模型返回格式不符合生产包结构，已拦截。可以重试一次或缩短 brief。',
      rawMessage: message,
    }
  }
  return {
    code: 'provider_failed',
    message: `生成失败：${message}`,
    rawMessage: message,
  }
}

function publicAiGenerationJob(job) {
  return {
    id: job.id,
    task: job.task,
    workspaceId: job.workspaceId,
    projectId: job.projectId,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    message: job.message,
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
    retryOf: job.retryOf,
    inputSummary: job.inputSummary,
    outputSummary: job.outputSummary,
    usageEventId: job.usageEventId,
    result: job.result,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt,
  }
}

function pruneAiGenerationJobs() {
  const cutoff = Date.now() - 6 * 60 * 60 * 1000
  for (let index = aiGenerationJobs.length - 1; index >= 0; index -= 1) {
    const job = aiGenerationJobs[index]
    const done = ['succeeded', 'failed', 'cancelled'].includes(job.status)
    if (done && new Date(job.updatedAt || job.createdAt).getTime() < cutoff) {
      aiGenerationJobs.splice(index, 1)
    }
  }
  if (aiGenerationJobs.length > 200) {
    aiGenerationJobs.splice(0, aiGenerationJobs.length - 200)
  }
}

function updateAiGenerationJob(job, patch = {}) {
  Object.assign(job, patch, { updatedAt: now() })
  return job
}

async function runAiGenerationJob(job) {
  updateAiGenerationJob(job, {
    status: 'running',
    stage: 'provider_request',
    progress: 18,
    message: '正在连接模型供应商',
    startedAt: now(),
  })
  await persistAiGenerationJob(job)

  const startedAt = Date.now()
  try {
    updateAiGenerationJob(job, {
      progress: 38,
      message: '正在生成剧情结构、分镜和角色设定',
    })
    await persistAiGenerationJob(job)
    const result = await generateAiResult(job.task, job.input)
    updateAiGenerationJob(job, {
      stage: 'usage_accounting',
      progress: 82,
      message: '正在写入成本账本',
    })
    await persistAiGenerationJob(job)
    const usageEvent = recordAiUsage(
      job.actorUserId,
      job.task,
      job.input,
      result,
      Date.now() - startedAt,
    )
    job.usageEventId = usageEvent.id
    result.usageEvent = usageEvent
    await saveDatabase()
    updateAiGenerationJob(job, {
      status: 'succeeded',
      stage: 'completed',
      progress: 100,
      message: '短剧生产包已生成',
      outputSummary: aiOutputSummary(result.output),
      result,
      completedAt: now(),
    })
    recordAudit(job.actorUserId, 'ai.job_succeeded', 'ai_generation_job', job.id, {
      workspaceId: job.workspaceId,
      projectId: job.projectId,
      task: job.task,
      providerId: result.providerId,
      model: result.model,
      usageEventId: usageEvent.id,
    })
    await saveDatabase()
  } catch (error) {
    const readable = aiGenerationJobError(error)
    updateAiGenerationJob(job, {
      status: 'failed',
      stage: 'failed',
      progress: 100,
      message: readable.message,
      errorCode: readable.code,
      errorMessage: readable.message,
      rawErrorMessage: readable.rawMessage,
      completedAt: now(),
    })
    recordAudit(job.actorUserId, 'ai.job_failed', 'ai_generation_job', job.id, {
      workspaceId: job.workspaceId,
      projectId: job.projectId,
      task: job.task,
      errorCode: readable.code,
      errorMessage: readable.message,
    })
    await saveDatabase()
  }
}

function startAiGenerationJob(job) {
  if (!job || runningAiGenerationJobIds.has(job.id)) return
  if (['succeeded', 'failed', 'cancelled'].includes(job.status)) return

  runningAiGenerationJobIds.add(job.id)
  void runAiGenerationJob(job).finally(() => {
    runningAiGenerationJobIds.delete(job.id)
  })
}

async function recoverAiGenerationJobs() {
  const recoverableJobs = aiGenerationJobs.filter((job) => {
    if (job.status === 'queued') return true
    return job.status === 'running' && !runningAiGenerationJobIds.has(job.id)
  })

  for (const job of recoverableJobs) {
    if (job.status === 'running' && !runningAiGenerationJobIds.has(job.id)) {
      updateAiGenerationJob(job, {
        status: 'queued',
        stage: 'recovered',
        progress: Math.max(5, Number(job.progress || 5)),
        message: '服务恢复后已重新进入后台队列',
        startedAt: null,
      })
      await persistAiGenerationJob(job)
    }
    startAiGenerationJob(job)
  }
}

function startAiGenerationJobWorker() {
  void recoverAiGenerationJobs().catch((error) => {
    console.error('AI generation job recovery failed:', error.message)
  })
  const timer = setInterval(() => {
    void recoverAiGenerationJobs().catch((error) => {
      console.error('AI generation job worker failed:', error.message)
    })
  }, 30_000)
  timer.unref?.()
}

async function createAiGenerationJob(actorUserId, task, input = {}, retryOf = '') {
  const context = aiRequestContext(actorUserId, input)
  if (!can(actorUserId, context.workspaceId, 'project:write')) {
    const error = new Error('forbidden')
    error.statusCode = 403
    throw error
  }

  pruneAiGenerationJobs()
  const job = {
    id: `aij_${randomUUID()}`,
    actorUserId,
    workspaceId: context.workspaceId,
    projectId: context.projectId,
    task,
    input,
    inputSummary: aiGenerationJobSummary(input),
    retryOf: retryOf || null,
    status: 'queued',
    stage: 'queued',
    progress: 5,
    message: '已进入后台队列',
    errorCode: '',
    errorMessage: '',
    rawErrorMessage: '',
    outputSummary: null,
    result: null,
    createdAt: now(),
    startedAt: null,
    updatedAt: now(),
    completedAt: null,
  }
  aiGenerationJobs.push(job)
  recordAudit(actorUserId, 'ai.job_created', 'ai_generation_job', job.id, {
    workspaceId: job.workspaceId,
    projectId: job.projectId,
    task: job.task,
    retryOf: job.retryOf,
  })
  await saveDatabase()
  startAiGenerationJob(job)
  return job
}

function findAiGenerationJob(jobId) {
  return aiGenerationJobs.find((job) => job.id === jobId) || null
}

function assertCanReadAiGenerationJob(actorUserId, job) {
  if (!job) {
    const error = new Error('ai_job_not_found')
    error.statusCode = 404
    throw error
  }
  if (!can(actorUserId, job.workspaceId, 'project:read')) {
    const error = new Error('forbidden')
    error.statusCode = 403
    throw error
  }
}

function aiProviderStatus() {
  const aiReadiness = evaluateProductionReadiness(process.env).items.filter((item) =>
    item.id.startsWith('ai-'),
  )
  const missing = aiReadiness.filter((item) => !item.ok)
  return {
    provider: AI_PROVIDER,
    model: AI_MODEL_NAME || null,
    providers: domesticProviders,
    openaiPolicy: 'Disabled for China public launch',
    contentSafetyRequired: true,
    apiKeyConfigured:
      AI_PROVIDER === 'qwen'
        ? Boolean(QWEN_API_KEY)
        : AI_PROVIDER === 'stub'
          ? false
          : Boolean(process.env[`${AI_PROVIDER.toUpperCase()}_API_KEY`]),
    pricing: {
      currency: AI_PRICE_CURRENCY,
      inputPerMillion: AI_INPUT_PRICE_PER_MILLION,
      outputPerMillion: AI_OUTPUT_PRICE_PER_MILLION,
    },
    productionReady: missing.length === 0,
    readiness: aiReadiness,
    missing,
  }
}

export async function handle(req, res) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {})
    return
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`)
  if (sendLegalPage(req, res, url)) {
    return
  }

  if (sendFrontendAsset(req, res, url)) {
    return
  }

  const parts = url.pathname.split('/').filter(Boolean)
  const actorUserId = await requestUserId(req)

  try {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      sendJson(res, 200, {
        ok: true,
        service: 'playdrama-api',
        time: now(),
        storage: storageReadiness(),
        auth: {
          ...authProviderStatus(),
          activeUserId,
        },
        email: emailProviderStatus(),
        sms: smsProviderStatus(),
        payment: paymentProviderStatus(),
        distribution: distributionProviderStatus(),
        commercialReadiness: evaluateProductionReadiness(process.env),
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/readiness') {
      sendJson(res, 200, evaluateProductionReadiness(process.env))
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/auth/providers') {
      sendJson(res, 200, authProviderStatus())
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/email/provider') {
      sendJson(res, 200, emailProviderStatus())
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/sms/provider') {
      sendJson(res, 200, smsProviderStatus())
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/payment/provider') {
      sendJson(res, 200, paymentProviderStatus())
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/distribution/providers') {
      sendJson(res, 200, distributionProviderStatus())
      return
    }

    if (sendFinalVideoRenderAsset(req, res, parts)) {
      return
    }

    if (requiresAuthenticatedUser(req, url, parts) && !actorUserId) {
      unauthorized(res)
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/ops/launch-guard') {
      sendJson(
        res,
        200,
        summarizeLaunchGuard({
          workspaceId: url.searchParams.get('workspaceId') || '',
          projectId: url.searchParams.get('projectId') || '',
          buildId: url.searchParams.get('buildId') || '',
        }),
      )
      return
    }

    if (
      parts[0] === 'api' &&
      parts[1] === 'marketing' &&
      parts[2] === 'leads' &&
      parts.length === 3
    ) {
      if (req.method === 'POST') {
        const body = await readBody(req)
        const lead = await createMarketingLead(body, req)
        sendJson(res, 201, { lead })
        return
      }

      if (req.method === 'GET') {
        const leads = await listMarketingLeads()
        sendJson(res, 200, { leads })
        return
      }
    }

    if (
      req.method === 'POST' &&
      parts[0] === 'api' &&
      parts[1] === 'email' &&
      parts[2] === 'callbacks' &&
      parts[3]
    ) {
      const rawBody = await readRawBody(req)
      if (!isValidEmailCallback(req, rawBody)) {
        sendJson(res, 401, { error: 'invalid_email_callback_secret' })
        return
      }

      const body = parseJsonBody(rawBody)
      const delivery = await updateInviteDeliveryFromCallback(parts[3], body)
      sendJson(res, 200, { delivery })
      return
    }

    if (
      req.method === 'POST' &&
      parts[0] === 'api' &&
      parts[1] === 'payment' &&
      parts[2] === 'callbacks' &&
      parts[3]
    ) {
      const rawBody = await readRawBody(req)
      if (parts[3] === 'alipay') {
        await handleAlipayCallback(rawBody)
        sendText(res, 200, 'success')
        return
      }
      if (parts[3] === 'wechat') {
        await handleWechatCallback(req, rawBody)
        sendJson(res, 200, { code: 'SUCCESS', message: 'success' })
        return
      }
      notFound(res)
      return
    }

    if (
      req.method === 'PATCH' &&
      parts[0] === 'api' &&
      parts[1] === 'payment' &&
      parts[2] === 'orders' &&
      parts[3]
    ) {
      const body = await readBody(req)
      const order = await updatePaymentOrderOps(actorUserId, parts[3], body)
      sendJson(res, 200, { order })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/me') {
      sendJson(
        res,
        200,
        currentSession(actorUserId, url.searchParams.get('workspaceId') || undefined),
      )
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/email-code/request') {
      const body = await readBody(req)
      const result = await requestEmailLoginCode(body)
      sendJson(res, 200, result)
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/email-code/verify') {
      const body = await readBody(req)
      const auth = await verifyEmailLoginCode(body)
      sendJson(res, 200, auth)
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/sms-code/request') {
      const body = await readBody(req)
      const result = await requestSmsLoginCode(body)
      sendJson(res, 200, result)
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/sms-code/verify') {
      const body = await readBody(req)
      const auth = await verifySmsLoginCode(body)
      sendJson(res, 200, auth)
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      if (AUTH_PROVIDER !== 'local-demo') {
        sendJson(res, 409, {
          error: 'provider_managed_login',
          provider: AUTH_PROVIDER,
          action: 'Use the configured identity provider login flow.',
        })
        return
      }
      const body = await readBody(req)
      const auth = await loginUser(body)
      sendJson(res, 200, auth)
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
      const session = await logoutUser(req)
      sendJson(res, 200, { session })
      return
    }

    if (
      req.method === 'POST' &&
      parts[0] === 'api' &&
      parts[1] === 'invitations' &&
      parts[2] &&
      parts[3] === 'accept'
    ) {
      const accepted = await acceptInvitation(parts[2])
      sendJson(res, 200, accepted)
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/workspaces') {
      const session = currentSession(actorUserId)
      const visibleWorkspaces = memberships
        .filter((item) => item.userId === session.user.id)
        .map((item) => workspaces.get(item.workspaceId))
        .filter(Boolean)
      sendJson(res, 200, { workspaces: visibleWorkspaces })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/workspaces') {
      const body = await readBody(req)
      const created = await createWorkspace(actorUserId, body)
      sendJson(res, 201, created)
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/roles') {
      sendJson(res, 200, { roles: rolePresets })
      return
    }

    if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'workspaces' && parts.length === 3) {
      const workspaceId = parts[2]
      if (!workspaces.has(workspaceId)) {
        notFound(res)
        return
      }
      if (!can(actorUserId, workspaceId, 'project:read')) {
        forbidden(res)
        return
      }
      sendJson(res, 200, { workspace: workspaces.get(workspaceId) })
      return
    }

    if (
      req.method === 'GET' &&
      parts[0] === 'api' &&
      parts[1] === 'workspaces' &&
      parts[3] === 'members' &&
      parts.length === 4
    ) {
      const workspaceId = parts[2]
      if (!can(actorUserId, workspaceId, 'member:manage')) {
        forbidden(res)
        return
      }
      const members = memberships
        .filter((item) => item.workspaceId === workspaceId)
        .map((item) => ({
          ...item,
          user: users.get(item.userId),
        }))
      sendJson(res, 200, { members })
      return
    }

    if (
      req.method === 'POST' &&
      parts[0] === 'api' &&
      parts[1] === 'workspaces' &&
      parts[3] === 'members' &&
      parts.length === 4
    ) {
      const workspaceId = parts[2]
      if (!workspaces.has(workspaceId)) {
        notFound(res)
        return
      }
      if (!can(actorUserId, workspaceId, 'member:manage')) {
        forbidden(res)
        return
      }
      const body = await readBody(req)
      const member = await inviteMember(actorUserId, workspaceId, body)
      sendJson(res, 201, { member })
      return
    }

    if (
      req.method === 'GET' &&
      parts[0] === 'api' &&
      parts[1] === 'workspaces' &&
      parts[3] === 'invite-deliveries'
    ) {
      const workspaceId = parts[2]
      if (!workspaces.has(workspaceId)) {
        notFound(res)
        return
      }
      if (!can(actorUserId, workspaceId, 'member:manage')) {
        forbidden(res)
        return
      }
      const deliveries = inviteEmailDeliveries
        .filter((item) => item.workspaceId === workspaceId)
        .slice()
        .reverse()
      sendJson(res, 200, { deliveries })
      return
    }

    if (
      req.method === 'PATCH' &&
      parts[0] === 'api' &&
      parts[1] === 'workspaces' &&
      parts[3] === 'invite-deliveries' &&
      parts[4]
    ) {
      const workspaceId = parts[2]
      const deliveryId = parts[4]
      if (!workspaces.has(workspaceId)) {
        notFound(res)
        return
      }
      if (!can(actorUserId, workspaceId, 'member:manage')) {
        forbidden(res)
        return
      }
      const body = await readBody(req)
      const delivery = await updateInviteDelivery(actorUserId, workspaceId, deliveryId, body)
      sendJson(res, 200, { delivery })
      return
    }

    if (
      parts[0] === 'api' &&
      parts[1] === 'workspaces' &&
      parts[3] === 'members' &&
      parts[4] &&
      parts[5] === 'resend'
    ) {
      const workspaceId = parts[2]
      const memberId = parts[4]
      if (!workspaces.has(workspaceId)) {
        notFound(res)
        return
      }
      if (!can(actorUserId, workspaceId, 'member:manage')) {
        forbidden(res)
        return
      }
      if (req.method === 'POST') {
        const member = await resendInvitation(actorUserId, workspaceId, memberId)
        sendJson(res, 200, { member })
        return
      }
    }

    if (
      parts[0] === 'api' &&
      parts[1] === 'workspaces' &&
      parts[3] === 'members' &&
      parts[4] &&
      parts[5] === 'invite' &&
      req.method === 'DELETE'
    ) {
      const workspaceId = parts[2]
      const memberId = parts[4]
      if (!workspaces.has(workspaceId)) {
        notFound(res)
        return
      }
      if (!can(actorUserId, workspaceId, 'member:manage')) {
        forbidden(res)
        return
      }
      const member = await cancelInvitation(actorUserId, workspaceId, memberId)
      sendJson(res, 200, { member })
      return
    }

    if (
      parts[0] === 'api' &&
      parts[1] === 'workspaces' &&
      parts[3] === 'projects'
    ) {
      const workspaceId = parts[2]
      if (!workspaces.has(workspaceId)) {
        notFound(res)
        return
      }

      if (req.method === 'GET') {
        if (!can(actorUserId, workspaceId, 'project:read')) {
          forbidden(res)
          return
        }
        const workspaceProjects = [...projects.values()].filter(
          (project) => project.workspaceId === workspaceId,
        )
        sendJson(res, 200, { projects: workspaceProjects })
        return
      }

      if (req.method === 'POST') {
        if (!can(actorUserId, workspaceId, 'project:write')) {
          forbidden(res)
          return
        }
        const body = await readBody(req)
        const project = await createProject(actorUserId, workspaceId, body)
        sendJson(res, 201, { project })
        return
      }
    }

    if (parts[0] === 'api' && parts[1] === 'projects' && parts[2]) {
      const projectId = parts[2]
      const project = projects.get(projectId)

      if (parts.length === 3) {
        if (!project) {
          notFound(res)
          return
        }

        if (req.method === 'GET') {
          sendJson(res, 200, { project })
          return
        }

        if (req.method === 'PATCH') {
          if (!can(actorUserId, project.workspaceId, 'project:write')) {
            forbidden(res)
            return
          }
          const body = await readBody(req)
          const nextProject = { ...project, ...body, id: project.id, updatedAt: now() }
          projects.set(project.id, nextProject)
          recordAudit(actorUserId, 'project.updated', 'project', project.id, { title: nextProject.title })
          await saveDatabase()
          sendJson(res, 200, { project: nextProject })
          return
        }

        if (req.method === 'DELETE') {
          if (!can(actorUserId, project.workspaceId, 'project:write')) {
            forbidden(res)
            return
          }
          projects.delete(project.id)
          recordAudit(actorUserId, 'project.deleted', 'project', project.id, { title: project.title })
          await saveDatabase()
          sendJson(res, 200, { deleted: true })
          return
        }
      }

      if (parts[3] === 'content-safety') {
        if (!project) {
          notFound(res)
          return
        }

        if (parts[4] === 'reviews' && req.method === 'GET') {
          if (!can(actorUserId, project.workspaceId, 'project:read')) {
            forbidden(res)
            return
          }
          const reviews = contentSafetyReviews
            .filter((review) => review.projectId === project.id)
            .slice()
            .reverse()
          sendJson(res, 200, { reviews })
          return
        }

        if (parts[4] === 'scan' && req.method === 'POST') {
          if (!can(actorUserId, project.workspaceId, 'project:write')) {
            forbidden(res)
            return
          }
          const review = recordContentSafetyReview(actorUserId, project)
          await saveDatabase()
          sendJson(res, 201, { review })
          return
        }
      }

      if (parts[3] === 'builds') {
        if (!project) {
          notFound(res)
          return
        }

        if (req.method === 'POST') {
          if (!can(actorUserId, project.workspaceId, 'project:publish')) {
            forbidden(res)
            return
          }
          const build = await createBuild(actorUserId, project)
          sendJson(res, 201, { build })
          return
        }

        if (req.method === 'GET') {
          const projectBuilds = [...builds.values()].filter(
            (build) => build.projectId === project.id,
          )
          sendJson(res, 200, { builds: projectBuilds })
          return
        }
      }

      if (parts[3] === 'distribution' && parts[4] === 'jobs') {
        if (!project) {
          notFound(res)
          return
        }

        if (req.method === 'GET') {
          if (!can(actorUserId, project.workspaceId, 'project:read')) {
            forbidden(res)
            return
          }
          const jobs = listDistributionJobs(project.id, url.searchParams.get('buildId') || '')
          sendJson(res, 200, { jobs })
          return
        }

        if (req.method === 'POST') {
          if (!can(actorUserId, project.workspaceId, 'project:publish')) {
            forbidden(res)
            return
          }
          const body = await readBody(req)
          const job = await createDistributionJob(actorUserId, project, body)
          sendJson(res, 201, { job })
          return
        }
      }

      if (parts[3] === 'canvas' && parts[4] === 'assets') {
        if (!project) {
          notFound(res)
          return
        }

        if (req.method === 'GET') {
          if (!can(actorUserId, project.workspaceId, 'project:read')) {
            forbidden(res)
            return
          }
          sendJson(res, 200, { assets: listCanvasAssets(project.id) })
          return
        }

        if (req.method === 'POST') {
          if (!can(actorUserId, project.workspaceId, 'project:write')) {
            forbidden(res)
            return
          }
          const body = await readBody(req)
          const asset = await createCanvasAsset(actorUserId, project, body)
          sendJson(res, 201, { asset })
          return
        }
      }

      if (parts[3] === 'canvas' && parts[4] === 'node-runs') {
        if (!project) {
          notFound(res)
          return
        }

        if (req.method === 'GET') {
          if (!can(actorUserId, project.workspaceId, 'project:read')) {
            forbidden(res)
            return
          }
          sendJson(res, 200, { runs: listCanvasNodeRuns(project.id) })
          return
        }
      }

      if (
        parts[3] === 'canvas' &&
        parts[4] === 'nodes' &&
        parts[5] &&
        parts[6] === 'run' &&
        req.method === 'POST'
      ) {
        if (!project) {
          notFound(res)
          return
        }
        if (!can(actorUserId, project.workspaceId, 'project:write')) {
          forbidden(res)
          return
        }
        const body = await readBody(req)
        const result = await createCanvasNodeRun(actorUserId, project, parts[5], body)
        if (!result) {
          notFound(res)
          return
        }
        sendJson(res, 202, result)
        return
      }

      if (
        parts[3] === 'canvas' &&
        parts[4] === 'workflows' &&
        parts[5] === 'run' &&
        req.method === 'POST'
      ) {
        if (!project) {
          notFound(res)
          return
        }
        if (!can(actorUserId, project.workspaceId, 'project:write')) {
          forbidden(res)
          return
        }
        const body = await readBody(req)
        const workflow = await createCanvasWorkflowRun(actorUserId, project, body)
        sendJson(res, 202, {
          workflow,
          runs: workflow.runIds
            .map((runId) => canvasNodeRuns.find((run) => run.id === runId))
            .filter(Boolean),
          assets: listCanvasAssets(project.id).filter((asset) => workflow.runIds.some((runId) => {
            const run = canvasNodeRuns.find((item) => item.id === runId)
            return run?.assetId === asset.id
          })),
        })
        return
      }

      if (parts[3] === 'video' && parts[4] === 'jobs') {
        if (!project) {
          notFound(res)
          return
        }

        if (req.method === 'GET') {
          if (!can(actorUserId, project.workspaceId, 'project:read')) {
            forbidden(res)
            return
          }
          sendJson(res, 200, { jobs: listVideoGenerationJobs(project.id) })
          return
        }

        if (parts[5] === 'batch' && req.method === 'POST') {
          if (!can(actorUserId, project.workspaceId, 'project:write')) {
            forbidden(res)
            return
          }
          const body = await readBody(req)
          const jobs = await createVideoGenerationJobsBatch(actorUserId, project, body)
          sendJson(res, 201, { jobs, provider: videoProviderStatus() })
          return
        }

        if (req.method === 'POST') {
          if (!can(actorUserId, project.workspaceId, 'project:write')) {
            forbidden(res)
            return
          }
          const body = await readBody(req)
          const job = await createVideoGenerationJob(actorUserId, project, body)
          sendJson(res, 201, { job })
          return
        }
      }

      if (parts[3] === 'video' && parts[4] === 'renders') {
        if (!project) {
          notFound(res)
          return
        }

        if (req.method === 'GET') {
          if (!can(actorUserId, project.workspaceId, 'project:read')) {
            forbidden(res)
            return
          }
          sendJson(res, 200, {
            renders: listFinalVideoRenders(project.id),
            capability: finalVideoRenderCapability(),
          })
          return
        }

        if (req.method === 'POST') {
          if (!can(actorUserId, project.workspaceId, 'project:write')) {
            forbidden(res)
            return
          }
          const body = await readBody(req)
          const render = await createFinalVideoRender(actorUserId, project, body)
          sendJson(res, 202, {
            render,
            capability: finalVideoRenderCapability(),
          })
          return
        }
      }
    }

    if (
      parts[0] === 'api' &&
      parts[1] === 'video' &&
      parts[2] === 'renders' &&
      parts[3] &&
      parts[4] === 'review' &&
      req.method === 'PATCH'
    ) {
      const render = finalVideoRenders.find((item) => item.id === parts[3])
      if (!render) {
        notFound(res)
        return
      }
      if (!can(actorUserId, render.workspaceId, 'project:write')) {
        forbidden(res)
        return
      }
      const body = await readBody(req)
      const updated = await updateFinalVideoRenderReview(actorUserId, render, body)
      sendJson(res, 200, { render: updated, capability: finalVideoRenderCapability() })
      return
    }

    if (
      parts[0] === 'api' &&
      parts[1] === 'video' &&
      parts[2] === 'renders' &&
      parts[3] &&
      parts[4] === 'retry' &&
      req.method === 'POST'
    ) {
      const render = finalVideoRenders.find((item) => item.id === parts[3])
      if (!render) {
        notFound(res)
        return
      }
      if (!can(actorUserId, render.workspaceId, 'project:write')) {
        forbidden(res)
        return
      }
      render.status = 'queued'
      render.outputUrl = ''
      render.errorMessage = null
      render.startedAt = null
      render.completedAt = null
      render.updatedAt = now()
      writeFinalVideoRenderManifest(render)
      await saveDatabase()
      setTimeout(() => {
        void processFinalVideoRenderJob(render.id)
      }, 0)
      sendJson(res, 202, { render, capability: finalVideoRenderCapability() })
      return
    }

    if (
      parts[0] === 'api' &&
      parts[1] === 'video' &&
      parts[2] === 'jobs' &&
      parts[3] &&
      parts[4] === 'refresh' &&
      req.method === 'POST'
    ) {
      const job = videoGenerationJobs.find((item) => item.id === parts[3])
      if (!job) {
        notFound(res)
        return
      }
      if (!can(actorUserId, job.workspaceId, 'project:write')) {
        forbidden(res)
        return
      }
      const refreshed = await refreshVideoGenerationJob(actorUserId, job)
      sendJson(res, 200, { job: refreshed })
      return
    }

    if (
      parts[0] === 'api' &&
      parts[1] === 'video' &&
      parts[2] === 'jobs' &&
      parts[3] &&
      parts[4] === 'retry' &&
      req.method === 'POST'
    ) {
      const job = videoGenerationJobs.find((item) => item.id === parts[3])
      if (!job) {
        notFound(res)
        return
      }
      if (!can(actorUserId, job.workspaceId, 'project:write')) {
        forbidden(res)
        return
      }
      const retryJob = await retryVideoGenerationJob(actorUserId, job)
      sendJson(res, 201, { job: retryJob })
      return
    }

    if (parts[0] === 'api' && parts[1] === 'builds' && parts[2] && req.method === 'GET') {
      const build = builds.get(parts[2])
      if (!build) {
        notFound(res)
        return
      }
      sendJson(res, 200, { build })
      return
    }

    if (parts[0] === 'api' && parts[1] === 'play' && parts[2]) {
      const build = builds.get(parts[2])
      if (!build) {
        notFound(res)
        return
      }

      if (parts[3] === 'orders') {
        if (req.method === 'GET') {
          const sessionId = url.searchParams.get('sessionId')
          const orders = sessionId
            ? paymentOrders.filter(
                (order) => order.buildId === build.id && order.sessionId === sessionId,
              )
            : paymentOrders.filter((order) => order.buildId === build.id)
          const paidOrders = sessionId
            ? paidOrdersForSession(build.id, sessionId)
            : orders.filter((order) => order.status === 'paid')
          sendJson(res, 200, {
            orders,
            unlock: {
              nodeIds: [...new Set(paidOrders.flatMap((order) => order.unlockNodeIds || []))],
            },
          })
          return
        }

        if (req.method === 'POST') {
          const body = await readBody(req)
          const order = await createPaymentOrder(actorUserId, build, body)
          await saveDatabase()
          sendJson(res, 201, {
            order,
            unlock: {
              nodeIds: order.status === 'paid' ? order.unlockNodeIds : [],
            },
          })
          return
        }
      }

      if (req.method === 'GET') {
        sendJson(res, 200, { build, project: build.snapshot })
        return
      }

      if (req.method === 'POST' && parts[3] === 'events') {
        const body = await readBody(req)
        const event = {
          id: `evt_${randomUUID()}`,
          workspaceId: build.workspaceId,
          projectId: build.projectId,
          buildId: build.id,
          sessionId: body.sessionId || `ses_${randomUUID()}`,
          eventName: body.eventName || 'unknown',
          nodeId: body.nodeId || null,
          choiceId: body.choiceId || null,
          metadata: body.metadata || {},
          createdAt: now(),
        }
        events.push(event)
        await saveDatabase()
        sendJson(res, 201, { event })
        return
      }
    }

    if (req.method === 'GET' && url.pathname === '/api/analytics/events') {
      const workspaceId = url.searchParams.get('workspaceId') || currentSession(actorUserId).workspace.id
      if (!can(actorUserId, workspaceId, 'analytics:read')) {
        forbidden(res)
        return
      }
      sendJson(res, 200, {
        events: events.filter((event) => event.workspaceId === workspaceId),
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/audit') {
      sendJson(res, 200, { auditLog })
      return
    }

    if (parts[0] === 'api' && parts[1] === 'ai' && parts[2] === 'jobs') {
      if (req.method === 'GET' && parts.length === 3) {
        const workspaceId =
          url.searchParams.get('workspaceId') || currentSession(actorUserId).workspace.id
        if (!can(actorUserId, workspaceId, 'project:read')) {
          forbidden(res)
          return
        }
        pruneAiGenerationJobs()
        sendJson(res, 200, {
          jobs: aiGenerationJobs
            .filter((job) => job.workspaceId === workspaceId)
            .slice()
            .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
            .map(publicAiGenerationJob),
        })
        return
      }

      if (req.method === 'POST' && parts.length === 3) {
        const body = await readBody(req)
        const task = String(body.task || 'generate-project')
        const input = body.input || {}
        const job = await createAiGenerationJob(actorUserId, task, input)
        sendJson(res, 202, { job: publicAiGenerationJob(job) })
        return
      }

      if (parts[3]) {
        const job = findAiGenerationJob(parts[3])
        assertCanReadAiGenerationJob(actorUserId, job)

        if (req.method === 'GET' && parts.length === 4) {
          sendJson(res, 200, { job: publicAiGenerationJob(job) })
          return
        }

        if (req.method === 'POST' && parts[4] === 'retry' && parts.length === 5) {
          if (!can(actorUserId, job.workspaceId, 'project:write')) {
            forbidden(res)
            return
          }
          const retryJob = await createAiGenerationJob(actorUserId, job.task, job.input, job.id)
          sendJson(res, 202, { job: publicAiGenerationJob(retryJob) })
          return
        }
      }
    }

    if (req.method === 'GET' && url.pathname === '/api/ai/providers') {
      sendJson(res, 200, aiProviderStatus())
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/video/providers') {
      sendJson(res, 200, videoProviderStatus())
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/ai/usage') {
      const workspaceId = url.searchParams.get('workspaceId') || currentSession(actorUserId).workspace.id
      if (!can(actorUserId, workspaceId, 'analytics:read')) {
        forbidden(res)
        return
      }
      const projectId = url.searchParams.get('projectId')
      const usageEvents = aiUsageEvents.filter((event) => {
        const matchesWorkspace = event.workspaceId === workspaceId
        const matchesProject = !projectId || event.projectId === projectId
        return matchesWorkspace && matchesProject
      })
      sendJson(res, 200, { events: usageEvents })
      return
    }

    if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'ai' && parts[2]) {
      const body = await readBody(req)
      const input = body.input || body
      const startedAt = Date.now()
      const result = await generateAiResult(parts[2], input)
      const usageEvent = recordAiUsage(actorUserId, parts[2], input, result, Date.now() - startedAt)
      result.usageEvent = usageEvent
      await saveDatabase()
      sendJson(res, 200, result)
      return
    }

    notFound(res)
  } catch (error) {
    sendJson(res, error.statusCode || 400, {
      error: error.message || 'bad_request',
      details: error.details || undefined,
    })
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = http.createServer(handle)

  server.listen(PORT, HOST, () => {
    console.log(`PlayDrama API listening on http://${HOST}:${PORT}`)
    console.log(`PlayDrama API storage driver: ${STORAGE_DRIVER}`)
    console.log(`PlayDrama API database configured: ${POSTGRES_CONFIGURED ? 'yes' : 'no'}`)
    if (STORAGE_DRIVER === 'json') {
      console.log(`PlayDrama API database: ${DB_PATH}`)
    }
    startAiGenerationJobWorker()
    startFinalVideoRenderWorker()
  })
}
