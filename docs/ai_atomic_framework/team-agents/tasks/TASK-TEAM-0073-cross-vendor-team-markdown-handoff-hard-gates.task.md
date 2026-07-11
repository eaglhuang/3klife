---
doc_id: doc_team_0073
task_id: TASK-TEAM-0073
title: "Cross-vendor Team Markdown Handoff hard gates and bounded context"
status: done
owner: atm-core
priority: P0
milestone: "Cross-Vendor Team Markdown Handoff"
depends_on:
  - "TASK-TEAM-0072"
related_plan: "docs/ai_atomic_framework/team-agents/CROSS-VENDOR-TEAM-MARKDOWN-HANDOFF-PLAN-2026-07-11.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "packages/core/src/team-runtime/permission-broker.ts"
  - "packages/core/src/team-runtime/observability.ts"
  - "packages/core/src/team-runtime/providers/openai.ts"
  - "packages/core/src/team-runtime/providers/anthropic.ts"
  - "packages/core/src/team-runtime/providers/gemini-direct.ts"
  - "scripts/validate-team-agents.ts"
  - "docs/governance/team-agents/team-vendor-runtime.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "packages/core/src/team-runtime/permission-broker.ts"
  - "packages/core/src/team-runtime/observability.ts"
  - "packages/core/src/team-runtime/providers/openai.ts"
  - "packages/core/src/team-runtime/providers/anthropic.ts"
  - "packages/core/src/team-runtime/providers/gemini-direct.ts"
  - "scripts/validate-team-agents.ts"
  - "docs/governance/team-agents/team-vendor-runtime.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-team-agents.ts --case team-handoff-context-budget"
  - "node --strip-types scripts/validate-team-agents.ts --case team-handoff-integrity"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert handoff permission catalog, context builder, provider wiring, and observability additions together."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
proposalAdmission:
  trigger: "hot-file"
  summarySubmitted: false
  hotFiles:
    - "packages/cli/src/commands/team.ts"
outOfScope:
  - "Granting provider bridges direct history read/write authority"
  - "Injecting Markdown files directly into provider prompts"
  - "Logging raw prompts, credentials, or full provider responses"
completed_at: "2026-07-11T16:02:00.816Z"
completed_by_agent: "Codex-GPT5.6 Terra"
closedAt: "2026-07-11T16:02:00.816Z"
closedByActor: "Codex-GPT5.6 Terra"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-11T16-02-00-816Z-close-3c9ebeb3b573"
lastTransitionAt: "2026-07-11T16:02:00.816Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "0b3ea90efce71fb0acdf4774459f137ae7fa3ff4"
---
# TASK-TEAM-0073 Cross-vendor Team Markdown Handoff hard gates and bounded context

## Goal

Add fail-closed handoff permissions and the Coordinator-mediated context builder
that consumes only verified, redacted JSON under a single token-budget contract.

## Acceptance Criteria

- `handoff.materialize` is exclusive Coordinator/system-only; `handoff.read`
  is scope-required and consumed through the Coordinator context service.
- `team handoff show`, `context`, and `stats` expose governed audit, provider,
  and diagnostic surfaces without adding a timeline command.
- Context validates permission, task/run ownership, manifest/hash chain, and a
  final secret scan before role-specific injection.
- The maximum is four artifacts, 256 tokens each, and 1,024 total tokens, with
  actual or explicitly-estimated token telemetry.
- Same-task terminal-run continuation is explicit and observable; all other
  cross-run/task reads fail closed.
