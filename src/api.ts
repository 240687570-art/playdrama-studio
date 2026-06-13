import { getAuthToken, setAuthToken, clearAuthToken } from './utils/tokenStorage'

export const DEFAULT_WORKSPACE_ID = 'wks_001'
export const AUTH_TOKEN_STORAGE_KEY = 'playdrama.authToken.v1'

const configuredApiBases = (
  import.meta.env.VITE_PLAYDRAMA_API_BASES ||
  import.meta.env.VITE_PLAYDRAMA_API_BASE ||
  ''
)
  .split(',')
  .map((item: string) => item.trim())
  .filter(Boolean)

function isLocalApiBase(base: string) {
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(?:\/|$)/i.test(base)
}

const safeConfiguredApiBases = import.meta.env.PROD
  ? configuredApiBases.filter((base: string) => !isLocalApiBase(base))
  : configuredApiBases

const apiBases =
  safeConfiguredApiBases.length > 0
    ? safeConfiguredApiBases
    : import.meta.env.PROD
      ? ['']
      : ['http://127.0.0.1:8787', 'http://127.0.0.1:8788']

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
}

async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const errors: string[] = []
  const headers: Record<string, string> = {
    ...(options.body ? { 'content-type': 'application/json' } : {}),
    ...authHeaders(),
  }

  for (const base of apiBases) {
    try {
      const response = await fetch(`${base}${path}`, {
        method: options.method || 'GET',
        headers,
        credentials: base ? 'omit' : 'include',
        body: options.body ? JSON.stringify(options.body) : undefined,
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        const message =
          typeof body.error === 'string'
            ? body.error
            : typeof body.message === 'string'
              ? body.message
              : ''
        errors.push(
          `${base}${path} returned ${response.status}${message ? `: ${message}` : ''}`,
        )
        continue
      }

      return (await response.json()) as T
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  }

  throw new Error(errors.join('; ') || 'API request failed')
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken()
  return token ? { authorization: `Bearer ${token}` } : {}
}

export async function fetchRemoteProjects<TProject>(
  workspaceId = DEFAULT_WORKSPACE_ID,
) {
  const data = await apiRequest<{ projects: TProject[] }>(
    `/api/workspaces/${workspaceId}/projects`,
  )
  return data.projects
}

export async function fetchSession<TSession>(workspaceId = DEFAULT_WORKSPACE_ID) {
  return apiRequest<TSession>(`/api/me?workspaceId=${encodeURIComponent(workspaceId)}`)
}

export async function fetchAuthProvider<TAuthProvider>() {
  return apiRequest<TAuthProvider>('/api/auth/providers')
}

export async function fetchEmailProvider<TEmailProvider>() {
  return apiRequest<TEmailProvider>('/api/email/provider')
}

export async function fetchPaymentProvider<TPaymentProvider>() {
  return apiRequest<TPaymentProvider>('/api/payment/provider')
}

export async function fetchDistributionProvider<TDistributionProvider>() {
  return apiRequest<TDistributionProvider>('/api/distribution/providers')
}

export async function fetchHealth<THealth>() {
  return apiRequest<THealth>('/api/health')
}

export async function login<TSession>(input: {
  email: string
  displayName?: string
  workspaceId?: string
}) {
  const data = await apiRequest<{ session: TSession; authToken: string }>('/api/auth/login', {
    method: 'POST',
    body: input,
  })
  setAuthToken(data.authToken, 60)
  return data.session
}

export async function requestEmailLoginCode(input: {
  email: string
  displayName?: string
}) {
  return apiRequest<{
    ok: boolean
    email: string
    expiresAt: string
    canVerify?: boolean
    debugCode?: string
    delivery?: {
      provider: string
      status: string
      providerMessageId?: string | null
      errorMessage?: string | null
    }
  }>('/api/auth/email-code/request', {
    method: 'POST',
    body: input,
  })
}

export async function requestSmsLoginCode(input: {
  phone: string
  displayName?: string
}) {
  return apiRequest<{
    ok: boolean
    phone: string
    expiresAt: string
    canVerify?: boolean
    debugCode?: string
    delivery?: {
      provider: string
      status: string
      providerMessageId?: string | null
      errorMessage?: string | null
    }
  }>('/api/auth/sms-code/request', {
    method: 'POST',
    body: input,
  })
}

export async function verifyEmailLoginCode<TSession>(input: {
  email: string
  code: string
  displayName?: string
  workspaceId?: string
}) {
  const data = await apiRequest<{ session: TSession; authToken: string }>(
    '/api/auth/email-code/verify',
    {
      method: 'POST',
      body: input,
    },
  )
  setAuthToken(data.authToken, 60)
  return data.session
}

export async function verifySmsLoginCode<TSession>(input: {
  phone: string
  code: string
  displayName?: string
  workspaceId?: string
}) {
  const data = await apiRequest<{ session: TSession; authToken: string }>(
    '/api/auth/sms-code/verify',
    {
      method: 'POST',
      body: input,
    },
  )
  setAuthToken(data.authToken, 60)
  return data.session
}

export async function logout<TSession>() {
  const data = await apiRequest<{ session: TSession }>('/api/auth/logout', {
    method: 'POST',
  })
  clearAuthToken()
  return data.session
}

export async function fetchWorkspaces<TWorkspace>() {
  const data = await apiRequest<{ workspaces: TWorkspace[] }>('/api/workspaces')
  return data.workspaces
}

export async function createWorkspace<TWorkspace>(input: {
  name: string
  plan?: string
}) {
  const data = await apiRequest<{ workspace: TWorkspace }>('/api/workspaces', {
    method: 'POST',
    body: input,
  })
  return data.workspace
}

export async function fetchWorkspaceMembers<TMember>(
  workspaceId = DEFAULT_WORKSPACE_ID,
) {
  const data = await apiRequest<{ members: TMember[] }>(
    `/api/workspaces/${workspaceId}/members`,
  )
  return data.members
}

export async function inviteWorkspaceMember<TMember>(input: {
  email: string
  role: string
  workspaceId?: string
}) {
  const data = await apiRequest<{ member: TMember }>(
    `/api/workspaces/${input.workspaceId || DEFAULT_WORKSPACE_ID}/members`,
    {
      method: 'POST',
      body: { email: input.email, role: input.role },
    },
  )
  return data.member
}

export async function acceptInvitation<TSession>(token: string) {
  const data = await apiRequest<{ session: TSession; authToken: string }>(
    `/api/invitations/${encodeURIComponent(token)}/accept`,
    {
      method: 'POST',
    },
  )
  setAuthToken(data.authToken, 60)
  return data.session
}

export async function resendWorkspaceInvitation<TMember>(input: {
  workspaceId: string
  memberId: string
}) {
  const data = await apiRequest<{ member: TMember }>(
    `/api/workspaces/${input.workspaceId}/members/${input.memberId}/resend`,
    {
      method: 'POST',
    },
  )
  return data.member
}

export async function cancelWorkspaceInvitation<TMember>(input: {
  workspaceId: string
  memberId: string
}) {
  const data = await apiRequest<{ member: TMember }>(
    `/api/workspaces/${input.workspaceId}/members/${input.memberId}/invite`,
    {
      method: 'DELETE',
    },
  )
  return data.member
}

export async function fetchInviteDeliveries<TDelivery>(workspaceId = DEFAULT_WORKSPACE_ID) {
  const data = await apiRequest<{ deliveries: TDelivery[] }>(
    `/api/workspaces/${workspaceId}/invite-deliveries`,
  )
  return data.deliveries
}

export async function updateInviteDelivery<TDelivery>(input: {
  workspaceId: string
  deliveryId: string
  status: string
  providerMessageId?: string
  errorMessage?: string
}) {
  const data = await apiRequest<{ delivery: TDelivery }>(
    `/api/workspaces/${input.workspaceId}/invite-deliveries/${input.deliveryId}`,
    {
      method: 'PATCH',
      body: {
        status: input.status,
        providerMessageId: input.providerMessageId,
        errorMessage: input.errorMessage,
      },
    },
  )
  return data.delivery
}

export async function fetchAuditLog<TAuditEntry>() {
  const data = await apiRequest<{ auditLog: TAuditEntry[] }>('/api/audit')
  return data.auditLog
}

export async function saveRemoteProject<TProject extends { id: string }>(
  project: TProject,
  workspaceId = DEFAULT_WORKSPACE_ID,
) {
  const data = await apiRequest<{ project: TProject }>(
    `/api/workspaces/${workspaceId}/projects`,
    {
      method: 'POST',
      body: project,
    },
  )
  return data.project
}

export async function publishRemoteBuild<TBuild>(projectId: string) {
  const data = await apiRequest<{ build: TBuild }>(`/api/projects/${projectId}/builds`, {
    method: 'POST',
  })
  return data.build
}

export async function fetchProjectBuilds<TBuild>(projectId: string) {
  const data = await apiRequest<{ builds: TBuild[] }>(
    `/api/projects/${encodeURIComponent(projectId)}/builds`,
  )
  return data.builds
}

export async function fetchDistributionJobs<TJob>(projectId: string, buildId?: string) {
  const params = new URLSearchParams()
  if (buildId) params.set('buildId', buildId)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  const data = await apiRequest<{ jobs: TJob[] }>(
    `/api/projects/${encodeURIComponent(projectId)}/distribution/jobs${suffix}`,
  )
  return data.jobs
}

export async function fetchVideoProvider<TProvider>() {
  return apiRequest<TProvider>('/api/video/providers')
}

export async function fetchVideoGenerationJobs<TJob>(projectId: string) {
  const data = await apiRequest<{ jobs: TJob[] }>(
    `/api/projects/${encodeURIComponent(projectId)}/video/jobs`,
  )
  return data.jobs
}

export async function fetchCanvasAssets<TAsset>(projectId: string) {
  const data = await apiRequest<{ assets: TAsset[] }>(
    `/api/projects/${encodeURIComponent(projectId)}/canvas/assets`,
  )
  return data.assets
}

export async function createCanvasAsset<TAsset>(
  projectId: string,
  input: {
    type?: string
    name?: string
    meta?: string
    source?: string
    status?: string
    fileName?: string
    mimeType?: string
    size?: number
    url?: string
    nodeId?: string
  },
) {
  const data = await apiRequest<{ asset: TAsset }>(
    `/api/projects/${encodeURIComponent(projectId)}/canvas/assets`,
    {
      method: 'POST',
      body: input,
    },
  )
  return data.asset
}

export async function fetchCanvasNodeRuns<TRun>(projectId: string) {
  const data = await apiRequest<{ runs: TRun[] }>(
    `/api/projects/${encodeURIComponent(projectId)}/canvas/node-runs`,
  )
  return data.runs
}

export async function runCanvasNode<TRun, TAsset>(
  projectId: string,
  nodeId: string,
  input: {
    nodeType?: string
    prompt?: string
    model?: string
  },
) {
  return apiRequest<{ run: TRun; asset: TAsset }>(
    `/api/projects/${encodeURIComponent(projectId)}/canvas/nodes/${encodeURIComponent(nodeId)}/run`,
    {
      method: 'POST',
      body: input,
    },
  )
}

export async function runCanvasWorkflow<TWorkflow, TRun, TAsset>(
  projectId: string,
  input: {
    scope?: 'all' | 'downstream'
    startNodeId?: string
  } = {},
) {
  return apiRequest<{ workflow: TWorkflow; runs: TRun[]; assets: TAsset[] }>(
    `/api/projects/${encodeURIComponent(projectId)}/canvas/workflows/run`,
    {
      method: 'POST',
      body: input,
    },
  )
}

export async function fetchFinalVideoRenders<TRender>(projectId: string) {
  const data = await apiRequest<{ renders: TRender[] }>(
    `/api/projects/${encodeURIComponent(projectId)}/video/renders`,
  )
  return data.renders
}

export async function createVideoGenerationJob<TJob>(
  projectId: string,
  input: {
    shotId: string
    nodeId?: string
    provider?: string
    model?: string
    prompt: string
    duration?: string
    aspectRatio?: string
    beat?: string
    scene?: string
    camera?: string
    motion?: string
    caption?: string
    dialogue?: string
    characterRefs?: unknown[]
    resolution?: string
    negativePrompt?: string
    source?: string
  },
) {
  const data = await apiRequest<{ job: TJob }>(
    `/api/projects/${encodeURIComponent(projectId)}/video/jobs`,
    {
      method: 'POST',
      body: input,
    },
  )
  return data.job
}

export async function createVideoGenerationJobsBatch<TJob>(
  projectId: string,
  input: {
    provider?: string
    model?: string
    source?: string
    qualityGate?: string
    deliveryUse?: string
    shots: Array<{
      shotId: string
      nodeId?: string
      model?: string
      prompt: string
      duration?: string
      aspectRatio?: string
      beat?: string
      scene?: string
      camera?: string
      motion?: string
      caption?: string
      dialogue?: string
      characterRefs?: unknown[]
      resolution?: string
      negativePrompt?: string
      sequenceIndex?: number
      source?: string
    }>
  },
) {
  const data = await apiRequest<{ jobs: TJob[] }>(
    `/api/projects/${encodeURIComponent(projectId)}/video/jobs/batch`,
    {
      method: 'POST',
      body: input,
    },
  )
  return data.jobs
}

export async function createFinalVideoRender<TRender>(
  projectId: string,
  input: {
    title?: string
    aspectRatio?: string
    source?: string
    includeDraftClips?: boolean
    jobIds?: string[]
    audioPolicy?: string
    subtitlePolicy?: string
    deliveryProfile?: string
    storagePolicy?: string
    archivePolicy?: string
    musicPolicy?: string
    voiceoverPolicy?: string
    qualityGate?: string
    clientReview?: {
      requestedBy?: string
      verdict?: string
      dueAt?: string
    }
    captions?: Array<{
      clipId?: string
      shotId?: string
      startSeconds?: number
      endSeconds?: number
      text: string
    }>
    reviewChecklist?: Array<{
      id?: string
      label: string
      status?: string
      owner?: string
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
    clips?: Array<{
      id?: string
      jobId?: string
      shotId: string
      nodeId?: string
      sequenceIndex?: number
      label?: string
      caption?: string
      duration?: string
      outputUrl: string
      provider?: string
      model?: string
    }>
  },
) {
  const data = await apiRequest<{ render: TRender }>(
    `/api/projects/${encodeURIComponent(projectId)}/video/renders`,
    {
      method: 'POST',
      body: input,
    },
  )
  return data.render
}

export async function updateFinalVideoRenderReview<TRender>(
  renderId: string,
  input: {
    verdict?: string
    note?: {
      author?: string
      frame?: string
      severity?: string
      text: string
    }
    checklistUpdates?: Array<{
      id: string
      status?: string
      note?: string
    }>
  },
) {
  const data = await apiRequest<{ render: TRender }>(
    `/api/video/renders/${encodeURIComponent(renderId)}/review`,
    {
      method: 'PATCH',
      body: input,
    },
  )
  return data.render
}

export async function refreshVideoGenerationJob<TJob>(jobId: string) {
  const data = await apiRequest<{ job: TJob }>(
    `/api/video/jobs/${encodeURIComponent(jobId)}/refresh`,
    {
      method: 'POST',
    },
  )
  return data.job
}

export async function retryVideoGenerationJob<TJob>(jobId: string) {
  const data = await apiRequest<{ job: TJob }>(
    `/api/video/jobs/${encodeURIComponent(jobId)}/retry`,
    {
      method: 'POST',
    },
  )
  return data.job
}

export async function retryFinalVideoRender<TRender>(renderId: string) {
  const data = await apiRequest<{ render: TRender }>(
    `/api/video/renders/${encodeURIComponent(renderId)}/retry`,
    {
      method: 'POST',
    },
  )
  return data.render
}

export async function createDistributionJob<TJob>(
  projectId: string,
  input: {
    channel: string
    buildId?: string
    title?: string
    caption?: string
    videoId?: string
    microAppId?: string
  },
) {
  const data = await apiRequest<{ job: TJob }>(
    `/api/projects/${encodeURIComponent(projectId)}/distribution/jobs`,
    {
      method: 'POST',
      body: input,
    },
  )
  return data.job
}

export async function fetchContentSafetyReviews<TReview>(projectId: string) {
  const data = await apiRequest<{ reviews: TReview[] }>(
    `/api/projects/${encodeURIComponent(projectId)}/content-safety/reviews`,
  )
  return data.reviews
}

export async function scanProjectContentSafety<TReview>(projectId: string) {
  const data = await apiRequest<{ review: TReview }>(
    `/api/projects/${encodeURIComponent(projectId)}/content-safety/scan`,
    {
      method: 'POST',
    },
  )
  return data.review
}

export async function updateRemoteProject<TProject>(
  projectId: string,
  patch: Partial<TProject>,
) {
  const data = await apiRequest<{ project: TProject }>(`/api/projects/${projectId}`, {
    method: 'PATCH',
    body: patch,
  })
  return data.project
}

export async function fetchPublishedBuild<TBuild, TProject>(buildId: string) {
  return apiRequest<{ build: TBuild; project: TProject }>(
    `/api/play/${encodeURIComponent(buildId)}`,
  )
}

export async function fetchAnalyticsEvents<TEvent>() {
  const data = await apiRequest<{ events: TEvent[] }>('/api/analytics/events')
  return data.events
}

export async function fetchAiUsageEvents<TEvent>(workspaceId?: string, projectId?: string) {
  const params = new URLSearchParams()
  if (workspaceId) params.set('workspaceId', workspaceId)
  if (projectId) params.set('projectId', projectId)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  const data = await apiRequest<{ events: TEvent[] }>(`/api/ai/usage${suffix}`)
  return data.events
}

export async function fetchAiProvider<TAiProvider>() {
  return apiRequest<TAiProvider>('/api/ai/providers')
}

export async function recordRuntimeEvent<TEvent = unknown>(buildId: string, event: unknown) {
  const data = await apiRequest<{ event: TEvent }>(`/api/play/${buildId}/events`, {
    method: 'POST',
    body: event,
  })
  return data.event
}

export async function fetchRuntimeOrders<TOrder>(buildId: string, sessionId?: string) {
  const suffix = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ''
  return apiRequest<{ orders: TOrder[]; unlock: { nodeIds: string[] } }>(
    `/api/play/${encodeURIComponent(buildId)}/orders${suffix}`,
  )
}

export async function fetchLaunchGuard<TGuard>(input: {
  workspaceId?: string
  projectId?: string
  buildId?: string
}) {
  const params = new URLSearchParams()
  if (input.workspaceId) params.set('workspaceId', input.workspaceId)
  if (input.projectId) params.set('projectId', input.projectId)
  if (input.buildId) params.set('buildId', input.buildId)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return apiRequest<TGuard>(`/api/ops/launch-guard${suffix}`)
}

export async function createRuntimeOrder<TOrder>(
  buildId: string,
  input: {
    sessionId: string
    itemType: string
    itemId: string
    unlockNodeIds?: string[]
    provider?: string
  },
) {
  return apiRequest<{ order: TOrder; unlock: { nodeIds: string[] } }>(
    `/api/play/${encodeURIComponent(buildId)}/orders`,
    {
      method: 'POST',
      body: input,
    },
  )
}

export async function updatePaymentOrderOps<TOrder>(
  orderId: string,
  input: {
    status: 'pending' | 'failed' | 'refunded'
    note?: string
  },
) {
  const data = await apiRequest<{ order: TOrder }>(
    `/api/payment/orders/${encodeURIComponent(orderId)}`,
    {
      method: 'PATCH',
      body: input,
    },
  )
  return data.order
}

export async function generateAiDraft<TDraft>(task: string, input: unknown) {
  return apiRequest<TDraft>(`/api/ai/${encodeURIComponent(task)}`, {
    method: 'POST',
    body: { input },
  })
}

export async function createAiGenerationJob<TJob>(task: string, input: unknown) {
  const data = await apiRequest<{ job: TJob }>('/api/ai/jobs', {
    method: 'POST',
    body: { task, input },
  })
  return data.job
}

export async function fetchAiGenerationJob<TJob>(jobId: string) {
  const data = await apiRequest<{ job: TJob }>(`/api/ai/jobs/${encodeURIComponent(jobId)}`)
  return data.job
}

export async function retryAiGenerationJob<TJob>(jobId: string) {
  const data = await apiRequest<{ job: TJob }>(
    `/api/ai/jobs/${encodeURIComponent(jobId)}/retry`,
    {
      method: 'POST',
    },
  )
  return data.job
}

export async function submitLeadApplication<TLead>(input: {
  name: string
  company?: string
  role?: string
  phone?: string
  email?: string
  scenario?: string
  message?: string
  source?: string
}) {
  const data = await apiRequest<{ lead: TLead }>('/api/marketing/leads', {
    method: 'POST',
    body: input,
  })
  return data.lead
}

export async function fetchMarketingLeads<TLead>() {
  const data = await apiRequest<{ leads: TLead[] }>('/api/marketing/leads')
  return data.leads
}
