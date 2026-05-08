<!-- doc_id: doc_other_0043 -->
# ATM 框架演進執行規劃書

> 產出日期：2026-05-06
> 對照來源：`關於進化版的原子提案.md`、`AI原子框架開發計畫書.md`、`docs/tasks/tasks-atm.json` thin index 與 `docs/tasks/tasks-atm/tasks-atm-part-*.json`。
> 原則：已標記 `done` 的任務卡不得重開或改寫，只能作為下游基礎；新增能力一律以 open 任務補充或新卡承接。

---

## 1. 當前機讀真相與文件不一致

`docs/tasks/tasks-atm.json` 目前 summary 為 `done=32 / open=55 / in_progress=0 / total=87`。本輪已完成 v2 規劃落地：`ATM-0-0002` 已同步為 `done`，附錄 A 新增 11 張演化任務卡，附錄 B 新增 4 張 Atomic Map 任務卡。因此，提案與主計畫中仍提到「71 張任務卡」、「ATM-2-0004 in-progress」、「ATM-2 僅 3 done + 1 in-progress」或「v1 基準 72 張」的段落皆視為歷史基準。

| 項目 | 提案 / 主計畫舊敘述 | 機讀真相 | 處置 |
|---|---|---|---|
| 任務總數 | 71 張 / v1 機讀 72 張 | 87 張 | 後續文件應改以 thin index summary 為準；本輪新增 15 張 open 卡。 |
| ATM-2-0004 | in-progress，可自然延伸 versions[] / rollback | `done`，commit `7da6730` | 不可改卡；版本歷史與 rollback 改開 follow-up。 |
| ATM-2-0013 | 未被提案納入核心排序 | `done` | 視為 canonical per-atom folder 基礎：預設 home = `atomic_workbench/atoms/ATM-CORE-0123/` 這種格式，資料夾名稱必須等於 Atomic ID，本輪後續文件一律沿用此規則。 |
| in-progress 任務 | 提案列 1 張 | 0 張 | 本輪規劃只校正 `open` 任務與新增卡。 |

---

## 2. 需修正的提案不合理處

### 2.1 「演化管線不需新工具」表述過度簡化

提案主張誕生管線與演化管線共享同一組工具，方向正確，但不應推論為「只在現有工具加版本比較即可」。演化模式至少多出四個不可混入誕生模式的狀態：

1. 舊版本 fixture / hash / evidence 的不可變基線。
2. 新舊品質指標的可比較 schema。
3. upgrade proposal 與 human review queue 的審核狀態。
4. rollback target、rollback proof 與 registry current pointer 的一致性。

修正建議：共享 `ParseSpec / RunTest / Validate / ComputeHash / UpdateRegistry / Regression` 等核心原子，但必須在 SDK 層明確加入 `lifecycleMode = birth | evolution`，並把版本歷史、品質比較、審核佇列、rollback 拆成 follow-up 任務。

### 2.2 把 versions[] / rollback 塞回 ATM-2-0004 已不合法

ATM-2-0004 已完成，且交付範圍是 JSON-first registry + spec/code/test hash lock MVP。提案第 III / IV 部分把 `versions[]`、rollback、hash diff report 視為 ATM-2-0004 的自然延伸，違反「不變動已完成任務」原則。

修正建議：以 `ATM-2-0014` 起的新卡承接 registry version history、hash diff report、rollback pointer。

### 2.3 alpha0 / alpha1 邊界被演化需求稀釋

主計畫已定義 alpha0 只證明空白 repo 可跑 hello-world atom 與最小治理證據；完整 Default Governance Bundle 與演化閉環屬 alpha1。提案若把 quality comparison、human review、usage feedback 全部壓進 alpha0，會讓 alpha0 critical path 膨脹。

修正建議：alpha0 只保留 deterministic hash-lock / police / self-host gate；演化專用能力分批進 alpha1。

### 2.4 000003 / 000004 未開卡，卻被列入核心 000001-000010 流程

目前已完成 `000001 ParseAtomicSpec`、`000002 GenerateAtomicScaffold`、`000005 RunAtomicTest`、`000007 ComputeAtomicHash`、`000008 UpdateAtomicRegistry`。但 `000003 BuildAgentPrompt` 與 `000004 ExecuteAgentTask` 無直接任務卡；若不補卡，後續 Adapter 只能手工串接，無法證明「AI 受控加工」生命週期完整。

修正建議：新增 BuildAgentPrompt 與 ExecuteAgentTask 任務，且 ExecuteAgentTask 必須是 effect node / dry-run first，不得直接修改 host project。

---

## 3. 現有 open 任務校正建議

以下只提出修改建議，不改動已完成任務卡。

| 任務卡 | 現況 | 校正建議 | 目的 |
|---|---|---|---|
| ATM-0-0002 | done；名詞定義 ATM prefix 已同步 JSON / MD | 不再作為新增 ATM-2-0014+ 阻塞；僅保留為代號治理依據。 | 避免把已完成治理卡重新放回 alpha0 critical path。 |
| ATM-2-0005 | Police plugin API | acceptance 增加 `birth/evolution mode`、`nonRegression`、`qualityComparison`、`registryCandidate` JSON report；違規時不可 promote 新版本。 | 支援版本比較與品質警察。 |
| ATM-2-0006 | Adapter API / Plugin SDK | 增加 `AtomLifecycleMode`、`VersionResolver`、`QualityMetricsComparator`、`UpgradeProposalAdapter` interface。 | 讓 Adapter 可區分誕生與演化。 |
| ATM-2-0007 | Governance Bundle schema | 先保留 alpha0 最小 WorkItem / ScopeLock；把 upgrade proposal / review queue 標為 alpha1 schema。 | 防止 alpha0 過度膨脹。 |
| ATM-2-0008 | Reference plugins | acceptance 補「reference plugin 不可被 core import」之外，再補 version-history / review queue 為 alpha1 plugin。 | 維持 core 輕量與可替換。 |
| ATM-2-0009 | Artifact / Log / Evidence Store | evidence schema 加 `usage-feedback`、`quality-baseline`、`quality-comparison`、`rollback-proof` 四類；所有 evidence 需可回放。 | 收集演化品質指標。 |
| ATM-2-0010 | Neutrality boundary guard | 增加 upgrade proposal / evidence report 的 adopter 私有資訊掃描。 | 防止演化報告污染 upstream。 |
| ATM-2-0011 | Context budget guard | 增加大型 quality report 的摘要 / hard-stop contract。 | 防止演化報告拖垮 Agent context。 |
| ATM-2-0012 | neutralityScanner atom + CI | 直接使用 ATM-2-0013 的 canonical atom folder：`atomic_workbench/atoms/ATM-CORE-0123/` 這種格式；不要散放 spec/code/test/report，也不要另建 alias folder。 | 支撐後續自我治理原子。 |
| ATM-2.5-0001 | self-host-alpha verify CLI | alpha0 只驗最小 gate；version history / rollback 僅輸出 readiness warning，不作 blocker。 | 保持 alpha0 可落地。 |
| ATM-2.5-0002 | Sandbox Repo Fixture | fixture 應固定 hello-world birth pipeline；演化 fixture 延後到 alpha1 sandbox。 | 分離誕生與演化驗證。 |
| ATM-2.5-0003 | confidence gate | 可新增 upgrade dry-run confidence，但不得阻塞 alpha0。 | 收集跨 agent 兼容風險。 |
| ATM-3-0001~0013 | 3KLife adapter | alpha0 pass 後先做 shadow/parity；演化 evidence capture 必須依賴 ATM-2-0009 與新增 upgrade schema。 | 避免 Adapter 過早綁定未定稿演化格式。 |
| ATM-4-0001~0006 | H2U case study | 第一輪只做 birth / dry-run injection；演化 pilot 另開新卡，不改既有 case atom 目標。 | 避免 H2U regression 與演化閉環互相污染。 |
| ATM-5-0003/0005 | Lifecycle / PEV Loop | 補 framework semver、atom compatibility、PEV 與 upgrade proposal 的正式文件規則。 | 把演化治理寫進公開生命週期。 |

