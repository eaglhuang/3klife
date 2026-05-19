---
doc_id: doc_other_0699
task_id: TASK-APF-0048
title: Contract Drift Check inside Registry Consistency Police
milestone: M12
status: done
artifact_status: done
runtime_status: done
upstream_mutation_status: applied
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
