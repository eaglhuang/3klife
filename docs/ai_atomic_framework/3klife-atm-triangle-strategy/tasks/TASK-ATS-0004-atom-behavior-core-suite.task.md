---
doc_id: doc_other_0234
task_id: TASK-ATS-0004
title: Atom behavior core suite on npc-brain
owner: atm-core
priority: P0
status: in_progress
milestone: M3
related_plan: docs/ai_atomic_framework/3klife-atm-triangle-strategy/3KLife ATM 採用三角策略規劃書.md
depends_on: TASK-ATS-0003
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-ATS-0004 — Atom behavior core suite on npc-brain

## 背景

用 npc-brain fixture 驗證 split、merge、compose、dedup-merge、sweep、expire 六個低耦合核心行為。

## 範圍

本卡屬於 3KLife 本地三角策略任務，不是 AI-Atomic-Framework public issue，也不是 agent-pack-onboarding 任務。若產出要 upstream，必須先轉成 repo-neutral evidence、fixture、validator、RFC 或英文 docs patch。

## 驗收條件

- [ ] 六個行為都有 deterministic fixture、dry-run output 與 expected report。
- [ ] 合併、過期、掃除類行為不得直接刪除 legacy surface。
- [ ] 輸出需包含 behaviorId、target、evidenceRefs、rollback note。
- [ ] 失敗案例與成功案例都要覆蓋。

## 產出

- behavior fixture suite
- expected reports
- negative cases

## 驗證

- behavior-pack validator
- fixture report diff

## 依賴

- TASK-ATS-0003

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 依使用者要求重開為 TASK-ATS 序列並按執行優先序排序 | 阻塞: none
<!-- TASK-ATS-0004-2026-05-19-REASSESSMENT:START -->
## 2026-05-19 驗收重估

狀態：in_progress。

子驗收：
- TASK-ATS-0004A Explicit ATM Prompt Smoke：pass。
- TASK-ATS-0004B Natural Prompt Auto Skill Trigger：partial fail。
- TASK-ATS-0004C Python Pipeline Ranking Quality：pass as advisory, not yet fully deterministic。
- TASK-ATS-0004D Candidate Ranking Artifact：implemented upstream, needs npc-brain retest。
- TASK-ATS-0004E Source Inventory + Police Evidence：implemented upstream, needs npc-brain retest。
- TASK-ATS-0004F Python-Only Blocker Neutrality：implemented upstream, needs npc-brain retest。

下一步：刷新 npc-brain 的 pinned ATM release，重跑「明確說 ATM」與「完全不說 ATM」兩種 prompt，確認兩者都能產生或引用 candidate ranking artifact、source inventory artifact、police artifact 與 split / atomize / infect route。
<!-- TASK-ATS-0004-2026-05-19-REASSESSMENT:END -->
