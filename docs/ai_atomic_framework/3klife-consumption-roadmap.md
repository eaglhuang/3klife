<!-- doc_id: doc_other_0033 -->
# 3KLife 長期消費 ATM 路線圖（Consumption Roadmap）

> 補丁來源：`AI原子框架開發計畫書.md` v0.2.1 補強 §B6
> 文件位置：`docs/ai_atomic_framework/3klife-consumption-roadmap.md`
> 上游版本對應：`upstream-versioning-policy.md`

---

## 為什麼需要本路線圖

`open-source-extraction-plan.md` §5 只寫「早期 Git dep 或 npm link」一句。但實際上 3KLife 從 ATM Phase B 上游開發開始，到 ATM 1.0 stable 後的依賴模式有 **4 個演進階段**，每階段的消費形式 / 升級節奏 / 回退策略都不同。本文件定義這 4 個 stage 的具體行為。

---

## 演進總覽

| Stage | ATM 版本 | 時間點（相對） | 消費形式 | 升級節奏 | 回退策略 |
|---|---|---|---|---|---|
| **S1 dev** | 0.0.x pre-alpha | ATM Phase B 中 | git submodule + symlink | 每次 ATM commit pull | git checkout 前一 commit |
| **S2 alpha** | 0.1.0 – 0.4.x | Phase B 完成後 | `npm link` 或 `git+ssh:` dep | 每週 sync | npm uninstall + 復原 lockfile |
| **S3 beta** | 0.5.0 – 0.9.x | adapter / case study 落地 | `npm i atm-core@^0.5` | 每兩週 patch、每月 minor | npm rollback to last lockfile |
| **S4 stable** | ≥1.0.0 | 1.0 釋出後 | `npm i atm-core@^1` pin minor | 每季 minor、每年 major | semver-major 必跑完整 regression matrix |

---

## S1 — Dev Stage（git submodule）

### 適用條件
- ATM upstream 處於 Phase B0–B3（self-bootstrap 期）
- 上游 API 尚未穩定，尚未有 npm 釋出
- 3KLife 尚未真實依賴 ATM 行為（並行期）

### 消費形式
```bash
# 在 3KLife 根目錄
git submodule add https://github.com/eaglhuang/AI-Atomic-Framework.git external/atm-upstream
# 或者僅 clone 為 sibling repo，透過 symlink 或 npm link
```

### 升級行為
- 每次 ATM upstream 有 commit，3KLife 端 `git submodule update --remote`
- 不對 ATM 提任何 PR（並行期 3KLife 不貢獻上游）
- 3KLife 端 _不真實 require_ ATM code，只 review

### 回退
```bash
git submodule update -- external/atm-upstream  # 回到 .gitmodules 記錄的 sha
```

### 結束條件
- ATM 0.1.0 alpha 釋出（npm publish）
- 通過 self-host alpha gate

---

## S2 — Alpha Stage（npm link 或 git dep）

### 適用條件
- ATM 0.1.0 ~ 0.4.x 已釋出
- API 仍可能 break，但有版本號可固定
- 3KLife 開始實作 adapter（Phase C 起）

### 消費形式
**選項 A：本地開發**（推薦）
```bash
# upstream repo
cd ../AI-Atomic-Framework
pnpm link --global

# 3KLife
cd ../3KLife
npm link atm-core atm-cli @atm/plugin-sdk
```

**選項 B：直連 git**（CI / 多人協作）
```jsonc
// 3KLife package.json
{
  "dependencies": {
    "atm-core": "git+https://github.com/eaglhuang/AI-Atomic-Framework.git#v0.1.0"
  }
}
```

### 升級節奏
- 每週固定一日（如週一）跑 `npm update atm-core`
- 升級後跑：
  ```bash
  node tools_node/test/dom-to-ui-self-test.js --group html-to-ucuf-active-contract
  node tools_node/compute-gate.js --profile atm
  ```
- 任一退轉 → 回退並開 issue 至上游

### 回退
```bash
git checkout package.json package-lock.json  # 復原依賴版本
npm i                                          # 重新安裝
```

### 結束條件
- ATM 0.5.0 beta 釋出（API 進入 minor-stable）

---

## S3 — Beta Stage（npm dep + caret range）

### 適用條件
- ATM 0.5.0 ~ 0.9.x 已釋出
- minor 之間 API stable，major 可 break（但有 deprecation cycle）
- 3KLife 已注入第一批 atom（D2 stage 完成）

### 消費形式
```jsonc
// 3KLife package.json
{
  "dependencies": {
    "atm-core": "^0.5.0",
    "atm-cli": "^0.5.0",
    "@atm/plugin-rule-guard": "^0.5.0",
    "@atm/plugin-encoding": "^0.5.0",
    "@atm/plugin-context-budget": "^0.5.0",
    "@atm/adapter-local-fs-git": "^0.5.0"
  }
}
```

### 升級節奏
- 每兩週升 patch（自動透過 dependabot）
- 每月升 minor（手動 + 跑完整 regression matrix）
- breaking 升級必走 [`upstream-versioning-policy.md`](upstream-versioning-policy.md) §Deprecation cycle

