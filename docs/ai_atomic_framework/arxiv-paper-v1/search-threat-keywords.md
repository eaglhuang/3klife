# ATM CID 論文威脅掃描清單
## 危險關鍵字列表 + 搜尋優先級

**目的**：在投稿前快速掃出「有沒有人已經做過我想做的東西」  
**方法**：用以下關鍵字在 arXiv / Google Scholar 搜，看有沒有 2025-2026 的新論文

---

## 🔴 P0 危險（最高優先度）

這些關鍵字若搜出 2026 年的新論文，CID 可能已被人搶。

### P0.1 直接競品：Contract-Based Code Coordination
```
- "contract-based code coordination"
- "contract fingerprint concurrent code"
- "semantic contract admission control"
- "write contract verification LLM"
```

**為什麼危險**：這直接就是 CID 的核心  
**如果有人做**：論文定位改成「我們的指紋是輕量的」vs「他們的是複雜的」

### P0.2 直接競品：Pre-Execution Semantic Filtering
```
- "pre-execution semantic conflict detection code"
- "pre-generation conflict prevention LLM"
- "admission control code generation"
- "semantic filtering concurrent LLM code"
```

**為什麼危險**：這就是 CID 做的事  
**如果有人做**：看他們的評估指標，可能需要重新定義 novelty

### P0.3 直接競品：Code-Level Parallelism Coordination
```
- "fine-grained parallelism code generation"
- "atomic write coordination LLM agents"
- "operation-level conflict resolution code"
- "sub-file granularity concurrency LLM"
```

**為什麼危險**：說的可能就是 CID 的應用場景  
**如果有人做**：看他們的粒度是 file 還是 function 還是 expression

---

## 🟠 P1 危險（中高優先度）

這些關鍵字若搜出論文，代表有人在做「多層架構」或「整合系統」。

### P1.1 多層協調架構
```
- "multi-layer coordination LLM"
- "layered governance code generation"
- "physical semantic protocol layer"
- "coordination layer specification LLM"
```

**為什麼危險**：有人可能已經建立了「物理 + 語義 + 協議」的框架  
**如果有人做**：看他們怎麼定義各層邊界

### P1.2 語義層衝突檢測（程式碼特化）
```
- "semantic conflict detection code generation"
- "type-aware concurrency control LLM"
- "data-flow-based write conflict LLM"
- "coupling-aware parallel code synthesis"
```

**為什麼危險**：可能已有人做「代碼特化的語義層」  
**如果有人做**：看他們用 AST/type 還是 LLM，粒度如何

### P1.3 整合多代理系統框架
```
- "unified governance framework multi-agent LLM"
- "composable coordination primitives code"
- "atomic operation framework LLM agents"
- "verifiable AI code synthesis system"
```

**為什麼危險**：有人可能在做 ATM 這樣的大框架  
**如果有人做**：看他們的 atom 粒度和驗證方式

---

## 🟡 P2 危險（中低優先度）

這些是「邊界領地」，容易被搶但不會直接殺死 CID。

### P2.1 寫操作分析 (Write-Set Analysis)
```
- "write-set analysis multi-agent code"
- "dependency graph construction code generation"
- "interference matrix concurrent LLM"
- "static analysis concurrent writes LLM"
```

**為什麼危險**：Contract extraction 的技術可能已有人做  
**如果有人做**：看他們用什麼工具（LSP? AST? symbolic execution?）

### P2.2 指紋 / 雜湊 (Fingerprint-Based Coordination)
```
- "fingerprint-based concurrency control"
- "digest-based conflict detection"
- "hash-based coordination LLM"
- "lightweight encoding concurrent operations"
```

**為什麼危險**：指紋方案是 CID 的技術選擇  
**如果有人做**：看他們的指紋怎麼設計，精確度如何

### P2.3 耦合測量 (Coupling Metrics)
```
- "coupling measurement code generation"
- "code coupling metrics LLM agents"
- "dependency density analysis concurrent code"
- "interaction complexity metrics"
```

**為什麼危險**：CID 的 interference matrix 需要耦合理解  
**如果有人做**：看他們怎麼定義「耦合」，是靜態還是動態

### P2.4 CodeCRDT 的後續工作 (CodeCRDT Follow-Up)
```
- "CodeCRDT improvement"
- "Pugachev 2026" (after CodeCRDT 2025)
- "semantic conflict CodeCRDT"
- "CodeCRDT optimization"
```

**為什麼危險**：CodeCRDT 作者可能自己填語義層缺口  
**如果有人做**：那就是最強對手

