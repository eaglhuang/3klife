# Plan 3.0–4.0 Objective Evidence Matrix — Audit Baseline

Status: `audit-in-progress`
Owner: ATM Captain (handoff to Claude-007 after baseline)
Rule: task-card `done` is not plan completion.
Last reconciled: 2026-08-08T21:47:35+08:00

Machine-readable audit ledger:
`governance-optimization/plan-3x-4x-objective-audit-2026-07-31.json`.
It records the four-plan clause/section coverage, objective verdicts, deep-module
gate, and explicit blockers; `completionVerdict` is `not-complete`.
Reproducible input snapshot:
`governance-optimization/plan-3x-4x-audit-snapshot-2026-07-31.json`.
Phase execution readiness ledger:
`governance-optimization/plan4-phase-readiness-2026-07-31.json`.
Execution checklist:
`governance-optimization/plan-3x-4x-execution-checklist-2026-08-08.md`.

## First-principles execution order

The governing invariant is: do not certify a downstream objective while its
evidence denominator, catalog identity, or shared-write boundary is unstable.
Therefore the order is fixed: repair catalog identity (0313), finish the
dependency/coverage chain and operator-regression closure
(0293/0294/0305/0312/0307/0287/0324), prove selected-versus-full policy and
adapter parity (0314/0315), run hostile dual-captain dogfood (0316), then
perform four-plan certification and reversible legacy-authority retirement
(0317). Any missing, stale, ambiguous, or unsupported observation
keeps the current step `not-complete` and preserves the previous authority;
waivers cannot turn missing evidence into `pass`.

## Latest live snapshot

- Read-only recheck `2026-08-08T21:47:35+08:00`: `ATM-GOV-0313` remains
  `running/active` under Claude-007; broker active intents `0`, team/batch
  runs `0`, and the frozen runner still reports `ATM_RUNNER_SYNC_REQUIRED`.
  A dependency-graph audit over all 42 Plan 4 GOV references found zero
  missing edges and zero cycles. This is structural readiness evidence only;
  it cannot substitute for implementation, fresh validators, or dogfood.

- `ATM-GOV-0306`: `done`, claim `released`, planning mirror aligned; closure
  packet and runner-sync evidence are present. This proves card-level delivery
  only; plan-level verification remains partial until a fresh Plan 4 dogfood
  consumes the lineage/equivalence output.
- `ATM-GOV-0293`: `planned`, no claim; dependency ledger is aligned to 0306.
- `ATM-GOV-0312`: imported `planned`, no claim; depends on 0318, 0319,
  0320, 0305, and TASK-SKL-0037 and owns the objective-level certificate and
  explicit non-claims contract. Its two required test IDs and contributions
  now resolve through `test_group_plan4_quality_certificate`. The target
  0321/0318/0322/0319/0320 are the registered replacements for proposed
  0278/0286/0295/0301/0304; 0288 is now also registered as a planned
  structural-coverage prerequisite. These cards remain unimplemented and
  must be sealed in dependency order; registration is not completion and does
  not authorize waiving the edges.
- `ATM-GOV-0307`: imported `planned`, no claim; depends on 0306, 0293, and
  0312 and owns replay/proof-invalidation for the seven-family incident corpus.
  Its two required test IDs and contributions now resolve through
  `test_group_plan4_incident_replay`.
- The remaining Plan 4.0 proposed cards are now all represented by imported
  planned ledgers: `0281`, `0282`, `0283`, `0287`, `0288`, `0289`, `0290`,
  `0291`, `0296`, `0297`, `0298`, `0299`, `0300`, `0302`, and `0303`.
  Their source cards contain required test-case IDs, causal impact coverage,
  deep-module acceptance, rollback, and evidence contracts. None has sealed
  implementation evidence; they close the registration gap only and do not
  upgrade the Plan 4.0 verdict.
- `ATM-GOV-0324` is now the registered owner card for the newly observed
  2026-07-31-002..008 operator-regression cluster. It is planned/no-claim and
  blocks 0317; its existence does not close those bugs.
