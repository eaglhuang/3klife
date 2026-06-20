# close-orchestration Controlled Collision Runbook

This runbook defines the next real same-file broker experiment for the paper.

## Objective

Produce a **positive same-file merge case** on
`packages/cli/src/commands/taskflow/close-orchestration.ts` using two agents on
the same `main` working tree:

- Lane A modifies `buildClosebackPlan`
- Lane B modifies `resolveClosebackPlanningPath`

The broker should admit both sides as parallel-safe because the patches land on
different virtual atoms inside an already atomized file.

## Preconditions

- `git status --short` is empty in both `AI-Atomic-Framework` and `3KLife`
- `packages/cli/src/commands/taskflow/close-orchestration.ts` is clean
- no active broker/team-run leases remain from older experiments
- the participating AI should confirm its own `git status --short` is empty

## Human/operator setup

1. Keep both repos on `main`
2. Do not open a second worktree
3. Assign:
   - Codex -> `TASK-COLLIDE-CLOSE-ORCH-A`
   - Claude Code Opus 4.7 -> `TASK-COLLIDE-CLOSE-ORCH-B`
4. Both sides must use broker/team admission; no manual direct edits

## Positive run

### Lane A

- Scope: `buildClosebackPlan`
- Acceptable patch classes:
  - operator-facing closeback step wording
  - closeback plan metadata clarity
  - follow-up step labeling or diagnostics shape

### Lane B

- Scope: `resolveClosebackPlanningPath`
- Acceptable patch classes:
  - fallback-path diagnostics wording
  - ambiguity/missing-path messages
  - path-recovery reporting clarity

### Success conditions

- both sides target the same file
- the broker records disjoint virtual-atom intent
- both sides are admitted as `parallel-safe`
- final merge/apply succeeds cleanly
- evidence captures actor, lane, verdict, file, and virtual-atom boundary

## Negative control run

After the positive run is captured, run a second experiment where both sides
modify `buildClosebackPlan`.

### Expected result

- broker returns `blocked-cid-conflict`, or
- admission remains permissive but apply-phase blocks/freeze happens later

If the block occurs later, document it exactly the same way as B-12:
truthful apply-phase enforcement, not admission-time freeze.

## Direct paste for the other AI

Use this exact brief for the second participant:

> You are participating in a controlled same-file broker collision test for ATM paper evidence.  
> Repository: `C:\\Users\\User\\AI-Atomic-Framework` on `main`.  
> Your task is `TASK-COLLIDE-CLOSE-ORCH-B`.  
> You may edit only `packages/cli/src/commands/taskflow/close-orchestration.ts`, and only inside `resolveClosebackPlanningPath`.  
> Do not touch `buildClosebackPlan`.  
> Do not edit release mirrors or unrelated files.  
> Use broker/team-governed flow only; do not bypass with direct manual edits.  
> The intended outcome is a same-file, different-function, parallel-safe merge case.  
> Report back: actor id, lane, verdict, team run id, shared file, exact function touched, and whether block happened at admission or apply-phase.

## Evidence to collect

- broker/team-run JSON
- any active-intent or registry snapshot if needed
- final diff or merged commit
- post-run capture/bundle report
- short paper-ready summary with:
  - file
  - lane A function
  - lane B function
  - verdict
  - admission/apply timing
