---
task_id: TASK-RFT-0096
title: Split core spec parser under 600 lines
status: done
owner: atm-release
priority: P0
depends_on:
  - TASK-RFT-0095
related_plan: docs/ai_atomic_framework/governance-optimization/tasks/TASK-RFT-0096-core-spec-parser-final-600.task.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/spec/parse-spec.ts
  - packages/core/src/spec/parse-spec/**
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
deliverables:
  - packages/core/src/spec/parse-spec.ts
  - packages/core/src/spec/parse-spec/**
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
validators:
  - node atm.mjs candidates rank --include "packages/core/src/spec/parse-spec.ts" --goal "Split packages/core/src/spec/parse-spec.ts into a stable facade plus bounded support modules; every physical TypeScript source file must stay below 600 lines; preserve atomic spec parsing, schema validation, normalized model output, and prompt issue translation behavior." --json
  - node --strip-types scripts/validate-core-spec-parser.ts --mode validate
  - node atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js . validate
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atom-core-spec-parser
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atom-core-spec-parser
      pattern: Facade
      source: packages/core/src/spec/parse-spec.ts
      disposition: extract
      inlineReason: null
    - atom: atom-core-spec-parser-contracts
      pattern: Result Contract Object
      source: packages/core/src/spec/parse-spec.ts
      disposition: extract
      inlineReason: null
    - atom: atom-core-spec-parser-normalization
      pattern: Strategy Map
      source: packages/core/src/spec/parse-spec.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T16:05:15.830Z"
completed_by_agent: "codex-task-rft-0096"
closedAt: "2026-07-16T16:05:15.830Z"
closedByActor: "codex-task-rft-0096"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T16-05-15-830Z-close-05595bf68189"
lastTransitionAt: "2026-07-16T16:05:15.830Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "bb40c439e1555d342713c775db2183730c6bea81"
---

# TASK-RFT-0096 - Split Core Spec Parser Under 600 Lines

## Objective

Reduce `packages/core/src/spec/parse-spec.ts` below 600 physical lines by preserving it as the stable public parser facade while extracting bounded support modules for parser contracts, document normalization helpers, JSON/prompt issue helpers, and AJV issue translation.

## Acceptance

- `packages/core/src/spec/parse-spec.ts` is below 600 physical lines.
- Every newly created physical TypeScript file is below 600 physical lines.
- Existing imports remain compatible for `defaultAtomicSpecSchemaPath`, `parseAtomicSpecFile`, `parseAtomicSpecDocument`, and `normalizeAtomicSpecModel`.
- Atomic spec parsing behavior remains deterministic for valid specs, invalid specs, missing files, invalid JSON, missing schema files, AJV availability failures, normalized model output, semantic fingerprint calculation, lineage/TTL normalization, and prompt issue translation.
- The path-to-atom owner shard maps both the facade and extracted support modules to `atom-core-spec-parser`.
- Validation evidence is command-backed with the focused core spec parser validator and typecheck.

## Notes

- Do not change `schemas/atomic-spec.schema.json` or fixture expectations except for import path compatibility.
- Do not widen into registry, scaffold, test-runner, or CLI spec command behavior.
- Keep source delivery, runner-sync if required, and governance closure in separate commits.
