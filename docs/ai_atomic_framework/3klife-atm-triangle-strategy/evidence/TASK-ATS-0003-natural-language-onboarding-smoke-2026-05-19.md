---
doc_id: doc_other_0271
task_id: TASK-ATS-0003
title: TASK-ATS-0003 natural-language onboarding smoke evidence
owner: atm-core
status: completed
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex
---

# TASK-ATS-0003 natural-language onboarding smoke evidence

## Scenario

User prompt in a fresh Codex conversation:

```text
請幫我看看目前專案的資料管線進度已經進行到哪裡了?
```

The prompt intentionally did not mention ATM, `AGENTS.md`, `README.md`, `atm.mjs`, or any governance rule.

## Observed behavior

- Codex announced a pre-flight check and read project entry information.
- Codex attempted to read `docs/keep.summary.md`; the file was not present, and it continued rather than blocking.
- Codex ran `node atm.mjs next --json`.
- ATM returned an onboarding refresh route.
- Codex ran `node atm.mjs atm-chart render --cwd . --json`.
- Codex returned to the original data-pipeline progress request and summarized current project progress.

## User-visible result summary

The final condensed Codex answer reported that the data pipeline is no longer in the skeleton-building phase. It is in the middle/late phase of content expansion, residual repair, and canonical publication governance. Reported highlights included:

- overall knowledge completion: 54.71%
- top-10 near average completion: 80.77%
- `pipelineReliability = 100%`
- identity baseline: 601 seed people, 21166 parsed mentions, 109 unresolved, 642 review pending
- persona/runtime: 235 persona cards, 50 runtime general profiles
- API/vector readiness: 9 pass / 1 warn
- ready events: 6 ready events, with eventQuestionCoverage at 21.65%
- suggested next route: focus on residual dossier work and ready event promotion

## Assessment

M2 official onboarding smoke is a partial pass.

Pass conditions met:

- Natural-language black-box entry works.
- Agent discovered ATM routing without being prompted.
- Agent executed the ATM onboarding refresh command.
- Agent resumed the original user request after onboarding.

Remaining gaps:

- ATM first-use / welcome notice was not prominent enough in the user-facing answer.
- The current npc-brain root README / AGENTS entry still uses the older wording and should be refreshed to include `ATM_USER_NOTICE` / `evidence.userNotice` display rules.

## Next test

Re-run the same style of black-box prompt after refreshing npc-brain with the latest pinned runner and entry text. The next run should visibly satisfy all three checks:

- show ATM welcome/user notice naturally
- run `node atm.mjs next --json` and the returned route
- return to the original user request