<!-- doc_id: doc_cid_plan_0002 -->

# CID 硬化計畫書 2：AGR 與 Broker Format Adapter 擴充

Generated: 2026-06-15
Planning repo: 3KLife
Target framework: AI-Atomic-Framework / ATM
Status: planning source of truth

Source inputs:

- `C:\Users\User\3KLife\docs\ai_atomic_framework\agr-virtual-atomization-implementation-plan.md`
- `C:\Users\User\3KLife\docs\ai_atomic_framework\cid-hardening\CID硬化計畫書.md`
- `C:\Users\User\3KLife\docs\ai_atomic_framework\cid-hardening\00-verified-facts.md`
- 2026-06-15 設計討論：`path-to-atom-map.json` 類 shared JSON 資料檔案的 CID 衝突與 brokered write 擴充。

## 0. 定位

本文件是 CID hardening 第二階段計畫，承接 `TASK-CID-0026` 起的 AGR（Adaptive Granularity Refinement）任務線，並新增一條 `TASK-CID-0091` 起的 Broker Format Adapter / Plugin 任務線。

第一階段 CID 判斷主要處理 atom / file / lease 的衝突分類，但 `path-to-atom-map.json` 這類資料檔案暴露一個更細的問題：同一個實體檔案內可能有多筆彼此獨立的 logical data id。若只用檔案層級鎖，會過度阻塞；若讓多個 agent 同時直接寫檔，又會造成 lost update。

本計畫採用以下原則：

- Broker 是唯一寫入入口，agent 不直接寫 shared mutable files。
- Broker core 不理解 JSON、文字檔、數字檔或其他格式細節。
- 每種格式或領域資料型態透過 adapter / plugin 提供 parse、conflict key、merge、validate、serialize。
- 新格式加入時只新增 adapter，不改 broker core。
- 無 adapter 時退回保守的 file-level lock。

## 1. AGR 既有任務線摘要

AGR 任務線以 `TASK-CID-0026` 到 `TASK-CID-0039` 為主，目標是把「同檔不同語意區塊」的衝突判斷從單純檔案 overlap 推進到 virtual atom / read-set / write-set / broker decision rule。

| Milestone | 任務 | 目的 |
|---|---|---|
| M0 | `TASK-CID-0026` ~ `TASK-CID-0027` | AGR baseline survey 與 implementation pack |
| M1 | `TASK-CID-0028` ~ `TASK-CID-0030` | EnclosingUnit / VirtualAtom SDK 與 Layer 1 syntactic enclosure |
| M2 | `TASK-CID-0031` ~ `TASK-CID-0033` | Layer 2 decomposition trigger、read-set contract、adapter manifest |
| M3 | `TASK-CID-0034` ~ `TASK-CID-0036` | mid-execution registry、neutral writer、claim / closeout integration |
| M4 | `TASK-CID-0037` ~ `TASK-CID-0039` | validator benchmark、ship review、dispatch pack |

AGR 解決的是「程式碼或語意區域」粒度不足；本文件新增的 Broker Format Adapter 線解決的是「資料檔案內部結構」粒度不足。兩者互補，不互相取代。

## 2. 新問題：資料檔案不是單一衝突單位

### 2.1 代表案例

`atomic_workbench/atomization-coverage/path-to-atom-map.json` 是典型 shared data file。它是一個 JSON 容器，但其內部每一筆 path / atom mapping 才是真正的 logical data row。

衝突判斷不能只看：

- 同一個檔案：一定衝突。
- 不同檔案：一定安全。

更合理的判斷是：

- 同檔不同 data id / JSON pointer：可由 broker 合併。
- 同檔同 data id：必須序列化，或由 adapter 判定 operation 可交換。
- 同檔但修改 schema version、排序、checksum、metadata：即使 data id 不同也可能衝突。

### 2.2 不接受的做法

- 讓兩個 writer 同時直接寫同一個 JSON 檔。
- 為 JSON 做一套繞過 broker 的平行寫入系統。
- 用 CID collision 計算硬解所有格式內部資料衝突。
- 每遇到一種格式就把格式邏輯寫死進 broker core。

