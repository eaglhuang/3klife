---
task_id: TASK-RFT-0091
title: Split Python language adapter atom map under 600 lines
status: done
owner: atm-release
priority: P0
depends_on:
  - TASK-RFT-0090
related_plan: docs/ai_atomic_framework/governance-optimization/tasks/TASK-RFT-0091-python-language-adapter-map.task.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/language-python/src/language-python-adapter.ts
  - packages/language-python/src/language-python-adapter/**
  - packages/language-python/src/index.ts
  - packages/language-python/test/atomization-planning.test.ts
  - scripts/validate-python-adapter.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-plugins.json
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
deliverables:
  - packages/language-python/src/language-python-adapter.ts
  - packages/language-python/src/language-python-adapter/**
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-plugins.json
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
validators:
  - node --strip-types scripts/validate-python-adapter.ts
  - node --test packages/language-python/test/atomization-planning.test.ts
  - node atomic_workbench/atomization-coverage/path-to-atom-map-shards/merge.js . validate
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atom-language-python-adapter
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-plugins.json
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atom-language-python-adapter-profile
      pattern: Project Profile Module
      source: packages/language-python/src/language-python-adapter.ts
      disposition: extract
      inlineReason: null
    - atom: atom-language-python-adapter-scanner
      pattern: Scanner Module
      source: packages/language-python/src/language-python-adapter.ts
      disposition: extract
      inlineReason: null
    - atom: atom-language-python-adapter-planner
      pattern: Atomization Planning Module
      source: packages/language-python/src/language-python-adapter.ts
      disposition: extract
      inlineReason: null
    - atom: atom-language-python-adapter-validation
      pattern: Validation Module
      source: packages/language-python/src/language-python-adapter.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-16T13:14:55.401Z"
completed_by_agent: "codex-task-rft-0091"
closedAt: "2026-07-16T13:14:55.401Z"
closedByActor: "codex-task-rft-0091"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-16T13-14-55-401Z-close-574035ced227"
lastTransitionAt: "2026-07-16T13:14:55.401Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "3caa47f04678e0d17d831211631339f528c1f953"
---

# TASK-RFT-0091 - Split Python Language Adapter Atom Map

## Objective

Reduce `packages/language-python/src/language-python-adapter.ts` below 600 lines by preserving it as the public facade and extracting its profile detection, static-check planning, Python source scanning, compute validation, and atomization planning helpers into bounded support modules.

## Acceptance

- `packages/language-python/src/language-python-adapter.ts` is below 600 physical lines.
- Every newly created physical source or test file is below 600 physical lines.
- Existing public exports from `packages/language-python/src/index.ts` continue to work.
- `createPythonLanguageAdapter`, `detectPythonProjectProfile`, `scanPythonEntrypoints`, `scanPythonImports`, `planPythonAtomize`, `discoverPythonAtomCandidates`, `planPythonAtomizeFromCandidate`, and `createPythonAtomizationPlanningAdapter` remain import-compatible.
- The path-to-atom owner shard maps both the facade and extracted support modules to `atom-language-python-adapter`.
- Validation evidence is command-backed.

## Notes

- Do not redesign adapter semantics in this card.
- Prefer extraction over inline edits. Behavior changes are out of scope unless required to preserve validators.
- If a high-value governance defect appears during closeout, amend scope before fixing it.
