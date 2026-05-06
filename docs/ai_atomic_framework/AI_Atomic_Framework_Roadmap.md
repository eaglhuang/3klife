<!-- doc_id: doc_other_0029 -->
# AI Atomic Framework：可獨立開源的 AI Vibe Coding 原子化治理框架 Roadmap

> ⚠️ **historical document** — 本文件為理論藍圖，**不得直接作為開工準則**。任務代號、路徑、Week plan 僅保留概念參考。實作以 `AI原子框架開發計畫書.md`（active）為準。
>
> 版本：v0.2 integration  
> 目的：建立一套可獨立發布到 `https://github.com/eaglhuang/AI-Atomic-Framework` 的「原子化治理框架」，讓任何技術棧中的 AI 產出都可以被拆解、約束、驗證、索引、重用、接入既有系統，避免大型工程在多輪 AI 修改後發生方向漂移、規則失控、品質退轉與重做循環。
> 定位：本文件是上游開源框架藍圖；任何專案特定工具、遊戲引擎、任務卡系統或 legacy 案例，都只能透過 Adapter / Plugin / Example 接入，不得成為 core 的隱性前提。

---

## 0. 本文件的核心結論

AI Vibe Coding 失控時，真正的問題通常不是單純「某段程式碼寫不好」，而是大型工程缺少可攜、可驗證、可回滾的治理框架：

- AI 一次吃進太大的上下文，容易誤解歷史規則。
- 舊 plan、新 plan、老工具、新工具並存，造成規則漂移。
- 單一巨大腳本承載太多責任，導致任何小修改都有全局副作用。
- 缺乏可量化驗收與多場景回歸矩陣，造成過度擬合單一案例。
- 每一輪修改都看似合理，但沒有穩定的契約與防退轉機制，最終導致「五次大改仍然不穩」。

因此，真正要解的不是「再叫 AI 修一次」，而是建立一套能約束 AI、並可搬到任何專案中的工程框架：

> **先讓 AI 在嚴格契約中建立 AI Atomic Framework，再讓任何 host project 透過 Adapter 使用它，逐步接管、原子化、驗證、修復既有系統。**

這套框架的關鍵不是讓 AI 更自由，而是讓 AI 更像「受控的純函數加工機」。

---

## 0.1 v0.2 務實化補充

`AI_Atomic_Framework_Optimized_Roadmap_v0.2.md` 已被採納為 companion analysis，而不是取代本 Roadmap 的新真相。v0.2 的價值在於降低 MVP 門檻，避免框架在救援 legacy 前先變成另一個大型系統。

本 Roadmap 因此新增以下硬原則：

- **Core 極簡**：v0.1 alpha 只要求 Atomic Spec、Manager 最小指令、JSON Registry、HashLock、basic Police 與 Plugin SDK。其他能力一律先進 optional plugin 或 adapter。
- **Default Governance Bundle**：ATM 不能只剩 atom runner。v0.1 alpha 需提供可替換的預設治理套件，涵蓋 task cards、scope lock、doc index、shard、rule guard、encoding、context budget 與 evidence；但 `packages/core` 只能依賴 governance contracts，不得 import default plugin 實作。
- **Agent Operating Layer**：v0.1 alpha 需提供 model-neutral README / AGENTS template / project probe / default profile，讓使用者把 ATM 放入任意 repo 根目錄後，AI agent 讀文件即可自動開卡、鎖 scope、保存 artifacts/logs/evidence 並跑 default guards。
- **Self-Hosting Alpha Gate**：v0.1 alpha 必須先在 standalone upstream repo 內證明 AI agent 只讀 README / AGENTS / `.atm/profile` 就能完成 first task、scope lock、artifact/log/evidence 與 first atom smoke；在此之前不得拿 3KLife 當成功前提。
- **Docs Neutrality / Boundary Guard**：上游 protected surfaces（README / AGENTS / docs / examples / templates）不得夾帶 3KLife、Cocos、html-to-ucuf 或本地治理工具前提，且需由 deterministic guard 持續掃描，必要時再用 semantic audit 補抓隱性耦合。
- **Agent Governance Bundle**：`encoding guard`、`context budget guard` 與 `docs neutrality / boundary guard` 應被視為同一組 model-neutral agent governance bundle；3KLife 既有 keep/token 規則只能透過 adapter 映射，不得回寫成 upstream 私有前提。
- **無硬依賴**：Core 不得硬依賴 GitHub Spec Kit、Atomic Agents、LangGraph、PR-Agent、PostgreSQL、pgvector、OpenTelemetry、Prometheus、Deno sandbox 或任何單一 LLM vendor。這些只能透過 `packages/adapter-*` 或 `packages/plugin-*` 啟用。
- **PEV Loop 標準化**：所有原子工作都遵守 Plan（spec/task card）→ Execute（AI 只改 allowed files）→ Verify（test/police/regression/hash）→ Converge（registry/living spec/版本紀錄）。
- **6 週 MVP 節奏**：前 6 週以可注入第一個 low-risk atom 為目標；Performance Police、Capability Sandbox、Vector Index、完整 Observability 與多 agent workflow 均不阻塞 v0.1 alpha。
- **Living Spec 先輕後重**：MVP 只要求 spec 與 code 變更有差異提示；自動同步器列為後續 optional feature，不得成為早期核心 gate。

v0.2 建議的 TypeScript、Zod、Vitest、Commander、ts-morph 等工具，是 first implementation recommendation，不是框架哲學。Atomic Spec、Adapter API 與 CLI report schema 必須保持語言與工具無關。

---

## 1. 問題背景：為什麼原本的 Vibe Coding 會失控

以下症狀可以發生在網頁、遊戲、資料管線、後端服務、AI agent workflow 或任何長期由 AI 協作維護的專案中。`html-to-ucuf` / 3KLife 只是壓力測試案例，不是本框架的核心假設。

### 1.1 巨大檔案造成 AI 上下文污染

例如，一個 host project 可能出現：

- 單一 legacy script 約數千行，混雜 parser、型別推理、格式轉換、資產處理、互動解析。
- 單一 rule checker 同時處理掃描、驗證、摘要、telemetry、修補建議。
- 多個 CLI 各自處理 preload、telemetry、backup、browser / engine 初始化與截圖。

這會讓 AI 很難只改一個點。

它會為了解決 A 畫面的問題，順手改到 B 邏輯；為了修 pixel diff，破壞 rule registry；為了加一個 exception，污染整個 workflow。

---

### 1.2 規則漂移造成方向不穩

系統歷經 plan1 到 plan5，但各 plan 之間存在概念演化：

- plan2 偏 preserve-human / sync-existing。
- plan3 偏 zone ownership。
- plan4 偏 source-authoritative / rule registry。
- plan5 偏 root-cause taxonomy / ownership / multi-fixture。

問題不是每個 plan 都錯，而是：

> 新舊規則並列存在，但沒有明確 active spec 與 historical spec 的治理。

AI 看到 plan2 也覺得合理，看到 plan4 也覺得合理，看到 plan5 也覺得合理，最後就會產生混合式錯誤。

---

### 1.3 驗收模糊造成過度擬合

「95% 像素級對標」如果沒有數學定義，就會變成 AI 的災難。

AI 會問：

- 是 pixel coverage？
- 是 SSIM？
- 是 component coverage？
- 是 layout accuracy？
- 是 structure match？
- target runtime 做不到的效果算不算扣分？
- 已知 gap 是否要排除？
- assetization-required 是否算成功？

沒有明確定義，就會造成每次大改都朝不同方向努力。

---

### 1.4 單畫面驗證造成過度擬合

如果只用單一 flagship fixture 或單一畫面當驗證目標，AI 很容易：

- 修一個 tab-rail，破壞其他 layout。
- 修一個 button，破壞 text layout。
- 修一個 glow，破壞 runtime renderer。
- 為了讓單一 screenshot 變像，加入不可泛化的特殊規則。

這就是「看似進步，實際退化」的核心原因。

---

## 2. AI Atomic Framework 的願景

### 2.1 一句話定義

**AI Atomic Framework 是一套專為 AI Vibe Coding 設計、可獨立開源並移植到任何專案的原子化工程治理框架。**

它的目標是：

