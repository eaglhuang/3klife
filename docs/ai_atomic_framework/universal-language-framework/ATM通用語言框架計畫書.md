<!-- doc_id: doc_other_0901 -->
# ATM 通用語言框架計畫書

## 0. 核心結論

本計畫要把 ATM 從「主要服務 JS/TS 的原子治理框架」推進到「可由不同程式語言 adapter 承接的通用語言框架」。它不是要把所有語言邏輯塞進 core，也不是要一次完成所有語言的正式支援，而是先把語言差異隔離到 `LanguageAdapter v2`、adapter registry、candidate ranking、dry-run planning 與 atomic map decomposition 這幾個可驗證邊界。

原始計畫的主方向全部保留：

- 雙軌文件：繁中主規劃書 + 英文 companion guide。
- `LanguageAdapter v2`：讓語言能力由 adapter 宣告與實作。
- core 去語言特例：core 不再持有 Python / Java / C# / Go 等語言特例。
- candidate ranking adapter 化：候選排序吃 adapter 的 source inventory / symbol / evidence。
- `atomize` / `infect` dry-run：先產生可審查 proposal，不直接動 host 專案。
- atomic map decomposition：大型功能拆解輸出 map members / edges / entrypoints。
- Python reference：以既有 `packages/language-python` 為基礎升級。
- JS/TS 對齊：讓既有 `packages/language-js` 對齊 v2 surface。
- Go 英文範例：英文文件用 Go 示範如何新增語言 adapter。
- Java / C# / PHP 後續策略：先做可行性與 conformance checklist，不在本輪假裝正式支援。

本計畫的必要微調是：Python adapter 已在 upstream repo 中存在，所以本輪不能把 Python 寫成從零新建；應改成「升級到 v2 conformance」。同時 `LanguageAdapter v2` 必須以 additive contract 推進，先保留現有 `detectProjectProfile()` / `validateComputeAtom()`，再新增 optional capabilities / optional methods，避免一次破壞 JS/TS、Python 與既有 validators。

## 1. 背景與現況

ATM 目前已具備 Plugin SDK、JS/TS LanguageAdapter reference、Python adapter package、candidate ranking、guidance route、police family 與多種 validator。這表示通用語言框架不是全新產品，而是把已經分散存在的能力整理成一條正式公共 contract。

目前落差集中在四點：

1. `LanguageAdapter` SDK surface 太薄，只能描述 profile detection 與 compute atom validation，無法承接 source inventory、dry-run planning、diagnostics、runtime commands 與 map decomposition。
2. guidance / candidate ranking 仍有語言提示與路由特例，core 會知道太多語言細節。
3. Python 與 JS/TS 已有能力，但能力名稱、報告結構、fixtures 與 validator 還沒有被同一套 v2 conformance 收斂。
4. 文件與 task plan 需要 no-shrink / traceability gate，避免把原本 82 張細卡重整成 41 張後遺漏使用者需求。

本計畫採「先凍結 contract，再推 adapter，最後加 validator」的路線，但 no-shrink / traceability validator 會提前到第一階段先建立最小版，確保後續任務不會縮掉需求。

## 2. 範圍與非目標

### 2.1 範圍

本計畫交付下列能力：

- `LanguageAdapter v2` public contract 與 shared language schemas。
- adapter registry / resolver / fallback policy。
- core guidance、police、candidate ranking 的 adapter-driven delegation。
- generic atomize / infect dry-run plan contracts。
- atomic map decomposition contract 與 evidence gate。
- Python reference adapter 的 v2 conformance 升級。
- JS/TS adapter 的 v2 capability alignment。
- 英文 companion guide：如何新增一個新的語言 adapter，使用 Go 作完整 TypeScript 範例。
- Java / C# / Go / PHP future adapter feasibility 與 checklist。
- cross-map validators、traceability validator、script facade boundary validator、docs neutrality validator。

### 2.2 非目標

本計畫不做下列事項：

- 不把所有語言 parser 寫進 `packages/core`。
- 不在本輪正式交付 Go / Java / C# / PHP production adapter。
- 不要求 Python adopter 加 `package.json`。
- 不讓 CLI / scripts 直接承擔核心語言邏輯；CLI 只能是 thin facade。
- 不在 dry-run 階段執行 host Python / Go / Java / C# / PHP 程式。
- 不把 3KLife、npc-brain 或任何採用者專案語意寫成 ATM 官方 contract。

## 3. 設計原則

### 3.1 Contract-first，不讓 core 猜語言

core 只認得 `LanguageAdapter v2` 的介面、capabilities、schema 與 evidence envelope。語言規則、symbol normalization、diagnostics parsing、runtime command detection、import graph、call graph、entrypoint rule 都由 adapter 實作。

Unity 對照：這像 Unity 用 interface / ScriptableObject contract 管不同平台或資料來源；核心 gameplay loop 不應到處寫 `if platform == ...`。Cocos 這邊也同理，ATM core 不應到處寫 `if language == python`。

