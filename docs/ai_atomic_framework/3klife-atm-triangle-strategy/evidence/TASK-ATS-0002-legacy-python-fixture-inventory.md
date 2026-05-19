---
doc_id: doc_other_0271
task_id: TASK-ATS-0002
title: TASK-ATS-0002 legacy Python fixture inventory
owner: atm-core
status: completed
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-ATS-0002 legacy Python fixture inventory

## Inventory summary

The npc-brain baseline contains 105 Python files. The first ATM validation set should start with a small, representative fixture suite instead of trying to govern the whole repo at once.

This inventory intentionally covers at least three legacy Python candidate classes:

- Parser and chunking scripts
- Service helpers and runtime adapters
- Workflow or ETL orchestration scripts

## Fixture candidates

| ID | Candidate | Class | Source URI | Why it is useful for ATM | Expected atom behaviors | Rollback notes |
|---|---|---|---|---|---|---|
| `NPC-FIX-001` | Mao text cleaner and splitter | parser | `C:/Users/User/3klife-npc-brain/pipelines/sanguo-rag/clean_and_split.py` | Deterministic text input to chapter/chunk artifacts; good first candidate for non-network atomization. | `split`, `atomize`, `compose` | Keep original input corpus immutable; rollback by deleting generated artifact root only. |
| `NPC-FIX-002` | Evidence resolver | service helper | `C:/Users/User/3klife-npc-brain/app/evidence_resolver.py` | Small service helper with clear input/output boundary around resolved and unresolved evidence. | `compose`, `merge`, `dedup-merge`, `sweep` | Use mock `RuntimeProfileStore`; avoid mutating runtime profile artifacts during early tests. |
| `NPC-FIX-003` | Vector store adapter | service helper | `C:/Users/User/3klife-npc-brain/app/vector_store.py` | Adapter boundary is useful for polymorphic backend validation without touching dialogue behavior. | `polymorphize`, `compose`, `expire` | Run against SQLite/stub provider first; do not create or recreate remote Pinecone/Qdrant indexes in fixture mode. |
| `NPC-FIX-004` | Resolution loop runner | workflow / ETL | `C:/Users/User/3klife-npc-brain/pipelines/sanguo-rag/run_resolution_loop.py` | Exercises multi-step governance loop, MCQ generation, optional answer application, and artifact routing. | `compose`, `merge`, `sweep`, `evolve` | Start with `--top` small and no external PostgreSQL write; rollback generated MCQ/output directory. |
| `NPC-FIX-005` | Relationship claim graph builder | workflow / ETL | `C:/Users/User/3klife-npc-brain/pipelines/sanguo-rag/build_relationship_claim_graph.py` | Strong candidate for atom map decomposition because it merges aliases, stable bootstrap, relationship edges, and external evidence. | `split`, `merge`, `dedup-merge`, `compose`, `atomize` | Current local working tree modifies this file. Treat baseline as commit-pinned until the local diff is reviewed. |
| `NPC-FIX-006` | Full roster convergence loop | workflow / ETL | `C:/Users/User/3klife-npc-brain/pipelines/sanguo-rag/run_full_roster_convergence_loop.py` | Large orchestration file, useful later as the stress test for giant legacy script decomposition. | `split`, `sweep`, `evolve`, `expire`, `atomize` | Too large for first pass. Use after smaller fixtures prove the harness. |
| `NPC-FIX-007` | LangGraph ETL graph | workflow | `C:/Users/User/3klife-npc-brain/langgraph_app/etl_graph.py` | Validates that ATM can describe and test graph-shaped workflow boundaries. | `compose`, `polymorphize`, `evolve` | Use local graph state fixtures only; do not require LangSmith or external services for first verification. |

## Recommended first fixture pack

| Pack | Included candidates | Rationale |
|---|---|---|
| `npc-brain-parser-pack` | `NPC-FIX-001` | Fast, deterministic, no network, minimal rollback risk |
| `npc-brain-service-helper-pack` | `NPC-FIX-002`, `NPC-FIX-003` | Validates service boundaries and polymorphic adapters without full FastAPI startup |
| `npc-brain-workflow-pack` | `NPC-FIX-004`, `NPC-FIX-005` | Covers governance workflow and map-like graph composition |

## AST inventory transcript

The baseline scan parsed Python files without executing them. Top candidates by size and governance relevance:

```text
TOTAL_PY 105
pipelines/sanguo-rag/run_full_roster_convergence_loop.py: 4680 lines, cli/file-io/json/artifact pipeline
app/npc_dialogue_service.py: 4576 lines, service/file-io/json/artifact/vector
pipelines/sanguo-rag/run_progress_advancement_loop.py: 3246 lines, cli/file-io/json/artifact pipeline
pipelines/sanguo-rag/validate_sanguo_governance.py: 1991 lines, cli/file-io/json/vector pipeline
pipelines/sanguo-rag/build_relationship_claim_graph.py: 1974 lines, cli/file-io/json/artifact pipeline
pipelines/sanguo-rag/run_resolution_loop.py: 1290 lines, cli/file-io/json/network/artifact pipeline
pipelines/sanguo-rag/clean_and_split.py: 464 lines, cli/file-io/json/artifact pipeline
app/evidence_resolver.py: service helper
app/vector_store.py: service/vector adapter
langgraph_app/etl_graph.py: workflow/langgraph
```

## Function anchors

| Candidate | Useful anchors |
|---|---|
| `clean_and_split.py` | `parse_args` line 85, `clean_text` line 161, `split_chapters` line 192, `main` line 376 |
| `evidence_resolver.py` | `EvidenceResolver` line 22, `resolve` line 27, `_resolve_from_story_beats` line 114, `_resolve_from_ready_events` line 152 |
| `vector_store.py` | `VectorStoreAdapter` line 78, `SQLiteVecStubAdapter` line 111, `PineconeVectorStore` line 150, `load_vector_store` line 451 |
| `run_resolution_loop.py` | `apply_resolution_loop_governance` line 50, `parse_args` line 145, `main` line 1195 |
| `build_relationship_claim_graph.py` | `parse_args` line 96, `apply_relationship_runtime_canon_policy` line 126, `main` line 1843 |
| `run_full_roster_convergence_loop.py` | `apply_full_roster_runner_governance` line 46, `parse_args` line 3798, `main` line 4018 |
| `etl_graph.py` | `SanguoETLState` line 37, `load_completion_summary` line 88, `graph` line 428 |
