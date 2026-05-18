---
doc_id: doc_other_0243
task_id: TASK-APF-0001
title: Upstream police inventory 與狀態矩陣
milestone: M1
status: done
artifact_status: spec-done
runtime_status: n/a
upstream_mutation_status: not-applied
started_at: "2026-05-18T00:00:00+08:00"
started_by_agent: "ClaudeCode_Sonnet4.6"
blocked_by: [TASK-APF-0000]
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

# TASK-APF-0001 — Upstream police inventory 與狀態矩陣

## 背景

本卡由「原子警察家族計畫書」拆分而來，用來把 AI-Atomic-Framework 中已部分落地但尚未產品化的 police family 收斂成可驗證、可回寫 upstream 的工作單。

## 目標

對 AI-Atomic-Framework 現有 police、validator、map-curator、guidance、status-machine、lifecycle-police 與 fixtures 做可追蹤盤點。

## 前置依賴

TASK-APF-0000

## 輸入

- 原子警察家族計畫書
- 3KLife 原子行為參考手冊
- AI-Atomic-Framework docs/ATOM_EVOLUTION_PLAN.md
- AI-Atomic-Framework docs/governance/behavior-taxonomy.md
- AI-Atomic-Framework 現有 police / validator / guidance / map-curator runtime

## 輸出

- police inventory table
-  behavior trigger matrix
-  implemented / embedded / fixture-only / missing runtime scanner 判定
-  evidence path list

## 驗收條件

- [x] 每個 police family 都有現況判定
- [x] 每個 behavior 都有 trigger mapping
- [x] 至少引用 upstream 檔案與 validator 入口
- [x] 缺口不被誤標為 done
- [x] 盤點不要求修改 upstream code
- [x] 引用 upstream `PoliceCheckKind` 7 kind 並標出與 11 police family 的對應
- [x] 列出 `runPoliceChecks` 既有 4 check（dependency-graph / layer-boundary / forbidden-import / registry-consistency）與 `runLifecyclePolice` 分離設計
- [x] 區分 RegistryIndex（讀模型）與 police（檢查器），不互相混淆

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
manual inventory review; npm --prefix C:/Users/User/AI-Atomic-Framework run validate:police
~~~

## 回滾策略

本卡文件階段可用 git diff 回退 atomic-police-family 相關檔案。若後續進入 upstream runtime 實作，必須保留 evidence 摘要，再用 revert 或新 proposal 回退；不得手動覆蓋其他 repo 的未關聯變更。

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 由原子警察家族計畫書建立初始任務卡 | 阻塞: none
2026-05-18 | 狀態: done | 驗證: pass | 變更: specs/APF-0001-upstream-police-inventory.md 完成；補入 dependency-graph police、PoliceCheckKind 7 kind 對應、runPoliceChecks/runLifecyclePolice 分離說明 | 阻塞: none
2026-05-18 | 狀態: done | 驗證: pass | 變更: 回寫狀態語義；artifact_status=spec-done、runtime_status=n/a、upstream_mutation_status=not-applied；本卡 done 僅代表 APF 文件 / spec artifact 完成，不代表 upstream runtime scanner 已產品化 | 阻塞: none
