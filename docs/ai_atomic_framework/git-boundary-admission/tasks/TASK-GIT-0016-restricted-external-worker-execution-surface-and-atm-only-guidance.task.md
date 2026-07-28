---
doc_id: doc_TASK-GIT-0016
task_id: TASK-GIT-0016
title: "Restricted external-worker execution surface and ATM-only guidance"
status: planned
owner: atm-core
priority: P0
milestone: G8
depends_on:
  - TASK-GIT-0015
related_plan: docs/ai_atomic_framework/git-boundary-admission/git-boundary-admission-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/team-agents/restricted-execution-gateway.ts"
  - "packages/core/src/team-agents/worker-executor.ts"
  - "packages/cli/src/commands/broker/batch-execute-actions.ts"
  - "packages/cli/src/commands/integration-hooks/implementation.ts"
  - "packages/cli/src/commands/team-runtime-gates.ts"
  - "packages/cli/src/commands/next.ts"
  - "templates/skills/atm-governance-router.skill.md"
  - "templates/skills/atm-dispatch.skill.md"
  - "templates/skills/atm-next.skill.md"
  - "packages/integrations-core/src/compiler/skill-templates.ts"
  - "tests/cli/restricted-execution-gateway.test.ts"
  - "tests/cli/command-manifest-shellless.test.ts"
  - "tests/cli/integration-raw-git-command-guard.test.ts"
validators:
  - "node --strip-types tests/cli/restricted-execution-gateway.test.ts"
  - "node --strip-types tests/cli/command-manifest-shellless.test.ts"
  - "node --strip-types tests/cli/integration-raw-git-command-guard.test.ts"
  - "npm run validate:skill-templates"
  - "npm run typecheck"
deliverables:
  - "One RestrictedExecutionGateway interface that accepts actor/task/lane context plus structured executable and argv, and returns an allow/deny decision with an ATM recovery command."
  - "External-worker execution uses the gateway before process launch; direct host mutation is not a valid worker capability."
  - "The gateway rejects raw Git mutation and interpreter-evaluation or shell-command escapes including node -e/--eval, PowerShell -Command/-File write paths, cmd /c, bash -c, and equivalent configured interpreters unless an explicit brokered ATM command contract permits a non-mutating validator."
  - "Command manifests use executable and argv policy rather than only forbidding a shell field; validators remain allowlisted read-only commands with declared working-directory and output contracts."
  - "Supported editor integration hooks delegate to the same gateway decision; adapters unable to enforce pre-tool policy advertise no external-write capability instead of implying a hard gate."
  - "ATM entry skills (governance router, dispatch, next) and structured CLI recovery output state that raw Git, node -e, PowerShell write commands, and direct shell mutation are not approved worker routes; they name the returned ATM command as the only normal mutation path."
  - "A sealed deep-module review receipt records the chosen interface, two adapters, deletion-test result, rollback, and causal validators before production edits."
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the gateway and its adapter projections as one unit. Do not restore a policy-only integration guard while claiming the external-worker execution surface remains hard-gated."
atomizationImpact:
  ownerAtomOrMap: "atm.git-boundary-restricted-execution-gateway"
  mapUpdates:
    - "Map the single gateway decision to Team worker execution, command-manifest execution, editor pre-tool hooks, skills, and structured CLI guidance."
  extractionCandidates:
    - path: "packages/core/src/team-agents/restricted-execution-gateway.ts"
      reason: "One deep policy owner prevents duplicated deny lists and divergent integration behavior."
outOfScope:
  - "Operating-system sandboxing for arbitrary human shells outside an ATM-managed worker process."
  - "Changing ordinary local human Git workflows that do not opt into the external-worker runtime."
  - "A broad rewrite of every CLI command executor."
nonGoals:
  - "Do not treat prompt text, a skill warning, or an env variable alone as execution authorization."
  - "Do not allow a generic interpreter exception that reintroduces node -e or PowerShell write escapes."
---

# TASK-GIT-0016 - Restricted external-worker execution surface and ATM-only guidance

## Problem

