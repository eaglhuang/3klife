<!-- doc_id: doc_other_0148 -->
# 拆解大型功能優化原子map計畫書 — Workflow 與 Lifecycle（§6–§10）

> 這是 `拆解大型功能優化原子map計畫書.md` 的「Workflow 與 Lifecycle（§6–§10）」分片。完整索引見 `docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md`。

## 6. CLI 工作流

### 6.1 Create map

現有 `create-map` 只接受 CLI JSON 字串。後續可新增：

1. `create-map --spec <path>`：從完整 draft map spec 建立。
2. `create-map --from-plan <path>`：從 decomposition plan 建立。

短期不必一次實作兩者；優先支援 `--spec`，因為它最符合 deterministic artifact workflow。

### 6.2 Map integration

沿用既有：`node atm.mjs test --map <mapId> --json`。

### 6.3 Map equivalence

建議擴充 test command：`node atm.mjs test --map <mapId> --equivalence-fixtures <path> --json`。

若選擇新增 `--map-equivalence <mapId>`，必須同步修改 `test.ts` 的 mutual exclusion 規則，避免和現有 `--map`、`--propagate`、`--spec`、`--atom` 衝突。

### 6.4 Propagation

沿用既有：`node atm.mjs test --propagate <atomId> --json`。

任何 active/canary replacement map 的 member atom 發生重要變更時，必須跑 propagation。

### 6.5 Upgrade proposal

`upgrade-map-propose.ts` 目前只是薄 wrapper，真正 gate 在 `packages/core/src/upgrade/propose.ts`。因此 replacement gate 應在 `propose.ts` 中新增 input kind 與 automated gate。

需要新增 input kind：

1. `map-equivalence`
2. `rollback-proof`

Active replacement 必須有 passing map equivalence report；legacy-retired 必須有 rollback proof 或 retirement proof。

## 7. Replacement lifecycle

Replacement lifecycle 是 map replacement 的 rollout lane，不取代 registry status。

1. `draft`：map 已建立，但尚未宣稱可替代功能。
2. `shadow`：map 與 legacy 並行執行，只比對輸出，不影響正式結果。
3. `canary`：map 接小範圍場景或測試流量，仍保留 rollback path。
4. `active`：map 成為正式功能入口。
5. `legacy-retired`：原 legacy 入口退場，或只保留為已過期 lineage evidence。

轉移規則：

1. `draft -> shadow`：需要 map integration pass。
2. `shadow -> canary`：需要 map equivalence pass，且 known divergences 可接受。
3. `canary -> active`：需要 map equivalence pass、propagation pass、review-advisory pass、human review approved。
4. `active -> legacy-retired`：需要 rollback proof 或 retirement proof，且 caller/entrypoint 風險已清空。

## 8. ScopeLock 與 map-level selector

現有 ScopeLock schema 與 `ScopeLockRecord` 只有 `files`，不能直接鎖 map members、edges、entrypoints 或 replacement target。後續應升級 ScopeLock 0.2.0。

建議新增 `selectors`：

1. `mapId`
2. `mapMembers[]`
3. `mapEdges[]`
4. `mapEntrypoints[]`
5. `legacyUris[]`

在沒有 ScopeLock 0.2.0 前，replacement 任務至少要鎖住：map spec、map integration test、equivalence report、legacy entrypoint、相關 atom spec/code/test。

## 9. Polymorph impact gate

目前 `polymorph/template.ts` 的 `propagateTemplateUpgrade()` 是輕量 helper，尚不是完整 replacement discovery/report 系統。因此 polymorph impact gate 不應被假設已存在。

後續需要補：

1. 掃描 replacement map 的 member atoms 是否屬於 polymorph template 或 instance。
2. 找出受影響 instance maps。
3. 跑 instance map propagation。
4. 產出 polymorph impact report。
5. 在 active gate 中消費該 report。

## 10. MVP 里程碑

### Milestone 1：文件定稿

新增並維護 3KLife 內部工作台文件 `docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md`，確認 Map Replacement Protocol 的語意、非目標、schema 邊界、CLI 流程與 gate 規則。ATM repo 只保留英文公開說明 `docs/MAP_REPLACEMENT_PROTOCOL.md`。

### Milestone 2：Atomic map schema 0.2.0

擴充 `atomic-map.schema.json`、TypeScript 型別、map generator、map registry entry、generated integration test。

### Milestone 3：Map equivalence report

新增 map-oriented equivalence report schema，復用 regression case / metrics / evidence 的語意。

### Milestone 4：Test CLI

支援 map equivalence runner，產出 deterministic report。

### Milestone 5：Upgrade gates

擴充 `upgrade/propose.ts`，納入 `map-equivalence` 與 `rollback-proof` input kind。

### Milestone 6：Replacement Rollout Lane Transition

把 `draft → shadow → canary → active → legacy-retired` 落成 transition validator、CLI 與 lineage log，且 registry status 與 replacement mode 不自動同步。

### Milestone 7：Decomposition Plan → Map

新增 decomposition plan schema 與 `create-map --from-plan`，讓大型功能拆解產物強制包含 map 入口與 replacement target。

### Milestone 8：ScopeLock 與 polymorph 後補

ScopeLock 0.2.0 與 polymorph impact gate 放在後續，避免阻塞 MVP。

### Milestone 9：Create Map From Spec 與 Agent Next Hints

補齊 `create-map --spec <path>`，作為 deterministic artifact workflow 的優先入口；同時讓 replacement 相關 CLI JSON output 能提供 `nextActionHint`，但不引入 slash command runtime。

### Milestone 10：Replacement Evidence Closure 與 Retirement Proof

補齊 active / legacy-retired gate 的 evidence 閉環：propagation pass、review-advisory pass、human review approved，以及 rollback proof 或 retirement proof 的正式 input kind / schema / gate 行為。
