<!-- doc_id: doc_other_0230 -->
<!--
title: ATM 技術債重構計畫書
author: claude_code_opus4.7
revised_by:
  - user-report-baseline
created: 2026-05-18
revised: 2026-05-18
status: proposed
supersedes: use-the-engineering-tech-debt-skill-gentle-tiger（臨時 plan，過於通用）
related:
  - C:/Users/User/AI-Atomic-Framework/README.md
  - C:/Users/User/AI-Atomic-Framework/eslint.config.mjs
  - C:/Users/User/AI-Atomic-Framework/tsconfig.json
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/upgrade.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/doctor.ts
  - C:/Users/User/AI-Atomic-Framework/scripts/adopter-sentinel.ts
  - C:/Users/User/3KLife/docs/ai_atomic_framework/agent-pack-onboarding/3KLife ATM 採用三角策略規劃書.md
  - C:/Users/User/3KLife/docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md
-->

# ATM 技術債重構計畫書

## 0. 核心結論

本計畫的對象是 `AI-Atomic-Framework`（ATM upstream），不是 3KLife，也不是 npc-brain。它與「3KLife ATM 採用三角策略規劃書」是**互補上下游**：

```text
本計畫（ATM Tech Debt Refactor） -> 修 upstream 框架本身
三角策略規劃書（Triangle Strategy） -> 用 adopter 驗收 upstream
```

兩者的執行 cadence 應該交錯：upstream 修一輪 → adopter 驗收一輪 → 找出新 bug → upstream 再修一輪。

核心判斷如下：

1. **一般 Tech-Debt 框架不夠用**。原始 `tech-debt skill` 給的優先序（型別、ESLint、巨型檔案）是泛用 TypeScript 評估，**不會考慮 ATM 的治理契約**（adopter-neutral、root-drop parity、self-host、version governance、deterministic guards）。
2. **ATM upstream 自身的「自我治理入口」尚未閉環**。在 upstream checkout 跑 `node atm.mjs next --json` 回傳 `needs-bootstrap`，代表 ATM 連自己都還沒採用自己。這比一般 lint 更先優先處理。
3. **巨型檔案實際比原審計報告更多**。確認共有 10 個檔案超過 500 行（不是 5 個），最大為 `upgrade.ts` 1306 行（不是 1135）。
4. **「測試完全空白」是錯的**。`tests/` 已有 35 個 `.test.ts/.test.js`，問題應重新表述為「**測試層級混雜、validator-heavy、缺快速單元測試分層**」。
5. **「Pre-commit hooks 缺失」需要 ATM 化**。不能只是裝 husky 跑 lint，應做成 ATM evidence-style enforcement（`atm doctor`、ATMChart freshness、agent-pack freshness、git evidence）。
6. **`frameworkVersion = '0.0.0'` 不是小事**。ATM 有 ATMChart、known-bad-versions、version skew、release trust chain 等版本治理面；版本寫死會讓所有版本相關 telemetry 失真。
7. **缺「release parity」**：source 修好不等於 `release/atm-root-drop`、`release/atm-onefile`、npm `create-atm` 都安全。每個 refactor PR 都需要 release smoke。

本計畫的精神是：**先確保 ATM 治理契約不破，再優化一般工程品質**。

---

## 0.1 不可破壞契約（Invariants）

本計畫所有 milestone 與 task 都必須遵守以下硬契約，**任何 PR 若違反，必須拒絕合併或回退**：

### I1：Public CLI surface 穩定
- `node atm.mjs <command> --json` 的輸出 schema 不得在 patch / minor 內 breaking change。
- 命令名稱、`--json` 欄位名稱、exit code 語意不得變更。

### I2：Schema 版本契約
- `schemaVersion` 欄位（如 `atm.config.v0.1`、`atm.evidence.v0.1`）不得在 patch 內遞增；minor 必須有 migration tooling。
- AJV cache 重構不得改變驗證結果（pass/fail 行為），只能改快取/效能。

### I3：Release wire format
- `release/atm-root-drop/` 目錄結構與 entry contract 不得變動。
- `release/atm-onefile/` 的 bootstrap shape 不得變動。
- npm `create-atm` 的 install layout 不得變動。

