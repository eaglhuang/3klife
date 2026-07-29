---
doc_id: doc_git_boundary_admission_tasks_0001
owner: atm-core
status: active
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
created_at: 2026-06-23
related_plan: docs/ai_atomic_framework/git-boundary-admission/git-boundary-admission-plan.md
completed_at: 2026-06-23T07:26:40.163Z
updated_at: 2026-07-29T12:00:00+08:00
---

# GIT Boundary Admission Task Index

Related plan: [../git-boundary-admission-plan.md](../git-boundary-admission-plan.md)

## Task Card Contract

Every `TASK-GIT-*` card is a planning card for the ATM framework repository unless explicitly marked otherwise. Execution must still go through ATM `next`, claim, broker admission, validators, evidence, and closeout.

## MVP Completion Pack

| Task ID | Stage | Planned Title | Status | Depends | Target |
|---|---|---|---|---|---|
| [TASK-GIT-0001](./TASK-GIT-0001-pre-push-admission-architecture-contract.task.md) | G0 | Pre-push admission architecture contract | done | none | docs / contracts |
| [TASK-GIT-0002](./TASK-GIT-0002-git-diff-to-mutation-request-converter.task.md) | G1 | Git diff to mutation request converter | done | TASK-GIT-0001 | CLI / core |
| [TASK-GIT-0003](./TASK-GIT-0003-format-adapter-remote-diff-bridge.task.md) | G1 | Format adapter remote diff bridge | done | TASK-GIT-0002 | core / adapters |
| [TASK-GIT-0004](./TASK-GIT-0004-git-admission-cli.task.md) | G1 | Git admission CLI surface | done | TASK-GIT-0002, TASK-GIT-0003 | CLI |
| [TASK-GIT-0005](./TASK-GIT-0005-pre-push-hook-installer.task.md) | G2 | Pre-push hook installer | done | TASK-GIT-0004 | integration |
| [TASK-GIT-0006](./TASK-GIT-0006-git-boundary-evidence-envelope.task.md) | G2 | Git boundary evidence envelope | done | TASK-GIT-0004 | evidence |
| [TASK-GIT-0007](./TASK-GIT-0007-neutral-steward-git-apply-dry-run.task.md) | G2 | Neutral steward Git apply dry-run | done | TASK-GIT-0004, TASK-GIT-0006 | broker / steward |
| [TASK-GIT-0008](./TASK-GIT-0008-structured-file-fixture-suite.task.md) | G3 | Structured file fixture suite | done | TASK-GIT-0007 | tests |
| [TASK-GIT-0009](./TASK-GIT-0009-post-push-fail-fallback.task.md) | G3 | Post-push-fail fallback | done | TASK-GIT-0004, TASK-GIT-0006 | CLI |
| [TASK-GIT-0010](./TASK-GIT-0010-operator-policy-and-bypass-audit.task.md) | G3 | Operator policy and bypass audit | done | TASK-GIT-0005, TASK-GIT-0009 | policy / docs |
| [TASK-GIT-0011](./TASK-GIT-0011-adopter-docs-and-runbook.task.md) | G4 | Adopter docs and runbook | done | TASK-GIT-0010 | docs |
| [TASK-GIT-0012](./TASK-GIT-0012-end-to-end-dogfood-and-paper-evidence.task.md) | G4 | End-to-end dogfood and paper evidence | done | TASK-GIT-0008, TASK-GIT-0011 | evidence |
| [TASK-GIT-0013](./TASK-GIT-0013-agent-raw-git-deny-and-atm-git-tool-gate.task.md) | G5 | Agent raw Git deny and ATM Git tool gate | done | TASK-GIT-0010, TASK-GIT-0011 | integrations / command policy |
| [TASK-GIT-0014](./TASK-GIT-0014-atm-git-push-wrapper-and-tool-only-push-lane.task.md) | G6 | ATM Git push wrapper and tool-only push lane | done | TASK-GIT-0013 | CLI / integrations / pre-push |
| [TASK-GIT-0015](./TASK-GIT-0015-broker-owned-staging-index-arbitration.task.md) | G7 | Broker-owned staging index arbitration for parallel agents | planned | TASK-GIT-0013, TASK-GIT-0014 | broker / index / command policy |
| [TASK-GIT-0016](./TASK-GIT-0016-restricted-external-worker-execution-surface-and-atm-only-guidance.task.md) | G8 | Restricted external-worker execution surface and ATM-only guidance | done | TASK-GIT-0015 | worker runtime / integrations / skills |
| [TASK-GIT-0017](./TASK-GIT-0017-runner-publication-inventory-and-framework-temp-commit-surface-parity.task.md) | G9 | Runner publication inventory and framework-temp claim/commit-surface parity | done | TASK-GIT-0016 | runner-sync / framework-temp / publication |
| [TASK-GIT-0018](./TASK-GIT-0018-brokered-external-worker-launcher-and-capability-bound-process-execution.task.md) | G10 | Claim-issued work-admission ticket authority, attribution, and recovery | planned | TASK-GIT-0016, TASK-GIT-0017 | claim / ticket / policy-controlled recovery |
| [TASK-GIT-0019](./TASK-GIT-0019-adapter-enforcement-capability-attestation-and-fail-closed-write-dispatch.task.md) | G11 | Unified ticket coverage gates and cross-adapter rollout evidence | planned | TASK-GIT-0018 | Police / Broker / review / commit / close / push |
| [TASK-GIT-0020](./TASK-GIT-0020-protected-governance-state-integrity-chain-and-bypass-detection.task.md) | G12 | Protected governance-state integrity chain and bypass detection | superseded | TASK-GIT-0018, TASK-GIT-0019 | merged into ticket authority and coverage gates |
| [TASK-GIT-0021](./TASK-GIT-0021-cross-adapter-controlled-execution-dogfood-and-rollout-evidence.task.md) | G13 | Cross-adapter controlled-execution dogfood and rollout evidence | superseded | TASK-GIT-0019 | merged into rollout acceptance |
| [TASK-GIT-0027](./TASK-GIT-0027-index-lease-consumption-and-atomic-staged-bundle-parking.task.md) | G7.1 | Index lease consumption and atomic staged-bundle parking | planned | TASK-GIT-0015 | governed index lease authority |
| [TASK-GIT-0028](./TASK-GIT-0028-task-scoped-commit-transaction-adapter-extraction-and-index-lease-bridge.task.md) | G7.2 | Task-scoped commit transaction adapter extraction and index lease bridge | planned | TASK-GIT-0015, TASK-GIT-0027 | shared commit / closeout transaction adapter |

