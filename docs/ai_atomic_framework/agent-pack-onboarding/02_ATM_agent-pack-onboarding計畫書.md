<!-- doc_id: doc_other_0145 -->
# ATM Agent Pack / Onboarding 計畫書

## 0. 核心結論

本計畫是 `拆解大型功能優化原子map計畫書 (doc_other_0133)`（以下簡稱 MRP）§17.6 明確指明的另案，主題是「ATM 無痛入門 / Agent Operating Layer 強化」。MRP 處理治理語義（map 接管 legacy / new feature），本計畫處理入口體驗（agent 進到使用者專案後自動遵守 ATM 規則），兩者並行不阻塞、互不取代。

MRP 已把 ATM 升級為「大型功能正式替代表面」，但 agent 進到使用者專案時，並沒有被自動告知「該用哪個 CLI、該讀哪份規則、現在處於哪一段 rollout」。本計畫的核心是補齊這個入口層：透過 Agent Pack SDK、Rule Render Pipeline、`npx create-atm`、`atm welcome` 等機制，讓 agent 在不依賴口頭交代與手抄文件的前提下，自動進入 ATM 的治理循環。

本計畫不是外部靜態 prompt 框架翻版，也不是替代 ATM 既有的 `atm next --json` 動態路由。它在 ATM 既有 Agent Operating Layer 之上添加「入口注入 + 規則渲染 + 一鍵串接」三個薄層，所有產出仍以 `default-guards.json` / JSON Schema / atomic-spec 為唯一真相來源（Single Source of Truth, SSoT）。

### 0.1 2026-05-17 裁決：本計畫升格為第二主計畫

經與目前正在實作的 `ATM × spec-kit 融合計畫` 對齊後，本計畫不應被併成該融合計畫底下的一個普通 milestone，而應升格為第二份主計畫獨立推進。理由是 `ATM × spec-kit` 是「把 spec-kit 的配送與引導工程優點轉譯到 ATM」的消費者計畫；本計畫則是「任何使用者專案、任何 agent 進入 ATM 時都必須先接住的入口層」。後者是 ATM 開源框架的通用能力，不可綁定 spec-kit，也不可綁定 3KLife 或任何單一 host project。

裁決後的關係如下：

1. `ATM × spec-kit 融合計畫` 保留為第一主線：處理 AtomicCharter、Integration Adapter Layer、skill template compiler、script parity、spec-kit 概念轉譯與 framework-neutral governance。
2. `ATM Agent Pack / Onboarding 計畫書` 升格為第二主線：處理使用者專案 first-touch、agent-native entry files、welcome、rule render、freshness verify、CI / hook enforcement recipe。
3. 兩者不可互相取代：spec-kit 融合計畫不能把 onboarding 寫成 spec-kit-only；Onboarding 計畫也不能把 spec-kit 的流程 baked-in prompt。
4. 交會點只允許發生在 `atm next --json`、AtomicCharter invariants、InstallManifest / sha256、evidence gate、CI / doctor 這些 ATM 自有契約上。

「無法繞過 / 無法跳過」在開源框架中的正式定義也需校準：ATM 不能物理阻止一個擁有檔案系統權限的人惡意手改檔案，但 ATM 必須讓官方支援的 agent 路徑無法跳過入口，且任何跳過入口的結果都能被 `doctor`、pre-commit、CI、release gate 或 branch protection 偵測並阻擋。

## 1. ATM 目前已具備的基礎

目前 ATM repo 已具備下列 Agent Operating Layer 骨架：

1. `atm.mjs bootstrap` 一鍵建置 `.atm/` 治理樹（內部呼叫 `init --adopt default`），是 ATM 自有的一鍵初始化入口。
2. `atm.mjs next --json` 為「動態路由器」，回傳結構化 JSON 告訴 agent 下一步該執行哪個 deterministic action。
3. `.atm/runtime/default-guards.json` 已是 machine-readable 守衛 SSoT（四大守衛：preserve-host-workflow、lock-before-edit、evidence-after-change、protect-context-budget）。
4. `templates/root-drop/AGENTS.md` 已提供 agent 入門指令樣板（但需手動寫入新專案）。
5. `examples/claude-code-slash-commands/.claude/commands/atm-*.md` 已提供 Claude Code slash command 範例（但需手抄）。
6. `docs/multi-agent-compatibility-matrix.md` 已涵蓋 Claude Code / Cursor / Aider / Copilot / OpenAI Assistants（但目前是人類可讀文件，不是 plugin）。
7. 三層發佈已支援離線：`release/atm-root-drop/`（多檔便攜）、`release/atm-onefile/atm.mjs`（零依賴單檔）、源碼路由。
8. `packages/plugin-sdk/` 已有可替換治理能力 plugin 介面，可作為 Agent Pack SDK 的參考風格。

因此本計畫的方向是把「相容性矩陣 + 範例 slash command + 手寫 AGENTS.md」這三條既有路徑，正式升級為**可程式化、可乾淨卸載、可同步規則的 Agent Pack**，並補上一鍵入門入口。屬於演進，不是重寫。

## 2. 設計原則

### 2.1 入口模板只能引導，不可寫死流程

任何 agent-pack 注入的 slash command 模板、prompt、SKILL.md，只能要求 agent 呼叫 `node atm.mjs next --json` 或既有 deterministic CLI，**不可** 把完整流程（例如 MRP 的 `draft→shadow→canary→active→legacy-retired`）寫死在模板裡。模板的角色是 wayfinding，權威永遠在 `atm next` 與 registry / evidence / upgrade gate。

### 2.2 Single Source of Truth 不可漂移

`default-guards.json`、`atomic-map.schema.json`、`map-equivalence-report.schema.json` 等 machine-readable 契約是規則的唯一真相。`constitution.md`、`.claude/commands/atm-*.md`、`.cursor/rules/atm-*.md` 等都是「**渲染產物**」，必須由 CLI 從 SSoT 重新渲染，並透過 sha256 manifest 追蹤漂移。

### 2.3 Agent Pack 是產品語言，Integration Adapter 是實作語言

ATM 既有的 `packages/adapter-local-git/` 是 I/O / host integration 抽象；目前 AI-Atomic repo 已採納的 agent 入口實作語言則是 `packages/integrations-core/` + `packages/integration-<agent>/`。因此本計畫中的「Agent Pack / Onboarding」應定義為使用者可理解的產品層與流程層名稱，不再要求另建一套平行的 `packages/agent-pack-sdk/` 或 `packages/agent-pack-<id>/` 作為必要實作。

實作裁決：

