---
doc_id: doc_cid_0018
task_id: TASK-CID-0018
title: "PatchProposal capsule runtime"
status: in-progress
started_at: "2026-06-07T06:47:58Z"
started_by_agent: "007"
owner: atm-core
priority: P0
milestone: P0
depends_on:
  - "TASK-CID-0015"
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/proposal.ts"
  - "packages/core/src/broker/index.ts"
  - "packages/cli/src/commands/broker.ts"
  - "packages/cli/src/commands/command-specs/broker.spec.ts"
  - "packages/cli/src/commands/command-specs.ts"
  - "package.json"
  - "scripts/validators.config.json"
  - "scripts/validate-broker-proposal.ts"
  - "tests/cli-fixtures/help-snapshots/broker.json"
deliverables:
  - "packages/core/src/broker/proposal.ts"
  - "packages/core/src/broker/index.ts"
  - "packages/cli/src/commands/broker.ts"
  - "packages/cli/src/commands/command-specs/broker.spec.ts"
  - "packages/cli/src/commands/command-specs.ts"
  - "package.json"
  - "scripts/validators.config.json"
  - "scripts/validate-broker-proposal.ts"
  - "tests/cli-fixtures/help-snapshots/broker.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-broker-proposal.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the proposal runtime commit and remove the proposal CLI subcommands if validation or scope guarantees fail."
atomizationImpact:
  ownerAtomOrMap: "atm.patch-proposal-runtime-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "This card births the proposal runtime that later compose and steward layers will consume."
outOfScope:
  - "Merge-plan composition"
  - "Steward final patch apply"
  - "Team or next integration"
  - "Manual mutation of .atm/history/** or .atm/runtime/**"
---

# TASK-CID-0018 - PatchProposal capsule runtime

## Goal

Implement the runtime that creates, lists, shows, and validates `PatchProposal.v1` payloads without immediately mutating the canonical worktree.

## Why This Exists

The whole brokered-write lane depends on separating "I want to change this" from "I already dirtied the canonical file." This card turns the `TASK-CID-0009` contract into an executable runtime surface.

## Acceptance Criteria

- Proposal create/list/show/validate flows exist under the broker CLI surface.
- Proposal validation fails closed on stale base commit, file hash mismatch, missing atom refs, ambiguous anchors, and out-of-scope target files.
- Proposal payloads can carry validators and rollback intent without applying the patch yet.
- The proposal validator is registered into both `package.json` and `scripts/validators.config.json`.
- Broker proposal subcommands are reflected in command-spec registration and the broker help snapshot.
- This card does not yet compose proposals together or apply a final steward patch.

## Notes

Captain cadence remains compact. Internal sidecars may be used for scope guard, fixture coverage review, and validator matrix checking only.

This card depends on the broker subtree and CLI surface that `TASK-CID-0016` births. It should not invent a second command aggregator or bypass the shared broker namespace.
