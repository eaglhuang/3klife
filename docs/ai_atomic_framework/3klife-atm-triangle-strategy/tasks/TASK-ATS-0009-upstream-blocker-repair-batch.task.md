---
doc_id: doc_other_0239
task_id: TASK-ATS-0009
title: Upstream blocker repair batch from npc-brain evidence
owner: atm-core
priority: P1
status: completed
milestone: M8
related_plan: docs/ai_atomic_framework/3klife-atm-triangle-strategy/3KLife ATM 採用三角策略規劃書.md
depends_on: TASK-ATS-0008
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-ATS-0009 — Upstream blocker repair batch from npc-brain evidence

## 背景

將 npc-brain 找到的 blocker 轉成 AI-Atomic-Framework repo-neutral patch、fixture、validator 或 docs 修補。

## 範圍

本卡屬於 3KLife 本地三角策略任務，不是 AI-Atomic-Framework public issue，也不是 agent-pack-onboarding 任務。若產出要 upstream，必須先轉成 repo-neutral evidence、fixture、validator、RFC 或英文 docs patch。

## 驗收條件

- [x] 每個修補都有對應 evidence。
- [x] 不得 hard-code 3KLife 或 npc-brain。
- [x] public docs 修補採英文或英文摘要。
- [x] 修補能被 upstream CI 或 validator 重現。

## 產出

- upstream patch list
- fixtures
- validator or docs patch

## 驗證

- AI-Atomic-Framework relevant validation commands
- neutrality scan

## 依賴

- TASK-ATS-0008

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 依使用者要求重開為 TASK-ATS 序列並按執行優先序排序 | 阻塞: none
2026-05-20 | 狀態: completed | 驗證: `validate:registry-lineage-backfill`; `validate:registry-diff`; `validate:neutrality`; `validate:onefile-release`; `validate:cli`; `validate-integration-adapter`; `adopter-sentinel` PASS | 變更: 新增 `evidence/TASK-ATS-0009-upstream-blocker-repair-batch-2026-05-20.md`，將 npc-brain upstream-blocker bucket 對應到 neutral upstream artifacts、framework commits、validators 與 public docs surfaces。 | 阻塞: none
