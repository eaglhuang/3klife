# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.7 UI 介面視覺（2/3）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.7 UI 介面視覺（2/3）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.7 7. UI 介面與視覺工程 (UI Architecture & Art Pipeline) · 第 2/3 段

> 續上段（表頭重複）。工作包 HUM-06 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **HUM-06** | M9 | GeneralJournalPeek 日誌氣泡與完整生平實錄彈窗 | ui | 4 | 🟡 純邏輯 | HUM-01 | 氣泡顯示時間戳+動作，點擊開生平彈窗 | GeneralJournalPeek.ts（PROG-2-1969 #1874） | [v17.7 更正 2026-11-07] 未開始→純邏輯；已做、待接人物頁 UI |
| **HUM-07** | M9 | 任務適合度 Suitability Badge 與大廳任務牆跳轉 | ui | 3 | ⚪ 未開始 | HUM-01 | 自告奮勇+50% 任務顯示自薦徽章並可跳轉 | 無（依賴大廳任務牆） |  |
| **GDART-01** | M10 | 共用骨架節點命名固定（Overlay/PopupBody/HeaderPanel/SummaryStrip/TabBar/ContentFrame/FooterPanel） | ui | 2 | 🟢 已接線 | - | 節點名與 GeneralDetailPanel 查找路徑一致 | assets/resources/ui-spec/layouts/general-detail-main.json；GeneralDetailComposite.ts 使用 RightTabBar/ContentSlot 等；與清單命名不完全一致 |  |
| **GDART-02** | M10 | bg_ink_main 不對稱九宮格背景延展 | ui | 1 | 🟢 已接線 | - | 左右 border 保留立繪留白與山景，禁 simple 縮放 | assets/resources/ui-spec/skins/general-detail-default.json；ui-spec/placeholders/bg_ink_detail |  |
| **GDART-03** | M10 | 通用 panel 框體 variants 與 popup_card_bg 九宮格統一 | content | 2 | 🟢 已接線 | - | header/section/footer 共用同一九宮格邊界 | assets/resources/sprites/common/popup_card_bg（依清單進度補充，現況未逐檔驗證） |  |
| **GDART-04** | M10 | frame/bleed/fill/accent 分層 slot 家族 32 個 skin slot 落地 | content | 8 | 📄 僅資料 | GDART-03 | general-detail-default 含 32 個分層 slot 並以 fill->bleed->frame->content 渲染 | skins/general-detail-default.json 現僅相容期單層 slot；skinLayers 測試 tests/ucuf/skinLayers.test.ts 為通用框架 |  |
| **GDART-05** | M10 | 六頁 tab icon（idle/active 兩態）production 與接線 | content | 4 | ⚪ 未開始 | GDART-01 | 六個 tab icon 兩態齊備且按鈕尺寸不變 | assets/resources/sprites/ui/general-detail 目錄不存在 |  |
| **GDART-06** | M10 | Row icon 家族（約 25 個）production 與命名 | content | 6 | ⚪ 未開始 | GDART-05 | §6.2 清單 icon 全數存在 spriteFrame 並可載入 | assets/resources/sprites/ui/general-detail 目錄不存在 |  |
| **GDART-07** | M10 | 頁籤按鈕 normal/pressed/disabled 狀態圖與 44x44 觸控區 | ui | 2 | 📄 僅資料 | GDART-05 | 三態視覺齊備且觸控區≥44x44 | GeneralDetailComposite.ts tab 按鈕；無視覺驗收 |  |
| **GDART-08** | M10 | 底部操作區 BtnClose 與預留 BtnCompare/Favorite/Lock 節點 | ui | 1 | 📄 僅資料 | GDART-01 | 僅 BtnClose 啟用，其餘節點保留 inactive | layouts/general-detail-main.json 是否含預留節點未逐項核對 |  |
| **GDART-09** | M6 | GeneralPortraitPanel 全幅立繪面板（RAW 尺寸、Overflow 保護、Texture2D fallback） | ui | 4 | 🟢 已接線 | - | 抽卡/圖鑑可開全幅立繪，不變形且文字不被壓縮 | layouts/general-portrait-main.json；screens/general-portrait-screen.json；skins/general-portrait-default.json |  |
| **GDART-10** | M0 | 美術接線交付檢查（節點名/icon 兩態/鎖定樣式/手機觸控）自動化 | test | 3 | 🟡 純邏輯 | GDART-01 | validate-ui-specs 可檢查節點名與 icon 槽位 | tools_node/validate-ui-specs.js 通用檢查；清單 §7 五項未自動化 | 僅資料→純邏輯；#1298 ArtWiringIcons 僅測試，無 src 呼叫端 |
| **GDART-11** | M10 | 人工視覺驗證：tabbar/summary ornament 密度實機比例 | test | 2 | ⚪ 未開始 | GDART-04 | 實機截圖審查通過 | 清單自述『未完成』 |  |
| **PC-01** | M11 | PersonaCard schema（general_persona_v2）與輸出契約 | data | 2 | ⚪ 未開始 | - | persona-card.response.json schema 驗證通過 | find 無 *persona* schema；僅 scratch/vector-ready-sima-yi/vector-records.persona.jsonl 實驗檔 |  |
| **PC-02** | M11 | build_persona_cards.py 骨架：讀 generals.json、events.jsonl、keyword pack | tool | 3 | ⚪ 未開始 | PC-01 | 可對單一/全部武將輸出 {id}.persona.json、index、summary.md | server/npc-brain/pipelines/sanguo-rag/build_persona_cards.py 不存在 |  |
| **PC-03** | M11 | 事件過濾規則（ready、排除 alias-smoke、排除 fixture-only、需含目標武將） | logic | 1 | ⚪ 未開始 | PC-02 | 四條過濾規則各有測試 | 無 |  |
| **PC-04** | M11 | 欄位生成與去重排序（relationshipAnchors/keywordAnchors≤12/moodAnchors/evidenceRefs） | logic | 3 | ⚪ 未開始 | PC-02 | 欄位生成順序與規格表一致 | 無 |  |
| **PC-05** | M11 | derive_generic_traits 推導與 generic taboos/llmPromptRules | logic | 2 | ⚪ 未開始 | PC-02 | str>=80、int>=85 等規則與保底有單測 | 無 |  |
| **PC-06** | M11 | PERSONA_PRESETS 與 CORE_REVIEW_GENERAL_IDS 六核心名將人工審查 | content | 3 | ⚪ 未開始 | PC-02 | 張飛/關羽/趙雲/劉備/曹操/諸葛亮 preset 完成並 manualReviewRequired=true | 無 |  |
| **PC-07** | M11 | gold_seed_registry 與 changban-bridge gold seed 事件 | data | 2 | ⚪ 未開始 | PC-03 | changban-bridge 可經通用抽取器產出 battle cluster | find gold_seed_registry 無結果 |  |
| **PC-08** | M11 | edgeConfidence/edgeStrength 分離與 relationship edge 模型 | data | 1 | ⚪ 未開始 | PC-04 | edge 同時含兩欄位且 strength 可空 | 無 |  |
| **PC-09** | M11 | 通用事件抽取器 generic-battle-candidate-v1 與 review queue（pending/accepted/rejected） | tool | 6 | ⚪ 未開始 | PC-03 | candidate 預設 needs-review，不直接入正式 persona | 無 |  |
| **PC-10** | M11 | keyword pack 投影（build_keyword_options） | tool | 3 | ⚪ 未開始 | PC-09 | 由 accepted events 產出 {generalId}.keywords.json | 無 |  |
| **PC-11** | M11 | Persona Card API 與 Cocos 接線（events->keyword->persona->API->Cocos） | server | 4 | ⚪ 未開始 | PC-04 | 客戶端可讀 persona card 並顯示 | server/src 內無 persona 相關 |  |
| **PC-12** | M11 | LLM proposer/renderer 接入（Gemini/Ollama/vLLM）與 schema gate 驗證 | server | 6 | ⚪ 未開始 | PC-11 | LLM 只提案不定案，無 evidence 不生成 | 無 |  |
| **BML-01** | M10 | 共用 layout/skin：bloodline-mirror-loading-main + default（五大模組） | ui | 3 | 🟢 已接線 | - | StateBadge/MirrorHeader/CenterStage/TipPanel/ActionRow/StoryStrip 渲染通過驗證 | assets/resources/ui-spec/layouts/bloodline-mirror-loading-main.json；skins/bloodline-mirror-loading-default.json；LobbyScene.ts 預覽掛載 |  |
| **BML-02** | M10 | loading 與 awakening screen JSON 與 content.source 綁定 | ui | 2 | 🟢 已接線 | BML-01 | 兩 screen 讀 bloodline-mirror-states-v1 的對應 state | screens/bloodline-mirror-loading-screen.json、bloodline-mirror-awakening-screen.json |  |
| **BML-03** | M10 | 四 state 內容契約（loading/awakening/ascension/unowned-preview）與 schema | data | 2 | 📄 僅資料 | BML-01 | validate-ui-specs --check-content-contract 通過 | content/bloodline-mirror-states-v1.json；contracts/bloodline-mirror-state-content.schema.json；tests/ucuf/validateUiSpecsCli.test.ts（通用） |  |
| **BML-04** | M10 | 升星/二轉 ascension 與 unowned-preview 獨立 screen | ui | 2 | 📄 僅資料 | BML-02 | 升星與未持有預覽可由 screen 路由進入 | 僅有 state 內容；無 ascension/unowned screen JSON |  |
| **BML-05** | M10 | Loading 流程實際接線：場景切換顯示命鏡並輪播角色 | ui | 3 | 📄 僅資料 | BML-02 | 場景切換時顯示命鏡 Loading，可輪播含未持有角色 | core/config/UIConfig.ts UIID.BloodlineMirrorLoading 已登記；LoadingScene.ts 未使用命鏡；僅 LobbyScene 預覽 |  |
| **BML-06** | M10 | 覺醒/升星成功過場觸發（升星、二轉、血脈卡啟動） | logic | 3 | ⚪ 未開始 | BML-04 | 升星/覺醒成功事件觸發過場並回到流程 | UIConfig 有 awakening prefab 登記；無事件觸發 |  |
| **BML-07** | M10 | 未持有角色展示規則（未結識/命格未開/尚未得其英靈 badge，不劇透數值） | ui | 2 | 📄 僅資料 | BML-04 | 未持有狀態顯示三種標示且隱藏數值 | states-v1 unowned-preview state 文案；無 runtime 驗證 |  |
| **BML-08** | M10 | 左右雙人物大圖 production（表象面/血脈面）與中線漸層 | content | 8 | ⚪ 未開始 | - | 代表武將具備左右雙圖且中線自然滲透 | 無雙面立繪資產 |  |
