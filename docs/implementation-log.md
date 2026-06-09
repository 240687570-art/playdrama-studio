# Implementation Log

## 2026-05-17

### Backend Service Slice

- Added first local backend API service in `server/index.mjs`.
- Added project, publish build, runtime event, analytics, and AI provider stub endpoints.
- Added backend runbook for non-technical, developer, and AI-team handoff.
- Updated project scripts with `npm run api`.
- Added frontend API client in `src/api.ts`.
- Connected frontend save, reset, and JSON import flows to the local API with localStorage fallback.
- Added publish build button that creates backend build snapshots.
- Added runtime choice event tracking after a publish build is generated.
- Added local JSON database persistence at `server/data/playdrama-db.json`.
- Added startup database loading and write-through persistence for projects, builds, and events.
- Added workspace membership and permission scaffolding.
- Added member list and audit log API endpoints.
- Added frontend workspace permission, team access, and audit panels.
- Added role presets for owner, editor, analyst, and viewer.
- Added member invite API and creator UI invite form.
- Added audit entries for member invitation and role updates.
- Added workspace creation API.
- Added frontend workspace switcher and create-workspace control.
- Connected project, member, and session loading to the active workspace.
- Added workspace-scoped project list in the creator UI.
- Added project switching inside a workspace.
- Added create-project action that saves a new draft to the active workspace.
- Added project lifecycle status with active and archived states.
- Added duplicate project action.
- Added archive project action that hides projects from the active list without deleting data.
- Added archived project view.
- Added restore archived project action.
- Added project-level activity timeline.
- Added audit action filter for the current project.
- Split project activity from workspace recent audit in the creator UI.

### Completed

- Built the first React prototype for the creator workspace.
- Added editable story node state in `src/App.tsx`.
- Added node search, node selection, node creation, choice editing, and save status.
- Connected the mobile player preview to the currently selected story node.
- Added editor panel styles and selected node states in `src/App.css`.
- Verified `npm run build` and `npm run lint`.
- Created the AI commercial team operating system.
- Added commercial operations, creator operations, and AI team backlog docs.
- Updated roadmap with owner roles and commercial exit criteria.
- Refactored editor data into a `StoryProject` model.
- Added localStorage persistence, JSON export/import, and sample reset.
- Added editable project title, template, characters, node deletion, and choice deletion.
- Upgraded choices into branch objects with target nodes and conditions.
- Added story graph canvas.
- Added variable editor for story state.
- Added branch target and condition editing.
- Added playable runtime state for mobile preview.
- Added variable inputs for testing branch conditions.
- Added choice navigation between nodes.
- Added simple condition evaluator for expressions such as `线索 >= 3` and `钥匙 = true`.
- Added ending restart flow.
- Added publish settings for status, visibility, category, audience, monetization, and price.
- Added local share preview mode with `?preview=1`.
- Added demo gallery data model in the creator workspace.
- Added creator beta onboarding checklist.
- Added handoff, operations, developer, AI employee, next steps, and backup manifest docs.
- Added model provider strategy for China Mainland and Global routes.
- Added model routing settings to the project data model and creator workspace.
- Marked OpenAI/GPT as disabled for China public launch by default.
- Added backend API contracts for users, workspaces, projects, publish builds, runtime, and analytics.
- Added AI Orchestrator contract with domestic provider adapter interface.
- Added first domestic provider config for DeepSeek, 通义千问, 豆包, and 智谱 GLM.

### Current Prototype Capability

The app can now support this local creator loop:

```text
Select node -> edit title/type/summary/metric -> edit choices -> preview on phone mockup -> save
```

### Next Development Slice

Recommended next step: migrate the local JSON database to PostgreSQL or Supabase, then replace the demo user with real login.

Scope:

- Replace `server/data/playdrama-db.json` with database tables.
- Add real login and cloud database migration.
- Replace the built-in demo session with real account login.
- Connect invite flow to email delivery after auth is real.

This will prepare the prototype for account login, multi-user creator beta, and production data storage.

## 2026-05-17 Cloud Database Migration Prep

- Added `.env.example` for local API, storage driver, JSON DB path, future `DATABASE_URL`, and auth/session settings.
- Added `docs/database-schema.sql` as the first PostgreSQL / Supabase schema for users, workspaces, memberships, projects, publish builds, analytics events, and audit logs.
- Added `docs/cloud-database-migration.md` to explain the JSON -> PostgreSQL/Supabase migration path.
- Extended `/api/health` to expose storage driver, JSON database path, and whether `DATABASE_URL` is configured.
- Bound the API service to `HOST=127.0.0.1` by default so the frontend fallback base and health checks use the same local address.
- Updated handoff and backend docs so a new AI employee or engineer can find the migration files without reading service-provider internals.

Next recommended slice: implement the PostgreSQL storage adapter and one-time JSON import script.

## 2026-05-17 PostgreSQL Storage Slice

- Added the `pg` dependency for PostgreSQL / Supabase connectivity.
- Added `PLAYDRAMA_STORAGE_DRIVER=postgres` support in the API server.
- Added PostgreSQL loading for users, workspaces, memberships, projects, publish builds, analytics events, and audit logs.
- Added PostgreSQL save support through a beta-safe full snapshot transaction.
- Added `server/import-json-to-postgres.mjs` and `npm run db:import-json` for one-time JSON database migration.
- Updated migration, backend, handoff, and next-step docs.

Next recommended slice: run this against a real Supabase/PostgreSQL instance, then replace the built-in demo session with real login.

## 2026-05-17 Local Auth Slice

