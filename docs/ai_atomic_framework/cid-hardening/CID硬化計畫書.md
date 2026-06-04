<!-- doc_id: doc_cid_plan_0001 -->

# CID 硬化計畫書（CID Hardening Roadmap）

Generated: 2026-06-03
Planning repo: 3KLife
Target framework: AI-Atomic-Framework / ATM
Status: planning source of truth（已核准 v3.1）
Source: `C:/Users/User/.claude/plans/ticklish-bouncing-lagoon.md`

## 0. 定位

本計畫書定義 ATM CID 安全強化的 planning source of truth。它先作為設計文件，不直接修改 ATM framework source。後續若要實作，應從本文件拆出 `TASK-CID-*` 任務卡，並使用 ATM task-card-authoring 合約格式開卡。

**v3.1 鐵律**：本文是**計畫內容**，不是實作。**凡新增能力一律標「提案（未實作）」，不得寫成現況已支援。** 不得宣稱 embedding、Deno sandbox、isolated-vm sandbox、真正 subagent runtime 已存在。

**承諾邊界**：安全天花板 = **Level 3（零信任沙盒 + 對抗 QA + 突變測試）**；Level 4 / 5 僅 aspirational，不進承諾里程碑。市場（跨組織）延後到最終 epoch，以本地成熟度為前置。

落地點：upstream `AI-Atomic-Framework`（程式 / schema）；控制面與設計草案放 `3KLife/docs/ai_atomic_framework/cid-hardening/`，卡前綴 `TASK-CID-*`。不得手改 `.atm/runtime/**` 或 `.atm/history/**`。

## 1. 三層基線表（事實 / 提案 / 暫不做）

### 1A. 已驗證事實（現況，附 file:line）

| 事實 | 證據 |
|---|---|
| `semanticFingerprint` 已存在，**確定性**，hash **normalized ports（inputs/outputs）+ language.primary + validation.evidenceRequired + performanceBudget**；**不讀 AST、不讀實作、不用 LLM**。正名「**合約/介面 + 執行約束指紋**」——**不是純 ports hash，也不是 embedding / LLM semantic identity**。 | `packages/core/src/registry/semantic-fingerprint.ts:26` |
| 現況 CID 是**三條獨立線**：capsule `atom:cid`/`map:cid`、`hashLock`、`semanticFingerprint`。 | capsule / hash-lock.ts / semantic-fingerprint.ts |
| atom spec 與 registry schema 為 `additionalProperties:false`（加新欄位需 schema 遷移）。 | `schemas/atomic-spec.schema.json:6` |
| 語言轉接器目前**只做 import / entrypoint / dry-run planning，無 effect scanner**。 | `language-js-adapter.ts:35`、`language-python-adapter.ts:81` |
| `TASK-CID-0005` P0：CID-first parallel conflict advisor CLI contract（先用 `atom_id` / `atom_cid` 判斷語意衝突，再看 file overlap、lease 狀態與 registry / graph；`CID conflict = semantic conflict`；`CID disjoint + file overlap = needs-physical-split`） | P0 |
| scope-lock 現況 = `leaseId + heartbeatAt + ttlSeconds`；`taskDirectionLock.allowedFiles`；team permission validation。**無 leaseEpoch / wait-for graph / symbol-scope lease。** | scope-lock / stores（LockStore） |
| closure-packet 有 `commandRuns / stdoutSha256 / exitCode`；但 `runnerVersion` **≈ framework version，非 sandbox / OS / runtime attestation**。 | closure-packet schema / 生成器 |
| Police = advisory、`DEFAULT_POLICE_DAILY_CAP`、`suppressionKey`、`directApplyAllowed:false`、`ReviewAdvisory / HumanReviewDecision` 皆已存在。 | `packages/core/src/police/family.ts` |
| `sweep`/`expire` 現況是 **dry-run / registryTransition 提案，非直接 host apply**。 | `packages/plugin-behavior-pack` |
| 既有 `RegistryGovernanceTier`（與本 roadmap 的 Trust Tier 不同）。 | registry governance |
| Team Agents 任務卡已匯入；**`team start` 不是真的 spawn agents**（現為 planning / checklist）。 | `團隊自動化代理分工計畫.md` §2.7 |

