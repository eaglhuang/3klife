---
task_id: TASK-CID-0111
title: "Broker operation run record lightweight receipt (partial blocker bypass)"
status: done
milestone: M20
closure_authority: target_repo
depends_on:
  - TASK-CID-0099
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
scopePaths:
  - "packages/cli/src/commands/broker.ts"
  - "packages/core/src/broker/types.ts"
  - "packages/core/src/broker/team-lane.ts"
  - "packages/core/src/broker/adapters/batch-planner.ts"
  - "packages/core/src/broker/__tests__/batch-planner.test.ts"
deliverables:
  - "packages/core/src/broker/types.ts"
  - "packages/core/src/broker/team-lane.ts"
  - "packages/cli/src/commands/broker.ts"
  - "packages/core/src/broker/adapters/batch-planner.ts"
  - "packages/core/src/broker/__tests__/batch-planner.test.ts"
validators:
  - "npm run typecheck"
  - "npm test"
  - "git diff --check"
evidence_required: planning-attestation
evidence:
  required: command-backed
out_of_scope:
  - "Do not upgrade schemaVersion (keep v0.2)"
  - "不改 taskflow 核心流程"
  - "不改變 broker 對外命令介面參數"
nonGoals:
  - "Do not upgrade schemaVersion (keep v0.2)"
atomizationImpact:
  ownerAtomOrMap: "atm.broker-run-record"
  mapUpdates:
    - path_pattern: "packages/core/src/broker/types.ts"
      atom_id: "atm.broker-run-record"
      capability: "broker run evidence schema"
      coverage_status: "active"
    - path_pattern: "packages/core/src/broker/team-lane.ts"
      atom_id: "atm.broker-run-record"
      capability: "lane decision evidence"
      coverage_status: "active"
    - path_pattern: "packages/cli/src/commands/broker.ts"
      atom_id: "atm.broker-run-record"
      capability: "operator-facing evidence output"
      coverage_status: "active"
contextMap:
  primary:
    - path: "packages/core/src/broker/team-lane.ts"
      reason: "broker lane decision 與 evidence 對應"
    - path: "packages/core/src/broker/types.ts"
      reason: "run record schema 與欄位穩定"
  secondary:
    - path: "packages/cli/src/commands/broker.ts"
      reason: "run record 落到 CLI 可稽核輸出路徑"
  tests:
    - path: "packages/core/src/broker/__tests__/decision.test.ts"
      reason: "decision + lane 相關邊界"
    - path: "packages/core/src/broker/__tests__/team-lane.test.ts"
      reason: "team lane evidence 覆蓋"
    - path: "packages/cli/src/commands/__tests__/broker.test.ts"
      reason: "CLI 運行輸出一致性"
  patterns:
    - referencePath: "packages/cli/src/commands/command-specs/broker.spec.ts"
      referenceTaskId: "TASK-CID-0071"
      description: "使用 command spec 作為輸出欄位檢核基準"
completed_at: "2026-06-16T14:23:56.218Z"
completed_by_agent: "codex"
delivery_commit: "5d2bbff36"
---

## Goal

為 `broker` 同檔不同原子可同時寫入時建立輕量、可稽核的 run record，保留可驗證的欄位：
`request_identity`、`adapter_choice`、`lane_decision`、`merge_verdict`、`applied_files`、`evidence_path`，避免只靠個別 task 的口頭描述判斷，真正留下可追溯鏈路。

## Acceptance

- `packages/core/src/broker/types.ts` 至少定義/延伸 run record 欄位，包含 `request_identity`、`adapter_choice`、`lane_decision`、`merge_verdict`、`applied_files`、`evidence_path`。
- `packages/core/src/broker/team-lane.ts` 至少有一筆「兩個 task id 共寫」的成功合併 run evidence。
- `packages/cli/src/commands/broker.ts` 穩定輸出可機器比對的 run record 路徑，並能對應到任務與 commit。
- `taskflow open`（dry-run）能成功解析此卡，不再出現 placeholder/錯配欄位警示。

## Non-Goals

- 不更動 `taskflow open/close` 的操作主幹流程。
- 不新增外部資料庫或持久化格式。
- 不調整 CLI 命令旗標行為。

## Verification

```bash
npm run typecheck
npm test
git diff --check
```

## Closure & Reports

1. 提供 deliverables 完整清單與行號。
2. 確認 evidence record 至少有一筆可成功並排除未覆蓋風險。
3. 任務結束前附上 `.atm/history/evidence/` 下的 run record 路徑與對應 task id。
