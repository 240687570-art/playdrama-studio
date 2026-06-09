# Technical Architecture

## System Layers

```text
Creator Studio
Story Engine
Asset Engine
AI Orchestrator
Runtime Player
Analytics and Monetization
```

## Suggested Stack

Current prototype:

- Vite
- React
- TypeScript
- lucide-react

Production direction:

- Web app: Next.js, React Flow, shadcn/ui
- API: FastAPI or NestJS
- Database: PostgreSQL
- Queue: Redis
- Object storage: Cloudflare R2 or S3
- Analytics: event pipeline + warehouse-ready schema
- Deployment: Vercel or Cloudflare Pages for web, managed backend for API workers

## Domain Entities

```text
User
Workspace
Project
Episode
Character
Scene
StoryNode
Choice
Variable
Condition
Asset
InteractionComponent
PublishBuild
AnalyticsEvent
PaymentOrder
Template
```

## Story Engine Concept

A story is a graph of nodes. Nodes can update variables, require conditions, and route to other nodes.

Example:

```json
{
  "nodeId": "S03",
  "type": "puzzle",
  "requiredVariables": ["clue.medical_record"],
  "onSuccess": "S04",
  "onFail": "S03_ALARM"
}
```

## AI Orchestrator

The AI layer should be model-agnostic.

Capabilities:

- Script generation
- Branch expansion
- Character dialogue
- Shot planning
- Cover prompt generation
- Image generation
- Video generation
- Voice generation
- Music and sound effects

The orchestrator stores prompts, outputs, seed settings, and user edits so the product can improve consistency over time.

See also:

- `docs/backend-contracts.md`
- `docs/ai-orchestrator-contract.md`
- `docs/MODEL_PROVIDER_STRATEGY.md`
