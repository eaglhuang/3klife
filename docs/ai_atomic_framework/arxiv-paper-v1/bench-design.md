# Multi-Vendor Broker Bench — 設計規範（v1 vision paper 補強用）

> **本文件目的**：定義一個能補齊論文 §3 mechanism ↔ §4 evidence 對應缺口的測試工具，並為 ATM Captain 評估「哪些 scenario 可以順手用真實任務卡對撞」提供清單。
>
> **讀者**：ATM Captain / Reviewer / 派工協作 agent。
> **作者**：論文準備群 Claude Opus 4.7，2026-06-19。
> **狀態**：design draft（未開卡）。

---

## 1. 為什麼要做這個

論文 §3 已形式化七層 hard gate 與 Def 6 CAS，但 §4 evidence 桶在以下三個 mechanism 上沒有對應的 broker run：

| § 機制 | 已有 evidence？ | 缺口性質 |
|---|---|---|
| §3.6 AGR Layer 2 細化後 disjoint → admit 並行 | ❌ | 真實任務碰運氣才會湊到，目前未捕獲 |
| §3.10 Def 6 CAS base-hash 失配 → bounded one-shot re-plan → apply 成功 | ❌ | 純形式定義，無 field run |
| §3.8 broker admit 但 validator 抓出 semantic break（誠實負面）| ❌ | 設計上不會自然發生 |

**設計目標**：以單一 evidence schema（沿用 `atm.brokerOperationRunRecordEnvelope.v1`）涵蓋上述缺口，同時保留接駁真實 vendor LLM 的能力，讓 v1 vision paper §4 與 Dec full paper 共用 corpus。

---

## 2. 範圍邊界

**做**：
- 一個 scenario DSL + runner，能 deterministically 觸發 §3 各 layer
- 兩種 provider：`synthetic`（inject WriteIntent，免 LLM）、`vendor`（呼叫真實 LLM 生成 patch）
- 把每個 scenario 的 broker run 持久化進既有 evidence 目錄
- 14 個 scenarios，MVP 取其中 3 個

**不做**：
- 不取代 §4.2 既有 12-scenario AGR fixture suite（彼此互補：fixture 測 admission rule 純函式，bench 測 end-to-end run）
- 不重新發明 broker、不分叉現有 schema
- 不做 UI / web dashboard

---

## 3. 落地位置

| 路徑 | 用途 | 倉庫 |
|---|---|---|
| `tools/multi-vendor-broker-bench/` | runner、scenario 解析、provider | **AAF** |
| `tools/multi-vendor-broker-bench/scenarios/B-*.json` | 14 個 scenario 定義 | **AAF** |
| `.atm/history/evidence/bench-runs/<scenarioId>/<runId>.json` | 持久化 evidence（沿用 `brokerOperationRunRecordEnvelope.v1`）| **AAF runtime artifact**（同 broker-runs 政策）|
| `docs/ai_atomic_framework/broker-collision-evidence/bench/INDEX.md` | archival 索引（人讀） | **3KLife** |
| `docs/reports/multi-vendor-broker-bench-report.md` | 跑完彙整報告（供論文 §4 引用） | **AAF** |

evidence schema 完全不改；只是 envelope 多帶一個 optional `scenario_id` 欄位於 `notes` 內標示來源。

---

## 4. Scenario DSL

```jsonc
{
  "scenarioId": "B-02",
  "title": "AGR Layer 2 refines overlapping range to disjoint sub-atoms → admit parallel",
  "covers": ["§3.6 Definition AGR Layer 2", "§3.4 layer 4 needs-physical-split"],
  "provider": "synthetic",                       // synthetic | vendor
  "agents": [
    { "id": "agent-a", "vendor": "synthetic", "role": "writer" },
    { "id": "agent-b", "vendor": "synthetic", "role": "writer" }
  ],
  "writeIntents": [
    {
      "actor": "agent-a",
      "targetFile": "fixtures/B-02/shared-module.ts",
      "rangeHint": { "lines": [1, 200] },         // 物理重疊
      "adapter": "javascript",
      "atomCandidate": { "symbol": "helperMath", "lines": [10, 60] }
    },
    {
      "actor": "agent-b",
      "targetFile": "fixtures/B-02/shared-module.ts",
      "rangeHint": { "lines": [1, 200] },         // 物理重疊
      "adapter": "javascript",
      "atomCandidate": { "symbol": "helperString", "lines": [80, 140] }
    }
  ],
  "expected": {
    "verdictPerActor": { "agent-a": "applied", "agent-b": "applied" },
    "mergeVerdict": "mergeable",
    "agrLayerInvoked": "layer-2",
    "filesUntouchedByConflict": ["fixtures/B-02/shared-module.ts"]
  }
}
```

