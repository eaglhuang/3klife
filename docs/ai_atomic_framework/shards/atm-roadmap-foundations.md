# AI Atomic Framework Roadmap — 名詞定義・分層・自舉・Genesis（§4–§7）

> 這是 `AI_Atomic_Framework_Roadmap.md` 的「名詞定義・分層・自舉・Genesis（§4–§7）」分片。完整索引見 `../AI_Atomic_Framework_Roadmap.md`。

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