### 3.2 Additive v2，不破壞既有 adapter

現有 SDK surface 保留：

- `detectProjectProfile(repositoryRoot)`
- `validateComputeAtom(request)`

v2 新增能力採 optional methods + capabilities 宣告。舊 adapter 可先回報只支援 v1 能力；v2 validator 只要求 v2 package 的對應能力要有 fixture 與 evidence。

### 3.3 任務粒度以 owned surface 為準

任務卡不拆到單一函式，也不把不同 package 的責任硬塞一張卡。每張任務卡都必須有明確 owned surface，能交給一位工程師或一個 agent 獨立完成。

### 3.4 文件與程式分離

繁中主計畫、英文 companion、future adapter strategy、traceability matrix 是文件交付；SDK / adapter / validator 是程式交付。文件任務不能偷偷改 production behavior；validator 任務只新增 validator / fixture，不改 production behavior。

### 3.5 Dry-run 優先，apply 另立 gate

`atomize` / `infect` / atomic map decomposition 在本輪只要求 dry-run proposal、evidence envelope、rollback / shim plan 與 validator。真正 apply 必須另有 explicit evidence、review gate 與 rollback proof。

## 4. 目標架構

```text
LanguageAdapter v2 contract
  -> adapter registry / resolver
  -> language-js / language-python / future adapters
  -> source inventory / route plan / dry-run proposal / diagnostics
  -> guidance / candidate ranking / police / atomic map decomposition
  -> evidence reports / validators / docs
```

### 4.1 `LanguageAdapter v2` public surface

v2 應保留 v1 shape，並新增下列 optional surface：

```ts
export interface LanguageAdapterV2<
  Profile = LanguageProjectProfile,
  ValidateRequest = LanguageAdapterValidationRequest,
  ValidateReport = LanguageAdapterReport
> extends LanguageAdapter<Profile, ValidateRequest, ValidateReport> {
  readonly contractVersion?: 'v2';
  readonly capabilities?: LanguageAdapterCapabilities;

  scanSourceInventory?(request: SourceInventoryRequest): MaybePromise<SourceInventoryReport>;
  normalizeSymbolId?(request: NormalizeSymbolIdRequest): MaybePromise<NormalizedSymbolId>;
  buildLegacyRoutePlan?(request: LegacyRoutePlanRequest): MaybePromise<LegacyRoutePlanReport>;
  planAtomizeDryRun?(request: AtomizeDryRunRequest): MaybePromise<DryRunPlanReport>;
  planInfectDryRun?(request: InfectDryRunRequest): MaybePromise<DryRunPlanReport>;
  detectRuntimeCommands?(request: RuntimeCommandRequest): MaybePromise<RuntimeCommandReport>;
  parseDiagnostics?(request: DiagnosticsParseRequest): MaybePromise<DiagnosticsReport>;
  computeEquivalenceContract?(request: EquivalenceContractRequest): MaybePromise<EquivalenceContractReport>;
  buildAtomicMapDecomposition?(request: AtomicMapDecompositionRequest): MaybePromise<AtomicMapDecompositionReport>;
}
```

### 4.2 capability model

`capabilities` 必須能表達：

- `sourceInventory`
- `symbolNormalization`
- `legacyRoutePlanning`
- `atomizeDryRun`
- `infectDryRun`
- `runtimeCommandDetection`
- `diagnosticsParsing`
- `equivalenceContract`
- `atomicMapDecomposition`
- `dependencyGraph`
- `callGraph`
- `artifactGraph`

capability 是 feature gate，不是 marketing flag。adapter 宣告支援某能力，就必須有 fixture、validator 與 evidence。

### 4.3 shared language schemas

shared schemas 至少包含：

- source file / source inventory / symbol / range / reference。
- dependency graph / call graph / artifact graph。
- diagnostics message / severity / location / source。
- runtime command / package manager / command kind。
- equivalence fixture / expected behavior / evidence artifact。
- dry-run plan / shim / rollback / import rewrite / evidence envelope。
- atomic map member / edge / entrypoint / graph output。

### 4.4 adapter registry / resolver

resolver 的責任是：

- 根據 project profile、檔案分布、明確設定與 bundled adapters 選出 adapter。
- 回報為何選中、為何 fallback、缺哪個 capability。
- 支援 bundled adapter 與 external adapter discovery。
- 不在 core 寫語言特例；core 只看 adapter metadata。

fallback 訊息必須可讀，不能只有「unsupported」。範例：「目前有 Python adapter，可做 inventory / dry-run，但 apply 仍需 evidence + review gate」。

### 4.5 core delegation

core guidance、police、candidate ranking 的路線：

1. 先由 resolver 選 adapter。
2. adapter 能回答就採 adapter report。
3. adapter 不支援的能力由 core 回報 advisory fallback。
4. fallback 不得偽裝成完整支援。

## 5. Atomic Maps