> 把一個巨大、混亂、會漂移的大工程，拆成許多有契約、有測試、有索引、有依賴邊界、有健康檢查的小原子功能，讓 AI 可以逐一生成、驗證、替換、接入既有系統，最後組裝成穩定的大功能。

---

### 2.2 你要達成的終局效果

理想狀態如下：

1. 每個功能都可以被描述成一個 Atomic Spec。
2. 每個 Atomic Spec 都有明確 input schema、output schema、副作用限制、測試資料。
3. AI 只能根據 Spec 生成該原子的實作。
4. 每個原子都能自己跑測試，自己證明健康。
5. 原子之間只能透過 Atomic Map 與明確契約合作。
6. Atomic Manager 負責生成、替換、註冊、驗證、索引、打包，實際寫入方式由 Adapter 決定。
7. 舊系統不需要一次重寫，而是透過 host adapter 逐步呼叫原子 API。
8. 等舊功能逐步被原子取代後，再替換整個舊腳本。
9. 所有進展都有 regression matrix 與 hash lock，避免品質退轉。
10. AI 可以開發框架本身，框架再用來治理 AI 寫出的老系統。

---

### 2.3 獨立開源與宿主系統適配策略

AI Atomic Framework 的 core 必須保持超然於任何單一專案。框架本體不應知道 3KLife、Cocos、Unity、React、Python、GitHub Actions、任務卡系統或企業內部工具的存在。

正式分工如下：

| 層級 | 職責 | 可否包含專案邏輯 |
|---|---|---|
| Core Framework | Atomic Spec、Registry、Manager、Police、HashLock、Regression Matrix schema、Plugin SDK、CLI protocol | 不可 |
| Project Adapter | 任務鎖、品質 gate、文件 ID、編碼規則、VCS、CI/CD、組織治理流程 | 可以，但只在 adapter package |
| Language / Runtime Adapter | JS/TS/Python/C#/Cocos/Unity 等語言或 runtime 的測試、build、import 掃描、注入策略 | 可以，但只在 adapter package |
| Host Project | 實際 atoms、fixtures、legacy integration、domain-specific police、case study | 可以 |

因此，3KLife 是第一個 reference adopter，不是核心設計中心。html-to-ucuf 可以成為高壓案例，但它的 fidelity formula、Cocos 限制、畫面 fixture、legacy path 都不得進入 core framework。

---

### 2.4 預期開源 Repo 形態

上游 repo：`https://github.com/eaglhuang/AI-Atomic-Framework`

建議骨架：

```text
AI-Atomic-Framework/
  packages/
    core/                 Atomic Spec、Registry、HashLock、Manager core
    cli/                  init / status / scaffold / validate / test / register
    plugin-sdk/           ProjectAdapter / LanguageAdapter / Police / Capability API
    plugin-encoding/      UTF-8 / BOM / replacement char guard
    plugin-context-budget/ Context budget / summarize / hard-stop guard
    adapter-local-git/    無專案治理系統時的預設 Git/FileSystem adapter
    language-js/          JavaScript / TypeScript reference language adapter
  schemas/                JSON Schema / contract fixtures
  templates/              atom spec / test / plugin templates
  examples/               hello-world、molecule、legacy-strangler minimal example
  docs/                   quick start、architecture、adapter guide、migration guide
  LICENSE
  CONTRIBUTING.md
  CHANGELOG.md
```

任何 host project 若需要特殊流程，應建立自己的 adapter package，例如 `@3klife/atomic-adapter`，而不是 fork core framework。

---

## 3. 核心設計原則

### 3.1 AI 不是自由工程師，而是受控加工機

在這套架構中，AI 不應該被要求：

- 自己理解整個系統。
- 自己決定架構邊界。
- 自己判斷該不該改外部檔案。
- 自己猜測性能風險。
- 自己決定測試足不足夠。
- 自己自由呼叫底層工具。

AI 應該只做：

- 根據 Spec 寫一個小功能。
- 根據 Test 修到通過。
- 根據 Manager 指令做局部替換。
- 根據 Police 報告做局部瘦身。
- 根據 Registry 查詢是否已有可重用原子。

---

### 3.2 契約優先，程式碼其次

在 AI Atomic Framework 中，`spec` 比 `code` 更重要。

因為程式碼可以由 AI 重寫，但契約必須穩定。

每個原子必須先有：

- 功能意圖
- input schema
- output schema
- allowed dependencies
- forbidden dependencies
- side effect policy
- performance budget
- test fixtures
- owner
- version
- hash
- status

然後才允許 AI 產生程式碼。

---

### 3.3 Git 是真相來源，資料庫是索引層

不要把原始 spec 與 code 只放進 PostgreSQL。

建議：

- **Git / 檔案系統**：保存 spec、code、test、map、registry 的真實版本。
- **PostgreSQL / pgvector**：保存索引、搜尋、依賴圖、使用關係、相似度查詢、歷史統計。

原因：

- Git 適合 diff、review、rollback、branch、merge。
- AI IDE 與人類工程師都容易操作檔案。
- DB 適合查詢與索引，但不適合作為唯一原始碼來源。
- 兩者分工後，系統最穩。

---

### 3.4 開發期虛擬隔離，執行期貼近 Legacy

你提出一個很重要的修正：

> 不希望每個原子最後都變成一堆資料夾，因為邊際成本太高；實際執行時，希望 Atomic Manager 把原子函數插入或替換到既有 Legacy 腳本中，成為內部 API。

這是正確方向。

建議採用「core 只產生可驗證 plan，adapter 負責實際落地」的雙層策略：

#### 開發期：虛擬原子化

AI 寫原子時，使用沙盒與獨立上下文：

```text
atomic_workbench/
  atoms/
    atomic_000001/
      spec.json
      index.ts
      test.ts
```

這是給 AI、測試、Police、Manager 使用的工作區。

#### 執行期：Legacy 注入式整合

通過驗證後，Atomic Manager 只產生 injection plan / rollback plan；是否直接寫檔、送 PR、產生 patch、或交給人工審核，由 host adapter 決定：

```text
src/legacy/SomeExistingScript.ts
src/legacy/_atomic_registry.ts
src/legacy/AtomicInterface.ts
```

函數名稱包含功能與原子代號：

```ts
export function parseHtmlToDom_atomic_000001(input: ParseHtmlInput): ParseHtmlOutput {
  // generated atomic implementation
}
```

並建立索引表：

```json
{
  "atomic_000001": {
    "functionName": "parseHtmlToDom_atomic_000001",
    "scriptPath": "src/legacy/_atomic_registry.ts",
    "publicInterface": "AtomicInterface.parseHtmlToDom",
    "usedBy": [
      "src/legacy/legacy-entry.ts",
      "host-project/path/to/legacy-entry.ts"
    ]
  }
}
```

這樣既能維持 AI 開發時的原子化，又能讓舊系統逐步接入，不需要一次重構。

---

### 3.5 Core 禁止耦合清單

上游 core framework 不得直接依賴或硬編碼：

- 任一 host project 的目錄結構或任務卡命名規則。
- 任一遊戲引擎、UI framework、後端框架或 CI/CD 產品。
- 任一專案內部工具，例如 task lock、doc-id、custom compute gate。
- 任一 domain-specific fidelity formula、fixture 名稱、known-gap taxonomy。
- 任一 LLM vendor API；core 只定義 Capability interface。

若需要這些能力，必須透過 Project Adapter、Language Adapter、Capability Plugin 或 Example package 接入。

### 3.5.1 Neutrality / Boundary Guard

「禁止耦合」不能只停留在文件口號，必須落成可持續執行的 guard。

建議分成兩層：

1. deterministic guard：掃 `source / docs / examples / templates / prompt assets` 的 import、shell command、路徑常數、package name、banned terms 與 protected surfaces，作為 hard fail 的主要來源。
2. optional semantic audit：由 LLM 協助標記隱性耦合敘事、stale example、類 dead-doc 與 adopter-specific wording；這一層只應產出 `warn` / `needs-review`，不單獨決定 hard fail。

真正的 source dead code、unreachable branch、unused export 與跨層依賴，仍應交給靜態分析器、import graph 與確定性 police；LLM 在這裡只補語意，不取代計算型裁決。

### 3.5.2 Upstream 文件中立性

ATM 作為獨立開源框架時，上游 repo 的 README / AGENTS / docs / examples / templates 都必須保持 adopter-neutral。

