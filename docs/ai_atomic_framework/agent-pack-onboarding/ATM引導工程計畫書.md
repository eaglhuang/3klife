<!-- doc_id: doc_other_0162 -->
# ATM 引導工程計畫書

## 0. 核心結論

ATM 引導工程是 ATM Agent Operating Layer 的正式主計畫。它的責任不是替代 ATM core、也不是把任何外部流程搬進框架，而是讓使用者專案在 first-touch 時能被穩定導入 ATM 治理循環：先讀框架規則、再取得動態下一步、最後用 deterministic gate 驗證結果。

本計畫把既有兩條討論線收斂成單一工程主線：

1. Agent 入口層：讓各種 agent 看到相同的 ATM 入口指令、AtomicCharter 摘要與守衛規則。
2. 規則渲染層：從 machine-readable SSoT 渲染 ATMChart 與 agent-native entry files，並用 sha256 manifest 防漂移。
3. 動態路由層：所有模板與 slash command 都只導向 `atm next --json` 或既有 deterministic CLI，不自建流程狀態機。
4. 驗證閉環層：`doctor`、`verify`、`integration verify`、`atm-chart verify`、`agent-pack verify-fresh` 與 CI / hook recipe 共同偵測跳過入口、規則漂移與缺 evidence 的情況。

正式定位：ATM 引導工程是框架中立能力，只能描述可公開、可重現、可卸載、可驗證的入口機制。任何採用者專案、實驗專案或外部工具的特定語意，都不得寫成本計畫的前提。

## 1. 範圍與非目標

### 1.1 範圍

本計畫交付下列能力：

- AtomicCharter 與 default governance rules 的 agent 可讀摘要。
- Integration Adapter Layer 與 InstallManifest / sha256 freshness 機制。
- Agent Pack 產品語言與 agent-native entry files 的 render / verify / uninstall 流程。
- ATMChart rule render pipeline。
- `atm welcome` first-touch lifecycle 與 lineage 記錄。
- `atm next --json` 的 agent-pack hint / next action hint 欄位。
- `create-atm` / npm fourth distribution layer。
- multi-agent compatibility matrix generator。
- CI / hook enforcement recipe 與 adoption metrics。

### 1.2 非目標

本計畫不處理下列事項：

- 不重新定義 atom / map / replacement schema。
- 不把 agent-specific 邏輯下沉到 `packages/core/`。
- 不要求使用者一定安裝某個 agent pack；裸 CLI 路徑必須永遠有效。
- 不在模板內寫死完整任務流程、rollout phase 或專案私有規則。
- 不把採用者專案、內部工具或外部引導框架名稱寫成官方契約。

## 2. 設計原則

### 2.1 CLI 是權威，模板只負責導路

Agent-native template、slash command、SKILL.md、prompt file 只能要求 agent 呼叫 ATM CLI。模板可說明「第一個命令是什麼」，但下一步由 `atm next --json`、registry、evidence store 與 gate 決定。

### 2.2 SSoT 單向渲染

`default-guards.json`、schema、AtomicCharter invariants、integration manifest 是唯一真相。Markdown、prompt、TOML、rule file 皆為渲染產物，必須可由 CLI 重建並可用 hash 驗證。

### 2.3 Agent Pack 是產品語言，Integration Adapter 是實作語言

對使用者可稱 Agent Pack；對程式碼與驗證層，以 `IntegrationAdapter`、`IntegrationSourceFile`、InstallManifest 與 adapter compiler 為準。若存在 pack package，也只能作為薄 facade 或 re-export，不複製第二套 renderer / manifest / uninstall 邏輯。

### 2.4 可選安裝，可強制驗證

使用者可選擇安裝哪個 agent adapter；但只要宣告採用 ATM official onboarding，就必須能被 `doctor`、CI 或 hook 檢查入口檔是否存在、是否漂移、是否缺少必要規則摘要。

### 2.5 可乾淨卸載

所有寫入使用者專案的 agent-native file 都要有 manifest。未被修改的檔案可自動刪除；已被使用者修改的檔案不得誤刪，應保留、備份或提示人工處理。

### 2.6 中立性掃描是文件 gate

