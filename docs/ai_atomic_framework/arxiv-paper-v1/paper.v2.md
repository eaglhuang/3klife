# 採用器導向原子化：多代理 LLM 程式碼合成的並發治理框架
## Adapter-Guided Atomization: A Concurrency Governance Framework for Multi-Agent LLM Code Synthesis

**作者：** Eaglhuang
**Affiliation:** Independent Research
**Date:** 2026-06-22
**Status:** Draft v2 (restructured outline, 12–14 pages target)
**Repo:** https://github.com/eaglhuang/AI-Atomic-Framework

---

## Abstract（摘要）

多代理大型語言模型（LLM）程式碼合成面臨一個 *寫入前* 的治理缺口：現有工作多處理 task decomposition、role orchestration、post-generation verification 或 production optimization，卻缺少一個 shared-repo 場景下、決定「此刻誰可寫、寫哪段 region、由誰中立寫入」的 admission layer。實證量化顯示此一缺口具規模：AgenticFlict 統計 142K+ AI agent PR 中有 **27.67%** 觸發合併衝突；既有方法或粒度太粗（CodeCRDT 接受 **5–10%** 語意衝突）、或精度不足（SCF 僅 **27.9%** precision、72% false-block）。

本文提出 **Adapter-Guided Atomization with CID Broker（ATM）**：以輕量 language adapter 提供函式級原子候選，由 broker 於 admission 階段執行 pre-write arbitration、bounded-region 重疊偵測、active-intent fail-closed gate，並交由 neutral steward 完成單次中立寫入；當衝突無法以更細粒度分流時，broker 進一步生成 owner-map split suggestion 進入 human-reviewable refinement loop。證據由三類資料支撐：12-scenario 確定性 fixture suite、npc-brain 三週外部採用（0 unrecovered admission error）、ATM 自身 multi-vendor self-hosting field evidence（POS2 跨 vendor 同檔 bounded-region 端到端合併、B-12 apply-phase enforcement、BLOCK split-suggestion archive）。

**主要貢獻**：(1) adapter-guided atomization + CID broker 之 admission-layer 框架；(2) bounded-region / active-intent / neutral steward 之 shared-write governance path；(3) 12-scenario deterministic fixture + field evidence stack；(4) blocked overlap 可導向 split-suggestion / reviewable refinement loop。

---

## 1. Introduction（引言）

### 1.1 Motivation

多代理 LLM 程式碼合成的真正瓶頸並非單一 agent 能否寫出可編譯之程式碼，而是**多個 agent 同時對共享 repository 寫入時如何治理**。AgenticFlict [Ogenrwot & Businge, 2026, arXiv:2604.03551] 對 GitHub 上 59K+ 倉庫之 142K+ AI agent pull request 進行 deterministic merge 模擬，**27.67%** 觸發合併衝突、共產生 336K+ 細粒度衝突區段。此一缺口已從 anecdotal 升級為文獻量化證據。

既有方法大致沿三條路徑回應上述問題：字元級 merge（CodeCRDT 與後續 Git-versioning 變體）解決物理收斂但放棄語意；檔案級 orchestration（STORM、CAID）以整檔粒度做 admission，卻無法區分同檔不同函式之獨立性；工作流／post-gen verification（SCF、DebateCoder、Multi-Agent Code Verification）在意圖層或寫入後做仲裁，承擔 O(n²) 複雜度與高 false-positive。**admission-time、bounded-region、preventive** 的治理層次目前仍為空缺，而 AgenticFlict 之 27.67% 正落於此一空缺。

### 1.2 The False Choice We Reject

社群常將協調機制呈現為「CRDT 太粗 vs AST 太重」之二擇一：Tier 1 字元級 merge 廉價但放棄語意、Tier 3/4 檔案／工作流級協調又進場太晚（衝突已寫入再仲裁）、universal AST-first 方案則要求每一語言整合 production 級靜態分析引擎而不可行。本文採第三條路：**adapter-guided atomization + broker admission**——讓各語言以自身最便宜的偵測策略（regex、scanner、compiler API、LSP）回報函式級原子候選，broker 於 admission 階段以原子 ID、契約指紋、共享表面、檔案重疊四維度做 O(n log n) 確定性裁決，將語意正確性責任後段外包予 validator。此一切分避免了「萬能 AST」假設，亦避免了「事後修補」之代價。

### 1.3 Contributions

1. **Admission-layer framework**：形式化 adapter-guided atomization + CID broker，為 multi-agent shared-repo 場景補上 pre-write admission 層次。
2. **Shared-write governance path**：提出 bounded-region admission、active-intent fail-closed gate、neutral steward 中立寫入之治理鏈，並以三筆真實 cross-vendor 案例驗證。
3. **Deterministic fixture + field evidence stack**：12-scenario 確定性 fixture suite + npc-brain 三週外部採用 + ATM self-hosting forensics 三層證據。
4. **Refinement loop on blocked overlap**：當衝突無法更細粒度分流時，broker 生成 owner-map split suggestion 並提升為 curator patch draft 進入 human-reviewable approval queue。

### 1.4 Paper Organization

§2 將 ATM 與既有粒度階層並置；§3 形式化 atom、CID、admission pipeline；§4 報告 12-scenario fixture、自我與外部採用、以及同檔 field outcomes；§5 列尚未完成之 evaluation gaps；§6 為設計決策之 interpretation；§7 結論。Appendix A 提供 evidence artifact map、實作 commit provenance 與 CID schema 遷移候選路徑。

---

## 2. Related Work（相關工作）

我們將既有工作沿粒度／層次階層並置，每個系統最多兩句，明示其所在 tier、是否 preventive、以及是否具 admission-time gate。

### 2.1 Tier 1: Character-Level Concurrency

