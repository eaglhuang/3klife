---
doc_id: doc_other_0272
task_id: TASK-ATS-0002
title: TASK-ATS-0002 npc-brain baseline risk matrix
owner: atm-core
status: completed
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-ATS-0002 npc-brain baseline risk matrix

## Risk matrix

| Risk ID | Risk | Severity | Affected candidates | Mitigation |
|---|---|---|---|---|
| `ATS-0002-R1` | Local npc-brain working tree is dirty. | High | `NPC-FIX-005` | Treat `036d264e7fd56a969e9ef182d9ea3ac96df60fcb` as frozen baseline; review local diff separately before using it as fixture truth. |
| `ATS-0002-R2` | Several ETL scripts are very large and mix parsing, orchestration, artifact IO, scoring, and governance policy. | High | `NPC-FIX-004`, `NPC-FIX-005`, `NPC-FIX-006` | Start with observation-only `atomize` and `split` proposals; do not auto-apply refactors until reports are reviewed. |
| `ATS-0002-R3` | Some workflows can touch external systems such as PostgreSQL, Pinecone, Qdrant, crawler targets, or LLM providers. | High | `NPC-FIX-003`, `NPC-FIX-004`, broader pipeline scripts | Fixture mode must default to no network and no remote writes; require explicit opt-in for external backends. |
| `ATS-0002-R4` | Generated artifacts may be large and hard to rollback manually. | Medium | Parser and ETL candidates | Each ATM behavior test must declare output root and rollback action before execution. |
| `ATS-0002-R5` | Service helper behavior depends on runtime profile files and governance data. | Medium | `NPC-FIX-002`, `app/npc_dialogue_service.py` | Use mock stores and minimal fixture data before running service-level smoke tests. |
| `ATS-0002-R6` | Graph workflows may require LangGraph tooling not present in a clean Python environment. | Medium | `NPC-FIX-007` | Treat LangGraph candidate as second-wave fixture after parser/service helper packs pass. |

## Readiness by candidate

| Candidate | Readiness | Reason |
|---|---|---|
| `NPC-FIX-001` | Ready for TASK-ATS-0003/0004 | Deterministic parser, clear input and output roots |
| `NPC-FIX-002` | Ready with mock store | Small service helper boundary; needs fixture store |
| `NPC-FIX-003` | Ready in stub mode only | Adapter polymorphism is useful, but remote vector backends must be disabled |
| `NPC-FIX-004` | Ready after dry-run harness design | Multi-step workflow, moderate external dependency risk |
| `NPC-FIX-005` | Blocked for clean baseline until diff review | Local dirty file must be separated from baseline truth |
| `NPC-FIX-006` | Defer | Giant file is ideal stress test, but not the first fixture |
| `NPC-FIX-007` | Defer | Graph runtime should wait until core fixture harness exists |

## Downstream gates

TASK-ATS-0003 should prove official onboarding can produce evidence without mutating npc-brain. TASK-ATS-0004 should use `NPC-FIX-001` and `NPC-FIX-002` first, then expand to `NPC-FIX-004`. TASK-ATS-0005 should choose only one legacy Python file for the first `infect + atomize` pilot and must not start with the 4680-line convergence loop.
