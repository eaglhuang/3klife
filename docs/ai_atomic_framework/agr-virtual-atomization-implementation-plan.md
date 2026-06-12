# ATM 實作規劃：Adaptive Granularity Refinement (AGR) + Broker 強化

**Status:** ✅ **DELIVERED** (2026-06-12) — 原本的「待排入任務卡」全數已收口，本文件改為「交付紀錄 + 後續優化」
**Last Updated:** 2026-06-12
**對應論文章節：** `arxiv-paper-v1/paper.md` §3.6（AGR）、§3.4（Augmented Decision Rule）、§3.7（Broker serialization point）
**與既有計畫的關係：**
- 與「CID 定義硬化與文件校準計畫」（使用者已實作，commit `13b17ffc`）為**並行、互補**關係——CID 計畫處理「CID 怎麼算、怎麼命名」；本計畫處理「CID 算出來衝突之後，broker 怎麼把衝突切得更細」。
- 延續 `atomic-cost-reduction-plan.md` 的 Adapter-Guided Atomization 主軸，是其 Phase 4（CID/Broker Integration）之後的延伸。

---

## ⭐ 交付總覽（2026-06-12）

本計畫原本規劃的 AGR-0001~0006 全部在 24 小時內以 CID-0028~CID-0037 之名於 AAF 完成交付。對照表：

| 本計畫卡 | 實際交付任務 | Commit | 摘要 |
|---|---|---|---|
| AGR-0000（盤點） | TASK-CID-0026 | （open 階段） | AGR baseline survey + CID/broker gap map |
| AGR-0001（VirtualAtom SDK + Layer 1） | TASK-CID-0028 (SDK) + TASK-CID-0029 (broker) | bundled in `f841a27c`, `aa907d04` | `atomization-planning.ts` +98 LOC, `agr.ts` +57 LOC |
| AGR-0002（Layer 2 + threshold） | TASK-CID-0031 + TASK-CID-0035 | `aa907d04` | `policy.ts` +131 LOC (含 θ_count, θ_density), 210 LOC tests |
| AGR-0003（Augmented Decision Rule） | TASK-CID-0032 | `16533023` | `decision.ts` 改 107 LOC, `types.ts` +readAtoms, 166 LOC tests |
| AGR-0004（canon_sym manifest） | TASK-CID-0033 | `f841a27c` | `language-adapter.ts` +20 LOC manifest, JS/Python 已實作 |
| AGR-0005（mid-execution registration） | TASK-CID-0035 | `aa907d04` | `steward.ts` 改 7 LOC, broker CLI +67 LOC |
| AGR-0006（validator catch-rate benchmark） | TASK-CID-0037 | `e62eee72` | **12 個 scenario** + 364 LOC runner + 107 LOC validator |

額外交付（本計畫未列但已完成）：
- **TASK-CID-0034** AGR runtime registry（`9d214ad9`）
- **TASK-CID-0036** AGR closeout validator 整合（`5bea4e31`）

**結論**：本計畫已不是「待開卡藍圖」，而是「已交付紀錄」。後續優化由 `agr-conflict-arbitration-plan.md` 的 TASK-CID-0040~0045 接手（運行時併發治理深化）。

---

## 0. 本計畫原本要解決什麼（歷史脈絡，保留參考）

論文 §3.6 提出的 AGR 是新的演算法貢獻，**規劃當下**（2026-06-11）ATM 中沒有對應實作。它解決的是：

> 兩個 agent 修改「同一個 symbol-level atom」內的不同區段（hunk-level 衝突），但 Candidate CID（Definition 3）是 symbol 粒度，無法區分這兩個區段——導致 broker 判定 `needs-physical-split` 或 `blocked-cid-conflict`，即使兩段程式碼實際上互不相干。

AGR 提供一個**確定性、無需 LLM 介入決策**的兩層精化流程：

- **Layer 1**：用 adapter 既有的 `enclose()` 能力，把衝突 hunk 對應到「函式 / 變數宣告 / 陳述式」邊界，產生新的 virtual atom（新 CID）→ broker 重判。
- **Layer 2**（條件觸發）：若衝突仍集中在單一函式內，且範圍夠小，將該函式拆成 `f_pre / f_extracted / f_post` 三個 virtual atom，**簽名不變**，broker 再判一次。

兩層都不遞迴；最多兩輪精化後仍衝突 → 視為真實物理衝突，序列化執行。

---

## 1. 現況基準（Phase 0 之前必須先盤點）

在動工前，先確認以下事實（**這是硬前置，避免重複 ASP-0001~0005 的「未查 git log 就開卡」錯誤**）：

