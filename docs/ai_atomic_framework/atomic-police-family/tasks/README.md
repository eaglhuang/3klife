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

本目錄追蹤 APF 原子警察家族任務卡。APF-0030～0039 已於 2026-05-19 完成 Decomposition Police 與 Evolution Police 的 runtime 產品化；APF-0040～0050 是 Polymorph Police、Rollback Police 與 shared gates 規劃，仍 planned。

`status: open` 表示 upstream runtime 尚未完成。`artifact_status` 表示文件/spec 狀態，`runtime_status` 才表示實際 scanner/facade/gate 是否落地。

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
| [TASK-APF-0040](./TASK-APF-0040-police-taxonomy-extension-polymorph-rollback.task.md) | Police taxonomy extension for Polymorph and Rollback Police | M12 | open | planned | upstream-api-not-applied | TASK-APF-0039 |
| [TASK-APF-0041](./TASK-APF-0041-polymorph-police-contract-read-model.task.md) | Polymorph Police contract and read model | M12 | open | planned | not-started | TASK-APF-0040 |
| [TASK-APF-0042](./TASK-APF-0042-polymorph-police-named-scanner.task.md) | Polymorph Police named scanner | M12 | open | planned | not-started | TASK-APF-0041 |
| [TASK-APF-0043](./TASK-APF-0043-rollback-police-contract-reversibility-model.task.md) | Rollback Police contract and reversibility model | M12 | open | planned | upstream-api-not-applied | TASK-APF-0040 |
| [TASK-APF-0044](./TASK-APF-0044-rollback-police-named-scanner.task.md) | Rollback Police named scanner | M12 | open | planned | not-started | TASK-APF-0043 |
| [TASK-APF-0045](./TASK-APF-0045-evidence-integrity-gate-shared-contract.task.md) | Evidence Integrity Gate shared contract | M12 | open | planned | shared-gate-planned | TASK-APF-0040 |
| [TASK-APF-0046](./TASK-APF-0046-reversibility-gate-shared-contract.task.md) | Reversibility Gate shared contract | M12 | open | planned | shared-gate-planned | TASK-APF-0043 |
| [TASK-APF-0047](./TASK-APF-0047-noise-control-gate-shared-contract.task.md) | Noise Control Gate shared contract | M12 | open | planned | shared-gate-planned | TASK-APF-0036 / TASK-APF-0040 |
| [TASK-APF-0048](./TASK-APF-0048-contract-drift-check-registry-consistency.task.md) | Contract Drift Check inside Registry Consistency Police | M12 | open | planned | not-started | TASK-APF-0040 |
| [TASK-APF-0049](./TASK-APF-0049-orchestrator-profile-cli-wiring-polymorph-rollback-shared-gates.task.md) | Orchestrator/profile/CLI wiring for Polymorph/Rollback/shared gates | M13 | open | planned | not-started | TASK-APF-0042 / TASK-APF-0044 / TASK-APF-0045 / TASK-APF-0046 / TASK-APF-0047 / TASK-APF-0048 |
| [TASK-APF-0050](./TASK-APF-0050-fixtures-validators-m12-m13-closure.task.md) | Fixtures, validators, and M12/M13 closure | M13 | open | planned | not-started | TASK-APF-0049 |

## 補充規則

- APF-0030～0039 已於 2026-05-19 完成 runtime 產品化（Decomposition + Evolution）；APF-0040～0050 仍 planned / not-started，不得宣稱新增警察已 runtime 產品化。
- Polymorph / Rollback 是 named police family；Evidence Integrity / Reversibility / Noise Control / Contract Drift 是 shared gates。
- 所有 police finding 都必須走 ReviewAdvisory.machine-finding + metadata.policeFinding + HumanReviewDecision。
- 不新增獨立任務路由器或第二套 approval workflow。
- 新 scanner 產品化前必須有 positive / negative fixtures。