| Map ID | Name | Owned Surface |
| --- | --- | --- |
| ATM-MAP-LANG-0001 | Universal Language Adapter Program | roadmap docs, traceability, top-level architecture |
| ATM-MAP-LANG-0100 | Adapter Contract Map | `packages/plugin-sdk/src/language-adapter.ts`, shared language schemas |
| ATM-MAP-LANG-0200 | Adapter Resolution Map | adapter registry, discovery, fallback policy |
| ATM-MAP-LANG-0300 | Core Delegation Map | `packages/core/src/guidance/*`, police integration boundaries |
| ATM-MAP-LANG-0400 | Candidate Inventory Map | candidate ranking service modules and CLI facade |
| ATM-MAP-LANG-0500 | Dry-Run Planning Map | atomize/infect dry-run contracts and reusable planning types |
| ATM-MAP-LANG-0600 | Atomic Decomposition Map | atomic map decomposition contracts and graph outputs |
| ATM-MAP-LANG-0700 | Python Reference Adapter Map | `packages/language-python/*`, Python fixtures and validator |
| ATM-MAP-LANG-0800 | JS/TS Adapter Alignment Map | `packages/language-js/*`, JS/TS fixtures and validator |
| ATM-MAP-LANG-0900 | New Language Guide Map | English Go adapter guide and example code |
| ATM-MAP-LANG-1000 | Future Adapter Strategy Map | Java/C#/Go/PHP feasibility docs |
| ATM-MAP-LANG-1100 | Validation And Regression Map | cross-map validators, neutrality, traceability checks |

### 5.1 會產生的 Atomic Maps 表格規劃

本計畫後續不只會維護上面的 overview table，還會產生一組可被 validator 讀取或人工審查的 Atomic Maps tables。為了避免流程過重，這些表格分為「核心必備（Core Required）」與「擴充建議（Optional Extension）」兩層：核心必備是所有版本都要維護，擴充建議則在對應功能啟用時才需要產出。

| Table ID | 層級 | 表格名稱 | 主要用途 | 最低欄位 | 產出位置 | 驗證責任 |
| --- | --- | --- | --- | --- | --- | --- |
| ATM-LANG-TABLE-0001 | Optional Extension | Atomic Map Overview | 列出所有 map 與 owned surface | `Map ID`, `Name`, `Owned Surface` | 本文件 §5 | ATM-LANG-0001 |
| ATM-LANG-TABLE-0002 | Core Required | Map To Task Matrix | 確認每張卡都掛到 map | `Task ID`, `Map ID`, `Title`, `Owned Surface`, `Depends On` | 本文件 §7 + `tasks/README.md` | ATM-LANG-0003, ATM-LANG-1102 |
| ATM-LANG-TABLE-0003 | Core Required | Requirement Coverage Matrix | 對照原始 10 個 interface 需求 | `Requirement`, `Covered By`, `Coverage Type`, `Notes` | 本文件 §8.1 | ATM-LANG-0003, ATM-LANG-1101 |
| ATM-LANG-TABLE-0004 | Optional Extension | Previous Theme Absorption Matrix | 對照前版 82 張卡主題如何被合併 | `Old Theme Group`, `New Tasks`, `Merge Rule`, `Risk` | 本文件 §8.2 | ATM-LANG-0003, ATM-LANG-1101 |
| ATM-LANG-TABLE-0005 | Optional Extension | Owned Surface Conflict Matrix | 檢查任務是否互踩 package / responsibility | `Owned Surface`, `Owning Tasks`, `Shared Contract`, `Conflict Policy` | 本文件 §6 或 validator artifact | ATM-LANG-1102 |
| ATM-LANG-TABLE-0006 | Optional Extension | Adapter Capability Matrix | 比較 JS/TS、Python、future adapters 的 v2 能力 | `Adapter`, `Capability`, `Support Level`, `Evidence`, `Validator` | 本文件 §10 + 英文 companion | ATM-LANG-0100, ATM-LANG-1100 |
| ATM-LANG-TABLE-0007 | Optional Extension | Dry-Run Evidence Matrix | 規劃 atomize / infect dry-run 的 evidence 要求 | `Plan Kind`, `Required Evidence`, `Rollback/Shim`, `Mutates`, `Gate` | 本文件 §11 + task cards | ATM-LANG-0502, ATM-LANG-1100 |
| ATM-LANG-TABLE-0008 | Core Required | Atomic Decomposition Graph Matrix | 規劃大型功能拆 map 時的 members / edges / entrypoints | `Map ID`, `Members`, `Edges`, `Entrypoints`, `Evidence` | 本文件 §5.2 + task cards | ATM-LANG-0600, ATM-LANG-0602 |
| ATM-LANG-TABLE-0009 | Core Required | Validator Ownership Matrix | 指定每個 validator 守哪張表與哪種退化風險 | `Validator`, `Tables Checked`, `Failure Mode`, `Command` | 本文件 §11.3 | ATM-LANG-1100 |
| ATM-LANG-TABLE-0010 | Optional Extension | Future Adapter Readiness Matrix | 規劃 Java / C# / Go / PHP 後續狀態 | `Language`, `Current Status`, `Blocking Risk`, `Next Contract`, `Not In Scope` | 本文件 §10 | ATM-LANG-1000, ATM-LANG-1002 |

