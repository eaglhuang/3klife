# TASK-ATS-0007 Evidence: Evolution and Polymorphize Follow-up

Date: 2026-05-20
Status: in_progress

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

TASK-ATS-0007 stays open. Polymorphize evidence now exists and passes, but real evolve proof is still blocked until the adopter registry carries atom-level version lineage that can produce a machine-generated hash diff for `ATM-NPCBRAIN-0002`.
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