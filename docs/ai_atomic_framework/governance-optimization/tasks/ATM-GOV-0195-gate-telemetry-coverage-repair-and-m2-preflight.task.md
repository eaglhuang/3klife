---
task_id: ATM-GOV-0195
title: Gate telemetry coverage repair and M2 preflight
status: done
owner: atm-governance
priority: P0
depends_on:
  - ATM-GOV-0193
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/telemetry/**
  - packages/cli/src/commands/telemetry.ts
  - packages/cli/src/commands/command-specs/telemetry.spec.ts
  - packages/cli/src/commands/taskflow/**
  - packages/cli/src/commands/batch/**
  - packages/cli/src/commands/broker/**
  - packages/cli/src/commands/team/**
  - scripts/validate-gate-telemetry-coverage.ts
  - tests/cli/gate-telemetry-coverage-repair.test.ts
deliverables:
  - packages/core/src/telemetry/**
  - packages/cli/src/commands/telemetry.ts
  - packages/cli/src/commands/command-specs/telemetry.spec.ts
  - packages/cli/src/commands/taskflow/**
  - packages/cli/src/commands/batch/**
  - packages/cli/src/commands/broker/**
  - packages/cli/src/commands/team/**
  - scripts/validate-gate-telemetry-coverage.ts
  - tests/cli/gate-telemetry-coverage-repair.test.ts
validators:
  - node --strip-types tests/cli/gate-telemetry-coverage-repair.test.ts
  - node --strip-types scripts/validate-gate-telemetry-coverage.ts --mode validate
  - npm run typecheck
  - npm run validate:cli
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.gate-telemetry
  mapUpdates: []
  extractionCandidates:
    - atom: atm.gate-telemetry-coverage
      pattern: Coverage Validator
      source: packages/core/src/telemetry/
      disposition: extract
      inlineReason: null
surfaceFamily: gate-telemetry
completed_at: "2026-07-19T14:17:32.775Z"
completed_by_agent: "codex-governance-optimizer"
closedAt: "2026-07-19T14:17:32.775Z"
closedByActor: "codex-governance-optimizer"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-19T14-17-32-636Z-close-6310463b18ac"
lastTransitionAt: "2026-07-19T14:17:32.775Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "4a2323a8ed7f8d26af51191b78b7ba1eaa032fc4"
---

# ATM-GOV-0195 Gate telemetry coverage repair and M2 preflight

## Intent

修補 ATM-GOV-0193 與 ATM-GOV-0190 之間的實證缺口：0193 已提供 gate telemetry 基座，但 0190 進行 M2 matched cohort / gate retirement 前，必須有機器可讀 coverage validator/report 證明每個治理節點已被接線或明確分類。若 coverage 不足，0190 必須輸出 `inconclusive` 或停止要求 owner 裁決，不得把缺事件解讀為零成本、零攔截或成功。

## Problem

2026-07-19 dogfood 稽核顯示：

- target ledger 與 planning mirror 皆標示 ATM-GOV-0193 done；
- code/evidence 可證明 `atm.gateTelemetry.v1`、runtime scratch、seal/report fixture 與部分 next/preflight 接線；
- 但尚無 registry coverage report / validator 證明 claim、gate、validator、checkpoint、close、evidence readback、git governance、runner-sync、batch、broker、team 與 telemetry 自身操作已全數 instrumented 或明確分類。

因此 ATM-GOV-0190 不應直接做 M2 因果分析或 gate 裁汰；本卡先補「coverage repair + M2 preflight」。

## Telemetry Coverage Contract

- Producer：0193 gate telemetry registry、所有 ATM governance node 的 check registration、runtime emit helper、seal/report pipeline。
- Consumer：ATM-GOV-0190 analyzer v3、M1/M2 cohort matcher、future per-card data-driven stop gate。
- Window：從本卡 claim 到 close watermark；本卡收口必產出自己的 `atm.gateTelemetryTaskSummary.v1`。
- Baseline/treatment role：repair / M2 preflight guard。它不是 M2 結論本身，只判斷 0190 能否比較或必須 `inconclusive`。
- Missing-data semantics：缺事件、缺 node、缺 join key、缺 config digest、缺 sealed summary 一律標 `observability-missing` 或 `source: unavailable`；不得推論為零延遲、零攔截、無衝突或 successful no-op。
- Raw data policy：所有 raw telemetry、counter、per-run log、broker decision trace、高頻 receipt stream 只留 `.atm/runtime/telemetry/**` 或本機 log store，必須 gitignored；Git 只保存 compact coverage report、sealed digest、config digest、decision receipt。

## Required Coverage Report

新增或強化 `atm.gateTelemetryRegistryCoverageReport.v1`，最少欄位：

- `generatedAt`
- `configDigest`
- `historyDigest`
- `requiredNodes[]`
- `nodeId`
- `nodeFamily`
- `coverageStatus`: `instrumented | read-only-summary | out-of-scope | not-yet-covered`
- `producerCheckIds[]`
- `consumerIds[]`
- `requiredCorrelationKeys[]`
- `missingCorrelationKeys[]`
- `sourceAvailability`: `available | unavailable | partial`
- `missingTelemetry[]`
- `droppedEvents`
- `malformedEvents`
- `m2Comparable`: boolean
- `m2PreflightVerdict`: `ready | inconclusive | blocked`

Required node families：

- claim / reservation / lane presence
- next / preflight / guard / doctor
- validator queue / execution / cache / fan-out
- task import / task close / taskflow close / checkpoint
- evidence seal / evidence readback / handoff
- git governance / pre-commit / pre-push / branch queue
- runner-sync / release mirror / generated projection
- batch / broker / team / worker lifecycle
- telemetry seal / telemetry report / telemetry self-health

## M2 Preflight Rule

ATM-GOV-0190 開工前必須讀取本卡 coverage report：

- 若所有 0190 必要 node 為 `instrumented` 或有明確 `read-only-summary` 且 join key 完整，0190 可進行 matched cohort。
- 若有 `not-yet-covered`、join key 缺失、sealed summary 缺失或 config digest 不可比，0190 只能輸出 `inconclusive` 或停下請 owner 裁決。
- 任何 gate 降頻、合併、退場或 safety-related ordering change 都不得只依啟動次數；必須引用 replay / shadow / parity / matched A/B 其中適用方法。

## Acceptance

- [ ] Coverage validator 能列出全部 required node families，並對每個 node 產生明確 coverage status。
- [ ] Coverage report 能輸出 `m2PreflightVerdict`，0190 可直接消費。
- [ ] 缺事件與缺節點只標 `observability-missing` / `source: unavailable` / `not-yet-covered`，不被解讀成零成本或成功。
- [ ] Runtime raw telemetry/log/stat/counter 不進 Git；tracked evidence 只保存 compact digest/report/decision receipt。
- [ ] 本卡 close 前 seal 自身 `atm.gateTelemetryTaskSummary.v1`，並附 history/config digest。
- [ ] 若 coverage 無法補齊，close report 必須明確說明 0190 應輸出 `inconclusive` 或等待 owner 裁決。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-19T13:44:00.038Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0195-gate-telemetry-coverage-repair-and-m2-preflight.task.md","contentDigest":"sha256:1c3251309ff3577dc4a93886834f8cbef7922817c050aae9367620507fcddac9"} -->
