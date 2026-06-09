# AI Orchestrator Contract

## Purpose

The AI Orchestrator is the only backend service allowed to call model providers. The frontend sends product-level generation requests. The orchestrator chooses the provider based on market, policy, cost, and capability.

## Provider Policy

China Mainland public launch:

```text
Use domestic providers only.
OpenAI/GPT disabled by default.
```

Global or research:

```text
OpenAI/GPT can be enabled only where officially supported and approved.
```

## Provider Adapter Interface

```ts
type ModelProvider = {
  id: string
  displayName: string
  market: "china" | "global"
  capabilities: Array<"text" | "image" | "video" | "voice" | "safety">
  generateText(request: TextGenerationRequest): Promise<TextGenerationResult>
  moderate?(request: ModerationRequest): Promise<ModerationResult>
}
```

## Text Generation Request

```json
{
  "workspaceId": "wks_001",
  "projectId": "prj_001",
  "task": "story_outline",
  "market": "China Mainland",
  "language": "zh-CN",
  "genre": "悬疑互动短剧",
  "input": {
    "idea": "旧医院里接到失踪哥哥的电话",
    "targetDurationMinutes": 8,
    "branchCount": 5
  },
  "policy": {
    "openaiAllowed": false,
    "contentSafetyRequired": true
  }
}
```

## Text Generation Result

```json
{
  "providerId": "deepseek",
  "task": "story_outline",
  "status": "succeeded",
  "output": {
    "title": "旧医院的第七通电话",
    "nodes": [],
    "variables": [],
    "characters": []
  },
  "usage": {
    "inputTokens": 1000,
    "outputTokens": 1800,
    "estimatedCost": "0.02"
  },
  "safety": {
    "passed": true,
    "flags": []
  }
}
```

## First Domestic Provider Config

```json
[
  {
    "id": "deepseek",
    "displayName": "DeepSeek",
    "market": "china",
    "capabilities": ["text"]
  },
  {
    "id": "qwen",
    "displayName": "通义千问",
    "market": "china",
    "capabilities": ["text", "image"]
  },
  {
    "id": "doubao",
    "displayName": "豆包",
    "market": "china",
    "capabilities": ["text", "voice"]
  },
  {
    "id": "zhipu",
    "displayName": "智谱 GLM",
    "market": "china",
    "capabilities": ["text"]
  }
]
```

## Environment Variables

China mainland commercial launch should not be marked ready until all of these pass:

```text
AI_PROVIDER=deepseek 或 qwen 或 doubao 或 zhipu
AI_MODEL_NAME=
AI_PROVIDER_ADAPTER_READY=true
AI_COST_TRACKING_READY=true
DEEPSEEK_API_KEY=
QWEN_API_KEY=
DOUBAO_API_KEY=
ZHIPU_API_KEY=
CONTENT_SAFETY_PROVIDER=真实审核服务名
CONTENT_SAFETY_API_KEY=
```

`AI_PROVIDER_ADAPTER_READY=true` is a manual signoff after real provider calls pass for `story_outline`, `expand_branch`, `character_bible`, and `story_quality_check`.

`AI_COST_TRACKING_READY=true` is a manual signoff after generation logs contain provider, model, token usage, estimated cost, workspaceId, and projectId.

Provider readiness is exposed by:

```text
GET /api/ai/providers
```

## Generation Tasks

### story_outline

Input:

- One-sentence idea
- Genre
- Target duration
- Branch count

Output:

- Title
- Nodes
- Choices
- Variables
- Characters

### expand_branch

Input:

- Existing node
- Desired branch direction

Output:

- New node
- Choice label
- Condition suggestion

### character_bible

Input:

- Character role
- Genre
- Story context

Output:

- Name
- Role
- Traits
- Secrets
- Voice style
- Visual notes

### story_quality_check

Input:

- Full project snapshot

Output:

- Hook score
- Branch clarity score
- Ending quality score
- Monetization risk
- Safety flags
- Rewrite suggestions

## Logging Requirements

Every generation call must log:

- workspaceId
- projectId
- task
- providerId
- input hash
- prompt template version
- output summary
- cost estimate
- safety result
- createdAt

Do not log raw secrets or API keys.
