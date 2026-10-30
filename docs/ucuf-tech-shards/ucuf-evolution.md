# UCUF 技術文件 — 演進建議、遷移方案、規則引擎（§17–§19）

> 這是 `UCUF技術文件.md` 的「演進建議、遷移方案、規則引擎（§17–§19）」分片。完整索引見 `docs/UCUF技術文件.md`。

## 17. 架構治理與長期演進建議（🔷 建議）

### 17.1 記憶體管理補充：`onAssetEvicted` 的實際接線

現有 `MemoryManager.onAssetEvicted` hook 在文件中描述了接線方式，
但實際程式碼中 `ResourceManager` **沒有 `forceRelease` 方法**。
目前 `releaseAsset()` 只做 `decRef()` + 刪除快取 entry，
不會呼叫 Cocos 的 `assetManager.releaseAsset()`。

**建議**：在 `ResourceManager` 新增真正的硬釋放方法：

```typescript
// ResourceManager 新增
public forceRelease(key: string, bundle: string): void {
    this.releaseAsset(key);
    // 真正呼叫 Cocos 的底層釋放
    const bundleObj = assetManager.getBundle(bundle) ?? resources;
    const asset = bundleObj?.get(key);
    if (asset) {
        assetManager.releaseAsset(asset);
    }
}
```

並在 `ServiceLoader.initialize()` 接線：

```typescript
this.memory.onAssetEvicted = (key, bundle) => {
    this.resource.forceRelease(key, bundle);
};
```

### 17.2 記憶體管理補充：ResourceManager 快取無上限

目前 `ResourceManager` 的五個 Map 快取全部無上限：

```typescript
private jsonCache = new Map<string, JsonAsset>();         // 無限增長
private prefabCache = new Map<string, Prefab>();           // 無限增長
private spriteFrameCache = new Map<string, SpriteFrame[]>(); // 無限增長
private singleSpriteFrameCache = new Map<string, SpriteFrame>(); // 無限增長
private fontCache = new Map<string, Font>();                // 無限增長
```

`MemoryManager` 有 LRU buffer（上限 50），但這只管帳目——
`ResourceManager` 的 Map 中**被 LRU 逐出的資源仍然留在快取裡**。

**建議**：讓 `MemoryManager.onAssetEvicted` 回調真正清理 `ResourceManager` 的 Map。
這是讓整條記憶體管線真正閉環的關鍵接線。

### 17.3 CompositePanel 的 scope 自動管理

每個 `CompositePanel` 應自動為自己的資源建立一個 scope：

```typescript
// CompositePanel 內部
private get _memoryScope(): string {
    return `ucuf:${this.screenSpec.id}`;
}

protected async loadAssetTracked<T>(path: string, loader: (p: string) => Promise<T>): Promise<T> {
    this._loadedAssetPaths.add(path);
    services().memory.notifyLoaded(path, 'resources', 'auto', this._memoryScope);
    return loader(path);
}

dispose(): void {
    // 一鍵釋放整個 panel 的所有資源
    services().memory.releaseByScope(this._memoryScope);
    // ...
}
```

### 17.4 Fragment JSON 快取層

目前每次 `switchSlot()` 都會重新 `resources.load` Fragment JSON。
應在 `UISpecLoader` 加入 Fragment 快取：

```typescript
// UISpecLoader 新增
private _fragmentCache = new Map<string, UILayoutSpec>();

async loadFragment(fragmentId: string): Promise<UILayoutSpec> {
    const cached = this._fragmentCache.get(fragmentId);
    if (cached) return cached;
    const layout = await this._loadLayout(fragmentId);
    this._fragmentCache.set(fragmentId, layout);
    return layout;
}

clearFragmentCache(): void {
    this._fragmentCache.clear();
}
```

### 17.5 ChildPanel 的 diff-update 而非全量重建

應在 Base 層面提供**淺比對 + 差異更新**的標準化框架：

