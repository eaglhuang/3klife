---
task_id: TASK-AAO-0092
title: "D2 adapter spec — atm-markdown-task-source plugin 接入評估"
status: in_progress
priority: P1
closure_authority: adopter
depends_on:
  - TASK-AAO-0089
started_at: "2026-05-30T17:54:05+08:00"
started_by_agent: "antigravity-gemini-3.5-flash"
scopePaths:
  - "docs/ai_atomic_framework/atm-agent-first-operability/d2/"
deliverables:
  - "docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0092-d2-adapter-spec.task.md"
  - "docs/ai_atomic_framework/atm-agent-first-operability/d2/adapter-spec.md"
  - "docs/tasks/tasks-aao.json"
validators:
  - "Verify all 6 sections are fully detailed in adapter-spec.md"
atomizationImpact:
  ownerAtomOrMap: null
  mapUpdates: []
outOfScope:
  - "Do not change any files under AI-Atomic-Framework"
  - "Do not modify any source code under 3KLife (tools_node/, packages/)"
nonGoals:
  - "Do not perform status field removal or deprecation work"
  - "Do not close this task (keep status as in_progress)"
---

## Goal
Perform evaluation and write adapter spec document to outline how 3KLife can adopt the upstream
`atm-markdown-task-source` plugin to replace `tools_node/task-card-opener.js`.

## Acceptance
- `adapter-spec.md` successfully written with all 6 required sections.
- Strictly 1 commit in 3KLife.
- Task status remains `in_progress`.
