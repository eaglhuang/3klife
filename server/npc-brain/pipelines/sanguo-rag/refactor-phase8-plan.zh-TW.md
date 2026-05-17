<!-- doc_id: doc_server_pipeline_0018 -->
# NPC-brain / Sanguo-RAG ??????????Review Context ? External Source Governance ???

??????? event review context ? external source benchmark ? deterministic governance?

## Slice 2：Event Review Context Governance

本片將 `enrich_event_review_context.py` 的 deterministic review context cue 與小型 policy 移到 governance data。Python 保留 prompt bundle、reviewer adapter、answer sanitization、Markdown rendering 與 JSONL mirror 行為；治理資料只承接 cue table、allowed answers、brotherhood ids、single-character alias allowlist 與 review-only canonical write guard。

驗收邊界：`--prompt-only` 仍只輸出 bundle 與 bundle questions JSONL；指定不存在 policy/rule path 時必須 fail-fast 且不印 traceback。
