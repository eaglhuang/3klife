<!-- doc_id: doc_server_pipeline_0061 -->
# NPC-brain / Sanguo-RAG Phase 49 Plan: Primary Text Relationship Type Refinement

## Summary

Phase 48 proved that primary-text extraction can add quote / locator / textHash evidence, but most new overlay edges stayed at the broad `relationship_external` type. That blocked A-canon promotion because the claim graph requires concrete relationship types such as `ruler_subject`, `enemy_rival`, `spouse`, `parent_child`, `sibling`, `patron_client`, and `alliance_oath`.

Phase 49 fixes that bottleneck. It loads relationship refinement governance by default, adds readable primary-text cue terms, repairs the claim graph pair-relation cue fallback, and reruns the top-20 primary-canon gap queue with local 30-page primary harvests instead of the previous 5-page sample.

## Key Changes

- `relationship_type_refinement.py` now loads governance rules before refining relationship type or resolving type family.
- `rule-relationship-type-refinement.jsonl` keeps existing rows and adds readable primary-text cue terms for conflict, spouse, parent/child, sibling, sworn sibling, patron/client, ruler/subject, mentor/student, alliance, and betrayal/surrender.
- `build_relationship_claim_graph.py` now has readable fallback pair-relation cue regexes, so external primary-text edges can satisfy the A-history / A-romance promotion gate.
- The execution run used local 30-page harvests for Sanguozhi, Houhanshu, Zizhitongjian, and Sanguo Yanyi.

## R2 Execution Notes

- Extracted primary-text seeds: 6391.
- Promoted candidate evidence cards: 1921.
- Refined relationship overlay edges: 603.
- Remaining generic `relationship_external` edges: 28.
- Merged relationship evidence rows: 684.
- Relationship claims: 2228 -> 2450 (+222).
- A-history claims: 289 -> 293 (+4).
- A-romance claims: 68 -> 188 (+120).
- A-canon claims: 357 -> 481 (+124).
- Knowledge completion: 51.50% baseline -> 54.71% (+3.21pp).
- Core person completion average: 59.42% baseline -> 80.77% (+21.35pp).

## Test Plan

- `python -m py_compile` for relationship refinement, external overlay, and claim graph.
- Primary-text extraction / scoring / promote / overlay rerun for top-20 gap queue.
- Relationship claim graph rebuilt with base + refined primary-text overlay evidence.
- Knowledge completion and core person completion recalculated.
- `validate_sanguo_governance.py --dry-run-report`.
- `git diff --check` and UTF-8 / BOM / U+FFFD guard.

## Assumptions

- This phase is deterministic-only and does not use LLM review.
- New evidence remains review/source-grounded artifact data and keeps `canonicalWrites=false`.
- The current local harvest is still not full-book ingestion; it is a larger 30-page primary-text sample. Full-book ingestion remains the next major scale-up.
