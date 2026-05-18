---
doc_id: doc_other_0642
task_id: TASK-APF-0015
title: Core police gate runner
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
alphaGate: validate:standard blocker runner
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

# TASK-APF-0015 — Core police gate runner

## 背景

Schema / Boundary / Dependency Graph / Registry Consistency / Lifecycle / Quality 已有不同程度 runtime，但目前沒有統一 family gate runner。

## 目標

新增 `scripts/validate-police-family.ts`，包裝既有 core police 與 quality gate，輸出 `PoliceFamilyGateReport`，並讓 blocker finding 可使 gate non-zero exit。

## 前置依賴

TASK-APF-0014

## 輸入

- `packages/core/src/police/index.ts`
- `scripts/validate-police.ts`
- lifecycle police validator / fixtures
- `specs/APF-0015-core-police-gate-runner.md`

## 輸出

- core police gate runner implementation plan
- blocker family normalization
- `blockingFindings` exit rule

## 驗收條件

- [x] core runner 呼叫既有 `runPoliceChecks`（specs/APF-0015 §3 行為設計已明定）
- [x] Lifecycle Police 保留既有 writer / finding schema（specs/APF-0015 §3 保留 quarantine writer 特例）
- [ ] blocker family 有 blocking finding 時 exit non-zero（**runtime 行為**：需 `validate-police-family.ts` 實作）
- [ ] runner 產出 `PoliceFamilyGateReport`（**runtime 行為**：需實際 normalize 輸出）

## 驗證方式

~~~bash
npm --prefix C:/Users/User/AI-Atomic-Framework run validate:police-family
~~~

## 回滾策略

若 gate runner 造成 false positive，先從 `validate:standard` 移回 advisory-only profile，不刪除既有 scanner。

## 共通提醒

本卡 artifact_status=spec-done 僅代表 APF 文件 / spec artifact 已完成；status=open 與 runtime_status=not-started 表示 upstream runtime / validator 接線尚未完成。

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 開立 M7 Validation Gate Activation 任務卡，對應 specs/APF-0015-* | 阻塞: TASK-APF-0014
2026-05-18 | 狀態: open | 驗證: artifact-pass | 變更: spec §3 已明定的 2 項設計（呼叫 runPoliceChecks、保留 Lifecycle writer schema）已勾選；exit non-zero 與 report 產出屬 runtime 行為，待 validate-police-family.ts 實作後再驗 | 阻塞: upstream runner 實作
