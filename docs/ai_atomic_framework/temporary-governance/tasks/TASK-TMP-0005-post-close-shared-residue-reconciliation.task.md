---
task_id: TASK-TMP-0005
title: Post-close shared residue reconciliation
status: done
owner: atm-governance
priority: P1
depends_on:
  - "ATM-GOV-0266"
causalGraph:
  causalDependencies:
    - "ATM-GOV-0266 durable receipt and record-only lifecycle contracts are closed and pushed."
  startConditions:
    - "Target and planning branches are synchronized with their remotes."
    - "No broker write intent is active for the residue paths."
  softRelations:
    - "TASK-SKL-0031 integration evidence may be retained or compacted only after its delivered adapter outputs are verified."
  changedPublicSeams: []
  causalImpactEdges:
    - "A disposition receipt binds every observed residue path to retain, record, regenerate, quarantine, or delete-with-proof."
  parallelFrontierInputs:
    - "ATM-GOV-0267 preflight may run read-only in parallel but must not claim residue paths."
  validatorReferences:
    - "git diff --check"
    - "node atm.mjs broker status --json"
    - "node atm.mjs doctor --json"
  phaseOwner: "single reconciliation steward"
related_plan: temporary-governance/temporary-governance-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "TMP is the registered family for one-time quarantine and residue disposition; this card changes no product contract."
scopePaths:
  - ".atm/history/evidence/ATM-GOV-0266.runner-sync-receipt.json"
  - ".atm/history/evidence/ATM-GOV-0240.runner-sync-receipt.json"
  - ".atm/history/evidence/ATM-FRAMEWORK-TEMP-claude-004-skl-0026-captain.runner-sync-receipt.json"
  - ".atm/history/evidence/TASK-SKL-0026.runner-sync-receipt.json"
  - ".atm/history/evidence/TASK-SKL-0031.*"
  - ".atm/history/tasks/TASK-SKL-0029.json"
  - ".atm/history/tasks/ATM-GOV-0240.json"
  - ".atm/history/tasks/ATM-GOV-0248.json"
  - ".atm/history/task-events/TASK-SKL-0029/**"
  - ".atm/history/task-events/ATM-GOV-0240/**"
  - ".atm/history/task-events/ATM-GOV-0248/**"
  - "artifacts/generated/skill-corpus-audit.json"
  - "packages/cli/dist/commands/taskflow/implementation.js"
  - "release/atm-onefile/**"
  - "release/atm-root-drop/**"
  - "docs/reports/post-close-shared-residue-reconciliation.md"
deliverables:
  - "docs/reports/post-close-shared-residue-reconciliation.md"
  - ".atm/history/evidence/TASK-TMP-0005.residue-reconciliation.json"
  - "A path-complete disposition table with prior digest, classification, action, resulting digest or deletion receipt, and rollback reference."
validators:
  - "git diff --check"
  - "node atm.mjs broker status --json"
  - "node atm.mjs doctor --json"
  - "node atm.mjs tasks status --task TASK-SKL-0029 --json"
  - "node atm.mjs tasks status --task ATM-GOV-0240 --json"
  - "node atm.mjs tasks status --task ATM-GOV-0248 --json"
errorCodes: []
evidence:
  required: command-backed
rollback:
  strategy: receipt-backed-regenerate-or-revert
  notes: "A generated artifact may be removed only after its source seal and rebuild command are recorded."
atomizationImpact:
  ownerAtomOrMap: "atm.post-close-residue-reconciliation"
  mapUpdates: []
  extractionCandidates:
    - atom: "atm.generated-taskflow-dist"
      pattern: "Generated Projection"
      source: "packages/cli/dist/commands/taskflow/implementation.js"
      disposition: inline
      inlineReason: "This card only classifies and reconciles the generated projection against its source seal; it must not edit or split generated runtime code."
createdByCommand: atm plan card create
completed_at: "2026-07-28T11:48:49.374Z"
completed_by_agent: "cursor-004-tmp-0005-steward"
closedAt: "2026-07-28T11:48:49.374Z"
closedByActor: "cursor-004-tmp-0005-steward"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-28T11-48-49-374Z-close-89ffb01d1c12"
lastTransitionAt: "2026-07-28T11:48:49.374Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "9666c2111e02abdd1660629451e2728161fe2ac4"
---

# TASK-TMP-0005 Post-close shared residue reconciliation

## Intent

Reconcile the post-close dirty working-tree residue left by runner publication,
parked-card lifecycle records, integration verification, and generated artifacts
after ATM-GOV-0266. This is a one-time disposition task, not a product repair
or a route for deleting unclassified files.

## Required Work

1. Produce a path-complete census before mutation. Classify every scoped path as
   `record`, `retain`, `regenerate`, `quarantine`, `delete-with-proof`, or
   `stop-unknown`.
2. Preserve the three parked cards as `blocked/released`. Use the record-only
   lifecycle only when its complete single-card ledger/event pair validates; do
   not replay, reopen, close, or alter their product delivery.
3. Reconcile generated `dist` and `release` outputs from their verified source
   seal. They may be regenerated or removed only with a receipt proving they
   are reproducible and do not contain an uncommitted source delta.
4. Reconcile the 0266 receipt and SKL-0031 evidence by provenance. Do not
   silently drop evidence that is not already represented by a committed task
   bundle or a compact replacement receipt.
5. Stop on any canonical source, test, schema, template, planning artifact,
   foreign active claim, or unknown-digest path. Route that path to a new
   formal card rather than extending this TMP scope.

## Acceptance

- [ ] Every scoped dirty path has exactly one disposition and a before/after digest or deletion proof.
- [ ] The three parked cards remain `blocked/released`, with their provenance either recorded by the approved bridge or explicitly retained with reason.
- [ ] Generated release and dist paths are absent from the worktree or proven identical to a committed/reproducible seal.
- [ ] SKL-0031 evidence is committed to its proper lifecycle, compacted with a replacement receipt, or retained with an explicit owner and expiry.
- [ ] No canonical source, test, schema, template, task card, or planning file is deleted or altered by this task.
- [ ] Target working tree has no residue owned by this card; unrelated out-of-scope paths are surfaced, not hidden.

## Stop Rule

Stop immediately and report if a path lacks provenance, differs from its
declared generated seal, intersects an active claim, or would require changing
product source or a parked task's lifecycle state.

## Rollback

Every destructive disposition must retain a content digest and a governed
receipt sufficient to regenerate or restore the affected artifact.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-28T10:30:33.056Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"temporary-governance/tasks/TASK-TMP-0005-post-close-shared-residue-reconciliation.task.md","contentDigest":"sha256:c8515ddaf31c9f9d94378dfd2e4ae275a8c759973802b7402d2fdcc7c33c5208"} -->
