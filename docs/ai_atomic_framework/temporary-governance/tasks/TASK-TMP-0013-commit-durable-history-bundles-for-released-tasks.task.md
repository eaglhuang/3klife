---
task_id: TASK-TMP-0013
title: Commit durable history bundles for released tasks
status: done
owner: codex-cleanup-captain
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions: []
  softRelations: []
  changedPublicSeams:
    - historical-evidence-durability
  causalImpactEdges:
    - released-task-history-committed
  parallelFrontierInputs: []
  validatorReferences:
    - git-diff-check
  phaseOwner: codex-cleanup-captain
related_plan: temporary-governance/temporary-governance-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
+  - .atm/history/evidence/ATM-GOV-0253.*
  - .atm/history/task-events/ATM-GOV-0253/**
  - .atm/history/tasks/ATM-GOV-0253.json
  - .atm/history/evidence/ATM-GOV-0287.*
  - .atm/history/task-events/ATM-GOV-0287/**
  - .atm/history/tasks/ATM-GOV-0287.json
  - .atm/history/evidence/ATM-GOV-0288.*
  - .atm/history/task-events/ATM-GOV-0288/**
  - .atm/history/tasks/ATM-GOV-0288.json
  - .atm/history/evidence/ATM-GOV-0289.*
  - .atm/history/task-events/ATM-GOV-0289/**
  - .atm/history/tasks/ATM-GOV-0289.json
  - .atm/history/evidence/ATM-GOV-0290.*
  - .atm/history/task-events/ATM-GOV-0290/**
  - .atm/history/tasks/ATM-GOV-0290.json
  - .atm/history/evidence/ATM-GOV-0291.*
  - .atm/history/task-events/ATM-GOV-0291/**
  - .atm/history/tasks/ATM-GOV-0291.json
  - .atm/history/evidence/ATM-GOV-0296.*
  - .atm/history/task-events/ATM-GOV-0296/**
  - .atm/history/tasks/ATM-GOV-0296.json
  - .atm/history/evidence/ATM-GOV-0297.*
  - .atm/history/task-events/ATM-GOV-0297/**
  - .atm/history/tasks/ATM-GOV-0297.json
  - .atm/history/evidence/ATM-GOV-0298.*
  - .atm/history/task-events/ATM-GOV-0298/**
  - .atm/history/tasks/ATM-GOV-0298.json
  - .atm/history/evidence/ATM-GOV-0300.*
  - .atm/history/task-events/ATM-GOV-0300/**
  - .atm/history/tasks/ATM-GOV-0300.json
  - .atm/history/evidence/ATM-GOV-0307.*
  - .atm/history/task-events/ATM-GOV-0307/**
  - .atm/history/tasks/ATM-GOV-0307.json
  - .atm/history/evidence/ATM-GOV-0314.*
  - .atm/history/task-events/ATM-GOV-0314/**
  - .atm/history/tasks/ATM-GOV-0314.json
  - .atm/history/evidence/ATM-GOV-0315.*
  - .atm/history/task-events/ATM-GOV-0315/**
  - .atm/history/tasks/ATM-GOV-0315.json
  - .atm/history/evidence/ATM-GOV-0316.*
  - .atm/history/task-events/ATM-GOV-0316/**
  - .atm/history/tasks/ATM-GOV-0316.json
  - .atm/history/evidence/ATM-GOV-0329.*
  - .atm/history/task-events/ATM-GOV-0329/**
  - .atm/history/tasks/ATM-GOV-0329.json
  - .atm/history/evidence/ATM-GOV-0331.*
  - .atm/history/task-events/ATM-GOV-0331/**
  - .atm/history/tasks/ATM-GOV-0331.json
  - .atm/history/evidence/ATM-GOV-0332.*
  - .atm/history/task-events/ATM-GOV-0332/**
  - .atm/history/tasks/ATM-GOV-0332.json
  - .atm/history/evidence/ATM-GOV-0333.*
  - .atm/history/task-events/ATM-GOV-0333/**
  - .atm/history/tasks/ATM-GOV-0333.json
  - .atm/history/evidence/ATM-GOV-0334.*
  - .atm/history/task-events/ATM-GOV-0334/**
  - .atm/history/tasks/ATM-GOV-0334.json
  - .atm/history/evidence/ATM-GOV-0335.*
  - .atm/history/task-events/ATM-GOV-0335/**
  - .atm/history/tasks/ATM-GOV-0335.json
  - .atm/history/evidence/ATM-GOV-0336.*
  - .atm/history/task-events/ATM-GOV-0336/**
  - .atm/history/tasks/ATM-GOV-0336.json
  - .atm/history/evidence/ATM-GOV-0337.*
  - .atm/history/task-events/ATM-GOV-0337/**
  - .atm/history/tasks/ATM-GOV-0337.json
  - .atm/history/evidence/ATM-GOV-0338.*
  - .atm/history/task-events/ATM-GOV-0338/**
  - .atm/history/tasks/ATM-GOV-0338.json
  - .atm/history/evidence/ATM-GOV-0339.*
  - .atm/history/task-events/ATM-GOV-0339/**
  - .atm/history/tasks/ATM-GOV-0339.json
  - .atm/history/evidence/ATM-GOV-0340.*
  - .atm/history/task-events/ATM-GOV-0340/**
  - .atm/history/tasks/ATM-GOV-0340.json
  - .atm/history/evidence/ATM-GOV-0341.*
  - .atm/history/task-events/ATM-GOV-0341/**
  - .atm/history/tasks/ATM-GOV-0341.json
  - .atm/history/evidence/ATM-GOV-0345.*
  - .atm/history/task-events/ATM-GOV-0345/**
  - .atm/history/tasks/ATM-GOV-0345.json
  - .atm/history/evidence/ATM-GOV-0346.*
  - .atm/history/task-events/ATM-GOV-0346/**
  - .atm/history/tasks/ATM-GOV-0346.json
  - .atm/history/evidence/ATM-GOV-0353.*
  - .atm/history/task-events/ATM-GOV-0353/**
  - .atm/history/tasks/ATM-GOV-0353.json
  - .atm/history/evidence/ATM-GOV-0355.*
  - .atm/history/task-events/ATM-GOV-0355/**
  - .atm/history/tasks/ATM-GOV-0355.json
  - .atm/history/evidence/ATM-GOV-0356.*
  - .atm/history/task-events/ATM-GOV-0356/**
  - .atm/history/tasks/ATM-GOV-0356.json
  - .atm/history/evidence/ATM-GOV-0357.*
  - .atm/history/task-events/ATM-GOV-0357/**
  - .atm/history/tasks/ATM-GOV-0357.json
  - .atm/history/evidence/ATM-GOV-0358.*
  - .atm/history/task-events/ATM-GOV-0358/**
  - .atm/history/tasks/ATM-GOV-0358.json
  - .atm/history/evidence/ATM-GOV-0359.*
  - .atm/history/task-events/ATM-GOV-0359/**
  - .atm/history/tasks/ATM-GOV-0359.json
  - .atm/history/evidence/ATM-GOV-0360.*
  - .atm/history/task-events/ATM-GOV-0360/**
  - .atm/history/tasks/ATM-GOV-0360.json
  - .atm/history/evidence/ATM-GOV-0370.*
  - .atm/history/task-events/ATM-GOV-0370/**
  - .atm/history/tasks/ATM-GOV-0370.json
  - .atm/history/evidence/ATM-GOV-0384.*
  - .atm/history/task-events/ATM-GOV-0384/**
  - .atm/history/tasks/ATM-GOV-0384.json
  - .atm/history/evidence/ATM-GOV-0388.*
  - .atm/history/task-events/ATM-GOV-0388/**
  - .atm/history/tasks/ATM-GOV-0388.json
  - .atm/history/evidence/ATM-GOV-0400.*
  - .atm/history/task-events/ATM-GOV-0400/**
  - .atm/history/tasks/ATM-GOV-0400.json
  - .atm/history/evidence/TASK-ERR-0014.*
  - .atm/history/task-events/TASK-ERR-0014/**
  - .atm/history/tasks/TASK-ERR-0014.json
  - .atm/history/evidence/TASK-LANE-0023.*
  - .atm/history/task-events/TASK-LANE-0023/**
  - .atm/history/tasks/TASK-LANE-0023.json
  - .atm/history/evidence/TASK-SKL-0040.*
  - .atm/history/task-events/TASK-SKL-0040/**
  - .atm/history/tasks/TASK-SKL-0040.json
  - .atm/history/evidence/TASK-TMP-0008.*
  - .atm/history/task-events/TASK-TMP-0008/**
  - .atm/history/tasks/TASK-TMP-0008.json
deliverables:
  - .atm/history/evidence/
  - .atm/history/task-events/
  - .atm/history/tasks/
validators:
  - git diff --check
tddMode: reasoned-not-applicable
tddNotApplicableReason: This is a provenance-preserving commit of already completed task history; no source behavior changes.
tddExemptions:
  - kind: mechanical
    reason: Historical evidence bundle reconciliation.
methodProfiles:
  - operational-recovery
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-01T18:30:40.919Z"
completed_by_agent: "codex-cleanup-captain"
closedAt: "2026-09-01T18:30:40.919Z"
closedByActor: "codex-cleanup-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-01T18-30-40-919Z-close-5ebeae7c6a93"
lastTransitionAt: "2026-09-01T18:30:40.919Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "963d5b0345948269f954fc5ac8040d1701c835a4"
---

# TASK-TMP-0013 Commit durable history bundles for released tasks

## Intent

Commit only the listed dirty history files whose owning tasks are already done and released. Do not include TASK-MBX-0001, TASK-PRF-0008, abandoned work, source files, or runtime locks.

## Acceptance

- [ ] Each listed owner is done and released at claim time.
- [ ] The governed commit contains only this card's history bundle and its close evidence.
- [ ] No active-owner file is staged or modified.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-01T15:20:13.622Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"temporary-governance/tasks/TASK-TMP-0013-commit-durable-history-bundles-for-released-tasks.task.md","contentDigest":"sha256:1de339fef0572fbad2da96089177325ba7f68cf2b1bb1466cda135a50228e75f"} -->
