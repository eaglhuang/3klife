---
doc_id: doc_other_aao_0030
task_id: TASK-AAO-0030
title: "CRLF policy"
status: planned
owner: atm-core
priority: P2
milestone: M9
depends_on:
  - "TASK-AAO-0009"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - ".gitattributes"
  - "docs/governance/line-ending-policy.md"
  - "scripts/validate-line-endings.ts"
  - "package.json"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - ".gitattributes"
  - "docs/governance/line-ending-policy.md"
  - "scripts/validate-line-endings.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "git diff --check"
  - "node --strip-types scripts/validate-line-endings.ts"
  - "npm run validate:cli"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "回滾該任務 commit；若有新增產物或 validator，連同 atomization map 更新一起 revert。"
atomizationImpact:
  ownerAtomOrMap: "atm.repository-hygiene-map"
  mapUpdates:
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "新增 script / CLI / validator 時，同卡必須更新 atomization ownership map，不把 ownership 留給後續卡。"
outOfScope:
  - "手改 .atm/runtime/**"
  - "把 .atm/history/** 當作功能交付物"
  - "修改 unrelated 3KLife dirty files"
nonGoals:
  - "不在本卡完成整個 AAO 計畫"
  - "不建立第二套 task lifecycle"
  - "不繞過 ATM evidence gate"
---
# TASK-AAO-0030 — CRLF policy

## Goal

建立跨 Windows/Unix 編輯器的換行政策，避免 markdown/task card 反覆產生無意 diff。

## Why

多 AI、多編輯器並行時，CRLF/LF 噪音會放大 review 成本。

## Implementation Contract

- Planning context lives in `3KLife`; read it, but do not treat planning paths as target work unless this card explicitly lists them in `deliverables`.
- Target implementation repo is `AI-Atomic-Framework`.
- Work only inside `scopePaths`; if implementation needs another file, use an official scope amendment instead of editing locks by hand.
- New script, CLI, validator, report, or artifact work must include atomization ownership updates in the same task.

## Deliverables

- `.gitattributes`
- `docs/governance/line-ending-policy.md`
- `scripts/validate-line-endings.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `git diff --check`
- `node --strip-types scripts/validate-line-endings.ts`
- `npm run validate:cli`

## Acceptance Criteria

- policy 說明哪些檔案固定 LF。
- validator 可檢測 touched files。
- .gitattributes 不破壞既有 binary/artifact。
- CRLF / encoding findings 不可蓋掉 commit-message、protected-state、scope-drift 等更直接的 blocking finding；hook output 必須保留清楚的主因摘要與原始 finding 分類。
- 若 commit summary line 過長或格式不合規，診斷必須獨立列出，不可被 line-ending 報告包成同一個 confusing failure。

## Rollback

Revert the task commit. If generated artifacts were created, remove them in the same revert and re-run the listed validators.

## Atomization Impact

- Owner atom/map: `atm.repository-hygiene-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`
- Any new script/CLI/validator introduced by this card must be mapped before the card can close.

## Notes

This card uses the AAO task-card contract: explicit scope, explicit deliverables, command-backed evidence, rollback, and atomization impact.
