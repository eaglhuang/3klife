---
doc_id: doc_other_0245
task_id: TASK-APF-0003
title: Dedup Police 產品化
milestone: M3
status: done
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
---

# TASK-APF-0003 — Dedup Police 產品化

## 背景

本卡由「原子警察家族計畫書」拆分而來，用來把 AI-Atomic-Framework 中已部分落地但尚未產品化的 police family 收斂成可驗證、可回寫 upstream 的工作單。

## 目標

把 RegistryIndex semantic fingerprint lookup、quality report dedupCandidates、polymorph ignore 與 map-curator dedup-merge 串成 named Dedup Police scanner 規格。

## 前置依賴

TASK-APF-0002

## 輸入

- 原子警察家族計畫書
- 3KLife 原子行為參考手冊
- AI-Atomic-Framework docs/ATOM_EVOLUTION_PLAN.md
- AI-Atomic-Framework docs/governance/behavior-taxonomy.md
- AI-Atomic-Framework 現有 police / validator / guidance / map-curator runtime

## 輸出

- dedup scanner design
-  report schema draft
-  positive / negative fixture plan
-  follow-up route matrix

## 驗收條件

- [x] 使用 RegistryIndex prefix lookup 作為 hot path
- [x] 區分 exact fingerprint、high similarity、polymorph ignored
- [x] 輸出 dedup finding 而非直接 merge
- [x] dedup-merge 必須走 proposal / review
- [x] 列出 validate:police 接線方式
- [x] 引用 `packages/plugin-behavior-pack/src/dedup-merge.ts` 既有實作
- [x] 引用 `regression-compare.ts:dedupCandidates` 欄位作為 finding 來源
- [x] RegistryIndex prefix lookup 對應 evidence type `fingerprint-snapshot`
- [x] polymorph ignore advisory 對應 `validate:polymorph-template`

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
npm --prefix C:/Users/User/AI-Atomic-Framework run validate:regression-compare; npm --prefix C:/Users/User/AI-Atomic-Framework run validate:polymorph-template
~~~

## 回滾策略

本卡文件階段可用 git diff 回退 tomic-police-family 相關檔案。若後續進入 upstream runtime 實作，必須保留 evidence 摘要，再用 revert 或新 proposal 回退；不得手動覆蓋其他 repo 的未關聯變更。

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 由原子警察家族計畫書建立初始任務卡 | 阻塞: none
2026-05-18 | 狀態: done | 驗證: pass | 變更: specs/APF-0003-dedup-police-design.md 完成；引用 plugin-behavior-pack/dedup-merge.ts 與 regression-compare.dedupCandidates；fingerprint-snapshot evidence 對應 | 阻塞: none
