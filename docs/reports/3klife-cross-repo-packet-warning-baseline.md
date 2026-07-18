# 3KLife Cross-Repo Packet Warning Baseline

Task: TASK-CID-0128

## Result

- Acknowledged cross-repo packet warnings: 544
- Total baseline entries after update: 855
- Audit ok before baseline refresh: true
- Scope: all current ATM_TASK_AUDIT_CROSS_REPO_DONE_WITHOUT_PACKET findings are acknowledged by this card.
- Post-close refresh also acknowledged ATM-GOV-0171, which appeared as a new cross-repo packet finding while this card was being closed.
- Legacy-baseline and planning-only warning buckets must remain at zero active findings.
- Acknowledged planning-only warnings after closeback refresh: 45

## Warning Buckets Before This Baseline Takes Effect

- ATM_TASK_AUDIT_CROSS_REPO_DONE_WITHOUT_PACKET: total 543, active 543, acknowledged 0
- ATM_TASK_AUDIT_LEGACY_BASELINE_DONE: total 266, active 0, acknowledged 266
- ATM_TASK_AUDIT_PLANNING_ONLY_DONE: total 43, active 0, acknowledged 43

## Validator

- `node scripts/validate-cross-repo-packet-baseline.cjs` must report `CROSS_REPO_PACKET_ACTIVE=0`.
- `node scripts/validate-legacy-baseline-zero.cjs` must report `LEGACY_BASELINE_ACTIVE=0`.
- `node scripts/validate-planning-only-baseline.cjs` must report `PLANNING_ONLY_ACTIVE=0`.
