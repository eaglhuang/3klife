---
doc_id: doc_index_1005
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-05-25
last_updated: 2026-05-26
---

# AAO Task Index

Related plan: [../ATM Agent-First 可操作性優化計畫書.md](../ATM Agent-First 可操作性優化計畫書.md)

## 新格式任務卡規範

每張任務卡都要符合 `atm-task-card-authoring` 合約：

- `scopePaths`: AI 可以修改的 target repo 檔案或 glob。
- `deliverables`: 實際交付物，不能只寫 `.atm/history/**`。
- `validators`: 可重現驗證命令。
- `evidence.required: command-backed`: 完成時必須有 command-backed evidence。
- `rollback`: 回滾方式。
- `atomizationImpact`: owner atom/map 與 map 更新。

新增 script / CLI / validator / report / artifact 的任務，必須在同一張卡要求更新 atomization ownership map。

## Task Roster

| Task ID | Title | Status | Depends | Target surface | Primary validators |
|---|---|---|---|---|---|
| [TASK-AAO-0000](./TASK-AAO-0000-doc-finalize-bridge-index.task.md) | AAO 文件區初始化與 ASA bridge index | done | none | `docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md`<br>`docs/ai_atomic_framework/atm-agent-first-operability/README.md` | `node atm.mjs tasks import --from "C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md" --dry-run --json`<br>`git diff --check` |
| [TASK-AAO-0001](./TASK-AAO-0001-report-overlap-matrix-routing.task.md) | Overlap matrix 與路由裁決 | done | `TASK-AAO-0000` | `docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md`<br>`docs/ai_atomic_framework/atm-agent-first-operability/README.md` | `node atm.mjs tasks import --from "C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md" --dry-run --json`<br>`git diff --check` |
| [TASK-AAO-0002](./TASK-AAO-0002-cli-spec-runner-ssot-drift-guard.task.md) | CLI command spec / runner SSOT drift guard | planned | `TASK-AAO-0001` | `packages/cli/src/commands/command-specs.ts`<br>`packages/cli/src/commands/command-specs/**` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0003](./TASK-AAO-0003-next-decisiontrail-json-contract.task.md) | next decisionTrail JSON contract | planned | `TASK-AAO-0001`, `TASK-AAO-0002` | `packages/cli/src/commands/next.ts`<br>`packages/cli/src/commands/task-intent.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0004](./TASK-AAO-0004-validator-failure-envelope-normalization.task.md) | Validator failure envelope 標準化 | planned | `TASK-AAO-0001` | `scripts/run-validators.ts`<br>`scripts/lib/**` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0005](./TASK-AAO-0005-cli-context-slimming-wave1.task.md) | CLI context slimming wave 1 | planned | `TASK-AAO-0002`, `TASK-AAO-0003` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/next.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0006](./TASK-AAO-0006-docs-schema-command-drift-guard.task.md) | Docs / schema / command drift guard | planned | `TASK-AAO-0002`, `TASK-AAO-0004` | `docs/**`<br>`schemas/**` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0007](./TASK-AAO-0007-onefile-size-startup-budget.task.md) | Onefile size / startup budget | planned | `TASK-AAO-0001` | `scripts/build-onefile-release.ts`<br>`scripts/validate-onefile-budget.ts` | `npm run build`<br>`node --strip-types scripts/validate-onefile-budget.ts` |
| [TASK-AAO-0008](./TASK-AAO-0008-roadmap-backwrite-bridge-closure.task.md) | AAO roadmap backwrite 與 ASA bridge closure | planned | `TASK-AAO-0005`, `TASK-AAO-0006`, `TASK-AAO-0007` | `docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md`<br>`docs/ai_atomic_framework/atm-agent-first-operability/README.md` | `node atm.mjs tasks import --from "C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md" --dry-run --json`<br>`git diff --check` |
| [TASK-AAO-0009](./TASK-AAO-0009-opus47-feedback-bridge.task.md) | 匯入 Opus 4.7 feedback 與任務橋接 | planned | `TASK-AAO-0008` | `docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md`<br>`docs/ai_atomic_framework/atm-agent-first-operability/README.md` | `node atm.mjs tasks import --from "C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md" --dry-run --json`<br>`git diff --check` |
| [TASK-AAO-0010](./TASK-AAO-0010-scope-amendment-cli.task.md) | 正式 tasks scope --add scope amendment CLI | planned | `TASK-AAO-0009` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/task-direction.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0011](./TASK-AAO-0011-untracked-file-scope-warnings.task.md) | Claim/checkpoint 忽略 unrelated untracked | planned | `TASK-AAO-0009` | `packages/cli/src/commands/next.ts`<br>`packages/cli/src/commands/batch.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0012](./TASK-AAO-0012-direction-lock-allowedfiles-ssot.task.md) | Direction lock allowedFiles 單一真相來源 | planned | `TASK-AAO-0010` | `packages/cli/src/commands/task-direction.ts`<br>`packages/cli/src/commands/work-channels.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0013](./TASK-AAO-0013-batch-checkpoint-partial-ok.task.md) | Checkpoint partial-ok 訊息分層 | planned | `TASK-AAO-0011`, `TASK-AAO-0012` | `packages/cli/src/commands/batch.ts`<br>`packages/cli/src/commands/tasks.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0014](./TASK-AAO-0014-state-aware-batch-playbook.task.md) | State-aware batch playbook | planned | `TASK-AAO-0013` | `packages/cli/src/commands/next.ts`<br>`packages/cli/src/commands/batch.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0015](./TASK-AAO-0015-evidence-validator-catalog.task.md) | evidence validators --list | planned | `TASK-AAO-0014` | `packages/cli/src/commands/evidence.ts`<br>`packages/cli/src/commands/command-specs/evidence.spec.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0016](./TASK-AAO-0016-evidence-run-recent-run.task.md) | evidence run / --recent-run 快速入口 | planned | `TASK-AAO-0015` | `packages/cli/src/commands/evidence.ts`<br>`packages/cli/src/commands/work-channels.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0017](./TASK-AAO-0017-closure-validator-remediation.task.md) | Closure packet 缺 validator 的可操作修正 | planned | `TASK-AAO-0015` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/batch.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0018](./TASK-AAO-0018-neutrality-staged-only.task.md) | Neutrality scanner staged-only mode | planned | `TASK-AAO-0009` | `scripts/validate-neutrality*.ts`<br>`packages/cli/src/commands/hook.ts` | `npm run typecheck`<br>`npm run validate:neutrality` |
| [TASK-AAO-0019](./TASK-AAO-0019-completion-attestation-schema.task.md) | Completion attestation schema | planned | `TASK-AAO-0017` | `schemas/**`<br>`packages/cli/src/commands/hook.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0020](./TASK-AAO-0020-public-command-coverage-score.task.md) | Public command coverage scorer 修正 | planned | `TASK-AAO-0002` | `scripts/src/atomize-score.js`<br>`packages/cli/src/commands/command-specs/**` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0021](./TASK-AAO-0021-readable-ref-score-integration.task.md) | Readable ref scorer 整合 | planned | `TASK-AAO-0020` | `scripts/src/atomize-score.js`<br>`scripts/validate-atom-callsite-readability.ts` | `npm run typecheck`<br>`npm run validate:atom-callsite-readability` |
| [TASK-AAO-0022](./TASK-AAO-0022-rollback-proof-evidence.task.md) | Rollback-proof evidence | planned | `TASK-AAO-0016` | `schemas/**`<br>`packages/cli/src/commands/evidence.ts` | `npm run typecheck`<br>`node --strip-types scripts/validate-rollback-proof.ts` |
| [TASK-AAO-0023](./TASK-AAO-0023-map-spec-schema-validator.task.md) | Map spec schema validator | planned | `TASK-AAO-0006` | `atomic_workbench/maps/**`<br>`schemas/**` | `npm run typecheck`<br>`node --strip-types scripts/validate-map-spec-schema.ts` |
| [TASK-AAO-0024](./TASK-AAO-0024-batch-status-progress.task.md) | batch status 增強 | planned | `TASK-AAO-0014` | `packages/cli/src/commands/batch.ts`<br>`packages/cli/src/commands/command-specs/batch.spec.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0025](./TASK-AAO-0025-tasks-show-planning-doc.task.md) | tasks show --planning-doc | planned | `TASK-AAO-0010` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/command-specs/tasks.spec.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0026](./TASK-AAO-0026-atm-status-overview.task.md) | atm status 綜覽 | planned | `TASK-AAO-0024`, `TASK-AAO-0025` | `packages/cli/src/commands/status.ts`<br>`packages/cli/src/commands/index.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0027](./TASK-AAO-0027-dev-runner-guidance.task.md) | dev runner 提示 | planned | `TASK-AAO-0026` | `atm.mjs`<br>`atm.dev.mjs` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0028](./TASK-AAO-0028-batch-playbook-docs.task.md) | batch playbook 文件化 | done | `TASK-AAO-0014` | `docs/governance/batch-playbook.md`<br>`templates/agent-pack/**`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` | `npm run typecheck`<br>`npm run validate:cli`<br>`node atm.mjs integration verify codex --json` |
| [TASK-AAO-0029](./TASK-AAO-0029-task-lifecycle-deprecation.task.md) | Low-level task lifecycle deprecation | planned | `TASK-AAO-0014`, `TASK-AAO-0028` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/command-specs/tasks.spec.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0030](./TASK-AAO-0030-crlf-policy.task.md) | CRLF policy | planned | `TASK-AAO-0009` | `.gitattributes`<br>`docs/governance/line-ending-policy.md` | `git diff --check`<br>`node --strip-types scripts/validate-line-endings.ts` |
| [TASK-AAO-0031](./TASK-AAO-0031-background-work-pause-advisory.task.md) | Background work pause advisory | planned | `TASK-AAO-0024` | `packages/cli/src/commands/status.ts`<br>`packages/cli/src/commands/handoff.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0032](./TASK-AAO-0032-artifact-commit-policy.task.md) | Artifact commit policy 收斂 | planned | `TASK-AAO-0019` | `packages/cli/src/commands/hook.ts`<br>`scripts/validate-task-ledger-governance.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0033](./TASK-AAO-0033-aao-final-dogfood-sync.task.md) | Final dogfood rerun 與雙 repo sync | planned | `TASK-AAO-0020`, `TASK-AAO-0021`, `TASK-AAO-0022`, `TASK-AAO-0023`, `TASK-AAO-0028`, `TASK-AAO-0032` | `scripts/validate-atm-self-atomization.ts`<br>`atomic_workbench/reports/**` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0034](./TASK-AAO-0034-next-selector-routing-memory.task.md) | next explicit selector 與 routing memory | planned | `TASK-AAO-0001`, `TASK-AAO-0003`, `TASK-AAO-0024`, `TASK-AAO-0026` | `packages/cli/src/commands/next.ts`<br>`packages/cli/src/commands/task-intent.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0035](./TASK-AAO-0035-command-surface-consolidation-help-examples.task.md) | Command surface consolidation 與 help examples | planned | `TASK-AAO-0002`, `TASK-AAO-0014`, `TASK-AAO-0029`, `TASK-AAO-0034` | `packages/cli/src/commands/command-specs/**`<br>`packages/cli/src/commands/command-specs.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0036](./TASK-AAO-0036-aao-acceptance-test-plan-premises.task.md) | AAO acceptance test plan 與前提固化 | done | `TASK-AAO-0033`, `TASK-AAO-0034`, `TASK-AAO-0035` | `docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md`<br>`docs/ai_atomic_framework/atm-agent-first-operability/tasks/README.md`<br>`docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0036-aao-acceptance-test-plan-premises.task.md` | `node atm.mjs tasks import --from "C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md" --dry-run --json`<br>`git diff --check` |

## Notes

- `TASK-AAO-0000` 保持 `done`，只重寫格式，不重新執行。
- `TASK-AAO-0001`、`TASK-AAO-0028`、`TASK-AAO-0036` 已標記為 `done`；其餘 `TASK-AAO-0002` 到 `TASK-AAO-0035`（扣除 0028）仍為 `planned`，等待後續 ATM batch/normal flow 實作。`TASK-AAO-0036` 是 planning-only doc 任務（closure_authority: planning_repo）。`TASK-AAO-0028` 是 docs-only 任務但 closure 在 AI-Atomic-Framework，因為 deliverables 是 `docs/governance/` 與 `templates/agent-pack/` 而非 planning prose。
- AAO planning truth 留在 3KLife；target implementation 回到 AI-Atomic-Framework。

## M13 Follow-up Task Roster

| Task ID | Title | Status | Depends | Target surface | Primary validators |
|---|---|---|---|---|---|
| [TASK-AAO-0037](./TASK-AAO-0037-batch-checkpoint-commit-window.task.md) | Batch checkpoint commit window | planned | `TASK-AAO-0013`, `TASK-AAO-0014`, `TASK-AAO-0024`, `TASK-AAO-0032` | `packages/cli/src/commands/batch.ts`<br>`packages/cli/src/commands/hook.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-task-direction-governance.ts --mode validate` |
| [TASK-AAO-0038](./TASK-AAO-0038-task-import-contract-fidelity.task.md) | Task import contract fidelity | planned | `TASK-AAO-0012`, `TASK-AAO-0025`, `TASK-AAO-0034`, `TASK-AAO-0036` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/next.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`npm run validate:prompt-scoped-next` |
| [TASK-AAO-0039](./TASK-AAO-0039-planning-only-ledger-audit-boundary.task.md) | Planning-only ledger audit boundary | planned | `TASK-AAO-0025`, `TASK-AAO-0038` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/hook.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-task-ledger-governance.ts --mode validate` |
| [TASK-AAO-0040](./TASK-AAO-0040-sandbox-git-process-diagnostic.task.md) | Sandbox git process diagnostics | planned | `TASK-AAO-0004`, `TASK-AAO-0026` | `packages/cli/src/commands/hook.ts`<br>`scripts/validate-cli.ts` | `npm run typecheck`<br>`npm run validate:cli` |

## M14 Batch Interruption / Planning Root / Resume Task Roster

| Task ID | Title | Status | Depends | Target surface | Primary validators |
|---|---|---|---|---|---|
| [TASK-AAO-0041](./TASK-AAO-0041-batch-checkpoint-hold.task.md) | batch checkpoint --hold | planned | `TASK-AAO-0037`, `TASK-AAO-0024` | `packages/cli/src/commands/batch.ts`<br>`packages/cli/src/commands/task-direction.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-task-direction-governance.ts --mode validate` |
| [TASK-AAO-0042](./TASK-AAO-0042-batch-repair-continue.task.md) | batch repair / continue | planned | `TASK-AAO-0024`, `TASK-AAO-0037`, `TASK-AAO-0041` | `packages/cli/src/commands/batch.ts`<br>`packages/cli/src/commands/status.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-task-direction-governance.ts --mode validate` |
| [TASK-AAO-0043](./TASK-AAO-0043-planning-repo-root-resolver.task.md) | planning repo root resolver | planned | `TASK-AAO-0038`, `TASK-AAO-0039` | `packages/cli/src/commands/next.ts`<br>`packages/cli/src/commands/tasks.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-prompt-scoped-next.ts` |
| [TASK-AAO-0044](./TASK-AAO-0044-batch-skip-resume.task.md) | batch skip / resume | planned | `TASK-AAO-0042` | `packages/cli/src/commands/batch.ts`<br>`packages/cli/src/commands/tasks.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-task-ledger-governance.ts --mode validate` |

M14 cards are opened because they introduce new user-visible commands or runtime state. The other feedback items were folded into existing AAO cards as stronger acceptance criteria.
## M15 Throughput Acceleration / Safe Parallelism Task Roster

| Task ID | Title | Status | Depends | Target surface | Primary validators |
|---|---|---|---|---|---|
| [TASK-AAO-0045](./TASK-AAO-0045-nonoverlap-subagent-execution-policy.task.md) | non-overlap subagent execution policy | planned | `TASK-AAO-0024`, `TASK-AAO-0034`, `TASK-AAO-0041`, `TASK-AAO-0042` | `packages/cli/src/commands/batch.ts`<br>`packages/cli/src/commands/next.ts`<br>`packages/cli/src/commands/task-direction.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-task-direction-governance.ts --mode validate` |

M15 is intentionally after compact output, claim idempotency, validator cache, and repair diagnostics. Subagents are useful only when ATM can prove non-overlap.

## P0 Early Unblockers

Run or prioritize these cards before lower-risk AAO throughput work:

| Task ID | Reason |
|---|---|
| `TASK-AAO-0037` | Batch checkpoint commit window; prevents next queue-head lock from blocking the previous task commit. |
| `TASK-AAO-0027` | Source/frozen runner consistency; prevents stale frozen hooks from forcing `--no-verify`. |
| `TASK-AAO-0034` | Explicit selector and intent routing; prevents unrelated task fallback and premature next-task claim. |
| `TASK-AAO-0040` | Sandbox git process diagnostics; turns EPERM into a repair command. |
| `TASK-AAO-0046` | Validator baseline noise diagnostics; separates unrelated baseline failures from current-task failures. |

## M16 Validator Baseline Noise Follow-up

| Task ID | Title | Status | Depends | Target surface | Primary validators |
|---|---|---|---|---|---|
| [TASK-AAO-0046](./TASK-AAO-0046-validator-baseline-noise-diagnostics.task.md) | Validator baseline noise diagnostics | planned | `TASK-AAO-0004`, `TASK-AAO-0015`, `TASK-AAO-0017` | `scripts/run-validators.ts`<br>`scripts/lib/validator-envelope.ts`<br>`packages/cli/src/commands/hook.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`npm run validate:standard` |

## M16 P0 Throughput Acceleration Bundle

| Task ID | Title | Status | Depends | Target surface | Primary validators |
|---|---|---|---|---|---|
| [TASK-AAO-0047](./TASK-AAO-0047-p0-throughput-acceleration-bundle.task.md) | P0 throughput acceleration bundle | planned | `TASK-AAO-0024`, `TASK-AAO-0027`, `TASK-AAO-0034`, `TASK-AAO-0037`, `TASK-AAO-0040`, `TASK-AAO-0046` | `packages/cli/src/commands/batch.ts`<br>`packages/cli/src/commands/next.ts`<br>`packages/cli/src/commands/hook.ts`<br>`scripts/run-validators.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-task-direction-governance.ts --mode validate` |
