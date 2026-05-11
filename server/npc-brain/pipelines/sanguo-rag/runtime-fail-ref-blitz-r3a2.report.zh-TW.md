# Runtime Fail Evidence-Ref Blitz（r3a2）執行報告

## 目標

- 針對 `full-roster-max-progress-r3` 中 runtime readiness `fail=24` 的 generals，做 evidence-ref 補洞。
- 補完後同輪 rerun runtime readiness，目標 `failCount == 0`。

## 基線

- 基線 run：`full-roster-max-progress-r3`
- 基線 runtime 報表：
  - `local/codex-smoke/knowledge-growth/full-roster-max-progress-r3/full-roster-max-progress-r3-r1/runtime-readiness/multi-general-readiness.json`
- 基線狀態：`pass=6 / fail=24`
- fail 主因：`no-evidence-refs`（24/24）

## 補洞策略（P8）

1. 從 `source-event-packets` 為 24 位 fail generals 建立 synthetic ready events（每位最多 12 筆，保留 `sourceRef`）。
2. 用 r3 round 的 `stable-knowledge`、`relationship-evidence`、`source-event-packets`，重建 24 位 general 的 runtime profiles（sidecar root）。
3. 以 `NPC_RUNTIME_PROFILE_ROOT=<sidecar_root>` 直接 rerun `build_runtime_readiness_matrix.py` 驗證。

## 產出路徑

- synthetic events：
  - `local/codex-smoke/knowledge-growth/runtime-fail-ref-blitz-r3a2/synthetic-events.from-packets.jsonl`
- runtime profiles（sidecar）：
  - `local/codex-smoke/knowledge-growth/runtime-fail-ref-blitz-r3a2/runtime-profiles/`
- rerun readiness：
  - `local/codex-smoke/knowledge-growth/runtime-fail-ref-blitz-r3a2/runtime-readiness-rerun/multi-general-readiness.json`

## 結果

- rerun runtime readiness：`pass=24 / fail=0`
- 24 位 fail generals 在此輪補洞後全部通過。

## 後續建議

1. 把這條 P8 補洞流程橋接進 full roster convergence 總控（避免只在 sidecar rerun 成功）。
2. 主幹再跑一輪 convergence，確認主幹 `runtimeReadinessFailCount` 同樣為 `0`。
3. 通過後再進下一輪 promotion-safe 收斂。
