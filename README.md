# PlayDrama Studio

AI interactive drama game studio. The first MVP is a suspense interactive short drama creator with story graph editing, character consistency, H5 preview, and monetization planning.

## First Read For Handoff

Start with [Handoff](docs/HANDOFF.md). It explains the project in non-technical terms and points each role to the right next document.

## Current Prototype

The repo currently contains a Vite React prototype for the creator workspace and a first local API service:

- Project overview
- Editable story node list
- Character consistency panel
- Mobile player preview
- Publishing and analytics placeholders
- Node search, selection, creation, choice editing, and save status
- Local API for projects, publish builds, runtime events, analytics, and AI provider stubs
- Local demo login/logout scaffold for account and workspace testing

## Run Locally

Frontend:

```bash
npm install
npm run dev
```

Backend API:

```bash
npm run api
```

Local email webhook test bridge:

```bash
npm run email:webhook-dev
```

To test webhook email delivery locally, start the API with:

```bash
EMAIL_PROVIDER=webhook EMAIL_WEBHOOK_URL=http://127.0.0.1:8790/send npm run api
```

Verify Tencent SES dry-run invite flow:

```bash
npm run email:tencent-dry-run:verify
```

Verify Tencent SES live staging delivery after real credentials are configured:

```bash
npm run email:tencent-live:verify
```

Import the local JSON database into PostgreSQL / Supabase after running the schema:

```bash
npm run db:report
npm run db:import-json
npm run db:verify
```

Check whether an environment is ready for commercial rollout:

```bash
npm run prod:verify
```

Verify the running API exposes a stable readiness contract:

```bash
npm run readiness:api
```

Block a commercial launch when required production setup is missing:

```bash
npm run launch:gate
```

Run deployment preflight before publishing frontend or API:

```bash
npm run deploy:preflight
```

Generate a handoff report for owners, missing fields, and acceptance steps:

```bash
npm run launch:report
```

Environment template:

```text
.env.example
```

Default local URLs:

```text
Frontend: http://127.0.0.1:5177
Preview:  http://127.0.0.1:5177/?preview=1
API:      http://127.0.0.1:8787
```

If port `8787` is already occupied on Windows PowerShell:

```powershell
$env:PORT = "8788"
npm run api
```

## Docs

- [Handoff](docs/HANDOFF.md)
- [Operations Runbook](docs/OPERATIONS_RUNBOOK.md)
- [Developer Handoff](docs/DEVELOPER_HANDOFF.md)
- [AI Employee Brief](docs/AI_EMPLOYEE_BRIEF.md)
- [Next Steps](docs/NEXT_STEPS.md)
- [Backup Manifest](docs/BACKUP_MANIFEST.md)
- [Backend Runbook](docs/backend-runbook.md)
- [Auth Provider Plan](docs/auth-provider-plan.md)
- [Email Provider Plan](docs/email-provider-plan.md)
- [Cloud Database Migration](docs/cloud-database-migration.md)
- [Production Readiness](docs/production-readiness.md)
- [Deployment Runbook](docs/deployment-runbook.md)
- [Database Schema](docs/database-schema.sql)
- [Model Provider Strategy](docs/MODEL_PROVIDER_STRATEGY.md)
- [PRD](docs/PRD.md)
- [Roadmap](docs/roadmap.md)
- [Architecture](docs/architecture.md)
- [Backend Contracts](docs/backend-contracts.md)
- [AI Orchestrator Contract](docs/ai-orchestrator-contract.md)
- [Competitor Analysis](docs/competitor-analysis.md)
- [Implementation Log](docs/implementation-log.md)
- [AI Team Operating System](docs/ai-team-operating-system.md)
- [Commercial Operations Plan](docs/commercial-operations-plan.md)
- [AI Team Backlog](docs/ai-team-backlog.md)
- [Creator Operations Playbook](docs/creator-operations-playbook.md)

## Product Direction

Core loop:

```text
Idea -> AI story -> story graph -> interaction components -> H5 publish -> analytics -> monetization
```
