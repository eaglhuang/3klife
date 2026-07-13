---
task_id: TASK-AAO-FABLE-010
title: "Detect drift between source skill templates and installed .agents/skills copies"
status: planned
owner: claude-fable-5
priority: P2
milestone: Backlog-P1
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "scripts/validate-skill-templates.ts"
  - "packages/integrations-core/src/compiler/compile.ts"
deliverables:
  - "scripts/validate-skill-templates.ts"
validators:
  - "git diff --check"
  - "npm run typecheck"
  - "npm run validate:skill-templates"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the added drift check; existing template-internal validation is unaffected."
atomizationImpact:
  ownerAtomOrMap: "atm.agent-skills"
  extractionCandidates:
    - atom: "atm.skill-template-drift-check"
      pattern: "Result Contract Object"
      source: "scripts/validate-skill-templates.ts"
      disposition: "follow-up-card"
      inlineReason: null
---

# TASK-AAO-FABLE-010 Skill template vs installed-copy drift detection

Discovered during TASK-AAO-FABLE-009: `templates/skills/*.skill.md` are the
distribution sources compiled via
`packageModule.compileSkillTemplatesForAdapter('claude-code', ...)`
(`packages/integrations-core/src/compiler/compile.ts`, output path
`${id}/SKILL.md`), but AAF's own `.agents/skills/<id>/SKILL.md` dogfood
copies are not wired to that compiler — they can silently diverge from their
template source (as FABLE-006 did until FABLE-009 caught it manually).
`npm run validate:skill-templates` only checks template-internal validity
(schema, adapter compiler counts), never installed-vs-template drift.

## Acceptance

- A new drift check compiles each template through
  `compileSkillTemplatesForAdapter('claude-code', ...)` and compares the
  result (normalized: trailing whitespace, `{{CHARTER_INVARIANTS}}` expansion
  placeholder) against the corresponding `.agents/skills/<id>/SKILL.md` when
  that installed copy exists in this repo.
- Report drift as an advisory finding (does not fail `validate:skill-templates`
  by default — this is a self-hosting dogfood check, not a hard release gate)
  naming the diverging template id and a short diff summary.
- A regression proves: matching content → no finding; deliberately diverged
  content → exactly one finding naming the id.
- Document the check's scope limit: only compares templates that have a
  corresponding installed copy in `.agents/skills/`; templates with no local
  install are silently skipped (not every template is dogfooded in AAF
  itself).