- `ATM-GOV-0313`: live ledger `running`, active owner `claude-007`; planning
mirror remains `planned` (status divergence). It depends on 0306 and owns the
canonical test-catalog namespace migration exposed by
`ATM-BUG-2026-07-31-012`. Its two required test IDs and contributions now
resolve through `test_group_plan4_catalog_contract`; implementation/closure
evidence is not yet available and the full catalog validator remains red.
While this lane is active, the live ledger is authoritative and the planning
mirror must not be force-imported or reconciled by another lane.
Its latest governed scope amendment adds the validator schema, catalog loader,
and commit-attribution regression seam: `legacyAliases` must be accepted and
resolved without weakening canonical `test_task_` identity validation.
- Plan 4.0 phase entries are now represented by `ATM-GOV-0314`–`ATM-GOV-0317`;
  their source cards and target ledgers are planned, dependency-ordered, and
  not claimable until prerequisites are sealed. Card existence is not phase
  evidence.
- The framework worktree contains 0306 evidence/release changes and foreign
  residue. They remain excluded from this audit artifact and must not be
  cleaned or committed by another lane.

## Verified evidence added in this audit

### ATM-GOV-0306 card-level closure observation

The live ledger and planning mirror agree on `done/released`, with closure
packet `.atm/history/evidence/ATM-GOV-0306.closure-packet.json`, seal-and-commit
evidence, and runner-sync receipt. The delivery chain is:

- source delivery `b31579017`;
- sealed runner publication `a9680a39`;
- governed close bundle `51ab0b3fe`;
- planning closeback `88e3cc54e02745c61ce203ee4bba874841458b27`.

The required focused mutation-lineage/equivalence cases and repository
validators are recorded in the task ledger. This row remains `partial` at
plan level because the matrix still requires fresh sealed evidence consumed by
0293, a real cross-lane observation, incident-family replay, and rollback proof.
The supported validator audit reports all 5 closure-required validators fresh;
four heavyweight framework validators are advisory-absent, so this is not a
missing close gate but remains relevant to the broader plan-level audit.

## Source-clause coverage index

This index prevents the matrix from becoming a task-card-only checklist. The
listed source ranges are the authoritative objective/gate universe; each range
must have an evidence tuple before its disposition can become `verified`.

| Source plan | Authoritative clause universe | Matrix coverage | Current verdict |
| --- | --- | --- | --- |
| Plan 3.0 | `end-to-end-auto-batch-performance-plan-v3.md`, `§完成門檻` clauses 820-836 | Plan 3.0 objective inventory plus rollback, parity, telemetry, performance, backlog and remote-closeback rows | `not-complete`; historical-only evidence is insufficient; §837 begins Out Of Scope and is excluded from the completion denominator |
| Plan 3.1 | `end-to-end-auto-batch-performance-plan-v3.md`, `§Plan 3.1 完成門檻` clauses 526-548 | Plan 3.1 objective inventory plus authority, compose, runner, identity, rollback and autonomous-command rows | `not-complete`; every clause needs fresh command-backed proof |
| Plan 3.2 | `end-to-end-auto-batch-performance-plan-v3-2.md`, `§Success criteria` clauses 124-135 and `§Pre-Plan 3.2 parallel-commit safety addendum` clauses 158-183 | Plan 3.2 objective inventory plus 0269-0276 and sealed attribution/queue/deferral/batch incident rows | `partial`; 0285/0306 slices are not full exit proof |
| Plan 4.0 | `end-to-end-auto-batch-performance-plan-v4.md`, sections 4-18.4.2: obligation model, deep modules, state/contract layers, generators, uncertainty, authority, adapters, skill plane, phases and phase-exit | Plan 4.0 objective inventory, known-bug register and phase-exit gate | `not-complete`; all incident families and fan-in evidence remain required |

Coverage rule: a source clause with no named matrix row is an audit defect. A
named row with no source/task/acceptance/test/validator/sealed-dogfood/bug/
rollback tuple remains `not-complete`; ledger `done` alone cannot upgrade it.

Read-only coverage audit result (2026-07-31T22:43:46+08:00): Plan 3.0
completion clauses `17/17`, Plan 3.1 completion clauses `23/23`, Plan 3.2
criteria/safety clauses `29/29`, and Plan 4.0 section anchors `17/17` have
named rows; missing source-row count is `0`. This proves mapping completeness
only, not evidence completion.

### Clause-level audit ledger (source text is authoritative)

The following ledger is deliberately compact: the anchor is only a locator, not
a substitute for reading the source clause. Every entry remains `not-complete`
until its full evidence tuple is attached; a later card may satisfy several
entries, but may not silently delete or merge them.

