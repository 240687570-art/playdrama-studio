import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { logError } from './utils/logger'
import { getAuthToken } from './utils/tokenStorage'
import {
  handleAuthCallback,
  login as netlifyIdentityLogin,
  logout as netlifyIdentityLogout,
  signup as netlifyIdentitySignup,
  getUser as getNetlifyIdentityUser,
  onAuthChange,
  AUTH_EVENTS,
  AuthError,
  MissingIdentityError,
  type User as NetlifyIdentityUser,
} from '@netlify/identity'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  ChevronRight,
  CheckCircle2,
  Clapperboard,
  Clipboard,
  Download,
  ExternalLink,
  FileText,
  GitBranch,
  KeyRound,
  Megaphone,
  Layers3,
  Play,
  Plus,
  QrCode,
  RotateCcw,
  Rocket,
  Save,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Trash2,
  Upload,
  Users,
  Wand2,
} from 'lucide-react'
import './App.css'
import { AiInteractiveStoryGenerator } from './components/AiInteractiveStoryGenerator'
import { AnalyticsDashboard } from './components/AnalyticsDashboard'
import {
  acceptInvitation,
  cancelWorkspaceInvitation,
  createFinalVideoRender,
  createDistributionJob,
  createAiGenerationJob,
  createRuntimeOrder,
  createVideoGenerationJobsBatch,
  createWorkspace,
  DEFAULT_WORKSPACE_ID,
  fetchAuditLog,
  fetchAiGenerationJob,
  fetchAiProvider,
  fetchAiUsageEvents,
  fetchAuthProvider,
  fetchAnalyticsEvents,
  fetchContentSafetyReviews,
  fetchDistributionJobs,
  fetchDistributionProvider,
  fetchEmailProvider,
  fetchHealth,
  fetchInviteDeliveries,
  fetchLaunchGuard,
  fetchMarketingLeads,
  fetchPaymentProvider,
  fetchPublishedBuild,
  fetchProjectBuilds,
  fetchRemoteProjects,
  fetchRuntimeOrders,
  fetchSession,
  fetchFinalVideoRenders,
  fetchVideoGenerationJobs,
  fetchVideoProvider,
  fetchWorkspaces,
  fetchWorkspaceMembers,
  generateAiDraft,
  inviteWorkspaceMember,
  login as localApiLogin,
  logout as localApiLogout,
  publishRemoteBuild,
  recordRuntimeEvent,
  requestEmailLoginCode,
  requestSmsLoginCode,
  refreshVideoGenerationJob,
  retryFinalVideoRender,
  retryVideoGenerationJob,
  resendWorkspaceInvitation,
  saveRemoteProject,
  scanProjectContentSafety,
  submitLeadApplication,
  updateInviteDelivery,
  updateFinalVideoRenderReview,
  updatePaymentOrderOps,
  updateRemoteProject,
  verifyEmailLoginCode,
  verifySmsLoginCode,
} from './api'

type NodeKind = 'Hook' | 'Choice' | 'Puzzle' | 'Ending'
type NodePaywall = 'free' | 'paid'
type StudioPage = 'overview' | 'creation' | 'story' | 'characters' | 'ai' | 'publish'
type CreationStageId =
  | 'inspiration'
  | 'synopsis'
  | 'characters'
  | 'outline'
  | 'script'
  | 'interaction'
  | 'publish'
const studioPageIds: StudioPage[] = ['overview', 'creation', 'story', 'characters', 'ai', 'publish']
type DistributionChannel =
  | 'douyin'
  | 'douyin-mini'
  | 'wechat-mini'
  | 'wechat-video'
  | 'xiaohongshu'
  | 'private'

type MarketingLead = {
  id: string
  name: string
  company: string
  role: string
  phone: string
  email: string
  scenario: string
  message: string
  source: string
  status: string
  notification?: {
    provider?: string
    status?: string
    errorMessage?: string | null
  } | null
  createdAt: string
  updatedAt?: string
}

const studioPageCopy: Record<
  StudioPage,
  { eyebrow: string; title: string; searchPlaceholder: string }
> = {
  overview: {
    eyebrow: '上线工作台',
    title: '项目总览',
    searchPlaceholder: '搜索作品、节点、角色',
  },
  creation: {
    eyebrow: '创作模式',
    title: '从灵感到可发布剧本',
    searchPlaceholder: '搜索梗概、人物、分集、正文',
  },
  story: {
    eyebrow: '剧情编辑',
    title: '剧情图谱和节点编辑',
    searchPlaceholder: '搜索节点、变量、选择',
  },
  characters: {
    eyebrow: '角色资产',
    title: '角色一致性资产',
    searchPlaceholder: '搜索角色、定位、性格',
  },
  ai: {
    eyebrow: '普通短剧',
    title: '普通短剧创作平台',
    searchPlaceholder: '搜索题材、分集、正文、视频脚本',
  },
  publish: {
    eyebrow: '发布变现',
    title: '发布包、数据和付费设置',
    searchPlaceholder: '搜索版本、数据、设置',
  },
}

type StoryChoice = {
  id: string
  label: string
  targetNodeId: string
  condition: string
}

type StoryNode = {
  id: string
  title: string
  kind: NodeKind
  summary: string
  metric: string
  paywall?: NodePaywall
  choices: StoryChoice[]
}

type StoryVariable = {
  id: string
  label: string
  type: 'number' | 'boolean' | 'text'
  defaultValue: string
}

type Character = {
  name: string
  role: string
  trait: string
  color: string
}

type StoryProject = {
  id: string
  title: string
  template: string
  publish: PublishSettings
  modelRouting: ModelRouting
  nodes: StoryNode[]
  variables: StoryVariable[]
  characters: Character[]
  lifecycleStatus?: 'active' | 'archived'
  archivedAt?: string | null
  updatedAt: string
}

type RuntimeState = Record<string, string>

type PublishSettings = {
  status: 'Draft' | 'Beta' | 'Public'
  visibility: 'Private' | 'Unlisted' | 'Public'
  category: string
  audience: string
  monetization: 'Free' | 'Paid Ending' | 'Paid Chapter'
  price: string
}

type ModelRouting = {
  market: 'China Mainland' | 'Global'
  defaultProvider: string
  openaiPolicy: 'Disabled for China public launch' | 'Global only' | 'Research only'
  contentSafety: 'Required'
  fallbackProvider: string
}

type GalleryItem = {
  id: string
  title: string
  category: string
  status: string
  completion: string
}

type PublishBuild = {
  id: string
  projectId?: string
  workspaceId?: string
  version: number
  status: string
  visibility?: string
  runtimeUrl: string
  snapshot?: StoryProject
  contentSafety?: {
    reviewId?: string
    status?: string
    flagCount?: number
    blockingCount?: number
    reviewCount?: number
    noticeCount?: number
  }
  createdAt: string
}

type WorkspaceSession = {
  user: {
    id: string
    displayName: string
    email: string
    phone?: string
    role: string
    avatarInitials?: string
  }
  workspace: {
    id: string
    name: string
    plan: string
  }
  membership: {
    role: string
    permissions: string[]
  }
}

type WorkspaceSummary = {
  id: string
  name: string
  plan: string
}

type WorkspaceMember = {
  id: string
  role: string
  permissions: string[]
  status?: string
  inviteUrl?: string
  inviteExpiresAt?: string
  user?: WorkspaceSession['user']
}

type AuthProviderStatus = {
  provider: string
  mode: string
  requestScoped: boolean
  tokenPersistence: string
  productionReady: boolean
}

type EmailProviderStatus = {
  provider: string
  webhookConfigured: boolean
  apiKeyConfigured: boolean
  callbackSecretConfigured: boolean
  callbackSignatureMode: string
  tencentSes?: {
    configured: boolean
    dryRun: boolean
    endpoint: string
    region: string
    fromEmailConfigured: boolean
    secretIdConfigured: boolean
    secretKeyConfigured: boolean
    templateConfigured: boolean
    readiness: Array<{
      id: string
      label: string
      ok: boolean
      action: string
    }>
    missing: Array<{
      id: string
      label: string
      ok: boolean
      action: string
    }>
  }
  aliyunDirectMail?: {
    configured: boolean
    dryRun: boolean
    endpoint: string
    region: string
    accountNameConfigured: boolean
    accessKeyIdConfigured: boolean
    accessKeySecretConfigured: boolean
    readiness: Array<{
      id: string
      label: string
      ok: boolean
      action: string
    }>
    missing: Array<{
      id: string
      label: string
      ok: boolean
      action: string
    }>
  }
  recommendations: Array<{
    id: string
    displayName: string
    market: string
    priority: number
    fit: string
    callbackMode: string
    notes: string
  }>
  productionReady: boolean
}

type PaymentProviderStatus = {
  provider: string
  providers: string[]
  activeProvider: string
  currency: string
  alipay?: {
    configured: boolean
  }
  wechat?: {
    configured: boolean
  }
  productionReady: boolean
}

type AiProviderStatus = {
  provider: string
  model: string | null
  providers: Array<{
    id: string
    displayName: string
    market: string
    priority: number
    defaultModel: string
    notes: string
  }>
  openaiPolicy: string
  contentSafetyRequired: boolean
  apiKeyConfigured: boolean
  pricing: {
    currency: string
    inputPerMillion: number
    outputPerMillion: number
  }
  productionReady: boolean
  readiness: Array<{
    id: string
    area: string
    label: string
    ok: boolean
    action: string
    missingFields: string[]
  }>
  missing: Array<{
    id: string
    area: string
    label: string
    ok: boolean
    action: string
    missingFields: string[]
  }>
}

type DistributionProviderStatus = {
  providers: string[]
  appBaseUrl: string
  douyin: {
    openApiConfigured: boolean
    clientKeyConfigured: boolean
    clientSecretConfigured: boolean
    accessTokenConfigured: boolean
    openIdConfigured: boolean
    miniAppIdConfigured: boolean
    webviewDomainReady: boolean
    baseUrl: string
    missing: string[]
  }
  douyinMini: {
    configured: boolean
    appIdConfigured: boolean
    webviewDomainReady: boolean
    paymentReady: boolean
    pathTemplate: string
  }
  wechatMini: {
    configured: boolean
    appIdConfigured: boolean
    originalIdConfigured: boolean
    webviewDomainReady: boolean
    paymentReady: boolean
    pathTemplate: string
  }
  productionReady: boolean
}

type DistributionJob = {
  id: string
  workspaceId: string
  projectId: string
  buildId: string
  channel: DistributionChannel
  provider: string
  status: string
  title: string
  caption: string
  targetUrl: string
  miniProgramPath: string
  externalId?: string | null
  errorMessage?: string | null
  response?: {
    mode?: string
    reason?: string
    path?: string
    [key: string]: unknown
  }
  createdAt: string
  updatedAt?: string
}

type VideoProviderStatus = {
  provider: string
  model: string | null
  productionReady: boolean
  openApiMode: string
  commercial?: {
    liveSubmitLimit: number
    promptBatchLimit: number
    canSubmitLive: boolean
    canRetry: boolean
    canExportDeliveryManifest: boolean
    canRenderFinalMp4?: boolean
    renderMode?: string
    readiness: string
    nextStep: string
    render?: {
      mode: string
      ffmpegAvailable: boolean
      ffmpegPath: string
      outputDir: string
      maxClips: number
      timeoutMs: number
      videoProfile: string
      audioPolicy: string
    }
  }
  routingPolicy: string
  missing: string[]
  providers: Array<{
    id: string
    displayName: string
    market: string
    priority: number
    configured: boolean
    defaultModel: string
    capabilities: string[]
    fit: string
    requiredEnv: string[]
  }>
}

type VideoGenerationJob = {
  id: string
  workspaceId: string
  projectId: string
  shotId: string
  nodeId: string
  provider: string
  model: string
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'prompt-ready'
  prompt: string
  duration: string
  aspectRatio: string
  externalId?: string | null
  outputUrl: string
  thumbnailUrl: string
  request?: {
    beat?: string
    scene?: string
    camera?: string
    motion?: string
    caption?: string
    characterRefs?: unknown[]
    aspectRatio?: string
    resolution?: string
    negativePrompt?: string
    source?: string
    batchId?: string | null
    sequenceIndex?: number | null
    retryOf?: string | null
    deliveryUse?: string
    qualityGate?: string
  }
  response?: Record<string, unknown>
  errorMessage?: string | null
  createdAt: string
  updatedAt?: string
}

type FinalVideoRenderJob = {
  id: string
  workspaceId: string
  projectId: string
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'blocked' | 'handoff-ready'
  title: string
  aspectRatio: string
  clipCount: number
  outputUrl: string
  manifestUrl: string
  request?: {
    source?: string
    clips?: Array<{
      id: string
      jobId?: string | null
      shotId: string
      nodeId?: string
      sequenceIndex: number
      label: string
      caption?: string
      duration?: string
      outputUrl: string
      provider?: string
      model?: string
    }>
    captions?: Array<{
      index?: number
      clipId?: string
      shotId?: string
      startSeconds: number
      endSeconds: number
      text: string
    }>
    renderProfile?: string
    audioPolicy?: string
    subtitlePolicy?: string
    deliveryProfile?: string
    storagePolicy?: string
    archivePolicy?: string
    musicPolicy?: string
    voiceoverPolicy?: string
    qualityGate?: string
    version?: string
    versionNumber?: number
    clientReview?: {
      requestedBy?: string
      verdict?: string
      dueAt?: string
      reviewedAt?: string
      reviewedBy?: string
    }
    reviewChecklist?: Array<{
      id: string
      label: string
      status: string
      owner: string
      note?: string
    }>
    reviewNotes?: Array<{
      id?: string
      author?: string
      frame?: string
      severity?: string
      text: string
      createdAt?: string
    }>
  }
  response?: {
    mode?: string
    segmentCount?: number
    audioTrack?: string
    subtitleTrack?: string
    reviewStatus?: string
    archiveStatus?: string
    subtitleBurnInError?: string
    assets?: {
      mp4Url?: string
      captionsUrl?: string
      manifestUrl?: string
      manifestJsonUrl?: string
      cdnUrl?: string
      archiveUrl?: string
    }
    [key: string]: unknown
  }
  errorMessage?: string | null
  createdAt: string
  startedAt?: string | null
  updatedAt?: string
  completedAt?: string | null
}

type StorageHealth = {
  driver: string
  path: string | null
  databaseUrlConfigured: boolean
  productionReady: boolean
  readiness: Array<{
    id: string
    label: string
    ok: boolean
    action: string
  }>
  missing: Array<{
    id: string
    label: string
    ok: boolean
    action: string
  }>
}

type CommercialReadiness = {
  status: 'pass' | 'blocked'
  passed: number
  total: number
  items: Array<{
    id: string
    area: string
    label: string
    ok: boolean
    action: string
    missingFields: string[]
  }>
  missing: Array<{
    id: string
    area: string
    label: string
    ok: boolean
    action: string
    missingFields: string[]
  }>
}

type ApiHealth = {
  ok: boolean
  storage: StorageHealth
  commercialReadiness: CommercialReadiness
}

type InviteDelivery = {
  id: string
  provider: string
  to: string
  role: string
  status: string
  inviteUrl: string
  expiresAt?: string
  createdAt: string
  updatedAt?: string
  errorMessage?: string
}

type AuditEntry = {
  id: string
  action: string
  targetType: string
  targetId: string
  workspaceId?: string
  metadata?: {
    projectId?: string
    title?: string
    version?: number
    [key: string]: unknown
  }
  createdAt: string
}

type AnalyticsEvent = {
  id: string
  workspaceId: string
  projectId: string
  buildId: string
  sessionId: string
  eventName: string
  nodeId?: string | null
  choiceId?: string | null
  metadata?: {
    choiceLabel?: string
    targetNodeId?: string
    targetKind?: string
    version?: number
    [key: string]: unknown
  }
  createdAt: string
}

type PaymentOrder = {
  id: string
  workspaceId: string
  projectId: string
  buildId: string
  userId?: string | null
  sessionId: string
  provider: string
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  amount: number
  currency: string
  monetization: string
  itemType: string
  itemId?: string | null
  unlockNodeIds: string[]
  metadata?: {
    sandbox?: boolean
    price?: string
    title?: string
    checkoutMode?: string
    [key: string]: unknown
  }
  paidAt?: string | null
  createdAt: string
}

type PaymentOrderFilter = 'all' | PaymentOrder['status']
type LaunchGuardStatus = 'ready' | 'warning' | 'blocked'
type LaunchGuardSignal = {
  id: string
  label: string
  status: LaunchGuardStatus
  value: string
  detail: string
  action: string
}
type LaunchGuardIncident = {
  id: string
  severity: LaunchGuardStatus
  label: string
  value: string
  detail: string
  action: string
}
type LaunchGuard = {
  generatedAt: string
  status: LaunchGuardStatus
  summary: {
    orderCount: number
    recentOrderCount: number
    paidOrderCount: number
    paidByCallbackCount: number
    pendingOrderCount: number
    stalePendingOrderCount: number
    failedOrderCount: number
    refundedOrderCount: number
    aiFailureCount: number
    staleAiJobCount: number
  }
  signals: LaunchGuardSignal[]
  incidents: LaunchGuardIncident[]
}

type AiUsageEvent = {
  id: string
  workspaceId: string
  projectId?: string | null
  task: string
  providerId: string
  model: string
  status: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCost: string
  currency: string
  latencyMs: number
  outputSummary?: {
    title?: string
    nodeCount?: number
    variableCount?: number
    characterCount?: number
    qualityCheckCount?: number
  }
  createdAt: string
}

type ContentSafetyReview = {
  id: string
  workspaceId: string
  projectId: string
  provider: string
  policyVersion: string
  status: 'passed' | 'needs_review' | 'blocked'
  passed: boolean
  flagCount: number
  blockingCount: number
  reviewCount: number
  noticeCount: number
  flags: Array<{
    id: string
    category: string
    severity: 'notice' | 'review' | 'block'
    term: string
    path: string
    snippet: string
    action: string
  }>
  summary?: {
    scannedFields?: number
    nodeCount?: number
    characterCount?: number
    policy?: string
  }
  createdAt: string
}

type AiGenerationResult = {
  providerId: string
  model: string
  task: string
  status: string
  output: {
    title?: string
    nodes?: StoryNode[]
    variables?: StoryVariable[]
    characters?: Character[]
    qualityChecks?: string[]
    note?: string
  }
  usage?: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    estimatedCost?: string
  }
  usageEvent?: AiUsageEvent
}

type AiGenerationJob = {
  id: string
  task: string
  workspaceId: string
  projectId?: string | null
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
  stage: string
  progress: number
  message: string
  errorCode?: string
  errorMessage?: string
  retryOf?: string | null
  inputSummary?: {
    idea?: string
    genre?: string
    monetization?: string
    projectTitle?: string
  }
  outputSummary?: {
    title?: string
    nodeCount?: number
    variableCount?: number
    characterCount?: number
    qualityCheckCount?: number
  } | null
  result?: AiGenerationResult | null
  createdAt: string
  startedAt?: string | null
  updatedAt: string
  completedAt?: string | null
}

type SeriesGeneratorInput = {
  idea: string
  genre: string
  audience: string
  platform: string
  duration: string
  interactionDensity: string
  monetization: PublishSettings['monetization']
  constraints: string
  price?: string
}

type BeginnerCreationGoal = 'normal' | 'interactive' | 'paid'

const beginnerGenreOptions = ['甜宠喜剧', '悬疑反转', '职场逆袭', '家庭伦理', '都市情感']
const beginnerLengthOptions = ['1 分钟 / 3 集', '3 分钟 / 6 集', '8 分钟 / 12 集']
const beginnerGoalOptions: Array<{
  id: BeginnerCreationGoal
  label: string
  detail: string
  monetization: PublishSettings['monetization']
  density: string
  price: string
  constraints: string
}> = [
  {
    id: 'paid',
    label: '直接试卖',
    detail: '保留免费线，补一个付费反转结局',
    monetization: 'Paid Ending',
    density: '每 2-3 幕一个选择',
    price: '3.9',
    constraints: '生成免费线和付费隐藏线，付费结局必须比免费结局多一个强反转，适合 CNY 3.9 试卖。',
  },
  {
    id: 'interactive',
    label: '互动体验',
    detail: '先做选择和分支，暂不收费',
    monetization: 'Free',
    density: '每 1-2 幕一个选择',
    price: '0',
    constraints: '优先生成可试玩互动分支，结局免费开放，适合拉新和测试留存。',
  },
  {
    id: 'normal',
    label: '普通短剧',
    detail: '先出剧本和分镜，后续再升级互动',
    monetization: 'Free',
    density: '关键转折点选择',
    price: '0',
    constraints: '优先生成普通短剧生产包，选择只作为后续互动升级参考，先保证剧本、分镜和视频 prompt 可交付。',
  },
]

type ProductionStoryboardShot = {
  id: string
  nodeId: string
  beat: string
  duration: string
  scene: string
  camera: string
  motion: string
  visualPrompt: string
  dialogue: string
  sound: string
  status: 'ready' | 'queued' | 'needs-reference'
}

type ProductionCharacterAsset = {
  name: string
  role: string
  wardrobe: string
  visualPrompt: string
  voice: string
  consistency: number
}

type ProductionVideoQueueItem = {
  id: string
  shotId: string
  provider: string
  model: string
  status: 'prompt-ready' | 'reference-needed' | 'queued'
  estimate: string
}

type ProductionExportItem = {
  label: string
  value: string
  status: 'ready' | 'waiting'
}

type ProductionBenchmarkCapability = {
  label: string
  state: 'ready' | 'partial'
  detail: string
}

type ProductionMemoryItem = {
  label: string
  value: string
  detail: string
  status: 'ready' | 'partial' | 'risk'
}

type ProductionDirectorAction = {
  id: string
  label: string
  target: string
  instruction: string
  impact: string
  status: 'ready' | 'partial' | 'risk'
}

type ProductionQualityMetric = {
  label: string
  value: string
  threshold: string
  detail: string
  status: 'ready' | 'partial' | 'risk'
}

type GeneratedProjectReview = {
  projectId: string
  title: string
  providerId: string
  model: string
  createdAt: string
  nodeCount: number
  characterCount: number
  endingCount: number
  paidEndingCount: number
  variableCount: number
  shotCount: number
  videoQueueCount: number
  exportCount: number
  qualityChecks: string[]
  note: string
  storyboardShots: ProductionStoryboardShot[]
  characterAssets: ProductionCharacterAsset[]
  videoQueue: ProductionVideoQueueItem[]
  exportItems: ProductionExportItem[]
  benchmarkCapabilities: ProductionBenchmarkCapability[]
  productionMemory: ProductionMemoryItem[]
  directorActions: ProductionDirectorAction[]
  qualityMetrics: ProductionQualityMetric[]
}

const roleOptions = [
  { value: 'editor', label: '创作编辑' },
  { value: 'analyst', label: '数据分析' },
  { value: 'viewer', label: '只读查看' },
  { value: 'owner', label: '管理员' },
]

const auditActionOptions = [
  { value: 'all', label: '全部动作' },
  { value: 'project.created', label: '创建作品' },
  { value: 'project.updated', label: '更新作品' },
  { value: 'build.created', label: '生成发布' },
  { value: 'content_safety.scanned', label: '内容安全扫描' },
  { value: 'payment.order_created', label: '创建支付订单' },
  { value: 'distribution.job_created', label: '创建分发任务' },
  { value: 'ai.generated', label: 'AI 生成剧情' },
  { value: 'member.invited', label: '邀请成员' },
  { value: 'workspace.created', label: '创建工作区' },
]

const auditActionLabels: Record<string, string> = {
  ...Object.fromEntries(
    auditActionOptions.filter((item) => item.value !== 'all').map((item) => [item.value, item.label]),
  ),
  ai_generated: 'AI 生成剧情',
  distribution_job_created: '创建分发任务',
}

const auditTargetTypeLabels: Record<string, string> = {
  project: '作品',
  build: '发布包',
  content_safety: '审核',
  distribution_job: '分发',
  ai_usage: '模型调用',
  payment_order: '订单',
  workspace: '工作区',
  member: '成员',
  user: '用户',
}

const providerMarketLabels: Record<string, string> = {
  china: '国内商用',
  global: '海外/全球',
}

const providerFitLabels: Record<string, string> = {
  'aliyun-directmail': '阿里云优先，适合当前服务器和域名',
  'tencent-ses': '腾讯云备选，适合国内邮件冗余',
  resend: '海外开发测试体验好',
  sendgrid: '海外规模化邮件能力强',
}

const defaultPublishSettings: PublishSettings = {
  status: 'Beta',
  visibility: 'Unlisted',
  category: '悬疑互动短剧',
  audience: '短剧创作/ 悬疑玩家',
  monetization: 'Paid Ending',
  price: '9.9',
}

const defaultModelRouting: ModelRouting = {
  market: 'China Mainland',
  defaultProvider: 'DeepSeek / 通义千问 / 豆包 / 智谱 GLM',
  openaiPolicy: 'Disabled for China public launch',
  contentSafety: 'Required',
  fallbackProvider: 'Kimi / MiniMax / 腾讯混元',
}

const STORAGE_KEY = 'playdrama.storyProject.v1'
const WORKSPACE_STORAGE_KEY = 'playdrama.activeWorkspace.v1'
const nodeKinds: NodeKind[] = ['Hook', 'Choice', 'Puzzle', 'Ending']
const variableTypes: StoryVariable['type'][] = ['number', 'boolean', 'text']
const paymentMethodLabels: Record<'alipay' | 'wechat', string> = {
  alipay: '支付宝',
  wechat: '微信支付',
}
const authProviderLabels: Record<string, string> = {
  'sms-code': '手机号验证码',
  'email-code': '邮箱验证码',
  'netlify-identity': '邮箱密码',
  'trusted-identity': '统一账号',
  'local-demo': '本地演示',
}
const roleLabels: Record<string, string> = {
  owner: '管理员',
  editor: '创作编辑',
  analyst: '数据分析',
  viewer: '只读查看',
}
const marketLabels: Record<string, string> = {
  'China Mainland': '中国大陆',
  Global: '海外版',
}
const publishStatusLabels: Record<string, string> = {
  Draft: '草稿',
  Beta: '内测',
  Public: '公开',
}
const visibilityLabels: Record<string, string> = {
  Private: '私密',
  Unlisted: '仅链接可见',
  Public: '公开',
}
const monetizationLabels: Record<string, string> = {
  Free: '免费体验',
  'Paid Ending': '付费结局',
  'Paid Chapter': '付费章节',
}
const memberStatusLabels: Record<string, string> = {
  active: '已加入',
  invited: '待接受',
  disabled: '已停用',
}
const distributionChannels: Array<{
  id: DistributionChannel
  label: string
  medium: string
  campaign: string
}> = [
  { id: 'douyin', label: '抖音短视频', medium: 'short_video', campaign: 'preheat' },
  { id: 'douyin-mini', label: '抖音小程序', medium: 'mini_program', campaign: 'douyin-mini' },
  { id: 'wechat-mini', label: '微信小程序', medium: 'mini_program', campaign: 'wechat-mini' },
  { id: 'wechat-video', label: '视频号', medium: 'short_video', campaign: 'private-domain' },
  { id: 'xiaohongshu', label: '小红书', medium: 'note', campaign: 'topic-test' },
  { id: 'private', label: '私域社群', medium: 'community', campaign: 'creator-test' },
]
const miniProgramLaunchTracks = [
  {
    platform: '抖音小程序',
    status: '待申请',
    steps: ['创建小程序应用', '接互动播放器', '接 tt.pay 担保支付', '短视频挂载入口'],
  },
  {
    platform: '微信小程序',
    status: '待申请',
    steps: ['创建小程序应用', '配置业务域名', '接 wx.requestPayment', '视频号/社群分发'],
  },
]

const monetizationPricePresets = [
  {
    price: '3.9',
    label: '低门槛',
    fit: '内测拉首单',
    benchmark: '高转化测试',
  },
  {
    price: '6.6',
    label: '主流档',
    fit: '反转短线',
    benchmark: '抖音小程序常用',
  },
  {
    price: '9.9',
    label: '标准档',
    fit: '完整隐藏线',
    benchmark: '互动短剧标配',
  },
  {
    price: '12.9',
    label: '高权益',
    fit: '多结局包',
    benchmark: '深度玩家付费',
  },
]

const paymentOrderFilterOptions: Array<{ value: PaymentOrderFilter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'paid', label: '已支付' },
  { value: 'pending', label: '待支付' },
  { value: 'failed', label: '失败' },
  { value: 'refunded', label: '退款' },
]

function formatAuthProviderLabel(provider?: string | null) {
  if (!provider) return '云端检测中'
  return authProviderLabels[provider] || provider
}

function formatAuthProviderDetail(provider: AuthProviderStatus | null) {
  if (!provider) return '正在检测登录服务'
  if (!provider.productionReady) return '登录服务配置未完成'
  if (provider.provider === 'sms-code') return '腾讯云短信已接入'
  if (provider.provider === 'email-code') return '邮箱验证码已接入'
  return '正式账号服务已接入'
}

function formatPaymentMethod(provider?: string | null) {
  if (!provider) return '支付检测中'
  if (provider === 'alipay,wechat') return '支付宝 / 微信'
  if (provider === 'alipay' || provider === 'wechat') return paymentMethodLabels[provider]
  return provider
}

function formatPublishStatus(status?: string) {
  return publishStatusLabels[status || ''] || status || '草稿'
}

function formatVisibility(visibility?: string) {
  return visibilityLabels[visibility || ''] || visibility || '仅链接可见'
}

function formatMonetization(value?: string) {
  return monetizationLabels[value || ''] || value || '免费体验'
}

function formatPaymentOrderStatus(value?: string) {
  const labels: Record<string, string> = {
    pending: '待支付',
    paid: '已支付',
    failed: '失败',
    refunded: '已退款',
  }
  return labels[value || ''] || value || '未记录'
}

function formatMarket(value?: string) {
  return marketLabels[value || ''] || value || '中国大陆'
}

function formatMemberStatus(value?: string) {
  return memberStatusLabels[value || 'active'] || value || '已加入'
}

function formatLeadContact(lead: MarketingLead) {
  return lead.phone || lead.email || '未留联系方式'
}

function formatLeadStatus(lead: MarketingLead) {
  const notificationStatus = lead.notification?.status
  if (notificationStatus === 'sent' || notificationStatus === 'queued') return '已通知'
  if (notificationStatus === 'failed') return '通知失败'
  if (notificationStatus === 'skipped') return '已入库'
  return lead.status === 'new' ? '新申请' : lead.status
}

function formatLeadTime(value?: string) {
  if (!value) return '刚刚'
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatAuditActionLabel(value: string) {
  return auditActionLabels[value] || value.replace(/[._-]/g, ' ')
}

function formatAuditTargetType(value: string) {
  return auditTargetTypeLabels[value] || value
}

function formatShortId(value: string) {
  if (!value) return '未记录'
  return value.length > 10 ? `#${value.slice(-6)}` : value
}

function createClientId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function formatMoneyFromCents(amount: number, currency = 'CNY') {
  return `${currency || 'CNY'} ${(amount / 100).toFixed(2)}`
}

function parsePublishPriceCents(value: string) {
  const price = Number(String(value || '0').replace(/[^\d.]/g, ''))
  if (!Number.isFinite(price) || price <= 0) return 0
  return Math.round(price * 100)
}

function estimatePayConversionRate(priceCents: number) {
  if (priceCents <= 0) return 0
  if (priceCents <= 390) return 9
  if (priceCents <= 660) return 7
  if (priceCents <= 990) return 5
  if (priceCents <= 1290) return 4
  return 3
}

function formatPaymentOrderResolution(order: PaymentOrder) {
  if (order.status === 'paid') return '已写入解锁节点，可回读权益'
  if (order.status === 'pending') return '等待支付回调，需支持刷新和继续支付'
  if (order.status === 'failed') return '检查商户回调、签名和金额'
  if (order.status === 'refunded') return '保留订单凭证，撤回对应权益'
  return '等待订单状态'
}

function formatProviderMarket(value?: string) {
  return providerMarketLabels[value || ''] || value || '服务商'
}

function formatProviderFit(providerId: string, fallback?: string) {
  return providerFitLabels[providerId] || fallback || '可作为邮件服务商'
}

function formatDistributionJobStatus(value = 'ready') {
  const labels: Record<string, string> = {
    ready: '待平台发布',
    published: '已提交平台',
    failed: '提交失败',
    queued: '排队中',
  }
  return labels[value] || value
}

function formatVideoJobStatus(value = 'prompt-ready') {
  const labels: Record<string, string> = {
    'prompt-ready': 'Prompt 就绪',
    queued: '排队中',
    running: '生成中',
    succeeded: '已生成',
    failed: '失败',
  }
  return labels[value] || value
}

function formatFinalVideoRenderStatus(value = 'queued') {
  const labels: Record<string, string> = {
    queued: '待合成',
    running: '合成中',
    succeeded: 'MP4 已生成',
    failed: '合成失败',
    blocked: '素材不足',
    'handoff-ready': '待装合成器',
  }
  return labels[value] || value
}

function parseUiDurationSeconds(value: string | number | undefined, fallback = 5) {
  const text = String(value || '')
  const match = text.match(/(\d+(?:\.\d+)?)/)
  const raw = match ? Number(match[1]) : fallback
  const seconds = /分钟|minute|min/i.test(text) ? raw * 60 : raw
  return Number.isFinite(seconds) && seconds > 0 ? Math.max(1.5, Math.min(seconds, 30)) : fallback
}

function buildVideoPreviewCaption(shot?: ProductionStoryboardShot, fallback = '') {
  const beat = shot?.beat?.replace(/\s+/g, ' ').trim() || ''
  const firstDialogue =
    shot?.dialogue
      ?.split(/[。！？!?；;\n]/)
      .map((item) => item.replace(/\s+/g, ' ').trim())
      .find(Boolean) || ''
  const caption = [beat, firstDialogue && firstDialogue !== beat ? firstDialogue : '']
    .filter(Boolean)
    .join('\n')
  return (caption || fallback || '关键剧情镜头').slice(0, 90)
}

function waitForUiDelay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function formatFinalVideoReviewVerdict(value = 'waiting-for-review') {
  const labels: Record<string, string> = {
    'waiting-for-render': '等待成片',
    'waiting-for-review': '等待审片',
    'needs-human-review': '待人工审片',
    'needs-changes': '需要修改',
    approved: '客户通过',
    blocked: '暂缓交付',
  }
  return labels[value] || value
}

function formatFinalVideoDeliveryProfile(value = 'commercial-final-cut-v1') {
  const labels: Record<string, string> = {
    'client-review-v1': '客户审片版',
    'commercial-final-cut-v1': '商用交付版',
    'cdn-archive-v1': 'CDN 归档版',
  }
  return labels[value] || value
}

function formatFinalVideoPolicy(value = '') {
  const labels: Record<string, string> = {
    'silent-bed-v1': '静音音轨床',
    'mix-ready-silent-bed-v1': '待混音交付',
    'voiceover-handoff-v1': '待口播交付',
    'sidecar-srt-v1': 'SRT 侧挂字幕',
    'burned-in-srt-v1': '字幕烧录 + SRT',
    'manual-cdn-handoff-v1': '手动 CDN 交接',
    'workspace-retention-v1': '工作区留存',
    'cdn-archive-v1': 'CDN 长期归档',
    'client-review-v1': '客户审片门禁',
  }
  return labels[value] || value || '待配置'
}

function isBillableVideoProvider(provider?: VideoProviderStatus | null) {
  return Boolean(provider?.productionReady && provider.openApiMode === 'live')
}

function formatDistributionChannel(value: DistributionChannel | string) {
  const labels: Record<string, string> = {
    douyin: '抖音短视频',
    'douyin-mini': '抖音小程序',
    'wechat-mini': '微信小程序',
    'wechat-video': '微信视频号',
    private: '私域社群',
  }
  return labels[value] || value
}

function getNodePaywallMode(
  project: Pick<StoryProject, 'publish'>,
  node: Pick<StoryNode, 'kind' | 'title' | 'summary' | 'metric' | 'paywall'>,
  endingIndex = 0,
): NodePaywall {
  if (project.publish.monetization !== 'Paid Ending' || node.kind !== 'Ending') return 'free'
  if (node.paywall === 'free' || node.paywall === 'paid') return node.paywall

  const marker = `${node.title} ${node.summary} ${node.metric}`.toLowerCase()
  if (/免费|普通|基础|free/.test(marker)) return 'free'
  if (/付费|隐藏|解锁|彩蛋|vip|premium/.test(marker)) return 'paid'
  return endingIndex === 0 ? 'free' : 'paid'
}

function formatNodePaywallMode(mode: NodePaywall) {
  return mode === 'paid' ? '付费结局' : '免费结局'
}

function buildConditionTemplate(variable: StoryVariable) {
  if (variable.type === 'boolean') {
    return {
      id: variable.id,
      label: `${variable.label}=true`,
      condition: `${variable.label} = true`,
    }
  }
  if (variable.type === 'text') {
    return {
      id: variable.id,
      label: `${variable.label}=已获得`,
      condition: `${variable.label} = 已获得`,
    }
  }

  const defaultValue = Number(variable.defaultValue)
  const threshold = Number.isFinite(defaultValue) ? Math.max(1, defaultValue + 1) : 1
  return {
    id: variable.id,
    label: `${variable.label}>=${threshold}`,
    condition: `${variable.label} >= ${threshold}`,
  }
}

function choice(id: string, label: string, targetNodeId: string, condition = '') {
  return { id, label, targetNodeId, condition }
}

const initialNodes: StoryNode[] = [
  {
    id: 'S01',
    title: '午夜来电',
    kind: 'Hook',
    summary: '女主收到失踪哥哥的语音，背景里出现旧医院广播',
    metric: '94% 继续',
    choices: [
      choice('C01', '接听第二通电', 'S02'),
      choice('C02', '回拨陌生号码', 'S03', '线索 >= 1'),
    ],
  },
  {
    id: 'S02',
    title: '门卫的谎言',
    kind: 'Choice',
    summary: '玩家选择追问门卫、翻监控，或直接进入封锁楼层',
    metric: '3 条分',
    choices: [
      choice('C03', '追问门卫', 'S03'),
      choice('C04', '翻看监控', 'S03', '信任 < 2'),
      choice('C05', '进入封锁楼层', 'S04', '钥匙 = true'),
    ],
  },
  {
    id: 'S03',
    title: '病历密码',
    kind: 'Puzzle',
    summary: '收集三条线索后输入档案柜密码，失败触发警报',
    metric: '42% 解开',
    choices: [
      choice('C06', '输入 0714', 'S04', '线索 >= 3'),
      choice('C07', '继续寻找线索', 'S02'),
    ],
  },
  {
    id: 'S04',
    title: '地下室真',
    kind: 'Ending',
    summary: '根据线索完整度进入普通结局、隐藏结局或死亡结局',
    metric: '5 个结局',
    choices: [
      choice('C08', '公开真相', 'S04', '线索 >= 3'),
      choice('C09', '隐藏证据', 'S04', '信任 >= 2'),
    ],
  },
]

const initialCharacters: Character[] = [
  {
    name: '林雾',
    role: '主角 / 调查记',
    trait: '冷静、敏锐、害怕失去亲',
    color: '#2f80ed',
  },
  {
    name: '沈既',
    role: '医生 / 可疑盟友',
    trait: '温和、克制、隐瞒关键记',
    color: '#14a06f',
  },
  {
    name: '周砚',
    role: '门卫 / 线索守门',
    trait: '贪财、胆小、知道地下室入口',
    color: '#d97904',
  },
]

const initialVariables: StoryVariable[] = [
  { id: 'clues', label: '线索', type: 'number', defaultValue: '0' },
  { id: 'trust', label: '信任', type: 'number', defaultValue: '1' },
  { id: 'key', label: '钥匙', type: 'boolean', defaultValue: 'false' },
]

const sampleProject: StoryProject = {
  id: 'playdrama-hospital-001',
  title: '旧医院的第七通电',
  template: '悬疑探案 v1',
  publish: defaultPublishSettings,
  modelRouting: defaultModelRouting,
  nodes: initialNodes,
  variables: initialVariables,
  characters: initialCharacters,
  updatedAt: new Date().toISOString(),
}

const showcaseSampleProjects: Record<string, StoryProject> = {
  hospital: {
    ...sampleProject,
    id: 'showcase-hospital-202605',
    title: '旧医院的第七通电',
    template: '悬疑互动样片',
    publish: {
      ...defaultPublishSettings,
      category: '悬疑互动短剧',
      audience: '18-35 岁悬疑短剧用户',
      monetization: 'Paid Ending',
      price: '9.9',
    },
    nodes: [
      {
        id: 'H01',
        title: '午夜来电',
        kind: 'Hook',
        summary: '林雾收到失踪哥哥的语音，背景广播指向三年前停用的第七病区。',
        metric: '94% 继续',
        choices: [
          choice('HC01', '立刻接听第二通电话', 'H02'),
          choice('HC02', '回拨陌生号码', 'H03', '线索 >= 1'),
        ],
      },
      {
        id: 'H02',
        title: '门卫的谎言',
        kind: 'Choice',
        summary: '周砚否认见过哥哥，但监控里他的手电在凌晨两点亮过。',
        metric: '3 条分支',
        choices: [
          choice('HC03', '追问周砚', 'H03'),
          choice('HC04', '先翻监控', 'H04', '信任 < 2'),
        ],
      },
      {
        id: 'H03',
        title: '病历密码',
        kind: 'Puzzle',
        summary: '档案柜需要四位密码，病历页角写着 0714，旁边还有一枚旧钥匙印。',
        metric: '42% 解开',
        choices: [
          choice('HC05', '输入 0714', 'H05', '线索 >= 2'),
          choice('HC06', '继续盘问门卫', 'H02'),
        ],
      },
      {
        id: 'H04',
        title: '封锁楼层',
        kind: 'Choice',
        summary: '电梯停在负二层，沈既医生提醒林雾：进去前要先决定相信谁。',
        metric: '58% 进入',
        choices: [
          choice('HC07', '相信沈既', 'H05', '信任 >= 1'),
          choice('HC08', '独自下楼', 'H06'),
        ],
      },
      {
        id: 'H05',
        title: '地下室灯箱',
        kind: 'Choice',
        summary: '灯箱里贴着哥哥当天的手术排班，最后一栏被人刻意烧掉。',
        metric: '隐藏线入口',
        choices: [
          choice('HC09', '公开病区录音', 'H06'),
          choice('HC10', '保留证据换沈既真话', 'H07', '信任 >= 2'),
        ],
      },
      {
        id: 'H06',
        title: '普通结局：停电真相',
        kind: 'Ending',
        summary: '林雾公开录音，旧医院停电事故被重查，但哥哥的最后去向仍留在暗处。',
        metric: '免费结局',
        choices: [],
      },
      {
        id: 'H07',
        title: '隐藏结局：第七通电',
        kind: 'Ending',
        summary: '沈既交出未公开影像，林雾发现哥哥留下的第七通电话其实来自未来。',
        metric: '付费隐藏结局',
        choices: [],
      },
    ],
    variables: initialVariables,
    characters: [
      ...initialCharacters,
      {
        name: '陈寻',
        role: '失踪哥哥 / 关键录音来源',
        trait: '保护妹妹、留下时间错位线索',
        color: '#6d5dfc',
      },
    ],
    updatedAt: new Date().toISOString(),
  },
  receipt: {
    id: 'showcase-receipt-202605',
    title: '雨夜便利店最后一张小票',
    template: '都市反转样片',
    publish: {
      ...defaultPublishSettings,
      category: '都市反转短剧',
      audience: '抖音 / 小程序短剧用户',
      monetization: 'Free',
      price: '0',
    },
    modelRouting: defaultModelRouting,
    nodes: [
      {
        id: 'R01',
        title: '23:59 的小票',
        kind: 'Hook',
        summary: '店员许南打印出当天最后一张小票，付款人却写着三年前已经去世的前女友。',
        metric: '91% 继续',
        choices: [
          choice('RC01', '查收银系统', 'R02'),
          choice('RC02', '追出便利店门口', 'R03'),
        ],
      },
      {
        id: 'R02',
        title: '缺失的一分钟',
        kind: 'Puzzle',
        summary: '监控从 23:58 跳到 00:00，中间缺失的一分钟只留下雨伞和一枚硬币。',
        metric: '核心谜题',
        choices: [
          choice('RC03', '恢复监控缓存', 'R04', '勇气 >= 1'),
          choice('RC04', '报警备案', 'R05'),
        ],
      },
      {
        id: 'R03',
        title: '雨伞下的人',
        kind: 'Choice',
        summary: '许南在雨里看见熟悉背影，对方把同一张小票折成纸船推回门口。',
        metric: '情绪反转',
        choices: [
          choice('RC05', '追上去问清楚', 'R04'),
          choice('RC06', '回店里看纸船', 'R02'),
        ],
      },
      {
        id: 'R04',
        title: '纸船留言',
        kind: 'Choice',
        summary: '纸船内侧写着“别卖掉这家店”，背面是明天凌晨的中奖彩票号。',
        metric: '分流点',
        choices: [
          choice('RC07', '按号码买彩票', 'R06', '贪念 >= 1'),
          choice('RC08', '查店铺转让合同', 'R05'),
        ],
      },
      {
        id: 'R05',
        title: '合同里的名字',
        kind: 'Ending',
        summary: '许南发现买下便利店的人就是未来的自己，小票是他留给今晚的警告。',
        metric: '暖向结局',
        choices: [],
      },
      {
        id: 'R06',
        title: '中奖后的第二张小票',
        kind: 'Ending',
        summary: '彩票中奖，店门却永远停在 23:59。许南明白自己被困进了贪念循环。',
        metric: '黑色反转',
        choices: [],
      },
    ],
    variables: [
      { id: 'courage', label: '勇气', type: 'number', defaultValue: '1' },
      { id: 'greed', label: '贪念', type: 'number', defaultValue: '0' },
      { id: 'ticket', label: '小票', type: 'boolean', defaultValue: 'true' },
    ],
    characters: [
      {
        name: '许南',
        role: '便利店夜班店员',
        trait: '嘴硬心软，害怕失去唯一的店',
        color: '#2563eb',
      },
      {
        name: '唐雨',
        role: '前女友 / 时间线线索',
        trait: '温柔克制，像在替未来传话',
        color: '#9333ea',
      },
      {
        name: '老严',
        role: '片区民警',
        trait: '现实、敏锐，知道店铺旧案',
        color: '#0f766e',
      },
    ],
    updatedAt: new Date().toISOString(),
  },
  sect: {
    id: 'showcase-sect-202605',
    title: '全宗上下，拼不出一个好人',
    template: '玄幻喜剧样片',
    publish: {
      ...defaultPublishSettings,
      category: '玄幻喜剧短剧',
      audience: '轻喜剧 / 爽文互动用户',
      monetization: 'Paid Ending',
      price: '6.6',
    },
    modelRouting: defaultModelRouting,
    nodes: [
      {
        id: 'X01',
        title: '宗门开会先甩锅',
        kind: 'Hook',
        summary: '掌门闭关失败，宗门债主堵门，外门弟子姜糖被推上台当临时掌门。',
        metric: '96% 继续',
        choices: [
          choice('XC01', '先稳住债主', 'X02'),
          choice('XC02', '先清点宗门仓库', 'X03'),
        ],
      },
      {
        id: 'X02',
        title: '债主也想修仙',
        kind: 'Choice',
        summary: '债主不是来讨钱，而是想买一个能显得自己很正派的长老头衔。',
        metric: '爽点分支',
        choices: [
          choice('XC03', '封他为财神长老', 'X04'),
          choice('XC04', '让他参加入门考试', 'X05', '声望 >= 2'),
        ],
      },
      {
        id: 'X03',
        title: '仓库只剩锅',
        kind: 'Puzzle',
        summary: '仓库里没有灵石，只有三口锅和一本写满差评的祖师食谱。',
        metric: '喜剧谜题',
        choices: [
          choice('XC05', '用食谱摆摊还债', 'X04'),
          choice('XC06', '把锅炼成法器', 'X05', '脑洞 >= 1'),
        ],
      },
      {
        id: 'X04',
        title: '宗门夜市',
        kind: 'Choice',
        summary: '姜糖把宗门大比改成夜市，反派门派排队买烤灵菇，口碑突然翻红。',
        metric: '商业转向',
        choices: [
          choice('XC07', '把收入还给债主', 'X06'),
          choice('XC08', '投资护山大阵', 'X05'),
        ],
      },
      {
        id: 'X05',
        title: '祖师差评的真相',
        kind: 'Choice',
        summary: '差评其实是祖师故意留下的经营手册，宗门每次破产都能靠它重启。',
        metric: '隐藏线入口',
        choices: [
          choice('XC09', '公开祖师手册', 'X06'),
          choice('XC10', '保留手册改写宗规', 'X07', '声望 >= 2'),
        ],
      },
      {
        id: 'X06',
        title: '普通结局：全员摆摊',
        kind: 'Ending',
        summary: '宗门还清欠债，所有弟子白天修炼、晚上摆摊，意外成了修仙界连锁品牌。',
        metric: '免费结局',
        choices: [],
      },
      {
        id: 'X07',
        title: '隐藏结局：宗主姜糖',
        kind: 'Ending',
        summary: '姜糖把祖师手册改成新宗规，反派、债主和师叔都成了她的第一批员工。',
        metric: '付费隐藏结局',
        choices: [],
      },
    ],
    variables: [
      { id: 'reputation', label: '声望', type: 'number', defaultValue: '2' },
      { id: 'imagination', label: '脑洞', type: 'number', defaultValue: '1' },
      { id: 'ledger', label: '账本', type: 'boolean', defaultValue: 'true' },
    ],
    characters: [
      {
        name: '姜糖',
        role: '外门弟子 / 临时掌门',
        trait: '脑洞大、会算账、嘴上怂但行动狠',
        color: '#ea580c',
      },
      {
        name: '裴不亏',
        role: '债主 / 财神长老候选',
        trait: '精明、爱面子、想混正派身份',
        color: '#0f766e',
      },
      {
        name: '祁慢慢',
        role: '师叔 / 摆烂军师',
        trait: '懒散但毒舌，总在关键处补刀',
        color: '#7c3aed',
      },
    ],
    updatedAt: new Date().toISOString(),
  },
}

function loadShowcaseProjectFromUrl() {
  try {
    const sampleId = new URLSearchParams(window.location.search).get('sample') || ''
    const sample = showcaseSampleProjects[sampleId]
    return sample ? normalizeProject({ ...sample, updatedAt: new Date().toISOString() }) : null
  } catch {
    return null
  }
}

function normalizeChoices(node: Partial<StoryNode>, nodeIndex: number): StoryChoice[] {
  const rawChoices = Array.isArray(node.choices) ? node.choices : []
  return rawChoices.map((rawChoice, choiceIndex) => {
    if (typeof rawChoice === 'string') {
      return choice(
        `C${nodeIndex + 1}-${choiceIndex + 1}`,
        rawChoice,
        initialNodes[Math.min(nodeIndex + 1, initialNodes.length - 1)].id,
      )
    }

    const candidate = rawChoice as Partial<StoryChoice>
    return {
      id: candidate.id || `C${nodeIndex + 1}-${choiceIndex + 1}`,
      label: candidate.label || '新的选择',
      targetNodeId: candidate.targetNodeId || node.id || initialNodes[0].id,
      condition: candidate.condition || '',
    }
  })
}

function normalizeProject(value: unknown): StoryProject {
  if (!value || typeof value !== 'object') return sampleProject
  const project = value as Partial<StoryProject>

  if (
    typeof project.id !== 'string' ||
    typeof project.title !== 'string' ||
    typeof project.template !== 'string' ||
    !Array.isArray(project.nodes) ||
    project.nodes.length === 0 ||
    !Array.isArray(project.characters)
  ) {
    return sampleProject
  }

  const nodes = project.nodes.map((node, index) => ({
    id: node.id || `S${String(index + 1).padStart(2, '0')}`,
    title: node.title || '未命名节',
    kind: node.kind || 'Choice',
    summary: node.summary || '',
    metric: node.metric || '待测',
    paywall: node.paywall === 'paid' || node.paywall === 'free' ? node.paywall : undefined,
    choices: normalizeChoices(node, index),
  }))

  return {
    id: project.id,
    title: project.title,
    template: project.template,
    publish: project.publish || defaultPublishSettings,
    modelRouting: project.modelRouting || defaultModelRouting,
    nodes,
    variables: Array.isArray(project.variables) ? project.variables : initialVariables,
    characters: project.characters,
    lifecycleStatus: project.lifecycleStatus || 'active',
    archivedAt: project.archivedAt || null,
    updatedAt: project.updatedAt || new Date().toISOString(),
  }
}

function getLocalStorage(): Storage | null {
  try {
    return globalThis.localStorage || null
  } catch {
    return null
  }
}

function readStoredValue(key: string) {
  return getLocalStorage()?.getItem(key) || ''
}

function writeStoredValue(key: string, value: string) {
  getLocalStorage()?.setItem(key, value)
}

function loadStoredProject() {
  try {
    const showcaseProject = loadShowcaseProjectFromUrl()
    if (showcaseProject) return showcaseProject
    const stored = readStoredValue(STORAGE_KEY)
    return stored ? normalizeProject(JSON.parse(stored)) : sampleProject
  } catch {
    return sampleProject
  }
}

function loadActiveWorkspaceId() {
  try {
    return readStoredValue(WORKSPACE_STORAGE_KEY) || DEFAULT_WORKSPACE_ID
  } catch {
    return DEFAULT_WORKSPACE_ID
  }
}

function createRuntimeState(variables: StoryVariable[]): RuntimeState {
  return variables.reduce<RuntimeState>((state, variable) => {
    state[variable.label] = variable.defaultValue
    state[variable.id] = variable.defaultValue
    return state
  }, {})
}

function compareValues(left: string, operator: string, right: string) {
  const normalizedRight = right.replace(/^["']|["']$/g, '')
  const leftNumber = Number(left)
  const rightNumber = Number(normalizedRight)
  const bothNumeric = !Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)

  if (bothNumeric) {
    if (operator === '>=') return leftNumber >= rightNumber
    if (operator === '<=') return leftNumber <= rightNumber
    if (operator === '>') return leftNumber > rightNumber
    if (operator === '<') return leftNumber < rightNumber
    if (operator === '=' || operator === '==') return leftNumber === rightNumber
    if (operator === '!=' || operator === '!==') return leftNumber !== rightNumber
  }

  const normalizedLeft = left.toLowerCase()
  const normalizedRightLower = normalizedRight.toLowerCase()
  if (operator === '=' || operator === '==') return normalizedLeft === normalizedRightLower
  if (operator === '!=' || operator === '!==') return normalizedLeft !== normalizedRightLower
  return false
}

function evaluateCondition(condition: string, state: RuntimeState) {
  const trimmed = condition.trim()
  if (!trimmed) return true

  const match = trimmed.match(/^(.+?)\s*(>=|<=|!==|!=|==|=|>|<)\s*(.+)$/)
  if (!match) return false

  const [, rawKey, operator, rawValue] = match
  const key = rawKey.trim()
  const currentValue = state[key] ?? ''
  return compareValues(currentValue, operator, rawValue.trim())
}

function sortBuildHistory(builds: PublishBuild[]) {
  return [...builds].sort((left, right) => {
    if (right.version !== left.version) return right.version - left.version
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  })
}

function truncateProductionText(value: string, fallback: string, maxLength = 58) {
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return fallback
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized
}

function buildProductionReviewPackage(
  project: StoryProject,
  brief: SeriesGeneratorInput,
  providerId: string,
  model: string,
  qualityChecks: string[],
  note: string,
): GeneratedProjectReview {
  const endingNodes = project.nodes.filter((node) => node.kind === 'Ending')
  const endingCount = endingNodes.length
  const paidEndingCount =
    project.publish.monetization === 'Paid Ending'
      ? endingNodes.filter((node, index) => getNodePaywallMode(project, node, index) === 'paid').length
      : 0
  const cameraPlan = ['近景情绪', '中景对峙', '过肩追问', '低机位压迫', '手持跟拍', '俯拍关系']
  const motionPlan = ['缓推到关键道具', '横移揭示新角色', '快速切到反应', '定镜压住沉默', '跟随主角进入空间']
  const soundPlan = ['环境底噪压低', '心跳音效进入', '手机震动和远处广播', '短促转场击打', '留白后进主题音']
  const storyboardShots = project.nodes.flatMap((node, index) => {
    const character =
      project.characters[index % Math.max(1, project.characters.length)] || project.characters[0]
    const nextChoice = node.choices[0]
    const baseShot: ProductionStoryboardShot = {
      id: `SHOT-${String(index + 1).padStart(2, '0')}A`,
      nodeId: node.id,
      beat: `${node.kind} · ${node.title}`,
      duration: node.kind === 'Ending' ? '8s' : index === 0 ? '6s' : '5s',
      scene: truncateProductionText(node.summary, `${brief.genre}关键场面`),
      camera: cameraPlan[index % cameraPlan.length],
      motion: motionPlan[index % motionPlan.length],
      visualPrompt: [
        brief.genre,
        project.publish.category,
        character?.name ? `${character.name} ${character.role}` : '核心角色',
        node.summary,
        'native 9:16 live-action short drama shot, cinematic realism, consistent face and wardrobe, no subtitles, no title cards, no readable phone text',
      ].filter(Boolean).join('，'),
      dialogue: nextChoice
        ? `${character?.name || '主角'}：${nextChoice.label}`
        : `${character?.name || '主角'}：这就是最后的答案。`,
      sound: soundPlan[index % soundPlan.length],
      status: character ? 'ready' : 'needs-reference',
    }
    const shouldAddCutaway = node.kind !== 'Ending' && node.choices.length > 1
    const cutawayShot: ProductionStoryboardShot = {
      id: `SHOT-${String(index + 1).padStart(2, '0')}B`,
      nodeId: node.id,
      beat: '选择卡点',
      duration: '3s',
      scene: truncateProductionText(
        node.choices.map((item) => item.label).join(' / '),
        '玩家选择出现前的反应镜头',
      ),
      camera: '插入特写',
      motion: '切到手部、眼神或关键道具',
      visualPrompt: [
        brief.genre,
        'choice moment before the viewer decides, interactive cliffhanger, actor reaction close-up, no on-screen UI, no readable option text',
        node.choices.length > 1 ? `${node.choices.length} possible choices implied by acting and props` : 'single decision beat',
      ].join('，'),
      dialogue: '屏幕选择：观众决定下一步。',
      sound: '选择提示音 + 低频停顿',
      status: 'queued',
    }
    return shouldAddCutaway ? [baseShot, cutawayShot] : [baseShot]
  })

  const characterAssets = project.characters.map((character, index) => ({
    name: character.name || `角色 ${index + 1}`,
    role: character.role || '剧情关键人物',
    wardrobe:
      index % 3 === 0
        ? '深色外套、低饱和内搭、清晰轮廓'
        : index % 3 === 1
          ? '职业感外套、可识别配饰、冷静表情'
          : '生活化服装、强反差识别色、动作记忆点',
    visualPrompt: [
      character.name,
      character.role,
      character.trait,
      `signature color ${character.color}`,
      'same face, same wardrobe, same hairstyle, vertical drama reference sheet',
    ].filter(Boolean).join('，'),
    voice:
      index % 3 === 0
        ? '压低声线，短句推进'
        : index % 3 === 1
          ? '克制、慢半拍、隐藏信息'
          : '节奏快，带反讽和情绪反弹',
    consistency: Math.min(96, 78 + character.trait.length + (character.color ? 4 : 0)),
  }))

  const videoQueue: ProductionVideoQueueItem[] = storyboardShots.slice(0, 10).map((shot, index) => ({
    id: `VQ-${String(index + 1).padStart(2, '0')}`,
    shotId: shot.id,
    provider: index % 3 === 0 ? 'Seedance / 即梦' : index % 3 === 1 ? 'Kling' : 'Runway / Veo',
    model: index % 3 === 0 ? 'text-to-video' : index % 3 === 1 ? 'image-to-video' : 'reference-to-video',
    status: shot.status === 'needs-reference' ? 'reference-needed' : index < 4 ? 'prompt-ready' : 'queued',
    estimate: `${shot.duration} · 9:16`,
  }))

  const exportItems: ProductionExportItem[] = [
    { label: '剧情图谱 JSON', value: `${project.nodes.length} 节点`, status: 'ready' },
    { label: '导演分镜表', value: `${storyboardShots.length} 镜`, status: 'ready' },
    { label: '视频 Prompt 包', value: `${videoQueue.length} 条`, status: 'ready' },
    { label: '角色一致性表', value: `${characterAssets.length} 人`, status: 'ready' },
    { label: '字幕 SRT 草稿', value: `${storyboardShots.length} 段`, status: 'ready' },
    {
      label: '互动发布包',
      value: formatMonetization(project.publish.monetization),
      status: project.nodes.length >= 4 ? 'ready' : 'waiting',
    },
  ]

  const benchmarkCapabilities: ProductionBenchmarkCapability[] = [
    {
      label: '剧本到分镜',
      state: storyboardShots.length >= project.nodes.length ? 'ready' : 'partial',
      detail: `${storyboardShots.length} 个镜头已拆解`,
    },
    {
      label: '角色一致性',
      state: characterAssets.length >= 3 ? 'ready' : 'partial',
      detail: `${characterAssets.length} 份参考设定`,
    },
    {
      label: '视频生产队列',
      state: videoQueue.length >= 6 ? 'ready' : 'partial',
      detail: '按 9:16 竖屏短剧准备',
    },
    {
      label: '互动变现',
      state: project.publish.monetization !== 'Free' ? 'ready' : 'partial',
      detail: project.publish.monetization !== 'Free' ? '含付费卡点' : '免费闭环优先',
    },
    {
      label: '导出交付',
      state: exportItems.filter((item) => item.status === 'ready').length >= 5 ? 'ready' : 'partial',
      detail: `${exportItems.filter((item) => item.status === 'ready').length}/${exportItems.length} 项就绪`,
    },
  ]
  const averageCharacterConsistency =
    characterAssets.length > 0
      ? Math.round(
          characterAssets.reduce((total, asset) => total + asset.consistency, 0) /
            characterAssets.length,
        )
      : 0
  const firstShot = storyboardShots[0]
  const thirdShot = storyboardShots[2] || storyboardShots[0]
  const paidSignal =
    paidEndingCount > 0
      ? `${paidEndingCount} 个付费结局已进入商业线`
      : '可从剧情编辑页一键生成付费隐藏线'
  const productionMemory: ProductionMemoryItem[] = [
    {
      label: '人物记忆',
      value: `${characterAssets.length} 人`,
      detail:
        characterAssets.length > 0
          ? `${characterAssets[0].name}：${characterAssets[0].wardrobe}`
          : '缺少角色参考，生成前需要补主角设定',
      status: characterAssets.length >= 2 ? 'ready' : characterAssets.length > 0 ? 'partial' : 'risk',
    },
    {
      label: '声音记忆',
      value: `${characterAssets.length} 条`,
      detail:
        characterAssets.length > 0
          ? `${characterAssets[0].name}：${characterAssets[0].voice}`
          : '缺少口吻和声线说明',
      status: characterAssets.length >= 2 ? 'ready' : 'partial',
    },
    {
      label: '场景风格',
      value: brief.genre,
      detail: `${project.publish.category} · 9:16 竖屏 · ${brief.audience}`,
      status: 'ready',
    },
    {
      label: '分镜上下文',
      value: `${storyboardShots.length} 镜`,
      detail: firstShot ? `${firstShot.camera}，${firstShot.motion}` : '等待分镜拆解',
      status: storyboardShots.length >= 6 ? 'ready' : 'partial',
    },
    {
      label: '商业卡点',
      value: paidEndingCount > 0 ? `${paidEndingCount} 个` : '待强化',
      detail: paidSignal,
      status: paidEndingCount > 0 ? 'ready' : 'partial',
    },
  ]
  const directorActions: ProductionDirectorAction[] = [
    {
      id: 'local-shot-rewrite',
      label: '局部重生成',
      target: thirdShot ? thirdShot.id : 'SHOT-03',
      instruction: thirdShot
        ? `只改 ${thirdShot.id}，保留人物外观和上一镜情绪，把${thirdShot.scene}改得更有压迫感。`
        : '选择一个镜头后，只改该镜头，不重跑整条视频。',
      impact: '节省返工成本，客户试片时最常用',
      status: thirdShot ? 'ready' : 'partial',
    },
    {
      id: 'hook-upgrade',
      label: '前三秒钩子',
      target: firstShot ? firstShot.id : '开场镜头',
      instruction: firstShot
        ? `强化 ${firstShot.id} 的冲突信息，前三秒出现目标、阻碍和情绪反差。`
        : '补一个开场冲突镜头，让观众三秒内知道为什么要看。',
      impact: '提升完播和广告投放素材可用性',
      status: firstShot ? 'ready' : 'partial',
    },
    {
      id: 'paid-reversal',
      label: '付费反转',
      target: paidEndingCount > 0 ? '付费结局' : '隐藏线',
      instruction:
        paidEndingCount > 0
          ? '保留主线免费结局，把付费结局改成信息反转更强、回看价值更高的版本。'
          : '从当前分支生成一条付费隐藏线，结局必须提供免费线拿不到的真相。',
      impact: '把常规短剧升级成互动短剧收入点',
      status: paidEndingCount > 0 ? 'ready' : 'partial',
    },
    {
      id: 'caption-pass',
      label: '字幕重排',
      target: 'SRT',
      instruction: '按短句、情绪停顿和选择卡点重写字幕断句，避免遮挡关键画面。',
      impact: '提升成片交付专业感',
      status: storyboardShots.length > 0 ? 'ready' : 'partial',
    },
  ]
  const storyContinuityScore = Math.min(
    96,
    60 + project.nodes.length * 4 + endingCount * 3 + (project.nodes.some((node) => node.choices.length > 0) ? 8 : 0),
  )
  const captionScore = Math.min(96, 68 + storyboardShots.filter((shot) => shot.dialogue).length * 2)
  const rightsScore = providerId === 'local-template' || providerId === 'fallback' ? 72 : 84
  const paywallScore = Math.min(95, paidEndingCount > 0 ? 82 + paidEndingCount * 6 : 56)
  const qualityMetrics: ProductionQualityMetric[] = [
    {
      label: '角色一致性',
      value: `${averageCharacterConsistency || 0}%`,
      threshold: '目标 86%',
      detail: averageCharacterConsistency >= 86 ? '可进入连续镜头生产' : '建议补角色参考图和服装锁定',
      status: averageCharacterConsistency >= 86 ? 'ready' : averageCharacterConsistency >= 76 ? 'partial' : 'risk',
    },
    {
      label: '剧情连贯性',
      value: `${storyContinuityScore}%`,
      threshold: '目标 82%',
      detail: storyContinuityScore >= 82 ? '主线、分支和结局已具备试片结构' : '建议补开局、选择或结局',
      status: storyContinuityScore >= 82 ? 'ready' : storyContinuityScore >= 70 ? 'partial' : 'risk',
    },
    {
      label: '字幕可用性',
      value: `${captionScore}%`,
      threshold: '目标 80%',
      detail: '成片合成会生成 SRT，交付前复核断句',
      status: captionScore >= 82 ? 'ready' : 'partial',
    },
    {
      label: '商用授权',
      value: `${rightsScore}%`,
      threshold: '人工复核',
      detail: rightsScore >= 80 ? '供应商素材需保留任务记录' : 'Prompt 包可交付，正式成片需换商用供应商',
      status: rightsScore >= 80 ? 'partial' : 'risk',
    },
    {
      label: '付费卡点',
      value: `${paywallScore}%`,
      threshold: '目标 78%',
      detail: paidEndingCount > 0 ? '付费结局已有差异化信息' : '建议升级为互动付费隐藏线',
      status: paywallScore >= 78 ? 'ready' : 'partial',
    },
  ]
  exportItems.push(
    { label: '制作记忆库', value: `${productionMemory.length} 组`, status: 'ready' },
    { label: '导演修改指令', value: `${directorActions.length} 条`, status: 'ready' },
    {
      label: '质量验收分',
      value: `${qualityMetrics.filter((metric) => metric.status === 'ready').length}/${qualityMetrics.length}`,
      status: qualityMetrics.some((metric) => metric.status === 'risk') ? 'waiting' : 'ready',
    },
  )

  return {
    projectId: project.id,
    title: project.title,
    providerId,
    model,
    createdAt: new Date().toISOString(),
    nodeCount: project.nodes.length,
    characterCount: project.characters.length,
    endingCount,
    paidEndingCount,
    variableCount: project.variables.length,
    shotCount: storyboardShots.length,
    videoQueueCount: videoQueue.length,
    exportCount: exportItems.filter((item) => item.status === 'ready').length,
    qualityChecks,
    note,
    storyboardShots,
    characterAssets,
    videoQueue,
    exportItems,
    benchmarkCapabilities,
    productionMemory,
    directorActions,
    qualityMetrics,
  }
}

function PublicLandingPage() {
  const [leadForm, setLeadForm] = useState({
    name: '',
    company: '',
    role: '短剧团队',
    phone: '',
    email: '',
    scenario: '互动短剧内测',
    message: '',
  })
  const [leadState, setLeadState] = useState<'idle' | 'submitting' | 'success' | 'error'>(
    'idle',
  )
  const [leadMessage, setLeadMessage] = useState('留下信息后，我们会优先安排产品演示')

  const updateLeadField =
    (field: keyof typeof leadForm) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setLeadForm((current) => ({ ...current, [field]: event.target.value }))
      if (leadState !== 'submitting') {
        setLeadState('idle')
        setLeadMessage('留下信息后，我们会优先安排产品演示')
      }
    }

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLeadState('submitting')
    setLeadMessage('正在提交申请')

    try {
      const lead = await submitLeadApplication<MarketingLead>({
        ...leadForm,
        source: 'public-landing-page',
      })
      setLeadState('success')
      setLeadMessage(`已收到，线索编号 ${lead.id.slice(-6)}，我们会尽快联系你`)
      setLeadForm((current) => ({
        ...current,
        name: '',
        company: '',
        phone: '',
        email: '',
        message: '',
      }))
    } catch (error) {
        logError('api', error)
      setLeadState('error')
      const message = error instanceof Error ? error.message : '提交失败'
      setLeadMessage(
        message.includes('contact_required')
          ? '请至少填写手机号或邮箱'
          : message.includes('invalid_phone')
            ? '手机号格式不对，请填写中国大陆手机号'
            : message.includes('invalid_email')
              ? '邮箱格式不对'
              : '提交失败，请稍后再试',
      )
    }
  }

  const publicShowcaseItems = [
    {
      title: '旧医院的第七通电',
      genre: '悬疑互动',
      stats: '7 节点 · 2 结局 · 付费隐藏线',
      copy: '一句题材生成可试玩剧情图谱，再继续细修角色、变量和结局门槛。',
      media: 'video',
      sampleId: 'hospital',
    },
    {
      title: '雨夜便利店最后一张小票',
      genre: '都市反转',
      stats: '6 节点 · 2 结局 · H5 预览',
      copy: '适合抖音、小程序和私域引流的短剧情节，先有样片，再进发布。',
      media: 'image',
      sampleId: 'receipt',
    },
    {
      title: '全宗上下，拼不出一个好人',
      genre: '玄幻喜剧',
      stats: '7 节点 · 角色一致性 · 分支复盘',
      copy: '把爽点、反转和互动选择放进同一个生产面板，交付不靠口头同步。',
      media: 'image',
      sampleId: 'sect',
    },
  ]
  const publicHeroPosters = [
    {
      title: '旧医院的第七通电',
      tag: '悬疑互动',
      metric: '付费隐藏线',
    },
    {
      title: '雨夜便利店最后一张小票',
      tag: '都市反转',
      metric: 'H5 试玩',
    },
    {
      title: '全宗上下，拼不出一个好人',
      tag: '玄幻喜剧',
      metric: '分支复盘',
    },
    {
      title: '醒来后，我成了她的证词',
      tag: '情绪爽点',
      metric: '短剧生产包',
    },
    {
      title: '最后一幕才知道谁在说谎',
      tag: '反转结局',
      metric: '微信 0.01 验收',
    },
  ]
  const publicHomeFeatures = [
    '新建剧本',
    '网文改编',
    '剧本评估',
    '短剧拉片',
    '发布收款',
  ]

  return (
    <main className="public-site public-site-cinematic">
      <header className="public-nav">
        <a className="public-brand" href="/" aria-label="PlayDrama landing">
          <span className="public-brand-mark">
            <Sparkles size={20} />
          </span>
          <span>
            <strong>PlayDrama</strong>
            <em>AI 互动短剧工作台</em>
          </span>
        </a>
        <nav aria-label="Public navigation">
          <a href="#showcase">样片展示</a>
          <a href="#market">国内机会</a>
          <a href="#workflow">产品闭环</a>
          <a href="#apply">申请内测</a>
          <a className="public-studio-link" href="/studio">
            进入工作台
          </a>
        </nav>
      </header>

      <section className="public-hero" aria-labelledby="public-hero-title">
        <div className="public-hero-backdrop" aria-hidden="true" />
        <div className="public-hero-content">
          <p className="public-kicker">
            <Rocket size={18} />
            短剧创作、互动发布和收款闭环
          </p>
          <h1 id="public-hero-title">PlayDrama</h1>
          <p className="public-hero-line">
            给短剧团队和服务商的一套 AI 制作台：从一句创意生成剧本生产包，再升级成可选择、可付费、可复盘的互动短剧。
          </p>
          <div className="public-hero-tabs" aria-label="PlayDrama creation entries">
            {publicHomeFeatures.map((item) => (
              <a href={item === '发布收款' ? '/studio?page=publish' : '/studio?page=creation'} key={item}>
                {item}
              </a>
            ))}
          </div>
          <div className="public-hero-actions" aria-label="Primary actions">
            <a className="public-primary-action" href="/studio">
              制作互动短剧
              <ChevronRight size={18} />
            </a>
            <a className="public-primary-action" href="/studio?generate=1">
              生成常规短剧
              <ChevronRight size={18} />
            </a>
            <a className="public-secondary-action" href="#showcase">
              <Play size={18} fill="currentColor" />
              看样片
            </a>
            <a className="public-secondary-action" href="/marketing/playdrama-china-impact.pptx" download>
              <Download size={18} />
              下载路演 PPT
            </a>
          </div>
        </div>
        <div className="public-hero-stage" aria-label="PlayDrama product preview">
          <div className="public-poster-wall" aria-label="短剧项目样例">
            {publicHeroPosters.map((item, index) => (
              <article className="public-poster-card" key={item.title}>
                <img src="/marketing/playdrama-hero.png" alt="" aria-hidden="true" />
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <em>{item.tag}</em>
                  <strong>{item.title}</strong>
                  <small>{item.metric}</small>
                </div>
              </article>
            ))}
          </div>
          <div className="public-product-preview" aria-label="创作工作台预览">
            <div className="public-product-bar">
              <span />
              <span />
              <span />
              <strong>普通短剧创作平台</strong>
            </div>
            <div className="public-product-grid">
              {[
                ['01', '灵感策划', '一句话卖点'],
                ['02', '故事梗概', '8 个剧情节点'],
                ['03', '人物小传', '4 个角色资产'],
                ['04', '分集大纲', '镜头脚本可导出'],
              ].map(([index, label, detail]) => (
                <article key={label}>
                  <span>{index}</span>
                  <strong>{label}</strong>
                  <em>{detail}</em>
                </article>
              ))}
            </div>
            <div className="public-product-footer">
              <span>互动分支</span>
              <strong>付费结局 + 微信验收 + 数据回流</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="public-signal-row" id="market" aria-label="Domestic market signals">
        <div>
          <span>微短剧用户规模</span>
          <strong>6.96 亿</strong>
        </div>
        <div>
          <span>2024 市场规模</span>
          <strong>504.4 亿</strong>
        </div>
        <div>
          <span>相关企业生态</span>
          <strong>10 万+</strong>
        </div>
        <div>
          <span>PlayDrama 状态</span>
          <strong>17/17 通过</strong>
        </div>
      </section>

      <section className="public-showcase" id="showcase" aria-labelledby="public-showcase-title">
        <div className="public-section-copy">
          <p className="public-section-label">样片证明</p>
          <h2 id="public-showcase-title">先看到一部短剧，再决定要不要进工作台</h2>
          <p>
            PlayDrama 的入口要像真实短剧生产工具：样片、草稿、编辑和上线在同一条链路里，而不是只展示一堆功能名。
          </p>
        </div>
        <div className="public-showcase-grid">
          {publicShowcaseItems.map((item, index) => (
            <a
              className="public-showcase-card"
              key={item.title}
              href={`/studio?preview=1&sample=${item.sampleId}`}
              aria-label={`试玩样片：${item.title}`}
            >
              <div className="public-showcase-media">
                {item.media === 'video' ? (
                  <video
                    src="/marketing/playdrama-promo-20260522.mp4"
                    poster="/marketing/playdrama-hero.png"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img src="/marketing/playdrama-hero.png" alt={`${item.title} 样片画面`} />
                )}
                <span>{String(index + 1).padStart(2, '0')}</span>
              </div>
              <div className="public-showcase-body">
                <small>{item.genre}</small>
                <strong>{item.title}</strong>
                <em>{item.stats}</em>
                <p>{item.copy}</p>
                <span className="public-showcase-cta">
                  <Play size={16} fill="currentColor" />
                  打开互动试玩
                </span>
              </div>
            </a>
          ))}
        </div>
        <div className="public-generator-path" aria-label="Short drama generation path">
          {['写一句题材', 'AI 生成短剧草稿', '编辑分支和角色', '发布并复盘'].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>

      <section className="public-video-band" aria-labelledby="public-video-title">
        <div className="public-section-copy">
          <p className="public-section-label">商业叙事</p>
          <h2 id="public-video-title">给合作方看的 42 秒版本</h2>
          <p>
            这支预热视频说明了 PlayDrama 在国内短剧产业里的位置：不是单点生成工具，而是把生产、审核、发布、收款和数据回传连起来。
          </p>
        </div>
        <video
          className="public-video"
          src="/marketing/playdrama-promo-20260522.mp4"
          poster="/marketing/playdrama-hero.png"
          controls
          playsInline
          preload="metadata"
        >
          <a href="/marketing/playdrama-promo-20260522.mp4">查看宣传视频</a>
        </video>
      </section>

      <section className="public-workflow" id="workflow" aria-labelledby="public-workflow-title">
        <div className="public-section-copy">
          <p className="public-section-label">产品闭环</p>
          <h2 id="public-workflow-title">互动短剧需要的是一条运营流水线</h2>
        </div>
        <div className="public-flow">
          {[
            { icon: GitBranch, title: '剧情图谱', copy: '节点、选择、变量、隐藏结局统一管理' },
            { icon: Bot, title: 'AI 导演', copy: '用通义千问辅助扩写、补分支、查冲突' },
            { icon: ShieldCheck, title: '合规门禁', copy: '内容安全、上线检查、商用配置一屏验收' },
            { icon: Share2, title: '渠道分发', copy: 'H5、抖音、微信小程序路径同步准备' },
            { icon: BarChart3, title: '变现复盘', copy: '付费结局、渠道参数、试玩事件回传' },
          ].map((item) => {
            const Icon = item.icon
            return (
              <article className="public-flow-item" key={item.title}>
                <Icon size={22} />
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="public-impact" aria-labelledby="public-impact-title">
        <div>
          <p className="public-section-label">国内影响力</p>
          <h2 id="public-impact-title">让中小团队也能进入互动内容工业化</h2>
        </div>
        <div className="public-impact-grid">
          <article>
            <Users size={22} />
            <strong>短剧团队</strong>
            <span>把 IP、剧本和分支变成可试玩版本</span>
          </article>
          <article>
            <Clapperboard size={22} />
            <strong>MCN 和服务商</strong>
            <span>用标准流程交付更多垂类互动项目</span>
          </article>
          <article>
            <QrCode size={22} />
            <strong>文旅和品牌</strong>
            <span>用剧情化体验做传播、获客和会员转化</span>
          </article>
        </div>
      </section>

      <section className="public-apply" id="apply" aria-labelledby="public-apply-title">
        <div className="public-apply-copy">
          <p className="public-section-label">内测合作</p>
          <h2 id="public-apply-title">拿一个真实项目，跑一条完整链路</h2>
          <p>
            适合短剧制作团队、MCN、内容服务商、文旅项目和品牌互动营销团队。我们优先支持能提供真实故事样本的共创伙伴。
          </p>
          <ul>
            <li>
              <CheckCircle2 size={18} />
              一部作品完成剧情图谱和 H5 试玩
            </li>
            <li>
              <CheckCircle2 size={18} />
              接入渠道参数、支付门槛和数据回传
            </li>
            <li>
              <CheckCircle2 size={18} />
              形成可复制的互动短剧上线方法
            </li>
          </ul>
        </div>

        <form className="public-lead-form" onSubmit={submitLead}>
          <label>
            <span>姓名</span>
            <input
              value={leadForm.name}
              onChange={updateLeadField('name')}
              placeholder="怎么称呼你"
              required
            />
          </label>
          <label>
            <span>公司或团队</span>
            <input
              value={leadForm.company}
              onChange={updateLeadField('company')}
              placeholder="团队名称"
            />
          </label>
          <label>
            <span>角色</span>
            <select value={leadForm.role} onChange={updateLeadField('role')}>
              <option>短剧团队</option>
              <option>MCN / 服务商</option>
              <option>文旅项目</option>
              <option>品牌营销</option>
              <option>投资 / 渠道伙伴</option>
            </select>
          </label>
          <div className="public-form-grid">
            <label>
              <span>手机号</span>
              <input
                value={leadForm.phone}
                onChange={updateLeadField('phone')}
                placeholder="用于联系"
                inputMode="tel"
              />
            </label>
            <label>
              <span>邮箱</span>
              <input
                value={leadForm.email}
                onChange={updateLeadField('email')}
                placeholder="选填"
                type="email"
              />
            </label>
          </div>
          <label>
            <span>想验证什么</span>
            <select value={leadForm.scenario} onChange={updateLeadField('scenario')}>
              <option>互动短剧内测</option>
              <option>抖音 / 微信小程序上线</option>
              <option>付费结局和数据复盘</option>
              <option>短剧服务商解决方案</option>
            </select>
          </label>
          <label>
            <span>补充说明</span>
            <textarea
              value={leadForm.message}
              onChange={updateLeadField('message')}
              placeholder="已有故事、账号、预算或上线时间，可以写在这里"
              rows={4}
            />
          </label>
          <button className="public-submit" type="submit" disabled={leadState === 'submitting'}>
            {leadState === 'submitting' ? '提交中' : '提交内测申请'}
          </button>
          <p className={`public-form-state ${leadState}`}>{leadMessage}</p>
        </form>
      </section>
    </main>
  )
}

function App() {
  const params = new URLSearchParams(window.location.search)
  const pathname = window.location.pathname
  const shouldOpenStudio =
    pathname.startsWith('/studio') ||
    params.get('preview') === '1' ||
    Boolean(params.get('build')) ||
    Boolean(params.get('sample')) ||
    Boolean(params.get('invite'))

  return shouldOpenStudio ? <StudioApp /> : <PublicLandingPage />
}

function loadInitialStudioPage(): StudioPage {
  const params = new URLSearchParams(window.location.search)
  const requestedPage = params.get('page')
  if (studioPageIds.includes(requestedPage as StudioPage)) {
    return requestedPage as StudioPage
  }
  if (params.get('generate') === '1' || params.get('new') === 'short-drama') {
    return 'ai'
  }
  return 'overview'
}

function StudioApp() {
  const [project, setProject] = useState<StoryProject>(() => loadStoredProject())
  const [previewOnly, setPreviewOnly] = useState(() =>
    new URLSearchParams(window.location.search).get('preview') === '1' ||
    Boolean(new URLSearchParams(window.location.search).get('build')),
  )
  const [previewBuildId, setPreviewBuildId] = useState(
    () => new URLSearchParams(window.location.search).get('build') || '',
  )
  const [selectedNodeId, setSelectedNodeId] = useState(project.nodes[0].id)
  const [selectedCharacterIndex, setSelectedCharacterIndex] = useState(0)
  const [runtimeNodeId, setRuntimeNodeId] = useState(project.nodes[0].id)
  const [runtimeState, setRuntimeState] = useState<RuntimeState>(() =>
    createRuntimeState(project.variables),
  )
  const [runtimePath, setRuntimePath] = useState(() => [project.nodes[0].id])
  const [runtimeMessage, setRuntimeMessage] = useState('试玩已准备')
  const [activeStudioPage, setActiveStudioPage] = useState<StudioPage>(() =>
    loadInitialStudioPage(),
  )
  const [activeCreationStage, setActiveCreationStage] =
    useState<CreationStageId>('inspiration')
  const [searchQuery, setSearchQuery] = useState('')
  const [saveState, setSaveState] = useState('已同步本地草稿')
  const [buildState, setBuildState] = useState('等待生成发布包')
  const [aiState, setAiState] = useState('AI 可生成下一幕')
  const [seriesGenerator, setSeriesGenerator] = useState<SeriesGeneratorInput>({
    idea: '医院午夜来电，女主发现每次选择都会改写当天热搜',
    genre: '悬疑反转',
    audience: '18-35 岁短剧用户',
    platform: '抖音 / 微信小程序',
    duration: '8-12 分钟',
    interactionDensity: '每 2-3 幕一个选择',
    monetization: 'Paid Ending',
    constraints: '避免血腥细节，免费线要完整，付费结局提供更强反转',
  })
  const [beginnerIdea, setBeginnerIdea] =
    useState('普通女孩发现自己每次刷到同一条短视频，现实都会跟着改写')
  const [beginnerGenre, setBeginnerGenre] = useState('悬疑反转')
  const [beginnerLength, setBeginnerLength] = useState('3 分钟 / 6 集')
  const [beginnerGoal, setBeginnerGoal] = useState<BeginnerCreationGoal>('paid')
  const [beginnerCreationState, setBeginnerCreationState] =
    useState('一句话就能开始，系统会自动补创作表单')
  const [seriesGenerationState, setSeriesGenerationState] =
    useState('填写 brief 后生成完整短剧草稿')
  const [seriesGenerationJob, setSeriesGenerationJob] =
    useState<AiGenerationJob | null>(null)
  const [generatedProjectReview, setGeneratedProjectReview] =
    useState<GeneratedProjectReview | null>(null)
  const [distributionState, setDistributionState] = useState('渠道分发待生成发布包')
  const [publishedBuildId, setPublishedBuildId] = useState('')
  const [publishBuilds, setPublishBuilds] = useState<PublishBuild[]>([])
  const [session, setSession] = useState<WorkspaceSession | null>(null)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(loadActiveWorkspaceId)
  const [workspaceList, setWorkspaceList] = useState<WorkspaceSummary[]>([])
  const [newWorkspaceName, setNewWorkspaceName] = useState('短剧内测工作')
  const [workspaceState, setWorkspaceState] = useState('工作区已准备')
  const [projectList, setProjectList] = useState<StoryProject[]>([])
  const [archivedProjectList, setArchivedProjectList] = useState<StoryProject[]>([])
  const [showArchivedProjects, setShowArchivedProjects] = useState(false)
  const [projectListState, setProjectListState] = useState('项目列表已准备')
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [inviteDeliveries, setInviteDeliveries] = useState<InviteDelivery[]>([])
  const [marketingLeads, setMarketingLeads] = useState<MarketingLead[]>([])
  const [leadListState, setLeadListState] = useState('内测申请待同步')
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>([])
  const [aiUsageEvents, setAiUsageEvents] = useState<AiUsageEvent[]>([])
  const [aiProvider, setAiProvider] = useState<AiProviderStatus | null>(null)
  const [videoProvider, setVideoProvider] = useState<VideoProviderStatus | null>(null)
  const [videoGenerationJobs, setVideoGenerationJobs] = useState<VideoGenerationJob[]>([])
  const [finalVideoRenders, setFinalVideoRenders] = useState<FinalVideoRenderJob[]>([])
  const [videoGenerationState, setVideoGenerationState] = useState('视频生产队列待提交')
  const [finalVideoRenderState, setFinalVideoRenderState] = useState('成片 MP4 待合成')
  const [finalVideoDeliveryMode, setFinalVideoDeliveryMode] =
    useState<'client-review' | 'platform-delivery' | 'cdn-archive'>('client-review')
  const [finalVideoSubtitleMode, setFinalVideoSubtitleMode] =
    useState<'sidecar' | 'burned-in'>('sidecar')
  const [finalVideoAudioMode, setFinalVideoAudioMode] =
    useState<'silent' | 'mixing-ready' | 'voiceover-ready'>('mixing-ready')
  const [finalVideoReviewVerdict, setFinalVideoReviewVerdict] =
    useState<'needs-changes' | 'approved' | 'blocked'>('needs-changes')
  const [finalVideoReviewNote, setFinalVideoReviewNote] =
    useState('前三秒钩子、人物连续性和字幕断句需要客户确认')
  const [directorInstructionState, setDirectorInstructionState] =
    useState('选择一条导演修改指令')
  const [contentSafetyReviews, setContentSafetyReviews] = useState<ContentSafetyReview[]>([])
  const [contentSafetyState, setContentSafetyState] = useState('内容安全待扫描')
  const [paymentOrders, setPaymentOrders] = useState<PaymentOrder[]>([])
  const [paymentLedgerOrders, setPaymentLedgerOrders] = useState<PaymentOrder[]>([])
  const [checkoutState, setCheckoutState] = useState('支付服务已准备')
  const [paymentVerificationState, setPaymentVerificationState] =
    useState('等待发布包和付费结局')
  const [launchGuard, setLaunchGuard] = useState<LaunchGuard | null>(null)
  const [launchGuardState, setLaunchGuardState] = useState('上线守护待同步')
  const [customerTrialMode, setCustomerTrialMode] = useState(false)
  const [customerTrialState, setCustomerTrialState] =
    useState('待启动：准备客户演示前先一键配置 0.01 元验收链路')
  const [paymentMethod, setPaymentMethod] = useState<'alipay' | 'wechat'>('alipay')
  const [paymentOrderFilter, setPaymentOrderFilter] = useState<PaymentOrderFilter>('all')
  const [paymentOrderSearch, setPaymentOrderSearch] = useState('')
  const [paymentOpsState, setPaymentOpsState] = useState('订单运营待处理')
  const [paymentProvider, setPaymentProvider] = useState<PaymentProviderStatus | null>(null)
  const [distributionProvider, setDistributionProvider] =
    useState<DistributionProviderStatus | null>(null)
  const [distributionJobs, setDistributionJobs] = useState<DistributionJob[]>([])
  const [distributionJobState, setDistributionJobState] = useState('发布任务待生成')
  const [pendingPaidChoice, setPendingPaidChoice] = useState<StoryChoice | null>(null)
  const [auditActionFilter, setAuditActionFilter] = useState('all')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('editor')
  const [inviteState, setInviteState] = useState('可邀请内测成员')
  const [latestInviteUrl, setLatestInviteUrl] = useState('')
  const [loginEmail, setLoginEmail] = useState('creator@example.com')
  const [loginPhone, setLoginPhone] = useState('')
  const [loginName, setLoginName] = useState('Creator')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginCode, setLoginCode] = useState('')
  const [loginCodeSentTo, setLoginCodeSentTo] = useState('')
  const [loginCodeExpiresAt, setLoginCodeExpiresAt] = useState('')
  const [authState, setAuthState] = useState('正在检测登录服务')
  const [authProvider, setAuthProvider] = useState<AuthProviderStatus | null>(null)
  const [emailProvider, setEmailProvider] = useState<EmailProviderStatus | null>(null)
  const [storageHealth, setStorageHealth] = useState<StorageHealth | null>(null)
  const [commercialReadiness, setCommercialReadiness] =
    useState<CommercialReadiness | null>(null)
  const initialProjectIdRef = useRef(project.id)
  const activeProjectIdRef = useRef(project.id)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const runtimeSessionIdRef = useRef('')
  const lastRecordedRuntimeNodeRef = useRef('')
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now())
  useEffect(() => {
    runtimeSessionIdRef.current ||= `ses_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const timer = window.setInterval(() => setCurrentTimeMs(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    activeProjectIdRef.current = project.id
  }, [project.id])
  const authProviderId = authProvider?.provider ?? ''
  const isNetlifyIdentityAuth = authProviderId === 'netlify-identity'
  const isEmailCodeAuth = authProviderId === 'email-code'
  const isSmsCodeAuth = authProviderId === 'sms-code'
  const isExternalProviderAuth = Boolean(authProvider && authProvider.provider !== 'local-demo')
  const hasWorkspaceSession = Boolean(session)
  const isAuthProviderLoading = authProvider === null
  const useCloudLoginShell = isAuthProviderLoading && import.meta.env.PROD
  const isGenericProviderAuth =
    isExternalProviderAuth && !isNetlifyIdentityAuth && !isEmailCodeAuth && !isSmsCodeAuth
  const loginCodeDestination = isSmsCodeAuth ? loginPhone.trim() : loginEmail.trim().toLowerCase()
  const canVerifyLoginCode =
    (isEmailCodeAuth || isSmsCodeAuth) &&
    loginCodeSentTo === loginCodeDestination &&
    loginCode.trim().length === 6 &&
    (!loginCodeExpiresAt || new Date(loginCodeExpiresAt).getTime() > currentTimeMs)
  const authLoginTitle = isSmsCodeAuth || useCloudLoginShell
    ? '手机号验证码登录'
    : isEmailCodeAuth
      ? '邮箱验证码登录'
      : isNetlifyIdentityAuth
        ? '邮箱密码登录'
        : '本地工作区登录'
  const authLoginSubtitle = isSmsCodeAuth || useCloudLoginShell
    ? '短信验证码进入工作区'
    : isEmailCodeAuth
      ? '邮件验证码进入工作区'
      : isGenericProviderAuth
        ? '使用外部账号进入工作区'
        : '本地演示账号进入工作区'
  const isSignedIntoWorkspace = Boolean(session && isExternalProviderAuth)
  const signedInContact = session?.user.phone || session?.user.email || ''
  const activeStudioPageCopy = studioPageCopy[activeStudioPage]
  const pagePanelClass = (baseClass: string, pages: StudioPage[]) =>
    `${baseClass} ${pages.includes(activeStudioPage) ? '' : 'page-hidden'}`
  const visibleAuthState =
    isSignedIntoWorkspace && authState === '正在恢复登录'
      ? `已登录：${signedInContact || '工作区账号'}`
      : authState
  const authStateTone = /失败|未发出|不正确|不可用|过期|太频繁|限制/.test(visibleAuthState)
    ? 'error'
    : /已发送|已登录|已退出|已同步/.test(visibleAuthState)
      ? 'success'
      : 'info'
  const isAiBusy =
    aiState.startsWith('正在') ||
    Boolean(seriesGenerationJob && ['queued', 'running'].includes(seriesGenerationJob.status))
  const isSeriesGenerating = seriesGenerationJob
    ? ['queued', 'running'].includes(seriesGenerationJob.status)
    : seriesGenerationState.startsWith('正在')

  const storyNodes = project.nodes
  const selectedNode =
    storyNodes.find((node) => node.id === selectedNodeId) ?? storyNodes[0]
  const safeSelectedCharacterIndex = Math.min(
    selectedCharacterIndex,
    Math.max(0, project.characters.length - 1),
  )
  const selectedCharacter =
    project.characters[safeSelectedCharacterIndex] ?? project.characters[0] ?? null
  const runtimeNode =
    storyNodes.find((node) => node.id === runtimeNodeId) ?? storyNodes[0]
  const runtimeProgress = useMemo(() => {
    const currentIndex = Math.max(
      0,
      storyNodes.findIndex((node) => node.id === runtimeNode.id),
    )
    const total = Math.max(1, storyNodes.length)
    return {
      current: currentIndex + 1,
      total,
      percent: Math.round(((currentIndex + 1) / total) * 100),
    }
  }, [runtimeNode.id, storyNodes])
  const runtimeAllowedChoiceCount = useMemo(
    () =>
      runtimeNode.choices.filter((item) =>
        evaluateCondition(item.condition, runtimeState),
      ).length,
    [runtimeNode.choices, runtimeState],
  )
  const runtimePathLabel = useMemo(() => runtimePath.join(' -> '), [runtimePath])
  const projectHasRemoteRecord = useMemo(
    () => projectList.some((item) => item.id === project.id),
    [project.id, projectList],
  )

  const filteredNodes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return storyNodes

    return storyNodes.filter((node) =>
      [node.id, node.title, node.kind, node.summary, node.metric]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [searchQuery, storyNodes])

  const connectionCount = storyNodes.reduce(
    (total, node) => total + node.choices.filter((item) => item.targetNodeId).length,
    0,
  )
  const endingCount = storyNodes.filter((node) => node.kind === 'Ending').length
  const endingNodeIndexById = useMemo(
    () =>
      new Map(
        storyNodes
          .filter((node) => node.kind === 'Ending')
          .map((node, index) => [node.id, index]),
      ),
    [storyNodes],
  )
  const selectedNodeIncoming = storyNodes.filter((node) =>
    node.choices.some((choiceItem) => choiceItem.targetNodeId === selectedNode.id),
  )
  const selectedNodeReadiness = [
    { label: '摘要', done: selectedNode.summary.trim().length >= 18 },
    {
      label: '出路',
      done: selectedNode.kind === 'Ending' || selectedNode.choices.some((item) => item.targetNodeId),
    },
    { label: '指标', done: selectedNode.metric.trim().length > 0 },
  ]
  const storyNodeDiagnostics = useMemo(() => {
    const nodeIds = new Set(storyNodes.map((node) => node.id))
    const incomingCount = new Map(storyNodes.map((node) => [node.id, 0]))

    storyNodes.forEach((node) => {
      node.choices.forEach((choiceItem) => {
        if (!nodeIds.has(choiceItem.targetNodeId)) return
        incomingCount.set(
          choiceItem.targetNodeId,
          (incomingCount.get(choiceItem.targetNodeId) || 0) + 1,
        )
      })
    })

    return storyNodes.map((node, index) => {
      const issues: Array<{ label: string; tone: 'critical' | 'warn' }> = []
      const missingTargetCount = node.choices.filter(
        (choiceItem) => !nodeIds.has(choiceItem.targetNodeId),
      ).length
      const unnamedChoiceCount = node.choices.filter(
        (choiceItem) => choiceItem.label.trim().length < 2,
      ).length
      const loopCount = node.choices.filter(
        (choiceItem) => choiceItem.targetNodeId === node.id,
      ).length
      const incoming = incomingCount.get(node.id) || 0

      if (node.summary.trim().length < 18) {
        issues.push({ label: '摘要过短', tone: 'warn' })
      }
      if (missingTargetCount > 0) {
        issues.push({ label: `${missingTargetCount} 个目标失效`, tone: 'critical' })
      }
      if (unnamedChoiceCount > 0) {
        issues.push({ label: `${unnamedChoiceCount} 个选择待命名`, tone: 'warn' })
      }
      if (node.kind !== 'Ending' && node.choices.length === 0) {
        issues.push({ label: '缺少出站分支', tone: 'critical' })
      }
      if (node.kind === 'Ending' && node.choices.length > 0) {
        issues.push({ label: '结局仍有分支', tone: 'warn' })
      }
      if (index > 0 && incoming === 0) {
        issues.push({ label: '未接入主线', tone: 'warn' })
      }
      if (loopCount > 0 && node.kind !== 'Puzzle') {
        issues.push({ label: '存在回环', tone: 'warn' })
      }

      const criticalCount = issues.filter((item) => item.tone === 'critical').length
      const warningCount = issues.length - criticalCount
      const readiness = Math.max(0, 100 - criticalCount * 32 - warningCount * 18)

      return {
        nodeId: node.id,
        incoming,
        outgoing: node.choices.length,
        issues,
        criticalCount,
        warningCount,
        readiness,
        status: criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warn' : 'clean',
      }
    })
  }, [storyNodes])
  const storyDiagnosticByNodeId = useMemo(
    () => new Map(storyNodeDiagnostics.map((item) => [item.nodeId, item])),
    [storyNodeDiagnostics],
  )
  const storyReachability = useMemo(() => {
    const nodeById = new Map(storyNodes.map((node) => [node.id, node]))
    const firstNode = storyNodes[0]
    const reachableNodeIds = new Set<string>()
    const stack = firstNode ? [firstNode.id] : []

    while (stack.length > 0) {
      const nodeId = stack.pop()
      if (!nodeId || reachableNodeIds.has(nodeId)) continue
      reachableNodeIds.add(nodeId)

      const node = nodeById.get(nodeId)
      if (!node) continue
      node.choices.forEach((choiceItem) => {
        if (nodeById.has(choiceItem.targetNodeId) && !reachableNodeIds.has(choiceItem.targetNodeId)) {
          stack.push(choiceItem.targetNodeId)
        }
      })
    }

    const endingNodes = storyNodes.filter((node) => node.kind === 'Ending')
    const reachableEndingNodes = endingNodes.filter((node) => reachableNodeIds.has(node.id))
    const endingIndexById = new Map(endingNodes.map((node, index) => [node.id, index]))
    const paidEndingNodes =
      project.publish.monetization === 'Paid Ending'
        ? endingNodes.filter(
            (node) =>
              getNodePaywallMode(project, node, endingIndexById.get(node.id) || 0) === 'paid',
          )
        : []
    const paidBranchRows = storyNodes.flatMap((node) =>
      node.choices
        .map((choiceItem) => {
          const target = nodeById.get(choiceItem.targetNodeId)
          return {
            id: choiceItem.id,
            sourceId: node.id,
            sourceTitle: node.title,
            label: choiceItem.label || '未命名选择',
            targetId: choiceItem.targetNodeId,
            targetTitle: target?.title || '目标失效',
            targetKind: target?.kind || 'Missing',
            targetPaywall: target
              ? getNodePaywallMode(project, target, endingIndexById.get(target.id) || 0)
              : 'free',
            condition: choiceItem.condition || '无条件',
            reachable: reachableNodeIds.has(node.id) && Boolean(target),
          }
        })
        .filter(
          (row) =>
            row.targetKind === 'Ending' &&
            project.publish.monetization === 'Paid Ending' &&
            row.targetPaywall === 'paid',
        ),
    )
    const deadEndNodes = storyNodes.filter(
      (node) => node.kind !== 'Ending' && node.choices.length === 0,
    )
    const orphanNodes = storyNodes.filter(
      (node, index) => index > 0 && !reachableNodeIds.has(node.id),
    )
    const mainRoute = []
    const visitedRouteNodeIds = new Set<string>()
    let currentNode: StoryNode | undefined = firstNode

    while (currentNode && mainRoute.length < 8 && !visitedRouteNodeIds.has(currentNode.id)) {
      mainRoute.push(currentNode)
      visitedRouteNodeIds.add(currentNode.id)

      const nextChoice: StoryChoice | undefined = currentNode.choices.find((choiceItem) =>
        nodeById.has(choiceItem.targetNodeId),
      )
      currentNode = nextChoice ? nodeById.get(nextChoice.targetNodeId) : undefined
    }

    return {
      reachableNodeIds,
      reachableCount: reachableNodeIds.size,
      endingCount: endingNodes.length,
      reachableEndingCount: reachableEndingNodes.length,
      paidEndingCount: paidEndingNodes.length,
      paidBranchRows,
      deadEndNodes,
      orphanNodes,
      mainRoute,
      status:
        reachableEndingNodes.length === 0
          ? 'critical'
          : orphanNodes.length > 0 || deadEndNodes.length > 0
            ? 'warn'
            : 'clean',
    }
  }, [project, storyNodes])
  const selectedNodeDiagnostic = storyDiagnosticByNodeId.get(selectedNode.id) || {
    nodeId: selectedNode.id,
    incoming: selectedNodeIncoming.length,
    outgoing: selectedNode.choices.length,
    issues: [],
    criticalCount: 0,
    warningCount: 0,
    readiness: 100,
    status: 'clean',
  }
  const storyDiagnosisSummary = {
    critical: storyNodeDiagnostics.reduce((total, item) => total + item.criticalCount, 0),
    warning: storyNodeDiagnostics.reduce((total, item) => total + item.warningCount, 0),
    clean: storyNodeDiagnostics.filter((item) => item.status === 'clean').length,
  }
  const storyIssueRows = storyNodeDiagnostics
    .flatMap((diagnostic) => {
      const node = storyNodes.find((item) => item.id === diagnostic.nodeId)
      return diagnostic.issues.map((issue) => ({
        id: `${diagnostic.nodeId}-${issue.label}`,
        nodeId: diagnostic.nodeId,
        nodeTitle: node?.title || '未命名节点',
        label: issue.label,
        tone: issue.tone,
        readiness: diagnostic.readiness,
      }))
    })
    .sort((left, right) => {
      const severityDelta =
        (right.tone === 'critical' ? 1 : 0) - (left.tone === 'critical' ? 1 : 0)
      return severityDelta || left.readiness - right.readiness
    })
  const firstStoryIssue = storyNodeDiagnostics.find((item) => item.issues.length > 0)
  const storyReviewCards = [
    {
      label: '主线闭环',
      value: storyReachability.reachableEndingCount > 0 ? '可到结局' : '未闭环',
      note: `${storyReachability.reachableCount}/${storyNodes.length} 节点可达`,
      tone: storyReachability.reachableEndingCount > 0 ? 'ok' : 'critical',
    },
    {
      label: '问题队列',
      value:
        storyIssueRows.length === 0
          ? '已清空'
          : `${storyDiagnosisSummary.critical} 阻断`,
      note:
        storyIssueRows.length === 0
          ? '节点结构稳定'
          : `${storyIssueRows.length} 项待处理`,
      tone:
        storyDiagnosisSummary.critical > 0
          ? 'critical'
          : storyIssueRows.length > 0
            ? 'warn'
            : 'ok',
    },
    {
      label: '付费卡点',
      value:
        project.publish.monetization === 'Paid Ending'
          ? `${storyReachability.paidBranchRows.length} 条触达`
          : '未启用',
      note:
        project.publish.monetization === 'Paid Ending'
          ? `${storyReachability.paidEndingCount} 个结局可收费`
          : '发布页可切换付费结局',
      tone:
        project.publish.monetization !== 'Paid Ending'
          ? 'warn'
          : storyReachability.paidBranchRows.length > 0
            ? 'ok'
            : 'critical',
    },
    {
      label: '断点风险',
      value: `${storyReachability.deadEndNodes.length + storyReachability.orphanNodes.length}`,
      note: `${storyReachability.orphanNodes.length} 孤岛 / ${storyReachability.deadEndNodes.length} 断点`,
      tone:
        storyReachability.deadEndNodes.length + storyReachability.orphanNodes.length > 0
          ? 'warn'
          : 'ok',
    },
  ]
  const storyRouteStages = storyNodes.slice(0, 6).map((node) => ({
    node,
    diagnostic: storyDiagnosticByNodeId.get(node.id),
    nextLabel:
      node.kind === 'Ending'
        ? '完结'
        : node.choices[0]?.targetNodeId
          ? `下一步 ${node.choices[0].targetNodeId}`
          : '断点',
  }))
  const branchConditionTemplates = project.variables.slice(0, 4).map(buildConditionTemplate)
  const selectedNodePaywallMode = getNodePaywallMode(
    project,
    selectedNode,
    endingNodeIndexById.get(selectedNode.id) || 0,
  )
  const selectedNodeBranchRows = selectedNode.choices.map((choiceItem, index) => {
    const target = storyNodes.find((node) => node.id === choiceItem.targetNodeId)
    const targetPaywall = target
      ? getNodePaywallMode(project, target, endingNodeIndexById.get(target.id) || 0)
      : 'free'
    const variableMatched =
      choiceItem.condition.trim().length === 0 ||
      project.variables.some((variable) =>
        choiceItem.condition.includes(variable.id) ||
        choiceItem.condition.includes(variable.label),
      )
    const isPaidTarget =
      project.publish.monetization === 'Paid Ending' &&
      target?.kind === 'Ending' &&
      targetPaywall === 'paid'
    const status =
      !target || choiceItem.label.trim().length < 2 || !variableMatched ? 'warn' : 'ok'
    const targetTitle = target ? truncateProductionText(target.title, '目标节点', 14) : '目标节点'
    const suggestedLabel =
      !target
        ? '补目标节点'
        : isPaidTarget
          ? `解锁${targetTitle}`
          : target.kind === 'Ending'
            ? `进入${targetTitle}`
            : selectedNode.kind === 'Puzzle'
              ? `破解${targetTitle}`
              : selectedNode.kind === 'Hook'
                ? `追进${targetTitle}`
                : `转向${targetTitle}`
    const suggestedCondition =
      choiceItem.condition.trim().length === 0 ? branchConditionTemplates[0]?.condition || '' : ''
    const runtimeConditionSatisfied =
      choiceItem.condition.trim().length === 0 || evaluateCondition(choiceItem.condition, runtimeState)

    return {
      id: choiceItem.id,
      index,
      label: choiceItem.label || '未命名选择',
      targetId: target?.id || '',
      targetKind: target?.kind || 'Missing',
      targetLabel: target ? `${target.id} · ${target.title}` : '目标节点不存在',
      conditionLabel: choiceItem.condition || '无条件',
      conditionRuntimeLabel: choiceItem.condition
        ? runtimeConditionSatisfied
          ? '当前预览满足'
          : '当前预览锁定'
        : '无条件',
      stateLabel: !target
        ? '目标失效'
        : !variableMatched
          ? '条件未绑定变量'
          : isPaidTarget
            ? '付费解锁'
            : '可试玩',
      paywallLabel: isPaidTarget ? '付费卡点' : '免费路径',
      targetPaywall,
      isPaidTarget,
      suggestedLabel,
      suggestedCondition,
      status,
    }
  })
  const storyHealthCards = [
    {
      label: '剧情节点',
      value: storyNodes.length.toString(),
      note: storyNodes.length >= 4 ? '主线可试玩' : '建议补到 4 节点',
      tone: storyNodes.length >= 4 ? 'ok' : 'warn',
    },
    {
      label: '分支连线',
      value: connectionCount.toString(),
      note: connectionCount >= 5 ? '选择密度足够' : '继续补关键选择',
      tone: connectionCount >= 5 ? 'ok' : 'warn',
    },
    {
      label: '结局节点',
      value: endingCount.toString(),
      note: endingCount > 0 ? '有可到达结局' : '缺少收束点',
      tone: endingCount > 0 ? 'ok' : 'warn',
    },
    {
      label: '状态变量',
      value: project.variables.length.toString(),
      note: project.variables.length >= 3 ? '可做条件分支' : '变量偏少',
      tone: project.variables.length >= 3 ? 'ok' : 'warn',
    },
  ]
  const visibleGeneratedReview =
    generatedProjectReview?.projectId === project.id ? generatedProjectReview : null
  const productionMemoryRows: ProductionMemoryItem[] = visibleGeneratedReview
    ? visibleGeneratedReview.productionMemory?.length
      ? visibleGeneratedReview.productionMemory
      : [
          {
            label: '人物记忆',
            value: `${visibleGeneratedReview.characterCount} 人`,
            detail: '由角色一致性表回填，建议重新生成生产包以获得完整记忆',
            status: visibleGeneratedReview.characterCount >= 2 ? 'partial' : 'risk',
          },
          {
            label: '分镜上下文',
            value: `${visibleGeneratedReview.shotCount} 镜`,
            detail: '由导演分镜表回填，可继续导出和合成',
            status: visibleGeneratedReview.shotCount >= 6 ? 'partial' : 'risk',
          },
          {
            label: '商业卡点',
            value: visibleGeneratedReview.paidEndingCount > 0 ? `${visibleGeneratedReview.paidEndingCount} 个` : '待强化',
            detail: visibleGeneratedReview.paidEndingCount > 0 ? '已有付费结局' : '建议升级互动付费隐藏线',
            status: visibleGeneratedReview.paidEndingCount > 0 ? 'partial' : 'risk',
          },
        ]
    : []
  const directorActionRows: ProductionDirectorAction[] = visibleGeneratedReview
    ? visibleGeneratedReview.directorActions?.length
      ? visibleGeneratedReview.directorActions
      : [
          {
            id: 'legacy-hook-upgrade',
            label: '前三秒钩子',
            target: visibleGeneratedReview.storyboardShots[0]?.id || '开场镜头',
            instruction: '强化开场冲突，保留角色设定，只调整第一个镜头。',
            impact: '旧生产包兼容指令，建议重新生成以获得完整导演动作',
            status: 'partial',
          },
          {
            id: 'legacy-caption-pass',
            label: '字幕重排',
            target: 'SRT',
            instruction: '按短句、情绪停顿和选择卡点重写字幕断句。',
            impact: '提升成片交付专业感',
            status: 'partial',
          },
        ]
    : []
  const productionQualityMetrics: ProductionQualityMetric[] = visibleGeneratedReview
    ? visibleGeneratedReview.qualityMetrics?.length
      ? visibleGeneratedReview.qualityMetrics
      : [
          {
            label: '角色一致性',
            value: `${Math.min(90, 60 + visibleGeneratedReview.characterCount * 8)}%`,
            threshold: '目标 86%',
            detail: '旧生产包回填评分，建议重新生成后复核',
            status: visibleGeneratedReview.characterCount >= 3 ? 'partial' : 'risk',
          },
          {
            label: '剧情连贯性',
            value: `${Math.min(92, 58 + visibleGeneratedReview.nodeCount * 5)}%`,
            threshold: '目标 82%',
            detail: '基于节点和分镜数量估算',
            status: visibleGeneratedReview.nodeCount >= 5 ? 'partial' : 'risk',
          },
          {
            label: '付费卡点',
            value: visibleGeneratedReview.paidEndingCount > 0 ? '82%' : '56%',
            threshold: '目标 78%',
            detail: visibleGeneratedReview.paidEndingCount > 0 ? '已有付费结局' : '建议升级互动付费隐藏线',
            status: visibleGeneratedReview.paidEndingCount > 0 ? 'partial' : 'risk',
          },
        ]
    : []
  const generatedReviewMetrics = visibleGeneratedReview
    ? [
        {
          label: '剧情节点',
          value: `${visibleGeneratedReview.nodeCount}`,
          note: visibleGeneratedReview.nodeCount >= 6 ? '可进入细修' : '建议补主线',
        },
        {
          label: '导演分镜',
          value: `${visibleGeneratedReview.shotCount}`,
          note: visibleGeneratedReview.shotCount >= visibleGeneratedReview.nodeCount ? '已拆镜' : '继续补镜头',
        },
        {
          label: '角色一致',
          value: `${visibleGeneratedReview.characterCount}`,
          note: visibleGeneratedReview.characterCount >= 3 ? '参考资产可用' : '继续补角色',
        },
        {
          label: '视频队列',
          value: `${visibleGeneratedReview.videoQueueCount}`,
          note: visibleGeneratedReview.videoQueueCount >= 6 ? '可批量生产' : '队列偏少',
        },
        {
          label: '导出包',
          value: `${visibleGeneratedReview.exportCount}`,
          note:
            visibleGeneratedReview.paidEndingCount > 0
              ? `${visibleGeneratedReview.paidEndingCount} 个付费卡点`
              : '含免费闭环',
        },
      ]
    : []
  const videoJobByShotId = useMemo(
    () => {
      const jobsByShot = new Map<string, VideoGenerationJob>()
      for (const job of videoGenerationJobs) {
        if (!jobsByShot.has(job.shotId)) {
          jobsByShot.set(job.shotId, job)
        }
      }
      return jobsByShot
    },
    [videoGenerationJobs],
  )
  const videoProviderLabel =
    videoProvider?.providers.find((item) => item.id === videoProvider.provider)?.displayName ||
    videoProvider?.provider ||
    '视频供应商'
  const isLiveVideoProvider = isBillableVideoProvider(videoProvider)
  const videoSubmitLimit = isLiveVideoProvider
    ? videoProvider?.commercial?.liveSubmitLimit || 1
    : videoProvider?.commercial?.promptBatchLimit || 6
  const videoJobSummary = {
    total: videoGenerationJobs.length,
    running: videoGenerationJobs.filter((job) => job.status === 'running' || job.status === 'queued').length,
    ready: videoGenerationJobs.filter((job) => job.status === 'prompt-ready').length,
    succeeded: videoGenerationJobs.filter((job) => job.status === 'succeeded').length,
    failed: videoGenerationJobs.filter((job) => job.status === 'failed').length,
  }
  const videoShotPipelineRows = visibleGeneratedReview
    ? visibleGeneratedReview.videoQueue.map((item, index) => {
        const job = videoJobByShotId.get(item.shotId)
        return {
          item,
          index,
          job,
          state: job?.status || 'missing',
          readyForDelivery: Boolean(job?.outputUrl && job.status === 'succeeded'),
        }
      })
    : []
  const videoPipelineRequiredCount = videoShotPipelineRows.length
  const videoPipelineCompletedCount = videoShotPipelineRows.filter((row) => row.readyForDelivery).length
  const videoPipelineMissingCount = videoShotPipelineRows.filter((row) => !row.job).length
  const videoPipelinePromptCount = videoShotPipelineRows.filter((row) => row.job?.status === 'prompt-ready').length
  const videoPipelineFailedCount = videoShotPipelineRows.filter((row) => row.job?.status === 'failed').length
  const videoPipelineRunningCount = videoShotPipelineRows.filter(
    (row) => row.job?.status === 'running' || row.job?.status === 'queued',
  ).length
  const videoPipelineCanExport = videoPipelineCompletedCount > 0
  const videoPipelineCommercialReady =
    Boolean(videoProvider?.productionReady) &&
    videoPipelineCompletedCount > 0 &&
    videoPipelineFailedCount === 0
  const latestFinalVideoRender = finalVideoRenders[0] || null
  const previousFinalVideoRender = finalVideoRenders[1] || null
  const hasRunningFinalVideoRender =
    latestFinalVideoRender?.status === 'queued' || latestFinalVideoRender?.status === 'running'
  const finalVideoRenderCanStart = videoPipelineCompletedCount > 0 && !hasRunningFinalVideoRender
  const finalVideoDeliveryModes = [
    {
      id: 'client-review' as const,
      label: '客户审片版',
      detail: '带批注和审片门禁',
      deliveryProfile: 'client-review-v1',
      archivePolicy: 'workspace-retention-v1',
      qualityGate: 'client-review-v1',
    },
    {
      id: 'platform-delivery' as const,
      label: '平台交付版',
      detail: 'MP4、SRT、清单齐备',
      deliveryProfile: 'commercial-final-cut-v1',
      archivePolicy: 'manual-cdn-handoff-v1',
      qualityGate: 'commercial-delivery-v1',
    },
    {
      id: 'cdn-archive' as const,
      label: 'CDN 归档版',
      detail: '为长期播放地址预留',
      deliveryProfile: 'cdn-archive-v1',
      archivePolicy: 'cdn-archive-v1',
      qualityGate: 'archive-ready-v1',
    },
  ]
  const activeFinalVideoDeliveryMode =
    finalVideoDeliveryModes.find((item) => item.id === finalVideoDeliveryMode) ||
    finalVideoDeliveryModes[0]
  const finalVideoSubtitlePolicy =
    finalVideoSubtitleMode === 'burned-in' ? 'burned-in-srt-v1' : 'sidecar-srt-v1'
  const finalVideoAudioPolicy =
    finalVideoAudioMode === 'voiceover-ready'
      ? 'voiceover-handoff-v1'
      : finalVideoAudioMode === 'mixing-ready'
        ? 'mix-ready-silent-bed-v1'
        : 'silent-bed-v1'
  const finalVideoMusicPolicy =
    finalVideoAudioMode === 'silent' ? 'no-music-v1' : 'music-handoff-v1'
  const finalVideoVoiceoverPolicy =
    finalVideoAudioMode === 'voiceover-ready' ? 'voiceover-handoff-v1' : 'voiceover-script-handoff-v1'
  const finalVideoRenderDownloadUrl =
    latestFinalVideoRender?.status === 'succeeded' && latestFinalVideoRender.outputUrl
      ? latestFinalVideoRender.outputUrl
      : ''
  const finalVideoRenderManifestUrl = latestFinalVideoRender?.manifestUrl || ''
  const finalVideoRenderAssets = latestFinalVideoRender?.response?.assets || {}
  const finalVideoRenderCaptionsUrl =
    finalVideoRenderAssets.captionsUrl ||
    (latestFinalVideoRender?.request?.captions?.length
      ? `/api/video/renders/${encodeURIComponent(latestFinalVideoRender.id)}/captions.srt`
      : '')
  const finalVideoRenderVersion = latestFinalVideoRender?.request?.version || 'v1'
  const finalVideoRenderReviewChecklist = latestFinalVideoRender?.request?.reviewChecklist || []
  const finalVideoRenderReviewNotes = latestFinalVideoRender?.request?.reviewNotes || []
  const finalVideoRenderReviewVerdictText = formatFinalVideoReviewVerdict(
    latestFinalVideoRender?.request?.clientReview?.verdict ||
      latestFinalVideoRender?.response?.reviewStatus ||
      'waiting-for-review',
  )
  const finalVideoRenderReviewDoneCount = finalVideoRenderReviewChecklist.filter(
    (item) => item.status === 'pass' || item.status === 'approved',
  ).length
  const finalVideoRenderAudioText =
    latestFinalVideoRender?.response?.audioTrack === 'silent-aac-bed'
      ? '静音 AAC 音轨'
      : formatFinalVideoPolicy(latestFinalVideoRender?.request?.audioPolicy)
  const finalVideoRenderSubtitleText =
    latestFinalVideoRender?.response?.subtitleTrack === 'burned-in-and-srt-sidecar'
      ? `已烧录 · ${latestFinalVideoRender?.request?.captions?.length || 0} 条 SRT`
      : latestFinalVideoRender?.response?.subtitleTrack === 'srt-sidecar' || finalVideoRenderCaptionsUrl
        ? `${latestFinalVideoRender?.request?.captions?.length || 0} 条 SRT`
      : '待生成'
  const finalVideoArchiveText =
    latestFinalVideoRender?.response?.assets?.cdnUrl
      ? 'CDN 已回填'
      : latestFinalVideoRender?.request?.archivePolicy === 'cdn-archive-v1'
        ? '待回填 CDN'
        : latestFinalVideoRender?.outputUrl
          ? '站内短链'
          : '待成片'
  const finalVideoVersionCompareRows = latestFinalVideoRender
    ? [
        {
          label: '最新版本',
          value: `${finalVideoRenderVersion} · ${formatFinalVideoRenderStatus(latestFinalVideoRender.status)}`,
          note: `${latestFinalVideoRender.clipCount} 镜 · ${formatFinalVideoDeliveryProfile(latestFinalVideoRender.request?.deliveryProfile)}`,
        },
        {
          label: '上一版本',
          value: previousFinalVideoRender
            ? `${previousFinalVideoRender.request?.version || 'v1'} · ${formatFinalVideoRenderStatus(previousFinalVideoRender.status)}`
            : '暂无',
          note: previousFinalVideoRender
            ? `${previousFinalVideoRender.clipCount} 镜 · ${
                latestFinalVideoRender.clipCount - previousFinalVideoRender.clipCount >= 0 ? '+' : ''
              }${latestFinalVideoRender.clipCount - previousFinalVideoRender.clipCount} 镜差异`
            : '再次合成后自动形成版本对比',
        },
        {
          label: '审片结论',
          value: finalVideoRenderReviewVerdictText,
          note:
            finalVideoRenderReviewNotes.length > 0
              ? `${finalVideoRenderReviewNotes.length} 条批注已入清单`
              : '等待客户或制作人批注',
        },
      ]
    : []
  const finalVideoRenderStatusText = latestFinalVideoRender
    ? formatFinalVideoRenderStatus(latestFinalVideoRender.status)
    : videoPipelineCompletedCount > 0
      ? '可发起 MP4 合成'
      : '等待可播放素材'
  const videoPipelineStatusText = !visibleGeneratedReview
    ? '先生成短剧生产包'
    : videoPipelineCommercialReady
      ? `可交付 ${videoPipelineCompletedCount}/${videoPipelineRequiredCount} 镜`
      : isLiveVideoProvider
        ? `真实生成 ${videoPipelineCompletedCount}/${videoPipelineRequiredCount} 镜`
        : `Prompt 交付 ${videoPipelinePromptCount}/${videoPipelineRequiredCount} 镜`
  const videoPipelineCards = [
    {
      label: '视频供应商',
      value: isLiveVideoProvider ? 'Live' : 'Prompt',
      note: isLiveVideoProvider
        ? `${videoProviderLabel} 已可真实调用`
        : videoProvider?.missing?.length
          ? videoProvider.missing.join(' / ')
          : '可先导出 Prompt 交付包',
      state: isLiveVideoProvider ? 'ready' : 'waiting',
    },
    {
      label: '镜头提交',
      value: `${videoJobSummary.total}/${videoPipelineRequiredCount || 0}`,
      note:
        videoPipelineMissingCount > 0
          ? `${videoPipelineMissingCount} 镜未提交`
          : videoPipelineRequiredCount > 0
            ? '镜头已进入任务池'
            : '等待分镜队列',
      state: videoPipelineMissingCount === 0 && videoPipelineRequiredCount > 0 ? 'ready' : 'waiting',
    },
    {
      label: '结果预览',
      value: `${videoPipelineCompletedCount} 条`,
      note:
        videoPipelineRunningCount > 0
          ? `${videoPipelineRunningCount} 条生成中`
          : videoPipelineCompletedCount > 0
            ? '可预览并复制视频链接'
            : '等待首条可播放结果',
      state: videoPipelineCompletedCount > 0 ? 'ready' : videoPipelineRunningCount > 0 ? 'running' : 'waiting',
    },
    {
      label: '失败恢复',
      value: `${videoPipelineFailedCount} 条`,
      note: videoPipelineFailedCount > 0 ? '可按原参数重试' : '暂无失败任务',
      state: videoPipelineFailedCount > 0 ? 'waiting' : 'ready',
    },
    {
      label: '成片交付',
      value: finalVideoRenderDownloadUrl ? 'MP4' : finalVideoRenderStatusText,
      note: finalVideoRenderDownloadUrl
        ? '可直接下载最终成片'
        : latestFinalVideoRender?.status === 'handoff-ready'
          ? '服务器需安装 FFmpeg'
          : videoPipelineCanExport
            ? '可导出清单或发起合成'
            : '至少完成 1 条视频',
      state: finalVideoRenderDownloadUrl
        ? 'ready'
        : hasRunningFinalVideoRender
          ? 'running'
          : videoPipelineCanExport
            ? 'waiting'
            : 'waiting',
    },
  ]
  const storySearchText = storyNodes
    .flatMap((node) => [
      node.id,
      node.title,
      node.summary,
      node.kind,
      node.metric,
      ...node.choices.map((item) => `${item.label} ${item.condition}`),
    ])
    .join(' ')
  const characterAssetRows = project.characters.map((character, index) => {
    const checklist = [
      { label: '姓名', done: character.name.trim().length >= 2 },
      { label: '定位', done: character.role.trim().length >= 4 },
      { label: '性格秘密', done: character.trait.trim().length >= 10 },
      { label: '识别色', done: /^#[0-9a-f]{6}$/i.test(character.color.trim()) },
    ]
    const mentionCount = character.name.trim()
      ? storySearchText.split(character.name.trim()).length - 1
      : 0
    const completion = Math.round(
      (checklist.filter((item) => item.done).length / checklist.length) * 100,
    )

    return {
      ...character,
      index,
      checklist,
      completion,
      mentionCount,
      statusLabel:
        completion >= 100 && mentionCount > 0
          ? '可用于生成'
          : completion >= 75
            ? '待绑定剧情'
            : '档案待补',
    }
  })
  const characterAverageCompletion =
    characterAssetRows.length === 0
      ? 0
      : Math.round(
          characterAssetRows.reduce((total, item) => total + item.completion, 0) /
            characterAssetRows.length,
        )
  const characterReadyCount = characterAssetRows.filter(
    (item) => item.completion >= 100,
  ).length
  const characterBoundCount = characterAssetRows.filter((item) => item.mentionCount > 0).length
  const characterRelationshipRows = characterAssetRows
    .flatMap((source, sourceIndex) =>
      characterAssetRows.slice(sourceIndex + 1).map((target) => ({
        id: `${source.name}-${target.name}`,
        source,
        target,
        signal:
          source.mentionCount > 0 && target.mentionCount > 0
            ? '同场剧情可追踪'
            : '等待剧情绑定',
      })),
    )
    .slice(0, 5)
  const selectedCharacterAsset =
    selectedCharacter === null
      ? null
      : characterAssetRows.find((item) => item.index === safeSelectedCharacterIndex) ||
        characterAssetRows[0]
  const characterHealthCards = [
    {
      label: '角色档案',
      value: project.characters.length.toString(),
      note: project.characters.length >= 3 ? '主创阵容完整' : '建议至少 3 人',
      tone: project.characters.length >= 3 ? 'ok' : 'warn',
    },
    {
      label: '资产完整度',
      value: `${characterAverageCompletion}%`,
      note: characterAverageCompletion >= 90 ? '可支撑生成' : '继续补定位和秘密',
      tone: characterAverageCompletion >= 90 ? 'ok' : 'warn',
    },
    {
      label: '剧情绑定',
      value: `${characterBoundCount}/${Math.max(1, project.characters.length)}`,
      note: characterBoundCount > 0 ? '已有角色进入文本' : '角色尚未绑定节点',
      tone: characterBoundCount > 0 ? 'ok' : 'warn',
    },
    {
      label: '可生成角色',
      value: characterReadyCount.toString(),
      note: characterReadyCount > 0 ? '可用于 AI 设定' : '需要补齐识别字段',
      tone: characterReadyCount > 0 ? 'ok' : 'warn',
    },
  ]

  const metrics = [
    {
      label: '作品完成',
      value: `${Math.min(100, storyNodes.length * 17)}%`,
      icon: BarChart3,
    },
    { label: '分支连线', value: connectionCount.toString(), icon: GitBranch },
    {
      label: '状态变量',
      value: project.variables.length.toString(),
      icon: KeyRound,
    },
    { label: '预计时长', value: `${storyNodes.length * 2}m 40s`, icon: Clapperboard },
  ]

  const galleryItems: GalleryItem[] = [
    {
      id: project.id,
      title: project.title,
      category: project.publish.category,
      status: project.publish.status,
      completion: `${Math.min(100, storyNodes.length * 17)}%`,
    },
    {
      id: 'demo-romance-001',
      title: '雨夜重逢的第三个选择',
      category: '恋爱多结局',
      status: 'Template',
      completion: '42%',
    },
    {
      id: 'demo-horror-001',
      title: '电梯停在不存在的十三',
      category: '恐怖逃生',
      status: 'Template',
      completion: '35%',
    },
  ]

  const latestContentSafetyReview = useMemo(
    () =>
      contentSafetyReviews
        .filter((review) => review.projectId === project.id)
        .slice()
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        )[0],
    [contentSafetyReviews, project.id],
  )
  const contentSafetySummary = useMemo(() => {
    const statusLabel =
      latestContentSafetyReview?.status === 'blocked'
        ? '阻断'
        : latestContentSafetyReview?.status === 'needs_review'
          ? '需复核'
          : latestContentSafetyReview?.status === 'passed'
            ? '通过'
            : '未扫'
    return {
      statusLabel,
      isClear: latestContentSafetyReview?.passed === true,
      review: latestContentSafetyReview,
      flags: latestContentSafetyReview?.flags || [],
    }
  }, [latestContentSafetyReview])
  const paidEndingNodeIds = useMemo(
    () =>
      project.publish.monetization === 'Paid Ending'
        ? storyNodes
            .filter((node) => node.kind === 'Ending')
            .filter(
              (node) =>
                getNodePaywallMode(project, node, endingNodeIndexById.get(node.id) || 0) === 'paid',
            )
            .map((node) => node.id)
        : [],
    [endingNodeIndexById, project, storyNodes],
  )
  const unlockedPaidNodeIds = useMemo(
    () =>
      new Set(
        paymentOrders
          .filter((order) => order.status === 'paid')
          .flatMap((order) => order.unlockNodeIds || []),
      ),
    [paymentOrders],
  )
  const paidEndingUnlocked =
    paidEndingNodeIds.length === 0 ||
    paidEndingNodeIds.some((nodeId) => unlockedPaidNodeIds.has(nodeId))
  const availablePaymentMethods = useMemo(() => {
    const providers = paymentProvider?.providers || ['alipay']
    return providers.filter((provider): provider is 'alipay' | 'wechat' =>
      provider === 'alipay' || provider === 'wechat',
    )
  }, [paymentProvider])
  const selectedPaymentMethod = availablePaymentMethods.includes(paymentMethod)
    ? paymentMethod
    : availablePaymentMethods[0] || 'alipay'
  const paymentProviderReady = Boolean(
    paymentProvider?.productionReady && paymentProvider.provider !== 'disabled',
  )
  const pendingCheckoutOrder = useMemo(
    () =>
      pendingPaidChoice
        ? paymentOrders.find(
            (order) =>
              order.status === 'pending' &&
              order.itemId === pendingPaidChoice.targetNodeId,
          )
        : undefined,
    [paymentOrders, pendingPaidChoice],
  )
  const pendingCheckoutUrl =
    typeof pendingCheckoutOrder?.metadata?.checkoutUrl === 'string'
      ? pendingCheckoutOrder.metadata.checkoutUrl
      : ''
  const incomingChannel = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('channel') || params.get('utm_source') || 'direct'
  }, [])
  const channelMetadata = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return {
      channel: params.get('channel') || params.get('utm_source') || 'direct',
      utmSource: params.get('utm_source') || '',
      utmMedium: params.get('utm_medium') || '',
      utmCampaign: params.get('utm_campaign') || '',
    }
  }, [])
  const distributionLinks = useMemo(() => {
    const baseUrl = `${window.location.origin}${window.location.pathname}`
    return distributionChannels.map((channel) => {
      const url = new URL(baseUrl)
      url.searchParams.set('preview', '1')
      if (publishedBuildId) url.searchParams.set('build', publishedBuildId)
      url.searchParams.set('channel', channel.id)
      url.searchParams.set('utm_source', channel.id)
      url.searchParams.set('utm_medium', channel.medium)
      url.searchParams.set('utm_campaign', `${project.id}-${channel.campaign}`)
      const href = url.toString()
      return {
        ...channel,
        href,
        qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(href)}`,
        ready: Boolean(publishedBuildId),
      }
    })
  }, [project.id, publishedBuildId])
  const douyinCopyBlocks = useMemo(() => {
    const paidLine =
      project.publish.monetization === 'Paid Ending'
        ? `结局付费解锁，${project.publish.price} 元看完整反转。`
        : '当前版本免费试玩，适合先跑完播和互动数据。'
    const firstChoice = storyNodes[0]?.choices[0]?.label || '你会怎么选'
    return [
      {
        title: '15 秒钩子',
        body: `她收到医院第七通电话，却发现来电人已经死了。${firstChoice}？点开互动版，自己决定结局。`,
      },
      {
        title: '发布文案',
        body: `互动短剧《${project.title}》内测上线。你不是旁观者，每一次选择都会改变线索和结局。${paidLine}`,
      },
      {
        title: '话题组合',
        body: `#互动短剧 #悬疑短剧 #AI短剧 #多结局 #${project.publish.category.replace(/\s+/g, '')}`,
      },
    ]
  }, [project.publish.category, project.publish.monetization, project.publish.price, project.title, storyNodes])
  const wechatCopyBlocks = useMemo(
    () => [
      {
        title: '视频号标题',
        body: `这部互动短剧的结局，由你来选：《${project.title}》内测版`,
      },
      {
        title: '社群转发',
        body: `我做了一个可玩的互动短剧 Demo：${project.title}。每个选择都会改线索和结局，适合 3 分钟体验，欢迎帮我测一下付费点和剧情节奏。`,
      },
      {
        title: '小程序落地页',
        body: `进入小程序后直接开始试玩，付费结局走微信小程序支付，渠道来源自动回传。`,
      },
    ],
    [project.title],
  )

  const onboardingItems = [
    { label: '完成剧情主线', done: storyNodes.length >= 4 },
    { label: '设置至少 3 个角色', done: project.characters.length >= 3 },
    { label: '配置状态变量', done: project.variables.length >= 3 },
    { label: '连接 5 条以上分支', done: connectionCount >= 5 },
    { label: '设置变现方式', done: project.publish.monetization !== 'Free' },
    { label: '内容安全扫描通过', done: contentSafetySummary.isClear },
    { label: '付费结局可解锁', done: project.publish.monetization === 'Free' || paidEndingUnlocked },
  ]

  const commercialProgress = commercialReadiness
    ? `${commercialReadiness.passed}/${commercialReadiness.total}`
    : '同步中'
  const storageStatusLabel =
    storageHealth === null
      ? '云端检测中'
      : storageHealth.productionReady
        ? 'PostgreSQL 已连接'
        : '等待配置'
  const storageDriverLabel =
    storageHealth === null ? 'postgres' : storageHealth.driver || 'json'
  const storageReadinessLabel =
    storageHealth === null
      ? '云端检测中'
      : storageHealth.productionReady
        ? '云端已连接'
        : '等待云端配置'
  const commercialReadinessLabel =
    commercialReadiness === null
      ? '检测中'
      : commercialReadiness.status === 'pass'
        ? '已通过'
        : '待完成'
  const commercialStatusLabel =
    commercialReadiness === null
      ? '正在同步上线门禁'
      : commercialReadiness.status === 'pass'
        ? '可灰度发布'
        : '商用门禁未通过'
  const launchSignals = [
    {
      label: '数据库',
      value: storageStatusLabel,
      ok: Boolean(storageHealth?.productionReady),
    },
    {
      label: '登录',
      value: formatAuthProviderLabel(authProvider?.provider),
      ok: Boolean(authProvider && authProvider.provider !== 'local-demo'),
    },
    {
      label: '上线检查',
      value: commercialProgress,
      ok: commercialReadiness?.status === 'pass',
    },
  ]
  const prelaunchStripItems = [
    {
      label: '云端',
      value: storageHealth === null ? '检测中' : storageHealth.productionReady ? 'Postgres' : '待配置',
      tone: storageHealth?.productionReady ? 'ok' : storageHealth === null ? 'info' : 'warn',
    },
    {
      label: '登录',
      value: formatAuthProviderLabel(authProvider?.provider),
      tone:
        authProvider && authProvider.provider !== 'local-demo'
          ? 'ok'
          : authProvider === null
            ? 'info'
            : 'warn',
    },
    {
      label: '支付',
      value: formatPaymentMethod(paymentProvider?.provider),
      tone: paymentProviderReady ? 'ok' : paymentProvider === null ? 'info' : 'warn',
    },
    {
      label: '门禁',
      value: commercialProgress,
      tone: commercialReadiness?.status === 'pass' ? 'ok' : commercialReadiness === null ? 'info' : 'warn',
    },
  ]
  const launchPipeline = [
    { label: '创作图谱', value: `${storyNodes.length} 个节点`, ok: storyNodes.length >= 4 },
    { label: '分支测试', value: `${connectionCount} 条连线`, ok: connectionCount >= 5 },
    {
      label: '发布',
      value: publishedBuildId ? `#${publishedBuildId.slice(-6)}` : formatPublishStatus(project.publish.status),
      ok: Boolean(publishedBuildId) || project.publish.status !== 'Draft',
    },
  ]
  const launchHeroStats = [
    { label: '上线进度', value: commercialProgress },
    { label: '协作身份', value: roleLabels[session?.membership.role || 'owner'] || '管理员' },
    { label: '当前市场', value: formatMarket(project.modelRouting.market) },
  ]

  const projectAnalyticsEvents = useMemo(
    () => analyticsEvents.filter((event) => event.projectId === project.id),
    [analyticsEvents, project.id],
  )
  const analyticsSummary = useMemo(() => {
    const sessions = new Set(projectAnalyticsEvents.map((event) => event.sessionId))
    const choices = projectAnalyticsEvents.filter(
      (event) => event.eventName === 'choice_selected',
    )
    const endings = projectAnalyticsEvents.filter(
      (event) => event.eventName === 'ending_reached',
    )
    const nodeViews = projectAnalyticsEvents.filter(
      (event) => event.eventName === 'node_viewed',
    )
    return {
      sessions: sessions.size,
      choices: choices.length,
      endings: endings.length,
      nodeViews: nodeViews.length,
      recent: projectAnalyticsEvents.slice(-5).reverse(),
    }
  }, [projectAnalyticsEvents])
  const channelBreakdown = useMemo(() => {
    const counts = new Map<string, { sessions: Set<string>; events: number; choices: number; endings: number }>()
    for (const event of projectAnalyticsEvents) {
      const rawChannel =
        typeof event.metadata?.channel === 'string'
          ? event.metadata.channel
          : typeof event.metadata?.utmSource === 'string'
            ? event.metadata.utmSource
            : 'direct'
      const row =
        counts.get(rawChannel) ||
        { sessions: new Set<string>(), events: 0, choices: 0, endings: 0 }
      row.sessions.add(event.sessionId)
      row.events += 1
      if (event.eventName === 'choice_selected') row.choices += 1
      if (event.eventName === 'ending_reached') row.endings += 1
      counts.set(rawChannel, row)
    }
    return Array.from(counts.entries())
      .map(([channel, row]) => ({
        channel,
        sessions: row.sessions.size,
        events: row.events,
        choices: row.choices,
        endings: row.endings,
      }))
      .sort((left, right) => right.events - left.events)
      .slice(0, 4)
  }, [projectAnalyticsEvents])
  const operationalPaymentOrders =
    paymentLedgerOrders.length > 0 || publishedBuildId ? paymentLedgerOrders : paymentOrders
  const distributionFunnel = [
    { label: '访问会话', value: analyticsSummary.sessions, note: '渠道链接打开' },
    { label: '节点浏览', value: analyticsSummary.nodeViews, note: '进入互动剧情' },
    { label: '互动选择', value: analyticsSummary.choices, note: '点击分支选项' },
    {
      label: '付费订单',
      value: operationalPaymentOrders.filter((order) => order.status === 'paid').length,
      note: formatPaymentMethod(paymentProvider?.provider),
    },
  ]
  const paidOrders = operationalPaymentOrders.filter((order) => order.status === 'paid')
  const pendingOrders = operationalPaymentOrders.filter((order) => order.status === 'pending')
  const failedOrders = operationalPaymentOrders.filter((order) => order.status === 'failed')
  const refundedOrders = operationalPaymentOrders.filter((order) => order.status === 'refunded')
  const paymentOrderFilterCounts: Record<PaymentOrderFilter, number> = {
    all: operationalPaymentOrders.length,
    paid: paidOrders.length,
    pending: pendingOrders.length,
    failed: failedOrders.length,
    refunded: refundedOrders.length,
  }
  const grossRevenueCents = paidOrders.reduce((total, order) => total + order.amount, 0)
  const orderCurrency = operationalPaymentOrders[0]?.currency || paymentOrders[0]?.currency || 'CNY'
  const payConversionRate =
    analyticsSummary.sessions > 0
      ? Math.round((paidOrders.length / analyticsSummary.sessions) * 100)
      : 0
  const publishPriceCents = parsePublishPriceCents(project.publish.price)
  const activePricePreset =
    monetizationPricePresets.find((preset) => preset.price === project.publish.price) || null
  const baselinePayConversionRate =
    analyticsSummary.sessions > 0 ? payConversionRate : estimatePayConversionRate(publishPriceCents)
  const projectedPaidOrdersPerThousand = Math.round((1000 * baselinePayConversionRate) / 100)
  const projectedRevenuePerThousandCents = projectedPaidOrdersPerThousand * publishPriceCents
  const paidEndingReadyCount =
    project.publish.monetization === 'Paid Ending'
      ? paidEndingNodeIds.filter((nodeId) => unlockedPaidNodeIds.has(nodeId)).length
      : paidEndingNodeIds.length
  const freePreviewNodeCount = Math.max(0, storyReachability.reachableCount - paidEndingNodeIds.length)
  const freeEndingCount = Math.max(0, endingCount - paidEndingNodeIds.length)
  const reachablePaidBranchCount = storyReachability.paidBranchRows.filter((row) => row.reachable).length
  const pricePresetRows = monetizationPricePresets.map((preset) => {
    const presetPriceCents = parsePublishPriceCents(preset.price)
    const conversion = estimatePayConversionRate(presetPriceCents)
    return {
      ...preset,
      active: preset.price === project.publish.price,
      conversion,
      revenue: formatMoneyFromCents(Math.round((1000 * conversion * presetPriceCents) / 100)),
    }
  })
  const monetizationStrategyRows = [
    {
      label: '价格档位',
      value:
        project.publish.monetization === 'Free'
          ? '免费'
          : activePricePreset?.label || '自定义',
      note:
        project.publish.monetization === 'Free'
          ? '适合先跑完播数据'
          : activePricePreset?.benchmark || '确认用户能理解解锁价值',
      tone: project.publish.monetization === 'Free' || publishPriceCents > 0 ? 'ok' : 'warn',
    },
    {
      label: '试看权益',
      value: `${freePreviewNodeCount} 节点`,
      note: freeEndingCount > 0 ? `${freeEndingCount} 个免费结局兜底` : '建议保留免费闭环',
      tone: freePreviewNodeCount >= 3 && freeEndingCount > 0 ? 'ok' : 'warn',
    },
    {
      label: '付费卡点',
      value:
        project.publish.monetization === 'Paid Ending'
          ? `${reachablePaidBranchCount} 条`
          : '未启用',
      note:
        project.publish.monetization === 'Paid Ending'
          ? `${paidEndingNodeIds.length} 个付费结局，可触达分支才有转化价值`
          : '当前不走结局解锁',
      tone:
        project.publish.monetization !== 'Paid Ending' ||
        (paidEndingNodeIds.length > 0 && reachablePaidBranchCount > 0)
          ? 'ok'
          : 'warn',
    },
    {
      label: '千次会话',
      value: formatMoneyFromCents(projectedRevenuePerThousandCents, orderCurrency),
      note:
        baselinePayConversionRate > 0
          ? `按 ${baselinePayConversionRate}% 支付转化预估`
          : '免费模式不测算收入',
      tone: projectedRevenuePerThousandCents > 0 ? 'info' : 'warn',
    },
  ]
  const paidPathLiftPercent =
    freePreviewNodeCount > 0 && paidEndingNodeIds.length > 0
      ? Math.min(68, 18 + paidEndingNodeIds.length * 9 + reachablePaidBranchCount * 11)
      : 0
  const storyCommercialRows = [
    {
      label: '一键付费线',
      value:
        project.publish.monetization === 'Paid Ending' && paidEndingNodeIds.length > 0
          ? `${paidEndingNodeIds.length} 条`
          : '未生成',
      note:
        project.publish.monetization === 'Paid Ending' && paidEndingNodeIds.length > 0
          ? `${reachablePaidBranchCount} 条可触达`
          : '生成免费线 + 隐藏结局',
      tone:
        project.publish.monetization === 'Paid Ending' && reachablePaidBranchCount > 0
          ? 'ok'
          : 'warn',
    },
    {
      label: '节点收益预估',
      value: formatMoneyFromCents(projectedRevenuePerThousandCents, orderCurrency),
      note:
        publishPriceCents > 0
          ? `按 ${baselinePayConversionRate}% 转化和千次会话估算`
          : '设置价格后开始测算',
      tone: projectedRevenuePerThousandCents > 0 ? 'ok' : 'warn',
    },
    {
      label: '路径差异',
      value: paidPathLiftPercent > 0 ? `+${paidPathLiftPercent}%` : '待补',
      note:
        paidPathLiftPercent > 0
          ? '付费线相对免费主线的价值提升'
          : '需要至少一个可达付费结局',
      tone: paidPathLiftPercent > 0 ? 'ok' : 'warn',
    },
  ]
  const pathComparisonRows = [
    {
      id: 'free-path',
      label: '免费主线',
      value: `${storyReachability.mainRoute.length} 节点`,
      note:
        freeEndingCount > 0
          ? `${freeEndingCount} 个免费结局兜底，适合内测留存`
          : '建议保留一个免费结局，降低试用阻力',
      tone: freeEndingCount > 0 ? 'clean' : 'warn',
    },
    {
      id: 'paid-path',
      label: '付费隐藏线',
      value:
        project.publish.monetization === 'Paid Ending'
          ? `${reachablePaidBranchCount} 条可达`
          : '未启用',
      note:
        project.publish.monetization === 'Paid Ending'
          ? `${paidEndingNodeIds.length} 个付费结局，解锁价 CNY ${project.publish.price}，预估 ${formatMoneyFromCents(projectedRevenuePerThousandCents, orderCurrency)}/千次`
          : '点击一键生成付费隐藏线后进入商业验收',
      tone:
        project.publish.monetization === 'Paid Ending' && reachablePaidBranchCount > 0
          ? 'clean'
          : 'warn',
    },
    {
      id: 'risk-path',
      label: '风险定位',
      value: `${storyIssueRows.length} 项`,
      note:
        firstStoryIssue
          ? `${firstStoryIssue.nodeId}：${firstStoryIssue.issues[0]?.label}`
          : '主线、分支和付费卡点可试玩',
      tone: firstStoryIssue ? firstStoryIssue.status : 'clean',
    },
  ]
  const paymentStatusRows = [
    {
      status: 'paid' as PaymentOrderFilter,
      label: '已支付',
      value: `${paidOrders.length}`,
      note: paidOrders.length > 0 ? '权益已回写' : '等待首单验证',
      tone: paidOrders.length > 0 ? 'ready' : 'waiting',
    },
    {
      status: 'pending' as PaymentOrderFilter,
      label: '待支付',
      value: `${pendingOrders.length}`,
      note: pendingOrders.length > 0 ? '展示继续支付入口' : '无待处理订单',
      tone: pendingOrders.length > 0 ? 'waiting' : 'ready',
    },
    {
      status: 'failed' as PaymentOrderFilter,
      label: '失败',
      value: `${failedOrders.length}`,
      note: failedOrders.length > 0 ? '复核商户回调' : '无失败订单',
      tone: failedOrders.length > 0 ? 'blocked' : 'ready',
    },
  ]
  const publishRevenueCards = [
    {
      label: '实收收入',
      value: formatMoneyFromCents(grossRevenueCents, orderCurrency),
      note: paidOrders.length > 0 ? `${paidOrders.length} 笔已支付` : '等待首笔付费解锁',
      tone: paidOrders.length > 0 ? 'ok' : 'warn',
    },
    {
      label: '订单池',
      value: `${paidOrders.length}/${operationalPaymentOrders.length}`,
      note:
        pendingOrders.length > 0
          ? `${pendingOrders.length} 笔待支付`
          : failedOrders.length > 0
            ? `${failedOrders.length} 笔失败需复核`
            : '暂无待处理订单',
      tone: paidOrders.length > 0 || pendingOrders.length === 0 ? 'ok' : 'warn',
    },
    {
      label: '付费结局',
      value:
        project.publish.monetization === 'Paid Ending'
          ? `${paidEndingReadyCount}/${Math.max(1, paidEndingNodeIds.length)}`
          : '未启用',
      note:
        project.publish.monetization === 'Paid Ending'
          ? '播放器可校验解锁节点'
          : '当前不走结局付费',
      tone:
        project.publish.monetization !== 'Paid Ending' || paidEndingReadyCount > 0
          ? 'ok'
          : 'warn',
    },
    {
      label: '付费转化',
      value: `${payConversionRate}%`,
      note:
        analyticsSummary.sessions > 0
          ? `${analyticsSummary.sessions} 会话样本`
          : '发布后开始累计',
      tone: payConversionRate > 0 ? 'ok' : 'info',
    },
  ]
  const publishReadinessCards = [
    {
      label: '发布包',
      value: publishedBuildId ? `#${publishedBuildId.slice(-6)}` : '未生成',
      note: buildState,
      tone: publishedBuildId ? 'ok' : 'warn',
    },
    {
      label: '内容安全',
      value: contentSafetySummary.statusLabel,
      note: contentSafetySummary.isClear ? '发布门禁已通过' : '发布前自动复核',
      tone: contentSafetySummary.isClear ? 'ok' : 'warn',
    },
    {
      label: '支付通道',
      value: formatPaymentMethod(paymentProvider?.provider),
      note: paymentProviderReady ? '正式收款可用' : '当前适合内测演示',
      tone: paymentProviderReady ? 'ok' : 'warn',
    },
    {
      label: '渠道任务',
      value: distributionJobs.length.toString(),
      note: distributionJobs.length > 0 ? distributionJobState : '等待创建分发任务',
      tone: distributionJobs.length > 0 ? 'ok' : 'warn',
    },
  ]
  const paymentOpsRows = [
    {
      label: '微信支付提示',
      value: paymentProvider?.activeProvider === 'wechat' ? '当前收款通道' : '备选通道',
      note:
        paymentProvider?.activeProvider === 'wechat'
          ? '收银台打开后提示用户扫码支付，支付完成后刷新订单'
          : '开启微信后可用于国内内测首单',
      tone: paymentProvider?.providers?.includes('wechat') ? 'ready' : 'waiting',
    },
    {
      label: '支付失败重试',
      value: failedOrders.length > 0 ? `${failedOrders.length} 笔` : '无失败',
      note:
        failedOrders.length > 0
          ? '保留继续支付和刷新订单入口，运营可追踪失败原因'
          : '失败状态会进入订单明细和异常提示',
      tone: failedOrders.length > 0 ? 'blocked' : 'ready',
    },
    {
      label: '支付宝协议',
      value:
        paymentProvider?.activeProvider === 'wechat' && paymentProvider?.alipay?.configured
          ? '暂不展示'
          : paymentProvider?.providers?.includes('alipay')
            ? '可用'
            : '未启用',
      note:
        paymentProvider?.activeProvider === 'wechat' && paymentProvider?.alipay?.configured
          ? '合作协议到期时隐藏支付宝，避免用户进入失效收银台'
          : '恢复前需重跑真实小额验收',
      tone:
        paymentProvider?.activeProvider === 'wechat' && paymentProvider?.alipay?.configured
          ? 'waiting'
          : 'ready',
    },
    {
      label: '未支付权益',
      value: pendingOrders.length > 0 ? `${pendingOrders.length} 笔待回调` : '不解锁',
      note: '订单 pending 时播放器不会放行付费结局，只展示继续支付和刷新',
      tone: pendingOrders.length > 0 ? 'waiting' : 'ready',
    },
  ]
  const publishRiskRows = [
    {
      label: '发布前风险',
      value: contentSafetySummary.isClear ? '内容通过' : contentSafetySummary.statusLabel,
      note: contentSafetySummary.isClear ? '可进入灰度发布' : '生成发布包前会自动安全扫描',
      tone: contentSafetySummary.isClear ? 'ready' : 'waiting',
    },
    {
      label: '价格风险',
      value:
        project.publish.monetization === 'Free'
          ? '免费'
          : publishPriceCents > 0
            ? `CNY ${project.publish.price}`
            : '未定价',
      note:
        project.publish.monetization === 'Free'
          ? '不触发真实支付'
          : publishPriceCents > 0
            ? '低于 0.01 元会被后端拒绝'
            : '付费作品必须设置正向价格',
      tone:
        project.publish.monetization === 'Free' || publishPriceCents > 0 ? 'ready' : 'blocked',
    },
    {
      label: '付费路径风险',
      value:
        project.publish.monetization === 'Paid Ending'
          ? `${reachablePaidBranchCount} 条`
          : '未启用',
      note:
        project.publish.monetization === 'Paid Ending'
          ? `${paidEndingNodeIds.length} 个付费结局必须从玩家选择可触达`
          : '免费模式可先验证留存',
      tone:
        project.publish.monetization !== 'Paid Ending' || reachablePaidBranchCount > 0
          ? 'ready'
          : 'blocked',
    },
  ]
  const publishGateRows = [
    {
      step: '01',
      label: '安全扫描',
      state: contentSafetySummary.isClear ? 'ready' : 'waiting',
      detail: contentSafetySummary.isClear
        ? '内容安全已通过'
        : `${contentSafetySummary.statusLabel}，发布前需要复核`,
    },
    {
      step: '02',
      label: '生成发布包',
      state: publishedBuildId ? 'ready' : buildState === '正在生成发布' ? 'running' : 'waiting',
      detail: publishedBuildId ? `发布包 ${formatShortId(publishedBuildId)}` : buildState,
    },
    {
      step: '03',
      label: '验证收款',
      state:
        project.publish.monetization === 'Free' || paidEndingUnlocked
          ? 'ready'
          : paymentProviderReady
            ? 'waiting'
            : 'blocked',
      detail:
        project.publish.monetization === 'Free'
          ? '免费体验无需支付'
          : paymentProviderReady
            ? `${formatPaymentMethod(paymentProvider?.provider)} 可创建订单`
            : '支付通道未就绪',
    },
    {
      step: '04',
      label: '渠道分发',
      state: distributionJobs.length > 0 ? 'ready' : publishedBuildId ? 'waiting' : 'blocked',
      detail:
        distributionJobs.length > 0
          ? `${distributionJobs.length} 个任务已创建`
          : publishedBuildId
            ? '可创建平台任务'
            : '先生成发布包',
    },
  ]
  const launchBlockerRows = (commercialReadiness?.missing || []).slice(0, 5)
  const paidEndingRows =
    project.publish.monetization === 'Paid Ending'
      ? paidEndingNodeIds.map((nodeId) => {
          const node = storyNodes.find((item) => item.id === nodeId)
          const matchingOrders = operationalPaymentOrders.filter((order) =>
            (order.unlockNodeIds || []).includes(nodeId),
          )
          const paidCount = matchingOrders.filter((order) => order.status === 'paid').length
          return {
            id: nodeId,
            title: node?.title || '未命名结局',
            metric: node?.metric || '结局节点',
            paidCount,
            state: paidCount > 0 ? 'ready' : paymentProviderReady ? 'waiting' : 'blocked',
          }
        })
      : []
  const visiblePaymentOrders =
    (paymentOrderFilter === 'all'
      ? operationalPaymentOrders
      : operationalPaymentOrders.filter((order) => order.status === paymentOrderFilter)
    ).filter((order) => {
      const query = paymentOrderSearch.trim().toLowerCase()
      if (!query) return true
      const haystack = [
        order.id,
        order.provider,
        order.status,
        order.sessionId,
        order.itemId || '',
        ...(order.unlockNodeIds || []),
        typeof order.metadata?.providerOrderId === 'string' ? order.metadata.providerOrderId : '',
        typeof order.metadata?.wechatTransactionId === 'string' ? order.metadata.wechatTransactionId : '',
        typeof order.metadata?.opsNote === 'string' ? order.metadata.opsNote : '',
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  const paymentOrderRows = visiblePaymentOrders
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 10)
    .map((order) => {
      const unlockLabel =
        order.unlockNodeIds.length > 0
          ? order.unlockNodeIds
              .map((nodeId) => {
                const node = storyNodes.find((item) => item.id === nodeId)
                return node ? `${node.id} ${node.title}` : nodeId
              })
              .join(' / ')
          : order.itemId || '未绑定解锁项'
      const mode =
        order.metadata?.checkoutMode === 'instant-paid'
          ? '内测即时确认'
          : order.metadata?.checkoutMode === 'provider-pending'
            ? '等待支付回调'
            : order.metadata?.sandbox
              ? '内测订单'
              : '平台订单'
      const wechatTransactionId =
        typeof order.metadata?.wechatTransactionId === 'string'
          ? order.metadata.wechatTransactionId
          : ''
      const providerOrderId =
        typeof order.metadata?.providerOrderId === 'string'
          ? order.metadata.providerOrderId
          : ''
      const providerTrace =
        wechatTransactionId
          ? `微信单 ${wechatTransactionId.slice(-8)}`
          : providerOrderId
            ? `商户单 ${providerOrderId.slice(-8)}`
            : formatShortId(order.id)
      const callbackLabel = order.paidAt
        ? `回调 ${formatLeadTime(order.paidAt)}`
        : `创建 ${formatLeadTime(order.createdAt)}`
      const opsNote =
        typeof order.metadata?.opsNote === 'string' && order.metadata.opsNote.trim()
          ? order.metadata.opsNote.trim()
          : ''

      return {
        ...order,
        shortId: formatShortId(order.id),
        providerLabel: formatPaymentMethod(order.provider),
        statusLabel: formatPaymentOrderStatus(order.status),
        amountLabel: formatMoneyFromCents(order.amount, order.currency),
        unlockLabel,
        mode,
        callbackLabel,
        providerTrace,
        resolution: formatPaymentOrderResolution(order),
        createdLabel: formatLeadTime(order.createdAt),
        opsNote,
      }
    })
  const monetizationRows = [
    {
      label: '收费方式',
      value: formatMonetization(project.publish.monetization),
      note:
        project.publish.monetization === 'Free'
          ? '适合先跑数据'
          : `${paidEndingNodeIds.length || endingCount} 个结局可设置付费`,
    },
    {
      label: '价格',
      value: `CNY ${project.publish.price}`,
      note: project.publish.price ? '前端播放器会展示解锁价' : '需要补价格',
    },
    {
      label: '订单',
      value: `${operationalPaymentOrders.length} 笔`,
      note: `${operationalPaymentOrders.filter((order) => order.status === 'paid').length} 笔已支付`,
    },
    {
      label: '可见范围',
      value: formatVisibility(project.publish.visibility),
      note: formatPublishStatus(project.publish.status),
    },
  ]
  const launchGuardSignals = launchGuard?.signals || [
    {
      id: 'pending',
      label: '上线守护',
      status: 'warning' as LaunchGuardStatus,
      value: '待同步',
      detail: launchGuardState,
      action: '刷新守护状态',
    },
  ]
  const launchGuardIncidents = launchGuard?.incidents || []
  const launchGuardSummaryCards = [
    {
      label: '守护状态',
      value:
        launchGuard?.status === 'ready'
          ? '正常'
          : launchGuard?.status === 'blocked'
            ? '阻断'
            : '待处理',
      note: launchGuardState,
      tone: launchGuard?.status || 'warning',
    },
    {
      label: '真实回调',
      value: `${launchGuard?.summary.paidByCallbackCount || 0}`,
      note: '微信/支付宝异步回调入库',
      tone: (launchGuard?.summary.paidByCallbackCount || 0) > 0 ? 'ready' : 'warning',
    },
    {
      label: '超时待支付',
      value: `${launchGuard?.summary.stalePendingOrderCount || 0}`,
      note: '超过 15 分钟未完成',
      tone: (launchGuard?.summary.stalePendingOrderCount || 0) > 0 ? 'warning' : 'ready',
    },
    {
      label: 'AI 异常',
      value: `${(launchGuard?.summary.aiFailureCount || 0) + (launchGuard?.summary.staleAiJobCount || 0)}`,
      note: '24 小时失败或长时间运行',
      tone:
        (launchGuard?.summary.aiFailureCount || 0) + (launchGuard?.summary.staleAiJobCount || 0) > 0
          ? 'warning'
          : 'ready',
    },
  ]
  const distributionMissionRows = distributionLinks.slice(0, 4).map((channel) => {
    const jobs = distributionJobs.filter((job) => job.channel === channel.id)
    const latestJob = jobs[0]
    return {
      id: channel.id,
      label: channel.label,
      state: latestJob ? latestJob.status : channel.ready ? 'ready' : 'waiting',
      detail: latestJob
        ? formatDistributionJobStatus(latestJob.status)
        : channel.ready
          ? '链接可投放'
          : '等待发布包',
    }
  })
  const analyticsDetail = (() => {
    const nodeViews = new Map<string, number>()
    const nodeChoices = new Map<string, number>()
    const choiceCounts = new Map<string, number>()

    for (const event of projectAnalyticsEvents) {
      if (event.eventName === 'node_viewed' && event.nodeId) {
        nodeViews.set(event.nodeId, (nodeViews.get(event.nodeId) || 0) + 1)
      }
      if (event.eventName === 'choice_selected') {
        if (event.nodeId) {
          nodeChoices.set(event.nodeId, (nodeChoices.get(event.nodeId) || 0) + 1)
        }
        if (event.choiceId) {
          choiceCounts.set(event.choiceId, (choiceCounts.get(event.choiceId) || 0) + 1)
        }
      }
    }

    const nodeRows = storyNodes
      .map((node) => ({
        id: node.id,
        title: node.title,
        views: nodeViews.get(node.id) || 0,
        choices: nodeChoices.get(node.id) || 0,
      }))
      .filter((row) => row.views > 0 || row.choices > 0)
      .sort((left, right) => right.views + right.choices - (left.views + left.choices))
      .slice(0, 4)

    const choiceRows = selectedNode.choices
      .map((choiceItem) => ({
        id: choiceItem.id,
        label: choiceItem.label,
        count: choiceCounts.get(choiceItem.id) || 0,
      }))
      .sort((left, right) => right.count - left.count)

    return { nodeRows, choiceRows }
  })()

  const projectAiUsageEvents = useMemo(
    () => aiUsageEvents.filter((event) => event.projectId === project.id),
    [aiUsageEvents, project.id],
  )
  const aiUsageSummary = useMemo(() => {
    const totalCost = projectAiUsageEvents.reduce(
      (sum, event) => sum + Number(event.estimatedCost || 0),
      0,
    )
    const totalTokens = projectAiUsageEvents.reduce(
      (sum, event) => sum + Number(event.totalTokens || 0),
      0,
    )
    const latest = projectAiUsageEvents.slice(-5).reverse()
    const currency = latest[0]?.currency || 'USD'
    return {
      calls: projectAiUsageEvents.length,
      totalTokens,
      totalCost,
      currency,
      latest,
    }
  }, [projectAiUsageEvents])
  const generationUsageEvents = useMemo(
    () =>
      aiUsageEvents.filter(
        (event) =>
          event.workspaceId === activeWorkspaceId &&
          ['generate-project', 'expand-branch'].includes(event.task),
      ),
    [activeWorkspaceId, aiUsageEvents],
  )
  const generationCreditTotal = 20
  const generationCreditsUsed = Math.min(generationCreditTotal, generationUsageEvents.length)
  const generationCreditsRemaining = Math.max(0, generationCreditTotal - generationCreditsUsed)
  const aiModelLabel =
    aiProvider?.model ||
    aiProvider?.providers.find((provider) => provider.id === aiProvider.provider)?.defaultModel ||
    project.modelRouting.defaultProvider
  const aiDirectorCards = [
    {
      label: '模型状态',
      value: aiProvider?.provider || '检测中',
      note: aiProvider?.productionReady
        ? `${aiModelLabel} 可用于商用生成`
        : aiProvider
          ? '模型配置待补齐'
          : '正在同步模型状态',
      tone: aiProvider?.productionReady ? 'ok' : aiProvider === null ? 'info' : 'warn',
    },
    {
      label: '创作上下文',
      value: `${storyNodes.length} 节点`,
      note: `${characterReadyCount} 个角色可用于 AI 设定`,
      tone: storyNodes.length >= 4 && characterReadyCount > 0 ? 'ok' : 'warn',
    },
    {
      label: '成本账本',
      value: `${aiUsageSummary.calls} 次`,
      note: `${aiUsageSummary.totalTokens} tokens · ${aiUsageSummary.currency} ${aiUsageSummary.totalCost.toFixed(6)}`,
      tone: aiUsageSummary.calls > 0 ? 'ok' : 'info',
    },
    {
      label: '安全门禁',
      value: contentSafetySummary.statusLabel,
      note: contentSafetySummary.isClear
        ? '内容安全已通过'
        : `${contentSafetySummary.flags.length} 条待处理提示`,
      tone: contentSafetySummary.isClear ? 'ok' : 'warn',
    },
  ]
  const aiWorkflowRows = [
    {
      step: '01',
      title: '读取剧情上下文',
      status: storyNodes.length >= 4 ? 'ready' : 'waiting',
      detail: `${storyNodes.length} 个节点，${connectionCount} 条分支，${project.variables.length} 个变量`,
    },
    {
      step: '02',
      title: '锁定角色一致性',
      status: characterReadyCount > 0 ? 'ready' : 'waiting',
      detail: `${characterReadyCount}/${Math.max(1, project.characters.length)} 个角色档案可用于生成`,
    },
    {
      step: '03',
      title: '选择商用模型',
      status: aiProvider?.productionReady ? 'ready' : 'waiting',
      detail: `${aiProvider?.provider || '待检测'} · ${aiModelLabel}`,
    },
    {
      step: '04',
      title: '生成下一幕',
      status: isAiBusy ? 'running' : aiUsageSummary.calls > 0 ? 'ready' : 'waiting',
      detail: aiState,
    },
    {
      step: '05',
      title: '安全复核',
      status: contentSafetySummary.isClear ? 'ready' : 'waiting',
      detail: contentSafetyState,
    },
  ]
  const aiProviderRows = (aiProvider?.providers || []).slice(0, 4)
  const seriesGeneratorCards = [
    {
      label: '内测额度',
      value: `${generationCreditsRemaining}/${generationCreditTotal}`,
      note: `${generationCreditsUsed} 次生成已记录`,
    },
    {
      label: '生成范围',
      value: '生产包',
      note: `${seriesGenerator.duration} · ${seriesGenerator.interactionDensity}`,
    },
    {
      label: '大厂对标',
      value: '分镜 + 视频',
      note: '角色一致性、镜头 prompt、导出包',
    },
    {
      label: '变现结构',
      value: seriesGenerator.monetization === 'Free' ? '免费' : seriesGenerator.monetization,
      note:
        seriesGenerator.monetization === 'Paid Ending'
          ? '免费线 + 付费隐藏线'
          : seriesGenerator.monetization === 'Paid Chapter'
            ? '章节分段付费'
            : '完整免费闭环',
    },
    {
      label: '投放场景',
      value: seriesGenerator.platform,
      note: seriesGenerator.audience,
    },
  ]
  const seriesProductionFlowRows = [
    {
      step: '01',
      title: 'Brief',
      detail: seriesGenerator.idea.trim()
        ? truncateProductionText(seriesGenerator.idea, '题材已锁定', 38)
        : '题材、受众、平台',
      status: seriesGenerator.idea.trim() ? 'ready' : 'waiting',
    },
    {
      step: '02',
      title: '剧本编写',
      detail: visibleGeneratedReview
        ? `${visibleGeneratedReview.nodeCount} 节点 · ${endingCount} 结局`
        : '集纲、冲突、结局',
      status: visibleGeneratedReview || storyNodes.length >= 4 ? 'ready' : 'waiting',
    },
    {
      step: '03',
      title: '视频脚本',
      detail: visibleGeneratedReview
        ? `${visibleGeneratedReview.shotCount} 镜 · ${visibleGeneratedReview.videoQueueCount} 队列`
        : '镜头、字幕、Prompt',
      status: visibleGeneratedReview ? 'ready' : 'waiting',
    },
    {
      step: '04',
      title: '生成视频',
      detail:
        videoJobSummary.total > 0
          ? `${videoJobSummary.succeeded} 完成 · ${videoJobSummary.running} 运行`
          : videoProvider?.productionReady
            ? `${videoProviderLabel} 已接入`
            : '等待视频服务',
      status: videoJobSummary.running > 0 ? 'running' : visibleGeneratedReview ? 'ready' : 'waiting',
    },
    {
      step: '05',
      title: '审片交付',
      detail: latestFinalVideoRender
        ? formatFinalVideoRenderStatus(latestFinalVideoRender.status)
        : visibleGeneratedReview
          ? `${visibleGeneratedReview.exportCount}/${visibleGeneratedReview.exportItems.length} 项就绪`
          : '待生成生产包',
      status: latestFinalVideoRender?.status === 'succeeded' ? 'ready' : visibleGeneratedReview ? 'running' : 'waiting',
    },
  ]
  const seriesPrimaryAction = !seriesGenerator.idea.trim()
    ? {
        label: '先填题材钩子',
        note: 'Brief 是剧本和视频脚本的共同输入',
        action: 'none',
        disabled: true,
      }
    : !visibleGeneratedReview
      ? {
          label: '生成剧本和视频脚本',
          note: '一次产出集纲、角色、镜头脚本和视频队列',
          action: 'generate',
          disabled: isSeriesGenerating || isAiBusy,
        }
      : videoPipelineCompletedCount === 0
        ? {
            label: isLiveVideoProvider ? '生成第一条视频' : '提交视频脚本队列',
            note: isLiveVideoProvider
              ? `${videoProviderLabel} 真实生成，每次最多 ${videoSubmitLimit} 条`
              : '先生成可交付 Prompt 队列',
            action: 'video',
            disabled: isSeriesGenerating,
          }
        : !latestFinalVideoRender
          ? {
              label: '合成审片版',
              note: '把已完成素材包装成竖屏 MP4',
              action: 'render',
              disabled: !finalVideoRenderCanStart,
            }
          : {
              label: '导出交付包',
              note: '剧本、视频脚本、素材和审片清单',
              action: 'export',
              disabled: false,
            }
  const seriesScriptRows = storyNodes.slice(0, 6).map((node, index) => {
    const diagnostic = storyDiagnosticByNodeId.get(node.id)
    return {
      id: `EP-${String(index + 1).padStart(2, '0')}`,
      title: node.title,
      detail: truncateProductionText(node.summary, '剧情摘要待补齐', 76),
      meta: `${node.kind} · ${node.choices.length} 选择 · ${diagnostic?.readiness ?? 100}%`,
      status: diagnostic?.status === 'critical' ? 'waiting' : 'ready',
    }
  })
  const seriesScriptQualityCards = [
    {
      label: '剧本结构',
      value: visibleGeneratedReview ? `${visibleGeneratedReview.nodeCount} 节点` : `${storyNodes.length} 草稿`,
      note: endingCount > 0 ? `${endingCount} 个结局已收束` : '先补结局收束',
      status: storyNodes.length >= 4 && endingCount > 0 ? 'ready' : 'waiting',
    },
    {
      label: '前三秒',
      value: seriesScriptRows[0]?.title ? '已写' : '待写',
      note: truncateProductionText(seriesScriptRows[0]?.detail || '', '开场需要明确钩子', 36),
      status: seriesScriptRows[0]?.title ? 'ready' : 'waiting',
    },
    {
      label: '选择冲突',
      value: `${connectionCount} 条`,
      note: connectionCount >= 5 ? '选择密度可试用' : '继续补关键选择',
      status: connectionCount >= 5 ? 'ready' : 'waiting',
    },
    {
      label: '商业卡点',
      value: paidEndingNodeIds.length > 0 ? `${paidEndingNodeIds.length} 条` : '待补',
      note: paidEndingNodeIds.length > 0 ? '已具备付费结局' : '建议加隐藏线',
      status: paidEndingNodeIds.length > 0 ? 'ready' : 'waiting',
    },
  ]
  const seriesShotRows = visibleGeneratedReview
    ? visibleGeneratedReview.storyboardShots.slice(0, 6).map((shot) => ({
        id: shot.id,
        title: shot.beat,
        detail: shot.scene,
        meta: `${shot.camera} · ${shot.motion} · ${shot.duration}`,
        status: shot.status === 'needs-reference' ? 'waiting' : 'ready',
      }))
    : storyNodes.slice(0, 6).map((node, index) => ({
        id: `SHOT-${String(index + 1).padStart(2, '0')}A`,
        title: `${node.kind} · ${node.title}`,
        detail: truncateProductionText(node.summary, `${seriesGenerator.genre}关键场面`, 76),
        meta: '待生成分镜参数',
        status: 'waiting',
      }))
  const seriesVideoScriptQualityCards = [
    {
      label: '镜头脚本',
      value: visibleGeneratedReview ? `${visibleGeneratedReview.shotCount} 镜` : '待拆',
      note: '场景、景别、运动、时长',
      status: visibleGeneratedReview ? 'ready' : 'waiting',
    },
    {
      label: '字幕文案',
      value: visibleGeneratedReview
        ? `${visibleGeneratedReview.storyboardShots.filter((shot) => shot.dialogue || shot.beat).length} 段`
        : '待写',
      note: '用于平台预览烧录',
      status: visibleGeneratedReview ? 'ready' : 'waiting',
    },
    {
      label: '视频 Prompt',
      value: visibleGeneratedReview ? `${visibleGeneratedReview.videoQueueCount} 条` : '待生成',
      note: '已避开可读 UI 字和乱码字幕',
      status: visibleGeneratedReview ? 'ready' : 'waiting',
    },
    {
      label: '角色参考',
      value: visibleGeneratedReview ? `${visibleGeneratedReview.characterCount} 人` : `${project.characters.length} 人`,
      note: visibleGeneratedReview && visibleGeneratedReview.characterCount >= 3 ? '可控一致性' : '继续补参考',
      status: visibleGeneratedReview && visibleGeneratedReview.characterCount >= 3 ? 'ready' : 'waiting',
    },
  ]
  const seriesDeliverableRows = visibleGeneratedReview
    ? visibleGeneratedReview.exportItems
    : [
        {
          label: '剧情结构',
          value: `${storyNodes.length} 节点`,
          status: storyNodes.length >= 4 ? 'ready' : 'waiting',
        },
        {
          label: '角色设定',
          value: `${project.characters.length} 人`,
          status: project.characters.length >= 3 ? 'ready' : 'waiting',
        },
        {
          label: '导演分镜',
          value: '待生成',
          status: 'waiting',
        },
        {
          label: '视频 Prompt',
          value: videoProvider?.productionReady ? videoProviderLabel : '待配置',
          status: videoProvider?.productionReady ? 'ready' : 'waiting',
        },
        {
          label: '互动升级',
          value: formatMonetization(project.publish.monetization),
          status: project.nodes.length >= 4 ? 'ready' : 'waiting',
        },
      ]
  const seriesRefinementRows = [
    {
      label: '生成后细修',
      value: visibleGeneratedReview ? '可编辑' : '待生成',
      note: visibleGeneratedReview
        ? '节点、角色、变量已落入工作台，可逐幕修改'
        : '生成后自动进入 AI 导演页',
      status: visibleGeneratedReview ? 'ready' : 'waiting',
    },
    {
      label: '生产导出',
      value: visibleGeneratedReview ? `${visibleGeneratedReview.exportCount} 项` : 'Markdown',
      note: visibleGeneratedReview ? '剧本、分镜、角色参考和视频 prompt 可交付' : '先产出客户可看的生产包',
      status: visibleGeneratedReview ? 'ready' : 'waiting',
    },
    {
      label: '互动升级',
      value:
        project.publish.monetization === 'Paid Ending'
          ? `${paidEndingNodeIds.length} 付费结局`
          : '可升级',
      note: '普通短剧不是终点，可一键转入互动商业制作台',
      status: project.nodes.length >= 4 ? 'ready' : 'waiting',
    },
    {
      label: '视频回填',
      value:
        videoJobSummary.succeeded > 0
          ? `${videoJobSummary.succeeded} 条完成`
          : videoJobSummary.total > 0
            ? `${videoJobSummary.total} 个任务`
            : '队列待提交',
      note: isLiveVideoProvider ? `${videoProviderLabel} 真实生成` : '当前先交付 Prompt 和任务队列',
      status: videoJobSummary.failed > 0 ? 'waiting' : visibleGeneratedReview ? 'ready' : 'waiting',
    },
  ]
  const seriesEngineStatus = visibleGeneratedReview
    ? '生产包已生成'
    : isSeriesGenerating
      ? '后台生成中'
      : seriesGenerationJob?.status === 'failed'
        ? '生成失败'
        : seriesGenerator.idea.trim()
          ? '结构预览'
          : '等待 brief'
  const seriesEngineStatusClass = visibleGeneratedReview
    ? 'ready'
    : isSeriesGenerating
      ? 'running'
      : seriesGenerationJob?.status === 'failed'
        ? 'failed'
        : 'waiting'
  const ordinaryStoryBlueprints = [
    {
      id: 'suspense-hook',
      label: '悬疑强钩子版',
      title: `${seriesGenerator.genre} · 三秒反转开场`,
      idea: `围绕「${seriesGenerator.idea.trim() || project.title}」写一个前三秒出现异常信号的短剧：主角以为自己在处理普通事件，但每一次选择都会暴露更大的秘密。`,
      genre: seriesGenerator.genre || '悬疑反转',
      monetization: 'Paid Ending',
      constraints:
        '前三秒必须有视觉异常或一句强悬念台词；每集结尾留一个未解释的信息差；最后保留一个付费隐藏真相。',
      proof: '适合先做爆款钩子和免费试看片',
    },
    {
      id: 'emotion-conversion',
      label: '情绪爽点版',
      title: `${seriesGenerator.audience || '短剧用户'} · 情绪递进`,
      idea: `把「${seriesGenerator.idea.trim() || project.title}」改成情绪驱动短剧：主角被误解、压迫或背叛，随后通过选择一步步反击并拿回主动权。`,
      genre: seriesGenerator.genre || '都市情感',
      monetization: seriesGenerator.monetization,
      constraints:
        '每一幕都要有明确情绪变化：委屈、反击、误会、反转、释放；台词要口语化，适合竖屏连续观看。',
      proof: '适合公众号/短视频引流后的普通短剧生产',
    },
    {
      id: 'commercial-upgrade',
      label: '商业升级版',
      title: '普通短剧转互动付费',
      idea: `基于「${seriesGenerator.idea.trim() || project.title}」先生成普通短剧生产包，再在关键转折点拆出 2 条互动选择和 1 条付费隐藏线。`,
      genre: seriesGenerator.genre || '悬疑反转',
      monetization: 'Paid Ending',
      constraints:
        '普通短剧正文必须能独立成立，同时在第 2 幕和第 4 幕预留可互动选择；付费结局要揭示主线无法直接看到的真相。',
      proof: '适合 PlayDrama 从生产工具升级到收款闭环',
    },
  ] as const
  const ordinaryStudioCapabilityCards = [
    {
      label: '故事设定多方案',
      value: `${ordinaryStoryBlueprints.length} 组`,
      note: '一键套用不同题材方向，再生成完整生产包。',
      status: seriesGenerator.idea.trim() ? 'ready' : 'waiting',
    },
    {
      label: 'AI 剧本评估',
      value: visibleGeneratedReview ? '已评估' : '预评估',
      note: '结构、钩子、冲突、商业卡点前置可见。',
      status: storyNodes.length >= 4 ? 'ready' : 'waiting',
    },
    {
      label: '分集和正文',
      value: visibleGeneratedReview ? `${seriesScriptRows.length} 段` : `${storyNodes.length} 草稿`,
      note: '从梗概进入分集大纲、对白正文和镜头脚本。',
      status: visibleGeneratedReview || storyNodes.length >= 4 ? 'ready' : 'waiting',
    },
    {
      label: '视频生产包',
      value: visibleGeneratedReview ? `${visibleGeneratedReview.shotCount} 镜` : '待生成',
      note: '字幕、Prompt、角色参考和视频队列可导出。',
      status: visibleGeneratedReview ? 'ready' : 'waiting',
    },
  ]
  const ordinaryCreationStages = [
    {
      index: '01',
      label: '灵感策划',
      detail: '一句话卖点、受众和情绪钩子',
      state: seriesGenerator.idea.trim() ? 'ready' : 'active',
      icon: Sparkles,
    },
    {
      index: '02',
      label: '故事梗概',
      detail: `${storyNodes.length} 个剧情节点可展开`,
      state: storyNodes.length >= 4 ? 'ready' : 'waiting',
      icon: FileText,
    },
    {
      index: '03',
      label: '人物小传',
      detail: `${project.characters.length} 个角色资产`,
      state: project.characters.length >= 2 ? 'ready' : 'waiting',
      icon: Users,
    },
    {
      index: '04',
      label: '分集大纲',
      detail: `${seriesScriptRows.length || storyNodes.length} 段结构`,
      state: visibleGeneratedReview ? 'ready' : 'waiting',
      icon: Layers3,
    },
    {
      index: '05',
      label: '剧本正文',
      detail: visibleGeneratedReview ? '对白、字幕和镜头提示' : '生成后可细修',
      state: visibleGeneratedReview ? 'ready' : 'waiting',
      icon: Clipboard,
    },
    {
      index: '06',
      label: '视频脚本',
      detail: visibleGeneratedReview ? `${visibleGeneratedReview.shotCount} 条镜头 Prompt` : '等待生产包',
      state: visibleGeneratedReview ? 'ready' : 'waiting',
      icon: Clapperboard,
    },
    {
      index: '07',
      label: '导出交付',
      detail: visibleGeneratedReview ? `${visibleGeneratedReview.exportCount} 项物料` : '可升级互动付费',
      state: visibleGeneratedReview ? 'ready' : 'waiting',
      icon: Rocket,
    },
  ]
  const ordinaryScriptEvaluationRows = [
    {
      label: '结构完整度',
      value: Math.min(96, 42 + storyNodes.length * 7 + (endingCount > 0 ? 12 : 0)),
      note: endingCount > 0 ? `${endingCount} 个结局已收束` : '还需要明确结尾承诺',
    },
    {
      label: '前三秒钩子',
      value: seriesGenerator.idea.trim() ? 78 : 46,
      note: seriesGenerator.idea.trim() ? truncateProductionText(seriesGenerator.idea, '钩子已填写', 34) : '先填写一句话 brief',
    },
    {
      label: '情绪和冲突',
      value: Math.min(92, 50 + connectionCount * 4),
      note: connectionCount >= 5 ? `${connectionCount} 条选择可转冲突` : '继续补关键转折',
    },
    {
      label: '商业转化',
      value: Math.min(90, paidEndingNodeIds.length > 0 ? 70 + paidEndingNodeIds.length * 8 : 48),
      note: paidEndingNodeIds.length > 0 ? `${paidEndingNodeIds.length} 条付费结局` : '建议预留付费隐藏真相',
    },
  ]
  const formatAiWorkflowStatus = (status: string) =>
    status === 'running' ? '进行中' : status === 'ready' ? '已就绪' : '待补齐'

  const recentAuditEntries = useMemo(
    () => auditEntries.slice(-5).reverse(),
    [auditEntries],
  )
  const leadPreviewItems = useMemo(
    () => marketingLeads.slice(0, 5),
    [marketingLeads],
  )
  const summarizeProjectForLibrary = (item: StoryProject) => {
    const links = item.nodes.reduce((sum, node) => sum + node.choices.length, 0)
    const endings = item.nodes.filter((node) => node.kind === 'Ending').length
    const readyChecks = [
      item.nodes.length >= 4,
      links >= 5,
      item.characters.length >= 3,
      item.variables.length >= 3,
      item.publish.monetization !== 'Free' || item.publish.status !== 'Draft',
    ]
    const readyCount = readyChecks.filter(Boolean).length
    const updatedAt = item.updatedAt ? new Date(item.updatedAt) : null
    const updatedLabel = updatedAt
      ? updatedAt.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
      : '未同步'
    return {
      project: item,
      links,
      endings,
      readyCount,
      readyTotal: readyChecks.length,
      updatedLabel,
      tone: readyCount >= 4 ? 'ok' : readyCount >= 2 ? 'info' : 'warn',
    }
  }
  const projectLibraryRows = projectList.map((item) => summarizeProjectForLibrary(item))
  const archivedProjectLibraryRows = archivedProjectList.map((item) =>
    summarizeProjectForLibrary(item),
  )
  const currentProjectLibraryRow = summarizeProjectForLibrary(project)
  const publishableProjectCount = projectLibraryRows.filter((item) => item.readyCount >= 4).length
  const projectLibraryCards = [
    {
      label: '活跃作品',
      value: `${projectList.length}`,
      note: projectList.length > 0 ? projectListState : '保存后进入作品库',
      tone: projectList.length > 0 ? 'ok' : 'info',
    },
    {
      label: '当前作品',
      value: currentProjectLibraryRow.project.title,
      note: `${currentProjectLibraryRow.readyCount}/${currentProjectLibraryRow.readyTotal} 项就绪`,
      tone: currentProjectLibraryRow.tone,
    },
    {
      label: '可推进发布',
      value: `${publishableProjectCount}`,
      note: publishableProjectCount > 0 ? '优先进入发布复核' : '继续补齐剧情和角色',
      tone: publishableProjectCount > 0 ? 'ok' : 'warn',
    },
    {
      label: '归档',
      value: `${archivedProjectList.length}`,
      note: showArchivedProjects ? '正在查看归档' : '可随时恢复',
      tone: archivedProjectList.length > 0 ? 'info' : 'ok',
    },
  ]
  const currentProjectChecklist = [
    { label: '剧情', value: `${project.nodes.length} 节点`, done: project.nodes.length >= 4 },
    { label: '分支', value: `${currentProjectLibraryRow.links} 条`, done: currentProjectLibraryRow.links >= 5 },
    { label: '角色', value: `${project.characters.length} 个`, done: project.characters.length >= 3 },
    { label: '变量', value: `${project.variables.length} 个`, done: project.variables.length >= 3 },
    {
      label: '变现',
      value: formatMonetization(project.publish.monetization),
      done: project.publish.monetization !== 'Free',
    },
  ]
  const failedLeadCount = marketingLeads.filter(
    (lead) => lead.notification?.status === 'failed',
  ).length
  const newLeadCount = marketingLeads.filter((lead) => lead.status === 'new').length
  const reachableLeadCount = marketingLeads.filter((lead) => lead.phone || lead.email).length
  const notifiedLeadCount = marketingLeads.filter((lead) =>
    ['sent', 'queued', 'skipped'].includes(lead.notification?.status || ''),
  ).length
  const leadPipelineCards = [
    {
      label: '线索总数',
      value: `${marketingLeads.length}`,
      note: leadListState,
      tone: marketingLeads.length > 0 ? 'ok' : 'info',
    },
    {
      label: '新申请',
      value: `${newLeadCount}`,
      note: newLeadCount > 0 ? '需要运营跟进' : '暂无新增',
      tone: newLeadCount > 0 ? 'warn' : 'ok',
    },
    {
      label: '可联系',
      value: `${reachableLeadCount}`,
      note: `${notifiedLeadCount} 条已通知或入库`,
      tone: reachableLeadCount > 0 ? 'ok' : 'info',
    },
    {
      label: '通知失败',
      value: `${failedLeadCount}`,
      note: failedLeadCount > 0 ? '检查邮件或联系方式' : '通知链路稳定',
      tone: failedLeadCount > 0 ? 'warn' : 'ok',
    },
  ]
  const leadQueueRows = leadPreviewItems.map((lead) => {
    const failed = lead.notification?.status === 'failed'
    const hasContact = Boolean(lead.phone || lead.email)
    return {
      lead,
      tone: failed ? 'warn' : lead.status === 'new' ? 'new' : 'ok',
      nextAction: failed
        ? '检查通知'
        : hasContact
          ? '安排回访'
          : '补联系方式',
      sourceLabel: lead.source || '公开页',
    }
  })
  const projectLibraryBlockedByAuth = isExternalProviderAuth && !hasWorkspaceSession
  const projectLibraryEmptyTitle = projectLibraryBlockedByAuth
    ? '登录后查看云端作品'
    : '当前工作区还没有保存作品'
  const projectLibraryEmptyCopy = projectLibraryBlockedByAuth
    ? '云端作品、归档和协作记录受工作区账号保护。登录后会自动加载作品库。'
    : '保存当前项目后，它会进入作品库，并带上就绪度、角色、分支和变现状态。'
  const leadPanelBlockedByAuth = isExternalProviderAuth && !hasWorkspaceSession
  const leadEmptyTitle = leadPanelBlockedByAuth ? '登录后查看公开页线索' : '暂无公开申请'
  const leadEmptyCopy = leadPanelBlockedByAuth
    ? '公开页提交会进入后台线索池，登录工作区后可查看联系方式、通知状态和跟进建议。'
    : '当创作者或团队从公开页提交申请后，这里会出现跟进队列和通知状态。'

  const projectTimelineEntries = useMemo(() => {
    return auditEntries
      .filter((entry) => {
        const matchesProject =
          entry.targetId === project.id || entry.metadata?.projectId === project.id
        const matchesAction =
          auditActionFilter === 'all' || entry.action === auditActionFilter
        return matchesProject && matchesAction
      })
      .slice()
      .reverse()
  }, [auditActionFilter, auditEntries, project.id])

  const projectRecentActivityEntries = useMemo(() => {
    return auditEntries
      .filter(
        (entry) => entry.targetId === project.id || entry.metadata?.projectId === project.id,
      )
      .slice()
      .reverse()
      .slice(0, 3)
  }, [auditEntries, project.id])
  const activeWorkspaceName =
    session?.workspace.name ||
    workspaceList.find((workspace) => workspace.id === activeWorkspaceId)?.name ||
    'Creator Studio'
  const activeMemberCount = members.filter((member) => member.status === 'active').length
  const invitedMemberCount = members.filter((member) => member.status === 'invited').length
  const failedDeliveryCount = inviteDeliveries.filter(
    (delivery) => /fail|error|bounce/i.test(delivery.status) || Boolean(delivery.errorMessage),
  ).length
  const completedOnboardingCount = onboardingItems.filter((item) => item.done).length
  const nextOnboardingItem = onboardingItems.find((item) => !item.done)
  const latestProjectActivity = projectTimelineEntries[0] || projectRecentActivityEntries[0]
  const selectedAuditActionLabel =
    auditActionOptions.find((option) => option.value === auditActionFilter)?.label || '全部动作'
  const callbackPaidOrders = paidOrders.filter((order) => order.metadata?.paidByCallback === true)
  const latestPaidOrder = paidOrders
    .slice()
    .sort((left, right) => new Date(right.paidAt || right.createdAt).getTime() - new Date(left.paidAt || left.createdAt).getTime())[0]
  const trialLoginReady = Boolean(session) && Boolean(authProvider && authProvider.provider !== 'local-demo')
  const trialStoryReady = storyNodes.length >= 4 && connectionCount >= 5
  const trialDataReady = analyticsSummary.sessions > 0 || paidOrders.length > 0
  const customerTrialSteps: Array<{
    id: string
    step: string
    title: string
    detail: string
    state: 'ready' | 'waiting' | 'blocked'
    actionLabel: string
  }> = [
    {
      id: 'login',
      step: '01',
      title: '手机号登录',
      detail: trialLoginReady
        ? `${formatAuthProviderLabel(authProvider?.provider)}会话已建立`
        : `${formatAuthProviderLabel(authProvider?.provider)}，客户试用前先完成登录`,
      state: trialLoginReady ? 'ready' : 'waiting',
      actionLabel: '看账号',
    },
    {
      id: 'create',
      step: '02',
      title: '生成或创建短剧',
      detail: trialStoryReady
        ? `${storyNodes.length} 节点、${connectionCount} 分支可试玩`
        : '生成生产包或补齐互动主线',
      state: trialStoryReady ? 'ready' : 'waiting',
      actionLabel: trialStoryReady ? '剧情台' : '生成短剧',
    },
    {
      id: 'preview',
      step: '03',
      title: '保存并预览',
      detail: publishedBuildId
        ? `发布包 ${formatShortId(publishedBuildId)} 可预览`
        : projectHasRemoteRecord
          ? '作品已保存，生成发布包后可发客户'
          : saveState,
      state: projectHasRemoteRecord || publishedBuildId ? 'ready' : 'waiting',
      actionLabel: publishedBuildId ? '打开预览' : '保存版本',
    },
    {
      id: 'payment',
      step: '04',
      title: '发布包收款',
      detail:
        paidOrders.length > 0
          ? `${paidOrders.length} 笔已支付，${formatMoneyFromCents(grossRevenueCents, orderCurrency)}`
          : paymentProviderReady
            ? `${formatPaymentMethod(paymentProvider?.provider)}可创建真实订单`
            : '等待支付通道就绪',
      state: paidOrders.length > 0 ? 'ready' : paymentProviderReady ? 'waiting' : 'blocked',
      actionLabel: publishedBuildId ? '验证收款' : '生成发布包',
    },
    {
      id: 'data',
      step: '05',
      title: '数据回流',
      detail:
        analyticsSummary.sessions > 0 || paidOrders.length > 0
          ? `${analyticsSummary.sessions} 会话、${paidOrders.length} 笔支付进入运营台`
          : '试玩和支付后自动回写数据',
      state: trialDataReady ? 'ready' : 'waiting',
      actionLabel: '看数据',
    },
  ]
  function runCustomerTrialStep(stepId: string) {
    if (stepId === 'login') {
      setActiveStudioPage('overview')
      return
    }
    if (stepId === 'create') {
      if (trialStoryReady) {
        setActiveStudioPage('story')
        return
      }
      void generateShortDramaProject()
      return
    }
    if (stepId === 'preview') {
      if (publishedBuildId) {
        openSharePreview()
        return
      }
      void saveProject()
      return
    }
    if (stepId === 'payment') {
      setActiveStudioPage('publish')
      if (publishedBuildId) {
        void verifyPaidEndingUnlock()
        return
      }
      void publishBuild()
      return
    }
    if (stepId === 'data') {
      setActiveStudioPage('publish')
    }
  }

  async function copyCustomerTrialInvite() {
    const copied = await writeClipboardText(customerTrialInviteText)
    setCustomerTrialState(
      copied
        ? publishedBuildId
          ? '客户试用邀请已复制，包含正式发布链接'
          : '客户试用邀请已复制，发布包生成后再补正式链接'
        : '复制失败，请手动选中试用邀请',
    )
  }

  async function copyCustomerTrialDemoScript() {
    const copied = await writeClipboardText(customerTrialScriptText)
    setCustomerTrialState(copied ? '3 分钟演示脚本已复制' : '复制失败，请手动选中演示脚本')
  }

  const customerTrialReadyCount = customerTrialSteps.filter((step) => step.state === 'ready').length
  const customerTrialEvidenceRows = [
    {
      label: '试用模式',
      value: customerTrialMode ? '已启动' : '待启动',
      note: customerTrialMode
        ? '独立试用会话、0.01 元验收和隐藏线已准备'
        : '点击启动后生成客户可跑的验收路径',
      tone: customerTrialMode ? 'ok' : 'info',
    },
    {
      label: '试用闭环',
      value: `${customerTrialReadyCount}/${customerTrialSteps.length}`,
      note:
        customerTrialReadyCount >= customerTrialSteps.length
          ? '可以给客户自助试用'
          : '按步骤补齐后再发账号',
      tone: customerTrialReadyCount >= 4 ? 'ok' : 'warn',
    },
    {
      label: '收款证据',
      value:
        paidOrders.length > 0
          ? formatMoneyFromCents(grossRevenueCents, orderCurrency)
          : '待首单',
      note:
        callbackPaidOrders.length > 0
          ? `${callbackPaidOrders.length} 笔真实回调验签`
          : paymentProviderReady
            ? '可创建真实订单'
            : '支付通道待配置',
      tone: paidOrders.length > 0 ? 'ok' : paymentProviderReady ? 'info' : 'warn',
    },
    {
      label: '最新订单',
      value: latestPaidOrder ? formatShortId(latestPaidOrder.id) : `${pendingOrders.length} 待支付`,
      note: latestPaidOrder
        ? `${formatPaymentMethod(latestPaidOrder.provider)} · ${formatLeadTime(latestPaidOrder.paidAt || latestPaidOrder.createdAt)}`
        : pendingOrders.length > 0
          ? '运营需提醒继续支付'
          : '等待客户扫码',
      tone: latestPaidOrder ? 'ok' : pendingOrders.length > 0 ? 'warn' : 'info',
    },
    {
      label: '交付状态',
      value: publishedBuildId ? '可演示' : '待发布',
      note: publishedBuildId ? `发布包 ${formatShortId(publishedBuildId)}` : '先生成发布包再发客户',
      tone: publishedBuildId ? 'ok' : 'warn',
    },
  ]
  const customerTrialDemoRows = [
    {
      time: '00:00',
      title: '先给客户看双业务线',
      detail: '互动短剧是主业务，普通短剧生成是生产入口，两个入口共用同一套交付底座。',
    },
    {
      time: '00:40',
      title: '进入剧情编辑看付费隐藏线',
      detail: '展示免费主线、付费结局、节点收益预估和问题定位，让客户知道它能卖。',
    },
    {
      time: '01:30',
      title: '生成发布包并走微信 0.01 元',
      detail: '用真实微信订单验证扫码、回调、权益回写，支付宝协议到期时不误导客户。',
    },
    {
      time: '02:20',
      title: '回到运营台看数据回流',
      detail: '订单、会话、渠道链接和异常处理都在发布变现页闭环，适合内测交付。',
    },
  ]
  const customerTrialShareUrl = (() => {
    const url = new URL(`${window.location.origin}${window.location.pathname}`)
    url.searchParams.set('trial', '1')
    url.searchParams.set('utm_source', 'customer-trial')
    url.searchParams.set('utm_medium', 'wechat')
    url.searchParams.set('utm_campaign', `${project.id}-trial`)
    if (publishedBuildId) url.searchParams.set('build', publishedBuildId)
    return url.toString()
  })()
  const customerTrialInviteText = [
    '你好，这是 PlayDrama 的 3 分钟试用路径。',
    '',
    '你可以先看两条能力：',
    '1. 制作互动短剧：剧情图谱、选择分支、付费隐藏结局、微信收款和数据回流。',
    '2. 生成常规短剧：从一句 brief 生成剧本编写、视频脚本、镜头队列和审片交付。',
    '',
    `试用链接：${publishedBuildId ? customerTrialShareUrl : '待生成发布包后复制正式链接'}`,
    '',
    '建议体验顺序：手机号登录 -> 生成或创建短剧 -> 保存并预览 -> 发布包收款 -> 数据回流。',
    '如果需要，我可以现场演示微信 0.01 元付费结局解锁闭环。',
  ].join('\n')
  const customerTrialNextStep =
    customerTrialSteps.find((step) => step.state !== 'ready') || customerTrialSteps[customerTrialSteps.length - 1]
  const customerTrialProgressLabel =
    customerTrialReadyCount >= customerTrialSteps.length
      ? '试用闭环已就绪'
      : `下一步：${customerTrialNextStep.title}`
  const customerTrialScriptText = [
    '# PlayDrama 3 分钟客户演示脚本',
    '',
    ...customerTrialDemoRows.map((row) => `- ${row.time} ${row.title}：${row.detail}`),
    '',
    '验收重点：',
    ...customerTrialSteps.map((step) => `- ${step.step} ${step.title}：${step.detail}`),
    '',
    `当前状态：${customerTrialProgressLabel}`,
    `发布链接：${publishedBuildId ? customerTrialShareUrl : '待生成发布包'}`,
  ].join('\n')
  const customerTrialRouteCards = [
    {
      id: 'creation',
      label: '创作入口',
      title: '从灵感写到正文',
      detail: '故事梗概、人物小传、分集大纲和剧本正文先成型，再升级互动分支和发布收款。',
      cta: '进入创作模式',
      tone: 'creation',
      icon: <Wand2 size={18} />,
      action: () => {
        activateCustomerTrialMode()
        setActiveStudioPage('creation')
      },
    },
    {
      id: 'interactive',
      label: '主业务',
      title: '制作互动短剧',
      detail: '从剧情图谱、选择分支、付费隐藏线到微信收款，给客户看完整变现闭环。',
      cta: '进入互动制作',
      tone: 'primary',
      icon: <GitBranch size={18} />,
      action: () => {
        activateCustomerTrialMode()
        setActiveStudioPage('story')
      },
    },
    {
      id: 'series',
      label: '第二业务',
      title: '生成常规短剧',
      detail: '从一句 brief 进入剧本编写、视频脚本、镜头队列和审片交付。',
      cta: '打开生成台',
      tone: 'secondary',
      icon: <Clapperboard size={18} />,
      action: () => {
        activateCustomerTrialMode()
        setActiveStudioPage('ai')
      },
    },
  ]
  const paymentOperationsKpis = [
    {
      label: '回调验签',
      value: callbackPaidOrders.length > 0 ? '已验证' : '待真实支付',
      note:
        callbackPaidOrders.length > 0
          ? `${callbackPaidOrders.length} 笔由支付回调确认`
          : '创建订单后等待微信异步通知',
      tone: callbackPaidOrders.length > 0 ? 'ready' : paymentProviderReady ? 'waiting' : 'blocked',
    },
    {
      label: '权益回写',
      value: paidEndingUnlocked || paidOrders.length > 0 ? '已生效' : '待解锁',
      note:
        paidOrders.length > 0
          ? `${paidOrders.flatMap((order) => order.unlockNodeIds || []).length} 个节点已写入订单权益`
          : '支付成功后自动解锁付费结局',
      tone: paidEndingUnlocked || paidOrders.length > 0 ? 'ready' : 'waiting',
    },
    {
      label: '异常队列',
      value: `${failedOrders.length + refundedOrders.length}`,
      note:
        failedOrders.length + refundedOrders.length > 0
          ? '需要运营复核订单和权益'
          : '失败和退款为空',
      tone: failedOrders.length + refundedOrders.length > 0 ? 'blocked' : 'ready',
    },
    {
      label: '待支付跟进',
      value: `${pendingOrders.length}`,
      note: pendingOrders.length > 0 ? '保留继续支付和刷新入口' : '当前无挂起订单',
      tone: pendingOrders.length > 0 ? 'waiting' : 'ready',
    },
  ]
  const paymentRecoveryRows = [
    {
      id: 'pending',
      label: '待支付',
      value: `${pendingOrders.length} 笔`,
      note: pendingOrders.length > 0 ? '给客户继续支付链接，支付后刷新订单' : '无待跟进',
      state: pendingOrders.length > 0 ? 'waiting' : 'ready',
    },
    {
      id: 'failed',
      label: '失败订单',
      value: `${failedOrders.length} 笔`,
      note: failedOrders.length > 0 ? '检查商户号、签名、金额和回调地址' : '无失败订单',
      state: failedOrders.length > 0 ? 'blocked' : 'ready',
    },
    {
      id: 'paid',
      label: '已支付',
      value: `${paidOrders.length} 笔`,
      note: paidOrders.length > 0 ? '可按订单号追踪权益和回调时间' : '等待首笔真实支付',
      state: paidOrders.length > 0 ? 'ready' : 'waiting',
    },
    {
      id: 'refund',
      label: '退款/撤权',
      value: `${refundedOrders.length} 笔`,
      note: refundedOrders.length > 0 ? '退款后运营需确认权益撤回' : '暂未发生退款',
      state: refundedOrders.length > 0 ? 'waiting' : 'ready',
    },
  ]
  const overviewTrustCards = [
    {
      label: '作品状态',
      value: formatPublishStatus(project.publish.status),
      note: `${storyNodes.length} 节点 · ${connectionCount} 分支`,
      tone: storyNodes.length >= 4 && connectionCount >= 5 ? 'ok' : 'warn',
    },
    {
      label: '团队协作',
      value: `${members.length || 1} 人`,
      note: `${activeMemberCount || 1} 已加入 · ${invitedMemberCount} 邀请中`,
      tone: invitedMemberCount > 0 ? 'info' : 'ok',
    },
    {
      label: '上线门禁',
      value: commercialReadinessLabel,
      note: nextOnboardingItem ? `下一步：${nextOnboardingItem.label}` : '内测检查已完成',
      tone: commercialReadiness?.status === 'pass' ? 'ok' : 'warn',
    },
    {
      label: '最近操作',
      value: auditEntries.length ? `${auditEntries.length} 条` : '暂无',
      note: latestProjectActivity
        ? `${formatAuditActionLabel(latestProjectActivity.action)} · ${new Date(latestProjectActivity.createdAt).toLocaleDateString()}`
        : '保存、发布和邀请会进入审计',
      tone: auditEntries.length > 0 ? 'ok' : 'info',
    },
  ]
  const generatorLaunchCards = [
    {
      label: '可用积分',
      value: `${generationCreditsRemaining}`,
      note: `${generationCreditTotal} 点内测额度，生成和扩写共用`,
      tone: generationCreditsRemaining > 5 ? 'ok' : generationCreditsRemaining > 0 ? 'warn' : 'info',
    },
    {
      label: '短剧生成',
      value: '一键成稿',
      note: `${seriesGenerator.genre} · ${seriesGenerator.monetization}`,
      tone: 'ok',
    },
    {
      label: '样片链路',
      value: '可预览',
      note: '生成后自动进入剧情编辑，可继续发布',
      tone: 'info',
    },
  ]
  const selectedBeginnerGoal =
    beginnerGoalOptions.find((option) => option.id === beginnerGoal) || beginnerGoalOptions[0]
  const beginnerSeriesInput: SeriesGeneratorInput = {
    idea: beginnerIdea.trim() || '一个普通人突然获得一次改写人生选择的机会',
    genre: beginnerGenre,
    audience: '零基础创作者和普通短剧观众',
    platform: '抖音 / 微信 H5 / 微信小程序',
    duration: beginnerLength,
    interactionDensity: selectedBeginnerGoal.density,
    monetization: selectedBeginnerGoal.monetization,
    price: selectedBeginnerGoal.price,
    constraints: [
      selectedBeginnerGoal.constraints,
      '主角动机要直白，前三秒有钩子，每一集结尾必须有悬念。',
      '生成后必须能继续细修、导出生产包，并可升级互动短剧。',
    ].join(' '),
  }
  const beginnerPreviewRows = [
    {
      label: '生成目标',
      value: selectedBeginnerGoal.label,
      note: selectedBeginnerGoal.detail,
      tone: beginnerGoal === 'paid' ? 'ok' : 'info',
    },
    {
      label: '题材',
      value: beginnerGenre,
      note: beginnerLength,
      tone: 'info',
    },
    {
      label: '变现',
      value: formatMonetization(beginnerSeriesInput.monetization),
      note: beginnerSeriesInput.monetization === 'Free' ? '先拉新再升级' : `试卖价 CNY ${selectedBeginnerGoal.price}`,
      tone: beginnerSeriesInput.monetization === 'Free' ? 'info' : 'ok',
    },
    {
      label: '下一步',
      value: 'AI 导演',
      note: '生成后进入细修、导出和互动升级',
      tone: 'ok',
    },
  ]
  const beginnerFlowRows = [
    { step: '01', title: '一句话', detail: '先把题材钩子说清楚' },
    { step: '02', title: '自动补表单', detail: `${beginnerGenre} · ${beginnerLength}` },
    { step: '03', title: '生成草稿', detail: selectedBeginnerGoal.detail },
    { step: '04', title: '继续交付', detail: '细修、导出、升级互动、发布收款' },
  ]
  const beginnerHandoffReady = Boolean(visibleGeneratedReview)
  const beginnerPublishedReady = Boolean(publishedBuildId)
  const beginnerFriendTrialUrl = useMemo(() => {
    const url = new URL(`${window.location.origin}${window.location.pathname}`)
    url.searchParams.set('preview', '1')
    if (publishedBuildId) url.searchParams.set('build', publishedBuildId)
    url.searchParams.set('channel', 'friend-trial')
    url.searchParams.set('utm_source', 'friend-trial')
    url.searchParams.set('utm_medium', 'share')
    url.searchParams.set('utm_campaign', `${project.id}-friend-trial`)
    return url.toString()
  }, [project.id, publishedBuildId])
  const beginnerHandoffRows = [
    {
      id: 'refine',
      title: '继续细修',
      detail: beginnerHandoffReady
        ? `${storyNodes.length} 个节点已生成，去改台词、分支和付费隐藏线`
        : '生成草稿后进入剧情编辑',
      state: beginnerHandoffReady ? 'ready' : 'waiting',
      cta: '打开剧情编辑',
      action: openGeneratedRefinement,
    },
    {
      id: 'sell',
      title: '发布试卖',
      detail: beginnerPublishedReady
        ? `发布包 #${publishedBuildId.slice(-6)} 已可验证收款`
        : '生成稳定发布包，微信 0.01 元可验收',
      state: beginnerPublishedReady ? 'ready' : beginnerHandoffReady ? 'waiting' : 'blocked',
      cta: beginnerPublishedReady ? '查看发布' : buildState === '正在生成发布' ? '发布中' : '生成发布包',
      action: publishBeginnerTrial,
    },
    {
      id: 'share',
      title: '复制给朋友试玩',
      detail: beginnerPublishedReady ? '复制 H5 试玩链接，渠道会进入数据回流' : '先发布试卖，避免朋友打开本地草稿',
      state: beginnerPublishedReady ? 'ready' : beginnerHandoffReady ? 'waiting' : 'blocked',
      cta: beginnerPublishedReady ? '复制链接' : '先去发布',
      action: copyBeginnerFriendTrialLink,
    },
  ] as const
  const aiToolchainCards = [
    {
      id: 'coding-agent',
      label: '写代码插件',
      value: 'Codex / Cline / OpenHands',
      note: '需求拆解、代码修改、构建验证、上线交接，形成工程闭环。',
      tone: 'ok',
      icon: <TerminalSquare size={17} />,
    },
    {
      id: 'ui-system',
      label: 'UI 插件体系',
      value: 'shadcn / Radix / Storybook',
      note: '组件状态、触控尺寸、响应式断点和客户信任感验收。',
      tone: 'info',
      icon: <Layers3 size={17} />,
    },
    {
      id: 'automation',
      label: '自动工作流',
      value: 'n8n / Dify / Trigger.dev',
      note: '生成、视频、发布、支付和回归检查进入可重试任务流。',
      tone: 'ok',
      icon: <Bot size={17} />,
    },
  ]
  const aiAutomationRows = [
    {
      step: '01',
      title: '需求进队列',
      detail: '客户反馈、公众号流量和内部优化先归入 AI 团队任务池。',
      status: 'ready',
      badge: 'Codex',
    },
    {
      step: '02',
      title: '生产包生成',
      detail: visibleGeneratedReview
        ? `${visibleGeneratedReview.nodeCount} 节点 · ${visibleGeneratedReview.shotCount} 镜头已进入交付台`
        : '先生成剧本、视频脚本、Prompt 和交付清单',
      status: visibleGeneratedReview ? 'ready' : aiProvider?.productionReady ? 'running' : 'waiting',
      badge: visibleGeneratedReview ? '已落地' : '待生成',
    },
    {
      step: '03',
      title: 'UI 组件验收',
      detail: '按 390px 手机、690px 窄桌面和 1440px 桌面检查触控、溢出和层级。',
      status: 'ready',
      badge: 'Storybook',
    },
    {
      step: '04',
      title: '上线门禁',
      detail:
        commercialReadiness?.status === 'pass'
          ? '部署预检、商用 smoke 和支付 provider 已具备上线验收基础'
          : `${commercialStatusLabel}，需要补齐后再给客户试用`,
      status: commercialReadiness?.status === 'pass' ? 'ready' : 'waiting',
      badge: commercialReadiness?.status === 'pass' ? 'GO' : '待补',
    },
    {
      step: '05',
      title: '浏览器回归',
      detail: '对标 browser-use：上线后自动跑关键路径、响应式和支付解锁检查。',
      status: paymentProviderReady && commercialReadiness?.status === 'pass' ? 'ready' : 'waiting',
      badge: 'Playwright',
    },
  ] as const
  const creationPipelineStages = [
    {
      id: 'inspiration' as const,
      step: '01',
      label: '灵感策划',
      title: '爆款参考和用户钩子',
      metric: aiProvider?.productionReady ? aiModelLabel : '模型待配置',
      state: aiProvider?.productionReady || visibleGeneratedReview ? 'ready' : 'waiting',
      icon: <Sparkles size={17} />,
      canvas:
        `围绕「${project.publish.category}」先确定一句话卖点、目标受众和首集强钩子。StoryPlay 停在剧本前期，PlayDrama 会继续承接互动和收款。`,
      deliverables: ['一句话卖点', '受众和情绪爽点', '首集 15 秒钩子', '可升级互动的商业卡点'],
      aiActions: ['生成 3 组爆款钩子', '拆受众和爽点', '沉淀成故事梗概'],
      proof: visibleGeneratedReview
        ? `已有生产包：${visibleGeneratedReview.nodeCount} 节点、${visibleGeneratedReview.shotCount} 镜头`
        : seriesGenerationState,
    },
    {
      id: 'synopsis' as const,
      step: '02',
      label: '故事梗概',
      title: project.title,
      metric: `${storyNodes.length} 个剧情节点`,
      state: storyNodes.length >= 3 ? 'ready' : 'waiting',
      icon: <FileText size={17} />,
      canvas:
        storyNodes[0]?.summary ||
        '先把主角目标、冲突、反转和结局方向写成可执行梗概，后续人物、小传和分集都从这里继承。',
      deliverables: ['主角目标', '核心冲突', '中段反转', '结局承诺'],
      aiActions: ['扩写 800 字梗概', '补三段式结构', '标出付费隐藏线机会'],
      proof: storyNodes.length >= 3 ? '主线素材可进入人物和分集阶段' : '建议先补到 3 个以上剧情节点',
    },
    {
      id: 'characters' as const,
      step: '03',
      label: '人物小传',
      title: `${project.characters.length} 个角色资产`,
      metric: project.characters.map((item) => item.name).filter(Boolean).slice(0, 3).join(' / ') || '待补角色',
      state: project.characters.length >= 3 ? 'ready' : 'waiting',
      icon: <Users size={17} />,
      canvas:
        project.characters
          .map((item) => `${item.name || '未命名角色'}：${item.role || '定位待补'}，${item.trait || '动机待补'}`)
          .slice(0, 3)
          .join('\n') || '人物小传需要稳定姓名、关系、欲望、秘密和反转责任，保证后续视频生成不跑偏。',
      deliverables: ['主角欲望', '对手压力', '盟友秘密', '角色视觉和口吻约束'],
      aiActions: ['补人物小传', '生成角色关系网', '同步角色资产页'],
      proof: project.characters.length >= 3 ? '角色一致性可支持剧本和视频脚本' : '建议至少 3 个核心角色',
    },
    {
      id: 'outline' as const,
      step: '04',
      label: '分集大纲',
      title: '把剧情拆成可拍摄节奏',
      metric: `${storyNodes.length} 集/幕 · ${connectionCount} 条选择`,
      state: storyNodes.length >= 4 ? 'ready' : 'waiting',
      icon: <Layers3 size={17} />,
      canvas:
        storyNodes
          .slice(0, 5)
          .map((node, index) => `${index + 1}. ${node.title}：${node.summary}`)
          .join('\n') || '分集大纲需要把钩子、推进、反转和结局落到每一幕，后续才能生成镜头和互动节点。',
      deliverables: ['每集钩子', '剧情推进点', '反转和悬念', '可转互动的选择点'],
      aiActions: ['生成 8 集大纲', '标出节奏风险', '拆成镜头任务'],
      proof: storyNodes.length >= 4 ? '已有可试玩主线基础' : '建议补到 4 幕以上再给客户演示',
    },
    {
      id: 'script' as const,
      step: '05',
      label: '剧本正文',
      title: visibleGeneratedReview ? visibleGeneratedReview.title : '短剧生产包',
      metric: visibleGeneratedReview ? `${visibleGeneratedReview.shotCount} 个镜头` : videoPipelineStatusText,
      state: visibleGeneratedReview ? 'ready' : 'waiting',
      icon: <Clapperboard size={17} />,
      canvas:
        visibleGeneratedReview?.storyboardShots
          ?.slice(0, 3)
          .map((shot) => `${shot.id} ${shot.beat}：${shot.dialogue || shot.visualPrompt}`)
          .join('\n') ||
        '剧本正文阶段要能继续细修对白、场景、字幕和镜头提示，并可导出给视频供应商或升级互动短剧。',
      deliverables: ['对白正文', '镜头脚本', '视频 Prompt', '字幕和交付清单'],
      aiActions: ['生成剧本正文', '补字幕和镜头', '提交视频队列'],
      proof: visibleGeneratedReview ? `${visibleGeneratedReview.exportCount} 个交付项可导出` : '生成生产包后进入视频细修',
    },
    {
      id: 'interaction' as const,
      step: '06',
      label: '互动分支',
      title: '升级成互动短剧',
      metric: `${connectionCount} 分支 · ${storyReachability.paidBranchRows.length} 条付费触达`,
      state:
        storyReachability.reachableEndingCount > 0 && connectionCount >= 5
          ? 'ready'
          : storyReachability.reachableEndingCount > 0
            ? 'waiting'
            : 'blocked',
      icon: <GitBranch size={17} />,
      canvas:
        `当前主线 ${storyReachability.reachableCount}/${storyNodes.length} 节点可达，${storyReachability.paidEndingCount} 个付费结局。这里是 PlayDrama 超过普通剧本平台的关键。`,
      deliverables: ['主路径/分支路径对比', '付费隐藏线', '节点收益预估', '断点和孤岛定位'],
      aiActions: ['一键生成付费隐藏线', '检查分支闭环', '生成试玩路径'],
      proof:
        project.publish.monetization === 'Paid Ending'
          ? `预计 ${formatMoneyFromCents(projectedRevenuePerThousandCents, orderCurrency)}/千次试玩`
          : '发布页可切换付费结局试卖',
    },
    {
      id: 'publish' as const,
      step: '07',
      label: '发布变现',
      title: publishedBuildId ? `发布包 ${formatShortId(publishedBuildId)}` : '生成发布包并验收收款',
      metric: paymentProviderReady ? `${formatPaymentMethod(paymentProvider?.provider)}可用` : commercialStatusLabel,
      state: publishedBuildId && paymentProviderReady ? 'ready' : paymentProviderReady ? 'waiting' : 'blocked',
      icon: <Share2 size={17} />,
      canvas:
        publishedBuildId
          ? `发布包已生成，可继续跑微信 0.01 元、付费结局解锁和数据回流验收。`
          : '上线前要把发布包、支付失败重试、运营提示、风险提示和客户预览链接一次性走通。',
      deliverables: ['发布包', '微信 0.01 元验收', '付费结局解锁', '订单和数据回流'],
      aiActions: ['生成发布包', '刷新支付状态', '复制客户演示路径'],
      proof: customerTrialProgressLabel,
    },
  ]
  const activeCreationStageItem =
    creationPipelineStages.find((item) => item.id === activeCreationStage) || creationPipelineStages[0]
  const activeCreationStageIndex = creationPipelineStages.findIndex(
    (item) => item.id === activeCreationStageItem.id,
  )
  const nextCreationStage =
    creationPipelineStages[Math.min(activeCreationStageIndex + 1, creationPipelineStages.length - 1)]
  const creationModeReadyCount = creationPipelineStages.filter((item) => item.state === 'ready').length
  const creationModeProgress = `${creationModeReadyCount}/${creationPipelineStages.length}`
  function advanceCreationStage() {
    setActiveCreationStage(nextCreationStage.id)
  }
  function openActiveCreationStageWorkspace() {
    if (activeCreationStageItem.id === 'interaction') {
      setActiveStudioPage('story')
      return
    }
    if (activeCreationStageItem.id === 'publish') {
      setActiveStudioPage('publish')
      return
    }
    if (activeCreationStageItem.id === 'characters') {
      setActiveStudioPage('characters')
      return
    }
    setActiveStudioPage('ai')
  }
  const scriptProductionReadyUnits = [
    storyNodes.length >= 4,
    project.characters.length >= 3,
    visibleGeneratedReview ? visibleGeneratedReview.shotCount >= storyNodes.length : false,
    productionMemoryRows.length >= 3,
    productionQualityMetrics.length >= 3,
    storyReachability.paidBranchRows.length > 0,
  ]
  const scriptProductionMaturity = Math.round(
    (scriptProductionReadyUnits.filter(Boolean).length / scriptProductionReadyUnits.length) * 100,
  )
  const scriptProductionToolRows = [
    {
      id: 'inspiration',
      label: '灵感策划',
      baseline: '灵感策划 / 爆款榜单',
      playdrama: '首集钩子、受众爽点、商业卡点同步生成',
      state: aiProvider?.productionReady || visibleGeneratedReview ? 'ready' : 'waiting',
      target: 'inspiration' as const,
      icon: <Sparkles size={16} />,
    },
    {
      id: 'deconstruction',
      label: '拉片拆解',
      baseline: '短剧拉片 / 小说拆书',
      playdrama: visibleGeneratedReview
        ? `${productionMemoryRows.length} 条制作记忆，镜头和人物约束可复用`
        : '生成生产包后沉淀制作记忆和镜头约束',
      state: productionMemoryRows.length >= 3 ? 'ready' : 'waiting',
      target: 'outline' as const,
      icon: <Search size={16} />,
    },
    {
      id: 'character-bible',
      label: '人物小传',
      baseline: '人物小传一键生成',
      playdrama: `${project.characters.length} 个角色资产，绑定视觉、声线和剧情引用`,
      state: project.characters.length >= 3 ? 'ready' : 'waiting',
      target: 'characters' as const,
      icon: <Users size={16} />,
    },
    {
      id: 'episode-outline',
      label: '分集大纲',
      baseline: '分集大纲生成',
      playdrama: `${storyNodes.length} 幕、${connectionCount} 条选择，直接可转互动节点`,
      state: storyNodes.length >= 4 && connectionCount >= 5 ? 'ready' : 'waiting',
      target: 'outline' as const,
      icon: <Layers3 size={16} />,
    },
    {
      id: 'script-body',
      label: '剧本正文',
      baseline: '剧本正文 / 单集润色',
      playdrama: visibleGeneratedReview
        ? `${seriesScriptRows.length} 段剧本，${visibleGeneratedReview.shotCount} 个镜头脚本`
        : '生成后可细修对白、字幕、Prompt 和视频队列',
      state: visibleGeneratedReview ? 'ready' : 'waiting',
      target: 'script' as const,
      icon: <FileText size={16} />,
    },
    {
      id: 'quality-score',
      label: '剧本评估',
      baseline: '剧本评估 / 剧名生成',
      playdrama: `${productionQualityMetrics.length || 3} 项质量指标，加上互动收益预估`,
      state: productionQualityMetrics.length >= 3 && storyReachability.paidBranchRows.length > 0 ? 'ready' : 'waiting',
      target: 'interaction' as const,
      icon: <BarChart3 size={16} />,
    },
  ]
  const scriptProductionMetrics = [
    {
      label: '剧本成熟度',
      value: `${scriptProductionMaturity}%`,
      note: scriptProductionMaturity >= 80 ? '可进入客户演示' : '继续补齐生产包和评估',
    },
    {
      label: '正文产能',
      value: visibleGeneratedReview ? `${seriesScriptRows.length} 段` : '待生成',
      note: visibleGeneratedReview ? `${visibleGeneratedReview.shotCount} 个镜头可进视频` : '先生成短剧生产包',
    },
    {
      label: '商业卡点',
      value: `${storyReachability.paidBranchRows.length} 条`,
      note: `${storyReachability.paidEndingCount} 个付费结局，${formatMoneyFromCents(projectedRevenuePerThousandCents, orderCurrency)}/千次预估`,
    },
  ]
  const creationBusinessModes = [
    {
      id: 'interactive',
      eyebrow: '主业务',
      title: '互动短剧制作',
      detail: '剧本、分支、付费隐藏线、微信收款和数据回流在同一条链路里完成。',
      proof:
        project.publish.monetization === 'Paid Ending'
          ? `${reachablePaidBranchCount} 条付费入口可达`
          : '可一键升级付费结局',
      state: connectionCount >= 5 && paymentProviderReady ? 'ready' : 'waiting',
      icon: <GitBranch size={18} />,
      cta: '进入互动制作',
      action: () => setActiveStudioPage('story'),
    },
    {
      id: 'series',
      eyebrow: '第二业务',
      title: '常规短剧生成',
      detail: '从一句 brief 到梗概、人物、分集、正文、镜头脚本和生产包导出。',
      proof: visibleGeneratedReview
        ? `${visibleGeneratedReview.shotCount} 个镜头可交付`
        : `${aiModelLabel} · ${seriesGenerationState}`,
      state: visibleGeneratedReview ? 'ready' : aiProvider?.productionReady ? 'waiting' : 'blocked',
      icon: <Clapperboard size={18} />,
      cta: visibleGeneratedReview ? '查看生产包' : '生成生产包',
      action: () => {
        if (visibleGeneratedReview) {
          setActiveCreationStage('script')
          return
        }
        void generateShortDramaProject()
      },
    },
  ]
  const scriptProductionBenchmarks = [
    {
      label: 'StoryPlay 基线',
      value: '灵感、人物、分集、正文、剧本评估',
      note: '先让常规剧本生产链路完整可信。',
    },
    {
      label: 'PlayDrama 超越点',
      value: '互动分支、付费隐藏线、收益预估',
      note: '把普通剧本直接升级成可试玩、可试卖结构。',
    },
    {
      label: '客户交付',
      value: '发布包、收款验收、数据回流',
      note: '客户最终看到的是从创作到收款的闭环。',
    },
  ]
  const scriptProductionActions = [
    {
      label: isSeriesGenerating ? '生成中' : '生成完整剧本生产包',
      detail: '梗概、人物、分集、正文、镜头和 Prompt',
      icon: <Clapperboard size={16} />,
      action: generateShortDramaProject,
      disabled: isSeriesGenerating || isAiBusy,
    },
    {
      label: '生成付费隐藏线',
      detail: '把正文升级为可收费互动结构',
      icon: <KeyRound size={16} />,
      action: () => generatePaidHiddenLine(),
      disabled: false,
    },
    {
      label: '复制生产 Prompt 包',
      detail: visibleGeneratedReview ? '交给视频模型或制作团队' : '先生成生产包',
      icon: <Clipboard size={16} />,
      action: copyProductionPromptPack,
      disabled: !visibleGeneratedReview,
    },
    {
      label: '导出客户生产包',
      detail: visibleGeneratedReview ? 'Markdown 交付清单' : '先生成生产包',
      icon: <Download size={16} />,
      action: exportGeneratedProductionPack,
      disabled: !visibleGeneratedReview,
    },
  ]
  const secondaryPageCommandCenters = {
    creation: {
      eyebrow: '对标 StoryPlay 的创作流水线',
      title: '先把剧本生产做专业，再接互动、付费和发布',
      summary: `${creationModeProgress} 阶段就绪 · 当前 ${activeCreationStageItem.step} ${activeCreationStageItem.label}`,
      primary: {
        icon: <Wand2 size={18} />,
        label: '当前阶段',
        value: activeCreationStageItem.title,
        note: activeCreationStageItem.metric,
        tone: activeCreationStageItem.state === 'blocked' ? 'blocked' : activeCreationStageItem.state,
      },
      checks: [
        {
          label: '创作完整度',
          value: creationModeProgress,
          note: creationModeReadyCount >= 5 ? '可给客户演示' : '继续补剧本和视频生产链',
          tone: creationModeReadyCount >= 5 ? 'ready' : 'waiting',
        },
        {
          label: '互动升级',
          value: connectionCount >= 5 ? '可升级' : `${connectionCount} 分支`,
          note: `${storyReachability.paidBranchRows.length} 条付费入口触达`,
          tone: connectionCount >= 5 ? 'ready' : 'waiting',
        },
        {
          label: '商业出口',
          value: publishedBuildId ? '已发布' : '待发布',
          note: paymentProviderReady ? '支付通道可验收' : commercialStatusLabel,
          tone: publishedBuildId && paymentProviderReady ? 'ready' : paymentProviderReady ? 'waiting' : 'blocked',
        },
      ],
      actions: [
        {
          label: isSeriesGenerating ? '生产包生成中' : 'AI 生成生产包',
          detail: '生成梗概、人物、分集、脚本和镜头队列',
          icon: <Clapperboard size={16} />,
          action: generateShortDramaProject,
          disabled: isSeriesGenerating || isAiBusy,
        },
        {
          label: '进入阶段细修',
          detail: activeCreationStageItem.id === 'interaction' ? '打开剧情编辑' : activeCreationStageItem.id === 'publish' ? '打开发布变现' : '打开 AI/资产工作台',
          icon: <ExternalLink size={16} />,
          action: openActiveCreationStageWorkspace,
        },
        {
          label: '推进下一阶段',
          detail: nextCreationStage.id === activeCreationStageItem.id ? '已经到发布验收' : `${nextCreationStage.step} ${nextCreationStage.label}`,
          icon: <ArrowRight size={16} />,
          action: advanceCreationStage,
        },
      ],
    },
    story: {
      eyebrow: '互动短剧制作台',
      title: '把剧情图谱整理成可试玩、可付费、可解释的商业结构',
      summary:
        project.publish.monetization === 'Paid Ending'
          ? `${storyNodes.length} 节点 · ${reachablePaidBranchCount} 条付费入口可达 · ${paidEndingNodeIds.length} 个付费结局`
          : `${storyNodes.length} 节点 · 当前先跑免费体验`,
      primary: {
        icon: <GitBranch size={18} />,
        label: '主任务',
        value: `${selectedNode.id} · ${selectedNode.title}`,
        note: `${selectedNode.kind} · ${selectedNodeDiagnostic.readiness}% 就绪 · ${selectedNodeDiagnostic.outgoing} 出站`,
        tone: selectedNodeDiagnostic.status === 'critical' ? 'blocked' : selectedNodeDiagnostic.status === 'warn' ? 'waiting' : 'ready',
      },
      checks: [
        {
          label: '主线闭环',
          value: storyReachability.reachableEndingCount > 0 ? '可试玩' : '未闭环',
          note: `${storyReachability.reachableCount}/${storyNodes.length} 节点可达`,
          tone: storyReachability.reachableEndingCount > 0 ? 'ready' : 'blocked',
        },
        {
          label: '付费隐藏线',
          value:
            project.publish.monetization === 'Paid Ending'
              ? `${reachablePaidBranchCount} 条`
              : '未启用',
          note:
            project.publish.monetization === 'Paid Ending'
              ? `${paidEndingNodeIds.length} 个付费结局，预计 ${formatMoneyFromCents(projectedRevenuePerThousandCents, orderCurrency)}/千次`
              : '可一键生成免费线 + 付费结局',
          tone:
            project.publish.monetization !== 'Paid Ending'
              ? 'waiting'
              : reachablePaidBranchCount > 0
                ? 'ready'
                : 'blocked',
        },
        {
          label: '问题定位',
          value: storyIssueRows.length > 0 ? `${storyIssueRows.length} 项` : '无阻断',
          note: firstStoryIssue
            ? `${firstStoryIssue.nodeId}：${firstStoryIssue.issues[0]?.label}`
            : '主线、分支和付费卡点可进入试玩',
          tone: storyIssueRows.length > 0 ? 'waiting' : 'ready',
        },
      ],
      actions: [
        {
          label: '预览焦点',
          detail: '从当前节点开始试玩',
          icon: <Play size={16} fill="currentColor" />,
          action: previewSelectedNode,
        },
        {
          label: '生成付费线',
          detail: '补免费线和隐藏结局',
          icon: <KeyRound size={16} />,
          action: generatePaidHiddenLine,
        },
        {
          label: '定位待修',
          detail: firstStoryIssue ? firstStoryIssue.nodeId : '暂无阻断',
          icon: <AlertTriangle size={16} />,
          action: jumpToFirstStoryIssue,
        },
      ],
    },
    ai: {
      eyebrow: '双业务生产入口',
      title: '互动短剧为主，常规短剧生产为辅',
      summary: visibleGeneratedReview
        ? `已生成 ${visibleGeneratedReview.nodeCount} 个剧情节点、${visibleGeneratedReview.shotCount} 条视频镜头和 ${visibleGeneratedReview.exportCount} 项交付物，可继续细修、导出或升级互动短剧。`
        : `客户从这里选择业务：先做互动短剧商业闭环，或用 ${seriesGenerator.genre} / ${seriesGenerator.duration} 生成常规短剧生产包。`,
      primary: {
        icon: <Clapperboard size={18} />,
        label: '当前生产线',
        value: visibleGeneratedReview ? '生产包已生成' : '生成短剧生产包',
        note: visibleGeneratedReview
          ? `${visibleGeneratedReview.providerId} / ${visibleGeneratedReview.model}`
          : `${aiProvider?.provider || '模型检测中'} · ${aiModelLabel}`,
        tone: visibleGeneratedReview ? 'ready' : aiProvider?.productionReady ? 'waiting' : 'blocked',
      },
      checks: [
        {
          label: '互动短剧',
          value: `${storyNodes.length} 节点`,
          note: project.publish.monetization === 'Paid Ending' ? `${reachablePaidBranchCount} 条付费入口` : '可升级付费结局',
          tone: aiProvider?.productionReady ? 'ready' : 'blocked',
        },
        {
          label: '常规短剧',
          value: visibleGeneratedReview ? `${visibleGeneratedReview.shotCount} 镜` : '待生成',
          note: visibleGeneratedReview ? `${visibleGeneratedReview.exportCount} 项交付物` : `${seriesGenerator.genre} · ${seriesGenerator.platform}`,
          tone: videoJobSummary.failed > 0 ? 'blocked' : visibleGeneratedReview ? 'ready' : 'waiting',
        },
        {
          label: '视频生成',
          value: videoJobSummary.total > 0 ? `${videoJobSummary.succeeded}/${videoJobSummary.total}` : '待提交',
          note: isLiveVideoProvider ? `${videoProviderLabel} 真实生成` : 'Prompt 队列交付',
          tone: visibleGeneratedReview ? 'ready' : 'waiting',
        },
      ],
      actions: [
        {
          label: visibleGeneratedReview ? '重新生成' : '生成生产包',
          detail: '剧本、分镜、Prompt',
          icon: <Sparkles size={16} />,
          action: generateShortDramaProject,
          disabled: isSeriesGenerating || isAiBusy,
        },
        {
          label: '升级互动短剧',
          detail: '进入分支和付费线',
          icon: <GitBranch size={16} />,
          action: upgradeSeriesToInteractiveDrama,
        },
        {
          label: '提交视频队列',
          detail: isLiveVideoProvider ? '真实生成下一条' : '生成镜头任务',
          icon: <Clapperboard size={16} />,
          action: submitProductionVideoQueue,
          disabled: !visibleGeneratedReview,
        },
      ],
    },
    publish: {
      eyebrow: '发布变现运营台',
      title: '确认上线门禁、收款风险、订单异常和渠道动作',
      summary: `${commercialProgress} 门禁 · ${formatPaymentMethod(paymentProvider?.provider)} · ${formatMoneyFromCents(grossRevenueCents, orderCurrency)}`,
      primary: {
        icon: <Rocket size={18} />,
        label: '主任务',
        value: publishedBuildId ? `发布包 ${formatShortId(publishedBuildId)}` : '生成发布包',
        note: publishedBuildId ? '可复制给客户试玩和验证收款' : buildState,
        tone: publishedBuildId ? 'ready' : buildState === '正在生成发布' ? 'waiting' : 'blocked',
      },
      checks: [
        {
          label: '上线门禁',
          value: commercialReadiness?.status === 'pass' ? '通过' : commercialStatusLabel,
          note: launchBlockerRows.length > 0 ? `${launchBlockerRows.length} 项待处理` : '可进入灰度发布',
          tone: commercialReadiness?.status === 'pass' ? 'ready' : 'blocked',
        },
        {
          label: '支付验收',
          value: paidOrders.length > 0 ? `${paidOrders.length} 笔已支付` : paymentProviderReady ? '可验收' : '待配置',
          note:
            failedOrders.length > 0
              ? `${failedOrders.length} 笔失败需复核`
              : pendingOrders.length > 0
                ? `${pendingOrders.length} 笔待支付`
                : 'pending 不解锁，失败进异常队列',
          tone: failedOrders.length > 0 ? 'blocked' : paymentProviderReady ? 'ready' : 'waiting',
        },
        {
          label: '付费路径',
          value:
            project.publish.monetization === 'Paid Ending'
              ? `${reachablePaidBranchCount} 条`
              : formatMonetization(project.publish.monetization),
          note:
            project.publish.monetization === 'Paid Ending'
              ? `${paidEndingNodeIds.length} 个付费结局，解锁价 CNY ${project.publish.price}`
              : '免费模式先跑留存',
          tone:
            project.publish.monetization !== 'Paid Ending' || reachablePaidBranchCount > 0
              ? 'ready'
              : 'blocked',
        },
      ],
      actions: [
        {
          label: publishedBuildId ? '重生成包' : '生成发布包',
          detail: '保存快照并跑安全扫描',
          icon: <Layers3 size={16} />,
          action: publishBuild,
          disabled: buildState === '正在生成发布',
        },
        {
          label: '验证收款',
          detail: '创建付费结局订单',
          icon: <ShieldCheck size={16} />,
          action: verifyPaidEndingUnlock,
          disabled: paymentVerificationState.startsWith('正在'),
        },
        {
          label: '刷新守护',
          detail: '同步订单和异常队列',
          icon: <RotateCcw size={16} />,
          action: refreshLaunchGuard,
        },
      ],
    },
  }
  const activeCommandCenter = secondaryPageCommandCenters[
    activeStudioPage as keyof typeof secondaryPageCommandCenters
  ]
  const overviewActionRows: Array<{
    id: string
    label: string
    value: string
    note: string
    state: 'ready' | 'waiting'
    target: StudioPage
    cta: string
  }> = [
    {
      id: 'creation',
      label: '创作流水线',
      value: `${creationModeProgress} 阶段就绪`,
      note:
        creationModeReadyCount >= 5
          ? '可从灵感讲到发布变现'
          : '先补齐梗概、人物、分集和正文',
      state: creationModeReadyCount >= 5 ? 'ready' : 'waiting',
      target: 'creation',
      cta: '创作模式',
    },
    {
      id: 'story',
      label: '剧情可信度',
      value: `${storyNodes.length} 节点 · ${connectionCount} 分支`,
      note:
        storyNodes.length >= 4 && connectionCount >= 5
          ? '主线和选择路径可进入复核'
          : '先补齐主线长度和关键分支',
      state: storyNodes.length >= 4 && connectionCount >= 5 ? 'ready' : 'waiting',
      target: 'story',
      cta: '剧情编辑',
    },
    {
      id: 'ai',
      label: 'AI 生产',
      value: aiProvider?.productionReady ? aiModelLabel : '模型待配置',
      note: aiProvider?.productionReady ? '可生成下一幕并记录成本' : '同步模型供应商和 API Key 状态',
      state: aiProvider?.productionReady ? 'ready' : 'waiting',
      target: 'ai',
      cta: 'AI 导演',
    },
    {
      id: 'publish',
      label: '发布收入',
      value: publishedBuildId ? `#${publishedBuildId.slice(-6)}` : commercialStatusLabel,
      note: publishedBuildId ? '已有可分享发布包' : '生成发布包后可进入渠道分发',
      state: publishedBuildId || commercialReadiness?.status === 'pass' ? 'ready' : 'waiting',
      target: 'publish',
      cta: '发布变现',
    },
  ]
  const teamTrustCards = [
    {
      label: '成员',
      value: `${members.length || 1}`,
      note: `${activeMemberCount || 1} active · ${invitedMemberCount} invited`,
      tone: members.length > 0 ? 'ok' : 'info',
    },
    {
      label: '邀请',
      value: `${inviteDeliveries.length}`,
      note: failedDeliveryCount > 0 ? `${failedDeliveryCount} 条失败待处理` : '邮件记录稳定',
      tone: failedDeliveryCount > 0 ? 'warn' : inviteDeliveries.length > 0 ? 'ok' : 'info',
    },
    {
      label: '邮件服务',
      value: emailProvider?.provider || '检测中',
      note: emailProvider?.productionReady ? '生产发信已配置' : '邀请链路待确认',
      tone: emailProvider?.productionReady ? 'ok' : emailProvider === null ? 'info' : 'warn',
    },
  ]
  const activityOverviewCards = [
    {
      label: '当前筛选',
      value: selectedAuditActionLabel,
      note: `${projectTimelineEntries.length} 条项目记录`,
    },
    {
      label: '工作区记录',
      value: `${auditEntries.length}`,
      note: activeWorkspaceName,
    },
    {
      label: '最近动作',
      value: latestProjectActivity
        ? formatAuditActionLabel(latestProjectActivity.action)
        : '暂无',
      note: latestProjectActivity
        ? new Date(latestProjectActivity.createdAt).toLocaleString()
        : '保存后自动记录',
    },
  ]

  const applyProject = useCallback((nextProject: StoryProject, message: string) => {
    setProject(nextProject)
    setSelectedNodeId(nextProject.nodes[0].id)
    setRuntimeNodeId(nextProject.nodes[0].id)
    setRuntimeState(createRuntimeState(nextProject.variables))
    setRuntimePath([nextProject.nodes[0].id])
    setRuntimeMessage(message)
    writeStoredValue(STORAGE_KEY, JSON.stringify(nextProject))
  }, [])

  const recordBuildEvent = useCallback(async (
    buildId: string,
    event: {
      eventName: string
      nodeId?: string | null
      choiceId?: string | null
      metadata?: Record<string, unknown>
    },
  ) => {
    try {
      const recorded = await recordRuntimeEvent<AnalyticsEvent>(buildId, {
        sessionId: runtimeSessionIdRef.current,
        ...event,
        metadata: {
          ...channelMetadata,
          ...(event.metadata || {}),
        },
      })
      setAnalyticsEvents((current) =>
        current.some((item) => item.id === recorded.id)
          ? current
          : [...current, recorded],
      )
    } catch (error) {
      logError('analytics', error)
      // Runtime analytics should never block the player.
    }
  }, [channelMetadata])

  useEffect(() => {
    if (!previewBuildId) return
    let cancelled = false

    async function loadPublishedBuild() {
      setRuntimeMessage('正在加载发布作品')
      try {
        const { build, project: publishedProject } = await fetchPublishedBuild<
          PublishBuild,
          StoryProject
        >(previewBuildId)
        if (cancelled) return
        const normalized = normalizeProject(publishedProject)
        applyProject(normalized, `已加载发布包 v${build.version}`)
        setPublishedBuildId(build.id)
        setBuildState(`已加载 v${build.version} · ${build.status}`)
        setPublishBuilds((current) =>
          sortBuildHistory([build, ...current.filter((item) => item.id !== build.id)]),
        )
        setPreviewOnly(true)
        void recordBuildEvent(build.id, {
          eventName: 'play_opened',
          nodeId: normalized.nodes[0]?.id,
          metadata: {
            version: build.version,
            runtimeUrl: window.location.href,
          },
        })
      } catch (error) {
        logError('api', error)
        if (!cancelled) setRuntimeMessage('发布作品加载失败')
      }
    }

    void loadPublishedBuild()

    return () => {
      cancelled = true
    }
  }, [applyProject, previewBuildId, recordBuildEvent])

  useEffect(() => {
    if (!publishedBuildId || !runtimeNode?.id) return
    const eventKey = `${publishedBuildId}:${runtimeSessionIdRef.current}:${runtimeNode.id}`
    if (lastRecordedRuntimeNodeRef.current === eventKey) return
    lastRecordedRuntimeNodeRef.current = eventKey
    void recordBuildEvent(publishedBuildId, {
      eventName: 'node_viewed',
      nodeId: runtimeNode.id,
      metadata: {
        nodeKind: runtimeNode.kind,
        nodeTitle: runtimeNode.title,
      },
    })
  }, [publishedBuildId, recordBuildEvent, runtimeNode?.id, runtimeNode?.kind, runtimeNode?.title])

  useEffect(() => {
    if (!publishedBuildId) return
    let cancelled = false

    async function loadRuntimeOrders() {
      try {
        const [result, ledgerResult] = await Promise.all([
          fetchRuntimeOrders<PaymentOrder>(publishedBuildId, runtimeSessionIdRef.current),
          previewOnly
            ? Promise.resolve({ orders: [], unlock: { nodeIds: [] } })
            : fetchRuntimeOrders<PaymentOrder>(publishedBuildId),
        ])
        if (cancelled) return
        setPaymentOrders(result.orders)
        setPaymentLedgerOrders(ledgerResult.orders)
        setCheckoutState(
          result.unlock.nodeIds.length > 0
            ? '付费结局已解锁'
            : '支付服务已准备',
        )
      } catch (error) {
        logError('api', error)
        if (!cancelled) {
          setCheckoutState('支付服务暂不可用')
          setPaymentLedgerOrders([])
        }
      }
    }

    void loadRuntimeOrders()

    return () => {
      cancelled = true
    }
  }, [previewOnly, publishedBuildId])

  useEffect(() => {
    if (previewBuildId || !project.id || !projectHasRemoteRecord) return
    let cancelled = false

    async function loadBuildHistory() {
      try {
        const remoteBuilds = sortBuildHistory(
          await fetchProjectBuilds<PublishBuild>(project.id),
        )
        if (cancelled) return
        setPublishBuilds(remoteBuilds)
        if (!publishedBuildId && remoteBuilds[0]) {
          setPublishedBuildId(remoteBuilds[0].id)
          setBuildState(`最新 v${remoteBuilds[0].version} · ${remoteBuilds[0].status}`)
        }
      } catch (error) {
        logError('api', error)
        if (!cancelled) setPublishBuilds([])
      }
    }

    void loadBuildHistory()

    return () => {
      cancelled = true
    }
  }, [previewBuildId, project.id, projectHasRemoteRecord, publishedBuildId])

  useEffect(() => {
    if (previewBuildId || !activeWorkspaceId || !project.id) return
    let cancelled = false

    async function loadLaunchGuard() {
      setLaunchGuardState('正在同步上线守护')
      try {
        const guard = await fetchLaunchGuard<LaunchGuard>({
          workspaceId: activeWorkspaceId,
          projectId: project.id,
          buildId: publishedBuildId,
        })
        if (cancelled) return
        setLaunchGuard(guard)
        setLaunchGuardState(
          guard.status === 'ready'
            ? '上线守护正常'
            : guard.status === 'warning'
              ? '上线守护有待处理项'
              : '上线守护存在阻断项',
        )
      } catch (error) {
        logError('api', error)
        if (!cancelled) setLaunchGuardState('上线守护同步失败')
      }
    }

    void loadLaunchGuard()

    return () => {
      cancelled = true
    }
  }, [activeWorkspaceId, previewBuildId, project.id, publishedBuildId])

  useEffect(() => {
    if (previewBuildId || !authProviderId || !project.id) return
    if (!projectHasRemoteRecord) {
      const timer = window.setTimeout(() => {
        setDistributionJobs([])
        setDistributionJobState('保存后加载发布任务')
      }, 0)
      return () => window.clearTimeout(timer)
    }
    if (isExternalProviderAuth && !hasWorkspaceSession) {
      const timer = window.setTimeout(() => {
        setDistributionJobs([])
        setDistributionJobState('登录后加载发布任务')
      }, 0)
      return () => window.clearTimeout(timer)
    }

    let cancelled = false

    async function loadDistributionJobs() {
      try {
        const jobs = await fetchDistributionJobs<DistributionJob>(project.id)
        if (cancelled) return
        setDistributionJobs(jobs)
        setDistributionJobState(jobs.length > 0 ? `已加载 ${jobs.length} 个任务` : '暂无平台发布任务')
      } catch (error) {
        logError('api', error)
        if (!cancelled) setDistributionJobState('发布任务暂不可用')
      }
    }

    void loadDistributionJobs()

    return () => {
      cancelled = true
    }
  }, [authProviderId, hasWorkspaceSession, isExternalProviderAuth, previewBuildId, project.id, projectHasRemoteRecord])

  useEffect(() => {
    if (previewBuildId || !authProviderId || !project.id) return
    if (!projectHasRemoteRecord) {
      const timer = window.setTimeout(() => {
        setVideoGenerationJobs([])
        setFinalVideoRenders([])
        setVideoGenerationState('保存后加载视频任务')
        setFinalVideoRenderState('保存后加载成片合成任务')
      }, 0)
      return () => window.clearTimeout(timer)
    }
    if (isExternalProviderAuth && !hasWorkspaceSession) {
      const timer = window.setTimeout(() => {
        setVideoGenerationJobs([])
        setFinalVideoRenders([])
        setVideoGenerationState('登录后加载视频任务')
        setFinalVideoRenderState('登录后加载成片合成任务')
      }, 0)
      return () => window.clearTimeout(timer)
    }

    let cancelled = false

    async function loadVideoGenerationJobs() {
      try {
        const jobs = await fetchVideoGenerationJobs<VideoGenerationJob>(project.id)
        const renders = await fetchFinalVideoRenders<FinalVideoRenderJob>(project.id)
        if (cancelled) return
        setVideoGenerationJobs(jobs)
        setFinalVideoRenders(renders)
        setVideoGenerationState(jobs.length > 0 ? `已加载 ${jobs.length} 个视频任务` : '暂无视频生产任务')
        setFinalVideoRenderState(
          renders.length > 0 ? `已加载 ${renders.length} 个成片任务` : '暂无成片合成任务',
        )
      } catch (error) {
        logError('api', error)
        if (!cancelled) setVideoGenerationState('视频任务暂不可用')
        if (!cancelled) setFinalVideoRenderState('成片合成服务暂不可用')
      }
    }

    void loadVideoGenerationJobs()

    return () => {
      cancelled = true
    }
  }, [authProviderId, hasWorkspaceSession, isExternalProviderAuth, previewBuildId, project.id, projectHasRemoteRecord])

  useEffect(() => {
    if (previewBuildId || !project.id || !projectHasRemoteRecord) return
    let cancelled = false

    async function loadContentSafetyReviews() {
      try {
        const reviews = await fetchContentSafetyReviews<ContentSafetyReview>(project.id)
        if (cancelled) return
        setContentSafetyReviews(reviews)
        const latest = reviews[0]
        setContentSafetyState(
          latest
            ? `最近扫描：${latest.status} · ${latest.flagCount} 个提示`
            : '内容安全待扫描',
        )
      } catch (error) {
        logError('api', error)
        if (!cancelled) setContentSafetyState('内容安全服务暂不可用')
      }
    }

    void loadContentSafetyReviews()

    return () => {
      cancelled = true
    }
  }, [previewBuildId, project.id, projectHasRemoteRecord])

  function formatIdentityError(error: unknown) {
    if (error instanceof AuthError) {
      if (error.status === 401) return '邮箱或密码不正确'
      if (error.status === 403) return '当前站点未开放注册或登录'
      if (error.status === 422) return '邮箱或密码格式不符合要求'
      return error.message
    }
    if (error instanceof MissingIdentityError) {
      return 'Netlify Identity 尚未在站点启'
    }
    return error instanceof Error ? error.message : '登录服务暂不可用'
  }

  function formatLoginCodeError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error || '')
    if (message.includes('PhoneNumberDailyLimit')) {
      return '腾讯云限制：这个手机号今天发送次数已达上限，换手机号或明天再试'
    }
    if (
      message.includes('AppMainlandChinaDailyLimit') ||
      message.includes('mainland sms daily sending limit')
    ) {
      return '腾讯云限制：短信应用今天发送总量已达上限，明天再试或提升短信额度'
    }
    if (message.includes('PhoneNumberOneHourLimit')) {
      return '腾讯云限制：这个手机号一小时内发送次数过多，稍后再试'
    }
    if (message.includes('sms_code_not_found')) return '请先发送新的短信验证码'
    if (message.includes('sms_code_expired')) return '验证码已过期，请重新发送'
    if (message.includes('sms_code_locked')) return '验证码尝试次数过多，请重新发送'
    if (message.includes('sms_code_mismatch')) return '验证码不匹配，请输入最新短信里的 6 位数字'
    if (message.includes('too_many_sms_auth_codes')) return '发送太频繁，请稍后再试'
    if (message.includes('invalid_phone')) return '手机号格式不正确'
    if (message.includes('504')) return '短信服务超时，请稍后重发'
    return message || '验证码服务暂不可用'
  }

  function formatLoginDeliveryStatus(errorMessage = '') {
    if (!errorMessage) return '短信没有发出，请稍后重试'
    return formatLoginCodeError(new Error(errorMessage))
  }

  const refreshTeamState = useCallback(async (workspaceId: string) => {
    const [
      remoteSession,
      remoteMembers,
      remoteAuditLog,
      remoteAuthProvider,
      remoteEmailProvider,
      remotePaymentProvider,
      remoteDistributionProvider,
      remoteAiProvider,
      remoteVideoProvider,
      remoteHealth,
      remoteInviteDeliveries,
      remoteMarketingLeads,
      remoteAnalyticsEvents,
      remoteAiUsageEvents,
    ] = await Promise.all([
      fetchSession<WorkspaceSession>(workspaceId),
      fetchWorkspaceMembers<WorkspaceMember>(workspaceId),
      fetchAuditLog<AuditEntry>(),
      fetchAuthProvider<AuthProviderStatus>(),
      fetchEmailProvider<EmailProviderStatus>(),
      fetchPaymentProvider<PaymentProviderStatus>(),
      fetchDistributionProvider<DistributionProviderStatus>(),
      fetchAiProvider<AiProviderStatus>(),
      fetchVideoProvider<VideoProviderStatus>(),
      fetchHealth<ApiHealth>(),
      fetchInviteDeliveries<InviteDelivery>(workspaceId),
      fetchMarketingLeads<MarketingLead>(),
      fetchAnalyticsEvents<AnalyticsEvent>(),
      fetchAiUsageEvents<AiUsageEvent>(workspaceId),
    ])
    const remoteWorkspaces = await fetchWorkspaces<WorkspaceSummary>()
    setSession(remoteSession)
    setWorkspaceList(remoteWorkspaces)
    setMembers(remoteMembers)
    setAuditEntries(remoteAuditLog)
    setAuthProvider(remoteAuthProvider)
    setEmailProvider(remoteEmailProvider)
    setPaymentProvider(remotePaymentProvider)
    setDistributionProvider(remoteDistributionProvider)
    setAiProvider(remoteAiProvider)
    setVideoProvider(remoteVideoProvider)
    setStorageHealth(remoteHealth.storage)
    setCommercialReadiness(remoteHealth.commercialReadiness)
    setInviteDeliveries(remoteInviteDeliveries)
    setMarketingLeads(remoteMarketingLeads)
    setAnalyticsEvents(remoteAnalyticsEvents)
    setAiUsageEvents(remoteAiUsageEvents)
    setWorkspaceState('工作区已同步')
    setLeadListState(
      remoteMarketingLeads.length > 0
        ? `已同步 ${remoteMarketingLeads.length} 条申请`
        : '暂无公开页申请',
    )
  }, [])

  const syncIdentitySession = useCallback(
    async (workspaceId = activeWorkspaceId) => {
      const nextSession = await fetchSession<WorkspaceSession>(workspaceId)
      setSession(nextSession)
      setActiveWorkspaceId(nextSession.workspace.id)
      writeStoredValue(WORKSPACE_STORAGE_KEY, nextSession.workspace.id)
      await refreshTeamState(nextSession.workspace.id)
      return nextSession
    },
    [activeWorkspaceId, refreshTeamState],
  )

  useEffect(() => {
    let cancelled = false

    async function loadPublicRuntimeStatus() {
      try {
        const [
          remoteAuthProvider,
          remoteEmailProvider,
          remotePaymentProvider,
          remoteDistributionProvider,
          remoteAiProvider,
          remoteVideoProvider,
          remoteHealth,
        ] = await Promise.all([
          fetchAuthProvider<AuthProviderStatus>(),
          fetchEmailProvider<EmailProviderStatus>(),
          fetchPaymentProvider<PaymentProviderStatus>(),
          fetchDistributionProvider<DistributionProviderStatus>(),
          fetchAiProvider<AiProviderStatus>(),
          fetchVideoProvider<VideoProviderStatus>(),
          fetchHealth<ApiHealth>(),
        ])
        if (cancelled) return
        setAuthProvider(remoteAuthProvider)
        setEmailProvider(remoteEmailProvider)
        setPaymentProvider(remotePaymentProvider)
        setDistributionProvider(remoteDistributionProvider)
        setAiProvider(remoteAiProvider)
        setVideoProvider(remoteVideoProvider)
        setStorageHealth(remoteHealth.storage)
        setCommercialReadiness(remoteHealth.commercialReadiness)
        setAuthState(
          remoteAuthProvider.productionReady
            ? `${formatAuthProviderLabel(remoteAuthProvider.provider)}已接入`
            : '登录服务配置未完成',
        )
      } catch (error) {
        logError('api', error)
        if (!cancelled) setAuthState('登录服务连接失败，请刷新重试')
      }
    }

    void loadPublicRuntimeStatus()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isNetlifyIdentityAuth) return
    let cancelled = false

    async function loadIdentitySession() {
      try {
        await handleAuthCallback()
        const currentUser = await getNetlifyIdentityUser()
        if (cancelled) return
        if (currentUser?.email) {
          setLoginEmail(currentUser.email)
          setLoginName(currentUser.name || currentUser.email.split('@')[0])
          await syncIdentitySession(activeWorkspaceId)
          if (!cancelled) setAuthState(`已登录：${currentUser.email}`)
        } else {
          setAuthState('请使用真实账号登录')
        }
      } catch (error) {
        logError('api', error)
        if (!cancelled) setAuthState(formatIdentityError(error))
      }
    }

    const unsubscribe = onAuthChange((event, user: NetlifyIdentityUser | null) => {
      if (event === AUTH_EVENTS.LOGIN && user?.email) {
        setLoginEmail(user.email)
        setLoginName(user.name || user.email.split('@')[0])
        void syncIdentitySession(activeWorkspaceId)
      }
      if (event === AUTH_EVENTS.LOGOUT) {
        setAuthState('已退出真实账号')
      }
    })

    void loadIdentitySession()

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [activeWorkspaceId, isNetlifyIdentityAuth, refreshTeamState, syncIdentitySession])

  useEffect(() => {
    if (previewOnly || previewBuildId) return
    if (!authProviderId || isNetlifyIdentityAuth || hasWorkspaceSession) return
    if (!isEmailCodeAuth && !isSmsCodeAuth && !isGenericProviderAuth) return
    if (!getAuthToken()) return

    let cancelled = false

    async function restoreStoredSession() {
      try {
        setAuthState('正在恢复登录')
        const nextSession = await syncIdentitySession(activeWorkspaceId)
        if (cancelled) return
        if (nextSession.user.phone) setLoginPhone(nextSession.user.phone)
        if (nextSession.user.email && !nextSession.user.email.includes('@phone.playdrama.local')) {
          setLoginEmail(nextSession.user.email)
        }
        if (nextSession.user.displayName) setLoginName(nextSession.user.displayName)
        setAuthState(`已登录：${nextSession.user.phone || nextSession.user.email}`)
      } catch (error) {
        logError('api', error)
        if (!cancelled) setAuthState('登录已过期，请重新获取验证码')
      }
    }

    void restoreStoredSession()

    return () => {
      cancelled = true
    }
  }, [
    activeWorkspaceId,
    authProviderId,
    isEmailCodeAuth,
    isGenericProviderAuth,
    isNetlifyIdentityAuth,
    isSmsCodeAuth,
    previewOnly,
    previewBuildId,
    hasWorkspaceSession,
    syncIdentitySession,
  ])

  useEffect(() => {
    if (previewOnly || previewBuildId) return
    if (!authProviderId) return
    if (isExternalProviderAuth && !hasWorkspaceSession) {
      const timer = window.setTimeout(() => {
        setSaveState('登录后同步云端')
        setProjectListState('登录后加载作品')
        setWorkspaceState('请先登录工作区')
        setMarketingLeads([])
        setLeadListState('登录后查看内测申请')
      }, 0)
      return () => window.clearTimeout(timer)
    }
    let cancelled = false

    async function loadRemoteProject() {
      try {
        void refreshTeamState(activeWorkspaceId).catch(() => {
          if (!cancelled) setWorkspaceState('工作区部分数据暂不可用')
        })
        const remoteProjects = await fetchRemoteProjects<StoryProject>(activeWorkspaceId)
        const allProjects = remoteProjects.map((item) => normalizeProject(item))
        const normalizedProjects = allProjects.filter(
          (item) => item.lifecycleStatus !== 'archived',
        )
        const archivedProjects = allProjects.filter(
          (item) => item.lifecycleStatus === 'archived',
        )
        const currentActiveProjectId = activeProjectIdRef.current
        const currentProjectHasChanged =
          currentActiveProjectId !== initialProjectIdRef.current
        const remoteProject =
          normalizedProjects.find((item) => item.id === currentActiveProjectId) ??
          (currentProjectHasChanged
            ? null
            : normalizedProjects.find((item) => item.id === initialProjectIdRef.current) ??
              normalizedProjects[0])

        if (cancelled) return

        setProjectList(normalizedProjects)
        setArchivedProjectList(archivedProjects)
        setProjectListState(
          normalizedProjects.length > 0
            ? `已加载 ${normalizedProjects.length} 个作品`
            : '当前工作区暂无作品',
        )

        if (!remoteProject) {
          setSaveState(
            currentProjectHasChanged
              ? '当前作品已保留，作品库已同步'
              : '当前工作区暂无作品，可保存当前项目',
          )
          return
        }

        applyProject(remoteProject, '已从 API 同步')
        setSaveState('已从云端同步')
      } catch (error) {
        logError('api', error)
        if (!cancelled) {
          setProjectListState('作品暂不可用，可继续编辑离线草稿')
          setSaveState('离线草稿可继续编辑')
        }
      }
    }

    loadRemoteProject()

    return () => {
      cancelled = true
    }
  }, [
    activeWorkspaceId,
    applyProject,
    authProviderId,
    isExternalProviderAuth,
    previewOnly,
    previewBuildId,
    refreshTeamState,
    hasWorkspaceSession,
  ])

  useEffect(() => {
    const inviteTokenParam = new URLSearchParams(window.location.search).get('invite')
    if (!inviteTokenParam) return
    const inviteToken = inviteTokenParam

    let cancelled = false

    async function acceptInviteToken() {
        setInviteState('正在接受邀请')
      try {
        const nextSession = await acceptInvitation<WorkspaceSession>(inviteToken)
        if (cancelled) return
        setSession(nextSession)
        setActiveWorkspaceId(nextSession.workspace.id)
        writeStoredValue(WORKSPACE_STORAGE_KEY, nextSession.workspace.id)
        setInviteState('邀请已接受')
        await refreshTeamState(nextSession.workspace.id)
      } catch (error) {
        logError('api', error)
        if (!cancelled) setInviteState('邀请链接无效或已失效')
      }
    }

    void acceptInviteToken()

    return () => {
      cancelled = true
    }
  }, [refreshTeamState])

  function updateProject(mutator: (current: StoryProject) => StoryProject) {
    setProject((current) => ({
      ...mutator(current),
      updatedAt: new Date().toISOString(),
    }))
    setSaveState('有未保存修改')
  }

  function updatePublish(field: keyof PublishSettings, value: string) {
    updateProject((current) => ({
      ...current,
      publish: { ...current.publish, [field]: value },
    }))
  }

  function applyPublishPricePreset(price: string) {
    setPaymentVerificationState(`已选择价格 CNY ${price}`)
    updateProject((current) => ({
      ...current,
      publish: {
        ...current.publish,
        monetization:
          current.publish.monetization === 'Free'
            ? 'Paid Ending'
            : current.publish.monetization,
        price,
      },
    }))
  }

  function updateModelRouting(field: keyof ModelRouting, value: string) {
    updateProject((current) => ({
      ...current,
      modelRouting: { ...current.modelRouting, [field]: value },
    }))
  }

  function updateSeriesGenerator(field: keyof SeriesGeneratorInput, value: string) {
    setSeriesGenerator((current) => ({
      ...current,
      [field]:
        field === 'monetization'
          ? (value as PublishSettings['monetization'])
        : value,
    }))
  }

  function formatSeriesGenerationJobState(job: AiGenerationJob) {
    const progress = Math.max(0, Math.min(100, Math.round(job.progress || 0)))
    if (job.status === 'queued') return `后台队列已接收 · ${progress}%`
    if (job.status === 'running') return `${job.message || '正在生成短剧生产包'} · ${progress}%`
    if (job.status === 'succeeded') return '生产包已返回 · 写入工作台'
    if (job.status === 'failed') return job.errorMessage || job.message || '短剧生成失败'
    return job.message || '生成任务已更新'
  }

  function formatSeriesGenerationAiState(job: AiGenerationJob) {
    if (job.status === 'succeeded' && job.result) {
      const usage = job.result.usageEvent
      return `后台生成完成 · ${job.result.providerId} / ${job.result.model} · ${usage?.currency || 'USD'} ${usage?.estimatedCost || '0'}`
    }
    if (job.status === 'failed') return `后台生成失败：${job.errorMessage || job.message}`
    return `后台生成中 · ${job.stage} · ${Math.round(job.progress || 0)}%`
  }

  async function waitForSeriesGenerationJob(firstJob: AiGenerationJob) {
    let currentJob = firstJob
    setSeriesGenerationJob(currentJob)
    setSeriesGenerationState(formatSeriesGenerationJobState(currentJob))
    setAiState(formatSeriesGenerationAiState(currentJob))

    for (let attempt = 0; attempt < 90; attempt += 1) {
      if (['succeeded', 'failed', 'cancelled'].includes(currentJob.status)) {
        return currentJob
      }

      await new Promise((resolve) => setTimeout(resolve, attempt < 3 ? 1200 : 1800))
      currentJob = await fetchAiGenerationJob<AiGenerationJob>(firstJob.id)
      setSeriesGenerationJob(currentJob)
      setSeriesGenerationState(formatSeriesGenerationJobState(currentJob))
      setAiState(formatSeriesGenerationAiState(currentJob))
    }

    throw new Error('生成任务仍在后台运行，请稍后刷新任务状态')
  }

  async function runShortDramaGeneration(input: SeriesGeneratorInput) {
    if (!input.idea.trim()) {
      setSeriesGenerationState('先填写题材钩子')
      return false
    }

    setSeriesGenerationState('正在创建后台生成任务...')
    setAiState('正在把 brief 送入短剧生产队列...')
    setSeriesGenerationJob(null)
    setGeneratedProjectReview(null)
    setVideoGenerationJobs([])
    setFinalVideoRenders([])
    setVideoGenerationState('视频生产队列待提交')
    setFinalVideoRenderState('成片 MP4 待合成')

    try {
      const queuedJob = await createAiGenerationJob<AiGenerationJob>('generate-project', {
        workspaceId: activeWorkspaceId,
        brief: input,
        project: {
          id: project.id,
          title: project.title,
          modelRouting: project.modelRouting,
        },
      })
      if (!queuedJob?.id) {
        throw new Error('后台任务创建失败：API 没有返回任务编号')
      }
      const completedJob = await waitForSeriesGenerationJob(queuedJob)
      if (completedJob.status !== 'succeeded' || !completedJob.result) {
        const message =
          completedJob.errorMessage || completedJob.message || '后台生成任务没有返回可用结果'
        setSeriesGenerationState(`短剧生成失败：${message}`)
        setAiState(`AI 生成失败：${message}`)
        return false
      }

      const result = completedJob.result
      const rawNodes = Array.isArray(result.output.nodes) ? result.output.nodes : []
      if (rawNodes.length === 0) {
        setSeriesGenerationState('没有生成可用剧情节点')
        setAiState('AI 没有返回可用节点')
        return false
      }

      const usedNodeIds = new Set<string>()
      const originalIdMap = new Map<string, string>()
      const allocateNodeId = (preferredId: string, index: number) => {
        const fallbackId = `S${String(index + 1).padStart(2, '0')}`
        let nextId = preferredId || fallbackId
        if (usedNodeIds.has(nextId)) nextId = fallbackId
        let suffix = index + 1
        while (usedNodeIds.has(nextId)) {
          suffix += 1
          nextId = `S${String(suffix).padStart(2, '0')}`
        }
        usedNodeIds.add(nextId)
        return nextId
      }

      const generatedNodes = rawNodes.map((node, index) => {
        const nextId = allocateNodeId(node.id, index)
        originalIdMap.set(node.id, nextId)
        return {
          id: nextId,
          title: node.title || `剧情节点 ${index + 1}`,
          kind: nodeKinds.includes(node.kind) ? node.kind : index === 0 ? 'Hook' : 'Choice',
          summary: node.summary || '补充这一幕的冲突、线索和选择。',
          metric: node.metric || 'AI 生成',
          choices: Array.isArray(node.choices)
            ? node.choices.map((item, choiceIndex) => ({
                id: item.id || `C${index + 1}${choiceIndex + 1}`,
                label: item.label || '继续',
                targetNodeId: item.targetNodeId || nextId,
                condition: item.condition || '',
              }))
            : [],
        }
      })

      const generatedNodeIds = new Set(generatedNodes.map((node) => node.id))
      const firstEndingId =
        generatedNodes.find((node) => node.kind === 'Ending')?.id ||
        generatedNodes[generatedNodes.length - 1]?.id ||
        generatedNodes[0].id
      const remappedNodes: StoryNode[] = generatedNodes.map((node, index) => {
        const fallbackTarget = generatedNodes[index + 1]?.id || firstEndingId || node.id
        const remappedChoices = node.choices.map((item) => ({
          ...item,
          targetNodeId:
            originalIdMap.get(item.targetNodeId) ||
            (generatedNodeIds.has(item.targetNodeId) ? item.targetNodeId : fallbackTarget),
        }))

        return {
          ...node,
          choices:
            node.kind === 'Ending'
              ? []
              : remappedChoices.length > 0
                ? remappedChoices
                : [choice(`C${index + 1}A`, '继续', fallbackTarget)],
        }
      })

      const generatedVariables =
        (result.output.variables || []).slice(0, 6).map((variable, index) => ({
          id: variable.id || `var_generated_${index + 1}`,
          label: variable.label || `变量 ${index + 1}`,
          type: variableTypes.includes(variable.type) ? variable.type : 'number',
          defaultValue:
            variable.defaultValue || (variable.type === 'boolean' ? 'false' : '0'),
        })) || []
      const generatedCharacters =
        (result.output.characters || []).slice(0, 5).map((character, index) => ({
          name: character.name || `角色 ${index + 1}`,
          role: character.role || '剧情关键人物',
          trait: character.trait || '拥有明确动机、秘密和可反转关系。',
          color: character.color || ['#2563eb', '#7c3aed', '#0f766e', '#d97706'][index % 4],
        })) || []
      const nextProject: StoryProject = normalizeProject({
        ...project,
        id: createClientId('playdrama-generated'),
        title: result.output.title || input.idea.slice(0, 18) || 'AI 短剧草稿',
        template: `${input.genre} 短剧生成 v1`,
        publish: {
          ...project.publish,
          status: 'Draft',
          visibility: 'Private',
          category: input.genre,
          audience: input.audience,
          monetization: input.monetization,
          price: input.monetization === 'Free' ? '0' : input.price || project.publish.price || '9.9',
        },
        modelRouting: {
          ...project.modelRouting,
          market: 'China Mainland',
        },
        nodes: remappedNodes,
        variables: generatedVariables.length > 0 ? generatedVariables : initialVariables,
        characters: generatedCharacters.length > 0 ? generatedCharacters : initialCharacters,
        lifecycleStatus: 'active',
        archivedAt: null,
        updatedAt: new Date().toISOString(),
      })

      const usageEvent = result.usageEvent
      if (usageEvent) {
        const projectUsageEvent = usageEvent.projectId
          ? usageEvent
          : { ...usageEvent, projectId: nextProject.id }
        setAiUsageEvents((current) =>
          current.some((event) => event.id === projectUsageEvent.id)
            ? current
            : [...current, projectUsageEvent],
        )
      }

      const savedProject = await syncProjectToApi(nextProject)
      const savedEndingNodes = savedProject.nodes.filter((node) => node.kind === 'Ending')
      const savedEndingCount = savedEndingNodes.length
      const savedPaidEndingCount =
        savedProject.publish.monetization === 'Paid Ending'
          ? savedEndingNodes.filter(
              (node, index) => getNodePaywallMode(savedProject, node, index) === 'paid',
            ).length
          : 0
      const fallbackQualityChecks = [
        `${savedProject.nodes.length} 个剧情节点已串成可试玩主线`,
        `${savedProject.characters.length} 个角色已进入角色档案`,
        `${savedProject.variables.length} 个状态变量可用于条件分支`,
        savedPaidEndingCount > 0 ? '已保留免费线和付费结局的验收点' : '当前草稿按免费体验验收',
        '已生成导演分镜、视频 prompt 队列和交付导出项',
      ]
      const productionReview = buildProductionReviewPackage(
        savedProject,
        input,
        result.providerId,
        result.model,
        result.output.qualityChecks && result.output.qualityChecks.length > 0
          ? result.output.qualityChecks.slice(0, 5)
          : fallbackQualityChecks,
        result.output.note || '建议先审分镜和角色参考，再进入逐镜头视频生成。',
      )
      setGeneratedProjectReview({
        ...productionReview,
        endingCount: savedEndingCount,
        paidEndingCount: savedPaidEndingCount,
        qualityChecks:
          result.output.qualityChecks && result.output.qualityChecks.length > 0
            ? result.output.qualityChecks.slice(0, 5)
            : fallbackQualityChecks,
      })
      applyProject(savedProject, `已生成 ${savedProject.nodes.length} 个节点短剧草稿`)
      setActiveStudioPage('ai')
      setSelectedNodeId(savedProject.nodes[0].id)
      setRuntimeNodeId(savedProject.nodes[0].id)
      setSearchQuery('')
      setBuildState('等待生成发布包')
      setPublishedBuildId('')
      setPaymentOrders([])
      setPaymentLedgerOrders([])
      setPendingPaidChoice(null)
      setSeriesGenerationState(
        `已生成 ${savedProject.nodes.length} 节点、${productionReview.shotCount} 分镜、${productionReview.videoQueueCount} 条视频队列，可导出或升级互动短剧`,
      )
      setAiState(
        `已生成大厂级生产包 · ${result.providerId} / ${result.model} · ${result.usageEvent?.currency || 'USD'} ${result.usageEvent?.estimatedCost || '0'}`,
      )
      void refreshTeamState(activeWorkspaceId).catch(() => {
        setProjectListState('作品已生成，活动记录稍后同步')
      })
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : '生成失败'
      setSeriesGenerationState(`短剧生成失败：${message}`)
      setAiState(`AI 生成失败：${message}`)
      return false
    }
  }

  async function generateShortDramaProject() {
    await runShortDramaGeneration(seriesGenerator)
  }

  async function runSeriesPrimaryAction() {
    if (seriesPrimaryAction.action === 'generate') {
      await generateShortDramaProject()
      return
    }
    if (seriesPrimaryAction.action === 'video') {
      await submitProductionVideoQueue()
      return
    }
    if (seriesPrimaryAction.action === 'render') {
      await startFinalVideoRender()
      return
    }
    if (seriesPrimaryAction.action === 'export') {
      exportGeneratedProductionPack()
    }
  }

  async function generateBeginnerShortDrama() {
    setBeginnerCreationState('正在生成，已把一句话补成专业创作表单')
    setSeriesGenerator(beginnerSeriesInput)
    const succeeded = await runShortDramaGeneration(beginnerSeriesInput)
    setBeginnerCreationState(
      succeeded
        ? '已生成草稿，可在 AI 导演里细修、导出或升级互动短剧'
        : '生成未完成，请调整一句话想法后重试',
    )
  }

  async function writeClipboardText(text: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        return true
      }
    } catch (error) {
      logError('clipboard', error)
      // Fall back to the legacy path below for embedded browsers and strict permissions.
    }

    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', 'true')
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    try {
      return document.execCommand('copy')
    } finally {
      textarea.remove()
    }
  }

  async function copyProductionPromptPack() {
    if (!visibleGeneratedReview) {
      setAiState('请先生成短剧生产包')
      return
    }

    const promptPack = [
      `# ${visibleGeneratedReview.title}`,
      `Provider: ${visibleGeneratedReview.providerId} / ${visibleGeneratedReview.model}`,
      '',
      '## Character References',
      ...visibleGeneratedReview.characterAssets.map(
        (asset) =>
          `- ${asset.name}: ${asset.visualPrompt} | voice: ${asset.voice}`,
      ),
      '',
      '## Production Memory',
      ...productionMemoryRows.map(
        (item) => `- ${item.label}: ${item.value} | ${item.detail}`,
      ),
      '',
      '## Script Writing',
      ...seriesScriptRows.map(
        (item) => `- ${item.id}: ${item.title} | ${item.detail} | ${item.meta}`,
      ),
      '',
      '## Storyboard Video Prompts',
      ...visibleGeneratedReview.storyboardShots.map(
        (shot) =>
          `- ${shot.id} (${shot.duration}, ${shot.camera}, ${shot.motion}) | caption: ${buildVideoPreviewCaption(shot)} | prompt: ${shot.visualPrompt}`,
      ),
      '',
      '## Director Revision Commands',
      ...directorActionRows.map(
        (action) => `- ${action.label} / ${action.target}: ${action.instruction}`,
      ),
      '',
      '## Export Checklist',
      ...visibleGeneratedReview.exportItems.map((item) => `- ${item.label}: ${item.value}`),
    ].join('\n')

    if (await writeClipboardText(promptPack)) {
      setAiState('视频 Prompt 包已复制')
    } else {
      setAiState('复制失败，请手动选中内容')
    }
  }

  async function copyAiToolchainPlaybook() {
    const playbook = [
      '# PlayDrama AI 团队与自动工作流执行清单',
      '',
      '## 对标插件',
      '- 写代码 Agent：Codex / Cline / OpenHands，用于需求拆解、代码修改、构建验证、上线交接。',
      '- UI 体系：shadcn-ui / Radix / Storybook，用于组件一致性、无障碍、响应式和触控验收。',
      '- 自动工作流：n8n / Dify / Trigger.dev / browser-use，用于任务编排、后台重试、浏览器回归和上线门禁。',
      '',
      '## 当前平台落地状态',
      `- 模型供应商：${aiProvider?.productionReady ? `已就绪，${aiProvider.provider} / ${aiModelLabel}` : '待配置或待复核'}`,
      `- 常规短剧生产包：${visibleGeneratedReview ? `${visibleGeneratedReview.nodeCount} 节点，${visibleGeneratedReview.shotCount} 镜` : '待生成'}`,
      `- 视频队列：${videoJobSummary.total > 0 ? `${videoJobSummary.succeeded}/${videoJobSummary.total} 完成` : '待提交'}`,
      `- 发布门禁：${commercialReadiness?.status === 'pass' ? '17/17 通过' : commercialStatusLabel}`,
      `- 支付验收：${paymentProviderReady ? `${formatPaymentMethod(paymentProvider?.provider)} 可创建订单` : '待配置'}`,
      `- 发布包：${publishedBuildId ? formatShortId(publishedBuildId) : '待生成'}`,
      '',
      '## 执行顺序',
      '1. 需求进入 AI 队列：明确主业务是互动短剧，第二业务是常规短剧生成。',
      '2. 生成生产包：输出剧本、视频脚本、Prompt、交付清单。',
      '3. UI 与功能验收：按桌面、390px 手机、690px 窄桌面三档检查。',
      '4. 上线门禁：构建、数据库、支付、商用 smoke、浏览器回归全部通过后再交付客户。',
    ].join('\n')

    const copied = await writeClipboardText(playbook)
    setAiState(copied ? 'AI 团队执行清单已复制' : '复制失败，请手动选中执行清单')
  }

  function copyDirectorInstruction(action: ProductionDirectorAction) {
    const text = [
      `# ${action.label}`,
      `目标：${action.target}`,
      `指令：${action.instruction}`,
      `预期影响：${action.impact}`,
      '',
      '约束：保留制作记忆库中的人物外观、服装、声线、场景风格和前后镜头情绪连续性。',
    ].join('\n')

    setVideoGenerationState(`正在复制导演指令：${action.label}`)
    setDirectorInstructionState(`正在复制：${action.label}`)
    void writeClipboardText(text)
      .then((copied) => {
        const nextState = copied ? `已复制：${action.label}` : '复制失败，请手动选中指令'
        setVideoGenerationState(copied ? `已复制导演指令：${action.label}` : '复制失败，请手动选中指令')
        setDirectorInstructionState(nextState)
      })
      .catch(() => {
        setVideoGenerationState('复制失败，请手动选中指令')
        setDirectorInstructionState('复制失败，请手动选中指令')
      })
  }

  function exportGeneratedProductionPack() {
    if (!visibleGeneratedReview) {
      setAiState('请先生成短剧生产包')
      return
    }

    const markdown = [
      `# ${visibleGeneratedReview.title}`,
      '',
      `生成模型：${visibleGeneratedReview.providerId} / ${visibleGeneratedReview.model}`,
      `生成时间：${new Date(visibleGeneratedReview.createdAt).toLocaleString('zh-CN')}`,
      '',
      '## 大厂生产路径',
      ...seriesProductionFlowRows.map(
        (item) => `- ${item.step} ${item.title}：${item.detail}（${item.status}）`,
      ),
      '',
      '## 生产概览',
      `- 剧情节点：${visibleGeneratedReview.nodeCount}`,
      `- 导演分镜：${visibleGeneratedReview.shotCount}`,
      `- 角色参考：${visibleGeneratedReview.characterCount}`,
      `- 视频队列：${visibleGeneratedReview.videoQueueCount}`,
      `- 交付项：${visibleGeneratedReview.exportCount}/${visibleGeneratedReview.exportItems.length}`,
      '',
      '## 剧本编写',
      ...seriesScriptRows.map(
        (item) => `- ${item.id}｜${item.title}｜${item.detail}｜${item.meta}`,
      ),
      '',
      '## 视频脚本',
      ...visibleGeneratedReview.storyboardShots.map(
        (shot) =>
          `- ${shot.id}｜${shot.beat}｜${shot.duration}｜${shot.scene}｜${shot.camera}｜${shot.motion}｜字幕：${buildVideoPreviewCaption(shot)}｜Prompt：${shot.visualPrompt}`,
      ),
      '',
      '## 验收项',
      ...visibleGeneratedReview.qualityChecks.map((item) => `- ${item}`),
      '',
      '## 制作记忆库',
      ...productionMemoryRows.map(
        (item) => `- ${item.label}｜${item.value}｜${item.detail}｜${item.status}`,
      ),
      '',
      '## 导演修改指令',
      ...directorActionRows.map(
        (action) => `- ${action.label}｜${action.target}｜${action.instruction}｜${action.impact}`,
      ),
      '',
      '## 质量评分',
      ...productionQualityMetrics.map(
        (metric) => `- ${metric.label}｜${metric.value}｜${metric.threshold}｜${metric.detail}`,
      ),
      '',
      '## 分镜表',
      ...visibleGeneratedReview.storyboardShots.map(
        (shot) =>
          `- ${shot.id}｜${shot.beat}｜${shot.duration}｜${shot.camera}｜${shot.motion}｜${shot.scene}`,
      ),
      '',
      '## 角色一致性',
      ...visibleGeneratedReview.characterAssets.map(
        (asset) =>
          `- ${asset.name}｜${asset.role}｜${asset.wardrobe}｜一致性 ${asset.consistency}%｜${asset.visualPrompt}`,
      ),
      '',
      '## 视频队列',
      ...visibleGeneratedReview.videoQueue.map(
        (item) => `- ${item.id}｜${item.shotId}｜${item.provider}｜${item.model}｜${item.estimate}`,
      ),
      '',
      '## 交付清单',
      ...visibleGeneratedReview.exportItems.map((item) => `- ${item.label}：${item.value}`),
      '',
      visibleGeneratedReview.note,
    ].join('\n')

    const filename = `${visibleGeneratedReview.title.replace(/[\\/:*?"<>|]+/g, '-')}-production-pack.md`
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
    setAiState('已导出普通短剧生产包 Markdown')
  }

  function upgradeSeriesToInteractiveDrama() {
    const firstNode = project.nodes[0]
    if (firstNode) {
      setSelectedNodeId(firstNode.id)
      setSearchQuery('')
      restartRuntime(project)
    }
    setAiState('已进入互动短剧细修台，可继续加选择、付费卡点和发布验收')
    setSeriesGenerationState('普通短剧生产包已保留，可升级为互动短剧')
    setActiveStudioPage('story')
  }

  function confirmBillableVideoGeneration(count: number) {
    if (!isLiveVideoProvider) return true
    return window.confirm(
      `将调用 ${videoProviderLabel} 真实生成 ${count} 条视频，可能产生阿里云百炼费用。确认继续？`,
    )
  }

  async function submitVideoShotPairs(
    pairs: Array<{ item: ProductionVideoQueueItem; shot: ProductionStoryboardShot }>,
    source = 'playdrama-production-kit',
  ) {
    if (pairs.length === 0 || !visibleGeneratedReview) return []
    if (!confirmBillableVideoGeneration(pairs.length)) {
      setVideoGenerationState('已取消真实视频生成')
      return []
    }

    setVideoGenerationState(
      isLiveVideoProvider ? `正在生成 ${pairs.length} 条真实视频` : `正在提交 ${pairs.length} 个镜头`,
    )
    const createdJobs = await createVideoGenerationJobsBatch<VideoGenerationJob>(project.id, {
      provider: videoProvider?.provider || undefined,
      model: videoProvider?.model || undefined,
      source,
      qualityGate: 'client-preview',
      deliveryUse: 'final-cut',
      shots: pairs.map(({ item, shot }, index) => ({
        shotId: shot.id,
        nodeId: shot.nodeId,
        model: item.model,
        prompt: shot.visualPrompt,
        duration: shot.duration,
        aspectRatio: '9:16',
        beat: shot.beat,
        scene: shot.scene,
        camera: shot.camera,
        motion: shot.motion,
        caption: buildVideoPreviewCaption(shot, item.id),
        dialogue: shot.dialogue,
        characterRefs: visibleGeneratedReview.characterAssets,
        sequenceIndex: index + 1,
        source,
      })),
    })
    setVideoGenerationJobs((current) => {
      const existing = new Map(current.map((job) => [job.id, job]))
      for (const job of createdJobs) existing.set(job.id, job)
      return Array.from(existing.values()).sort((left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      )
    })
    return createdJobs
  }

  async function submitProductionVideoQueue() {
    if (!visibleGeneratedReview) {
      setVideoGenerationState('请先生成短剧生产包')
      return
    }

    const pendingShots = visibleGeneratedReview.videoQueue
      .map((item) => {
        const shot = visibleGeneratedReview.storyboardShots.find((candidate) => candidate.id === item.shotId)
        return shot ? { item, shot } : null
      })
      .filter((item): item is { item: ProductionVideoQueueItem; shot: ProductionStoryboardShot } => Boolean(item))
      .filter(({ shot }) => !videoJobByShotId.has(shot.id))
      .slice(0, videoSubmitLimit)

    if (pendingShots.length === 0) {
      setVideoGenerationState('视频队列已经提交')
      return
    }

    try {
      const createdJobs = await submitVideoShotPairs(pendingShots)
      if (createdJobs.length === 0) return
      const liveCount = createdJobs.filter((job) => job.status === 'running' || job.status === 'queued').length
      const promptReadyCount = createdJobs.filter((job) => job.status === 'prompt-ready').length
      const succeededCount = createdJobs.filter((job) => job.status === 'succeeded').length
      setVideoGenerationState(
        liveCount > 0 || succeededCount > 0
          ? `已提交 ${liveCount + succeededCount} 个真实视频任务，刷新查看结果`
          : `已生成 ${promptReadyCount} 个 Prompt 任务，等待配置视频 API Key`,
      )
    } catch (error) {
        logError('api', error)
      setVideoGenerationState(error instanceof Error ? `视频任务提交失败：${error.message}` : '视频任务提交失败')
    }
  }

  async function regenerateVideoShot(item: ProductionVideoQueueItem, shot: ProductionStoryboardShot) {
    try {
      const createdJobs = await submitVideoShotPairs([{ item, shot }], 'playdrama-video-regenerate')
      if (createdJobs.length > 0) {
        setVideoGenerationState('已提交重生成任务，刷新查看结果')
      }
    } catch (error) {
        logError('api', error)
      setVideoGenerationState(error instanceof Error ? `重生成失败：${error.message}` : '重生成失败')
    }
  }

  async function retrySubmittedVideoJob(job: VideoGenerationJob) {
    setVideoGenerationState(`正在重试 ${job.shotId}`)
    try {
      const retryJob = await retryVideoGenerationJob<VideoGenerationJob>(job.id)
      setVideoGenerationJobs((current) => {
        const existing = new Map(current.map((item) => [item.id, item]))
        existing.set(retryJob.id, retryJob)
        return Array.from(existing.values()).sort((left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        )
      })
      setVideoGenerationState(
        retryJob.status === 'failed'
          ? `重试失败：${retryJob.errorMessage || '供应商未返回成功'}`
          : `已按原参数重试 ${job.shotId}`,
      )
    } catch (error) {
        logError('api', error)
      setVideoGenerationState(error instanceof Error ? `重试失败：${error.message}` : '重试失败')
    }
  }

  async function refreshSubmittedVideoJobs() {
    const refreshableJobs = videoGenerationJobs.filter((job) => job.status === 'running' || job.status === 'queued')
    if (refreshableJobs.length === 0) {
      setVideoGenerationState('暂无运行中的视频任务')
      return
    }
    setVideoGenerationState(`正在刷新 ${refreshableJobs.length} 个视频任务`)
    try {
      const refreshedJobs: VideoGenerationJob[] = []
      for (const job of refreshableJobs.slice(0, 8)) {
        refreshedJobs.push(await refreshVideoGenerationJob<VideoGenerationJob>(job.id))
      }
      setVideoGenerationJobs((current) =>
        current.map((job) => refreshedJobs.find((item) => item.id === job.id) || job),
      )
      setVideoGenerationState(`已刷新 ${refreshedJobs.length} 个视频任务`)
    } catch (error) {
        logError('api', error)
      setVideoGenerationState(error instanceof Error ? `刷新失败：${error.message}` : '刷新失败')
    }
  }

  async function copyDistributionText(text: string, label = '内容') {
    if (await writeClipboardText(text)) {
      setDistributionState(`${label}已复制`)
    } else {
      setDistributionState('复制失败，请手动选中内容')
    }
  }

  async function copyVideoJobUrl(job: VideoGenerationJob) {
    if (!job.outputUrl) {
      setVideoGenerationState('视频链接还未生成')
      return
    }
    if (await writeClipboardText(job.outputUrl)) {
      setVideoGenerationState('视频链接已复制')
    } else {
      setVideoGenerationState('复制失败，请手动打开视频链接')
    }
  }

  async function openVideoJobPreview(job: VideoGenerationJob) {
    if (!job.outputUrl) {
      setVideoGenerationState('视频链接还未生成')
      return
    }
    if (!visibleGeneratedReview) {
      window.open(job.outputUrl, '_blank', 'noopener,noreferrer')
      return
    }

    const shot = visibleGeneratedReview.storyboardShots.find((candidate) => candidate.id === job.shotId)
    const durationSeconds = parseUiDurationSeconds(shot?.duration || job.duration, 5)
    const caption = buildVideoPreviewCaption(shot, job.request?.caption || job.request?.beat || job.shotId)
    setVideoGenerationState(`正在生成 ${job.shotId} 平台字幕预览`)
    try {
      const render = await createFinalVideoRender<FinalVideoRenderJob>(project.id, {
        title: `${visibleGeneratedReview.title}-${job.shotId}-平台预览`,
        aspectRatio: '9:16',
        source: 'playdrama-single-shot-preview',
        audioPolicy: 'keep-source-or-silent-bed-v1',
        subtitlePolicy: 'burned-in-srt-v1',
        deliveryProfile: 'single-shot-platform-preview-v1',
        storagePolicy: 'workspace-preview-v1',
        archivePolicy: 'preview-expire-v1',
        musicPolicy: 'none',
        voiceoverPolicy: 'none',
        qualityGate: 'platform-preview-v1',
        clientReview: {
          requestedBy: session?.user.displayName || session?.user.email || session?.user.phone || '客户审片',
          verdict: 'waiting-for-review',
        },
        jobIds: [job.id],
        captions: [
          {
            clipId: job.id,
            shotId: job.shotId,
            startSeconds: 0,
            endSeconds: durationSeconds,
            text: caption,
          },
        ],
        reviewChecklist: [
          {
            id: 'portrait',
            label: '竖屏包装',
            status: 'needs-review',
            owner: '剪辑',
            note: '确认横屏供应商素材已被包装为 9:16 客户预览版。',
          },
          {
            id: 'subtitle',
            label: '字幕烧录',
            status: 'needs-review',
            owner: '剪辑',
            note: '确认字幕文案、断句和位置不遮挡主体。',
          },
        ],
        clips: [
          {
            id: job.id,
            jobId: job.id,
            shotId: job.shotId,
            nodeId: job.nodeId,
            sequenceIndex: 1,
            label: shot?.beat || job.shotId,
            caption,
            duration: shot?.duration || job.duration,
            outputUrl: job.outputUrl,
            provider: job.provider,
            model: job.model,
          },
        ],
      })

      setFinalVideoRenders((current) => [render, ...current.filter((item) => item.id !== render.id)])
      let latestRender = render
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (latestRender.outputUrl || latestRender.status === 'succeeded' || latestRender.status === 'failed') break
        await waitForUiDelay(1500)
        const renders = await fetchFinalVideoRenders<FinalVideoRenderJob>(project.id)
        setFinalVideoRenders(renders)
        latestRender = renders.find((item) => item.id === render.id) || latestRender
        setVideoGenerationState(`${formatFinalVideoRenderStatus(latestRender.status)} · ${job.shotId} 平台字幕预览`)
      }

      if (latestRender.outputUrl) {
        setVideoGenerationState(`平台字幕预览已生成：${job.shotId}`)
        window.open(latestRender.outputUrl, '_blank', 'noopener,noreferrer')
        return
      }
      setVideoGenerationState(
        latestRender.status === 'failed'
          ? `平台字幕预览失败：${latestRender.errorMessage || '请重试'}`
          : '平台字幕预览已创建，稍后点“刷新成片”查看',
      )
    } catch (error) {
        logError('api', error)
      setVideoGenerationState(error instanceof Error ? `平台字幕预览失败：${error.message}` : '平台字幕预览失败')
    }
  }

  function exportFinalVideoDeliveryPack() {
    if (!visibleGeneratedReview) {
      setVideoGenerationState('请先生成短剧生产包')
      return
    }

    const completedRows = videoShotPipelineRows.filter((row) => row.readyForDelivery && row.job)
    if (completedRows.length === 0) {
      setVideoGenerationState('至少先完成 1 条可预览视频，再导出成片交付包')
      return
    }

    const failedRows = videoShotPipelineRows.filter((row) => row.job?.status === 'failed')
    const missingRows = videoShotPipelineRows.filter((row) => !row.job)
    const markdown = [
      `# ${visibleGeneratedReview.title} 成片交付包`,
      '',
      `导出时间：${new Date().toLocaleString('zh-CN')}`,
      `视频供应商：${videoProviderLabel}`,
      `模型：${videoProvider?.model || '按任务记录'}`,
      `交付状态：${videoPipelineStatusText}`,
      '',
      '## 制作记忆库',
      ...productionMemoryRows.map(
        (item) => `- ${item.label}：${item.value}，${item.detail}`,
      ),
      '',
      '## 质量验收',
      ...productionQualityMetrics.map(
        (metric) => `- ${metric.label}：${metric.value}（${metric.threshold}），${metric.detail}`,
      ),
      '',
      '## 有序剪辑清单',
      ...completedRows.map((row, index) => {
        const shot = visibleGeneratedReview.storyboardShots.find(
          (candidate) => candidate.id === row.item.shotId,
        )
        return [
          `${index + 1}. ${row.item.shotId}｜${shot?.beat || row.item.id}`,
          `   - 时长：${shot?.duration || row.job?.duration || '待定'}`,
          `   - 镜头：${shot?.camera || '按原分镜'} / ${shot?.motion || '按原动作'}`,
          `   - 素材：${row.job?.outputUrl}`,
          `   - 任务：${row.job?.provider} / ${row.job?.model} / ${row.job?.id}`,
        ].join('\n')
      }),
      '',
      '## 未完成镜头',
      failedRows.length === 0 && missingRows.length === 0
        ? '- 无'
        : [
            ...failedRows.map(
              (row) => `- ${row.item.shotId}：生成失败，${row.job?.errorMessage || '可按原参数重试'}`,
            ),
            ...missingRows.map((row) => `- ${row.item.shotId}：未提交`),
          ].join('\n'),
      '',
      '## 剪辑说明',
      '- 画幅：9:16 竖屏短剧',
      '- 顺序：按“有序剪辑清单”从上到下拼接',
      '- 转场：默认硬切，悬疑和反转场景可加 6-8 帧闪白或快速推近',
      '- 字幕：保留角色台词和关键选择提示，付费结局前保留停顿',
      '- 音频：先用统一环境音和轻音乐垫底，关键反转处补音效',
    ].join('\n')

    const blob = new Blob([`\uFEFF${markdown}`], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${visibleGeneratedReview.title.replace(/[\\/:*?"<>|]+/g, '-')}-final-cut-pack.md`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setVideoGenerationState(`已导出 ${completedRows.length} 条视频的成片交付包`)
  }

  async function startFinalVideoRender() {
    if (!visibleGeneratedReview) {
      setFinalVideoRenderState('请先生成短剧生产包')
      return
    }

    const completedRows = videoShotPipelineRows.filter((row) => row.readyForDelivery && row.job)
    if (completedRows.length === 0) {
      setFinalVideoRenderState('至少先完成 1 条可预览视频，再合成 MP4')
      return
    }

    setFinalVideoRenderState(`正在创建 ${completedRows.length} 条素材的 MP4 合成任务`)
    try {
      let captionCursor = 0
      const renderClips = completedRows.map((row, index) => {
        const shot = visibleGeneratedReview.storyboardShots.find(
          (candidate) => candidate.id === row.item.shotId,
        )
        const caption = shot?.beat || row.item.id
        return {
          id: row.item.id,
          jobId: row.job?.id,
          shotId: row.item.shotId,
          nodeId: row.job?.nodeId,
          sequenceIndex: index + 1,
          label: shot?.beat || row.item.id,
          caption,
          duration: shot?.duration || row.job?.duration,
          outputUrl: row.job?.outputUrl || '',
          provider: row.job?.provider,
          model: row.job?.model,
        }
      })
      const captions = renderClips.map((clip) => {
        const durationMatch = String(clip.duration || '').match(/(\d+(?:\.\d+)?)/)
        const rawDuration = durationMatch ? Number(durationMatch[1]) : 5
        const durationSeconds = Number.isFinite(rawDuration) ? Math.max(1.5, Math.min(rawDuration, 30)) : 5
        const caption = {
          clipId: clip.id,
          shotId: clip.shotId,
          startSeconds: captionCursor,
          endSeconds: captionCursor + durationSeconds,
          text: clip.caption || clip.label,
        }
        captionCursor += durationSeconds
        return caption
      })
      const render = await createFinalVideoRender<FinalVideoRenderJob>(project.id, {
        title: visibleGeneratedReview.title,
        aspectRatio: '9:16',
        source: 'playdrama-studio-ui',
        audioPolicy: finalVideoAudioPolicy,
        subtitlePolicy: finalVideoSubtitlePolicy,
        deliveryProfile: activeFinalVideoDeliveryMode.deliveryProfile,
        storagePolicy: 'workspace-retention-v1',
        archivePolicy: activeFinalVideoDeliveryMode.archivePolicy,
        musicPolicy: finalVideoMusicPolicy,
        voiceoverPolicy: finalVideoVoiceoverPolicy,
        qualityGate: activeFinalVideoDeliveryMode.qualityGate,
        clientReview: {
          requestedBy: session?.user.displayName || session?.user.email || session?.user.phone || '客户审片',
          verdict: 'waiting-for-review',
        },
        jobIds: completedRows.map((row) => row.job?.id || '').filter(Boolean),
        captions,
        reviewChecklist: [
          {
            id: 'hook',
            label: '前三秒钩子',
            status: 'needs-review',
            owner: '导演',
            note: '确认开场是否立刻给出冲突、目标或悬念。',
          },
          {
            id: 'continuity',
            label: '人物和场景连续性',
            status: 'needs-review',
            owner: '制片',
            note: '确认角色、服装、空间和镜头顺序没有明显跳变。',
          },
          {
            id: 'captions',
            label: '字幕断句',
            status: 'needs-review',
            owner: '剪辑',
            note:
              finalVideoSubtitleMode === 'burned-in'
                ? '已请求字幕烧录，同时保留 SRT 侧挂文件作为交付备份。'
                : 'SRT 已自动生成，交付前需复核语义和节奏。',
          },
          {
            id: 'rights',
            label: '素材商用授权',
            status: 'needs-review',
            owner: '运营',
            note: '确认供应商素材、字体、音乐和人物肖像可用于客户演示。',
          },
          {
            id: 'archive',
            label: '成片归档和链接',
            status: activeFinalVideoDeliveryMode.id === 'cdn-archive' ? 'needs-review' : 'pass',
            owner: '运营',
            note:
              activeFinalVideoDeliveryMode.id === 'cdn-archive'
                ? '本次按 CDN 归档版合成，后续需要回填对象存储或 CDN 长期地址。'
                : '站内短链可用于内测审片，长期 CDN 地址后续回填。',
          },
        ],
        reviewNotes: finalVideoReviewNote.trim()
          ? [
              {
                author: session?.user.displayName || session?.user.email || session?.user.phone || '制作人',
                frame: '全片',
                severity: finalVideoReviewVerdict,
                text: finalVideoReviewNote.trim(),
              },
            ]
          : [],
        clips: renderClips,
      })
      setFinalVideoRenders((current) => [render, ...current.filter((item) => item.id !== render.id)])
      setFinalVideoRenderState(`${formatFinalVideoRenderStatus(render.status)} · ${render.clipCount} 条素材`)
    } catch (error) {
        logError('api', error)
      setFinalVideoRenderState(error instanceof Error ? `MP4 合成任务创建失败：${error.message}` : 'MP4 合成任务创建失败')
    }
  }

  async function refreshFinalVideoRenders() {
    if (!project.id || !projectHasRemoteRecord) {
      setFinalVideoRenderState('保存作品后再刷新成片任务')
      return
    }
    setFinalVideoRenderState('正在刷新成片任务')
    try {
      const renders = await fetchFinalVideoRenders<FinalVideoRenderJob>(project.id)
      setFinalVideoRenders(renders)
      const latest = renders[0]
      setFinalVideoRenderState(latest ? `${formatFinalVideoRenderStatus(latest.status)} · ${latest.clipCount} 条素材` : '暂无成片合成任务')
    } catch (error) {
        logError('api', error)
      setFinalVideoRenderState(error instanceof Error ? `刷新成片任务失败：${error.message}` : '刷新成片任务失败')
    }
  }

  async function retryLatestFinalVideoRender() {
    if (!latestFinalVideoRender) {
      setFinalVideoRenderState('暂无可重试的成片任务')
      return
    }
    setFinalVideoRenderState(`正在重试 ${formatShortId(latestFinalVideoRender.id)}`)
    try {
      const render = await retryFinalVideoRender<FinalVideoRenderJob>(latestFinalVideoRender.id)
      setFinalVideoRenders((current) => [render, ...current.filter((item) => item.id !== render.id)])
      setFinalVideoRenderState(`${formatFinalVideoRenderStatus(render.status)} · ${render.clipCount} 条素材`)
    } catch (error) {
        logError('api', error)
      setFinalVideoRenderState(error instanceof Error ? `重试成片任务失败：${error.message}` : '重试成片任务失败')
    }
  }

  async function saveFinalVideoReviewNote() {
    if (!latestFinalVideoRender) {
      setFinalVideoRenderState('先合成一个成片版本，再保存审片批注')
      return
    }
    const text = finalVideoReviewNote.trim()
    if (!text) {
      setFinalVideoRenderState('先填写客户审片意见')
      return
    }

    setFinalVideoRenderState(`正在保存 ${formatShortId(latestFinalVideoRender.id)} 的审片批注`)
    try {
      const render = await updateFinalVideoRenderReview<FinalVideoRenderJob>(
        latestFinalVideoRender.id,
        {
          verdict: finalVideoReviewVerdict,
          note: {
            author: session?.user.displayName || session?.user.email || session?.user.phone || '客户审片',
            frame: '全片',
            severity: finalVideoReviewVerdict,
            text,
          },
        },
      )
      setFinalVideoRenders((current) => [render, ...current.filter((item) => item.id !== render.id)])
      setFinalVideoRenderState(`${formatFinalVideoReviewVerdict(finalVideoReviewVerdict)} · 批注已写入交付清单`)
      setFinalVideoReviewNote('')
    } catch (error) {
        logError('api', error)
      setFinalVideoRenderState(error instanceof Error ? `审片批注保存失败：${error.message}` : '审片批注保存失败')
    }
  }

  async function createPlatformDistributionJob(channel: DistributionChannel) {
    if (!publishedBuildId) {
      setDistributionJobState('请先生成发布包')
      setActiveStudioPage('publish')
      return
    }

    setDistributionJobState(`正在生成${formatDistributionChannel(channel)}任务`)
    try {
      const job = await createDistributionJob<DistributionJob>(project.id, {
        channel,
        buildId: publishedBuildId,
      })
      setDistributionJobs((current) => [
        job,
        ...current.filter((item) => item.id !== job.id),
      ])
      setDistributionJobState(
        `${formatDistributionChannel(channel)}：${formatDistributionJobStatus(job.status)}`,
      )
      if (job.targetUrl) setDistributionState(`${formatDistributionChannel(channel)}发布链接已生成`)
    } catch (error) {
        logError('api', error)
      setDistributionJobState(`${formatDistributionChannel(channel)}任务生成失败`)
    }
  }

  async function refreshLaunchGuard() {
    if (!activeWorkspaceId) {
      setLaunchGuardState('登录后同步上线守护')
      return null
    }
    setLaunchGuardState('正在同步上线守护')
    try {
      const guard = await fetchLaunchGuard<LaunchGuard>({
        workspaceId: activeWorkspaceId,
        projectId: project.id,
        buildId: publishedBuildId,
      })
      setLaunchGuard(guard)
      setLaunchGuardState(
        guard.status === 'ready'
          ? '上线守护正常'
          : guard.status === 'warning'
            ? '上线守护有待处理项'
            : '上线守护存在阻断项',
      )
      return guard
    } catch (error) {
        logError('api', error)
      setLaunchGuardState('上线守护同步失败')
      return null
    }
  }

  async function refreshPaymentLedger() {
    if (!publishedBuildId) {
      setPaymentVerificationState('请先生成发布包')
      return null
    }

    setPaymentVerificationState('正在回读订单和解锁状态')
    try {
      const [result, ledgerResult] = await Promise.all([
        fetchRuntimeOrders<PaymentOrder>(publishedBuildId, runtimeSessionIdRef.current),
        fetchRuntimeOrders<PaymentOrder>(publishedBuildId),
      ])
      setPaymentOrders(result.orders)
      setPaymentLedgerOrders(ledgerResult.orders)
      const unlockedCount = result.unlock.nodeIds.length
      setCheckoutState(unlockedCount > 0 ? '付费结局已解锁' : '支付服务已准备')
      setPaymentVerificationState(
        unlockedCount > 0
          ? `当前会话 ${result.orders.length} 笔，全量 ${ledgerResult.orders.length} 笔，${unlockedCount} 个节点已解锁`
          : `当前会话 ${result.orders.length} 笔，全量 ${ledgerResult.orders.length} 笔，暂无已支付解锁`,
      )
      void refreshLaunchGuard()
      return result
    } catch (error) {
        logError('api', error)
      setPaymentVerificationState('订单回读失败，请检查支付服务')
      return null
    }
  }

  function exportPaymentOrdersCsv() {
    const rows = visiblePaymentOrders
      .slice()
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    if (rows.length === 0) {
      setPaymentOpsState('当前筛选没有可导出的订单')
      return
    }
    const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
    const headers = [
      'order_id',
      'status',
      'provider',
      'amount',
      'currency',
      'build_id',
      'session_id',
      'item_id',
      'unlock_node_ids',
      'provider_order_id',
      'wechat_transaction_id',
      'paid_at',
      'created_at',
      'ops_note',
    ]
    const csv = [
      headers.join(','),
      ...rows.map((order) => {
        const metadata = order.metadata || {}
        return [
          order.id,
          order.status,
          order.provider,
          (order.amount / 100).toFixed(2),
          order.currency,
          order.buildId,
          order.sessionId,
          order.itemId || '',
          (order.unlockNodeIds || []).join('|'),
          typeof metadata.providerOrderId === 'string' ? metadata.providerOrderId : '',
          typeof metadata.wechatTransactionId === 'string' ? metadata.wechatTransactionId : '',
          order.paidAt || '',
          order.createdAt,
          typeof metadata.opsNote === 'string' ? metadata.opsNote : '',
        ].map(escapeCsv).join(',')
      }),
    ].join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `playdrama-orders-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setPaymentOpsState(`已导出 ${rows.length} 笔订单`)
  }

  async function applyPaymentOrderOps(
    order: PaymentOrder,
    status: 'pending' | 'failed' | 'refunded',
  ) {
    const note =
      status === 'failed'
        ? '运营标记失败：客户未完成支付或收银台异常'
        : status === 'refunded'
          ? '运营登记退款撤权：外部退款后同步平台权益'
          : '运营恢复待支付：允许客户继续完成支付'
    setPaymentOpsState(`正在更新 ${formatShortId(order.id)}`)
    try {
      const updated = await updatePaymentOrderOps<PaymentOrder>(order.id, { status, note })
      setPaymentOrders((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      setPaymentLedgerOrders((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      setPaymentOpsState(`${formatShortId(updated.id)} 已更新为${formatPaymentOrderStatus(updated.status)}`)
      void refreshLaunchGuard()
    } catch (error) {
        logError('api', error)
      setPaymentOpsState(error instanceof Error ? `订单更新失败：${error.message}` : '订单更新失败')
    }
  }

  async function verifyPaidEndingUnlock() {
    if (!publishedBuildId) {
      setPaymentVerificationState('请先生成发布包')
      setBuildState('请先生成发布包再验证付费')
      return
    }

    if (project.publish.monetization !== 'Paid Ending') {
      setPaymentVerificationState('当前作品未启用付费结局')
      return
    }

    const targetNodeId = paidEndingNodeIds[0]
    if (!targetNodeId) {
      setPaymentVerificationState('没有可验证的结局节点')
      return
    }

    setPaymentVerificationState(`正在创建 ${targetNodeId} 解锁订单`)
    try {
      const result = await createRuntimeOrder<PaymentOrder>(publishedBuildId, {
        sessionId: runtimeSessionIdRef.current,
        itemType: 'ending',
        itemId: targetNodeId,
        unlockNodeIds: paidEndingNodeIds,
        provider: selectedPaymentMethod,
      })
      setPaymentOrders((current) => [
        result.order,
        ...current.filter((order) => order.id !== result.order.id),
      ])
      setPaymentLedgerOrders((current) => [
        result.order,
        ...current.filter((order) => order.id !== result.order.id),
      ])
      setCheckoutState(
        result.unlock.nodeIds.length > 0 ? '付费结局已解锁' : '订单已创建，等待支付确认',
      )
      setPaymentVerificationState(
        result.unlock.nodeIds.length > 0
          ? `${formatPaymentMethod(result.order.provider)}验证通过，已解锁 ${result.unlock.nodeIds.length} 个节点`
          : `${formatPaymentMethod(result.order.provider)}订单已创建，等待支付回调`,
      )
      await refreshPaymentLedger()
    } catch (error) {
        logError('api', error)
      setPaymentVerificationState('付费验证失败，请检查支付配置')
    }
  }

  function openPublishedBuildPreview(buildId: string) {
    const previewUrl = `${window.location.origin}${window.location.pathname}?preview=1&build=${encodeURIComponent(buildId)}`
    window.history.replaceState(null, '', previewUrl)
    setPublishedBuildId(buildId)
    setPreviewBuildId(buildId)
    setPreviewOnly(true)
    setRuntimeMessage('已进入发布包预览')
  }

  function openSharePreview() {
    if (publishedBuildId) {
      openPublishedBuildPreview(publishedBuildId)
      void recordBuildEvent(publishedBuildId, {
        eventName: 'share_preview_opened',
        nodeId: runtimeNode.id,
        metadata: {
          projectId: project.id,
        },
      })
      return
    }

    const previewUrl = `${window.location.origin}${window.location.pathname}?preview=1`
    window.history.replaceState(null, '', previewUrl)
    setPreviewOnly(true)
    setRuntimeMessage('已进入作品预览')
  }

  function exitSharePreview() {
    window.history.replaceState(null, '', window.location.pathname)
    setPreviewOnly(false)
    setPreviewBuildId('')
    setRuntimeMessage('已返回创作台')
  }

  function restoreBuildSnapshot(build: PublishBuild) {
    if (!build.snapshot) {
      setBuildState('这个发布包没有可载入的快')
      return
    }

    const restoredProject = normalizeProject(build.snapshot)
    applyProject(restoredProject, `已载入 v${build.version} 发布快照`)
    setPublishedBuildId(build.id)
    setBuildState(`已载入 v${build.version} · ${build.status}`)
  }

  function restartRuntime(nextProject = project) {
    const firstNode = nextProject.nodes[0]
    lastRecordedRuntimeNodeRef.current = ''
    setRuntimeNodeId(firstNode.id)
    setRuntimeState(createRuntimeState(nextProject.variables))
    setRuntimePath([firstNode.id])
    setPendingPaidChoice(null)
    setRuntimeMessage('已重新开始')
  }

  function previewSelectedNode() {
    lastRecordedRuntimeNodeRef.current = ''
    setRuntimeNodeId(selectedNode.id)
    setRuntimeState(createRuntimeState(project.variables))
    setRuntimePath([selectedNode.id])
    setPendingPaidChoice(null)
    setRuntimeMessage(`正在预览 ${selectedNode.id} · ${selectedNode.title}`)
  }

  function jumpToFirstStoryIssue() {
    if (!firstStoryIssue) {
      setRuntimeMessage('剧情诊断暂无待处理项')
      return
    }

    setSelectedNodeId(firstStoryIssue.nodeId)
    setSearchQuery('')
    setRuntimeMessage(`已定位 ${firstStoryIssue.nodeId} · ${firstStoryIssue.issues[0]?.label}`)
  }

  function focusStoryNode(nodeId: string, reason: string) {
    setSelectedNodeId(nodeId)
    setSearchQuery('')
    setRuntimeMessage(reason)
  }

  function openGeneratedRefinement() {
    if (!visibleGeneratedReview) {
      setBeginnerCreationState('先生成草稿，再进入细修')
      setActiveStudioPage('overview')
      return
    }

    const firstNodeId = project.nodes[0]?.id
    if (firstNodeId) setSelectedNodeId(firstNodeId)
    setSearchQuery('')
    setActiveStudioPage('story')
    setRuntimeMessage('已进入剧情编辑，先调主线节奏、分支选择和付费卡点')
    setBeginnerCreationState('正在细修草稿，完成后可发布试卖')
  }

  async function publishBeginnerTrial() {
    if (!visibleGeneratedReview && storyNodes.length < 3) {
      setBeginnerCreationState('先生成草稿，再发布试卖')
      setActiveStudioPage('overview')
      return
    }

    setActiveStudioPage('publish')
    if (publishedBuildId) {
      setBeginnerCreationState(`发布包 #${publishedBuildId.slice(-6)} 已可试卖和复制试玩`)
      return
    }

    const build = await publishBuild()
    if (build) {
      setBeginnerCreationState(`已生成发布包 #${build.id.slice(-6)}，可复制给朋友试玩`)
    }
  }

  async function copyBeginnerFriendTrialLink() {
    if (!publishedBuildId) {
      setBeginnerCreationState('先点发布试卖生成稳定链接，再复制给朋友')
      setDistributionState('请先生成发布包，避免朋友看到本地草稿')
      setActiveStudioPage('publish')
      return
    }

    if (await writeClipboardText(beginnerFriendTrialUrl)) {
      setBeginnerCreationState('朋友试玩链接已复制，访问和选择会进入数据回流')
      setDistributionState('朋友试玩链接已复制')
      setRuntimeMessage('朋友试玩链接已复制')
    } else {
      setBeginnerCreationState('复制失败，请手动复制发布链接')
      setDistributionState('复制失败，请手动选中链接')
    }
  }

  function choiceRequiresPayment(item: StoryChoice) {
    const target = storyNodes.find((node) => node.id === item.targetNodeId)
    return (
      Boolean(target) &&
      target?.kind === 'Ending' &&
      paidEndingNodeIds.includes(target.id) &&
      !unlockedPaidNodeIds.has(target.id)
    )
  }

  function moveToChoiceTarget(item: StoryChoice) {
    const allowed = evaluateCondition(item.condition, runtimeState)
    if (!allowed) {
      setRuntimeMessage(`条件未满足：${item.condition}`)
      return
    }

    const target = storyNodes.find((node) => node.id === item.targetNodeId)
    if (!target) {
      setRuntimeMessage(`目标节点不存在：${item.targetNodeId}`)
      return
    }

    setRuntimeNodeId(target.id)
    setSelectedNodeId(target.id)
    setRuntimePath((current) => [...current, target.id])
    setRuntimeMessage(`进入 ${target.id} · ${target.title}`)

    if (publishedBuildId) {
      void recordBuildEvent(publishedBuildId, {
        eventName: 'choice_selected',
        nodeId: runtimeNode.id,
        choiceId: item.id,
        metadata: {
          choiceLabel: item.label,
          targetNodeId: target.id,
          targetKind: target.kind,
        },
      })
      if (target.kind === 'Ending') {
        void recordBuildEvent(publishedBuildId, {
          eventName: 'ending_reached',
          nodeId: target.id,
          metadata: {
            endingTitle: target.title,
          },
        })
      }
    }
  }

  function playChoice(item: StoryChoice) {
    if (choiceRequiresPayment(item)) {
      setPendingPaidChoice(item)
      setRuntimeMessage(`该结局需要支付 ${project.publish.price} 元后解锁`)
      setCheckoutState('等待支付确认')
      return
    }

    moveToChoiceTarget(item)
  }

  async function refreshPaymentStatus(choice = pendingPaidChoice) {
    if (!publishedBuildId) return
    try {
      const [result, ledgerResult] = await Promise.all([
        fetchRuntimeOrders<PaymentOrder>(publishedBuildId, runtimeSessionIdRef.current),
        fetchRuntimeOrders<PaymentOrder>(publishedBuildId),
      ])
      setPaymentOrders(result.orders)
      setPaymentLedgerOrders(ledgerResult.orders)
      const paidTargetId = choice?.targetNodeId
      const isUnlocked = Boolean(
        paidTargetId && result.unlock.nodeIds.includes(paidTargetId),
      )
      if (isUnlocked && choice) {
        setPendingPaidChoice(null)
        setCheckoutState('支付已确认，付费结局已解锁')
        moveToChoiceTarget(choice)
        return
      }
      setCheckoutState(
        result.unlock.nodeIds.length > 0
          ? '支付已确认，付费结局已解锁'
          : '等待支付回调确认',
      )
    } catch (error) {
        logError('api', error)
      setCheckoutState('支付状态刷新失败')
    }
  }

  async function unlockPaidEnding() {
    if (!publishedBuildId || !pendingPaidChoice) {
      setCheckoutState('请先生成发布包再解锁')
      return
    }
    const target = storyNodes.find((node) => node.id === pendingPaidChoice.targetNodeId)
    if (!target) {
      setCheckoutState('目标结局不存在')
      return
    }

    setCheckoutState('正在创建支付订单')
    try {
      const result = await createRuntimeOrder<PaymentOrder>(publishedBuildId, {
        sessionId: runtimeSessionIdRef.current,
        itemType: 'ending',
        itemId: target.id,
        unlockNodeIds: paidEndingNodeIds,
        provider: selectedPaymentMethod,
      })
      setPaymentOrders((current) => [
        result.order,
        ...current.filter((order) => order.id !== result.order.id),
      ])
      setPaymentLedgerOrders((current) => [
        result.order,
        ...current.filter((order) => order.id !== result.order.id),
      ])
      const checkoutUrl =
        typeof result.order.metadata?.checkoutUrl === 'string'
          ? result.order.metadata.checkoutUrl
          : ''

      if (result.order.status === 'paid') {
        setPendingPaidChoice(null)
        setCheckoutState(
          `已支付 ${result.order.currency} ${(result.order.amount / 100).toFixed(2)}`,
        )
        moveToChoiceTarget(pendingPaidChoice)
        return
      }

      setCheckoutState(
        checkoutUrl
          ? '订单已创建，请完成支付后刷新状态'
          : '订单已创建，等待支付确认',
      )
      if (checkoutUrl) {
        window.open(checkoutUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (error) {
        logError('api', error)
      setCheckoutState('订单创建失败，请稍后重试')
    }
  }

  function updateRuntimeValue(key: string, value: string) {
    setRuntimeState((current) => ({ ...current, [key]: value }))
    setRuntimeMessage('变量已更')
  }

  function updateSelectedNode(field: keyof StoryNode, value: string) {
    updateProject((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === selectedNodeId ? { ...node, [field]: value } : node,
      ),
    }))
  }

  function updateNodePaywall(nodeId: string, paywall: NodePaywall) {
    updateProject((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === nodeId ? { ...node, paywall } : node,
      ),
    }))
    setRuntimeMessage(`${nodeId} 已标记为${formatNodePaywallMode(paywall)}`)
  }

  function generatePaidHiddenLine(options: { trialMode?: boolean } = {}) {
    let focusNodeId = selectedNodeId
    let createdPaidEnding = false

    updateProject((current) => {
      const existingIds = new Set(current.nodes.map((node) => node.id))
      const allocateNodeId = () => {
        let index = current.nodes.length + 1
        let nextId = `S${String(index).padStart(2, '0')}`
        while (existingIds.has(nextId)) {
          index += 1
          nextId = `S${String(index).padStart(2, '0')}`
        }
        existingIds.add(nextId)
        return nextId
      }
      const hiddenSignalVariable =
        current.variables.find(
          (variable) => variable.id === 'hidden_signal' || variable.label === '隐藏线索',
        ) || null
      const variableId = hiddenSignalVariable?.id || 'hidden_signal'
      const variables = hiddenSignalVariable
        ? current.variables
        : [
            ...current.variables,
            {
              id: variableId,
              label: '隐藏线索',
              type: 'number' as const,
              defaultValue: '2',
            },
          ]
      const endingNodes = current.nodes.filter((node) => node.kind === 'Ending')
      const endingIndexByNodeId = new Map(endingNodes.map((node, index) => [node.id, index]))
      const freeEnding = endingNodes[0] || null
      const existingPaidEnding = endingNodes.find(
        (node) =>
          getNodePaywallMode(current, node, endingIndexByNodeId.get(node.id) || 0) === 'paid',
      )
      const paidEndingId = existingPaidEnding?.id || allocateNodeId()
      const sourceNode =
        current.nodes
          .filter((node) => node.kind !== 'Ending')
          .slice()
          .reverse()
          .find((node) =>
            node.choices.some((choiceItem) =>
              freeEnding ? choiceItem.targetNodeId === freeEnding.id : Boolean(choiceItem.targetNodeId),
            ),
          ) ||
        current.nodes.find((node) => node.kind !== 'Ending') ||
        current.nodes[0]
      const sourceNodeId = sourceNode.id
      const paidChoiceExists = sourceNode.choices.some(
        (choiceItem) => choiceItem.targetNodeId === paidEndingId,
      )
      const nodes = current.nodes.map((node) => {
        if (freeEnding && node.id === freeEnding.id) {
          return {
            ...node,
            title: node.title.includes('普通') ? node.title : `普通结局：${node.title}`,
            metric: node.metric.includes('免费') ? node.metric : '免费结局',
            paywall: 'free' as const,
          }
        }
        if (existingPaidEnding && node.id === existingPaidEnding.id) {
          return {
            ...node,
            title: node.title.includes('隐藏') ? node.title : `隐藏结局：${node.title}`,
            metric: node.metric.includes('付费') ? node.metric : '付费隐藏结局',
            paywall: 'paid' as const,
          }
        }
        if (node.id !== sourceNodeId || paidChoiceExists) return node

        return {
          ...node,
          metric: node.metric.includes('付费卡点') ? node.metric : `${node.metric} · 付费卡点`,
          choices: [
            ...node.choices,
            choice(
              createClientId('PAY'),
              '解锁隐藏结局',
              paidEndingId,
              `${variableId} >= 2`,
            ),
          ],
        }
      })

      if (!existingPaidEnding) {
        createdPaidEnding = true
        nodes.push({
          id: paidEndingId,
          title: '隐藏结局：真正的反转',
          kind: 'Ending',
          summary: '付费隐藏线揭开主线没有说出的关键真相，给用户一个值得解锁的强反转收束。',
          metric: '付费隐藏结局',
          paywall: 'paid',
          choices: [],
        })
      }

      focusNodeId = paidEndingId
      return {
        ...current,
        publish: {
          ...current.publish,
          status: current.publish.status === 'Draft' ? 'Beta' : current.publish.status,
          visibility: current.publish.visibility === 'Private' ? 'Unlisted' : current.publish.visibility,
          monetization: 'Paid Ending',
          price: options.trialMode
            ? '0.01'
            : parsePublishPriceCents(current.publish.price) > 0
              ? current.publish.price
              : '9.9',
        },
        variables,
        nodes,
        updatedAt: new Date().toISOString(),
      }
    })

    setSelectedNodeId(focusNodeId)
    setSearchQuery('')
    setRuntimeMessage(
      options.trialMode
        ? '客户试用模式已准备：0.01 元付费隐藏线可用于真实验收'
        : createdPaidEnding
        ? '已生成付费隐藏线：免费结局保留，隐藏结局可收款解锁'
        : '已补齐付费隐藏线入口和解锁条件',
    )
  }

  function activateCustomerTrialMode() {
    const nextSessionId = createClientId('trial')
    runtimeSessionIdRef.current = nextSessionId
    lastRecordedRuntimeNodeRef.current = ''
    setCustomerTrialMode(true)
    setCustomerTrialState('已启动：请保存并重新生成发布包，再用微信跑 0.01 元真实验收')
    setPaymentOrders([])
    setPaymentLedgerOrders([])
    setPendingPaidChoice(null)
    setPaymentOrderFilter('all')
    setCheckoutState('试用会话已重置，等待微信支付')
    setPaymentVerificationState('客户试用模式已启动，订单账本等待真实支付回流')
    if (availablePaymentMethods.includes('wechat')) {
      setPaymentMethod('wechat')
    }
    setPublishedBuildId('')
    setBuildState('客户试用模式已准备，请生成发布包')
    setDistributionState('客户试用模式已准备，生成发布包后可复制渠道链接')
    setRuntimeNodeId(project.nodes[0]?.id || selectedNodeId)
    setRuntimePath([project.nodes[0]?.id || selectedNodeId])
    setRuntimeState(createRuntimeState(project.variables))
    generatePaidHiddenLine({ trialMode: true })
    setActiveStudioPage('overview')
  }

  function updateChoice(index: number, field: keyof StoryChoice, value: string) {
    updateProject((current) => ({
      ...current,
      nodes: current.nodes.map((node) => {
        if (node.id !== selectedNodeId) return node
        const choices = [...node.choices]
        choices[index] = { ...choices[index], [field]: value }
        return { ...node, choices }
      }),
    }))
  }

  function applyChoiceCondition(index: number, condition: string) {
    updateChoice(index, 'condition', condition)
    setRuntimeMessage(condition ? `已套用条件：${condition}` : '已清空分支条件')
  }

  function applyChoiceLabelSuggestion(index: number) {
    const suggestion = selectedNodeBranchRows[index]?.suggestedLabel
    if (!suggestion) return
    updateChoice(index, 'label', suggestion)
    setRuntimeMessage(`已优化选择文案：${suggestion}`)
  }

  function previewChoiceRoute(item: StoryChoice) {
    const target = storyNodes.find((node) => node.id === item.targetNodeId)
    const previewState = createRuntimeState(project.variables)
    setRuntimeState(previewState)
    setRuntimeNodeId(selectedNode.id)
    setRuntimePath([selectedNode.id])
    setPendingPaidChoice(null)

    if (!target) {
      setRuntimeMessage(`无法预览，目标节点不存在：${item.targetNodeId}`)
      return
    }
    if (item.condition && !evaluateCondition(item.condition, previewState)) {
      setRuntimeMessage(`预览锁定：默认变量不满足 ${item.condition}`)
      return
    }

    setRuntimeNodeId(target.id)
    setRuntimePath([selectedNode.id, target.id])
    setRuntimeMessage(
      `预览路径：${selectedNode.id} → ${target.id}${
        paidEndingNodeIds.includes(target.id) ? '，目标为付费结局' : ''
      }`,
    )
  }

  function addChoice() {
    updateProject((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              choices: [
                ...node.choices,
                choice(createClientId('C'), '新的选择', node.id),
              ],
            }
          : node,
      ),
    }))
  }

  function removeChoice(index: number) {
    updateProject((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              choices: node.choices.filter((_, choiceIndex) => choiceIndex !== index),
            }
          : node,
      ),
    }))
  }

  function addStoryNode() {
    const nextNumber = storyNodes.length + 1
    const nextNode: StoryNode = {
      id: `S${String(nextNumber).padStart(2, '0')}`,
      title: '新的剧情节点',
      kind: 'Choice',
      summary: '描述这一幕的冲突、线索和玩家需要做出的决定',
      metric: '待测',
      choices: [choice(createClientId('C'), '继续调查', selectedNode.id)],
    }

    updateProject((current) => ({ ...current, nodes: [...current.nodes, nextNode] }))
    setSelectedNodeId(nextNode.id)
    setSearchQuery('')
  }

  async function generateNextScene() {
    const sourceProject = project
    const sourceNode = selectedNode
    setAiState(projectHasRemoteRecord ? '正在保存当前改动...' : '正在创建云端作品...')

    try {
      const savedSourceProject = await syncProjectToApi({
        ...sourceProject,
        updatedAt: new Date().toISOString(),
      })
      const savedSourceNode =
        savedSourceProject.nodes.find((node) => node.id === sourceNode.id) ||
        savedSourceProject.nodes[0]

      setAiState('正在生成下一幕...')
      const result = await generateAiDraft<AiGenerationResult>('expand-branch', {
        workspaceId: activeWorkspaceId,
        project: savedSourceProject,
        selectedNodeId: savedSourceNode.id,
      })
      const usageEvent = result.usageEvent
      if (usageEvent) {
        setAiUsageEvents((current) =>
          current.some((event) => event.id === usageEvent.id)
            ? current
            : [...current, usageEvent],
        )
      }
      const rawNodes = Array.isArray(result.output.nodes) ? result.output.nodes : []
      if (rawNodes.length === 0) {
        setAiState('AI 没有返回可用节点')
        return
      }

      const usedIds = new Set(savedSourceProject.nodes.map((node) => node.id))
      const originalIdMap = new Map<string, string>()
      let nextNumber = savedSourceProject.nodes.length + 1
      const allocateId = (preferredId: string) => {
        if (preferredId && !usedIds.has(preferredId)) {
          usedIds.add(preferredId)
          return preferredId
        }

        let nextId = `S${String(nextNumber).padStart(2, '0')}`
        nextNumber += 1
        while (usedIds.has(nextId)) {
          nextId = `S${String(nextNumber).padStart(2, '0')}`
          nextNumber += 1
        }
        usedIds.add(nextId)
        return nextId
      }

      const generatedNodes = rawNodes.map((node, index) => {
        const nextId = allocateId(node.id)
        originalIdMap.set(node.id, nextId)
        return {
          ...node,
          id: nextId,
          kind: nodeKinds.includes(node.kind) ? node.kind : 'Choice',
          metric: node.metric || 'AI 生成',
          choices: Array.isArray(node.choices)
            ? node.choices.map((item, choiceIndex) => ({
                id: item.id || `${createClientId('AI')}-${index}-${choiceIndex}`,
                label: item.label || '继续调查',
                targetNodeId: item.targetNodeId || nextId,
                condition: item.condition || '',
              }))
            : [],
        }
      })

      const generatedNodeIds = new Set(generatedNodes.map((node) => node.id))
      const remappedNodes = generatedNodes.map((node, index) => ({
        ...node,
        choices: node.choices.map((item) => ({
          ...item,
          targetNodeId:
            originalIdMap.get(item.targetNodeId) ||
            (generatedNodeIds.has(item.targetNodeId)
              ? item.targetNodeId
              : generatedNodes[index + 1]?.id || item.targetNodeId || node.id),
        })),
      }))
      const firstGeneratedNode = remappedNodes[0]
      const aiLink = choice(
        createClientId('AI-LINK'),
        `进入 ${firstGeneratedNode.title}`,
        firstGeneratedNode.id,
      )
      const existingVariableIds = new Set(savedSourceProject.variables.map((item) => item.id))
      const existingVariableLabels = new Set(savedSourceProject.variables.map((item) => item.label))
      const generatedVariables = (result.output.variables || []).filter(
        (item) => !existingVariableIds.has(item.id) && !existingVariableLabels.has(item.label),
      )
      const existingCharacterNames = new Set(savedSourceProject.characters.map((item) => item.name))
      const generatedCharacters = (result.output.characters || []).filter(
        (item) => !existingCharacterNames.has(item.name),
      )

      const nextProject: StoryProject = {
        ...savedSourceProject,
        nodes: [
          ...savedSourceProject.nodes.map((node) =>
            node.id === savedSourceNode.id &&
            !node.choices.some((item) => item.targetNodeId === firstGeneratedNode.id)
              ? { ...node, choices: [...node.choices, aiLink] }
              : node,
          ),
          ...remappedNodes,
        ],
        variables: [...savedSourceProject.variables, ...generatedVariables],
        characters: [...savedSourceProject.characters, ...generatedCharacters],
        updatedAt: new Date().toISOString(),
      }

      const savedProject = await syncProjectToApi(nextProject)
      setSelectedNodeId(firstGeneratedNode.id)
      setRuntimeNodeId(firstGeneratedNode.id)
      setRuntimeState(createRuntimeState(savedProject.variables))
      setSearchQuery('')
      setRuntimeMessage(`AI 已生成 ${firstGeneratedNode.id} · ${firstGeneratedNode.title}`)
      setAiState(
        `已插入 ${remappedNodes.length} 个节点并保存 · ${result.providerId} / ${result.model} · ${result.usageEvent?.currency || 'USD'} ${result.usageEvent?.estimatedCost || '0'}`,
      )
      void refreshTeamState(activeWorkspaceId).catch(() => {
        setProjectListState('作品已保存，活动记录稍后同步')
      })
    } catch (error) {
        logError('api', error)
      setAiState(error instanceof Error ? `AI 生成失败：${error.message}` : 'AI 生成失败')
    }
  }

  function removeStoryNode(nodeId: string) {
    const nextNodes = storyNodes.filter((node) => node.id !== nodeId)
    if (nextNodes.length === 0) return

    updateProject((current) => ({
      ...current,
      nodes: nextNodes.map((node) => ({
        ...node,
        choices: node.choices.map((item) => ({
          ...item,
          targetNodeId:
            item.targetNodeId === nodeId ? nextNodes[0].id : item.targetNodeId,
        })),
      })),
    }))
    if (selectedNodeId === nodeId) setSelectedNodeId(nextNodes[0].id)
  }

  function updateVariable(index: number, field: keyof StoryVariable, value: string) {
    updateProject((current) => {
      const variables = [...current.variables]
      variables[index] = { ...variables[index], [field]: value }
      return { ...current, variables }
    })
  }

  function addVariable() {
    updateProject((current) => ({
      ...current,
      variables: [
        ...current.variables,
        {
          id: `var_${current.variables.length + 1}`,
          label: '新变',
          type: 'number',
          defaultValue: '0',
        },
      ],
    }))
  }

  function removeVariable(index: number) {
    updateProject((current) => ({
      ...current,
      variables: current.variables.filter((_, variableIndex) => variableIndex !== index),
    }))
  }

  function updateCharacter(index: number, field: keyof Character, value: string) {
    updateProject((current) => {
      const characters = [...current.characters]
      characters[index] = { ...characters[index], [field]: value }
      return { ...current, characters }
    })
  }

  function addCharacter() {
    setSelectedCharacterIndex(project.characters.length)
    updateProject((current) => ({
      ...current,
      characters: [
        ...current.characters,
        {
          name: '新角',
          role: '剧情关键人物',
          trait: '补充角色性格、秘密和动机',
          color: '#7c3aed',
        },
      ],
    }))
  }

  function removeCharacter(index: number) {
    setSelectedCharacterIndex((current) => {
      if (current > index) return current - 1
      if (current === index) return Math.max(0, current - 1)
      return current
    })
    updateProject((current) => ({
      ...current,
      characters: current.characters.filter(
        (_, characterIndex) => characterIndex !== index,
      ),
    }))
  }

  async function syncProjectToApi(nextProject: StoryProject) {
    writeStoredValue(STORAGE_KEY, JSON.stringify(nextProject))
    setProject(nextProject)

    try {
      const remoteProject = await saveRemoteProject(nextProject, activeWorkspaceId)
      const normalized = normalizeProject(remoteProject)
      writeStoredValue(STORAGE_KEY, JSON.stringify(normalized))
      setProject(normalized)
      setProjectList((current) => {
        const exists = current.some((item) => item.id === normalized.id)
        return exists
          ? current.map((item) => (item.id === normalized.id ? normalized : item))
          : [normalized, ...current]
      })
      setProjectListState('项目列表已更新')
      setSaveState('已保存到云端')
      return normalized
    } catch (error) {
        logError('api', error)
      setSaveState('已保留本地草稿')
      return nextProject
    }
  }

  async function saveProject() {
    const savedProject = { ...project, updatedAt: new Date().toISOString() }
    setSaveState('正在保存')
    await syncProjectToApi(savedProject)
  }

  async function resetSampleProject() {
    const nextProject = { ...sampleProject, updatedAt: new Date().toISOString() }
    setProject(nextProject)
    setSelectedNodeId(nextProject.nodes[0].id)
    restartRuntime(nextProject)
    setSearchQuery('')
    setSaveState('正在重置')
    await syncProjectToApi(nextProject)
  }

  function exportProject() {
    const payload = JSON.stringify(project, null, 2)
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${project.title || 'playdrama-project'}.json`
    link.click()
    URL.revokeObjectURL(url)
    setSaveState('已导出 JSON')
  }

  async function importProject(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const nextProject = normalizeProject(JSON.parse(text))
      setProject(nextProject)
      setSelectedNodeId(nextProject.nodes[0].id)
      restartRuntime(nextProject)
      setSearchQuery('')
      setSaveState('正在导入')
      await syncProjectToApi(nextProject)
    } catch (error) {
        logError('api', error)
      setSaveState('导入失败：无法读取 JSON')
    } finally {
      event.target.value = ''
    }
  }

  async function scanContentSafety(sourceProject = project) {
    setContentSafetyState('正在扫描内容安全')
    try {
      const savedProject = await syncProjectToApi({
        ...sourceProject,
        updatedAt: new Date().toISOString(),
      })
      const review = await scanProjectContentSafety<ContentSafetyReview>(savedProject.id)
      setContentSafetyReviews((current) => [
        review,
        ...current.filter((item) => item.id !== review.id),
      ])
      setContentSafetyState(
        review.status === 'blocked'
          ? `已阻断：${review.blockingCount} 个高风险项`
          : review.status === 'needs_review'
            ? `需复核：${review.reviewCount} 个提示`
            : `已通过：${review.noticeCount} 个提示`,
      )
      return { savedProject, review }
    } catch (error) {
        logError('api', error)
      setContentSafetyState('扫描失败，请检查网络')
      return null
    }
  }

  async function publishBuild() {
    setBuildState('正在生成发布')
    const safetyResult = await scanContentSafety(project)
    if (!safetyResult) {
      setBuildState('发布失败：内容安全未完成')
      return null
    }
    if (!safetyResult.review.passed) {
      setBuildState('发布已阻断：内容安全未通过')
      return null
    }

    try {
      const build = await publishRemoteBuild<PublishBuild>(safetyResult.savedProject.id)
      setBuildState(`已生成 v${build.version} · ${build.status}`)
      setPublishedBuildId(build.id)
      setPublishBuilds((current) =>
        sortBuildHistory([build, ...current.filter((item) => item.id !== build.id)]),
      )
      setSaveState('发布快照已保存')
      setDistributionState('渠道链接已更新，可复制投放')
      await refreshTeamState(activeWorkspaceId)
      return build
    } catch (error) {
        logError('api', error)
      setBuildState('发布失败，请检查网络')
      return null
    }
  }

  async function inviteMember() {
    setInviteState('正在邀请成员')
    try {
      const member = await inviteWorkspaceMember<WorkspaceMember>({
        email: inviteEmail,
        role: inviteRole,
        workspaceId: activeWorkspaceId,
      })
      setLatestInviteUrl(member.inviteUrl || '')
      await refreshTeamState(activeWorkspaceId)
      setInviteState('邀请已发送并写入工作区')
    } catch (error) {
        logError('api', error)
      setInviteState('邀请失败，请检查邮件配置或稍后重试')
    }
  }

  async function resendInvitation(memberId: string) {
    setInviteState('正在重新发送邀请')
    try {
      const member = await resendWorkspaceInvitation<WorkspaceMember>({
        workspaceId: activeWorkspaceId,
        memberId,
      })
      setLatestInviteUrl(member.inviteUrl || '')
      await refreshTeamState(activeWorkspaceId)
      setInviteState('邀请已重新发送')
    } catch (error) {
        logError('api', error)
      setInviteState('重新发送失败：邀请可能已接受或取消')
    }
  }

  async function cancelInvitation(memberId: string) {
    setInviteState('正在取消邀请')
    try {
      await cancelWorkspaceInvitation<WorkspaceMember>({
        workspaceId: activeWorkspaceId,
        memberId,
      })
      await refreshTeamState(activeWorkspaceId)
      setInviteState('邀请已取消')
    } catch (error) {
        logError('api', error)
      setInviteState('取消失败：邀请可能已接受')
    }
  }

  async function markDeliveryStatus(deliveryId: string, status: string) {
    setInviteState('正在更新投递状态')
    try {
      await updateInviteDelivery<InviteDelivery>({
        workspaceId: activeWorkspaceId,
        deliveryId,
        status,
      })
      await refreshTeamState(activeWorkspaceId)
      setInviteState(`投递状态已更新${status}`)
    } catch (error) {
        logError('api', error)
      setInviteState('投递状态更新失败')
    }
  }

  async function createNewWorkspace() {
    setWorkspaceState('正在创建工作区')
    try {
      const created = await createWorkspace<WorkspaceSummary>({
        name: newWorkspaceName,
        plan: 'creator',
      })
      setActiveWorkspaceId(created.id)
      writeStoredValue(WORKSPACE_STORAGE_KEY, created.id)
      setWorkspaceState('已切换到新工作区')
    } catch (error) {
        logError('api', error)
      setWorkspaceState('创建失败，请检查网络')
    }
  }

  async function requestLoginCode() {
    setAuthState('正在发送验证码')
    setLoginCodeSentTo('')
    setLoginCodeExpiresAt('')
    try {
      const result = isSmsCodeAuth
        ? await requestSmsLoginCode({
            phone: loginPhone,
            displayName: loginName,
          })
        : await requestEmailLoginCode({
            email: loginEmail,
            displayName: loginName,
          })
      const destination = 'phone' in result ? result.phone : result.email
      const canUseCode = result.canVerify !== false && result.delivery?.status !== 'failed'
      setLoginCodeSentTo(canUseCode ? loginCodeDestination : '')
      setLoginCodeExpiresAt(canUseCode ? result.expiresAt : '')
      setLoginCode('')
      setAuthState(
        result.debugCode
          ? `Code generated: ${result.debugCode}`
          : !canUseCode
            ? `验证码未发出：${formatLoginDeliveryStatus(result.delivery?.errorMessage || '')}`
            : `验证码已发送至 ${destination}`,
      )
    } catch (error) {
        logError('api', error)
      setAuthState(`验证码发送失败：${formatLoginCodeError(error)}`)
    }
  }

  async function verifyLoginCode() {
    if (!canVerifyLoginCode) {
      setAuthState('请先发送新的验证码，并输入最新 6 位验证码')
      return
    }

    setAuthState('正在校验验证码')
    try {
      const nextSession = isSmsCodeAuth
        ? await verifySmsLoginCode<WorkspaceSession>({
            phone: loginPhone,
            code: loginCode,
            displayName: loginName,
            workspaceId: activeWorkspaceId,
          })
        : await verifyEmailLoginCode<WorkspaceSession>({
            email: loginEmail,
            code: loginCode,
            displayName: loginName,
            workspaceId: activeWorkspaceId,
          })
      setSession(nextSession)
      setActiveWorkspaceId(nextSession.workspace.id)
      writeStoredValue(WORKSPACE_STORAGE_KEY, nextSession.workspace.id)
      setAuthState(`已登录：${nextSession.user.phone || nextSession.user.email}`)
      setLoginCode('')
      await refreshTeamState(nextSession.workspace.id)
    } catch (error) {
        logError('api', error)
      setAuthState(`验证码校验失败：${formatLoginCodeError(error)}`)
    }
  }

  async function loginToWorkspace() {
    setAuthState('正在登录')
    try {
      if (isNetlifyIdentityAuth) {
        await netlifyIdentityLogin(loginEmail, loginPassword)
        const nextSession = await syncIdentitySession(activeWorkspaceId)
        setAuthState(`已登录：${nextSession.user.email}`)
        return
      }
      if (isEmailCodeAuth || isSmsCodeAuth) {
        await verifyLoginCode()
        return
      }
      if (isGenericProviderAuth) {
      setAuthState('请通过正式登录入口进入')
        return
      }

      const nextSession = await localApiLogin<WorkspaceSession>({
        email: loginEmail,
        displayName: loginName,
        workspaceId: activeWorkspaceId,
      })
      setSession(nextSession)
      setActiveWorkspaceId(nextSession.workspace.id)
      writeStoredValue(WORKSPACE_STORAGE_KEY, nextSession.workspace.id)
      setAuthState(`已登录：${nextSession.user.email}`)
      await refreshTeamState(nextSession.workspace.id)
    } catch (error) {
        logError('api', error)
      setAuthState(
        isNetlifyIdentityAuth ? formatIdentityError(error) : '登录失败，请检查账号信息',
      )
    }
  }

  async function signupToWorkspace() {
    if (isEmailCodeAuth || isSmsCodeAuth) {
      await requestLoginCode()
      return
    }
    if (isGenericProviderAuth) {
      setAuthState('请在正式账号系统中创建账号，再回到工作台同步会话')
      return
    }
    if (!isNetlifyIdentityAuth) {
      await loginToWorkspace()
      return
    }

    setAuthState('正在创建真实账号')
    try {
      const identityUser = await netlifyIdentitySignup(loginEmail, loginPassword, {
        full_name: loginName,
      })
      if (identityUser.confirmedAt) {
        const nextSession = await syncIdentitySession(activeWorkspaceId)
        setAuthState(`账号已创建：${nextSession.user.email}`)
      } else {
        setAuthState('账号已创建，请先到邮箱完成确')
      }
    } catch (error) {
        logError('api', error)
      setAuthState(formatIdentityError(error))
    }
  }

  async function logoutFromWorkspace() {
    setAuthState('正在退出登录')
    try {
      if (isNetlifyIdentityAuth) {
        await netlifyIdentityLogout()
        setAuthState('已退出真实账号')
        return
      }
      if (isEmailCodeAuth || isSmsCodeAuth) {
        const nextSession = await localApiLogout<WorkspaceSession>()
        setSession(nextSession)
        setActiveWorkspaceId(nextSession.workspace.id)
        writeStoredValue(WORKSPACE_STORAGE_KEY, nextSession.workspace.id)
        setAuthState('已退出验证码账号')
        return
      }
      if (isGenericProviderAuth) {
        setAuthState('请在正式账号系统中退出登录')
        return
      }

      const nextSession = await localApiLogout<WorkspaceSession>()
      setSession(nextSession)
      setActiveWorkspaceId(nextSession.workspace.id)
      writeStoredValue(WORKSPACE_STORAGE_KEY, nextSession.workspace.id)
      setAuthState('已退出到默认账号')
      await refreshTeamState(nextSession.workspace.id)
    } catch (error) {
        logError('api', error)
      setAuthState('退出失败，请稍后重试')
    }
  }

  function switchWorkspace(workspaceId: string) {
    setActiveWorkspaceId(workspaceId)
    writeStoredValue(WORKSPACE_STORAGE_KEY, workspaceId)
    setWorkspaceState('正在切换工作区')
  }

  function switchProject(projectId: string) {
    const nextProject = projectList.find((item) => item.id === projectId)
    if (!nextProject) return
    applyProject(nextProject, `已切换到 ${nextProject.title}`)
    setSaveState('已切换作品')
    setBuildState('等待生成发布包')
    setPublishedBuildId('')
    setPaymentOrders([])
    setPaymentLedgerOrders([])
    setPendingPaidChoice(null)
  }

  async function createNewProject() {
    const nextProject: StoryProject = {
      ...sampleProject,
      id: createClientId('playdrama-project'),
      title: '新的互动短剧',
      lifecycleStatus: 'active',
      archivedAt: null,
      updatedAt: new Date().toISOString(),
    }
    applyProject(nextProject, '已创建新作品草稿')
    setPublishedBuildId('')
    setBuildState('等待生成发布包')
    setPaymentOrders([])
    setPaymentLedgerOrders([])
    setPendingPaidChoice(null)
    setProjectList((current) => [nextProject, ...current])
    setSaveState('新作品草稿待保存')
    setProjectListState('新作品已加入列表')
    await syncProjectToApi(nextProject)
  }

  async function duplicateProject(projectId: string) {
    const sourceProject = projectList.find((item) => item.id === projectId)
    if (!sourceProject) return

    const nextProject: StoryProject = {
      ...sourceProject,
      id: createClientId('playdrama-copy'),
      title: `${sourceProject.title} 副本`,
      lifecycleStatus: 'active',
      archivedAt: null,
      updatedAt: new Date().toISOString(),
    }

    applyProject(nextProject, '已复制作品')
    setPublishedBuildId('')
    setBuildState('等待生成发布包')
    setPaymentOrders([])
    setPaymentLedgerOrders([])
    setPendingPaidChoice(null)
    setProjectList((current) => [nextProject, ...current])
    setProjectListState('作品副本已创建')
    await syncProjectToApi(nextProject)
  }

  async function archiveProject(projectId: string) {
    const sourceProject = projectList.find((item) => item.id === projectId)
    if (!sourceProject) return

    const archivedAt = new Date().toISOString()
    try {
      await updateRemoteProject<StoryProject>(projectId, {
        lifecycleStatus: 'archived',
        archivedAt,
      })
      const nextList = projectList.filter((item) => item.id !== projectId)
      setProjectList(nextList)
      setArchivedProjectList((current) => [
        {
          ...sourceProject,
          lifecycleStatus: 'archived',
          archivedAt,
        },
        ...current,
      ])
      setProjectListState('作品已归档')

      if (project.id === projectId) {
        const fallbackProject = nextList[0] || {
          ...sampleProject,
          id: createClientId('playdrama-project'),
          title: '新的互动短剧',
          lifecycleStatus: 'active',
          archivedAt: null,
          updatedAt: new Date().toISOString(),
        }
        applyProject(fallbackProject, '当前作品已归档')
        setSaveState(nextList[0] ? '已切换到下一个作品' : '当前工作区暂无活跃作品')
      }

      await refreshTeamState(activeWorkspaceId)
    } catch (error) {
        logError('api', error)
      setProjectListState('归档失败，请稍后重试')
    }
  }

  async function restoreProject(projectId: string) {
    const sourceProject = archivedProjectList.find((item) => item.id === projectId)
    if (!sourceProject) return

    try {
      const restoredProject = normalizeProject(
        await updateRemoteProject<StoryProject>(projectId, {
          lifecycleStatus: 'active',
          archivedAt: null,
        }),
      )
      setArchivedProjectList((current) => current.filter((item) => item.id !== projectId))
      setProjectList((current) => [restoredProject, ...current])
      applyProject(restoredProject, '已恢复归档作品')
      setProjectListState('归档作品已恢复')
      setSaveState('已恢复作品')
      await refreshTeamState(activeWorkspaceId)
    } catch (error) {
        logError('api', error)
      setProjectListState('恢复失败，请稍后重试')
    }
  }

  const player = (
    <section className={`panel preview-panel ${previewOnly ? 'published-player-panel' : ''}`}>
      <div className="panel-header">
        <div>
          <p className="eyebrow">互动预览</p>
          <h2>{previewOnly ? '互动短剧' : '可玩预览'}</h2>
        </div>
        <span className="runtime-progress-pill">
          {runtimeProgress.current}/{runtimeProgress.total}
        </span>
        <button
          className="icon-button"
          type="button"
          aria-label="Restart preview"
          onClick={() => restartRuntime()}
        >
          <RotateCcw size={17} />
        </button>
      </div>
      <div className="runtime-meta-strip">
        <span>{runtimeNode.kind}</span>
        <span>{runtimeAllowedChoiceCount} 个可选分</span>
        <span>{runtimeProgress.percent}% 剧情进度</span>
        <span>{project.publish.monetization === 'Paid Ending' ? checkoutState : '免费体验'}</span>
      </div>
      <div className="runtime-state">
        {project.variables.map((variable) => (
          <label key={variable.id}>
            <span>{variable.label}</span>
            <input
              value={runtimeState[variable.label] ?? variable.defaultValue}
              onChange={(event) =>
                updateRuntimeValue(variable.label, event.target.value)
              }
            />
          </label>
        ))}
      </div>
      <div className="phone-frame">
        <div className="video-scene">
          <div className="scene-topbar">
            <span>{runtimeNode.id}</span>
            <span>{runtimeNode.kind}</span>
          </div>
          <div className="scene-progress">
            <span style={{ width: `${runtimeProgress.percent}%` }} />
          </div>
          <div className="scene-copy">
            <strong>{runtimeNode.title}</strong>
            <p>{runtimeNode.summary}</p>
          </div>
        </div>
        {runtimeNode.choices.map((item) => {
          const allowed = evaluateCondition(item.condition, runtimeState)
          const requiresPayment = choiceRequiresPayment(item)
          return (
            <button
              className={`choice-button ${allowed && !requiresPayment ? '' : 'locked'}`}
              type="button"
              key={item.id}
              onClick={() => playChoice(item)}
            >
              {item.label}
              <span>
                {requiresPayment
                  ? `付费解锁 · ${project.publish.price} CNY`
                  : item.condition
                  ? `${allowed ? '满足' : '锁定'} · ${item.condition}`
                  : `进入 ${item.targetNodeId}`}
              </span>
            </button>
          )
        })}
        {pendingPaidChoice && (
          <div className="checkout-panel">
            <div>
              <strong>解锁付费结局</strong>
              <span>
                {pendingCheckoutOrder
                  ? `${formatPaymentMethod(pendingCheckoutOrder.provider)}订单已创建，支付完成后刷新`
                  : `支付 ${project.publish.price} 元后继续观看`}
              </span>
            </div>
            {!pendingCheckoutOrder && availablePaymentMethods.length === 1 && (
              <span className="checkout-method-note">
                当前可用方式：{formatPaymentMethod(availablePaymentMethods[0])}
              </span>
            )}
            {!pendingCheckoutOrder && availablePaymentMethods.length > 1 && (
              <div className="checkout-methods" role="group" aria-label="支付方式">
                {availablePaymentMethods.map((provider) => (
                  <button
                    className={selectedPaymentMethod === provider ? 'active' : ''}
                    type="button"
                    key={provider}
                    onClick={() => setPaymentMethod(provider)}
                  >
                    {paymentMethodLabels[provider]}
                  </button>
                ))}
              </div>
            )}
            <div className="checkout-actions">
              {!pendingCheckoutOrder && (
                <button className="play-button" type="button" onClick={unlockPaidEnding}>
                  <ShieldCheck size={17} />
                  去支付
                </button>
              )}
              {pendingCheckoutUrl && (
                <button
                  className="play-button"
                  type="button"
                  onClick={() => window.open(pendingCheckoutUrl, '_blank', 'noopener,noreferrer')}
                >
                  <ShieldCheck size={17} />
                  继续支付
                </button>
              )}
              {pendingCheckoutOrder && (
                <button className="ghost-button" type="button" onClick={() => void refreshPaymentStatus()}>
                  刷新状态
                </button>
              )}
            </div>
          </div>
        )}
        {runtimeNode.kind === 'Ending' && (
          <button className="play-button" type="button" onClick={() => restartRuntime()}>
            <Play size={17} fill="currentColor" />
            重新开始
          </button>
        )}
      </div>
      <div className="runtime-path">
        <span>已走路径</span>
        <strong>{runtimePathLabel}</strong>
      </div>
      <p className="runtime-message">{runtimeMessage}</p>
    </section>
  )

  if (previewOnly) {
    return (
      <main className="share-preview-shell">
        <header className="share-preview-header">
          <div>
            <p className="eyebrow">发布预览</p>
            <h1>{project.title}</h1>
            <span>{project.publish.category} · {formatMonetization(project.publish.monetization)}</span>
          </div>
          <div className="share-preview-actions">
            <span>{publishedBuildId ? `发布包 #${publishedBuildId.slice(-6)}` : '草稿预览'}</span>
            <button className="ghost-button" type="button" onClick={exitSharePreview}>
              返回创作
            </button>
          </div>
        </header>
        <div className="share-preview-body">{player}</div>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <input
        ref={fileInputRef}
        className="file-input"
        type="file"
        accept="application/json,.json"
        onChange={importProject}
      />

      <aside className="sidebar" aria-label="Workspace">
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={20} />
          </div>
          <div>
            <strong>PlayDrama</strong>
            <span>AI 互动短剧工作台</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Main">
          <button
            className={`nav-item ${activeStudioPage === 'overview' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveStudioPage('overview')}
          >
            <Layers3 size={18} />
            项目总览
          </button>
          <button
            className={`nav-item ${activeStudioPage === 'creation' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveStudioPage('creation')}
          >
            <Wand2 size={18} />
            创作模式
          </button>
          <button
            className={`nav-item ${activeStudioPage === 'story' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveStudioPage('story')}
          >
            <GitBranch size={18} />
            剧情编辑
          </button>
          <button
            className={`nav-item ${activeStudioPage === 'characters' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveStudioPage('characters')}
          >
            <Users size={18} />
            角色资产
          </button>
          <button
            className={`nav-item ${activeStudioPage === 'ai' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveStudioPage('ai')}
          >
            <Bot size={18} />
            普通短剧
          </button>
          <button
            className={`nav-item ${activeStudioPage === 'publish' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveStudioPage('publish')}
          >
            <Share2 size={18} />
            发布变现
          </button>
        </nav>

        <section className="side-section">
          <div className="section-title">
            <span>当前模板</span>
            <button className="icon-button" type="button" aria-label="Add template">
              <Plus size={16} />
            </button>
          </div>
          <div className="template-tile">
            <FileText size={18} />
            <div>
              <strong>{project.template}</strong>
              <span>线索、密码锁、隐藏结局</span>
            </div>
          </div>
        </section>

        <section className="side-section">
          <div className="section-title">
            <span>登录</span>
          </div>
          <div className="auth-panel">
            <div className="auth-panel-header">
              <strong>{isSignedIntoWorkspace ? '已登录工作区' : authLoginTitle}</strong>
              <span>{isSignedIntoWorkspace ? '云端项目和团队权限已同步' : authLoginSubtitle}</span>
            </div>
            {isSignedIntoWorkspace && session ? (
              <div className="auth-signed-card">
                <div className="auth-signed-top">
                  <span className="avatar-badge small">
                    {session.user.avatarInitials || 'U'}
                  </span>
                  <div>
                    <strong>{session.user.displayName || 'Creator'}</strong>
                    <span>{signedInContact}</span>
                  </div>
                </div>
                <div className="auth-signed-meta">
                  <span>{session.workspace.name}</span>
                  <em>{roleLabels[session.membership.role] || session.membership.role}</em>
                </div>
                <button
                  className="ghost-button compact auth-logout"
                  type="button"
                  onClick={logoutFromWorkspace}
                >
                  退出或切换账号
                </button>
              </div>
            ) : (
              <>
                {isSmsCodeAuth ? (
                  <label className="auth-field">
                    <span>手机号</span>
                    <input
                      value={loginPhone}
                      onChange={(event) => {
                        setLoginPhone(event.target.value)
                        setLoginCodeSentTo('')
                        setLoginCodeExpiresAt('')
                      }}
                      placeholder="输入手机号"
                      inputMode="tel"
                    />
                  </label>
                ) : (
                  <label className="auth-field">
                    <span>邮箱</span>
                    <input
                      value={loginEmail}
                      onChange={(event) => {
                        setLoginEmail(event.target.value)
                        setLoginCodeSentTo('')
                        setLoginCodeExpiresAt('')
                      }}
                      placeholder="输入邮箱"
                    />
                  </label>
                )}
                <label className="auth-field">
                  <span>显示名</span>
                  <input
                    value={loginName}
                    onChange={(event) => setLoginName(event.target.value)}
                    placeholder="例如 Creator"
                  />
                </label>
                {isNetlifyIdentityAuth && (
                  <label className="auth-field">
                    <span>密码</span>
                    <input
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                      placeholder="输入密码"
                      type="password"
                    />
                  </label>
                )}
                {(isEmailCodeAuth || isSmsCodeAuth) && (
                  <label className="auth-field">
                    <span>验证码</span>
                    <input
                      value={loginCode}
                      onChange={(event) => setLoginCode(event.target.value)}
                      placeholder="输入 6 位数字"
                      inputMode="numeric"
                      maxLength={6}
                    />
                  </label>
                )}
                <div className="auth-actions">
                  {(isNetlifyIdentityAuth || isGenericProviderAuth || isEmailCodeAuth || isSmsCodeAuth) && (
                    <button className="primary-button compact" type="button" onClick={signupToWorkspace}>
                      {isEmailCodeAuth
                        ? '发送邮件验证码'
                        : isSmsCodeAuth
                          ? '发送短信验证码'
                          : '注册'}
                    </button>
                  )}
                  <button
                    className="ghost-button compact"
                    type="button"
                    onClick={loginToWorkspace}
                    disabled={(isEmailCodeAuth || isSmsCodeAuth) && !canVerifyLoginCode}
                  >
                    {isGenericProviderAuth
                      ? '进入登录'
                      : isEmailCodeAuth || isSmsCodeAuth
                        ? '验证码登录'
                        : '登录'}
                  </button>
                </div>
              </>
            )}
            <span className={`auth-status ${authStateTone}`}>{visibleAuthState}</span>
            <div className="auth-provider-badge">
              <span>账号服务</span>
              <strong>{formatAuthProviderLabel(authProvider?.provider)}</strong>
              <small>{formatAuthProviderDetail(authProvider)}</small>
            </div>
          </div>
          <div className="storage-status-card">
            <strong>
              数据 · {storageDriverLabel} · {storageReadinessLabel}
            </strong>
            {(storageHealth?.missing || []).slice(0, 3).map((item) => (
              <div className="storage-status-row" key={item.id}>
                <span>{item.label}</span>
                <em>{item.action}</em>
              </div>
            ))}
          </div>
          <div className="commercial-readiness-card">
            <strong>商用体检 · {commercialReadinessLabel}</strong>
            <span>
              {commercialReadiness
                ? `${commercialReadiness.passed}/${commercialReadiness.total} 项通过`
                : '正在同步上线门禁'}
            </span>
            {(commercialReadiness?.missing || []).slice(0, 4).map((item) => (
              <div className="commercial-readiness-row" key={item.id}>
                <span>
                  {item.area} · {item.label}
                </span>
                <em>{item.missingFields.slice(0, 3).join(', ') || item.action}</em>
              </div>
            ))}
          </div>
          <label className="workspace-switcher">
            <span>当前工作区</span>
            <select
              value={activeWorkspaceId}
              onChange={(event) => switchWorkspace(event.target.value)}
            >
              {workspaceList.length === 0 && (
                <option value={activeWorkspaceId}>Creator Studio</option>
              )}
              {workspaceList.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="workspace-card">
            <span className="avatar-badge">
              {session?.user.avatarInitials || 'AI'}
            </span>
            <div>
              <strong>{session?.workspace.name || 'Creator Studio'}</strong>
              <span>
                {session?.user.displayName || 'Creator'} ·{' '}
                {roleLabels[session?.membership.role || 'owner'] || session?.membership.role || '管理员'}
              </span>
            </div>
          </div>
          <div className="permission-list">
            {(session?.membership.permissions || ['project:read']).map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <div className="workspace-create">
            <input
              value={newWorkspaceName}
              onChange={(event) => setNewWorkspaceName(event.target.value)}
            />
            <button className="ghost-button compact" type="button" onClick={createNewWorkspace}>
              <Plus size={16} />
              新建
            </button>
          </div>
          <span className="workspace-state">{workspaceState}</span>
        </section>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{activeStudioPageCopy.eyebrow}</p>
            <input
              className="project-title-input"
              value={project.title}
              onChange={(event) =>
                updateProject((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
            />
          </div>
          <div className="topbar-actions">
            <label className="search">
              <Search size={17} />
              <input
                placeholder={activeStudioPageCopy.searchPlaceholder}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
            <span className="save-state">{saveState}</span>
            <button
              className="ghost-button"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="导入"
              title="导入"
            >
              <Upload size={17} />
              <span className="toolbar-label">导入</span>
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={exportProject}
              aria-label="导出"
              title="导出"
            >
              <Download size={17} />
              <span className="toolbar-label">导出</span>
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={resetSampleProject}
              aria-label="重置"
              title="重置"
            >
              <RotateCcw size={17} />
              <span className="toolbar-label">重置</span>
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={openSharePreview}
              aria-label="预览链接"
              title="预览链接"
            >
              <Share2 size={17} />
              <span className="toolbar-label">预览链接</span>
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={saveProject}
              aria-label="保存"
              title="保存"
            >
              <Save size={17} />
              <span className="toolbar-label">保存</span>
            </button>
          </div>
        </header>

        <section className="prelaunch-strip" aria-label="上线前状态">
          {prelaunchStripItems.map((item) => (
            <article className={`prelaunch-item ${item.tone}`} key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </section>

        {activeStudioPage === 'overview' && (
          <>
        <section className="customer-onboarding-panel" aria-label="3 分钟客户试用入口">
          <div className="customer-onboarding-copy">
            <p className="eyebrow">客户试用入口</p>
            <h2>3 分钟从创意跑到可收款演示</h2>
            <p>
              给首次试用的人一条最短路径：先选业务入口，再看剧本和视频脚本，最后生成发布包并用微信 0.01 元验证付费结局。
            </p>
            <div className="customer-onboarding-actions">
              <button className="primary-button compact" type="button" onClick={activateCustomerTrialMode}>
                <Play size={16} fill="currentColor" />
                {customerTrialMode ? '继续 3 分钟体验' : '启动 3 分钟体验'}
              </button>
              <button className="ghost-button compact" type="button" onClick={() => runCustomerTrialStep('create')}>
                <Sparkles size={16} />
                进入示例短剧
              </button>
              <button className="ghost-button compact" type="button" onClick={() => runCustomerTrialStep('payment')}>
                <ShieldCheck size={16} />
                查看收款验收
              </button>
            </div>
          </div>

          <div className="customer-onboarding-routes" aria-label="试用业务入口">
            {customerTrialRouteCards.map((route) => (
              <button
                className={`customer-onboarding-route ${route.tone}`}
                key={route.id}
                type="button"
                onClick={route.action}
              >
                <span className="customer-route-icon">{route.icon}</span>
                <span>
                  <em>{route.label}</em>
                  <strong>{route.title}</strong>
                  <small>{route.detail}</small>
                </span>
                <b>
                  {route.cta}
                  <ChevronRight size={15} />
                </b>
              </button>
            ))}
          </div>

          <div className="customer-onboarding-progress" aria-label="3 分钟试用进度">
            <div className="customer-onboarding-progress-head">
              <span>{customerTrialReadyCount}/{customerTrialSteps.length}</span>
              <strong>{customerTrialProgressLabel}</strong>
              <em>{customerTrialState}</em>
            </div>
            <div className={`customer-trial-mode-strip ${customerTrialMode ? 'active' : 'idle'}`}>
              <span>
                <ShieldCheck size={16} />
                试用状态
              </span>
              <strong>{customerTrialMode ? '演示链路运行中' : '等待启动体验'}</strong>
              <em>{customerTrialMode ? '0.01 元隐藏结局和独立会话已准备' : '启动后不自动提交视频生成或真实支付'}</em>
            </div>
            <div className="customer-onboarding-evidence" aria-label="试用验收证据">
              {customerTrialEvidenceRows.slice(0, 3).map((row) => (
                <article className={row.tone} key={row.label}>
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                  <em>{row.note}</em>
                </article>
              ))}
            </div>
            <div className="customer-onboarding-handoff" aria-label="客户试用交付动作">
              <button type="button" onClick={() => void copyCustomerTrialInvite()}>
                <span>
                  <Clipboard size={16} />
                </span>
                <strong>复制试用邀请</strong>
                <em>{publishedBuildId ? '包含正式发布链接' : '先给客户发体验说明'}</em>
              </button>
              <button type="button" onClick={() => void copyCustomerTrialDemoScript()}>
                <span>
                  <FileText size={16} />
                </span>
                <strong>复制演示脚本</strong>
                <em>3 分钟讲清生成、互动和收款</em>
              </button>
              <button type="button" onClick={() => runCustomerTrialStep('preview')}>
                <span>
                  <ExternalLink size={16} />
                </span>
                <strong>{publishedBuildId ? '打开发布链接' : '保存当前版本'}</strong>
                <em>{publishedBuildId ? formatShortId(publishedBuildId) : '生成发布包前先保存'}</em>
              </button>
            </div>
            <div className="customer-onboarding-steps">
              {customerTrialSteps.map((step) => (
                <button
                  className={`customer-onboarding-step ${step.state}`}
                  key={step.id}
                  type="button"
                  onClick={() => runCustomerTrialStep(step.id)}
                >
                  <span>{step.step}</span>
                  <strong>{step.title}</strong>
                  <em>{step.actionLabel}</em>
                </button>
              ))}
            </div>
            <div className="customer-onboarding-script">
              {customerTrialDemoRows.map((row) => (
                <article key={row.time}>
                  <span>{row.time}</span>
                  <div>
                    <strong>{row.title}</strong>
                    <em>{row.detail}</em>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="generation-launch-panel dual-business-panel" aria-label="PlayDrama business routes">
          <div className="business-route-copy">
            <p className="eyebrow">双业务线</p>
            <h2>两个入口：互动短剧制作，常规短剧生成</h2>
            <p>
              对标大厂 AI 视频创作体验，但业务不混在一起。互动短剧负责选择、付费和数据回流；常规短剧负责从 brief 到剧本、分镜、视频素材和 MP4 成片交付。
            </p>
          </div>
          <div className="business-route-grid">
            <article className="business-route-card primary">
              <span className="business-route-icon">
                <GitBranch size={18} />
              </span>
              <div>
                <span>主业务</span>
                <strong>制作互动短剧</strong>
                <em>剧情图谱、玩家选择、付费隐藏线、发布 H5/小程序、微信收款、订单和渠道数据回读。</em>
                <ul>
                  <li>生成/导入剧情</li>
                  <li>设计分支和付费结局</li>
                  <li>发布并验收 0.01 元支付</li>
                </ul>
              </div>
              <div className="business-route-actions">
                <button className="primary-button compact" type="button" onClick={() => setActiveStudioPage('story')}>
                  <GitBranch size={16} />
                  进入互动制作
                </button>
                <button className="ghost-button compact" type="button" onClick={createNewProject}>
                  <Plus size={16} />
                  空白互动项目
                </button>
              </div>
            </article>
            <article className="business-route-card">
              <span className="business-route-icon secondary">
                <Clapperboard size={18} />
              </span>
              <div>
                <span>第二业务</span>
                <strong>生成普通短剧</strong>
                <em>从 brief 生成剧本、角色、分镜、视频队列，完成真实素材预览、失败重试、交付清单和 MP4 合成。</em>
                <ul>
                  <li>一句话 brief 生成生产包</li>
                  <li>批量提交视频镜头</li>
                  <li>导出清单或合成 MP4</li>
                </ul>
              </div>
              <div className="business-route-actions">
                <button
                  className="primary-button compact"
                  type="button"
                  onClick={generateShortDramaProject}
                  disabled={isSeriesGenerating || isAiBusy}
                >
                  <Clapperboard size={16} />
                  {isSeriesGenerating ? '生成中' : '生成生产包'}
                </button>
                <button
                  className="ghost-button compact"
                  type="button"
                  onClick={() => setActiveStudioPage('ai')}
                >
                  <Wand2 size={16} />
                  配置 brief
                </button>
              </div>
            </article>
          </div>
          <div className="business-route-status">
            {generatorLaunchCards.map((item) => (
              <article className={`generation-credit-card ${item.tone}`} key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <em>{item.note}</em>
              </article>
            ))}
            <div className="generation-launch-status">
              <Sparkles size={16} />
              <span>{seriesGenerationState}</span>
            </div>
          </div>
        </section>

        <section className="beginner-creation-panel" aria-label="零基础创作入口">
          <div className="beginner-creation-head">
            <div>
              <p className="eyebrow">普通人创作</p>
              <h2>一句话生成可交付短剧</h2>
            </div>
            <span>{beginnerCreationState}</span>
          </div>
          <div className="beginner-creation-layout">
            <div className="beginner-idea-box">
              <label>
                <span>一句话想法</span>
                <textarea
                  value={beginnerIdea}
                  onChange={(event) => setBeginnerIdea(event.target.value)}
                  placeholder="例如：外卖员发现每单差评都会让同一天重新开始"
                />
              </label>
              <div className="beginner-option-group" role="group" aria-label="短剧类型">
                <span>类型</span>
                <div>
                  {beginnerGenreOptions.map((option) => (
                    <button
                      className={beginnerGenre === option ? 'active' : ''}
                      type="button"
                      key={option}
                      aria-pressed={beginnerGenre === option}
                      onClick={() => setBeginnerGenre(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div className="beginner-option-group" role="group" aria-label="短剧长度">
                <span>时长</span>
                <div>
                  {beginnerLengthOptions.map((option) => (
                    <button
                      className={beginnerLength === option ? 'active' : ''}
                      type="button"
                      key={option}
                      aria-pressed={beginnerLength === option}
                      onClick={() => setBeginnerLength(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="beginner-goal-box">
              <div className="beginner-goal-grid" role="group" aria-label="创作目标">
                {beginnerGoalOptions.map((option) => (
                  <button
                    className={beginnerGoal === option.id ? 'active' : ''}
                    type="button"
                    key={option.id}
                    aria-pressed={beginnerGoal === option.id}
                    onClick={() => setBeginnerGoal(option.id)}
                  >
                    <span>{option.label}</span>
                    <em>{option.detail}</em>
                  </button>
                ))}
              </div>
              <div className="beginner-preview-grid">
                {beginnerPreviewRows.map((item) => (
                  <article className={item.tone} key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <em>{item.note}</em>
                  </article>
                ))}
              </div>
            </div>
          </div>
          <div className="beginner-flow-row">
            {beginnerFlowRows.map((item) => (
              <article key={item.step}>
                <span>{item.step}</span>
                <div>
                  <strong>{item.title}</strong>
                  <em>{item.detail}</em>
                </div>
              </article>
            ))}
          </div>
          <div className="beginner-creation-actions">
            <button
              className="primary-button compact"
              type="button"
              onClick={() => void generateBeginnerShortDrama()}
              disabled={isSeriesGenerating || isAiBusy}
            >
              <Sparkles size={16} />
              {isSeriesGenerating ? '生成中' : '一键生成草稿'}
            </button>
            <button className="ghost-button compact" type="button" onClick={() => setActiveStudioPage('ai')}>
              <Wand2 size={16} />
              进入专业表单
            </button>
            <span>{selectedBeginnerGoal.constraints}</span>
          </div>
          {beginnerHandoffReady && (
            <div className="beginner-handoff-board" aria-label="生成成功后的下一步">
              <div className="beginner-handoff-head">
                <span>生成成功以后</span>
                <strong>把草稿推进到可试卖</strong>
              </div>
              <div className="beginner-handoff-grid">
                {beginnerHandoffRows.map((item) => (
                  <button
                    className={`beginner-handoff-action ${item.state}`}
                    type="button"
                    key={item.id}
                    onClick={() => void item.action()}
                    disabled={item.id === 'sell' && buildState === '正在生成发布'}
                  >
                    <span className="beginner-handoff-icon">
                      {item.id === 'refine' && <GitBranch size={17} />}
                      {item.id === 'sell' && <Rocket size={17} />}
                      {item.id === 'share' && <Share2 size={17} />}
                    </span>
                    <span className="beginner-handoff-copy">
                      <strong>{item.title}</strong>
                      <em>{item.detail}</em>
                    </span>
                    <span className="beginner-handoff-cta">
                      {item.cta}
                      <ChevronRight size={15} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="command-deck" aria-label="Studio command deck">
        <section className="launch-hero" aria-label="Commercial launch status">
          <div className="launch-hero-copy">
            <div className="hero-kicker">
              <Rocket size={16} />
              <span>商业上线工作区</span>
            </div>
            <h1>短剧生成、互动制作和商业上线，一套工作台打通</h1>
            <p>
              {project.publish.category} · {formatMonetization(project.publish.monetization)} ·{' '}
              {commercialStatusLabel}
            </p>
            <div className="hero-stat-row" aria-label="Launch summary">
              {launchHeroStats.map((item) => (
                <span key={item.label}>
                  <strong>{item.value}</strong>
                  <em>{item.label}</em>
                </span>
              ))}
            </div>
            <div className="hero-actions">
              <button className="primary-button" type="button" onClick={saveProject}>
                <Save size={17} />
                保存当前版本
              </button>
              <button className="ghost-button on-dark" type="button" onClick={openSharePreview}>
                <Play size={17} fill="currentColor" />
                打开预览
              </button>
            </div>
          </div>

          <div className="launch-console" aria-label="Launch pipeline">
            <div className="console-header">
              <span>
                <TerminalSquare size={15} />
                上线门禁
              </span>
              <strong>{commercialProgress}</strong>
            </div>
            <div className="console-body">
              {launchSignals.map((item) => (
                <div className="console-row" key={item.label}>
                  <span className={item.ok ? 'status-dot ok' : 'status-dot'} />
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pipeline-strip" aria-label="Production pipeline">
          {launchPipeline.map((item) => (
            <article className="pipeline-item" key={item.label}>
              <span className={item.ok ? 'pipeline-icon ok' : 'pipeline-icon'}>
                {item.ok ? <CheckCircle2 size={16} /> : <ShieldCheck size={16} />}
              </span>
              <div>
                <strong>{item.label}</strong>
                <em>{item.value}</em>
              </div>
            </article>
          ))}
        </section>

        <section className="metric-grid" aria-label="Project metrics">
          {metrics.map((metric) => {
            const Icon = metric.icon
            return (
              <article className="metric-card" key={metric.label}>
                <Icon size={18} />
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </article>
            )
          })}
        </section>

        </section>

        <section className="overview-ops-panel" aria-label="Workspace operations">
          <div className="overview-trust-grid">
            {overviewTrustCards.map((item) => (
              <article className={`overview-trust-card ${item.tone}`} key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <em>{item.note}</em>
              </article>
            ))}
          </div>
          <div className="overview-action-board">
            <div className="overview-board-heading">
              <div>
                <p className="eyebrow">下一步</p>
                <h2>产品化待办</h2>
              </div>
              <span>{completedOnboardingCount}/{onboardingItems.length}</span>
            </div>
            <div className="overview-action-list">
              {overviewActionRows.map((item) => (
                <article className={`overview-action-row ${item.state}`} key={item.id}>
                  <span className={`overview-action-status ${item.state}`}>
                    {item.state === 'ready' ? '已就绪' : '待处理'}
                  </span>
                  <div>
                    <strong>{item.label}</strong>
                    <em>{item.value}</em>
                    <small>{item.note}</small>
                  </div>
                  <button
                    className="ghost-button compact"
                    type="button"
                    onClick={() => setActiveStudioPage(item.target)}
                  >
                    {item.cta}
                    <ChevronRight size={15} />
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="panel project-switch-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">工作区作品</p>
              <h2>作品库</h2>
            </div>
            <div className="panel-actions">
              <span className="project-list-state">{projectListState}</span>
              <button
                className="ghost-button compact"
                type="button"
                onClick={() => setShowArchivedProjects((current) => !current)}
              >
                {showArchivedProjects ? '隐藏归档' : `归档 ${archivedProjectList.length}`}
              </button>
              <button className="primary-button compact" type="button" onClick={createNewProject}>
                <Plus size={16} />
                新建作品
              </button>
            </div>
          </div>
          <div className="project-library-grid">
            {projectLibraryCards.map((item) => (
              <article className={`project-library-card ${item.tone}`} key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <em>{item.note}</em>
              </article>
            ))}
          </div>
          <div className="current-project-strip">
            <div>
              <span>当前推进</span>
              <strong>{project.title}</strong>
              <em>
                {project.publish.category} · {formatPublishStatus(project.publish.status)} · 更新{' '}
                {currentProjectLibraryRow.updatedLabel}
              </em>
            </div>
            <div className="current-project-checklist">
              {currentProjectChecklist.map((item) => (
                <span className={item.done ? 'done' : ''} key={item.label}>
                  {item.label} · {item.value}
                </span>
              ))}
            </div>
            <div className="current-project-actions">
              <button className="ghost-button compact" type="button" onClick={saveProject}>
                <Save size={15} />
                保存
              </button>
              <button
                className="ghost-button compact"
                type="button"
                onClick={() => setActiveStudioPage('story')}
              >
                剧情
              </button>
              <button
                className="primary-button compact"
                type="button"
                onClick={() => setActiveStudioPage('publish')}
              >
                发布
              </button>
            </div>
          </div>
          <div className="project-switch-list">
            {projectList.length === 0 && (
              <article className={`project-switch-empty project-library-empty ${projectLibraryBlockedByAuth ? 'locked' : ''}`}>
                <div>
                  <strong>{projectLibraryEmptyTitle}</strong>
                  <span>{projectLibraryEmptyCopy}</span>
                </div>
                <div className="empty-action-row">
                  {projectLibraryBlockedByAuth ? (
                    <button
                      className="ghost-button compact"
                      type="button"
                      onClick={() => setAuthState('请先发送验证码登录工作区')}
                    >
                      查看登录提示
                    </button>
                  ) : (
                    <>
                      <button className="ghost-button compact" type="button" onClick={saveProject}>
                        <Save size={15} />
                        保存当前项目
                      </button>
                      <button className="primary-button compact" type="button" onClick={createNewProject}>
                        <Plus size={15} />
                        新建作品
                      </button>
                    </>
                  )}
                </div>
              </article>
            )}
            {projectLibraryRows.map((row) => {
              const item = row.project
              return (
                <article
                  className={`project-switch-item ${item.id === project.id ? 'active' : ''} ${row.tone}`}
                  key={item.id}
                >
                  <button type="button" onClick={() => switchProject(item.id)}>
                    <span className="project-switch-title-row">
                      <strong>{item.title}</strong>
                      <em className={`project-readiness-pill ${row.tone}`}>
                        {row.readyCount}/{row.readyTotal}
                      </em>
                    </span>
                    <span>{item.publish.category} · {formatPublishStatus(item.publish.status)}</span>
                    <small className="project-switch-meta">
                      <span>{item.nodes.length} 节点</span>
                      <span>{row.links} 分支</span>
                      <span>{item.characters.length} 角色</span>
                      <span>{row.endings} 结局</span>
                      <span>{formatMonetization(item.publish.monetization)}</span>
                    </small>
                    <em className="project-switch-updated">更新 {row.updatedLabel}</em>
                  </button>
                  <div className="project-card-actions">
                    <button type="button" onClick={() => duplicateProject(item.id)}>
                      复制
                    </button>
                    <button type="button" onClick={() => archiveProject(item.id)}>
                      归档
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
          {showArchivedProjects && (
            <div className="archived-projects">
              <div className="section-title light">
                <span>归档作品</span>
              </div>
              {archivedProjectList.length === 0 && (
                <article className="project-switch-empty">
                  <strong>暂无归档作品</strong>
                  <span>归档后的作品会保留在这里，可随时恢复</span>
                </article>
              )}
              {archivedProjectLibraryRows.map((row) => {
                const item = row.project
                return (
                  <article className="project-switch-item archived" key={item.id}>
                    <button type="button" onClick={() => restoreProject(item.id)}>
                      <span className="project-switch-title-row">
                        <strong>{item.title}</strong>
                        <em className="project-readiness-pill">{row.readyCount}/{row.readyTotal}</em>
                      </span>
                      <span>{item.publish.category} · 已归档</span>
                      <small className="project-switch-meta">
                        <span>{item.nodes.length} 节点</span>
                        <span>{row.links} 分支</span>
                        <span>{item.characters.length} 角色</span>
                        <span>{formatMonetization(item.publish.monetization)}</span>
                      </small>
                      <em className="project-switch-updated">归档前更新 {row.updatedLabel}</em>
                    </button>
                    <div className="project-card-actions">
                      <button type="button" onClick={() => restoreProject(item.id)}>
                        恢复
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
          </>
        )}

        <div
          className={`content-grid page-${activeStudioPage} ${
            activeStudioPage === 'story' ? '' : 'single-column'
          }`}
        >
          {activeCommandCenter && (
            <section className={`secondary-command-center page-${activeStudioPage}`}>
              <div className="secondary-command-copy">
                <p className="eyebrow">{activeCommandCenter.eyebrow}</p>
                <h2>{activeCommandCenter.title}</h2>
                <span>{activeCommandCenter.summary}</span>
              </div>
              <article className={`secondary-command-primary ${activeCommandCenter.primary.tone}`}>
                <span className="secondary-command-icon">{activeCommandCenter.primary.icon}</span>
                <div>
                  <span>{activeCommandCenter.primary.label}</span>
                  <strong>{activeCommandCenter.primary.value}</strong>
                  <em>{activeCommandCenter.primary.note}</em>
                </div>
              </article>
              <div className="secondary-command-checks">
                {activeCommandCenter.checks.map((item) => (
                  <article className={item.tone} key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <em>{item.note}</em>
                  </article>
                ))}
              </div>
              <div className="secondary-command-actions">
                {activeCommandCenter.actions.map((item) => (
                  <button
                    className="secondary-command-action"
                    type="button"
                    key={item.label}
                    onClick={() => void item.action()}
                    disabled={'disabled' in item ? item.disabled : false}
                  >
                    <span>{item.icon}</span>
                    <div>
                      <strong>{item.label}</strong>
                      <em>{item.detail}</em>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
          {activeStudioPage === 'creation' && (
            <section className="creation-mode-workbench" aria-label="短剧创作模式">
              <div className="creation-mode-header">
                <div>
                  <p className="eyebrow">创作生产工作台</p>
                  <h2>从灵感、梗概、人物、分集到正文，再升级互动短剧</h2>
                  <span>
                    对标专业短剧剧本平台的阶段化写作体验，但最终交付到互动分支、付费结局、发布包和支付验收。
                  </span>
                </div>
                <div className="creation-mode-score">
                  <strong>{creationModeProgress}</strong>
                  <span>阶段就绪</span>
                  <em>{activeCreationStageItem.proof}</em>
                </div>
              </div>

              <div className="creation-business-switch" aria-label="双业务入口">
                {creationBusinessModes.map((mode) => (
                  <button
                    className={`creation-business-card ${mode.id} ${mode.state}`}
                    key={mode.id}
                    type="button"
                    onClick={mode.action}
                  >
                    <span className="creation-business-icon">{mode.icon}</span>
                    <span className="creation-business-copy">
                      <em>{mode.eyebrow}</em>
                      <strong>{mode.title}</strong>
                      <b>{mode.detail}</b>
                    </span>
                    <span className="creation-business-proof">{mode.proof}</span>
                    <span className="creation-business-cta">
                      {mode.cta}
                      <ArrowRight size={15} />
                    </span>
                  </button>
                ))}
              </div>

              <div className="script-production-suite" aria-label="剧本生产总台">
                <div className="script-suite-main">
                  <div className="script-suite-heading">
                    <div>
                      <p className="eyebrow">剧本生产总台</p>
                      <h3>把短剧剧本做成可评估、可复用、可变现的生产资产</h3>
                    </div>
                    <span>
                      对标：灵感策划、拉片拆解、人物小传、分集大纲、剧本正文、单集润色、剧本评估
                    </span>
                  </div>
                  <div className="script-benchmark-strip" aria-label="对标和增强能力">
                    {scriptProductionBenchmarks.map((item) => (
                      <article key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                        <em>{item.note}</em>
                      </article>
                    ))}
                  </div>
                  <div className="script-suite-metrics">
                    {scriptProductionMetrics.map((item) => (
                      <article key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                        <em>{item.note}</em>
                      </article>
                    ))}
                  </div>
                  <div className="script-capability-table" aria-label="剧本生产能力矩阵">
                    {scriptProductionToolRows.map((row) => (
                      <button
                        className={`script-capability-row ${row.state}`}
                        key={row.id}
                        type="button"
                        onClick={() => setActiveCreationStage(row.target)}
                      >
                        <span className="script-capability-icon">{row.icon}</span>
                        <small>{row.state === 'ready' ? '已就绪' : '待补齐'}</small>
                        <strong>{row.label}</strong>
                        <em>{row.baseline}</em>
                        <b>{row.playdrama}</b>
                        <span className="script-capability-open">
                          细修
                          <ChevronRight size={14} />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <aside className="script-suite-actions" aria-label="剧本生产动作">
                  <div>
                    <span>下一步动作</span>
                    <strong>{scriptProductionMaturity >= 80 ? '可交付试用' : '补齐生产资产'}</strong>
                    <em>{seriesGenerationState}</em>
                  </div>
                  {scriptProductionActions.map((item) => (
                    <button
                      className={item.disabled ? 'disabled' : ''}
                      key={item.label}
                      type="button"
                      onClick={() => void item.action()}
                      disabled={item.disabled}
                    >
                      <span>{item.icon}</span>
                      <strong>{item.label}</strong>
                      <em>{item.detail}</em>
                    </button>
                  ))}
                </aside>
              </div>

              <div className="creation-stage-rail" aria-label="创作阶段">
                {creationPipelineStages.map((stage) => (
                  <button
                    className={`creation-stage-card ${stage.state} ${
                      activeCreationStage === stage.id ? 'active' : ''
                    }`}
                    key={stage.id}
                    type="button"
                    onClick={() => setActiveCreationStage(stage.id)}
                  >
                    <span className="creation-stage-step">{stage.step}</span>
                    <span className="creation-stage-icon">{stage.icon}</span>
                    <strong>{stage.label}</strong>
                    <em>{stage.metric}</em>
                  </button>
                ))}
              </div>

              <div className="creation-mode-layout">
                <section className="creation-writing-canvas" aria-label="当前创作稿">
                  <div className="creation-canvas-toolbar">
                    <span>{activeCreationStageItem.step} · {activeCreationStageItem.label}</span>
                    <strong>{activeCreationStageItem.title}</strong>
                    <em className={activeCreationStageItem.state}>
                      {activeCreationStageItem.state === 'ready'
                        ? '已具备演示素材'
                        : activeCreationStageItem.state === 'blocked'
                          ? '需先补齐阻断项'
                          : '待继续细修'}
                    </em>
                  </div>
                  <p className="creation-canvas-copy">{activeCreationStageItem.canvas}</p>
                  <div className="creation-deliverable-list">
                    {activeCreationStageItem.deliverables.map((item) => (
                      <span key={item}>
                        <CheckCircle2 size={15} />
                        {item}
                      </span>
                    ))}
                  </div>
                </section>

                <aside className="creation-ai-panel" aria-label="阶段 AI 动作">
                  <div className="creation-ai-head">
                    <span>AI 动作</span>
                    <strong>{activeCreationStageItem.label}</strong>
                    <em>{seriesGenerationState}</em>
                  </div>
                  <div className="creation-ai-action-list">
                    {activeCreationStageItem.aiActions.map((item) => (
                      <button type="button" key={item} onClick={() => void generateShortDramaProject()} disabled={isSeriesGenerating || isAiBusy}>
                        <Wand2 size={15} />
                        <span>{item}</span>
                      </button>
                    ))}
                  </div>
                  <div className="creation-ai-footer">
                    <button className="ghost-button compact" type="button" onClick={openActiveCreationStageWorkspace}>
                      <ExternalLink size={15} />
                      进入细修
                    </button>
                    <button className="primary-button compact" type="button" onClick={advanceCreationStage}>
                      <ArrowRight size={15} />
                      下一阶段
                    </button>
                  </div>
                </aside>
              </div>

              <div className="creation-benchmark-grid" aria-label="对标能力">
                <article>
                  <span>对标剧本平台</span>
                  <strong>灵感策划、人物小传、分集大纲、剧本正文</strong>
                  <em>把 StoryPlay 的核心写作链路变成 PlayDrama 的前置生产流程。</em>
                </article>
                <article>
                  <span>PlayDrama 增强</span>
                  <strong>互动分支、付费隐藏线、节点收益预估</strong>
                  <em>不是只交一个文本剧本，而是直接进入可试玩、可试卖的互动结构。</em>
                </article>
                <article>
                  <span>商用出口</span>
                  <strong>发布包、微信验收、订单和数据回流</strong>
                  <em>客户看到的是从创作到收款的闭环，而不是单点生成能力。</em>
                </article>
              </div>
            </section>
          )}
          {visibleGeneratedReview && (
            <section className={pagePanelClass('panel generated-review-panel', ['creation', 'story', 'ai'])}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">大厂级生成验收</p>
                  <h2>{visibleGeneratedReview.title}</h2>
                </div>
                <span className="generated-review-source">
                  {visibleGeneratedReview.providerId} / {visibleGeneratedReview.model}
                </span>
              </div>
              <div className="generated-review-grid">
                {generatedReviewMetrics.map((item) => (
                  <article key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <em>{item.note}</em>
                  </article>
                ))}
              </div>
              <div className="production-benchmark-row" aria-label="Big platform parity">
                <article className={videoProvider?.productionReady ? 'ready' : 'partial'}>
                  <span>视频 API</span>
                  <strong>{videoProvider?.productionReady ? '可真调' : '待配置'}</strong>
                  <em>{videoProviderLabel} · {videoProvider?.openApiMode || '检测中'}</em>
                </article>
                {visibleGeneratedReview.benchmarkCapabilities.map((item) => (
                  <article className={item.state} key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.state === 'ready' ? '已就绪' : '需补齐'}</strong>
                    <em>{item.detail}</em>
                  </article>
                ))}
              </div>
              <div className="generated-review-body">
                <div className="generated-review-checks">
                  {visibleGeneratedReview.qualityChecks.map((item) => (
                    <span key={item}>
                      <CheckCircle2 size={15} />
                      {item}
                    </span>
                ))}
                </div>
                <p>{visibleGeneratedReview.note}</p>
              </div>
              <div className="production-intelligence-board" aria-label="短剧制作智能体">
                <article className="production-memory-panel">
                  <div className="section-title light">
                    <span>制作记忆库</span>
                    <em>人物、声音、场景和商业卡点锁定</em>
                  </div>
                  <div className="production-memory-grid">
                    {productionMemoryRows.map((item) => (
                      <div className={item.status} key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                        <em>{item.detail}</em>
                      </div>
                    ))}
                  </div>
                </article>
                <article className="director-agent-panel">
                  <div className="section-title light">
                    <span>对话式导演修改</span>
                    <em>先复制指令，后续接单镜头重跑</em>
                  </div>
                  <p className="director-instruction-state">{directorInstructionState}</p>
                  <div className="director-action-list">
                    {directorActionRows.map((action) => (
                      <button
                        className={action.status}
                        key={action.id}
                        type="button"
                        onClick={() => void copyDirectorInstruction(action)}
                      >
                        <span>{action.target}</span>
                        <div>
                          <strong>{action.label}</strong>
                          <em>{action.instruction}</em>
                          <small>{action.impact}</small>
                        </div>
                        <Clipboard size={14} />
                      </button>
                    ))}
                  </div>
                </article>
                <article className="production-quality-panel">
                  <div className="section-title light">
                    <span>商用质量验收</span>
                    <em>对齐长视频生成评测指标</em>
                  </div>
                  <div className="production-quality-grid">
                    {productionQualityMetrics.map((metric) => (
                      <div className={metric.status} key={metric.label}>
                        <span>{metric.label}</span>
                        <strong>{metric.value}</strong>
                        <em>{metric.threshold}</em>
                        <small>{metric.detail}</small>
                      </div>
                    ))}
                  </div>
                </article>
              </div>
              <div className="production-kit-grid">
                <article className="production-kit-section production-storyboard-section">
                  <div className="section-title light">
                    <span>导演分镜</span>
                    <em>{visibleGeneratedReview.storyboardShots.length} 镜</em>
                  </div>
                  <div className="storyboard-shot-list">
                    {visibleGeneratedReview.storyboardShots.slice(0, 6).map((shot) => (
                      <div className="storyboard-shot-row" key={shot.id}>
                        <span>{shot.id}</span>
                        <div>
                          <strong>{shot.beat}</strong>
                          <em>{shot.scene}</em>
                          <small>{shot.camera} · {shot.motion} · {shot.duration}</small>
                        </div>
                        <small>{shot.status === 'ready' ? 'Prompt 就绪' : shot.status === 'queued' ? '队列待跑' : '缺参考图'}</small>
                      </div>
                    ))}
                  </div>
                </article>
                <article className="production-kit-section">
                  <div className="section-title light">
                    <span>角色一致性</span>
                    <em>{visibleGeneratedReview.characterAssets.length} 份参考</em>
                  </div>
                  <div className="continuity-asset-list">
                    {visibleGeneratedReview.characterAssets.slice(0, 4).map((asset) => (
                      <div className="continuity-asset-row" key={asset.name}>
                        <strong>{asset.name}</strong>
                        <span>{asset.role}</span>
                        <em>{asset.wardrobe}</em>
                        <small>{asset.consistency}% 一致性</small>
                      </div>
                    ))}
                  </div>
                </article>
                <article className="production-kit-section">
                  <div className="section-title light">
                    <span>视频生产队列</span>
                    <em>{videoJobSummary.total > 0 ? `${videoJobSummary.total} 已提交` : `${visibleGeneratedReview.videoQueue.length} 条`}</em>
                  </div>
                  <div className="video-provider-strip">
                    <span>{videoProviderLabel}</span>
                    <strong>
                      {videoPipelineStatusText}
                    </strong>
                    <em>
                      {isLiveVideoProvider
                        ? `真实生成已开启，每次最多提交 ${videoSubmitLimit} 条`
                        : videoProvider?.commercial?.nextStep || '未接入 Key 时仅生成 Prompt 任务'}
                    </em>
                  </div>
                  <div className="video-pipeline-board" aria-label="成片生产流水线">
                    {videoPipelineCards.map((card) => (
                      <article className={card.state} key={card.label}>
                        <span>{card.label}</span>
                        <strong>{card.value}</strong>
                        <em>{card.note}</em>
                      </article>
                    ))}
                  </div>
                  <div className="video-pipeline-actions">
                    <button type="button" onClick={() => void submitProductionVideoQueue()}>
                      <Clapperboard size={14} />
                      {isLiveVideoProvider ? '生成下一条' : '生成 Prompt 批次'}
                    </button>
                    <button type="button" onClick={() => void refreshSubmittedVideoJobs()}>
                      <RotateCcw size={14} />
                      刷新任务
                    </button>
                    <button
                      type="button"
                      onClick={exportFinalVideoDeliveryPack}
                      disabled={!videoPipelineCanExport}
                    >
                      <Download size={14} />
                      导出成片交付包
                    </button>
                    <button
                      type="button"
                      onClick={() => void startFinalVideoRender()}
                      disabled={!finalVideoRenderCanStart}
                    >
                      <Play size={14} />
                      合成 MP4
                    </button>
                  </div>
                  <div className="final-render-setup" aria-label="成片交付配置">
                    <div className="final-render-option-group wide">
                      <span>交付模式</span>
                      <div className="final-render-segment-row">
                        {finalVideoDeliveryModes.map((mode) => (
                          <button
                            className={finalVideoDeliveryMode === mode.id ? 'active' : ''}
                            key={mode.id}
                            type="button"
                            onClick={() => setFinalVideoDeliveryMode(mode.id)}
                          >
                            <strong>{mode.label}</strong>
                            <em>{mode.detail}</em>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="final-render-option-group">
                      <span>字幕</span>
                      <div className="final-render-segment-row compact">
                        <button
                          className={finalVideoSubtitleMode === 'sidecar' ? 'active' : ''}
                          type="button"
                          onClick={() => setFinalVideoSubtitleMode('sidecar')}
                        >
                          <strong>SRT</strong>
                          <em>侧挂交付</em>
                        </button>
                        <button
                          className={finalVideoSubtitleMode === 'burned-in' ? 'active' : ''}
                          type="button"
                          onClick={() => setFinalVideoSubtitleMode('burned-in')}
                        >
                          <strong>烧录</strong>
                          <em>失败保留 SRT</em>
                        </button>
                      </div>
                    </div>
                    <div className="final-render-option-group">
                      <span>音轨</span>
                      <div className="final-render-segment-row compact">
                        <button
                          className={finalVideoAudioMode === 'silent' ? 'active' : ''}
                          type="button"
                          onClick={() => setFinalVideoAudioMode('silent')}
                        >
                          <strong>静音</strong>
                          <em>AAC 音轨床</em>
                        </button>
                        <button
                          className={finalVideoAudioMode === 'mixing-ready' ? 'active' : ''}
                          type="button"
                          onClick={() => setFinalVideoAudioMode('mixing-ready')}
                        >
                          <strong>混音</strong>
                          <em>待配乐音效</em>
                        </button>
                        <button
                          className={finalVideoAudioMode === 'voiceover-ready' ? 'active' : ''}
                          type="button"
                          onClick={() => setFinalVideoAudioMode('voiceover-ready')}
                        >
                          <strong>口播</strong>
                          <em>待配音</em>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="final-render-console">
                    <div className="final-render-strip">
                      <span>{finalVideoRenderStatusText}</span>
                      <strong>{latestFinalVideoRender ? `${finalVideoRenderVersion} · ${latestFinalVideoRender.clipCount} 条素材` : '待创建任务'}</strong>
                      <em>{finalVideoRenderState}</em>
                      <div>
                        <button type="button" onClick={() => void refreshFinalVideoRenders()}>
                          <RotateCcw size={14} />
                          刷新成片
                        </button>
                        {finalVideoRenderDownloadUrl && (
                          <a href={finalVideoRenderDownloadUrl} download>
                            <Download size={14} />
                            下载 MP4
                          </a>
                        )}
                        {finalVideoRenderCaptionsUrl && (
                          <a href={finalVideoRenderCaptionsUrl} download>
                            <FileText size={14} />
                            下载字幕
                          </a>
                        )}
                        {finalVideoRenderManifestUrl && (
                          <a href={finalVideoRenderManifestUrl} target="_blank" rel="noreferrer">
                            <FileText size={14} />
                            合成清单
                          </a>
                        )}
                        {latestFinalVideoRender &&
                          ['failed', 'handoff-ready'].includes(latestFinalVideoRender.status) && (
                            <button type="button" onClick={() => void retryLatestFinalVideoRender()}>
                              <RotateCcw size={14} />
                              重试合成
                            </button>
                          )}
                      </div>
                    </div>
                    {latestFinalVideoRender && (
                      <>
                        <div className="final-render-delivery-grid" aria-label="成片交付资产">
                          <article>
                            <span>版本</span>
                            <strong>{finalVideoRenderVersion}</strong>
                            <em>{formatFinalVideoDeliveryProfile(latestFinalVideoRender.request?.deliveryProfile)}</em>
                          </article>
                          <article>
                            <span>音轨</span>
                            <strong>{finalVideoRenderAudioText}</strong>
                            <em>{formatFinalVideoPolicy(latestFinalVideoRender.request?.musicPolicy)}</em>
                          </article>
                          <article>
                            <span>字幕</span>
                            <strong>{finalVideoRenderSubtitleText}</strong>
                            <em>{formatFinalVideoPolicy(latestFinalVideoRender.request?.subtitlePolicy)}</em>
                          </article>
                          <article>
                            <span>审片</span>
                            <strong>
                              {finalVideoRenderReviewChecklist.length > 0
                                ? `${finalVideoRenderReviewDoneCount}/${finalVideoRenderReviewChecklist.length}`
                                : '待创建'}
                            </strong>
                            <em>{finalVideoRenderReviewVerdictText}</em>
                          </article>
                          <article>
                            <span>归档</span>
                            <strong>{finalVideoArchiveText}</strong>
                            <em>{formatFinalVideoPolicy(latestFinalVideoRender.request?.archivePolicy)}</em>
                          </article>
                        </div>
                        {finalVideoVersionCompareRows.length > 0 && (
                          <div className="final-render-version-board" aria-label="成片版本对比">
                            {finalVideoVersionCompareRows.map((row) => (
                              <article key={row.label}>
                                <span>{row.label}</span>
                                <strong>{row.value}</strong>
                                <em>{row.note}</em>
                              </article>
                            ))}
                          </div>
                        )}
                        {finalVideoRenderReviewChecklist.length > 0 && (
                          <div className="final-render-review-list" aria-label="成片审片清单">
                            {finalVideoRenderReviewChecklist.slice(0, 4).map((item) => (
                              <div key={item.id}>
                                <span>{item.owner}</span>
                                <strong>{item.label}</strong>
                                <em>{item.note || item.status}</em>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="final-render-review-compose" aria-label="客户审片批注">
                          <div>
                            <span>客户审片批注</span>
                            <strong>{finalVideoRenderReviewNotes.length} 条已保存</strong>
                            <em>批注会写入 manifest 和 json，方便下一版重合成对比。</em>
                          </div>
                          <textarea
                            value={finalVideoReviewNote}
                            onChange={(event) => setFinalVideoReviewNote(event.target.value)}
                            rows={3}
                            placeholder="例如：第 3 镜人物表情跳变，字幕需要提前 0.5 秒出现。"
                          />
                          <div className="final-render-review-controls">
                            {(['needs-changes', 'approved', 'blocked'] as const).map((verdict) => (
                              <button
                                className={finalVideoReviewVerdict === verdict ? 'active' : ''}
                                key={verdict}
                                type="button"
                                onClick={() => setFinalVideoReviewVerdict(verdict)}
                              >
                                {formatFinalVideoReviewVerdict(verdict)}
                              </button>
                            ))}
                            <button
                              className="primary"
                              type="button"
                              onClick={() => void saveFinalVideoReviewNote()}
                              disabled={!latestFinalVideoRender || !finalVideoReviewNote.trim()}
                            >
                              <Save size={14} />
                              保存批注
                            </button>
                          </div>
                          {finalVideoRenderReviewNotes.length > 0 && (
                            <div className="final-render-note-list">
                              {finalVideoRenderReviewNotes.slice(-3).reverse().map((note) => (
                                <article key={note.id || `${note.createdAt}-${note.text}`}>
                                  <span>{note.frame || '全片'} · {formatFinalVideoReviewVerdict(note.severity)}</span>
                                  <strong>{note.text}</strong>
                                  <em>{note.author || '客户审片'} · {note.createdAt ? new Date(note.createdAt).toLocaleString('zh-CN') : '刚刚'}</em>
                                </article>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="video-queue-list">
                    {visibleGeneratedReview.videoQueue.slice(0, 5).map((item) => {
                      const submittedJob = videoJobByShotId.get(item.shotId)
                      const storyboardShot = visibleGeneratedReview.storyboardShots.find(
                        (candidate) => candidate.id === item.shotId,
                      )
                      return (
                      <div className={`video-queue-row ${submittedJob?.status || ''}`} key={item.id}>
                        <span>{item.id}</span>
                        <div>
                          <strong>{submittedJob ? `${submittedJob.provider} / ${submittedJob.model}` : item.provider}</strong>
                          <em>{item.shotId} · {submittedJob?.externalId ? `任务 ${submittedJob.externalId}` : item.model}</em>
                          {submittedJob?.errorMessage && <em>{submittedJob.errorMessage}</em>}
                          {submittedJob?.outputUrl && (
                            <video
                              className="video-job-preview"
                              controls
                              muted
                              preload="metadata"
                              src={submittedJob.outputUrl}
                            />
                          )}
                          <div className="video-job-actions">
                            {submittedJob?.outputUrl && (
                              <>
                                <button type="button" onClick={() => void openVideoJobPreview(submittedJob)}>
                                  <ExternalLink size={14} />
                                  平台预览
                                </button>
                                <button type="button" onClick={() => void copyVideoJobUrl(submittedJob)}>
                                  <Clipboard size={14} />
                                  复制链接
                                </button>
                              </>
                            )}
                            {storyboardShot && (
                              <button
                                type="button"
                                onClick={() =>
                                  submittedJob?.status === 'failed'
                                    ? void retrySubmittedVideoJob(submittedJob)
                                    : void regenerateVideoShot(item, storyboardShot)
                                }
                              >
                                <RotateCcw size={14} />
                                {submittedJob?.status === 'failed' ? '重试' : submittedJob ? '重生成' : '生成'}
                              </button>
                            )}
                          </div>
                        </div>
                        <small>
                          {submittedJob
                            ? formatVideoJobStatus(submittedJob.status)
                            : item.status === 'prompt-ready'
                              ? 'Prompt 就绪'
                              : item.status === 'queued'
                                ? '排队中'
                                : '缺参考'}
                        </small>
                      </div>
                      )
                    })}
                  </div>
                </article>
                <article className="production-kit-section">
                  <div className="section-title light">
                    <span>导出交付包</span>
                    <em>{visibleGeneratedReview.exportCount}/{visibleGeneratedReview.exportItems.length}</em>
                  </div>
                  <div className="production-export-list">
                    {visibleGeneratedReview.exportItems.map((item) => (
                      <div className={item.status} key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </article>
              </div>
              <div className="generated-review-actions">
                <button
                  className="ghost-button compact"
                  type="button"
                  onClick={() => {
                    setSelectedNodeId(project.nodes[0].id)
                    setSearchQuery('')
                  }}
                >
                  <FileText size={16} />
                  继续细修剧情
                </button>
                <button
                  className="ghost-button compact"
                  type="button"
                  onClick={() => restartRuntime(project)}
                >
                  <Play size={16} fill="currentColor" />
                  试玩主路径
                </button>
                <button
                  className="ghost-button compact"
                  type="button"
                  onClick={() => void submitProductionVideoQueue()}
                >
                  <Clapperboard size={16} />
                  {isLiveVideoProvider ? '生成 1 条视频' : '提交视频队列'}
                </button>
                <button
                  className="ghost-button compact"
                  type="button"
                  onClick={() => void refreshSubmittedVideoJobs()}
                >
                  <RotateCcw size={16} />
                  刷新视频任务
                </button>
                <button
                  className="ghost-button compact"
                  type="button"
                  onClick={exportFinalVideoDeliveryPack}
                  disabled={!videoPipelineCanExport}
                >
                  <Download size={16} />
                  导出成片交付包
                </button>
                <button
                  className="ghost-button compact"
                  type="button"
                  onClick={() => void copyProductionPromptPack()}
                >
                  <Clipboard size={16} />
                  复制视频 Prompt 包
                </button>
                <button
                  className="primary-button compact"
                  type="button"
                  onClick={() => setActiveStudioPage('publish')}
                >
                  <Share2 size={16} />
                  进入发布验收
                </button>
                <span className="video-generation-state">{videoGenerationState}</span>
              </div>
            </section>
          )}
          <section className={pagePanelClass('panel story-panel', ['story'])}>
            <div className="panel-header">
              <div>
                <p className="eyebrow">剧情图谱</p>
                <h2>剧情图谱</h2>
              </div>
              <div className="panel-actions">
                <button className="ghost-button compact" type="button" onClick={addStoryNode}>
                  <Plus size={16} />
                  添加节点
                </button>
                <button
                  className="primary-button compact"
                  type="button"
                  onClick={generateNextScene}
                  disabled={isAiBusy}
                >
                  <Wand2 size={16} />
                  {isAiBusy ? '处理中' : '生成下一幕'}
                </button>
              </div>
            </div>
            <p className="ai-generation-status">{aiState}</p>
            <div className="story-command-board">
              <article className="story-focus-card">
                <span>编辑焦点</span>
                <strong>{selectedNode.id} · {selectedNode.title}</strong>
                <em>
                  {selectedNode.kind} · {selectedNodeDiagnostic.readiness}% 就绪 · {selectedNodeDiagnostic.outgoing} 出站
                </em>
                <div className="story-command-actions">
                  <button type="button" onClick={previewSelectedNode}>
                    <Play size={14} fill="currentColor" />
                    预览此节点
                  </button>
                  <button type="button" onClick={() => generatePaidHiddenLine()}>
                    <KeyRound size={14} />
                    生成付费线
                  </button>
                  <button type="button" onClick={jumpToFirstStoryIssue}>
                    <AlertTriangle size={14} />
                    定位待修
                  </button>
                </div>
              </article>
              <article className={`story-diagnosis-card ${firstStoryIssue ? 'warn' : 'clean'}`}>
                <span>剧情诊断</span>
                <strong>
                  {firstStoryIssue
                    ? `${storyDiagnosisSummary.critical} 阻断 · ${storyDiagnosisSummary.warning} 提醒`
                    : '无阻断'}
                </strong>
                <em>
                  {firstStoryIssue
                    ? `${firstStoryIssue.nodeId}：${firstStoryIssue.issues[0]?.label}`
                    : `${storyDiagnosisSummary.clean}/${storyNodes.length} 节点稳定`}
                </em>
                <div className="story-diagnosis-meter" aria-hidden="true">
                  <span
                    style={{
                      width: `${Math.round(
                        (storyDiagnosisSummary.clean / Math.max(1, storyNodes.length)) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </article>
            </div>
            <div className="story-review-grid">
              {storyReviewCards.map((item) => (
                <article className={`story-review-card ${item.tone}`} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <em>{item.note}</em>
                </article>
              ))}
            </div>
            <div className="story-commercial-grid">
              {storyCommercialRows.map((item) => (
                <article className={`story-commercial-card ${item.tone}`} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <em>{item.note}</em>
                </article>
              ))}
            </div>
            <div className="story-path-comparison">
              <div className="section-title light">
                <span>主路径 / 付费路径对比</span>
                <em>{paidPathLiftPercent > 0 ? `付费价值 +${paidPathLiftPercent}%` : '等待付费线'}</em>
              </div>
              {pathComparisonRows.map((row) => (
                <button
                  className={`story-path-compare-row ${row.tone}`}
                  key={row.id}
                  type="button"
                  onClick={() => {
                    if (row.id === 'paid-path' && paidEndingNodeIds[0]) {
                      focusStoryNode(paidEndingNodeIds[0], `已定位付费结局 ${paidEndingNodeIds[0]}`)
                    } else if (row.id === 'risk-path') {
                      jumpToFirstStoryIssue()
                    } else if (storyReachability.mainRoute[0]) {
                      focusStoryNode(storyReachability.mainRoute[0].id, '已定位主线入口')
                    }
                  }}
                >
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                  <em>{row.note}</em>
                </button>
              ))}
            </div>
            <div className="story-ops-board">
              <div className="story-path-ledger">
                <div className="section-title light">
                  <span>主线验收</span>
                  <em>{storyReachability.status === 'clean' ? '闭环稳定' : '需要复核'}</em>
                </div>
                {storyReachability.mainRoute.length === 0 ? (
                  <article className="empty">
                    <strong>暂无可验收主线</strong>
                    <span>添加开局节点后会自动串出主线</span>
                  </article>
                ) : (
                  storyReachability.mainRoute.map((node, index) => {
                    const diagnostic = storyDiagnosticByNodeId.get(node.id)

                    return (
                      <button
                        className={`story-path-row ${diagnostic?.status || 'clean'}`}
                        key={`${node.id}-${index}`}
                        type="button"
                        onClick={() =>
                          focusStoryNode(node.id, `已定位主线 ${node.id} · ${node.title}`)
                        }
                      >
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        <div>
                          <strong>{node.id} · {node.title}</strong>
                          <em>{diagnostic?.issues[0]?.label || node.metric || '结构稳定'}</em>
                        </div>
                        <small>{node.kind}</small>
                      </button>
                    )
                  })
                )}
              </div>
              <div className="story-issue-queue">
                <div className="section-title light">
                  <span>问题队列</span>
                  <em>{storyIssueRows.length === 0 ? '无阻断' : `${storyIssueRows.length} 项`}</em>
                </div>
                {storyIssueRows.length === 0 ? (
                  <article className="clean">
                    <CheckCircle2 size={15} />
                    <div>
                      <strong>剧情结构可进入试玩</strong>
                      <span>当前没有阻断项</span>
                    </div>
                  </article>
                ) : (
                  storyIssueRows.slice(0, 5).map((row) => (
                    <button
                      className={`story-issue-row ${row.tone}`}
                      key={row.id}
                      type="button"
                      onClick={() =>
                        focusStoryNode(row.nodeId, `已定位 ${row.nodeId} · ${row.label}`)
                      }
                    >
                      <AlertTriangle size={15} />
                      <div>
                        <strong>{row.nodeId} · {row.nodeTitle}</strong>
                        <span>{row.label}</span>
                      </div>
                      <em>{row.readiness}%</em>
                    </button>
                  ))
                )}
              </div>
              <div className="story-paywall-lane">
                <div className="section-title light">
                  <span>付费路径</span>
                  <em>
                    {project.publish.monetization === 'Paid Ending'
                      ? `${storyReachability.paidBranchRows.length} 条`
                      : '未启用'}
                  </em>
                </div>
                {project.publish.monetization !== 'Paid Ending' ? (
                  <article className="empty">
                    <strong>发布页未启用付费结局</strong>
                    <span>切到付费结局后，这里会显示解锁路径</span>
                  </article>
                ) : storyReachability.paidBranchRows.length === 0 ? (
                  <article className="empty warn">
                    <strong>付费结局尚未被选择触达</strong>
                    <span>把某个分支目标指向结局节点</span>
                  </article>
                ) : (
                  storyReachability.paidBranchRows.slice(0, 4).map((row) => (
                    <button
                      className={`story-paywall-row ${row.reachable ? 'ready' : 'warn'}`}
                      key={row.id}
                      type="button"
                      onClick={() =>
                        focusStoryNode(row.sourceId, `已定位付费入口 ${row.sourceId} · ${row.label}`)
                      }
                    >
                      <KeyRound size={15} />
                      <div>
                        <strong>{row.sourceId} → {row.targetId}</strong>
                        <span>{row.label}</span>
                      </div>
                      <em>{row.condition}</em>
                    </button>
                  ))
                )}
              </div>
            </div>
            <div className="story-health-strip">
              {storyHealthCards.map((item) => (
                <article className={`story-health-card ${item.tone}`} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <em>{item.note}</em>
                </article>
              ))}
            </div>

            <div className="graph-canvas" aria-label="Story graph canvas">
              {storyNodes.map((node) => {
                const diagnostic = storyDiagnosticByNodeId.get(node.id)

                return (
                  <button
                    className={`graph-node ${node.id === selectedNodeId ? 'selected' : ''} ${
                      diagnostic?.status || 'clean'
                    }`}
                    key={node.id}
                    type="button"
                    onClick={() => setSelectedNodeId(node.id)}
                  >
                    <span>{node.id}</span>
                    <strong>{node.title}</strong>
                    <em>{node.kind}</em>
                    <small>
                      {node.choices.length > 0
                        ? node.choices.map((item) => item.targetNodeId).join(' / ')
                        : '暂无后续节点'}
                    </small>
                    <span className="graph-node-status">
                      {diagnostic?.issues[0]?.label || '结构稳定'}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="story-route-board" aria-label="Story route review">
              {storyRouteStages.map((item, index) => (
                <article
                  className={`story-route-step ${item.diagnostic?.status || 'clean'}`}
                  key={item.node.id}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>{item.node.title}</strong>
                    <em>{item.diagnostic?.issues[0]?.label || item.nextLabel}</em>
                  </div>
                  {index < storyRouteStages.length - 1 && <ArrowRight size={15} />}
                </article>
              ))}
            </div>
            <div className="story-inspector-strip">
              <article>
                <span>当前节点</span>
                <strong>{selectedNode.id} · {selectedNode.title}</strong>
                <em>{selectedNode.kind} · {selectedNode.metric || '指标待补'}</em>
              </article>
              <article>
                <span>入站引用</span>
                <strong>{selectedNodeIncoming.length}</strong>
                <em>
                  {selectedNodeIncoming.length > 0
                    ? selectedNodeIncoming.map((node) => node.id).join(' / ')
                    : '首节点或未连接'}
                </em>
              </article>
              <article>
                <span>出站选择</span>
                <strong>{selectedNode.choices.length}</strong>
                <em>
                  {selectedNode.choices.length > 0
                    ? selectedNode.choices.map((item) => item.targetNodeId).join(' / ')
                    : '结局或断点'}
                </em>
              </article>
              <article>
                <span>节点状态</span>
                <strong>
                  {selectedNodeReadiness.filter((item) => item.done).length}/{selectedNodeReadiness.length}
                </strong>
                <em>{selectedNodeReadiness.map((item) => `${item.done ? 'OK' : '-'} ${item.label}`).join(' · ')}</em>
              </article>
            </div>

            <div className="node-list">
              {filteredNodes.map((node, index) => (
                <button
                  className={`story-node ${node.id === selectedNodeId ? 'selected' : ''}`}
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedNodeId(node.id)}
                >
                  <span className="node-index">{index + 1}</span>
                  <span className="node-body">
                    <span className="node-title-row">
                      <span>{node.id}</span>
                      <strong>{node.title}</strong>
                      <em>{node.kind}</em>
                    </span>
                    <span className="node-summary">{node.summary}</span>
                  </span>
                  <span className="node-metric">{node.metric}</span>
                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
          </section>

          <aside className="right-column">
            <section className={pagePanelClass('panel editor-panel series-generator-panel', ['ai'])}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">普通短剧生成</p>
                  <h2>普通短剧创作平台</h2>
                </div>
                <span className={`ai-director-state ${isSeriesGenerating ? 'waiting' : 'ready'}`}>
                  {isSeriesGenerating ? '生成中' : '可生成'}
                </span>
              </div>
              <div className="ordinary-series-studio" aria-label="普通短剧创作平台模式">
                <div className="ordinary-series-hero">
                  <div>
                    <p className="eyebrow">短剧生产工作流</p>
                    <h3>先做故事设定、剧本评估和正文生产，再进入视频脚本和交付包</h3>
                    <span>
                      从一句话卖点到分集正文、镜头脚本和客户交付包，普通短剧先成片，再升级互动付费。
                    </span>
                  </div>
                  <div className="ordinary-series-score">
                    <strong>{visibleGeneratedReview ? '生产包已生成' : `${ordinaryScriptEvaluationRows[0].value}%`}</strong>
                    <span>{visibleGeneratedReview ? '可继续交付' : '剧本预评估'}</span>
                    <em>{seriesGenerationState}</em>
                  </div>
                </div>
                <div className="ordinary-capability-grid" aria-label="普通短剧能力">
                  {ordinaryStudioCapabilityCards.map((item) => (
                    <article className={item.status} key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <em>{item.note}</em>
                    </article>
                  ))}
                </div>
                <div className="ordinary-stage-rail" aria-label="普通短剧生产阶段">
                  {ordinaryCreationStages.map((stage) => {
                    const StageIcon = stage.icon
                    return (
                      <article className={stage.state} key={stage.index}>
                        <span>{stage.index}</span>
                        <div>
                          <StageIcon size={17} />
                          <strong>{stage.label}</strong>
                        </div>
                        <em>{stage.detail}</em>
                      </article>
                    )
                  })}
                </div>
                <div className="ordinary-storyplay-layout">
                  <section className="ordinary-blueprint-board" aria-label="故事设定多方案">
                    <div className="ordinary-section-head">
                      <span>故事设定多方案</span>
                      <strong>先选方向，再生成剧本生产包</strong>
                    </div>
                    <div className="ordinary-blueprint-list">
                      {ordinaryStoryBlueprints.map((option) => (
                        <button
                          type="button"
                          key={option.id}
                          onClick={() => {
                            setSeriesGenerator((current) => ({
                              ...current,
                              idea: option.idea,
                              genre: option.genre,
                              monetization: option.monetization,
                              constraints: option.constraints,
                            }))
                            setSeriesGenerationState(`已套用：${option.label}`)
                          }}
                        >
                          <span>{option.label}</span>
                          <strong>{option.title}</strong>
                          <em>{option.proof}</em>
                          <b>套用方案</b>
                        </button>
                      ))}
                    </div>
                  </section>
                  <section className="ordinary-evaluation-board" aria-label="AI 剧本评估系统">
                    <div className="ordinary-section-head">
                      <span>AI 剧本评估系统</span>
                      <strong>结构、钩子、冲突和商业转化</strong>
                    </div>
                    <div className="ordinary-evaluation-list">
                      {ordinaryScriptEvaluationRows.map((item) => (
                        <article key={item.label}>
                          <div>
                            <span>{item.label}</span>
                            <strong>{item.value}%</strong>
                          </div>
                          <i aria-hidden="true">
                            <span style={{ width: `${item.value}%` }} />
                          </i>
                          <em>{item.note}</em>
                        </article>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
              <div className="series-generator-grid">
                <label className="wide-field">
                  <span>题材钩子</span>
                  <textarea
                    value={seriesGenerator.idea}
                    onChange={(event) => updateSeriesGenerator('idea', event.target.value)}
                  />
                </label>
                <label>
                  <span>类型</span>
                  <select
                    value={seriesGenerator.genre}
                    onChange={(event) => updateSeriesGenerator('genre', event.target.value)}
                  >
                    <option value="悬疑反转">悬疑反转</option>
                    <option value="都市情感">都市情感</option>
                    <option value="职场逆袭">职场逆袭</option>
                    <option value="甜宠喜剧">甜宠喜剧</option>
                    <option value="家庭伦理">家庭伦理</option>
                  </select>
                </label>
                <label>
                  <span>受众</span>
                  <input
                    value={seriesGenerator.audience}
                    onChange={(event) => updateSeriesGenerator('audience', event.target.value)}
                  />
                </label>
                <label>
                  <span>平台</span>
                  <input
                    value={seriesGenerator.platform}
                    onChange={(event) => updateSeriesGenerator('platform', event.target.value)}
                  />
                </label>
                <label>
                  <span>时长</span>
                  <input
                    value={seriesGenerator.duration}
                    onChange={(event) => updateSeriesGenerator('duration', event.target.value)}
                  />
                </label>
                <label>
                  <span>互动密度</span>
                  <select
                    value={seriesGenerator.interactionDensity}
                    onChange={(event) =>
                      updateSeriesGenerator('interactionDensity', event.target.value)
                    }
                  >
                    <option value="每 1-2 幕一个选择">每 1-2 幕一个选择</option>
                    <option value="每 2-3 幕一个选择">每 2-3 幕一个选择</option>
                    <option value="关键转折点选择">关键转折点选择</option>
                  </select>
                </label>
                <label>
                  <span>变现</span>
                  <select
                    value={seriesGenerator.monetization}
                    onChange={(event) =>
                      updateSeriesGenerator('monetization', event.target.value)
                    }
                  >
                    <option value="Free">免费体验</option>
                    <option value="Paid Ending">付费结局</option>
                    <option value="Paid Chapter">付费章节</option>
                  </select>
                </label>
                <label className="wide-field">
                  <span>边界条件</span>
                  <textarea
                    value={seriesGenerator.constraints}
                    onChange={(event) =>
                      updateSeriesGenerator('constraints', event.target.value)
                    }
                  />
                </label>
              </div>
              <div className="series-generator-strip">
                {seriesGeneratorCards.map((item) => (
                  <article key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <em>{item.note}</em>
                  </article>
                ))}
              </div>
              <div className="series-generator-actions">
                <div className="series-generator-button-group" aria-label="短剧生产操作">
                  <button
                    className="primary-button compact"
                    type="button"
                    onClick={generateShortDramaProject}
                    disabled={isSeriesGenerating || isAiBusy}
                  >
                    <Clapperboard size={16} />
                    {isSeriesGenerating ? '生成中' : '生成短剧生产包'}
                  </button>
                  <button
                    className="ghost-button compact"
                    type="button"
                    onClick={() => void exportGeneratedProductionPack()}
                    disabled={!visibleGeneratedReview}
                  >
                    <Download size={16} />
                    导出普通短剧包
                  </button>
                  <button
                    className="ghost-button compact"
                    type="button"
                    onClick={upgradeSeriesToInteractiveDrama}
                  >
                    <GitBranch size={16} />
                    升级互动短剧
                  </button>
                  <button
                    className="ghost-button compact"
                    type="button"
                    onClick={() => void submitProductionVideoQueue()}
                    disabled={!visibleGeneratedReview}
                  >
                    <Clapperboard size={16} />
                    {isLiveVideoProvider ? '生成 1 条视频' : '提交视频队列'}
                  </button>
                  <button
                    className="ghost-button compact"
                    type="button"
                    onClick={() => setActiveStudioPage('publish')}
                  >
                    <Rocket size={16} />
                    发布设置
                  </button>
                </div>
                <span className={`series-generation-status ${seriesEngineStatusClass}`} aria-live="polite">
                  {seriesEngineStatusClass === 'ready' && <CheckCircle2 size={14} />}
                  {seriesEngineStatusClass === 'running' && <RotateCcw size={14} />}
                  {seriesEngineStatusClass === 'failed' && <AlertTriangle size={14} />}
                  {seriesEngineStatusClass === 'waiting' && <Sparkles size={14} />}
                  <span>{seriesGenerationState}</span>
                </span>
              </div>
              <div className="series-engine-board" aria-label="Short drama production engine">
                <div className="series-engine-head">
                  <div>
                    <span>短剧生产引擎</span>
                    <strong>{visibleGeneratedReview?.title || project.title}</strong>
                    <em>
                      {seriesGenerator.genre} · {seriesGenerator.platform} · {seriesGenerator.duration}
                    </em>
                  </div>
                  <span className={`series-engine-state ${seriesEngineStatusClass}`}>
                    {seriesEngineStatus}
                  </span>
                </div>
                <div className="series-production-command" aria-label="当前生产动作">
                  <div>
                    <span>当前主任务</span>
                    <strong>{seriesPrimaryAction.label}</strong>
                    <em>{seriesPrimaryAction.note}</em>
                  </div>
                  <button
                    type="button"
                    onClick={() => void runSeriesPrimaryAction()}
                    disabled={seriesPrimaryAction.disabled}
                  >
                    <Play size={15} />
                    {seriesPrimaryAction.label}
                  </button>
                </div>
                <div className="series-production-path" aria-label="常规短剧生产路径">
                  {seriesProductionFlowRows.map((item) => (
                    <article className={item.status} key={item.step}>
                      <span>{item.step}</span>
                      <div>
                        <strong>{item.title}</strong>
                        <em>{item.detail}</em>
                      </div>
                    </article>
                  ))}
                </div>
                {seriesGenerationJob && (
                  <div className={`series-job-panel ${seriesGenerationJob.status}`}>
                    <div className="series-job-main">
                      <span>后台任务</span>
                      <strong>{formatSeriesGenerationJobState(seriesGenerationJob)}</strong>
                      <em>
                        {seriesGenerationJob.inputSummary?.idea ||
                          seriesGenerator.idea ||
                          '短剧生产包'}
                      </em>
                    </div>
                    <div className="series-job-progress" aria-label="短剧生成进度">
                      <span
                        style={{
                          width: `${Math.max(
                            5,
                            Math.min(100, Math.round(seriesGenerationJob.progress || 0)),
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="series-job-meta">
                      <span>{seriesGenerationJob.stage}</span>
                      <span>{new Date(seriesGenerationJob.updatedAt).toLocaleTimeString('zh-CN')}</span>
                      {seriesGenerationJob.status === 'failed' && (
                        <button
                          className="ghost-button compact"
                          type="button"
                          onClick={() => void generateShortDramaProject()}
                        >
                          <RotateCcw size={15} />
                          重试
                        </button>
                      )}
                    </div>
                  </div>
                )}
                <div className="series-engine-grid">
                  <article className="series-engine-section script">
                    <div className="section-title light">
                      <span>剧本编写</span>
                      <em>集纲 / 冲突 / 选择 / 结局</em>
                    </div>
                    <div className="series-script-checks" aria-label="剧本编写验收">
                      {seriesScriptQualityCards.map((item) => (
                        <article className={item.status} key={item.label}>
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                          <em>{item.note}</em>
                        </article>
                      ))}
                    </div>
                    <div className="series-script-list">
                      {seriesScriptRows.map((item) => (
                        <div className={item.status} key={item.id}>
                          <span>{item.id}</span>
                          <div>
                            <strong>{item.title}</strong>
                            <em>{item.detail}</em>
                            <small>{item.meta}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                  <article className="series-engine-section">
                    <div className="section-title light">
                      <span>视频脚本</span>
                      <em>镜头 / 字幕 / Prompt / 参考</em>
                    </div>
                    <div className="series-script-checks" aria-label="视频脚本验收">
                      {seriesVideoScriptQualityCards.map((item) => (
                        <article className={item.status} key={item.label}>
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                          <em>{item.note}</em>
                        </article>
                      ))}
                    </div>
                    <div className="series-shot-list">
                      {seriesShotRows.map((item) => (
                        <div className={item.status} key={item.id}>
                          <span>{item.id}</span>
                          <div>
                            <strong>{item.title}</strong>
                            <em>{item.detail}</em>
                            <small>{item.meta}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                  <article className="series-engine-section">
                    <div className="section-title light">
                      <span>交付清单</span>
                      <em>{visibleGeneratedReview ? '可导出' : '待生成'}</em>
                    </div>
                    <div className="series-deliverable-list">
                      {seriesDeliverableRows.map((item) => (
                        <div className={item.status} key={item.label}>
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </div>
                      ))}
                    </div>
                  </article>
                  <article className="series-engine-section video">
                    <div className="section-title light">
                      <span>视频生产</span>
                      <em>{isLiveVideoProvider ? '真实生成' : 'Prompt 队列'}</em>
                    </div>
                    <div className="series-video-ops">
                      <div>
                        <span>供应商</span>
                        <strong>{videoProviderLabel}</strong>
                        <em>{videoProvider?.openApiMode || '检测中'}</em>
                      </div>
                      <div>
                        <span>任务</span>
                        <strong>
                          {videoJobSummary.succeeded} 完成 · {videoJobSummary.running} 运行
                        </strong>
                        <em>
                          {videoJobSummary.total > 0
                            ? `${videoJobSummary.total} 个任务已提交`
                            : visibleGeneratedReview
                              ? `${visibleGeneratedReview.videoQueueCount} 条待提交`
                              : '生成生产包后提交'}
                        </em>
                      </div>
                    </div>
                  </article>
                </div>
                <div className="series-refinement-board">
                  <div className="section-title light">
                    <span>生成后交付能力</span>
                    <em>{visibleGeneratedReview ? '可细修 / 可导出 / 可升级' : '生成后进入交付台'}</em>
                  </div>
                  {seriesRefinementRows.map((row) => (
                    <article className={row.status} key={row.label}>
                      <span>{row.label}</span>
                      <strong>{row.value}</strong>
                      <em>{row.note}</em>
                    </article>
                  ))}
                </div>
              </div>
              {visibleGeneratedReview && (
                <div className="beginner-handoff-board ai-handoff" aria-label="生成成功后的交付路径">
                  <div className="beginner-handoff-head">
                    <span>生成成功以后</span>
                    <strong>三步交付：细修、试卖、邀朋友试玩</strong>
                  </div>
                  <div className="beginner-handoff-grid">
                    {beginnerHandoffRows.map((item) => (
                      <button
                        className={`beginner-handoff-action ${item.state}`}
                        type="button"
                        key={item.id}
                        onClick={() => void item.action()}
                        disabled={item.id === 'sell' && buildState === '正在生成发布'}
                      >
                        <span className="beginner-handoff-icon">
                          {item.id === 'refine' && <GitBranch size={17} />}
                          {item.id === 'sell' && <Rocket size={17} />}
                          {item.id === 'share' && <Share2 size={17} />}
                        </span>
                        <span className="beginner-handoff-copy">
                          <strong>{item.title}</strong>
                          <em>{item.detail}</em>
                        </span>
                        <span className="beginner-handoff-cta">
                          {item.cta}
                          <ChevronRight size={15} />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className={pagePanelClass('panel editor-panel ai-director-panel', [])}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">AI 导演</p>
                  <h2>创作生成工作台</h2>
                </div>
                <span className={`ai-director-state ${aiProvider?.productionReady ? 'ready' : 'waiting'}`}>
                  {aiProvider?.productionReady ? '模型已就绪' : '模型待配置'}
                </span>
              </div>
              <div className="ai-director-grid">
                {aiDirectorCards.map((item) => (
                  <article className={`ai-director-card ${item.tone}`} key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <em>{item.note}</em>
                  </article>
                ))}
              </div>
              <div className="ai-workflow-board" aria-label="AI director workflow">
                {aiWorkflowRows.map((item) => (
                  <article className={`ai-workflow-row ${item.status}`} key={item.step}>
                    <span className="ai-workflow-step">{item.step}</span>
                    <div>
                      <strong>{item.title}</strong>
                      <em>{item.detail}</em>
                    </div>
                    <span className={`ai-workflow-status ${item.status}`}>
                      {formatAiWorkflowStatus(item.status)}
                    </span>
                  </article>
                ))}
              </div>
              <div className="ai-toolchain-board" aria-label="AI team and automation toolchain">
                <div className="ai-toolchain-head">
                  <div>
                    <p className="eyebrow">插件生态对标</p>
                    <h3>把热门编码、UI 和自动化插件能力收进平台执行流</h3>
                    <span>
                      不盲目堆插件，按 Codex、shadcn、Dify、n8n、browser-use 的成熟范式做商用闭环。
                    </span>
                  </div>
                  <span className="ai-toolchain-state">商用执行标准</span>
                </div>
                <div className="ai-toolchain-grid">
                  {aiToolchainCards.map((item) => (
                    <article className={`ai-toolchain-card ${item.tone}`} key={item.id}>
                      <span className="ai-toolchain-icon">{item.icon}</span>
                      <div>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                        <em>{item.note}</em>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="ai-automation-lane">
                  <div className="section-title">
                    <span>自动工作流落地路径</span>
                    <em>从需求到上线验收</em>
                  </div>
                  <div className="ai-automation-rows">
                    {aiAutomationRows.map((item) => (
                      <article className={`ai-automation-row ${item.status}`} key={item.step}>
                        <span className="ai-workflow-step">{item.step}</span>
                        <div>
                          <strong>{item.title}</strong>
                          <em>{item.detail}</em>
                        </div>
                        <span className={`ai-workflow-status ${item.status}`}>{item.badge}</span>
                      </article>
                    ))}
                  </div>
                </div>
                <div className="ai-toolchain-actions">
                  <button className="ghost-button compact" type="button" onClick={copyAiToolchainPlaybook}>
                    <Clipboard size={16} />
                    复制执行清单
                  </button>
                  <button className="ghost-button compact" type="button" onClick={() => setActiveStudioPage('publish')}>
                    <Rocket size={16} />
                    查看上线门禁
                  </button>
                </div>
              </div>
              <div className="ai-director-actions">
                <button
                  className="primary-button compact"
                  type="button"
                  onClick={generateNextScene}
                  disabled={isAiBusy}
                >
                  <Wand2 size={16} />
                  {isAiBusy ? '处理中' : '生成下一幕'}
                </button>
                <button
                  className="ghost-button compact"
                  type="button"
                  onClick={() => void scanContentSafety(project)}
                  disabled={contentSafetyState === '正在扫描内容安全'}
                >
                  <ShieldCheck size={16} />
                  安全扫描
                </button>
                <button
                  className="ghost-button compact"
                  type="button"
                  onClick={() => setActiveStudioPage('story')}
                >
                  <GitBranch size={16} />
                  回剧情图谱
                </button>
              </div>
              <div className="mt-8">
                <AiInteractiveStoryGenerator
                  onStoryGenerated={(story) => {
                    console.log('Generated interactive story:', story)
                  }}
                />
              </div>
            </section>

            <section className={pagePanelClass('panel editor-panel compliance-panel', [])}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">模型路由</p>
                  <h2>模型合规路由</h2>
                </div>
              </div>
              <div className="compliance-note">
                  国内公开商用默认使用国内大模型；OpenAI/GPT 仅用于海外版或研究环境
              </div>
              <div className="ai-provider-stack">
                {aiProviderRows.length === 0 && (
                  <article className="ai-provider-empty">
                    <strong>正在同步可用模型</strong>
                    <span>连接云端后会展示商用模型、市场策略和默认模型</span>
                  </article>
                )}
                {aiProviderRows.map((provider) => (
                  <article
                    className={`ai-provider-row ${provider.id === aiProvider?.provider ? 'active' : ''}`}
                    key={provider.id}
                  >
                    <div>
                      <strong>{provider.displayName}</strong>
                      <span>{provider.market} · 优先级 {provider.priority}</span>
                    </div>
                    <em>{provider.defaultModel}</em>
                  </article>
                ))}
              </div>
              <div className="publish-grid">
                <label>
                  <span>目标市场</span>
                  <select
                    value={project.modelRouting.market}
                    onChange={(event) => updateModelRouting('market', event.target.value)}
                  >
                    <option value="China Mainland">中国大陆</option>
                    <option value="Global">海外版</option>
                  </select>
                </label>
                <label>
                  <span>OpenAI 策略</span>
                  <select
                    value={project.modelRouting.openaiPolicy}
                    onChange={(event) => updateModelRouting('openaiPolicy', event.target.value)}
                  >
                    <option value="Disabled for China public launch">国内公开版禁用</option>
                    <option value="Global only">仅海外版启用</option>
                    <option value="Research only">仅研究环境启用</option>
                  </select>
                </label>
                <label className="wide-field">
                  <span>默认国内模型</span>
                  <input
                    value={project.modelRouting.defaultProvider}
                    onChange={(event) =>
                      updateModelRouting('defaultProvider', event.target.value)
                    }
                  />
                </label>
                <label className="wide-field">
                  <span>备用模型</span>
                  <input
                    value={project.modelRouting.fallbackProvider}
                    onChange={(event) =>
                      updateModelRouting('fallbackProvider', event.target.value)
                    }
                  />
                </label>
              </div>
            </section>

            <section className={pagePanelClass('panel editor-panel ai-cost-panel', [])}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">模型账本</p>
                  <h2>模型成本</h2>
                </div>
                <span className="project-list-state">
                  {aiUsageSummary.calls} 次调用
                </span>
              </div>
              <div className="ai-cost-grid">
                <article>
                  <strong>{aiUsageSummary.totalTokens}</strong>
                  <span>tokens</span>
                </article>
                <article>
                  <strong>
                    {aiUsageSummary.currency} {aiUsageSummary.totalCost.toFixed(6)}
                  </strong>
                  <span>估算成本</span>
                </article>
              </div>
              {aiProvider && (
                <div className="ai-pricing-note">
                  <strong>{aiProvider.pricing.currency}</strong>
                  <span>
                    输入 {aiProvider.pricing.inputPerMillion}/百万 tokens · 输出{' '}
                    {aiProvider.pricing.outputPerMillion}/百万 tokens
                  </span>
                </div>
              )}
              <div className="ai-cost-list">
                {aiUsageSummary.latest.length === 0 && (
                  <span>生成下一幕后会记录模型、token、成本和耗时</span>
                )}
                {aiUsageSummary.latest.map((event) => (
                  <article className="ai-cost-row" key={event.id}>
                    <div>
                      <strong>{event.task}</strong>
                      <span>{event.providerId} · {event.model}</span>
                    </div>
                    <em>
                      {event.totalTokens} tokens · {event.currency} {event.estimatedCost} · {event.latencyMs}ms
                    </em>
                  </article>
                ))}
              </div>
            </section>

            <section className={pagePanelClass('panel editor-panel publish-command-panel', ['publish'])}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">上线控制台</p>
                  <h2>发布与收入门禁</h2>
                </div>
                <span className="project-list-state">
                  {commercialReadiness?.status === 'pass' ? '商用门禁通过' : commercialStatusLabel}
                </span>
              </div>
              <div className="publish-readiness-grid">
                {publishReadinessCards.map((item) => (
                  <article className={`publish-readiness-card ${item.tone}`} key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <em>{item.note}</em>
                  </article>
                ))}
              </div>
              <div className="publish-operations-grid">
                <div className="publish-gate-flow">
                  <div className="section-title light">
                    <span>上线流程</span>
                    <em>{commercialProgress}</em>
                  </div>
                  {publishGateRows.map((item) => (
                    <article className={item.state} key={item.step}>
                      <span>{item.step}</span>
                      <div>
                        <strong>{item.label}</strong>
                        <em>{item.detail}</em>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="publish-blocker-list">
                  <div className="section-title light">
                    <span>阻断项</span>
                    <em>{launchBlockerRows.length > 0 ? `${launchBlockerRows.length} 项待处理` : '当前无阻断'}</em>
                  </div>
                  {launchBlockerRows.length === 0 ? (
                    <article className="ready">
                      <CheckCircle2 size={16} />
                      <div>
                        <strong>商用门禁通过</strong>
                        <em>可以进入灰度发布和渠道投放</em>
                      </div>
                    </article>
                  ) : (
                    launchBlockerRows.map((item) => (
                      <article className="blocked" key={item.id}>
                        <AlertTriangle size={16} />
                        <div>
                          <strong>{item.area} · {item.label}</strong>
                          <em>{item.action}</em>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
              <div className="publish-revenue-grid">
                {publishRevenueCards.map((item) => (
                  <article className={item.tone} key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <em>{item.note}</em>
                  </article>
                ))}
              </div>
              <div className="publish-monetization-kit">
                <div className="section-title light">
                  <span>变现策略</span>
                  <em>
                    {project.publish.monetization === 'Free'
                      ? '免费跑数据'
                      : `${formatMonetization(project.publish.monetization)} · CNY ${project.publish.price}`}
                  </em>
                </div>
                <div className="pricing-ladder" role="group" aria-label="价格档位">
                  {pricePresetRows.map((preset) => (
                    <button
                      className={preset.active ? 'active' : ''}
                      type="button"
                      value={preset.price}
                      key={preset.price}
                      onMouseDown={(event) => {
                        event.preventDefault()
                        applyPublishPricePreset(event.currentTarget.value)
                      }}
                      onClick={(event) => applyPublishPricePreset(event.currentTarget.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          applyPublishPricePreset(event.currentTarget.value)
                        }
                      }}
                    >
                      <span>CNY {preset.price}</span>
                      <strong>{preset.label}</strong>
                      <em>{preset.fit} · {preset.conversion}%</em>
                      <small>{preset.revenue}/千次</small>
                    </button>
                  ))}
                </div>
                <div className="trial-value-grid">
                  {monetizationStrategyRows.map((row) => (
                    <article className={row.tone} key={row.label}>
                      <span>{row.label}</span>
                      <strong>{row.value}</strong>
                      <em>{row.note}</em>
                    </article>
                  ))}
                </div>
              </div>
              <div className="monetization-ledger">
                {monetizationRows.map((item) => (
                  <article key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <em>{item.note}</em>
                  </article>
                ))}
              </div>
              <div className="paid-ending-board">
                <div className="section-title light">
                  <span>付费解锁</span>
                  <em>
                    {project.publish.monetization === 'Paid Ending'
                      ? `${paidEndingRows.length} 个结局`
                      : '未启用结局付费'}
                  </em>
                </div>
                {paidEndingRows.length === 0 ? (
                  <article className="empty">
                    <span>免费或章节付费</span>
                    <strong>{formatMonetization(project.publish.monetization)}</strong>
                    <em>切换到付费结局后会列出可解锁节点</em>
                  </article>
                ) : (
                  paidEndingRows.map((row) => (
                    <article className={row.state} key={row.id}>
                      <span>{row.id}</span>
                      <div>
                        <strong>{row.title}</strong>
                        <em>{row.metric}</em>
                      </div>
                      <small>{row.paidCount > 0 ? `${row.paidCount} 笔已支付` : '等待首单验证'}</small>
                    </article>
                  ))
                )}
              </div>
              <div className="payment-status-strip">
                {paymentStatusRows.map((row) => (
                  <article className={row.tone} key={row.label}>
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                    <em>{row.note}</em>
                  </article>
                ))}
              </div>
              <div className="publish-risk-board">
                <div className="section-title light">
                  <span>发布前风险提示</span>
                  <em>客户试用前必须看得懂</em>
                </div>
                {publishRiskRows.map((row) => (
                  <article className={row.tone} key={row.label}>
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                    <em>{row.note}</em>
                  </article>
                ))}
              </div>
              <div className="payment-ops-board">
                <div className="section-title light">
                  <span>支付异常处理</span>
                  <em>{formatPaymentMethod(paymentProvider?.activeProvider || paymentProvider?.provider)}</em>
                </div>
                {paymentOpsRows.map((row) => (
                  <article className={row.tone} key={row.label}>
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                    <em>{row.note}</em>
                  </article>
                ))}
              </div>
              <div className="launch-guard-console">
                <div className="section-title light">
                  <span>上线守护台</span>
                  <em>{launchGuardState}</em>
                </div>
                <div className="launch-guard-summary">
                  {launchGuardSummaryCards.map((row) => (
                    <article className={row.tone} key={row.label}>
                      <span>{row.label}</span>
                      <strong>{row.value}</strong>
                      <em>{row.note}</em>
                    </article>
                  ))}
                </div>
                <div className="launch-guard-signals">
                  {launchGuardSignals.map((signal) => (
                    <article className={signal.status} key={signal.id}>
                      <span>{signal.label}</span>
                      <strong>{signal.value}</strong>
                      <em>{signal.detail}</em>
                      <small>{signal.action}</small>
                    </article>
                  ))}
                </div>
                <div className="launch-guard-incidents">
                  <div className="section-title light">
                    <span>异常队列</span>
                    <em>{launchGuardIncidents.length > 0 ? `${launchGuardIncidents.length} 项` : '当前为空'}</em>
                  </div>
                  {launchGuardIncidents.length === 0 ? (
                    <article className="ready">
                      <span>OK</span>
                      <div>
                        <strong>暂无阻断事件</strong>
                        <em>支付、订单和 AI 生成守护当前没有必须人工介入的异常。</em>
                      </div>
                    </article>
                  ) : (
                    launchGuardIncidents.map((incident) => (
                      <article className={incident.severity} key={incident.id}>
                        <span>{incident.label}</span>
                        <div>
                          <strong>{incident.value}</strong>
                          <em>{incident.detail}</em>
                        </div>
                        <small>{incident.action}</small>
                      </article>
                    ))
                  )}
                </div>
              </div>
              <div className="payment-operations-console">
                <div className="section-title light">
                  <span>收款运营台</span>
                  <em>{paymentOpsState}</em>
                </div>
                <div className="payment-operations-kpis">
                  {paymentOperationsKpis.map((row) => (
                    <article className={row.tone} key={row.label}>
                      <span>{row.label}</span>
                      <strong>{row.value}</strong>
                      <em>{row.note}</em>
                    </article>
                  ))}
                </div>
                <div className="payment-recovery-list">
                  {paymentRecoveryRows.map((row) => (
                    <article className={row.state} key={row.id}>
                      <span>{row.label}</span>
                      <strong>{row.value}</strong>
                      <em>{row.note}</em>
                    </article>
                  ))}
                </div>
              </div>
              <div className="payment-order-ledger">
                <div className="section-title light payment-ledger-title">
                  <span>订单明细</span>
                  <em>{paymentVerificationState}</em>
                </div>
                <div className="payment-order-toolbar">
                  <label className="payment-order-search">
                    <Search size={15} />
                    <input
                      type="search"
                      value={paymentOrderSearch}
                      onChange={(event) => setPaymentOrderSearch(event.target.value)}
                      placeholder="搜订单号、微信单号、节点、备注"
                    />
                  </label>
                  <button className="ghost-button compact" type="button" onClick={exportPaymentOrdersCsv}>
                    <Download size={16} />
                    导出订单
                  </button>
                  <button
                    className="ghost-button compact"
                    type="button"
                    onClick={() => void refreshLaunchGuard()}
                  >
                    <RotateCcw size={16} />
                    刷新守护
                  </button>
                </div>
                <div className="payment-order-filters" role="group" aria-label="订单筛选">
                  {paymentOrderFilterOptions.map((option) => (
                    <button
                      className={paymentOrderFilter === option.value ? 'active' : ''}
                      type="button"
                      key={option.value}
                      onMouseDown={(event) => {
                        event.preventDefault()
                        setPaymentOrderFilter(option.value)
                      }}
                      onClick={() => setPaymentOrderFilter(option.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setPaymentOrderFilter(option.value)
                        }
                      }}
                    >
                      {option.label}
                      <span>{paymentOrderFilterCounts[option.value]}</span>
                    </button>
                  ))}
                </div>
                {paymentOrderRows.length === 0 ? (
                  <article className="empty">
                    <span>{paymentOrderFilter === 'all' ? '暂无订单' : '无匹配订单'}</span>
                    <strong>等待验证</strong>
                    <em>
                      {paymentOrderFilter === 'all'
                        ? '生成发布包后可创建一笔付费结局验证订单'
                        : '切回全部可查看完整支付流水'}
                    </em>
                  </article>
                ) : (
                  paymentOrderRows.map((order) => (
                    <article className={order.status} key={order.id}>
                      <span>{order.shortId}</span>
                      <div>
                        <strong>{order.providerLabel} · {order.statusLabel}</strong>
                        <em>{order.unlockLabel} · {order.opsNote || order.resolution}</em>
                      </div>
                      <small>{order.amountLabel}</small>
                      <small>{order.callbackLabel}</small>
                      <small>{order.providerTrace}</small>
                      <div className="payment-order-actions">
                        {order.status === 'pending' && (
                          <button type="button" onClick={() => void applyPaymentOrderOps(order, 'failed')}>
                            标记失败
                          </button>
                        )}
                        {order.status === 'paid' && (
                          <button type="button" onClick={() => void applyPaymentOrderOps(order, 'refunded')}>
                            退款撤权
                          </button>
                        )}
                        {(order.status === 'failed' || order.status === 'refunded') && (
                          <button type="button" onClick={() => void applyPaymentOrderOps(order, 'pending')}>
                            恢复待付
                          </button>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
              <div className="publish-mission-strip">
                {distributionMissionRows.map((row) => (
                  <article className={row.state} key={row.id}>
                    <span>{row.label}</span>
                    <strong>{row.detail}</strong>
                  </article>
                ))}
              </div>
              <div className="publish-next-actions">
                <button
                  className="primary-button compact"
                  type="button"
                  onClick={publishBuild}
                  disabled={buildState === '正在生成发布'}
                >
                  <Layers3 size={16} />
                  生成发布包
                </button>
                <button className="ghost-button compact" type="button" onClick={openSharePreview}>
                  <Share2 size={16} />
                  打开预览
                </button>
                <button
                  className="ghost-button compact"
                  type="button"
                  onClick={() => void scanContentSafety(project)}
                  disabled={contentSafetyState === '正在扫描内容安全'}
                >
                  <ShieldCheck size={16} />
                  安全扫描
                </button>
                <button
                  className="ghost-button compact"
                  type="button"
                  onClick={() => void verifyPaidEndingUnlock()}
                  disabled={paymentVerificationState.startsWith('正在')}
                >
                  <ShieldCheck size={16} />
                  验证付费解锁
                </button>
                <button
                  className="ghost-button compact"
                  type="button"
                  onClick={() => void refreshPaymentLedger()}
                  disabled={paymentVerificationState.startsWith('正在')}
                >
                  <RotateCcw size={16} />
                  刷新订单
                </button>
              </div>
            </section>

            <section className={pagePanelClass('panel editor-panel distribution-panel', ['publish'])}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">渠道增长</p>
                  <h2>抖音/微信小程序分发</h2>
                </div>
                <span className="project-list-state">{distributionState}</span>
              </div>
              <div className="distribution-brief">
                <Megaphone size={18} />
                <div>
                  <strong>先跑 H5 引流，抖音和微信小程序同步准备</strong>
                  <span>
                    当前可复制渠道链接、二维码和视频文案；平台内付费需要小程序账号、商户号和支付回调。
                  </span>
                </div>
              </div>
              <div className="platform-status-grid">
                <article>
                  <strong>抖音 OpenAPI</strong>
                  <span>
                    {distributionProvider?.douyin.openApiConfigured
                      ? '可提交视频发布任务'
                      : '等待授权 token / open_id'}
                  </span>
                  <em>
                    {distributionProvider?.douyin.miniAppIdConfigured
                      ? '小程序 AppID 已配置'
                      : '小程序 AppID 待配置'}
                  </em>
                </article>
                <article>
                  <strong>抖音小程序</strong>
                  <span>
                    {distributionProvider?.douyinMini.configured
                      ? 'web-view 壳可提审'
                      : '等待 AppID 或业务域名'}
                  </span>
                  <em>{distributionProvider?.douyinMini.pathTemplate || '路径模板待同步'}</em>
                </article>
                <article>
                  <strong>微信小程序</strong>
                  <span>
                    {distributionProvider?.wechatMini.configured
                      ? 'web-view 壳可提审'
                      : '等待 AppID 或业务域名'}
                  </span>
                  <em>
                    {distributionProvider?.wechatMini.paymentReady
                      ? '微信支付可用'
                      : '微信支付待证书'}
                  </em>
                </article>
              </div>
              <div className="distribution-job-board">
                <div className="section-title light">
                  <span>平台发布任务</span>
                  <em>{distributionJobState}</em>
                </div>
                <div className="distribution-job-actions">
                  <button
                    className="ghost-button compact"
                    type="button"
                    onClick={() => void createPlatformDistributionJob('douyin')}
                  >
                    <Rocket size={15} />
                    抖音短视频任务
                  </button>
                  <button
                    className="ghost-button compact"
                    type="button"
                    onClick={() => void createPlatformDistributionJob('douyin-mini')}
                  >
                    <Rocket size={15} />
                    抖音小程序任务
                  </button>
                  <button
                    className="ghost-button compact"
                    type="button"
                    onClick={() => void createPlatformDistributionJob('wechat-mini')}
                  >
                    <Rocket size={15} />
                    微信小程序任务
                  </button>
                </div>
                <div className="distribution-job-list">
                  {distributionJobs.length === 0 && (
                    <p>生成任务后，会得到平台路径、H5 链接和提交状态。</p>
                  )}
                  {distributionJobs.slice(0, 5).map((job) => (
                    <article className="distribution-job-row" key={job.id}>
                      <div>
                        <strong>{formatDistributionChannel(job.channel)}</strong>
                        <span>{formatDistributionJobStatus(job.status)} · {job.buildId.slice(-6)}</span>
                        <em>{job.miniProgramPath || job.targetUrl}</em>
                      </div>
                      <button
                        className="ghost-button compact"
                        type="button"
                        onClick={() => void copyDistributionText(job.miniProgramPath || job.targetUrl, '发布任务')}
                      >
                        <Clipboard size={15} />
                        复制
                      </button>
                    </article>
                  ))}
                </div>
              </div>
              <div className="distribution-links">
                {distributionLinks.map((channel) => (
                  <article className="distribution-card" key={channel.id}>
                    <div className="distribution-card-header">
                      <div>
                        <strong>{channel.label}</strong>
                        <span>{channel.ready ? '固定发布链接' : '草稿预览链接'}</span>
                      </div>
                      <QrCode size={18} />
                    </div>
                    <img src={channel.qrUrl} alt={`${channel.label} 渠道二维码`} />
                    <input value={channel.href} readOnly />
                    <button
                      className="ghost-button compact"
                      type="button"
                      onClick={() => void copyDistributionText(channel.href, `${channel.label}链接`)}
                    >
                      <Clipboard size={15} />
                      复制链接
                    </button>
                  </article>
                ))}
              </div>
              <div className="douyin-copy-board">
                <div className="section-title light">
                  <span>抖音预热视频素材</span>
                </div>
                {douyinCopyBlocks.map((item) => (
                  <article className="copy-block" key={item.title}>
                    <div>
                      <strong>{item.title}</strong>
                      <button
                        className="ghost-button compact"
                        type="button"
                        onClick={() => void copyDistributionText(item.body, item.title)}
                      >
                        <Clipboard size={15} />
                        复制
                      </button>
                    </div>
                    <p>{item.body}</p>
                  </article>
                ))}
              </div>
              <div className="douyin-copy-board">
                <div className="section-title light">
                  <span>微信视频号/社群素材</span>
                </div>
                {wechatCopyBlocks.map((item) => (
                  <article className="copy-block" key={item.title}>
                    <div>
                      <strong>{item.title}</strong>
                      <button
                        className="ghost-button compact"
                        type="button"
                        onClick={() => void copyDistributionText(item.body, item.title)}
                      >
                        <Clipboard size={15} />
                        复制
                      </button>
                    </div>
                    <p>{item.body}</p>
                  </article>
                ))}
              </div>
              <div className="distribution-funnel">
                {distributionFunnel.map((item) => (
                  <article key={item.label}>
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                    <em>{item.note}</em>
                  </article>
                ))}
              </div>
              <div className="channel-breakdown">
                <div>
                  <strong>渠道数据</strong>
                  <span>当前访问渠道：{incomingChannel}</span>
                </div>
                {channelBreakdown.length === 0 && (
                  <p>渠道链接产生访问后，这里会按来源拆分会话、点击和结局。</p>
                )}
                {channelBreakdown.map((row) => (
                  <article key={row.channel}>
                    <span>{row.channel}</span>
                    <em>
                      {row.sessions} 会话 / {row.choices} 选择 / {row.endings} 结局
                    </em>
                  </article>
                ))}
              </div>
              <div className="mini-program-roadmap">
                <div>
                  <strong>小程序内付费待接入</strong>
                  <span>抖音和微信都需要独立小程序、支付商户和平台审核。</span>
                </div>
                {miniProgramLaunchTracks.map((track, index) => (
                  <article key={track.platform}>
                    <span>{index + 1}</span>
                    <strong>{track.platform}</strong>
                    <em>{track.status} · {track.steps.join(' / ')}</em>
                  </article>
                ))}
              </div>
            </section>

            <section className={pagePanelClass('panel editor-panel analytics-panel', ['publish'])}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">播放数据</p>
                  <h2>播放数据</h2>
                </div>
                <span className="project-list-state">
                  {publishedBuildId ? `发布包 #${publishedBuildId.slice(-6)}` : '等待发布包'}
                </span>
              </div>
              <div className="analytics-grid">
                <article>
                  <strong>{analyticsSummary.sessions}</strong>
                  <span>会话</span>
                </article>
                <article>
                  <strong>{analyticsSummary.nodeViews}</strong>
                  <span>节点浏览</span>
                </article>
                <article>
                  <strong>{analyticsSummary.choices}</strong>
                  <span>选择点击</span>
                </article>
                <article>
                  <strong>{analyticsSummary.endings}</strong>
                  <span>结局到达</span>
                </article>
              </div>
              <div className="analytics-list">
                {analyticsSummary.recent.length === 0 && (
                  <span>发布后打开预览或点击选项，这里会出现事件</span>
                )}
                {analyticsSummary.recent.map((event) => (
                  <article className="analytics-row" key={event.id}>
                    <strong>{event.eventName}</strong>
                    <span>
                      {event.nodeId || 'project'} · {event.choiceId || event.buildId.slice(-6)}
                    </span>
                    <em>{new Date(event.createdAt).toLocaleString()}</em>
                  </article>
                ))}
              </div>
              <div className="analytics-breakdown">
                <div>
                  <strong>节点热度</strong>
                  {analyticsDetail.nodeRows.length === 0 && <span>暂无节点浏览</span>}
                  {analyticsDetail.nodeRows.map((row) => (
                    <article className="analytics-mini-row" key={row.id}>
                      <span>{row.id} · {row.title}</span>
                      <em>{row.views} 浏览 / {row.choices} 选择</em>
                    </article>
                  ))}
                </div>
                <div>
                  <strong>当前节点选择</strong>
                  {analyticsDetail.choiceRows.length === 0 && <span>暂无可选分</span>}
                  {analyticsDetail.choiceRows.map((row) => (
                    <article className="analytics-mini-row" key={row.id}>
                      <span>{row.label}</span>
                      <em>{row.count} </em>
                    </article>
                  ))}
                </div>
              </div>
              <div className="mt-8">
                <AnalyticsDashboard
                  data={{
                    views: analyticsSummary.sessions * 100,
                    uniqueViews: analyticsSummary.sessions * 80,
                    avgWatchTime: 245,
                    completionRate: 67.5,
                    paidUnlocks: analyticsSummary.choices * 12,
                    revenue: analyticsSummary.sessions * 100 * 0.99,
                    conversionRate: 8.3,
                    bounceRate: 32.1,
                    dailyData: [
                      { date: '周一', views: 1200, revenue: 120, conversions: 15 },
                      { date: '周二', views: 1500, revenue: 180, conversions: 22 },
                      { date: '周三', views: 1100, revenue: 90, conversions: 11 },
                      { date: '周四', views: 1800, revenue: 240, conversions: 30 },
                      { date: '周五', views: 2200, revenue: 350, conversions: 42 },
                      { date: '周六', views: 2800, revenue: 420, conversions: 55 },
                      { date: '周日', views: 2500, revenue: 380, conversions: 48 },
                    ],
                    funnelData: [
                      { stage: '浏览', count: 10000, percentage: 100 },
                      { stage: '点击选择', count: 6500, percentage: 65 },
                      { stage: '观看付费节点', count: 3200, percentage: 32 },
                      { stage: '付费解锁', count: 830, percentage: 8.3 },
                      { stage: '完成结局', count: 675, percentage: 6.75 },
                    ],
                    abTests: [
                      {
                        id: 'ab_001',
                        name: '付费节点弹窗文案测试',
                        variantA: { name: '原版文案', conversions: 45, total: 500 },
                        variantB: { name: '新版文案', conversions: 58, total: 500 },
                        status: 'completed',
                      },
                      {
                        id: 'ab_002',
                        name: '预览时长测试',
                        variantA: { name: '30秒预览', conversions: 38, total: 400 },
                        variantB: { name: '60秒预览', conversions: 42, total: 400 },
                        status: 'running',
                      },
                    ],
                  }}
                />
              </div>
            </section>

            <section className={pagePanelClass('panel editor-panel safety-panel', ['publish'])}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">安全门禁</p>
                  <h2>内容安全</h2>
                </div>
                <span className={`safety-badge ${latestContentSafetyReview?.status || 'pending'}`}>
                  {contentSafetySummary.statusLabel}
                </span>
              </div>
              <div className="safety-summary">
                <article>
                  <strong>{latestContentSafetyReview?.flagCount ?? 0}</strong>
                  <span>风险提示</span>
                </article>
                <article>
                  <strong>{latestContentSafetyReview?.blockingCount ?? 0}</strong>
                  <span>阻断</span>
                </article>
                <article>
                  <strong>{latestContentSafetyReview?.summary?.scannedFields ?? 0}</strong>
                  <span>扫描字段</span>
                </article>
              </div>
              <div className="safety-actions">
                <button
                  className="ghost-button compact"
                  type="button"
                  onClick={() => void scanContentSafety(project)}
                  disabled={contentSafetyState === '正在扫描内容安全'}
                >
                  <ShieldCheck size={16} />
                  重新扫描
                </button>
                <span>{contentSafetyState}</span>
              </div>
              <div className="safety-list">
                {contentSafetySummary.flags.length === 0 && (
                  <span>发布前会自动扫描标题、节点、选项、角色和变量文本</span>
                )}
                {contentSafetySummary.flags.slice(0, 4).map((flag) => (
                  <article className="safety-row" key={flag.id}>
                    <div>
                      <strong>{flag.category}</strong>
                      <span>{flag.path}</span>
                    </div>
                    <em>{flag.severity} · {flag.action}</em>
                  </article>
                ))}
              </div>
            </section>

            <section className={pagePanelClass('panel editor-panel', ['publish'])}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">发布</p>
                  <h2>发布设置</h2>
                </div>
                <div className="panel-actions">
                  <button
                    className="ghost-button compact"
                    type="button"
                    onClick={publishBuild}
                    disabled={buildState === '正在生成发布'}
                  >
                    <Layers3 size={16} />
                    生成发布包
                  </button>
                  <button className="icon-button" type="button" onClick={openSharePreview} aria-label="Open preview link">
                    <Share2 size={16} />
                  </button>
                </div>
              </div>
              <div className="api-status">{buildState}</div>
              <div className="build-history">
                <div className="build-history-header">
                  <strong>发布版本</strong>
                  <span>{publishBuilds.length} 个快照</span>
                </div>
                {publishBuilds.length === 0 && (
                  <span className="build-history-empty">生成发布包后会保留可预览、可回载的版本</span>
                )}
                {publishBuilds.slice(0, 4).map((build) => (
                  <article className="build-history-row" key={build.id}>
                    <div>
                      <strong>v{build.version}</strong>
                      <span>
                        {formatPublishStatus(build.status)} ·{' '}
                        {formatVisibility(build.visibility || project.publish.visibility)}
                      </span>
                    </div>
                    <em>{new Date(build.createdAt).toLocaleString()}</em>
                    <div className="build-history-actions">
                      <button
                        className="ghost-button compact"
                        type="button"
                        onClick={() => openPublishedBuildPreview(build.id)}
                      >
                        预览
                      </button>
                      <button
                        className="ghost-button compact"
                        type="button"
                        onClick={() => restoreBuildSnapshot(build)}
                        disabled={!build.snapshot}
                      >
                        载入快照
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <div className="publish-grid">
                <label>
                  <span>状态</span>
                  <select
                    value={project.publish.status}
                    onChange={(event) => updatePublish('status', event.target.value)}
                  >
                    <option value="Draft">草稿</option>
                    <option value="Beta">内测</option>
                    <option value="Public">公开</option>
                  </select>
                </label>
                <label>
                  <span>可见</span>
                  <select
                    value={project.publish.visibility}
                    onChange={(event) => updatePublish('visibility', event.target.value)}
                  >
                    <option value="Private">私密</option>
                    <option value="Unlisted">仅链接可见</option>
                    <option value="Public">公开</option>
                  </select>
                </label>
                <label className="wide-field">
                  <span>分类</span>
                  <input
                    value={project.publish.category}
                    onChange={(event) => updatePublish('category', event.target.value)}
                  />
                </label>
                <label className="wide-field">
                  <span>目标用户</span>
                  <input
                    value={project.publish.audience}
                    onChange={(event) => updatePublish('audience', event.target.value)}
                  />
                </label>
                <label>
                  <span>变现</span>
                  <select
                    value={project.publish.monetization}
                    onChange={(event) => updatePublish('monetization', event.target.value)}
                  >
                    <option value="Free">免费体验</option>
                    <option value="Paid Ending">付费结局</option>
                    <option value="Paid Chapter">付费章节</option>
                  </select>
                </label>
                <label>
                  <span>价格</span>
                  <input
                    value={project.publish.price}
                    onChange={(event) => updatePublish('price', event.target.value)}
                  />
                </label>
              </div>
            </section>

            <section className={pagePanelClass('panel editor-panel', ['publish'])}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">创作者内测</p>
                  <h2>上线检查</h2>
                </div>
              </div>
              <div className="onboarding-list">
                {onboardingItems.map((item) => (
                  <div className="onboarding-item" key={item.label}>
                    <span className={item.done ? 'done' : ''}>{item.done ? 'OK' : '-'}</span>
                    <strong>{item.label}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className={pagePanelClass('panel editor-panel lead-panel', ['overview'])}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">申请线索</p>
                  <h2>内测申请</h2>
                </div>
                <button
                  className="ghost-button compact"
                  type="button"
                  onClick={() => void refreshTeamState(activeWorkspaceId)}
                >
                  <RotateCcw size={15} />
                  刷新
                </button>
              </div>
              <div className="lead-pipeline-grid">
                {leadPipelineCards.map((item) => (
                  <article className={`lead-pipeline-card ${item.tone}`} key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <em>{item.note}</em>
                  </article>
                ))}
              </div>
              <div className="lead-summary">
                <strong>{marketingLeads.length}</strong>
                <span>
                  最近 {leadPreviewItems.length} 条线索 · {reachableLeadCount} 条可直接联系
                </span>
              </div>
              <div className="lead-list">
                {leadQueueRows.length === 0 ? (
                  <div className={`lead-empty-state ${leadPanelBlockedByAuth ? 'locked' : ''}`}>
                    <strong>{leadEmptyTitle}</strong>
                    <span>{leadEmptyCopy}</span>
                    <div className="empty-action-row">
                      {leadPanelBlockedByAuth ? (
                        <button
                          className="ghost-button compact"
                          type="button"
                          onClick={() => setAuthState('请先发送验证码登录工作区')}
                        >
                          查看登录提示
                        </button>
                      ) : (
                        <button
                          className="ghost-button compact"
                          type="button"
                          onClick={() => window.open('/', '_blank', 'noopener,noreferrer')}
                        >
                          打开公开页
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  leadQueueRows.map(({ lead, nextAction, sourceLabel, tone }) => (
                    <article className={`lead-row ${tone}`} key={lead.id}>
                      <div className="lead-main">
                        <strong>{lead.name}</strong>
                        <span>{lead.company || lead.role || '个人创作者'}</span>
                        <em>{lead.scenario || lead.message || '内测申请'}</em>
                      </div>
                      <div className="lead-contact-stack">
                        <span>{formatLeadContact(lead)}</span>
                        <em>{sourceLabel}</em>
                      </div>
                      <small className="lead-status-stack">
                        <span className={`lead-status-pill ${tone}`}>{formatLeadStatus(lead)}</span>
                        <em>{formatLeadTime(lead.createdAt)}</em>
                      </small>
                      <div className="lead-followup">
                        <strong>{nextAction}</strong>
                        <em>{lead.notification?.provider || '运营跟进'}</em>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className={pagePanelClass('panel editor-panel team-panel', ['overview'])}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">成员协作</p>
                  <h2>团队权限</h2>
                </div>
              </div>
              <div className="team-trust-grid">
                {teamTrustCards.map((item) => (
                  <article className={`team-trust-card ${item.tone}`} key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <em>{item.note}</em>
                  </article>
                ))}
              </div>
              <div className="invite-form">
                <label>
                  <span>邀请邮箱</span>
                  <input
                    value={inviteEmail}
                    placeholder="输入成员邮箱"
                    onChange={(event) => setInviteEmail(event.target.value)}
                  />
                </label>
                <label>
                  <span>角色</span>
                  <select
                    value={inviteRole}
                    onChange={(event) => setInviteRole(event.target.value)}
                  >
                    {roleOptions.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="primary-button compact"
                  type="button"
                  onClick={inviteMember}
                  disabled={inviteState === '正在邀请成员'}
                >
                  <Users size={16} />
                  发送邀请
                </button>
                <span>{inviteState}</span>
                {latestInviteUrl && (
                  <a className="invite-link" href={latestInviteUrl}>
                    打开邀请链接
                  </a>
                )}
              </div>
              <div className="team-list">
                {members.map((member) => (
                  <article className="team-row" key={member.id}>
                    <span className="avatar-badge small">
                      {member.user?.avatarInitials || 'AI'}
                    </span>
                    <div>
                      <strong>{member.user?.displayName || member.user?.email}</strong>
                      <span>
                        {roleLabels[member.role] || member.role} · {member.permissions.length} 项权限 ·{' '}
                        {formatMemberStatus(member.status)}
                        {member.status === 'invited' && member.inviteExpiresAt
                          ? ` · 过期 ${new Date(member.inviteExpiresAt).toLocaleDateString()}`
                          : ''}
                      </span>
                    </div>
                    {member.status === 'invited' && (
                      <div className="team-actions">
                        <button
                          className="ghost-button compact"
                          type="button"
                          onClick={() => resendInvitation(member.id)}
                        >
                          重发
                        </button>
                        <button
                          className="ghost-button compact danger"
                          type="button"
                          onClick={() => cancelInvitation(member.id)}
                        >
                          取消
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
              <div className="delivery-list">
                <strong>
                  最近邀请邮件 · {emailProvider?.provider || 'log'}
                  {emailProvider?.productionReady ? ' - 已配置' : ' - 待配置'}
                </strong>
                {emailProvider?.provider === 'tencent-ses' && (
                  <div className="readiness-list">
                    <strong>
                      腾讯SES · {emailProvider.tencentSes?.region || 'ap-guangzhou'} ·
                      {emailProvider.tencentSes?.dryRun
                        ? ' 干跑演练'
                        : emailProvider.tencentSes?.configured
                          ? ' 凭证已配'
                          : ' 等待凭证'}
                    </strong>
                    {(emailProvider.tencentSes?.missing || []).slice(0, 3).map((item) => (
                      <div className="readiness-row" key={item.id}>
                        <span>{item.label}</span>
                        <em>{item.action}</em>
                      </div>
                    ))}
                  </div>
                )}
                {emailProvider?.provider === 'aliyun-directmail' && (
                  <div className="readiness-list">
                    <strong>
                      阿里云邮件推送 · {emailProvider.aliyunDirectMail?.region || 'cn-hangzhou'} ·
                      {emailProvider.aliyunDirectMail?.dryRun
                        ? ' 干跑演练'
                        : emailProvider.aliyunDirectMail?.configured
                          ? ' 凭证已配'
                          : ' 等待凭证'}
                    </strong>
                    {(emailProvider.aliyunDirectMail?.missing || []).slice(0, 3).map((item) => (
                      <div className="readiness-row" key={item.id}>
                        <span>{item.label}</span>
                        <em>{item.action}</em>
                      </div>
                    ))}
                  </div>
                )}
                {inviteDeliveries.length === 0 ? (
                  <p className="delivery-empty">当前工作区还没有邀请邮件记录</p>
                ) : (
                  inviteDeliveries.slice(0, 4).map((delivery) => (
                    <div className="delivery-row" key={delivery.id}>
                      <div>
                        <span>{delivery.to}</span>
                        <em>
                          {delivery.provider} · {delivery.status} · {delivery.role}
                          {delivery.errorMessage ? ` · ${delivery.errorMessage}` : ''}
                        </em>
                      </div>
                      <div className="delivery-actions">
                        <button
                          className="ghost-button compact"
                          type="button"
                          onClick={() => markDeliveryStatus(delivery.id, 'sent')}
                        >
                          标记已发
                        </button>
                        <button
                          className="ghost-button compact danger"
                          type="button"
                          onClick={() => markDeliveryStatus(delivery.id, 'failed')}
                        >
                          标记失败
                        </button>
                      </div>
                    </div>
                  ))
                )}
                <div className="provider-recommendations">
                  <strong>正式服务商推荐</strong>
                  {(emailProvider?.recommendations || []).slice(0, 4).map((provider) => (
                    <div className="provider-row" key={provider.id}>
                      <span>{provider.priority}. {provider.displayName}</span>
                      <em>
                        {formatProviderMarket(provider.market)} ·{' '}
                        {formatProviderFit(provider.id, provider.fit)}
                      </em>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className={pagePanelClass('panel editor-panel activity-panel', ['overview'])}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">活动审计</p>
                  <h2>项目活动</h2>
                </div>
              </div>
              <div className="audit-overview-grid">
                {activityOverviewCards.map((item) => (
                  <article className="audit-overview-card" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <em>{item.note}</em>
                  </article>
                ))}
              </div>
              <div className="audit-filter">
                <label>
                  <span>当前作品</span>
                  <strong>{project.title}</strong>
                </label>
                <label>
                  <span>动作筛</span>
                  <select
                    value={auditActionFilter}
                    onChange={(event) => setAuditActionFilter(event.target.value)}
                  >
                    {auditActionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="audit-list activity-list">
                {projectTimelineEntries.length === 0 && (
                  <span>当前作品暂无匹配活动</span>
                )}
                {projectTimelineEntries.map((entry) => (
                  <article className="audit-row" key={entry.id}>
                    <strong>{formatAuditActionLabel(entry.action)}</strong>
                    <span>
                      {formatAuditTargetType(entry.targetType)} · {formatShortId(entry.targetId)}
                    </span>
                    <em>{new Date(entry.createdAt).toLocaleString()}</em>
                  </article>
                ))}
              </div>
            </section>

            <section className={pagePanelClass('panel editor-panel recent-panel', ['overview'])}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">工作区审计</p>
                  <h2>最近操作</h2>
                </div>
              </div>
              <div className="recent-audit-head">
                <span>工作区</span>
                <strong>{activeWorkspaceName}</strong>
                <em>{auditEntries.length} 条后端操作记录</em>
              </div>
              <div className="audit-list">
                {recentAuditEntries.length === 0 && <span>暂无后端操作记录</span>}
                {recentAuditEntries.map((entry) => (
                  <article className="audit-row" key={entry.id}>
                    <strong>{formatAuditActionLabel(entry.action)}</strong>
                    <span>
                      {formatAuditTargetType(entry.targetType)} · {formatShortId(entry.targetId)}
                    </span>
                  </article>
                ))}
              </div>
            </section>

            <section className={pagePanelClass('panel editor-panel character-command-panel', ['characters'])}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">资产总控</p>
                  <h2>角色一致性工作台</h2>
                </div>
                <span className="project-list-state">
                  {characterReadyCount}/{Math.max(1, project.characters.length)} 可生成
                </span>
              </div>
              <div className="character-health-grid">
                {characterHealthCards.map((item) => (
                  <article className={`character-health-card ${item.tone}`} key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <em>{item.note}</em>
                  </article>
                ))}
              </div>
              <div className="character-production-rail">
                <article>
                  <strong>档案</strong>
                  <span>姓名、定位、性格秘密</span>
                </article>
                <article>
                  <strong>一致性</strong>
                  <span>识别色、视觉提示词、声音方向</span>
                </article>
                <article>
                  <strong>剧情绑定</strong>
                  <span>节点引用、关系冲突、可生成素材</span>
                </article>
              </div>
              <div className="relationship-board">
                <div className="section-title light">
                  <span>关系网草图</span>
                  <em>{characterRelationshipRows.length} 条关系候选</em>
                </div>
                {characterRelationshipRows.length === 0 && (
                  <p>添加第二个角色后会生成关系候选。</p>
                )}
                {characterRelationshipRows.map((row) => (
                  <article key={row.id}>
                    <div>
                      <span style={{ background: row.source.color }} />
                      <strong>{row.source.name}</strong>
                    </div>
                    <em>{row.signal}</em>
                    <div>
                      <span style={{ background: row.target.color }} />
                      <strong>{row.target.name}</strong>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className={pagePanelClass('panel editor-panel gallery-panel', ['overview', 'characters'])}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">样片库</p>
                  <h2>样片库模板</h2>
                </div>
              </div>
              <div className="gallery-list">
                {galleryItems.map((item) => (
                  <article className="gallery-item" key={item.id}>
                    <strong>{item.title}</strong>
                    <span>{item.category}</span>
                    <em>{item.status} · {item.completion}</em>
                  </article>
                ))}
              </div>
            </section>

            <section className={pagePanelClass('panel editor-panel', ['story'])}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">变量条件</p>
                  <h2>变量条件</h2>
                </div>
                <button className="icon-button" type="button" onClick={addVariable} aria-label="Add variable">
                  <Plus size={16} />
                </button>
              </div>
              <div className="variable-list">
                {project.variables.map((variable, index) => (
                  <article className="variable-row" key={`${variable.id}-${index}`}>
                    <input
                      value={variable.label}
                      onChange={(event) => updateVariable(index, 'label', event.target.value)}
                    />
                    <select
                      value={variable.type}
                      onChange={(event) => updateVariable(index, 'type', event.target.value)}
                    >
                      {variableTypes.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                    <input
                      value={variable.defaultValue}
                      onChange={(event) =>
                        updateVariable(index, 'defaultValue', event.target.value)
                      }
                    />
                    <button
                      className="icon-button danger small"
                      type="button"
                      aria-label="Remove variable"
                      onClick={() => removeVariable(index)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <section className={pagePanelClass('panel editor-panel ai-generation-log-panel', ['story'])}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">AI 闭环</p>
                  <h2>生成记录</h2>
                </div>
                <span className="project-list-state">
                  {projectHasRemoteRecord ? '云端作品' : '本地草稿'}
                </span>
              </div>
              <div className="ai-loop-steps">
                <article>
                  <Save size={15} />
                  <div>
                    <strong>自动保存</strong>
                    <span>{saveState}</span>
                  </div>
                </article>
                <article>
                  <Wand2 size={15} />
                  <div>
                    <strong>生成状态</strong>
                    <span>{aiState}</span>
                  </div>
                </article>
                <article>
                  <TerminalSquare size={15} />
                  <div>
                    <strong>版本记录</strong>
                    <span>{projectRecentActivityEntries[0]?.action || '等待首次保存'}</span>
                  </div>
                </article>
              </div>
              <div className="ai-loop-list">
                {aiUsageSummary.latest.length === 0 && (
                  <span>生成下一幕后会显示模型、成本和耗时</span>
                )}
                {aiUsageSummary.latest.slice(0, 3).map((event) => (
                  <article key={event.id}>
                    <strong>{event.task}</strong>
                    <span>{event.providerId} · {event.model}</span>
                    <em>
                      {event.totalTokens} tokens · {event.currency} {event.estimatedCost}
                    </em>
                  </article>
                ))}
              </div>
            </section>

            <section className={pagePanelClass('panel editor-panel', ['story'])}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">节点编辑</p>
                  <h2>节点编辑</h2>
                </div>
                <button
                  className="icon-button danger"
                  type="button"
                  aria-label="Delete node"
                  onClick={() => removeStoryNode(selectedNode.id)}
                  disabled={storyNodes.length === 1}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="node-editor-summary">
                <article>
                  <span>节点编号</span>
                  <strong>{selectedNode.id}</strong>
                </article>
                <article>
                  <span>健康度</span>
                  <strong>{selectedNodeDiagnostic.readiness}%</strong>
                </article>
                <article>
                  <span>引用来源</span>
                  <strong>{selectedNodeIncoming.length}</strong>
                </article>
                <article>
                  <span>可选分支</span>
                  <strong>{selectedNode.choices.length}</strong>
                </article>
                <article className={selectedNodePaywallMode}>
                  <span>结局权限</span>
                  <strong>
                    {selectedNode.kind === 'Ending'
                      ? formatNodePaywallMode(selectedNodePaywallMode)
                      : '剧情节点'}
                  </strong>
                </article>
              </div>

              <div className="selected-node-diagnosis">
                <div className="section-title light">
                  <span>当前节点诊断</span>
                  <em>
                    {selectedNodeDiagnostic.criticalCount > 0
                      ? `${selectedNodeDiagnostic.criticalCount} 阻断`
                      : `${selectedNodeDiagnostic.warningCount} 提醒`}
                  </em>
                </div>
                {selectedNodeDiagnostic.issues.length === 0 ? (
                  <article className="ok">
                    <CheckCircle2 size={15} />
                    <strong>结构稳定</strong>
                    <span>{selectedNodeDiagnostic.incoming} 入站 · {selectedNodeDiagnostic.outgoing} 出站</span>
                  </article>
                ) : (
                  selectedNodeDiagnostic.issues.map((item) => (
                    <article className={item.tone} key={item.label}>
                      <AlertTriangle size={15} />
                      <strong>{item.label}</strong>
                      <span>{selectedNodeDiagnostic.incoming} 入站 · {selectedNodeDiagnostic.outgoing} 出站</span>
                    </article>
                  ))
                )}
              </div>

              <div className="form-grid">
                <label>
                  <span>标题</span>
                  <input
                    value={selectedNode.title}
                    onChange={(event) => updateSelectedNode('title', event.target.value)}
                  />
                </label>
                <label>
                  <span>类型</span>
                  <select
                    value={selectedNode.kind}
                    onChange={(event) =>
                      updateSelectedNode('kind', event.target.value as NodeKind)
                    }
                  >
                    {nodeKinds.map((kind) => (
                      <option key={kind}>{kind}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>指标</span>
                  <input
                    value={selectedNode.metric}
                    onChange={(event) => updateSelectedNode('metric', event.target.value)}
                  />
                </label>
                <label>
                  <span>结局权限</span>
                  <select
                    value={selectedNodePaywallMode}
                    onChange={(event) =>
                      updateNodePaywall(selectedNode.id, event.target.value as NodePaywall)
                    }
                    disabled={
                      selectedNode.kind !== 'Ending' ||
                      project.publish.monetization !== 'Paid Ending'
                    }
                  >
                    <option value="free">免费结局</option>
                    <option value="paid">付费结局</option>
                  </select>
                </label>
                <label className="wide-field">
                  <span>剧情摘要</span>
                  <textarea
                    value={selectedNode.summary}
                    onChange={(event) =>
                      updateSelectedNode('summary', event.target.value)
                    }
                  />
                </label>
              </div>

              <div className="choice-editor">
                <div className="section-title light">
                  <span>玩家选择和分支</span>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={addChoice}
                    aria-label="Add choice"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="branch-integrity-list">
                  {selectedNodeBranchRows.length === 0 ? (
                    <article className="empty">
                      <span>无出站分支</span>
                      <strong>{selectedNode.kind === 'Ending' ? '结局节点' : '断点'}</strong>
                      <em>{selectedNode.kind === 'Ending' ? '已收束' : '需要补分支'}</em>
                    </article>
                  ) : (
                    selectedNodeBranchRows.map((row) => (
                      <article className={row.status} key={row.id}>
                        <span>{String(row.index + 1).padStart(2, '0')}</span>
                        <div>
                          <strong>{row.label}</strong>
                          <em>{row.targetLabel} · {row.stateLabel}</em>
                        </div>
                        <small>{row.paywallLabel} · {row.conditionLabel} · {row.conditionRuntimeLabel}</small>
                      </article>
                    ))
                  )}
                </div>
                {selectedNode.choices.map((item, index) => (
                  <article className="branch-row" key={item.id}>
                    {(() => {
                      const branchRow = selectedNodeBranchRows[index]
                      const targetIsEnding = branchRow?.targetKind === 'Ending'
                      return (
                        <>
                    <label>
                      <span>选择文案</span>
                      <input
                        value={item.label}
                        onChange={(event) =>
                          updateChoice(index, 'label', event.target.value)
                        }
                      />
                    </label>
                    <label>
                      <span>目标节点</span>
                      <select
                        value={item.targetNodeId}
                        onChange={(event) =>
                          updateChoice(index, 'targetNodeId', event.target.value)
                        }
                      >
                        {storyNodes.map((node) => (
                          <option key={node.id} value={node.id}>
                            {node.id} · {node.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="wide-field">
                      <span>触发条件</span>
                      <input
                        value={item.condition}
                        placeholder="例如：线>= 3"
                        onChange={(event) =>
                          updateChoice(index, 'condition', event.target.value)
                        }
                      />
                      <div className="branch-condition-tools" aria-label="条件模板">
                        {branchConditionTemplates.map((template) => (
                          <button
                            type="button"
                            key={template.id}
                            onClick={() => applyChoiceCondition(index, template.condition)}
                          >
                            {template.label}
                          </button>
                        ))}
                        <button type="button" onClick={() => applyChoiceCondition(index, '')}>
                          无条件
                        </button>
                      </div>
                    </label>
                    <div className="branch-row-actions">
                      <button type="button" onClick={() => applyChoiceLabelSuggestion(index)}>
                        优化文案
                      </button>
                      {branchRow?.suggestedCondition && (
                        <button
                          type="button"
                          onClick={() => applyChoiceCondition(index, branchRow.suggestedCondition)}
                        >
                          套推荐条件
                        </button>
                      )}
                      <button type="button" onClick={() => previewChoiceRoute(item)}>
                        预览路径
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          branchRow?.targetId &&
                          focusStoryNode(branchRow.targetId, `已打开目标节点 ${branchRow.targetId}`)
                        }
                        disabled={!branchRow?.targetId}
                      >
                        编辑目标
                      </button>
                      {targetIsEnding && branchRow?.targetId && (
                        <span className="branch-paywall-controls">
                          <button
                            type="button"
                            className={branchRow.targetPaywall === 'free' ? 'active' : ''}
                            onClick={() => updateNodePaywall(branchRow.targetId, 'free')}
                          >
                            免费
                          </button>
                          <button
                            type="button"
                            className={branchRow.targetPaywall === 'paid' ? 'active paid' : 'paid'}
                            onClick={() => updateNodePaywall(branchRow.targetId, 'paid')}
                          >
                            付费
                          </button>
                        </span>
                      )}
                      <em>{branchRow?.conditionRuntimeLabel}</em>
                    </div>
                    <button
                      className="icon-button danger small branch-delete"
                      type="button"
                      aria-label="Remove choice"
                      onClick={() => removeChoice(index)}
                    >
                      <Trash2 size={14} />
                    </button>
                        </>
                      )
                    })()}
                  </article>
                ))}
              </div>
            </section>

            {activeStudioPage === 'story' && player}

            <section className={pagePanelClass('panel character-workbench-panel', ['characters'])}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">角色资产</p>
                  <h2>角色档案</h2>
                </div>
                <button className="icon-button" type="button" onClick={addCharacter} aria-label="Add character">
                  <Plus size={16} />
                </button>
              </div>
              <div className="character-workbench">
                <div className="character-roster">
                  {characterAssetRows.length === 0 && (
                    <div className="character-empty">
                      <strong>还没有角色资产</strong>
                      <span>添加主角、对手和关键盟友后，AI 导演才能稳定生成同一批人物。</span>
                    </div>
                  )}
                  {characterAssetRows.map((character) => (
                    <button
                      className={`character-roster-card ${
                        character.index === safeSelectedCharacterIndex ? 'selected' : ''
                      }`}
                      key={`${character.name}-${character.index}`}
                      type="button"
                      onClick={() => setSelectedCharacterIndex(character.index)}
                    >
                      <span className="character-swatch" style={{ background: character.color }} />
                      <div>
                        <strong>{character.name || '未命名角色'}</strong>
                        <span>{character.role || '角色定位待补'}</span>
                        <em>{character.statusLabel} · {character.mentionCount} 个剧情引用</em>
                      </div>
                      <small>{character.completion}%</small>
                    </button>
                  ))}
                </div>

                <div className="character-detail-panel">
                  {selectedCharacterAsset ? (
                    <>
                      <div className="character-detail-head">
                        <span
                          className="character-detail-avatar"
                          style={{ background: selectedCharacterAsset.color }}
                        />
                        <div>
                          <strong>{selectedCharacterAsset.name || '未命名角色'}</strong>
                          <span>{selectedCharacterAsset.statusLabel}</span>
                        </div>
                        <button
                          className="icon-button danger small"
                          type="button"
                          aria-label="Remove character"
                          onClick={() => removeCharacter(selectedCharacterAsset.index)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="character-checklist">
                        {selectedCharacterAsset.checklist.map((item) => (
                          <span className={item.done ? 'done' : ''} key={item.label}>
                            {item.done ? 'OK' : '-'} {item.label}
                          </span>
                        ))}
                      </div>
                      <div className="character-form-grid">
                        <label>
                          <span>姓名</span>
                          <input
                            value={selectedCharacterAsset.name}
                            onChange={(event) =>
                              updateCharacter(selectedCharacterAsset.index, 'name', event.target.value)
                            }
                          />
                        </label>
                        <label>
                          <span>识别色</span>
                          <input
                            value={selectedCharacterAsset.color}
                            onChange={(event) =>
                              updateCharacter(selectedCharacterAsset.index, 'color', event.target.value)
                            }
                          />
                        </label>
                        <label className="wide-field">
                          <span>角色定位</span>
                          <input
                            value={selectedCharacterAsset.role}
                            onChange={(event) =>
                              updateCharacter(selectedCharacterAsset.index, 'role', event.target.value)
                            }
                          />
                        </label>
                        <label className="wide-field">
                          <span>性格、秘密和动机</span>
                          <textarea
                            value={selectedCharacterAsset.trait}
                            onChange={(event) =>
                              updateCharacter(selectedCharacterAsset.index, 'trait', event.target.value)
                            }
                          />
                        </label>
                      </div>
                      <div className="character-generation-notes">
                        <article>
                          <strong>视觉提示</strong>
                          <span>{selectedCharacterAsset.name}，{selectedCharacterAsset.role}，主色 {selectedCharacterAsset.color}</span>
                        </article>
                        <article>
                          <strong>声音方向</strong>
                          <span>{selectedCharacterAsset.trait || '补充秘密后生成语气方向'}</span>
                        </article>
                        <article>
                          <strong>剧情绑定</strong>
                          <span>
                            {selectedCharacterAsset.mentionCount > 0
                              ? `已出现在 ${selectedCharacterAsset.mentionCount} 处剧情文本`
                              : '建议在节点摘要或选择文案中明确引用该角色'}
                          </span>
                        </article>
                      </div>
                    </>
                  ) : (
                    <div className="character-empty">
                      <strong>选择一个角色开始编辑</strong>
                      <span>角色页会同步影响 AI 生成、内容安全扫描和发布前资产检查。</span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  )
}

export default App
