---
task_id: TASK-AAO-0078
title: "git-head evidence JSONL migration (push merge conflict fix)"
status: done
priority: P0
milestone: M5
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
started_at: "2026-06-20T10:30:00+08:00"
started_by_agent: "cursor-gpt-5.2"
depends_on: []
related_plan: "ATM dogfood Grade B (89/100) + push merge conflict痛點"
scopePaths:
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/evidence.ts"
  - "packages/cli/src/commands/git-head-evidence.ts"
  - "packages/cli/src/commands/framework-development.ts"
  - "scripts/validate-git-head-evidence.ts"
  - "scripts/validate-git-hooks-enforcement.ts"
  - "scripts/validate-onefile-release.ts"
  - "scripts/validate-root-drop-release.ts"
  - ".gitattributes"
  - ".atm/history/evidence/git-head.jsonl"
  - ".atm/history/evidence/git-head.json"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/evidence.ts"
  - "packages/cli/src/commands/git-head-evidence.ts"
  - "packages/cli/src/commands/framework-development.ts"
  - "scripts/validate-git-head-evidence.ts"
  - "scripts/validate-git-hooks-enforcement.ts"
  - "scripts/validate-onefile-release.ts"
  - "scripts/validate-root-drop-release.ts"
  - ".gitattributes"
  - ".atm/history/evidence/git-head.jsonl"
  - ".atm/history/evidence/git-head.json"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "npm run validate:git-head-evidence"
  - "git diff --check"
evidence: { required: command-backed }
rollback: { strategy: revert-commit }
atomizationImpact:
  ownerAtomOrMap: "atm.git-head-evidence-map"
  mapUpdates:
    - path_pattern: ".atm/history/evidence/git-head.jsonl"
      atom_id: "atm.git-head-evidence-jsonl"
      capability: "Append-only JSONL evidence log with git union merge driver, replaces single-file git-head.json hotspot to eliminate push merge conflicts"
      coverage_status: "active"
outOfScope:
  - "Phase 5: 廢棄 legacy git-head.json — 留下一個 release train 後處理"
  - "post-commit hook 增強（policy.json 提到但實際不存在）"
  - "下游 adopter repo 同步 dual-read 改動"
nonGoals:
  - "Do not change evidence record schema (each line keeps {schemaVersion, evidence:[record]})"
  - "Do not break existing closure packet cross-check"
completed_at: "2026-06-20T02:24:10.269Z"
completed_by_agent: "cursor-gpt-5.2"
delivery_commit: "138adbef8"
---

## Goal
Migrate .atm/history/evidence/git-head.json from single-file overwrite to append-only JSONL with git union merge driver, eliminating push merge conflicts caused by dual-source writes (local task closures vs upstream docs commits).

## Acceptance
- .atm/history/evidence/git-head.jsonl exists, contains migrated legacy record as first line
- .gitattributes has `.atm/history/evidence/git-head.jsonl merge=union`
- All readers (doctor / framework-mode / guard commit-range / validate-git-head-evidence) support dual-read (.jsonl primary, .json fallback)
- All writers (hook pre-commit / evidence git-head-backfill) write to .jsonl append-only
- validate:git-head-evidence passes with both legacy fixtures and new JSONL fixtures
- legacy git-head.json kept tracked but no longer written (stale snapshot, scheduled for removal next release)
