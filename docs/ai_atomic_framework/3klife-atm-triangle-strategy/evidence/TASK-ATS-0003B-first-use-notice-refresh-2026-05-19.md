---
doc_id: doc_other_0272
task_id: TASK-ATS-0003B
title: TASK-ATS-0003B first-use notice refresh evidence
owner: atm-core
status: completed
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex
---

# TASK-ATS-0003B first-use notice refresh evidence

## Scope

Refresh `C:/Users/User/3klife-npc-brain` with the latest ATM first-use notice contract.

## Commands

```powershell
npm run build
node C:\Users\User\AI-Atomic-Framework\release\atm-onefile\atm.mjs bootstrap --cwd C:\Users\User\3klife-npc-brain --task "Bootstrap ATM in 3klife-npc-brain" --force --json
node atm.mjs next --json
```

The final command was executed from `C:/Users/User/3klife-npc-brain`.

## Results

- `npm run build`: pass
- `bootstrap --force`: pass
- `pinnedRunner.status`: `replaced`
- new runner sha256: `0b314599d03c863545e20612372de096bf0462392d3c4798760c924157212a81`
- previous runner sha256: `26e77aefd857500acc0e2bfec2e7b72d9cbaf4f016130106ad218c9f1a69e801`
- root README contains `ATM_USER_NOTICE` and `evidence.userNotice` rules
- root AGENTS contains `ATM_USER_NOTICE`, `evidence.userNotice`, missing-document fallback, and original-request resumption rules

## `next --json` verification

`node atm.mjs next --json` returned a non-ready onboarding route, as expected before ATMChart refresh:

- message code: `ATM_USER_NOTICE`
- `evidence.userNotice.schemaVersion`: `atm.userNotice.v0.1`
- `evidence.userNotice.mustShowBeforeAction`: `true`
- `evidence.nextAction.status`: `needs-onboarding-refresh`
- `evidence.nextAction.command`: `node atm.mjs atm-chart render --cwd . --json`
- `evidence.nextAction.afterNextAction`: `After this onboarding refresh succeeds, return to the user original request and continue the actual work.`

## Assessment

TASK-ATS-0003B is complete. The next validation should be a fresh Codex black-box conversation using a natural-language request with no ATM hint.