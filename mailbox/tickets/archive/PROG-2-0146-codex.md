# 工單 PROG-2-0146：實機驗收「年報畫面彈出與內容」
- 派給：Codex
- 任務卡：docs/agent-briefs/tasks/PROG/PROG-2-0146.md（已在 master 登錄，PR #568 已合併）
- 依賴：PR #563（已合併）、PROG-2-0820
- 類型：acceptance（實機驗收）
- 狀態：ATM 活動任務 TASK-TEAM-0088 解除前暫擱

## 步驟
1. 用最新 master 建置 Web 版，記下 HEAD。
2. 推進遊戲時間到年末，確認年報畫面彈出；無法推進時記為暫停，不判通過。
3. 依任務卡步驟檢查標題「{Year} 年度總結」、本年歿與退役候選數字、關閉鈕與版位，逐步截圖。
4. PR 說明寫明 Before/After 與 HEAD。

## 不要做
- 不使用緊急授權、Quick Fix 或 backend import。
- 不改程式碼；不符時只回報截圖、數字與 HEAD。
