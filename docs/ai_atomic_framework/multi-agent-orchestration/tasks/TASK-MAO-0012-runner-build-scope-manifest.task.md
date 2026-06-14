---
task_id: TASK-MAO-0012
title: "runner sync scope manifest"
status: done
completed_at: "2026-06-14T10:48:16.048Z"
completed_by_agent: "captain"
owner: atm-core
priority: P0
milestone: M5
closure_authority: target_repo
ledger_closure:
  source: "AI-Atomic-Framework/.atm/history/tasks/TASK-MAO-0012.json"
  closed_at: "2026-06-14T10:48:16.048Z"
  closed_by_actor: "captain"
  closure_packet: ".atm/history/evidence/TASK-MAO-0012.closure-packet.json"
depends_on:
  - "TASK-MAO-0011"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/atm-core-runner-broker-design.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "package.json"
  - "scripts/AtmCore/"
  - "scripts/validate-runner-build-scope.ts"
  - "scripts/build-package-dist.ts"
  - "scripts/build-root-drop-release.ts"
  - "scripts/build-onefile-release.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "scripts/AtmCore/runner-build-scope.json"
  - "scripts/AtmCore/README.md"
  - "scripts/validate-runner-build-scope.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-runner-build-scope.ts --mode validate"
  - "npm run validate:script-parity"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Remove runner build scope manifest, AtmCore notes, validator, and map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.runner-build-scope-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Moving every existing build script in one broad migration"
  - "Changing the public build command semantics"
  - "Publishing runner refs"
---

# TASK-MAO-0012 - runner sync scope manifest

## Goal

Create a machine-readable bridge between today's scattered runner-affecting scripts and a lightweight `Runner Sync Steward v1` single-writer policy.

## Implementation Contract

- Add `scripts/AtmCore/runner-build-scope.json` listing current runner-affecting source roots, build scripts, schema roots, and generated artifacts.
- Document that new runner-affecting scripts must live under `scripts/AtmCore/` or be declared in the manifest.
- Add validation that the manifest covers the current `npm run build` chain and does not silently omit `packages/core/src`, `packages/cli/src`, `packages/plugin-governance-local/src`, schemas, root launchers, or release outputs.
- Avoid a high-churn script move until release parity and reproducibility are proven.
- Mark `release/**` as steward-only generated output in the documented contract used by source-delivery tasks.

## Acceptance Criteria

- The validator fails if a build-chain script is omitted from the manifest.
- The validator distinguishes runner-affecting scripts from non-core planning utilities.
- Existing `npm run build` still works through the current package script.
- The manifest is suitable for `TASK-MAO-0013` classifier consumption.
- The manifest supports a source-agent workflow where ordinary tasks stop before runner publication.
