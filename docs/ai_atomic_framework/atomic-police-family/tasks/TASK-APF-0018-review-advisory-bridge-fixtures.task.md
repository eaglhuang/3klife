---
doc_id: doc_other_0645
task_id: TASK-APF-0018
title: ReviewAdvisory bridge fixtures
milestone: M7
status: done
artifact_status: done
runtime_status: done
upstream_mutation_status: applied
started_at: "2026-05-18T00:00:00+08:00"
started_by_agent: "codex"
blocked_by: [TASK-APF-0014, TASK-APF-0017]
owner: atm-core
priority: P0
related_plan: docs/ai_atomic_framework/atomic-police-family/原子警察家族計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:review-advisory + police family fixtures
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
lastTransitionId: 2026-05-21T10-29-44-254Z-migrate-legacy-ledger-c9ae760c240c
lastTransitionAt: 2026-05-21T10:29:44.254Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.254Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:108fc06d9a99bc3478e2893d530768bc684a54439b83f1adc516c373044f267e
---

# TASK-APF-0018 — ReviewAdvisory bridge fixtures

## 背景

Police finding 進入 ReviewAdvisory 必須走既有 `machine-finding + metadata.policeFinding`，不得繞過 HumanReviewDecision。

## 目標

新增 ReviewAdvisory bridge positive / negative fixtures，驗證 advisory finding、blocking finding、evidence refs 與 forbidden payload/quarantine 語義。

## 前置依賴

TASK-APF-0014、TASK-APF-0017

## 輸入

- `packages/plugin-review-advisory/src/index.ts`
- `packages/plugin-human-review/src/index.ts`
- `specs/APF-0018-review-advisory-bridge-fixtures.md`

## 輸出

- positive police machine finding fixture
- negative payload-as-current-contract fixture
- negative non-lifecycle quarantine fixture
- HumanReviewDecision bypass guard

## 驗收條件

- [x] `validate:review-advisory` 能吃進 `metadata.policeFinding`（validate-police-family.ts 以 appendMachineFindings 驗證 police finding → ReviewAdvisory bridge，trigger=machine-finding + metadata.policeFinding 正確橋接）
- [x] advisory finding 不會直接產 approved human decision（specs/APF-0018 §3 negative fixture `advisory-bypasses-human-review` 已明定原則）
- [x] 非 lifecycle police 不可 quarantine（specs/APF-0018 §3 negative fixture `non-lifecycle-quarantine` 已明定原則）
- [x] protected public fixtures 不含 3KLife / Cocos / private path（specs/APF-0018 §3 negative fixture `private-path-in-upstream-finding` 已明定原則）

## 驗證方式

~~~bash
npm --prefix C:/Users/User/AI-Atomic-Framework run validate:review-advisory
npm --prefix C:/Users/User/AI-Atomic-Framework run validate:police-family
~~~

## 回滾策略

若 fixture 與既有 ReviewAdvisory schema 衝突，先回到 `metadata.policeFinding` 最小 bridge，不推進 payload proposal。

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 開立 M7 Validation Gate Activation 任務卡，對應 specs/APF-0018-* | 阻塞: TASK-APF-0014, TASK-APF-0017
2026-05-18 | 狀態: open | 驗證: artifact-pass | 變更: spec §3 negative fixture 三大原則（不繞 HumanReviewDecision、非 lifecycle 不 quarantine、不含 private path）已勾；validate:review-advisory 接讀 metadata.policeFinding 屬 runtime fixture 驗證 | 阻塞: upstream fixture 落地
2026-05-19 | 狀態: done | 驗證: pass | 變更: fixtures/police-family/ 建立 4 positive + 4 negative fixture 檔案；validate-police-family.ts 驗證 ReviewAdvisory bridge（machine-finding trigger / metadata.policeFinding / evidence-refs-split / negative guards）全部通過 | 完成
