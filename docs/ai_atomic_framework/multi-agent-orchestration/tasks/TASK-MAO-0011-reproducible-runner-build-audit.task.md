---
task_id: TASK-MAO-0011
title: "reproducible runner build audit"
status: planned
owner: atm-core
priority: P0
milestone: M5
closure_authority: target_repo
depends_on: []
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/atm-core-runner-broker-design.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "package.json"
  - "scripts/build-root-drop-release.ts"
  - "scripts/build-onefile-release.ts"
  - "scripts/validate-runner-reproducibility.ts"
  - "tests/fixtures/runner-reproducibility/"
  - "docs/reports/runner-reproducibility-audit.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "scripts/validate-runner-reproducibility.ts"
  - "tests/fixtures/runner-reproducibility/"
  - "docs/reports/runner-reproducibility-audit.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-runner-reproducibility.ts --mode validate"
  - "npm run validate:root-drop-release"
  - "npm run validate:onefile-release"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert reproducibility validator, fixture, report, build-script normalization, and atomization map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.runner-build-reproducibility-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Publishing runner refs"
  - "Broker submit-patch pipeline"
  - "Closure packet runner binding"
---

# TASK-MAO-0011 - reproducible runner build audit

## Goal

Prove and repair the current `npm run build` runner output so the same source SHA can produce byte-identical root-drop and onefile runner artifacts. This is the gate for `Runner Sync Steward v1`.

## Implementation Contract

- Audit current release generation for nondeterminism, including wall-clock `generatedAt`, file traversal order, gzip payload output, path normalization, and manifest ordering.
- Add a deterministic validator that builds the runner twice from the same source snapshot and compares critical artifacts.
- Normalize or isolate volatile provenance so byte-compared artifacts are stable.
- Produce a human-readable audit report listing every nondeterministic source and its remediation.
- Preserve `node atm.mjs` as the normal frozen runner entrypoint.
- Establish the evidence required before any steward-only runner publication lane can be trusted.

## Acceptance Criteria

- The reproducibility validator fails before remediation on known nondeterministic fixtures and passes after remediation.
- Critical artifact comparison covers `release/atm-onefile/atm.mjs`, `release/atm-onefile/release-manifest.json`, `release/atm-root-drop/release-manifest.json`, and any manifest that feeds the onefile payload hash.
- The report explicitly states whether wall-clock timestamps remain inside byte-compared artifacts.
- Existing release validators still pass.
