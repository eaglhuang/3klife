---
doc_id: doc_other_0159
task_id: TASK-MRP-0019
title: Map 拓樸圖 Mermaid 自動生成
milestone: M19
status: done
started_at: 2026-05-21T06:10:00Z
started_by_agent: ClaudeCode_haiku-4.5
blocked_by: [TASK-MRP-0011]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書v2.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
---

# TASK-MRP-0019 — Map 拓樸圖 Mermaid 自動生成

## 目標

從 `map.spec.json` 中的 `members[]` 與 `edges[]` 自動生成 Mermaid 流程圖。每次 map 改動（member 增刪、edge 增刪、role 改變）觸發 CI 自動重生成，確保文件永遠與代碼同步。生成的 Mermaid 圖嵌入計畫書與 README，可直接在 GitHub 渲染。

## 前置依賴

- TASK-MRP-0011（fingerprint 監控觸發機制）

## 輸入

- `map.spec.json`（members、edges、roles、edgeKinds）

## 輸出

1. `node atm.mjs atm-chart --map <id> --mermaid --json`
   - 輸出 Mermaid markdown 字串
2. CI step：自動寫入 `atomic_workbench/maps/<mapId>/map-topology.mermaid.md`
3. 節點樣式對應 role：
   - `entry-adapter` → 圓角方框
   - `domain-step` → 普通方框
   - `validator` → 菱形
   - `side-effect` → 平行四邊形
   - `rollback-adapter` → 六邊形
4. 邊樣式對應 edgeKind：
   - `data-flow` → 實線箭頭
   - `control-flow` → 虛線箭頭
   - `validation` → 點線
   - `rollback` → 紅色箭頭（Mermaid style）

## 驗收條件

- [ ] 輸出 Mermaid 語法可在 GitHub 正確渲染
- [ ] role 與 edgeKind 樣式對應正確
- [ ] map 成員增加後重生成圖包含新節點
- [ ] CI 在 map.spec.json 改動時自動觸發生成
- [ ] `map-topology.mermaid.md` 寫入 map 工作區

## 影響檔案

- `packages/core/src/maps/mermaid-generator.ts`（新增）
- `packages/core/src/cli/atm-chart.ts`（新增 `--mermaid` flag）
- `.github/workflows/atm-map-ci.yml`（新增 mermaid 生成 step）
- `tests/maps/mermaid-generator.test.ts`（新增）

## 回滾策略

移除 mermaid-generator；CI step 移除；`map-topology.mermaid.md` 手動刪除。

## 2026-05-21 v2-r2 審查補充

- Mermaid 是 derived artifact，不是 source-of-truth；source-of-truth 仍是 `map.spec.json`。
- CI 應檢查 `map.spec.json` 與 `map-topology.mermaid.md` 是否 drift。
- Mermaid label 必須 repo-neutral，不得輸出 adopter 私有路徑、內部 repo 名稱或 prompt 內容。
- 生成器需穩定排序，避免每次產生非語意 diff。

新增驗收：
- [ ] map.spec.json 改動但 Mermaid 未更新時 CI fail
- [ ] Mermaid 生成結果 deterministic
- [ ] label 通過 neutrality / adopter-private scan
- [ ] drift report 指出需要重生成的 mapId

## Checklist

- [ ] Mermaid 生成邏輯實作
- [ ] role → 節點樣式對應表
- [ ] edgeKind → 邊樣式對應表
- [ ] CLI flag 整合
- [ ] CI step 設定
- [ ] CHANGELOG 補記
