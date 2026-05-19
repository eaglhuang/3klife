# TASK-ATS-0006 Evidence: Canonical Map Closeout

Date: 2026-05-19
Status: completed

## Feature Target

- Repository: `C:/Users/User/3klife-npc-brain`
- High-value feature target: `pipelines/sanguo-rag/run_full_roster_convergence_loop.py`
- Decomposition plan: `.atm/history/reports/decomposition-plan.full-roster-convergence-v1.json`

## Canonical Atomic Map

The decomposition plan was materialized into canonical map `ATM-MAP-0001`.

Primary artifacts:

- `atomic_workbench/maps/ATM-MAP-0001/map.spec.json`
- `atomic_workbench/maps/ATM-MAP-0001/map.integration.test.ts`
- `atomic_workbench/maps/ATM-MAP-0001/map.test.report.json`
- `atomic_workbench/maps/ATM-MAP-0001/lineage-log.json`
- `atomic-registry.json`

The map replacement contract explicitly covers the feature-level legacy surfaces, including `legacy://pipelines/sanguo-rag/run_full_roster_convergence_loop.py#run_global_seed_pipeline`.

## Integration and Equivalence Evidence

The map now has both integration and equivalence evidence:

- integration report: `atomic_workbench/maps/ATM-MAP-0001/map.test.report.json`
- equivalence fixtures: `atomic_workbench/maps/ATM-MAP-0001/equivalence/map.equivalence.fixtures.json`
- legacy executor: `atomic_workbench/maps/ATM-MAP-0001/equivalence/legacy.executor.mjs`
- map executor: `atomic_workbench/maps/ATM-MAP-0001/equivalence/map.executor.mjs`
- equivalence report: `atomic_workbench/maps/ATM-MAP-0001/map.equivalence.report.json`

The registry entry and map spec are now aligned at `active` for `ATM-MAP-0001`, so the canonical map is no longer stuck in a dry-run-only or stale-registry state.

## Boundary Outcome

The first governed pilot patch now happens inside the canonical map boundary instead of as an ad hoc helper extraction. This is the key acceptance condition for TASK-ATS-0006: a high-value legacy Python feature was decomposed into a real Atomic Map with explicit members, edges, replacement coverage, and validation evidence.

## Meaning

TASK-ATS-0006 is complete.