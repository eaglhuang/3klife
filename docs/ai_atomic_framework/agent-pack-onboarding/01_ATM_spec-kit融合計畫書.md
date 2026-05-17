<!-- doc_id: doc_other_0146 -->
# ATM × spec-kit 融合計畫（最終版）

目標：把 spec-kit 的「配送與引導工程」優點接到 ATM Agent Operating Layer，建立可被任何 AI Agent 自動接住的入口，並讓 ATM 框架規則具有不可繞過的最高優先級。

## 2026-05-17 裁決：雙主線、單權威

- `ATM × spec-kit 融合計畫` 保留為第一主線：負責把 spec-kit 可取的配送、入口、模板與跨 agent 啟動經驗轉譯成 ATM 自有契約，不引入 spec-kit runtime 或第二套 task flow。
- `ATM Agent Pack / Onboarding 計畫書` 升格為第二主線：負責 first-touch、welcome、rule render freshness、create-atm、CI / hook enforcement、onboarding e2e 與 adoption metrics。
- 兩條主線共享 AtomicCharter、`atm next --json`、InstallManifest / sha256、evidence gate、doctor / CI gate；不共享 spec-kit 私有流程，也不綁 3KLife 或任何 host project。
- 「不可繞過」定義為官方支援路徑不能跳過，且跳過後可被 deterministic checks 在 pre-commit / CI / release / branch protection 擋下；不是承諾能物理阻止任意本機手改。

## 命名決議
- 採用「**AtomicCharter.md**」作為框架級最高指導文件（user 提的 FirstKeep.md 同義，最終名建議用 AtomicCharter，因為 ATM README 既有「Product Charter」語言）
- 別名：可同時提供 `FirstKeep.md` symlink/alias 給偏好此語意者
- 衝突仲裁：AtomicCharter > host keep > project-specific rules
- 來源：由 ATM 內建 `templates/root-drop/.atm/charter/atomic-charter.template.md` 注入

## .atm/ 目錄收斂評估（補充）

優點（採納）：
- 專案乾淨、框架獨立、卸載可逆、整合多 agent
- Windows 第一公民（sh + ps 雙腳本）

潛在缺點與緩解：
1. Windows MAX_PATH：避免 `.atm/runtime/budget/...` 超過 260 字元 → 規範深度 ≤ 4 層、用短 segment 名
2. Dot-folder 隱藏：VS Code/Explorer 預設可能隱藏 → 在 README/AGENTS 明寫位置；ATM CLI doctor 報告時優先顯示
3. Git tracking 邊界：`.atm/runtime/`（state）vs `.atm/charter/`、`.atm/profile/`（committed config）必須在 init 時自動寫好 `.atm/.gitignore`
4. sh/ps 雙腳本漂移：必須引入 `validate-script-parity` 確保兩邊行為一致；單一來源 TypeScript，雙腳本都是 thin wrapper
5. 與其他工具 .atm 衝突：低風險，但要在 README/ARCHITECTURE 明寫保留命名
6. 多 ATM 巢狀：host 中嵌套子專案各自 init `.atm/` → 用 `.atm/config.json` 的 `parentAtm` 欄位指定父子關係，doctor 提示衝突
7. CI cache：`.atm/runtime/` 變動頻繁，建議 `.gitignore` 內 opt-in 規則
8. Symlink/junction：Windows symlink 預設需權限 → 雙腳本同捆採實檔複製，不用 symlink

## 整體架構新增（疊在 Agent Operating Layer，不下沉 Core）

```
.atm/
├── charter/
│   ├── atomic-charter.md              ← 框架級最高指導（不可繞過）
│   └── charter-invariants.json        ← 機器可讀 invariants 清單（供 guard 檢查）
├── profile/
│   ├── default.md                     ← 既有
│   └── host-rules.md                  ← 可選：host 自訂規則摘要（agent-supplied，非必須）
├── context/
│   └── INITIAL_SUMMARY.md             ← 既有
├── runtime/
│   ├── default-guards.json            ← 既有
│   ├── budget/
│   ├── tasks/
│   ├── locks/
│   └── evidence/
├── integrations/
│   ├── manifest.json                  ← 注入檔案 hash 清單
│   ├── claude-code/                   ← .claude/skills/ mirror
│   ├── copilot/                       ← .github/ mirror
│   ├── cursor/                        ← .cursor/rules/skills/ mirror
│   ├── gemini/                        ← .gemini/commands/ mirror
│   └── codex/                         ← 既有
├── scripts/
│   ├── sh/                            ← bash wrapper
│   └── ps/                            ← powershell wrapper
├── config.json                        ← 既有
├── init-options.json                  ← 新增
└── .gitignore                         ← 新增（區隔 runtime vs committed）
```

