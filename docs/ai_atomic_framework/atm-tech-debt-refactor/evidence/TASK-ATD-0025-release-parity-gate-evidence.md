---
doc_id: doc_other_0725
task_id: TASK-ATD-0025
title: Evidence — Release parity gate source / root-drop / onefile / npm
status: done
completed_at: 2026-05-19T15:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
---

## Summary

Landed `docs/release-parity-gate.md` — the contract document for the
cross-route parity gate that compares CLI behavior across the framework's
4 ship routes (source / root-drop / onefile / npm).

## Changes Made

### `docs/release-parity-gate.md` (new)
- Identified the 4 release routes and their producers.
- Defined the parity contract (CLI surface identity, bootstrap
  reachability, pinned-runner hash agreement, schema identity, telemetry
  off by default).
- Audited current validator coverage — 4 release-related validators exist
  but **no cross-route parity gate** yet. This is the gap.
- Specified the proposed `scripts/validate-release-parity.ts` (3-step
  flow: build → spawn fixtures → diff envelopes).
- Acceptance criteria for landing the validator (fixture set + heavy
  profile wiring + CI trigger paths).

## Why a contract doc not an implementation

The actual validator needs:
1. All 4 build paths green from a clean baseline (currently the source
   route is blocked by a pre-existing plugin-sdk merge conflict).
2. A diff-tolerant comparator that normalizes timestamps and absolute paths.
3. CI wiring into the heavy profile.

Each is a small follow-up card. This doc is the spec they share.

## Invariants Checked

- **I3** (release artifact deterministic build): the parity gate IS the
  enforcement mechanism for I3. The doc pins the contract.

## Validator Results

```
typecheck: 0 errors (clean)
neutrality: doc uses framework-neutral language only
```
