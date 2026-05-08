---
doc_id: doc_task_0008
id: HARN-ART-0003
priority: P1
phase: Phase1
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: done
started_at: 2026-05-04T22:13:27.1217061+08:00
started_by_agent: GitHubCopilot
type: policy
chain_id: HARN-CHAIN-ARTIFACT
chain_step: 3/4
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-ART-0002
notes: "2026-05-04 | 狀態: done | 驗證: turn-artifact-storage helper smoke pass；encoding touched pass | 變更: 新增 tools_node/lib/turn-artifact-storage.js，定義 formal path、scratch 邊界、保留策略與可重用 buildFormalTurnArtifactPath/classifyTurnArtifactPath helper | 阻塞: none"
---

# [HARN-ART-0003] 建立 Turn Artifact Storage Policy

> **Harness rollout 開卡** — 由 artifact 正式化需求開立
> **定位**：Phase 1 / Artifact contract 第 3 步
> **前置依賴**：`HARN-ART-0002` validator CLI 已可確認 artifact 合法

## 問題描述

目前 artifact 只能手動指定 `--artifact-file`，常態會落在 `scratch/`。這會造成三個問題：

- 正式 artifact 與一次性 smoke artifact 混在一起
- 沒有標準命名規則，歷史查詢與保留政策無法落地
- 後續 metrics / history query 不知道哪些 artifact 可視為正式樣本

需要一份明確政策，定義正式 artifact 的存放路徑、命名格式、scratch 與 formal 的分界，以及保留/清理策略。

## INPUT_CONTRACT

- `turn-artifact/v1` schema 與 validator 已可用
- `finalize-agent-turn.js` 已支援寫入指定 artifact 路徑
- repo 已有 `artifacts/` 目錄作為正式工件容器

## OUTPUT_CONTRACT

- [x] 定義正式路徑：`artifacts/turn-artifacts/<YYYY-MM-DD>/<workflow>/<task>.json`
- [x] 定義 `scratch/` 與 `artifacts/turn-artifacts/` 的用途邊界
- [x] 文件化保留策略：哪些 artifact 應永久保留、哪些可清理
- [x] 補 helper 或共用函式，避免各工具自行拼路徑
- [x] policy 必須能被後續 `HARN-MET-0001` 歷史查詢工具直接消費

## VALIDATION_CMD

```bash
node tools_node/finalize-agent-turn.js --workflow harness-upgrade --task storage-policy-smoke --goal "artifact storage policy smoke" --files package.json --emit-turn-artifact --artifact-file artifacts/turn-artifacts/2026-05-04/harness-upgrade/storage-policy-smoke.json --json
```

## ROLLBACK_HINT

```bash
git checkout tools_node/lib/
git checkout tools_node/finalize-agent-turn.js
git checkout artifacts/turn-artifacts/
```

## 執行步驟

1. 先定義 naming 與目錄層次，不先碰 UI 或 dashboard 呈現。
2. 將 `scratch/` 明確保留給暫時 smoke/fixture，不作正式歷史查詢依據。
3. 若需新增 helper，放在 `tools_node/lib/` 的共用層，不散落在單一 CLI。
4. 補一份最小 storage policy 說明，讓後續 Governance 卡可直接引用。
5. 確保歷史查詢工具之後只需讀正式 policy path，不必再猜哪裡是正式工件。

## 交付記錄（2026-05-04）

- 新增 `tools_node/lib/turn-artifact-storage.js` 作為 storage policy 與 path helper 的單一來源。
- 正式工件路徑固定為 `artifacts/turn-artifacts/<YYYY-MM-DD>/<workflow>/<task>.json`。
- `scratch/` 僅保留給 smoke、debug、一次性 fixture，不列入後續正式 history query 預設來源。
- 永久保留對象：任務卡 done commit、release/milestone/pilot adoption、metrics baseline 或 regression fixture 對應 artifact。
- 可清理對象：scratch 一次性輸出、被同 task 更新版取代的 debug artifact、無 task/commit/baseline 對應的 local probe。

---
*由 Harness rollout planning 開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：已達成
- 驗證證據：`node -e "const s=require('./tools_node/lib/turn-artifact-storage'); ..."` 已確認 helper 產生 formal path 並正確分類 formal/scratch；encoding touched pass。
- 需修改：none。