## Charter 兩層強制機制

1. **軟性注入**：每個 ATM agent skill / command template 在 prompt 開頭 inline `{{CHARTER_INVARIANTS}}` 區塊
2. **硬性閘門**：
   - `atm doctor` 新增 `charter-integrity` check：charter file 必須存在、hash 與 charter-invariants.json 對齊
   - `atm upgrade --propose` 在 promote 前比對 invariants；違反者必須 `charterWaiver` 標記 + human review
   - `atm guard charter --files <...>` 檢查改動是否違反 invariants（例如 invariant 寫「不可建立第二套 registry」→ 偵測 schemas/upgrade 之外的 promote 路徑）
3. **不可繞過性**：host keep 更新時若與 charter invariants 衝突，doctor 報 `ATM_CHARTER_HOST_CONFLICT`，要求 host 走 `behavior.evolve` 提 charter waiver proposal，而非直接覆蓋

## Integration Adapter 規範

新 package：`packages/integrations-core/`（純規範與 manifest）+ 各 `packages/integration-<agent>/`

`IntegrationAdapter` 介面（核心欄位）：
- `id`: claude-code | copilot | cursor | gemini | windsurf | goose | codex
- `targetDir()`: 注入目標
- `fileFormat`: skill | agent-md | prompt-md | instructions-md | toml | yaml
- `placeholderStyle`: $ARGUMENTS | {{vars}} | toml-fields
- `install(ctx)`: 寫檔 + 回傳 InstallManifest（含 sha256）
- `uninstall(manifest)`: 用 hash 比對清除，使用者編輯過的不刪
- `verify(manifest)`: doctor 用，偵測 drift

每個 adapter 必須產生的 ATM 入口 skill（最少集）：
- `atm-next` / `atm-orient` / `atm-create` / `atm-lock` / `atm-evidence` / `atm-upgrade-scan` / `atm-handoff`

## Slash Skill 模板（在 templates/skills/）

每個 skill template frontmatter：
```yaml
---
name: atm-<command>
description: <觸發情境>
charter-invariants-injected: true
handoffs:
  - label: <下一步>
    command: node atm.mjs <next>
---
```

模板內含三層 placeholder：
- `$ARGUMENTS` → 使用者輸入
- 預執行注入：`$TASK_ID / $SCOPE_FILES / $EVIDENCE_WATERMARK / $CHARTER_HASH`
- `{{CHARTER_INVARIANTS}}` → 從 charter-invariants.json render

## 里程碑與 Checklist

### M0 - 規劃定稿 ✅ DONE
目的：發布本融合計畫並更新文件

交付物：
- `docs/AGENT_OPERATING_LAYER_ENHANCEMENT.md`（新）✅
- 更新 `docs/ARCHITECTURE.md` 加入 Integration Adapter Layer 短說明 ✅
- 更新 `docs/HOST_GOVERNANCE_INTEGRATION.md` 加入 charter 不可繞過性說明 ✅

Checklist：
- [x] 文件只使用 ATM 術語，不出現 spec-kit / Constitution 字樣
- [x] 明確說明 charter > host keep 的優先級
- [x] 通過 `validate:standard` (33/33)

### M1 - AtomicCharter 契約落地 ✅ DONE
目的：建立框架級最高指導文件與機器可讀 invariants

交付物：
- `schemas/charter/charter-invariants.schema.json` ✅
- `templates/root-drop/.atm/charter/atomic-charter.template.md` ✅
- `templates/root-drop/.atm/charter/charter-invariants.template.json` ✅
- `fixtures/charter/default-charter.json` ✅
- `fixtures/charter/charter-conflict.json` ✅
- `scripts/validate-charter.ts` + `npm run validate:charter` ✅

