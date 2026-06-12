# ATM 原子化成本降低計劃
## Adapter-Guided Atomization + Lightweight CID Fingerprinting

**Status:** Draft Proposal（現況校準版）  
**Last Updated:** 2026-06-10  
**目的：** 將原本偏向「AST-Slicing Engine」的計畫，校準為更符合 ATM 現況的路線：以 **adapter-guided atomization** 協助 AI Agent 把 legacy code 拆成 function/module-level atoms，再用 atomId / atomCid / broker / scope / evidence 做多代理衝突預判與治理。

---

## 0. 本版核心修正

### 0.1 重要結論

拆代碼不一定需要笨重 AST。ATM 的核心優勢不是「內建 AST 靜態分析器」，而是：

> 透過任務卡、atomId、atomCid、allowedFiles、scope lock、dry-run patch、review、evidence 與 rollback，把 AI Agent 的工作治理成可識別、可驗證、可並行的 atoms。

因此，本計畫不再把 AST/LSP 寫成必要前提，而是改成：

1. **ATM core 保持語言無關**：CID / broker / lock / evidence 不綁特定語言。
2. **Language adapter 自行決定拆分策略**：可以是 regex、function scanner、compiler API、AST、LSP、Tree-sitter，或 LLM-assisted patch。
3. **先做 function/module-level atomization**：比 AST node-level slicing 更務實，也更符合 ATM 的跨語言定位。
4. **SDK 需要新增 optional atomization planning API**：把「候選原子發現」與「dry-run 拆分計畫」正式化，但不強迫所有 adapter 實作。

### 0.2 現況校準

目前 ATM 已有：

| 能力 | 現況 |
|---|---|
| Core governance | 已有 task / lock / evidence / broker / registry 等治理概念 |
| CID/broker 判斷 | 已能以 atomId / atomCid / shared surfaces / allowedFiles 做衝突預判 |
| LanguageAdapter SDK | 已有 `detectProjectProfile()`、`validateComputeAtom()` |
| JS adapter | 以輕量掃描檢查 imports / entrypoint export |
| Python adapter | 以 regex / line scan 掃 imports、`main()`、`__main__`，並有 dry-run atomize plan |
| ProjectAdapter atomize | 已有 `runAtomizeAdapter()`，產 dry-run patch contract，不直接改 host project |

目前 ATM 尚未有：

| 能力 | 狀態 |
|---|---|
| 正式 `AtomizationPlanningAdapter` SDK | 尚未正式化 |
| 統一的 function/module candidate schema | 尚未正式化 |
| AST read-set / write-set / dependency slice | 尚未實作 |
| AST node-level CID fingerprint | 尚未實作 |
| 同檔案 AST slice intersection admission | 尚未實作 |

因此，論文與工程計畫應避免宣稱「ATM 已有 AST/LSP 工具鏈」或「CID 是 AST 分析的免費副產品」。更穩的說法是：

> CID 是 atom contract / governance scope 的穩定識別；adapter-guided atomization 讓 AI Agent 以低成本把 legacy code 拆成更小 atoms，使 CID broker 的衝突預判更有效。

---

## 1. 問題重定義：AI Agent 拆原子的真正成本

### 1.1 原本錯誤假設

原計畫假設：

> AI Agent 拆原子的主要瓶頸是缺少 AST/LSP，因此必須先做 AST-Slicing Engine。

這個假設過重。實際上，AI Agent 在多數日常重構裡已經擅長：

- 找出一個 function / class / module；
- 生成 patch；
- 搬移 import / export；
- 補 shim；
- 跑測試並依錯誤修正。

這些是 coding agent 的基本能力，成本接近「修改某段檔案前必須先生成 patch」的成本，不需要先建立完整 AST slicing engine。

### 1.2 新問題定義

真正要降低的是：

> AI Agent 每次都要重新用 LLM 猜「這段 legacy code 應該怎麼拆、拆出來會碰到哪些檔案、是否會與其他 agent 撞 scope」。

所以要提供的不是單一 AST 引擎，而是 **adapter-guided atomization planning**：

```text
legacy source
  ↓
language adapter discover candidates
  ↓
function/module-level AtomCandidate[]
  ↓
agent 選候選原子並產生 dry-run patch
  ↓
project adapter 產 dry-run patch contract
  ↓
human / reviewer / gate 審查
  ↓
apply + test evidence + broker scope 更新
```

---

## 2. 新架構：Adapter-Guided Atomization

### 2.1 層級分工

