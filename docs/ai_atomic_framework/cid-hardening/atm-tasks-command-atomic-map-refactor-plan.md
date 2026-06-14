---
doc_id: doc_cid_tasks_command_atomic_map_refactor_plan
title: "ATM tasks command atomic map refactor plan"
status: planned
created_at: "2026-06-12T19:05:00+08:00"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
related_forensics:
  - docs/ai_atomic_framework/cid-hardening/atm-abnormal-release-forensics-report.md
task_family:
  - TASK-CID-0050
  - TASK-CID-0051
  - TASK-CID-0052
  - TASK-CID-0053
  - TASK-CID-0054
  - TASK-CID-0055
  - TASK-CID-0056
  - TASK-CID-0057
  - TASK-CID-0058
  - TASK-CID-0059
  - TASK-CID-0061
  - TASK-CID-0062
  - TASK-CID-0063
  - TASK-CID-0065
  - TASK-CID-0066
  - TASK-CID-0067
  - TASK-CID-0068
  - TASK-CID-0069
  - TASK-CID-0070
  - TASK-CID-0071
  - TASK-CID-0072
  - TASK-CID-0073
  - TASK-CID-0074
  - TASK-CID-0075
  - TASK-CID-0076
  - TASK-CID-0077
  - TASK-CID-0078
  - TASK-CID-0079
  - TASK-CID-0080
  - TASK-CID-0081
  - TASK-CID-0082
  - TASK-CID-0083
  - TASK-CID-0084
  - TASK-CID-0085
  - TASK-CID-0086
---

# ATM tasks command atomic map refactor plan

This plan is the follow-up refactor track after the TASK-CID-0046, TASK-CID-0048, and TASK-CID-0049 hardening work.

The purpose is not to rewrite `packages/cli/src/commands/tasks.ts` in one risky pass. The purpose is to turn the current giant command file into an explicit atomic map, then extract the governance invariants into small, tested modules that can be shared by `tasks`, `next`, `claim`, `close`, and `reconcile` flows.

## Diagnosis

The abnormal-release incident was caused by a real governance invariant gap: ATM over-trusted `status=done` and did not require governed closeout provenance at every admission checkpoint.

The large `tasks.ts` file did not create that invariant gap by itself, but it amplified the risk:

- lifecycle, closeout, dependency, historical-delivery, lock, status, residue, and diagnostics behavior are co-located in one command file;
- similar provenance checks appear in more than one surface, including `tasks.ts` and `next/route-predicates.ts`;
- a developer or agent can patch one path while another path still admits unsafe state;
- regression tests are currently CLI-heavy and do not isolate the invariant modules as first-class units.

## Refactor Principle

Do not split by line count. Split by governance invariant.

Each extracted atom must have:

- one owner module;
- explicit input and output types;
- direct unit or focused regression tests;
- at least one CLI-level regression proving the command surface still behaves correctly;
- a rollback path by reverting the task commit.

## Atom/Map Design Pattern Guidance

Each remaining extraction task should preserve atom/map semantics by choosing the smallest pattern that matches the invariant being touched:

- Use a **Policy Object** when the atom answers whether an operation is allowed, blocked, waived, or recoverable. Examples: lifecycle transition policy, dependency admission policy, emergency backend permission policy.
- Use a **Strategy Map** when a surface dispatches by mode or bucket. Examples: close mode, residue bucket, historical-delivery classification, taskflow closeback route.
- Use a **Result Contract Object** when the atom emits evidence, diagnostics, bundles, or provenance. Examples: `atm.taskResidueDiagnosis.v1`, `atm.taskflowGovernedCommitBundle.v1`, closure packet delivery proof.
- Use a **Facade** only for operator-facing lanes. `taskflow open` and `taskflow close` should select atoms and strategies; they should not reimplement backend rules.
- Use an **Adapter/Port** only at host boundaries such as planning repo profiles, 3KLife closeback/open hooks, or future adopter integrations.

Pipeline-style validation is allowed only when each stage is a named atom with a stable result contract. Do not replace one giant `tasks.ts` flow with a long anonymous inline pipeline.

During each task, extract only the atom already in scope for that card. If a useful adjacent extraction appears, record it in the report or atomic map rather than expanding the task.

