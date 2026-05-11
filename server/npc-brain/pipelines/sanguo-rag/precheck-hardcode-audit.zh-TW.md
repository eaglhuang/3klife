<!-- doc_id: doc_server_pipeline_0007 -->
# 主要管線寫死邏輯盤點（precheck / harvest）

## 目的
這份盤點針對「外部網站採證高速公路」的主要前段管線，找出可以配置化的寫死邏輯，避免各 script 規則漂移。

## 範圍
- `server/npc-brain/pipelines/sanguo-rag/run_3kweb_check.py`
- `tools_node/agent-clis/3klife-source-health.js`
- `tools_node/agent-clis/3klife-web-page-harvester.js`
- `server/npc-brain/pipelines/sanguo-rag/benchmark_external_source.py`

## 本輪已處理（完成）
| 類別 | 原本狀態 | 處理方式 | 目前狀態 |
| --- | --- | --- | --- |
| `termHit` 關鍵字 | 三支腳本各自寫死 | 統一成三層優先序：CLI override > source row `termHitKeywords` > default keywords | ✅ 已完成 |
| `run_3kweb_check` 與 `source-health` 規則同步 | 兩邊可能使用不同關鍵字集合 | `run_3kweb_check.py` 呼叫 `3klife-source-health.js` 時，傳遞 `--sources-config` 與 `--term-hit-keyword` | ✅ 已完成 |
| Stage2 harvest 的相關性關鍵字 | harvester 內建固定關鍵字 | `3klife-web-page-harvester.js` 同步支援 `termHitKeywords` | ✅ 已完成 |
| benchmark Stage1 與 source config 對齊 | Stage1 未明確帶入 source config / keyword override | `benchmark_external_source.py` Stage1 改為傳遞 `--sources-config` 與來源 keyword | ✅ 已完成 |
| `relevanceLevel` 門檻（3/1） | 固定寫死 | 搬到 `pipelinePolicies.precheckDefaults` + `sourceClassPrecheck` + source `precheckPolicy` | ✅ 已完成 |
| `LOGIN_PATTERNS` | benchmark 程式內寫死 | 搬到 `pipelinePolicies.precheckDefaults.loginPatterns`，可被站型與來源覆蓋 | ✅ 已完成 |
| Stage2/Stage3 gate 門檻 | benchmark 程式內寫死 | 搬到 `pipelinePolicies.stage2GateDefaults/stage2ClassGate/stage3ClassGateDefaults`，來源可 `stage2GatePolicy/stage3GatePolicy` 微調 | ✅ 已完成 |

## 保留硬規則（刻意不動）
這些仍是「有預設值的安全閘門」，雖可配置但預設不放寬：

- Stage 2 預設：`fetchSuccessRate >= 0.90`、`relevantPageRate >= 0.70`、`errorRate <= 0.10`、`duplicateLinkRate <= 0.05`
- Stage 3 預設：依站型維持 `seed/page`、`candidate-card/page`、`quoteLocatorHashCoverage` 等下限
- precheck 預設：`likelyThreshold=3`、`possibleThreshold=1`、`minimumTermHitCount=1`
- login/js-shell 判斷保留預設詞庫，但可 per-source 覆蓋

## 下一步建議（可選）
若你要再往「更少寫死」前進，建議下一批處理順序：

1. 在來源清單為每個站補齊 `termHitKeywords`（尤其女性優先詞庫）並觀察命中率變化。
2. 若某站常誤判 login，可在 source row 的 `precheckPolicy.loginPatterns` 做站點專屬修正。
3. 規劃「政策鎖」：若來源覆蓋的 gate 低於全域下限，benchmark 直接報警不採用。

## Checklist
- [x] 盤點主要 precheck/harvest 管線寫死點
- [x] 統一 `termHitKeywords` 配置入口
- [x] 同步到 `run_3kweb_check.py`
- [x] 同步到 `3klife-source-health.js`
- [x] 同步到 `3klife-web-page-harvester.js`
- [x] 同步到 `benchmark_external_source.py` Stage1
- [x] Stage2/3 門檻配置化