| Plan 3.0 clause | Objective anchor | Disposition |
| --- | --- | --- |
| §820 | 0226 divergence terminal disposition and digest | `not-complete` |
| §821 | TMP-0004/0236 target close and protected fault matrix | `not-complete` |
| §822 | frozen red baseline and 0227 fail-closed guard | `not-complete` |
| §823 | source/frozen/release/adopter parity set | `not-complete` |
| §824 | 0233 migration rollback and exactly-once receipt | `not-complete` |
| §825 | 0234 supersession and 0239–0261 real continuation replay | `not-complete` |
| §826 | sealed semantic union and negative-control zero write | `not-complete` |
| §827 | per-card source/frozen parity for runtime gates | `not-complete` |
| §828 | 0251/0252 closure-critical predicate authority | `not-complete` |
| §829 | pre-sealed Plan-global locked-policy verifier | `not-complete` |
| §830 | seven correctness zeroes and 100% observed coverage | `not-complete` |
| §831 | overlap/admission ratios and starvation threshold | `not-complete` |
| §832 | A/A null control and AB/BA performance bound | `not-complete` |
| §833 | 0245 bounded N=2 claim and non-extrapolation | `not-complete` |
| §834 | healthy/fault breaker and queue-only reset | `not-complete` |
| §835 | 2.2 acceptance mapping and open-item rule | `not-complete` |
| §836 | 0253 target/planning closeback and remote SHA | `not-complete` |

| Plan 3.1 clause | Objective anchor | Disposition |
| --- | --- | --- |
| §526 | broker replay remains open with exact missing class | `not-complete` |
| §527 | shared pure verifier at all side-effect boundaries | `not-complete` |
| §528 | repaired checker rejects fake-green fixture | `not-complete` |
| §529 | machine authority, realness, negative control, two-key close | `not-complete` |
| §530 | missing/low-realness evidence stays inconclusive | `not-complete` |
| §531 | old/new frozen runner red-green same digest | `not-complete` |
| §532 | real two-process overlap and steward attribution | `not-complete` |
| §533 | exact composed candidate semantic gate | `not-complete` |
| §534 | true conflict fallback queue and automatic wakeup | `not-complete` |
| §535 | command/event receipts across full lifecycle | `not-complete` |
| §536 | sealed AB/BA repeats and time decomposition | `not-complete` |
| §537 | correctness/performance/cost from one sealed receipt set | `not-complete` |
| §538 | 213–221 canonical terminal dispositions | `not-complete` |
| §539 | rollback, parity, breaker and reset receipts | `not-complete` |
| §540 | owning-card attributable frozen parity | `not-complete` |
| §541 | 0245 reads blockers from canonical source | `not-complete` |
| §542 | 0253 saga and remote-reachable authority manifest | `not-complete` |
| §543 | frozen runner consumes broker-resolve output | `not-complete` |
| §544 | runner-sync ticket/cache/receipt digest binding | `not-complete` |
| §545 | explicit actor continuity across shared writes | `not-complete` |
| §546 | 224–226 backlog terminal disposition | `not-complete` |
| §547 | full backlog inventory and insertion decisions | `not-complete` |
| §548 | 0262 parity and 0263 zero-manual-command replay | `not-complete` |

