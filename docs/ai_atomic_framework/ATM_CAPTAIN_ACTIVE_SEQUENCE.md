# ATM Captain Active Sequence

Created: 2026-06-14
Owner: ATM Captain
Status: active

## Current Ruling

The Team Agents lane remains the product priority. RFT is interleaved only as a risk-reduction lane and must not eclipse Team Agents.

Immediate-use ruling: Team Agents is now usable in Captain-led semi-automated mode. Use `team-agents/TEAM_AGENTS_CAPTAIN_LED_SOP.md` for real dispatch until full `team start` / runtime orchestration is implemented.

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
   - Status: done in target repo.
   - Reason: M2 synchronization point after the minimal crew contract and atomization role.
   - ATM route: ready.
   - Claim command:
     ```powershell
     node atm.mjs next --claim --actor <id> --prompt "TASK-TEAM-0004 Team brief report templates" --json
     ```

2. `TASK-TEAM-0005` and `TASK-TEAM-0006`
   - Status: done in target repo.
   - Reason: they extend the shared template validator and complete the 90-minute first-card promise artifacts.
   - Coordination: may be prepared in parallel, but merge sequentially because both extend `scripts/validate-team-agents-templates.ts`.

3. `TASK-RFT-0008`
   - Status: done in target repo.
   - Reason: smallest RFT card; locks taskflow commit-message behavior and adds a size tripwire before heavier lifecycle work.
   - Delivery commit: `56413eea628c5078675aa877e052f474143d5729`
   - Closure commit: `16feaf01552ab171f555f96451a8c0e6ede3c638`
   - Runner sync commit: `637cfcb87d57c1290e7cafaf1993fbe9f98d54e3`
   - Team Agents dogfood: `team-71c0d5c2fd25`

4. `TASK-TEAM-0017`
   - Status: done in target repo.
   - Reason: formalizes the Team template schema and validator contract after M2 templates and RFT-0008 risk reduction.
   - Delivery commit: `4497fb169b9d5d5de66bdf48e50afa7ec1d11c44`
   - Closure commit: `1b95f9e90cd8936bd506cd34d874d1e8d1ce3ca1`
   - Runner sync commit: `19e03e1c114ee3ebafd19c46e0492e5021a93250`
   - Closure packet: `.atm/history/evidence/TASK-TEAM-0017.closure-packet.json`
   - Note: closed through human-approved emergency backend close because closeback evidence / transition event sequencing formed a closure cycle.

5. `TASK-RFT-0003`
   - Status: done in target repo.
   - Reason: framework-development temp-claim lifecycle risk was retired by the RFT closure; do not re-dispatch this card.

6. `TASK-RFT-0001`
   - Status: done in target repo.
   - Reason: the original `next.ts` extraction card is closed; any new Team recommendation integration work must open a new scoped card.

## Dispatch Modes

- Internal sidecar: read-only verification, scope checks, card readiness, condition review, and post-report review.
- External dispatch: allowed for one explicit task card at a time when Captain has run exact route/import/claim setup and pushed the setup commit.
- External write remains forbidden outside the explicit task allowed files.
- No external agent may edit `C:/Users/User/3KLife/**` during target-repo implementation.
- No agent may manually edit `.atm/runtime/**` or `.atm/history/**`; ATM CLI owns lifecycle state.
- Normal external workers must not modify `release/**`; if `ATM_RUNNER_SYNC_REQUIRED` appears, they HOLD and Captain/Runner Sync Steward handles build and runner output commit separately.

## Model Budget Policy

- Internal sidecars and read-only preflight agents should use the cheapest capable lane, normally `GPT-5.4-mini`.
- External worker agents should default to `GPT-5.4-mini` for bounded implementation tasks with strict allowed files.
- Upgrade an external worker to `GPT-5.4` only when the task has higher reasoning risk: core lifecycle changes, shared-file refactors, cross-module behavior preservation, failing validator diagnosis, or complex merge/closeout integration.
- Do not use a frontier/expensive model for routine template, documentation, status sync, grep, or preflight work.

## Active Dispatch Queue

| Slot | Task | Mode | Action | Gate |
|---|---|---|---|---|
| 1 | `TASK-TEAM-0004` | Done | Implement templates + validator | Closed in target repo |
| 2 | `TASK-TEAM-0005` | Done | Add decision/memory templates | Closed in target repo |
| 3 | `TASK-TEAM-0006` | Done | Add patrol template | Closed in target repo; runner sync separated |
| 4 | `TASK-RFT-0008` | Done | Add taskflow commit-message Strategy Map + size tripwire | Closed in target repo; runner sync separated |
| 5 | `TASK-TEAM-0017` | Done | Formalize template schema / validator contract | Closed in target repo; runner sync separated |
| 6 | `TASK-RFT-0003` | Done | Simplify framework-development lifecycle surface | Closed in target repo |
| 7 | `TASK-RFT-0001` | Done | next.ts extraction | Closed in target repo |

## Condition Review Checklist

- The agent read `README.md` and ran `node atm.mjs next --prompt "<task prompt>" --json`.
- The selected task id matches the intended task.
- The agent uses `node atm.mjs next --claim --actor <id> --prompt "<task prompt>" --json`; no manual reserve/promote/claim loop.
- Source edits stay inside `targetAllowedFiles`.
- `C:/Users/User/3KLife/**` remains untouched by target-repo builders.
- Validators are command-backed and recorded as evidence.
- `tasks close` succeeds before the delivery commit.
- If `ATM_RUNNER_SYNC_REQUIRED` appears, run `npm run build` and rerun frozen `node atm.mjs`; do not switch to `atm.dev.mjs` to bypass.
- If a normal worker sees `ATM_RUNNER_SYNC_REQUIRED`, the worker must HOLD and report. Captain/Runner Sync Steward performs the build and commits `release/**` separately.
- `TASK-TEAM-0004` Phase 1 must mirror the existing 3KLife template drafts under `C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/templates/`; builders may read them but must not edit 3KLife.
- RFT cards in this sequence are closed in the target ledger. Do not reopen or re-dispatch them; open a new scoped card for any follow-up.
