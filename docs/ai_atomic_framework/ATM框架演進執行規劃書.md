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
| ATM-2-0013 | 未被提案納入核心排序 | `done` | 視為 canonical per-atom folder 基礎：預設 home = `atomic_workbench/atoms/<Atomic ID>/`，資料夾名稱必須等於 Atomic ID，本輪後續文件一律沿用此規則。 |
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
| ATM-2-0012 | neutralityScanner atom + CI | 直接使用 ATM-2-0013 的 canonical atom folder：`atomic_workbench/atoms/<Atomic ID>/`；不要散放 spec/code/test/report，也不要另建 alias folder。 | 支撐後續自我治理原子。 |
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
2. `ATM-2-0012`：neutralityScanner atom，使用 `atomic_workbench/atoms/<Atomic ID>/` canonical folder。
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
2. 落地 `ATM-2-0012` neutralityScanner（落於 `atomic_workbench/atoms/<Atomic ID>/`，資料夾名稱直接等於 Atomic ID）。
3. 通過 `ATM-2.5-0001` / `ATM-2.5-0002` deterministic gate。

α0+ 補洞：`ATM-2-0018` → `ATM-2-0019`。

α1-prep（演化基礎）：`ATM-2-0014` → `ATM-2-0015` → `ATM-2-0016` → `ATM-2-0017`，並補強 `ATM-2-0006/0007/0008/0009/0010/0011` acceptance。

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