ATM 框架計畫文件不得引用採用者專案名、外部引導框架名、內部工具代號或任何非 ATM 契約的私有語意。若需要描述採用者案例，應放入 adopter / case-study 類文件，不得回寫到本計畫。

## 3. 目標架構

```text
AtomicCharter / default rules / schemas
  -> Rule Render Pipeline
  -> ATMChart + integration source files
  -> agent-native entry files + InstallManifest
  -> atm welcome / atm next --json
  -> evidence / verify / doctor / CI
```

### 3.1 AtomicCharter 與治理摘要

AtomicCharter 定義 agent 必須遵守的框架級 invariants。它應被注入 entry files，並由 `doctor` 或 integration verifier 確認沒有缺漏。此層只描述 ATM 的通用規則，不描述任何 host-specific workflow。

### 3.2 Integration Adapter Layer

Integration Adapter 負責把同一組 ATM skill template 編譯成不同 agent 可讀格式。每個 adapter 至少要能提供：

- `list`：列出可用 adapter 與狀態。
- `add / install`：寫入 agent-native entry files 並建立 manifest。
- `verify`：檢查檔案存在、hash freshness 與 charter injection。
- `remove / uninstall`：安全移除未被修改的檔案。
- `diff`：報告 user-modified、missing、stale 等狀態。

### 3.3 Skill Template Compiler

Template source 必須集中在單一目錄，由 compiler 針對不同 adapter 產生 markdown、prompt 或 TOML。所有模板共同遵守：

- 第一命令固定導向 ATM CLI。
- 不 baked-in 私有流程。
- 不複製守衛全文，只引用渲染出的摘要與 hash。
- 保留 handoff route，讓 agent 能把工作回交給 ATM evidence / handoff command。

### 3.4 ATMChart 與 Rule Render Pipeline

`atm-chart render` 從 SSoT 產出可讀摘要，frontmatter 必須包含來源 hash。`atm-chart verify` 比對目前 SSoT 與已渲染摘要，若 stale 則非零 exit，阻止 stale rules 進入 release 或 official onboarding path。

### 3.5 Agent Pack Hint / Next Action Hint

`atm next --json` 的 evidence 必須提供 agent-pack 可消費的 hint。標準欄位包含：

```json
{
  "slashCommandId": "atm-next",
  "route": "ready",
  "command": "node atm.mjs next --json",
  "reason": "ATM is ready for the next governed action."
}
```

Hint 是建議路由，不是新的權威流程。真正可執行的下一步仍以 `evidence.nextAction.command` 為準。

### 3.6 Welcome Lifecycle

`atm welcome` 是 first-touch 摘要器。它應讀取 ATMChart、integration health、installed adapters 與 `atm next --json` 結果，產出 welcome evidence；非 dry-run 時寫入 `.atm/runtime/welcome.lineage.json`。Lifecycle 至少包含：

1. `uninstalled`
2. `installed`
3. `rules-rendered`
4. `adapter-applied`
5. `welcomed`
6. `operational`

### 3.7 Distribution Layer

ATM 維持多層發佈共存：source routing、root drop、onefile、npm package。`create-atm` 是低摩擦入口，但不能稀釋治理嚴肅性；預設行為要讓使用者看見 ATMChart / welcome 摘要，而不是只顯示安裝成功。

### 3.8 ATM Framework 與 ATMChart Versioning

ATM Framework Version 與 ATMChart Version 是「分層座標、同一 release train」。Framework version 描述 CLI、package、plugin、adapter 與 release artifact 的程式能力；ATMChart version 描述 `default-guards.json`、schema 與 AtomicCharter 摘要的規則語意。兩者不必同號，但不得各自發布、各自漂移；每次 Framework release 必須宣告它內建與支援的 chart / template version 範圍。

換句話說：版本號是分層的，發布治理是統一的。Chart / Template version 只能存在於 Framework release manifest / compatibility matrix 之中，不能成為第二條公開發布線。

版本治理分三層：

