---
task_id: ATM-GOV-0235
title: ATM 3.0 final closure and circuit breaker verdict
status: active
owner: atm-governance
priority: P0
milestone: ATM-3.0-F
severity: P0
depends_on:
  - ATM-GOV-0234
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns final cross-plan closure, rollout policy and evidence-bound verdict."
scopePaths:
  - "docs/governance/atm-bug-and-optimization-backlog.md"
  - "docs/governance/atm-bug-and-optimization-backlog.items/**"
  - "docs/governance/atm-3-replay-evidence.md"
  - "packages/cli/src/commands/broker/parallel-admission/**"
  - "tests/cli/atm-3-final-closure.test.ts"
  - "tests/cli/parallel-admission-circuit-breaker.test.ts"
deliverables:
  - "docs/governance/atm-bug-and-optimization-backlog.md"
  - "docs/governance/atm-bug-and-optimization-backlog.items/**"
  - "docs/governance/atm-3-replay-evidence.md"
  - "packages/cli/src/commands/broker/parallel-admission/**"
  - "tests/cli/atm-3-final-closure.test.ts"
  - "tests/cli/parallel-admission-circuit-breaker.test.ts"
validators:
  - "node --strip-types tests/cli/atm-3-final-closure.test.ts"
  - "node --strip-types tests/cli/parallel-admission-circuit-breaker.test.ts"
  - "npm run validate:cli"
  - "npm run validate:schemas"
  - "npm run typecheck"
  - "git diff --check"
errorCodes:
  - "ATM_EVIDENCE_SEAL_REQUIRED"
  - "ATM_BROKER_STATE_DIVERGENCE"
createdByCommand: atm plan card create
reopened_at: 2026-07-21T17:47:00+08:00
reopen_reason: "Evidence audit found final closure must derive from sealed replay/backlog evidence; ATM-BUG-2026-07-21-222 is fixed as a recovery blocker but is not a close waiver, and the 420-cell real matrix is not complete."
evidence:
  required: sealed-cross-plan
producer:
  - "ATM 3.0 closure verdict and Plan 2.2 inherited-acceptance disposition."
consumer:
  - "Project owner and future ATM rollout plans."
missingData:
  - "Any failed or unavailable replay cell keeps the plan open; there is no fixture waiver."
dataDrivenStopRule:
  - "Do not close if any inherited acceptance is open, any correctness counter is nonzero, observed coverage is below 100 percent, or replay evidence is not real multiprocess."
  - "Do not reset circuit breaker without a newer passing evidence digest."
  - "Do not close if the red baseline did not turn green under the same scenario digest, real-task dogfood removed its declared intersection, or migration rollback was not exercised."
out_of_scope:
  - "No new product implementation beyond minimal verdict/circuit-breaker wiring discovered by final integration."
  - "No rewriting Plan 2.2 history."
rollback:
  strategy: remain-open-and-queue-only
  notes: "On any failure keep ATM 3.0 active, trip queue-only, preserve evidence and emit exact failing cells plus recovery manifests."
atomizationImpact:
  ownerAtomOrMap: "atm.governance.closure"
  mapUpdates: []
  extractionCandidates: []
---

# ATM-GOV-0235 ATM 3.0 final closure and circuit breaker verdict

## Intent

以新的真實 replay 證據決定是否完成 ATM 3.0，並同時處置 Plan 2.2 尚未滿足的驗收。功能存在但 evidence 不足仍不得關閉。

## 2026-07-21 closeback supplement

Target repo `b5242bc145e8e9d30953fd95ff70b0f122316a20` proves `ATM-BUG-2026-07-21-222` recovery repair, `ATM-BUG-2026-07-21-223` validator scheduler repair, current full standard 87/87, doctor pass, pre-push pass, and local/remote SHA parity. These remove the immediate pre-push blocker and the false-red parallel validator classification issue.

Final closure remains blocked by `ATM-GOV-0234`: the required real multiprocess dogfood, command-backed 420-cell matrix, event-derived correctness counters, and paired AB/BA performance evidence are not yet sealed. Therefore this card stays `active` and its acceptance boxes remain unchecked.

