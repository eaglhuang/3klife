<!-- doc_id: doc_other_0035 -->
# Upstream Versioning & Lifecycle Policy

> 補丁來源：`AI原子框架開發計畫書.md` v0.2.1 補強 §B8 + §B12
> 文件位置：`docs/ai_atomic_framework/upstream-versioning-policy.md`
> 對應上游文件：`docs/LIFECYCLE.md`（將由 ATM-5 在上游建立）
> 配合文件：[`3klife-consumption-roadmap.md`](3klife-consumption-roadmap.md)

---

## Canonical Docs 對照（單一真相）

本文件保留為背景政策與遷移脈絡。ATM 對外治理契約以以下文件為唯一真相：

1. [LIFECYCLE.md](/C:/Users/User/3KLife/docs/LIFECYCLE.md)
2. [ATOM_COMPATIBILITY.md](/C:/Users/User/3KLife/docs/ATOM_COMPATIBILITY.md)
3. [GOVERNANCE.md](/C:/Users/User/3KLife/docs/GOVERNANCE.md)
4. [UPGRADE_PROPOSAL_PUBLIC_RULES.md](release_version_flow/UPGRADE_PROPOSAL_PUBLIC_RULES.md)
5. [RELEASE_CHECKLIST.md](release_version_flow/RELEASE_CHECKLIST.md)
6. [CHANGELOG.md](/C:/Users/User/3KLife/CHANGELOG.md)

政策更新流程：先更新 canonical docs，再視需要回補本背景文件，避免雙重真相。

### 權威順序（衝突仲裁）

當以下三層內容衝突時，永遠以較高優先級為準：

1. **L1 程式可讀真相**：上游 `compatibility-matrix.json` 與 `docs/LIFECYCLE.md`。CLI、validator、release workflow 直接讀此層。
2. **L2 背景政策**：本文件（`upstream-versioning-policy.md`），描述 tier、SemVer、deprecation、release trust、incident response 的書面承諾。
3. **L3 落地對照**：`ATM引導工程計畫書.md` §3.8 / §4.3 / §4.4，把 L1+L2 翻譯為 onboarding 操作。

落地對照若與背景政策衝突，視為背景政策的 bug，應回補背景政策後再回寫對照；背景政策若與 L1 衝突，視為 L1 待補的 advisory，CLI / release gate 仍以 L1 為唯一執行依據。

---

## 為什麼需要本政策

`open-source-extraction-plan.md` §4 只寫「`docs/LIFECYCLE.md`：spec versioning、deprecation、semver」一句，缺：

- alpha / beta / stable tier 定義
- deprecation 期長度
- breaking change 通知機制
- migration guide 標準格式
- cross-language 路線圖
- compatibility matrix 維護節奏

3KLife 升級 ATM 時若不知道哪些 API stable / 何時會 break，會在每次升級遇到不可預期的破壞。本政策定義完整 SemVer + Tier + Deprecation + Cross-language 規則。

---

## 1. Tier 定義

| Tier | 版本範圍 | API 穩定承諾 | 推薦使用場景 |
|---|---|---|---|
| **alpha0** | 0.0.x | API 隨意 break，僅證明 schema / registry / hash-lock / CLI / hello-world atom / minimal evidence | 內部自舉、空白 repo proof |
| **alpha1** | 0.1.x | API 可 break，但 Default Governance Bundle 與 AdapterReport 開始收斂；仍無正式 deprecation 承諾 | 預設治理套件、shadow adapter、confidence report |
| **beta** | 0.2.x – 0.9.x | minor 之間 stable，major 可 break，需 migration guide | 早期生產、有 fallback plan |
| **stable** | ≥1.0.0 | 完整 SemVer 2.0；breaking 必走 deprecation cycle | 正式生產 |
| **lts** | ≥2.0.0（規劃）| 長期維護版本，每年標一個 minor 為 LTS | 保守生產環境 |

### Tier 切換條件

