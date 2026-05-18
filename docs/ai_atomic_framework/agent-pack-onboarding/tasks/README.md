---
doc_id: doc_index_0020
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-05-17T00:00:00+08:00
created_by_agent: vs-insiders-gpt-5.4
---

# ATM 引導工程 Task Cards

本目錄收錄「ATM 引導工程計畫書」的內部任務卡（TASK-APO-0000 ~ TASK-APO-0034）。這批卡用於追蹤 upstream framework 的引導工程改造、三角策略 adopter 驗收與 3KLife 實驗畢業流程，不放入公開 repo，避免污染 ATM 未來開源時的核心文件面。

任務卡 = 一張可獨立認領、可獨立驗收的工作單。每張卡都對應計畫書 §15 的里程碑 checklist，並以目前已收斂的 `ATMChart` / `atm-chart` 命名為準。

## 索引

| Task ID | 標題 | 里程碑 | 狀態 | 阻擋者 |
|---|---|---|---|---|
| [TASK-APO-0000](./TASK-APO-0000-doc-finalize.task.md) | 文件定稿與 cross-link | M1 | done | — |
| [TASK-APO-0001](./TASK-APO-0001-architecture-readme-crosslink.task.md) | 對齊 ATM ARCHITECTURE / README cross-link | M1 | done | 0000 |
| [TASK-APO-0002](./TASK-APO-0002-agent-pack-sdk-manifest.task.md) | Agent Pack SDK 介面 + manifest schema | M2 | done | 0000 |
| [TASK-APO-0003](./TASK-APO-0003-claude-code-pack-mvp.task.md) | Claude Code Pack MVP | M2 | done | 0002 |
| [TASK-APO-0004](./TASK-APO-0004-atmchart-render-pipeline.task.md) | Rule Render / ATMChart Pipeline | M3 | done | 0002 |
| [TASK-APO-0005](./TASK-APO-0005-rule-justification-gate.task.md) | Rule Justification Gate | M4 | done | 0004 |
| [TASK-APO-0006](./TASK-APO-0006-multi-agent-pack-expansion.task.md) | Multi-Agent Pack 擴張 | M5 | done | 0003 |
| [TASK-APO-0007](./TASK-APO-0007-npm-create-atm.task.md) | npm publish + create-atm | M6 | done | 0003 / 0004 |
| [TASK-APO-0008](./TASK-APO-0008-atm-welcome-entry.task.md) | atm welcome 一鍵入口 | M7 | done | 0003 / 0004 |
| [TASK-APO-0009](./TASK-APO-0009-next-action-hint-mrp.task.md) | Slash Command nextActionHint 對接 MRP | M8 | done | 0003 / TASK-MRP-0009 |
| [TASK-APO-0010](./TASK-APO-0010-agent-matrix-generator.task.md) | 多 agent 矩陣自動生成 | M5 | done | 0006 |
| [TASK-APO-0011](./TASK-APO-0011-framework-chart-version-contract.task.md) | Framework / ATMChart 版本契約 | M6 | done | — |
| [TASK-APO-0012](./TASK-APO-0012-version-compatibility-gate.task.md) | Version compatibility 與 breaking-change gate | M7 | done | 0011 |
| [TASK-APO-0013](./TASK-APO-0013-migration-tooling-contract.task.md) | Migration tooling contract + fixture 庫 | M8 | open | 0012 |
| [TASK-APO-0014](./TASK-APO-0014-release-trust-chain.task.md) | Release trust chain（provenance + SBOM + integrity） | M8 | open | 0012 |
| [TASK-APO-0015](./TASK-APO-0015-release-incident-response.task.md) | Release incident response + known-bad-versions | M8 | open | 0014 |
| [TASK-APO-0016](./TASK-APO-0016-version-skew-matrix-ci.task.md) | Version skew matrix CI | M8 | open | 0012 |
| [TASK-APO-0017](./TASK-APO-0017-longtail-user-safeguards.task.md) | Long-tail user safeguards | M9 | open | 0012 |
| [TASK-APO-0018](./TASK-APO-0018-security-policy.task.md) | Security policy + advisory branch | M8 | open | — |
| [TASK-APO-0019](./TASK-APO-0019-dist-tag-policy.task.md) | Dist-tag policy + pre-release 規則 | M8 | open | — |
| [TASK-APO-0020](./TASK-APO-0020-telemetry-sentinel-dashboard.task.md) | Telemetry + adopter sentinel + deprecation dashboard | M10 | open | 0018 |
| [TASK-APO-0021](./TASK-APO-0021-meta-schema-versioning.task.md) | Meta-schema versioning（invariants / manifest / chart frontmatter） | M9 | open | 0012 |
| [TASK-APO-0022](./TASK-APO-0022-bridge-minor-experimental.task.md) | Bridge minor + `@experimental` API 通道 | M9 | open | 0013 |
| [TASK-APO-0023](./TASK-APO-0023-policy-self-versioning.task.md) | Policy self-versioning + auto matrix PR | M10 | open | — |
| [TASK-APO-0024](./TASK-APO-0024-time-minor-deprecation-canary.task.md) | Time+minor deprecation + canary rollout | M10 | open | 0013 |
| [TASK-APO-0025](./TASK-APO-0025-triangle-plan-normalization.task.md) | Triangle strategy plan normalization and task split | M0 | done | — |
| [TASK-APO-0026](./TASK-APO-0026-npc-brain-baseline-freeze.task.md) | npc-brain baseline freeze and eligibility report | M1 | open | 0025 |
| [TASK-APO-0027](./TASK-APO-0027-disposable-first-touch-lab.task.md) | Disposable lab first-touch evidence | M2 | open | 0026 |
| [TASK-APO-0028](./TASK-APO-0028-evidence-triage-routing.task.md) | Evidence triage and upstream routing | M3 | open | 0027 |
| [TASK-APO-0029](./TASK-APO-0029-upstream-blocker-repair-batch.task.md) | Upstream blocker repair batch | M4 | open | 0028 |
| [TASK-APO-0030](./TASK-APO-0030-candidate-onboarding-branch.task.md) | npc-brain candidate official onboarding branch | M5 | open | 0029 |
| [TASK-APO-0031](./TASK-APO-0031-adopter-sentinel-integration.task.md) | Existing adopter sentinel integration | M6 | open | 0030 |
| [TASK-APO-0032](./TASK-APO-0032-adopter-evidence-sop.task.md) | Adopter evidence feedback SOP | M7 | open | 0028 |
| [TASK-APO-0033](./TASK-APO-0033-3klife-experiment-graduation.task.md) | 3KLife experiment graduation SOP | M8 | open | 0025 |
| [TASK-APO-0034](./TASK-APO-0034-release-gate-promotion.task.md) | Release gate promotion for adopter validation | M9 | open | 0031 |

## 共通驗收

- 任務卡進入 `done` 前，需提交對應 validation command 與證據摘要。
- 任務卡只能修改自身宣告的檔案；跨卡共修需在 `notes` 註明並建立 lineage 連結。
- Agent-specific 邏輯不得下沉到 `packages/core/`；只能存在於 Agent Operating Layer、Integration Adapter Layer、templates 或 CLI facade。
- 裸 CLI 路徑必須永遠有效：沒有 agent pack、沒有 slash command 時，仍要能用 `node atm.mjs next --json` 完成治理流程。