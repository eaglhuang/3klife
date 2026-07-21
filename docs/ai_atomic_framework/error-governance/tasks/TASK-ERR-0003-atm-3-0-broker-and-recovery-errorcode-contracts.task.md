---
task_id: TASK-ERR-0003
title: ATM 3.0 broker and recovery ErrorCode contracts
status: planned
owner: atm-error-governance
priority: P0
milestone: ATM-3.0-A0
severity: P0
depends_on: []
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "ERR is the registered owner for new exact ErrorCode contracts; Plan 3.0 GOV cards consume but do not register these codes."
scopePaths:
  - "docs/governance/error-code-registry.json"
  - "docs/ERROR_CODES.md"
  - "tests/cli/atm-3-error-contract.test.ts"
deliverables:
  - "docs/governance/error-code-registry.json"
  - "docs/ERROR_CODES.md"
  - "tests/cli/atm-3-error-contract.test.ts"
validators:
  - "node --strip-types tests/cli/atm-3-error-contract.test.ts"
  - "npm run generate:error-codes"
  - "npm run validate:cli"
  - "npm run validate:schemas"
  - "npm run typecheck"
  - "git diff --check"
errorCodes:
  - "ATM_BROKER_STATE_DIVERGENCE"
  - "ATM_EVIDENCE_SEAL_REQUIRED"
  - "ATM_BROKER_TICKET_STALE_GENERATION"
  - "ATM_BROKER_AUTHORIZATION_DIMENSION_MISMATCH"
  - "ATM_SCOPE_AMENDMENT_REQUIRED"
  - "ATM_BROKER_REARBITRATION_REQUIRED"
  - "ATM_RUNNER_SYNC_ORPHAN"
createdByCommand: atm plan card create
evidence:
  required: command-backed
producer:
  - "Exact registry contracts and generated documentation for ATM 3.0 errors."
consumer:
  - "ATM-GOV-0226"
  - "ATM-GOV-0227"
  - "ATM-GOV-0228"
  - "ATM-GOV-0229"
  - "ATM-GOV-0230"
  - "ATM-GOV-0233"
  - "ATM-GOV-0234"
missingData:
  - "Reuse any existing exact or prefix contract whose trigger and recovery semantics are truly identical."
dataDrivenStopRule:
  - "Stop if a code lacks trigger, retryability, approval requirement, status command and executable recovery manifest."
  - "Stop if docs/ERROR_CODES.md would be edited by hand instead of generated."
out_of_scope:
  - "No broker, parser, runner-sync or projection product implementation."
  - "No registry relocation or second ErrorCode catalog."
rollback:
  strategy: revert-commit
  notes: "Revert registry and generated documentation together; consumers must not land before this contract."
atomizationImpact:
  ownerAtomOrMap: "atm.error-code-registry"
  mapUpdates: []
  extractionCandidates:
    - atom: "atm.error-code-registry.canonical-document"
      pattern: "Single canonical machine-readable ErrorCode registry"
      source: "docs/governance/error-code-registry.json"
      disposition: inline
      inlineReason: "Keep one schema-validated canonical registry; splitting would create multiple authorities and violate the registered catalog contract."
    - atom: "atm.error-code-registry.generated-index"
      pattern: "Generator-owned public ErrorCode index"
      source: "docs/ERROR_CODES.md"
      disposition: inline
      inlineReason: "This file is generated from the canonical registry and must not be manually extracted or edited as a second source."
---

# TASK-ERR-0003 ATM 3.0 broker and recovery ErrorCode contracts

## Intent

先為 Plan 3.0 會實際 emit 的新錯誤建立 canonical exact contracts，避免 GOV 卡自行發明未註冊 ErrorCode。若現有 code 語意完全相同就重用，不為名稱好看而增生。

## Required Work

- 盤點 exact 與 prefix registry，逐一決定 reuse 或 register。
- 每個 code 定義 trigger、category、retryability、human approval、status command、ordered recovery manifests、source owner 與 tests。
- 維度不符授權必須回傳 canonical ticket、requested/granted resource dimension 與可執行的 re-arbitration recovery，不得退化成 task-id 白名單或裸拒絕。
- 由 generator 更新 `docs/ERROR_CODES.md`。

## Acceptance

- [ ] 七個列名 code 都有 exact contract，或有證據證明由既有 exact/prefix contract 完整涵蓋並同步改用既有名稱。
- [ ] recovery 使用 `atm.commandManifest.v1` 或 ordered manifests，預設 `shell=false`。
- [ ] 每個 GOV consumer 只引用已註冊名稱。
- [ ] generated docs 與 registry digest 一致。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-21T01:45:26.818Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"error-governance/tasks/TASK-ERR-0003-atm-3-0-broker-and-recovery-errorcode-contracts.task.md","contentDigest":"sha256:37641d19aab6b1f00024ccd68fcaae6db46b33380bbd41e4fa56d890b5a85812"} -->