| 切換 | 條件 |
|---|---|
| alpha0 → alpha1 | Self-hosting alpha0 deterministic gate 全綠 + hello-world atom + minimal task/lock/evidence + docs neutrality CI 全綠 |
| alpha1 → beta | Default Governance Bundle reference plugins 完成 + ≥10 atoms 自舉 + ≥1 個 shadow adapter（3KLife 低風險 helper atom）+ multi-agent confidence report 已產出 |
| beta → stable | ≥30 atoms 自舉 + ≥3 個 production adopter（含 3KLife html-to-ucuf case）+ regression matrix 連續 4 週無退轉 + 多 AI agent 兼容矩陣作為 confidence report，release owner 判定是否阻塞 |
| stable → lts | 規劃中（v2.0+ 議題）|

---

## 2. SemVer 2.0 對 ATM 的具體解讀

### 2.1 Major bump（X.y.z → X+1.0.0）
觸發條件（任一）：
- Atomic Spec schema 不向後兼容變動（如必填欄位變更）
- AdapterInterface signature 不向後兼容變動
- 移除 `@deprecated` ≥3 個 minor 的 API
- CLI 子命令重命名 / 移除
- Plugin SDK 介面 break

**Major 升級必伴隨**：
- `MIGRATION.md` 對應條目（含 codemod 自動轉換腳本）
- CHANGELOG `### Breaking Changes` 段落
- 上游 release notes 標 `BREAKING`
- 至少 3 個 reference adapter 已先升級驗證

### 2.2 Minor bump（X.Y.z → X.Y+1.0）
- 加新 optional 欄位 / 新 CLI 子命令 / 新 plugin
- 不破壞既有 atom / adapter
- 可標 `@deprecated`（觸發 deprecation cycle）

### 2.3 Patch bump（X.Y.Z → X.Y.Z+1）
- bug fix
- 文件修正
- 內部 refactor（不影響外部 API）

---

## 3. Deprecation Cycle

### 3.1 標準流程
```
T = 0  (minor N)    : 標 @deprecated；CHANGELOG 紀錄；MIGRATION.md 加遷移指引
T = 1m (minor N+1)  : 仍保留舊 API；console.warn 加強
T = 2m (minor N+2)  : 仍保留舊 API；console.warn 升級為 stderr write
T = 3m (minor N+3)  : 移除舊 API
```

**最短保留期**：跨 2 個 minor 版本（≈6 個月，依 minor 釋出節奏）

### 3.2 例外
- **Security CVE**：可不走 cycle，立即釋出 patch（向後不兼容亦可，但需 SECURITY.md 公告）
- **Atomic Spec schema major change**：直接升 major（v1 → v2），不走 cycle，但提供 `atm migrate` 自動轉換

### 3.3 Deprecation 標記範例
```typescript
/**
 * @deprecated since 0.5.0, will be removed in 0.8.0
 * Use {@link AtomicInterface.normalizeColor} instead.
 * Migration: see docs/MIGRATION.md#0.5-to-0.8
 */
export function normalizeCssColor(input: string): string { ... }
```

---

## 4. Compatibility Matrix

### 4.1 維護位置
上游 repo 根目錄：`compatibility-matrix.json`

格式（schemaVersion 採 `atm.compatibilityMatrix.vX.Y` 命名，與實作 fixture 一致；舊範例的 `"1.0"` 已棄用）：
```json
{
  "schemaVersion": "atm.compatibilityMatrix.v0.1",
  "atmVersions": {
    "0.5.0": {
      "minPlatform": "node@22",
      "compatiblePackages": {
        "@atm/plugin-sdk": ">=0.5.0 <0.6.0",
        "@atm/adapter-local-fs-git": ">=0.5.0 <0.6.0"
      },
      "knownIncompatible": []
    },
    "0.6.0": {
      "minPlatform": "node@22",
      "compatiblePackages": { ... },
      "knownIncompatible": ["@atm/plugin-old-rule-guard <0.6"]
    }
  }
}
```

### 4.2 升級檢查
```bash
# 3KLife adapter 升級前必跑
node tools_node/adapters/atm-3klife/compat-check.js \
  --upstream-version 0.6.0 \
  --output compat-report.json

# 退轉者立即 rollback
```

