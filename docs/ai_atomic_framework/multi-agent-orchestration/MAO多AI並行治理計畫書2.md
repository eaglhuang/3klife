<!-- doc_id: doc_mao_plan_0002 -->

# MAO 多 AI 並行治理計畫書2 — Team Agents Wave Mode

Generated: 2026-06-16
Planning repo: 3KLife
Target framework: AI-Atomic-Framework / ATM
Status: planning source of truth

## 0. 定位

在 MAO 的下一段 M6，我們把 `Task` 與 `Wave` 整併，讓 Team Agents 在同一治理框架內可併行推進，但仍受一致性的 broker 控制。  
這一版不是要一次改很多檔，而是要讓「可併批」成立、可驗證、可關閉（closeout）。

- Team Agents 不會取代 Coordinator；Coordinator 仍是唯一全域治理權威。
- Batch queue 只處理能被治理證明的波次。
- Broker admission 必須先過 `CID / scope / shared file`。
- Patch envelope 接收 worker WIP，避免以未治理的實體工作樹做事實真相。
- Evidence 與 closure packet 要能回推到每一張 task。

這一版的名稱可用：

```text
Team Agents Wave Mode
```

也可理解為：

```text
Governed Team Wave
```

核心流程摘要如下：

```text
Captain / root router
  -> Team wave planner
  -> Broker admission
  -> Team Agents dispatch
  -> Worker reports
  -> Validator / reviewer / evidence agents
  -> Batch checkpoint
  -> Coordinator-only commit / closeout
```

## 1. 問題與原則

ATM 的 `next --prompt` 與 `next --claim` 已有單一路徑治理能力，但多檔共享、跨卡同時改動、共用 scope 時，原本機制會在實體 diff 形成後才集中暴露衝突。  
Team Agents Wave Mode 將判斷提前到**波次前置**，用邏輯方式先決定可否並行。

核心判斷要點：
- `dependencies`（DAG）
- `scopePaths` / `shared surface` / `atom/logical id`
- validator 覆蓋
- per-task evidence slicing 可行性
- wave diff 能否切回每張卡
- source done 不等於 governance done（必須 closeout）

## 2. 設計規範

### 2.1 波次規劃前置

Team Agents Wave Mode 在 MAO / Team Agents / batch primitives 上運作。  
主要流程入口：
- `next --prompt` / `next --claim`
- `batch checkpoint`
- `team plan` / `team validate` / `team start`
- Broker intent registry 與 conflict matrix
- Patch envelope / worker report

### 2.2 協同角色與生命週期

Worker 主要負責在 patch envelope 內完成 WIP 與回報。  
Coordinator / Captain 管控 checkpoint 與 closeout。  
Team Agents 任務生命週期必須完整經過：plan → validate → start → collect → checkpoint → closeout，不得跳段。

### 2.3 Wave 完成條件

Wave 完成不只看 diff 完成，還要滿足：
- wave runtime record 已建立
- execution envelope 可驗證
- 所有 worker report 已收斂
- evidence 可切片、可對應
- checkpoint verdict 可明確（done / partial / blocked / not-started）
- closeout 由 coordinator-only 通行

## 3. 端到端流程

```text
1. team wave plan
   - 選出本波任務並輸出 dependencies / scopePaths / atom_id / validators

2. team wave validate
   - Broker admission 驗證 CID / scope / shared surface / generated artifact
   - 檢查衝突矩陣與並行可行性

3. team wave start
   - 建立 wave runtime record
   - 建立 execution envelope
   - 分派 planner / writer / validator / reviewer / evidence roles

4. worker execution
   - worker 依 allowedFiles / shared surface 進行修改
   - 先回報 patch envelope
   - 回報主要測試、首個可重現失敗訊息

5. team wave collect
   - 收集 worker reports
   - validator 做核驗
   - reviewer 檢查 scope drift

6. team wave checkpoint
   - 由 wave diff 逐 task 切片並對應輸出
   - 標註 done / partial / blocked / not-started
   - 形成 checkpoint verdict

7. coordinator closeout
   - source commit
   - evidence / closure commit 與 batch checkpoint 同步
```

## 4. Wave 規則

### 4.1 單張波次（單卡）

- 完整驗證 dependencies、scopePaths、shared surface
- scope 能被 broker adapter 描述與審核
- validator 覆蓋到位
- target repo closeout 權責清楚
- generated artifact / runner / release 走 steward-only 規則
- wave diff 可切片出可驗證 deliverable

### 4.2 多張波次（並行卡）

- 共享 surface 可切片，且可保證 evidence 邏輯不交錯
- broker admission 與 validator 能逐卡判定
- 需要明確定義每張卡的權責：讀寫、回報、驗證、關帳
- schema 與對外契約先定義
- release artifact / runner / root launcher 僅由 steward-only path 寫入
- planning_repo / target_repo closure authority 分離且可追溯
- worker report 能還原成 per-task evidence

## 5. 主要 CLI

```powershell
node atm.mjs team wave plan --prompt "<phase or task family>" --json
node atm.mjs team wave validate --wave <wave-id> --json
node atm.mjs team wave start --wave <wave-id> --actor <id> --json
node atm.mjs team wave status --wave <wave-id> --compact --json
node atm.mjs team wave collect --wave <wave-id> --report <worker-report.json> --json
node atm.mjs team wave checkpoint --wave <wave-id> --actor <id> --json
```

