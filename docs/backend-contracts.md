# Backend Contracts

## Purpose

This document defines the first backend contract for PlayDrama Studio. It turns the current local prototype into a backend-ready product without forcing an immediate backend implementation.

## Core Principles

- The frontend must not call AI providers directly.
- Project data must be saved under a workspace.
- Publish builds must be immutable snapshots.
- Analytics events must be append-only.
- China Mainland public launch must route to domestic model providers by default.

## Entities

### User

```json
{
  "id": "usr_001",
  "displayName": "Creator",
  "email": "creator@example.com",
  "role": "owner",
  "createdAt": "2026-05-17T00:00:00.000Z"
}
```

### Workspace

```json
{
  "id": "wks_001",
  "name": "Creator Studio",
  "plan": "creator",
  "ownerUserId": "usr_001",
  "createdAt": "2026-05-17T00:00:00.000Z"
}
```

### Project

The current frontend `StoryProject` maps to the backend `Project`.

```json
{
  "id": "prj_001",
  "workspaceId": "wks_001",
  "title": "旧医院的第七通电话",
  "template": "悬疑探案 v1",
  "publish": {
    "status": "Beta",
    "visibility": "Unlisted",
    "category": "悬疑互动短剧",
    "audience": "短剧创作者 / 悬疑玩家",
    "monetization": "Paid Ending",
    "price": "9.9"
  },
  "modelRouting": {
    "market": "China Mainland",
    "defaultProvider": "DeepSeek / 通义千问 / 豆包 / 智谱 GLM",
    "openaiPolicy": "Disabled for China public launch",
    "contentSafety": "Required",
    "fallbackProvider": "Kimi / MiniMax / 腾讯混元"
  },
  "nodes": [],
  "variables": [],
  "characters": [],
  "updatedAt": "2026-05-17T00:00:00.000Z"
}
```

### PublishBuild

A publish build is a frozen version of a project.

```json
{
  "id": "bld_001",
  "projectId": "prj_001",
  "workspaceId": "wks_001",
  "version": 1,
  "status": "ready",
  "visibility": "Unlisted",
  "runtimeUrl": "/play/bld_001",
  "snapshot": {},
  "createdAt": "2026-05-17T00:00:00.000Z"
}
```

### AnalyticsEvent

```json
{
  "id": "evt_001",
  "workspaceId": "wks_001",
  "projectId": "prj_001",
  "buildId": "bld_001",
  "sessionId": "ses_001",
  "eventName": "choice_selected",
  "nodeId": "S02",
  "choiceId": "C03",
  "metadata": {
    "condition": "信任 < 2",
    "allowed": true
  },
  "createdAt": "2026-05-17T00:00:00.000Z"
}
```

## API Routes

### Auth

```text
GET    /api/me
POST   /api/auth/login
POST   /api/auth/email-code/request
POST   /api/auth/email-code/verify
POST   /api/auth/sms-code/request
POST   /api/auth/sms-code/verify
POST   /api/auth/logout
GET    /api/auth/providers
GET    /api/email/provider
GET    /api/sms/provider
POST   /api/email/callbacks/:provider
POST   /api/invitations/:token/accept
POST   /api/workspaces/:workspaceId/members/:memberId/resend
DELETE /api/workspaces/:workspaceId/members/:memberId/invite
GET    /api/workspaces/:workspaceId/invite-deliveries
PATCH  /api/workspaces/:workspaceId/invite-deliveries/:deliveryId
```

Email callback auth supports either `Authorization: Bearer <EMAIL_CALLBACK_SECRET>` in bearer mode or `x-playdrama-signature: sha256=<hex>` in `hmac-sha256` mode.

`AUTH_PROVIDER=email-code` uses `POST /api/auth/email-code/request` to send a 6 digit login code, then `POST /api/auth/email-code/verify` to exchange the code for a bearer token. Codes and session tokens are stored only as HMAC hashes in PostgreSQL.

`AUTH_PROVIDER=sms-code` uses `POST /api/auth/sms-code/request` to send a 6 digit login code by SMS, then `POST /api/auth/sms-code/verify` to exchange the code for a bearer token. SMS codes and session tokens are stored only as HMAC hashes in PostgreSQL. Phone numbers are normalized to E.164 format, so China mainland numbers such as `13800138000` become `+8613800138000`.