### 4.3 維護節奏（append-only）
- 每次 minor 釋出時更新
- 上游 release PR 必含 compatibility-matrix.json diff
- **歷史條目不刪**：matrix 採 append-only。超過 4 個 minor 的舊版本只能標 `status: "unsupported"` 並補 `removedFromActiveSupportAt`，不得物理移除；保留條目讓離線環境的 `doctor` 仍能 self-diagnose。如需控檔大小，可把過期條目分檔到 `compatibility-matrix.legacy.json`，仍隨 release 出貨。
- release workflow 應自動從 source registry 推導矩陣 diff PR，由人類審核而非手工抄寫（避免 alpha 期高頻 minor 漏更）。

### 4.4 ATMChart / Onboarding 相容矩陣擴充

ATM 引導工程新增的 ATMChart、agent-native entry template、InstallManifest 不另建第二套版本政策，必須併入本節的 compatibility matrix。這裡的「分層版本」不是「分裂發布」：ATM 對外發布仍以 Framework release train 為唯一公開列車，ATMChart version 與 template version 只是該 release manifest 內的相容座標。任何 chart / template version 不得脫離 framework tag 單獨對使用者發布。

上游 `compatibility-matrix.json` 除 `atmVersions` 外，必須能描述：

```json
{
  "schemaVersion": "1.0",
  "releaseTrain": {
    "frameworkVersion": "0.1.0-alpha.0",
    "defaultChartVersion": "0.1.0",
    "defaultTemplateVersion": "0.1.0-alpha.0"
  },
  "atmChartVersions": {
    "0.1.0": {
      "sourceSchemaVersion": "atm.defaultGuards.v0.1",
      "minFrameworkVersion": "0.1.0-alpha.0",
      "status": "supported",
      "compatibleTemplateVersions": ">=0.1.0-alpha.0 <0.2.0",
      "migrationGuide": null
    }
  },
  "agentTemplateVersions": {
    "0.1.0-alpha.0": {
      "minFrameworkVersion": "0.1.0-alpha.0",
      "compatibleChartVersions": ">=0.1.0 <0.2.0"
    }
  }
}
```

更新規則：

- `default-guards.json.schemaVersion`、ATMChart frontmatter contract、InstallManifest schema、entry template source 任一變更，都必須評估是否更新 `atmChartVersions` 或 `agentTemplateVersions`。
- official onboarding path 必須檢查 chart status：`supported` 可通過、`deprecated` 可通過但必須輸出 migration hint、`unsupported` 必須 fail。
- Framework package version 與 ATMChart version 不要求同號，但 matrix 必須宣告 `minFrameworkVersion`，讓 `atm-chart verify`、`doctor`、`welcome` 與 release workflow 可判斷相容性。
- 每個 framework release 必須宣告 `defaultChartVersion` 與 `defaultTemplateVersion`；若缺任一座標，release 不得 publish。
- 每次 npm / root-drop / onefile release PR 必須包含 package tag、framework version、chart compatibility matrix 與 validators config 的一致性檢查。

### 4.5 舊版本偵測、升級與回退安全

ATM 的版本治理必須優先保護既有使用者專案。任何版本落後狀態都必須先被診斷，再由使用者明確選擇升級；不得因為 `npm install`、`create-atm`、`welcome` 或 `doctor` 自動覆寫使用者專案。

最低安全規則：

