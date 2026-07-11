---
doc_id: doc_team_handoff_2026_07_11_task_team_0053
owner: Project Captain
status: active-continuation
created_at: 2026-07-11
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
priority: P0
next_task: TASK-TEAM-0053
---

# Captain Handoff - TASK-TEAM-0053 Gemini Direct Continuation

This is the handoff for the next Captain thread. Read this first, then route
through ATM before editing.

## Current Objective

Priority task: `TASK-TEAM-0053 Gemini direct API bridge for Team provider matrix`.

User goal: use `TASK-TEAM-0053` itself as the dogfood proof. The next Captain
should first open the largest governed Team (`L5`) with independent OpenAI and
Anthropic direct API bots assigned to different roles, then use that team to
help implement Gemini Direct API. This proves OpenAI and Anthropic direct bots
can already cooperate on one task card before Gemini is added to the same clean
provider matrix.

After `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and `GEMINI_API_KEY` are present
locally, prove that Team Agents can instantiate independent vendor bots and
cooperate on one task card:

1. OpenAI-only direct API bots.
2. Anthropic-only direct API bots.
3. Gemini-direct-only direct API bots.
4. Mixed OpenAI + Anthropic + Gemini direct API bots in one Team run.
5. One role blocked by `broker-conflict-blocked` while the other roles proceed.

Do not use live paid APIs in CI. CI/deterministic validators must use injected
fake executors. The OpenAI + Anthropic `L5 --execute` run is a manual live
dogfood smoke test; it may incur API cost and must record only redacted
evidence.

## Repositories

- Target repo: `C:\Users\User\AI-Atomic-Framework`
- Planning repo: `C:\Users\User\3KLife`
- Current target branch at handoff: `codex/backlog-closeout`
- Current planning branch at handoff: `master`

Both repos were clean at the end of the previous turn except that 3KLife has a
known background/tool tendency to rewrite broker evidence scan timestamps:

- `docs/ai_atomic_framework/CID-Conflict-Run-Log.md`
- `docs/ai_atomic_framework/broker-collision-evidence/broker-run-index.json`
- `docs/ai_atomic_framework/broker-collision-evidence/broker-run-report.md`

If these three files are dirty and only timestamps changed, restore them. Do
not commit timestamp-only broker scan residue.

## Required First Commands

From `C:\Users\User\AI-Atomic-Framework`:

```powershell
Get-Content README.md -TotalCount 80
node atm.mjs next --prompt "Continue TASK-TEAM-0053 Gemini direct API bridge and prepare the vendor bot cooperation test matrix" --json
```

ATM currently resolves this to a normal single-task route and says the planning
card is not yet imported into the target ledger. The first governed action is:

```powershell
node atm.mjs tasks import --from "../3KLife/docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0053-gemini-direct-api-bridge.task.md" --write --json
```

Then use the returned playbook. Expected claim shape:

```powershell
node atm.mjs next --claim --actor <your-actor-id> --task TASK-TEAM-0053 --auto-intent --json
```

Resolve your own actor identity before claiming or committing. Do not inherit a
previous actor identity from this handoff.

## OpenAI + Anthropic L5 Dogfood Flow

After import and claim, run a non-executing plan first:

```powershell
node atm.mjs team plan --task TASK-TEAM-0053 --team-size L5 --json
```

Then start a maximum team with explicit OpenAI and Anthropic role assignments.
Use this as a live smoke test that the two already-implemented direct providers
can spawn independent bots and cooperate on `TASK-TEAM-0053`.

Recommended role split:

- `implementer` -> OpenAI
- `validator` -> Anthropic
- `reviewer` -> Anthropic
- `reader` -> OpenAI
- `evidence-collector` -> OpenAI
- `scope-guardian` -> Anthropic
- `lieutenant` -> OpenAI or Anthropic, whichever plan output supports cleanly

Suggested command shape:

```powershell
node atm.mjs team start --task TASK-TEAM-0053 --actor <your-actor-id> --team-size L5 --execute `
  --role-provider implementer=openai:gpt-5-mini:responses:real-agent `
  --role-provider validator=anthropic:claude-3-5-sonnet:anthropic-messages:real-agent `
  --role-provider reviewer=anthropic:claude-3-5-sonnet:anthropic-messages:real-agent `
  --role-provider reader=openai:gpt-5-mini:responses:real-agent `
  --role-provider evidence-collector=openai:gpt-5-mini:responses:real-agent `
  --role-provider scope-guardian=anthropic:claude-3-5-sonnet:anthropic-messages:real-agent `
  --json
```