1. 既有 `IntegrationAdapter` 是注入、verify、uninstall、manifest hash 的唯一底層契約。
2. Agent Pack 是由一個或多個 `IntegrationAdapter`、Rule Render Pipeline、`atm welcome`、`create-atm` 組成的 onboarding bundle。
3. 若未來 npm publish 需要 `@ai-atomic-framework/agent-pack-*` 名稱，也只能作為薄 wrapper 或 re-export，不可複製第二套 manifest / renderer / uninstall 邏輯。
4. 文件、人類任務卡可使用 Agent Pack 語言；code package 與 validator 以 Integration Adapter Layer 為準，避免污染 adapter / pack 邊界。

### 2.4 三層發佈共存，不取代

ATM 既有的 `release/atm-root-drop/`、`release/atm-onefile/atm.mjs`、源碼路由三層發佈不動。本計畫新增的 npm publish + `npx create-atm` 是「**第四層**」入口，目的是降低 first-touch 摩擦，但企業內網、離線環境仍應能用前三層完成入門。

### 2.5 Onboarding 不是 protocol 的前置條件

MRP 的 map replacement 應可在沒有 agent-pack、沒有 slash command 的情況下用 CLI / schema / tests 完成。Agent Pack 只能改善體驗，**不能**成為 MRP / atomic-spec / upgrade gate 正確性的必要條件。若使用者只想用裸 CLI 跑 MRP，必須仍可完整跑完 M3–M10。

### 2.6 規則發放但不取代閘門

Agent Pack 渲染出的 prompt 摘要只是「告訴 agent 規則在哪、會被怎麼擋」，**不**取代 `propose.ts` / `verify` / `lane transition` 等硬閘門。Agent 即使忽略 prompt，閘門仍會在缺 evidence / 缺 justification 時 block。

## 3. Agent Pack SDK 最小介面

新增 `packages/agent-pack-sdk/`，定義最小介面：

```ts
interface AgentPack {
  id: string;                  // 例如 "claude-code", "cursor", "copilot"
  displayName: string;         // 人類可讀名稱
  targets: TargetFile[];       // 注入目標清單
  render(ctx: RenderContext): RenderedManifest;
}

interface TargetFile {
  relativePath: string;        // 例如 ".claude/commands/atm-next.md"
  templateId: string;          // 對應 templates/atm-next.md.tmpl
  format: 'markdown' | 'toml' | 'yaml' | 'json';
}

interface RenderContext {
  guardsHash: string;          // default-guards.json sha256
  schemaHashes: Record<string, string>; // 各 schema sha256
  guardSummaries: GuardSummary[];
  protocolRefs: ProtocolRef[]; // 連結到 MRP 等 protocol 文件
}

interface RenderedManifest {
  packId: string;
  packVersion: string;
  generatedAt: string;         // ISO timestamp
  sourceHashes: { guardsHash: string; schemaHashes: Record<string, string> };
  files: { path: string; sha256: string; bytes: number }[];
}
```

設計重點：
1. `render(ctx)` 是純函數：相同 `RenderContext` 產生相同 `RenderedManifest`，可重現、可 diff。
2. `RenderContext.guardsHash` 與 `schemaHashes` 必須來自 SSoT，不可由 agent-pack 自填。
3. 模板放在 agent-pack 內 `templates/` 子目錄，副檔名統一 `*.md.tmpl` / `*.toml.tmpl`，由 `render()` 各自格式化。
4. 模板共用變數槽位：`{{GUARDS_SUMMARY}}`、`{{NEXT_ACTION_HINT}}`、`{{PROTOCOL_REFS}}`、`{{ATOM_ID}}`、`{{LOCK_OWNER}}`。動態值（例如 `{{NEXT_ACTION_HINT}}`）在 agent 執行時由 `atm next --json` 提供，**不**在 render time 寫死。

## 4. Manifest sha256 防漂移規則

新增 `schemas/agent-pack/manifest.schema.json`，承載 `RenderedManifest`：

1. `packId` / `packVersion`：用於識別與升級檢查。
2. `generatedAt`：渲染時間戳。
3. `sourceHashes.guardsHash`：來源 `default-guards.json` sha256。
4. `sourceHashes.schemaHashes`：相關 schema 的 sha256 對應表。
5. `files[]`：每個注入檔案的 `{path, sha256, bytes}`。

落地位置：`.atm/agent-pack/<packId>.manifest.json`，與 `.atm/runtime/` 並列，**不**進 `.atm/history/`（避免污染既有 governance 紀錄）。

漂移偵測規則：
1. `atm agent-pack diff --id <packId>`：比對 disk 上注入檔案的當前 sha256 與 manifest 紀錄，回報 `unchanged` / `user-modified` / `missing`。
2. `atm agent-pack verify-fresh --id <packId>`：比對 manifest 的 `sourceHashes.guardsHash` 與當前 `default-guards.json` 的 sha256，不一致則 exit code 2，提示需重新 render。
3. `atm agent-pack uninstall --id <packId>`：依 manifest 中 `files[].sha256` 與 disk 比對，僅刪除未被使用者修改過的檔案（user-modified 檔案改為 rename to `*.bak` + 警告）。

## 5. Rule Render Pipeline

從 SSoT 渲染到 markdown / prompt 模板的單向管線：

```
default-guards.json  ─┐
atomic-map.schema    ─┤
map-equivalence-     ─┼─►  atm constitution render  ─►  .atm/memory/constitution.md
report.schema        ─┤                            └─►  agent-pack-* render()
upgrade-input-       ─┤                                   ├─► .claude/commands/atm-*.md
kinds                ─┘                                   ├─► .cursor/rules/atm-*.md
                                                          └─► .gemini/commands/atm-*.toml
```

新增 `packages/cli/src/commands/constitution.ts`：

1. `atm constitution render --out .atm/memory/constitution.md`：從 SSoT 渲染專案憲法，frontmatter 帶 `source_guards_sha256` 與 `source_schema_sha256s`。
2. `atm constitution verify`：檢查 `constitution.md` 的 frontmatter sha256 是否符合當前 SSoT，不一致則 block 後續 `agent-pack install`。

新增 `packages/cli/src/commands/agent-pack.ts`：

1. `atm agent-pack install --id <packId> [--force]`：呼叫 pack 的 `render()`，依 manifest 寫檔，記錄到 `.atm/agent-pack/<packId>.manifest.json`。
2. `atm agent-pack uninstall --id <packId>`：依 manifest 乾淨卸載。
3. `atm agent-pack diff --id <packId>`：偵測 user 修改。
4. `atm agent-pack verify-fresh --id <packId>`：偵測 SSoT 漂移。
5. `atm agent-pack list`：列出已安裝與可用 pack。

## 6. CLI 工作流

