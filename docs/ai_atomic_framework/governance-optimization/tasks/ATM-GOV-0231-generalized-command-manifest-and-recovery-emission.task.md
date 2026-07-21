---
task_id: ATM-GOV-0231
title: Generalized command manifest and recovery emission
status: planned
owner: atm-cli
priority: P0
milestone: ATM-3.0-B
severity: P1
depends_on:
  - ATM-GOV-0226
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns cross-command executable recovery and framework self-hosting UX; ErrorCodes remain in the existing ERR registry."
scopePaths:
  - "packages/cli/src/commands/shared/identity-normalization.ts"
  - "packages/cli/src/commands/shared/command-manifest.ts"
  - "packages/cli/src/commands/framework-development/runner-sync-admission.ts"
  - "packages/cli/src/commands/git-governance/implementation.ts"
  - "packages/cli/src/commands/taskflow/implementation.ts"
  - "packages/core/src/schemas/command-manifest.ts"
  - "schemas/atm.command-manifest.v1.schema.json"
  - "tests/cli/command-manifest-recovery-chain.test.ts"
  - "tests/cli/framework-temp-task-id-normalization.test.ts"
deliverables:
  - "packages/cli/src/commands/shared/identity-normalization.ts"
  - "packages/cli/src/commands/shared/command-manifest.ts"
  - "packages/core/src/schemas/command-manifest.ts"
  - "schemas/atm.command-manifest.v1.schema.json"
  - "tests/cli/command-manifest-recovery-chain.test.ts"
  - "tests/cli/framework-temp-task-id-normalization.test.ts"
validators:
  - "node --strip-types tests/cli/command-manifest-recovery-chain.test.ts"
  - "node --strip-types tests/cli/framework-temp-task-id-normalization.test.ts"
  - "npm run validate:cli"
  - "npm run validate:schemas"
  - "npm run typecheck"
  - "git diff --check"
errorCodes:
  - "ATM_TASK_ID_NORMALIZATION_MISMATCH"
  - "ATM_RUNNER_SYNC_STALE_SHA"
  - "ATM_RUNNER_RECEIPT_MISSING"
createdByCommand: atm plan card create
evidence:
  required: command-backed
producer:
  - "Executable recovery manifests with input/output digests."
consumer:
  - "ATM-GOV-0233"
missingData:
  - "Existing emitters and normalizers must be discovered by symbol/call-site inventory before extraction."
dataDrivenStopRule:
  - "Stop if a helper branches on a named actor, task id, skill id or incident path."
  - "Stop if a displayed command omits a prerequisite or cannot round-trip through argv without a shell."
out_of_scope:
  - "No runner-sync reservation state transition implementation; ATM-GOV-0230 owns it."
  - "No second command model beyond atm.commandManifest.v1."
rollback:
  strategy: revert-commit
  notes: "Revert emitter/helper changes while keeping queue-only behavior; do not restore dotted-id divergence."
atomizationImpact:
  ownerAtomOrMap: "atm.cli.command-manifest"
  mapUpdates: []
  extractionCandidates:
    - "Extract normalization and manifest composition from oversized implementation modules before adding behavior."
---

# ATM-GOV-0231 Generalized command manifest and recovery emission

## Intent

統一 temp task ID 的 mint/lookup/render 語意，並把 recovery 從不完整 shell 字串改為可執行的 ordered argv manifests。helper 必須泛用且放在共享 ownership 下，不得為 0014 或某 actor 寫死。

## Required Work

- inventory 所有 actor/task normalization call sites，收斂到單一 helper 與契約測試。
- recovery chain 明列 capability check、framework temp claim、完整 files、runner-sync enqueue/build/release prerequisite。
- manifest 帶 cwd、allowlisted env reference、timeout、input/output digest，預設 `shell=false`。
- deprecated display 由 manifest render，不維護另一份字串組裝邏輯。

## Acceptance

- [ ] dotted/space/Unicode actor fixtures 在 mint、lookup、render 得到同一 canonical id。
- [ ] emitted recovery chain 可在隔離 fixture repo 逐步執行，不需人工補旗標。
- [ ] Windows quoting/path fixture 不經 shell 仍 round-trip。
- [ ] call-site inventory 不再出現私有 identity regex 或第二套 command string authority。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-21T01:22:37.332Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0231-generalized-command-manifest-and-recovery-emission.task.md","contentDigest":"sha256:37e7c0236602f8c782e109b3f2e4bd58034d741bb6cbfed306cdb08bc211fef4"} -->
