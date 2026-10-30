# UCUF 技術文件 — 記憶體、資料綁定、語系、效能（§13–§16）

> 這是 `UCUF技術文件.md` 的「記憶體、資料綁定、語系、效能（§13–§16）」分片。完整索引見 `docs/UCUF技術文件.md`。

## 13. 記憶體管理與資源卸載

### 13.1 現有基礎評估

專案已具備完整的記憶體管理骨架：

| 元件 | 路徑 | 功能 |
|------|------|------|
| `MemoryManager` | `core/systems/MemoryManager.ts` | refCount 追蹤 + LRU 軟釋放 + scope 批次釋放 |
| `ResourceManager` | `core/systems/ResourceManager.ts` | addRef/decRef + releaseByTag + clearCache |
| `SceneManager` | `core/managers/SceneManager.ts` | 場景切換中繼（LoadingScene） |

**結論**：不需要重建記憶體管理，而是讓 `CompositePanel` 正確串接已有的機制。

### 13.2 CompositePanel.dispose() 完整釋放

```typescript
abstract class CompositePanel {
    /** 追蹤本 Panel 所有動態載入的資源路徑 */
    private _loadedAssetPaths = new Set<string>();

    /** 完整釋放：銷毀節點 + 釋放資源 + 清理引用 */
    dispose(): void {
        // 1. 銷毀所有 ChildPanel
        for (const [slotId, child] of this.childPanels) {
            child.onUnmount();
            UCUFLogger.debug('memory', `ChildPanel "${slotId}" unmounted`);
        }
        this.childPanels.clear();

        // 2. 釋放所有動態載入的資源
        const rm = services().resource;
        for (const path of this._loadedAssetPaths) {
            rm.releaseAsset(path);
        }
        this._loadedAssetPaths.clear();

        // 3. 釋放 Screen / Layout / Skin 的 JSON 快取（透過 tag）
        rm.releaseByTag(`screen:${this.screenSpec.id}`);

        // 4. 銷毀節點樹
        this.unmount();

        UCUFLogger.info('memory',
            `CompositePanel "${this.screenSpec.id}" disposed — ${this._loadedAssetPaths.size} assets released`);
    }
}
```

### 13.3 資源載入追蹤器（🔷 規劃中）

每次 `CompositePanel` 或其 `ChildPanel` 載入資源時，自動註冊到追蹤器：

```typescript
// CompositePanel 內部
protected async loadAssetTracked<T>(
    path: string,
    loader: (path: string) => Promise<T>
): Promise<T> {
    this._loadedAssetPaths.add(path);
    // 同步通報 MemoryManager（使用 screen scope）
    services().memory.notifyLoaded(path, 'resources', 'auto', `screen:${this.screenSpec.id}`);
    return loader(path);
}
```

### 13.4 UIManager 場景切換強制卸載

在 `UIManager` 中新增場景切換時的強制卸載機制：

```typescript
// UIManager 擴充
public onSceneWillChange(targetScene: string): void {
    // 關閉所有 UI 層級的面板
    for (const [uiId, entry] of this.registry) {
        if (entry.isOpen) this.close(uiId);
    }

    // 對所有已註冊的 CompositePanel 呼叫 dispose()
    for (const [uiId, entry] of this.registry) {
        const composite = entry.layer as unknown as CompositePanel;
        if (composite?.dispose) {
            composite.dispose();
        }
    }

    // 觸發 MemoryManager 的 scope 批次釋放
    services().memory.releaseByScope(`scene:${targetScene}`);
}
```

### 13.5 低記憶體壓力釋放（🔷 規劃中）

利用 `MemoryManager` 既有的 `warningThreshold`：

```typescript
// MemoryManager.onThresholdExceeded 掛載回調
services().memory.onThresholdExceeded = (recordCount: number) => {
    UCUFLogger.warn('memory', `資源記錄數 ${recordCount} 超過警戒線`);

    // 1. 釋放所有非活躍 CompositePanel 的快取資源
    for (const [uiId, entry] of services().ui.getRegistry()) {
        if (!entry.isOpen) {
            const composite = entry.layer as unknown as CompositePanel;
            composite?.dispose?.();
        }
    }

    // 2. 觸發 LRU buffer 清理
    services().memory.evictLruBuffer(/* keepCount */ 10);
};
```

