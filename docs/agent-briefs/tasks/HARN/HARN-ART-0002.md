---
doc_id: doc_task_0007
id: HARN-ART-0002
priority: P0
phase: Phase1
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: done
started_at: 2026-05-04T20:04:58+08:00
started_by_agent: GitHubCopilot
type: validation-tooling
chain_id: HARN-CHAIN-ARTIFACT
chain_step: 2/4
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-ART-0001
notes: "2026-05-04 | 狀態: done | 驗證: scratch/pilot-turn-artifact.json strict pass；valid fixture strict pass；schema-invalid 與 invariant-invalid fixture strict fail；get_errors=0；encoding=touched pass；compute-gate standard 6/6 pass | 變更: 新增 tools_node/validate-turn-artifact.js，導入 Ajv schema pass + invariant pass，並補 tests/fixtures/harness invalid fixtures | 阻塞: none"
---

# [HARN-ART-0002] 建立 Turn Artifact Validator CLI

> **Harness rollout 開卡** — 由 `turn-artifact/v1` pilot 成果延伸
> **定位**：Phase 1 / Artifact contract 第 2 步
> **前置依賴**：`HARN-ART-0001` schema 已存在

## 問題描述

有 schema 仍不夠。這份 artifact 會被多個工具共用，除了 JSON Schema 驗證，還需要額外檢查：

- `kind` 與 `schemaVersion` 是否對得上
- `files[*]` 與 `totals.files / textFiles / imageFiles / otherFiles` 是否一致
- `summaryCard.task/goal/read` 是否齊全
- 路徑是否已正規化，避免混入絕對路徑或空字串

這張卡的目標是提供一個可以被 CLI、測試與後續 workflow 直接呼叫的 validator，而不是讓每個工具自己重寫一套檢查邏輯。

## INPUT_CONTRACT

- `tools_node/schemas/turn-artifact.schema.json` 已存在
- `scratch/pilot-turn-artifact.json` 可作為 smoke fixture
- `package.json` 可新增對外 script，但不是必要條件

## OUTPUT_CONTRACT

- [x] 新增 `tools_node/validate-turn-artifact.js`
- [x] 支援 `--artifact <path>` 與 `--strict`
- [x] 先跑 schema 驗證，再跑 invariant 檢查（totals、path、summaryCard）
- [x] strict fail 時 exit code = 1，pass 時印出摘要
- [x] 錯誤訊息需直接指出欄位名稱與修補方向，方便後續 Agent 自修

## VALIDATION_CMD

```bash
node tools_node/validate-turn-artifact.js --artifact scratch/pilot-turn-artifact.json --strict
```

## ROLLBACK_HINT

```bash
git checkout tools_node/validate-turn-artifact.js
git checkout tests/fixtures/harness/turn-artifact.invalid-schema.json
git checkout tests/fixtures/harness/turn-artifact.invalid-invariant.json
git checkout package.json
git checkout package-lock.json
```

## 執行步驟

1. 先把 schema 驗證與 invariant 驗證拆成兩層，避免錯誤訊息混在一起。
2. 補 `files/totals` 一致性檢查，避免 artifact 看似合法但計數錯誤。
3. 對 `summaryCard` 建立最小內容要求，確保 handoff 不會只剩空殼。
4. 路徑一律檢查為 repo-relative 風格，避免後續 comparison 被環境差異污染。
5. 預留非 strict 模式，供 metrics 或查詢工具做 warn-only 掃描。

---
*由 Harness rollout planning 開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：已達成
- 驗證證據：已新增 `tools_node/validate-turn-artifact.js`；`scratch/pilot-turn-artifact.json` 與 `tests/fixtures/harness/turn-artifact.valid.json` strict pass；`tests/fixtures/harness/turn-artifact.invalid-schema.json` 與 `tests/fixtures/harness/turn-artifact.invalid-invariant.json` strict fail，證明 schema/invariant 兩層都已生效。
- 需修改：下一步可轉入 `HARN-HDO-0001` 重用這條 validator gate，或補 `HARN-ART-0003/0004` 的標準路徑政策。
