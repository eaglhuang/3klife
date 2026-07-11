---
doc_id: doc_team_0072
task_id: TASK-TEAM-0072
title: "Cross-vendor Team Markdown Handoff runtime ledger and archive promotion"
status: done
owner: atm-core
priority: P0
milestone: "Cross-Vendor Team Markdown Handoff"
depends_on:
  - "TASK-TEAM-0071"
related_plan: "docs/ai_atomic_framework/team-agents/CROSS-VENDOR-TEAM-MARKDOWN-HANDOFF-PLAN-2026-07-11.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/taskflow/commit-bundle-assembly.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/core/src/team-runtime/observability.ts"
  - "packages/core/src/team-runtime/provider-contract.ts"
  - "packages/core/src/governance/scope-lock.ts"
  - "scripts/validate-team-agents.ts"
  - "docs/governance/team-agents/team-vendor-runtime.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/taskflow/commit-bundle-assembly.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/core/src/team-runtime/observability.ts"
  - "packages/core/src/team-runtime/provider-contract.ts"
  - "packages/core/src/governance/scope-lock.ts"
  - "scripts/validate-team-agents.ts"
  - "docs/governance/team-agents/team-vendor-runtime.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-team-agents.ts --case team-handoff-materialize"
  - "node --strip-types scripts/validate-team-agents.ts --case team-handoff-integrity"
  - "node --strip-types scripts/validate-team-agents.ts --case team-handoff-aborted-promotion"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the runtime handoff schema, materializer, archive lane, and bundle classification together."
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
  - "Persisting adopter runtime history in the AI-Atomic-Framework repository"
  - "Allowing provider bridges to write handoff JSON or Markdown directly"
  - "Storing full provider output or raw secrets"
completed_at: "2026-07-11T15:53:06.953Z"
completed_by_agent: "Codex-GPT5.6 Terra"
closedAt: "2026-07-11T15:53:06.953Z"
closedByActor: "Codex-GPT5.6 Terra"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-11T15-53-06-953Z-close-6282b7e5d7cf"
lastTransitionAt: "2026-07-11T15:53:06.953Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "16215e90c349b119b379a481dab65c077bd51b71"
---
# TASK-TEAM-0072 Cross-vendor Team Markdown Handoff runtime ledger and archive promotion

## Goal

Create the target-repository runtime handoff ledger, deterministic narrative
projection, hash-chain manifest, retention guard, and governed archive/promotion
lanes described by the M11H plan.

## Acceptance Criteria

- Successful role transitions materialize canonical runtime JSON, manifest, and
  deterministic Markdown under `.atm/runtime/handoff/<task>/<run>/`.
- JSON is the source of truth; Markdown is a whitelist-only projection and is
  reproducible from the manifest chain.
- Lease-epoch fencing rejects stale materializers, and hash/sequence tampering
  is observable as `handoff-integrity-blocked`.
- Soft/hard retention thresholds report the correct warning/escalation state.
- Successful close promotes same-task handoff artifacts through the closure
  bundle without residue; abandoned and failed runs use archive-only promotion
  without closing the task.
