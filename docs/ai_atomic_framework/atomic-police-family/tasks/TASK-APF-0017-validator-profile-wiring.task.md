---
doc_id: doc_other_0644
task_id: TASK-APF-0017
title: Validator profile wiring
milestone: M7
status: done
artifact_status: done
runtime_status: done
upstream_mutation_status: applied
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
lastTransitionId: 2026-05-21T10-29-44-253Z-migrate-legacy-ledger-eb1b7d7622cb
lastTransitionAt: 2026-05-21T10:29:44.253Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.253Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:55031b58870c37f2567395f68b7a1a86ac9981e6bf3d94f9a2d38b85aed8b617
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

- [x] `npm run validate:standard` 會執行 `validate-police-family`（validators.config.json standard profile 已加入 validate-police-family）
- [x] `npm run validate:full` 會執行 `validate-police-family` 與既有 `validate:police`（full extends standard + validate-police 保留）
- [x] blocker fixture 失敗時 profile exit non-zero（validate-police-family.ts 以 dependency-cycle / lifecycle hard-fail negative fixture 驗證 ok=false）
- [x] advisory finding 不造成 standard fail，但 report 可追蹤（advisory families advisoryOnly=true，finding 記入 advisoryFindings[] 不影響 gate ok）

## 驗證方式

~~~bash
npm --prefix C:/Users/User/AI-Atomic-Framework run validate:standard
npm --prefix C:/Users/User/AI-Atomic-Framework run validate:full
~~~

## 回滾策略

若 standard profile 受影響，先將 `validate-police-family` 降回 advisory-only 或 full-only，保留 runner 與 fixtures。

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 開立 M7 Validation Gate Activation 任務卡，對應 specs/APF-0017-* | 阻塞: TASK-APF-0015, TASK-APF-0016
2026-05-18 | 狀態: open | 驗證: artifact-pass | 變更: specs/APF-0017 已備好 wiring 設計（npm script + validator id + profile policy）；4 項 acceptance 皆為 runtime profile wiring，需上游修改 package.json + validators.config.json 後才能驗證 | 阻塞: upstream profile wiring 實作
2026-05-19 | 狀態: done | 驗證: pass | 變更: package.json 新增 validate:police-family script，validators.config.json 新增 validator entry + standard profile wiring，full profile 繼承 standard 並保留 validate:police | 完成
