---
task_id: TASK-SKL-0015
title: Entry skill governance-flow backwrite
status: planned
milestone: P1
depends_on:
  - TASK-SKL-0005
  - TASK-SKL-0007
  - TASK-SKL-0014
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
related_plan: docs/ai_atomic_framework/skl-tool-first-upgrade/SKL-tool-first-upgrade-plan.md
scopePaths:
  - "templates/skills/atm-governance-router.skill.md"
  - "templates/skills/atm-next.skill.md"
  - "templates/skills/atm-dispatch.skill.md"
  - "templates/skills/atm-handoff.skill.md"
  - "templates/skills/atm-evidence.skill.md"
  - "integrations/codex-skills/atm-governance-router/**"
  - "integrations/codex-skills/atm-next/**"
  - "integrations/codex-skills/atm-dispatch/**"
  - "integrations/codex-skills/atm-handoff/**"
  - "integrations/codex-skills/atm-evidence/**"
  - ".agents/skills/atm-governance-router/**"
  - ".agents/skills/atm-next/**"
  - ".agents/skills/atm-dispatch/**"
  - ".agents/skills/atm-handoff/**"
  - ".agents/skills/atm-evidence/**"
  - ".claude/skills/atm-governance-router/**"
  - ".claude/skills/atm-next/**"
  - ".claude/skills/atm-dispatch/**"
  - ".claude/skills/atm-handoff/**"
  - ".claude/skills/atm-evidence/**"
  - ".cursor/rules/skills/atm-governance-router/**"
  - ".cursor/rules/skills/atm-next/**"
  - ".cursor/rules/skills/atm-dispatch/**"
  - ".cursor/rules/skills/atm-handoff/**"
  - ".cursor/rules/skills/atm-evidence/**"
  - ".github/instructions/atm-governance-router.instructions.md"
  - ".github/instructions/atm-next.instructions.md"
  - ".github/instructions/atm-dispatch.instructions.md"
  - ".github/instructions/atm-handoff.instructions.md"
  - ".github/instructions/atm-evidence.instructions.md"
  - ".gemini/commands/atm-governance-router.toml"
  - ".gemini/commands/atm-next.toml"
  - ".gemini/commands/atm-dispatch.toml"
  - ".gemini/commands/atm-handoff.toml"
  - ".gemini/commands/atm-evidence.toml"
  - "GEMINI.md"
  - "scripts/validate-skill-templates.ts"
  - "tests/cli/integration-skill-template-sync.test.ts"
deliverables:
  - "templates/skills/atm-governance-router.skill.md"
  - "templates/skills/atm-next.skill.md"
  - "templates/skills/atm-dispatch.skill.md"
  - "templates/skills/atm-handoff.skill.md"
  - "templates/skills/atm-evidence.skill.md"
  - "integrations/codex-skills/atm-governance-router/**"
  - ".agents/skills/atm-governance-router/**"
  - ".claude/skills/atm-governance-router/**"
  - ".cursor/rules/skills/atm-governance-router/**"
  - ".github/instructions/atm-governance-router.instructions.md"
  - ".gemini/commands/atm-governance-router.toml"
  - "GEMINI.md"
  - "tests/cli/integration-skill-template-sync.test.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "npm run validate:skill-templates"
  - "node atm.mjs integration verify codex --json"
  - "node atm.mjs integration verify claude-code --json"
  - "node atm.mjs integration verify cursor --json"
  - "node atm.mjs integration verify copilot --json"
  - "node atm.mjs integration verify gemini --json"
  - "node atm.mjs integration verify antigravity --json"
  - "git diff --check"
evidence:
  required: command-backed
producer:
  - "2026-07-20 review of C:/Users/User/3KLife/docs/ai_atomic_framework/governance-optimization/ATM-GOV-2.0-2.1-captain-handoff-2026-07-20.md"
  - "ATM 2.0/2.1 v2.2 closure amendment and INV-ATM-008 dogfood findings"
consumer:
  - "All future Captain, dispatch, handoff, evidence, and governance-router entry work"
  - "ATM-GOV-0222 managed plan executor and first-layer UX"
  - "TASK-SKL-0014 framework temp claim tool-first route"
missingData:
  - "This card is authored from a planning review; implementation must re-run source and installed skill inventory at claim time because installed adapters may drift."
dataDrivenStopRule:
  - "Stop if the change requires hard-coded card ids, actor ids, queue names, local paths, dates, or historical commit shas in reusable skill text."
  - "Stop if the proposed text duplicates task-specific 2.0/2.1 handoff state instead of promoting stable governance rules."
  - "Stop if source skill templates cannot be identified; direct-only edits to installed skill copies are not acceptable."
  - "Stop if any editor projection cannot be regenerated or verified from the source template."
rollback:
  strategy: revert-commit
  notes: "Revert the source skill-template changes, regenerated integration projections, and template-sync tests if the backwrite over-constrains ordinary non-Captain work or creates a second lifecycle model."
