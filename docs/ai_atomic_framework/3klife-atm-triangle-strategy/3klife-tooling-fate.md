<!-- doc_id: doc_other_0036 -->
# 3KLife 既有治理工具命運表（Tooling Fate）

> 補丁來源：`AI原子框架開發計畫書.md` v0.2.1 補強 §B13
> 文件位置：`docs/ai_atomic_framework/3klife-tooling-fate.md`
> 配合：[`3klife-consumption-roadmap.md`](3klife-consumption-roadmap.md) §S3 stage

---

## 為什麼需要本表

3KLife 目前有 **9 個治理工具**（task-lock / compute-gate / doc-id-registry / shard-manager / task-card-opener / check-task-scope / check-import-boundaries / check-encoding-touched / finalize-agent-turn）與多個 helper 腳本。ATM 完成後這些工具的命運：被取代？共存？變 adapter？deprecate timeline？— 沒有明確規劃，會讓維護者不知道是否該繼續投資。

本表定義 **每個治理工具的命運（Fate）、轉折點（Turning Point）、棄用時程（Deprecation Timeline）**。

---

## 命運分類（5 類）

| 類別 | 意義 | 後續維護 |
|---|---|---|
| **A. Adapter（保留 CLI + 內骨換）** | CLI 入口 100% 保留，骨幹改呼叫 ATM core | 持續維護 thin adapter |
| **B. Wrapper（保留私有功能）** | 3KLife 專屬流程，包住 ATM run envelope | 持續維護 |
| **C. Replaced（被 ATM 取代）** | ATM RuleGuardAdapter / 對應功能取代 | 6 個月後 deprecate，1 年後移除 |
| **D. Merged（功能併入 ATM）** | 原工具邏輯併入上游 plugin | 移除 3KLife 端實作 |
| **E. Permanent（永遠保留）** | 不在 ATM 範圍 | 持續維護 |

---

## 命運總表

| 工具 | 角色 | Fate | 轉折點 | 棄用時程 |
|---|---|---|---|---|
| `task-lock.js` | scope lock | **A. Adapter** | ATM-3 shadow adapter 完成（S2 consumption stage 結束） | 永久保留 |
| `compute-gate.js` | gate runner | **A. Adapter** | ATM-3 完成 | 永久保留 |
| `doc-id-registry.js` | doc index | **A. Adapter** | ATM-3 完成 | 永久保留 |
| `shard-manager.js` | large file shard | **A. Adapter** | ATM-3 完成 | 永久保留 |
| `task-card-opener.js` | task UI | **A. Adapter** | ATM-3 完成 | 永久保留 |
| `check-encoding-touched.js` | encoding | **A. Adapter** | ATM-3 完成 | 永久保留 |
| `check-encoding-integrity.js` | encoding deep | **A. Adapter** | ATM-3 完成 | 永久保留 |
| `check-task-scope.js` | scope check | **C. Replaced** | ATM-3 完成 + 3 個月 | ATM-3 完成 + 12 個月 |
| `check-import-boundaries.js` | import lint | **C. Replaced** | ATM-3 完成 + 3 個月 | ATM-3 完成 + 12 個月 |
| `finalize-agent-turn.js` | turn finalize | **B. Wrapper** | ATM-3 完成 | 永久保留 |
| `validate-html-to-ucuf-rule-guard.js` | H2U domain rule | **E. Permanent** | – | 永久保留（domain-specific） |
| `validate-ui-specs.js` | UCUF schema | **E. Permanent** | – | 永久保留（domain-specific） |
| `compute-gate-config.json` | gate profile | **A. Adapter** | ATM-3 完成 | 永久保留（profile 可加 atm 子集） |
| `dom-to-ui-self-test.js` | H2U regression | **E. Permanent** | – | 永久保留 |

---

## 詳細命運說明

### task-lock.js → ATM LockAdapter thin wrapper

**現行行為**：
- check / lock / unlock / list / validateScope
- 寫入 `docs/tasks/locks/*.json`
- frontmatter `started_by_agent`, `started_at`

**ATM-3 後行為**：
```javascript
// tools_node/task-lock.js（adapter）
const { LockAdapter } = require('@atm/adapter-local-fs-git');
const config = require('./tools_node/adapters/atm-3klife/atm.config');

const adapter = new LockAdapter(config);

// 既有 CLI 入口完全保留
if (cmd === 'check') return adapter.check(taskId);
if (cmd === 'lock')  return adapter.lock(taskId, agent, files);
// ...
```

