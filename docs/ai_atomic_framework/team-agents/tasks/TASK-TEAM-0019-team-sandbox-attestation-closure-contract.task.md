---
doc_id: doc_team_0019
task_id: TASK-TEAM-0019
title: "Team sandbox attestation and closure contract"
status: done
owner: atm-core
priority: P0
milestone: M6H
depends_on:
  - "TASK-TEAM-0016"
  - "TASK-TEAM-0018"
related_plan: "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "schemas/governance/closure-packet.schema.json"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/evidence.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "scripts/validate-team-agents.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "schemas/governance/closure-packet.schema.json"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/evidence.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "scripts/validate-team-agents.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-team-agents.ts --case sandbox-attestation"
  - "node --strip-types scripts/validate-task-ledger-governance.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert attestation schema/validator additions and atom map entries. Do not remove legacy commandRuns hash fields."
atomizationImpact:
  ownerAtomOrMap: "atm.task-closure-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "Closure packet and Team Agents summary changes belong under task closure and team runtime maps."
outOfScope:
  - "Replacing command-backed evidence with team summaries"
  - "Removing stdoutSha256/stderrSha256 from commandRuns"
  - "Declaring node:vm or isolated-vm as a secure sandbox"
  - "Introducing Docker or Deno runtime adoption without a separate runtime decision card"
  - "Auto-closing tasks from Team Agents reports"
nonGoals:
  - "Do not create a second closure packet format"
  - "Do not make sandbox attestation mandatory for local draft Team runs"
  - "Do not change task close semantics"
completed_at: "2026-06-18T18:28:15.595Z"
completed_by_agent: "codex-gpt-5.4-mini"
lastTransitionId: "2026-06-18T18-28-15-491Z-close-f1678ce26408"
delivery_commit: "01740270fdb0def5bdb9bb06cf1059f59d733eaf"
---
# TASK-TEAM-0019 Team sandbox attestation and closure contract

## Goal

Extend Team Agents closure data so runtime mode, adapter, provider, SDK, model, and reviewer-independence attestations can be attached to closure review without weakening command-backed evidence.

## Why

Once Team Agents can run through multiple execution surfaces, closure review needs enough metadata to answer what runtime actually performed the work. That metadata should help humans review trust boundaries, but it must not replace validators, command hashes, or existing evidence rules.

## Implementation Contract

1. Add optional Team attestation fields to the closure packet or attached Team summary.
2. The attestation shape must be able to record:
   - `teamRunId`
   - `runtimeMode`
   - `runtimeLanguage`
   - `runtimeAdapterId`
   - `providerId`
   - `sdkId`
   - `modelId`
   - `runnerKind`
   - `runtimeVersion`
   - `sandboxPolicyHash`
   - `attestationSigner`
   - `reviewerIndependence`
   - `attestedAt`
3. A valid Team attestation may enrich closure review, but it must not turn failed validators into pass.
4. Missing command-backed evidence must still fail even if Team attestation is present.
5. Reviewer independence attestation must be able to say whether the reviewer used a distinct provider/model/adapter when policy requires that separation.

## Acceptance Criteria

- Closure packet with valid Team attestation passes governance validation.
- Closure packet without Team attestation still passes when existing evidence is valid.
- Failed validator plus valid Team attestation still fails close or evidence validation.
- Missing command-backed evidence plus valid Team attestation still fails.
- Reviewer independence metadata can represent both satisfied and unsatisfied policy outcomes.
- Schema and docs explicitly state that local runtime wrappers are not secure sandbox proof by themselves.

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-team-agents.ts --case sandbox-attestation`
- `node --strip-types scripts/validate-task-ledger-governance.ts`
- `git diff --check`

## Stop Conditions

- If the design starts introducing a second closure packet format, stop and split a migration card instead.
- If runtime security claims expand into new sandbox products or infrastructure, stop and route a separate runtime decision card first.

## Notes

This card strengthens closure review metadata. It does not change ATM closure authority or evidence rules.