---

## 4. 新增任務規劃

以下 11 張演化任務卡已實際開卡並寫入 `docs/tasks/tasks-atm/*`；doc_id 已登錄於 `doc_task_0317` ~ `doc_task_0327`。附錄 B 另新增 4 張 Atomic Map 任務卡（`doc_task_0328` ~ `doc_task_0331`）。

| 建議卡號 | 名稱 | 階段 | 依賴 | 預期產出 |
|---|---|---|---|---|
| ATM-2-0014 | Registry Version History v0.1 | alpha1-prep | ATM-2-0004, ATM-2-0013 | registry `currentVersion` / `versions[]` schema、migration fixture、舊 registry 相容測試。 |
| ATM-2-0015 | Hash Drift / Version Diff Report | alpha1-prep | ATM-2-0014 | `hash-diff-report.schema.json`、spec/code/test hash delta、drift reason 欄位。 |
| ATM-2-0016 | Test Report Quality Metrics Extension | alpha1-prep | ATM-2-0003, ATM-2-0009 | latency / errorRate / coverage / edgeCaseCount 指標 schema 與 fixtures。 |
| ATM-2-0017 | Regression Matrix Compare Gate | alpha1-prep | ATM-2-0005, ATM-2-0016 | vOld fixtures against vNew code、coverage delta、quality comparison report。 |
| ATM-2-0018 | BuildAgentPrompt bootstrap atom（000003） | alpha0+ | ATM-2-0001, ATM-2-0002, ATM-2-0005 | 從 spec 產生受控 AI prompt，含 forbidden rules、allowed files、evidence contract。 |
| ATM-2-0019 | ExecuteAgentTask effect node dry-run（000004） | alpha0+ | ATM-2-0018, ATM-2-0006 | effect node contract、dry-run executor、artifact/log capture，不直接 apply patch。 |
| ATM-2-0020 | ProposeAtomicUpgrade（000012） | alpha1 | ATM-2-0015, ATM-2-0016, ATM-2-0017 | `upgrade-proposal.schema.json`、CLI `atm upgrade --propose --dry-run`。 |
| ATM-2-0021 | HumanReviewGate（000013） | alpha1 | ATM-2-0020, ATM-2-0008 | `.atm/reports/upgrade-proposals.json`、approve/reject schema、decision log。 |
| ATM-2-0022 | Rollback Registry Pointer & Proof | alpha1 | ATM-2-0014, ATM-2-0021 | `atm rollback --plan`、rollback proof、currentVersion pointer 更新規則。 |
| ATM-3-0014 | 3KLife UsageEvidence shadow adapter | alpha1 | ATM-3-0001, ATM-2-0009, ATM-2-0016 | 只讀 artifacts / compute-gate / logs，產 usage-feedback evidence，不改既有 CLI。 |
| ATM-4-0007 | H2U atom v1.0→v1.1 evolution pilot | alpha1 | ATM-4-0003, ATM-2-0020, ATM-2-0021 | 以 normalizeCssColor 做首次 upgrade proposal + human review dry-run。 |

---

## 5. 依賴關係與階段重排

### 5.1 alpha0 最短可驗證路徑

1. `ATM-2-0005`：Police + ValidateAtomicOutput + 最小 Regression check。
2. `ATM-2-0012`：neutralityScanner atom，使用 `atomic_workbench/atoms/ATM-CORE-0123/` 這種 canonical folder 格式。
3. `ATM-2.5-0001`：self-host-alpha verify CLI。
4. `ATM-2.5-0002`：空白 sandbox repo 跑完整 alpha0 deterministic gate。

建議補依賴：`ATM-2.5-0001` 應明確依賴 `ATM-2-0007` 的最小 WorkItem / ScopeLock schema，或在 `ATM-2-0005` 驗收中明確說明 alpha0 governance evidence 來源。

### 5.2 alpha0 後、Adapter 前的核心原子補洞

Adapter 接入前應補齊核心 000001-000010 的缺口：

| 原子 | 狀態 / 任務 | 排序建議 |
|---|---|---|
| 000001 ParseAtomicSpec | ATM-2-0001 done | 不變動。 |
| 000002 GenerateAtomicScaffold | ATM-2-0002 done | 不變動。 |
| 000003 BuildAgentPrompt | 新卡 ATM-2-0018 | alpha0 pass 後優先補。 |
| 000004 ExecuteAgentTask | 新卡 ATM-2-0019 | 必須 dry-run / effect node。 |
| 000005 RunAtomicTest | ATM-2-0003 done | metrics 由 ATM-2-0016 follow-up。 |
| 000006 ValidateAtomicOutput | ATM-2-0005 open | alpha0 critical。 |
| 000007 ComputeAtomicHash | ATM-2-0004 done | diff report 由 ATM-2-0015 follow-up。 |
| 000008 UpdateAtomicRegistry | ATM-2-0004 done | versions[] 由 ATM-2-0014 follow-up。 |
| 000009 InjectAtomicIntoLegacy | ATM-4-0005 / ATM-3 adapter | alpha0 後，只允許 dry-run。 |
| 000010 RunRegressionMatrix | ATM-2-0005 + ATM-2-0017 | alpha0 最小不退轉，alpha1 品質比較。 |

### 5.3 alpha1 演化閉環

alpha1 的第一條完整演化鏈建議為：

