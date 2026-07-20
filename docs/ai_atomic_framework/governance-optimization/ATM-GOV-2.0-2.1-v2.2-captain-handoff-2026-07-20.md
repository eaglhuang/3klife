---
doc_id: doc_atm_gov_2_0_2_1_v2_2_captain_handoff_2026_07_20
owner: atm-captain
status: handoff
created_at: 2026-07-20T22:30:00+08:00
planning_repo_root: C:/Users/User/3KLife
target_repo_root: C:/Users/User/AI-Atomic-Framework
source_plan_path: docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
---

# ATM 2.0 / 2.1 v2.2 Captain Handoff - 2026-07-20

## Immediate Context

The previous captain session completed the planning/documentation pass for the
ATM 2.0 / 2.1 closure amendment. The implementation work is not complete.
The next conversation must treat the current source plan and task cards as the
authority for the remaining work.

Use Traditional Chinese for user-facing coordination. Use the ATM framework
repository as the target implementation repo and the 3KLife planning repository
as the planning authority.

## Authority

- Planning authority: `C:/Users/User/3KLife`
- Planning root: `C:/Users/User/3KLife/docs/ai_atomic_framework`
- Target authority: `C:/Users/User/AI-Atomic-Framework`
- Closure authority: target repo ATM ledger/evidence
- Main plan: `docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan-v2.md`
- Target import method: formal ATM task import/taskflow only; do not hand-edit
  `.atm/history/**` or `.atm/runtime/**`.

Before any implementation claim, the receiving agent must run:

```bash
cd C:/Users/User/AI-Atomic-Framework
node atm.mjs next --prompt "<current user prompt>" --json
```

After any `next --prompt` or `next --claim`, follow `evidence.nextAction` or
the playbook if one is present.

## What Was Completed In This Conversation

- Added v2.2 Closure Amendment to
  `docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan-v2.md`.
- Created or completed source task cards:
  `ATM-GOV-0215` through `ATM-GOV-0225`, `TASK-ERR-0002`, and
  `TASK-TMP-0002`.
- Updated `ATM-GOV-0215` with Claude's overlap call-site convergence evidence
  and backlog disposition.
- Updated `TASK-ERR-0002` so the task-import parser diagnostic bug
  (`ATM_TASKS_PLAN_EMPTY` / `ATM_TASK_IMPORT_REFERENCE_ONLY_ID_FRAGMENT`) is
  explicitly covered by the ErrorCode/recovery contract.
- Verified all 13 source cards with:

```bash
node atm.mjs tasks import --from <card> --dry-run --json
```

- Verified text health with UTF-8 / replacement-character / trailing whitespace
  checks and `git diff --check`.
- Committed and pushed the planning update to 3KLife:
  `7595dc5b docs(atm): add v2.2 closure amendment cards`
- Earlier Claude planning commit exists:
  `cbf1a134 docs(atm): add ATM-GOV-0215 broker overlap call-site convergence repair`

At the time this handoff is written, `C:/Users/User/3KLife` was clean before
this new handoff file was added. This handoff file itself may still be
uncommitted unless the receiving agent or user commits it.

## Target Repo State Warning

`C:/Users/User/AI-Atomic-Framework` is not clean. It has substantial existing
dirty state from prior runner-sync/build/governance work, including release
mirrors, `.atm/history/**` receipts, governance telemetry, and backlog changes.
Do not reset, delete, or clean these files casually. Treat them as existing
WIP/residue from other lanes unless ATM returns a formal cleanup route.

Known visible target dirty buckets include:

- `.atm/history/evidence/*.runner-sync-receipt.json`
- `.atm/history/evidence/governance-telemetry/**`
- `.atm/history/task-events/ATM-GOV-0196/**`
- `.atm/history/task-events/ATM-GOV-0215/**`
- `.atm/history/tasks/ATM-GOV-0196.json`
- `.atm/history/tasks/ATM-GOV-0215.json`
- `docs/governance/atm-bug-and-optimization-backlog.md`
- `release/atm-onefile/**`
- `release/atm-root-drop/**`

