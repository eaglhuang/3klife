<!-- doc_id: doc_index_0003 -->
> **2026-04-29 UI 規格索引補充**：人物頁正式收斂為 `將 / 屬 / 命 / 技 / 寶 / 兵` 六頁：`將` 顯示 `名聲 / 官職 / 帶兵上限 / 可用城市兵源 / 預估出征軍勢`，`命` 顯示 14 人祖先血統圖、命紋靈獸、五階血脈傳承奧義、英靈卡命槽與底部可抽拉 `StoryDock`，`寶 / GEAR` 顯示一般裝備 / 傳家寶 / 道具，`兵 / Aptitude` 顯示戰場適性與虎符槽；主戰場 HUD 顯示 `軍勢 / 糧草 / 計謀點 / 場上部隊數`；治理頁顯示 `人口 / 城市兵源 / 補兵速度`。舊的 `Level / EXP / 戰備值主顯示 / Command_Load 主限制` 不再作為正式 UI contract。

# Cross-Reference: UI Spec JSON 資產索引

> 這是 doc_index_0007 的 C 節分片。完整索引見 `docs/cross-reference-index.md (doc_index_0007)` (doc_index_0007)。
> 最後更新請參考母檔 Header。
>
> **doc_id 查詢**：用 `node tools_node/resolve-doc-id.js <搜尋詞>` 查文件代號，或瀏覽 `docs/doc-id-registry.md (doc_other_0006)` (doc_other_0006)。
> ⚠️ **壓縮版（doc_id 索引）**：中文名稱已移除，查詢名稱請用 resolve-doc-id.js。人類可讀進度 → `docs/cross-ref/cross-ref-進度.md (doc_index_0017)` (doc_index_0017)

## C. UI Spec JSON 資產索引（assets/resources/ui-spec/）

> 三層合約：`layouts/` 節點樹 → `skins/` 外觀資源 → `screens/` 組裝+資料綁定  
> Bundle: `lobby_ui`；Atlas 分組見各檔 `atlasPolicy` 欄位

### C-0. UI 元件尺寸契約（新增 2026-04-09）

| 文件 | 用途 |
|------|------|
| doc_ui_0038 | **Repo 級唯一尺寸真相來源**：幾何行為六類（FX/SS/SR/TR/LC/DI）、Title A/B 二分規則、元件標準尺寸矩陣、Screen Sizing Table 格式規範 |

**每份 screen spec / task card 必須有 Component Sizing Table 才算規格齊備。**

