<!-- doc_id: doc_other_0110 -->
# ATM Living Spec Sync Contract

This document defines how ATM "Living Spec" synchronization works across tasks, milestones, and governance docs.

## 1. Source of Truth Order

Use a single truth chain:

1. `docs/tasks/tasks-atm/tasks-atm-part-*.json` (task shards)
2. `docs/tasks/tasks-atm.json` summary (generated)
3. `docs/ai_atomic_framework/atm-evolution-plan-shards/atm-framework-stabilization-milestones.md` (generated snapshot)

Milestone numbers must be generated from the task-store snapshot, not manually edited guesses.

## 2. Sync Workflow

After any ATM task status change:

1. Update task card and corresponding shard entry.
2. Run:
   - `node tools_node/sync-atm-stabilization-milestone.js`
3. Verify:
   - `node tools_node/sync-atm-stabilization-milestone.js --check --strict`
   - `node tools_node/check-doc-shard-health.js`

## 3. Drift Model

Drift categories:

1. `status_drift`: task card status and shard status differ.
2. `summary_drift`: `tasks-atm.json` summary differs from shard counts.
3. `milestone_drift`: milestone baseline differs from current task-store counts.
4. `contract_drift`: semver/compatibility/governance docs disagree on public rules.

## 4. Drift Prompt Contract

When drift is detected, generate a prompt payload that matches
`schemas/pev/spec-drift-prompt.schema.json`, including:

1. drift type and affected artifacts,
2. atom compatibility impact,
3. semver recommendation,
4. required evidence to resolve.

## 5. Proposal-Only Promotion Rule

Living Spec sync never auto-promotes status.
Any governance-impacting change must go through reviewable proposal artifacts.

## 6. Ownership

1. Task owner updates card + shard.
2. Release/governance owner verifies milestone sync.
3. Validator owner confirms deterministic evidence.

## 7. References

1. `docs/PEV_LOOP.md`
2. `docs/UPGRADE_PROPOSAL_PUBLIC_RULES.md`
3. `docs/RELEASE_CHECKLIST.md`