| 問題 | 為何重要 | 驗證方式 |
|---|---|---|
| `discoverAtomCandidates()` 是否已回報 line range？ | Layer 1 需要 `lineStart/lineEnd` 才能算 `region(a)` | 讀 `packages/language-js/src/language-js-adapter.ts`、`language-python-adapter.ts` 的 candidate 輸出 |
| Broker `WriteIntent` schema 是否已有 `readAtoms` 或等價欄位？ | Augmented Decision Rule 需要 read-set | 讀 `packages/core/src/broker/types.ts` |
| `team-lane.ts` 的 `syntheticAtomCid` 改名是否已在 CID 硬化計畫中排定？ | 避免本計畫與 CID 計畫對同一檔案重複改動 | 讀 CID 硬化計畫的 allowed_files |
| `steward.ts`（neutral write steward）是否已支援「mid-execution 註冊衝突偵測」？ | §3.7 的 mid-execution registration 可能已部分實作（TASK-CID-0019~0024 提到 neutral write steward） | 讀 `packages/core/src/broker/steward.ts` + TASK-CID-0019~0024 內容 |

> **建議**：本計畫第一個任務卡（AGR-0000）就是「現況盤點」，輸出一份 `agr-baseline-survey.md`，確認上表四項，再決定後續任務卡的 `allowed_files` 與 `blocked_by`。**不要在盤點完成前開 AGR-0001 以後的卡**。

---

## 2. 任務分解

### AGR-0000：現況盤點（必須最先執行）

- **targetRepo:** AI-Atomic-Framework
- **executionMode:** read-only survey
- **輸出:** `docs/ai_atomic_framework/agr-virtual-atomization-implementation-plan.md` 附錄 A（見下）填入實際檔案路徑與行號
- **驗收:** 上表四個問題都有明確答案（含「目前沒有」的情況）

---

### AGR-0001：VirtualAtom SDK 型別 + Layer 1（SyntacticEnclosureAtomization）

- **targetRepo:** AI-Atomic-Framework
- **依賴:** AGR-0000
- **upstream allowed_files（暫定，待 AGR-0000 確認後調整）:**
  - `packages/plugin-sdk/src/atomization-planning.ts`（新增 `VirtualAtom`、`AdapterEnclose` 型別）
  - `packages/core/src/broker/agr.ts`（新檔，演算法 1 實作）
  - `packages/core/src/broker/__tests__/agr.test.ts`
- **forbidden_files:**
  - `packages/core/src/broker/decision.ts`（不直接改四維度判定邏輯，AGR 是判定**之前**的精化步驟）
  - `packages/language-js/**`、`packages/language-python/**`（adapter 的 `enclose()` 若不存在，視為 AGR-0002 的依賴，不在本卡新增）

#### 介面草案

```typescript
// packages/plugin-sdk/src/atomization-planning.ts (追加)

export interface EnclosingUnit {
  readonly kind: 'function' | 'var-decl' | 'statement' | 'class-method' | 'unknown';
  readonly symbol: string;
  readonly fileRange: { file: string; lineStart: number; lineEnd: number };
  readonly confidenceClass: 'high' | 'medium' | 'low';
}

export interface AtomizationPlanningAdapter {
  // ...existing methods (discoverAtomCandidates, planAtomize)...

  /**
   * Layer 1 of AGR (paper §3.6, Algorithm 1).
   * Returns the smallest syntactic unit enclosing (file, line).
   * Optional — adapters that don't implement this opt out of AGR Layer 1
   * for their candidates (broker falls back to existing needs-physical-split).
   */
  enclose?(file: string, line: number): EnclosingUnit | null;
}

export interface VirtualAtom {
  readonly kind: EnclosingUnit['kind'];
  readonly symbol: string;
  readonly sourcePaths: readonly string[];
  readonly detectionMethod: 'agr-layer1' | 'agr-layer2';
  readonly layer: 1 | 2;
  readonly confidenceClass: EnclosingUnit['confidenceClass'];
  readonly atomCid: string; // computeCandidateAtomCid() applied to this virtual atom
}
```

#### 演算法實作位置

```typescript
// packages/core/src/broker/agr.ts (新檔)

export function refineWithSyntacticEnclosure(
  patch: PatchHunk[],
  knownAtoms: AtomRef[],
  adapter: Pick<AtomizationPlanningAdapter, 'enclose'>
): VirtualAtom[] {
  // 1. G := patch hunks 扣除 knownAtoms 涵蓋的區域
  // 2. for each maximal contiguous region in G:
  //      u := adapter.enclose(region.file, region.lineStart)
  //      if u is null: skip (adapter 不支援，留給既有 needs-physical-split)
  //      v := VirtualAtom{ ..., atomCid: computeCandidateAtomCid({...}) }
  // 3. return virtual atoms
}
```