### I4：Adopter-neutral 保證
- 重構過程不得寫入 `3KLife` / `npc-brain` / 任何私有 repo 名稱進 framework public surface。
- `neutrality scan`（validator）必須在 CI 持續通過。

### I5：Hash-locked manifests
- `.atm/agent-pack/*.manifest.json` 的 hash 算法不得變動（含字串正規化、行尾、編碼處理）。
- `installManifest` 的格式不得 breaking change。

### I6：Long-tail compatibility
- 已 published 的 schema 不得在無 migration 與 deprecation window 下移除欄位。
- `docs/LONGTAIL_USERS.md` 列舉的相容承諾不得無故撤銷。

任何 Mx 任務卡若會碰到 Invariant 範圍，**必須在 task header 明確標示 `invariant_risk: I{n}` 與緩解策略**，由 maintainer 二次審核。

---

## 0.2 與三角策略規劃書的關係

| 視角 | 本計畫（ATM Tech Debt Refactor） | 三角策略規劃書（Triangle Strategy） |
|------|-------------------------------|----------------------------------|
| 對象 repo | AI-Atomic-Framework | npc-brain + 3KLife |
| 角色 | upstream 工程品質與治理閉環 | adopter 驗收與 evidence 回流 |
| 主要動作 | 拆檔、型別、邊界、harness、release parity | dry-run、evidence、sentinel |
| 主要產物 | typed CLI、validator harness、release smoke | evidence、adopter sentinel、handoff |
| 啟動順序 | M0（self-governance loop）必須先 | 三角策略 M1（lab dry run）才能跑 |

**啟動約束：本計畫 M0 完成前，三角策略 M1 dry-run 結果不可信**——因為 `atm doctor` 自己的診斷能力都還沒閉環，npc-brain 跑 doctor 失敗時很難判斷是 ATM bug 還是 adopter 環境問題。

---

## 1. ATM 契合度判斷

### 1.1 符合 ATM 精神的部分（從原審計繼承）

| 項目 | 為何符合 |
|------|--------|
| 模組邊界修正（CLI runtime 不 import scripts/） | 對應 core / plugin / adapter 分層 |
| 驗證腳本 harness 統一 | 對應 deterministic guard + evidence-first |
| 「先警告再嚴格」的 ESLint 策略 | 對應 alpha 階段漸進治理 |
| 「先測試再拆分」 | 對應 lock / scope / evidence 的保守演進 |
| any 預算化（不一次清零） | 對應 ATM 的 budget-aware governance |

### 1.2 需要 ATM 化的部分（原審計不足）

| 原審計建議 | ATM 化補強 |
|-----------|----------|
| 裝 husky 跑 lint/typecheck | ATM 已有 host governance hook example，應 opt-in host-neutral，並記錄 staged-tree evidence（不能變成所有 adopter 的硬依賴） |
| 補 README、補文件 | 開源 ATM 文件優先序是：adopter-neutral / root-drop / self-host alpha / version / migration / security，不是 package README 行數 |
| `frameworkVersion = '0.0.0'` 是小問題 | 不是小問題。ATM 有 ATMChart、known-bad、version skew、release trust 等版本治理面 |
| 用 Vitest 加單元測試 | 先評估 Node 24 內建 `node:test`（zero runtime dependency）；Vitest 可用但不應破壞 root-drop / zero-dep 心智 |
| 沒提 release artifact parity | 必須每次 CLI/core 重構都驗證 build / root-drop / onefile / create-atm / version skew / known-bad / release trust |
| 沒提 ATM 自我治理閉環 | M0 必須先處理：upstream checkout 跑 `atm next --json` 不應回 `needs-bootstrap` 還無解釋 |

### 1.3 額外缺失（本版新增）

- **缺 `AGENTS.md` 或等價 agent contract 文件**：AI-Atomic-Framework 沒有給 agent 看的「進來請先讀這個」共識文件，導致每個 agent 進來都得自己摸索。
- **缺 `docs/keep.summary.md`**：原審計訊息提到 AGENTS 指定 keep summary 但檔案不存在，這是治理共識文件落差。
- **缺 dependency boundary validator 的 deny list**：現有 `validate-module-boundaries.ts` 只擋 `.mjs`，沒擋 `packages/*/src` 對 `scripts/` 的 import。
- **缺 context budget 自我約束**：ATM 已有 context budget policy schema，但 upstream 自己沒套用。