`ATM-2-0014 → ATM-2-0015 → ATM-2-0016 → ATM-2-0017 → ATM-2-0020 → ATM-2-0021 → ATM-2-0022 → ATM-3-0014 → ATM-4-0007`

此鏈條刻意放在 alpha0 之後，避免演化能力反向阻塞空白 repo hello-world 自舉。

---

## 6. 開發風險清單

| 風險 | 嚴重度 | 觸發點 | 防範 |
|---|---|---|---|
| 把演化狀態塞進已完成 MVP | 高 | 對 ATM-2-0003/0004 追加需求 | 全部改由 follow-up 新卡承接。 |
| 誕生與演化共用 registry update 造成 currentVersion 污染 | 高 | `UpdateRegistry` 未區分 new entry / promote version | 引入 `birth/evolution` mode 與 registry transaction report。 |
| 品質指標不可比 | 中高 | 不同 runner / adapter 產出的 metrics 欄位不同 | ATM-2-0016 先定最小共同 metrics schema。 |
| rollback 只回 registry 不回實檔 | 高 | 只更新 `currentVersion` | rollback proof 必須含 spec/code/test hash 驗證與 artifact source。 |
| human review 被做成 core dependency | 中 | core 直接 import review queue plugin | HumanReviewGate 放 reference plugin / effect node，不進 core hard dependency。 |
| alpha0 被 alpha1 願景拖慢 | 高 | 把 usage feedback / review queue 納入 self-host gate blocker | alpha0 gate 僅 deterministic；演化只做 readiness warning。 |
| downstream adapter 過早綁定未定稿 schema | 中 | 3KLife adapter 先於 evidence / SDK 定稿 | ATM-3 先 shadow/parity，演化 evidence adapter 延到 ATM-3-0014。 |

---

## 7. 已完成項排除清單

以 `docs/tasks/tasks-atm.json` thin index 與 `docs/tasks/tasks-atm/tasks-atm-part-*.json` rebuild 後的 `status=done` 為唯一真相；本規劃不再人工維護靜態排除清單。

所有 done 卡（包含 `ATM-0-0002`、ATM-1 / ATM-1.5 已完成卡、`ATM-2-0001` ~ `ATM-2-0004`、`ATM-2-0013` 等）只作為依賴基礎。對 done 卡產生的新需求，必須使用 follow-up 任務卡或下游 open 任務補充，不得回頭擴張原驗收標準。

---

## 8. 結論

進化版提案的核心方向可採納：誕生管線與演化管線應共享 ATM 的基礎原子；但提案中「不需要新工具」與「ATM-2-0004 自然延伸」兩點需修正。合理路徑是：alpha0 先守住可自舉的 birth pipeline；alpha1 再以版本歷史、品質指標、upgrade proposal、human review 與 rollback proof 補出 evolution pipeline。這樣才能同時遵守已完成任務不變動、核心原子 000001-000010 先支撐 Adapter、以及 upstream/downstream 邊界不混線三項原則。

---

## 附錄 A：v2 校正補丁（2026-05-06）

> 本附錄原作為 v1 主結構補丁；2026-05-06 已同步回寫 §1、§3、§4、§5、§7，後續以主文與本附錄一致後的版本為準。

### A.1 真相同步

- v2 + 附錄 B 落地後 `summary = { done: 32, in_progress: 0, open: 55, total: 87 }`，數字與 §1 一致；後續若再對齊，**一律以 thin index summary 為唯一真相**，不再人工列舉。
- §7 排除清單改為：`thin index status=done` 全部凍結（含 `ATM-0-0010 / 0011 / 0013 / 0014`、`ATM-2-0013` 等），不再人工列舉避免漏項。
- `ATM-0-0002` 的 `.md` frontmatter 與 JSON shard 已同步為 `done`（completed 2026-05-06），並已從 §5.1 alpha0 critical path 移除「等待 ATM-0-0002」這一步。

### A.2 9 項硬約束（落地為任務卡 acceptance）

1. **ATM-2-0014 schema-additive only**：不得修改既有 `packages/core/src/registry/*` 對外契約；舊 registry fixture 必須維持全綠；只能新增 `currentVersion` 與 `versions[]` 欄位。
2. **lifecycleMode 落點**：`birth | evolution` enum 寫入 `packages/plugin-sdk/src/lifecycle.ts`（由 ATM-2-0006 承接），並映射回 `schemas/atomic-spec.schema.json` 既有 `compatibility` 區塊；不另開新 schema。
3. **HumanReviewGate 永遠是 reference plugin**：ATM-2-0021 以 `packages/plugin-human-review/*` 形式提供；core 僅依賴 schema，不依賴實作；hard dependency 違規由 ATM-2-0010 layer-boundary scanner 阻擋。
4. **Neutrality scanner 範圍**：ATM-2-0010 的 deterministic / semantic 掃描必須同時涵蓋 `.atm/reports/upgrade-proposals/*` 與 evidence-store payload；adopter 私有資訊（如 3KLife / Cocos / UCUF）一律 hard fail。
5. **ATM-0-0002 階段降權**：已 done，從 alpha0 critical path 移除；新增 ATM-2-0014+ 不再受其阻塞。
6. **rollback proof 規格**：ATM-2-0022 acceptance 寫死「rollback 後執行 `atm verify --self`，spec/code/test 三段 hash 必須與目標版本 registry entry 完全一致；任一不符即 hard fail 並產出 `rollback-proof.failure.json`」。
7. **shard 容量先行檢查**：開新卡前必跑 `node tools_node/rebuild-tasks-atm-auto-parts.js`，若 part-22 已逼近 10KB / 300 行，由 store 自動切 part-23+，不手動管理。
8. **regression 不退轉**：所有 evolution-mode 工具新增時，birth-mode 既有 fixture 必須維持全綠；違規由 ATM-2-0017 compare gate 阻擋。
9. **alpha0 邊界守則**：alpha0 critical path 任何一步若需要 evolution 能力，立即停下重評估；evolution 在 alpha0 只可作為 advisory / readiness warning，不可作 blocker。

### A.3 替代方案備註

- **方案 B（合併 ATM-2-0014~0017 為單一 Pack）**：違反「一卡一驗收」，不採用。
- **方案 C（BuildAgentPrompt / ExecuteAgentTask 升格為 ATM-CORE-0004/0005 自舉）**：alpha0 critical path 會重新洗牌，不採用；維持 ATM-2-0018/0019 卡片粒度。

### A.4 實作順序覆寫 §5

由於 ATM-0-0002 已 done，alpha0 critical path 改為：

1. 補強並落地 `ATM-2-0005`（含 lifecycleMode 報告欄位）。
2. 落地 `ATM-2-0012` neutralityScanner（落於 `atomic_workbench/atoms/ATM-CORE-0123/` 這種格式，資料夾名稱直接等於 Atomic ID）。
3. 通過 `ATM-2.5-0001` / `ATM-2.5-0002` deterministic gate。

