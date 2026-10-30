# UCUF 技術文件 — 遷移、規格、資源、日誌、診斷、測試（§7–§12）

> 這是 `UCUF技術文件.md` 的「遷移、規格、資源、日誌、診斷、測試（§7–§12）」分片。完整索引見 `docs/UCUF技術文件.md`。

## 7. 跨引擎遷移性設計

### 7.1 現有抽象層評估

專案已建立三個引擎無關介面：

| 介面 | 路徑 | 狀態 |
|------|------|------|
| `INodeFactory` | `ui/core/interfaces/INodeFactory.ts` | ✅ 已定義 + Cocos 實作 |
| `IStyleApplicator` | `ui/core/interfaces/IStyleApplicator.ts` | ✅ 已定義 |
| `ILayoutResolver` | `ui/core/interfaces/ILayoutResolver.ts` | ✅ 已定義 |
| Unity stub | `ui/platform/unity/UnityNodeFactory.ts` | ⚠️ 全部 throw |

### 7.2 需要新增的介面

#### ICompositeRenderer

```typescript
/**
 * 負責 CompositePanel 特有的渲染操作。
 * 標準 INodeFactory 不涵蓋的功能：skinLayers、composite-image、radar-chart。
 */
interface ICompositeRenderer {
    /** 在節點內部建立多層 skin 背景 */
    buildSkinLayers(parent: NodeHandle, layers: SkinLayerDef[]): Promise<void>;

    /** 建立多圖組合體（如命紋徽章） */
    buildCompositeImage(parent: NodeHandle, layers: CompositeImageLayerDef[]): Promise<void>;

    /** 建立 Graphics-based 的雷達圖 */
    buildRadarChart(parent: NodeHandle, config: RadarChartConfig): NodeHandle;

    /** 建立可編輯文字框 */
    buildEditBox(parent: NodeHandle, config: EditBoxConfig): NodeHandle;
}
```

#### IScrollVirtualizer

```typescript
/**
 * 虛擬列表的引擎無關介面。
 */
interface IScrollVirtualizer {
    /** 設定資料來源與項目模板 */
    initialize(config: VirtualScrollConfig): void;

    /** 更新資料（差異更新，非全量重建） */
    updateData(items: unknown[]): void;

    /** 滾動到指定索引 */
    scrollToIndex(index: number, animate?: boolean): void;

    /** 取得當前可視範圍內的項目索引 */
    getVisibleRange(): { start: number; end: number };
}
```

### 7.3 依賴隔離架構

```
┌─────────────────────────────────────────────────┐
│         Business Logic Layer (純 TS)             │
│   CompositePanel / ChildPanelBase / Mapper       │
│   ↓ 只依賴 interfaces                            │
├─────────────────────────────────────────────────┤
│         Interface Layer (純型別)                  │
│   INodeFactory / IStyleApplicator / ILayoutResolver│
│   ICompositeRenderer / IScrollVirtualizer         │
├─────────────────────────────────────────────────┤
│  platform/cocos/           │  platform/unity/     │
│  CocosNodeFactory          │  UnityNodeFactory     │
│  CocosCompositeRenderer    │  UnityCompositeRdr    │
│  CocosScrollVirtualizer    │  UnityScrollVirtualzr │
│  ↓ 可直接使用 cc API       │  ↓ 可直接使用 Unity API│
└─────────────────────────────────────────────────┘
```

**遷移至 Unity 時需要做的事**：
1. 實作 `UnityNodeFactory`（`RectTransform` + `Image` + `TMP_Text`）
2. 實作 `UnityCompositeRenderer`（多層 Image、`UILineRenderer`）
3. 實作 `UnityScrollVirtualizer`（`ScrollRect` + 物件池）
4. **不需要修改** `CompositePanel`、`ChildPanelBase`、所有 Mapper、所有 JSON Spec

### 7.4 禁止直接依賴清單

以下 import 只允許出現在 `platform/cocos/` 目錄中：

