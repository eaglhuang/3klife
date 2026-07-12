---
doc_id: doc_team_0075
task_id: TASK-TEAM-0075
title: "Handoff hard-gate parity and integrity regression"
status: done
owner: atm-core
priority: P0
milestone: "Cross-Vendor Team Markdown Handoff"
depends_on:
  - "TASK-TEAM-0074"
related_plan: "docs/ai_atomic_framework/team-agents/CROSS-VENDOR-TEAM-MARKDOWN-HANDOFF-PLAN-2026-07-11.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "packages/core/src/team-runtime/handoff-ledger.ts"
  - "packages/core/src/team-runtime/observability.ts"
  - "scripts/validate-team-agents.ts"
  - "docs/governance/team-agents/cross-vendor-handoff-ledger.md"
  - "docs/governance/permission-hard-gate-matrix.md"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/team.ts"
  - "packages/core/src/team-runtime/handoff-ledger.ts"
  - "packages/core/src/team-runtime/observability.ts"
  - "scripts/validate-team-agents.ts"
  - "docs/governance/team-agents/cross-vendor-handoff-ledger.md"
  - "docs/governance/permission-hard-gate-matrix.md"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-team-agents.ts --case team-handoff-integrity"
  - "node --strip-types scripts/validate-team-agents.ts --case team-handoff-hard-gate"
  - "node --strip-types scripts/validate-team-agents.ts --case team-handoff-continuation"
  - "node --strip-types scripts/validate-team-agents.ts --case team-handoff-retention-escalation"
  - "npm run validate:team-agents"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the permission, continuation, integrity, retention, documentation, and regression changes together; preserve existing archived handoff history."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Live paid API calls in CI"
  - "Bypassing the Broker or task lease through an emergency flag"
completed_at: "2026-07-12T05:04:04.149Z"
completed_by_agent: "Codex-GPT5.6 Terra"
closedAt: "2026-07-12T05:04:04.149Z"
closedByActor: "Codex-GPT5.6 Terra"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-12T05-04-04-149Z-close-7865783be286"
lastTransitionAt: "2026-07-12T05:04:04.149Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "57d79fcfa354f4aac1243f0eec9f3911e16de885"
---

# TASK-TEAM-0075 Handoff hard-gate parity and integrity regression

## Goal

Close the post-0074 audit gaps so cross-vendor handoff JSON is genuinely
permission-governed, continuation-safe, tamper-regressed, and retention-aware.

## Acceptance Criteria

- `handoff.read` and `handoff.materialize` are catalogued hard-gated
  permissions; a plain actor-name spoof cannot read or materialize a handoff.
- Continuation read is Coordinator mediated, same-task only, requires an
  explicit terminal source run, validates integrity and secret scanning, and
  emits `handoff.continuation-consumed`.
- `team-handoff-integrity` has negative regressions for missing artifact, hash
  mismatch, chain/sequence gap, Markdown frontmatter drift, and cross-task/run
  access.
- Soft retention emits Patrol warning; hard retention emits a controlled
  `human-signoff-required` decision/evidence rather than an unstructured throw.
- `ATM-BUG-2026-07-11-111` is marked fixed with 0075 references.
- A real L5 Team dogfood run proves denied unauthorised handoff operations and
  an authorised Coordinator flow; raw vendor output and secrets are not stored.
