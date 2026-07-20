---
task_id: TASK-ERR-0002
title: Error and recovery contract
status: planned
owner: atm-governance
priority: P0
milestone: P0
severity: P0
depends_on:[]
related_plan: error-governance/error-governance-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "ERR is the registered error-governance family; ErrorCode catalog work must not consume GOV numbers."
scopePaths:
  - "docs/governance/error-code-registry.json"
  - "docs/ERROR_CODES.md"
  - "packages/cli/src/commands/next/**"
  - "packages/cli/src/commands/broker/**"
  - "packages/cli/src/commands/tasks/**"
  - "packages/cli/src/commands/tasks/plan-import-boundary.ts"
  - "tests/cli/error-recovery-contract.test.ts"
  - "tests/cli/task-import-diagnostic-contract.test.ts"
deliverables:
  - "docs/governance/error-code-registry.json"
  - "docs/ERROR_CODES.md"
  - "packages/cli/src/commands/next/**"
  - "packages/cli/src/commands/broker/**"
  - "packages/cli/src/commands/tasks/**"
  - "tests/cli/error-recovery-contract.test.ts"
  - "tests/cli/task-import-diagnostic-contract.test.ts"
validators:
  - "node --strip-types tests/cli/error-recovery-contract.test.ts"
  - "node --strip-types tests/cli/task-import-diagnostic-contract.test.ts"
  - "npm run generate:error-codes"
  - "npm run validate:cli"
  - "npm run validate:schemas"
  - "npm run typecheck"
  - "git diff --check"
errorCodes:
  - "ATM_RUNNER_SYNC_STALE_SHA"
  - "ATM_TASK_ID_NORMALIZATION_MISMATCH"
  - "ATM_ORPHAN_CLAIM_ADOPTABLE"
  - "ATM_TICKET_ADOPT_REQUIRED"
  - "ATM_TICKET_CANCEL_REQUIRED"
  - "ATM_SIDE_EFFECT_RECONCILE_REQUIRED"
  - "ATM_ATOMIC_WRITE_RETRY_EXHAUSTED"
  - "ATM_RUNNER_RECEIPT_MISSING"
  - "ATM_TASKS_PLAN_EMPTY"
  - "ATM_TASK_IMPORT_REFERENCE_ONLY_ID_FRAGMENT"
createdByCommand: atm plan card create
evidence:
  required: command-backed
producer:
  - "Registered ErrorCode catalog and executable recovery commands."
consumer:
  - "ATM-GOV-0217"
  - "ATM-GOV-0218"
  - "ATM-GOV-0219"
  - "ATM-GOV-0220"
missingData:
  - "Exact existing registry names must be reused when semantics match."
  - "The fenced-code-block parser defect from ATM-BUG-2026-07-20-216 must be reduced to a focused fixture before choosing whether to reuse or refine existing task import ErrorCodes."
dataDrivenStopRule:
  - "Stop if a recovery command is prose-only or omits actor/task/files flags."
  - "Stop if docs/ERROR_CODES.md is hand-edited instead of generated."
  - "Stop if task import diagnostics point at a line that does not contain the triggering fragment or recovery hint."
out_of_scope:
  - "No registry location migration."
  - "No product implementation beyond emitter/tests needed to prove the codes."
rollback:
  strategy: revert-commit
  notes: "Revert the delivery commit and dispose generated artifacts through formal ATM commands; do not edit .atm runtime state directly."
atomizationImpact:
  ownerAtomOrMap: "atm.error-code-registry"
  mapUpdates:
  - "atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json"
  extractionCandidates:[]
---

# TASK-ERR-0002 Error and recovery contract

## Intent

為 stale SHA、task ID 正規化、orphan claim、ticket adopt/cancel/reconcile、atomic write、runner receipt 與 task-import parser diagnostics 等情況註冊正式 ErrorCode，並提供完整可執行 recovery command。

## Required Work

- 盤點 registry 與 prefixRules，重用相同語意，必要時註冊新 exact code。
- 每個 code 記錄 trigger、category、retryability、human approval、recovery command、source owner、tests。
- 更新 emitters，讓 CLI JSON 回 structured details、statusCommand、nextAction。
- 覆蓋 task-import parser diagnostic contract：fenced code block 裡的 shell-style comment 不得被當作 Markdown heading；若回 `ATM_TASKS_PLAN_EMPTY` 或 `ATM_TASK_IMPORT_REFERENCE_ONLY_ID_FRAGMENT`，診斷必須指向真實觸發行並給可執行 recovery。
- 執行 `npm run generate:error-codes`，不得手改 generated docs。

## Acceptance

- [ ] 所有列名錯誤都有 exact 或 prefix-documented registry entry。
- [ ] 每個 code 都有 executable recovery command 且測試驗證可直接執行。
- [ ] docs/ERROR_CODES.md 由 generator 更新且與 registry 一致。
- [ ] 相關 CLI failure JSON 含 code/retryability/approval/statusCommand/nextAction。
- [ ] `ATM-BUG-2026-07-20-216` 的 parser fixture 產生正確診斷；不得把 fenced code block 內的 shell-style comment 誤判成任務 heading。

## Verification

```bash
node --strip-types tests/cli/error-recovery-contract.test.ts
node --strip-types tests/cli/task-import-diagnostic-contract.test.ts
npm run generate:error-codes
npm run validate:cli
npm run validate:schemas
npm run typecheck
git diff --check
```

## Public Interfaces / Evidence

- docs/governance/error-code-registry.json
- docs/ERROR_CODES.md

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-20T13:48:21.705Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"error-governance/tasks/TASK-ERR-0002-error-and-recovery-contract.task.md","contentDigest":"sha256:9cab319dfa8d883429cc2e86b7673a7c7bb267d320fa80371706a583f6cab27d"} -->
