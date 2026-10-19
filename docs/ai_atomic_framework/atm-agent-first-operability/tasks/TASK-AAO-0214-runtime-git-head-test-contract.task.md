---
id: TASK-AAO-0214
title: Runtime-only Git HEAD evidence test contract
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/git-governance/implementation/sealed-commit-attribution.test.ts
deliverables:
  - packages/cli/src/commands/git-governance/implementation/sealed-commit-attribution.test.ts
contextMap:
  primary: packages/cli/src/commands/git-governance/implementation/sealed-commit-attribution.test.ts
  direct: tests/cli/git-head-runtime-only-receipt.test.ts
  secondary: packages/cli/src/commands/git-head-evidence.ts
  pattern: docs/EVIDENCE_LEDGER.md and existing runtime-only producer commit 1eb4843f9
validators:
  - node --strip-types packages/cli/src/commands/git-governance/implementation/sealed-commit-attribution.test.ts
  - node --strip-types tests/cli/git-head-runtime-only-receipt.test.ts
  - npx eslint packages/cli/src/commands/git-governance/implementation/sealed-commit-attribution.test.ts
  - npm run typecheck
  - git diff --check
priority: P1
phase: Backlog-P1
created: 2026-10-19
created_by_agent: codex-gpt-6
owner: codex-gpt-6
status: planned
type: maintenance
depends: []
notes: "2026-10-19 | 狀態: planned | 驗證: pending | 變更: runtime-only fixture contract planning | 阻塞: Phase 1 claim required"
---
# [TASK-AAO-0214] Runtime-only Git HEAD evidence test contract

> **任務開卡** — Runtime-only Git HEAD evidence test contract
> **定位**：Backlog-P1
> **前置依賴**：無

## 問題描述

Align the internal sealed attribution fixture with the established runtime-only Git HEAD observation architecture while retaining governance audit and tamper assertions.

## INPUT_CONTRACT

- Existing producer commit 1eb4843f9 (keep git-head observations runtime-only) and docs/EVIDENCE_LEDGER.md define the current architecture: runtimeJsonl=.atm/runtime/telemetry/git-head.jsonl; producer returns evidencePath:null and runtimeEvidencePath.
- TASK-AAO-0213 adjacent required validator fails at the internal fixture's obsolete line90 history-git-head staging assertion. Preserve AI-Atomic-Framework/artifacts/0213-evidence-3.json and establish that unchanged fixture failure against the actual producer commit before edits.

## OUTPUT_CONTRACT

- [ ] packages/cli/src/commands/git-governance/implementation/sealed-commit-attribution.test.ts

## VALIDATION_CMD

```bash
node --strip-types packages/cli/src/commands/git-governance/implementation/sealed-commit-attribution.test.ts
node --strip-types tests/cli/git-head-runtime-only-receipt.test.ts
npx eslint packages/cli/src/commands/git-governance/implementation/sealed-commit-attribution.test.ts
npm run typecheck
git diff --check
```

## ROLLBACK_HINT

```bash
# Revert only this task's governed delivery. Never reset shared worktree or restore foreign WIP.
```

## 執行步驟

1. Phase 0 registers this planned card plus compact tasks-aao entry in one planning commit. Phase 1 uses normal target-repo claim/lock, exactly delivery plus closure commits, no game status mirror.
2. Confirm unchanged baseline failure and its causal relation to producer commit1eb4843f9; retain original0213 failure evidence. This repairs a stale test contract, not production behavior or architecture.
3. Replace the two obsolete history-evidence staging/inclusion expectations with positive receipt assertions: evidencePath=null, runtimeEvidencePath correct, actual runtime file exists and parsed JSONL contains the real candidate tree, parent and task identity.
4. Assert neither candidate index nor final commit tree includes history Git HEAD telemetry or runtime Git HEAD telemetry. Keep the final declared generated governance audit.json assertions: it must still enter both candidate and commit.
5. Preserve all earlier incorrect-attribution, tampered-seal and negative assertions. Do not delete tests, swallow failures or drop required validators to make0213 pass. Run all listed commands with source-backed evidence.
6. After this card's delivery and closure, root reruns0213's required validator separately. Do not rewrite0213 task files or its historical failed evidence.

## Boundaries

- Sole source deliverable is the existing internal fixture. No new module or atom. Strengthen evidence exclusion while aligning with the already approved runtime-only architecture.
- Forbidden: production helpers, CI guards, baselines, configuration, hooks, other source files, build/runner/release changes, adopter installation, foreign WIP and0213's two deliverables. No forced staging of history or runtime telemetry.
- No force, no-verify or emergency. If normal closure actually requires a fresh runner, use another formal synchronization card rather than expanding this test-only task.

*由 codex-gpt-6 透過 task-card-opener 開立 | 2026-10-19*
