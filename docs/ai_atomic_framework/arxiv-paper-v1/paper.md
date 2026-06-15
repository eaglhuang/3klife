# 採用器導向原子化：多代理 LLM 程式碼合成的並發治理框架
## Adapter-Guided Atomization: A Concurrency Governance Framework for Multi-Agent LLM Code Synthesis

**作者：** Eaglhuang
**Affiliation:** Independent Research
**Date:** 2026-06-XX
**Status:** Draft (Chinese skeleton, awaiting EN translation)
**Repo:** https://github.com/eaglhuang/AI-Atomic-Framework

---

## Abstract（摘要）

多代理大型語言模型（multi-agent LLM）程式碼合成系統面臨一個固有矛盾：要在去中心化的並行代理中維持代碼的語義完整性。現有方法形成了一個按粒度劃分的協調機制階層 —— 字元級（CodeCRDT）保證物理收斂卻允許 5–10% 的語義衝突；檔案級（STORM）以寫入時樂觀並發控制（OCC）阻擋陳舊寫入卻在同一檔案內不同函式間造成不必要的拒絕；工作流級（Semantic Consensus Framework, SCF）以意圖圖達到 100% 完成率卻只有 27.9% 精度。

我們提出 **Adapter-Guided Atomization with CID Broker**，一個介於檔案級與字元級之間的並發治理框架。本框架不依賴重量級的全語言通用 AST 引擎，而是將代碼單元的發現責任委派給各語言的 adapter；ATM 核心則以原子 ID（atomId）、契約指紋（atomCid）、共享表面（shared surfaces）、檔案範圍等多維度，做出確定性的並發准入決策。我們的 broker 已實作四種裁決：`parallel-safe`、`needs-physical-split`（CID disjoint 路由到 deterministic composer）、`blocked-cid-conflict`、`blocked-shared-surface`。

本論文的三個核心貢獻：
1. **跨語言中立的原子化抽象**：透過 optional `AtomizationPlanningAdapter` SDK，讓每個語言以最便宜的偵測策略（regex、scanner、compiler API、AST、LSP）回報函式 / 類別 / 模組級原子候選，無需強制 AST。
2. **確定性多維度衝突准入**：以 atomId 與 atomCid 為核心，配合 generators / projections / registries / validators / artifacts 五類共享表面，達成 O(n log n) 衝突檢測，相對於 SCF 的 O(n²) 意圖圖具備明顯擴展性。
3. **檔案重疊但 CID disjoint 的並行寫入路由**：當兩個代理修改同一檔案的不同函式時，broker 將其路由到 deterministic composer 進行合成，避免 STORM 風格的盲目拒絕。

我們以 ATM 框架的開源實作為基礎（broker ~2000 LOC，已在 GitHub 釋出，SDK 完成 TASK-ASP-0001~0005 + AGR 完成 TASK-CID-0028~0037），並通過 **12 個正式 benchmark scenarios**（涵蓋 Cross-Regime Disjointness、Augmented Decision Rule、AGR Layer 1/2、Admission Soundness A1′/A2 等所有形式定理主張）以及 npc-brain（3 週、37 個原子化任務卡、零准入錯誤）的初步實證。完整對標評估（ATM vs STORM vs CodeCRDT）預計 12 月更新版。

**Keywords:** Multi-Agent LLM, Code Synthesis, Concurrency Control, Atomization, Optimistic Concurrency, Software Engineering, AI Agent Coordination

---

## 1. Introduction（引言）

### 1.1 Motivation

LLM 驅動的多代理系統正成為大規模程式碼合成的核心架構。從早期的 ChatDev、MetaGPT 等序列管線，到 2025-2026 年的 CodeCRDT、AgentSpawn、STORM、Semantic Consensus 等並行協作機制，社群正快速探索「如何讓多個 LLM 代理同時編輯共享程式碼庫而不互相破壞」。

然而，多代理並行代碼合成存在一個無法迴避的核心矛盾：**並發越多，語義衝突風險越大；但若以保守策略阻擋衝突，又會喪失並行帶來的吞吐量優勢**。

現有方法形成了一個按粒度劃分的協調機制階層：

| Tier | 粒度 | 代表系統 | 主要弱點 |
|---|---|---|---|
| 1 | 字元級 | CodeCRDT | 5–10% 語義衝突（複雜任務達 80%） |
| 2 | (空缺) | — | **本論文目標** |
| 3 | 檔案級 | STORM | 同檔案不同函式無法並行 |
| 4 | 工作流級 | SCF | 27.9% 精度、O(n²) 複雜度 |

**Tier 2 的空缺**，即「比檔案細，比字元語義豐富」的粒度，是 multi-agent 代碼合成最需要的協調層級。

### 1.2 The False Choice We Reject

現有方法在「協調粒度」與「實作成本」之間做出虛假取捨：
- **全字元級 CRDT（CodeCRDT）**：實作便宜，但放棄所有語義保證
- **全工作流級意圖圖（SCF）**：語義豐富，但 O(n²) 並要求預定義企業流程模型
- **全 AST 級分析**：理論上「中間粒度」的最佳解，但要求每個語言都有重量級的編譯器或語言伺服器整合 —— 在跨語言、多 framework 的現實中不切實際

**我們的關鍵觀察**：AI Agent 本身已經擅長生成 function-level patch。我們不需要建立「萬能 AST」來告訴 agent 怎麼拆代碼；只需要提供：
1. 一個輕量的 adapter 機制讓每個語言以**自己最便宜的偵測策略**回報候選原子
2. 一個確定性的 broker 以 atomId / atomCid / shared surfaces 做並發准入決策
3. 一個 governance 流程（dry-run → review → evidence → apply → rollback）作為保險機制

這個組合**將協調粒度的選擇責任下放給各語言 adapter**，同時保留了 ATM 核心的並發治理能力。

### 1.3 Contributions

本論文的主要貢獻為：

1. **Adapter-Guided Atomization 模型**：形式化 `AtomizationPlanningAdapter` 作為 optional SDK contract，讓不同語言以 regex、scanner、compiler API、AST 或 LSP 任意組合實作。
2. **多維度確定性 broker 演算法**：以 atomId、atomCid、shared surfaces（generators/projections/registries/validators/artifacts）、physical file overlap 四個維度做衝突檢測，O(n log n) 複雜度。
3. **CID Disjoint 路由機制**：當兩個代理修改同一檔案的不同函式（CID disjoint）時，broker 路由到 deterministic composer 進行合成，這是 STORM 風格 OCC 所欠缺的關鍵能力。
4. **開源實作**：完整實作於 `AI-Atomic-Framework`（broker 1932 LOC，scope-lock 145 LOC，hash-lock 104 LOC，已於 Apache 2.0 釋出）。
5. **AI-Native 設計原則**：本框架不假設人類撰寫每個原子的契約；而是為 AI Agent 提供一套**確定性工具鏈**，降低代理為了猜測代碼結構所付出的 LLM 推理成本。
6. **超越程式碼的通用化（design）**：我們概述 broker 的衝突偵測核心如何從程式碼原子推廣至任意結構化產物（JSON 記錄、文字範圍、數值欄位、YAML/TOML），透過 `FileMutationAdapter` 介面與 `ConflictKey` 分類（§3.10），並陳述 Theorem 3（ConflictKey Disjointness）作為 Theorem 1 的推廣。此項仍處於設計階段（TASK-CID-0091~0098，尚未實作），作為 roadmap 貢獻而非已驗證結果列出。

### 1.4 Paper Organization

本論文後續組織如下：
§2 回顧相關工作的粒度階層；§3 形式化 adapter-guided atomization 與 CID broker；§4 描述評估方法與基準；§5 報告初步結果；§6 討論限制與未來工作；§7 結論。

---

## 2. Related Work（相關工作）

我們將相關工作依協調粒度組織，並指出每個 tier 的核心優勢與限制，最後說明本框架如何在 tier 2 形成新貢獻。

### 2.1 字元級協調（Tier 1）