## Atomic Map

| Atom | Owns | First task |
| --- | --- | --- |
| `TasksCommandAtomicMap` | read-only function/flow inventory, caller map, duplication map | TASK-CID-0050 |
| `TasksInvariantCharacterization` | regression fixtures for current and desired behavior | TASK-CID-0051 |
| `CloseoutProvenanceAtom` | closure packet and close transition trust checks | TASK-CID-0052 |
| `DependencyGateAtom` | dependency satisfaction for `next` and `tasks claim` | TASK-CID-0053 |
| `TaskLifecycleAtom` | valid task state transitions and close preconditions | TASK-CID-0054 |
| `HistoricalDeliveryAtom` | delivery commit, scope proof, and waiver semantics | TASK-CID-0055 |
| `ScopeLockAtom` | allowed files, dirty files, direction lock, and claim lock diagnostics | TASK-CID-0056 |
| `ResidueDiagnosticAtom` | status/residue/ambiguous-manual-review explanation | TASK-CID-0057 |
| `TasksThinCliWrapper` | command orchestration after invariant extraction | TASK-CID-0058 |
| `AtomicMapValidationPack` | final dogfood benchmark and evidence table | TASK-CID-0059 |

## Milestones

### M1 - Map before mutation

- TASK-CID-0050 produces the read-only atomic map and caller map.
- TASK-CID-0051 adds characterization tests and unsafe-case regressions.

No source refactor is allowed before M1 is complete.

### M2 - Extract hard safety invariants

- TASK-CID-0052 extracts closeout provenance.
- TASK-CID-0053 extracts dependency gating.
- TASK-CID-0054 extracts lifecycle state machine checks.
- TASK-CID-0055 extracts historical-delivery provenance checks.

M2 protects the P0 release gates first.

### M3 - Extract diagnostics and operational surfaces

- TASK-CID-0056 extracts scope and lock diagnostics.
- TASK-CID-0057 extracts residue and ambiguous-state diagnostics.

M3 should improve human and agent guidance without changing safety semantics.

### M4 - Reduce the giant command file

- TASK-CID-0058 turns `tasks.ts` into a thinner CLI orchestration layer.
- TASK-CID-0059 validates the final map, records before/after size and responsibility changes, and adds evidence that no known abnormal-release path reopened.

## Dependency Order

```text
TASK-CID-0050
  -> TASK-CID-0051
    -> TASK-CID-0052
    -> TASK-CID-0053
    -> TASK-CID-0054
    -> TASK-CID-0055
      -> TASK-CID-0056
      -> TASK-CID-0057
        -> TASK-CID-0058
          -> TASK-CID-0059
```

TASK-CID-0052 through TASK-CID-0055 may be prepared in parallel after TASK-CID-0051, but only one task may own `packages/cli/src/commands/tasks.ts` at a time unless the broker conflict arbitration path is active.

## Non-goals

- Do not rewrite task storage or introduce a second registry.
- Do not move planning-repo task cards into the framework repo.
- Do not weaken TASK-CID-0046 / 0048 / 0049 hard gates to make refactoring easier.
- Do not perform a broad formatting-only rewrite of `tasks.ts`.

## Follow-up - post-forensics surface invariant hardening

The abnormal-release forensics and the later `tasks.ts` drift incident exposed a second class of risk beyond the original closeout gaps:

- a giant governance command file can lose required helper exports or admission logic without the failure being framed as a first-class governance breach;
- release/source drift can survive longer than it should because ATM relies more on broad build and CLI validation than on explicit command-surface invariants;
- workers can be inside valid task lanes while the framework still lacks a hard fail-fast gate for "core command surface has silently shrunk."

This follow-up therefore adds a two-layer repair track after the current atomic-map family:

### Layer 1 - fail-fast surface invariant hard gate

- TASK-CID-0061 adds a dedicated validator and admission-time checks for required `tasks.ts` governance surface exports, helper availability, and source/release drift.
- TASK-CID-0061 also defines the public service contract that other command surfaces are allowed to depend on, so the refactor can target a stable interface instead of a giant file.
- The goal is to turn "core command surface silently missing" into an immediate, named ATM failure instead of a downstream build surprise.

