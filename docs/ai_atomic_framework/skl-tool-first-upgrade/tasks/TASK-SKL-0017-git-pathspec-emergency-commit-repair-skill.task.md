---
task_id: TASK-SKL-0017
title: Git pathspec emergency commit repair skill
status: done
owner: atm-agent-skills
priority: P0
milestone: ATM-3.1-SKL-R0.1
severity: P0
depends_on: []
related_plan: skl-tool-first-upgrade/SKL-tool-first-upgrade-plan.md
soft_dependency_note: "ATM-GOV-0261 is the formal VCS-neutral product route. TASK-SKL-0017 is allowed to proceed first because it is an emergency-only runbook needed while 0261 is not yet available; 0017 evidence must not satisfy 0261 normal acceptance. "
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "SKL owns agent skill/runbook surfaces. This card adds an emergency repair skill for Git pathspec commits and keeps it separate from ATM-GOV-0261 VCS-neutral product capability."
scopePaths:
  - templates/skills/atm-git-pathspec-emergency-commit.skill.md
  - .agents/skills/atm-git-pathspec-emergency-commit/SKILL.md
  - scripts/validate-skill-templates.ts
  - tests/cli/git-pathspec-emergency-skill-contract.test.ts
deliverables:
  - templates/skills/atm-git-pathspec-emergency-commit.skill.md
  - .agents/skills/atm-git-pathspec-emergency-commit/SKILL.md
  - tests/cli/git-pathspec-emergency-skill-contract.test.ts
validators:
  - node --strip-types tests/cli/git-pathspec-emergency-skill-contract.test.ts
  - npm run validate:skill-templates
  - npm run validate:cli
errorCodes: []
evidence:
  required: git-pathspec-emergency-skill-contract-red-green
rollback:
  strategy: revert-commit-and-retain-manual-captain-emergency-guidance
  notes: "Rollback removes the dedicated skill and returns to captain-authored emergency instructions. It must not weaken ATM-GOV-0261 requirement that direct pathspec commits remain outside normal success evidence."
atomizationImpact:
  ownerAtomOrMap: atm.agent-skills
  mapUpdates: []
  extractionCandidates:
    - atom: atm.git-pathspec-emergency-commit-skill
      pattern: Emergency Runbook Skill
      source: templates/skills/atm-git-pathspec-emergency-commit.skill.md
      disposition: extract
createdByCommand: atm plan card create
completed_at: "2026-07-23T02:17:33.024Z"
completed_by_agent: "cursor-grok45-plan31-captain"
closedAt: "2026-07-23T02:17:33.024Z"
closedByActor: "cursor-grok45-plan31-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-23T02-17-33-024Z-close-eeaf940de09c"
lastTransitionAt: "2026-07-23T02:17:33.024Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "2f093fde15bf9200578871af18757d82fc0b1a56"
---

# TASK-SKL-0017 Git pathspec emergency commit repair skill

## Intent

Create a dedicated, vendor-neutral emergency skill for the narrow case where ATM normal governed commit, WIP park, or commit-candidate lane is blocked, but the project owner explicitly authorizes a one-time path-bounded Git commit to preserve or record work without consuming unrelated staged files.

This skill is deliberately not a product feature and not a Plan 3.1 success path. It is an emergency/anomaly repair runbook until ATM-GOV-0261 provides VCS-neutral commit-candidate isolation and the Git adapter can use pathspec only behind ATM steward evidence.

## Boundary

- Normal governed delivery must use ATM task/claim/broker/commit/close flows.
- The skill may be used only after a hard blocker has no executable recoveryCommand, or when the owner/captain explicitly grants emergency authority.
- The skill must not teach agents to treat Git pathspec as ATM core concurrency model.
- The skill must require exact staged-set verification before commit and post-commit verification after commit.
- The skill must require actor/task/WIP/delivery/emergency trailers and Git author/committer continuity.
- The skill must require backlog/follow-up recording if the emergency path was needed because ATM lacked a normal recovery route.

## Acceptance

- [ ] A source skill template `templates/skills/atm-git-pathspec-emergency-commit.skill.md` exists and is explicit that direct pathspec/native commit is emergency-only and excluded from autonomous Plan 3.1 success metrics.
- [ ] The installed `.agents/skills/atm-git-pathspec-emergency-commit/SKILL.md` copy is generated or kept byte-equivalent to the template according to existing skill-template rules.
- [ ] The skill provides a compact checklist: authority preconditions, exact keep-list staging, staged-set comparison, focused validator guidance, native commit command shape, required trailers, author/committer env, post-commit verification, push boundary, and stop conditions.
- [ ] The skill forbids `restore`, `stash`, `clean`, `reset`, `checkout`, or broad `git add -A` unless the human grants a separate destructive/recovery approval.
- [ ] The skill states that using it must create or reference a backlog/follow-up item and must not close the underlying task as normal delivery unless subsequent governed closeout proves it.
- [ ] A focused contract test proves the template includes emergency-only language, required trailers, exact staged-set verification, author continuity, and Plan 3.1 exclusion text.

## Suggested skill outline

1. Confirm emergency authority and why ATM normal recovery is unavailable.
2. Capture `git status --short`, `git diff --cached --name-only`, `node atm.mjs broker status --json`.
3. Build an explicit keep-list from the captain/task card; never infer from all dirty files.
4. Stage only keep-list paths; verify `git diff --cached --name-only` exactly equals the keep-list.
5. Run focused validators when available; if validators fail, label the commit as non-delivery WIP.
6. Set `GIT_AUTHOR_*` and `GIT_COMMITTER_*` from the actor identity.
7. Commit with `--no-verify` only when explicitly authorized, and include `ATM-Actor`, `ATM-Task`, `ATM-WIP`, `ATM-Delivery`, and `ATM-Emergency-Reason` trailers.
8. Verify HEAD advanced, staged index is empty, broker is clean, and remaining dirty files are reported.
9. Push only when the owner/captain requested push and pre-push passes.

## Relationship to ATM-GOV-0261

ATM-GOV-0261 owns the normal product route: VCS-neutral commit candidates admitted by broker/steward before any repository adapter writes. This SKL card owns only the temporary emergency runbook. If future agents use this skill for normal delivery, that is a Plan 3.1 failure signal, not a success pattern.

## 2026-07-23 dependency clarification

ATM-GOV-0261 is intentionally a soft architectural reference, not a hard claim dependency. This emergency skill exists precisely because the normal VCS-neutral commit-candidate product route is not yet complete. Agents may implement TASK-SKL-0017 before ATM-GOV-0261, but any use of the resulting skill remains anomaly evidence and cannot satisfy 0261 or Plan 3.1 normal autonomous-delivery metrics.