`vendor` provider 時，`writeIntents` 改成 `prompts`（提示 LLM 在 region 內改某函式），runner 抓 LLM 輸出產出對應 WriteIntent。

---

## 5. 14 scenario 全集（MVP 標 ⭐）

| ID | Scenario | Provider 建議 | Layer 對應 | 期望 | MVP |
|---|---|---|---|---|---|
| B-01 | Disjoint CID same file → admit parallel | synthetic | 1, 4 | applied×2, mergeable | |
| **B-02** | **Physical-overlap, AGR Layer 2 disjoint → admit ✅** | **synthetic** | **4 (AGR)** | **applied×2, agrLayer=2** | ⭐ |
| B-03 | Same CID identity → block-cid-conflict | synthetic | 1 | blocked×1 | |
| B-04 | Shared `generator` surface → block-shared-surface | synthetic | 2 | blocked×1 | |
| B-05 | R/W set intersection → SERIAL | synthetic | 3 | queued×1 | |
| B-06 | Same JSON record key → block | synthetic | 5 ConflictKey | blocked×1 | |
| B-07 | Disjoint JSON record key same file → merge ✅ | synthetic | 5 ConflictKey | applied×2, mergeable | |
| **B-08** | **CAS base-hash stale → re-plan once → apply ✅** | **synthetic** | **6 CAS Def 6** | **replan=1, applied** | ⭐ |
| B-09 | CAS stale → re-plan → still stale → block | synthetic | 6 CAS Def 6 | replan=1, blocked | |
| B-10 | Unknown format → fallback file lock | synthetic | 7 | queued×1 | |
| B-11 | 3+ agents fan-in different functions → all admit | synthetic | 4 | applied×3 | |
| B-12 | Multi-vendor concurrent on shared team-runtime atom (`atm.team-agents-runtime`) → apply-phase fail-closed | **vendor (field-captured 2026-06-20)** | 1 (apply-phase intent-occupancy variant) | TEAM-0042 admit→apply blocked; TEAM-0043 active intent holder; clean fail-closed | ✅ done |
| **B-13** | **Broker admit + validator catches semantic break (honest negative)** | **synthetic + validator** | **§3.8** | **applied + validator-reject** | ⭐ |
| B-14 | Throughput micro-bench: 8 disjoint atoms, serial vs parallel | synthetic | — | parallel ≥ 1.5× serial | |

**MVP 3 個 ⭐**（B-02 / B-08 / B-13）對 v1 vision paper 是必要的；其他 11 個延 full paper（12 月）。

**B-12 已於 2026-06-20 完成 field capture**（OpenAI 體系 vs Anthropic 體系，TASK-TEAM-0042 vs TASK-TEAM-0043 對 `atm.team-agents-runtime` 的 apply-phase 阻擋）— 詳見 paper.md §4.5 "B-12 Controlled Field Collision" 子節。Evidence artifacts：
- `AAF/.atm/runtime/team-runs/team-4a7221ebbb23.json`
- `AAF/.atm/runtime/team-runs/team-cd46fbcc7ad3.json`
- `AAF/.atm/runtime/write-broker.registry.json`
- `AAF/.atm-temp/b12-capture/broker-capture.md`
- `AAF/.atm-temp/b12-bundle/broker-evidence-bundle.md`

---

## 6. Captain 評估視角：哪些可以掛真實任務卡對撞

下面這幾格是 Captain 在派工時可以「順手把真實任務塞進去」的位置——若 dispatch 自然產生對應碰撞型態，就把該卡的 broker run 也標 `bench:` 前綴塞進 `bench-runs/` 即可，**不必為了 bench 額外開卡**：

