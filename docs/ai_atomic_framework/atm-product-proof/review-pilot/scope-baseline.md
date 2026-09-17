# ATM-0-0016 Scope Baseline

日期：2026-09-16  
狀態：完成唯讀盤點；本文件不代表產品目標已完成。

## 判定邊界

本盤點的輸入集合固定為以下檔案，不再向外擴張：七張指定卡（`TASK-PRF-0100`、`0101`、`0102`、`0107`、`0109`、`0110`、`0111`）、`atm-convergence-plan.md`、`independent-review-pilot-plan.md`，以及各卡明列的 validator／report 路徑。沒有直接證據的欄位標為 `UNKNOWN`；沒有執行全磁碟搜尋，也沒有把卡片狀態當成產品結果。

產品目標固定為五項：

1. 可安裝且可執行的 npm 套件。
2. 長期、可重跑且失敗分類正確的 CI。
3. adopter bundle 實際縮小，而非漏包造成的假瘦身。
4. 保留多 AI 並行開發、真衝突防護與可追溯足跡。
5. 外部可重跑的 A/B 數據，包含人工／Token／時間成本。

## 既有卡片盤點

| 卡片 | 狀態 | 直接交付／驗證入口 | 對五項目標的事實判定 |
|---|---|---|---|
| TASK-PRF-0100 | planned | `docs/reports/atm-convergence-decision.md`、`tests/cli/product-proof-evidence-boundary.test.ts` | 尚未形成發布裁決；五項結果均未可由此卡單獨宣稱完成 |
| TASK-PRF-0101 | planned | `scripts/plan-performance-report-v4.ts`、`tests/cli/command-gate-latency-score.test.ts` | 毫秒成本計分設計尚未完成；不能把既有單筆數字當全任務收益 |
| TASK-PRF-0102 | done | `packages/cli/src/atm.ts` 等 gate telemetry 路徑；`tests/cli/mandatory-gate-telemetry.test.ts` | 有必經 gate 事件的程式與測試交付；不等於前後優化因果或產品發布完成 |
| TASK-PRF-0107 | planned | `tests/cli/atm-chart-public-runtime.test.ts`、`npm run validate:public-npm-install` | 直接對應乾淨 npm 安裝與 chart lifecycle；目前仍是待實作／待實測 |
| TASK-PRF-0109 | done | `tests/cli/next-governance-readiness-latency.test.ts`、`tests/cli/next-playbook-projection-contracts.test.ts` | 已有正常 next 路徑延後完整 framework status 的變更；仍需以固定 runner 與工作端到端成本確認收益 |
| TASK-PRF-0110 | planned | `tests/cli/parallel-admission-scale-benchmark.test.ts`、clean install command matrix | 直接對應多 AI 並行與 public command runtime；尚未證明並行能力與套件交付同時成立 |
| TASK-PRF-0111 | planned | `tests/cli/command-gate-latency-score.test.ts`、`tests/cli/mandatory-gate-telemetry.test.ts` | 仍缺完整 command／mandatory gate 覆蓋；不能宣稱毫秒儀表板完整 |

## 證據限制

- `TASK-PRF-0102` 與 `TASK-PRF-0109` 的 `done` 只證明其卡片交付與指定測試狀態；不證明 npm、CI、bundle 或外部 benchmark 的整體產品結果。
- `TASK-PRF-0107` 的驗收已明確要求完整 command matrix、unpacked bytes／entries 與外部 A/B receipt；在該證據出現前，不能把 `--version` 或安裝器成功當完整可用。
- `TASK-PRF-0110` 尚未完成，且其依賴 `0107`；不應先宣稱「縮小 runtime 同時保留並行」成立。
- 既有日成本審計只能作方向線索：命令活動區間、治理／搜尋／驗證分類及部分 p50 數字存在；完整人工時間、Token、費用與可比前後交付結果不是本卡新增的確證。
- 任何跨 runner、跨 revision 或不同 cold／warm 條件的差異，只能標示探索性，不可歸因為 ATM 優化。