**3KLife-specific 行為保留**：
- `ClaudeCode_<model>` agent 命名規則 → adapter 透過 `agentNameValidator` 設定保留
- `started_at` 寫 frontmatter → adapter 透過 `taskCardWriter` plugin 保留

---

### compute-gate.js → ATM GateAdapter thin wrapper

**現行行為**：
- 跑 7+ gate（encoding / ts-syntax / task-scope / import-boundary / 等）
- profile：quick / standard / atm

**ATM-3 後行為**：
- profile 機制保留
- `atm` profile 直接 delegate 到 `@atm/cli` 的 `atm verify --profile <name>`
- `quick` / `standard` 仍跑 3KLife 私有 gate（透過 GateAdapter 註冊）

```jsonc
// tools_node/compute-gate-config.json（升級後）
{
  "profiles": {
    "atm": {
      "_delegated": true,
      "_target": "@atm/cli verify --profile alpha"
    },
    "standard": {
      "gates": ["encoding-via-atm", "ts-syntax", "task-scope-via-atm", "import-boundary-via-atm", "h2u-rule-guard"]
    }
  }
}
```

---

### doc-id-registry.js → ATM DocumentIndexAdapter thin wrapper

**現行行為**：
- assign 機制：`--assign <path>` 為新文件分配 `doc_xxx_NNNN`
- 各分類前綴：`doc_ai_*`, `doc_skill_*`, `doc_other_*`, `doc_task_*`

**ATM-3 後行為**：
- ATM `DocumentIndexAdapter.assignId(path, category)` 取代核心邏輯
- 分類前綴規則保留為 3KLife profile（不入上游）

---

### shard-manager.js → ATM ShardAdapter thin wrapper

**現行行為**：
- 大檔自動拆分到 `shards/`
- 索引同步至 `*.index.json`

**ATM-3 後行為**：
- 拆分邏輯併入 ATM `@atm/plugin-doc-shard`
- 3KLife 的 600 行門檻、shard 命名規則作為 profile config

---

### task-card-opener.js → ATM TaskAdapter thin wrapper

**現行行為**：
- 開啟 task card（編輯器）
- 模板套入
- frontmatter 自動填寫

**ATM-3 後行為**：
- ATM `@atm/plugin-task-cards` 提供核心 open/template/frontmatter 機制
- 3KLife 的 ATM-* / H2U-* / PROG-2-* prefix 規則作為 profile config
- 模板（`atm-task-template.md`）保留為 3KLife 私有

---

### check-encoding-touched.js / check-encoding-integrity.js → ATM EncodingAdapter

**現行行為**：
- UTF-8 without BOM 強制
- 偵測 mojibake / replacement char / latin
- touched 模式只查改動檔

**ATM-3 後行為**：
- 邏輯完全併入 ATM `@atm/plugin-encoding`
- 3KLife 端只剩 thin adapter 觸發
- 行為等價（regression matrix 驗證）

---

### check-task-scope.js / check-import-boundaries.js → 被 ATM RuleGuardAdapter 取代

**現行行為**：
- task-scope：偵測 task allowed_files 越界
- import-boundary：偵測 import 黑名單

**ATM-3 後行為**：
- 兩者邏輯併入 ATM `@atm/plugin-rule-guard`
- 3KLife 的具體規則（h2u allowed paths / cocos boundary）作為 rule pack：
  ```jsonc
  // tools_node/adapters/atm-3klife/rule-pack.json
  {
    "rules": [
      { "id": "h2u-skill-only", "type": "import-boundary", "from": "tools_node/lib/html-to-ucuf/**", "allow": [...] },
      { "id": "cocos-no-fs", "type": "import-boundary", "from": "assets/scripts/**", "deny": ["fs", "child_process"] }
    ]
  }
  ```

**棄用時程**：
- T+0（ATM-3 完成）：兩工具標 `@deprecated`，仍保留
- T+3 個月：CLI 出 stderr warning
- T+6 個月：CLI 改為 wrapper（呼叫 ATM 規則）
- T+12 個月：CLI 移除（migration guide 已成熟）

---

### finalize-agent-turn.js → 3KLife 專屬 Wrapper（永久保留）

**現行行為**：
- finalize agent turn：跑完整 gate + push 提示
- 整合 task-lock unlock / encoding / compute-gate
- 3KLife 私有：自動 commit hint、turn artifact summary

**ATM-3 後行為**：
- 內部呼叫 ATM run envelope（`atm run --finalize`）
- 保留 3KLife 私有額外行為：
  - turn artifact summary 格式
  - commit hint 模板
  - context budget summary（呼叫 `@atm/plugin-context-budget`）

