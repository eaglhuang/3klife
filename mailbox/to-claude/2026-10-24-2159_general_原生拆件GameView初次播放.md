# 原生拆件樣機：Game View 實際播放進度

2026-10-24

- 已在既有 Creator 3.8.8 將預覽目標切到 `ChibiCutoutNativePoC`；先前畫面其實是 `AnimationPipelineRigbyPreview`。
- 找到測試場景 Canvas 未指派 Camera；補上正交 `PuppetPreviewCamera` 並指派後，Game View 顯示趙雲，FPS 30。
- 間隔截圖可見槍角度、身體與手臂改變，攻擊循環正在播放。`getWeaponImpactCount` 取到的是 edit-scene 實例的 0，命中事件尚未取得 runtime 證據。
- 畫面仍見綠邊，需判定是色鍵邊緣或選取描邊；2D 專家已受託只讀檢視接點與最小修正方向。
- 目前屬技術樣機，未宣稱動畫驗收完成；主工作樹保留未提交變更，未提交 PR。
