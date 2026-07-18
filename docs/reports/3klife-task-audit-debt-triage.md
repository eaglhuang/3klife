# 3KLife Task Audit Debt Triage

Generated: 2026-07-18T11:02:08.691Z

## Summary

- Findings: 881
- Errors: 48
- Warnings: 833

## Buckets

| Level | Code | Count | Distinct Tasks | First Repair Card |
| --- | --- | ---: | ---: | --- |
| error | ATM_TASK_AUDIT_MANUAL_DONE | 24 | 24 | CID repair required |
| error | ATM_TASK_AUDIT_TRANSITION_EVIDENCE_MISSING | 19 | 19 | CID repair required |
| error | ATM_TASK_AUDIT_TRANSITION_EVENT_MISSING | 5 | 5 | CID repair required |
| warning | ATM_TASK_AUDIT_CROSS_REPO_DONE_WITHOUT_PACKET | 539 | 530 | CID policy/ack or later repair |
| warning | ATM_TASK_AUDIT_LEGACY_BASELINE_DONE | 266 | 266 | CID policy/ack or later repair |
| warning | ATM_TASK_AUDIT_PLANNING_ONLY_DONE | 26 | 25 | CID policy/ack or later repair |
| warning | ATM_TASK_AUDIT_STALE_CLAIM | 1 | 1 | CID policy/ack or later repair |
| warning | ATM_TASK_AUDIT_STALE_FRAMEWORK_LOCK | 1 | 0 | CID policy/ack or later repair |

## Recommended CID Sequence

1. Manual/transition evidence errors: repair or formally reclassify target-authority cards that are done without ATM closure metadata.
2. Stale claim and stale framework lock warnings: run diagnose-first repair lanes, then commit/push their evidence.
3. Cross-repo done without packet warnings: reconcile only where target closure evidence exists; otherwise open closeback repair cards.
4. Legacy baseline done warnings: define an acknowledgement policy before mutating hundreds of historical cards.

## Samples

### ATM_TASK_AUDIT_MANUAL_DONE

- Level: error
- Count: 24
- Distinct tasks: 24

- TASK-ASP-0001: docs/ai_atomic_framework/adapter-guided-atomization-sdk/tasks/TASK-ASP-0001-atomization-planning-sdk-contract.task.md
  [target-authority] Task TASK-ASP-0001 is marked done without ATM CLI closure metadata.
- TASK-ASP-0002: docs/ai_atomic_framework/adapter-guided-atomization-sdk/tasks/TASK-ASP-0002-js-adapter-candidate-discovery.task.md
  [target-authority] Task TASK-ASP-0002 is marked done without ATM CLI closure metadata.
- TASK-ASP-0003: docs/ai_atomic_framework/adapter-guided-atomization-sdk/tasks/TASK-ASP-0003-python-adapter-sdk-promotion.task.md
  [target-authority] Task TASK-ASP-0003 is marked done without ATM CLI closure metadata.
- TASK-ASP-0004: docs/ai_atomic_framework/adapter-guided-atomization-sdk/tasks/TASK-ASP-0004-broker-candidate-bridge.task.md
  [target-authority] Task TASK-ASP-0004 is marked done without ATM CLI closure metadata.
- TASK-ASP-0005: docs/ai_atomic_framework/adapter-guided-atomization-sdk/tasks/TASK-ASP-0005-3klife-coordination-baseline.task.md
  [target-authority] Task TASK-ASP-0005 is marked done without ATM CLI closure metadata.
- TASK-AAO-0079: docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0079-framework-commit-range-baseline-forward-roll.task.md
  [target-authority] Task TASK-AAO-0079 is marked done without ATM CLI closure metadata.
- TASK-AAO-0080: docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0080-pre-push-hook-baseline-filter.task.md
  [target-authority] Task TASK-AAO-0080 is marked done without ATM CLI closure metadata.
