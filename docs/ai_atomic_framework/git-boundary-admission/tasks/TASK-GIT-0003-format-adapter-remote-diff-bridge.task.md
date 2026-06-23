---
task_id: TASK-GIT-0003
title: Format adapter remote diff bridge
status: done
milestone: G1
depends_on:
  - TASK-GIT-0002
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
completed_at: 2026-06-23T04:54:49.594Z
scopePaths:
  - "packages/core/src/broker/**"
  - "packages/core/src/adapters/**"
  - "packages/core/src/git/**"
  - "tests/**"
deliverables:
  - "Adapter bridge from Git file deltas into conflict keys."
  - "Structured JSON and atom-map path handling."
  - "Conservative text-range fallback when no structured adapter exists."
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
out_of_scope:
  - "No new language parser."
  - "No speculative semantic inference beyond adapter-provided data."
nonGoals:
  - "No automatic atom-map rewrite."
atomizationImpact:
  ownerAtomOrMap: "atm.git-format-adapter-bridge"
  mapUpdates: []
---

# TASK-GIT-0003

## Goal

Route Git-derived file deltas through existing ATM format adapters where possible, so pre-push admission is not only line-based.

## Acceptance

- JSON-like structured files can produce record-level conflict keys.
- `path-to-atom-map.json` and atom-map-style files can produce atom-aware conflict keys.
- Unknown file types fall back to conservative text ranges.
- Adapter failures fail closed with actionable diagnostics.