### 6.1 一鍵入門

```bash
# 從 npm（Phase 4 後）
npx create-atm <project-name> --agent claude-code

# 等價於：
git clone / 下載 onefile
node atm.mjs bootstrap
node atm.mjs constitution render
node atm.mjs agent-pack install --id claude-code
node atm.mjs welcome
```

### 6.2 install / uninstall / diff

```bash
node atm.mjs agent-pack list
node atm.mjs agent-pack install --id claude-code
node atm.mjs agent-pack diff --id claude-code
node atm.mjs agent-pack uninstall --id claude-code
```

### 6.3 constitution 渲染

```bash
node atm.mjs constitution render
node atm.mjs constitution verify
```

`constitution render` 必須在 `default-guards.json` 變更後重跑；`verify` 在 CI 與 pre-commit 都應呼叫。

### 6.4 welcome 串接

```bash
node atm.mjs welcome [--agent <id>] [--dry-run]
```

行為：
1. 印出 constitution 摘要（從 `.atm/memory/constitution.md` 讀取，不再 baked-in 模板）
2. 印出已安裝 agent-pack 清單與漂移狀態
3. 印出 `atm next --json` 的下一個建議動作
4. `--dry-run` 模式不做任何寫入，只 echo

### 6.5 與 MRP CLI 的協同

本計畫不新增任何 map / equivalence / upgrade 相關 CLI；MRP 的 `create-map`、`test --map`、`upgrade --target map`、`replacement-lane transition` 等仍由 MRP 任務交付。agent-pack 模板只引導 agent 呼叫上述 CLI，不取代它們。

## 7. Onboarding Lifecycle

Onboarding lifecycle 是 agent 接入 ATM 的階段標記，與 MRP 的 replacement rollout lane 完全獨立：

1. `uninstalled`：使用者專案內無 `.atm/` 或 agent-pack manifest。
2. `installed`：`atm bootstrap` 完成，`.atm/` 樹建立，但尚未 render constitution。
3. `constitution-rendered`：`atm constitution render` 完成，`.atm/memory/constitution.md` 帶有最新 SSoT sha256。
4. `agent-pack-applied`：至少一個 agent-pack 已 install，對應目錄（`.claude/`、`.cursor/` 等）有產出。
5. `welcomed`：使用者已執行 `atm welcome` 至少一次（記錄於 `.atm/runtime/welcome.lineage.json`）。
6. `operational`：agent 已透過 slash command 或 CLI 至少完成一次 `atm next --json` 字面執行。

轉移規則：
1. `uninstalled → installed`：需要 git repo + `node atm.mjs bootstrap` 成功。
2. `installed → constitution-rendered`：需要 SSoT 完整、`constitution render` 成功且 verify 通過。
3. `constitution-rendered → agent-pack-applied`：需要 install 至少一個 pack、manifest 寫入成功。
4. `agent-pack-applied → welcomed`：需要 `atm welcome` 完整跑完且沒有 user 中斷。
5. 任何階段都可降級（uninstall、user 刪檔），降級不 trigger gate，但會反映在 `welcome` 輸出的 status。

## 8. Multi-Agent Pack 擴張

| Agent | Pack id | 注入目錄 | 檔案格式 | 對應外部 integration 類型 |
|------|---------|---------|---------|--------------------------|
| Claude Code | `claude-code` | `.claude/commands/` 或 `.claude/skills/atm-<name>/` | Markdown + YAML frontmatter | `SkillsIntegration` |
| Cursor | `cursor` | `.cursor/rules/skills/` | Markdown | `SkillsIntegration` |
| GitHub Copilot | `copilot` | `.github/` + `.github/prompts/` | `.agent.md` + `.prompt.md` | `MarkdownIntegration` |
| Gemini | `gemini` | `.gemini/commands/` | TOML | `TomlIntegration` |
| Windsurf | `windsurf` | `.windsurf/workflows/` | Markdown | `MarkdownIntegration` |
| Goose（後補） | `goose` | `.goose/recipes/` | YAML | （自訂） |
| Aider（後補） | `aider` | `.aider.conf.yml` 周邊 | YAML | （自訂） |

策略：
1. 先做 Claude Code Pack 作為 MVP（M2）。
2. Cursor / Copilot / Gemini / Windsurf 在 M5 一輪 ship。
3. Goose / Aider 視社群需求補入，可由社群 PR。
4. 自動生成 `docs/multi-agent-compatibility-matrix.md`：新增 `scripts/render-agent-matrix.ts`（M6），從 agent-pack registry 反向產出文件，避免人類手抄漂移。

## 9. npm publish 與三層發佈共存

### 9.1 新增第四層發佈

| 層 | 用途 | 對象 | 既有 / 新增 |
|---|------|------|-----------|
| 1 | 源碼路由 `atm.mjs` | ATM 開發者 | 既有 |
| 2 | `release/atm-root-drop/` | 企業內網、多檔便攜 | 既有 |
| 3 | `release/atm-onefile/atm.mjs` | 離線單檔、零依賴 | 既有 |
| 4 | npm 套件（`@ai-atomic-framework/cli`、`create-atm`） | 公開使用者、快速試用 | **本計畫新增** |

### 9.2 npm package 規劃

- `@ai-atomic-framework/cli`：對應 `packages/cli/`，bin = `atm`。
- `@ai-atomic-framework/agent-pack-sdk`：對應 `packages/agent-pack-sdk/`。
- `@ai-atomic-framework/agent-pack-claude-code` 等：每個 agent-pack 獨立 publish，允許按需安裝。
- `create-atm`：對應 `packages/create-atm/`，bin = `create-atm`，內部呼叫 cli 的 `runBootstrap()` + `runAgentPackInstall()`。

### 9.3 release workflow

新增 `.github/workflows/release-npm.yml`：

1. 觸發：git tag 符合 `v[0-9]+.[0-9]+.[0-9]+` 或 `v[0-9]+.[0-9]+.[0-9]+-alpha.[0-9]+`。
2. 步驟：跑完整 `compute-gate standard` → 打包 → `npm publish --access public`。
3. 同步：自動更新 `release/atm-root-drop/` 與 `release/atm-onefile/atm.mjs` 對應版本（避免四層發佈漂移）。
4. 禁止：未通過 compute-gate / verify-fresh 時 release 步驟必須 block。

### 9.4 治理嚴肅性保護

為避免 npm 一鍵裝稀釋 ATM 的「先讀規則、後執行」嚴肅性：

1. `create-atm` 預設**不**安裝 agent-pack，除非 `--agent <id>` 顯式指定。
2. `atm welcome` 必須先印 constitution 摘要（不是「安裝完成」），讓使用者實際看到規則。
3. README 與 npm package description 必須明確標示 ATM 是「治理框架」，不是「CLI 工具」。

