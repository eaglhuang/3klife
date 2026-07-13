---
task_id: TASK-GIT-0013
title: Agent raw Git deny and ATM Git tool gate
status: done
milestone: G5
priority: P0
depends_on:
  - TASK-GIT-0010
  - TASK-GIT-0011
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
related_backlog:
  - ATM-BUG-2026-07-12-161
scopePaths:
  - "integrations/**"
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/hook/pre-commit.ts"
  - "packages/cli/src/commands/integration.ts"
  - "packages/cli/src/commands/team.ts"
  - "packages/core/src/broker/**"
  - "scripts/validate-git-hooks-enforcement.ts"
  - "scripts/validate-broker-lifecycle.ts"
  - "tests/cli/**"
deliverables:
  - "Integration-level command policy that denies raw Git mutation commands for AI agents by default."
  - "ATM-governed Git tool surface for stage, unstage, commit, status, index lane, and destructive override lease flows."
  - "Two-level override contract: stage-only deferral and destructive worktree/index mutation."
  - "Audit evidence for every emergency lease and denied high-risk Git attempt where the integration can observe it."
  - "Regression coverage proving supported integrations fail closed when agents attempt raw destructive Git."
validators:
  - "npm run validate:git-hooks-enforcement"
  - "npm run validate:broker-lifecycle"
  - "npm run typecheck"
  - "npm run check:encoding:touched"
evidence:
  required: command-backed
out_of_scope:
  - "No server-side Git hosting policy in this card."
  - "No promise to control unsupported shells or agent runtimes that do not install the ATM command guard."
  - "No broad permanent raw-Git unlock after an emergency phrase."
nonGoals:
  - "No reliance on agent self-discipline or warning-only guidance as the primary protection."
  - "No automatic destructive rollback without an explicit scoped lease."
atomizationImpact:
  ownerAtomOrMap: "atm.git-boundary-agent-permission"
  mapUpdates:
    - "Add or update atoms for integration command policy, ATM Git tool gate, Broker index lane lease, and destructive Git audit evidence."
completed_at: "2026-07-13T00:40:05.351Z"
completed_by_agent: "codex-backlog-captain"
closedAt: "2026-07-13T00:40:05.351Z"
closedByActor: "codex-backlog-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-13T00-40-05-351Z-close-dbbf6e77a2c6"
lastTransitionAt: "2026-07-13T00:40:05.351Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "1a6968fa5d0c4d4ecf05150934cb1adee4782cc9"
---

# TASK-GIT-0013

## Goal

Make Git a governed capability for AI agents instead of an unrestricted shell tool. Supported ATM integrations should deny raw Git mutation commands by default and require agents to perform Git mutations through ATM-governed Git tools or scoped Broker leases.

This is the hard-gate extension to the completed Git Boundary Admission series. The earlier MVP intentionally focused on pre-push admission and hook/audit behavior; this card addresses the stronger multi-agent safety requirement discovered during Team Agents dogfood.

## Problem

Local hooks and ATM CLI checks can block governed commit/push paths, but they cannot reliably prevent an AI with unrestricted shell access from directly running commands such as:

- `git restore`
- `git restore --staged`
- `git reset`
- `git reset --hard`
- `git checkout -- <paths>`
- `git checkout -f`
- `git switch -f`
- `git clean`
- `git rm`
- `git update-index`
- `git read-tree`

In a shared Team Agents workspace, these commands can mutate another active agent's staged or unstaged work outside Broker arbitration. Warning agents not to use them is insufficient; supported integrations need a command permission boundary.

## Required behavior

### 1. Default deny for raw Git mutation

Supported AI integrations must deny raw Git mutation commands by default. Agents may perform Git mutations only through ATM-governed tools or wrappers.

At minimum, raw command attempts for these families must be blocked before execution when the integration command guard is active:

- staging mutation: `git add`, `git restore --staged`, `git reset <paths>`, `git rm`, `git update-index`
- worktree mutation: `git restore`, `git checkout -- <paths>`, `git checkout -f`, `git switch -f`
- destructive cleanup/history/index mutation: `git reset --hard`, `git clean`, `git read-tree`
- commit/push bypass attempts that skip ATM governance, including direct `git commit`, `git commit --no-verify`, and direct `git push` when ATM admission is required

