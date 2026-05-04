---
doc_id: doc_task_0009
id: HARN-ART-0004
priority: P1
phase: Phase1
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: done
started_at: 2026-05-04T22:13:27.1217061+08:00
started_by_agent: GitHubCopilot
type: workflow-tooling
chain_id: HARN-CHAIN-ARTIFACT
chain_step: 4/4
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-ART-0003
notes: "2026-05-04 | 狀態: done | 驗證: finalize default path smoke pass；manual artifact-file override smoke pass；node --check pass；quick compute gate pass；encoding touched pass | 變更: finalize-agent-turn.js 接入 turn-artifact-storage helper，未提供 --artifact-file 時自動寫入 formal default path，JSON/文字輸出回報 turnArtifactOutput | 阻塞: none"
---

# [HARN-ART-0004] 讓 Finalize 使用標準 Artifact 預設路徑

> **Harness rollout 開卡** — 由 Artifact Storage Policy 接續開立
> **定位**：Phase 1 / Artifact contract 第 4 步
> **前置依賴**：`HARN-ART-0003` 已定義正式存放規則

## 問題描述

即使已有 schema、validator 與 storage policy，如果每次正式 workflow 還要手填 `--artifact-file`，artifact 仍然很容易漏產生、寫錯目錄，或各 workflow 採用不同習慣。

這張卡要解決的是「預設就做對」：讓 `finalize-agent-turn.js` 在正式 workflow 下自動採用標準 path，只在特殊情境才覆蓋。

## INPUT_CONTRACT

- `HARN-ART-0003` 已定義正式 artifact path 與 scratch 邊界
- `finalize-agent-turn.js` 已能輸出 turn artifact
- validator CLI 已能驗證產出的 artifact

## OUTPUT_CONTRACT

- [x] `finalize-agent-turn.js` 在正式 workflow 下可自動計算標準 artifact path
- [x] 保留手動覆蓋 `--artifact-file` 的能力，但預設不再依賴人工輸入
- [x] 能明確區分 formal path 與 scratch/debug path
- [x] CLI 輸出需回報實際寫入位置，供下一層工具引用
- [x] 預設路徑行為需與 validator/storage policy 相容

## VALIDATION_CMD

```bash
node tools_node/finalize-agent-turn.js --workflow harness-upgrade --task artifact-defaults-smoke --goal "artifact default path smoke" --files package.json --emit-turn-artifact --json
```

## ROLLBACK_HINT

```bash
git checkout tools_node/finalize-agent-turn.js
git checkout tools_node/lib/
```

## 執行步驟

1. 先把 path 計算邏輯集中到 helper，不要散在 CLI parsing 區塊。
2. 區分 debug/scratch 與 formal workflow，避免所有情境都硬寫正式 artifact。
3. CLI summary 必須回報實際寫入 path，讓 handoff validator 與 metrics 工具可以串接。
4. 對未提供 `workflow/task` 的情況定義 fail-fast 或 fallback 規則，不允許靜默寫到模糊路徑。
5. 交付後再由 Governance 卡決定哪些 workflow 必須強制開啟 artifact。

## 交付記錄（2026-05-04）

- `finalize-agent-turn.js --emit-turn-artifact` 未提供 `--artifact-file` 時，會透過 `buildFormalTurnArtifactPath()` 寫到 `artifacts/turn-artifacts/<YYYY-MM-DD>/<workflow>/<task>.json`。
- 手動 `--artifact-file` 覆蓋仍保留，並在 `turnArtifactOutput.mode` 標記為 `manual`。
- JSON 輸出新增 `turnArtifactOutput`，包含 `mode`、`pathClass`、`relativePath`、`absolutePath` 與 policy pattern。
- 非 JSON summary 也會回報 `formal-default=<path>` 或 `manual=<path>`，方便下一層 handoff / metrics 工具引用。

---
*由 Harness rollout planning 開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：已達成
- 驗證證據：`node tools_node/finalize-agent-turn.js --workflow harness-upgrade --task artifact-defaults-smoke --goal "artifact default path smoke" --files package.json --emit-turn-artifact --json` 輸出 `turnArtifactOutput.mode=formal-default` / `pathClass=formal`；手動 `--artifact-file scratch/artifact-manual-smoke.json` 輸出 `mode=manual` / `pathClass=scratch`；quick compute gate pass。
- 需修改：none。