### Layer 2 - reduce blast radius by ownership split

- TASK-CID-0062 extracts the most coupling-prone governance invariants into smaller modules after the hard gate exists.
- TASK-CID-0062 must preserve the Layer 1 public contract while moving implementation behind it.
- The goal is not a cosmetic split. The goal is to reduce the chance that one worker can accidentally break `next`, `claim`, `close`, `taskflow`, and historical-delivery behavior in one edit pass.

### Follow-up sequencing

```text
TASK-CID-0059
  -> TASK-CID-0061
    -> TASK-CID-0062
```

`TASK-CID-0061` must land before `TASK-CID-0062`, because the hard gate is what protects the refactor lane from silently reintroducing the same class of breach.

## Follow-up - operator open-close lane hardening

The newer operator-facing task lifecycle now distinguishes:

- `taskflow open` as the official governed opener orchestration entry;
- `taskflow close` as the official closeback orchestration entry;
- `tasks new` as a low-level generator only;
- `tasks close` / `tasks reconcile` as authoritative backends.

But the product still leaks too much lifecycle ambiguity when the opener profile is missing or when reconcile residue appears after source delivery already exists.

### Layer 3 - make the new lane unmistakable

- TASK-CID-0063 hardens the operator-facing taskflow lane so Captain and worker threads are pushed toward `taskflow open` / `taskflow close` first.
- TASK-CID-0063 also reduces the hidden cost where reconcile residue occupies the same queue-head mental lane as ordinary execution work.
- TASK-CID-0063 completes the CID lane profile so `taskflow open` can allocate and resolve the canonical task-card output path without human `--output` glue when the profile has enough information.
- TASK-CID-0063 treats the 3KLife adaptor as the reference adopter contract: a host-side 3KLife open action must implicitly perform the ATM governed open flow, and future adopter projects using the same contract should inherit that behavior.
- TASK-CID-0063 makes `taskflow close` report and, where safe, execute one governed closeback story across `planning_repo` and `target_repo`, rather than leaving target close and planning mirror close as separate operator memories.
- TASK-CID-0063 treats the 3KLife adaptor close action as an implicit dual-repo ATM close: target repo close/reconcile, planning repo closeback, and the final commit package must be computed together.
- TASK-CID-0063 adds a deterministic governed stage/commit bundle so closeback can name the exact files that belong in the target repo commit package and the planning repo commit package.
- The goal is to make the new open/close model feel like the obvious default, make legacy generation/import paths read as explicit fallback-only surfaces, and remove the repeated hidden cost of manually reconstructing what should be staged and committed after close.

### Extended sequencing

```text
TASK-CID-0059
  -> TASK-CID-0061
    -> TASK-CID-0062
      -> TASK-CID-0063
        -> TASK-CID-0065
```

## Follow-up - emergency maintenance permission lane

TASK-CID-0063 makes `taskflow open` and `taskflow close` the normal operator lane, but it does not by itself prevent an agent from directly invoking powerful backend repair surfaces. Historical CID residue showed that backend commands are sometimes necessary, but they must feel like emergency maintenance, not like ordinary task work.

TASK-CID-0065 adds a short-lived, machine-checkable emergency permission lease system. The goal is to let humans approve exceptional recovery without creating a permanent bypass path for future agents.

### Permission model

ATM must define emergency permissions as named capabilities, not as free-form prose. Each capability is scoped narrowly enough to prevent accidental broad authority, but simple enough to extend through a policy table.

