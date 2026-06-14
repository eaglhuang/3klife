# TASK-TEAM-0004 External Dispatch Brief

Dispatch date: 2026-06-14
From: ATM Captain
Target repo: `C:/Users/User/AI-Atomic-Framework`
Planning repo: `C:/Users/User/3KLife`
Mode: external builder, strict allowed files

## Mission

Implement `TASK-TEAM-0004` as the Team Agents M2 synchronization point: create the `team-brief`, `agent-report`, and `team-summary` Markdown templates plus deterministic validation.

Prerequisites confirmed by Captain:

- `TASK-TEAM-0002` is closed in the ATM ledger with closure packet `.atm/history/evidence/TASK-TEAM-0002.closure-packet.json`.
- `TASK-TEAM-0003` is closed in the ATM ledger with closure packet `.atm/history/evidence/TASK-TEAM-0003.closure-packet.json`.
- Existing 3KLife template drafts are available for read-only reference under `C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/templates/`.

## Required First Commands

```powershell
cd C:\Users\User\AI-Atomic-Framework
Get-Content -Raw README.md
node atm.mjs next --prompt "TASK-TEAM-0004 Team brief report templates" --json
node atm.mjs next --claim --actor <agent-id> --prompt "TASK-TEAM-0004 Team brief report templates" --json
```

If claim fails or routes to any task other than `TASK-TEAM-0004`, stop and report HOLD.

Before writing, read these 3KLife drafts as references only:

- `C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/templates/team-brief.md`
- `C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/templates/agent-report.md`
- `C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/templates/team-summary.md`

## Allowed Files

- `docs/governance/team-agents/templates/team-brief-template.md`
- `docs/governance/team-agents/templates/agent-report-template.md`
- `docs/governance/team-agents/templates/team-summary-template.md`
- `scripts/validate-team-agents-templates.ts`
- `package.json`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`
- ATM CLI-managed closure/evidence files for `TASK-TEAM-0004` only, after deliverables and validators pass.

## Forbidden Scope

- Do not edit `C:/Users/User/3KLife/**`.
- Do not edit `.atm/runtime/**`.
- Do not manually edit `.atm/history/**`; use ATM CLI for claim, evidence, and close.
- Do not spawn subagents or implement Team runtime.
- Do not change task close, batch checkpoint, or runner sync semantics.
- Do not invent a new template contract if the existing 3KLife drafts already define the section intent.

## Acceptance Points

- `team-brief` includes goal, roles, allowed files, do-not-touch paths, assigned work, expected report, stop conditions, and Atomization Plan.
- `agent-report` includes role, status, files read, files changed, commands run, findings, blockers, and recommendation.
- `team-summary` includes decision, implementation summary, validators, evidence, risk, and close-ready state.
- Validator fails when a required section is missing.
- Templates remain readable plain Markdown.

## Validators

```powershell
npm run typecheck
node --strip-types scripts/validate-team-agents-templates.ts --task TASK-TEAM-0004
git diff --check
```

Close only after real deliverables exist and validators pass:

```powershell
node atm.mjs tasks close --task TASK-TEAM-0004 --actor <agent-id> --status done --json
```

## Report Back

- Claim result and selected task id.
- Files changed.
- Validator commands and pass/fail.
- Evidence/close result.
- Commit SHA.
- Scope drift: expected answer is none.