表格產生規則：

- 核心必備最小集合固定為：`ATM-LANG-TABLE-0002`、`ATM-LANG-TABLE-0003`、`ATM-LANG-TABLE-0008`、`ATM-LANG-TABLE-0009`。
- 任何由 validator 或 script 產出或消費的 Atomic Maps table，都必須能回指到上表其中一個 `Table ID`。
- 若後續新增新的 map table，必須先補本節，再補 validator；不得先在 artifact 中產出未登記表格。
- Optional Extension 表格可依功能啟用狀態決定是否產出；未啟用時可不產出實體表格，但不得移除其 `Table ID` 定義。
- 表格欄位可以在實作時增加，但不得刪除最低欄位；若要刪除欄位，必須開 contract delta。
- `tasks/README.md` 的任務索引視為 `ATM-LANG-TABLE-0002` 的人類可讀投影，不是獨立真相。

### 5.2 Atomic Decomposition Graph Matrix

`ATM-LANG-TABLE-0008` 用來規劃未來 `buildAtomicMapDecomposition()` 會產生的 map graph table。最小格式如下：

| Map ID | Members | Edges | Entrypoints | Evidence |
| --- | --- | --- | --- | --- |
| ATM-MAP-LANG-0100 | `LanguageAdapter v2`, shared schemas, runtime/equivalence/evidence contracts | contract -> schemas -> evidence | `packages/plugin-sdk/src/language-adapter.ts` | typecheck + plugin-sdk validator |
| ATM-MAP-LANG-0200 | adapter registry, resolver, fallback policy, discovery fixtures | registry -> resolver -> fallback report | adapter resolver module | resolver fixtures + fallback message snapshots |
| ATM-MAP-LANG-0300 | route-plan delegation, regex removal, guidance/police consumers | resolver report -> route plan -> police family | `packages/core/src/guidance/*` | guidance + police validators |
| ATM-MAP-LANG-0400 | source inventory service, ranking signal model, CLI facade | inventory -> ranking signals -> report provenance -> CLI output | `atm candidates rank` | candidate ranking fixture + facade boundary check |
| ATM-MAP-LANG-0500 | dry-run plan types, import rewrite, shim, rollback, evidence envelope | plan request -> proposal -> evidence gate | atomize/infect planning APIs | dry-run fixture snapshots |
| ATM-MAP-LANG-0600 | map members, edges, entrypoints, graph conversion, evidence gate | dependency/call/artifact graph -> map proposal -> gate | `buildAtomicMapDecomposition()` | graph-to-map fixtures |
| ATM-MAP-LANG-0700 | Python inventory, graph, side-effect detection, dry-run, diagnostics | Python source -> inventory -> graph -> dry-run -> diagnostics | `packages/language-python/*` | python-adapter validator |
| ATM-MAP-LANG-0800 | JS/TS v2 surface, inventory, route planning, dry-run validator | JS/TS source -> inventory -> route plan -> dry-run | `packages/language-js/*` | language-js validator |
| ATM-MAP-LANG-0900 | English adapter guide, Go code, Go atom/map example, validator facade | guide prose -> Go example -> validator facade | `universal-language-framework-plan.md` | guide validator + docs review |
| ATM-MAP-LANG-1000 | future language feasibility, PHP RFC, conformance checklist | feasibility -> RFC -> checklist | future strategy docs | neutrality + checklist validation |
| ATM-MAP-LANG-1100 | cross-map validators, no-shrink, coverage, facade, neutrality | plan tables -> validators -> regression report | validator suite | validate:guide + validate:neutrality + custom validators |

## 6. Task Split Rules

- 一張任務卡必須能交給一位工程師或一個 agent 完成，且有明確 owned surface。
- 任務卡不以單一函式拆分，而以「可驗收能力」拆分。
- 共用 contract 先凍結；下游 adapter / core / CLI 任務只能消費 contract，若需要改 contract 必須開 contract delta。
- CLI / script 任務只能做 thin facade；核心邏輯必須落在 atomized implementation 或 package module。
- 文件任務與程式任務分離；驗證任務只新增 validator / fixture，不改 production behavior。
- 合併任務只允許發生在同一 owned surface 內；跨 package、跨 responsibility 的舊卡不能硬合併。

## 7. Milestones And Task Cards