---

## 14. 資料綁定系統

### 14.1 設計原則：內容 100% 資料驅動

UCUF 所有可見文字、數值、圖片、列表內容嚴格要求由 `applyContentState(state)` 傳入的 content state 物件提供。

```
禁止:
  label.string = '武力';           // ❌ 寫死中文
  label.string = '97';             // ❌ 寫死數值
  sprite.spriteFrame = hardcoded;  // ❌ 寫死圖片

正確:
  // content state 提供所有資料
  applyContentState({
      basicAttributes: [
          { label: i18n.t('ui.stat.str'), value: String(config.str) }
      ]
  });
```

### 14.2 DataBindingValidator

在 `applyContentState()` 時自動驗證資料完整性：

```typescript
class DataBindingValidator {
    /**
     * 驗證 content state 與 Layout spec 的 dataSource 宣告是否匹配。
     * @returns 不匹配的項目列表
     */
    static validate(
        contentState: Record<string, unknown>,
        childPanels: Map<string, ChildPanelBase>
    ): BindingMismatch[] {
        const mismatches: BindingMismatch[] = [];

        for (const [slotId, panel] of childPanels) {
            const ds = panel.dataSource;
            if (!ds) continue;

            // 檢查 1：dataSource 在 content state 中是否存在
            if (!(ds in contentState)) {
                mismatches.push({
                    type: 'missing-source',
                    slotId,
                    dataSource: ds,
                    message: `ChildPanel "${slotId}" 宣告 dataSource="${ds}"，但 content state 中不存在此欄位`,
                    suggestion: `在 Mapper 的 buildContentState() 中補上 "${ds}" 欄位`,
                });
            }

            // 檢查 2：資料格式是否符合 ChildPanel 預期
            const data = contentState[ds];
            if (data !== undefined) {
                const formatError = panel.validateDataFormat(data);
                if (formatError) {
                    mismatches.push({
                        type: 'format-mismatch',
                        slotId,
                        dataSource: ds,
                        message: formatError,
                        suggestion: `確認 Mapper 回傳的 "${ds}" 符合 ${panel.constructor.name} 的資料格式`,
                    });
                }
            }
        }

        // 檢查 3：content state 有多餘的 key 沒有被任何 ChildPanel 使用
        const usedKeys = new Set(
            [...childPanels.values()].map(p => p.dataSource).filter(Boolean)
        );
        for (const key of Object.keys(contentState)) {
            if (!usedKeys.has(key) && key !== '_meta') {
                mismatches.push({
                    type: 'unused-key',
                    slotId: '',
                    dataSource: key,
                    message: `content state 中的 "${key}" 未被任何 ChildPanel 使用`,
                    suggestion: `若此欄位已不需要，從 Mapper 中移除以減少資料傳輸`,
                });
            }
        }

        return mismatches;
    }
}
```

### 14.3 資料重新填充（Refill）

`CompositePanel` 支援隨時以新資料重新填充畫面：

```typescript
// 切換武將時，直接用新資料重新填充
const newState = buildGeneralDetailOverviewContentState(newGeneralConfig);
compositePanel.applyContentState(newState);
// ↑ 內部自動：
//   1. DataBindingValidator.validate()
//   2. 對每個 ChildPanel 呼叫 onDataUpdate(newData)
//   3. ChildPanel 內部做差異更新（非全量重建）
```

### 14.4 綁定衝突偵測（🔷 規劃中）

防止同一 `dataSource` 被多個 ChildPanel 綁定造成的更新衝突：

