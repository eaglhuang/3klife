<!-- doc_id: doc_other_0120 -->
# ATM Agent Guidance Layer（框架本體版）實作計劃書

## 1. 目標與原則

本計劃的目標是把 ATM Agent Guidance 能力完整實作到 `AI-Atomic-Framework` 本體，而不是落在任何 adopter 專案。

核心原則如下：

- `guide-first`：陌生 Agent 進場先被框架導引，不先做 mutation。
- `proposal-before-mutation`：`atomize/infect/split` 先產 proposal，再由 review 決定 apply。
- `review-before-apply`：沒有 human review 通過，不可對 host 套 patch。
- `deterministic-first`：第一版 route/decision 全部 deterministic，不依賴 LLM 判斷。
- `adapter-facts-only`：adopter 僅透過 adapter 提供事實與政策，不承擔 guidance 核心邏輯。

## 2. 成果定義（Done Definition）

此計劃完成時，需同時滿足：

- CLI 可用 `orient/start/next/explain` 四個 guidance 一級命令。
- `next` 能輸出唯一建議下一步，且附 allowed/blocked command 清單與缺失 evidence。
- 任何高風險 mutation 都被 `MutationGate` 統一約束，含 session、proposal、review、release blocker 檢查。
- `atomize/infect/split` 可消費 `LegacyRoutePlan` 或等價 proposal evidence，不能繞過。
- Plugin SDK 與 `adapter-local-git` 有新的 host policy 介面與中立預設。
- `validate-guidance` 驗證器、fixtures、help snapshot、release bundle 全部同步。

## 3. 範圍與非目標

本次範圍：

- `AI-Atomic-Framework` repo 內 core、cli、plugin-sdk、adapter、validator、fixture、docs/release 同步。
- 對 adopter repo 的依賴僅限 `ProjectAdapter` 介面回傳 host facts。

非目標：

- 不在 3KLife 或其他 adopter repo 實作 guidance 核心。
- 不把 route 決策交給 LLM。
- 不新增 framework 外部服務依賴。

## 4. 目錄與模組落點

建議新增/調整模組如下（路徑為框架 repo 內）：

- `packages/core/src/guidance/project-probe.ts`
- `packages/core/src/guidance/route-engine.ts`
- `packages/core/src/guidance/legacy-route-plan.ts`
- `packages/core/src/guidance/mutation-gate.ts`
- `packages/core/src/guidance/session-store.ts`
- `packages/core/src/guidance/guidance-packet.ts`
- `packages/core/src/guidance/index.ts`
- `packages/cli/src/commands/orient.ts`
- `packages/cli/src/commands/start.ts`
- `packages/cli/src/commands/explain.ts`
- `packages/cli/src/commands/next.ts`（改為 guidance-aware）
- `packages/cli/src/commands/guide.ts`（overview 文案與 guidance-first 路由）

## 5. 核心子系統規格

### 5.1 ProjectProbe

`ProjectProbe` 負責掃描目標 repo 並產出 `ProjectOrientationReport`。

最低欄位：

- `repositoryRoot`
- `detectedLanguages`
- `packageManager`
- `testEntrypoints`
- `governanceFiles`
- `adapterStatus`
- `availableAdapters`
- `registryState`
- `mapState`
- `atomState`
- `legacyUriSupport`
- `hostGates`
- `noTouchZones`
- `mutationPolicy`
- `legacyHotspots`
- `releaseBlockers`
- `unknowns`

設計要求：

- 掃描邏輯 deterministic。
- 缺資料時只填 `unknowns`，不可猜測補值。
- `hostGates/noTouchZones/mutationPolicy` 優先由 adapter 提供，無則走中立預設。

### 5.2 RouteEngine

`RouteEngine` 輸入 `goal + orientation + evidence/police findings`，輸出 route 決策。

支援 route：

- `create-atom`
- `atomize`
- `infect`
- `split`
- `evolve`
- `adapter-bootstrap`
- `legacy-fix`
- `docs-first`

輸出 contract：

- `recommendedRoute`
- `confidence`（0~1）
- `reasons`
- `routeChoices`（當歧義高時 2~3 選）
- `requiredEvidence`
- `blockedBy`