1. **本地可診斷**：`compatibility-matrix.json` 必須隨 CLI / root-drop / onefile 一起出貨；即使離線，`doctor` 與 `welcome` 也要能判斷 installed chart / template 是否 supported、deprecated 或 unsupported。網路更新檢查只能作為 advisory，不得是唯一真相。
2. **兩階段升級**：升級流程必須先產生 plan / dry-run，再 apply。plan 需要列出會改哪些檔、是否 user-modified、是否需要 migration、如何 rollback。
3. **非破壞寫入**：任何 user-modified entry file、ATMChart 或 manifest 不得被靜默覆蓋。需要覆蓋時必須 rename / backup / explicit force，並保留 diff。
4. **可回退備份**：套用 chart / template / manifest migration 前，必須把 `.atm/memory/atm-chart.md`、`.atm/agent-pack/*.manifest.json`、agent-native entry files、compatibility matrix snapshot 與 framework version 寫入 `.atm/backups/<timestamp>/` 或等價位置。
5. **讀取舊 manifest**：新 CLI 至少要能讀取仍在 support window 內的舊 InstallManifest。若無法升級，CLI 必須進入 read-only diagnostic mode，輸出人工處理步驟，而不是讓專案卡死。
6. **支援窗口**：beta 之後，chart / template deprecation 至少跨 2 個 framework minor；stable 之後遵守完整 deprecation cycle。alpha 期可縮短承諾，但仍不得執行破壞性自動遷移。
7. **回退命令**：正式實作需提供 `atm upgrade rollback` 或等價命令，能從上一份 backup 還原 chart、manifest 與 entry files。回退失敗必須保留原始檔與診斷報告。

版本落後時的預期行為：

| 狀態 | CLI 行為 | 使用者風險控制 |
|---|---|---|
| `supported` | 正常執行 | 可建議更新，但不得阻擋 |
| `deprecated` | 正常執行 + 警告 | 顯示 migration hint、目標版本與最晚支援期限 |
| `unsupported` | 阻擋 official onboarding / release path；允許 read-only doctor | 不自動修改檔案，輸出 rollback / upgrade plan |
| `unknown` | fail closed for publish；**local 端預設拒絕對 unknown chart 寫入**，僅允許 read-only diagnostic。需要 explicit `--allow-unknown-chart` 才能執行升級流程 | 要求更新 compatibility matrix 或手動指定版本 |

---

## 5. Breaking Change PR Template

每個 breaking change PR 必填以下段落：

```markdown
## Type
- [x] Breaking change

## Affected APIs
- `AtomicInterface.normalizeCssColor` → renamed to `AtomicInterface.normalizeColor`
- `Spec.dependencyPolicy.required` → moved to `Spec.dependencies.required`

## Reason
（為什麼非 break 不可？是否考慮過向後兼容方案？）

## Migration Path
（一步步指引；含 codemod 命令）

```bash
npx atm migrate --from 0.4 --to 0.5 path/to/atoms/
```

## Compatibility Matrix Update
- [ ] `compatibility-matrix.json` 已更新
- [ ] `MIGRATION.md` 已加條目
- [ ] CHANGELOG `Breaking` 段落已寫
- [ ] 至少 3 個 reference adapter 升級驗證過
```

無此 template 的 breaking PR → CI 自動 reject。

### 5.1 ATMChart / Onboarding breaking change 補充欄位

若 breaking change 影響 `default-guards.json`、ATMChart frontmatter、InstallManifest、agent template output 或 first-touch flow，PR template 必須額外填寫：

```markdown
## ATMChart / Onboarding Impact
- [ ] `compatibility-matrix.json` 的 `atmChartVersions` / `agentTemplateVersions` 已更新
- [ ] `atm-chart verify --version-check` 或等價 validator 已涵蓋 supported / deprecated / unsupported 狀態
- [ ] `doctor` / `welcome` 會輸出 migration hint 或 unsupported 診斷
- [ ] `MIGRATION.md` 或 release notes 已說明 adopter 必須重跑 `atm-chart render` / `integration add` / `agent-pack install`
```

缺少此段時，該 PR 不得被視為符合本政策的 breaking change 流程。

---

## 6. Cross-language Roadmap

### 6.1 Stage 對應

| Stage | 版本 | JS/TS | Python | C# | Go | Rust |
|---|---|---|---|---|---|---|
| alpha | 0.0.x – 0.1.x | ✅ official | ❌ | ❌ | ❌ | ❌ |
| beta | 0.2.x – 0.9.x | ✅ official + reference | ⚠️ SPI 開放，社群可實作 | ⚠️ SPI 開放 | – | – |
| 1.0 | ≥1.0.0 | ✅ official + production | ✅ official POC（feature-complete in 1.x）| ⚠️ community | ⚠️ community | ⚠️ community |
| 2.0+ | ≥2.0.0 | ✅ official + lts | ✅ official + lts | ✅ official | ⚠️ community | ⚠️ community |

