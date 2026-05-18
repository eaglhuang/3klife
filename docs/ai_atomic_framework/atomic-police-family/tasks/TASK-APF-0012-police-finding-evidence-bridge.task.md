---
doc_id: doc_other_0255
task_id: TASK-APF-0012
title: PoliceFinding evidence schema bridge
milestone: M2.5
status: done
artifact_status: spec-done
runtime_status: upstream-api-not-applied
upstream_mutation_status: not-applied
started_at: "2026-05-18T00:00:00+08:00"
started_by_agent: "ClaudeCode_Sonnet4.6"
blocked_by: [TASK-APF-0002]
owner: atm-core
priority: P0
related_plan: docs/ai_atomic_framework/atomic-police-family/原子警察家族計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:police + validate:review-advisory
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
  - 不新增獨立任務路由器
  - 不把 3KLife / Cocos / private path 寫入 upstream protected public contract
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: ClaudeCode_Sonnet4.6
---

# TASK-APF-0012 — PoliceFinding evidence schema bridge

## 背景

APF-0002 定義了 PoliceFinding 共用 contract，但 `evidenceRefs` / `readModel` 兩個欄位若沒接到上游既有 evidence types，就會漂浮為新 schema。同時上游已有 `ReviewAdvisoryFinding.trigger = machine-finding` 入口，是 police finding 進 advisory queue 的標準通道。本卡負責把 PoliceFinding 與既有 evidence + ReviewAdvisory.metadata.policeFinding 接線。

## 目標

把 PoliceFinding 的 `evidenceRefs` / `readModel` 分層對應 official evidence type 與 police-local artifact ref，並完整串接 `ReviewAdvisory.machine-finding + HumanReviewQueue + follow-up-task` 三接點，不新增獨立任務路由器。

## 前置依賴

TASK-APF-0002

## 輸入

- 原子警察家族計畫書 §5 PoliceFinding contract
- AI-Atomic-Framework `docs/ATOM_EVOLUTION_PLAN.md` evidence types
- AI-Atomic-Framework `packages/plugin-review-advisory/src/index.ts`
- AI-Atomic-Framework `packages/plugin-human-review/src/index.ts`

## 輸出

- evidence schema mapping table
- routing pipeline notes (PoliceFinding → ReviewAdvisory → HumanReviewQueue)
- follow-up-task generation rule
- ban list（不可 route 的 finding type）

## 驗收條件

- [x] `evidenceRefs` 對應 `usage-feedback / quality-baseline / quality-comparison / rollback-proof / map-propagation-log / fingerprint-snapshot`
- [x] `readModel` 對應上游 artifact path / URI
- [x] 全部非 lifecycle 的 PoliceFinding 走 `ReviewAdvisory.machine-finding` 入口
- [x] 不新增獨立任務路由器，由 `routeHint` 觸發 HumanReviewQueue 或 follow-up-task
- [x] lifecycle-police 例外（沿用 `LifecyclePoliceFinding` quarantine writer）

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
npm --prefix C:/Users/User/AI-Atomic-Framework run validate:police; npm --prefix C:/Users/User/AI-Atomic-Framework run validate:review-advisory
~~~

## 回滾策略

本卡文件階段可用 git diff 回退 atomic-police-family 相關檔案。若後續進入 upstream runtime 實作，必須保留 evidence 摘要，再用 revert 或新 proposal 回退；不得手動覆蓋其他 repo 的未關聯變更。

## Notes

2026-05-18 | 狀態: done | 驗證: pass | 變更: evidenceRefs 分成 official evidence type 與 police-local artifact ref；routing 統一 ReviewAdvisory.machine-finding + metadata.policeFinding；specs/APF-0012-evidence-schema-bridge.md 完成 | 阻塞: none
2026-05-18 | 狀態: done | 驗證: pass | 變更: 回寫狀態語義；artifact_status=spec-done、runtime_status=upstream-api-not-applied、upstream_mutation_status=not-applied；本卡 done 僅代表 APF 文件 / spec artifact 完成，不代表 upstream runtime scanner 已產品化 | 阻塞: none
