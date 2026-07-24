---
task_id: TASK-SKL-0028
title: Skill corpus audit and canary rewrites
status: planned
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
---

# TASK-SKL-0028 Skill corpus audit and canary rewrites

## Intent

Audit the complete source and installed skill corpus, then rewrite only the
highest-frequency canaries using the new quality, authoring and deep-module
contracts before any broader migration.

## Acceptance

- [ ] Every skill is classified keep, prune, disclose, split, merge, retire or
      replace with provider/version evidence.
- [ ] Canary order is router, dispatch, task-card authoring, next and
      framework-temp claim.
- [ ] Source templates are changed before installed projections.
- [ ] The audit explicitly reports source-template paths hidden by local ignore
      rules such as `.git/info/exclude`; ignored but required deliverables must
      use governed admission or be deferred with a named follow-up, not native
      force-add.
- [ ] If TASK-SKL-0027 deferred new deep-module template corpus files because
      `templates/**` was locally ignored, this card either migrates them through
      an ATM-governed ignored-deliverable route or records a blocker/follow-up
      before broad canary rewrites proceed.
- [ ] Route fixtures, invocation precision, context tokens, follow-up count and
      premature stops are compared before/after.
- [ ] Each canary wave has independent rollback and no blind bulk rewrite occurs.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-24T03:32:35.858Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"skl-tool-first-upgrade/tasks/TASK-SKL-0028-skill-corpus-audit-and-canary-rewrites.task.md","contentDigest":"sha256:c04da7ac7ddbff537b68b41fbcd8cc1c7163de91f0401bd9be3631dcee7129f3"} -->