**CodeCRDT** [Pugachev, 2025] 引入了「透過狀態觀察進行協調」的無鎖典範，以無衝突複製數據類型（CRDTs）讓並行代理觀察彼此的編輯。在 600 次 Claude Sonnet 4.5 測試中，CodeCRDT 達到 100% 字元級收斂與 0% 物理合併失敗。然而，由於 CRDT 在數學上完全不理解程式碼語義，CodeCRDT 接受 5–10% 的語義衝突率（在高耦合任務中達 80%）—— 重複宣告、型別不匹配、引用斷裂等錯誤只能在後驗（post-hoc）的 TypeScript 診斷階段才能被發現。

**EvoGit** [Jiang et al., 2026] 與 **AgentGit** [Sun et al., 2026] 採用 Git 版本圖作為協調基底，把 commit-revert-branch 作為原始操作。這些系統雖然規避了字元級 CRDT 的語義盲區，但物理層的並行依然以整個檔案或 commit 為單位。

### 2.2 檔案級協調（Tier 3）

**STORM** [Geng & Neubig, 2026] 提出狀態導向管理（STate-ORiented Management），以寫入時樂觀並發控制（write-time OCC）阻擋陳舊寫入。當代理 $a_i$ 嘗試對檔案 $f_t$ 寫入時，STORM 驗證其在推理期間觀察到的所有依賴檔案 $f \in F_{observed}$ 滿足 $v_f^{obs} \geq v_f^{cur}$。若不滿足，STORM 拒絕寫入並回傳最新檔案 + diff 列表，迫使代理重新規劃。

STORM 的核心問題在於**檔案是其最小協調單位**。若兩個代理修改同一檔案中的兩個獨立函式（例如 `helper_math()` 與 `helper_string()`），雖然兩者的 read-set / write-set 完全不相交，STORM 仍會因為檔案版本變動而拒絕其中一方的寫入。這在多函式大型檔案場景中造成嚴重的吞吐量損失。

### 2.3 工作流級協調（Tier 4）

**Semantic Consensus Framework (SCF)** [Acharya, 2026] 是進程感知中間件，以語意意圖圖（Semantic Intent Graph, SIG）做事前衝突檢測。SCF 在 AutoGen、CrewAI、LangGraph 三種架構的 600 次運行中達到 100% 工作流完成率（對比基準 25.1%），但精度只有 27.9% —— 即每 100 個被阻擋的並行對中，72 個其實是安全的（False Positive）。對於程式碼層級的細粒度並行，72% 的誤擋率是不可接受的。

**MPAC** [Qian et al., 2026] 提出五層應用級多主體協調協定（Session、Intent、Operation、Conflict、Governance），以聲明式意圖預防衝突，並在三代理跨模組程式碼審查基準中將協調開銷降低 95%，壁鐘時間加速 4.8 倍。然而 MPAC 的衝突仲裁仍仰賴樂觀鎖（OCC）而非結構化代碼分析。

**ATCC** [Zhou et al., 2026] 在資料庫層實作自適應並發控制，以強化學習（RL）動態切換樂觀與悲觀執行模式。**OptiMA** [Çalıkyılmaz et al., 2026] 將原子代理操作封裝為兩階段鎖（2PL）事務。這兩者皆在資料庫層而非代碼合成層運作，但其「樂觀/悲觀動態切換」思路與本框架的 lane routing 有共通之處。

### 2.4 工作空間協定（Workspace Protocols）

**AWCP** [Anonymous, 2026] 是去中心化工作空間委派協定，以「files-as-interface」為核心，建立 Delegator-Executor 模型。AWCP 明確將「語義衝突偵測」列為未來工作，本身只提供傳輸層生命週期管理。**SEMAP** [Liu et al., 2026] 在 A2A 通信標準上添加生命週期導向的行為契約，將協調失敗降低 69.6%。這些協定屬於傳輸層而非語義層，與本框架是互補關係。

### 2.5 失敗分類與協調架構規格

**MAST** [Pan et al., ICLR 2025 Workshop] 分析 18 種多代理 LLM 失敗模式並歸納為三類（系統設計、跨代理對齊、驗證薄弱）。**Coordination as Architectural Layer** [Anonymous, 2026] 形式化協調層為七個架構元素（endpoints、topology、authority、synchronization、aggregation、termination、failure handling）。這些工作提供了診斷視角，但未提出具體的並發准入機制。本框架可視為「在程式碼粒度上實現 MAST/Coordination-Spec 主張的具體 admission control」。

### 2.6 規格優先與類型感知方法

**The Specification Gap** [Sartori, 2026] 主張「更豐富的規格是主要協調機制」，本框架的 adapter-guided atomization 可視為一種**自動生成輕量規格**的路徑：adapter 不需要人類撰寫完整規格，而是由 candidate discovery + dry-run plan 自動產生。

**T-RDT**（Type-Aware Replicated Data Types）作為 CodeCRDT 的潛在改進方向，將編譯器語義嵌入 CRDT 合併運算元，理論上可消除 5–10% 語義衝突率。然而 T-RDT 需要為每個語言重新形式化合併代數，工程成本巨大。本框架不與 T-RDT 競爭：T-RDT 改進物理層，本框架增加上層語義准入。

### 2.7 本框架的定位

下表總結各層級協調機制：

| Tier | 粒度 | 偵測方式 | 複雜度 | 治理 |
|---|---|---|---|---|
| 1 | 字元 | CRDT 代數 | 無鎖 | 無 |
| **2** | **函式/模組** | **Adapter-guided** | **O(n log n)** | **Dry-run + Review + Evidence + Rollback** |
| 3 | 檔案 | mtime / version | O(n) | 隱式 |
| 4 | 工作流 | Intent Graph + LLM | O(n²) | LLM 仲裁 |

Tier 2 的空缺正是本論文要填的位置。我們的核心主張是：**不需要建立通用 AST 引擎，也能在 tier 2 達成有效的並發治理**。Adapter 採用自己最便宜的偵測方式回報候選；broker 以多維度確定性檢查做准入決策；governance 流程以 dry-run / evidence 補足靜態分析的不確定性。

### 2.8 Concurrency Control Beyond Code: OT, CRDTs, and Databases

The `ConflictKey`-based generalization proposed in §3.10 draws on a much older lineage of concurrency control for shared structured data. **Operational Transformation (OT)** [Ellis & Gibbs, 1989] and **CRDTs** [Shapiro et al., 2011] address convergence for collaborative editing of documents and structured data more broadly than source code; database **two-phase locking** and **optimistic concurrency control** [Kung & Robinson, 1981] address conflict detection for record-level updates via read/write-set disjointness — structurally analogous to our $\mathsf{record}$-scope `ConflictKey`. ATM's Definition 5 (§3.10) can be read as restating this OCC tradition's read/write-set disjointness check in a format-agnostic vocabulary that spans code atoms, JSON records, and scalar fields under one broker; we do not claim novelty over OCC itself, only over its uniform application across heterogeneous artifact types within a single multi-agent admission point.

---

## 3. The Framework: Adapter-Guided Atomization + CID Broker（架構與形式化）

### 3.0 Implementation Status Legend

本章節的所有 Definition / Theorem / Algorithm 均對應 ATM 開源實作中可驗證的程式碼路徑。為清楚標示每個機制的成熟度，使用下列三檔：

| 標記 | 意義 |
|---|---|
| ✅ **Implemented** | 已合入 main 分支、有單元測試、包含於 §4 的 12-scenario benchmark harness |
| 🔶 **Prototype** | 已實作但仍限於部分情境（例如僅 JS / Python 兩種 adapter；其他語言尚未提供） |
| 🔷 **Open Problem** | §3.9 列出的兩個尚未解決的議題（cross-language atom identity、CID schema migration） |
| 🔹 **Proposed (Design)** | 為完整性陳述的 roadmap 項目（如 §3.10），尚無實作或 benchmark 覆蓋 |

**As of 2026-06-12**：§3 中所有 ✅ 標記均對應 AAF commit `f841a27c` (CID-0033 SDK + canon_sym)、`aa907d04` (CID-0035 AGR Layer 2 + steward)、`16533023` (CID-0032 Augmented Decision Rule)、`9d214ad9` (CID-0034 registry integration)、`e62eee72` (CID-0037 benchmark harness)。

---

### 3.1 Architecture Overview ✅

ATM 採三層模型：