| 檔案 | 類型 | 對應規格書 | Atlas | 備注 |
|---|---|---|---|---|
| `layouts/support-card-main.json` | layout | doc_spec_0027 | lobby_support_card | 三欄 Grid，450×460 cell，4-tab |
| `skins/support-card-default.json` | skin | doc_spec_0027 | lobby_support_card | 稀有度卡背、星星槽、突破按鈕 |
| `screens/support-card-screen.json` | screen | doc_spec_0027 | — | 3 screens + 2 popups（突破確認/好友借用） |
| `layouts/gacha-main.json` | layout | doc_spec_0042 | lobby_gacha | 雙池分頁、PityBar、CurrencyBar、Pull1+Pull10 |
| `skins/gacha-default.json` | skin | doc_spec_0042 | lobby_gacha | 三池 bg 變體、結果卡背三稀有度、天命商店 |
| `screens/gacha-screen.json` | screen | doc_spec_0042 | — | 3 screens + 2 popups（機率公告/求籤定向） |
| `layouts/lobby-main-main.json` | layout | doc_spec_0002 | lobby_ui | 大廳主場景骨架，承接雙牆 / 世界沙盤 / 許願祭壇掛點 |
| `skins/lobby-main-default.json` | skin | doc_spec_0002 | lobby_ui | 議事廳主題、節慶插槽、沙盤與任務牆外觀 |
| `screens/lobby-main-screen.json` | screen | doc_spec_0002、doc_spec_0014 | — | 大廳主入口 screen，讀取官職快照與世界沙盤狀態 |
| `layouts/lobby-mission-detail-dialog-main.json` | layout | doc_spec_0002 | lobby_ui | 800×900 中央任務詳情彈窗骨架 |
| `skins/lobby-mission-detail-dialog-default.json` | skin | doc_spec_0002 | lobby_ui | 任務詳情彈窗外觀 |
| `contracts/lobby-mission-detail-dialog-content.schema.json` | contract | doc_spec_0002 | — | 任務詳情彈窗內容契約：情報揭露度、獎勵 / 消耗、派遣 AI 委任 |
| `content/lobby-mission-detail-dialog-states-v1.json` | content | doc_spec_0002 | — | `smoke-military-partial` / `smoke-domestic-revealed` 樣本 |
| `screens/lobby-mission-detail-dialog-screen.json` | screen | doc_spec_0002 | — | 軍事 / 內政任務詳情中央彈窗 screen，含情報揭露度模式與派遣 AI 委任 |
| `layouts/general-detail-unified-main.json` | layout | doc_ui_0012 / doc_spec_0174 | general_detail | 武將人物介面 2.0 六分頁 layout；含 `將 / 屬 / 命 / 技 / 寶 / 兵`、命頁血統舞台、右側命格資訊欄與 StoryDock |
| `skins/general-detail-unified-default.json` | skin | doc_ui_0012 / doc_spec_0174 | general_detail | 武將人物介面 2.0 skin；維持同一套 tab chrome，命頁採祖紋命篆 / 命紋靈獸語彙 |
| `screens/general-detail-unified-screen.json` | screen | doc_ui_0012 / doc_spec_0174 | general_detail | 武將人物介面 2.0 screen；route key 固定為 `Overview / Stats / Bloodline / Tactics / Equip / Aptitude` |
| `layouts/spirit-tally-detail-main.json` | layout | doc_spec_0012、doc_spec_0022、doc_spec_0174 | general_detail | 英靈 / 虎符詳情 layout，承接人物頁 `寶` 分頁 |
| `skins/spirit-tally-detail-default.json` | skin | doc_spec_0012、doc_spec_0022、doc_spec_0174 | general_detail | 英靈 / 虎符詳情外觀 |
| `screens/spirit-tally-detail-screen.json` | screen | doc_spec_0012、doc_spec_0022、doc_spec_0174 | — | 英靈 / 虎符詳情 screen |

### C-2. UI Spec JSON → 規格書（反向索引）

| UI Spec JSON | 主要依賴規格書 | 相關 Schema 欄位 |
|---|---|---|
| support-card-*.json (×3) | doc_spec_0027 §B, §D, §F, §K, §L, §M | Support_Card_ID, Star_Level, Training_Slot_Affinity, Synergy_Partners, Decompose_Value, BorrowSession, Role_Boundary |
| gacha-*.json (×3) | doc_spec_0042 §C, §E, §F, §I | Hero_Pool, Support_Pool, Pool_Positioning, Pity_Independent, Player_Currency（Spirit_Jade/Bronze_Charm/Divination_Token） |
| lobby-main-*.json (×3) | doc_spec_0002 §E, §I、doc_spec_0014 §E, §I | Mission_Boards, Task_Title, Task_Brief, Task_Detail, Intel_Reveal_Percent, Selected_General_UID, Rewards, Costs, Available_Actions, AI_Assign_Enabled, Officer_Snapshot, World_Sandtable, Wish_Altar, Volunteer_Event_Log, Morning_Report_Summary, Dispatch_Board_State |
| lobby-mission-detail-dialog-screen.json | doc_spec_0002 §E, §F, §H | Mission_Boards, Intel_Reveal_Percent, Selected_General_UID, Rewards, Costs, Available_Actions, AI_Assign_Enabled |
| general-detail-unified-*.json (×3) | doc_ui_0012 §2~§11 / doc_spec_0174 §I | Default_Tab, Bloodline_StoryDock_State, Story_Strip_Cells, Bloodline_Ultimate, Special_Lineage_Factors, Birth_Burst, Equipped_Spirit_UID, Equipped_Tally_UID, Slot_Type, Display_Bucket, Card_Role |
| spirit-tally-detail-*.json (×2) | doc_spec_0012 §A, §F；doc_spec_0022 §E；doc_spec_0174 §H | Spirit_ID, Resonance_Band, Glow_State, TigerTallyScore, Linked_Troop_ID, grainCost |
| spirit-collection-room-main.json | doc_spec_0022 §I-5、doc_ui_0012 §9.4 | Spirit_Collection_Room, Spirit_Display_Row, Spirit_Archive_Snapshot, Display_Weight, Featured_Archive_Spirit_UIDs |