- `3KLife`、`Cocos`、`html-to-ucuf` 與本地治理工具可以存在於 downstream adapter 文件、case study 或外部 tracking docs。
- 它們不應出現在 upstream protected surfaces 中，尤其不能被寫成 core 前提、bootstrap 前提或 hello-world 的必需背景。
- 若需要展示 adopter 整合，應透過 example package、adapter guide 或獨立 case study repo 呈現，而不是污染 core docs。

### 3.5.3 Context Budget Guard

`context budget` 不應只是某個 host project 的 prompt 習慣，而必須成為 ATM upstream 可獨立治理的 primitive。

最低需求如下：

1. 對重量文件、批次圖片、長篇 log、compare board 與大型 artifact 定義 budget policy，而不是讓 agent 自行猜測。
2. 對超額情境提供至少三種結果：`pass`、`summarize-before-continue`、`hard-stop`。
3. 產出可回放的報告與摘要，例如 `.atm/reports/context-budget/*.json` 與 `.atm/state/context-summary/*.md`。
4. 可由 host adapter 覆寫閾值與策略，但不得把 3KLife 的 token guard 數字與 keep 規則寫死成 upstream 唯一真相。

這個 primitive 與 `encoding guard`、`neutrality / boundary guard` 共同構成 Agent Governance Bundle：前者防止上下文暴增與重型 artifact 污染，後兩者分別防止檔案寫壞與 adopter 私有資訊回流。

---

## 4. 核心名詞定義

---

### 4.1 Atomic Spec

`Atomic Spec` 是每個原子的身份證與契約。

它描述：

- 這個原子做什麼。
- 它吃什麼 input。
- 它吐什麼 output。
- 它能不能有副作用。
- 它能依賴誰。
- 它不能依賴誰。
- 它的性能預算。
- 它的測試資料。
- 它目前狀態。
- 它的版本與 hash。

範例：

```json
{
  "atomicId": "000001",
  "name": "parseHtmlToDom",
  "version": "1.0.0",
  "kind": "compute",
  "description": "Parse HTML string into normalized DOM tree.",
  "status": "stable",
  "inputSchema": {
    "type": "object",
    "required": ["html"],
    "properties": {
      "html": {
        "type": "string",
        "maxLength": 100000
      }
    }
  },
  "outputSchema": {
    "type": "object",
    "required": ["domTree"],
    "properties": {
      "domTree": {
        "$ref": "#/definitions/DomNode"
      }
    }
  },
  "sideEffects": {
    "allowed": false
  },
  "dependencyPolicy": {
    "allowedAtomics": [],
    "allowedCapabilities": [],
    "forbiddenImports": ["fs", "child_process", "puppeteer"]
  },
  "performanceBudget": {
    "maxRuntimeMs": 10,
    "maxAllocatedBytes": 10240,
    "allowAsync": false,
    "allowDeepClone": false
  },
  "testPolicy": {
    "requiredFixtureCount": 5,
    "mustIncludeNegativeCases": true,
    "mustIncludeLegacyCase": true
  },
  "hashLock": {
    "specHash": "",
    "codeHash": "",
    "testHash": ""
  }
}
```

---

### 4.2 Atomic Code

Atomic Code 是 AI 根據 Spec 產生的實作。

特點：

- 優先為純函數。
- 不讀全域變數。
- 不直接存取外部系統。
- 不直接呼叫 Puppeteer / File IO / DB。
- 不直接改 Legacy 物件。
- 不做深拷貝大型物件。
- 不使用字串 dispatcher。
- 不引入未授權依賴。

建議函數格式：

```ts
export function parseHtmlToDom_atomic_000001(
  input: Readonly<ParseHtmlInput>
): ParseHtmlOutput {
  // implementation
}
```

---

### 4.3 Atomic Test

Atomic Test 是原子的自我驗證機制。

必須包含：

- 正例 fixture
- 反例 fixture
- edge case fixture
- legacy input fixture
- schema validation
- performance validation
- forbidden import validation
- snapshot validation
- mutation safety validation

Atomic Test 不是「看起來可以」，而是 binary：

```text
PASS / FAIL
```

AI 不能靠文字說服你它做完了，必須通過測試。

---

### 4.4 Atomic Map

Atomic Map 定義多個原子如何串成一個較大的功能。

它描述：

- 節點
- 邊
- 資料傳遞
- 執行順序
- 可並行節點
- 錯誤處理
- fallback
- integration test
- final output schema

範例：

```json
{
  "mapId": "map_html_to_ucuf_000001",
  "name": "htmlToUcufMinimalPipeline",
  "nodes": [
    {
      "id": "n1",
      "atomicId": "000001",
      "alias": "parseHtml"
    },
    {
      "id": "n2",
      "atomicId": "000002",
      "alias": "extractTypography"
    },
    {
      "id": "n3",
      "atomicId": "000003",
      "alias": "buildUcufTree"
    }
  ],
  "edges": [
    {
      "from": "n1.domTree",
      "to": "n2.domTree"
    },
    {
      "from": "n2.typographyModel",
      "to": "n3.typographyModel"
    }
  ],
  "integrationTests": [
    "fixtures/reference-case/minimal-input.json"
  ]
}
```

---

### 4.5 Atomic Manager

Atomic Manager 是整個框架的協調器。

它不是單純 code generator，而是：

- Spec parser
- scaffolder
- AI task dispatcher
- sandbox runner
- test runner
- validator
- hash locker
- registry updater
- dependency checker
- legacy injector
- static interface generator
- police orchestrator
- molecule bundler

Atomic Manager 的原則：

> Manager 不相信 AI 的文字結果，只相信測試、schema、hash、diff、metrics。

---

### 4.6 Atomic Registry

Atomic Registry 是所有原子的清單。

包含：

- atomicId
- name
- version
- status
- scriptPath
- functionName
- publicInterface
- dependencies
- usedBy
- performance metrics
- test status
- hash
- embedding id
- deprecation info

Registry 可以先用 JSON：

```json
{
  "atomics": [
    {
      "atomicId": "000001",
      "name": "parseHtmlToDom",
      "version": "1.0.0",
      "status": "stable",
      "scriptPath": "src/legacy/_atomic_registry.ts",
      "functionName": "parseHtmlToDom_atomic_000001",
      "publicInterface": "AtomicInterface.parseHtmlToDom",
      "usedBy": ["host-project/src/legacy-entry.ts"]
    }
  ]
}
```

等原子數量超過 100，再同步到 PostgreSQL / pgvector。

---

### 4.7 Atomic Capability

Capability 是受控外部能力。

例如：

- file read/write
- screenshot capture
- Puppeteer browser rendering
- DB query
- LLM call
- shell command
- image generation
- network fetch

AI 不能直接 import 這些工具，只能透過 Capability 呼叫。

錯誤：

```ts
import puppeteer from "puppeteer";
const browser = await puppeteer.launch();
```

正確：

```ts
const screenshot = await ctx.capabilities.captureHtml({
  htmlPath,
  viewport: { width: 1280, height: 720 },
  dpr: 1
});
```

原因：

- 統一資源管理。
- 避免 zombie browser。
- 避免不同 Agent 使用不同 launch config。
- 避免性能污染。
- 降低 AI 上下文負擔。
- 讓底層環境可替換。

---

### 4.8 Atomic Police

Atomic Police 是治理系統。

至少包含：

1. 瘦身警察
2. 關係警察
3. 去重警察
4. 索引警察
5. 性能警察
6. 副作用警察
7. Legacy 接入警察
8. 規格漂移警察
9. 測試完整性警察
10. 已知缺口警察

後面章節會詳細定義。

---

## 5. 原子分層：借鑑 Atomic Design 的五層結構

AI Atomic Framework 可以借鑑 UI Atomic Design 的五層模型，但不要照抄 UI 意義。

建議定義為：

---

### 5.1 Atom：純函數原子

最小功能單位。

特徵：

- 單一責任。
- 優先純函數。
- 無外部副作用。
- 有明確 I/O schema。
- 可獨立測試。
- 可被多個 Molecule 重用。

例子：

- parseHtmlToDom
- normalizeColor
- parseCssLength
- extractTextStyle
- mapBorderRadius
- computeLayoutBox

---

### 5.2 Molecule：小型流程

由 2 到 10 個 Atom 組成。

特徵：

