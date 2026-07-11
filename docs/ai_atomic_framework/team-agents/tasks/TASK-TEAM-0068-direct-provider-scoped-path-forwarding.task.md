---
doc_id: doc_team_0068
task_id: TASK-TEAM-0068
title: "Forward governed task scope to direct provider bridges"
status: done
owner: atm-core
priority: P0
milestone: M10X
depends_on:
  - "TASK-TEAM-0067"
related_plan: "docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0066-paid-multi-vendor-live-dogfood.task.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "scripts/validate-team-agents.ts"
deliverables:
  - "packages/cli/src/commands/team.ts"
  - "scripts/validate-team-agents.ts"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-team-agents.ts --case direct-provider-scoped-path-forwarding"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert scoped path forwarding and its deterministic bridge regression together."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates: []
outOfScope:
  - "Changing permission broker policy"
  - "Changing provider HTTP request formats"
  - "Committing local API credentials"
---
# TASK-TEAM-0068 Forward governed task scope to direct provider bridges

## Trigger

Paid `TASK-TEAM-0066` dogfood reached concrete OpenAI and Anthropic bridges,
but every role was denied because `runDirectTeamProviderRole` passed an empty
`scopedPaths` array. A direct Anthropic probe succeeded with HTTP 200, while
the bridge launch reported `Permission denied by governed broker policy or
missing scoped paths.`

## Acceptance Criteria

- Team direct-provider execution forwards the task's normalized allowed files
  to concrete bridge permission checks and request metadata.
- The permission broker policy remains unchanged and continues to reject an
  actually empty scope.
- A deterministic injected-executor regression proves non-empty scoped paths
  admit OpenAI and Anthropic bridge execution without paid calls.
