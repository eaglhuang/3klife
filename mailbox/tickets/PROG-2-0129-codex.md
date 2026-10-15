# 工單 PROG-2-0129：實機驗收自動培育整季與培育畫面按鈕（#399）
- 派給：Codex
- 任務卡：docs/agent-briefs/tasks/PROG/PROG-2-0129.md（已在 master 登錄，PR #408 已合併）
- 依賴：PR #399（已合併）、PROG-2-0548、PROG-2-0549
- 類型：acceptance（只做實機驗收，不改 assets/scripts/core/**）

## 背景
GameSession.runAutoNurture 檢查解鎖與券數，扣 1 張自動培育券後跑完整季並寫回存檔。培育畫面的「自動培育整季」按鈕（btnAutoNurture）被擋下時顯示原因且不扣券。按鈕位置為暫定，需實機確認。

## 步驟
1. `git fetch origin`，用最新 master 建置 Web 版，記下 HEAD。
2. 子嗣培育中：「自動培育整季」可按；未培育時不可按。截圖。
3. 未通過主線培育季時按下：提示「尚未解鎖自動培育」，券數不變。截圖。
4. 已解鎖但券為 0：提示「沒有自動培育券」，券數不變。截圖。
5. 已解鎖且有券：券減 1，培育進入可畢業狀態，提示「自動培育完成（36 回合）」。截圖與券數前後對照。
6. 畢業後評級不得為 S（上限 A）。截圖。
7. 按鈕是否擠到「放棄培育」：若擠到，記錄截圖並回報，由 cc 端調整。
8. 離開再回來，券數與培育狀態保留。截圖。

## 驗收
- 步驟 1 到 8 皆有截圖或錄影；PR 說明寫明 Before/After 與 HEAD。
- 測試存檔可用 grantAutoNurtureTickets 給券，或把 mainlineNurtureClearedOnce 設為 true。
- 任一步不符：記錄現象與 HEAD，回報 PM 另開卡。

## 不要做
- 不使用緊急授權、Quick Fix 或 backend import。
