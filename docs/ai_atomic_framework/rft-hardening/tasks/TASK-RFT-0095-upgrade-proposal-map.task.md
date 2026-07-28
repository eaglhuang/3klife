---
task_id: TASK-RFT-0095
title: Split upgrade proposal command under 600 lines
status: done
owner: atm-release
priority: P0
depends_on:
  - TASK-RFT-0094
related_plan: docs/ai_atomic_framework/governance-optimization/tasks/TASK-RFT-0095-upgrade-proposal-map.task.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/upgrade/proposal.ts
  - packages/cli/src/commands/upgrade/proposal/**
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
deliverables:
  - packages/cli/src/commands/upgrade/proposal.ts
  - packages/cli/src/commands/upgrade/proposal/**
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
validators:
  - node atm.mjs candidates rank --include "packages/cli/src/commands/upgrade/proposal.ts" --goal "Split packages/cli/src/commands/upgrade/proposal.ts into a facade plus focused support modules; every physical TypeScript source file must stay below 600 lines; preserve upgrade proposal behavior and ATM evidence." --json
  - node atm.mjs upgrade --propose --behavior behavior.split --atom atom-cli-upgrade-proposal --to 0.1.1 --legacy-target "packages/cli/src/commands/upgrade/proposal.ts#runGuidedLegacyDryRunProposal" --guidance-session guidance-20260716141346-edea9cc65a --dry-run --json
  - node --strip-types tests/upgrade/propose-map-evidence-closure.test.ts
  - node --strip-types tests/upgrade/propose-map-rollback.test.ts
  - node atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js . validate
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atom-cli-upgrade-proposal
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atom-cli-upgrade-proposal
      pattern: Facade
      source: packages/cli/src/commands/upgrade/proposal.ts
      disposition: extract
      inlineReason: null
    - atom: atom-cli-upgrade-proposal-options
      pattern: Strategy Map
      source: packages/cli/src/commands/upgrade/proposal.ts
      disposition: extract
      inlineReason: null
    - atom: atom-cli-upgrade-proposal-context-budget
      pattern: Result Contract Object
      source: packages/cli/src/commands/upgrade/proposal.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T15:45:59.596Z"
completed_by_agent: "codex-task-rft-0095"
closedAt: "2026-07-16T15:45:59.596Z"
closedByActor: "codex-task-rft-0095"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T15-45-59-479Z-close-d7b500dee215"
lastTransitionAt: "2026-07-16T15:45:59.596Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "da400e119fab195ce7420c3f039e238dd4cc2186"
---

# TASK-RFT-0095 - Split Upgrade Proposal Command

## Objective

Reduce `packages/cli/src/commands/upgrade/proposal.ts` below 600 physical lines by preserving it as the public upgrade proposal facade while extracting option parsing, guided legacy dry-run proposal queueing, input document discovery, and context-budget persistence into bounded support modules.

## Acceptance

- `packages/cli/src/commands/upgrade/proposal.ts` is below 600 physical lines.
- Every newly created physical TypeScript file is below 600 physical lines.
- Existing imports remain compatible for `parseUpgradeOptions`, `isGuidedLegacyDryRun`, `runGuidedLegacyDryRunProposal`, `loadExplicitInputDocuments`, `discoverInputDocuments`, `evaluateUpgradeContextBudget`, and `inferInputKind`.
- Upgrade proposal behavior remains deterministic for normal proposal validation, guided legacy dry-run proposals, human-review queue projection, input discovery, and context budget hard-stop persistence.
- The path-to-atom owner shard maps both the facade and extracted support modules to `atom-cli-upgrade-proposal`.
- Validation evidence is command-backed, including the guided `behavior.split` dry-run proposal.

## Notes

- Do not rewrite `packages/core/src/upgrade/propose.ts`; this task owns the CLI command facade and support modules only.
- Do not widen into unrelated upgrade behaviors, map curator, metrics-to-proposal, or human-review package internals except for import path compatibility required by the extracted modules.
- Keep source delivery, runner-sync if required, and governance closure in separate commits.
