---
doc_id: doc_cid_0001
task_id: TASK-CID-0001
title: "CID hardening control plane bootstrap + verified facts baseline"
status: done
owner: atm-core
priority: P0
milestone: E0
depends_on: []
started_at: 2026-06-03T13:42:00+08:00
started_by_agent: claude-opus-4-7
completed_at: 2026-06-03T13:55:00+08:00
completed_by_agent: claude-opus-4-7
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md
planning_repo: 3KLife
target_repo: 3KLife
closure_authority: planning_repo
scopePaths:
  - "docs/ai_atomic_framework/cid-hardening/README.md"
  - "docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md"
  - "docs/ai_atomic_framework/cid-hardening/00-verified-facts.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/README.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0001-*.task.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0002-*.task.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0003-*.task.md"
deliverables:
  - "docs/ai_atomic_framework/cid-hardening/README.md"
  - "docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md"
  - "docs/ai_atomic_framework/cid-hardening/00-verified-facts.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/README.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0001-*.task.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0002-*.task.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0003-*.task.md"
validators:
  - "git diff --check"
  - "node atm.mjs tasks import --from \"C:/Users/User/3KLife/docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0001-cid-hardening-control-plane-bootstrap.task.md\" --dry-run --json"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the planning bootstrap commit. Planning-only; no AAF source touched, no .atm/runtime or .atm/history writes."
atomizationImpact:
  ownerAtomOrMap: "atm.planning-bridge-map"
  mapUpdates: []
  notes: "Planning-only bootstrap; framework atom map updates deferred to AAF implementation cards (0002+)."
outOfScope:
  - "Modifying AI-Atomic-Framework source"
  - "Hand-editing .atm/runtime/** or .atm/history/**"
  - "Executing tasks import --write"
  - "Opening TASK-CID-0004 ~ 0007 as formal cards (future queue only)"
  - "Implementing any schema, scanner, sandbox, or runtime"
nonGoals:
  - "Do not import CID into TASK-TEAM-* namespace"
  - "Do not claim AAF implementation work in this card"
---

# TASK-CID-0001 — CID hardening control plane bootstrap + verified facts baseline

## Goal

Establish the `cid-hardening/` planning lane as an independent governance task family (parallel to APF and TEAM), and ship the verified-facts baseline so subsequent E0 cards cannot drift away from current upstream reality.

## Why

The upstream `ticklish-bouncing-lagoon.md` (v3.1) roadmap has been Captain-approved. Without a stable planning home with a fact baseline, follow-up cards risk mixing "current reality" with "proposal" — exactly the failure mode v3.1 was rewritten to avoid. This card bootstraps the lane in a single, planning-only, AAF-untouching commit.

## Implementation Contract

- Pure planning surface in `3KLife`. **Do not touch any AAF source.** Do not write `.atm/runtime/**` or `.atm/history/**`.
- This card and its peers `TASK-CID-0002` / `TASK-CID-0003` are the only CID cards opened this round; `0004 ~ 0007` stay in the future queue inside `tasks/README.md`.
- Naming and prefix are decided: lane = `docs/ai_atomic_framework/cid-hardening/`, card prefix = `TASK-CID-*`. CID is **not** absorbed into `TASK-TEAM-*`.
- `00-verified-facts.md` mirrors §1A/1B/1C/1D of the plan book with `file:line` citations so AI agents cannot misread proposals as already-implemented.

## Deliverables

- `docs/ai_atomic_framework/cid-hardening/README.md` — lane entry + rules + flow + cross-refs.
- `docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md` — planning source of truth.
- `docs/ai_atomic_framework/cid-hardening/00-verified-facts.md` — three-tier baseline (verified facts / proposals / out-of-scope) with file:line.
- `docs/ai_atomic_framework/cid-hardening/tasks/README.md` — task index + pilot roster + future queue + cross-lane refs.
- Pilot cards `TASK-CID-0001` / `0002` / `0003` only.

## Validators

- `git diff --check`
- `node atm.mjs tasks import --from "C:/Users/User/3KLife/docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0001-cid-hardening-control-plane-bootstrap.task.md" --dry-run --json`

## Acceptance Criteria

- The lane exists at `docs/ai_atomic_framework/cid-hardening/` with README + plan book + verified facts + tasks/.
- `tasks/README.md` shows exactly three pilot cards (`0001 / 0002 / 0003`) and a clearly-labelled future queue for `0004 ~ 0007` (no `.task.md` files created for them).
- Every card carries `task_id`, `target_repo`, `closure_authority`, `scopePaths`, `deliverables`, `validators`, `evidence`, `rollback`, `atomizationImpact`, `outOfScope`.
- No AAF source files are modified. No `.atm/runtime/**` or `.atm/history/**` writes.
- `tasks import --dry-run` resolves all three pilot cards with their declared `task_id`.

## Rollback

Revert the planning bootstrap commit. Because this card is planning-only, rollback should not require build or target runner sync.

## Atomization Impact

- Owner atom/map: `atm.planning-bridge-map`
- Map updates: none
- Framework atomization updates are owned by `TASK-CID-0002` (AAF) onward.

## Notes

Direct successor to the v3.1 roadmap approval. Follow-up: after this card closes, the next claim should be `TASK-CID-0002` (CID semantics + fingerprintProfile schema, AAF).