#### 驗收標準

- [ ] 給定一個 `needs-physical-split` 的 fixture（兩個 agent 改同一檔案不同函式，目前因 candidate CID 相同而衝突），AGR Layer 1 能產生兩個不同 `atomCid` 的 virtual atom
- [ ] Broker 用 virtual atom 重新計算 `calculateBrokerDecision`，verdict 變為 `parallel-safe`
- [ ] 若 adapter 未實作 `enclose()`，AGR Layer 1 回傳空陣列，broker 行為與現況完全一致（向後相容）
- [ ] 不修改 `decision.ts` 的核心判定邏輯——AGR 只產生新的 atom 集合餵給既有判定函式
- [ ] 至少 3 個測試情境：(a) 兩函式不重疊 → parallel-safe，(b) 衝突區域跨兩個函式 → 觸發 AGR-0002 條件，(c) adapter 無 `enclose` → 行為不變

---

### AGR-0002：Layer 2（SignaturePreservingDecomposition）+ Threshold Policy

- **targetRepo:** AI-Atomic-Framework
- **依賴:** AGR-0001
- **upstream allowed_files:**
  - `packages/core/src/broker/agr.ts`（追加 Layer 2 函式）
  - `packages/core/src/broker/policy.ts`（新增 `θ_count`、`θ_density` 設定，若無此檔則新增）
  - `packages/core/src/broker/__tests__/agr-layer2.test.ts`

#### Threshold 觸發條件實作

```typescript
export interface AgrThresholds {
  readonly maxConflictCount: number;   // θ_count，建議預設 1
  readonly maxConflictDensity: number; // θ_density，建議預設 0.5
}

export function shouldTriggerLayer2(
  conflicts: ReadonlyArray<{ a: VirtualAtom; b: VirtualAtom; region: LineRange }>,
  thresholds: AgrThresholds
): { trigger: false } | { trigger: true; targetFunction: VirtualAtom; conflictRegion: LineRange } {
  // 純 line-range 算術，不需要 AST：
  // 1. |conflicts| <= thresholds.maxConflictCount
  // 2. 所有 conflict.region 都落在同一個 function-kind virtual atom 的 body 內
  // 3. |conflictRegion| / |body(f)| <= thresholds.maxConflictDensity
}
```

**這個函式是判定要不要拆，不是執行拆分**——純算術，broker 端可單元測試，不需要起 LLM。

#### 實際拆分（執行端，委派給 adapter/agent）

拆分本身（把函式切成 `f_pre / f_extracted / f_post`，簽名不變）**不在 broker 端實作**。本卡只新增：

```typescript
export interface DecompositionRequest {
  readonly targetFunction: VirtualAtom;
  readonly conflictRegion: LineRange;
  readonly constraint: 'preserve-signature';
}

// Broker 產生 DecompositionRequest，交給 AI Agent 執行重寫；
// 重寫完成後，broker 重新跑 discoverAtomCandidates + AGR Layer 1 算新 CID。
```

#### 驗收標準

- [ ] `shouldTriggerLayer2` 在 fixture 上正確判定觸發/不觸發（含邊界值：`|conflicts| = θ_count` 剛好觸發、`density > θ_density` 不觸發）
- [ ] 觸發後產生的 `DecompositionRequest` 包含足夠資訊讓 agent 執行 prompt：「保留簽名，抽取第 X-Y 行為新函式」
- [ ] 拆分後（以 fixture 模擬拆分結果）重跑 AGR Layer 1，三個新 virtual atom 各有不同 CID
- [ ] 兩輪精化後仍衝突 → broker 回傳明確的「物理衝突，序列化」訊息（不是 silent fallback）
- [ ] 不遞迴：Layer 2 之後若仍衝突，不再嘗試 Layer 3

---

### AGR-0003：Augmented Decision Rule（Read-Set Dependency Check）

- **targetRepo:** AI-Atomic-Framework
- **依賴:** 無（與 AGR-0001/0002 平行）
- **upstream allowed_files:**
  - `packages/core/src/broker/types.ts`（`WriteIntent` 新增 optional `readAtoms?: AtomRef[]`）
  - `packages/core/src/broker/decision.ts`（新增一個檢查步驟：`D(I) ∩ R(I') ≠ ∅ → SERIAL`）
  - `packages/core/src/broker/__tests__/decision.test.ts`

#### 設計原則