---

## 2. 修訂後優先序（含 file path / 工期 / Mx / Task-card-id 預定）

格式：`P{n}. {標題} [Mx | 工期 PD | TASK-ATD-{NNNN}]`

PD = person-days；NNNN 為任務卡編號預定值，實際以 `tasks/` 目錄分配為準。

### M0：治理入口閉環（必須先做）

| P | 項目 | 工期 | 任務卡 | 關鍵檔案 |
|---|------|------|-------|---------|
| P0 | 補 `AGENTS.md` 與 `docs/keep.summary.md` 共識文件 | 0.5 PD | TASK-ATD-0001 | `AGENTS.md`（新）、`docs/keep.summary.md`（新） |
| P0 | 修 `atm next --json` 對 upstream checkout 的行為（要嘛 self-bootstrap 完成、要嘛回明確 unsupported 狀態） | 1 PD | TASK-ATD-0002 | `packages/cli/src/commands/next.ts`、`bootstrap-entry.ts` |
| P0 | upstream 自我採用 bootstrap：在 upstream repo 跑 official onboarding，產生可驗證 `.atm/runtime/` lineage | 1 PD | TASK-ATD-0003 | `.atm/runtime/welcome.lineage.json`（新）、`packages/cli/src/commands/welcome.ts` |

**M0 退出條件：**
- `node atm.mjs next --json` 在 upstream checkout 回 `ok: true` 與一個明確 next action
- `node atm.mjs doctor --json` 回 `ATM_DOCTOR_OK` 或只剩 known-limitation
- `AGENTS.md` 與 `docs/keep.summary.md` 存在且互相對齊

### M1：快速致勝（邊界 + ESLint baseline + CLI 型別 + version registry）

| P | 項目 | 工期 | 任務卡 | 關鍵檔案 |
|---|------|------|-------|---------|
| P1 | 模組邊界硬化（CLI runtime 不 import scripts/） | 0.5 PD | TASK-ATD-0004 | `packages/cli/src/commands/doctor.ts:3`、`packages/cli/src/commands/self-host-alpha.ts` |
| P1 | 擴充 `validate-module-boundaries.ts` 加 deny rule | 0.5 PD | TASK-ATD-0005 | `scripts/validate-module-boundaries.ts` |
| P1 | ESLint baseline：`no-explicit-any: warn`、`no-unused-vars: error`、`max-lines: warn`、`no-empty-catch`、`no-restricted-imports` | 1 PD | TASK-ATD-0006 | `eslint.config.mjs` |
| P1 | CLI 公共型別：`CliMessage` / `CommandResult` / `CommandHandler` / typed `parseArgsForCommand` | 3 PD | TASK-ATD-0007 | `packages/cli/src/commands/shared.ts`、`packages/cli/src/atm.ts` |
| P1 | 版本來源從 `package.json` 讀，不寫死 `0.0.0` | 1 PD | TASK-ATD-0008 | `packages/cli/src/commands/shared.ts:5`（含 release/onefile fallback） |
| P1 | 環境變數 registry：集中宣告 `ATM_*` / `AGENT_IDENTITY` / `CODEX_HOME` | 1 PD | TASK-ATD-0009 | `packages/cli/src/config/env-registry.ts`（新） |
| P1 | Pre-commit hook ATM-style：跑 `atm doctor` / typecheck / lint，可 opt-out | 0.5 PD | TASK-ATD-0010 | `.husky/pre-commit`（新）、文件說明 opt-out 方式 |

**M1 退出條件：**
- `npm run lint` 顯示 warning 但不因既有 `any` 全面阻塞
- `npm run typecheck` 通過
- `npm run validate:module-boundaries` 能抓到 package runtime import `scripts/` 並 fail
- `node atm.mjs --version` 回正確版本（不是 `0.0.0`）

### M2：治理驗證底座（harness + AJV cache + 錯誤處理 + 測試分層）

