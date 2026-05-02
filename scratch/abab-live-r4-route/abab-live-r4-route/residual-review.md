# Sanguo RAG Residual Review Dossier

- Run ID: `abab-live-r4-route`
- Generated At: `2026-05-02T04:55:31+00:00`
- A Rounds: `1`
- AB Cycles Executed: `1`
- Pending Review Count: `10`
- Pilot Pending Review Count: `4`
- Total Delta Overall: `0.17`
- Stop Reason: `review-batch-ready`
- canonicalWrites: `False`

## Executive Summary

本 dossier 由 progress advancement controller 產生，用於整理 ABAB 輪巡後仍需 B/C 階段處理的問題。

## Root Cause Counts

- `identity ambiguity`: `6`
- `location gap`: `0`
- `relationship edge/type`: `0`
- `event boundary`: `4`
- `missing source evidence`: `0`
- `schema/tool gap`: `0`
- `external source needed`: `0`

## Repeated Residuals

| General | Event Key | Candidate ID | Repeat Count | Root Cause | Suggested Action |
|---|---|---|---:|---|---|
| - | - | - | 0 | - | No repeated residual reached the configured repeat limit. |

## identity ambiguity

- Count in current repeated residual set: `6`
- No repeated residual item reached the emit threshold for this group.

## location gap

- Count in current repeated residual set: `0`
- No repeated residual item reached the emit threshold for this group.

## relationship edge/type

- Count in current repeated residual set: `0`
- No repeated residual item reached the emit threshold for this group.

## event boundary

- Count in current repeated residual set: `4`
- No repeated residual item reached the emit threshold for this group.

## missing source evidence

- Count in current repeated residual set: `0`
- No repeated residual item reached the emit threshold for this group.

## schema/tool gap

- Count in current repeated residual set: `0`
- No repeated residual item reached the emit threshold for this group.

## external source needed

- Count in current repeated residual set: `0`
- No repeated residual item reached the emit threshold for this group.

## Commands

- Round 1: `/home/eagl/.venv/3klife-etl/bin/python /mnt/c/Users/User/3KLife/server/npc-brain/pipelines/sanguo-rag/run_repair_review_campaign.py --round-id abab-live-r4-route-a1 --edit-backlog artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/repair-refine-r1-reviewed-b-edit-backlog.jsonl --base-events artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/repair-review-r1-merged-staged-ready-events.jsonl --base-relationship-evidence artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/repair-review-r1-merged-staged-relationship-evidence.jsonl --base-progress artifacts/data-pipeline/sanguo-rag/extracted/knowledge-growth-progress/repair-review-r1-merged.json --repair-output-root scratch/abab-live-r4-route/abab-live-r4-route/repair-review/backlog-repair-tasks --rounds-root scratch/abab-live-r4-route/abab-live-r4-route/repair-review/knowledge-growth-rounds --event-seed-root scratch/abab-live-r4-route/abab-live-r4-route/repair-review/event-question-seeds --packet-root scratch/abab-live-r4-route/abab-live-r4-route/repair-review/source-event-packets --progress-root scratch/abab-live-r4-route/abab-live-r4-route/repair-review/knowledge-growth-progress --top-generals 5 --top-per-general 5 --reviewer-preset agent --reviewer-provider agent-reviewer --step-timeout-seconds 30 --overwrite`

## Recommended Next Actions

- [ ] 若 pending review 仍高，先處理最新的 B review batch，再繼續 A。
- [ ] 若 repeated residual 已命中上限，先調 extractor/rule 或人工收斂，不要直接多跑一輪 A。
- [ ] 若 missing source evidence 或 external source needed 佔比高，改開查證/規則修補任務。
- [ ] canonical promotion 仍需獨立人工 gate，不與本 controller 自動綁定。