- `readAtoms` 是 **optional** 欄位——agent 不提供時，行為與現況完全一致（不新增漏判，但也不新增誤擋）
- 新增的 verdict 不是新類型，而是讓 `parallel-safe` 在特定條件下變成 `needs-serialization`（需確認與既有 4 verdict 的命名是否衝突，若 broker 已有「serialize」語意的 verdict，沿用既有命名）
- **驗收標準:**
  - [ ] 提供 `readAtoms` 時，若與另一 intent 的寫入集合相交 → 序列化（不是 block，是排隊）
  - [ ] 不提供 `readAtoms` 時，行為與現況逐位元相同（回歸測試）
  - [ ] 至少一個整合測試：A 寫 atom X，B 讀 X 寫 Y（X∩Y=∅）→ 現況會是 `parallel-safe`（誤判），新規則下是 serialize

---

### AGR-0004：AdapterManifest `canon_sym` 政策聲明（SYM-001）

- **targetRepo:** AI-Atomic-Framework
- **依賴:** 無
- **upstream allowed_files:**
  - `packages/plugin-sdk/src/language-adapter.ts`（manifest 型別新增 `symbolCanonicalization` 欄位）
  - `packages/language-js/src/language-js-adapter.ts`、`packages/language-python/src/language-python-adapter.ts`（各自宣告政策）
  - `docs/BROKER_GUIDE.md`（記錄 `canon_sym` 概念）

#### Manifest 欄位草案

```typescript
export interface AdapterManifest {
  // ...existing fields...
  readonly symbolCanonicalization: {
    readonly policy: 'namespace-qualified' | 'export-name-only' | 'class-qualified' | 'custom';
    readonly resolvesReExportAliases: boolean;
    readonly resolvesDecorators: boolean;
    readonly notes?: string;
  };
}
```

- **驗收標準:**
  - [ ] JS / Python adapter 各自宣告 `symbolCanonicalization`（即使值是 `'export-name-only'` + `resolvesDecorators: false`，誠實標註現況）
  - [ ] `BROKER_GUIDE.md` 解釋這個欄位的用途，並引用論文 §3.2 的 namespace/decorator 範例
  - [ ] 不要求立即實作 alias/decorator resolution——本卡只要求**宣告現況**，未來改進是後續卡

---

### AGR-0005：Mid-Execution Registration + Neutral Writer Agent 確認/補強

- **targetRepo:** AI-Atomic-Framework
- **依賴:** AGR-0000（盤點結果決定本卡範圍）
- **狀態:** 🔶 可能部分已實作（TASK-CID-0019~0024 提到 neutral write steward）

#### 兩種情境

**情境 A — 若 AGR-0000 盤點發現 steward 已支援 mid-execution 衝突偵測：**
本卡縮小為「補文件 + 補測試」，將 §3.7 的論文敘述與既有 `steward.ts` 行為對齊，輸出對照表到 `atm-core-broker-survey.md`。

**情境 B — 若尚未支援：**
本卡範圍為：

- `packages/core/src/broker/registry.ts`（或對應檔案）：註冊時檢查目標 atom 是否「in use」（有 active intent）
- 若 in use：路由到 §3.4 既有的衝突解決路徑（CID-disjoint → composer，否則 → serialize）
- `packages/core/src/broker/steward.ts`：確保所有實際檔案寫入都經過單一 steward 執行路徑

- **驗收標準（情境 B）:**
  - [ ] 兩個 agent 在不同時間點註冊同一 atom 的 intent，第二個註冊時即被偵測為 in-use（不必等到雙方都嘗試寫入才衝突）
  - [ ] in-use 偵測後走既有 composer/serialize 路徑，不引入第三種衝突解決機制
  - [ ] 所有 admitted writes 最終都由同一個 steward function 執行（可用 mock 驗證沒有兩條獨立寫入路徑）

---

### AGR-0006：Validator Catch-Rate Benchmark（VALIDATOR-001）

- **targetRepo:** 3KLife（資料蒐集）+ AI-Atomic-Framework（若需 harness 調整）
- **依賴:** 無，可與其他卡平行
- **目的:** 為論文 §3.8（語義正確性留給 validator）提供實證數據——「broker 判定 parallel-safe 之後，validator 抓到多少 %的語義不相容案例」

#### 量測方法

1. 從現有 `scripts/fixtures/brokered-write/*.scenario.json` 與 3KLife 開發歷史中，蒐集「broker 判 parallel-safe 但事後 typecheck/test 失敗」的案例（若樣本不足，用合成 fixture：兩個 CID-disjoint 的函式修改，其中一個改變了另一個依賴的隱含行為）
2. 對每個案例記錄：broker verdict、validator 結果（pass/fail）、失敗類型（typecheck / lint / test）
3. 輸出 `validator-catch-rate-report.md`：至少涵蓋 N≥10 個案例（與 ASP-0005 baseline report 的取樣方法一致）

