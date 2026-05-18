---
doc_id: doc_index_0021
owner: atm-core
status: bootstrap
related_plan: docs/ai_atomic_framework/atm-tech-debt-refactor/ATM 技術債重構計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: claude_code_opus4.7
---

# ATM 技術債重構 Task Cards

本目錄收錄「ATM 技術債重構計畫書」（`../ATM 技術債重構計畫書.md`）的任務卡。

任務卡命名規則：`TASK-ATD-{NNNN}-{slug}.task.md`
- `ATD` = ATM Tech Debt
- 序號從 0001 起，與既有 `APO` / `TDR` 等系列不衝突
- 內部追蹤用，不公開（`public_tracking: false`）

## 拆卡進度

| 狀態 | 數量 |
|------|------|
| 已拆 | 0 / 32 |
| 進行中 | 0 |
| 完成 | 0 |

## 索引（待拆卡後填入）

| Task ID | 標題 | 里程碑 | 狀態 | 阻擋者 | Invariant Risk |
|---------|------|-------|------|--------|---------------|
| TASK-ATD-0001 | 補 AGENTS.md 與 docs/keep.summary.md | M0 | not-created | — | — |
| TASK-ATD-0002 | 修 atm next --json 對 upstream 行為 | M0 | not-created | 0001 | I1 |
| TASK-ATD-0003 | upstream 自我採用 bootstrap | M0 | not-created | 0002 | I1 |
| TASK-ATD-0004 | 模組邊界硬化（doctor.ts / self-host-alpha.ts） | M1 | not-created | — | — |
| TASK-ATD-0005 | validate-module-boundaries deny rule | M1 | not-created | 0004 | — |
| TASK-ATD-0006 | ESLint baseline 擴充 | M1 | not-created | — | — |
| TASK-ATD-0007 | CLI 公共型別（CliMessage / CommandResult） | M1 | not-created | 0006 | — |
| TASK-ATD-0008 | frameworkVersion 從 package.json 讀取 | M1 | not-created | — | — |
| TASK-ATD-0009 | 環境變數 registry | M1 | not-created | — | — |
| TASK-ATD-0010 | Pre-commit hook ATM-style | M1 | not-created | 0006 | I4 |
| TASK-ATD-0011 | Validator harness 批次遷移 | M2 | not-created | — | — |
| TASK-ATD-0012 | 共用 AJV factory/cache | M2 | not-created | 0011 | I2 |
| TASK-ATD-0013 | 錯誤處理政策（CliError + EXPECTED） | M2 | not-created | 0007 | — |
| TASK-ATD-0014 | 測試分層 + 框架選型（node:test 優先） | M2 | not-created | — | — |
| TASK-ATD-0015 | 第一批單元測試（urn / id-allocator / shared） | M2 | not-created | 0014 | — |
| TASK-ATD-0016 | upgrade.ts 拆分（1306 行） | M3 | not-created | 0015 | I1 |
| TASK-ATD-0017 | plugin-governance-local 拆分（1069 行） | M3 | not-created | 0015 | — |
| TASK-ATD-0018 | propose.ts 拆分（1018 行） | M3 | not-created | 0015, 0016 | — |
| TASK-ATD-0019 | atm-chart.ts 拆分（885 行） | M3 | not-created | 0015 | I1 |
| TASK-ATD-0020 | command-specs.ts 拆分（673 行） | M3 | not-created | 0015 | I1 |
| TASK-ATD-0021 | integrations-core 拆分（668 行） | M3 | not-created | 0015 | — |
| TASK-ATD-0022 | map-generator.ts 拆分（663 行） | M3 | not-created | 0015 | — |
| TASK-ATD-0023 | any debt budget（per-package） | M3 | not-created | 0006 | — |
| TASK-ATD-0024 | 開源文件補強（env / troubleshooting / adapter） | M3 | not-created | — | — |
| TASK-ATD-0025 | Release parity CI（quick + full smoke） | M4 | not-created | — | I3 |
| TASK-ATD-0026 | Version skew / known-bad / release trust 持綠 | M4 | not-created | 0025 | I6 |
| TASK-ATD-0027 | 28 個重複腳本去重（codegen 或 launcher） | M4 | not-created | — | I3 |
| TASK-ATD-0028 | Synthetic Python adopter fixture（與三角策略 M5 共用） | M4 | not-created | — | I4 |
| TASK-ATD-0029 | Adopter sentinel external npc-brain profile | M5 | not-created | 0028 | — |
| TASK-ATD-0030 | Multi-agent confidence report | M5 | not-created | — | — |
| TASK-ATD-0031 | Docker / devcontainer（reproducibility） | M5 | not-created | — | — |
| TASK-ATD-0032 | Root-drop sandbox E2E | M5 | not-created | 0025 | I3 |

## Milestone 退出條件

| Milestone | 主題 | 退出條件 | 對應卡數 |
|-----------|------|---------|---------|
| M0 | 治理入口閉環 | atm next/doctor 在 upstream 全 green；AGENTS/keep summary 存在 | 3（0001-0003） |
| M1 | 快速致勝 | lint 不爆、邊界 deny rule 生效、版本不寫死 | 7（0004-0010） |
| M2 | 治理驗證底座 | validate:quick < 30s；單元測試覆蓋率 ≥ 20% | 5（0011-0015） |
| M3 | 架構拆分 | 無 source 檔超過 500 行；core any 降 50% | 9（0016-0024） |
| M4 | 開源信任 | release parity smoke 自動跑；synthetic Python fixture 通過 | 4（0025-0028） |
| M5 | 長期可重現 | sentinel external profile 連續多輪通過 | 4（0029-0032） |

## Invariant 對照表

| Invariant | 受影響卡片 |
|-----------|-----------|
| I1 Public CLI surface | 0002, 0003, 0016, 0019, 0020 |
| I2 Schema 版本契約 | 0012 |
| I3 Release wire format | 0025, 0027, 0032 |
| I4 Adopter-neutral | 0010, 0028 |
| I5 Hash-locked manifests | （目前無直接影響卡片，但 0017 governance-local 需特別注意） |
| I6 Long-tail compatibility | 0026 |

## 拆卡 SOP

1. 從計畫書 §2 取一個 P-item。
2. 用 `node tools_node/doc-id-registry.js --assign <path>` 取得 doc_id。
3. 對齊 `agent-pack-onboarding/tasks/TASK-APO-*` 的 frontmatter 格式。
4. 必填欄位：`task_id`、`title`、`milestone`、`status`、`blocked_by`、`owner`、`related_plan`、`upstream_repo`、`targetRepo`、`hostKind`、`allowed_files`、`forbidden_files`、`non_goals`、`created_at`、`created_by_agent`。
5. 若觸及 §0.1 Invariant，必填 `invariant_risk: I{n}` 並補緩解策略段落。
6. 開卡後更新本 README 索引表的 `狀態` 欄位。

## 與其他 task 系列的關係

| 系列 | 範圍 | 與 ATD 的關係 |
|------|------|-------------|
| TASK-APO-* | Agent Pack Onboarding | ATD M0 / M4 可能依賴 APO 已完成的成果 |
| TASK-MRP-* | Multi-Repo Policy | 無直接相依 |
| TASK-ATM-* | 3KLife 內 ATM 試驗 | 由三角策略規劃書畢業流程銜接 |