| Task ID | Map | Title | Owned Surface | Depends On |
| --- | --- | --- | --- | --- |
| ATM-LANG-0001 | ATM-MAP-LANG-0001 | 繁中主規劃書與 atomic-map roadmap | `ATM通用語言框架計畫書.md` | - |
| ATM-LANG-0002 | ATM-MAP-LANG-0900 | 英文 companion 教學文件骨架 | `universal-language-framework-plan.md` | ATM-LANG-0001 |
| ATM-LANG-0003 | ATM-MAP-LANG-0001 | 新舊需求 traceability matrix | 繁中主規劃書內對照章節 | ATM-LANG-0001 |
| ATM-LANG-1101 | ATM-MAP-LANG-1100 | Roadmap no-shrink and traceability validator | task count and requirement coverage checker | ATM-LANG-0003 |
| ATM-LANG-1102 | ATM-MAP-LANG-1100 | Atom/map coverage validator | checks every task maps to atom/map and owned surface | ATM-LANG-1101 |
| ATM-LANG-1103 | ATM-MAP-LANG-1100 | Script facade boundary validator | checks CLI/scripts do not own core language logic | ATM-LANG-1102 |
| ATM-LANG-0100 | ATM-MAP-LANG-0100 | `LanguageAdapter v2` public contract | plugin-sdk language adapter types | ATM-LANG-0003 |
| ATM-LANG-0101 | ATM-MAP-LANG-0100 | Shared language analysis schemas | inventory, symbol, range, graph, diagnostics schemas | ATM-LANG-0100 |
| ATM-LANG-0102 | ATM-MAP-LANG-0100 | Runtime/equivalence/evidence contracts | runtime commands, equivalence fixtures, evidence types | ATM-LANG-0101 |
| ATM-LANG-0200 | ATM-MAP-LANG-0200 | Adapter registry and resolver | adapter discovery/resolution modules | ATM-LANG-0100 |
| ATM-LANG-0201 | ATM-MAP-LANG-0200 | Capability fallback and user messages | fallback policy and unsupported capability reports | ATM-LANG-0200 |
| ATM-LANG-0202 | ATM-MAP-LANG-0200 | Bundled/external adapter discovery strategy | package discovery docs and resolver fixtures | ATM-LANG-0200 |
| ATM-LANG-0300 | ATM-MAP-LANG-0300 | LegacyRoutePlan adapter delegation | core route-plan interface and delegation path | ATM-LANG-0201 |
| ATM-LANG-0301 | ATM-MAP-LANG-0300 | Remove core language regex ownership | core parser fallback only, no Python/Java/C#/Go special cases | ATM-LANG-0300 |
| ATM-LANG-0302 | ATM-MAP-LANG-0300 | Guidance and police integration update | guidance route engine and police consumers | ATM-LANG-0300 |
| ATM-LANG-0400 | ATM-MAP-LANG-0400 | Adapter-driven source inventory service | candidate inventory service modules | ATM-LANG-0101 |
| ATM-LANG-0401 | ATM-MAP-LANG-0400 | Candidate ranking signal model | ranking scoring inputs and report provenance | ATM-LANG-0400 |
| ATM-LANG-0402 | ATM-MAP-LANG-0400 | `candidates rank` thin facade conversion | CLI command only, delegating to inventory/ranking services | ATM-LANG-0401 |
| ATM-LANG-0500 | ATM-MAP-LANG-0500 | Generic atomize/infect dry-run plan contracts | reusable dry-run plan types | ATM-LANG-0102 |
| ATM-LANG-0501 | ATM-MAP-LANG-0500 | Import rewrite, shim, rollback plan contracts | planning subcontracts and fixtures | ATM-LANG-0500 |
| ATM-LANG-0502 | ATM-MAP-LANG-0500 | Dry-run proposal evidence envelope | dry-run evidence requirements and reports | ATM-LANG-0501 |
| ATM-LANG-0600 | ATM-MAP-LANG-0600 | Atomic map decomposition contract | map members, edges, entrypoints schemas | ATM-LANG-0101 |
| ATM-LANG-0601 | ATM-MAP-LANG-0600 | Graph-to-map decomposition proposal | dependency/call/artifact graph conversion module | ATM-LANG-0600 |
| ATM-LANG-0602 | ATM-MAP-LANG-0600 | Large-feature decomposition evidence gate | map-level evidence gate and fixtures | ATM-LANG-0601 |
| ATM-LANG-0700 | ATM-MAP-LANG-0700 | Python AST inventory and symbol ranges | Python scanner internals | ATM-LANG-0101 |
| ATM-LANG-0701 | ATM-MAP-LANG-0700 | Python dependency/call/artifact graph | Python graph extraction internals | ATM-LANG-0700 |
| ATM-LANG-0702 | ATM-MAP-LANG-0700 | Python CLI/API/side-effect surface detection | Python adapter inventory enrichment | ATM-LANG-0701 |
| ATM-LANG-0703 | ATM-MAP-LANG-0700 | Python precise atomize/infect dry-run | Python adapter planning methods | ATM-LANG-0502 |
| ATM-LANG-0704 | ATM-MAP-LANG-0700 | Python equivalence fixtures and diagnostics | Python fixtures, diagnostics parser, validator expansion | ATM-LANG-0703 |
| ATM-LANG-0800 | ATM-MAP-LANG-0800 | JS/TS v2 capability alignment | JS/TS adapter public surface | ATM-LANG-0102 |
| ATM-LANG-0801 | ATM-MAP-LANG-0800 | JS/TS inventory and route planning | JS/TS adapter scanner/planner internals | ATM-LANG-0800 |
| ATM-LANG-0802 | ATM-MAP-LANG-0800 | JS/TS dry-run and validator expansion | JS/TS fixtures and validator | ATM-LANG-0801 |
| ATM-LANG-0900 | ATM-MAP-LANG-0900 | English guide: adding a new language adapter | English companion prose sections | ATM-LANG-0102 |
| ATM-LANG-0901 | ATM-MAP-LANG-0900 | English guide: complete Go adapter code example | Go example code blocks in companion doc | ATM-LANG-0900 |
| ATM-LANG-0902 | ATM-MAP-LANG-0900 | English guide: Go atom/map development example | Go adapter atomic map/spec examples in companion doc | ATM-LANG-0901 |
| ATM-LANG-0903 | ATM-MAP-LANG-0900 | English guide: Go validator and thin facade example | validator/script facade examples in companion doc | ATM-LANG-0902 |
| ATM-LANG-1000 | ATM-MAP-LANG-1000 | Java/C#/Go adapter feasibility notes | future adapter strategy section | ATM-LANG-0903 |
| ATM-LANG-1001 | ATM-MAP-LANG-1000 | PHP dynamic include RFC | PHP feasibility section | ATM-LANG-1000 |
| ATM-LANG-1002 | ATM-MAP-LANG-1000 | Future adapter conformance checklist | adapter checklist shared by future languages | ATM-LANG-1001 |
| ATM-LANG-1100 | ATM-MAP-LANG-1100 | Cross-map validator suite | validators for type/schema/guidance/adapter coverage | ATM-LANG-0802 |
| ATM-LANG-1104 | ATM-MAP-LANG-1100 | Docs neutrality and bilingual positioning validator | neutrality strategy and English canonical check | ATM-LANG-0903 |