| P | 項目 | 工期 | 任務卡 | 關鍵檔案 |
|---|------|------|-------|---------|
| P2 | Validator harness 批次遷移（50 個 validator 用 `createValidator()`） | 2 PD | TASK-ATD-0011 | `scripts/lib/validator-harness.ts`、`scripts/validate-*.ts` |
| P2 | 共用 AJV factory/cache（6 個 source + scripts 端） | 0.5 PD | TASK-ATD-0012 | `packages/core/src/validation/ajv-cache.ts`（新）、6 處呼叫點 |
| P2 | 錯誤處理政策：`CliError` + typed error code + `EXPECTED:` 註解規範 | 2 PD | TASK-ATD-0013 | `packages/cli/src/commands/shared.ts`（CliError）、所有 catch 點 |
| P2 | 測試分層：unit / validator / release smoke / self-host alpha | 3 PD | TASK-ATD-0014 | `tests/unit/`（新）、`vitest.config.ts` 或 `node:test` script |
| P2 | 第一批單元測試：`urn`、`map-id-allocator`、`shared.ts` | 2 PD | TASK-ATD-0015 | `tests/unit/registry/urn.test.ts` 等 |

**M2 退出條件：**
- `npm run validate:quick` 在 30 秒內跑完
- `npm run validate:standard` 穩定
- 50 個 validator 至少 40 個已遷移 harness
- 單元測試覆蓋率 ≥ 20%（core/src）

### M3：架構拆分（巨型檔案 + any 預算）

| P | 項目 | 工期 | 任務卡 | 關鍵檔案 |
|---|------|------|-------|---------|
| P3 | `upgrade.ts`（1306 行）拆分為 `upgrade/` 子目錄 | 5 PD | TASK-ATD-0016 | `packages/cli/src/commands/upgrade.ts` |
| P3 | `plugin-governance-local/index.ts`（1069 行）拆分 | 4 PD | TASK-ATD-0017 | `packages/plugin-governance-local/src/index.ts` |
| P3 | `propose.ts`（1018 行）拆分 | 3 PD | TASK-ATD-0018 | `packages/core/src/upgrade/propose.ts` |
| P3 | `atm-chart.ts`（885 行）拆分 | 3 PD | TASK-ATD-0019 | `packages/cli/src/commands/atm-chart.ts` |
| P3 | `command-specs.ts`（673 行）拆分 | 2 PD | TASK-ATD-0020 | `packages/cli/src/commands/command-specs.ts` |
| P3 | `integrations-core/index.ts`（668 行）拆分 | 2 PD | TASK-ATD-0021 | `packages/integrations-core/src/index.ts` |
| P3 | `map-generator.ts`（663 行）拆分 | 2 PD | TASK-ATD-0022 | `packages/core/src/manager/map-generator.ts` |
| P3 | any debt budget：per-package 預算表，core 先降 | 8 PD（分散） | TASK-ATD-0023 | `eslint.config.mjs` + 多個 source |
| P3 | 開源文件補強：環境變數、troubleshooting、adapter examples | 2 PD | TASK-ATD-0024 | `docs/environment-variables.md`（新）、`docs/troubleshooting.md`（新） |

**M3 退出條件：**
- 沒有超過 500 行的 source/scripts 檔案
- `core/src/` 的 `any` 數量降 50%
- `npm run test`、`npm run validate:full`、release wrapper smoke 全部通過

### M4：開源採用者信任（release parity + 腳本去重）

| P | 項目 | 工期 | 任務卡 | 關鍵檔案 |
|---|------|------|-------|---------|
| P4 | Release parity CI：每個 PR 都驗證 build / root-drop / onefile / create-atm | 2 PD | TASK-ATD-0025 | `.github/workflows/release-parity.yml`（新） |
| P4 | Version skew / known-bad / release trust 持續綠燈 | 1 PD | TASK-ATD-0026 | 既有 workflows |
| P4 | 28 個重複腳本（PS1/SH）改 codegen 或 Node thin launcher | 3 PD | TASK-ATD-0027 | `templates/root-drop/.atm/scripts/`、`release/atm-root-drop/templates/` |
| P4 | Adopter sentinel synthetic Python fixture（與三角策略 M5 共用） | 2 PD | TASK-ATD-0028 | `scripts/adopter-sentinel.ts`、`fixtures/synthetic-python-adopter/`（新） |

**M4 退出條件：**
- Release smoke 每 PR 自動跑
- 28 個重複腳本減為 1 source + codegen
- synthetic Python fixture 可在無 secret 的 PR 上通過

### M5：長期可重現性（E2E + 容器化 + 多 agent）