## 10. MVP 里程碑

> **2026-05-17 里程碑重基準**：本節原始 M1–M8 保留作為概念拆解，但實作順序須改以目前 AI-Atomic repo 已落地的 `IntegrationAdapter` 為基礎。已完成的 `packages/integrations-core/` 與四大 `packages/integration-<agent>/` 不再回頭改名為 `agent-pack-*`。後續執行時，任務卡與 commit 應以 §18 的裁決與重排里程碑為準。

依賴關係：M1 → M2 → M3 → M4 → M5 / M6 / M7 並行 → M8。其中 M3 / M5 / M7 可在 M4 完成後並行。

### Milestone 1：文件定稿（M1）

本計畫書 + cross-link 到 ATM repo 端。對應任務卡 TASK-APO-0000 / 0001。

### Milestone 2：Agent Pack SDK + Claude Code Pack MVP（M2）

新增 `packages/agent-pack-sdk/` 與 `packages/agent-pack-claude-code/`，CLI 支援 `install` / `uninstall` / `diff` / `list`。對應 TASK-APO-0002 / 0003。

### Milestone 3：Rule Render Pipeline（M3）

新增 `atm constitution render` / `verify`，agent-pack `render()` 強制吃 SSoT sha256。對應 TASK-APO-0004。

### Milestone 4：Constitution Gate（M4）

擴充 `plugin-rule-guard`：違反守衛要求 evidence 含 `justification` 欄位，缺則 `atm verify` 非零 exit。對應 TASK-APO-0005。

### Milestone 5：Multi-Agent Pack 擴張（M5）

新增 Cursor / Copilot / Gemini / Windsurf 四個 pack + `render-agent-matrix.ts`。對應 TASK-APO-0006 / 0010。

### Milestone 6：npm publish + create-atm（M6）

新增 `packages/create-atm/`、`.github/workflows/release-npm.yml`，publish `@ai-atomic-framework/cli` 等。對應 TASK-APO-0007。

### Milestone 7：atm welcome（M7）

新增 `packages/cli/src/commands/welcome.ts`、`.atm/runtime/welcome.lineage.json` schema。對應 TASK-APO-0008。

### Milestone 8：Slash Command nextActionHint 對接 MRP（M8）

修改 `atm next --json` output 加 `agent_pack_hint` 欄位（建議下一個 slash command id），讓 agent-pack 模板可以無縫 chain。與 MRP TASK-MRP-0009 協同。對應 TASK-APO-0009。

## 11. 成功標準

完成後，ATM 應能回答：

1. 使用者進到新專案，最少幾個指令能讓 agent 開始遵守 ATM 治理？（目標：≤ 2 個指令，含 `create-atm`）
2. `default-guards.json` 改了，所有 agent 看到的 prompt 摘要會自動同步嗎？（目標：必須，且漂移會被 `verify` 擋住）
3. 使用者手改 `.claude/commands/atm-next.md` 後，再跑 `atm agent-pack uninstall` 會誤刪嗎？（目標：不會，會保留並 rename `*.bak`）
4. Agent-pack 沒裝的情況下，仍能用裸 CLI 跑完 MRP M3–M10 嗎？（目標：必須，agent-pack 只能加強體驗）
5. Claude Code、Cursor、Copilot、Gemini、Windsurf 五種 agent 都能看到相同規則 SSoT 嗎？（目標：必須，格式不同但內容同源）
6. `npx create-atm my-app --agent claude-code` 在空目錄 60 秒內完成嗎？（目標：是）
7. 規則 baked-in prompt 與 `atm next --json` 動態路由有重複/衝突嗎？（目標：無，prompt 只引導呼叫 next，不規定步驟）
8. 違反守衛時，缺 justification 會被 block 嗎？（目標：是，且 block 訊息會引導 agent 補 justification）

## 12. 風險與避免方式

### 12.1 Agent Pack 變成外部靜態 prompt 框架翻版

風險：把完整流程 baked-in slash command，消滅 `atm next --json` 動態權威。
避免：§2.1 寫死「模板只引導不規定」，code review 必須拒絕任何把 phase 流程寫進模板的 PR。

### 12.2 規則五重漂移

風險：guards.json / constitution.md / 5 個 agent-pack 模板各自一份，改一處不同步全部。
避免：§4 manifest sha256 + §5 `atm constitution verify` + `agent-pack verify-fresh`，CI 強制檢查。

### 12.3 跨 agent 模板維護成本爆炸

風險：5 agent × 6+ command × 2 格式 = 60+ 檔，每改一條規則動 60 檔。
避免：§3 單一 `*.md.tmpl` source + `render()` 各自格式化，模板共用變數槽。

### 12.4 npm publish 稀釋治理嚴肅性

風險：一鍵裝太方便，使用者跳過讀 constitution。
避免：§9.4，`create-atm` 預設不裝 pack、`atm welcome` 強制印規則摘要、README 明示「治理框架」定位。

### 12.5 Onboarding 變成 MRP 的前置條件

風險：MRP M5 / M6 gate 開始依賴 agent-pack 存在，導致裸 CLI 路徑壞掉。
避免：§2.5 寫死「Onboarding 不是 protocol 的前置」，MRP code review 必須拒絕任何 require agent-pack 的 gate。

### 12.6 Agent Pack 與 ATM Adapter 名稱混淆

風險：未來新貢獻者把 `packages/agent-pack-cursor/` 與 `packages/adapter-local-git/` 混為一談。
避免：§2.3 命名隔離 + README 加對照表 + ARCHITECTURE.md 加章節說明邊界。

### 12.7 多 agent 矩陣手抄漂移

風險：`docs/multi-agent-compatibility-matrix.md` 與實際 agent-pack registry 漂移。
避免：M5 引入 `scripts/render-agent-matrix.ts` 自動生成，CI 比對 sha256 漂移即 block。

## 13. 最終建議

ATM 下一步應在不阻塞 MRP M3–M10 的前提下，啟動本計畫 M1–M4 四個基礎里程碑。完成後使用者只需兩個指令（`npx create-atm` + `atm welcome`）即可讓 agent 進入 ATM 治理循環；同時 SSoT 規則改動會自動同步到所有 agent 看到的 prompt 摘要，徹底解決「規則靠 agent 自願讀」的入門摩擦。

本計畫最重要的落點是：ATM 的核心優勢仍是 `atm next --json` 動態路由與 schema / evidence / upgrade gate 硬閘門，agent-pack 只是讓 agent 更容易「找到」這些既有能力。我們不重寫權威，只補齊入口。

