---
doc_id: doc_other_0236
task_id: TASK-ATS-0006
title: Atomic Map decomposition and replacement validation
owner: atm-core
priority: P1
status: open
milestone: M5
related_plan: docs/ai_atomic_framework/3klife-atm-triangle-strategy/3KLife ATM 採用三角策略規劃書.md
depends_on: TASK-ATS-0005
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-ATS-0006 — Atomic Map decomposition and replacement validation

## 背景

對接「拆解大型功能優化原子map計畫書」，驗證 legacy 大功能拆解後能形成 canonical Atomic Map，而非散落 atom。

## 範圍

本卡屬於 3KLife 本地三角策略任務，不是 AI-Atomic-Framework public issue，也不是 agent-pack-onboarding 任務。若產出要 upstream，必須先轉成 repo-neutral evidence、fixture、validator、RFC 或英文 docs patch。

## 驗收條件

- [ ] 建立 decomposition plan 並走 create-map --from-plan 或等價 official surface。
- [ ] 產生 canonical map workspace、member roles、edge semantics 與 replacement contract。
- [ ] 至少有 map integration evidence 與 equivalence evidence。
- [ ] 失敗時能指出下一個 deterministic CLI step。

## 產出

- decomposition plan
- canonical Atomic Map
- map integration report
- equivalence report

## 驗證

- create-map from plan smoke
- map equivalence report review

## 依賴

- TASK-ATS-0005

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 依使用者要求重開為 TASK-ATS 序列並按執行優先序排序 | 阻塞: none
