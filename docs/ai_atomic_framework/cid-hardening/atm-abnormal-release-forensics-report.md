---
doc_id: doc_cid_forensics_0047
report_id: ATM-ABNORMAL-RELEASE-FORENSICS-20260613
task_id: TASK-CID-0047
generated_at: "2026-06-13T14:35:00+08:00"
generated_by: "captain"
repos_inspected:
  - AI-Atomic-Framework
  - 3KLife
scope_tasks:
  - TASK-CID-0040
  - TASK-CID-0041
  - TASK-CID-0042
  - TASK-CID-0043
  - TASK-CID-0044
  - TASK-CID-0045
  - TASK-CID-0046
status: captain-ready
---

# ATM Abnormal Release Forensics Report

## Executive Summary

The CID parallel dispatch failure was not caused by one worker mistake. The primary root cause was that ATM treated visible completion signals as stronger than governed closeout provenance. Before the later hardening work, `planning done`, `mailbox done`, source commits, and imported ledger status could look final even when the target ledger had no valid close transition, closure packet, scoped delivery proof, or dependency-enforced admission gate.

Facts found in this review:

- Source delivery commits existed for TASK-CID-0041, TASK-CID-0042, TASK-CID-0043, TASK-CID-0044, and TASK-CID-0045.
- TASK-CID-0040, TASK-CID-0041, TASK-CID-0042, TASK-CID-0043, TASK-CID-0044, and TASK-CID-0045 now have governed target closeout artifacts, but several were repaired after the abnormal run.
- TASK-CID-0043, TASK-CID-0044, and TASK-CID-0045 were still missing governed closeout when TASK-CID-0047 was first blocked and investigated; they were later backfilled by captain governance commits on 2026-06-13.
- The 3KLife planning mirror is still not a reliable source of final truth by itself: current planning cards for TASK-CID-0040, TASK-CID-0044, TASK-CID-0045, and TASK-CID-0047 still show `status: planned` even when the target ledger has moved.
- Mailbox dispatch order existed as human-readable instructions and file placement, but it was not originally enforced as a mechanical prerequisite by `next --claim`, `tasks claim`, or closeout validation.

The strongest conclusion is: source done, planning done, mailbox done, and target ledger done are different states. ATM must make `taskflow open/close` the normal operator lane and reserve direct backend commands for an explicit emergency lane.

## Evidence Table

