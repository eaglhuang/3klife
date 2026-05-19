---
doc_id: doc_index_0020
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-05-17T00:00:00+08:00
created_by_agent: vs-insiders-gpt-5.4
last_updated: 2026-05-19T00:00:00+08:00
---

# ATM 引導工程 Task Cards

本索引追蹤 `ATM引導工程計畫書.md` 對應的 upstream framework 任務卡。任務卡只描述 AI-Atomic-Framework 的引導層、agent entry、integration adapter、版本治理、pinned runner 與 release 安全網，不直接治理 3KLife 或 npc-brain 的業務功能。

## 任務索引

| Task ID | 任務 | 里程碑 | 狀態 | 依賴 |
|---|---|---|---|---|
| [TASK-APO-0000](./TASK-APO-0000-doc-finalize.task.md) | 文件定稿與 cross-link | M1 | done | 無 |
| [TASK-APO-0001](./TASK-APO-0001-architecture-readme-crosslink.task.md) | ATM ARCHITECTURE / README cross-link | M1 | done | 0000 |
| [TASK-APO-0002](./TASK-APO-0002-agent-pack-sdk-manifest.task.md) | Agent Pack SDK 與 manifest schema | M2 | done | 0000 |
| [TASK-APO-0003](./TASK-APO-0003-claude-code-pack-mvp.task.md) | Claude Code Pack MVP | M2 | done | 0002 |
| [TASK-APO-0004](./TASK-APO-0004-atmchart-render-pipeline.task.md) | Rule Render / ATMChart Pipeline | M3 | done | 0002 |
| [TASK-APO-0005](./TASK-APO-0005-rule-justification-gate.task.md) | Rule Justification Gate | M4 | done | 0004 |
| [TASK-APO-0006](./TASK-APO-0006-multi-agent-pack-expansion.task.md) | Multi-Agent Pack 擴張 | M5 | done | 0003 |
| [TASK-APO-0007](./TASK-APO-0007-npm-create-atm.task.md) | npm publish + create-atm | M6 | done | 0003 / 0004 |
| [TASK-APO-0008](./TASK-APO-0008-atm-welcome-entry.task.md) | atm welcome 第一入口 | M7 | done | 0003 / 0004 |
| [TASK-APO-0009](./TASK-APO-0009-next-action-hint-mrp.task.md) | Slash Command nextActionHint 移除 MRP | M8 | done | 0003 / TASK-MRP-0009 |
| [TASK-APO-0010](./TASK-APO-0010-agent-matrix-generator.task.md) | Agent matrix generator | M5 | done | 0006 |
| [TASK-APO-0011](./TASK-APO-0011-framework-chart-version-contract.task.md) | Framework / ATMChart version contract | M6 | done | 無 |
| [TASK-APO-0012](./TASK-APO-0012-version-compatibility-gate.task.md) | Version compatibility / breaking-change gate | M7 | done | 0011 |
| [TASK-APO-0013](./TASK-APO-0013-migration-tooling-contract.task.md) | Migration tooling contract + fixtures | M8 | open | 0012 |
| [TASK-APO-0014](./TASK-APO-0014-release-trust-chain.task.md) | Release trust chain, provenance, SBOM, integrity | M8 | open | 0012 |
| [TASK-APO-0015](./TASK-APO-0015-release-incident-response.task.md) | Release incident response + known-bad-versions | M8 | open | 0014 |
| [TASK-APO-0016](./TASK-APO-0016-version-skew-matrix-ci.task.md) | Version skew matrix CI | M8 | open | 0012 |
| [TASK-APO-0017](./TASK-APO-0017-longtail-user-safeguards.task.md) | Long-tail user safeguards | M9 | open | 0012 |
| [TASK-APO-0018](./TASK-APO-0018-security-policy.task.md) | Security policy + advisory branch | M8 | open | 無 |
| [TASK-APO-0019](./TASK-APO-0019-dist-tag-policy.task.md) | Dist-tag policy + pre-release | M8 | open | 無 |
| [TASK-APO-0020](./TASK-APO-0020-telemetry-sentinel-dashboard.task.md) | Telemetry + adopter sentinel + deprecation dashboard | M10 | open | 0018 |
| [TASK-APO-0021](./TASK-APO-0021-meta-schema-versioning.task.md) | Meta-schema versioning, invariants, manifest, chart frontmatter | M9 | open | 0012 |
| [TASK-APO-0022](./TASK-APO-0022-bridge-minor-experimental.task.md) | Bridge minor + `@experimental` API | M9 | open | 0013 |
| [TASK-APO-0023](./TASK-APO-0023-policy-self-versioning.task.md) | Policy self-versioning + auto matrix PR | M10 | open | 無 |
| [TASK-APO-0024](./TASK-APO-0024-time-minor-deprecation-canary.task.md) | Time+minor deprecation + canary rollout | M10 | open | 0013 |
| [TASK-APO-0025](./TASK-APO-0025-existing-root-entry-injection.task.md) | 既有 README / AGENTS 的 loop-free ATM 入口注入 | M4 | done | 0007 / 0008 |
| [TASK-APO-0026](./TASK-APO-0026-codex-official-integration.task.md) | Codex editor integration 正式化 | M3 | done | 0006 |
| [TASK-APO-0027](./TASK-APO-0027-pinned-runner-auto-install.task.md) | Pinned Runner Auto-Install During Init/Bootstrap | M4 | done | 0025 |
| [TASK-APO-0028](./TASK-APO-0028-first-use-user-notice.task.md) | First-use user notice 與 suggested actions | M4 | done | 0027 |
| [TASK-APO-0029](./TASK-APO-0029-atm-task-plan-import-flow.task.md) | ATM Task Plan Import and Work Item Opening Flow | M5 | open | 0028 |
| [TASK-APO-0030](./TASK-APO-0030-python-language-adapter-plugin.task.md) | Python Language Adapter / Plugin | M5 | open | 0028 |

## 維護規則

- 任務進入 `done` 前必須在 task card 的 Notes 寫入實際 validation command。
- 任務若改動 public-facing 文件，需同步更新 doc-id registry 或相關 shard。
- Agent-specific 任務不得直接修改 `packages/core/`，除非該任務明確被升級為 core behavior 或 registry contract。
- 所有 editor / agent entry 最後都必須回到 `node atm.mjs next --json`，不得形成第二套治理協議。
- root `atm.mjs` 是 official onboarding 的一部分；使用者不應被要求手動從 upstream 複製 onefile runner。
- first-use notice 是給 Agent 轉述的人類提示，不是新的流程權威；真正下一步仍以 `nextAction.command` 為準。
