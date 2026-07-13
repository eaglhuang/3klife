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
| [TASK-AAO-0006](./TASK-AAO-0006-docs-schema-command-drift-guard.task.md) | Docs / schema / command drift guard | done | `TASK-AAO-0002`, `TASK-AAO-0004` | `docs/**`<br>`schemas/**` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0007](./TASK-AAO-0007-onefile-size-startup-budget.task.md) | Onefile size / startup budget | done | `TASK-AAO-0001` | `scripts/build-onefile-release.ts`<br>`scripts/validate-onefile-budget.ts` | `npm run build`<br>`node --strip-types scripts/validate-onefile-budget.ts` |
| [TASK-AAO-0008](./TASK-AAO-0008-roadmap-backwrite-bridge-closure.task.md) | AAO roadmap backwrite 與 ASA bridge closure | planned | `TASK-AAO-0005`, `TASK-AAO-0006`, `TASK-AAO-0007` | `docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md`<br>`docs/ai_atomic_framework/atm-agent-first-operability/README.md` | `node atm.mjs tasks import --from "C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md" --dry-run --json`<br>`git diff --check` |
| [TASK-AAO-0009](./TASK-AAO-0009-opus47-feedback-bridge.task.md) | 匯入 Opus 4.7 feedback 與任務橋接 | planned | `TASK-AAO-0008` | `docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md`<br>`docs/ai_atomic_framework/atm-agent-first-operability/README.md` | `node atm.mjs tasks import --from "C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md" --dry-run --json`<br>`git diff --check` |
| [TASK-AAO-0010](./TASK-AAO-0010-scope-amendment-cli.task.md) | 正式 tasks scope --add scope amendment CLI | done | `TASK-AAO-0009` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/task-direction.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0011](./TASK-AAO-0011-untracked-file-scope-warnings.task.md) | Claim/checkpoint 忽略 unrelated untracked | done | `TASK-AAO-0009` | `packages/cli/src/commands/next.ts`<br>`packages/cli/src/commands/batch.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-prompt-scoped-next.ts` |
| [TASK-AAO-0012](./TASK-AAO-0012-direction-lock-allowedfiles-ssot.task.md) | Direction lock allowedFiles 單一真相來源 | done | `TASK-AAO-0010` | `packages/cli/src/commands/task-direction.ts`<br>`packages/cli/src/commands/work-channels.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0013](./TASK-AAO-0013-batch-checkpoint-partial-ok.task.md) | Checkpoint partial-ok 訊息分層 | done | `TASK-AAO-0011`, `TASK-AAO-0012` | `packages/cli/src/commands/batch.ts`<br>`packages/cli/src/commands/tasks.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0014](./TASK-AAO-0014-state-aware-batch-playbook.task.md) | State-aware batch playbook | done | `TASK-AAO-0013` | `packages/cli/src/commands/next.ts`<br>`packages/cli/src/commands/batch.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0015](./TASK-AAO-0015-evidence-validator-catalog.task.md) | evidence validators --list | planned | `TASK-AAO-0014` | `packages/cli/src/commands/evidence.ts`<br>`packages/cli/src/commands/command-specs/evidence.spec.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0016](./TASK-AAO-0016-evidence-run-recent-run.task.md) | evidence run / --recent-run 快速入口 | planned | `TASK-AAO-0015` | `packages/cli/src/commands/evidence.ts`<br>`packages/cli/src/commands/work-channels.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0017](./TASK-AAO-0017-closure-validator-remediation.task.md) | Closure packet 缺 validator 的可操作修正 | planned | `TASK-AAO-0015` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/batch.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0018](./TASK-AAO-0018-neutrality-staged-only.task.md) | Neutrality scanner staged-only mode | planned | `TASK-AAO-0009` | `scripts/validate-neutrality*.ts`<br>`packages/cli/src/commands/hook.ts` | `npm run typecheck`<br>`npm run validate:neutrality` |
| [TASK-AAO-0019](./TASK-AAO-0019-completion-attestation-schema.task.md) | Completion attestation schema | planned | `TASK-AAO-0017` | `schemas/**`<br>`packages/cli/src/commands/hook.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0020](./TASK-AAO-0020-public-command-coverage-score.task.md) | Public command coverage scorer 修正 | done | `TASK-AAO-0002` | `scripts/src/atomize-score.js`<br>`packages/cli/src/commands/command-specs/**` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0021](./TASK-AAO-0021-readable-ref-score-integration.task.md) | Readable ref scorer 整合 | done | `TASK-AAO-0020` | `scripts/src/atomize-score.js`<br>`scripts/validate-atom-callsite-readability.ts` | `npm run typecheck`<br>`npm run validate:atom-callsite-readability` |
| [TASK-AAO-0022](./TASK-AAO-0022-rollback-proof-evidence.task.md) | Rollback-proof evidence | planned | `TASK-AAO-0016` | `schemas/**`<br>`packages/cli/src/commands/evidence.ts` | `npm run typecheck`<br>`node --strip-types scripts/validate-rollback-proof.ts` |
| [TASK-AAO-0023](./TASK-AAO-0023-map-spec-schema-validator.task.md) | Map spec schema validator | done | `TASK-AAO-0006` | `schemas/atom-map.schema.json`<br>`scripts/validate-map-spec-schema.ts`<br>`package.json`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` | `npm run typecheck`<br>`node --strip-types scripts/validate-map-spec-schema.ts`<br>`npm run validate:cli` |
| [TASK-AAO-0024](./TASK-AAO-0024-batch-status-progress.task.md) | batch status 增強 | done | `TASK-AAO-0014` | `packages/cli/src/commands/batch.ts`<br>`packages/cli/src/commands/command-specs/batch.spec.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0025](./TASK-AAO-0025-tasks-show-planning-doc.task.md) | tasks show --planning-doc | planned | `TASK-AAO-0010` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/command-specs/tasks.spec.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0026](./TASK-AAO-0026-atm-status-overview.task.md) | atm status 綜覽 | planned | `TASK-AAO-0024`, `TASK-AAO-0025` | `packages/cli/src/commands/status.ts`<br>`packages/cli/src/commands/index.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0027](./TASK-AAO-0027-dev-runner-guidance.task.md) | dev runner 提示 | planned | `TASK-AAO-0026` | `atm.mjs`<br>`atm.dev.mjs` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0028](./TASK-AAO-0028-batch-playbook-docs.task.md) | batch playbook 文件化 | done | `TASK-AAO-0014` | `docs/governance/batch-playbook.md`<br>`templates/agent-pack/**`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` | `npm run typecheck`<br>`npm run validate:cli`<br>`node atm.mjs integration verify codex --json` |
| [TASK-AAO-0029](./TASK-AAO-0029-task-lifecycle-deprecation.task.md) | Low-level task lifecycle deprecation | planned | `TASK-AAO-0014`, `TASK-AAO-0028` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/command-specs/tasks.spec.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0030](./TASK-AAO-0030-crlf-policy.task.md) | CRLF policy | planned | `TASK-AAO-0009` | `.gitattributes`<br>`docs/governance/line-ending-policy.md` | `git diff --check`<br>`node --strip-types scripts/validate-line-endings.ts` |
| [TASK-AAO-0031](./TASK-AAO-0031-background-work-pause-advisory.task.md) | Background work pause advisory | planned | `TASK-AAO-0024` | `packages/cli/src/commands/status.ts`<br>`packages/cli/src/commands/handoff.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0032](./TASK-AAO-0032-artifact-commit-policy.task.md) | Artifact commit policy 收斂 | planned | `TASK-AAO-0019` | `packages/cli/src/commands/hook.ts`<br>`scripts/validate-task-ledger-governance.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0033](./TASK-AAO-0033-aao-final-dogfood-sync.task.md) | Final dogfood rerun 與雙 repo sync | planned | `TASK-AAO-0020`, `TASK-AAO-0021`, `TASK-AAO-0022`, `TASK-AAO-0023`, `TASK-AAO-0028`, `TASK-AAO-0032` | `scripts/validate-atm-self-atomization.ts`<br>`atomic_workbench/reports/**` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0034](./TASK-AAO-0034-next-selector-routing-memory.task.md) | next explicit selector 與 routing memory | done | `TASK-AAO-0001`, `TASK-AAO-0003`, `TASK-AAO-0024`, `TASK-AAO-0026` | `packages/cli/src/commands/next.ts`<br>`packages/cli/src/commands/task-intent.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0035](./TASK-AAO-0035-command-surface-consolidation-help-examples.task.md) | Command surface consolidation 與 help examples | planned | `TASK-AAO-0002`, `TASK-AAO-0014`, `TASK-AAO-0029`, `TASK-AAO-0034` | `packages/cli/src/commands/command-specs/**`<br>`packages/cli/src/commands/command-specs.ts` | `npm run typecheck`<br>`npm run validate:cli` |
| [TASK-AAO-0036](./TASK-AAO-0036-aao-acceptance-test-plan-premises.task.md) | AAO acceptance test plan 與前提固化 | done | `TASK-AAO-0033`, `TASK-AAO-0034`, `TASK-AAO-0035` | `docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md`<br>`docs/ai_atomic_framework/atm-agent-first-operability/tasks/README.md`<br>`docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0036-aao-acceptance-test-plan-premises.task.md` | `node atm.mjs tasks import --from "C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md" --dry-run --json`<br>`git diff --check` |

## Notes

- `TASK-AAO-0000` 保持 `done`，只重寫格式，不重新執行。
- `TASK-AAO-0001`、`TASK-AAO-0011`、`TASK-AAO-0023`、`TASK-AAO-0028`、`TASK-AAO-0036` 已標記為 `done`；其餘 `TASK-AAO-0002` 到 `TASK-AAO-0035`（扣除 0011、0023、0028）仍為 `planned`，等待後續 ATM batch/normal flow 實作。`TASK-AAO-0036` 是 planning-only doc 任務（closure_authority: planning_repo）。`TASK-AAO-0028` 與 `TASK-AAO-0023` 是 closure 在 AI-Atomic-Framework 的獨立卡（docs + validator/schema）。`TASK-AAO-0011` 落地 next.ts/batch.ts 對 unrelated untracked 的 warning-only 行為。
- AAO planning truth 留在 3KLife；target implementation 回到 AI-Atomic-Framework。

## M13 Follow-up Task Roster

| Task ID | Title | Status | Depends | Target surface | Primary validators |
|---|---|---|---|---|---|
| [TASK-AAO-0037](./TASK-AAO-0037-batch-checkpoint-commit-window.task.md) | Batch checkpoint commit window | done | `TASK-AAO-0013`, `TASK-AAO-0014`, `TASK-AAO-0024`, `TASK-AAO-0032` | `packages/cli/src/commands/batch.ts`<br>`packages/cli/src/commands/hook.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-task-direction-governance.ts --mode validate` |
| [TASK-AAO-0038](./TASK-AAO-0038-task-import-contract-fidelity.task.md) | Task import contract fidelity | planned | `TASK-AAO-0012`, `TASK-AAO-0025`, `TASK-AAO-0034`, `TASK-AAO-0036` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/next.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`npm run validate:prompt-scoped-next` |
| [TASK-AAO-0039](./TASK-AAO-0039-planning-only-ledger-audit-boundary.task.md) | Planning-only ledger audit boundary | planned | `TASK-AAO-0025`, `TASK-AAO-0038` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/hook.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-task-ledger-governance.ts --mode validate` |
| [TASK-AAO-0040](./TASK-AAO-0040-sandbox-git-process-diagnostic.task.md) | Sandbox git process diagnostics | done | `TASK-AAO-0004`, `TASK-AAO-0026` | `packages/cli/src/commands/hook.ts`<br>`scripts/validate-cli.ts` | `npm run typecheck`<br>`npm run validate:cli` |

## M14 Batch Interruption / Planning Root / Resume Task Roster

| Task ID | Title | Status | Depends | Target surface | Primary validators |
|---|---|---|---|---|---|
| [TASK-AAO-0041](./TASK-AAO-0041-batch-checkpoint-hold.task.md) | batch checkpoint --hold | done | `TASK-AAO-0037`, `TASK-AAO-0024` | `packages/cli/src/commands/batch.ts`<br>`packages/cli/src/commands/task-direction.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-task-direction-governance.ts --mode validate` |
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
| `TASK-AAO-0050` | Framework stale lock cleanup guidance; turns completed-task lock leftovers into release-then-fresh-claim guidance. |
| `TASK-AAO-0051` | Mirror-sync commit wrapper support; lets valid mirror-sync-only ledger imports use the formal ATM commit wrapper without claim/session or `--no-verify`. |
| `TASK-AAO-0052` | Validator fixture task id clarity; makes validator fixture ids obviously TEST-TASK-* so they do not read like real task cards. |
| `TASK-AAO-0053` | batch checkpoint 支援 framework critical delivery window，避免 batch queue-head 的 framework-critical 任務卡在互相矛盾的規則中。 |
| `TASK-AAO-0054` | 非任務協作流與 git hook pre-push 隔離優化，防止 feature 分支被 pre-push 誤殺與自然語言 path hints 誤判。 |
| `TASK-AAO-0055` | 解決 done task 缺失實質憑證時的 claim/close 互鎖死路，提供直覺的 tasks reconcile / reopen 官方協調入口。 |
| `TASK-AAO-0056` | 一鍵式 deliver-and-close macro 機制，整合交付、憑證生成、歷史關閉與 commit 歷源。 |
| `TASK-AAO-0057` | close/checkpoint 實施 scoped diff 隔離，避免無關髒變更或 untracked 臨時檔阻擋任務收尾。 |
| `TASK-AAO-0058` | 任務 claim 時自動將自身的 .atm/history/tasks/<id>.json、evidence 與 task-events 納入 allowedFiles。 |

## M16 Validator Baseline Noise Follow-up

| Task ID | Title | Status | Depends | Target surface | Primary validators |
|---|---|---|---|---|---|
| [TASK-AAO-0046](./TASK-AAO-0046-validator-baseline-noise-diagnostics.task.md) | Validator baseline noise diagnostics | done | `TASK-AAO-0004`, `TASK-AAO-0015`, `TASK-AAO-0017` | `scripts/run-validators.ts`<br>`scripts/lib/validator-envelope.ts`<br>`packages/cli/src/commands/hook.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`npm run validate:standard` |
| [TASK-AAO-0050](./TASK-AAO-0050-framework-stale-lock-cleanup-guidance.task.md) | Framework stale lock cleanup guidance | done | `TASK-AAO-0040` | `packages/cli/src/commands/framework-development.ts`<br>`packages/cli/src/commands/hook.ts`<br>`packages/cli/src/commands/guard.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-task-ledger-governance.ts --mode validate` |
| [TASK-AAO-0051](./TASK-AAO-0051-mirror-sync-commit-wrapper-support.task.md) | Mirror-sync commit wrapper support | done | `TASK-AAO-0038` | `packages/cli/src/commands/git-governance.ts`<br>`packages/cli/src/commands/hook.ts`<br>`packages/cli/src/commands/command-specs/git.spec.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-governance-commands.ts` |
| [TASK-AAO-0052](./TASK-AAO-0052-validator-fixture-task-id-clarity.task.md) | Validator fixture task id clarity | planned | `TASK-AAO-0046` | `scripts/validate-task-ledger-governance.ts`<br>`scripts/validate-cli.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`<br>`git diff --check` |
| [TASK-AAO-0053](./TASK-AAO-0053-batch-checkpoint-framework-critical-delivery-window.task.md) | batch checkpoint 支援 framework critical delivery window | planned | `TASK-AAO-0037`, `TASK-AAO-0038`, `TASK-AAO-0047` | `packages/cli/src/commands/batch.ts`<br>`packages/cli/src/commands/hook.ts`<br>`packages/cli/src/commands/command-specs/batch.spec.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`<br>`git diff --check` |
| [TASK-AAO-0054](./TASK-AAO-0054-git-hook-pre-push-refs-isolation.task.md) | 非任務協作流與 git hook pre-push 隔離優化 | done | `TASK-AAO-0040`, `TASK-AAO-0046` | `packages/cli/src/commands/hook.ts`<br>`packages/cli/src/commands/next.ts`<br>`scripts/validate-git-hooks-enforcement.ts`<br>`scripts/validate-prompt-scoped-next.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-git-hooks-enforcement.ts`<br>`node --strip-types scripts/validate-prompt-scoped-next.ts`<br>`git diff --check` |
| [TASK-AAO-0055](./TASK-AAO-0055-historical-done-task-reconcile-reopen.task.md) | Historical done task reconcile / reopen closure sync | planned | `TASK-AAO-0038`, `TASK-AAO-0051`, `TASK-AAO-0054` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/next.ts`<br>`packages/cli/src/commands/command-specs/tasks.spec.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`<br>`git diff --check` |
| [TASK-AAO-0056](./TASK-AAO-0056-framework-task-deliver-and-close-macro.task.md) | Framework task deliver-and-close macro | planned | `TASK-AAO-0017`, `TASK-AAO-0051`, `TASK-AAO-0053`, `TASK-AAO-0055`, `TASK-AAO-0057`, `TASK-AAO-0058` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/next.ts`<br>`packages/cli/src/commands/batch.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`<br>`git diff --check` |
| [TASK-AAO-0057](./TASK-AAO-0057-close-gate-scoped-diff-isolation.task.md) | Close gate scoped diff isolation | planned | `TASK-AAO-0006`, `TASK-AAO-0051` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/batch.ts`<br>`scripts/validate-task-ledger-governance.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`<br>`git diff --check` |
| [TASK-AAO-0058](./TASK-AAO-0058-task-ledger-evidence-events-self-allow-on-claim.task.md) | Task ledger/evidence/events self-allow on claim | planned | `TASK-AAO-0012`, `TASK-AAO-0051` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/task-direction.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-task-direction-governance.ts --mode validate`<br>`git diff --check` |
| [TASK-AAO-0059](./TASK-AAO-0059-reconcile-closure-packet-attestation-contract-alignment.task.md) | Reconcile closure-packet attestation contract alignment | done | `TASK-AAO-0055` | `packages/cli/src/commands/framework-development.ts`<br>`packages/cli/src/commands/tasks.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`<br>`git diff --check` |
| [TASK-AAO-0060](./TASK-AAO-0060-branch-and-worktree-archive-inventory-after-m16-operability-chain.task.md) | Branch and worktree archive inventory after M16 operability chain | done | `TASK-AAO-0059` | `docs/ai_atomic_framework/atm-agent-first-operability/reports/TASK-AAO-0060-branch-worktree-archive-inventory.md` | `git diff --check` |

## M16 P0 Throughput Acceleration Bundle

| Task ID | Title | Status | Depends | Target surface | Primary validators |
|---|---|---|---|---|---|
| [TASK-AAO-0047](./TASK-AAO-0047-p0-throughput-acceleration-bundle.task.md) | P0 throughput acceleration bundle | done | `TASK-AAO-0024`, `TASK-AAO-0027`, `TASK-AAO-0034`, `TASK-AAO-0037`, `TASK-AAO-0040`, `TASK-AAO-0046` | `packages/cli/src/commands/batch.ts`<br>`packages/cli/src/commands/next.ts`<br>`packages/cli/src/commands/hook.ts`<br>`scripts/run-validators.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-task-direction-governance.ts --mode validate` |

## M17 Atom Health Test Extensibility

| Task ID | Title | Status | Depends | Target surface | Primary validators |
|---|---|---|---|---|---|
| [TASK-AAO-0048](./TASK-AAO-0048-test-runner-plugin-interface.task.md) | TestRunnerPlugin interface for atom health | planned | `TASK-AAO-0015`, `TASK-AAO-0016`, `TASK-AAO-0023`, `TASK-AAO-0035`, `TASK-AAO-0047` | `packages/plugin-sdk/src/index.ts`<br>`packages/plugin-sdk/src/test-runner.ts`<br>`packages/core/src/manager/test-runner.ts`<br>`packages/cli/src/commands/test.ts` | `npm run typecheck`<br>`npm run validate:plugin-sdk`<br>`npm run validate:test-runner`<br>`npm run validate:cli` |
| [TASK-AAO-0049](./TASK-AAO-0049-default-atom-health-test-gates.task.md) | Default atom health test gates | planned | `TASK-AAO-0048`, `TASK-AAO-0015`, `TASK-AAO-0016`, `TASK-AAO-0023` | `packages/core/src/manager/test-runner.ts`<br>`packages/core/src/test-runner/**`<br>`schemas/test-report.schema.json`<br>`docs/ADAPTER_GUIDE.md` | `npm run typecheck`<br>`npm run validate:test-runner`<br>`npm run validate:schemas`<br>`npm run validate:cli` |

## M17 Big Script Atomization

| Task ID | Title | Status | Depends | Target surface | Primary validators |
|---|---|---|---|---|---|
| [TASK-AAO-0061](./TASK-AAO-0061-big-script-atomization-wave1-tasks-shared-helpers.task.md) | Big script atomization wave 1: tasks command shared helpers | planned | `TASK-AAO-0059` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/tasks/task-ledger-readers.ts`<br>`packages/cli/src/commands/tasks/task-planning-doc.ts`<br>`packages/cli/src/commands/tasks/task-git-helpers.ts`<br>`packages/cli/src/commands/tasks/task-output-formatters.ts`<br>`scripts/validate-task-ledger-governance.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`<br>`git diff --check` |

## M17 Agent Operability and CLI Ergonomics

| Task ID | Title | Status | Depends | Target surface | Primary validators |
|---|---|---|---|---|---|
| [TASK-AAO-0062](./TASK-AAO-0062-claim-direction-lock-consistency.task.md) | Claim direction lock consistency | planned | `TASK-AAO-0012`, `TASK-AAO-0058` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/task-direction.ts`<br>`packages/cli/src/commands/next.ts`<br>`scripts/validate-task-direction-governance.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-task-direction-governance.ts --mode validate`<br>`git diff --check` |
| [TASK-AAO-0063](./TASK-AAO-0063-evidence-required-command-quoting-validator-auto-link.task.md) | Evidence requiredCommand quoting and validator auto-link | planned | `TASK-AAO-0015`, `TASK-AAO-0017` | `packages/cli/src/commands/evidence.ts`<br>`packages/cli/src/commands/command-specs/evidence.spec.ts`<br>`scripts/lib/validator-envelope.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` | `npm run typecheck`<br>`npm run validate:cli`<br>`git diff --check` |
| [TASK-AAO-0064](./TASK-AAO-0064-task-import-frontmatter-fallback-strict-path-diagnostics.task.md) | Task import frontmatter fallback and strict path diagnostics | planned | `TASK-AAO-0038`, `TASK-AAO-0052`, `TASK-AAO-0061` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/command-specs/tasks.spec.ts`<br>`scripts/validate-task-ledger-governance.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`<br>`git diff --check` |
| [TASK-AAO-0065](./TASK-AAO-0065-cli-output-json-file-writer-flag.task.md) | CLI output-json file writer flag | planned | `TASK-AAO-0003`, `TASK-AAO-0034` | `packages/cli/src/commands/shared.ts`<br>`packages/cli/src/commands/next.ts`<br>`packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/command-specs/next.spec.ts`<br>`packages/cli/src/commands/command-specs/tasks.spec.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` | `npm run typecheck`<br>`npm run validate:cli`<br>`git diff --check` |
| [TASK-AAO-0066](./TASK-AAO-0066-read-only-preflight-task-materialization-status.task.md) | Read-only preflight and task materialization status | planned | `TASK-AAO-0034`, `TASK-AAO-0026`, `TASK-AAO-0061` | `packages/cli/src/commands/next.ts`<br>`packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/command-specs/next.spec.ts`<br>`packages/cli/src/commands/command-specs/tasks.spec.ts`<br>`scripts/validate-prompt-scoped-next.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-prompt-scoped-next.ts`<br>`git diff --check` |
| [TASK-AAO-0067](./TASK-AAO-0067-cli-usage-diagnostics-envelope.task.md) | CLI usage diagnostics | planned | `TASK-AAO-0002` | `packages/cli/src/commands/shared.ts`<br>`scripts/validate-cli.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` | `npm run typecheck`<br>`npm run validate:cli`<br>`git diff --check` |
| [TASK-AAO-0068](./TASK-AAO-0068-next-route-summary-field-projection.task.md) | next route summary and field projection | planned | `TASK-AAO-0061`, `TASK-AAO-0065` | `packages/cli/src/commands/next.ts`<br>`packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/command-specs/next.spec.ts`<br>`packages/cli/src/commands/command-specs/tasks.spec.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` | `npm run typecheck`<br>`npm run validate:cli`<br>`git diff --check` |
| [TASK-AAO-0069](./TASK-AAO-0069-tasks-roster-sync-helper.task.md) | tasks roster sync helper | planned | `TASK-AAO-0025`, `TASK-AAO-0061`, `TASK-AAO-0067` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/command-specs/tasks.spec.ts`<br>`scripts/validate-task-ledger-governance.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`<br>`git diff --check` |

## M17 Framework Contract Slices

Governance-correction and framework-maintenance cards. Distinct from the agent-operability stream above.

| Task ID | Title | Status | Depends | Target surface | Primary validators |
|---|---|---|---|---|---|
| [TASK-AAO-0070](./TASK-AAO-0070-atm-version-metadata-contract-primitives.task.md) | ATM version metadata contract primitives (Slice 1 identity correction) | planned | none | `packages/core/src/index.ts`<br>`packages/plugin-governance-local/src/versioning.ts`<br>`packages/plugin-governance-local/src/index.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`git diff --check` |
| [TASK-AAO-0071](./TASK-AAO-0071-atm-versioning-semver-helper-rename-hygiene.task.md) | ATM versioning semver helper rename hygiene patch | planned | `TASK-AAO-0070` | `packages/plugin-governance-local/src/versioning.ts`<br>`packages/plugin-governance-local/src/index.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json` | `npm run typecheck`<br>`npm run validate:cli`<br>`git diff --check` |
| [TASK-AAO-0072](./TASK-AAO-0072-atm-version-metadata-artifact-kind-and-evidence-write-path.task.md) | ATM version metadata Slice 2: artifactVersionKind and evidenceStore.writeEvidence single write-path | planned | `TASK-AAO-0070`, `TASK-AAO-0071` | `packages/core/src/index.ts`<br>`packages/plugin-governance-local/src/versioning.ts`<br>`packages/plugin-governance-local/src/stores.ts`<br>`packages/plugin-governance-local/src/index.ts`<br>`atomic_workbench/atomization-coverage/path-to-atom-map.json`<br>`scripts/validate-cli.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`git diff --check` |

TASK-AAO-0070 retroactively assigns task identity to commit `7d6b04c` ("feat(atm): add version metadata contract primitives"), which was externally misattributed to the unrelated closed card TASK-AAO-0065. This card is docs-only; it does not modify the closed TASK-AAO-0065 ledger record and does not amend commit 7d6b04c. Slice 2 has separate preconditions documented in the card body.

TASK-AAO-0071 is a hygiene patch card that renames semver-only helpers in `versioning.ts` to prevent silent corruption when processing git SHA or hash version strings. It is a precursor hygiene patch before Slice 2.

TASK-AAO-0072 defines Slice 2 only: introduce `artifactVersionKind` and wire version metadata to the single consumer `evidenceStore.writeEvidence`. This card must remain `planned` and must not be claimed until the `TASK-AAO-0071` implementation has landed. Do not widen Slice 2 to `registryStore.writeRegistryEntry`, `dataVersionKind`, bootstrap / doctor / tasks / `atm.mjs`, or release packaging.

## M17 Operator UX Follow-up

| Task ID | Title | Status | Depends | Target surface | Primary validators |
|---|---|---|---|---|---|
| [TASK-AAO-0138](./TASK-AAO-0138-formal-task-opener-and-residue-finalization-ux.task.md) | formal task opener and residue finalization UX | done | `TASK-AAO-0135`, `TASK-AAO-0137` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/framework-development.ts`<br>`packages/cli/src/commands/taskflow.ts`<br>`packages/atm-markdown-task-source/src/index.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`<br>`node --strip-types scripts/validate-governance-commands.ts` |
| [TASK-AAO-0138A](./TASK-AAO-0138A-taskflow-open-delegated-opener-orchestration-contract.task.md) | taskflow open delegated opener orchestration contract | done | `TASK-AAO-0135`, `TASK-AAO-0137` | `packages/cli/src/commands/taskflow.ts`<br>`packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/taskflow/profile-loader.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-governance-commands.ts`<br>`git diff --check` |
| [TASK-AAO-0138B](./TASK-AAO-0138B-host-opener-fallback-mode-and-numbering-path-policy-surface.task.md) | host opener fallback mode and numbering-path policy surface | done | `TASK-AAO-0138A`, `TASK-AAO-0069` | `packages/cli/src/commands/taskflow.ts`<br>`packages/cli/src/commands/tasks.ts`<br>`packages/atm-markdown-task-source/src/index.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`<br>`git diff --check` |
| [TASK-AAO-0138C](./TASK-AAO-0138C-residue-classification-and-finalization-operator-flow.task.md) | residue classification and finalization operator flow | done | `TASK-AAO-0135`, `TASK-AAO-0137`, `TASK-AAO-0138A` | `packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/framework-development.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`<br>`node --strip-types scripts/validate-governance-commands.ts`<br>`git diff --check` |
| [TASK-AAO-0139](./TASK-AAO-0139-task-id-casing-governance.task.md) | preserve task-id casing across import, close verification, and pre-commit transition checks | done | `TASK-AAO-0135` | `packages/cli/src/commands/tasks/task-import-validators.ts`<br>`packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/hook.ts`<br>`tests/cli/task-id-casing.test.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types tests/cli/task-id-casing.test.ts` |
| [TASK-AAO-0140](./TASK-AAO-0140-taskflow-close-planning-mirror-closeback-orchestration.task.md) | taskflow close planning mirror closeback orchestration | done | `TASK-AAO-0138B`, `TASK-AAO-0138C`, `TASK-AAO-0069` | `packages/cli/src/commands/taskflow.ts`<br>`packages/cli/src/commands/taskflow/profile-loader.ts`<br>`packages/cli/src/commands/command-specs/taskflow.spec.ts`<br>`packages/cli/src/commands/command-specs/tasks.spec.ts`<br>`packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/framework-development.ts`<br>`docs/specs/taskflow-profile-v1.md`<br>`scripts/validate-governance-commands.ts`<br>`scripts/validate-task-ledger-governance.ts`<br>`tests/**` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-governance-commands.ts --mode validate`<br>`node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`<br>`git diff --check` |

M17 follow-up card `TASK-AAO-0138` exists because the current official opener still requires manual `taskId` and `output` selection, and recent closure/reconcile work showed that residue/finalization states remain too visible to operators. The goal is to make the governed path the easiest path without weakening fail-closed task-ledger governance.

`TASK-AAO-0139` was opened after batch `batch-d95420db3166` exposed casing-only failures during TASK-APO-0030 closure; it closed in AAF on 2026-06-11 (`c8ad9d5b` delivery + `c655983b` governance) with policy option (a): preserve authored `task_id` casing end-to-end.
The child cards deliberately separate orchestration contract (`0138A`), host opener policy plus roster sync reuse (`0138B`), and residue/finalization diagnosis (`0138C`) so opener and cleanup work do not collapse into one mixed implementation PR.
`TASK-AAO-0140` is the next single-card follow-up. It intentionally keeps taskflow close orchestration, planning-mirror closeback, writer boundary, and evidence/failure-mode handling in one card so the close side does not split back into multiple partial stories.

## M17 Quick Repair Follow-up

These cards were opened after the Team close dogfood quick-repair pass. They intentionally keep the quick fixes small and move broader product work into bounded follow-up cards for other agents.

| Task ID | Title | Status | Depends | Target surface | Primary validators |
|---|---|---|---|---|---|
| [TASK-AAO-0142](./TASK-AAO-0142-auto-run-declared-validators-into-evidence-before-close.task.md) | auto-run declared validators into evidence before close | planned | `TASK-AAO-0015`, `TASK-AAO-0016`, `TASK-AAO-0017`, `TASK-AAO-0140` | `packages/cli/src/commands/evidence.ts`<br>`packages/cli/src/commands/taskflow.ts`<br>`packages/cli/src/commands/taskflow/**`<br>`packages/cli/src/commands/command-specs/evidence.spec.ts`<br>`packages/cli/src/commands/command-specs/taskflow.spec.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`git diff --check` |
| [TASK-AAO-0143](./TASK-AAO-0143-close-absorbs-regenerable-artifacts-and-correct-planning-mirror-edits.task.md) | close absorbs regenerable artifacts and correct planning mirror edits | planned | `TASK-AAO-0138C`, `TASK-AAO-0140`, `TASK-AAO-0141` | `packages/cli/src/commands/taskflow.ts`<br>`packages/cli/src/commands/taskflow/**`<br>`packages/cli/src/commands/tasks.ts`<br>`packages/cli/src/commands/tasks/**` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`<br>`node --strip-types scripts/validate-governance-commands.ts --mode validate`<br>`git diff --check` |
| [TASK-AAO-0144](./TASK-AAO-0144-governed-git-entrypoint-and-build-output-hygiene.task.md) | governed git entrypoint and build output hygiene | planned | `TASK-AAO-0051`, `TASK-AAO-0141` | `packages/cli/src/commands/git-governance.ts`<br>`packages/cli/src/commands/hook.ts`<br>`packages/cli/src/commands/next.ts`<br>`packages/cli/src/commands/framework-development.ts`<br>`scripts/build-onefile-release.ts` | `npm run typecheck`<br>`npm run validate:cli`<br>`node --strip-types scripts/validate-governance-commands.ts --mode validate`<br>`git diff --check` |
| [TASK-AAO-0148](./TASK-AAO-0148-harden-same-repo-close-bundle-and-scope-filtering.task.md) | Harden same-repo close bundle and scope filtering | done | `TASK-AAO-0141`, `TASK-AAO-0145` | packages/cli/src/commands/hook.ts<br>packages/cli/src/commands/taskflow.ts<br>packages/cli/src/commands/taskflow/close-orchestration.ts<br>packages/cli/src/commands/taskflow/closeback-orchestration.ts<br>packages/cli/src/commands/taskflow/commit-bundle-assembly.ts<br>packages/cli/src/commands/tasks.ts<br>packages/cli/src/commands/framework-development/closure-packet-schema.ts<br>packages/cli/src/commands/__tests__/framework-mode-staged-residue.spec.ts<br>packages/cli/src/commands/taskflow/__tests__/closeback-orchestration.spec.ts<br>packages/cli/src/commands/taskflow/__tests__/commit-bundle-assembly.spec.ts<br>packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts<br>docs/governance/atm-bug-and-optimization-backlog.md | npm run typecheck<br>node --strip-types packages/cli/src/commands/__tests__/framework-mode-staged-residue.spec.ts<br>node --strip-types packages/cli/src/commands/taskflow/__tests__/closeback-orchestration.spec.ts<br>node --strip-types packages/cli/src/commands/taskflow/__tests__/commit-bundle-assembly.spec.ts<br>node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts<br>git diff --check |

## Backlog P0 Follow-up

| Task ID | Title | Status | Depends | Target surface | Primary validators |
|---|---|---|---|---|---|
| [TASK-AAO-0157](./TASK-AAO-0157-framework-auto-stage-claim-glob-and-release-mirrors.task.md) | Framework auto-stage claim glob and release mirrors | in_progress | none | `packages/cli/src/commands/git-governance.ts`<br>`scripts/validate-governance-commands.ts`<br>`docs/governance/atm-bug-and-optimization-backlog.md` | `npm run typecheck`<br>`node --strip-types scripts/validate-governance-commands.ts`<br>`git diff --check` |
| [TASK-AAO-0190](./TASK-AAO-0190-taskflow-close-auto-stage-and-status-migration.task.md) | Fix taskflow close UX for auto-stage and --status migration | done | none | `packages/cli/src/commands/tasks/scope-lock-diagnostics.ts`<br>`packages/cli/src/commands/taskflow/commit-bundle-assembly.ts`<br>`packages/cli/src/commands/shared.ts`<br>`tests/cli/taskflow-status-migration-hint.test.ts`<br>`docs/governance/atm-bug-and-optimization-backlog.md` | `node --strip-types packages/cli/src/commands/tasks/__tests__/scope-lock-diagnostics.test.ts`<br>`node --strip-types tests/cli/taskflow-status-migration-hint.test.ts`<br>`npm run check:encoding:touched`<br>`git diff --check` |
| [TASK-AAO-0191](./TASK-AAO-0191-defer-foreign-staged-ordinary-unowned.task.md) | Prevent defer-foreign-staged from absorbing ordinary-unowned staged files | done | none | `packages/cli/src/commands/git-governance.ts`<br>`tests/cli/git-commit-task-scoped-staging.test.ts`<br>`docs/governance/atm-bug-and-optimization-backlog.md` | `node --strip-types tests/cli/git-commit-task-scoped-staging.test.ts`<br>`npm run check:encoding:touched`<br>`git diff --check` |
