<!-- doc_id: doc_spec_0692 -->
# 3KLife 多平台Web與Native自動化建置腳本與環境變數注入規格書

> **規格代碼**：SPEC-OPS-CIBUILD01  
> **關聯 WBS**：CI-BUILD-01（多平台 Web / Native 自動化打包與環境變數注入）  
> **文件版本**：v1.0.0 (單一真相來源，無補丁整併版)  
> **所屬系統**：數值、架構與底層支援（Formula, Architecture & Backend）

---

## 1. 核心宗旨與設計哲學

本專案支援 Web-Mobile、Android 與 iOS 跨端發布。為杜絕手動點擊構建造成之環境設定遺漏、除錯密鑰外洩或快取殘留問題，本規格書制定命令列**無人值守自動化建置管線（Headless Build Pipeline）**、**環境變數隔離注入標準**與**產物完整性自動審計機制**。

---

## 2. 自動化建置管線四階段架構

建置腳本 `tools_node/build-cross-platform.js` 依序執行四個不可跳轉之階段：

```
+-------------------------------------------------------------+
| Phase 1: 前置閘門檢查 (Pre-Build Gate: compute-gate quick)   |
+-------------------------------------------------------------+
| Phase 2: 環境配置注入 (Environment Injection: build-env.json)|
+-------------------------------------------------------------+
| Phase 3: 引擎無頭編譯 (Cocos Creator CLI Headless Compile)   |
+-------------------------------------------------------------+
| Phase 4: 後置產物校驗 (Post-Build Audit & Manifest Pack)    |
+-------------------------------------------------------------+
```

### 2.1 環境變數三套模板與注入規範

| 環境代碼 (ENV) | API 伺服器網址 (API Endpoint) | 熱更伺服器 (HotUpdate URL) | 調試開關 (CC_DEBUG) | 符號表 (SourceMap) |
|---|---|---|---|---|
| **development** | `http://127.0.0.1:3000` | 本地測試路徑 | `true` | 保留 (上傳至本機除錯) |
| **staging** | `https://staging-api.3klife.game` | `https://staging-cdn.3klife.game` | `true` | 保留 |
| **production** | `https://api.3klife.game` | `https://cdn.3klife.game` | `false` (嚴格關閉) | 隔離歸檔，禁止打入發佈包 |

- **安全防禦機制**：在 `production` 模式下，腳本自動靜態掃描程式碼，若發現殘留未替換之 `localhost` 或明文 Secret，立即中斷建置並拋出安全告警。

---

## 3. 資料契約與產物報告規格

```typescript
export interface BuildConfig {
  targetPlatform: 'web-mobile' | 'android' | 'ios';
  environment: 'development' | 'staging' | 'production';
  buildVersion: string;               // 語意化版本號 (如 1.4.2)
  buildNumber: number;                // CI 遞增流水號 (如 1824)
  outputDirectory: string;            // 構建輸出路徑
  enableVramCompression: boolean;     // 是否啟用 ASTC/ETC2 紋理壓縮
}

export interface BuildArtifactReport {
  buildTimestamp: number;
  platform: string;
  totalPackageSizeBytes: number;
  mainBundleSizeBytes: number;        // 首包大小 (必須 <= 8MB)
  hasInsecureSecretLeaks: boolean;
  sha256Checksum: string;
  status: 'SUCCESS' | 'FAILED';
}
```

---

## 4. 驗收測試案例 (Test Cases)

- **TC-CI-BUILD-01-01【生產環境 Debug 開關防呆】**：執行 `node tools_node/build-cross-platform.js --platform web-mobile --env production`，驗證輸出產物中 `CC_DEBUG` 嚴格為 `false`，無控制台日誌洩漏。
- **TC-CI-BUILD-01-02【首包體積超限中斷】**：刻意在啟動場景綁定 10MB 戰鬥資源，後置審計檢查發現 `mainBundleSizeBytes > 8.0MB`，自動判定建置 `FAILED` 並阻斷發布。
- **TC-CI-BUILD-01-03【產物 SHA-256 簽名一致性】**：Android 發布產出之 AAB/APK 檔案，自動生成校驗報告與 SHA-256 簽名檔，供商店上架核對。