| P | 項目 | 工期 | 任務卡 | 關鍵檔案 |
|---|------|------|-------|---------|
| P5 | 正式化 adopter sentinel：external npc-brain profile | 3 PD | TASK-ATD-0029 | `scripts/adopter-sentinel.ts` |
| P5 | Multi-agent confidence report | 2 PD | TASK-ATD-0030 | `scripts/multi-agent-confidence.ts`（新） |
| P5 | Docker / devcontainer（CI/release reproducibility，不作核心依賴） | 3 PD | TASK-ATD-0031 | `Dockerfile`（新）、`.devcontainer/`（新） |
| P5 | Root-drop sandbox E2E | 3 PD | TASK-ATD-0032 | `tests/e2e/root-drop-sandbox.test.ts`（新） |

**M5 退出條件：**
- CI 可重現完整 release smoke
- adopter sentinel external profile 連續多輪通過
- Multi-agent confidence report 在每次 release 產出

---

## 3. 依賴關係圖

```text
[M0 自我治理閉環]                      <-- 必須先完成
        |
        +--> [M1.邊界修正] --> [M1.ESLint baseline] --> [M1.CLI 型別]
        |              \                                       |
        |               +--> [M1.版本 registry] --> [M1.env registry]
        |                                                      |
        +--> [M2.測試分層] -----------+--> [M3.大檔拆分]
                                       |
        [M2.validator harness] --------+
        [M2.AJV cache]
        [M2.錯誤處理政策]
                                       |
                                       v
                              [M4.release parity]
                                       |
                                       v
                              [M5.E2E / 容器化 / multi-agent]

跨計畫銜接：
[本計畫 M0 完成] -> [三角策略 M1 dry-run 可信]
[本計畫 M4 release parity 穩定] -> [三角策略 M5 sentinel 整合]
```

---

## 4. 任務卡拆分策略（本目錄之用）

本目錄將收錄上述 32 張任務卡（TASK-ATD-0001 ~ TASK-ATD-0032）。

### 4.1 命名規則

```text
TASK-ATD-{NNNN}-{slug}.task.md
```

- `ATD` = ATM Tech Debt
- `NNNN` = 從 0001 起序號（與 APO/TDR 等其他系列不衝突）
- `slug` = 英文短描述，dash 分隔
- 副檔名固定 `.task.md`

### 4.2 任務卡必填欄位

對齊既有 `TASK-APO-*` 格式：

```yaml
---
doc_id: doc_other_0230        # 由 doc-id-registry.js 分配
task_id: TASK-ATD-XXXX
title: ...
milestone: M0|M1|M2|M3|M4|M5
status: open|in-progress|done|blocked
blocked_by: [TASK-ATD-XXXX]
owner: atm-core
related_plan: docs/ai_atomic_framework/atm-tech-debt-refactor/ATM 技術債重構計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
invariant_risk: I1|I2|I3|I4|I5|I6  # 若觸及 §0.1 invariant
allowed_files: [...]
forbidden_files: [...]
non_goals: [...]
created_at: ISO
created_by_agent: <agent identity>
---
```

### 4.3 索引維護

`tasks/README.md` 必須維護索引表（同 `agent-pack-onboarding/tasks/README.md` 格式）：

| Task ID | 標題 | 里程碑 | 狀態 | 阻擋者 | Invariant Risk |
|---------|------|-------|------|--------|---------------|
| TASK-ATD-0001 | 補 AGENTS.md 與 keep summary | M0 | open | — | — |
| TASK-ATD-0002 | 修 atm next 對 upstream 行為 | M0 | open | 0001 | I1 |
| ... | | | | | |

### 4.4 拆卡執行順序建議

1. 先把 M0 三張卡（0001-0003）開出來，因為它是其他卡的前置。
2. M1 七張卡（0004-0010）可平行開卡，但 0007（CLI 型別）會被 0006（ESLint）影響，建議 0006 先做。
3. M2~M5 卡可延後到對應 milestone 啟動前再拆。

---

## 5. Test Plan（分層 + per-milestone gate）

### 5.1 基線（每 PR 必跑）
- `npm run typecheck`
- `npm run lint`
- `npm test`

### 5.2 治理（每 PR 必跑，分 quick/standard/full）
- `npm run validate:quick`（30 秒級）
- `npm run validate:standard`（2 分鐘級）
- `npm run validate:full`（5 分鐘級，weekly）