### 6.2 LanguageAdapter SPI（v0.2 開放）

`packages/plugin-sdk` 提供：
```typescript
export interface LanguageAdapter {
  parse(source: string): ASTLike;
  detectImports(ast: ASTLike): ImportRef[];
  detectSideEffects(ast: ASTLike): SideEffectRef[];
  generateCodeStub(spec: AtomicSpec): string;
  runTest(atomPath: string, fixtures: Fixture[]): TestReport;
}
```

社群實作命名：
- `@atm-community/language-py`
- `@atm-community/language-cs`
- `@atm-community/language-go`

### 6.3 README 措辭規範

alpha 期：
> ATM is currently JS/TS only at the runtime level. The Atomic Spec is language-agnostic; cross-language LanguageAdapter SPI will open at v0.2.

beta 期：
> ATM officially supports JS/TS. Python LanguageAdapter is in POC stage and feature-complete at v1.x.

1.0+：
> ATM officially supports JS/TS and Python. Other languages via community LanguageAdapters.

**禁用措辭**（alpha 期間 README）：
- ❌ "multi-language ready"
- ❌ "polyglot"
- ❌ "supports any language"

---

## 7. Atomic Spec Schema 演化

### 7.1 schemaVersion 必填
所有 atom spec 必含：
```json
{
  "atmSchemaVersion": "v1",
  "id": "ATM-3-0001",
  "name": "normalizeCssColor",
  ...
}
```

### 7.2 Schema major bump
- v1 → v2 視為 ATM major bump
- 必伴隨 `atm migrate --schema v1-to-v2` 自動轉換腳本
- 至少保留 v1 schema 1 個 minor 版本（給 adopter 遷移）

### 7.3 Schema minor bump
- 純 additive：加新 optional 欄位
- 不要求既有 atom 立即升級
- CI 不擋舊 schema atom（直到 schema major bump）

### 7.4 Schema PR 必含
- migration guide
- 自動轉換腳本（除非純 additive）
- ≥10 個既有 atom 的轉換驗證測試

### 7.5 Default Governance / ATMChart Schema 演化

ATMChart 是 default governance rules、schema、AtomicCharter invariants 的 agent-readable 摘要，不等同於 Atomic Spec schema，但必須遵守同級別的演化紀律：

- **Chart patch**：文字修正、摘要排序、非語意輸出格式修補；不得改變 guard 判斷或 required 欄位。
- **Chart minor**：新增 optional guard、optional summary 欄位、optional manifest metadata；舊 framework / template 可忽略新欄位且仍可通過 verify。
- **Chart major**：移除欄位、改變 required semantics、改變 guard block 結果、要求新的 InstallManifest 欄位，或讓舊 entry template 無法安全導路。

Chart major 不必自動等於 Framework major；若同一個 Framework minor 同時支援舊 chart 與新 chart，可透過 compatibility matrix 與 migration hint 過渡。只有當 Framework 移除舊 chart 支援、CLI 子命令不相容、或 manifest schema 無法向後讀取時，才必須升 Framework major。

---

## 8. 釋出節奏與通告

### 8.1 釋出頻率
| Tier | 頻率 |
|---|---|
| alpha | 每週 patch、每 2 週 minor |
| beta | 每 2 週 patch、每月 minor |
| stable | 每月 patch、每季 minor、每年 major |
| lts | 每季 patch、每年 minor、不出 major（直到 EOL） |

### 8.2 釋出通告渠道
- GitHub Releases（必）
- npm publish（必）
- CHANGELOG.md（必）
- README badges 更新（自動）
- Discussions「Releases」categories（必）
- Twitter/X / Mastodon（規劃 v0.5+）

### 8.3 LTS 政策（v2.0+ 規劃）
- 每年第 4 季標一個 minor 為 LTS（如 2.4.0-lts）
- LTS 維護期：18 個月 patch / security
- 當 LTS EOL 通告至少提前 6 個月

