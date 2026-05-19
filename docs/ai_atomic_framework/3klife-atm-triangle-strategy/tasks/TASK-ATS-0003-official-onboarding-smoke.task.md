---
doc_id: doc_other_0233
task_id: TASK-ATS-0003
title: npc-brain official ATM onboarding smoke
owner: atm-core
priority: P0
status: open
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

- [ ] 不引用 3KLife local fork 或私有 patch。
- [ ] 既有 repo 的第一步是 official install/adopt route，不要求使用者手動複製 `atm.mjs` 或 release artifact。
- [ ] adopt 完成後，README / AGENTS 單一入口可導向 `node atm.mjs next --json`。
- [ ] 初始化、verify 與 evidence output 走 official CLI 或 official package。
- [ ] 失敗時產生 machine-readable blocker report。
- [ ] 所有人工步驟都有 transcript。

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