| scenarioId | 真實任務的觸發條件 | 何時自然發生 |
|---|---|---|
| B-02 | 兩個 agent 派到同檔同行範圍但實際改不同函式 | 函式級重構大檔時（例如 `decision.ts` 200+ 行同時改 broker rule + R/W set 計算） |
| B-07 | 兩個 agent 派到同份 `path-to-atom-map.json` 但寫不同 record key | 已驗證模式（parallel-0041-0042 的延伸） |
| B-08 | 一個 agent 在另一個寫完後才提交 | 慢速 agent vs 快速 agent 同檔；CAS gate 自然觸發 |
| B-11 | 三個以上 agent 派同檔不同函式 | 大檔多人重構（例：team-agents runtime 同檔多函式） |
| B-12 | 三個以上 vendor 同檔並行 | 大型 wave 任務、4-vendor co-dev 時段 |

**B-03 / B-04 / B-05 / B-06 / B-09 / B-10 / B-13 / B-14 必須 synthetic**——這些是反面 / 邊界情境，真實任務不會也不該故意製造。

---

## 7. Acceptance Criteria（v1 vision paper 用）

下面三條任一未達到，不寫入 §4：

1. **B-02 / B-08 / B-13 三個 scenario** 都產出至少一筆 evidence file 於 `.atm/history/evidence/bench-runs/`，schema 為 `atm.brokerOperationRunRecordEnvelope.v1`
2. **每筆 evidence** 含至少：
   - `scenario_id`（注於 `notes` 或新增頂層欄位）
   - `actor_ids` ≥ 2
   - `lane_decision` / `merge_verdict` 與 scenario `expected` 對齊
   - B-08 必須有 `replanCount: 1` 與最終 `applied`
   - B-13 必須有 `validator_rejection` 鏈接到 broker run
3. **彙整報告** `docs/reports/multi-vendor-broker-bench-report.md` 寫明 3/3 通過、附 commit hash、附對 §3 對應段落引用

通過後，論文 §4.5 改寫為 hybrid 結構（「Mechanism-validated bench + Field collision runs」）。

---

## 8. 工作量估計（給 Captain 派工參考）

| 階段 | 預估 | 內容 |
|---|---|---|
| Phase 0：spec 對齊 | 0.5d | 本文件 → 開卡（建議單卡 TASK-CID-0115 或 TASK-MAO-0059）|
| Phase 1：runner chassis | 1d | scenario 解析、evidence writer、CAS injector、synthetic provider |
| Phase 2：B-02 / B-08 / B-13 三個 scenario 落地 | 1d | 含 fixtures、validator 鉤、報告生成 |
| Phase 3：跑通 + 寫報告 | 0.5d | 報告寫入 + 論文 §4.5 補丁 PR |
| **MVP 合計** | **3d** | |
| Full paper 擴 11 個 + B-14 throughput | +2d | 12 月 milestone |

---

## 9. 對論文 §4 / §5 的影響（合併入 v1 投稿前）

**§4.5 改寫骨架**：

```markdown
### 4.5 Mechanism-Validated and Field-Validated Collision Runs ✅

我們以單一 evidence schema (atm.brokerOperationRunRecordEnvelope.v1) 累積兩類 broker runs：

**(a) Mechanism-validated bench** — `tools/multi-vendor-broker-bench` 涵蓋
七層 hard gate + Def 6 CAS + §3.8 honest negative；v1 公開 3 個關鍵 scenario：
- B-02：AGR Layer 2 refine 後 admit ✅ — 對應 §3.6
- B-08：CAS bounded re-plan apply ✅ — 對應 §3.10 Def 6
- B-13：broker admit + validator semantic-reject — 對應 §3.8 honest negative

**(b) Field collision runs** — 6 筆真實任務 dogfood，含 parallel-0041-0042 cross-vendor
case；架構同 (a)，accumulated 於同一個目錄。
```

**§5 Limitations 同步更新**：head-to-head throughput vs CoAgent 的承諾從「待 full paper」改為「v1 提供 B-14 stub、full paper 補完整數據」。

---