```text
人類層
├─ 撰寫大文件 / plan / task card
└─ review atomization proposal
        ↓
ATM core（語言無關）
├─ atomId / atomCid
├─ broker decision
├─ scope lock / allowedFiles
├─ dry-run / review / rollback / evidence
└─ registry / catalog
        ↓
Language adapter（語言特化，可選能力）
├─ discover function/module/class/route candidates
├─ validate compute atom
├─ scan imports / entrypoints
└─ 可選：AST / LSP / compiler API / regex / Tree-sitter
        ↓
Project adapter（專案特化）
├─ resolve legacy URI
├─ emit dry-run patch contract
└─ enforce host mutation policy
        ↓
AI Agent
├─ 依 candidate 生成 patch
├─ 搬移 function/module
├─ 補 shim / import / export
└─ 跑 test / typecheck / lint evidence
```

### 2.2 CID 的定位

CID 不應被定義成「一定來自 AST node fingerprint」。本計畫改定義為：

> CID 是 atom contract / governance scope 的穩定識別，用於 broker 預判多 Agent 是否爭用同一個治理原子。

當 legacy code 被拆成越小的 function/module-level atoms：

- atomId 越能代表實際代碼單元；
- atomCid 越能代表穩定 contract；
- allowedFiles / sourcePaths 越精準；
- broker 的 `parallel-safe` 判斷越有價值；
- `needs-physical-split` 的比例會下降。

### 2.3 AST 的新定位

AST/LSP 仍有價值，但不再是 Phase 1 前提。

| 策略 | 適用場景 | 是否必需 |
|---|---|---|
| Regex / line scan | Python script、簡單 function、entrypoint | 否，但可先做 |
| Function scanner | TS/Python/Go 常見 function-level 拆分 | 建議先做 |
| Compiler API | TypeScript / Go 等語言有官方 parser 時 | 可選加強 |
| AST / Tree-sitter | 需要更精準 boundary / side effect 時 | 可選加強 |
| LSP | 需要跨檔 reference / type resolution 時 | future work |
| LLM-assisted patch | 生成實際搬移 patch、補 shim | 必要，但可由 evidence 管控 |

---

## 3. SDK 需要新增的 optional API

### 3.1 目標

在 `@ai-atomic-framework/plugin-sdk` 中新增 optional atomization planning contract，讓 language adapter 可以回報「可拆成 atom 的候選單元」，但不破壞既有 adapter。

### 3.2 建議介面

```typescript
export interface AtomCandidate {
  readonly candidateId: string;
  readonly kind: 'function' | 'class' | 'module' | 'route' | 'command' | 'schema' | 'unknown';
  readonly symbol: string;
  readonly filePath: string;
  readonly lineStart: number | null;
  readonly lineEnd: number | null;
  readonly confidence: 'high' | 'medium' | 'low';
  readonly detectionMethod: 'regex' | 'scanner' | 'compiler-api' | 'ast' | 'lsp' | 'llm-assisted';
  readonly suggestedAtomId?: string;
  readonly suggestedSourcePaths?: readonly string[];
  readonly notes?: readonly string[];
}

export interface AtomizationPlanRequest {
  readonly atomId: string;
  readonly target: AtomCandidate;
  readonly sourceFiles: readonly LanguageSourceFile[];
  readonly dryRun: true;
}

export interface AtomizationPlan {
  readonly atomId: string;
  readonly dryRun: true;
  readonly target: AtomCandidate;
  readonly patchFiles: readonly string[];
  readonly steps: readonly AtomizationPlanStep[];
  readonly evidenceRequired: readonly string[];
  readonly rollbackNotes: readonly string[];
  readonly messages: readonly LanguageAdapterMessage[];
}

export interface AtomizationPlanningAdapter {
  discoverAtomCandidates(request: AtomCandidateDiscoveryRequest): Promise<readonly AtomCandidate[]> | readonly AtomCandidate[];
  planAtomize(request: AtomizationPlanRequest): Promise<AtomizationPlan> | AtomizationPlan;
}
```

### 3.3 相容性規則

- 這是 **optional contract**，不是 breaking change。
- 既有 `LanguageAdapter` 只做 `detectProjectProfile()` / `validateComputeAtom()` 仍然合法。
- JS / Python adapter 可以先以 regex / scanner 實作，不必導入 AST dependency。
- Project adapter 繼續負責 `runAtomizeAdapter()` 與 dry-run patch contract。
- ATM core 不應知道每個語言怎麼拆，只消費 adapter 回報的 candidate / plan / evidence。

---

## 4. 工程計劃（6-8 週）

