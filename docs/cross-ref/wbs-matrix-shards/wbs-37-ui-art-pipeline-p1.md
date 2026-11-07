# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.7 UI 介面視覺（1/3）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.7 UI 介面視覺（1/3）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.7 7. UI 介面與視覺工程 (UI Architecture & Art Pipeline) · 第 1/3 段

> 涵蓋武將資訊介面 (GDUI/GDV3)、戰場介面 (BML/BMV3)、美術資產索引、肖像裁切標準與視覺反饋。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **GDUI-01** | M10 | 六 tab 外層骨架與 route key 路由（Header/SummaryStrip/TabRail/ContentHost） | ui | 3 | 🟢 已接線 | - | 六 tab 依規格順序與 route key 切換，Default_Tab 只接受六個合法值 | assets/scripts/ui/components/GeneralDetailComposite.ts（TAB_ORDER、_switchToTab）；ui-spec screens/general-detail-unified-screen.json；順序與規格不一致 |  |
| **GDUI-02** | M10 | 將頁 Overview：身份/生命週期/名聲官職/統領軍勢/升星入口 | ui | 3 | 🟢 已接線 | GDUI-01 | Overview 顯示規格 §4 七項，升星僅在可升星角色出現，預估出征軍勢=min 三值 | assets/scripts/ui/components/general-detail/GeneralDetailOverviewChild.ts；GeneralDetailOverviewMapper.ts；character-ds3/CharacterDs3OverviewChild.ts；缺升星入口條件/出征軍勢公式測試 |  |
| **GDUI-03** | M10 | 屬頁 Stats：六色屬性、Talent/Prowess 雙層、能力評語、教官群 | ui | 3 | 🟢 已接線 | GDUI-01 | Stats 顯示六色雙層數值、評語、六位教官並支援 HIDDEN/TENDENCY/RANGE/EXACT | character-ds3/CharacterDs3StatsChild.ts（479 行）；general-detail/GeneralDetailStatsChild.ts；無專屬測試 |  |
| **GDUI-04** | M10 | 命頁左半：隱藏立繪層+14 人祖先圖+祖先 detail peek | ui | 4 | 🟢 已接線 | GDUI-01 | 三代 14 節點不被立繪遮斷，點擊開 peek，未揭露顯示鎖/問號 | [v16.4 第二批核對 2026-10-27] master #1059–#1101 已接上（已接線）；待 QA／實機驗收 |  |
| **GDUI-05** | M10 | 命頁右半六塊資訊欄（血脈摘要/靈獸/奧義軌/特殊因子/EP與覺醒進度/英靈卡操作） | ui | 5 | 🟢 已接線 | GDUI-04 | 六塊依固定順序渲染，英靈卡支援插入/更換/卸下/設主卡/詳情 | [v16.5 第四批核對 2026-10-27] master #1144–#1199 已接上（已接線）；待 QA／實機驗收 |  |
| **GDUI-06** | M10 | StoryDock 三態（COLLAPSED/HALF/EXPANDED）抽拉與 layout reflow | ui | 3 | 🟢 已接線 | GDUI-04 | 三態切換時主血統區以 reflow 縮放且不被 overlay 覆蓋 | [v16.4 第三批核對 2026-10-27] master #1102–#1143 已接上（已接線）；待 QA／實機驗收 |  |
| **GDUI-07** | M2 | 五階血脈傳承奧義邏輯：Stage_Cap/Stage_Current、名聲+事蹟點亮、升星開上限 | logic | 4 | 🟢 已接線 | - | 升星僅改 Stage_Cap、覺醒僅改 Stage_Current，名聲 100/300/700/1500/3000 門檻與點亮協議定案 | 已由 doc_spec_0322 確立 Stage_Cap 與 Stage_Current 雙軌、名聲事蹟門檻與五階符印點亮規範 | [v17.4 更正 2026-11-07] 純邏輯→已接線；規格 doc_spec_0322 定案 |
| **GDUI-08** | M8 | Lineage_Seal 譜牒印記與子孫/史實名將升星分流 | logic | 3 | 🟢 已接線 | GDUI-07 | 史實名將吃同模板卡/魂石、子孫吃 Lineage_Seal 譜牒印記升星分流定案 | 已由 doc_spec_0322 確立史實名將與子嗣升星素材分流及祠堂印記產出機制 | [v17.4 更正 2026-11-07] 未開始→已接線；規格 doc_spec_0322 定案 |
| **GDUI-09** | M2 | 命紋靈獸資料與覺醒傾向（Bloodline_Beast/Archetype/Persona_Tags/Awakening_Tendency） | data | 2 | 🟢 已接線 | - | 每個靈獸綁定原型、2~3 人格標籤、覺醒傾向並可由 ui 讀取 | [v11 核對 2026-10-20] 命紋靈獸暫定清單與 cc 摘要接線（02515484，PROG-2-0720）；BloodlineBeast 由 LobbyScene 呼叫，測試存在 |  |
| **GDUI-10** | M10 | 技頁 Tactics：已習得/可習得/未解鎖三態與戰法詳情 | ui | 3 | 🟢 已接線 | GDUI-01 | 三態以彩色/半透明/灰階顯示，含等級、TP、類型 | [v16.4 第二批核對 2026-10-27] master #1059–#1101 已接上（已接線）；待 QA／實機驗收 |  |
| **GDUI-11** | M8 | 寶頁 Equip：2x3 裝備格、傳家寶、道具摘要、評價 | ui | 3 | 🟢 已接線 | GDUI-01 | 六格 WEAPON/HEAD/BODY/BOOTS/ACCESSORY_A/B 與傳家寶顯示，不含英靈卡/虎符 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **GDUI-12** | M5 | 兵頁 Aptitude：兵種/地形/天氣適性+虎符槽與摘要 | ui | 4 | 🟢 已接線 | GDUI-01 | 適性三表與虎符槽可裝備/替換/卸下，BATTLE_LOCKED 時不可更換 | general-detail/GeneralDetailAptitudeChild.ts；general-detail/TigerTallyComposite.ts、TigerTallyPanel.ts；CharacterDs3AptitudeChild 為空殼 |  |
| **GDUI-13** | M10 | Data Read Model 映射層與資訊揭露四階/NO_DATA 狀態 | logic | 3 | 🟢 已接線 | GDUI-01 | §10 全部欄位有 mapper，HIDDEN/TENDENCY/RANGE/EXACT/NO_DATA 不填假資料 | [v16.5 第四批核對 2026-10-27] master #1144–#1199 已接上（已接線）；待 QA／實機驗收 |  |
| **GDUI-14** | M0 | 人物頁 ui-spec 契約與驗證（layout/skin/screen/content schema） | test | 2 | 🟢 已接線 | - | validate-ui-specs 通過六 child panel 必要模組 | tools_node/validate-ui-specs.js；tests/ucuf/validateUiSpecsCli.test.ts；contracts/general-detail-content.schema.json；Layout Contract §11 模組未逐項驗證 |  |
| **GDV3-01** | M10 | 日常人物頁 v3 layout：gd-root-frame/左立繪載體/右資訊卡/故事帶 | ui | 3 | 🟢 已接線 | - | layout JSON 依四大容器渲染且通過 ui-spec 驗證 | assets/resources/ui-spec/layouts/general-detail-unified-main.json、general-detail-bloodline-v3-main.json；screens/general-detail-bloodline-v3-screen.json |  |
| **GDV3-02** | M10 | gd-attribute-grid：Prowess 主顯+Talent 印章資質層 | ui | 2 | 🟢 已接線 | GDV3-01 | 同時顯示 Prowess 與 Talent 兩層數值 | character-ds3/CharacterDs3StatsChild.ts；無測試 |  |
| **GDV3-03** | M10 | gd-nameplate/gd-role-card/gd-trait-card 資訊模組 | ui | 2 | 🟢 已接線 | GDV3-01 | 名牌、定位、特質卡三模組可顯示 | character-ds3/CharacterDs3OverviewChild.ts；GeneralDetailOverviewVisuals.ts |  |
| **GDV3-04** | M10 | gd-bloodline-card 與 gd-bloodline-crest 靜態徽記 | ui | 2 | 📄 僅資料 | GDV3-01 | 血脈卡顯示命紋徽記 sprite，不使用直白獸首 icon | sprites/ui_families/general_detail/formal/crest_face_formal.png；CharacterDs3BloodlineChild 空殼 |  |
| **GDV3-05** | M10 | 6 格故事帶 story-strip-rail 與 story-cell-01~06 slot | ui | 3 | 📄 僅資料 | GDV3-01 | 六格固定 slot 讀 storyStripCells 並依六段節奏顯示 | GeneralUnit.ts storyStripCells、defaultTab 欄位；UI 節點未見實作 |  |
| **GDV3-06** | M10 | 六格故事節奏內容（早年/入世/功績/命運/血脈真相/延續）撰寫 | content | 5 | 📄 僅資料 | - | 名將故事六格文案符合節奏並通過 schema | GeneralUnit.storyStripCells 型別；generals.json 實際故事格內容比例未驗 |  |
| **GDV3-07** | M10 | 命紋徽記 family 與背景 motif 資產（crest family）production | content | 5 | ⚪ 未開始 | GDV3-04 | 徽記可 family 化並與色彩因子一致 | 僅 crest_face_formal.png 一張；無 crest family |  |
| **GDV3-08** | M10 | 可行性邊界守則：日常頁排除長駐血脈虛影/強發光/跑馬燈 | test | 1 | ⚪ 未開始 | GDV3-01 | 審查清單確認日常頁無被排除的效果 | 無自動檢查 |  |
| **HUM-01** | M9 | GeneralUnit 擴充 personality/loyalty/recentLog/currentSuitability 資料模型 | data | 2 | ⚪ 未開始 | - | 四個選填欄位進型別與 generals schema 並向下相容 | grep personality\|loyalty 於 assets/scripts/core/models/GeneralUnit.ts 無結果 |  |
| **HUM-02** | M10 | 性格圖騰四型 icon family 與 Header 徽章（義綠/豪紅/睿藍/貪紫） | ui | 3 | ⚪ 未開始 | HUM-01 | Header 緊鄰職能標籤顯示對應顏色圓徽與提示文案 | 無 |  |
| **HUM-03** | M9 | 性格驅動離線行為規則（尋訪/喝酒/內政/遊歷） | logic | 4 | ⚪ 未開始 | HUM-01 | 四性格依規格觸發對應晨報行為，有單元測試 | 無 |  |
| **HUM-04** | M9 | 忠誠度條 UI 與來源鎖定（轉蛋 100 鎖） | ui | 3 | 🟢 已接線 | HUM-01 | 非轉蛋武將顯示 0~100 條，<60 橙、<30 紅，轉蛋顯示鎖定 100 | LoyaltyGauge 被 CharacterDs3StatsChild 匯入；#1350、轉蛋鎖 100 接線 #1352 | [v17.2 更正 2026-11-07] 未開始→已接線 |
| **HUM-05** | M9 | 忠誠度系統邏輯與沒收虎符 -30 提示 | logic | 3 | 🟢 已接線 | HUM-04 | 沒收虎符彈提示並扣 30，低忠誠觸發下野/被勸降 | TigerTallyLoyalty 沒收降忠 30 點，CharacterDs3AptitudeChild 沒收按鈕；#1363 | [v17.2 更正 2026-11-07] 未開始→已接線 |