The next agent should run read-only status first:

```bash
cd C:/Users/User/AI-Atomic-Framework
git status --short --branch
node atm.mjs tasks status --json
node atm.mjs broker status --json
```

## Core Decision Snapshot

ATM 2.0 / 2.1 is not complete. The system does not yet have enough evidence to
claim true parallel development under INV-ATM-008. The amended target is:

- compose-first becomes the default only after all functional gates pass;
- circuit breaker is enabled by default;
- any safety, correctness, observability, or performance failure trips back to
  `queue-only`;
- final closure requires real dogfood evidence plus the complete paired A/B
  matrix, not deterministic fixtures.

The most important ordering decision is:

1. Finish `ATM-GOV-0215`.
2. Register/reconcile ErrorCode recovery through `TASK-ERR-0002`.
3. Then continue `ATM-GOV-0216` onward.
4. Keep `TASK-SKL-0014` paused until 0215 makes overlap verdicts trustworthy.

## Why 0215 Is First

`ATM-GOV-0206` was closed, but its acceptance was incomplete. The shipped/frozen
runner still returned a false negative for the original sample:

- active holder: `packages/cli/src/commands/telemetry.ts`
- new write: `packages/cli/src/commands/**`
- actual wrong verdict: `parallel-safe`
- expected: physical/file-range conflict

Claude found the live verdict path still used exact string comparison:

```ts
if (!activeIntent.resourceKeys.files.includes(newFile)) continue;
```

The defect is broader than one line. The 0215 card records 12 exact-match call
sites across broker conflict/decision files. The implementation must route all
overlap/resource-intersection/physical-conflict decisions through one shared,
data-driven matcher. No path prefix, task id, actor id, or incident-specific
hard-code is allowed.

`ATM-GOV-0215` must prove the fix through the frozen runner after rebuild, not
only unit tests or `packages/core/dist`.

## Backlog Disposition

Claude reported four fresh backlog items in the target framework repo:

- `ATM-BUG-2026-07-20-213`: 0206 incomplete; exact-match call sites still live.
  This is core evidence for `ATM-GOV-0215` and should be committed with the
  0215 delivery.
- `ATM-BUG-2026-07-20-214`: runner-sync stale SHA / reservation cleanup
  recovery. This belongs to `ATM-GOV-0218` and `TASK-ERR-0002`.
- `ATM-BUG-2026-07-20-215`: emitted `requiredCommand` not directly runnable due
  to task id normalization and missing claim/files prerequisites. This belongs
  to `ATM-GOV-0218` and `TASK-ERR-0002`.
- `ATM-BUG-2026-07-20-216`: task import parser treats a shell-comment-looking
  line inside a fenced code block as a Markdown heading and can emit misleading
  `ATM_TASKS_PLAN_EMPTY` / `ATM_TASK_IMPORT_REFERENCE_ONLY_ID_FRAGMENT`
  diagnostics. This belongs to `TASK-ERR-0002` or a later parser continuation,
  not to 0215 implementation scope.

Do not create a standalone framework temp claim just to commit these backlog
items if they can be consumed by the relevant delivery card. For `-213`, use
the 0215 delivery commit because the 0215 card scope includes
`docs/governance/atm-bug-and-optimization-backlog.md`.

## Unfinished Functional Work

### Phase 0 - `ATM-GOV-0215`

Status: planned/imported, not implemented.

Required functionality:

- Census all shared-write gates and broker overlap call sites.
- Converge all exact-match resource overlap decisions into one generalized
  matcher.
- Resolve `normalizeBrokerPath` versus the canonical matcher semantics.
- Add a programmatic call-site inventory guard that fails on new exact-match
  resource-key comparisons.
- Replay sample 0001 on the frozen runner after build and prove the old false
  negative is gone.

