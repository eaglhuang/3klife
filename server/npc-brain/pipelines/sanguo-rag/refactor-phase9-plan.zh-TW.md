<!-- doc_id: doc_server_pipeline_0019 -->
# NPC-brain / Sanguo-RAG Phase 9 Runtime General Profile Governance

## Summary

Phase 9 externalizes deterministic runtime profile export governance from `export_general_runtime_profile.py` without changing legacy CLI defaults or runtime profile output schema.

## Slices

- Slice 1: labels and voice presets.
- Slice 2: relationship and keyword governance.

## Test Plan

- py_compile for exporter, loader, validator.
- governance validator dry-run summary includes Phase 9 counts.
- smoke regression compares persona, keywords, relationships, and summary markdown while ignoring generatedAt/output path text.
- missing governance override paths fail fast without Python traceback.
