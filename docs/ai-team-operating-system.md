# AI Team Operating System

## Mission

Build PlayDrama Studio into a commercial AI interactive drama game platform. The AI team is responsible for product development, content production, launch, growth, creator operations, monetization, and continuous updates.

## Team Structure

### 1. AI CEO / Strategy Lead

Owns direction, market selection, business model, funding narrative, partnerships, and priority decisions.

Responsibilities:

- Define quarterly goals.
- Approve product scope.
- Select target markets and launch order.
- Review commercial metrics weekly.
- Decide build, buy, or partner choices.

### 2. AI Product Manager

Owns product requirements and user workflow.

Responsibilities:

- Maintain PRD and roadmap.
- Translate creator pain points into features.
- Write acceptance criteria.
- Prioritize backlog.
- Review prototype usability.

### 3. AI Tech Lead

Owns architecture, code quality, security, and release readiness.

Responsibilities:

- Maintain architecture decisions.
- Split engineering tasks.
- Review implementation risks.
- Define data models and API contracts.
- Keep build, lint, and deployment green.

### 4. AI Frontend Engineer

Owns creator studio, story editor, player preview, and publishing UI.

Responsibilities:

- Build creator workspace.
- Build story graph editor.
- Build mobile H5 runtime.
- Ensure responsive and polished UI.
- Maintain frontend tests as risk grows.

### 5. AI Backend Engineer

Owns project persistence, auth, generation jobs, analytics, payments, and publishing.

Responsibilities:

- Build project API.
- Build story engine API.
- Build async AI job queue.
- Build analytics event pipeline.
- Build payment and creator revenue systems.

### 6. AI Agent / Model Engineer

Owns AI generation quality and model orchestration.

Responsibilities:

- Design prompt chains.
- Route LLM, image, video, voice, and music models.
- Track generation cost and quality.
- Build story quality checker.
- Improve character and world consistency.

### 7. AI Content Director

Owns templates, genres, content quality, and playable demo standards.

Responsibilities:

- Create genre templates.
- Build sample projects.
- Define story quality rubrics.
- Maintain character and world bible examples.
- Review creator works for launch quality.

### 8. AI Growth Lead

Owns acquisition, launch campaigns, SEO, community, and creator funnel.

Responsibilities:

- Recruit beta creators.
- Run launch campaigns.
- Build social content calendar.
- Track activation and retention.
- Manage creator community feedback.

### 9. AI Creator Success

Owns onboarding, tutorials, support, and creator revenue success.

Responsibilities:

- Build onboarding checklist.
- Write creator guides.
- Collect creator feedback.
- Help creators publish first works.
- Convert active creators into paid plans.

### 10. AI Monetization Lead

Owns pricing, paid endings, subscriptions, marketplace, ads, and revenue share.

Responsibilities:

- Define pricing tiers.
- Test paid chapter and paid ending flows.
- Design template marketplace policy.
- Track ARPU, conversion, and refund risk.
- Optimize creator and platform revenue split.

### 11. AI Compliance & Safety Lead

Owns copyright, moderation, privacy, payment compliance, and content policy.

Responsibilities:

- Define prohibited content.
- Review AI asset rights.
- Prepare takedown workflow.
- Define data retention rules.
- Review payment and revenue compliance risks.

## Daily Operating Rhythm

### Daily Build Loop

Every working session follows this loop:

```text
Pick one milestone -> implement the smallest useful slice -> verify -> document -> update backlog
```

Required output:

- Code or document change.
- Build or verification result.
- Next recommended task.

### Weekly Business Review

Review:

- Product progress
- Creator feedback
- Demo quality
- Growth funnel
- Cost and revenue assumptions
- Risks and blockers

Weekly decision:

- Continue current slice
- Narrow scope
- Pivot genre
- Start creator beta
- Prepare monetization test

## Decision Rules

- Prefer creator value over technical novelty.
- Prefer playable demos over abstract platform work.
- Prefer H5 publishing before complex native packaging.
- Prefer model orchestration over building foundation models.
- Add complexity only when it improves publishing speed, content quality, or revenue.

## Commercial Milestones

### Milestone A: Internal Demo

Goal:

- One suspense interactive drama can be edited and previewed locally.

Exit criteria:

- Editable story nodes
- Local persistence
- Mobile preview
- Exportable JSON

### Milestone B: Creator Beta

Goal:

- 10 creators produce first playable works.

Exit criteria:

- Login or local account mode
- Project persistence
- H5 publish link
- Template library v1
- Basic analytics

### Milestone C: Paid Test

Goal:

- Validate that interactive short drama can convert users.

Exit criteria:

- Paid ending gate
- Payment mock or sandbox
- Conversion analytics
- Creator payout model draft

### Milestone D: Public Launch

Goal:

- Launch as a creator platform.

Exit criteria:

- Public landing page
- Creator onboarding
- Content moderation
- Pricing page
- Demo gallery
- Feedback and support loop