Charter Invariants 種子內容（必含）：
- INV-ATM-001: 不可建立第二套 registry ✅
- INV-ATM-002: 不可繞過 lock-before-edit ✅
- INV-ATM-003: 不可直接 promote 未通過 schema validation 的 UpgradeProposal ✅
- INV-ATM-004: 不可在 charter 外新增與 charter 衝突的最高規則 ✅
- INV-ATM-005: host keep 變更不可覆寫 charter invariants，必須走 `behavior.evolve` waiver flow ✅

Checklist：
- [x] Charter schema 通過 `validate:schemas`（schemaEntries 已加入）
- [x] Template 用 placeholder（[PROJECT_NAME] / [CHARTER_VERSION] / [LAST_AMENDED_DATE]）
- [x] Fixtures 覆蓋預設與衝突兩種情境
- [x] `validate:charter` 加入 standard suite（validate:standard 33/33 通過）

### M2 - Charter 整合到 init / bootstrap / doctor ✅ DONE (commit 46a9652)
目的：讓 charter 在 `atm init` 自動落地，doctor 報 charter 健康

交付物：
- 修改 `packages/cli/src/commands/init.ts`：charterPath/charterInvariantsPath 加入 evidence ✅
- 修改 `packages/plugin-governance-local/src/index.ts`：adoptLocalGovernanceBundle 自動建 charter 模板、charterPath 加入結果 ✅
- 修改 `packages/cli/src/commands/doctor.ts`：新增 `charter-integrity` check（.atm/charter/ 不存在=OK，存在但檔案缺失/壞=FAIL）✅
- 修改 `scripts/validate-charter.ts`：template token 格式更新 ✅
- 修改 `docs/governance/docs-neutrality-policy.json`：docs/tasks/ 加入 excludePrefixes ✅
- 新增 `readProjectName` helper ✅

Checklist：
- [x] `atm init --adopt default` 後 `.atm/charter/` 完整存在
- [x] Charter 缺失時 `atm doctor` 報 `ATM_DOCTOR_CHARTER_MISSING`
- [x] validate:standard 33/33 通過

### M3 - Charter Promotion Gate ✅ DONE (commit 47c9f83)
目的：讓 charter invariants 介入 UpgradeProposal 流程

交付物：
- 修改 `schemas/upgrade/upgrade-proposal.schema.json`：新增 optional `charterGate` gate + `charterWaiver` 欄位 + `charterInvariantViolation` blockedGateName ✅
- 修改 `packages/plugin-review-advisory/src/promotion-gates.ts`：新增 Gate 6 `charterInvariantViolation` ✅
- `fixtures/upgrade/charter-waiver-proposal.json` ✅
- `fixtures/upgrade/charter-violation-blocked-proposal.json` ✅
- 修改 `scripts/validate-upgrade-proposal.ts`：新增 M3 charter fixture 驗證 ✅
- 修改 `tests/schema-fixtures/manifest.json`：新增兩個 charter proposal fixtures ✅

Checklist：
- [x] 違反 invariant 且無 waiver 的 proposal 必被 blocked
- [x] charterWaiver 覆寫閘門後 proposal 為 pending
- [x] validate:standard 33/33 通過

### M4 - IntegrationAdapter 介面與 Manifest ✅ DONE (commit a7e7fff)
目的：規範化 agent 整合層

交付物：
- 新 package `packages/integrations-core/`：`IntegrationAdapter` 介面、`InstallManifest` 型別、hash util ✅
- `schemas/integrations/install-manifest.schema.json` ✅
- 把現有 `integrations/codex-skills/` 接成符合介面的 Codex reference adapter factory ✅
- `scripts/validate-integration-adapter.ts` + `npm run validate:integration-adapter` ✅
- 更新 `docs/AGENT_OPERATING_LAYER_ENHANCEMENT.md`、`docs/ARCHITECTURE.md`、`CHANGELOG.md` 回寫 M4 狀態 ✅

Checklist：
- [x] Adapter 介面有 `install` / `uninstall` / `verify`
- [x] Manifest 含每個注入檔的 sha256
- [x] Codex adapter 為第一個 reference impl
- [x] `validate:integration-adapter` 加入 standard suite（validate:standard 34/34 通過）

