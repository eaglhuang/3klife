# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.7 UI 介面視覺（3/3）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.7 UI 介面視覺（3/3）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.7 7. UI 介面與視覺工程 (UI Architecture & Art Pipeline) · 第 3/3 段

> 續上段（表頭重複）。工作包 BML-09 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **BML-09** | M10 | 命鏡裂隙/定心者/稀有度 aura 靜態資產 | content | 5 | 🟡 純邏輯 | - | 命鏡門、定心者與 aura 色齊備，不似 generic portal | 規格見 doc_spec_0677；MirrorStaticLayerConfig 四大圖層分離(鏡框/裂隙/定心印石/Aura)、1024x1024打包與TC-BML-09測試規格 | [v18.44 核對 2026-11-08] 規格 doc_spec_0677 定案；命鏡裂隙定心者與稀有度Aura靜態圖層分拆標準確立 |
| **BML-10** | M10 | 5 格命運故事帶圖 production 與（可選）極慢橫移 | content | 8 | 🟡 純邏輯 | - | 代表角色 5 格故事圖齊備可讀 | 規格見 doc_spec_0678；FateStripMotionContract 5格敘事長卷(2560x512)、0.5px/s無感正弦漂移與TC-BML-10測試規格 | [v18.44 核對 2026-11-08] 規格 doc_spec_0678 定案；五格命運故事帶長卷圖資產生產與慢速橫移動態契約確立 |
| **BML-11** | M10 | 國際化 motif layer 可替換與視覺禁區審查 | test | 2 | 🟡 純邏輯 | BML-08 | 替換配色/符號後骨架成立，禁區清單審查通過 | 規格見 doc_spec_0679；LocaleMotifMapping 多語系圖騰分層置換架構、四大跨文化禁區(CC-01~04)與TC-BML-11測試規格 | [v18.44 核對 2026-11-08] 規格 doc_spec_0679 定案；國際化Motif圖騰分層置換架構與跨文化視覺禁區審查標準確立 |
| **BMV3-01** | M10 | mirror-* 15 個元件節點拆分（root-frame 至 confirm-cta） | ui | 4 | 🟢 已接線 | - | 15 個元件在 layout 中有穩定節點名 | layouts/bloodline-mirror-main.json；skins/bloodline-mirror-default.json（元件逐項對照未核） |  |
| **BMV3-02** | M10 | 五種 state 變體（含 owned-legendary）CTA/tips/英靈亮度/aura/badge 差異 | ui | 3 | 🟡 純邏輯 | BMV3-01 | 五 state 切換時五項差異正確 | 規格見 doc_spec_0680；補齊UNOWNED/UNAWAKENED/AWAKENING/AWAKENED/OWNED_LEGENDARY五大State變體矩陣與TC-BMV3-02測試規格 | [v18.45 核對 2026-11-08] 規格 doc_spec_0680 定案；血脈命鏡五大狀態變體UI表現確立 |
| **BMV3-03** | M10 | 稀有度 aura 色映射（金/紫/藍/銀白）接到 mirror-rarity-aura | ui | 1 | 🟡 純邏輯 | BMV3-01 | 各 rarity 顯示對應 aura 色 | 規格見 doc_spec_0680；MIRROR_RARITY_AURA_MAP 五階稀有度靈光色相/半透明度/脈衝頻率映射與mirror-rarity-aura節點綁定契約 | [v18.45 核對 2026-11-08] 規格 doc_spec_0680 定案；稀有度Aura連動規格確立 |
| **BMV3-04** | M10 | 低頻動效：命鏡霧化、定心者呼吸光、英靈邊緣淡閃（tween/opacity/additive） | ui | 3 | 🟡 純邏輯 | BMV3-01 | 三種動效低頻運作且不影響閱讀 | 規格見 doc_spec_0673；命鏡水墨霧化、定心者呼吸光(2.4s週期)與英靈邊緣淡閃低頻動效及Aura色階規格 | [v18.42 核對 2026-11-08] 規格 doc_spec_0673 定案；血脈命鏡低頻水墨動效與稀有度Aura渲染確立 |
| **BMV3-05** | M10 | 右側英靈角色圖 production（同一名將、命紋/光痕） | content | 8 | ⚪ 未開始 | - | 代表武將英靈圖齊備且仍可辨識為同一人 | 無 |  |
| **BMV3-06** | M10 | 5 格故事圖 production 與命紋/徽記/aura 一致性 | content | 6 | 🟡 純邏輯 | BMV3-05 | 故事圖與 aura、徽記風格一致 | 規格見 doc_spec_0678；5格故事圖中旗幟/佩玉/兵刃靈紋嚴格依循doc_spec_0670與doc_spec_0675之Crest徽記一致性契約 | [v18.44 核對 2026-11-08] 規格 doc_spec_0678 定案；故事圖命紋徽記一致性約束確立 |
| **BMV3-07** | M10 | mirror-lock-badge / mirror-unowned-state-tag / mirror-confirm-cta 元件接線 | ui | 2 | 🟡 純邏輯 | BMV3-02 | 未持有顯示鎖定 badge，覺醒顯示 CTA | 規格見 doc_spec_0682；MirrorInteractionWiringContract 鎖定印鑑/未持有標籤/主操作CTA元件接線、400ms防刷冷卻與解鎖碎裂演出契約 | [v18.45 核對 2026-11-08] 規格 doc_spec_0682 定案；命鏡三大元件接線與防刷冷卻契約確立 |
| **BVC-01** | M10 | 正式視覺契約文件 bloodline-sigil-and-beast-contract-v1 落檔 | content | 2 | 🟡 純邏輯 | - | 契約文件存在並列出因子-紋樣-材質-靈獸對照 | 規格見 doc_spec_0670；bloodline-sigil-and-beast-contract-v1 視覺契約落檔、六色因子-靈獸-青銅紋樣-色彩對照 | [v18.41 核對 2026-11-08] 規格 doc_spec_0670 定案；正式視覺契約文件 bloodline-sigil-and-beast-contract-v1 落檔確立 |
| **BVC-02** | M10 | 六色因子對應紋樣/材質/靈獸 family 對照表（資料化） | data | 3 | 🟡 純邏輯 | BVC-01 | 六色各有固定紋樣、材質、靈獸 family 的 JSON | 規格見 doc_spec_0670；BloodlineSigilBeastContract 六色因子紋樣材質靈獸共用資料契約型別與JSON結構 | [v18.41 核對 2026-11-08] 規格 doc_spec_0670 定案；六色因子對應紋樣/材質/靈獸全域資料契約確立 |
| **BVC-03** | M10 | 共用 crest 語言：角色頁/血統樹/血脈卡/英靈虎符/特種軍隊統一元件 | ui | 5 | 🟡 純邏輯 | BVC-02 | 五處使用同一組 crest sprite 與命名 | 規格見 doc_spec_0671；BloodlineCrestWidget 四大尺寸階梯、圖集合批(1 DrawCall)與五大UI入口共用契約 | [v18.42 核對 2026-11-08] 規格 doc_spec_0671 定案；五大UI入口共用血脈徽記元件與渲染契約確立 |
| **BVC-04** | M10 | 禁區守則（無科技 DNA/HUD/實驗室）美術審查清單 | test | 1 | 🟡 純邏輯 | - | 審查清單用於所有血脈美術 | 規格見 doc_spec_0674；ArtReviewChecklist 五大絕對禁區(T-01~T-05)、100分制評分機制與TC-BVC-04測試規格 | [v18.43 核對 2026-11-08] 規格 doc_spec_0674 定案；血脈美術禁區守則與無科技HUD視覺審查清單確立 |
| **BVC-05** | M10 | 虎符/英靈卡/特種軍隊視覺對應（UI-2-0064） | content | 4 | 🟡 純邏輯 | BVC-03 | 三類卡面採同一 crest 規則 | 規格見 doc_spec_0675；TrinityVisualBindingSpec 虎符兵牌、英靈命卡、特種軍隊大纛戰旗三位一體視覺對應與稀有度色階規格 | [v18.43 核對 2026-11-08] 規格 doc_spec_0675 定案；虎符英靈卡特種軍隊三位一體視覺對應標準確立 |
| **BSS-01** | M10 | slot 契約文件 bloodline-symbol-slot-contract-v1 落檔 | content | 1 | 🟡 純邏輯 | - | 契約列出主/副/延伸共 8 種 slot 定義 | 規格見 doc_spec_0672；bloodline-symbol-slot-contract-v1 八大Symbol Slot語義位置與Prompt回灌禁令規格 | [v18.42 核對 2026-11-08] 規格 doc_spec_0672 定案；血脈象徵八大Slot契約落檔 |
| **BSS-02** | M10 | 男武將/女武將 prompt 模板回灌 slot 規則 | content | 3 | 🟡 純邏輯 | BSS-01 | 兩份模板含 slot 與落地原則 | 規格見 doc_spec_0676；Male General(重型甲冑獸吞/兵刃靈符)與Female General(腰佩玉符/袍甲雲紋)男女武將Prompt模板回灌八大Slot規則 | [v18.43 核對 2026-11-08] 規格 doc_spec_0676 定案；男女名將立繪Prompt回灌Slot規則確立 |
| **BSS-03** | M10 | male/female/bloodline 三類 slot-map compare board | content | 3 | 🟡 純邏輯 | BSS-02 | 三類 compare board 可供審查 | 規格見 doc_spec_0676；Male/Female/Bloodline 三類 Slot-Map Compare Board 2K 4格對照看板產出規格與審查標準 | [v18.43 核對 2026-11-08] 規格 doc_spec_0676 定案；三類Slot-Map Compare Board審查標準確立 |
| **BSS-04** | M10 | slot 與 UI crest/badge/icon/虎符兵牌對應表 | data | 2 | 🟡 純邏輯 | BSS-01 | 對應表 JSON 覆蓋全部 slot | 規格見 doc_spec_0672；SymbolSlotDefinition 八大Slot與UI徽記/虎符兵牌/特種軍旗映射對照矩陣 | [v18.42 核對 2026-11-08] 規格 doc_spec_0672 定案；Slot與UI徽記兵牌映射對照確立 |
| **BSS-05** | M10 | 核心武將立繪套用 slot 並驗收（血脈面不得恐怖裂痕） | content | 8 | 🟡 純邏輯 | BSS-02 | 核心武將立繪皆含主 slot，審查通過 | 規格見 doc_spec_0681；趙雲/關羽/諸葛亮/甄姬/孫尚香五大名將八大Slot套用標準、面部非恐怖裂痕量化驗收指標與TC-BSS-05測試規格 | [v18.45 核對 2026-11-08] 規格 doc_spec_0681 定案；核心名將立繪SymbolSlot套用與非恐怖裂痕審查驗收確立 |
| **DS-14** | M0 | 存檔備份與壞檔自動退回上一份（讀檔失敗時退回最近一份有效備份） | logic | 3 | ✅ 已驗收 | DS-01 | 存檔寫入前保留上一份備份；主檔解析或驗證失敗時自動退回上一份並記錄；單元測試覆蓋壞檔與退回路徑 | [v14 核對 2026-10-21] 存檔備份與壞檔自動退回上一份（97217635，PROG-2-0885，#671）；PlayerSaveService 讀寫 _backupKey 並於讀檔失敗時退回，PlayerSaveBackup.test.ts 存在 |  |
| **FBR-12** | M6 | 因子揭露順序改照因子爆發系統 §K（FACTOR_DISCOVERY_LEVEL 綠 20→1、紅 45→20，代表色改白） | logic | 1 | 🟢 已接線 | - | 揭露門檻依 §K 推導，DiscoveryThresholds/FactorAwakening 讀同一門檻 | PROG-2-1465（#1276，ed52892e）；工時為估計值 | 新增列（協調線指示）；來源卡 PROG-2-1465；已接線 |