## 3. 目標架構：Broker Core + Format Adapter Plugin

```text
Mutation Broker
  -> FileType Resolver
  -> Format Adapter Registry
      -> JSON Adapter
      -> Text Adapter
      -> Numeric Adapter
      -> YAML/TOML Adapter
      -> Domain Adapter
  -> Conflict Planner
  -> Commit Engine
  -> Evidence Recorder
```

### 3.1 Broker core 責任

- 接收 mutation request。
- 解析 target file 與 adapter。
- 排程 queue / batch。
- 呼叫 adapter 取得 conflict keys。
- 判斷是否可併批、需排隊、或需人工仲裁。
- 以 CAS / atomic write 寫回檔案。
- 記錄 evidence、actor、base hash、result hash、merge decision。

### 3.2 Format adapter 責任

- 判斷是否支援該檔案。
- parse 原始檔案。
- normalize mutation request。
- 回傳 conflict keys。
- 判斷重疊 mutation 是否可 merge。
- merge 多筆 mutation。
- serialize 回檔案。
- validate 結構與 domain invariant。

### 3.3 Domain adapter 責任

格式不等於語意。`package.json`、`path-to-atom-map.json`、`tasks.json` 都是 JSON，但衝突規則不同。因此需要 domain adapter 覆蓋 format adapter：

```text
JsonAdapter: 知道 JSON pointer / object merge / array handling。
AtomMapAdapter: 知道 path-to-atom-map 的 row id、owner atom、projection、shard invariant。
TaskLedgerAdapter: 知道 task id、status transition、closure evidence invariant。
```

## 4. Adapter contract 草案

```ts
interface FileMutationAdapter {
  id: string;
  supports(file: FileDescriptor): boolean;

  parse(input: Buffer | string): ParsedDocument;

  normalize(request: MutationRequest): NormalizedMutation[];

  getConflictKeys(mutation: NormalizedMutation): ConflictKey[];

  canMerge(a: NormalizedMutation, b: NormalizedMutation): MergeDecision;

  merge(base: ParsedDocument, mutations: NormalizedMutation[]): ParsedDocument;

  serialize(document: ParsedDocument): Buffer | string;

  validate?(document: ParsedDocument): ValidationResult;
}
```

```ts
type MutationRequest = {
  filePath: string;
  formatHint?: "json" | "text" | "number" | "yaml" | "toml";
  actorId: string;
  baseHash?: string;
  operation: string;
  target: string;
  value?: unknown;
  metadata?: Record<string, unknown>;
};
```

```ts
type ConflictKey = {
  filePath: string;
  scope: "file" | "record" | "range" | "line" | "scalar" | "semantic";
  key: string;
};
```

## 5. 合併與排隊規則

| 條件 | Broker 行為 |
|---|---|
| conflict key 不重疊 | 可併批，交給 adapter merge |
| conflict key 重疊但 adapter 判定 operation 可交換 | 可合併，需 evidence 記錄 merge rule |
| conflict key 重疊且不可交換 | 序列化排隊或回報 conflict |
| adapter 不存在 | 退回 file-level lock |
| validate 失敗 | 拒絕寫入並保留 failed evidence |
| CAS base hash 不一致 | re-read、re-plan；仍衝突則排隊或人工仲裁 |

## 6. 新任務卡數量與順序

本輪新增 8 張 CID 任務卡，接續現有 `TASK-CID-0090`，編號 `TASK-CID-0091` 到 `TASK-CID-0098`。