```typescript
// CompositePanel.mount() 內部
private _detectBindingConflicts(): void {
    const dsMap = new Map<string, string[]>();
    for (const [slotId, panel] of this.childPanels) {
        const ds = panel.dataSource;
        if (!ds) continue;
        const list = dsMap.get(ds) ?? [];
        list.push(slotId);
        dsMap.set(ds, list);
    }

    for (const [ds, slots] of dsMap) {
        if (slots.length > 1) {
            UCUFLogger.warn('data-binding',
                `dataSource "${ds}" 被多個 ChildPanel 綁定: [${slots.join(', ')}]。` +
                `若這是刻意的共享資料，請在 spec 中標記 "shared": true`
            );
        }
    }
}
```

### 14.5 ChildPanelBase.validateDataFormat()

每個 ChildPanel 子類必須實作資料格式驗證：

```typescript
// AttributePanel
validateDataFormat(data: unknown): string | null {
    if (!Array.isArray(data)) return `預期 Array，收到 ${typeof data}`;
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (typeof row !== 'object' || !('label' in row) || !('value' in row)) {
            return `第 ${i} 列缺少必要欄位 "label" 或 "value"`;
        }
    }
    return null; // 格式正確
}

// RadarChartPanel
validateDataFormat(data: unknown): string | null {
    if (typeof data !== 'object' || data === null) return `預期 Object，收到 ${typeof data}`;
    const axes = this.config.axes as string[];
    for (const axis of axes) {
        if (!(axis in (data as Record<string, unknown>))) {
            return `缺少軸向資料 "${axis}"`;
        }
    }
    return null;
}
```

---

## 15. 多國語系統籌管理

### 15.1 現有 I18nSystem 評估

專案已有完整的 `I18nSystem`（`core/systems/I18nSystem.ts`）：

| 功能 | 狀態 |
|------|------|
| `setLocale(locale)` — 語系切換 + 字型懶載入 | ✅ 已實作 |
| `t(key, ...args)` — 字串翻譯 + 佔位符 | ✅ 已實作 |
| `getFont(role)` — 語系字型取得 | ✅ 已實作 |
| `onLocaleChanged` — 語系切換事件 | ✅ 已實作 |
| 字型 addRef/decRef 防 GC | ✅ 已實作 |

**結論**：I18nSystem 核心不需要重建，但 `CompositePanel` 需要**統籌注入**機制。

### 15.2 CompositePanel 語系注入方案

```typescript
abstract class CompositePanel {
    /** 統一管理語系：mount 時自動注入，語系切換時自動重載 */
    private _currentLocale: string = '';
    private _localeChangeUnsub: (() => void) | null = null;

    async mount(screenId: string): Promise<void> {
        // ... 載入 screen/layout/skin ...

        // 自動注入當前語系
        this._currentLocale = services().i18n.currentLocale;
        const i18nStrings = await services().specLoader.loadI18n(this._currentLocale);
        this._injectI18n(i18nStrings);

        // 監聽語系切換事件 — 自動重新注入
        this._localeChangeUnsub = services().i18n.onLocaleChanged(async (newLocale) => {
            this._currentLocale = newLocale;
            const newStrings = await services().specLoader.loadI18n(newLocale);
            this._injectI18n(newStrings);
            // 通知所有 ChildPanel 重新渲染文字
            for (const [, child] of this.childPanels) {
                child.onLocaleChanged(newStrings);
            }
            UCUFLogger.info('i18n', `語系切換至 "${newLocale}"，所有 ChildPanel 已重新注入`);
        });
    }

    dispose(): void {
        this._localeChangeUnsub?.();
        // ... 其他清理 ...
    }
}
```

### 15.3 ChildPanelBase 語系支援

```typescript
abstract class ChildPanelBase {
    /** 當前語系字串快取 */
    protected i18nStrings: Record<string, string> = {};

    /** 由 CompositePanel 呼叫，注入語系字串 */
    onLocaleChanged(strings: Record<string, string>): void {
        this.i18nStrings = strings;
        this._refreshLabels();
    }

    /** 翻譯 helper — 與 I18nSystem.t() 行為一致 */
    protected t(key: string, ...args: string[]): string {
        let str = this.i18nStrings[key] ?? key;
        args.forEach((arg, i) => { str = str.replace(`{${i}}`, arg); });
        return str;
    }

    /** 子類覆寫：重新渲染所有文字標籤 */
    protected abstract _refreshLabels(): void;
}
```

