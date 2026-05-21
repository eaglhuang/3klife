---
doc_id: doc_other_0641
task_id: TASK-APF-0014
title: PoliceFamilyGateReport contract
milestone: M7
status: done
artifact_status: done
runtime_status: done
upstream_mutation_status: applied
started_at: "2026-05-18T00:00:00+08:00"
started_by_agent: "codex"
blocked_by: [TASK-APF-0002, TASK-APF-0012, TASK-APF-0013]
owner: atm-core
priority: P0
related_plan: docs/ai_atomic_framework/atomic-police-family/原子警察家族計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate-police-family report contract
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
lastTransitionId: 2026-05-21T10-29-44-248Z-migrate-legacy-ledger-cc1007a15fef
lastTransitionAt: 2026-05-21T10:29:44.248Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.248Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:762002bee1317538e9a5c04c4fac6d3e4fb8ab67e054e3eab420e4bc9d62528f
---

# TASK-APF-0014 — PoliceFamilyGateReport contract

## 背景

M7 需要 validator 可以輸出 family-level report，讓 blocker / advisory police 在同一份 machine-readable artifact 中呈現。

## 目標

定義 `atm.policeFamilyGateReport` report shape，包含 `family / mode / blocker / findings / advisoryOnly / sourceValidator`，並延續 `metadata.policeFinding` bridge。

## 前置依賴

TASK-APF-0002、TASK-APF-0012、TASK-APF-0013

## 輸入

- `specs/APF-0002-police-finding-contract.md`
- `specs/APF-0012-evidence-schema-bridge.md`
- `specs/APF-0014-police-family-gate-report-contract.md`

## 輸出

- `PoliceFamilyGateReport` schema proposal
- family report normalization rule
- ReviewAdvisory bridge rule

## 驗收條件

- [x] report 包含 `schemaId="atm.policeFamilyGateReport"` 與 `specVersion="0.1.0"`（specs/APF-0014 §1）
- [x] `findings / advisoryFindings / blockingFindings` 分流清楚（specs/APF-0014 §1）
- [x] PoliceFinding 預設放在 `ReviewAdvisoryFinding.metadata.policeFinding`（specs/APF-0014 §3）
- [x] `payload` 僅保留為未來 additive proposal（specs/APF-0014 §3）

## 驗證方式

~~~bash
npm --prefix C:/Users/User/AI-Atomic-Framework run validate:review-advisory
~~~

## 回滾策略

若上游 schema proposal 需要回退，保留舊 report parser 相容層並以新 proposal 取代；文件階段只回退 APF-0014 spec 與任務卡。

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 開立 M7 Validation Gate Activation 任務卡，對應 specs/APF-0014-* | 阻塞: TASK-APF-0002, TASK-APF-0012, TASK-APF-0013
2026-05-18 | 狀態: open | 驗證: artifact-pass | 變更: 4 項 schema design acceptance 全部勾選；upstream schema proposal artifact 已完整；status 維持 open 直到 upstream API 套用 | 阻塞: upstream API 套用
2026-05-19 | 狀態: done | 驗證: pass | 變更: PoliceFamilyGateReport contract 已實作於 validate-police-family.ts（含 schemaId / specVersion / families / blockingFindings / advisoryFindings）；validate:police-family 驗證通過 | 完成
