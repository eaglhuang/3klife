<!-- doc_id: doc_other_0150 -->
# 拆解大型功能優化原子map計畫書 — 里程碑與任務索引（§15–§17）

> 這是 `拆解大型功能優化原子map計畫書.md` 的「里程碑與任務索引（§15–§17）」分片。完整索引見 `docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md`。

## 15. 里程碑總表與 Checklist

每個里程碑都列出可勾選的 deterministic checklist。完成判定條件 = 該 checklist 全部勾選且 `git -C AI-Atomic-Framework status --short` 中對應檔案存在或變更。

### Milestone 1：文件定稿（M1）

對應任務卡：TASK-MRP-0000

- [x] `docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md` 存在且包含 §0–§17
- [x] 文件已被 ATM `README.md` 與 `docs/ARCHITECTURE.md` 引用；ATM repo 端只保留英文公開文件 `docs/MAP_REPLACEMENT_PROTOCOL.md`
- [x] 文件通過 UTF-8 編碼檢查（無 BOM、無 U+FFFD）
- [x] 目標 A、B 在 §14 有明確達成判斷
- [x] 風險清單 §12 + §14.3 已合併，沒有矛盾

執行狀態（2026-05-17）：TASK-MRP-0000 與 TASK-MRP-0001 已完成。ATM repo 已移除中文內部計畫與 TASK-MRP 任務卡，只保留英文公開說明與架構入口；後續 M2–M10 仍依 §15 順序執行。

### Milestone 2：Atomic Map Schema 0.2.0（M2）

對應任務卡：TASK-MRP-0002

- [x] `schemas/registry/atomic-map.schema.json` 的 `specVersion` 改為 `enum:["0.1.0","0.2.0"]`
- [x] 0.2.0 條件下開放 `members[].role`、`edges[].edgeKind`、`replacement.legacyUris`、`replacement.mode`、`replacement.evidenceRefs`
- [x] TypeScript 型別 `AtomicMapRecord` / `RegistryMapMemberRecord` / `RegistryMapEdgeRecord` 同步擴充
- [x] `createAtomicMapHashPayload()` 明確收錄 `members[].role`、`edges[].edgeKind`、`replacement.legacyUris`，排除 `replacement.mode` 與 `evidenceRefs`
- [x] `map-generator.ts` 在輸入提供 0.2.0 欄位時不丟欄位
- [x] 新增 0.1.0 / 0.2.0 fixture 回歸測試，並確認既有 0.1.0 generator 行為仍通過
- [x] `atomic-registry.json` map entry 序列化新欄位

執行狀態（2026-05-17）：TASK-MRP-0002 已完成。M2 core slice 已完成並通過 `atomic-map-schema.test.ts`、`map-generator.test.ts`、`validate-schemas.ts --mode validate`；ATM `CHANGELOG.md` 已補記 map replacement schema 0.2.0。

### Milestone 3：Map Equivalence Report Schema（M3）

對應任務卡：TASK-MRP-0003

- [x] 新增 `schemas/governance/map-equivalence-report.schema.json`
- [x] schemaId = `atm.mapEquivalenceReport`，specVersion = `0.1.0`，含 `migration` 區塊
- [x] `cases[]` 復用 regression-case 的 metric/evidence 形狀
- [x] 必填欄位：`mapId` / `legacyUris` / `fixtures` / `cases` / `summary` / `metrics` / `artifacts` / `evidence` / `passed`
- [x] `knownDivergences[]` 支援 `justification` 與 `reviewRef`，不能只有自由文字 reason
- [x] 至少 1 個 positive fixture + 1 個 negative fixture 存在於 `tests/schema-fixtures/`
- [x] AJV 編譯通過、`atm spec --validate` 驗證通過

執行狀態（2026-05-17）：TASK-MRP-0003 已完成。新增 `atm.mapEquivalenceReport` schema、正負 fixtures、schema manifest 註冊與 `atm spec --validate` report dispatch；`knownDivergences[]` 缺 `reviewRef` 時會被 deterministic schema 驗證拒絕。

### Milestone 4：Map Equivalence Test CLI（M4）

對應任務卡：TASK-MRP-0004

- [x] `node atm.mjs test --map <id> --equivalence-fixtures <path> --json` 可執行
- [x] 與 `--map`、`--propagate`、`--spec`、`--atom` 的 mutual exclusion 已明列在 usage
- [x] 產出檔案符合 `atm.mapEquivalenceReport` schema
- [x] 任何 `case.passed=false` 且未列入 `knownDivergences` 時 CLI 回傳非零 exit code
- [x] 報告寫入 `atomic_workbench/maps/<mapId>/map.equivalence.report.json`

