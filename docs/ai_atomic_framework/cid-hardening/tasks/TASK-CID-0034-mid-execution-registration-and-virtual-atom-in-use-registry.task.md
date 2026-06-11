---
doc_id: doc_cid_0034
task_id: TASK-CID-0034
title: "Mid-execution registration and virtual atom in-use registry"
status: done
owner: atm-core
priority: P1
milestone: M3
depends_on:
  - "TASK-CID-0030"
  - "TASK-CID-0032"
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書2.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/candidate-bridge.ts"
  - "packages/core/src/broker/__tests__/candidate-bridge.test.ts"
  - "packages/core/src/broker/registry.ts"
  - "packages/core/src/broker/steward.ts"
  - "packages/core/src/broker/team-lane.ts"
  - "scripts/validate-broker-steward.ts"
deliverables:
  - "packages/core/src/broker/candidate-bridge.ts"
  - "packages/core/src/broker/__tests__/candidate-bridge.test.ts"
  - "packages/core/src/broker/registry.ts"
  - "packages/core/src/broker/steward.ts"
  - "packages/core/src/broker/team-lane.ts"
  - "scripts/validate-broker-steward.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-broker-steward.ts --mode validate"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert registry lifecycle changes if active intent and in-use state drift cannot be diagnosed deterministically."
atomizationImpact:
  ownerAtomOrMap: "atm.cid-agr-runtime-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Final closeout orchestration"
  - "Validator benchmark harness"
nonGoals:
  - "Do not create a second runtime authority outside broker/coordinator layering"
started_at: 2026-06-11T22:57:02.2212603+08:00
started_by_agent: 002b
---

# TASK-CID-0034 - Mid-execution registration and virtual atom in-use registry

## Goal

Track virtual atoms and AGR-backed intents during execution so broker state remains consistent from claim through apply and closeout.

## Acceptance Criteria

- Runtime can represent virtual atom -> intent -> in-use relationships.
- Stale or conflicting registry state is diagnosable.
- Team lane and steward flows can consume the same runtime truth.

## Blocker

`TASK-CID-0034` is no longer blocked.

## Completion Notes

- `TASK-CID-0036` was released/closed, which removed the temporary AGR conflict on `atom-validator-framework`.
- `TASK-CID-0034` was re-opened, reclaimed with `write` intent, and its honest-scope payload was restored from stash `TASK-CID-0034-blocked-isolation-2026-06-11`.
- The delivered bounded file set is: `packages/core/src/broker/candidate-bridge.ts`, `packages/core/src/broker/__tests__/candidate-bridge.test.ts`, `packages/core/src/broker/registry.ts`, `packages/core/src/broker/steward.ts`, `packages/core/src/broker/team-lane.ts`, and `scripts/validate-broker-steward.ts`.
- Validators passed for closeout: `npm run typecheck`, `npm run validate:cli`, `node --strip-types scripts/validate-broker-steward.ts --mode validate`, `npm run validate:broker-steward`, `git diff --check`, and `npm run validate:git-head-evidence`.
- Target repo closure is now recorded in `AI-Atomic-Framework` as `done`, with closure packet and final ledger transition committed.