### 5.3 ATM 自我驗證（M0 必過）
- `node atm.mjs next --json`
- `node atm.mjs doctor --json`
- `node atm.mjs self-host-alpha --verify --json`

### 5.4 Release parity（M4 必過）
- `npm run build`
- `node release/atm-root-drop/atm.mjs next --json`
- `node release/atm-onefile/atm.mjs next --json`

### 5.5 Invariant 守護（每 PR）
- `node atm.mjs verify --neutrality --json`
- `npm run validate:version-skew`
- `npm run validate:known-bad`
- `npm run validate:release-trust`

### 5.6 邊界驗證
- 新增 negative fixture：證明 package runtime import `scripts/` 會被擋
- 但 `package.json` script 呼叫 validator 仍允許

---

## 6. 風險登記簿

### R1：M0 卡死，後續全部延後
**機率：** 中  
**衝擊：** 高  
**緣由：** `atm next --json` 在 upstream 回 `needs-bootstrap` 可能是因為 ATM 對 self-host 的支援不完整，而不是 trivially 加一行就能修。  
**緩解：**
- 給 M0 一個 hard timebox（5 PD）。
- 若 5 PD 內無法閉環，先回傳 `unsupported-upstream-self-host` 明確狀態，並開 follow-up issue。
- 不讓 M0 完美主義拖延 M1。

### R2：ESLint 從 warn 升 error 觸發大批 CI 紅燈
**機率：** 高  
**衝擊：** 中  
**緩解：**
- M1 只用 warn，M3 才考慮局部升 error。
- 設置 `--max-warnings` 但不啟用，保留將來啟動空間。
- baseline file（如 `.eslint-baseline.json`）紀錄當下 warning 數，禁止新增但不擋既有。

### R3：拆 upgrade.ts 破壞既有行為
**機率：** 中  
**衝擊：** 高  
**緣由：** 1306 行裡有大量隱含的執行順序與副作用。  
**緩解：**
- M2 單元測試必須先覆蓋 upgrade 的主要 flow，才動 M3 拆檔。
- 拆檔 PR 必須在 release parity smoke 通過。
- 拆檔 PR 不得同時修 bug；bug fix 與 refactor 分開 PR。

### R4：Pre-commit hook 變成 adopter 硬依賴
**機率：** 中  
**衝擊：** 高（違反 adopter-neutral）  
**緣由：** 若 ATM CLI 主動安裝 husky 並寫入 hook，會強制 adopter 也接受。  
**緩解：**
- Pre-commit hook 只在 upstream repo 啟用，不 ship 進 root-drop / onefile。
- ATM 對 adopter 只提供「**可選的 hook example**」，不強制安裝。
- 文件明確說明 adopter 可用自己的 hook 系統（pre-commit framework、husky、lefthook 等）。

### R5：Release parity smoke 太慢拖累 PR
**機率：** 高  
**衝擊：** 中  
**緩解：**
- M4 release parity 分 quick smoke（每 PR）與 full smoke（merge to main）兩層。
- Quick smoke 只跑 root-drop entry contract，不重 build 全部 packages。

### R6：Invariant 被無意打破
**機率：** 中  
**衝擊：** 極高  
**緩解：**
- 任務卡必填 `invariant_risk` 欄位。
- CI 加 invariant guard：偵測 public CLI surface diff、schema version 變動。
- Maintainer review checklist 包含「**這個 PR 有沒有改 §0.1 列舉的東西？**」。

### R7：Vitest vs node:test 選擇成為延遲源
**機率：** 中  
**衝擊：** 低  
**緩解：**
- M2 先用 `node:test`（zero runtime dep，符合 root-drop 心智）。
- 若覆蓋率工具不便利，M3 才評估換 Vitest。
- 不在 M2 階段做選型 RFC，先動手寫測試。

### R8：M3 大檔拆分時觸碰 plugin-governance-local 的 transitional alpha 邏輯
**機率：** 高  
**衝擊：** 高  
**緣由：** 該檔開頭註解明說「Transitional alpha implementation」，內部混雜了多個生命週期不同的邏輯。  
**緩解：**
- TASK-ATD-0017 必須先做 inventory：列出 53 個 export 各自的成熟度。
- 拆檔策略：「成熟的」搬到 stable 子模組，「transitional 的」維持原檔但標記 `@transitional`。
- 不為拆檔而強制把 transitional 邏輯也搬走。