| Task | Source delivery fact | Current target ledger fact | Planning/mailbox fact | Forensic finding |
| --- | --- | --- | --- | --- |
| TASK-CID-0040 | Commit `daf47aa8` (`feat(broker): update broker registry, decision logic, and tests`) and commit `b373d1ee` (`feat(broker): complete TASK-CID-0040`) recorded delivery/history. Later repair commit `a6f01658` reconciled the closure ledger. | Current `.atm/history/tasks/TASK-CID-0040.json` is `done`, closed by `001`, closure packet `.atm/history/evidence/TASK-CID-0040.closure-packet.json` (`sha256:4f803d9de2b3334ade9baae4a395ba7faf25ff7b37068329406a1d80acba1963`); close event `2026-06-12T13-51-44-606Z-close-786551898dd8.json`; earlier anomaly event `2026-06-12T09-31-46-141Z-claim-displaced-by-import-da3cbcddcfba.json`. | Planning card `TASK-CID-0040-...task.md` still shows `status: planned`. Mailbox has `agents/001/done/P1-CIDHARD-001-S2-TASK-CID-0040--...dispatch.md` plus later cleanup inbox residue. | Fact: target is now governed done. Inference: during the abnormal run, planning mirror and target ledger were already split, proving planning frontmatter cannot be used as closure truth. |
| TASK-CID-0041 | Delivery commit `70594a03` (`feat(broker): add conflict-set matrix... (TASK-CID-0041)`) included broker code and `packages/core/src/broker/decision.ts` drift. | Current target ledger is `done`, closed by `002`; closure packet exists. Repair commit `da4ded32` recorded governed provenance after a waiver for out-of-scope delivery. Events include `2026-06-12T15-47-58-014Z-close-f03a3c3b4060.json` and `2026-06-12T16-07-38-000Z-close-7f4f5a6f8d9b.json`. | Planning card status is `done`; mailbox has `agents/003/done/P1-CIDHARD-003-S1-TASK-CID-0041--...dispatch.md` and later repair dispatch residue under `agents/002/inbox`. | Fact: governed provenance was repaired later. Inference: a broad delivery commit required waiver; without hard closeout validation, a done state could hide scope ambiguity. |
| TASK-CID-0042 | Delivery commit `803ffc33` (`fix: add freeze and patch envelope snapshot protocol`) added freeze/patch envelope code and ATM history. | Current target ledger is `done`, closed by `codex-gpt-5.4-mini`; closure packet exists after repair commit `3668e506`. Close event `2026-06-12T08-30-18-487Z-close-a7eae4c781d1.json`. | Planning card status is `done`; mailbox still has an inbox dispatch under `agents/002/inbox/P1-CIDHARD-002-S2-TASK-CID-0042--...dispatch.md`. | Fact: mailbox state can remain stale even after target close. Inference: mailbox completion and target governance were independent surfaces, so mailbox order was advisory unless checked by ATM. |
| TASK-CID-0043 | Candidate delivery commit `00be417f` (`feat(broker): implement route command for steward takeover and validator-gated apply`) touched `packages/cli/src/commands/route.ts`, route command specs, and steward arbitration tests. | Current target ledger is `done`, closed by `captain` on `2026-06-13T01:40:05.196Z`; closure packet exists. Repair commit `d666126b` added `.atm/history/evidence/TASK-CID-0043.closure-packet.json` and close event `2026-06-13T01-40-05-198Z-close-c70df85aefef.json`. | Planning card is `done`, started/completed by 007 on 2026-06-12. 3KLife commit `c3c8be0a` says `chore(cid): close TASK-CID-0043`. Mailbox has `agents/007/done/P1-CIDHARD-007-S1-TASK-CID-0043--...dispatch.md`. | Fact: planning was done before target governance was backfilled. Inference: this is the clearest stale-import pattern: planning done plus source delivery did not equal governed target closeout. |
| TASK-CID-0044 | Delivery commit `d5c3dea8` (`feat(broker): add recovery and orphan cleanup with validation harness (TASK-CID-0044).`) added recovery/orphan cleanup code and validator. | Current target ledger is `done`, closed by `captain` on `2026-06-13T01:41:55.688Z`; closure packet exists after commit `5f675a76`. Events include reserve/promote/claim and close under `.atm/history/task-events/TASK-CID-0044/`. | Planning card still shows `status: planned`. Mailbox has `agents/008/done/P1-CIDHARD-008-S1-TASK-CID-0044--...dispatch.md` and report `agents/008/reports/P1-CIDHARD-008-S1-TASK-CID-0044--...report.md`. | Fact: source and mailbox delivery existed while planning remained planned and target governance had to be backfilled. Inference: direct git commit plus worker report could bypass task lifecycle if no close gate forced a target close. |
| TASK-CID-0045 | Delivery commit `0285e399` (`feat(broker): add AGR conflict benchmark harness... (TASK-CID-0045).`) added benchmark fixtures, report, package scripts, and validator config. Later commit `8be7a447` restored validator wiring. | Current target ledger is `done`, closed by `captain` on `2026-06-13T01:46:08.398Z`; closure packet exists after commit `60c01d3c`. Events include scope amendment `2026-06-13T01-43-33-990Z-scope-amendment-366843a9f3f1.json`. | Planning card still shows `status: planned`. Mailbox has `agents/008/done/P1-CIDHARD-008-S2-TASK-CID-0045--...dispatch.md` and report `agents/008/reports/P1-CIDHARD-008-S2-TASK-CID-0045--...report.md`. | Fact: the task's source delivery and validation wiring were not enough to keep planning and target governance synchronized. Inference: validator surface drift was a separate risk from closeout bundle drift. |
| TASK-CID-0046 | Implementation commit `b1107ee7` is referenced by prior captain notes as dependency closeout gate hardening. | Current inspection found no `.atm/history/tasks/TASK-CID-0046.json`, no `.atm/history/evidence/TASK-CID-0046.json`, and no `.atm/history/task-events/TASK-CID-0046/` in the target repo. | Planning card `TASK-CID-0046-...task.md` is `done`, with 3KLife commits `428875b8` and `d115159c` both closing or updating the card. | Fact: planning says done, but this target inspection did not find a target ledger entry for 0046. Inference: 0046's fix changed future behavior but does not retroactively prove prior tasks were governed. |