- 完成一個小型領域流程。
- 仍然應該容易測試。
- 可以是 Atomic Map。
- 可以有 integration test。

例子：

- typographyExtractionPipeline
- backgroundExtractionPipeline
- buttonStyleMappingPipeline
- htmlDomToSemanticTreePipeline

---

### 5.3 Organism：領域模組

由多個 Molecule 組成。

特徵：

- 對應完整業務領域。
- 可以接觸 Capability。
- 可以包裝 Legacy。
- 可以有更高層 integration test。

例子：

- LegacyConverter
- RuntimeRendererAdapter
- RegressionComparator
- LegacySystemAdapter

---

### 5.4 Template：抽象骨架

定義流程結構，但不綁定具體資料。

特徵：

- 定義 pipeline shape。
- 定義 dependency injection。
- 定義 capability slots。
- 定義 extension points。
- 不包含環境硬編碼。

例子：

- HtmlToUcufWorkflowTemplate
- FormalCaptureTemplate
- LegacyInjectionTemplate

---

### 5.5 Page：具體執行入口

將 Template 填入真實參數、真實 Legacy 路徑、真實 fixture。

例子：

- gachaDs3FormalWorkflow
- buttonFamilyRegressionWorkflow
- textLayoutStressWorkflow

---

## 6. 框架自舉：用原子方法建立原子框架

你提出的「用原子方法建立原子框架本身」是最重要的策略。

這是自舉。

優點：

- 框架第一天就驗證自己的哲學。
- 每個框架功能本身都是原子，容易測。
- AI 生成框架功能時也受到框架限制。
- 之後框架能用自己的 Police 檢查自己。
- 這是最強的 dogfooding。

---

## 7. Blueprint #000：Genesis Framework Bootstrap

第一個藍圖是創世藍圖。

目標：

> 用最少手工規格與 AI 生成，建立一個能產生原子的最小 Atomic Manager。

因為你不想人工寫 code，所以這裡的「人工」只負責寫需求與審核，不負責手刻正式程式碼。

但現實上，第一個 Manager shell 必須存在。既然你不人工寫 code，建議採用：

1. 你寫或讓 AI 生成第一版 spec。
2. AI 生成 manager shell。
3. 你只做 review 與下指令，不直接寫 code。
4. 所有修正都透過 AI 修改。
5. 從第一天就讓 AI 生成測試與驗證命令。

---

### 7.1 Bootstrap 原子清單

#### Atomic 000001：ParseAtomicSpec

功能：

- 讀取 spec JSON。
- 驗證 spec schema。
- 回傳 normalized spec object。

輸入：

```json
{
  "specPath": "atomic_specs/atomic_000123.json"
}
```

輸出：

```json
{
  "valid": true,
  "spec": {}
}
```

測試：

- valid spec
- missing required fields
- invalid atomicId
- invalid schema
- forbidden side effect config

---

#### Atomic 000002：GenerateAtomicScaffold

功能：

- 根據 spec 產生工作區檔案。
- 建立 index.ts / test.ts / types.ts / README.md。

注意：

這是開發期 scaffold，不代表最終 runtime 物理結構。

輸出：

```json
{
  "workspacePath": "atomic_workbench/atoms/atomic_000123",
  "filesCreated": [
    "index.ts",
    "test.ts",
    "types.ts"
  ]
}
```

---

#### Atomic 000003：BuildAgentPrompt

功能：

- 根據 spec、測試需求、禁止規則產生 AI prompt。
- prompt 必須約束：
  - 只能改指定檔案。
  - 不可 import forbidden dependencies。
  - 不可使用全域變數。
  - 必須通過 test。
  - 必須遵守 performance budget。
  - 必須輸出完整檔案，不可只描述。

---

#### Atomic 000004：ExecuteAgentTask

功能：

- 呼叫 AI coding agent。
- 將 prompt 與工作區交給 AI。
- 接收產出的 code / patch / diff。

注意：

這是 Effect Node。

必須透過 Capability 呼叫 LLM，不可讓業務原子自己 call LLM。

---

#### Atomic 000005：RunAtomicTest

功能：

- 在 sandbox 跑 test。
- 收集 stdout / stderr / coverage / runtime metrics。
- 回傳 pass/fail。

---

#### Atomic 000006：ValidateAtomicOutput

功能：

- 驗證 code 是否符合 spec。
- 檢查 schema。
- 檢查 forbidden import。
- 檢查 side effect。
- 檢查 async policy。
- 檢查 deep clone 風險。
- 檢查 exported function name。

---

#### Atomic 000007：ComputeAtomicHash

功能：

- 計算 specHash。
- 計算 codeHash。
- 計算 testHash。
- 產生 lock record。

---

#### Atomic 000008：UpdateAtomicRegistry

功能：

- 若全部通過，更新 registry。
- 標記 stable。
- 記錄 scriptPath、functionName、version、hash、metrics。

---

#### Atomic 000009：InjectAtomicIntoLegacy

功能：

- 將 stable atomic 函數注入指定 legacy script 或 atomic registry script。
- 產生 static interface export。
- 更新 atomic-location-index。

---

#### Atomic 000010：RunRegressionMatrix

功能：

- 跑所有指定 regression suites。
- 產出 regression-summary.json。
- 阻止品質退轉。

---

### 7.2 Genesis Map

```json
{
  "mapId": "blueprint_000_genesis",
  "name": "Bootstrap Atomic Framework",
  "nodes": [
    { "id": "parseSpec", "atomicId": "000001" },
    { "id": "scaffold", "atomicId": "000002" },
    { "id": "buildPrompt", "atomicId": "000003" },
    { "id": "executeAgent", "atomicId": "000004" },
    { "id": "runTest", "atomicId": "000005" },
    { "id": "validate", "atomicId": "000006" },
    { "id": "hash", "atomicId": "000007" },
    { "id": "registry", "atomicId": "000008" }
  ],
  "edges": [
    { "from": "parseSpec.spec", "to": "scaffold.spec" },
    { "from": "parseSpec.spec", "to": "buildPrompt.spec" },
    { "from": "scaffold.workspacePath", "to": "executeAgent.workspacePath" },
    { "from": "buildPrompt.prompt", "to": "executeAgent.prompt" },
    { "from": "executeAgent.workspacePath", "to": "runTest.workspacePath" },
    { "from": "runTest.result", "to": "validate.testResult" },
    { "from": "validate.validatedFiles", "to": "hash.files" },
    { "from": "hash.lockRecord", "to": "registry.lockRecord" }
  ]
}
```

---

## 8. 里程碑總覽

建議分成 7 個階段。

---

# Phase 0：治理前置與問題凍結

## 目標

先不要讓 AI 繼續亂修老系統。

先凍結目前狀態，建立保護網。

---

## Deliverables

### 0.1 Active Spec Freeze

建立：

```text
docs/ai_atomic_framework/active_spec.md
```

內容：

- 哪份規格是 active。
- 哪些 plan 是 historical。
- 哪些工具 deprecated。
- 哪些路徑不能改。
- 哪些 legacy 腳本只能 adapter，不可直接重寫。
- AI 修改前必讀哪些文件。

---

### 0.2 Legacy Snapshot

建立：

```text
artifacts/legacy_baseline/
```

保存：

- 當前所有關鍵腳本 hash。
- 當前測試結果。
- 當前 fixture 結果。
- 當前 screenshot / summary / metrics。
- 當前 known failures。

---

### 0.3 Regression Matrix 初版

建立最小回歸矩陣：

```text
regression/
  baseline.json
  suites/
    html_to_ucuf_gacha_ds3.json
    html_to_ucuf_button_family.json
    html_to_ucuf_text_layout.json
```

即使一開始分數低，也要先記錄。

重點是可重現。

---

## Acceptance

- AI 知道目前不能直接大改 legacy。
- 每次改動前後能知道是否退轉。
- 有最低限度的 baseline。
- 所有舊 plan 被標記 historical。
- 所有 active rule 有唯一入口。

---

# Phase 1：Atomic Framework MVP

## 目標

建立最小可用 Atomic Manager。

它可以：

1. 讀 spec。
2. 建工作區。
3. 呼叫 AI 產生 code。
4. 跑 test。
5. 驗證 output。
6. 註冊 stable atomic。

---

## 1.1 Atomic Spec Schema

先定義最小 schema。

欄位：

