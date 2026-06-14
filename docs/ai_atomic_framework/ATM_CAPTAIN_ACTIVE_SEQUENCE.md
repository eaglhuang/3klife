# ATM Captain Active Sequence

Created: 2026-06-14
Owner: ATM Captain
Status: active

## Current Ruling

The Team Agents lane remains the product priority. RFT is interleaved only as a risk-reduction lane and must not eclipse Team Agents.

Important correction: `TASK-TEAM-0002` is already closed in the AI-Atomic-Framework ATM ledger:

- Closed at: 2026-06-05T15:38:04.542Z
- Closure packet: `.atm/history/evidence/TASK-TEAM-0002.closure-packet.json`
- Captain implication: do not restart `TASK-TEAM-0002`; use it as completed prerequisite evidence.

`TASK-TEAM-0003` is also closed in the AI-Atomic-Framework ATM ledger:

- Closed at: 2026-06-05T14:22:47.414Z
- Closure packet: `.atm/history/evidence/TASK-TEAM-0003.closure-packet.json`
- Captain implication: `TASK-TEAM-0004` may enter Phase 1 once dirty-tree scope is clean.

## Execution Order

0. Status sync checkpoint
   - Done for 2026-06-14 Team/MAO/RFT audit.
   - Report: `C:/Users/User/3KLife/docs/ai_atomic_framework/ATM_TASK_STATUS_SYNC_AUDIT_2026-06-14.md`
   - Open anomaly: `TASK-TEAM-0028` says done in Markdown but target ledger closure evidence is missing.

1. `TASK-TEAM-0004` - Team brief/report templates
   - Status: next active implementation target.
   - Reason: M2 synchronization point after the minimal crew contract and atomization role.
   - ATM route: ready.
   - Claim command:
     ```powershell
     node atm.mjs next --claim --actor <id> --prompt "TASK-TEAM-0004 Team brief report templates" --json
     ```

2. `TASK-TEAM-0005` and `TASK-TEAM-0006`
   - Status: run after `TASK-TEAM-0004`.
   - Reason: they extend the shared template validator and complete the 90-minute first-card promise artifacts.
   - Coordination: may be prepared in parallel, but merge sequentially because both extend `scripts/validate-team-agents-templates.ts`.

3. `TASK-RFT-0008`
   - Status: first RFT insertion after Team template base is stable; RFT task card is Markdown-only planned until import/claim time.
   - Reason: smallest RFT card; locks taskflow commit-message behavior and adds a size tripwire before heavier lifecycle work.
   - ATM route: ready.
   - Claim command:
     ```powershell
     node atm.mjs next --claim --actor <id> --prompt "TASK-RFT-0008 taskflow size tripwire and commit message Strategy Map" --json
     ```

4. `TASK-RFT-0003`
   - Status: run before Team runtime cards.
   - Reason: framework-development temp-claim lifecycle is high-risk and should be simplified before `TASK-TEAM-0011+` runtime work.

5. `TASK-RFT-0001`
   - Status: defer until `TASK-TEAM-0015`.
   - Reason: it touches `next.ts`; do it when Team recommendation integration actually needs that surface.

## Dispatch Modes

- Internal sidecar: read-only verification, scope checks, card readiness, condition review, and post-report review.
- External dispatch: allowed for `TASK-TEAM-0004` and `TASK-RFT-0008` only with strict allowed files and forbidden files.
- External write remains forbidden outside the explicit task allowed files.
- No external agent may edit `C:/Users/User/3KLife/**` during target-repo implementation.
- No agent may manually edit `.atm/runtime/**` or `.atm/history/**`; ATM CLI owns lifecycle state.

## Model Budget Policy

- Internal sidecars and read-only preflight agents should use the cheapest capable lane, normally `GPT-5.4-mini`.
- External worker agents should default to `GPT-5.4-mini` for bounded implementation tasks with strict allowed files.
- Upgrade an external worker to `GPT-5.4` only when the task has higher reasoning risk: core lifecycle changes, shared-file refactors, cross-module behavior preservation, failing validator diagnosis, or complex merge/closeout integration.
- Do not use a frontier/expensive model for routine template, documentation, status sync, grep, or preflight work.

## Active Dispatch Queue

| Slot | Task | Mode | Action | Gate |
|---|---|---|---|---|
| 1 | `TASK-TEAM-0004` | External builder allowed | Implement templates + validator | `next --claim` succeeds and repo dirty tree is scoped |
| 2 | `TASK-TEAM-0005` | External builder allowed after 0004 | Add decision/memory templates | 0004 closed |
| 3 | `TASK-TEAM-0006` | External builder allowed after 0004 | Add patrol template | 0004 closed; merge sequentially with 0005 |
| 4 | `TASK-RFT-0008` | External builder allowed after 0004 base | Add taskflow commit-message Strategy Map + size tripwire | 0004 closed or Captain explicitly opens RFT interleave window |
| 5 | `TASK-RFT-0003` | Captain-reviewed implementation | Simplify framework-development lifecycle surface | Before Team runtime |
| 6 | `TASK-RFT-0001` | Defer | next.ts extraction | Only when `TASK-TEAM-0015` starts |

## Condition Review Checklist

- The agent read `README.md` and ran `node atm.mjs next --prompt "<task prompt>" --json`.
- The selected task id matches the intended task.
- The agent uses `node atm.mjs next --claim --actor <id> --prompt "<task prompt>" --json`; no manual reserve/promote/claim loop.
- Source edits stay inside `targetAllowedFiles`.
- `C:/Users/User/3KLife/**` remains untouched by target-repo builders.
- Validators are command-backed and recorded as evidence.
- `tasks close` succeeds before the delivery commit.
- If `ATM_RUNNER_SYNC_REQUIRED` appears, run `npm run build` and rerun frozen `node atm.mjs`; do not switch to `atm.dev.mjs` to bypass.
- `TASK-TEAM-0004` Phase 1 must mirror the existing 3KLife template drafts under `C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/templates/`; builders may read them but must not edit 3KLife.
- `TASK-RFT-0008` external work may begin as preflight immediately, but write/claim should wait until `TASK-TEAM-0004` closes unless Captain explicitly opens the RFT interleave window.
