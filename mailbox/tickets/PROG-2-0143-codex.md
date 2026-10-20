# 工單 PROG-2-0143：實機驗收「出征編制「儲存預設」「套用預設」」
- 派給：Codex
- 任務卡：docs/agent-briefs/tasks/PROG/PROG-2-0143.md（已在 master 登錄，PR #557 已合併）
- 依賴：#538（已合併）、PROG-2-0784
- 類型：acceptance（實機驗收）
- 狀態：ATM 活動任務 TASK-TEAM-0088 解除前暫擱

## 步驟
1. 用最新 master 建置 Web 版，記下 HEAD。
2. 開啟出征編制，分別點「儲存預設」與「套用預設」，驗證存、套用與重開後保留。
3. 依任務卡步驟截圖，PR 說明寫明 Before/After 與 HEAD。

## 不要做
- 不使用緊急授權、Quick Fix 或 backend import。
- 不改程式碼；不符時只回報截圖與 HEAD。
