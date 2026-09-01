---
task_id: TASK-TMP-0014
title: Classify and settle 3K planning and governance residue
status: planned
owner: codex-gpt-5.6
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - "No active claim owns a path selected for mutation."
  softRelations: []
  changedPublicSeams: []
  causalImpactEdges: []
  parallelFrontierInputs: []
  validatorReferences: []
  phaseOwner: codex-gpt-5.6
related_plan: temporary-governance/temporary-governance-plan.md
planning_repo: docs
target_repo: 3KLife
closure_authority: 3KLife
scopePaths:
  - AGENTS.md
  - README.md
  - docs/keep.summary.md
  - docs/keep-memory/**
  - docs/ai_atomic_framework/**
  - .atm/catalog/registry/actors.json
  - .atm/history/guidance/**
  - .atm/history/protected-override-audit/**
  - .atm/history/task-events/ATM-GOV-0382/**
  - .atm/history/task-events/TASK-PRF-0001/**
  - .atm/history/task-events/TASK-PRF-0004/**
  - .atm/history/tasks/ATM-GOV-0382.json
  - .atm/history/tasks/TASK-PRF-0001.json
  - .atm/history/tasks/TASK-PRF-0004.json
  - docs/reports/residue-disposition/TASK-TMP-0014-3k-disposition.json
deliverables:
  - docs/reports/residue-disposition/TASK-TMP-0014-3k-disposition.json
validators:
  - git diff --check
  - node atm.mjs status --json
tddMode: reasoned-not-applicable
tddNotApplicableReason: "This is a bounded disposition and documentation task: it must classify pre-existing bytes and preserve evidence, not change product behavior."
tddExemptions:
  - kind: docs
    reason: "The deliverable is a disposition receipt with exact path hashes and actions."
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-TMP-0014 Classify and settle 3K planning and governance residue

## Intent

Classify every currently dirty 3K planning or governance artifact in the
declared scope as exactly one of: (A) commit as durable source/evidence, (B)
delete only with reproducible proof that no authority needs the current bytes,
or (C) add a narrowly justified ignore rule. Preserve active MBX work and do
not overwrite another actor's source content or identity registration.

## Acceptance

- [ ] The disposition receipt lists every selected path, its pre-action
      SHA-256 (or tracked base identity for deletions), owner/authority, and
      exactly one A/B/C action.
- [ ] A commits contain only coherent source, planning, or history bundles;
      B deletes only paths with an independently verifiable duplicate or
      expired-transient proof; C rules are path-specific and do not hide
      authored source or ATM evidence.
- [ ] `TASK-MBX-0001` and all paths it owns remain untouched.
- [ ] The task never replaces an existing actor record; it may preserve the
      current valid `codex-gpt-5.6` registry update only in a coherent commit.
- [ ] The final report identifies any remaining path that needs a separately
      scoped task rather than silently absorbing it.

## Authority and rollback

- planning_repo_root: `C:/Users/User/3KLife`
- planning_repo_is_external_to_target: false
- target_repo_root: `C:/Users/User/3KLife`
- source_plan_path: `docs/ai_atomic_framework/temporary-governance/temporary-governance-plan.md`
- source_task_card_path: `docs/ai_atomic_framework/temporary-governance/tasks/TASK-TMP-0014-classify-and-settle-3k-planning-and-governance-residue.task.md`
- target_import_method: current ATM CLI against the 3K repository ledger
- rollback: revert only the individual disposition commit; B actions must be
  recoverable from the recorded canonical source or a commit hash.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-01T17:29:27.252Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"temporary-governance/tasks/TASK-TMP-0014-classify-and-settle-3k-planning-and-governance-residue.task.md","contentDigest":"sha256:c8759ad31e291149e0b1b690e9e67074d8c2d3283689157c04034366216dcdf8"} -->
