---
task_id: ATM-GOV-0392
title: Make skill template source discovery fail closed and trackable
status: planned
owner: claude-008
priority: P0
depends_on: []
causalGraph:
  changedPublicSeams:
    - skill-template-corpus-discovery
    - skill-template-validation-contract
  causalImpactEdges:
    - source-template-path -> corpus-snapshot -> adapter-bake -> installed-skill
    - malformed-or-untracked-source -> explicit-fail-closed-diagnostic
  parallelFrontierInputs:
    - ATM-GOV-0391 runner publication is unrelated and must not be touched
  validatorReferences:
    - tests/cli/skill-corpus-canary-rewrite.test.ts
    - npm run validate:skill-templates
  phaseOwner: Wave-1-framework-foundation
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - templates/skills/atm-framework-quickfix.skill.md
  - .claude/skills/atm-framework-quickfix/SKILL.md
  - packages/integrations-core/src/compiler/skill-templates.ts
  - scripts/audit-skill-corpus.ts
  - scripts/validate-skill-templates.ts
  - tests/cli/skill-corpus-canary-rewrite.test.ts
  - tests/cli/skill-definition-vnext.test.ts
deliverables:
  - templates/skills/atm-framework-quickfix.skill.md
  - .claude/skills/atm-framework-quickfix/SKILL.md
  - packages/integrations-core/src/compiler/skill-templates.ts
  - scripts/audit-skill-corpus.ts
  - scripts/validate-skill-templates.ts
  - tests/cli/skill-corpus-canary-rewrite.test.ts
validators:
  - node --strip-types tests/cli/skill-corpus-canary-rewrite.test.ts
  - node --strip-types tests/cli/skill-definition-vnext.test.ts
  - npm run validate:skill-templates
  - node atm.mjs integration add claude-code --force --json
  - node atm.mjs integration verify claude-code --json
testContributions:
  - caseId: skill_template_source_discovery_fail_closed_0392
    targetGroupId: null
    semanticKey: malformed-template-is-not-silently-ignored
    coversAcceptance: [ACC-1, ACC-2, ACC-4]
    coversImpactEdges: [source-template-path -> corpus-snapshot -> adapter-bake -> installed-skill, malformed-or-untracked-source -> explicit-fail-closed-diagnostic]
    expectedRedPredicate: a malformed discovered template is reported as a validation failure, not omitted from the corpus
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: skill-template-corpus-discovery
    resourceKey: null
  - caseId: skill_template_bake_source_parity_0392
    targetGroupId: null
    semanticKey: canonical-template-bakes-to-derived-skill
    coversAcceptance: [ACC-3, ACC-5]
    coversImpactEdges: [source-template-path -> corpus-snapshot -> adapter-bake -> installed-skill]
    expectedRedPredicate: a corpus member missing required source identity cannot produce a green adapter verification
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: skill-template-validation-contract
    resourceKey: null
requiredTestCaseIds:
  - skill_template_source_discovery_fail_closed_0392
  - skill_template_bake_source_parity_0392
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - expand-contract
atomizationImpact:
  ownerAtomOrMap: atm.integration-skill-template-corpus
  mapUpdates: []
  extractionCandidates:
    - atom: atm.integration-skill-template-corpus
      pattern: Policy Object
      source: packages/integrations-core/src/compiler/skill-templates.ts
      disposition: inline
      inlineReason: Existing compiler module is below the extraction threshold; retain one discovery-and-diagnostic boundary rather than create a second corpus authority.
errorCodes: []
createdByCommand: atm plan card create
---

# ATM-GOV-0392 Make skill template source discovery fail closed and trackable

## Intent

Repair the general source-authority failure revealed by `atm-framework-quickfix`: a file that looks like a source skill template may be silently omitted when its frontmatter is malformed, while a local `.git/info/exclude` rule can make that source invisible to version control and review. The corpus, validator, and adapter bake must share one discoverable source set. This card must not special-case a skill id, task id, file name, or local workstation path.

Planning authority: `C:/Users/User/3KLife/docs/ai_atomic_framework`.
Target authority and closure authority: `C:/Users/User/AI-Atomic-Framework`.

Before implementation, remove only the local `templates/` exclusion from `.git/info/exclude`; retain the generated-artifact exclusions for `integrations/` and `release/`. Do not commit the local exclude file, use `git add -f`, or commit a derived `.claude/skills/**` copy without its source template.

## Acceptance

- [ ] ACC-1: Every discovered `templates/skills/*.skill.md` candidate either becomes a valid `atm.skillTemplate` corpus member or causes `validate:skill-templates` to fail with its source path and missing/invalid contract fields. It must never be silently counted only in `ignoredSourceTemplatePaths` while the validator reports success.
- [ ] ACC-2: `templates/skills/atm-framework-quickfix.skill.md` uses the canonical `atm.skillTemplate` frontmatter and is present in the corpus. Its existing body remains byte-identical apart from any mechanically required template interpolation normalization.
- [ ] ACC-3: A forced Claude adapter bake derives `.claude/skills/atm-framework-quickfix/SKILL.md` from the tracked canonical template. `integration verify claude-code` passes, and the baked skill body matches the canonical `.agents` skill body.
- [ ] ACC-4: Regression coverage proves both malformed-template rejection and valid-template bake parity without relying on a local `.git/info/exclude` configuration, a hardcoded skill filename, or a manually copied derived artifact.
- [ ] ACC-5: The worker records two backlog outcomes through the official backlog route: (a) silent malformed-template omission, fixed by this card; (b) local excludes hiding source templates, dispositioned with a general discoverability guard or an explicitly scoped successor. Do not duplicate an existing item; update it when one already exists.

## Constraints

- Preserve the single template corpus as the only authority; installed copies are derived outputs.
- No runner build, runner-sync enqueue, release mirror write, or taskflow work unrelated to this card. This is Tier 1 source/template work; it must not occupy a shared publication queue.
- Use normal governed claim, evidence, close, and commit lanes. Emergency authority is permitted only if the frozen runner cannot commit the repair that makes its own source discoverable; record the bootstrap reason and exact lease receipt.
- Do not modify `.atm/**` directly, do not clean or stage foreign WIP, and do not widen the card to other untracked templates or reference files.

## Evidence and rollback

Record red/green evidence for both required case IDs, the corpus before/after counts, command output from the two focused tests and `validate:skill-templates`, the generated adapter manifest digest, and the governed commit SHA.

Rollback is a single revert of the delivery commit. It restores the prior compiler/validator behavior and template frontmatter together; derived adapter copies must be regenerated, never manually restored.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-14T15:09:59.067Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0392-make-skill-template-source-discovery-fail-closed-and-trackable.task.md","contentDigest":"sha256:f9b1386d404fa7836ff6eaf48e2e3bae776d6056e48367074d35e95ae1b682dd"} -->