- Added local demo auth state to the API server.
- Added `POST /api/auth/login` to create or switch users by email.
- Added automatic personal workspace creation for first-time local users.
- Added `POST /api/auth/logout` to return to the default Creator account.
- Updated `/api/health` to expose auth mode and active local user ID.
- Added login and logout controls to the creator sidebar.
- Updated backend and handoff docs so real Auth can replace the local demo entry point later.

Next recommended slice: connect a real auth provider and make session identity request-scoped instead of process-scoped.

## 2026-05-17 Request-Scoped Local Session Slice

- Added local bearer token generation on `POST /api/auth/login`.
- Added request-level user resolution through `Authorization: Bearer <authToken>`.
- Updated permission checks, workspace loading, project writes, build writes, and audit attribution to use the request user.
- Updated frontend API client to persist `playdrama.authToken.v1` and attach it to subsequent API calls.
- Confirmed two simultaneous tokens can resolve to two different users through `/api/me`.

Next recommended slice: replace in-memory local tokens with Supabase Auth, Auth.js, or another production provider.

## 2026-05-17 Auth Provider Readiness Slice

- Added `AUTH_PROVIDER` configuration with supported provider status.
- Added `GET /api/auth/providers` for frontend and deployment checks.
- Exposed auth provider details in `/api/health`.
- Added auth provider status display in the creator workspace sidebar.
- Added `docs/auth-provider-plan.md` with China/global provider routes, backend replacement points, frontend replacement points, environment variables, and launch acceptance checks.

Next recommended slice: implement one real provider behind `requestUserId(req)`, starting with Supabase Auth or Auth.js depending on deployment choice.

## 2026-05-17 Invitation Acceptance Slice

- Added local invite tokens for workspace member invitations.
- Changed new invited memberships to `status=invited` until accepted.
- Added `POST /api/invitations/:token/accept` to activate an invited member and return a local auth token.
- Added `inviteUrl` to invite responses and displayed a local invite link in the creator UI.
- Updated PostgreSQL schema and import paths with `invite_token` and `accepted_at`.

Next recommended slice: attach email delivery to the generated invite URL, then add invite expiration.

## 2026-05-17 Invite Expiration And Email Stub Slice

- Added `INVITE_EXPIRES_DAYS` with a default 7-day invite window.
- Added `inviteExpiresAt` to memberships, PostgreSQL schema, and JSON -> PostgreSQL import.
- Added `EMAIL_PROVIDER=log` and a local `sendInviteEmail` stub.
- Invite responses now include `emailDelivery` with recipient, role, invite URL, provider, and expiration.
- Accepting an expired invite now returns `invite_expired`.
- Team member rows show invite expiration for pending invited members.

Next recommended slice: replace `EMAIL_PROVIDER=log` with a real transactional email service and add invite resend/cancel controls.

## 2026-05-17 Invite Resend And Cancel Slice

- Added `POST /api/workspaces/:workspaceId/members/:memberId/resend`.
- Added `DELETE /api/workspaces/:workspaceId/members/:memberId/invite`.
- Resending an invite now refreshes invite token, expiration, and logged email payload.
- Cancelling an invite marks membership as `cancelled` and invalidates the token.
- Added pending-invite action buttons in the team access UI.
- Tightened member route matching so nested member actions are not swallowed by the generic invite endpoint.

Next recommended slice: wire `EMAIL_PROVIDER` to a real transactional email provider.

## 2026-05-17 Invite Delivery History Slice

- Added persistent `inviteEmailDeliveries` records to the local JSON database.
- Added PostgreSQL table `invite_email_deliveries` and JSON import/export support.
- Added `GET /api/workspaces/:workspaceId/invite-deliveries`.
- Team access UI now shows recent invite email delivery records.
- Invite and resend actions append delivery records with provider, recipient, role, URL, status, expiration, and timestamp.

Next recommended slice: replace the log email provider with a real transactional email provider and map provider delivery callbacks to delivery statuses.

## 2026-05-17 Invite Delivery Status Slice

- Added delivery statuses: `logged`, `queued`, `sent`, `failed`, and `bounced`.
- Added `PATCH /api/workspaces/:workspaceId/invite-deliveries/:deliveryId`.
- Delivery records now store `providerMessageId`, `errorMessage`, and `updatedAt`.
- Team access UI now allows marking recent invite deliveries as `sent` or `failed`.
- PostgreSQL schema and JSON import/export paths now include delivery status callback fields.

Next recommended slice: implement a real provider adapter for `EMAIL_PROVIDER` and call the delivery status endpoint from provider webhooks.

## 2026-05-17 Email Provider Adapter Slice

- Added `EMAIL_PROVIDER=webhook` support as a generic transactional email bridge.
- Added `EMAIL_WEBHOOK_URL` and `EMAIL_API_KEY` configuration.
- Added `GET /api/email/provider` and exposed email provider readiness in `/api/health`.
- `sendInviteEmail` now supports `log`, `webhook`, and unsupported-provider failure handling.
- Frontend team access panel now shows the current email provider beside recent invite deliveries.
- Added `docs/email-provider-plan.md` with webhook payloads, response format, status callbacks, provider options, and launch checks.

Next recommended slice: connect a real email bridge or provider-specific adapter and verify an end-to-end invite email in staging.

## 2026-05-17 - Local Email Webhook Test Bridge

- Added `server/email-webhook-dev.mjs` as a local transactional email bridge simulator.
- Added `npm run email:webhook-dev`.
- The dev bridge exposes `GET /health`, `GET /deliveries`, and `POST /send`.
- `EMAIL_DEV_FORCE_STATUS` can simulate queued, failed, or bounced provider responses.
- Team access now always shows the current email provider status, even before the first delivery record exists.

