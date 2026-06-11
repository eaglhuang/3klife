---
doc_id: doc_other_asp_coord
task_id: TASK-ASP-0005
title: ASP Initiative 跨 repo 協調紀錄（3KLife ↔ AI-Atomic-Framework）
status: complete
updated_at: 2026-06-11T00:00:00+08:00
---

# ASP Initiative 協調紀錄

本文件追蹤 adapter-guided-atomization-sdk（ASP）計畫在 `AI-Atomic-Framework`（上游框架 repo）與 `3KLife`（adopter / 論文評測資料來源）之間的同步狀態與跨 repo 決策。

## 1. AAF 任務狀態鏡像表

| Task ID | 標題 | Target | 狀態（鏡像） | 交付 / 收口 commit | 最後同步 |
|---|---|---|---|---|---|
| TASK-ASP-0001 | AtomizationPlanningAdapter SDK Contract | AAF | **done** | `e08bbb2a` / `bfa57b0b` | 2026-06-11 |
| TASK-ASP-0002 | JS Adapter Candidate Discovery | AAF | **done** | `8a58d1d9` / `dc34dd4d` | 2026-06-11 |
| TASK-ASP-0003 | Python Adapter SDK Promotion | AAF | **done** | `6b9eb395` / `9fd1bcc2` | 2026-06-11 |
| TASK-ASP-0004 | Broker Candidate-to-WriteIntent Bridge | AAF | **done** | `14359be3` / `ddb63675` | 2026-06-11 |
| TASK-ASP-0005 | 3KLife Coordination & Baseline | 3KLife | **done** | `afa17a12`（3KLife）/ `4b5c9be7`（AAF 收口） | 2026-06-11 |

> 鏡像說明：AAF 端 ledger 為唯一事實來源（`.atm/history/tasks/TASK-ASP-*.json`）。本表與 `tasks/*.task.md` frontmatter 由 3KLife 規劃鏡像維護，於 AAF batch checkpoint 完成後手動回寫。

## 2. 跨 repo 決策紀錄（Decision Log）

| # | 日期 | 決策 | 理由 / 影響 |
|---|---|---|---|
| D1 | 2026-06-10 | AAF batch 佇列實際順序為 ASP-0003 → ASP-0005 → ASP-0001 → ASP-0002 → ASP-0004（由 `atm next --prompt` 路由決定，非 README 的依賴順序） | ASP-0003 的 allowed_files 含 `packages/plugin-sdk/src/**`，因此 `AtomizationPlanningAdapter` contract 檔（`atomization-planning.ts`）在 ASP-0003 內先行落地；ASP-0001 收斂為 SDK 單元測試 + `docs/ADAPTER_GUIDE.md` 章節補齊。 |
| D2 | 2026-06-10 | SDK contract 採 optional capability interface（`AtomizationPlanningAdapter` 與 `LanguageAdapter` 分離，core 以 feature-detection 使用） | 確保既有 adapter 不需改動即可繼續運作；偵測方法（regex/scanner/AST/LSP/LLM-assisted）開放，不強制單一實作。 |
| D3 | 2026-06-10 | baseline 量測不跑付費 LLM 基準，改用 AAF `.atm/history` 既有治理 session 紀錄為代理樣本 | 符合任務卡 non-goal（不跑 paid benchmarks）；3KLife 端 atom 數量尚少（4 顆），AAF 框架 repo 的 29 筆 task session 為目前最完整的快取紀錄。 |
| D4 | 2026-06-10 | 3KLife corpus 索引收錄 `assets/scripts/` 20 檔 TS + `tools_mcp/cocosMCP/Python/` 8 檔 Python | 3KLife 無 `tools_python/`；cocosMCP 的 Python 工具鏈為 repo 內最接近的 Python 樣本來源。 |
| D5 | 2026-06-11 | 規劃鏡像回寫：五張 `tasks/*.task.md` + 本表 + README 狀態欄同步為 done | AAF 正式 close 不會自動更新 3KLife markdown frontmatter；本 commit 補齊鏡像缺口。 |

## 3. 對 AAF 團隊的阻塞回報

| # | 狀態 | 項目 | 說明 |
|---|---|---|---|
| B1 | 已解除 | ASP initiative 五卡收口 | batch `batch-d95420db3166` 完成；尾端 APO-0030 亦已收口。 |
| B2 | 無阻塞 | — | 目前 3KLife 端無阻塞 AAF 的議題。 |

## 4. 待 ASP-0002 完成後的驗證項

ASP-0002 已在 AAF 收口；下列為 3KLife 端後續驗證（不阻擋 initiative 鏡像 done）：

- [ ] 對 3KLife corpus（見 `corpus-index.md`）執行 candidate discovery（需 AAF release / frozen runner 就緒）
- [ ] 與人工 ground truth 比對 candidate 數量
- [ ] 回報 precision / recall（3KLife 驗收門檻 precision ≥ 70%）
