---
doc_id: doc_other_0644
task_id: TASK-APF-0017
title: Validator profile wiring
milestone: M7
status: open
artifact_status: spec-done
runtime_status: not-started
upstream_mutation_status: not-applied
started_at: "2026-05-18T00:00:00+08:00"
started_by_agent: "codex"
blocked_by: [TASK-APF-0015, TASK-APF-0016]
owner: atm-core
priority: P0
related_plan: docs/ai_atomic_framework/atomic-police-family/原子警察家族計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:standard + validate:full profile wiring
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

# TASK-APF-0017 — Validator profile wiring

## 背景

目前 `validate:police` 屬於 full profile；M7 要求最低守關 gate 是 `validate:standard`，因此需要新增 `validate-police-family` 並接入 profile。

## 目標

修改 upstream validator profile：`validate:standard` 執行 `validate-police-family`；`validate:full` 繼承 family gate 並保留既有 `validate:police`。

## 前置依賴

TASK-APF-0015、TASK-APF-0016

## 輸入

- `package.json`
- `scripts/validators.config.json`
- `scripts/run-validators.ts`
- `specs/APF-0017-validator-profile-wiring.md`

## 輸出

- `validate:police-family` npm script
- `validate-police-family` validator id
- standard/full profile wiring

## 驗收條件

- [ ] `npm run validate:standard` 會執行 `validate-police-family`（**runtime profile wiring**）
- [ ] `npm run validate:full` 會執行 `validate-police-family` 與既有 `validate:police`（**runtime profile wiring**）
- [ ] blocker fixture 失敗時 profile exit non-zero（**runtime 行為**）
- [ ] advisory finding 不造成 standard fail，但 report 可追蹤（**runtime 行為**）

## 驗證方式

~~~bash
npm --prefix C:/Users/User/AI-Atomic-Framework run validate:standard
npm --prefix C:/Users/User/AI-Atomic-Framework run validate:full
~~~

## 回滾策略

若 standard profile 受影響，先將 `validate-police-family` 降回 advisory-only 或 full-only，保留 runner 與 fixtures。

## 共通提醒

本卡 artifact_status=spec-done 僅代表 APF 文件 / spec artifact 已完成；status=open 與 runtime_status=not-started 表示 upstream runtime / validator 接線尚未完成。

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 開立 M7 Validation Gate Activation 任務卡，對應 specs/APF-0017-* | 阻塞: TASK-APF-0015, TASK-APF-0016
2026-05-18 | 狀態: open | 驗證: artifact-pass | 變更: specs/APF-0017 已備好 wiring 設計（npm script + validator id + profile policy）；4 項 acceptance 皆為 runtime profile wiring，需上游修改 package.json + validators.config.json 後才能驗證 | 阻塞: upstream profile wiring 實作
