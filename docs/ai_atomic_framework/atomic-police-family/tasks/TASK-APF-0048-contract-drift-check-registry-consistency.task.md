---
doc_id: doc_other_0699
task_id: TASK-APF-0048
title: Contract Drift Check inside Registry Consistency Police
milestone: M12
status: done
artifact_status: done
runtime_status: registry-consistency-extension-active
upstream_mutation_status: applied
family_scope: registry-consistency-internal-extension
started_at: "2026-05-19T00:00:00+08:00"
started_by_agent: ClaudeCode_Opus4.7
blocked_by: [TASK-APF-0040]
owner: atm-core
priority: P1
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

# TASK-APF-0048 — Contract Drift Check inside Registry Consistency Police

## 背景

Contract Drift Check 先併入 Registry Consistency Police，不獨立成新警察。它負責檢查 atom spec、implementation、test、registry metadata、map member contract 是否漂移。

## 執行範圍

- 定義 contract drift read model。
- 比對 spec/code/test/registry/map member metadata。
- 產出 `contract-drift` finding，交給 Registry Consistency Police family report。

## 驗收標準

- spec 宣告的 entrypoint 與 implementation/test 不一致時產 finding。
- registry metadata stale 時產 finding。
- map member contract drift 時可被 Map Integration / Polymorph Police 消費。

## 建議驗證

- `npm run validate:police-family`
- `npm run validate:registry-consistency`

## Notes

2026-05-19 | 狀態: open | 驗證: pending | 變更: 先併入 Registry Consistency Police，避免警察家族過度膨脹。
2026-05-19 | 狀態: done | 驗證: pass | 變更: family.ts 新增 runRegistryContractDriftCheck + ContractDriftEntry + ContractDriftTrigger (`spec-implementation-drift` / `spec-test-drift` / `registry-metadata-drift` / `map-member-contract-drift`)。輸出由 registry-consistency family 帶（policeFamily='registry-consistency'），不獨立成新 family；orchestrator 自動合併到既有 registry-consistency family。
2026-05-19 | 狀態: done | 驗證: deterministic audit | 變更: M14 確認 Contract Drift Check 是 Registry Consistency Police 內部 extension，不新增獨立 family；upstream 已有 `runRegistryContractDriftCheck` 與 fixtures，因此標記為 registry-consistency-extension-active。
