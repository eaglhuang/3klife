# ATM-0-0021 Pilot 2：單一 bug 快修不擴張治理

版本：2026-09-16  
狀態：證據不足而收口；未宣稱 bug 已修復。  
前置契約：`review-calibration.md` SHA-256 `2C2359DF26139AE3744A69DED1BA5470273A23C4916B69FE937CA8B092A36E7C`；`cost-baseline.md` SHA-256 `6AF22CA1AFA9EF7314EF05EDB09F91D94643AC692C42BF76FFE2BAB6C16027E8`。

## 唯一問題與範圍

觀察 TASK-PRF-0107 的既有 public runtime schema test，確認是否存在可重現的「修前失敗／修後成功」單一 bug。只做唯讀執行與證據整理；不修改 ATM source、測試期待、registry、command、gate 或發布設定。

## 執行與直接證據

唯一入口：`node --strip-types tests/cli/atm-chart-public-runtime.test.ts`。control 為 `866ffd57b0ce272233a0bc535e0ac97fd78e2b21` 的 detached worktree；candidate 為同一 revision 的目前 dirty worktree。兩者同一 Windows host、Node 24.12.0、同一 command，均為單次 cold process。

| 組別 | revision／狀態 | exit | wall-clock ms | stdout |
|---|---|---:|---:|---|
| control | clean HEAD worktree | 0 | 89.288 | `[atm-chart-public-runtime] ok` |
| candidate | dirty worktree（`packages/cli/src/atm.ts` 有未提交 telemetry WIP） | 0 | 91.208 | `[atm-chart-public-runtime] ok` |

外部 sink receipts：

- control：`C:/Users/User/atm-benchmark-sink/ATM-REVIEW-PLANNING-20260915/pilot-2/control-receipt.json`，SHA-256 `D8708E8565EB7033485B5E77AA50654514FD9A12F0032F85C2ED1B22638014C6`
- candidate：`C:/Users/User/atm-benchmark-sink/ATM-REVIEW-PLANNING-20260915/pilot-2/candidate-receipt.json`，SHA-256 `F42AF7766D015AD0EADF6441DE96852892DDAAF48FDA9678D15F3F725485A4FD`

工作區 diff 只顯示既有 `packages/cli/src/atm.ts` telemetry WIP；本卡沒有修改它，也沒有證據證明它是 0107 bug 修補。

## 判定

- **修前失敗／修後成功：UNKNOWN。** control 與 candidate 都通過，沒有可核對的原始失敗 receipt、bug reproduction 或固定 fixture。
- **產品結果：UNKNOWN。** 測試只證明 schema asset resolve 與 fail-closed 行為在兩個狀態均通過，不證明 npm clean install 或完整 chart lifecycle。
- **最小修補：N/A。** 沒有已定位且可重現的 bug，本卡不提出 source patch，不改測試期待值。
- **反例：測試期待值造假。** 未提供任何只改 assertion 的候選；若後續出現，必須拒絕並要求原始失敗證據。
- **成本：** review／等待／人工／Token／USD 均 `UNKNOWN`；未啟動付費 reviewer。

## P1–P6 判定

| 原則 | 判定 | 證據／理由 |
|---|---|---|
| P1 產品結果 | UNKNOWN | 單一 test 通過不足以證明交付 |
| P2 減少複雜度 | PASS | 沒有新增治理或功能 |
| P3 完整成本 | UNKNOWN | 只有單次命令時間，無完整 task 成本 |
| P4 可比較證據 | UNKNOWN | command／host 相同，但缺修前失敗與明確 candidate patch |
| P5 必要能力 | PASS | 未刪除並行、衝突檢查或足跡 |
| P6 有界修正 | PASS | 僅唯讀觀測；不把無 bug 證據擴張成架構工作 |

## 裁決

本卡據實收口為「未找到可驗證的單一 bug 快修證據」。不得把兩次 PASS 當修復成功，也不得為了讓卡完成而修改測試、重開治理流程或虛構修前失敗。若要繼續，必須由既有 PRF 卡提供唯一 bug reproduction、修前失敗 receipt、允許範圍內的最小 patch 與同一測試修後成功 receipt；否則停止此試行。

## 外部審核狀態

本文件待 Review001 只讀審核；不授權 source write、publish 或付費執行。