## 10. 證據主軸與後續執行順序（2026-06-20 校正版）

ATM Captain 已用 TASK-TEAM-0042 / TASK-TEAM-0043 完成 B-12 field capture（apply-phase collision evidence，OpenAI vs Anthropic）；後續證據工作改為以下 **5 步順序** 推進，不再用 A / B / C 三選一：

### Step 1：B-12 field evidence 歸檔到 3KLife — ✅ DONE (2026-06-20)

已封存至 `docs/ai_atomic_framework/broker-collision-evidence/runs/B-12-field-2026-06-20/`（3KLife commit `ee37239e`），10 個 artifact 含 README、兩個 team-run JSON、write-broker.registry snapshot、broker capture / evidence bundle、merge plan / proposal JSON。論文 §4.5(b) 已切到此 archival 路徑，不再依賴 AAF runtime。

### Step 2：`close-orchestration.ts` 雙層 atom merge 正向案例 — ✅ DONE (2026-06-21)

已落地，記錄於 `docs/ai_atomic_framework/broker-collision-evidence/close-orchestration-layered-merge-evidence.md`。檔案 6 個正式 atom map（`atm.task-closure-map` 等）+ broker-aware pre-patch (AAF `18aa08f54`) 對 `buildClosebackPlan` (186-327) vs `resolveClosebackPlanningPath` (472-618) 的第二層切分：不同 function → `parallel-safe`、同 function → `blocked-cid-conflict`。論文 §4.5(c) 已升為 **primary positive layered keystone**。

### Step 3：`integration.ts` 正式 atom map 建檔 — ✅ DONE (2026-06-21)

已落地。`atom.integration-bootstrap-map` / `-dispatch-map` / `-install-map` / `-manifest-map` 四個正式 atom map 進入 `atomization-coverage/path-to-atom-map.json`。

### Step 4：`integration.ts` broker-aware pre-patch — ✅ DONE (2026-06-21)

已落地，記錄於 `integration-layered-merge-evidence.md`。在 Step 3 補上的正式 atom map 之上，broker-aware pre-patch 仍能切分 `runIntegration` (188-313) 與 `verifyManifestFile` (455-504)：不同 function → `parallel-safe`、同 function → `blocked-cid-conflict`。論文 §4.5(d) 升為 **secondary reinforcement case**。

### Step 5：Synthetic MVP（B-02 / B-08 / B-13）作 deterministic mechanism evidence — 🔷 待開卡

開卡建 `tools/multi-vendor-broker-bench/` runner + B-02 / B-08 / B-13 三個 synthetic scenarios，作為 deterministic 機制覆蓋。**動機**：Step 1~4 已提供真實案例的 in-vivo evidence；Step 5 補機制可重現性的 assertion-level evidence。兩類共用 envelope schema、寫入同 evidence corpus。論文 §4.5(e) 已寫為 planned placeholder，落地後直接升為實證。

---

### 進度全貌

| Step | 狀態 | 對應 §4.5 子節 | Commit |
|---|---|---|---|
| 1. B-12 archival | ✅ DONE | 4.5(b) | 3KLife `ee37239e` |
| 2. close-orch layered | ✅ DONE | 4.5(c) | AAF `18aa08f54` |
| 3. integration.ts atom map | ✅ DONE | 4.5(d) | 3KLife `ee37239e` |
| 4. integration.ts pre-patch | ✅ DONE | 4.5(d) | AAF `18aa08f54` |
| 5. Synthetic MVP B-02/08/13 | 🔷 待開卡 | 4.5(e) | — |

Step 1~4 在 2026-06-20 / 06-21 兩天內全數落地，§4.5 evidence stack 完成 4/5 層；剩 Step 5 synthetic backstop。論文準備群將在 Step 5 開卡後同步更新 §4.5(e) 為 ✅。

---

*Drafted by: 論文準備群 (Claude Opus 4.7), 2026-06-19; revised 2026-06-20 with Captain-aligned 5-step evidence plan; updated 2026-06-21 with Steps 1-4 marked DONE and §4.5 layered-keystone restructure landed.*
*Lives at: `docs/ai_atomic_framework/arxiv-paper-v1/bench-design.md`*