**CodeCRDT** [Pugachev 2025, arXiv:2510.18893] 以無衝突複製資料型別於字元層級達 100% 物理收斂，但接受 5–10% 語意衝突（高耦合任務達 80%）；屬 preventive 但缺語意 admission。**EvoGit / AgentGit** 採 Git versioning 規避字元級盲區，仍受檔案級合併粒度限制；屬 low-level merge substrate，並非 ATM 之競品。

### 2.2 Tier 3: File-Level Orchestration

**STORM** [Liu et al. 2026, arXiv:2603.21489] 於寫入時驗證代理觀察到之檔案版本，以整檔為單位拒絕陳舊寫入；具寫入時 gate 但無法區分同檔內不同函式。**CAID** [Geng & Neubig 2026, arXiv:2603.21489] 以隔離 workspace + 事後 git merge 處理，admission 行為被 merge 階段所取代；屬 advisory 而非寫入前 preventive。

### 2.3 Tier 4: Workflow Governance

**SCF / Specification Gap** [Sartori 2026, arXiv:2603.24284] 以意圖圖達 100% 完成但 precision 僅 27.9%；屬 advisory，缺 admission-time shared-write gate。**MPAC** [Qian et al. 2026, arXiv:2604.09744] 與 **ATCC** [Zhou et al. 2026, arXiv:2603.13906] 分別於應用協定層與資料庫層做自適應並發控制，目標為 workflow / transaction 而非程式碼 region。

### 2.4 Tier 2 Close Peers and Adjacent 2025–2026 Systems

Tier 2 內近期工作呈現分層分工：

| System | Layer | Preventive vs Advisory | Admission-time Gate | Shared-file bounded region | Neutral serialization |
|---|---|---|---|---|---|
| CoAgent [arXiv:2606.15376] | Tier 2 (advisory) | Advisory | 無（post-launch 通報） | Speculative + saga | MTPO order-filter |
| MACOG [arXiv:2510.03902] | Orchestration | Advisory | 無 | 無 | State-machine handoff |
| ProjectGen + SSAT [arXiv:2511.03404] | Architecture | Preventive | 計畫級驗證 | 無 | 靜態 plan check |
| DebateCoder [arXiv:2601.21469] | Verification | Advisory | 無（post-gen） | 驗證層 | Debate consensus |
| Multi-Agent Code Verification [arXiv:2511.16708] | Verification | Advisory | 無（post-gen） | 驗證層 | Voting |
| Singh intent-driven [arXiv:2601.11687] | Optimization | N/A | 無 | 無 | N/A |
| **ATM（本文）** | **Tier 2 (preventive)** | **Preventive** | **七層硬閘門（admission-time）** | **CID-bound region + format adapter** | **Broker verdict + neutral steward** |

**CoAgent** 與 ATM 同為 Tier 2 但屬 advisory / reactive：MTPO 於批次啟動時固定序列、寫入採投機 apply + saga 回滾。兩者非競品而是互補——ATM 站 admission、CoAgent 可作為 SERIAL 路由後之 reactive repair。其餘四篇分屬 architecture / orchestration / verification / optimization 層次，與 ATM 之 admission layer 並不重疊（§6.4 將明示此一分工）。

### 2.5 Adjacent Foundations

並發控制之基礎工作——**OT** [Ellis & Gibbs 1989]、**CRDT** [Shapiro et al. 2011]、**2PL / OCC** [Kung & Robinson 1981]——提供 read/write set disjointness 之思想來源；workspace 協定如 **AWCP** [arXiv:2602.20493]、**SEMAP**、formal trace 工作如 **TraceFix** [arXiv:2605.07935] 為 transport / diagnosis 層之補位。ATM 之 ConflictKey（Definition 5）將 OCC 之 disjointness 重述為 format-agnostic 詞彙，於單一 broker 下涵蓋程式碼原子、JSON 紀錄與純量欄位——其統一應用為新貢獻，個別構件無新主張。

---

## 3. The Framework: Adapter-Guided Atomization + CID Broker（架構與形式化）

成熟度標記：✅ shipped、🔶 prototype、🔷 planned；本節討論之機制除明示者外皆為 ✅。

### 3.1 Architecture Overview

ATM 採三層 + substrate 架構：

| 層次 | 責任 | 介面 |
|---|---|---|
| **Language Adapter** | 候選發現、符號正規化 | 程式碼 → AtomCandidate[] |
| **AI Agent** | Patch 生成、意圖宣告 | Candidates → WriteIntent |
| **ATM Broker** | Admission、衝突仲裁 | WriteIntent → verdict |
| **Substrate** | 持久化寫入（Git / CRDT） | Neutral steward 為唯一序列化點 |

Broker 為 *governance layer* 而非生成器：adapter 回報原子 metadata、agent 產生補丁並宣告讀寫依賴、broker 消費此等宣告做 admission 決策、語意正確性留給 post-write validator 階段。

### 3.2 Atoms and CID

**Definition 1 (Atom).** $a = \langle \mathit{id}, \mathit{name}, \mathit{ver}, P, \sigma, \psi, \tau, H \rangle$，其中 $P \subseteq \mathrm{FilePath} \times (\mathrm{LineRange} \cup \{\bot\})$（$\bot$ 表整檔，LineRange 表子區段，統一 registry 原子與虛擬原子）、$\sigma = (\Sigma_{\mathrm{in}}, \Sigma_{\mathrm{out}})$ 為 I/O schema、$\psi$ 為 status、$\tau$ 為 tier、$H = (h_{\mathrm{spec}}, h_{\mathrm{code}}, h_{\mathrm{test}})$ 為 hashLock。

**Definition 2 (Atom Map).** $M = \langle \mathit{id}, V, E, R \rangle$，$V$ 為成員 atom、$E$ 為帶 kind 邊（data-flow / control-flow / event-flow / validation / fallback / side-effect / rollback）、$R \neq \emptyset$ 為 entrypoint。

**Symbol canonicalization**：每個 adapter 提供確定性函式 $\mathrm{canon\_sym}: \mathrm{RawSymbol} \to \mathrm{CanonicalSymbol}$，統一 namespace、alias、可靜態偵測之 decorator 至單一穩定符號。

