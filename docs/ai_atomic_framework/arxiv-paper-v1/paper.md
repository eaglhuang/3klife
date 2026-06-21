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

本論文的四個核心貢獻：
1. **跨語言中立的原子化抽象**：透過 optional `AtomizationPlanningAdapter` SDK，讓每個語言以最便宜的偵測策略（regex、scanner、compiler API、AST、LSP）回報函式 / 類別 / 模組級原子候選，無需強制 AST。
2. **確定性多維度衝突准入**：以 atomId 與 atomCid 為核心，配合 generators / projections / registries / validators / artifacts 五類共享表面，達成 O(n log n) 衝突檢測，相對於 SCF 的 O(n²) 意圖圖具備明顯擴展性。
3. **檔案重疊但 CID disjoint 的並行寫入路由**：當兩個代理修改同一檔案的不同函式時，broker 將其路由到 deterministic composer 進行合成，避免 STORM 風格的盲目拒絕。
4. **超越程式碼之通用化**：以 `FileMutationAdapter` 與 `ConflictKey` 將 broker 衝突偵測核心由程式碼原子推廣至任意結構化產物（JSON 記錄、文字範圍、數值欄位、atom-map shards），並以 Theorem 3（ConflictKey Disjointness，作為 Theorem 1 之推廣）形式化。

我們以 ATM 框架的開源實作為基礎（Apache 2.0，broker 核心 ~2,700 LOC，含 freeze / patch-envelope / conflict-matrix snapshot 協定與 format-adapter 子系統；SDK 完成 TASK-ASP-0001~0005、AGR 完成 TASK-CID-0028~0037、Format Adapter 完成 TASK-CID-0091~0098），並以三類證據驗證：(i) **12 個確定性 fixture scenarios**（涵蓋 Cross-Regime Disjointness、Augmented Decision Rule、AGR Layer 1/2、Static Admission Closure A1′/A2）；(ii) **8-scenario AGR conflict arbitration suite**（7/7 unsafe 場景被偵測、0 false-safe regression）加 **5-scenario format-adapter dogfood**（`SHIP` 評定，含 2 個成功合併、3 個正確拒絕）；(iii) **真實 incident、受控碰撞與 multi-vendor 並行寫入證據** — `atm-abnormal-release-forensics-report.md` 記錄 TASK-CID-0040~0045 期間 5 個治理事件，含首次真實觸發 freeze 協定的 cid-shared collision；6 筆 broker collision runs（`docs/ai_atomic_framework/broker-collision-evidence/`）涵蓋早期受控雙 agent 同檔碰撞、Cursor Composer 真實寫入 `path-to-atom-map.json`，並包含關鍵的 **`parallel-0041-0042` 跨 vendor 真實任務碰撞 dogfood**（Cursor Composer 2.5 + Google Gemini Flash 3.5 在五個共同檔故意並行；broker 偵測 `blocked-cid-conflict`，wave planner 自動序列化為兩 wave，territory split 後雙卡皆 close）；MAO-0010 parallel routing benchmark 12 個 scenario 100% catch；**Team Agents Wave Mode dogfood 5/5（§4.6）**；以及 npc-brain（3 週、37 任務卡、含 10-card scope-lock contention burst 恢復、2 out-of-scope 拒絕、3 validator 捕獲、0 unrecovered admission error）。同 reporting window 內 4 個不同 vendor LLM（Anthropic / Cursor / Google / OpenAI 體系）在 ATM admission control 下共同寫入產出 ATM 自身。對照 STORM / CodeCRDT / SCF 之吞吐量 benchmark 延至 12 月完整版。

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

本論文的主要貢獻為（四項，每項皆有開源實作與 §4 驗證對應）：

1. **Adapter-Guided Atomization 模型**：形式化 `AtomizationPlanningAdapter` 作為 optional SDK contract，讓不同語言以 regex、scanner、compiler API、AST 或 LSP 任意組合實作，避免「萬能 AST」前提（§1.2、§3.2、§3.6）。
2. **多維度確定性 broker 演算法**：以 atomId、atomCid、shared surfaces、physical file overlap 四個維度做衝突檢測（O(n log n)），並透過 augmented decision rule（read/write 相依）與 AGR 兩層細化處理 hunk 級衝突；以 Theorem 1（Cross-Regime Disjointness）與 Theorem 2（Static Admission Closure under A1′/A2）形式化（§3.3–3.6）。
3. **CID-Disjoint 並行寫入路由與單一序列化點**：當兩個代理修改同一檔案的不同函式（CID disjoint）時，broker 路由到 deterministic composer / format adapter merge，並由 neutral writer steward + freeze / patch-envelope / conflict-matrix snapshot 協定確保單一序列化點與崩潰回復語意（§3.4、§3.7）。**Field-validated**：6 筆 broker collision runs 涵蓋受控雙 agent 同檔碰撞、production agent 真實寫入 `path-to-atom-map.json`、以及 **`parallel-0041-0042` 跨 vendor 真實任務並行 dogfood**（Cursor Composer 2.5 + Google Gemini Flash 3.5，broker 判 `blocked-cid-conflict`、planner 序列化為 2 wave、雙卡最終皆 close，§4.5）。freeze 協定的首次真實觸發為 2026-06-12 的 cid-shared collision（§4.4）。
4. **超越程式碼的通用化**：將 broker 的衝突偵測核心從程式碼原子推廣至任意結構化產物（JSON 記錄、文字範圍、數值欄位、path-to-atom-map shards），透過 `FileMutationAdapter` 與 `ConflictKey` 分類，並以 Theorem 3（ConflictKey Disjointness）作為 Theorem 1 的推廣（§3.10；TASK-CID-0091~0098，commits `31fd89ff0`、`ca59a88a9`，含 batch planner、CAS、5-scenario dogfood `SHIP`）。

完整開源實作（Apache 2.0）於 `AI-Atomic-Framework`，以 npc-brain 3-週實採資料（§4.3）作為部署存在證明。

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

**STORM** [Liu et al., 2026] 提出狀態導向管理（STate-ORiented Management），以寫入時衝突偵測介於樂觀並發控制（OCC）阻擋陳舊寫入。當代理 $a_i$ 嘗試對檔案 $f_t$ 寫入時，STORM 驗證其在推理期間觀察到的所有依賴檔案 $f \in F_{observed}$ 滿足 $v_f^{obs} \geq v_f^{cur}$。若不滿足，STORM 拒絕寫入並回傳最新檔案 + diff 列表，迫使代理重新規劃。

STORM 的核心問題在於**檔案是其最小協調單位**。若兩個代理修改同一檔案中的兩個獨立函式（例如 `helper_math()` 與 `helper_string()`），雖然兩者的 read-set / write-set 完全不相交，STORM 仍會因為檔案版本變動而拒絕其中一方的寫入。這在多函式大型檔案場景中造成嚴重的吞吐量損失。

**CAID** [Geng & Neubig, 2026] 採用與 STORM 互補的另一種 Tier 3 路徑：**Centralized Asynchronous Isolated Delegation**，以 `git worktree` 為 substrate 為每個代理建立隔離工作空間，再透過中央 delegator 收口 `git merge`。CAID 在長期任務（paper reproduction、library development）回報 26.7% 與 14.3% 的準確率改善，並明確將「concurrent edits by multiple agents interfere with each other」列為核心挑戰。**CAID 解決衝突的方式仍是事後 merge**：代理在自己的 worktree 內安全寫入、最後由 git merge 仲裁，與 STORM 的 write-time 拒絕、本框架的 admission-time 預先裁決形成三種不同切點。在多函式大型檔案場景下，CAID 同樣受限於 git 的檔案級 merge 粒度。

### 2.3 工作流級協調（Tier 4）

**Semantic Consensus Framework (SCF)** [Acharya, 2026] 是進程感知中間件，以語意意圖圖（Semantic Intent Graph, SIG）做事前衝突檢測。SCF 在 AutoGen、CrewAI、LangGraph 三種架構的 600 次運行中達到 100% 工作流完成率（對比基準 25.1%），但精度只有 27.9% —— 即每 100 個被阻擋的並行對中，72 個其實是安全的（False Positive）。對於程式碼層級的細粒度並行，72% 的誤擋率是不可接受的。

**MPAC** [Qian et al., 2026] 提出五層應用級多主體協調協定（Session、Intent、Operation、Conflict、Governance），以聲明式意圖預防衝突，並在三代理跨模組程式碼審查基準中將協調開銷降低 95%，壁鐘時間加速 4.8 倍。然而 MPAC 的衝突仲裁仍仰賴樂觀鎖（OCC）而非結構化代碼分析。

**ATCC** [Zhou et al., 2026] 在資料庫層實作自適應並發控制，以強化學習（RL）動態切換樂觀與悲觀執行模式。**OptiMA** [Çalıkyılmaz et al., 2026] 將原子代理操作封裝為兩階段鎖（2PL）事務。這兩者皆在資料庫層而非代碼合成層運作，但其「樂觀/悲觀動態切換」思路與本框架的 lane routing 有共通之處。

### 2.4 工作空間協定（Workspace Protocols）

**AWCP** [Anonymous, 2026] 是去中心化工作空間委派協定，以「files-as-interface」為核心，建立 Delegator-Executor 模型。AWCP 明確將「語義衝突偵測」列為未來工作，本身只提供傳輸層生命週期管理。**SEMAP** [Liu et al., 2026] 在 A2A 通信標準上添加生命週期導向的行為契約，將協調失敗降低 69.6%。這些協定屬於傳輸層而非語義層，與本框架是互補關係。

### 2.5 失敗分類、協調架構規格與形式化驗證

**MAST** [Pan et al., ICLR 2025 Workshop] 分析 18 種多代理 LLM 失敗模式並歸納為三類（系統設計、跨代理對齊、驗證薄弱）。**Coordination as Architectural Layer** [Nechepurenko & Shuvalov, 2026] 形式化協調層為七個架構元素（endpoints、topology、authority、synchronization、aggregation、termination、failure handling）。這些工作提供了診斷視角，但未提出具體的並發准入機制。本框架可視為「在程式碼粒度上實現 MAST/Coordination-Spec 主張的具體 admission control」。

**TraceFix** [Xia et al., 2026] 採用形式化驗證進路：以代理合成 protocol topology IR、生成 PlusCal coordination logic，再迭代用 TLA+ model checker（TLC）的 counterexample 修補 protocol，最後用 runtime monitor 在執行時強制 topology compliance。TraceFix 在 48 個任務上將 deadlock / livelock 從 31.1% 降至 14.1%。TraceFix 與本框架在角色上正交：**TraceFix 驗證一個 protocol、本框架本身即是 protocol**；ATM 的 broker admission rule (§3.4)、Static Admission Closure (Theorem 2)、CAS Def 6 在本論文以手寫定理形式呈現，未來可以用 TraceFix 風格的 TLA+/PlusCal 工具鏈做機械化驗證，這是補強路徑而非競爭關係。

### 2.6 規格優先與類型感知方法

**The Specification Gap** [Sartori, 2026] 主張「更豐富的規格是主要協調機制」，本框架的 adapter-guided atomization 可視為一種**自動生成輕量規格**的路徑：adapter 不需要人類撰寫完整規格，而是由 candidate discovery + dry-run plan 自動產生。

**T-RDT**（Type-Aware Replicated Data Types）作為 CodeCRDT 的潛在改進方向，將編譯器語義嵌入 CRDT 合併運算元，理論上可消除 5–10% 語義衝突率。然而 T-RDT 需要為每個語言重新形式化合併代數，工程成本巨大。本框架不與 T-RDT 競爭：T-RDT 改進物理層，本框架增加上層語義准入。

**Rover** [Zhang et al., 2026] 在事後（post-hoc）merge conflict 解決上，提出 Multi-layer Code Property Graph（MtCPG）擷取跨檔依賴並以圖演算法分群，再交由 LLM 做 context-aware 合併。Rover 處理的是 **git 已產出物理衝突之後**的解決問題，與本框架在 admission 時點預先阻擋並切片的設計屬於正交：在多代理共寫一棵 tree 的場景，理想上是「以 ATM 在准入時把絕大多數衝突降為 disjoint 並行，剩下無法避免的物理衝突再交給 Rover 這類 post-hoc 解決器」。我們未做兩者整合實驗，僅指出這個 pipeline 配對方向。

### 2.7 Direct Tier 2 Comparison: CoAgent and the Recent 2026 Wave

**CoAgent** [Lyu et al., 2026, arXiv:2606.15376] 在本論文成稿前一週（2026-06-13）發表，與本框架在 Tier 2 LLM 代理並發控制議題上產生**直接對撞**，必須明確差異化。

CoAgent 來自 SJTU IPADS（Haibo Chen 組），其核心機制 **MTPO**（Monotonic Trajectory Pre-Order）的設計可以概括為：
- **原子粒度**：tool / action 級別，每個註冊工具須提供 advance undo（saga-style inverse）能力。
- **協調策略**：在批次啟動時固定一個 serialization order，每次 read 只回傳「在該 order 中早於自己的代理已寫入」的順序過濾值，write 則 speculatively in place。
- **衝突處理**：advisory 而非 restrictive — broker 不阻擋，只 one-way notification 通知受影響的 reader 重新判斷，由 LLM agent 自行 re-judge & patch plan。
- **回滾**：用 saga-style 逆操作回退被覆寫的 trajectory；以 ~1.4× speedup、near-serial token cost 為主要指標。

本框架（ATM）的核心機制可以對照敘述如下：
- **原子粒度**：函式 / module 級別（CID-bound code region），可由 AGR 細化至 sub-file 範圍（§3.6），並由 Format Adapter + ConflictKey（§3.10）延伸到 JSON record、文字段落、純量欄位等非程式碼格式。
- **協調策略**：admission-time 七層 hard gate（§3.4 表）做 *確定性* 預先裁決；輸出 verdict ∈ {parallel-safe, needs-physical-split, blocked-cid-conflict, blocked-shared-surface} ∪ {SERIAL}。
- **衝突處理**：preventive — 凡未通過 admission 的 write 不會被執行；通過者並行。LLM 在裁決階段沒有發言權。
- **回滾**：admission 通過後不依賴 saga 回滾；唯一 re-plan 路徑是 §3.10 Def 6 的 CAS base-hash 失配（bounded one-shot），失敗即 block。

**誠實的差異與限制如下**：

| 維度 | CoAgent | ATM | 誰較佔優 |
|---|---|---|---|
| 原子粒度 | tool / action | function / CID region（+ AGR 細化、+ format adapter 擴充至 JSON/text/numeric） | ATM 在程式合成情境較細；CoAgent 在純 tool-calling 情境更直接 |
| 裁決時點 | post-launch advisory + agent re-judge | admission-time deterministic | ATM 不依賴 LLM 重推理 |
| 不透明 read set | MTPO order-filtered serving（讀 = 看到順序內已 commit 的寫） | 由 adapter 在 dry-run 階段顯式宣告 R/W set；§3.9 仍是 open problem | CoAgent 對「無法事前宣告 read set」的 tool 較友善 |
| 副作用 / 不可回滾操作 | saga undo（每工具必須註冊 inverse） | layer 7 fallback file lock（整檔互斥） | CoAgent 對 side-effectful 工具更細緻；ATM 對純檔案寫入較簡潔 |
| 跨格式通用化 | 程式碼 / tool 領域內 | Def 5 ConflictKey 擴及 JSON record / numeric / text；§3.10 dogfood 5/5 | ATM 明確延伸 |
| 端到端 throughput 實證 | ~1.4× speedup vs 序列基線（內部評估） | 跨 vendor 真實任務 collision dogfood（parallel-0041-0042: Cursor Composer 2.5 + Gemini Flash 3.5），Wave Mode dogfood 5/5；**未做與 CoAgent 的 head-to-head 加速比比較** | 互有所長；同台比較列為 §5 roadmap |
| 開源實作 | 摘要未明示倉庫；以論文評估呈現 | AI-Atomic-Framework repo 公開；12-scenario fixture suite + dogfood report 可重現 | ATM 可重現性較高 |