已完成 delegated execution 版本：fixture 直接指定 `mapExecutor` / `legacyExecutor`，CLI 會比對雙方輸出並將 `knownDivergences` 納入 pass/fail gate。

### Milestone 5：Upgrade Gates（M5）

對應任務卡：TASK-MRP-0005

- [x] `packages/core/src/upgrade/propose.ts` 新增 input kind：`map-equivalence`、`rollback-proof`
- [x] target = map 時，`active` 需 `map-equivalence` 為 passed
- [x] target = map 時，`legacy-retired` 需 `rollback-proof` 的 `verificationStatus = passed` 且 validator 通過
- [x] 缺 evidence 時 proposal `status:"blocked"` 且 `blockedGateNames` 包含對應名稱
- [x] blocked proposal 需輸出 `requiredJustification` 或同等欄位，指明需要 evidence 或 human review 才能放行
- [x] `upgrade-map-propose.ts` CLI wrapper 暴露 `--replacement-mode` / `--equivalence-report` / `--rollback-proof` 旗標
- [x] 至少 1 個 negative fixture 證明 gate 真的會擋

已完成最小 gate 版本：`requestedReplacementMode=active` 會啟用 `mapEquivalence` gate，`requestedReplacementMode=legacy-retired` 會啟用 `rollbackProof` gate；proposal 通過後仍維持既有 contract 的 `status = pending`，由後續 human review / lane transition 接手，不直接自動核准。

### Milestone 6：Replacement Rollout Lane Transition（M6）

對應任務卡：TASK-MRP-0006

- [x] 新增 `packages/core/src/registry/replacement-lane.ts`：定義合法轉移表
- [x] `draft→shadow / shadow→canary / canary→active / active→legacy-retired` 各自有 evidence 前置條件
- [x] 轉移寫入 map `lineage-log.json`，至少包含 `from` / `to` / `reason` / `evidenceRefs` / `actor` / `timestamp`
- [x] 違法轉移時 throw `ATM_REPLACEMENT_TRANSITION_INVALID`
- [x] registry status 與 replacement mode 互不自動同步（雙向獨立）
- [x] 提供 `atm replacement-lane transition --map <id> --to <mode>` CLI 子命令

已完成最小 M6 實作：lane transition 以 canonical map spec 為控制面，forward-only rollout 會把 transition append 到 `lineage-log.json` 的 `transitions[]`，並同步更新 registry entry 的 mirrored `replacement.mode`，但不會改動 registry lifecycle `status`。

### Milestone 7：Decomposition Plan → Map（M7）

對應任務卡：TASK-MRP-0007

- [x] 新增 `schemas/governance/decomposition-plan.schema.json`
- [x] 欄位：`legacyUris[]` / `proposedMapId` / `proposedMembers[]` / `proposedEdges[]` / `entrypoints[]` / `notes`
- [x] `create-map --from-plan <path>` 支援讀取 plan 並建立 map
- [x] plan 缺 `legacyUris` 或 `proposedMapId` 時 hard-fail
- [x] 至少 1 個示範 plan（建議 `samples/checkout-mini.plan.json`）
- [x] 走完 plan → create-map → test --map → equivalence → upgrade gate 一次
- [x] plan 產生的 draft map 可再由 `create-map --spec` 路徑 round-trip

已完成最小 M7 實作：`atm.decompositionPlan` 會先被 schema 驗證，再轉成 0.2.0 replacement map request，強制把 `legacyUris` 寫入 `replacement.legacyUris`。為了讓 M7 smoke 成立，本階段同時內嵌了最小 `create-map --spec` round-trip slice；M9 後續只需收尾 `nextActionHint` 與 Windows 空白路徑 smoke 等 CLI contract 強化。

### Milestone 8：ScopeLock 0.2.0 與 Polymorph Impact（M8，可延後）

對應任務卡：TASK-MRP-0008

- [x] `schemas/governance/scope-lock.schema.json` 升級 0.2.0：新增 `selectors`
- [x] `selectors` 包含 `mapId` / `mapMembers[]` / `mapEdges[]` / `mapEntrypoints[]` / `legacyUris[]`
- [x] `ScopeLockRecord` 同步擴充
- [x] polymorph impact gate：對 replacement map 的 member atoms 掃描 template
- [x] 產出 `polymorph-impact-report.json` 且 active gate 在報告未通過時 block
- [x] 既有 0.1.0 lock 仍能 round-trip

