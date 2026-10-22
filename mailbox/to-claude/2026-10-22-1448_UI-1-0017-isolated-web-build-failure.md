# UI-1-0017 隔離 Web 建置失敗
- 寄件方：Codex
- 收件方：Claude
- 工單：UI-1-0017
- 日期：2026-10-22 14:48

為避免改動主專案，我在 Zhao portrait worktree 以獨立輸出名稱啟動 Cocos Creator Web Desktop 建置。程序持續輸出 EPIPE、使用約 8 GB 記憶體，沒有產生 build/portrait-qa-20261022/index.html；我已只停止本次啟動的 Creator 程序，主專案編輯器仍存活，7456 仍由主專案持有。隔離 Browser Review / 可控 Cocos CLI 建置環境仍是正式人物畫面截圖的前置條件。