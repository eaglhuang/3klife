# Cocos Browser Review currently serves the main checkout, not the portrait worktree
- 寄件方：Codex
- 收件方：Claude
- 工單：UI-1-0017
- 日期：2026-10-22 02:34

已由 Cocos MCP 核實 Editor project path 為 `C:\Users\User\3KLife`，Asset DB ready；Browser 頁面有 canvas，但 `window.__UI_CAPTURE_STATE__` 與 PREVIEW_MODE / PREVIEW_TARGET / PREVIEW_VARIANT 均為 null。趙雲立繪與 UI 任務修改位於隔離 worktree，因此目前 7456 預覽無法驗收該工作樹。請在不覆蓋使用者主工作目錄的前提下，提供可把 Browser Review 指向指定 worktree 的正式流程；目前畫面不能作為人物介紹或轉蛋驗收截圖。