### 1B. 新提案（**未實作**，本 roadmap 才引入）

| 提案 | 屬於 |
|---|---|
| `fingerprintProfile` schema 與命名 `CID.Strict / Interface / Effects / Semantic / Behavior` | E0 / E1+ |
| `CID.Effects`：**復用並擴充既有 `dependencyPolicy`**（OQ#2 已裁決）；scanner 輸出衍生 `observedEffects` / capability findings | E1 |
| effects-aware 替換相容性閘（純函數 vs IO 不可替換） | E1 |
| `Active Resource Index` / `Scope Lease Registry`（既有 scope-lock 的可觀測索引與規則層，非第二個 Git / 非新權威 task store） | E2 |
| `leaseEpoch`（fencing token）+ wait-for graph 死鎖偵測 + symbol-scope lease | E2 |
| closure attestation 欄位 `runnerKind / runtimeVersion / sandboxPolicyHash / attestationSigner` | E3 |
| capability sandbox（候選 = Deno 權限模型）+ quarantine | E3 |
| 突變測試 / 對抗 QA 閘；`CID.Behavior`（harness id + pass-set hash） | E3 |
| `CID.Semantic` embedding 去重（鎖模型版本，非身分 metadata） | E4 |
| janitor：sweep / expire 的 finding → **host apply** 路徑 | E4 |
| Trust Tier 1 / 2 / 3（≠ 既有 `RegistryGovernanceTier`） | E5 |

### 1C. 暫不做（近期明確不在範圍）

- Level 4 形式驗證 / 符號執行 / 污點分析（aspirational）。
- Level 5 全域免疫 / 威脅情資網路（aspirational）。
- 跨組織 CID 原子市場（E5.2，gated，Tier 3 本地實證後才解鎖）。
- **預設自動 sandbox 執行 / 無人值守自動 mutate**（守 `directApplyAllowed:false` 與 A7）。
- `node:vm` / `isolated-vm` 作為**安全沙盒**（Node 官方明示 `node:vm` 非安全機制）；Docker 沙盒（守 90 分鐘承諾）。
- 區塊鏈式 distributed consensus / 帳本分叉仲裁。
- 以內容雜湊作 caller 連結鍵。
- 把 LLM 輸出餵進 identity hash。

### 1D. 現況聲明（避免後續 AI 把願景誤當事實）

- **embedding、Deno sandbox、isolated-vm、任何「安全 sandbox」、真 subagent runtime：目前皆未實作。**
- **`sweep` / `expire`：目前仍是 dry-run / proposal 狀態**，無 host apply。
- **Trust Tier（本 roadmap 提案）不得混同既有 `RegistryGovernanceTier`。**

## 2. 設計公理（A1–A7）

- **A1 確定性防火牆**：非確定性訊號永不進入 identity / 相等判定雜湊；只當搜尋 / 排序提示。
- **A2 必要非充分**：靜態指紋只給去重候選；執行期沙盒才是真正安全邊界；全程「信心 × 成本」，不宣稱「證明安全」。
- **A3 穩定 ID 參照**：caller graph 用 `canonicalId`；指紋只是 metadata。
- **A4 單寫者 + 悲觀鎖，非共識**：scope-lock + Captain 單一提交者 + git merge。
- **A5 信任錨點誠實化**：本機證據 = 防混亂（非防竄改）；防竄改要 CI / git-server signed attestation。
- **A6 快 / 慢路徑 + Trust Tier**：`sf:`（semanticFingerprint）= 便宜快路徑；`atom:cid:`（capsule cid）= 收口慢路徑；昂貴維度只在 close / checkpoint 算。
- **A7 分級自治**：只有零衝突可逆子集允許自動套用；其餘 advisory + 摘要 + 抑制。

