---
doc_id: doc_other_0134
task_id: TASK-MRP-0000
title: 文件定稿與 cross-link
milestone: M1
status: in-progress
blocked_by: []
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
---

# TASK-MRP-0000 — 文件定稿與 cross-link

## 目標

把 3KLife 內部計畫書確立為 Replacement Protocol 的執行規劃真相來源；ATM repo 僅保留英文公開版 `docs/MAP_REPLACEMENT_PROTOCOL.md` 並從 README cross-link，避免內部任務卡污染框架核心。

## 前置依賴

- 無。

## 輸入

- 已落地的 `docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md`（§0–§16）。

## 輸出

1. 計畫書通過 UTF-8 編碼檢查（無 BOM、無 U+FFFD）。
2. 在 `README.md` 的「Governance docs」或同等段落加入單行連結。
3. 在 `docs/ATOM_EVOLUTION_PLAN.md` 或 `docs/ARCHITECTURE.md` 補一句指向本計畫的引用。

## 驗收條件

- [ ] 計畫書包含 §0–§16
- [ ] §14 明確標出目標 A / B 的達成判斷
- [ ] §15 每個里程碑都有可勾選 checklist
- [ ] README 與至少一份 governance doc 有指向本計畫的連結
- [ ] 文件不出現 `???` / `TBD` / `FIXME`（除已標註的延後項）

## 影響檔案

- `docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md`
- `README.md`
- `docs/ARCHITECTURE.md` 或 `docs/ATOM_EVOLUTION_PLAN.md`（擇一）

## 回滾策略

純文件變更，直接 `git restore` 對應檔案即可。

## Checklist

- [ ] 編碼掃描通過
- [ ] cross-link PR 評審通過
- [ ] 任務卡 `status` 改為 `done`
