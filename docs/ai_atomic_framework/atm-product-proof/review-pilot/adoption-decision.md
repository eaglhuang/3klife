# ATM-0-0024 獨立審核去留裁決

版本：2026-09-16  
決策：**停止目前 live pilot 擴張；保留 review-only 文件與人工 opt-in，不整合 Team SDK、不新增治理功能。**  
依據：`pilot-score.md` SHA-256 `D11C4CD3964CAD77B0BFC4D60757363CA67387D07B1066970F9FA8BD35228B57`。

## 證據摘要

| 要求 | 目前證據 | 裁決 |
|---|---|---|
| 產品交付 | 0018–0023 均未證明 npm／CI／完整產品結果 | UNKNOWN，不得宣稱完成 |
| 合格 paired A/B | 0/3；0020 dirty fixture、0021 無修前失敗、0022 insufficient cells | 不支持收益因果 |
| reviewer 校準 | exact payload／rubric 已備妥，但尚未執行 10-case 實測 | false block／missed drift UNKNOWN |
| 成本 | human／Token／USD／review overhead 均無 receipt | 不得填零或估成節省 |
| 安全與並行 | 未觀察到刪除保護或串行化；真衝突／stale base 未實測 | 能力與安全結果 UNKNOWN |

## 決策邏輯

1. **不採用為預設流程。** 沒有可比 A/B 與成本資料，不能證明 reviewer 的收益抵銷新增摩擦。
2. **不擴建治理。** 不新增 Team SDK、訊息橋、command、gate、registry、dashboard 或永久角色。
3. **保留最小可逆能力。** `review-contract.md`、`review-calibration.md`、`cost-baseline.md` 與三份負結果文件只作人工 opt-in review-only 參考；每次都必須帶版本／diff digest、直接證據與成本欄位。
4. **停止條件有效。** 若未來 reviewer 只有風格意見、成本高於可證實糾偏、或出現重大漏判／誤擋，直接停用，不補更多流程。
5. **Team SDK 只列未來提案。** 只有在取得合格 paired A/B、完成校準（TP≥4/5、FP=0/5）及成本 receipt 後，才可另開提案評估；本卡不授權開發。

## P1–P6 判定

| 原則 | 判定 | 說明 |
|---|---|---|
| P1 產品結果 | UNKNOWN／未證明 | 不以文件完成或 validator PASS 代替產品交付 |
| P2 減少複雜度 | PASS | 選停止擴張，不增加永久機制 |
| P3 完整成本 | UNKNOWN | 缺完整 task／review／人工／Token／USD |
| P4 可比較證據 | PASS（誠實保留缺口） | 0/3 合格 paired A/B，未作因果宣稱 |
| P5 必要能力 | UNKNOWN | 未移除衝突保護，但並行能力尚未實測 |
| P6 有界修正 | PASS | 去留裁決本身是單一結果，保留反對證據 |

## 反例檢核

- 若審核成本高於收益：本決策允許停止，不得為了完成計畫強迫採用。
- 若重大漏判或硬誤擋：回到停止狀態，不新增補丁式 gate。
- 若只有單一命令變快或卡片變綠：不視為產品收益。

## 後續重開門檻

只有下列證據全部存在，才可重開 live pilot：

- 一個乾淨固定 fixture 的 paired candidate/control；
- 一個既有 bug 的修前失敗、最小 patch、修後成功 receipts；
- supplemental real-agent samples，含無衝突、真衝突、stale base、makespan、全部 agent 工時與失敗樣本；
- 10-case reviewer calibration 的實測 TP／FP／FN／TN 與成本 receipt；
- 由外部執行者可重跑的命令與去敏輸出。

在此之前，ATM 不宣稱比 worktree＋Git 更快、更便宜、更可靠；產品目標仍維持未完成。

## 外部審核狀態

本文件待 Review001 只讀審核；不授權 source write、publish 或 Team SDK 開發。