已完成 M8 收口：`scope-lock` 目前同時接受 `0.1.0` 與帶 `selectors` 的 `0.2.0`，`packages/core/src/governance/scope-lock.ts` 會對 map selector 做 deterministic normalize。另一側新增 `atm.polymorphImpactReport` 與 `packages/core/src/polymorph/impact.ts`，會掃描 replacement map member atoms 的 template / instance 關係、列出 impacted instance maps、跑 template propagation，並在 `upgrade --propose --replacement-mode active` 上要求 `polymorph-impact` 證據，避免 template-bound members 未盤點就直接進 active。

### Milestone 9：Create Map From Spec + Replacement Next Hints（M9）

對應任務卡：TASK-MRP-0009

- [x] `create-map --spec <path>` 可讀取完整 draft map spec 並建立 canonical map workspace
- [x] spec 輸入通過 `atomic-map.schema.json` 驗證，invalid spec 回傳非零 exit code 與 `ATM_MAP_SPEC_INVALID`
- [x] `--spec` 支援 0.1.0 / 0.2.0 map，且 0.2.0 replacement 欄位不丟失
- [x] replacement 相關 CLI JSON output 提供 `nextActionHint`，指向下一個 deterministic command
- [x] `nextActionHint` 只引導 `atm next --json` 或既有 CLI，不引入 slash command runtime
- [x] Windows PowerShell 空白路徑 smoke test 通過

已完成 M9 收口：`create-map --spec` 會先走 `atomic-map.schema.json` 驗證，再建立 canonical map workspace；成功時輸出 `nextActionHint` 指向 `test --map`，`test --map --equivalence-fixtures` 會指向 `replacement-lane transition --to canary`，而 blocked 的 `upgrade --propose --replacement-mode active` 會輸出 machine-readable hint，指出缺的是 `map-equivalence` 並提供 deterministic CLI 模板。`create-map-from-spec.test.ts` 也補上 Windows PowerShell 空白路徑 smoke。

### Milestone 10：Replacement Evidence Closure + Retirement Proof（M10）

對應任務卡：TASK-MRP-0010

- [x] 定義或正式接入 `propagation-report` / `review-advisory` / `human-review` / `retirement-proof` input kind
- [x] `canary→active` gate 需要 map equivalence pass、propagation pass、review-advisory pass、human review approved
- [x] `active→legacy-retired` gate 接受 valid rollback-proof 或 valid retirement-proof，且需 caller / entrypoint risk cleared
- [x] 缺任一 evidence 時 proposal 或 transition `status:"blocked"`，並列出缺口名稱
- [x] positive / negative fixture 覆蓋 active 與 legacy-retired 兩條路徑
- [ ] 若最終決策不新增 retirement-proof，必須回改本計畫與 TASK-MRP-0005，明確收斂為只接受 rollback-proof

## 16. 任務卡索引

所有任務卡放在 3KLife 內部工作台的 `docs/ai_atomic_framework/map-replacement-protocol/tasks/` 下。ATM repo 不保存這批內部執行卡；ATM repo 只保留英文、開源友善的 protocol 解釋文件。任務卡格式為 Markdown + YAML frontmatter，欄位與 `governance-bundle` 的 `taskStorePath` 兼容（不強制存到 `.atm/history/tasks`，避免污染現有 governance 紀錄）。

| Task ID | 標題 | 對應里程碑 | 阻擋者 | 主要交付 |
|---|---|---|---|---|
| TASK-MRP-0000 | 文件定稿與 cross-link | M1 | — | 本計畫書 + 引用 |
| TASK-MRP-0001 | Replacement Protocol 概念對齊 ARCHITECTURE | M1 | TASK-MRP-0000 | ARCHITECTURE.md 補章 |
| TASK-MRP-0002 | Atomic Map Schema 0.2.0 | M2 | TASK-MRP-0000 | schema + 型別 + generator + hash |
| TASK-MRP-0003 | Map Equivalence Report Schema | M3 | TASK-MRP-0002 | schema + fixtures |
| TASK-MRP-0004 | Map Equivalence Test CLI | M4 | TASK-MRP-0003 | CLI runner + report 落地 |
| TASK-MRP-0005 | Upgrade Gates: equivalence + rollback | M5 | TASK-MRP-0003 / TASK-MRP-0004 | propose.ts input kind + gate |
| TASK-MRP-0006 | Replacement Lane Transition | M6 | TASK-MRP-0002 | lane validator + CLI + lineage |
| TASK-MRP-0007 | Decomposition Plan → Map | M7 | TASK-MRP-0002 / TASK-MRP-0006 | plan schema + `create-map --from-plan` |
| TASK-MRP-0008 | ScopeLock 0.2.0 + Polymorph Impact | M8 | TASK-MRP-0006 | lock schema + impact report |
| TASK-MRP-0009 | Create Map From Spec + Replacement Next Hints | M9 | TASK-MRP-0002 | `create-map --spec` + `nextActionHint` |
| TASK-MRP-0010 | Replacement Evidence Closure + Retirement Proof | M10 | TASK-MRP-0003 / TASK-MRP-0004 / TASK-MRP-0005 / TASK-MRP-0006 | propagation / review / human / retirement gates |

