---
doc_id: doc_cid_0002
task_id: TASK-CID-0002
title: "CID semantics doc + fingerprintProfile optional additive schema"
status: planned
owner: atm-core
priority: P0
milestone: E0
depends_on:
  - "TASK-CID-0001"
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "docs/CID_SEMANTICS.md"
  - "schemas/atomic-spec.schema.json"
  - "schemas/registry/fingerprint-profile.schema.json"
  - "packages/core/src/registry/semantic-fingerprint.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "docs/CID_SEMANTICS.md"
  - "schemas/atomic-spec.schema.json"
  - "schemas/registry/fingerprint-profile.schema.json"
  - "packages/core/src/registry/semantic-fingerprint.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:schemas"
  - "npm run validate:semantic-fingerprint"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the schema additions and doc commit. Because fingerprintProfile is optional/additive, existing fixtures and registry entries must keep validating both before and after rollback."
atomizationImpact:
  ownerAtomOrMap: "atm.cid-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "Introduces the cid-map ownership for the fingerprint profile schema and semantic-fingerprint doc surface."
outOfScope:
  - "Implementing CID.Effects scanner or effect tags"
  - "Implementing CID.Semantic embeddings or vector indexing"
  - "Implementing CID.Behavior or any sandbox / mutation testing"
  - "Implementing Trust Tier state machine"
  - "Changing semantic-fingerprint.ts compute logic (rename/comments only; no behavioral change)"
  - "Adding required fields to existing schemas (must stay additive/optional)"
nonGoals:
  - "Do not bypass the additive/backwards-compatible migration rule"
  - "Do not mix in any non-deterministic input into identity hash"
---

# TASK-CID-0002 — CID semantics doc + fingerprintProfile optional additive schema

## Goal

Land the canonical `CID_SEMANTICS.md` (identity vs advisory + axioms A1/A2) and an **optional / additive** `fingerprintProfile` schema slot. The existing `semanticFingerprint` is formally renamed in documentation as **"contract/interface + execution-constraint fingerprint"** and mapped to `CID.Interface`; the four other slots (`Strict / Effects / Semantic / Behavior`) are declared but **left empty in this card**.

## Why

The upstream `semantic-fingerprint.ts:26` already implements a deterministic contract fingerprint, but the public article and many AI agents misread it as "AST/LLM semantic identity." Without a normative doc + a schema slot to attach future dimensions, every follow-up card will re-derive (and inevitably distort) the semantics. This card freezes the truth and reserves the space — without changing any compute logic.

## Implementation Contract

- `CID_SEMANTICS.md` states: (a) what `semanticFingerprint` is and is not, citing `semantic-fingerprint.ts:26`; (b) the identity vs advisory rule (A1); (c) the necessary-not-sufficient rule (A2); (d) the five-slot profile with only `interface` populated in this card.
- `schemas/registry/fingerprint-profile.schema.json` (new) declares the five-slot object; `additionalProperties:false`; all five slots are **optional**.
- `schemas/atomic-spec.schema.json` gains an **optional** `fingerprintProfile` property referencing the new schema; spec schema version is bumped in a backwards-compatible way; `additionalProperties:false` is **preserved**; existing fixtures and registry entries must keep validating without backfill.
- `semantic-fingerprint.ts` receives **comment-level rename / clarification only** — no behavioral change. The function still produces the existing `sf:sha256:...` value; the doc maps this to `CID.Interface`.
- `path-to-atom-map.json` adds ownership entries for the new doc/schema surface under `atm.cid-map`.

## Deliverables

- `docs/CID_SEMANTICS.md`
- `schemas/atomic-spec.schema.json` (additive bump)
- `schemas/registry/fingerprint-profile.schema.json` (new)
- `packages/core/src/registry/semantic-fingerprint.ts` (comments / docstrings only)
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:schemas`
- `npm run validate:semantic-fingerprint`
- `git diff --check`

## Acceptance Criteria

- `CID_SEMANTICS.md` exists and explicitly states the current scope (ports + language.primary + validation.evidenceRequired + performanceBudget), cites `semantic-fingerprint.ts:26`, and disclaims AST / LLM / embedding semantics.
- `fingerprintProfile` exists in `atomic-spec.schema.json` as **optional**; existing atom-spec fixtures validate **without modification**.
- `fingerprint-profile.schema.json` declares all five slots as optional and uses `additionalProperties:false`.
- `semantic-fingerprint.ts` produces **byte-identical** output to pre-card behavior for the existing fixture set (proven by `validate:semantic-fingerprint`).
- `atm.cid-map` ownership row exists in `path-to-atom-map.json`.

## Rollback

Revert the commit. Because `fingerprintProfile` is optional and additive, removing it must not invalidate any existing registry entry or fixture.

## Atomization Impact

- Owner atom/map: `atm.cid-map` (new)
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

Successor: `TASK-CID-0003` extends `validate:semantic-fingerprint` with deterministic identity-hash regression fixtures.
