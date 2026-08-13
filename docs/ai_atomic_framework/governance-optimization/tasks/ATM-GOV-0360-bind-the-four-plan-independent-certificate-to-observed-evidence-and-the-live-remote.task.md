---
task_id: ATM-GOV-0360
title: Bind the four-plan independent certificate to observed evidence and the live remote
status: done
owner: unassigned
priority: P0
depends_on: []
causalGraph:
  startConditions:
    - The independent certificate reports complete while carrying a placeholder reviewer digest, a reviewer whose only output is the certificate itself, no observation of the evidence it cites, and a remote binding to a commit that origin/main has long since passed.
  softRelations: [ATM-GOV-0341, ATM-GOV-0358, ATM-GOV-0359]
  changedPublicSeams: [atm.fourPlanIndependentCertificate.v1]
  causalImpactEdges:
    - placeholder-digest-to-false-independent-review
    - self-referential-reviewer-to-false-independence
    - unobserved-evidence-to-false-freshness
    - stale-remote-binding-to-false-release-authorization
  parallelFrontierInputs: [independent-certificate, release-closeback, live-remote-refs, objective-replays]
  validatorReferences: [four-plan-independent-certificate, plan4-final-certification, compile-four-plan-independent-certificate]
  phaseOwner: wave-10-independent-final-certification
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/evidence/four-plan-independent-certificate.ts
  - schemas/evidence/four-plan-independent-certificate.schema.json
  - scripts/compile-four-plan-independent-certificate.ts
  - docs/reports/plan-3x-4x-independent-certificate.json
  - tests/cli/four-plan-independent-certificate.test.ts
  - tests/cli/plan4-final-certification.test.ts
  - governance-optimization/plan-3x-4x-objective-audit-2026-07-31.json
  - docs/reports/plan-3x-4x-closeout-blocker-map.json
deliverables:
  - packages/core/src/evidence/four-plan-independent-certificate.ts
  - schemas/evidence/four-plan-independent-certificate.schema.json
  - scripts/compile-four-plan-independent-certificate.ts
  - docs/reports/plan-3x-4x-independent-certificate.json
  - tests/cli/four-plan-independent-certificate.test.ts
  - tests/cli/plan4-final-certification.test.ts
  - governance-optimization/plan-3x-4x-objective-audit-2026-07-31.json
  - docs/reports/plan-3x-4x-closeout-blocker-map.json
validators:
  - node --strip-types tests/cli/four-plan-independent-certificate.test.ts
  - node --strip-types tests/cli/plan4-final-certification.test.ts
  - node --strip-types scripts/compile-four-plan-independent-certificate.ts --mode validate
  - npm run typecheck
testContributions:
  - caseId: test_atm_gov_0360_placeholder_reviewer_digest_fails_closed
    targetGroupId: test_group_plan4_final_certification
    semanticKey: a_placeholder_or_malformed_digest_is_not_a_digest
    coversAcceptance: [ACC-1]
    coversImpactEdges: [placeholder-digest-to-false-independent-review]
    contributionResourceKey: four-plan-certificate-digest-shape
    responsibility: task-required
    contractEdge: atm.fourPlanIndependentCertificate.v1
    resourceKey: four-plan-certificate-digest-shape
    expectedRedPredicate: a reviewer digest of sha256:pending-self-digest satisfies the non-empty check and the certificate reports proven
  - caseId: test_atm_gov_0360_reviewer_independence_is_structural
    targetGroupId: test_group_plan4_final_certification
    semanticKey: a_reviewer_cannot_review_its_own_certificate_or_the_evidence_it_certifies
    coversAcceptance: [ACC-2, ACC-3, ACC-3A]
    coversImpactEdges: [self-referential-reviewer-to-false-independence]
    contributionResourceKey: four-plan-certificate-reviewer-independence
    responsibility: task-required
    contractEdge: atm.fourPlanIndependentCertificate.v1
    resourceKey: four-plan-certificate-reviewer-independence
    expectedRedPredicate: a reviewer whose outputPath is the certificate itself, or whose output is a cited evidence artifact, still counts toward the independent reviewer minimum
  - caseId: test_atm_gov_0360_evidence_freshness_is_observed_not_declared
    targetGroupId: test_group_plan4_final_certification
    semanticKey: cited_evidence_must_be_read_at_compile_time_and_predate_the_certificate
    coversAcceptance: [ACC-4]
    coversImpactEdges: [unobserved-evidence-to-false-freshness]
    contributionResourceKey: four-plan-certificate-freshness
    responsibility: task-required
    contractEdge: atm.fourPlanIndependentCertificate.v1
    resourceKey: four-plan-certificate-freshness
    expectedRedPredicate: an evidenceRef that is absent from disk or was modified after generatedAt leaves the certificate proven
  - caseId: test_atm_gov_0360_release_verdict_uses_live_remote
    targetGroupId: test_group_plan4_final_certification
    semanticKey: the_release_verdict_is_recomputed_from_the_remote_at_execution_time
    coversAcceptance: [ACC-5, ACC-6]
    coversImpactEdges: [stale-remote-binding-to-false-release-authorization]
    contributionResourceKey: four-plan-certificate-live-remote
    responsibility: task-required
    contractEdge: atm.fourPlanIndependentCertificate.v1
    resourceKey: four-plan-certificate-live-remote
    expectedRedPredicate: the committed certificate authorizes release against a recorded origin/main that the live remote has already moved past