## 三個小型試行候選

### 1. 高耗時熱點：TASK-PRF-0109

理由：已有正常 `next` 路徑延後完整 framework status 的明確範圍與 latency 測試，適合檢查「命令變快是否真的減少完整任務成本」。可重跑命令為 `node --strip-types tests/cli/next-governance-readiness-latency.test.ts`、`node --strip-types tests/cli/next-playbook-projection-contracts.test.ts`；比較契約必須同時指定 control／基線 revision、候選 revision、相同 prompt／工作負載、相同 runner／Node／host、cold/warm、配對樣本、p50/p95 與差值計算。若找不到 control 或無法重跑配對，只報 UNKNOWN，不重做實作。

### 2. 單一正確性與交付 bug：TASK-PRF-0107

理由：乾淨 npm 安裝 chart lifecycle 是可直接反駁的產品結果。可重跑命令為 `node --strip-types tests/cli/atm-chart-public-runtime.test.ts`、`npm run validate:public-npm-install`、`npm run typecheck -- --pretty false`；候選驗收還必須記錄 clean install 的 version／doctor／bootstrap／atm-chart／next／tasks matrix、unpacked bytes／entries、revision、runner、Node、cold/warm、樣本數與失敗樣本。任一缺失只報 UNKNOWN，不把 `--version` 當完整成功。

### 3. 並行能力：TASK-PRF-0110

理由：卡片明確要求 public command runtime 與 multi-agent parallelism 同時驗證。並行部分可重跑命令為 `node --strip-types tests/cli/parallel-admission-scale-benchmark.test.ts`；但 clean-install matrix 的唯一命令／檔案、package provenance／version、fixture 與輸出 schema 在目前指定輸入中尚未找到，狀態為 `UNKNOWN／不可進實測`，不得猜測或自行新增工具。待既有卡提供唯一入口後，才記錄 runner／revision／Node／host、並行案例數、無衝突與真衝突／stale base 的分母、makespan ms、全部 agent 工時 ms、等待與衝突檢查 ms。不能以模擬或全隊串行化取得假改善。

## 本卡驗收

- `PASS`：上表七張卡的狀態、範圍與直接驗證入口均可由檔案核對，三個候選各有一個可反駁產品問題。
- `PASS`：至少一個例子證明「卡片 done 但產品仍未完成」（0102 或 0109 的卡片狀態 vs npm／外部 benchmark 缺口）。
- `UNKNOWN`：沒有直接證據的 npm 發布、長期 CI、實際 bundle bytes、完整人工／Token／USD 成本；不可填零。
- `FAIL`：若後續把本文件或 `done` 狀態宣稱為五項產品目標已完成，立即退回。

## 可重現性與範圍檢核

- 基線執行環境欄位固定為：Windows host、`node --version`、`git rev-parse HEAD`、ATM runner／套件版本、cold／warm、樣本數、起訖 wall-clock ms；目前尚未執行的欄位標 `UNKNOWN`，不填入猜測值。
- 每個候選都必須能由上段命令與卡片列出的 scope 直接重跑；跨 runner、跨 revision 或不同環境只可作描述性比較。
- 0109 只有在 control／候選配對輸入與相同 workload 可重跑時才可進入實測；0107 可先進直接產品證據卡；0110 的 clean-install 部分在唯一入口出現前維持 UNKNOWN。
- 缺少直接證據時停止向外找資料，記錄 `UNKNOWN` 與需要的最小補件；禁止新增 command、gate、registry、dashboard 或全 repo 掃描。
- 本文件唯一交付是此 baseline；本卡不執行任何候選的 source write、npm publish、CI 觸發或外部付費模型。

下一步：交 `Review001` 做整合前的唯讀審核；只有審核確認範圍與證據邊界後，才進入 `ATM-0-0017` 的審核訊息契約或 `ATM-0-0019` 的成本基線工作。
