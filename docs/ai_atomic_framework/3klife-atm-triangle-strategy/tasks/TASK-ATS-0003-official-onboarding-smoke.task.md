---
doc_id: doc_other_0233
task_id: TASK-ATS-0003
title: npc-brain official ATM onboarding smoke
owner: atm-core
priority: P0
status: completed
milestone: M2
related_plan: docs/ai_atomic_framework/3klife-atm-triangle-strategy/3KLife ATM 採用三角策略規劃書.md
depends_on: TASK-ATS-0002
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-ATS-0003 — npc-brain official ATM onboarding smoke

## 背景

在 npc-brain 乾淨分支上驗證 official ATM 入場導覽，確認既有 repo 能先走 official adopt/install，再進入 README-only 單一入口，作為後續原子行為驗證的共同入口。

## 範圍

本卡屬於 3KLife 本地三角策略任務，不是 AI-Atomic-Framework public issue，也不是 agent-pack-onboarding 任務。若產出要 upstream，必須先轉成 repo-neutral evidence、fixture、validator、RFC 或英文 docs patch。

## 驗收條件

- [x] 不引用 3KLife local fork 或私有 patch。
- [x] 既有 repo 的第一步是 official install/adopt route，不要求使用者手動複製 `atm.mjs` 或 release artifact。
- [x] adopt 完成後，README / AGENTS 單一入口可導向 `node atm.mjs next --json`。
- [x] 初始化、verify 與 evidence output 走 official CLI 或 official package。
- [x] 失敗時產生 machine-readable blocker report。
- [x] 所有人工步驟都有 transcript。

## 產出

- onboarding transcript
- adopt/install transcript
- blocker report if failed
- official command list

## 驗證

- official ATM init / verify dry run
- encoding guard for generated docs

## 依賴

- TASK-ATS-0002

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 採用流程明確改為「先 official install/adopt，再進入 README-only 單一入口」，排除手動複製 runtime artifact 作為 adopter 正式步驟 | 阻塞: none
## Status Update - 2026-05-19

狀態：in_progress / partial pass。

本輪使用者以自然語言提出需求：「請幫我看看目前專案的資料管線進度已經進行到哪裡了？」沒有提示 ATM、AGENTS、README 或 CLI 指令。Codex 仍自行讀取入口資訊、執行 `node atm.mjs next --json`，並依照 ATM 指示先完成 `node atm.mjs atm-chart render --cwd . --json`，之後回到原始需求並整理資料管線進度。

驗收判定：
- PASS：自然語言黑箱入口成立。
- PASS：Agent 有回到使用者原始任務，不是停在 onboarding 流程。
- PARTIAL：ATM 治理提示存在感偏弱，使用者不一定看得出系統已進入 ATM 治理。
- PARTIAL：npc-brain 目前 root README / AGENTS 仍需刷新到最新 first-use notice 文案。

下一步：
- 刷新 npc-brain root pinned runner 與入口文案。
- 重新開全新 Codex 對話，以同樣自然語言 prompt 測試 welcome/user notice 是否可見。
- 通過後關閉 TASK-ATS-0003，進入 TASK-ATS-0004 minimum atom behavior dry-run suite。

大幅修改管線的門檻：TASK-ATS-0003 completed + TASK-ATS-0004 minimum dry-run suite pass。真正會改 legacy Python 管線的 infect / atomize 工作，需等 TASK-ATS-0005 dry-run proposal 與人工 review 後再開始。
## Subtask Update - TASK-ATS-0003B - 2026-05-19

狀態：completed。

已用最新 AI-Atomic-Framework onefile release 對 `C:/Users/User/3klife-npc-brain` 執行 `bootstrap --force`，刷新 root `atm.mjs`、README、AGENTS 與 pinned runner metadata。

完成結果：
- `atm.mjs` replaced，new sha256: `0b314599d03c863545e20612372de096bf0462392d3c4798760c924157212a81`
- README root ATM entry 已包含 `ATM_USER_NOTICE` / `evidence.userNotice` 顯示規則。
- AGENTS root ATM entry 已包含 `ATM_USER_NOTICE` / `evidence.userNotice`、missing local document fallback、onboarding 後回到 original request 的規則。
- AGENTS 內舊 bootstrap prompt 也已同步成新版 notice-first 規則，避免同一檔案內出現新舊入口衝突。
- `node atm.mjs next --json` 已驗證會回傳 top-level `ATM_USER_NOTICE` message 與 `evidence.userNotice.mustShowBeforeAction = true`。

下一步：開全新 Codex 對話，只下自然語言需求，不提示 ATM，確認 Agent 是否會先自然轉述 ATM welcome/user notice，執行 `node atm.mjs next --json` 回傳的 onboarding route，然後回到原始需求。

## Closeout - 2026-05-20

狀態：completed。

本卡由後續跨編輯器黑箱驗收補足：Copilot、Codex、Claude Code、Google Antigravity 均能在自然語句下進入 ATM entry route，並回到使用者原始資料管線需求。TASK-ATS-0004 已完成，因此本卡不再維持 partial 狀態。
