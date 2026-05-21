---
doc_id: doc_other_0247
task_id: TASK-APF-0005
title: Quality Police 產品化規格 / design spec
milestone: M3
status: done
artifact_status: spec-done
runtime_status: not-started
upstream_mutation_status: not-applied
runtime_successor_task: TASK-APF-0023
started_at: "2026-05-18T00:00:00+08:00"
started_by_agent: "ClaudeCode_Sonnet4.6"
blocked_by: [TASK-APF-0002]
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
lastTransitionId: 2026-05-21T10-29-44-239Z-migrate-legacy-ledger-a6b52859ac33
lastTransitionAt: 2026-05-21T10:29:44.239Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.239Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:fc64b3f7c43a83dd2a925ffb68cf8ac89e6a02242728ac07a76750257cc2b7d3
---

# TASK-APF-0005 — Quality Police 產品化規格 / design spec

## 背景

本卡由「原子警察家族計畫書」拆分而來，用來把 AI-Atomic-Framework 中已部分落地但尚未產品化的 police family 收斂成可驗證、可回寫 upstream 的工作單；本卡目前僅完成 design spec，named runtime scanner 尚未落地。

## 目標

把 quality comparison、non-regression、registry candidate、quality markdown report 包成 named Quality Police 規格。

## 前置依賴

TASK-APF-0002

## 輸入

- 原子警察家族計畫書
- 3KLife 原子行為參考手冊
- AI-Atomic-Framework docs/ATOM_EVOLUTION_PLAN.md
- AI-Atomic-Framework docs/governance/behavior-taxonomy.md
- AI-Atomic-Framework 現有 police / validator / guidance / map-curator runtime

## 輸出

- quality police design
-  report facade
-  metric regression route
-  promotion gate mapping

## 驗收條件

- [x] 不改既有 quality-comparison schema 語意
- [x] regressed 或 map propagation failed 只 block proposal gate
- [x] Markdown report 是 projection 不是 source of truth
- [x] Quality Police finding 可進 ReviewAdvisory.machine-finding
- [x] metric-driven proposal 與 evidence-driven proposal 共用後段 gates
- [x] 引用 `regression-compare.ts:mapImpactScope / propagationStatus`
- [x] evidence types 對應 `quality-baseline / quality-comparison`
- [x] alphaGate 包含 `validate:regression-compare + validate:upgrade-proposal`

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
npm --prefix C:/Users/User/AI-Atomic-Framework run validate:regression-compare; npm --prefix C:/Users/User/AI-Atomic-Framework run validate:upgrade-proposal
~~~

## 回滾策略

本卡文件階段可用 git diff 回退 atomic-police-family 相關檔案。若後續進入 upstream runtime 實作，必須保留 evidence 摘要，再用 revert 或新 proposal 回退；不得手動覆蓋其他 repo 的未關聯變更。

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 由原子警察家族計畫書建立初始任務卡 | 阻塞: none
2026-05-18 | 狀態: done | 驗證: pass | 變更: specs/APF-0005-quality-police-design.md 完成；引用 regression-compare 與 quality-baseline/quality-comparison evidence types | 阻塞: none
2026-05-18 | 狀態: done | 驗證: pass | 變更: 回寫狀態語義；artifact_status=spec-done、runtime_status=not-started、upstream_mutation_status=not-applied；本卡 done 僅代表 APF 文件 / spec artifact 完成，不代表 upstream runtime scanner 已產品化 | 阻塞: none
2026-05-19 | 狀態: done | 驗證: M14 metadata repair | 變更: 本卡是產品化規格 / design spec，不代表 runtime scanner 已由本卡落地；runtime scanner 由 TASK-APF-0023 接手。