α0+ 補洞：`ATM-2-0018` → `ATM-2-0019`。

α1-prep（演化基礎）：`ATM-2-0014` → `ATM-2-0015` → `ATM-2-0016` → `ATM-2-0017`，並補強 `ATM-2-0006/0007/0008/0009/0010/0011` acceptance。

α1-prep 補強（識別 / 查詢層）：`ATM-2-0047` 承接 canonical ID 的派生 URN resolver 與 `RegistryIndex` façade。它只包住既有 `entries[]` registry document，不回頭改 `ATM-2-0004` scope，也不占用已存在的 `ATM-3-0010 ~ ATM-3-0013` adapter 任務卡號。

α1 演化閉環首次完整驗證：`ATM-2-0020` → `ATM-2-0021` → `ATM-2-0022` → `ATM-3-0014` → `ATM-4-0007`。

---

## 附錄 B：原子地圖（Atomic Map）演化（2026-05-06）

> 補強：使用者於 v2 補丁後追加共識——重要功能的品質往往來自 **多個原子組成的 Atomic Map**，演化必須同時涵蓋「單一原子」與「原子地圖」兩個層級。

### B.1 核心定義

- **Atomic Map**：由多個 atom 透過 dependency / composition 組成的結構，自身有 `mapId` 與 `mapVersion`。
- **Map Composition Hash**：`mapHash = hash(sorted(atomId@version[]) + edges + entrypoints)`；任一成員 atom 升版都會反映到 mapHash。
- **品質量化目標**：每個 map 必須有可量化的 `qualityTargets`（例如 errorRate / latency / coverage / domain-specific KPI），作為比較基準。

### B.2 演化決策：版本升級 vs. 拆出新原子

每次 evolution proposal 必須先做一次 **decomposition decision**：

| 訊號 | 建議路徑 |
|---|---|
| 改動局限於單一 atom 內部、API 契約不變 | atom version bump（v1.0 → v1.1） |
| 行為差異大到會破壞既有 consumer 期待 | 拆出新 atom（atom v1.0 保留 + atom-fork v1.0 新增），map 改 edge 指向 |
| 改動跨越多個 atom 邊界 | map version bump（mapVersion 升級），同時對涉及 atom 做個別決策 |

decision 必須記錄在 `upgrade-proposal.json` 的 `decompositionDecision` 欄位（enum: `atom-bump | atom-extract | map-bump`），由自動 gate + 人類審核共同確認。

### B.3 整合測試硬規則

任一 atom 升版或 map 升版時，**必須**：

1. 跑該 atom 自身的 birth-mode regression（既有 ATM-2-0005 / 0017 已涵蓋）。
2. 跑 **所有引用該 atom 的 map** 的整合測試套件（map-level integration tests）。
3. 跑 **所有應用該 map 的 consumer atom / adapter** 的 application-level smoke tests。

任一層綠燈不全 → upgrade proposal 自動標記 `status=blocked`，不進 review queue。

### B.4 任務卡延伸（追加於 §B 章節 acceptance）

下列既有新卡 acceptance 在 v2 批次落地時已併入，但因屬於本附錄共識，特此索引：

| 卡號 | 追加內容 |
|---|---|
| ATM-2-0017 | quality-comparison-report 必須含 `mapImpactScope`（被影響的 mapIds[]）與 `propagationStatus`（per-map 整合測試結果）。 |
| ATM-2-0020 | upgrade-proposal.schema.json 增加 `decompositionDecision`、`mapImpactScope` 兩欄；CLI 新增 `--target atom|map` 切換。 |
| ATM-2-0022 | rollback 支援 `--target map`；map rollback 需同時驗證所有成員 atom 的 hash 與目標 mapVersion 一致。 |

### B.5 新增任務卡（map 層級）

| 卡號 | 名稱 | 階段 | 依賴 |
|---|---|---|---|
| ATM-2-0023 | Atomic Map Schema & Registry | α1-prep | ATM-2-0014 |
| ATM-2-0024 | Map-Level Upgrade & Extract-vs-Bump Decision | α1 | ATM-2-0020, ATM-2-0023 |
| ATM-2-0025 | Cross-Atom Integration Test Runner | α1 | ATM-2-0003, ATM-2-0023 |
| ATM-4-0008 | H2U Map Evolution Pilot | α1 | ATM-4-0007, ATM-2-0024, ATM-2-0025 |

詳細 acceptance / deliverables 見對應任務卡。


---

## 附錄 C：第三輪批判性審核（2026-05-07）

> 本附錄不重啟既有驗收，僅針對附錄 A / B 落地後再次漂移的機讀真相與新開鏈條做缺口分析。所有建議一律以 **既有 open 卡 acceptance 補丁** 或 **新 follow-up open 卡** 形式承接，不回頭改動 done 卡。

### C.1 機讀真相再次漂移

`docs/tasks/tasks-atm.json` 目前 summary 為 `done=48 / in_progress=1 / open=58 / total=107`，相對附錄 A 當時的 `done=32 / total=87` 已增加 16 張 done 與 20 張新卡。本規劃書 §1、§4、§A.1 列出的「87 張」與「11 + 4 張新卡」皆需視為歷史快照；後續任何二次引用一律以 thin index summary 為單一真相。

| 區段 | 規劃書記載 | 機讀真相（2026-05-07） | 處置 |
|---|---|---|---|
| total | 87 | 107 | thin index 為準，不再人工列舉。 |
| done | 32 | 48 | 多出 16 張：見 §C.2。 |
| in_progress | 0 | 1（`ATM-2-0026`） | 已被 ClaudeCode_opus-4-7 上鎖，本附錄不可改其 acceptance。 |
| 新增鏈 | 演化 11 + Map 4 | 再追加 `ATM-IDENTITY-BEHAVIOR-V1`（8 卡）與 `ATM-MAP-GENERATOR-PROVENANCE-V1`（5 卡） | 見 §C.7。 |

### C.2 Done 卡實作完整性對照

下列 16 張附錄 A 之後新落地為 done 的卡，均檢查其 notes 欄位內 `驗證:` 段是否引用實際 validator / npm script，未發現「名義完成但缺實作」斷層；但仍有兩條依賴鏈尚未閉合，需在後續 open 卡承接：