`GET /api/email/provider` returns the current provider configuration plus `recommendations`, ordered by rollout priority. The first recommended provider is the default next implementation target.

`GET /api/sms/provider` returns the current SMS provider configuration. `SMS_PROVIDER=tencent-sms` sends auth codes through Tencent Cloud SMS `SendSms` with TC3-HMAC-SHA256 signing. Required production variables are `TENCENTCLOUD_SECRET_ID`, `TENCENTCLOUD_SECRET_KEY`, `TENCENT_SMS_SDK_APP_ID`, `TENCENT_SMS_SIGN_NAME`, and `TENCENT_SMS_TEMPLATE_ID`.

`EMAIL_PROVIDER=tencent-ses` sends invite email through Tencent Cloud SES `SendEmail` with TC3-HMAC-SHA256 signing. Required production variables are `TENCENTCLOUD_SECRET_ID`, `TENCENTCLOUD_SECRET_KEY`, and `TENCENT_SES_FROM_EMAIL`.

`EMAIL_PROVIDER=aliyun-directmail` sends invite email through Aliyun DirectMail `SingleSendMail` with HMAC-SHA1 signing. Required production variables are `ALIYUN_ACCESS_KEY_ID`, `ALIYUN_ACCESS_KEY_SECRET`, and `ALIYUN_DM_ACCOUNT_NAME`.

Tencent SES readiness is exposed at `GET /api/email/provider` under `tencentSes.readiness` and `tencentSes.missing`.

Aliyun DirectMail readiness is exposed at `GET /api/email/provider` under `aliyunDirectMail.readiness` and `aliyunDirectMail.missing`.

`TENCENT_SES_DRY_RUN=true` makes Tencent SES invite delivery return a queued `dryrun_` provider message without calling Tencent Cloud.

`ALIYUN_DM_DRY_RUN=true` makes Aliyun DirectMail invite delivery return a queued `dryrun_aliyun_` provider message without calling Aliyun.

`npm run email:tencent-dry-run:verify` runs a black-box verification against the local API and exits non-zero on failed checks.

`npm run email:tencent-live:verify` runs a guarded live staging delivery check. It requires `TENCENT_SES_LIVE_TEST_EMAIL` and refuses to send unless Tencent credentials, sender, template, callback secret, HMAC mode, and `TENCENT_SES_DRY_RUN=false` are all configured.

`npm run email:aliyun-dry-run:verify` and `npm run email:aliyun-live:verify` provide the same guarded checks for Aliyun DirectMail. Live verification requires `ALIYUN_DM_LIVE_TEST_EMAIL` and refuses to send unless Aliyun credentials, sender account, callback secret, HMAC mode, and `ALIYUN_DM_DRY_RUN=false` are configured.

`npm run db:verify` verifies PostgreSQL connectivity, required tables, required indexes, and minimum imported data.

`GET /api/health` returns `storage.readiness` and `storage.missing`; the frontend sidebar displays this as the database migration card.

### Workspaces

```text
GET    /api/workspaces
POST   /api/workspaces
GET    /api/workspaces/:workspaceId
PATCH  /api/workspaces/:workspaceId
```

### Projects

```text
GET    /api/workspaces/:workspaceId/projects
POST   /api/workspaces/:workspaceId/projects
GET    /api/projects/:projectId
PATCH  /api/projects/:projectId
DELETE /api/projects/:projectId
```

### Publish Builds

```text
POST   /api/projects/:projectId/builds
GET    /api/projects/:projectId/builds
GET    /api/builds/:buildId
PATCH  /api/builds/:buildId
```

Build creation runs the content safety gate first. A blocking review returns `422 content_safety_blocked`; otherwise the build includes `contentSafety` metadata with review status and counts.

### Content Safety

```text
POST   /api/projects/:projectId/content-safety/scan
GET    /api/projects/:projectId/content-safety/reviews
```

The local rules provider records `contentSafetyReviews` with `status`, `passed`, flag counts, flags, policy version, workspace ID, and project ID. `CONTENT_SAFETY_PROVIDER=local-rules` plus `CONTENT_SAFETY_POLICY_READY=true` satisfies the readiness item until an external provider is configured.

### Runtime

```text
GET    /api/play/:buildId
POST   /api/play/:buildId/events
```

### Payments