## 3. 治理責任矩陣

| 決策 | 由誰判定 | Team Agents 可否 |
|---|---|---|
| advisory finding 產出 | 確定性 police（deterministic code） | 可（read-only 執行） |
| blocking gate 判定 | validator / police gate（確定性規則） | 可執行驗證，**不可改判** |
| advisory → blocker promotion | **人類**（HumanReviewDecision） | **不可** |
| 維持 `directApplyAllowed:false` | framework 鐵律 | **不可更改** |
| Trust Tier 2 → 3 promotion | **人類 + Closure Steward gate** | **不可自升** |
| 高風險治理卡 close | Captain / Coordinator（人授權） | **不可自 close** |
| sandbox / janitor / rollback apply | 人審 + admission（E2 排程器） | **不可自動套用** |

## 4. Team Agents 交互契約（對齊 TASK-TEAM-0018 / 0019）

**可做**：read-only 分析；command-backed evidence 彙整；validator 執行；產 report / patrol-report。

**不可做**：繞過 `allowedFiles`；用 summary 取代 command-backed evidence；自動套用 sandbox / janitor / rollback 等高風險決策；自升 Trust Tier；自 close 高風險治理卡。

**對齊**：CID-E2（lease fencing / deadlock）對齊 `TASK-TEAM-0018`；CID-E3（sandbox attestation / closure）對齊 `TASK-TEAM-0019`。

## 5. 路線 E0–E5（E0 = 唯一第一階段最小閉環）

> E1–E5 為**後續階段**，須 E0 收口後再依序排卡。以下每階段四欄：現況基礎 / 新增能力 / 威脅模型 / 驗證命令。

### E0 — 真相與確定性基線（**第一階段，僅此**）

- **現況基礎**：`semantic-fingerprint.ts:26` 確定性合約指紋。
- **新增能力**（唯一第一階段最小閉環，只做三件）：
  - M0.1 `docs/CID_SEMANTICS.md`
  - M0.2 **optional** `fingerprintProfile` schema draft（五 slot，僅 `interface` 填值；additive、非 required；`additionalProperties:false` 保留並正式寫入 schema）
  - M0.3 **擴充既有** `validate:semantic-fingerprint`（加確定性 identity hash 回歸夾具，**不新建** script）
- **E0 不碰** Effects / Sandbox / Trust Tier / janitor / Team Agents runtime。
- **威脅模型**：無（純定義 / 確定性）。
- **驗證命令**：`validate:semantic-fingerprint`、`validate:schemas`、`validate:standard`。

### E1 — 副作用硬邊界 CID.Effects（後續）

- 現況：adapters 僅 import / entrypoint / dry-run（無 scanner）。
- 新增：**復用並擴充既有 `dependencyPolicy`** 作為宣告式合約（OQ#2 裁決，**不**新增 top-level `effectTags`）；scanner 可輸出衍生的 `observedEffects` / capability findings；effects-aware 替換閘。
- 威脅：誠實但有 bug（靜態可被 eval 繞過 → E3 兜底）。
- 驗證：`validate:effect-scanner`。

### E2 — 並發安全 fencing + 死鎖（後續，對齊 TASK-TEAM-0018）

- 現況：`leaseId + heartbeatAt + ttlSeconds`。
- 新增：`leaseEpoch` fencing、wait-for graph 死鎖偵測、symbol-scope lease、glob 過寬規則、released-tombstone 誤判測試。
- E2 primitive 定義：
  - `Active Resource Index`：目前所有活躍 lease / holder / resource scope / heartbeat / TTL / epoch 的可觀測索引，用於衝突 preflight、stale holder 判定與 deadlock diagnostics。
  - `Scope Lease Registry`：scope-lock / taskDirectionLock / governance-local store 的權威登錄視圖；記錄誰持有何種 resource、何時取得、何時釋放、對應 `leaseEpoch`。它不得成為第二套 task ledger、第二套 Git，或內容版本真相來源。
  - `leaseEpoch`：monotonic fencing token。任何 acquire / transfer / release 後，舊 holder 不得再成功釋放、轉交或以舊 epoch 完成 close。
  - `wait-for graph`：deterministic deadlock diagnostic。只判斷 lease dependency 是否成環；成環 fail，不做模糊推論、不自動調度。