```json
{
  "atomicId": "000001",
  "name": "string",
  "kind": "compute | effect | adapter | manager",
  "description": "string",
  "inputSchema": {},
  "outputSchema": {},
  "sideEffects": {},
  "dependencyPolicy": {},
  "performanceBudget": {},
  "testPolicy": {},
  "legacyIntegration": {},
  "status": "draft | testing | stable | deprecated"
}
```

---

## 1.2 Atomic Manager CLI

最小 CLI：

```bash
atomic-manager create --spec atomic_specs/atomic_000001.json
atomic-manager implement --id 000001
atomic-manager test --id 000001
atomic-manager validate --id 000001
atomic-manager register --id 000001
```

---

## 1.3 工作區結構

開發工作區：

```text
atomic_workbench/
  atoms/
    atomic_000001/
      spec.json
      index.ts
      types.ts
      test.ts
      validation-report.json
```

注意：

這只是 AI 施工空間，不一定是 runtime 結構。

---

## 1.4 產出規則

每個原子 AI 交付時必須包含：

- index.ts
- test.ts
- types.ts
- validation-report.json
- performance-report.json
- dependencies-report.json

缺一不可。

---

## Phase 1 Acceptance

- 能用 AI 產生至少 3 個 compute atom。
- 每個 atom 都能獨立 test pass。
- Manager 能註冊 stable atom。
- Manager 能拒絕不符合 schema 的 atom。
- Manager 能拒絕 forbidden import。
- Manager 能拒絕未授權副作用。
- Manager 能產生 registry.json。

---

# Phase 2：Legacy 注入式整合

## 目標

讓新原子可以被既有老系統呼叫。

不是先重寫老系統，而是先建立內部 API。

---

## 2.1 Atomic Interface

建立：

```ts
// src/legacy/AtomicInterface.ts
export const AtomicInterface = {
  parseHtmlToDom: parseHtmlToDom_atomic_000001,
  extractTypography: extractTypography_atomic_000002
};
```

舊系統只呼叫 interface，不直接呼叫底層原子。

---

## 2.2 Atomic Registry Script

建立或更新：

```ts
// src/legacy/_atomic_registry.ts

export function parseHtmlToDom_atomic_000001(input: Readonly<ParseHtmlInput>): ParseHtmlOutput {
  // atomic implementation
}

export function extractTypography_atomic_000002(input: Readonly<ExtractTypographyInput>): ExtractTypographyOutput {
  // atomic implementation
}
```

---

## 2.3 Atomic Location Index

建立：

```json
{
  "000001": {
    "name": "parseHtmlToDom",
    "functionName": "parseHtmlToDom_atomic_000001",
    "scriptPath": "src/legacy/_atomic_registry.ts",
    "interfacePath": "src/legacy/AtomicInterface.ts",
    "interfaceName": "AtomicInterface.parseHtmlToDom",
    "usedBy": [
      "host-project/src/legacy-entry.ts"
    ]
  }
}
```

---

## 2.4 Legacy Adapter Node

不是所有舊功能一開始都能純化。

所以新增：

```json
{
  "kind": "adapter",
  "sideEffects": {
    "allowed": true,
    "reason": "Wrap existing legacy function for strangler migration."
  }
}
```

Legacy Adapter 負責把髒系統包起來。

之後再逐步從 Adapter 裡抽出純 Atom。

---

## 2.5 Strangler Migration Flow

一個舊功能的遷移流程：

```text
Legacy huge function
  ↓
Legacy Adapter Atomic
  ↓
Extract pure sub-atomic
  ↓
Replace one internal branch with AtomicInterface call
  ↓
Run regression
  ↓
Repeat
  ↓
Legacy function becomes thin wrapper
  ↓
Remove wrapper
```

---

## Phase 2 Acceptance

- 舊系統可以呼叫至少 1 個 atomic function。
- 原子 function 透過 AtomicInterface 暴露。
- location index 可查到 function 被注入哪個 script。
- 改 atomic 時可自動更新 registry 與 interface。
- regression matrix pass 或只出現已知 gap。
- 不需要手動改 code，所有修改由 AI 透過 Manager 完成。

---

# Phase 3：性能安全層

## 目標

避免原子化之後性能變差。

---

## 3.1 顆粒度規則

不要把過小操作做成原子。

不建議：

- add
- subtract
- clamp
- simple getter
- 一行判斷
- 每 frame 極高頻呼叫的小算術

建議原子層級：

- parse one concept
- map one style domain
- validate one contract
- transform one medium-size structure
- compute one business decision
- produce one patch
- wrap one legacy boundary

---

## 3.2 禁止 Deep Copy 大物件

錯誤：

```ts
const cloned = JSON.parse(JSON.stringify(gameState));
```

正確：

```ts
function calcPatch(input: Readonly<GameStateView>): GameStatePatch {
  return {
    type: "UpdateScore",
    delta: 10
  };
}
```

原則：

- input 用 Readonly。
- output 回傳 patch / command / result。
- 不複製整個 legacy state。
- 不傳大型 mutable runtime instance 給 compute atom；例如遊戲引擎 node、scene object 或 web framework instance。

---

## 3.3 Async Policy

Compute Atom：

```json
{
  "allowAsync": false
}
```

Effect Atom：

```json
{
  "allowAsync": true
}
```

規則：

- 純運算禁止 async。
- 讀檔、截圖、DB、LLM call 才能 async。
- Atomic Map 要偵測 async waterfall。
- 可並行的 effect node 要批次執行。

---

## 3.4 靜態綁定，避免字串 Dispatcher

避免：

```ts
AtomicAPI.call("parseHtmlToDom", input);
```

建議：

```ts
AtomicInterface.parseHtmlToDom(input);
```

原因：

- 靜態引用利於 TypeScript 檢查。
- 利於 bundler tree-shaking。
- 避免 JIT megamorphic de-optimization。
- 利於 IDE 與 AI 查找使用點。
- 利於 location index。

---

## 3.5 Performance Budget

每個 atom 必須有 budget：

```json
{
  "maxRuntimeMs": 5,
  "maxAllocatedBytes": 8192,
  "maxInputSizeBytes": 100000,
  "maxOutputSizeBytes": 100000,
  "allowDeepClone": false,
  "allowAsync": false
}
```

Performance Police 要跑：

- 單次 runtime
- 多次 runtime p95
- allocation estimate
- hot path warning
- async warning
- deep clone pattern scan
- large object pass warning

---

## Phase 3 Acceptance

- 原子化後關鍵流程無明顯性能下降。
- 所有 hot-path atom 有 performance budget。
- 無未授權 deep clone。
- 無 compute atom 使用 async。
- 無字串 dispatcher。
- interface 靜態綁定生成成功。

---

# Phase 4：Police 治理系統

## 目標

當原子數量開始增加，防止系統變成「原子垃圾場」。

---

## 4.1 瘦身警察

功能：

- 檢查 dead code。
- 檢查 unused variable。
- 檢查 unreachable branch。
- 檢查過度 defensive code。
- 檢查重複邏輯。
- 檢查 AI 生成的廢話註解。
- 檢查 spec 中沒有要求的功能。

工具：

- TypeScript Compiler API
- ESLint
- ts-prune
- dependency-cruiser
- AI reviewer

規則：

> 傳統 AST 工具先掃，AI 只處理需要語意判斷的部分。

---

## 4.2 關係警察

功能：

- 檢查 DAG 是否有 cycle。
- 檢查 orphan atom。
- 檢查 deprecated atom 是否仍被新 map 使用。
- 檢查 forbidden dependency。
- 檢查 adapter 是否被 compute atom 反向依賴。
- 檢查跨層 import。

規則：

- Atom 不依賴 Organism。
- Compute 不依賴 Effect。
- Low-level 不依賴 high-level。
- Legacy Adapter 只能在邊界層使用。

---

## 4.3 去重警察

功能：

- 檢查是否有相似 spec。
- 檢查是否有相似 I/O。
- 檢查是否有相似描述。
- 檢查是否有相似 code embedding。
- 建議 reuse / merge / deprecate。

初期可以不做 DB，只做文字搜尋。

超過 100 個 atom 後，引入：

- PostgreSQL
- pgvector
- embedding
- semantic search

去重流程：

```text
new atomic intent
  ↓
query registry
  ↓
query vector index
  ↓
if similarity > 0.90
    suggest reuse
  else if 0.75~0.90
    require human/AI architect decision
  else
    allow new atom
```

