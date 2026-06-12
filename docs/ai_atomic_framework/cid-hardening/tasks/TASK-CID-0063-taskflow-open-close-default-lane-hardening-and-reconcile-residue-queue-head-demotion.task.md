---
task_id: TASK-CID-0063
doc_id: doc_cid_0063
title: "Taskflow open-close default lane hardening and reconcile residue queue-head demotion"
status: planned
owner: atm-core
priority: P0
milestone: M13
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on:
  - "TASK-CID-0060"
  - "TASK-CID-0061"
scopePaths:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/open-orchestration.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/taskflow/host-opener-policy.ts"
  - "packages/cli/src/commands/taskflow/profile-loader.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "scripts/validate-cli.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "docs/specs/taskflow-profile-v1.md"
  - "fixtures/taskflow-profile/governed-invocable.profile.json"
deliverables:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/open-orchestration.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/taskflow/host-opener-policy.ts"
  - "packages/cli/src/commands/taskflow/profile-loader.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "scripts/validate-cli.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "docs/specs/taskflow-profile-v1.md"
  - "fixtures/taskflow-profile/governed-invocable.profile.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-task-ledger-governance.ts --mode validate"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if taskflow open/close messaging or routing blocks legitimate governed recovery flows or falsely demotes a still-required backend path."
atomizationImpact:
  ownerAtomOrMap: "atm.taskflow-open-close-operator-surface-map"
  mapUpdates:
    - "docs/specs/taskflow-profile-v1.md"
outOfScope:
  - "Broad broker or steward workflow redesign outside task open/close surfaces"
  - "Historical rewrite of already closed task ledgers"
  - "Unrelated tasks.ts internal module extraction"
nonGoals:
  - "Do not let `tasks new` or `tasks import` read as equivalent official opener surfaces when taskflow open is available."
  - "Do not keep reconcile residue on the same operator lane as normal queue-head execution when ATM can classify it as closeback-only work."
  - "Do not leave the close result as prose-only guidance when ATM can compute the exact stage/commit bundle."
---

# TASK-CID-0063 - Taskflow open-close default lane hardening and reconcile residue queue-head demotion

## Goal

Make `taskflow open` and `taskflow close` the unmistakable operator-facing default, reduce the hidden cost where reconcile residue occupies the same queue-head lane as ordinary task execution, and productize the CID lane into one complete open-to-close loop across the planning and target repos.

## Problem

ATM now documents a newer open/close lifecycle:

- `taskflow open` is the official governed opener orchestration entry;
- `taskflow close` is the official closeback orchestration entry;
- `tasks new` is only the low-level template generator;
- `tasks close` and `tasks reconcile` remain authoritative backends.

But the real operator experience is still too ambiguous:

- `taskflow open` can fall back into template-only mode when the opener profile is missing;
- the CID profile currently still requires explicit output-path selection because canonical slug/path policy is not fully encoded;
- the 3KLife adaptor is supposed to be the reference adopter profile, but the product contract does not yet guarantee that "opening a 3KLife task" implicitly opens the corresponding ATM governed task;
- the same gap exists on close: "closing a 3KLife task" should mean the planning repo and target repo closeback both happen through one governed ATM story, not as two remembered manual procedures;
- Captain and worker threads can still drift back to the older mental model of hand-authored task cards, `tasks import`, and backend-first closeout recovery;
- reconcile residue can still feel like a normal queue-head blocker instead of a distinct closeback lane.
- closeback currently does not deterministically present one stage/commit bundle for the exact planning-repo and target-repo files that should be committed together.

That means ATM still leaks governance bookkeeping cost to the operator instead of absorbing it as product behavior.

## Required Work

- Harden `taskflow open` so the operator-facing output clearly distinguishes:
  - governed opener path available;
  - fallback-only mode;
  - why fallback happened;
  - what exact next command restores the governed opener path.