| Permission | Covers | Default lane | Emergency requirement |
| --- | --- | --- | --- |
| `backend.tasks.close` | direct `tasks close`, including historical delivery close | `taskflow close` | lease required when invoked directly |
| `backend.tasks.reconcile` | direct `tasks reconcile` for historical delivery / stale-import repair | `taskflow close` | lease required when invoked directly |
| `backend.tasks.import.write` | direct `tasks import --write`, `--force`, `--force-overwrite-claims`, `--reset-open` | `taskflow open` or governed profile import | lease required for write or force forms |
| `backend.tasks.repairClosure` | direct `tasks repair-closure`, especially `--amend` | `taskflow close` closeback plan | lease required for direct use; `--amend` is high-risk |
| `backend.tasks.reset` | lifecycle reset / reopen / rollback state mutation | explicit recovery flow | lease required |
| `backend.tasks.lockCleanupGlobal` | `tasks lock cleanup --all-stale` and other global lock cleanup | scoped taskflow close cleanup | lease required for global cleanup |
| `backend.tasks.scopeAmend` | `tasks scope add` outside an active taskflow-guided claim | normal claim scope extension | lease required when no active guided claim exists |
| `backend.waiver.historicalDeliveryOutOfScope` | `--waiver-out-of-scope-delivery` | narrow historical delivery verification | lease required when the delivery contains out-of-scope files |
| `backend.runnerRecovery` | `--allow-stale-runner` and runner drift bypass | build/sync runner first | lease required |
| `backend.gitHookBypass` | any ATM wrapper path that would suggest `--no-verify` or equivalent hook bypass | governed commit wrapper | lease required and normally disallowed in CI |

This list is intentionally policy-driven. New capabilities can be added by extending an emergency permission registry with: `permissionId`, matched command/action, risk tier, normal lane, allowed flags, required scope fields, default TTL, maximum uses, and validator/audit requirements.

### Lease contract

Emergency authorization must be represented by an ATM-generated lease, not by an agent-authored sentence. A human approval sentence is still recorded, but the backend command only trusts the lease id.

Lease schema: `atm.emergencyMaintenanceLease.v1`.

Minimum fields:

- `leaseId`
- `taskId`
- `actor`
- `permissionId`
- `surface`
- `approvedBy`
- `approvalText`
- `reason`
- `createdAt`
- `expiresAt`
- `maxUses`
- `usedCount`
- `scope`
- `matchedCommand`
- `status`

The expected approval flow is:

```powershell
node atm.mjs emergency approve --task TASK-CID-0043 --actor 004 --permission backend.tasks.reconcile --reason "Legacy CID stale-import closeback approved by human" --ttl-minutes 30 --json

node atm.mjs tasks reconcile --task TASK-CID-0043 --actor 004 --delivery-commit 00be417f --emergency-approval EMG-... --json
```

The CLI must validate that the lease matches the task, actor, permission, command surface, allowed flags, TTL, and use count before mutation. If validation fails, the command must fail closed with `ATM_EMERGENCY_LANE_APPROVAL_REQUIRED` or a more precise lease error.

### Normal versus emergency boundary

The boundary must not be too strict:

- `taskflow open --write` and `taskflow close --write` are normal operator work and do not require emergency permission.
- scoped cleanup that `taskflow close` computes as part of the same closeback bundle can stay normal.
- read-only diagnosis, `tasks status`, `tasks audit`, `taskflow close --dry-run`, and `tasks import --dry-run` stay normal.

The boundary must not be too loose:

- direct backend lifecycle mutation requires a lease;
- broad force flags require a lease;
- out-of-scope historical-delivery waiver requires a lease;
- global lock cleanup requires a lease;
- hook bypass and stale-runner bypass require a lease.

### Enforcement points

TASK-CID-0065 must enforce the lane at more than one layer:

- CLI parser / command dispatcher rejects protected backend surfaces without a matching lease.
- `next` recommends `taskflow close` as the ordinary path and emits a human-facing approval notice before any emergency backend command.
- Help text marks protected backend commands as emergency backend surfaces, not operator defaults.
- Emergency command execution writes an audit event using `atm.emergencyMaintenanceUse.v1`.
- `tasks audit --staged` and pre-commit validation reject emergency artifacts that lack a matching lease/use event pair.
- The taskflow governed bundle must not claim success if it detects unapproved emergency backend artifacts.

### Acceptance