```typescript
abstract class ChildPanelBase {
    private _prevData: Record<string, unknown> | null = null;

    /** 由 CompositePanel 呼叫 */
    _internalDataUpdate(data: Record<string, unknown>): void {
        const changes = this._diffData(this._prevData, data);
        if (changes.length === 0) return; // 資料沒變，跳過
        this._prevData = { ...data };
        this.onDataUpdate(data, changes);
    }

    /** 子類覆寫：只處理有變化的欄位 */
    abstract onDataUpdate(data: Record<string, unknown>, changedKeys: string[]): void;

    private _diffData(
        prev: Record<string, unknown> | null,
        next: Record<string, unknown>
    ): string[] {
        if (!prev) return Object.keys(next);
        const changed: string[] = [];
        for (const key of Object.keys(next)) {
            if (prev[key] !== next[key]) changed.push(key);
        }
        return changed;
    }
}
```

### 17.6 Event / 回調解耦建議

引入輕量事件匯流排（可直接復用既有的 `EventSystem`）：

```typescript
// CompositePanel 廣播資料更新
this.emit('content-state-changed', newState);

// 每個 ChildPanel 在 onMount 時訂閱
this.host.on('content-state-changed', (state) => {
    const myData = state[this.dataSource];
    if (myData) this._internalDataUpdate(myData);
});
```

好處：新增 ChildPanel 類型時不需要修改 `CompositePanel` 的分發邏輯。

### 17.7 動畫與過渡效果標準化

在 `switchSlot` 中加入可配置的過渡效果：

```json
{
  "tabRouting": {
    "Basics": {
      "slotId": "TabContentSlot",
      "fragment": "fragments/layouts/tab-basics",
      "transition": { "type": "crossFade", "duration": 0.15 }
    }
  }
}
```

### 17.8 熱更新安全性

UI spec JSON 作為純資料，天然支援熱更新（Cocos 的 Hot Update）。
需要確保：

1. **版本相容性**：spec JSON 加入 `specVersion` 欄位，`CompositePanel.mount()` 時驗證
2. **降級處理**：若 spec version > 引擎支援的最高版本，顯示降級 UI 而非 crash
3. **Fragment 獨立熱更**：每個 Fragment 可以獨立打成 subpackage，支援按需下載

---

## 18. GeneralDetailOverview 遷移技術方案

### 18.1 目標：從 2 個 Panel + 2 個 Layout → 1 個 CompositePanel + 1 個 Layout

#### 現狀

```
GeneralDetailPanel (UIPreviewBuilder)
├── buildScreen(general-detail-main)     ← Classic Layout (515 行)
├── _ensureOverviewShell()
│   └── GeneralDetailOverviewShell (UIPreviewBuilder)
│       └── buildScreen(general-detail-bloodline-v3-main)  ← V3 Layout (402 行)
└── _setOverviewMode() 切換 active
```

#### 目標

```
GeneralDetailComposite (CompositePanel)
├── mount('general-detail-unified-screen')
│   └── buildScreen(general-detail-unified-main)  ← 統一 Layout (~200 行)
│       ├── BackgroundScene (image)
│       ├── PortraitCarrier ($ref fragment)
│       ├── OverviewStateChrome (container)
│       ├── InfoCardChrome (panel + skinLayers)
│       ├── TabContentSlot (lazySlot)
│       ├── TabBar (container)
│       └── TopCloseBtn (button)
└── tabRouting 動態切換 TabContentSlot 的 fragment
```

### 18.2 遷移架構

#### Phase A：建立統一 Layout JSON

1. 合併 Classic 和 V3 的共用結構（背景、立繪、TabBar、關閉鈕）
2. 把 V3 Overview 的內容區（HeaderRow + SummaryModules + BloodlineModules）
   拆成獨立 Fragment：`fragments/layouts/tab-overview.json`
3. 把 Classic 的 6 個 Tab 頁面各拆成獨立 Fragment
4. Footer 從 4 節點疊加改為 1 節點 + `skinLayers`

#### Phase B：建立 GeneralDetailComposite