**為什麼是 Wrapper 而非 Adapter**：
- finalize 是 3KLife 開發流程的整合點，包含許多 3KLife 私有 hook
- ATM run envelope 提供核心節奏（PEV Loop），但 3KLife 私有 ritual 不能進上游
- 故保留 wrapper 形態

---

### validate-html-to-ucuf-rule-guard.js → Permanent

**理由**：
- 是 html-to-ucuf domain-specific rule guard
- 不屬於 ATM core 範疇
- 持續演化以對應 H2U-REFACTOR 任務

---

### validate-ui-specs.js → Permanent

**理由**：
- UCUF schema validator，3KLife 私有
- 與 Cocos Creator runtime 緊綁
- 不入 ATM 上游

---

### dom-to-ui-self-test.js → Permanent

**理由**：
- regression test runner，3KLife 私有
- 但其資料結構（active-contract / fidelity-contract group）可由 ATM regression-matrix 引用作為 `RegressionPlugin.runSuite` 之來源

---

## 棄用時程（C 類工具）

| 工具 | T+0 | T+3 個月 | T+6 個月 | T+12 個月 |
|---|---|---|---|---|
| check-task-scope.js | 標 @deprecated | stderr warning | wrapper 化 | 移除（已遷移到 ATM RuleGuard） |
| check-import-boundaries.js | 標 @deprecated | stderr warning | wrapper 化 | 移除（已遷移到 ATM RuleGuard） |

T+0 = ATM-3 shadow adapter 完成（S2 consumption stage 結束）。`D2` / `D3` 僅保留給 `ATM_cross_reference.md` 的文件路由 Domain，不再用作 3KLife 消費 stage 名稱。

---

## Adapter 化的具體任務

對應 ATM-3-* 任務卡（將在編輯 `AI原子框架開發計畫書.md` 時新增）：

| 任務 ID | 標題 | 對象 |
|---|---|---|
| ATM-3-0006 | task-lock adapter 化 | task-lock.js |
| ATM-3-0007 | compute-gate adapter 化 | compute-gate.js |
| ATM-3-0008 | doc-id-registry adapter 化 | doc-id-registry.js |
| ATM-3-0009 | shard-manager adapter 化 | shard-manager.js |
| ATM-3-0010 | task-card-opener adapter 化 | task-card-opener.js |
| ATM-3-0011 | encoding adapter 化（兩工具） | check-encoding-* |
| ATM-3-0012 | task-scope / import-boundary 規則包遷移 | rule-pack.json + RuleGuard adapter |
| ATM-3-0013 | finalize-agent-turn wrapper 接 run envelope | finalize-agent-turn.js |

每個 adapter 卡的驗收：
- 既有 CLI 入口行為等價（regression test）
- 內部走 ATM core
- compute-gate atm profile 全綠

---

## 行為等價驗證

每個 A/B 類工具升級後，必跑等價測試：

```bash
# 升級前 baseline
node tools_node/task-lock.js check ATM-TEST-0001 --json > baseline.json

# 升級後（adapter 化）
node tools_node/task-lock.js check ATM-TEST-0001 --json > after.json

# diff 必為空
diff baseline.json after.json
# 期望: empty
```

---

## 維護者責任

| Fate 類別 | 維護方 | 升級義務 |
|---|---|---|
| A. Adapter | 3KLife maintainer | 每次 ATM minor 升級必更新 adapter |
| B. Wrapper | 3KLife maintainer | 視 ATM run envelope 變動 |
| C. Replaced | 3KLife maintainer（過渡期）→ 上游接手 | 移除前持續 wrapper |
| D. Merged | 上游接手 | 3KLife 端零維護 |
| E. Permanent | 3KLife maintainer | 與 ATM 無關 |

## 2026-05-08 Task Card System Race Backwrite

- `task-id-guard.js` is the only local 3KLife path for task id allocation and reservation; explicit ids and next-id allocation share the same fence.
- `task-card-opener.js` remains the TaskAdapter-facing writer, but successful writes must promote reservations through `LockAdapter.lock()`.
- `task-lock.js` has no legacy CLI implementation; it only parses commands and delegates to `tools_node/adapters/atm-3klife/lock-adapter.js`.
- Future ATM-3 / ATM-3-0015 atomization should treat allocateTaskId / reserveTaskId / openTaskCard / lockTaskScope as one orchestration chain, not parallel allocators.
