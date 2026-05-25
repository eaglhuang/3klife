<!-- doc_id: doc_index_1002 -->

# ATM 100% 自我原子化任務卡索引

Related plan: ../ATM框架100%自我原子化計畫書.md

| Task ID | Title | Milestone | Status | Depends |
|---|---|---|---|---|
| [TASK-ASA-0001](./TASK-ASA-0001-coverage-taxonomy-exclusion-policy.task.md) | 定義 ATM 100% 原子化覆蓋口徑與排除政策 | M1 | planned | none |
| [TASK-ASA-0002](./TASK-ASA-0002-atomize-inventory-cli.task.md) | 新增 atomize inventory 覆蓋盤點 CLI | M2 | planned | TASK-ASA-0001 |
| [TASK-ASA-0003](./TASK-ASA-0003-atm-dogfood-score.task.md) | 新增 ATM dogfood score 報告 | M3 | planned | TASK-ASA-0002 |
| [TASK-ASA-0004](./TASK-ASA-0004-atomization-coverage-guard-validate.task.md) | 新增 atomization-coverage guard 與 validate | M4 | planned | TASK-ASA-0001, TASK-ASA-0002, TASK-ASA-0003 |
| [TASK-ASA-0005](./TASK-ASA-0005-generated-fixture-boundaries.task.md) | 建立 generated 與 fixture 邊界清單 | M5 | planned | TASK-ASA-0001, TASK-ASA-0004 |
| [TASK-ASA-0006](./TASK-ASA-0006-bulk-atom-spec-backfill.task.md) | 實作 bulk atom spec backfill | M6 | planned | TASK-ASA-0002, TASK-ASA-0005 |
| [TASK-ASA-0007](./TASK-ASA-0007-top-level-maps-composition.task.md) | 建立 top-level ATM maps composition | M7 | planned | TASK-ASA-0006 |
| [TASK-ASA-0008](./TASK-ASA-0008-packages-core-coverage-wave.task.md) | 完成 packages/core 第一波自我原子化 | M8 | planned | TASK-ASA-0006, TASK-ASA-0007 |
| [TASK-ASA-0009](./TASK-ASA-0009-packages-cli-coverage-wave.task.md) | 完成 packages/cli 第一波自我原子化 | M9 | planned | TASK-ASA-0006, TASK-ASA-0007 |
| [TASK-ASA-0010](./TASK-ASA-0010-validators-evidence-pipeline.task.md) | 補齊 validators 與 evidence pipeline 原子化 | M10 | planned | TASK-ASA-0004, TASK-ASA-0008, TASK-ASA-0009 |
| [TASK-ASA-0011](./TASK-ASA-0011-behavior-pack-atomization.task.md) | 完成 behavior pack 自我原子化 | M11 | planned | TASK-ASA-0007, TASK-ASA-0010 |
| [TASK-ASA-0012](./TASK-ASA-0012-integration-agent-pack-enforcement.task.md) | 更新 integration 與 agent pack enforcement | M12 | planned | TASK-ASA-0004 |
| [TASK-ASA-0013](./TASK-ASA-0013-readable-entrypoint-dogfood-migration.task.md) | 執行 readable entrypoint dogfood migration | M13 | planned | TASK-ASA-0007, TASK-ASA-0008, TASK-ASA-0009, TASK-ASA-0012 |
| [TASK-ASA-0014](./TASK-ASA-0014-release-build-distribution-atomization.task.md) | 完成 release build 與 distribution 原子化 | M14 | planned | TASK-ASA-0007, TASK-ASA-0010 |
| [TASK-ASA-0015](./TASK-ASA-0015-doctor-git-head-evidence-gap.task.md) | 關閉 doctor Git HEAD evidence gap | M15 | planned | TASK-ASA-0010, TASK-ASA-0012 |
| [TASK-ASA-0016](./TASK-ASA-0016-self-atomization-graduation-gate.task.md) | 建立 100% 自我原子化 graduation gate | M16 | planned | TASK-ASA-0001, TASK-ASA-0004, TASK-ASA-0008, TASK-ASA-0009, TASK-ASA-0010, TASK-ASA-0014, TASK-ASA-0015 |

## 執行規則

- 每張任務卡開始前，先依 3KLife task lock 流程 claim。
- 實作 commit 應發生在 `AI-Atomic-Framework`，中文推進紀錄留在本目錄。
- 任務完成時，補 evidence 或連回 ATM repo 的 commit / report path。
- 不直接修改 ATM `.atm/` runtime state。

## Non-ASA follow-up

ASA 系列只處理 ATM 框架自我原子化本體。
如果問題已經超出 ownership / evidence / release atomization 範圍，改由 AAO 系列承接：

- 系列入口：[`../atm-agent-first-operability/README.md`](../atm-agent-first-operability/README.md)
- 任務索引：[`../atm-agent-first-operability/tasks/README.md`](../atm-agent-first-operability/tasks/README.md)

AAO 專注的主題包括：

- Agent-First operability
- CLI surface 與 command spec drift guard
- `next` 的結構化決策摘要
- validator failure 的可修輸出
- docs / schema / command drift guard
- onefile size / startup budget