- A direct `tasks close`, `tasks reconcile`, `tasks import --write`, or `tasks repair-closure` mutation without a lease fails before mutating files.
- The same recovery through `taskflow close --write` remains allowed when taskflow can compute a safe closeback story.
- A valid one-task, one-permission lease allows only the matching backend command and cannot be reused outside its TTL/use count.
- A fake or free-form human approval sentence without a valid lease id is rejected.
- `--waiver-out-of-scope-delivery`, `--allow-stale-runner`, `--force-overwrite-claims`, `--amend`, and `lock cleanup --all-stale` are covered by explicit emergency permissions.
- Audit evidence records the lease, use event, command, actor, affected task, and before/after status.
- Regression tests prove that an agent cannot bypass TASK-CID-0063 by calling backend close/reconcile/import/repair-closure directly.

## Reassessment - document versus code gap report

A later document-versus-code gap report identified three kinds of remaining incompleteness:

- `[D]` documentation or workflow examples that describe the operator lane incorrectly or too optimistically;
- `[C]` implemented CLI behavior that works but still leaks hidden cost or ambiguity to the operator;
- `[X]` design gaps where the product still lacks a first-class fallback or boundary contract.

Some reported items are already covered by landed work:

- TASK-CID-0068 covers the `ambiguous-manual-review` false-positive residue bug for fully closed done/done tasks.
- TASK-CID-0072 covers the deterministic target-deliverable bundle problem exposed by TASK-CID-0071, including fail-closed behavior and dry-run review structure for `taskflow close`.

The remaining uncovered gaps are real and should be added to the CID plan rather than left as informal notes.

### New follow-up gaps

#### TASK-CID-0073 - operator guidance and backend wording normalization

This card should absorb the operator-facing inconsistencies from the gap report:

- `taskflow open --dry-run` should emit an unmistakable write-readiness hint when the profile is in fallback mode instead of forcing operators to infer that `--write` will fail.
- workflow docs and examples should stop implying framework-repo local `docs/taskflow.profile.json` and instead point to adopter/profile-owned paths.
- `next --claim` guidance should prefer an explicit task-scoped form when ATM already knows the selected task, rather than forcing a second natural-language `--prompt` hop.
- low-level surfaces such as `tasks new` should be labeled as backend/template-generator surfaces in help and guidance, not as co-equal operator lanes.

This is partly docs and partly CLI wording; the goal is to reduce avoidable operator confusion without changing closeout authority.

#### TASK-CID-0074 - profile-root closeback fallback when `source.planPath` is absent

The report exposed a real design hole: `taskflow close` still depends too strongly on `taskDocument.source.planPath`. Tasks created or claimed through alternative governed paths can lack that pointer even when the active profile knows the planning root and canonical path policy.

This card should teach `taskflow close` to recover the planning-side closeback path from governed profile/adaptor metadata when `source.planPath` is missing, instead of failing forever with planning-frontmatter-missing even though the operator is still inside a valid dual-repo contract.

This is a first-class product gap, not only a docs issue.

#### TASK-CID-0075 - evidence operator lane simplification and raw-surface demotion

The report also showed a governance UX mismatch around evidence capture:

- the product increasingly expects `evidence run` as the ordinary operator path;
- `evidence add` remains available, but its raw command/sha contract is too easy to misread as the default lane;
- workflow docs and command guidance should make it clear when `evidence run` is preferred and when `evidence add` is an admin/raw surface.

This card should align docs, CLI wording, and validation expectations so agents do not produce a false-pass mental model where "I ran a validator in the terminal" is treated as equivalent to governed evidence.

### Deferred but acknowledged

The gap report also identified a useful but non-blocking follow-up around profile-overridable target/planning commit-message templates for taskflow close. Keep this as backlog unless adopter pressure makes it urgent; it is lower priority than deterministic bundle correctness, closeback fallback, and evidence/operator-lane clarity.

## Follow-up - review-state closeout reclaim lifecycle repair

The 0047 closeback recovery wave exposed one more genuine product gap after TASK-CID-0063 and TASK-CID-0065:

- a task can reach `review`;
- source delivery can already be real and historically provable;
- the operator may need only a governed closeout-only reclaim to finish `done`;
- but the CLI currently leaves that state mechanically stranded unless an emergency-style reset/open overwrite is used.

That is not just old residue. It is a lifecycle dead-end inside the normal state machine.

### TASK-CID-0076 - repair the `review -> done` closeout-only reclaim path