依賴順序建議執行：0000 → 0001 → 0002 → 0003 → 0004 → 0005 → 0006 → 0007 → 0009 → 0010 → 0008。其中 0003 / 0006 / 0007 / 0009 可在 0002 完成後並行，0008 可延後。

## 17. 外部五機制導入論述評估與本計畫關係

本章評估「AI-Atomic-Framework × 外部五機制導入優化計畫」是否應補入本計畫。結論是：**應補入取捨與邊界，但不應把它併成 M3–M10 的核心實作任務**。

原因很清楚：本計畫的主題是 **Map Replacement Protocol**，目標是讓 map 成為新功能 / legacy 大功能的正式替代表面；外部五機制導入的主題則是 **ATM 無痛導入與 Agent Operating Layer 強化**，目標是讓 agent 一進專案就自動遵守 ATM 精神。兩者高度互補，但責任邊界不同。

因此，本計畫只吸收與 map replacement 直接相關的「Agent 入口與規則注入原則」，其餘應另開「ATM Agent Pack / Onboarding」計畫，不阻塞 M3–M10。

### 17.1 總判斷

| 外部導入機制 | 是否值得加 | 是否放入本計畫主線 | 判斷 |
|---|---|---|---|
| Agent Pack SDK + Claude Code Pack | 值得 | 不放入 M3–M10，另案 | 解決 ATM 規則靠 agent 自願讀的摩擦，但屬於 onboarding / agent integration，不是 map replacement 核心 |
| Constitution Render Pipeline | 部分值得 | 不放入 M3–M10，另案；M5 可借鑑 gate 思路 | `guards.json` → markdown constitution 的渲染可改善規則可見性，但 ATM 仍應以 machine-readable contract 為 source of truth |
| Slash command 模板 + `atm next` 動態槽位 | 值得 | 可作為 M7 後的 optional UX layer | 與 ATM 哲學相容，前提是模板只引導呼叫 `atm next --json`，不可 baked-in 完整流程 |
| npm publish + `npx create-atm` | 值得 | 不放入本計畫 | 是 ATM 開源採用策略，不影響 replacement map schema / equivalence / rollout gate |
| `atm welcome` + next chain | 值得 | 不放入本計畫；可列為後續入口體驗 | 可幫助 agent 進入 ATM，但不應變成 replacement protocol 的前置條件 |

### 17.2 值得吸收的部分

以下概念應納入本計畫的設計約束，但不必變成本計畫的新里程碑：

1. **靜態入口模板只能是導引，不是權威**：若未來有 `/atm-map-replace`、`/atm-next` 或 Claude / Copilot prompt 模板，模板只能要求 agent 呼叫 `node atm.mjs next --json` 或 replacement CLI，不可把完整 M3–M10 流程寫死在 prompt 裡。
2. **map replacement gate 需要 justification pattern**：M5 upgrade gates 可以借鑑外部規則閘門的「違規必須說明」模式。若 equivalence 缺失、known divergence 未被接受、或 rollback proof 不足，proposal 必須 blocked；若允許例外，例外必須出現在 evidence / human review 裡，而不是口頭放行。
3. **多 agent 注入要保持 source of truth 單一**：若未來 agent-pack 會產出 ATM map replacement prompt，prompt 內容必須由 schema / guards / protocol 文件渲染，不得讓 Claude、Copilot、Cursor 各自長出不同規則。
4. **Windows 第一公民**：外部導入流程常見的 sh / ps 雙版腳本提醒有價值。M4 / M7 若新增 equivalence runner 或 `create-map --from-plan` 周邊 helper，必須確認 Windows PowerShell 路徑與空白路徑可用。
5. **manifest sha256 防漂移**：未來若 M7 後提供示範 project injection 或 sample command，應用 manifest hash 追蹤產物，避免 agent 手改後還以為是 canonical template。

