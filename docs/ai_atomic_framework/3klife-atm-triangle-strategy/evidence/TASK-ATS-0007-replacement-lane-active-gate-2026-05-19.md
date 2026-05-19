# TASK-ATS-0007 Evidence: Replacement-Lane Active Gate and Pinned Runner Closeout

Date: 2026-05-19
Status: in_progress

## Framework Runtime Fix

The framework onefile runtime was repaired so replacement-lane transitions no longer fail only because `ajv` is unavailable inside the onefile cache.

The fix has two parts:

- registry validation now falls back to structural validation when AJV is unavailable
- replacement-lane promotion now synchronizes the registry lifecycle status with the replacement mode instead of leaving the registry entry stale

## Pinned Runner Smoke

The repaired onefile runner was synchronized back into `C:/Users/User/3klife-npc-brain/atm.mjs` and validated with a pinned-runner smoke flow in a temporary workspace.

Observed result:

- `create-map --from-plan`: passed
- `test --map ATM-MAP-0007`: passed
- `replacement-lane transition --to shadow`: passed
- returned `registryStatus = validated`

This confirms that the `replacement-lane` path is no longer blocked by the registry validator bug in the pinned onefile runner.

## ATM-MAP-0001 Active-Gate Evidence

`ATM-MAP-0001` now has the evidence chain that previously blocked `active` promotion:

- map equivalence: `atomic_workbench/maps/ATM-MAP-0001/map.equivalence.report.json`
- propagation: `.atm/history/reports/propagation-report.ATM-NPCBRAIN-0002.json`
- review advisory: `.atm/history/reports/review-advisory.ATM-MAP-0001-pilot.json`
- human review: `.atm/history/reports/human-review.guided-legacy-atomize-guidance-20260519151625-f417f5a6f2.json`

The map spec, lineage log, and registry status now agree on the `active` state for `ATM-MAP-0001`.

## Remaining Scope

TASK-ATS-0007 stays open because M6 still needs broader rollout proof beyond the first active map, especially evolution / polymorphize follow-up and additional governed rollout evidence beyond the initial pilot boundary.