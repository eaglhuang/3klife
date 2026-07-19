---
task_id: ATM-GOV-0194
title: Add runner-sync incremental build on cache miss
status: done
owner: unassigned
priority: P1
depends_on:
  - ATM-GOV-0186
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/run-sealed-runner-build.ts
  - scripts/build-package-dist.ts
  - scripts/build-root-drop-release.ts
  - scripts/build-onefile-release.ts
  - scripts/validate-root-drop-release.ts
  - scripts/validate-onefile-release.ts
  - packages/core/src/broker/runner-sync-steward-queue.ts
  - packages/cli/src/commands/framework-development/runner-sync-admission.ts
  - tests/cli/sealed-runner-build-input-cache.test.ts
  - tests/cli/runner-sync-build-script-admission.test.ts
deliverables:
  - scripts/run-sealed-runner-build.ts
  - scripts/build-package-dist.ts
  - scripts/build-root-drop-release.ts
  - scripts/build-onefile-release.ts
  - packages/core/src/broker/runner-sync-steward-queue.ts
  - packages/cli/src/commands/framework-development/runner-sync-admission.ts
  - tests/cli/sealed-runner-build-input-cache.test.ts
  - tests/cli/runner-sync-build-script-admission.test.ts
validators:
  - node --strip-types tests/cli/sealed-runner-build-input-cache.test.ts
  - node --strip-types tests/cli/runner-sync-build-script-admission.test.ts
  - npm run typecheck
  - npm run validate:cli
  - npm run validate:git-head-evidence
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: command-backed
rollback:
  strategy: revert-commit; remove any generated sealed incremental cache artifacts created by this card
atomizationImpact:
  ownerAtomOrMap: atm.runner-sync-build-surface-map
  mapUpdates:
    - scripts/run-sealed-runner-build.ts
    - scripts/build-package-dist.ts
    - scripts/build-root-drop-release.ts
    - scripts/build-onefile-release.ts
  extractionCandidates:
    - atom: atm.sealed-source-diff-detector
      pattern: Policy Object
      source: scripts/run-sealed-runner-build.ts
      disposition: extract
      inlineReason: null
    - atom: atm.package-level-release-builder
      pattern: Builder Strategy
      source: scripts/build-package-dist.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-19T13:13:42.616Z"
completed_by_agent: "codex-governance-optimizer"
closedAt: "2026-07-19T13:13:42.616Z"
closedByActor: "codex-governance-optimizer"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-19T13-13-42-616Z-close-66f64406f2c6"
lastTransitionAt: "2026-07-19T13:13:42.616Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "ca21936e907e5a66bf2893762148862cdcb11036"
---

# ATM-GOV-0194 Add runner-sync incremental build on cache miss

## Intent

Implement true incremental runner-sync build behavior when the sealed source has changed.

The current runner-sync cache can identify a no-change cache hit, but a changed source still falls back to a broad rebuild path. That hides an important governance distinction: "nothing changed, skip everything" is not the same as "some inputs changed, rebuild only affected outputs." This task makes cache-miss builds diff-aware so runner-sync stops behaving like a fixed full-build tax after every code change.

The implementation must use `git diff --name-only <last-sealed-source>..HEAD` or an equivalent sealed-source comparison to classify affected inputs across packages, scripts, templates, schemas, release mirrors, and onefile payload sources.

## Required behavior

- Detect changed inputs from the previous sealed source to current `HEAD`, and record the compared source SHAs in the build receipt.
- TypeScript build must use persistent incremental state such as `.tsbuildinfo` or a sealed build cache, not only a final-output cache hit.
- `build-package-dist.ts` must become package-level incremental: rebuild only affected packages and their dependents instead of deleting and recreating the whole package dist root.
- Root-drop release generation must use hash-based copy-if-changed and must not rewrite unchanged files.
- Onefile payload generation must use an input manifest hash and reuse unchanged payload segments where safe.
- Runner-sync receipt must classify outcomes separately as:
  - `cacheHitSkip`: no sealed input changed and build work was skipped.
  - `incrementalBuild`: sealed input changed, but only affected packages/payloads were rebuilt or copied.
  - `fullRebuild`: dependency graph, manifest, cache invalidation, or safety fallback required a complete rebuild.
- Runtime telemetry must include affected path count, affected package/script/template/schema groups, rebuilt package count, copied file count, reused file count, duration per phase, and fallback reason when applicable.
- Runner build phase timings must be emitted into the generated-write treatment telemetry shape introduced by ATM-GOV-0187, including `phaseTimingsMs`, output digest, output file count, and execution/skip classification, so later cards can compare before/after speed without scraping console text.
- All raw statistics and logs must be stored on disk under a gitignored runtime/log surface such as `.atm/runtime/telemetry/<domain>/<timestamp>-<taskId>.jsonl` or equivalent. This includes counters, per-run timing events, raw validation usage, debug logs, broker decision traces, runner-sync receipts, and other high-frequency telemetry. Git-tracked history should keep only compact decision digests, close summaries, or explicitly selected baseline snapshots; do not commit raw telemetry/log/receipt streams by default.
- Any fallback to full rebuild must be explicit and analyzable; it must not be reported as an incremental success.

## Acceptance

- [ ] A fixture proves unchanged sealed input produces `cacheHitSkip`.
- [ ] A fixture proves a small TypeScript source change produces `incrementalBuild`, rebuilds only affected package outputs, and preserves unrelated package outputs.
- [ ] A fixture proves a release mirror copy updates only hash-changed files.
- [ ] A fixture proves onefile generation can reuse unchanged payload segments or records a justified `fullRebuild` fallback.
- [ ] Receipt schema, test assertions, and CLI/broker output distinguish `cacheHitSkip`, `incrementalBuild`, and `fullRebuild`.
- [ ] Runner build timing data is queryable from gitignored runtime telemetry/log files, not only visible in terminal output or one-off receipt prose.
- [ ] All statistics, counters, raw event logs, debug logs, and per-run telemetry are excluded from Git by default and remain on local disk.
- [ ] Git-tracked artifacts contain only digest/summary/baseline data needed for governance decisions; repeated raw telemetry does not grow the repository.
- [ ] Package-level incremental build receipt schema/fields are versioned and documented in the test fixture expectations.
- [ ] Focused tests prove changed-input incremental rebuild is distinct from unchanged-input cache skip.
- [ ] A safety fallback test proves dependency graph or manifest uncertainty becomes `fullRebuild` with a machine-readable reason.
- [ ] Validation evidence includes the focused sealed runner cache/incremental tests, `npm run typecheck`, `npm run validate:cli`, and `npm run validate:git-head-evidence`.

## Data-driven stop rule

If implementation data shows TypeScript/package-level incremental build is not feasible without a larger builder architecture split, stop before forcing a partial solution. Write a decision note comparing observed build phase costs and propose either splitting this card or replacing the acceptance criteria. Do not hide a full rebuild behind the word "incremental."

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-19T11:36:20.563Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0194-add-runner-sync-incremental-build-on-cache-miss.task.md","contentDigest":"sha256:0e0ba0944c4cd743c9b0dba3fc5751d7c43878505781f996bfef7006a74f7d96"} -->
