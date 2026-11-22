# 名詞定義文件（分片索引） — 前言覆寫裁定與命名規則

> 這是 `名詞定義文件.md` 的「前言覆寫裁定與命名規則」分片。完整索引見 `docs/遊戲規格文件/系統規格書/名詞定義文件.md`。


> **2026-04-26 覆寫裁定：核心名詞**
>
> | 名詞 | Key | 最新定義 |
> |---|---|---|
> | 武將等級 | General_Level | 不存在於本作正式武將本體系統；不得用 Level / EXP 表示武將成長。 |
> | 武將名聲 | General_Fame | 單一武將畢業後累積的戰功與聲望，用於將階、帶兵上限與部分門檻。 |
> | 將階 | General_Rank | 武將個人位階，不等於玩家官職；提高帶兵上限與戰場稱號。 |
> | 帶兵上限 / 指揮容量 | Command_Capacity | 武將本場最多可帶出的兵力數字；玩家可理解為出征軍勢上限，不再定義為抽象負載。 |
> | 城市兵源 | City_Troops | 城市可撥給出征的可見軍事庫存，由人口、民心、軍備與政策推導，不等於總人口。 |
> | 出征軍勢 | Sortie_Troop_Pool | 本場戰鬥可分批投入的兵力池，等於 `min(武將帶兵上限, 城市可用兵源, 關卡出征上限)`。 |
> | 投入兵力 | Unit_Troop_Cost | 召喚 / 部署一支部隊時從出征軍勢扣除的兵力。 |
> | 目前兵力 | Current_Troops | 場上分隊目前生命；退場返還，歸零則成為戰損。 |
> | 補兵速度 | Recruit_Regen | 治理每回合補回城市兵源的速度。 |
> | 戰備值 | Military_Readiness | 舊稱或後台摘要欄位；正式玩家主顯示改用城市兵源、出征軍勢與戰後兵損。 |
> | 命槽 | Destiny_Slot | 英靈卡在人物頁 `命` 頁的單插槽。 |
> | 寶頁 | Equip_Tab / Gear_Tab | 一般裝備、傳家寶與道具主入口；不顯示英靈卡槽，不顯示虎符槽，不顯示武將 Level / EXP。 |
> | 兵頁 | Aptitude_Tab | 兵種、地形、天氣適性、戰鬥定位與虎符主入口。 |
> | 血脈傳承奧義 | Bloodline_Transmission_Ultimate | 命頁右半區的五階血脈能力樹；每階可為被動或主動，但都靠覺醒點亮。 |
> | 譜牒印記 | Lineage_Seal | 子孫武將升星材料；由同家族卡 duplicate 或家族傳承路徑轉化而來。 |
# 名詞定義文件（全系統匯總）

> 本文件匯總所有系統規格書的 J 區名詞定義，統一代碼命名規則。

---

## 命名規則

### 系統代碼對照表
| 系統 | 代碼前綴 | 說明 |
|---|---|---|
| 武將系統 | G_ / General_ | 武將相關 |
| 教官系統 | MENTOR_ | 教官卡相關 |
| 轉蛋系統 | GACHA_ | 轉蛋/召喚相關 |
| 結緣系統 | BREED_ | 配種/子嗣相關 |
| 血統系統 | BL_ / Bloodline_ | 血統矩陣相關 |
| 因子系統 | GENE_ | 六色因子相關 |
| 名士預言 | SAGE_ / Oracle_ | 占卜相關 |
| 傭兵系統 | MERC_ | 傭兵相關 |
| 培育系統 | NURTURE_ | 鏡像培育相關 |
| 遊戲時間 | TIME_ / Season_ | 季度/時間相關 |
| 壽命系統 | LIFE_ / Phase_ | 壽命/年齡相關 |
| 同名武將 | TMPL_ / Template_ | 版本/模板相關 |
| 俘虜系統 | POW_ | 俘虜處置相關 |
| 因子解鎖 | DISC_ / Discovery_ | 解鎖/覺醒相關 |
| 轉職宿命 | FATE_ / JOB_ | 轉職/宿命相關 |
| 領地治理 | GOV_ | 治理/內政相關 |
| 官職系統 | OFFICE_ / RANK_ | 官職階位、晉升與權限相關 |
| 大廳系統 | HALL_ / LOBBY_ | 大廳中樞 / 世界沙盤 / 任務牆相關 |
| 他國 AI | NATION_ / RIVAL_ / COALITION_ | 他國勢力、外交、反霸權聯盟相關 |
| 武將日誌與離線互動 | JOURNAL_ / REPORT_ / DISPATCH_ / OFFLINE_ | 武將日誌、晨報、派遣與離線互動相關 |
| 資源循環 | VIT_ / Vitality_ | 精力相關 |
| 運氣系統 | LUK_ | 運氣/天命相關 |
| 留存系統 | RET_ / Retention_ | 留存機制相關 |
| 經濟系統 | ECON_ / Item_ | 貨幣/道具相關 |

### 任務卡 ID 系統代碼（agent-briefs）
任務卡 ID 格式：`{系統代號}-{子系統}-{流水號4位}`，例如 `UI-1-0001`。

> **唯一來源**：本節是任務卡 ID / 卡號 / 系統代碼的唯一命名來源。其他文件若提到卡號格式、子系統編號或任務卡 ID，皆應引用本節，不另行定義。
>
> **範圍說明**：`docs/tasks/` 與 `docs/ui-quality-tasks/` 只負責 shard / manifest 分組，不重新定義任務卡本體 ID 格式。