---

## 4.4 索引警察

功能：

- 登記每個原子。
- 登記每個原子在哪個 script。
- 登記誰呼叫它。
- 登記哪個 map 用它。
- 登記它的版本。
- 登記它是否 deprecated。
- 登記它的 hash。
- 登記它的 performance metrics。

目標：

> AI 要開發新功能前，必須先查 Registry，不准重造輪子。

---

## 4.5 規格漂移警察

功能：

- 檢查 active spec。
- 檢查 historical spec 是否被引用。
- 檢查 task 是否引用 deprecated plan。
- 檢查 code comment 是否出現舊規則。
- 檢查 registry metadata 與實際 code 是否一致。

這是用來防止前面 `plan1 ~ plan5` 那種規則漂移問題。

---

## 4.6 測試完整性警察

功能：

- 每個 atom 是否有 test。
- fixture 數量是否足夠。
- 是否有 negative case。
- 是否有 legacy case。
- 是否有 performance test。
- 是否有 integration test。
- 是否有 regression matrix entry。
- mutation testing 是否能抓到錯誤。

---

## 4.7 Known Gap 警察

用於任何 target runtime、資產管線或 legacy wrapper 的已知能力限制。

區分：

```json
{
  "knownGapType": "runtime-limitation | assetization-required | temporary-tool-gap | accepted-design-drift",
  "scoreImpactPolicy": "ignore | cap | count | requireApproval",
  "mustHaveTaskId": true,
  "expiresAt": "2026-12-31"
}
```

重要：

> known gap 不能變成永久逃避測試的白名單。

---

## Phase 4 Acceptance

- 每次註冊 atom 前 Police 自動跑。
- Police report 產出 JSON。
- 不合格 atom 不可 stable。
- deprecated atom 不可被新 map 引用。
- 相似度過高 atom 會被阻止。
- active spec drift 會被阻止。

---

# Phase 5：通用 Regression Framework 與 Domain Scoring Plugin

## 目標

建立可被不同專案套用的 regression matrix 與 scoring plugin protocol。Core 只定義 fixture、result、delta、known gap 與退轉阻擋格式；實際分數公式由 domain scoring plugin 提供。

例如視覺轉換專案可以定義 pixel / structure / text score；後端 API 可以定義 contract compatibility / latency / error budget；資料管線可以定義 schema drift / row coverage / deterministic output。

---

## 5.1 Fidelity Score Spec

Core 定義 scoring plugin contract；domain adapter 可建立自己的 scoring spec，例如：

```text
docs/domain-scoring-spec.md
```

定義：

```text
finalScore =
  w1 * pixelSimilarity
+ w2 * structureCoverage
+ w3 * componentCoverage
+ w4 * textLayoutAccuracy
+ w5 * assetBoundaryCorrectness
- unresolvedGapPenalty
```

每一項都要明確定義：

- rawPixelScore
- adjustedScore
- pixelSSIM
- structureMatch
- componentCoverage
- textLayoutAccuracy
- assetizationCorrectness
- knownGapHandling
- blockerTaxonomy
- ownerBucketTaxonomy

---

## 5.2 Owner Bucket

所有 residual zone 必須歸類：

```text
converter-layout
converter-style
runtime-renderer
assetization-required
runtime-limitation
known-gap
capture-environment
manual-design-drift
legacy-wrapper-gap
```

---

## 5.3 Multi-Fixture Matrix

至少三個 fixture：

| Fixture | 用途 | 初期門檻 | 最終門檻 |
|---|---|---:|---:|
| minimal-contract | 基礎契約 | 1.00 | 1.00 |
| edge-case-set | 邊界案例 | 0.90 | 0.98 |
| legacy-strangler | 舊系統相容 | 0.80~0.90 | 0.95 或 blocker taxonomy |

重點：

- 先求穩定可重現。
- 再求 owner bucket 正確。
- 最後才求 0.95。

---

## 5.4 Selector Trace

每個 residual 必須能追到：

- source DOM selector
- CSS property
- UCUF node
- style slot
- runtime renderer
- owner bucket
- next fix
- expected score impact

範例：

```json
{
  "zoneId": "gacha.banner.titleGlow",
  "owner": "assetization-required",
  "sourceDomSelectors": [".banner-title", ".banner-title::before"],
  "cssProperties": ["text-shadow", "background"],
  "ucufNodes": ["BannerTitle", "BannerTitleGlow"],
  "styleSlots": ["text", "shadow", "background"],
  "problem": "multi-layer text-shadow cannot be represented by runtime renderer",
  "recommendedAction": "assetize title glow",
  "expectedScoreImpact": 0.03
}
```

---

## Phase 5 Acceptance

- 三個 fixture 都能跑 formal workflow。
- 每個 workflow 產出 summary。
- 每個 residual top 20 都有 selector trace。
- 每個 residual 都有 owner bucket。
- known gap 結構化，不是文字備註。
- 單一 flagship fixture 不再作為唯一成功標準。
- 改一個 fixture 不可讓其他 fixture 無聲退轉。

---

# Phase 6：Reference Case Study：用 Atomic Framework 接管一個 Legacy 系統

## 目標

提供一個完整但可替換的 reference case study，展示如何用 AI Atomic Framework 逐步接管一個高風險 legacy 系統。

本文件可用 html-to-ucuf 作為第一個案例，但案例不能反向污染 core framework。

不是一次重寫整個 legacy script。

而是將它逐步包裝、抽離、替換。

---

## 6.1 第一個 Legacy Adapter

建立：

```json
{
  "atomicId": "010001",
  "name": "legacyDraftBuilderAdapter",
  "kind": "adapter",
  "description": "Wrap existing legacy behavior behind atomic interface.",
  "sideEffects": {
    "allowed": true,
    "reason": "Legacy compatibility boundary."
  }
}
```

作用：

- 對外提供穩定 input/output。
- 內部仍然 call 舊 legacy implementation。
- 先不改其內部行為。
- 建立 baseline test。

---

## 6.2 抽離第一個純 Atom：Typography

目標：

- 不碰整個 legacy script。
- 只抽 `typography` 一小塊。

流程：

```text
legacyDraftBuilderAdapter
  ↓
find typography-related logic
  ↓
create Atomic Spec: extractTypography
  ↓
AI implements atom
  ↓
test against legacy fixtures
  ↓
replace legacy internal call with AtomicInterface.extractTypography
  ↓
run regression matrix
```

---

## 6.3 抽離順序建議

從低風險到高風險：

1. color parsing
2. length parsing
3. typography extraction
4. border / radius mapping
5. background extraction
6. asset boundary classification
7. layout box mapping
8. interactions
9. motion
10. final UCUF tree assembly

不要先動 layout 主幹。

不要先動最複雜的 gacha-specific rule。

---

## 6.4 每次抽離的驗收

每次只能抽一個功能域。

必須：

- 新增 atomic spec。
- 新增 atomic test。
- 新增 legacy fixture。
- 更新 AtomicInterface。
- 更新 location index。
- 跑原子測試。
- 跑 molecule test。
- 跑 regression matrix。
- 比較分數與 summary。
- 不可降低其他 fixture。
- 如降低，必須有 owner bucket 與 rollback plan。

---

## Phase 6 Acceptance

- 目標 legacy script 不再一次被大改。
- 每次只替換一個內部功能區塊。
- 舊系統能繼續運作。
- 原子數逐步增加。
- Legacy Adapter 越來越薄。
- Regression Matrix 防止退轉。
- 最後才考慮拆掉舊腳本。

---

# Phase 7：企業級擴張

## 目標

當框架穩定後，導入 DB、向量索引、跨專案重用。

---

## 7.1 PostgreSQL / pgvector

啟用時機：

- 原子數 > 100。
- 多個專案共用。
- AI 經常重造輪子。
- 查 registry JSON 變慢。
- 需要語意搜尋。

資料表建議：

```sql
atomic_specs
atomic_versions
atomic_dependencies
atomic_usages
atomic_metrics
atomic_embeddings
atomic_maps
legacy_injections
police_reports
regression_runs
```

---

## 7.2 Semantic Reuse Flow

AI 開發新原子前：

```text
intent
  ↓
query text registry
  ↓
query vector registry
  ↓
if exact match: reuse
if near match: propose extend / compose
if no match: create new
```