| Plan 3.2 clause | Objective anchor | Disposition |
| --- | --- | --- |
| §124 | validator timeout emits observable progress | `not-complete` |
| §125 | timeout terminates with a partial summary | `not-complete` |
| §126 | single-card close proves freshness without heavyweight rerun | `not-complete` |
| §127 | freshness binds delivery commit and content hashes | `not-complete` |
| §128 | freshness binds command identity and receipt metadata | `not-complete` |
| §129 | runner-sync and pre-push expose legal recovery lanes | `not-complete` |
| §130 | evidence and close expose legal recovery lanes without circular blockers | `not-complete` |
| §131 | forward/emergency attestation has a documented public surface | `not-complete` |
| §132 | attestation exposes dry-run, write, status, and validation surfaces | `not-complete` |
| §133 | target closure exposes an independent dry-run/write/explain/recover seam | `not-complete` |
| §134 | planning closeback exposes an independent seam | `not-complete` |
| §135 | runner publication coordinates through a saga without a hidden transaction | `not-complete` |
| §166 | governed commit tree is a subset of the claimed bundle | `not-complete` |
| §167 | only explicitly authorized shared-delivery members may extend that subset | `not-complete` |
| §168 | each lane seals its bundle before shared-write admission | `not-complete` |
| §169 | final apply consumes the seal instead of re-reading the live index | `not-complete` |
| §170 | HEAD mutation is broker-mediated and CAS-guarded | `not-complete` |
| §171 | moved HEAD yields queue/wait/retry and never override lease | `not-complete` |
| §172 | multi-lane unowned staged/unstaged paths fail closed | `not-complete` |
| §173 | shared files use proposal/compose/steward attribution | `not-complete` |
| §174 | close deferral snapshots derived indexes after evidence generation | `not-complete` |
| §175 | close cannot leave a post-close derived-manifest delta | `not-complete` |
| §176 | batch ownership supports explicit split and handoff | `not-complete` |
| §177 | stale-head repair and safe abandon do not allow ad-hoc foreign claim | `not-complete` |
| §179 | parallel sealed-prepare proof exists | `not-complete` |
| §180 | attribution, provenance, CAS, and no-override proofs exist | `not-complete` |
| §181 | deferral-order, stale-batch, and foreign-dirty tests exist | `not-complete` |
| §182 | every confirmed incident becomes a generic Plan 4 fixture | `not-complete` |
| §183 | each fixture is referenced by its owning task card | `not-complete` |

| Plan 4.0 section | Objective anchor | Disposition |
| --- | --- | --- |
| §§4.1–4.8 | obligation relation, denominator, model-relative claims, orthogonal strength, writer separation, unknown, monotonicity, replay | `not-complete` |
| §§5–5.3 | proof-carrying claim grammar and denominator rules | `not-complete` |
| §§6.1–6.6 | QualityGauntlet/deep modules, internal seams, deletion test | `not-complete` |
| §7 | state machine and terminal semantics | `not-complete` |
| §§8.1–8.12 | canonical authority, coverage, obligation, probe, gap, proposal, certificate, fingerprint, causal, family, selection, learning contracts | `not-complete` |
| §§9.1–9.3 | hard blockers, ratchets, trends and non-compensating quality vector | `not-complete` |
| §10 | bounded gap-closure algorithm and deterministic resume | `not-complete` |
| §§11.1–11.8 | generator portfolio, adversarial schedules and incident-driven causal generation | `not-complete` |
| §§12.1–12.4 | mutation accounting, flaky/oracle policy and negative controls | `not-complete` |
| §§13.1–13.4 | policy epoch, protected exam, authority separation and seed commitment | `not-complete` |
| §§14.1–14.8 | dependency/probe/generator/sandbox/learning/skill adapters and learning loop | `not-complete` |
| §15 | execution profiles and interface-proof economics | `not-complete` |
| §16 | interface-test surface and adapter contracts | `not-complete` |
| §17 | implementation phase cards and exit conditions | `not-complete` |
| §§18.1–18.3 | bounded parallel start, dependency waits and cohesive sequencing | `not-complete` |
| §18.4.1 | seven-family dual-captain incident gate | `not-complete` |
| §18.4.2 | four-plan objective certification and final manifest | `not-complete` |

### ATM-GOV-0285 real parallel observation

The 0285 delivery report supplies a real, not fixture-only, Plan 3.2
observation:

- delivery `ee1b7cc3f`, runner publication `c00b9875a`, close `186584faf`;
- focused catalog-selection and resumable-scheduler tests, typecheck, CLI
  validation, and git-head evidence all passed;
- Cursor changed 0293/0306 ledger/planning files concurrently, yet the 0285
  delivery tree excluded them and contained only the 0285 bundle;
- runner-sync queue position was observed, no HEAD moved/CAS race occurred,
  and no override lease or new POA was used;
- index was empty and 0285 scope had zero residue at close.

Disposition: this verifies the **0285 live foreign-work exclusion slice** of the
Plan 3.2 parallel-commit objective. It does not verify sealed TOCTOU resistance,
provenance mismatch rejection, queue-only HEAD enforcement, or the full Plan
3.2 objective; those remain `partial` until 0293 consumes 0306 and the
incident families are closed.

## Verdict policy

An objective is `verified` only when implementation, task card, acceptance,
focused test, validator receipt, fresh sealed evidence, real dogfood observation,
known-bug disposition, and rollback are all linked. `historical-only`, `stale`,
`unknown`, `unsupported`, or prose-only rows are `not-complete`.

