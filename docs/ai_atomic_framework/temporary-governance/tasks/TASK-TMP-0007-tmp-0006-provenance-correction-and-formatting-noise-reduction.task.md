---
task_id: TASK-TMP-0007
title: TMP-0006 provenance correction and formatting-noise reduction
status: running
owner: atm-governance
priority: P1
depends_on: []
causalGraph:
  causalDependencies:
    - "TASK-TMP-0006 historical transition sweep updated planning task cards to match target live ledger."
  startConditions:
    - "Target live ledger and planning repo diff analyzed."
  softRelations: []
  changedPublicSeams: []
  causalImpactEdges:
    - "Establishes formal target-side attestation for historical transition alignment."
    - "Disposes TMP-0005 untracked evidence files."
  validatorReferences:
    - "git diff --check"
    - "node atm.mjs doctor --json"
    - "node atm.mjs tasks status --task TASK-TMP-0007 --json"
  phaseOwner: "single reconciliation steward"
related_plan: temporary-governance/temporary-governance-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "TMP is the registered family for one-time quarantine and residue disposition."
scopePaths:
  - "docs/reports/TASK-TMP-0007-target-side-attestation.md"
  - ".atm/history/evidence/TASK-TMP-0007.target-attestation.json"
  - ".atm/history/evidence/TASK-TMP-0005.seal-and-commit.json"
  - ".atm/history/evidence/TASK-TMP-0005.residue-reconciliation.json"
  - ".atm/history/evidence/TASK-TMP-0005.runner-sync-receipt.json"
  - ".atm/history/evidence/TASK-TMP-0005.archived-non-block-events.json"
  - ".atm/history/evidence/TASK-TMP-0005.skl-0031-compact-receipt.json"
deliverables:
  - "docs/reports/TASK-TMP-0007-target-side-attestation.md"
  - ".atm/history/evidence/TASK-TMP-0007.target-attestation.json"
validators:
  - "git diff --check"
  - "node atm.mjs doctor --json"
  - "node atm.mjs tasks status --task TASK-TMP-0007 --json"
errorCodes: []
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
createdByCommand: atm plan card create
amendmentNote: "Forward recovery amendment: planning status was prematurely marked done while target remained open/running; restore running and require a target-side attestation deliverable before closure."
---

# TASK-TMP-0007 TMP-0006 provenance correction and formatting-noise reduction

## Intent

Reconcile the provenance gap of commit `5f53e505` (TASK-TMP-0006), establish target-side attestation, dispose TMP-0005 untracked evidence files, and ensure TASK-TMP-0006 is not falsely marked as target done.

## Recovery Note

Planning frontmatter was temporarily marked `done` without a completed target lifecycle. This forward amendment restores `running` and requires a real target-side attestation report as the closure deliverable. Commit `5f53e505` is not reverted; its 488 planning-card updates are retained unless a deterministic comparison proves inequality against the target live ledger.

## Required Work

1. Analyze all 488 files in commit `5f53e505`.
2. Verify semantic transition fixes (including TASK-ERR-0001 and TASK-SKL-0014) against target live ledger exactly; do not mutate the 488-file set unless comparison fails.
3. Keep TASK-TMP-0006 at `planned` with an explicit no-target-closure note.
4. Record target-side attestation and evidence disposition for TMP-0005 receipts.
5. Produce `docs/reports/TASK-TMP-0007-target-side-attestation.md` plus `.atm/history/evidence/TASK-TMP-0007.target-attestation.json` on the target repository.
6. Complete normal target delivery, validators, and taskflow close (stop at pre-push-ready).

## Acceptance

- [ ] Deterministic comparison of `5f53e505` (488 files) against target live ledger is recorded with verified/failed counts.
- [ ] TASK-TMP-0006 remains `planned` and explicitly notes absence of target closure.
- [ ] TMP-0005 evidence disposition is attested (retain/bind historical receipts; no silent deletion).
- [ ] Target-side attestation report and JSON receipt exist and are delivered.
- [ ] Target lifecycle reaches `done` through normal claim → evidence → close; planning closeback follows.