1. 繼承 `CompositePanel`
2. 保留 `GeneralDetailOverviewMapper` 的映射邏輯
3. 把 `_applyContentState()` 遷移為 `applyContentState()` 的實作
4. 刪除 `_setOverviewMode()`、`_ensureOverviewShell()` 等切換邏輯

#### Phase C：遷移 GeneralConfig 映射

現有的 `buildGeneralDetailOverviewContentState()` 函式保持不變，
但回傳值直接餵給 `CompositePanel.applyContentState()`。

```typescript
// 遷移前
const state = buildGeneralDetailOverviewContentState(config);
this._overviewShell.showContentState(state);

// 遷移後
const state = buildGeneralDetailOverviewContentState(config);
this.applyContentState(state);
```

#### Phase D：驗證與切換

1. 用 `cocos-preview-qa` 截圖對比遷移前後畫面
2. 確認所有 Tab 切換正常
3. 確認節點數量下降（目標：80+ → ≤35）
4. 刪除 `GeneralDetailPanel.ts` 和 `GeneralDetailOverviewShell.ts`

### 18.3 遷移風險控制

| 風險 | 緩解措施 |
|------|----------|
| 視覺差異 | 遷移前截取 6 張 Tab 的 reference screenshot |
| Skin 遺失 | 用 `validate-skin-contracts.js` 驗證所有 skinSlot 都有對應 |
| 資料綁定斷線 | 用 `UIContentBinder.validate()` 驗證 content state 完整性 |
| 效能回退 | Fragment lazy-load 反而應該改善（減少首次 buildScreen 節點數） |