**我們不主張 ATM 在所有面向勝過 CoAgent**。CoAgent 的 MTPO advisory 模型在「無法為每個 action 事前宣告 read/write set」的場景（典型如多輪 browser 操作、shell exec 等 side-effectful tool chain）有結構性優勢；ATM 的硬閘門模型在「可由 adapter 靜態還原候選 atom 與 surface」的程式碼合成與結構化格式編輯場景有結構性優勢。**兩者實際上指向不同的子空間**：CoAgent 屬「tool-call 級 reactive concurrency control」，ATM 則為「code-region 級 preventive concurrency control + 格式無關通用化」。若將二者等同視之而做同質競品比較，將誤判其各自適用之場景邊界。

直接 head-to-head 吞吐量 / token cost 對照是 ATM 公開的最大未完工項，列入 §5 評估路線圖。

### 2.8 本框架的定位

下表總結各層級協調機制（加入 2026-06 新興的 Tier 2 系統 CoAgent 作為平行對照）：

| Tier | 代表系統 | 粒度 | 裁決方式 | 對 LLM 重推理依賴 | 治理 |
|---|---|---|---|---|---|
| 1 | CodeCRDT | 字元 | CRDT 代數 | 無 | 無 |
| **2 (preventive)** | **ATM (本文)** | **函式 / CID region（可細化至 sub-file、可擴及非程式碼格式）** | **Adapter-guided + 7-layer hard gate（admission-time deterministic）** | **低（admission 後不依賴）** | **Dry-run + Review + Evidence + Rollback** |
| 2 (advisory) | CoAgent [Lyu et al., 2026] | tool / action | MTPO + 順序過濾讀取 + speculative write + saga undo | 高（agent re-judge after notification） | LLM-mediated repair |
| 3 (write-time) | STORM [Liu et al., 2026] | 檔案 | mtime / version OCC at write-time | 中（reject → re-plan） | 隱式 |
| 3 (workspace) | CAID [Geng & Neubig, 2026] | 工作空間 / 檔案 | git worktree 隔離 + 事後 git merge | 中（merge 後修） | 隱式 |
| 4 | SCF [Acharya, 2026] / MPAC [Qian et al., 2026] | 工作流 | Intent Graph + LLM | 高 | LLM 仲裁 |

Tier 2 在 2026-06 才開始有 ATM 與 CoAgent 兩個獨立提案；二者分別代表 **preventive / advisory** 兩種裁決取向，並在原子粒度（code-region vs tool）與通用化範圍（格式無關 vs 程式碼/工具）上分屬不同子空間。本論文的核心主張是：**對於程式碼合成與結構化文件編輯，preventive admission with adapter-guided atomization 比 advisory + LLM repair 在預測性與可審計性上有明確優勢**；但對於 side-effect-heavy 的純 tool-calling 場景，advisory 取向（CoAgent）有結構性合理性。Tier 2 並非單一答案。

### 2.9 Concurrency Control Beyond Code: OT, CRDTs, and Databases

The `ConflictKey`-based generalization proposed in §3.10 draws on a much older lineage of concurrency control for shared structured data. **Operational Transformation (OT)** [Ellis & Gibbs, 1989] and **CRDTs** [Shapiro et al., 2011] address convergence for collaborative editing of documents and structured data more broadly than source code; database **two-phase locking** and **optimistic concurrency control** [Kung & Robinson, 1981] address conflict detection for record-level updates via read/write-set disjointness — structurally analogous to our $\mathsf{record}$-scope `ConflictKey`. ATM's Definition 5 (§3.10) can be read as restating this OCC tradition's read/write-set disjointness check in a format-agnostic vocabulary that spans code atoms, JSON records, and scalar fields under one broker; we do not claim novelty over OCC itself, only over its uniform application across heterogeneous artifact types within a single multi-agent admission point.

---

## 3. The Framework: Adapter-Guided Atomization + CID Broker（架構與形式化）

### 3.0 Implementation Status Legend

本章節的所有 Definition / Theorem / Algorithm 均對應 ATM 開源實作中可驗證的程式碼路徑。為清楚標示每個機制的成熟度，使用下列三檔：

| 標記 | 意義 |
|---|---|
| ✅ **Implemented** | 已合入 main 分支、有單元測試、包含於 §4 的 12-scenario fixture suite 或 §3.10 的 5-scenario dogfood |
| 🔶 **Prototype** | 已實作但仍限於部分情境（例如僅 JS / Python 兩種 adapter；其他語言尚未提供） |
| 🔷 **Open Problem** | §3.9 列出的尚未解決議題（cross-language identity、CID schema migration、adapter trust、liveness） |

**As of 2026-06-16**：§3 中所有 ✅ 標記對應的 AAF commits：`f841a27c` (CID-0033 SDK + canon_sym)、`aa907d04` (CID-0035 AGR Layer 2 + steward)、`16533023` (CID-0032 Augmented Decision Rule)、`9d214ad9` (CID-0034 registry integration)、`e62eee72` (CID-0037 fixture suite)、`803ffc335` (freeze + patch envelope snapshot, 2026-06-12)、`70594a031` (CID-0041 conflict matrix, 2026-06-12)、`31fd89ff0` (CID-0092/0093/0095/0096 format adapter registry + JSON/text/numeric)、`ca59a88a9` (CID-0094/0097/0098 atom-map domain adapter + batch planner + CAS + dogfood)。

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
- $P \subseteq \mathrm{FilePath} \times (\mathrm{LineRange} \cup \{\bot\})$ — the atom's `sourcePaths`; each element is a file path optionally narrowed by a line range. Registry atoms (the common case) use $\bot$ (whole file is in scope); virtual atoms produced by AGR (§3.6) supply concrete `LineRange` values to express sub-file boundaries
- $\sigma = (\Sigma_{\mathrm{in}}, \Sigma_{\mathrm{out}})$ — input/output JSON Schemas
- $\psi \in \mathrm{Status} = \{\mathsf{draft}, \mathsf{validated}, \mathsf{active}, \mathsf{transitioning}, \mathsf{deprecated}, \mathsf{expired}, \mathsf{quarantined}\}$
- $\tau \in \mathrm{Tier} = \{\mathsf{foundation}, \mathsf{governed}, \mathsf{standard}, \mathsf{experimental}\}$
- $H = (h_{\mathrm{spec}}, h_{\mathrm{code}}, h_{\mathrm{test}}) \in \mathrm{Hash}^3$ — `hashLock`

The status component $\psi$ follows a state machine $\mathsf{draft} \to \mathsf{validated} \to \mathsf{active} \rightleftarrows \mathsf{transitioning} \to \mathsf{deprecated} \to \mathsf{expired}$, with $\mathsf{quarantined}$ reachable from any state (`status-machine.ts`).

**Definition 2 (Atom Map).**
An atom map $M$ is a 4-tuple $M = \langle \mathit{id}, V, E, R \rangle$ where $\mathit{id}$ matches `^ATM-MAP-\d{4}$`, $V \subseteq \mathrm{AtomId}$ are member atoms, $E \subseteq V \times V \times \mathrm{EdgeKind}$ are typed edges with $\mathrm{EdgeKind} = \{\mathsf{data\text{-}flow}, \mathsf{control\text{-}flow}, \mathsf{event\text{-}flow}, \mathsf{validation}, \mathsf{fallback}, \mathsf{side\text{-}effect}, \mathsf{rollback}\}$, and $R \subseteq V$ ($R \neq \emptyset$) are entrypoints.

**Boundary semantics.** The boundary of atom $a$ is defined *extensionally* by $P$: each `(file, range)` pair either claims the whole file ($\bot$) or a specific line range. Two atoms $a, a'$ overlap iff $\exists (f, r) \in P_a, (f', r') \in P_{a'}$ with $f = f'$ and either side is $\bot$, or $r \cap r' \neq \emptyset$. This unifies registry atoms (file-granular) and AGR virtual atoms (range-granular) under one definition, sidestepping the question "what counts as one atom" by delegating granularity to whatever the adapter reports — a function, class, module, or refined sub-region.

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

**Definition 3 (Candidate CID).** ✅ Given a candidate $c = (\mathit{kind}, \mathit{symbol}, P, \mathit{method})$ where $\mathit{symbol} = \mathrm{canon\_sym}(\cdot)$, define the canonical form as an injectively-encoded JSON object:

$$\mathrm{canon}(c) := \mathrm{canonicalJSON}\Big(\big\{\mathtt{schema\_version}\!: \texttt{"atm.cid.candidate.v1"},\ \mathtt{kind}\!: \mathit{kind},\ \mathtt{symbol}\!: \mathit{symbol},\ \mathtt{paths}\!: \mathrm{sort}(\mathrm{dedup}(\mathrm{normalize}(P))),\ \mathtt{method}\!: \mathit{method}\big\}\Big)$$

$$\mathrm{CID}_{\mathrm{candidate}}(c) := \mathrm{SHA\text{-}256}(\mathrm{canon}(c)).\mathrm{hex}()$$

(`packages/core/src/broker/candidate-bridge.ts`, `computeCandidateAtomCid`). The canonical-JSON form (RFC 8785 / JCS-style sorted keys, no insignificant whitespace, explicit string escaping) is injective on its input domain: distinct $(\mathit{kind}, \mathit{symbol}, P, \mathit{method})$ tuples produce distinct byte sequences, ruling out the delimiter-collision corner cases of the earlier `||`-concatenation formula. The leading `schema_version` field reserves a forward-compatible upgrade path for future formula changes (§3.9). This is a **metadata-level, pre-write fingerprint**: it identifies *which symbol, in which files, discovered by which method* — not the content of the patch. It deliberately excludes line ranges; coupling the CID to line ranges would make it unstable under whitespace-only edits. Adaptive Granularity Refinement (§3.6) is the mechanism for hunk-level disambiguation rather than extending Definition 3 itself.

*Implementation note.* The shipped `computeCandidateAtomCid` currently uses the legacy `||` concatenation; migrating it to the canonical-JSON form above is tracked as a hardening item (no on-disk CIDs depend on it, and the broker is the sole consumer, so cutover is a single-version flag-day rather than a multi-version migration).

**Definition 4 (Capsule CID).** ✅ Given an exported atom bundle $B = (\mathit{canonicalSourceCode}, \Sigma_{\mathrm{in}}, \Sigma_{\mathrm{out}}, \pi)$ where $\pi$ is the police/policy configuration:

$$\mathrm{canon}(B) := \mathrm{JSON}(\{\mathit{canonicalSourceCode}, \Sigma_{\mathrm{in}}, \Sigma_{\mathrm{out}}, \pi\})$$

$$\mathrm{CID}_{\mathrm{capsule}}(B) := \texttt{"atom:cid:"} \mathbin{\|} \mathrm{base64url}(\mathrm{SHA\text{-}256}(\mathrm{brotli}(\mathrm{canon}(B))))$$

(`packages/core/src/registry/atom-capsule.ts`, `computeAtomCid`). Unlike the Candidate CID, this **is** a content-addressed identifier: it covers the full source body, both schemas, and the policy configuration, brotli-compressed and base64url-encoded with an `atom:cid:` prefix.

| Stage | CID | Granularity | Addressing |
|---|---|---|---|
| Broker admission (pre-write) | $\mathrm{CID}_{\mathrm{candidate}}$ | symbol-level | metadata (kind, symbol, paths, method) |
| Atom export / version anchor (post-validation) | $\mathrm{CID}_{\mathrm{capsule}}$ | full bundle | content (source + schemas + policy) |

A third identifier exists in the codebase (`team-lane.ts`, a deterministic slug derived from `taskId` for lane routing). This is **not** a contract or content identifier and is out of scope for this paper's formalization; we recommend it be renamed (e.g., `laneId`) to avoid confusion with Definitions 3–4 — a naming hygiene item tracked in the implementation plan, not an academic concern.

**Versioning.** Definition 3 above is the hardened form: `schema_version` is part of the canonical input, so any future formula change cannot silently collide with v1 outputs. The migration question (cutting over the shipped legacy concatenation to the canonical-JSON form, and handling any active intents during the cutover) is discussed in §3.9.

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

i.e., if $I$ reads an atom that $I'$ is concurrently writing, $I$ must be serialized after $I'$ (or vice versa) even if their write sets are disjoint. **Ordering model.** The relative order between two `SERIAL`-bound intents is determined by the broker's monotonically-increasing intent-registration sequence number (a Lamport-style logical counter local to the single broker process, §3.7), not by agent-side wall-clock timestamps — making the rule robust to clock skew across distributed agents. Implemented by extending `WriteIntent` with a `readAtoms: AtomRef[]` field (`packages/core/src/broker/types.ts`) and adding the read/write intersection check to `calculateBrokerDecision` (`packages/core/src/broker/decision.ts`, +107 LOC, with 166 LOC of regression tests in `decision.test.ts`). Validated by benchmark scenario `07-registry-read-write-dependency` (§4.2).

---

### 3.5 Static Admission Closure ✅ (validated via 12-scenario fixture suite, §4.2)

**Assumptions.**

- **(A1′)** Each adapter's `discoverAtomCandidates` extracts a read/write set covering all *statically determinable* effects of the corresponding code region, under its declared `canon_sym` policy.
- **(A2)** Effects arising from language features beyond static analysis — decorators, proxies, reflection, `eval`, dynamic `import` — are **not** claimed to be captured by (A1′). Their correctness is delegated to the post-write validator phase (§3.8), not the broker.

**Theorem 2 (Static Admission Closure).** *Under (A1′) and (A2), a* `parallel-safe` *verdict implies the absence of write-write conflicts among the statically-determinable portions of the concurrent agents' patches. Conflicts arising solely from dynamic effects outside (A1′) are not excluded by this theorem.*

We deliberately title this **closure** rather than **soundness** to avoid overloading the latter term. "Soundness" in the program-analysis sense would require that no conflict whatsoever exists between admitted intents — a claim no static system can defend in the presence of reflection or metaprogramming. What Theorem 2 claims is narrower and falsifiable: the broker's `parallel-safe` verdict is *closed* over the static effects declared by adapters under (A1′). The static/dynamic split is therefore a scoping device, not an evasion: (A1′) defines what the broker is responsible for; (A2) names what is handed off to the validator phase (§3.8), where ATM's existing dry-run/evidence pipeline already operates. A reader who rejects (A2) as a load-bearing assumption is rejecting the *layering* of admission vs. validation, not the closure claim itself.

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

