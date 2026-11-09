<!-- doc_id: doc_spec_0683 -->
# 3KLife 客戶端資料同步安全傳輸HTTPS強制與個人隱私PII遮蔽過濾規格書

> **規格代碼**：SPEC-NET-SYNC09  
> **關聯 WBS**：SYNC-09（M11 同步安全規範：HTTPS 強制、PII 過濾 Action_Records、dev 例外）  
> **文件版本**：v1.0.0 (單一真相來源，無補丁整併版)  
> **所屬系統**：數值、架構與底層支援（Formula, Architecture & Backend）

---

## 1. 核心宗旨與設計哲學

客戶端在與後端同步存檔快照（`save_snapshots`）與行動日誌（`Action_Records`）時，承載著玩家長期累積之遊戲進度與操作流水。為防止中間人攻擊（MITM）與資料竊聽，並恪守國際隱私權法規（GDPR、CCPA 與個人資料保護法），本規格書建立**安全傳輸層 HTTPS 強制約束**與**前端個人隱私識別碼（PII）主動遮蔽過濾機制**。

---

## 2. 安全傳輸層約束與開發期例外規範

### 2.1 傳輸加密硬性約束

1. **生產環境（Production）**：
   - 所有 `/sync/delta`、`/sync/full` 與設定檔拉取請求，通訊協議必須為 `HTTPS`（TLS 1.2 / TLS 1.3）。
   - 客戶端在發起連線前自動檢查 URL 協議頭，若非 `https://` 開頭，`SyncManager` 立即拋出 `CRITICAL_INSECURE_CONNECTION` 異常並中斷連線，嚴禁發送任何資料。
2. **開發期例外條款（Development Exception）**：
   - 僅當編譯環境常數 `CC_DEBUG === true` 或 `process.env.NODE_ENV === 'development'`，且目標伺服器主機名嚴格匹配 `localhost` 或 `127.0.0.1` 時，允許以 `http://` 協議進行本機聯調。
   - 任何局域網 IP（如 `192.168.x.x`）在發佈建置中一律禁用 HTTP。

---

## 3. 個人隱私資訊 (PII) 前端過濾機制

在封包進入 gzip 壓縮與上傳前，`SyncManager` 必須調用 `PiiMaskingFilter` 針對 `Action_Records` 進行即時過濾：

| 規則編號 | 敏感資料類型 | 偵測特徵 (Regex Pattern) | 遮蔽與脫敏處置 (Sanitization) |
|---|---|---|---|
| **P-01** | **本機檔案系統路徑** | `[A-Za-z]:\\[Users|Documents]\\...` 或 `\/Users\/[^\/]+` | 統一替換為字串 `[LOCAL_PATH_REDACTED]`，杜絕洩漏玩家作業系統帳號。 |
| **P-02** | **真實硬體唯一識別碼** | 原始 MAC 地址、原始 IMEI、IDFA | 禁止直接明文上報。強制以加鹽 SHA-256 轉化為 32 字元長度之 `pseudoDeviceId`。 |
| **P-03** | **真實 IP 與地理定位** | IPv4/IPv6 位址特徵、GPS 座標結構 | 前端日誌中強制剔除 `ip` 與 `coords` 欄位；地理歸屬一律由伺服端標頭推導國家碼。 |
| **P-04** | **玩家自訂輸入文字** | 玩家自訂自號、軍團公告、私聊訊息 | 送入同步日誌時強制過濾手機號碼、電子郵件格式，匹配成功自動置換為 `***`。 |

### 3.1 過濾介面資料結構

```typescript
export interface PiiSanitizationReport {
  timestamp: number;
  totalRecordsScanned: number;
  redactedPathCount: number;
  maskedSensitivePatternCount: number;
  hasInsecureProtocolBlocked: boolean;
  isClean: boolean;                   // 若有未授權 PII 殘留則為 false
}

export interface SyncSecurityPolicy {
  enforceHttps: boolean;              // 正式環境必為 true
  allowHttpForLocalhost: boolean;     // 僅 dev 模式生效
  piiMaskingEnabled: boolean;         // 必為 true
  saltVersion: 'v1_2026';             // 裝置 ID 雜湊鹽版號
}
```

---

## 4. 驗收測試案例 (Test Cases)

- **TC-SYNC-09-01【生產環境 HTTP 連線阻斷】**：在生產環境建置中，嘗試向 `http://api.3klife.game/sync` 發起請求，`SyncManager` 立即拒絕並回報安全錯誤，無網路封包發出。
- **TC-SYNC-09-02【檔案路徑自動脫敏檢驗】**：在崩潰或除錯日誌中包含 `C:\Users\JohnDoe\AppData\3KLife.log`，經 `PiiMaskingFilter` 處理後，上報字串轉為 `[LOCAL_PATH_REDACTED]\3KLife.log`。
- **TC-SYNC-09-03【裝置 ID 加鹽雜湊不可逆性】**：傳入測試硬體 MAC 地址，驗證輸出之 `pseudoDeviceId` 為標準 64 位元 Hex 雜湊，且重複運算結果具確定性。
