# 大喬立繪與轉蛋預覽整合紀錄

## 美術方向

大喬新立繪以使用者提供、較滿意的女將參考圖為風格依據，保留粉白羽飾、銀藍甲片、長髮、羽扇與半寫實的中式奇幻筆觸；使用透明背景與新的全身構圖。趙雲沿用現有立繪，本卡不重製其造型；兩人並列預覽後再確認筆觸、光感、輪廓細節與色彩完成度是否一致。

生成工具：Codex 圖像生成工具（以使用者提供的大喬參考圖引導風格）。候選圖輸出為透明 PNG，1024×1536。完整 prompt 與原始候選稿保存在 `artifacts/ui-source/general-art/da-qiao/`；正式人物資產為 `assets/resources/sprites/generals/da_qiao_portrait.png`。

候選稿 prompt：

> Create a new original full-body character illustration of Da Qiao (大喬), an adult heroine from the Three Kingdoms era, using the user-provided image only as a style reference. Keep the polished semi-realistic Chinese fantasy game key art feeling: elegant facial features, flowing long dark hair, fine painterly details, graceful movement, pale rose and ivory feather accents, a translucent rose silk mantle, layered silver-blue scale armor with restrained gold filigree, and a refined feather fan. Give her a dignified, confident, gentle expression and modestly covered battle attire. Use a fresh pose and original composition: three-quarter view, standing, full figure from hair ornaments to both shoes visible, one hand holding an ornate fan near shoulder height, the other relaxed, clear readable silhouette, centered with generous transparent margins. Keep the palette soft rose, pearl white, cool silver-blue, and small antique-gold accents. High-quality hand-painted digital illustration, subtle atmospheric rim light on the character only. Transparent background, clean alpha edges. Exactly one character. No scenery, no floor, no shadow plane, no text, no calligraphy, no logo, no watermark, no frame, no cropped limbs, no extra fingers, no duplicate objects. Vertical portrait composition around 2:3 ratio, suitable for a Cocos Creator character portrait and a gacha banner overlay.

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
- 隔離工作目錄中的 Cocos Creator 資產刷新已成功。
- 2026-10-22：瀏覽器捕捉在等待 `__UI_CAPTURE_STATE__` 時逾時；四張遊戲畫面與風格一致性尚未完成正式驗收。
- 完成驗收後，將四張截圖存入 `artifacts/ui-qa/UI-2-0114/`，並補記角色是否清楚可見、構圖裁切、文字與風格一致性的實際觀察。
