<!-- doc_id: doc_spec_0689 -->
# 3KLife 原生差異下載熱更新ChunkSHA256零信任校驗與單檔斷點續傳規格書

> **規格代碼**：SPEC-OPS-HOT02  
> **關聯 WBS**：OPS-HOT-02（原生熱更新安全校驗與斷點續傳容錯）  
> **文件版本**：v1.0.0 (單一真相來源，無補丁整併版)  
> **所屬系統**：數值、架構與底層支援（Formula, Architecture & Backend）

---

## 1. 核心宗旨與設計哲學

原生行動端（Android / iOS）在執行熱更新差異下載時，常因行動網路抖動、CDN 污染或連線中斷導致資產包損毀。若損毀檔案直接混入本地搜尋路徑，將造成重啟後引擎黑屏或閃退（Fatal Crash）。本規格書建立**暫存隔離原子覆蓋**、**Chunk 級 SHA-256 零信任校驗**與**HTTP Range 單檔斷點續傳機制**，徹底杜絕壞檔重啟導致之死循環。

---

## 2. 暫存沙盒隔離與原子生效機制

所有差異下載之 Asset Bundle 檔案嚴禁直接寫入正式資產搜尋目錄，嚴格遵循三段隔離防線：

```
[CDN 遠端伺服器]
       |
       | (HTTP Range 斷點續傳下載)
       v
[防線 1: 沙盒暫存目錄] update_temp/bundle_name.bin.downloading
       |
       | (下載完成 -> 計算 SHA-256 -> 比對 Manifest 簽名)
       v
[防線 2: 零信任驗證] 一致則通過；不符則立即刪除暫存並計入失敗次數
       |
       | (原子重命名移動 File.renameTo)
       v
[防線 3: 正式資產路徑] update_storage/bundle_name.bin (搜尋路徑最優先)
```

### 2.1 零信任校驗規則

1. **雜湊比對**：下載完成後，原生層調用硬體加速之 SHA-256 演算法計算雜湊字串，比對 `project.manifest` 中對應檔案之 `sha256` 欄位（64 字元 Hex）。
2. **長度比對**：檔案實際 Byte 大小必須嚴格等於 Manifest 之 `size` 欄位。
3. **校驗失敗處置**：若任一項不符，立即拋出 `ASSET_CHUNK_CORRUPTED` 錯誤，刪除 `.downloading` 檔案，嚴禁寫入正式路徑。

---

## 3. 單檔斷點續傳與指數退避重試狀態機

```typescript
export interface ChunkDownloadTask {
  fileId: string;                     // 如 "bundles/battle_assets/general_spine.bin"
  expectedSha256: string;             // 64 位元 Hex 雜湊
  expectedSizeBytes: number;          // 期望大小
  downloadedBytes: number;            // 當前已下載位元組
  retryCount: number;                 // 當前重試次數 (上限 3 次)
  status: 'PENDING' | 'DOWNLOADING' | 'VERIFYING' | 'COMPLETED' | 'FAILED';
}
```

### 3.1 重試與斷點續傳策略

- **斷點續傳 (HTTP Range)**：當下載意外中斷時，重新發起請求並附帶 Header `Range: bytes={downloadedBytes}-`，自中斷點接續下載，不浪費玩家流量。
- **指數退避 (Exponential Backoff)**：
  - 第 1 次失敗：等待 $1.0\text{ 秒}$ 後重試。
  - 第 2 次失敗：等待 $2.0\text{ 秒}$ 後重試。
  - 第 3 次失敗：等待 $4.0\text{ 秒}$ 後重試。
  - 第 3 次仍失敗：狀態轉為 `FAILED`，暫停佇列並彈出「網路環境不穩定，是否重試當前檔案？」提示，杜絕重啟遊戲閃退。

---

## 4. 驗收測試案例 (Test Cases)

- **TC-OPS-HOT-01【損毀 Chunk 自動攔截與隔離】**：人為模擬注入被篡改之 SpriteFrame 檔案，系統比對 SHA-256 失敗，暫存檔被安全刪除，正式資產目錄未受污染。
- **TC-OPS-HOT-02【HTTP Range 斷點續傳檢驗】**：下載 10MB 之戰鬥 Bundle 在進度 4.5MB 時強制中斷網路，連線恢復後發送 `Range: bytes=4718592-`，成功接續下載剩餘 5.5MB 並通過校驗。
- **TC-OPS-HOT-03【3 次指數退避重試狀態轉移】**：模擬伺服器連續 3 次回傳 HTTP 500，客戶端依序於 1s、2s、4s 執行重試後進入 `FAILED` 狀態，彈出重試提示窗。
