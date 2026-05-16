---
doc_id: doc_other_0135
task_id: TASK-MRP-0001
title: Replacement Protocol 概念對齊 ARCHITECTURE
milestone: M1
status: done
blocked_by: [TASK-MRP-0000]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
started_at: 2026-05-17T02:44:13.6757334+08:00
started_by_agent: vs-insiders-github-copilot
completed_at: 2026-05-17T02:44:13.6757334+08:00
completed_by_agent: vs-insiders-github-copilot
---

# TASK-MRP-0001 — Replacement Protocol 概念對齊 ARCHITECTURE

## 目標

在 `docs/ARCHITECTURE.md` 補一節「Map as Replacement Surface」，把計畫書 §2 / §7 / §14 的核心觀念以 ARCHITECTURE 既有語氣濃縮為 1 段，使新進貢獻者能從 ARCHITECTURE 直接認識「map = 替代表面」概念。

## 前置依賴

- TASK-MRP-0000

## 輸入

- 計畫書 §2.1、§7、§14。
- 既有 `docs/ARCHITECTURE.md`。

## 輸出

- 新章節 `## Map as Replacement Surface`，內容含：
  - 一句定義
  - rollout lane 五階段
  - 與 registry status 不同步的提示
  - 指向本計畫書的連結

## 驗收條件

- [x] ARCHITECTURE 新章節 ≤ 25 行
- [x] 不重複完整 schema 細節；schema 由計畫書與 schema 檔承擔
- [x] 內部連結由 3KLife 計畫書 §15 / §16 承擔，ATM repo 不放內部中文路徑
- [x] ATM repo 公開連結指向 `docs/MAP_REPLACEMENT_PROTOCOL.md`

## 影響檔案

- `docs/ARCHITECTURE.md`

## 回滾策略

`git restore docs/ARCHITECTURE.md`

## Checklist

- [x] 章節插入位置在 Evidence-Driven Evolution Layer 與 Agent Operating Layer 之間
- [x] markdown / encoding 快檢通過

## Notes

2026-05-17 | 狀態: done | 驗證: ATM docs residue check / encoding check pass | 變更: `docs/ARCHITECTURE.md` 新增 Atomic Map Replacement Surface，包含 rollout lane 與 registry lifecycle 分離說明 | 阻塞: none