- Complete the CID taskflow profile path policy so `taskflow open --profile ../3KLife/docs/ai_atomic_framework/cid-hardening/taskflow.profile.json --write` can auto-resolve the canonical CID output path without template-only fallback or explicit `--output` when the host policy has enough information.
- Treat the 3KLife adaptor as the reference adopter contract: when a host project implements the same taskflow profile/adaptor shape, its host-side "open task" action must implicitly perform the ATM governed opener flow, including target runtime import and evidence that both repo sides were touched as intended.
- Harden `taskflow close` so closeback and reconcile guidance is surfaced as the primary operator workflow instead of requiring backend command memory.
- Extend `taskflow close` so the result models the planning repo and target repo as one governed closeback story:
  - target-repo runtime ledger close or reconcile;
  - planning-repo task card status/mirror closeback when the source plan path is known;
  - roster update when the active profile asks for it;
  - explicit fail-closed behavior when either side cannot be safely computed.
- Treat host-side close through the 3KLife adaptor as an ATM close request: the close action must run the target repo backend close/reconcile, update the planning repo task card/mirror status, and prepare one deterministic commit package instead of asking the operator to remember separate repo-specific commands.
- Demote legacy opening language so `tasks new` is clearly framed as generation-only and `tasks import` is not misread as the normal official opener path for this CID family.
- Add CLI wording and regression coverage proving that reconcile residue is classified and guided as closeback-only work, not as an indistinguishable queue-head execution blocker.
- Add or refresh the minimal taskflow profile contract and fixture(s) needed to exercise a governed-invocable opener path in regression coverage.
- Add a deterministic governed stage/commit bundle to the `taskflow close` result. The bundle must list the exact target-repo files and planning-repo files that belong to the closeback package, separate files by repo, and expose the staging commands or governed commit commands ATM expects an operator or wrapper to run.
- The bundle must include real deliverables, matching `.atm/history/tasks/<task>.json`, `.atm/history/evidence/<task>.json`, `.atm/history/task-events/<task>/`, planning task card updates, and roster/index updates when applicable.
- Keep backend authority unchanged: `tasks close` / `tasks reconcile` remain the trusted execution engines, but operator guidance must route to them through `taskflow close`.

## Acceptance Signals

- A Captain or worker can discover the correct open/close path from CLI help or command output without relying on chat memory.
- If the opener profile is missing, ATM explicitly says it is in fallback-only mode and names the missing prerequisite instead of quietly blending into legacy behavior.
- Under the CID hardening profile, `taskflow open` can allocate `TASK-CID-NNNN` and resolve `docs/ai_atomic_framework/cid-hardening/tasks/<task-id>-<slug>.task.md` or the profile-defined canonical equivalent without requiring a human-supplied output path.
- `taskflow open --write` creates the planning card and imports the task into the target repo runtime in one governed opener flow, with clear evidence showing both sides.
- A 3KLife adaptor open operation is equivalent to a governed ATM open operation: downstream projects using the same adaptor/profile contract must not need a separate manual ATM import step.
- `taskflow close --write` can execute the target repo backend close/reconcile and the planning repo closeback/mirror story as one governed flow when both sides are computable.
- A 3KLife adaptor close operation is equivalent to a governed dual-repo ATM close operation: target repo close/reconcile, planning repo status/mirror closeback, and the final commit package are computed together.
- Reconcile residue no longer reads like a generic queue-head blocker when ATM can prove the remaining work is closeback-only.
- `taskflow close` returns a deterministic stage/commit bundle that names all files that must be staged in the target repo and all files that must be staged in the planning repo, plus the suggested commit grouping.
- The close bundle must fail closed rather than omit files when it cannot compute either repo's required closeback files.
- Regression coverage proves that legacy low-level commands are described as secondary surfaces and that taskflow open/close is the default operator lane.

## Validation

```powershell
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-task-ledger-governance.ts --mode validate
git diff --check
```

## Report Back

Report:

- the new operator-facing wording for task opening and closeback;
- the fallback-only diagnostic now emitted when a governed opener profile is missing;
- proof that CID profile open can resolve canonical task output without explicit `--output`;
- proof that the 3KLife adaptor open path is an implicit ATM governed open path and can serve as the reusable adopter standard;
- proof that taskflow close can represent planning_repo + target_repo closeback in one governed result;
- proof that the 3KLife adaptor close path is an implicit dual-repo ATM close path;
- the deterministic stage/commit bundle schema and an example bundle for a CID task;
- the exact reconcile-residue / queue-head behavior change now enforced;
- regression cases added;
- validator results and commit SHA.