### 17.3 不應放入本計畫主線的部分

以下內容有價值，但應另開「ATM Agent Pack / Onboarding」計畫，不應污染 Map Replacement Protocol：

1. `packages/agent-pack-sdk/` 與多 agent pack 套件。
2. `packages/create-atm/`、npm publish、`npx create-atm`。
3. `atm welcome` 一鍵入門命令。
4. 自動生成 `docs/multi-agent-compatibility-matrix.md`。
5. 通用 constitution render pipeline。

這些屬於 ATM 開源採用與 agent operating layer 的橫向能力。若把它們塞進本計畫，M3–M10 的 replacement protocol 會被 onboarding 工程拖慢，且驗收邊界會混亂。

### 17.4 明確不採用的部分

以下外部導入做法不適合直接套到 ATM map replacement：

1. **不採用完整 baked-in slash command 流程**：ATM 的核心優勢是 `atm next --json` 動態路由。若把完整步驟寫進 prompt，ATM 會退化成靜態 prompt 框架，且與 registry / evidence / upgrade gate 脫節。
2. **不採用外部專案工作目錄取代 `.atm/`**：ATM 已有 `.atm/runtime`、`.atm/tasks`、`.atm/locks`、`.atm/evidence`、`.atm/history/handoff` 等治理樹。新增另一套隱含工作目錄會造成雙狀態源。
3. **不把 `constitution.md` 當唯一真相來源**：ATM 的 source of truth 應保持 JSON Schema / machine-readable guards / registry contracts。Markdown constitution 可以是渲染產物，不應反過來變成權威。
4. **不把 agent-pack 命名成 adapter**：ATM adapter 是 I/O / host integration 抽象；agent-pack 是 agent 視角的檔案注入與 prompt 包。兩者混名會破壞架構語意。
5. **不讓 onboarding 成為 replacement 的 gate 前置**：map replacement 應可在沒有 agent-pack、沒有 slash command 的情況下用 CLI / schema / tests 完成。Agent-pack 只能改善體驗，不能成為 protocol 正確性的必要條件。

### 17.5 對 M3–M10 的調整建議

本章不新增 M3–M10 的硬依賴，但建議在後續實作時套用以下微調：

1. **M3 Map Equivalence Report Schema**：新增 `justification` / `knownDivergences[].reviewRef` 欄位時，可參考 constitution gate 的「違規必須說明」模式。
2. **M4 Map Equivalence Test CLI**：CLI help 與 JSON output 可提供 `nextActionHint`，但不要引入 slash command runtime。
3. **M5 Upgrade Gates**：blocked proposal 應要求 evidence 或 human review justification，這是分段閘門思想在 ATM contract 世界中的正確落點。
4. **M6 Replacement Rollout Lane**：lineage log 可記錄 transition 的 `reason` / `evidenceRefs` / `actor`，避免 shadow→canary→active 變成口頭流程。
5. **M7 Decomposition Plan → Map**：未來若 agent-pack 介入，應只是幫 agent 產出或定位 decomposition plan；真正建立 map 仍由 `create-map --from-plan` 負責。
6. **M9 Create Map From Spec + Replacement Next Hints**：`nextActionHint` 只能指向 deterministic CLI 或 `atm next --json`，不可變成靜態 prompt workflow。
7. **M10 Replacement Evidence Closure + Retirement Proof**：propagation / review / human evidence 應落在 machine-readable gate，不應只寫在 markdown checklist。

### 17.6 後續另案建議

建議另開一份獨立計畫書：`docs/ai_atomic_framework/agent-pack-onboarding/02_ATM_agent-pack-onboarding計畫書.md`。該計畫才適合承接：

1. Agent Pack SDK。
2. Claude Code / Cursor / Copilot / Gemini / Windsurf pack。
3. Constitution Render Pipeline。
4. npm publish / `npx create-atm`。
5. `atm welcome`。

該另案應以「無痛引入 ATM」為主題，而不是以「map replacement」為主題。兩案的關係是：Agent Pack / Onboarding 讓 agent 更容易正確使用 ATM；Map Replacement Protocol 則定義大型功能拆解後 map 如何正式接管 legacy / new feature。前者是入口體驗，後者是治理語義，不能互相取代。