requiredTestCaseIds:
  - test_atm_gov_0360_placeholder_reviewer_digest_fails_closed
  - test_atm_gov_0360_reviewer_independence_is_structural
  - test_atm_gov_0360_evidence_freshness_is_observed_not_declared
  - test_atm_gov_0360_release_verdict_uses_live_remote
phaseTestCaseIds: [typecheck]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [deep-module-refactor]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the compiler hardening together with the regenerated report. Never restore the report alone; a green report against an unhardened compiler is the exact false green this card removes.
atomizationImpact:
  ownerAtomOrMap: atm.independent-certification
  mapUpdates: []
  extractionCandidates:
    - atom: atm.four-plan-certificate-observation
      pattern: Result Contract Object
      source: scripts/compile-four-plan-independent-certificate.ts
      disposition: extract
      inlineReason: null
errorCodes: []
outOfScope:
  - scripts/compile-runbook-completion-evidence.ts
  - scripts/validate-runbook-completion-evidence.ts
  - tests/cli/runbook-completion-evidence.test.ts
  - docs/reports/plan-3x-4x-runbook-completion-evidence.json
  - governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
nonGoals:
  - Ticking any runbook checkbox or rewriting the runbook's formal verdict. This card produces the certificate and the freshness judgement; the final adjudication belongs to ATM-GOV-0359 after all items and wave exits pass.
  - Making the certificate green. If the evidence is stale, not-complete is the correct and required output.
  - Regenerating replays, the closeback, or the frozen runner. This card observes those artifacts; it does not produce them.
createdByCommand: atm plan card create
completed_at: "2026-08-13T16:51:53.475Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-08-13T16:51:53.475Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-13T16-51-53-475Z-close-9ce783bd1ede"
lastTransitionAt: "2026-08-13T16:51:53.475Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "09adc42a182e372bd79d5685133dbe151fd36cef"
---

# ATM-GOV-0360 Bind the four-plan independent certificate to observed evidence and the live remote

## Problem

`docs/reports/plan-3x-4x-independent-certificate.json` reports `status: proven`,
`overallVerdict: complete`, `releaseAuthorized: true`, with an empty diagnostics
array. Four independent defects make that verdict unearned.

**A placeholder passes as a digest.** The reviewer `codex-independent-recompute`
carries `"digest": "sha256:pending-self-digest"`. The compiler only asks whether
the digest is non-empty:

```ts
if (!reviewer.reviewerId || !reviewer.outputPath || !reviewer.digest) diagnostics.push(...)
```

A literal `pending` marker is truthy, so an admittedly unfinished review counts
as a finished one.

**A reviewer reviews itself.** That same reviewer's `outputPath` is
`docs/reports/plan-3x-4x-independent-certificate.json` — the certificate under
review. Its digest is unresolvable in principle, which is precisely why it was
left pending. The other reviewer, `atm-validator-recompute`, declares
`docs/reports/plan-3x-4x-release-closeback.json` with digest
`sha256:47ed9781…`, byte-identical to the `release-verdict` dimension digest it
is supposed to be independently confirming. Neither reviewer declares what it
recomputed *from*, so nothing distinguishes a recompute from a copy.