### 15.4 統籌管理 + 局部覆寫模式

大部分 ChildPanel 自動使用系統語系（`services().i18n.currentLocale`），
但特殊場景允許**局部覆寫**：

```json
{
  "type": "child-panel",
  "childType": "attribute",
  "name": "DiplomacyInfo",
  "config": {
    "localeOverride": "zh-CN",
    "columns": 1
  },
  "dataSource": "diplomacyAttributes"
}
```

```typescript
// ChildPanelBase 處理覆寫
async onMount(spec: ChildPanelSpec): Promise<void> {
    const overrideLocale = spec.config?.localeOverride;
    if (overrideLocale) {
        // 使用指定語系而非系統語系
        this.i18nStrings = await services().specLoader.loadI18n(overrideLocale);
        UCUFLogger.info('i18n', `"${spec.name}" 使用局部覆寫語系: ${overrideLocale}`);
    }
    // ... 繼續建構 ...
}
```

### 15.5 文字渲染效能優化

大量 Label 同時更新語系時的效能策略：

| 策略 | 說明 |
|------|------|
| **批次更新** | `onLocaleChanged` 收集所有需更新的 Label，用 `scheduleOnce` 在下一幀統一更新 |
| **差異更新** | 比對新舊語系字串，只更新實際有變化的 Label（zh-TW → zh-CN 大部分不變） |
| **字型預載** | 語系切換前先 `preloadFont(newLocale)`，避免切換瞬間出現系統字型 fallback |
| **可視區域優先** | ScrollListPanel 的虛擬列表只更新可視範圍內的項目 |

```typescript
// 批次 + 差異更新示範
protected _refreshLabels(): void {
    const updates: Array<{ label: ILabel; newText: string }> = [];
    for (const [key, labelRef] of this._boundLabels) {
        const newText = this.t(key);
        if (labelRef.string !== newText) {
            updates.push({ label: labelRef, newText });
        }
    }
    if (updates.length === 0) return;

    // 下一幀批次套用
    this.scheduleOnce(() => {
        for (const { label, newText } of updates) {
            label.string = newText;
        }
        UCUFLogger.debug('i18n', `批次更新 ${updates.length} 個 Label`);
    }, 0);
}
```

---

## 16. 效能深度優化

### 16.1 現有效能瓶頸分析

#### 瓶頸 A：`_buildNode` 的逐節點串列 await

`_buildNode` 遞迴建構子節點時，每個 child 都是 `await` 串列執行：

```typescript
// 現狀 — 所有 children 串列 await
for (const child of spec.children) {
    await this._buildNode(child, node, effectiveW, effectiveH);
}
```

每個節點的 `buildPanel` / `buildImage` 內部都包含 `await skinResolver.getSpriteFrame()`
（走 `resources.load` 非同步載入），導致 ~80 次串列 async IO。

#### 瓶頸 B：建構後的三次全樹遍歷

| 遍歷 | 目的 |
|------|------|
| `clearDynamic()` | 清除 `{xxx}` 佔位符 |
| `_postBuildAlignWidgets()` | Widget 重新計算 |
| `UITemplateBinder.bind()` | 掃描 id 建立映射 |

3 次 DFS 在 80 節點的樹上各花 1~3ms，合計 3~9ms。

#### 瓶頸 C：UI 節點從不回收

`PoolSystem` 存在但**只用於 VFX**。UI 節點每次 Tab 切換或重新 buildScreen 時，
舊節點 `removeAllChildren()` + `destroy()`，新節點全部 `new Node()`。

#### 瓶頸 D：`JSON.parse(JSON.stringify())` 深拷貝

`UITemplateResolver._resolveComposeItem()` 每次展開 Widget Fragment 時做一次
`JSON.parse(JSON.stringify(widget.layout))` 深拷貝。對 30+ 節點的 Widget 約 0.5~2ms。

#### 瓶頸 E：`Widget.updateAlignment()` 雙重呼叫