### 8.4 Onboarding release gate

從首次 npm publish 起，release workflow 必須在 publish 前驗證：

1. git tag 與所有公開 package version 已同步。
2. `compatibility-matrix.json` 含目前 ATMChart version 與 template version。
3. `atm-chart verify --version-check`、`doctor --json`、`welcome --dry-run --json` 可輸出版本相容狀態。
4. 若 chart 或 template 為 deprecated，release notes 必須附 migration hint。
5. 若 chart 或 template 為 unsupported，release workflow 必須 block。
6. 舊 chart / old manifest fixture 必須通過 smoke：supported 舊版本可讀、deprecated 舊版本可診斷、unsupported 舊版本不會被自動覆寫。
7. rollback fixture 必須證明 migration apply 後能還原上一份 chart / manifest / entry files snapshot。

---

## 9. 政策審查節奏

- 每季審查本政策一次
- Tier 切換條件變動需 RFC 流程（discussions issue）
- Compatibility matrix 結構變動需 major bump

---

## 10. 引用與相依政策

- 本政策引用 [Semantic Versioning 2.0.0](https://semver.org)
- Deprecation cycle 參考 [Node.js Long Term Support](https://github.com/nodejs/Release)
- Multi-language SPI 設計借鑒 [LSP / DAP](https://microsoft.github.io/language-server-protocol/) 模式

---

## 11. 後續強化（TASK-APO-0013 ~ 0024）

本政策骨架已完整，但開源框架實務上仍需補下列子計畫；每項對應一張任務卡，落於 `docs/ai_atomic_framework/agent-pack-onboarding/tasks/` 下：

| 任務 | 補強面向 | 主要落點 |
|---|---|---|
| TASK-APO-0013 | Migration tooling contract（codemod 守則、多階段遷移鏈、fixture 庫、migration guide 模板） | §5 / 新 §5.2 |
| TASK-APO-0014 | Release trust chain（npm `--provenance`、SBOM、`integrity.json`、CLI 啟動驗 bundled matrix sha256） | 新 §4.6 |
| TASK-APO-0015 | Release incident response（`known-bad-versions.json`、yank SOP、CLI 內建黑名單） | 新 §4.7 |
| TASK-APO-0016 | Version skew matrix CI（CLI × Plugin SDK × Adapter 組合測試） | §4 / §6 |
| TASK-APO-0017 | Long-tail user safeguards（append-only matrix、時間窗 unsupported、offline first-touch、downgrade detection） | §4.3 / §4.5 |
| TASK-APO-0018 | Security policy（`SECURITY.md`、advisory branch、dependency scanning gate） | 新 §3.6 |
| TASK-APO-0019 | Dist-tag 政策（`latest` / `next` / `beta` / `lts` 對應 + pre-release 規則 + `create-atm` 預設 tag） | 新 §8.5 |
| TASK-APO-0020 | Telemetry + adopter sentinel + deprecation dashboard（opt-in only） | 新 §8.6 / `docs/DEPRECATIONS.md` |
| TASK-APO-0021 | Meta-schema versioning（invariants / `InstallManifest` / ATMChart frontmatter 各自 schemaVersion） | §7 |
| TASK-APO-0022 | Bridge minor（major bump 前一個 minor 同時讀寫新舊 schema）+ `@experimental` API 通道 | §2 / §7 |
| TASK-APO-0023 | Policy self-versioning（本文件加 `policy_version` 並對齊 `framework_version_range`）+ 自動產生矩陣 PR | §9 |
| TASK-APO-0024 | Time+minor 雙保險 deprecation（alpha ≥30d / beta ≥90d / stable ≥180d / lts ≥365d）+ staged rollout `--canary` | §3.1 / §4.5 |

本節僅作為「政策補強路線圖」，實際章節落點與規則由各任務卡實作時回寫；任何節落實前，CLI / validator / release workflow 仍以本文件目前正文與上游 `compatibility-matrix.json` 為準。
