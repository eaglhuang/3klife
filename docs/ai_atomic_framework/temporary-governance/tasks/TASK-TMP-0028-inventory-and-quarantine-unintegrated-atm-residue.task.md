---
task_id: TASK-TMP-0028
title: Inventory and quarantine unintegrated ATM residue
status: planned
owner: unassigned
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions: ["Product WIP groups A-G are already parked outside the repo (atm-benchmark-sink/ATM-PRODUCT-PROOF-20260917/parked-wip-20260917T2210)", "Stale .git/index.lock removed and index refresh verified"]
  softRelations: [TASK-PRF-0112, TASK-PRF-0113, TASK-PRF-0111]
  changedPublicSeams: []
  causalImpactEdges: [shorter-integration-lead-time]
  parallelFrontierInputs: ["git status --porcelain -- .atm packages/cli/.atm"]
  validatorReferences: ["git status --porcelain -- .atm packages/cli/.atm"]
  phaseOwner: captain
related_plan: temporary-governance/temporary-governance-plan.md
planning_repo: docs
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: adopter
scopePaths:
  - .atm/history/**
  - .atm/catalog/registry/actors.json
  - packages/cli/.atm/**
deliverables:
  - .atm/history/evidence/TASK-TMP-0028.json
validators:
  - "git status --porcelain -- .atm packages/cli/.atm"
  - "git diff --check"
  - "node atm.mjs tasks status --task TASK-TMP-0028 --residue --json"
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-TMP-0028 Inventory and quarantine unintegrated ATM residue

Series choice: TMP, because this is one-off residue disposition, not product or
governance feature work. Replaces the draft TASK-TMP-0025 card, whose id already
exists as an abandoned record in the AI-Atomic-Framework ledger (0025-0027 are used).

## Intent

Bring ATM runtime and history residue in the canonical AI-Atomic-Framework
worktree to a known disposition so product commits are not blocked or obscured by it.
At creation time the residue is 11 modified tracked `.atm` files (3 of them staged
TASK-PRF-0107 records), 97 untracked `.atm` files dating back to 2026-09-12, and an
untracked `packages/cli/.atm/` directory. Product WIP is already parked outside the
repository and is not part of this card.

## Acceptance

- [ ] Every residue path gets exactly one disposition, decided by existing tooling
  (`atm tasks status --residue`, `atm tasks realign-plan-source --map ... --dry-run`, the
  residue-cleanup workflow, or the
  per-task claim/release/commit ledger pattern): commit with its owning task,
  quarantine outside the repo with SHA-256 and a recovery path, or tool-classified
  transient removal.
- [ ] Nothing is removed only because it is untracked; unknown ownership stays in
  place and is listed as blocked.
- [ ] No file outside `scopePaths` changes; no source, test, release, dist, or
  planning-card edit.
- [ ] `git status --porcelain -- .atm packages/cli/.atm` is empty, or the remaining
  paths are listed with owner and reason.
- [ ] No new command, tracker, dashboard, or evidence family is introduced.
- [ ] Stop rule: 45 minutes from claim. At the limit, record the remaining count and
  stop instead of extending the card. Do not hand-edit ledger records or hand-delete
  runtime locks.
- [ ] Commits touching `.atm` are serialized with product commits; do not commit while
  another actor has staged entries in the shared index.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-17T14:43:23.483Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"temporary-governance/tasks/TASK-TMP-0028-inventory-and-quarantine-unintegrated-atm-residue.task.md","contentDigest":"sha256:8093fd94b68636c5cd35393ba26fbb1a03ef71734304a73636986578de96de16"} -->
