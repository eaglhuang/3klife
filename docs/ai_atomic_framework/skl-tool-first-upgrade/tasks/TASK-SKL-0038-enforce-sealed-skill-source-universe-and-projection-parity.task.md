---
task_id: TASK-SKL-0038
title: Enforce sealed skill source universe and projection parity
status: done
owner: unassigned
priority: P1
depends_on:
  - TASK-SKL-0028
causalGraph:
  causalDependencies:
    - taskId: TASK-SKL-0028
      relationship: extends-sealed-corpus-boundary
  startConditions:
    - condition: The SKL planning card is imported through the target ATM CLI and has one active owner.
    - condition: The owner has captured a read-only tracked, untracked, ignored, and installed-projection inventory.
  softRelations:
    - taskId: TASK-SKL-0029
      relationship: consumes-skill-projections-but-does-not-change-lifecycle-semantics
  changedPublicSeams:
    - seam: sealed-skill-source-universe
      owner: compileSkillCorpus
    - seam: skill-projection-parity-disposition
      owner: skill-template-validator
  causalImpactEdges:
    - from: sealed-skill-source-universe
      to: adapter-projection-manifest
      effect: A projection may be refreshed only from a tracked, sealed source snapshot.
    - from: skill-projection-parity-disposition
      to: adapter-verification
      effect: Unresolved installed-copy drift cannot remain an indefinite advisory.
  parallelFrontierInputs:
    - input: Read-only foreign-residue inventory
      requiredFor: source-universe admission
  validatorReferences:
    - npm run validate:skill-templates
    - npm run validate:integration-adapter
    - node --strip-types tests/cli/skill-corpus-canary-rewrite.test.ts
  phaseOwner: skill-corpus-integrity
related_plan: skl-tool-first-upgrade/SKL-validator-governance-test-case-catalog-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/integrations-core/src/compiler/skill-templates.ts
  - packages/integrations-core/src/index.ts
  - scripts/audit-skill-corpus.ts
  - scripts/validate-skill-templates.ts
  - scripts/validate-integration-adapter.ts
  - tests/cli/skill-corpus-canary-rewrite.test.ts
  - templates/skills/atm-diagnostic-loop.skill.md
  - artifacts/generated/skill-corpus-audit.json
deliverables:
  - A sealed source-universe record derived at audit or seal time from version-controlled skill templates.
  - A hard, actionable disposition for untracked or ignored source templates without consulting local Git state during projection compilation.
  - Compiler-projected parity metadata containing sourceDigest, compilerVersion, manifestDigest, and degradationDiagnostics.
  - A finite installed-copy drift disposition of sync, approved-baseline, explicit-waiver, or fail-closed.
  - Governed admission of atm-diagnostic-loop as a formal source template, only after the source-universe contract accepts it.
validators:
  - npm run validate:skill-templates
  - npm run validate:integration-adapter
  - node --strip-types tests/cli/skill-corpus-canary-rewrite.test.ts
  - npm run typecheck
  - git diff --check
errorCodes: []
tddMode: required
methodProfiles:
  - expand-contract
atomizationImpact:
  ownerAtomOrMap: atm.skill-corpus-auditor
  mapUpdates: []
  extractionCandidates: []
outOfScope:
  - ATM task, claim, receipt, close, runner-sync, and release semantics.
  - Full-corpus refreshes or adapter architecture rewrites.
  - Manual changes to .atm/runtime, .atm/history, .gitignore, or .git/info/exclude.
  - Foreign installed copies, source templates, or dirty WIP not explicitly admitted after audit.
nonGoals:
  - Treating an installed copy as a source of truth.
  - Force-adding an ignored template or masking source tracking failures.
  - Changing Plan 3.1 or unrelated active delivery surfaces.
createdByCommand: atm plan card create
completed_at: "2026-08-21T05:13:14.363Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-08-21T05:13:14.363Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-21T05-13-14-363Z-close-240a22cf625d"
lastTransitionAt: "2026-08-21T05:13:14.363Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "603ad351474d4088c1e38f453ce4e42d6ff4e046"
---

# TASK-SKL-0038 Enforce sealed skill source universe and projection parity

## Intent

Repair the source-to-projection integrity boundary for ATM skills.  The sealed
corpus snapshot remains the sole compiler input, while the audit or seal stage
must prove that every formal source template is version-controlled and
classified.  Derived installed copies must be compared against the compiled
projection, not raw source placeholders, and every mismatch must have a finite
governed disposition.

The initial captain disposition is that `atm-diagnostic-loop` is a formal
source candidate.  It may enter the corpus only through this card's normal
tracked-source admission and governed delivery; neither native force-add nor a
direct installed-copy edit is an admissible shortcut.

## Acceptance

- [ ] The audit distinguishes tracked formal source templates, untracked source
      candidates, ignored candidates, and installed-only residue.  An
      untracked or ignored formal source template is a hard finding with an
      executable recovery, not an advisory-only success.
- [ ] The compiler consumes a sealed source-universe snapshot and never
      re-evaluates local Git tracked, ignored, or `.git/info/exclude` state
      during projection compilation.
- [ ] `atm-diagnostic-loop` has one explicit disposition.  If admitted, it is
      tracked and included in the sealed corpus before any projection refresh;
      if rejected, the audit records a finite governed disposition and no
      installed copy may impersonate it as source.
- [ ] Every projection records sourceDigest, compilerVersion, manifestDigest,
      and degradationDiagnostics.  Parity compares the expected compiled
      projection instead of confusing source placeholders with compiler output.
- [ ] Every installed-copy mismatch is synchronised, covered by an approved
      baseline or explicit waiver, or fails closed.  No unbounded advisory
      drift remains.
- [ ] Focused fixtures prove that missing tracking, ignored source, stale
      projection metadata, undeclared installed drift, and a mismatched
      manifest digest all fail closed; a valid sealed projection passes.
- [ ] The implementation does not mutate task, claim, receipt, close,
      runner-sync, release, or adapter production architecture semantics.
- [ ] Delivery contains only task-scoped files and preserves every foreign
      residue byte-for-byte.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-16T13:45:16.241Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"skl-tool-first-upgrade/tasks/TASK-SKL-0038-enforce-sealed-skill-source-universe-and-projection-parity.task.md","contentDigest":"sha256:1a395b80beeb27a7821f9a041dcb24e812c7767ab04412d7566e926de35f173c"} -->
