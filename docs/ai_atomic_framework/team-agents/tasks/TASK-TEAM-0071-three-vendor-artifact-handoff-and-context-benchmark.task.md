---
doc_id: doc_team_0071
task_id: TASK-TEAM-0071
title: "Three-vendor direct execution, artifact handoff, and context benchmark"
status: done
owner: atm-core
priority: P0
milestone: M10X
depends_on:
  - "TASK-TEAM-0053"
  - "TASK-TEAM-0070"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "agent-integrations/vendors/team-secrets.example.json"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
  - "docs/governance/team-agents/team-vendor-runtime.md"
  - "packages/cli/src/commands/team.ts"
  - "packages/core/src/team-runtime/permission-broker.ts"
  - "packages/core/src/team-runtime/provider-contract.ts"
  - "packages/core/src/team-runtime/providers/gemini-direct.ts"
  - "scripts/validate-team-agents.ts"
  - "docs/governance/team-agents/three-vendor-l5-context-benchmark.md"
deliverables:
  - "agent-integrations/vendors/team-secrets.example.json"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
  - "docs/governance/team-agents/team-vendor-runtime.md"
  - "packages/cli/src/commands/team.ts"
  - "packages/core/src/team-runtime/permission-broker.ts"
  - "packages/core/src/team-runtime/provider-contract.ts"
  - "packages/core/src/team-runtime/providers/gemini-direct.ts"
  - "scripts/validate-team-agents.ts"
  - "docs/governance/team-agents/three-vendor-l5-context-benchmark.md"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-team-agents.ts --case three-vendor-direct-artifact-handoff"
  - "node --strip-types scripts/validate-team-agents.ts --case heterogeneous-multi-bot-team-run"
  - "npm run validate:team-agents"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert Gemini direct orchestration, bounded artifact handoff, telemetry, and evidence report together."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates: []
proposalAdmission:
  trigger: "hot-file"
  summarySubmitted: true
  hotFiles:
    - "packages/cli/src/commands/team.ts"
  notes: "Bounded three-provider dispatcher, artifact-handoff, and context-telemetry changes are fully described by this task card."
outOfScope:
  - "Changing the existing Gemini CLI/editor-subagent bridge"
  - "Committing provider credentials or full provider responses"
  - "Live paid API calls in CI"
completed_at: "2026-07-11T13:38:38.586Z"
completed_by_agent: "Codex-GPT5.6 Sol"
closedAt: "2026-07-11T13:38:38.586Z"
closedByActor: "Codex-GPT5.6 Sol"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-11T13-38-38-586Z-close-f0881a4bd582"
lastTransitionAt: "2026-07-11T13:38:38.586Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "f1dc0abda261d16171ad8cfbd43522e685f15bf1"
---
# TASK-TEAM-0071 Three-vendor direct execution, artifact handoff, and context benchmark

## Goal

Finish the unproven execution requirements from the TASK-TEAM-0053 Captain
handoff without reopening its closed ledger history.

## Acceptance Criteria

- Concrete `team start --execute` supports OpenAI, Anthropic, and
  `gemini-direct` role selections in one L5 run.
- Later roles receive bounded, redacted prior-role artifacts according to role
  order; an OpenAI Review Agent prompt is demonstrably tied to an Anthropic
  Implementer output.
- Deterministic coverage proves OpenAI-only, Anthropic-only,
  Gemini-direct-only, mixed three-provider, and one-role
  `broker-conflict-blocked` while sibling roles proceed.
- Manual low-cost live probes prove all three credentials and direct provider
  generation surfaces; a low-cost L5 run records redacted role outcomes.
- A reproducible benchmark compares monolithic context bytes with bounded
  role-context bytes and reports savings, limitations, and whether quality
  evidence supports the claim.
