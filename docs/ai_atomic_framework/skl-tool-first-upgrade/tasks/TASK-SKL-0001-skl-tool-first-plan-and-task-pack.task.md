---
doc_id: doc_skl_0001
task_id: TASK-SKL-0001
title: "SKL tool-first plan and task pack"
status: planned
owner: captain
priority: P0
milestone: P0
depends_on: []
related_plan: docs/ai_atomic_framework/skl-tool-first-upgrade/SKL-tool-first-upgrade-plan.md
planning_repo: 3KLife
target_repo: 3KLife
closure_authority: planning_repo
scopePaths:
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/README.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/00-verified-facts.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/SKL-tool-first-upgrade-plan.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/taskflow.profile.json"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/tasks/README.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/tasks/TASK-SKL-0001-skl-tool-first-plan-and-task-pack.task.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/tasks/TASK-SKL-0002-tool-bridge-v1-schema-and-result-adapter.task.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/tasks/TASK-SKL-0003-next-claim-framework-mode-tools.task.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/tasks/TASK-SKL-0004-evidence-guard-taskflow-governed-commit-tools.task.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/tasks/TASK-SKL-0005-skill-tool-first-orchestration-migration.task.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/tasks/TASK-SKL-0006-governed-commit-and-close-lane-hardening.task.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/tasks/TASK-SKL-0007-shared-skill-growth-contract-and-learning-loop.task.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/tasks/TASK-SKL-0008-team-role-skill-pack-and-capability-boundary-contract.task.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/tasks/TASK-SKL-0009-team-role-routing-matrix-and-playbook-slices.task.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/tasks/TASK-SKL-0010-provider-neutral-role-skill-pack-manifest.task.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/tasks/TASK-SKL-0011-agent-plus-skill-runtime-pilot.task.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/tasks/TASK-SKL-0012-team-role-growth-and-observability-integration.task.md"
deliverables:
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/README.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/00-verified-facts.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/SKL-tool-first-upgrade-plan.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/taskflow.profile.json"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/tasks/README.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/tasks/TASK-SKL-0001-skl-tool-first-plan-and-task-pack.task.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/tasks/TASK-SKL-0002-tool-bridge-v1-schema-and-result-adapter.task.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/tasks/TASK-SKL-0003-next-claim-framework-mode-tools.task.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/tasks/TASK-SKL-0004-evidence-guard-taskflow-governed-commit-tools.task.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/tasks/TASK-SKL-0005-skill-tool-first-orchestration-migration.task.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/tasks/TASK-SKL-0006-governed-commit-and-close-lane-hardening.task.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/tasks/TASK-SKL-0007-shared-skill-growth-contract-and-learning-loop.task.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/tasks/TASK-SKL-0008-team-role-skill-pack-and-capability-boundary-contract.task.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/tasks/TASK-SKL-0009-team-role-routing-matrix-and-playbook-slices.task.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/tasks/TASK-SKL-0010-provider-neutral-role-skill-pack-manifest.task.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/tasks/TASK-SKL-0011-agent-plus-skill-runtime-pilot.task.md"
  - "docs/ai_atomic_framework/skl-tool-first-upgrade/tasks/TASK-SKL-0012-team-role-growth-and-observability-integration.task.md"
validators:
  - "encoding-touched guard on touched planning files"
  - "git diff --check"
  - "node atm.mjs tasks import --from \"C:/Users/User/3KLife/docs/ai_atomic_framework/skl-tool-first-upgrade/tasks/TASK-SKL-*.task.md\" --dry-run --json"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the planning-doc commit that opened the SKL lane. This card is planning-only and must not write framework source."
atomizationImpact:
  ownerAtomOrMap: "atm.skl-tool-first-planning-map"
  mapUpdates: []
  notes: "Planning-only card. It defines the tool-first execution pack but does not itself mutate framework runtime code."
outOfScope:
  - "Editing AI-Atomic-Framework source files"
  - "Manual mutation of .atm/history/** or .atm/runtime/**"
  - "Introducing a second task model outside ATM"
nonGoals:
  - "Do not implement the tool bridge in this card"
  - "Do not rewrite existing CID lane artifacts"
---

# TASK-SKL-0001 - SKL tool-first plan and task pack

## Goal

建立 `skl-tool-first-upgrade` planning lane，回寫計畫書、索引與 profile，並完整開出 `TASK-SKL-0002` ~ `TASK-SKL-0012` execution pack。

## Background

使用者提供的升級計畫已經把 work packages 切成六個主題，但目前還沒有對應的 lane 結構、task index、taskflow profile 與 machine-readable task cards。若沒有先開包，後續工具化實作就會失去 planning source of truth 與一致的 dispatch 邊界。

## Contract

1. 新建一個與 `cid-hardening` 同層級的 planning lane。
2. 在 lane root 寫入 `README.md`、`00-verified-facts.md`、`SKL-tool-first-upgrade-plan.md`、`taskflow.profile.json`。
3. 在 `tasks/` 下建立任務索引與十一張 execution/planning bridge cards，加上本張 planning-only opener card。
4. 把 `router / playbook / specialist skill` 三層模型與共用 skill growth contract 正式寫進計畫。
5. 把 Team Agent = `Role + Skill Pack + Permission Lease + Playbook Slice + Growth Contract` 的整合模型正式寫進計畫與任務包。
6. 讓 `TASK-SKL-0002` ~ `TASK-SKL-0012` 的依賴、scope、deliverables、validators 與 rollback 邊界可直接被後續治理流程消費。

## Acceptance Criteria

- lane root 與 `tasks/` 結構完整，命名與 `TASK-SKL-*` 編號一致。
- 計畫書清楚描述目標 result shape、tool surface、skill migration 與 hardening 主題。
- 計畫書清楚描述 `router / playbook / specialist skill` 分層與 shared growth contract。
- 計畫書清楚描述 Team Agents 與 `Agent + Skill` 治理單元的整合模型。
- 任務索引可作為 captain dispatch 與後續 import 的入口。
- 每張 task card 都含有 machine-readable frontmatter 與完整內容段落。
- planning lane 只寫 `3KLife` 規劃文件，不直接授權 framework source mutation。

## Validators

- `encoding-touched guard on touched planning files`
- `git diff --check`
- `node atm.mjs tasks import --from "C:/Users/User/3KLife/docs/ai_atomic_framework/skl-tool-first-upgrade/tasks/TASK-SKL-*.task.md" --dry-run --json`

## Rollback

Revert the planning-doc commit that opened the SKL lane.

## Notes

- 本卡是 `SKL` 系列的 planning source of truth，不應與 `CID` lane 互相覆寫。
- execution cards 仍需回到 `AI-Atomic-Framework` 透過 ATM route/claim/validator/close 流程落地。
