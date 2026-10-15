# 0134：來源限流，停止重爬

- 最新 origin/master：4f07b2c6965c1b44fbc711c2d82ef5a8111cfccc；實際執行 HEAD 與 ingest 雜湊記於 refresh-report.json。
- 以正式 0805 的既有 audit 工具重建清單，正好 24 筆 historicalAnecdote 疑似截斷，全部能對應既有 ingest 種子；未自行新增人物或猜 lore。
- 一般連線探測 HTTP 200。使用現有代理／網路設定，沒有清除 proxy 變數或指定繞過選項。
- 實際逐筆請求在第 12 筆 liu-yan 遇 HTTP 429，立即停止，沒有重試、換站或改路由。
- 已取得 11/24，既有 ingest 的 mapToGeneralBase／句末截斷／消歧義規則原封使用；0 佔位、0 已觀測品質不符；另 13 筆未完成，品質未知。
- 原快取不存在，移除既有快取 0 筆；只建立這次取得的 11 個目標快取鍵，未碰其他人物快取。
- 正式 generals-lore.json 替換 0 筆、差異 0；全部 24 筆正式 lore 保持原狀。候選 11 筆只放在 candidates.json，不能冒充完整入庫。
- 不宣稱完整 master 的 Cocos 驗收通過；本輪為資料來源與指定資料重爬，原始頁面回應僅留 SHA256 與 URL 收據。
- 完整 24 筆驗收未通過。需等待來源解除限流後，在原卡範圍續做；本輪不以新截斷規則或手寫文字補足。