---

## 7.3 Atomic Merge

當發現兩個原子高度相似：

1. 生成 merge proposal。
2. 建立新 atomic spec v2。
3. 合併 tests。
4. 新原子通過所有舊 tests。
5. 舊原子標 deprecated。
6. 更新 maps。
7. 保留 backwards compatibility。
8. 不能直接刪除。

---

## 7.4 Atomic Split

當原子過大：

觸發條件：

- 行數 > 300
- cyclomatic complexity > 10
- fixture 數過多
- 多個不相關 output
- performance budget 失敗
- AI Police 判斷多職責

流程：

```text
analyze atom
  ↓
propose split plan
  ↓
generate child specs
  ↓
generate child tests
  ↓
preserve original test as integration test
  ↓
implement child atoms
  ↓
update atomic map
  ↓
run all tests
  ↓
deprecate or wrap original atom
```

重要：

> 原 atom 的舊 test 必須保留為 integration test，否則 split 可能破壞行為。

---

# 9. 任務卡模板

每個 AI Agent 任務都必須用以下格式。

```md
# Atomic Task: <name>

## Atomic ID
000123

## Goal
一句話描述此原子要完成什麼。

## Non-Goals
明確列出不能做什麼。

## Input Contract
貼上 input schema。

## Output Contract
貼上 output schema。

## Allowed Files
- atomic_workbench/atoms/atomic_000123/index.ts
- atomic_workbench/atoms/atomic_000123/test.ts

## Forbidden Files
- src/legacy/**
- docs/active_spec.md
- any registry file unless Manager command says so

## Allowed Dependencies
- zod
- local utility types

## Forbidden Dependencies
- fs
- child_process
- puppeteer
- process.env
- global mutable state

## Performance Budget
- maxRuntimeMs:
- maxAllocatedBytes:
- allowAsync:
- allowDeepClone:

## Test Fixtures
- fixture_001
- fixture_002
- fixture_003

## Validation Commands
```bash
npm run atomic:test -- 000123
npm run atomic:validate -- 000123
npm run regression:affected -- 000123
```

## Acceptance Criteria
- All atomic tests pass.
- Output validates against schema.
- No forbidden import.
- No mutation of input.
- Performance budget pass.
- Registry can locate atomic function.
- No regression failure outside known gaps.
```

---

# 10. AI Prompt 模板

```text
You are implementing one atomic function inside AI Atomic Framework.

You must obey the Atomic Spec exactly.

Rules:
1. Modify only the files listed in Allowed Files.
2. Do not modify registry, legacy scripts, or maps directly.
3. Do not import forbidden dependencies.
4. Do not read global variables.
5. Do not mutate input objects.
6. Do not use async unless the spec allows it.
7. Do not deep clone large inputs.
8. Return only data matching Output Schema.
9. Add or update tests only inside this atomic workspace.
10. The task is complete only when all validation commands pass.

Your goal:
<goal>

Atomic Spec:
<spec>

Test fixtures:
<fixtures>

Now implement the atomic function and tests.
```

---

# 11. Atomic Manager 的修改流程

任何修改都必須經過 Manager。

禁止 AI 自己直接改 Legacy。

流程：

```text
request change
  ↓
manager creates/update atomic spec
  ↓
manager creates workbench
  ↓
AI implements atom
  ↓
atomic test
  ↓
police validation
  ↓
performance validation
  ↓
registry update
  ↓
legacy injection if needed
  ↓
regression matrix
  ↓
hash lock
  ↓
commit
```

---

# 12. Legacy 注入流程

```text
stable atom
  ↓
manager reads injection plan
  ↓
generate function name: <feature>_atomic_<id>
  ↓
insert or update function in _atomic_registry.ts
  ↓
export via AtomicInterface
  ↓
replace selected legacy call site
  ↓
update atomic_location_index.json
  ↓
run affected tests
  ↓
run regression matrix
  ↓
lock hash
```

---

# 13. 不退轉機制

## 13.1 Hash Lock

每個 stable atom 記錄：

- spec hash
- code hash
- test hash
- generated interface hash
- injected script hash

如果 AI 誤改 stable atom：

- Manager 偵測 hash mismatch。
- 阻止後續流程。
- 要求建立 v2 或 unlock request。

---

## 13.2 Versioning

不要直接覆蓋高依賴原子。

建議：

```text
atomic_000001@1.0.0 stable
atomic_000001@1.1.0 candidate
atomic_000001@2.0.0 breaking
```

---

## 13.3 Rollback

每次 injection 必須可回滾。

记录：

- before patch
- after patch
- affected files
- affected maps
- affected fixtures
- test result

---

## 13.4 Regression Summary

每次變更輸出：

```json
{
  "changeId": "change_2026_000001",
  "atomicId": "000123",
  "tests": {
    "atomic": "pass",
    "molecule": "pass",
    "regression": "pass"
  },
  "performance": {
    "p95RuntimeMs": 3.2
  },
  "affectedLegacyFiles": [],
  "knownGaps": [],
  "scoreDelta": {
    "buttonFamily": 0.0,
    "textLayout": 0.01,
    "gachaDs3": -0.002
  }
}
```

---

# 14. 檔案結構建議

```text
AI-Atomic-Framework/
  packages/
    core/
      src/
        spec/
        registry/
        hash-lock/
        manager/
        regression/
    cli/
      src/commands/
    plugin-sdk/
      src/adapters/
      src/capabilities/
      src/police/
    adapter-local-git/
    language-js/
  schemas/
    atomic-spec.schema.json
    registry.schema.json
    regression-matrix.schema.json
  templates/
    atom.spec.template.json
    atom.test.template.ts
    adapter.template.ts
  examples/
    hello-world/
    molecule-pipeline/
    legacy-strangler-minimal/
  docs/
    QUICK_START.md
    ARCHITECTURE.md
    SPEC_GUIDE.md
    ADAPTER_GUIDE.md
    PLUGIN_SDK.md
    MIGRATION.md
    LIFECYCLE.md
  LICENSE
  CONTRIBUTING.md
  CHANGELOG.md
```

Host project 應只保留 adapter、workbench、local registry 與實際 runtime integration。這些檔案不是 core framework 的一部分。

---

# 15. Reference Case Study：對 html-to-ucuf 的具體救援策略

本章是 3KLife / html-to-ucuf reference case study。它可用來證明框架能救援一個真實的 AI vibe coding legacy 系統，但不屬於 core framework。

---

## 15.1 先不要做的事

不要立刻：

- 重寫整個 `draft-builder.js`
- 拆成 5 個大模組
- 強追 gacha-ds3 0.95
- 新增大量例外規則
- 直接修 pixel diff
- 讓 AI 根據畫面感覺調參
- 同時開 8 張重構卡一起做

這會重演第六次大改。

---

## 15.2 先做的事

1. 凍結 active spec。
2. 建立 fidelity score spec。
3. 建立 multi-fixture regression。
4. 建立 legacy adapter。
5. 建立 first atomic extraction。
6. 每次只抽一個功能域。
7. 每次都跑 regression。
8. 每次都更新 owner bucket。
9. 所有 gap 結構化。
10. 讓 Atomic Framework 逐步吞噬舊系統。

---

## 15.3 第一批救援原子

建議從低風險開始：

```text
atomic_010001 normalizeCssColor
atomic_010002 parseCssLength
atomic_010003 parseFontWeight
atomic_010004 extractTypographyStyle
atomic_010005 mapBorderRadius
atomic_010006 classifyBackgroundLayer
atomic_010007 detectAssetizationRequired
atomic_010008 buildKnownGapRecord
atomic_010009 computeFidelityScore
atomic_010010 assignResidualOwnerBucket
```

這些比直接拆 `draft-builder.js` 安全很多。

---

## 15.4 第一個成功標準

不要一開始要求 0.95。

第一個成功標準應該是：

```text
AI Atomic Framework 可以成功抽離 draft-builder 中一個低風險功能，
讓 Legacy 透過 AtomicInterface 呼叫它，
並且三個 fixture 的 regression 沒有退轉。
```

這才是救援開始。

---

# 16. 工具選型建議

---

## 16.1 MVP 階段

建議：

- TypeScript
- Zod
- Vitest
- ESLint
- TypeScript Compiler API
- simple JSON registry
- Git
- Node.js CLI