Next recommended slice: connect the webhook payload to one real provider, then add provider-specific callback signature verification.

## 2026-05-17 - Email Provider Callback Endpoint

- Added `EMAIL_CALLBACK_SECRET` for provider callback protection.
- Added `POST /api/email/callbacks/:provider`.
- Callback payloads can update invite delivery by `providerMessageId` or by `deliveryId`.
- Common provider statuses now map to internal statuses: `queued`, `sent`, `failed`, and `bounced`.
- Callback updates write `invite_email.callback` audit records.

Next recommended slice: implement a provider-specific adapter for the first chosen email service and verify its real callback signature format.

## 2026-05-17 - HMAC Email Callback Verification

- Added `EMAIL_CALLBACK_SIGNATURE_MODE`.
- Bearer mode remains available for local development and simple provider bridges.
- Added `hmac-sha256` mode using `EMAIL_CALLBACK_SECRET` and the raw callback request body.
- Callback requests can send `x-playdrama-signature`, `x-email-signature`, or `x-signature`.

Next recommended slice: adapt the first real provider callback payload and signature header into this HMAC path.

## 2026-05-17 - Email Provider Recommendation Surface

- Added provider rollout recommendations to `GET /api/email/provider`.
- Recommended order is Tencent Cloud SES, Aliyun DirectMail, Resend, then SendGrid.
- Team access now displays the recommended providers beside invite delivery status.
- Handoff docs now tell operators and AI employees to pick one provider first, finish staging delivery and callback verification, then expand.

Next recommended slice: implement the Tencent Cloud SES or Aliyun DirectMail adapter behind the existing webhook bridge.

## 2026-05-17 - Tencent Cloud SES Adapter

- Added `EMAIL_PROVIDER=tencent-ses`.
- Added Tencent Cloud API 3.0 TC3-HMAC-SHA256 signing for `SendEmail`.
- Added Tencent SES readiness details to `GET /api/email/provider`.
- Added env vars for Tencent credentials, region, from address, reply-to, and template ID.
- Invite emails use Tencent templates when `TENCENT_SES_TEMPLATE_ID` is configured and fall back to `Simple.Text` for development verification.

Next recommended slice: run Tencent SES in staging with a verified sender domain and approved template.

## 2026-05-17 - Tencent SES Readiness Checklist

- Added `tencentSes.readiness` and `tencentSes.missing` to `GET /api/email/provider`.
- Readiness now checks SecretId, SecretKey, sender address, template ID, callback secret, and HMAC callback mode.
- Team access displays the first missing Tencent SES setup items so operators can act without reading provider internals.

Next recommended slice: collect real Tencent Cloud SES credentials, verified sender address, and approved template ID, then run one staging invite.

## 2026-05-17 - Tencent SES Dry Run Mode

- Added `TENCENT_SES_DRY_RUN`.
- Dry run mode returns a queued `dryrun_` provider message ID without calling Tencent Cloud.
- Team access now labels Tencent SES dry runs separately from real credential readiness.
- Docs now separate dry-run rehearsal from staging real delivery.

Next recommended slice: use dry run to rehearse the invite flow, then switch it off when real Tencent credentials are available.

## 2026-05-17 - Tencent SES Dry Run Verification

- Added `server/verify-tencent-ses-dry-run.mjs`.
- Added `npm run email:tencent-dry-run:verify`.
- The verifier checks API health, Tencent provider mode, dry-run mode, invite creation, queued delivery status, `dryrun_` provider message ID, and delivery history.

Next recommended slice: add the same black-box verifier for real staging delivery after credentials are available.

## 2026-05-17 - PostgreSQL Verification Script

- Added `server/verify-postgres.mjs`.
- Added `npm run db:verify`.
- The verifier checks database connection, required tables, required indexes, and minimum imported user/workspace data.
- Added `docs/postgres-verification.md` so a database owner can run schema, import JSON, verify, then switch `PLAYDRAMA_STORAGE_DRIVER=postgres`.

Next recommended slice: run schema, import, and verification against a real PostgreSQL/Supabase database URL.

## 2026-05-17 - Database Readiness Surface

- Added `storage.readiness` and `storage.missing` to `/api/health`.
- Frontend sidebar now shows database driver, production readiness, and the first missing migration items.
- Updated PostgreSQL verification docs so non-technical operators can compare API and page status.

Next recommended slice: connect a real PostgreSQL/Supabase `DATABASE_URL` and confirm the page changes from `json` to `postgres`.

## 2026-05-18 - Production Readiness Verifier

- Added `server/verify-production-readiness.mjs`.
- Added `npm run prod:verify`.
- The verifier groups commercial blockers by database, auth, email, AI model, payment, safety, and deployment.
- Expanded `.env.example` with AI provider, content safety, and payment placeholders.
- Added `docs/production-readiness.md` so operators and AI employees can see missing commercial setup without reading cloud-provider internals.

Next recommended slice: fill real credentials in `.env`, then run `npm run prod:verify` until the commercial environment is no longer blocked.

## 2026-05-18 - Readiness Status In Product UI

- Added `commercialReadiness` to `GET /api/health`.
- The API now reports commercial blockers for database, auth, email, AI, content safety, payment, and deployment.
- Added a sidebar `商用体检` card so operators can see missing production setup without opening a terminal.
- Saved a browser verification screenshot at `docs/readiness-ui-20260518.png`.

Next recommended slice: connect the first real external service, preferably PostgreSQL/Supabase, then watch this card move from `待配置` toward `可灰度`.

## 2026-05-18 - Shared Readiness Rules

