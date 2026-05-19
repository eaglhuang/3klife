---
doc_id: doc_other_0244
task_id: TASK-APF-0002
title: PoliceFinding family contract
milestone: M2
status: done
artifact_status: spec-done
runtime_status: upstream-api-not-applied
upstream_mutation_status: not-applied
runtime_successor_task: TASK-APF-0019
started_at: "2026-05-18T00:00:00+08:00"
started_by_agent: "ClaudeCode_Sonnet4.6"
blocked_by: [TASK-APF-0001]
owner: atm-core
priority: P0
related_plan: docs/ai_atomic_framework/atomic-police-family/原子警察家族計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:police
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
  - 不直接修改 upstream API，除非任務卡明確進入實作階段
  - 不建立第二套 approval workflow
  - 不讓 police finding 直接 mutate registry
  - 不把 3KLife / Cocos / private path 寫入 upstream protected public contract
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-APF-0002 — PoliceFinding family contract

## 背景

本卡由「原子警察家族計畫書」拆分而來，用來把 AI-Atomic-Framework 中已部分落地但尚未產品化的 police family 收斂成可驗證、可回寫 upstream 的工作單。

## 目標

收斂共用 PoliceFinding 欄位、severity、action、routeHint、readModel 與 fast / slow mode，不建立第二套 approval workflow。

## 前置依賴

TASK-APF-0001

## 輸入

- 原子警察家族計畫書
- 3KLife 原子行為參考手冊
- AI-Atomic-Framework docs/ATOM_EVOLUTION_PLAN.md
- AI-Atomic-Framework docs/governance/behavior-taxonomy.md
- AI-Atomic-Framework 現有 police / validator / guidance / map-curator runtime

## 輸出

- PoliceFinding contract draft
-  route policy
-  lifecycle writer exception rule
-  migration notes

## 驗收條件

- [x] contract 覆蓋 trigger / scope / severity / action / routeHint / readModel / mode
- [x] 明定 police finding 不直接 mutate registry
- [x] 明定 lifecycle-police 是唯一 quarantine writer 例外
- [x] 明定 ReviewAdvisory.machine-finding + HumanReviewQueue + follow-up-task 三接點作為 routeHint 終點（不新增獨立任務路由器）
- [x] API 變更仍停留在規劃層
- [x] contract 必須與既有 `LifecyclePoliceFinding`、`ReviewAdvisoryFinding` 共存，不另立第三套
- [x] `evidenceRefs` 分成 official evidence type（usage-feedback / quality-baseline / quality-comparison / rollback-proof / human-review-decision）與 police-local artifact refs（map-propagation-log / fingerprint-snapshot 等）
- [x] 刪除「直寫獨立任務路由器」的暗示，改為 ReviewAdvisory routing

- [x] 本卡 done 僅代表 APF 文件 / spec artifact 完成，不代表 upstream runtime scanner 已產品化。

## 影響檔案

### 允許修改

- C:/Users/User/3KLife/docs/ai_atomic_framework/atomic-police-family/**
- 實作階段另依子任務批准修改 AI-Atomic-Framework 對應 packages / schemas / scripts / tests / fixtures / docs

### 禁止修改

- AI-Atomic-Framework protected docs 不得 hard-code 3KLife / Cocos / private path
- C:/Users/User/3KLife/.atm/**
- C:/Users/User/3KLife/.atm-temp/**

## 驗證方式

~~~bash
contract review; neutrality checklist
~~~

## 回滾策略

本卡文件階段可用 git diff 回退 atomic-police-family 相關檔案。若後續進入 upstream runtime 實作，必須保留 evidence 摘要，再用 revert 或新 proposal 回退；不得手動覆蓋其他 repo 的未關聯變更。

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 由原子警察家族計畫書建立初始任務卡 | 阻塞: none
2026-05-18 | 狀態: done | 驗證: pass | 變更: specs/APF-0002-police-finding-contract.md 完成；明定接 ReviewAdvisory.machine-finding，不新增獨立任務路由器；evidenceRefs 分成 official evidence type 與 police-local artifact ref | 阻塞: none
2026-05-18 | 狀態: done | 驗證: pass | 變更: 回寫狀態語義；artifact_status=spec-done、runtime_status=upstream-api-not-applied、upstream_mutation_status=not-applied；本卡 done 僅代表 APF 文件 / spec artifact 完成，不代表 upstream runtime scanner 已產品化 | 阻塞: none
2026-05-19 | 狀態: done | 驗證: M14 metadata repair | 變更: 本卡維持 contract spec 狀態；runtime/API stabilization 由 TASK-APF-0019 接手，避免把 upstream-api-not-applied 誤讀為下游 scanner 不可能落地。
