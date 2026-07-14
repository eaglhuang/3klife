---
name: gotcha-atm-close-sequence
description: ATM 任務收口標準序——每步的失敗只會在下一步爆，跳步等於延後踩雷
type: gotcha
updated: 2026-07-13
repo: AI-Atomic-Framework
status: active
---

# ATM 收口標準序（約 20 次任務收口驗證，2026-07-12/13）

`next --claim`（**不帶** `--auto-intent`，會誤判成 closeout-only 導致
`ATM_GIT_COMMIT_CLOSEOUT_ONLY_MUTATION`）→ 實作 → validators 全綠 →
`node atm.mjs git commit --task <id> --defer-foreign-staged`（delivery）→
`ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build`（不帶 env 的 build 會被 hygiene
還原回 HEAD，runner 維持 stale）→ mirror sync commit（scope 允許時）→
`evidence run` 補齊全部 closure-required validators（close 隱含要求
`validate:cli` / `validate:git-head-evidence`，即使卡上沒寫）→
`taskflow close --defer-foreign-staged --historical-delivery <SHA> --write`
→ `broker release --task <id>`（漏這步：殘留 intent 以舊 base hash 擋下一張
卡的 claim，`ATM_BROKER_SHARED_QUEUE_BLOCKED`）。

**--historical-delivery 只放 source delivery commits**：混入 mirror-sync
commit 會觸發 `ATM_TASK_CLOSE_DELIVERABLE_DIFF_REQUIRED`。
