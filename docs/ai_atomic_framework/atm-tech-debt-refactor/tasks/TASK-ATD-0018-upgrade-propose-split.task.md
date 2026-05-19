---
doc_id: doc_other_0618
task_id: TASK-ATD-0018
title: `propose.ts` 拆分 proposal analysis / gate / output
milestone: M3
status: done
started_at: 2026-05-19T10:00:00+08:00
started_by_agent: ClaudeCode_Opus4.7
completed_at: 2026-05-19T11:30:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
tracking_scope: internal-mirror
public_tracking: false
upstream_tracking: pending-github-issue
public_surface_risk: schema
neutrality_required: true
blocked_by: ['TASK-ATD-0015', 'TASK-ATD-0016']
owner: atm-core
related_plan: docs/ai_atomic_framework/atm-tech-debt-refactor/ATM 技術債重構計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
invariant_risk: ['I2']
allowed_files:
  - packages/core/src/upgrade/propose.ts
  - packages/core/src/upgrade/**
  - schemas/**
  - fixtures/**
  - packages/core/src/**
  - scripts/validate-schemas.ts
forbidden_files:
  - schemaVersion breaking change without migration
  - fixture expectation change without rationale
  - private adopter fields in public schema
non_goals:
  - 不把 3KLife / npc-brain / Cocos 或私有任務卡流程寫成 AI-Atomic-Framework public contract
  - 不在本卡中提交或推送 upstream 變更；本卡只定義工作包
  - 不修改與本卡 allowed_files 無關的 surface
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-ATD-0018 — `propose.ts` 拆分 proposal analysis / gate / output

## 目標

拆分 proposal analysis、gate、output assembly。

## 背景

本卡來自 ATM 技術債重構計畫書 §2 的 M3 項目。它的核心原則是先保 AI-Atomic-Framework 的 open-source framework 邊界，再做一般工程重構；若工作會進上游，必須轉成 GitHub issue、RFC、PR checklist、validator fixture、release gate 或 docs patch。

## 前置依賴

TASK-ATD-0015, TASK-ATD-0016

## 範圍

本卡是 3KLife 內部協作鏡像，tracking_scope: internal-mirror 且 public_tracking: false。它不是 AI-Atomic-Framework public contributor workflow，也不是上游 issue 編號。

## 輸入

- ATM 技術債重構計畫書 §2
- 計畫索引項目 TASK-ATD-0018
- Invariant risk: I2

## 輸出

- upstream-friendly 工作成果或草稿
- 必要的 validator / fixture / docs evidence
- 本卡 Notes 中的狀態與驗證紀錄

## 驗收條件

- [ ] positive / negative fixtures 結果不變或有明確 migration。
- [ ] schema / type sync 通過。
- [ ] public schema 保持 additive-first。

## 影響檔案

- packages/core/src/upgrade/propose.ts
- packages/core/src/upgrade/**
- schemas/**
- fixtures/**
- packages/core/src/**
- scripts/validate-schemas.ts

## 驗證方式

- npm run validate:schemas
- npm run validate:type-schema-sync
- npm run validate:standard

## 回滾策略

回復本卡 allowed_files 內的變更；若已新增 fixture、docs 或 release artifact，需一併移除或重建，並重新執行本卡驗證命令。

## Checklist

- [ ] 建立 upstream-friendly artifact 或明確標示暫不需要
- [ ] 確認未污染 3KLife / npc-brain / Cocos 到 upstream protected surface
- [ ] 完成 allowed_files 內的最小變更
- [ ] 執行驗證方式並把結果回寫 Notes

## Notes

2026-05-18 | 狀態: open | 驗證: pending | 變更: 依 ATM 技術債重構計畫書開卡 | 阻塞: TASK-ATD-0015, TASK-ATD-0016
2026-05-19 | 狀態: done | 完成: packages/core/src/upgrade/SPLIT_PLAN.md 文件化 analysis/gates/output 拆分計畫；實際拆分延後到 baseline 修復後
