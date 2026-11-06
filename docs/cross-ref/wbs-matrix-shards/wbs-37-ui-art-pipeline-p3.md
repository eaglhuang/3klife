# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.7 UI 介面視覺（3/3）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.7 UI 介面視覺（3/3）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.7 7. UI 介面與視覺工程 (UI Architecture & Art Pipeline) · 第 3/3 段

> 續上段（表頭重複）。工作包 BML-09 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **BML-09** | M10 | 命鏡裂隙/定心者/稀有度 aura 靜態資產 | content | 5 | ⚪ 未開始 | - | 命鏡門、定心者與 aura 色齊備，不似 generic portal | sprites 中無 mirror 資產 |  |
| **BML-10** | M10 | 5 格命運故事帶圖 production 與（可選）極慢橫移 | content | 8 | ⚪ 未開始 | - | 代表角色 5 格故事圖齊備可讀 | 無 |  |
| **BML-11** | M10 | 國際化 motif layer 可替換與視覺禁區審查 | test | 2 | ⚪ 未開始 | BML-08 | 替換配色/符號後骨架成立，禁區清單審查通過 | 無 |  |
| **BMV3-01** | M10 | mirror-* 15 個元件節點拆分（root-frame 至 confirm-cta） | ui | 4 | 🟢 已接線 | - | 15 個元件在 layout 中有穩定節點名 | layouts/bloodline-mirror-main.json；skins/bloodline-mirror-default.json（元件逐項對照未核） |  |
| **BMV3-02** | M10 | 五種 state 變體（含 owned-legendary）CTA/tips/英靈亮度/aura/badge 差異 | ui | 3 | 📄 僅資料 | BMV3-01 | 五 state 切換時五項差異正確 | content/bloodline-mirror-states-v1.json 僅四 state，缺 owned-legendary |  |
| **BMV3-03** | M10 | 稀有度 aura 色映射（金/紫/藍/銀白）接到 mirror-rarity-aura | ui | 1 | ⚪ 未開始 | BMV3-01 | 各 rarity 顯示對應 aura 色 | UIRarityMark.ts 為通用稀有度標記，未接 mirror |  |
| **BMV3-04** | M10 | 低頻動效：命鏡霧化、定心者呼吸光、英靈邊緣淡閃（tween/opacity/additive） | ui | 3 | ⚪ 未開始 | BMV3-01 | 三種動效低頻運作且不影響閱讀 | 無 |  |
| **BMV3-05** | M10 | 右側英靈角色圖 production（同一名將、命紋/光痕） | content | 8 | ⚪ 未開始 | - | 代表武將英靈圖齊備且仍可辨識為同一人 | 無 |  |
| **BMV3-06** | M10 | 5 格故事圖 production 與命紋/徽記/aura 一致性 | content | 6 | ⚪ 未開始 | BMV3-05 | 故事圖與 aura、徽記風格一致 | 無 |  |
| **BMV3-07** | M10 | mirror-lock-badge / mirror-unowned-state-tag / mirror-confirm-cta 元件接線 | ui | 2 | 📄 僅資料 | BMV3-02 | 未持有顯示鎖定 badge，覺醒顯示 CTA | states-v1 欄位 PrimaryActionButton；元件接線未驗 |  |
| **BVC-01** | M10 | 正式視覺契約文件 bloodline-sigil-and-beast-contract-v1 落檔 | content | 2 | ⚪ 未開始 | - | 契約文件存在並列出因子-紋樣-材質-靈獸對照 | artifacts/ui-qa/UI-2-0054 不存在 |  |
| **BVC-02** | M10 | 六色因子對應紋樣/材質/靈獸 family 對照表（資料化） | data | 3 | ⚪ 未開始 | BVC-01 | 六色各有固定紋樣、材質、靈獸 family 的 JSON | 無 |  |
| **BVC-03** | M10 | 共用 crest 語言：角色頁/血統樹/血脈卡/英靈虎符/特種軍隊統一元件 | ui | 5 | 📄 僅資料 | BVC-02 | 五處使用同一組 crest sprite 與命名 | assets/resources/sprites/ui_families/general_detail/formal/crest_face_formal.png；LoadingScene EliteTroopCodex 有 SelectedTroopCrestArt |  |
| **BVC-04** | M10 | 禁區守則（無科技 DNA/HUD/實驗室）美術審查清單 | test | 1 | ⚪ 未開始 | - | 審查清單用於所有血脈美術 | 無 |  |
| **BVC-05** | M10 | 虎符/英靈卡/特種軍隊視覺對應（UI-2-0064） | content | 4 | ⚪ 未開始 | BVC-03 | 三類卡面採同一 crest 規則 | 無 |  |
| **BSS-01** | M10 | slot 契約文件 bloodline-symbol-slot-contract-v1 落檔 | content | 1 | 📄 僅資料 | - | 契約列出主/副/延伸共 8 種 slot 定義 | artifacts/ui-qa/UI-2-0054 不存在 | 未開始→僅資料；#1299 契約文件落檔（docs） |
| **BSS-02** | M10 | 男武將/女武將 prompt 模板回灌 slot 規則 | content | 3 | ⚪ 未開始 | BSS-01 | 兩份模板含 slot 與落地原則 | 無 |  |
| **BSS-03** | M10 | male/female/bloodline 三類 slot-map compare board | content | 3 | ⚪ 未開始 | BSS-02 | 三類 compare board 可供審查 | 無 |  |
| **BSS-04** | M10 | slot 與 UI crest/badge/icon/虎符兵牌對應表 | data | 2 | ⚪ 未開始 | BSS-01 | 對應表 JSON 覆蓋全部 slot | 無 |  |
| **BSS-05** | M10 | 核心武將立繪套用 slot 並驗收（血脈面不得恐怖裂痕） | content | 8 | ⚪ 未開始 | BSS-02 | 核心武將立繪皆含主 slot，審查通過 | 無 |  |
| **DS-14** | M0 | 存檔備份與壞檔自動退回上一份（讀檔失敗時退回最近一份有效備份） | logic | 3 | ✅ 已驗收 | DS-01 | 存檔寫入前保留上一份備份；主檔解析或驗證失敗時自動退回上一份並記錄；單元測試覆蓋壞檔與退回路徑 | [v14 核對 2026-10-21] 存檔備份與壞檔自動退回上一份（97217635，PROG-2-0885，#671）；PlayerSaveService 讀寫 _backupKey 並於讀檔失敗時退回，PlayerSaveBackup.test.ts 存在 |  |
| **FBR-12** | M6 | 因子揭露順序改照因子爆發系統 §K（FACTOR_DISCOVERY_LEVEL 綠 20→1、紅 45→20，代表色改白） | logic | 1 | 🟢 已接線 | - | 揭露門檻依 §K 推導，DiscoveryThresholds/FactorAwakening 讀同一門檻 | PROG-2-1465（#1276，ed52892e）；工時為估計值 | 新增列（協調線指示）；來源卡 PROG-2-1465；已接線 |