- TASK-CID-0076 hardens the lifecycle so a released review-state task can be reclaimed through a governed closeout-only route when valid current or historical deliverable proof exists.
- The fix must work for normal target-repo closeout and for planning-authority tasks such as TASK-CID-0047, where the real deliverable may already live in the planning repo.
- The fix must not broaden ordinary write claims, weaken done proof requirements, or reintroduce direct backend reset/import as the preferred operator path.
- `next --claim` and taskflow closeback guidance should point to the repaired reclaim route instead of leaving operators in an invalid reset/open loop.

This follow-up is deliberately after TASK-CID-0063 and TASK-CID-0065 because the normal operator lane and emergency backend boundary must already exist before we make review-state reclaim smoother.

### Extended sequencing

```text
TASK-CID-0063
  -> TASK-CID-0065
    -> TASK-CID-0068
      -> TASK-CID-0069
        -> TASK-CID-0070
          -> TASK-CID-0072
            -> TASK-CID-0073
            -> TASK-CID-0074
            -> TASK-CID-0075
              -> TASK-CID-0076
```

## Follow-up - operator residue cleanup after the 0073-0076 wave

The 0073-0076 closeout wave fixed the biggest operator-lane holes, but the
captain closeback run exposed one more class of ATM/UX residue:

- ATM can distinguish "prompt mentions a task family" from "no open work
  remains", but `next` still reports the empty-scope case as
  `TASK_SCOPE_NOT_FOUND`, which feels like a lookup bug instead of a clean
  "nothing left to do" result;
- command-backed evidence remains too brittle around validator-command string
  matching and same-task concurrent writes;
- `taskflow close --dry-run` still hides some blockers that the real close path
  later rejects, which leaks hidden operator cost;
- emergency leases burn uses too eagerly when a command fails before any
  protected mutation succeeds;
- release/root-drop sync still depends on hidden staging knowledge for newly
  generated ignored artifacts;
- `evidence validators --list`, `taskflow close --dry-run`, and the eventual
  `tasks close` failure surface can disagree about which validators are truly
  closure-required for the same task, so the operator sees multiple conflicting
  "required" sets before the close actually succeeds;
- unrelated integration-adapter drift can fail `doctor` even when the governed
  close path for a task remains valid, which makes environment-wide editor
  packaging drift feel like a task-scoped close blocker;
- `taskflow close --write` can advance the task into a committed source-delivery
  state and only then reveal that the operator must switch to a second
  `--historical-delivery <sha>` close pass, so the lane transition is truthful
  in hindsight but not obvious enough up front.

These are not the same problem. They are a post-closeout cleanup pack around
operator truthfulness, evidence determinism, and release ergonomics.

### TASK-CID-0077 - prompt-scoped empty-queue no-work normalization

- Distinguish "the requested task scope does not exist" from "the requested
  task scope exists conceptually but no open imported work remains".
- `next --prompt` should expose a stable no-open-work status and message for the
  empty queue case instead of reusing `ATM_NEXT_TASK_SCOPE_NOT_FOUND`.
- Validation must cover both outcomes so explicit unknown scope still fails
  closed.

### TASK-CID-0078 - validator remediation command canonicalization

- ATM currently over-trusts exact command spelling in some validator/evidence
  remediation paths (`git diff --check` vs alias-like validator keys, `npm test`
  vs normalized names).
- Normalize command-backed validator matching onto a canonical representation so
  equivalent governed commands are recognized without weakening evidence
  requirements.
- This card is about command identity and remediation truthfulness, not about
  changing which validators are required.

### TASK-CID-0079 - same-task evidence write serialization

- Parallel `evidence run` against the same task can race on bundle updates and
  silently lose command-backed proof.
- Add an explicit same-task serialization or lock discipline for evidence writes
  so parallel runs fail closed or queue safely instead of winning by last write.
- Validation must prove that command-backed evidence for one validator cannot
  erase another validator recorded in the same session.

### TASK-CID-0080 - taskflow close dry-run parity and hidden-blocker disclosure

- `taskflow close --dry-run` must disclose the same high-value blockers that the
  real close lane will reject later, including active-claim requirements,
  historical-delivery repo constraints, and out-of-scope waiver needs.