`applyWidget()` 在每個節點建構時呼叫 `widget.updateAlignment()`，
但 `_postBuildAlignWidgets()` 又對整棵樹重做一次。每個有 Widget 的節點被計算兩次。

### 16.2 改進方案

#### 方案 A：Sprite 批次預載入（影響最大）

在 `_buildNode` 遞迴之前，先掃描整棵 spec tree 收集所有 skinSlot，
一次性發起所有 `getSpriteFrame` 的非同步載入：

```typescript
async buildScreen(layout: UILayoutSpec, skin: UISkinManifest | null, ...): Promise<Node> {
    // Phase 1：收集所有 skinSlot → 一次性預載入
    const allSlots = this._collectAllSkinSlots(layout.root);
    await this.skinResolver.preloadSlots(allSlots);  // 並行 Promise.all

    // Phase 2：_buildNode 內部的 getSpriteFrame 全部命中快取，變為同步
    const rootNode = await this._buildNode(layout.root, ...);
    ...
}

// UISkinResolver 新增
async preloadSlots(slots: string[]): Promise<void> {
    const unique = [...new Set(slots)];
    await Promise.all(unique.map(slot => this.getSpriteFrame(slot)));
    // 全部載入完畢後，後續 getSpriteFrame 直接走 cache
}
```

**預估效果**：80 次串列 IO → 1 次並行批次，buildScreen 時間從 ~160ms 降至 ~30ms。

#### 方案 B：合併三次遍歷為一次

```typescript
// 將 clearDynamic + bind + postAlign 合併為一次遍歷
private _postBuildPass(node: Node, spec: UILayoutNodeSpec, binder: UITemplateBinder): void {
    // 1. 清除佔位符
    const lbl = node.getComponent(Label);
    if (lbl && /^\{[^}]+\}$/.test(lbl.string)) lbl.string = '';

    // 2. 登記 binder 映射
    if (spec.id) binder.registerNode(spec.id, node);

    // 3. Widget 對齊
    const widget = node.getComponent(Widget);
    if (widget) widget.updateAlignment();

    // 4. 遞迴子節點
    const children = spec.children ?? [];
    for (let i = 0; i < children.length; i++) {
        this._postBuildPass(node.children[i], children[i], binder);
    }
}
```

**預估效果**：3 次遍歷 → 1 次，節省 ~2~6ms。

#### 方案 C：UI 節點物件池

為 `CompositePanel` 的 `lazySlot` 引入節點回收機制：

```typescript
class UINodePool {
    /** 按 fragment ID 分組的閒置節點池 */
    private pools = new Map<string, Node[]>();
    private maxPerFragment = 3;

    /** Tab 切出時：將該 slot 的子樹回收（而非 destroy） */
    recycle(fragmentId: string, rootNode: Node): void {
        rootNode.removeFromParent();
        rootNode.active = false;
        const pool = this.pools.get(fragmentId) ?? [];
        if (pool.length < this.maxPerFragment) {
            pool.push(rootNode);
            this.pools.set(fragmentId, pool);
        } else {
            rootNode.destroyAllChildren();
            rootNode.destroy();
        }
    }

    /** Tab 切入時：優先從池中取出（跳過 buildScreen） */
    acquire(fragmentId: string): Node | null {
        const pool = this.pools.get(fragmentId);
        if (!pool || pool.length === 0) return null;
        const node = pool.pop()!;
        node.active = true;
        return node;
    }
}
```

用法整合到 `switchSlot()`：
```typescript
async switchSlot(slotId: string, fragmentId: string): Promise<void> {
    // 回收舊 fragment
    const oldChild = this._lazySlots.get(slotId)?.currentChild;
    if (oldChild) this._nodePool.recycle(this._lazySlots.get(slotId)!.currentFragmentId, oldChild);

    // 優先從池取出
    const cached = this._nodePool.acquire(fragmentId);
    if (cached) {
        cached.parent = this._lazySlots.get(slotId)!.containerNode;
        this.applyContentState(this._latestState);  // 重新綁定最新資料
        return;
    }

    // 池空時才走 buildScreen
    await this._buildFragment(slotId, fragmentId);
}
```

