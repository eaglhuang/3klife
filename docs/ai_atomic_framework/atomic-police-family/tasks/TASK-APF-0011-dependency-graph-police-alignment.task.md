---
doc_id: doc_other_0254
task_id: TASK-APF-0011
title: Dependency Graph Police 對齊
milestone: M1.5
status: done
artifact_status: spec-done
runtime_status: wrapper-not-started
upstream_mutation_status: not-applied
runtime_successor_task: TASK-APF-0020
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
created_by_agent: ClaudeCode_Sonnet4.6
---

# TASK-APF-0011 — Dependency Graph Police 對齊

## 背景

本卡補入原計畫書漏列的 dependency-graph police family。上游 `PoliceCheckKind` 已包含 `dependency-graph` 一種 kind，且 `runPoliceChecks` 已實際註冊 cycle 偵測，但計畫書 §2 狀態矩陣未列。本卡負責把它正式列為第 11 個 police family，並對齊 family contract。

## 目標

把上游既有 dependency-graph police（DAG / cycle 偵測）補入 family contract，輸出包裝後的 `PoliceFinding`，與其他 family 共用 routeHint / readModel / mode 欄位。

## 前置依賴

TASK-APF-0001

## 輸入

- 原子警察家族計畫書 §2 狀態矩陣
- AI-Atomic-Framework `packages/core/src/police/dependency-graph.ts`
- AI-Atomic-Framework `packages/core/src/police/index.ts` (`runPoliceChecks`)
- AI-Atomic-Framework `packages/plugin-sdk/src/police.ts` (`PoliceCheckKind`)

## 輸出

- dependency-graph police family contract notes
- finding wrapper design
- alphaGate mapping (`validate:police`)
- cross-link 到 APF-0008 lifecycle/boundary alignment

## 驗收條件

- [x] 對齊 family contract 不重寫既有 cycle 偵測
- [x] 補入主計畫書 §2 狀態矩陣為 11 個 family 之一
- [x] routeHint 接 ReviewAdvisory.machine-finding（cycle 為 blocker）
- [x] readModel 對應 dependency graph 快照
- [x] 與 APF-0008 boundary police 不重疊（boundary 管 layer，dep-graph 管 cycle）

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
npm --prefix C:/Users/User/AI-Atomic-Framework run validate:police
~~~

## 回滾策略

本卡文件階段可用 git diff 回退 atomic-police-family 相關檔案。若後續進入 upstream runtime 實作，必須保留 evidence 摘要，再用 revert 或新 proposal 回退；不得手動覆蓋其他 repo 的未關聯變更。

## Notes

2026-05-18 | 狀態: done | 驗證: pass | 變更: 補入 11 個 police family 之缺漏；specs/APF-0011-dependency-graph-police-alignment.md 完成 | 阻塞: none
2026-05-18 | 狀態: done | 驗證: pass | 變更: 回寫狀態語義；artifact_status=spec-done、runtime_status=wrapper-not-started、upstream_mutation_status=not-applied；本卡 done 僅代表 APF 文件 / spec artifact 完成，不代表 upstream runtime scanner 已產品化 | 阻塞: none
2026-05-19 | 狀態: done | 驗證: M14 metadata repair | 變更: 本卡維持 dependency-graph alignment spec；core blocker facade runtime 對齊由 TASK-APF-0020 接手。