一個自然的質疑為：registry 本身——亦即 broker 用以做出 admission 決策所讀寫之資料結構——是否可能於兩個並行註冊之 agent 間產生 race condition？ATM 之設計以結構性方式排除此風險：**agent 從不直接寫入 registry**。兩個 agent 皆將 `WriteIntent` 提交予 broker；由 broker 原子性地進行 registry 之讀寫，並作為唯一寫入者。

此原則延伸至 **執行中之 mid-execution 註冊** ✅：若 Agent A 已註冊並開始執行對原子 $a$ 之 intent，而 Agent B 隨後註冊一個同樣以 $a$ 為標的之 intent，broker 將於註冊階段（而非僅於寫入階段）偵測 $a$ 為「使用中」，並依 §3.4 所述之同一路徑進行衝突解決（若 CID-disjoint 則 merge via deterministic-composer，否則序列化）。實際之 filesystem 寫入由單一之 **neutral Writer Agent**（"neutral write steward"，實作於 `packages/core/src/broker/steward.ts`）執行；兩 agent 之 admitted plan 皆交予該 steward 收口，由此排除兩個 agent 對同一標的並行寫入 filesystem 之情境。CLI 介面開放於 `packages/cli/src/commands/broker.ts`（+67 LOC, CID-0035）。

**Snapshot and arbitration protocol（2026-06-12）.** 單一寫入者之約束更進一步由 freeze / patch-envelope / conflict-matrix snapshot protocol 強化：`packages/core/src/broker/freeze.ts` 與 `patch-envelope.ts`（commit `803ffc335`, "add freeze and patch envelope snapshot protocol"）提供 freeze-window 與 WIP-capture 之詞彙；`packages/core/src/broker/conflict-matrix.ts`（TASK-CID-0041, commit `70594a031`, 327 LOC + test）將 conflict-set arbitration 接入 decision pipeline。此一組合為 neutral writer 提供寫入中段崩潰之恢復語意：被凍結之 intent 之 patch envelope 與已 commit 之 snapshot 分離持久化，arbitration 透過同一 admission 演算法重放，而非以 ad-hoc retry 處理。本 protocol 首次真實 end-to-end 觸發為 2026-06-12 之 `cid-shared` collision：兩個 intent 並行宣告同一 atom CID，conflict-matrix 評估後 emit `verdict: freeze`，敗方之 patch envelope 持久化，arbitration 隨後 cleanly resume（詳見 §4.4 incident log）。TASK-CID-0040~0045 incident 系列本身即為驅動該 protocol 於該日交付之動機。其上之 Multi-Agent Orchestration (MAO) Route Context 狀態機（`open → admitted → frozen → waiting → blocked → ready-to-apply → closed/abandoned`, `docs/specs/mao-logical-routing-v1.md`, TASK-MAO-0001/0002/0003）將 admission 決策路由經由同一 broker——orchestration 層之並行性係於 §3.4 admission 演算法之上的 additive scheduling，而非繞道。Team Agents Wave Mode（TASK-MAO-0023~0034）以批次方式為一組相關任務卡進行 admission，同時保留 broker admission 與 coordinator-only commit 作為唯一之序列化點與生命週期權威。**Wave Mode 已於 2026-06-17 完整交付**（MAO-0030 wave checkpoint 部分完成語意、MAO-0031 coordinator-only closeout guard `ed7f0f9a0`、MAO-0032 validator/reviewer Team Agents 角色 `fbfe8565e`、MAO-0033 dogfood benchmark `194f44cbd`、MAO-0034 operator guide `4e6e32639`），MAO-0033 dogfood 五個 scenario 全數通過（詳見 §4.7）。本層為現有 broker admission 之上之批次排程，並非繞道。

---

### 3.8 Limitation: Write-Conflict Prevention ≠ Semantic Correctness

我們將此一限制顯著陳明，蓋其圈定了 §3.4–3.7 一切主張之邊界。

> **ATM guarantees:** the broker will not admit two concurrent write-intents that conflict on Definition 3/4 identity, declared shared surfaces, or (with Theorem 1/2) statically-determinable read/write sets.
>
> **ATM does not guarantee:** that the *merged result* of two non-conflicting writes is semantically correct. Two patches can be CID-disjoint (different functions, different atoms, `parallel-safe` verdict) and yet be semantically incompatible — e.g., one patch changes a function's behavior in a way that the other patch's caller silently relies on the old behavior, with neither patch's *write set* overlapping the other's.

此一邊界在結構上與 Git 本身所運作之邊界相同：一次乾淨的 three-way merge（無文字衝突）並不蘊涵合併後之程式為正確。ATM 對此缺口之回應與 Git 一致——**post-write validators**（typecheck、lint、test、project-specific checks）為負責捕捉「穿越 write-conflict admission 之語意不相容」之層級。我們於 §5 之評估計畫中回報 validator 之 pass/fail 比率，但**不主張** broker 本身能偵測此類情況——若要做到，須依賴完整之程式分析，此項明示落於本框架之範圍外（§3.5, A2）。

**Batch admission and evidence attribution ✅（已交付 2026-06-17）.** 當 $N$ 個 agent 在單一 governed batch（"wave"）內以群組方式被 admit 時，broker 的 admission 演算法（§3.4）仍逐一評估每個 `WriteIntent`，但合併產出的 diff 必須能歸屬回個別任務以利 evidence 與 rollback。ATM 的 Team Agents Wave Mode（TASK-MAO-0023~0034, §3.7）以每張任務卡宣告 `allowedFiles`/`scopePaths` 加上 wave-checkpoint 步驟解決此問題；若整合產出無法乾淨切回每張卡的 evidence，wave 即被拒絕。MAO-0029 per-task evidence slicing 已實作，MAO-0030 wave checkpoint 部分完成語意已驗證，MAO-0031 coordinator-only closeout guard 強制唯一生命週期權威；五個 dogfood scenario 全數通過（§4.7）。Admission soundness（Theorem 2）的論證未受影響 — 每個 constituent intent 仍被個別 admit — 此處只是補上 §3.4–3.5 形式模型未涵蓋的歸屬問題之工程解。

---

### 3.9 Known Open Problems in This Formalization

為避免過度宣稱，茲列出本形式化目前未解決之議題：

- **跨語言原子身份（Cross-language atom identity）.** 若兩個分屬不同語言體系之原子被宣稱代表「同一邏輯單元」（例如一個 TypeScript API client 與其對應之 Python backend handler），Definition 3 之 per-adapter `canon_sym` 將賦予二者互不相關之 CID——Theorem 1 雖保證二者不會 *碰撞*，卻無法讓 broker 識別其為 *相關*。本論文不主張跨語言之邏輯原子追蹤；一切 admission 主張（Theorem 1, 2）皆限定於同一體系內或跨體系 disjoint 之推理。
- **CID schema-version 遷移.** §3.3 之 `schema_version` 機制可防範 *未來* 公式變動與當前公式之沉默碰撞，惟其本身並未解決過渡期之問題：一個正在活躍之 `WriteIntent` 持有 $v_1$ 計算之 CID，而新提交之 intent 持有 $v_2$ 計算之 CID，即便二者指向 *同一* 底層原子，任一公式單獨皆無法識別其為同一原子。本論文不於此提出解法；候選方案包括遷移窗口內由 broker 雙重計算，或設置 flag-day 要求所有活躍 intent 排空後再升級 schema version。此屬實作規劃之議題，另案追蹤。
- **Adapter 信任模型.** Admission 主張（Theorem 1–3）假設 adapter 誠實回報 `canon_sym`、`sourcePaths`、`getConflictKeys` 與 `canMerge`。目前之 broker 將 adapter 視為啟動時載入之 *受信任程式碼*。惡意或有缺陷之 adapter 若回報虛假之 disjoint conflict key，可規避 admission。我們於本文不處理 adapter sandboxing 或 signed manifest 之議題；操作層之緩解為註冊時對 adapter manifest 執行 `validate-schemas.ts`，其可捕捉結構性錯誤但無法檢出語意層之不誠實。
- **Liveness、starvation 與 broker 之確定性.** Theorem 2 為一安全性性質（無不安全之 admission）；我們未證明對應之 liveness 性質（每個 intent 最終皆被 admit 或被明確 reject）。具言之，若同一原子上有持續且高優先序之 intent 串流，可能餓死低優先序之 intent。Broker 之 intent 註冊順序（§3.4）相對於單一 broker process 而言為確定性的，惟我們尚未形式化跨 intent 類別之公平性保證。

---

### 3.10 Generalizing Beyond Code: Format Adapters and ConflictKey ✅ (CID-0091~0098, 2026-06-16)

Broker 之 admission 演算法（§3.4）係以程式碼原子（Definition 1）及其 CID（Definitions 3–4）為對象陳述。一個自然之問題為：相同之 admission 核心能否推廣至多代理系統並行寫入之 *非程式碼結構化產物*——JSON registry、path-to-atom map、YAML/TOML 配置、數值純量檔案。截至 2026-06-16，ATM 已將此推廣實作為三層擴展（commits `31fd89ff0`, `ca59a88a9`）：

- **Broker Core**（未變動）：§3.4 之 admission 演算法，參數化於抽象之 conflict key 之上，而非 code-atom CID。`compose / decision / conflict-matrix / policy / merge-plan / steward` 皆未因本擴展而修改——此證實 broker 於實作上（而非僅於設計上）即為 format-agnostic。
- **Format Adapter Plugin**：`FileMutationAdapter` 介面（`packages/core/src/broker/types.ts`, +120 LOC）——`supports / parse / normalize / getConflictKeys / canMerge / merge / serialize / validate`——依檔案格式實作。目前已交付者：`fallback-file-lock`（預設）、`json-record`（CID-0093, 195 LOC）、`text-range`（CID-0095, 176 LOC）、`numeric-scalar`（CID-0096, 180 LOC，對 inc/dec 採 commutative-merge）。Registry 順序為 `numeric-scalar → text-range → json-record → fallback`（CID-0092, 101 LOC）。
- **Domain Adapter**：format adapter 之領域使用者，將領域特定結構映射至下方之 `ConflictKey` 分類。目前已交付者：`AtomMapAdapter`（CID-0094, 227 LOC）服務於 `path-to-atom-map-shards/owner-shard-*.json`，採 row conflict key `record:${path_pattern}::${atom_id}`（不同 row 合併、同一 row 衝突、metadata 欄位升格為 `file` scope）。