`TASK-GIT-0013` made raw Git mutation default-denied where a supported integration invokes ATM's command guard. That leaves a larger capability gap: an external worker with ambient shell access can invoke `node -e`, PowerShell write commands, or native Git without crossing that guard.

This task makes the normal external-worker contract honest and enforceable. Worker mutation must originate from one brokered restricted execution surface. ATM skills and CLI output reinforce that contract, but text is not the enforcement mechanism.

## First-Principles Design

The protected resource is repository mutation, not a spelling of `git`. A policy that blocks only selected command strings is shallow: every caller needs to know a growing deny list, while a new interpreter or process launcher recreates the incident.

The proposed deep module is `RestrictedExecutionGateway`:

- **interface:** `evaluate({ actor, taskId, laneSessionId, executionClass, executable, argv, cwd, declaredOutputs }) -> { decision, reasonCode, approvedAtmCommand, receipt }`;
- **hidden complexity:** executable normalization, interpreter and raw-Git classification, allowlisted validator policy, broker/lane authority, adapter capability, audited denial receipts, and safe recovery guidance;
- **adapter A:** Team/external-worker process executor;
- **adapter B:** supported editor pre-tool integration hook;
- **projection-only callers:** ATM entry skills and `next`/hook output consume the decision's recovery guidance rather than maintaining their own command lists.

Deletion test: removing this module would force each worker executor, command-manifest path, integration hook, skill, and CLI diagnostic to rediscover which interpreter forms and mutation routes are unsafe. That is duplicated policy and proves the module earns its depth.

## Required Behavior

1. External workers receive no ambient mutation capability. They may request a structured action, but process launch occurs only after the gateway admits it for the active actor/task/lane.
2. Default-deny executable/argv policy rejects raw `git` mutation and interpreter evaluation/command forms: `node -e`, `node --eval`, `powershell -Command`, `powershell -File` when it can mutate, `pwsh -Command`, `cmd /c`, `bash -c`, and equivalent configured interpreters.
3. Read-only validators are a narrow allowlist with structured argv, declared working directory, and no generic shell fallback. A validator requiring writes must be an explicit ATM-governed command class with evidence and scope.
4. The existing command-manifest path must not accept a shell-less `node -e` write as a loophole.
5. Supported integrations call the gateway before tools run. An adapter that cannot enforce this must expose `externalWriteCapability: unsupported`; dispatch must not assign it external write work.
6. All ATM entry skills and returned structured recovery messages say: do not use native `node -e`, raw Git, or PowerShell write commands; use the ATM command returned by the current playbook/diagnostic. The actual command remains context-specific and must not be invented by prose.
7. Denial receipts identify the normalized executable/argv class, actor/task/lane, reason code, and safe ATM recovery command without exposing reusable privileged tokens.

## Acceptance

- A deep-module review receipt passes before source edits, names both real adapters, includes the deletion test, and preserves rollback plus causal validators.
- A Team worker attempting raw `git commit`, `node -e` filesystem write, PowerShell `Set-Content`, `cmd /c`, or `bash -c` is denied before execution and produces a structured receipt.
- A command manifest that uses `process.execPath` with `-e` or equivalent evaluation argument is denied; the existing positive write fixture is replaced by a fail-closed regression.
- A declared read-only validator command is admitted only when it satisfies the executable/argv allowlist and has no shell fallback.
- The same normalized decision is observed through the Team worker adapter and a supported editor pre-tool hook adapter.
- An adapter without an enforceable pre-tool surface advertises no external-write capability and is rejected by dispatch/claim admission for external write work.
- The three canonical ATM entry skills and structured CLI guidance contain the ATM-only route warning, compiled projections validate, and no unresolved template placeholder is introduced.
- Tests prove warning text cannot itself grant permission, and missing/wrong actor, task, lane, declared output, or broker authority fails closed.
- `npm run validate:skill-templates` and `npm run typecheck` pass.

## Implementation Notes

Prefer one small public interface with two adapters. Do not create a separate deny-list implementation in every integration, skill, hook, or executor. Preserve normal human-local shell workflows outside the external-worker runtime, and state that limitation in user-facing guidance.
