# 共用框架總綱規格書（分片索引） — 14 UI 主題系統與語系（PROG-2-9832）

> 這是 `共用框架總綱規格書.md` 的「14 UI 主題系統與語系」分片。完整索引見 `docs/遊戲規格文件/系統規格書/共用框架總綱規格書.md`。

## 14. UI 主題系統與語系

### 14.1 目標與硬性要求
- UI 風格要能**整套動態替換**：春夏秋冬、節日慶典活動各有一套，執行中可切換，**不可寫死在 skin 或程式**。
- UI 文字**不寫死字串**，走既有 i18n（zh-TW／zh-CN／en／ja 四語系）。
- 手機記憶體優先：切換主題時釋放新主題用不到的舊素材。

### 14.2 重用的既有系統（不做第二套）
| 需求 | 既有系統 | 本章新增 |
|---|---|---|
| skin 外觀 | `UISpecLoader.loadSkin`（layouts → skins → screens 三層、`themeStack` 疊層） | `loadSkin` 結尾多一步「套主題樣式」，回傳副本，不污染 JSON 快取 |
| 全域色票 | `ui-spec/ui-design-tokens.json` | 不動；主題是它之上的「語意 token」層 |
| 季節／節慶背景圖與氛圍 | `data/hall-map/hall-theme.json` + `HallTheme.ts`（大廳場景層） | 不動；本章管的是 UI 面板／按鈕／文字的**樣式層**，兩者互補 |
| 字串與語系切換 | `I18nSystem`（`t(key)`、`onLocaleChanged`、字型懶載入）、字典 `resources/i18n/{locale}.json` | 只新增 key |
| layout 文字 | layout label 的 `textKey`（`UILabelText.resolveLabelText`：查得到翻譯用翻譯，否則退回原文） | 大廳主畫面靜態按鈕補 `textKey` |
| 資源釋放 | `ResourceManager.releaseAsset` | 由 `ThemeService` 於切換時呼叫 |

### 14.3 資料格式（`assets/resources/ui-spec/themes/theme-registry.json`）
```
defaultTheme  : "default"
layerOrder    : ["season", "festival", "event"]      // 疊加順序，前者在下
styleBinding  : { appliesToSkins: [...], fillRoles: {...} }   // 哪些 skin 套主題、skin 填色對應哪個風格角色
themes        : { <id>: { nameKey, extends?, tokens{}, assets{} } }
rules         : [ { id, layer, theme, priority?, when{ seasonIndex?, festivalIds?, flags?, dateRange? } } ]
```
- **語意層 token**（`tokens`，扁平 key）：`panel.bg／alpha／border／cornerRadius／borderWidth`、`button.secondary.*`、`button.primary.*`、`divider.color／alpha`、`text.font`、`text.title.minSize`、`text.title／section／body／button`、`text.section.letterSpacing`。
- **素材層**（`assets`）：`{ "<語意名>": { "path": "resources 路徑或 bundle 內路徑", "bundle": "可選資源包" } }`。
- **繼承**：`default` 提供全部 token；其他主題只寫差異，未寫 `extends` 即繼承 default；循環繼承與未知主題會被略過。缺 token 一律回退 default。
- **規則**：條件全部成立才命中；同層取 `priority` 最大者；`dateRange` 用 `MM-DD`、含頭尾、可跨年；沒有任何條件的規則不命中。節慶日期（如農曆）不固定，正式活動請由活動系統以 `festivalIds`／`flags` 傳入，`dateRange` 只當保底。

### 14.4 執行期（`ThemeService`，純 TS）
- `setRegistry(registry)`：載入並啟用 default。
- `resolveActiveTheme({ seasonIndex, date, festivalIds, flags })` → 疊加主題 id 陣列（不含 default）。
- `setTheme(stack)`：執行中切換；內容沒變回傳 `null` 不發事件；變了就重建 skin 樣式、釋放新主題用不到的舊素材、發 `ThemeChangeEvent { previousStack, stack, releasedAssets }`。
- `refresh(ctx)`：解析＋切換一次完成（換日、季節更替、活動開關時呼叫）。
- `token(key, fallback?)`、`asset(key)`、`skinStyle()`、`appliesToSkin(skinId)`。
- `onThemeChanged(handler)` → 取消訂閱函式；畫面 `onEnable` 訂閱、`onDestroy` 取消。`UISpecLoader` 自己也訂閱，收到事件就清掉 skin 快取，畫面收到事件後重新 `loadSkin` 即套用新主題。
- 取得服務：`UISpecLoader.getThemeService()`。

### 14.5 skin 套用規則（`ThemeSkinRestyle.ts`）
只改樣式欄位（顏色、描邊、字型、透明度），節點 id、尺寸、貼圖、文字、功能都不動；依 slot 的 `kind` 與欄位分類，不靠節點名稱。default 主題的數值與 `domestic-screen.skin.json` 一致（測試比對），因此幕府大廳與大廳・內政同風格。要讓其他 skin 套主題：把 skin id 加進 `styleBinding.appliesToSkins`。

### 14.6 語系
- 所有 UI 文字用 `textKey` 或 `t(key)`；新 key 同時補 `zh-TW／zh-CN／en／ja` 四份字典（測試檢查四語系齊全）。
- 主題顯示名稱用 `nameKey`（`ui.theme.name.<id>`）。
- 大廳主畫面靜態按鈕／標題用 `ui.hall.*` key；動態內容（任務、數字）由 binder 以字典組字。

### 14.7 新增一個節慶主題的步驟
1. 在 `theme-registry.json` 的 `themes` 新增 `{ "<id>": { "nameKey": "ui.theme.name.<id>", "tokens": { 只寫要改的 }, "assets": { 可選 } } }`。
2. 在 `rules` 新增規則：`layer: "festival"`（或 `event`）、`theme: "<id>"`、`when: { festivalIds: ["<節慶 id>"] }`，必要時加 `dateRange` 保底與 `priority`。
3. 四份 i18n 字典補 `ui.theme.name.<id>`。
4. 素材放進指定路徑／資源包，`assets` 填路徑；不需要改任何程式。
5. 跑 `tests/ThemeSystem.test.ts`（繼承、規則、四語系檢查會一併驗）。

### 14.8 未做／後續
- 任務板、太守府、招賢館已於 PROG-2-9846 加入 `appliesToSkins`；大廳子面板（wall／altar／clan）加進清單即可，需逐畫面截圖驗收。
- 分節標題與細金線：skin 內用 `*.label.section`、`*.divider.section` 兩個 slot，由 `styleBinding.slotRoles` 以後綴對應到 `labelSection`／`divider` 角色（字距取 `text.section.letterSpacing`）；`skipSlots` 可排除共用 slot（例如 `pg.*`）。
- 把 `refresh(ctx)` 接到遊戲時鐘／活動系統（季節更替、活動開關）；已開畫面的重套需各畫面訂閱 `onThemeChanged`。
- 素材層目前只定義格式與釋放，實際節慶素材待美術交付。