- 與 Team Agents 分工：CID E2 defines the concurrency primitive；Team Agents adopts the concurrency contract。Team Agents 可把 Index/Registry 接到 `team status`、`team lease/release` 與 validator，但不可用它建立新 scheduler。
- deployment 適配度（現況評分，非已實作承諾）：

| 情境 | 目前適配度 | E2 補強後目標 | 不適合 / 需補強處 |
|---|---:|---:|---|
| A. 單一人類本機使用多個 AI 工具 | 8.5 / 10 | 9 / 10 | 主要缺口是未整合工具可能繞過 CLI；E2 可提高 stale holder 與 scope overlap 可見度。 |
| B. 多個人類各自電腦開發同一 repo | 6 / 10 | 7 / 10 | 本機 `.atm/runtime` 不天然跨機同步；仍需 Git/PR/CI、遠端 issue tracker 或 central lease adapter。 |
| C. 多 Agent 在同一 server / agent framework 跑同一 repo | 5 / 10 | 8 / 10 | 現況共用 working tree 多寫入風險高；需 tool proxy、per-agent worktree/branch/patch queue、fencing 與 wait-for diagnostics。 |

- 威脅：並發非惡意。
- 驗證：`validate:scheduler`。

### E3 — 零信任證據與沙盒（**承諾上限 Level 3**，後續，對齊 TASK-TEAM-0019）

- 現況：closure commandRuns / stdoutSha256 / exitCode；`runnerVersion` ≈ framework。
- 新增：result-envelope（消 CRLF / 版本飄移）+ attestation 欄位 + capability sandbox（候選 Deno；**`node:vm` / `isolated-vm` 不採用為安全沙盒**）+ mutation / 對抗閘 + `CID.Behavior`。
- E3 信任錨點與沙盒約束：
  - **真實信任根**：Local agent / local Deno sandbox / local daemon 不是信任根；簽章來源與可驗證 provenance 才是信任根。
  - **防混亂 vs 防竄改**：本機 sandbox 證據僅限 Tier 2（或 candidate 狀態），用於「防混亂」；Tier 3 / marketplace-grade 防竄改升級必須要求外部 `AttestationProvider` 簽章（以 GitHub Actions 作為第一個 reference adapter，但核心維持抽象不硬綁定）。
- E3 突變測試與對抗 QA 約束：
  - **非同步執行**：突變測試與對抗 QA 屬慢速與高耗能路徑，不得放在一般 `atm close` 的同步阻擋路徑。
  - **異步標記**：同步 close 時僅標記為 `pending` 或 `candidate`；作為 async Police / Behavior Police / Tier 3 promotion gate 在背景執行，通過後才掛載 `CID.Behavior` 或升級 Tier 3 badge。
  - **算力保護政策**：為防算力災難，必須寫入 budget / cap / sampling / sharding / timeout 等資源管控政策。
- 威脅：半信任 / 外來原子（本機 = 防混亂；CI signed = 防竄改）。
- 驗證：`validate:sandbox`、`validate:mutation-gate`。

### E4 — Advisory 智能 + 分級自治（後續）

- 現況：police advisory + daily-cap + suppression + `directApplyAllowed:false`；sweep / expire 為 dry-run。
- 新增：`CID.Semantic` 候選排序（永不作相等判定）；janitor host-apply（限可逆零衝突 + E2 准入）；finding digest / 分級。
- 威脅：模型版本漂移（鎖版本）。
- 驗證：`validate:janitor`。

