---
doc_id: doc_index_0023
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/atomic-police-family/原子警察家族計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# 原子警察家族 Task Cards

本目錄追蹤 APF 原子警察家族任務卡。M14 後的讀法是：`status` 表示任務卡生命週期，`artifact_status` 表示文件/spec 狀態，`runtime_status` 才表示 scanner/facade/gate 是否已接進 upstream runtime。

APF-0003～0007 是 design spec；APF-0021～0025 是對應 runtime scanner。APF-0043/0044 Rollback Police 是現有 atomize/evolve/map replacement 流程的 critical path，排序優先於擴大 APF-0041/0042 Polymorph Police 使用。

## Spec -> Runtime scanner 對照

| Spec card | Runtime scanner card | 說明 |
|---|---|---|
| TASK-APF-0003 | TASK-APF-0021 | Dedup Police |
| TASK-APF-0004 | TASK-APF-0022 | Demand Police |
| TASK-APF-0005 | TASK-APF-0023 | Quality Police |
| TASK-APF-0006 | TASK-APF-0024 | Map Integration Police |
| TASK-APF-0007 | TASK-APF-0025 | Atomization Police |

## Rollback critical path

| 順位 | Task | 理由 |
|---|---|---|
| 1 | TASK-APF-0043 / TASK-APF-0044 | 先守住 reversibility / rollback proof，保護已 active 的 atomize、evolve、map replacement |
| 2 | TASK-APF-0041 / TASK-APF-0042 | 再擴大 polymorph template / instance governance |
| 3 | TASK-APF-0045～0048 | shared gates / contract drift hardening |
| 4 | TASK-APF-0049～0050 | profile、CLI、fixtures closure |

## 索引

| Task ID | 標題 | Milestone | 狀態 | artifact_status | runtime_status | Depends |
|---|---|---|---|---|---|---|
| [TASK-APF-0030](./TASK-APF-0030-police-family-taxonomy-extension-decomposition-evolution.task.md) | Police family taxonomy extension for Decomposition and Evolution Police | M10 | done | done | done | TASK-APF-0029 |
| [TASK-APF-0031](./TASK-APF-0031-source-inventory-large-surface-scanner-contract.task.md) | Source inventory and large-surface scanner contract | M10 | done | done | done | TASK-APF-0030 |
| [TASK-APF-0032](./TASK-APF-0032-decomposition-police-named-scanner.task.md) | Decomposition Police named scanner | M10 | done | done | done | TASK-APF-0031 |
| [TASK-APF-0033](./TASK-APF-0033-decomposition-plan-atomic-map-recommendation-bridge.task.md) | Decomposition plan to atomic-map recommendation bridge | M10 | done | done | done | TASK-APF-0032 |
| [TASK-APF-0034](./TASK-APF-0034-evidence-evolution-signal-policy.task.md) | Evidence evolution signal policy | M10 | done | done | done | TASK-APF-0030 |
| [TASK-APF-0035](./TASK-APF-0035-evolution-police-named-scanner.task.md) | Evolution Police named scanner | M10 | done | done | done | TASK-APF-0034 |
| [TASK-APF-0036](./TASK-APF-0036-suppression-recurrence-stale-base-safeguards.task.md) | Suppression, recurrence, and stale-base safeguards | M11 | done | done | done | TASK-APF-0034 / TASK-APF-0035 |
| [TASK-APF-0037](./TASK-APF-0037-orchestrator-profile-cli-wiring-decomposition-evolution.task.md) | Orchestrator, profile, and CLI wiring for Decomposition/Evolution Police | M11 | done | done | done | TASK-APF-0032 / TASK-APF-0035 |
| [TASK-APF-0038](./TASK-APF-0038-fixtures-validators-new-police-families.task.md) | Fixtures and validators for new police families | M11 | done | done | done | TASK-APF-0037 |
| [TASK-APF-0039](./TASK-APF-0039-roadmap-backwrite-m10-m11-closure.task.md) | Roadmap backwrite and M10/M11 closure | M11 | done | done | done | TASK-APF-0038 |
| [TASK-APF-0040](./TASK-APF-0040-police-taxonomy-extension-polymorph-rollback.task.md) | Police taxonomy extension for Polymorph and Rollback Police | M12 | done | done | done | TASK-APF-0039 |
| [TASK-APF-0041](./TASK-APF-0041-polymorph-police-contract-read-model.task.md) | Polymorph Police contract and read model | M12 | done | done | done | TASK-APF-0040 |
| [TASK-APF-0042](./TASK-APF-0042-polymorph-police-named-scanner.task.md) | Polymorph Police named scanner | M12 | done | done | done | TASK-APF-0041 |
| [TASK-APF-0043](./TASK-APF-0043-rollback-police-contract-reversibility-model.task.md) | Rollback Police contract and reversibility model | M12 | done | done | done | TASK-APF-0040 |
| [TASK-APF-0044](./TASK-APF-0044-rollback-police-named-scanner.task.md) | Rollback Police named scanner | M12 | done | done | done | TASK-APF-0043 |
| [TASK-APF-0045](./TASK-APF-0045-evidence-integrity-gate-shared-contract.task.md) | Evidence Integrity Gate shared contract | M12 | done | done | shared-gate-active | TASK-APF-0040 |
| [TASK-APF-0046](./TASK-APF-0046-reversibility-gate-shared-contract.task.md) | Reversibility Gate shared contract | M12 | done | done | shared-gate-active | TASK-APF-0043 |
| [TASK-APF-0047](./TASK-APF-0047-noise-control-gate-shared-contract.task.md) | Noise Control Gate shared contract | M12 | done | done | shared-gate-active | TASK-APF-0036 / TASK-APF-0040 |
| [TASK-APF-0048](./TASK-APF-0048-contract-drift-check-registry-consistency.task.md) | Contract Drift Check inside Registry Consistency Police | M12 | done | done | registry-consistency-extension-active | TASK-APF-0040 |
| [TASK-APF-0049](./TASK-APF-0049-orchestrator-profile-cli-wiring-polymorph-rollback-shared-gates.task.md) | Orchestrator/profile/CLI wiring for Polymorph/Rollback/shared gates | M13 | done | done | done | TASK-APF-0042 / TASK-APF-0044 / TASK-APF-0045 / TASK-APF-0046 / TASK-APF-0047 / TASK-APF-0048 |
| [TASK-APF-0050](./TASK-APF-0050-fixtures-validators-m12-m13-closure.task.md) | Fixtures, validators, and M12/M13 closure | M13 | done | done | done | TASK-APF-0049 |
| [TASK-APF-0051](./TASK-APF-0051.task.md) | APF roadmap/task metadata consistency repair | M14 | done | done | n/a | TASK-APF-0050 |
| [TASK-APF-0052](./TASK-APF-0052.task.md) | Adopter-neutrality scanner and negative fixtures | M14 | done | done | registry-consistency-extension-active | TASK-APF-0051 |
| [TASK-APF-0053](./TASK-APF-0053.task.md) | Validator profile naming and advisory-only hardening | M14 | done | done | done | TASK-APF-0051 |

## 補充規則

- 所有 police finding 都必須走 ReviewAdvisory.machine-finding + metadata.policeFinding + HumanReviewDecision。
- 不新增獨立任務路由器或第二套 approval workflow。
- 新 scanner 產品化前必須有 positive / negative fixtures。
- APF-0052 / APF-0053 hardening 任務已於 2026-05-19 完成：runAdopterNeutralityCheck（registry-consistency extension）+ verifyAdvisoryOnlyHardening + VALIDATOR_PROFILE_NAMING_CONTRACT；既有 M12/M13 runtime 未被降級。