| done 卡 | 已驗證實作 | 仍未閉合的下游 |
|---|---|---|
| ATM-1-0011 (Atomic ID canonical) | upstream `9c1205f` + downstream `72a3301/ddbdcb6/a3e2798`；`validate:schemas / validate:cli / neutrality-scanner / test / typecheck / lint` 全綠。 | 規劃書 §5.1 / §A.4 仍以 `atomic_workbench/atoms/ATM-CORE-0123/` 範例說明，與本卡定稿後的 4 位流水號規則一致，無需改動。 |
| ATM-2-0018 (BuildAgentPrompt) | 上游 `7791d51`，含 `agent-prompt.schema.json` 與 snapshot fixture。 | `ATM-2-0019` 仍 open，閉環未通；見 §C.5。 |
| ATM-2-0034 (Registry Catalog Markdown) | upstream `c66a4ee`；`validate:registry-catalog / sync:registry-artifacts` pass。 | `ATM-2-0046`（catalog map section）open，map 投影尚未補上。 |
| ATM-2-0036 / 0037 (Workbench alias drift cleanup + guard) | `validate:registry-core / validate:scaffold-builder / validate:test-runner / validate:registry-catalog` pass。 | 與本規劃書 canonical folder 規則一致。 |
| ATM-2-0038 / 0039 / 0040 / 0041 (Atom Generator chain) | 上游 generator façade、source template、core atoms backfill、provenance audit 均落地；`validate:generator-provenance` 已接 npm test。 | Map 版同類能力 `ATM-2-0042~0046` 全 open；本規劃書 §4 / §5 完全未提及 Atom Generator，需在 §C.7 補入治理。 |
| ATM-2.5-0002 / 0003 | sandbox fixture 與 multi-agent confidence 報告均產出。 | 對 alpha0 critical path 無影響。 |

結論：所有 done 卡皆有可追溯 commit 與驗證；無「依賴項未滿足」斷層。但 §4 列出的 11 張演化卡 + §B.5 列出的 4 張 map 卡，至 2026-05-07 仍全數 open 或 in-progress，附錄 A.4 預期的「α1-prep 演化基礎」尚未啟動。

### C.3 Alpha0 → Alpha1 Registry 三軸遷移斷層

`ATM-2-0014`（`versions[]`）、`ATM-2-0026`（`semanticFingerprint / lineage / ttl`）、`ATM-2-0027`（status enum 收斂）三張卡皆宣稱 schema-additive，但 `ATM-2-0027` 實際上把 status enum 從舊集合（seed/active/experimental/deprecated/governed）**收斂** 為 7 值新集合，並非單純 additive。三軸同時落地時可能產生以下斷層：

1. **versions[] × status migration 順序未定義**：若 `ATM-2-0014` 先落地、`ATM-2-0027` 後落地，舊 entry 已升至 versions[1.0]，再做 status migration 時必須對 `versions[*].status`（若 schema 允許）一併重寫；目前兩卡 acceptance 都沒有列「跨卡 migration」測試。
2. **semanticFingerprint × versions[] 一致性未驗證**：`sf` 由 `inputs/outputs/language/evidenceRequired/performanceBudget` 計算，這些欄位在版本升級時可能變動，但 `ATM-2-0026` 沒寫「`sf` 是否每版本各自一份、或固定取 currentVersion」。
3. **rollback × status × sf 互動未涵蓋**：`ATM-2-0022` 只驗 spec/code/test 三段 hash，未驗 rollback 後 status 是否回到舊狀態（例如 `active → transitioning → active`）、`sf` 是否回算。

**建議補丁**（不開新卡，併入現有 open 卡 acceptance）：

- `ATM-2-0014` acceptance 追加：「fixture 必須包含一筆同時帶 `versions[]` 與舊 status 值（`seed/governed`）的 entry，並通過 ATM-2-0027 migration 後仍綠。」
- `ATM-2-0026` acceptance 追加：「`sf` 計算明定 per-version；`registry hot entry` 只放 currentVersion 的 `sf`，歷史 `sf` 落於 `versions[*].semanticFingerprint`。」
- `ATM-2-0022` acceptance 追加：「rollback proof 需包含 `statusReverted` 與 `semanticFingerprintReverted` 兩個布林欄位；任一為 false 即 hard fail。」

### C.4 演化管線 CLI / Markdown UI 具體化遺漏

`ATM-2-0017`、`ATM-2-0021` 目前僅定義 schema 與 `.atm/reports/*.json`，但 §1 提案明確要求「品質比較報告」與「人類審核佇列」要可被人讀；現有 acceptance 缺以下三項：

| 缺口 | 補丁建議 | 落點 |
|---|---|---|
| 缺 `atm registry quality-report` CLI | acceptance 追加：「`atm registry quality-report --atom <id> --from <v> --to <v> --json --md` 同步輸出 `.atm/reports/quality/<atomId>-<from>-<to>.json` 與同名 `.md`；`--md` 內容為固定 Markdown 模板（標題 / 指標表格 / mapImpactScope 區段 / 結論）。」 | `ATM-2-0017` |
| 缺 `atm review` CLI | acceptance 追加：「`atm review list / show <proposalId> / approve <proposalId> --reason / reject <proposalId> --reason` 四個子命令；approve / reject 必須落 evidence + `decision-snapshot.hash`（鎖定當下 `upgrade-proposal.json` 內容雜湊）。」 | `ATM-2-0021` |
| 缺 Markdown 呈現規範 | acceptance 追加：「`upgrade-proposals.md` 為 audit projection（非 source of truth）；欄位固定為 `proposalId / atomId / fromVersion → toVersion / decompositionDecision / automatedGates / status`；rebuild 由 `sync:registry-artifacts` 處理。」 | `ATM-2-0021` |

以上三項為純 acceptance additive，不需要新增卡。

### C.5 BuildAgentPrompt × ExecuteAgentTask × TestRunner 閉環

`ATM-2-0018` 已 done、`ATM-2-0019` 仍 open、`ATM-2-0003 RunAtomicTest` 已 done且不可動。閉環設計必須符合「不修改 TestRunner」原則：

```
ATM-2-0018 build-agent-prompt
  → emit prompt.md (含 lifecycleMode=birth|evolution、baselineSpec、baselineFixtures、forbiddenRegressions)
ATM-2-0019 execute-agent-task --dry-run
  → 取得 candidate spec/code/test
  → 呼叫 (既有) TestRunner 跑「new fixtures × new code」 → metrics(new)
  → 呼叫 (既有) TestRunner 跑「old fixtures × new code」 → 不退轉檢查
  → 寫 execution-evidence.json（不 mutate registry / host project）
ATM-2-0017 regression-compare gate
  → 讀 execution-evidence + baseline metrics → quality-comparison-report
ATM-2-0020 propose-atomic-upgrade
  → 串接以上 evidence → upgrade-proposal.json
ATM-2-0021 human-review-gate (reference plugin)
ATM-2-0022 rollback proof（失敗回退）
```

關鍵約束：`lifecycleMode` 由 `ATM-2-0018` prompt frontmatter 攜帶、由 `ATM-2-0019` 注入到 `execute-agent-task` 的 effect node context；TestRunner 完全不需要知道 `lifecycleMode`，只負責「指定 fixtures × 指定 code」的單次跑驗證。

