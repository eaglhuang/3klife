# AI Atomic Framework Roadmap — 願景・設計原則（§2–§3）

> 這是 `AI_Atomic_Framework_Roadmap.md` 的「願景・設計原則（§2–§3）」分片。完整索引見 `../AI_Atomic_Framework_Roadmap.md`。

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