### E5 — Trust Tier +（延後）市場

- 現況：既有 `RegistryGovernanceTier`。
- 新增：Trust Tier 1 / 2 / 3 狀態機（與 `RegistryGovernanceTier` 區分）+ promotion gate（人審）。
- E5 治理升級與 Trust Tier 約束：
  - **Tier 3 晉升條件**：晉升 Tier 3 / marketplace-grade 的防竄改狀態，必須通過非同步對抗 QA 與突變測試，並且具備外部 `AttestationProvider` 簽章與可驗證的 provenance。
  - **人審收口**：不允許自動晉升，必須經由人類 Closure Steward 的 promotion gate 進行裁決。
- E5.2 市場 = **延後、gated、Tier 3 本地實證後解鎖**；與 `ECOSYSTEM_POSITIONING.md`（不取代 package manager）一致。
- 驗證：`validate:trust-tier`。

### 依賴與順序

```
E0（唯一第一階段，0001 → 0002 → 0003）
        ↓
        ├─→ P0 formal card（0005，CID-first parallel conflict advisor）優先
        ├─→ E1 planning（0004，可平行設計，不搶先實作）
        ├─→ E3 planning（0006，對齊 TASK-TEAM-0019）
        └─→ E5 治理 planning（0007）
                ↓
        各階段 planning 定稿後，再各自拆 AAF 實作卡
                ↓
        E5.2（跨組織市場）gated，Tier 3 本地實證後才解鎖
```

### Level 對映

| Level | 對映 | 承諾？ |
|---|---|---|
| L1 靜態結構身分 | E0（Interface 確定性身分 + Strict） | ✅ |
| L2 語意 + 正常路徑 | E1 部分 + E4.1（向量搜尋 + happy-path Behavior） | ✅ |
| **L3 零信任沙盒** | E1（Effects）+ E3（sandbox + mutation + 對抗 + Behavior） | ✅ **上限** |
| L4 形式驗證 | 限縮特定可驗證 atom 類別（純函數 / 小核心） | ⛔ aspirational |
| L5 全域免疫 | 需市場 + 威脅情資網路 | ⛔ aspirational |

## 6. 任務卡（詳見 [tasks/README.md](./tasks/README.md)）

| Task | 階段 | 標題 | target_repo |
|---|---|---|---|
| `TASK-CID-0001` | E0 | CID hardening 控制面 bootstrap + 三層事實表 | 3KLife |
| `TASK-CID-0002` | E0 | CID semantics + fingerprintProfile schema | AI-Atomic-Framework |
| `TASK-CID-0003` | E0 | 擴充 validate:semantic-fingerprint 確定性測試 | AI-Atomic-Framework |
| `TASK-CID-0004` | E1 | dependencyPolicy 擴充 / CID.Effects 設計草案 | 3KLife |
| `TASK-CID-0005` | P0 | CID-first parallel conflict advisor CLI contract | 3KLife |
| `TASK-CID-0006` | E3 | closure attestation / sandbox wording 對齊 TASK-TEAM-0019 | 3KLife |
| `TASK-CID-0007` | E5 | Trust Tier 責任矩陣與 promotion gate | 3KLife |

## 7. 裁決狀態

**已裁決（v3.1）**：

