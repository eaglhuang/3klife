---
name: gotcha-atm-two-captain-concurrency
description: 雙隊長同工作樹並行——lease TTL、對方 staged 檔、repair-claim diagnose-first 三守則
type: gotcha
updated: 2026-07-13
repo: AI-Atomic-Framework
status: active
---

# 雙隊長並行守則（2026-07-12/13 與 codex-backlog-captain 12 小時實戰）

1. **lease TTL 約 30 分鐘**：等外部事件（對方 commit window）時沒 heartbeat，
   claim 會被清或被接手。繼續前先重 claim，別假設還是自己的。
2. **對方 staged 檔會擋 close-window**（`ATM_TASKFLOW_CLOSE_INDEX_NOT_ISOLATED`）：
   `--defer-foreign-staged` 只涵蓋治理 bundle 殘留，蓋不住無法歸屬的 staged
   source。最後手段是可逆 park：`git diff --cached --name-only` 存快照 →
   `git restore --staged <files>` → close → `git add` 還原。**絕不丟棄對方內容**。
3. **repair-claim 是 diagnose-first**：它判「valid active claim; repair is
   blocked」就代表那是別人的活工作不是殘骸——不搶，協調或等待。
4. close-write rollback 後，自己任務的 evidence 可能變「無主殘留」擋自己下一次
   commit——release 再 claim 一次即恢復 ownership 證明。
