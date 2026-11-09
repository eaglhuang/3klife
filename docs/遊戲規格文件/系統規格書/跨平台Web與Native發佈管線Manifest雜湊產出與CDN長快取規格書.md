<!-- doc_id: doc_spec_0659 -->
# 跨平台Web與Native發佈管線Manifest雜湊產出與CDN長快取規格書

> **所屬模組**：`3.6 數值、架構與底層支援 (HOT-04 / HOT-05)`  
> **單一真相來源**：定義 Web 與原生（Native）雙平台發佈管線、資產 MD5 雜湊檔名、CDN 邊緣快取策略，以及 `version.manifest` / `project.manifest` 產出工具協議。

---

## 1. 雙平台發佈架構與快取策略

針對 Web（瀏覽器/H5）與 Native（iOS/Android 原生），採用差異化之快取與增量同步架構：

```
+-----------------------------------------------------------------------+
|  [發佈輸出目錄: build/]                                               |
|     |                                                                 |
|     +---> [Web 發佈管線]                                              |
|     |       - 檔名 MD5 Cache-Busting (如: main.8a3f9c.js)             |
|     |       - index.html 強制 no-cache (永遠取得最新入口)             |
|     |       - 靜態資源 CDN 1 年長快取 (max-age=31536000, immutable)    |
|     |                                                                 |
|     +---> [Native 發佈管線]                                           |
|             - tools_node/build-manifests.js 自動掃描目錄               |
|             - 產出 version.manifest (精簡版號與遠端 URL)              |
|             - 產出 project.manifest (全資產相對路徑、MD5、size 表)    |
|             - 上傳至 CDN /hotupdate/{platform}/{version}/             |
+-----------------------------------------------------------------------+
```

---

## 2. Web 發佈管線與 CDN 快取標頭規範

Web 端利用 HTTP 協定與 CDN 邊緣節點實現極速載入與零快取殘留更新：

| 檔案類型 | 檔名規則 | Cache-Control 標頭 | 說明 |
|:---|:---|:---|:---|
| **入口檔案** (`index.html`) | 固定檔名 | `no-cache, no-store, must-revalidate` | 確保每次訪問皆向 CDN 驗證最新 HTML |
| **程式腳本** (`.js`, `.wasm`) | `[name].[hash:8].js` | `public, max-age=31536000, immutable` | 內容變更時雜湊變化，享 1 年長快取 |
| **圖集資產** (`.png`, `.jpg`) | `[hash:8].[ext]` | `public, max-age=31536000, immutable` | 完全透過雜湊指向，免去重複下載 |
| **配置清單** (`settings.json`)| `settings.[hash:8].json` | `public, max-age=86400` | 1 天快取，由 index.html 引用最新位址 |

---

## 3. Native 原生雙 Manifest 檔案契約

原生端透過 Cocos `AssetsManager` 執行熱更，必須具備兩個標準 Manifest 檔案：

### 3.1 `version.manifest`（極小輕量檔，專供快速版號檢測）
```json
{
  "packageUrl": "https://cdn.3klife.com/hotupdate/android/",
  "remoteManifestUrl": "https://cdn.3klife.com/hotupdate/android/project.manifest",
  "remoteVersionUrl": "https://cdn.3klife.com/hotupdate/android/version.manifest",
  "version": "1.5.0",
  "engineVersion": "3.8.8"
}
```

### 3.2 `project.manifest`（全量資產清單）
```json
{
  "packageUrl": "https://cdn.3klife.com/hotupdate/android/",
  "remoteManifestUrl": "https://cdn.3klife.com/hotupdate/android/project.manifest",
  "remoteVersionUrl": "https://cdn.3klife.com/hotupdate/android/version.manifest",
  "version": "1.5.0",
  "engineVersion": "3.8.8",
  "assets": {
    "src/bundle-battle.js": {
      "size": 154200,
      "md5": "d41d8cd98f00b204e9800998ecf8427e"
    },
    "assets/battle_assets/native/8a/8a3f9c.png": {
      "size": 420800,
      "md5": "c4ca4238a0b923820dcc509a6f75849b"
    }
  },
  "searchPaths": []
}
```

---

## 4. 自動化構建工具契約（CI/CD Pipeline）

構建腳本 `tools_node/build-manifests.js` 於打包後自動執行：
1. **輸入參數**：`--buildDir <path>`、`--version <semver>`、`--cdnUrl <url>`。
2. **MD5 掃描**：遞迴遍歷 `build/` 內所有二進位檔案，以 Crypto SHA256/MD5 生成簽章，排除 `.DS_Store` 與暫存日誌。
3. **驗證防呆**：
   - 確保所有輸出檔案體積非 0；
   - 確保 `version.manifest` 與 `project.manifest` 兩者之 `version` 完全一致；
   - 自動將兩個檔案輸出至 Native 構建之 `assets/` 根目錄，作為本機基準清單。
