---
doc_id: doc_other_0166
task_id: TASK-MRP-0025
title: Diff-as-evidence（混合版）
milestone: M25
status: done
started_at: 2026-05-21T03:50:00Z
started_by_agent: ClaudeCode_haiku-4.5
completed_at: 2026-05-21T04:10:00Z
blocked_by: [TASK-MRP-0010]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書v2.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
lastTransitionId: 2026-05-21T10-29-44-346Z-migrate-legacy-ledger-cbab7d8dc53c
lastTransitionAt: 2026-05-21T10:29:44.346Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.346Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:9816310011146f2ae3721e6f7f87ee8699bdf20fc5f276d9d153ee7eadd6da11
---

# TASK-MRP-0025 — Diff-as-evidence（混合版）

## 目標

目前提交 task evidence 需要手動撰寫 JSON（`changedFiles[]`、`intent`、`impact` 等欄位），這是 ATM 採用率最低的環節——Agent 和開發者在 close task 時嫌麻煩、亂填、甚至跳過。

**混合版 Diff-as-evidence**：從 git diff 自動萃取結構化程式碼變動資訊（what changed），讓人類或 Agent 只需補充**意圖**（why changed）。把 evidence 撰寫從 5 分鐘降到 30 秒。

---

## 「混合」的含義

| 欄位 | 來源 |
|------|------|
| `changedFiles[]` | **自動**：`git diff --name-only` |
| `linesAdded` / `linesDeleted` | **自動**：`git diff --stat` |
| `patchSummary` | **自動**：diff 壓縮摘要（前 N 行 + 統計） |
| `affectedAtoms[]` | **自動**：從 map.spec.json 反查哪些 atom 的 source 被改到 |
| `intent` | **人類/Agent 補充**：此改動的目的是什麼 |
| `impact` | **人類/Agent 補充**：對下游 atom 的影響說明 |
| `testCoverage` | **人類/Agent 補充**：如何驗證正確性 |

**`_isValid`**：`intent` 與 `impact` 皆填寫後才為 `true`；validator 在 close 時檢查此欄位，不通過則拒絕。

---

## CLI 設計

```bash
# 從 HEAD~1..HEAD 自動生成 evidence draft
node atm.mjs evidence diff --task TASK-MRP-0022 --json
# → evidence draft JSON，changedFiles/linesAdded/patchSummary/affectedAtoms 已填
#   intent/impact/testCoverage 為空字串，_isValid: false

# 輸出 draft 到檔案（Agent/人類補充後再 close）
node atm.mjs evidence diff --task TASK-MRP-0022 --output ./evidence-draft.json

# 從 staged changes 生成（尚未 commit）
node atm.mjs evidence diff --task TASK-MRP-0022 --staged --json

# 指定 commit range
node atm.mjs evidence diff --task TASK-MRP-0022 --from HEAD~3 --to HEAD --json
```

---

## Evidence Draft 格式

```json
{
  "taskId": "TASK-MRP-0022",
  "evidenceType": "diff-as-evidence",
  "generatedAt": "2026-05-21T...",
  "diffSource": "HEAD~1..HEAD",
  "changedFiles": [
    "packages/core/src/daemon/daemon-watcher.ts",
    "packages/core/src/cli/daemon.ts"
  ],
  "linesAdded": 234,
  "linesDeleted": 12,
  "patchSummary": "新增 daemon-watcher.ts 實作 chokidar 監聽，daemon.ts 新增 start/stop/status/log 四個子指令",
  "affectedAtoms": ["ATM-NPCBRAIN-0002"],
  "intent": "",        
  "impact": "",        
  "testCoverage": "",  
  "_isValid": false    
}
```

**補充完成後**（intent + impact 非空）：`_isValid: true`，可正常 close task。

---

## 前置依賴

無（使用標準 git CLI，不依賴其他 MRP 任務）

## 輸入

- git diff（HEAD~1..HEAD / staged / 自訂 range）
- map.spec.json（反查 affectedAtoms）
- task card（取得 taskId）

## 輸出