Read-only Git commands may be allowed initially, but the policy must explicitly classify them. Examples: `git status`, `git diff`, `git log`, `git show`, `git branch --show-current`.

### 2. ATM Git tool surface

Provide or standardize governed alternatives for common agent needs:

- `atm git status`
- `atm git diff`
- `atm git stage`
- `atm git unstage`
- `atm git commit`
- `atm git admit`
- `atm git index-lane request/status/release`
- `atm git lease stage-override`
- `atm git lease destructive-override`

Each mutation path must check task id, actor id, scope lock, Broker ownership, foreign active staged paths, and audit requirements.

### 3. Two-level override model

Stage-only deferral requires:

```text
ATM-STAGE-OVERRIDE-I-UNDERSTAND-THIS-MAY-DISRUPT-ANOTHER-ACTIVE-AGENT
```

Destructive worktree/index mutation requires the higher phrase:

```text
ATM-DESTRUCTIVE-GIT-OVERRIDE-I-UNDERSTAND-THIS-CAN-DESTROY-ANOTHER-ACTIVE-AGENT-WORK
```

The phrase must not be inferred from chat. It must be supplied through an explicit ATM command option or a Broker-issued emergency lease. Leases must be actor-scoped, task-scoped, path-scoped, TTL-bound, and single-use.

### 4. Integration command guard

Codex, Claude Code, Cursor, Copilot, Gemini, and Antigravity adapters should gain a documented command-policy entry where technically supported.

The guard must:

- inspect command argv before shell execution where the host integration allows it;
- block denied raw Git mutation commands before they run;
- print a concise recovery command that uses ATM Git tooling instead;
- record an audit finding for denied high-risk attempts when a local evidence path is available;
- clearly report unsupported integrations as "warning-only" rather than pretending to hard gate.

### 5. Broker index lane integration

The command guard and ATM Git tools must share the same index ownership classifier used by Team Broker. If another active task owns staged paths, the guard should route to:

- wait for owner;
- Broker index lane queue;
- owner handoff;
- stage-only emergency lease;
- destructive emergency lease only for the highest-risk cases.

### 6. Boundary and threat model

Document the honest boundary:

- ATM can hard gate supported integrations that install the command guard.
- ATM can hard gate governed ATM CLI and hook paths.
- ATM cannot prevent raw destructive Git in unsupported unrestricted shells unless the host runtime adopts the command guard or OS-level policy.
- Post-fact detectors are useful evidence, not a substitute for pre-execution denial.

## Acceptance

- A regression proves supported command guard policy rejects raw `git restore --staged <foreign-active-owned-path>` without a stage-only lease.
- A regression proves supported command guard policy rejects raw `git restore <path>`, `git reset --hard`, `git checkout -- <path>`, and `git clean` without a destructive lease when they would touch foreign active or broad workspace state.
- A regression proves direct `git commit --no-verify` is rejected when ATM governed commit/admission is required.
- A regression proves allowed read-only Git commands remain available or are routed through ATM equivalents according to the documented policy.
- A regression proves `atm git stage/unstage/commit` can perform the same intended operation when scope, actor, task, Broker lane, and evidence checks pass.
- A regression proves the stage-only override phrase does not authorize destructive worktree/index mutation.
- A regression proves the destructive override phrase is actor/task/path/TTL scoped and single-use.
- Integration docs name which adapters are hard-gated, which are advisory-only, and how to verify installation.
- The implementation links to `ATM-BUG-2026-07-12-161` and `TASK-AAO-0189` so the framework hotfix and planning mirror stay aligned.

## Validation

- `npm run validate:git-hooks-enforcement`
- `npm run validate:broker-lifecycle`
- `npm run typecheck`
- `npm run check:encoding:touched`

## Rollback

Disable the integration command guard while preserving ATM CLI and hook-level gates. If rolled back, docs must clearly state that raw Git mutation is no longer pre-execution denied and Team Agents should serialize Git operations until a replacement guard lands.
