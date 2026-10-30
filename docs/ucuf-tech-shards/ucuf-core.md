# UCUF 技術文件 — 現況與核心（實作現況 · 目錄 · §1–§6）

> 這是 `UCUF技術文件.md` 的「現況與核心（實作現況 · 目錄 · §1–§6）」分片。完整索引見 `docs/UCUF技術文件.md`。

# UCUF 技術文件 — Universal Composite UI Framework 架構與原理

> 版本：v1.0（源自 UCUF 規劃書 v1.3）| 日期：2026-04-12
>
> **本文件定位**：說明 UCUF 的框架原理、架構設計、核心元件及子系統。
> 讀完後應理解「UCUF 是什麼、怎麼運作」。
>
> **相關文件**：
> - [UCUF規範文件.md](UCUF規範文件.md) (doc_ui_0026) — 協作規則、禁止事項與標準流程
> - [UCUF里程碑文件.md](UCUF里程碑文件.md) (doc_ui_0025) — 可執行計畫與驗收規則
> - [universal-composite-ui-framework-plan.md](universal-composite-ui-framework-plan.md) (doc_ui_0052) — 原始規劃書（已拆分）

---

## 實作現況（2026-10-31 對照程式，PROG-2-1632）

> 下表以程式碼實際存在與否為準；標 🔷 的章節是規劃，讀者不要當成現況。

| 章節 | 狀態 | 說明 |
|---|---|---|
| §1–§12、§15、§18、§19 | ✅ 已實作 | CompositePanel／ChildPanel／skinLayers／UCUFLogger／RuntimeRuleChecker／UCUFRuleRegistry 等皆在 `assets/scripts/ui/core/` |
| §13.3 資源載入追蹤器 | 🔷 規劃中 | 程式無 `loadAssetTracked` |
| §13.5 低記憶體壓力釋放 | 🔷 規劃中 | `MemoryManager` 有門檻欄位，但沒有接上釋放回呼 |
| §14.4 綁定衝突偵測 | 🔷 規劃中 | 程式無 `_detectBindingConflicts` |
| §16.5 Runtime 效能監控 | 🟡 部分 | 只有 `UCUFLogger.perfBegin/perfEnd` 計時，沒有 50ms 預算警告 |
| §17 長期演進建議 | 🔷 建議 | 僅 §17.1 `onAssetEvicted` 已接線（ServiceLoader） |

**對齊機制現況**（PROG-2-1628／1629／1636）：Widget 一律 `ON_WINDOW_RESIZE`，建構後跑一次後處理（對齊 → Layout → 容器邊界 → 版面後對齊 → 再對齊）；`safeAreaConstrained` 畫面先建 `__safeArea`（設計尺寸）再在裡面建畫面，不再事後搬移或改 ONCE／ALWAYS。

---

## 目錄