atomizationImpact:
  ownerAtomOrMap: "atm.agent-skills"
  mapUpdates:
    - "atm.agent-skills"
    - "atm.integration-adapters"
  extractionCandidates:
    - atom: "atm.entry-skill-governance-flow"
      pattern: "Stable skill contract and checklist"
      source: "templates/skills"
      disposition: "extract"
      inlineReason: null
    - atom: "atm.skill-template-sync-guard"
      pattern: "Template-to-installed-copy drift guard"
      source: "scripts/validate-skill-templates.ts"
      disposition: "follow-up-card"
      inlineReason: null
out_of_scope:
  - "Do not rewrite the whole governance router into a monolithic handbook."
  - "Do not copy 0196-0215 task status, commit shas, dirty worktree state, or local handoff chronology into reusable skills."
  - "Do not change ATM runtime semantics, broker policy, ticket state, claim lifecycle, or taskflow close behavior in this card."
  - "Do not create a second task model, second playbook registry, or per-skill private error-code table."
nonGoals:
  - "No implementation of ATM-GOV-0215 through ATM-GOV-0225."
  - "No replacement for TASK-ERR-0002 error and recovery contract."
  - "No queue/composer/circuit-breaker policy implementation."
---

# TASK-SKL-0015

## Goal

Promote the reusable governance-flow lessons from the 2026-07-20 ATM 2.0/2.1
Captain handoff into ATM's entry skills, without copying task-specific history
or turning the router into a second lifecycle engine.

The target outcome is that a fresh Captain, dispatcher, handoff writer, or
evidence operator sees the stable rules before it starts work:

- perform the ATM `next` preflight and respect `evidence.nextAction.playbook`;
- resolve actor identity before claim, checkpoint, commit, or close authority;
- record an opening data-driven decision and a close-time telemetry check;
- evaluate every touched shared-write gate against `INV-ATM-008`;
- use generalized, data-driven repairs rather than hard-coded actor/task/path
  cases;
- run frozen runner build and frozen smoke when runner, release, broker, or
  shared-write entry behavior is touched;
- route new dogfood friction into backlog or shared learning references instead
  of leaving it only in chat.

## Why This Is A Skill Card

The source handoff contains two kinds of information:

1. durable governance rules that should guide every future agent; and
2. historical 2.0/2.1 state such as task order, dirty release residue, specific
   cards, commit shas, and temporary recommendations.

Only the first category belongs in reusable skills. This card exists to make
that boundary explicit and to force the update through the SKL source-template
and projection path rather than direct installed-copy edits.

## Required Backwrite

Update the source-of-truth skill templates first. Installed copies under Codex,
Claude Code, Cursor, Copilot, Gemini, and Antigravity are generated or projected
artifacts and must be refreshed from the same source.

At minimum, the reusable text must cover these stable contracts:

1. Per-card opening record: consumed sealed summaries, missing data, assumption
   changes, stop rule, and whether this card touches a shared-write gate.
2. `INV-ATM-008` shared-write check: do not normalize a coordinatable shared
   write into a bare refusal; preserve the ladder from parallel-safe through
   compose, steward publish, queue ticket, and true hard refusal.
3. Generalized repair and data-driven policy: do not hard-code task ids, actor
   ids, queue names, dates, local absolute paths, or one incident's error
   string.
4. Close-time observability check: require window, watermark, counters,
   duration/timing, source availability, compact digest, and explicit
   unavailable receipts where data is missing.
5. Frozen runner behavior verification: source tests alone are insufficient
   when runner, release, broker shared-write behavior, first-layer entry
   behavior, or generated integration output changes.
6. Backlog and learning-loop promotion: mature patterns may be promoted into
   `SKILL.md`; one-off incident details remain in references, backlog, or task
   evidence.

## Acceptance

- The implementation identifies the source-of-truth skill templates for the ATM
  entry path and updates those templates first.
- The governance-router remains thin: it points agents to `next`, playbook, and
  specialist skills instead of embedding a full taskflow manual.
- The durable checklist appears in the appropriate entry or specialist skill
  surface so Captain, dispatch, handoff, evidence, and first-layer governance
  work consume the same rule set.
- Installed editor copies are regenerated or otherwise proven byte-consistent
  with the source template projection contract.
- No reusable skill text includes historical 2.0/2.1 card status, dirty
  worktree residue, local-only commit shas, actor ids, queue ids, or date-bound
  operational instructions except as cited source evidence in a reference file.
- A regression test or validator proves source template and installed copies do
  not drift for the updated skill surfaces.
- Validation includes `validate:skill-templates`, all installed adapter
  verifications listed in this card, and `git diff --check`.

## Evidence Required

- Command output showing the source-template files changed before generated or
  installed copies.
- Template or adapter verification receipts for every installed editor adapter
  touched by this card.
- A short before/after inventory that names which rules from the handoff were
  promoted, which were rejected as historical/task-specific, and why.
- Frozen runner smoke evidence if the implementation touches runner, release,
  broker shared-write behavior, first-layer entry behavior, or generated
  integration output.

## Notes For Implementers

This card deliberately follows `INV-ATM-009`: the helper content must be generic
and data-driven. Do not encode the 2026-07-20 incident as a magic exception.
Encode the reusable governance test that correctly explains it.