If the CLI rejects a role name or provider tuple, do not force runtime edits.
Adjust the command to the role names shown by `team plan --team-size L5` and
record the mismatch in the ATM bug backlog if it is confusing or blocks the
dogfood run.

This live dogfood is not a replacement for deterministic validators. Treat it
as evidence that OpenAI and Anthropic direct provider credentials and bot
session creation work. Keep Coordinator/Captain authority intact: spawned bots
may assist with implementation and evidence, but they must not self-close,
self-commit, or bypass broker gates.

## Files To Read Before Editing

Planning context:

- `C:\Users\User\3KLife\docs\ai_atomic_framework\team-agents\tasks\TASK-TEAM-0053-gemini-direct-api-bridge.task.md`
- `C:\Users\User\3KLife\docs\ai_atomic_framework\team-agents\TEAM-BROKER-ENFORCEMENT-INTEGRATION-PLAN-2026-07-10.md`
- `C:\Users\User\3KLife\docs\ai_atomic_framework\team-agents\TEAM-AGENTS-VOCABULARY-CANON-AND-REPLAN-2026-07-10.md`
- `C:\Users\User\3KLife\docs\ai_atomic_framework\team-agents\團隊自動化代理分工計畫.md`

Target implementation references:

- `C:\Users\User\AI-Atomic-Framework\agent-integrations\vendors\team-secrets.example.json`
- `C:\Users\User\AI-Atomic-Framework\docs\governance\team-agents\team-vendor-runtime.md`
- `C:\Users\User\AI-Atomic-Framework\packages\core\src\team-runtime\provider-contract.ts`
- `C:\Users\User\AI-Atomic-Framework\packages\core\src\team-runtime\provider-selection.ts`
- `C:\Users\User\AI-Atomic-Framework\packages\core\src\team-runtime\providers\openai.ts`
- `C:\Users\User\AI-Atomic-Framework\packages\core\src\team-runtime\providers\anthropic.ts`
- `C:\Users\User\AI-Atomic-Framework\packages\core\src\team-runtime\providers\gemini.ts`
- `C:\Users\User\AI-Atomic-Framework\packages\cli\src\commands\team.ts`
- `C:\Users\User\AI-Atomic-Framework\packages\cli\src\commands\integration.ts`
- `C:\Users\User\AI-Atomic-Framework\scripts\validate-team-agents.ts`

## Current Local Secrets Status

Local secrets file exists and is ignored by git:

```text
C:\Users\User\AI-Atomic-Framework\agent-integrations\vendors\team-secrets.local.json
```

The user has entered:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`

The previous Captain verified `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` were
non-empty in the local secrets file. The user later stated `GEMINI_API_KEY` was
also entered. Recheck presence only; never print raw values.

Safe check pattern:

```powershell
node -e "const fs=require('fs'); const p='agent-integrations/vendors/team-secrets.local.json'; const j=JSON.parse(fs.readFileSync(p,'utf8')); const has=(v)=>typeof v==='string'&&v.trim().length>0; console.log(JSON.stringify({openai:has(j.providers?.openai?.OPENAI_API_KEY),anthropic:has(j.providers?.anthropic?.ANTHROPIC_API_KEY),gemini:has(j.providers?.['gemini-direct']?.GEMINI_API_KEY)||has(j.providers?.gemini?.GEMINI_API_KEY)}));"
```

Do not commit `team-secrets.local.json` or any backup containing raw secrets.

## Implementation Direction

The existing `gemini` bridge is a CLI/editor-subagent bridge from
`TASK-TEAM-0043`. Keep it intact.

For `TASK-TEAM-0053`, add a direct API bridge. Preferred design:

- Provider id: `gemini-direct`
- Config schema: `atm.geminiDirectTeamProviderConfig.v1`
- Required fields:
  - `providerId`
  - `sdkId`
  - `modelId`
  - `apiKeyEnvVar`, default reference `GEMINI_API_KEY`
  - optional base URL env var if supported
- New source file:
  - `packages/core/src/team-runtime/providers/gemini-direct.ts`

Wire discovery and selection so the runtime can distinguish:

- `gemini` = Gemini CLI/editor-subagent bridge
- `gemini-direct` = Gemini API direct bridge

Do not create ambiguity by overloading `gemini` unless the code and docs remain
crystal clear.

## Required Deliverables

From the task card:

- `agent-integrations/vendors/team-secrets.example.json`
- `docs/governance/team-agents/team-vendor-runtime.md`
- `packages/core/src/team-runtime/provider-contract.ts`
- `packages/core/src/team-runtime/provider-selection.ts`
- `packages/core/src/team-runtime/providers/gemini-direct.ts`
- `packages/cli/src/commands/integration.ts`
- `packages/cli/src/commands/team.ts`
- `scripts/validate-team-agents.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

