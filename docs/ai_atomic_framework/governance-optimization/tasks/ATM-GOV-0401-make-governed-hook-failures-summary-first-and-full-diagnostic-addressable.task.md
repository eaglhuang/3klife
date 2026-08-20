---
task_id: ATM-GOV-0401
title: Make governed hook failures summary-first and full-diagnostic-addressable
status: done
owner: gemini-captain
priority: P1
depends_on: []
causalGraph:
  startConditions:
    - The existing failure-envelope and governed commit wrapper have been inspected; no active claim owns their proposed paths.
  softRelations:
    - ATM-BUG-2026-07-11-115
  changedPublicSeams:
    - hook-failure-operator-diagnostic-contract
  causalImpactEdges:
    - governed-commit-hook-failure-to-actionable-summary
  validatorReferences:
    - tests/cli/governed-hook-failure-diagnostics.test.ts
  phaseOwner: gemini-captain
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/hook/pre-commit/failure-envelope.ts
  - packages/cli/src/commands/hook/pre-commit/implementation.ts
  - packages/cli/src/commands/git-governance/implementation/commit-execution.ts
  - packages/cli/src/commands/git-governance/implementation/hook-failure-diagnostics.ts
  - packages/cli/src/commands/hook/__tests__/pre-commit.spec.ts
  - tests/cli/governed-hook-failure-diagnostics.test.ts
deliverables:
  - packages/cli/src/commands/git-governance/implementation/hook-failure-diagnostics.ts
  - packages/cli/src/commands/hook/pre-commit/failure-envelope.ts
  - packages/cli/src/commands/git-governance/implementation/commit-execution.ts
  - tests/cli/governed-hook-failure-diagnostics.test.ts
validators:
  - node --strip-types packages/cli/src/commands/hook/__tests__/pre-commit.spec.ts
  - node --strip-types tests/cli/governed-hook-failure-diagnostics.test.ts
  - npm run typecheck
  - git diff --check
testContributions:
  - caseId: governed_hook_failure_summary_and_report_0401
    targetGroupId: null
    semanticKey: governed_hook_failure_summary_and_report
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [governed-commit-hook-failure-to-actionable-summary]
    expectedRedPredicate: a large structured pre-commit failure is emitted without an actionable first-line summary or an addressable complete diagnostic.
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: hook-failure-operator-diagnostic-contract
    resourceKey: null
requiredTestCaseIds:
  - governed_hook_failure_summary_and_report_0401
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - expand-contract
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the shared formatter and its writer/consumer wiring together; failure envelopes remain source data and no hook failure may be suppressed.
atomizationImpact:
  ownerAtomOrMap: atm.git-governance-commit-execution
  mapUpdates: []
  extractionCandidates:
    - atom: hook-failure-diagnostics
      pattern: Policy Object
      source: packages/cli/src/commands/git-governance/implementation/commit-execution.ts
      disposition: extract
      inlineReason: null
errorCodes:
  - code: ATM_GIT_COMMIT_FAILED
    disposition: reuse
    category: guard
    trigger: Governed commit execution fails after a pre-commit hook rejection.
    retryable: true
    requiresHumanApproval: false
    recovery: node atm.mjs git commit --actor <actor> --task <task> --message "<message>" --json
    sourceOwner: packages/cli/src/commands/git-governance/implementation/commit-execution.ts
    registryOwnerTask: ATM-GOV-0401
    tests:
      - tests/cli/governed-hook-failure-diagnostics.test.ts
createdByCommand: atm plan card create
completed_at: "2026-08-20T17:08:01.203Z"
completed_by_agent: "codex-captain"
closedAt: "2026-08-20T17:08:01.203Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-20T17-08-01-203Z-close-373921665b21"
lastTransitionAt: "2026-08-20T17:08:01.203Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "b7aab93cf4237bc2eb78ce2b467b572aa8cbfa61"
---

# ATM-GOV-0401 Make governed hook failures summary-first and full-diagnostic-addressable

## Intent

Repair the operator-facing failure contract exposed by ATM-BUG-2026-07-11-115 and recent dogfood: a governed commit can fail at pre-commit while the wrapper returns only a truncated fragment of the hook JSON. The actual blocking code and recovery command must be visible immediately, while full structured diagnostics remain losslessly addressable.

This is one diagnostic-transport boundary. It must use the same formatter for native hook output and the governed commit wrapper; it must not change admission, claim, task, receipt, close, runner, release, or error-code semantics.

## Acceptance

- [ ] ACC-1: **Summary first.** Every blocked pre-commit result presents a bounded first-line summary containing the selected blocking ATM code, a safe concise detail, and the exact recovery command when one exists. It must be deterministic and must not emit destructive raw-Git remediation.
- [ ] ACC-2: **Complete detail remains addressable.** The native hook and governed `git commit` wrapper expose the same complete structured failure envelope through a stable report reference (path plus SHA-256/digest or equivalent immutable reference). No surface may silently discard structured fields merely to fit a console preview.
- [ ] ACC-3: **No false success or data leak.** A formatter/report write failure remains fail-closed as a commit failure, preserves the original blocking code, and never changes staging, HEAD, claim, task, receipt, close, runner, or release state. Sensitive command values must be redacted by the existing operator-hint sanitizer.
- [ ] ACC-4: **TDD and parity.** A focused fixture first proves the old large-envelope/truncated-wrapper failure, then proves native-hook and governed-wrapper parity for: a required-command finding, no required-command finding, an oversized envelope, and report-write failure. Existing pre-commit regression remains green.

## Boundaries

- Do not modify `.atm/runtime/**`, `.atm/history/**`, planning cards, task/claim/close semantics, runner-sync, release artifacts, or SKL surfaces.
- Do not hand-edit the Git index, use raw Git remediation, `--no-verify`, or an emergency lease to deliver this card.
- Do not add a second error-code registry or task-specific/actor-specific exceptions.
- If another active claim owns any proposed path, obtain the official broker result and stop before editing; do not broaden scope by wildcard.

## Evidence and reporting

Record the red/green pair, focused command results, exact changed files, report-reference shape, and any active-claim/broker finding. `npm run typecheck` is a phase diagnostic: if it is red solely because of a foreign active card, report the exact compiler error and do not change foreign bytes.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-16T16:01:07.593Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0401-make-governed-hook-failures-summary-first-and-full-diagnostic-addressable.task.md","contentDigest":"sha256:8302a308c04960c5d6f75239383ede350c5b32f9f0a68788bcafee78c7ff88b4"} -->
