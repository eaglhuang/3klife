<!-- doc_id: doc_cid_plan_0003 -->

# CID 硬化補充計畫書 3

Generated: 2026-06-16  
Planning repo: 3KLife  
Target framework: AI-Atomic-Framework / ATM  
Status: planning source of truth

## 0. 目的

這份補充計畫承接 `TASK-CID-0099` 到 `TASK-CID-0103` 的 historical batch evidence 硬化成果，進一步處理另一個更基礎的治理缺口：

- 規則層已經開始要求 atom / atom-map 健康證據。
- 但正式登錄、owner-shard row、receipt、historical delivery 綁定，仍可能依賴人工補做。
- 未來 atom 與 atom-map 數量會持續成長，不能把 close 驗證建立在高成本全量逐筆掃描之上。

本計畫目標是把治理設計改成：

1. **正向保證為主**  
   AI 若新增或更新 atom / atom-map，必須透過 ATM 官方 CLI 或腳本入口，工具自動完成正式登錄與證據落地。

2. **任務級 delta 驗證為主**  
   close 時主要驗證本任務宣告與產出的 atomization delta，不做全宇宙逐筆掃描。

3. **總數與摘要雜湊為輔**  
   使用 cheap snapshot guard 偵測漏登錄、漏 receipt、漏 owner-shard row、異常漂移；只有在異常時才升級做 deeper audit。

4. **historical batch 與 CLI 文件一起正式化**  
   不能只有功能與測試，還要把 operator lane、CLI 指令、evidence schema、dogfood 用法寫成固定文件，避免未來又退回口耳相傳。

## 1. 背景判定

目前已確認的狀態如下：

- 一般 `evidence add/run` 已可寫入 `atomHealthClaims`。
- 一般 `tasks close` 的 evidence verify 已開始要求 `atom-or-map-health-evidence`。
- historical batch evidence 已能把 task slice、validator claim、coverage 狀態、atom health claim 帶入 close-ready 判斷。
- `tasks close --historical-batch ...` 與 `taskflow close --historical-batch ...` 已是明確需求方向，不能只存在零散 diff 與測試草稿中。

但是以下問題仍未完全封口：

- task card 若未正確填寫 `atomizationImpact.ownerAtomOrMap` / `mapUpdates`，close 無法精準要求哪幾個 atom / map 必須有健康證據。
- 新增 atom / atom-map 的正式登錄動作，仍可能散落在不同手動流程中。
- owner-shard row、projection rebuild、receipt、historical-delivery 綁定沒有單一入口保證一起發生。
- 目前若要反向確認「這個任務是否漏掉 atom / atom-map」，若採全量逐筆比對，未來成本太高。

## 2. 設計原則

### 2.1 正向入口唯一化

任何 AI 若要新增或更新 atom / atom-map，不應直接手改多個散落檔案，而應走官方 mutation surface：

- `node atm.mjs atom create ...`
- `node atm.mjs atom update ...`
- `node atm.mjs atom-map upsert-row ...`
- 或新的整合入口：`node atm.mjs atomize register ...`

這個入口必須一次完成：

- 正式 spec / metadata 寫入
- owner-shard row 寫入
- 必要 projection rebuild
- command-backed validator evidence
- machine-readable receipt
- task-scoped atomization delta event

### 2.2 證據固定路徑

工具產生的正式證據與 receipt 必須落在固定規則路徑，讓 AI 與 close guard 很容易找到：

```text
.atm/history/atomization-events/<taskId>/<timestamp>-<event>.json
.atm/history/atom-registry/<taskId>/<timestamp>-atom-<atomId>.json
.atm/history/atom-map-registry/<taskId>/<timestamp>-map-<mapId>.json
```

若為 MVP，可先只做單一路徑：

```text
.atm/history/atomization-events/<taskId>/<eventId>.json
```

其中每個 receipt 至少要包含：

- taskId
- actorId
- eventKind (`create-atom` / `update-atom` / `upsert-atom-map-row` / `rebuild-projection`)
- touched files
- affected atom ids
- affected atom-map ids
- validator commands
- validator results
- source commit / historical delivery ref（若有）
- createdAt