**建議補丁**：

- `ATM-2-0019` acceptance 追加：「`lifecycleMode=evolution` 時，dry-run 必須以 **兩次獨立 TestRunner 呼叫** 完成（baseline fixtures × new code、new fixtures × new code），分別寫入 evidence；TestRunner 本身不變更。」
- `ATM-2-0019` acceptance 追加：「effect node 不可直接呼叫 `propose-atomic-upgrade`；evolution evidence 寫入後由 `ATM-2-0020` orchestration atom 自行讀取，避免 effect node 與 compute atom 邊界混線。」

### C.6 ATM-3-0014 Adapter 邊界風險再評估

現有 acceptance 僅規定 `read-only` 與「neutrality scanner 跑 dry-run」，但未指定來源 → upstream `usage-feedback` schema 的欄位映射規則，仍有以下殘留風險：

1. 3KLife `compute-gate` JSON 內含 `profile / agent-feedback / ucuf-category` 等專案私有欄位，若直接序列化進 evidence payload，會破壞 upstream schema 中立性。
2. 3KLife `UCUFLogger` 類別 enum 與 `LogCategory` 列舉是 host-private 概念；evidence 若引用 `category` 字串會讓 upstream Evidence Store 隱式綁定 host 列舉。
3. 若 3KLife 改 log 格式，shadow adapter 無 fallback 會直接報錯，違背 §A.2 #9「alpha0 邊界守則」。

**建議補丁**（追加進 `ATM-3-0014` acceptance，仍是 additive）：

- 「定義 `mapping-table.json`：列出來源欄位 → upstream `usage-feedback` 欄位的固定對照；source-only 欄位一律歸到 `extras.adopterPrivate{}`，並由 neutrality scanner hard-fail 若該物件出現在 payload 主體。」
- 「實作 `--strict` 與 `--lenient` 兩種模式；`--lenient` 在來源格式漂移時降級為 `evidenceType=usage-feedback-skipped`，並寫一筆 `skip-reason`，避免 alpha0 / alpha1 critical path 因為 host 工具升版而紅燈。」
- 「fixture：至少含一筆 `compute-gate report 缺欄位` 的 negative case，驗證 `--lenient` 行為與 `--strict` 行為差異。」

### C.7 Behavior SDK × Evolution Pipeline 治理衝突

`ATM-IDENTITY-BEHAVIOR-V1` 鏈（`ATM-2-0026~0033`）引入 `AtomBehavior` plugin SDK 與 10 種內建 behavior，本規劃書 §3 / §4 完全未提到此維度。最關鍵的衝突在於：

- `behavior.evolve` 與 `ATM-2-0020 ProposeAtomicUpgrade` **語意重疊**：兩者都負責「升版」這件事。
- `behavior.atomize / behavior.infect` 可在 host project 上產生新 atom 與 dry-run patch，**繞過** `ATM-2-0021 HumanReviewGate`。
- `lifecycle police`（`ATM-2-0031`）是唯一可寫 `quarantined` status 的角色，但 `ATM-2-0021` reject 後 atom 應落到何種 status，現有兩條鏈都沒寫。

**建議補丁**（不開新卡，併入既有 open 卡）：

- `ATM-2-0028` acceptance 追加：「`behavior.evolve` 必須委派到 `ATM-2-0020 ProposeAtomicUpgrade`，不得繞過 automated gates 與 human review。」
- `ATM-2-0029` acceptance 追加：「`behavior.atomize / infect` 產生的 dry-run patch 必須以 `ATM-2-0020` proposal 形式包裝，`decompositionDecision` 預設 `atom-extract`；review 通過前不得 apply。」
- `ATM-2-0027` acceptance 追加：「定義 reject 後狀態：approved → `active`；rejected (non-fatal) → 維持原 status；rejected (fatal) → `quarantined`，且 `quarantined` 仍只能由 lifecycle police 寫入，proposal flow 改寫 `pendingQuarantineRequest` 欄位由 lifecycle police 異步處理。」

### C.8 自我治理失效風險清單

下列風險聚焦在 **演化過程框架自己治理失敗** 的場景；每條已對應到上述 §C.3–§C.7 的具體補丁建議，落實後可關閉風險。

| 風險編號 | 失效場景 | 觸發條件 | 對應補丁 | 嚴重度 |
|---|---|---|---|---|
| SG-01 | Registry 三軸 schema 不可同時存在 | versions[] / status enum / sf 三卡分開落地未交叉測試 | §C.3 補丁 | 高 |
| SG-02 | rollback 只回 hash 不回 status / sf | `ATM-2-0022` acceptance 缺欄位 | §C.3 補丁 | 高 |
| SG-03 | 品質報告無人讀界面，淪為 JSON 黑盒 | `ATM-2-0017` 缺 CLI / Markdown | §C.4 補丁 | 中高 |
| SG-04 | review 決策可被未鎖定 proposal 篡改 | `ATM-2-0021` 缺 decision-snapshot.hash | §C.4 補丁 | 高 |
| SG-05 | TestRunner 被改成感知 lifecycleMode（破壞已完成卡） | `ATM-2-0019` 描述含混 | §C.5 補丁 | 高 |
| SG-06 | `behavior.evolve` 繞過 review，自動升版 | `ATM-2-0028 / 0029` 未限制 | §C.7 補丁 | 高 |
| SG-07 | `behavior.atomize / infect` 直接 apply 到 host | reference plugin 未強制走 proposal | §C.7 補丁 | 高 |
| SG-08 | 上游 Evidence Store 被 3KLife 私有欄位污染 | `ATM-3-0014` 未明定 mapping 與 strict/lenient | §C.6 補丁 | 中高 |
| SG-09 | 3KLife log 格式漂移即時阻斷演化管線 | `ATM-3-0014` 無 fallback | §C.6 補丁 | 中 |
| SG-10 | reject 後 atom 狀態未定義，registry 進入未定義態 | `ATM-2-0027` 缺 transition 對應 | §C.7 補丁 | 中高 |
| SG-11 | Map generator chain（`ATM-2-0042~0046`）獨立演進，與 atom 演化鏈未交會 | 兩鏈 acceptance 未互相引用 | 建議在 `ATM-2-0042` acceptance 補：「map generator 產出的 spec/code/test 必須通過 `ATM-2-0017` regression compare gate（map-level）」 | 中 |
| SG-12 | URN 被誤當第二套 canonical ID，導致 registry / police / adapter 查詢漂移 | 外部 exchange 直接寫入 `urn:atm:*`，或各工具自建 index | `ATM-2-0047` 補派生 URN resolver + RegistryIndex façade；URN 只由 `atomId/mapId + version` 格式化，不作可寫主鍵 | 高 |

