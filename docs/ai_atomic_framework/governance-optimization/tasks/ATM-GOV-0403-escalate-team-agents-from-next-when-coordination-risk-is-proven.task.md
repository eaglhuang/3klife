---
task_id: ATM-GOV-0403
title: Escalate Team Agents from next when coordination risk is proven
status: planned
owner: unassigned
priority: P1
depends_on:
  - ATM-GOV-0402
causalGraph:
  causalDependencies:
    - ATM-GOV-0402 exposes machine-actionable proposal-first recovery without weakening broker admission.
  startConditions:
    - At least one current coordination failure has a structured recovery contract.
  softRelations:
    - ATM-GOV-0341
  changedPublicSeams:
    - next-team-escalation-decision
  causalImpactEdges:
    - coordination-risk-to-team-required-guidance
  parallelFrontierInputs:
    - canonical broker lane decision
  validatorReferences:
    - tests/cli/next-team-escalation.test.ts
  phaseOwner: unassigned
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: C:/Users/User/AI-Atomic-Framework
scopePaths:
  - packages/cli/src/commands/next/channel-strategy.ts
  - packages/cli/src/commands/next/next-action-assembly.ts
  - packages/cli/src/commands/next/prompt-result-contracts.ts
  - packages/core/src/broker/team-lane.ts
  - tests/cli/next-team-escalation.test.ts
deliverables:
  - packages/cli/src/commands/next/channel-strategy.ts
  - packages/cli/src/commands/next/next-action-assembly.ts
  - packages/cli/src/commands/next/prompt-result-contracts.ts
  - packages/core/src/broker/team-lane.ts
  - tests/cli/next-team-escalation.test.ts
validators:
  - node --strip-types tests/cli/next-team-escalation.test.ts
  - npm run typecheck
testContributions:
  - caseId: next_escalates_team_when_coordination_risk_is_proven_0403
    targetGroupId: null
    semanticKey: next_team_escalation
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [coordination-risk-to-team-required-guidance]
    expectedRedPredicate: next either omits the escalation or blocks ordinary local work without a proven coordination risk
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: next-team-escalation-decision
    resourceKey: null
requiredTestCaseIds:
  - next_escalates_team_when_coordination_risk_is_proven_0403
tddMode: required
methodProfiles:
  - expand-contract
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.next-routing
  mapUpdates: []
  extractionCandidates:
    - atom: atm.team-escalation-policy
      pattern: Policy Object
      source: packages/cli/src/commands/next/channel-strategy.ts
      disposition: extract
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
---

# ATM-GOV-0403 Escalate Team Agents from next when coordination risk is proven

## Intent

Promote Team Agents from buried advisory to a data-derived escalation decision.
`next` must emit `team-recommended` for observable coordination risk and
`team-required` only before an expensive shared boundary. The decision must
name the risk facts, minimum L-level, affected shared surface, expected gain,
and official state-only recovery; ordinary focused validation and isolated
quickfix work remain available without Team startup.

## Acceptance

- [ ] ACC-1: `next` emits a machine-readable escalation decision from canonical broker/task facts, not actor, task, queue, date, or incident special cases.
- [ ] ACC-2: Two independent workstreams, repeated broker/claim conflict, or an upcoming runner publication/certificate/multi-task closeout can produce `team-recommended` with a minimum crew level and official state-only command.
- [ ] ACC-3: Only proven high-risk shared boundaries produce `team-required`; reads, focused tests, and isolated quickfixes remain unblocked.
- [ ] ACC-4: Focused red/green fixtures cover advisory, recommended, required, stale/ambiguous facts, and no false Team requirement.

## Boundaries

Do not start Team workers, generate proposals, mutate broker runtime, build a
runner, publish, close a task, or push. The follow-up only classifies and
surfaces an escalation decision.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-16T16:45:24.558Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0403-escalate-team-agents-from-next-when-coordination-risk-is-proven.task.md","contentDigest":"sha256:f44cb39b015764877751da2dbb41e4afdd6dab3db00bd7dcf6aeca3b9136d3bc"} -->