### Compatibility check
升級前必跑：
```bash
# upstream 公布的相容矩陣
node tools_node/adapters/atm-3klife/compat-check.js --upstream-version 0.6.0
# 期望輸出: { "compatible": true, "deprecations": [], "breaking": [] }
```

### 回退
```bash
npm rollback                       # 若有 npm rollback plugin
# 或者
git checkout package-lock.json
npm i
```

### 結束條件
- ATM 1.0.0 stable 釋出

---

## S4 — Stable Stage（pin minor + 季度升級）

### 適用條件
- ATM ≥1.0.0
- 完整 SemVer 2.0
- 3KLife 已完成 D3 stage（既有治理工具 adapter 化）

### 消費形式
```jsonc
// 3KLife package.json — pin minor 範圍，避免意外 minor 升級
{
  "dependencies": {
    "atm-core": "~1.2.0",          // 只接受 1.2.x patch
    "atm-cli": "~1.2.0",
    "@atm/plugin-*": "~1.2.0",
    "@atm/adapter-local-fs-git": "~1.2.0"
  }
}
```

### 升級節奏
| 升級類型 | 節奏 | 必須執行 |
|---|---|---|
| patch (1.2.0 → 1.2.1) | 每週自動（dependabot） | 跑 ATM profile compute-gate |
| minor (1.2.x → 1.3.0) | 每季手動 | 跑完整 regression matrix + compat-check |
| major (1.x → 2.0) | 每年規劃 | 完整 H2U-REFACTOR 卡 + ATM-MIGRATION 卡 + 全 regression + 灰度 1 週 |

### 灰度策略（major 升級）
1. 在 dev branch 升級，跑 1 週 self-test + compute-gate atm profile
2. 全 atom hash-lock 重簽
3. 切到 staging branch，跑 capture-ui-screens 全套 fixtures
4. 任一退轉 → rollback；全綠 → 升 main

### 回退
```bash
# 始終透過 lockfile 回退
git revert <upgrade-commit>
npm i
```

---

## Breaking Change 接受窗口

依 `upstream-versioning-policy.md` §Deprecation cycle：

```
T = 0  : ATM upstream 標 @deprecated（最早 minor 釋出）
T = 1m : 連續 1 個 minor 後仍保留舊 API
T = 2m : 連續 2 個 minor 後仍保留舊 API
T = 3m : 第 3 個 minor 移除舊 API
```

3KLife adapter 升級窗口：
- T=0 → T=1m：忽略（仍可用舊 API）
- T=1m → T=2m：開 ATM-MIGRATION-* 卡，開始遷移
- T=2m → T=3m：必須完成遷移，否則第 3 個 minor 升級後會 break

---

## 跨 stage 通則

### 通則 1：lockfile 是真相
- 永遠透過 `package-lock.json` 回退，不手改版本號
- CI 必跑 `npm ci`（不是 `npm i`）

### 通則 2：升級前必跑 compat-check
```bash
node tools_node/adapters/atm-3klife/compat-check.js --upstream-version <new>
```
退轉者立即 rollback，不在升級內 fix。

### 通則 3：升級後必跑 dual-test
```bash
# 行為等價測試
node tools_node/test/dom-to-ui-self-test.js --group html-to-ucuf-active-contract
node tools_node/test/dom-to-ui-self-test.js --group html-to-ucuf-fidelity-contract

# ATM 治理 gate
node tools_node/compute-gate.js --profile atm
```

### 通則 4：升級不在 freeze period 進行
- ATM-3 / ATM-6 任務卡進行期間（[`3klife-coexistence-plan.md`](3klife-coexistence-plan.md) §1 freeze list 生效），不執行 ATM upstream 升級
- 例外：security patch（CVE）— 走 emergency upgrade 流程

---

## Stage 進入條件總覽

| Stage | 進入條件（必須全部滿足） |
|---|---|
| S1 | ATM upstream repo 已建立；不需 ATM 釋出 |
| S2 | ATM 0.1.0 alpha 釋出 + Self-Hosting Alpha Gate 全綠 |
| S3 | ATM 0.5.0 beta 釋出 + 3KLife adapter 全部就位（13 adapter）+ 第一批 atom 注入完成 |
| S4 | ATM 1.0.0 stable 釋出 + 3KLife 既有治理工具 adapter 化完成（D3 stage 結束）|

---

## 異常情境處理

| 異常 | 處理 |
|---|---|
| 升級後行為退轉 | rollback + 開 issue 至上游；3KLife 端不 hot-fix 上游 bug |
| 上游長期不維護（>3 個月無 release） | 評估 fork 上游或暫停升級；不在 3KLife 內 patch |
| 3KLife 需要的功能上游不接受 | 留在 `tools_node/adapters/atm-3klife/` 作為 plugin / adapter；不 fork core |
| Adapter API 變動破壞 3KLife 集成 | 升 ATM major；走 ATM-MIGRATION-* 卡 |
| 上游 dep 安全漏洞（CVE） | 立即升 patch；繞過正常節奏 |
