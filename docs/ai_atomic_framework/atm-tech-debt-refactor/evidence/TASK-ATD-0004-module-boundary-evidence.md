---
doc_id: doc_other_0605
task_id: TASK-ATD-0004
title: TASK-ATD-0004 module boundary hardening evidence
owner: atm-core
status: completed
created_at: 2026-05-18T11:00:00+08:00
created_by_agent: ClaudeCode_Sonnet4.6
---

# TASK-ATD-0004 — Module Boundary Hardening Evidence

## 結論

TASK-ATD-0004 的全部驗收條件已達成，M1 第一項任務完成。Package runtime 已不直接 import `scripts/`。

## 驗收對照

| 驗收條件 | 結果 | 證據 |
|---|---|---|
| 變更範圍與本卡目標相符 | PASS | 只修改 `packages/cli/src/` 與 `scripts/` 中的 2 個工具函式路徑 |
| 不混入 public contract 或 adopter-specific 行為 | PASS | 只移動函式位置，不改變任何 CLI JSON shape 或 exit code |
| quick / standard validators 通過 | PASS | validate:quick ok (4/4)、validate:standard ok (53/53) |

## 修復前狀況

```
packages/cli/src/commands/doctor.ts:3
  import { runHashPlaceholderAudit } from '../../../../scripts/audit-hash-placeholders.ts';

packages/cli/src/commands/self-host-alpha.ts:9
  import { createTempWorkspace } from '../../../../scripts/temp-root.ts';
```

Package runtime (CLI) 直接依賴 scripts/ 的實作，違反「package runtime 不依賴 dev 工具腳本」的模組邊界原則。

## 修復內容

### 新建檔案

- `packages/cli/src/commands/hash-placeholder-audit.ts` — 從 `scripts/audit-hash-placeholders.ts` 移入 `runHashPlaceholderAudit` 函式
- `packages/cli/src/temp-workspace.ts` — 從 `scripts/temp-root.ts` 移入 `createTempWorkspace` / `initializeGitRepository` 函式

### 更新 import

- `packages/cli/src/commands/doctor.ts`: `from '../../../../scripts/audit-hash-placeholders.ts'` → `from './hash-placeholder-audit.ts'`
- `packages/cli/src/commands/self-host-alpha.ts`: `from '../../../../scripts/temp-root.ts'` → `from '../temp-workspace.ts'`

### scripts/ 改為 re-export shim

- `scripts/audit-hash-placeholders.ts`: 改為從 package 引入並 re-export + 保留 direct-run 包裝
- `scripts/temp-root.ts`: 改為純 re-export shim（`export { ... } from '../packages/cli/src/temp-workspace.ts'`）

依賴方向修正後：`scripts/` → `packages/cli/` ✓（原為 `packages/cli/` → `scripts/` ✗）

## 驗證結果

```
validate:quick    → ok (passed=4, failed=0, total=4)
validate:cli      → ok (23 commands, standalone fixture verified)
validate:standard → ok (passed=53, failed=0, total=53)
typecheck         → 既有錯誤（validate-known-bad-versions.ts:86、validate-rollout-metrics.ts:96-103）
                    與本卡無關，為預存問題（未被本卡觸碰的檔案）
```

## 未污染確認

- 無任何 public CLI contract 變更（JSON shape、exit code、command name 均未動）
- 無 3KLife / npc-brain / Cocos 語彙
- 無 upstream commit / push（本卡為 internal-mirror）
