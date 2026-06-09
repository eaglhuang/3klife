---
doc_id: doc_team_0022
task_id: TASK-TEAM-0022
title: "Captain knowledge preflight brief integration"
status: planned
owner: atm-core
priority: P1
milestone: M6K
depends_on:
  - "TASK-TEAM-0015"
  - "TASK-TEAM-0021"
related_plan: "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/team-knowledge.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "scripts/validate-prompt-scoped-next.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/team-knowledge.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "scripts/validate-prompt-scoped-next.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-prompt-scoped-next.ts"
  - "node --strip-types scripts/validate-team-agents.ts"
  - "node atm.mjs next --json"
  - "node atm.mjs team plan --task TASK-AAO-0005 --json"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert knowledge-summary guidance from next/team plan surfaces and atom map updates."
atomizationImpact:
  ownerAtomOrMap: "atm.next-guidance-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "Knowledge preflight guidance extends next/team guidance and should map with the same discoverability owner."
outOfScope:
  - "Auto-running query for every agent"
  - "Hard-blocking claim or close because of a knowledge hit"
  - "Vector rerank"
nonGoals:
  - "Do not replace teamRecommendation or channel playbook"
  - "Do not turn knowledge hits into required evidence"
dispatch_pattern:
  shape: "dual-agent (Phase 0 guidance planner + Phase 1 builder)"
  rationale: "The read-only sidecar should first define what a compact captain-facing brief looks like; Phase 1 then integrates only the compact fields into next / team plan."
  phase_0:
    lane: "helper (read-only sidecar)"
    allowed_files:
      - "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
      - "docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0022-*.task.md"
    commit_budget: 0
    output: "Phase 1 brief defining knowledgeSummary / knowledgeHints shape, top-hit cap, and advisory wording."
  phase_1:
    lane: "external builder 001-006"
    allowed_files_strict: true
    forbidden_files:
      - "C:/Users/User/3KLife/**"
      - ".atm/runtime/**"
      - ".atm/history/**"
    commit_budget: 2
    commit_layout:
      - "commit_1: next/team guidance integration"
      - "commit_2: validator/map + close evidence"
  condition_review:
    - "Output remains compact and does not bury required commands"
    - "Knowledge is clearly labeled advisory-only"
    - "Implementer-facing output receives summary, not corpus dump"
---
# TASK-TEAM-0022 — Captain knowledge preflight brief integration

## Goal

Surface compact knowledge hits to Captain-facing guidance before work starts.

## Why

Once build/query exists, the main productivity gain comes from putting the right lesson in the right brief at the right time. Captain should see relevant pitfalls without manually running multiple commands and without flooding every agent with the full corpus.

## Implementation Contract

- Add optional `knowledgeSummary` / `knowledgeHints` style guidance to `next` and/or `team plan`.
- Keep the result compact: top 3 by default, short rationale, and a command to expand if more detail is needed.
- Limit the audience to Captain / Planner / Knowledge Scout style flows. Implementers should receive summarized hits through team briefing, not direct full-corpus output.

## Deliverables

- `packages/cli/src/commands/next.ts`
- `packages/cli/src/commands/team.ts`
- `packages/cli/src/commands/team-knowledge.ts`
- `packages/cli/src/commands/command-specs/team.spec.ts`
- `scripts/validate-prompt-scoped-next.ts`
- `scripts/validate-team-agents.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-prompt-scoped-next.ts`
- `node --strip-types scripts/validate-team-agents.ts`
- `node atm.mjs next --json`
- `node atm.mjs team plan --task TASK-AAO-0005 --json`
- `git diff --check`

## Acceptance Criteria

- `next` and/or `team plan` can include compact knowledge guidance when relevant shards exist.
- The guidance includes top hits, a short reason, and an optional follow-up command to inspect more.
- The output is explicitly advisory-only.
- Existing routes remain valid when no knowledge shards exist.
- The implementation does not require all agents to query the corpus on every run.

## Rollback

Revert next/team guidance integration and atom map updates.

## Atomization Impact

- Owner atom/map: `atm.next-guidance-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

This card is where the knowledge layer becomes genuinely useful to humans and sidecars, but still stays out of the formal gate path.