Primary risk: fixing a helper but leaving the live verdict path untouched, which
is exactly how 0206 failed.

### Phase 0 - `TASK-ERR-0002`

Status: planned, not implemented.

Required functionality:

- Register/reuse formal ErrorCodes for stale SHA, task id normalization,
  orphan claim, ticket adopt/cancel/reconcile, atomic write retry exhaustion,
  runner receipt missing, and task-import parser diagnostics.
- Every code must include retryability, approval requirement, status command,
  next action, and an executable recovery command.
- Regenerate `docs/ERROR_CODES.md` through the generator; do not hand-edit it.
- Add fixture for the fenced-code-block parser diagnostic bug.

Primary risk: continuing to emit recovery prose or broken `requiredCommand`
strings instead of executable commands.

### Phase 1 - `ATM-GOV-0216`

Status: planned, not implemented.

Required functionality:

- Add `atm.parallelAdmissionPolicy.v1`.
- Add `broker parallel-admission status/set/trip/reset`.
- Ensure all R3/R4 shared-write gates return canonical ticket/status/recovery.
- Preserve R1/R2 hard exceptions.
- Default circuit breaker on, fallback mode `queue-only`.

Primary risk: shipping compose-first as a prose default without an executable
trip/reset policy.

### Phase 2 - `ATM-GOV-0217`

Status: planned, not implemented.

Required functionality:

- Make ticket/queue/proposal/session/evidence writes atomic and CAS-based.
- Implement single-flight successor wakeup, fairness, bounded bypass, and
  anti-starvation.
- Support lost-owner adopt, stale-base revalidation, side-effect reconcile, and
  cancel without forged success receipts.

Primary risk: last-writer-wins state under multi-process dogfood.

### Phase 2 - `ATM-GOV-0218`

Status: planned, not implemented.

Required functionality:

- Make runner-sync self-hosting.
- Normalize actor/task ids consistently across emitted commands and claims.
- Auto-create required temp claim or return a complete recovery command.
- Coalesce/revalidate when HEAD moves.
- Auto-release queue with a real build receipt.
- Avoid cache-hit manifest pollution.
- Record Windows retry and actor identity in receipts.

Primary risk: stale SHA loop and un-runnable `requiredCommand`.

### Phase 2 - `ATM-GOV-0219`

Status: planned, not implemented.

Required functionality:

- Add `atm.commandManifest.v1`.
- Default shared delivery path must be `shell=false`.
- Use argv/JSON manifest for generated writes.
- Use temp index/tree and stdin pathspec for Git.
- Make release artifacts, checkpoint, closeback, commit and push idempotent.
- Keep old `--run-command` only as queue-only compatibility with deprecated
  notice.

Primary risk: shell strings and duplicate side effects under retry.

### Phase 2 - `ATM-GOV-0220`

Status: planned, not implemented.

Required functionality:

- Convert orphan `in_progress` records into adoptable state through CLI.
- Repair actor/lane/session/claim/commit attribution mismatches.
- Fix plan path continuation, batch/normal route oscillation, and scope
  quote/path normalization.
- Enforce protected ledger destructive guard.

Primary risk: agents clearing state manually or resurrecting stale owners.

### Phase 2 - `ATM-GOV-0221`

Status: planned, not implemented.

Required functionality:

- Migrate census producers to `atm.telemetryObservation.v1`.
- Add `atm.sharedWriteGateCoverage.v1`.
- Fill missing telemetry fields or emit explicit unavailable receipts.
- Require sealed task summaries with observation window, watermark, and digest
  before close.
- Keep raw telemetry out of tracked Git except compact digests/reports.

Primary risk: claiming coverage from absent or zero-filled data.

### Phase 3 - `ATM-GOV-0222`

Status: planned, not implemented.

Required functionality:

- Implement resumable `batch execute-plan --execute`.
- Orchestrate claim, worker, ticket, compose, validator, checkpoint and
  closeback through the existing task model.
