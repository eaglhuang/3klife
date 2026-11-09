<!-- doc_id: doc_spec_0690 -->
# 3KLife 低階裝置記憶體洩漏監控TextureCache警戒線與自動GC觸發演算法規格書

> **規格代碼**：SPEC-PERF-QA01  
> **關聯 WBS**：QA-PERF-01（低階機型記憶體洩漏審計與 Texture GC 自動釋放）  
> **文件版本**：v1.0.0 (單一真相來源，無補丁整併版)  
> **所屬系統**：數值、架構與底層支援（Formula, Architecture & Backend）

---

## 1. 核心宗旨與設計哲學

為確保本遊戲在 3GB / 4GB RAM 低階行動設備上能長時間穩定運行，杜絕因未釋放紋理造成之作業系統強殺崩潰（OOM Crash），本規格書制定客戶端**記憶體哨兵（Memory Sentinel）監控模型**，設立**兩級動態警戒線**與**低延遲漸進式 Texture GC 自動釋放演算法**。

---

## 2. 兩級記憶體警戒線模型 (Two-Tier Threshold Model)

客戶端常駐輕量監控計時器（每 10 秒取樣一次），依據記憶體水位執行分級降載：

```
+-------------------------------------------------------------+
| 水位 2: 85% 警戒線 (Hard Critical)                          |
| 行動: 銷毀非活躍彈窗節點 + 釋放未引用 Bundle + 幀末非同步 GC |
+-------------------------------------------------------------+
| 水位 1: 70% 警告線 (Soft Warning)                           |
| 行動: 依 LRU 清除超過 180s 未引用之 TextureCache 紋理       |
+-------------------------------------------------------------+
| 安全運行區 (Normal Safe Zone: < 70%)                        |
| 行動: 正常合批渲染，不主動干預引擎 GC                       |
+-------------------------------------------------------------+
```

### 2.1 分級處置規則矩陣

| 警戒級別 | 觸發指標 (Trigger Metrics) | 處置動作 (Action Pipeline) | 畫面卡頓防護 (Jitter Protection) |
|---|---|---|---|
| **LEVEL_1 (Soft)** | 記憶體佔用 $\ge 350\text{MB}$ 或可用記憶體 $< 30\%$ | 遍歷 `cc.assetManager.assets`，依 LRU 釋放超過 180 秒無節點綁定之獨立 SpriteFrame。 | 分段清理，每幀釋放耗時嚴格限制 $\le 3\text{ms}$。 |
| **LEVEL_2 (Hard)** | 記憶體佔用 $\ge 480\text{MB}$ 或可用記憶體 $< 15\%$ | 1. 立即銷毀處於隱藏狀態之彈窗節點（`DialogPool`）。<br>2. 調用 `cc.assetManager.releaseUnusedAssets()`。<br>3. 於幀渲染完畢（`director.EVENT_AFTER_DRAW`）觸發垃圾回收。 | 嚴禁在玩家觸控拖拽或戰鬥動畫關鍵幀執行 GC。 |

---

## 3. 資料介面與釋放演算法契約

```typescript
export interface MemorySentinelPolicy {
  samplingIntervalSec: 10;            // 取樣間隔 10 秒
  softWarningThresholdMb: 350;        // 70% 警告線
  hardCriticalThresholdMb: 480;       // 85% 警戒線
  lruTextureTtlSec: 180;              // 非活躍紋理存活門檻 (180秒)
  maxReleaseTimePerFrameMs: 3.0;      // 單幀最大釋放時間，防止掉幀
}

export interface GcExecutionReport {
  timestamp: number;
  triggerLevel: 'SOFT' | 'HARD';
  memoryBeforeMb: number;
  memoryAfterMb: number;
  releasedTextureCount: number;
  executionDurationMs: number;
}
```

---

## 4. 驗收測試案例 (Test Cases)

- **TC-QA-PERF-01-01【Soft 警告線非活躍紋理回收】**：模擬玩家在背包面板瀏覽大量裝備與武將圖示後關閉背包，記憶體達到 360MB，哨兵啟動 Soft 清理，成功釋放 45 張未引用紋理，記憶體回落至 310MB，單幀耗時僅 2.1ms。
- **TC-QA-PERF-01-02【Hard 警戒線幀末安全回收】**：人為載入超大測試圖集使記憶體飆至 495MB，系統觸發 Hard 警戒，隱藏彈窗節點被主動釋放，並在 `EVENT_AFTER_DRAW` 執行回收，無戰鬥掉幀。
- **TC-QA-PERF-01-03【避免戰鬥中粗暴 GC 檢驗】**：當戰鬥奧義演出進行中即使觸發記憶體警告，哨兵自動延遲至回合結算或戰鬥淡出時執行 GC，杜絕技能動畫卡死。
