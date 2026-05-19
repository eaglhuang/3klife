---
doc_id: doc_evidence_asr_layer1
layer: L1
status: done
completed_at: 2026-05-20T01:00:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
---

# Evidence — Layer 1（Pure helpers）完成總結

## 範圍

Layer 1 包含 3 張卡，全部從 `packages/cli/src/commands/upgrade.ts` 抽出純函式：

| Task | Commit | 拆出檔案 | 抽走行數 |
|------|--------|---------|---------|
| TASK-ASR-0001 | 85f2db1 | `upgrade/path-helpers.ts` | -32 行 (+ -2 個 orphaned import) |
| TASK-ASR-0002 | f9d286a | `upgrade/next-action-hint.ts` | -45 行 |
| TASK-ASR-0003 | 41c8c96 | `upgrade/canary.ts` | -32 行 |

## 量化成果

| 指標 | Before | After | Δ |
|------|--------|-------|---|
| `upgrade.ts` 行數 | 1306 | 1203 | -103 (-7.9%) |
| upgrade 子模組檔案 | 0 | 3 | +3 |
| 公開 CLI surface | unchanged | unchanged | 0 |
| 任何 I-invariant 違反 | 0 | 0 | 0 |

## 驗證

每張卡 commit 前都跑過：

```bash
npm run typecheck     # 0 errors
npm run validate:cli  # ok (27 commands, standalone fixture verified)
```

## 設計收穫

1. **Layer 1 順序很重要**：ASR-0001 先抽 `path-helpers`，後續的 `canary.ts` 才能從它 import `normalizeRepositoryRelativePath`，避免重複定義。
2. **Orphaned import 偵測**：抽函式後要檢查原檔還有沒有用 `createHash` / `readFileSync` 等被連帶帶走的 import；ASR-0001 把它們也清掉了。
3. **每次只 commit 自己的檔案**：working tree 有其他 agent 的未提交修改，要用 `git add <specific-files>` 精準暫存，避免污染。

## Layer 2 預備

下一階段（Layer 2，medium risk）建議順序：

1. `map-generator.ts` 拆 allocation / scaffold / provenance（依 SPLIT_PLAN.md）
2. `command-specs.ts` 拆 metadata / renderer
3. `plugin-governance-local` 依 EXPORTS.md 拆 stable / experimental

中度風險的關鍵差異：要跑 `validate:standard`（非只 `validate:cli`），且要對 schema 與 manifest 行為做差異比對。