先不要上：

- PostgreSQL
- pgvector
- LangGraph
- 複雜 UI
- 多 Agent 平台
- 分散式調度

原因：

> 你要先證明原子流程能救一個小功能，不要先蓋太大的工廠。

---

## 16.2 中期

當 atomic 數量 > 50：

- dependency-cruiser
- madge
- ts-morph
- esbuild
- AST injector
- coverage tool
- mutation testing
- local semantic search

---

## 16.3 後期

當 atomic 數量 > 100 或跨專案：

- PostgreSQL
- pgvector
- LangGraph
- Mastra
- job queue
- isolated containers
- distributed regression workers

---

# 17. 你不人工寫 code 的運作方式

你說你不會人工介入寫 code。

這可以，但你必須扮演三個角色：

## 17.1 架構裁判

你決定：

- 哪些是 active spec。
- 哪些是 non-goals。
- 哪些是 known gap。
- 哪些性能不可犧牲。
- 哪些 legacy 不能直接動。

---

## 17.2 任務發包者

你負責要求 AI 產出：

- Atomic Spec
- Task Card
- Test Fixtures
- Manager Command
- Regression Report

你不是寫 code，而是寫規則。

---

## 17.3 驗收者

你只看：

- 測試是否 pass。
- regression 是否退轉。
- performance 是否變差。
- diff 是否超出範圍。
- 是否違反 active spec。
- 是否能 rollback。

---

## 17.4 每次 AI 工作的最小循環

```text
你提出需求
  ↓
AI 先產 atomic spec
  ↓
另一個 AI 審查 spec
  ↓
AI 產 test fixture
  ↓
AI 實作 code
  ↓
Manager 跑 validation
  ↓
AI 修到 pass
  ↓
Manager 注入 legacy
  ↓
Regression
  ↓
你看 summary 決定 accept / reject
```

---

# 18. 最大風險與防範

---

## 18.1 過度工程化

風險：

框架還沒救到老系統，就先變成另一個巨大的老系統。

防範：

- 先 MVP。
- 先救一個小功能。
- DB 後置。
- UI 後置。
- 多 Agent 平台後置。
- Police 分批做。
- 每個框架功能也必須原子化。

---

## 18.2 原子太碎造成性能差

防範：

- 設顆粒度規則。
- hot path 不切太碎。
- 靜態 interface。
- patch return。
- no deep copy。
- compute no async。
- performance budget。

---

## 18.3 原子太多造成管理成本高

防範：

- Registry。
- location index。
- semantic search。
- merge policy。
- deprecation policy。
- map 層級化。

---

## 18.4 AI 修改超出範圍

防範：

- allowed files。
- forbidden files。
- hash lock。
- pre-commit validator。
- Manager-only injection。
- no direct legacy edit。

---

## 18.5 Legacy 行為被破壞

防範：

- Legacy Adapter。
- baseline snapshot。
- integration test。
- regression matrix。
- rollback patch。
- incremental strangler。

---

# 19. 最小可行路線圖

如果你今天要開始，建議順序：

---

## Week 1：建立凍結與 baseline

產出：

- active_spec.md
- legacy_snapshot.json
- minimal regression matrix
- atomic spec schema v0
- atomic task template

---

## Week 2：建立 Atomic Manager MVP

產出：

- parse spec
- scaffold
- run test
- validate
- register
- registry.json

---

## Week 3：讓 AI 生成第一個非框架原子

產出：

- normalizeCssColor atom
- parseCssLength atom
- unit tests
- registry entry

---

## Week 4：接入 Legacy 第一個小功能

產出：

- _atomic_registry.js
- atomic-interface.js
- location_index.json
- one legacy call site replaced
- regression summary

---

## Week 5：建立 Police v0

產出：

- forbidden import checker
- dependency checker
- performance budget checker
- test completeness checker

---

## Week 6：開始 reference case study

產出：

- 第一批低風險 compute atom
- domain scoring plugin
- known gap plugin
- owner bucket plugin
- multi-fixture report

---

# 20. 最終成功定義

這套框架成功，不是因為它很漂亮。

成功是：

1. AI 不再需要一次理解 3000 行檔案。
2. AI 每次只做一個可驗證小功能。
3. 每個小功能都有 spec、test、hash、registry。
4. 舊系統能逐步呼叫新原子。
5. 每次替換都能跑 regression。
6. 任一改動都能定位到 atomic id。
7. 出問題能 rollback。
8. 已穩定的原子不會被下一個 AI 誤改。
9. 相似功能不會重複造輪子。
10. 任一 host project 都能從「巨大不穩的 legacy 系統」逐步變成「可治理原子系統」。

---

# 21. 給你的最終建議

不要把 AI Atomic Framework 當成一個一次做完的大平台。

它應該先是一個很小的工具：

```text
讀 spec → 叫 AI 寫一個小函數 → 跑測試 → 註冊 → 注入 legacy → 跑 regression
```

只要這條路跑通，你就有救援老系統的核心能力。

接著再長出：

- Police
- Registry
- Split
- Merge
- DB
- Vector Search
- Legacy Strangler
- Multi Agent Orchestration

最重要的原則是：

> **不要讓 AI 直接救大型 Legacy。  
> 先讓 AI 建立能約束 AI 的 Atomic Framework，  
> 再讓這個框架帶著 AI 一口一口吃掉 Legacy。**

---

## 22. 附錄：第一個 Prompt 建議

你可以先要求 AI 做這件事：

```text
請根據以下規劃，先建立 AI Atomic Framework 的 Phase 0 與 Phase 1 MVP。

限制：
1. 不要接 PostgreSQL。
2. 不要做 UI。
3. 不要做 LangGraph。
4. 不要重構 legacy。
5. 只建立 spec schema、atomic manager CLI、workbench、test runner、registry JSON。
6. 所有功能都必須以 Atomic Spec 定義。
7. 每個 manager 功能也要拆成 atomic。
8. 不允許手寫 code 假設，所有實作都要有 test。
9. 完成後輸出 validation report。

第一個目標：
用這個 framework 產生並驗證一個 normalizeCssColor atomic。
```

---

## 23. 附錄：第一批檔案清單

```text
README.md
docs/QUICK_START.md
docs/ARCHITECTURE.md
docs/SPEC_GUIDE.md
docs/ADAPTER_GUIDE.md
docs/PLUGIN_SDK.md
docs/MIGRATION.md
docs/LIFECYCLE.md

packages/core/src/spec/parse-spec.ts
packages/core/src/registry/registry.ts
packages/core/src/hash-lock/hash-lock.ts
packages/core/src/manager/scaffold.ts
packages/core/src/manager/test-runner.ts
packages/core/src/manager/validate.ts

packages/cli/src/commands/init.ts
packages/cli/src/commands/status.ts
packages/cli/src/commands/scaffold.ts
packages/cli/src/commands/validate.ts

packages/plugin-sdk/src/project-adapter.ts
packages/plugin-sdk/src/language-adapter.ts
packages/plugin-sdk/src/capability.ts
packages/plugin-sdk/src/police.ts

schemas/atomic-spec.schema.json
schemas/registry.schema.json
schemas/regression-matrix.schema.json

templates/atom.spec.template.json
templates/atom.test.template.ts
examples/hello-world/
examples/legacy-strangler-minimal/
```

---

# 結語

AI Atomic Framework 的本質不是 node flow，也不是單純低代碼，也不是普通 Agent framework。

它是：

> **為了讓 AI 在大型工程中不失控，而建立的契約化、原子化、可驗證、可回滾、可注入 Legacy 的工程治理系統。**

它最適合解決你現在遇到的問題：

- 大型工具鏈已經被 AI 改了多輪。
- 規則漂移。
- 檔案過大。
- acceptance 模糊。
- 單畫面 over-fit。
- Legacy 不可能一次重寫。
- 你希望 AI 繼續開發，但不能再放任它自由改全局。

最終策略就是：

```text
Freeze current system
  ↓
Build Atomic Framework MVP with AI
  ↓
Use it to create first stable atoms
  ↓
Inject atoms into legacy through static interface
  ↓
Run regression matrix
  ↓
Gradually strangle legacy modules
  ↓
Reach stable 95% target through measured, traceable, non-regressing changes
```

這才是從 Vibe Coding 混亂，走向 AI 工業化開發的路。