## First-principles and deep-module audit gate

The minimum evidence tuple for every objective row is now explicit: (1)
authoritative source-clause anchor and current digest, (2) owning task-card
and dependency proof, (3) focused test IDs plus the exact command output, (4)
sealed delivery/runner provenance, (5) rollback or fail-closed proof, and (6)
an `atm.deepModuleReviewReport.v1` explaining boundary, invariant, adapter
seams, and why the execution order follows from first principles. Missing any
member keeps the row `not-complete`, even if the task ledger is `done`.

The matrix treats a passing focused test as evidence of behavior, not proof that
the architecture is sound. For every policy/orchestration module that changes a
plan objective, the audit must also link an `atm.deepModuleReviewReport.v1`
receipt with: one small public interface, at least two concrete adapters, the
deletion-test result, dependency classification, rollback, and causal
validators. A module without that receipt remains `partial` even when its task
is `done`.

Current boundary: 0284 and 0306 have interface-focused tests and card-level
rollback declarations, but the four-plan matrix does not yet contain sealed
deep-module receipts or downstream phase-exit consumption. 0293, 0307, and
0312 are not implemented. This is an explicit plan-level gap, not a request to
reopen 0284 or 0306; the next owning cards must supply the missing receipts or
record a bounded, owner-approved exception (which still blocks final
completion).

## Plan 3.0 objective inventory

| Objective | Required evidence | Current disposition | Next audit |
| --- | --- | --- | --- |
| durable batch/lane/wave execution | 0230–0233 receipts + fresh replay | not-complete until fresh sealed replay is located | 0230–0233 evidence |
| real worker and shared-delivery execution | 0234–0236 multiprocess dogfood + telemetry | not-complete until final post-repair replay | 0234/0235/0236 |
| gate telemetry and observed lifecycle | telemetry coverage and dashboard freshness | not-complete | 0193/0196–0202 evidence |
| validator DAG/cache and resumability | validator lifecycle receipts and recovery | not-complete | 0185/0200/0269 lineage |
| paired A/B performance and rollout verdict | sealed A/B workload, metrics, circuit breaker | not-complete | 0190/0202/0235 |
| canonical broker, CID, compose-first topology | invariant proof + adversarial overlap | not-complete | 0207–0214/0247–0255 |
| runner/build/projection closeback | source/frozen parity and release receipts | not-complete | 0187/0188/0230/0231 |
| backlog rollback and historical recovery | red/green rollback replay | not-complete | 0233/0236/0244 |

## Plan 3.1 objective inventory

| Objective | Required evidence | Current disposition | Next audit |
| --- | --- | --- | --- |
| real dogfood shared replay surfaces | fresh two-lane runs, not fixtures | not-complete | 0237/0238 |
| fail-closed closure truth | independent authority reconciliation | not-complete | 0239/0251/0252 |
| historical runner discrimination | frozen/source red-green proof | not-complete | 0240/0256/0267/0268 |
| event-derived lifecycle and close saga | replayable receipts, idempotent closeback | not-complete | 0241/0253/0254 |
| compose-first broker/steward delivery | proposal, compose, revalidate, steward attribution | not-complete | 0242/0247–0250/0254 |
| paired A/B benchmark and dashboard | fresh sealed manifest and metrics | not-complete | 0243/0245/0246 |
| claim, identity, lease and ticket continuity | adversarial identity/lease proof | not-complete | 0255/0257/0259 |
| candidate/index/commit isolation | exact tree attribution under overlap | not-complete | 0258/0260/0261 |
| autonomous recovery and runner publication | recovery ticket + runner receipt | not-complete | 0263/0265/0266 |

## Plan 3.2 objective inventory

| Objective | Required evidence | Current disposition | Next audit |
| resumable validator orchestration | 0269 focused + timeout/resume dogfood | partial; 0269 residue and fresh replay require audit | 0269 |
| evidence freshness/rerun planning | content/commit hash freshness receipts | partial; verify against 0285/0306 chain | 0270 |
| legal close saga/recovery | pre-close/close retry and no circular blocker | partial | 0271 |
| public attestation authority | dry-run/write/status/validate and push proof | partial; historical attestation bugs remain candidates | 0272 |
| target/planning/runner closeback boundary | independent retry and deferral ordering | partial; manifest deferral incident requires repair proof | 0273 |
| same-task lane claim rejection | 0274 regression and live overlap | verified at card level; plan-level fresh matrix pending | 0274 |
| foreign-work preservation | 0275 regression and live dual-captain commit | verified in 0285 dogfood; matrix row still needs receipt link | 0275 |
| planning/import fidelity | 0276 import and causal/test-field preservation | verified at card level; plan-level matrix pending | 0276 |
| commit attribution and parallel safety | sealed bundle/tree, CAS, queue-only, no override | partial; 0306/0293 incident closure required | GIT-0029–0031, 0306 |