1. **ATM Framework Version**：由 npm package / root-drop / onefile release tag 驅動，採 SemVer。CLI、plugin SDK、adapter interface、release workflow 與 public package metadata 都屬此層。
2. **ATMChart Version**：由 governance rules / schema / AtomicCharter invariants 驅動，採獨立 chart semantic version。`default-guards.json.schemaVersion` 目前對應 `atm.defaultGuards.v0.1`，後續需可映射到可比較的 chart version 與 `minFrameworkVersion`。
3. **Agent Pack / Integration Template Version**：由 entry template source 與 adapter compiler 驅動。InstallManifest 必須記錄安裝當下的 framework version、chart version、template version 與 source hash。
4. **Release Manifest / Compatibility Matrix**：每個 framework release 必須宣告 default chart、default template、supported chart range、deprecated range、unsupported range 與 migration guide 連結。

相容規則：

- Framework patch / minor 可支援多個 chart version；Framework major 才能移除已宣告 unsupported 的舊 chart。
- ATMChart minor 只能新增 optional 規則或摘要欄位；若移除欄位、改變 required semantics、改變 guard 判斷結果，必須視為 chart major / breaking change。
- `atm-chart verify`、`integration verify`、`agent-pack verify-fresh` 與 `doctor` 必須同時回報 hash freshness 與 version compatibility。hash 一致但版本 unsupported 時仍應 fail。
- `atm welcome` 應顯示目前 framework / chart / installed template version 與相容狀態，避免 first-touch 使用者只看到「已安裝」卻不知道規則已過期。
- release workflow 在 publish 前必須確認 tag version、package version、chart compatibility matrix 與 validators config 一致。
- chart / template 不得獨立對使用者發布；任何版本變更都必須隨 framework release 或 patch release 進入同一條 release train。

本計畫不另起第二套 lifecycle 政策。Framework SemVer、tier、deprecation cycle 仍以 `docs/ai_atomic_framework/upstream-versioning-policy.md` 為背景政策；本節只補足 onboarding / ATMChart / manifest 層的版本契約。

**權威順序**：三層文件衝突時以以下順序仲裁——L1 上游 `compatibility-matrix.json` + `docs/LIFECYCLE.md`（程式可讀真相）＞L2 `upstream-versioning-policy.md`（書面背景政策）＞L3 本計畫書（onboarding 落地對照）。任何本計畫中關於版本治理的描述若與 L1 / L2 衝突，以 L1 / L2 為準，並連動修正本計畫。

與 `upstream-versioning-policy.md` 的落地對照如下：

| Upstream policy 要求 | 引導工程落地規則 |
|---|---|
| Tier 定義（alpha0 / alpha1 / beta / stable / lts） | Framework version 仍依 upstream tier 判定穩定度；ATMChart 只能宣告自身 `supported / deprecated / unsupported`，不得自行定義新的 release tier。 |
| SemVer major / minor / patch | Framework package、root-drop、onefile 走 SemVer；ATMChart 另用 chart SemVer，但 breaking chart 不必自動升 Framework major，除非 CLI 移除舊 chart 支援或 manifest 無法向後讀取。 |
| Deprecation cycle | beta 之後的 chart / template deprecation 至少跨 2 個 framework minor；alpha 期可 break，但必須在 matrix 標示 unsupported 並輸出 migration hint。 |
| Compatibility matrix | 上游 `compatibility-matrix.json` 必須新增 `atmChartVersions` 與 `agentTemplateVersions`，宣告 `minFrameworkVersion`、status、migrationGuide 與相容範圍。 |
| Breaking Change PR Template | 影響 default guards、ATMChart、InstallManifest、entry template 或 first-touch flow 時，PR 必須補 ATMChart / Onboarding impact checklist。 |
| Schema 演化 | `default-guards.json.schemaVersion` 與 ATMChart frontmatter contract 變更時，必須依 chart patch / minor / major 判斷，並同步更新 matrix。 |
| Release gate | npm / root-drop / onefile release 前，必須驗證 tag、package version、chart matrix、validator config 與 welcome / doctor 版本輸出一致。 |
| 舊版安全 | `doctor` / `welcome` / `verify` 必須先診斷 version lag；升級採 dry-run plan → backup → apply → verify → rollback，且不得靜默覆蓋 user-modified files。 |

## 4. 工作流

### 4.1 First-Touch Flow

```bash
node atm.mjs bootstrap
node atm.mjs atm-chart render
node atm.mjs integration add <adapter-id>
node atm.mjs welcome
node atm.mjs next --json
```

`create-atm` 可包裝上述流程，但每一步仍要產生 deterministic evidence，並可被單獨重跑。

