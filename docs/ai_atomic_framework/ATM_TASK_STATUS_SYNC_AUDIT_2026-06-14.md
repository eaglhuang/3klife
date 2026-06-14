# ATM Task Status Sync Audit - 2026-06-14

Owner: ATM Captain
Scope: Team Agents, MAO, RFT
Mode: internal sidecar read-only audit plus Captain reconciliation

## Rule

AI-Atomic-Framework `.atm/history/tasks/*.json` is closure authority for target-repo work. 3KLife Markdown task cards are planning mirrors. When the two disagree, do not restart a task from Markdown alone; check the ATM ledger and closure packet first.

## Team Agents

Sidecar summary:

- Markdown cards: 28
- ATM ledger task files: 5
- Closure packets: 5

Corrected in this pass:

- `TASK-TEAM-0002`: Markdown `planned` -> `done`
  - closedAt: `2026-06-05T15:38:04.542Z`
  - closurePacket: `.atm/history/evidence/TASK-TEAM-0002.closure-packet.json`
- `TASK-TEAM-0007`: Markdown `planned` -> `done`
  - closedAt: `2026-06-10T12:28:06.128Z`
  - closurePacket: `.atm/history/evidence/TASK-TEAM-0007.closure-packet.json`

Already synced / confirmed:

- `TASK-TEAM-0003`: Markdown and ledger both `done`
- `TASK-TEAM-0008`: sidecar reported synced `done`
- `TASK-TEAM-0027`: sidecar reported synced `done`

Open anomaly:

- `TASK-TEAM-0028`: Markdown says `done`, but no target ledger task file or closure packet was found under AI-Atomic-Framework. This needs Captain裁決 before using it as hard prerequisite evidence.
- `TASK-TEAM-0001`: Markdown says `done`, ledger missing. This is acceptable because it is planning-repo closure authority, not target-repo closure.

## MAO

Corrected in this pass:

- `TASK-MAO-0001`: Markdown `planned` -> `done`
  - closedAt: `2026-06-14T11:22:06.854Z`
  - closurePacket: `.atm/history/evidence/TASK-MAO-0001.closure-packet.json`
- `TASK-MAO-0002`: Markdown `planned` -> `done`
  - closedAt: `2026-06-14T11:28:41.469Z`
  - closurePacket: `.atm/history/evidence/TASK-MAO-0002.closure-packet.json`
- `TASK-MAO-0003`: Markdown `planned` -> `done`
  - closedAt: `2026-06-14T11:39:13.318Z`
  - closurePacket: `.atm/history/evidence/TASK-MAO-0003.closure-packet.json`
- `TASK-MAO-0011`: Markdown `planned` -> `done`
  - closedAt: `2026-06-14T10:43:36.575Z`
  - closurePacket: `.atm/history/evidence/TASK-MAO-0011.closure-packet.json`
- `TASK-MAO-0012`: Markdown `planned` -> `done`
  - closedAt: `2026-06-14T10:48:16.048Z`
  - closurePacket: `.atm/history/evidence/TASK-MAO-0012.closure-packet.json`
- `TASK-MAO-0013`: Markdown `planned` -> `done`
  - closedAt: `2026-06-14T10:56:17.882Z`
  - closurePacket: `.atm/history/evidence/TASK-MAO-0013.closure-packet.json`

Left as Markdown-only planned:

- `TASK-MAO-0004` through `TASK-MAO-0010`
- `TASK-MAO-0014` through `TASK-MAO-0022`

Reason: these cards have no ledger task file yet. They should be imported/claimed through ATM only when selected for execution.

## RFT

Sidecar summary:

- Markdown cards: 8
- ATM ledger task files: 0
- Closure packets: 0

Decision:

- Keep `TASK-RFT-0001` through `TASK-RFT-0008` as Markdown-only `planned` until a specific RFT task is selected.
- Before any RFT implementation, run `node atm.mjs tasks import --from <card> --write --json` if ATM requires import, then route/claim with `node atm.mjs next --claim ...`.
- For the current Captain sequence, `TASK-RFT-0008` is the first planned RFT insertion, but write/claim should wait until `TASK-TEAM-0004` closes unless Captain explicitly opens the RFT interleave window.

## Follow-Up Items

- Add or run a planning-status sync checker so stale Markdown mirrors are caught before sequencing decisions.
- Resolve `TASK-TEAM-0028`: either locate/import the missing target ledger closure evidence, or mark the planning card as requiring reconciliation instead of using it as closed target evidence.
- When opening `TASK-RFT-0008`, import only the selected RFT card rather than bulk-importing all RFT tasks into the active ledger.