## Plan 4.0 objective inventory

| Objective | Required evidence | Current disposition | Next audit |
| model-relative coverage semantics | obligation universe and canonical IDs | partial; 0277/0279/0280 card evidence only | 0277/0279/0280 |
| canonical quality contracts and deep-module seams | schemas, one public facade, internal reducers/adapters, deletion-test proof | not-complete; contract/deletion evidence is not yet joined to phase exit | §§6-8, 11.1-11.8 |
| QualityGauntlet and closure assurance | interface receipt, reducer replay, terminal semantics | partial; 0284 card done, fresh plan proof pending | 0284/0285 |
| mutation lineage/equivalence | deterministic adapter, survivor classification, fail-closed uncertainty | partial; 0306 card closed, plan-level dogfood/replay pending | 0293 + Plan 4 replay |
| test-catalog namespace and shard contract | canonical IDs, aliases/lineage, complete schema validation, planned-card import fidelity | blocked; ATM-GOV-0313 imported planned, implementation pending, full validator red | ATM-GOV-0313 + ATM-BUG-2026-07-31-012 |
| fault fingerprint/family matching | stable family, confidence gate, incident fixtures | planned; 0306 dependency now satisfied | 0293 |
| causal neighborhood and factor generation | causal compiler + bounded combinations | blocked by 0293 | 0294 |
| cumulative family store/selective routing | recurrence store, selector, replay | blocked by 0293/0294 | 0305 |
| historical incident replay corpus | every known bug mapped to generic family and regression | planned; ATM-GOV-0307 card contract/import now has all seven families and resolvable test contributions (009/010/011/270/0276/runner-sync/stale-batch), implementation/replay pending | ATM-GOV-0307 |
| complete backlog disposition | every backlog shard classified, owned, and either repaired or explicitly non-confirmed with rationale | blocked; 378 total and 169 open-like items require disposition beyond the confirmed incident register | TASK-SKL-0036/0037 + Plan 4 census gate |
| incident-learning intake mirror fidelity | live ledger, planning source, projection, and closure evidence agree | blocked; TASK-SKL-0036 live ledger is `done/released` while planning source remains `planned` (`stale-import` divergence) | governed `tasks import --reconcile-mirror`, then fresh skill/backlog evidence |
| generator portfolio and adversarial schedules | branch/model/property/mutation/concurrency/torture/acceptance generators with replayable seeds | not-complete; no all-family sealed phase evidence | §11.1-11.6 |
| mutation/flaky/oracle/uncertainty governance | no compensating score, unknown fail-closed | not-complete | §12 + 0306 |
| exam-authority separation | writer/generator/reviewer independence | not-complete | §13 + SKL-0037 |
| adapter and skill projection parity | source digest, compiler, manifest, reinstall survival | blocked by 0305 | TASK-SKL-0037 |
| execution profiles and interface-proof economics | check-in/task-close/phase/nightly/release profiles, independent dimensions, interface tests | not-complete; no cross-profile phase receipt | §§15-16 |
| phase-exit and release authority | objective matrix, incident closure, fresh manifest | planned; 0312 card contract/import is complete, certificate implementation and phase fan-in remain pending | §18.4.2 + final manifest |

Phase-exit note: ATM-GOV-0312 is now the imported certificate/quality-vector
card for the phase-exit row; it remains unimplemented and cannot authorize 0307
or final 0310/0311 fan-in until all predecessor evidence is fresh.

### Objective-level contracts for reserved Plan 4.0 cards

These are derived from Plan 4.0 §§15, 18.4, 19, and 20. They are authoring
contracts, not evidence of implementation:

