# TASK-ATS-0005 Evidence: Governed Leaf Pilot Smoke

Date: 2026-05-19
Status: completed

## Scope

- Repository: `C:/Users/User/3klife-npc-brain`
- Governance boundary: `pipelines/sanguo-rag/run_full_roster_convergence_loop.py#run_global_seed_pipeline`
- Patch files:
  - `pipelines/sanguo-rag/run_full_roster_convergence_loop.py`
  - `pipelines/sanguo-rag/full_roster_global_seed_pipeline.py`

## Patch Shape

The first governed pilot did not rewrite the full convergence runner. Instead, it extracted the `run_global_seed_pipeline` leaf into `full_roster_global_seed_pipeline.py` and preserved the original `run_global_seed_pipeline(...)` call signature as a wrapper inside `run_full_roster_convergence_loop.py`.

This keeps the change inside the approved leaf boundary while leaving the trunk orchestration, main entry flow, and external CLI contract untouched.

## Focused Dry-Run Smoke

A focused smoke harness was executed with temporary fixtures under `C:/tmp`:

- one scoreboard row with `nextLane = seed-to-card`
- one external evidence seed row
- `dry_run = true`

The wrapper `run_global_seed_pipeline(...)` was invoked through the original runner module so the smoke validated both the extracted leaf and the compatibility wrapper.

## Observed Result

- `enabled = true`
- `reason = null`
- `seedInputCount = 1`
- `selectedCount = 1`
- `allowlistReason = ok`
- merged seed file was written
- allowlist file was written
- harvest command payload remained `dry_run = true`
- score command payload remained `dry_run = true`
- promote command payload remained `dry_run = true`

## Meaning

TASK-ATS-0005 is now closed as a leaf-level legacy Python atomize/infect dry-run pass.

The important step forward is that the first real governed patch has begun inside a safe leaf boundary. ATM is no longer only producing dry-run proposals for `npc-brain`; it now has a concrete pilot extraction with a passing smoke result and without uncontrolled trunk mutation.