### Phase 0: 現況基準測量（3 天）

**目的：** 量化 AI Agent 現在拆原子的成本，作為論文與產品 ROI 的 baseline。

量測：

- LLM 呼叫次數 / atom；
- token 用量 / atom；
- wall clock / atom；
- retry 次數；
- `needs-physical-split` 發生比例；
- 哪些任務其實只是 function/module-level 搬移。

產出：

- `baseline-agent-cost-report.md`
- `atomization-candidate-sample.json`

---

### Phase 1: Optional Atomization Planning SDK（1-2 週）

**目的：** 正式化 adapter-guided atomization 的 SDK contract。

Deliverables：

- `AtomCandidate` schema；
- `AtomizationPlanningAdapter` optional interface；
- `AtomizationPlan` / `AtomizationPlanStep`；
- validator / fixture；
- 文件：說明 regex、scanner、AST、LSP 都只是 detection method，不是 core requirement。

驗收：

- 不破壞既有 JS / Python adapter；
- typecheck / SDK validation pass；
- 至少一個 fixture 示範 function-level candidate。

---

### Phase 2: Function/Module-Level Candidate Discovery（1-2 週）

**目的：** 先用輕量策略讓 adapter 找出可拆原子，不等 AST/LSP。

#### JS / TS adapter 初版

- 掃 `export function`、`export default function`、`class`、簡單 `const foo = (...) =>`；
- 回報 symbol、line range、confidence；
- 若遇到複雜語法，標記 `confidence: low`，交給 Agent / reviewer。

#### Python adapter 初版

- 掃 top-level `def`、`class`、`if __name__ == "__main__"`；
- 回報 function/class candidate；
- 沿用目前 regex / line scan 方向，不導入 AST dependency。

驗收：

- 可在 3KLife 與 ATM repo 各抽樣 20 個檔案；
- 產出 candidate list；
- 人工 review candidate precision；
- 不要求 read/write set。

---

### Phase 3: Dry-Run Patch Plan + Agent Workflow（1-2 週）

**目的：** 把 candidate 轉成可 review 的 atomization proposal。

流程：

```text
adapter.discoverAtomCandidates()
  ↓
agent 選 candidate
  ↓
adapter.planAtomize(candidate)
  ↓
projectAdapter.runAtomizeAdapter(..., dryRun: true)
  ↓
dry-run patch contract + rollback notes + evidenceRequired
  ↓
human review / gate
```

重點：

- Agent 仍負責生成實際 patch；
- ATM 要求 patch 先 dry-run；
- 不允許 adapter 直接改 host project；
- 必須產 rollback notes；
- 必須跑 test / typecheck / lint 或 project-specific validators。

---

### Phase 4: CID / Broker Integration（1 週）

**目的：** 讓新拆出的 atom 更好地餵給現有 CID broker。

改造方向：

- candidate / plan 產出 `suggestedAtomId`、`suggestedSourcePaths`；
- atom spec 記錄 `sourcePaths` / `allowedFiles` / `evidenceRequired`；
- semantic fingerprint 先維持 spec-level hash，不宣稱 AST fingerprint；
- broker 仍以 atomId / atomCid / allowedFiles / shared surfaces 做判斷；
- 目標是降低「一個 file 等於一個 atom」造成的粗粒度誤判。

驗收指標：

- 拆分後 `needs-physical-split` 比例下降；
- `parallel-safe` 比例上升；
- 沒有增加 failed validation；
- rollback path 清楚。

---

### Phase 5: Paper / Plan Update（1 週）

**目的：** 將論文主軸從 AST-Slicing 改成 Atomization-first / Adapter-guided CID。

建議論文定位：

> **Adapter-Guided Atomization as Concurrency Control for Multi-Agent Code Synthesis**

或：

> **Atomization-First CID Broker for Multi-Agent Code Generation**

避免寫法：

- 不要說 ATM 已有 AST/LSP static analysis toolkit；
- 不要說 CID fingerprint 是 AST 分析的免費副產品；
- 不要承諾同檔案 AST node-level admission，除非已完成 prototype。

可主張：

- ATM 透過 adapter-guided atomization 把 legacy code 降到 function/module-level atoms；
- atomId / atomCid / allowedFiles 讓 broker 能在原子級預判衝突；
- 這比 file-level OCC 更細，比 AST slicing 更跨語言且更容易落地；
- AST/LSP 是 optional accelerator，不是核心要求。

---

## 5. 成本模型

### 5.1 舊模型：AST-first

