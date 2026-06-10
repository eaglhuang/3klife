---
doc_id: doc_team_0028
task_id: TASK-TEAM-0028
title: "Team same-atom CID negative control"
status: done
completed_at: "2026-06-10T09:47:50+08:00"
completed_by_agent: "captain"
owner: atm-core
priority: P1
milestone: M1N
depends_on:
  - "TASK-TEAM-0027"
  - "TASK-TEAM-0002"
  - "TASK-TEAM-0003"
related:
  - "TASK-TEAM-0002"
  - "TASK-TEAM-0003"
  - "TASK-CID-0023"
  - "TASK-AAO-0106"
related_plan: "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/team.ts"
  - "C:/Users/User/AI-Atomic-Framework/docs/governance/team-agents/team-atom-boundaries.md"
deliverables:
  - "Synthetic negative-control fixture pair (A/B) with explicit same-atom claims"
  - "Command-backed broker compose evidence for same-atom CID block"
  - "C:/Users/User/AI-Atomic-Framework/docs/governance/team-agents/team-atom-boundaries.md"
validators:
  - "node atm.mjs broker compose --json (negative-control fixture pair)"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert synthetic fixture tasks, any helper scripts, and negative-control evidence together."
atomizationImpact:
  ownerAtomOrMap: "team.plan-crew-briefing-contract"
  mapUpdates: []
  notes: "2026-06-10 | done | broker compose PASS: blocked-cid-conflict with kind:cid on atomId team.plan-crew-briefing-contract and atomCid atom:cid:team-0028-crew-briefing-negative-control; fixtures tests/schema-fixtures/positive/team-0028-same-atom-proposal-{a,b}.json."
outOfScope:
  - "Re-opening TASK-TEAM-0027 atom-boundary uplift"
  - "Positive-control re-proof for TASK-TEAM-0002 vs TASK-TEAM-0003"
  - "N=4 same-file disjoint proof"
  - "Cross-file disjoint multi-lane proof"
  - "Post-apply per-proposal validator execution proof"
  - "TASK-TEAM-0029+ unless explicitly opened later"
nonGoals:
  - "Do not treat coarse file-range overlap alone as success"
  - "Do not widen synthetic fixtures beyond the canonical crew-briefing atom"
  - "Do not implement AAF proof work during Phase 0 planning opener"
dispatch_pattern:
  shape: "Phase 0 planning opener + later Phase 1 target-repo negative-control proof"
  rationale: "Captain closed the first canonical positive-control proof (same file, different atoms, PASS). This card opens the matching negative-control proof (same atom must block) with atom-level CID evidence."
  phase_0:
    lane: "planning opener"
    allowed_files:
      - "C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/tasks/README.md"
      - "C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0028-team-same-atom-cid-negative-control.task.md"
      - "C:/Users/User/3KLife/docs/tasks/tasks-team.json"
      - "C:/Users/User/3KLife/docs/tasks/tasks-team/tasks-team-part-1.json"
    allowed_files_strict: true
    commit_budget: 1
    output: "Planning-visible card and roster update for the canonical same-atom CID negative-control proof."
  phase_1:
    lane: "AI-Atomic-Framework target_repo proof"
    activation_requires:
      - "TASK-TEAM-0027"
      - "TASK-TEAM-0002"
      - "TASK-TEAM-0003"
    allowed_files:
      - "C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/team.ts"
      - "C:/Users/User/AI-Atomic-Framework/docs/governance/team-agents/team-atom-boundaries.md"
    allowed_files_strict: true
    forbidden_files:
      - "C:/Users/User/3KLife/**"
      - "C:/Users/User/AI-Atomic-Framework/atomic_workbench/atomization-coverage/path-to-atom-map-shards/**"
      - "C:/Users/User/AI-Atomic-Framework/atomic_workbench/atomization-coverage/path-to-atom-map.json"
      - "C:/Users/User/AI-Atomic-Framework/.atm/runtime/**"
    commit_budget: 2