### R9：本計畫與三角策略規劃書 cadence 對不上
**機率：** 中  
**衝擊：** 中  
**緣由：** Upstream 修一輪、adopter 驗收一輪本來該交錯，但實務上可能 upstream 還沒 release，adopter 就跑 dry-run。  
**緩解：**
- 每個 M 完成都標記一個內部 tag（如 `atm-td-m0-done`）。
- 三角策略 M1 dry-run 必須指定基於哪個 tag 跑。
- 若 dry-run 結果與 tag 不符（PR 多塞了東西），evidence 失效需重跑。

---

## 7. 開放議題

### Q1：M0 的「upstream self-bootstrap」是否該 commit `.atm/` 進 AI-Atomic-Framework？
**選項：**
- A：commit 進 main → upstream 真的「dogfooding」自己。
- B：放 `.atm.example/` 模板但 main 不含 runtime → 避免污染 release artifact。
- C：在 `examples/self-host/` 下示範，不放 repo root。
**決策時機：** M0 啟動時。

### Q2：Pre-commit hook 該強制（拒絕 commit）還是 advisory（只警告）？
**決策時機：** TASK-ATD-0010 啟動時。

### Q3：any 預算的單位是「每 package 上限」還是「絕對數字」？
**決策時機：** M3 啟動時。

### Q4：M4 的 28 個重複腳本去重，採 codegen 還是 Node thin launcher？
**選項：**
- A：codegen（保留 PS1/SH 雙寫，但 source 是單一 spec）
- B：Node thin launcher（所有 OS 一律用 node 啟動）
**決策時機：** TASK-ATD-0027 啟動時。

### Q5：Docker / devcontainer 是 M5 任務還是 P5（永遠不做）？
**決策時機：** M4 完成時複評。

---

## 8. 立即執行順序

### 第一週（M0 + 部分 M1 準備）
1. **拆 M0 三張任務卡**（TASK-ATD-0001/0002/0003），放 `tasks/`。
2. **拆 M0 任務卡的同時補寫 `tasks/README.md` 索引**。
3. **跑 `node atm.mjs next --json` 在 upstream**，記錄 exact output 與 stderr，作為 TASK-ATD-0002 的 acceptance baseline。
4. **撰寫 `AGENTS.md` 與 `docs/keep.summary.md` 草稿**（TASK-ATD-0001）。

### 第二週（M0 收尾 + M1 啟動）
5. M0 退出條件全部滿足，打 `atm-td-m0-done` 內部 tag。
6. 並行拆 M1 七張任務卡。
7. 開始 M1.邊界修正（TASK-ATD-0004/0005）—— 最小風險先動。

### 之後
8. 依序執行 M1 → M2 → M3 → M4 → M5，每 M 退出後打 tag。
9. 每 M 完成時與三角策略規劃書 owner 確認下一輪 adopter dry-run 該等哪個 tag。

### 明確暫緩
- 不在 M0 之前動任何 lint / typecheck 重構（避免擾亂 M0 baseline）。
- 不在 M2 之前拆任何巨型檔案（沒測試保護）。
- 不在 M4 之前對 release artifact format 動刀。
- 不為這份計畫做 Docker / Vitest 選型 RFC（先動手，後決策）。

---

## 9. 成功定義

本計畫成功時，應同時滿足：

1. AI-Atomic-Framework 在自己 checkout 上跑 `node atm.mjs next --json` 與 `node atm.mjs doctor --json` 都 green。
2. `npm run lint` 顯示 warning 但不擋 CI；`npm run typecheck` 通過；`npm run validate:standard` 穩定。
3. 沒有 source/script 檔案超過 500 行（除明確 `@transitional` 標記）。
4. 50 個 validator 全部用統一 harness；AJV 只有一個 shared cache。
5. `frameworkVersion` 從 `package.json` 讀取，不再寫死 `0.0.0`。
6. Release parity（root-drop + onefile + create-atm）每 PR 自動驗證。
7. Adopter sentinel 含 synthetic Python fixture，且與三角策略 M5 整合完成。
8. `§0.1 Invariants` 全部沒被破壞（neutrality / public CLI / schema / release format / hash-locked / long-tail）。
9. 本目錄 `tasks/` 32 張卡全部 `status: done`，或明確標記為 `cancelled` 並記錄原因。

