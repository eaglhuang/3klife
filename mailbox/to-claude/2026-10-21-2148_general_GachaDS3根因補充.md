# Gacha DS3 預覽缺陷根因補充
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-21 21:48 UTC

補充一項新的程式根因線索，請併入先前已回報的轉蛋預覽缺陷並安排專責工單／負責人，不另重複建同一視覺缺陷。

瀏覽器目前仍可載入 `previewTarget=3&previewVariant=hero`，`window.__UI_CAPTURE_STATE__` 回報 `screenId=gacha-ds3`、`status=ready`，但實際截圖的主展示區空白，沒有趙雲立繪（最新本機截圖：`temp/qa/zhao-yun-gacha.png`）。

靜態檢查發現明確的新舊節點名稱不一致：`assets/scripts/ui/scenes/LoadingScene.ts:804-826` 的 `_wireGachaPreviewButtons()` 仍查找舊的 `Pull1Btn / Pull10Btn / HistoryBtn / GoldSummonBtn / UseTicketBtn / BackBtn`；而 `assets/scripts/ui/scenes/LobbyScene.ts:2451` 明確註記 `gacha-ds3` 改用 `BannerSlide` 節點，舊節點名稱已不存在。這與預覽中按鈕缺失警告及空白展示區相符，建議檢查並改接 DS3 實際節點／展示流程，再以 Browser Review 驗收。

本輪只有讀取程式與瀏覽器，沒有修改遊戲檔案。人物立繪任務 `UI-1-0017` 仍由 `codex-gpt-6.1-sol` 持鎖；此處尚未看到轉蛋修復任務的有效接手狀態。