- TASK-AAO-0081: docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0081-bootstrap-behavior-pack-ownership-backfill.task.md
  [target-authority] Task TASK-AAO-0081 is marked done without ATM CLI closure metadata.

### ATM_TASK_AUDIT_TRANSITION_EVIDENCE_MISSING

- Level: error
- Count: 19
- Distinct tasks: 19

- TASK-ASP-0005: docs/ai_atomic_framework/adapter-guided-atomization-sdk/tasks/TASK-ASP-0005-3klife-coordination-baseline.task.md
  Task TASK-ASP-0005 is missing lastTransitionId; status transitions must use ATM CLI.
- TASK-AAO-0079: docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0079-framework-commit-range-baseline-forward-roll.task.md
  Task TASK-AAO-0079 is missing lastTransitionId; status transitions must use ATM CLI.
- TASK-AAO-0080: docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0080-pre-push-hook-baseline-filter.task.md
  Task TASK-AAO-0080 is missing lastTransitionId; status transitions must use ATM CLI.
- TASK-AAO-0081: docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0081-bootstrap-behavior-pack-ownership-backfill.task.md
  Task TASK-AAO-0081 is missing lastTransitionId; status transitions must use ATM CLI.
- TASK-AAO-0082: docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0082-cid-backfill-atom-id-to-cid-sidecar.task.md
  Task TASK-AAO-0082 is missing lastTransitionId; status transitions must use ATM CLI.
- TASK-AAO-0083: docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0083-external-task-source-plugin-interface.task.md
  Task TASK-AAO-0083 is missing lastTransitionId; status transitions must use ATM CLI.
- TASK-AAO-0084: docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0084-atm-markdown-task-source-reference-plugin.task.md
  Task TASK-AAO-0084 is missing lastTransitionId; status transitions must use ATM CLI.
- TASK-AAO-0085: docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0085-context-map-schema-extension.task.md
  Task TASK-AAO-0085 is missing lastTransitionId; status transitions must use ATM CLI.

### ATM_TASK_AUDIT_TRANSITION_EVENT_MISSING

- Level: error
- Count: 5
- Distinct tasks: 5

- TASK-AAO-0148: docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0148-same-repo-close-bundle-and-scope-hardening.task.md
  Task TASK-AAO-0148 references missing transition event 2026-06-24T12-32-21-156Z-close-3a20c7d6439e.
- TASK-AAO-0190: docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0190-taskflow-close-auto-stage-and-status-migration.task.md
  Task TASK-AAO-0190 references missing transition event 2026-07-13T09-14-51-015Z-close-196d4154d238.
- TASK-AAO-FABLE-003: docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-FABLE-003-unify-closure-required-validator-readiness.task.md
  Task TASK-AAO-FABLE-003 references missing transition event 2026-07-12T16-11-31-194Z-close-54b5b9ed04e1.
- TASK-AAO-FABLE-005: docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-FABLE-005-multi-claim-residue-task-resolution.task.md
  Task TASK-AAO-FABLE-005 references missing transition event 2026-07-13T00-23-36-761Z-close-7e564e8c92e1.
- TASK-RFT-0015: docs/ai_atomic_framework/rft-hardening/tasks/TASK-RFT-0015-onefile-nested-launcher-recursion.task.md
  Task TASK-RFT-0015 references missing transition event 2026-07-06T15-43-01-848Z-close-f5d868566140.

### ATM_TASK_AUDIT_CROSS_REPO_DONE_WITHOUT_PACKET

- Level: warning
- Count: 539
- Distinct tasks: 530

- TASK-AAO-0148: .atm/history/tasks/TASK-AAO-0148.json
  [external-planning] Task TASK-AAO-0148 is done in a non-target repo without a target closure packet. Run "node atm.mjs tasks import" if you need to synchronize it as target-repo work.
- TASK-RFT-0020: .atm/history/tasks/TASK-RFT-0020.json
  [external-planning] Task TASK-RFT-0020 is done in a non-target repo without a target closure packet. Run "node atm.mjs tasks import" if you need to synchronize it as target-repo work.
