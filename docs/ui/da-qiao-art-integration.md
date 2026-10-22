# 大喬立繪與轉蛋預覽整合紀錄

## 美術方向

大喬新立繪以使用者提供、較滿意的女將參考圖為風格依據，保留粉白羽飾、銀藍甲片、長髮、羽扇與半寫實的中式奇幻筆觸；使用透明背景與新的全身構圖。趙雲沿用現有立繪，本卡不重製其造型；兩人並列預覽後再確認筆觸、光感、輪廓細節與色彩完成度是否一致。

生成工具：Codex 圖像生成工具（以使用者提供的大喬參考圖引導風格）。採用稿為透明 PNG，1024×1536。v1 因冷藍金屬色、暗部對比和厚重羽翼感偏離使用者偏好的柔粉白女將風格而淘汰；v2 改為柔光、象牙白與淡粉紗、輕盈羽飾，作為目前接入資產。原始候選稿保存在本機忽略路徑 `artifacts/ui-source/general-art/da-qiao/`；正式人物資產為 `assets/resources/sprites/generals/da_qiao_portrait.png`。

採用稿 prompt：

> Create a fresh original full-body illustration of Da Qiao for a Three Kingdoms fantasy game portrait. Use the attached image only as a style reference, not as a pose, costume, composition, watermark, or signature template. Match its gentle semi-realistic Chinese fantasy painting: soft painterly detail, luminous soft lighting, delicate facial rendering, elegant flowing long dark hair, graceful silhouette, pale ivory and blush-pink layered silk, light rose feather accents, subtle muted silver-blue scale armor, small antique-gold details, modest battle attire, refined feather fan. New standing three-quarter pose, centered with generous transparent margin, both shoes and entire figure visible, vertical 2:3. Truly transparent background, clean alpha, character only. Keep saturation and contrast soft; avoid dark cinematic scenery, hard rim light, heavy shadows, oversized wings, blue-dominant armor, text, watermark, logo, frame, cropped limbs, extra fingers, or duplicate objects.

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
- 隔離工作目錄中的 Cocos Creator 資產刷新已成功。
- 2026-10-22：瀏覽器捕捉在等待 `__UI_CAPTURE_STATE__` 時逾時；四張遊戲畫面與風格一致性尚未完成正式驗收。
- 完成驗收後，將四張截圖存入 `artifacts/ui-qa/UI-2-0114/`，並補記角色是否清楚可見、構圖裁切、文字與風格一致性的實際觀察。
