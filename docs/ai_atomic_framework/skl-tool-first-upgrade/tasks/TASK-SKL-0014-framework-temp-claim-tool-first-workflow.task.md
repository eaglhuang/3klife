---
task_id: TASK-SKL-0014
title: Framework temp claim tool-first workflow and skill route
status: planned
milestone: P1
depends_on:
  - TASK-SKL-0002
  - TASK-SKL-0003
  - TASK-SKL-0005
  - TASK-SKL-0013
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "templates/skills/**"
  - ".agents/skills/**"
  - ".claude/skills/**"
  - ".cursor/rules/skills/**"
  - ".github/instructions/**"
  - ".gemini/commands/**"
  - "integrations/codex-skills/**"
  - "packages/cli/src/commands/**"
  - "packages/cli/src/framework/**"
  - "docs/governance/**"
  - "scripts/validate-skill-templates.ts"
deliverables:
  - "templates/skills/**"
  - ".agents/skills/**"
  - ".claude/skills/**"
  - ".cursor/rules/skills/**"
  - ".github/instructions/**"
  - ".gemini/commands/**"
  - "integrations/codex-skills/**"
  - "packages/cli/src/commands/**"
  - "packages/cli/src/framework/**"
  - "docs/governance/**"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "npm run validate:skill-templates"
  - "git diff --check"
evidence:
  required: command-backed
producer:
  - "ATM-GOV-0196 sealed summary, after closeout"
  - "2026-07-20 dogfood finding: framework temp claim currently lacks a dedicated skill/tool-first operator path"
consumer:
  - "Future framework quickfix lanes"
  - "Runner sync / release-artifact governance"
  - "SKL tool-first migration cards"
  - "ATM error-code resolver recovery routes"
missingData:
  - "ATM-GOV-0196 is not yet sealed in the target ledger at authoring time; final dogfood must consume its sealed summary."
  - "Current framework ledger recovery WIP must not be bypassed by this card."
dataDrivenStopRule:
  - "Stop and request owner revision if framework-mode status/claim, runner-sync queue reservation, or governed commit blockers cannot be represented as structured tool/playbook results."
  - "Stop if implementation requires hard-coded task ids, actor names, branch names, or fixture-only strings instead of deriving state from CLI/tool output."
  - "Stop if the proposed skill path duplicates the entire ATM lifecycle instead of routing through ATM next/playbook/tools."
rollback:
  strategy: revert-commit
  notes: "Revert the framework-temp-claim skill route, generated integration projections, and any CLI/tool surface changes if the path creates a second lifecycle model or weakens fail-closed governance."
atomizationImpact:
  ownerAtomOrMap: "atm.skill-framework-temp-claim"
  mapUpdates:
    - "atm.agent-skills"
    - "atm.framework-development"
  extractionCandidates:
    - atom: "atm.framework-temp-claim-skill"
      pattern: "Specialist skill route"
      source: "templates/skills"
      disposition: "extract"
      inlineReason: null
    - atom: "atm.framework-temp-claim-tool-surface"
      pattern: "Tool-first wrapper over framework-mode status/claim and guarded release"
      source: "packages/cli/src"
      disposition: "extract"
      inlineReason: null
out_of_scope:
  - "Do not replace normal ATM task claim when a governed task route is available."
  - "Do not authorize emergency ledger recovery or cross-task history mutation without explicit owner approval."
  - "Do not hand-edit generated integration copies without changing the source skill template and regeneration path."
  - "Do not remove CLI fallback for legacy editors."
nonGoals:
  - "No remote broker or hosted service migration in this card."
  - "No full rewrite of the SKL tool bridge."
  - "No hard-coded recovery for ATM-GOV-0196 or any one incident."
---

# TASK-SKL-0014

## Goal

Add a first-class, friendly AI route for framework temporary-claim quickfix work.
The route must behave like ordinary ATM governance from the agent's point of
view: enter through a specialist skill, prefer structured tools/playbook
surfaces when available, and fall back to explicit CLI commands only when the
tool surface is unavailable or returns a structured blocker.

This card is opened because dogfood around `ATM-GOV-0196` showed that framework
quickfix work currently depends on scattered prose and raw
`framework-mode status/claim` CLI snippets. That is too sharp-edged for agents:
it makes framework temp claim feel like a private shortcut instead of a governed
ATM lane.