Target repo `main@8920995675ada7c26786cacaa09ae2321e34b6ab` is pushed and verified. It adds the fail-closed Plan 3 evidence closure diagnostic, public frozen broker replay CLI surface, and validator scheduler diagnostics. Its current `remain-open` verdict is now the authoritative quick check before any final closure attempt; it identifies the remaining blockers as missing real dogfood candidates and non-command-backed 420-cell matrix evidence. The previous missing public frozen replay CLI blocker is resolved.

## Required Work

- 重跑 divergence census、runner parity、release/adopter projection、rollback 與 backlog reconciliation。
- 核對 0226 紅色 baseline 與 0234 綠色 replay 使用同一 scenario/assertion/threshold digest；核對 controlled replay 與 real-task dogfood 為兩個獨立 passing segments。
- 驗證 healthy replay 沒有非注入 trip 或 queue-only residency；故障演練能自動 trip `queue-only`，reset 綁定較新的 passing digest，並封存 trip reason 與 recovery latency。
- 對每個 2.2 inherited acceptance 記錄 terminal disposition 與證據。
- 對 `TASK-TMP-0004`、`ATM-GOV-0236` 及本次 readiness census 列出的 exact backlog IDs 逐一驗證 canonical shard、source/frozen disposition 與 projection digest；不得只看 Markdown 列或省略日期後的短號。
- 任一失敗輸出精確 cell、authority generation、recovery manifests 與 next action。

## Acceptance

- [ ] 0226 所有 divergence terminal，active stale authorization 為 0。
- [ ] 0234 真多行程與 paired evidence 有效，correctness 七項均為 0、coverage 100%。
- [ ] 0234 real-task dogfood 使用兩張未交付且有 declared intersection 的 registered cards，兩位 Captain 均獲 canonical ticket、無 terminal refusal、無移除交集、無人工 wakeup 或 bypass。
- [ ] `parallelOverlapRatio >= 0.30`、`serializedAdmissionRatio <= 0.70`，starvation threshold 在 run 前 sealed，且 correctness/performance 來自同一組 valid cells。
- [ ] source/frozen/release/adopter parity 與 rollback drill 通過。
- [ ] legacy migration 的 immutable pre-snapshot、apply、rollback 與 round-trip digest 全部通過；rollback 不依賴直接修改 runtime JSON。
- [ ] healthy replay 的 `unexpectedBreakerTripCount = 0`、`timeInQueueOnlyRatio = 0`；trip/reset 演練通過，reset 引用新的 passing digest。
- [ ] 所有 2.2 未完成驗收有 terminal disposition；有任何 open 則本卡不得 close。
- [ ] `TASK-TMP-0004`、`ATM-GOV-0236` 與 0226–0234 全部 target-close；projection-only backlog item count、unowned Plan 3.0 blocker count、failed/inconclusive readiness probe count皆為 0。

## 2026-07-21 Protected Closure Repair Update

Framework target repo `main@8920995675ada7c26786cacaa09ae2321e34b6ab` is pushed and matches `origin/main`. Evidence summary:

- `node atm.mjs broker replay status --json` on frozen runner returns `verdict: remain-open` with exactly two remaining blockers: dogfood candidates `0/2`, and command-backed 420-cell matrix `0/420`.
- Public frozen replay commands exist: `status`, `run`, and `dogfood`.
- `validate:standard` run `standard-20260721232112` completed `87/87 passed`.
- Validator orchestration now uses a generic metadata-driven scheduler contract and reports `atm.validatorSchedulerDiagnostics.v1`; parallel failures are isolated-rerun classified as resource contention or true validator failure.
- The release surface validator was repaired by generic artifact-authority rules, not by a card/SHA/path exception: dist JS proves runtime exports, root-drop TS source proves type/source exports.

0235 remains active. Final closure is still blocked by 0234 real dogfood and command-backed paired evidence, so no acceptance checkbox is satisfied by this repair alone.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-21T01:22:48.696Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0235-atm-3-0-final-closure-and-circuit-breaker-verdict.task.md","contentDigest":"sha256:9908d53ea8eb46227ac7e31a0bcb5a2c60ae619bc4862c508b47afdc4407d6ee"} -->