`batch checkpoint` 是既有 closeout 視角的接軌命令；`team wave checkpoint` 是本波次的治理收斂命令。

## 6. 任務卡與波次

此批次任務 `TASK-MAO-0023` 到 `TASK-MAO-0034` 全部列在下列波次：

| Wave | 任務 | 優先權 | 目標 |
|---|---|---|---|
| M6A | `TASK-MAO-0023` | P0 | Team Agents Wave Mode architecture contract |
| M6B | `TASK-MAO-0024`, `0025` | P0 | wave planner 與 execution envelope |
| M6C | `TASK-MAO-0026`, `0027` | P0 | broker admission 與 runtime record |
| M6D | `TASK-MAO-0028`, `0029`, `0030` | P0 | worker report 與 per-task evidence 切片 |
| M6E | `TASK-MAO-0031`, `0032` | P0 / P1 | coordinator-only git/closeout 與 validator/reviewer 角色 |
| M6F | `TASK-MAO-0033`, `0034` | P0 / P1 | dogfood benchmark 與 operator docs |

## 7. 執行順序

### 7b. 依 objective 的波次執行順序（不含依賴例外）

- `TASK-MAO-0023`（前置：`TASK-MAO-0004`, `TASK-MAO-0005`, `TASK-MAO-0006`, `TASK-MAO-0009`）
- 同波：`TASK-MAO-0024` + `TASK-MAO-0025`（前提：`0023` + `0008` 完成）
- `TASK-MAO-0026`（序列化，需 `0024`）
- `TASK-MAO-0027`（序列化，需 `0025` + `0026`）
- `TASK-MAO-0028`（序列化，需 `0027`）
- 同波：`TASK-MAO-0029` + `TASK-MAO-0032`（需 `0028` 後啟動；共享 `atom-map` 由 broker / evidence slicing 控制）
- `TASK-MAO-0030`（序列化，需 `0029`）
- `TASK-MAO-0031`（序列化，需 `0030` 與 `0009`）
- `TASK-MAO-0033`（序列化，需 `0030` + `0031`）
- `TASK-MAO-0034`（最後，需 `0033` benchmark 證據成立）

| Task ID | Title | Priority | Depends | Target |
|---|---|---|---|---|
| `TASK-MAO-0023` | Team Agents wave mode architecture contract | P0 | `TASK-MAO-0004`, `TASK-MAO-0005`, `TASK-MAO-0006`, `TASK-MAO-0009` | planning + target spec |
| `TASK-MAO-0024` | Wave candidate planner and DAG grouping | P0 | `TASK-MAO-0023` | AAF |
| `TASK-MAO-0025` | Wave execution envelope schema | P0 | `TASK-MAO-0023`, `TASK-MAO-0008` | AAF |
| `TASK-MAO-0026` | Team wave broker admission integration | P0 | `TASK-MAO-0024`, `TASK-MAO-0005`, `TASK-MAO-0006` | AAF |
| `TASK-MAO-0027` | Team wave runtime record and dispatch surface | P0 | `TASK-MAO-0025`, `TASK-MAO-0026` | AAF |
| `TASK-MAO-0028` | Worker report ingestion contract | P0 | `TASK-MAO-0027`, `TASK-MAO-0008` | AAF |
| `TASK-MAO-0029` | Per-task evidence slicing from wave diff | P0 | `TASK-MAO-0028` | AAF |
| `TASK-MAO-0030` | Wave checkpoint partial-completion semantics | P0 | `TASK-MAO-0029`, `TASK-MAO-0027` | AAF |
| `TASK-MAO-0031` | Coordinator-only git and closeout guard for waves | P0 | `TASK-MAO-0030`, `TASK-MAO-0009` | AAF |
| `TASK-MAO-0032` | Validator and reviewer Team Agents roles for waves | P1 | `TASK-MAO-0027`, `TASK-MAO-0028` | AAF |
| `TASK-MAO-0033` | Team wave dogfood benchmark with CID Phase B shape | P0 | `TASK-MAO-0030`, `TASK-MAO-0031` | AAF |
| `TASK-MAO-0034` | Operator docs and migration guide for Team Agents Wave Mode | P1 | `TASK-MAO-0033` | AAF |

## 8. Dogfood benchmark

Wave benchmark 的目標是讓 Team Agents Wave Mode 先在內部可運作後才放大：

```text
Wave: broker adapter phase
Tasks:
  - adapter registry
  - generic JSON record adapter
  - text range adapter
  - numeric scalar adapter
Blocked until later:
  - path-to-atom-map domain adapter
  - batch planner / CAS write
  - adoption gate
```

完成條件：
- dogfood 波次是否可收斂（deliverables、evidence、closeout）
- 能否重現 typecheck + benchmark 關鍵測試
- `git diff --check` 通過
- evidence 至少可回推到 task 維度

## 9. 風險與收斂

- Team Agents Wave Mode 以 task lifecycle 為主：必須先把流程走完整，再關帳，不能只做部分改動後停住。
- `batch checkpoint` / closeout 是既有收斂路徑，切勿繞過。
- 角色責任不能模糊：worker report、validator、coordinator 各有邊界與交接點。
- shared file / scope drift 必須可追溯；存在不清楚情況就 block，不可硬關。
- wave diff 若無法切片到 per-task evidence，則標為 partial 或 blocked，不得直接 done。
- Unknown / ambiguous scope 需列為 open risk，直到可治理後才能放行。