## 14. 目標 A / B 的可達成性重新分析

本章把使用者明訂的兩個目標單獨拆出，逐點對映到 ATM 現況、缺口、與本計畫要交付的最小機制。目的是把「無痛引入 ATM」從口號變成可驗證的 deterministic checklist。

### 14.1 目標 A：agent 進來自動進入 ATM 治理循環

目標原文：「達到無痛引入 AI Agent 自動使用框架的規則跟精神。」

要可達成必須同時滿足三件事：

1. **入口指令最小化**：使用者最多兩個指令（`create-atm` + `welcome`）即可讓 agent 開始遵守 ATM 規則。
2. **規則必須被 agent 看到**：規則摘要必須以 agent 認得的格式（slash command / SKILL.md / TOML command）落地，**且** 模板強制要求 agent 呼叫 `atm next --json` 取得當前 step。
3. **不需口頭交代**：agent 進到專案後不需主管/使用者另外告訴它「該讀哪個檔、該跑哪個指令」，所有資訊都在 agent 預設讀取的入口檔案內。

對映到本計畫的具體交付：

| 目標 A 子條件 | 由哪個機制保證 | 對應里程碑 | 對應任務卡 |
|---|---|---|---|
| 入口指令最小化 | `create-atm` + `atm welcome` | M6 / M7 | TASK-APO-0007 / 0008 |
| 規則被 agent 看到 | Agent Pack SDK + 至少 Claude Code Pack | M2 / M5 | TASK-APO-0002 / 0003 / 0006 |
| 不需口頭交代 | Rule Render Pipeline + welcome 首跑印規則摘要 | M3 / M7 | TASK-APO-0004 / 0008 |

達成判斷：在一個全新的空 git repo 中執行 `npx create-atm demo --agent claude-code`，60 秒內出現 `.claude/commands/atm-*.md` 6 個檔 + `.atm/memory/constitution.md`，且 Claude Code 用 `/atm-next` 立刻得到 `atm next --json` 的 deterministic action，即視為目標 A 達成。

### 14.2 目標 B：規則改動，agent 看到的指引同步更新

目標原文（推導自使用者前述對話）：「不靠 git template 或 boilerplate clone，而是用 5 個機制疊加把框架塞進使用者專案。」其中「Constitution Render Pipeline + Manifest sha256」是「規則改動自動同步」的對應機制。

要可達成必須同時具備四件事：

1. **SSoT 單一**：`default-guards.json` / schemas 是唯一真相，markdown / prompt 都是渲染產物。
2. **漂移可偵測**：使用 sha256 manifest，任何 SSoT 變更必須讓 stale 的 render 產物 fail verify。
3. **乾淨卸載**：使用者手動修改過的檔案不會被 uninstall 誤刪，而是保留並警告。
4. **CI 強制檢查**：`atm constitution verify` 與 `atm agent-pack verify-fresh` 必須在 CI / pre-commit 跑，避免漂移進主分支。

對映到本計畫的具體交付：

| 目標 B 子條件 | 由哪個機制保證 | 對應里程碑 | 對應任務卡 |
|---|---|---|---|
| SSoT 單一 | §2.2 + §5 Rule Render Pipeline | M3 | TASK-APO-0004 |
| 漂移可偵測 | §4 Manifest sha256 + `verify-fresh` | M2 / M3 | TASK-APO-0002 / 0004 |
| 乾淨卸載 | `uninstall` 偵測 user-modified + `*.bak` | M2 | TASK-APO-0003 |
| CI 強制檢查 | compute-gate 整合 `constitution verify` + `agent-pack verify-fresh` | M3 / M4 | TASK-APO-0004 / 0005 |

達成判斷：對示範專案執行下列流程能正確 block 漂移即視為目標 B 達成：

```bash
node atm.mjs agent-pack install --id claude-code
echo "{ \"newGuard\": {} }" >> .atm/runtime/default-guards.json   # 模擬 SSoT 變動
node atm.mjs agent-pack verify-fresh --id claude-code             # 預期 exit code 2
node atm.mjs constitution render && node atm.mjs agent-pack install --id claude-code --force
node atm.mjs agent-pack verify-fresh --id claude-code             # 預期 exit code 0
```

### 14.3 風險再校準

1. **被誤判為「另一個外部靜態 prompt 框架 clone」**：避免方式 = 每個任務卡的 deterministic check 必須引用 `atm next --json` 為權威，code review 拒絕任何 baked-in 完整流程的 PR。
2. **MRP 完成但 Onboarding 還沒做完，agent 不知道用 MRP**：避免方式 = M2 Claude Code Pack 首發版本就要包含 `atm-map-create`、`atm-map-equivalence`、`atm-map-rollout` 等模板（即使它們只 echo 「呼叫 `atm next --json`」），不要等 MRP 完成才補 pack。
3. **使用者手抄舊範例**：避免方式 = M2 完成同時 deprecate `examples/claude-code-slash-commands/`，README 指向 `agent-pack install`。
4. **Schema 漂移與 pack 漂移雙頭爆**：避免方式 = compute-gate 標準 profile 必須同時跑 `constitution verify` + `agent-pack verify-fresh`，兩者任一失敗即 block。

## 15. 里程碑總表與 Checklist

每個里程碑都列出可勾選的 deterministic checklist。完成判定條件 = 該 checklist 全部勾選且對應檔案存在或變更。

### Milestone 1：文件定稿（M1）

對應任務卡：TASK-APO-0000 / 0001

- [x] 本計畫書（`docs/ai_atomic_framework/agent-pack-onboarding/02_ATM_agent-pack-onboarding計畫書.md`）存在且包含 §0–§18
- [ ] 文件被 ATM `README.md` 與 `docs/ARCHITECTURE.md` 引用；ATM repo 端只保留英文公開說明（暫定 `docs/AGENT_PACK_ONBOARDING.md`）
- [ ] 文件通過 UTF-8 編碼檢查（無 BOM、無 U+FFFD）
- [ ] 目標 A、B 在 §14 有明確達成判斷
- [ ] 風險清單 §12 + §14.3 已合併，沒有矛盾
- [ ] 與 MRP（`doc_other_0133`）責任邊界在 §17 明確劃分

### Milestone 2：Agent Pack SDK + Claude Code Pack MVP（M2）

對應任務卡：TASK-APO-0002 / 0003