```text
AI Agent + AST/LSP → 產 RdSet/WrSet/TypeConstraints → CID fingerprint
```

問題：

- 工程量大；
- 語言不一致；
- 容易讓 ATM 從治理框架漂移成 static-analysis framework；
- 目前 repo 實作不支撐這個 over-claim。

### 5.2 新模型：Atomization-first

```text
AI Agent + adapter candidates → function/module atomization patch → atom spec / CID / broker
```

優勢：

- 用 Agent 已經擅長的 patch 生成能力；
- 各語言 adapter 可先用最便宜策略；
- 不需一次做到 read/write set；
- 可用 review / test / rollback 控風險；
- 保持 ATM core 語言無關。

### 5.3 評估表

| Approach | 前置工程 | 跨語言性 | 粒度 | 風險 | 適合 ATM 現況 |
|---|---:|---:|---|---|---|
| File-level OCC | 低 | 高 | 檔案 | 誤擋多 | 已有 baseline |
| AST node slicing | 高 | 中低 | AST node | 實作重 | 不適合先押主軸 |
| Adapter-guided function/module atomization | 中 | 高 | function/module | 可 review | **最適合** |
| Pure LLM contract extraction | 低 | 高 | 不穩定 | token 高 | 可作 baseline |

---

## 6. 風險評估與緩解

| 風險 | 機率 | 影響 | 緩解 |
|---|---:|---:|---|
| regex / scanner 找錯 boundary | 中 | 中 | confidence 分級 + human review + tests |
| function 有 closure / side effect | 高 | 中 | plan 標記 warning，要求 shim / tests |
| class method 拆分破壞 `this` | 中 | 高 | 初版限制拆 top-level function / module |
| import/export 循環 | 中 | 中 | typecheck / lint / import graph evidence |
| Agent patch 品質不穩 | 中 | 中 | dry-run only + review before apply |
| SDK interface 太早固定 | 中 | 高 | optional contract + fixture-driven evolution |
| 論文 over-claim AST 能力 | 高 | 高 | 改寫成 adapter-guided atomization |

---

## 7. 對 Vision Paper 的影響

### 7.1 新論述

建議 Abstract 改成：

> ATM provides an atomization-first concurrency layer for multi-agent code generation. Rather than relying on heavyweight language-universal AST slicing, ATM delegates code-unit discovery to language adapters and governs the resulting function/module-level atoms through stable atom IDs, CIDs, scope locks, dry-run patch contracts, validation evidence, and broker decisions. This makes conflict prediction practical across languages while preserving deterministic review and rollback boundaries.

### 7.2 反擊「contract 成本太高」

標準回應：

- ATM 不要求人類手寫每個 contract；
- AI Agent 本來就要產 patch，function/module-level atomization 是它的低成本能力；
- adapter 只提供候選邊界與 dry-run plan，不必完整理解所有語義；
- review / tests / rollback 補足自動化不確定性；
- CID 的價值來自 atom 粒度變小，而不是一定來自 AST node hash。

### 7.3 新 baseline

| Baseline | 說明 |
|---|---|
| File-level OCC | 同檔案一律 serial / needs split |
| Pure LLM atomization | 全靠 LLM 讀檔推理並產 spec |
| Adapter-guided atomization | adapter 找 candidate，Agent 產 patch，ATM 治理 |
| AST-slicing prototype | future work / optional accelerator |

---

## 8. 對 ATM 框架本體的改造

### 8.1 新增 SDK optional contracts

建議新增位置：

```text
packages/plugin-sdk/src/atomization-planning.ts
packages/plugin-sdk/src/index.ts
```

內容：

- `AtomCandidate`
- `AtomCandidateDiscoveryRequest`
- `AtomizationPlanRequest`
- `AtomizationPlan`
- `AtomizationPlanningAdapter`

### 8.2 擴充 language adapters

```text
packages/language-js/
└─ 可選實作 discoverAtomCandidates()

packages/language-python/
└─ 可選實作 discoverAtomCandidates() / planAtomize()
```

初版不引入新 dependency；先用 scanner / regex。

### 8.3 CLI 候選命令

建議新增：

```bash
node atm.mjs atomize candidates --file <path> --json
node atm.mjs atomize plan --candidate <id> --dry-run --json
```

注意：

- `plan` 必須 dry-run；
- apply 必須經 human review / governed mutation policy；
- 不建立第二套 task lifecycle。

---

## 9. 對 3KLife 的影響

### 9.1 短期

