---
doc_id: doc_team_0074
task_id: TASK-TEAM-0074
title: "Cross-vendor Team Markdown Handoff patrol, documentation, and three-vendor dogfood"
status: done
owner: atm-core
priority: P1
milestone: "Cross-Vendor Team Markdown Handoff"
depends_on:
  - "TASK-TEAM-0073"
related_plan: "docs/ai_atomic_framework/team-agents/CROSS-VENDOR-TEAM-MARKDOWN-HANDOFF-PLAN-2026-07-11.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "scripts/validate-team-agents.ts"
  - "docs/governance/team-agents/cross-vendor-handoff-ledger.md"
  - "docs/governance/team-agents/team-vendor-runtime.md"
  - "docs/governance/team-agents/three-vendor-l5-context-benchmark.md"
  - "docs/governance/team-agents/role-skill-pack-contract.md"
  - "docs/governance/permission-hard-gate-matrix.md"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "scripts/validate-team-agents.ts"
  - "docs/governance/team-agents/cross-vendor-handoff-ledger.md"
  - "docs/governance/team-agents/team-vendor-runtime.md"
  - "docs/governance/team-agents/three-vendor-l5-context-benchmark.md"
  - "docs/governance/team-agents/role-skill-pack-contract.md"
  - "docs/governance/permission-hard-gate-matrix.md"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-team-agents.ts --case team-handoff-narrative-whitelist"
  - "node --strip-types scripts/validate-team-agents.ts --case team-handoff-aborted-promotion"
  - "npm run validate:team-agents"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert patrol, documentation, validator, and dogfood evidence changes with the handoff feature if acceptance fails."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Live paid API calls in CI"
  - "Closing TASK-TEAM-0072 or TASK-TEAM-0073 without their command-backed evidence"
completed_at: "2026-07-11T16:17:35.955Z"
completed_by_agent: "Codex-GPT5.6 Terra"
closedAt: "2026-07-11T16:17:35.955Z"
closedByActor: "Codex-GPT5.6 Terra"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-11T16-17-35-955Z-close-2cd7820917f2"
lastTransitionAt: "2026-07-11T16:17:35.955Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "1c2fdf96ef17bf377bbfc819a034ba636c913a39"
---
# TASK-TEAM-0074 Cross-vendor Team Markdown Handoff patrol, documentation, and three-vendor dogfood

## Goal

Complete M11H operator assurance: Patrol integrity checks, public framework
documentation, deterministic regression coverage, paid three-vendor dogfood,
and aborted-run archive evidence.

## Acceptance Criteria

- close-preflight and daily-noon Patrol detect handoff chain, frontmatter,
  encoding, retention, archive, and narrative-whitelist drift.
- Documentation states that adopter repos retain handoff history while the ATM
  framework distributes only contracts and tooling.
- Deterministic tests prove narrative whitelist enforcement and terminal-run
  archive promotion.
- Paid dogfood records redacted three-vendor sequential handoff and one aborted
  run archive without exposing credentials or full provider responses.
- `ATM-BUG-2026-07-11-111` is updated with final task/evidence references.