1. `node atm.mjs evidence diff --task <id> --json`
2. `node atm.mjs evidence diff --task <id> --output <path>`
3. `node atm.mjs evidence diff --task <id> --staged --json`
4. `schemas/evidence/diff-evidence.schema.json`（新增，向後相容現有 `atm.evidence` schema）

## 驗收條件

- [ ] `evidence diff --task X` 自動填入 changedFiles / linesAdded / patchSummary
- [ ] `affectedAtoms` 從 map.spec.json 反查被改到 source file 對應的 atomId
- [ ] `--staged` 模式從 staged changes 生成（非 HEAD diff）
- [ ] `--from / --to` 指定 commit range
- [ ] `intent` / `impact` 為空時，`_isValid: false`，close 時 validator 拒絕
- [ ] `intent` / `impact` 填完後，evidence 可正常通過 close validator
- [ ] evidence JSON 符合現有 `atm.evidence` schema（向後相容）

## 影響檔案

- `packages/core/src/evidence/diff-evidence.ts`（新增）
- `packages/core/src/cli/evidence.ts`（新增 `evidence diff` subcommand）
- `schemas/evidence/diff-evidence.schema.json`（新增）
- `tests/evidence/diff-evidence.test.ts`（新增）

## 穩定性護欄

| 風險 | 護欄 |
|------|------|
| 自動 evidence 撒謊（commit range 錯） | `diffSource` 必須記錄具體 `from..to`，且驗證 commit hash 存在 |
| `affectedAtoms` 反查漏 atom | warning：若 changedFile 不在任何 atom 範圍 → 加 `_unknownFiles` 警示 |
| 人工懶得補 intent → `_isValid` 形同虛設 | close validator 不只看 `_isValid: true`，必須 intent 字數 ≥ 10、impact 字數 ≥ 10 |
| Diff-evidence 取代真正驗證 | evidence schema 加 `evidenceType: "diff-as-evidence"` 標籤；review 時可篩出此類，確認非高風險改動 |
| 自動產出的 evidence 蓋掉手寫 evidence | 同一 task 多次 `evidence diff` 不覆寫已寫好的 intent/impact，只更新 diff 部分 |

## 回滾策略

**Level 1（不使用本功能）**：使用者照舊手寫 evidence，本功能完全不影響舊流程。

**Level 2（移除功能）**：移除 `diff-evidence.ts`、`evidence diff` CLI subcommand；現有 evidence schema 和 close 流程完全不受影響。

**Level 3（已 close 的 task evidence 不可信）**：如果發現某個時段的 diff-as-evidence 被亂用導致 close 不可信，使用 TASK-MRP-0027 的 `rescue diagnose --evidence-audit` 反查問題 evidence。

## 2026-05-21 v2-r2 審查補充

- Diff-as-evidence 只自動產生 what changed；不得由 AI 自動假造 intent、impact、testCoverage。
- `intent` / `impact` / `testCoverage` 任一缺失時 `_isValid=false`，close validator 必須拒絕。
- Patch summary 需限長與結構化，避免大型 diff 汙染 AI context。
- affectedAtoms 需來自 map/spec/registry 查詢，不可只靠檔名猜測。

新增驗收：
- [ ] 未填 intent/impact/testCoverage 時 `_isValid=false`
- [ ] complete/close 遇到 `_isValid=false` evidence 會 fail
- [ ] 大型 diff 只輸出限長摘要與統計
- [ ] affectedAtoms 由 registry/map 反查，並覆蓋找不到 atom 的 warning case

## Checklist

- [ ] git diff 解析（changedFiles / linesAdded / linesDeleted）
- [ ] patchSummary 壓縮邏輯（保留 N 行 context）
- [ ] affectedAtoms 反查（map.spec.json source file → atomId mapping）
- [ ] `--staged` 模式（git diff --cached）
- [ ] `--from / --to` commit range 模式
- [ ] `_isValid` 驗證邏輯
- [ ] CLI subcommand 整合
- [ ] schema 定義（向後相容）
- [ ] CHANGELOG 補記
