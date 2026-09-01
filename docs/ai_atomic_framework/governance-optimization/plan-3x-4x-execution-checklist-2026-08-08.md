# Plan 3.0–4.0 Execution and Exit Checklist

Status: `execution-ready / completion-unproven`
Owner: incoming ATM Captain (Claude-007)
Source of truth: `plan-3x-4x-objective-audit-2026-07-31.json` and
`plan-3x-4x-objective-evidence-matrix-2026-07-31.md`

This checklist is an execution aid, not a completion certificate. A checkbox
may be marked complete only when the corresponding evidence tuple is sealed in
the target repository and linked to the objective row. A task ledger in
`done/released` state does not mark a plan objective complete by itself.

## Common evidence tuple (required for every mapped row)

For each source clause/objective, record all ten fields in the audit ledger:

1. source clause anchor and current source digest;
2. owning task card and exact admitted scope;
3. required test-case IDs and catalog shard;
4. command-backed validator receipt with exit status and runner kind;
5. sealed delivery commit, tree/bundle attribution, and runner-sync receipt;
6. rollback or fail-closed proof, including recovery command;
7. `atm.deepModuleReviewReport.v1` for the policy boundary;
8. real dogfood observation (not fixture-only) where the plan requires it;
9. known-bug/incident disposition and regression fixture;
10. release/push provenance, or an explicit no-push disposition.

Null, stale, ambiguous, unsupported, or prose-only values keep the row
`not-complete`. A failed command must preserve the prior authority and record
the next governed recovery route; it must not be converted to pass by waiver.

## Plan exit gates

| Plan | Required work before exit | Mandatory proof | Exit decision |
|---|---|---|---|
| 3.0 | Re-run every clause in §完成門檻 (820–836), including migration, rollback, telemetry, performance, remote closeback and backlog continuity | One fresh sealed evidence tuple per clause; no historical-only substitution; rollback replay reaches the prior authority | `verified` only when all 17 clauses are verified |
| 3.1 | Re-run all 23 clauses in §Plan 3.1 完成門檻 (526–548), including authority, compose, runner, identity, autonomous command, parity and rollback | Frozen/source runner parity, command identity receipts, independent authority reconciliation, and recovery proof | `verified` only when all 23 clauses are verified |
| 3.2 | Complete 0293/0294/0305 chain, 0269–0276 incident replay, sealed attribution, queue/CAS, deferral and two-lane safety | Real two-captain dogfood with exact bundle-vs-tree proof, no override lease, hostile recovery, and rollback | `verified` only after all success and parallel-safety clauses pass |
| 4.0 | Complete 0313, dependency/coverage contracts, 0324, 0314–0316, then 0317 fan-in | Canonical catalog green, all incident families closed, deep-module receipts, six-adapter parity, hostile dual-captain dogfood, saturation and final manifest | `verified` only when 0317 proves every matrix row, backlog disposition and reversible legacy retirement |

## First-principles dispatch order

1. **0313** — stabilize canonical catalog identity and historical aliases.
2. **Dependency/coverage and operator closure** — 0293, 0294, 0305, 0321,
   0318, 0322, 0319, 0320, 0312, 0307, 0287, then 0324.
3. **Phase validation** — 0314 selected-versus-full shadow, then 0315
   six-editor adapter parity.
4. **Hostile parallel proof** — 0316 real dual-captain dogfood and saturation.
5. **Final certification** — 0317 consumes all four plans, backlog census,
   rollback evidence and release provenance.

Do not start a later step merely because its card is planned or unclaimed. The
runner must be source/frozen-digest aligned before implementation evidence is
accepted. Independent preparation may run in parallel only when scopes do not
share a mutable surface; delivery, publication, close and ref updates remain
broker/CAS serialized.

## Final certification checklist (0317)

- [ ] Every Plan 3.0 clause row is `verified` with a complete tuple.
- [ ] Every Plan 3.1 clause row is `verified` with a complete tuple.
- [ ] Every Plan 3.2 success and safety row is `verified` with real two-lane evidence.
- [ ] Every Plan 4.0 section/phase row is `verified` with fresh sealed evidence.
- [ ] All open-like backlog items have an owner, regression, disposition, or
  owner-approved exception; exceptions block the verdict.
- [ ] `ATM-GOV-0313` status, planning mirror, and ledger are reconciled only
  after its active lane releases.
- [ ] `TASK-SKL-0036` mirror divergence is resolved through its governed route.
- [ ] Frozen runner parity, push/readiness, and rollback provenance are recorded.
- [ ] No success path used override/emergency lease; any such incident is a
  blocker and must be replayed fail-closed.
- [ ] 0317 emits separate verdicts for objective proof, card state,
  incident/backlog disposition, and release/push provenance.

Overall completion is `verified` only when every checkbox and every source row
is backed by current evidence. Otherwise preserve `not-complete`.