- Added `server/readiness.mjs` as the single source of truth for commercial readiness checks.
- `npm run prod:verify`, `GET /api/health`, and the new `GET /api/readiness` endpoint now use the same readiness rules.
- The frontend sidebar now reflects the same 12-item checklist as the command-line verifier.

Next recommended slice: use `/api/readiness` in deployment checks and alerting once staging infrastructure exists.

## 2026-05-18 - API Readiness Contract Verifier

- Added `server/verify-api-readiness.mjs`.
- Added `npm run readiness:api`.
- The verifier checks that the running API exposes `/api/health` and `/api/readiness`, that both endpoints agree, and that all 12 readiness items include operator-facing fields.

Next recommended slice: add this command to staging deployment checks once the first cloud environment is available.

## 2026-05-18 - Launch Gate

- Added `server/verify-launch-gate.mjs`.
- Added `npm run launch:gate`.
- The launch gate prints `GO` only when commercial readiness is fully passing; otherwise it prints `NO-GO`, lists blockers, and exits non-zero.
- The gate can check the local environment or a running API when `PLAYDRAMA_API_BASE` is configured.

Next recommended slice: connect real PostgreSQL/Supabase credentials and use this gate as the deployment blocker.

## 2026-05-18 - Launch Readiness Report

- Added `server/generate-launch-report.mjs`.
- Added `npm run launch:report`.
- The report writes `docs/launch-readiness-report.md` and `docs/launch-readiness-report.json`.
- Each readiness item now has an assigned owner label, missing fields, action, and acceptance step for handoff.

Next recommended slice: use the generated report to collect external credentials from database, auth, email, model, payment, safety, and deployment owners.

## 2026-05-18 - Database Migration Report

- Added `server/generate-database-migration-report.mjs`.
- Added `npm run db:report`.
- The report reads the local JSON database, counts source records, maps JSON fields to PostgreSQL tables, and writes `docs/database-migration-report.md` plus `docs/database-migration-report.json`.
- Cloud database migration docs now start with this report so database owners can see the migration size and exact next commands before receiving a real `DATABASE_URL`.

Next recommended slice: get a real PostgreSQL/Supabase `DATABASE_URL`, execute `docs/database-schema.sql`, run `npm run db:import-json`, then run `npm run db:verify`.

## 2026-05-19 - Auth Readiness Hardening

- Added provider-specific auth readiness checks for Supabase, Auth.js, WeChat, and GitHub login.
- Added `AUTH_PROVIDER_ADAPTER_READY` as the final manual signoff after real login, logout, session recovery, invitation acceptance, and audit attribution are verified.
- Updated `/api/auth/providers` so `productionReady` is only true when all auth readiness items pass, not merely when `AUTH_PROVIDER` changes away from `local-demo`.
- Expanded `.env.example`, auth docs, production readiness docs, and launch report ownership for real auth handoff.

Next recommended slice: implement the chosen real auth adapter once service credentials are available.

## 2026-05-19 - AI Readiness Hardening

- Added AI readiness gates for default model name, real provider adapter verification, and cost tracking signoff.
- Expanded `.env.example` with `AI_MODEL_NAME`, `AI_PROVIDER_ADAPTER_READY`, and `AI_COST_TRACKING_READY`.
- Updated `GET /api/ai/providers` to return current provider, model, readiness, missing items, and `productionReady`.
- Updated AI orchestration, backend contract, production readiness, and launch report ownership docs.

Next recommended slice: implement the first real domestic model adapter once an API key is available, starting with DeepSeek or Qwen.

## 2026-05-19 - Tencent SES Live Verification Gate

- Added `server/verify-tencent-ses-live.mjs`.
- Added `npm run email:tencent-live:verify`.
- The live verifier refuses to send unless Tencent SES provider mode, real credentials, sender, approved template, callback secret, HMAC mode, dry-run disabled, and `TENCENT_SES_LIVE_TEST_EMAIL` are configured.
- Updated email, backend, production readiness, and contract docs with the guarded live staging flow.

Next recommended slice: run `npm run email:aliyun-live:verify` after Aliyun DirectMail credentials and a verified internal test inbox are available; keep Tencent SES as the backup path.

## 2026-05-19 - Deployment Preflight

- Frontend API base is now configurable through `VITE_PLAYDRAMA_API_BASE` or `VITE_PLAYDRAMA_API_BASES`.
- Added `netlify.toml` for static frontend deployment with SPA fallback and security headers.
- Added `server/verify-deploy-preflight.mjs`.
- Added `npm run deploy:preflight`.
- Added `docs/deployment-runbook.md` covering Netlify frontend + separate Node API and single-server deployment options.

Next recommended slice: choose the actual hosting target and provide production frontend/API domains before running deploy preflight to `GO`.

## 2026-05-19 - Netlify Technical Preview Deployment

- Refactored `server/index.mjs` so the API request handler can be imported by serverless functions while `npm run api` still starts the local Node server.
- Added `netlify/functions/api.mjs` to route Netlify `/api/*` requests into the existing API handler.
- Updated Netlify function packaging to include `server/**`.
- Fixed serverless packaging issues by avoiding a bundled `__dirname` name collision and making the JSON database path resilient in both local and packaged function contexts.
- Created Netlify project `playdrama-studio-preview`.
- Deployed technical preview to `https://playdrama-studio-preview.netlify.app`.
- Verified homepage returns `200`.
- Configured Netlify `APP_BASE_URL=https://playdrama-studio-preview.netlify.app`.
- Verified `https://playdrama-studio-preview.netlify.app/api/health` returns `200` with `commercialReadiness: blocked`, `passed: 2`, `total: 17`, and `storage: json`.
- Verified deployment preflight returns `NO-GO` at `7/8`, with only the commercial launch gate still failing.

