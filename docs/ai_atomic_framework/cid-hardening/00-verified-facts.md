<!-- doc_id: doc_cid_facts_0001 -->

# CID Hardening — 三層事實基線（Verified Facts / Proposals / Out-of-Scope）

> 本檔是 `cid-hardening` lane 的**事實鎖點**。所有 `TASK-CID-*` 卡的「現況基礎」描述必須與本檔一致；
> 提案內容（B 表）一律標「未實作」，不得在後續卡中被誤寫成現況。
> 上游核准 roadmap：`C:/Users/User/.claude/plans/ticklish-bouncing-lagoon.md`（v3.1）。
> Last verified: 2026-06-03

## A. 已驗證事實（附 file:line）

| # | 事實 | 證據 |
|---|---|---|
| A1 | `semanticFingerprint` 已存在，**確定性**，hash **normalized ports（inputs/outputs）+ language.primary + validation.evidenceRequired + performanceBudget**；**不讀 AST、不讀實作、不用 LLM**。正名「合約/介面 + 執行約束指紋」——**不是純 ports hash，也不是 embedding / LLM semantic identity**。 | `packages/core/src/registry/semantic-fingerprint.ts:26` |
| A2 | 現況 CID 是**三條獨立線**：capsule `atom:cid` / `map:cid`、`hashLock`、`semanticFingerprint`。 | capsule / `hash-lock.ts` / `semantic-fingerprint.ts` |
| A3 | atom spec 與 registry schema 為 `additionalProperties:false`（加新欄位需 schema 遷移）。 | `schemas/atomic-spec.schema.json:6` |
| A4 | 語言轉接器目前**只做 import / entrypoint / dry-run planning，無 effect scanner**。 | `language-js-adapter.ts:35`、`language-python-adapter.ts:81` |
| A5 | scope-lock 現況 = `leaseId + heartbeatAt + ttlSeconds`；`taskDirectionLock.allowedFiles`；team permission validation。**無 leaseEpoch / wait-for graph / symbol-scope lease。** | `packages/core/src/governance/scope-lock.ts` / `plugin-governance-local` 的 LockStore |
| A6 | closure-packet 有 `commandRuns / stdoutSha256 / exitCode`；但 `runnerVersion` **≈ framework version，非 sandbox / OS / runtime attestation**。 | `schemas/governance/closure-packet.schema.json` / closure 生成器 |
| A7 | Police = advisory、`DEFAULT_POLICE_DAILY_CAP`、`suppressionKey`、`directApplyAllowed:false`、`ReviewAdvisory / HumanReviewDecision` 皆已存在。 | `packages/core/src/police/family.ts` |
| A8 | `sweep` / `expire` 現況是 **dry-run / registryTransition 提案，非直接 host apply**。 | `packages/plugin-behavior-pack` |
| A9 | 既有 `RegistryGovernanceTier`（與本 roadmap 的 Trust Tier 不同）。 | registry governance |
| A10 | Team Agents 任務卡已匯入；**`team start` 不是真的 spawn agents**（現為 planning / checklist）。 | `team-agents/團隊自動化代理分工計畫.md` §2.7 |

## B. 新提案（**未實作**，本 roadmap 才引入）

| # | 提案 | 屬於 |
|---|---|---|
| B1 | `fingerprintProfile` schema 與命名 `CID.Strict / Interface / Effects / Semantic / Behavior` | E0 / E1+ |
| B2 | `CID.Effects`：**復用並擴充既有 `dependencyPolicy`**（OQ#2 已裁決）；scanner 輸出衍生 `observedEffects` / capability findings | E1 |
| B3 | effects-aware 替換相容性閘（純函數 vs IO 不可替換） | E1 |
| B4 | `leaseEpoch`（fencing token）+ wait-for graph 死鎖偵測 + symbol-scope lease | E2 |
| B5 | closure attestation 欄位 `runnerKind / runtimeVersion / sandboxPolicyHash / attestationSigner` | E3 |
| B6 | capability sandbox（候選 = Deno 權限模型）+ quarantine | E3 |
| B7 | 突變測試 / 對抗 QA 閘；`CID.Behavior`（harness id + pass-set hash） | E3 |
| B8 | `CID.Semantic` embedding 去重（鎖模型版本，非身分 metadata） | E4 |
| B9 | janitor：sweep / expire 的 finding → **host apply** 路徑 | E4 |
| B10 | Trust Tier 1 / 2 / 3（≠ 既有 `RegistryGovernanceTier`） | E5 |

## C. 暫不做（近期明確不在範圍）

- Level 4 形式驗證 / 符號執行 / 污點分析（aspirational）。
- Level 5 全域免疫 / 威脅情資網路（aspirational）。
- 跨組織 CID 原子市場（E5.2，gated，Tier 3 本地實證後才解鎖）。
- **預設自動 sandbox 執行 / 無人值守自動 mutate**（守 `directApplyAllowed:false` 與 A7）。
- `node:vm` / `isolated-vm` 作為**安全沙盒**（Node 官方明示 `node:vm` 非安全機制）；Docker 沙盒（守 90 分鐘承諾）。
- 區塊鏈式 distributed consensus / 帳本分叉仲裁。
- 以內容雜湊作 caller 連結鍵。
- 把 LLM 輸出餵進 identity hash。

## D. 現況聲明（避免後續 AI 把願景誤當事實）

- **embedding、Deno sandbox、isolated-vm、任何「安全 sandbox」、真 subagent runtime：目前皆未實作。**
- **`sweep` / `expire`：目前仍是 dry-run / proposal 狀態**，無 host apply。
- **Trust Tier（本 roadmap 提案）不得混同既有 `RegistryGovernanceTier`。**
- 本檔的事實項（A 表）若上游程式碼演進，需在對應卡完成時更新本檔的 `Last verified` 與引用行號。