1. [概述與動機](#1-概述與動機)
2. [核心架構設計](#2-核心架構設計)
3. [Composite Panel 容器](#3-composite-panel-容器)
4. [Child Panel 體系](#4-child-panel-體系)
5. [Skin Layer Stack — 消除物理性節點疊加](#5-skin-layer-stack--消除物理性節點疊加)
6. [UIManager 整合](#6-uimanager-整合)
7. [跨引擎遷移性設計](#7-跨引擎遷移性設計)
8. [Layout JSON Spec v2](#8-layout-json-spec-v2)
9. [美術資源總註冊表](#9-美術資源總註冊表)
10. [全域除錯日誌系統](#10-全域除錯日誌系統)
11. [架構自我診斷與校驗](#11-架構自我診斷與校驗)
12. [自動化測試框架](#12-自動化測試框架)
13. [記憶體管理與資源卸載](#13-記憶體管理與資源卸載)
14. [資料綁定系統](#14-資料綁定系統)
15. [多國語系統籌管理](#15-多國語系統籌管理)
16. [效能深度優化](#16-效能深度優化)
17. [架構治理與長期演進建議](#17-架構治理與長期演進建議)
18. [GeneralDetailOverview 遷移技術方案](#18-generaldetailoverview-遷移技術方案)
19. [動態規則注入引擎](#19-動態規則注入引擎)

---

## 1. 概述與動機

### 1.1 節點過度堆疊

目前的 Layout JSON 使用「多個同位置兄弟節點」模擬多層視覺效果：

```
FooterPanelFill   ← widget: { left:24, right:24, bottom:24 }, skinSlot: detail.footer.fill
FooterPanelBleed  ← widget: { left:24, right:24, bottom:24 }, skinSlot: detail.footer.bleed
FooterPanelFrame  ← widget: { left:24, right:24, bottom:24 }, skinSlot: detail.footer.frame
FooterPanel       ← widget: { left:24, right:24, bottom:24 }, 實際按鈕容器
```

一個邏輯面板佔了 4 個節點。BloodlineCrestCarrier 更是 8 層疊加。

### 1.2 雙 Layout 共存

`GeneralDetailPanel` 同時 `buildScreen` 兩套完整 Layout（Classic + V3 Overview），
切 Tab 時用 `active` 開關切換，但隱藏清單不完整，導致殘留節點互相干擾。

### 1.3 所有 Tab 預建

6 個 Tab 頁面全部在 `buildScreen` 時一次性創建，使用完全相同的 widget 定位疊在同一位置。

### 1.4 缺少標準化的 Child Panel 型態

目前所有面板都是 `panel` + `label` 的手動組合，沒有語義化的 Attribute / Grid / Chart 等高階元件。

---

## 2. 核心架構設計

### 2.1 架構圖

```
┌─────────────────────────────────────────────────────────┐
│                     UIManager (既有)                      │
│    register / open / close / setupLayers                 │
│    LayerType: Game | UI | PopUp | Dialog | System        │
├─────────────────────────────────────────────────────────┤
│                 CompositePanel (新增)                      │
│    接收 Screen JSON → 解析 Layout → 管理 ChildPanel 生命週期│
│    skinLayerStack / fragment lazy-load / tab routing      │
├─────────────────────────────────────────────────────────┤
│              ChildPanelBase (新增抽象基類)                  │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐ │
│  │Attribute │  Grid    │ScrollList│  Radar   │ Editable │ │
│  │ Panel    │  Panel   │ Panel   │HexChart  │TextPanel │ │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘ │
├─────────────────────────────────────────────────────────┤
│          Platform Abstraction Layer (既有+擴充)            │
│    INodeFactory / IStyleApplicator / ILayoutResolver      │
│    + ICompositeRenderer (新增)                            │
├─────────────────────────────────────────────────────────┤
│   Cocos Impl          │        Unity Impl (stub)         │
│   CocosNodeFactory    │        UnityNodeFactory           │
│   CocosCompositeRdr   │        UnityCompositeRdr          │
└─────────────────────────────────────────────────────────┘
```

### 2.2 設計原則

| 原則 | 說明 |
|------|------|
| **1 邏輯面板 = 1 Layout 節點** | 禁止用多個同位置兄弟節點模擬視覺層級 |
| **1 Screen = 1 Layout** | 禁止一個 Panel 同時持有兩套完整 Layout |
| **Tab 延遲載入** | 只有當前激活的 Tab 才建立節點樹 |
| **外觀與邏輯分離** | Skin Layer Stack 處理所有視覺層，業務邏輯零 Cocos API |
| **組件標準化** | 常見 UI 模式以 ChildPanel 子類封裝，JSON 中只需一行宣告 |
| **引擎可替換** | 核心邏輯依賴 Interface，平台實作隔離於 `platform/` 目錄 |

> 上述原則以強制規則形式收錄在 [UCUF規範文件.md §1](UCUF規範文件.md#1-硬性架構規則) (doc_ui_0026)。

---

## 3. Composite Panel 容器

### 3.1 定義

`CompositePanel` 是 UCUF 的頂層容器元件，取代現有的 `UIPreviewBuilder` 子類
（如 `GeneralDetailPanel`、`GeneralDetailOverviewShell`）成為畫面的唯一持有者。

```typescript
// 虛擬碼 — 不依賴 Cocos API
abstract class CompositePanel {
    // ── 核心職責 ──
    protected screenSpec: UIScreenSpec;
    protected activeLayout: UILayoutSpec;
    protected skinManifest: UISkinManifest;
    protected childPanels: Map<string, ChildPanelBase>;   // slot-id → 子面板

    // ── 生命週期 ──
    async mount(screenId: string): Promise<void>;         // 載入 Screen → Layout → Skin
    async switchSlot(slotId: string, fragmentId: string);  // Tab 延遲載入
    unmount(): void;                                       // 銷毀所有子面板

    // ── 資料驅動 ──
    applyContentState(state: Record<string, unknown>): void; // 資料綁定
}
```

### 3.2 與既有 UIPreviewBuilder 的關係

`CompositePanel` **繼承** `UIPreviewBuilder` 而非取代它。
`buildScreen()` 仍然是底層構建引擎，但 `CompositePanel` 在其上方加入：

1. **Skin Layer Stack 解析**（§5）— 在 `_buildNode` 層級攔截 `skinLayers` 屬性
2. **Fragment 延遲載入**（§3.3）— 不在 `buildScreen` 時遞迴所有 children
3. **ChildPanel 自動掛載**（§4）— 依 `childType` 自動實例化對應 ChildPanel 子類

### 3.3 Fragment 延遲載入機制

**現狀**：`buildScreen()` → `_buildNode()` 遞迴展開所有 `children`，包含 `$ref` fragment。

**改進**：新增 `lazySlot` 屬性，標記需要延遲載入的區域。

```json
{
  "type": "container",
  "name": "TabContentSlot",
  "widget": { "top": 28, "bottom": 112, "left": 28, "right": 28 },
  "lazySlot": true,
  "defaultFragment": "fragments/layouts/tab-basics"
}
```

`buildScreen()` 遇到 `lazySlot: true` 時：
- 建立空容器節點（帶正確的 UITransform + Widget）
- **不展開** children / `$ref`
- 記錄到 `CompositePanel._lazySlots` Map 中

`switchSlot(slotId, fragmentId)` 被呼叫時才載入並建構節點。

### 3.4 Tab 路由表

取代現有的 `_activateTab()` 硬編碼切換邏輯：

```json
{
  "tabRouting": {
    "Basics":    { "slotId": "TabContentSlot", "fragment": "fragments/layouts/gdv3-overview" },
    "Stats":     { "slotId": "TabContentSlot", "fragment": "fragments/layouts/tab-stats" },
    "Bloodline": { "slotId": "TabContentSlot", "fragment": "fragments/layouts/tab-bloodline" },
    "Skills":    { "slotId": "TabContentSlot", "fragment": "fragments/layouts/tab-skills" },
    "Aptitude":  { "slotId": "TabContentSlot", "fragment": "fragments/layouts/tab-aptitude" },
    "Extended":  { "slotId": "TabContentSlot", "fragment": "fragments/layouts/tab-extended" }
  }
}
```

切 Tab 時：
1. `destroySlotChildren(slotId)` — 銷毀當前 Tab 的子節點
2. `switchSlot(slotId, newFragmentId)` — 載入新 Fragment 並 `buildNode`
3. `applyContentState(currentData)` — 重新綁定資料

---

## 4. Child Panel 體系

### 4.1 ChildPanelBase 抽象基類

```typescript
abstract class ChildPanelBase {
    // ── 由 CompositePanel 注入 ──
    protected hostNode: NodeHandle;        // 平台無關的節點句柄
    protected skinResolver: UISkinResolver;
    protected binder: UITemplateBinder;

    // ── 生命週期鉤子 ──
    abstract onMount(spec: ChildPanelSpec): Promise<void>;    // 首次建構
    abstract onDataUpdate(data: Record<string, unknown>): void; // 資料更新
    onUnmount(): void { /* 預設: no-op, 子類可覆寫做清理 */ }

    // ── 擴充屬性 ──
    protected customProps: Record<string, unknown> = {};
    setCustomProp(key: string, value: unknown): void {
        this.customProps[key] = value;
        this.onCustomPropChanged(key, value);
    }
    protected onCustomPropChanged(_key: string, _value: unknown): void { /* 子類覆寫 */ }
}
```

### 4.2 Attribute Panel（屬性條目陳列）

用途：武將基本資訊、六維數值等 key-value 列表。

```json
{
  "type": "child-panel",
  "childType": "attribute",
  "name": "BasicInfoPanel",
  "widget": { "top": 28, "bottom": 0, "left": 28, "right": 28 },
  "config": {
    "columns": 1,
    "rowHeight": 32,
    "rowSpacing": 8,
    "labelStyleSlot": "detail.label.meta",
    "valueStyleSlot": "detail.label.value",
    "rowSkinSlot": "detail.field.bg"
  },
  "dataSource": "basicAttributes"
}
```

runtime 資料格式：
```typescript
interface AttributeRow {
    label: string;    // "武力"
    value: string;    // "97"
    icon?: string;    // 可選圖示 skinSlot
    accent?: string;  // 可選強調色 token
}
// dataSource → AttributeRow[]
```

**關鍵改進**：原本的 `TabBasics` 需要在 Layout JSON 中手動定義 12 個 Label 節點。
現在只需一個 `child-panel` 節點 + runtime 資料陣列，節點數從 12 降為 1。

### 4.3 Grid Panel（網格佈局）

用途：技能圖標矩陣、裝備格、道具背包。

```json
{
  "type": "child-panel",
  "childType": "grid",
  "name": "SkillGrid",
  "config": {
    "columns": 4,
    "cellSize": [96, 96],
    "cellSpacing": [12, 12],
    "cellSkinSlot": "detail.section.bg",
    "cellTemplate": "fragments/widgets/skill-cell"
  },
  "dataSource": "skillList"
}
```

`GridPanel` 動態根據 `dataSource` 陣列長度建立格子，每格使用 `cellTemplate` fragment 渲染。

### 4.4 Scroll List Panel（虛擬列表）

用途：戰鬥紀錄、武將列表等大量資料捲動。

```json
{
  "type": "child-panel",
  "childType": "scroll-list",
  "name": "BattleLogList",
  "config": {
    "direction": "vertical",
    "itemHeight": 64,
    "bufferCount": 3,
    "itemTemplate": "fragments/widgets/battle-log-item",
    "emptyHint": "ui.battlelog.empty"
  },
  "dataSource": "battleLogs"
}
```

**虛擬列表核心**：只建構可視區域 + buffer 數量的節點（如可視 8 個 + buffer 3 個 = 11 個），
捲動時回收離開視窗的節點並重新綁定資料，而非建構全部 100+ 項。

### 4.5 Radar / Hex Chart Panel（六角數值圖表）

用途：武將六維能力圖（武/智/統/政/魅/運）。

```json
{
  "type": "child-panel",
  "childType": "radar-chart",
  "name": "StatsRadar",
  "config": {
    "axes": ["str", "int", "lea", "pol", "cha", "luk"],
    "axisLabelStyleSlot": "gdv3.label.dossierSection",
    "maxValue": 100,
    "fillColor": "accentGold",
    "fillAlpha": 0.3,
    "strokeColor": "accentGold",
    "strokeWidth": 2,
    "gridLevels": 4,
    "gridColor": "textMuted",
    "gridAlpha": 0.15
  },
  "dataSource": "coreStats"
}
```

**實作方式**：使用 Cocos `Graphics` 元件（Unity 對照：`LineRenderer` / Custom Mesh UI）
動態繪製正六邊形網格與填充區域。不需要預製多個 Image 節點。

### 4.6 Editable Text Panel（可編輯內文框）

用途：武將備註欄、自訂名稱。

```json
{
  "type": "child-panel",
  "childType": "editable-text",
  "name": "GeneralNotes",
  "config": {
    "maxLength": 200,
    "multiline": true,
    "placeholder": "ui.general.notes.placeholder",
    "inputStyleSlot": "detail.label.value",
    "backgroundSkinSlot": "detail.field.bg",
    "saveTarget": "generalConfig.notes"
  },
  "dataSource": "notesText"
}
```

**回寫邏輯**：`EditableTextPanel` 監聽 `EditBox.textChanged` 事件，
透過 `CompositePanel.emitDataChange(saveTarget, newValue)` 回傳到業務層。
業務層決定是否寫入 `GeneralConfig` 並觸發儲存。

### 4.7 ChildPanel 登記表

類似 `UIConfig` 的資料驅動設計，ChildPanel 型態集中登記：

```typescript
const ChildPanelRegistry: Record<string, typeof ChildPanelBase> = {
    'attribute':     AttributePanel,
    'grid':          GridPanel,
    'scroll-list':   ScrollListPanel,
    'radar-chart':   RadarChartPanel,
    'editable-text': EditableTextPanel,
    // 未來擴充：
    // 'progress-bar':  ProgressBarPanel,
    // 'timeline':      TimelinePanel,
    // 'tree':          TreeViewPanel,
};
```

---

## 5. Skin Layer Stack — 消除物理性節點疊加

### 5.1 問題回顧

目前一個「帶框體的面板」在 Layout JSON 中佔 3~4 個節點：

```
FooterPanelFill   → skinSlot: detail.footer.fill   (底色)
FooterPanelBleed  → skinSlot: detail.footer.bleed  (出血擴散)
FooterPanelFrame  → skinSlot: detail.footer.frame  (邊框)
FooterPanel       → 實際按鈕容器 (內容)
```

### 5.2 解決方案：`skinLayers` 屬性

在 Layout JSON 的 `panel` / `container` 節點新增 `skinLayers` 陣列：

```json
{
  "type": "panel",
  "name": "FooterPanel",
  "widget": { "left": 24, "right": 24, "bottom": 24 },
  "height": 72,
  "skinLayers": [
    { "slot": "detail.footer.fill",  "zOrder": 0 },
    { "slot": "detail.footer.bleed", "zOrder": 1, "expand": 4 },
    { "slot": "detail.footer.frame", "zOrder": 2, "expand": 2 }
  ],
  "layout": { "type": "horizontal", "spacing": 10 },
  "children": [
    { "type": "button", "name": "BtnFavorite" },
    { "type": "button", "name": "BtnLock" }
  ]
}
```

### 5.3 skinLayers 建構流程

`UIPreviewBuilder._buildNode()` 偵測到 `skinLayers` 時：

```
1. 建立主節點（FooterPanel）— UITransform + Widget
2. 對 skinLayers 陣列中的每一項：
   a. 建立子節點 `__skin_layer_{zOrder}`（例：__skin_layer_0）
   b. 設定 Widget: top=0, bottom=0, left=0, right=0（撐滿父節點）
   c. 若有 expand，則 Widget 的 top/bottom/left/right 設為 -expand（向外擴）
   d. 套用 skinSlot 的 Sprite / SolidBackground
   e. 設定 siblingIndex = zOrder
3. 建立內容子節點（children），siblingIndex 在所有 skin layer 之上
```

**結果**：Layout JSON 中 1 個節點 = runtime 的 1 個邏輯面板。
多層視覺是「節點內部的渲染層」，不再佔據外部節點樹的位置。

### 5.4 Composite Image（多圖組合體）

針對 BloodlineCrest 的 8 層疊加場景，新增 `composite-image` 類型：

```json
{
  "type": "composite-image",
  "name": "BloodlineCrest",
  "widget": { "hCenter": true, "vCenter": 4 },
  "width": 176,
  "height": 176,
  "layers": [
    { "slot": "gdv3.bloodline.seal.inset",  "size": [164, 164], "zOrder": 0 },
    { "slot": "gdv3.bloodline.seal.frame",  "size": [174, 174], "zOrder": 1 },
    { "slot": "gdv3.bloodline.crest.glow",  "size": [172, 172], "zOrder": 2 },
    { "slot": "gdv3.bloodline.crest.fill",  "size": [150, 150], "zOrder": 3 },
    { "slot": "gdv3.bloodline.crest.inner", "size": [160, 160], "zOrder": 4 },
    { "slot": "gdv3.bloodline.crest",       "size": [134, 134], "zOrder": 5 },
    { "slot": "gdv3.bloodline.crest.frame", "size": [176, 176], "zOrder": 6 },
    { "slot": "gdv3.bloodline.crest.face",  "size": [122, 122], "zOrder": 7 }
  ]
}
```

`buildCompositeImage()` 在單一父節點內建立 8 個子圖層節點，
全部以 `hCenter` + `vCenter` 置中。Layout JSON 只需 1 個宣告。

### 5.5 skinLayers 與 shadow / noise 的統一

現有的 `UIPreviewShadowManager` 已經在做「附加 shadow/noise 子節點」的事。
新設計中：
- `shadow` → `skinLayers` 中一個 `zOrder: -1` 的項目
- `noise` → `skinLayers` 中一個 `zOrder: 999, blendMode: "overlay"` 的項目

統一管道，不再需要獨立的 ShadowManager。

---

## 6. UIManager 整合

### 6.1 現有 UIManager 評估

目前的 `UIManager` 已具備完整的分層管理：

| 層級 | 行為 | 狀態 |
|------|------|------|
| Game | 自由 show/hide | ✅ 已實作 |
| UI | 替換式（同時一個） | ✅ 已實作 |
| PopUp | 堆疊式 | ✅ 已實作 |
| Dialog | 佇列式 | ✅ 已實作 |
| System | 最高優先 | ✅ 已實作 |
| Notify | Toast / Loading | ✅ 已實作 |

**結論**：UIManager 的分層邏輯不需要重寫。需要增強的是**與 CompositePanel 的整合**。

### 6.2 CompositePanel 自動註冊

```typescript
// CompositePanel.mount() 內部
async mount(screenId: string): Promise<void> {
    const { screen, layout, skin } = await this._specLoader.loadFullScreen(screenId);
    this.screenSpec = screen;

    // 自動向 UIManager 註冊
    const uiId = screen.uiId as UIID;
    services().ui.register(uiId, this.asUILayer());
}
```

### 6.3 Z-Order 管理規則

CompositePanel 內部的 ChildPanel 依固定規則排序：

```
z-order 0~99     : Background layers (skinLayers)
z-order 100~899  : Content (ChildPanels, 依 Layout JSON 順序)
z-order 900~999  : Overlay layers (TabBar, CloseButton, toast)
```

ChildPanel 的 siblingIndex 由 `CompositePanel` 統一管理，ChildPanel 本身不允許
自行修改 siblingIndex。

### 6.4 統一 API

```typescript
interface ICompositePanel {
    // ── 畫面管理 ──
    mount(screenId: string): Promise<void>;
    unmount(): void;

    // ── Tab / Slot ──
    switchSlot(slotId: string, fragmentId: string): Promise<void>;
    getActiveSlotFragment(slotId: string): string | null;

    // ── 資料流 ──
    applyContentState(state: Record<string, unknown>): void;
    onDataChange: Signal<{ target: string; value: unknown }>;

    // ── ChildPanel ──
    getChildPanel<T extends ChildPanelBase>(slotId: string): T | null;
    getAllChildPanels(): Map<string, ChildPanelBase>;
}
```

---