| Card | Minimum objective proof before dispatch/close |
| --- | --- |
| ATM-GOV-0314 | Same sealed candidate runs legacy and Plan 4.0 selected/broad profiles; receipt records selected and skipped cases, false blocks, escaped defects, latency/cache/unknowns; any escaped related defect invalidates the selector policy epoch; independent legacy authority remains intact. |
| ATM-GOV-0315 | All six installed skill/editor projections reproduce required machine fields, source/compiler/manifest digests, and reinstall survival; frozen-entry smoke and projection-parity receipts are command-backed; drift is fail-closed. |
| ATM-GOV-0316 | Fresh real dual-captain hostile dogfood exercises every mandatory branch, recurrence learning, saturation/stopping proof, rollback, and all-branch phase-exit manifest; fixture-only or single-lane evidence is insufficient. |
| ATM-GOV-0324 | Closes the 2026-07-31-002..008 operator-regression cluster with durable ticket/status receipts, no-write dry-run proof, runner-sync/record-commit parity, and fresh sealed evidence; no success path may use emergency or override lease. |
| ATM-GOV-0317 | Consumes 0316, 0324, and this matrix; separately reports objective, card, incident, fresh-evidence, and release/push dimensions; any open bug, unknown, stale branch, or unverified row blocks legacy-authority retirement and final verdict. |

Each future source card must bind these predicates to required test IDs,
independent oracle/negative controls, validators, causal edges, rollback, and
fresh sealed receipts before import. A table row or card import cannot satisfy
any predicate by itself.

### Reserved phase-card readiness

| Reserved card | Plan 4.0 role | Source card / target ledger | Safe next action |
| --- | --- | --- | --- |
| ATM-GOV-0313 | canonical test-catalog namespace migration and full-shard contract | imported planned / planned | claim only after 0306; implement migration, aliases, linked planned-card re-import, and full catalog green |
| ATM-GOV-0314 | selected-versus-full shadow comparison | imported planned / imported planned | claim after 0305, 0312, TASK-SKL-0037 prerequisites are confirmed |
| ATM-GOV-0315 | six-editor/provider runtime adapter parity canary | imported planned / imported planned | claim after 0314 is complete |
| ATM-GOV-0316 | hostile two-captain dogfood and phase-exit manifest | imported planned / imported planned | claim only after all generator, incident, skill, and shadow evidence is sealed |
| ATM-GOV-0317 | final Plan 4.0 verdict and legacy-authority retirement | imported planned / imported planned | claim last; it consumes 0316 and the four-plan matrix |

The four phase cards now each resolve two `requiredTestCaseIds` through
dedicated catalog shards (`shadow_comparison`, `adapter_parity`,
`hostile_dogfood`, `final_certification`). Import/fidelity evidence is present;
the focused test implementations and sealed objective evidence remain pending.
The 0313 alias-lineage/schema mismatch is also a confirmed defect class. Its
formal backlog item is intentionally deferred until the active 0313 lane
releases its adjacent backlog projection; the final census must then register
or explicitly disposition it, not treat the 0313 scope amendment as closure.

These are planning gaps, not implementation failures. No agent may claim a
reserved id, handwrite a substitute ledger, or infer acceptance from the phase
table. The incoming captain must create each source card with complete
acceptance, required test ids, validators, rollback, and causal graph, then
dry-run/import it before dispatch.

## Known-bug closure register

Every row below requires backlog reference, generic fixture, repair commit,
focused regression, and fresh evidence before the final verdict:

### Backlog disposition census gate

The complete backlog shard inventory was read-only counted on 2026-08-01 and
sealed as `governance-optimization/plan4-backlog-disposition-census-2026-07-31.json`
(`sortedOpenLikeIdDigest=sha256:48271f04905274a5c795c894395d578c1e29b196aeba1193279e50d26ca18ff6`):
`378` items total; `209` have a terminal/fixed-style status and `169` remain
open-like (`81 Open`, `78 Needs task card`, `2 Needs triage`, `1 In progress`,
plus 7 partially fixed/active/deferred/follow-up statuses). The open-like set
contains `67 High`, `89 Medium`, and `4 Low` severity items. The seven confirmed
parallel-development families plus catalog blocker 012 are not a substitute for
this census: they cover confirmed escaped incidents, while the remaining items
may still be candidates, duplicates, product gaps, or unrelated domain work.