---

## 10. 假設與前提

- **A1**：AI-Atomic-Framework 是 ATM 上游真相來源，本計畫所有 PR 都進這個 repo。
- **A2**：3KLife 是研發試驗場，不為本計畫做任何重構（其角色由三角策略規劃書管轄）。
- **A3**：npc-brain 是 adopter 驗收場，與本計畫透過三角策略規劃書 M1 / M5 interlock。
- **A4**：Dev dependency 可以增加（如 husky、Vitest），但 release / root-drop / onefile **runtime 必須維持輕量與可移植**。
- **A5**：`any` 不一次清零；以公共契約與高扇出檔案先降風險。
- **A6**：Pre-commit hook 是 host-side enforcement，不應變成 ATM core 對所有 adopters 的硬依賴。
- **A7**：本計畫不要求所有 milestone 連續執行；可與功能開發穿插。

---

## 11. 與其他文件的關係

### 11.1 取代
- 取代臨時 plan `C:/Users/User/.claude/plans/use-the-engineering-tech-debt-skill-gentle-tiger.md`（過於通用，未 ATM 化）。

### 11.2 上游互補
- 與 `agent-pack-onboarding/ATM引導工程計畫書.md` 並列：那份管 ATM 對 adopter 的 first-touch 契約；本份管 ATM 自身的工程品質。

### 11.3 跨 repo 銜接
- 與 `agent-pack-onboarding/3KLife ATM 採用三角策略規劃書.md` interlock：upstream（本計畫）與 adopter（三角策略）的 cadence 必須交錯。

### 11.4 不取代
- 不取代 `AI_Atomic_Framework_Roadmap.md`（功能 roadmap）。
- 不取代 `upstream-versioning-policy.md`（版本治理規則）。
- 不取代 `default-governance/` 目錄下的 governance bundle 設計。

---

## 12. 參考資料

### 內部文件
- ATM 引導工程計畫書：`C:/Users/User/3KLife/docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md`
- 三角策略規劃書：`C:/Users/User/3KLife/docs/ai_atomic_framework/agent-pack-onboarding/3KLife ATM 採用三角策略規劃書.md`
- 上游版本政策：`C:/Users/User/AI-Atomic-Framework/docs/ai_atomic_framework/upstream-versioning-policy.md`
- 長尾使用者保護：`C:/Users/User/AI-Atomic-Framework/docs/LONGTAIL_USERS.md`
- Long-tail safeguard validator：`C:/Users/User/AI-Atomic-Framework/scripts/validate-longtail-user-safeguards.ts`
- Adopter sentinel：`C:/Users/User/AI-Atomic-Framework/scripts/adopter-sentinel.ts`

### 上游檔案（M0~M1 主戰場）
- `C:/Users/User/AI-Atomic-Framework/README.md`
- `C:/Users/User/AI-Atomic-Framework/eslint.config.mjs`
- `C:/Users/User/AI-Atomic-Framework/tsconfig.json`
- `C:/Users/User/AI-Atomic-Framework/package.json`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/atm.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/shared.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/next.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/doctor.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/welcome.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/bootstrap-entry.ts`

### 上游檔案（M3 拆分主戰場）
- `packages/cli/src/commands/upgrade.ts`（1306 行）
- `packages/plugin-governance-local/src/index.ts`（1069 行）
- `packages/core/src/upgrade/propose.ts`（1018 行）
- `packages/cli/src/commands/atm-chart.ts`（885 行）
- `packages/cli/src/commands/command-specs.ts`（673 行）
- `packages/integrations-core/src/index.ts`（668 行）
- `packages/core/src/manager/map-generator.ts`（663 行）
- `packages/plugin-governance-local/src/stores.ts`（637 行）
- `packages/core/src/registry/replacement-lane.ts`（543 行）
- `packages/core/src/upgrade/map-curator.ts`（505 行）

---

## 13. 本計畫的開卡入口

下一步：開 `tasks/README.md`，並依 §2 表格拆 32 張卡。建議先拆 M0 三張，跑通後再拆 M1 七張，最後再批次拆 M2~M5。