Next recommended slice: configure real PostgreSQL/Supabase and required production environment variables in Netlify before treating this as anything beyond a technical preview.

## 2026-05-19 - Netlify Database Production Branch

- Installed `@netlify/database`.
- Added Netlify Database migrations under `netlify/database/migrations/`.
- Added `20260519000100_create-playdrama-schema` to create the PlayDrama relational schema.
- Added `20260519000200_seed-playdrama-demo` to seed a minimal creator user, workspace, membership, and demo project.
- Updated the API server so `PLAYDRAMA_STORAGE_DRIVER=postgres` can use either `DATABASE_URL` or Netlify Database via `NETLIFY_DATABASE_READY=true`.
- Updated `db:verify` and `db:import-json` to support the same Netlify Database connection path.
- Configured Netlify environment variables `PLAYDRAMA_STORAGE_DRIVER=postgres` and `NETLIFY_DATABASE_READY=true`.
- Deployed `6a0c3c5735175fc7261a7328`; Netlify reported production database branch `production`, both migrations applied, and one function deployed.
- Verified `https://playdrama-studio-preview.netlify.app/api/health` returns `storage.driver=postgres`, `storage.productionReady=true`, and `commercialReadiness: blocked 3/17`.
- Verified `https://playdrama-studio-preview.netlify.app/api/me` returns the seeded `Creator` owner account and workspace.

Next recommended slice: implement real auth provider next so local demo identity no longer controls the hosted Postgres data.

## 2026-05-19 - Netlify Identity Auth Wiring

- Installed `@netlify/identity`.
- Added `AUTH_PROVIDER=netlify-identity` support to backend readiness and provider status.
- Updated Netlify Function adapter to read the current Netlify Identity user and inject trusted identity headers into the internal API handler.
- Updated the API server to map Netlify Identity users into PlayDrama users, personal workspaces, memberships, and audit records.
- Protected hosted API routes so unauthenticated requests return `401` in non-local auth mode.
- Updated the frontend auth panel to use Netlify Identity login/signup/logout when the API reports `netlify-identity`.
- Kept local demo login available for `AUTH_PROVIDER=local-demo`.
- Configured Netlify environment variables `AUTH_PROVIDER=netlify-identity`, `NETLIFY_IDENTITY_READY=true`, and `AUTH_PROVIDER_ADAPTER_READY=false`.
- Deployed `6a0c49f74230ae00a39fca7d`.
- Verified homepage returns `200`.
- Verified unauthenticated `https://playdrama-studio-preview.netlify.app/api/me` returns `401`.
- Verified `/api/readiness` now reports `blocked 6/17`, with auth provider/config/session items passing and only `auth-adapter-verified` still blocked.

Next recommended slice: complete real auth acceptance testing with a real confirmed Identity account, then set `AUTH_PROVIDER_ADAPTER_READY=true` only if login, logout, session recovery, invitation acceptance, and audit attribution all pass.

## 2026-05-19 - May 21 Launch Automation

- Added `server/generate-may21-launch-plan.mjs`.
- Added `npm run launch:may21` to generate `docs/may21-launch-plan.md` and `docs/may21-launch-plan.json`.
- Added `server/verify-commercial-smoke.mjs`.
- Added `npm run commercial:smoke` for hosted HTTPS smoke verification before public commercial launch.
- Verified the hosted preview passes the infrastructure smoke checks but remains `NO-GO` because the full commercial readiness gate is still `blocked 6/17`.
- Updated the handoff index and production readiness guide so tomorrow's operator can run the exact launch checks without reading provider-specific technical fields.

Next recommended slice: finish the user-owned service setup items tomorrow, then rerun `npm run commercial:smoke` and `npm run launch:gate` until both return `GO`.

## 2026-05-19 - GitHub-Inspired Product Surface Polish

- Refined the creator workspace with a dark commercial launch header inspired by GitHub's product-console feel, without copying GitHub branding.
- Added a launch gate console showing database, auth, and readiness signals directly on the main workspace.
- Added a compact production pipeline strip for creation graph, branch testing, and publish package state.
- Improved dark CTA treatment, hover states, responsive behavior, and small-screen wrapping.
- Verified the updated frontend with `npm run lint`, `npm run build`, and local `http://127.0.0.1:5177/` HTTP checks.

Next recommended slice: after external service setup is complete, change the launch gate from `NO-GO` posture to live commercial `GO` verification and deploy the polished surface.

## 2026-05-20 - Premium Workspace Visual Pass

- Upgraded the creator workspace visual system while preserving the existing React state, API calls, buttons, forms, and workflow behavior.
- Refined the dark launch header into a more premium control-console surface with structured stats and no brand-copying.
- Improved sidebar depth, navigation states, cards, form fields, action buttons, status chips, graph cards, and mobile wrapping.
- Rechecked desktop and mobile viewports for horizontal overflow and minimum button target sizes.
- Verified with `npm run lint` and `npm run build`.

Next recommended slice: deploy the polished surface after the remaining commercial service credentials are configured.

## 2026-05-20 - Local Content Safety Gate

- Added persisted `contentSafetyReviews` for local JSON storage and PostgreSQL.
- Added `POST /api/projects/:projectId/content-safety/scan` and `GET /api/projects/:projectId/content-safety/reviews`.
- Added local content safety rules for blocking, review, and notice-level terms.
- Made publish build creation run the content safety gate before writing a build.
- Added build-level `contentSafety` metadata.
- Added the creator UI `Safety Gate` panel and onboarding check item.
- Updated readiness so `CONTENT_SAFETY_PROVIDER=local-rules` plus `CONTENT_SAFETY_POLICY_READY=true` passes the content safety item.
- Verified the current project scans as `passed` and generated a `ready` publish build with `contentSafety.status=passed`.
- Verified with `node --check server/index.mjs`, `npm run lint`, `npm run build`, `npm run readiness:api` against `http://127.0.0.1:8787`, and a browser check on `http://127.0.0.1:5188/`.

