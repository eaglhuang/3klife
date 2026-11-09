<!-- doc_id: doc_spec_0687 -->
# 3KLife 客戶端AssetBundle模組切分標準與戰鬥資源動態異步載入規格書

> **規格代碼**：SPEC-ARCH-HOT07  
> **關聯 WBS**：HOT-07（M11 Asset Bundle 切分與 loadBundle 動態載入）  
> **文件版本**：v1.0.0 (單一真相來源，無補丁整併版)  
> **所屬系統**：數值、架構與底層支援（Formula, Architecture & Backend）

---

## 1. 核心宗旨與設計哲學

為確保遊戲啟動首包體積輕量（$\le 8\text{MB}$）、秒開進入遊戲，並防止長時間遊玩造成低階設備記憶體溢出（OOM），本規格書制定全專案**四大 Asset Bundle 邊界切分規範**與**戰鬥重型資源動態異步加載與卸載架構（Dynamic Bundle Lifecycle）**。

---

## 2. 四大 Asset Bundle 模組邊界劃分

所有專案資產目錄依業務邊界嚴格劃分至專屬 Bundle，禁止跨 Bundle 靜態循環依賴：

```
+-------------------------------------------------------------------------+
| Bundle 1: main          (首包啟動層，體積 <= 8MB，不可熱更)             |
+-------------------------------------------------------------------------+
| Bundle 2: resources     (全域共用層，通用音效/字型/i18n，常駐記憶體)    |
+-------------------------------------------------------------------------+
| Bundle 3: lobby_ui      (大廳介面層，角色/命鏡/抽卡/背包，登入後預加載) |
+-------------------------------------------------------------------------+
| Bundle 4: battle_assets (戰鬥核心層，Spine/地圖/技能特效，出征時動態載入)|
+-------------------------------------------------------------------------+
```

### 2.1 各 Bundle 細部約束表

| Bundle 名稱 | 對應工程路徑 | 加載時機 (Load Timing) | 記憶體駐留策略 (Memory Policy) | 體積預算 |
|---|---|---|---|---|
| **main** | `assets/scenes/StartScene` | 遊戲啟動時 Cocos 引擎原生載入 | 永遠常駐 | $\le 8\text{MB}$ |
| **resources** | `assets/resources/data`, `i18n` | 啟動場景初始化完成後 | 永遠常駐 | $\le 15\text{MB}$ |
| **lobby_ui** | `assets/bundles/lobby_ui` | 玩家成功登入並進入大廳前 | 大廳運行期常駐；進戰鬥可退至背景 | $\le 25\text{MB}$ |
| **battle_assets** | `assets/bundles/battle_assets` | 點擊「出征」並開啟 Loading 遮罩時 | **隨用隨載**；退出戰鬥立即完整卸載釋放 | $\le 45\text{MB}$ |

---

## 3. 動態異步加載管線與卸載契約 (Lifecycle Contract)

戰鬥場景資源加載嚴格依循三段管線：

```typescript
export interface BundleLoadOptions {
  bundleName: 'battle_assets' | 'lobby_ui';
  onProgress: (ratio: number, loadedBytes: number, totalBytes: number) => void;
  onComplete: (err: Error | null, bundle: any) => void;
  timeoutMs: 8000;                    // 超時門檻 8 秒
}

export interface BundleUnloadPolicy {
  bundleName: string;
  forceReleaseAllTextures: boolean;   // 是否釋放 bundle 內所有紋理
  preserveSharedAudio: boolean;       // 保留共用通用音效
}
```

### 3.1 出征進入與退出戰鬥資源釋放時序

1. **進入戰鬥時**：
   - 呼叫 `cc.assetManager.loadBundle('battle_assets')`，展示全屏水墨載入條。
   - 載入完成後預先實例化戰場 Prefab，平滑淡入戰場，防止戰鬥開打掉幀。
2. **退出戰鬥時**：
   - 清除戰場所有動態節點與 Spine 動畫。
   - 呼叫 `const bundle = cc.assetManager.getBundle('battle_assets'); bundle.releaseAll();`。
   - 調用垃圾回收觸發器，確保 VRAM 立即下降至進入戰鬥前之基線水位（$\le 120\text{MB}$）。

---

## 4. 驗收測試案例 (Test Cases)

- **TC-HOT-07-01【啟動首包體積硬約束】**：建置 Native 發佈包，審計 `main` Bundle 總大小為 $6.8\text{MB} \le 8.0\text{MB}$，合格通過。
- **TC-HOT-07-02【戰鬥資源異步進度條回報】**：模擬 3G 網路載入 `battle_assets`，`onProgress` 以 0.1 步進平滑回報至 1.0，UI 載入進度條流暢無卡頓。
- **TC-HOT-07-03【退出戰鬥記憶體完整回落】**：進入戰鬥時 VRAM 升至 165MB，退出戰鬥並執行 `releaseAll()` 後，VRAM 於 2 秒內回落至 98MB，無記憶體洩漏。
