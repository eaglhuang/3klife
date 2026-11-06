# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.4 國家官職天下（4/4）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.4 國家官職天下（4/4）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.4 4. 國家、官職與天下大勢 (Nation, Officer & Politics) · 第 4/4 段

> 續上段（表頭重複）。工作包 TIME-10 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **TIME-10** | M9 | 時代更迭 Era_Reset（60 月地圖重組） | logic | 5 | 🟢 已接線 | TIME-01 | 第 60 月保留養成、重置領土/外交/AI | [v11 核對 2026-10-20] Era_Reset 觸發與事件（d84d6c4f，PROG-2-0813）；EraReset 由 GameSession 呼叫，測試存在；60 月地圖重組未核對 |  |
| **TIME-11** | M8 | 付費延壽丹/時間加速/季末禮包 | logic | 3 | 🟡 純邏輯 | TIME-03 | 道具可延壽 1~2 季或跳過治理季 | LongevityPill 延壽丹與 ItemShopPricing 精元定價（PROG-2-1917，#1833） | [v17.2 更正 2026-11-07] 未開始→純邏輯；時間加速／季末禮包未做 |
| **REV-01** | M0 | Constants.ts DP 命名殘留（2.4） | logic | 0.5 | 🟢 已接線 | - | INITIAL_DP/DP_PER_TURN 全專案改為 GRAIN 命名 | [v10 核對 2026-10-20] Constants.ts DP 命名殘留清理併入基礎清單重構（a49f4027）；未逐項核對命名 |  |
| **REV-02** | M0 | terrain.json 自 Constants.ts 抽取（2.5，P0） | data | 2 | ✅ 已驗收 | - | 地形修正由 terrain.json 載入，Constants 不再 hardcode | [v10 核對 2026-10-20] terrain.json 自 Constants.ts 抽出（a49f4027，PROG-2-0495）；TerrainConfig 由 Constants.ts 呼叫，測試存在 |  |
| **REV-03** | M0 | 教官系統 VIT_Max→Vitality_Max 統一（2.6，P0） | content | 0.5 | 📄 僅資料 | - | 全部規格與程式僅用 Vitality_Max | grep 教官系統*.md 與 assets/scripts 的 VIT_Max 無結果，疑已改；審查文件待更新 |  |
| **REV-04** | M2 | 宿敵 EP 懲罰、組合奧義、混種戰法交叉引用（2.7~2.9） | content | 2 | ⚪ 未開始 | - | 三項規格決議並回寫相關規格書 | 規格待決，未見回寫 | [v17.2 更正 2026-11-07] 待裁決：宿敵 EP 懲罰與混種戰法規格待決 |
| **REV-05** | M0 | UIPreviewBuilder / UIValidationRunner 與 legacy hud.icon.dp key（2.1/2.10） | tool | 3 | 🟢 已接線 | - | 兩個 UI 自動化工具存在並可跑，legacy key 改名 | [v9 核對 2026-10-15] UIPreviewBuilder 被 StyleCheckPanel、GeneralQuickViewPanel、ActionCommandComposite 等呼叫；UIValidationRunner headless 測試（54ee2512，PROG-2-0482）尚無 src 呼叫端 |  |