- The goal is not to make dry-run mutate more; the goal is to stop promising a
  path that the real close command cannot take.
- The closeback story should stay fail-closed, but its diagnostics must become
  truthier earlier.

### TASK-CID-0081 - emergency lease use-count semantics hardening

- One-use emergency leases should not be consumed merely because a protected
  command reached a validation failure before mutation.
- Lease use accounting should advance only after the protected surface confirms
  the approved mutation path actually executed.
- Audit evidence must still record failed attempts, but failed attempts must not
  silently burn the only remaining governed recovery use.

### TASK-CID-0082 - release root-drop generated-artifact staging contract

- Release/root-drop sync currently relies on operator memory for ignored
  generated artifacts that still belong in a governed release bundle.
- Add an explicit release staging contract so newly generated root-drop
  artifacts do not require hidden `git add -f` knowledge.
- The goal is to make release sync reproducible and visible, not to weaken the
  ignored-artifact boundary for unrelated files.

### TASK-CID-0083 - historical-delivery close evidence-context deadlock hardening

- Historical-delivery close currently has a deadlock when the operator records
  fresh same-task evidence after the source delivery commit but before final
  close.
- `taskflow close --dry-run` can preview the task evidence file as an expected
  governed bundle member, yet `taskflow close --write` and backend
  `tasks close --historical-delivery` still reject that same evidence file as
  `ATM_TASK_CLOSE_DIRTY_WORKTREE` before the close transition exists.
- An evidence-only commit is then blocked by
  `ATM_PROTECTED_STATE_EVIDENCE_FILE_MISSING_TASK_CONTEXT`, because the staged
  task/event context the hook requires is exactly what the close lane refused to
  generate.
- This card must remove that operator deadlock without weakening evidence or
  protected-state governance.

### TASK-CID-0084 - planning mirror claim/import parity and false ambiguous residue hardening

- Imported CID tasks can reach a live-ledger `running` + active-claim state
  while the planning frontmatter remains `planned`.
- `tasks status` and `taskflow close --dry-run` then surface an
  `ambiguous-manual-review` style residue story even though the operator is
  already inside a valid claimed task lane.
- This card must align claim/import/planning-mirror state reflection so status
  guidance does not recommend redundant import repair or hide the actual close
  blocker behind a false planning-status ambiguity.

### TASK-CID-0085 - historical-delivery close evidence-context deadlock hardening successor lane

- `TASK-CID-0083` captured the right product bug, but its first imported runtime
  copy accidentally depended on `TASK-CID-0082`, which makes the card
  unclaimable without a protected `tasks import --write --force` repair.
- Until ATM offers a non-emergency metadata correction lane for this case, the
  captain continuation needs a clean successor card that carries the same
  implementation scope without the impossible dependency edge.
- This card is intentionally a delivery successor, not a second product bug: it
  exists so the governance lane can continue the same fix under a claimable CID
  id while `TASK-CID-0083` remains recorded as the original issue statement.

### TASK-CID-0086 - historical-delivery close evidence-context hardening with focused regression deliverable

- `TASK-CID-0085` proved the implementation path, but the final source bundle
  also contained a new focused regression file under
  `packages/cli/src/commands/tasks/__tests__/scope-lock-diagnostics.test.ts`.
- ATM's current `tasks scope add` lane updates `allowedFiles`, but it does not
  promote that file into the imported task's declared deliverable set for
  historical-delivery close validation.
- This successor card exists so the same landed source commit can be closed
  through a truthful CID contract where the focused regression file is a
  first-class deliverable instead of an out-of-scope historical source file.

### Extended sequencing

```text
TASK-CID-0073
  -> TASK-CID-0074
  -> TASK-CID-0075
    -> TASK-CID-0076
      -> TASK-CID-0077
      -> TASK-CID-0078
      -> TASK-CID-0079
      -> TASK-CID-0080
        -> TASK-CID-0081
        -> TASK-CID-0082
        -> TASK-CID-0083
        -> TASK-CID-0085
        -> TASK-CID-0086
          -> TASK-CID-0084
```

### 2026-06-14 operator friction notes