```
Language Adapter (candidate discovery)
        ↓  AtomCandidate[]
AI Agent (patch generation)
        ↓  WriteIntent (atomRefs, targetFiles, sharedSurfaces)
ATM Broker (admission decision)
        ↓  verdict ∈ {parallel-safe, needs-physical-split,
                       blocked-cid-conflict, blocked-shared-surface}
Substrate (Git / filesystem / CRDT)
```

每一層的責任邊界明確分離：adapter 只負責「發現候選原子」，不做衝突判斷；broker 只消費 adapter/agent 產出的 metadata（atomId、CID、sourcePaths、sharedSurfaces），不解析程式碼語義；最終的語義正確性留給 validator 階段（§3.8）。

---

### 3.2 Atoms and Atom Maps ✅

我們將 ATM 既有 registry 實作（`packages/core/src/registry/atom-runtime.ts`、`registry.ts`、`status-machine.ts`）整理為以下形式定義。

**Definition 1 (Atom).**
An atom $a$ in ATM is an 8-tuple

$$a = \langle \mathit{id},\ \mathit{name},\ \mathit{ver},\ P,\ \sigma,\ \psi,\ \tau,\ H \rangle$$

where

- $\mathit{id} \in \mathrm{AtomId}$, with $\mathrm{AtomId}$ matching `^ATM-[A-Z][A-Z0-9]*-\d{4}$`
- $\mathit{name} \in \mathrm{LogicalName}$, matching `^atom\.[a-z0-9]+(?:[.-][a-z0-9]+)*$`
- $\mathit{ver} \in \mathrm{SemVer}$ (`atomVersion` / `currentVersion`)
- $P \subseteq \mathrm{FilePath}$ — the atom's `sourcePaths` (code + spec + test locations)
- $\sigma = (\Sigma_{\mathrm{in}}, \Sigma_{\mathrm{out}})$ — input/output JSON Schemas
- $\psi \in \mathrm{Status} = \{\mathsf{draft}, \mathsf{validated}, \mathsf{active}, \mathsf{transitioning}, \mathsf{deprecated}, \mathsf{expired}, \mathsf{quarantined}\}$
- $\tau \in \mathrm{Tier} = \{\mathsf{foundation}, \mathsf{governed}, \mathsf{standard}, \mathsf{experimental}\}$
- $H = (h_{\mathrm{spec}}, h_{\mathrm{code}}, h_{\mathrm{test}}) \in \mathrm{Hash}^3$ — `hashLock`

The status component $\psi$ follows a state machine $\mathsf{draft} \to \mathsf{validated} \to \mathsf{active} \rightleftarrows \mathsf{transitioning} \to \mathsf{deprecated} \to \mathsf{expired}$, with $\mathsf{quarantined}$ reachable from any state (`status-machine.ts`).

**Definition 2 (Atom Map).**
An atom map $M$ is a 4-tuple $M = \langle \mathit{id}, V, E, R \rangle$ where $\mathit{id}$ matches `^ATM-MAP-\d{4}$`, $V \subseteq \mathrm{AtomId}$ are member atoms, $E \subseteq V \times V \times \mathrm{EdgeKind}$ are typed edges with $\mathrm{EdgeKind} = \{\mathsf{data\text{-}flow}, \mathsf{control\text{-}flow}, \mathsf{event\text{-}flow}, \mathsf{validation}, \mathsf{fallback}, \mathsf{side\text{-}effect}, \mathsf{rollback}\}$, and $R \subseteq V$ ($R \neq \emptyset$) are entrypoints.

**Boundary semantics.** The boundary of atom $a$ is defined *extensionally* by $P$ (`sourcePaths`): the set of files (and within them, the regions identified by the adapter as belonging to $a$) that constitute $a$'s code, schema, and test surfaces. This sidesteps the question "what counts as one atom" by delegating it to whatever granularity the adapter reports — a single function, a class, a module, or (via §3.6) a refined sub-region of a function.

#### Symbol Canonicalization Policy ✅ (CID-0033, `f841a27c`)

Definition 1 implicitly assumes that an adapter can name an atom with a stable `symbol`. In practice the same code admits multiple surface names:

```typescript
namespace Foo { export function bar() {} }     // "bar" or "Foo.bar"?
import { bar as renamedBar } from './foo';     // caller sees "renamedBar"
class Baz { method() {} }                       // "method" or "Baz.method" or "Baz#method"?
```

```python
@cache
def baz(): ...   # symbol "baz" in source, but the runtime callable is cache(baz)
```

We require each adapter to expose a deterministic, idempotent canonicalization function

$$\mathrm{canon\_sym}: \mathrm{RawSymbol} \to \mathrm{CanonicalSymbol}$$

that resolves namespaces, re-export aliases, and (where statically detectable) decorator wrappers to a single stable form, declared in the adapter's manifest. The broker only ever consumes `canon_sym(symbol)`. Implemented in `packages/plugin-sdk/src/language-adapter.ts` (manifest schema, +20 LOC) and `packages/plugin-sdk/src/atomization-planning.ts` (+98 LOC); JS and Python adapters both wire `canon_sym` policy declarations (`packages/language-js/src/language-js-adapter.ts`, `packages/language-python/src/language-python-adapter.ts`). This does **not** solve cross-language symbol identity (an open problem, §3.9) — it only guarantees *within one adapter's regime*, the same logical unit always maps to the same symbol string, which is a precondition for CID stability (Definition 3).

---

### 3.3 Two-Tier Contract Identifiers (CID) ✅

ATM uses **two distinct CIDs** with different roles, addressing inputs, and guarantees. Conflating them is a common source of confusion in earlier drafts of this work — we make the distinction explicit.

**Definition 3 (Candidate CID).** ✅ Given a candidate $c = (\mathit{kind}, \mathit{symbol}, P, \mathit{method})$ where $\mathit{symbol} = \mathrm{canon\_sym}(\cdot)$:

$$\mathrm{canon}(c) := \mathit{kind} \mathbin{\|} \mathit{symbol} \mathbin{\|} \mathrm{sort}(\mathrm{dedup}(\mathrm{normalize}(P))).\mathrm{join}(\texttt{','}) \mathbin{\|} \mathit{method}$$

$$\mathrm{CID}_{\mathrm{candidate}}(c) := \mathrm{SHA\text{-}256}(\mathrm{canon}(c)).\mathrm{hex}()$$

(`packages/core/src/broker/candidate-bridge.ts`, `computeCandidateAtomCid`). This is a **metadata-level, pre-write fingerprint**: it identifies *which symbol, in which files, discovered by which method* — not the content of the patch. It deliberately excludes line ranges (`lineStart`/`lineEnd`); coupling the CID to line ranges would make it unstable under reformatting and whitespace-only edits. This design choice is what motivates Adaptive Granularity Refinement (§3.6) as the mechanism for hunk-level disambiguation, rather than extending Definition 3 itself.

**Definition 4 (Capsule CID).** ✅ Given an exported atom bundle $B = (\mathit{canonicalSourceCode}, \Sigma_{\mathrm{in}}, \Sigma_{\mathrm{out}}, \pi)$ where $\pi$ is the police/policy configuration:

$$\mathrm{canon}(B) := \mathrm{JSON}(\{\mathit{canonicalSourceCode}, \Sigma_{\mathrm{in}}, \Sigma_{\mathrm{out}}, \pi\})$$

$$\mathrm{CID}_{\mathrm{capsule}}(B) := \texttt{"atom:cid:"} \mathbin{\|} \mathrm{base64url}(\mathrm{SHA\text{-}256}(\mathrm{brotli}(\mathrm{canon}(B))))$$

(`packages/core/src/registry/atom-capsule.ts`, `computeAtomCid`). Unlike the Candidate CID, this **is** a content-addressed identifier: it covers the full source body, both schemas, and the policy configuration, brotli-compressed and base64url-encoded with an `atom:cid:` prefix.

| Stage | CID | Granularity | Addressing |
|---|---|---|---|
| Broker admission (pre-write) | $\mathrm{CID}_{\mathrm{candidate}}$ | symbol-level | metadata (kind, symbol, paths, method) |
| Atom export / version anchor (post-validation) | $\mathrm{CID}_{\mathrm{capsule}}$ | full bundle | content (source + schemas + policy) |

