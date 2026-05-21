---
doc_id: doc_other_0251
task_id: TASK-APF-0009
title: Police orchestrator / CLI / validator profile 規劃
milestone: M6
status: done
artifact_status: spec-done
runtime_status: wrapper-not-started
upstream_mutation_status: not-applied
started_at: "2026-05-18T00:00:00+08:00"
started_by_agent: "ClaudeCode_Sonnet4.6"
blocked_by: [TASK-APF-0003, TASK-APF-0004, TASK-APF-0005, TASK-APF-0006, TASK-APF-0007, TASK-APF-0008, TASK-APF-0011]
owner: atm-core
priority: P1
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
lastTransitionId: 2026-05-21T10-29-44-243Z-migrate-legacy-ledger-f78e351e2b7d
lastTransitionAt: 2026-05-21T10:29:44.243Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.243Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:8048ab498388b65b250e85aa963a7e1fcb0808be9d138e57733a418b68c88fcc
---

# TASK-APF-0009 — Police orchestrator / CLI / validator profile 規劃

## 背景

本卡由「原子警察家族計畫書」拆分而來，用來把 AI-Atomic-Framework 中已部分落地但尚未產品化的 police family 收斂成可驗證、可回寫 upstream 的工作單。

## 目標

定義 Police family registry、orchestrator、CLI 與 validator profile 的進場順序，先 advisory 後 blocker；這是 roadmap target，不是目前 upstream profile 現況。

## 前置依賴

TASK-APF-0003, TASK-APF-0004, TASK-APF-0005, TASK-APF-0006, TASK-APF-0007, TASK-APF-0008

## 輸入

- 原子警察家族計畫書
- 3KLife 原子行為參考手冊
- AI-Atomic-Framework docs/ATOM_EVOLUTION_PLAN.md
- AI-Atomic-Framework docs/governance/behavior-taxonomy.md
- AI-Atomic-Framework 現有 police / validator / guidance / map-curator runtime

## 輸出

- orchestrator design
-  CLI command proposal
-  validator profile migration
-  advisory-to-blocker policy

## 驗收條件

- [x] 不建立第二套 approval workflow
- [x] standard profile 初期只 advisory
- [x] full profile 可先接完整 scanner
- [x] orchestrator output 可餵 ReviewAdvisory.machine-finding（不新增獨立任務路由器）
- [x] 定義 promotion 成 blocker 的明確條件
- [x] validator profile 對應 `validate:quick / validate:standard / validate:full` 三層既有 profile
- [x] advisory mode binding `validate:standard`
- [x] blocker mode binding `validate:full`
- [x] 涵蓋 11 個 police family（含 dependency-graph police）的執行順序

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
npm --prefix C:/Users/User/AI-Atomic-Framework run validate:police; npm --prefix C:/Users/User/AI-Atomic-Framework run validate:standard
~~~

## 回滾策略

本卡文件階段可用 git diff 回退 atomic-police-family 相關檔案。若後續進入 upstream runtime 實作，必須保留 evidence 摘要，再用 revert 或新 proposal 回退；不得手動覆蓋其他 repo 的未關聯變更。

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 由原子警察家族計畫書建立初始任務卡 | 阻塞: none
2026-05-18 | 狀態: done | 驗證: pass | 變更: specs/APF-0009-orchestrator-design.md 完成；對應 validate:quick/standard/full 三層；補入 APF-0011 dep-graph 對齊 | 阻塞: none
2026-05-18 | 狀態: done | 驗證: pass | 變更: 回寫狀態語義；artifact_status=spec-done、runtime_status=wrapper-not-started、upstream_mutation_status=not-applied；本卡 done 僅代表 APF 文件 / spec artifact 完成，不代表 upstream runtime scanner 已產品化 | 阻塞: none