Next recommended slice: add the payment order model and a disabled-provider checkout stub so paid ending flows can be tested before real payment credentials arrive.

## 2026-05-20 - Sandbox Paid Ending Orders

- Added persisted `paymentOrders` for local JSON storage and PostgreSQL.
- Added runtime order endpoints under `GET/POST /api/play/:buildId/orders`.
- Added sandbox payment behavior when `PAYMENT_PROVIDER=disabled`: orders are created as `paid` immediately and return unlocked ending node IDs.
- Added amount, currency, monetization, item ID, unlock node IDs, provider, status, and session ID to order records.
- Added paid-ending lock handling in the player, including a sandbox checkout panel and unlocked runtime state.
- Added order creation to the audit filter.
- Verified sandbox order creation against build v4: provider `sandbox`, status `paid`, amount `990`, currency `CNY`, unlock `S04,S09`.
- Verified with `node --check server/index.mjs`, `npm run lint`, `npm run build`, `npm run readiness:api` against `http://127.0.0.1:8787`, and a browser check on `http://127.0.0.1:5188/`.

Next recommended slice: implement provider-specific payment adapters and webhook confirmation once real payment credentials are available.

## 2026-05-20 - Database and Auth Launch Prep

- Added `npm run db:schema` to apply `docs/database-schema.sql` directly to `DATABASE_URL` or Netlify Database.
- Updated JSON-to-Postgres import so `aiUsageEvents`, `contentSafetyReviews`, `paymentOrders`, and build-level `contentSafety` metadata migrate with the rest of the product data.
- Updated the database migration report to include AI cost, content safety, and payment order counts.
- Updated the cloud database migration guide with the new `db:schema` step.
- Added `npm run auth:verify` for external auth provider smoke testing.
- Verified `auth:verify` against a temporary `netlify-identity` API process and temporary JSON database: provider identity headers create/recover sessions, read workspaces, and attribute signup audit records.
- Verified with `node --check` on the new scripts, `npm run lint`, `npm run build`, and `npm run readiness:api` against `http://127.0.0.1:8787`.

Next recommended slice: paste `DATABASE_URL` and run `npm run db:schema`, `npm run db:import-json`, and `npm run db:verify`; then switch the API to `PLAYDRAMA_STORAGE_DRIVER=postgres`.

## 2026-05-20 - Webhook Email Verification

- Added `npm run email:webhook:verify`.
- Added `server/verify-email-webhook.mjs` to validate the generic webhook email provider end to end.
- The verifier checks API health, webhook provider readiness, local owner login, invitation creation, delivery record creation, dev webhook receipt, provider callback handling, and final delivery history status.
- Added `EMAIL_DEV_WEBHOOK_BASE` to `.env.example`.
- Updated `docs/email-provider-plan.md` and `docs/backend-runbook.md` with the webhook verification flow.
- Verified against a temporary API process and temporary dev webhook process: `PASS (11/11)`, with delivery status moving from `queued` to `sent`.
- Verified with `node --check`, `npm run lint`, `npm run build`, and `npm run readiness:api` against `http://127.0.0.1:8787`.

Next recommended slice: once email credentials are available, run `npm run email:aliyun-dry-run:verify`, then `npm run email:aliyun-live:verify` with an explicit internal test inbox.

## 2026-05-20 - Aliyun DirectMail Adapter

- Added `EMAIL_PROVIDER=aliyun-directmail`.
- Added Aliyun DirectMail `SingleSendMail` sending with HMAC-SHA1 request signing.
- Added dry-run mode via `ALIYUN_DM_DRY_RUN=true`, returning queued `dryrun_aliyun_` provider message IDs without external delivery.
- Added `aliyunDirectMail` readiness details to `GET /api/email/provider`.
- Updated commercial readiness so the email provider config item can pass with Aliyun DirectMail or Tencent SES.
- Added `npm run email:aliyun-dry-run:verify` and `npm run email:aliyun-live:verify`.
- Updated the team panel type surface so `aliyunDirectMail.missing` can be displayed when the provider is Aliyun.
- Added Aliyun environment variables to `.env.example`.
- Updated email provider docs, backend runbook, and backend contracts for Aliyun.
- Verified Aliyun dry-run against a temporary API process: `PASS (9/9)`.
- Verified with `node --check`, `npm run lint`, `npm run build`, `npm run readiness:api`, and a browser console check on `http://127.0.0.1:5188/`.

Next recommended slice: paste Aliyun DirectMail credentials, run `npm run email:aliyun-dry-run:verify`, then set `ALIYUN_DM_DRY_RUN=false` with an internal test inbox and run `npm run email:aliyun-live:verify`.

## 2026-05-20 - Aliyun Priority Stack

- Switched the project email-provider recommendation order to Aliyun DirectMail first, Tencent SES second, Resend third, and SendGrid fourth.
- Updated the developer handoff, email provider plan, production readiness checklist, backup manifest, and launch report generators to use Aliyun as the primary commercial email path.
- Updated local `.env.local` non-secret settings to `EMAIL_PROVIDER=aliyun-directmail`, `ALIYUN_DM_DRY_RUN=true`, and `EMAIL_CALLBACK_SIGNATURE_MODE=hmac-sha256`; existing secrets were preserved.
- Tencent SES remains implemented and documented as a backup provider.

