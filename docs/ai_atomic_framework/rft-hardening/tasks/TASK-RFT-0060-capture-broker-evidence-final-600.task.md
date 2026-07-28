---
task_id: TASK-RFT-0060
title: Split capture broker evidence script below 600 lines
status: done
owner: atm-refactor
priority: P1
depends_on:
  - TASK-RFT-0059
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
related_plan: docs/ai_atomic_framework/governance-optimization/tasks/TASK-RFT-0060-capture-broker-evidence-final-600.task.md
scopePaths:
  - scripts/capture-broker-evidence.ts
  - scripts/capture-broker-evidence/**/*.ts
  - scripts/validators/team-agents/capture-broker-evidence.ts
  - tests/scripts/capture-broker-evidence-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts*.json
deliverables:
  - scripts/capture-broker-evidence.ts
  - scripts/capture-broker-evidence/**/*.ts
  - tests/scripts/capture-broker-evidence-final-600.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
validators:
  - node --strip-types tests/scripts/capture-broker-evidence-final-600.test.ts
  - npm run typecheck
  - npm run validate:team-agents -- --case capture-broker-evidence
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the source/test split and rebuild release artifacts if frozen runner sync is produced.
atomizationImpact:
  ownerAtomOrMap: atm.broker-evidence-capture-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  extractionCandidates:
    - atom: atm.broker-evidence-capture-facade
      pattern: Facade
      source: scripts/capture-broker-evidence.ts
      disposition: extract
      inlineReason: null
    - atom: atm.broker-evidence-capture-result-contract
      pattern: Result Contract Object
      source: scripts/capture-broker-evidence.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T04:16:31.882Z"
completed_by_agent: "codex-task-rft-0060"
closedAt: "2026-07-16T04:16:31.882Z"
closedByActor: "codex-task-rft-0060"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T04-16-31-784Z-close-026dbfb29314"
lastTransitionAt: "2026-07-16T04:16:31.882Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "afaa53f9c1f4819f7d3842d140e164ffddaa8b25"
---

# TASK-RFT-0060

Split `scripts/capture-broker-evidence.ts` so the operator-facing script remains a stable facade while implementation details move into owned helper modules. Every physical TypeScript file in this card's deliverable surface must be below 600 lines.

## Acceptance

- `scripts/capture-broker-evidence.ts` remains directly executable with `node --strip-types`.
- The broker evidence capture JSON/report behavior remains compatible with the existing `capture-broker-evidence` team-agents validator case.
- `tests/scripts/capture-broker-evidence-final-600.test.ts` verifies the facade and extracted modules are below 600 lines and that the script owner shard maps the facade and module glob to `atm.broker-evidence-capture-map`.
- No unrelated broker, taskflow, or team-agent behavior is refactored in this card.

## Atom Plan

Atom: `atm.broker-evidence-capture-map`
Pattern: Facade plus Result Contract Object
Owner module: `scripts/capture-broker-evidence/**`
Callers: `scripts/validators/team-agents/capture-broker-evidence.ts`, direct operator CLI use
Public surface: `scripts/capture-broker-evidence.ts` command behavior and output paths stay stable
Focused test: `node --strip-types tests/scripts/capture-broker-evidence-final-600.test.ts`
CLI regression: `npm run validate:team-agents -- --case capture-broker-evidence`
Out of scope: `scripts/collect-broker-evidence.ts`, broker runtime semantics, team-agent validator rewrites beyond import compatibility if needed
Commit split: source/test/map delivery, taskflow close bundle, release sync only if ATM reports runner drift
