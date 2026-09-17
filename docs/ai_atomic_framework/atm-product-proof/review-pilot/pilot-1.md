# ATM-0-0020 Pilot 1：高耗時熱點減負

版本：2026-09-16  
狀態：實驗完成但未證明改善；保留為描述性 A/B 證據。  
前置契約：`review-calibration.md` SHA-256 `2C2359DF26139AE3744A69DED1BA5470273A23C4916B69FE937CA8B092A36E7C`；`cost-baseline.md` SHA-256 `6AF22CA1AFA9EF7314EF05EDB09F91D94643AC692C42BF76FFE2BAB6C16027E8`。

## 唯一問題與範圍

只觀察 TASK-PRF-0109 的 `next` readiness latency 測試，不新增 command、gate、快取或 source patch。本卡不授權 ATM source write；沒有候選 patch，因此沒有回滾動作可做。候選是目前工作區的未提交狀態，control 是同一 repo HEAD 的乾淨 detached worktree；這是可重跑的描述性比較，不是已控制的產品 A/B。

## 固定執行條件

| 欄位 | control | candidate |
|---|---|---|
| command | `node --strip-types tests/cli/next-governance-readiness-latency.test.ts` | 同左 |
| input | repo HEAD 的既有 test fixture | 工作區 test fixture（含未提交修改） |
| revision | `866ffd57b0ce272233a0bc535e0ac97fd78e2b21` | `866ffd57b0ce272233a0bc535e0ac97fd78e2b21` + dirty diff |
| runner | Node 24.12.0；同一 Windows host | 同左 |
| runner digest | `release/atm-onefile/atm.mjs` SHA-256 `66de9def70c35f2238df1a015155a7dc04ec15bf1746b2ac50e7205a835594b0` | 同左 |
| samples | 10 cold process launches | 10 cold process launches |
| direct output | `[next-governance-readiness-latency.test] ok`，10/10 exit 0 | 同左，10/10 exit 0 |

Receipt 在外部 sink：

- `C:/Users/User/atm-benchmark-sink/ATM-REVIEW-PLANNING-20260915/pilot-1/control-receipt.json`，SHA-256 `BFA928BD3AFE1FA8AC763C238A819A52C461F9AFF65A3873E7EBACD9F05313E2`
- `C:/Users/User/atm-benchmark-sink/ATM-REVIEW-PLANNING-20260915/pilot-1/candidate-receipt.json`，SHA-256 `CEABFC80098CF958205115859D13563BF4ED6B0849C47760C9B1AEEF98C636B6`

## 量測結果

以每次 child process 的起訖 wall-clock 計時，p50 取排序後第 5、6 筆平均，p95 取第 10 筆：

| 組別 | n | p50 ms | p95 ms | failures |
|---|---:|---:|---:|---:|
| control | 10 | 74.2055 | 90.764 | 0 |
| candidate | 10 | 170.9220 | 177.691 | 0 |

候選比 control 的 p50 高 96.7165 ms（約 +130.336%），p95 高 86.9270 ms（約 +95.773%）。這不是「減負成功」；差異也不能歸因為 ATM 改善，因為 candidate 的 test fixture 與 source 是 dirty，control／candidate revision 語義不對稱。

## 功能與反例

- 功能驗證：兩組命令均 10/10 exit 0，輸出 `[next-governance-readiness-latency.test] ok`。
- stale／受影響輸入反例：本卡未修改快取或略過檢查，故沒有新 stale PASS；反例結果為 `N/A（無候選 patch）`，不得把 N/A 當成通過優化。
- paired 可比性：`FAIL/UNKNOWN`。雖同一 host、Node、runner 與 command，但 candidate 為 dirty worktree 且 test fixture 不同；沒有合格的固定 control/candidate patch A/B。
- review overhead、人工分鐘、Token、USD：`UNKNOWN`；本卡沒有啟動付費 reviewer，也沒有可核對帳單。

## P1–P6 判定

| 原則 | 判定 | 證據／理由 |
|---|---|---|
| P1 產品結果 | PASS（僅測試行為） | 兩組測試均成功；不能推成產品交付完成 |
| P2 減少複雜度 | PASS | 沒有新增 command、gate、快取或文件系統 |
| P3 完整成本 | UNKNOWN | 有命令 wall-clock；完整 task／review／人工／Token 成本未取得 |
| P4 可比較證據 | FAIL（因果 A/B） | candidate dirty，fixture 與 control 不同；只可做描述性結果 |
| P5 必要能力 | PASS | 未刪除並行、衝突檢查或足跡 |
| P6 有界修正 | PASS | 本卡只做一個熱點觀察，沒有 source write |

## 裁決與下一步

本次實驗保留 direct receipts，但結論是「未證明減負，候選反而較慢」。不得為了讓數字變好而刪除樣本、改寫測試期待或宣稱因果。若要繼續 TASK-PRF-0109，下一張實作卡必須先產生乾淨、固定 fixture 的 candidate patch，並以同一 exact command 重跑 paired control/candidate；否則應停止此優化候選。未取得合格 paired baseline 前，不啟動 live pilot 的產品收益宣稱。

## 外部審核狀態

本文件待 Review001 只讀審核；審核只判斷範圍、證據與是否誤宣稱，不授權 source write、publish 或付費執行。
