---
task_id: ATM-GOV-0391
title: Make root-drop runner builds incrementally overlay verified base releases
status: done
owner: unassigned
priority: P0
depends_on: []
causalGraph:
  startConditions:
    - A previous sealed root-drop release and manifest are available for read-only eligibility verification.
    - The runner-sync broker grants a short queue-head publication window before any shared release write.
  softRelations: [ATM-GOV-0201, ATM-GOV-0369]
  changedPublicSeams: [atm.rootDropIncrementalOverlay.v1]
  causalImpactEdges:
    - verified-base-release-hydration
    - provenance-driven-changed-input-overlay
    - deletion-and-rename-tombstones
    - unsafe-overlay-falls-back-to-full-rebuild
    - full-and-incremental-release-tree-equivalence
  parallelFrontierInputs:
    - sealed-base-release
    - root-drop-manifest
    - runner-input-graph
    - runner-sync-broker-ticket
  validatorReferences:
    - root-drop-release-incremental-overlay
    - runner-sync-incremental-build
    - sealed-runner-build-input-cache
    - runner-reproducibility
  phaseOwner: wave-3-governance-substrate-recovery
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: GOV is the registered governance-optimization family; this is a successor performance and correctness repair for the already-closed ATM-GOV-0201 seam.
scopePaths:
  - scripts/build-root-drop-release.ts
  - scripts/run-sealed-runner-build.ts
  - scripts/runner-sync-incremental-build.ts
  - tests/cli/root-drop-release-incremental-overlay.test.ts
  - tests/cli/root-drop-release-manifest-integrity.test.ts
  - tests/cli/runner-sync-incremental-build.test.ts
  - tests/cli/sealed-runner-build-input-cache.test.ts
  - atomic_workbench/maps/atm-release-build/map.spec.json
deliverables:
  - scripts/build-root-drop-release.ts
  - scripts/run-sealed-runner-build.ts
  - scripts/runner-sync-incremental-build.ts
  - tests/cli/root-drop-release-incremental-overlay.test.ts
  - tests/cli/root-drop-release-manifest-integrity.test.ts
  - tests/cli/runner-sync-incremental-build.test.ts
  - tests/cli/sealed-runner-build-input-cache.test.ts
  - atomic_workbench/maps/atm-release-build/map.spec.json
validators:
  - node --experimental-strip-types tests/cli/root-drop-release-incremental-overlay.test.ts
  - node --experimental-strip-types tests/cli/root-drop-release-manifest-integrity.test.ts
  - node --experimental-strip-types tests/cli/runner-sync-incremental-build.test.ts
  - node --experimental-strip-types tests/cli/sealed-runner-build-input-cache.test.ts
  - node --experimental-strip-types scripts/run-sealed-runner-build.test.ts
  - npm run typecheck
errorCodes: []
testContributions:
  - caseId: test_atm_gov_0391_verified_base_overlay_equivalence
    targetGroupId: test_group_plan4_governance_substrate
    semanticKey: verified_root_drop_base_overlay_matches_full_tree
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [verified-base-release-hydration, provenance-driven-changed-input-overlay, full-and-incremental-release-tree-equivalence]
    expectedRedPredicate: An overlay from a valid base produces a different release inventory or tree digest than a full rebuild.
    contributionResourceKey: root-drop-release-incremental-overlay
    responsibility: task-required
    dependencyEdge: null
    contractEdge: atm.rootDropIncrementalOverlay.v1
    resourceKey: atom-build-root-drop-release
  - caseId: test_atm_gov_0391_untrusted_base_falls_back
    targetGroupId: test_group_plan4_governance_substrate
    semanticKey: unsafe_base_or_unmapped_input_never_overlays
    coversAcceptance: [ACC-3]
    coversImpactEdges: [unsafe-overlay-falls-back-to-full-rebuild]
    expectedRedPredicate: A missing, incompatible, digest-mismatched, or unmapped base or input is reused by overlay mode.
    contributionResourceKey: root-drop-release-manifest-integrity
    responsibility: task-required
    dependencyEdge: null
    contractEdge: atm.rootDropIncrementalOverlay.v1
    resourceKey: atom-validator-root-drop-release
  - caseId: test_atm_gov_0391_delete_rename_tombstone
    targetGroupId: test_group_plan4_governance_substrate
    semanticKey: overlay_removes_obsolete_release_entries
    coversAcceptance: [ACC-4]
    coversImpactEdges: [deletion-and-rename-tombstones]
    expectedRedPredicate: A deleted or renamed input leaves an obsolete release entry after overlay.
    contributionResourceKey: root-drop-release-incremental-overlay
    responsibility: task-required
    dependencyEdge: null
    contractEdge: atm.rootDropIncrementalOverlay.v1
    resourceKey: atom-build-root-drop-release
  - caseId: test_atm_gov_0391_integrity_and_publication_boundary
    targetGroupId: test_group_plan4_governance_substrate
    semanticKey: overlay_preserves_integrity_and_defers_shared_publication
    coversAcceptance: [ACC-5, ACC-6]
    coversImpactEdges: []
    expectedRedPredicate: An overlay weakens release integrity validation or performs a shared publication before a broker queue-head receipt.
    contributionResourceKey: runner-sync-incremental-build
    responsibility: task-required
    dependencyEdge: null
    contractEdge: atm.rootDropIncrementalOverlay.v1
    resourceKey: atom-build-release
