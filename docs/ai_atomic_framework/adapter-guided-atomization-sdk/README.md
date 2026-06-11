# Adapter-Guided Atomization SDK Initiative

**Initiative code:** ASP (Atomization SDK Planning)
**Started:** 2026-06-10
**Goal:** Formalize an optional SDK contract that lets each language adapter expose function/module-level atom candidates, so AI Agents can drive code atomization without needing a heavyweight universal AST engine.

---

## Background

See:
- `docs/ai_atomic_framework/vision-paper-semantic-admission.md` — academic positioning (Atomization-First CID Broker)
- `docs/ai_atomic_framework/atomic-cost-reduction-plan.md` — engineering plan
- `docs/ai_atomic_framework/atm-core-broker-survey.md` — current state evidence

## Why this initiative exists

ATM core already has a complete broker (`packages/core/src/broker/`, 1932 LOC) that handles CID conflicts, shared surfaces, and same-file CID-disjoint routing. What is missing is the **SDK contract** that lets language adapters discover atom candidates and propose dry-run atomization plans.

Without this contract:
- Each adapter implements atomization ad-hoc (Python has `planPythonAtomize` privately; JS has nothing)
- Broker has no standard way to consume `AtomCandidate` → `WriteIntent` mapping
- AI Agents must invent atom IDs by themselves, often using LLM inference

## Task graph

```
ASP-0001 (SDK Contract)
   ├─ blocks → ASP-0002 (JS adapter)
   ├─ blocks → ASP-0003 (Python adapter SDK promotion)
   └─ blocks → ASP-0004 (Broker bridge)

ASP-0005 (3KLife coord tracker) — independent, tracks AAF progress
```

## Tasks

| ID | Title | Target | Status |
|---|---|---|---|
| TASK-ASP-0001 | AtomizationPlanningAdapter SDK contract | AI-Atomic-Framework | done |
| TASK-ASP-0002 | JS adapter candidate discovery | AI-Atomic-Framework | done |
| TASK-ASP-0003 | Python adapter SDK promotion | AI-Atomic-Framework | done |
| TASK-ASP-0004 | Broker candidate-to-intent bridge | AI-Atomic-Framework | done |
| TASK-ASP-0005 | 3KLife coordination + baseline | 3KLife | done |

> **Initiative status (2026-06-11):** AAF batch `batch-d95420db3166` 五卡皆已正式收口（ledger done + governance commit）。本 README 與 `tasks/*.task.md` 為規劃鏡像；事實來源為 AAF `.atm/history/tasks/TASK-ASP-*.json`。