- 用 3KLife 的 TypeScript 檔案測試 function/module candidate discovery；
- 不直接改 runtime code；
- 先產報告與 dry-run patch plan；
- 用現有測試 / gate 驗證候選拆分是否可靠。

### 9.2 中期

- 將常見大型檔案逐步拆成 module-level atoms；
- 讓 task card 的 allowedFiles / sourcePaths 更精準；
- 降低同檔案衝突造成的 `needs-physical-split`。

### 9.3 長期

- 新增功能時預設以 function/module-level atom 設計；
- legacy 大檔案透過 adapter-guided plan 逐步收斂；
- AST/LSP 僅在高價值熱點檔案導入。

---

## 10. 時間表與優先級

```text
Week 1:    Phase 0 baseline
Week 2:    Phase 1 optional SDK contract
Week 3-4:  Phase 2 JS/Python function/module candidates
Week 5:    Phase 3 dry-run patch planning workflow
Week 6:    Phase 4 CID/broker integration metrics
Week 7:    Phase 5 paper / plan rewrite
Week 8+:   Optional AST/LSP accelerator prototype
```

最短可投路線：

1. 不宣稱 AST node-level admission；
2. 證明 adapter-guided atomization 可降低 LLM 推理成本；
3. 證明 atom 粒度變小後 broker 的衝突預判更有效；
4. 把 AST/LSP 放在 future work 或 optional accelerator。

---

## 11. 關鍵決策點

### Q1: 是否仍以 AST 作為主軸？

建議：否。AST 應降級為 optional accelerator。

### Q2: 是否動 ATM core？

建議：少動 core，優先擴充 plugin-sdk optional contract 與 language adapters。

### Q3: 原子化粒度先做到哪裡？

建議：function/module-level。不要一開始追求 AST node-level。

### Q4: CID 是否需要改成 AST fingerprint？

建議：短期不需要。先讓 CID 維持 atom contract / spec-level fingerprint，並把 sourcePaths / allowedFiles 做精準。

### Q5: 論文主張應如何改？

建議：從 AST-Slicing CID 改成 Atomization-first / Adapter-guided CID broker。

---

## 12. 結論

> **ATM 的優勢不是先做一個跨語言 AST 引擎，而是讓 AI Agent 的工作被治理成越來越小、越來越可驗證的 atoms。**

本計畫的正確方向是：

1. 先正式化 optional atomization planning API；
2. 讓每個 language adapter 用自己的低成本策略發現 function/module candidates；
3. 讓 Agent 產 dry-run patch，ATM 負責 review / evidence / rollback / broker；
4. 透過更小 atom 提升 CID 衝突預判價值；
5. AST/LSP 作為後續強化，不作為 ATM 的核心前提。

這條路更符合 ATM 目前實作，也更能維持跨語言性。

---

## 附錄 A: 目前 repo 事實對照

| 事實 | 來源 |
|---|---|
| `LanguageAdapter` 目前只有 profile detection 與 compute atom validation | `packages/plugin-sdk/src/language-adapter.ts` |
| JS adapter 目前是 imports / entrypoint export 輕量掃描 | `packages/language-js/src/language-js-adapter.ts` |
| Python adapter 目前是 regex / line scan，且已有 `planPythonAtomize()` dry-run plan | `packages/language-python/src/language-python-adapter.ts` |
| Project adapter atomize 目前產 dry-run patch contract，不直接 mutation | `packages/plugin-sdk/src/project-adapter.ts`、`packages/adapter-local-git/src/local-git-adapter.ts` |
| 目前沒有正式 SDK-level atomization planning interface | 待新增 |
| 目前沒有 AST read/write set 或 AST node CID | 待新增，且不應作為短期主軸 |

---

## 附錄 B: 待更新 checklist

- [ ] 在 `plugin-sdk` 新增 optional `AtomizationPlanningAdapter` proposal。
- [ ] 在 JS adapter 實作 function/module candidate discovery prototype。
- [ ] 在 Python adapter 擴充 top-level function/class candidates。
- [ ] 新增 CLI dry-run：`atm atomize candidates` / `atm atomize plan`。
- [ ] 建立 3KLife baseline：大型檔案、候選原子、needs-physical-split 比例。
- [ ] 將 vision paper 從 AST-Slicing CID 改為 Adapter-Guided Atomization / Atomization-first CID。
- [ ] 將 AST/LSP 改列 optional accelerator / future work。

---

**版本歷史：**
- 2026-06-10: 初稿（AST-Slicing / deterministic toolkit 方向）。
- 2026-06-10: 現況校準版；改為 Adapter-Guided Atomization + optional SDK atomization planning API。