決策規則：

- 高歧義時回 `routeChoices`，但 `atm next` 仍需給唯一可執行下一步（通常是補 evidence）。
- `demand-police` finding 只觸發 `split proposal` 路徑，不直接拆檔。

### 5.3 LegacyRoutePlan

`LegacyRoutePlan` 是 legacy 專用路線輸出，必須可被 `atomize/infect/split` 消費。

最低欄位：

- `targetFile`
- `segments`
- `trunkFunctions`
- `leafFunctions`
- `adapterBoundaries`
- `existingAtomMatches`
- `releaseBlockers`
- `safeFirstAtoms`
- `noTouchZones`
- `requiredDryRunProposal`

每個 segment 至少含：

- `symbolName`
- `role`（`trunk | leaf | adapter-boundary`）
- `riskLevel`
- `existingAtomMatch`（可空）
- `recommendedBehavior`

### 5.4 MutationGate

`MutationGate` 統一處理 mutation 擋控。

規則：

- 無 active session：block 所有 host mutation。
- 無 `LegacyRoutePlan`：block legacy 目標上的 `atomize/infect/split`。
- `atomize/infect` 沒 dry-run proposal：block。
- proposal 未 review-approved：block apply。
- 有 release blocker：block promote。
- 對 trunk function 直接改寫：預設 block，只允許 leaf-first/proposal 路徑。
- `--unguided --reason`：只在 dev profile advisory 放行，並寫 audit log。
- CI/release profile：不允許 unguided mutation。

### 5.5 GuidancePacket

`GuidancePacket` 為 Agent 消費的短版操作包。

最低欄位：

- `sessionId`
- `readFirst`
- `doNotTouch`
- `nextCommand`
- `allowedCommands`
- `blockedCommands`
- `requiredGates`
- `missingEvidence`
- `rollbackHint`
- `whyThisRoute`

## 6. CLI 合約

新增命令：

- `node atm.mjs orient --cwd <repo> --json`
- `node atm.mjs start --cwd <repo> --goal "<goal>" --json`
- `node atm.mjs next --cwd <repo> --json`
- `node atm.mjs explain --why blocked --session <id> --json`

命令語義：

- `orient`：輸出 `ProjectOrientationReport`。
- `start`：建立 `GuidanceSession`，產生初始 route 與 `GuidancePacket`。
- `next`：根據 active session + 最新 evidence 回唯一下一步。
- `explain`：解釋 block 原因、缺失 gate/evidence、解除路徑。

`next` 的強約束：

- 只能有一條 `nextAction.command`。
- 必須同時回 `allowedCommands` 與 `blockedCommands`。

## 7. 現有入口整合

`guide`：

- 保留 `glossary/help`。
- `overview` 改為 guidance-first 文案與命令入口。

`next`：

- 有 active `GuidanceSession` 時走 guidance flow。
- 無 session 時回 bootstrap/orient/start 的唯一下一步。

`upgrade` 與 behavior pack：

- `atomize/infect/split` 執行前驗證 `LegacyRoutePlan` 或等價 proposal evidence。
- 缺失時 hard fail，錯誤碼需可 machine parse。

## 8. Plugin SDK 與 Adapter 規格

### 8.1 Plugin SDK 介面增補

在 `ProjectAdapter` 增加：

- `listHostGates(context): HostGate[]`
- `listNoTouchZones(context): NoTouchZone[]`
- `resolveMutationPolicy(context): MutationPolicy`

建議最小型別：

- `HostGate`：`gateId`, `description`, `severity`, `blocking`
- `NoTouchZone`：`path`, `reason`, `scope`
- `MutationPolicy`：`requireSession`, `requireDryRunProposal`, `allowUnguidedInDev`, `allowUnguidedInCI`

### 8.2 adapter-local-git 預設

`adapter-local-git` 提供中立預設：

- `listHostGates` 回空陣列。
- `listNoTouchZones` 回空陣列。
- `resolveMutationPolicy` 回 `guide-first/proposal-before-mutation` 的保守預設。

## 9. Session、Audit、Artifact

建議儲存路徑（框架 repo 規範）：