### 4.2 Rule Update Flow

```bash
node atm.mjs atm-chart verify
node atm.mjs integration verify <adapter-id>
node atm.mjs agent-pack verify-fresh --id <pack-id>
```

若 source hash 變更，verify 必須回報 stale，並要求重跑 render / install。這保證 agent 看到的入口摘要不會落後於守衛與 schema。

### 4.3 Version Update Flow

```bash
node atm.mjs atm-chart verify --version-check
node atm.mjs doctor --json
node atm.mjs welcome --dry-run --json
```

若 `default-guards.json`、schema 或 AtomicCharter invariants 的語意變更，必須先判斷是否需要提升 ATMChart version，再重跑 rule render 與 adapter install。若目前 framework version 低於 chart 的 `minFrameworkVersion`，verify / doctor 必須回報 `unsupported-chart-version` 或等價診斷，並阻擋 official onboarding path。

版本更新不能只靠 hash。hash 用來判斷「內容是否改過」，version 用來判斷「改動是否仍相容」。兩者都通過後，entry files 才能被視為 fresh。

每次 version update 也必須同步檢查 `upstream-versioning-policy.md` 的 compatibility matrix 與 deprecation 規則：

1. chart patch：只需重跑 render / verify，不要求 migration guide。
2. chart minor：必須確認舊 template 可忽略新增欄位，並更新 matrix。
3. chart major：必須提供 migration guide 或把舊 chart / template 標示為 unsupported。
4. framework release：必須在 release workflow 驗證 tag、package version、chart matrix 與 validator config 一致。

### 4.4 Safe Upgrade / Rollback Flow

```bash
node atm.mjs doctor --json
node atm.mjs upgrade plan --json
node atm.mjs upgrade apply --from-plan <plan.json>
node atm.mjs upgrade rollback --backup <backup-id>
```

版本落後的使用者專案不得被自動改壞。正式升級流程必須是兩階段：先產生可讀 plan，再由使用者明確 apply。apply 前必須備份 `.atm/memory/atm-chart.md`、`.atm/agent-pack/*.manifest.json`、agent-native entry files 與 compatibility matrix snapshot。若 apply 後 verify 失敗，CLI 必須能 rollback 到上一份 backup。

舊版本狀態的行為規則：

| 狀態 | official onboarding 行為 | 使用者專案保護 |
|---|---|---|
| `supported` | 通過 | 可建議更新，不阻擋既有流程 |
| `deprecated` | 通過但警告 | 顯示 migration hint、最晚支援期限與 dry-run plan |
| `unsupported` | 阻擋 onboarding / release path | 不自動改檔，只允許 read-only doctor 與 explicit upgrade plan |
| `unknown` | release fail；local diagnostic mode | 要求更新 compatibility matrix 或手動指定版本 |

任何 user-modified entry file 或 ATMChart 不得被靜默覆蓋。需要覆蓋時必須建立 backup、輸出 diff，並要求 explicit force。

### 4.5 Command Chain Flow

1. Agent 執行 agent-native command。
2. Command 先跑 `atm next --json`。
3. Agent 讀取 `evidence.nextAction.command` 並執行該 deterministic action。
4. 若存在 `evidence.agent_pack_hint`，agent 只把它作為下一個 slash command 建議。
5. 完成後保存 evidence 與 handoff summary。

### 4.6 Enforcement Flow

官方支援路徑的檢查層次：

- Local：pre-commit / pre-push 跑 `doctor`、integration verify、rule freshness。
- CI：重跑同一組 deterministic checks。
- Release：release workflow 必須在 validation profile 全綠後才能 publish。
- Doctor：報告 entry missing、hash drift、charter missing、evidence missing。

這些檢查不能物理阻止手動刪檔，但必須讓跳過官方入口的結果可被偵測並阻擋。

## 5. TASK-APO 對照總表