- [ ] `packages/agent-pack-sdk/package.json` + `src/index.ts` 存在，匯出 `AgentPack` / `TargetFile` / `RenderContext` / `RenderedManifest` 型別
- [ ] `packages/agent-pack-sdk/src/index.ts` 提供 `renderManifest()` 與 `hashFiles()` 純函數
- [ ] `packages/agent-pack-claude-code/` 存在，包含 6 個 `*.md.tmpl`：bootstrap / lock / next / evidence / handoff / verify
- [ ] `schemas/agent-pack/manifest.schema.json` 存在且通過 AJV 編譯
- [ ] `packages/cli/src/commands/agent-pack.ts` 提供 `install` / `uninstall` / `diff` / `list` 四個 sub-action
- [ ] `packages/cli/src/atm.ts` 註冊 `agent-pack` 命令
- [ ] `tests/agent-pack/install-uninstall-roundtrip.test.ts` 至少 1 個 positive + 1 個 user-modified fixture
- [ ] `node atm.mjs agent-pack install --id claude-code` 在乾淨 repo 產出 6 個 .md + 1 個 manifest
- [ ] `node atm.mjs agent-pack uninstall --id claude-code` 後 `git status` 為空（乾淨卸載）

### Milestone 3：Rule Render Pipeline（M3）

對應任務卡：TASK-APO-0004

- [ ] `packages/cli/src/commands/constitution.ts` 提供 `render` + `verify`
- [ ] `.atm/memory/constitution.md` 渲染後 frontmatter 含 `source_guards_sha256` 與 `source_schema_sha256s`
- [ ] `default-guards.json` 變更後 `atm constitution verify` exit code 2
- [ ] `atm agent-pack verify-fresh --id <packId>` 偵測 SSoT 漂移正確 exit code 2
- [ ] `compute-gate.js --profile standard` 整合 constitution verify + verify-fresh
- [ ] 渲染管線是純函數：相同輸入 sha256 → 相同 output sha256

### Milestone 4：Constitution Gate（M4）

對應任務卡：TASK-APO-0005

- [ ] `packages/plugin-rule-guard/` 違反守衛時要求 evidence 含 `justification` 欄位
- [ ] 缺 justification 時 `atm verify` 非零 exit code，並輸出 `requiredJustification` 欄位
- [ ] 至少 1 個 negative fixture 證明 gate 真的會擋
- [ ] 與 MRP M5 的 `upgrade/propose.ts` evidence gate 行為一致（複用 justification pattern）

### Milestone 5：Multi-Agent Pack 擴張（M5）

對應任務卡：TASK-APO-0006 / 0010

- [ ] `packages/agent-pack-cursor/` 存在，注入 `.cursor/rules/skills/`
- [ ] `packages/agent-pack-copilot/` 存在，注入 `.github/` + `.github/prompts/*.prompt.md`
- [ ] `packages/agent-pack-gemini/` 存在，注入 `.gemini/commands/*.toml`
- [ ] `packages/agent-pack-windsurf/` 存在，注入 `.windsurf/workflows/*.md`
- [ ] `scripts/render-agent-matrix.ts` 從 agent-pack registry 自動生成 `docs/multi-agent-compatibility-matrix.md`
- [ ] CI 比對 matrix sha256，漂移即 block
- [ ] 每個 pack 通過 install / uninstall / diff / verify-fresh 一輪 e2e

### Milestone 6：npm publish + create-atm（M6）

對應任務卡：TASK-APO-0007

- [ ] `packages/create-atm/package.json` 含 `bin: { "create-atm": "..." }`
- [ ] `packages/cli/package.json` 升級 version、加 `publishConfig.access: public`
- [ ] `.github/workflows/release-npm.yml` 在 git tag 觸發 publish
- [ ] `release-npm.yml` 內含 compute-gate standard pass 才 publish 的 guard
- [ ] `npx create-atm test-app --agent claude-code` 在空目錄 60 秒內完成 init + render + pack install
- [ ] npm package README 明確標示「治理框架」定位，避免 CLI tool 誤解

### Milestone 7：atm welcome（M7）

對應任務卡：TASK-APO-0008

- [ ] `packages/cli/src/commands/welcome.ts` 存在
- [ ] `atm welcome` 印出 constitution 摘要 + agent-pack 狀態 + `atm next --json` 建議
- [ ] `--dry-run` 不寫入任何檔案
- [ ] `.atm/runtime/welcome.lineage.json` 記錄首次 welcome 時間戳
- [ ] welcome 不取代 `atm next`：印完摘要後仍提示 agent 呼叫 `atm next --json`

### Milestone 8：Slash Command nextActionHint 對接 MRP（M8）

對應任務卡：TASK-APO-0009

- [ ] `packages/cli/src/commands/next.ts` output JSON 新增 `agent_pack_hint` 欄位
- [ ] `agent_pack_hint` 內容指向下一個建議的 slash command id（例如 `atm-map-equivalence`）
- [ ] `schemas/agent-prompt.schema.json` 同步擴充 `agent_pack_hint` 與 `handoff_chain[]`
- [ ] 與 MRP TASK-MRP-0009 的 `nextActionHint` 共用 schema 欄位（避免雙頭命名）
- [ ] agent-pack 模板能讀 `agent_pack_hint` 並引導使用者進入下一個 slash command

## 16. 任務卡索引

所有任務卡規劃放在 `docs/ai_atomic_framework/agent-pack-onboarding/tasks/` 下（**本計畫書建立時尚未開出實體任務卡，待使用者後續授權再批次開單**）。任務卡格式與 MRP 一致：Markdown + YAML frontmatter，欄位與 `governance-bundle` 的 `taskStorePath` 兼容。

| Task ID | 標題 | 對應里程碑 | 阻擋者 | 主要交付 |
|---|---|---|---|---|
| TASK-APO-0000 | 文件定稿與 cross-link | M1 | — | 本計畫書 + 引用 |
| TASK-APO-0001 | 對齊 ATM ARCHITECTURE / README cross-link | M1 | TASK-APO-0000 | ARCHITECTURE.md + README 補章 |
| TASK-APO-0002 | Agent Pack SDK 介面 + manifest schema | M2 | TASK-APO-0000 | sdk package + manifest schema |
| TASK-APO-0003 | Claude Code Pack MVP | M2 | TASK-APO-0002 | claude-code pack + e2e test |
| TASK-APO-0004 | Rule Render Pipeline | M3 | TASK-APO-0002 | constitution render + verify CLI |
| TASK-APO-0005 | Constitution Gate（justification） | M4 | TASK-APO-0004 | plugin-rule-guard 擴充 |
| TASK-APO-0006 | Multi-Agent Pack 擴張（Cursor / Copilot / Gemini / Windsurf） | M5 | TASK-APO-0003 | 4 個 pack package |
| TASK-APO-0007 | npm publish + create-atm | M6 | TASK-APO-0003 / 0004 | create-atm package + release workflow |
| TASK-APO-0008 | atm welcome 一鍵入口 | M7 | TASK-APO-0003 / 0004 | welcome command + lineage |
| TASK-APO-0009 | Slash Command nextActionHint 對接 MRP | M8 | TASK-APO-0003 / TASK-MRP-0009 | next.ts 擴充 + schema |
| TASK-APO-0010 | 多 agent 矩陣自動生成 | M5 | TASK-APO-0006 | render-agent-matrix script |