> 任務索引與內部 task card 放在 `tasks/`。這些卡是計畫內部追蹤卡，不等同於已進入 active ATM task state；正式拿卡時仍需依 repo 規則 lock / update frontmatter / unlock。

## 8. New/Old Comparison Guard

### 8.1 Original requirement coverage

| Original Requirement | Covered By |
| --- | --- |
| `scanSourceInventory` | ATM-LANG-0101, ATM-LANG-0400, ATM-LANG-0700, ATM-LANG-0801 |
| `buildLegacyRoutePlan` | ATM-LANG-0300, ATM-LANG-0301, ATM-LANG-0302 |
| `planAtomizeDryRun` | ATM-LANG-0500, ATM-LANG-0501, ATM-LANG-0502, ATM-LANG-0703, ATM-LANG-0802 |
| `planInfectDryRun` | ATM-LANG-0500, ATM-LANG-0501, ATM-LANG-0502, ATM-LANG-0703, ATM-LANG-0802 |
| `buildAtomicMapDecomposition` | ATM-LANG-0600, ATM-LANG-0601, ATM-LANG-0602 |
| `computeEquivalenceContract` | ATM-LANG-0102, ATM-LANG-0704 |
| `detectRuntimeCommands` | ATM-LANG-0102, ATM-LANG-0901 |
| `normalizeSymbolId` | ATM-LANG-0101, ATM-LANG-0901 |
| `parseDiagnostics` | ATM-LANG-0102, ATM-LANG-0704, ATM-LANG-0903 |
| `capabilities` | ATM-LANG-0100, ATM-LANG-0201 |

### 8.2 Previous 82-card theme coverage

- Contract / schema / fallback themes are consolidated into ATM-LANG-0100 through ATM-LANG-0202.
- Core delegation themes are consolidated into ATM-LANG-0300 through ATM-LANG-0302.
- Candidate ranking themes are consolidated into ATM-LANG-0400 through ATM-LANG-0402.
- Dry-run and atomic-map themes are consolidated into ATM-LANG-0500 through ATM-LANG-0602.
- Python themes are consolidated into ATM-LANG-0700 through ATM-LANG-0704.
- JS/TS themes are consolidated into ATM-LANG-0800 through ATM-LANG-0802.
- English Go guide themes are consolidated into ATM-LANG-0900 through ATM-LANG-0903.
- Future language and validation themes are consolidated into ATM-LANG-1000 through ATM-LANG-1104.

### 8.3 Merge validation rule

- 合併只允許發生在同一 owned surface 內。
- 若兩張舊卡會修改不同 package 或不同 responsibility，不能合併。
- 每張新卡要列出其 absorbed old themes，避免規劃書內容誤刪。
- `ATM-LANG-1101` 必須能檢查本計畫仍有 41 張任務卡，且每張卡都有 map、owned surface、depends 與 coverage entry。

## 9. English Companion Requirements

英文 companion 是 `universal-language-framework-plan.md`。它不是單純 roadmap，而是「如何新增一個新的程式語言 adapter」的教學文件。

必須包含：