- `TASK-CID-0077` confirmed that `ATM_RUNNER_SYNC_REQUIRED` plus mandatory
  `npm run build` can regenerate tracked `release/` outputs that are still
  outside the active direction lock allowed files. This is now explicitly
  tracked by `TASK-CID-0082`.
- `TASK-CID-0077` also confirmed that `tasks close` can report all
  closure-required validators passed and still force a separate governed commit
  cycle before the actual close transition when scoped files remain dirty. This
  is now explicitly tracked by `TASK-CID-0080`.
- During the same run, a plain `git commit` still discovers the wrapper-only
  commit rule only after the pre-commit hook fires. That extra operator retry is
  folded into the `TASK-CID-0080` follow-up rather than left as tribal
  knowledge.
- Evidence writes were kept intentionally serial because multiple `evidence run`
  operations target the same task evidence file. The fact that the safe path is
  mostly tacit is one of the motivations behind `TASK-CID-0079`.
- `TASK-CID-0082` exposed a real close-lane deadlock after adding fresh
  `validate:git-head-evidence` proof: `taskflow close --dry-run` previews
  `.atm/history/evidence/<task>.json` as an expected governed bundle file, but
  `taskflow close --write` and backend `tasks close --historical-delivery`
  reject the same file as `ATM_TASK_CLOSE_DIRTY_WORKTREE` before the close
  transition exists. An evidence-only commit is then blocked by
  `ATM_PROTECTED_STATE_EVIDENCE_FILE_MISSING_TASK_CONTEXT`, because the hook
  requires the matching staged task ledger change or close event that the close
  lane has not been allowed to generate yet.
- The same `TASK-CID-0082` run also confirmed that surfacing generated release
  files in a manifest is not by itself enough to satisfy the card goal: the
  governed source bundle still required manual `git add -f` for
  `release/atm-root-drop/release-manifest.json`, so the hidden ignored-artifact
  staging knowledge remains a real ATM UX gap even after the first pass.
- The `TASK-CID-0083` follow-up exposed a self-repair gap in task import
  governance. A runtime import that carried the wrong dependency metadata could
  not be corrected through the normal operator lane: `tasks import --write
  --force` is correctly treated as protected emergency maintenance, so a
  sleeping or unavailable approver leaves the operator with no guided repair
  path except creating a successor task id. That is a real ATM product gap, not
  merely bad luck in one run.
- The `TASK-CID-0085` to `TASK-CID-0086` handoff exposed a second parity gap:
  `tasks scope add` can widen `allowedFiles` for the active claim, but
  historical-delivery close still judges the delivery against the imported task
  card deliverables and scope contract. In practice that means an operator can
  add a focused regression file to finish the work and still be forced into an
  out-of-scope historical-delivery story unless a successor card rewrites the
  deliverables explicitly.
- The same sequence also confirmed a truthfulness bug in status guidance:
  `tasks status` on `TASK-CID-0085` surfaced `ambiguous-manual-review` with a
  recommendation to re-run `tasks import --write` even though the task had
  already been intentionally released in favor of `TASK-CID-0086`. The residue
  story remained technically divergent, but the surfaced next step was not the
  unique or most truthful operator lane.
- The 0083/0085/0086 cleanup confirmed two more ATM operator-lane bugs. First,
  running two frozen `node atm.mjs tasks close` commands in parallel can race
  the onefile cache and fail with a missing `packages/cli/dist/commands/atm-chart.js`
  import from `doctor.js`; close mutations should not depend on a partially
  materialized shared cache. Second, `tasks close --status abandoned` can update
  the live ledger and then fail during automatic `git add` because it stages a
  nonexistent `.atm/history/evidence/<task>.json`; abandoned close should stage
  only files it actually produced.
- The 0082/0084 closeback cleanup also exposed two ATM UX gaps. First,
  `emergency approve` can mint a lease for the exact human-approved repair
  intent but omit required protected flags such as `--force`, producing an
  unusable lease instead of previewing the command/flag tuple that will pass.
  Second, `taskflow close --dry-run` can report a close bundle as ready and
  only reveal missing `validate:git-head-evidence` proof during `--write`,
  after the source delivery commit already exists. The dry-run lane should
  surface the same mandatory evidence checklist before it permits the write
  attempt.
