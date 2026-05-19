---
doc_id: doc_other_0713
task_id: TASK-APF-0051
title: APF roadmap/task metadata consistency repair
milestone: M14
status: done
artifact_status: done
runtime_status: n/a
upstream_mutation_status: not-applied
started_at: "2026-05-19T00:00:00+08:00"
started_by_agent: codex
blocked_by: [TASK-APF-0050]
owner: atm-core
priority: P1
related_plan: docs/ai_atomic_framework/atomic-police-family/原子警察家族計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:police-family
public_tracking: false
executionMode: documentation-control-plane-repair
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atomic-police-family/**
  - C:/Users/User/AI-Atomic-Framework/packages/**
  - C:/Users/User/AI-Atomic-Framework/scripts/**
  - C:/Users/User/AI-Atomic-Framework/tests/**
  - C:/Users/User/AI-Atomic-Framework/fixtures/**
  - C:/Users/User/AI-Atomic-Framework/docs/**
  - C:/Users/User/AI-Atomic-Framework/schemas/**
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework protected public docs hard-code adopter/private paths
  - C:/Users/User/AI-Atomic-Framework registry mutation from police scanners
  - C:/Users/User/AI-Atomic-Framework second approval workflow or independent task routing implementation
  - C:/Users/User/3KLife/.atm/**
non_goals:
  - 不新增第二套 approval workflow 或獨立任務路由器。
  - 不讓 police finding 直接 mutate registry。
  - 不繞過 ReviewAdvisory.machine-finding 與 HumanReviewDecision。
  - 不把 adopter/private path 寫入 upstream protected public contract。
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex
---

# TASK-APF-0051 — APF roadmap/task metadata consistency repair

## 背景

M14 修補 APF 文件控制面的 drift：早期「產品化」spec card 與 M8 runtime scanner card 命名重疊、APF-0040～0050 frontmatter 規格不一致、Rollback critical path 未明示、shared gate 方法語意不夠清楚。

## 執行範圍

- 回寫主計畫書 M14 章節與狀態校準。
- 回寫 TASK-APF-0003～0007、0021～0025、0002、0011、0040～0050。
- 更新 tasks README 的 Spec -> Runtime scanner 對照與 Rollback critical path。
- 開 APF-0052 / APF-0053 兩張 hardening 任務卡。

## 驗收標準

- APF-0003～0007 標成 design spec，並指向 runtime successor。
- APF-0021～0025 標出 design source task。
- APF-0040～0050 frontmatter 補齊 allowed_files / forbidden_files / non_goals。
- 主計畫書以 upstream symbol / fixture / validator evidence 校準 M10～M13 狀態。

## 建議驗證

- `npm run validate:police-family`
- `npm run validate:review-advisory`
- `npm run validate:evidence-detector`
- `npm run check:encoding:touched`

## Notes

2026-05-19 | 狀態: done | 驗證: M14 document repair | 變更: 本卡完成文件控制面一致性修補，不修改 upstream runtime。