- `LanguageAdapter v2` mental model。
- adapter identity and exports。
- `capabilities`。
- `detectProjectProfile()`。
- `scanSourceInventory()`。
- `normalizeSymbolId()`。
- `buildLegacyRoutePlan()`。
- `planAtomizeDryRun()` / `planInfectDryRun()`。
- `detectRuntimeCommands()`。
- `parseDiagnostics()`。
- validator thin facade calling atomized implementation。
- Go adapter 如何拆成 atom / map，而不是寫成單支大型 script。

英文 companion 使用 Go 作為主要範例，但本輪不交付正式 Go adapter package。Go 只作為 future adapter author 的完整示範。

## 10. Future Adapter Strategy

本節對應 `ATM-LANG-TABLE-0010`。它的用途不是宣布更多語言已經支援，而是把「未來可做、目前不能承諾、下一步要補什麼 evidence」先寫清楚。

既有 reference adapter 的定位仍保留：

- Python：以既有 bundled adapter 升級到 v2 conformance 為主，風險在 AST / graph 精準度、side-effect detection、dry-run evidence。
- JS/TS：以既有 reference adapter 對齊 v2 為主，風險在舊 import scanner 與 v2 schema、route plan delegation 的一致性。

### 10.1 Support Level Taxonomy

| Support Level | 意思 | 可用話術 | 禁止話術 |
| --- | --- | --- | --- |
| Official | repo 內有 package、validator、fixtures，且 policy 能解析到該 adapter | `official bundled adapter` | 只有範例或 RFC 就宣稱正式支援 |
| Advisory | 文件有完整示範或建議流程，但本輪沒有正式 package | `advisory example` / `guide example` | 說 ATM 會自動處理該語言 |
| Future | 只有可行性、風險與下一步契約 | `future adapter candidate` | 暗示已能掃描、atomize、infect |
| RFC | 先記錄高風險設計議題，還不能放進 core contract | `RFC / design note` | 把未驗證規則寫成 core guarantee |

### 10.2 Future Adapter Readiness Matrix

| Language | Current Status | Blocking Risk | Next Contract | Not In Scope |
| --- | --- | --- | --- | --- |
| Go | Advisory example；英文 companion 使用 Go 示範 `LanguageAdapter v2`，但本輪不交付 official Go package | `go.mod` / workspace、多 binary、generated code、vendor 與 build tag 導致 inventory 不穩 | fixture-backed source inventory、diagnostics parser、dry-run reports、thin validator facade | 不宣稱 Go 已正式支援；不執行 `go test` / `go build`；不修改 host Go source |
| Java | Future feasibility；先記錄 adapter 輪廓 | Maven / Gradle、多 module、source set、annotation processing、generated sources | project profile detection、source inventory schema、symbol ID rule、runtime command detection advisory、diagnostics fixtures | 不交付 official Java package；不執行 Maven / Gradle；不執行 annotation processor |
| C# | Future feasibility；先記錄 adapter 輪廓 | solution / project graph、partial class、generated code、Unity/Cocos 外部工具鏈、analyzer output | solution profile、symbol/range rule、diagnostics parser、dry-run fixture、project profile evidence | 不交付 official C# package；不執行 MSBuild；不做 Unity runtime introspection |
| PHP | RFC only；先處理 dynamic include / autoload 風險 | `include` / `require` 可用 runtime expression、Composer autoload、弱型別 symbol、magic method | advisory symbol resolution policy、Composer manifest / classmap evidence、include evidence model | 不放進 core contract；不保證解析 dynamic include；不執行 PHP / Composer |

### 10.3 Java Feasibility Notes

Java adapter 的第一版不應從「跑 Maven / Gradle」開始，而應從靜態 evidence 開始。最低可行範圍是：

- 偵測 `pom.xml`、`build.gradle`、`settings.gradle`、`src/main/java`、`src/test/java` 等 project profile evidence。
- 掃描 source inventory，回報 file、package、class/interface/enum、method、range reference。
- annotation processing 或 generated sources 只能標成 `generated-or-processor-dependent`，不能假裝已完整解析。
- runtime command detection 只產出 advisory command，例如 `mvn test`、`gradle test`，不得在 adapter 內執行。
- diagnostics parser 必須以 fixture 測試 javac / Maven / Gradle 常見格式。

### 10.4 C# Feasibility Notes

C# adapter 的主要難點是 solution/project 與 partial class。最低可行範圍是：

- 偵測 `.sln`、`.csproj`、`Directory.Build.props`、`Assets/` 或 Unity 相關 project profile evidence。
- source inventory 要能標示 namespace、type、method/property、partial declaration、generated file risk。
- Unity / Cocos 外部工具鏈只當作 profile evidence，不做 runtime introspection。
- diagnostics parser 必須以 fixture 覆蓋 Roslyn / MSBuild 常見格式。
- dry-run 只能提出 atomize / infect plan，不改 `.cs`、`.csproj` 或 generated files。

### 10.5 PHP Dynamic Include RFC

