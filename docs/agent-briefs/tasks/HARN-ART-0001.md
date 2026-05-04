---
doc_id: doc_task_0006
id: HARN-ART-0001
priority: P0
phase: Phase1
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: done
started_at: 2026-05-04T19:32:05+08:00
started_by_agent: GitHubCopilot
type: artifact-contract
chain_id: HARN-CHAIN-ARTIFACT
chain_step: 1/4
sensor_triggered_by: harness-rollout planning
depends:
  []
notes: "2026-05-04 | 狀態: done | 驗證: turn-artifact schema + pilot fixture + canonical fixture parse ok；get_errors=0 | 變更: 新增 tools_node/schemas/turn-artifact.schema.json 與 tests/fixtures/harness/turn-artifact.valid.json，補齊 v1 契約、baseline fixture 與升版規則 | 阻塞: none"
---

# [HARN-ART-0001] 建立 Turn Artifact Schema 與版本契約

> **Harness rollout 開卡** — 由 `docs/inside-openai-agent-collaboration-study-notes.md` 與 `Harness 落地任務卡藍圖` 開立
> **定位**：Phase 1 / Artifact contract 第 1 步
> **前置現況**：`turn-artifact/v1` pilot 已可由 `generate-context-summary.js` 與 `finalize-agent-turn.js` 產出

## 問題描述

目前 `turn-artifact/v1` 已能輸出 JSON，但仍屬於 ad hoc artifact：

- 沒有正式 schema，無法保證欄位不被後續工具靜默改壞
- `schemaVersion` / `kind` / `totals` / `summaryCard` 只靠程式內約定，沒有獨立契約
- 後續 handoff validator、trace attachment、metrics accumulator 都需要穩定的資料結構作為共同基礎

這張卡的目標不是再擴欄位，而是先把現有 `turn-artifact/v1` 收斂為可驗證、可升版的正式契約。

## INPUT_CONTRACT

- `tools_node/generate-context-summary.js` 已支援 `--artifact-json`
- `tools_node/finalize-agent-turn.js` 已支援 `--emit-turn-artifact` 與 `--artifact-file`
- `scratch/pilot-turn-artifact.json` 已存在，可作為第一個 valid fixture

## OUTPUT_CONTRACT

- [x] 新增 `tools_node/schemas/turn-artifact.schema.json`
- [x] schema 明確定義 `schemaVersion`、`kind`、`generatedAt`、`workflow`、`task`、`goal`、`source`、`totals`、`files`、`summaryCard`
- [x] schema 對 `files[*].path`、`totals.*`、`summaryCard.read/known/need/avoid` 建立最小必填規則
- [x] 補一份 valid fixture 說明或 fixture copy，明確標示 pilot artifact 是第一個 baseline
- [x] 文件註明未來升版規則：新增欄位如何相容、何時升 `schemaVersion`

## VALIDATION_CMD

```bash
node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('tools_node/schemas/turn-artifact.schema.json','utf8')); JSON.parse(fs.readFileSync('scratch/pilot-turn-artifact.json','utf8')); JSON.parse(fs.readFileSync('tests/fixtures/harness/turn-artifact.valid.json','utf8')); console.log('turn-artifact schema + fixtures parse ok');"
```

## ROLLBACK_HINT

```bash
git checkout tools_node/schemas/
git checkout scratch/pilot-turn-artifact.json
git checkout tests/fixtures/harness/turn-artifact.valid.json
```

## 執行步驟

1. 盤點目前 `turn-artifact/v1` 已穩定存在的欄位，不先引入第二版欄位。
2. 以 JSON Schema 收斂「必填欄位」與「資料型態」，先避免明顯漂移。
3. 將 pilot artifact 視為第一份 canonical valid sample，補上 fixture 用途說明。
4. 明確寫下版本升級規則，避免後續工具各自擴欄位卻沒同步契約。
5. 為下一張 `HARN-ART-0002` 預留 validator 所需的 invariant 檢查點。

---
*由 Harness rollout planning 開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：已達成
- 驗證證據：已新增 `tools_node/schemas/turn-artifact.schema.json` 與 `tests/fixtures/harness/turn-artifact.valid.json`；`node -e` parse check 通過，`get_errors` 為 0。
- 需修改：下一步轉入 `HARN-ART-0002`，補上 schema 驗證 + invariant validator CLI。