---

## 🟢 P3 參考（低優先度，搜知識面）

這些不會威脅 CID，但能豐富相關工作段。

### P3.1 工作流層衝突（不是代碼層）
```
- "workflow coordination LLM"
- "task-level conflict resolution"
- "agent orchestration failure"
```

**搜的原因**：看整體生態有誰在做什麼  
**例**：Semantic Consensus, AWCP, SEMAP 都在這個層

### P3.2 並發控制理論 (Concurrency Theory)
```
- "optimistic concurrency control LLM"
- "pessimistic concurrency agents"
- "ACID semantics multi-agent"
- "2PL OCC MVCC agents"
```

**搜的原因**：理論基礎，看有沒有新的 primitive  
**例**：ATCC, Token Coherence 就是在套用分佈式系統理論

### P3.3 驗證與測試 (Verification & Testing)
```
- "regression testing multi-agent code"
- "formal verification code generation"
- "property-based testing LLM"
- "fuzzing concurrent LLM outputs"
```

**搜的原因**：§5.2 評估 metrics 需要參考  
**例**：MAST, STORM 的驗證方法論

---

## 📋 推薦搜尋順序

### Week 1（今天~明天）
1. 搜 **P0.1** + **P0.2** → 「有沒有人直接搶了 CID」
2. 搜 **P0.3** → 「細粒度並行有沒有人做」
3. 如果 P0 都沒有威脅，往下走

### Week 2
4. 搜 **P1.1** + **P1.2** → 「多層架構有誰」
5. 搜 **P1.3** → 「有沒有其他整合系統」
6. 搜 **P2.4** → 「CodeCRDT 作者有沒有後續」

### Week 3（可選）
7. 搜 **P2.1** ~ **P2.3** → 技術細節
8. 搜 **P3.1** ~ **P3.3** → 豐富相關工作

---

## 🔍 搜尋技巧

### Venue 優先（2025-2026 才關鍵）
```
site:arxiv.org "2026" [keyword]
site:arxiv.org "2025" [keyword]
site:openreview.net "2026"  (ICLR / NeurIPS / ICML / ICCV)
```

### 作者追蹤（已知的競品團隊）
```
Pugachev CodeCRDT 後續？
Acharya Semantic Consensus 後續？
Qian MPAC 後續？
Costa AgentSpawn 後續？
```

### 重點 Venues（會首發新論文的地方）
- arXiv（最先）
- OpenReview（ICLR 2026 投稿中）
- ACM SIGSOFT（FSE 2026）
- IEEE ICSE（2026）
- NeurIPS（2026）

---

## ⚠️ 特別提醒

### 「已有人做過」的兩種情況

1. **直接競品（論文已發表）**
   - 搜出有人 2026 年做了「contract-based code coordination」
   - **應對**：改定位，強調自己的角度（e.g., 「他們粗糙，我們精細」）

2. **有人同步在做（論文未發表但 GitHub 有原型）**
   - GitHub / 企業內部公開了類似方案
   - **應對**：快速投 arXiv claim priority，然後評估合作可能

### 「沒人做過」的保護期

- 2026/06 投 arXiv vision paper → claim priority window 開啟
- 2026/09 改成 full paper → 更強的 novelty 保護
- 2026/12 投主會 (ICSE/FSE) → 正式發表前的最後防線

---

## 📌 搜完之後的決策樹

```
搜尋結果
├─ P0 有威脅 (誰直接搶了)
│  └─ 決定：改定位、合作、或放棄
│
├─ P1 有威脅 (誰做了多層)
│  └─ 決定：加強差異化、或縮小 scope
│
├─ P2 有威脅 (技術細節有重疊)
│  └─ 決定：引用他們、聲明自己是改進
│
└─ P0-P2 都沒威脅
   └─ 決定：放心投，補 P3 豐富相關工作
```

---

## 📧 搜尋完後應回報

用戶在搜完所有關鍵字後，應整理成表格：

| 關鍵字 | 搜尋日期 | 威脅等級 | 最相關論文 | 對 CID 的影響 |
|---|---|---|---|---|
| "contract fingerprint code" | 2026-06-11 | P0 | — (none found) | ✅ Safe |
| "pre-execution semantic filtering" | 2026-06-11 | P0 | 2604.16339 (SCF, workflow-only) | ✅ Different domain |
| ... | ... | ... | ... | ... |

---

**預計搜完全部需時**：2-3 天（不急著投稿前一週內完成即可）