### C.9 結語

本附錄不重啟 §3 / §4 / §5 既有結論，而是把「演化基礎尚未啟動、但已多出兩條治理鏈」這個現實補進去。若以「最小阻塞 alpha1 演化閉環首次驗證」為目標，建議的下一步只有三件事：

1. 把 §C.3、§C.4、§C.5、§C.6、§C.7 列出的純 acceptance additive 補丁，逐張寫進對應 open 卡 frontmatter（不需要新開卡）。
2. 落地 `ATM-2-0047` 的 URN resolver 與 RegistryIndex façade，讓後續 `ATM-2-0030` dedup police、`ATM-2-0031` lifecycle police 與 map generator 共用同一套 O(1) 查詢入口。
3. 所有 police surface 都必須輸出 machine-readable findings，並明確標出 `trigger / scope / severity / action`；低風險先走 advisory / needs-review，高風險再走 follow-up task card / quarantine / hard fail。
3. 然後依 §A.4 的順序執行 `ATM-2-0014 → 0015 → 0016 → 0017 → 0019 → 0020 → 0021 → 0022 → 3-0014 → 4-0007`，並在 `ATM-2-0028 / 0029` 落地時順便驗證 §C.7 的繞道防線。

### C.10 本輪 task-card 硬化規則

本輪對 `ATM-2-0020 ~ ATM-2-0029` 的調整收斂出一條正式規則：任務卡改動不得改卡目的，只能補 deterministic local validator、exemplar set 與 validator-first `VALIDATION_CMD`，讓失敗先在本卡 seam 爆出，而不是等整包測試才判讀。

- 共用 `docs/tasks/tasks-atm/tasks-atm-part-*.json` shard part 時，僅一張卡可持有 shard part lock；其餘 sibling 卡只鎖各自 Markdown。
- `task-lock.js lock` 一律需帶 `--files`，把本輪 canonical scope 寫進 lock 檔；`check-task-scope` 只能拿這份 `files[]` 當機器真相。
- 舊 lock 若仍出現空 `files[]`，只可視為過渡期 advisory，不可再作為新卡範本。
- thin-index shard 必須維持摘要層；若 part 逼近門檻，先壓縮 notes / acceptance，再繼續加卡或補規則。

### C.11 Task Card System 原子化缺口（新增）

目前 `ATM-3-0006`（task-lock）、`ATM-3-0009`（shard-manager）、`ATM-3-0010`（task-card-opener）、`ATM-3-0012`（task-scope/rule-pack）都已各自標註「Phase 1 = adapter 化 / Phase 2 = 原子化」，但這仍然只是零散工具層。若沒有一張卡把整套 task card lifecycle 收斂成 atomic map，ATM 仍無法證明「框架自己的任務卡系統也被框架治理」。

因此新增 `ATM-3-0015` 作為正式規劃缺口補卡，專門定義：`allocateTaskId → reserveTaskId → openTaskCard → lockTaskScope → writeTaskShard → validateTaskShard → syncDocRegistry → finalizeTaskLifecycle` 這條 governed flow 的原子邊界與 orchestration 責任。後續 `ATM-3` 的 dogfooding 驗收，不只看單一 helper 是否 adapter 化，也必須看這條 end-to-end task card system atomic map 是否存在且可被獨立驗證。

#### Task Card Atomic Map（member atoms）

| 原子節點 | 主要責任 | 3KLife 對應 |
| --- | --- | --- |
| `allocateTaskId` / `reserveTaskId` | 推導下一個合法卡號，並在併發下原子保留卡號 | `ATM-3-0010` / `ATM-3-0006` |
| `openTaskCard` | 產出 Markdown task card 與 frontmatter | `ATM-3-0010` |
| `lockTaskScope` | 寫入 canonical `files[]`、scope fingerprint 與 lock metadata | `ATM-3-0006` |
| `writeTaskShard` | 更新 task aggregate / shard 真相 | `ATM-3-0009` |
| `validateTaskShard` | 驗證 part JSON、門檻、摘要與路由 | `ATM-3-0009` |
| `syncDocRegistry` | 將新卡回寫 doc_id registry / index | `ATM-3-0008` |
| `finalizeTaskLifecycle` | open / in-progress / done 轉換、unlock、evidence 封口 | `ATM-3-0010` + `ATM-3-0006` |
| `rule guard preflight` | 只輸出 findings，不參與 lifecycle mutation | `ATM-3-0012` |

- `ATM-3-0015` 是這張 map 的 orchestration 卡，不是新 helper；它只定義邊界與順序，不把整條流程塞進單一函式。
- `TaskAdapter` 只負責 lifecycle orchestration。
- `LockAdapter` 只負責 reservation / lock / unlock 與 `files[]` 真相。
- `ShardAdapter` 只負責 shard write / validate / part naming。
- `RuleGuardAdapter` 只負責 findings 與 advisory，不碰 task card 狀態。

### C.12 Framework Function Atomization Coverage Gate（新增）

進一步盤點後，`ATM-3-0015` 仍只覆蓋 task card system。ATM 的全框架 dogfooding 還缺一個總控層，能證明 CLI commands、Atomic Spec / Scaffold、Registry / HashLock / Index / Catalog、Test / Report / Evidence、Police / Rule Guards、Adapter interfaces、Task lifecycle、Atomic Map、PEV / Lifecycle docs 等 Layer 2 framework functions 都有 atom / atomic map / adapter facade 對應。

因此新增 `ATM-2-0050`：建立 `docs/ai_atomic_framework/framework-function-atomization-manifest.md` 與 coverage validator。之後任何 framework function 若未被列入 manifest，或 Layer 2 項目沒有對應 atom / map / adapter facade / open task / finding route，validation 應 fail。Layer 1 constitutional schema 只做 hash-lock / migration gate；Layer 3 mutable host config 只做 git / adapter config 管理，不列入「必須原子化」範圍。

固定開工路線正式定義如下：

1. 先完成 `ATM-2-0048`，把 task-router / onboarding contract 收斂成唯一 canonical entry，避免後續 framework atomization 工作從 task card、legacy extraction、ad-hoc guide 三條入口分裂。
2. 再完成 `ATM-3-0015`，把 task card lifecycle 收斂成 end-to-end governed atomic map，明確定義 `allocateTaskId -> reserveTaskId -> openTaskCard -> lockTaskScope -> writeTaskShard -> validateTaskShard -> syncDocRegistry -> finalizeTaskLifecycle`。
3. 最後才由 `ATM-2-0050` 啟用 framework-wide coverage validator，把全框架 Layer 2 functions 納入 block gate。

補充約束：

