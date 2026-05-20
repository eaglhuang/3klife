# Upstream Versioning & Lifecycle Policy — Upstream Versioning Core

> 這是 `upstream-versioning-policy.md` 的「Upstream Versioning Core」分片。完整索引見 `docs/ai_atomic_framework/upstream-versioning-policy.md`。

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
4. [UPGRADE_PROPOSAL_PUBLIC_RULES.md](../release_version_flow/UPGRADE_PROPOSAL_PUBLIC_RULES.md)
5. [RELEASE_CHECKLIST.md](../release_version_flow/RELEASE_CHECKLIST.md)
6. [CHANGELOG.md](/C:/Users/User/3KLife/CHANGELOG.md)

政策更新流程：先更新 canonical docs，再視需要回補本背景文件，避免雙重真相。

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

格式：
```json
{
  "schemaVersion": "1.0",
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

### 4.3 維護節奏
- 每次 minor 釋出時更新
- 上游 release PR 必含 compatibility-matrix.json diff
- 移除過期版本（>4 個 minor）

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