### M5 - 四大 Agent Adapter ✅ DONE (commit 56fc1be)
目的：覆蓋市佔最大的四個 agent

交付物（各為獨立 package）：
- `packages/integration-claude-code/`：注入 `.claude/skills/atm-*/SKILL.md` ✅
- `packages/integration-copilot/`：注入 `.github/copilot-instructions.md`、`.github/instructions/atm-*.instructions.md`、`.github/prompts/atm-*.prompt.md` ✅
- `packages/integration-cursor/`：注入 `.cursor/rules/skills/atm-*/` ✅
- `packages/integration-gemini/`：注入 `.gemini/commands/atm-*.toml` ✅
- 擴充 `packages/integrations-core/`：minimum ATM entrypoint 定義與 `createStaticIntegrationAdapter` ✅
- 擴充 `scripts/validate-integration-adapter.ts`：Codex + 4 adapter install/verify/drift/uninstall 驗證 ✅

每個 adapter 必須注入的最少 skill：
- atm-next、atm-orient、atm-create、atm-lock、atm-evidence、atm-upgrade-scan、atm-handoff ✅

Checklist：
- [x] 四個 adapter 都通過 `validate:integration-adapter`
- [x] 每個 adapter 都包含 charter invariants 區塊
- [x] 注入後 agent 第一句指令必為 `node atm.mjs next --json`
- [x] 卸載測試：先 install 再 uninstall，無殘留檔；使用者編輯過的檔保留
- [x] validate:standard 34/34 通過

### M6 - atm integration 子指令（保留在本主線）✅ DONE (commit e96ee53)
目的：把已完成的 IntegrationAdapter install / list / verify / uninstall 暴露為 CLI，讓第二主線 Onboarding 可以消費。

交付物：
- 新 command：`atm integration list` / `add <id>` / `verify <id>` / `remove <id>` ✅
- 修改 `atm init` 加入 `--integration <id>` 旗標 ✅
- per-adapter manifest：`.atm/integrations/<id>.manifest.json` ✅
- `doctor` 可讀取 per-adapter manifest 並透過 `integration-adapters` check 回報 missing / drift / stale ✅
- 互動模式：`atm init` 時偵測 agent 並提示選擇 → 移至第二主線 Onboarding first-touch flow

Checklist：
- [x] `atm integration list --json` 列出可用與已安裝
- [x] `atm integration add <id>` 寫入 manifest，產出 InstallReport evidence
- [x] `atm integration verify <id>` 偵測 drift（hash mismatch / 檔案被刪）
- [x] `atm integration remove <id>` 用 manifest 乾淨卸載
- [x] `atm init --integration <id>` 能一鍵 init + adapter install
- [x] `atm doctor` 偵測 integration drift / stale manifest
- [x] `validate:cli` 涵蓋新 commands
- [x] `validate:standard` 36/36 通過

### M7 - Entry Template Compiler 與 Charter 注入（保留在本主線）✅ DONE (commit 906c65f)
目的：把 ATM 核心入口命令包成 framework-neutral skill source，再由 adapter 編譯成各 agent 格式。

交付物：
- `templates/skills/atm-next.skill.md` 等 7 個 source template ✅
- `templates/skills/skill.schema.json`：定義 frontmatter（含 `handoffs`、`charter-invariants-injected`）✅
- `packages/integrations-core/src/index.ts`：匯出 skill template parser / compiler，將 source template 編譯成 Claude SKILL.md / Copilot prompt.md / Gemini toml / Cursor skill ✅
- `scripts/validate-skill-templates.ts` ✅

Checklist：
- [x] 每個 skill template 都聲明 `charter-invariants-injected: true`
- [x] handoffs 連結回 ATM CLI，不形成平行狀態機
- [x] Compiler 能輸出 Claude SKILL.md / Copilot prompt.md / Gemini toml / Cursor skill
- [x] spec-kit 或 MRP hint 只能作為 `atm next --json` output，不 baked-in template
- [x] `validate:skill-templates` 加入 standard suite

### M8 - sh / ps 雙腳本同捆與 parity（保留在本主線）✅ DONE (commit 906c65f)
目的：Windows 第一公民，讓 ATM 開源框架在 Windows / Linux / macOS 入口一致。