依賴順序建議執行：0000 → 0001 → 0002 → 0003 → 0004 → 0005 → 0006 / 0007 / 0008 並行 → 0009 → 0010。

## 17. 與其他計畫書的關係

本計畫不獨立存在，而是 ATM 治理生態的一個薄層。以下說明它與既有計畫書的關係：

### 17.1 與 MRP（`doc_other_0133`）的關係

| 維度 | MRP | 本計畫（Agent Pack Onboarding） |
|------|-----|--------------------------------|
| 主題 | Map Replacement Protocol：map 接管 legacy / new feature | Agent Operating Layer：agent 無痛入門 + 規則同步 |
| 處理 | 治理語義（map 結構、equivalence、rollout、retirement） | 入口體驗（CLI 入口、prompt 注入、規則渲染） |
| 交付 | schemas、CLI（create-map、test --map、upgrade）、gate | agent-pack SDK、constitution render、welcome |
| 阻塞關係 | 不阻塞本計畫 | 不阻塞 MRP；本計畫的 M8 與 MRP M9 對接但可獨立完成 |
| 共享 | §17.2 設計約束（justification pattern、SSoT、Windows 第一公民、sha256） | 同左，本計畫 §2 已內化 |

關鍵承諾：MRP 即使在沒有 agent-pack 的情況下，也必須能用裸 CLI 跑完 M3–M10；本計畫的 agent-pack 只是讓 agent 更容易找到 MRP 的能力，不取代 MRP 的閘門。

### 17.2 與 ATM ARCHITECTURE / Documentation Role Map 的關係

本計畫產出的 `packages/agent-pack-*/` 應在 `docs/ai_atomic_framework/documentation-role-map.md` (`doc_other_0091`) 中新增「Agent Operating Layer」分層，與既有的 Core Contracts / Default Governance Bundle / Adapters 並列。

`ATM Cross Reference` (`doc_other_0037`) 應加入「Agent Pack 路由」章節，讓人類查表時能找到「Claude Code → `packages/agent-pack-claude-code/`」等對應。

### 17.3 與 ATM 開源拆出計畫（`doc_other_0030`）的關係

本計畫的 M6 npm publish 與 `open-source-extraction-plan.md` 的開源拆出工作高度相關，但聚焦不同：

- 開源拆出計畫處理「哪些 package 可獨立開源、哪些必須留在 3KLife 內」的劃分。
- 本計畫處理「開源後使用者怎麼進入」的入口體驗。

M6 啟動前必須確認開源拆出計畫已決定 `packages/cli/` 與 `packages/agent-pack-*/` 為可公開 publish。

### 17.4 與 3KLife Consumption Roadmap（`doc_other_0033`）的關係

3KLife 自己也是 ATM 的使用者。本計畫完成後，3KLife 內部接入 ATM 的流程也應走 `atm welcome` + `agent-pack install --id claude-code`，不再用「複製 onefile + 手抄 slash command」的舊路徑。Consumption Roadmap 應在本計畫 M6 完成後同步更新引用。

### 17.5 不重複的部分

本計畫**不**處理以下既有計畫已覆蓋的事項：

1. **Atom 與 Map 的 schema 設計** —— 屬 MRP / atomic-spec。
2. **Validator Orchestrator / AJV Cache** (`doc_other_0116`) —— 屬 ATM 既有 validator 治理。
3. **Cocos Runtime Adapter** (`doc_other_0113`) —— 屬 host adapter，與 agent-pack 不同層。
4. **Documentation Governance Policy** (`doc_other_0090`) —— 本計畫的 markdown 產出仍須遵守，但不重複定義。
5. **Upstream Versioning Policy** (`doc_other_0035`) —— npm publish 的版本治理沿用既有規則。

### 17.6 後續計畫的種子

本計畫完成後，可能衍生但**不**屬於本計畫範圍的後續工作：

1. **Agent Pack Marketplace** —— 社群貢獻的第三方 pack（如 Aider、Continue、Cline）治理流程。
2. **Constitution Versioning** —— 當 `default-guards.json` 演進到 0.2.0、0.3.0 時的 migration 策略。
3. **Telemetry / Observability** —— 收集 agent 是否實際走過 `atm next` 路徑、是否觸發 gate 等。
4. **企業版 Onboarding** —— 多專案、多 agent 共用同一份 constitution 的場景。

以上應另開計畫書，不應併入本計畫主線。

## 18. 與 ATM × spec-kit 融合計畫的整合裁決

### 18.1 建議方案

建議採用「雙主線、單權威」方案：`ATM × spec-kit 融合計畫` 與本計畫並列為兩份重要計畫書，但兩者共享同一組 ATM 權威來源。也就是說，spec-kit 融合計畫負責把外部好用的引導工程轉譯成 ATM 的框架語言；本計畫負責讓任何 agent 進到任何使用者專案時，自動被導到 ATM 的入口、規則與 gate。

不建議把本計畫直接塞進 `ATM × spec-kit 融合計畫` 後段 milestone。若這樣做，Onboarding 很容易被誤讀成「spec-kit integration 的一部分」，進而破壞 ATM 作為開源框架的獨立性。更好的做法是：spec-kit 融合計畫只在自己的 M6 之後宣告「必須消費 Agent Pack / Onboarding 的能力」，但不擁有它。

### 18.2 邊界劃分

| 維度 | ATM × spec-kit 融合計畫 | 本計畫 |
|---|---|---|
| 定位 | 外部方法轉譯與 ATM governance 對齊 | 開源使用者 first-touch 與 agent entry enforcement |
| 成功標準 | spec-kit 優點被 ATM 化，且不引入第二套 registry / task flow | agent 進專案後自動走 `atm next --json` / AtomicCharter / evidence gate |
| package 擁有權 | `integrations-core`、skill compiler、script parity、schema alignment | welcome、rule render freshness、create-atm、CI / hook recipe、e2e onboarding |
| 對 host project 的要求 | 不綁 host，只提供 neutral contract | 不綁 host，只安裝可驗證、可卸載的 agent-native entry files |
| 與 spec-kit 的關係 | 可參考、可轉譯、不可依賴其 runtime | 不直接依賴 spec-kit；只接收 ATM 自有 next/action hint |

