<!-- doc_id: doc_spec_0661 -->
# Minor次版熱更雙進度條UI互動與Patch補丁靜默驗證規格書

> **所屬模組**：`3.6 數值、架構與底層支援 (HOT-08 / HOT-06)`  
> **單一真相來源**：定義 Minor 次版熱更新之雙進度條 UI 介面契約、即時下載速率與剩餘時間演算，以及 Patch 輕量補丁之無感靜默驗證協議。

---

## 1. 雙軌熱更呈現模式分類

依據差異更新之封包體積與檔案規模，自動分流為兩種呈現體驗：

```
                    [檢查更新完成: 獲取差異清單]
                                |
               [總體積 < 5MB 且 檔案數 < 20 ?]
                 /                           \
               [是]                         [否]
                |                             |
      [模式 A: Patch 靜默補丁模式]   [模式 B: Minor 雙進度條介面]
      - 零彈窗、零干擾              - 顯示雙軌進度條 (檔案數+位元組)
      - 背景 1 秒內無感完成          - 顯示即時速率與預估剩餘秒數
      - 直接無縫進入遊戲大廳        - 支援非 Wi-Fi 流量警示
```

---

## 2. Minor 雙進度條 UI 介面架構

Minor 版本涉及大型資產（如新地圖、新角色資源，體積介於 5MB ~ 150MB）時，開啟標準熱更介面：

```
+-------------------------------------------------------+
|                 正在載入三國世界資源...                |
+-------------------------------------------------------+
|  檔案進度:  [===================>         ]  64 / 120 |
|                                                       |
|  下載總量:  [=============>               ]  42%      |
|             ( 42.0 MB / 100.0 MB )                    |
|                                                       |
|  當前下載速率: 2.4 MB/s           預估剩餘時間: 24 秒   |
+-------------------------------------------------------+
|  [提示] 建議在 Wi-Fi 環境下進行更新以節省流量。       |
+-------------------------------------------------------+
```

### 2.1 行動網路流量防呆警告
- 若偵測當前網路為行動蜂巢網路（4G/5G）且 `TotalBytes > 30MB`，彈出對話框：
  `「偵測到您正在使用行動網路，本次更新需下載約 {sizeMB} MB 資源，是否繼續下載？」`
- 提供【使用行動網路下載】與【稍後在 Wi-Fi 下載（暫停並退出）】兩個選項。

---

## 3. 即時下載速率平滑演算法與 ETA 估算

為避免進度文字頻繁抖動，下載速率採指數移動平均（EMA, $\alpha = 0.3$）平滑處理：

$$\text{InstantSpeed} = \frac{\Delta \text{Bytes}}{\Delta t}$$
$$\text{SmoothedSpeed}_t = 0.3 \times \text{InstantSpeed} + 0.7 \times \text{SmoothedSpeed}_{t-1}$$
$$\text{ETA (Seconds)} = \left\lceil \frac{\text{TotalBytes} - \text{DownloadedBytes}}{\max(1024, \text{SmoothedSpeed}_t)} \right\rceil$$

- **時間顯示格式**：
  - $\text{ETA} < 60$ 秒：顯示 `剩餘約 {N} 秒`；
  - $\text{ETA} \ge 60$ 秒：顯示 `剩餘約 {M} 分 {S} 秒`。

---

## 4. Patch 補丁靜默驗證協議（Silent Patch Mode）

當 `TotalBytes < 5MB` 且 `TotalFiles < 20` 時，啟動靜默更新模式：
1. **介面行為**：
   - 保持遊戲啟動初始畫面（如開發商 Logo 或預設載入插圖），不渲染熱更進度條面板；
   - 底部載入轉圈維持低頻旋轉。
2. **時效約束**：
   - 靜默下載與驗證總耗時必須控制在 **1.2 秒以內**；
   - 驗證完成後立即在背景更新 `SearchPaths` 並直接進入遊戲大廳，玩家體感為正常載入，達成真正之「零感知熱修復」。

---

## 5. UI 資料契約型別

```typescript
export interface HotUpdateProgressState {
  mode: "SILENT" | "EXPLICIT_UI";
  totalFiles: number;
  completedFiles: number;
  totalBytes: number;
  downloadedBytes: number;
  smoothedSpeedBytesPerSec: number;
  etaSeconds: number;
  isCellularNetwork: boolean;
}
```
