---
doc_id: doc_evidence_asr_0011
task_id: TASK-ASR-0011
layer: L2-complete
status: done
completed_at: 2026-05-20T05:00:00+08:00
completed_by_agent: ClaudeCode_Sonnet4.6
upstream_commit: 779f74e
---

# Evidence — TASK-ASR-0011 — command-specs 39 spec per-file split

## 完成摘要

| 項目 | Before | After | Δ |
|------|--------|-------|---|
| command-specs.ts 行數 | 862 | 99 | -88.5% |
| spec 檔案數 | 0 | 39 | +39 |
| spec 總數（含 migrate） | 39 | 39 | 0（一致） |
| 新增拆分腳本 | — | split-command-specs.ts | +1 |

## 驗收結果

| 測試 | 結果 |
|------|------|
| `npm run typecheck` | ✅ 0 errors |
| `npm run validate:cli` | ✅ ok (27 commands, help snapshots 全通過) |
| `npm run validate:quick` | ✅ ok 4/4 |
| I1 public CLI surface | ✅ unchanged |

## 設計收穫

**發現格式不一致（migrate spec）：**  
原始 command-specs.ts 中的 `migrate` spec 縮排是 4 個空格（其他 spec 是 2 個）。  
這是因為它被放在 `lock` spec 的結束括號 `}),` 之後但縮排沒有正確調整。  
Regex 修正為 `/^ {2,}/` 允許 2 個以上空格，才能正確識別 migrate。

**自動化工具策略：**  
`split-command-specs.ts` 使用括號計數（不依賴縮排）定位每個 spec 的結束位置，能正確處理嵌套結構。每個 spec 根據實際使用偵測 `_common` import，避免不必要的 import。

## Upstream Commit

- 779f74e：41 files changed (+1424 -842)
