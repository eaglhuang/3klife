---
doc_id: doc_other_0165
task_id: TASK-MRP-0024
title: Persistent Guide Cache（candidates rank 結果快取）
milestone: M24
status: planned
blocked_by: []
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書v2.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
---

# TASK-MRP-0024 — Persistent Guide Cache（candidates rank 結果快取）

## 目標

`candidates rank` 是最耗時的 ATM 指令（需掃描所有 source 檔案、計算 fingerprint、排序），每次相同 goal 都從頭來過。

本卡建立 **Persistent Guide Cache**：將 candidates rank 結果快取到本機，只要 git 狀態沒改變，直接讀快取——rank 從秒~分鐘級降到毫秒級。

---

## 與 M14 Memoization Cache 的區別

| | M14 Atom Memoization Cache | M24 Persistent Guide Cache |
|--|---|---|
| 快取對象 | atom 執行結果（input → output） | candidates rank / guide 分析結果 |
| 失效觸發 | atom input 改變 | git commit hash 改變 |
| 使用場景 | 收斂迴圈重複執行 | `atm candidates rank`、`atm guide` |

---

## 快取機制

### Cache Key

```
cache_key = SHA256(
  goal_text +
  glob_pattern +
  git_commit_hash    ← 任何新 commit → cache miss
)
```

### Git 變動偵測策略

| 狀況 | 行為 |
|------|------|
| Clean working tree | 用 commit hash 當 key，正常讀寫 cache |
| 有 uncommitted 改動 | **bypass cache**，強制重算，不寫入（保證新鮮度） |
| git commit hash 改變 | cache miss → 重算 → 更新 cache entry |
| cache entry 超過 7 天 | 自動 purge（防止過時資料堆積） |

---

## ⚠️ 預設 OFF（必須使用者明確啟用）

Guide Cache 是「AI 漂移最大來源」風險，**預設關閉**。所有 candidates rank 預設**重算**，不走 cache。使用者必須明確啟用：

```bash
# 啟用 cache 功能
node atm.mjs cache enable --json
# → { "enabled": true, "warning": "Guide Cache is opt-in due to AI-drift risk. See M24 task card." }

# 未先 enable 時，candidates rank 永遠 bypass cache（即使沒帶 --no-cache）
# 已 enable 時，可用 --no-cache 個別跳過
```

## CLI 設計

```bash
# 正常使用（自動使用快取，需先 enable）
node atm.mjs candidates rank --include "pipelines/**/*.py" --goal "..." --json
# cache hit  → { "cached": true, "cacheAge": "2h", ...results }
# cache miss → 重算，寫入 cache，{ "cached": false, ...results }

# 強制跳過快取（重算）
node atm.mjs candidates rank --no-cache --include "..." --goal "..." --json

# 手動清除所有快取
node atm.mjs cache clear --json
# → { "clearedEntries": 12, "freedBytes": 45678 }

# 清除特定 goal 的快取
node atm.mjs cache clear --goal "..." --json

# 查看快取狀態
node atm.mjs cache status --json
# → { "entryCount": 5, "totalBytes": 234567, "oldestEntry": "...", "newestEntry": "..." }
```

---

## Cache 存放位置

```
.atm-guide-cache/          ← 本機，加入 .gitignore
  <cache-key-hash>.json    ← 完整 candidates rank 結果
  index.json               ← cache key → metadata 映射（cacheAge、createdAt）
```

---

## 驗收條件

- [ ] **預設 OFF**：未跑過 `cache enable` 時，`candidates rank` 永遠重算，不讀不寫 cache
- [ ] `cache enable` 寫入 `.atm/runtime/feature-flags.json`，重啟保持 enabled
- [ ] `cache disable` 立即停用 cache 並清除 flag（cache 目錄保留供下次重啟用）
- [ ] 相同 goal + 相同 git commit → 第二次呼叫 < 100ms（快取命中，需 enable）
- [ ] 新 commit 後 → 強制重算（舊 cache entry 不再命中）
- [ ] 有 uncommitted 改動 → bypass cache，不讀不寫
- [ ] `cache clear` 刪除所有快取 entry
- [ ] `cache clear --goal` 只刪除匹配 goal 的 entry
- [ ] `cache status` 正確回報 entry 數、大小、最舊/最新 entry
- [ ] `--no-cache` 強制跳過快取
- [ ] 超過 7 天的 entry 自動 purge
- [ ] `.atm-guide-cache/` 加入 `.gitignore`

## 影響檔案

- `packages/core/src/cache/guide-cache.ts`（新增）
- `packages/core/src/cli/cache.ts`（新增 `cache` subcommand：clear/status）
- `packages/core/src/cli/candidates.ts`（整合 cache layer）
- `tests/cache/guide-cache.test.ts`（新增）

## 穩定性護欄（最高風險，必須最嚴）

⚠️ **Cache 是 AI 漂移的最高風險來源**：如果 cache 中毒，AI 會用過時或被竄改的 candidate ranking 做決策，這正是 ATM 要防止的「AI 偏離」現象。所有護欄必須以「**寧可重算，不可使用可疑 cache**」為原則。

| 風險 | 護欄 |
|------|------|
| Cache 中毒（人為竄改） | 每個 cache entry 帶 SHA256 內容校驗碼，讀取時驗證；失敗 → 視為 miss，重算 |
| Git hash 偵測 bug → 髒 cache hit | 同時記錄 `git status --porcelain` 摘要；偵測到任何 staged/unstaged 差異 → bypass |
| Stale cache 影響 AI 決策 | cache hit 時 output 必須清楚標記 `"cached": true, "cacheAge": "..."`，讓 Agent 可判斷 |
| Cache 損壞讓 ATM 啟動失敗 | cache 損壞 → 自動降級為「無 cache 模式」，**不阻擋任何指令** |
| 整個 cache 中毒 | Rescue Police INV-RESCUE-008 持續監控；`rescue clear-cache` 一鍵清除 |

## 安全降級

```
cache 損壞偵測（讀取時 checksum 不符）
  ↓
記錄到 .atm/daemon/notifications.jsonl
  ↓
本次呼叫 bypass cache，重算
  ↓
丟棄損壞的 cache entry（不嘗試修復）
  ↓
繼續正常 candidates rank 流程
```

**永遠不讓 cache 損壞阻擋使用者操作**。

## 回滾策略

**Level 1（停用 cache）**：所有指令加 `--no-cache` 跳過，但 cache layer 仍存在。

**Level 2（清除 cache）**：`node atm.mjs cache clear --json`；下次自動重算。

**Level 3（移除功能）**：移除 `guide-cache.ts`、`cache.ts`；`candidates.ts` 還原不走 cache；`.atm-guide-cache/` 手動刪除。原有 candidates rank 行為完全不受影響。

**Level 4（災難恢復）**：cache 即使全毀也只是慢，不影響正確性，因此本 Level 主要透過 Rescue Police（M26）持續監控防止使用者誤判 cache 狀態。

## Checklist

- [ ] cache key 計算（SHA256 of goal + glob + git hash）
- [ ] git commit hash 讀取（`git rev-parse HEAD`）
- [ ] uncommitted 改動偵測（`git status --porcelain`）→ bypass 邏輯
- [ ] cache read/write 實作
- [ ] index.json 維護（entry 元數據）
- [ ] 7 天自動 purge
- [ ] `cache clear` CLI（全清 / --goal 過濾）
- [ ] `cache status` CLI
- [ ] `--no-cache` flag 整合到 candidates rank
- [ ] .gitignore 更新
- [ ] CHANGELOG 補記