## Sequencing Note

The first production-worthy milestone is `TASK-GIT-0001` through `TASK-GIT-0008`. `TASK-GIT-0009` and `TASK-GIT-0010` make the operator experience safe under real Git failures and bypasses. `TASK-GIT-0011` and `TASK-GIT-0012` convert the implementation into adopter-ready documentation and paper-ready evidence.

## Post-MVP Hard-Gate Extension

`TASK-GIT-0013` was added after Team Agents dogfood exposed a stronger multi-agent safety requirement: local hooks and ATM CLI checks are not enough when an AI agent has unrestricted shell access to raw destructive Git commands. The G5 extension makes raw Git mutation denied by default in supported AI integrations and routes Git mutations through ATM-governed tools, Broker index lanes, and scoped emergency leases.

`TASK-GIT-0014` follows from the `TASK-GIT-0013` closeout: ATM can admit a push, and the pre-push hook can guard a commit range, but the final remote mutation still happens through raw host `git push`. The G6 extension adds a governed `atm git push` wrapper and makes supported integrations route raw push attempts to that wrapper.

`TASK-GIT-0015` formalizes the emergency `TASK-AAO-0189` plan created from `ATM-BUG-2026-07-12-161`: raw Git denial and governed push are not enough while multiple agents share one Git index. The G7 extension makes the staging index a Broker-owned lane, blocks foreign-active unstage/restore/reset/clean operations by default, and introduces explicit stage-only and destructive override leases with audit evidence.

`TASK-GIT-0016` turns the remaining policy-only boundary into an execution boundary. It introduces one restricted gateway for external workers, denies interpreter and raw-shell mutation escapes, and makes ATM entry skills plus structured CLI guidance consistently point back to approved ATM commands rather than native mutation shortcuts.

`TASK-GIT-0017` corrects the runner publication seam exposed by G8 closeout: all sealed build outputs, including top-level package dist, manifests, and steward receipts, must have one inventory-backed ATM publication path. Runner freshness must fail closed when that publication remains incomplete.

`TASK-GIT-0018` and `TASK-GIT-0019` replace the earlier four-card controlled
execution continuation. Claim now atomically issues one content-addressed
work-admission ticket derived from the task card. Native writes remain possible
on unrestricted hosts, but they cannot advance through ATM or protected-branch
acceptance without ticket coverage or an explicit recovery disposition.
Snapshot recovery is separately controlled by
`workAdmission.recoveryMode: auto | enabled | disabled`; disabling snapshots
removes their disk I/O but does not disable any admission or delivery gate.
`TASK-GIT-0020` and `TASK-GIT-0021` are planning-only superseded records and
must not be imported or claimed.
