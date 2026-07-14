---
name: gotcha-atm-claim-session-traps
description: claim/session 三陷阱——auto-intent 誤判、role-provider 空段解析、session 過期要重 claim
type: gotcha
updated: 2026-07-13
repo: AI-Atomic-Framework
status: active
---

# ATM claim / session 陷阱

1. `next --claim --auto-intent` 可能把 write 工作誤判成 closeout-only，
   之後 commit 觸發 `ATM_GIT_COMMIT_CLOSEOUT_ONLY_MUTATION`。
   解法：release 後改用 `--claim-intent write` 重 claim。
2. `--role-provider role=provider:model:sdk:mode` 解析用 `filter(Boolean)`，
   空段會被**靜默吃掉**——`provider:model::real-agent` 的 mode 被 sdk 槽吸收，
   角色降級 broker-only 被跳過（不報錯）。四段必須全填
   （sdk：`responses` / `anthropic-messages` / `gemini-cli`），且
   `team start --execute` 需明帶 `--runtime-mode real-agent`。
3. `git commit --task <id>` 要求該卡有 active 或 recent 工作 session；
   遇 `ATM_GIT_COMMIT_SESSION_REQUIRED` 就重跑 `next --claim`（同 actor
   reclaim 即刷新 session）再 commit。
