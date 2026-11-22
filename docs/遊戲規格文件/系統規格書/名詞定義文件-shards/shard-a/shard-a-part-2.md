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