Expected example secrets addition:

```json
"gemini-direct": {
  "GEMINI_API_KEY": ""
}
```

Only placeholders in tracked files. No raw secrets.

## Required Validators

Minimum commands from `TASK-TEAM-0053`:

```powershell
npm run typecheck
node --strip-types scripts/validate-team-agents.ts --case gemini-direct-api-bridge
node --strip-types scripts/validate-team-agents.ts --case team-vendor-local-secrets
node --strip-types scripts/validate-team-agents.ts --case heterogeneous-multi-bot-team-run
npm run validate:team-agents
git diff --check
```

If source changes affect frozen runner behavior, run:

```powershell
$env:ATM_RETAIN_RELEASE_ARTIFACTS='1'; npm run build
node atm.mjs doctor --json
```

Use `node atm.dev.mjs` only for source-first validation before the build. Normal
governance commands should use `node atm.mjs`.

## Desired Test Matrix

Run the OpenAI + Anthropic `L5 --execute` dogfood early, after import/claim and
before implementing Gemini Direct. It should prove two live direct providers can
create independent bot sessions for the same task. Then add deterministic/fake
executor coverage for the full provider matrix:

1. Live smoke: OpenAI + Anthropic L5 team cooperates on `TASK-TEAM-0053`, with
   redacted evidence only.
2. `openai` direct API only: multiple roles, distinct session IDs.
3. `anthropic` direct API only: multiple roles, distinct session IDs.
4. `gemini-direct` direct API only: multiple roles, distinct session IDs.
5. Mixed direct API run:
   - implementer: `openai`
   - reviewer or reader: `anthropic`
   - validator: `gemini-direct`
6. Mixed conflict run:
   - one role emits/receives `broker-conflict-blocked`
   - other roles complete
   - observability records provider, role, artifact, decision fields

Session IDs should preserve the existing convention:

```text
task:role:provider:model
```

or the already implemented equivalent used by the provider orchestration layer.

## Governance Vocabulary To Preserve

Use the canonical shared vocabulary:

- `decisionClass`
- `decisionReason`
- `violationStatus`
- `broker-conflict-blocked`

Canonical decision class values:

- `auto-execution`
- `human-signoff-required`
- `adr-required`
- `blocked`

Canonical violation status values:

- `none`
- `human-signoff-required`
- `adr-required`
- `blocked`
- `broker-conflict-blocked`

Do not regress to `allowed`, `escalated`, or `policy-blocked`.

## Known Recent Commits

Target repo `AI-Atomic-Framework`:

- `4d8e9c33 fix: align Team Agents governance closeout`
- `38fdb423 feat: add Team vendor local secrets loader`

Planning repo `3KLife`:

- `4aa0deb4 Add Gemini direct API bridge task card`
- `ef7fdf96 Clean Team Agents planning residue`

The planning repo is clean after `ef7fdf96`. The target repo was clean on
`codex/backlog-closeout` at handoff.

## Boundaries And Do-Not-Touch

- Do not commit local API keys.
- Do not edit `.atm/runtime/**` manually.
- Do not reuse `TASK-TEAM-0042/0043/0044`; those are closed/semantic history.
- Do not change the existing Gemini CLI bridge semantics while implementing
  Gemini direct API.
- Do not touch RFT mailbox split paths or unrelated Cursor WIP.
- Do not treat PowerShell mojibake output as file corruption. Node UTF-8 checks
  showed the planning docs and `docs/keep.summary.md` are valid UTF-8.
- If a bug, workflow snag, or confusing blocker appears, update the ATM backlog
  per `atm-bug-backlog` before or during closeout.

## Suggested First Live-Read Summary For Next Captain

Say this at the start of the next thread:

```text
I am continuing TASK-TEAM-0053. I will first import the 3KLife planning card into
the AI-Atomic-Framework target ledger, claim it with my own actor id, run an
OpenAI + Anthropic L5 `--execute` dogfood smoke test with redacted evidence,
then implement the Gemini direct API bridge as a separate `gemini-direct`
surface. I will keep all API keys local and untracked, and prove the full
OpenAI / Anthropic / Gemini provider matrix with fake executors before treating
the task as complete.
```
