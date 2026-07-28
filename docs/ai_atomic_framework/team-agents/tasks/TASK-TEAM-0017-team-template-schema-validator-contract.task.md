---
doc_id: doc_team_0017
task_id: TASK-TEAM-0017
title: "Team template schema and validator contract"
status: done
owner: atm-core
priority: P1
milestone: M2
depends_on:
  - "TASK-TEAM-0004"
  - "TASK-TEAM-0005"
  - "TASK-TEAM-0006"
related_plan: "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
completed_at: 2026-06-14T13:54:10.546Z
completed_by: captain-teamagents
lastTransitionId: "2026-06-14T13-54-10-548Z-close-8cf0fbfb56ce"
delivery_commit: "4497fb169b9d5d5de66bdf48e50afa7ec1d11c44"
closure_commit: "1b95f9e90cd8936bd506cd34d874d1e8d1ce3ca1"
runner_sync_commit: "19e03e1c114ee3ebafd19c46e0492e5021a93250"
closure_packet: ".atm/history/evidence/TASK-TEAM-0017.closure-packet.json"
emergency_close:
  lease_id: "EMG-TASK-TEAM-0017-50d955a217"
  reason: "Human-approved backend close was required because closeback evidence and transition event sequencing formed a closure cycle after delivery commit 4497fb169b9d5d5de66bdf48e50afa7ec1d11c44."
scopePaths:
  - "schemas/team-agents/team-brief.schema.json"
  - "schemas/team-agents/agent-report.schema.json"
  - "schemas/team-agents/team-summary.schema.json"
  - "schemas/team-agents/captain-decision.schema.json"
  - "schemas/team-agents/team-memory-shard.schema.json"
  - "schemas/team-agents/patrol-report.schema.json"
  - "scripts/validate-team-agents-templates.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  - "atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-platform.json"
deliverables:
  - "schemas/team-agents/team-brief.schema.json"
  - "schemas/team-agents/agent-report.schema.json"
  - "schemas/team-agents/team-summary.schema.json"
  - "schemas/team-agents/captain-decision.schema.json"
  - "schemas/team-agents/team-memory-shard.schema.json"
  - "schemas/team-agents/patrol-report.schema.json"
  - "scripts/validate-team-agents-templates.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-team-agents-templates.ts --fixtures"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Remove schema files and validator, revert atom map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-template-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "6 schema files and 1 validator script must all be mapped under team-agents-template-map atom."
outOfScope:
  - "Changing existing template markdown content (M0 templates are frozen)"
  - "Team runtime writes or subagent spawning"
  - "Task close or checkpoint semantics"
  - "CLI surface changes"
nonGoals:
  - "Do not make schemas authoritative over ATM task cards"
  - "Do not add runtime enforcement (留給 M5+ tasks)"
  - "Do not validate 3KLife planning repo files (schemas target AI-Atomic-Framework docs only)"
---
# TASK-TEAM-0017 — Team template schema and validator contract

## Goal

機器可讀的 JSON Schema 套件 + 一個可在 dry-run fixture 上跑 pass/fail 的 validator 腳本，
覆蓋 M0 建立的全部 6 份 Markdown 模板，確保 Atomization Plan 9 欄必填與 Patrol read-only 規則可被工具自動驗證。

## Why

M0/M1 只有人類可讀的 Markdown 模板；M2 需要讓工具能解析和驗證模板的必填欄位。
這張卡是 TASK-TEAM-0004/0005/0006 的「schema 封裝層」，讓 validator 從純字串 match 升級為 schema-driven 驗證，並為後續 knowledge index 準備 retrieval-ready metadata。

## Atomization Plan

```
Primary atom:        atm.team-agents-template-map
Related atoms:       atm.task-closure-map, atm.team-agents-runtime (M5+)
Capability touched:  schemas/team-agents/, scripts/validate-team-agents-templates.ts
Command surface:     node --strip-types scripts/validate-team-agents-templates.ts --fixtures
Large-script risk:   LOW — validator 新增腳本，不觸碰 tasks.ts / next.ts 巨檔
Map update needed:   YES — 6 schema 檔 + 1 validator 必須加入 path-to-atom-map.json
Recommended slice:   先寫 team-brief.schema.json + validator skeleton，通過後再補其他 5 個 schema
Do-not-cross:        不得修改 tasks.ts / next.ts / batch.ts；不得修改 .atm/runtime/
Split:               若 validator 腳本超過 400 行，拆成 schema-loader.ts + report-formatter.ts
```