requiredTestCaseIds:
  - test_atm_gov_0391_verified_base_overlay_equivalence
  - test_atm_gov_0391_untrusted_base_falls_back
  - test_atm_gov_0391_delete_rename_tombstone
  - test_atm_gov_0391_integrity_and_publication_boundary
phaseTestCaseIds: [test_group_plan4_governance_substrate]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the manifest/inventory schema and overlay caller together. The previous fullRebuild path remains the correctness circuit breaker; do not delete base release evidence or foreign artifacts.
atomizationImpact:
  ownerAtomOrMap: atm.release-build-map
  mapUpdates: [atomic_workbench/maps/atm-release-build/map.spec.json]
  extractionCandidates: []
createdByCommand: atm plan card create
completed_at: "2026-08-15T09:12:37.688Z"
completed_by_agent: "cursor-captain"
closedAt: "2026-08-15T09:12:37.688Z"
closedByActor: "cursor-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-15T09-12-37-688Z-close-77078cf95007"
lastTransitionAt: "2026-08-15T09:12:37.688Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "1827ae5924ffd1dce94c60501a221889afb1dc62"
---

# ATM-GOV-0391 Make root-drop runner builds incrementally overlay verified base releases

## Intent

Repair the actual runner incremental-build bottleneck without reducing release integrity. The current incremental path hydrates package dist but still constructs an empty root-drop tree, enumerates about 1,854 inputs, hashes source and target, and copies the complete release. The repair must hydrate a previously verified complete base release and overlay only the data-proven changed closure.

This is a framework quickfix: it restores a broken fast path. It is not evidence that any Plan 3.x/4.x Wave or final release is complete.

## General rule

Incremental release assembly may reuse only a complete base release whose schema, compatibility key, source snapshot, input tree hash, artifact inventory, and every entry digest have been independently verified. Overlay selection must be data-driven by the base inventory provenance and current input graph. If any base fact, mapping, digest, deletion/rename set, or final inventory is unknown or mismatched, the build must choose `fullRebuild` and emit a machine-readable reason; it must never guess from a hard-coded path list.

## Required implementation

- Extend the root-drop manifest with a versioned artifact inventory containing release-relative path, byte/mode digest, origin, input segments, input-path closure, replaceability, and whole-tree digest.
- Define a compatibility key from release schema, builder contract, and build scope; a different key makes the base ineligible.
- Keep the existing full builder path unchanged as the fallback.
- Add overlay mode: validate base inventory; hydrate verified base into the sealed worktree; overlay only the complete changed-input closure; remove entries only from explicit deletion/rename provenance; recompute manifest, source seal, inventory, and tree digest; then verify them.
- Wire the sealed runner incremental plan to request overlay only when eligibility is fully proven. Record a structured fallback reason otherwise.
- Do not hard-code a task id, actor, repository path, package name, threshold, or special-case source directory into overlay selection.
- Do all planning and focused validation before entering the runner-sync publication queue. Enter only when the candidate is ready, and release capacity immediately after the atomic publication outcome.

## Acceptance

- [ ] ACC-1: A package-only source change with a verified compatible base produces an overlay release whose complete inventory/tree digest and final onefile payload are byte-equivalent to a full rebuild.
- [ ] ACC-2: Unchanged base entries are hydrated rather than recopied; the focused receipt exposes overlay mode, base identity, changed closure, and elapsed phase timings.
- [ ] ACC-3: Missing base, unsupported schema, compatibility mismatch, base-entry digest mismatch, unknown changed input, incomplete provenance, or unknown delete/rename set produces a visible `fullRebuild` reason and never an overlay.
- [ ] ACC-4: Deletion and rename fixtures remove obsolete release entries and still match a full rebuild.
- [ ] ACC-5: The implementation does not weaken sealed-source validation, artifact inventory verification, reproducibility, ownership admission, or broker queue rules.
- [ ] ACC-6: Before frozen runner publication, the broker identifies this lane as queue head. Publication uses a short shared-write window and produces a digest-bound receipt.
