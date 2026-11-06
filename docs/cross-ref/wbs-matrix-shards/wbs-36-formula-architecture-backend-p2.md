# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.6 數值架構底層（2/4）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.6 數值架構底層（2/4）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.6 6. 數值、架構與底層支援 (Formula, Architecture & Backend) · 第 2/4 段

> 續上段（表頭重複）。工作包 SYNC-01 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **SYNC-01** | M11 | API 契約型別與 JSON Schema（delta/full 請求回應、錯誤碼表 E001~E099） | data | 2 | 📄 僅資料 | - | client 與 server 共用契約檔，SyncContract 測試比對 fixture 通過 | 整合樹 server/smoke-fixtures/sync-request.valid.json；assets/scripts/core/systems/SyncManager.ts 內 interface；無共用契約檔、無 E 碼 |  |
| **SYNC-02** | M11 | POST /sync/delta：baseHash 檢查、RFC6902 套用、行動重演、409 | server | 3 | ✅ 已驗收 | SYNC-01 | 合法 patch 回 200 並更新 hash；baseHash 不符回 409 | 整合樹 server/src/sync.ts；tests/SyncContract.test.ts（delta 套用與重演）；欄位名與規格不同 |  |
| **SYNC-03** | M11 | POST /sync/full：完整覆蓋、版本衝突 409 version_too_old、gzip Base64 | server | 2 | 🟡 純邏輯 | SYNC-01 | 全量上傳覆蓋快照；舊版存檔回 409/E006 | 整合樹 server/src/sync.ts（覆蓋已有；version_too_old 與 compressed 旗標無）；tests/SyncContract.test.ts fallback 測試 |  |
| **SYNC-04** | M11 | 認證：Bearer sessionToken、24h 輪換、deviceId 綁定、401 E003/E004 | server | 3 | 🟡 純邏輯 | SYNC-01 | 無效/過期 token 回 401 對應錯誤碼，換機 token 失效 | 整合樹 server/src/sync.ts authenticate（比對 Session_Secret，無 24h 輪換、無 deviceId 綁定、無 E 碼） |  |
| **SYNC-05** | M11 | 限流與大小限制：429 每分鐘 10 次、413 5MB compressed | server | 1 | ⚪ 未開始 | SYNC-02 | 第 11 次請求回 429/E008；超限 body 回 413/E007 | 無（僅 express.json limit 5mb） |  |
| **SYNC-06** | M11 | JSON Pointer 路徑白名單與 patch 驗證（E002） | server | 2 | ⚪ 未開始 | SYNC-02 | 白名單外路徑與非 RFC6902 patch 回 400/E002，附注入測試 | 無（整合樹 applyJsonPatches 未見白名單） |  |
| **SYNC-07** | M11 | 客戶端 SyncManager：delta 優先、409 fallback full、401 重驗、5xx 指數退避最多 3 次 | logic | 3 | ✅ 已驗收 | SYNC-02, SYNC-03 | 模擬 409/401/5xx 時流程符合 §6 並有測試 | master assets/scripts/core/systems/SyncManager.ts（retrySync 1/2/4s）；tests/SyncManager.test.ts；整合樹 tests/SyncContract.test.ts（fallback） |  |
| **SYNC-08** | M11 | 客戶端 gzip 請求壓縮與 compressed 旗標 | logic | 1 | 🟡 純邏輯 | SYNC-01 | 超過門檻的 body 以 gzip 傳輸，伺服器可解 | assets/scripts/core/systems/SyncManager.ts 批次上傳（actionRecordsCompressed，非規格的 Content-Encoding 路徑） |  |
| **SYNC-09** | M11 | 同步安全規範：HTTPS 強制、PII 過濾 Action_Records、dev 例外 | server | 1 | ⚪ 未開始 | SYNC-02 | 非 HTTPS 請求被拒（dev 除外），payload PII 檢查有測試 | 無 |  |
| **SYNC-10** | M0 | HTTP 同步整合 smoke 與 CI | test | 1 | 🟡 純邏輯 | SYNC-02 | npm run smoke:sync 在 CI 通過 | server/scripts/run-sync-smoke.js；server/smoke-fixtures/sync-request.valid.json（打舊版 POST /sync） |  |
| **HOT-01** | M11 | 版號策略與強更導流（Major 不可熱更、跳轉商店提示） | logic | 2 | ⚪ 未開始 | - | Major 版號不符時顯示商店導向彈窗並阻擋進入 | 無 |  |
| **HOT-02** | M11 | Save_Version 與 Server_Schema_Version 比對流程接入登入 | logic | 2 | 🟡 純邏輯 | HOT-01 | 登入後比對版本並觸發 MigrationService | assets/scripts/core/storage/SchemaMigration.ts（needsMigration/migrate；未接登入、未取 Server 版本） |  |
| **HOT-03** | M11 | Migration 腳本註冊慣例與逐版升級測試 | test | 2 | ⚪ 未開始 | HOT-02 | 每個 Schema 版本均有 migration 與前後 fixture 測試 | 無（tests/ 無 SchemaMigration 測試） |  |
| **HOT-04** | M11 | Web 發佈管線：MD5 Cache、CDN 長快取、index.html no-cache | tool | 3 | 📄 僅資料 | - | 建置輸出檔名含 hash，部署腳本設定 Cache-Control 並驗證 | 整合樹 tools_node/build-web.js；tools_node/run-web-smoke.js（未核對 MD5/Cache-Control） |  |
| **HOT-05** | M11 | Native 發佈管線：project.manifest/version.manifest 產生 | tool | 3 | ⚪ 未開始 | HOT-04 | CI 產出 manifest 且 MD5 與檔案一致 | 無 |  |
| **HOT-06** | M11 | HotUpdateScene 與 AssetsManager 差異下載、重啟（cc.game.restart） | ui | 4 | ⚪ 未開始 | HOT-05 | 實機模擬舊版包可下載差異並重啟進入新版 | 無（grep HotUpdate/AssetsManager 無命中） |  |
| **HOT-07** | M11 | Asset Bundle 切分（main/resources/lobby_ui/battle_assets）與 loadBundle 動態載入 | logic | 4 | 📄 僅資料 | - | 啟動場景不靜態參照戰鬥資源，bundle 清單通過檢查 | assets/scripts/battle/views/BattleSceneLoader.ts、core/systems/ResourceManager.ts 引用 loadBundle（bundle 配置未核對） |  |
| **HOT-08** | M11 | Minor 版更新進度條 UI（下載 25MB/100MB）與 Patch 靜默驗證 | ui | 2 | ⚪ 未開始 | HOT-06 | Minor 顯示進度條，Patch 1 秒內完成驗證 | 無 |  |
| **HOT-09** | M0 | 啟動場景靜態參照審計 lint（禁止 Start Scene 綁定核心戰鬥資源） | tool | 1 | ⚪ 未開始 | HOT-07 | compute-gate 掃描違規並失敗 | 無 |  |
| **GDP-01** | M0 | ingest-generals-wiki.js：Wiki 爬取、500ms 限速、wiki-cache、--limit/--dry-run | tool | 2 | ✅ 已驗收 | - | dry-run 不寫檔；實跑輸出 raw-wiki.json 結構符合規格且命中快取 | [v10 核對 2026-10-20] ingest-generals-wiki 爬取工具（0415、0807 完成，協調者確認）；IngestGeneralsWiki 與 GeneralDataPipelineE2E 測試覆蓋。CLI 入口，無其他腳本呼叫，若 PM 不以 CLI 入口計入，請降回已接線 |  |
| **GDP-02** | M10 | ingest-generals-ai.js：lore 欄位生成與單筆容錯 | tool | 2 | 🟡 純邏輯 | GDP-01 | 單筆失敗只 WARN 不中斷，輸出 historicalAnecdote/bloodlineRumor/storyStripCells | tools_node/ingest-generals-ai.js；assets/resources/data/master/generals-lore.json 235 筆 |  |
| **GDP-03** | M0 | merge-generals-master.js：以 id 合併、既有優先、自動後置驗證 | tool | 2 | ✅ 已驗收 | GDP-01, GDP-02 | 重跑合併不覆蓋手改資料並自動執行 validate | [v10 核對 2026-10-20] merge-generals-master 合併工具（0414 完成，協調者確認）；被 ingest-generals-ai.js 呼叫，MergeGeneralsMaster 與 E2E 測試存在 |  |
| **GDP-04** | M0 | validate-generals-data.js：R1~R7 驗證規則 | tool | 2 | 🟢 已接線 | - | 對違規 fixture 回報對應規則錯誤，現有資料 0 errors | tools_node/validate-generals-data.js（實跑 errors=0 warnings=0，235 筆；無反例測試）；tools_node/validate-general-data-tooling.js |  |
| **GDP-05** | M10 | 25 核心欄位補齊（title/bloodlineId/genes/awakeningTitle/skillId/parentsSummary/ancestorsSummary） | data | 4 | 🟢 已接線 | GDP-03 | master 全部 235 位具備 25 欄位且通過驗證 | [v16.8 核對 2026-10-28] master #1219–#1251 已接上（已接線）；待 QA／實機驗收 |  |
| **GDP-06** | M0 | master 資料集容量與覆蓋率（>=50 位、lore/story 100%、rarity/category 100%） | data | 1 | ✅ 已驗收 | GDP-04 | validate 輸出覆蓋率報告且皆達標 | assets/resources/data/master/generals-{base,lore,stories}.json 各 235 筆；rarityTier 與 characterCategory 缺漏 0；validate 實跑通過 |  |
| **GDP-07** | M0 | 稀有度雙軸計算（RarityResolver + rarity-thresholds）併入管線 | logic | 2 | 🟢 已接線 | GDP-04 | 管線以 maxStat/avg5 重算 rarityTier 與資料一致，legendary<20% | [v7 核對 2026-10-14] 稀有度雙軸計算併入資料管線（52bbc06b，PROG-2-0413） |  |
| **GDP-08** | M10 | 人工審核清單自動化（極值武將、tier 分布、亂碼截斷、重複 id、關鍵 25 位 lore） | tool | 2 | 🟡 純邏輯 | GDP-04 | 輸出審核報告列出 Top 屬性、分布與疑似亂碼 | [v9 核對 2026-10-15] 人工審核清單報告（3286288c，#442）；報告工具，無執行期呼叫端 |  |
| **GDP-09** | M10 | 故事條 6 格敘事連貫與 slot1-6 內容審核 | content | 5 | 🟡 純邏輯 | GDP-02 | 235 位 storyStripCells 均 6 格且通過人工抽查 | [v16.4 第三批核對 2026-10-27] master #1102–#1143 已接上（純邏輯）；待 QA／實機驗收 |  |
