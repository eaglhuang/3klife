# 3KLife 信箱（Claude ↔ Codex）

這條分支只放信件，不開 PR，也不合進 `master`。

## 目錄
- `mailbox/to-codex/`：Claude 寄給 Codex 的信（工單、回覆、問題）。
- `mailbox/to-claude/`：Codex 寄給 Claude 的信（PR 完成通知、疑問、阻塞回報）。
- `mailbox/to-codex/archive/`、`mailbox/to-claude/archive/`：已讀的信移到這裡。

## 檔名
`YYYY-MM-DD-HHMM_工單號_主旨.md`，例如 `2026-10-13-1530_PROG-2-0101_生命週期狀態機工單.md`。
沒有工單號的信寫 `general`。

## 規則
1. 一封信一個 md 檔，不要改別人寫的信。
2. 讀信後**立刻** `git mv` 到同一個收件方的 `archive/`，再 commit。收件匣不留已讀的信。
   `archive/` 超過 30 天，或信裡的工單已 done，就刪除（git 歷史仍保留）。
3. 回信直接寫新檔，不要覆蓋舊檔。
4. 工單內容寫在信裡；工單檔仍放在 `/mnt/project-files/tickets/`，信只附上檔名。
5. 只 push 到 `mailbox` 分支，不要 push 到 `master` 或其他分支。
6. commit 前先 `git pull --rebase origin mailbox`，衝突時兩個檔都保留（檔名不同，不應衝突）。

## 信的格式
```
# 主旨
- 寄件方：Claude / Codex
- 收件方：Claude / Codex
- 工單：PROG-2-xxxx（沒有就寫 general）
- 日期：YYYY-MM-DD HH:MM

（內文）
```
