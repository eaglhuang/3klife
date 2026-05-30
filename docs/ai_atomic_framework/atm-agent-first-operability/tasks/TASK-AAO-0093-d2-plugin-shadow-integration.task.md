---
task_id: TASK-AAO-0093
title: "D2 plugin 接入 + shadow 雙跑"
status: in_progress
priority: P1
closure_authority: target_repo
depends_on:
  - TASK-AAO-0092
started_at: "2026-05-30T17:58:57+08:00"
started_by_agent: "antigravity-gemini-3.5-flash"
scopePaths:
  - "tools_node/task-card-opener.js"
  - "tools_node/d2-shadow-advisor.js"
  - "packages/atm-markdown-task-source/"
deliverables:
  - "tools_node/task-card-opener.js"
  - "tools_node/d2-shadow-advisor.js"
  - "docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0093-d2-plugin-shadow-integration.task.md"
validators:
  - "node atm.mjs atomize score"
  - "node atm.mjs hook pre-commit --json"
  - "npm run typecheck"
atomizationImpact:
  ownerAtomOrMap: null
  mapUpdates: []
outOfScope:
  - "Do not modify dynamic lifecycle status in task cards or ledger files"
  - "Do not change non-plugin files under packages/ (packages/cli/, packages/core/)"
nonGoals:
  - "Do not deprecate status field in task card frontmatter"
  - "Do not change primary behavior of task-card-opener.js"
---

## Goal
Implement shadow runner in 3KLife CWD that consumes the upstream `atm-markdown-task-source` plugin.
It runs plugin parse/validate hook in parallel to task-card-opener.js, printing advisory warnings to stderr.

## Acceptance
- Upstream plugin successfully consumed in 3KLife CWD without crash.
- `tools_node/d2-shadow-advisor.js` implemented as wrapper and integrated into `task-card-opener.js` end section.
- Validator commands exit 0.
