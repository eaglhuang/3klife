<!-- doc_id: doc_spec_0654 -->
# 全域UI字串Key命名規則UI_SYSTEM_ACTION與i18n字典架構規格書

> **所屬模組**：`3.6 數值、架構與底層支援 (TERM-08)`  
> **單一真相來源**：解開 2026-10-27 歷史 blocked 封鎖，正式確立全域 UI 字串 Key 命名規範（`UI_{SYSTEM}_{ACTION}`）、多語系字典目錄組織架構與動態插槽回退協議。

---

## 1. 全域 UI 命名語法規範

所有呈現在 UI 介面之靜態文案、按鈕標籤、彈窗標題與系統提示，一律嚴禁在代碼或 JSON 中硬編碼顯示文字，必須遵循以下四段式 Key 命名規範：

$$\mathbf{UI\_\{SYSTEM\}\_\{SUBSYSTEM\}\_\{ACTION\_OR\_LABEL\}}$$

- **前綴**：一律以 `UI_` 開頭（大寫蛇形命名 SNAKE_CASE）。
- **第一級系統 (`SYSTEM`)**：
  - `BATTLE`：戰場推進、戰術卡打出、單挑、戰後結算。
  - `LOBBY`：大廳場景、任務看板、世界沙盤、祈願祭壇。
  - `BLOODLINE`：世家總覽、十四人血統樹、結緣生子、命鏡覺醒。
  - `GENERAL`：武將六頁詳情（將/屬/命/技/寶/兵）、日誌、戰績。
  - `GACHA`：轉蛋抽卡、天命商店、開牌演出、重複卡分流。
  - `COMMON`：全域通用操作（確認、取消、關閉、返回、載入中、錯誤）。

### 1.1 典型命名對照範例
| 使用場景 | 標準 Key 定義 | 繁體中文標準文案 |
|:---|:---|:---|
| 出征編制確認 | `UI_BATTLE_SORTIE_CONFIRM` | 拔營出征 |
| 大廳任務接取 | `UI_LOBBY_MISSION_ACCEPT` | 接取軍令 |
| 血統樹展開 | `UI_BLOODLINE_TREE_EXPAND` | 展開十四人祖譜 |
| 命鏡突破按鈕 | `UI_GENERAL_MIRROR_BREAKTHROUGH` | 突破覺醒 |
| 傭兵二轉晉升 | `UI_GENERAL_MERCENARY_TIER2` | 金蘭二轉 |
| 通用返回 | `UI_COMMON_BTN_BACK` | 返回 |

---

## 2. i18n 字典架構與回退機制 (Fallback Chain)

### 2.1 字典目錄結構
多語系字典統一收攏於 Cocos 資源目錄，以語系代碼分檔管理：
```
assets/resources/i18n/
├── zh-TW.json    (繁體中文，專案最高基準正本)
├── zh-CN.json    (簡體中文)
├── en.json       (英文)
└── ja.json       (日文)
```

### 2.2 查詢與回退演算法
當前端 UI 調用 `Localization.getText(key, params)` 時，依循嚴格的回退鏈路：
$$\text{Target Lang} \longrightarrow \text{zh-TW (Default Base)} \longrightarrow \text{Raw Key String}$$
1. 若目標語系查無此 Key，自動降級讀取 `zh-TW.json` 基準正本。
2. 若 `zh-TW.json` 亦無此 Key，則在 Console 印出 `[i18n WARNING] Missing key: {key}`，並直接回傳原始 Key 字串，確保介面不崩潰。

---

## 3. 動態插槽與參數替換語法

字典文案中若包含動態數值或武將名稱，一律採用花括號命名插槽 `{paramName}`：
- **字典條目範例**：
  ```json
  "UI_LOBBY_MISSION_GRAIN_COST": "此任務需消耗城市糧草 {amount} 馱",
  "UI_GENERAL_AGE_DESC": "{generalName} 現年 {age} 歲，精力充沛。"
  ```
- **代碼調用規範**：
  ```typescript
  Localization.getText("UI_LOBBY_MISSION_GRAIN_COST", { amount: 1500 });
  ```
- 嚴禁使用 `%s`、`%d` 等非語意化格式字串，避免多語系語序翻轉時產生語病。

---

## 4. 驗證閘門與代碼審計守則

1. **靜態掃描約束**：
   - `validate-ui-specs.js` 增設 R-I18N 規則：所有 `ui-spec/layouts/*.json` 中之 text 屬性，若包含中文字元且非以 `UI_` 開頭者，編譯閘門亮紅燈阻斷。
2. **字典同步檢查**：
   - CI 閘門自動比對 `zh-TW.json` 與其他語言字典之 Key 集合，回報未翻譯缺漏率。