- TASK-RFT-0021: .atm/history/tasks/TASK-RFT-0021.json
  [external-planning] Task TASK-RFT-0021 is done in a non-target repo without a target closure packet. Run "node atm.mjs tasks import" if you need to synchronize it as target-repo work.
- TASK-RFT-0022: .atm/history/tasks/TASK-RFT-0022.json
  [external-planning] Task TASK-RFT-0022 is done in a non-target repo without a target closure packet. Run "node atm.mjs tasks import" if you need to synchronize it as target-repo work.
- TASK-RFT-0023: .atm/history/tasks/TASK-RFT-0023.json
  [external-planning] Task TASK-RFT-0023 is done in a non-target repo without a target closure packet. Run "node atm.mjs tasks import" if you need to synchronize it as target-repo work.
- TASK-RFT-0024: .atm/history/tasks/TASK-RFT-0024.json
  [external-planning] Task TASK-RFT-0024 is done in a non-target repo without a target closure packet. Run "node atm.mjs tasks import" if you need to synchronize it as target-repo work.
- TASK-RFT-0025: .atm/history/tasks/TASK-RFT-0025.json
  [external-planning] Task TASK-RFT-0025 is done in a non-target repo without a target closure packet. Run "node atm.mjs tasks import" if you need to synchronize it as target-repo work.
- TASK-PAPER-HOTFILE-BLOCK-A: docs/ai_atomic_framework/arxiv-paper-v1/TASK-PAPER-HOTFILE-BLOCK-A.task.md
  [external-planning] Task TASK-PAPER-HOTFILE-BLOCK-A is done in a non-target repo without a target closure packet. Run "node atm.mjs tasks import" if you need to synchronize it as target-repo work.

### ATM_TASK_AUDIT_LEGACY_BASELINE_DONE

- Level: warning
- Count: 266
- Distinct tasks: 266

- TASK-APO-0000: docs/ai_atomic_framework/agent-pack-onboarding/tasks/TASK-APO-0000-doc-finalize.task.md
  [target-authority] Task TASK-APO-0000 is done via a legacy baseline transition; it is traceable but not equivalent to a fresh ATM CLI close.
- TASK-APO-0001: docs/ai_atomic_framework/agent-pack-onboarding/tasks/TASK-APO-0001-architecture-readme-crosslink.task.md
  [target-authority] Task TASK-APO-0001 is done via a legacy baseline transition; it is traceable but not equivalent to a fresh ATM CLI close.
- TASK-APO-0002: docs/ai_atomic_framework/agent-pack-onboarding/tasks/TASK-APO-0002-agent-pack-sdk-manifest.task.md
  [target-authority] Task TASK-APO-0002 is done via a legacy baseline transition; it is traceable but not equivalent to a fresh ATM CLI close.
- TASK-APO-0003: docs/ai_atomic_framework/agent-pack-onboarding/tasks/TASK-APO-0003-claude-code-pack-mvp.task.md
  [target-authority] Task TASK-APO-0003 is done via a legacy baseline transition; it is traceable but not equivalent to a fresh ATM CLI close.
- TASK-APO-0004: docs/ai_atomic_framework/agent-pack-onboarding/tasks/TASK-APO-0004-atmchart-render-pipeline.task.md
  [target-authority] Task TASK-APO-0004 is done via a legacy baseline transition; it is traceable but not equivalent to a fresh ATM CLI close.
- TASK-APO-0005: docs/ai_atomic_framework/agent-pack-onboarding/tasks/TASK-APO-0005-rule-justification-gate.task.md
  [target-authority] Task TASK-APO-0005 is done via a legacy baseline transition; it is traceable but not equivalent to a fresh ATM CLI close.
- TASK-APO-0006: docs/ai_atomic_framework/agent-pack-onboarding/tasks/TASK-APO-0006-multi-agent-pack-expansion.task.md
  [target-authority] Task TASK-APO-0006 is done via a legacy baseline transition; it is traceable but not equivalent to a fresh ATM CLI close.
