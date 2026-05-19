---
doc_id: doc_other_0696
task_id: TASK-APF-0045
title: Evidence Integrity Gate shared contract
milestone: M12
status: done
artifact_status: done
runtime_status: shared-gate-active
upstream_mutation_status: applied
started_at: "2026-05-19T00:00:00+08:00"
started_by_agent: ClaudeCode_Opus4.7
blocked_by: [TASK-APF-0040]
owner: atm-core
priority: P0
related_plan: docs/ai_atomic_framework/atomic-police-family/原子警察家族計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:police-family
public_tracking: false
executionMode: upstream-runtime-change
non_goals:
  - 不新增第二套 approval workflow 或獨立任務路由器。
  - 不讓 police finding 直接 mutate registry。
  - 不繞過 ReviewAdvisory.machine-finding 與 HumanReviewDecision。
  - 不把 adopter/private path 寫入 upstream protected public contract。
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework protected public docs hard-code adopter/private paths
  - C:/Users/User/AI-Atomic-Framework registry mutation from police scanners
  - C:/Users/User/AI-Atomic-Framework second approval workflow or independent task routing implementation
  - C:/Users/User/3KLife/.atm/**
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atomic-police-family/**
  - C:/Users/User/AI-Atomic-Framework/packages/**
  - C:/Users/User/AI-Atomic-Framework/scripts/**
  - C:/Users/User/AI-Atomic-Framework/tests/**
  - C:/Users/User/AI-Atomic-Framework/fixtures/**
  - C:/Users/User/AI-Atomic-Framework/docs/**
  - C:/Users/User/AI-Atomic-Framework/schemas/**
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex
---

# TASK-APF-0045 — Evidence Integrity Gate shared contract

## 背景

所有 police finding 與 proposal draft 都依賴 evidence，因此需要共用 gate 檢查 evidence 是否 stale、missing、duplicate、untrusted 或 schema mismatch。

## 執行範圍

- 定義 evidence integrity report shape。
- 定義 stale/missing/duplicate/untrusted/schema mismatch triggers。
- 定義 official evidence type 與 police-local artifact ref 的檢查方式。

## 驗收標準

- 缺 evidence ref 的 proposal draft 會產 integrity finding。
- stale base evidence 會被標記。
- duplicate evidence 不會造成重複 finding。

## 建議驗證

- `npm run validate:police-family`
- `npm run validate:evidence-detector`

## Notes

2026-05-19 | 狀態: open | 驗證: pending | 變更: Evidence Integrity 是 shared gate，不是獨立 police family。
2026-05-19 | 狀態: done | 驗證: pass | 變更: family.ts 新增 runEvidenceIntegrityGate + EvidenceCatalogEntry + EvidenceIntegrityGateInput + DEFAULT_EVIDENCE_MAX_AGE_MS=30天。triggers: evidence-missing / evidence-stale / evidence-duplicate / evidence-untrusted / evidence-schema-mismatch。Gate 不獨立成 police family，輸出由 PoliceFamilyGateReport.sharedGates 收納。4 個 fixture（1 positive + 3 negative）通過。