> 遷移的可執行步驟與驗收規則見 [UCUF里程碑文件.md M4](UCUF里程碑文件.md#m4-generaldetailoverview-遷移) (doc_ui_0025)。

---

## 19. 動態規則注入引擎

### 19.1 UCUFRuleRegistry 設計

建立一套機器可讀的規則註冊表，允許 Agent 在發現新問題時**動態新增規則**，
並自動同步到診斷、日誌、測試三個層次。

```typescript
// assets/scripts/ui/core/UCUFRuleRegistry.ts
interface UCUFRule {
    /** 規則 ID，如 'RT-11' */
    id: string;
    /** 規則名稱 */
    name: string;
    /** 規則描述 */
    description: string;
    /** 嚴重度 */
    severity: 'error' | 'warning' | 'info';
    /** 適用範圍 */
    scope: 'static' | 'runtime' | 'both';
    /** 規則分類（對應 UCUFLogger 的 LogCategory） */
    category: LogCategory;
    /** 檢查函式（runtime 規則） */
    check?: (panel: CompositePanel) => RuleViolation[];
    /** 靜態檢查函式（供 validate-ui-specs.js 使用） */
    staticCheck?: (spec: UILayoutNodeSpec) => RuleViolation[];
    /** 建議的自動修正方案（可選） */
    autoFix?: string;
    /** 新增此規則的來源（Agent ID 或人類） */
    addedBy: string;
    /** 新增時間 */
    addedAt: string;
}

class UCUFRuleRegistry {
    private static _rules = new Map<string, UCUFRule>();
    private static _listeners: Array<(rule: UCUFRule) => void> = [];

    /** 註冊新規則 */
    static register(rule: UCUFRule): void {
        if (this._rules.has(rule.id)) {
            UCUFLogger.warn('diagnostic', `規則 ${rule.id} 已存在，將被覆蓋`);
        }
        this._rules.set(rule.id, rule);
        // 通知所有監聽者（自動同步到三個層次）
        for (const listener of this._listeners) {
            listener(rule);
        }
        UCUFLogger.info('diagnostic', `新規則已註冊: ${rule.id} — ${rule.name} [by ${rule.addedBy}]`);
    }

    /** 訂閱新規則事件 */
    static onRuleAdded(fn: (rule: UCUFRule) => void): void {
        this._listeners.push(fn);
    }

    /** 取得所有已註冊規則 */
    static getAllRules(): UCUFRule[] {
        return [...this._rules.values()];
    }

    /** 依 scope 過濾規則 */
    static getRulesByScope(scope: 'static' | 'runtime'): UCUFRule[] {
        return this.getAllRules().filter(r => r.scope === scope || r.scope === 'both');
    }
}
```

### 19.2 規則自動同步到三個層次

#### (A) 自我診斷自動擴充

`RuntimeRuleChecker` 在初始化時訂閱 `UCUFRuleRegistry.onRuleAdded`：

```typescript
class RuntimeRuleChecker {
    constructor() {
        UCUFRuleRegistry.onRuleAdded((rule) => {
            if (rule.check && (rule.scope === 'runtime' || rule.scope === 'both')) {
                this._dynamicChecks.push(rule);
                UCUFLogger.debug('diagnostic', `RuntimeRuleChecker 已加入動態規則: ${rule.id}`);
            }
        });
    }

    check(panel: CompositePanel): RuleViolation[] {
        const violations: RuleViolation[] = [];
        violations.push(...this._checkBuiltinRules(panel));
        for (const rule of this._dynamicChecks) {
            violations.push(...rule.check!(panel));
        }
        return violations;
    }
}
```

#### (B) 日誌系統自動擴充

新規則的 `category` 自動作為 `UCUFLogger` 的分類標籤：

```typescript
UCUFRuleRegistry.onRuleAdded((rule) => {
    UCUFLogger.enableCategory(rule.category, true);
});
```

#### (C) 自動測試骨架生成

```bash
# Agent 註冊新規則後，自動生成測試骨架
node tools_node/ucuf-gen-rule-test.js --rule-id RT-11
# 產出：tests/ucuf/rules/RT-11.test.ts
```

### 19.3 規則持久化格式

```json
// assets/resources/ui-spec/ucuf-rules-registry.json
{
  "version": 1,
  "rules": [
    {
      "id": "RT-11",
      "name": "composite-image-duplicate-slot",
      "description": "composite-image 的 layers 中不允許重複的 skinSlot",
      "severity": "warning",
      "scope": "both",
      "category": "skin",
      "checkModule": "rules/RT-11-check",
      "addedBy": "agent1",
      "addedAt": "2026-04-12T15:30:00"
    }
  ]
}
```

`RuntimeRuleChecker` 在初始化時讀取此 JSON，`import()` 動態載入 `checkModule`。

### 19.4 回饋閉環

```
Agent 發現問題
      │
      ▼
UCUFRuleRegistry.register()
      │
      ├──► (A) RuntimeRuleChecker 自動擴充 → 下次 mount() 時自動偵測
      │
      ├──► (B) UCUFLogger 啟用新 category → 相關日誌自動輸出
      │
      ├──► (C) ucuf-gen-rule-test.js → 測試骨架自動生成
      │
      └──► (D) ucuf-rules-registry.json → 持久化供所有 Agent 共用
              │
              ▼
      下一個 Agent 入場 → 自動載入所有動態規則
              │
              ▼
      finalize-agent-turn.js → Gate 檢查包含所有動態規則
```

### 19.5 規則生命週期管理

| 狀態 | 說明 | 轉換條件 |
|------|------|----------|
| `draft` | Agent 新增的規則，尚未經人類審核 | Agent 呼叫 `register()` |
| `active` | 人類審核通過，正式啟用 | 人類在 JSON 中標記 `"status": "active"` |
| `deprecated` | 規則已不適用 | 架構演進導致規則過時 |
| `removed` | 已從 registry 移除 | 人類手動刪除 |

Agent 新增的規則預設為 `draft` 狀態。`draft` 規則在 runtime 中以 `info`
而非 `warning` 或 `error` 級別觸發，避免誤攔阻開發流程。
人類審核後改為 `active` 才會以原始 severity 觸發。

> 動態規則注入的使用流程見 [UCUF規範文件.md §9](UCUF規範文件.md#9-動態規則注入流程) (doc_ui_0026)。
