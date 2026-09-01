---
task_id: TASK-TMP-0011
title: Reconcile and eliminate dual-repository dirty residue
status: done
owner: unassigned
priority: P2
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions: []
  softRelations: []
  changedPublicSeams: []
  causalImpactEdges: []
  parallelFrontierInputs: []
  validatorReferences: []
  phaseOwner: null
related_plan: temporary-governance/temporary-governance-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "1"
  - tmp/proposal.TASK-PRF-0006.v3.atmArtifactBudget.json
  - tmp/proposal.TASK-PRF-0006.v4.atmArtifactBudget.json
  - docs/reports/residue-disposition/TASK-TMP-0011-first-bounded-slice.md
deliverables:
  - docs/reports/residue-disposition/TASK-TMP-0011-first-bounded-slice.md
validators:
  - node atm.mjs cleanup diagnose --json
  - git diff --check
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-01T15:18:42.013Z"
completed_by_agent: "codex-cleanup-captain"
closedAt: "2026-09-01T15:18:42.013Z"
closedByActor: "codex-cleanup-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-01T15-18-42-013Z-close-0a679ae78a78"
lastTransitionAt: "2026-09-01T15:18:42.013Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "fcc6568a881e63ee69d8acf52d10236c3ce1ac4d"
---

# TASK-TMP-0011 Reconcile and eliminate dual-repository dirty residue

## Intent

Eliminate only the first bounded set of dual-repository residue whose current
bytes are independently reproducible or disposable: one expired validator
pointer and two broker-proposal ingest files already preserved by the canonical
broker proposal store. Record the evidence and disposition before deleting the
three files. This slice deliberately excludes all `.atm/history/**` paths,
active-owner work, MBX, and unverified source changes.

## Acceptance

- [ ] The report names every deleted path, its pre-delete SHA-256, and the
      canonical evidence that makes deletion safe.
- [ ] The two proposal IDs remain present in `.atm/runtime/broker-proposals.json`
      after the ingest files are removed.
- [ ] The validator pointer is proven to name an expired file under the system
      temporary directory, not a repository asset.
- [ ] No `.atm/history/**`, MBX, or unverified source path is changed by this
      task.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-01T14:48:17.551Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"temporary-governance/tasks/TASK-TMP-0011-reconcile-and-eliminate-dual-repository-dirty-residue.task.md","contentDigest":"sha256:723064485743b6fe48b6f9d1149b524979c0921543912fdd0cc2d4d57a8fa528"} -->