## Evidence Inputs

Commands and files used for this report:

```powershell
node atm.mjs tasks status --task TASK-CID-0047 --json
git log --format='%h %ci %s' --grep='TASK-CID-004' --all -60
git -C C:\Users\User\3KLife log --format='%h %ci %s' --grep='TASK-CID-004' --all -60
git show --stat --oneline --decorate --no-renames 803ffc33 70594a03 00be417f d5c3dea8 0285e399 b373d1ee a6f01658 3668e506 da4ded32 d666126b 5f675a76 60c01d3c e608f0ac
```

Target repo evidence paths:

- `C:\Users\User\AI-Atomic-Framework\.atm\history\tasks\TASK-CID-0040.json` through `TASK-CID-0045.json`
- `C:\Users\User\AI-Atomic-Framework\.atm\history\evidence\TASK-CID-0040.closure-packet.json` through `TASK-CID-0045.closure-packet.json`
- `C:\Users\User\AI-Atomic-Framework\.atm\history\task-events\TASK-CID-0040\` through `TASK-CID-0045\`

Planning and mailbox evidence paths:

- `C:\Users\User\3KLife\docs\ai_atomic_framework\cid-hardening\tasks\TASK-CID-0040-intent-registration-lease-heartbeat-and-lease-bounds.task.md`
- `C:\Users\User\3KLife\docs\ai_atomic_framework\cid-hardening\tasks\TASK-CID-0041-conflict-set-model-and-arbitration-verdicts.task.md`
- `C:\Users\User\3KLife\docs\ai_atomic_framework\cid-hardening\tasks\TASK-CID-0042-freeze-patch-envelope-checkpoint-and-filesystem-wip-snapshot.task.md`
- `C:\Users\User\3KLife\docs\ai_atomic_framework\cid-hardening\tasks\TASK-CID-0043-neutral-writer-steward-takeover-isolated-merge-and-validator-gated-apply.task.md`
- `C:\Users\User\3KLife\docs\ai_atomic_framework\cid-hardening\tasks\TASK-CID-0044-recovery-orphan-cleanup-manual-override-audit-and-snapshot-recovery.task.md`
- `C:\Users\User\3KLife\docs\ai_atomic_framework\cid-hardening\tasks\TASK-CID-0045-conflict-benchmark-validator-catch-rate-and-latency-reporting.task.md`
- `C:\Users\User\3KLife\docs\ai_atomic_framework\cid-hardening\tasks\TASK-CID-0046-dependency-closeout-integrity-gate-for-next-and-claim.task.md`
- `C:\Users\User\3KLife\docs\ai_atomic_framework\cid-hardening\tasks\TASK-CID-0047-atm-parallel-dispatch-closeout-forensics-and-root-cause-report.task.md`
- `C:\Users\User\AI-Atomic-Framework\.atm-temp\captain-dispatch-mailbox\agents\001\done\P1-CIDHARD-001-S2-TASK-CID-0040--captain-to-001--20260612-152700TPE.dispatch.md`
- `C:\Users\User\AI-Atomic-Framework\.atm-temp\captain-dispatch-mailbox\agents\002\inbox\P1-CIDHARD-002-S2-TASK-CID-0042--captain-to-002--20260612-152900TPE.dispatch.md`
- `C:\Users\User\AI-Atomic-Framework\.atm-temp\captain-dispatch-mailbox\agents\007\done\P1-CIDHARD-007-S1-TASK-CID-0043--captain-to-007--20260612-161451TPE.dispatch.md`
- `C:\Users\User\AI-Atomic-Framework\.atm-temp\captain-dispatch-mailbox\agents\008\reports\P1-CIDHARD-008-S1-TASK-CID-0044--008-to-captain--20260612-155300TPE.report.md`
- `C:\Users\User\AI-Atomic-Framework\.atm-temp\captain-dispatch-mailbox\agents\008\reports\P1-CIDHARD-008-S2-TASK-CID-0045--008-to-captain--20260612-155400TPE.report.md`

## Timeline

- 2026-06-12 16:22 +08:00: `00be417f` lands route/steward delivery work later associated with TASK-CID-0043.
- 2026-06-12 16:29 +08:00: `803ffc33` lands freeze/patch envelope work later associated with TASK-CID-0042.
- 2026-06-12 16:54 +08:00: `70594a03` lands conflict-set matrix work for TASK-CID-0041.
- 2026-06-12 16:55 +08:00: `d5c3dea8` lands recovery/orphan cleanup work for TASK-CID-0044.
- 2026-06-12 16:56 +08:00: `0285e399` lands AGR benchmark work for TASK-CID-0045.
- 2026-06-12 17:24 +08:00: `b373d1ee` records TASK-CID-0040 history/evidence but still needed later reconciliation.
- 2026-06-12 18:07 +08:00: TASK-CID-0046 planning card is closed in 3KLife, representing the first hardening response to dependency closeout gaps.
- 2026-06-12 22:58 to 23:48 +08:00: TASK-CID-0040, 0042, and 0041 receive target governance repair commits `a6f01658`, `3668e506`, and `da4ded32`.
- 2026-06-13 09:46 to 09:47 +08:00: TASK-CID-0043, 0044, and 0045 receive target governance closeout commits `d666126b`, `5f675a76`, and `60c01d3c`.
- 2026-06-13 09:48 +08:00: `e608f0ac` records a TASK-CID-0047 unblock check.
- 2026-06-13 14:16 +08:00: TASK-CID-0047 is claimed by captain; current live ledger is `running`, while planning frontmatter remains `planned`.

## Root Cause Tree

Primary root cause:

- ATM did not require a mechanically valid governed closeout packet before downstream work could be treated as unblocked.

Secondary causes:

- Multiple completion surfaces existed: source commit, mailbox report, 3KLife planning card, target task ledger, task events, evidence JSON, and closure packet.
- Some surfaces were human-readable or advisory. Mailbox `depends_on` prose was not equivalent to a claim-time dependency gate.
- `tasks import` could produce ledger state from planning data without proving runtime closeout.
- Historical delivery closeback could be broad and required later waiver/reconcile judgment.
- Direct backend surfaces (`tasks close`, `tasks reconcile`, `tasks import`, `tasks repair-closure`) were powerful enough for repair but also easy for ordinary agents to use as if they were normal operator lanes.
- Planning-repo authority tasks such as TASK-CID-0047 are easy to misunderstand because the deliverable lives in 3KLife while target ledger evidence still exists in AI-Atomic-Framework.
- Validator surface drift is independent from closeout drift. A task can close a bundle while accidentally removing or weakening a prior validator entry unless that surface is itself protected.

## Minimal Reproduction Path

This is the smallest abnormal path inferred from the evidence:

1. Create a task A and a task B where B depends on A.
2. Land A's source delivery commit and mark either the planning card or mailbox dispatch as done.
3. Do not create a valid target close transition with `closure.schemaId=atm.taskClosureTransition.v1`, command-backed evidence, and closure packet.
4. Let B's worker read the planning/mailbox done signal or broad ledger status as enough to proceed.
5. B can now proceed or appear complete while A is only source-done or planning-done, not governed-done.

This path explains the observed failures around TASK-CID-0043 through TASK-CID-0045 before their later governance backfill.

## Answers to Required Findings

- Actually delivered by source commit: TASK-CID-0041 (`70594a03`), TASK-CID-0042 (`803ffc33`), TASK-CID-0043 (`00be417f`), TASK-CID-0044 (`d5c3dea8`), TASK-CID-0045 (`0285e399`). TASK-CID-0040 had delivery/history commit `b373d1ee` plus later governance repair `a6f01658`.
- Only reflected in planning or mailbox at the abnormal point: TASK-CID-0043 was planning-done before target closeout; TASK-CID-0044 and TASK-CID-0045 had source/mailbox delivery while planning cards still currently show planned.
- Valid governed closeout now exists for TASK-CID-0040 through TASK-CID-0045 in target history. Several were not originally governed and were repaired later.
- The exact admission weakness was allowing downstream reasoning to treat `status=done`, planning card `done`, or mailbox `done` as enough, rather than requiring closure transition plus packet.
- `tasks close --historical-delivery` and reconcile flows needed stronger scoped provenance. TASK-CID-0041 required waiver because delivery commit `70594a03` included unrelated `decision.ts` drift; TASK-CID-0040 and TASK-CID-0042 closure packets show broad changed-file sets.
- Frozen runner drift contributed operational confusion in this CID period, but it was not the primary root cause. The primary root cause was missing mechanical closeout provenance enforcement.
- Mailbox dispatch order was prose plus file placement, not a hard task-claim gate at the time.

## Recommendations

Already assigned or completed by TASK-CID-0046:

- Dependency closeout gates must check governed closeout provenance, not just done status.
- `next --claim` and `tasks claim` must fail closed when prerequisites are source-done, planning-done, mailbox-done, or imported-done without valid closeout artifacts.

Already assigned or completed by later CID hardening:

- TASK-CID-0060 clarified source done versus governed done and added the `source-done-governance-incomplete` bucket.
- TASK-CID-0061 fixed the public `tasks.ts` caller-facing surface contract.
- TASK-CID-0063 should make `taskflow open/close` the default dual-repo operator lane with deterministic stage/commit bundle.
- TASK-CID-0065 should protect direct backend close/import/reconcile/repair commands behind explicit emergency approval leases.

New follow-up card candidates:

- Add a planning mirror sync validator that detects `target done` plus `planning planned` for target-repo authority tasks, with deterministic closeback guidance.
- Add a mailbox residue validator that distinguishes archived worker reports from still-actionable inbox dispatches.
- Add a validator/package-script surface invariant so later tasks cannot silently remove prior validators or package script entries.
- Fix residue classification false positives where target and planning are both done with empty divergence but the classifier returns `ambiguous-manual-review`.
- Add explicit documentation for planning-repo authority tasks: where the deliverable lives, what target evidence is still required, and what close command should do.

Immediate captain operating rules:

- Do not accept source commit, planning frontmatter, or mailbox report as done.
- Before assigning a dependent task, run `node atm.mjs tasks status --task <id> --json` and inspect closeout provenance.
- Use `taskflow open` and `taskflow close` for normal work once available; use backend commands only through the emergency lane.
- For historical delivery, require scoped delivery proof and name any waiver explicitly.
- Keep dirty residue cleanup separate from feature closeout; do not let residue repair become a hidden source-change task.

## Validation Command

Run from the planning repo:

```powershell
git -C "C:\Users\User\3KLife" diff --check -- "docs/ai_atomic_framework/cid-hardening/atm-abnormal-release-forensics-report.md"
```