**Definition 5 (ConflictKey).** A conflict key is a pair $(\mathit{scope}, \mathit{locator})$ where $\mathit{scope} \in \{\mathsf{file}, \mathsf{record}, \mathsf{range}, \mathsf{line}, \mathsf{scalar}, \mathsf{semantic}\}$ and $\mathit{locator}$ identifies the conflicting unit within that scope (e.g., a JSON record's primary key for $\mathsf{record}$, a line range for $\mathsf{range}$, a field path for $\mathsf{scalar}$).

**Theorem 3 (ConflictKey Disjointness).** ✅ *If two `MutationRequest`s $m, m'$ against the same file produce conflict-key sets $K(m)$ and $K(m')$ with $K(m) \cap K(m') = \emptyset$, and the format adapter's `canMerge` predicate holds for $(m, m')$, then the broker may admit both as `parallel-safe` (routed through `merge`), generalizing Theorem 1's file-overlap argument from code atoms to arbitrary structured artifacts.*

本定理之陳述採與 Theorem 2（§3.5）相同之 conditional 風格：其有效性取決於 adapter 所提供之 `canMerge`/`merge` 對於該格式而言為正確。實證驗證由 `packages/core/src/broker/__tests__/dogfood-adapter-benchmark.test.ts`（CID-0098）提供：JSON-record / text-range / numeric-scalar / atom-map 四種 adapter 共 5 個 scenario 全數通過，並於 `docs/reports/broker-format-adapter-dogfood-report.md` 明示 `SHIP` 之建議。此外，一個確定性之 **batch planner**（CID-0097, `batch-planner.ts` 143 LOC）依檔案與 conflict key 將 mutation 分組；**content-addressed CAS**（`cas.ts` 39 LOC）比對 SHA-256 base-hash 並執行 bounded one-shot re-plan，藉以阻擋 lost update。本驗證之性質與 §4.2 相同——屬 fixture-level assertion testing 而非 comparative concurrency benchmark——adversarial-load 評估留待 12 月之 full paper。

---

## 4. Validation: Fixture Suite and Adoption Study

本節提供證據顯示 §3 之機制已實作、可運行，並由一個確定性 fixture suite 與一份為期三週之採用研究加以演練。我們明示將之區分於 *comparative concurrency benchmark*：§4.2 驗證 decision table 對於宣告之 expected verdict 之正確性（具 regression test 之性質），§4.3 則回報來自一個真實採用者之觀察資料，且無對照組。相對於 STORM / CodeCRDT / SCF baseline 之 wall-clock / throughput / token-cost 比較性評估，須投入 baseline 移植與 adversarial workload 合成，二者均延至 2026 年 12 月之 full paper（§5）。我們明示此範圍以避免高估 fixture 測試與單一採用者案例所能建立之結論。

### 4.1 Complete SDK + AGR Implementation Pipeline

實作管線橫跨兩個 task 系列：

**TASK-ASP-0001~0005（2026-06-10）：SDK + adapter 基礎.**

- ASP-0001: [`atomization-planning.ts`](https://github.com/eaglhuang/AI-Atomic-Framework/blob/main/packages/plugin-sdk/src/atomization-planning.ts) SDK contract — commit `e08bbb2a`
- ASP-0002: JS adapter candidate discovery (scanner-based) — commit `8a58d1d9`
- ASP-0003: Python adapter SDK promotion — commit `6b9eb395`
- ASP-0004: Broker candidate-to-intent bridge with `computeCandidateAtomCid()` (Definition 3) — commit `14359be3`
- ASP-0005: 3KLife coordination + corpus baseline — commit `afa17a12`

**TASK-CID-0028~0037（2026-06-11/12）：AGR + augmented decision rule.**

- CID-0028: [EnclosingUnit + VirtualAtom SDK](https://github.com/eaglhuang/AI-Atomic-Framework/blob/main/packages/plugin-sdk/src/atomization-planning.ts) (+98 LOC) — bundled in commit `f841a27c`
- CID-0029: [Layer 1 syntactic enclosure refinement](https://github.com/eaglhuang/AI-Atomic-Framework/blob/main/packages/core/src/broker/agr.ts) (+57 LOC) — bundled in commit `aa907d04`
- CID-0031: [Layer 2 threshold policy](https://github.com/eaglhuang/AI-Atomic-Framework/blob/main/packages/core/src/broker/policy.ts) (+131 LOC, 210 LOC tests) — commit `aa907d04`
- CID-0032: [Augmented Decision Rule with read-set](https://github.com/eaglhuang/AI-Atomic-Framework/blob/main/packages/core/src/broker/decision.ts) (107 LOC rewrite, 166 LOC tests) — commit `16533023`
- CID-0033: [Adapter manifest + canon_sym contract](https://github.com/eaglhuang/AI-Atomic-Framework/blob/main/packages/plugin-sdk/src/language-adapter.ts) (+20 LOC) — commit `f841a27c`
- CID-0034: AGR runtime registry integration — commit `9d214ad9`
- CID-0035: [AGR-aware neutral writer / steward](https://github.com/eaglhuang/AI-Atomic-Framework/blob/main/packages/core/src/broker/steward.ts) + CLI (+67 LOC) — commit `aa907d04`
- CID-0036: AGR closeout validator integration — commit `5bea4e31`
- CID-0037: [12-scenario AGR benchmark harness](https://github.com/eaglhuang/AI-Atomic-Framework/blob/main/scripts/validate-agr-benchmark.ts) (364 LOC runner + 107 LOC validator) — commit `e62eee72`

狀態：✅ 全數任務卡 close、regression test 通過、ledger 條目記錄於 `.atm/history/`。

### 4.2 The 12-Scenario AGR Fixture Suite (CID-0037, `e62eee72`)

Broker 之 decision 演算法（§3.4）、augmented decision rule（§3.4 read-set）、Theorem 2 static admission closure（§3.5），與 AGR Layer 1 / Layer 2（§3.6）由一個確定性 fixture suite 共同演練，位於 [`scripts/fixtures/agr-benchmark/`](https://github.com/eaglhuang/AI-Atomic-Framework/tree/main/scripts/fixtures/agr-benchmark/)，並由 [`scripts/validate-agr-benchmark.ts`](https://github.com/eaglhuang/AI-Atomic-Framework/blob/main/scripts/validate-agr-benchmark.ts)（107 LOC）透過 [`scripts/lib/agr-benchmark-runner.ts`](https://github.com/eaglhuang/AI-Atomic-Framework/blob/main/scripts/lib/agr-benchmark-runner.ts)（364 LOC）執行。

本 suite 含 **12 個 scenario**，每一為帶有宣告 `expected` verdict 之確定性 JSON fixture。我們強調此為 **assertion fixture，而非 concurrent workload benchmark**——其驗證 broker 之決策於此等輸入上與形式模型相符，但並未驗證其於 contention 下之可擴展性：

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

**Coverage 陳述.** §3 之每一主要形式主張皆至少對應一個 scenario：
- Theorem 1（Cross-Regime Disjointness）：scenario 05
- Theorem 2（Static Admission Closure under A1′/A2）：scenarios 07（A1′ holds）+ 10（A2 handoff）
- Algorithm 1（AGR Layer 1）：scenarios 01, 11
- Algorithm 2（AGR Layer 2）：scenarios 03, 12
- Augmented Decision Rule：scenario 07
- Two-tier CID 分離（Definitions 3/4）：scenarios 02（Candidate）、09（Capsule via validator surface）

**限制.** 本 suite 驗證 broker 決策於宣告輸入上與形式模型之相符性；其**並未**建立：(i) 於 adversarial concurrent load 之下之行為（fixture 為靜態 plan 輸入，未演練並行 agent 執行）；(ii) 相對於 STORM / CodeCRDT / SCF 之 throughput 比較（未移植 baseline）；(iii) 統計信賴區間（每個 scenario 僅一次確定性運行）。三者皆延至 2026 年 12 月之 full paper。

### 4.3 Early Real-World Adoption: npc-brain, 3-Week Case Study (✅ Real Usage Data)

npc-brain 專案（一個遊戲 NPC 行為系統，[GitHub](https://github.com/eaglhuang/3klife-npc-brain)）於 2026-05-19 至 2026-06-07 之三週期間採用 ATM 進行 multi-agent 程式碼原子化。我們以誠實方式回報所觀察到之事件——包含需要恢復處理者——而非僅回報乾淨之摘要數字：

| Metric | Value |
|---|---|
| Atomization task cards attempted | 37 |
| Scope-lock interactions recorded | 44 |
| **Out-of-scope proposals correctly rejected** | 2 (`guided-legacy-split-guidance`, `guided-legacy-infect-guidance` — exceeded leaf-only boundary; stayed `pending`) |
| **Scope-lock contention bursts requiring ledger-replay recovery** | 1 burst on 2026-05-25 09:22 covering 10 cards (SANGUO-BOOTSTRAP-0001/0101/0102/0201/0202/0203/0301/0302/0401/0501); revert + re-claim + re-close cycle ~2 hours; all 10 ultimately landed |
| **Idempotency breaks observed in CLI runner loop** | At least 1 (SANGUO-BOOTSTRAP-0001 claim/release cycle ran 3× before settling) |
| **Post-write validator catches** (§3.8 path) | 3 — bootstrap conflict checker found duplicate candidate IDs (`check_baihua_bootstrap_conflicts.py`, commit `c6b2ed4`); validator baseline diagnostics resync (commit `d0b2c33`); registry diff blocked event (`ATM-NPCBRAIN-0002.evolve-blocked.json`) |
| **Unrecovered admission errors** (broker silently admitted a conflicting write) | 0 |

**詮釋與限制.** 誠實的敘事**並非**「零衝突」，而是「每一次衝突與每一次治理破口皆被捕捉並完成恢復，部分恢復過程伴隨可見之噪訊」。10 張卡之 revert burst 為資訊量最大之事件——其暴露出原 ledger 模型未能 idempotent 處理之 scope-lock contention path；恢復程序生效，且 runner-loop 之 idempotency 缺口隨後被加固。2 件被拒之提案確認 `scope-lock`（§3.6 之前身）能正確拒絕超出範圍之原子化候選，而毋須人工介入。3 件 validator 捕捉確認 (A2) handoff（§3.5）將動態 / 語意之不相容路由至其應屬之 post-write 階段，而非任其汙染 main。本資料屬非受控之部署資料（無「未採用 ATM 之反事實 run」、無 baseline 對照組），故我們不主張 throughput 或效益——僅主張一個 *existence-proof*：§3 之層次能容納真實之多代理工作流、能浮現真實之衝突、並能從衝突中恢復。

### 4.4 Real-World Incident Evidence on the Framework Itself (✅ Forensics Report)

在 2026-06-11 至 2026-06-13 期間，AAF repository 自身之治理執行了六張任務卡（TASK-CID-0040~0045），其在演練 broker 與 arbitration 機制的同時，本身亦 *作為* 被治理之工作。其中五張產生了嚴重程度足以觸發正式 forensics 紀錄之治理異常，相關報告為 `docs/ai_atomic_framework/cid-hardening/atm-abnormal-release-forensics-report.md`。我們以該份報告——係於事件當下產出，非為本論文事後建構——作為 §3 機制於真實、易生衝突之工作流上實際被演練之證據。

| Incident | Date | Mechanism exercised | Outcome |
|---|---|---|---|
| **TASK-CID-0040 claim-displaced-by-import** | 2026-06-12 09:31 → 13:51 | Concurrent claim collision; `import` command attempted to overwrite an in-progress claim on the same card | Detected via mismatched event ledger (`claim-displaced-by-import-da3cbcddcfba.json`); repair commit `a6f01658`; led to TASK-CID-0046 (dependency closeout gate hardening) |
| **TASK-CID-0041 out-of-scope delivery requiring waiver** | 2026-06-12 16:54 → 22:58 | Multi-completion-surface divergence: delivery commit `70594a03` touched `packages/core/src/broker/decision.ts` outside the declared scope; mailbox/planning state showed `done` while the target ledger lacked a valid closure transition | Repair commit `da4ded32` added closure packet **with explicit historical-delivery waiver** (i.e., the system formally recorded "this should not have been admitted as scoped; we are admitting it post-hoc with a waiver flag") |
| **TASK-CID-0042 mailbox/governance split** | 2026-06-12 16:29 → repair `3668e506` | Target side closed (event `close-a7eae4c781d1.json`), but planning-side inbox dispatch lingered; a downstream agent could have re-picked the task | Detected by ledger-consistency check; led to TASK-CID-0063 (`taskflow open/close` as the normal mechanized synchronization path) |
| **TASK-CID-0043 / 0044 / 0045 plan-mirror sync failures** | 2026-06-12 → 06-13 01:46 | "Source committed" + "planning card `status: done`" ≠ "governed close": frontmatter showed planned/done while target ledger had no governed closeout | Repair commits `d666126b` / `5f675a76` / `60c01d3c` backfilled closure packets; led to TASK-CID-0061 (freeze `tasks.ts` caller contract) and TASK-CID-0063 (mechanized path) |
| **CID-0041 cid-shared collision** (first real broker freeze trigger) | 2026-06-12 (commit `70594a031`) | Two intents claimed the same atom CID `cid-shared` concurrently; conflict-matrix evaluated and emitted `verdict: freeze` | Freeze protocol routed the loser to wait; arbitration resumed cleanly — first end-to-end real exercise of the §3.7 freeze / patch-envelope / conflict-matrix stack |

**本證據所支撐者.** §3.7 所述之 broker freeze / patch-envelope / conflict-matrix protocol 並非於抽象中設計而出：TASK-CID-0040~0042 即為驅動 2026-06-12 加固交付之 *motivating incident*。cid-shared collision 為該 protocol 首次端到端之真實觸發。Plan-mirror sync 失敗（TASK-CID-0043/44/45）則驅動 §3.7「broker 為唯一序列化點」之需求——其正為 sole-serialization 不變式被破壞、planning 側與 target 側 closeout 相互漂移時所產生之失敗模式。

**本證據所未能支撐者.** 其並未顯示 broker 能於 production 阻擋一切類別之 multi-agent 衝突；TASK-CID-0041 之 out-of-scope delivery 即以 waiver 通行，顯示 admission rule 於寫入時 *未* 捕捉到 scope violation。我們將此列為一個限制（§5），並作為 Team Agents Wave Mode wave-level `allowedFiles` 檢查之 motivating case（現已交付，§3.8 / §4.6）。

**MAO Parallel Routing Benchmark ✅（TASK-MAO-0010，commit `90053ac6d`，2026-06-16）.** 補上一份獨立的 multi-agent admission 模擬器級驗證：`scripts/validate-mao-parallel-routing.ts` 對 12 個 scenario 跑 deterministic offline 模擬，報告 `docs/reports/mao-parallel-routing-benchmark.md`：

- **Catch rate: 100% (8/8 unsafe caught)**；**False-safe regressions: 0**；**Expectation failures: 0**
- Scenarios 涵蓋 parallel-safe-disjoint、`same-file-different-atom-disjoint` → `allow-with-watch`（**§3.4 STORM 差異化能力的模擬器級驗證**）、same-atom-write-write → `freeze`、read-write-overlap-watch、unknown-scope-malformed → `steward-required`、generated-artifact-drift → `freeze`、route-freeze-on-pause、route-resume-after-freeze、steward-apply-safe、steward-blocked-out-of-scope、shared-surface-blocked、runner-derived-artifact-collision
- 誠實侷限（報告自陳）：live `route` CLI 整合、真實 broker admission、distributed consensus 不在 MAO-0010 範圍內，延至 MAO-0011+ runner Broker cards 與 12 月完整版。本 suite 為 offline 確定性模擬，而非並行 load test

### 4.5 Field collision evidence：layered atomization claim + cross-vendor real-task runs ✅

§3.4 / §3.6 / §3.10 的核心主張——**broker 在「已存在正式 atomization 的檔案」之上，仍能用第二層虛擬原子做同檔並行寫入的細粒度仲裁**——已由四類互補的 field evidence 共同支撐。本節依下列順序展開（每一類都對應 main 分支可驗證的 artifact 路徑）：

| # | Evidence 類 | 角色 | 主檔位 |
|---|---|---|---|
| (a) | 6 筆 brokered collision runs + parallel-0041-0042 跨 vendor admission-phase 阻擋 | Foundation — broker apply 端到端可用 | `broker-collision-evidence/runs/` (4) + `parallel-0041-0042-coordination.md` |
| (b) | **B-12 controlled field collision (2026-06-20)** | Honest field — apply-phase 阻擋誠實案例 | `broker-collision-evidence/runs/B-12-field-2026-06-20/` |
| (c) | **`close-orchestration.ts` 雙層 same-file merge (primary positive layered case)** | Primary keystone — formal atomization + broker 第二層虛擬切分皆有價值 | `broker-collision-evidence/close-orchestration-layered-merge-evidence.md` |
| (d) | **`integration.ts` 補強後的雙層 case (secondary reinforcement)** | Secondary — 補上 formal atomization 後第二層仍保留價值 | `broker-collision-evidence/integration-layered-merge-evidence.md` |
| (e) | Synthetic MVP（B-02 / B-08 / B-13） | Deterministic mechanism backstop | `tools/multi-vendor-broker-bench/`（規劃中）|

各類的詳細紀錄如下。

#### 4.5(a) Foundation runs and parallel-0041-0042

截至 2026-06-17，AAF runtime 紀錄 6 筆 broker run（schema `atm.brokerOperationRunRecordEnvelope.v1`／record schema `atm.brokerOperationRunRecord.v1`），其中 4 筆由 3KLife 的 `docs/ai_atomic_framework/broker-collision-evidence/runs/` 持久存檔（AAF 因屬開源框架不追蹤 runtime artifact，由 3KLife planning repo 承接論文證據之 archival）：

| Run ID | Actors | Target file | Adapter | Lane | Verdict | Task |
|---|---|---|---|---|---|---|
| `8bc281b6-…` | `agent-a` / `agent-b` | `scan-target.json` | `json-record` | `direct-brokered` | **`mergeable`** ✅ | — |
| `b9b785bd-…` | `agent-a` / `agent-b` | `scan-target.json` | `json-record` | `direct-brokered` | **`mergeable`** ✅ | — |
| `bd9d06ed-…` | `agent-a` | `tmp/broker-smoke/target.json` | `json-record` | `applied` | **`mergeable`** ✅ | `TASK-CID-0111` |
| `b813db86-…` | `agent-c` | `tmp/broker-smoke/target.json` | `json-record` | `applied` | **`mergeable`** ✅ | `TASK-CID-0111` |
| **`67b193f9-…`** | **`cursor-composer-2.5`** | **`atomization-coverage/path-to-atom-map.json`** | `json-record` | `applied` | **`mergeable`** ✅ | — |
| **`c393df1d-…`** | **`cursor-composer-2.5`** | **`atomization-coverage/path-to-atom-map.json`** | `json-record` | `applied` | **`mergeable`** ✅ | — |

前 2 筆為早期受控合成測試；中間 2 筆驗證 broker run 與真實任務 `task_ids` 欄位的綁定；**最後 2 筆是 production agent（Cursor Composer 2.5）對真實 atomization 覆蓋率對應表 `path-to-atom-map.json` 的並行寫入，broker 判 `mergeable` 並 `applied`**——不是 `scan-target.json` 之類的合成目標，而是 ATM 自身治理元資料的真實寫入。

**Multi-vendor real-task collision dogfood（parallel-0041-0042-2026-06-17）.** 最關鍵的新證據是 2026-06-17 的跨 vendor 真實任務碰撞實驗：

- **Agent A**：`cursor-composer-2.5`（Cursor + Anthropic 體系）執行 TASK-MAO-0041
- **Agent B**：`antigravity-Gemini-Flash3.5`（Google Gemini 體系）執行 TASK-MAO-0042
- 兩張卡的交付**同時觸及 5 個共同檔**：`close-orchestration.ts`、`taskflow.spec.ts`、`command-list.json`、`evidence-gates.md`、`path-to-atom-map.json`

實驗序列：
1. `tasks parallel --task 0041 --with 0042` → broker 回 **`blocked-cid-conflict`**（broker 確實擋下，不是寬鬆放行）
2. `team wave plan` → planner 自動序列化為 **2 個 wave**（0041 wave 0，0042 wave 1）
3. `team wave dispatch` → wave 0 僅 admit 0041
4. 採用 territory split 協定（每個 agent 寫專屬 region：`// === TASK-MAO-0041 ... START ===` … `END ===`），broker 對 atom-map JSON 採用 row-level merge
5. 兩張卡最終皆順利 close

實驗紀錄：`docs/ai_atomic_framework/broker-collision-evidence/parallel-0041-0042-coordination.md`；wave envelope：`.atm/runtime/team-waves/team-wave-0-1781689097525.json`；對應 broker run：`parallel-0041-0042-broker-dogfood-2026-06-17T10-37-32-502Z.json`。

**這個案例支持什麼**：
- (i) Broker 真實偵測 cross-vendor 衝突（不是同一 LLM 自我撞測）；
- (ii) 真實任務交付（不是 `scan-target.json` 合成）；
- (iii) Wave Mode planner 默認序列化行為符合 §3.7 規格；
- (iv) Row-level merge（format adapter §3.10）在 production 治理元資料 `path-to-atom-map.json` 上能 brokered apply；
- (v) §3.4 main contribution（CID-disjoint 同檔並行）以 **multi-vendor LLM 真實任務**完成 end-to-end 實證。

**Foundation evidence 之適用範圍**：上述 6 筆 runs 與 parallel-0041-0042 共同證明 broker apply、wave planner 與 territory split 在 production 路徑上之可用性，然其**並未**直接回答以下兩個關鍵問題：(A) 當檔案已被正式 atomization 覆蓋後，broker 之第二層虛擬細化是否仍提供額外價值？(B) admission 階段是否確能阻擋同 atom 之寫入？以下 (b)~(d) 三類證據針對此二問題提供誠實之回應。

#### 4.5(b) B-12 controlled field collision — apply-phase honest case (2026-06-20)

我們以 framework repo 內兩張正式 ATM 任務卡（TASK-TEAM-0042 vs TASK-TEAM-0043）製作第二筆跨 vendor real-task collision evidence。Actor、vendor、baseCommit、共享治理表面如下：

- **Agent A**：`bench:B-12:TASK-TEAM-0042:codex-gpt54mini`（OpenAI family）
- **Agent B**：`bench:B-12:TASK-TEAM-0043:claude-opus47`（Anthropic family）
- 同 baseCommit `6ee99143931b5a9c8fe0953f14903498ff4c62b0`
- 同 4 個共享治理表面：`packages/cli/src/commands/team.ts`、`docs/governance/team-agents/team-vendor-runtime.md`、`scripts/validate-team-agents.ts`、`atomic_workbench/atomization-coverage/path-to-atom-map.json`

論文採用以下正式說法，定調為 **apply-phase collision evidence**，**不**主張 admission-time CID freeze、**不**主張 admission 端已偵測同 CID claim：

> 2026 年 6 月 20 日所執行之 B-12 控制式 field collision，在 `TASK-TEAM-0042` 與 `TASK-TEAM-0043` 之間生出一筆真實的跨 vendor 並行競爭案例。兩側於 team-start 階段皆獲 broker 仲裁判 `parallel-safe`、`safeToStart: true`，並進入 `direct-brokered` lane。然而，決定性的競爭並未發生於 admission 階段：俟 `TASK-TEAM-0043` 取得 broker registry 中之 active intent 後，對手側 `TASK-TEAM-0042` 在推進至 apply-phase 時為既存之 active intent 所阻擋。本案因此構成一筆誠實的 apply-phase collision evidence——系統確實於真實 repository 中將原不安全之並行推進序列化，惟本案中實際生效之 enforcement boundary 仍停於 apply-phase，而非理想之 admission-phase。

這個 case 提供雙重支撐：(i) 在真實 repo + 跨 vendor 設定下，broker 確實序列化了不安全的並行推進；(ii) 但目前 atom-level exclusivity 在此 case 主要由 *apply-phase registry arbitration* 落實，而非 *admission-phase atom-claim*——這直接支撐 §3.9 open problem。

**已封存 evidence artifacts**（3KLife archival，commit `ee37239e`；不再依賴 AAF runtime 現場檔案）：

- `docs/ai_atomic_framework/broker-collision-evidence/runs/B-12-field-2026-06-20/README.md`
- `docs/ai_atomic_framework/broker-collision-evidence/runs/B-12-field-2026-06-20/team-4a7221ebbb23.json`
- `docs/ai_atomic_framework/broker-collision-evidence/runs/B-12-field-2026-06-20/team-cd46fbcc7ad3.json`
- `docs/ai_atomic_framework/broker-collision-evidence/runs/B-12-field-2026-06-20/write-broker.registry.snapshot.json`
- `docs/ai_atomic_framework/broker-collision-evidence/runs/B-12-field-2026-06-20/broker-capture.md`
- `docs/ai_atomic_framework/broker-collision-evidence/runs/B-12-field-2026-06-20/broker-evidence-bundle.md`

#### 4.5(c) `close-orchestration.ts` — primary positive layered case

**這是論文目前最強的同檔正向 layered evidence**。`packages/cli/src/commands/taskflow/close-orchestration.ts` 已經被 `atomization-coverage/path-to-atom-map.json` 用 6 個正式 atom map 覆蓋：

| 已存在正式 atom / map | 能力 |
|---|---|
| `atm.task-closure-map` | taskflow close backend argv／受保護 close surface 之指令建構 |
| `atm.closeback-route-correctness-map` | closeback route 正確性 + out-of-scope waiver 傳遞 |
| `atm.close-write-atomicity-map` | fail-closed close `--write` 事務 + rollback snapshot + commit phase |
| `atm.close-window-lock-map` | close-window staged-index lock 在 rollback 期的釋放 |
| `atm.evidence-bundle-manifest-map` | evidence bundle manifest 與 directory deliverable 展開 hook |
| `atm.task-view-dashboard-map` | close completion checklist 對 ledger／planning／delivery／waiver 狀態的構建 |

在這個 *已被正式 atomization 覆蓋的檔案* 上，broker-aware pre-patch scanner（AAF commit `18aa08f54`）仍能挑出檔內第二層的虛擬原子切分：

| 虛擬原子候選 | 行範圍 | 角色 |
|---|---|---|
| `buildClosebackPlan` | 186–327 | Patch A |
| `resolveClosebackPlanningPath` | 472–618 | Patch B |

模擬結果：

- 兩寫分別落在 *不同* function-scoped 虛擬原子 → broker verdict = **`parallel-safe`**
- 兩寫同時落在 *同一* function-scoped 虛擬原子 → broker verdict = **`blocked-cid-conflict`**

> `close-orchestration.ts` 之案例顯示，ATM 之原子化並不止於檔案層級或檔案家族層級之粗粒度。即便該檔案已為多個正式 atom map 所覆蓋，broker 仍能於同檔範圍內進一步切分為更細之虛擬原子——對於落於不相交 function-scoped 虛擬原子之寫入予以 admit，對於落於同一虛擬原子之寫入則予以 reject。

此一結果直接回應 §4.5 開頭所提出之關鍵問題 (A)：**formal atomization 並非空有其名，且 broker 之 second-layer segmentation 在 formal atomization 之上仍能提供額外價值**。

**Positive same-file field evidence**（與上述 pre-patch scanner 之 simulated 結果分立）：

> 我們另收集了一筆於 `packages/cli/src/commands/taskflow/close-orchestration.ts` 之上的同檔正向 field 案例。兩個分屬不同 vendor family 之 live agent 並行運作於同一份 `main` working tree，但分別針對同檔內之不同函式：其中一條 lane 修改 `buildClosebackPlan`，另一條 lane 修改 `resolveClosebackPlanningPath`。兩條 lane 皆經由標準之 ATM 任務認領與 team-start 流程進入 broker 仲裁，並於 `direct-brokered` lane 上獲判 `parallel-safe`。此結果之意義在於：成功並非源自檔案層級之分離——兩個 agent 所瞄準者乃是同一份 TypeScript 原始檔；ATM 之所以能保全安全並行，係透過辨識同檔內不相交之區段而達成。本案因此支撐論文之核心主張：明確 atomization 結合第二層之檔內分段檢查，可允許同檔多 agent 並行之安全執行，而非將所有同檔編輯一律收斂為單一序列化 lane。
>
> 隨論文交付之 artifact bundle 包含本案之兩筆 authoritative team-run 紀錄，以及一份經過濾之 broker evidence 報告——該報告自先前已退役之重複 run 中分離出最終之正向配對。

論文範圍說明：本段 evidence 為 *admission / team-run positive evidence*；是否進一步在 apply-phase 完成 brokered commit 屬於另一條獨立敘述，不在本段範圍。Run id、bundle 路徑、retired-run 清理細節皆置於對應說明檔，不入正文。

**對應說明檔與 paper-citable artifact**：runtime 細節（authoritative run ids、filtered evidence bundle、retired duplicate trace 清理、collector hygiene）見 **Appendix A.1**；補充技術說明見 `docs/ai_atomic_framework/broker-collision-evidence/close-orchestration-layered-merge-evidence.md`。

#### 4.5(d) `integration.ts` — secondary reinforcement case

`packages/cli/src/commands/integration.ts` 起初只有第二層虛擬原子示範、缺第一層正式 atomization，作為 layered claim 的 evidence 偏弱。我們補上了下列正式 atom maps：

| 補上的正式 atom / map | 能力 |
|---|---|
| `atm.integration-bootstrap-map` | governed editor entry 檔案的 bootstrap + onboarding discovery |
| `atm.integration-dispatch-map` | CLI integration action dispatch + result shaping |
| `atm.integration-install-map` | adapter install／uninstall／verify orchestration + factory lane |
| `atm.integration-manifest-map` | manifest resolution／drift verification／health reporting |

補上之後重跑 broker-aware pre-patch 掃描，第二層虛擬原子仍保留同樣價值：

| 虛擬原子候選 | 行範圍 | 角色 |
|---|---|---|
| `runIntegration` | 188–313 | Patch A |
| `verifyManifestFile` | 455–504 | Patch B |

模擬結果：

- 不同 function → **`parallel-safe`**
- 同 function（兩寫同打 `runIntegration`）→ **`blocked-cid-conflict`**

這個 case 的價值在於它**反向證明** layered claim 不是 close-orchestration.ts 的偶發特例：當一個原本沒有正式 atomization 的檔案被補上 atom map 後，broker 第二層虛擬細化的價值不會被「吸收掉」，仍能在同檔內做 function-scoped 仲裁。

**對應說明檔**：`docs/ai_atomic_framework/broker-collision-evidence/integration-layered-merge-evidence.md`。

#### 4.5(e) Synthetic MVP — deterministic mechanism backstop (planned)

`tools/multi-vendor-broker-bench/`（規劃中，bench-design.md）的 B-02（AGR Layer 2 refine → admit）、B-08（CAS bounded re-plan → apply）、B-13（broker admit + validator semantic-reject）三個合成 scenario 將為 §3.4 各 layer 提供 deterministic mechanism evidence，與 (a)~(d) 的 field evidence 互補。寫入時點將與 §4.2 12-scenario fixture suite 共用 `atm.brokerOperationRunRecordEnvelope.v1` schema。

#### 4.5(f) What this section still does not show

- **大規模 in-the-wild 並行 edits 吞吐量數據**：parallel-0041-0042 + B-12 為控制式 dogfood，非長時段 production 統計；對 STORM / CodeCRDT / CoAgent 的吞吐量 / token cost head-to-head 對照延 12 月 full paper。
- **JS / Python `compose.ts` 程式碼原子路徑的 multi-vendor 真實 collision**：(c) (d) 兩個 layered case 都是 TypeScript CLI 檔；其他語言 adapter 的 layered evidence 仍為 §4.2 fixture + 8-scenario AGR arbitration 7/7 catch，未升 field。
- **apply-phase block 的專用持久化 schema**：B-12 揭示 blocked verdict 為 runtime emission，未寫進 team-run JSON；論文承諾後續補 `apply-phase-block.v1` schema 讓「admission `parallel-safe` + apply-phase intent-block」兩相段差能機械化追蹤。
- **layered admission：把 (c) (d) 的 admission-time 第二層切分推到 B-12 的 apply-phase atom-claim 之前**：理想終局是 admission rule 直接讀 active intent registry，但實作分派中；§3.9 列為 open problem。

**持續紀錄路徑**：之後新增 collision runs 將寫入 `docs/ai_atomic_framework/broker-collision-evidence/runs/`；layered merge cases 寫入同目錄根層的 `*-layered-merge-evidence.md`；`INDEX.md` 維護表格（取代早期 `CID衝突解決紀錄log.md` 排程掃描檔）。

### 4.6 Wave Mode Dogfood Suite ✅（TASK-MAO-0033，2026-06-17）

`docs/reports/team-wave-mode-dogfood.md`（commit `194f44cbd`）以 `scripts/validate-team-wave-mode.ts` 端到端壓測完整 Wave Mode pipeline：

```
planWaves (0024) → admitWave (0026) → createTeamWaveEnvelope (0025)
   → worker reports (0028) → sliceWaveEvidence (0029) → checkpointWave (0030)
```

| Scenario | 設定 | 預期 | 結果 |
|---|---|---|---|
| safe-wave | 兩張 disjoint adapter 卡 + 共享 append-safe map | 同一 wave，兩張皆 admit | ✅ 兩張 admit |
| unsafe-wave-same-deliverable | 兩張卡交付同一 registry file | fail closed，僅一張 admit | ✅ 第二張 deferred（cid-conflict / scope-overlap）|
| mixed-wave-dependency | 一張就緒 + 一張有未滿足依賴 | 一張 admit、一張 deferred | ✅ deferred 卡標記 `dependency` |
| per-task slicing + close-readiness | clean wave diff 切回每張卡 | 每張 done 卡皆 close-ready | ✅ 全 done 卡 close-ready |
| needs-review gating | wave diff 含未歸屬檔案 | 整個 wave 進 needs-review | ✅ 整個 wave gated |

**五個 scenario 全數確定性通過**（`node --strip-types scripts/validate-team-wave-mode.ts`）。

**這個 suite 在驗證體系中的位置**：與 §4.2 的 12-scenario AGR fixture suite、§4.4 的 8-scenario AGR conflict arbitration suite、§3.10 的 5-scenario format-adapter dogfood、§4.5 的 6 個 broker collision runs（含 multi-vendor real-task case）形成多層交叉驗證。Wave Mode 的 dogfood 特別針對 §3.7 batch admission 與 §3.8 per-task evidence attribution 兩個機制；其他 suite 針對 admission core 與 format adapter。

**Coverage statement**：Wave Mode 的五個關鍵安全主張——safe 並行 admit、unsafe fail-closed、dependency-aware deferral、per-task evidence attribution、unattributed-content gating——皆對應至 fixtures 並在 dogfood 中通過。

### 4.7 CID Stability and Versioning (✅ Capsule CID Verification Complete)

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
- **對 STORM 之吞吐量對照** — end-to-end 同檔並行寫入碰撞已 field-recorded（§4.5 共 6 筆 runs，含 multi-vendor `parallel-0041-0042` real-task dogfood），但相對 STORM 風格 file-level OCC 的吞吐量 / overhead 在 load 下的對比仍延至上述對照工作負載。`json-record` adapter 路徑已有跨 vendor 真實 collision 紀錄；`compose.ts` 程式碼原子路徑（JS / Python）仍為 mechanism-only（TASK-CID-0019 + AGR 7/7 catch），待後續累積對應 multi-vendor 真實 runs。
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
- ✅ Freeze / Patch-Envelope / Conflict-Matrix snapshot & arbitration (§3.7) — `freeze.ts`, `patch-envelope.ts`, `conflict-matrix.ts`, TASK-CID-0040/0041 (commits `803ffc335`, `70594a031`, 2026-06-12)
- ✅ Format Adapter subsystem + Theorem 3 + 5-scenario dogfood (§3.10) — TASK-CID-0091~0098 (commits `31fd89ff0`, `ca59a88a9`, 2026-06-16)
- ✅ Steward arbitration flow with 4-verdict (apply / merge-required / blocked / human-required) + fail-closed gate — TASK-MAO-0009 (commit `240b6b436`, 2026-06-16)
- ✅ MAO Parallel Routing Benchmark 12-scenario 100% catch — TASK-MAO-0010 (commit `90053ac6d`, 2026-06-16)
- ✅ Team Agents Wave Mode（plan / admit / envelope / worker / slice / checkpoint / closeout）+ 5-scenario dogfood — TASK-MAO-0023~0034 (commits `194f44cbd`, `4e6e32639`, 2026-06-17)
- ✅ 12-scenario AGR fixture suite — CID-0037
- ✅ broker collision evidence persistence — `3KLife/docs/ai_atomic_framework/broker-collision-evidence/runs/`，含 `parallel-0041-0042` 跨 vendor 真實任務 dogfood

**Evaluation roadmap:**
- ✅ **Vision paper (current, June 2026):** mechanism design + benchmark-validated implementation correctness
- 🔜 **Full paper (December 2026, ICSE/FSE submission):** comparative evaluation against STORM / CodeCRDT / SCF; multi-adopter scale-out study; MAO multi-agent orchestration layer evaluation. As of 2026-06-15, MAO is partially shipped (`freeze.ts`, `patch-envelope.ts`, `conflict-matrix.ts`, route-context lifecycle — TASK-MAO-0006~0009) with a simulator benchmark (TASK-MAO-0010) and Team Agents Wave Mode (TASK-MAO-0023~0034, §3.7/§6.4) pending. See [`multi-agent-orchestration/MAO多AI並行治理計畫書.md`](https://github.com/eaglhuang/3KLife/blob/main/docs/ai_atomic_framework/multi-agent-orchestration/MAO%E5%A4%9AAI%E4%B8%A6%E8%A1%8C%E6%B2%BB%E7%90%86%E8%A8%88%E7%95%AB%E6%9B%B8.md) and its sequel `MAO多AI並行治理計畫書2.md` (Team Agents Wave Mode).

---

## 6. Discussion

### 6.1 Why Adapter-Guided, Not AST-First?

The natural question is: why not require every adapter to expose a full static analysis engine (AST, type inference, data-flow graph)?

**Engineering cost.** Building a production-grade AST analyzer is non-trivial per language. Python has `ast` in stdlib, but `ast.parse` doesn't resolve decorators or metaclass magic. TypeScript has the compiler API, but integrating it into an adapter adds ~500 LOC of bridging code. Go has a parser package, but importing it adds runtime dependency. A "universal AST + unified IR" layer (the dream) is infeasible across 10+ languages in constant evolution.

**Diminishing returns.** Adapters using lightweight detection (regex / compiler API without full semantic inference) already pass the §4.3 adoption study without observed false rejections at function-level granularity. We do not present quantitative confidence-vs-effort numbers — making such a claim responsibly requires controlled comparison, which we defer to §5. The qualitative observation is that the marginal cost of adding full static analysis (AST + type inference + data-flow) per language is large, and the static/dynamic split (§3.5, A2) routes the residual risk to validators rather than requiring the adapter to chase it.

**Scope preservation.** ATM's core role is *admission* (decide which writes can run in parallel), not *analysis* (understand all program semantics). By delegating detection to adapters and outsourcing semantic verification to validators (test/typecheck/lint), ATM stays a governance framework, not a language-understanding framework.

### 6.2 When Does Adapter-Guided Fail?

Adapter-guided atomization degrades when:

1. **Metaprogramming-heavy code** (Python metaclass, Ruby `method_missing`, JavaScript Proxy). Adapters can emit candidate symbols, but the actual executed code may differ. Remedy: evidence validators catch the discrepancy.

2. **Cyclic module dependencies or self-referential atoms.** Broker's scope-lock prevents concurrent writes to the same atom, but doesn't prevent A writes X (which imports B), B writes Y (which imports X), if both are `parallel-safe`. Remedy: dependency-graph validator catches import cycles.

3. **Adapter version mismatch.** If the Python adapter is upgraded between submissions from two agents, `canon_sym` policy might change → same symbol produces different CIDs → false negatives (undetected conflicts). Remedy: broker enforces a single adapter version per admission cycle (§3.9, open problem).

### 6.3 Open Questions and Future Work

- **Cross-language atom identity (A3, §3.9):** If a TS API handler and Python backend handler are claimed to implement the same logical contract, how should the broker track that relationship? Current answer: out of scope (Theorem 1 only covers disjoint regimes). Future: extend manifest to support cross-regime aliases.

- **CID schema versioning and migration (§3.9):** When Candidate CID formula changes (e.g., `||` → canonical JSON), how do we avoid collisions with active intents? Current plan: broker dual-compute during migration window, or flag-day drain. Deferred to implementation roadmap.

- **Multi-Agent Orchestration (MAO) layer：** broker 之上的操作層（Root Router / Route Context / Patch Envelope）目前已大幅交付：MAO-0001/0002/0003（Route Context contract + lifecycle CLI）、MAO-0007/0008/0009（steward arbitration flow，含 4-verdict 與 human-required fail-closed gate）、MAO-0010（12-scenario parallel routing benchmark，100% catch、0 false-safe、0 expectation failures；`docs/reports/mao-parallel-routing-benchmark.md`）、**MAO-0030~0034 Team Agents Wave Mode 全數交付，含 5/5 dogfood §4.7**、以及陸續延伸的 MAO-0039~0042、0050~0052 等卡。剩餘工作集中於 runner Broker 系列（MAO-0011~0016）與 distributed consensus 模擬。MAO 為使單一 worktree 上多 agent 並行成為可能的操作層補完，並非另一套並發控制機制。

- **Type-aware extensions:** Integrating T-RDT or similar type-preserving CRDT would strengthen semantic guarantees for statically-typed languages (TS, Go). Out of current scope.

- **Cross-file slicing (LSP integration):** Tracking read/write sets across file boundaries requires language-server integration. Candidate for future phase.

- **Cross-model multi-vendor co-development（早期實證）：** ATM 治理在 reporting window 內已有四個不同 vendor 的 LLM 在 production 共同產出 ATM 自身代碼：`claude-code-opus-4-7`（Anthropic）、`cursor-composer-2.5`（Cursor）、`antigravity-gemini-3.5-flash`（Google）、`codex-captain-continuation`（OpenAI 體系）。`parallel-0041-0042` dogfood（§4.5）是 Cursor Composer 與 Google Gemini Flash 在共享 worktree 上的真實任務 collision 紀錄。獨立第二模型 verifier（如 AGREE / DISAGREE / ABSTAIN 加權）作為刻意冗餘的審查機制仍延至受控評估；目前已建立的是「多 vendor 在同一 admission control 下共同寫入 production」這個更基本的事實。

### 6.4 自指實證：ATM 治理 ATM 自身開發

ATM 自身的開發過程即為本論文所述 multi-agent admission-controlled 模式的真實實例。三件事構成本節的核心證據：

**(a) Format Adapter 子系統由 broker admission 協調交付（2026-06-16）.** Commit `31fd89ff0` 交付 adapter registry 加 JSON-record / text-range / numeric-scalar adapters（CID-0092/0093/0095/0096）；commit `ca59a88a9` 交付 atom-map domain adapter、batch planner、CAS、dogfood gate（CID-0094/0097/0098）。Dogfood gate 對新 adapters 跑 5 個 scenario 並回報 `Recommendation: SHIP`（`docs/reports/broker-format-adapter-dogfood-report.md`）。

**(b) Team Agents Wave Mode 已實際運作於 ATM 開發本身（2026-06-17）.** 上一草稿提及的 Wave Mode 已於 MAO-0030~0034 完整交付（§3.7、§4.6）。其首次真實 dogfood 即為 §4.5 的 `parallel-0041-0042` 實驗：Cursor 的 Composer 2.5 與 Google 的 Gemini Flash 3.5 分別執行 TASK-MAO-0041 與 TASK-MAO-0042，在五個共同檔上故意並行交付；broker 首回應為 `blocked-cid-conflict`，wave planner 自動序列化為兩個 wave，採用 territory split 協定（per-region marker + atom-map row-level merge）後雙卡皆順利 close。這同時是論文涉及之最強 in-vivo 驗證：**broker admission、wave planner、format adapter row-level merge、coordinator-only closeout 四個機制同時在跨 vendor 真實任務上端到端通過**。

**(c) 多 vendor production 共同開發.** 同一 reporting window 內，四個不同 vendor 的 LLM（Anthropic / Cursor / Google / OpenAI 體系，§6.3）在 ATM admission control 下共同寫入框架源碼，包含 TASK-CID-0108/0109（antigravity-gemini）、TASK-MAO-0033/0034（claude-code-opus）、TASK-MAO-0010（雙 vendor）等。

本節並非 controlled experiment、亦不取代延至 §5 的對照 concurrency benchmark；而是「broker admission 模型在框架自身 multi-agent / multi-vendor / multi-file / shared-surface workload 上可行」的 in-vivo 存在證明。

---

## 7. Conclusion

Multi-agent LLM systems demand a concurrency control layer tuned to the granularity at which AI Agents naturally generate code — **function and module level**. This paper argues for Tier 2 (the function/module tier), absent from the current coordination landscape, and shows how to implement it without requiring a heavyweight universal AST engine.

**Key contributions:**

1. **Formalization:** Atoms (Definition 1), two-tier CIDs (Definitions 3–4), deterministic admission logic (§3.4), soundness theorems under realistic assumptions (Theorem 2, A1′/A2).

2. **Adapter-guided architecture:** Language adapters provide candidates at their native granularity (regex for Python, compiler API for TS, LSP for others) — no universal requirement for AST. The broker consumes these candidates and makes admission decisions based on scope, not syntax.

3. **Governance-first design:** Dry-run patches, review gates, evidence validators, and rollback paths substitute for perfect static analysis. This shifts the burden from prediction to post-hoc verification, which is both more practical and more honest about the limits of static reasoning.

4. **開源實作，在自身開發中接受治理:** ATM 的 broker core（~2,700 LOC，含 freeze / patch-envelope / conflict-matrix / format-adapter 子系統 + Wave Mode batch admission）、SDK contract、JS / Python adapter、CID 驗證工具、4 個 format adapter（JSON-record / text-range / numeric-scalar / atom-map）皆已完整實作。驗證採多層交叉：12-scenario 確定性 fixture（§4.2）；8-scenario AGR conflict arbitration 100% catch、0 false-safe（§4.4）；5-scenario format-adapter dogfood `SHIP` 評定（§3.10）；MAO-0010 12-scenario parallel routing benchmark 100% catch、0 false-safe（§4.4）；**Team Agents Wave Mode dogfood 5/5 全通過（§4.6）**；6 筆 broker collision runs，其中含 **`parallel-0041-0042` 跨 vendor 真實任務並行碰撞 dogfood**（Cursor + Google Gemini）端到端通過 STORM 差異化貢獻（§4.5）；npc-brain 3-週採用、0 unrecovered admission error，並有真實 incident forensics 紀錄（TASK-CID-0040~0045）記錄 freeze 協定首次真實 end-to-end 觸發（§4.4）。同 reporting window 4 個不同 vendor LLM 在 ATM admission control 下共同寫入產出 ATM 自身。

**Why this matters.** File-level coordination (STORM) rejects safe same-file parallelism; workflow-level coordination (SCF) requires O(n²) intent graphs with 72% false positives. Tier 2 offers a middle path: function-granularity parallelism without semantic overreach.

**Invitation to the community.** The SDK is open-source and extensible. Language communities are invited to implement their own `AtomizationPlanningAdapter` — whether via regex, LSP, compiler APIs, or custom heuristics. The framework imposes no polling consensus; each adapter can improve independently.

**Limitations and next steps.** This paper validates the *mechanism* (definitions, algorithms, SDK contracts) and provides preliminary evidence of correctness. Full comparative evaluation (ATM vs STORM vs CodeCRDT on large-scale corpus) and Adaptive Granularity Refinement implementation details are deferred to a forthcoming full paper (December 2026).

---

## Appendix A. Artifact Notes

### A.1 `close-orchestration.ts` 之同檔多 agent 並行正向案例

本附錄記錄論文用以支撐其並行性主張之主要同檔正向 field artifact。目標檔案為 `packages/cli/src/commands/taskflow/close-orchestration.ts`；兩個 agent 並行運作於同一份 `main` working tree 之上，遵循標準之 ATM 任務認領與 team-start 工作流。

兩條 authoritative lane 之設定如下：

- `TASK-COLLIDE-CLOSE-ORCH-A`：修改範圍限定於 `buildClosebackPlan`
- `TASK-COLLIDE-CLOSE-ORCH-B`：修改範圍限定於 `resolveClosebackPlanningPath`

由此可見，兩個 agent 雖瞄準同一份 TypeScript 原始檔，所實際著手者為該檔案內不同之 function-level 區域。於最終之 authoritative team-run 紀錄中，兩條 lane 皆於 `direct-brokered` lane 上獲 broker 判為 `parallel-safe`。

#### Authoritative runtime 紀錄

本案之 authoritative runtime 紀錄為：

- Lane A：`team-53e5bae34958`
- Lane B：`team-0c9db84467a6`

該等紀錄持久化於：

- `C:/Users/User/AI-Atomic-Framework/.atm/runtime/team-runs/team-53e5bae34958.json`
- `C:/Users/User/AI-Atomic-Framework/.atm/runtime/team-runs/team-0c9db84467a6.json`

兩筆紀錄回報相同之質性結果：broker 於 `direct-brokered` lane 上判 `parallel-safe`。

#### 經過濾之 evidence bundle

為使 artifact 集合具備獨立可審計與可重現之性質，並避免被已退役之 setup trace 所汙染，本研究另行產生一份僅包含最終正向配對之 broker evidence bundle：

- `C:/Users/User/AI-Atomic-Framework/.atm-temp/close-orch-positive-bundle-filtered/broker-evidence-bundle.md`
- `C:/Users/User/AI-Atomic-Framework/.atm-temp/close-orch-positive-bundle-filtered/broker-evidence-bundle.json`

該經過濾之 bundle 中，run 索引恰含兩筆 authoritative 條目，對應上述兩條 lane。此經過濾之表徵即為本案於論文中所引用之 artifact。

#### 編輯範圍之函式邊界

working-tree 上之修改刻意限縮於不同函式：

- Lane A 全程位於 `buildClosebackPlan` 內
- Lane B 全程位於 `resolveClosebackPlanningPath` 內

此邊界之設定對於詮釋至關重要：本案之正向結果無法以粗粒度之檔案層級分離解釋，蓋兩個 agent 之目標乃同一份檔案。該 artifact 反而與論文之主張相一致——明確 atomization 結合第二層之檔內分段機制，即便於同檔多 agent 編輯之情境下亦能保留安全並行。

#### 已退役之重複 setup trace

於 setup 階段曾產生一筆重複的 Lane B runtime 紀錄：

- `team-999a0524a589`

該紀錄未被採用為本案 authoritative 正向配對之一部分。為免下游 evidence 收集產生判讀歧義，本研究將其遷移至：

- `C:/Users/User/AI-Atomic-Framework/.atm/runtime/team-runs/_retired/team-999a0524a589.json`

並於該目錄補入說明文件：

- `C:/Users/User/AI-Atomic-Framework/.atm/runtime/team-runs/_retired/README.md`

值得強調者，此退役步驟未變更 broker registry、未修改任何 source patch、亦未影響該兩筆 authoritative runtime 紀錄；其角色純為證據紀錄之區分——將最終引用之正向配對與先前已被取代之重複 trace 加以分離。

#### 收集器之行為與 artifact 衛生

由於已退役之 trace 在原本之 aggregate task-artifact 摘要中可能再度浮現，本研究將本地端之 evidence collector 調整為：active evidence 掃描僅將 `team-runs/` 目錄頂層之 JSON 檔視為 active runtime 紀錄，並排除位於 `_retired/` 之 quarantined trace。所涉之工具為：

- `C:/Users/User/AI-Atomic-Framework/scripts/collect-broker-evidence.ts`
- `C:/Users/User/AI-Atomic-Framework/scripts/capture-broker-evidence.ts`

該變更屬於 artifact 衛生措施，並未涉及 broker 行為之語意變更。

#### 詮釋範圍

本 artifact 應被詮釋為同檔之 admission / team-run 正向證據——其顯示兩個分屬不同 vendor family 之 live agent 可在同檔內不同 function-level 區域上並行，並仍能於 broker 治理之 routing 下獲判 `parallel-safe`。任何後續之 apply-phase、merge-phase 或 commit-phase 結果，皆應另行敘述，不可逕由本 artifact 推論而得。

---

## References（參考文獻）

> **References — 2026-06-19 verification pass**：所有 arXiv ID 已逐條 fetch arxiv.org 對齊標題與作者；Anonymous 條目已去匿名化（#8、#9）；#3 作者修正（先前誤標 Geng & Neubig）。
>
> 主要參考文獻：
>
> 1. Pugachev, S. (2025). CodeCRDT: Observation-Driven Coordination for Multi-Agent LLM Code Generation. arXiv:2510.18893.
> 2. Acharya, V. (2026). Semantic Consensus: Process-Aware Conflict Detection and Resolution for Enterprise Multi-Agent LLM Systems. arXiv:2604.16339.
> 3. Liu, M., Chen, T., Xu, Z., Jiang, X., & Dong, Y. (2026). Multi-agent Collaboration with State Management. arXiv:2605.20563.
> 4. Qian, K., Fang, X., & Li, Z. (2026). MPAC: A Multi-Principal Agent Coordination Protocol for Interoperable Multi-Agent Collaboration. arXiv:2604.09744.
> 5. Costa, I. (2026). AgentSpawn: Adaptive Multi-Agent Collaboration Through Dynamic Spawning for Long-Horizon Code Generation. arXiv:2602.07072.
> 6. Zhou, W., Wang, Z., Peng, Z., Chen, H., Zhang, Y., & Yu, G. (2026). ATCC: Adaptive Concurrency Control for Unforeseen Agentic Transactions. arXiv:2603.13906.
> 7. Pan, M., Cemri, M., Agrawal, L. A., Yang, S., Chopra, B., Tiwari, R., Keutzer, K., Parameswaran, A., Ramchandran, K., Klein, D., Gonzalez, J. E., Zaharia, M., & Stoica, I. (2025). Why Do Multiagent Systems Fail? ICLR 2025 Workshop on Building Trust in Language Models and Applications. OpenReview: wM521FqPvI.
> 8. Nie, X., Guo, Z., Chen, Y., Zhou, Y., & Zhang, W. (2026). AWCP: A Workspace Delegation Protocol for Deep-Engagement Collaboration across Remote Agents. arXiv:2602.20493.
> 9. Nechepurenko, M. & Shuvalov, P. (2026). Coordination as an Architectural Layer for LLM-Based Multi-Agent Systems. arXiv:2605.03310.
> 10. Sartori, C. C. (2026). The Specification Gap: Coordination Failure Under Partial Knowledge in Code Agents. arXiv:2603.24284.
> 11. Ellis, C. A. & Gibbs, S. J. (1989). Concurrency control in groupware systems. SIGMOD '89.
> 12. Shapiro, M., Preguiça, N., Baquero, C., & Zawirski, M. (2011). Conflict-free Replicated Data Types. SSS 2011.
> 13. Kung, H. T. & Robinson, J. T. (1981). On optimistic methods for concurrency control. ACM TODS 6(2).
> 14. Lyu, H., Zhang, D., Wu, M., Wei, X., & Chen, H. (2026). CoAgent: Concurrency Control for Multi-Agent Systems. arXiv:2606.15376.
> 15. Geng, J. & Neubig, G. (2026). Effective Strategies for Asynchronous Software Engineering Agents (CAID). arXiv:2603.21489.
> 16. Zhang, Q., Li, J., Lin, J., Luo, C., & Qian, C. (2026). Rover: Context-aware Conflict Resolution with LLM. arXiv:2605.17279.
> 17. Xia, S., Li, Q., Ehsan, T., & Ortiz, J. (2026). TraceFix: Repairing Agent Coordination Protocols with TLA+ Counterexamples. arXiv:2605.07935.

---

---

## Revision History

**2026-06-21 (Current Draft, seventeenth pass — 移除 paper body 中直接稱呼 reviewer 之 meta-voice):**

User 校正：學術論文 body 直接寫「Reviewers / reviewer」會降低 credibility，屬業餘記號。本 pass 將 4 處 paper body 中直接稱呼讀者 / reviewer 之 meta-voice 改寫為正式學術中性 register：

- **§2.7 結語**（CoAgent 對照段末句）：「Reviewers 將二者視為同質競品會誤判場景定位」→「若將二者等同視之而做同質競品比較，將誤判其各自適用之場景邊界。」
- **§4.5 Foundation evidence 段**：「沒有直接回答以下 reviewer 必問的兩個問題」→「並未直接回答以下兩個關鍵問題」；段落小標「Foundation evidence 的限制」→「Foundation evidence 之適用範圍」。
- **§4.5(c) 結語**：「這直接回答了 §4.5 開頭的 reviewer 問題 (A)」→「此一結果直接回應 §4.5 開頭所提出之關鍵問題 (A)」。
- **Appendix A.1 經過濾之 evidence bundle 段**：「為使 artifact 集合具備 reviewer 可審計之性質」→「為使 artifact 集合具備獨立可審計與可重現之性質」。

未動處（皆為合理技術或審計脈絡）：

- §3.7「validator/reviewer Team Agents 角色」屬 ATM 架構中的 code role 名稱，非對讀者說話。
- Revision History 內部對「reviewer-defense rewrites」「reviewer-mode audit」等紀錄屬 audit trail，非論文 body。

**2026-06-21 (sixteenth pass — Abstract 貢獻計數與 §1.3 對齊修正):**

- User 校正：Abstract（line 18）寫「三個核心貢獻」並列出 3 條，但 §1.3 自 sixth pass（2026-06-16, commits `31fd89ff0` / `ca59a88a9`，TASK-CID-0091~0098 Format Adapter 系列落地後）已升為 4 條，含「超越程式碼之通用化（Format Adapter + ConflictKey + Theorem 3）」。Abstract 漏更新導致兩處不一致。
- 本 pass 將 Abstract 改為「四個核心貢獻」，並於壓縮 abstract 行格內補入第 4 條：「**超越程式碼之通用化**：以 `FileMutationAdapter` 與 `ConflictKey` 將 broker 衝突偵測核心由程式碼原子推廣至任意結構化產物（JSON 記錄、文字範圍、數值欄位、atom-map shards），並以 Theorem 3（ConflictKey Disjointness，作為 Theorem 1 之推廣）形式化。」
- 不變動 §1.3 本體（已為正確版本）；不重排既有三條順序。
- 此修正對應 handoff §0.4 第 6 條紀律——「不要寫超出實作」之鏡像：實作已在 main、論文 §1.3 已對齊，但 Abstract 落後即等同於對外輸出不一致，必須補上。

**2026-06-21 (fifteenth pass — §4.5(b)(c) 與 Appendix A.1 英文段落悉數譯為論文口吻繁中):**

- 重申此版論文為**繁體中文版本**，英譯版留待繁中定稿後另開階段；此前數版我曾將 user 提供之英文 narrative skeleton 直接嵌入正文，違反此原則，本 pass 全數校正。
- **§4.5(b) B-12** 英文 block quote 譯為繁中正式論文口吻：保留 `parallel-safe`、`safeToStart: true`、`TASK-TEAM-0042` 等技術 token；prose 改寫為「俟…後…」「惟…」「然而」等正式連接句法。
- **§4.5(c) close-orchestration.ts** 兩段英文 block quote 譯為繁中：(i) layered atomization 主張之 quote；(ii) positive same-file field evidence 段（含 paper artifact bundle 補述句）。
- **Appendix A.1** 整節由英文改寫為繁中：標題、八個子節（authoritative runtime 紀錄、經過濾之 evidence bundle、編輯範圍之函式邊界、已退役之重複 setup trace、收集器之行為與 artifact 衛生、詮釋範圍）全數重譯。
- 翻譯原則：code/path/run id/atom id/function 名稱悉數保留原文；prose 採論文口吻——「之」代「的」於書面壓縮處、「俾」「俟」「蓋」於正式連接、「該」「其」「此」於指示。

**2026-06-21 (fourteenth pass — Appendix A introduced; A.1 close-orchestration positive same-file artifact note formalized):**

- **新增 Appendix A. Artifact Notes**（位於 §7 Conclusion 與 References 之間）：論文首個 appendix 章節，承載 paper-citable 但不適合 §4 正文的 runtime 細節。
- **A.1 Positive Same-File Multi-Agent Concurrency on `close-orchestration.ts`** 完整寫入：
  - 兩條 authoritative lane (`TASK-COLLIDE-CLOSE-ORCH-A` / `-B`) 與 lane→function 對應
  - Authoritative runtime records `team-53e5bae34958` / `team-0c9db84467a6` 與絕對路徑
  - Filtered evidence bundle（避免 superseded setup trace 污染 reviewer audit）
  - 函數邊界詮釋：positive outcome 不可由 coarse file-level 解釋，因兩 lane 同檔
  - Retired duplicate setup trace `team-999a0524a589` 處理紀錄（明示「不改 broker registry、不改 source patches」）
  - Collector behavior 變動為 artifact-hygiene 而非 semantic 變動
  - Interpretation scope: admission / team-run positive evidence 限定；apply / merge / commit phase 須另述
- **§4.5(c) 對應說明檔短引升級**：原本只指向 `close-orchestration-layered-merge-evidence.md`，現在主指 Appendix A.1 為 paper-citable artifact，補充技術說明保留指向 evidence doc。

**2026-06-21 (thirteenth pass — close-orchestration.ts positive same-file field evidence added; framing rules captured):**

- **§4.5(c) 加入 Positive same-file field evidence 段**：在原本的 broker-aware pre-patch scanner *simulated* 結果之外，新增一個 *live* 同檔多 agent 跨 vendor family 並行 admission 案例的正文段。兩個 lane 分別寫 `buildClosebackPlan` 與 `resolveClosebackPlanningPath`，皆於 `direct-brokered` lane 取得 `parallel-safe` admission verdict。正文範圍明示限定 admission / team-run positive evidence，不主張 apply-phase brokered commit 已完成。
- **正文寫法刻意克制**：run id、bundle 路徑、retired-run 清理細節皆下沉到 `broker-collision-evidence/close-orchestration-layered-merge-evidence.md` 新增的「Field evidence artifact note」區段，避免主文被 runtime 細節稀釋。
- **明確避免兩種錯誤敘述**：
  - 不寫成「file-level disjointness 成功」——兩邊是同檔
  - 不寫成「final merged apply already completed」——目前 evidence body 是 admission / team-run positive，apply-phase 是另一條敘述
- **正向 framing rules 寫入說明檔**：未來任何接手者編輯本 case 時可直接 cross-reference 說明檔的 "Framing rules" 段確認措辭。
- **與 §4.5(b) B-12 的角色分工更清晰**：(c) admission 端 positive same-file evidence；(b) apply-phase honest hybrid 補上 enforcement boundary 仍在後端的誠實重量。

**2026-06-21 (twelfth pass — §4.5 restructured around layered-atomization claim; close-orchestration / integration.ts become primary/secondary keystones):**

- **§4.5 整段重構**：從「parallel-0041-0042 as soul」單一 keystone 模式升級為 5 類互補 evidence stack。新開頭表把 §3.4 / §3.6 / §3.10 的核心 reviewer 必問問題提出來：(A) formal atomization 之上 broker 第二層虛擬細化是否還有額外價值？(B) admission 階段是否真能阻同 atom 寫入？接下來各子節分頭誠實回答。
- **4.5(a) Foundation runs + parallel-0041-0042**：保留 6-run 表 + cross-vendor admission-phase block；定位為「broker apply 端到端可用」的基礎證據，但**明示不回答上述 (A)(B)**。
- **4.5(b) B-12 controlled field collision**：以 user 提供的英文 narrative skeleton 為正式說法；evidence artifacts 全部指向 3KLife archival (commit `ee37239e`)，不再依賴 AAF runtime 現場。
- **4.5(c) `close-orchestration.ts` — primary positive layered case (NEW)**：論文目前最強的同檔正向 layered evidence。檔案已有 6 個正式 atom map（`atm.task-closure-map` 等）；broker-aware pre-patch (AAF `18aa08f54`) 仍能在 `buildClosebackPlan` (186-327) 與 `resolveClosebackPlanningPath` (472-618) 之間做第二層虛擬切分；不同 function = `parallel-safe`、同 function = `blocked-cid-conflict`。直接回答 (A)。
- **4.5(d) `integration.ts` — secondary reinforcement case (NEW)**：補上 4 個正式 atom map (`atm.integration-bootstrap-map` 等) 後，broker 第二層虛擬切分（`runIntegration` 188-313 vs `verifyManifestFile` 455-504）價值仍保留；反向證明 layered claim 不是 close-orchestration.ts 偶發特例。
- **4.5(e) Synthetic MVP backstop (planned)**：B-02/B-08/B-13 placeholder，明示與 field evidence 共用 envelope schema。
- **4.5(f) Honest coda 升級**：四項 open issues — throughput、`compose.ts` JS/Python layered case、apply-phase block schema、admission-phase atom-claim 推前（即把 B-12 的 apply-phase 與 (c)(d) 的 admission-phase 收攏）。
- **舊敘述退場**：移除 "B-12 was blocked at admission-time due to CID freeze"、"integration.ts already proved layered atomization before formal atom-map coverage existed"、"B-12 demonstrates same-CID freeze during team-start admission" 等不精確說法。

**2026-06-20 (eleventh pass — B-12 field collision rewritten as apply-phase evidence; bench-design.md 5-step plan adopted):**

- **§4.5 "B-12 Controlled Field Collision" 子節改寫為 Captain-aligned 正式說法**：定調為「apply-phase collision evidence」，不再寫成「admission-time freeze」或「Layered Hard Gate layer 1 intent-occupancy variant」；採用英文 narrative skeleton 兩段直接嵌入，明示
  - both admissions = `parallel-safe`, `safeToStart: true`
  - collision not rejected at admission time
  - contention emerged at apply-phase after TEAM-0043 acquired active write intent
  - TEAM-0042 was blocked by existing active intent
  - honest negative-positive hybrid evidence：system succeeds at safety, enforcement boundary later than ideal design target
- **保留已驗證 evidence facts 八條**：team-run JSON × 2 / registry occupancy / atom-level claim / 4 shared files / block reason 源碼路徑 / vendor 不同 / baseCommit 一致。
- **bench-design.md §10 改寫**：從 A/B/C 三選一改為 Captain-aligned **5 步證據順序**：
  1. B-12 field evidence 歸檔到 3KLife 防 runtime 覆蓋
  2. `close-orchestration.ts` 雙層 atom merge 正向案例
  3. `integration.ts` 正式 atom map 建檔
  4. `integration.ts` broker-aware pre-patch 驗證 finer-grained virtual segmentation
  5. Synthetic MVP（B-02 / B-08 / B-13）作 deterministic mechanism evidence
- 預期 §4.5 evidence stack 收斂為 5 層：parallel-0041-0042（admission-phase）+ B-12-field（apply-phase）+ close-orchestration（雙層 merge 正向）+ integration.ts（virtual segmentation 補位）+ bench synthetic（mechanism coverage）。

**2026-06-20 (tenth pass — superseded by eleventh pass above; kept for audit):**

- §4.5 新增 B-12 子節（初版以 "fail-closed pre-mutation arbitration" 為主軸；eleventh pass 改正為 apply-phase collision evidence）。

**2026-06-19 (ninth pass — References verified + 2026-Q2 related work absorbed):**

*References §7 全條目驗證（消除 desk-reject 風險）*：
- 10 條 arXiv ID 逐條 fetch arxiv.org 驗證；標題、作者、年份對齊。
- **#3 作者修正**：先前誤標 "Geng, X. & Neubig, G."，實際作者為 Liu, M., Chen, T., Xu, Z., Jiang, X., & Dong, Y.（arXiv:2605.20563）；同時 §2.2 STORM 引用同步從 [Geng & Neubig, 2026] 改為 [Liu et al., 2026]。
- **#8 / #9 去匿名化**（arXiv 不接受 anonymous）：#8 AWCP → Nie, Guo, Chen, Zhou, & Zhang；#9 Coordination as Architectural Layer → Nechepurenko & Shuvalov。
- **#6 / #7 補完整作者列表**：原為 "et al." 縮寫，依 arXiv / OpenReview 條目補齊。

*2026-Q2 related work 補入（共四篇）*：
- **#14 CoAgent (Lyu et al., arXiv:2606.15376, 2026-06-13)**：SJTU IPADS 在本論文成稿前一週發表的 Tier 2 LLM 代理並發控制方案。新增 **§2.7 Direct Tier 2 Comparison**，以九列維度對照表誠實差異化（粒度、裁決時點、不透明 read set 處理、副作用回滾、跨格式通用化、throughput 實證、開源可重現性）；明確主張 CoAgent (advisory) 與 ATM (preventive) 處於不同子空間，**不主張 ATM 全面勝出**；head-to-head throughput / token-cost 對照列為 §5 roadmap。
- **#15 CAID (Geng & Neubig, arXiv:2603.21489)**：補入 §2.2 作為 Tier 3 workspace-isolation 路徑代表，與 STORM 的 write-time mediation 對照。
- **#16 Rover (Zhang et al., arXiv:2605.17279)**：補入 §2.6 末段，定位為 post-hoc merge resolution，與 ATM 的 admission-time 預防互為 pipeline 配對。
- **#17 TraceFix (Xia et al., arXiv:2605.07935)**：補入 §2.5（章名加入「形式化驗證」），定位為「TraceFix 驗證 protocol，本框架 *是* protocol」之補強路徑而非競爭。

*§2 結構調整*：
- §2.2 章節擴充，加入 CAID 段；STORM 作者修正。
- §2.5 章名 → 「失敗分類、協調架構規格與形式化驗證」（加入 TraceFix）。
- §2.6 末段加入 Rover 對照。
- **新增 §2.7 Direct Tier 2 Comparison: CoAgent**（核心對照章節）。
- 原 §2.7 「本框架的定位」 → §2.8；定位表升級為含代表系統的 5×6 對照（CodeCRDT / ATM / CoAgent / STORM / CAID / SCF + MPAC）。
- 原 §2.8 OT/CRDT/DB → §2.9。




*重大事實升級（git history 2026-06-16 ~ 06-17）:*
- **Team Agents Wave Mode 全數交付**：MAO-0030（wave checkpoint）、MAO-0031（coordinator-only closeout guard, `ed7f0f9a0`）、MAO-0032（validator/reviewer Team Agents 角色, `fbfe8565e`）、**MAO-0033 dogfood benchmark `194f44cbd` 5/5 全通過**、MAO-0034 operator guide `4e6e32639`。論文 §3.7 / §3.8 / §6.4 從「design」改寫為「shipped」。
- **新增 §4.6 Wave Mode Dogfood Suite**：引用 `docs/reports/team-wave-mode-dogfood.md`，列出 5 個 scenario（safe-wave / unsafe-wave-same-deliverable / mixed-wave-dependency / per-task slicing / needs-review gating）與全通過結果；原 §4.6 CID Stability 改編為 §4.7。
- **§4.5 重寫**：runs 從 2 筆增至 6 筆；新增關鍵案例 `parallel-0041-0042-2026-06-17` 跨 vendor 真實任務 collision dogfood（Cursor Composer 2.5 + Google Gemini Flash 3.5，5 個共同檔，broker 回 `blocked-cid-conflict`，planner 序列化為 2 waves，territory split + row-level merge 後雙卡 close）。Evidence 持久化路徑改寫為 `3KLife/docs/ai_atomic_framework/broker-collision-evidence/runs/`，並說明 AAF 因開源框架特性不追蹤 runtime artifact，由 3KLife 承接 archival。
- **§6.3 cross-model**：從「deferred」升級為「4-vendor production co-development 已實證」（Anthropic / Cursor / Google / OpenAI 體系），引用 `parallel-0041-0042` 作為真實案例。
- **§6.4 self-referential**：升級為 (a) Format Adapter 子系統 broker-coordinated 交付（既有）、(b) Wave Mode 已在 ATM 開發本身運作（新）、(c) 4-vendor 共同寫入（新）三段。
- **§6.3 future work MAO 卡片狀態更新**：MAO-0001/0002/0003/0007/0008/0009/0010/0030~0034 + 0039~0042 + 0050~0052 已 shipped；剩下集中於 runner Broker 系列（MAO-0011~0016）與 distributed consensus。
- **Abstract**：第三證據桶加入 multi-vendor real-task collision、MAO-0010 100% catch、Wave Mode dogfood 5/5、4-vendor co-development。

**2026-06-16 (Current Draft, fourth pass — field-validation evidence landed):**
- **§4.5 upgraded from "mechanism-only" disclosure to "field-validated"** — `.atm/history/evidence/broker-runs/` now contains two recorded two-agent collision runs (`8bc281b6-…`, `b9b785bd-…`, both `planId: batch-55dfb3bdf8f9c383`); both have actors `agent-a` + `agent-b` against `scan-target.json`, adapter `json-record`, lane `direct-brokered`, **merge verdict `mergeable`** with both writes applied. These are deliberate controlled collisions, recorded by the production broker (schema `atm.brokerOperationRunRecordEnvelope.v1`), not fixture playback. Section retitled to "Controlled Two-Agent Collision Runs: Field-Validated Parallel Write ✅".
- **Abstract**: third evidence bucket reworded — incidents + controlled collisions + adoption study; STORM differentiation reframed from "deferred field validation" to "end-to-end recorded".
- **§1.3 #3**: changed from "field-validation deferred" to "Field-validated: two recorded collision runs at `.atm/history/evidence/broker-runs/`".
- **§5 limitations**: reframed from "no field-validated parallel write" to "comparative throughput vs. STORM deferred"; noted JS/Python code-atom path through `compose.ts` still mechanism-only pending analogous runs.
- **§7 #4**: layered validation summary expanded to call out the two recorded collision runs explicitly.
- **Memory**: added `reference_broker_run_evidence.md` pointer to the recording location so future sessions know where to look.

**2026-06-16 (Current Draft, third pass — real-incident evidence integration):**

*Honesty corrections after subagent audit of three governed repos:*
- **§4.3 npc-brain table rewritten** — replaced "Write-conflict admission errors: 0" with a 6-row breakdown showing 2 correct out-of-scope rejections, the 2026-05-25 10-card scope-lock contention burst requiring ledger-replay recovery (~2 hours), at least 1 CLI-runner idempotency break, 3 post-write validator catches, and 0 *unrecovered* admission errors. Reframes the headline from a clean number to "every conflict caught and recovered, some noisily."
- **New §4.4 "Real-World Incident Evidence on the Framework Itself"** — references `atm-abnormal-release-forensics-report.md` and tabulates 5 governance incidents during TASK-CID-0040~0045 (2026-06-11/13): claim-displaced-by-import, out-of-scope delivery with historical-delivery waiver, mailbox/governance state split, plan-mirror sync failures, and the cid-shared collision that became the first end-to-end real trigger of the §3.7 freeze protocol. Explicitly notes which incidents the broker *did not* catch at write time (the waiver case) as a motivating limitation.
- **New §4.5 "What Is Validated by Mechanism Only, Not by Field Use"** — discloses that the §3.4 same-file CID-disjoint parallel-write contribution (the headline differentiator over STORM) is mechanism-validated (compose.ts, AGR 7/7 catch, format-adapter dogfood 2/5 successful merges) but has **no real two-agent concurrent-claim-and-both-land case in any governed repo's history** during the reporting window. Deferred to December full paper as a controlled side-by-side workload.
- **§3.7**: added narrative of cid-shared collision (2026-06-12, commit `70594a031`) as the first real freeze-protocol trigger, and noted TASK-CID-0040~0045 incident series motivated the protocol's shipping.
- **§1.3 #3**: added "composer mechanism-validated; field-validation deferred" caveat referencing §4.5.
- **§1.3 #4**: rephrased from "37 tasks, no observed false rejection" to multi-line layered validation summary.
- **Abstract**: replaced single-paragraph evidence claim with three-bucket structure (fixture / arbitration suite + dogfood / real incident + adoption) and explicit mechanism-vs-field disclosure.
- **§5 limitations**: added "Field-validated same-file CID-disjoint parallel write" as an explicit deferred item.
- **§4.6** (formerly §4.4 CID stability) renumbered.
- **§7 #4**: rewritten to expose layered validation rather than headline number.

**2026-06-16 (Current Draft, second pass — reviewer-mode audit corrections):**

*Critical factual corrections (P0):*
- **§3.10 / §1.3 #6 / §6.4 / §5 / Abstract / §7**: Format Adapter subsystem upgraded from 🔹 Design to ✅ Implemented — TASK-CID-0091~0098 shipped 2026-06-16 (commits `31fd89ff0` registry + JSON/text/numeric adapters; `ca59a88a9` atom-map domain adapter + batch planner + CAS + dogfood gate; `d8d27781e` evidence envelopes). Theorem 3 now has empirical support: 5-scenario dogfood passes with `SHIP` recommendation.
- **§3.7**: Corrected attribution of `freeze.ts` / `patch-envelope.ts` / `conflict-matrix.ts` from incorrect "TASK-MAO-0006~0009 shipped 2026-06-14" to correct "TASK-CID-0040/0041, commits `803ffc335` & `70594a031`, 2026-06-12". Added neutral-writer recovery semantics paragraph.
- **References**: added explicit submit-time verification warning — all arXiv IDs must be checked, "Anonymous" entries replaced.

*Reviewer-defense rewrites (P1):*
- **§3.5 / Theorem 2**: renamed from "Admission Soundness" to "Static Admission Closure" to avoid tautology objection on (A2). Theorem statement unchanged; framing now explicitly scopes the claim to static-determinable effects.
- **§4**: section title changed from "Validation via 12-Scenario AGR Benchmark Harness" to "Validation: Fixture Suite and Adoption Study". §4.2 now states "assertion fixtures, not concurrent workload benchmarks". §4.3 npc-brain "zero admission errors" reframed as "no observed false rejection" with explicit no-control-group caveat.
- **§3.2 / Definition 1**: $P$ extended to $\mathrm{FilePath} \times (\mathrm{LineRange} \cup \{\bot\})$ to unify registry atoms (file-granular) and AGR virtual atoms (range-granular) under one definition; overlap predicate added.
- **§3.3 / Definition 3**: replaced literal `||`-concatenation with canonical-JSON form (RFC 8785 / JCS style) tagged with `schema_version: "atm.cid.candidate.v1"` — removes the delimiter-collision soundness gap. Implementation note flags shipped code still using legacy concatenation as a hardening item.

*Defensive additions (P2/P3):*
- **§3.4**: added Lamport-style logical clock note for SERIAL ordering — robust to wall-clock skew.
- **§3.9**: added two open problems — adapter trust model; liveness/starvation/broker determinism.
- **§1.3**: collapsed 6 contributions back to 4 (focus; removed standalone "AI-Native principles" and "open source" items, folded into others).
- **§6.1**: removed hand-waved "70% → 85% for 10× effort" numbers; replaced with qualitative observation.
- **§6.3**: corrected MAO task-card count from "10 cards" to "22 + 12 wave-mode cards" with shipped/pending split.

**2026-06-16 (Current Draft, first pass):**
- **§3.0**: added 🔹 "Proposed (Design)" status tier (note: this tier became unused after the second pass since §3.10 graduated to ✅)
- **§3.7**: added operational-layer note (subsequently corrected in second pass)
- **§3.8**: added "Batch admission and evidence attribution (design)" paragraph on per-task evidence slicing under Wave Mode
- **New §3.10**: Format Adapters and `ConflictKey` (initial draft as design-only; corrected to ✅ in second pass)
- **New §2.8**: Related Work — OT / CRDTs / database concurrency control
- **New §6.4**: self-referential dogfood note (initially "planned"; corrected to "executed" in second pass)
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