| Task ID | 引導工程階段 | 核心語意 | 主要輸出 | 狀態 |
|---|---|---|---|---|
| TASK-APO-0000 | Plan Baseline | 建立引導工程文件真相來源與任務索引 | 計畫書、任務卡、文件入口 | done |
| TASK-APO-0001 | Public Cross-Link | 將引導工程能力連到公開 README / ARCHITECTURE | 公開入口與 architecture 說明 | done |
| TASK-APO-0002 | Manifest Contract | 定義 pack / target file / render manifest / hash contract | SDK facade、manifest schema、render helper | done |
| TASK-APO-0003 | First Adapter Pack | 建立第一個可安裝、可卸載、可驗證的 agent entry bundle | entry templates、install / uninstall e2e | done |
| TASK-APO-0004 | Rule Render Pipeline | 從 SSoT 渲染 ATMChart 並檢查 freshness | `atm-chart render / verify` | done |
| TASK-APO-0005 | Justification Gate | 違反守衛時要求 evidence justification | rule guard check、`verify --guards` | done |
| TASK-APO-0006 | Multi-Agent Expansion | 擴張多 adapter entry output | cursor / copilot / gemini / windsurf adapters | done |
| TASK-APO-0007 | Distribution Entry | 建立 npm / create-atm 入口與 release recipe | create-atm、package metadata、release workflow | done |
| TASK-APO-0008 | Welcome Lifecycle | 建立 first-touch welcome 與 lineage | `atm welcome`、welcome lineage | done |
| TASK-APO-0009 | Command Hint Chain | 讓 `atm next --json` 提供 agent-pack 可讀 hint | `agent_pack_hint`、prompt schema 擴充 | done |
| TASK-APO-0010 | Matrix Generator | 由 adapter registry 反向產生 multi-agent matrix | matrix renderer、drift check | done |
| TASK-APO-0011 | Version Contract | 定義 Framework / ATMChart / Template 三層版本契約 | 計畫書、upstream versioning policy 對照、任務索引 | done |
| TASK-APO-0012 | Version Compatibility Gate | 讓 CLI / validator 偵測 version drift 與 breaking change | version compatibility validator、doctor / welcome version output | done |
| TASK-APO-0013 | Migration Tooling Contract | codemod 守則、多階段遷移鏈、fixture 庫、migration guide 模板 | `atm migrate` 契約、fixture 集、migration guide template | open |
| TASK-APO-0014 | Release Trust Chain | npm provenance、SBOM、`integrity.json`、CLI 啟動驗 matrix sha256 | release workflow signing step、CLI startup verification | open |
| TASK-APO-0015 | Release Incident Response | known-bad release 回收與黑名單 | `known-bad-versions.json`、yank SOP、CLI deny gate | open |
| TASK-APO-0016 | Version Skew Matrix CI | CLI × Plugin SDK × Adapter 組合驗證 | skew matrix workflow、fixture combinations | open |
| TASK-APO-0017 | Long-tail User Safeguards | append-only matrix、時間窗 unsupported、offline first-touch、downgrade detection | matrix.legacy.json、downgrade detect validator | open |
| TASK-APO-0018 | Security Policy | SECURITY.md、advisory branch、dependency scanning gate | `SECURITY.md`、Dependabot config、advisory workflow | open |
| TASK-APO-0019 | Dist-tag 政策 | `latest` / `next` / `beta` / `lts` 對應于 tier、`create-atm` 預設 tag | dist-tag policy table、create-atm tag selection | open |
| TASK-APO-0020 | Telemetry + Sentinel + Dashboard | opt-in telemetry、adopter sentinel CI、deprecation dashboard | `atm telemetry` opt-in flow、adopter sentinel workflow、`DEPRECATIONS.md` | open |
| TASK-APO-0021 | Meta-schema Versioning | invariants / InstallManifest / ATMChart frontmatter 各 schemaVersion | schemaVersion 字段、向後讀舊 manifest 證明 | done |
| TASK-APO-0022 | Bridge Minor + Experimental API | major bump 前同時讀寫新舊 schema、`@experimental` 通道 | bridge minor SOP、experimental opt-in flag | done |
| TASK-APO-0023 | Policy Self-Versioning + Auto Matrix PR | 政策文件加 `policy_version`、release workflow 自動產 matrix PR | policy frontmatter、auto-PR workflow | open |
| TASK-APO-0024 | Time+minor Deprecation + Canary Rollout | alpha≥30d / beta≥90d / stable≥180d / lts≥365d、`upgrade apply --canary` | deprecation policy update、canary apply flag | open |

## 6. 里程碑

### M0：文件與任務索引收斂

