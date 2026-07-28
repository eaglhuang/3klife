---
task_id: ATM-GOV-0229
title: Linked surface scope closure inference
status: done
owner: atm-taskflow
priority: P0
milestone: ATM-3.0-B1
severity: P1
depends_on:
  - ATM-GOV-0231
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns claim/scope admission and linked generated-surface governance."
scopePaths:
  - "packages/core/src/scope/linked-surface/**"
  - "packages/core/src/schemas/linked-surface-closure.ts"
  - "schemas/atm.linked-surface-closure.v1.schema.json"
  - "packages/cli/src/commands/tasks/scope-preflight/**"
  - "packages/cli/src/commands/tasks/scope-amendment/**"
  - "tests/cli/linked-surface-scope-preflight.test.ts"
  - "tests/cli/scope-amendment-rearbitration.test.ts"
deliverables:
  - "packages/core/src/scope/linked-surface/**"
  - "schemas/atm.linked-surface-closure.v1.schema.json"
  - "packages/cli/src/commands/tasks/scope-preflight/**"
  - "packages/cli/src/commands/tasks/scope-amendment/**"
  - "tests/cli/linked-surface-scope-preflight.test.ts"
  - "tests/cli/scope-amendment-rearbitration.test.ts"
validators:
  - "node --strip-types tests/cli/linked-surface-scope-preflight.test.ts"
  - "node --strip-types tests/cli/scope-amendment-rearbitration.test.ts"
  - "npm run validate:cli"
  - "npm run validate:schemas"
  - "npm run typecheck"
  - "git diff --check"
errorCodes:
  - "ATM_SCOPE_AMENDMENT_REQUIRED"
  - "ATM_BROKER_REARBITRATION_REQUIRED"
createdByCommand: atm plan card create
evidence:
  required: command-backed
producer:
  - "Linked-surface closure and pre-write rearbitration receipts."
consumer:
  - "ATM-GOV-0233"
missingData:
  - "Unregistered generators must produce unsupported receipts and cannot be inferred by filename convention alone."
dataDrivenStopRule:
  - "Stop if relationships are encoded as a list of known skill paths or task ids."
  - "Stop if amendment merely widens a direction lock without updating the ticket read/write set."
out_of_scope:
  - "No automatic write to derived surfaces; this card only closes scope and rearbitrates."
  - "No host-specific integration path policy in core."
rollback:
  strategy: revert-commit
  notes: "Revert graph inference and return unsupported surfaces as explicit preflight findings; do not silently omit them."
atomizationImpact:
  ownerAtomOrMap: "atm.scope.linked-surface"
  mapUpdates: []
  extractionCandidates: []
completed_at: "2026-07-21T07:20:48.432Z"
completed_by_agent: "codex-plan3-captain-20260721-02"
closedAt: "2026-07-21T07:20:48.432Z"
closedByActor: "codex-plan3-captain-20260721-02"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-21T07-20-48-343Z-close-e76d9b32bcb4"
lastTransitionAt: "2026-07-21T07:20:48.432Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "3683b8090296e46c44b6a45247038a36ee3c7fd7"
---

# ATM-GOV-0229 Linked surface scope closure inference

## Intent

在 claim 前把一項修改會連動的 template、compiler、validator、editor projection、manifest 與 build output 算成 scope closure，避免直到 commit gate 才發現漏檔。這不是因重疊而放大 scope，而是用已註冊關係取得最小完整閉包。

## Required Work

- 建立 typed relationship registry/graph traversal，支援 cycle、optional edge、unsupported producer 與 provenance。
- scope preflight 回傳 required/optional/unavailable surfaces 與 broker overlap facts。
- implementation 中新增 edge 時，在任何 write 前建立新版 closure 並 re-arbitrate。
- 以 skill template projection 作 fixture，但演算法不得識別特定 skill id。

## Acceptance

- [ ] 0014/0015 相同形狀 fixture 在 claim 前列出三個 shared/linked surfaces。
- [ ] disjoint graph 不被錯誤擴大；cycle 能 deterministic 收斂。
- [ ] 新增 linked surface 時先更新 ticket 再授權 write，commit gate 不再是首次發現點。
- [ ] 無 task/path/actor hardcode，INV-ATM-009 測試通過。
- [ ] source 與 frozen `node atm.mjs` 對相同 scope-closure/re-arbitration probe 的 canonical behavior projection digest 一致，runner digest 已封存。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-21T01:22:31.618Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0229-linked-surface-scope-closure-inference.task.md","contentDigest":"sha256:7d2eeca03d63cb32c330edee4058bd98294e641b0aa31e23b96e42b2eaf3a142"} -->