```typescript
// ❌ 禁止在 CompositePanel / ChildPanelBase 中出現
import { Node, Sprite, Label, UITransform, Widget, Layout, ScrollView } from 'cc';

// ✅ 替代方案
import type { NodeHandle } from '../core/interfaces/INodeFactory';
```

> 此規則以強制規則形式收錄在 [UCUF規範文件.md §1](UCUF規範文件.md#1-硬性架構規則) (doc_ui_0026)。

---

## 8. Layout JSON Spec v2

### 8.1 新增節點類型

| 類型 | 說明 | 對應 |
|------|------|------|
| `child-panel` | UCUF 的 ChildPanel 容器 | 新增 |
| `composite-image` | 多圖組合體 | 新增，取代手動 8 層疊加 |

### 8.2 新增屬性

| 屬性 | 適用類型 | 說明 |
|------|----------|------|
| `skinLayers` | panel, container | 多層 Skin 背景定義陣列 |
| `lazySlot` | container | 標記為延遲載入插槽 |
| `defaultFragment` | container (lazySlot) | 預設載入的 Fragment |
| `childType` | child-panel | ChildPanel 子類型 |
| `config` | child-panel | ChildPanel 建構配置 |
| `dataSource` | child-panel | 資料綁定來源 ID |
| `layers` | composite-image | 多圖層定義陣列 |

### 8.3 向後相容性

- 所有新增屬性為**可選**（optional）
- 不帶 `skinLayers` 的 `panel` 行為與現在完全相同
- 不帶 `lazySlot` 的 `container` 行為與現在完全相同
- 既有的 `panel` + `image` + `label` + `button` + `scroll-list` 全部保留

> 靜態 Lint 規則 R19~R22 的完整表格見 [UCUF規範文件.md §3](UCUF規範文件.md#3-lint-規則總表) (doc_ui_0026)。

---

## 9. 美術資源總註冊表

### 9.1 設計目標

建立一份機器可讀的「美術素材綁定清單」（Asset Registry），精準追蹤每個
`CompositePanel` 實際使用的資源路徑，支援：

1. **打包工具**：自動分析 bundle 依賴，剔除未使用素材
2. **CI 驗證**：偵測「已宣告但缺檔」或「存在但未被任何 panel 引用」的孤兒資源
3. **記憶體預算**：預估單一畫面的資源佔用量

### 9.2 註冊表結構

```typescript
interface AssetRegistryEntry {
    /** 資源路徑（相對 resources/） */
    path: string;
    /** 資源類型 */
    type: 'SpriteFrame' | 'Font' | 'JsonAsset' | 'Texture2D' | 'SpriteAtlas';
    /** 來源：靜態（Layout/Skin JSON 聲明）或動態（runtime dataSource 載入） */
    source: 'static' | 'dynamic';
    /** 引用此資源的 Screen ID 列表 */
    referencedBy: string[];
    /** 所屬 bundle（預設 'resources'） */
    bundle: string;
}
```

### 9.3 靜態資源收集

在 `CompositePanel.mount()` 完成後，自動掃描已解析的 Layout + Skin 產出靜態清單：

```typescript
// CompositePanel 內部
private _collectStaticAssets(): AssetRegistryEntry[] {
    const entries: AssetRegistryEntry[] = [];
    // 1. 掃描所有 skinSlot → 解析 UISkinResolver 的 spriteFrame 路徑
    for (const [slotId, slotDef] of this.skinManifest.entries()) {
        if (slotDef.spriteFrame) {
            entries.push({
                path: slotDef.spriteFrame,
                type: 'SpriteFrame',
                source: 'static',
                referencedBy: [this.screenSpec.id],
                bundle: slotDef.bundle ?? 'resources',
            });
        }
    }
    // 2. 掃描所有 fragment $ref → 註冊 JSON 路徑
    // 3. 掃描所有 i18n → 註冊語系 JSON 路徑
    return entries;
}
```

### 9.4 動態資源登記

`ChildPanelBase` 提供 `registerDynamicAsset()` 方法，由子類在 `onDataUpdate()` 載入
新資源時呼叫：

```typescript
// 例：GridPanel 的 cellTemplate 中動態載入武將頭像
protected async onDataUpdate(data: Record<string, unknown>): Promise<void> {
    const portraitPath = data['portraitPath'] as string;
    this.registerDynamicAsset(portraitPath, 'SpriteFrame');
    // ... 載入並顯示
}
```

### 9.5 CLI 工具整合

```bash
# 從所有 screen JSON 收集靜態資源清單
node tools_node/collect-asset-registry.js --output artifacts/asset-registry.json

# 與 resources/ 實際檔案交叉比對
node tools_node/audit-asset-usage.js --registry artifacts/asset-registry.json
# 輸出：
#   孤兒資源（存在但未引用）: 12 files, 2.3 MB
#   缺失資源（已引用但缺檔）: 0 files ✅
#   動態資源（需 runtime 才能確認）: 8 paths
```

---

## 10. 全域除錯日誌系統

### 10.1 現狀評估

目前 `UIPreviewDiagnostics` 提供集中化的日誌輸出，但存在以下不足：

- **無層級開關**：所有 `console.log` 在 production build 仍會輸出
- **無分類標籤**：無法只看 Fragment 載入或只看資料綁定的日誌
- **散落的直接 console 呼叫**：部分元件（如 `BattleLogPanel`）仍直接使用 `console.log`

### 10.2 UCUFLogger 設計

```typescript
/** 日誌層級 */
enum LogLevel { NONE = 0, ERROR = 1, WARN = 2, INFO = 3, DEBUG = 4, VERBOSE = 5 }

/** 日誌分類標籤 */
type LogCategory =
    | 'lifecycle'      // mount / unmount / show / hide
    | 'data-binding'   // applyContentState / onDataUpdate
    | 'fragment'       // lazySlot load / switch / destroy
    | 'skin'           // skinLayers build / skin resolve
    | 'asset'          // 資源載入 / 釋放 / 註冊
    | 'i18n'           // 語系切換 / 翻譯查詢
    | 'diagnostic'     // 自我診斷 / 規則違反
    | 'memory';        // 記憶體追蹤 / dispose

class UCUFLogger {
    private static _level: LogLevel = LogLevel.WARN;
    private static _enabledCategories = new Set<LogCategory>();
    private static _enableAll = false;

    /** 全域設定日誌層級（production 建議 ERROR，dev 建議 DEBUG） */
    static setLevel(level: LogLevel): void { this._level = level; }

    /** 開啟 / 關閉特定分類 */
    static enableCategory(cat: LogCategory, on = true): void {
        on ? this._enabledCategories.add(cat) : this._enabledCategories.delete(cat);
    }

    /** 開啟所有分類（除錯用） */
    static enableAll(on = true): void { this._enableAll = on; }

    static debug(cat: LogCategory, msg: string, ...args: unknown[]): void {
        if (this._level >= LogLevel.DEBUG && this._isCategoryOn(cat)) {
            console.log(`[UCUF:${cat}] ${msg}`, ...args);
        }
    }

    static info(cat: LogCategory, msg: string, ...args: unknown[]): void {
        if (this._level >= LogLevel.INFO && this._isCategoryOn(cat)) {
            console.log(`[UCUF:${cat}] ${msg}`, ...args);
        }
    }

    static warn(cat: LogCategory, msg: string, ...args: unknown[]): void {
        if (this._level >= LogLevel.WARN) {
            console.warn(`[UCUF:${cat}] ⚠️ ${msg}`, ...args);
        }
    }

    static error(cat: LogCategory, msg: string, ...args: unknown[]): void {
        if (this._level >= LogLevel.ERROR) {
            console.error(`[UCUF:${cat}] ❌ ${msg}`, ...args);
        }
    }

    private static _isCategoryOn(cat: LogCategory): boolean {
        return this._enableAll || this._enabledCategories.has(cat);
    }
}
```

### 10.3 關鍵路徑日誌覆蓋

| 路徑 | 分類 | 層級 | 訊息範例 |
|------|------|------|----------|
| `CompositePanel.mount()` | lifecycle | INFO | `mount("general-detail-unified-screen") — layout loaded, 7 slots` |
| `CompositePanel.switchSlot()` | fragment | DEBUG | `switchSlot("TabContentSlot", "tab-basics") — 12 nodes built` |
| `ChildPanelBase.onDataUpdate()` | data-binding | DEBUG | `AttributePanel "BasicInfo" — 8 rows updated` |
| `skinLayers` 建構 | skin | VERBOSE | `FooterPanel — 3 skin layers applied (fill/bleed/frame)` |
| 資料綁定路徑找不到 | data-binding | WARN | `bind path "stats.luck" not found in content state` |
| Fragment JSON 載入失敗 | fragment | ERROR | `fragment "tab-skills" load failed: 404` |

### 10.4 與既有 UIPreviewDiagnostics 的整合

`UIPreviewDiagnostics` 的所有方法內部改為委託 `UCUFLogger`：

```typescript
// 改前
static buildScreenSuccess(layoutId: string, count: number): void {
    console.log(`[UIPreviewBuilder] buildScreen 完成 ...`);
}

// 改後
static buildScreenSuccess(layoutId: string, count: number): void {
    UCUFLogger.info('lifecycle', `buildScreen 完成 (layout: ${layoutId}) root.children=${count}`);
}
```

### 10.5 Runtime 開關 API

```typescript
// 開發期間在 Browser Console 快速開關
(window as any).__ucuf_debug = () => {
    UCUFLogger.setLevel(LogLevel.VERBOSE);
    UCUFLogger.enableAll(true);
};
(window as any).__ucuf_quiet = () => {
    UCUFLogger.setLevel(LogLevel.ERROR);
    UCUFLogger.enableAll(false);
};
```

---

## 11. 架構自我診斷與校驗

### 11.1 設計目標

在 **runtime** 主動偵測 UI 配置違規，而非等到視覺出錯後人工排查。
所有違規都產出結構化的 Warning，包含**錯誤來源、違反規則、建議修正方案**。

### 11.2 RuntimeRuleChecker 設計

```typescript
interface RuleViolation {
    ruleId: string;          // 如 'RT-01'
    severity: 'error' | 'warning' | 'info';
    source: string;          // 如 'FooterPanel' 或 'general-detail-unified-main.json'
    message: string;         // 人類可讀描述
    suggestion: string;      // 建議修正方案
}

class RuntimeRuleChecker {
    private violations: RuleViolation[] = [];

    /** 在 CompositePanel.mount() 完成後呼叫 */
    check(panel: CompositePanel): RuleViolation[] {
        this.violations = [];
        this._checkNodeDepth(panel);
        this._checkDuplicateBindings(panel);
        this._checkLayoutConflicts(panel);
        this._checkSkinLayerIntegrity(panel);
        this._checkOrphanSlots(panel);
        return this.violations;
    }
}
```

### 11.3 輸出格式

```
[UCUF:diagnostic] ⚠️ RT-05 violation in "FooterPanel"
  ├─ 來源: general-detail-unified-main.json, line ~42
  ├─ 說明: 2 siblings share identical widget { left:24, right:24, bottom:24 }
  └─ 建議: 使用 skinLayers 將視覺層合併為單一節點，或調整 widget 使其不重疊

[UCUF:diagnostic] ❌ RT-03 violation in "InfoCardChrome"
  ├─ 來源: skinLayers[1].slot = "gdv3.card.bleed"
  ├─ 說明: skinSlot "gdv3.card.bleed" 在 skin "general-detail-v3-default" 中不存在
  └─ 建議: 在 general-detail-v3-default.json 中新增該 slot 定義，或修正 skinLayers 中的 slot 名稱
```

### 11.4 觸發時機

| 時機 | 執行規則 | 條件 |
|------|----------|------|
| `CompositePanel.mount()` 完成後 | 全部 RT-01~RT-10 | 僅 `DEBUG_MODE` 開啟時 |
| `switchSlot()` 完成後 | RT-01, RT-04 | 僅 `DEBUG_MODE` 開啟時 |
| `applyContentState()` 完成後 | RT-02, RT-09 | 僅 `DEBUG_MODE` 開啟時 |
| `validate-ui-specs.js` CLI | 靜態版 RT-03, RT-05~RT-08 | 永遠執行 |

> Runtime 規則 RT-01~RT-10 的完整清單見 [UCUF規範文件.md §3](UCUF規範文件.md#3-lint-規則總表) (doc_ui_0026)。

---

## 12. 自動化測試框架

### 12.1 測試分層策略

```
┌────────────────────────────────────────────────┐
│  Layer 3: Integration Tests (E2E)              │
│  ─ 完整 Screen mount → data bind → 截圖比對    │
│  ─ 執行頻率：每次 PR / 手動觸發                 │
├────────────────────────────────────────────────┤
│  Layer 2: Component Tests                      │
│  ─ 單一 ChildPanel 的 mount + dataUpdate       │
│  ─ 驗證節點數、bind 正確性、skinSlot 對應       │
│  ─ 執行頻率：每次 commit                        │
├────────────────────────────────────────────────┤
│  Layer 1: Unit Tests (Pure Logic)              │
│  ─ UCUFLogger / RuntimeRuleChecker / AssetReg  │
│  ─ skinLayers 解析 / composite-image 建構       │
│  ─ DataBindingValidator / I18nInjector          │
│  ─ 執行頻率：每次修改 + CI                      │
└────────────────────────────────────────────────┘
```

### 12.2 Layer 1: 純邏輯單元測試

不依賴 Cocos runtime，使用 **mock NodeHandle** 執行：

```typescript
// tests/ucuf/skinLayers.test.ts
describe('skinLayers 解析', () => {
    it('應建立正確數量的 skin layer 子節點', () => {
        const mockFactory = new MockNodeFactory();
        const spec: SkinLayerDef[] = [
            { slot: 'fill', zOrder: 0 },
            { slot: 'bleed', zOrder: 1, expand: 4 },
            { slot: 'frame', zOrder: 2 },
        ];
        const result = buildSkinLayers(mockFactory, spec);
        expect(result.children.length).toBe(3);
        expect(result.children[1].widget.top).toBe(-4); // expand 向外擴
    });

    it('不應允許重複的 zOrder', () => {
        const spec: SkinLayerDef[] = [
            { slot: 'a', zOrder: 0 },
            { slot: 'b', zOrder: 0 },
        ];
        expect(() => buildSkinLayers(new MockNodeFactory(), spec)).toThrow(/duplicate zOrder/);
    });
});
```

### 12.3 Layer 2: 元件測試

使用 Cocos test runner（`cocos-test-helper`）或專案內的 `UIScreenPreviewHost`：

```typescript
// tests/ucuf/AttributePanel.component.test.ts
describe('AttributePanel', () => {
    let panel: AttributePanel;

    beforeEach(async () => {
        panel = new AttributePanel();
        await panel.onMount({
            childType: 'attribute',
            config: { columns: 1, rowHeight: 32, rowSpacing: 8 },
        });
    });

    it('應根據資料長度建立對應數量的行', () => {
        panel.onDataUpdate({
            basicAttributes: [
                { label: '武力', value: '97' },
                { label: '智力', value: '85' },
            ],
        });
        expect(panel.rowCount).toBe(2);
    });

    it('空資料應顯示空狀態', () => {
        panel.onDataUpdate({ basicAttributes: [] });
        expect(panel.rowCount).toBe(0);
    });
});
```

### 12.4 Layer 3: 整合測試（截圖回歸）

```bash
# 對所有已遷移的 UCUF 畫面執行截圖回歸
node tools_node/ucuf-screenshot-regression.js --screens general-detail-unified --baseline artifacts/ucuf-baseline/
# 輸出：
#   general-detail-unified/tab-basics:    PASS (diff: 0.02%)
#   general-detail-unified/tab-stats:     PASS (diff: 0.00%)
#   general-detail-unified/tab-bloodline: FAIL (diff: 4.7%) ← 需人工審核
```

> Pass-All Gate 規則見 [UCUF規範文件.md §6](UCUF規範文件.md#6-驗證工具與提交前指令) (doc_ui_0026)。

---