對應：TASK-APO-0000、TASK-APO-0001

- [x] 單一引導工程主計畫存在。
- [x] 任務卡可由主計畫對照到每個里程碑。
- [x] 公開文件只描述 ATM 通用能力。
- [x] 文件中立性掃描排除採用者與外部專案語意。

### M1：Adapter / Manifest 基礎

對應：TASK-APO-0002、TASK-APO-0003

- [x] 定義 target file、render context、manifest 與 hash contract。
- [x] 安裝流程會寫入 manifest。
- [x] 卸載流程能區分 unchanged 與 user-modified。
- [x] 至少一個 agent entry bundle 可跑 install / diff / verify / uninstall。

### M2：Rule Render 與 Freshness Gate

對應：TASK-APO-0004、TASK-APO-0005

- [x] `atm-chart render` 產出帶 source hash 的摘要。
- [x] `atm-chart verify` 可偵測 stale。
- [x] integration / pack freshness 可偵測 SSoT 漂移。
- [x] 守衛違反時缺 justification 會被 `verify` 擋下。

### M3：多 Agent Entry 擴張

對應：TASK-APO-0006、TASK-APO-0010

- [x] 多 adapter 使用同一組 template source。
- [x] 不同格式輸出仍共享同一 ATM first command。
- [x] compatibility matrix 由 source registry 產生，不靠手抄。
- [x] matrix drift 可在 CI 中被偵測。

### M4：First-Touch 與 Distribution

對應：TASK-APO-0007、TASK-APO-0008

- [x] `create-atm` 可在空 repo 啟動 bootstrap / render / adapter install。
- [x] npm publish recipe 保留 validation gate。
- [x] `atm welcome` 顯示 ATMChart、integration health 與 next action。
- [x] dry-run 不寫入 lineage；正式模式寫入 welcome lineage。

### M5：Command Hint Chain

對應：TASK-APO-0009

- [x] `atm next --json` evidence 含 `agent_pack_hint`。
- [x] hint 欄位能指向下一個建議 slash command id。
- [x] agent prompt schema 接受 `agent_pack_hint` 與 `handoff_chain[]`。
- [x] agent-pack template 讀取 hint，但不把 hint 當作新的流程權威。

### M6：Version Contract

對應：TASK-APO-0011

- [x] ATM Framework Version、ATMChart Version、Agent Pack / Integration Template Version 的責任邊界已文件化。
- [x] `default-guards.json.schemaVersion` 可映射到可比較的 chart version 與 `minFrameworkVersion`。
- [x] InstallManifest 契約要求記錄 install-time framework / chart / template version。
- [x] 本計畫與 `upstream-versioning-policy.md` 的關係明確，沒有第二套 lifecycle 真相。

### M7：Version Compatibility Gate

對應：TASK-APO-0012

- [ ] `atm-chart verify --version-check` 可檢查 framework / chart 相容狀態。
- [ ] `doctor` 與 `welcome` 輸出 framework / chart / template version 摘要。
- [ ] standard validator 可偵測 unsupported chart、missing migration guide、package tag version drift。
- [ ] breaking schema / guard semantics 變更必須附 migration guide 或明確標成 unsupported。
- [ ] upgrade plan / backup / rollback fixture 證明舊版本使用者不會被自動破壞。
- [ ] supported / deprecated / unsupported / unknown 四種 version lag 狀態都有 deterministic test。

## 7. 驗證矩陣

| 驗證面 | 建議命令 | 必須證明 |
|---|---|---|
| CLI acceptance | `npm run validate:cli` | onboarding / integration / welcome / next output 可讀 |
| Prompt schema | `npm run validate:agent-prompt` | prompt schema 支援 hint 擴充且不破壞既有輸出 |
| Standard gate | `npm run validate:standard` | 全部 deterministic validators pass |
| Rule freshness | `node atm.mjs atm-chart verify` | SSoT hash 與摘要一致 |
| Adapter freshness | `node atm.mjs integration verify <adapter-id>` | entry file 存在且未漂移 |
| Pack freshness | `node atm.mjs agent-pack verify-fresh --id <pack-id>` | manifest source hash 未 stale |
| Version compatibility | `node atm.mjs atm-chart verify --version-check` | framework version、chart version、template version 仍在支援範圍 |
| Breaking change scan | `npm run validate:breaking-changes` | schema / guard 語意 breaking 時已提供 migration guide 或 unsupported 診斷 |
| Release tag sync | `npm run validate:release-versioning` | git tag、package versions、release artifact 與 chart compatibility matrix 一致 |
| Neutrality | `atm verify --neutrality` 或等效 scanner | 文件、模板、schema 無 adopter-specific 語意 |
| Encoding | `npm run check:encoding:touched -- --files <files>` | UTF-8 無 BOM、無 replacement char、無 mojibake |