| 順序 | Task ID | 類型 | 目標 | Depends |
|---:|---|---|---|---|
| 1 | `TASK-CID-0091` | planning | Broker format adapter architecture RFC | `TASK-CID-0090` |
| 2 | `TASK-CID-0092` | execution | Mutation broker adapter registry contract | `TASK-CID-0091` |
| 3 | `TASK-CID-0093` | execution | Generic JSON record adapter and conflict keys | `TASK-CID-0092` |
| 4 | `TASK-CID-0094` | execution | `path-to-atom-map.json` domain adapter | `TASK-CID-0093` |
| 5 | `TASK-CID-0095` | execution | Text range adapter with conservative merge rules | `TASK-CID-0092` |
| 6 | `TASK-CID-0096` | execution | Numeric scalar adapter for commutative operations | `TASK-CID-0092` |
| 7 | `TASK-CID-0097` | execution | Broker batch planner, CAS, atomic write evidence | `TASK-CID-0093`, `TASK-CID-0095`, `TASK-CID-0096` |
| 8 | `TASK-CID-0098` | validation | Dogfood benchmark and adoption gate | `TASK-CID-0094`, `TASK-CID-0097` |

建議執行順序：`0091 -> 0092 -> 0093 -> 0094 -> 0095 -> 0096 -> 0097 -> 0098`。

`0095` 與 `0096` 可在 `0092` 後平行，但 `0097` 必須等 JSON、文字、數字三類 adapter 至少有 contract fixture 後再整合。`0098` 是 ship/no-ship gate。

## 7. 任務卡摘要

### TASK-CID-0091 - Broker format adapter architecture RFC

建立 broker core / format adapter / domain adapter 的責任邊界，明確禁止格式邏輯寫死進 broker core，並定義 unknown format 的 fail-closed fallback。

### TASK-CID-0092 - Mutation broker adapter registry contract

在 AI-Atomic-Framework 內建立 adapter registry contract、mutation request schema、conflict key schema、merge decision schema，以及 fallback file-level adapter。

### TASK-CID-0093 - Generic JSON record adapter and conflict keys

實作一般 JSON adapter，支援 JSON pointer / record-level conflict key / object upsert / add-if-absent / replace 等基本 operation。

### TASK-CID-0094 - path-to-atom-map domain adapter

在 JSON adapter 之上建立 `path-to-atom-map.json` domain adapter，使用 path row / atom id / owner shard invariant 判斷是否可併批。

### TASK-CID-0095 - Text range adapter with conservative merge rules

實作文字檔 adapter，支援 append、insertAfterHeading、replaceRange 等保守 operation；重疊 range 預設衝突。

### TASK-CID-0096 - Numeric scalar adapter for commutative operations

實作數字檔 / scalar value adapter，支援 increment、decrement、max、min、set-if-current 等 operation；只有可交換運算可合併。

### TASK-CID-0097 - Broker batch planner, CAS, atomic write evidence

整合 adapter conflict keys，完成 batch planner、CAS re-read / re-plan、atomic write、evidence packet。

### TASK-CID-0098 - Dogfood benchmark and adoption gate

建立 benchmark：同檔不同 JSON row、同 row 衝突、文字 range overlap、numeric increment、unknown format fallback，輸出 ship/no-ship report。

## 8. 驗收總準則

- Broker core 不含 JSON / text / numeric 的 hard-coded merge logic。
- 新格式可透過 adapter 註冊，不需修改 broker core 排程模型。
- `path-to-atom-map.json` 不再只能用整檔案鎖處理不同 row 的安全合併。
- 同一 data id 或同一 semantic row 的 mutation 不會被誤判為可平行。
- Unknown format 仍保守安全，不因缺 adapter 而放行。
- 所有合併與拒絕都留下 command-backed evidence。

## 9. Unity / Cocos 對照

可以把 broker 想成 Unity Editor 的 AssetDatabase 寫入協調層，adapter 像不同 importer / serializer：JSON、文字、數字檔各有自己的解析與保存規則，但都經過同一個 editor transaction 管線。Cocos Creator 裡也類似資產資料庫刷新：不能讓多個 writer 任意改同一份 meta / asset 資料，而是要透過統一入口維持一致性。

這個設計把「寫入治理」留在 broker，把「格式知識」留在 adapter，把「業務語意」留在 domain plugin，避免未來每新增一種資料檔就污染 broker core。
