---
task_id: ATM-GOV-0191
title: ErrorCode Skill Authoring Contract 與 Adapter Parity
status: done
owner: atm-core
priority: P0
depends_on: []
related_plan: docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: ErrorCode 與 task-card authoring 是 governance-optimization 共通治理，沿用 ATM-GOV；0191 經 planning 與 target scan 確認未占用。
scopePaths:
  - templates/skills/atm-dispatch.skill.md
  - templates/skills/atm-error-code-resolver.skill.md
  - templates/skills/atm-task-card-authoring.skill.md
  - .agents/skills/**
  - integrations/codex-skills/**
  - .claude/skills/**
  - .cursor/rules/skills/**
  - .github/instructions/**
  - .gemini/commands/**
  - GEMINI.md
  - .atm/integrations/*.manifest.json
  - release/atm-onefile/atm.mjs
  - release/atm-root-drop/**
deliverables:
  - ErrorCode resolver authoring/registration/retirement flow
  - task-card errorCodes machine-readable authoring contract
  - six adapter families regenerated from source templates with zero drift
validators:
  - node --strip-types scripts/validate-skill-templates.ts
  - npm run check:encoding:touched
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert generated adapter commit, then source-template commit
errorCodes: []
atomizationImpact:
  ownerAtomOrMap: atm.skill-template-compiler
  mapUpdates: []
  extractionCandidates: []
waveId: error-code-governance-2026-07
surfaceFamily: skill-template
completed_at: "2026-07-19T04:04:56.222Z"
completed_by_agent: "codex-error-code-governance"
closedAt: "2026-07-19T04:04:56.222Z"
closedByActor: "codex-error-code-governance"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-19T04-04-56-222Z-close-70d7e9237ba3"
lastTransitionAt: "2026-07-19T04:04:56.222Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "056292af13ed57dc4d27f3f10263917b88797919"
---

# ATM-GOV-0191 - ErrorCode Skill Authoring Contract 與 Adapter Parity

把 owner 裁決正式寫入 `atm-error-code-resolver`、`atm-task-card-authoring` 與
`atm-dispatch` 的 source-of-truth templates，重建 frozen runner 後重新烘焙所有
agent adapters。不得直接只改 installed copies。

驗收：plan/card 必填 code contract；正常狀態不濫建 ErrorCode；多卡可指定單一
registry owner；`validate-skill-templates` 零 drift；Windows 文字檔通過 UTF-8
encoding guard。本卡本身不新增 runtime ErrorCode。