- TASK-APO-0007: docs/ai_atomic_framework/agent-pack-onboarding/tasks/TASK-APO-0007-npm-create-atm.task.md
  [target-authority] Task TASK-APO-0007 is done via a legacy baseline transition; it is traceable but not equivalent to a fresh ATM CLI close.

### ATM_TASK_AUDIT_PLANNING_ONLY_DONE

- Level: warning
- Count: 26
- Distinct tasks: 25

- TASK-SKL-0001: .atm/history/tasks/TASK-SKL-0001.json
  [planning-only] Task TASK-SKL-0001 is marked done under planning authority and is not enforced as target-repo closure evidence in this repository. Run "node atm.mjs tasks import" if you need to synchronize it as target-repo work.
- TASK-AAO-0000: docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0000-doc-finalize-bridge-index.task.md
  [planning-only] Task TASK-AAO-0000 is marked done under planning authority and is not enforced as target-repo closure evidence in this repository. Run "node atm.mjs tasks import" if you need to synchronize it as target-repo work.
- TASK-AAO-0001: docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0001-report-overlap-matrix-routing.task.md
  [planning-only] Task TASK-AAO-0001 is marked done under planning authority and is not enforced as target-repo closure evidence in this repository. Run "node atm.mjs tasks import" if you need to synchronize it as target-repo work.
- TASK-AAO-0036: docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0036-aao-acceptance-test-plan-premises.task.md
  [planning-only] Task TASK-AAO-0036 is marked done under planning authority and is not enforced as target-repo closure evidence in this repository. Run "node atm.mjs tasks import" if you need to synchronize it as target-repo work.
- TASK-AAO-0060: docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0060-branch-and-worktree-archive-inventory-after-m16-operability-chain.task.md
  [planning-only] Task TASK-AAO-0060 is marked done under planning authority and is not enforced as target-repo closure evidence in this repository. Run "node atm.mjs tasks import" if you need to synchronize it as target-repo work.
- TASK-AAO-0103: docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0103-environment-workspace-hygiene-preflight.task.md
  [planning-only] Task TASK-AAO-0103 is marked done under planning authority and is not enforced as target-repo closure evidence in this repository. Run "node atm.mjs tasks import" if you need to synchronize it as target-repo work.
- TASK-AAO-0111: docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0111-atm-taskflow-dry-run-orchestrator.task.md
  [planning-only] Task TASK-AAO-0111 is marked done under planning authority and is not enforced as target-repo closure evidence in this repository. Run "node atm.mjs tasks import" if you need to synchronize it as target-repo work.
- TASK-CID-0001: docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0001-cid-hardening-control-plane-bootstrap.task.md
  [planning-only] Task TASK-CID-0001 is marked done under planning authority and is not enforced as target-repo closure evidence in this repository. Run "node atm.mjs tasks import" if you need to synchronize it as target-repo work.

### ATM_TASK_AUDIT_STALE_CLAIM

- Level: warning
- Count: 1
- Distinct tasks: 1

- TASK-CID-0091: .atm/history/tasks/TASK-CID-0091.json
  Task TASK-CID-0091 is running but claim lease lease-bb5029ed1277 for actor captain expired (ttl 1800s, last heartbeat 2026-06-15T16:58:15.009Z); the backlog entry is stalled. Run "node atm.mjs tasks repair-claim --task TASK-CID-0091 --actor <id> --json" to diagnose and clear it.

### ATM_TASK_AUDIT_STALE_FRAMEWORK_LOCK

- Level: warning
- Count: 1
- Distinct tasks: 0

- (no task id): .atm/runtime/locks/ATM-FRAMEWORK-TEMP-001.lock.json
  Framework-mode lock for actor 001 is stale-ttl-expired (locked at 2026-06-09T00:01:14.672Z); run "node atm.mjs framework-mode release --actor "001" --json" to clear the stalled lock.
