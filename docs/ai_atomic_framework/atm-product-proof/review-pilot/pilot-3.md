# ATM-0-0022 Pilot 3：保留多 AI 並行能力

版本：2026-09-16  
狀態：證據不足而收口；沒有宣稱並行收益。  
前置契約：`review-calibration.md` SHA-256 `2C2359DF26139AE3744A69DED1BA5470273A23C4916B69FE937CA8B092A36E7C`；`cost-baseline.md` SHA-256 `6AF22CA1AFA9EF7314EF05EDB09F91D94643AC692C42BF76FFE2BAB6C16027E8`。

## 唯一問題與範圍

只執行既有 `parallel-admission-scale-benchmark.test.ts` 與其 analyzer；不新增 command、gate、registry、dashboard，不修改 source，不把測試／mock 當成真實多 AI 執行。

## 直接入口與 receipts

唯一 command：`node --strip-types tests/cli/parallel-admission-scale-benchmark.test.ts`。它在同一 host／Node 24.12.0 下分別執行既有 analyzer：`node --strip-types scripts/analyze-captain-parallel-ledger.ts --validate --require-sealed-cohorts`。

| 組別 | 狀態 | exit | wall-clock ms | test output |
|---|---|---:|---:|---|
| control | `866ffd57b0ce272233a0bc535e0ac97fd78e2b21` clean detached worktree | 0 | 12897.924 | `parallel-admission-scale-benchmark ok` |
| candidate | 同 revision 的目前 dirty worktree | 0 | 14185.196 | `parallel-admission-scale-benchmark ok` |

外部 sink receipts：

- control：`C:/Users/User/atm-benchmark-sink/ATM-REVIEW-PLANNING-20260915/pilot-3/control-receipt.json`，SHA-256 `47B6208A633CF435446701A63ADD46AE984254327427297EC1ABCCFF73EB3924`
- candidate：`C:/Users/User/atm-benchmark-sink/ATM-REVIEW-PLANNING-20260915/pilot-3/candidate-receipt.json`，SHA-256 `99E1347040E424E5B639B4B3778312A9DF20724C03000C25B653A8D59879BC9F`

Analyzer report receipts：

- control：`C:/Users/User/atm-benchmark-sink/ATM-REVIEW-PLANNING-20260915/pilot-3/control-report.json`
- candidate：`C:/Users/User/atm-benchmark-sink/ATM-REVIEW-PLANNING-20260915/pilot-3/candidate-report.json`

兩份 report 的四個 arms（serial、queue-only、atm-compose-first、isolated-git-branch-merge）均為 `cellCount=35`、`missingCellCount=0`、`sufficientCellCount=0`、`insufficientCellCount=35`、`verdict=inconclusive`；overall rollout 也是 `inconclusive`。這是 validator 的證據覆蓋結果，不是實際 agent makespan 或衝突率。

## 判定

- 真實多 AI 執行：`UNKNOWN`。本卡只跑既有 analyzer／fixture，沒有啟動多個 agent、沒有真實共享檔案寫入，也沒有獨立 worktree＋Git 對照任務。
- 無衝突／真衝突／stale base 分母：`UNKNOWN`。報告明確要求補 35 個 insufficient cells，沒有可計算的 outcome samples。
- reviewer 減少返工：`UNKNOWN`；未執行 reviewer、沒有人工／Token／USD receipt。
- 安全反例：沒有移除 stale-base 或真衝突檢查，故沒有新退步；但「未移除」不等於已證明保護有效。
- 不能用 1.29 秒較短的 control／candidate 差值宣稱任何並行改善；兩者均為 validator 執行時間且 candidate dirty。

## P1–P6 判定

| 原則 | 判定 | 證據／理由 |
|---|---|---|
| P1 產品結果 | UNKNOWN | 只有 validator PASS，無真實多 AI 交付 |
| P2 減少複雜度 | PASS | 未新增永久治理或並行元件 |
| P3 完整成本 | UNKNOWN | 沒有 makespan、agent 工時、等待與 reviewer 成本 |
| P4 可比較證據 | UNKNOWN | control/candidate 都為 insufficient cells，且 candidate dirty |
| P5 必要能力 | UNKNOWN | 未刪除保護，但也未取得真衝突／stale base outcome |
| P6 有界修正 | PASS | 僅執行既有 validator，沒有擴大範圍 |

## 裁決

本卡收口為「並行能力尚未證明；既有 validator 明確指出四臂各 35 個不足樣本」。不得把 mock／fixture 或 validator PASS 冒充真實多 AI benchmark。若要重開，必須先取得既有唯一入口的 supplemental samples，至少包含無衝突、真衝突、stale base、makespan、全部 agent 工時與失敗樣本；否則停止此試行。

## 外部審核狀態

本文件待 Review001 只讀審核；不授權 source write、publish 或付費執行。