Next recommended slice: paste real `ALIYUN_ACCESS_KEY_ID`, `ALIYUN_ACCESS_KEY_SECRET`, and `ALIYUN_DM_ACCOUNT_NAME`, then run `npm run email:aliyun-dry-run:verify` and `npm run email:aliyun-live:verify`.

## 2026-05-20 - Aliyun RDS PostgreSQL Migration

- Configured local `DATABASE_URL` for the Aliyun RDS PostgreSQL public endpoint and switched `PLAYDRAMA_STORAGE_DRIVER=postgres`.
- Applied `docs/database-schema.sql` to the Aliyun RDS `playdrama` database with `npm run db:schema`.
- Imported the local JSON database into PostgreSQL with `npm run db:import-json`.
- Verified PostgreSQL tables, indexes, and seed data with `npm run db:verify`: `PASS (26/26)`.
- Restarted the local API on PostgreSQL storage; `/api/health` reports `storage.driver=postgres` and database production readiness is true.
- Regenerated database migration and launch readiness reports.

Next recommended slice: finish production Auth, then complete Aliyun DirectMail live delivery by adding real AccessKey and sender account configuration.

## 2026-05-20 - Trusted Identity Auth Prep

- Added `AUTH_PROVIDER=trusted-identity` as a production Auth bridge for an upstream login service or gateway.
- Added `AUTH_TRUSTED_IDENTITY_SECRET` validation for `x-playdrama-identity-*` headers, so public clients cannot spoof identity headers without the shared secret.
- Updated Auth readiness to accept `trusted-identity` with `AUTH_TRUSTED_IDENTITY_READY=true` and a configured shared secret.
- Updated the Auth smoke verifier to send the trusted identity secret during `npm run auth:verify`.
- Updated the frontend Auth panel so generic provider-managed Auth does not try local demo login.
- Updated Auth docs and launch planning for the Aliyun-first route.
- Verified a temporary `trusted-identity` API process with `npm run auth:verify`: `PASS (7/7)`.
- Verified with `node --check`, `npm run lint`, `npm run build`, `npm run readiness:api`, and a browser console check on `http://127.0.0.1:5188/`.

Next recommended slice: connect a real upstream login entrypoint, then set `AUTH_PROVIDER=trusted-identity`, `AUTH_TRUSTED_IDENTITY_READY=true`, and run browser-level login/logout/invitation acceptance before setting `AUTH_PROVIDER_ADAPTER_READY=true`.

## 2026-05-20 - Aliyun DirectMail RDS Dry Run

- Restarted the local API on the latest code with PostgreSQL storage and `EMAIL_PROVIDER=aliyun-directmail`.
- Verified Aliyun DirectMail dry-run against the Aliyun RDS-backed API: `PASS (9/9)`.
- Cleaned the `aliyun-dryrun-*` test users, workspaces, memberships, audit entries, and invite deliveries created by the dry-run from PostgreSQL.
- Re-ran `npm run db:verify` after cleanup: `PASS (26/26)`.
- Refreshed API readiness, database migration report, and launch reports.

Next recommended slice: add real Aliyun DirectMail credentials and sender account, then run `npm run email:aliyun-live:verify` with an internal test recipient.

## 2026-05-21 - Aliyun DirectMail Live Verification

- Added real Aliyun DirectMail credentials and sender account configuration in local environment.
- Switched `ALIYUN_DM_DRY_RUN=false` and restarted the local API on PostgreSQL storage.
- Verified `GET /api/email/provider` reports `aliyun-directmail`, configured sender credentials, HMAC callback mode, and live mode.
- Ran `npm run email:aliyun-live:verify`: `PASS (15/15)`.
- Aliyun returned a real provider message ID for the workspace invitation email.
- Refreshed API readiness and launch reports; commercial readiness advanced to `10/17`.
- Re-ran `npm run db:verify`: `PASS (26/26)`.

Next recommended slice: complete production Auth signoff or payment provider sandbox verification.

## 2026-05-21 - Payment Sandbox Verification Gate

- Added `npm run payment:sandbox:verify`.
- Added `server/verify-payment-sandbox.mjs` to verify paid-ending sandbox checkout, immediate paid status, unlock payload, order history, and audit trail.
- Added explicit `PAYMENT_PROVIDER=sandbox`, `PAYMENT_SANDBOX_READY`, and `PAYMENT_SANDBOX_VERIFIED` readiness support.
- Updated payment provider docs, backend contracts, production readiness, and launch reports for sandbox-first payment verification.
- Added shared `server/load-env.mjs` so database, readiness, Auth, email, payment, and launch verification scripts load `.env.local` automatically.
- Aligned `npm run readiness:api` and legacy Tencent SES verifiers with the local API default `http://127.0.0.1:8787`.
- Verified payment sandbox against the RDS-backed API: `PASS (15/15)`.
- Marked local payment sandbox ready and verified, raising commercial readiness to `12/17`.
- Removed generated `payment-sandbox-*` test orders and audit entries from PostgreSQL, then re-ran `npm run db:verify`: `PASS (26/26)`.
- Verified with `node --check`, `npm run lint`, `npm run build`, and `npm run readiness:api`.

Next recommended slice: finish production Auth signoff, then bind public HTTPS domain/deployment.

## 2026-05-21 - Email Code Auth