- Add Traditional Chinese audit/backlog/closeout routing and Windows-safe
  command renderer.
- After functional gates pass, migrate framework and adopter pack defaults to
  compose-first with circuit breaker enabled.
- Provide migration receipts and rollback to queue-only.

Primary risk: creating a second executor/task model or flipping defaults before
  circuit breaker gates exist.

### Phase 4 - `ATM-GOV-0223`

Status: planned, not implemented.

Required functionality:

- Run real CLI/process/agent dogfood with independent actor identities.
- Use isolated proposals plus shared publish.
- Cover disjoint, same-file different anchor, ambiguous overlap, CID
  exchangeable/non-exchangeable, and generated shared surface.
- Prove max simultaneous work >= 4, actual overlap > 0, parallel admission > 0.
- Prove zero silent overwrite, escaped conflict, duplicate side effect, and
  unresolved starvation.

Primary risk: substituting deterministic fixtures for true dogfood.

### Phase 5 - `ATM-GOV-0224`

Status: planned, not implemented.

Required functionality:

- Run complete 4 arms x 7 scales x 5 contention classes x 3 repeats = 420
  valid paired A/B cells.
- Use AB/BA, same sealed base, same hardware/settings.
- Measure makespan, throughput, cost ratio, correctness defects, and
  observability coverage.
- Auto-trip to queue-only on any threshold failure.
- Reset only with a new passing evidence digest.

Primary risk: incomplete cells or invalid fixtures being counted as success.

### Phase 6 - `TASK-TMP-0002`

Status: planned, not implemented.

Required functionality:

- After product-level repairs, use formal CLI to dispose historical residue:
  old queue receipts, session events, stale locks, raw telemetry, dirty release
  residue.
- Dry-run first; classify active/reachable/quarantineable/deletable/needs-owner.
- Write cleanup receipts for every mutation.
- Do not directly delete `.atm` state.

Primary risk: cleanup before the recovery commands exist.

### Phase 6 - `ATM-GOV-0225`

Status: planned, not implemented.

Required functionality:

- Final closure audit only; no new feature work.
- Rerun census, runner parity, adopter bootstrap/upgrade/rollback, backlog
  reconciliation.
- Consume 0223 dogfood and 0224 A/B evidence.
- Close 2.0 / 2.1 only if every upstream function and evidence gate passes.
- If anything fails, keep open and report exact failed cells plus recovery
  command.

Primary risk: declaring completion from feature existence without real evidence.

## Suggested Next Prompt For New Conversation

Use this in the new conversation:

```text
你是 ATM 並行開發隊長。請讀取
C:/Users/User/3KLife/docs/ai_atomic_framework/governance-optimization/ATM-GOV-2.0-2.1-v2.2-captain-handoff-2026-07-20.md
以及
C:/Users/User/3KLife/docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan-v2.md。
先做 preflight，然後從 ATM-GOV-0215 開始，照 ATM 正式 next/claim/playbook 執行。不要清理 target repo 既有 dirty state；先回報 broker/task status 與可安全開工範圍。
```

## First Commands For The Next Agent

```bash
cd C:/Users/User/AI-Atomic-Framework
node atm.mjs next --prompt "執行 ATM-GOV-0215 broker overlap call-site convergence repair" --json
node atm.mjs tasks status --json
node atm.mjs broker status --json
```

If ATM returns `ATM_*` errors, use `atm-error-code-resolver` and the registry
instead of inventing recovery prose.

## Memory Write Checklist

- Confirmed pitfall + fix this session: none beyond what is already recorded in
  task cards and backlog.
- Major closure snapshot: planning documents/cards completed and pushed at
  `7595dc5b`; this handoff records the open implementation work.
- Human corrected working method: already incorporated as formal card/plan
  constraints: generalized helper, no hard-code, no false completion without
  evidence.
- Existing memory invalidated: none.