- **驗收標準:**
  - [ ] 報告包含至少 10 筆樣本
  - [ ] 明確區分「broker 漏判但 validator 抓到」vs「broker 與 validator 都判 OK 但實際有 bug（無法量測，列為已知限制）」
  - [ ] 此報告作為論文 §5 Evaluation 的 Tier 補充數據來源

---

## 3. 任務依賴圖

```
AGR-0000 (盤點，必須最先)
   ├─ blocks → AGR-0001 (Layer 1 SDK + 演算法)
   │              └─ blocks → AGR-0002 (Layer 2 + threshold)
   ├─ blocks → AGR-0005 (mid-execution registration，範圍視盤點結果而定)
   └─ (不阻擋) AGR-0003 (Augmented Decision Rule，獨立)
   └─ (不阻擋) AGR-0004 (canon_sym manifest，獨立)

AGR-0006 (validator benchmark) — 完全獨立，可隨時開始
```

---

## 4. 與論文章節的對照表

| 論文章節 | 對應任務卡 | 狀態 |
|---|---|---|
| §3.2 Symbol Canonicalization Policy | AGR-0004 | 🔷 待開卡 |
| §3.3 Definition 3/4（CID 兩層） | （不在本計畫，見 CID 硬化計畫） | 🔶 使用者已有計畫 |
| §3.4 Augmented Decision Rule | AGR-0003 | 🔷 待開卡 |
| §3.4 Theorem 1 (Cross-Regime Disjointness) | （純形式化，無對應實作任務） | ✅ 不需實作 |
| §3.5 Theorem 2 (A1′/A2) | （純形式化，無對應實作任務） | ✅ 不需實作 |
| §3.6 Algorithm 1 (Layer 1) | AGR-0001 | 🔷 待開卡 |
| §3.6 Algorithm 2 (Layer 2) | AGR-0002 | 🔷 待開卡 |
| §3.7 Broker serialization point | AGR-0005 | 🔶 視盤點結果 |
| §3.8 Validator 對照 | AGR-0006 | 🔷 待開卡 |
| §3.9 Open Problems (cross-language, schema migration) | 不開卡，論文誠實標註為 open problem | — |

---

## 5. 風險與緩解

| 風險 | 機率 | 影響 | 緩解 |
|---|---:|---:|---|
| AGR-0000 盤點發現 adapter 完全沒有 line range 資訊 | 中 | 高（Layer 1 無法產生 region） | 縮小 AGR-0001 範圍為「先補 line range 回報」，視為 ASP 系列的延伸小卡 |
| Layer 2 拆分後 agent 重寫品質不穩 | 中 | 中 | dry-run + evidence 把關（沿用既有 governance pipeline），不直接 apply |
| AGR-0003 的 `readAtoms` 欄位被 agent 過度保守填寫，導致大量 serialize | 中 | 低 | optional 欄位 + 預設不填，逐步推廣；先量測 serialize 比例再決定是否預設要求 |
| AGR-0005 與 CID 硬化計畫對 `team-lane.ts` / steward 檔案有 allowed_files 重疊 | 低 | 中 | AGR-0000 盤點時交叉檢查兩份計畫的 allowed_files，必要時調整順序避免鎖衝突 |
| Validator benchmark 樣本數不足 N≥10 | 中 | 低 | 允許混合真實案例 + 合成 fixture，並在報告中標註比例 |

---

## 附錄 A：AGR-0000 盤點結果（待填）

> 此區塊由 AGR-0000 執行後填入，包含：
> - `discoverAtomCandidates()` line range 現況（檔案路徑 + 行號）
> - `WriteIntent` schema 現況（檔案路徑 + 行號）
> - `team-lane.ts` / CID 硬化計畫的 allowed_files 交叉檢查結果
> - `steward.ts` mid-execution 偵測現況（檔案路徑 + 行號 + TASK-CID-0019~0024 對照）

---

**版本歷史：**
- 2026-06-11: 初稿，源自對抗回合（vision-paper-semantic-admission.md Phase 18）使用者 8 點回應 + AGR 演算法形式化
- 2026-06-12: 升級為「交付紀錄」。AGR-0001~0006 全數由 AAF TASK-CID-0028~0037 收口；交付對照表寫在頂部；後續優化（運行時併發治理深化）移交 `cid-hardening/agr-conflict-arbitration-plan.md` 的 TASK-CID-0040~0045 系列。
