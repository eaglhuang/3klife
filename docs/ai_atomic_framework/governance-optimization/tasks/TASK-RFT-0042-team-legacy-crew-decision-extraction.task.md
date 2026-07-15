---
task_id: TASK-RFT-0042
title: Extract team legacy crew decision policy map
status: done
owner: atm-core
priority: P1
depends_on: [TASK-RFT-0041]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM瘝餌??芸?-Team-Agents-撌冽???.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/team-legacy.ts
  - packages/cli/src/commands/team/legacy/**/*.ts
  - tests/cli/team-*.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
deliverables:
  - packages/cli/src/commands/team-legacy.ts
  - packages/cli/src/commands/team/legacy/implementer-selector-policy.ts
  - packages/cli/src/commands/team/legacy/crew-decision-policy.ts
  - tests/cli/team-legacy-crew-decision-extraction.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
validators:
  - node --strip-types tests/cli/team-legacy-command-extraction.test.ts
  - node --strip-types tests/cli/team-legacy-patrol-contract-extraction.test.ts
  - node --strip-types tests/cli/team-legacy-permission-lease-extraction.test.ts
  - node --strip-types tests/cli/team-legacy-provider-execution-extraction.test.ts
  - node --strip-types tests/cli/team-legacy-crew-decision-extraction.test.ts
  - node --strip-types tests/cli/team-agents-dogfood.test.ts
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the crew decision policy extraction commit and restore the moved helpers inside team-legacy.ts.
atomizationImpact:
  ownerAtomOrMap: atm.team-agents-command-router-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.team-crew-decision-policy
      pattern: Policy Object
      source: packages/cli/src/commands/team-legacy.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-15T15:26:23.540Z"
completed_by_agent: "codex-task-rft-0042"
closedAt: "2026-07-15T15:26:23.540Z"
closedByActor: "codex-task-rft-0042"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-15T15-26-23-540Z-close-bb8b222916df"
lastTransitionAt: "2026-07-15T15:26:23.540Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "a90e1c1a2984d4327b98fe158a73dff9905b6b3d"
---

# TASK-RFT-0042 - Extract team legacy crew decision policy map

## Problem

`packages/cli/src/commands/team-legacy.ts` remains 3,628 lines after TASK-RFT-0041. The crew decision surface still mixes captain sizing, implementer selection, lieutenant escalation, minimal crew briefing, and atomization checklist policy inside the command facade.

## Acceptance

- Extract the Team crew decision policy map from `team-legacy.ts` into focused modules under `packages/cli/src/commands/team/legacy/`.
- Move one large atom map in this card, not just a small helper cluster.
- Keep every new or touched physical support module at or below 600 lines.
- Reduce `team-legacy.ts` below its current 3,628-line baseline.
- Preserve exported helper names currently imported by tests or downstream command surfaces.
- Add a regression that fails if any extracted crew decision module exceeds 600 lines or `team-legacy.ts` does not shrink.
- Register the new extracted module paths in the CLI atom-map shard.

## Atom Refactor Plan

Atom: `atm.team-crew-decision-policy`
Pattern: Policy Object
Owner modules:
- `packages/cli/src/commands/team/legacy/implementer-selector-policy.ts`
- `packages/cli/src/commands/team/legacy/crew-decision-policy.ts`
Callers: `packages/cli/src/commands/team-legacy.ts`
Public surface: re-export crew decision helpers from `team-legacy.ts` if needed to preserve imports
Focused test: `tests/cli/team-legacy-crew-decision-extraction.test.ts`
CLI regression: `node --strip-types tests/cli/team-agents-dogfood.test.ts`
Out of scope: team run storage, lifecycle command execution, patrol reporting, and full `team-legacy.ts` completion below 600 lines
Commit split: source/test/map update first, generated release sync only if frozen runner reports sync required