A third identifier exists in the codebase (`team-lane.ts`, a deterministic slug derived from `taskId` for lane routing). This is **not** a contract or content identifier and is out of scope for this paper's formalization; we recommend it be renamed (e.g., `laneId`) to avoid confusion with Definitions 3–4 — a naming hygiene item tracked in the implementation plan, not an academic concern.

**Versioning.** The current Candidate CID formula uses literal `"||"` concatenation, which admits (low-probability) delimiter-collision inputs and has no explicit algorithm version. A hardened version would compute $\mathrm{canon}(c)$ over a canonical-JSON object tagged with `schema_version: "atm.cid.candidate.v1"`, allowing future formula revisions to be distinguished from the current one. We treat this as a **prototype limitation, not a soundness gap**: §3.9 discusses the migration question this raises.

---

### 3.4 The CID Broker: Admission Algorithm ✅

The broker (`packages/core/src/broker/`, ~1,932 LOC) consumes a `WriteIntent` per agent — a set of `atomRefs` (each carrying $\mathrm{CID}_{\mathrm{candidate}}$), `targetFiles`, and declared `sharedSurfaces` (generators / projections / registries / validators / artifacts) — and returns one of four verdicts (`packages/core/src/broker/decision.ts`, `calculateBrokerDecision`):

1. **`blocked-cid-conflict`** — two intents reference the same atom with conflicting writes
2. **`blocked-shared-surface`** — two intents declare overlapping shared surfaces
3. **`needs-physical-split`** — intents touch the same file but with CID-disjoint atom sets; routed to the deterministic-composer lane for synthesis (§3.7)
4. **`parallel-safe`** — no overlap on any of the above dimensions

**Theorem 1 (Cross-Regime Disjointness).** ✅/🔷 *If two candidates $c$ (from adapter $\mathcal{A}$) and $c'$ (from adapter $\mathcal{A}'$, $\mathcal{A} \neq \mathcal{A}'$) belong to disjoint language regimes — i.e., the project's directory layout convention assigns each adapter a disjoint root directory $D_{\mathcal{A}} \cap D_{\mathcal{A}'} = \emptyset$ — then $\mathrm{sourcePaths}(c) \cap \mathrm{sourcePaths}(c') = \emptyset$, and the broker's file-overlap check trivially yields `parallel-safe`.*

This is a direct consequence of Definition 3 (sourcePaths are part of the canon input) plus the directory-separation convention; we state it explicitly because it is the formal basis for claiming that ATM's admission decision composes safely across heterogeneous multi-language agent fleets *without* requiring any cross-language symbol mapping (cf. §3.9, A3). The theorem does **not** hold for polyglot single files (e.g., embedded SQL/JS in a single source file); such cases fall back to within-file CID-disjointness checks and, if those fail, to AGR (§3.6).