| 系統代號 | 系統名稱 | 子系統 | 子系統說明 |
|---|---|---|---|
| `UI` | UI 視覺介面系統 | `UI-1` | 視覺資產子系統（Sprite / Texture 的產生與搬遷） |
| `UI` | UI 視覺介面系統 | `UI-2` | UI 接線/配置子系統（Skin / Layout JSON 更新與驗證） |
| `BAT` | 戰鬥系統 | `BAT-1` | 戰場邏輯（棋盤移動、戰鬥解算） |
| `BAT` | 戰鬥系統 | `BAT-2` | 戰場 UI / HUD |
| `GNL` | 武將系統 | `GNL-1` | 武將資料與列表 |
| `GNL` | 武將系統 | `GNL-2` | 武將人物介面 |
| `SHP` | 商城系統 | `SHP-1` | 商城 UI 與交易邏輯 |
| `GCH` | 轉蛋/抽卡系統 | `GCH-1` | 轉蛋 UI 與執行邏輯 |
| `SYS` | 基建/工程系統 | `SYS-1` | 工具、CI、腳本基礎建設 |
| `DC` | 資料中心系統 | `DC-0` | 共用基礎（稀有度系統、GeneralUnit 擴充） |
| `DC` | 資料中心系統 | `DC-1` | M1 資料管線基礎（ingest / merge / validate 工具鏈） |
| `DC` | 資料中心系統 | `DC-2` | M2 分層儲存架構（DataStorageAdapter / DataCatalog） |
| `DC` | 資料中心系統 | `DC-3` | M3 血統正規化（PersonRegistry / BloodlineGraph） |
| `DC` | 資料中心系統 | `DC-4` | M4 壓縮 + 序列化（MessagePack / SaveSerializer） |
| `DC` | 資料中心系統 | `DC-5` | M5 增量同步協議（DeltaPatchBuilder / SyncManager） |
| `DC` | 資料中心系統 | `DC-6` | M6 完整覆蓋 + 增長控管（200+ 武將、歸檔機制） |
| `ATM` | AI Atomic Framework | `ATM-0` | 3KLife 內 ATM 任務治理、自舉與文件解耦 |
| `ATM` | AI Atomic Framework | `ATM-1` | 上游開源 repo 骨架、產品契約與核心 schema |
| `ATM` | AI Atomic Framework | `ATM-2` | Core Manager、Registry、HashLock 與 Police MVP |
| `ATM` | AI Atomic Framework | `ATM-3` | 3KLife Project Adapter / Language Adapter 導入 |
| `ATM` | AI Atomic Framework | `ATM-4` | html-to-ucuf reference case study 與首批 atom |
| `ATM` | AI Atomic Framework | `ATM-5` | 開源文件、Plugin SDK、版本治理與 alpha release |
| `ATM` | AI Atomic Framework | `ATM-6` | 生態擴張、跨專案 registry、DB / vector / workflow 決策 |

> **說明**：若兩張任務卡互有依賴（例如資產搬遷後才能接線），任務卡需在「關聯卡號」欄列出對方，確保責任邊界清晰，Agent 可獨立執行並等待對方完成通知。

### 命名統一規則
1. **代碼格式**：全大寫英文 + 底線分隔，如 `BLUE_STR_05`
2. **UID 格式**：`G{3位數}` — 如 G001, G999
3. **Template_ID**：`{Name}_{Version}` — 如 `Zhao_Yun_V2`
4. **Bloodline_ID**：`BL_{Name}` — 如 `BL_ZhaoYun`
5. **Gene_ID**：`{COLOR}_{ATTR}_{Level}` — 如 `GREEN_DRAGON_04`
6. **Virtual_Ancestor**：`V_PID_{GeneralID}_{Position}` — 如 `V_PID_ZY01_FF`
7. **UI 字串 Key**：`UI_{SYSTEM}_{ACTION}` — 如 `UI_BREED_CONFIRM`
8. **祖紋命篆 ID**：`SIGIL_{CLAN}_{TYPE}_{NN}` — 如 `SIGIL_ZHAO_DRAGON_01`
9. **英靈虎符 ID**：`SPIRIT_TALLY_{GENERAL}_{NN}` — 如 `SPIRIT_TALLY_ZHAOYUN_01`
10. **Atomic ID**：`ATM-{BUCKET}-{NNNN}` — 如 `ATM-CORE-0001`、`ATM-EXAMPLE-0001`；`atom.core-seed` 這類 dot-notation 只能作 `logicalName / semanticName`，不得再當主 ID

> **現行資料差異（2026-10-14，PM 暫定）**：runtime 武將資料的 `templateId` 為 `GEN_{陣營}_{姓}_{名}`（例 `GEN_WEI_CAO_CAO`），與第 3 條 `{Name}_V{n}` 不符（235/235）；因子 id 為 `gene_strategy` 小寫格式，與第 5 條 `{COLOR}_{ATTR}_{NN}` 不符（20 筆）。`bloodlineId` 符合第 4 條。PM 暫定：維持現有資料 id（改動會影響存檔與引用），命名統一以本文件為目標，差異待使用者確認後再定案。驗證工具：`tools_node/validate-id-contract.js`（報告模式）。

---
