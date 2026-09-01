---
task_id: TASK-TMP-0017
title: Classify and settle released framework history residue
status: done
owner: codex-cleanup-captain
priority: P1
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
  - .atm/history/evidence/ATM-GOV-0253.runner-sync-receipt.json
  - .atm/history/evidence/ATM-GOV-0287.live-index-reconciliation.json
  - .atm/history/evidence/ATM-GOV-0290.live-index-reconciliation.json
  - .atm/history/evidence/ATM-GOV-0316.*
  - .atm/history/evidence/ATM-GOV-0332.live-index-reconciliation.json
  - .atm/history/evidence/ATM-GOV-0333.live-index-reconciliation.json
  - .atm/history/evidence/ATM-GOV-0334.live-index-reconciliation.json
  - .atm/history/evidence/ATM-GOV-0335.live-index-reconciliation.json
  - .atm/history/evidence/ATM-GOV-0336.live-index-reconciliation.json
  - .atm/history/evidence/ATM-GOV-0337.*
  - .atm/history/evidence/ATM-GOV-0338.live-index-reconciliation.json
  - .atm/history/evidence/ATM-GOV-0339.*
  - .atm/history/evidence/ATM-GOV-0340.*
  - .atm/history/evidence/ATM-GOV-0353.runner-publication-takeover.json
  - .atm/history/evidence/ATM-GOV-0355.*
  - .atm/history/evidence/ATM-GOV-0358.*
  - .atm/history/evidence/ATM-GOV-0370.publication-input-manifest.json
  - .atm/history/evidence/ATM-GOV-0384.live-index-reconciliation.json
  - .atm/history/evidence/ATM-GOV-0388.*
  - .atm/history/evidence/ATM-GOV-0400.live-index-reconciliation.json
  - .atm/history/evidence/TASK-LANE-0023.*
  - .atm/history/evidence/TASK-SKL-0040.live-index-reconciliation.json
  - .atm/history/evidence/TASK-TMP-0008.live-index-reconciliation.json
  - .atm/history/task-events/ATM-GOV-0313/2026-08-08T17-37-29-432Z-import-7f9dfb144ca1.json
deliverables:
  - .atm/history/evidence/
  - .atm/history/task-events/ATM-GOV-0313/
validators:
  - git diff --check
  - node atm.mjs cleanup diagnose --json
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-01T18:39:07.075Z"
completed_by_agent: "codex-cleanup-captain"
closedAt: "2026-09-01T18:39:07.075Z"
closedByActor: "codex-cleanup-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-01T18-39-07-075Z-close-75246419d488"
lastTransitionAt: "2026-09-01T18:39:07.075Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "80c50bce9f6e266de995d7299f2c562351110c03"
---

# TASK-TMP-0017 Classify and settle released framework history residue

## Intent

Commit only the explicitly listed dirty history records whose owners are released, preserving their bytes as durable provenance. Do not touch TASK-MBX-0001, TASK-PRF-0008, ATM-GOV-0349, unknown historical batches, runtime state, source files, or any unlisted path.

## Acceptance

- [ ] Every scoped record remains history-only and has a released owner at claim time.
- [ ] The governed commit contains only this card's scope plus its matching ledger and evidence.
- [ ] No active owner, unknown-provenance record, or source file is staged.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-01T18:34:26.713Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"temporary-governance/tasks/TASK-TMP-0017-classify-and-settle-released-framework-history-residue.task.md","contentDigest":"sha256:8c0de31874b20e70c715d16d3c43e165a5dbf42c194c6e8e1eb0f4ff011a2420"} -->
