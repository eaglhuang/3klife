# 大喬立繪與轉蛋預覽整合紀錄

## 美術方向

大喬新立繪以使用者提供、較滿意的女將參考圖為風格依據，保留粉白羽飾、銀藍甲片、長髮、羽扇與半寫實的中式奇幻筆觸；使用透明背景與新的全身構圖。趙雲沿用現有立繪，本卡不重製其造型；兩人並列預覽後再確認筆觸、光感、輪廓細節與色彩完成度是否一致。

生成工具：Codex 圖像生成工具（以使用者提供的大喬參考圖引導風格）。採用稿為透明 PNG，1024×1536。v1 因冷藍金屬色、暗部對比和厚重羽翼感偏離使用者偏好的柔粉白女將風格而淘汰；v2 調柔配色與光感；v3 保持粉白柔光，同時加強成年女將的腰臀曲線與豐滿胸型，作為目前接入資產。候選稿保存在本機忽略路徑 `artifacts/ui-source/general-art/da-qiao/`；正式人物資產為 `assets/resources/sprites/generals/da_qiao_portrait.png`。

採用稿 prompt：

> Create a new original full-body illustration of Da Qiao, clearly an adult heroine, for a Three Kingdoms fantasy game portrait. Use the attached image only as a style and body-proportion reference; do not copy its pose, costume details, composition, watermark, or signature. Match its gentle semi-realistic Chinese fantasy game painting: delicate facial rendering, luminous soft light, fine painterly details, graceful long dark hair, pale ivory and blush-pink silk, light rose feather accents, muted silver-blue armor details, small antique-gold filigree, refined feather fan. Give her a tasteful, appealing hourglass figure with a noticeably fuller bust, defined waist, and softly rounded hips, proportionate to an elegant adult heroine; keep her fully clothed in refined, modest battle attire with secure fabric coverage and no exposed cleavage. Fresh standing three-quarter pose with full body, head ornaments and both shoes visible, centered silhouette and generous margins, vertical 2:3. Truly transparent background and clean alpha edges, character only. Keep the color palette soft and feminine, with low-contrast luminous lighting. Avoid dark cinematic scenery, hard shadows, oversized armor, text, watermark, logo, frame, cropped limbs, extra fingers, or duplicate objects.

使用者已確認 v3 的成年女將曲線比例可作為遊戲女性角色的美術標準：胸型豐滿、腰線明確、臀部柔和圓潤，保持典雅、穿著完整，並依人物身分保留各自服裝、姿勢與辨識特徵；不要把個別角色畫成同一張臉或複製大喬造型。

## 頭像與匯入

立繪尺寸為 1024×1536；頭像裁切設定位於 `assets/resources/data/general-avatar-crops.json`，大喬使用 x=232、y=0、w=560、h=560，輸出 256×256。產生與驗證指令：

```powershell
node tools_node/generate-general-avatars.js da-qiao --verify
node tools_node/generate-general-avatars.js da-qiao
```

輸出頭像位於 `assets/resources/sprites/generals/avatars/da_qiao_avatar.png`。Cocos Creator 開啟此工作目錄後，對 `assets/resources/sprites/generals/` 執行 Refresh Assets，以建立或更新 PNG `.meta`。

## 人物介紹與轉蛋預覽

大喬在 `support-pool`，趙雲在 `hero-pool`。人物介紹的固定預覽 target 為 `GeneralDetailOverviewDaQiao` / `GeneralDetailOverviewZhaoYun`；轉蛋主頁的固定展示 target 為 `GachaSupportDaQiao` / `GachaHeroZhaoYun`。`support:da-qiao` 與 `hero:zhao-yun` 只供可重現的預覽選角，不改實際抽取邏輯。一般轉蛋展示仍可依既有輪播邏輯換人。

```powershell
node tools_node/capture-ui-screens.js --target GeneralDetailOverviewDaQiao --outDir artifacts/ui-qa/UI-2-0114 --url http://127.0.0.1:7457
node tools_node/capture-ui-screens.js --target GeneralDetailOverviewZhaoYun --outDir artifacts/ui-qa/UI-2-0114 --url http://127.0.0.1:7457
node tools_node/capture-ui-screens.js --target GachaSupportDaQiao --outDir artifacts/ui-qa/UI-2-0114 --url http://127.0.0.1:7457
node tools_node/capture-ui-screens.js --target GachaHeroZhaoYun --outDir artifacts/ui-qa/UI-2-0114 --url http://127.0.0.1:7457
```