## Implementation Contract

1. 在 `schemas/team-agents/` 下為 6 份模板各建立一個 JSON Schema（draft-07 或 draft-2020-12）：
   - `team-brief.schema.json`：必填欄位含 Atomization Plan 9 個子欄位
   - `agent-report.schema.json`：必填 Role/Status/Files/Findings/Recommendation
   - `team-summary.schema.json`：必填 Decision/Validators/Evidence/Close-Ready
   - `captain-decision.schema.json`：必填 Options/Chosen/Reason/Risk
   - `team-memory-shard.schema.json`：必填 KnowledgeScope/RepoId/PathHints/RelatedAtoms/RelatedValidators/Symptom/Lesson/Reuse/Avoid/Freshness/RetentionClass
   - `patrol-report.schema.json`：必填含 `readonly: true` 欄位且不允許 `file.write` 權限
2. 擴充 `scripts/validate-team-agents-templates.ts`（或新建，若 TASK-TEAM-0004 尚未建立）：
   - 接受 `--fixtures <dir>` 參數，掃描 fixture `.md` 檔逐一 validate
   - 輸出 `PASS` / `FAIL` 並列出哪個必填欄位缺失
   - exit 0 全通過，exit 1 有失敗
3. 更新 `atomic_workbench/atomization-coverage/path-to-atom-map.json` 加入 6 schema + validator 的 ownership。

## Deliverables

- `schemas/team-agents/team-brief.schema.json`
- `schemas/team-agents/agent-report.schema.json`
- `schemas/team-agents/team-summary.schema.json`
- `schemas/team-agents/captain-decision.schema.json`
- `schemas/team-agents/team-memory-shard.schema.json`
- `schemas/team-agents/patrol-report.schema.json`
- `scripts/validate-team-agents-templates.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Acceptance Criteria

- 6 份 Markdown 模板 fixture 可被 validator 解析，全部 PASS
- Atomization Plan 9 欄（Primary atom / Related atoms / Capability touched / Command surface / Large-script risk / Map update needed / Recommended implementation slice / Do-not-cross boundary / Split recommendation）缺任一欄時 FAIL
- `team-memory-shard.schema.json` 必須驗證 retrieval metadata 與 advisory-only 欄位，不可把 shard 提升成 task truth / evidence authority
- `patrol-report.schema.json` 必須標示 `readOnly: true` 且含「未授權不得寫入 source」語義欄位
- `node --strip-types scripts/validate-team-agents-templates.ts --fixtures` 在空 fixture 目錄 exit 0，在含缺欄 fixture 時 exit 1
- `npm run typecheck` 通過（no new type errors）
- `git diff --check` 通過

## Validators

```
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-team-agents-templates.ts --fixtures test/fixtures/team-agents/
git diff --check
```

## Closure Notes

- Delivery commit: `4497fb169b9d5d5de66bdf48e50afa7ec1d11c44`
- Closure commit: `1b95f9e90cd8936bd506cd34d874d1e8d1ce3ca1`
- Runner sync commit: `19e03e1c114ee3ebafd19c46e0492e5021a93250`
- Closure packet: `.atm/history/evidence/TASK-TEAM-0017.closure-packet.json`
- Emergency close lease: `EMG-TASK-TEAM-0017-50d955a217`
- Extra scoped source-of-truth map shard: `atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-platform.json`

## Stop Conditions

- 如果 TASK-TEAM-0004 先前的 validator 實作方式與此卡衝突，先在 captain-decision 記錄，不覆寫
- 如果 JSON Schema 解析庫（例如 ajv）需要 npm 安裝，先確認是否已在 package.json 中存在，不要未經 Captain 確認自行安裝新依賴