**Augmented Decision Rule (Dependency-Aware) ✅ (CID-0032, `16533023`).** The four-verdict algorithm above is augmented with a read-dependency check: let $D(I)$ be the set of atoms intent $I$ declares as *read* dependencies, and $R(I')$ the set of atoms a concurrent intent $I'$ *writes*. Then

$$D(I) \cap R(I') \neq \emptyset \implies \texttt{SERIAL}(I, I')$$

i.e., if $I$ reads an atom that $I'$ is concurrently writing, $I$ must be serialized after $I'$ (or vice versa, by timestamp), even if their write sets are disjoint. Implemented by extending `WriteIntent` with a `readAtoms: AtomRef[]` field (`packages/core/src/broker/types.ts`) and adding the read/write intersection check to `calculateBrokerDecision` (`packages/core/src/broker/decision.ts`, +107 LOC, with 166 LOC of regression tests in `decision.test.ts`). Validated by benchmark scenario `07-registry-read-write-dependency` (§4.2).

---

### 3.5 Admission Soundness ✅ (validated via 12-scenario benchmark, §4.2)

**Assumptions.**

- **(A1′)** Each adapter's `discoverAtomCandidates` extracts a read/write set covering all *statically determinable* effects of the corresponding code region, under its declared `canon_sym` policy.
- **(A2)** Effects arising from language features beyond static analysis — decorators, proxies, reflection, `eval`, dynamic `import` — are **not** claimed to be captured by (A1′). Their correctness is delegated to the post-write validator phase (§3.8), not the broker.

**Theorem 2 (Admission Soundness, conditional).** *Under (A1′) and (A2), a* `parallel-safe` *verdict implies the absence of write-write conflicts among the statically-determinable portions of the concurrent agents' patches. Conflicts arising solely from dynamic effects outside (A1′) are not excluded by this theorem.*

This is a deliberately weaker statement than an unconditional soundness claim. The earlier (rejected) formulation — "the adapter extracts the *complete* read-write set" — is unfalsifiable for any language with reflection or metaprogramming, and a reviewer would correctly reject a theorem resting on it. By splitting responsibility at the static/dynamic boundary and assigning the dynamic remainder to validators (which is where ATM's existing dry-run/evidence pipeline already operates), Theorem 2 becomes a claim about what the *broker* guarantees, not a claim about total program semantics.

**Empirical validation.** Theorem 2 is exercised by the 12-scenario AGR benchmark harness (`scripts/validate-agr-benchmark.ts`, CID-0037, `e62eee72`). In particular: scenario 7 (`registry-read-write-dependency`) verifies the augmented decision rule catches a conflict that the original four-verdict algorithm would have silently admitted; scenario 10 (`validator-catch-typecheck-failure`) confirms the (A2) handoff to validators works as designed for cases outside (A1′).

---

### 3.6 Adaptive Granularity Refinement (AGR) ✅ (CID-0028/0029/0031/0035)

When `needs-physical-split` or `blocked-cid-conflict` arises because two agents' patches land in the same symbol-level atom (Definition 3 is symbol-granular, not line-range-granular), AGR refines the atom boundary in two layers.

**Algorithm 1 (Layer 1 — Syntactic Enclosure Atomization).** ✅ Implemented in `packages/core/src/broker/agr.ts` (+57 LOC); SDK contract for `EnclosingUnit` and `VirtualAtom` in `packages/plugin-sdk/src/atomization-planning.ts`. Purely structural; requires no test execution.

```
Input:  patch P (set of (file, lineStart, lineEnd) hunks),
        existing atoms A,
        adapter.enclose: (file, line) → syntactic unit
                          (function | var-decl | statement | class-method | ...)
Output: virtual atom set V₁

1. G := patch_lines(P) \ ⋃{ region(a) : a ∈ A }      // hunks not covered by known atoms
2. for each maximal contiguous region r ⊆ G:
     u := adapter.enclose(r.file, r.lineStart)
     v := VirtualAtom(kind=u.kind, symbol=u.symbol,
                       sourcePaths=[u.fileRange], method=adapter.detectionMethod,
                       layer=1, confidence=u.confidenceClass)
     V₁ := V₁ ∪ {v}
3. return V₁
```

Each $v \in V_1$ gets its own $\mathrm{CID}_{\mathrm{candidate}}(v)$ via Definition 3 (distinct `symbol`/`sourcePaths` from the enclosing atom), so the broker re-evaluates admission with finer-grained CIDs. If this yields `parallel-safe`, AGR stops here — **no refactoring, no LLM call**.

**Algorithm 2 (Layer 2 — Signature-Preserving Decomposition).** ✅ Implemented in `packages/core/src/broker/policy.ts` (+131 LOC, including the `shouldTriggerLayer2()` threshold check) with 210 LOC of dedicated tests in `agr-layer2.test.ts`. Triggered only when Layer 1 still leaves conflicts, *and* those conflicts are concentrated:

```
Trigger:  |Conflicts(V₁)| ≤ θ_count
          ∧ ∀(a,a') ∈ Conflicts(V₁): conflict_region(a,a') ⊆ body(f) for some function f
          ∧ |conflict_region| / |body(f)| ≤ θ_density

Effect:   decompose f into f_pre · f_extracted · f_post
          subject to: signature(f) unchanged
                       (parameters, return type, and call sites of f are preserved)
          replace virtual atom for f with three fresh virtual atoms
            v_pre, v_zone, v_post — each with a fresh CID_candidate
```

The signature-preservation constraint is what makes Layer 2 LLM-friendly: "extract lines $X$–$Y$ of function $f$ into a new function, preserving $f$'s signature and replacing the extracted lines with a call" is a narrow, low-ambiguity rewrite task. The broker re-evaluates with $V_2$; if conflicts persist after Layer 2, the conflict is treated as genuinely physical and the intents are serialized — AGR does not recurse further, bounding worst-case refinement to two rounds.

**Tooling note.** The *decision* of whether to trigger Layer 2 (the threshold check above) requires only line-range arithmetic over already-known regions — no AST. The *execution* of the decomposition (the actual rewrite of $f$) is adapter/agent-chosen and may use AST-based refactoring tools or a constrained LLM rewrite; because the signature is held fixed, this is a narrow enough task that either approach has low error rates in practice. Validated by benchmark scenarios `11-layer1-no-refinement-available` and `12-layer2-threshold-not-met` (§4.2).

---

### 3.7 The Broker as the Sole Serialization Point ✅ (CID-0035, `aa907d04`)

A natural objection is that the registry itself — the structure the broker reads/writes to make admission decisions — could be subject to a race condition between two concurrently-registering agents. ATM's design avoids this by construction: **agents never write to the registry directly**. Both agents submit `WriteIntent`s to the broker; the broker performs registry reads/updates atomically and is the sole writer.

This extends to **mid-execution registration** ✅: if Agent A registers and begins executing an intent on atom $a$, and Agent B subsequently registers an intent that also targets $a$, the broker detects $a$ as "in use" at registration time (not only at write time), and routes the pair through the same conflict-resolution paths as §3.4 (merge via deterministic-composer if CID-disjoint, or serialize). The actual filesystem write is performed by a single **neutral Writer Agent** (the "neutral write steward", `packages/core/src/broker/steward.ts`) that both agents' admitted plans are handed off to — eliminating any scenario where two agents perform concurrent filesystem writes to the same target. The CLI surface is exposed via `packages/cli/src/commands/broker.ts` (+67 LOC in CID-0035).

**Operational layer note (2026-06-13~06-15).** The broker's sole-serialization-point property is preserved under the Multi-Agent Orchestration (MAO) operational layer built on top of it: MAO's Route Context state machine (`open → admitted → frozen → waiting → blocked → ready-to-apply → closed/abandoned`, specified in `docs/specs/mao-logical-routing-v1.md`) and its `freeze.ts` / `patch-envelope.ts` / `conflict-matrix.ts` components (TASK-MAO-0006~0009, shipped 2026-06-14) route all admission decisions and registry writes through the same broker described above — concurrency at the orchestration layer is additive scheduling on top of, not a bypass of, §3.4's admission algorithm. This is further extended by the proposed Team Agents Wave Mode (TASK-MAO-0023~0034, design only as of 2026-06-16), which batches admission for groups of related task cards while keeping broker admission and coordinator-only commit as the sole serialization and lifecycle authorities (see §3.8 and §6.4).

---

### 3.8 Limitation: Write-Conflict Prevention ≠ Semantic Correctness

We state this limitation prominently because it bounds every claim in §3.4–3.7.

> **ATM guarantees:** the broker will not admit two concurrent write-intents that conflict on Definition 3/4 identity, declared shared surfaces, or (with Theorem 1/2) statically-determinable read/write sets.
>
> **ATM does not guarantee:** that the *merged result* of two non-conflicting writes is semantically correct. Two patches can be CID-disjoint (different functions, different atoms, `parallel-safe` verdict) and yet be semantically incompatible — e.g., one patch changes a function's behavior in a way that the other patch's caller silently relies on the old behavior, with neither patch's *write set* overlapping the other's.

This is structurally the same boundary Git itself operates under: a clean three-way merge (no textual conflict) does not imply the merged program is correct. ATM's answer to this gap is the same as Git's — **post-write validators** (typecheck, lint, test, project-specific checks) are the layer responsible for catching semantic incompatibilities that survive write-conflict admission. We report validator pass/fail rates as part of the evaluation plan (§5) but do not claim the broker itself detects these cases — doing so would require full program analysis, which is explicitly outside this framework's scope (§3.5, A2).

**Batch admission and evidence attribution (design).** A related, still-open engineering problem arises when $N$ agents operate within a single governed batch ("wave") admitted as a group: the broker's admission algorithm (§3.4) still evaluates each `WriteIntent` individually, but the resulting unified diff must be attributable back to individual task units for evidence and rollback. ATM's proposed Team Agents Wave Mode (TASK-MAO-0023~0034, §3.7) addresses this via declared `allowedFiles`/`scopePaths` per task and a wave-checkpoint step that rejects waves whose combined output cannot be cleanly sliced into per-task evidence. This does not change the admission soundness argument (Theorem 2) — each constituent intent is still individually admitted — but it is a distinct attribution problem that the formal model in §3.4–3.5 does not address. We flag it here as a known limitation of applying ATM at batch scale, deferred to the operational MAO specification.

---

### 3.9 Known Open Problems in This Formalization

We list two issues that this formalization does not resolve, to avoid overclaiming:

- **Cross-language atom identity.** If two atoms in different language regimes are claimed to represent "the same logical unit" (e.g., a TS API client and its Python backend handler), Definition 3's per-adapter `canon_sym` gives them unrelated CIDs — Theorem 1 guarantees they don't *collide*, but does not let the broker recognize they are *related*. This paper does not claim cross-language logical-atom tracking; all admission claims (Theorem 1, 2) are scoped to within-regime or cross-regime-disjoint reasoning.
- **CID schema-version migration.** The `schema_version` mechanism (§3.3) prevents *future* formula changes from silently colliding with the current one, but does not by itself resolve the transition period: an active `WriteIntent` holding a $v_1$-computed CID and a newly-submitted intent holding a $v_2$-computed CID for the *same* underlying atom would not be recognized as referring to the same atom by either formula alone. We do not propose a resolution here; candidates include broker-side dual computation during a migration window, or a flag-day requiring all active intents to drain before a schema version bump. This is an implementation-planning question, tracked separately.

---

### 3.10 Generalizing Beyond Code: Format Adapters and ConflictKey 🔹 (Design, Not Yet Implemented)

The broker's admission algorithm (§3.4) is stated in terms of code atoms (Definition 1) and their CIDs (Definitions 3–4). A natural question is whether the same admission core generalizes to *non-code structured artifacts* that multi-agent systems also write concurrently — JSON registries, path-to-atom maps, YAML/TOML configuration, numeric scalar files, and similarly. ATM's planning documents (`cid-hardening/CID硬化計畫書2.md`, 2026-06-15) propose, but do not yet implement, a three-layer extension:

- **Broker Core** (unchanged): the admission algorithm of §3.4, parameterized over an abstract conflict key rather than a code-atom CID.
- **Format Adapter Plugin**: a `FileMutationAdapter` interface — `supports / parse / normalize / getConflictKeys / canMerge / merge / serialize / validate` — implemented per file format (JSON, plain text ranges, numeric scalars, YAML/TOML).
- **Domain Adapter**: format-adapter consumers specialized to a domain artifact (e.g., an `AtomMapAdapter` for `path-to-atom-map.json`), mapping domain-specific structures onto the `ConflictKey` taxonomy below.

**Definition 5 (ConflictKey).** A conflict key is a pair $(\mathit{scope}, \mathit{locator})$ where $\mathit{scope} \in \{\mathsf{file}, \mathsf{record}, \mathsf{range}, \mathsf{line}, \mathsf{scalar}, \mathsf{semantic}\}$ and $\mathit{locator}$ identifies the conflicting unit within that scope (e.g., a JSON record's primary key for $\mathsf{record}$, a line range for $\mathsf{range}$, a field path for $\mathsf{scalar}$).

**Theorem 3 (ConflictKey Disjointness, proposed — not yet validated).** *If two `MutationRequest`s $m, m'$ against the same file produce conflict-key sets $K(m)$ and $K(m')$ with $K(m) \cap K(m') = \emptyset$, and the format adapter's `canMerge` predicate holds for $(m, m')$, then the broker may admit both as `parallel-safe` (routed through `merge`), generalizing Theorem 1's file-overlap argument from code atoms to arbitrary structured artifacts.*

This theorem is stated in the same conditional style as Theorem 2 (§3.5): it depends on the adapter-supplied `canMerge`/`merge` pair being correct for the format in question, just as Theorem 2 depends on (A1′)/(A2). We list it here as a roadmap contribution (tracked as TASK-CID-0091~0098, 8 task cards, none yet implemented) rather than a validated result — no benchmark scenario in §4.2 currently exercises Definition 5 or Theorem 3. We include it because it clarifies the *shape* of the generalization: the broker's role (admission via disjointness-or-mergeability checks) is format-agnostic; only the conflict-key extraction and merge logic are format-specific, mirroring the adapter-guided philosophy of §1.2 for code.

---

## 4. Validation via 12-Scenario AGR Benchmark Harness

This section provides evidence that the mechanisms in §3 are implemented, functional, and exercised by a formal benchmark harness. We focus on demonstrating that the framework's stated properties hold against a deterministic test suite, rather than on comparative performance evaluation against prior systems (which is deferred to a forthcoming full paper).

### 4.1 Complete SDK + AGR Implementation Pipeline

The implementation pipeline spans two task series:

**TASK-ASP-0001~0005 (2026-06-10): SDK + adapter foundation.**

- ASP-0001: [`atomization-planning.ts`](https://github.com/eaglhuang/AI-Atomic-Framework/blob/main/packages/plugin-sdk/src/atomization-planning.ts) SDK contract — commit `e08bbb2a`
- ASP-0002: JS adapter candidate discovery (scanner-based) — commit `8a58d1d9`
- ASP-0003: Python adapter SDK promotion — commit `6b9eb395`
- ASP-0004: Broker candidate-to-intent bridge with `computeCandidateAtomCid()` (Definition 3) — commit `14359be3`
- ASP-0005: 3KLife coordination + corpus baseline — commit `afa17a12`

**TASK-CID-0028~0037 (2026-06-11/12): AGR + augmented decision rule.**

- CID-0028: [EnclosingUnit + VirtualAtom SDK](https://github.com/eaglhuang/AI-Atomic-Framework/blob/main/packages/plugin-sdk/src/atomization-planning.ts) (+98 LOC) — bundled in commit `f841a27c`
- CID-0029: [Layer 1 syntactic enclosure refinement](https://github.com/eaglhuang/AI-Atomic-Framework/blob/main/packages/core/src/broker/agr.ts) (+57 LOC) — bundled in commit `aa907d04`
- CID-0031: [Layer 2 threshold policy](https://github.com/eaglhuang/AI-Atomic-Framework/blob/main/packages/core/src/broker/policy.ts) (+131 LOC, 210 LOC tests) — commit `aa907d04`
- CID-0032: [Augmented Decision Rule with read-set](https://github.com/eaglhuang/AI-Atomic-Framework/blob/main/packages/core/src/broker/decision.ts) (107 LOC rewrite, 166 LOC tests) — commit `16533023`
- CID-0033: [Adapter manifest + canon_sym contract](https://github.com/eaglhuang/AI-Atomic-Framework/blob/main/packages/plugin-sdk/src/language-adapter.ts) (+20 LOC) — commit `f841a27c`
- CID-0034: AGR runtime registry integration — commit `9d214ad9`
- CID-0035: [AGR-aware neutral writer / steward](https://github.com/eaglhuang/AI-Atomic-Framework/blob/main/packages/core/src/broker/steward.ts) + CLI (+67 LOC) — commit `aa907d04`
- CID-0036: AGR closeout validator integration — commit `5bea4e31`
- CID-0037: [12-scenario AGR benchmark harness](https://github.com/eaglhuang/AI-Atomic-Framework/blob/main/scripts/validate-agr-benchmark.ts) (364 LOC runner + 107 LOC validator) — commit `e62eee72`

Status: ✅ all task cards closed, regression tests passing, ledger entries recorded in `.atm/history/`.

### 4.2 The 12-Scenario AGR Benchmark Harness (CID-0037, `e62eee72`)

The broker's decision algorithm (§3.4), augmented decision rule (§3.4 read-set), Theorem 2 admission soundness (§3.5), and AGR Layer 1 / Layer 2 (§3.6) are jointly validated by a formal benchmark harness located at [`scripts/fixtures/agr-benchmark/`](https://github.com/eaglhuang/AI-Atomic-Framework/tree/main/scripts/fixtures/agr-benchmark/), executed by [`scripts/validate-agr-benchmark.ts`](https://github.com/eaglhuang/AI-Atomic-Framework/blob/main/scripts/validate-agr-benchmark.ts) (107 LOC) via [`scripts/lib/agr-benchmark-runner.ts`](https://github.com/eaglhuang/AI-Atomic-Framework/blob/main/scripts/lib/agr-benchmark-runner.ts) (364 LOC).

The harness contains **12 scenarios**, each a deterministic JSON fixture with declared `expected` verdicts:

| # | Scenario | Validates | Expected verdict |
|---|---|---|---|
| 01 | `compose-disjoint-same-file` | §3.4 same-file CID-disjoint composition | `parallel-safe` (via composer) |
| 02 | `compose-same-atom-cid-blocked` | §3.4 write/write conflict | `blocked-cid-conflict` |
| 03 | `compose-same-atom-cid-unresolvable` | Layer 2 threshold not met → escalate | `steward-takeover` |
| 04 | `compose-overlapping-hunks` | Hunk-overlap detection | `blocked-cid-conflict` |
| 05 | `registry-cid-disjoint-file-overlap` | Theorem 1 within-regime file overlap with CID-disjoint atoms | `needs-physical-split` |
| 06 | `registry-shared-surface-blocked` | §3.4 shared-surface overlap | `blocked-shared-surface` |
| 07 | `registry-read-write-dependency` | **§3.4 Augmented Decision Rule** ($D(I) \cap R(I') \neq \emptyset$) | `SERIAL` |
| 08 | `registry-parallel-safe-clean` | Negative control: no conflict at any dimension | `parallel-safe` |
| 09 | `compose-shared-validator-surface` | Shared validator artifact collision | `blocked-shared-surface` |
| 10 | `validator-catch-typecheck-failure` | **§3.5 (A2)**: validators catch what broker (A1′) does not | broker `parallel-safe` + validator FAIL |
| 11 | `layer1-no-refinement-available` | AGR Layer 1: adapter has no `enclose()` available | fall back to original verdict |
| 12 | `layer2-threshold-not-met` | AGR Layer 2: thresholds $\theta_{\mathrm{count}}, \theta_{\mathrm{density}}$ not satisfied | escalate to `steward-takeover` |

**Coverage statement.** Each major formal claim in §3 has at least one corresponding scenario:
- Theorem 1 (Cross-Regime Disjointness): scenario 05
- Theorem 2 (Admission Soundness under A1′/A2): scenarios 07 (A1′ holds) + 10 (A2 handoff)
- Algorithm 1 (AGR Layer 1): scenarios 01, 11
- Algorithm 2 (AGR Layer 2): scenarios 03, 12
- Augmented Decision Rule: scenario 07
- Two-tier CID separation (Definitions 3/4): scenarios 02 (Candidate), 09 (Capsule via validator surface)

**Limitation.** The harness validates that the broker's decisions match the formal model on these specific inputs. It does not yet provide comparative numbers against STORM / CodeCRDT / SCF baselines — that comparative work is deferred to the full paper (December 2026, §5).

### 4.3 Early Real-World Adoption: npc-brain, 3-Week Case Study (✅ Real Usage Data)

The npc-brain project (a game NPC behavior system, [GitHub](https://github.com/eaglhuang/3klife-npc-brain)) adopted ATM for multi-agent code atomization over a 3-week period (2026-05-19 to 2026-06-07):

| Metric | Value |
|---|---|
| Atomization task cards completed | 37 |
| Scope-lock interactions recorded | 44 |
| Write-conflict admission errors (incorrectly rejected safe writes) | 0 |
| Semantic validation failures (validator caught issues) | 3 (all resolved via evidence + rollback) |
| Real-world atom granularity distribution | function/module-level (no AST node-level splitting needed) |

**Interpretation:** The zero admission errors (cases where the broker incorrectly rejected a parallel-safe write) supports Theorem 1 (Cross-Regime Disjointness) in practice: adapters naturally discovered disjoint atoms (functions in separate files, or via AGR Layer 1 within the same file), broker's decisions were sound. The three validation failures were caught post-write by `typecheck` / `test` validators, consistent with §3.8 (write-conflict prevention ≠ semantic correctness).

### 4.4 CID Stability and Versioning (✅ Capsule CID Verification Complete)

User-reported implementation (2026-06-11) of CID hardening (§3.3, Definition 4):
- Capsule CID formula: fixed-field JSON + brotli + SHA-256 + base64url encoding
- Verification harness: `scripts/validate-atom-id-to-cid.ts` 
- Registry: 104 atom → CID mappings verified, 33 placeholder entries flagged (expected for atoms extracted from legacy code without full source)
- Test coverage: `packages/core/src/registry/__tests__/atom-capsule.test.ts` validates:
  - CID stability (same bundle → same CID)
  - CID mismatch on content change (source/schema/policy modification → new CID)
  - Tamper detection (modified payload → hash mismatch)
- Status: ✅ Passes `node --strip-types scripts/validate-atom-id-to-cid.ts`, `node --strip-types scripts/atom-id-to-cid-backfill.ts --write`, `git diff --check` clean.

---

## 5. Limitations and Roadmap

This vision paper establishes the formal mechanisms (Definitions 1–4, Theorems 1–2, Algorithms 1–2, Augmented Decision Rule) and validates them through the 12-scenario benchmark harness (§4.2) plus the npc-brain 3-week adoption study (§4.3). **What this paper does not include:**

- **Comparative performance benchmarks** against STORM / CodeCRDT / Semantic Consensus / MPAC on shared task corpora — these require porting baselines and collecting wall-clock + token-cost data; deferred to the December 2026 full paper.
- **Statistical evaluation on large-scale multi-language corpora** — npc-brain (3 weeks, single language family) demonstrates correctness; we need 10× scale to make confidence-bounded throughput claims.
- **Cross-language atom identity** — §3.9 open problem A3; not resolved here.
- **CID schema-version migration during active intents** — §3.9 open problem; current `schema_version` field prevents future collisions but does not address mid-migration transitions.

**What is already implemented and validated (no longer in the roadmap):**

- ✅ Atom + Atom Map formalization (Definitions 1–2) — `packages/core/src/registry/`
- ✅ Two-tier CID (Definitions 3–4) — `candidate-bridge.ts`, `atom-capsule.ts`, hardened in commit `13b17ffc`
- ✅ Four-verdict broker admission (§3.4) — `decision.ts`
- ✅ Augmented Decision Rule with read-set (§3.4) — CID-0032
- ✅ Cross-Regime Disjointness (Theorem 1) — validated by scenario 05
- ✅ Conditional Admission Soundness with A1′/A2 (Theorem 2) — validated by scenarios 07 + 10
- ✅ AGR Layer 1 + Layer 2 (Algorithms 1–2) — `agr.ts`, `policy.ts`
- ✅ Symbol Canonicalization Policy — CID-0033, adapter manifests
- ✅ Mid-execution registration + neutral writer (§3.7) — `steward.ts`, CID-0035
- ✅ 12-scenario AGR benchmark harness — CID-0037

**Evaluation roadmap:**
- ✅ **Vision paper (current, June 2026):** mechanism design + benchmark-validated implementation correctness
- 🔜 **Full paper (December 2026, ICSE/FSE submission):** comparative evaluation against STORM / CodeCRDT / SCF; multi-adopter scale-out study; MAO multi-agent orchestration layer evaluation. As of 2026-06-15, MAO is partially shipped (`freeze.ts`, `patch-envelope.ts`, `conflict-matrix.ts`, route-context lifecycle — TASK-MAO-0006~0009) with a simulator benchmark (TASK-MAO-0010) and Team Agents Wave Mode (TASK-MAO-0023~0034, §3.7/§6.4) pending. See [`multi-agent-orchestration/MAO多AI並行治理計畫書.md`](https://github.com/eaglhuang/3KLife/blob/main/docs/ai_atomic_framework/multi-agent-orchestration/MAO%E5%A4%9AAI%E4%B8%A6%E8%A1%8C%E6%B2%BB%E7%90%86%E8%A8%88%E7%95%AB%E6%9B%B8.md) and its sequel `MAO多AI並行治理計畫書2.md` (Team Agents Wave Mode).

---

## 6. Discussion

### 6.1 Why Adapter-Guided, Not AST-First?

The natural question is: why not require every adapter to expose a full static analysis engine (AST, type inference, data-flow graph)?

**Engineering cost.** Building a production-grade AST analyzer is non-trivial per language. Python has `ast` in stdlib, but `ast.parse` doesn't resolve decorators or metaclass magic. TypeScript has the compiler API, but integrating it into an adapter adds ~500 LOC of bridging code. Go has a parser package, but importing it adds runtime dependency. A "universal AST + unified IR" layer (the dream) is infeasible across 10+ languages in constant evolution.

**Diminishing returns.** Adapters using lightweight detection (regex / compiler API without full semantic inference) already achieve the npc-brain result: zero admission errors over 37 tasks, function-level granularity. Adding full static analysis increases confidence from 70% → 85% for perhaps 10× implementation effort.

**Scope preservation.** ATM's core role is *admission* (decide which writes can run in parallel), not *analysis* (understand all program semantics). By delegating detection to adapters and outsourcing semantic verification to validators (test/typecheck/lint), ATM stays a governance framework, not a language-understanding framework.

### 6.2 When Does Adapter-Guided Fail?

Adapter-guided atomization degrades when:

1. **Metaprogramming-heavy code** (Python metaclass, Ruby `method_missing`, JavaScript Proxy). Adapters can emit candidate symbols, but the actual executed code may differ. Remedy: evidence validators catch the discrepancy.

2. **Cyclic module dependencies or self-referential atoms.** Broker's scope-lock prevents concurrent writes to the same atom, but doesn't prevent A writes X (which imports B), B writes Y (which imports X), if both are `parallel-safe`. Remedy: dependency-graph validator catches import cycles.

3. **Adapter version mismatch.** If the Python adapter is upgraded between submissions from two agents, `canon_sym` policy might change → same symbol produces different CIDs → false negatives (undetected conflicts). Remedy: broker enforces a single adapter version per admission cycle (§3.9, open problem).

### 6.3 Open Questions and Future Work

- **Cross-language atom identity (A3, §3.9):** If a TS API handler and Python backend handler are claimed to implement the same logical contract, how should the broker track that relationship? Current answer: out of scope (Theorem 1 only covers disjoint regimes). Future: extend manifest to support cross-regime aliases.

- **CID schema versioning and migration (§3.9):** When Candidate CID formula changes (e.g., `||` → canonical JSON), how do we avoid collisions with active intents? Current plan: broker dual-compute during migration window, or flag-day drain. Deferred to implementation roadmap.

- **Multi-Agent Orchestration (MAO) layer:** The operational layer above the broker — defining Root Router / Route Context / Patch Envelope contracts — has 10 task cards specified (TASK-MAO-0001~0010) but implementation has not started. Once delivered, MAO enables N-agent parallelism on a single worktree without requiring physical worktree isolation.

- **Type-aware extensions:** Integrating T-RDT or similar type-preserving CRDT would strengthen semantic guarantees for statically-typed languages (TS, Go). Out of current scope.

- **Cross-file slicing (LSP integration):** Tracking read/write sets across file boundaries requires language-server integration. Candidate for future phase.

- **Cross-model validation:** In a multi-vendor LLM setting, independent verification by a second-model agent (e.g., Claude for primary, GPT-4 for secondary review) could catch primary-model hallucinations. Requires careful calibration of AGREE/DISAGREE/ABSTAIN verdict weighting — deferred to empirical evaluation.

### 6.4 Self-Referential Validation: ATM Governing Its Own Development

A noteworthy property of ATM's development process is that it is itself an instance of the multi-agent admission-controlled pattern this paper describes. The implementation of ATM's own next layer — the Format Adapter Plugin family for the CID Broker (TASK-CID-0091~0098, §3.10) — is planned to be coordinated via ATM's Team Agents Wave Mode (TASK-MAO-0033, "team wave dogfood benchmark with CID Phase B shape"), in which multiple agents concurrently implement an adapter registry plus JSON, text-range, and numeric-scalar adapters under broker admission, with per-task evidence sliced from a single wave diff (§3.8). While this is not a controlled experiment and does not substitute for the comparative benchmarks of §5, it provides an in-vivo stress test of the admission model on the same kind of multi-agent, multi-file, shared-surface workload the paper targets — applied to the framework's own codebase. We plan to report on this dogfood run as additional §4 evidence in the December 2026 full paper.

---

## 7. Conclusion

Multi-agent LLM systems demand a concurrency control layer tuned to the granularity at which AI Agents naturally generate code — **function and module level**. This paper argues for Tier 2 (the function/module tier), absent from the current coordination landscape, and shows how to implement it without requiring a heavyweight universal AST engine.

**Key contributions:**

1. **Formalization:** Atoms (Definition 1), two-tier CIDs (Definitions 3–4), deterministic admission logic (§3.4), soundness theorems under realistic assumptions (Theorem 2, A1′/A2).

2. **Adapter-guided architecture:** Language adapters provide candidates at their native granularity (regex for Python, compiler API for TS, LSP for others) — no universal requirement for AST. The broker consumes these candidates and makes admission decisions based on scope, not syntax.

3. **Governance-first design:** Dry-run patches, review gates, evidence validators, and rollback paths substitute for perfect static analysis. This shifts the burden from prediction to post-hoc verification, which is both more practical and more honest about the limits of static reasoning.

4. **Open-source implementation:** ATM's broker (1,932 LOC), SDK contract, JS/Python adapters, and CID verification tools are fully implemented and validated on real-world workflows (npc-brain, 37 atomization tasks, zero admission errors).

**Why this matters.** File-level coordination (STORM) rejects safe same-file parallelism; workflow-level coordination (SCF) requires O(n²) intent graphs with 72% false positives. Tier 2 offers a middle path: function-granularity parallelism without semantic overreach.

**Invitation to the community.** The SDK is open-source and extensible. Language communities are invited to implement their own `AtomizationPlanningAdapter` — whether via regex, LSP, compiler APIs, or custom heuristics. The framework imposes no polling consensus; each adapter can improve independently.

**Limitations and next steps.** This paper validates the *mechanism* (definitions, algorithms, SDK contracts) and provides preliminary evidence of correctness. Full comparative evaluation (ATM vs STORM vs CodeCRDT on large-scale corpus) and Adaptive Granularity Refinement implementation details are deferred to a forthcoming full paper (December 2026).

---

## References（參考文獻）

> **[骨架待完成]** 主要參考文獻：
>
> 1. Pugachev, S. (2025). CodeCRDT: Observation-Driven Coordination for Multi-Agent LLM Code Generation. arXiv:2510.18893.
> 2. Acharya, V. (2026). Semantic Consensus: Process-Aware Conflict Detection and Resolution for Enterprise Multi-Agent LLM Systems. arXiv:2604.16339.
> 3. Geng, X. & Neubig, G. (2026). Multi-agent Collaboration with State Management. arXiv:2605.20563.
> 4. Qian, K., Fang, X., & Li, Z. (2026). MPAC: A Multi-Principal Agent Coordination Protocol for Interoperable Multi-Agent Collaboration. arXiv:2604.09744.
> 5. Costa, I. (2026). AgentSpawn: Adaptive Multi-Agent Collaboration Through Dynamic Spawning for Long-Horizon Code Generation. arXiv:2602.07072.
> 6. Zhou, W. et al. (2026). ATCC: Adaptive Concurrency Control for Unforeseen Agentic Transactions. arXiv:2603.13906.
> 7. Pan, M. Z. et al. (2025). Why do multiagent systems fail? ICLR 2025 Workshop.
> 8. Anonymous (2026). AWCP: A Workspace Delegation Protocol. arXiv:2602.20493.
> 9. Anonymous (2026). Coordination as an Architectural Layer for LLM-Based Multi-Agent Systems. arXiv:2605.03310.
> 10. Sartori, C.C. (2026). The Specification Gap: Coordination Failure Under Partial Knowledge in Code Agents. arXiv:2603.24284.
> 11. Ellis, C.A. & Gibbs, S.J. (1989). Concurrency control in groupware systems. SIGMOD '89.
> 12. Shapiro, M., Preguiça, N., Baquero, C., & Zawirski, M. (2011). Conflict-free Replicated Data Types. SSS 2011.
> 13. Kung, H.T. & Robinson, J.T. (1981). On optimistic methods for concurrency control. ACM TODS 6(2).

---

---

## Revision History

**2026-06-16 (Current Draft):**
- **§3.0**: added 🔹 "Proposed (Design)" status tier for roadmap items with no implementation or benchmark coverage
- **§3.7**: added operational-layer note on MAO Route Context state machine (`open→admitted→frozen→waiting→blocked→ready-to-apply→closed/abandoned`) and `freeze.ts`/`patch-envelope.ts`/`conflict-matrix.ts` (TASK-MAO-0006~0009, shipped 2026-06-14); referenced proposed Team Agents Wave Mode (TASK-MAO-0023~0034)
- **§3.8**: added "Batch admission and evidence attribution (design)" paragraph on per-task evidence slicing under Wave Mode
- **New §3.10**: Format Adapters and `ConflictKey` (Definition 5, Theorem 3 — proposed generalization of Theorem 1 to non-code structured artifacts, TASK-CID-0091~0098, design only)
- **New §2.8**: Related Work — OT / CRDTs / database concurrency control, positioning Definition 5 relative to classical OCC
- **New §6.4**: self-referential dogfood note — ATM's own Format Adapter implementation planned via Team Agents Wave Mode (TASK-MAO-0033)
- **§1.3**: added contribution #6 (generalization beyond code, design-stage)
- **References**: added Ellis & Gibbs (1989), Shapiro et al. (2011), Kung & Robinson (1981)

**2026-06-12 (Current Draft):**
- **Upgrade §3 status markers**: AGR Layer 1/2, Augmented Decision Rule, `canon_sym` policy, mid-execution registration all moved from 🔷 Proposed → ✅ Implemented after AAF delivered TASK-CID-0028~0037 (commits `f841a27c`, `aa907d04`, `16533023`, `9d214ad9`, `5bea4e31`, `e62eee72`)
- **§4 rewrite**: 3 canonical scenarios → **12-scenario AGR benchmark harness** (CID-0037); coverage statement mapping each Theorem/Algorithm to its validating scenario
- **§5 削減**: AGR Layer 2 and Augmented Decision Rule no longer in roadmap (delivered); only comparative benchmarks + cross-language identity remain
- **§3.0 legend**: removed standalone "🔷 Proposed" tier; only ✅ Implemented, 🔶 Prototype, and §3.9 Open Problems remain
- Abstract updated with new evidence (12 scenarios + TASK-CID-0028~0037)

**2026-06-11 (Previous Draft):**
- Complete rewrite of §3 (Definitions 1–4, Theorems 1–2, AGR Algorithms 1–2, Soundness with A1′/A2)
- Rewrite §4–5 as "Preliminary Evidence from Implementation" (3 canonical scenarios, npc-brain data, CID hardening verification)
- Rewrite §6 (Discussion: why adapter-guided, failure modes, open problems, future work)
- Rewrite §7 (Conclusion: tier-2 is the sweet spot, adapter-guided + governance, open-source validation)
- Status markers: ✅ Implemented, 🔶 Prototype, 🔷 Proposed
- Open problems explicitly listed: cross-language symbol identity (A3), CID schema migration (§3.9), cross-model validation (one-liner in Future Work, B5)

**Next steps:**
- Translate to English (target: 250-word Abstract, 1.5-page Intro, 2-page Related Work, 3-page §3, 1-page Evidence, 1-page Discussion)
- Convert to LaTeX + arXiv template
- Add figures: granularity tier diagram, broker decision flowchart, npc-brain timeline
- Target arXiv upload: late June 2026
- Full comparative evaluation (STORM/CodeCRDT/SCF) deferred to full paper (December 2026)
