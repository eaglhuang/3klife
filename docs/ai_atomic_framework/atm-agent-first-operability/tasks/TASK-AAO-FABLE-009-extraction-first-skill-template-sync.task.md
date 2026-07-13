---
task_id: TASK-AAO-FABLE-009
title: "Sync extraction-first contract into source skill templates"
status: done
owner: claude-fable-5
priority: P1
milestone: Backlog-P1
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "templates/skills/atm-task-card-authoring.skill.md"
  - "templates/skills/atm-atom-map-refactor.skill.md"
deliverables:
  - "templates/skills/atm-task-card-authoring.skill.md"
  - "templates/skills/atm-atom-map-refactor.skill.md"
validators:
  - "git diff --check"
  - "npm run typecheck"
  - "npm run validate:skill-templates"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert template text; installed copies in adopter repos are unaffected until their next reinstall."
atomizationImpact:
  ownerAtomOrMap: "atm.agent-skills"
  extractionCandidates:
    - atom: "atm.skill-template-source"
      pattern: "inline"
      source: "templates/skills/atm-task-card-authoring.skill.md"
      disposition: "inline"
      inlineReason: "Documentation-only sync of TASK-AAO-FABLE-006 contract text into the template sources; no code boundary involved."
completed_at: "2026-07-13T13:04:49.825Z"
completed_by_agent: "claude-fable-5"
closedAt: "2026-07-13T13:04:49.825Z"
closedByActor: "claude-fable-5"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-13T13-04-49-825Z-close-5d246900c543"
lastTransitionAt: "2026-07-13T13:04:49.825Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "140f05f7031b16038d537ac58e5ca5dbc7b69589"
---

# TASK-AAO-FABLE-009 Extraction-first skill template sync

TASK-AAO-FABLE-006 wrote the extraction-first contract
(`atomizationImpact.extractionCandidates`, >600-line trigger, human-approved
`inline` with recorded reason) into `.agents/skills/` — but those are the
INSTALLED copies. The distribution sources under `templates/skills/*.skill.md`
(what `integration add <vendor>` expands into every adopter repo) contain
none of it, so no reinstall can ever deliver the contract, and AAF's own
installed copies are now newer than their templates (a future reinstall would
wash the contract away).

## Acceptance

- `templates/skills/atm-task-card-authoring.skill.md` carries the same
  extraction-first authoring rules and `extractionCandidates` example as the
  installed `.agents/skills/atm-task-card-authoring/SKILL.md`.
- `templates/skills/atm-atom-map-refactor.skill.md` carries the widened
  trigger (any card touching a >600-line governance module) and the
  extraction-proposal framing.
- `npm run validate:skill-templates` passes.
- Installed copy vs template drift for these two skills is eliminated
  (content-equivalent modulo template frontmatter schema).