- `ATM-2-0049` 已完成 task id reservation / lock race hardening，視為上述路線的已落地前置，不另占節點。
- 在 `ATM-2-0048` 與 `ATM-3-0015` 未完成前，`ATM-2-0050` 僅可進行 manifest backwrite、gap mapping、advisory report；不得將 coverage validator 作為 blocker。
- advisory report 必須能接收 police findings，並將 fast / slow police 的路由資訊保留給 human review queue 與 task-router。
- 任一新卡若宣稱處理「全框架原子化」，必須在 acceptance 或 notes 中標註自己屬於 `0048`、`3-0015`、`0050` 哪一段路線，避免把局部治理誤判為全局完成。
- `ATM-2-0050` 同時承接文件治理收斂：新增 `documentation-governance-policy.md` 與 `documentation-role-map.md`，並以 `validate-atm-doc-governance` 鎖定 `Agent Boot Order` 與 `docs/ai_atomic_framework/` 的 `canonical / reference / adopter / history / index / shard / asset` 角色；在角色治理穩定前，不進行大規模實體搬移。

### C.13 Done-card acknowledgement backwrite（2026-05-09）

本節保留前文所有歷史 snapshot，不回頭改 §A / §B / §C.1 的時間點判讀。`ATM-2-0006 / 0009 / 0014 / 0020 / 0021 / 0022` 已完成的部分，現在正式補入框架語言與 manifest 索引；這不是重啟驗收，也不是把 family row 提前關閉。

| done 卡 | 已由框架承認的 acceptance | 仍未閉合的 family route |
|---|---|---|
| `ATM-2-0006` | `AtomLifecycleMode`、`VersionResolver`、`QualityMetricsComparator`、`UpgradeProposalAdapter` 已讓 Adapter SDK 可表達 birth/evolution 差異、版本解析與升版品質比較。 | `ATM-3-0001`、`ATM-3-0006~0011` 繼續收 3KLife adapter facade，不回頭重定義 SDK lifecycle。 |
| `ATM-2-0009` | Evidence / artifact / log store 已完成 replayability contract，typed evidence 包含 `usage-feedback`、`quality-baseline`、`quality-comparison`、`rollback-proof`，並保留 `.atm` layout 與 3KLife mapping guidance。 | `ATM-3-0014` 只做 usage-feedback shadow adapter 與 strict/lenient mapping。 |
| `ATM-2-0014` | `currentVersion` / `versions[]`、legacy fixture、versioned fixture 與 schema-additive migration 規則已是 registry version history 正本。 | `ATM-2-0023`、`ATM-2-0047` 只擴充 map registry 與 resolver/index。 |
| `ATM-2-0020` | `upgrade-proposal.schema.json` 已吃掉 proposal decomposition acceptance：`decompositionDecision`、`mapImpactScope`、`behaviorId`，且 `atm upgrade --propose` 只彙整 evidence/report，不 mutate host、不直接進 review queue。 | `ATM-2-0024` 與 behavior pack 需委派 proposal flow，不可繞過。 |
| `ATM-2-0021` | Human review 缺口已由 reference plugin 承接：`atm review list/show/approve/reject`、evidence decision log、`decision-snapshot.hash`、`upgrade-proposals.md` audit projection。 | Public PEV / semver 文件可引用此審核面；core 仍只依賴 schema。 |
| `ATM-2-0022` | Rollback proof 已吃掉安全網 acceptance：spec/code/test 三段 hash、`statusReverted`、`semanticFingerprintReverted`、`behaviorId` reverse contract、map target、`memberAtomProofs[]` 與 `mapGeneratorProvenance`。 | `ATM-2.5-0004`、`ATM-3-0014`、`ATM-4-0007` 負責把 proposal/review/rollback 串成首次 end-to-end 演化閉環。 |

因此 `framework-function-atomization-manifest.md` 中 `Adapter API / Plugin SDK`、`Evidence / artifact log store`、`Evolution proposal / review / rollback` 維持 `open-card` 是正確狀態：`open-card` 代表 family 尚有後續路由，不代表上述 done cards 未被框架承認。`Registry / HashLock / version history` 則繼續維持 `covered-existing`，並以 `ATM-2-0014` 作為 version history slice 的完成來源。

### C.14 Atomic Map / provenance family acknowledgement（2026-05-09）

`ATM-2-0053` 承接的不是新功能，而是把 `ATM-2-0023 / ATM-2-0042 / ATM-2-0043 / ATM-2-0044 / ATM-2-0045 / ATM-2-0046` 這條 Atomic Map / provenance family 的 done 事實，正式回寫成框架可引用的語言與索引。這批卡和上一節不同的地方在於：六張卡現在都已 done，所以 `framework-function-atomization-manifest.md` 的 `Atomic Map schema / generator / provenance` row 可以從 `open-card` 升成 `covered-existing`。

| done 卡 | 已由框架承認的 acceptance | 轉成 covered-existing 後的後續 route |
|---|---|---|
| `ATM-2-0023` | Atomic Map schema / registry slice 已確立 `mapId`、`mapVersion`、`members`、`qualityTargets` 與 map registry 基底。 | `ATM-2-0024 / ATM-2-0025` 僅補 map-level compare、report 與 evolution orchestration。 |
| `ATM-2-0042` | `generateAtomicMap()` / `atm create-map` 已把 map birth surface 正式收進 manager 與 CLI。 | 未來只重查 CLI / manager compatibility，不再重做 create-map 核心。 |
| `ATM-2-0043` | map template policy、canonical trio、`atomic_workbench/maps/<mapId>/` sibling layout、`validate:map-template` 都已落地。 | 新 map template 只能在這個 canonical trio 與 validator 契約上演進。 |
| `ATM-2-0044` | legacy `ATM-MAP-NEUTRALITY-0001` 已 backfill 為 canonical `ATM-MAP-0002`，並保留 archived witness、lineage log、migration evidence。 | 後續 map evolution / integration 一律以 canonical mapId 前進。 |
| `ATM-2-0045` | provenance audit 已能把 map 分成 `generator-born`、`backfilled-legacy`、`missing-provenance`，缺 provenance 直接產生 finding。 | 新外部 map 或手工 map 必須先補 provenance，再談升版或收錄。 |
| `ATM-2-0046` | registry catalog Maps section 已成為正式索引面，能投影 `mapId / memberCount / status / workbenchPath`，並附註 provenance / backfill lineage。 | `ATM-4-0008` 與其他 consumer integration 只消費這個索引，不回頭重做 catalog surface。 |

這次 promotion 的重點不是宣稱 map family 從此沒有後續，而是把「family closure」與「下一條演進路由」分開：coverage row 現在已被 existing artifacts 覆蓋，所以升成 `covered-existing`；新的 routeHint 則改指向 `ATM-2-0024 / ATM-2-0025 / ATM-4-0008` 這些未來的 map-level work，而不是再把已完成 family 假裝成 open-card。