### 18.3 開源框架與不可綁專案原則

本計畫所有實作都必須符合下列約束：

1. **Adopter-neutral**：template、prompt、README、schema fixture 不得寫入 3KLife、MRP 私有任務卡或任何單一 host project 的規則。
2. **可選安裝、可強制驗證**：使用者可選擇安裝哪個 agent adapter；但一旦宣告專案使用 ATM official onboarding，CI / doctor 必須能驗證入口檔是否存在且未漂移。
3. **可乾淨卸載**：所有寫入使用者專案的 agent-native file 都必須有 sha256 manifest；使用者修改過的檔案不可被 uninstall 誤刪。
4. **不下沉 core**：agent-specific 邏輯不得進入 `packages/core/`；只能存在於 Agent Operating Layer、Integration Adapter Layer、templates、CLI facade。
5. **裸 CLI 路徑永遠有效**：沒有 agent pack、沒有 slash command、沒有 Copilot / Claude / Cursor 時，使用者仍必須能用 `node atm.mjs next --json` 與 deterministic CLI 完成治理流程。

### 18.4 「無法繞過」的五層落地模型

開源框架不能靠 prompt 宣稱絕對控制，必須用五層疊加：

1. **Agent-native entry layer**：各 adapter 寫入該 agent 會自動讀取的入口檔，且第一個可執行步驟固定導向 `node atm.mjs next --json`。
2. **Dynamic router layer**：`atm next --json` 根據 AtomicCharter、lock、evidence、context budget、integration health 回傳下一步，模板不得自建狀態機。
3. **Manifest / doctor layer**：`atm integration verify`、`atm doctor` 偵測入口檔 missing、hash drift、charter 缺失、host rule conflict。
4. **Local enforcement layer**：pre-commit / pre-push hook 呼叫 `doctor`、`integration verify`、rule render freshness check；失敗即阻擋提交或推送。
5. **Remote enforcement layer**：CI / release workflow / branch protection 重新跑同一組 deterministic check；因此 agent 即使本地跳過，主分支仍不接受未通過 ATM 入口與 evidence gate 的變更。

正式語句應避免承諾「任何人都不能手動刪檔」；正確承諾是「官方支援流程不能跳過，跳過後必被偵測，且可在提交、CI 或 release 階段被阻擋」。

### 18.5 ATM × spec-kit 融合計畫的里程碑修正

`ATM × spec-kit 融合計畫` 的 M0–M5 已經完成 AtomicCharter 與 Integration Adapter Layer 的基礎。後續 milestone 應改成下列方向，避免和本計畫重疊：

| 原里程碑 | 修正後定位 | 是否仍屬 ATM × spec-kit |
|---|---|---|
| M6 `atm integration` 子指令 | 保留。這是 spec-kit 融合計畫交給 Onboarding 計畫消費的底層 CLI facade | 是 |
| M7 Slash Skill 模板與 Charter 注入 | 保留但改名為 `Entry Template Compiler`，只負責把 ATM skill source 編譯到各 adapter 格式 | 是 |
| M8 sh / ps 雙腳本同捆與 parity | 保留。這是開源框架與 Windows 第一公民能力，不屬於單一 onboarding UX | 是 |
| M9 端到端 Example 與 Multi-agent 驗證 | 拆分：framework-neutral example 留在 ATM × spec-kit；first-touch welcome e2e 交給本計畫 | 部分 |
| M10 Rollout 與 Adoption 指標 | 拆分：framework metrics 留在 ATM × spec-kit；first-command-correctness、onboarding drift rate 交給本計畫 | 部分 |

因此，`ATM × spec-kit` 不需要新增 `create-atm`、`welcome`、Rule Render freshness、npm onboarding 文案等交付；這些都移到本計畫。反過來，本計畫也不應實作 spec-kit 的 `/specify -> /plan -> /tasks` 工作流、presets 或 extension ecosystem。

### 18.6 本計畫的重排里程碑

以目前 AI-Atomic repo 已完成的 `IntegrationAdapter` / 四大 adapter 為基底，本計畫後續建議重排為：

1. **APO-M1：文件與 cross-link 收斂**：本計畫書加入 ATM README / ARCHITECTURE 引用，並明確宣告第二主計畫地位。
2. **APO-M2：Rule Render / AtomicCharter 摘要管線**：從 `default-guards.json`、charter invariants、schema hashes 渲染 agent 可讀摘要，並提供 freshness verify。
3. **APO-M3：Welcome lifecycle**：新增 `atm welcome` 與 `.atm/runtime/welcome.lineage.json`，把 installed / rendered / adapter-applied / operational 狀態 machine-readable 化。
4. **APO-M4：Onboarding enforcement recipe**：提供 pre-commit、CI、branch protection 範本，串接 `atm doctor`、`atm integration verify`、rule freshness check。
5. **APO-M5：create-atm / npm fourth distribution layer**：在不破壞 root-drop / onefile / source routing 的前提下，提供公開使用者低摩擦入口。
6. **APO-M6：Multi-agent matrix generator**：由 adapter registry 反向產生 compatibility matrix，禁止人類手抄漂移。
7. **APO-M7：First-touch e2e examples**：空 repo 在 60 秒內完成 init、rule render、adapter install、welcome、first `atm next --json`。
8. **APO-M8：Onboarding adoption metrics**：量測 first-command-correctness、integration-drift、welcome-completion、CI block reason。

### 18.7 對後續實作的明確建議

1. 不要把已完成的 `packages/integration-claude-code/`、`packages/integration-copilot/`、`packages/integration-cursor/`、`packages/integration-gemini/` 改名為 `agent-pack-*`。
2. 下一個 AI-Atomic 實作階段應先完成 `atm integration list/add/verify/remove`，因為這是 Onboarding 計畫能被 CLI 消費的最低必要入口。
3. `create-atm` 與 `atm welcome` 應排在 integration CLI 與 rule freshness 之後，避免先做漂亮入口卻沒有可驗證的底層狀態。
4. spec-kit 相關 hint 只能以 `atm next --json` 的 `agent_pack_hint` 或 `nextActionHint` 形式輸出，不得讓 prompt 直接決定流程。
5. 所有「無法跳過」都要有對應 deterministic check；沒有 check 的規則只能稱為 guidance，不可稱為 gate。

結論：本計畫應成為第二份重要計畫書完整實作；`ATM × spec-kit` 則在 milestone 後段引用它，並消費它提供的 entry enforcement 能力。這樣 ATM 才能同時保留開源框架獨立性、避免綁專案，並讓 agent 進入使用者專案時被自動導回 ATM 規則流程。
