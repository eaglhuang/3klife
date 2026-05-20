---
doc_id: doc_other_0240
task_id: TASK-ATS-0010
title: 3KLife experiment graduation and ATM release gate
owner: atm-core
priority: P2
status: completed
milestone: M9
related_plan: docs/ai_atomic_framework/3klife-atm-triangle-strategy/3KLife ATM 採用三角策略規劃書.md
depends_on: TASK-ATS-0009
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-ATS-0010 — 3KLife experiment graduation and ATM release gate

## 背景

建立 3KLife local experiment 畢業規則與 ATM release gate，讓可泛化成果 upstream，不能泛化者留在 3KLife。

## 範圍

本卡屬於 3KLife 本地三角策略任務，不是 AI-Atomic-Framework public issue，也不是 agent-pack-onboarding 任務。若產出要 upstream，必須先轉成 repo-neutral evidence、fixture、validator、RFC 或英文 docs patch。

## 驗收條件

- [x] 定義 local experiment 畢業條件：neutrality、deterministic evidence、validator、rollback。
- [x] release gate 明確檢查 onboarding、behavior suite、legacy Python、Atomic Map、evolution。
- [x] 不能泛化的 3KLife-only 內容標為 local governance。
- [x] 產出下一輪 release readiness summary。

## 產出

- graduation SOP
- release gate checklist
- readiness summary

## 驗證

- full evidence packet review
- release gate dry run

## 依賴

- TASK-ATS-0009

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 依使用者要求重開為 TASK-ATS 序列並按執行優先序排序 | 阻塞: none
2026-05-20 | 狀態: in_progress | 驗證: TASK-ATS-0009 completed | 變更: upstream blocker repair batch 已完成，下一步由本卡統整 M0-M8 evidence，建立 graduation SOP、release gate checklist 與 readiness summary。 | 阻塞: none
2026-05-20 | 狀態: completed | 驗證: full evidence packet review PASS; `validate:registry-lineage-backfill`; `validate:registry-diff`; `validate:neutrality`; `validate:onefile-release`; `validate:cli`; `validate-integration-adapter`; `adopter-sentinel` PASS | 變更: 新增 `evidence/TASK-ATS-0010-graduation-release-gate-2026-05-20.md`，定義 graduation SOP、release gate checklist、upstream-ready/local-governance 分界與 release readiness summary。 | 阻塞: none
