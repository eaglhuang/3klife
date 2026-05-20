# TASK-ATS-0007 Evidence: Evolution and Polymorphize Follow-up

Date: 2026-05-20
Status: completed

## Polymorphize Evidence

A real polymorph impact report was generated for `ATM-MAP-0001` and then validated with the ATM spec validator.

Artifacts:

- `atomic_workbench/maps/ATM-MAP-0001/polymorph-impact-report.json`
- validated via `atm spec --validate`

Observed result:

- `targetMapId = ATM-MAP-0001`
- `atomId = ATM-NPCBRAIN-0002`
- `toVersion = 0.1.1`
- `templateHits = []`
- `impactedMapIds = []`
- `propagation = []`
- `passed = true`

Current interpretation: the map has no template-bound members, so the polymorphize gate is presently neutral rather than blocking.

## Evolution Blocker Evidence

A real `registry-diff` attempt was executed for `ATM-NPCBRAIN-0002` from `0.1.0 -> 0.1.1` and the result was preserved as a formal blocker report.

Artifact:

- `.atm/history/reports/registry-diff.ATM-NPCBRAIN-0002.evolve-blocked.json`

Observed result:

- `ok = false`
- `code = ATM_DIFF_ATOM_NOT_FOUND`
- message: `Atom ATM-NPCBRAIN-0002 not found in registry.`

This confirms that map-level evolve proof is currently blocked by missing atom-level version lineage in the adopter registry, not by a guessed or synthetic failure.

## Next Governed Leaf Progression

While evolve remains blocked, the next governed leaf inside `ATM-MAP-0001` was still advanced through the dry-run proposal path.

Artifact:

- `.atm/history/reports/guided-next-leaf.apply_convergence_loop_state_governance.json`

Observed result:

- `legacyTarget = pipelines/sanguo-rag/run_full_roster_convergence_loop.py#apply_convergence_loop_state_governance`
- `proposalId = guided-legacy-atomize-guidance-20260519151625-f417f5a6f2-apply-convergence-loop-state-governance`
- `status = ready-for-review`
- `queued = true`
- `humanReviewRequired = true`

A custom proposal id was used so this second governed leaf would not overwrite the already-approved `run_global_seed_pipeline` pilot proposal.

## Remaining Scope

This was the correct blocker at the time it was captured. It has since been resolved by adding adopter atom-level version lineage and re-running registry diff.
## Human Review Decision

The second governed leaf inside `ATM-MAP-0001` was formally approved for actual patch planning through ATM human review.

Artifact path:

- `.atm/history/evidence/LEGACY-GUIDED-ATOMIZE.json`

Approved proposal:

- `guided-legacy-atomize-guidance-20260519151625-f417f5a6f2-apply-convergence-loop-state-governance`
- target: `pipelines/sanguo-rag/run_full_roster_convergence_loop.py#apply_convergence_loop_state_governance`

Review reason summary:

- single-call governance initializer
- narrow global-state boundary
- no trunk orchestration edits
- straightforward inline rollback path

## Router Follow-up Observation

After the approval was recorded, `atm next` still returned the same dry-run proposal recommendation instead of advancing to an apply-oriented next action. This suggests the current guidance router is not yet consuming the approved custom proposal record as satisfying the guidance-session recommendation.
## Rollout-ready Verification (2026-05-20)

The approved second governed leaf now passes the rollout-ready closeout gate end-to-end.

Verified proposal id:

- guided-legacy-atomize-guidance-20260519151625-f417f5a6f2-apply-convergence-loop-state-governance

Verified commands:

- node atm.mjs next --json
- node atm.mjs review rollout-ready "guided-legacy-atomize-guidance-20260519151625-f417f5a6f2-apply-convergence-loop-state-governance" --json

Observed result:

- nextAction.command now routes to review rollout-ready ... --json
- nextRouteState = proposal-rollout-ready
- missingEvidence = []
- rolloutCloseout.smokeEvidenceSatisfied = true
- rolloutCloseout.rollbackReadySatisfied = true
- rolloutCloseout.patchFiles includes:
  - pipelines/sanguo-rag/run_full_roster_convergence_loop.py
  - pipelines/sanguo-rag/full_roster_convergence_state_governance.py

Root-cause fix that unlocked this gate:

- Framework CLI now parses report JSON with UTF-8 BOM tolerance, preventing false ATM_REVIEW_ROLLOUT_READY_EVIDENCE_MISSING failures when adopter evidence files are valid but begin with BOM.

Leaf decision update:

- apply_convergence_loop_state_governance is now marked rollout closeout complete under TASK-ATS-0007.

## Map-level Registry Diff Closeout (2026-05-20)

The map-level evolve blocker is now resolved.

Artifact:

- `.atm/history/reports/registry-diff.ATM-NPCBRAIN-0002.0.1.0-to-0.1.1.json`

Observed result:

- `ok = true`
- `lineageContinuity = true`
- `sourceKind = member-version-lineage`
- `sourceRef = atomic_workbench/maps/ATM-MAP-0001/lineage-log.json`
- changed field: `codeHash`
- unchanged fields: `specHash`, `testHash`

Supporting closeout evidence:

- `.atm/history/evidence/TASK-ATS-0007.json`

Closeout interpretation:

`TASK-ATS-0007` can close. The original evolve blocker `ATM_DIFF_ATOM_NOT_FOUND` was a real and useful signal; after adopter atom lineage was present, the same route produced a deterministic registry diff with continuity intact.
