---
doc_id: doc_other_0643
task_id: TASK-APF-0016
title: Embedded police advisory adapters
milestone: M7
status: open
artifact_status: spec-done
runtime_status: not-started
upstream_mutation_status: not-applied
started_at: "2026-05-18T00:00:00+08:00"
started_by_agent: "codex"
blocked_by: [TASK-APF-0014]
owner: atm-core
priority: P0
related_plan: docs/ai_atomic_framework/atomic-police-family/原子警察家族計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:standard advisory adapters
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atomic-police-family/**
  - C:/Users/User/AI-Atomic-Framework/packages/**
  - C:/Users/User/AI-Atomic-Framework/schemas/**
  - C:/Users/User/AI-Atomic-Framework/scripts/**
  - C:/Users/User/AI-Atomic-Framework/tests/**
  - C:/Users/User/AI-Atomic-Framework/fixtures/**
  - C:/Users/User/AI-Atomic-Framework/docs/**
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework protected docs hard-code 3KLife
  - C:/Users/User/3KLife/.atm/**
  - C:/Users/User/3KLife/.atm-temp/**
non_goals:
  - 不直接修改 upstream runtime，除非本卡進入實作階段
  - 不建立第二套 approval workflow
  - 不讓 police finding 直接 mutate registry
  - 不新增獨立任務路由器
  - 不把 3KLife / Cocos / private path 寫入 upstream protected public contract
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-APF-0016 — Embedded police advisory adapters

## 背景

Dedup / Demand / Map Integration / Atomization 的能力分散在 registry-index、guidance、map-curator、neutrality-scanner 等模組；M7 要求至少在 validation gate 被呼叫並產 advisory report。

## 目標

建立 advisory adapter，不重寫既有 scanner，不直接改名成獨立 plugin；每個 adapter 產生 PoliceFinding 並放入 `advisoryFindings[]`。

## 前置依賴

TASK-APF-0014

## 輸入

- `registry-index`
- `guidance` route engine
- `regression-compare`
- `map-curator`
- `neutrality-scanner`
- `specs/APF-0016-embedded-police-advisory-adapters.md`

## 輸出

- Dedup / Demand / Map Integration / Atomization advisory adapters
- positive / negative fixtures
- advisory-only report rule

## 驗收條件

- [ ] advisory adapter 會被 gate runner 呼叫（**runtime 行為**：需 gate runner 接線）
- [ ] 有 finding 時 `validate:standard` 不 fail，但 report 必須記錄（**runtime 行為**：需 profile wiring）
- [x] adapter 不直接 mutate registry（specs/APF-0016 §3 已明定原則）
- [ ] 每個 family 都有 positive / negative fixture（**runtime fixture 檔案**：需 fixtures 實際落地）

## 驗證方式

~~~bash
npm --prefix C:/Users/User/AI-Atomic-Framework run validate:police-family
~~~

## 回滾策略

若 adapter 太吵，先調整 threshold 或 profile policy，保留 report schema，不刪除既有 embedded module。

## 共通提醒

本卡 artifact_status=spec-done 僅代表 APF 文件 / spec artifact 已完成；status=open 與 runtime_status=not-started 表示 upstream runtime / validator 接線尚未完成。

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 開立 M7 Validation Gate Activation 任務卡，對應 specs/APF-0016-* | 阻塞: TASK-APF-0014
2026-05-18 | 狀態: open | 驗證: artifact-pass | 變更: spec §3 「不 mutate registry」原則已勾；其餘 3 項屬 runtime adapter / fixture，待上游 adapter 實作後再驗 | 阻塞: upstream adapter 實作