## 8. 風險與控制

### 8.1 模板變成靜態流程框架

控制：模板只能呼叫 ATM CLI；流程判斷由 `atm next --json` 與 gate 負責。任何把完整 phase 寫入 template 的變更都應被 review 拒絕。

### 8.2 規則摘要漂移

控制：ATMChart、entry files、manifest 都帶 source hash；CI 跑 freshness verify。Hash 不一致時，必須重跑 render / install。

### 8.3 多 adapter 維護成本升高

控制：單一 template source、多 adapter compiler。新增 adapter 只改 compiler mapping，不複製完整模板內容。

### 8.4 一鍵入口稀釋治理嚴肅性

控制：`create-atm` 是 wrapper，不是捷徑；welcome 必須展示規則摘要與下一步 deterministic action。

### 8.5 採用者語意污染框架文件

控制：框架計畫文件套用中立性掃描；採用者案例只能放在 adopter / case-study 文件，不能反向定義 core 或 onboarding contract。

### 8.6 跳過官方入口

控制：ATM 不承諾阻止手動刪檔；承諾官方路徑不可跳過，且跳過後能由 local / CI / release gate 偵測並阻擋。

### 8.7 Framework / Chart 版本漂移

風險：framework package 已升版，但使用者專案仍保留舊 ATMChart、舊 entry template 或舊 InstallManifest，導致 agent 看到過期規則但 CLI 仍可執行。

控制：InstallManifest 記錄 install-time framework / chart / template version；`atm-chart verify --version-check`、`doctor`、`welcome` 與 standard validator 同時檢查 hash freshness 與 version compatibility。unsupported chart 必須阻擋 official onboarding path，deprecated chart 必須輸出 migration hint。任何版本落後處理都必須走 safe upgrade / rollback flow，不得在偵測到落後時自動覆蓋使用者檔案。

## 9. 完成定義

本計畫完成時，ATM 必須能回答下列問題：

1. 空 repo 需要幾個 deterministic steps 能開始 official onboarding？目標：bootstrap / render / adapter install / welcome / next 可被 wrapper 串起，也可單獨重跑。
2. 守衛或 schema 改動後，agent 看到的摘要是否會 stale？目標：會被 freshness verify 擋住。
3. 使用者改過 entry file 時，uninstall 是否會誤刪？目標：不誤刪，會標記 user-modified。
4. 沒有 agent pack 時，裸 CLI 是否仍能完成治理流程？目標：必須。
5. 多 agent 是否共享同一組規則 SSoT？目標：格式不同、來源相同。
6. 違反守衛且缺 evidence justification 時是否會被 block？目標：必須。
7. 文件是否保持 framework-neutral？目標：計畫文件與模板不得出現 adopter-specific 或 external-project-specific 語意。
8. Framework、ATMChart 與 entry template 版本是否可診斷？目標：welcome / doctor / verify 都能回答目前版本是否 supported、deprecated 或 unsupported。

## 10. 維護規則

- 新增 TASK-APO 任務卡時，必須在本計畫 §5 與 §6 補上對照。
- 任務卡 `related_plan` 必須指向本計畫。
- 若引導工程新增 public-facing 文件，必須先跑 neutrality scanner。
- 若新增 `.md` 文件，必須用 doc-id registry 工具分配 doc_id。
- 若刪除舊計畫文件，必須同步更新 task card、registry shard 與人類可讀索引，避免 dangling doc_id。
- 若新增或修改版本治理規則，必須同步檢查 `upstream-versioning-policy.md`，避免本計畫與 framework lifecycle 形成雙重真相。
- 本計畫不得再拆成多份互相競爭的主計畫；後續只允許新增 shard、appendix 或 task card。