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
- 威脅：並發非惡意。
- 驗證：`validate:scheduler`。

### E3 — 零信任證據與沙盒（**承諾上限 Level 3**，後續，對齊 TASK-TEAM-0019）

- 現況：closure commandRuns / stdoutSha256 / exitCode；`runnerVersion` ≈ framework。
- 新增：result-envelope（消 CRLF / 版本飄移）+ attestation 欄位 + capability sandbox（候選 Deno；**`node:vm` / `isolated-vm` 不採用為安全沙盒**）+ mutation / 對抗閘 + `CID.Behavior`。
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
- E5.2 市場 = **延後、gated、Tier 3 本地實證後解鎖**；與 `ECOSYSTEM_POSITIONING.md`（不取代 package manager）一致。
- 驗證：`validate:trust-tier`。

### 依賴與順序

```
E0（唯一第一階段，0001 → 0002 → 0003）
        ↓
        ├─→ E2 planning（0005，對齊 TASK-TEAM-0018 已 draft）優先
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
| `TASK-CID-0005` | E2 | Team lease TTL / heartbeat / fencing 對齊 TASK-TEAM-0018 | 3KLife |
| `TASK-CID-0006` | E3 | closure attestation / sandbox wording 對齊 TASK-TEAM-0019 | 3KLife |
| `TASK-CID-0007` | E5 | Trust Tier 責任矩陣與 promotion gate | 3KLife |

## 7. 裁決狀態

**已裁決（v3.1）**：

- E0 為唯一第一階段最小閉環；E0 後**先排 E2 planning**（`TASK-TEAM-0018` 已 draft），E1 Effects 可設計但不搶先實作。
- `TASK-CID-0004 ~ 0007` 均維持 planning_repo，定稿後再拆 AAF 實作卡。
- **目錄與卡前綴**：`docs/ai_atomic_framework/cid-hardening/` + `TASK-CID-*`，獨立 lane（與 APF / TEAM 並列）。
- **CID.Effects 與既有 dependencyPolicy**：採用**復用並擴充既有 `dependencyPolicy`**。E1 階段不新增 top-level `effectTags` 欄位。scanner 可以輸出衍生的 `observedEffects` / capability findings，但宣告式合約仍以 `dependencyPolicy` 為主。
- **fingerprintProfile 遷移**：允許以 additive / optional / 向後相容方式進行 spec schema 版本 bump。`fingerprintProfile` 必須是選填欄位，不得設為 required。既有 fixtures / registry entries 不需要回填也必須維持有效。`additionalProperties:false` 繼續保留，新欄位必須正式寫入 schema。

**仍待裁決**：無（v3.1 起所有 OQ 已關閉）。

## 8. Cross-References

- 上游核准 roadmap：`C:/Users/User/.claude/plans/ticklish-bouncing-lagoon.md`（v3.1）
- 事實基線：[00-verified-facts.md](./00-verified-facts.md)
- APF 控制面：[../atomic-police-family/原子警察家族計畫書.md](../atomic-police-family/原子警察家族計畫書.md)
- TEAM 控制面：[../team-agents/團隊自動化代理分工計畫.md](../team-agents/團隊自動化代理分工計畫.md)
- 對齊任務卡：`TASK-TEAM-0018`（lease fencing）、`TASK-TEAM-0019`（sandbox attestation）
- 公開文章對應修正點：`AI-learning-notes/atm_atomic_foundry_public.html` §4（CID 段，待 E0 收口後同步修正）
