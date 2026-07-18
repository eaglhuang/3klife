# 3KLife Legacy Baseline Warning Baseline

Task: TASK-CID-0127

## Result

- Acknowledged legacy-baseline warnings: 266
- Total baseline entries after update: 307
- Audit ok before baseline refresh: true
- Scope: all current ATM_TASK_AUDIT_LEGACY_BASELINE_DONE findings are acknowledged by this card.
- Cross-repo packet warnings remain active for a later larger CID card.

## Remaining Warning Buckets Before This Baseline Takes Effect

- ATM_TASK_AUDIT_CROSS_REPO_DONE_WITHOUT_PACKET: total 541, active 541, acknowledged 0
- ATM_TASK_AUDIT_PLANNING_ONLY_DONE: total 41, active 0, acknowledged 41

## Validator

- `node scripts/validate-legacy-baseline-zero.cjs` must report `LEGACY_BASELINE_ACTIVE=0`.