- `.atm/runtime/guidance/active-session.json`
- `.atm/history/guidance/sessions/<session-id>.json`
- `.atm/history/guidance/audit-log.jsonl`
- `.atm/history/guidance/proposals/<session-id>.json`

需求：

- session id deterministic 格式（可追溯時間與 hash）。
- audit log 至少記錄 `who/when/action/reason/result/profile`。

## 10. 測試策略

新增 `validate-guidance`，並加入 `test` 與 `standard` profile。

必備 fixtures 與斷言：

- unknown repo：`orient -> start` route 為 `adapter-bootstrap`。
- existing atom match：legacy fingerprint 命中時 route 為 `infect`。
- new helper：低耦合且無命中時 route 為 `atomize`。
- demand threshold：route 為 `split proposal`，不可直接 mutate。
- enforcement：無 session hard fail。
- unguided：`--unguided --reason` 僅 dev advisory 並寫 audit。
- proposal pairing：`behaviorId/decompositionDecision` 錯配 hard fail。
- next uniqueness：`nextAction` 僅一條命令。

CLI/help/release 驗證：

- help snapshot 含 `orient/start/next/explain`。
- root-drop / onefile 可執行 guidance 命令。
- `npm run validate:standard` 全綠。

## 11. 錯誤碼與可觀測性

新增錯誤碼建議：

- `ATM_GUIDANCE_SESSION_REQUIRED`
- `ATM_GUIDANCE_LEGACY_PLAN_REQUIRED`
- `ATM_GUIDANCE_PROPOSAL_REQUIRED`
- `ATM_GUIDANCE_REVIEW_REQUIRED`
- `ATM_GUIDANCE_RELEASE_BLOCKER`
- `ATM_GUIDANCE_TRUNK_MUTATION_BLOCKED`
- `ATM_GUIDANCE_UNGUIDED_FORBIDDEN`
- `ATM_GUIDANCE_NEXT_NOT_UNIQUE`

每個錯誤都需：

- 穩定 code
- 人類可讀 message
- `details`（包含可解除 block 的下一步）

## 12. 實作順序（可分派給多 Agent）

Wave 1：Core foundation

- 建立 guidance 核心型別與 `ProjectProbe/RouteEngine/LegacyRoutePlan/MutationGate/GuidancePacket`。
- 建立 session/audit store。

Wave 2：CLI integration

- 新增 `orient/start/explain`。
- 改寫 `next` 為 guidance-aware。
- 更新 `guide` overview。

Wave 3：SDK + adapter + behavior gate

- 擴充 `ProjectAdapter` 介面。
- 更新 `adapter-local-git`。
- 串接 `upgrade` 與 behavior pack gating。

Wave 4：Validation + release + docs

- 新增 `validate-guidance` 與 fixtures。
- 更新 command help snapshots。
- 更新 root-drop / onefile release 驗證。

## 13. 驗收標準（Acceptance Criteria）

- 不依賴 LLM 判斷即可在陌生 repo 完成 orient/start/next/explain 導引。
- 任何 host mutation 都會被 `MutationGate` 正確攔截或放行，且有可審計記錄。
- `next` 永遠提供單一路徑，不回候選洪流。
- adapter 僅提供事實與政策；core 不含 adopter 專案知識。
- 全套 validators 通過，release bundle 命令可用。

## 14. 風險與緩解

- 風險：route 規則過嚴導致 workflow 卡死。
- 緩解：`explain --why blocked` 必須提供可執行的解除步驟與 evidence 清單。

- 風險：adapter 介面升級造成既有 adapter 破壞。
- 緩解：提供 backward-compatible default shim，並在 validator 加明確錯誤訊息。

- 風險：`next` 多路徑輸出造成 Agent 決策分歧。
- 緩解：將歧義收斂為「補 evidence」唯一命令，route choices 僅做背景資訊。

## 15. 交接給其他 Agent 的執行指令

建議交接文本：

`請以此文件為唯一實作規格，按 Wave 1→4 逐步提交。每個 Wave 完成後執行對應 validator，附上變更檔案清單、validator 結果、未解決風險。`

建議最小驗證命令：

```bash
npm run validate:quick
npm run validate:standard
```