### 2.3 任務級 delta ledger

Close 驗證不掃全量 atom universe，而是驗證本任務的 delta ledger：

```json
{
  "schemaId": "atm.atomizationDelta.v1",
  "taskId": "TASK-CID-0104",
  "createdAtoms": ["..."],
  "updatedAtoms": ["..."],
  "createdAtomMapRows": ["path_pattern::atom_id"],
  "updatedAtomMapRows": ["path_pattern::atom_id"],
  "retiredAtoms": [],
  "retiredAtomMapRows": [],
  "receipts": ["...json"]
}
```

每一筆 delta 都必須能追到：

- 正式登錄檔
- owner-shard row
- 對應 receipt
- 至少一筆健康 validator 證據

### 2.4 Cheap reverse guard

只用前後總數比對不夠，因為會漏掉：

- 新增與刪除互相抵消
- rename / split / merge
- row update 但總數不變

因此 cheap reverse guard 應至少包含：

1. atom 總數
2. atom-map row 總數
3. atom identity digest
4. atom-map row identity digest

任務開始時記 snapshot：

```json
{
  "schemaId": "atm.atomizationSnapshot.v1",
  "taskId": "TASK-CID-0108",
  "atomCount": 0,
  "atomMapRowCount": 0,
  "atomIdentityDigest": "sha256:...",
  "atomMapRowDigest": "sha256:..."
}
```

任務結束時只驗：

- 起始 snapshot
- task delta ledger
- 結束 snapshot

若 count 或 digest 與預期 delta 不一致，再升級為 deeper audit。

### 2.5 Historical batch 必須成為正式治理文件的一部分

historical batch 不應只是一個 CLI 功能點，而必須有完整治理文件：

- 何時可以使用 historical batch
- 何時只能記錄 evidence、不能直接 close
- `taskSpecific` / `batchWide` / `advisory` validator 如何判定
- coverage incomplete / unmatched / diagnostic-only 的處置規則
- atom health claims 如何影響 `okToRecordEvidence` 與 `okToCloseTask`
- 與一般 `evidence add/run`、`tasks close`、`taskflow close` 的一致性要求

建議至少補這幾類文件：

- CLI command spec / help examples
- governance operator guide
- evidence schema / field contract
- dogfood report template

### 2.6 CLI 文件必須跟功能一起演進

凡是與這波相關的操作面，都不能只改程式碼，還必須同步補文件。最低限度包括：

- `evidence historical-batch`
- `tasks close --historical-batch`
- `taskflow close --historical-batch`
- atom / atom-map registration 官方入口
- delta ledger 與 snapshot guard 的 operator 指引

最低要求文件落點：

- `packages/cli/src/commands/command-specs/*.spec.ts`
- `README.md` 或對應 governance/operator 文件
- `docs/reports/*dogfood*.md`

## 3. 建議架構

```text
ATM Atomization Governance
  -> Mutation Surface
      -> atom create / update
      -> atom-map upsert-row
      -> atomize register
  -> Registry Writer
  -> Owner Shard Writer
  -> Projection Rebuilder
  -> Receipt Writer
  -> Delta Ledger Writer
  -> Snapshot Guard
  -> Close Verifier
```

## 4. Close 驗證新規則

任務若宣告或實際產生 atom / atom-map 變更，close 時至少要滿足：

1. 每個 required atom 都有正式登錄存在。
2. 每個 required atom-map row 都有正式 owner-shard row 存在。
3. 每個 required atom / map 都有至少一筆：
   - `generatedByTask = true`
   - `validatorHealthy = true`
4. task delta ledger 完整。
5. snapshot count / digest 與 delta 預期一致。

其中：

- 一般 `evidence add/run`
- `evidence historical-batch`
- `tasks close`
- `taskflow close`

都應能讀取這些 receipt 與 delta 結果，不再只依賴手寫 frontmatter。

## 5. 文件與 CLI 補充範圍

這波補充計畫除了 runtime 與 guard，還必須同步覆蓋以下文件面：

### 5.1 Historical batch 文件