- E0 為唯一第一階段最小閉環；E0 後**先開 P0 formal card**（`TASK-CID-0005`，CID-first parallel conflict advisor），E1 Effects 可設計但不搶先實作。
- `TASK-CID-0004 ~ 0007` 均維持 planning_repo，定稿後再拆 AAF 實作卡。
- **目錄與卡前綴**：`docs/ai_atomic_framework/cid-hardening/` + `TASK-CID-*`，獨立 lane（與 APF / TEAM 並列）。
- **CID.Effects 與既有 dependencyPolicy**：採用**復用並擴充既有 `dependencyPolicy`**。E1 階段不新增 top-level `effectTags` 欄位。scanner 可以輸出衍生的 `observedEffects` / capability findings，但宣告式合約仍以 `dependencyPolicy` 為主。
- **fingerprintProfile 遷移**：允許以 additive / optional / 向後相容方式進行 spec schema 版本 bump。`fingerprintProfile` 必須是選填欄位，不得設為 required。既有 fixtures / registry entries 不需要回填也必須維持有效。`additionalProperties:false` 繼續保留，新欄位必須正式寫入 schema。
- **E2 併發責任切分**：CID E2 定義 `Active Resource Index` / `Scope Lease Registry` / `leaseEpoch` / wait-for graph 等 primitive；Team Agents 只採用此 contract 做 runtime 顯示、lease validator 與 diagnostics，不建立第二個 task scheduler 或 Git 替代層。

**仍待裁決**：無（v3.1 起所有 OQ 已關閉）。

## 8. 設計與實作守則 (Implementation Guardrails)

本章定義後續 CID 硬化在實作階段必須遵守的硬性設計約束，以防範信任鏈缺陷與資源算力失控：

### 8.1 證據與 Trust Anchor 約束
- **分層證據力**：本機 agent、本機 Deno 沙盒或本機守護行程（daemon）所提供的證據，最高僅能評為 Tier 2 或 candidate 狀態。此類證據定位為「防混亂」（防止本機開發期的版本與環境混淆）。
- **外部簽章**：若要升級至 Tier 3、發布至公開市場（marketplace-grade）或進行具備防竄改特性的升級，必須要求外部 `AttestationProvider` 提供數位簽章。
- **適配器抽象**：可以使用 GitHub Actions 作為第一個參考適配器（reference adapter）實作，但 ATM 核心程式碼必須維持抽象層，嚴禁硬綁定（hardcode）任何特定的 CI/CD 平台（如 GitHub Actions）。
- **真實信任源**：信任根絕非「誰啟動了 sandbox」，而是「簽章的來源 (Attestation Signer)」與「可驗證的溯源證明 (provenance)」。

### 8.2 突變測試與對抗 QA 資源防護
- **非同步阻擋**：突變測試（Mutation testing）與對抗 QA 不得併入一般 `atm close` 的同步阻擋路徑，避免阻礙開發工作流。
- **行為警察審計**：此類耗時測試應做為 async Police、Behavior Police 或 Tier 3 promotion gate。
- **異步標記**：當一般開發任務進行 close 時，先標記為 `pending` 或 `candidate`；待背景 CI 流程完成上述測試後，才正式掛載 `CID.Behavior` 屬性或 Tier 3 badge。
- **算力約束政策**：必須為這類高耗能測試制定完整的資源防護政策，包含：
  - **算力預算 (Budget/Cap)**：每日或單次任務的最高 CPU/記憶體執行時間限制。
  - **抽樣與分片 (Sampling/Sharding)**：僅對變更影響範圍內的關鍵 atom/map 進行突變測試，不作全量盲測。
  - **逾時與降級 (Timeout/Degradation)**：設定嚴格的逾時時限，逾時則降級報告，不得無限期卡住背景管線。

## 9. Cross-References

- 上游核准 roadmap：`C:/Users/User/.claude/plans/ticklish-bouncing-lagoon.md`（v3.1）
- 事實基線：[00-verified-facts.md](./00-verified-facts.md)
- APF 控制面：[../atomic-police-family/原子警察家族計畫書.md](../atomic-police-family/原子警察家族計畫書.md)
- TEAM 控制面：[../team-agents/團隊自動化代理分工計畫.md](../team-agents/團隊自動化代理分工計畫.md)
- 對齊任務卡：`TASK-TEAM-0018`（lease fencing）、`TASK-TEAM-0019`（sandbox attestation）
- 公開文章對應修正點：`AI-learning-notes/atm_atomic_foundry_public.html` §4（CID 段，待 E0 收口後同步修正）
