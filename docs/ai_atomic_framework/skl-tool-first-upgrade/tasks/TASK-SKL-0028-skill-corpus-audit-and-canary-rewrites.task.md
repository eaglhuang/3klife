---
task_id: TASK-SKL-0028
title: Skill corpus audit and canary rewrites
status: done
owner: atm-agent-skills
priority: P1
milestone: ATM-SKL-VG-R0.6
depends_on:
  - TASK-SKL-0019
  - TASK-SKL-0020
  - TASK-SKL-0027
related_plan: skl-tool-first-upgrade/SKL-validator-governance-test-case-catalog-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - templates/skills/atm-governance-router.skill.md
  - templates/skills/atm-dispatch.skill.md
  - templates/skills/atm-task-card-authoring.skill.md
  - templates/skills/atm-plan-authoring.skill.md
  - templates/skills/atm-next.skill.md
  - templates/skills/atm-framework-temp-claim.skill.md
  - packages/integrations-core/src/compiler/skill-templates.ts
  - scripts/audit-skill-corpus.ts
  - scripts/validate-skill-templates.ts
  - artifacts/generated/skill-corpus-audit.json
  - tests/cli/skill-corpus-canary-rewrite.test.ts
deliverables:
  - templates/skills/atm-governance-router.skill.md
  - templates/skills/atm-dispatch.skill.md
  - templates/skills/atm-task-card-authoring.skill.md
  - templates/skills/atm-plan-authoring.skill.md
  - templates/skills/atm-next.skill.md
  - templates/skills/atm-framework-temp-claim.skill.md
  - scripts/audit-skill-corpus.ts
  - artifacts/generated/skill-corpus-audit.json
  - tests/cli/skill-corpus-canary-rewrite.test.ts
validators:
  - node --strip-types tests/cli/skill-corpus-canary-rewrite.test.ts
  - npm run validate:skill-templates
  - npm run typecheck
errorCodes: []
evidence:
  required: skill-corpus-audit-canary-parity
rollback:
  strategy: revert-canary-wave-and-restore-prior-projections
atomizationImpact:
  ownerAtomOrMap: atm.agent-skills
  mapUpdates: []
  extractionCandidates:
    - atom: atm.skill-corpus-auditor
      pattern: Audit Script
      source: scripts/audit-skill-corpus.ts
      disposition: extract
createdByCommand: atm plan card create
completed_at: "2026-07-24T17:26:06.391Z"
completed_by_agent: "codex-matt-skills-initiative-captain-20260724"
closedAt: "2026-07-24T17:26:06.391Z"
closedByActor: "codex-matt-skills-initiative-captain-20260724"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-24T17-26-06-391Z-close-9f7d714957af"
lastTransitionAt: "2026-07-24T17:26:06.391Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "d5d9e791971bb262040984715c0f24f814fea798"
---

# TASK-SKL-0028 Skill corpus audit and canary rewrites

## Intent

Audit the complete source and installed skill corpus, then rewrite only the
highest-frequency canaries using the new quality, authoring and deep-module
contracts before any broader migration.

## Acceptance

- [ ] Every skill is classified keep, prune, disclose, split, merge, retire or
      replace with provider/version evidence.
- [ ] Canary order is router, dispatch, task-card authoring, plan authoring,
      next and framework-temp claim.
- [ ] Source templates are changed before installed projections.
- [ ] Before changing compiler/audit seams, invoke `atm-deep-module-refactor` and seal the source-snapshot/projection boundary plus `deep-module-review:52470e9f` and `deep-module-review:52b3cbe6` baselines.
- [ ] `compileSkillCorpus({ sourceSnapshot, adapterDescriptor })` is the single projection interface. Source inclusion is determined by the sealed corpus snapshot, never by the caller's Git tracked/ignored state or local `.git/info/exclude`.
- [ ] Every adapter projection carries source digest, compiler version, degradation diagnostics, and manifest digest; Codex, Claude, Cursor, Copilot, Gemini, and Antigravity consume the same compiled snapshot.
- [ ] The canary rewrite productizes the TASK-SKL-0020 `to-tickets` lesson as
      a cohesion-first task split rule in `atm-task-card-authoring`,
      `atm-plan-authoring`, and `atm-dispatch`: keep a feature card
      semantically complete, split only on causal blockers or independent public
      seams, and never move essential deliverables solely to bypass a local
      staging/ignore/tooling blocker.
- [ ] The audit explicitly reports source-template paths hidden by local ignore
      rules such as `.git/info/exclude`; ignored but required deliverables must
      use governed admission or be deferred with a named follow-up, not native
      force-add.
- [ ] If a prior card hit ignored required deliverables, this card records the
      reusable skill guidance and tooling gap, but it does not silently absorb
      another card's required completion semantics. The original card remains
      the owner unless a human-approved amendment changes that boundary.
- [ ] Route fixtures, invocation precision, context tokens, follow-up count and
      premature stops are compared before/after.
- [ ] Each canary wave has independent rollback and no blind bulk rewrite occurs.
- [ ] The TASK-SKL-0027 ignored-template incident is a locked regression: a required source template present in the sealed snapshot must project and commit through governed admission without native force-add or a new microcard.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-24T03:32:35.858Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"skl-tool-first-upgrade/tasks/TASK-SKL-0028-skill-corpus-audit-and-canary-rewrites.task.md","contentDigest":"sha256:c04da7ac7ddbff537b68b41fbcd8cc1c7163de91f0401bd9be3631dcee7129f3"} -->