**Definition 3 (Candidate CID).** 寫前 metadata 指紋，不包含 patch 內容或行範圍：
$$\mathrm{CID}_{\mathrm{candidate}}(c) := \mathrm{SHA\text{-}256}(\mathrm{canonicalJSON}(\{\mathtt{schema}, \mathtt{kind}, \mathtt{symbol}, \mathtt{paths}, \mathtt{method}\}))$$

**Definition 4 (Capsule CID).** 驗證後之 content-addressed 識別子：
$$\mathrm{CID}_{\mathrm{capsule}}(B) := \texttt{"atom:cid:"} \mathbin{\|} \mathrm{base64url}(\mathrm{SHA\text{-}256}(\mathrm{brotli}(\mathrm{JSON}(B))))$$

| Stage | CID | 粒度 | 定址 |
|---|---|---|---|
| Broker admission（寫前） | Candidate | symbol-level | metadata |
| Atom export（驗證後） | Capsule | complete bundle | content |

讀者於本節後應能理解「same owner」、「same CID」、「disjoint region」之含義及其於 admission 決策中之角色。

### 3.3 Admission Pipeline

**問題.** 新寫入請求進來時，ATM 如何決定 `allow / compose / block / re-arbitrate`？

**Stage 1 — Comparison.** Broker 消費 `WriteIntent`（含 `atomRefs`、`targetFiles`、`sharedSurfaces`、`readAtoms`）。對每組並行意圖 $(I, I')$ 計算四維度重疊：(i) Candidate CID 相同且寫衝突；(ii) 同檔、CID 相異之寫；(iii) shared surface（generator / projection / registry / validator / artifact）相交；(iv) read/write 依賴。

**Stage 2 — Verdict（Algorithm 1）.**
$$\mathit{verdict}(I, I') \in \begin{cases}
\texttt{parallel-safe} & \text{無維度衝突} \\
\texttt{blocked-cid-conflict} & \text{CID 寫衝突} \\
\texttt{blocked-shared-surface} & \text{表面衝突} \\
\texttt{needs-physical-split} & \text{同檔 CID 相異；交予 deterministic composer}
\end{cases}$$

**Augmented Dependency Rule.** 若 $\mathit{readAtoms}(I) \cap \mathit{writeAtoms}(I') \neq \emptyset$，強制 $\texttt{SERIAL}(I, I')$；順序由 broker 之 Lamport 邏輯計數器決定。

**Stage 3 — Adaptive Granularity Refinement (AGR).** 當 `blocked-cid-conflict` 因 symbol-level 原子重疊而起：

- **Layer 1（句法封閉）**：adapter 回報該區段最小語法單位（function / var / statement / class method），為每個虛擬原子重算 CID 並重新評估；通過則停止。
- **Layer 2（簽名保留分解）**：若 Layer 1 後仍衝突且衝突集中（count / density 達閾值），將衝突函式 $f$ 分解為 $f_{\mathrm{pre}} \cdot f_{\mathrm{extracted}} \cdot f_{\mathrm{post}}$，簽名不變；重新評估；仍衝突則序列化。

**Stage 4 — Route.** `parallel-safe` 直接並行；`needs-physical-split` 交 deterministic-composer 合成；序列化路由送 neutral steward（§3.4）。

> **Theorem 1 (Cross-Regime Disjointness).** 若兩候選 $c, c'$ 分屬不同 adapter $\mathcal{A} \neq \mathcal{A}'$ 且目錄分離 $D_{\mathcal{A}} \cap D_{\mathcal{A}'} = \emptyset$，則 $\mathrm{sourcePaths}(c) \cap \mathrm{sourcePaths}(c') = \emptyset$，broker 回傳 `parallel-safe`。

> **Theorem 2 (Static Admission Closure).** 在 (A1′) adapter 之 `discoverAtomCandidates` 於 `canon_sym` 下抽取所有可靜態判定之 effect、(A2) dynamic 特性（reflection / eval / dynamic import）不納入 之假設下，`parallel-safe` verdict 保證並行補丁於靜態可決定部分無寫衝突。動態效應引發之衝突由 post-write validator 捕捉。

### 3.4 Broker as Sole Serializer

Broker 為唯一序列化點。Agent 從不直接寫 registry，皆透過 broker 提交 `WriteIntent`；broker 原子性讀寫 registry 並作為唯一寫入者。此原則延伸至 mid-execution registration：若 Agent A 已註冊並執行 $I_A$ 涉及原子 $a$，Agent B 隨後提交 $I_B$ 同樣涉及 $a$，broker 於 *註冊階段*（非寫入階段）偵測 $a$ 之佔用並依 §3.3 路由。

實際 filesystem 寫入由單一 **neutral writer steward**（`steward.ts`）執行：admitted plan 交該 steward 收口，避免並行寫入同目標。Freeze / patch-envelope / conflict-matrix 強化此約束——凍結之 intent 之 patch envelope 與 snapshot 分離持久化、arbitration 以同一 admission 演算法重放（非 ad-hoc retry）。Wave Mode 以批次方式對相關任務卡進行 admission，broker admission 與 coordinator-only commit 仍為唯一序列化點。

### 3.5 Format-Agnostic Generalization

ATM 之 admission 演算法（§3.3）以程式碼原子陳述，但 broker core 之決策邏輯參數化於抽象 conflict key，未綁定 code-atom CID。藉由 `FileMutationAdapter` 介面（`supports / parse / normalize / getConflictKeys / canMerge / merge / serialize / validate`），同一 broker 可治理 JSON 紀錄、文字範圍、數值欄位、atom-map shard 等結構化產物。

**Definition 5 (ConflictKey).** 一個 conflict key 為 pair $(\mathit{scope}, \mathit{locator})$，$\mathit{scope} \in \{\mathsf{file}, \mathsf{record}, \mathsf{range}, \mathsf{line}, \mathsf{scalar}, \mathsf{semantic}\}$，$\mathit{locator}$ 識別該 scope 內之衝突單元。

> **Theorem 3 (ConflictKey Disjointness).** 若兩 mutation 於同檔產生 $K(m) \cap K(m') = \emptyset$ 且 format adapter 之 `canMerge` 成立，則 broker 可將二者 admit 為 `parallel-safe`（routed through merge），將 Theorem 1 之檔案重疊論證推廣至任意結構化產物。

已交付 4 個 format adapter：`json-record`、`text-range`、`numeric-scalar`、`atom-map`（皆 ✅）。

### 3.6 Scope and Open Problems

本框架不保證下列事項：

1. **跨語言原子身份**：兩原子分屬不同語言時 Definition 3 之 per-adapter `canon_sym` 賦予無關 CID；Theorem 1 保證不碰撞但無法識別其邏輯關聯。
2. **Admission-time active-intent forwarding**：跨 owner-map 邊界之 atom-level claim 推導於 proposal-admission 階段仍不完整；同 owner-map 同檔 bounded-region 已可。
3. **Liveness / fairness**：未正式化跨 intent 類別之公平性；持續高優先序流可能餓死低優先序。
4. **CID schema migration / adapter trust**：CID 公式升級時 legacy CID 與新版無法被同一公式識別；broker 目前假設 adapter 誠實回報 `canon_sym` 與 `getConflictKeys`，惡意 adapter 之防護未納入此版。

（此節僅列現狀不保證之事項；推進路徑見 §6.3。）

---

## 4. Validation: Fixture Suite, Adoption Study, and Field Outcomes

本節提供四層證據——**deterministic（§4.1）→ internal real（§4.2）→ external real（§4.3）→ targeted field outcomes（§4.4）→ orchestration extension（§4.5）**。我們明示區分本節與 *comparative concurrency benchmark*：§4.1 驗證 broker decision table 對宣告 expected verdict 之相符性、§4.2 回報 ATM 框架自身之異常與恢復、§4.3 呈現外部採用之實際資料。對 STORM / CodeCRDT / CoAgent baseline 之 wall-clock / throughput 比較延至 December full paper（§5）。

### 4.1 12-Scenario Fixture Suite

Primary controlled evidence anchor（commit `e62eee72`，CID-0037）。Suite 含 12 個確定性 JSON fixture，覆蓋 broker decision algorithm（§3.3）、augmented dependency rule、Theorem 2 static admission closure、AGR Layer 1 / Layer 2：

| # | Scenario | Validates | Expected |
|---|---|---|---|
| 01 | compose-disjoint-same-file | Same-file CID-disjoint composition | `parallel-safe` |
| 02 | compose-same-atom-cid-blocked | Write/write conflict | `blocked-cid-conflict` |
| 03 | compose-same-atom-cid-unresolvable | Layer 2 threshold not met | `steward-takeover` |
| 04 | compose-overlapping-hunks | Hunk-overlap detection | `blocked-cid-conflict` |
| 05 | registry-cid-disjoint-file-overlap | Theorem 1 within-regime | `needs-physical-split` |
| 06 | registry-shared-surface-blocked | Shared-surface overlap | `blocked-shared-surface` |
| 07 | registry-read-write-dependency | Augmented Decision Rule | `SERIAL` |
| 08 | registry-parallel-safe-clean | Negative control | `parallel-safe` |
| 09 | compose-shared-validator-surface | Validator artifact collision | `blocked-shared-surface` |
| 10 | validator-catch-typecheck-failure | (A2): validators catch broker miss | `parallel-safe` + validator FAIL |
| 11 | layer1-no-refinement-available | AGR Layer 1 fallback absent | original verdict |
| 12 | layer2-threshold-not-met | AGR Layer 2 threshold | `steward-takeover` |

12/12 通過。此 suite **並未**建立：(i) adversarial concurrent load 行為；(ii) 相對於 baseline 之 throughput；(iii) 統計信賴區間——三者延至 December full paper。

### 4.2 Self-Hosting Forensics

ATM 框架自身之治理於 2026-06-11~13 執行 TASK-CID-0040~0045 期間演練了 §3.4 之 broker 與 §3.7 freeze / patch-envelope / conflict-matrix。下列三件為代表性事件：

| Incident | Mechanism exercised | Outcome |
|---|---|---|
| TASK-CID-0040 claim-displaced-by-import | 並行 claim collision；import 嘗試覆寫 in-progress claim | 由 event ledger 偵測；repair commit `a6f01658` |
| TASK-CID-0041 cid-shared collision（首次 broker freeze trigger） | 兩 intent 同時 claim 同一 atom CID；broker 發出 `verdict: freeze` | Freeze 協定將 loser 路由至 wait；arbitration 重放成功——§3.4 stack 之首次端到端演練 |
| TASK-CID-0043~0045 plan-mirror sync 失敗 | 「source committed」+「planning done」≠「governed close」；雙側發散 | Repair commit 補填 closure packet；驅動 TASK-CID-0061 凍結 `tasks.ts` caller contract |

§3.4 之 broker freeze stack 並非抽象設計，而是 TASK-CID-0040~0042 之 motivating incident 所驅動之 2026-06-12 加固交付。同時，**multi-vendor production co-development** 為自指證據之另一面：同 reporting window 內四個不同 vendor LLM（`claude-code-opus-4-7` / Anthropic、`cursor-composer-2.5` / Cursor、`antigravity-gemini-3.5-flash` / Google、`codex-captain-continuation` / OpenAI 體系）於 ATM admission control 下共同寫入 ATM 自身源碼。

### 4.3 npc-brain Adoption Study (External Real Evidence)

npc-brain（一個 NPC 行為系統）於 2026-05-19~06-07 三週期間外部採用 ATM：

| Metric | Value |
|---|---|
| Atomization task cards attempted | 37 |
| Out-of-scope proposals correctly rejected | 2 |
| Scope-lock contention bursts requiring recovery | 1（10 cards、~2h recovery） |
| Idempotency breaks in CLI runner loop | 1 |
| Post-write validator catches | 3 |
| **Unrecovered admission errors** | **0** |

誠實敘事**並非**「零衝突」而是「每次衝突與每次治理破口皆被捕捉並完成恢復」。10 卡 revert burst 暴露 ledger 模型未能 idempotent 處理 scope-lock contention path；恢復程序生效後 runner-loop 之 idempotency 缺口被加固。此為非受控部署資料（無 baseline），不主張 throughput——僅主張 *existence proof*：§3 機制能容納真實多代理工作流、能浮現真實衝突、能從衝突中恢復。

### 4.4 Real Same-File Admission Outcomes

本節為同檔共享寫入 field evidence anchor，三個 sub-case 每個只 1 段。

**(a) POS2 — Positive Keystone（✅ field-validated）.** Target file `packages/cli/src/commands/broker.ts`，actors 分屬 Codex（OpenAI）與 Claude（Anthropic）；POS2-A 修改 `broker.ts:841-878`，POS2-B 修改 `broker.ts:989-1142`。Broker 進場時做 bounded-region compare，確認語法層不重疊，標 `composer-routed`；產生 merge plan `merge-255c73707a528edc`，verdict `parallel-safe`、`applyMethod: patch-apply`；neutral steward apply 記錄 `verdict: applied`；`git diff --check` / typecheck / `validate:cli` 全部 pass。POS2 證明 ATM broker 不僅是「提早攔截」之 gate，而是能在同檔 cross-vendor 情境下，以 proposal-first admission 與 bounded-region rearbitration 將高風險共享寫入轉化為可治理、可合併、可驗證之協作流程。

**(b) B-12 + BLOCK — Negative Evidence（✅ field-validated）.** B-12（TASK-TEAM-0042 與 TASK-TEAM-0043，跨 vendor family）於 admission 階段兩邊皆判 `parallel-safe`，但於 apply-phase / active-intent arbitration 達成 fail-closed：TASK-TEAM-0043 先取得 broker registry 中之 active intent，隨後 TASK-TEAM-0042 嘗試推進時被擋下，無共享檔之 mutation 落於工作樹。BLOCK 為平行案例之 admission-time 端：broker 於 admission 階段標 `blocked-cid-conflict` + 生成 split suggestion（見 (c)）。兩者共同支撐 *admission-time 與 apply-time 雙端 fail-closed* 之主張——admission 漏掉之 case 由 apply-phase 補位，admission 抓到之 case 直接擋下。

**(c) Close-Orchestration / Refinement Loop — Prototype Edge（🔶 prototype）.** `close-orchestration.ts` 同檔不同函式之 admission 經 §3.3 路由至 deterministic composer 端到端通過為正面 prototype；當兩 patch 之 bounded atom 區段重疊、broker 標 `blocked-cid-conflict` 時，系統分析該 owner map 粗粒度結構生成 split suggestion，提升為 curator patch draft 進入人類審查 approval queue。此鏈條為新主張：**broker 不僅為衝突閘門，已開始扮演 atom-map 結構演進之治理核心**。(c) 仍為 prototype / dogfood-backed；升級為 generally-live workflow 列為 §6.3 future work。詳細 run artifact 路徑見 Appendix A.1。

### 4.5 Wave Mode and CID Stability

**Wave Mode**（commit `194f44cbd`，MAO-0030~0034）：planWaves → admitWave → createTeamWaveEnvelope → worker reports → sliceWaveEvidence → checkpointWave；5 scenario 確定性通過——safe-wave / unsafe-wave-same-deliverable / mixed-wave-dependency / per-task slicing / needs-review gating——對應 §3.4 batch admission 與 per-task evidence attribution。Orchestration extension，非主貢獻 anchor。

**CID Stability**（commit `13b17ffc`）：Capsule CID 公式（fixed-field JSON + brotli + SHA-256 + base64url）；registry 104 atom→CID 映射通過 `atom-capsule.test.ts`，0 unexpected collision、內容變動 CID 失配、篡改偵測通過。

---

## 5. Limitations and Roadmap

本論文驗證了機制（定義、演算法、SDK contract）並提供初步正確性證據；下列項目超出本篇幅，列入 December full paper（ICSE / FSE 投稿）或未來工作：

1. **與 CoAgent / STORM / SCF 之 comparative concurrency benchmark**——規劃於 AgenticFlict（142K agent PR、27.67% conflict rate、336K+ conflict region）之上重放 ATM broker 並量化 catch rate / token overhead，直接對照 baseline。
2. **多語料庫統計評估與信賴區間**——npc-brain 三週為單一語族；建立具 CI 之 throughput 主張需擴大至 10× 規模與跨語族驗證。
3. **跨語言原子身份（A3）**——§3.6 open problem；當跨語言邏輯等價物宣稱實作同一契約時，broker 尚無法追蹤。預計擴充 manifest 支援 cross-regime alias。
4. **CID schema 版本控制與遷移**——Candidate CID 公式變動時避免與 active intent 碰撞；雙重計算 / flag-day / 版本化 CID 三條候選見 Appendix A.3。
5. **Liveness 證明**——形式化 broker 對 active-intent 之 fail-closed guarantee 與 steward apply 之原子性。

---

## 6. Discussion

### 6.1 Why Adapter-Guided, Not AST-First?

**工程成本**：建構 production 級 AST analyzer 於每一語言皆非微小工作——Python `ast` 無法解析 metaclass、TypeScript compiler API 整合需 500+ LOC、Go parser 引入即增加 runtime dependency。十餘種持續演化中之語言之「統一 AST + unified IR」並不可行。

**邊際遞減**：輕量偵測 adapter 已於 §4.3 採用研究中通過、function 粒度未觀察到 false rejection；於每一語言補上完整靜態分析之邊際成本甚高，而 static / dynamic 切分（§3.3, A2）將剩餘風險路由予 validator，無須強求 adapter 一併承擔。

**範圍保留**：ATM 之核心角色為 *admission* 而非 *analysis*。藉由偵測委派 adapter、語意驗證委派 validator，ATM 始終保持為治理框架而非語言理解框架。

### 6.2 When Adapter-Guided Fails

1. **Metaprogramming 密集程式碼**（Python metaclass、Ruby `method_missing`、JS Proxy）：adapter 可發出候選符號但實際執行可能有別。緩解：evidence validator 捕捉差異。
2. **循環相依或自指原子**：若 A 寫 X（import B）、B 寫 Y（import X）、二者皆 `parallel-safe`，scope-lock 無法阻擋。緩解：相依圖 validator 捕捉 import cycle。
3. **Adapter 版本失配**：`canon_sym` 升級可致同符號產生不同 CID。緩解：broker 於單一 admission cycle 強制單一 adapter 版本。
4. **Admission 漏失需 human review**：B-12 已示範 apply-phase 補位；極端 case 需 split-suggestion 進入 curator queue。

### 6.3 Open Questions and Future Work

§3.6 列出之四個 scope boundary 對應之推進路徑：

- **跨語言原子身份**：擴充 manifest 支援 cross-regime alias；以 alias validator gateway 在 admission 階段交叉檢查。
- **CID schema 版本控制**：雙重計算窗口 vs Flag-Day quiesce vs 版本化 CID 三條路徑之 trade-off 見 Appendix A.3；當前傾向 Flag-Day（協調成本受限於已知使用方數量）。
- **Admission-time active-intent forwarding**：將 §4.4(b) B-12 apply-phase enforcement 推前至 admission 階段；需重新設計 team-start 與 active-intent registry 之交互。
- **Liveness proof 與 fail-closed guarantee 模型化**：以 dependent types / TLA+ 為候選工具。

**Broker as Governance Core——現狀與待提升**：
- 已交付：(1) 跨 vendor 同 owner-map 同檔 bounded-region 端到端合併（§4.4(a) POS2）；(2) blocked → split-suggestion → human-reviewable refinement 之 prototype + dogfood（§4.4(c)）。
- 待提升：(1) refinement chain 由 prototype 升為 generally-live workflow；(2) 跨 owner-map 邊界之 atom-level claim 推導；(3) 跨 vendor 第二模型 verifier（weighted AGREE / DISAGREE / ABSTAIN voting）作為刻意冗餘審查機制。

**MAO Operations Layer**：MAO-0001~0003 / 0007~0010 / 0030~0034 / 0039~0042 / 0050~0052 已交付；剩餘集中於 runner Broker（MAO-0011~0016）與 distributed consensus 模擬。MAO 為使單一 worktree 多 agent 並行成為可能之操作層補完，非另一套並發控制機制。

### 6.4 ATM 於 2025–2026 multi-agent SE landscape 中的 admission-layer 定位

2025 下半至 2026 上半之 multi-agent SE 研究呈現分層分工：

- **Architecture layer（任務分解）**：ProjectGen + SSAT 將專案拆為 module / file / function 樹；關注於新專案 *結構決定*，未涉同一 repository 之並發寫入治理。
- **Orchestration layer（角色編排）**：MACOG 以 state-machine 驅動 Architect → Engineer → Reviewer；admission 決策由 transition 而非 region-level 仲裁所決定。
- **Verification layer（產後驗證）**：DebateCoder 與 Multi-Agent Code Verification 以多 agent 辯論 / 投票對 *已生成* 程式碼驗證；屬產後迴路，與寫入前 admission 不重疊。
- **Optimization layer（部署效能）**：Singh intent-driven 以 semantic caching + prompt assembly 降低 token 與延遲；屬效能優化層，與並發治理正交。
- **Admission layer（寫入前仲裁）——ATM 之定位**：上述四層皆未處理「同一 repository、同一檔案、同一函式族、同一時間窗口由多 agent 共同寫入」之 *寫入前* 仲裁。ATM 補上此一缺口：adapter 提供 atomization、broker 於 admission 執行 pre-write arbitration / bounded-region 偵測 / active-intent fail-closed gate、neutral steward 單次中立寫入；衝突無法細分時生成 owner-map split suggestion 進入 human-reviewable refinement loop。

**現有工作大多處理 task decomposition、role orchestration、post-gen verification 或 production optimization；本論文補上的是 repository shared-write setting 下之 pre-write arbitration / bounded-region admission / active-intent fail-closed / neutral steward / split-suggestion governance loop**。五層可疊加形成完整 SE multi-agent 鏈條：ProjectGen 規劃 → MACOG 編排 → **ATM 守門** → DebateCoder / Multi-Agent Code Verify 事後驗證 → Singh 部署優化。ATM 並非與上述方向競爭，而是與其形成正交可疊加層次。

---

## 7. Conclusion

多代理 LLM 系統需要一個契合 AI Agent 自然生成程式碼之粒度——函式與模組層級——之並發治理層。本論文主張 Tier 2 admission layer 為當前 multi-agent SE landscape 所缺，並示範如何於不依賴 universal AST 引擎之前提下實作之。

**四項貢獻**（與 Abstract / §1.3 一致）：

1. **Admission-layer framework**：adapter-guided atomization + CID broker，於形式化（Definitions 1–4、Theorems 1–3、Algorithms 1–2）下提供寫入前治理。
2. **Shared-write governance path**：bounded-region admission + active-intent fail-closed gate + neutral steward 之治理鏈，以三筆 cross-vendor 真實案例驗證。
3. **Deterministic fixture + field evidence stack**：12-scenario fixture（§4.1）+ npc-brain 三週外部採用 0 unrecovered error（§4.3）+ POS2 / B-12 / BLOCK / refinement-loop（§4.4）。
4. **Refinement loop on blocked overlap**：blocked 不只是拒絕——broker 進一步生成 owner-map split suggestion 與 curator patch draft，進入 human-reviewable approval queue。

**意義**：檔案層級協調拒絕安全之同檔並行、工作流層級協調須建構 O(n²) intent graph 並承擔 72% false positive；ATM 補上的正是 **admission layer**——repository shared-write 場景下之寫入前仲裁、bounded-region 重疊偵測、active-intent fail-closed gate、中立寫入、與人工審核迴路。

**開源邀請**：SDK 為開源且可擴展（Apache 2.0）。我們邀請各語言社群實作自己之 `AtomizationPlanningAdapter`——無論採 regex、LSP、compiler API 或自訂 heuristics；本框架不要求 polling consensus，各 adapter 可獨立演進。

---

## Appendix A. Artifact and Implementation Notes

### A.1 Evidence Artifact Map

| Evidence Family | §Ref | Archive Path | Authoritative README / JSON | Notes |
|---|---|---|---|---|
| POS2 cross-vendor bounded-region merge | §4.4(a) | `docs/ai_atomic_framework/broker-collision-evidence/runs/POS2-same-owner-bounded-2026-06-22/` | `team-68e022e8dc82.json`、`team-179057e64770.json`、`bench-paper-hotfile-pos2-merge-plan.json`、`bench-paper-hotfile-pos2-steward-evidence.json` | ✅ keystone；merge plan `merge-255c73707a528edc`；steward `verdict: applied` |
| B-12 apply-phase fail-closed | §4.4(b) | `docs/ai_atomic_framework/broker-collision-evidence/runs/B-12-field-2026-06-20/` | `team-4a7221ebbb23.json`（TASK-TEAM-0042）、`team-cd46fbcc7ad3.json`（TASK-TEAM-0043）、`b12-0042-merge-plan.json`、`write-broker.registry.snapshot.json` | ✅ runtime active-intent arbitration；cross-vendor family |
| BLOCK same-owner overlap split-suggestion | §4.4(b)/(c) | `docs/ai_atomic_framework/broker-collision-evidence/runs/BLOCK-same-owner-overlap-2026-06-22/` | `split-suggestion-review-approved-queue.json`、`map-curator.patch.same-owner-blocked-suggestion.approve.json`、`split-suggestion-review-chain-zh.md` | 🔶 prototype；curator patch draft；validator-gated approval |
| Close-orchestration admission positive | §4.4(c) | `docs/ai_atomic_framework/broker-collision-evidence/runs/close-orch-positive-layered-2026-06-21/` | `team-runs/` 頂層 JSON、`merge-evidence-report.json`、`steward-apply-evidence.json` | ✅ broker `parallel-safe`；replay / apply 完整 |
| Wave Mode 5-scenario dogfood | §4.5 | `docs/reports/wave-mode-dogfood-suite/` | MAO-0030~0034 task logs；`validate-agr-benchmark.ts` subset | ✅ 5/5 通過 |
| 12-scenario AGR fixture | §4.1 | `packages/scripts/validate-agr-benchmark.ts`（CID-0037, `e62eee72`） | `test/fixtures/agr-benchmark-*` | ✅ deterministic；12/12 pass |
| npc-brain 3-week adoption | §4.3 | `TASK-CID-0040~0045` incident forensics | freeze protocol end-to-end trigger | ✅ 0 unrecovered admission errors |

### A.2 Implementation Status and Commit Provenance

**Maturity Legend.** ✅ shipped（merged + unit-tested + included in §4 validation）；🔶 prototype（restricted scope，如僅 dogfood）；🔷 planned（§3.6 open problem 對應）。

| Module Family | LOC | Key CID / Task | Representative Commit | Status |
|---|---|---|---|---|
| Broker core + freeze envelope + conflict matrix | ~2,700 | CID-0028 / 0029 / 0031 / 0035 | `aa907d04`、`70594a031`、`803ffc335` | ✅ |
| Format adapter subsystem（JSON / text / numeric / atom-map） | ~1,800 | CID-0091~0098；batch planner 0094/0097 | `31fd89ff0`、`ca59a88a9` | ✅ |
| Steward apply + AGR Layer 2 | ~850 | CID-0035 | `aa907d04`、`16533023` | ✅ |
| Wave Mode batch admission | ~420 | MAO-0030~0034 | `ca59a88a9` branch merge、`194f44cbd` | ✅ |
| CID SDK contract + canonicalization | ~120 | CID-0027 / 0033（canon_sym） | `f841a27c` | ✅ |
| 12-scenario fixture suite | ~1,200 | CID-0037 | `e62eee72` | ✅ |
| Refinement-loop split-suggestion | ~300 | §4.4(c) prototype | BLOCK archive runs | 🔶 |
| Cross-language atom identity | — | A3 open problem | — | 🔷 |
| CID schema migration | — | §3.6 (4) | see A.3 | 🔷 |

**Representative commit notes**：`aa907d04` steward apply + AGR Layer 2 + active-intent registry；`f841a27c` CID canonicalization + adapter manifest schema；`16533023` augmented decision rule + dependency graph；`e62eee72` 12-scenario fixture harness；`31fd89ff0` format adapter registry；`ca59a88a9` atom-map domain adapter + batch planner + Wave Mode dogfood gate。

### A.3 CID Schema Migration Candidate Paths

CID 公式升級（Definition 3 legacy concatenation → canonical JSON）之三條候選路徑：

| 維度 | A. Dual-Compute Window | B. Flag-Day Quiesce | C. Versioned CID + Compat Hash |
|---|---|---|---|
| 機制 | Broker 同時計算 v1/v2 兩份 CID；admission 雙側通過 | 特定 commit 為界，先 quiesce active intent、待 in-flight 完成、原子 cutover | CID 內嵌版本 tag（`cid:candidate:v2:{hash}`）；admission 階段檢查相容性 |
| 實作成本 | 中 | 低 | 高 |
| 協調複雜度 | 低（新舊 adapter 共存） | 高（需 cluster-level lock） | 中 |
| 過渡期 | 3 版本（dual-compute → single → cleanup） | 1–2 版本（準備 + cutover） | 4–5 版本（schema → adapter → branch logic → migrate → cleanup） |
| Registry 負擔 | 雙查詢 | 清晰 | 多版本追蹤 |
| 適用場景 | 大型部署、長期相容 | 單一使用方、快速轉換 | 多獨立 adapter 演進 |

**當前建議**：考慮 npc-brain 與小規模採用群，**路徑 B（Flag-Day Quiesce）** 最符合成本效益——協調成本受限於已知使用方數量，單次 cutover 可完全消除過渡期歧義。若未來 adapter 生態擴展至多個獨立演進方，再轉用路徑 C。

---

## References（參考文獻）

主要參考文獻：

1. Pugachev, S. (2025). CodeCRDT: Observation-Driven Coordination for Multi-Agent LLM Code Generation. arXiv:2510.18893.
2. Acharya, V. (2026). Semantic Consensus: Process-Aware Conflict Detection and Resolution for Enterprise Multi-Agent LLM Systems. arXiv:2604.16339.
3. Liu, M., Chen, T., Xu, Z., Jiang, X., & Dong, Y. (2026). Multi-agent Collaboration with State Management (STORM). arXiv:2605.20563.
4. Qian, K., Fang, X., & Li, Z. (2026). MPAC: A Multi-Principal Agent Coordination Protocol for Interoperable Multi-Agent Collaboration. arXiv:2604.09744.
5. Costa, I. (2026). AgentSpawn: Adaptive Multi-Agent Collaboration Through Dynamic Spawning for Long-Horizon Code Generation. arXiv:2602.07072.
6. Zhou, W., Wang, Z., Peng, Z., Chen, H., Zhang, Y., & Yu, G. (2026). ATCC: Adaptive Concurrency Control for Unforeseen Agentic Transactions. arXiv:2603.13906.
7. Pan, M., et al. (2025). Why Do Multiagent Systems Fail? ICLR 2025 Workshop on Building Trust in Language Models and Applications. OpenReview: wM521FqPvI.
8. Nie, X., Guo, Z., Chen, Y., Zhou, Y., & Zhang, W. (2026). AWCP: A Workspace Delegation Protocol for Deep-Engagement Collaboration across Remote Agents. arXiv:2602.20493.
9. Nechepurenko, M. & Shuvalov, P. (2026). Coordination as an Architectural Layer for LLM-Based Multi-Agent Systems. arXiv:2605.03310.
10. Sartori, C. C. (2026). The Specification Gap: Coordination Failure Under Partial Knowledge in Code Agents. arXiv:2603.24284.
11. Ellis, C. A. & Gibbs, S. J. (1989). Concurrency control in groupware systems. SIGMOD '89.
12. Shapiro, M., Preguiça, N., Baquero, C., & Zawirski, M. (2011). Conflict-free Replicated Data Types. SSS 2011.
13. Kung, H. T. & Robinson, J. T. (1981). On optimistic methods for concurrency control. ACM TODS 6(2).
14. Lyu, H., Zhang, D., Wu, M., Wei, X., & Chen, H. (2026). CoAgent: Concurrency Control for Multi-Agent Systems. arXiv:2606.15376.
15. Geng, J. & Neubig, G. (2026). Effective Strategies for Asynchronous Software Engineering Agents (CAID). arXiv:2603.21489.
16. Zhang, Q., Li, J., Lin, J., Luo, C., & Qian, C. (2026). Rover: Context-aware Conflict Resolution with LLM. arXiv:2605.17279.
17. Xia, S., Li, Q., Ehsan, T., & Ortiz, J. (2026). TraceFix: Repairing Agent Coordination Protocols with TLA+ Counterexamples. arXiv:2605.07935.
18. Ogenrwot, D. & Businge, J. (2026). AgenticFlict: A Large-Scale Dataset of Merge Conflicts in AI Coding Agent Pull Requests on GitHub. arXiv:2604.03551.
19. Liu, S. et al. (2026). Towards Direct Latent-Space Synthesis for Parallel Branches in LLM-Agent Workflows. arXiv:2606.14672.
20. Lyu, H. et al. (2025). MACOG: Multi-Agent Collaboration for Infrastructure-as-Code Generation via State-Machine Orchestration. arXiv:2510.03902.
21. Author et al. (2025). ProjectGen with Self-Specifying Architecture Tree (SSAT) for Repository-Level Project Synthesis. arXiv:2511.03404.
22. DebateCoder Authors (2026). DebateCoder: Multi-Agent Debate for Code Generation and Verification. arXiv:2601.21469.
23. Multi-Agent Code Verification Authors (2026). Multi-Agent Code Verification with Counter-Example Driven Refinement. arXiv:2511.16708.
24. Singh, R. (2026). Intent-Driven Prompt Assembly and Semantic Caching for Production LLM Deployment. arXiv:2601.11687.

---

## Revision History

**2026-06-22 (v2 draft — full structural rewrite per outline)**：依使用者提供之「最終版 outline」整篇重排——Abstract 0.5 頁、§1 1.0 頁（1.1–1.4）、§2 1.3–1.5 頁（從 9 小節壓至 5）、§3 3.3–3.6 頁（從 11 小節壓至 6）、§4 3.0 頁（從 7 小節壓至 5，§4.4 從 330 行壓至 ~50 行）、§5 0.7–0.8 頁（移除 ✅ 已完成清單）、§6 1.1–1.2 頁（新增 §6.4 admission-layer positioning 段）、§7 0.4 頁、Appendix A.1–A.3 ~2 頁。原 paper.md 保留不動，本檔為 v2 並行版本。
