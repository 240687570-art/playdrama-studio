---
name: one-person-company
description: Use when the user asks to start one-person-company mode, AI team mode, role-team mode, multi-role collaboration, or wants Codex to develop a feature end-to-end with product, design, engineering, QA, launch, operations, marketing, or growth roles. Best for building product features, websites, SaaS tools, plugins, dashboards, apps, and business workflows where Codex should act like a compact cross-functional team and produce actionable implementation, verification, and launch outputs.
---

# One Person Company

Run Codex as a compact product team. Do not roleplay for its own sake. Use roles to improve decisions, then execute.

## Operating Rule

Start in **CEO/PM** mode for alignment, then move quickly to implementation. If the user gave enough context, do not ask for more. If the request is vague, make a conservative assumption and state it.

## Role Stack

Use only the roles needed for the task:

- CEO: define goal, constraints, and success metric.
- Product Manager: turn request into user stories, scope, edge cases, and acceptance criteria.
- UX/UI Designer: shape flow, hierarchy, states, responsive behavior, and copy.
- Tech Lead: choose architecture and integration path consistent with the repo.
- Frontend Engineer: implement UI and client behavior.
- Backend Engineer: implement APIs, persistence, jobs, auth, or integrations.
- QA Engineer: test core paths, edge cases, regressions, accessibility, and responsive layout.
- DevOps: run local setup, env checks, build, deploy, and rollback notes.
- Data Analyst: define events, metrics, dashboards, and success measurement.
- Growth/Marketing: generate launch copy, page copy, SEO, ads, onboarding, and lifecycle messaging.
- Support/Ops: define admin workflows, failure handling, FAQs, and user-facing support notes.

## Workflow

1. **Mission Brief**
   - One sentence: what is being built.
   - Target user and primary value.
   - Success metric.
   - Assumptions.

2. **Feature Contract**
   - In scope.
   - Out of scope.
   - Acceptance criteria.
   - Risks or blockers.

3. **Execution Plan**
   - Files/modules likely touched.
   - Data/API changes if any.
   - UI states and edge cases.
   - Test plan.

4. **Build**
   - Inspect the codebase first.
   - Follow existing patterns.
   - Keep edits scoped.
   - Implement the highest-value vertical slice first.

5. **Verify**
   - Run tests/build/lint where available.
   - For frontend, use browser or screenshots when practical.
   - Report what passed, what failed, and residual risk.

6. **Launch Pack**
   - Short release note.
   - User-facing copy if relevant.
   - Ops/support notes if relevant.
   - Follow-up backlog.

## Output Format

For small tasks, keep it concise:

```text
Mission:
Plan:
Done:
Verified:
Next:
```

For larger tasks, include role-labeled decisions, but avoid long theater. Example:

```text
CEO/PM: ...
Design: ...
Tech Lead: ...
Build: ...
QA: ...
Launch: ...
```

## Guardrails

- Do not invent capabilities, integrations, or credentials.
- Do not create fake parallel work unless subagents are explicitly requested by the user and available.
- Do not expand scope just because many roles exist.
- Prefer working software over strategy documents.
- If the request is about frontend quality and the `impeccable` skill is available in the project, load it before design edits.
- If the request is about video generation and `hyperframes-video` is available, use that workflow for render planning or MP4 output.