condition_review:
  - "This is the second canonical CID proof after the TASK-TEAM-0002 vs TASK-TEAM-0003 positive-control PASS"
  - "Synthetic pair A/B must intentionally claim the same atom, not merely overlap on file paths"
  - "Canonical atom: team.plan-crew-briefing-contract"
  - "Canonical anchor: packages/cli/src/commands/team.ts#buildMinimalTaskCrewBriefingContract"
  - "Success requires verdict blocked-cid-conflict with mergePlan.conflicts[*].kind == cid and atom-level same-owner evidence"
  - "Failure is only coarse file-range overlap without atom-level same-owner evidence"
  - "Phase 0 must not touch AAF source; proof implementation waits for Phase 1 dispatch"
---
# TASK-TEAM-0028 — Team same-atom CID negative control

## Goal

Open the canonical **negative-control** CID proof for Team Agents: when two synthetic lanes intentionally claim the **same atom**, broker compose must fail closed with atom-level CID evidence.

This is the deliberate counterpart to the already-closed positive-control proof:

- **Positive control (closed):** `TASK-TEAM-0002` vs `TASK-TEAM-0003` — same file (`team.ts`), **different atoms**, no owner-shard hot-spot writes, **PASS**.
- **Negative control (this card):** synthetic pair **A/B** — same atom, must **block**.

## Why

Without a matching negative control, a PASS on different-atom parallel work could be misread as CID working when the system only detects coarse file overlap. Captain needs proof that same-atom contention is blocked with explicit `kind: cid`, not explainable as legacy file-range overlap.

## Fixture Design (converged)

Synthetic pair **A** and **B** must both claim:

| Field | Value |
| --- | --- |
| Atom id | `team.plan-crew-briefing-contract` |
| Anchor | `packages/cli/src/commands/team.ts#buildMinimalTaskCrewBriefingContract` |

Both lanes edit within that atom anchor surface only. They must **not** claim disjoint atoms such as `team.plan-atomization-planner`.

## Acceptance Criteria

- This card explicitly records that it is the **second canonical CID proof** after the `0002 vs 0003` positive-control PASS.
- Synthetic pair A/B intentionally claim the **same atom** (`team.plan-crew-briefing-contract`).
- **Success (Phase 1 proof):**
  - compose verdict is `blocked-cid-conflict`
  - `mergePlan.conflicts[*].kind == "cid"`
  - evidence cites the **same atom id / anchor**, not only the same file path
- **Failure (invalid proof):**
  - block explained only by coarse file-range overlap
  - no atom-level same-owner evidence in conflicts or advisor output
- Phase 0 planning opener lands in 3KLife only; AAF proof implementation is a separate Phase 1 dispatch.

## Deliverables

Phase 0 (this opener):

- This task card
- README roster row and rollout note
- `tasks-team.json` + `tasks-team-part-1.json` shard entry

Phase 1 (later target-repo work):

- Synthetic negative-control fixture pair (A/B)
- Command-backed `broker compose` evidence
- Optional `team-atom-boundaries.md` cross-reference for negative-control fixture routing

## Validators

Phase 0:

- `git diff --check`

Phase 1 (when activated):

- `node atm.mjs broker compose --json` on the synthetic A/B fixture pair

## Rollback

Revert the synthetic fixture tasks, helper routing, and negative-control evidence together. Do not leave a planning card that claims PASS without atom-level CID block evidence.

## Captain Notes

- Positive-control reference: same file, different atoms, PASS (post `TASK-TEAM-0027`).
- Negative-control reference: same atom, must block with `kind: cid`.
- Do not open `TASK-TEAM-0029+` from this opener unless Captain explicitly expands the proof matrix.

## Proof Result (2026-06-10)

Command:

```powershell
node atm.mjs broker compose --proposal-file tests/schema-fixtures/positive/team-0028-same-atom-proposal-a.json --proposal-file tests/schema-fixtures/positive/team-0028-same-atom-proposal-b.json --json
```

Observed:

- verdict: `blocked-cid-conflict`
- `mergePlan.conflicts[*].kind == "cid"`
- conflict detail cites shared `atomCid` (`atom:cid:team-0028-crew-briefing-negative-control`) and `atomId` (`team.plan-crew-briefing-contract`)

Referee convergence: evidence pack complete (001), regression-home recommendation complete (002), `closeout-ready-now` (003).