Before the final Plan 4.0 verdict, every open-like item must have one explicit
disposition: (a) mapped to a generic incident family with an owning repair card,
test, and fresh evidence; (b) classified as a non-confirmed candidate/duplicate
with durable rationale and owner; or (c) deferred by an owner-approved exception
that remains a final-verdict blocker. A non-empty open-like census cannot be
silently treated as a clean incident register.

| Bug/incident | Backlog status | Existing delivery | Remaining closure action |
| --- | --- | --- | --- |
| 2026-07-31-009 | Has follow-up card ATM-GOV-0307 | 0029–0031 partial chain | implement content-attribution/TOCTOU/CAS/override replay and Plan 4 evidence |
| 2026-07-31-010 | Has follow-up card ATM-GOV-0307 | 0030 tombstone repair delivered | prove Plan 4 incident replay and final release evidence |
| 2026-07-31-011 | Has follow-up card ATM-GOV-0307 | 0031 residue manually restored | implement and verify deferral ordering repair |
| 2026-07-29-270 | Has follow-up card ATM-GOV-0307 | router fix `ab3fe28fe` + regression | backlog resolve evidence, fixture replay and frozen-runner closure |
| 0276 import-fidelity incident | Has follow-up card ATM-GOV-0307 | 0276 done | replay causal/test-field preservation in Plan 4 corpus |
| runner-sync protected-state family | follow-up card ATM-GOV-0307 | emergency repairs exist | normal governed publication regression and no-emergency proof |
| stale/mixed batch family | follow-up card ATM-GOV-0307 | batch abandon observed | generic fixture for split/handoff/stale-head semantics |
| 2026-07-31-012 | Open; assigned to ATM-GOV-0313 | full catalog validator fails on legacy `test_atm_gov_` IDs in commit-attribution shard | canonical namespace/alias migration, focused regression, and green catalog evidence |
| 2026-07-31-002..008 | Needs task card/Open cluster; mapped to planned ATM-GOV-0324 | repair-closure ticket authority, record-commit parity, dry-run mutation, runner-sync publication, import attribution, and close status receipts remain individually unresolved | complete 0324 with focused regression and fresh sealed evidence before 0317; no waiver |
| 2026-07-22-225 / 2026-07-29-265 / 2026-07-30-283 | Open-like runner-sync cluster | stale-source cache hit, checkpoint recovery deadlock, and framework-temp publication blocker are documented in backlog | assign/verify repair cards, fresh sealed runner receipts, and no-dirty-residue close proof |
| 0313 alias-lineage schema mismatch | Confirmed; formal backlog ID pending after active lane release | `aliasId` cannot pass the canonical case-id schema without a compatibility seam | register next unused backlog item or amend owned item, then add alias resolver regression and replay evidence |

Status update: ATM-GOV-0307 is now the formal follow-up card for the 009, 010,
011, 270, 0276, runner-sync protected-state, and stale/mixed-batch incident
families. Its imported planned ledger supersedes the older `Needs task card`
wording above; the implementation and replay proof are still pending and
therefore do not upgrade any row to `verified`.

The incident register is intentionally one-to-one with the required corpus:

- 009: shared-index attribution, live-index TOCTOU, sealed-apply fallback,
  provenance mismatch, broker admission ordering, HEAD CAS, override success,
  and ordinary-unowned multi-lane classification;
- 010: sealed commit deletion/tombstone attribution;
- 011: close deferral leaving a derived bundle manifest behind;
- 270: active-batch `findActiveTaskQueue` router crash;
- 0276: plan-card import dropping causal/test authority fields;
- runner-sync protected-state admission/publication ordering and frozen-runner
  parity;
- stale/mixed batch ownership, routing, split/handoff, and abandon.
- 012: test-catalog namespace/schema mismatch in the historical
  commit-attribution shard; this is an open baseline validator failure owned by
  ATM-GOV-0313 and is not covered by 0307/0312 implementation.

Plan 3.0/3.1 stale or historical-only dashboard/performance evidence, and any
new incident observed during fresh dogfood, remain additional audit inputs even
when they are not yet assigned to a numbered incident family.

## Handoff rule

Claude-007 receives this matrix as the starting audit artifact. No plan may be
marked complete until all rows are `verified` and the known-bug register has no
open item without an owner-approved exception. Any exception blocks the overall
parallel-development completion verdict.

Handoff companion:
`C:/Users/User/AI-Atomic-Framework/docs/governance/skills/ATM-SKL-captain-handoff-2026-08-01-claude-007.md`