- Added `AUTH_PROVIDER=email-code` as a built-in production Auth route using email verification codes and PostgreSQL-backed bearer sessions.
- Added `auth_email_codes` and `auth_sessions` tables to `docs/database-schema.sql`.
- Stored email verification codes and session tokens as HMAC hashes only; raw codes and bearer tokens are never persisted.
- Added `POST /api/auth/email-code/request` and `POST /api/auth/email-code/verify`.
- Reused the existing email adapter layer, so Aliyun DirectMail can send login codes through the same configured sender.
- Updated the frontend Auth panel with email-code request, verify, logout, and token persistence.
- Updated Auth readiness so `AUTH_PROVIDER=email-code`, `AUTH_EMAIL_CODE_READY=true`, and a production `AUTH_SESSION_SECRET` satisfy the provider/config/session items.
- Set local environment to `AUTH_PROVIDER=email-code`, generated a production session secret, and kept `AUTH_PROVIDER_ADAPTER_READY=false` until a real inbox login is completed.
- Applied the new schema to Aliyun RDS and verified PostgreSQL: `PASS (30/30)`.
- Verified the email-code Auth flow against a temporary local API with dev code reveal: `PASS (12/12)`.
- Restarted the main API on email-code Auth; unauthenticated `/api/me` now returns `401`.
- Refreshed API readiness: `blocked (15/17)`.
- Verified with `node --check`, `npm run lint`, `npm run build`, `npm run db:verify`, and `npm run readiness:api`.

Next recommended slice: complete one real browser login with an inbox verification code, then set `AUTH_PROVIDER_ADAPTER_READY=true`; after that, bind the public HTTPS domain.

## 2026-05-21 - Tencent Cloud SMS Auth Adapter

- Added `SMS_PROVIDER=tencent-sms` with Tencent Cloud SMS `SendSms` TC3-HMAC-SHA256 signing.
- Added `AUTH_PROVIDER=sms-code` as a phone-number login route using SMS verification codes and PostgreSQL-backed bearer sessions.
- Added `auth_sms_codes` and the `app_users.phone` column/index to the PostgreSQL schema.
- Added `POST /api/auth/sms-code/request`, `POST /api/auth/sms-code/verify`, and `GET /api/sms/provider`.
- Normalized phone numbers to E.164 format; China mainland 11-digit mobile numbers are sent as `+86...`.
- Stored SMS codes and session tokens as HMAC hashes only.
- Updated the frontend Auth panel so `sms-code` mode shows phone input, code input, send-code, verify, and logout controls.
- Added `npm run sms:tencent-dry-run:verify` and extended `npm run auth:verify` to cover `sms-code`.
- Applied the schema to Aliyun RDS and verified PostgreSQL: `PASS (33/33)`.
- Verified the `sms-code` Auth flow against a temporary local API with Tencent SMS dry-run and dev code reveal: `PASS (12/12)`.
- Restarted the main API; current production Auth remains `email-code`, with Tencent SMS configured in dry-run until real SMS credentials/sign/template are filled.

Next recommended slice: fill Tencent Cloud SMS app/sign/template credentials, turn off `TENCENT_SMS_DRY_RUN`, then switch `AUTH_PROVIDER=sms-code` only after a real phone receives and verifies a code.

## 2026-05-21 - Netlify Preview Launch Gate

- Deployed the current app to the Netlify preview URL `https://playdrama-studio-preview.netlify.app`.
- Switched the preview environment to `AUTH_PROVIDER=sms-code`, `SMS_PROVIDER=tencent-sms`, `EMAIL_PROVIDER=aliyun-directmail`, `AI_PROVIDER=qwen`, `PAYMENT_PROVIDER=sandbox`, and `CONTENT_SAFETY_PROVIDER=local-rules`.
- Added `PLAYDRAMA_DATABASE_URL` as a project-specific Postgres connection variable so Netlify preview can explicitly use Aliyun RDS instead of Netlify Database.
- Updated production readiness to accept `PLAYDRAMA_DATABASE_URL` alongside `DATABASE_URL` and Netlify Database.
- Added one-process cloud-server deployment support: the Node API can serve built `dist/` assets while keeping `/api/*` routed to the API handler.
- Added `Dockerfile`, `.dockerignore`, `.netlifyignore`, and `deploy/` environment/runbook templates for cloud-server deployment.
- Imported Netlify production secrets through the Netlify CLI and removed the temporary local import file after use.
- Verified preview readiness: `GET /api/health` reports `sms-code`, Tencent SMS, Postgres storage, and `pass (17/17)`.
- Verified launch checks against the preview URL: `npm run deploy:preflight` `PASS (8/8)`, `npm run launch:gate` `Decision: GO`, and `npm run commercial:smoke` `PASS (13/13)`.
- Confirmed the deployed frontend asset does not contain localhost or `127.0.0.1` API URLs.

Next recommended slice: perform one real browser smoke test on the preview URL, then replace the Netlify subdomain with the final custom domain when the domain is purchased.

## 2026-05-26 - Production Gate Script Alignment

- Rechecked the current handoff state and confirmed production is now served from `https://playdrama.tokenaicloud.com`.
- Ran production commercial smoke against the Aliyun domain: `PASS (13/13)`, readiness `pass (17/17)`, decision `GO`.
- Updated `server/verify-launch-gate.mjs` so a remote `PLAYDRAMA_API_BASE` readiness check is authoritative by default; local environment matching can still be enforced with `PLAYDRAMA_REQUIRE_LOCAL_ENV_MATCH=true`.
- Updated `server/verify-deploy-preflight.mjs` so `PLAYDRAMA_DEPLOY_TARGET=aliyun` validates cloud-server deployment files instead of requiring the Netlify static config.
- Verified `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run launch:gate`, `npm.cmd run deploy:preflight`, and `npm.cmd run commercial:smoke`.

Next recommended slice: run the human real-business smoke on production: real SMS login, create/edit/publish a work, trigger Qwen generation, run content safety, open player preview, and verify one tiny Alipay sandbox/payment callback unlock.