PHP 不應直接塞進 core contract，原因是 include/autoload 常在 runtime 才知道答案。RFC 規則如下：

- literal `include 'path.php'` / `require_once __DIR__ . '/path.php'` 可作為 strong evidence。
- Composer `composer.json`、`composer.lock`、autoload classmap / PSR-4 可作為 advisory evidence。
- 變數 include、function-return include、conditional include、magic autoload 只能標為 unresolved，不可當 hard gate。
- symbol resolution policy 必須保守：找不到 evidence 時回報 `partial` 或 `none`，不得猜成 `full`。
- future PHP adapter 必須把 include evidence、autoload evidence、unresolved include list 寫入 diagnostics 或 inventory extension。

### 10.6 Future Adapter Conformance Checklist

未來任何 Java / C# / Go / PHP adapter 要升級狀態，至少通過：

- adapter 可 assign 到 `LanguageAdapterV2`，且 `adapterId`、`languageId`、`contractVersion` 穩定。
- capability 宣告必須對應實際 method 與 fixture；沒有 evidence 的能力只能標 `partial` 或 `none`。
- source inventory 必須回傳 file、symbol、range；graph evidence 不足時要明確降級。
- `planAtomizeDryRun()` / `planInfectDryRun()` 必須保持 `executionMode: 'dry-run'` 與 `evidence.mutates: []`。
- runtime command detection 不得安裝 dependency、不得執行 host code，只能建議 command。
- diagnostics parser 必須 deterministic，且用 fixture-backed validation。
- validator / CLI 只能是 thin facade，語言解析邏輯必須在 adapter package 或 atomized implementation。
- 文件必須維持 Official / Advisory / Future / RFC 區分，不能把 roadmap 寫成已支援能力。
- 若 adapter 會產出 Atomic Maps table，必須先回寫 §5.1 的 Table ID，再補 validator。

### 10.7 Not-In-Scope Rules

本輪不交付 official Java / C# / Go / PHP production adapter；不在 dry-run 階段執行 host toolchain；不把 dynamic include、annotation processing、partial class、generated code 這類高風險語意寫成 core guarantee。這些內容只允許作為 future contract 或 RFC evidence。

## 11. Test Plan

### 11.1 文件建立後讀回檢查

- 任務卡數量為 41 張，少於 82 但每張具備可獨立交辦 owned surface。
- 每張任務卡都有 map、owned surface、依賴關係。
- `New/Old Comparison Guard` 覆蓋原始 10 個 interface 需求與前版 82 張任務卡主題。
- 英文 companion 以新語言接入教學與 Go code examples 為主。
- Python 任務描述為 v2 conformance 升級，不是從零建立。

### 11.2 後續實作驗證

```bash
npm run typecheck
npm run validate:plugin-sdk
npm run validate:python-adapter
npm run validate:language-js
npm run validate:guidance
npm run validate:guide
npm run validate:neutrality
```

### 11.3 新增專用驗證

- roadmap no-shrink / traceability validator。
- atom / map coverage validator。
- script facade boundary validator。
- docs neutrality and bilingual positioning validator。

## 12. Assumptions

- 任務卡目前只放入本計畫資料夾，不建立 active ATM task state。
- 任務粒度以「交辦不互相踩檔案」優先，而不是追求任務卡數量多。
- 目標實作 repo 是 `C:\Users\User\AI-Atomic-Framework`；3KLife repo 保留採用策略、計畫書與治理追蹤。
- 若後續實作中某張卡需要改到另一張卡 owned surface，必須先新增 contract delta 或拆出 coordination task。
- 若 `LanguageAdapter v2` 成為正式 public contract，需同步更新 ATM versioning policy 或 keep 中的相關共識。

## 13. 大白話解釋

這份計畫的重點不是「ATM 要一次懂所有程式語言」，而是「ATM core 不要再自己猜每種語言」。以後每種語言都派自己的 adapter 出來回答：這個專案怎麼跑、哪些檔案是入口、有哪些 symbol、怎麼切 atom、怎麼做 dry-run、怎麼看錯誤訊息。

原本 82 張卡太碎，像把一台機器拆成螺絲粒度，很難交辦，也容易多個 agent 同時踩同一個檔案。新版收成 41 張卡，每張都以一塊可驗收能力為單位，例如 contract、resolver、candidate ranking、Python adapter、JS/TS adapter、英文 guide、validator。

最大的修正是 Python：現在 upstream 已經有 `packages/language-python`，所以不能再寫「新增 Python adapter」當主軸。正確說法是「把既有 Python adapter 升級到 v2 標準，補 AST、graph、dry-run、diagnostics、fixtures」。這樣計畫才貼近現況，不會讓後續 agent 重做已完成的事。

英文版則是對外教學，不是把中文計畫翻譯一次。它要讓未來想支援 Go、Java、C# 或 PHP 的人，看完就知道 adapter 該怎麼寫、capability 怎麼報、validator 怎麼接、CLI 為什麼只能當 facade。