## Current Finding

Existing ATM skills mention framework-mode in fragments:

- `atm-next` tells agents to inspect `framework-mode status` and claim when a
  framework run exists.
- `atm-governance-router` warns not to mix framework-mode claims with normal
  governance work.
- `atm-internal-build-sync` references framework-mode status and
  framework-development guards for release syncing.

Those fragments are useful but incomplete. They do not provide a dedicated
skill-first operator path that covers:

1. capability detection;
2. `next` / playbook entry;
3. framework temp claim status and acquisition;
4. normal task claim vs temp claim decision;
5. runner-sync queue-head reservation;
6. governed commit boundaries;
7. release / rollback / recovery;
8. error-code routing through the shared resolver.

## Required Design

Implement a reusable specialist route, tentatively named
`atm-framework-temp-claim`, or an equivalent source-template route if the
implementation chooses to fold it into an existing specialist skill. The route
must preserve these layers:

```text
skill intent -> tool/playbook surface -> CLI fallback -> structured evidence
```

The skill must not become a second scheduler. Lifecycle authority remains with
ATM `next`, framework-mode claim state, guard output, taskflow, governed commit,
and batch/checkpoint rules.

## Acceptance

- A source skill-template route exists for framework temp claim quickfix work and
  is projected into supported editor integrations.
- Tool-capable environments use structured tool/playbook calls first for:
  - `next` / current route inspection;
  - `framework-mode status`;
  - `framework-mode claim`;
  - framework-development guard;
  - runner-sync queue-head reservation when release artifacts are involved;
  - governed commit and release/cleanup.
- CLI fallback is explicit, copy-paste friendly, and only used when the tool
  surface is unavailable or intentionally degraded.
- The route clearly distinguishes:
  - normal ATM task claim;
  - framework temp claim;
  - emergency ledger/history recovery;
  - runner-sync release-artifact work.
- The route routes `ATM_*` blockers through `atm-error-code-resolver` instead of
  maintaining a private error table.
- The route is generic and data-driven: it derives task id, actor, scope,
  runner-sync state, branch, dirty files, and blocker decisions from tool/CLI
  output, not hard-coded card ids or incident strings.
- The route fails closed when it detects cross-task `.atm/history/**` mutation,
  missing queue-head reservation, foreign active claims, stale release
  artifacts, or unsealed upstream summaries.
- The implementation consumes the sealed `ATM-GOV-0196` summary before final
  validation, then dogfoods the new route against a synthetic or real framework
  quickfix and records the comparison with the old raw-CLI path.
- Documentation explains when agents should use this route and when they must
  stay on ordinary ATM governance.

## Missing-data Handling

- If `ATM-GOV-0196` is not yet sealed, implementation may build the generic
  route but must not claim final dogfood acceptance.
- If target ledger recovery is still dirty, do not import, close, or commit
  framework history files as part of this card unless a separate owner-approved
  emergency recovery lane authorizes it.
- If tool bridge support is incomplete, the card may ship a staged source skill
  plus explicit CLI fallback only if the missing tool work is recorded as a
  structured follow-up blocker.

## Data-driven Stop Rule

Stop and request owner revision if the implementation needs to:

- hard-code `ATM-GOV-0196`, a specific branch, actor id, or runner-sync batch id;
- bypass `next`, playbook, framework-mode, guard, taskflow, or governed commit;
- treat raw CLI output as success without sealed evidence or machine-readable
  result fields;
- downgrade a P0 governance blocker into a local shell workaround.

## Verification

```bash
npm run typecheck
npm run validate:cli
npm run validate:skill-templates
git diff --check
```

Additional evidence:

- Dry-run or unit evidence showing the skill route selects normal ATM task claim
  when a governed task exists.
- Dry-run or unit evidence showing the skill route selects framework temp claim
  only when the work is a scoped framework quickfix.
- Dogfood note after `ATM-GOV-0196` closeout comparing old raw-CLI framework
  temp claim flow with the new skill/tool-first flow.

## Notes

- This is a SKL lane card because the defect is not only CLI behavior; it is an
  agent-facing skill/tool usability gap.
- The fix should be generalized. The purpose is not to encode today's 0196
  incident, but to make the next framework quickfix boring and safe.
