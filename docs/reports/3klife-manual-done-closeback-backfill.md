# 3KLife manual done closeback backfill

TASK-CID-0125 backfilled historical close provenance for planning cards reported as `ATM_TASK_AUDIT_MANUAL_DONE`. The repair is provenance-only: affected cards remain `status: done`, and implementation files were not changed.

## Source policy

- No affected card had existing completion metadata, so each timestamp and delivery commit comes from the last git commit that touched that card.
- Actor falls back to `historical-backfill` when no card actor metadata exists.

## Backfilled tasks

| Task | Timestamp | Actor | Source commit | Event |
| --- | --- | --- | --- | --- |
| TASK-ASP-0001 | 2026-06-11T11:02:34+08:00 | historical-backfill | f40917f9ebe6961f8cb56ed13a0c16d9389e43ff | .atm/history/task-events/TASK-ASP-0001/2026-06-11T11-02-34+08-00-close-1a06c9e4d3b6.json |
| TASK-ASP-0002 | 2026-06-11T11:02:34+08:00 | historical-backfill | f40917f9ebe6961f8cb56ed13a0c16d9389e43ff | .atm/history/task-events/TASK-ASP-0002/2026-06-11T11-02-34+08-00-close-251fd15b14e0.json |
| TASK-ASP-0003 | 2026-06-11T11:02:34+08:00 | historical-backfill | f40917f9ebe6961f8cb56ed13a0c16d9389e43ff | .atm/history/task-events/TASK-ASP-0003/2026-06-11T11-02-34+08-00-close-83d88b829f04.json |
| TASK-ASP-0004 | 2026-06-11T11:02:34+08:00 | historical-backfill | f40917f9ebe6961f8cb56ed13a0c16d9389e43ff | .atm/history/task-events/TASK-ASP-0004/2026-06-11T11-02-34+08-00-close-79e41a45b8ed.json |
| TASK-AAO-0108 | 2026-06-07T23:12:15+08:00 | historical-backfill | 343ce28f884ce0aa4d7ff45704601c7024f19581 | .atm/history/task-events/TASK-AAO-0108/2026-06-07T23-12-15+08-00-close-6413f8faad0d.json |

## Verification

Run `node scripts/validate-manual-done-zero.cjs`. It must report `MANUAL_DONE=0`; warning-only historical audit buckets may remain.