- `evidence historical-batch` 命令用途、限制、欄位說明
- `okToRecordEvidence` / `okToCloseTask` 的規則
- `--allow-unmatched`、`--approved-by`、`--approval-reason` 的治理意義
- per-task coverage、validator mapping、atom health claim 的解釋

### 5.2 Close lane 文件

- `tasks close --historical-batch`
- `taskflow close --historical-batch`
- 何時應優先用 `taskflow close`
- 何時 historical batch 只能作為 evidence backfill，不能當 close lane

### 5.3 Atomization governance 文件

- 官方 atom / atom-map registration 入口
- receipt 路徑與欄位
- delta ledger 與 snapshot guard
- anomaly 時何時升級 deeper audit

## 6. 任務卡規劃

本補充計畫建議新增五張 CID 任務卡：

| 順序 | Task ID | 範圍 | 目的 | Depends |
|---:|---|---|---|---|
| 1 | `TASK-CID-0104` | planning/execution | Atom / atom-map 正向登錄工具與 receipt contract | `TASK-CID-0103` |
| 2 | `TASK-CID-0105` | execution | Owner-shard / projection / receipt 一次性寫入 orchestration | `TASK-CID-0104` |
| 3 | `TASK-CID-0106` | execution | Task-level atomization delta ledger 與 evidence integration | `TASK-CID-0104` |
| 4 | `TASK-CID-0107` | execution | Cheap snapshot guard（count + digest）與 close gate | `TASK-CID-0106` |
| 5 | `TASK-CID-0108` | validation/dogfood | Dogfood: atom / atom-map 官方入口 + delta close + anomaly detection | `TASK-CID-0105`, `TASK-CID-0106`, `TASK-CID-0107` |
| 6 | `TASK-CID-0109` | docs/cli | Historical batch and CLI operator documentation hardening | `TASK-CID-0103`, `TASK-CID-0108` |

## 7. 每張卡的重點

### TASK-CID-0104 - Atom / atom-map registration tool and receipt contract

建立官方 mutation surface 與 receipt schema，保證新增 atom / atom-map 不是散落手工流程。

### TASK-CID-0105 - Registry/orchestration writer

把正式登錄、owner-shard row、projection rebuild、receipt 寫入包成同一個 governed tool path。

### TASK-CID-0106 - Task-level atomization delta ledger

讓每個任務都能產出 machine-readable delta ledger，成為 close 驗證主體。

### TASK-CID-0107 - Snapshot count/digest guard

補 cheap reverse guard，避免全量逐筆比對；異常才升級 deeper audit。

### TASK-CID-0108 - Dogfood and adoption gate

用實際 atom / atom-map 變更案例驗證：

- 正向入口能自動留 receipt
- close 會驗 delta ledger
- count/digest guard 能抓異常
- 正常情境不需要高成本 full audit

### TASK-CID-0109 - Historical batch and CLI operator documentation hardening

把這波新增或擴充的 CLI 能力正式寫進 operator 文件與 command specs，避免功能存在、但人與 AI 找不到正確用法。

## 8. 驗證要求

至少包含：

- `npm run typecheck`
- `npm test`
- `git diff --check`
- focused tests：
  - 官方 atom / atom-map 入口會自動產出 receipt
  - owner-shard row / projection / receipt 缺一不可
  - delta ledger 可被一般 evidence/close 讀取
  - snapshot count/digest mismatch 會觸發 anomaly
  - 正常 delta close 不需要 full audit
  - command specs / operator docs 與實際 CLI flags 一致
  - historical batch 文件例子可對應真實命令面

## 9. Captain 判定

這波補充計畫的核心判定是：

- **正向保證比反向全量稽核更重要**
- **反向檢查不能只看總數，必須至少加 digest**
- **一般 ATM evidence / close 與 historical batch evidence 必須共用同一組 atom health / delta receipt 契約**

因此後續實作優先順序應先做：

1. 官方 mutation surface
2. receipt + registry/orchestration
3. task-level delta ledger
4. count/digest anomaly guard
5. dogfood 導入
6. historical batch 與 CLI operator 文件收口