**Cited evidence is never read.** Dimensions carry `evidenceRefs` and a digest,
but the compiler never opens those files. A dimension can cite a deleted report
and stay `proven`.

**The remote binding is frozen prose.** The certificate pins `target-head` and
`origin-main` to `074ff8c0bfceee861d1e4c655464dfaa85dd4953` and asserts parity
against itself — expected equals observed because both were written by the same
hand at the same moment. `origin/main` is now
`b969957bb9836ef94c57b322c2ae89a4aba6ef93`. A release authorization that never
re-reads the remote authorizes a release of code that is no longer there.

The two focused tests then anchor the false green in place:
`four-plan-independent-certificate.test.ts` asserts
`report.overallVerdict === 'complete'` and `plan4-final-certification.test.ts`
asserts `independent.releaseAuthorized === true`. Those are assertions that the
answer is yes, not assertions that the answer was computed correctly.

## Acceptance

- ACC-1 A reviewer or dimension digest that is not a well-formed
  `sha256:<64 hex>` is a fail-closed diagnostic naming the offender.
  `sha256:pending-self-digest` must not satisfy any check.
- ACC-2 A reviewer whose declared output is the certificate itself, whose id or
  role coincides with the writer, or whose output is one of the evidence
  artifacts the certificate cites, is not independent and does not count toward
  `minimumIndependentReviewers`.
- ACC-3 Every reviewer declares path-bound input observations it recomputed
  from as well as a reproducible output receipt digest. Every input path/digest
  must match an observed raw artifact, and the output receipt digest must be
  recomputable from reviewer identity, roles, sorted inputs, verdict and
  provenance. Missing, unrelated or unverifiable inputs are incomplete.
- ACC-3A `independentReviewerCount` is derived from a deduplicated set of
  reviewers that each pass a local validity result. Repeated invalid reviewers
  and repeated diagnostics can never increase the count.
- ACC-4 Every cited evidence path and reviewer output is observed on disk at
  compile time. Missing, unreadable, digest-mismatched, or modified-after-
  `generatedAt` artifacts each produce a distinct diagnostic and `not-complete`.
- ACC-5 `target-head` and `origin-main` are resolved from the local repository
  and from the remote at execution time, not from a recorded literal. A
  certificate whose recorded remote differs from the live remote is `stale` and
  `not-complete`.
- ACC-6 The regenerated report and both focused tests recompute the verdict from
  the certificate's own inputs instead of asserting a literal `complete`. The
  committed report states the true current verdict.

## Implementation boundary

One compiler owns the judgement; the script only gathers observations and hands
them over. Do not add a second verdict path, a task-ID exception, or a
`--force-complete` escape. The certificate has exactly one way to become
`complete`: every observation supports it.

## In-flight scope amendment

Two artifacts bind themselves to this certificate and were amended into scope
while the work was in flight:

- `governance-optimization/plan-3x-4x-objective-audit-2026-07-31.json` binds
  `resultDigest` to the certificate and carries a `retirementRule` stating that
  any stale or contradictory input restores legacy authority and downgrades the
  certification. Recompiling the certificate is the condition that rule
  describes, so applying it belongs to this card.
- `docs/reports/plan-3x-4x-closeout-blocker-map.json` pins the certificate by
  file digest and cross-asserts its release authorization. It was green before
  this card and would have been left red by it, which is not an acceptable
  hand-off.

Both were downgraded, never upgraded. The objective denominators are untouched:
Plan 3.0 17/17, Plan 3.1 23/23, Plan 3.2 29/29 and Plan 4.0 17/17 remain
independently replayed. What is withdrawn is the final certification and the
retirement of legacy authority.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-13T13:08:04.196Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0360-bind-the-four-plan-independent-certificate-to-observed-evidence-and-the-live-remote.task.md","contentDigest":"sha256:578803485f423afbd8b80205c0ab4088346b2f57bc0450068bc862a2de1c6d34"} -->