## 視覺驗收紀錄

- 趙雲造型未重做；本卡只將現有趙雲立繪作為一致性對照。
- 2026-10-22：初版大喬候選與使用者偏好的女將參考圖並列後，確認初版冷藍金屬色、暗部對比偏重；已改採 v2 粉白柔光稿。趙雲保留原稿，等兩人實機預覽完成後再評估是否另開重製卡。
- 2026-10-22：依使用者補充的商業視覺偏好生成 v3，維持粉白柔光風格並加強成年角色的曲線與胸型；立繪角落 alpha=0、內部角色 alpha=252，頭像已重產並通過 verify。此版本仍待 125px 頭像縮圖與實機預覽驗收。
- 隔離工作目錄中的 Cocos Creator 資產刷新已成功。
- 2026-10-22：正式 Browser capture 已保存大喬與趙雲的人物介紹、轉蛋固定預覽四張截圖；另保存無固定角色指定的轉蛋首頁截圖，並在四次獨立載入中觀察到不同一般武將（曹操、郭嘉、周瑜、張飛），確認首頁預覽會隨機換人。人物與介面均可辨識，立繪全身落在橫幅人物展示區。
- 2026-10-22：使用隔離 `build/web-desktop` bundle 重試大喬轉蛋首頁預覽；因建置輸出預設開場仍是 BattleScene，只在忽略的建置輸出 `src/settings.json` 暫設 `LoadingScene` 作為預覽入口，未變更遊戲來源設定。`LoadingScene` 回報 `ready / gacha-ds3`、Browser Console errors=0；最新畫面另存為 `artifacts/ui-qa/UI-2-0114/captures/GachaSupportDaQiao-source-bundle-preview.png`。Creator 完整新建置尚未成功回報，因此這張是隔離 Web bundle 預覽證據，不取代正式 Creator rebuild 驗收。
- 驗收時發現 Creator 對 `GameDiv` 的 inline transform 會覆蓋樣式表定位，且 DS3 轉蛋 skin 的子節點 layer 與 UI Camera 不一致；已在 `LoadingScene.ts` 修正中心定位、面板顯示及預覽子樹 layer 對齊。
- 初期隔離資料目錄的 Creator CLI 嘗試曾中斷，當時曾以忽略的 `build/web-desktop` runtime patch 做預覽診斷；此為歷史中間結果，已由下方成功的 Creator Web Desktop build 與 source-build 截圖取代。
- 2026-10-22：使用 Creator 隨附 TypeScript 5.8.2 `transpileModule` 對本次三個修改腳本完成語法轉譯，均無語法錯誤；完整 `tsc --noEmit` 因 repo 設定要求 `ignoreDeprecations: 6.0`、而隨附編譯器為 5.8.2，並且生成型別宣告重複而無法作為有效專案型別檢查。
- 2026-10-22：Creator 3.8.8 Web Desktop 建置紀錄確認 `build task(web-desktop)` 成功（39,429ms）。隔離 bundle 的預覽入口只在忽略的 `build/web-desktop/src/settings.json` 暫設為 LoadingScene，來源設定未更動；五張 source-build 截圖（四張固定角色、一張不指定角色的隨機轉蛋首頁）均回報 `ready`、Browser Console errors=0，警告數與截圖 SHA-256 記在 `captures/source-build-capture-report.json`。驗收後已還原建置輸出的 launchScene 為 BattleScene。
- 2026-10-22：四張固定預覽目視檢查確認大喬粉白羽飾、扇與完整服飾在人物介紹及轉蛋展示均可辨識；趙雲沿用現有立繪，兩個畫面完整呈現且資料面板未遮擋人物。隨機首頁截圖顯示一般武將在同一轉蛋展示區呈現。
- 截圖路徑：`artifacts/ui-qa/UI-2-0114/captures/GeneralDetailOverviewDaQiao.png`、`GeneralDetailOverviewZhaoYun.png`、`GachaSupportDaQiao.png`、`GachaHeroZhaoYun.png`、`Gacha.png`。前三類固定 target 與隨機首頁的實際觀察已記錄；`capture-report.json` 保存捕捉資訊。