**預估效果**：Tab 來回切換從 ~30ms（rebuild） → ~1ms（pool reattach + data rebind）。

#### 方案 D：結構化深拷貝取代 JSON.stringify

```typescript
// 替代 JSON.parse(JSON.stringify(...))
function cloneLayoutSpec(spec: UILayoutNodeSpec): UILayoutNodeSpec {
    const clone: UILayoutNodeSpec = { ...spec };
    if (spec.widget) clone.widget = { ...spec.widget };
    if (spec.layout) clone.layout = { ...spec.layout };
    if (spec.skinLayers) clone.skinLayers = spec.skinLayers.map(l => ({ ...l }));
    if (spec.children) clone.children = spec.children.map(c => cloneLayoutSpec(c));
    return clone;
}
```

**預估效果**：深拷貝從 ~1ms 降至 ~0.1ms。

#### 方案 E：延遲 Widget 計算

`applyWidget()` 中移除 `updateAlignment()` 呼叫，只在 `_postBuildPass` 統一執行。

**預估效果**：每個有 Widget 的節點省 1 次 layout 計算，總計省 ~3ms。

### 16.3 Draw Call 優化

#### skinLayers 的自動合批

新增 `skinLayers` 後，一個面板會有 3~4 個 Sprite 子節點。
Cocos 2D 的 auto-batch 在**同 atlas + 相鄰兄弟**的條件下才生效。

**建議**：
- 同一個面板的所有 skinLayers 使用**同一張 Auto Atlas**，確保合批
- `composite-image` 的 8 個 layer 同理，全部打包到同一張 Atlas
- 在 `validate-ui-specs.js` 新增 R24 規則：skinLayers 的所有 slot 必須屬於同一 Atlas

#### 渲染順序優化

```typescript
// 在 _postBuildPass 中，將相同 Atlas 的節點調整為相鄰 siblingIndex
// 以最大化 auto-batch 效果
private _optimizeRenderOrder(parent: Node): void {
    const children = [...parent.children];
    children.sort((a, b) => {
        const aAtlas = a.getComponent(Sprite)?.spriteFrame?.texture?.name ?? '';
        const bAtlas = b.getComponent(Sprite)?.spriteFrame?.texture?.name ?? '';
        return aAtlas.localeCompare(bAtlas);
    });
    children.forEach((c, i) => c.setSiblingIndex(i));
}
```

> ⚠️ 此優化只適用於 z-order 無關的平級節點（如 skinLayers 的背景層之間）。
> 對有明確疊加順序的節點不可重排。

### 16.4 效能 Budget

| 指標 | Budget | 當前估算 | 目標 |
|------|--------|----------|------|
| buildScreen 總時間 | ≤ 50ms | ~160ms | 方案 A+B+E → ~25ms |
| 首次 switchSlot 時間 | ≤ 30ms | ~80ms（新建） | 方案 A → ~15ms |
| 重複 switchSlot 時間 | ≤ 5ms | ~80ms（重建） | 方案 C → ~1ms |
| 節點總數（GDO 畫面） | ≤ 35 | ~80 | skinLayers + lazy → ~30 |
| Draw Call（GDO 畫面） | ≤ 15 | ~40 | Atlas 合批 → ~12 |

> Budget 數值以強制規則收錄在 [UCUF規範文件.md §2](UCUF規範文件.md#2-效能-budget) (doc_ui_0026)。

### 16.5 Runtime 效能監控（🟡 部分）

在 `UCUFLogger` 新增 `performance` 分類：

```typescript
// CompositePanel.mount() 內部
const t0 = performance.now();
await this.buildScreen(layout, skin, i18n, tokens);
const buildMs = performance.now() - t0;
UCUFLogger.info('performance', `buildScreen "${screenId}" — ${buildMs.toFixed(1)}ms, ${nodeCount} nodes`);

if (buildMs > 50) {
    UCUFLogger.warn('performance', `buildScreen 超過 50ms budget: ${buildMs.toFixed(1)}ms`);
}
```

---