```text
GET    /api/play/:buildId/orders?sessionId=:sessionId
POST   /api/play/:buildId/orders
GET    /api/payment/provider
POST   /api/payment/callbacks/alipay
POST   /api/payment/callbacks/wechat
GET    /api/distribution/providers
GET    /api/projects/:projectId/distribution/jobs
POST   /api/projects/:projectId/distribution/jobs
POST   /api/marketing/leads
GET    /api/marketing/leads
```

When `PAYMENT_PROVIDER=alipay`, runtime orders are created as `pending` and include a signed Alipay WAP checkout URL. The paid ending remains locked until the Alipay async callback verifies successfully and marks the order `paid`.

When `PAYMENT_PROVIDER=wechat`, runtime orders use WeChat Pay API v3 Native checkout and remain `pending` until the encrypted callback verifies and decrypts successfully. WeChat should only be enabled after merchant private key and platform public key PEM files exist on the server.

Payment callbacks perform a second validation after signature verification: Alipay must match the configured app ID, order amount, and optional `ALIPAY_SELLER_ID`; WeChat Pay must match the configured app ID, merchant ID, and order amount after API v3 signature verification and resource decryption. Invalid signatures are rejected before order mutation, and signed but mismatched callbacks leave the order pending.

`npm run payment:provider:verify` checks provider status, creates a non-paid smoke order, verifies that a checkout URL/code is returned, and cleans the test order. `npm run payment:sandbox:verify` remains available for local sandbox-only development.

`npm run payment:callbacks:verify` starts a temporary local API with generated Alipay RSA keys and verifies invalid-signature rejection, wrong-amount rejection, valid callback acceptance, and paid-ending unlock.

Distribution jobs are authenticated project operations. `POST /api/projects/:projectId/distribution/jobs` accepts `channel`, `buildId`, optional `caption`, and optional Douyin `videoId`. Without live platform credentials it creates a handoff task with the H5 URL or mini-program path. With `DOUYIN_ACCESS_TOKEN`, `DOUYIN_OPEN_ID`, and `videoId`, the Douyin adapter attempts the OpenAPI video publish call and records the provider response.

`POST /api/marketing/leads` is public and powers the public landing-page beta/cooperation form. It requires `name` plus either `phone` or `email`, normalizes China mainland phone numbers to E.164, persists to `marketing_leads`, and sends an optional notification email when `PLAYDRAMA_LEAD_NOTIFY_EMAIL` is configured. `GET /api/marketing/leads` is authenticated and returns the latest leads for operations review.

### AI Generation

```text
POST   /api/ai/story-outline
POST   /api/ai/expand-branch
POST   /api/ai/character-bible
POST   /api/ai/story-quality-check
```

`GET /api/ai/providers` returns the current AI provider, default model, domestic provider list, OpenAI policy, content safety requirement, and AI readiness items. `productionReady` is true only when provider, API key, default model, real adapter verification, and cost tracking are complete.

## Minimum Backend Milestone

The first backend milestone should support:

- Local demo login and one active process-scoped user
- One workspace
- Project save/load
- Publish build snapshot
- Runtime build load
- Analytics event append
- AI provider adapter stub

Payments, public marketplace, and team permissions can wait.

Current auth note: `POST /api/auth/login` creates or switches a local user by email and returns a local bearer token. This is request-scoped enough for beta development, but not final production authentication.

## Commercial Readiness

`GET /api/readiness` returns the commercial environment checklist used by the product sidebar and `npm run prod:verify`.

Response shape:

```json
{
  "status": "blocked",
  "passed": 1,
  "total": 12,
  "items": [
    {
      "id": "database",
      "area": "数据库 Database",
      "label": "PostgreSQL / Supabase",
      "ok": false,
      "action": "设置 PLAYDRAMA_STORAGE_DRIVER=postgres，配置 DATABASE_URL，并运行 db:import-json 和 db:verify。",
      "missingFields": ["PLAYDRAMA_STORAGE_DRIVER", "DATABASE_URL"]
    }
  ],
  "missing": []
}
```

The same object is also nested under `commercialReadiness` in `GET /api/health`.

Contract verifier:

```powershell
npm run readiness:api
```

The verifier is meant for staging and deployment checks. It confirms that the API exposes a readable 12-item contract and that `/api/health` agrees with `/api/readiness`.

Launch gate:

```powershell
npm run launch:gate
```

Set `PLAYDRAMA_API_BASE` to compare against a running staging or production API. The command returns a non-zero exit code whenever the decision is `NO-GO`.
