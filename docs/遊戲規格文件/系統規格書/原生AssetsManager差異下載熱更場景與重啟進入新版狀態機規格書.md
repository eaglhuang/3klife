<!-- doc_id: doc_spec_0660 -->
# 原生AssetsManager差異下載熱更場景與重啟進入新版狀態機規格書

> **所屬模組**：`3.6 數值、架構與底層支援 (HOT-06 / HOT-05)`  
> **單一真相來源**：定義原生端（iOS / Android）`HotUpdateScene` 架構、Cocos 原生 `AssetsManager` 事件監聽與差異下載狀態機、下載失敗重試，以及校驗通過後注入搜尋路徑並觸發 `cc.game.restart()` 之標準時序。

---

## 1. 原生熱更新執行環境與目錄結構

原生環境中，更新資產儲存於設備可寫目錄，優先級高於 App 安裝包內之原始資產：

```
+-------------------------------------------------------------------------+
|  [設備可寫目錄 (Writable Path)]                                          |
|  `${jsb.fileUtils.getWritablePath()}3klife_remote_assets/`               |
|     ├── project.manifest  (最新已下載清單)                              |
|     ├── version.manifest  (最新已下載版號)                              |
|     ├── src/              (更新之 JS 腳本)                              |
|     └── assets/           (更新之圖集、Prefabs、音效)                   |
+-------------------------------------------------------------------------+
|  [App 安裝包內置目錄 (App Bundle Assets)] (只讀，不可變)                  |
|     └── assets/ ... (出廠預設資產)                                       |
+-------------------------------------------------------------------------+
```

---

## 2. 差異下載熱更狀態機（HotUpdateStateMachine）

原生 `HotUpdateScene` 由以下確定性狀態機驅動：

```
                  [進入 HotUpdateScene]
                            |
             [初始化 jsb.AssetsManager]
                            |
                [狀態 1: CHECKING 檢查更新]
                 /                      \
      [無新版本 / ALREADY_UP_TO_DATE]    [發現新版本: UPDATE_AVAILABLE]
              |                                 |
       [直接進入登入/大廳]            [狀態 2: DOWNLOADING 差異下載]
                                                |
                                      [即時回報檔案與位元組進度]
                                                |
                                      [下載異常: UPDATE_FAILED ?]
                                        /                  \
                                     [是]                  [否]
                                      |                      |
                            [調用重試 (最多 3 次)]   [狀態 3: UPDATE_FINISHED]
                                                             |
                                                   [寫入 SearchPaths 首位]
                                                             |
                                                   [調用 cc.game.restart()]
```

### 2.1 事件對應處理矩陣
| AssetsManager 事件碼 | 內部狀態流轉 | 處理行為 |
|:---|:---|:---|
| `NEW_VERSION_FOUND` | `UPDATE_AVAILABLE` | 取得需下載之總檔案數與總位元組體積，通知 UI 顯示進度條 |
| `ALREADY_UP_TO_DATE` | `UP_TO_DATE` | 釋放 AssetsManager 實體，跳轉進入 `LobbyScene` |
| `UPDATE_PROGRESSION` | `DOWNLOADING` | 計算 `percentFiles` 與 `percentBytes`，更新進度條與下載速率 |
| `ASSET_UPDATED` | `DOWNLOADING` | 單一檔案下載驗證成功，累計已下載位元組 |
| `ERROR_DOWNLOAD_MANIFEST` | `CHECK_FAILED` | 清單下載超時，提示使用者檢查網路並提供重試按鈕 |
| `UPDATE_FINISHED` | `COMPLETED` | 進入原子寫入與重啟流程 |
| `UPDATE_FAILED` | `RETRYING` | 自動調用 `am.downloadFailedAssets()` 進行斷點補抓 |

---

## 3. 重試限制與斷點續傳容錯

1. **有限重試機制**：
   - 遭遇單檔下載逾時或 MD5 校驗不符時，系統自動發起重試；
   - 重試上限為 **3 次**；
   - 若重試 3 次後仍有檔案缺失，彈出對話框：`「資源下載失敗，請確認網路連線是否暢通」`，提供【重試】與【進入遊戲（可能缺少部分新資源）】雙按鈕。
2. **斷點續傳保護**：
   - 已成功下載並通過 MD5 校驗之資產直接寫入磁碟，重試或重新啟動時無需重新下載。

---

## 4. 搜尋路徑注入與重啟協議

在觸發 `UPDATE_FINISHED` 時，必須將可寫目錄注入至搜尋路徑最前端，並調用引擎重啟：

```typescript
export function finalizeHotUpdateAndRestart(): void {
  // 1. 取得當前平台搜尋路徑
  const searchPaths = jsb.fileUtils.getSearchPaths();
  const storagePath = `${jsb.fileUtils.getWritablePath()}3klife_remote_assets/`;

  // 2. 確保更新目錄置於陣列第 0 位 (最高覆蓋優先級)
  const newPaths = [storagePath, ...searchPaths.filter(p => p !== storagePath)];
  
  // 3. 本地持久化，確保冷啟動 main.js 能在第一時間讀取
  jsb.fileUtils.setSearchPaths(newPaths);
  cc.sys.localStorage.setItem("HotUpdateSearchPaths", JSON.stringify(newPaths));

  // 4. 重啟遊戲進程，清空 JS VM 進入新版代碼
  cc.game.restart();
}
```