交付物：
- `templates/root-drop/.atm/scripts/sh/atm-*.sh` ✅
- `templates/root-drop/.atm/scripts/ps/atm-*.ps1` ✅
- `scripts/validate-script-parity.ts`：確保兩邊 wrap 同一個 node 入口 ✅
- `atm init` 時依平台選擇預設安裝哪一套（兩套都寫入，只是 PATH hint 不同）✅

Checklist：
- [x] 雙腳本均為 thin wrapper，無業務邏輯漂移
- [x] Windows wrapper smoke + POSIX wrapper parity / available-sh smoke + root-drop hello-world 通過
- [x] `validate:script-parity` 加入 standard suite
- [x] `validate:standard` 38/38 通過

### M9 - Framework-neutral Example 與 Multi-agent 驗證（拆分後保留）
目的：證明 IntegrationAdapter + Entry Template Compiler 可被多 agent 接住；first-touch welcome / create-atm e2e 交給第二主線。

交付物：
- `examples/agent-onboarding-flow/`：保留為 framework-neutral adapter example，不含 host-specific 規則
- 更新 `docs/multi-agent-compatibility-matrix.md` 加入 charter 接入狀態欄位
- 更新 `docs/multi-agent-results.md` 加入 adapter install + first command 驗證結果

Checklist：
- [ ] Demo 可在五分鐘跑完 adapter install + verify
- [ ] 至少覆蓋三個 agent 的 install + first command
- [ ] Charter 衝突案例可被偵測
- [ ] `validate:examples`、`validate:multi-agent-confidence` 通過

### M10 - Framework Rollout 指標（拆分後保留）
目的：量測 framework 層的 integration / charter / drift 品質；first-touch adoption metrics 移到第二主線 APO-M8。

交付物：
- 擴充 `schemas/governance/rollout-metrics-report.schema.json` 加入 framework-level integration metrics
- `fixtures/rollout-metrics/integration-adapter-sample.json`
- Metrics：charter-violation rate、integration-drift rate、adapter-install-success rate

Checklist：
- [ ] Charter 衝突發生頻率可量測
- [ ] Integration drift 比例可量測
- [ ] Adapter 安裝成功率可量測
- [ ] `validate:rollout-metrics` 通過

## 不採納清單（明確列出避免架構漂移）

- 不引入 spec-kit 的 `presets` / `extensions.yml` 生態（ATM 已有 Plugin SDK + Default Governance Bundle）
- 不引入 `/specify → /plan → /tasks` 線性瀑布工作流（ATM 是 atom DAG）
- 不採用「Markdown 即介面」作為核心哲學（ATM 權威來源是 schema + registry + evidence）
- 不把 charter 改名為 Constitution
- 不讓 host keep 凌駕 charter
- 不在 `packages/core/` 引入 agent-specific 邏輯（所有 adapter 走 Agent Operating Layer）

## 風險與緩解

| Risk | Mitigation |
|---|---|
| Charter 與 host keep 用語衝突 | doctor `ATM_CHARTER_HOST_CONFLICT` 報告 + waiver flow |
| Adapter 注入覆寫使用者編輯 | Manifest hash 比對，drift 時不覆蓋 |
| sh/ps 漂移 | `validate-script-parity` + 共用 node 入口 |
| 多 agent 同時安裝衝突 | manifest 紀錄各 adapter target dir，doctor 偵測重疊 |
| Charter version 更新破壞 host | charter 採 SemVer，breaking change 必須 waiver |
| Windows MAX_PATH | `.atm/` 內部深度 ≤ 4 層、短 segment |

## 完成定義

ATM 應能證明：
- 任何新 agent 透過 `atm init --integration <id>` 一鍵安裝
- 安裝後第一條 agent 指令必為 `node atm.mjs next --json`
- Charter 是不可繞過的最高指導，違反必須 waiver
- Host keep 為次級規則，與 charter 衝突時必須走治理 waiver flow
- Integration adapter 可乾淨卸載，不影響使用者編輯內容
- Windows / Linux / macOS 三平台 onboarding 一致
- 整體流程不引入第二套 registry / task model / approval workflow
