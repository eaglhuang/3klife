---
doc_id: doc_cid_0003
task_id: TASK-CID-0003
title: "Extend existing validate:semantic-fingerprint with deterministic identity-hash regression fixtures"
status: planned
owner: atm-core
priority: P0
milestone: E0
depends_on:
  - "TASK-CID-0002"
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "scripts/validate-semantic-fingerprint.ts"
  - "tests/registry/semantic-fingerprint-determinism.test.ts"
  - "fixtures/semantic-fingerprint/determinism/*"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "scripts/validate-semantic-fingerprint.ts"
  - "tests/registry/semantic-fingerprint-determinism.test.ts"
  - "fixtures/semantic-fingerprint/determinism/*"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-semantic-fingerprint.ts --mode validate"
  - "npm test"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the validator extension and fixtures. Because no new script file is introduced, rollback restores the pre-card validate:semantic-fingerprint surface."
atomizationImpact:
  ownerAtomOrMap: "atm.cid-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "Extends atm.cid-map (introduced by TASK-CID-0002) with the determinism regression validator surface."
outOfScope:
  - "Creating a new validate-* script (must extend the existing validate-semantic-fingerprint.ts)"
  - "Adding a new npm script entry (reuse the existing one)"
  - "Testing CID.Effects / Sandbox / Behavior dimensions"
  - "Adding embedding or vector tests"
  - "Modifying semantic-fingerprint.ts compute logic"
nonGoals:
  - "Do not turn the validator into a quality gate (it stays a determinism guard)"
  - "Do not assert anything about a fingerprint value beyond its determinism and stability"
---

# TASK-CID-0003 — Extend existing validate:semantic-fingerprint with deterministic identity-hash regression fixtures

## Goal

Pin the deterministic-firewall axiom (A1) into a machine-checked regression: identical declared contracts produce identical `CID.Interface`; recomputation N times must not flap; injecting any non-deterministic signal into the identity hash must cause the validator to fail.

## Why

`semantic-fingerprint.ts:26` is already deterministic by construction, but without regression fixtures any future refactor (e.g. changing JSON serialization, key ordering, default coercion) can silently break determinism. This card is the safety net that lets all subsequent E1+ work proceed without secretly destabilizing identity.

## Implementation Contract

- **Extend** the existing `scripts/validate-semantic-fingerprint.ts` (do **not** create a new script). Add a new mode branch / sub-check; reuse the existing `npm run validate:semantic-fingerprint` script entry.
- Fixtures go under `fixtures/semantic-fingerprint/determinism/`; cover:
  - Same declared contract → identical `CID.Interface` across permuted key orderings.
  - Recompute the same atom-spec N times → byte-identical fingerprint each run.
  - Negative: a fixture that **injects a non-deterministic signal** (e.g. timestamp, PID, random nonce) into a hypothetical identity-hash input must trigger validator failure (i.e. the validator catches the violation at the schema/policy level, not at execution).
- The validator must be runnable both via `npm run validate:semantic-fingerprint` and via direct `node --strip-types`.
- No change to `semantic-fingerprint.ts` compute logic.

## Deliverables

- `scripts/validate-semantic-fingerprint.ts` (extended)
- `tests/registry/semantic-fingerprint-determinism.test.ts` (new)
- `fixtures/semantic-fingerprint/determinism/*` (positive + negative)
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `node --strip-types scripts/validate-semantic-fingerprint.ts --mode validate`
- `npm test`
- `git diff --check`

## Acceptance Criteria

- `npm run validate:semantic-fingerprint` runs the new determinism checks in addition to existing checks.
- Positive fixtures pass: same contract → same fingerprint; N-recompute stable.
- Negative fixture fails closed: non-deterministic signal in identity input → validator exits non-zero with a clear code.
- No new top-level script file; no new npm script entry.
- Existing fingerprint validator output remains unchanged for the pre-card fixture set.

## Rollback

Revert the validator extension and fixtures. Because no new script file is introduced, rollback fully restores the pre-card surface.

## Atomization Impact

- Owner atom/map: `atm.cid-map` (extended)
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

Closes the E0 minimal loop. Successor (after E0 closes): the **future queue** opens with `TASK-CID-0005` (E2 lease fencing, aligning with `TASK-TEAM-0018`) as Captain's priority.
